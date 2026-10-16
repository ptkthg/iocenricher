export const SETTINGS_KEY = 'iocenricher_settings';

export function readPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(SETTINGS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function validSlackWebhook(value) {
  return /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(value || '');
}

export function savePreferences(storage, preferences) {
  if (preferences.slackAlerts && !validSlackWebhook(preferences.slackWebhook)) {
    throw new Error('Informe um webhook oficial do Slack para ativar as notificações.');
  }
  storage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
}
