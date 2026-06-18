-- Allow admin to enable/disable crew applications globally.
ALTER TABLE crew_settings
  ADD COLUMN IF NOT EXISTS applications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
