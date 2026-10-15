const express = require('express');
const router = express.Router();
const axios = require('axios');
const { normalizeIndicator } = require('../services/indicator');

router.post('/notify/slack', async (req, res) => {
  const { webhookUrl, result, test } = req.body || {};
  let destination;
  try { destination = new URL(webhookUrl); } catch { return res.status(400).json({ error: 'Webhook inválido.' }); }
  if (destination.protocol !== 'https:' || destination.hostname !== 'hooks.slack.com' || !/^\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(destination.pathname) || destination.search || destination.hash) {
    return res.status(400).json({ error: 'Somente webhooks oficiais do Slack são aceitos.' });
  }
  if (!result || typeof result.indicator !== 'string' || result.indicator.length > 2048 || !result.risk || !Array.isArray(result.risk.factors || [])) {
    return res.status(400).json({ error: 'Resultado inválido.' });
  }
  try { normalizeIndicator(result.indicator); } catch { return res.status(400).json({ error: 'Indicador inválido.' }); }
  if (result.risk.score != null && (!Number.isFinite(result.risk.score) || result.risk.score < 0 || result.risk.score > 100)) return res.status(400).json({ error: 'Score inválido.' });

  const riskEmoji = { CRÍTICO: '🚨', ALTO: '⚠️', MÉDIO: '🔶', BAIXO: '✅' };
  const emoji = riskEmoji[result.risk?.level] || '🔍';
  const mitreList = result.mitre?.slice(0, 3).map(t => `\`${t.id}\``).join(' ') || '';

  const payload = {
    text: test ? 'IOC Enricher — mensagem de teste (sem investigação real)' : `${emoji} *IOC Enricher Alert* — ${result.risk?.level} Risk Detected`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: test ? 'IOC Enricher — teste de notificação' : `${emoji} ${result.risk?.level} Risk — ${result.indicator}` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Indicator:*\n\`${result.indicator}\`` },
          { type: 'mrkdwn', text: `*Type:*\n${result.type?.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Risk Score:*\n${result.risk?.score == null ? 'Indisponível' : `${result.risk.score}/100`}` },
          { type: 'mrkdwn', text: `*Recommendation:*\n${result.recommendation}` },
          ...(result.sources?.ipinfo?.country ? [{ type: 'mrkdwn', text: `*Country:*\n${result.sources.ipinfo.country}` }] : []),
          ...(result.sources?.abuseipdb ? [{ type: 'mrkdwn', text: `*Abuse Score:*\n${result.sources.abuseipdb.abuse_score}%` }] : []),
        ]
      },
      ...(result.risk?.factors?.length > 0 ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Risk Factors:*\n${result.risk.factors.slice(0, 3).map(f => `• ${f}`).join('\n')}` }
      }] : []),
      ...(mitreList ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*MITRE ATT&CK:* ${mitreList}` }
      }] : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Sent by IOC Enricher · ${new Date().toLocaleString('pt-BR')}` }]
      }
    ]
  };

  try {
    await axios.post(destination.href, payload, { timeout: 8000, maxRedirects: 0 });
    res.json({ success: true });
  } catch (e) {
    res.status(502).json({ error: 'Não foi possível entregar a notificação.' });
  }
});

module.exports = router;
