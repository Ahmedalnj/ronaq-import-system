import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';
import { exchangeTransactionSchema } from '@/lib/validations/schemas';

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
      .from('exchange_transactions')
      .select('*, trips(trip_name)')
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
    const validatedData = exchangeTransactionSchema.parse(body);

    const { data, error } = await supabase
      .from('exchange_transactions')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger calculation of trip costs since the exchange rate or capital of the trip might have changed!
    try {
      await supabase.rpc('recalculate_trip_costs', { p_trip_id: validatedData.trip_id });
    } catch (triggerErr) {
      console.error('Trigger failed:', triggerErr);
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const validatedData = exchangeTransactionSchema.parse(updateData);

    const { data, error } = await supabase
      .from('exchange_transactions')
      .update({
        ...validatedData,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Recalculate trip costs
    try {
      await supabase.rpc('recalculate_trip_costs', { p_trip_id: validatedData.trip_id });
    } catch (triggerErr) {
      console.error('Trigger failed:', triggerErr);
    }

    return NextResponse.json(data);
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Fetch details to know the trip ID before delete
    const { data: item } = await supabase
      .from('exchange_transactions')
      .select('trip_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('exchange_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Recalculate trip costs
    if (item?.trip_id) {
      try {
        await supabase.rpc('recalculate_trip_costs', { p_trip_id: item.trip_id });
      } catch (triggerErr) {
        console.error('Trigger failed:', triggerErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
