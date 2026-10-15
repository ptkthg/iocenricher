const base = 'http://127.0.0.1:9229';
const tab = await (await fetch(`${base}/json/new?http://127.0.0.1:5174/`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
ws.onmessage = event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
function send(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const answer = await send('Runtime.evaluate', { expression, returnByValue: true }); return answer.result.value; }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await send('Page.enable');
  await send('Runtime.enable');
  let initial;
  for (let i = 0; i < 12; i++) {
    await pause(250);
    initial = await evaluate(`({input:!!document.querySelector('input[placeholder="malicious-example.com"]'),login:document.body.textContent.includes('Criar conta'),title:document.body.textContent.includes('Análise individual de IOC')})`);
    if (initial.input) break;
  }
  if (!initial.input || initial.login || !initial.title) throw new Error(`Entrada pública falhou: ${JSON.stringify(initial)}`);
  const routes = ['/overview', '/historico', '/preferencias'];
  for (const route of routes) {
    await send('Page.navigate', { url: `http://127.0.0.1:5174${route}` });
    await pause(600);
    const routed = await evaluate(`({path:location.pathname,active:document.querySelector('.sidebar-link.active')?.textContent,overview:document.body.textContent.includes('Overview'),login:document.body.textContent.includes('Criar conta')})`);
    if (routed.path !== route || !(routed.active || route === '/overview' && routed.overview) || routed.login) throw new Error(`Rota pública falhou: ${JSON.stringify(routed)}`);
  }
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/' });
  await pause(600);
  await evaluate(`(()=>{const input=document.querySelector('input[placeholder="malicious-example.com"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'http://127.0.0.1/');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await pause(100);
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Analisar')?.click()`);
  await pause(500);
  const errorShown = await evaluate(`document.body.textContent.includes('A URL deve usar um host público válido')`);
  if (!errorShown) throw new Error('Erro de IOC inválido não apareceu na interface');
  await evaluate(`(()=>{const input=document.querySelector('input[placeholder="malicious-example.com"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'00000000000000000000000000000000');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await pause(100);
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Analisar')?.click()`);
  let result;
  for (let i = 0; i < 40; i++) {
    await pause(500);
    result = await evaluate(`JSON.parse(localStorage.getItem('iocenricher_history')||'[]')[0] || null`);
    if (result?.indicator === '00000000000000000000000000000000') break;
  }
  if (result?.risk?.score !== null || result?.risk?.level !== 'INCONCLUSIVO' || result?.query_status !== 'error') throw new Error(`Falha de fonte classificada incorretamente: ${JSON.stringify(result?.risk)}`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  const mobile = await evaluate(`({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`);
  if (mobile.content > mobile.viewport) {
    const overflow = await evaluate(`[...document.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:String(e.className?.baseVal||e.className||''),text:e.textContent?.slice(0,45),parent:String(e.parentElement?.className||''),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.right>390).slice(0,16)`);
    throw new Error(`Rolagem horizontal mobile: ${JSON.stringify({mobile,overflow})}`);
  }
  console.log(JSON.stringify({ initial, invalidIOC: 'rejected', offlineResult: { risk: result.risk.level, score: result.risk.score, query: result.query_status }, mobile }));
} finally {
  await send('Target.closeTarget', { targetId: tab.id });
  ws.close();
}
