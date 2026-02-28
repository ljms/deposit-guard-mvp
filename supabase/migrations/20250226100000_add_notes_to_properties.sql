-- Add notes to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS notes text;
