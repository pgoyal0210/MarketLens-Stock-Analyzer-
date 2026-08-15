import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const getUserId = () => localStorage.getItem('userId') || 'guest';
  const getStorageKey = () => `stockpulse-notifications-${getUserId()}`;

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(getStorageKey());
    return saved ? JSON.parse(saved) : [];
  });
  
  const [unreadCount, setUnreadCount] = useState(0);

  // Reload notifications when auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem(getStorageKey());
      setNotifications(saved ? JSON.parse(saved) : []);
    };
    
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const addNotification = (title, message, type = 'info') => {
    const newNotification = {
      id: Date.now().toString(),
      title,
      message,
      type, // 'success', 'error', 'info', 'warning'
      date: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50

    // Also trigger a popup toast
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message, { icon: 'ℹ️' });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
        notifications, 
        unreadCount, 
        addNotification, 
        markAllAsRead, 
        clearNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
