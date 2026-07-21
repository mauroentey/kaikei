import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/Brand";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { WorkspaceScreen } from "./screens/WorkspaceScreen";
import { ProcessingScreen } from "./screens/ProcessingScreen";
import { demoAccountingFile, demoBankFile, demoReport } from "./demo";
import type {
  Account,
  ColumnMapping,
  FileSummary,
  ProgressEvent,
  ReconciliationDetails,
  ReconciliationOptions,
  Role,
  RunResult,
} from "./types";

type Screen = "home" | "files" | "processing" | "results";

const ResultsScreen = lazy(() => import("./screens/ResultsScreen").then((module) => ({ default: module.ResultsScreen })));

const defaultDetails: ReconciliationDetails = {
  entityName: "",
  entityType: "private",
  accountLabel: "",
  cutoffDate: new Date().toISOString().slice(0, 7) + "-01",
  bookBalance: "",
  bankBalance: "",
};

const defaultOptions: ReconciliationOptions = {
  amountTolerance: 1,
  dateToleranceDays: 3,
  allowGrouped: true,
};

export default function App() {
  const demo = useMemo(() => new URLSearchParams(window.location.search).get("demo"), []);
  const [account, setAccount] = useState<Account | null>(demo ? { type: "chatgpt", email: "contabilidad@horizonte.co", planType: "business" } : null);
  const [authLoading, setAuthLoading] = useState(!demo);
  const [loginAwaiting, setLoginAwaiting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [codexStatus, setCodexStatus] = useState("Conectando con Codex App Server…");
  const [screen, setScreen] = useState<Screen>(demo === "results" ? "results" : demo === "files" ? "files" : demo === "processing" ? "processing" : "home");
  const [accountingFile, setAccountingFile] = useState<FileSummary | null>(demo ? demoAccountingFile : null);
  const [bankFiles, setBankFiles] = useState<FileSummary[]>(demo ? [demoBankFile] : []);
  const [details, setDetails] = useState<ReconciliationDetails>(demo ? {
    entityName: "Comercializadora Horizonte S.A.S.",
    entityType: "private",
    accountLabel: "Bancolombia · Cuenta corriente • 4821",
    cutoffDate: "2026-06-30",
    bookBalance: "128450800",
    bankBalance: "126970800",
  } : defaultDetails);
  const [options, setOptions] = useState(defaultOptions);
  const [privacyAccepted, setPrivacyAccepted] = useState(Boolean(demo));
  const [progress, setProgress] = useState<ProgressEvent>({ stage: "idle", message: "Preparando el análisis…", progress: 0 });
  const [result, setResult] = useState<RunResult | null>(demo ? { reportId: "demo", report: demoReport, engineWarnings: [], model: "GPT-5.6 Sol" } : null);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    if (demo || !window.kaikei) return;
    window.kaikei.codex.account()
      .then((response) => {
        setAccount(response.account);
        if (response.error) setAuthError(response.error);
      })
      .catch((error: Error) => setAuthError(error.message))
      .finally(() => setAuthLoading(false));

    const removeStatus = window.kaikei.codex.onStatus((payload) => setCodexStatus(payload.message));
    const removeLogin = window.kaikei.codex.onLogin((payload) => {
      setLoginAwaiting(false);
      if (payload.success && payload.account) {
        setAccount(payload.account);
        setAuthError("");
      } else setAuthError(payload.error || "No fue posible completar el inicio de sesión.");
    });
    const removeAccount = window.kaikei.codex.onAccount((payload) => setAccount(payload.account));
    const removeProgress = window.kaikei.reconciliation.onProgress(setProgress);
    return () => {
      removeStatus();
      removeLogin();
      removeAccount();
      removeProgress();
    };
  }, [demo]);

  const login = async () => {
    setAuthError("");
    setLoginAwaiting(true);
    try {
      await window.kaikei.codex.login();
    } catch (error) {
      setLoginAwaiting(false);
      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  const chooseCodex = async () => {
    setAuthError("");
    try {
      const response = await window.kaikei.codex.chooseExecutable();
      if (response.account?.account) setAccount(response.account.account);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  const logout = async () => {
    if (!demo) await window.kaikei.codex.logout();
    setAccount(null);
    setScreen("home");
  };

  const selectFiles = async (role: Role) => {
    setWorkspaceError("");
    try {
      const files = await window.kaikei.files.select(role);
      if (role === "accounting" && files[0]) {
        if (accountingFile) await window.kaikei.files.remove(accountingFile.id);
        setAccountingFile(files[0]);
      }
      if (role === "bank") setBankFiles((current) => [...current, ...files]);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    }
  };

  const removeFile = async (file: FileSummary) => {
    if (!demo) await window.kaikei.files.remove(file.id);
    if (file.role === "accounting") setAccountingFile(null);
    else setBankFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const updateMapping = (fileId: string, mapping: ColumnMapping) => {
    if (accountingFile?.id === fileId) setAccountingFile({ ...accountingFile, mapping });
    setBankFiles((current) => current.map((file) => file.id === fileId ? { ...file, mapping } : file));
  };

  const run = async () => {
    if (!accountingFile || !bankFiles.length) return;
    setWorkspaceError("");
    setProgress({ stage: "starting", message: "Preparando la conciliación…", progress: 4 });
    setScreen("processing");
    try {
      const response = await window.kaikei.reconciliation.run({
        accounting: { fileId: accountingFile.id, mapping: accountingFile.mapping },
        bank: bankFiles.map((file) => ({ fileId: file.id, mapping: file.mapping })),
        details,
        options,
        privacyAccepted,
      });
      setResult(response);
      setScreen("results");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
      setScreen("files");
    }
  };

  const reset = () => {
    setResult(null);
    setAccountingFile(null);
    setBankFiles([]);
    setDetails(defaultDetails);
    setPrivacyAccepted(false);
    setScreen("files");
  };

  if (!account) {
    return (
      <LoginScreen
        loading={authLoading}
        awaiting={loginAwaiting}
        status={codexStatus}
        error={authError}
        onLogin={login}
        onChooseCodex={chooseCodex}
      />
    );
  }

  return (
    <div className="app-frame">
      <AppHeader email={account.email} plan={account.planType} onHome={() => setScreen("home")} onLogout={logout} />
      <main className="app-main">
        {screen === "home" && <HomeScreen account={account} onStart={() => setScreen("files")} />}
        {screen === "files" && (
          <WorkspaceScreen
            accountingFile={accountingFile}
            bankFiles={bankFiles}
            details={details}
            options={options}
            privacyAccepted={privacyAccepted}
            error={workspaceError}
            onSelect={selectFiles}
            onRemove={removeFile}
            onMappingChange={updateMapping}
            onDetailsChange={setDetails}
            onOptionsChange={setOptions}
            onPrivacyChange={setPrivacyAccepted}
            onRun={run}
          />
        )}
        {screen === "processing" && <ProcessingScreen progress={progress} />}
        {screen === "results" && result && (
          <Suspense fallback={<ProcessingScreen progress={{ stage: "validating", message: "Preparando el reporte visual…", progress: 96 }} />}>
            <ResultsScreen result={result} onNew={reset} demo={Boolean(demo)} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
