-- Add report_id to photos so each photo is scoped to a specific report.
-- Photos from a previous report must never appear in a new report workspace.
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS report_id uuid;
