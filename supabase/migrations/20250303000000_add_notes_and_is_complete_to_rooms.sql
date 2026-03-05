-- Add notes and is_complete to rooms for report room workspace
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;
