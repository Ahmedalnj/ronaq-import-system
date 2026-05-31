import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';
import { tripSchema } from '@/lib/validations/schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (tripsError) throw tripsError;

    // 2. Fetch all exchange transactions to perform dynamic capital aggregations
    const { data: transactions, error: txError } = await supabase
      .from('exchange_transactions')
      .select('*')
      .eq('user_id', user.id);

    if (txError) throw txError;

    // 3. Map trips and calculate dynamic capital sum and average exchange rate
    const mappedTrips = trips.map((trip) => {
      const tripTxs = transactions.filter((tx) => tx.trip_id === trip.id);
      
      const totalCapitalUSD = tripTxs.reduce((sum, tx) => sum + Number(tx.amount_usd || 0), 0);
      const totalSpentLYD = tripTxs.reduce((sum, tx) => sum + Number(tx.amount_lyd || 0), 0);
      const avgRate = totalCapitalUSD > 0 ? (totalSpentLYD / totalCapitalUSD) : 0;

      return {
        ...trip,
        // Calculate Capital from exchange transactions. Fallback to manually set capital if no transactions exist.
        capital: totalCapitalUSD > 0 ? totalCapitalUSD : Number(trip.capital || 0),
        spent_lyd: totalSpentLYD,
        average_exchange_rate: avgRate > 0 ? avgRate : null,
      };
    });

    return NextResponse.json(mappedTrips);
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
    const validatedData = tripSchema.parse(body);

    const { data, error } = await supabase
      .from('trips')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

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
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const validatedData = tripSchema.parse(updateData);

    const { data, error } = await supabase
      .from('trips')
      .update({
        ...validatedData,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating trip:', error);
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
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

