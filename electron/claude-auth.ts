import { ipcMain } from "electron";
import { spawn, execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import log from "electron-log/main";

export interface ClaudeAuthStatus {
  installed: boolean;
  loggedIn: boolean;
  credentialsPath?: string;
  version?: string;
}

function credentialsCandidates(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".claude", ".credentials.json"),
    path.join(home, ".claude", "credentials.json"),
  ];
}

function checkInstalled(): { installed: boolean; version?: string } {
  try {
    const out = execFileSync("claude", ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      shell: process.platform === "win32",
    });
    return { installed: true, version: out.trim() };
  } catch {
    return { installed: false };
  }
}

// Claude Code v2.x armazena credenciais no macOS Keychain como
// "Claude Code-credentials-<hash>", não em ~/.claude/. O `-s` do
// `security` faz match parcial pelo service name, então o prefixo
// resolve sem precisar conhecer o sufixo único da instalação.
function checkLoggedInMacKeychain(): boolean {
  if (process.platform !== "darwin") return false;
  try {
    execFileSync(
      "security",
      ["find-generic-password", "-s", "Claude Code-credentials"],
      { stdio: ["ignore", "ignore", "ignore"], timeout: 5000 },
    );
    return true;
  } catch {
    return false;
  }
}

export function getClaudeAuthStatus(): ClaudeAuthStatus {
  const inst = checkInstalled();

  if (checkLoggedInMacKeychain()) {
    return { ...inst, loggedIn: true, credentialsPath: "macOS Keychain" };
  }

  for (const p of credentialsCandidates()) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 0) {
        return { ...inst, loggedIn: true, credentialsPath: p };
      }
    } catch {
      // ignore
    }
  }
  return { ...inst, loggedIn: false };
}

function writeMacInstallScript(): string {
  const tmp = path.join(
    os.tmpdir(),
    `translate-automator-claude-install-${Date.now()}.sh`,
  );
  const content = `#!/bin/bash
echo "==> Instalando Claude CLI"
echo ""
if ! command -v npm >/dev/null 2>&1; then
  echo "ERRO: npm nao encontrado."
  echo "Instale Node.js primeiro: https://nodejs.org/"
  echo ""
  read -n 1 -s -r -p "Pressione qualquer tecla para sair..."
  exit 1
fi
echo "Pressione qualquer tecla para iniciar a instalacao..."
read -n 1 -s -r
echo ""
npm install -g @anthropic-ai/claude-code
INSTALL_RESULT=$?
echo ""
if [ $INSTALL_RESULT -ne 0 ]; then
  echo "==> Tentando com sudo (npm global pode pedir senha de admin)..."
  sudo npm install -g @anthropic-ai/claude-code
fi
echo ""
echo "==> Verificando instalacao:"
claude --version || echo "(claude --version falhou — verifique se npm global bin esta no PATH)"
echo ""
echo "Pode fechar esta janela. Volte ao app e clique em 'Verificar'."
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
`;
  fs.writeFileSync(tmp, content, { encoding: "utf-8", mode: 0o755 });
  return tmp;
}

function writeWindowsInstallScript(): string {
  const tmp = path.join(
    os.tmpdir(),
    `translate-automator-claude-install-${Date.now()}.cmd`,
  );
  const content = `@echo off
echo ==^> Instalando Claude CLI
echo.
where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: npm nao encontrado.
  echo Instale Node.js primeiro: https://nodejs.org/
  echo.
  pause
  exit /b 1
)
echo Pressione qualquer tecla para iniciar a instalacao...
pause >nul
echo.
call npm install -g @anthropic-ai/claude-code
echo.
echo ==^> Verificando instalacao:
call claude --version || echo (claude --version falhou — verifique seu PATH)
echo.
echo Pode fechar esta janela. Volte ao app e clique em "Verificar".
pause
`;
  fs.writeFileSync(tmp, content, "utf-8");
  return tmp;
}

function writeMacLoginScript(): string {
  const tmp = path.join(
    os.tmpdir(),
    `translate-automator-claude-setup-${Date.now()}.sh`,
  );
  const content = `#!/bin/bash
set -e
echo "==> Login Claude para Translate Automator"
echo ""
echo "1) Quando o Claude abrir, digite /login"
echo "2) Faca o OAuth no navegador."
echo "3) Quando terminar, digite /quit e feche esta janela."
echo ""
read -n 1 -s -r -p "Pressione qualquer tecla para continuar..."
echo ""
exec claude
`;
  fs.writeFileSync(tmp, content, { encoding: "utf-8", mode: 0o755 });
  return tmp;
}

function writeWindowsLoginScript(): string {
  const tmp = path.join(
    os.tmpdir(),
    `translate-automator-claude-setup-${Date.now()}.cmd`,
  );
  const content = `@echo off
echo ==^> Login Claude para Translate Automator
echo.
echo 1) Quando o Claude abrir, digite /login
echo 2) Faca o OAuth no navegador.
echo 3) Quando terminar, digite /quit e feche esta janela.
echo.
pause
call claude
`;
  fs.writeFileSync(tmp, content, "utf-8");
  return tmp;
}

function openTerminalWithScript(scriptPath: string): { ok: true } | { ok: false; reason: string } {
  try {
    if (process.platform === "darwin") {
      spawn("open", ["-a", "Terminal", scriptPath], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return { ok: true };
    }
    if (process.platform === "win32") {
      spawn("cmd.exe", ["/c", "start", "", "cmd.exe", "/k", scriptPath], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return { ok: true };
    }
    spawn("xdg-open", [scriptPath], { detached: true, stdio: "ignore" }).unref();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

export function registerClaudeAuthIpc(): void {
  ipcMain.handle("claude:status", () => getClaudeAuthStatus());

  ipcMain.handle("claude:install", () => {
    try {
      const script =
        process.platform === "win32"
          ? writeWindowsInstallScript()
          : writeMacInstallScript();
      return openTerminalWithScript(script);
    } catch (e: any) {
      log.error("[claude-auth] install error:", e);
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });

  ipcMain.handle("claude:setup", () => {
    try {
      const script =
        process.platform === "win32"
          ? writeWindowsLoginScript()
          : writeMacLoginScript();
      return openTerminalWithScript(script);
    } catch (e: any) {
      log.error("[claude-auth] setup error:", e);
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });

  ipcMain.handle("claude:logout", () => {
    const removed: string[] = [];
    try {
      for (const p of credentialsCandidates()) {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          removed.push(p);
        }
      }
      if (process.platform === "darwin") {
        try {
          execFileSync(
            "security",
            [
              "delete-generic-password",
              "-s",
              "Claude Code-credentials",
            ],
            { stdio: ["ignore", "ignore", "ignore"], timeout: 5000 },
          );
          removed.push("macOS Keychain (Claude Code-credentials)");
        } catch {
          // sem entry no Keychain - ok
        }
      }
      return { ok: true, removed };
    } catch (e: any) {
      log.error("[claude-auth] logout error:", e);
      return { ok: false, reason: e?.message ?? String(e) };
    }
  });
}
