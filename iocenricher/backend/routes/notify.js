const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/notify/slack', async (req, res) => {
  const { webhookUrl, result } = req.body;
  if (!webhookUrl || !result) return res.status(400).json({ error: 'webhookUrl and result required' });

  const riskEmoji = { CRÍTICO: '🚨', ALTO: '⚠️', MÉDIO: '🔶', BAIXO: '✅' };
  const emoji = riskEmoji[result.risk?.level] || '🔍';
  const mitreList = result.mitre?.slice(0, 3).map(t => `\`${t.id}\``).join(' ') || '';

  const payload = {
    text: `${emoji} *IOC Enricher Alert* — ${result.risk?.level} Risk Detected`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${result.risk?.level} Risk — ${result.indicator}` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Indicator:*\n\`${result.indicator}\`` },
          { type: 'mrkdwn', text: `*Type:*\n${result.type?.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Risk Score:*\n${result.risk?.score}/100` },
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
    await axios.post(webhookUrl, payload, { timeout: 8000 });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
