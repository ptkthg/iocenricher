const test = require('node:test');
const assert = require('node:assert/strict');
const { checkSource } = require('../routes/health');

test('health não devolve detalhes internos de erros das fontes', async () => {
  const error = Object.assign(new Error('connect EACCES 10.0.0.4:443 secret-token'), { code: 'EACCES' });
  const result = await checkSource('example', () => Promise.reject(error));
  assert.deepEqual(Object.keys(result).sort(), ['latency', 'name', 'status']);
  assert.equal(result.status, 'offline');
  assert.equal(JSON.stringify(result).includes('secret-token'), false);
});

test('health distingue chave ausente, autenticação e limite da fonte', async () => {
  const failure = async (code, status) => checkSource('example', () => Promise.reject(Object.assign(new Error('upstream'), { code, response: { status } })));
  assert.equal((await failure('MISSING_KEY')).status, 'not_configured');
  assert.equal((await failure(undefined, 403)).status, 'auth_error');
  assert.equal((await failure('SOURCE_AUTH')).status, 'auth_error');
  assert.equal((await failure(undefined, 429)).status, 'rate_limited');
});
