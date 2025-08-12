const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const Room = require('../models/Room'); // ✅ Add this
const Booking = require('../models/Booking'); // ✅ To update booking with guest info
const authMiddleware = require('../middlewares/auth');

// Get all guests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const guests = await Guest.find().populate('room');
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update a guest
router.post('/', authMiddleware, async (req, res) => {
  const { name, roomId, checkIn, checkOut } = req.body;

  try {
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'occupied') {
      return res.status(400).json({ message: 'Room not occupied' });
    }

    // Check if an active booking exists for this room
    let booking = await Booking.findOne({ room: roomId, status: 'active' });
    if (!booking) {
      // Create a new booking if none exists
      const totalPrice = room.price * Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
      booking = new Booking({ guestName: name, room: roomId, checkIn, checkOut, totalPrice });
      await booking.save();
    } else {
      // Update existing booking with guest name
      booking.guestName = name;
      await booking.save();
    }

    // Save guest
    const guest = new Guest({ name, room: roomId, checkIn: new Date(checkIn), checkOut: new Date(checkOut) });
    await guest.save();

    res.status(201).json(guest);
  } catch (err) {
    console.error('Error saving guest:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;