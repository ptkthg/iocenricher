const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIndicator } = require('../services/indicator');
const { calculateRisk } = require('../services/risk');
const { acquireSlot, cachedQuery } = require('../services/query-control');
const { sharedLimit } = require('../services/shared-limit');
const app = require('../server');

test('indicadores públicos válidos são normalizados; alvos internos e entrada ambígua são rejeitados', () => {
  assert.deepEqual(normalizeIndicator(' EXAMPLE.COM '), { indicator: 'example.com', type: 'domain' });
  assert.deepEqual(normalizeIndicator('8.8.8.8'), { indicator: '8.8.8.8', type: 'ip' });
  for (const value of ['999.999.999.999', '127.0.0.1', 'http://localhost/', 'http://10.0.0.1/', 'http://user:pass@example.com/', 'file:///etc/passwd', 'a'.repeat(2049)]) {
    assert.throws(() => normalizeIndicator(value), undefined, value);
  }
});

test('falha de reputação não gera score zero nem baixo risco; baixo risco observado requer cobertura', () => {
  const unavailable = calculateRisk({}, 'domain', { virustotal: 'unavailable', urlhaus: 'not_configured' });
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.level, 'INCONCLUSIVO');
  assert.equal(unavailable.coverage.successful, 0);
  const observed = calculateRisk({ virustotal: { malicious: 0, suspicious: 0, harmless: 10 } }, 'domain', { virustotal: 'ok', urlhaus: 'unavailable' });
  assert.equal(observed.score, 0);
  assert.equal(observed.level, 'BAIXO');
  assert.equal(observed.coverage.successful, 1);
  const malicious = calculateRisk({ virustotal: { malicious: 15 } }, 'domain', { virustotal: 'ok' });
  assert.equal(malicious.classification, 'MALICIOSO');
  assert.notEqual(malicious.recommendation, 'BLOQUEAR');
});

test('API rejeita IOC inválido, corpo excessivo e webhook que pode causar SSRF', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const badIOC = await fetch(`${base}/api/enrich`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ indicator: 'http://127.0.0.1/' }) });
    assert.equal(badIOC.status, 400);
    const large = await fetch(`${base}/api/enrich`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ indicator: 'x'.repeat(300_000) }) });
    assert.equal(large.status, 413);
    const webhook = await fetch(`${base}/api/notify/slack`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ webhookUrl: 'http://127.0.0.1/private', result: { indicator: 'example.com', risk: { factors: [] } } }) });
    assert.equal(webhook.status, 400);
  } finally {
    server.close();
  }
});

test('consultas repetidas usam cache e o limite de concorrência libera slots', async () => {
  let calls = 0;
  const first = await cachedQuery('virustotal', 'unit-test-cache.example', async () => { calls++; return { found: true }; });
  const second = await cachedQuery('virustotal', 'unit-test-cache.example', async () => { calls++; return { found: false }; });
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  const releases = Array.from({ length: 4 }, acquireSlot);
  assert.ok(releases.every(Boolean));
  assert.equal(acquireSlot(), null);
  releases.forEach(release => release());
  const again = acquireSlot();
  assert.ok(again);
  again();
});

test('limite compartilhado restringe excesso e falha fechado quando configurado', async () => {
  const axios = require('axios');
  const previousPost = axios.post;
  const previousURL = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only-token';
  const middleware = sharedLimit('unit-test', 2);
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, set() { return this; }, json(payload) { this.payload = payload; return this; } });
  try {
    let nextCalls = 0;
    axios.post = async () => ({ data: { result: 3 } });
    const limited = response();
    await middleware({ ip: '203.0.113.7' }, limited, () => { nextCalls++; });
    assert.equal(limited.statusCode, 429);
    assert.equal(nextCalls, 0);
    axios.post = async () => { throw new Error('store unavailable'); };
    const unavailable = response();
    await middleware({ ip: '203.0.113.7' }, unavailable, () => { nextCalls++; });
    assert.equal(unavailable.statusCode, 503);
    assert.equal(nextCalls, 0);
  } finally {
    axios.post = previousPost;
    if (previousURL === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previousURL;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
