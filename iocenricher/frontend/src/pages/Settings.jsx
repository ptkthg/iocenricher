import { useState, useEffect } from "react";
import { C, FONT } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, Input, PageHeader } from "../components/UI";
import { useLang } from "../contexts/LangContext";

const STORAGE_KEY = "iocenricher_settings";

const DEFAULT_SETTINGS = {
  appName: "IOC Enricher",
  timezone: "UTC-03:00 Brasilia",
  defaultType: "Auto-detect",
  defaultVisibility: "Private (Only me)",
  autoEnrich: true,
  storeHistory: true,
  retainDays: "90",
  theme: "Dark",
  emailAlerts: false,
  emailRecipients: "",
  slackAlerts: false,
  slackWebhook: "",
  slackChannel: "#soc-alerts",
  webhookAlerts: false,
  webhookUrl: "",
  webhookEvents: "All High/Critical",
  exportFormat: "JSON",
  exportFields: "All fields",
  includeTechnical: true,
  includeRawData: false,
  includeScreenshots: false,
  reportLogoUrl: "",
  reportFooter: "Confidential — For internal use only",
  scoringWeights: {
    sourceReputation: 40,
    threatIntelligence: 30,
    indicatorAge: 15,
    contextBehavior: 15,
  },
};

const TABS = ["General", "Integrations", "Scoring", "Notifications", "Export", "Profile"];

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12, padding: 2,
      background: checked ? C.accent : C.border,
      border: "none", cursor: "pointer",
      display: "flex", alignItems: "center",
      transition: "background 0.2s",
      flexShrink: 0
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        transform: checked ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0",
      borderBottom: last ? "none" : `1px solid ${C.borderSubtle}`,
      gap: 20
    }}>
      <div>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.textMuted }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        <Icon name={icon} size={17} color={C.accentLight} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 3 }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: C.textMuted }}>{desc}</div>}
      </div>
    </div>
  );
}

