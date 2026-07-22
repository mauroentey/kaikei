# Kaikei

[Versión en español](README.md)

Kaikei is an Electron desktop application for macOS and Windows that reconciles one accounting ledger against one or more bank statements. It uses the user's ChatGPT session through **Codex App Server** and does not ask for an API key.

> Created and maintained by **Mauricio Samper** — Bogotá, Colombia<br>
> Contact: [mauro@entey.net](mailto:mauro@entey.net)

<p align="center">
  <img src="assets/logo-kaikei.png" alt="Kaikei logo" width="180">
</p>

## OpenAI Build Week 2026

**Track:** Work & Productivity<br>
**Tagline:** From two financial records to one trusted answer.<br>
**Submission materials:** [Elevator pitch, Devpost story and demo script](docs/BUILDWEEK_SUBMISSION.md)

Kaikei was created during OpenAI Build Week from a plain-language accounting workflow. It is a working desktop product—not a chat mockup—with local financial-file parsing, deterministic reconciliation, GPT-5.6 exception analysis, schema-constrained output, dashboards and exportable reports.

## How I collaborated with Codex and GPT-5.6

Codex was the engineering collaborator throughout the project. It helped research the Colombian reconciliation context, turn the workflow into requirements, design the Electron and Codex App Server architecture, implement file parsers and matching logic, build the product interface, write automated tests, debug the packaged application, generate installers and prepare the documentation.

Mauricio Samper made the key product decisions: reuse the user's ChatGPT session instead of requiring an API key; keep file parsing local; use deterministic rules for arithmetic and matching; reserve GPT-5.6 for ambiguous exceptions and findings; and keep every proposed adjustment subject to human evidence, review and approval.

Inside the product, GPT-5.6 runs through `codex app-server` in an ephemeral read-only thread. The model receives normalized movements and deterministic candidates, and its final report must satisfy `turn/start.outputSchema`; Zod validates it again before the UI or exporters can consume it.

The dated commit history and the main Codex thread document the work completed during the Build Week submission period.

## Features

- Sign-in managed by `codex app-server` and ChatGPT OAuth in the user's browser.
- Local reading of XLSX, CSV, OFX, QFX and PDF files.
- Detected and editable mapping for date, description, reference, value, debit, credit, type and balance.
- Auditable matching by value, sign, date window, reference and 1:N/N:1 groupings.
- Exception review with GPT-5.6 and JSON Schema-constrained output.
- Results dashboard with pending items, findings, controls and suggested adjustments.
- Final export to Excel, executive PDF and JSON.
- Context for Colombian private companies, nonprofit entities and public-sector organizations.

## Screenshots

### Home

![Kaikei home screen](docs/screenshots/inicio.png)

### File preparation

![Accounting ledger and bank-statement upload](docs/screenshots/carga-archivos.png)

### Reconciliation report

![Kaikei reconciliation dashboard](docs/screenshots/dashboard.png)

## Quick test for judges

Requirements:

- Node.js 24 or newer.
- ChatGPT/Codex installed, or a `codex` executable available in `PATH`.
- A ChatGPT account with access to Codex.

Run the app:

```bash
npm install
npm run dev
```

Use these richer synthetic XLSX files when starting a reconciliation:

- Accounting ledger: [`auxiliar_contable_sintetico_kaikei.xlsx`](outputs/019f86b6-372d-7103-912c-6632663ce348/auxiliar_contable_sintetico_kaikei.xlsx)
- Bank statement: [`extracto_bancario_sintetico_kaikei.xlsx`](outputs/019f86b6-372d-7103-912c-6632663ce348/extracto_bancario_sintetico_kaikei.xlsx)

They contain 30 and 31 fictional movements with direct matches, three grouped matches, a value discrepancy, a duplicate, bank fees, GMF tax, interest, a deposit in transit and an outstanding check.

A populated visual state can also be opened without submitting data to a model:

```text
http://127.0.0.1:5173/?demo=results
```

The other visual states are `?demo=home`, `?demo=files` and `?demo=processing`.

## Downloads

Packaged builds are published on the [GitHub Releases page](https://github.com/mauroentey/kaikei/releases).

| Platform | Installer |
| --- | --- |
| Windows x64 | `Kaikei Setup 0.1.0.exe` |
| macOS Apple Silicon | `Kaikei-0.1.0-arm64.dmg` |
| macOS Intel | `Kaikei-0.1.0.dmg` |

This development release is not digitally signed or notarized. Production distribution requires Apple Developer ID and Windows Code Signing certificates.

## Validation and packaging

Run the full validation suite:

```bash
npm run verify
```

Build installers:

```bash
npm run dist:mac
npm run dist:win
```

## Technical flow

1. Electron starts `codex app-server` over stdio and completes the JSONL handshake.
2. `account/read` reuses an existing session; `account/login/start` begins ChatGPT sign-in when required.
3. Files are parsed and normalized in the main process. The renderer receives only a preview and metadata.
4. The local engine proposes deterministic matches and detects duplicates.
5. Kaikei starts an ephemeral, read-only thread without approvals or tools. Codex receives normalized movements, candidates and review rules.
6. `turn/start.outputSchema` requires the final message to satisfy the report schema; Zod validates it again before display.
7. Exporters operate on the validated report held in memory for the current session.

The integration follows the official [Codex App Server documentation](https://learn.chatgpt.com/docs/app-server).

## Accounting scope

Kaikei helps prepare and document a bank reconciliation. It does not post journal entries, certify financial statements or replace the accountant, reviewer or approver. The researched Colombian rules and sources are documented in [docs/REGLAS_CONCILIACION_COLOMBIA.md](docs/REGLAS_CONCILIACION_COLOMBIA.md).

## Privacy and security

- Electron runs with `contextIsolation: true`, `nodeIntegration: false` and a sandboxed renderer.
- Native file dialogs are used; raw file paths are not exposed to the renderer.
- Kaikei has no custom backend and stores no passwords.
- Analysis threads are ephemeral, read-only and use approval policy `never`.
- The UI requires consent before normalized movements are sent to Codex.
- Each file is limited to 25 MB and 15,000 rows.

## License

Copyright © 2026 Mauricio Samper, Bogotá, Colombia.

Kaikei is open-source software released under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`). You may use, study, modify and distribute it —including commercially— provided that you comply with the license. If you distribute a modified version or let users interact with it over a network, you must offer the corresponding source code under the same license.

See [LICENSE](LICENSE) for the complete legal terms. If you need to integrate Kaikei into a proprietary product without the AGPL obligations, request a commercial license at [mauro@entey.net](mailto:mauro@entey.net).
