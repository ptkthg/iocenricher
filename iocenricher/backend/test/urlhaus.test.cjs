const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { checkURL, checkHostname, checkPayloadHash, queryResult } = require('../services/urlhaus');

test('URLhaus aceita somente no_results como consulta negativa', () => {
  assert.equal(queryResult({ query_status: 'ok' }), true);
  assert.equal(queryResult({ query_status: 'no_results' }), false);
  assert.throws(() => queryResult({ query_status: 'no_api_key' }), { code: 'SOURCE_AUTH' });
  assert.throws(() => queryResult({ query_status: 'invalid_query' }), { code: 'SOURCE_RESPONSE' });
  assert.throws(() => queryResult(null), { code: 'SOURCE_RESPONSE' });
});

test('URLhaus propaga falhas no corpo em URL, host e hash', async () => {
  const previous = axios.post;
  axios.post = async () => ({ data: { query_status: 'invalid_query' } });
  try {
    await assert.rejects(checkURL('https://example.com/a'), { code: 'SOURCE_RESPONSE' });
    await assert.rejects(checkHostname('example.com'), { code: 'SOURCE_RESPONSE' });
    await assert.rejects(checkPayloadHash('0'.repeat(64)), { code: 'SOURCE_RESPONSE' });
  } finally { axios.post = previous; }
});
