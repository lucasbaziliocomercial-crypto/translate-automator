import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";

export type ThemePreference = "light" | "dark" | "system";

export interface AppSettings {
  lastModelId?: string;
  theme?: ThemePreference;
}

interface DiskShape {
  lastModelId?: string;
  theme?: ThemePreference;
}

let cached: AppSettings | null = null;

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function readDisk(): DiskShape {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf-8");
    return JSON.parse(raw) as DiskShape;
  } catch {
    return {};
  }
}

function writeDisk(data: DiskShape): void {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    log.error("[settings] falha ao gravar:", e);
  }
}

function normalizeTheme(t: unknown): ThemePreference {
  return t === "light" || t === "dark" || t === "system" ? t : "system";
}

export function loadSettings(): AppSettings {
  if (cached) return cached;
  const disk = readDisk();
  const out: AppSettings = {
    lastModelId: disk.lastModelId,
    theme: normalizeTheme(disk.theme),
  };
  cached = out;
  return out;
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const merged: AppSettings = { ...current, ...patch };

  const disk: DiskShape = {
    lastModelId: merged.lastModelId,
    theme: merged.theme,
  };
  writeDisk(disk);
  cached = merged;
  return merged;
}

export function getSettingsForRenderer(): {
  lastModelId?: string;
  theme: ThemePreference;
} {
  const s = loadSettings();
  return {
    lastModelId: s.lastModelId,
    theme: s.theme ?? "system",
  };
}
