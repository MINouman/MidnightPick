-- Delivery zones and fees for Bangladesh
-- Supports Dhaka, Chittagong, Sylhet, Khulna, and other regions

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  zone_code VARCHAR(20) NOT NULL UNIQUE,  -- "DHAKA", "CHITTAGONG", etc.
  zone_name VARCHAR(100) NOT NULL,        -- "Dhaka Metropolitan Area"
  description TEXT,

  -- Delivery fee structure
  delivery_fee_base INT NOT NULL DEFAULT 0,     -- Base delivery fee in BDT
  delivery_fee_per_km INT NOT NULL DEFAULT 0,   -- Additional fee per km (if applicable)

  -- Delivery time estimates
  delivery_time_min INT NOT NULL DEFAULT 1,     -- Minimum delivery days
  delivery_time_max INT NOT NULL DEFAULT 3,     -- Maximum delivery days

  -- Coverage
  is_active BOOLEAN NOT NULL DEFAULT true,
  coverage_areas TEXT[] DEFAULT '{}',           -- Array of areas/districts covered

  -- Admin
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Districts and their zone mappings
CREATE TABLE IF NOT EXISTS delivery_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  district_name VARCHAR(100) NOT NULL UNIQUE,  -- "Dhaka", "Chattogram", etc.
  district_bn VARCHAR(100),                    -- Bengali name
  zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE RESTRICT,

  -- Postal codes for accuracy
  postal_codes INT[],

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order tracking events
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Tracking status
  status VARCHAR(50) NOT NULL,                 -- "pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed"
  previous_status VARCHAR(50),

  -- Location info
  current_location VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT,

  -- Timestamps
  status_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  estimated_delivery_at TIMESTAMP,

  -- Update source
  source VARCHAR(20) NOT NULL DEFAULT 'api',  -- "api", "webhook", "manual"
  provider_ref VARCHAR(100),                   -- Steadfast tracking ID or ref

  -- Notes
  notes TEXT,

  -- Metadata
  raw_response JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Latest tracking for quick lookup (cached)
CREATE TABLE IF NOT EXISTS order_tracking_latest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,

  status VARCHAR(50) NOT NULL,
  current_location VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT,
  status_changed_at TIMESTAMP NOT NULL,
  estimated_delivery_at TIMESTAMP,

  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_delivery_zones_active ON delivery_zones(is_active);
CREATE INDEX idx_delivery_districts_zone ON delivery_districts(zone_id);
CREATE INDEX idx_delivery_districts_active ON delivery_districts(is_active);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_created ON order_tracking(created_at DESC);
CREATE INDEX idx_order_tracking_latest_status ON order_tracking_latest(status);

-- Add delivery_fee_paid column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id),
ADD COLUMN IF NOT EXISTS delivery_fee_paid INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(50) DEFAULT 'steadfast',
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMP;

-- Create index on orders for quick zone lookup
CREATE INDEX idx_orders_delivery_zone ON orders(delivery_zone_id);
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number);
