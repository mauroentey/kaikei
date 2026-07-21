import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

const REQUEST_TIMEOUT_MS = 30_000;
const ANALYSIS_TIMEOUT_MS = 8 * 60_000;

export class CodexAppServer extends EventEmitter {
  constructor({ executablePath, cwd }) {
    super();
    this.executablePath = executablePath || "codex";
    this.cwd = cwd;
    this.process = null;
    this.sequence = 0;
    this.pending = new Map();
    this.turns = new Map();
    this.readyPromise = null;
  }

  async start() {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = this.#startProcess().catch((error) => {
      this.readyPromise = null;
      throw error;
    });
    return this.readyPromise;
  }

  async #startProcess() {
    this.emit("status", { state: "starting", message: "Iniciando Codex App Server…" });
    this.process = spawn(this.executablePath, ["app-server", "--listen", "stdio://"], {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
      env: { ...process.env, NO_COLOR: "1" },
    });

    this.process.once("error", (error) => this.#handleExit(error));
    this.process.once("exit", (code, signal) => {
      this.#handleExit(new Error(`Codex App Server terminó (${code ?? signal ?? "sin código"}).`));
    });

    const lineReader = readline.createInterface({ input: this.process.stdout });
    lineReader.on("line", (line) => this.#handleLine(line));
    this.process.stderr.on("data", (chunk) => {
      const message = String(chunk).trim();
      if (message) this.emit("diagnostic", message);
    });

    await this.request("initialize", {
      clientInfo: { name: "kaikei_desktop", title: "Kaikei", version: "0.1.0" },
      capabilities: { experimentalApi: false },
    });
    this.notify("initialized", {});
    this.emit("status", { state: "ready", message: "Codex App Server listo" });
  }

  #handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.emit("diagnostic", `Mensaje no JSON de Codex: ${line.slice(0, 300)}`);
      return;
    }

    if (message.id !== undefined && ("result" in message || "error" in message)) {
      const pending = this.pending.get(String(message.id));
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(String(message.id));
      if (message.error) pending.reject(new Error(message.error.message || "Error de Codex App Server"));
      else pending.resolve(message.result);
      return;
    }

    if (!message.method) return;
    this.emit("notification", message);
    if (message.method === "account/login/completed") this.emit("login-completed", message.params);
    if (message.method === "account/updated") this.emit("account-updated", message.params);
    if (message.method === "item/completed") this.#handleCompletedItem(message.params);
    if (message.method === "item/agentMessage/delta") this.#handleMessageDelta(message.params);
    if (message.method === "turn/completed") this.#handleTurnCompleted(message.params);
  }

  #handleCompletedItem(params) {
    const watcher = this.turns.get(params?.threadId);
    if (!watcher || params?.item?.type !== "agentMessage") return;
    watcher.finalMessages.push(params.item.text);
  }

  #handleMessageDelta(params) {
    const watcher = this.turns.get(params?.threadId);
    if (!watcher) return;
    watcher.delta += params?.delta ?? "";
    this.emit("analysis-progress", {
      stage: "ai",
      message: "Codex está revisando partidas y hallazgos…",
      detail: watcher.delta.slice(-160),
    });
  }

  #handleTurnCompleted(params) {
    const watcher = this.turns.get(params?.threadId);
    if (!watcher) return;
    clearTimeout(watcher.timer);
    this.turns.delete(params.threadId);
    const turn = params.turn;
    if (turn?.status !== "completed") {
      watcher.reject(new Error(turn?.error?.message || `El análisis terminó con estado ${turn?.status ?? "desconocido"}.`));
      return;
    }
    const messagesFromTurn = (turn.items ?? [])
      .filter((item) => item.type === "agentMessage")
      .map((item) => item.text);
    const text = [...watcher.finalMessages, ...messagesFromTurn].filter(Boolean).at(-1) || watcher.delta;
    watcher.resolve(text);
  }

  #handleExit(error) {
    if (!this.process && !this.readyPromise) return;
    this.emit("status", { state: "error", message: error.message });
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    for (const watcher of this.turns.values()) {
      clearTimeout(watcher.timer);
      watcher.reject(error);
    }
    this.pending.clear();
    this.turns.clear();
    this.process = null;
    this.readyPromise = null;
  }

  request(method, params, timeoutMs = REQUEST_TIMEOUT_MS) {
    if (!this.process?.stdin?.writable && method !== "initialize") {
      return this.start().then(() => this.request(method, params, timeoutMs));
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(String(id));
        reject(new Error(`Tiempo de espera agotado en ${method}.`));
      }, timeoutMs);
      this.pending.set(String(id), { resolve, reject, timer });
      this.process.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
    });
  }

  notify(method, params) {
    if (!this.process?.stdin?.writable) return;
    this.process.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  async getAccount() {
    await this.start();
    return this.request("account/read", { refreshToken: false });
  }

  async loginWithChatGPT() {
    await this.start();
    return this.request("account/login/start", {
      type: "chatgpt",
      codexStreamlinedLogin: true,
      useHostedLoginSuccessPage: true,
      appBrand: "chatgpt",
    });
  }

  async logout() {
    await this.start();
    await this.request("account/logout", undefined);
    return { success: true };
  }

  async listModels() {
    await this.start();
    const response = await this.request("model/list", { limit: 100, includeHidden: false });
    return response.data ?? [];
  }

  async analyze({ prompt, outputSchema, workingDirectory }) {
    await this.start();
    const models = await this.listModels().catch(() => []);
    const model = models.find((item) => item.model === "gpt-5.6-sol")
      ?? models.find((item) => item.isDefault)
      ?? models[0]
      ?? null;

    const threadResponse = await this.request("thread/start", {
      model: model?.model ?? null,
      cwd: workingDirectory,
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
      developerInstructions: [
        "Eres un revisor experto en conciliación bancaria colombiana.",
        "No uses herramientas, terminal, web ni archivos. Todo el insumo está en el mensaje.",
        "No inventes transacciones, soportes, leyes ni valores. Conserva los identificadores recibidos.",
        "Distingue diferencias temporales, ajustes contables, errores y partidas sin identificar.",
        "Los ajustes son propuestas para revisión humana; nunca los presentes como contabilizados.",
        "Devuelve únicamente el objeto que satisface el esquema JSON solicitado.",
      ].join("\n"),
    });
    const threadId = threadResponse.thread.id;

    const completion = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.turns.delete(threadId);
        reject(new Error("El análisis de Codex superó el límite de 8 minutos."));
      }, ANALYSIS_TIMEOUT_MS);
      this.turns.set(threadId, { resolve, reject, timer, finalMessages: [], delta: "" });
    });

    try {
      await this.request("turn/start", {
        threadId,
        input: [{ type: "text", text: prompt, text_elements: [] }],
        model: model?.model ?? null,
        effort: model?.supportedReasoningEfforts?.some((item) => item.reasoningEffort === "high") ? "high" : null,
        outputSchema,
      });
      const output = await completion;
      return { output, model: model?.displayName ?? threadResponse.model };
    } catch (error) {
      const watcher = this.turns.get(threadId);
      if (watcher) clearTimeout(watcher.timer);
      this.turns.delete(threadId);
      throw error;
    }
  }

  stop() {
    if (!this.process) return;
    this.process.kill();
    this.process = null;
    this.readyPromise = null;
  }
}

export function discoverCodexExecutable(savedPath) {
  const candidates = [
    savedPath,
    process.env.KAIKEI_CODEX_PATH,
    process.platform === "darwin" ? "/Applications/ChatGPT.app/Contents/Resources/codex" : null,
    process.platform === "darwin" ? "/Applications/Codex.app/Contents/Resources/codex" : null,
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "ChatGPT", "resources", "codex.exe")
      : null,
    process.platform === "win32" && process.env.PROGRAMFILES
      ? path.join(process.env.PROGRAMFILES, "ChatGPT", "resources", "codex.exe")
      : null,
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? "codex";
}
