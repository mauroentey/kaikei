const { contextBridge, ipcRenderer } = require("electron");

const subscribe = (channel, callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld("kaikei", {
  codex: {
    account: () => ipcRenderer.invoke("codex:account"),
    login: () => ipcRenderer.invoke("codex:login"),
    logout: () => ipcRenderer.invoke("codex:logout"),
    chooseExecutable: () => ipcRenderer.invoke("codex:choose-executable"),
    onStatus: (callback) => subscribe("codex:status-event", callback),
    onLogin: (callback) => subscribe("codex:login-event", callback),
    onAccount: (callback) => subscribe("codex:account-event", callback),
  },
  files: {
    select: (role) => ipcRenderer.invoke("files:select", { role }),
    remove: (fileId) => ipcRenderer.invoke("files:remove", fileId),
  },
  reconciliation: {
    run: (payload) => ipcRenderer.invoke("reconciliation:run", payload),
    onProgress: (callback) => subscribe("reconciliation:progress", callback),
  },
  report: {
    export: (reportId, format) => ipcRenderer.invoke("report:export", { reportId, format }),
  },
});
