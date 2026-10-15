import fs from 'node:fs/promises';

const base='http://127.0.0.1:9229';
const tab=await (await fetch(`${base}/json/new?http://127.0.0.1:5173/`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
let id=0;const waiting=new Map();ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&waiting.has(msg.id)){waiting.get(msg.id)(msg);waiting.delete(msg.id)}};
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;waiting.set(key,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));ws.send(JSON.stringify({id:key,method,params}))})}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
await send('Page.enable');await send('Runtime.enable');
await pause(700);
await send('Runtime.evaluate',{expression:`localStorage.setItem('iocenricher_user',JSON.stringify({name:'Analista QA',role:'Analista SOC',isGuest:true}));location.reload()`});
await pause(1400);
for(const [name,width,height,mobile] of [['desktop',1440,1000,false],['mobile',390,844,true]]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await pause(400);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`D:/iocenricher/${name}-qa.png`,Buffer.from(shot.data,'base64'));
 const metrics=await send('Runtime.evaluate',{expression:`JSON.stringify({innerWidth,clientWidth:document.documentElement.clientWidth,workspace:document.querySelector('.workspace')?.getBoundingClientRect().width,content:document.querySelector('.app-content')?.getBoundingClientRect().width})`,returnByValue:true});console.log(name,metrics.result.value);
 if(mobile){const overflow=await send('Runtime.evaluate',{expression:`JSON.stringify([...document.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:e.className?.baseVal||e.className||'',right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.right>390).slice(0,30))`,returnByValue:true});console.log('overflow',overflow.result.value)}
}
for(const [name,label] of [['investigacoes','Investigações'],['mitre','MITRE ATT&CK'],['fontes','Fontes'],['analise','Analisar IOC']]){
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Runtime.evaluate',{expression:`[...document.querySelectorAll('.sidebar-link')].find(x=>x.textContent.includes(${JSON.stringify(label)}))?.click()`});await pause(500);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`D:/iocenricher/${name}-qa.png`,Buffer.from(shot.data,'base64'));
}
await send('Runtime.evaluate',{expression:`(()=>{const input=document.querySelector('input[placeholder="malicious-example.com"]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'example.com');input.dispatchEvent(new Event('input',{bubbles:true}));return input.value})()`});
await pause(100);await send('Runtime.evaluate',{expression:`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Analisar')?.click()`});await pause(2200);
const smoke=await send('Runtime.evaluate',{expression:`JSON.stringify({inconclusive:document.body.textContent.includes('INCONCLUSIVO'),history:JSON.parse(localStorage.getItem('iocenricher_history')||'[]').length})`,returnByValue:true});console.log('smoke',smoke.result.value);
const resultShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile('D:/iocenricher/resultado-qa.png',Buffer.from(resultShot.data,'base64'));
await send('Target.closeTarget',{targetId:tab.id});ws.close();
