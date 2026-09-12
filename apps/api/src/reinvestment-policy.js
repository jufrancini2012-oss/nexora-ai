export const GROWTH_POLICY = Object.freeze({
  thresholdNetProfit: 1000,
  rate: 0.10,
  basis: 'verified_net_profit',
  currency: 'BRL'
});

export function calculateReinvestment(netProfit, policy = GROWTH_POLICY) {
  const value = Number(netProfit);
  if (!Number.isFinite(value) || value <= policy.thresholdNetProfit) {
    return { eligible: false, netProfit: Number.isFinite(value) ? value : 0, reservedAmount: 0, reason: 'THRESHOLD_NOT_EXCEEDED' };
  }
  const reservedAmount = Number((value * policy.rate).toFixed(2));
  return { eligible: true, netProfit: value, reservedAmount, reason: 'NET_PROFIT_ABOVE_THRESHOLD' };
}

export function calculateVerifiedNetProfit(entries) {
  return entries.reduce((total, entry) => {
    if (!entry?.verified || entry.environment !== 'production') return total;
    const amount = Number(entry.amount || 0);
    if (!Number.isFinite(amount)) return total;
    return total + (entry.kind === 'revenue' ? amount : entry.kind === 'cost' ? -amount : 0);
  }, 0);
}
