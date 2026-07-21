import { BrainCircuit, Check, FileSearch, GitCompareArrows, ScanLine } from "lucide-react";
import type { ProgressEvent } from "../types";

const stages = [
  { key: "normalizing", label: "Normalizar archivos", icon: FileSearch, threshold: 12 },
  { key: "matching", label: "Cruzar movimientos", icon: GitCompareArrows, threshold: 34 },
  { key: "ai", label: "Revisar con Codex", icon: BrainCircuit, threshold: 58 },
  { key: "validating", label: "Validar reporte", icon: ScanLine, threshold: 90 },
];

export function ProcessingScreen({ progress }: { progress: ProgressEvent }) {
  const value = progress.progress ?? stageProgress(progress.stage);
  return (
    <div className="processing-page page-enter">
      <div className="processing-glow" />
      <div className="processing-card">
        <div className="analysis-orb"><BrainCircuit /><span /><span /></div>
        <span className="eyebrow">Conciliación en curso</span>
        <h1>Estamos siguiendo el dinero.</h1>
        <p>{progress.message}</p>
        <div className="progress-track"><i style={{ width: `${Math.max(4, value)}%` }} /></div>
        <div className="progress-meta"><span>{Math.round(value)}%</span><small>Puede tardar unos minutos según el número de movimientos.</small></div>
        <div className="processing-stages">
          {stages.map((stage, index) => {
            const complete = value > (stages[index + 1]?.threshold ?? 100);
            const active = value >= stage.threshold && !complete;
            const Icon = stage.icon;
            return <div key={stage.key} className={`${complete ? "complete" : ""} ${active ? "active" : ""}`}><span>{complete ? <Check /> : <Icon />}</span><small>{stage.label}</small></div>;
          })}
        </div>
        {progress.detail && <div className="codex-detail"><span className="pulse-dot" /> {progress.detail}</div>}
      </div>
      <p className="processing-privacy">Mantén Kaikei abierto mientras termina el análisis.</p>
    </div>
  );
}

function stageProgress(stage: string) {
  return ({ starting: 4, normalizing: 12, matching: 34, ai: 68, validating: 92, completed: 100 } as Record<string, number>)[stage] ?? 8;
}
