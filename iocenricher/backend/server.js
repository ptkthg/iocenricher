require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const enrichRoutes = require('./routes/enrich');
const threatfeedRoutes = require('./routes/threatfeed');
const graphRoutes = require('./routes/graph');
const graphAiRoutes = require('./routes/graphai');
const healthRoutes = require('./routes/health');
const notifyRoutes = require('./routes/notify');
const phishingRoutes = require('./routes/phishing');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Muitas requisições. Aguarde 1 minuto.' }
});
app.use('/api/', limiter);

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
