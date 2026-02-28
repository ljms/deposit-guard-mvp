-- Add status to reports: 'in_progress' when starting workflow, 'completed' when PDF is generated.
-- Existing reports (with storage_path) are completed.
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';

-- Store report type (check-in, interim, check-out) on the report.
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_type text;

-- Allow storage_path to be null for in-progress reports (PDF not yet generated).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'storage_path'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reports ALTER COLUMN storage_path DROP NOT NULL;
  END IF;
END $$;
