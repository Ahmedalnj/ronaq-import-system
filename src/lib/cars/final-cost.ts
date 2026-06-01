export type PurchaseMode = 'import' | 'local' | 'shared_container';

export type CarCostInput = {
  purchase_mode?: PurchaseMode;
  purchase_price_usd: number;
  purchase_price_lyd?: number;
  exchange_rate: number;
  shipping_allocation?: number;
  link_fees_allocation?: number;
  customs_allocation?: number;
  clearance_allocation?: number;
  expense_allocation?: number;
  selling_price?: number;
};

/** shipping_allocation & link_fees_allocation are stored in USD; customs/clearance/expense in LYD */
export function computeCarFinancials(input: CarCostInput) {
  const mode = input.purchase_mode || 'import';
  const exchangeRate = Number(input.exchange_rate) || 1;

  const purchasePriceLYD =
    mode === 'local'
      ? Number(input.purchase_price_lyd ?? input.purchase_price_usd ?? 0)
      : Number(input.purchase_price_usd || 0) * exchangeRate;

  const shippingUsd = Number(input.shipping_allocation || 0);
  const linkUsd = Number(input.link_fees_allocation || 0);
  const shippingLyd = shippingUsd * exchangeRate;
  const linkLyd = linkUsd * exchangeRate;

  const final_cost =
    purchasePriceLYD +
    shippingLyd +
    linkLyd +
    Number(input.customs_allocation || 0) +
    Number(input.clearance_allocation || 0) +
    Number(input.expense_allocation || 0);

  let profit: number | null = null;
  if (input.selling_price != null && input.selling_price > 0) {
    profit = input.selling_price - final_cost;
  }

  return {
    purchase_price_lyd: purchasePriceLYD,
    final_cost,
    profit,
    purchase_price_usd: mode === 'local' ? 0 : Number(input.purchase_price_usd || 0),
  };
}
