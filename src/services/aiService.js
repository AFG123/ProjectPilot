// All Gemini setup (key, model name, apiVersion) lives in geminiClient — the
// single source of truth. Task 3 (key rotation) plugs in there, not here.
const gemini = require('./geminiClient');

// Maps timeAvailable string to a rough hours budget so the prompt can calibrate
function parseTimeBudget(timeAvailable) {
  const t = timeAvailable.toLowerCase();
  const weekMatch = t.match(/(\d+)\s*week/);
  const monthMatch = t.match(/(\d+)\s*month/);
  if (weekMatch)  return `~${parseInt(weekMatch[1]) * 40} hours total`;
  if (monthMatch) return `~${parseInt(monthMatch[1]) * 120} hours total`;
  return `${timeAvailable} of available time`;
}

function buildPrompt(userInput) {
  const { skills, targetRole, company, timeAvailable } = userInput;

  const skillsList = skills.map((s) => `${s.name} (${s.level})`).join(', ');
  const timeBudget = parseTimeBudget(timeAvailable);

  const companyLine = company
    ? `Target company: ${company}. Tailor projects to what ${company}'s recruiters specifically value.`
    : 'No specific company — suggest projects that work well for product-based companies in India.';

  return `You are a senior software engineer and placement mentor helping an Indian CS/IT student stand out in campus placements.

STUDENT PROFILE:
- Skills: ${skillsList}
- Target role: ${targetRole}
- ${companyLine}
- Time available: ${timeAvailable} (${timeBudget})

YOUR JOB:
Generate exactly 5 project ideas. But before you suggest anything, run every candidate idea through this two-part filter:

FILTER 1 — BUILDABILITY (most important):
A project the student cannot realistically finish is worth ZERO — it will sit half-done on GitHub and hurt them.
- Given their skill levels and time budget, will a real student actually complete this?
- If the answer is "maybe if everything goes perfectly", reject it. Choose something one level simpler.
- DO NOT suggest: distributed systems, ML infrastructure, blockchain, microservices architectures, or anything requiring 3+ unfamiliar technologies at once — unless the student is advanced AND has 1+ month.
- A finished, polished simple project beats an unfinished complex one every time.

FILTER 2 — ROLE RELEVANCE:
- Look at what actually appears in job descriptions for "${targetRole}" roles in Indian product companies.
- Suggest projects that demonstrate the exact skills hiring managers screen for in that role.
- NOT what sounds impressive in theory — what actually gets asked about in interviews for this role.

ADDITIONAL RULES:
- DO NOT suggest: todo apps, weather apps, calculators, basic CRUD apps with no real logic, e-commerce clones.
- DO suggest: projects that solve a real problem a developer faces, OR something the student could demo in 5 minutes and explain every line of code.
- estimatedTime must be honest and fit within the student's stated time budget. If a project needs 3 weeks and they have 1 week, don't suggest it.
- Difficulty must match skill levels: a "beginner" in a skill should not be the primary engineer on a complex feature using that skill.

SKILL GAP ANALYSIS:
Also analyze the student's skills vs what "${targetRole}" roles commonly require. Identify 1-3 specific missing skills or concepts they should learn next. Be specific (e.g. "system design basics, SQL query optimization" not "backend skills").

Respond with ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON:
{
  "skillGap": "Based on your profile, you'd benefit from learning: [specific skill1], [specific skill2] — commonly expected for ${targetRole} roles.",
  "projects": [
    {
      "name": "Project name (clear and professional, not buzzword-heavy)",
      "description": "2-3 sentences: what it does, the real problem it solves, and one concrete technical detail that shows depth",
      "techStack": ["only techs the student already knows or can learn in a day"],
      "whyItImpresses": "1-2 sentences: specifically why a ${targetRole} interviewer at a product company pauses on this resume item",
      "difficulty": "Easy | Medium | Hard",
      "estimatedTime": "realistic estimate that fits within ${timeAvailable}"
    }
  ]
}`;
}

// Robustly extract the JSON object from an AI response.
// Gemini sometimes wraps JSON in markdown fences or adds preamble text.
// Slicing from the first { to the last } handles all of those cases.
function extractJSON(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No valid JSON found in AI response');
  }
  return raw.slice(start, end + 1);
}

