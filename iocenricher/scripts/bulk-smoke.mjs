import { writeFile } from 'node:fs/promises';

const tab = await (await fetch('http://127.0.0.1:9229/json/new?http://127.0.0.1:5174/lote', { method: 'PUT' })).json();
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
  const answer = await send('Runtime.evaluate', { expression, returnByValue: true });
  return answer.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await send('Page.enable');
  await send('Runtime.enable');
  for (let index = 0; index < 20; index++) {
    if (await evaluate("Boolean(document.querySelector('#bulk-indicators'))")) break;
    await pause(200);
  }
  if (!await evaluate("document.body.textContent.includes('Análise em lote')")) throw new Error('Rota de lote indisponível');
  const indicators = Array.from({ length: 11 }, (_, index) => `example${index}.com`).join('\n');
  await evaluate(`(() => { const field = document.querySelector('#bulk-indicators'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, ${JSON.stringify(indicators)}); field.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await pause(100);
  const overLimit = await evaluate("({disabled:[...document.querySelectorAll('button')].find(button => button.textContent.trim().startsWith('Analisar 11'))?.disabled, warning:document.body.textContent.includes('Remova os excedentes')})");
  if (!overLimit.disabled || !overLimit.warning) throw new Error(`Limite do lote falhou: ${JSON.stringify(overLimit)}`);
  await evaluate("(() => { const field = document.querySelector('#bulk-indicators'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'example.com\\nEXAMPLE.COM\\n8.8.8.8'); field.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await pause(100);
  if (!await evaluate("Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Analisar 2 indicadores' && !button.disabled))")) throw new Error('Deduplicação não refletida na interface');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(300);
  const mobile = await evaluate("({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,fieldWidth:document.querySelector('#bulk-indicators').getBoundingClientRect().width})");
  if (mobile.pageWidth > mobile.viewport + 1) throw new Error(`Rolagem horizontal na página mobile: ${JSON.stringify(mobile)}`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('D:/iocenricher/bulk-mobile-qa.png', Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ route: 'ok', limit: 'ok', deduplication: 'ok', mobile }));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:9229/json/close/${tab.id}`).catch(() => {});
}
