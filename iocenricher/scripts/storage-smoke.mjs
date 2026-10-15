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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='5175'){localStorage.setItem('iocenricher_history',${JSON.stringify(JSON.stringify(seed))});localStorage.setItem('ioc_note_example.com',${JSON.stringify(JSON.stringify({ notes: 'nota anterior', tags: ['legado'] }))})}` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
  await pause(1000);
  const migrated = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const data=await s.loadInvestigations();return {count:data.length,indicators:data.map(x=>x.indicator),legacy:JSON.parse(localStorage.getItem('iocenricher_history')||'[]').length}})()`);
  if (migrated.count !== 2 || migrated.legacy !== 2) throw new Error(`Migração falhou: ${JSON.stringify(migrated)}`);
  const observations = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const item={indicator:'example.com',type:'domain',timestamp:'2026-01-03T00:00:00.000Z',risk:{score:null,level:'INCONCLUSIVO'}};await s.saveInvestigations([item,item]);const before=await s.loadInvestigations();await s.deleteInvestigation('example.com','2026-01-02T00:00:00.000Z');const after=await s.loadInvestigations();return {before:before.length,after:after.length,legacy:JSON.parse(localStorage.getItem('iocenricher_history')||'[]').length}})()`);
  if (observations.before !== 3 || observations.after !== 2 || observations.legacy !== 2) throw new Error(`Persistência falhou: ${JSON.stringify(observations)}`);
  const note = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const before=await s.loadNote('example.com');await s.saveNote('example.com','nota atualizada',['legado','analise']);const after=await s.loadNote('example.com');return {before:before.notes,after:after.notes,tags:after.tags.length,legacy:JSON.parse(localStorage.getItem('ioc_note_example.com')||'{}').notes}})()`);
  if (note.before !== 'nota anterior' || note.after !== 'nota atualizada' || note.tags !== 2 || note.legacy !== 'nota atualizada') throw new Error(`Notas falharam: ${JSON.stringify(note)}`);
  const cases = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const created=await s.saveCase({title:'Caso de teste',status:'Aberto',priority:'Média',iocs:['example.com'],notes:'observação'});await s.saveCase({...created,status:'Arquivado'});const saved=await s.loadCases();return {count:saved.length,status:saved[0].status,iocs:saved[0].iocs.length,createdAtPreserved:saved[0].createdAt===created.createdAt}})()`);
  if (cases.count !== 1 || cases.status !== 'Arquivado' || cases.iocs !== 1 || !cases.createdAtPreserved) throw new Error(`Casos falharam: ${JSON.stringify(cases)}`);
  const backup = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const file=await s.exportWorkspaceBackup();await s.importWorkspaceBackup(file);const after=await s.exportWorkspaceBackup();let invalid=false;try{await s.importWorkspaceBackup({...file,notes:[{indicator:'example.com',notes:4,tags:[]}]})}catch{invalid=true}return {observations:after.observations.length,cases:after.cases.length,notes:after.notes.length,invalid}})()`);
  if (backup.observations !== 2 || backup.cases !== 1 || backup.notes !== 1 || !backup.invalid) throw new Error(`Backup falhou: ${JSON.stringify(backup)}`);
  const retention = await evaluate(`(async()=>{const s=await import('/src/lib/investigationStore.js');const result=await s.deleteInvestigationsBefore('2026-01-02T00:00:00.000Z');return {removed:result.removed,remaining:result.observations.map(item=>item.timestamp),cases:(await s.loadCases()).length,note:(await s.loadNote('example.com')).notes}})()`);
  if (retention.removed !== 1 || retention.remaining.length !== 1 || retention.remaining[0] !== '2026-01-03T00:00:00.000Z' || retention.cases !== 1 || retention.note !== 'nota atualizada') throw new Error(`Retenção falhou: ${JSON.stringify(retention)}`);
  console.log(JSON.stringify({ migrated, observations, note, cases, backup, retention }));
} finally {
  await send('Target.closeTarget', { targetId: tab.id });
  socket.close();
}
