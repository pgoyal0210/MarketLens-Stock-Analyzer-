import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Stock from '../models/stockModel.js';
import connectDB from '../config/connectDB.js';

dotenv.config();

const apiKey = process.env.FINNHUB_API_KEY;

const symbols = [
  "AAPL","MSFT","GOOGL","AMZN","FB","TSLA","NVDA","NFLX",
  "BABA","INTC","AMD","ORCL","IBM","CSCO","ADBE","CRM",
  "PYPL","QCOM","TXN","UBER","LYFT","SHOP","SPOT","TWTR","SQ"
];

connectDB();

const fetchAndSeedStocks = async () => {
  try {
    // Delete all existing stock documents before seeding new data
    await Stock.deleteMany({});
    console.log('🗑️ All previous stock data deleted.');

    for (const symbol of symbols) {
      try {
        // --- Fetch Quote ---
        const quoteRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        const quote = quoteRes.data;

        // --- Fetch Company Profile ---
        const profileRes = await axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
        const profile = profileRes.data;

        // --- Fetch News (past 7 days) ---
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 7);
        const newsRes = await axios.get(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}&token=${apiKey}`);
        const news = newsRes.data.map(item => ({
          headline: item.headline,
          source: item.source,
          url: item.url,
          summary: item.summary || '',
          datetime: new Date(item.datetime * 1000)
        }));

        // --- Insert new stock document ---
        const newStock = new Stock({
          symbol,
          name: profile.name || symbol,
          price: quote.c,
          open: quote.o,
          high: quote.h,
          low: quote.l,
          previousClose: quote.pc,
          change: quote.d,
          changePercent: quote.dp,
          country: profile.country,
          currency: profile.currency,
          exchange: profile.exchange,
          industry: profile.finnhubIndustry,
          ipo: profile.ipo,
          marketCap: profile.marketCapitalization || 0,
          phone: profile.phone,
          weburl: profile.weburl,
          logo: profile.logo,
          news
        });

        await newStock.save();
        console.log(`✅ Stock ${symbol} seeded successfully`);
      } catch (err) {
        console.error(`❌ Error fetching ${symbol}:`, err.message);
      }
    }

    console.log('All stocks processed.');
  } catch (err) {
    console.error('❌ Error deleting old stock data:', err.message);
  } finally {
    mongoose.disconnect();
  }
};

fetchAndSeedStocks();


// 6. FEATURE IMPLEMENTED
// 7. SCREENSHOT
// 8. CHALLENGES FACED
// 9. FEATURE ENHANCEMENT
// 10. CONCLUSION
// 11. APPENDIX