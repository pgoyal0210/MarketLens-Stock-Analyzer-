import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

const TradingContext = createContext(null);

/* ───────── Generate Realistic OHLC Data ───────── */
const generateOHLCData = (basePrice, days = 365) => {
  const data = [];
  let price = basePrice * 0.85;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const volatility = 0.018 + Math.random() * 0.012;
    const drift = (basePrice - price) * 0.002;
    const change = drift + (Math.random() - 0.48) * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    const volume = Math.floor(2000000 + Math.random() * 15000000);
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return data;
};

/* ───────── Generate Order Book ───────── */
const generateOrderBook = (ltp) => {
  const bids = [];
  const asks = [];
  for (let i = 0; i < 5; i++) {
    bids.push({
      price: +(ltp - (i + 1) * 0.5 - Math.random() * 0.3).toFixed(2),
      qty: Math.floor(50 + Math.random() * 500),
      orders: Math.floor(1 + Math.random() * 20),
    });
    asks.push({
      price: +(ltp + (i + 1) * 0.5 + Math.random() * 0.3).toFixed(2),
      qty: Math.floor(50 + Math.random() * 500),
      orders: Math.floor(1 + Math.random() * 20),
    });
  }
  return { bids, asks };
};

/* ───────── Stock Database ───────── */
const STOCK_DB = {
  RELIANCE: {
    symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE',
    sector: 'Energy', basePrice: 2945.50,
    metrics: { pe: 28.4, eps: 103.7, marketCap: '19.92L Cr', dividendYield: 0.34, beta: 0.87, wk52High: 3217.60, wk52Low: 2220.30, avgVolume: 8547231 },
    priceStats: { open: 2938.00, prevClose: 2932.15, dayHigh: 2961.80, dayLow: 2929.50, vwap: 2946.35, upperCircuit: 3225.35, lowerCircuit: 2638.95 },
  },
  TCS: {
    symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE',
    sector: 'IT', basePrice: 3872.25,
    metrics: { pe: 31.2, eps: 124.1, marketCap: '14.18L Cr', dividendYield: 1.18, beta: 0.62, wk52High: 4592.25, wk52Low: 3311.05, avgVolume: 3214567 },
    priceStats: { open: 3865.00, prevClose: 3858.90, dayHigh: 3890.50, dayLow: 3848.15, vwap: 3871.20, upperCircuit: 4244.75, lowerCircuit: 3473.05 },
  },
  INFY: {
    symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE',
    sector: 'IT', basePrice: 1568.40,
    metrics: { pe: 26.8, eps: 58.5, marketCap: '6.51L Cr', dividendYield: 2.15, beta: 0.73, wk52High: 1953.90, wk52Low: 1358.35, avgVolume: 12456789 },
    priceStats: { open: 1562.00, prevClose: 1559.75, dayHigh: 1578.90, dayLow: 1555.20, vwap: 1567.80, upperCircuit: 1715.70, lowerCircuit: 1403.80 },
  },
  HDFCBANK: {
    symbol: 'HDFCBANK', name: 'HDFC Bank Limited', exchange: 'NSE',
    sector: 'Banking', basePrice: 1745.80,
    metrics: { pe: 19.5, eps: 89.5, marketCap: '13.28L Cr', dividendYield: 1.08, beta: 0.95, wk52High: 1880.00, wk52Low: 1363.55, avgVolume: 9876543 },
    priceStats: { open: 1740.00, prevClose: 1738.25, dayHigh: 1755.60, dayLow: 1732.40, vwap: 1744.90, upperCircuit: 1912.05, lowerCircuit: 1564.45 },
  },
};

/* ───────── Charges Calculator ───────── */
const calcCharges = (qty, price, orderSide, productType) => {
  const turnover = qty * price;
  const brokerage = Math.min(turnover * 0.0003, 20);
  const stt = orderSide === 'BUY' && productType === 'CNC' ? turnover * 0.001 : turnover * 0.00025;
  const exchangeCharges = turnover * 0.0000345;
  const gst = (brokerage + exchangeCharges) * 0.18;
  const sebi = turnover * 0.000001;
  const stampDuty = orderSide === 'BUY' ? turnover * 0.00015 : 0;
  const total = brokerage + stt + exchangeCharges + gst + sebi + stampDuty;
  return { brokerage: +brokerage.toFixed(2), stt: +stt.toFixed(2), exchangeCharges: +exchangeCharges.toFixed(2), gst: +gst.toFixed(2), sebi: +sebi.toFixed(4), stampDuty: +stampDuty.toFixed(2), total: +total.toFixed(2) };
};

