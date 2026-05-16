import { useState } from "react";
import { C, FONT } from "../lib/theme";

const ACCOUNTS_KEY = "iocenricher_accounts";
const USER_KEY = "iocenricher_user";
const SESSION_KEY = "iocenricher_session";

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
}
function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Simple hash to avoid plaintext passwords in localStorage
async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const Logo = () => (
  <div style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", margin: "0 auto 20px", boxShadow: `0 8px 24px ${C.accent}44` }}>
    <img src="/logo.png" alt="IOC Enricher" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  </div>
);

function Field({ label, type = "text", value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, display: "block", fontFamily: FONT }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type === "password" ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "11px 14px", paddingRight: type === "password" ? 40 : 14,
            background: C.bgInput, border: `1px solid ${error ? C.red : C.border}`,
            borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FONT,
            outline: "none", boxSizing: "border-box", transition: "border-color 0.2s"
          }}
          onFocus={e => !error && (e.target.style.borderColor = C.accent)}
          onBlur={e => !error && (e.target.style.borderColor = C.border)}
        />
        {type === "password" && (
          <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 11, fontFamily: FONT }}>
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, loading, style = {} }) {
  const base = {
    width: "100%", padding: "12px 20px", borderRadius: 10, border: "none",
    fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "all 0.2s", opacity: disabled ? 0.6 : 1, ...style
  };
  const styles = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, color: "#fff", boxShadow: disabled ? "none" : `0 4px 16px ${C.accent}44` },
    secondary: { background: C.bgInput, color: C.textMuted, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...base, ...styles[variant] }}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

