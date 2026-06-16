const { Router } = require('express');
const { body } = require('express-validator');
const { generate } = require('../controllers/generateController');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

// Validation rules — these protect us from:
// 1. Empty requests (no skills = no context = useless suggestions)
// 2. Malformed skills array (we need name + level per skill)
// 3. Missing target role (the most important field for specificity)
const validateGenerate = [
  body('skills')
    .isArray({ min: 1, max: 10 })
    .withMessage('Add between 1 and 10 skills'),
  body('skills.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each skill must have a name')
    .isLength({ max: 60 })
    .withMessage('Skill names must be under 60 characters'),
  body('skills.*.level')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Skill level must be beginner, intermediate, or advanced'),
  body('targetRole')
    .trim()
    .notEmpty()
    .withMessage('Target role is required')
    .isLength({ max: 100 })
    .withMessage('Target role is too long'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name is too long'),
  body('timeAvailable')
    .trim()
    .notEmpty()
    .withMessage('Time available is required')
    .isLength({ max: 40 })
    .withMessage('Time available is too long'),
];

router.post('/', optionalAuth, validateGenerate, generate);

module.exports = router;
