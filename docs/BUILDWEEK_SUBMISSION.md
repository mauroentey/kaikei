# Kaikei — OpenAI Build Week Submission

## Submission fields

- **Project name:** Kaikei
- **Track:** Work & Productivity
- **Tagline:** From two financial records to one trusted answer.
- **Repository:** https://github.com/mauroentey/kaikei
- **Evaluation builds:** https://github.com/mauroentey/kaikei/releases/tag/v0.1.0
- **Built by:** Mauricio Samper — Bogotá, Colombia
- **Contact:** mauro@entey.net
- **Technologies:** Codex, GPT-5.6, Codex App Server, Electron, React, TypeScript, Vite, Zod, Recharts, ExcelJS and PDF.js
- **Codex thread ID:** `019f86b6-372d-7103-912c-6632663ce348`

## Elevator pitch

### One sentence

Kaikei turns bank reconciliation from hours of spreadsheet hunting into a guided, auditable desktop workflow: upload the accounting ledger and bank statements, let a deterministic engine and GPT-5.6 explain the exceptions, and export a review-ready reconciliation.

### 30 seconds

Every month, accountants lose hours comparing accounting exports with bank statements, chasing timing differences, duplicate references, bank fees and grouped payments. Kaikei is a desktop application that turns those disconnected files into one auditable reconciliation. It reads common accounting and banking formats locally, proposes deterministic matches, uses GPT-5.6 through the user's existing ChatGPT session to review exceptions, and produces a dashboard plus Excel, PDF and JSON reports. The accountant remains in control: AI findings and adjustments are always reviewable suggestions, never automatic postings.

### Short Devpost description

Kaikei is an AI-assisted bank reconciliation desktop app for macOS and Windows. It compares an accounting ledger with one or more bank statements, finds direct and grouped matches, identifies discrepancies, and exports an audit-ready report. A deterministic local engine handles the arithmetic; GPT-5.6 reviews ambiguous exceptions through Codex App Server and returns schema-constrained JSON. Kaikei uses the user's ChatGPT session instead of requiring an API key and keeps the accountant in control of every suggested adjustment.

## Inspiration

Bank reconciliation is essential, but for many small businesses and accounting teams it is still a monthly exercise in copying data between banking portals, accounting software and spreadsheets. Equal values may occur on different dates, one bank movement may correspond to several ledger entries, and real exceptions—fees, duplicates, deposits in transit or unrecorded transactions—are hidden among hundreds of normal rows.

I wanted to build a tool for the person who must explain and sign off on the reconciliation, not only produce a match percentage. Kaikei was inspired by the Colombian accounting workflow, where evidence, traceability and professional review matter as much as speed. The goal was a desktop experience that accountants could understand immediately, without deploying a server, configuring an API key or surrendering the final decision to a black box.

## What it does

Kaikei lets the user load one accounting ledger and one or more bank statements in XLSX, CSV, OFX, QFX or PDF format. It detects likely columns, lets the accountant correct the mapping, and normalizes dates, values, descriptions, references, debits and credits.

A deterministic reconciliation engine first searches for auditable 1:1 and grouped 1:N/N:1 matches using amount, sign, date windows and references. GPT-5.6 then reviews the remaining exceptions through Codex App Server, looking for patterns, risks and explainable findings. Its response is constrained by JSON Schema and validated again locally with Zod before it reaches the interface.

The result is a complete reconciliation workspace with:

- matched and unmatched transactions;
- book and bank differences;
- duplicate and anomaly findings;
- suggested follow-up controls and accounting adjustments;
- charts and reconciliation metrics; and
- exportable Excel, executive PDF and JSON reports.

Kaikei includes tailored context for Colombian private companies, nonprofit entities and public-sector organizations. It never posts an accounting entry automatically: suggested adjustments remain subject to evidence, review and approval.

## How we built it

Kaikei is a cross-platform Electron application with a React and TypeScript interface. The Electron main process parses financial files locally, isolates file-system access from the renderer, and runs the deterministic matching engine. The renderer receives only normalized previews and report data.

For AI analysis, Electron starts `codex app-server` over stdio. `account/read` reuses the user's current ChatGPT/Codex session, while `account/login/start` handles sign-in when required. The app creates an ephemeral, read-only thread and sends only the normalized movements, deterministic candidates and reconciliation rules. `turn/start.outputSchema` constrains the final GPT-5.6 response, and Zod performs a second local validation before the report is accepted.

Codex was also the development collaborator for the project. Starting from a plain-language accounting workflow, Codex helped research the Colombian reconciliation context, translate it into product requirements, design the Electron/App Server architecture, implement the parsers and matching engine, build the interface, create tests, diagnose packaged-app issues, produce installers and prepare the documentation. Mauricio made the core product decisions: use the user's ChatGPT login instead of an API key, keep file handling local, combine deterministic matching with AI reasoning, and require human review for every adjustment.

## Challenges we ran into

The first challenge was that bank and accounting files are inconsistent. The same concept can appear as a signed value, separate debit and credit columns, localized dates, or a PDF text table. We addressed this with explicit normalization, editable column mapping and format-specific parsing.

The second challenge was avoiding a reconciliation that merely “looks intelligent.” Matching must remain explainable and numerically reliable. We therefore separated responsibilities: deterministic code proposes matches and calculates totals; GPT-5.6 focuses on ambiguous exceptions, patterns and narrative findings.

