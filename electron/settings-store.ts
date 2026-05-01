import { app, safeStorage } from "electron";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";

export interface AppSettings {
  geminiApiKey?: string;
  lastModelId?: string;
}

interface DiskShape {
  geminiApiKeyEncrypted?: string;
  lastModelId?: string;
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

export function loadSettings(): AppSettings {
  if (cached) return cached;
  const disk = readDisk();
  const out: AppSettings = { lastModelId: disk.lastModelId };
  if (disk.geminiApiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      const buf = Buffer.from(disk.geminiApiKeyEncrypted, "base64");
      out.geminiApiKey = safeStorage.decryptString(buf);
    } catch (e) {
      log.warn("[settings] falha ao descriptografar Gemini key:", e);
    }
  }
  cached = out;
  return out;
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const merged: AppSettings = { ...current, ...patch };

  const disk: DiskShape = { lastModelId: merged.lastModelId };
  if (merged.geminiApiKey && safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(merged.geminiApiKey);
    disk.geminiApiKeyEncrypted = enc.toString("base64");
  }
  writeDisk(disk);
  cached = merged;
  return merged;
}

export function getSettingsForRenderer(): { hasGeminiKey: boolean; lastModelId?: string } {
  const s = loadSettings();
  return { hasGeminiKey: Boolean(s.geminiApiKey), lastModelId: s.lastModelId };
}
