const { GoogleGenerativeAI } = require('@google/generative-ai');

// TEMPORARY revert to flash-lite: gemini-2.5-flash free tier is only 20 requests/day,
// which takes the live app down. flash-lite has a far higher free daily limit.
// Flip back to 'gemini-2.5-flash' once billing (paid tier) is enabled — this one
// line is the only change needed (centralized on purpose).
const MODEL_NAME = 'gemini-2.5-flash-lite';
const API_VERSION = 'v1';

// ─── Key rotation ──────────────────────────────────────────────────────────────
// Up to 3 keys, each from a SEPARATE Google project so their daily free quotas are
// additive. On a 429 (quota/rate-limit) we fail over to the next key; any other
// error fails immediately (it would fail identically on every key). Callers
// (aiService/resumeService) never know rotation exists — they just await
// generateContent(request).

// Read keys in priority order, dropping any that are absent/blank. A missing key
// is skipped gracefully — no startup crash. Order is preserved.
const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
]
  .map((k) => (k || '').trim())
  .filter(Boolean);

// Pre-build one model instance per key, once at load — reused for every call.
const models = apiKeys.map((key) =>
  new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL_NAME }, { apiVersion: API_VERSION })
);

console.log(`[gemini] ${models.length} API key(s) loaded for model ${MODEL_NAME}`);

// True for a quota / rate-limit error worth failing over to the next key.
function isRateLimit(err) {
  return /\b429\b|Too Many Requests|RESOURCE_EXHAUSTED|quota/i.test(String(err?.message || ''));
}

// Core failover loop. Kept as a pure function (models passed in) so it can be
// unit-tested with stub models. Tries each model in order: success returns; a 429
// fails over to the next; any other error throws immediately; all-429 throws ONE
// clean error — intentionally NOT 429-worded, so the outer generateWithRetry treats
// it as terminal and doesn't pointlessly re-loop every key (daily quotas don't
// refill in seconds).
async function generateWithFailover(modelList, request) {
  if (modelList.length === 0) {
    throw new Error('No Gemini API keys configured — set GEMINI_API_KEY in the environment.');
  }

  for (let i = 0; i < modelList.length; i++) {
    try {
      return await modelList[i].generateContent(request);
    } catch (err) {
      if (isRateLimit(err)) {
        if (i === modelList.length - 1) {
          console.error(`[gemini] all ${modelList.length} key(s) rate-limited — giving up`);
          throw new Error('All Gemini API keys are rate-limited. Please try again later.');
        }
        console.warn(`[gemini] key ${i + 1} rate-limited (429) → failing over to key ${i + 2}`);
        continue;
      }
      throw err; // non-quota error: would fail identically on every key
    }
  }
}

// Single entry point for EVERY Gemini call in the app. Model name, apiVersion, and
// key rotation all live here — callers stay oblivious.
async function generateContent(request) {
  return generateWithFailover(models, request);
}

// generateWithFailover is exported for unit tests only; app code uses generateContent.
module.exports = { generateContent, generateWithFailover };
