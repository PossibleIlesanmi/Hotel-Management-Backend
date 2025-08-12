// server/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const authMiddleware = require('../middlewares/auth');

// Get all bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('room');
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { guestName, roomId, checkIn, checkOut } = req.body;
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') {
      return res.status(400).json({ message: 'Room not available' });
    }
    const totalPrice = room.price * Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const booking = new Booking({ guestName, room: roomId, checkIn, checkOut, totalPrice });
    await booking.save();
    await Room.findByIdAndUpdate(roomId, { status: 'occupied' });
    const populatedBooking = await Booking.findById(booking._id).populate('room');
    res.status(201).json(populatedBooking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel a booking
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    booking.status = 'cancelled';
    await booking.save();
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    const populatedBooking = await Booking.findById(booking._id).populate('room');
    res.json(populatedBooking);
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a booking
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { guestName, roomId, checkIn, checkOut } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update cancelled booking' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(400).json({ message: 'Invalid room' });
    }
    if (room.status !== 'available' && room._id.toString() !== booking.room.toString()) {
      return res.status(400).json({ message: 'Room not available' });
    }

    booking.guestName = guestName;
    booking.room = roomId;
    booking.checkIn = checkIn;
    booking.checkOut = checkOut;
    booking.totalPrice = room.price * Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    await booking.save();

    if (booking.room.toString() !== roomId) {
      await Room.findByIdAndUpdate(booking.room, { status: 'available' });
      await Room.findByIdAndUpdate(roomId, { status: 'occupied' });
    }

    const updatedBooking = await Booking.findById(req.params.id).populate('room');
    res.json(updatedBooking);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;