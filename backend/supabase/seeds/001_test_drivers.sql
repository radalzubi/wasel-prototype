-- ============================================
-- SEED: Test Drivers for Wasel Platform
-- Run in Supabase SQL Editor to populate test drivers
-- All drivers are placed around Amman, Jordan
-- ============================================

-- Clear existing seed drivers (identified by phone prefix +962799000)
DELETE FROM drivers WHERE phone LIKE '+962799000%';

-- ── Silver tier drivers (lower BMP priority) ─────────────────────────────────
INSERT INTO drivers (
  id, phone, full_name,
  is_online, is_available,
  lat, lng,
  subscription_tier,
  acceptance_rate, cancellation_rate,
  trips_last_30_days, idle_minutes,
  car_make, car_model, car_year, car_color, car_plate, car_type
) VALUES
(
  gen_random_uuid(), '+962799000001', 'Ahmed Al-Rashid',
  true, true,
  31.9539, 35.9106,   -- Near 4th Circle
  1,
  0.82, 0.08, 8, 12,
  'Toyota', 'Corolla', 2019, 'White', 'A-12345', 'sedan'
),
(
  gen_random_uuid(), '+962799000002', 'Omar Khalil',
  true, true,
  31.9688, 35.8956,   -- Abdoun area
  1,
  0.78, 0.10, 5, 25,
  'Kia', 'Cerato', 2020, 'Silver', 'B-67890', 'sedan'
),
(
  gen_random_uuid(), '+962799000003', 'Khalid Mansour',
  false, false,
  31.9445, 35.9278,   -- Sweifieh
  1,
  0.75, 0.12, 3, 0,
  'Hyundai', 'Accent', 2018, 'Black', 'C-11111', 'sedan'
);

-- ── Gold tier drivers (medium BMP priority) ───────────────────────────────────
INSERT INTO drivers (
  id, phone, full_name,
  is_online, is_available,
  lat, lng,
  subscription_tier,
  acceptance_rate, cancellation_rate,
  trips_last_30_days, idle_minutes,
  car_make, car_model, car_year, car_color, car_plate, car_type
) VALUES
(
  gen_random_uuid(), '+962799000004', 'Faris Al-Tamimi',
  true, true,
  31.9784, 35.8857,   -- Abdali Boulevard
  2,
  0.90, 0.04, 22, 8,
  'Toyota', 'Camry', 2021, 'White', 'D-22222', 'sedan'
),
(
  gen_random_uuid(), '+962799000005', 'Tariq Nasser',
  true, true,
  31.9621, 35.9312,   -- Jabal Amman
  2,
  0.88, 0.05, 18, 15,
  'Honda', 'Accord', 2022, 'Black', 'E-33333', 'sedan'
),
(
  gen_random_uuid(), '+962799000006', 'Rami Barakat',
  true, true,
  31.9460, 35.8920,   -- University area
  2,
  0.92, 0.03, 25, 3,
  'Kia', 'Optima', 2021, 'Gray', 'F-44444', 'sedan'
);

-- ── Platinum tier drivers (highest BMP priority) ──────────────────────────────
INSERT INTO drivers (
  id, phone, full_name,
  is_online, is_available,
  lat, lng,
  subscription_tier,
  acceptance_rate, cancellation_rate,
  trips_last_30_days, idle_minutes,
  car_make, car_model, car_year, car_color, car_plate, car_type
) VALUES
(
  gen_random_uuid(), '+962799000007', 'Yousef Al-Ahmad',
  true, true,
  31.9550, 35.9150,   -- Central Amman
  3,
  0.97, 0.01, 45, 2,
  'Mercedes', 'E-Class', 2022, 'Black', 'G-55555', 'luxury'
),
(
  gen_random_uuid(), '+962799000008', 'Samer Ziad',
  true, true,
  31.9510, 35.9050,   -- Near 3rd Circle
  3,
  0.95, 0.02, 38, 5,
  'BMW', '5 Series', 2021, 'White', 'H-66666', 'luxury'
),
(
  gen_random_uuid(), '+962799000009', 'Bilal Hassan',
  true, true,
  31.9600, 35.9200,   -- Rainbow Street area
  3,
  0.96, 0.02, 42, 1,
  'Lexus', 'ES 350', 2023, 'Silver', 'I-77777', 'luxury'
);

-- Verify insertion
SELECT
  full_name,
  phone,
  subscription_tier,
  is_online,
  ROUND(lat::numeric, 4) AS lat,
  ROUND(lng::numeric, 4) AS lng,
  acceptance_rate,
  trips_last_30_days
FROM drivers
WHERE phone LIKE '+962799000%'
ORDER BY subscription_tier DESC, acceptance_rate DESC;
