import test from 'node:test';
import assert from 'node:assert';
import { 
  calculateOrderValue, 
  calculateBrokerage, 
  calculateTaxesAndCharges, 
  calculateRequiredMargin, 
  calculateRiskRewardRatio 
} from './tradingCalculations.js';

test('Trading Terminal Core Math Calculations', async (t) => {
  
  await t.test('Order Value calculation should be quantity * price', () => {
    assert.strictEqual(calculateOrderValue(10, 150), 1500);
    assert.strictEqual(calculateOrderValue(5, 42.5), 212.5);
    assert.strictEqual(calculateOrderValue(0, 100), 0);
  });

  await t.test('Brokerage for Intraday (MIS) should be 0.05% of order value, capped at $20', () => {
    // 0.05% of $1000 is $0.50
    assert.strictEqual(calculateBrokerage(1000, 'MIS'), 0.50);
    
    // 0.05% of $10000 is $5.00
    assert.strictEqual(calculateBrokerage(10000, 'MIS'), 5.00);

    // 0.05% of $50000 is $25.00, which exceeds the cap, so it should return $20
    assert.strictEqual(calculateBrokerage(50000, 'MIS'), 20.00);
    
    // 0.05% of $100000 is $50.00, which exceeds the cap, so it should return $20
    assert.strictEqual(calculateBrokerage(100000, 'MIS'), 20.00);
  });

  await t.test('Brokerage for Delivery (CNC) should always be $0', () => {
    assert.strictEqual(calculateBrokerage(1000, 'CNC'), 0);
    assert.strictEqual(calculateBrokerage(50000, 'CNC'), 0);
  });

  await t.test('Taxes and exchange charges should be 0.03% of order value', () => {
    // 0.03% of $1000 is $0.30
    assert.ok(Math.abs(calculateTaxesAndCharges(1000) - 0.30) < 0.00001);
    
    // 0.03% of $5000 is $1.50
    assert.ok(Math.abs(calculateTaxesAndCharges(5000) - 1.50) < 0.00001);
  });

  await t.test('Required Margin for Intraday (MIS) should be 20% of order value + total charges', () => {
    const orderValue = 1000;
    const brokerageFee = calculateBrokerage(orderValue, 'MIS'); // $0.50
    const taxesAndTaxes = calculateTaxesAndCharges(orderValue); // $0.30
    const totalCharges = brokerageFee + taxesAndTaxes; // $0.80
    
    // 20% of $1000 is $200. Total margin = 200 + 0.80 = 200.80
    assert.strictEqual(calculateRequiredMargin(orderValue, 'MIS', totalCharges), 200.80);
  });

  await t.test('Required Margin for Delivery (CNC) should be 100% of order value + total charges', () => {
    const orderValue = 1000;
    const brokerageFee = calculateBrokerage(orderValue, 'CNC'); // $0
    const taxesAndTaxes = calculateTaxesAndCharges(orderValue); // $0.30
    const totalCharges = brokerageFee + taxesAndTaxes; // $0.30
    
    // 100% of $1000 is $1000. Total margin = 1000 + 0.30 = 1000.30
    assert.strictEqual(calculateRequiredMargin(orderValue, 'CNC', totalCharges), 1000.30);
  });

  await t.test('Risk/Reward Ratio calculations', () => {
    // Current: 100, Stop Loss: 95 (Risk: 5), Target: 110 (Reward: 10). Ratio: 10/5 = 2.00
    assert.strictEqual(calculateRiskRewardRatio(110, 95, 100, true, true), "2.00");

    // Current: 100, Stop Loss: 90 (Risk: 10), Target: 115 (Reward: 15). Ratio: 15/10 = 1.50
    assert.strictEqual(calculateRiskRewardRatio(115, 90, 100, true, true), "1.50");

    // Missing target or stoploss check should return 'N/A'
    assert.strictEqual(calculateRiskRewardRatio(110, 95, 100, false, true), 'N/A');
    assert.strictEqual(calculateRiskRewardRatio(110, 95, 100, true, false), 'N/A');
    assert.strictEqual(calculateRiskRewardRatio(110, 95, 100, false, false), 'N/A');

    // Risk is 0 should return 'N/A' (division by zero protection)
    assert.strictEqual(calculateRiskRewardRatio(110, 100, 100, true, true), 'N/A');
  });

});
