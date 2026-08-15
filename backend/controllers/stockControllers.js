import axios from 'axios';
import dotenv from 'dotenv';
import yahooFinancePkg from 'yahoo-finance2';
const yahooFinance = typeof yahooFinancePkg === 'function' ? new yahooFinancePkg() : yahooFinancePkg;

// Suppress validation errors that break search with older package versions
try {
  yahooFinance.setGlobalConfig({
    validation: { logErrors: false },
  });
} catch (e) {
  // setGlobalConfig may not exist on all versions, ignore
  if (yahooFinance._opts) {
    yahooFinance._opts.validation = { logErrors: false };
  }
}

dotenv.config();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'demo';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// ─── API timeout configuration ──────────────────────────────────────
const API_TIMEOUT_MS = 5000; // 5 seconds timeout for external API calls

// Create axios instance with default timeout
const axiosWithTimeout = axios.create({
  timeout: API_TIMEOUT_MS
});

// ─── In-memory cache ────────────────────────────────────────────────
const cache = {
    search:  {},
    quote:   {},
    news:    {},
    history: {},
    marketPulse: null,
};
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const MARKET_PULSE_CACHE_DURATION = 5 * 60 * 1000; // 5

export const clearCache = (_req, res) => {
    cache.search  = {};
    cache.quote   = {};
    cache.news    = {};
    cache.history = {};
    console.log('🗑️  Cache cleared');
    res.status(200).json({ message: 'Cache cleared successfully' });
};

const isCacheValid = (entry) =>
    entry && Date.now() - entry.timestamp < CACHE_DURATION;

const isIndianStock = (symbol) => {
    if (!symbol) return false;
    const s = symbol.toUpperCase();
    return s.endsWith('.NS') || s.endsWith('.BO');
};

