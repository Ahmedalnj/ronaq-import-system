import { createServerSupabaseClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dashboard metrics
    const [
      { data: cars },
      { data: sales },
      { data: expenses },
      { data: trips },
      { data: liabilities },
      { data: transactions },
    ] = await Promise.all([
      supabase
        .from('cars')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id),
      supabase
        .from('sales')
        .select('selling_price', { count: 'exact' })
        .eq('user_id', user.id),
      supabase
        .from('expenses')
        .select('amount', { count: 'exact' })
        .eq('user_id', user.id),
      supabase
        .from('trips')
        .select('capital')
        .eq('user_id', user.id),
      supabase
        .from('liabilities')
        .select('remaining_amount')
        .eq('user_id', user.id),
      supabase
        .from('exchange_transactions')
        .select('amount_usd, amount_lyd')
        .eq('user_id', user.id),
    ]);

    const totalCars = cars?.length ?? 0;
    const soldCars = cars?.filter((c) => c.status === 'sold') ?? [];
    const soldCarsCount = soldCars.length;
    const availableCarsCount = cars?.filter((c) => c.status === 'available').length ?? 0;
    const totalSales = sales?.reduce((sum, s) => sum + s.selling_price, 0) ?? 0;
    
    // Sum final landed cost of all sold cars
    const totalSoldCarsFinalCost = soldCars.reduce((sum, c) => sum + Number(c.final_cost || 0), 0);
    
    // Dynamic capital aggregation
    const totalCapitalUSD = transactions?.reduce((sum, tx) => sum + Number(tx.amount_usd || 0), 0) ?? 0;
    const totalSpentLYD = transactions?.reduce((sum, tx) => sum + Number(tx.amount_lyd || 0), 0) ?? 0;
    const globalAvgRate = totalCapitalUSD > 0 ? (totalSpentLYD / totalCapitalUSD) : 4.7;

    const staticCapital = trips?.reduce((sum, t) => sum + Number(t.capital || 0), 0) ?? 0;
    const totalCapital = totalCapitalUSD > 0 ? totalCapitalUSD : staticCapital;

    const remainingLiabilities =
      liabilities?.reduce((sum, l) => sum + l.remaining_amount, 0) ?? 0;

    const metrics = {
      totalCapital,
      totalCars,
      soldCars: soldCarsCount,
      availableCars: availableCarsCount,
      totalProfit: totalSales - totalSoldCarsFinalCost - remainingLiabilities,
      remainingLiabilities,
      totalExpenses: expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0,
      totalSales,
      averageExchangeRate: globalAvgRate,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
