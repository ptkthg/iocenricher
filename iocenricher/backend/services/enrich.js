const express = require('express');
const router = express.Router();
const { enrichIP: ipinfoIP } = require('../services/ipinfo');
const { enrichIP: abuseIP } = require('../services/abuseipdb');
const { enrichIP: shodanIP } = require('../services/shodan');
const { enrichHash, enrichDomain, enrichIP: vtIP, enrichURL } = require('../services/virustotal');
const { checkHash } = require('../services/malwarebazaar');
const { checkURL, checkHostname, checkPayloadHash } = require('../services/urlhaus');
const { analyzeIOC } = require('../services/openai');
const { calculateRisk } = require('../services/risk');
const { mapToMitre } = require('../services/mitre');

function detectType(indicator) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hashRegex = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/;
  const urlRegex = /^https?:\/\/.+/i;
  if (ipRegex.test(indicator)) return 'ip';
  if (hashRegex.test(indicator)) return 'hash';
  if (urlRegex.test(indicator)) return 'url';
  return 'domain';
}

router.post('/enrich', async (req, res) => {
  const { indicator } = req.body;
  if (!indicator || typeof indicator !== 'string') {
    return res.status(400).json({ error: 'Indicador inválido ou ausente.' });
  }

  const type = detectType(indicator.trim());
  const results = { 
    indicator: indicator.trim(), 
    type, 
    sources: {}, 
    risk: null, 
    recommendation: null, 
    ai_analysis: null,
    timestamp: new Date().toISOString() 
  };

  try {
    if (type === 'ip') {
      const [vt, ipi, abuse, shodan] = await Promise.allSettled([
        vtIP(indicator),
        ipinfoIP(indicator),
        abuseIP(indicator),
        shodanIP(indicator),
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (ipi.status === 'fulfilled') results.sources.ipinfo = ipi.value;
      if (abuse.status === 'fulfilled') results.sources.abuseipdb = abuse.value;
      if (shodan.status === 'fulfilled') results.sources.shodan = shodan.value;
    }

    if (type === 'hash') {
      const [vt, mb, uh] = await Promise.allSettled([
        enrichHash(indicator),
        checkHash(indicator),
        checkPayloadHash(indicator)
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (mb.status === 'fulfilled') results.sources.malwarebazaar = mb.value;
      if (uh.status === 'fulfilled') results.sources.urlhaus = uh.value;
    }

    if (type === 'domain') {
      const [vt, uh] = await Promise.allSettled([
        enrichDomain(indicator),
        checkHostname(indicator)
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (uh.status === 'fulfilled') results.sources.urlhaus = uh.value;
    }

    if (type === 'url') {
      const [vt, uh] = await Promise.allSettled([
        enrichURL(indicator),
        checkURL(indicator)
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (uh.status === 'fulfilled') results.sources.urlhaus = uh.value;
    }

    const { score, level, recommendation, factors } = calculateRisk(results.sources, type);
    results.risk = { score, level, factors };
    results.recommendation = recommendation;
    results.mitre = mapToMitre(results.sources, type);

    try {
      const ai = await analyzeIOC(results);
      results.ai_analysis = ai;
    } catch (e) {
      console.warn('Análise IA falhou:', e.message);
      results.ai_analysis = null;
    }

    res.json(results);
  } catch (err) {
    console.error('Erro no enriquecimento:', err.message);
    res.status(500).json({ error: 'Erro interno ao consultar fontes OSINT.' });
  }
});

module.exports = router;
