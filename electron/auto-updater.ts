import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendToRenderer = (channel: string, payload: unknown) => {
    getMainWindow()?.webContents.send(channel, payload);
  };

  // Em macOS sem code signing, o Launch Services às vezes mantém o Info.plist
  // antigo em cache mesmo após o bundle ser substituído. O updater acaba
  // reportando "update disponível" para a mesma versão que o app já está
  // rodando — e o usuário fica preso num loop "Reiniciar para atualizar"
  // que nunca muda nada. Esse guard descarta esses eventos fantasmas.
  const isSameAsCurrent = (version: string) => version === app.getVersion();

  // Trackeia se há um ciclo de update legítimo aberto. Se descartamos o
  // update-available por ser fantasma, ignoramos download-progress e
  // update-downloaded subsequentes do mesmo ciclo (o autoDownload do
  // electron-updater continua baixando em background mas o renderer não vê).
  let activeUpdateVersion: string | null = null;

  autoUpdater.on("error", (e) => {
    log.error("[updater] erro:", e);
    sendToRenderer("updater:error", { message: e?.message ?? String(e) });
  });
  autoUpdater.on("update-available", (info) => {
    log.info("[updater] update disponível:", info.version);
    if (isSameAsCurrent(info.version)) {
      log.warn(
        `[updater] ignorando update-available para v${info.version} — app já está nessa versão`,
      );
      activeUpdateVersion = null;
      return;
    }
    activeUpdateVersion = info.version;
    sendToRenderer("updater:update-available", { version: info.version });
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("[updater] sem updates");
    activeUpdateVersion = null;
    sendToRenderer("updater:update-not-available", {
      currentVersion: info?.version ?? app.getVersion(),
    });
  });
  autoUpdater.on("download-progress", (p) => {
    if (!activeUpdateVersion) return;
    sendToRenderer("updater:download-progress", {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updater] update baixado:", info.version);
    if (isSameAsCurrent(info.version)) {
      log.warn(
        `[updater] ignorando update-downloaded para v${info.version} — app já está nessa versão (provável cache stale do Launch Services no macOS)`,
      );
      activeUpdateVersion = null;
      return;
    }
    if (activeUpdateVersion !== info.version) {
      log.warn(
        `[updater] update-downloaded para v${info.version} sem update-available correspondente — ignorando`,
      );
      return;
    }
    sendToRenderer("updater:update-downloaded", { version: info.version });
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
    log.info("[updater] quit-and-install solicitado pelo usuário");
    try {
      // (isSilent=false, isForceRunAfter=true) — força reabrir o app após instalar.
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (e: any) {
      log.error("[updater] quitAndInstall falhou:", e);
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
