const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const app = require('../server');
const { GROQ_MODEL } = require('../services/groq-config');

test('resumo do grafo limita sugestões a arestas presentes e não atribui TLP', async () => {
  const previousPost = axios.post;
  const previousKey = process.env.GROQ_API_KEY;
  let request;
  process.env.GROQ_API_KEY = 'test-only-key';
  axios.post = async (url, body) => { request = { url, body }; return { data: { choices: [{ message: { content: JSON.stringify({ recommendations: [{ text: 'Verificar logs de conexão', edge_ids: ['edge-1', 'inventada'] }] }) } }] } }; };
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/graph/ai-summary`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ graphData: { indicator: 'example.com', nodes: [{ id: 'domain::example.com', label: 'example.com', type: 'domain' }], edges: [{ id: 'edge-1', source: 'domain::example.com', target: 'ip::8.8.8.8', label: 'DNS' }] } }) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.tlp, null);
    assert.deepEqual(data.recommendations[0].edge_ids, ['edge-1']);
    assert.match(data.overview, /1 nós e 1 relações/);
    assert.equal(request.body.model, GROQ_MODEL);
    assert.deepEqual(request.body.response_format, { type: 'json_object' });
    assert.equal(request.body.reasoning_effort, 'low');
  } finally {
    server.close();
    axios.post = previousPost;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});
