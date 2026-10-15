import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIndicators, loadBulkResults, analyzeBulkIndicator } from '../src/lib/bulk.js';

test('lote elimina duplicatas e mantém a ordem dos indicadores', () => {
  assert.deepEqual(parseIndicators('example.com\n\n8.8.8.8\n EXAMPLE.COM \nhttps://example.com/'), ['example.com', '8.8.8.8', 'https://example.com/']);
});

test('resultados locais inválidos não quebram a tela', () => {
  assert.deepEqual(loadBulkResults({ getItem: () => '{invalid' }), []);
  assert.deepEqual(loadBulkResults({ getItem: () => '{}' }), []);
});

test('falha de consulta em lote mantém score indisponível e estado de erro', async () => {
  const result = await analyzeBulkIndicator('example.com', async () => { throw new Error('Fonte indisponível'); });
  assert.equal(result.query_status, 'error');
  assert.equal(result.risk.score, null);
  assert.equal(result.risk.classification, 'ERRO_DE_CONSULTA');
  assert.equal(result.error, 'Fonte indisponível');
});

test('resultado da consulta mantém evidências e classificação recebidas', async () => {
  const data = { type: 'domain', risk: { score: 62, level: 'SUSPEITO' }, sources: { virustotal: { malicious: 3 } } };
  const result = await analyzeBulkIndicator('example.com', async () => data);
  assert.deepEqual(result.sources, data.sources);
  assert.deepEqual(result.risk, data.risk);
  assert.equal(result.query_status, undefined);
});
