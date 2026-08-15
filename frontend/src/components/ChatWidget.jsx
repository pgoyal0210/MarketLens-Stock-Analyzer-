import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, SOCKET_URL } from '../config';
import './ChatWidget.css';

const socket = io(SOCKET_URL, { autoConnect: false });

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [adminRooms, setAdminRooms] = useState([]);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuth) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true });
          const userData = res.data.user;
          setUser(userData);
          
          socket.connect();
          
          if (userData.role === 'admin') {
            socket.emit('join_admin');
            fetchAdminRooms();
          } else {
            setActiveRoom(userData.id);
            socket.emit('join_chat', userData.id);
            fetchMessages(userData.id);
          }
        } catch (err) {
          console.error("Auth check failed in chat widget");
        }
      }
    };
    
    if (isOpen && !user) {
      checkAuth();
    }
  }, [isOpen]);

  useEffect(() => {
    socket.on('receive_message', (message) => {
      // If we are admin, refresh room list if it's a new room
      if (user?.role === 'admin') {
        fetchAdminRooms();
        if (activeRoom === message.roomId) {
          setMessages(prev => [...prev, message]);
        }
      } else {
        // Normal user
        if (activeRoom === message.roomId) {
          setMessages(prev => [...prev, message]);
        }
      }
    });

    return () => {
      socket.off('receive_message');
    };
  }, [activeRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (roomId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chat/${roomId}`, { withCredentials: true });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const fetchAdminRooms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chat/admin/rooms`, { withCredentials: true });
      setAdminRooms(res.data);
    } catch (err) {
      console.error("Failed to load admin rooms", err);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoom) return;

    const messageData = {
      roomId: activeRoom,
      senderId: user.id,
      senderName: user.role === 'admin' ? 'Admin' : user.name,
      text: inputText,
      timestamp: Date.now()
    };

    socket.emit('send_message', messageData);
    setInputText('');
  };

  const handleRoomSelect = (roomId) => {
    setActiveRoom(roomId);
    socket.emit('join_chat', roomId);
    fetchMessages(roomId);
  };

  const handleLoginRedirect = () => {
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-modal animate-fade-in">
          <div className="chat-header">
            <span>{user?.role === 'admin' ? 'Support Dashboard' : 'Help & Support'}</span>
            <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>

          {!user ? (
            <div className="auth-prompt">
              <MessageCircle size={48} style={{ marginBottom: 15, opacity: 0.5 }} />
              <p>Please sign in to chat with our support team.</p>
              <button className="btn btn-primary" onClick={handleLoginRedirect}>Sign In</button>
            </div>
          ) : (
            <>
              {user.role === 'admin' && (
                <div className="admin-rooms">
                  {adminRooms.length === 0 ? (
                    <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-2)' }}>No active chats</div>
                  ) : (
                    adminRooms.map(room => (
                      <button 
                        key={room.roomId} 
                        className={`admin-room-btn ${activeRoom === room.roomId ? 'active' : ''}`}
                        onClick={() => handleRoomSelect(room.roomId)}
                      >
                        <span className="room-name">{room.userName || 'User'}</span>
                        <span className="room-last-msg">{room.lastMessage}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="chat-body">
                {messages.length === 0 && activeRoom ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-2)', marginTop: '20px' }}>
                    {user.role === 'admin' ? 'Select a chat or wait for messages.' : 'Send a message to start chatting!'}
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div key={msg._id || i} className={`chat-message ${isMine ? 'sent' : 'received'}`}>
                        {!isMine && <span className="message-sender">{msg.senderName}</span>}
                        {msg.text}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {(activeRoom) && (
                <form className="chat-footer" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button type="submit" disabled={!inputText.trim()}><Send size={18} /></button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {!isOpen && (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageCircle size={24} />
          Help & Support
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
