import express from 'express';
import { store } from '../dataStore.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Get chat history for a room
router.get('/:roomId', protect, (req, res) => {
  try {
    const messages = (store.messages || []).filter(m => m.roomId === req.params.roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Admin: Get all active rooms
router.get('/admin/rooms', protect, (req, res) => {
  try {
    // Only admins can access this route
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    const messages = store.messages || [];
    const roomsMap = new Map();
    
    messages.forEach(msg => {
      // Keep track of the latest message for each room
      if (!roomsMap.has(msg.roomId)) {
        roomsMap.set(msg.roomId, {
          roomId: msg.roomId,
          lastMessage: msg.text,
          timestamp: msg.timestamp,
          userName: msg.senderName // initial guess
        });
      } else {
        const room = roomsMap.get(msg.roomId);
        if (msg.timestamp > room.timestamp) {
          room.lastMessage = msg.text;
          room.timestamp = msg.timestamp;
        }
        // Update name if we see a non-admin sender
        if (msg.senderName && msg.senderName !== 'Admin') {
            room.userName = msg.senderName;
        }
      }
    });
    
    const rooms = Array.from(roomsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

export default router;
