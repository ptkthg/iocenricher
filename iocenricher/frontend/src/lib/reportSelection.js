export function observationKey(item) {
  return `${item.indicator}\u0000${item.timestamp || ''}`;
}

export function selectedObservations(history, selectedKeys, visible) {
  if (!selectedKeys.length) return visible;
  const keys = new Set(selectedKeys);
  return history.filter(item => keys.has(observationKey(item)));
}
