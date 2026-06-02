import { ipcMain, BrowserWindow } from "electron";
import { streamClaudeTranslation } from "./providers/claude-provider";
import { buildSystemPrompt } from "./build-system-prompt";
import log from "electron-log/main";

type ModelId = "claude-opus-4-8";

interface ReviewRequest {
  jobId: string;
  modelId: ModelId;
  systemPrompt: string;
  userPrompt: string;
}

// Mapa próprio (independente da tradução) para a revisão poder rodar/cancelar isolada.
const activeJobs = new Map<string, AbortController>();

export function registerReviewIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("review:start", async (_e, req: ReviewRequest) => {
    const win = getMainWindow();
    if (!win) return { ok: false, reason: "Janela indisponível" };
    if (activeJobs.has(req.jobId)) {
      return { ok: false, reason: "Revisão já em execução" };
    }
    const ctrl = new AbortController();
    activeJobs.set(req.jobId, ctrl);

    runJob(win, req, ctrl)
      .catch((e) => {
        log.error("[review] runJob crash:", e);
        win.webContents.send("review:chunk", {
          jobId: req.jobId,
          type: "error",
          error: e?.message ?? String(e),
        });
      })
      .finally(() => {
        activeJobs.delete(req.jobId);
      });

    return { ok: true };
  });

  ipcMain.handle("review:cancel", (_e, jobId: string) => {
    const ctrl = activeJobs.get(jobId);
    if (ctrl) ctrl.abort();
    return { ok: true };
  });
}

async function runJob(
  win: BrowserWindow,
  req: ReviewRequest,
  ctrl: AbortController,
): Promise<void> {
  const send = (chunk: { type: string; text?: string; error?: string }) => {
    if (win.isDestroyed()) return;
    win.webContents.send("review:chunk", { jobId: req.jobId, ...chunk });
  };

  try {
    const systemPrompt = await buildSystemPrompt(req.systemPrompt);
    if (req.modelId === "claude-opus-4-8") {
      for await (const chunk of streamClaudeTranslation({
        systemPrompt,
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
