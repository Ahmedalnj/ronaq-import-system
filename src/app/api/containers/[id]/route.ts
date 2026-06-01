import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await context.params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: container, error: containerError } = await supabase
      .from('containers')
      .select('*, trips(trip_name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (containerError || !container) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    const [{ data: expenses, error: expensesError }, { data: cars, error: carsError }] =
      await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .eq('container_id', id)
          .order('date', { ascending: false }),
        supabase
          .from('cars')
          .select('id, car_name, brand, model, year, vin_number, status, final_cost, purchase_price_lyd, created_at')
          .eq('user_id', user.id)
          .eq('container_id', id)
          .order('created_at', { ascending: false }),
      ]);

    if (expensesError) throw expensesError;
    if (carsError) throw carsError;

    const expensesUsd = (expenses || [])
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expensesLyd = (expenses || [])
      .filter((e) => e.currency === 'LYD')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expensesPaidUsd = (expenses || [])
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
    const expensesPaidLyd = (expenses || [])
      .filter((e) => e.currency === 'LYD')
      .reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);

    return NextResponse.json({
      container,
      expenses: expenses || [],
      cars: cars || [],
      summary: {
        cars_count: cars?.length ?? 0,
        cars_capacity: container.cars_count ?? 0,
        expenses_count: expenses?.length ?? 0,
        expenses_total_usd: expensesUsd,
        expenses_total_lyd: expensesLyd,
        expenses_paid_usd: expensesPaidUsd,
        expenses_paid_lyd: expensesPaidLyd,
        container_shipping_usd: Number(container.shipping_cost || 0),
        container_link_usd: Number(container.link_fees || 0),
        container_customs_lyd: Number(container.customs_cost || 0),
        container_clearance_lyd: Number(container.clearance_cost || 0),
        container_port_lyd: Number(container.port_fees || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching container details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
