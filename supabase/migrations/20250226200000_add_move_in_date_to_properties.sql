-- Add move_in_date to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS move_in_date date;
