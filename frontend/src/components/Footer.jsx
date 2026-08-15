import React from "react";
import { Activity, Github, Twitter, Linkedin } from "lucide-react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Logo & description */}
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <Activity className="footer-logo-icon" />
              <span>MarketLens</span>
            </div>
            <p className="footer-description">
              Professional stock analysis platform for intelligent investment
              decisions.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4>Product</h4>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/analyzer">Analyzer</a></li>
              <li><a href="/portfolio">Portfolio</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>

          {/* Features */}
          <div className="footer-section">
            <h4>Features</h4>
            <ul className="footer-links">
              <li><a href="#">Live Market Data</a></li>
              <li><a href="#">Technical Analysis</a></li>
              <li><a href="#">Portfolio Tracking</a></li>
              <li><a href="#">Market News</a></li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="GitHub">
                <Github size={18} />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <Twitter size={18} />
              </a>
              <a href="#" className="social-link" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom">
          <p>&copy; 2025 MarketLens. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
