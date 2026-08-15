import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowRight, Loader, Activity, Star, Sparkles, BarChart3, Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import './StockAnalyzer.css';

const formatMarketCap = (cap) => {
  if (cap === null || cap === undefined || isNaN(cap)) return 'N/A';
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
};

const StockCard = ({ stock, index }) => (
  <div className="sa-stock-card animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
    {/* Accent gradient strip at top */}
    <div className="sa-card-accent" />

    <div className="sa-card-body">
      <div className="sa-card-top">
        <div className="sa-card-info">
          <h3 className="sa-card-symbol">{stock.symbol || 'N/A'}</h3>
          <p className="sa-card-name">{stock.name || 'Unknown Company'}</p>
          {stock.exchange && (
            <span className="sa-card-exchange">
              {stock.type && <span>{stock.type} · </span>}
              {stock.exchange}
            </span>
          )}
        </div>
        <div className="sa-card-price">
          {stock.price !== null ? (
            <>
              <span className="sa-price">${(stock.price || 0).toFixed(2)}</span>
              <span className={`sa-change ${(stock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(stock.change || 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)
              </span>
            </>
          ) : (
            <span className="sa-price-pending">Live price on click</span>
          )}
        </div>
      </div>

      <div className="sa-card-stats">
        <div className="sa-card-stat">
          <span className="sa-stat-label">Market Cap</span>
          <span className="sa-stat-value">{formatMarketCap(stock.marketCap)}</span>
        </div>
        <div className="sa-card-stat">
          <span className="sa-stat-label">Volume</span>
          <span className="sa-stat-value">{formatMarketCap(stock.volume)}</span>
        </div>
      </div>

      <div className="sa-card-actions" style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <Link to={`/stock/${stock.symbol}`} target="_blank" rel="noopener noreferrer" className="sa-analyze-btn" style={{ margin: 0, flex: 1, padding: '10px 4px', fontSize: '0.82rem' }}>
          <span>Analysis</span>
        </Link>
        <Link to={`/trade/${stock.symbol}`} target="_blank" rel="noopener noreferrer" className="sa-analyze-btn" style={{ margin: 0, flex: 1, padding: '10px 4px', fontSize: '0.82rem', background: 'var(--green)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
          <span>Trade</span>
        </Link>
      </div>
    </div>
  </div>
);


const MarketWidget = ({ title, icon, value, change, isPositive }) => (
  <div className="sa-market-widget">
    <div className="sa-widget-icon-wrap">{icon}</div>
    <div className="sa-widget-info">
      <span className="sa-widget-title">{title}</span>
      <div className="sa-widget-data">
        <span className="sa-widget-value">{value}</span>
        <span className={`sa-widget-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{change}
        </span>
      </div>
    </div>
  </div>
);

const StockAnalyzer = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketPulse, setMarketPulse] = useState(null);
  const { addNotification } = useNotification();

  // Fetch market pulse data on mount
  useEffect(() => {
    const fetchMarketPulse = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/stocks/market-pulse');
        setMarketPulse(res.data);
      } catch (err) {
        console.warn('Failed to fetch market pulse:', err.message);
      }
    };
    fetchMarketPulse();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMarketPulse, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setLoading(true);
    setError(null);
    try {
      const searchRes = await axios.get(`http://localhost:3001/api/stocks/search?q=${query}`);
      const basicResults = searchRes.data.slice(0, 6);

      if (basicResults.length === 0) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      addNotification('Market Search', `Found ${basicResults.length} results for "${query}"`, 'info');

      // Use enriched data from backend — prices are now included in search results
      const results = basicResults.map(item => ({
        symbol: item.symbol,
        name: item.description || item.name || item.symbol,
        type: item.type,
        exchange: item.exchange,
        price: item.price ?? null,
        change: item.change || 0,
        changePercent: item.changePercent || 0,
        marketCap: item.marketCap || null,
        volume: item.volume || null,
      }));

      setSearchResults(results);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setError(`⏳ Search unavailable — API rate limit reached (5 req/min). Please wait a moment.`);
      } else {
        setError(`❌ Failed to search stocks. Try again later.`);
      }
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-page">
      {/* Ambient decorative elements */}
      <div className="sa-bg-orb sa-orb-1"></div>
      <div className="sa-bg-orb sa-orb-2"></div>

      <div className="sa-container">
        
        {/* === HERO BENTO GRID === */}
        <div className="sa-bento-grid">
          
          {/* Main Search Area */}
          <div className="sa-bento-main">
            <div className="sa-hero-badge">
              <Sparkles size={14} />
              <span>Global Stock Screener</span>
            </div>
            <h1 className="sa-hero-title">
              Find & Analyze<br />
              <span className="sa-hero-gradient">Any Stock Worldwide</span>
            </h1>
            <p className="sa-hero-subtitle">Search across NASDAQ, NYSE, NSE, BSE and more global exchanges instantly.</p>
            
            <div className="sa-search-wrapper">
              <div className="sa-search-icon"><Search size={20} /></div>
              <input
                type="text"
                placeholder="Search by name or symbol... (e.g. TSLA, RELIANCE.NS)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sa-search-input"
              />
              {loading && <Loader className="sa-search-loader animate-spin" size={20} />}
            </div>
          </div>

          {/* Market Pulse Sidebar */}
          <div className="sa-bento-sidebar">
            <div className="sa-sidebar-header">
              <Activity size={18} />
              <h3>Market Pulse</h3>
            </div>
            <div className="sa-widgets-list">
              {marketPulse ? marketPulse.indices.map((idx) => (
                <MarketWidget
                  key={idx.symbol}
                  title={idx.name}
                  icon={idx.isPositive ? <TrendingUp size={18} className="positive" /> : <TrendingDown size={18} className="negative" />}
                  value={idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  change={`${idx.changePercent >= 0 ? '+' : ''}${idx.changePercent.toFixed(1)}%`}
                  isPositive={idx.isPositive}
                />
              )) : (
                <>
                  <div className="sa-market-widget sa-shimmer"></div>
                  <div className="sa-market-widget sa-shimmer"></div>
                  <div className="sa-market-widget sa-shimmer"></div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Quick Stats */}
          <div className="sa-bento-bottom">
            <div className="sa-quick-stat">
              <div className="sa-quick-icon"><Star size={18} /></div>
              <div className="sa-quick-info">
                <span className="sa-quick-label">Top Gainer Today</span>
                <span className="sa-quick-value positive">
                  {marketPulse ? `${marketPulse.topGainer.symbol} ${marketPulse.topGainer.change}` : '...'}
                </span>
              </div>
            </div>
            <div className="sa-quick-divider"></div>
            <div className="sa-quick-stat">
              <div className="sa-quick-icon sa-quick-icon-blue"><Globe2 size={18} /></div>
              <div className="sa-quick-info">
                <span className="sa-quick-label">Market Status</span>
                <span className="sa-quick-value">{marketPulse ? marketPulse.marketStatus : '...'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* === RESULTS SECTION === */}
        <div className="sa-results-section">
          {searchQuery.trim() && (
            <h2 className="sa-results-title">
              <BarChart3 size={20} />
              <span>Search Results</span>
              {searchResults.length > 0 && <span className="sa-results-count">{searchResults.length}</span>}
            </h2>
          )}
          
          {error && <div className="sa-error-message">{error}</div>}
          
          {!loading && searchQuery.trim() && searchResults.length === 0 && !error && (
             <div className="sa-no-results">
               <Search size={40} />
               <p>No stocks found matching "{searchQuery}"</p>
               <span>Try adding exchange codes like .NS for NSE</span>
             </div>
          )}

          <div className="sa-stocks-grid">
            {searchResults.map((stock, index) => (
              <StockCard key={stock.symbol} stock={stock} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalyzer;