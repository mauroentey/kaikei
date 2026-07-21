import { ArrowRight, Building2, CalendarDays, Check, ChevronRight, Info, Landmark, LockKeyhole, SlidersHorizontal, Sparkles } from "lucide-react";
import { FilePanel } from "../components/FilePanel";
import type { ColumnMapping, FileSummary, ReconciliationDetails, ReconciliationOptions, Role } from "../types";

export function WorkspaceScreen({
  accountingFile,
  bankFiles,
  details,
  options,
  privacyAccepted,
  error,
  onSelect,
  onRemove,
  onMappingChange,
  onDetailsChange,
  onOptionsChange,
  onPrivacyChange,
  onRun,
}: {
  accountingFile: FileSummary | null;
  bankFiles: FileSummary[];
  details: ReconciliationDetails;
  options: ReconciliationOptions;
  privacyAccepted: boolean;
  error: string;
  onSelect: (role: Role) => void;
  onRemove: (file: FileSummary) => void;
  onMappingChange: (fileId: string, mapping: ColumnMapping) => void;
  onDetailsChange: (details: ReconciliationDetails) => void;
  onOptionsChange: (options: ReconciliationOptions) => void;
  onPrivacyChange: (accepted: boolean) => void;
  onRun: () => void;
}) {
  const mappingReady = (file: FileSummary) => Boolean(file.mapping.date && (file.mapping.amount || file.mapping.debit || file.mapping.credit));
  const filesReady = Boolean(accountingFile && mappingReady(accountingFile) && bankFiles.length && bankFiles.every(mappingReady));
  const ready = filesReady && Boolean(details.cutoffDate) && privacyAccepted;

  return (
    <div className="workspace-page page-enter">
      <div className="workspace-title-row">
        <div>
          <div className="breadcrumbs"><span>Conciliaciones</span><ChevronRight size={13} /><strong>Nueva</strong></div>
          <h1>Prepara la conciliación</h1>
          <p>Confirma el contexto, carga las dos fuentes y revisa el mapeo detectado.</p>
        </div>
        <div className="stepper" aria-label="Paso 1 de 3">
          <span className="active"><b>1</b><small>Archivos</small></span><i />
          <span><b>2</b><small>Análisis</small></span><i />
          <span><b>3</b><small>Reporte</small></span>
        </div>
      </div>

      {error && <div className="alert alert--error workspace-alert">{error}</div>}

      <section className="context-card">
        <div className="context-card__title"><span><Building2 /></span><div><h2>Contexto de la cuenta</h2><p>Esto aparecerá en el reporte final.</p></div></div>
        <div className="context-grid">
          <label><span>Entidad</span><input placeholder="Ej. Comercializadora Horizonte S.A.S." value={details.entityName} onChange={(event) => onDetailsChange({ ...details, entityName: event.target.value })} /></label>
          <label><span>Tipo de entidad</span><select value={details.entityType} onChange={(event) => onDetailsChange({ ...details, entityType: event.target.value as ReconciliationDetails["entityType"] })}><option value="private">Empresa privada</option><option value="nonprofit">Entidad sin ánimo de lucro</option><option value="public">Entidad pública</option></select></label>
          <label><span>Cuenta bancaria</span><div className="input-with-icon"><Landmark /><input placeholder="Banco · tipo de cuenta · últimos 4 dígitos" value={details.accountLabel} onChange={(event) => onDetailsChange({ ...details, accountLabel: event.target.value })} /></div></label>
          <label><span>Fecha de corte <em>*</em></span><div className="input-with-icon"><CalendarDays /><input type="date" value={details.cutoffDate} onChange={(event) => onDetailsChange({ ...details, cutoffDate: event.target.value })} /></div></label>
          <label><span>Saldo final en libros <small>opcional</small></span><input inputMode="decimal" placeholder="$ 0" value={details.bookBalance} onChange={(event) => onDetailsChange({ ...details, bookBalance: numericInput(event.target.value) })} /></label>
          <label><span>Saldo final del extracto <small>opcional</small></span><input inputMode="decimal" placeholder="$ 0" value={details.bankBalance} onChange={(event) => onDetailsChange({ ...details, bankBalance: numericInput(event.target.value) })} /></label>
        </div>
      </section>

      <div className="file-panels-grid">
        <FilePanel role="accounting" files={accountingFile ? [accountingFile] : []} onSelect={() => onSelect("accounting")} onRemove={onRemove} onMappingChange={onMappingChange} />
        <div className="versus-chip"><span>VS</span></div>
        <FilePanel role="bank" files={bankFiles} onSelect={() => onSelect("bank")} onRemove={onRemove} onMappingChange={onMappingChange} />
      </div>

      <section className="options-card">
        <div className="options-title"><span><SlidersHorizontal /></span><div><h2>Criterios del cruce</h2><p>Ajusta solo si tu operación lo necesita.</p></div></div>
        <label className="option-control"><span>Tolerancia de valor<small>Diferencia máxima aceptada</small></span><div className="unit-input"><input type="number" min="0" step="1" value={options.amountTolerance} onChange={(event) => onOptionsChange({ ...options, amountTolerance: Math.max(0, Number(event.target.value)) })} /><b>COP</b></div></label>
        <label className="option-control"><span>Ventana de fechas<small>Para compensar tiempos bancarios</small></span><div className="unit-input"><input type="number" min="0" max="30" value={options.dateToleranceDays} onChange={(event) => onOptionsChange({ ...options, dateToleranceDays: Math.max(0, Number(event.target.value)) })} /><b>días</b></div></label>
        <label className="toggle-control"><input type="checkbox" checked={options.allowGrouped} onChange={(event) => onOptionsChange({ ...options, allowGrouped: event.target.checked })} /><span className="toggle"><i /></span><span><strong>Buscar cruces agrupados</strong><small>Uno contra varios y varios contra uno</small></span></label>
      </section>

      <section className="privacy-card">
        <LockKeyhole size={20} />
        <label className="check-control">
          <input type="checkbox" checked={privacyAccepted} onChange={(event) => onPrivacyChange(event.target.checked)} />
          <span>{privacyAccepted && <Check size={14} />}</span>
          <p><strong>Confirmo que estoy autorizado para tratar esta información.</strong><small>Los archivos se leen localmente; los movimientos normalizados se envían a Codex mediante tu sesión de ChatGPT para producir el análisis. No incluyas información ajena al propósito contable.</small></p>
        </label>
      </section>

      <div className="run-row">
        <div className="run-note"><Info size={16} /><span>Kaikei no contabiliza ajustes automáticamente. Todo queda pendiente de revisión y aprobación.</span></div>
        <button className="primary-button" disabled={!ready} onClick={onRun}><Sparkles size={18} /> Iniciar análisis <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

function numericInput(value: string) {
  return value.replace(/[^0-9.-]/g, "");
}
