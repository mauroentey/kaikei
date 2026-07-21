import { ArrowRight, Check, ExternalLink, FileLock2, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";

export function LoginScreen({
  loading,
  awaiting,
  status,
  error,
  onLogin,
  onChooseCodex,
}: {
  loading: boolean;
  awaiting: boolean;
  status: string;
  error: string;
  onLogin: () => void;
  onChooseCodex: () => void;
}) {
  return (
    <div className="login-page">
      <div className="login-topbar"><Brand /></div>
      <div className="login-grid">
        <section className="login-hero">
          <span className="eyebrow"><Sparkles size={13} /> Diseñado para equipos contables de Colombia</span>
          <h1>Conciliar bancos<br />sin perder el hilo.</h1>
          <p className="hero-lead">Cruza libros y extractos, explica cada diferencia y entrega un reporte listo para revisar.</p>
          <div className="hero-points">
            <div><span><ScanSearch /></span><p><strong>Cruces auditables</strong><small>Por valor, fecha, referencia y agrupaciones.</small></p></div>
            <div><span><FileLock2 /></span><p><strong>Archivos bajo tu control</strong><small>La lectura y normalización ocurren en tu equipo.</small></p></div>
            <div><span><ShieldCheck /></span><p><strong>Criterio colombiano</strong><small>Hallazgos prudentes, con soporte y revisión humana.</small></p></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-card visual-card--back">
              <span>EXTRACTO</span><i /><i /><i />
            </div>
            <div className="visual-card visual-card--front">
              <span>AUXILIAR</span>
              <div><i /><b><Check size={12} /></b></div>
              <div><i /><b><Check size={12} /></b></div>
              <div><i className="short" /><b className="waiting" /></div>
            </div>
            <div className="match-badge"><Check size={18} /><strong>96,8%</strong><small>conciliado</small></div>
          </div>
        </section>

        <section className="login-panel-wrap">
          <div className="login-panel">
            <div className="login-panel__icon"><Brand compact /></div>
            <h2>Bienvenido a Kaikei</h2>
            <p>Usa tu cuenta de ChatGPT para analizar la conciliación con Codex.</p>
            {error && <div className="alert alert--error">{error}</div>}
            <button className="chatgpt-button" onClick={onLogin} disabled={loading || awaiting}>
              <span className="openai-mark">◎</span>
              <span>{loading ? "Comprobando sesión…" : awaiting ? "Completa el acceso en tu navegador…" : "Continuar con ChatGPT"}</span>
              {!loading && !awaiting && <ArrowRight size={18} />}
              {(loading || awaiting) && <span className="spinner spinner--light" />}
            </button>
            {awaiting && <p className="browser-hint"><ExternalLink size={13} /> Dejamos abierta la ventana de acceso de ChatGPT.</p>}
            <div className="login-divider"><span>Conexión local segura</span></div>
            <div className="server-note">
              <ShieldCheck size={18} />
              <div><strong>Codex App Server</strong><small>{status}</small></div>
            </div>
            {error && /Codex|ejecutable|encontr/i.test(error) && (
              <button className="text-button" onClick={onChooseCodex}>Seleccionar ejecutable de Codex</button>
            )}
            <p className="terms">Al continuar, aceptas usar la sesión de ChatGPT para procesar la información que decidas cargar. Kaikei no solicita ni almacena tu contraseña.</p>
          </div>
          <p className="login-footnote">Creado por Mauricio Samper · Bogotá, Colombia · mauro@entey.net</p>
        </section>
      </div>
    </div>
  );
}
