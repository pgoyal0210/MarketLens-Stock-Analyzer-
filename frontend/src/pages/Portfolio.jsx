import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { Plus, TrendingUp, TrendingDown, Eye, Trash2, Edit3, Loader, X, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import "./Portfolio.css";

// --- Broker CSV parsing configurations ---
const BROKER_CONFIGS = {
  zerodha: {
    name: "Zerodha (Kite)",
    columns: { symbol: "tradingsymbol", shares: "quantity", avgPrice: "average_price", name: "instrument" },
    instructions: "Export your holdings from Kite → Portfolio → Holdings → Download CSV",
    sampleHeader: "tradingsymbol,quantity,average_price,instrument",
  },
  groww: {
    name: "Groww",
    columns: { symbol: "symbol", shares: "quantity", avgPrice: "avg_price", name: "company_name" },
    instructions: "Go to Groww → Stocks → Holdings → Download Statement as CSV",
    sampleHeader: "symbol,quantity,avg_price,company_name",
  },
  angelone: {
    name: "Angel One",
    columns: { symbol: "scrip_name", shares: "quantity", avgPrice: "buy_avg", name: "scrip_name" },
    instructions: "Open Angel One → Portfolio → Holdings → Export to CSV",
    sampleHeader: "scrip_name,quantity,buy_avg",
  },
  upstox: {
    name: "Upstox",
    columns: { symbol: "symbol", shares: "quantity", avgPrice: "avg_price", name: "company" },
    instructions: "Open Upstox → Portfolio → Holdings → Download CSV",
    sampleHeader: "symbol,quantity,avg_price,company",
  },
  generic: {
    name: "Generic CSV",
    columns: { symbol: "symbol", shares: "shares", avgPrice: "avg_price", name: "name" },
    instructions: "Your CSV must have columns: symbol, shares, avg_price. Optionally: name",
    sampleHeader: "symbol,shares,avg_price,name",
  },
};

// --- CSV Parser helper ---
const parseCSV = (text) => {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/['"]/g, ""));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
};

const Portfolio = () => {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [formData, setFormData] = useState({ symbol: "", shares: "", avgPrice: "", name: "", currentPrice: "" });

  // --- Import state ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("zerodha");
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // --- Fetch portfolio
  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/api/protfolio", { withCredentials: true });
      const items = response.data || [];
      setPortfolioItems(items);
      setError(null);

      // After loading portfolio, fetch live prices for all holdings
      if (items.length > 0) {
        fetchLivePrices(items);
      }
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError("Failed to load portfolio data. Please check the connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch live prices for all portfolio symbols using batch endpoint
  const fetchLivePrices = async (items) => {
    try {
      const uniqueSymbols = [...new Set(items.map(item => item.symbol).filter(Boolean))];
      if (uniqueSymbols.length === 0) return;

      const res = await axios.get(`http://localhost:3001/api/stocks/quotes?symbols=${uniqueSymbols.join(',')}`);
      const liveQuotes = res.data;

      if (liveQuotes && typeof liveQuotes === 'object') {
        setPortfolioItems(prev =>
          prev.map(item => {
            const liveData = liveQuotes[item.symbol];
            if (liveData && liveData.price) {
              return { ...item, currentPrice: liveData.price };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.warn("Failed to fetch live prices for portfolio:", err.message);
    }
  };

  useEffect(() => {
    fetchPortfolio();

    // Setup WebSocket
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Portfolio WebSocket connected');
    });

    socket.on('priceUpdate', (data) => {
      setPortfolioItems((prev) => 
        prev.map(item => 
          item.symbol === data.symbol 
            ? { ...item, currentPrice: data.price } 
            : item
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Subscribe to all portfolio items when they change
  const subscribedSymbols = useRef(new Set());
  useEffect(() => {
    if (socketRef.current && portfolioItems.length > 0) {
      portfolioItems.forEach(item => {
        if (item.symbol && !subscribedSymbols.current.has(item.symbol)) {
          socketRef.current.emit('subscribe', item.symbol);
          subscribedSymbols.current.add(item.symbol);
        }
      });
    }
  }, [portfolioItems.length]);

  // --- Calculations
  const totalValue = (portfolioItems || []).reduce(
    (sum, item) => sum + (item.shares || 0) * (item.currentPrice || item.avgPrice || 0),
    0
  );

  const totalCost = (portfolioItems || []).reduce(
    (sum, item) => sum + (item.shares || 0) * (item.avgPrice || 0),
    0
  );

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // --- Modal handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ symbol: "", shares: "", avgPrice: "", name: "", currentPrice: "" });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentItemId(item._id);
    setFormData({
      symbol: item.symbol || "",
      shares: item.shares || "",
      avgPrice: item.avgPrice || "",
      name: item.name || "",
      currentPrice: item.currentPrice || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentItemId(null);
  };

  // --- CRUD
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      symbol: formData.symbol.toUpperCase(),
      shares: Number(formData.shares),
      avgPrice: Number(formData.avgPrice),
      name: formData.name,
      currentPrice: Number(formData.currentPrice),
    };

    try {
      if (isEditing) {
        await axios.put(`/api/protfolio/${currentItemId}`, payload, { withCredentials: true });
      } else {
        await axios.post("/api/protfolio", payload, { withCredentials: true });
      }
      fetchPortfolio();
      closeModal();
    } catch (err) {
      console.error("Error saving stock:", err);
      setError("Failed to save stock. Please try again.");
    }
  };

  const removeStock = async (id) => {
    try {
      await axios.delete(`/api/protfolio/${id}`, { withCredentials: true });
      setPortfolioItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Error removing stock:", err);
      setError("Failed to remove stock. Please try again.");
    }
  };

  // --- Import handlers ---
  const openImportModal = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportPreview([]);
    setImportError(null);
    setImportSuccess(null);
    setSelectedBroker("zerodha");
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    setImportError(null);
    setImportSuccess(null);
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a .csv file");
      return;
    }
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setImportError("CSV file is empty or has no data rows.");
          return;
        }

        const config = BROKER_CONFIGS[selectedBroker];
        const cols = config.columns;

        // Map CSV rows to our schema
        const mapped = rows
          .map((row) => ({
            symbol: row[cols.symbol] || "",
            shares: parseFloat(row[cols.shares]) || 0,
            avgPrice: parseFloat(row[cols.avgPrice]) || 0,
            name: row[cols.name] || row[cols.symbol] || "",
            currentPrice: 0,
          }))
          .filter((item) => item.symbol && item.shares > 0);

        if (mapped.length === 0) {
          setImportError(`Could not parse any valid holdings. Make sure your CSV has the correct columns for ${config.name}.\nExpected: ${config.sampleHeader}`);
          return;
        }

        setImportPreview(mapped);
      } catch (err) {
        setImportError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const confirmImport = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    setImportError(null);

    try {
      const res = await axios.post("/api/protfolio/bulk", { holdings: importPreview }, { withCredentials: true });
      setImportSuccess(`Successfully imported ${importPreview.length} holdings!`);
      setImportPreview([]);
      setImportFile(null);
      fetchPortfolio();
    } catch (err) {
      console.error("Import error:", err);
      setImportError("Failed to import holdings. Please try again.");
    } finally {
      setImportLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const config = BROKER_CONFIGS[selectedBroker];
    const header = config.sampleHeader;
    const sampleRows = [
      "AAPL,10,150.75,Apple Inc.",
      "GOOGL,5,2800.00,Alphabet Inc.",
      "TSLA,8,210.50,Tesla Inc.",
    ];
    const csvContent = [header, ...sampleRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${selectedBroker}_portfolio.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Re-parse when broker selection changes and file is already loaded
  useEffect(() => {
    if (importFile) {
      processFile(importFile);
    }
  }, [selectedBroker]);

  return (
    <div className="portfolio-page">
      <div className="container">
        {/* Header */}
        <div className="portfolio-header">
          <div className="portfolio-title">
            <h1>My Portfolio</h1>
            <p>Track your investments and monitor performance with live data</p>
          </div>
          <div className="portfolio-actions-row">
            <button className="btn btn-secondary import-btn" onClick={openImportModal}>
              <Upload size={18} /> Import from Broker
            </button>
            <button className="btn btn-primary add-stock-btn" onClick={openAddModal}>
              <Plus size={20} /> Add Stock
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="portfolio-summary">
          <div className="summary-card">
            <h3>Total Portfolio Value</h3>
            <div className="summary-value">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="summary-card">
            <h3>Total Gain/Loss</h3>
            <div className={`summary-value ${totalGainLoss >= 0 ? "positive" : "negative"}`}>
              {totalGainLoss >= 0 ? "+" : "-"}${Math.abs(totalGainLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`summary-percent ${totalGainLoss >= 0 ? "positive" : "negative"}`}>
              {totalGainLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {totalGainLossPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{isEditing ? "Edit Stock" : "Add Stock to Portfolio"}</h3>
                <button onClick={closeModal} className="close-modal-btn">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Stock Symbol</label>
                  <input
                    type="text"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., AAPL"
                    required
                    disabled={isEditing}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <div className="form-group">
                  <label>Stock Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Apple Inc."
                  />
                </div>
                <div className="form-group">
                  <label>Number of Shares</label>
                  <input
                    type="number"
                    name="shares"
                    value={formData.shares}
                    onChange={handleInputChange}
                    step="any"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Average Cost per Share ($)</label>
                  <input
                    type="number"
                    name="avgPrice"
                    value={formData.avgPrice}
                    onChange={handleInputChange}
                    step="any"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Current Price ($)</label>
                  <input
                    type="number"
                    name="currentPrice"
                    value={formData.currentPrice}
                    onChange={handleInputChange}
                    step="any"
                    min="0"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {isEditing ? "Save Changes" : "Add Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* === IMPORT MODAL === */}
        {showImportModal && (
          <div className="modal-overlay" onClick={closeImportModal}>
            <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Upload size={20} /> Import Portfolio from Broker</h3>
                <button onClick={closeImportModal} className="close-modal-btn">
                  <X size={24} />
                </button>
              </div>

              <div className="import-body">
                {/* Broker Selector */}
                <div className="form-group">
                  <label>Select Your Broker</label>
                  <select
                    value={selectedBroker}
                    onChange={(e) => setSelectedBroker(e.target.value)}
                    className="broker-select"
                  >
                    {Object.entries(BROKER_CONFIGS).map(([key, config]) => (
                      <option key={key} value={key}>{config.name}</option>
                    ))}
                  </select>
                </div>

                {/* Instructions */}
                <div className="import-instructions">
                  <FileText size={16} />
                  <span>{BROKER_CONFIGS[selectedBroker].instructions}</span>
                </div>

                {/* File Upload */}
                <div
                  className={`file-drop-zone ${isDragging ? "dragging" : ""} ${importFile ? "has-file" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {importFile ? (
                    <div className="file-selected">
                      <CheckCircle size={24} className="positive" />
                      <span>{importFile.name}</span>
                      <span className="file-size">({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <Upload size={32} />
                      <p>Drag & drop your CSV file here</p>
                      <span>or click to browse</span>
                    </div>
                  )}
                </div>

                <button type="button" className="download-sample-btn" onClick={downloadSampleCSV}>
                  <FileText size={14} /> Download sample CSV template
                </button>

                {/* Error / Success Messages */}
                {importError && (
                  <div className="import-message import-error">
                    <AlertCircle size={16} /> {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="import-message import-success">
                    <CheckCircle size={16} /> {importSuccess}
                  </div>
                )}

                {/* Preview Table */}
                {importPreview.length > 0 && (
                  <div className="import-preview">
                    <h4>Preview ({importPreview.length} holdings found)</h4>
                    <div className="preview-table-wrapper">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th>Shares</th>
                            <th>Avg Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((item, idx) => (
                            <tr key={idx}>
                              <td className="symbol-cell">{item.symbol}</td>
                              <td>{item.name || "-"}</td>
                              <td>{item.shares}</td>
                              <td>${item.avgPrice.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeImportModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmImport}
                    disabled={importPreview.length === 0 || importLoading}
                  >
                    {importLoading ? <><Loader size={16} className="animate-spin" /> Importing...</> : `Import ${importPreview.length} Holdings`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Holdings */}
        <div className="portfolio-holdings">
          <h2>Holdings</h2>
          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" size={48} /> <p>Loading portfolio...</p>
            </div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : portfolioItems.length === 0 ? (
            <div className="empty-portfolio">
              <h3>Your portfolio is empty.</h3>
              <p>Start by adding your first stock or import from your broker!</p>
              <div className="empty-actions">
                <button className="btn btn-primary" onClick={openAddModal}>Add First Stock</button>
                <button className="btn btn-secondary" onClick={openImportModal}><Upload size={16} /> Import from Broker</button>
              </div>
            </div>
          ) : (
            <div className="holdings-table-container">
              <div className="holdings-table">
                <div className="table-header">
                  <div>Stock</div>
                  <div className="text-right">Shares</div>
                  <div className="text-right">Avg Cost</div>
                  <div className="text-right">Current Price</div>
                  <div className="text-right">Total Value</div>
                  <div className="text-right">Gain/Loss</div>
                  <div className="text-center">Actions</div>
                </div>
                {portfolioItems.map((item) => {
                  const currentPrice = item.currentPrice || item.avgPrice || 0;
                  const shares = item.shares || 0;
                  const avgPrice = item.avgPrice || 0;
                  const totalValue = shares * currentPrice;
                  const gainLoss = totalValue - shares * avgPrice;
                  const gainLossPercent = avgPrice > 0 ? (gainLoss / (shares * avgPrice)) * 100 : 0;

                  return (
                    <div key={item._id} className="table-row">
                      <div className="stock-info">
                        <div className="stock-symbol">{item.symbol}</div>
                        <div className="stock-name">{item.name || "-"}</div>
                      </div>
                      <div className="text-right">{shares.toLocaleString()}</div>
                      <div className="text-right">${avgPrice.toFixed(2)}</div>
                      <div className="text-right">${currentPrice.toFixed(2)}</div>
                      <div className="text-right">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <div className="gain-loss text-right">
                        <div className={`gain-loss-value ${gainLoss >= 0 ? "positive" : "negative"}`}>
                          {gainLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {gainLoss >= 0 ? "+" : "-"}${Math.abs(gainLoss).toFixed(2)}
                        </div>
                        <div className={`gain-loss-percent ${gainLoss >= 0 ? "positive" : "negative"}`}>
                          ({gainLossPercent.toFixed(2)}%)
                        </div>
                      </div>
                      <div className="actions">
                        <Link to={`/stock/${item.symbol}`} className="action-btn view-btn" title="View Details">
                          <Eye size={16} />
                        </Link>
                        <button className="action-btn edit-btn" title="Edit" onClick={() => openEditModal(item)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="action-btn delete-btn" title="Remove" onClick={() => removeStock(item._id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
