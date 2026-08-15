import express from 'express';
import { searchStocks, getStockQuote, getStockNews, getStockHistory, clearCache, getMarketPulse, getBatchQuotes } from '../controllers/stockControllers.js';

const router = express.Router();

router.get('/search', searchStocks);
router.get('/quotes', getBatchQuotes);
router.get('/quote/:symbol', getStockQuote);
router.get('/news/:symbol', getStockNews);
router.get('/history/:symbol', getStockHistory);
router.get('/market-pulse', getMarketPulse);
router.post('/cache/clear', clearCache);


export default router;
