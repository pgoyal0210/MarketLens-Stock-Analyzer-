import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  source: { type: String, required: true },
  url: { type: String, required: true },
  summary: { type: String },
  datetime: { type: Date }
}, { _id: false });

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String },
  
  // Quote Data
  price: { type: Number },           // Current price (c)
  open: { type: Number },            // Opening price (o)
  high: { type: Number },            // High price (h)
  low: { type: Number },             // Low price (l)
  previousClose: { type: Number },   // Previous close (pc)
  change: { type: Number },          // Change (d)
  changePercent: { type: Number },   // Change percentage (dp)
  
  // Company Profile Data
  country: { type: String },
  currency: { type: String },
  exchange: { type: String },
  industry: { type: String },
  ipo: { type: String },
  marketCap: { type: Number },
  phone: { type: String },
  weburl: { type: String },
  logo: { type: String },
  
  // News
  news: [newsSchema],
}, { timestamps: true });

const Stock = mongoose.model('Stock', stockSchema);

export default Stock;
