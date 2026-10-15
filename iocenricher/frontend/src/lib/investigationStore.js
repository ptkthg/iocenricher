const DATABASE = 'iocenricher-local';
const VERSION = 1;
const LEGACY_KEY = 'iocenricher_history';
let opening;

function legacyHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(data) ? data.filter(item => item && typeof item.indicator === 'string') : [];
  } catch { return []; }
}

function mirror(items) {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(items.slice(0, 100))); } catch {}
}

function requestResult(request) {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('Transação cancelada')); });
}

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponível'));
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const observations = database.createObjectStore('observations', { keyPath: 'id' });
      observations.createIndex('indicator', 'indicator');
      observations.createIndex('timestamp', 'timestamp');
      database.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { opening = null; throw error; });
  return opening;
}

async function migrateLegacy(database) {
  const markerTransaction = database.transaction('meta', 'readonly');
  const migrated = await requestResult(markerTransaction.objectStore('meta').get('legacy-v1'));
  if (migrated) return;
  const old = legacyHistory();
  const transaction = database.transaction(['observations', 'meta'], 'readwrite');
  const observations = transaction.objectStore('observations');
  old.forEach((data, index) => observations.put({ id: `legacy:${index}:${data.indicator}:${data.timestamp || ''}`, indicator: data.indicator, timestamp: data.timestamp || '', data }));
  transaction.objectStore('meta').put({ importedAt: new Date().toISOString(), count: old.length }, 'legacy-v1');
  await transactionDone(transaction);
}

export async function loadInvestigations() {
  try {
    const database = await openDatabase();
    await migrateLegacy(database);
    const transaction = database.transaction('observations', 'readonly');
    const records = await requestResult(transaction.objectStore('observations').getAll());
    return records.map(record => record.data).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  } catch {
    return legacyHistory();
  }
}

export async function saveInvestigations(items) {
  const valid = items.filter(item => item && typeof item.indicator === 'string' && item.timestamp);
  if (!valid.length) return loadInvestigations();
  try {
    const database = await openDatabase();
    await migrateLegacy(database);
    const transaction = database.transaction('observations', 'readwrite');
    const observations = transaction.objectStore('observations');
    valid.forEach(data => observations.put({ id: `observation:${data.indicator}:${data.timestamp}`, indicator: data.indicator, timestamp: data.timestamp, data }));
    await transactionDone(transaction);
    const updated = await loadInvestigations();
    mirror(updated);
    return updated;
  } catch {
    const existing = legacyHistory();
    const keys = new Set(existing.map(item => `${item.indicator}:${item.timestamp}`));
    valid.forEach(item => { const key = `${item.indicator}:${item.timestamp}`; if (!keys.has(key)) { existing.unshift(item); keys.add(key); } });
    mirror(existing);
    return existing;
  }
}

export async function clearInvestigations() {
  const database = await openDatabase();
  await migrateLegacy(database);
  const transaction = database.transaction('observations', 'readwrite');
  transaction.objectStore('observations').clear();
  await transactionDone(transaction);
  localStorage.removeItem(LEGACY_KEY);
}

export async function deleteInvestigation(indicator, timestamp) {
  const database = await openDatabase();
  await migrateLegacy(database);
  const transaction = database.transaction('observations', 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore('observations');
  const matches = await requestResult(store.index('indicator').getAll(indicator));
  matches.filter(record => record.timestamp === timestamp).forEach(record => store.delete(record.id));
  await done;
  const updated = await loadInvestigations();
  mirror(updated);
  return updated;
}
