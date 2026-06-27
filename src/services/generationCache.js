// Global, cross-user cache for the 5-ideas generation. The deep-dive cache is
// per-user (plans are personalised); these idea lists are NOT — two students with
// the same skills+role+company+time can safely share the same 5 ideas, so we
// cache once and skip the (now pricier) gemini-2.5-flash call on every repeat.
//
// Correctness rule: the key MUST cover every input the prompt actually uses, and
// must be normalized so equivalent inputs collide. Skill LEVEL is part of the key,
// so a beginner and an advanced student never share a cache row.
const crypto = require('crypto');
const pool = require('../db');

const TTL_DAYS = 14; // how long a cached result is reused before it's regenerated for freshness

// Build a stable sha256 key from normalized inputs.
//   - skills: "name:level", lowercased, trimmed, SORTED → order-independent
//             ("React, Node" and "node, react" produce the same key)
//   - role/company/time: trimmed + lowercased; missing company → empty string
function buildCacheKey({ skills, targetRole, company, timeAvailable }) {
  const normSkills = (skills || [])
    .map((s) => `${String(s.name).trim().toLowerCase()}:${String(s.level).trim().toLowerCase()}`)
    .sort()
    .join('|');

  const canonical = [
    `skills=${normSkills}`,
    `role=${String(targetRole || '').trim().toLowerCase()}`,
    `company=${String(company || '').trim().toLowerCase()}`,
    `time=${String(timeAvailable || '').trim().toLowerCase()}`,
  ].join('||');

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// Return the cached result, or null on miss / expired (older than TTL_DAYS).
// On a hit we bump hit_count fire-and-forget — it's analytics only and must
// never delay or fail the read.
async function getCached(key) {
  const { rows } = await pool.query(
    `SELECT projects, skill_gap
       FROM generation_cache
      WHERE cache_key = $1
        AND created_at > now() - make_interval(days => $2)
      LIMIT 1`,
    [key, TTL_DAYS]
  );
  if (!rows.length) return null;

  pool
    .query(`UPDATE generation_cache SET hit_count = hit_count + 1 WHERE cache_key = $1`, [key])
    .catch((err) => console.error('[cache] hit_count bump failed:', err.message));

  return { projects: rows[0].projects, skillGap: rows[0].skill_gap };
}

// Upsert a fresh result. ON CONFLICT refreshes the row (and its created_at, so the
// TTL window restarts) — this both handles two identical requests racing and lets
// an expired-then-regenerated combo overwrite its stale row cleanly.
async function setCached(key, { projects, skillGap }) {
  await pool.query(
    `INSERT INTO generation_cache (cache_key, projects, skill_gap)
     VALUES ($1, $2, $3)
     ON CONFLICT (cache_key)
     DO UPDATE SET projects   = EXCLUDED.projects,
                   skill_gap  = EXCLUDED.skill_gap,
                   created_at = now()`,
    [key, JSON.stringify(projects), skillGap || null]
  );
}

module.exports = { buildCacheKey, getCached, setCached };
