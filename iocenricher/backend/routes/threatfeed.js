const express = require('express');
const router = express.Router();
const { searchIP, getStats, getList } = require('../services/threatfeed');

// GET /api/threatfeed/search?ip=x.x.x.x
router.get('/search', async (req, res) => {
  const { ip } = req.query;
  if (!ip) return res.status(400).json({ error: 'IP required' });
  try {
    const match = await searchIP(ip);
    res.json({ ip, match: match || null, found: !!match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/threatfeed/list?page=1&perPage=20&search=&malware=
router.get('/list', async (req, res) => {
  const { page = 1, perPage = 20, search = '', malware = '' } = req.query;
  try {
    const result = await getList({ page: Number(page), perPage: Number(perPage), search, malware });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/threatfeed/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
