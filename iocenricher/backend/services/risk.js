const REPUTATION = {
  ip: ['virustotal', 'abuseipdb'],
  domain: ['virustotal', 'urlhaus'],
  url: ['virustotal', 'urlhaus'],
  hash: ['virustotal', 'malwarebazaar', 'urlhaus'],
};

function calculateRisk(sources = {}, type, sourceStatus = {}) {
  let points = 0;
  const factors = [];
  const add = (score, evidence) => { points += score; factors.push(evidence); };

  const vt = sources.virustotal;
  if (vt) {
    const malicious = Number(vt.malicious) || 0;
    const suspicious = Number(vt.suspicious) || 0;
    if (malicious) add(Math.min(malicious * 5, 60), `VirusTotal: ${malicious} motores marcaram como malicioso`);
    if (suspicious) add(Math.min(suspicious * 2, 20), `VirusTotal: ${suspicious} motores marcaram como suspeito`);
    if (Number(vt.reputation) < -10) add(15, 'VirusTotal: reputação negativa');
  }
  const abuse = sources.abuseipdb;
  if (abuse && Number(abuse.abuse_score) >= 20) {
    const value = Number(abuse.abuse_score);
    add(value >= 80 ? 35 : value >= 50 ? 20 : 10, `AbuseIPDB: confiança de abuso ${value}%`);
  }
  if (abuse?.is_tor) add(10, 'AbuseIPDB: nó Tor; exige contexto antes de qualquer ação');
  if (sources.malwarebazaar?.found) add(45, 'MalwareBazaar: amostra encontrada');
  if (sources.urlhaus?.found) add(40, 'URLhaus: IOC associado a ameaça');
  if (sources.shodan?.total_vulns > 0) add(Math.min(sources.shodan.total_vulns * 5, 20), `Shodan: ${sources.shodan.total_vulns} CVE(s) associadas`);
  if (sources.whois?.found && Number.isFinite(sources.whois.age_days) && sources.whois.age_days >= 0 && sources.whois.age_days < 30) add(15, `WHOIS: domínio registrado há ${sources.whois.age_days} dias`);
  if (sources.typosquatting?.is_suspicious) add(Math.min(Number(sources.typosquatting.score) || 15, 30), 'Heurística local: possível typosquatting');
  if (sources.ssl?.has_expired) add(5, 'Certificado TLS expirado');
  if (sources.ssl?.has_self_signed) add(5, 'Certificado TLS autoassinado');
  if (sources.subnet?.found && sources.subnet.total_malicious > 0) add(Math.min(sources.subnet.total_malicious * 5, 20), `Subnet: ${sources.subnet.total_malicious} IP(s) sinalizados`);

  const relevant = REPUTATION[type] || [];
  const successful = relevant.filter(name => ['ok', 'no_match'].includes(sourceStatus[name]) || (sourceStatus[name] == null && sources[name]));
  const failed = relevant.filter(name => sourceStatus[name] && !['ok', 'no_match'].includes(sourceStatus[name]));
  const coverage = { successful: successful.length, total: relevant.length, sources: successful, failed };
  const score = successful.length || points > 0 ? Math.min(Math.round(points), 100) : null;

  const confirmedMalicious = (Number(vt?.malicious) || 0) >= 8 || Boolean(sources.malwarebazaar?.found || sources.urlhaus?.found);
  let level, classification;
  if (score === null) { level = 'INCONCLUSIVO'; classification = 'INCONCLUSIVO'; }
  else if (score >= 40 && confirmedMalicious) { level = score >= 70 ? 'CRÍTICO' : 'ALTO'; classification = 'MALICIOSO'; }
  else if (score >= 15) { level = 'MÉDIO'; classification = 'SUSPEITO'; }
  else if (successful.length) { level = 'BAIXO'; classification = 'BAIXO_RISCO_OBSERVADO'; }
  else { level = 'INCONCLUSIVO'; classification = 'INCONCLUSIVO'; }

  if (!successful.length) factors.push('Nenhuma fonte de reputação respondeu com resultado verificável; não há base para concluir que o IOC é seguro');
  else if (failed.length) factors.push(`Cobertura parcial: ${failed.join(', ')} não concluíram a consulta`);
  if (score >= 40 && !confirmedMalicious) factors.push('Score elevado por sinais contextuais, sem confirmação de reputação suficiente para classificar como malicioso');
  if (score === 0) factors.push('As fontes disponíveis não apresentaram sinais positivos de ameaça nesta coleta');

  const positive = successful.filter(name => name === 'virustotal' ? (Number(vt?.malicious) || 0) > 0 || (Number(vt?.suspicious) || 0) > 0 : name === 'abuseipdb' ? (Number(abuse?.abuse_score) || 0) >= 20 : Boolean(sources[name]?.found));
  const disagreement = positive.length > 0 && positive.length < successful.length;
  if (disagreement) factors.push('Fontes de reputação divergem; confirme o contexto antes de agir');
  const confidenceLevel = successful.length >= 2 && !disagreement ? 'ALTA' : successful.length ? 'MÉDIA' : 'BAIXA';
  const confidence = { level: confidenceLevel, reason: `${successful.length}/${relevant.length} fontes de reputação concluídas${disagreement ? '; sinais divergentes' : ''}` };
  const recommendation = classification === 'SUSPEITO' ? 'MONITORAR' : 'INVESTIGAR';
  return { score, level, classification, recommendation, factors, confidence, coverage };
}

module.exports = { calculateRisk };
