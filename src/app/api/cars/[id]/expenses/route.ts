import { createServerSupabaseClient } from '@/lib/db/server';
import { syncCarFinancialsFromExpenses } from '@/lib/cars/car-expenses';
import { expenseSchema } from '@/lib/validations/schemas';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: carId } = await context.params;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('car_id', carId)
      .order('date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching car expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: carId } = await context.params;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, trip_id')
      .eq('id', carId)
      .eq('user_id', user.id)
      .single();

    if (carError || !car) {
      return NextResponse.json({ error: 'السيارة غير موجودة' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse({
      ...body,
      car_id: carId,
      trip_id: car.trip_id ?? body.trip_id ?? null,
      container_id: null,
    });

    const remaining_amount = validatedData.amount - validatedData.paid_amount;
    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (validatedData.paid_amount >= validatedData.amount) status = 'paid';
    else if (validatedData.paid_amount > 0) status = 'partial';

    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        ...validatedData,
        user_id: user.id,
        remaining_amount,
        status,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (remaining_amount > 0) {
      await supabase.from('liabilities').insert({
        user_id: user.id,
        expense_id: expense.id,
        trip_id: validatedData.trip_id,
        total_amount: validatedData.amount,
        paid_amount: validatedData.paid_amount,
        remaining_amount,
        status: 'active',
      });
    }

    const { car: updatedCar } = await syncCarFinancialsFromExpenses(supabase, user.id, carId);

    return NextResponse.json(
      { expense, car: updatedCar },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating car expense:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
