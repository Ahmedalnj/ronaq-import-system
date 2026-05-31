-- Ronaq Import System - Supabase PostgreSQL Schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  capital DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exchange rates table
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usd_to_lyd DECIMAL(10, 4) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Containers table
CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shipping_cost DECIMAL(15, 2) DEFAULT 0,
  customs_cost DECIMAL(15, 2) DEFAULT 0,
  clearance_cost DECIMAL(15, 2) DEFAULT 0,
  port_fees DECIMAL(15, 2) DEFAULT 0,
  link_fees DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cleared')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cars table
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vin_number TEXT UNIQUE NOT NULL,
  car_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  purchase_price_usd DECIMAL(15, 2) NOT NULL,
  exchange_rate DECIMAL(10, 4) NOT NULL,
  purchase_price_lyd DECIMAL(15, 2) NOT NULL,
  shipping_allocation DECIMAL(15, 2) DEFAULT 0,
  customs_allocation DECIMAL(15, 2) DEFAULT 0,
  expense_allocation DECIMAL(15, 2) DEFAULT 0,
  final_cost DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2),
  profit DECIMAL(15, 2),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'installment', 'in_transit')),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  container_id UUID REFERENCES containers(id) ON DELETE SET NULL,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  container_id UUID REFERENCES containers(id) ON DELETE SET NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('shipping', 'customs', 'clearance', 'link_fees', 'transportation', 'office', 'other')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'LYD', 'EUR')),
  amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Liabilities table
CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('settled', 'active', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'bank_transfer', 'installment')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Installments table
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  installment_dates DATE[] DEFAULT ARRAY[]::DATE[],
  status TEXT DEFAULT 'partial' CHECK (status IN ('fully_paid', 'partial', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_containers_trip_id ON containers(trip_id);
CREATE INDEX idx_containers_user_id ON containers(user_id);
CREATE INDEX idx_cars_user_id ON cars(user_id);
CREATE INDEX idx_cars_trip_id ON cars(trip_id);
CREATE INDEX idx_cars_status ON cars(status);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX idx_liabilities_status ON liabilities(status);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_car_id ON sales(car_id);
CREATE INDEX idx_installments_user_id ON installments(user_id);
CREATE INDEX idx_exchange_rates_user_id ON exchange_rates(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow users to see their own data
CREATE POLICY "Users can view their own data" ON trips FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own containers" ON containers FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own cars" ON cars FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own expenses" ON expenses FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own liabilities" ON liabilities FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own sales" ON sales FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own installments" ON installments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own exchange rates" ON exchange_rates FOR SELECT USING (auth.uid()::text = user_id::text);

-- Insert policies
CREATE POLICY "Users can insert their own data" ON trips FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert containers" ON containers FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert cars" ON cars FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert expenses" ON expenses FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert liabilities" ON liabilities FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert sales" ON sales FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert installments" ON installments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert exchange rates" ON exchange_rates FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Update policies
CREATE POLICY "Users can update their own data" ON trips FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update containers" ON containers FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update cars" ON cars FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update expenses" ON expenses FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update liabilities" ON liabilities FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update sales" ON sales FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update installments" ON installments FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update exchange rates" ON exchange_rates FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Delete policies
CREATE POLICY "Users can delete their own data" ON trips FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete containers" ON containers FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete cars" ON cars FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete expenses" ON expenses FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete liabilities" ON liabilities FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete sales" ON sales FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete installments" ON installments FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete exchange rates" ON exchange_rates FOR DELETE USING (auth.uid()::text = user_id::text);
