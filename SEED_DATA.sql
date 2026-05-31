-- Seed Data for Ronaq Import System
-- This script provides sample data for testing

-- Note: Replace 'user-uuid-here' with actual user UUID from Supabase Auth

-- Sample Trips
INSERT INTO trips (user_id, trip_name, start_date, end_date, capital, status, notes)
VALUES 
  ('user-uuid-here', 'رحلة تركيا الأولى', '2024-01-15', '2024-02-10', 50000000, 'closed', 'رحلة ناجحة'),
  ('user-uuid-here', 'رحلة الإمارات', '2024-02-20', NULL, 75000000, 'open', 'رحلة جارية'),
  ('user-uuid-here', 'رحلة الدول الأوروبية', '2024-03-01', NULL, 100000000, 'open', 'رحلة تصدير');

-- Sample Exchange Rates
INSERT INTO exchange_rates (user_id, usd_to_lyd, date)
VALUES 
  ('user-uuid-here', 4.85, '2024-01-15'),
  ('user-uuid-here', 4.90, '2024-02-01'),
  ('user-uuid-here', 4.92, '2024-03-01');

-- Sample Cars
INSERT INTO cars (
  user_id, vin_number, car_name, brand, model, year, color,
  purchase_price_usd, exchange_rate, purchase_price_lyd,
  shipping_allocation, customs_allocation, expense_allocation,
  final_cost, selling_price, profit, status, trip_id
)
VALUES 
  (
    'user-uuid-here', '2G1FB1E39D1134523', 'كيا سبورتاج 2022', 'Kia', 'Sportage', 2022, 'أسود',
    18000, 4.85, 87300, 2500, 4000, 1500, 95300, 120000, 24700, 'sold', NULL
  ),
  (
    'user-uuid-here', '4T1BF1AK5CU206186', 'تويوتا كورولا 2023', 'Toyota', 'Corolla', 2023, 'فضي',
    21000, 4.85, 101850, 2000, 3500, 1200, 108550, 135000, 26450, 'available', NULL
  ),
  (
    'user-uuid-here', 'JH2RC5004LM200157', 'هوندا أكورد 2021', 'Honda', 'Accord', 2021, 'رمادي',
    22000, 4.90, 107800, 2500, 4500, 1800, 116600, 140000, 23400, 'available', NULL
  );

-- Sample Expenses
INSERT INTO expenses (user_id, trip_id, expense_type, currency, amount, paid_amount, remaining_amount, status, date, notes)
VALUES 
  ('user-uuid-here', NULL, 'shipping', 'USD', 15000, 15000, 0, 'paid', '2024-01-15', 'شحن الحاوية'),
  ('user-uuid-here', NULL, 'customs', 'LYD', 5000000, 3000000, 2000000, 'partial', '2024-01-20', 'جمارك'),
  ('user-uuid-here', NULL, 'clearance', 'LYD', 2000000, 2000000, 0, 'paid', '2024-01-25', 'التخليص'),
  ('user-uuid-here', NULL, 'transportation', 'LYD', 1500000, 1500000, 0, 'paid', '2024-02-01', 'نقل');

-- Sample Liabilities
INSERT INTO liabilities (user_id, expense_id, total_amount, paid_amount, remaining_amount, status)
VALUES 
  ('user-uuid-here', 2, 5000000, 3000000, 2000000, 'active');

-- Sample Sales
INSERT INTO sales (user_id, car_id, customer_name, customer_phone, selling_price, paid_amount, remaining_amount, payment_type, date, notes)
VALUES 
  (
    'user-uuid-here', 'car-uuid-1', 'محمد العميمي', '0913456789', 120000, 120000, 0, 'cash', '2024-02-15', 'بيع كاش'
  ),
  (
    'user-uuid-here', 'car-uuid-2', 'علي الرقيق', '0923456789', 135000, 50000, 85000, 'installment', '2024-02-20', 'بيع بالتقسيط'
  );

-- Sample Installments
INSERT INTO installments (user_id, sale_id, customer_name, customer_phone, car_id, total_amount, paid_amount, remaining_amount, installment_dates, status)
VALUES 
  (
    'user-uuid-here', 'sale-uuid-2', 'علي الرقيق', '0923456789', 'car-uuid-2',
    135000, 50000, 85000,
    ARRAY['2024-03-20', '2024-04-20', '2024-05-20'],
    'partial'
  );

-- Notes:
-- 1. Replace 'user-uuid-here' with the actual UUID of the user from Supabase Auth
-- 2. Replace 'car-uuid-1' and 'car-uuid-2' with actual car IDs
-- 3. Replace 'sale-uuid-2' with actual sale ID
-- 4. Update all UUIDs to match your database records
-- 5. This is sample data for testing purposes only