function Spinner() {
  return <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
function SignIn({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit() {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setErrors({});

    try {
      const accounts = getAccounts();
      const hashed = await hashPassword(password);

      // Check stored accounts
      const match = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.passwordHash === hashed);

      // Legacy fallback: ptkamp1@gmail.com with any 4+ char password
      const isLegacy = email.toLowerCase() === "ptkamp1@gmail.com" && password.length >= 4 && !match;

      if (match || isLegacy) {
        const user = match
          ? { email: match.email, name: match.name, role: match.role || "Analista SOC" }
          : { email, name: "Patrick Thiago", role: "Analista SOC" };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        onLogin(user);
      } else {
        setErrors({ password: "Invalid email or password" });
      }
    } catch {
      setErrors({ password: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" error={errors.email} />
      <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" error={errors.password} />
      <Btn onClick={handleSubmit} loading={loading} disabled={loading}>Sign In</Btn>
      <div style={{ textAlign: "center", fontSize: 12, color: C.textMuted }}>
        Don't have an account?{" "}
        <button type="button" onClick={() => onSwitch("register")} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>Create one</button>
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
function Register({ onLogin, onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("Analista SOC");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() || !email.includes("@")) e.email = "Valid email is required";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    if (password !== confirm) e.confirm = "Passwords don't match";
    if (Object.keys(e).length) { setErrors(e); return; }

    const accounts = getAccounts();
    if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      setErrors({ email: "Email already registered" });
      return;
    }

    setLoading(true);
    try {
      const hashed = await hashPassword(password);
      const newAccount = { name: name.trim(), email: email.toLowerCase(), passwordHash: hashed, role, createdAt: new Date().toISOString() };
      saveAccounts([...accounts, newAccount]);
      setSuccess(true);
      setTimeout(() => {
        const user = { email: newAccount.email, name: newAccount.name, role: newAccount.role };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        onLogin(user);
      }, 1200);
    } catch {
      setErrors({ email: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Account created!</div>
      <div style={{ fontSize: 13, color: C.textMuted }}>Signing you in...</div>
    </div>
  );

  const roles = ["Analista SOC", "Analista Sênior", "Threat Hunter", "Detection Engineer", "CISO", "Estudante", "Outro"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" error={errors.name} />
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" error={errors.email} />
      <div>
        <label style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, display: "block", fontFamily: FONT }}>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} style={{
          width: "100%", padding: "11px 14px", background: C.bgInput, border: `1px solid ${C.border}`,
          borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FONT, outline: "none", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
        }}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" error={errors.password} />
      <Field label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" error={errors.confirm} />
      <Btn onClick={handleSubmit} loading={loading} disabled={loading}>Create Account</Btn>
      <div style={{ textAlign: "center", fontSize: 12, color: C.textMuted }}>
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("login")} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>Sign in</button>
      </div>
    </div>
  );
}

// ─── Main Login page ──────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  function handleGuest() {
    const guest = { email: "guest@iocenricher.app", name: "Guest", role: "Visitor", isGuest: true };
    localStorage.setItem(USER_KEY, JSON.stringify(guest));
    localStorage.setItem(SESSION_KEY, Date.now().toString());
    onLogin(guest);
  }

  const titles = { login: "Welcome back", register: "Create account" };
  const subtitles = { login: "Sign in to your SOC workspace", register: "Join the Blue Team platform" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: C.bg, fontFamily: FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-branding { display: flex; }
        .login-form { width: 460px; padding: 40px 48px; }
        @media (max-width: 768px) {
          .login-branding { display: none !important; }
          .login-form { width: 100% !important; padding: 32px 24px !important; min-height: 100vh; }
        }
      `}</style>

      {/* Left panel — branding (hidden on mobile) */}
      <div className="login-branding" style={{ flex: 1, flexDirection: "column", justifyContent: "center", padding: "60px 80px", background: `linear-gradient(160deg, #040f22 0%, #030d1c 100%)`, borderRight: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 440, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, overflow: "hidden", boxShadow: `0 4px 12px ${C.accentGlow}` }}>
              <img src="/logo.png" alt="IOC Enricher" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>IOC Enricher</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Blue Team Intelligence Platform</div>
            </div>
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: "0 0 16px", lineHeight: 1.2 }}>
            Analyze threats.<br />
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Protect your network.</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, margin: "0 0 40px" }}>
            Enrich indicators of compromise with data from VirusTotal, IPinfo, URLhaus, MalwareBazaar and more — with AI-powered analysis and MITRE ATT&CK mapping.
          </p>

          {[
            { icon: "🔍", text: "Real-time IOC enrichment from 4+ OSINT sources" },
            { icon: "🧠", text: "AI analysis powered by Groq Llama 3.3 70B" },
            { icon: "🗺️", text: "MITRE ATT&CK technique mapping" },
            { icon: "📊", text: "Visual investigation graph" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: C.textMuted }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-form" style={{ display: "flex", flexDirection: "column", justifyContent: "center", overflowY: "auto", background: "#040e1e" }}>
        <Logo />

        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 6px", textAlign: "center" }}>
          {titles[mode] || "Welcome back"}
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 28px", textAlign: "center" }}>
          {subtitles[mode] || "Sign in to your SOC workspace"}
        </p>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: C.bgInput, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
          {[["login", "Sign In"], ["register", "Create Account"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMode(key)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 13, fontWeight: mode === key ? 600 : 400,
              background: mode === key ? C.bgCard : "transparent",
              color: mode === key ? C.text : C.textMuted,
              boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
              transition: "all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {mode === "login" && <SignIn onLogin={onLogin} onSwitch={setMode} />}
        {mode === "register" && <Register onLogin={onLogin} onSwitch={setMode} />}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.textDim }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Guest access */}
        <Btn variant="ghost" onClick={handleGuest}>
          <span style={{ fontSize: 16 }}>👤</span>
          Continue as Guest
        </Btn>
        <p style={{ fontSize: 11, color: C.textDim, textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
          Guests can analyze IOCs but data won't be saved between sessions.
        </p>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: C.textDim, margin: 0 }}>Built by Patrick Thiago Rezende dos Santos</p>
          <p style={{ fontSize: 10, color: C.textDim, margin: "4px 0 0" }}>Analista SOC · Blue Team Portfolio</p>
        </div>
      </div>

    </div>
  );
}
