const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, googleAuth, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const validateRegister = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', googleAuth);
router.get('/me', requireAuth, me);
router.post('/logout', logout);

module.exports = router;
