const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['single', 'double', 'suite'] },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'occupied'], default: 'available' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);