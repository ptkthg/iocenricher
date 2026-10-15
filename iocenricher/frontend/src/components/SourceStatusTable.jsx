import { C } from '../lib/theme';
import { sourceStatusView } from '../lib/sourceStatus';

const names = {
  virustotal: 'VirusTotal', ipinfo: 'IPinfo', abuseipdb: 'AbuseIPDB', shodan: 'Shodan',
  passivedns: 'Passive DNS', whois: 'WHOIS / RDAP', ssl: 'crt.sh', subnet: 'Feodo Tracker',
  typosquatting: 'Heurística local', urlhaus: 'URLhaus', malwarebazaar: 'MalwareBazaar', groq: 'Groq',
};

export default function SourceStatusTable({ statuses = {}, timestamp }) {
  const rows = Object.entries(statuses);
  if (!rows.length) return null;
  return <section className="panel panel-pad" aria-label="Estado das fontes desta coleta">
    <h3 className="panel-title">Estado das fontes nesta coleta</h3>
    <p style={{ color: C.textMuted, marginTop: 0 }}>Registro coletado em {timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'horário não informado'}. “Sem correspondência” indica consulta concluída, não comprova que o IOC é seguro.</p>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Fonte</th><th>Resultado da consulta</th></tr></thead><tbody>{rows.map(([name, status]) => {
      const state = sourceStatusView(status);
      return <tr key={name}><td>{names[name] || name}</td><td style={{ color: state.color }}>{state.label}</td></tr>;
    })}</tbody></table></div>
  </section>;
}
