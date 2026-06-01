import { createServerSupabaseClient } from '@/lib/db/server';
import { computeCarFinancials } from '@/lib/cars/final-cost';
import { assertContainerHasCapacity } from '@/lib/containers/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { carSchema } from '@/lib/validations/schemas';

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
      .from('cars')
      .select('*')
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
    const validatedData = carSchema.parse(body);

    const skipCapacity =
      validatedData.purchase_mode === 'local' ||
      validatedData.purchase_mode === 'shared_container';

    const capacityCheck = await assertContainerHasCapacity(
      supabase,
      user.id,
      validatedData.container_id,
      undefined,
      { skipCapacityCheck: skipCapacity }
    );
    if (!capacityCheck.ok) {
      return NextResponse.json({ error: capacityCheck.error }, { status: 400 });
    }

    const financials = computeCarFinancials(validatedData);

    const tripId =
      validatedData.purchase_mode === 'local' ? null : validatedData.trip_id ?? null;
    const containerId =
      validatedData.purchase_mode === 'local' ? null : validatedData.container_id ?? null;

    const { data, error } = await supabase
      .from('cars')
      .insert({
        ...validatedData,
        user_id: user.id,
        trip_id: tripId,
        container_id: containerId,
        purchase_price_usd: financials.purchase_price_usd,
        purchase_price_lyd: financials.purchase_price_lyd,
        final_cost: financials.final_cost,
        profit: financials.profit,
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
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }

    const validatedData = carSchema.parse(updateData);

    const skipCapacity =
      validatedData.purchase_mode === 'local' ||
      validatedData.purchase_mode === 'shared_container';

    const capacityCheck = await assertContainerHasCapacity(
      supabase,
      user.id,
      validatedData.container_id,
      id,
      { skipCapacityCheck: skipCapacity }
    );
    if (!capacityCheck.ok) {
      return NextResponse.json({ error: capacityCheck.error }, { status: 400 });
    }

    const financials = computeCarFinancials(validatedData);

    const tripId =
      validatedData.purchase_mode === 'local' ? null : validatedData.trip_id ?? null;
    const containerId =
      validatedData.purchase_mode === 'local' ? null : validatedData.container_id ?? null;

    const { data, error } = await supabase
      .from('cars')
      .update({
        ...validatedData,
        trip_id: tripId,
        container_id: containerId,
        purchase_price_usd: financials.purchase_price_usd,
        purchase_price_lyd: financials.purchase_price_lyd,
        final_cost: financials.final_cost,
        profit: financials.profit,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating car:', error);
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
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }

    // First retrieve image URLs to delete them from storage if needed
    const { data: carData } = await supabase
      .from('cars')
      .select('image_urls')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Clean up images from storage if any exist
    if (carData && carData.image_urls && carData.image_urls.length > 0) {
      for (const url of carData.image_urls) {
        try {
          const path = url.split('/public/car-images/')[1];
          if (path) {
            await supabase.storage.from('car-images').remove([path]);
          }
        } catch (storageErr) {
          console.error('Failed to clean up storage image:', storageErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting car:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