// ─── Fallback stock list (used when API is rate-limited) ─────────────
const FALLBACK_STOCKS = [
    // US
    { symbol: 'AAPL',         description: 'Apple Inc.',                       type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'MSFT',         description: 'Microsoft Corporation',            type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'GOOGL',        description: 'Alphabet Inc.',                    type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'AMZN',         description: 'Amazon.com, Inc.',                 type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'TSLA',         description: 'Tesla, Inc.',                      type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'META',         description: 'Meta Platforms, Inc.',             type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'NVDA',         description: 'NVIDIA Corporation',               type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'NFLX',         description: 'Netflix, Inc.',                    type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'AMD',          description: 'Advanced Micro Devices, Inc.',     type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'INTC',         description: 'Intel Corporation',                type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'ORCL',         description: 'Oracle Corporation',               type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'IBM',          description: 'International Business Machines',  type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'BABA',         description: 'Alibaba Group Holding Ltd.',       type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'JPM',          description: 'JPMorgan Chase & Co.',             type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'GS',           description: 'The Goldman Sachs Group, Inc.',    type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'BAC',          description: 'Bank of America Corporation',      type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'V',            description: 'Visa Inc.',                        type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'MA',           description: 'Mastercard Incorporated',          type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'DIS',          description: 'The Walt Disney Company',          type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'WMT',          description: 'Walmart Inc.',                     type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'KO',           description: 'The Coca-Cola Company',            type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'PEP',          description: 'PepsiCo, Inc.',                    type: 'Equity', exchange: 'NASDAQ' },
    { symbol: 'NKE',          description: 'Nike, Inc.',                       type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'UBER',         description: 'Uber Technologies, Inc.',          type: 'Equity', exchange: 'NYSE'   },
    { symbol: 'SPOT',         description: 'Spotify Technology S.A.',          type: 'Equity', exchange: 'NYSE'   },
    // NSE India
    { symbol: 'RELIANCE.NS',  description: 'Reliance Industries Limited',      type: 'Equity', exchange: 'NSE'    },
    { symbol: 'TCS.NS',       description: 'Tata Consultancy Services Ltd.',   type: 'Equity', exchange: 'NSE'    },
    { symbol: 'INFY.NS',      description: 'Infosys Limited',                  type: 'Equity', exchange: 'NSE'    },
    { symbol: 'HDFCBANK.NS',  description: 'HDFC Bank Limited',                type: 'Equity', exchange: 'NSE'    },
    { symbol: 'WIPRO.NS',     description: 'Wipro Limited',                    type: 'Equity', exchange: 'NSE'    },
    { symbol: 'ICICIBANK.NS', description: 'ICICI Bank Limited',               type: 'Equity', exchange: 'NSE'    },
    { symbol: 'BAJFINANCE.NS',description:'Bajaj Finance Limited',             type: 'Equity', exchange: 'NSE'    },
    { symbol: 'HINDUNILVR.NS',description:'Hindustan Unilever Limited',        type: 'Equity', exchange: 'NSE'    },
    { symbol: 'TATAMOTORS.NS',description:'Tata Motors Limited',               type: 'Equity', exchange: 'NSE'    },
    { symbol: 'ADANIENT.NS',  description: 'Adani Enterprises Limited',        type: 'Equity', exchange: 'NSE'    },
    { symbol: 'SBIN.NS',      description: 'State Bank of India',              type: 'Equity', exchange: 'NSE'    },
    { symbol: 'MARUTI.NS',    description: 'Maruti Suzuki India Limited',      type: 'Equity', exchange: 'NSE'    },
    { symbol: 'LTIM.NS',      description: 'LTIMindtree Limited',              type: 'Equity', exchange: 'NSE'    },
    { symbol: 'HCLTECH.NS',   description: 'HCL Technologies Limited',         type: 'Equity', exchange: 'NSE'    },
    { symbol: 'SUNPHARMA.NS', description: 'Sun Pharmaceutical Industries',    type: 'Equity', exchange: 'NSE'    },
    { symbol: 'BHARTIARTL.NS',description:'Bharti Airtel Limited',             type: 'Equity', exchange: 'NSE'    },
    { symbol: 'ONGC.NS',      description: 'Oil and Natural Gas Corporation',  type: 'Equity', exchange: 'NSE'    },
    { symbol: 'TITAN.NS',     description: 'Titan Company Limited',            type: 'Equity', exchange: 'NSE'    },
    { symbol: 'NESTLEIND.NS', description: 'Nestle India Limited',             type: 'Equity', exchange: 'NSE'    },
    { symbol: 'DMART.NS',     description: 'Avenue Supermarts Limited',        type: 'Equity', exchange: 'NSE'    },
];

