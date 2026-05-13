-- Migration: Adjust unique constraint on organizational_units
-- Drop existing unique index on unit_code (assumed name `unit_code`)
ALTER TABLE organizational_units DROP INDEX unit_code;

-- Add composite unique index on (workspace_id, unit_code) named idx_workspace_unit_code
ALTER TABLE organizational_units ADD UNIQUE INDEX idx_workspace_unit_code (workspace_id, unit_code);
