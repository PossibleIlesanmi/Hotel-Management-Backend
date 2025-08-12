const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Guest = require('../models/Guest');
const authMiddleware = require('../middlewares/auth');
const PDFDocument = require('pdfkit');

router.get('/occupancy/pdf', authMiddleware, async (req, res) => {
  try {
    console.log('Starting PDF generation for occupancy report');

    // Fetch all data
    const rooms = await Room.find().select('roomNumber status type price');
    const bookings = await Booking.find(); // Include all bookings
    const guests = await Guest.find();

    // Enhance bookings with room and guest details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const room = booking.room ? await Room.findById(booking.room).select('roomNumber status type price') : null;
        // Match guest using guestName from Booking with name from Guest
        const guest = guests.find(g => g.name === booking.guestName) || { name: booking.guestName || 'Unknown Guest' };
        return { ...booking.toObject(), room, guest };
      })
    );

    // Calculate occupied rooms (based on all bookings with rooms)
    const occupiedRoomIds = [...new Set(bookingsWithDetails.map(b => b.room?._id?.toString()).filter(id => id))];
    const totalRooms = rooms.length;
    const occupiedRooms = occupiedRoomIds.length;

    console.log('Total Rooms:', totalRooms, 'Occupied Rooms:', occupiedRooms);
    console.log('Bookings with Details:', JSON.stringify(bookingsWithDetails, null, 2));
    console.log('Guests:', JSON.stringify(guests, null, 2));
    console.log('Rooms:', JSON.stringify(rooms, null, 2));

    if (typeof totalRooms !== 'number' || typeof occupiedRooms !== 'number') {
      throw new Error('Invalid room count data');
    }

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="occupancy_report.pdf"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Initialize PDF document
    const doc = new PDFDocument({
      info: { Title: 'Occupancy Report', Author: 'Possible Tech Solutions Hotel' },
      size: 'A4',
      margin: 50,
    });

    doc.pipe(res);

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('#2e2e2e')
      .text('Possible Tech Solutions Hotel', { align: 'center' });
    doc
      .fontSize(18)
      .text('Occupancy Report', { align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#555555')
      .text(`Generated on: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#2e2e2e')
      .text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text(`Total Rooms: ${totalRooms}`);
    doc.text(`Occupied Rooms: ${occupiedRooms}`);
    doc.text(`Occupancy Rate: ${occupancyRate}%`);
    doc.moveDown(2);

    // Room and Guest Details (Text Format)
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Room and Guest Details', { underline: true });
    doc.moveDown(0.5);

    if (bookingsWithDetails.length === 0) {
      doc.font('Helvetica').fontSize(12).text('No room or guest data available.');
    } else {
      bookingsWithDetails.forEach((booking, index) => {
        if (booking.room) {
          const guestName = booking.guest.name;
          doc
            .font('Helvetica')
            .fontSize(12)
            .text(`${index + 1}. Room Number: ${booking.room.roomNumber || 'N/A'}`);
          doc.text(`   Status: ${booking.room.status || 'N/A'}`);
          doc.text(`   Room Type: ${booking.room.type || 'N/A'}`);
          doc.text(`   Price: ${booking.room.price ? `$${booking.room.price.toFixed(2)}` : 'N/A'}`);
          doc.text(`   Guest Name: ${guestName} (${booking.status})`);
          doc.text(`   Check-In: ${booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) : 'N/A'}`);
          doc.moveDown(0.5);
        }
      });
    }

    // Footer
    doc.on('pageAdded', () => {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#555555')
        .text('Possible Tech Solutions Hotel', 50, doc.page.height - 50, { align: 'center' });
      doc.text(`Page ${doc.bufferedPageRange().start + 1}`, doc.page.width - 100, doc.page.height - 50);
    });

    doc.on('data', () => console.log('PDF data chunk sent'));
    doc.on('end', () => {
      console.log('Occupancy PDF generation completed');
      res.end();
    });

    doc.end();
  } catch (err) {
    console.error('Error generating occupancy PDF:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
});

router.get('/financial/pdf', authMiddleware, async (req, res) => {
  try {
    console.log('Starting PDF generation for financial report');

    // Fetch all data
    const bookings = await Booking.find(); // Include all bookings
    const guests = await Guest.find();
    const rooms = await Room.find().select('roomNumber status type price');

    // Enhance bookings with room and guest details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const room = booking.room ? await Room.findById(booking.room).select('roomNumber status type price') : null;
        // Match guest using guestName from Booking with name from Guest
        const guest = guests.find(g => g.name === booking.guestName) || { name: booking.guestName || 'Unknown Guest' };
        return { ...booking.toObject(), room, guest };
      })
    );

    console.log('Bookings with Details:', JSON.stringify(bookingsWithDetails, null, 2));
    console.log('Guests:', JSON.stringify(guests, null, 2));
    console.log('Rooms:', JSON.stringify(rooms, null, 2));

    // Calculate revenue (consider all bookings with valid dates)
    const revenue = bookingsWithDetails.reduce((total, booking) => {
      if (booking.room && booking.room.price && booking.checkIn && booking.checkOut) {
        const days = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
        console.log(`Revenue for ${booking.guestName}: $${booking.room.price} * ${days} days = $${booking.room.price * days}`);
        return total + (booking.room.price * days);
      }
      console.log(`Skipping revenue for ${booking.guestName || 'unknown'}: missing room or dates`, booking);
      return total;
    }, 0);

    console.log('Calculated Revenue:', revenue);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="financial_report.pdf"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Initialize PDF document
    const doc = new PDFDocument({
      info: { Title: 'Financial Report', Author: 'Possible Tech Solutions Hotel' },
      size: 'A4',
      margin: 50,
    });

    doc.pipe(res);

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('#2e2e2e')
      .text('Possible Tech Solutions Hotel', { align: 'center' });
    doc
      .fontSize(18)
      .text('Financial Report', { align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#555555')
      .text(`Generated on: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#2e2e2e')
      .text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text(`Total Revenue: $${revenue.toFixed(2)}`);
    doc.text(`Total Bookings: ${bookingsWithDetails.length}`);
    doc.moveDown(2);

    // Booking and Guest Details (Text Format)
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Booking and Guest Details', { underline: true });
    doc.moveDown(0.5);

    if (bookingsWithDetails.length === 0) {
      doc.font('Helvetica').fontSize(12).text('No booking or guest data available.');
    } else {
      bookingsWithDetails.forEach((booking, index) => {
        if (booking.room) {
          const guestName = booking.guest.name;
          const days = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
          const price = booking.room && booking.room.price ? `$${booking.room.price * days}` : 'N/A';
          doc
            .font('Helvetica')
            .fontSize(12)
            .text(`${index + 1}. Room Number: ${booking.room.roomNumber || 'N/A'}`);
          doc.text(`   Booking Guest: ${booking.guestName || 'N/A'}`);
          doc.text(`   Guest Name: ${guestName || 'N/A'}`);
          doc.text(`   Total Price: ${price}`);
          doc.text(`   Check-In: ${booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) : 'N/A'}`);
          doc.text(`   Check-Out: ${booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) : 'N/A'}`);
          doc.moveDown(0.5);
        }
      });
    }

    // Footer
    doc.on('pageAdded', () => {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#555555')
        .text('Possible Tech Solutions Hotel', 50, doc.page.height - 50, { align: 'center' });
      doc.text(`Page ${doc.bufferedPageRange().start + 1}`, doc.page.width - 100, doc.page.height - 50);
    });

    doc.on('data', () => console.log('PDF data chunk sent'));
    doc.on('end', () => {
      console.log('Financial PDF generation completed');
      res.end();
    });

    doc.end();
  } catch (err) {
    console.error('Error generating financial PDF:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
});

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().select('roomNumber status type price');
    const bookings = await Booking.find();
    const guests = await Guest.find();
    const bookingsWithRooms = await Promise.all(
      bookings.map(async booking => {
        const room = booking.room ? await Room.findById(booking.room).select('roomNumber status type price') : null;
        return { ...booking.toObject(), room };
      })
    );
    res.json({
      rooms,
      bookings: bookingsWithRooms,
      guests,
    });
  } catch (err) {
    console.error('Error fetching data:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;