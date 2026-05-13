-- ============================================
-- Add workspace scoping to organizational units
-- Allows each workspace to have its own org tree.
-- Legacy rows remain with NULL workspace_id.
-- ============================================

USE `ray-task_management`;

ALTER TABLE organizational_units
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(20) NULL AFTER unit_code;

CREATE INDEX idx_organizational_units_workspace_id
  ON organizational_units (workspace_id);

ALTER TABLE organizational_units
  ADD CONSTRAINT fk_organizational_units_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)
  ON DELETE SET NULL;
