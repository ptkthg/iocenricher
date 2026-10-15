const DATABASE = 'iocenricher-local';
const VERSION = 3;
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
    let settled = false;
    const timeout = setTimeout(() => finish(new Error('IndexedDB demorou para abrir')), 4000);
    function finish(error, database) {
      if (settled) { database?.close(); return; }
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(database);
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('observations')) {
        const observations = database.createObjectStore('observations', { keyPath: 'id' });
        observations.createIndex('indicator', 'indicator');
        observations.createIndex('timestamp', 'timestamp');
      }
      if (!database.objectStoreNames.contains('meta')) database.createObjectStore('meta');
      if (!database.objectStoreNames.contains('notes')) database.createObjectStore('notes', { keyPath: 'indicator' });
      if (!database.objectStoreNames.contains('cases')) database.createObjectStore('cases', { keyPath: 'id' });
    };
    request.onsuccess = () => finish(null, request.result);
    request.onerror = () => finish(request.error);
    request.onblocked = () => finish(new Error('IndexedDB bloqueado por outra aba'));
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

export async function deleteInvestigationsBefore(cutoff) {
  const cutoffTime = Date.parse(cutoff);
  if (!Number.isFinite(cutoffTime)) throw new Error('Data de retenção inválida');
  const database = await openDatabase();
  await migrateLegacy(database);
  const transaction = database.transaction('observations', 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore('observations');
  const records = await requestResult(store.getAll());
  let removed = 0;
  records.forEach(record => {
    const observedAt = Date.parse(record.timestamp);
    if (Number.isFinite(observedAt) && observedAt < cutoffTime) { store.delete(record.id); removed++; }
  });
  await done;
  const updated = await loadInvestigations();
  mirror(updated);
  return { removed, observations: updated };
}

function legacyNote(indicator) {
  try { return JSON.parse(localStorage.getItem(`ioc_note_${indicator}`) || '{}'); } catch { return {}; }
}

export async function loadNote(indicator) {
  try {
    const database = await openDatabase();
    const transaction = database.transaction('notes', 'readonly');
    const saved = await requestResult(transaction.objectStore('notes').get(indicator));
    if (saved) return saved;
    const old = legacyNote(indicator);
    if (!old.notes && !old.tags?.length) return { indicator, notes: '', tags: [] };
    const migrated = { indicator, notes: old.notes || '', tags: Array.isArray(old.tags) ? old.tags : [], savedAt: old.savedAt || null };
    const write = database.transaction('notes', 'readwrite');
    write.objectStore('notes').put(migrated);
    await transactionDone(write);
    return migrated;
  } catch { return { indicator, ...legacyNote(indicator) }; }
}

export async function saveNote(indicator, notes, tags) {
  const data = { indicator, notes, tags, savedAt: new Date().toISOString() };
  try {
    const database = await openDatabase();
    const transaction = database.transaction('notes', 'readwrite');
    transaction.objectStore('notes').put(data);
    await transactionDone(transaction);
  } catch {
    localStorage.setItem(`ioc_note_${indicator}`, JSON.stringify(data));
    return data;
  }
  try { localStorage.setItem(`ioc_note_${indicator}`, JSON.stringify(data)); } catch {}
  return data;
}

export async function loadCases() {
  const database = await openDatabase();
  const transaction = database.transaction('cases', 'readonly');
  const cases = await requestResult(transaction.objectStore('cases').getAll());
  return cases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function saveCase(record) {
  if (!record || typeof record.title !== 'string' || !record.title.trim() || record.title.length > 200) throw new Error('Título inválido');
  const now = new Date().toISOString();
  const data = { ...record, id: record.id || crypto.randomUUID(), createdAt: record.createdAt || now, updatedAt: now };
  const database = await openDatabase();
  const transaction = database.transaction('cases', 'readwrite');
  transaction.objectStore('cases').put(data);
  await transactionDone(transaction);
  return data;
}

export async function exportWorkspaceBackup() {
  const database = await openDatabase();
  const transaction = database.transaction('notes', 'readonly');
  const storedNotes = await requestResult(transaction.objectStore('notes').getAll());
  const notes = new Map(storedNotes.map(item => [item.indicator, item]));
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith('ioc_note_') && !notes.has(key.slice(9))) notes.set(key.slice(9), { indicator: key.slice(9), ...legacyNote(key.slice(9)) });
  }
  return { schema: 'ioc-enricher-backup-v1', exportedAt: new Date().toISOString(), observations: await loadInvestigations(), cases: await loadCases(), notes: [...notes.values()] };
}

export function validateWorkspaceBackup(backup) {
  if (!backup || backup.schema !== 'ioc-enricher-backup-v1' || !Array.isArray(backup.observations) || !Array.isArray(backup.cases) || !Array.isArray(backup.notes) || backup.observations.length > 5000 || backup.cases.length > 500 || backup.notes.length > 5000) throw new Error('Backup inválido');
  if (!backup.observations.every(item => item && typeof item.indicator === 'string' && item.indicator.length <= 2048 && ['ip', 'domain', 'url', 'hash'].includes(item.type) && Number.isFinite(Date.parse(item.timestamp)) && (item.risk?.score == null || Number.isFinite(item.risk.score) && item.risk.score >= 0 && item.risk.score <= 100))) throw new Error('Observações inválidas');
  if (!backup.cases.every(item => item && typeof item.id === 'string' && item.id.length <= 100 && typeof item.title === 'string' && item.title.length <= 200 && Array.isArray(item.iocs) && item.iocs.length <= 500 && item.iocs.every(ioc => typeof ioc === 'string' && ioc.length <= 2048))) throw new Error('Casos inválidos');
  if (!backup.notes.every(item => item && typeof item.indicator === 'string' && item.indicator.length <= 2048 && typeof item.notes === 'string' && item.notes.length <= 100_000 && Array.isArray(item.tags) && item.tags.length <= 100 && item.tags.every(tag => typeof tag === 'string' && tag.length <= 100))) throw new Error('Notas inválidas');
  return backup;
}

export async function importWorkspaceBackup(input) {
  const backup = validateWorkspaceBackup(input);
  const database = await openDatabase();
  await migrateLegacy(database);
  const existingObservations = new Set((await loadInvestigations()).map(item => `${item.indicator}:${item.timestamp}`));
  const existingCases = new Set((await loadCases()).map(item => item.id));
  const transaction = database.transaction('notes', 'readonly');
  const existingNotes = new Set((await requestResult(transaction.objectStore('notes').getAll())).map(item => item.indicator));
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith('ioc_note_')) existingNotes.add(key.slice(9));
  }
  const write = database.transaction(['observations', 'cases', 'notes'], 'readwrite');
  const observations = write.objectStore('observations');
  backup.observations.filter(data => !existingObservations.has(`${data.indicator}:${data.timestamp}`)).forEach(data => observations.put({ id: `observation:${data.indicator}:${data.timestamp}`, indicator: data.indicator, timestamp: data.timestamp, data }));
  const cases = write.objectStore('cases');
  backup.cases.filter(item => !existingCases.has(item.id)).forEach(item => cases.put(item));
  const notes = write.objectStore('notes');
  backup.notes.filter(item => !existingNotes.has(item.indicator)).forEach(item => notes.put(item));
  await transactionDone(write);
  const updated = await loadInvestigations();
  mirror(updated);
  return updated;
}
