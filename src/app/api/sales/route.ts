import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';
import { saleSchema } from '@/lib/validations/schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        cars(car_name, brand, model, year)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

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
    const validatedData = saleSchema.parse(body);

    // Calculate remaining amount
    const remaining_amount =
      validatedData.selling_price - validatedData.paid_amount;

    const { data, error } = await supabase
      .from('sales')
      .insert({
        ...validatedData,
        user_id: user.id,
        remaining_amount,
      })
      .select()
      .single();

    if (error) throw error;

    // Update car status
    if (validatedData.payment_type === 'installment') {
      await supabase
        .from('cars')
        .update({ status: 'installment' })
        .eq('id', validatedData.car_id);
    } else {
      await supabase
        .from('cars')
        .update({ status: 'sold', selling_price: validatedData.selling_price })
        .eq('id', validatedData.car_id);
    }

    // Create installment if payment type is installment
    if (validatedData.payment_type === 'installment') {
      await supabase.from('installments').insert({
        user_id: user.id,
        sale_id: data.id,
        customer_name: validatedData.customer_name,
        customer_phone: validatedData.customer_phone,
        car_id: validatedData.car_id,
        total_amount: validatedData.selling_price,
        paid_amount: validatedData.paid_amount,
        remaining_amount,
        status: validatedData.paid_amount > 0 ? 'partial' : 'partial',
      });
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
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // 1. Get the sale details to find the car_id
    const { data: sale, error: getError } = await supabase
      .from('sales')
      .select('car_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (getError) throw getError;

    // 2. Delete installments associated with the sale
    await supabase
      .from('installments')
      .delete()
      .eq('sale_id', id)
      .eq('user_id', user.id);

    // 3. Revert car status to available and clear selling price
    if (sale && sale.car_id) {
      await supabase
        .from('cars')
        .update({ status: 'available', selling_price: null })
        .eq('id', sale.car_id);
    }

    // 4. Delete the sale record
    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

