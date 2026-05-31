import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';
import { containerSchema } from '@/lib/validations/schemas';

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
      .from('containers')
      .select('*, trips(trip_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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
    const validatedData = containerSchema.parse(body);

    const { data, error } = await supabase
      .from('containers')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // After creating a container, we should automatically add the shipping and customs costs
    // as expenses linked to this container and trip in their correct currencies!
    
    // 1. Shipping Expense (USD)
    if (validatedData.shipping_cost > 0) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        trip_id: validatedData.trip_id,
        container_id: data.id,
        expense_type: 'shipping',
        currency: 'USD',
        amount: validatedData.shipping_cost,
        paid_amount: 0,
        remaining_amount: validatedData.shipping_cost,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        notes: `مصاريف شحن تلقائية للحاوية رقم ${data.id.substring(0, 8)} ($)`,
      });
    }

    // 2. Link Fees Expense (USD)
    if (validatedData.link_fees > 0) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        trip_id: validatedData.trip_id,
        container_id: data.id,
        expense_type: 'link_fees',
        currency: 'USD',
        amount: validatedData.link_fees,
        paid_amount: 0,
        remaining_amount: validatedData.link_fees,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        notes: `رسوم ربط تلقائية للحاوية رقم ${data.id.substring(0, 8)} ($)`,
      });
    }

    // 3. Customs Expense (LYD)
    if (validatedData.customs_cost > 0) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        trip_id: validatedData.trip_id,
        container_id: data.id,
        expense_type: 'customs',
        currency: 'LYD',
        amount: validatedData.customs_cost,
        paid_amount: 0,
        remaining_amount: validatedData.customs_cost,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        notes: `مصاريف جمارك تلقائية للحاوية رقم ${data.id.substring(0, 8)}`,
      });
    }

    // 4. Clearance Expense (LYD)
    if (validatedData.clearance_cost > 0) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        trip_id: validatedData.trip_id,
        container_id: data.id,
        expense_type: 'clearance',
        currency: 'LYD',
        amount: validatedData.clearance_cost,
        paid_amount: 0,
        remaining_amount: validatedData.clearance_cost,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        notes: `مصاريف تخليص تلقائية للحاوية رقم ${data.id.substring(0, 8)}`,
      });
    }

    // 5. Port Fees Expense (LYD)
    if (validatedData.port_fees > 0) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        trip_id: validatedData.trip_id,
        container_id: data.id,
        expense_type: 'other',
        currency: 'LYD',
        amount: validatedData.port_fees,
        paid_amount: 0,
        remaining_amount: validatedData.port_fees,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        notes: `رسوم ميناء تلقائية للحاوية رقم ${data.id.substring(0, 8)}`,
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
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    const validatedData = containerSchema.parse(updateData);

    const { data, error } = await supabase
      .from('containers')
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
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('containers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
