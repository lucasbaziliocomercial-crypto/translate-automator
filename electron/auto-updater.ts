import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendToRenderer = (channel: string, payload: unknown) => {
    getMainWindow()?.webContents.send(channel, payload);
  };

  autoUpdater.on("error", (e) => {
    log.error("[updater] erro:", e);
    sendToRenderer("updater:error", { message: e?.message ?? String(e) });
  });
  autoUpdater.on("update-available", (info) => {
    log.info("[updater] update disponível:", info.version);
    sendToRenderer("updater:update-available", { version: info.version });
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("[updater] sem updates");
    sendToRenderer("updater:update-not-available", {
      currentVersion: info?.version ?? app.getVersion(),
    });
  });
  autoUpdater.on("download-progress", (p) => {
    sendToRenderer("updater:download-progress", {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updater] update baixado:", info.version);
    sendToRenderer("updater:update-downloaded", { version: info.version });
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
    if (!app.isPackaged) {
      return { ok: false, reason: "dev-mode" };
    }
    try {
      const r = await autoUpdater.checkForUpdates();
      return { ok: true, info: r?.updateInfo };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });

  ipcMain.handle("updater:quit-and-install", () => {
    autoUpdater.quitAndInstall();
    return { ok: true };
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
