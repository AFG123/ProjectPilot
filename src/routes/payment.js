const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

const router = Router();

// Both endpoints require a logged-in user — we tie the payment to req.user.userId.
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

module.exports = router;