// ─── Mock stock data for fallback when APIs are unavailable ──────────
const MOCK_QUOTES = {
    'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 185.50, change: 2.50, changePercent: 1.37, high: 187.30, low: 183.10, open: 184.20, previousClose: 183.00, volume: 42150000, marketCap: 2900000000000, sharesOutstanding: 15631000000 },
    'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', price: 420.75, change: 5.25, changePercent: 1.26, high: 423.50, low: 417.80, open: 419.30, previousClose: 415.50, volume: 18920000, marketCap: 3140000000000, sharesOutstanding: 7470000000 },
    'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 180.45, change: 3.20, changePercent: 1.81, high: 182.80, low: 178.90, open: 179.10, previousClose: 177.25, volume: 22100000, marketCap: 1800000000000, sharesOutstanding: 9970000000 },
    'TSLA': { symbol: 'TSLA', name: 'Tesla, Inc.', price: 243.80, change: -2.10, changePercent: -0.86, high: 247.50, low: 241.90, open: 245.20, previousClose: 245.90, volume: 125900000, marketCap: 770000000000, sharesOutstanding: 3160000000 },
    'RELIANCE.NS': { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', price: 2850.45, change: 45.60, changePercent: 1.62, high: 2870.30, low: 2820.15, open: 2840.50, previousClose: 2804.85, volume: 18550000, marketCap: 1900000000000, sharesOutstanding: 666400000 },
    'TCS.NS': { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', price: 3680.25, change: 38.75, changePercent: 1.07, high: 3705.50, low: 3650.80, open: 3672.40, previousClose: 3641.50, volume: 3280000, marketCap: 900000000000, sharesOutstanding: 244600000 },
    'INFY.NS': { symbol: 'INFY.NS', name: 'Infosys Limited', price: 1540.80, change: 12.50, changePercent: 0.82, high: 1560.30, low: 1525.10, open: 1538.60, previousClose: 1528.30, volume: 5640000, marketCap: 670000000000, sharesOutstanding: 435200000 },
};

// Generate mock data for any stock not in the predefined list
const generateMockQuote = (symbol) => {
    const basePrice = Math.random() * 400 + 50;
    const changePercent = (Math.random() - 0.5) * 4;
    const change = (basePrice * changePercent) / 100;
    
    return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        price: parseFloat(basePrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high: parseFloat((basePrice + Math.abs(change) * 1.5).toFixed(2)),
        low: parseFloat((basePrice - Math.abs(change) * 1.5).toFixed(2)),
        open: parseFloat((basePrice - change * 0.5).toFixed(2)),
        previousClose: parseFloat((basePrice - change).toFixed(2)),
        volume: Math.floor(Math.random() * 50000000) + 1000000,
        marketCap: null,
        sharesOutstanding: null,
        isOfflineData: true,
        message: '📡 Data provided in offline mode (Live APIs unavailable)'
    };
};

// Helper: detect Finnhub rate-limit
const isFinnhubRateLimit = (err) => err?.response?.status === 429;

// ─── 1. Search stocks ────────────────────────────────────────────────
export const searchStocks = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query parameter q is required' });

    const qLower = q.toLowerCase();

    if (isCacheValid(cache.search[qLower])) {
        return res.status(200).json(cache.search[qLower].data);
    }

    try {
        let results = [];
        
        // Search Finnhub
        try {
            const fhRes = await axios.get(`${FINNHUB_BASE}/search`, {
                params: { q, token: FINNHUB_KEY }
            });
            if (fhRes.data && fhRes.data.result) {
                results = fhRes.data.result.slice(0, 10).map(m => ({
                    symbol: m.symbol,
                    description: m.description,
                    type: m.type,
                    exchange: 'Unknown'
                }));
            }
        } catch (err) {
            if (isFinnhubRateLimit(err)) {
                console.warn(`⚠️ Finnhub rate limit hit during search for "${q}"`);
            } else {
                console.error('Finnhub search error:', err.message);
            }
        }

        // Search Yahoo Finance for all stock types with validation suppressed
        try {
            const yfRes = await yahooFinance.search(q, {}, { validateResult: false });
            if (yfRes && yfRes.quotes) {
                const yfResults = yfRes.quotes
                    .filter(qt => qt.symbol && (qt.quoteType === 'EQUITY' || qt.quoteType === 'ETF'))
                    .slice(0, 8)
                    .map(m => ({
                        symbol: m.symbol,
                        description: m.shortname || m.longname || m.symbol,
                        type: m.quoteType,
                        exchange: m.exchDisp || m.exchange
                    }));
                    
                // Merge without duplicates
                for (const yr of yfResults) {
                    if (!results.find(r => r.symbol === yr.symbol)) {
                        results.push(yr);
                    }
                }
            }
        } catch (err) {
             console.error('Yahoo Finance search error:', err.message);
        }

        if (results.length === 0) {
            const filtered = FALLBACK_STOCKS.filter(s =>
                s.symbol.toLowerCase().includes(qLower) ||
                s.description.toLowerCase().includes(qLower)
            );
            // Even for fallback, try to enrich with live data
            const enrichedFallback = await enrichResultsWithQuotes(filtered.slice(0, 8));
            return res.status(200).json(enrichedFallback);
        }

        // Enrich search results with live price data from Yahoo Finance
        const enrichedResults = await enrichResultsWithQuotes(results);

        cache.search[qLower] = { data: enrichedResults, timestamp: Date.now() };
        res.status(200).json(enrichedResults);
    } catch (err) {
        console.error('Overall Search error:', err.message);
        const filtered = FALLBACK_STOCKS.filter(s =>
            s.symbol.toLowerCase().includes(qLower) ||
            s.description.toLowerCase().includes(qLower)
        );
        const enrichedFallback = await enrichResultsWithQuotes(filtered.slice(0, 8));
        res.status(200).json(enrichedFallback);
    }
};

