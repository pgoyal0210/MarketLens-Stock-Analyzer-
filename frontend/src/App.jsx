import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import StockAnalyzer from './pages/StockAnalyzer';
import StockDetails from './pages/StockDetails';
import TradingTerminal from './pages/TradingTerminal';
import Portfolio from './pages/Portfolio';
import About from './pages/About';
import Login from './pages/login';
import Signup from './pages/signup';
import AuthLayout from './components/authLayout';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Router>
          <div className="app">
            <Toaster 
               position="bottom-right"
               toastOptions={{
                 style: {
                   background: 'var(--bg-elevated)',
                   color: 'var(--text-1)',
                   border: '1px solid var(--border)',
                   fontFamily: 'var(--font-body)'
                 }
               }}
            />
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/analyzer" 
                  element={<StockAnalyzer />} 
                />
                <Route 
                  path="/stock/:symbol" 
                  element={<StockDetails />} 
                />
                {/* Protected trading and portfolio routes */}
                <Route
                  path="/trade/:symbol"
                  element={
                    <AuthLayout>
                      <TradingTerminal />
                    </AuthLayout>
                  }
                />

                <Route
                  path="/portfolio"
                  element={
                    <AuthLayout>
                      <Portfolio />
                    </AuthLayout>
                  }
                />

                <Route path="/about" element={<About />} />
                <Route path='/login' element={<Login />} />
                <Route path='/signup' element={<Signup />} />
              </Routes>
            </main>
            <Footer />
            <ChatWidget />
          </div>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
