const express = require('express');
const { 
  placeBet, 
  getRoomBets, 
  getMyBet 
} = require('../controllers/bets');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes are protected
router.post('/', protect, placeBet);
router.get('/', protect, getRoomBets);
router.get('/me', protect, getMyBet);

module.exports = router; 