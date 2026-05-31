import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
});

// Helpers
const optionalUuidSchema = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().uuid().optional()
);

// Trip Schemas
export const tripSchema = z.object({
  trip_name: z.string().min(2, 'اسم الرحلة مطلوب'),
  start_date: z.string().date('تاريخ البداية مطلوب'),
  end_date: z.string().date().optional(),
  capital: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  status: z.enum(['open', 'closed']),
  planned_cars_count: z.number().int().min(1).optional().default(1),
});

// Container Schemas
export const containerSchema = z.object({
  trip_id: z.string().uuid(),
  container_number: z.string().min(1, 'رقم الحاوية مطلوب'),
  shipping_cost: z.number().min(0),
  customs_cost: z.number().min(0),
  clearance_cost: z.number().min(0).optional().default(0),
  port_fees: z.number().min(0).optional().default(0),
  link_fees: z.number().min(0),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_transit', 'delivered', 'cleared']),
  cars_count: z.number().int().min(1).optional().default(6),
});

// Car Schemas
export const carSchema = z.object({
  vin_number: z.string().min(5, 'رقم الهيكل يجب أن يكون 5 أحرف على الأقل'),
  car_name: z.string().min(2, 'اسم السيارة مطلوب'),
  brand: z.string().min(1).optional().default('كوري'),
  model: z.string().min(1).optional().default('غير معروف'),
  year: z.number().int().min(1990).max(2100).optional().default(new Date().getFullYear()),
  color: z.string().min(1).optional().default('غير محدد'),
  purchase_price_usd: z.number().min(0),
  purchase_price_krw: z.number().min(0).optional().default(0),
  exchange_rate_usd_krw: z.number().min(0).optional().default(1350),
  exchange_rate: z.number().min(0),
  shipping_allocation: z.number().min(0).optional().default(0),
  customs_allocation: z.number().min(0).optional().default(0),
  expense_allocation: z.number().min(0).optional().default(0),
  selling_price: z.number().min(0).optional(),
  status: z.enum(['available', 'reserved', 'sold', 'installment', 'in_transit']),
  trip_id: optionalUuidSchema,
  container_id: optionalUuidSchema,
  image_urls: z.array(z.string()).optional().default([]),
});

// Expense Schemas
export const expenseSchema = z.object({
  expense_type: z.enum(['shipping', 'customs', 'clearance', 'link_fees', 'transportation', 'office', 'other']),
  currency: z.enum(['USD', 'LYD', 'EUR']),
  amount: z.number().min(0),
  paid_amount: z.number().min(0),
  status: z.enum(['paid', 'partial', 'unpaid']),
  date: z.string().date(),
  notes: z.string().optional(),
  trip_id: optionalUuidSchema,
  container_id: optionalUuidSchema,
  exchange_rate: z.number().min(0).optional().nullable(),
});



// Sale Schemas
export const saleSchema = z.object({
  car_id: z.string().uuid(),
  customer_name: z.string().min(2),
  customer_phone: z.string().min(9),
  selling_price: z.number().min(0),
  paid_amount: z.number().min(0),
  payment_type: z.enum(['cash', 'bank_transfer', 'installment']),
  date: z.string().date(),
  notes: z.string().optional(),
});

// Installment Schemas
export const installmentSchema = z.object({
  sale_id: z.string().uuid(),
  customer_name: z.string().min(2),
  customer_phone: z.string().min(9),
  car_id: z.string().uuid(),
  total_amount: z.number().min(0),
  paid_amount: z.number().min(0),
  installment_dates: z.array(z.string().date()),
});

// Exchange Transaction Schemas
export const exchangeTransactionSchema = z.object({
  trip_id: z.string().uuid(),
  description: z.string().optional(),
  amount_usd: z.number().min(0),
  exchange_rate: z.number().min(0),
  date: z.string().date(),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type ContainerInput = z.infer<typeof containerSchema>;
export type CarInput = z.infer<typeof carSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type InstallmentInput = z.infer<typeof installmentSchema>;
export type ExchangeTransactionInput = z.infer<typeof exchangeTransactionSchema>;
