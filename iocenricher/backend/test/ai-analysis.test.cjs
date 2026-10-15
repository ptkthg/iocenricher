const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { analyzeIOC } = require('../services/openai');
const { GROQ_MODEL } = require('../services/groq-config');

test('IA separa evidências confirmadas de hipóteses e descarta referências inexistentes', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousPost = axios.post;
  let request;
  process.env.GROQ_API_KEY = 'test-only-key';
  axios.post = async (url, body) => { request = { url, body }; return { data: { choices: [{ message: { content: JSON.stringify({ hypotheses: [{ text: 'Verificar se houve conexão', evidence_ids: ['E1', 'E99'] }], contradictions: [], gaps: ['Falta telemetria de endpoint'], next_steps: [{ text: 'Consultar logs', evidence_ids: ['E1'] }] }) } }] } }; };
  try {
    const output = await analyzeIOC({ indicator: 'example.com', type: 'domain', risk: { classification: 'SUSPEITO', score: 20, factors: ['VirusTotal: 2 motores sinalizaram o domínio'], coverage: { successful: 1, total: 2 } }, mitre: [] });
    assert.equal(output.confirmed_evidence[0].origin, 'VirusTotal');
    assert.deepEqual(output.hypotheses[0].evidence_ids, ['E1']);
    assert.equal(output.hypotheses[0].text, 'Verificar se houve conexão');
    assert.equal(output.threat_actor_profile, undefined);
    assert.match(output.conclusion, /exigem verificação/);
    assert.equal(request.body.model, GROQ_MODEL);
    assert.deepEqual(request.body.response_format, { type: 'json_object' });
    assert.equal(request.body.max_completion_tokens, 1600);
    assert.equal(request.body.reasoning_effort, 'low');
  } finally {
    axios.post = previousPost;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});
