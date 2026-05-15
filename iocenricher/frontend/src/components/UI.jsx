import { C, FONT } from "../lib/theme";

export function Card({ children, style = {}, ...props }) {
  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 20,
      ...style
    }} {...props}>{children}</div>
  );
}

export function Badge({ children, color = C.accent, bg, style = {} }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 6,
      background: bg || `${color}22`,
      color,
      fontSize: 11,
      fontWeight: 500,
      fontFamily: FONT,
      border: `1px solid ${color}33`,
      whiteSpace: "nowrap",
      ...style
    }}>{children}</span>
  );
}

export function Button({ children, variant = "primary", icon, onClick, disabled, style = {}, ...props }) {
  const variants = {
    primary: { bg: C.accent, color: "#fff", border: C.accent },
    secondary: { bg: "transparent", color: C.text, border: C.border },
    ghost: { bg: "transparent", color: C.textMuted, border: "transparent" },
    danger: { bg: C.redBg, color: C.red, border: `${C.red}55` },
    success: { bg: C.greenBg, color: C.green, border: `${C.green}55` },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        background: disabled ? C.border : v.bg,
        color: disabled ? C.textDim : v.color,
        border: `1px solid ${disabled ? C.border : v.border}`,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        ...style
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
        borderRadius: 8,
        color: C.text,
        fontSize: 13,
        fontFamily: FONT,
        outline: "none",
        transition: "border-color 0.15s",
        ...style
      }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
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
        padding: "10px 14px",
        background: C.bgInput,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: C.text,
        fontSize: 13,
        fontFamily: FONT,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 32,
        ...style
      }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function StatBox({ label, value, change, changeType, icon, iconColor, iconBg, footer }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: iconBg || `${iconColor || C.accent}22`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.1, marginBottom: 8 }}>
        {value}
      </div>
      {change && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{
            color: changeType === "down" ? C.red : C.green,
            display: "inline-flex", alignItems: "center", gap: 2, fontWeight: 500
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
    <div className="page-header-actions" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions" style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
