const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Validate and set CORS origin
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
console.log('Configured FRONTEND_URL:', frontendUrl); // Debug log
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === frontendUrl) {
      callback(null, frontendUrl);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
console.log('Loading routes...');
app.use('/api/access', require('./routes/access'));
console.log('Loaded /api/access');
app.use('/api/dashboard', require('./routes/dashboard'));
console.log('Loaded /api/dashboard');
app.use('/api/bookings', require('./routes/bookings'));
console.log('Loaded /api/bookings');
app.use('/api/guests', require('./routes/guests'));
console.log('Loaded /api/guests');
app.use('/api/reports', require('./routes/reports'));
console.log('Loaded /api/reports');
app.use('/api/rooms', require('./routes/rooms'));
console.log('Loaded /api/rooms');

// Ensure no catch-all route interferes
app.use((req, res, next) => {
  console.log(`No route matched for ${req.path}`);
  res.status(404).send('Route not found');
});

// Test route
app.get('/', (req, res) => {
  res.send('Hotel Management Backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});