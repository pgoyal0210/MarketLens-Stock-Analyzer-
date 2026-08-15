import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import { TrendingUp, Shield, Zap, Users, BarChart2, Globe } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const handleAnalyzeClick = (e) => {
    e.preventDefault();
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      addNotification('Authentication Required', 'Please sign in first', 'error');
    } else {
      navigate('/analyzer');
    }
  };
  return (
    <div className="home">
      <Hero />
      
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Platform Capabilities</span>
            <h2>The ultimate toolkit for serious investors.</h2>
            <p>Everything you need to analyze, execute, and monitor your portfolio with institutional-grade precision.</p>
          </div>
          
          <div className="bento-grid">
            {/* Row 1 */}
            <div className="bento-card animate-fade-in" style={{animationDelay: '0.1s'}}>
              <div className="bento-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <div className="bento-content">
                <h3>Real-time Market Data</h3>
                <p>Access live stock prices, market trends, and comprehensive financial data from major global exchanges.</p>
              </div>
            </div>

            <div className="bento-card animate-fade-in" style={{animationDelay: '0.15s'}}>
              <div className="bento-icon-wrapper">
                <Shield size={24} />
              </div>
              <div className="bento-content">
                <h3>Risk Analysis</h3>
                <p>Advanced risk assessment tools to protect your downside and manage portfolio volatility effectively.</p>
              </div>
            </div>

            <div className="bento-card animate-fade-in" style={{animationDelay: '0.2s'}}>
              <div className="bento-icon-wrapper">
                <Zap size={24} />
              </div>
              <div className="bento-content">
                <h3>Lightning Execution</h3>
                <p>Built on bleeding-edge infrastructure — optimized algorithms power every calculation instantly.</p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="bento-card animate-fade-in" style={{animationDelay: '0.25s'}}>
              <div className="bento-icon-wrapper">
                <Users size={24} />
              </div>
              <div className="bento-content">
                <h3>Expert Insights</h3>
                <p>Data-driven analysis combined with actionable recommendations from seasoned market analysts.</p>
              </div>
            </div>

            <div className="bento-card animate-fade-in" style={{animationDelay: '0.3s'}}>
              <div className="bento-icon-wrapper">
                <BarChart2 size={24} />
              </div>
              <div className="bento-content">
                <h3>Portfolio Analytics</h3>
                <p>Comprehensive performance tracking with gain/loss breakdowns and sector diversification insights.</p>
              </div>
            </div>

            <div className="bento-card animate-fade-in" style={{animationDelay: '0.35s'}}>
              <div className="bento-icon-wrapper">
                <Globe size={24} />
              </div>
              <div className="bento-content">
                <h3>Global Markets</h3>
                <p>Analyze stocks across NSE, BSE, NASDAQ, NYSE, and other major exchanges worldwide.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <div className="cta-glow"></div>
            <div className="cta-content">
              <h2>Stop guessing. Start analyzing.</h2>
              <p>Join thousands of investors who trust MarketLens for their financial decisions.</p>
              <a href="/analyzer" className="btn btn-primary btn-lg" onClick={handleAnalyzeClick}>Get Started Today</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;