/* ───────── Provider ───────── */
export function TradingProvider({ children }) {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE');
  const [ohlcData, setOhlcData] = useState([]);
  const [ltp, setLtp] = useState(0);
  const [prevLtp, setPrevLtp] = useState(0);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [timeframe, setTimeframe] = useState('1Y');
  const ltpRef = useRef(0);

  /* ─── Order Form ─── */
  const [orderSide, setOrderSide] = useState('BUY');
  const [productType, setProductType] = useState('CNC');
  const [orderType, setOrderType] = useState('MARKET');
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(0);
  const [triggerPrice, setTriggerPrice] = useState(0);
  const [targetPrice, setTargetPrice] = useState(0);
  const [stopLossPrice, setStopLossPrice] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);

  /* ─── Wallet ─── */
  const [wallet, setWallet] = useState({ balance: 500000, usedMargin: 45230, blocked: 0 });

  const stock = STOCK_DB[activeSymbol];

  /* ─── Initialize stock data ─── */
  useEffect(() => {
    const data = generateOHLCData(stock.basePrice, 365);
    setOhlcData(data);
    const currentPrice = data[data.length - 1].close;
    setLtp(currentPrice);
    setPrevLtp(currentPrice);
    ltpRef.current = currentPrice;
    setLimitPrice(currentPrice);
    setOrderBook(generateOrderBook(currentPrice));
  }, [activeSymbol]);

  /* ─── Real-time price simulation ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      setLtp(prev => {
        const change = (Math.random() - 0.49) * prev * 0.001;
        const newPrice = +(prev + change).toFixed(2);
        setPrevLtp(prev);
        ltpRef.current = newPrice;
        return newPrice;
      });
      setOrderBook(prev => {
        const p = ltpRef.current;
        return generateOrderBook(p);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  /* ─── Filtered OHLC by timeframe ─── */
  const getFilteredData = useCallback(() => {
    if (!ohlcData.length) return [];
    const now = Date.now();
    const msDay = 86400000;
    const ranges = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, ALL: 9999 };
    const days = ranges[timeframe] || 365;
    const cutoff = now - days * msDay;
    return ohlcData.filter(d => d.timestamp >= cutoff);
  }, [ohlcData, timeframe]);

  /* ─── Price calculations ─── */
  const effectivePrice = orderType === 'MARKET' ? ltp : limitPrice;
  const orderValue = +(quantity * effectivePrice).toFixed(2);
  const charges = calcCharges(quantity, effectivePrice, orderSide, productType);
  const dayChange = +(ltp - stock.priceStats.prevClose).toFixed(2);
  const dayChangePct = +((dayChange / stock.priceStats.prevClose) * 100).toFixed(2);
  const requiredMargin = productType === 'MIS' ? +(orderValue * 0.2).toFixed(2) : orderValue;

  /* ─── Risk/Reward ─── */
  const riskReward = (() => {
    if (!targetPrice || !stopLossPrice) return null;
    const entry = effectivePrice;
    const reward = orderSide === 'BUY' ? targetPrice - entry : entry - targetPrice;
    const risk = orderSide === 'BUY' ? entry - stopLossPrice : stopLossPrice - entry;
    if (risk <= 0) return null;
    return { ratio: +(reward / risk).toFixed(2), potentialProfit: +(reward * quantity).toFixed(2), potentialLoss: +(risk * quantity).toFixed(2) };
  })();

  /* ─── Place Order ─── */
  const placeOrder = useCallback(() => {
    const totalRequired = requiredMargin + charges.total;
    if (totalRequired > wallet.balance - wallet.usedMargin) {
      toast.error('Insufficient funds! Please add more balance.', { icon: '💰' });
      return false;
    }
    if (quantity <= 0) {
      toast.error('Invalid quantity!', { icon: '⚠️' });
      return false;
    }
    const order = {
      id: Date.now(),
      symbol: activeSymbol,
      side: orderSide,
      productType,
      orderType,
      quantity,
      price: effectivePrice,
      orderValue,
      charges: charges.total,
      status: 'EXECUTED',
      time: new Date().toLocaleTimeString(),
    };
    setRecentOrders(prev => [order, ...prev].slice(0, 10));
    setWallet(prev => ({
      ...prev,
      usedMargin: +(prev.usedMargin + (productType === 'MIS' ? requiredMargin : orderValue)).toFixed(2),
      balance: +(prev.balance - charges.total).toFixed(2),
    }));
    setShowConfirmation(false);
    toast.success(`${orderSide} order for ${quantity} ${activeSymbol} placed successfully!`, { icon: orderSide === 'BUY' ? '🟢' : '🔴', duration: 4000 });
    return true;
  }, [activeSymbol, orderSide, productType, orderType, quantity, effectivePrice, orderValue, charges, wallet, requiredMargin]);

  /* ─── Reset Form ─── */
  const resetForm = useCallback(() => {
    setOrderSide('BUY');
    setProductType('CNC');
    setOrderType('MARKET');
    setQuantity(1);
    setLimitPrice(ltp);
    setTriggerPrice(0);
    setTargetPrice(0);
    setStopLossPrice(0);
  }, [ltp]);

  const value = {
    stock, activeSymbol, setActiveSymbol, ohlcData, ltp, prevLtp, orderBook, timeframe, setTimeframe, getFilteredData,
    orderSide, setOrderSide, productType, setProductType, orderType, setOrderType,
    quantity, setQuantity, limitPrice, setLimitPrice, triggerPrice, setTriggerPrice,
    targetPrice, setTargetPrice, stopLossPrice, setStopLossPrice,
    effectivePrice, orderValue, charges, dayChange, dayChangePct, requiredMargin, riskReward,
    wallet, showConfirmation, setShowConfirmation, placeOrder, resetForm, recentOrders,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
};
