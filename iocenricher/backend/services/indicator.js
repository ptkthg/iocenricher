const net = require('node:net');

class IndicatorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IndicatorError';
  }
}

function publicIPv4(value) {
  if (net.isIP(value) !== 4 || !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value)) return false;
  const [a, b] = value.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)));
}

function publicDomain(value) {
  if (typeof value !== 'string' || value.length > 253 || value.length < 4) return false;
  const domain = value.toLowerCase().replace(/\.$/, '');
  if (/(^|\.)(localhost|local|internal|lan)$/.test(domain)) return false;
  if (!/^[a-z0-9.-]+$/.test(domain) || !domain.includes('.') || /\.\.|^\.|\.$/.test(domain)) return false;
  const labels = domain.split('.');
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return false;
  return /[a-z]/.test(labels.at(-1)) && labels.at(-1).length >= 2;
}

function normalizeIndicator(input) {
  if (typeof input !== 'string') throw new IndicatorError('Indicador deve ser um texto.');
  const indicator = input.trim();
  if (!indicator || indicator.length > 2048 || /[\x00-\x1f\x7f]/.test(indicator)) throw new IndicatorError('Indicador vazio, longo demais ou com caracteres inválidos.');
  if (/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(indicator)) return { indicator: indicator.toLowerCase(), type: 'hash' };
  if (net.isIP(indicator) === 4) {
    if (!publicIPv4(indicator)) throw new IndicatorError('Use um IPv4 público para consultas OSINT.');
    return { indicator, type: 'ip' };
  }
  if (/^[\d.]+$/.test(indicator) || net.isIP(indicator) === 6) throw new IndicatorError('Endereço IP inválido ou sem suporte.');
  if (/^https?:\/\//i.test(indicator)) {
    let url;
    try { url = new URL(indicator); } catch { throw new IndicatorError('URL inválida.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new IndicatorError('URL não suportada.');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!publicDomain(host) && !publicIPv4(host)) throw new IndicatorError('A URL deve usar um host público válido.');
    return { indicator: url.href, type: 'url' };
  }
  if (!publicDomain(indicator)) throw new IndicatorError('Domínio inválido.');
  return { indicator: indicator.toLowerCase().replace(/\.$/, ''), type: 'domain' };
}

module.exports = { IndicatorError, normalizeIndicator, publicIPv4, publicDomain };