// ─── 2. Get current stock quote ──────────────────────────────────────
export const getStockQuote = async (req, res) => {
    const { symbol } = req.params;
    const symLower = symbol.toLowerCase();

    if (isCacheValid(cache.quote[symLower])) {
        return res.status(200).json(cache.quote[symLower].data);
    }

    try {
        let data;
        
        // Try Yahoo Finance first
        try {
            const q = await yahooFinance.quote(symbol, {}, { validateResult: false });
            if (q && q.regularMarketPrice !== undefined) {
                data = {
                    symbol: q.symbol,
                    name: q.shortName || q.longName || q.symbol,
                    price: q.regularMarketPrice || 0,
                    change: q.regularMarketChange || 0,
                    changePercent: q.regularMarketChangePercent || 0,
                    high: q.regularMarketDayHigh || 0,
                    low: q.regularMarketDayLow || 0,
                    open: q.regularMarketOpen || 0,
                    previousClose: q.regularMarketPreviousClose || 0,
                    volume: q.regularMarketVolume || 0,
                    marketCap: q.marketCap || null,
                    sharesOutstanding: q.sharesOutstanding || null,
                };
            }
        } catch (err) {
            console.warn(`Yahoo Finance quote failed for ${symbol}, trying Finnhub fallback:`, err.message);
        }

        // Fallback to Finnhub if Yahoo Finance fails or returns no price data
        if (!data) {
            // Finnhub
            const response = await axios.get(`${FINNHUB_BASE}/quote`, {
                params: { symbol, token: FINNHUB_KEY }
            });
            const q = response.data;
            
            if (!q || (q.c === 0 && q.pc === 0)) {
                return res.status(404).json({ message: `No data found for symbol "${symbol}"` });
            }
            
            let profile = {};
            try {
                const profileRes = await axios.get(`${FINNHUB_BASE}/stock/profile2`, {
                    params: { symbol, token: FINNHUB_KEY }
                });
                profile = profileRes.data || {};
            } catch (err) {
                // Ignore profile error
            }
            
            data = {
                symbol: symbol.toUpperCase(),
                name: profile.name || symbol.toUpperCase(),
                price: q.c || 0,
                change: q.d || 0,
                changePercent: q.dp || 0,
                high: q.h || 0,
                low: q.l || 0,
                open: q.o || 0,
                previousClose: q.pc || 0,
                volume: 0, // Finnhub quote does not provide volume
                marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null,
                sharesOutstanding: profile.shareOutstanding ? profile.shareOutstanding * 1000000 : null,
            };
        }

        cache.quote[symLower] = { data, timestamp: Date.now() };
        res.status(200).json(data);
    } catch (err) {
        if (isFinnhubRateLimit(err)) {
             console.warn(`⚠️ Finnhub rate limit hit for quote of ${symbol}`);
             return res.status(429).json({ message: 'API rate limit reached. Please wait and try again.' });
        }
        
        console.error(`Quote error for ${symbol}:`, err.message);
        
        // Fallback to mock data when APIs are unavailable
        console.warn(`⚠️ APIs unavailable, returning offline mock data for ${symbol}`);
        const mockData = MOCK_QUOTES[symbol.toUpperCase()] || generateMockQuote(symbol);
        cache.quote[symLower] = { data: mockData, timestamp: Date.now() };
        
        // Return 200 with offline data instead of 500
        res.status(200).json(mockData);
    }
};

