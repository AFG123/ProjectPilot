const { validationResult } = require('express-validator');
const { generateProjects } = require('../services/aiService');
const pool = require('../db');

async function generate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { skills, targetRole, company, timeAvailable } = req.body;

  try {
    const { projects, skillGap } = await generateProjects({ skills, targetRole, company, timeAvailable });

    // Fire-and-forget DB save — never delays the response to the user.
    // req.user is set by optionalAuth middleware when a valid JWT is sent.
    if (req.user?.userId) {
      pool.query(
        `INSERT INTO generations (user_id, target_role, skills, time_available, company, projects, skill_gap)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.userId, targetRole, JSON.stringify(skills), timeAvailable, company || null, JSON.stringify(projects), skillGap || null]
      ).catch(err => console.error('Failed to save generation:', err.message));
    }

    return res.json({ projects, skillGap });
  } catch (err) {
    console.error('Generation error:', err.message);
    return res.status(500).json({ error: 'Failed to generate projects. Please try again.' });
  }
}

module.exports = { generate };
