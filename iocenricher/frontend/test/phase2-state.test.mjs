import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreferences, savePreferences, validSlackWebhook } from '../src/lib/preferences.js';
import { observationKey, selectedObservations } from '../src/lib/reportSelection.js';

test('preferências anteriores são lidas sem apagar valores preservados', () => {
  const storage = { getItem: () => JSON.stringify({ slackAlerts: true, slackWebhook: 'https://hooks.slack.com/services/A/B/C', theme: 'dark' }) };
  assert.equal(readPreferences(storage).theme, 'dark');
  assert.deepEqual(readPreferences({ getItem: () => 'null' }), {});
  assert.deepEqual(readPreferences({ getItem: () => '{broken' }), {});
});

test('webhook só é salvo quando o endereço oficial está válido', () => {
  let saved;
  const storage = { setItem: (_, value) => { saved = JSON.parse(value); } };
  assert.equal(validSlackWebhook('https://hooks.slack.com/services/A/B/C'), true);
  assert.throws(() => savePreferences(storage, { slackAlerts: true, slackWebhook: 'https://example.com/' }));
  assert.equal(saved, undefined);
  savePreferences(storage, { slackAlerts: false, slackWebhook: '' });
  assert.equal(saved.slackAlerts, false);
});

test('seleção de relatórios continua ligada à observação após reordenar o histórico', () => {
  const first = { indicator: 'example.com', timestamp: '2026-10-14T00:00:00Z' };
  const second = { indicator: 'example.com', timestamp: '2026-10-15T00:00:00Z' };
  const key = observationKey(first);
  assert.deepEqual(selectedObservations([second, first], [key], [second, first]), [first]);
});
