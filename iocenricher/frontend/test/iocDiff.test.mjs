import test from 'node:test';
import assert from 'node:assert/strict';
import { compareObservations } from '../src/lib/iocDiff.js';

test('comparação distingue mudança observada de indisponibilidade da fonte', () => {
  const before = { indicator: 'example.com', timestamp: '2026-01-01', query_status: 'complete', risk: { score: 25, classification: 'SUSPEITO' }, source_status: { virustotal: 'ok', passivedns: 'ok' }, sources: { passivedns: { records: [{ host: 'example.com', ip: '8.8.8.8' }] } }, mitre: [{ id: 'T1566' }] };
  const after = { indicator: 'example.com', timestamp: '2026-01-02', query_status: 'partial', risk: { score: 30, classification: 'SUSPEITO' }, source_status: { virustotal: 'ok', passivedns: 'unavailable' }, sources: {}, mitre: [] };
  const changes = compareObservations(before, after);
  assert.ok(changes.some(change => change.category === 'Risk Score' && change.state === 'observed'));
  assert.ok(changes.some(change => change.category === 'Fonte passivedns' && change.state === 'coverage'));
  assert.ok(!changes.some(change => change.category === 'DNS observado'));
  assert.ok(!changes.some(change => change.category === 'Técnicas MITRE'));
});
