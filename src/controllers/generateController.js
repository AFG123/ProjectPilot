const { validationResult } = require('express-validator');
const { generateProjects } = require('../services/aiService');
const { buildCacheKey, getCached, setCached } = require('../services/generationCache');
const pool = require('../db');

async function generate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { skills, targetRole, company, timeAvailable } = req.body;
  const cacheKey = buildCacheKey({ skills, targetRole, company, timeAvailable });

  try {
    let projects, skillGap, cached = false;

    // Cache read is best-effort: a cache failure must NEVER break generation,
    // so we swallow its error and fall through to a live Gemini call.
    let hit = null;
    try {
      hit = await getCached(cacheKey);
    } catch (err) {
      console.error('[cache] read failed, falling through to Gemini:', err.message);
    }

    if (hit) {
      ({ projects, skillGap } = hit);
      cached = true;
      console.log('[cache] HIT', cacheKey.slice(0, 12));
    } else {
      ({ projects, skillGap } = await generateProjects({ skills, targetRole, company, timeAvailable }));
      console.log('[cache] MISS', cacheKey.slice(0, 12));
      // Fire-and-forget cache write — never delays the user's response.
      setCached(cacheKey, { projects, skillGap })
        .catch(err => console.error('[cache] write failed:', err.message));
    }

    // Fire-and-forget per-user history save — happens on HIT and MISS alike so
    // "My Projects" stays complete even when the AI wasn't called.
    // req.user is set by optionalAuth middleware when a valid JWT is sent.
    if (req.user?.userId) {
      pool.query(
        `INSERT INTO generations (user_id, target_role, skills, time_available, company, projects, skill_gap)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.userId, targetRole, JSON.stringify(skills), timeAvailable, company || null, JSON.stringify(projects), skillGap || null]
      ).catch(err => console.error('Failed to save generation:', err.message));
    }

    return res.json({ projects, skillGap, cached });
  } catch (err) {
    console.error('Generation error:', err.message);
    return res.status(500).json({ error: 'Failed to generate projects. Please try again.' });
  }
}

module.exports = { generate };
