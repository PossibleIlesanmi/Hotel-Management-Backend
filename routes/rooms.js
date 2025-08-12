const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'available' });
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomNumber, type, price } = req.body;
    const room = new Room({ roomNumber, type, price, status: 'available' });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;