const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// --- In-Memory Database Simulation ---
// In a real application, you would use a database like MongoDB or PostgreSQL.
let portfolio = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 10,
    avgPrice: 150.75,
  },
  {
    id: '2',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 5,
    avgPrice: 2800.0,
  },
  {
    id: '3',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 8,
    avgPrice: 305.5,
  },
];

// The frontend now handles live prices via WebSocket.

// --- Controller Functions ---

/**
 * @desc    Get all portfolio items with live data
 * @route   GET /api/portfolio
 * @access  Public
 */
const getPortfolio = async (req, res) => {
  try {
    const portfolioWithFallbackData = portfolio.map((item) => {
      // Return avgPrice as the initial currentPrice so the frontend has something to show
      // before the WebSocket live prices arrive.
      const currentPrice = item.avgPrice; 
      const totalValue = item.shares * currentPrice;
      const gainLoss = totalValue - item.shares * item.avgPrice;
      const gainLossPercent = (gainLoss / (item.shares * item.avgPrice)) * 100;

      return {
        ...item,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPercent,
      };
    });
    res.json(portfolioWithFallbackData);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching portfolio data' });
  }
};

/**
 * @desc    Get a single portfolio item by ID
 * @route   GET /api/portfolio/:id
 * @access  Public
 */
const getPortfolioItem = (req, res) => {
    const item = portfolio.find((p) => p.id === req.params.id);
    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ message: 'Portfolio item not found' });
    }
}


/**
 * @desc    Add a new stock to the portfolio
 * @route   POST /api/portfolio
 * @access  Public
 */
const addStock = (req, res) => {
  const { symbol, shares, avgPrice } = req.body;

  if (!symbol || !shares || !avgPrice) {
    return res.status(400).json({ message: 'Please provide symbol, shares, and average price' });
  }

  // A real app would fetch the company name from an API
  const newItem = {
    id: uuidv4(),
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Inc.`, // Placeholder name
    shares: parseFloat(shares),
    avgPrice: parseFloat(avgPrice),
  };

  portfolio.push(newItem);
  res.status(201).json(newItem);
};

/**
 * @desc    Update an existing stock in the portfolio
 * @route   PUT /api/portfolio/:id
 * @access  Public
 */
const updateStock = (req, res) => {
  const { id } = req.params;
  const { shares, avgPrice } = req.body;

  const itemIndex = portfolio.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Portfolio item not found' });
  }
  
  // Update fields if they are provided
  if (shares !== undefined) {
      portfolio[itemIndex].shares = parseFloat(shares);
  }
  if (avgPrice !== undefined) {
      portfolio[itemIndex].avgPrice = parseFloat(avgPrice);
  }

  res.json(portfolio[itemIndex]);
};


/**
 * @desc    Delete a stock from the portfolio
 * @route   DELETE /api/portfolio/:id
 * @access  Public
 */
const deleteStock = (req, res) => {
  const { id } = req.params;
  const initialLength = portfolio.length;
  portfolio = portfolio.filter((item) => item.id !== id);

  if (portfolio.length === initialLength) {
    return res.status(404).json({ message: 'Portfolio item not found' });
  }

  res.status(200).json({ message: 'Stock removed successfully' });
};

module.exports = {
  getPortfolio,
  getPortfolioItem,
  addStock,
  updateStock,
  deleteStock,
};
