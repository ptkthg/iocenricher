const test = require('node:test');
const assert = require('node:assert/strict');
const { mapToMitre } = require('../services/mitre');
const { calculateRisk } = require('../services/risk');

test('sem resposta de reputação a análise é inconclusiva', () => {
  const result = calculateRisk({ typosquatting: { is_suspicious: false } }, 'domain');
  assert.equal(result.level, 'INCONCLUSIVO');
  assert.equal(result.recommendation, 'INVESTIGAR');
});

test('tipo de IOC e detecção genérica não geram técnica MITRE', () => {
  assert.deepEqual(mapToMitre({ ipinfo: { country: 'BR' } }, 'ip'), []);
  assert.deepEqual(mapToMitre({ virustotal: { malicious: 4 } }, 'hash'), []);
});

test('tag explícita de phishing associa somente a técnica correspondente', () => {
  const techniques = mapToMitre({ urlhaus: { found: true, tags: ['phishing'] } }, 'url');
  assert.deepEqual(techniques.map(t => t.id), ['T1566']);
});
