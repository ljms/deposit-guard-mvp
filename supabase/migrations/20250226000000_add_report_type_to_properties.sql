-- Add report_type to properties for Check-In, Interim, Check-Out reports
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'check-in';
