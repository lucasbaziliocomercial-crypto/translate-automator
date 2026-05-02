import { contextBridge, ipcRenderer } from "electron";

export interface ImportResult {
  ok: boolean;
  format?: "docx" | "pdf";
  markdown?: string;
  sourcePath?: string;
  sourceName?: string;
  canceled?: boolean;
  reason?: string;
}

export interface ExportResult {
  ok: boolean;
  savedPath?: string;
  canceled?: boolean;
  reason?: string;
}

export interface ClaudeStatus {
  installed: boolean;
  loggedIn: boolean;
  credentialsPath?: string;
  version?: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  sourceName: string | null;
  sourceFormat: "docx" | "pdf" | null;
  modelId: string;
  source: string;
  partResults: Record<number, string>;
}

export interface SimpleResult {
  ok: boolean;
  reason?: string;
}

export type ThemePreference = "light" | "dark" | "system";

export interface RendererSettings {
  lastModelId?: string;
  theme: ThemePreference;
}

export interface TranslateChunkEvent {
  jobId: string;
  type: "text" | "thinking" | "done" | "error";
  text?: string;
  error?: string;
}

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("app:get-version"),

  importFile: (): Promise<ImportResult> => ipcRenderer.invoke("file:import"),

  exportFile: (args: {
    markdown: string;
    defaultFormat: "docx" | "pdf";
    defaultName?: string;
  }): Promise<ExportResult> => ipcRenderer.invoke("file:export", args),

  getClaudeStatus: (): Promise<ClaudeStatus> => ipcRenderer.invoke("claude:status"),
  installClaude: (): Promise<SimpleResult> => ipcRenderer.invoke("claude:install"),
  setupClaude: (): Promise<SimpleResult> => ipcRenderer.invoke("claude:setup"),
  logoutClaude: (): Promise<SimpleResult & { removed?: string[] }> =>
    ipcRenderer.invoke("claude:logout"),

  getSettings: (): Promise<RendererSettings> => ipcRenderer.invoke("settings:get"),
  setSettings: (patch: {
    lastModelId?: string;
    theme?: ThemePreference;
  }): Promise<RendererSettings> => ipcRenderer.invoke("settings:set", patch),

  writeClipboardHtml: (args: { html: string; text: string }): Promise<SimpleResult> =>
    ipcRenderer.invoke("clipboard:write-html", args),

  listHistory: (): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke("history:list"),
  saveHistory: (
    input: Omit<HistoryEntry, "id" | "createdAt" | "updatedAt">,
  ): Promise<HistoryEntry> => ipcRenderer.invoke("history:save", input),
  deleteHistoryEntry: (id: string): Promise<SimpleResult> =>
    ipcRenderer.invoke("history:delete", id),
  clearHistory: (): Promise<SimpleResult> =>
    ipcRenderer.invoke("history:clear"),

  startTranslation: (req: {
    jobId: string;
    modelId: "claude-opus-4-7";
    systemPrompt: string;
    userPrompt: string;
  }): Promise<SimpleResult> => ipcRenderer.invoke("translate:start", req),
  cancelTranslation: (jobId: string): Promise<SimpleResult> =>
    ipcRenderer.invoke("translate:cancel", jobId),

  onTranslateChunk: (cb: (chunk: TranslateChunkEvent) => void): (() => void) => {
    const listener = (_e: unknown, chunk: TranslateChunkEvent) => cb(chunk);
    ipcRenderer.on("translate:chunk", listener);
    return () => ipcRenderer.removeListener("translate:chunk", listener);
  },

  onUpdateAvailable: (cb: (info: { version: string }) => void): (() => void) => {
    const listener = (_e: unknown, info: { version: string }) => cb(info);
    ipcRenderer.on("updater:update-available", listener);
    return () => ipcRenderer.removeListener("updater:update-available", listener);
  },

  onUpdateNotAvailable: (
    cb: (info: { currentVersion: string }) => void,
  ): (() => void) => {
    const listener = (_e: unknown, info: { currentVersion: string }) => cb(info);
    ipcRenderer.on("updater:update-not-available", listener);
    return () => ipcRenderer.removeListener("updater:update-not-available", listener);
  },

  onUpdateDownloadProgress: (
    cb: (p: {
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }) => void,
  ): (() => void) => {
    const listener = (
      _e: unknown,
      p: {
        percent: number;
        transferred: number;
        total: number;
        bytesPerSecond: number;
      },
    ) => cb(p);
    ipcRenderer.on("updater:download-progress", listener);
    return () => ipcRenderer.removeListener("updater:download-progress", listener);
  },

  onUpdateDownloaded: (cb: (info: { version: string }) => void): (() => void) => {
    const listener = (_e: unknown, info: { version: string }) => cb(info);
    ipcRenderer.on("updater:update-downloaded", listener);
    return () => ipcRenderer.removeListener("updater:update-downloaded", listener);
  },

  onUpdateError: (cb: (info: { message: string }) => void): (() => void) => {
    const listener = (_e: unknown, info: { message: string }) => cb(info);
    ipcRenderer.on("updater:error", listener);
    return () => ipcRenderer.removeListener("updater:error", listener);
  },

  checkForUpdates: (): Promise<{ ok: boolean; info?: { version: string }; reason?: string }> =>
    ipcRenderer.invoke("updater:check"),

  quitAndInstall: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("updater:quit-and-install"),
};

contextBridge.exposeInMainWorld("translateAutomator", api);

export type TranslateAutomatorBridge = typeof api;
