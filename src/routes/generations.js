const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getGenerations } = require('../controllers/generationsController');

const router = Router();

router.get('/', requireAuth, getGenerations);

module.exports = router;
