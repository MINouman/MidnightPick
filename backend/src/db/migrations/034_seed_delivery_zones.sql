-- Seed delivery zones for Bangladesh
-- Based on Steadfast service areas

-- Insert major zones
INSERT INTO delivery_zones (zone_code, zone_name, delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max, coverage_areas) VALUES
('DHAKA', 'Dhaka Metropolitan Area', 60, 0, 1, 2, '{"Dhaka North", "Dhaka South", "Dhaka East", "Dhaka West"}'),
('DHAKA_OUTSIDE', 'Dhaka (Outside Metro)', 100, 1, 2, 3, '{"Narayanganj", "Gazipur", "Tangail", "Manikganj"}'),
('CHITTAGONG', 'Chattogram Metropolitan', 80, 0, 1, 2, '{"Chattogram City", "Sitakunda"}'),
('CHITTAGONG_OUTSIDE', 'Chattogram District', 120, 1, 2, 3, '{"Cumilla", "Noakhali", "Feni"}'),
('SYLHET', 'Sylhet Region', 150, 1, 2, 3, '{"Sylhet City", "Moulvibazar", "Sunamganj"}'),
('KHULNA', 'Khulna Region', 140, 1, 2, 3, '{"Khulna City", "Barisal", "Jessen"}'),
('RAJSHAHI', 'Rajshahi Region', 130, 1, 2, 3, '{"Rajshahi City", "Natore", "Bogra"}'),
('MYMENSINGH', 'Mymensingh Region', 110, 1, 2, 3, '{"Mymensingh City"}'),
('RANGPUR', 'Rangpur Region', 150, 1, 3, 4, '{"Rangpur City", "Dinajpur"}');

-- Insert districts mapping
INSERT INTO delivery_districts (district_name, district_bn, zone_id)
SELECT district, district_bn, z.id FROM (
  VALUES
  ('Dhaka', 'ঢাকা', 'DHAKA'),
  ('Narayanganj', 'নারায়ণগঞ্জ', 'DHAKA_OUTSIDE'),
  ('Gazipur', 'গাজীপুর', 'DHAKA_OUTSIDE'),
  ('Tangail', 'টাঙ্গাইল', 'DHAKA_OUTSIDE'),
  ('Manikganj', 'মানিকগঞ্জ', 'DHAKA_OUTSIDE'),
  ('Chattogram', 'চট্টগ্রাম', 'CHITTAGONG'),
  ('Cumilla', 'কুমিল্লা', 'CHITTAGONG_OUTSIDE'),
  ('Noakhali', 'নোয়াখালী', 'CHITTAGONG_OUTSIDE'),
  ('Feni', 'ফেনী', 'CHITTAGONG_OUTSIDE'),
  ('Sylhet', 'সিলেট', 'SYLHET'),
  ('Moulvibazar', 'মৌলভীবাজার', 'SYLHET'),
  ('Sunamganj', 'সুনামগঞ্জ', 'SYLHET'),
  ('Khulna', 'খুলনা', 'KHULNA'),
  ('Barisal', 'বরিশাল', 'KHULNA'),
  ('Rajshahi', 'রাজশাহী', 'RAJSHAHI'),
  ('Bogra', 'বগুড়া', 'RAJSHAHI'),
  ('Mymensingh', 'ময়মনসিংহ', 'MYMENSINGH'),
  ('Rangpur', 'রংপুর', 'RANGPUR'),
  ('Dinajpur', 'দিনাজপুর', 'RANGPUR')
) AS dist(district, district_bn, zone_code)
JOIN delivery_zones z ON z.zone_code = dist.zone_code
ON CONFLICT (district_name) DO NOTHING;
