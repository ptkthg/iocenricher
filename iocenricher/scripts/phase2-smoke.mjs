import { writeFile } from 'node:fs/promises';

const tab = await (await fetch('http://127.0.0.1:9229/json/new?http://127.0.0.1:5174/grafo', { method: 'PUT' })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
    socket.send(JSON.stringify({ id: key, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  return result.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function navigate(path) { await send('Page.navigate', { url: `http://127.0.0.1:5174${path}` }); await pause(550); }
try {
  await send('Page.enable'); await send('Runtime.enable');
  await navigate('/grafo');
  if (!await evaluate("document.body.textContent.includes('Grafo de relações')")) throw new Error('Grafo indisponível');
  await evaluate("(() => { const field = document.querySelector('input[aria-label=\"Indicador para gerar o grafo\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, '8.8.8.8'); field.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await pause(100);
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Investigar')?.click()");
  let nodes = 0;
  for (let index = 0; index < 30; index++) {
    await pause(300);
    nodes = await evaluate("document.querySelectorAll('svg g[role=\"button\"]').length");
    if (nodes) break;
  }
  if (!nodes) throw new Error('Grafo não exibiu nós');
  const keyboard = await evaluate("(() => { const node = document.querySelector('svg g[role=\"button\"]'); node.focus(); node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return {focus:document.activeElement === node, label:node.getAttribute('aria-label')}; })()");
  if (!keyboard.focus || !keyboard.label) throw new Error(`Nó sem navegação acessível: ${JSON.stringify(keyboard)}`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  const graphMobile = await evaluate("({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth})");
  if (graphMobile.pageWidth > graphMobile.viewport + 1) throw new Error(`Grafo extrapola mobile: ${JSON.stringify(graphMobile)}`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('D:/iocenricher/phase2-graph-mobile.png', Buffer.from(screenshot.data, 'base64'));

  await navigate('/preferencias');
  const settings = await evaluate("({title:document.body.textContent.includes('Preferências'),backup:!!document.querySelector('input[type=file]:not([style*=none])'),slackLabel:document.querySelector('label[for=slack-webhook]')?.textContent})");
  if (!settings.title || !settings.backup || !settings.slackLabel) throw new Error(`Preferências inacessíveis: ${JSON.stringify(settings)}`);
  const settingsMobile = await evaluate("({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth})");
  if (settingsMobile.pageWidth > settingsMobile.viewport + 1) throw new Error(`Preferências extrapolam mobile: ${JSON.stringify(settingsMobile)}`);

  await navigate('/relatorios');
  if (!await evaluate("Boolean(document.querySelector('table[aria-label=\"Observações disponíveis para relatório\"]'))")) throw new Error('Relatórios indisponíveis');
  await navigate('/fontes');
  const sources = await evaluate("({table:!!document.querySelector('table[aria-label=\"Integrações de inteligência\"]'),bazaar:[...document.querySelectorAll('tr')].find(row => row.textContent.includes('MalwareBazaar'))?.textContent})");
  if (!sources.table || !sources.bazaar?.includes('Chave de API')) throw new Error(`Catálogo de fontes incorreto: ${JSON.stringify(sources)}`);
  await navigate('/threat-feed');
  const feed = await evaluate("({title:document.body.textContent.includes('Threat Feed'),pageWidth:document.documentElement.scrollWidth,viewport:innerWidth})");
  if (!feed.title || feed.pageWidth > feed.viewport + 1) throw new Error(`Feed mobile inválido: ${JSON.stringify(feed)}`);
  await navigate('/phishing');
  const phishing = await evaluate("({title:document.body.textContent.includes('Análise de phishing'),file:!!document.querySelector('input[aria-label=\"Selecionar arquivo EML para análise\"]'),pageWidth:document.documentElement.scrollWidth,viewport:innerWidth})");
  if (!phishing.title || !phishing.file || phishing.pageWidth > phishing.viewport + 1) throw new Error(`Phishing mobile inválido: ${JSON.stringify(phishing)}`);
  console.log(JSON.stringify({ graphNodes: nodes, graphMobile, settingsMobile, settings: 'ok', reports: 'ok', sources: 'ok', feed: 'ok', phishing: 'ok' }));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:9229/json/close/${tab.id}`).catch(() => {});
}
