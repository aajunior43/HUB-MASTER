-- Add new theme customization columns
ALTER TABLE themes 
ADD COLUMN button_shadow TEXT DEFAULT 'none',
ADD COLUMN button_border TEXT DEFAULT 'none',
ADD COLUMN animation_style TEXT DEFAULT 'none',
ADD COLUMN border_radius INTEGER DEFAULT 8;

-- Update existing themes to have default values
UPDATE themes 
SET 
  button_shadow = 'none',
  button_border = 'none', 
  animation_style = 'none',
  border_radius = 8
WHERE 
  button_shadow IS NULL 
  OR button_border IS NULL 
  OR animation_style IS NULL 
  OR border_radius IS NULL;