const { Router } = require('express');
const multer = require('multer');
const { extractResume } = require('../controllers/resumeController');

// memoryStorage: file lives in RAM only for the duration of this request.
// Never touches disk — no cleanup needed, no stored user data.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard limit at the multer level too
});

const router = Router();

// upload.single('resume') tells multer to look for a field named "resume" in the form data
router.post('/extract', upload.single('resume'), extractResume);

module.exports = router;
