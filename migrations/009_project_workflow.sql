-- ============================================
-- MIGRATION 009: PROJECT WORKFLOW TRACKING
-- ============================================
-- Purpose: Add workflow tracking system for projects with category-based stages
-- Date: 2026-04-25
-- ============================================

-- Workflow templates for different project categories
CREATE TABLE IF NOT EXISTS project_workflow_templates (
  template_id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  stages JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project workflow stages (actual stages for each project)
CREATE TABLE IF NOT EXISTS project_workflow_stages (
  stage_id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  stage_order INT NOT NULL,
  assigned_unit_id INT,
  assigned_division VARCHAR(100),
  status ENUM('waiting', 'in_progress', 'completed', 'blocked') DEFAULT 'waiting',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_unit_id) REFERENCES organizational_units(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  INDEX idx_order (stage_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workflow history (track all status changes)
CREATE TABLE IF NOT EXISTS project_workflow_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  stage_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  duration_minutes INT,
  FOREIGN KEY (stage_id) REFERENCES project_workflow_stages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(username) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_stage (stage_id),
  INDEX idx_changed_at (changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default workflow templates for each category
INSERT INTO project_workflow_templates (template_id, category, template_name, description, stages) VALUES
('tpl-manufacture', 'Manufacture', 'Manufacturing Workflow', 'Complete manufacturing process from planning to distribution', JSON_ARRAY(
  JSON_OBJECT('name', 'Planning & Design', 'division', 'Marketing', 'description', 'Product planning and initial design'),
  JSON_OBJECT('name', 'Creative Design', 'division', 'Creative', 'description', 'Detailed design and mockups'),
  JSON_OBJECT('name', 'Material Sourcing', 'division', 'Procurement', 'description', 'Source and order materials'),
  JSON_OBJECT('name', 'Production', 'division', 'Factory', 'description', 'Manufacturing process'),
  JSON_OBJECT('name', 'Quality Control', 'division', 'QC', 'description', 'Quality inspection and testing'),
  JSON_OBJECT('name', 'Packaging', 'division', 'Factory', 'description', 'Product packaging'),
  JSON_OBJECT('name', 'Distribution', 'division', 'Logistics', 'description', 'Shipping and delivery')
)),
('tpl-brand', 'Brand', 'Brand Development Workflow', 'Brand creation and launch process', JSON_ARRAY(
  JSON_OBJECT('name', 'Concept Development', 'division', 'Marketing', 'description', 'Brand concept and strategy'),
  JSON_OBJECT('name', 'Visual Identity', 'division', 'Creative', 'description', 'Logo, colors, and brand assets'),
  JSON_OBJECT('name', 'Brand Guidelines', 'division', 'Creative', 'description', 'Create brand style guide'),
  JSON_OBJECT('name', 'Management Review', 'division', 'Management', 'description', 'Executive approval'),
  JSON_OBJECT('name', 'Launch Campaign', 'division', 'Marketing', 'description', 'Brand launch and promotion')
)),
('tpl-event', 'Event', 'Event Management Workflow', 'Complete event planning and execution', JSON_ARRAY(
  JSON_OBJECT('name', 'Event Planning', 'division', 'Event Team', 'description', 'Define event scope and objectives'),
  JSON_OBJECT('name', 'Venue & Logistics', 'division', 'Operations', 'description', 'Book venue and arrange logistics'),
  JSON_OBJECT('name', 'Marketing & Promotion', 'division', 'Marketing', 'description', 'Promote event and manage registrations'),
  JSON_OBJECT('name', 'Content Preparation', 'division', 'Creative', 'description', 'Prepare presentations and materials'),
  JSON_OBJECT('name', 'Event Execution', 'division', 'Event Team', 'description', 'Run the event'),
  JSON_OBJECT('name', 'Post-Event Analysis', 'division', 'Event Team', 'description', 'Gather feedback and report')
)),
('tpl-office', 'Office', 'Office Project Workflow', 'Standard office project management', JSON_ARRAY(
  JSON_OBJECT('name', 'Initiation', 'division', 'Management', 'description', 'Project approval and kickoff'),
  JSON_OBJECT('name', 'Planning', 'division', 'Project Team', 'description', 'Detailed project planning'),
  JSON_OBJECT('name', 'Execution', 'division', 'Project Team', 'description', 'Execute project tasks'),
  JSON_OBJECT('name', 'Monitoring', 'division', 'Project Team', 'description', 'Track progress and adjust'),
  JSON_OBJECT('name', 'Review & Closure', 'division', 'Management', 'description', 'Final review and documentation')
)),
('tpl-factory', 'Factory', 'Factory Operations Workflow', 'Factory production and delivery process', JSON_ARRAY(
  JSON_OBJECT('name', 'Order Received', 'division', 'Sales', 'description', 'Process customer order'),
  JSON_OBJECT('name', 'Material Preparation', 'division', 'Warehouse', 'description', 'Prepare raw materials'),
  JSON_OBJECT('name', 'Production Planning', 'division', 'Production', 'description', 'Schedule production'),
  JSON_OBJECT('name', 'Manufacturing', 'division', 'Factory', 'description', 'Produce items'),
  JSON_OBJECT('name', 'Quality Inspection', 'division', 'QC', 'description', 'Inspect finished products'),
  JSON_OBJECT('name', 'Packaging & Labeling', 'division', 'Warehouse', 'description', 'Package for delivery'),
  JSON_OBJECT('name', 'Delivery', 'division', 'Logistics', 'description', 'Ship to customer')
)),
('tpl-lainnya', 'Lainnya', 'General Project Workflow', 'Generic workflow for other project types', JSON_ARRAY(
  JSON_OBJECT('name', 'Planning', 'division', 'Project Team', 'description', 'Project planning phase'),
  JSON_OBJECT('name', 'Execution', 'division', 'Project Team', 'description', 'Execute project'),
  JSON_OBJECT('name', 'Review', 'division', 'Management', 'description', 'Review and approve'),
  JSON_OBJECT('name', 'Completion', 'division', 'Project Team', 'description', 'Finalize and close')
))
ON DUPLICATE KEY UPDATE 
  template_name = VALUES(template_name),
  description = VALUES(description),
  stages = VALUES(stages),
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- DROP TABLE IF EXISTS project_workflow_history;
-- DROP TABLE IF EXISTS project_workflow_stages;
-- DROP TABLE IF EXISTS project_workflow_templates;
