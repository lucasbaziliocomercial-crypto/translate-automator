import { ipcMain, dialog, BrowserWindow } from "electron";
import * as path from "path";
import { importFile, exportFile } from "./format/io";
import log from "electron-log/main";

export function registerFileIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("file:import", async () => {
    const win = getMainWindow();
    if (!win) return { ok: false, reason: "Janela indisponível" };

    const result = await dialog.showOpenDialog(win, {
      title: "Importar roteiro",
      properties: ["openFile"],
      filters: [
        { name: "Roteiros (DOCX, PDF)", extensions: ["docx", "pdf"] },
        { name: "DOCX", extensions: ["docx"] },
        { name: "PDF", extensions: ["pdf"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }
    const filePath = result.filePaths[0];
    try {
      const { format, markdown } = await importFile(filePath);
      return {
        ok: true,
        format,
        markdown,
        sourcePath: filePath,
        sourceName: path.basename(filePath),
      };
    } catch (e: any) {
      log.error("[file:import] erro:", e);
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });

  ipcMain.handle(
    "file:export",
    async (
      _e,
      args: { markdown: string; defaultFormat: "docx" | "pdf"; defaultName?: string },
    ) => {
      const win = getMainWindow();
      if (!win) return { ok: false, reason: "Janela indisponível" };

      const baseName = args.defaultName?.replace(/\.[^.]+$/, "") ?? "traducao";
      const result = await dialog.showSaveDialog(win, {
        title: "Exportar tradução",
        defaultPath: `${baseName}-EN.${args.defaultFormat}`,
        filters: [
          { name: "Word (.docx)", extensions: ["docx"] },
          { name: "PDF (.pdf)", extensions: ["pdf"] },
        ],
      });
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true };
      }
      try {
        await exportFile(result.filePath, args.markdown);
        return { ok: true, savedPath: result.filePath };
      } catch (e: any) {
        log.error("[file:export] erro:", e);
        return { ok: false, reason: e?.message ?? String(e) };
      }
    },
  );
}
