-- Run in Supabase SQL Editor: supports local LYD purchase & per-car shared-container costs

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS purchase_mode TEXT DEFAULT 'import'
    CHECK (purchase_mode IN ('import', 'local', 'shared_container'));

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS external_container_ref TEXT;

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS link_fees_allocation DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS clearance_allocation DECIMAL(15, 2) DEFAULT 0;

COMMENT ON COLUMN cars.purchase_mode IS 'import = كوري/استيراد، local = شراء محلي د.ل، shared_container = سيارات في حاوية غيرك بتكلفة لكل سيارة';
COMMENT ON COLUMN cars.external_container_ref IS 'مرجع حاوية طرف آخر (نص حر) عند عدم ربط حاوية بالنظام';
