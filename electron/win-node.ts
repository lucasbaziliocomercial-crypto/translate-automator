import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";

// Espelha win-bash.ts: respeita FAKE_PLATFORM pra exercitar os branches Windows
// em dev no Mac. Em host real Mac com FAKE_PLATFORM=win32, find* retorna null
// (paths Windows não existem), simulando o cenário "needs-node" no card.
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

export function findNodeOnWindows(): string | null {
  if (effectivePlatform() !== "win32") return null;

  try {
    const out = execFileSync("where", ["node.exe"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      shell: true,
    });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    // Filtra System32 pelo mesmo motivo que win-bash.ts: o que estiver lá é
    // proxy de WSL ou similar — não serve pra `spawn('node', ...)` da SDK.
    if (first && isExistingFile(first) && !/\\System32\\/i.test(first)) {
      return first;
    }
  } catch {
    // sem `where` no PATH ou node não achado — segue pros candidatos
  }

  const candidates = [
    "C:\\Program Files\\nodejs\\node.exe",
    "C:\\Program Files (x86)\\nodejs\\node.exe",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "nodejs", "node.exe")
      : null,
    process.env.ProgramW6432
      ? path.join(process.env.ProgramW6432, "nodejs", "node.exe")
      : null,
    // nvm-windows: %APPDATA%\nvm\node.exe é um symlink criado por `nvm use`.
    process.env.APPDATA
      ? path.join(process.env.APPDATA, "nvm", "node.exe")
      : null,
  ];

  for (const c of candidates) {
    if (isExistingFile(c)) return c!;
  }

  // nvm-windows fallback: nenhum symlink ativo mas pode haver versões instaladas.
  // Pega a maior ordem lexicográfica (suficiente pro caso comum vX.Y.Z).
  try {
    const nvm = process.env.APPDATA
      ? path.join(process.env.APPDATA, "nvm")
      : null;
    if (nvm && fs.existsSync(nvm)) {
      const versions = fs
        .readdirSync(nvm)
        .filter((d) => /^v\d+\./.test(d))
        .map((d) => path.join(nvm, d, "node.exe"))
        .filter(isExistingFile)
        .sort()
        .reverse();
      if (versions[0]) return versions[0];
    }
  } catch {
    // ignore
  }

  return null;
}

// Idempotente: prepend o diretório do node.exe ao PATH se ainda não estiver lá.
// Em não-Windows é no-op. Retorna o caminho absoluto do node.exe ou null.
export function ensureNodeOnPath(): string | null {
  if (effectivePlatform() !== "win32") return null;

  const found = findNodeOnWindows();
  if (!found) return null;

  const dir = path.dirname(found);
  const current = process.env.PATH ?? "";
  const segs = current.split(";").map((s) => s.trim()).filter(Boolean);
  if (!segs.some((s) => s.toLowerCase() === dir.toLowerCase())) {
    process.env.PATH = `${dir};${current}`;
    log.info("[win-node] PATH +=", dir);
  }
  return found;
}
