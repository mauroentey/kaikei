import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReconciliationReport, RunResult } from "../types";

type Tab = "summary" | "movements" | "findings" | "adjustments";

const COLORS = ["#2d7a67", "#d8a64b", "#c86a59"];

export function ResultsScreen({ result, onNew, demo }: { result: RunResult; onNew: () => void; demo: boolean }) {
  const { report } = result;
  const [tab, setTab] = useState<Tab>("summary");
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const pieData = useMemo(() => [
    { name: "Conciliados", value: report.metrics.matchedCount },
    { name: "Pendientes en libros", value: report.metrics.unmatchedBookCount },
    { name: "Pendientes en banco", value: report.metrics.unmatchedBankCount },
  ].filter((item) => item.value > 0), [report]);
  const amountData = [
    { name: "Pendiente en libros", value: report.metrics.unmatchedBookAmount },
    { name: "Pendiente en banco", value: report.metrics.unmatchedBankAmount },
  ];

  const exportReport = async (format: "xlsx" | "pdf" | "json") => {
    if (demo) {
      setToast("La exportación se habilita al ejecutar una conciliación real.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    setExporting(format);
    try {
      const response = await window.kaikei.report.export(result.reportId, format);
      if (!response.canceled) {
        setToast(`Reporte ${format.toUpperCase()} guardado correctamente.`);
        setTimeout(() => setToast(""), 3500);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(null);
    }
  };

  const reconciled = Math.abs(report.metrics.differenceAfter) <= 1;
  return (
    <div className="results-page page-enter">
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
      <div className="results-heading">
        <div>
          <div className="breadcrumbs"><span>Conciliaciones</span><ArrowRight size={13} /><strong>{report.metadata.cutoffDate}</strong></div>
          <div className="results-title-line"><h1>Reporte de conciliación</h1><span className={`result-status ${reconciled ? "is-success" : "is-review"}`}>{reconciled ? <CheckCircle2 /> : <CircleAlert />}{reconciled ? "Saldos ajustados conciliados" : "Requiere revisión"}</span></div>
          <p>{report.metadata.entityName || "Entidad sin nombre"} · {report.metadata.accountLabel || "Cuenta bancaria"}</p>
        </div>
        <div className="results-actions">
          <button className="secondary-button" onClick={onNew}><Plus size={17} /> Nueva conciliación</button>
          <div className="export-menu">
            <button className="primary-button" onClick={() => exportReport("xlsx")} disabled={Boolean(exporting)}><ArrowDownToLine size={17} /> {exporting === "xlsx" ? "Generando…" : "Descargar archivo final"}</button>
            <details>
              <summary aria-label="Más formatos"><ChevronDown size={17} /></summary>
              <div><button onClick={() => exportReport("xlsx")}><FileSpreadsheet /> Excel completo (.xlsx)</button><button onClick={() => exportReport("pdf")}><FileText /> Reporte ejecutivo (.pdf)</button><button onClick={() => exportReport("json")}><FileJson /> Datos estructurados (.json)</button></div>
            </details>
          </div>
        </div>
      </div>

      <section className="result-hero">
        <div className="score-ring" style={{ "--score": `${report.metrics.reconciliationRate * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{report.metrics.reconciliationRate.toFixed(1)}%</strong><small>conciliado</small></div>
        </div>
        <div className="result-summary"><span className="eyebrow eyebrow--light"><Sparkles /> Lectura ejecutiva de Codex</span><p>{report.executiveSummary}</p><small>{report.metadata.methodology}</small></div>
        <div className="result-balance"><span>Diferencia después de ajustes</span><strong className={reconciled ? "positive" : "negative"}>{formatCop(report.metrics.differenceAfter)}</strong><small>{reconciled ? <><Check /> Cuadra dentro de la tolerancia</> : <>Requiere resolver partidas</>}</small></div>
      </section>

      <section className="kpi-grid">
        <Kpi icon={<BadgeCheck />} label="Movimientos conciliados" value={report.metrics.matchedCount.toLocaleString("es-CO")} note={formatCop(report.metrics.matchedAmount)} tone="green" />
        <Kpi icon={<BookOpenCheck />} label="Pendientes en libros" value={report.metrics.unmatchedBookCount.toLocaleString("es-CO")} note={formatCop(report.metrics.unmatchedBookAmount)} tone="gold" />
        <Kpi icon={<Scale />} label="Pendientes en banco" value={report.metrics.unmatchedBankCount.toLocaleString("es-CO")} note={formatCop(report.metrics.unmatchedBankAmount)} tone="coral" />
        <Kpi icon={<TriangleAlert />} label="Hallazgos críticos" value={report.findings.filter((item) => item.severity === "critical").length.toLocaleString("es-CO")} note={`${report.findings.length} hallazgos en total`} tone="ink" />
      </section>

      <nav className="result-tabs">
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>Resumen</button>
        <button className={tab === "movements" ? "active" : ""} onClick={() => setTab("movements")}>Movimientos <span>{report.metrics.unmatchedBookCount + report.metrics.unmatchedBankCount}</span></button>
        <button className={tab === "findings" ? "active" : ""} onClick={() => setTab("findings")}>Hallazgos <span>{report.findings.length}</span></button>
        <button className={tab === "adjustments" ? "active" : ""} onClick={() => setTab("adjustments")}>Ajustes sugeridos <span>{report.adjustments.length}</span></button>
      </nav>

      {tab === "summary" && (
        <div className="report-grid">
          <section className="report-card chart-card">
            <div className="report-card__title"><div><h2>Estado de movimientos</h2><p>Cantidad de registros después del cruce</p></div></div>
            <div className="donut-wrap"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={94} paddingAngle={3} isAnimationActive={false}>{pieData.map((_entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => Number(value).toLocaleString("es-CO")} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{report.metrics.matchedCount + report.metrics.unmatchedBookCount + report.metrics.unmatchedBankCount}</strong><small>registros</small></div></div>
            <div className="chart-legend">{pieData.map((item, index) => <span key={item.name}><i style={{ background: COLORS[index] }} />{item.name}<b>{item.value}</b></span>)}</div>
          </section>
          <section className="report-card chart-card">
            <div className="report-card__title"><div><h2>Valor pendiente por fuente</h2><p>Magnitud absoluta en pesos colombianos</p></div></div>
            <ResponsiveContainer width="100%" height={260}><BarChart data={amountData} margin={{ top: 18, right: 10, bottom: 8, left: 8 }}><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8e5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#647973", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tickFormatter={compactCop} tick={{ fill: "#647973", fontSize: 11 }} /><Tooltip formatter={(value) => formatCop(Number(value))} cursor={{ fill: "#f3f6f4" }} /><Bar dataKey="value" radius={[7, 7, 0, 0]} isAnimationActive={false}>{amountData.map((_entry, index) => <Cell key={index} fill={COLORS[index + 1]} />)}</Bar></BarChart></ResponsiveContainer>
          </section>
          <section className="report-card balances-card">
            <div className="report-card__title"><div><h2>Puente de saldos</h2><p>Antes y después de clasificar diferencias</p></div></div>
            <div className="balance-table"><div><span>Saldo en libros</span><b>{formatCop(report.metrics.bookBalance)}</b></div><div><span>Saldo del extracto</span><b>{formatCop(report.metrics.bankBalance)}</b></div><i /><div className="adjusted"><span>Saldo ajustado en libros</span><b>{formatCop(report.metrics.adjustedBookBalance)}</b></div><div className="adjusted"><span>Saldo ajustado bancario</span><b>{formatCop(report.metrics.adjustedBankBalance)}</b></div></div>
          </section>
          <section className="report-card controls-card">
            <div className="report-card__title"><div><h2>Controles de cierre</h2><p>Señales que requieren tu revisión</p></div></div>
            <div className="controls-list">{report.controls.map((control) => <div key={control.id}><span className={`control-icon ${control.status}`}>{control.status === "pass" ? <Check /> : control.status === "fail" ? <AlertCircle /> : <Info />}</span><p><strong>{control.name}</strong><small>{control.note}</small></p><b className={control.status}>{control.status === "pass" ? "Cumple" : control.status === "fail" ? "Falla" : "Revisar"}</b></div>)}</div>
          </section>
          <section className="report-card legal-card">
            <div className="report-card__title"><div><h2>Criterio aplicado</h2><p>Marco y límites del análisis</p></div><ShieldCheck /></div>
            <ul>{report.legalContext.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <div className="limitations"><strong>Limitaciones</strong>{report.scopeLimitations.map((item, index) => <p key={index}>{item}</p>)}</div>
          </section>
        </div>
      )}

      {tab === "movements" && <MovementsTab report={report} />}
      {tab === "findings" && <FindingsTab report={report} />}
      {tab === "adjustments" && <AdjustmentsTab report={report} />}
    </div>
  );
}

function Kpi({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return <article className={`kpi kpi--${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function MovementsTab({ report }: { report: ReconciliationReport }) {
  const rows = [
    ...report.unmatchedBook.map((item) => ({ ...item, source: "Libros" })),
    ...report.unmatchedBank.map((item) => ({ ...item, source: "Banco" })),
  ];
  return <section className="report-card table-card"><div className="report-card__title"><div><h2>Partidas pendientes</h2><p>Cada fila conserva el identificador usado por el análisis.</p></div><span className="count-badge">{rows.length} partidas</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Fuente</th><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Valor</th><th>Acción sugerida</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.source}-${item.transactionId}`}><td><span className={`source-badge ${item.source === "Libros" ? "book" : "bank"}`}>{item.source}</span></td><td>{item.date}</td><td><strong>{item.description}</strong><small>{item.transactionId}</small></td><td>{categoryLabel(item.category)}</td><td className={item.amount < 0 ? "negative" : "positive"}>{formatCop(item.amount)}</td><td>{item.suggestedAction}</td></tr>)}</tbody></table></div>{!rows.length && <EmptyState text="No hay partidas pendientes." />}</section>;
}

function FindingsTab({ report }: { report: ReconciliationReport }) {
  return <div className="findings-list">{report.findings.map((item) => <article className={`finding finding--${item.severity}`} key={item.id}><span className="finding__icon">{item.severity === "critical" ? <AlertCircle /> : item.severity === "warning" ? <TriangleAlert /> : <Info />}</span><div><div className="finding__title"><span>{severityLabel(item.severity)}</span><small>{item.id}</small></div><h3>{item.title}</h3><p>{item.description}</p><div className="recommendation"><strong>Recomendación</strong>{item.recommendation}</div><small className="evidence">Evidencia: {item.evidenceIds.join(", ") || "Sin referencia específica"}</small></div></article>)}{!report.findings.length && <EmptyState text="No se identificaron hallazgos materiales." />}</div>;
}

function AdjustmentsTab({ report }: { report: ReconciliationReport }) {
  return <div><div className="adjustment-notice"><CircleAlert /><p><strong>Son propuestas, no asientos contabilizados.</strong><span>Verifica soporte, periodo, cuentas y aprobación antes de registrar cualquier ajuste.</span></p></div><div className="adjustment-list">{report.adjustments.map((item) => <article className="adjustment" key={item.id}><div className="adjustment__top"><span>{item.id}</span><b>{formatCop(item.amount)}</b></div><p>{item.description}</p><div className="journal-entry"><div><span>Débito</span><strong>{item.debitAccount}</strong></div><ArrowRight /><div><span>Crédito</span><strong>{item.creditAccount}</strong></div></div><small>Evidencia: {item.evidenceIds.join(", ")}</small></article>)}</div>{!report.adjustments.length && <EmptyState text="No hay ajustes contables sugeridos." />}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="report-empty"><CheckCircle2 /><p>{text}</p></div>;
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function compactCop(value: number) {
  return new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    deposit_in_transit: "Depósito en tránsito",
    outstanding_payment: "Pago pendiente",
    book_error: "Posible error en libros",
    bank_fee: "Comisión bancaria",
    bank_interest: "Interés bancario",
    automatic_debit: "Débito automático",
    automatic_credit: "Crédito automático",
    bank_error: "Posible error bancario",
    unrecorded_entry: "Movimiento no registrado",
    tax: "Impuesto / GMF",
    unidentified: "Sin identificar",
    other: "Otro",
  };
  return labels[category] || category;
}

function severityLabel(severity: string) {
  return ({ critical: "Crítico", warning: "Atención", info: "Informativo" } as Record<string, string>)[severity] || severity;
}
