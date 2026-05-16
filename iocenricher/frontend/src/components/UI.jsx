import { C, FONT } from "../lib/theme";

const cardBase = {
  background: "linear-gradient(145deg, #0c1e36 0%, #081628 100%)",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

export function Card({ children, style = {}, ...props }) {
  return (
    <div
      style={{ ...cardBase, ...style }}
      onMouseEnter={e => {
        if (props.onClick || style.cursor === "pointer") {
          e.currentTarget.style.borderColor = C.borderAccent;
          e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(96,165,250,0.1), inset 0 1px 0 rgba(255,255,255,0.05)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = cardBase.boxShadow;
      }}
      {...props}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

export function Badge({ children, color = C.accent, bg, style = {} }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 6,
      background: bg || `${color}18`,
      color,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: FONT,
      border: `1px solid ${color}30`,
      whiteSpace: "nowrap",
      letterSpacing: "0.03em",
      ...style
    }}>{children}</span>
  );
}

export function Button({ children, variant = "primary", icon, onClick, disabled, style = {}, ...props }) {
  const variants = {
    primary: {
      bg: `linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)`,
      color: "#fff",
      border: "rgba(59,130,246,0.5)",
      shadow: "0 4px 14px rgba(59,130,246,0.3)",
      hoverShadow: "0 6px 24px rgba(59,130,246,0.5)",
    },
    secondary: {
      bg: "rgba(255,255,255,0.04)",
      color: C.text,
      border: C.border,
      shadow: "none",
      hoverShadow: "none",
      hoverBorder: C.borderAccent,
    },
    ghost: {
      bg: "transparent",
      color: C.textMuted,
      border: "transparent",
      shadow: "none",
      hoverShadow: "none",
    },
    danger: {
      bg: C.redBg,
      color: C.red,
      border: "rgba(248,113,113,0.3)",
      shadow: "none",
      hoverShadow: `0 4px 16px ${C.redGlow}`,
    },
    success: {
      bg: C.greenBg,
      color: C.green,
      border: "rgba(52,211,153,0.3)",
      shadow: "none",
      hoverShadow: `0 4px 16px ${C.greenGlow}`,
    },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 18px",
        background: disabled ? `${C.border}80` : v.bg,
        color: disabled ? C.textDim : v.color,
        border: `1px solid ${disabled ? C.border : v.border}`,
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s ease",
        boxShadow: disabled ? "none" : v.shadow,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = v.hoverShadow || v.shadow;
          if (v.hoverBorder) e.currentTarget.style.borderColor = v.hoverBorder;
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = v.shadow;
          if (v.hoverBorder) e.currentTarget.style.borderColor = v.border;
        }
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", style = {}, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: "10px 14px",
        background: C.bgInput,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        color: C.text,
        fontSize: 13,
        fontFamily: FONT,
        outline: "none",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        ...style
      }}
      onFocus={e => {
        e.target.style.borderColor = C.accent;
        e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`;
      }}
      onBlur={e => {
        e.target.style.borderColor = C.border;
        e.target.style.boxShadow = "none";
      }}
      {...props}
    />
  );
}

export function Select({ value, onChange, options, style = {}, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: "10px 36px 10px 14px",
        background: C.bgInput,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        color: C.text,
        fontSize: 13,
        fontFamily: FONT,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b85a8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        transition: "border-color 0.2s",
        ...style
      }}
      onFocus={e => { e.target.style.borderColor = C.accent; }}
      onBlur={e => { e.target.style.borderColor = C.border; }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function StatBox({ label, value, change, changeType, icon, iconColor, iconBg, footer }) {
  const col = iconColor || C.accent;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</span>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: iconBg || `linear-gradient(135deg, ${col}22, ${col}0d)`,
            border: `1px solid ${col}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px ${col}20`,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1, marginBottom: 10, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {change && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{
            color: changeType === "down" ? C.red : C.green,
            display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 600,
            background: changeType === "down" ? C.redBg : C.greenBg,
            padding: "2px 8px", borderRadius: 6, border: `1px solid ${changeType === "down" ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}`,
          }}>
            {changeType === "down" ? "↓" : "↑"} {change}
          </span>
          {footer && <span style={{ color: C.textMuted }}>{footer}</span>}
        </div>
      )}
      {!change && footer && (
        <div style={{ fontSize: 12, color: C.textMuted }}>{footer}</div>
      )}
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header-actions" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, marginBottom: 5, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions" style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
