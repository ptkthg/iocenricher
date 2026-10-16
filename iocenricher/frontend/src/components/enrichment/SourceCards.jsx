import { C } from '../../lib/theme';
import Icon from '../Icon';
import { Card, Badge } from '../UI';

const SOURCE_ICONS = {
  virustotal:    '/icons/virustotal.png',
  abuseipdb:     '/icons/abuseipdb.png',
  ipinfo:        '/icons/ipinfo.png',
  shodan:        '/icons/shodan.png',
  urlhaus:       '/icons/urlhaus.png',
  malwarebazaar: '/icons/malwarebazaar.png',
  urlscan:       '/icons/urlscan.png',
  groq:          '/icons/groq.png',
  hackertarget:  '/icons/hackertarget.png',
  feodo:         '/icons/feodo.png',
};

export function SourceLogo({ name }) {
  if (SOURCE_ICONS[name]) {
    return (
      <img
        src={SOURCE_ICONS[name]}
        alt={name}
        width="26" height="26"
        style={{ borderRadius: 6, objectFit: "contain", display: "block" }}
      />
    );
  }
  const svgs = {
    passivedns: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#0891b2"/>
        <ellipse cx="13" cy="13" rx="7" ry="4" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M6 13c0 3.5 3.1 6 7 6s7-2.5 7-6" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M13 9v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    whois: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#7c3aed"/>
        <rect x="6" y="7" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M9 11h8M9 14h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    ssl: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#059669"/>
        <rect x="7" y="12" width="12" height="8" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M10 12V9a3 3 0 016 0v3" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="13" cy="16" r="1.5" fill="white"/>
      </svg>
    ),
    subnet: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#d97706"/>
        <circle cx="13" cy="8" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="7" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="19" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M13 10.5v3M10.5 16.5L13 13.5M15.5 16.5L13 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return svgs[name] || <Icon name="search" size={16} color={C.textMuted} />;
}

// Tooltip for info icons
export function AbuseIPDBCard({ data }) {
  const scoreColor = data.abuse_score >= 80 ? C.red : data.abuse_score >= 50 ? C.orange : data.abuse_score >= 20 ? C.yellow : C.green;
  const scoreBg = data.abuse_score >= 80 ? C.redBg : data.abuse_score >= 50 ? C.orangeBg : data.abuse_score >= 20 ? "rgba(250,204,21,0.1)" : C.greenBg;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(192,57,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="abuseipdb" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>AbuseIPDB</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Base colaborativa de denúncias de IP</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {data.is_tor && <Badge color={C.purple} bg="rgba(167,139,250,0.12)">Nó de saída Tor</Badge>}
          <Badge color={scoreColor} bg={scoreBg}>{data.abuse_score}% abuso</Badge>
        </div>
      </div>

      <div className="source-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Confiança de abuso", value: `${data.abuse_score}%`, color: scoreColor },
          { label: "Denúncias", value: data.total_reports?.toLocaleString() || "0", color: data.total_reports > 0 ? C.orange : C.green },
          { label: "Tipo de uso", value: data.usage_type || "—", color: C.text },
          { label: "ISP", value: data.isp?.split(" ").slice(0, 2).join(" ") || "—", color: C.textMuted },
        ].map(item => (
          <div key={item.label} style={{ padding: "12px 14px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {data.last_reported && (
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Última denúncia: <span style={{ color: C.text }}>{new Date(data.last_reported).toLocaleDateString('pt-BR')}</span>
          {data.domain && <> · Domínio: <span style={{ color: C.accentLight }}>{data.domain}</span></>}
        </div>
      )}
    </Card>
  );
}

