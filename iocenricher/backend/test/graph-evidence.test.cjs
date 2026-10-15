const test = require('node:test');
const assert = require('node:assert/strict');
const virustotal = require('../services/virustotal');
const urlhaus = require('../services/urlhaus');
const { buildGraph } = require('../services/graph');

test('grafo da URL registra relação determinística com origem e sem score fictício', async () => {
  const previousVT = virustotal.enrichURL;
  const previousUH = urlhaus.checkURL;
  virustotal.enrichURL = async () => null;
  urlhaus.checkURL = async () => null;
  try {
    const graph = await buildGraph('https://example.com/path');
    const relation = graph.edges.find(edge => edge.label === 'hosted on');
    assert.ok(relation);
    assert.equal(relation.evidence.source, 'URL fornecida');
    assert.equal(relation.evidence.confidence, 'HIGH');
    assert.equal(graph.nodes.find(node => node.isMain).score, null);
  } finally {
    virustotal.enrichURL = previousVT;
    urlhaus.checkURL = previousUH;
  }
});