// ─── 3. Get recent news ──────────────────────────────────────────────
export const getStockNews = async (req, res) => {
    const { symbol } = req.params;
    const symLower = symbol.toLowerCase();

    if (isCacheValid(cache.news[symLower])) {
        return res.status(200).json(cache.news[symLower].data);
    }

    try {
        let articles = [];
        
        // Try Yahoo Finance first
        try {
            const yfRes = await yahooFinance.search(symbol, {}, { validateResult: false });
            if (yfRes && yfRes.news && yfRes.news.length > 0) {
                articles = yfRes.news.slice(0, 5).map(article => ({
                    headline: article.title,
                    source: article.publisher || 'Yahoo Finance',
                    summary: article.title, // YF search doesn't return full summary
                    url: article.link,
                    banner_image: article.thumbnail?.resolutions?.[0]?.url || null,
                    datetime: article.providerPublishTime ? article.providerPublishTime * 1000 : Date.now(),
                }));
            }
        } catch (err) {
            console.warn(`Yahoo Finance news failed for ${symbol}, trying Finnhub fallback:`, err.message);
        }

        // Fallback to Finnhub if Yahoo Finance returned no news articles
        if (articles.length === 0) {
            // Finnhub
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 7);
            
            const toStr = toDate.toISOString().split('T')[0];
            const fromStr = fromDate.toISOString().split('T')[0];
            
            const response = await axios.get(`${FINNHUB_BASE}/company-news`, {
                params: { symbol, from: fromStr, to: toStr, token: FINNHUB_KEY }
            });
            
            const feed = response.data || [];
            articles = feed.slice(0, 5).map(article => ({
                headline: article.headline,
                source: article.source,
                summary: article.summary,
                url: article.url,
                banner_image: article.image || null,
                datetime: article.datetime ? article.datetime * 1000 : Date.now(),
            }));
        }

        cache.news[symLower] = { data: articles, timestamp: Date.now() };
        res.status(200).json(articles);
    } catch (err) {
        if (isFinnhubRateLimit(err)) {
             console.warn(`⚠️ Finnhub rate limit hit for news of ${symbol}`);
             return res.status(429).json({ message: 'API rate limit reached. Please wait and try again.' });
        }
        
        console.error(`News error for ${symbol}:`, err.message);
        
        // Return empty articles array as fallback (offline mode)
        const fallbackNews = [
            {
                headline: 'Market Update: Live data unavailable',
                source: 'System',
                summary: 'News services are currently unavailable. Please check back later.',
                url: '#',
                banner_image: null,
                datetime: Date.now(),
                isOfflineData: true
            }
        ];
        
        cache.news[symLower] = { data: fallbackNews, timestamp: Date.now() };
        res.status(200).json(fallbackNews);
    }
};

// ─── 4. Get historical price data for charts ─────────────────────────
export const getStockHistory = async (req, res) => {
    const { symbol } = req.params;
    const symLower = symbol.toLowerCase();

    if (isCacheValid(cache.history[symLower])) {
        return res.status(200).json(cache.history[symLower].data);
    }

    try {
        let dataPoints = [];
        
        // Try Yahoo Finance first
        try {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 100);
            
            const history = await yahooFinance.historical(symbol, {
                period1: fromDate,
                period2: toDate,
                interval: '1d'
            }, { validateResult: false });
            
            if (history && history.length > 0) {
                dataPoints = history.map(v => ({
                    date: v.date.toISOString().split('T')[0],
                    price: v.close,
                    open: v.open,
                    high: v.high,
                    low: v.low,
                    volume: v.volume || 0,
                }));
            }
        } catch (err) {
            console.warn(`Yahoo Finance history failed for ${symbol}, trying Finnhub fallback:`, err.message);
        }

        // Fallback to Finnhub if Yahoo Finance history returned nothing or failed
        if (dataPoints.length === 0) {
            // Finnhub
            const toTime = Math.floor(Date.now() / 1000);
            const fromTime = toTime - (100 * 24 * 60 * 60); // 100 days
            
            const response = await axios.get(`${FINNHUB_BASE}/stock/candle`, {
                params: { symbol, resolution: 'D', from: fromTime, to: toTime, token: FINNHUB_KEY }
            });
            
            const data = response.data;
            if (data.s === 'ok') {
                for (let i = 0; i < data.t.length; i++) {
                    const dateObj = new Date(data.t[i] * 1000);
                    dataPoints.push({
                        date: dateObj.toISOString().split('T')[0],
                        price: data.c[i],
                        open: data.o[i],
                        high: data.h[i],
                        low: data.l[i],
                        volume: data.v[i],
                    });
                }
            } else if (data.s === 'no_data') {
                return res.status(404).json({ message: `No historical data found for symbol "${symbol}"` });
            }
        }

        if (dataPoints.length === 0) {
            return res.status(404).json({ message: `No historical data found for symbol "${symbol}"` });
        }

        cache.history[symLower] = { data: dataPoints, timestamp: Date.now() };
        res.status(200).json(dataPoints);
    } catch (err) {
        if (isFinnhubRateLimit(err)) {
             console.warn(`⚠️ Finnhub rate limit hit for history of ${symbol}`);
             return res.status(429).json({ message: 'API rate limit reached. Please wait and try again.' });
        }
        
        console.error(`History error for ${symbol}:`, err.message);
        
        // Generate mock historical data for offline mode
        const mockHistory = [];
        const basePrice = 100;
        for (let i = 100; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const variance = (Math.random() - 0.5) * 20;
            const price = basePrice + variance;
            mockHistory.push({
                date: date.toISOString().split('T')[0],
                price: parseFloat(price.toFixed(2)),
                open: parseFloat((price - 1).toFixed(2)),
                high: parseFloat((price + 2).toFixed(2)),
                low: parseFloat((price - 2).toFixed(2)),
                volume: Math.floor(Math.random() * 50000000) + 1000000,
                isOfflineData: true
            });
        }
        
        cache.history[symLower] = { data: mockHistory, timestamp: Date.now() };
        res.status(200).json(mockHistory);
    }
};

