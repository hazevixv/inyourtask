-- Cleanup legacy manual team config rows.
-- Safe because team members are now derived from users + org_unit_staff in code.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS brain_config_legacy_backup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_table VARCHAR(50) NOT NULL,
  source_id INT NULL,
  config_type VARCHAR(50) NOT NULL,
  config_value VARCHAR(255) NOT NULL,
  category_tag VARCHAR(100) NULL,
  display_order INT NULL,
  is_active BOOLEAN NULL,
  backed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO brain_config_legacy_backup (
  source_table,
  source_id,
  config_type,
  config_value,
  category_tag,
  display_order,
  is_active
)
SELECT
  'brain_config',
  bc.id,
  bc.config_type,
  bc.config_value,
  bc.category_tag,
  bc.display_order,
  bc.is_active
FROM brain_config bc
WHERE bc.config_type = 'team'
  AND NOT EXISTS (
    SELECT 1
    FROM brain_config_legacy_backup b
    WHERE b.source_table = 'brain_config'
      AND b.source_id = bc.id
  );

DELETE FROM brain_config
WHERE config_type = 'team';

DELETE FROM brain_defaults
WHERE default_key = 'default_assignee';

COMMIT;
