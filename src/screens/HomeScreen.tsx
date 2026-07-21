import { ArrowRight, BarChart3, Clock3, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import type { Account } from "../types";

export function HomeScreen({ account, onStart }: { account: Account; onStart: () => void }) {
  const name = account.email?.split("@")[0]?.split(/[._-]/)[0] || "equipo";
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div className="home-page page-enter">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">Panel de conciliación</span>
          <h1>Hola, {capitalized}.</h1>
          <p>Deja que Kaikei haga el cruce pesado. Tú conservas la última palabra.</p>
        </div>
        <div className="today-chip"><Clock3 size={16} /><span><small>Hoy</small>{new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" }).format(new Date())}</span></div>
      </section>

      <section className="start-card">
        <div className="start-card__content">
          <div className="start-icon"><Sparkles /></div>
          <span className="eyebrow eyebrow--light">Nueva conciliación</span>
          <h2>De dos fuentes,<br />una sola historia.</h2>
          <p>Carga el auxiliar contable y uno o varios extractos. Obtendrás cruces, partidas pendientes, hallazgos y ajustes sugeridos.</p>
          <button className="primary-button primary-button--light" onClick={onStart}>
            Iniciar conciliación <ArrowRight size={18} />
          </button>
        </div>
        <div className="start-card__graphic" aria-hidden="true">
          <div className="orbit orbit--one" /><div className="orbit orbit--two" />
          <div className="mini-sheet mini-sheet--left"><span>LIBROS</span><i /><i /><i /><i /></div>
          <div className="mini-sheet mini-sheet--right"><span>BANCO</span><i /><i /><i /><i /></div>
          <div className="graphic-check"><FileCheck2 /></div>
        </div>
      </section>

      <section className="home-info-grid">
        <article>
          <span className="info-icon"><FileCheck2 /></span>
          <div><h3>Qué puedes cargar</h3><p>XLSX, CSV, OFX, QFX o PDF. Puedes combinar varios extractos de la misma cuenta.</p></div>
        </article>
        <article>
          <span className="info-icon"><BarChart3 /></span>
          <div><h3>Qué vas a recibir</h3><p>Dashboard, detalle conciliado, hallazgos y archivo final en Excel, PDF o JSON.</p></div>
        </article>
        <article>
          <span className="info-icon"><ShieldCheck /></span>
          <div><h3>Control antes que automatismo</h3><p>Los ajustes siempre quedan como sugerencias para soportar, revisar y aprobar.</p></div>
        </article>
      </section>

      <section className="empty-history">
        <div><h3>Conciliaciones recientes</h3><span className="status-pill">En este equipo</span></div>
        <p>Aún no hay conciliaciones guardadas en esta sesión.</p>
      </section>
    </div>
  );
}
