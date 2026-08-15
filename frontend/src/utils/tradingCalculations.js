export const calculateOrderValue = (quantity, price) => {
  return quantity * price;
};

export const calculateBrokerage = (orderValue, productType) => {
  return productType === 'MIS' ? Math.min(orderValue * 0.0005, 20.00) : 0;
};

export const calculateTaxesAndCharges = (orderValue) => {
  return orderValue * 0.0003;
};

export const calculateRequiredMargin = (orderValue, productType, totalCharges) => {
  const marginMultiplier = productType === 'MIS' ? 0.20 : 1.00;
  return orderValue * marginMultiplier + totalCharges;
};

export const calculateRiskRewardRatio = (targetPrice, stopLossPrice, currentPrice, hasTarget, hasStopLoss) => {
  if (!hasTarget || !hasStopLoss || !currentPrice) return 'N/A';
  const reward = Math.abs(targetPrice - currentPrice);
  const risk = Math.abs(currentPrice - stopLossPrice);
  if (risk === 0) return 'N/A';
  return (reward / risk).toFixed(2);
};
