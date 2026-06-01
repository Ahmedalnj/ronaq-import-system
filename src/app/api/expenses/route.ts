import { createServerSupabaseClient } from '@/lib/db/server';
import { syncCarFinancialsFromExpenses } from '@/lib/cars/car-expenses';
import { NextRequest, NextResponse } from 'next/server';
import { expenseSchema } from '@/lib/validations/schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const carId = searchParams.get('car_id');

    let query = supabase
      .from('expenses')
      .select('*, containers(id, container_number, trips(trip_name)), cars(id, car_name, vin_number)')
      .eq('user_id', user.id);

    if (carId) {
      query = query.eq('car_id', carId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    // Calculate remaining amount
    const remaining_amount = validatedData.amount - validatedData.paid_amount;

    // Determine status
    let status = 'unpaid';
    if (validatedData.paid_amount >= validatedData.amount) {
      status = 'paid';
    } else if (validatedData.paid_amount > 0) {
      status = 'partial';
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...validatedData,
        user_id: user.id,
        remaining_amount,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    // Create liability if there's a remaining amount
    if (remaining_amount > 0) {
      await supabase.from('liabilities').insert({
        user_id: user.id,
        expense_id: data.id,
        trip_id: validatedData.trip_id,
        total_amount: validatedData.amount,
        paid_amount: validatedData.paid_amount,
        remaining_amount,
        status: 'active',
      });
    }

    if (validatedData.car_id) {
      await syncCarFinancialsFromExpenses(supabase, user.id, validatedData.car_id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const validatedData = expenseSchema.parse(updateData);

    // Calculate remaining amount
    const remaining_amount = validatedData.amount - validatedData.paid_amount;

    // Determine status
    let status = 'unpaid';
    if (validatedData.paid_amount >= validatedData.amount) {
      status = 'paid';
    } else if (validatedData.paid_amount > 0) {
      status = 'partial';
    }

    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...validatedData,
        remaining_amount,
        status,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (validatedData.car_id) {
      await syncCarFinancialsFromExpenses(supabase, user.id, validatedData.car_id);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('expenses')
      .select('car_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    await supabase
      .from('liabilities')
      .delete()
      .eq('expense_id', id)
      .eq('user_id', user.id);

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    if (existing?.car_id) {
      await syncCarFinancialsFromExpenses(supabase, user.id, existing.car_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


