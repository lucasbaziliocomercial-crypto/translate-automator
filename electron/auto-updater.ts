import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (e) => log.error("[updater] erro:", e));
  autoUpdater.on("update-available", (info) => {
    log.info("[updater] update disponível:", info.version);
    getMainWindow()?.webContents.send("updater:update-available", { version: info.version });
  });
  autoUpdater.on("update-not-available", () => {
    log.info("[updater] sem updates");
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updater] update baixado:", info.version);
    const win = getMainWindow();
    if (!win) return;
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Atualização disponível",
        message: `Translate Automator v${info.version} foi baixado.`,
        detail: "Reinicie o app para aplicar.",
        buttons: ["Reiniciar agora", "Mais tarde"],
      })
      .then((r) => {
        if (r.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  ipcMain.handle("updater:check", async () => {
    try {
      const r = await autoUpdater.checkForUpdates();
      return { ok: true, info: r?.updateInfo };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });

  if (!app.isPackaged) {
    log.info("[updater] dev mode — auto-update desativado");
    return;
  }

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => log.error("[updater] check falhou:", e));
  }, 5_000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((e) => log.error("[updater] check falhou:", e));
  }, 6 * 60 * 60 * 1000);
}
