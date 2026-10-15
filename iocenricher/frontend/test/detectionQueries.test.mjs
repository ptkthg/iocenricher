import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHunt } from '../src/lib/detectionQueries.js';
import { buildPlaybook } from '../src/lib/playbook.js';

const observation = { indicator: '8.8.8.8', type: 'ip', query_status: 'error', risk: { score: null, coverage: { successful: 0, total: 2 } } };

test('templates de hunting usam campos específicos e não executam a busca', () => {
  const kql = generateHunt({ observation, platform: 'kql', days: 7 });
  assert.match(kql.query, /DeviceNetworkEvents/);
  assert.match(kql.query, /RemoteIP == "8\.8\.8\.8"/);
  const spl = generateHunt({ observation, platform: 'spl', days: 7, index: 'main' });
  assert.match(spl.query, /index=main earliest=-7d/);
  const yara = generateHunt({ observation, platform: 'yara', days: 7 });
  assert.match(yara.query, /target\.ip = "8\.8\.8\.8"/);
  assert.match(yara.limitation, /seletor de tempo/);
  assert.throws(() => generateHunt({ observation, platform: 'spl', days: 7, index: 'main | delete' }));
});

test('playbook pede nova cobertura e aprovação antes de contenção', () => {
  const steps = buildPlaybook(observation);
  assert.ok(steps.some(step => step.title === 'Repetir fontes indisponíveis'));
  assert.ok(steps.some(step => step.prerequisite.includes('aprovação operacional')));
});
