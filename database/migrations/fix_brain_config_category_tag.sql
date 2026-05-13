-- ============================================
-- Fix brain_config table - add missing category_tag column
-- ============================================
-- Run this in MySQL to fix the Settings page not showing data
-- ============================================

USE `ray-task_management`;

-- Add category_tag column if it doesn't exist
ALTER TABLE brain_config 
ADD COLUMN category_tag VARCHAR(50) DEFAULT NULL AFTER config_value;

-- Update existing category rows with appropriate tags and neutral labels
UPDATE brain_config SET config_value = 'Development', category_tag = 'Produk' WHERE config_type = 'category' AND config_value IN ('Development Legacy', 'Legacy Academy');
UPDATE brain_config SET config_value = 'Infrastructure', category_tag = 'Perusahaan' WHERE config_type = 'category' AND config_value = 'Tech Division';
UPDATE brain_config SET category_tag = 'Brand' WHERE config_type = 'category' AND config_value = 'Marketing';
UPDATE brain_config SET category_tag = 'Produk' WHERE config_type = 'category' AND config_value = 'Client Project';
UPDATE brain_config SET category_tag = 'Lainnya' WHERE config_type = 'category' AND config_value IN ('Internal', 'Enterprise', 'Personal Project');

-- Set default tag for any category rows without a tag
UPDATE brain_config SET category_tag = 'Lainnya' WHERE config_type = 'category' AND (category_tag IS NULL OR category_tag = '');

-- ============================================
-- Verify with:
-- SELECT * FROM brain_config WHERE config_type = 'category';
-- ============================================
