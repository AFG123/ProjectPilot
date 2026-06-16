const pool = require('../db');

async function getGenerations(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, target_role, skills, time_available, company, projects, skill_gap, created_at
       FROM generations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.userId]
    );

    // Which deep dive this user has unlocked, so the UI can badge each project.
    // Paid users have everything unlocked (the frontend uses isPaid for that);
    // a non-paid user has exactly one — their free_deep_dive_project.
    let freeDeepDiveProject = null;
    try {
      const u = await pool.query(
        'SELECT free_deep_dive_project FROM users WHERE id = $1',
        [req.user.userId]
      );
      freeDeepDiveProject = u.rows[0]?.free_deep_dive_project ?? null;
    } catch (err) {
      console.error('Free deep dive lookup error:', err.message); // non-fatal
    }

    return res.json({ generations: rows, freeDeepDiveProject });
  } catch (err) {
    console.error('Fetch generations error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch your saved generations.' });
  }
}

module.exports = { getGenerations };