Structured AI output was another challenge. A report screen cannot depend on loosely formatted prose, so we use JSON Schema at generation time and Zod validation at the application boundary.

Finally, packaging a secure cross-platform Electron app while communicating with Codex App Server required careful process management, sandboxing, preload isolation, login-state handling and real packaged-app testing on macOS.

## Accomplishments that we're proud of

- We shipped a complete, installable desktop product rather than a chat mockup or isolated proof of concept.
- Kaikei works without a custom backend and without asking the user for an OpenAI API key.
- The hybrid engine keeps arithmetic deterministic while using GPT-5.6 where language understanding and exception reasoning add the most value.
- Every AI report is schema-constrained, locally validated and presented for human review.
- The app supports five common financial-file formats, grouped matching, charts and three export formats.
- The interface includes consent, security boundaries and clear professional-accountability language.
- The repository includes sample data, Colombian reconciliation research, automated tests and reproducible packaging instructions.

## What we learned

We learned that the strongest use of an advanced model in accounting is not to replace deterministic controls, but to sit on top of them. Code should establish totals, candidate matches and invariants; GPT-5.6 should explain the long tail of exceptions and turn raw discrepancies into actionable review.

We also learned that structured output changes what is possible. Once the model response is treated as a typed application boundary instead of chat text, AI analysis can safely drive dashboards, exports and workflow states.

Most importantly, Codex proved useful beyond code generation. It helped move continuously between domain research, architecture, UX, implementation, testing, packaging and communication while Mauricio retained the product and accounting decisions.

## What's next for Kaikei

The next milestone is a signed and notarized production release for macOS and Windows. From there, Kaikei will add reusable templates for more Colombian banks and accounting systems, persistent reconciliation history, multi-account batch processing, reviewer approval workflows and stronger audit trails.

We also plan to add direct integrations with accounting platforms, configurable organization policies, richer evidence attachments and bilingual Spanish/English reporting. Longer term, Kaikei can become a general financial close assistant: not only identifying differences, but preserving the reasoning, evidence and approvals behind every resolved exception.

## Demo video plan — maximum 2:50

### Suggested YouTube title

Kaikei — AI-assisted bank reconciliation with Codex and GPT-5.6 | OpenAI Build Week

### Suggested YouTube description

Kaikei turns accounting ledgers and bank statements into an auditable reconciliation. Built by Mauricio Samper in Bogotá, Colombia, for OpenAI Build Week using Codex, GPT-5.6 and Codex App Server.

Repository: https://github.com/mauroentey/kaikei

### Script and shot list

**0:00–0:15 — The problem**

“Every month, accountants spend hours comparing an accounting ledger with bank statements. The problem is not only equal amounts: dates move, payments are grouped, references repeat, and exceptions must be explained.”

Show the accounting and bank sample files briefly.

**0:15–0:30 — The product**

“This is Kaikei, a desktop reconciliation workspace built for OpenAI Build Week. It turns two financial records into one trusted, review-ready answer.”

Open Kaikei and click **Iniciar conciliación**.

**0:30–1:05 — Prepare the reconciliation**

“I load one accounting ledger on the left and one or more bank statements on the right. Kaikei reads XLSX, CSV, OFX, QFX and PDF locally, detects the columns, and lets me confirm the account, cut-off date and matching criteria.”

Load `fixtures/auxiliar_demo.csv` and `fixtures/extracto_demo.csv`.

**1:05–1:35 — Hybrid analysis**

“A deterministic engine handles amounts, signs, date windows, references and grouped matches. Then GPT-5.6 reviews the unresolved exceptions through Codex App Server using my ChatGPT session—no API key and no custom backend. Its result must satisfy a JSON Schema and is validated again before the app accepts it.”

Start the analysis and show the processing steps.

**1:35–2:10 — Results and impact**

“The accountant receives reconciled and pending movements, charts, findings, controls and suggested adjustments. Every suggestion remains reviewable; Kaikei never posts an entry automatically.”

Show the dashboard, pending items and one finding.

**2:10–2:30 — Export**

“The final result can be exported as an audit-ready Excel workbook, an executive PDF or structured JSON.”

Export one report.

**2:30–2:50 — How it was built**

“Codex helped me turn a Colombian accounting workflow into a secure Electron product: research, architecture, parsers, matching, interface, tests, packaging and documentation. I made the core decisions—deterministic first, local files, human approval—and GPT-5.6 supplies the exception reasoning. Kaikei: from two records to one trusted answer.”

End on the logo and repository URL.

## Final submission checklist

- [ ] Select **Work & Productivity**.
- [ ] Paste the short description and the seven Devpost sections above.
- [ ] Upload a public YouTube demo shorter than three minutes with audio.
- [ ] Make sure the video explicitly shows the working app and explains both Codex and GPT-5.6.
- [x] Use the public repository: https://github.com/mauroentey/kaikei
- [x] Include setup instructions, sample data and screenshots in the README.
- [x] Document how Codex accelerated the work and where Mauricio made the key decisions.
- [ ] Run `/feedback` in the main Codex project thread and confirm the session ID before pasting it into Devpost.
- [x] Provide judges with a downloadable/testable build and clear source-testing instructions.
- [ ] Confirm that the repository license permits Build Week judges to download and test the project during judging.
- [ ] Check that the submission does not expose real financial or personal data.
- [ ] Submit before July 21, 2026 at 5:00 p.m. PT / 7:00 p.m. Bogotá time.
