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
const { reverseLookup, forwardLookup } = require('../services/passivedns');
const { lookupDomain, lookupIP } = require('../services/whois');
const { getCertificates } = require('../services/sslcert');
const { analyzeSubnet } = require('../services/subnetintel');
const { analyzeDomain } = require('../services/typosquatting');

function detectType(indicator) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hashRegex = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/;
  const urlRegex = /^https?:\/\/.+/i;
  if (ipRegex.test(indicator)) return 'ip';
  if (hashRegex.test(indicator)) return 'hash';
  if (urlRegex.test(indicator)) return 'url';
  return 'domain';
}

async function safe(fn) {
  try { return await fn(); } catch { return null; }
}

router.post('/enrich', async (req, res) => {
  const { indicator } = req.body;
  if (!indicator || typeof indicator !== 'string')
    return res.status(400).json({ error: 'Indicador inválido ou ausente.' });

  const type = detectType(indicator.trim());
  const results = {
    indicator: indicator.trim(), type, sources: {},
    risk: null, recommendation: null, ai_analysis: null,
    timestamp: new Date().toISOString()
  };

  try {
    if (type === 'ip') {
      const [vt, ipi, abuse, shodan, pdns, whoisData, subnet] = await Promise.allSettled([
        vtIP(indicator),
        ipinfoIP(indicator),
        abuseIP(indicator),
        shodanIP(indicator),
        reverseLookup(indicator),
        lookupIP(indicator),
        analyzeSubnet(indicator),
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (ipi.status === 'fulfilled') results.sources.ipinfo = ipi.value;
      if (abuse.status === 'fulfilled') results.sources.abuseipdb = abuse.value;
      if (shodan.status === 'fulfilled') results.sources.shodan = shodan.value;
      if (pdns.status === 'fulfilled' && pdns.value?.found) results.sources.passivedns = pdns.value;
      if (whoisData.status === 'fulfilled' && whoisData.value?.found) results.sources.whois = whoisData.value;
      if (subnet.status === 'fulfilled' && subnet.value?.found) results.sources.subnet = subnet.value;
    }

    if (type === 'hash') {
      const [vt, mb, uh] = await Promise.allSettled([
        enrichHash(indicator), checkHash(indicator), checkPayloadHash(indicator)
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (mb.status === 'fulfilled') results.sources.malwarebazaar = mb.value;
      if (uh.status === 'fulfilled') results.sources.urlhaus = uh.value;
    }

    if (type === 'domain') {
      const [vt, uh, pdns, whoisData, ssl, typo] = await Promise.allSettled([
        enrichDomain(indicator),
        checkHostname(indicator),
        forwardLookup(indicator),
        lookupDomain(indicator),
        getCertificates(indicator),
        Promise.resolve(analyzeDomain(indicator)),
      ]);
      if (vt.status === 'fulfilled') results.sources.virustotal = vt.value;
      if (uh.status === 'fulfilled') results.sources.urlhaus = uh.value;
      if (pdns.status === 'fulfilled' && pdns.value?.found) results.sources.passivedns = pdns.value;
      if (whoisData.status === 'fulfilled' && whoisData.value?.found) results.sources.whois = whoisData.value;
      if (ssl.status === 'fulfilled' && ssl.value?.found) results.sources.ssl = ssl.value;
      if (typo.status === 'fulfilled') results.sources.typosquatting = typo.value;
    }

    if (type === 'url') {
      let domain = null;
      try { domain = new URL(indicator).hostname; } catch {}
      const tasks = [
        enrichURL(indicator),
        checkURL(indicator),
        ...(domain ? [lookupDomain(domain), getCertificates(domain), Promise.resolve(analyzeDomain(domain))] : []),
      ];
      const results2 = await Promise.allSettled(tasks);
      if (results2[0].status === 'fulfilled') results.sources.virustotal = results2[0].value;
      if (results2[1].status === 'fulfilled') results.sources.urlhaus = results2[1].value;
      if (domain) {
        if (results2[2]?.status === 'fulfilled' && results2[2].value?.found) results.sources.whois = results2[2].value;
        if (results2[3]?.status === 'fulfilled' && results2[3].value?.found) results.sources.ssl = results2[3].value;
        if (results2[4]?.status === 'fulfilled') results.sources.typosquatting = results2[4].value;
      }
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
