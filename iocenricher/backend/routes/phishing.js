const express = require('express');
const router = express.Router();
const { parseEml } = require('../services/phishingService');

// POST /api/phishing/parse
// Body: { emlContent: string }
router.post('/phishing/parse', (req, res) => {
  const { emlContent } = req.body;

  if (!emlContent || typeof emlContent !== 'string') {
    return res.status(400).json({ error: 'emlContent is required and must be a string.' });
  }

  // Basic sanity check: .eml files contain at least one header-like line
  if (!/^[\w-]+:\s/m.test(emlContent)) {
    return res.status(400).json({ error: 'Content does not appear to be a valid EML file.' });
  }

  try {
    const result = parseEml(emlContent);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to parse EML content.' });
  }
});

module.exports = router;
