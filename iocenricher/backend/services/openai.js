// AI Analysis service — powered by Groq (Llama 3.3 70B)
// Groq API is OpenAI-compatible, just different base URL + model
const axios = require('axios');

async function analyzeIOC(enrichmentData) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada.');
  }

  const mitreTechniques = (enrichmentData.mitre || [])
    .map(t => `${t.id} - ${t.name} (${t.tactic})`)
    .join('\n');

  const prompt = `Você é um analista Blue Team experiente em SOC. Analise o indicador de comprometimento abaixo e gere uma análise contextual em português brasileiro.

INDICADOR: ${enrichmentData.indicator}
TIPO: ${enrichmentData.type}
SCORE DE RISCO: ${enrichmentData.risk?.score}/100 (${enrichmentData.risk?.level})
RECOMENDAÇÃO: ${enrichmentData.recommendation}

DADOS OSINT:
${JSON.stringify(enrichmentData.sources, null, 2)}

FATORES DE RISCO:
${(enrichmentData.risk?.factors || []).map(f => '- ' + f).join('\n')}

TÉCNICAS MITRE ATT&CK MAPEADAS:
${mitreTechniques || 'Nenhuma identificada'}

Responda APENAS com JSON válido contendo exatamente estes campos:
{
  "summary": "resumo objetivo de 2-3 frases: o que é esse indicador, nível de ameaça e contexto",
  "threat_actor_profile": "perfil provável do ator/campanha (ex: botnet, grupo APT, crime comum)",
  "context": "análise técnica detalhada: tipo de ameaça, comportamento observado, infraestrutura suspeita",
  "next_steps": ["ação 1 concreta para o analista SOC", "ação 2", "ação 3"],
  "false_positive_likelihood": "LOW | MEDIUM | HIGH",
  "false_positive_reason": "motivo pelo qual pode ou não ser falso positivo"
}

Responda APENAS com o JSON. Sem markdown, sem texto extra, sem blocos de código.`;

  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Você é um analista sênior de Blue Team. Responda apenas com JSON válido, sem markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1024,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );

  const content = data.choices[0]?.message?.content?.trim();
  try {
    // Strip accidental markdown fences if model adds them
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(clean);
  } catch {
    return {
      summary: content,
      threat_actor_profile: null,
      context: null,
      next_steps: [],
      false_positive_likelihood: 'MEDIUM',
      false_positive_reason: null
    };
  }
}

module.exports = { analyzeIOC };
