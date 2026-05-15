function calculateRisk(sources, type) {
  let score = 0;
  const factors = [];

  if (sources.virustotal) {
    const vt = sources.virustotal;
    score += (vt.malicious || 0) * 5 + (vt.suspicious || 0) * 2;
    if (vt.malicious > 0) factors.push(`${vt.malicious} engines detectaram como malicioso no VirusTotal`);
    if (vt.suspicious > 0) factors.push(`${vt.suspicious} engines marcaram como suspeito`);
    if (vt.reputation < -10) { score += 15; factors.push('Reputação muito negativa no VirusTotal'); }
  }

  if (sources.ipinfo) {
    const ip = sources.ipinfo;
    if (ip.is_bogon) { score += 30; factors.push('IP é bogon (não roteável publicamente)'); }
    if (ip.is_anycast) factors.push('IP é anycast (múltiplos servidores)');
    if (ip.org) factors.push(`Organização: ${ip.org}`);
  }

  if (sources.abuseipdb) {
    const ab = sources.abuseipdb;
    if (ab.abuse_score >= 80) { score += 35; factors.push(`AbuseIPDB: ${ab.abuse_score}% abuse confidence (${ab.total_reports} reports)`); }
    else if (ab.abuse_score >= 50) { score += 20; factors.push(`AbuseIPDB: ${ab.abuse_score}% abuse confidence`); }
    else if (ab.abuse_score >= 20) { score += 10; factors.push(`AbuseIPDB: ${ab.abuse_score}% abuse confidence`); }
    if (ab.is_tor) { score += 15; factors.push('IP é nó Tor (anonimização)'); }
  }

  if (sources.shodan) {
    const sh = sources.shodan;
    if (sh.total_vulns > 0) { score += Math.min(sh.total_vulns * 8, 30); factors.push(`Shodan: ${sh.total_vulns} CVE(s) conhecida(s)`); }
    if (sh.ports?.some(p => [4444,1337,31337].includes(p))) { score += 15; factors.push('Portas C2 comuns abertas'); }
    if (sh.total_ports > 20) { score += 5; factors.push(`${sh.total_ports} portas abertas`); }
  }

  if (sources.subnet?.found) {
    const sn = sources.subnet;
    if (sn.total_malicious >= 5) { score += 20; factors.push(`${sn.total_malicious} IPs maliciosos na mesma subnet /24`); }
    else if (sn.total_malicious >= 2) { score += 10; factors.push(`${sn.total_malicious} IPs maliciosos na mesma subnet`); }
    else if (sn.total_malicious >= 1) { score += 5; factors.push(`${sn.total_malicious} IP malicioso na subnet`); }
  }

  if (sources.malwarebazaar?.found) {
    score += 40;
    factors.push('Hash encontrado no MalwareBazaar — amostra maliciosa conhecida');
    if (sources.malwarebazaar.signature) factors.push(`Assinatura malware: ${sources.malwarebazaar.signature}`);
  }

  if (sources.urlhaus?.found) {
    score += 35;
    if (sources.urlhaus.threat) factors.push(`URLhaus identificou ameaça: ${sources.urlhaus.threat}`);
    if (sources.urlhaus.url_count > 0) factors.push(`${sources.urlhaus.url_count} URLs maliciosas associadas`);
  }

  if (sources.whois?.found) {
    const w = sources.whois;
    if (w.age_days !== null && w.age_days < 30) { score += 25; factors.push(`Domínio registrado há apenas ${w.age_days} dias (muito recente)`); }
    else if (w.age_days !== null && w.age_days < 90) { score += 12; factors.push(`Domínio registrado há ${w.age_days} dias (recente)`); }
    if (w.status?.some(s => s.includes('clientHold'))) { score += 10; factors.push('Domínio com status clientHold (suspenso)'); }
  }

  if (sources.typosquatting?.is_suspicious) {
    const t = sources.typosquatting;
    score += Math.min(t.score, 30);
    if (t.matches?.length > 0) factors.push(`Possível typosquatting: imita "${t.matches[0].brand}" (${t.matches[0].technique})`);
    if (t.suspicious_tld) factors.push(`TLD suspeito: ${t.suspicious_tld}`);
    t.flags?.forEach(f => factors.push(f));
  }

  if (sources.ssl?.has_self_signed) { score += 5; factors.push('Certificado SSL auto-assinado detectado'); }
  if (sources.ssl?.has_expired) { score += 8; factors.push('Certificado SSL expirado'); }

  score = Math.min(score, 100);

  let level, recommendation;
  if (score >= 70) { level = 'CRÍTICO'; recommendation = 'BLOQUEAR'; }
  else if (score >= 40) { level = 'ALTO'; recommendation = 'INVESTIGAR'; }
  else if (score >= 15) { level = 'MÉDIO'; recommendation = 'MONITORAR'; }
  else { level = 'BAIXO'; recommendation = 'IGNORAR'; }

  return { score, level, recommendation, factors };
}

module.exports = { calculateRisk };
