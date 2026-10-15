const allowedDays = new Set([1, 7, 30]);
const quoted = value => `"${value.replace(/[\\"]/g, '\\$&')}"`;

export function generateHunt({ observation, platform, days, index }) {
  if (!observation || !allowedDays.has(Number(days))) throw new Error('Selecione uma observação e janela temporal válidas.');
  const { indicator, type } = observation;
  if (typeof indicator !== 'string' || indicator.length > 2048 || /[\x00-\x1f\x7f]/.test(indicator)) throw new Error('IOC inválido.');
  if (type === 'ip' && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(indicator) || type === 'domain' && !/^[a-z0-9.-]+$/i.test(indicator) || type === 'hash' && !/^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(indicator) || type === 'url' && !/^https?:\/\//i.test(indicator) || !['ip', 'domain', 'hash', 'url'].includes(type)) throw new Error('IOC incompatível com os templates.');
  const value = quoted(indicator);
  const period = Number(days);
  if (platform === 'kql') {
    if (type === 'ip') return { title: 'Microsoft Defender XDR · KQL', query: `DeviceNetworkEvents\n| where Timestamp >= ago(${period}d)\n| where RemoteIP == ${value}\n| project Timestamp, DeviceName, ActionType, RemoteIP, RemotePort, RemoteUrl, InitiatingProcessFileName\n| order by Timestamp desc`, limitation: 'Requer telemetria do Defender for Endpoint. Pesquise também LocalIP se o IOC puder ser origem.', model: 'DeviceNetworkEvents' };
    if (type === 'domain' || type === 'url') return { title: 'Microsoft Defender XDR · KQL', query: `DeviceNetworkEvents\n| where Timestamp >= ago(${period}d)\n| where RemoteUrl == ${value}\n| project Timestamp, DeviceName, ActionType, RemoteIP, RemoteUrl, InitiatingProcessFileName\n| order by Timestamp desc`, limitation: 'RemoteUrl pode conter apenas FQDN ou URL conforme a telemetria. Ajuste o filtro para o seu ambiente.', model: 'DeviceNetworkEvents' };
    const field = indicator.length === 32 ? 'MD5' : indicator.length === 40 ? 'SHA1' : 'SHA256';
    return { title: 'Microsoft Defender XDR · KQL', query: `DeviceFileEvents\n| where Timestamp >= ago(${period}d)\n| where ${field} == ${value}\n| project Timestamp, DeviceName, ActionType, FileName, FolderPath, ${field}\n| order by Timestamp desc`, limitation: `${field} pode não estar preenchido em todos os eventos. Verifique a cobertura da tabela DeviceFileEvents.`, model: 'DeviceFileEvents' };
  }
  if (platform === 'spl') {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,50}$/.test(index || '')) throw new Error('Informe um índice Splunk válido.');
    return { title: 'Splunk · SPL', query: `search index=${index} earliest=-${period}d latest=now ${value}\n| table _time host source sourcetype _raw\n| sort - _time`, limitation: 'Busca textual em eventos brutos. Informe um índice real e substitua por campos normalizados do seu ambiente para melhorar precisão e custo.', model: 'Eventos brutos' };
  }
  if (platform === 'yara') {
    const field = type === 'ip' ? 'target.ip' : type === 'domain' ? 'target.hostname' : type === 'url' ? 'target.url' : `target.file.${indicator.length === 32 ? 'md5' : indicator.length === 40 ? 'sha1' : 'sha256'}`;
    const extra = type === 'ip' ? `\nor principal.ip = ${value}` : '';
    return { title: 'Google SecOps · YARA-L 2.0 Search', query: `${field} = ${value}${extra}`, limitation: `Execute em Search com janela de ${period} dia(s) no seletor de tempo. A disponibilidade do campo depende do mapeamento UDM. Isto é uma busca, não uma regra persistente.`, model: 'UDM Search' };
  }
  throw new Error('Plataforma não suportada.');
}
