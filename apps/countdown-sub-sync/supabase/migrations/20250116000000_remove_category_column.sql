-- Remove category column from subscriptions table
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS category;