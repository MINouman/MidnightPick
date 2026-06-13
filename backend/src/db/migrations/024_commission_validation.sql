-- Prevent commission misconfiguration where min > max
ALTER TABLE crew_settings
  ADD CONSTRAINT check_commission_min_max
  CHECK (commission_min_value IS NULL OR commission_min_value <= commission_value);

-- Ensure commission_mode defaults to 'fixed' (not 'discount_linked')
-- Default all existing crew_settings to 'fixed' mode for new default behavior
UPDATE crew_settings
SET commission_mode = 'fixed'
WHERE commission_mode IS NULL OR commission_mode != 'discount_linked';
