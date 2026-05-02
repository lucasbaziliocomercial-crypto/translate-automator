import { app, BrowserWindow, Menu, nativeImage, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import log from "electron-log/main";
import { setupAutoUpdater } from "./auto-updater";
import { registerClaudeAuthIpc } from "./claude-auth";
import { registerClipboardIpc } from "./clipboard-ipc";
import { registerFileIpc } from "./file-ipc";
import { registerHistoryIpc } from "./history-ipc";
import { registerSettingsIpc } from "./settings-ipc";
import { registerTranslateIpc } from "./translate-ipc";

const APP_NAME = "Translate Automator";
app.setName(APP_NAME);

log.initialize();
log.transports.file.level = "info";
log.transports.file.maxSize = 5 * 1024 * 1024;
Object.assign(console, log.functions);

let mainWindow: BrowserWindow | null = null;
const getMainWindow = () => mainWindow;

const DEV_URL = "http://localhost:5173";
const isMac = process.platform === "darwin";

function createWindow(): void {
  const iconPath = resolveIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: "#f8fafc",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    icon: iconPath ?? undefined,
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

function resolveIconPath(preferPng = false): string | null {
  const candidates = preferPng
    ? ["icon.png"]
    : isMac
      ? ["icon.icns", "icon.png"]
      : process.platform === "win32"
        ? ["icon.ico", "icon.png"]
        : ["icon.png"];
  const buildDir = path.join(__dirname, "..", "build");
  for (const name of candidates) {
    const p = path.join(buildDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function setupDockIcon(): void {
  if (!isMac || !app.dock) return;
  const iconPath = resolveIconPath(true);
  if (!iconPath) {
    log.warn("[icon] PNG não encontrado em build/");
    return;
  }
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    log.warn("[icon] nativeImage vazio para", iconPath);
    return;
  }
  app.dock.setIcon(image);
  log.info("[icon] dock icon aplicado:", iconPath);
}

function bootIpc(): void {
  registerSettingsIpc();
  registerClaudeAuthIpc();
  registerClipboardIpc();
  registerFileIpc(getMainWindow);
  registerHistoryIpc();
  registerTranslateIpc(getMainWindow);
}

function buildAppMenu(): void {
  const macAppMenu: Electron.MenuItemConstructorOptions = {
    label: APP_NAME,
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" },
    ],
  };

  const fileMenu: Electron.MenuItemConstructorOptions = {
    label: "File",
    submenu: isMac ? [{ role: "close" }] : [{ role: "quit" }],
  };

  const editMenu: Electron.MenuItemConstructorOptions = {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  };

  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  };

  const windowMenu: Electron.MenuItemConstructorOptions = {
    label: "Window",
    submenu: isMac
      ? [
          { role: "minimize" },
          { role: "zoom" },
          { type: "separator" },
          { role: "front" },
          { type: "separator" },
          { role: "window" },
        ]
      : [{ role: "minimize" }, { role: "zoom" }, { role: "close" }],
  };

  const helpMenu: Electron.MenuItemConstructorOptions = {
    label: "Help",
    submenu: [
      {
        label: "Repositório no GitHub",
        click: () =>
          shell.openExternal(
            "https://github.com/lucasbaziliocomercial-crypto/translate-automator",
          ),
      },
    ],
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    fileMenu,
    editMenu,
    viewMenu,
    windowMenu,
    helpMenu,
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  setupDockIcon();
  bootIpc();
  buildAppMenu();
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
