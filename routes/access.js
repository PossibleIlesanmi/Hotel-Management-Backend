// server/routes/access.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Validate 4-digit code
router.post('/validate', (req, res) => {
  const { code } = req.body;

  if (!code || code !== process.env.ADMIN_CODE) {
    return res.status(401).json({ message: 'Invalid code' });
  }

  const token = jwt.sign({ access: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;