// Last-resort repair for JSON the model *almost* got right. Deep dives embed
// real code snippets, and code is the hardest thing to keep valid inside JSON —
// the model occasionally leaves a `// comment`, a raw newline, or a bad `\`
// escape inside a string, which makes JSON.parse throw. This single-pass
// sanitizer fixes exactly those cases while preserving the content:
//   - drops // and /* */ comments that sit OUTSIDE strings (JSON has no comments)
//   - escapes raw control chars (newline/tab/CR) that appear INSIDE strings
//   - repairs invalid backslash escapes (e.g. a Windows path's \U) by escaping
//     the backslash so the text survives
//   - removes trailing commas before } or ]
// It only ever runs after the normal parse fails, so the happy path is untouched.
function repairJson(s) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === '\\') {
        const next = s[i + 1];
        if ('"\\/bfnrt'.includes(next)) { out += ch + next; i++; continue; }
        if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
          out += s.slice(i, i + 6); i += 5; continue;
        }
        out += '\\\\'; // invalid escape → keep a literal backslash, reprocess next char
        continue;
      }
      if (ch === '"') { inStr = false; out += ch; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t'
          : '\\u' + code.toString(16).padStart(4, '0');
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === '/' && s[i + 1] === '/') { i += 2; while (i < s.length && s[i] !== '\n') i++; continue; }
    if (ch === '/' && s[i + 1] === '*') {
      i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i++; continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '}' || s[j] === ']') continue; // trailing comma → drop
      out += ch; continue;
    }
    out += ch;
  }
  return out;
}

// Parse model JSON, retrying once through the repair pass if the raw parse fails.
function parseAIJson(raw) {
  const sliced = extractJSON(raw);
  try {
    return JSON.parse(sliced);
  } catch (firstErr) {
    try {
      return JSON.parse(repairJson(sliced));
    } catch {
      throw firstErr; // surface the original, more meaningful error
    }
  }
}

// True for errors worth retrying: transient server/overload/network blips. We do
// NOT retry on 4xx like 400/401/403 (those won't fix themselves).
function isTransient(err) {
  const m = String(err?.message || '');
  return /\b(429|500|502|503|504)\b/.test(m) ||
    /overload|unavailable|temporarily|timeout|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(m);
}

// Gemini blocks a response with "RECITATION" when it judges the output too close
// to training material. It's content-based and NON-deterministic — re-sending the
// same request usually samples a completion that isn't blocked. So we re-roll once.
function isRecitation(err) {
  return /RECITATION/i.test(String(err?.message || ''));
}

// Wrap a generateContent call with exponential backoff so a single Gemini 503
// (their servers momentarily busy) doesn't surface to the user as a hard failure.
async function generateWithRetry(request, { retries = 2, baseDelay = 700 } = {}) {
  let transientAttempt = 0;       // counts transient retries only (drives the backoff)
  let usedRecitationReroll = false; // RECITATION gets exactly one immediate re-roll

  while (true) {
    try {
      return await gemini.generateContent(request);
    } catch (err) {
      // RECITATION: re-send once immediately (no delay — it's content, not load).
      // Doesn't spend a transient attempt.
      if (isRecitation(err) && !usedRecitationReroll) {
        usedRecitationReroll = true;
        continue;
      }
      // Transient server/network blips: exponential backoff (700ms, 1400ms), up to `retries`.
      if (isTransient(err) && transientAttempt < retries) {
        await new Promise((r) => setTimeout(r, baseDelay * 2 ** transientAttempt));
        transientAttempt++;
        continue;
      }
      throw err;
    }
  }
}

async function generateProjects(userInput) {
  const prompt = buildPrompt(userInput);

  const result = await generateWithRetry({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 8192,
    },
  });

  const raw = result.response.text();
  const parsed = parseAIJson(raw);

  if (!parsed.projects || !Array.isArray(parsed.projects)) {
    throw new Error('AI returned unexpected format');
  }

  return {
    projects: parsed.projects,
    skillGap: parsed.skillGap || null,
  };
}

// ─── DEEP DIVE ────────────────────────────────────────────────────────────────
// This is your prompt with two additions: target_role and available_time.
// target_role makes interview questions role-specific ("for a Backend Developer
// at Zoho, they'd ask...") instead of generic. available_time calibrates the
// build_order step estimates so they're realistic, not wishful.

