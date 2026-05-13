import { app, BrowserWindow, ipcMain, net, shell } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import * as fs from "node:fs";
import * as path from "node:path";

const RELEASE_OWNER = "lucasbaziliocomercial-crypto";
const RELEASE_REPO = "translate-automator";

// Baixa um arquivo via net.request do Electron, seguindo redirects (GitHub
// releases redireciona pra S3). Reporta progresso por bytes. Sem backpressure
// explícita — os artifacts são <100MB e cabem confortavelmente no fluxo.
function downloadFile(
  url: string,
  destPath: string,
  onProgress: (transferred: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      file.destroy();
      reject(err);
    };

    const request = net.request({ url, redirect: "follow" });
    request.on("response", (response) => {
      if (response.statusCode !== 200) {
        fail(
          new Error(
            `HTTP ${response.statusCode} ${response.statusMessage ?? ""}`.trim(),
          ),
        );
        return;
      }
      const total = Number(response.headers["content-length"]) || 0;
      let transferred = 0;

      response.on("data", (chunk: Buffer) => {
        transferred += chunk.length;
        file.write(chunk);
        onProgress(transferred, total);
      });
      response.on("end", () => {
        file.end(() => {
          if (settled) return;
          settled = true;
          resolve();
        });
      });
      response.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))));
    });
    request.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))));
    file.on("error", (err) => fail(err));
    request.end();
  });
}

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

  // Fallback manual quando o auto-update do electron-updater falha (típico
  // no Mac sem code-signing, que erra com "Code signature at URL..."). Baixa
  // direto o DMG (Mac, arch correto) ou o setup .exe (Windows) da release
  // pra ~/Downloads/ e abre o arquivo — no Mac monta o DMG e o Finder
  // aparece com a janela de drag-to-install; no Windows roda o instalador.
  ipcMain.handle(
    "updater:download-and-open",
    async (
      _e,
      args: { version: string },
    ): Promise<{ ok: boolean; path?: string; reason?: string }> => {
      const version = String(args?.version ?? "").trim();
      if (!version) return { ok: false, reason: "versão inválida" };

      let fileName: string;
      if (process.platform === "darwin") {
        const arch = process.arch === "arm64" ? "arm64" : "x64";
        fileName = `translate-automator-${version}-${arch}-mac.dmg`;
      } else if (process.platform === "win32") {
        fileName = `translate-automator-setup-${version}.exe`;
      } else {
        return {
          ok: false,
          reason: `plataforma não suportada: ${process.platform}`,
        };
      }

      const url = `https://github.com/${RELEASE_OWNER}/${RELEASE_REPO}/releases/download/v${version}/${fileName}`;
      const destPath = path.join(app.getPath("downloads"), fileName);

      log.info(`[updater] download manual: ${url} → ${destPath}`);
      try {
        await downloadFile(url, destPath, (transferred, total) => {
          const percent = total > 0 ? (transferred / total) * 100 : 0;
          sendToRenderer("updater:manual-download-progress", {
            percent,
            transferred,
            total,
          });
        });
      } catch (e: any) {
        log.error("[updater] download manual falhou:", e);
        try {
          fs.unlinkSync(destPath);
        } catch {
          // arquivo pode não existir se falhou antes de criar
        }
        return { ok: false, reason: e?.message ?? String(e) };
      }

      log.info(`[updater] download manual concluído: ${destPath}`);
      const openErr = await shell.openPath(destPath);
      if (openErr) {
        log.error(`[updater] shell.openPath falhou: ${openErr}`);
        return { ok: false, reason: openErr };
      }
      return { ok: true, path: destPath };
    },
  );

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
