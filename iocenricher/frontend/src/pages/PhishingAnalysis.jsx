import { useState, useRef } from "react";
import { C, FONT } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, PageHeader } from "../components/UI";

// ── LOCAL EML PARSER ─────────────────────────────────────────────
function parseEml(content) {
  const sepIdx = content.search(/\r?\n\r?\n/);
  const headerSection = sepIdx !== -1 ? content.slice(0, sepIdx) : content;
  const body = sepIdx !== -1 ? content.slice(sepIdx + 2) : "";

  // Unfold multi-line headers (RFC 2822 §2.2.3)
  const unfolded = headerSection.replace(/\r?\n[ \t]+/g, " ");

  function get(name) {
    const m = unfolded.match(new RegExp(`^${name}:\\s*(.+)`, "im"));
    return m ? m[1].trim() : null;
  }
  function getAll(name) {
    const re = new RegExp(`^${name}:\\s*(.+)`, "gim");
    const out = [];
    let m;
    while ((m = re.exec(unfolded)) !== null) out.push(m[1].trim());
    return out;
  }

  const headers = {
    from: get("From"),
    replyTo: get("Reply-To"),
    returnPath: get("Return-Path"),
    received: getAll("Received"),
    xOriginatingIP: get("X-Originating-IP"),
    messageId: get("Message-ID"),
    subject: get("Subject"),
    date: get("Date"),
  };

  const urlRe = /https?:\/\/[^\s"'<>)\]\\]+/gi;
  const urls = [
    ...new Set([
      ...(body.match(urlRe) || []),
      ...(headerSection.match(urlRe) || []),
    ].map(u => u.replace(/[.,;:]+$/, ""))),
  ];

  const ipRe = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  const ipSrc = [body, ...headers.received, headers.xOriginatingIP || ""].join("\n");
  const ips = [...new Set(ipSrc.match(ipRe) || [])].filter(
    ip => !ip.startsWith("127.") && !ip.startsWith("0.") && ip !== "255.255.255.255"
  );

  return { headers, urls, ips };
}

// ── COPY BUTTON ──────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function handle(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handle}
      title="Copy"
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        padding: 4, borderRadius: 6, color: copied ? C.green : C.textDim,
        display: "flex", alignItems: "center", transition: "color 0.15s", flexShrink: 0,
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.text; }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = C.textDim; }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
    </button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function PhishingAnalysis({ onInvestigate }) {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function processFile(file) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".eml")) {
      setError("Invalid file. Please select a .eml file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target.result;
      // Validate: EML files must have at least one header-like line
      if (!/^[\w-]+:\s/m.test(content)) {
        setError("File does not appear to be a valid EML file.");
        return;
      }
      try {
        setFileName(file.name);
        setResult(parseEml(content));
      } catch {
        setError("Failed to parse the EML file.");
      }
    };
    reader.readAsText(file);
  }

  function handleInput(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleReset() {
    setResult(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const headerRows = [
    { label: "From",             value: result?.headers.from },
    { label: "Reply-To",         value: result?.headers.replyTo },
    { label: "Return-Path",      value: result?.headers.returnPath },
    { label: "Date",             value: result?.headers.date },
    { label: "Subject",          value: result?.headers.subject },
    { label: "Message-ID",       value: result?.headers.messageId },
    { label: "X-Originating-IP", value: result?.headers.xOriginatingIP },
  ].filter(r => r.value);

  return (
    <>
      <PageHeader
        title="Phishing Analysis"
        subtitle="Upload an .eml file to extract headers, URLs, and IPs for investigation."
        actions={result && (
          <>
            <Button
              variant="secondary"
              icon={<Icon name="x" size={14} />}
              onClick={handleReset}
            >
              Clear
            </Button>
            <Button
              icon={<Icon name="external" size={14} color="#fff" />}
              onClick={() => window.open("https://app.phishtool.com", "_blank", "noopener noreferrer")}
            >
              Analyze in PhishTool
            </Button>
          </>
        )}
      />

      {/* ── Upload zone ── */}
      {!result && (
        <Card>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? C.accent : C.border}`,
              borderRadius: 12,
              padding: "64px 40px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
              background: dragging ? "rgba(59,130,246,0.05)" : "transparent",
            }}
          >
            <div style={{ marginBottom: 16, transition: "opacity 0.2s", opacity: dragging ? 1 : 0.45 }}>
              <Icon name="mail" size={52} color={dragging ? C.accentLight : C.textMuted} />
            </div>
            <div style={{ fontSize: 16, color: C.text, fontWeight: 500, marginBottom: 8 }}>
              {dragging ? "Release to analyze" : "Drop your .eml file here"}
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
              or click to browse · only .eml files are accepted
            </div>
            <Button variant="secondary" icon={<Icon name="upload" size={14} />}>
              Select .eml file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".eml,message/rfc822"
              onChange={handleInput}
              style={{ display: "none" }}
            />
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: C.redBg, border: `1px solid ${C.red}44`,
              borderRadius: 8, color: C.red, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="alert" size={14} color={C.red} />
              {error}
            </div>
          )}
        </Card>
      )}

      {/* ── Results ── */}
      {result && (
        <>
          {/* File bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
            padding: "10px 16px", background: C.bgCard,
            border: `1px solid ${C.border}`, borderRadius: 10,
          }}>
            <Icon name="mail" size={16} color={C.accentLight} />
            <span style={{ fontSize: 13, color: C.text, flex: 1, fontFamily: "monospace" }}>{fileName}</span>
            <Badge color={C.green} bg={C.greenBg}>Parsed</Badge>
            <button
              onClick={handleReset}
              title="Clear"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: C.textMuted, display: "flex", padding: 4, borderRadius: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
            >
              <Icon name="x" size={15} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Headers card ── */}
            <Card>
              <SectionHeader
                icon="info" iconColor={C.accentLight} iconBg="rgba(59,130,246,0.12)"
                title="Email Headers"
                badge={<Badge color={C.accentLight} bg="rgba(59,130,246,0.1)">{headerRows.length + result.headers.received.length} fields</Badge>}
              />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {headerRows.map(({ label, value }) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                      <td style={labelTd}>{label}</td>
                      <td style={{ padding: "10px 0", color: C.text, wordBreak: "break-all" }}>{value}</td>
                      <td style={{ padding: "10px 0 10px 10px", verticalAlign: "top" }}>
                        <CopyBtn text={value} />
                      </td>
                    </tr>
                  ))}
                  {result.headers.received.length > 0 && (
                    <tr>
                      <td style={{ ...labelTd, verticalAlign: "top" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          Received
                          <Badge color={C.textMuted} bg="rgba(136,150,173,0.1)">
                            {result.headers.received.length}
                          </Badge>
                        </span>
                      </td>
                      <td style={{ padding: "10px 0" }} colSpan={2}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {result.headers.received.map((r, i) => (
                            <div key={i} style={{
                              fontSize: 12, color: C.text, fontFamily: "monospace",
                              background: C.bgInput, padding: "7px 10px",
                              borderRadius: 6, border: `1px solid ${C.border}`,
                              wordBreak: "break-all", display: "flex", alignItems: "flex-start", gap: 8,
                            }}>
                              <span style={{ flex: 1 }}>{r}</span>
                              <CopyBtn text={r} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* ── URLs card ── */}
            <Card>
              <SectionHeader
                icon="link" iconColor={C.orange} iconBg="rgba(245,158,11,0.12)"
                title="Extracted URLs"
                badge={
                  <Badge
                    color={result.urls.length ? C.orange : C.textMuted}
                    bg={result.urls.length ? C.orangeBg : "rgba(136,150,173,0.1)"}
                  >
                    {result.urls.length} found
                  </Badge>
                }
              />
              {result.urls.length === 0 ? (
                <EmptyState message="No URLs found in this email." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {result.urls.map((url, i) => (
                    <div key={i} style={itemRow}>
                      <Icon name="link" size={14} color={C.orange} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: "monospace", wordBreak: "break-all" }}>
                        {url}
                      </span>
                      <CopyBtn text={url} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── IPs card ── */}
            <Card>
              <SectionHeader
                icon="globe" iconColor={C.red} iconBg="rgba(248,113,113,0.12)"
                title="Extracted IPs"
                badge={
                  <Badge
                    color={result.ips.length ? C.red : C.textMuted}
                    bg={result.ips.length ? C.redBg : "rgba(136,150,173,0.1)"}
                  >
                    {result.ips.length} found
                  </Badge>
                }
              />
              {result.ips.length === 0 ? (
                <EmptyState message="No IPs found in this email." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {result.ips.map((ip, i) => (
                    <div key={i} style={itemRow}>
                      <Icon name="globe" size={14} color={C.red} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: "monospace" }}>{ip}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <CopyBtn text={ip} />
                        {onInvestigate && (
                          <button
                            onClick={() => onInvestigate(ip)}
                            title="Enrich this IP"
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              padding: 4, borderRadius: 6, color: C.textDim,
                              display: "flex", alignItems: "center", transition: "color 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = C.accentLight}
                            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                          >
                            <Icon name="search" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

// ── MICRO COMPONENTS ─────────────────────────────────────────────
function SectionHeader({ icon, iconColor, iconBg, title, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon name={icon} size={15} color={iconColor} />
      </div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</h3>
      <div style={{ marginLeft: "auto" }}>{badge}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: "24px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
      {message}
    </div>
  );
}

const labelTd = {
  padding: "10px 16px 10px 0",
  color: C.textMuted,
  whiteSpace: "nowrap",
  verticalAlign: "top",
  width: 160,
  fontSize: 13,
};

const itemRow = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 12px",
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
};
