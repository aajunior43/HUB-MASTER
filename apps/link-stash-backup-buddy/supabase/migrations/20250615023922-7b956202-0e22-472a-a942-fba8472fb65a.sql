
-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create links table
CREATE TABLE public.links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create link_tags junction table for many-to-many relationship
CREATE TABLE public.link_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(link_id, tag_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Users can view their own categories" 
  ON public.categories 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
  ON public.categories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
  ON public.categories 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
  ON public.categories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for tags
CREATE POLICY "Users can view their own tags" 
  ON public.tags 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
  ON public.tags 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
  ON public.tags 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
  ON public.tags 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for links
CREATE POLICY "Users can view their own links" 
  ON public.links 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own links" 
  ON public.links 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" 
  ON public.links 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" 
  ON public.links 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for link_tags
CREATE POLICY "Users can view their own link_tags" 
  ON public.link_tags 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.links 
    WHERE links.id = link_tags.link_id 
    AND links.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own link_tags" 
  ON public.link_tags 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.links 
    WHERE links.id = link_tags.link_id 
    AND links.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own link_tags" 
  ON public.link_tags 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.links 
    WHERE links.id = link_tags.link_id 
    AND links.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own link_tags" 
  ON public.link_tags 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.links 
    WHERE links.id = link_tags.link_id 
    AND links.user_id = auth.uid()
  ));

-- Insert default categories for new users
INSERT INTO public.categories (user_id, name, color) 
SELECT 
  id,
  'TRABALHO',
  'blue'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE categories.user_id = auth.users.id
);

INSERT INTO public.categories (user_id, name, color) 
SELECT 
  id,
  'PESSOAL',
  'green'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE categories.user_id = auth.users.id 
  AND categories.name = 'PESSOAL'
);

INSERT INTO public.categories (user_id, name, color) 
SELECT 
  id,
  'ESTUDOS',
  'purple'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE categories.user_id = auth.users.id 
  AND categories.name = 'ESTUDOS'
);

INSERT INTO public.categories (user_id, name, color) 
SELECT 
  id,
  'REFERÊNCIA',
  'orange'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE categories.user_id = auth.users.id 
  AND categories.name = 'REFERÊNCIA'
);
