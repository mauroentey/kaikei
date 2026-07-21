export type Role = "accounting" | "bank";
export type MappingField = "date" | "description" | "reference" | "debit" | "credit" | "amount" | "balance" | "type";
export type ColumnMapping = Record<MappingField, string>;

export interface Account {
  type: "chatgpt";
  email: string | null;
  planType: string;
}

export interface AccountResponse {
  account: Account | null;
  requiresOpenaiAuth: boolean;
  error?: string;
}

export interface FileSummary {
  id: string;
  role: Role;
  name: string;
  extension: string;
  size: number;
  sheetName: string;
  headers: string[];
  preview: Array<Record<string, unknown>>;
  rowCount: number;
  mapping: ColumnMapping;
  warnings: string[];
}

export interface ReconciliationDetails {
  entityName: string;
  entityType: "private" | "public" | "nonprofit";
  accountLabel: string;
  cutoffDate: string;
  bookBalance: string;
  bankBalance: string;
}

export interface ReconciliationOptions {
  amountTolerance: number;
  dateToleranceDays: number;
  allowGrouped: boolean;
}

export interface RunPayload {
  accounting: { fileId: string; mapping: ColumnMapping };
  bank: Array<{ fileId: string; mapping: ColumnMapping }>;
  details: ReconciliationDetails;
  options: ReconciliationOptions;
  privacyAccepted: boolean;
}

export interface ReconciliationReport {
  version: "1.0";
  metadata: {
    generatedAt: string;
    cutoffDate: string;
    currency: "COP";
    entityName: string;
    accountLabel: string;
    accountingFiles: string[];
    bankFiles: string[];
    methodology: string;
  };
  executiveSummary: string;
  metrics: {
    bookBalance: number;
    bankBalance: number;
    adjustedBookBalance: number;
    adjustedBankBalance: number;
    differenceBefore: number;
    differenceAfter: number;
    matchedAmount: number;
    matchedCount: number;
    unmatchedBookAmount: number;
    unmatchedBookCount: number;
    unmatchedBankAmount: number;
    unmatchedBankCount: number;
    reconciliationRate: number;
  };
  matches: Array<{
    id: string;
    bookTransactionIds: string[];
    bankTransactionIds: string[];
    amount: number;
    matchType: "exact" | "date_window" | "reference" | "grouped" | "suggested";
    confidence: number;
    explanation: string;
  }>;
  unmatchedBook: PendingBook[];
  unmatchedBank: PendingBank[];
  findings: Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    evidenceIds: string[];
    recommendation: string;
  }>;
  adjustments: Array<{
    id: string;
    status: "suggested";
    debitAccount: string;
    creditAccount: string;
    amount: number;
    description: string;
    evidenceIds: string[];
    requiresApproval: boolean;
  }>;
  controls: Array<{
    id: string;
    name: string;
    status: "pass" | "review" | "fail";
    note: string;
  }>;
  scopeLimitations: string[];
  legalContext: string[];
}

export interface PendingBook {
  transactionId: string;
  category: "deposit_in_transit" | "outstanding_payment" | "book_error" | "unidentified" | "other";
  amount: number;
  date: string;
  description: string;
  explanation: string;
  suggestedAction: string;
}

export interface PendingBank {
  transactionId: string;
  category: "bank_fee" | "bank_interest" | "automatic_debit" | "automatic_credit" | "bank_error" | "unrecorded_entry" | "tax" | "unidentified" | "other";
  amount: number;
  date: string;
  description: string;
  explanation: string;
  suggestedAction: string;
}

export interface RunResult {
  reportId: string;
  report: ReconciliationReport;
  engineWarnings: string[];
  model: string;
}

export interface ProgressEvent {
  stage: string;
  message: string;
  progress?: number;
  detail?: string;
}

export interface KaikeiApi {
  codex: {
    account(): Promise<AccountResponse>;
    login(): Promise<{ awaiting: boolean; loginId: string }>;
    logout(): Promise<{ success: boolean }>;
    chooseExecutable(): Promise<{ canceled: boolean; path?: string; account?: AccountResponse }>;
    onStatus(callback: (payload: { state: string; message: string }) => void): () => void;
    onLogin(callback: (payload: { success: boolean; account?: Account; error?: string }) => void): () => void;
    onAccount(callback: (payload: AccountResponse) => void): () => void;
  };
  files: {
    select(role: Role): Promise<FileSummary[]>;
    remove(fileId: string): Promise<{ success: boolean }>;
  };
  reconciliation: {
    run(payload: RunPayload): Promise<RunResult>;
    onProgress(callback: (payload: ProgressEvent) => void): () => void;
  };
  report: {
    export(reportId: string, format: "xlsx" | "pdf" | "json"): Promise<{ canceled: boolean; path?: string }>;
  };
}

declare global {
  interface Window {
    kaikei: KaikeiApi;
  }
}
