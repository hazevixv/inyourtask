-- Add due_date column to projects table if not exists
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS due_date DATE NULL AFTER progress;

-- Update existing projects: set due_date from max task due_date
UPDATE projects p
SET p.due_date = (
  SELECT MAX(t.due_date) 
  FROM tasks t 
  WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
)
WHERE p.due_date IS NULL;

-- Update existing projects: set start_date from min task due_date if not set
UPDATE projects p
SET p.start_date = (
  SELECT MIN(t.due_date) 
  FROM tasks t 
  WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
)
WHERE p.start_date IS NULL;

SELECT 'Migration completed successfully!' as status;
