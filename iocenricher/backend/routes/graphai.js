const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/graph/ai-summary', async (req, res) => {
  const { graphData } = req.body;
  if (!graphData) return res.status(400).json({ error: 'graphData required' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });

  const { nodes, edges, indicator, type } = graphData;

  const prompt = `Você é um analista sênior de Blue Team. Analise este grafo de investigação e gere um relatório narrativo em português brasileiro.

INDICADOR PRINCIPAL: ${indicator} (${type})
TOTAL DE NÓS: ${nodes.length}
TOTAL DE CONEXÕES: ${edges.length}

NÓS DO GRAFO:
${nodes.map(n => `- [${n.type.toUpperCase()}] ${n.fullLabel || n.label}${n.risk ? ` (risco: ${n.risk}, score: ${n.score})` : ''}${n.technique ? ` — ${n.technique} (${n.tactic})` : ''}`).join('\n')}

CONEXÕES:
${edges.map(e => `- ${e.source.split('::')[1]} → ${e.label} → ${e.target.split('::')[1]}`).join('\n')}

Responda APENAS com JSON válido com estes campos:
{
  "headline": "título curto e direto da ameaça (ex: 'Servidor C2 Ativo — QakBot via Tor')",
  "overview": "parágrafo de 3-4 frases explicando o que o grafo revela em linguagem clara para um analista SOC",
  "infrastructure": "análise da infraestrutura identificada (ASN, subnet, país, portas)",
  "threat_assessment": "avaliação da ameaça com base nos nós de malware, detecções e técnicas MITRE",
  "recommendations": ["ação 1 específica", "ação 2 específica", "ação 3 específica"],
  "confidence": "HIGH | MEDIUM | LOW",
  "tlp": "RED | AMBER | GREEN | WHITE"
}`;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Analista sênior de Blue Team. Responda apenas com JSON válido, sem markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1024,
      },
      {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    const content = data.choices[0]?.message?.content?.trim() || '';
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    res.json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
