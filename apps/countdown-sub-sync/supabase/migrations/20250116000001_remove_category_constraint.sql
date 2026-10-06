-- Remove category column from existing subscriptions table
-- This migration handles existing databases that already have the category column

-- First, make the column nullable to avoid constraint violations
ALTER TABLE public.subscriptions ALTER COLUMN category DROP NOT NULL;

-- Then remove the column entirely
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS category;