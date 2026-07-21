import { Landmark } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark"><Landmark size={compact ? 17 : 21} strokeWidth={2.2} /></span>
      <span className="brand__name">Kaikei</span>
      {!compact && <span className="brand__tag">Conciliación inteligente</span>}
    </div>
  );
}

export function AppHeader({
  email,
  plan,
  onHome,
  onLogout,
}: {
  email: string | null;
  plan: string;
  onHome: () => void;
  onLogout: () => void;
}) {
  const initial = (email || "C").charAt(0).toUpperCase();
  return (
    <header className="app-header">
      <button className="header-brand" onClick={onHome} aria-label="Ir al inicio">
        <Brand compact />
      </button>
      <div className="header-spacer" />
      <div className="secure-chip"><span className="secure-dot" /> Sesión de ChatGPT</div>
      <details className="account-menu">
        <summary>
          <span className="avatar">{initial}</span>
          <span className="account-copy"><strong>{email || "Cuenta ChatGPT"}</strong><small>Plan {formatPlan(plan)}</small></span>
        </summary>
        <div className="account-popover">
          <p>Conectado mediante Codex App Server</p>
          <button onClick={onLogout}>Cerrar sesión</button>
        </div>
      </details>
    </header>
  );
}

function formatPlan(plan: string) {
  return plan.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (value) => value.toUpperCase());
}
