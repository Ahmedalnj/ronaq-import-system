-- مصاريف مرتبطة بسيارة معينة (تصليح، قطع غيار، إلخ)

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_car_id ON expenses(car_id);

-- توسيع أنواع المصاريف (أزل القيد القديم إن وُجد ثم أضف الجديد)
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

ALTER TABLE expenses ADD CONSTRAINT expenses_expense_type_check CHECK (
  expense_type IN (
    'shipping', 'customs', 'clearance', 'link_fees',
    'transportation', 'office', 'other',
    'repair', 'maintenance', 'parts', 'tires',
    'body_work', 'electrical', 'registration', 'insurance', 'other_car'
  )
);

COMMENT ON COLUMN expenses.car_id IS 'ربط المصروف بسيارة محددة (تصليح، صيانة، ...)';
