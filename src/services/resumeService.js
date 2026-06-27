const pdfParse = require('pdf-parse');
// Shared Gemini client — single source of truth for key/model/apiVersion.
const gemini = require('./geminiClient');
// Reuse the robust AI-JSON parser (handles fences, preamble, raw newlines in
// strings, trailing commas) instead of a brittle JSON.parse.
const { parseAIJson } = require('./aiService');

// Step 1: PDF buffer → raw text
// pdf-parse reads the binary buffer multer gives us and returns plain text.
// Real resumes are messy — columns, tables, icons — pdf-parse handles most of it.
async function extractTextFromPDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text?.trim();
  if (!text || text.length < 50) {
    throw new Error('Could not read text from this PDF. Try copy-pasting your skills manually.');
  }
  return text;
}

// Step 2: Raw resume text → structured skills + role
// The prompt is careful about inferred levels:
//   - "built X in production / led team / architected" → advanced
//   - "built personal project / internship work" → intermediate
//   - "completed course / familiar with / learning" → beginner
// We also ask for a target role because many resumes have an objective/summary line.
// skillGaps: what this person is missing for their likely target role.
function buildExtractionPrompt(resumeText, targetRole) {
  const roleContext = targetRole
    ? `The student is targeting a "${targetRole}" role. Use this to assess skill gaps.`
    : 'Infer the most likely target role from the resume content.';

  return `You are a technical recruiter and career mentor reviewing a student's resume.

${roleContext}

RESUME TEXT:
---
${resumeText.slice(0, 6000)}
---

Extract all technical skills mentioned or clearly implied by the projects and experience described.

For each skill, infer the level:
- "advanced": built something in production, led others, architected systems using this skill
- "intermediate": built a complete personal/internship project using this skill
- "beginner": completed a course, listed as familiar, used briefly in one small task

Also identify:
- The most likely target role based on the resume
- 2-3 specific technical skill gaps relative to that target role

Return ONLY valid JSON, no markdown, no explanation:
{
  "skills": [
    { "name": "skill name", "level": "beginner | intermediate | advanced" }
  ],
  "inferredRole": "most likely target role (e.g. Frontend Developer, Backend Developer)",
  "skillGaps": "2-3 specific skills they should learn, as one sentence"
}

Rules:
- Include only technical skills (languages, frameworks, tools, databases, concepts)
- Skip soft skills, languages spoken, certifications without technical depth
- Deduplicate — if React and ReactJS both appear, return one entry
- Return at most 10 skills — pick the most prominent ones
- If the resume text is too garbled to extract meaningful skills, return an empty skills array`;
}

async function extractSkillsFromResume(buffer, targetRole) {
  const resumeText = await extractTextFromPDF(buffer);
  const prompt = buildExtractionPrompt(resumeText, targetRole);

  const result = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3, // low temp — extraction should be factual, not creative
      // gemini-2.5-flash is a THINKING model: it spends output tokens on internal
      // reasoning BEFORE the answer. 1024 was fine on flash-lite but flash's
      // thinking exhausted it (finishReason MAX_TOKENS) and truncated the JSON.
      // 4096 leaves room for thinking + the full JSON. (thinkingConfig to disable
      // thinking is rejected on the v1 endpoint, so headroom is the only lever.)
      maxOutputTokens: 4096,
    },
  });

  const raw = result.response.text();
  const parsed = parseAIJson(raw);

  return {
    skills:       parsed.skills       || [],
    inferredRole: parsed.inferredRole || '',
    skillGaps:    parsed.skillGaps    || '',
  };
}

module.exports = { extractSkillsFromResume };
