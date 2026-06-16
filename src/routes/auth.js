const { Router } = require('express');
const { googleAuth, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/google', googleAuth);
router.get('/me', requireAuth, me);
router.post('/logout', logout);

module.exports = router;
