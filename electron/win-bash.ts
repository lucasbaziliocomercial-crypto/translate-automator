import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";

// Respeita FAKE_PLATFORM (mesmo padrão de claude-auth.ts) para que os branches
// Windows possam ser exercitados em dev no Mac. Quando FAKE_PLATFORM=win32 no
// host real Mac, findGitBashOnWindows retorna null (paths não existem) — o que
// é exatamente o cenário "card needs-git-bash" que queremos validar.
function effectivePlatform(): NodeJS.Platform {
  const fake = process.env.FAKE_PLATFORM as NodeJS.Platform | undefined;
  return fake ?? process.platform;
}

function isExistingFile(p: string | undefined | null): p is string {
  if (!p) return false;
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export function findGitBashOnWindows(): string | null {
  if (effectivePlatform() !== "win32") return null;

  const envPath = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  if (isExistingFile(envPath)) return envPath!;

  try {
    const out = execFileSync("where", ["bash.exe"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      shell: true,
    });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    // O `bash.exe` do System32 (WSL) NÃO satisfaz o Claude Code — ele exige
    // o bash do Git for Windows. Pulamos qualquer match em System32.
    if (first && isExistingFile(first) && !/\\System32\\/i.test(first)) {
      return first;
    }
  } catch {
    // sem `where` no PATH ou bash não achado — segue pros candidatos
  }

  const candidates = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe")
      : null,
    process.env.ProgramW6432
      ? path.join(process.env.ProgramW6432, "Git", "bin", "bash.exe")
      : null,
  ];

  for (const c of candidates) {
    if (isExistingFile(c)) return c!;
  }

  return null;
}

// Idempotente: setar repetidamente é OK. Em não-Windows é no-op total.
export function ensureGitBashEnv(): string | null {
  if (effectivePlatform() !== "win32") return null;

  const existing = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  if (isExistingFile(existing)) return existing!;

  const found = findGitBashOnWindows();
  if (found) {
    process.env.CLAUDE_CODE_GIT_BASH_PATH = found;
    log.info("[win-bash] CLAUDE_CODE_GIT_BASH_PATH ->", found);
  }
  return found;
}
