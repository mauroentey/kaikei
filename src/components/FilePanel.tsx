import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Plus, Settings2, Trash2, UploadCloud } from "lucide-react";
import type { ColumnMapping, FileSummary, MappingField, Role } from "../types";

const mappingFields: Array<{ field: MappingField; label: string; required?: boolean }> = [
  { field: "date", label: "Fecha", required: true },
  { field: "description", label: "Descripción" },
  { field: "reference", label: "Referencia" },
  { field: "amount", label: "Valor" },
  { field: "debit", label: "Débito" },
  { field: "credit", label: "Crédito" },
  { field: "type", label: "Tipo / naturaleza" },
  { field: "balance", label: "Saldo" },
];

export function FilePanel({
  role,
  files,
  onSelect,
  onRemove,
  onMappingChange,
}: {
  role: Role;
  files: FileSummary[];
  onSelect: () => void;
  onRemove: (file: FileSummary) => void;
  onMappingChange: (fileId: string, mapping: ColumnMapping) => void;
}) {
  const isAccounting = role === "accounting";
  return (
    <section className={`file-panel ${isAccounting ? "file-panel--accounting" : "file-panel--bank"}`}>
      <div className="file-panel__header">
        <div className="source-number">{isAccounting ? "1" : "2"}</div>
        <div><span className="eyebrow">{isAccounting ? "Fuente contable" : "Fuente bancaria"}</span><h2>{isAccounting ? "Auxiliar de bancos" : "Extractos bancarios"}</h2></div>
        <span className="source-side">{isAccounting ? "Un archivo" : "Uno o varios"}</span>
      </div>
      {!files.length ? (
        <button className="drop-zone" onClick={onSelect}>
          <span className="drop-zone__icon"><UploadCloud /></span>
          <strong>{isAccounting ? "Carga el archivo contable" : "Carga tus extractos"}</strong>
          <span>{isAccounting ? "Auxiliar o movimiento de la cuenta bancaria" : "Puedes seleccionar varios periodos de la misma cuenta"}</span>
          <small>XLSX · CSV · OFX · QFX · PDF</small>
        </button>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <LoadedFile key={file.id} file={file} onRemove={() => onRemove(file)} onMappingChange={(mapping) => onMappingChange(file.id, mapping)} />
          ))}
          {!isAccounting && (
            <button className="add-file-button" onClick={onSelect}><Plus size={17} /> Agregar otro extracto</button>
          )}
          {isAccounting && (
            <button className="replace-file-button" onClick={onSelect}>Reemplazar archivo</button>
          )}
        </div>
      )}
    </section>
  );
}

function LoadedFile({ file, onRemove, onMappingChange }: { file: FileSummary; onRemove: () => void; onMappingChange: (mapping: ColumnMapping) => void }) {
  const valid = Boolean(file.mapping.date && (file.mapping.amount || file.mapping.debit || file.mapping.credit));
  return (
    <article className="loaded-file">
      <div className="loaded-file__summary">
        <span className="file-type-icon">{file.extension === ".pdf" ? <FileText /> : <FileSpreadsheet />}</span>
        <div className="file-name"><strong>{file.name}</strong><small>{file.rowCount.toLocaleString("es-CO")} movimientos · {file.sheetName} · {formatBytes(file.size)}</small></div>
        <span className={`mapping-status ${valid ? "is-valid" : "is-warning"}`}>{valid ? <CheckCircle2 /> : <AlertTriangle />}{valid ? "Columnas listas" : "Revisar columnas"}</span>
        <button className="icon-button icon-button--danger" onClick={onRemove} aria-label={`Quitar ${file.name}`}><Trash2 size={17} /></button>
      </div>
      {file.warnings.length > 0 && <div className="file-warning"><AlertTriangle size={15} /><span>{file.warnings[0]}</span></div>}
      <details className="mapping-details">
        <summary><Settings2 size={16} /> Revisar columnas y vista previa <span>Opcional</span></summary>
        <div className="mapping-content">
          <div className="mapping-grid">
            {mappingFields.map(({ field, label, required }) => (
              <label key={field}>
                <span>{label}{required && <em>*</em>}</span>
                <select value={file.mapping[field] ?? ""} onChange={(event) => onMappingChange({ ...file.mapping, [field]: event.target.value })}>
                  <option value="">No usar</option>
                  {file.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="mapping-help">Usa “Valor” cuando el archivo trae montos con signo. Si trae columnas separadas, asigna “Débito” y “Crédito”.</p>
          <div className="preview-wrap">
            <table>
              <thead><tr>{file.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>{file.preview.slice(0, 3).map((row, index) => <tr key={index}>{file.headers.slice(0, 6).map((header) => <td key={header}>{formatCell(row[header])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </details>
    </article>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatCell(value: unknown) {
  if (typeof value === "number") return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
  const output = String(value ?? "");
  return output.length > 34 ? `${output.slice(0, 32)}…` : output;
}
