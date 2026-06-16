const { validationResult } = require('express-validator');
const { generateDeepDive } = require('../services/aiService');
const pool = require('../db');

// Monetization model (Phase 2): all 5 project IDEAS are free. The DEEP DIVE is
// the paid product. A signed-in non-paid user gets exactly ONE free deep dive
// (to taste the value) — tracked by project name in users.free_deep_dive_project.
// Paid users get unlimited deep dives.
//
// Allowed when:
//   - user.isPaid                          → unlimited
//   - free_deep_dive_project IS NULL       → this becomes their one free deep dive
//   - free_deep_dive_project === this name → re-viewing the same free one (refresh-safe)
// Otherwise → 403 { locked: true } so the frontend shows the tease + unlock CTA.
//
// Caching: a successfully generated deep dive is stored per (user, project name)
// in the deep_dives table. Re-opening the same project serves the cached copy
// instead of calling Gemini again — cheaper and instant. A cache hit is always
// safe to serve: it only exists because the gate already passed once (the user
// was paid, or it was their free project), so we don't re-check the gate on hits.
async function deepDive(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { project, targetRole, skills, timeAvailable } = req.body;
  const { userId, isPaid } = req.user;
  const projectName = project.name;

  // 1. Cache hit → serve the stored plan, no Gemini call, no gate re-check.
  try {
    const { rows } = await pool.query(
      'SELECT content FROM deep_dives WHERE user_id = $1 AND project_name = $2',
      [userId, projectName]
    );
    if (rows[0]) {
      return res.json({ ...rows[0].content, free: !isPaid, cached: true });
    }
  } catch (err) {
    // Cache lookup failure shouldn't break the feature — fall through to generate.
    console.error('Deep dive cache lookup error:', err.message);
  }

  // 2. Cache miss → gate non-paid users to a single free deep dive.
  if (!isPaid) {
    let consumed = null;
    try {
      const { rows } = await pool.query(
        'SELECT free_deep_dive_project FROM users WHERE id = $1',
        [userId]
      );
      consumed = rows[0]?.free_deep_dive_project ?? null;
    } catch (err) {
      console.error('Deep dive gate lookup error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    const allowed = !consumed || consumed === projectName;
    if (!allowed) {
      return res.status(403).json({
        locked: true,
        reason: 'limit',
        error: "You've already used your free deep dive. Unlock every deep dive for ₹49.",
      });
    }
  }

  try {
    const result = await generateDeepDive({ project, targetRole, skills, timeAvailable });

    // Cache the result so future views of this project skip Gemini entirely.
    // ON CONFLICT keeps the first copy stable (re-runs are no-ops). Non-fatal.
    try {
      await pool.query(
        `INSERT INTO deep_dives (user_id, project_name, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, project_name) DO NOTHING`,
        [userId, projectName, result]
      );
    } catch (err) {
      console.error('Deep dive cache write error:', err.message);
    }

    // Consume the free slot only after a successful generation (don't burn it on
    // an error). The IS NULL guard makes this idempotent — re-viewing the same
    // project won't overwrite, and paid users are skipped entirely.
    if (!isPaid) {
      try {
        await pool.query(
          `UPDATE users SET free_deep_dive_project = $1
           WHERE id = $2 AND free_deep_dive_project IS NULL`,
          [projectName, userId]
        );
      } catch (err) {
        // Non-fatal: the student still gets their plan; worst case they get one
        // extra free deep dive. Log and move on.
        console.error('Deep dive consume error:', err.message);
      }
    }

    return res.json({ ...result, free: !isPaid });
  } catch (err) {
    console.error('Deep dive error:', err.message);
    return res.status(500).json({ error: 'Failed to generate deep dive. Please try again.' });
  }
}

module.exports = { deepDive };