// ─── 5. Market Pulse — live index data for dashboard ─────────────────
const MARKET_INDICES = [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^IXIC', name: 'NASDAQ' },
    { symbol: '^NSEI', name: 'NIFTY 50' },
];

const TOP_GAINER_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'];

export const getMarketPulse = async (_req, res) => {
    // Return cached data if fresh
    if (cache.marketPulse && Date.now() - cache.marketPulse.timestamp < MARKET_PULSE_CACHE_DURATION) {
        return res.status(200).json(cache.marketPulse.data);
    }

    try {
        // 1. Fetch index quotes
        const indices = [];
        for (const idx of MARKET_INDICES) {
            try {
                const q = await yahooFinance.quote(idx.symbol, {}, { validateResult: false });
                indices.push({
                    symbol: idx.symbol,
                    name: idx.name,
                    price: q.regularMarketPrice || 0,
                    change: q.regularMarketChange || 0,
                    changePercent: q.regularMarketChangePercent || 0,
                    isPositive: (q.regularMarketChange || 0) >= 0,
                });
            } catch (err) {
                console.warn(`Market Pulse: Failed to fetch ${idx.name}:`, err.message);
                indices.push({
                    symbol: idx.symbol,
                    name: idx.name,
                    price: 0,
                    change: 0,
                    changePercent: 0,
                    isPositive: true,
                });
            }
        }

        // 2. Find top gainer from watchlist (batch fetch for efficiency)
        let topGainer = { symbol: 'N/A', changePercent: 0 };
        try {
            const gainers = await yahooFinance.quote(TOP_GAINER_WATCHLIST, {}, { validateResult: false });
            const gainersArr = Array.isArray(gainers) ? gainers : [gainers];
            for (const q of gainersArr) {
                const cp = q.regularMarketChangePercent || 0;
                if (cp > topGainer.changePercent) {
                    topGainer = { symbol: q.symbol, changePercent: cp };
                }
            }
        } catch (err) {
            console.warn('Market Pulse: Top gainer fetch failed:', err.message);
        }

        // 3. Determine market status (US markets: 9:30 AM - 4:00 PM ET, Mon-Fri)
        const now = new Date();
        const etOffset = -4; // EDT (summer) — simplified
        const etHour = (now.getUTCHours() + etOffset + 24) % 24;
        const etMin = now.getUTCMinutes();
        const etTimeInMinutes = etHour * 60 + etMin;
        const day = now.getUTCDay();
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = etTimeInMinutes >= 570 && etTimeInMinutes <= 960; // 9:30 - 16:00
        const marketStatus = isWeekday && isMarketHours ? 'US Open' : 'US Closed';

        const data = {
            indices,
            topGainer: {
                symbol: topGainer.symbol,
                change: `+${topGainer.changePercent.toFixed(1)}%`,
            },
            marketStatus,
        };

        cache.marketPulse = { data, timestamp: Date.now() };
        res.status(200).json(data);
    } catch (err) {
        console.error('Market Pulse error:', err.message);
        // Return fallback static data
        res.status(200).json({
            indices: [
                { symbol: '^GSPC', name: 'S&P 500', price: 0, change: 0, changePercent: 0, isPositive: true },
                { symbol: '^IXIC', name: 'NASDAQ', price: 0, change: 0, changePercent: 0, isPositive: true },
                { symbol: '^NSEI', name: 'NIFTY 50', price: 0, change: 0, changePercent: 0, isPositive: true },
            ],
            topGainer: { symbol: 'N/A', change: '0%' },
            marketStatus: 'Unknown',
        });
    }
};

