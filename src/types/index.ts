// Database Types

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: UserRole;
  permissions?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  trip_name: string;
  start_date: string;
  end_date?: string;
  capital: number;
  notes?: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Container {
  id: string;
  trip_id: string;
  user_id: string;
  shipping_cost: number;
  customs_cost: number;
  clearance_cost: number;
  port_fees: number;
  link_fees: number;
  notes?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cleared';
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  user_id: string;
  vin_number: string;
  car_name: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  purchase_price_usd: number;
  exchange_rate: number;
  purchase_price_lyd: number;
  shipping_allocation: number;
  customs_allocation: number;
  expense_allocation: number;
  final_cost: number;
  selling_price?: number;
  profit?: number;
  status: 'available' | 'reserved' | 'sold' | 'installment' | 'in_transit';
  trip_id?: string;
  container_id?: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  trip_id?: string;
  container_id?: string;
  expense_type: 'shipping' | 'customs' | 'clearance' | 'link_fees' | 'transportation' | 'office' | 'other';
  currency: 'USD' | 'LYD' | 'EUR';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: string;
  user_id: string;
  expense_id: string;
  trip_id?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  status: 'settled' | 'active' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  car_id: string;
  customer_name: string;
  customer_phone: string;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_type: 'cash' | 'bank_transfer' | 'installment';
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  sale_id: string;
  customer_name: string;
  customer_phone: string;
  car_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_dates: string[];
  status: 'fully_paid' | 'partial' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  user_id: string;
  usd_to_lyd: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_capital: number;
  total_cars: number;
  sold_cars: number;
  available_cars: number;
  total_profit: number;
  remaining_liabilities: number;
  total_expenses: number;
  total_sales: number;
  average_exchange_rate: number;
}

export interface TripMetrics {
  trip_id: string;
  total_cars: number;
  sold_cars: number;
  total_expenses: number;
  total_profit: number;
  remaining_liabilities: number;
}
