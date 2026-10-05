-- Migration: Multiple profiles per user
-- This migration modifies the profiles table to allow multiple profiles per user
-- and updates related policies

-- First, drop the existing unique constraint on user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_slug TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create unique index for profile_slug (globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_unique 
ON public.profiles (profile_slug) 
WHERE profile_slug IS NOT NULL;

-- Create index for user_id + is_primary combination
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_primary_unique 
ON public.profiles (user_id) 
WHERE is_primary = true;

-- Update existing profiles to be primary
UPDATE public.profiles 
SET is_primary = true, 
    profile_slug = username,
    is_active = true
WHERE is_primary IS NULL OR is_primary = false;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Public links are viewable by everyone" ON public.links;
DROP POLICY IF EXISTS "Users can update own links" ON public.links;
DROP POLICY IF EXISTS "Users can insert own links" ON public.links;
DROP POLICY IF EXISTS "Users can delete own links" ON public.links;

DROP POLICY IF EXISTS "Public themes are viewable by everyone" ON public.themes;
DROP POLICY IF EXISTS "Users can update own theme" ON public.themes;
DROP POLICY IF EXISTS "Users can insert own theme" ON public.themes;
DROP POLICY IF EXISTS "Users can delete own theme" ON public.themes;

-- Create new RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view own profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create new RLS policies for links
CREATE POLICY "Public links are viewable by everyone"
  ON public.links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Users can view own links"
  ON public.links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own links"
  ON public.links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own links"
  ON public.links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own links"
  ON public.links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Create new RLS policies for themes
CREATE POLICY "Public themes are viewable by everyone"
  ON public.themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Users can view own themes"
  ON public.themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own themes"
  ON public.themes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own themes"
  ON public.themes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own themes"
  ON public.themes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = themes.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Create function to ensure only one primary profile per user
CREATE OR REPLACE FUNCTION ensure_single_primary_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a profile as primary, unset all other primary profiles for this user
  IF NEW.is_primary = true THEN
    UPDATE public.profiles 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_primary = true;
  END IF;
  
  -- Ensure user has at least one primary profile
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = NEW.user_id 
    AND is_primary = true 
    AND id != NEW.id
  ) THEN
    NEW.is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the function
DROP TRIGGER IF EXISTS ensure_single_primary_profile_trigger ON public.profiles;
CREATE TRIGGER ensure_single_primary_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_profile();

-- Create function to generate unique profile slug
CREATE OR REPLACE FUNCTION generate_profile_slug(base_username TEXT, user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  counter INTEGER := 0;
  new_slug TEXT;
BEGIN
  new_slug := base_username;
  
  -- Check if slug already exists
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profile_slug = new_slug) LOOP
    counter := counter + 1;
    new_slug := base_username || counter::TEXT;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;