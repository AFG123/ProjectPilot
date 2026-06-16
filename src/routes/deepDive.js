const { Router } = require('express');
const { body } = require('express-validator');
const { deepDive } = require('../controllers/deepDiveController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Validate the project object and user profile are present before wasting an AI call
const validateDeepDive = [
  body('project.name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 200 }).withMessage('Project name is too long'),
  body('project.description').trim().notEmpty().withMessage('Project description is required').isLength({ max: 2000 }).withMessage('Project description is too long'),
  body('project.techStack').isArray({ min: 1, max: 30 }).withMessage('Tech stack is required'),
  body('targetRole').trim().notEmpty().withMessage('Target role is required').isLength({ max: 100 }).withMessage('Target role is too long'),
  body('skills').isArray({ min: 1, max: 20 }).withMessage('Skills are required'),
];

// Deep dive is the paid product now — you must be signed in. Non-paid users get
// exactly ONE free deep dive (enforced in the controller); paid users get all.
router.post('/', requireAuth, validateDeepDive, deepDive);

module.exports = router;