export function ShodanCard({ data }) {
  const COMMON_PORTS = { 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 27017: "MongoDB", 4444: "C2", 1337: "C2", 31337: "C2" };
  const RISKY_PORTS = [21, 23, 445, 3389, 4444, 1337, 31337, 5900, 27017, 6379];

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="shodan" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Shodan</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Inteligência de rede: portas, serviços e CVEs</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {data.total_vulns > 0 && <Badge color={C.red} bg={C.redBg}>{data.total_vulns} CVEs</Badge>}
          <Badge color={data.total_ports > 10 ? C.orange : C.textMuted} bg="rgba(136,150,173,0.1)">{data.total_ports} portas</Badge>
        </div>
      </div>

      {/* Info row */}
      <div className="source-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Organização", value: data.org || "—" },
          { label: "Sistema", value: data.os || "Desconhecido" },
          { label: "ASN", value: data.asn || "—" },
          { label: "Última coleta", value: data.last_update ? new Date(data.last_update).toLocaleDateString('pt-BR') : "—" },
        ].map(item => (
          <div key={item.label} style={{ padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Open ports */}
      {data.ports?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Portas abertas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.ports.slice(0, 20).map(port => {
              const isRisky = RISKY_PORTS.includes(port);
              const service = COMMON_PORTS[port];
              return (
                <div key={port} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontFamily: "monospace",
                  background: isRisky ? "rgba(248,113,113,0.12)" : "rgba(59,130,246,0.08)",
                  border: `1px solid ${isRisky ? C.red + "44" : C.border}`,
                  color: isRisky ? C.red : C.text, fontWeight: isRisky ? 700 : 400,
                  display: "flex", alignItems: "center", gap: 4
                }}>
                  {isRisky && "⚠ "}{port}{service && <span style={{ fontSize: 10, color: isRisky ? C.red : C.textMuted }}>/{service}</span>}
                </div>
              );
            })}
            {data.ports.length > 20 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.ports.length - 20} outras</span>}
          </div>
        </div>
      )}

      {/* CVEs */}
      {data.vulns?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            Vulnerabilidades associadas ({data.vulns.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.vulns.slice(0, 5).map(vuln => (
              <div key={vuln.cve} style={{ padding: "10px 14px", background: "rgba(248,113,113,0.06)", border: `1px solid ${C.red}33`, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <a href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.red, fontFamily: "monospace", textDecoration: "none" }}>
                    {vuln.cve}
                  </a>
                  {vuln.cvss && (
                    <span style={{ fontSize: 11, background: vuln.cvss >= 9 ? C.redBg : vuln.cvss >= 7 ? C.orangeBg : "rgba(250,204,21,0.1)", color: vuln.cvss >= 9 ? C.red : vuln.cvss >= 7 ? C.orange : C.yellow, padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>
                      CVSS {vuln.cvss}
                    </span>
                  )}
                </div>
                {vuln.summary && <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{vuln.summary}</div>}
              </div>
            ))}
            {data.vulns.length > 5 && <div style={{ fontSize: 12, color: C.textMuted }}>+{data.vulns.length - 5} outras vulnerabilidades</div>}
          </div>
        </div>
      )}

      {/* Services */}
      {data.services?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Serviços identificados</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.services.filter(s => s.product).slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "6px 12px", background: C.bgInput, borderRadius: 7 }}>
                <span style={{ color: C.accentLight, fontFamily: "monospace", fontWeight: 600, minWidth: 50 }}>{s.port}/{s.transport}</span>
                <span style={{ color: C.text }}>{s.product}{s.version && <span style={{ color: C.textMuted }}> {s.version}</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function PassiveDNSCard({ data, type }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(8,145,178,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="passivedns" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Passive DNS</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Resoluções DNS históricas via HackerTarget</p>
        </div>
        <Badge color={C.accentLight} bg="rgba(59,130,246,0.1)" style={{ marginLeft: "auto" }}>
          {data.total} registros
        </Badge>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(type === "ip" ? data.domains : data.records?.map(r => `${r.host} → ${r.ip}`))?.slice(0, 20).map((item, i) => (
          <span key={i} style={{ padding: "4px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, fontFamily: "monospace" }}>
            {item}
          </span>
        ))}
        {data.total > 20 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.total - 20} outros</span>}
      </div>
    </Card>
  );
}

export function WHOISCard({ data }) {
  const ageColor = data.age_days < 30 ? C.orange : C.textMuted;
  const ageBg = data.age_days < 30 ? C.orangeBg : C.bgInput;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="whois" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>WHOIS / RDAP</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Dados de registro do domínio</p>
        </div>
        {data.age_days != null && (
          <Badge color={ageColor} bg={ageBg} style={{ marginLeft: "auto" }}>
            {data.age_days < 30 ? "⚠ Muito recente" : data.age_days < 90 ? "Recente" : "Estabelecido"} ({data.age_days} dias)
          </Badge>
        )}
      </div>
      <div className="source-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Registrado", value: data.created ? new Date(data.created).toLocaleDateString('pt-BR') : "—" },
          { label: "Expira", value: data.expires ? new Date(data.expires).toLocaleDateString('pt-BR') : "—" },
          { label: "Registrar", value: data.registrar?.split(' ').slice(0,2).join(' ') || "—" },
        ].map(item => (
          <div key={item.label} style={{ padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{item.value}</div>
          </div>
        ))}
      </div>
      {data.nameservers?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Servidores DNS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.nameservers.map((ns, i) => (
              <span key={i} style={{ padding: "3px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{ns}</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function SSLCard({ data }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="ssl" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Certificados SSL/TLS</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Registros de transparência de certificados via crt.sh</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {data.has_expired && <Badge color={C.orange} bg={C.orangeBg}>Certificado expirado</Badge>}
          {data.has_self_signed && <Badge color={C.red} bg={C.redBg}>Autoassinado</Badge>}
          <Badge color={C.textMuted} bg="rgba(136,150,173,0.1)">{data.total} total</Badge>
        </div>
      </div>
      {data.related_domains?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Domínios no mesmo certificado ({data.related_domains.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.related_domains.slice(0, 15).map((d, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "rgba(59,130,246,0.08)", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.accentLight, fontFamily: "monospace" }}>{d}</span>
            ))}
            {data.related_domains.length > 15 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.related_domains.length - 15} outros</span>}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.certs?.slice(0, 4).map((cert, i) => (
          <div key={i} style={{ padding: "8px 12px", background: C.bgInput, border: `1px solid ${cert.is_expired ? C.orange + "55" : C.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cert.common_name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{cert.issuer?.split('O=')[1]?.split(',')[0] || cert.issuer?.slice(0, 50)}</div>
            </div>
            {cert.is_expired ? <Badge color={C.orange} bg={C.orangeBg}>Expirado</Badge> : <Badge color={C.green} bg={C.greenBg}>Válido</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SubnetCard({ data }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(217,119,6,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="subnet" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Inteligência de sub-rede</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{data.subnet} — dados do Feodo Tracker</p>
        </div>
        <Badge color={data.total_malicious >= 5 ? C.red : C.orange} bg={data.total_malicious >= 5 ? C.redBg : C.orangeBg} style={{ marginLeft: "auto" }}>
          {data.total_malicious} IPs sinalizados na mesma sub-rede
        </Badge>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {data.malware_families?.map(m => (
          <div key={m.name} style={{ padding: "4px 10px", background: "rgba(248,113,113,0.1)", border: `1px solid ${C.red}33`, borderRadius: 6, fontSize: 12 }}>
            <span style={{ color: C.red, fontWeight: 600 }}>{m.name}</span>
            <span style={{ color: C.textMuted }}> ×{m.count}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.matches?.slice(0, 10).map((m, i) => (
          <span key={i} style={{ padding: "3px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 12, color: C.text, fontFamily: "monospace" }}>{m.ip}</span>
        ))}
      </div>
    </Card>
  );
}

export function TyposquattingCard({ data }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="alert" size={16} color={C.red} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.red }}>⚠ Possível imitação de marca</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Heurística de typosquatting e phishing</p>
        </div>
        <Badge color={C.red} bg={C.redBg} style={{ marginLeft: "auto" }}>Score {data.score}/100</Badge>
      </div>
      {data.matches?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {data.matches.map((m, i) => (
            <div key={i} style={{ padding: "10px 14px", background: m.confidence === "HIGH" ? "rgba(248,113,113,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${m.confidence === "HIGH" ? C.red : C.orange}33`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: m.confidence === "HIGH" ? C.red : C.orange }}>Assemelha-se a "{m.brand}"</span>
                <span style={{ fontSize: 12, color: C.textMuted }}> — {m.technique}</span>
              </div>
              <Badge color={m.confidence === "HIGH" ? C.red : C.orange} bg="transparent">{m.confidence}</Badge>
            </div>
          ))}
        </div>
      )}
      {data.flags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data.flags.map((f, i) => (
            <span key={i} style={{ padding: "3px 10px", background: "rgba(245,158,11,0.1)", border: `1px solid ${C.orange}44`, borderRadius: 5, fontSize: 11, color: C.orange }}>{f}</span>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── VERDICT BANNER ──────────────────────────────────────────────────────────
