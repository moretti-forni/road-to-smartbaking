-- Preserve fixture details that have no dedicated database column.
ALTER TABLE rtsm_shop ADD COLUMN IF NOT EXISTS frontend_source jsonb;
ALTER TABLE rtsm_story ADD COLUMN IF NOT EXISTS frontend_source jsonb;
