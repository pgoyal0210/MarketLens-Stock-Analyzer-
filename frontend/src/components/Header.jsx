import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Menu, X, Sun, Moon, Bell, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';
import './Header.css';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotification();
  const notifRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle scroll state for navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close notifications if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  // Close mobile menu when route changes and check auth
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
    setIsAuthenticated(localStorage.getItem('isAuthenticated') === 'true');
  }, [location]);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3001/api/auth/logout');
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('authChange'));
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <LineChart size={24} />
          </div>
          <span className="logo-text">MarketLens</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          {isAuthenticated && (
            <>
              <Link to="/analyzer" className={`nav-link ${location.pathname === '/analyzer' ? 'active' : ''}`}>Analyzer</Link>
              <Link to="/portfolio" className={`nav-link ${location.pathname === '/portfolio' ? 'active' : ''}`}>Portfolio</Link>
            </>
          )}
          <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
        </nav>

        {/* Action Buttons */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Notification Bell */}
          <div className="notification-wrapper" ref={notifRef}>
            <button className="icon-btn notification-toggle" onClick={toggleNotifications}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="notification-dropdown animate-fade-in">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  {notifications.length > 0 && (
                    <button className="clear-notif-btn" onClick={clearNotifications}>
                      Clear All
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">No recent activity</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
                        <div className={`notification-icon type-${notif.type}`}></div>
                        <div className="notification-content">
                          <p className="notification-title">{notif.title}</p>
                          <p className="notification-message">{notif.message}</p>
                          <span className="notification-time">
                            {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <div className="header-profile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <button className="icon-btn" title="Profile">
                   <User size={20} />
                 </button>
                 <button className="icon-btn" onClick={handleLogout} title="Logout">
                   <LogOut size={20} />
                 </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary login-btn">Login</Link>
              <Link to="/signup" className="btn btn-primary signup-btn">Sign Up</Link>
            </>
          )}
          
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" className="mobile-nav-link">Home</Link>
        {isAuthenticated && (
          <>
            <Link to="/analyzer" className="mobile-nav-link">Analyzer</Link>
            <Link to="/portfolio" className="mobile-nav-link">Portfolio</Link>
          </>
        )}
        <Link to="/about" className="mobile-nav-link">About</Link>
        
        <div className="mobile-auth-actions">
          {isAuthenticated ? (
            <button onClick={handleLogout} className="btn btn-secondary full-width text-center">Logout</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary full-width text-center">Login</Link>
              <Link to="/signup" className="btn btn-primary full-width text-center">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
