import type { SupabaseClient } from '@supabase/supabase-js';
import { computeCarFinancials } from '@/lib/cars/final-cost';

export const CAR_EXPENSE_TYPES = [
  'repair',
  'maintenance',
  'parts',
  'tires',
  'body_work',
  'electrical',
  'registration',
  'insurance',
  'transportation',
  'other_car',
] as const;

export type CarExpenseType = (typeof CAR_EXPENSE_TYPES)[number];

export const CAR_EXPENSE_LABELS: Record<string, string> = {
  repair: 'تصليح / ورشة',
  maintenance: 'صيانة دورية',
  parts: 'قطع غيار',
  tires: 'إطارات',
  body_work: 'سمكرة ودهان',
  electrical: 'كهرباء',
  registration: 'ترخيص / مرور',
  insurance: 'تأمين',
  transportation: 'نقل السيارة',
  other_car: 'مصروف آخر للسيارة',
};

type ExpenseRow = {
  amount: number;
  currency: string;
  exchange_rate?: number | null;
};

export function expenseAmountToLyd(
  expense: ExpenseRow,
  carExchangeRate: number
): number {
  const amount = Number(expense.amount || 0);
  if (expense.currency === 'USD') {
    const rate = Number(expense.exchange_rate || carExchangeRate || 1);
    return amount * rate;
  }
  if (expense.currency === 'EUR') {
    const rate = Number(expense.exchange_rate || carExchangeRate || 1);
    return amount * rate;
  }
  return amount;
}

export async function sumCarExpensesLyd(
  supabase: SupabaseClient,
  userId: string,
  carId: string,
  carExchangeRate: number
): Promise<number> {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount, currency, exchange_rate')
    .eq('user_id', userId)
    .eq('car_id', carId);

  if (error) throw error;

  return (expenses || []).reduce(
    (sum, exp) => sum + expenseAmountToLyd(exp, carExchangeRate),
    0
  );
}

/** يحدّث expense_allocation و final_cost من مصاريف السيارة المسجلة */
export async function syncCarFinancialsFromExpenses(
  supabase: SupabaseClient,
  userId: string,
  carId: string
) {
  const { data: car, error: carError } = await supabase
    .from('cars')
    .select('*')
    .eq('id', carId)
    .eq('user_id', userId)
    .single();

  if (carError || !car) throw new Error('السيارة غير موجودة');

  const carExpensesLyd = await sumCarExpensesLyd(
    supabase,
    userId,
    carId,
    Number(car.exchange_rate) || 1
  );

  const financials = computeCarFinancials({
    ...car,
    purchase_mode: car.purchase_mode || 'import',
    expense_allocation: carExpensesLyd,
  });

  const { data: updated, error: updateError } = await supabase
    .from('cars')
    .update({
      expense_allocation: carExpensesLyd,
      final_cost: financials.final_cost,
      profit: financials.profit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', carId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) throw updateError;

  return { car: updated, carExpensesLyd };
}
