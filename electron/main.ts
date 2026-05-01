import { app, BrowserWindow, shell } from "electron";
import * as path from "path";
import log from "electron-log/main";
import { setupAutoUpdater } from "./auto-updater";
import { registerClaudeAuthIpc } from "./claude-auth";
import { registerClipboardIpc } from "./clipboard-ipc";
import { registerFileIpc } from "./file-ipc";
import { registerHistoryIpc } from "./history-ipc";
import { registerSettingsIpc } from "./settings-ipc";
import { registerTranslateIpc } from "./translate-ipc";

log.initialize();
log.transports.file.level = "info";
log.transports.file.maxSize = 5 * 1024 * 1024;
Object.assign(console, log.functions);

let mainWindow: BrowserWindow | null = null;
const getMainWindow = () => mainWindow;

const DEV_URL = "http://localhost:5173";

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Translate Automator",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged && process.env.NODE_ENV === "development") {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    log.error("[main] render-process-gone:", details);
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    log.error("[main] did-fail-load:", code, desc);
    if (code === -102 && !app.isPackaged) {
      setTimeout(() => mainWindow?.loadURL(DEV_URL), 1500);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function bootIpc(): void {
  registerSettingsIpc();
  registerClaudeAuthIpc();
  registerClipboardIpc();
  registerFileIpc(getMainWindow);
  registerHistoryIpc();
  registerTranslateIpc(getMainWindow);
}

app.whenReady().then(() => {
  bootIpc();
  createWindow();
  setupAutoUpdater(getMainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (e) => log.error("[main] uncaughtException:", e));
process.on("unhandledRejection", (e) => log.error("[main] unhandledRejection:", e));
