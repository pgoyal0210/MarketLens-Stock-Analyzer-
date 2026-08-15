import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Activity, TrendingUp } from "lucide-react";
import { useNotification } from '../contexts/NotificationContext';
import "./Hero.css";

const Hero = () => {
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
    <section className="hero">
      {/* Abstract Animated Background Background */}
      <div className="hero-bg">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="container">
        <div className="hero-content">
          <div className="hero-badge animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="badge-pulse"></span>
            Live Market Intelligence
          </div>
          
          <h1 className="hero-title animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Master the Market with<br />
            <span className="text-gradient">Precision Data.</span>
          </h1>
          
          <p className="hero-description animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Institutional-grade analytics, real-time portfolio tracking, and deep market insights designed for the modern investor.
          </p>
          
          <div className="hero-actions animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link to="/analyzer" className="btn btn-primary btn-lg" onClick={handleAnalyzeClick}>
              Start Analyzing <ArrowRight size={18} />
            </Link>
            <Link to="/about" className="btn btn-secondary btn-lg">
              Explore Platform
            </Link>
          </div>
          
          {/* Mock Floating UI Element to show "Platform" */}
          <div className="hero-visual animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="mock-window">
              <div className="mock-header">
                <div className="mock-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="mock-title">stockpulse / terminal</div>
              </div>
              <div className="mock-body">
                <div className="mock-stat">
                  <div className="stat-label">AAPL / NASDAQ</div>
                  <div className="stat-value font-mono">$189.42 <span className="positive">+1.24%</span></div>
                  <div className="sparkline-placeholder">
                    <TrendingUp size={32} className="spark-icon" />
                  </div>
                </div>
                <div className="mock-stat">
                  <div className="stat-label">PORTFOLIO VOLATILITY</div>
                  <div className="stat-value font-mono">12.4% <span className="negative">-0.8%</span></div>
                  <div className="sparkline-placeholder blue-spark">
                    <Activity size={32} className="spark-icon" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
