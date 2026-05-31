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

    // 1. Fetch all cars
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('*')
      .eq('user_id', user.id);

    if (carsError) throw carsError;

    // 2. Fetch all exchange transactions
    const { data: exchangeTransactions, error: exchangeError } = await supabase
      .from('exchange_transactions')
      .select('*')
      .eq('user_id', user.id);

    if (exchangeError) throw exchangeError;

    // 3. Fetch all expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id);

    if (expensesError) throw expensesError;

    // 4. Fetch all trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id);

    if (tripsError) throw tripsError;

    const totalCarsCount = cars?.length ?? 0;
    
    // Average landed cost
    const averageLandedCost = totalCarsCount > 0 
      ? (cars.reduce((sum, c) => sum + Number(c.final_cost || 0), 0) / totalCarsCount)
      : 0;

    // Total inventory value (cars that are not sold yet)
    const totalInventoryValue = cars
      ?.filter((c) => c.status !== 'sold')
      .reduce((sum, c) => sum + Number(c.final_cost || 0), 0) ?? 0;

    // Highest cost cars (Top 5)
    const highestCostCars = [...(cars ?? [])]
      .sort((a, b) => Number(b.final_cost || 0) - Number(a.final_cost || 0))
      .slice(0, 5);

    // Most profitable cars (Top 5)
    const mostProfitableCars = [...(cars ?? [])]
      .filter((c) => c.profit !== null && Number(c.profit) > 0)
      .sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0))
      .slice(0, 5);

    // Lowest profit margin sold cars (Top 5)
    const lowestMarginCars = [...(cars ?? [])]
      .filter((c) => c.profit_margin !== null && Number(c.profit_margin) > 0)
      .sort((a, b) => Number(a.profit_margin || 0) - Number(b.profit_margin || 0))
      .slice(0, 5);

    // --- TREASURY & MULTI-CURRENCY CALCULATIONS ---
    const totalUsdCapital = exchangeTransactions?.reduce((sum, t) => sum + Number(t.amount_usd || 0), 0) ?? 0;
    const totalLydSpentCapital = exchangeTransactions?.reduce((sum, t) => sum + Number(t.amount_lyd || 0), 0) ?? 0;
    const treasuryAverageRate = totalUsdCapital > 0 ? (totalLydSpentCapital / totalUsdCapital) : 6.50;

    // Total USD Spent on Car Purchases
    const totalUsdCarPurchases = cars?.reduce((sum, c) => sum + Number(c.purchase_price_usd || 0), 0) ?? 0;
    
    // Outstanding Debts (Liabilities)
    const unpaidExpenses = expenses?.filter((e) => e.status !== 'paid') ?? [];
    
    const outstandingUsdDebt = unpaidExpenses
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + Number(e.remaining_amount || 0), 0);

    const outstandingLydDebt = unpaidExpenses
      .filter((e) => e.currency === 'LYD')
      .reduce((sum, e) => sum + Number(e.remaining_amount || 0), 0);

    const totalLiabilitiesLyd = outstandingLydDebt + (outstandingUsdDebt * treasuryAverageRate);

    // Trip Financials Ledger
    const tripFinancials = trips?.map((trip) => {
      const tripTxs = exchangeTransactions?.filter((tx) => tx.trip_id === trip.id) ?? [];
      const tripUsd = tripTxs.reduce((sum, tx) => sum + Number(tx.amount_usd || 0), 0);
      const tripLyd = tripTxs.reduce((sum, tx) => sum + Number(tx.amount_lyd || 0), 0);
      const tripRate = tripUsd > 0 ? (tripLyd / tripUsd) : null;

      // Calculate general trip expenses in LYD (where trip_id matches and container_id is NULL)
      const tripExpenses = expenses?.filter((e) => e.trip_id === trip.id && !e.container_id) ?? [];
      const expensesLyd = tripExpenses.reduce((sum, e) => {
        if (e.currency === 'LYD') {
          return sum + Number(e.amount || 0);
        } else if (e.currency === 'USD') {
          const rate = e.exchange_rate ?? tripRate ?? 6.50;
          return sum + (Number(e.amount || 0) * rate);
        } else if (e.currency === 'EUR') {
          const rate = e.exchange_rate ?? 7.00;
          return sum + (Number(e.amount || 0) * rate);
        }
        return sum + Number(e.amount || 0);
      }, 0);

      return {
        id: trip.id,
        trip_name: trip.trip_name,
        capital_usd: tripUsd,
        spent_lyd: tripLyd,
        exchange_rate: tripRate,
        expenses_lyd: expensesLyd,
        status: trip.status,
      };
    }) ?? [];

    return NextResponse.json({
      averageLandedCost,
      totalInventoryValue,
      highestCostCars,
      mostProfitableCars,
      lowestMarginCars,
      totalCarsCount,
      // Treasury & Debts details
      totalUsdCapital,
      totalLydSpentCapital,
      treasuryAverageRate,
      totalUsdCarPurchases,
      outstandingUsdDebt,
      outstandingLydDebt,
      totalLiabilitiesLyd,
      tripFinancials
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

