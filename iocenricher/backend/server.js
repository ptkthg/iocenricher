require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sharedLimit } = require('./services/shared-limit');
const enrichRoutes = require('./routes/enrich');
const threatfeedRoutes = require('./routes/threatfeed');
const graphRoutes = require('./routes/graph');
const graphAiRoutes = require('./routes/graphai');
const healthRoutes = require('./routes/health');
const notifyRoutes = require('./routes/notify');
const phishingRoutes = require('./routes/phishing');

const app = express();
axios.defaults.timeout = 12000;
const PORT = process.env.PORT || 3001;
if (process.env.VERCEL) app.set('trust proxy', 1);

app.use(cors());
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb', strict: true }));
app.use((error, req, res, next) => {
  if (!error) return next();
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição excede o limite de 256 KB.' });
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'JSON inválido.' });
  return res.status(400).json({ error: 'Requisição inválida.' });
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Muitas requisições. Aguarde 1 minuto.' }
});
app.use('/api/', limiter);
app.use('/api', sharedLimit('all', 60));
app.use('/api/enrich', sharedLimit('enrich', 10));
app.use('/api/graph/ai-summary', sharedLimit('graph-ai', 2));
app.use('/api/notify', sharedLimit('notify', 3));
const endpointLimit = max => rateLimit({
  windowMs: 60_000, max, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Limite de consultas atingido. Aguarde um minuto.' },
});
app.use('/api/enrich', endpointLimit(10));
app.use('/api/graph/ai-summary', endpointLimit(2));
app.use('/api/graph', endpointLimit(10));
app.use('/api/health/sources', endpointLimit(12));
app.use('/api/notify', endpointLimit(3));

app.use('/api', enrichRoutes);
app.use('/api/threatfeed', threatfeedRoutes);
app.use('/api', graphRoutes);
app.use('/api', graphAiRoutes);
app.use('/api', healthRoutes);
app.use('/api', notifyRoutes);
app.use('/api', phishingRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'IOC Enricher Backend', version: '1.0.0' });
});

// Export for Vercel serverless; listen only when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`IOC Enricher backend rodando na porta ${PORT}`);
  });
}

module.exports = app;
