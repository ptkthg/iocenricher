const tab = await (await fetch('http://127.0.0.1:9229/json/new?about:blank', { method: 'PUT' })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let counter = 0;
const pending = new Map();
socket.onmessage = event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text); return response.result.value; };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const seed = [
  { indicator: 'example.com', type: 'domain', timestamp: '2026-01-01T00:00:00.000Z', risk: { score: 0, level: 'BAIXO' } },
  { indicator: 'example.com', type: 'domain', timestamp: '2026-01-02T00:00:00.000Z', risk: { score: 40, level: 'ALTO' } },
];
try {
  await send('Page.enable');
  await send('Runtime.enable');
  // Porta exclusiva do teste; nenhum dado do site publicado ou do perfil do usuário é tocado.
  await send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:5175', storageTypes: 'all' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='5175')localStorage.setItem('iocenricher_history',${JSON.stringify(JSON.stringify(seed))})` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
  await pause(1000);
  const migrated = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const data=await s.loadInvestigations();return {count:data.length,indicators:data.map(x=>x.indicator),legacy:JSON.parse(localStorage.getItem('iocenricher_history')||'[]').length}})()`);
  if (migrated.count !== 2 || migrated.legacy !== 2) throw new Error(`Migração falhou: ${JSON.stringify(migrated)}`);
  const observations = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const item={indicator:'example.com',type:'domain',timestamp:'2026-01-03T00:00:00.000Z',risk:{score:null,level:'INCONCLUSIVO'}};await s.saveInvestigations([item,item]);const before=await s.loadInvestigations();await s.deleteInvestigation('example.com','2026-01-02T00:00:00.000Z');const after=await s.loadInvestigations();return {before:before.length,after:after.length,legacy:JSON.parse(localStorage.getItem('iocenricher_history')||'[]').length}})()`);
  if (observations.before !== 3 || observations.after !== 2 || observations.legacy !== 2) throw new Error(`Persistência falhou: ${JSON.stringify(observations)}`);
  console.log(JSON.stringify({ migrated, observations }));
} finally {
  await send('Target.closeTarget', { targetId: tab.id });
  socket.close();
}
