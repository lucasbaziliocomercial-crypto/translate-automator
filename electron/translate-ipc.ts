import { ipcMain, BrowserWindow } from "electron";
import { streamClaudeTranslation } from "./providers/claude-provider";
import { streamGeminiTranslation } from "./providers/gemini-provider";
import { loadSettings } from "./settings-store";
import log from "electron-log/main";

type ModelId = "claude-opus-4-7" | "gemini-3-1-pro";

interface TranslateRequest {
  jobId: string;
  modelId: ModelId;
  systemPrompt: string;
  userPrompt: string;
}

const activeJobs = new Map<string, AbortController>();

export function registerTranslateIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("translate:start", async (_e, req: TranslateRequest) => {
    const win = getMainWindow();
    if (!win) return { ok: false, reason: "Janela indisponível" };
    if (activeJobs.has(req.jobId)) {
      return { ok: false, reason: "Job já em execução" };
    }
    const ctrl = new AbortController();
    activeJobs.set(req.jobId, ctrl);

    runJob(win, req, ctrl).catch((e) => {
      log.error("[translate] runJob crash:", e);
      win.webContents.send("translate:chunk", {
        jobId: req.jobId,
        type: "error",
        error: e?.message ?? String(e),
      });
    }).finally(() => {
      activeJobs.delete(req.jobId);
    });

    return { ok: true };
  });

  ipcMain.handle("translate:cancel", (_e, jobId: string) => {
    const ctrl = activeJobs.get(jobId);
    if (ctrl) ctrl.abort();
    return { ok: true };
  });
}

async function runJob(
  win: BrowserWindow,
  req: TranslateRequest,
  ctrl: AbortController,
): Promise<void> {
  const send = (chunk: { type: string; text?: string; error?: string }) => {
    if (win.isDestroyed()) return;
    win.webContents.send("translate:chunk", { jobId: req.jobId, ...chunk });
  };

  try {
    if (req.modelId === "claude-opus-4-7") {
      for await (const chunk of streamClaudeTranslation({
        systemPrompt: req.systemPrompt,
        userPrompt: req.userPrompt,
        signal: ctrl.signal,
      })) {
        send(chunk);
        if (chunk.type === "done" || chunk.type === "error") return;
      }
    } else if (req.modelId === "gemini-3-1-pro") {
      const settings = loadSettings();
      const apiKey = settings.geminiApiKey ?? "";
      for await (const chunk of streamGeminiTranslation({
        apiKey,
        systemPrompt: req.systemPrompt,
        userPrompt: req.userPrompt,
        signal: ctrl.signal,
      })) {
        send(chunk);
        if (chunk.type === "done" || chunk.type === "error") return;
      }
    } else {
      send({ type: "error", error: `Modelo desconhecido: ${req.modelId}` });
    }
  } catch (e: any) {
    send({ type: "error", error: e?.message ?? String(e) });
  }
}
