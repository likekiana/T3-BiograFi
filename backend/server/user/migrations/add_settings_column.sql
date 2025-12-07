-- Migration: add settings JSON column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSON NULL;
UPDATE users SET settings = '{}' WHERE settings IS NULL;
-- End of migration