// ─── Helper: Enrich search results with live quote data ──────────────
const enrichResultsWithQuotes = async (results) => {
    if (!results || results.length === 0) return results;

    try {
        const symbols = results.map(r => r.symbol).filter(Boolean);
        if (symbols.length === 0) return results;

        const quotes = await yahooFinance.quote(symbols, {}, { validateResult: false });
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

        const quoteMap = {};
        for (const q of quotesArray) {
            if (q && q.symbol) {
                quoteMap[q.symbol] = {
                    price: q.regularMarketPrice || 0,
                    change: q.regularMarketChange || 0,
                    changePercent: q.regularMarketChangePercent || 0,
                    marketCap: q.marketCap || null,
                    volume: q.regularMarketVolume || null,
                    high: q.regularMarketDayHigh || 0,
                    low: q.regularMarketDayLow || 0,
                    open: q.regularMarketOpen || 0,
                    previousClose: q.regularMarketPreviousClose || 0,
                    name: q.shortName || q.longName || null,
                };
            }
        }

        return results.map(r => {
            const quoteData = quoteMap[r.symbol];
            if (quoteData) {
                return {
                    ...r,
                    ...quoteData,
                    description: quoteData.name || r.description,
                };
            }
            return r;
        });
    } catch (err) {
        console.warn('Failed to enrich search results with live quotes:', err.message);
        return results; // Return unenriched results on failure
    }
};

// ─── 6. Get batch quotes for multiple symbols ────────────────────────
export const getBatchQuotes = async (req, res) => {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ message: 'symbols query parameter is required (comma-separated)' });

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (symbolList.length === 0) return res.status(400).json({ message: 'No valid symbols provided' });
    if (symbolList.length > 20) return res.status(400).json({ message: 'Maximum 20 symbols per batch request' });

    try {
        const quotes = await yahooFinance.quote(symbolList, {}, { validateResult: false });
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

        const result = {};
        for (const q of quotesArray) {
            if (q && q.symbol) {
                result[q.symbol] = {
                    symbol: q.symbol,
                    name: q.shortName || q.longName || q.symbol,
                    price: q.regularMarketPrice || 0,
                    change: q.regularMarketChange || 0,
                    changePercent: q.regularMarketChangePercent || 0,
                    high: q.regularMarketDayHigh || 0,
                    low: q.regularMarketDayLow || 0,
                    open: q.regularMarketOpen || 0,
                    previousClose: q.regularMarketPreviousClose || 0,
                    volume: q.regularMarketVolume || 0,
                    marketCap: q.marketCap || null,
                    sharesOutstanding: q.sharesOutstanding || null,
                };
            }
        }

        res.status(200).json(result);
    } catch (err) {
        console.error('Batch quotes error:', err.message);
        res.status(500).json({ message: 'Failed to fetch batch quotes' });
    }
};
