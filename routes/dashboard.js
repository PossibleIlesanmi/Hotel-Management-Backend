const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching dashboard data for user:', req.user?.id);

    // Get current date dynamically (August 12, 2025, 02:18 PM WAT)
    const today = new Date('2025-08-12T13:18:00.000Z'); // 02:18 PM WAT is 13:18 UTC
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Fetch all rooms
    const rooms = await Room.find().select('roomNumber status');
    const totalRooms = rooms.length;
    if (totalRooms === 0) {
      console.warn('No rooms found in database');
    }

    // Fetch all active bookings overlapping today
    const activeBookings = await Booking.find({
      status: 'active',
      $or: [
        { checkIn: { $gte: startOfDay, $lte: endOfDay } },
        { checkOut: { $gte: startOfDay, $lte: endOfDay } },
        { checkIn: { $lt: startOfDay }, checkOut: { $gt: endOfDay } }
      ]
    }).populate('room');
    console.log('Active bookings found:', activeBookings.map(b => ({ _id: b._id, totalPrice: b.totalPrice, room: b.room?.roomNumber })));

    // Calculate occupancy based on active bookings
    const occupiedRoomIds = [...new Set(activeBookings.map(b => b.room?._id?.toString()).filter(id => id))];
    const occupiedRooms = occupiedRoomIds.length;
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

    // Calculate total bookings and revenue for today
    const todayBookings = await Booking.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'active'
    }).countDocuments();
    const revenue = activeBookings.reduce((sum, booking) => {
      const price = booking.totalPrice || (booking.room?.price * (Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)) || 0));
      console.log(`Booking ${booking._id} totalPrice: ${price}`);
      return sum + price;
    }, 0);

    console.log('Dashboard Data:', { occupancyRate, todayBookings, revenue });

    if (occupiedRooms === 0 && todayBookings === 0 && revenue === 0) {
      console.warn('No data to display on dashboard');
    }

    res.json({
      occupancyRate: `${occupancyRate}% | ${100 - occupancyRate}% Available`,
      totalBookings: todayBookings > 0 ? `${todayBookings} Today` : '0 Today',
      revenue: `$${revenue.toFixed(2)} Today`
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;