function buildDeepDivePrompt({ project, targetRole, skills, timeAvailable }) {
  const skillsList = skills.map((s) => `${s.name} (${s.level})`).join(', ');
  const experienceLevel = skills.some(s => s.level === 'advanced')
    ? 'intermediate-advanced'
    : skills.some(s => s.level === 'intermediate')
    ? 'beginner-intermediate'
    : 'beginner';

  return `You are a senior software engineer mentoring a ${experienceLevel} student who has NEVER built this type of project before. They get stuck easily and need to be told HOW, not just WHAT. Your plan must let them build it MOSTLY WITHOUT leaving this page — assume that every time you say "do X" without showing how, they get stuck and give up.

PROJECT DETAILS:
- Name: ${project.name}
- Description: ${project.description}
- Tech stack: ${project.techStack.join(', ')}
- Student's experience level: ${experienceLevel}
- Student's skills: ${skillsList}
- Target role: ${targetRole}
- Time available: ${timeAvailable}

Return JSON with this EXACT structure:

{
  "prerequisites": [
    { "concept": "short name", "why": "one line: why it matters for THIS project", "search": "a YouTube/Google search query to learn it fast" }
  ],
  "setup": {
    "tools": ["exact tools + versions to install, e.g. 'Node.js 18+', 'Postman'"],
    "commands": ["exact terminal commands IN ORDER to scaffold the project and install dependencies"],
    "run": "the single command to run it + exactly what they should see when it works"
  },
  "folder_structure": {
    "backend": ["path — one-line purpose"],
    "frontend": ["path — one-line purpose"]
  },
  "build_order": [
    {
      "step": 1,
      "title": "short title",
      "estimated_time": "realistic for a ${experienceLevel}, e.g. '2-3 hours'",
      "goal": "one line: what concretely works after this step is done",
      "what_to_build": "specific description of what to create in this step",
      "how": ["plain-English instructions and terminal commands ONLY, in order. NEVER put multi-line source code or code fences here — all code goes in the 'code' field below."],
      "code": { "file": "path/to/file", "snippet": "a SHORT code snippet (max ~12 lines) for the TRICKIEST part of THIS step only — the pattern they can't guess. NOT the whole file. Raw code only, no markdown code fences. Use null if the step genuinely needs no code." },
      "concepts": [ { "term": "name", "explain": "one plain-English line a total beginner understands" } ],
      "why_it_works": "OPTIONAL — include ONLY when this step introduces non-trivial syntax, a specific library method, or a pattern a ${experienceLevel} student would NOT already know. 2-3 plain-English sentences on the UNDERLYING LOGIC: why this code actually produces the right result, not just what it is. Omit the field entirely (or use null) for trivial steps or anything built only from things they already know.",
      "verify": "exactly how to confirm this step works — a command to run or button to click + what they should see (their definition of done)",
      "if_stuck": "the 1-2 most common errors on this step + the exact fix for each, and what to search if they're still stuck",
      "files_involved": ["file paths touched in this step"]
    }
  ],
  "api_routes": [
    { "method": "GET/POST/etc", "path": "/api/...", "purpose": "one line" }
  ],
  "database_schema": [
    { "table_name": "...", "key_columns": ["col: type — purpose"] }
  ],
  "common_mistakes": ["2-3 real gotchas specific to THIS project, not generic advice"],
  "interview_questions": ["3-4 ${targetRole}-specific questions answerable from having built this project"]
}

RULES:
- prerequisites: 2-4 concepts to skim BEFORE coding, so they don't hit an unknown term and stall.
- setup: this is step zero — get them from an empty folder to a running skeleton. Be exact with commands.
- build_order: 6-8 steps, each finishable in one sitting, totalling roughly ${timeAvailable}. Order them so the student ALWAYS has something runnable — setup, then ONE tiny end-to-end slice, then expand.
- Be concrete, never vague: not "set up authentication" but "create POST /api/auth/register that hashes the password with bcrypt and inserts a row into the users table".
- "code.snippet" is the single highest-value field — give the hard 20% they can't easily guess, keep it short (max ~12 lines), and only where it genuinely helps (null otherwise). ALL code must live here, never inside "how". Put the WORDS in "how" and the CODE in "code".
- "concepts" MUST explain every new term you introduce (bcrypt, JWT, WebSocket, middleware, etc.) in plain English. For an advanced student you may keep them brief.
- "why_it_works" is SELECTIVE — most steps will NOT have it. Add it only when a step introduces something genuinely new to a ${experienceLevel} student: a non-obvious library method (e.g. .reduce, a regex, useEffect's dependency array), a syntax pattern they likely haven't met, or a design/algorithm choice that isn't self-evident. Explain the MECHANISM — why this approach yields the correct result — like a senior dev explaining to a junior: simple, no jargon-on-jargon, assume zero prior knowledge of THAT specific thing even if the rest of the stack is familiar. It is DIFFERENT from "concepts": concepts NAMES and defines a term in one line; why_it_works explains why the actual code in THIS step works. Do NOT add it to trivial steps (creating a folder, running an already-explained command, repeating a pattern from an earlier step) — keep the output lean. Hard cap: 2-3 sentences, never longer.
- "verify" must be something they can actually run or click — give them a definition of done for every step.
- Calibrate detail to a ${experienceLevel}: more hand-holding, concepts, and snippets for beginners; terser for advanced.
- If the project is frontend-only, set "database_schema" to [] and "api_routes" to [].
- Return JSON ONLY. No markdown fences, no preamble, no text outside the JSON.`;
}

async function generateDeepDive(input) {
  const prompt = buildDeepDivePrompt(input);

  const result = await generateWithRetry({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6, // lower temp = more consistent, structured output
      maxOutputTokens: 16384, // richer "full unblock" plan needs headroom or JSON truncates
    },
  });

  const raw = result.response.text();
  return parseAIJson(raw);
}

// parseAIJson is exported so the resume-extraction path reuses the SAME robust
// parser (extractJSON + repairJson fallback) instead of a fragile JSON.parse.
module.exports = { generateProjects, generateDeepDive, parseAIJson };
