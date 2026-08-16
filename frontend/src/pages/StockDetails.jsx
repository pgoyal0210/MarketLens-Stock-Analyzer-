import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Activity, Calendar, Hash, PieChart, Bell, BellOff, Wifi, WifiOff, DollarSign, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useNotification } from '../contexts/NotificationContext';
import { formatCompactCurrency, formatCurrencyValue, getCurrencyCode } from '../utils/currency';
import './StockDetails.css';

const formatLargeNumber = (num, symbol = '', exchange = '') => {
  if (num === null || num === undefined) return 'N/A';
  return formatCompactCurrency(num, symbol, exchange);
};

const CustomTooltip = ({ active, payload, label, symbol = '', exchange = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-custom-tooltip">
        <p className="tooltip-date">{label}</p>
        <p className="tooltip-price">{formatCurrencyValue(payload[0].value, symbol, exchange)}</p>
      </div>
    );
  }
  return null;
};

const StockDetails = () => {
  const { symbol } = useParams();
  const { addNotification } = useNotification();

  const [stockData, setStockData] = useState(null);
  const [stockNews, setStockNews] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isSubscribedToAlerts, setIsSubscribedToAlerts] = useState(() => {
    const userId = localStorage.getItem('userId') || 'guest';
    const saved = localStorage.getItem(`stockpulse-subscriptions-${userId}`);
    if (saved) {
      try {
        const subs = JSON.parse(saved);
        return subs.includes(symbol?.toUpperCase());
      } catch (e) {}
    }
    return false;
  });
  const socketRef = useRef(null);

  const [chartError, setChartError] = useState(null);
  const [newsError, setNewsError] = useState(null);

  // Initial HTTP fetch for quote + news + history (all independent, so one failing won't block others)
  const fetchInitialData = async () => {
    setLoading(true);

    // 1. Quote (critical — if this fails, show error page)
    try {
      const quoteRes = await axios.get(`${API_BASE_URL}/api/stocks/quote/${symbol}`);
      setStockData(quoteRes.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch stock quote:", err);
      setError(`Could not load data for symbol "${symbol}". Symbol might not exist or API limit reached.`);
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }

    // 2. News (non-critical)
    try {
      const newsRes = await axios.get(`${API_BASE_URL}/api/stocks/news/${symbol}`);
      setStockNews(newsRes.data);
      setNewsError(null);
    } catch (err) {
      const isRateLimit = err.response?.status === 429;
      setNewsError(isRateLimit ? '⏳ News unavailable — API rate limit reached. Wait a minute and refresh.' : 'Could not load news.');
      setStockNews([]);
    }

    // 3. Chart history (non-critical)
    try {
      const historyRes = await axios.get(`${API_BASE_URL}/api/stocks/history/${symbol}`);
      setStockHistory(historyRes.data);
      setChartError(null);
    } catch (err) {
      const isRateLimit = err.response?.status === 429;
      setChartError(isRateLimit ? '⏳ Chart unavailable — API rate limit reached (5 req/min). Wait a moment and refresh.' : 'Failed to load chart data.');
      setStockHistory([]);
    }
  };

  // WebSocket connection for live price updates
  useEffect(() => {
    if (!symbol) return;

    fetchInitialData();

    // Connect to socket.io
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setWsConnected(true);
      socket.emit('subscribe', symbol.toUpperCase());
    });

    socket.on('priceUpdate', (data) => {
      console.log(`[WebSocket] Live Update for ${data.symbol}: $${data.price}`);
      setIsUpdating(true);
      setStockData((prev) => {
        // Trigger notification if subscribed and price changed
        if (isSubscribedToAlerts && prev && prev.price !== data.price) {
            // Check if we already notified recently to prevent spam
            const lastNotifKey = `lastNotif_${symbol}`;
            const lastNotifTime = sessionStorage.getItem(lastNotifKey);
            if (!lastNotifTime || Date.now() - parseInt(lastNotifTime) > 60000) { // Max 1 per minute per stock
                addNotification(`Price Alert: ${data.symbol}`, `The price is now $${data.price.toFixed(2)}`, 'info');
                sessionStorage.setItem(lastNotifKey, Date.now().toString());
                
                if (Notification.permission === 'granted') {
                    new Notification(`Price Alert: ${data.symbol}`, {
                        body: `The price is now $${data.price.toFixed(2)}`,
                    });
                }
            }
        }
        return { ...prev, ...data };
      });
      setTimeout(() => setIsUpdating(false), 500);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setWsConnected(false);
    });

    return () => {
      socket.emit('unsubscribe', symbol.toUpperCase());
      socket.disconnect();
      socketRef.current = null;
    };
  }, [symbol]);

  const handleSubscribeAlerts = async () => {
      const newStatus = !isSubscribedToAlerts;
      setIsSubscribedToAlerts(newStatus);
      
      const userId = localStorage.getItem('userId') || 'guest';
      const key = `stockpulse-subscriptions-${userId}`;
      let subs = [];
      try {
          const saved = localStorage.getItem(key);
          if (saved) subs = JSON.parse(saved);
      } catch (e) {}

      if (newStatus) {
          if (!subs.includes(symbol.toUpperCase())) subs.push(symbol.toUpperCase());
          if ('Notification' in window) {
              try {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                      new Notification('Subscribed!', {
                          body: `You will now receive alerts for ${symbol} price updates.`,
                      });
                  }
              } catch (err) {
                  console.log('Notification error:', err);
              }
          }
      } else {
          subs = subs.filter(s => s !== symbol.toUpperCase());
      }
      localStorage.setItem(key, JSON.stringify(subs));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'news', label: 'Company News', icon: <Activity size={16} /> },
  ];

  const currencyCode = getCurrencyCode(symbol, stockData?.exchange);
  const isPositive = (stockData?.change || 0) >= 0;

  const statItems = stockData ? [
    { label: 'Market Cap', value: formatLargeNumber(stockData.marketCap, stockData.symbol, stockData.exchange), icon: <PieChart size={16} />, gradient: 'stat-gradient-1' },
    { label: 'Volume', value: formatLargeNumber(stockData.volume, stockData.symbol, stockData.exchange), icon: <Hash size={16} />, gradient: 'stat-gradient-2' },
    { label: 'Day High', value: formatCurrencyValue(stockData.high || 0, stockData.symbol, stockData.exchange), icon: <ArrowUpRight size={16} />, gradient: 'stat-gradient-3' },
    { label: 'Day Low', value: formatCurrencyValue(stockData.low || 0, stockData.symbol, stockData.exchange), icon: <ArrowDownRight size={16} />, gradient: 'stat-gradient-4' },
    { label: 'Open', value: formatCurrencyValue(stockData.open || 0, stockData.symbol, stockData.exchange), icon: <DollarSign size={16} />, gradient: 'stat-gradient-5' },
    { label: 'Previous Close', value: formatCurrencyValue(stockData.previousClose || 0, stockData.symbol, stockData.exchange), icon: <Calendar size={16} />, gradient: 'stat-gradient-6' },
    { label: 'Change', value: formatCurrencyValue(stockData.change || 0, stockData.symbol, stockData.exchange), icon: isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />, gradient: 'stat-gradient-7' },
    { label: 'Shares Outstanding', value: formatLargeNumber(stockData.sharesOutstanding, stockData.symbol, stockData.exchange), icon: <Layers size={16} />, gradient: 'stat-gradient-8' },
  ] : [];
  
  if (loading) return (
    <div className="sd-loading-screen">
      <div className="sd-loading-spinner"></div>
      <p>Fetching data for <strong>{symbol}</strong></p>
    </div>
  );

  if (error) {
    return (
      <div className="sd-error-page">
        <div className="sd-error-card">
          <div className="sd-error-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <Link to="/analyzer" className="sd-error-back-btn">
            <ArrowLeft size={18} /> Back to Search
          </Link>
        </div>
      </div>
    );
  }
  if (!stockData) return <div className="sd-error-page"><p>Stock data not found.</p></div>;

  return (
    <div className="sd-page">
      {/* Background ambient glow */}
      <div className={`sd-ambient-glow ${isPositive ? 'glow-green' : 'glow-red'}`}></div>

      <div className="sd-container">
        
        {/* === TOP BAR === */}
        <div className="sd-topbar">
          <Link to="/analyzer" className="sd-back-link">
            <ArrowLeft size={18} />
            <span>Search</span>
          </Link>
          <div className="sd-topbar-right">
            <div className={`sd-connection-badge ${wsConnected ? 'connected' : 'disconnected'}`}>
              {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isUpdating ? 'Updating' : wsConnected ? 'Live' : 'Offline'}</span>
              <span className={`sd-pulse-dot ${isUpdating ? 'updating' : wsConnected ? 'live' : 'offline'}`}></span>
            </div>
            <button 
              className={`sd-subscribe-btn ${isSubscribedToAlerts ? 'subscribed' : ''}`}
              onClick={handleSubscribeAlerts}
            >
              {isSubscribedToAlerts ? <BellOff size={16} /> : <Bell size={16} />}
              <span>{isSubscribedToAlerts ? 'Subscribed' : 'Subscribe'}</span>
            </button>
            <Link 
              to={`/trade/${symbol}`}
              className="sd-subscribe-btn"
              style={{ 
                borderColor: 'var(--green)', 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: 'var(--green)', 
                textDecoration: 'none' 
              }}
            >
              <TrendingUp size={16} />
              <span>Trade Terminal</span>
            </Link>
          </div>
        </div>

        {/* === HERO HEADER === */}
        <div className="sd-hero">
          <div className="sd-hero-left">
            <div className="sd-symbol-badge">{stockData.symbol}</div>
            <h1 className="sd-company-name">{stockData.name}</h1>
            {stockData.rateLimited && (
              <div className="sd-rate-limit-warning">
                ⚠️ Live price unavailable — API rate limit reached. Data will refresh automatically.
              </div>
            )}
          </div>
          <div className="sd-hero-right">
            <div className={`sd-price-display ${isUpdating ? 'pulse-update' : ''}`}>
              <span className="sd-price-dollar">$</span>
              <span className="sd-price-value">{(stockData.price || 0).toFixed(2)}</span>
            </div>
            <div className={`sd-price-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <span className="sd-change-amount">
                {isPositive ? '+' : ''}{(stockData.change || 0).toFixed(2)}
              </span>
              <span className="sd-change-percent">
                ({(stockData.changePercent || 0).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* === TAB NAVIGATION === */}
        <div className="sd-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sd-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {activeTab === tab.id && <div className="sd-tab-indicator"></div>}
            </button>
          ))}
        </div>

        {/* === CONTENT === */}
        <div className="sd-content">
          {activeTab === 'overview' && (
            <div className="sd-overview">
              
              {/* Chart */}
              <div className="sd-chart-card">
                <div className="sd-chart-header">
                  <h3><BarChart3 size={18} /> Price History</h3>
                  <span className="sd-chart-label">100 Days</span>
                </div>
                {stockHistory && stockHistory.length > 0 ? (
                  <div className="sd-chart-body">
                    <ResponsiveContainer width="100%" height={340}>
                      <AreaChart data={stockHistory}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.25}/>
                            <stop offset="100%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.15)"
                          tick={{fontSize: 11, fill: 'var(--text-3)'}}
                          tickFormatter={(val) => val.split('-').slice(1).join('/')}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          stroke="rgba(255,255,255,0.15)"
                          tick={{fontSize: 11, fill: 'var(--text-3)'}}
                          tickFormatter={(val) => `${currencyCode === 'INR' ? '₹' : '$'}${val}`}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={isPositive ? '#10B981' : '#EF4444'} 
                          strokeWidth={2} 
                          fill="url(#priceGradient)"
                          dot={false} 
                          activeDot={{ r: 5, fill: isPositive ? '#10B981' : '#EF4444', stroke: '#fff', strokeWidth: 2 }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="sd-chart-empty">
                    <BarChart3 size={40} />
                    <p>{chartError || 'No historical data available for this symbol.'}</p>
                  </div>
                )}
              </div>

              {/* Key Statistics */}
              <div className="sd-stats-section">
                <h3 className="sd-section-title">Key Statistics</h3>
                <div className="sd-stats-grid">
                  {statItems.map((stat, idx) => (
                    <div key={idx} className={`sd-stat-card ${stat.gradient}`}>
                      <div className="sd-stat-icon">{stat.icon}</div>
                      <div className="sd-stat-info">
                        <span className="sd-stat-label">{stat.label}</span>
                        <span className="sd-stat-value">{stat.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="sd-news">
              <h3 className="sd-section-title">Latest Company News</h3>
              {newsError ? (
                <div className="sd-empty-state">
                  <p>{newsError}</p>
                </div>
              ) : stockNews && stockNews.length > 0 ? (
                <div className="sd-news-grid">
                  {stockNews.map((article, index) => {
                    const isBullish = article.overall_sentiment_label === 'Bullish' || article.overall_sentiment_label === 'Somewhat-Bullish';
                    const isBearish = article.overall_sentiment_label === 'Bearish' || article.overall_sentiment_label === 'Somewhat-Bearish';
                    return (
                      <a key={index} href={article.url} target="_blank" rel="noopener noreferrer" className="sd-news-card">
                        <div className="sd-news-card-header">
                          <div className="sd-news-meta">
                            <span className="sd-news-source">{article.source}</span>
                            <span className="sd-news-date">
                              {article.datetime ? new Date(article.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                            </span>
                          </div>
                          {article.overall_sentiment_label && (
                            <span className={`sd-sentiment-chip ${isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral'}`}>
                              {article.overall_sentiment_label}
                            </span>
                          )}
                        </div>
                        <h4 className="sd-news-headline">{article.headline}</h4>
                        <p className="sd-news-summary">{article.summary}</p>
                        <span className="sd-news-cta">Read full article →</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="sd-empty-state">
                  <Activity size={40} />
                  <p>No recent news available for {stockData.symbol}.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockDetails;