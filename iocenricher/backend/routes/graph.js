const express = require('express');
const router = express.Router();
const { buildGraph } = require('../services/graph');

// GET /api/graph?indicator=x
router.get('/graph', async (req, res) => {
  const { indicator } = req.query;
  if (!indicator) return res.status(400).json({ error: 'indicator required' });
  try {
    const graph = await buildGraph(indicator.trim());
    res.json(graph);
  } catch (err) {
    console.error('[Graph route]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
