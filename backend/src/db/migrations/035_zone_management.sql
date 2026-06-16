-- Zone management audit trail
-- Track all fee changes for historical reference and compliance

CREATE TABLE IF NOT EXISTS zone_fee_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  zone_code VARCHAR(20) NOT NULL,

  -- Old values
  old_delivery_fee_base INT,
  old_delivery_fee_per_km INT,
  old_delivery_time_min INT,
  old_delivery_time_max INT,
  old_is_active BOOLEAN,

  -- New values
  new_delivery_fee_base INT NOT NULL,
  new_delivery_fee_per_km INT NOT NULL,
  new_delivery_time_min INT NOT NULL,
  new_delivery_time_max INT NOT NULL,
  new_is_active BOOLEAN NOT NULL,

  -- Admin audit
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT,  -- Why the change was made

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- District management audit
CREATE TABLE IF NOT EXISTS district_zone_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  district_id UUID NOT NULL REFERENCES delivery_districts(id) ON DELETE CASCADE,
  district_name VARCHAR(100) NOT NULL,

  old_zone_id UUID REFERENCES delivery_zones(id),
  new_zone_id UUID NOT NULL REFERENCES delivery_zones(id),

  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for audit trails
CREATE INDEX idx_zone_fee_history_zone ON zone_fee_history(zone_id);
CREATE INDEX idx_zone_fee_history_changed_at ON zone_fee_history(changed_at DESC);
CREATE INDEX idx_zone_fee_history_changed_by ON zone_fee_history(changed_by);
CREATE INDEX idx_district_zone_changes_district ON district_zone_changes(district_id);
CREATE INDEX idx_district_zone_changes_changed_at ON district_zone_changes(changed_at DESC);
