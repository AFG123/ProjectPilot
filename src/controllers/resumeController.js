const { extractSkillsFromResume } = require('../services/resumeService');

async function extractResume(req, res) {
  // multer puts the file on req.file — buffer is in req.file.buffer
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF files are supported.' });
  }

  // 5MB limit — most resumes are under 500KB, but some have embedded images
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Please upload a PDF under 5MB.' });
  }

  const targetRole = req.body.targetRole || '';

  try {
    const result = await extractSkillsFromResume(req.file.buffer, targetRole);
    return res.json(result);
  } catch (err) {
    console.error('Resume extraction error:', err.message);
    // Return a user-friendly message, not a raw stack trace
    return res.status(500).json({
      error: err.message.includes('Could not read')
        ? err.message
        : 'Failed to parse resume. Please try again or enter skills manually.',
    });
  }
}

module.exports = { extractResume };
