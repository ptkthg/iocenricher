const express = require('express');
const router = express.Router();
const { buildGraph } = require('../services/graph');
const { normalizeIndicator } = require('../services/indicator');

// GET /api/graph?indicator=x
router.get('/graph', async (req, res) => {
  let indicator;
  try { indicator = normalizeIndicator(req.query.indicator).indicator; }
  catch { return res.status(400).json({ error: 'Indicador inválido.' }); }
  try {
    const graph = await buildGraph(indicator);
    res.json(graph);
  } catch (err) {
    console.error('[Graph route]', err.message);
    res.status(502).json({ error: 'Não foi possível consultar o grafo.' });
  }
});

module.exports = router;
