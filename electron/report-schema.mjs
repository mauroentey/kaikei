import { z } from "zod";

const matchSchema = z.object({
  id: z.string(),
  bookTransactionIds: z.array(z.string()),
  bankTransactionIds: z.array(z.string()),
  amount: z.number(),
  matchType: z.enum(["exact", "date_window", "reference", "grouped", "suggested"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
});

const unmatchedBookSchema = z.object({
  transactionId: z.string(),
  category: z.enum([
    "deposit_in_transit",
    "outstanding_payment",
    "book_error",
    "unidentified",
    "other",
  ]),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  explanation: z.string(),
  suggestedAction: z.string(),
});

const unmatchedBankSchema = z.object({
  transactionId: z.string(),
  category: z.enum([
    "bank_fee",
    "bank_interest",
    "automatic_debit",
    "automatic_credit",
    "bank_error",
    "unrecorded_entry",
    "tax",
    "unidentified",
    "other",
  ]),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  explanation: z.string(),
  suggestedAction: z.string(),
});

export const reconciliationReportSchema = z.object({
  version: z.literal("1.0"),
  metadata: z.object({
    generatedAt: z.string(),
    cutoffDate: z.string(),
    currency: z.literal("COP"),
    entityName: z.string(),
    accountLabel: z.string(),
    accountingFiles: z.array(z.string()),
    bankFiles: z.array(z.string()),
    methodology: z.string(),
  }),
  executiveSummary: z.string(),
  metrics: z.object({
    bookBalance: z.number(),
    bankBalance: z.number(),
    adjustedBookBalance: z.number(),
    adjustedBankBalance: z.number(),
    differenceBefore: z.number(),
    differenceAfter: z.number(),
    matchedAmount: z.number().nonnegative(),
    matchedCount: z.number().int().nonnegative(),
    unmatchedBookAmount: z.number().nonnegative(),
    unmatchedBookCount: z.number().int().nonnegative(),
    unmatchedBankAmount: z.number().nonnegative(),
    unmatchedBankCount: z.number().int().nonnegative(),
    reconciliationRate: z.number().min(0).max(100),
  }),
  matches: z.array(matchSchema),
  unmatchedBook: z.array(unmatchedBookSchema),
  unmatchedBank: z.array(unmatchedBankSchema),
  findings: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string(),
      description: z.string(),
      evidenceIds: z.array(z.string()),
      recommendation: z.string(),
    }),
  ),
  adjustments: z.array(
    z.object({
      id: z.string(),
      status: z.literal("suggested"),
      debitAccount: z.string(),
      creditAccount: z.string(),
      amount: z.number().positive(),
      description: z.string(),
      evidenceIds: z.array(z.string()),
      requiresApproval: z.boolean(),
    }),
  ),
  controls: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["pass", "review", "fail"]),
      note: z.string(),
    }),
  ),
  scopeLimitations: z.array(z.string()),
  legalContext: z.array(z.string()),
});

export const reconciliationOutputSchema = z.toJSONSchema(reconciliationReportSchema, {
  target: "draft-7",
});

export function parseReconciliationReport(value) {
  return reconciliationReportSchema.parse(value);
}
