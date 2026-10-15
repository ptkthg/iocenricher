import { writeFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:5175';
const tab = await (await fetch('http://127.0.0.1:9229/json/new?about:blank', { method: 'PUT' })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, response => response.error ? reject(new Error(response.error.message)) : resolve(response.result));
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const answer = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.text);
  return answer.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const observations = [
  { indicator: 'https://example.com/path', type: 'url', timestamp: '2026-01-01T00:00:00.000Z', source_status: {} },
  { indicator: 'example.com', type: 'domain', timestamp: '2026-01-02T00:00:00.000Z', source_status: {} },
];

try {
  await send('Page.enable');
  await send('Runtime.enable');
  // Porta e perfil exclusivos de QA; não altera armazenamento do usuário ou do site publicado.
  await send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='5175')localStorage.setItem('iocenricher_history',${JSON.stringify(JSON.stringify(observations))})` });
  await send('Page.navigate', { url: `${origin}/historico` });
  await pause(900);
  await evaluate(`(async()=>{const store=await import('/src/lib/investigationStore.js');await store.saveCase({title:'Caso de QA',status:'Aberto',priority:'Média',iocs:['https://example.com/path','example.com']})})()`);
  await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Casos locais'))?.click()`);
  await pause(350);
  await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Caso de QA'))?.click()`);
  await pause(250);
  const desktop = await evaluate(`({graph:!!document.querySelector('.case-graph-scroll svg'),edgeCount:document.querySelectorAll('.case-graph-scroll svg line').length,relation:document.body.textContent.includes('URL pertence ao domínio')})`);
  if (!desktop.graph || desktop.edgeCount !== 2 || !desktop.relation) throw new Error(`Grafo de caso falhou: ${JSON.stringify(desktop)}`);
  await evaluate(`document.querySelector('.case-graph-scroll svg g')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  const evidence = await evaluate(`document.body.textContent.includes('Hostname extraído diretamente da URL')`);
  if (!evidence) throw new Error('Aresta não abriu a evidência');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  const mobile = await evaluate(`({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth,graphScroll:document.querySelector('.case-graph-scroll')?.scrollWidth,graphViewport:document.querySelector('.case-graph-scroll')?.clientWidth})`);
  if (mobile.content > mobile.viewport || mobile.graphScroll <= mobile.graphViewport) {
    const overflow = await evaluate(`[...document.querySelectorAll('*')].map(element=>({tag:element.tagName,cls:String(element.className?.baseVal||element.className||''),right:Math.round(element.getBoundingClientRect().right),width:Math.round(element.getBoundingClientRect().width)})).filter(item=>item.right>390).slice(0,20)`);
    throw new Error(`Layout mobile do grafo falhou: ${JSON.stringify({ mobile, overflow })}`);
  }
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('D:/iocenricher/case-graph-mobile-qa.png', Buffer.from(screenshot.data, 'base64'));
  await send('Page.navigate', { url: `${origin}/preferencias` });
  await pause(550);
  const preferences = await evaluate(`({retention:document.body.textContent.includes('Aplicar retenção'),viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`);
  if (!preferences.retention || preferences.content > preferences.viewport) throw new Error(`Preferências mobile falharam: ${JSON.stringify(preferences)}`);
  console.log(JSON.stringify({ desktop, evidence, mobile, preferences }));
} finally {
  await send('Target.closeTarget', { targetId: tab.id });
  socket.close();
}
