import test from 'node:test';
import assert from 'node:assert/strict';
import { correlateCase } from '../src/lib/caseCorrelation.js';

test('correlação usa URL e DNS comprovados sem inferir campanha por ASN', () => {
  const record = { iocs: ['https://example.com/a', 'example.com', '8.8.8.8'] };
  const history = [
    { indicator: 'https://example.com/a', type: 'url', timestamp: '2026-01-01' },
    { indicator: 'example.com', type: 'domain', timestamp: '2026-01-02', source_status: { passivedns: 'ok' }, sources: { passivedns: { records: [{ host: 'example.com', ip: '8.8.8.8' }] }, ipinfo: { org: 'Shared ASN' } } },
  ];
  const edges = correlateCase(record, history);
  assert.equal(edges.length, 2);
  assert.ok(edges.some(edge => edge.relation === 'URL pertence ao domínio' && edge.evidence.source === 'URL fornecida'));
  assert.ok(edges.some(edge => edge.relation === 'Domínio observado no IP' && edge.evidence.source === 'HackerTarget Passive DNS'));
  assert.ok(!edges.some(edge => /campanha|ASN/i.test(edge.relation)));
});
