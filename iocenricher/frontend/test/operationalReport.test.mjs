import test from 'node:test';
import assert from 'node:assert/strict';
import { printInvestigationReport, printOperationalReport } from '../src/lib/report.js';

test('relatório individual inclui cobertura e escapa IOC não confiável', () => {
  let html = '';
  const popup = { document: { write(value) { html = value; }, close() {} }, focus() {}, print() {} };
  const previousWindow = globalThis.window;
  globalThis.window = { open: () => popup };
  try {
    const observation = { indicator: '<img src=x onerror=alert(1)>', type: 'domain', timestamp: '2026-01-01T00:00:00Z', query_status: 'error', risk: { classification: 'INCONCLUSIVO', score: null, factors: ['Sem resposta de reputação'], confidence: { level: 'BAIXA' }, coverage: { successful: 0, total: 2 } }, source_status: { virustotal: 'unavailable' } };
    assert.equal(printInvestigationReport([observation]), true);
    assert.match(html, /Cobertura: 0\/2/);
    assert.match(html, /virustotal/);
    assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
    assert.match(html, /&lt;img src=x/);
  } finally { globalThis.window = previousWindow; }
});

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
