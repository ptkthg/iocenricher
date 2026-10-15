import test from 'node:test';
import assert from 'node:assert/strict';
import { printOperationalReport } from '../src/lib/report.js';

test('pacote PDF técnico inclui evidências e escapa conteúdo não confiável', () => {
  let html = '';
  const popup = { document: { write(value) { html = value; }, close() {} }, focus() {}, print() {} };
  const observation = { indicator: 'example.com', type: 'domain', timestamp: '2026-01-01T00:00:00Z', risk: { classification: 'SUSPEITO', score: 20, confidence: { level: 'MÉDIA' }, coverage: { successful: 1, total: 2 }, factors: ['VirusTotal: <script>alert(1)</script>'] }, source_status: { virustotal: 'ok' }, mitre: [] };
  assert.equal(printOperationalReport(popup, { observation, observations: [observation], analystNote: { notes: 'Revisar' }, cases: [], hunt: { title: 'KQL', model: 'DeviceNetworkEvents', query: 'DeviceNetworkEvents', limitation: 'Revisar campos' }, playbook: [], relationships: [] }), true);
  assert.match(html, /Pacote técnico de investigação/);
  assert.match(html, /DeviceNetworkEvents/);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;/);
});
