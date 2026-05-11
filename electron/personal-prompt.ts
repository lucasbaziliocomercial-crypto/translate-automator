import { app } from "electron";
import { promises as fs } from "fs";
import * as path from "path";
import log from "electron-log/main";

const FILE_NAME = "personal-prompt.md";

function personalPromptPath(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

export async function loadPersonalPromptAddendum(): Promise<string> {
  try {
    const raw = await fs.readFile(personalPromptPath(), "utf-8");
    return raw.trim();
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      log.warn("[personal-prompt] falha ao ler:", e?.message ?? e);
    }
    return "";
  }
}

export async function hasPersonalPrompt(): Promise<boolean> {
  const content = await loadPersonalPromptAddendum();
  return content.length > 0;
}
