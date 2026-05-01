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

export interface RendererSettings {
  hasGeminiKey: boolean;
  lastModelId?: string;
}

export interface TranslateChunkEvent {
  jobId: string;
  type: "text" | "thinking" | "done" | "error";
  text?: string;
  error?: string;
}

const api = {
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
    geminiApiKey?: string;
    lastModelId?: string;
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
    modelId: "claude-opus-4-7" | "gemini-3-pro";
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

  checkForUpdates: (): Promise<{ ok: boolean; info?: { version: string }; reason?: string }> =>
    ipcRenderer.invoke("updater:check"),
};

contextBridge.exposeInMainWorld("translateAutomator", api);

export type TranslateAutomatorBridge = typeof api;