function IntegrationCard({ name, icon, status, detail1, detail2, apiKey, onSave }) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState(apiKey || "");
  const isOnline = status === "Connected";

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? C.green : C.red }} />
              <span style={{ fontSize: 11, color: isOnline ? C.green : C.red }}>{status}</span>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>API Key</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Enter API key..."
              type="password"
              style={{ flex: 1, fontSize: 12 }}
            />
            <Button onClick={() => { onSave?.(key); setEditing(false); }} style={{ padding: "8px 12px", fontSize: 12 }}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} style={{ padding: "8px 12px", fontSize: 12 }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{detail1}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{detail2}</div>
        </div>
      )}

      <Button
        variant="secondary"
        onClick={() => setEditing(e => !e)}
        style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
      >
        {editing ? "Cancel" : "Manage"}
      </Button>
    </Card>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [saved, setSaved] = useState(false);
  const [sourceHealth, setSourceHealth] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [notifTestMsg, setNotifTestMsg] = useState(null);

  // Load user profile
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("iocenricher_user") || "{}"); } catch { return {}; }
  });

  const API_BASE = import.meta.env.VITE_API_URL || "/api";

  async function fetchSourceHealth() {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/health/sources`);
      if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error("unavailable");
      const data = await res.json();
      const map = {};
      data.sources?.forEach(s => { map[s.name] = s; });
      setSourceHealth(map);
    } catch {}
    setRefreshing(false);
  }

  useEffect(() => { fetchSourceHealth(); }, []);

  async function testSlackWebhook() {
    if (!settings.slackWebhook) return;
    setNotifTestMsg({ type: "loading", text: "Sending test..." });
    try {
      const res = await fetch(`${API_BASE}/notify/slack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: settings.slackWebhook,
          result: { indicator: "test.example.com", type: "domain", risk: { score: 75, level: "ALTO", factors: ["Test notification from IOC Enricher"] }, recommendation: "INVESTIGAR", mitre: [] }
        })
      });
      if (res.ok) setNotifTestMsg({ type: "success", text: "✓ Message sent to Slack!" });
      else setNotifTestMsg({ type: "error", text: "Failed — check webhook URL" });
    } catch { setNotifTestMsg({ type: "error", text: "Connection error" }); }
    setTimeout(() => setNotifTestMsg(null), 3000);
  }

  async function handleChangePassword() {
    if (!pwOld || !pwNew || !pwConfirm) { setPwMsg({ type: "error", text: "Fill all fields" }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ type: "error", text: "Passwords don't match" }); return; }
    if (pwNew.length < 6) { setPwMsg({ type: "error", text: "Min. 6 characters" }); return; }
    setPwLoading(true);
    try {
      const hash = async pw => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw)))).map(b => b.toString(16).padStart(2,"0")).join("");
      const oldHash = await hash(pwOld);
      const newHash = await hash(pwNew);
      const accounts = JSON.parse(localStorage.getItem("iocenricher_accounts") || "[]");
      const idx = accounts.findIndex(a => a.email === profile.email && a.passwordHash === oldHash);
      if (idx < 0) { setPwMsg({ type: "error", text: "Current password incorrect" }); setPwLoading(false); return; }
      accounts[idx].passwordHash = newHash;
      localStorage.setItem("iocenricher_accounts", JSON.stringify(accounts));
      setPwMsg({ type: "success", text: "✓ Password changed successfully!" });
      setPwOld(""); setPwNew(""); setPwConfirm("");
    } catch { setPwMsg({ type: "error", text: "Error changing password" }); }
    setPwLoading(false);
    setTimeout(() => setPwMsg(null), 3000);
  }

  function saveProfile() {
    localStorage.setItem("iocenricher_user", JSON.stringify(profile));
    saveSettings();
  }

  function update(key, value) { setSettings(s => ({ ...s, [key]: value })); }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetSettings() {
    if (window.confirm("Reset all settings to default?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure IOC Enricher to match your environment and operational needs."
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 18px",
            background: "transparent",
            border: "none",
            borderBottom: `2px solid ${activeTab === tab ? C.accent : "transparent"}`,
            color: activeTab === tab ? C.accentLight : C.textMuted,
            fontSize: 13, fontFamily: FONT, fontWeight: activeTab === tab ? 500 : 400,
            cursor: "pointer", transition: "all 0.15s",
            marginBottom: -1
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ========== GENERAL ========== */}
      {activeTab === "General" && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <SectionTitle icon="settings" title="General Settings" />
            <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Application Name</div>
                <Input value={settings.appName} onChange={e => update("appName", e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Time Zone</div>
                <select value={settings.timezone} onChange={e => update("timezone", e.target.value)} style={selectStyle}>
                  <option>UTC-03:00 Brasilia</option>
                  <option>UTC-05:00 EST</option>
                  <option>UTC+00:00 GMT</option>
                  <option>UTC+01:00 CET</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Default Indicator Type</div>
                <select value={settings.defaultType} onChange={e => update("defaultType", e.target.value)} style={selectStyle}>
                  <option>Auto-detect</option>
                  <option>IP</option>
                  <option>Domain</option>
                  <option>URL</option>
                  <option>Hash</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Default Visibility</div>
                <select value={settings.defaultVisibility} onChange={e => update("defaultVisibility", e.target.value)} style={selectStyle}>
                  <option>Private (Only me)</option>
                  <option>Team</option>
                  <option>Organization</option>
                </select>
              </div>
            </div>

            <SettingRow label="Enable auto enrichment" desc="Automatically enrich indicators on analysis.">
              <Toggle checked={settings.autoEnrich} onChange={v => update("autoEnrich", v)} />
            </SettingRow>
            <SettingRow label="Store enrichment history" desc="Keep historical data for trend analysis.">
              <Toggle checked={settings.storeHistory} onChange={v => update("storeHistory", v)} />
            </SettingRow>
            <SettingRow label="Retain data for" desc="How long to keep history in local storage." last>
              <select value={settings.retainDays} onChange={e => update("retainDays", e.target.value)} style={{ ...selectStyle, width: 120 }}>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
              </select>
            </SettingRow>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Theme</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Dark", "System"].map(t => (
                  <button key={t} onClick={() => update("theme", t)} style={{
                    padding: "8px 20px", borderRadius: 8,
                    background: settings.theme === t ? "rgba(59,130,246,0.15)" : "transparent",
                    border: `1px solid ${settings.theme === t ? C.accent : C.border}`,
                    color: settings.theme === t ? C.accentLight : C.textMuted,
                    fontSize: 13, fontFamily: FONT, cursor: "pointer"
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Button onClick={saveSettings} icon={saved ? <Icon name="check" size={14} color="#fff" /> : null}>
                {saved ? "Saved!" : "Save Changes"}
              </Button>
              <Button variant="secondary" onClick={resetSettings}>Reset to Default</Button>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="info" title="About" desc="IOC Enricher version and system information." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Version", "1.0.0"],
                ["Environment", "Development"],
                ["Backend", "http://localhost:3001"],
                ["Storage", "localStorage"],
                ["Author", "Patrick Thiago Rezende dos Santos"],
                ["Role", "Analista SOC / Blue Team"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 10, borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <span style={{ color: C.textMuted }}>{k}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: 14, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Backend URL</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  value={settings.backendUrl || "http://localhost:3001"}
                  onChange={e => update("backendUrl", e.target.value)}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <Button variant="secondary" icon={<Icon name="refresh" size={14} />} style={{ fontSize: 12 }}>
                  Test
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========== INTEGRATIONS ========== */}
      {activeTab === "Integrations" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
              Configure and manage data sources used for enrichment.
              {sourceHealth && Object.keys(sourceHealth).length > 0 && (
                <span style={{ marginLeft: 10, color: C.textDim, fontSize: 12 }}>
                  Last checked: {new Date().toLocaleTimeString()}
                </span>
              )}
            </p>
            <Button variant="secondary" onClick={fetchSourceHealth} disabled={refreshing}
              icon={<Icon name="refresh" size={14} color={refreshing ? C.textDim : C.textMuted} />}>
              {refreshing ? "Checking..." : "Refresh All"}
            </Button>
          </div>

          <div className="three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { key: "virustotal", name: "VirusTotal", icon: "🛡", detail: "Malware detection · 70+ engines", link: "https://www.virustotal.com" },
              { key: "ipinfo", name: "IPinfo", icon: "🌍", detail: "Geolocation · ASN · Organization", link: "https://ipinfo.io" },
              { key: "urlhaus", name: "URLhaus", icon: "🚨", detail: "Malware URLs · No API key needed", link: "https://urlhaus.abuse.ch" },
              { key: "malwarebazaar", name: "MalwareBazaar", icon: "☠", detail: "Hash lookup · No API key needed", link: "https://bazaar.abuse.ch" },
              { key: "abuseipdb", name: "AbuseIPDB", icon: "🛑", detail: "IP abuse reports · Crowd-sourced", link: "https://www.abuseipdb.com" },
              { key: "shodan", name: "Shodan", icon: "📡", detail: "Port scan · CVEs · Banner grabbing", link: "https://www.shodan.io" },
              { key: "groq", name: "Groq (AI)", icon: "🧠", detail: "Llama 3.3 70B · AI Analysis", link: "https://console.groq.com" },
            ].map(src => {
              const health = sourceHealth[src.key];
              const isOnline = health?.status === "online";
              const isAuthError = health?.status === "auth_error";
              const statusLabel = !health ? "Checking..." : isOnline ? "Online" : isAuthError ? "Auth Error" : "Offline";
              const statusColor = !health ? C.textDim : isOnline ? C.green : C.red;
              return (
                <Card key={src.key} style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{src.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{src.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
                          <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
                          {health?.latency && <span style={{ fontSize: 10, color: C.textDim }}>{health.latency}ms</span>}
                        </div>
                      </div>
                    </div>
                    <a href={src.link} target="_blank" rel="noopener noreferrer" style={{ color: C.textDim, fontSize: 11 }}>↗</a>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>{src.detail}</div>
                  {health?.error && <div style={{ fontSize: 11, color: C.red, marginBottom: 8, padding: "4px 8px", background: C.redBg, borderRadius: 5 }}>{health.error}</div>}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ========== SCORING ========== */}
      {activeTab === "Scoring" && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <SectionTitle icon="target" title="Scoring Configuration" desc="Define risk score thresholds and weights used to classify indicators." />

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={thSt}>RISK LEVEL</th>
                  <th style={thSt}>SCORE RANGE</th>
                  <th style={thSt}>COLOR</th>
                  <th style={{ ...thSt, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: "Low", range: "0 – 14", color: C.green },
                  { level: "Medium", range: "15 – 39", color: C.yellow },
                  { level: "High", range: "40 – 69", color: C.orange },
                  { level: "Critical", range: "70 – 100", color: C.red },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                    <td style={tdSt}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color }} />
                        <span style={{ color: C.text }}>{row.level}</span>
                      </span>
                    </td>
                    <td style={{ ...tdSt, color: C.textMuted }}>{row.range}</td>
                    <td style={tdSt}>
                      <span style={{ width: 24, height: 14, borderRadius: 3, background: row.color, display: "inline-block" }} />
                    </td>
                    <td style={{ ...tdSt, textAlign: "right" }}>
                      <Icon name="edit" size={14} color={C.textDim} style={{ cursor: "pointer" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Score Factors <Icon name="info" size={13} color={C.textDim} />
              </div>
              {[
                { label: "Source Reputation", desc: "Ex: VirusTotal, URLhaus, MalwareBazaar", key: "sourceReputation" },
                { label: "Threat Intelligence Hits", desc: "Ex: Feeds, blacklists, reports", key: "threatIntelligence" },
                { label: "Indicator Age", desc: "Recency of last seen / publication", key: "indicatorAge" },
                { label: "Context & Behavior", desc: "ASN, hosting, content analysis", key: "contextBehavior" },
              ].map((f, i, arr) => (
                <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderSubtle}` : "none", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{f.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0" max="100"
                      value={settings.scoringWeights[f.key]}
                      onChange={e => update("scoringWeights", { ...settings.scoringWeights, [f.key]: Number(e.target.value) })}
                      style={{ width: 56, padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, textAlign: "center", fontFamily: FONT, outline: "none" }}
                    />
                    <span style={{ fontSize: 12, color: C.textMuted }}>%</span>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={saveSettings} style={{ marginTop: 20 }}>Save Scoring</Button>
          </Card>

          <Card>
            <SectionTitle icon="pieChart" title="Score Preview" desc="How scores translate to risk levels in real time." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { score: 95, label: "185.220.101.1 (Tor exit node)", level: "CRÍTICO" },
                { score: 65, label: "malicious-example.com", level: "ALTO" },
                { score: 30, label: "suspicious-cdn.net", level: "MÉDIO" },
                { score: 5, label: "8.8.8.8 (Google DNS)", level: "BAIXO" },
              ].map((ex, i) => {
                const cfg = ex.level === "CRÍTICO" ? { color: C.red, bg: C.redBg } :
                  ex.level === "ALTO" ? { color: C.orange, bg: C.orangeBg } :
                  ex.level === "MÉDIO" ? { color: C.yellow, bg: C.yellowBg } :
                  { color: C.green, bg: C.greenBg };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{ex.score}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.label}</div>
                      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                        <div style={{ width: `${ex.score}%`, height: "100%", background: cfg.color, borderRadius: 2 }} />
                      </div>
                    </div>
                    <Badge color={cfg.color} bg={cfg.bg}>{ex.level}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ========== NOTIFICATIONS ========== */}
      {activeTab === "Notifications" && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <SectionTitle icon="bell" title="Notification Settings" desc="Configure how and when you receive alerts and updates." />

            <NotifSection icon="send" label="Email Alerts" desc="Receive important alerts via email." checked={settings.emailAlerts} onChange={v => update("emailAlerts", v)}>
              {settings.emailAlerts && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Recipients</div>
                  <Input value={settings.emailRecipients} onChange={e => update("emailRecipients", e.target.value)}
                    placeholder="ptkamp1@gmail.com, soc@company.com"
                    style={{ width: "100%", fontSize: 12 }} />
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>Separate emails with commas</div>
                </div>
              )}
            </NotifSection>

            <NotifSection icon="zap" label="Slack Alerts" desc="Send alerts to Slack channels." checked={settings.slackAlerts} onChange={v => update("slackAlerts", v)}>
              {settings.slackAlerts && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Webhook URL</div>
                    <Input value={settings.slackWebhook} onChange={e => update("slackWebhook", e.target.value)}
                      placeholder="https://hooks.slack.com/services/..." style={{ width: "100%", fontSize: 12 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Channel</div>
                    <Input value={settings.slackChannel} onChange={e => update("slackChannel", e.target.value)}
                      placeholder="#soc-alerts" style={{ width: "100%", fontSize: 12 }} />
                  </div>
                  <Button variant="secondary" onClick={testSlackWebhook} disabled={!settings.slackWebhook}
                    icon={<Icon name="zap" size={13} />} style={{ fontSize: 12, padding: "7px 14px", alignSelf: "flex-start" }}>
                    Send Test Message
                  </Button>
                  {notifTestMsg && (
                    <div style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: notifTestMsg.type === "success" ? C.greenBg : notifTestMsg.type === "error" ? C.redBg : "rgba(59,130,246,0.1)", color: notifTestMsg.type === "success" ? C.green : notifTestMsg.type === "error" ? C.red : C.accentLight }}>
                      {notifTestMsg.text}
                    </div>
                  )}
                </div>
              )}
            </NotifSection>

            <NotifSection icon="activity" label="Webhook Alerts" desc="Send JSON payloads to your endpoint." checked={settings.webhookAlerts} onChange={v => update("webhookAlerts", v)} last>
              {settings.webhookAlerts && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Webhook URL</div>
                    <Input value={settings.webhookUrl} onChange={e => update("webhookUrl", e.target.value)}
                      placeholder="https://alerts.company.com/webhook/ioc"
                      style={{ width: "100%", fontSize: 12 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Events</div>
                    <select value={settings.webhookEvents} onChange={e => update("webhookEvents", e.target.value)} style={selectStyle}>
                      <option>All High/Critical</option>
                      <option>Critical Only</option>
                      <option>All Events</option>
                    </select>
                  </div>
                </div>
              )}
            </NotifSection>

            <Button onClick={saveSettings} style={{ marginTop: 20 }}>Save Notifications</Button>
          </Card>

          <Card>
            <SectionTitle icon="reports" title="Export Preferences" desc="Customize default fields and branding for exported reports." />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Default Format</div>
                  <select value={settings.exportFormat} onChange={e => update("exportFormat", e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    <option>JSON</option>
                    <option>CSV</option>
                    <option>PDF</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Default Fields</div>
                  <select value={settings.exportFields} onChange={e => update("exportFields", e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    <option>All fields</option>
                    <option>Summary only</option>
                    <option>Risk + Sources</option>
                  </select>
                </div>
              </div>

              <SettingRow label="Include Technical Context">
                <Toggle checked={settings.includeTechnical} onChange={v => update("includeTechnical", v)} />
              </SettingRow>
              <SettingRow label="Include Raw Data">
                <Toggle checked={settings.includeRawData} onChange={v => update("includeRawData", v)} />
              </SettingRow>
              <SettingRow label="Include Screenshots" last>
                <Toggle checked={settings.includeScreenshots} onChange={v => update("includeScreenshots", v)} />
              </SettingRow>

              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Report Footer Text</div>
                <Input value={settings.reportFooter} onChange={e => update("reportFooter", e.target.value)}
                  style={{ width: "100%", fontSize: 12 }} />
              </div>
            </div>

            <Button onClick={saveSettings} style={{ marginTop: 20 }}>Save Export Settings</Button>
          </Card>
        </div>
      )}

      {/* ========== EXPORT ========== */}
      {activeTab === "Export" && (
        <Card>
          <SectionTitle icon="download" title="Bulk Export" desc="Export your enrichment data in various formats." />
          <div className="three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { format: "JSON", icon: "file", desc: "Full enrichment data with all source details", color: C.accentLight },
              { format: "CSV", icon: "fileText", desc: "Spreadsheet-friendly format for filtering and analysis", color: C.green },
              { format: "Markdown", icon: "reports", desc: "Documentation-ready format for Jira, Confluence, Notion", color: C.purple },
            ].map(f => (
              <Card key={f.format} style={{ padding: 20, background: C.bgInput }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={f.icon} size={18} color={f.color} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: f.color }}>{f.format}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>{f.desc}</div>
                <Button variant="secondary" icon={<Icon name="download" size={14} />} style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
                  Export as {f.format}
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ========== PROFILE ========== */}
      {activeTab === "Profile" && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <SectionTitle icon="user" title={"Profile Settings"} desc="Manage your personal information and preferences." />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: 16, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {profile.name?.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{profile.name || "—"}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{profile.role || "Analista SOC"}</div>
                <div style={{ fontSize: 11, color: C.accentLight, marginTop: 4 }}>{profile.email || "—"}</div>
              </div>
            </div>

            {[
              { label: "Full Name", key: "name" },
              { label: "Role", key: "role" },
              { label: "Email", key: "email" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{f.label}</div>
                <Input value={profile[f.key] || ""} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: "100%", fontSize: 13 }} />
              </div>
            ))}
            <Button onClick={saveProfile} icon={saved ? <Icon name="check" size={14} color="#fff" /> : null} style={{ marginTop: 8 }}>
              {saved ? "Saved!" : "Save Profile"}
            </Button>
          </Card>

          <Card>
            <SectionTitle icon="lock" title={"Security"} desc="Manage your account security." />

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 14, background: C.greenBg, border: `1px solid ${C.green}44`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="check" size={16} color={C.green} />
                <div>
                  <div style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>Password Hashed</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>SHA-256 stored locally</div>
                </div>
              </div>
              {profile.isGuest && (
                <div style={{ padding: 14, background: C.orangeBg, border: `1px solid ${C.orange}44`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="alert" size={16} color={C.orange} />
                  <div>
                    <div style={{ fontSize: 12, color: C.orange, fontWeight: 500 }}>Guest Session</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>Create an account to save data</div>
                  </div>
                </div>
              )}
            </div>

            {!profile.isGuest && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 14 }}>Change Password</div>
                {[
                  { label: "Current Password", val: pwOld, set: setPwOld },
                  { label: "New Password", val: pwNew, set: setPwNew },
                  { label: "Confirm New Password", val: pwConfirm, set: setPwConfirm },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{f.label}</div>
                    <Input type="password" value={f.val} onChange={e => f.set(e.target.value)} style={{ width: "100%", fontSize: 13 }} />
                  </div>
                ))}
                {pwMsg && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: pwMsg.type === "success" ? C.greenBg : C.redBg, color: pwMsg.type === "success" ? C.green : C.red, fontSize: 12 }}>
                    {pwMsg.text}
                  </div>
                )}
                <Button onClick={handleChangePassword} disabled={pwLoading}
                  icon={pwLoading ? <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> : null}>
                  {pwLoading ? "Changing..." : "Change Password"}
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

// ============ MICRO COMPONENTS ============
const thSt = { textAlign: "left", padding: "10px 8px 10px 0", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 };
const tdSt = { padding: "12px 8px 12px 0", fontSize: 13 };

const selectStyle = {
  padding: "9px 32px 9px 12px",
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 13,
  fontFamily: FONT,
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  width: "100%",
};

function NotifSection({ icon, label, desc, checked, onChange, children, last }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: last ? "none" : `1px solid ${C.borderSubtle}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: children && checked ? 0 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={16} color={C.accentLight} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{desc}</div>
          </div>
        </div>
        <Toggle checked={checked} onChange={onChange} />
      </div>
      {children}
    </div>
  );
}
