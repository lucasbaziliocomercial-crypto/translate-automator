import { ipcMain, shell } from "electron";
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

// Dev-only: FAKE_PLATFORM permite exercitar os branches Mac/Win sem spoofar
// process.platform global (que quebra módulos nativos do Electron). Escopo
// restrito a este arquivo — o restante do app continua na plataforma real.
function effectivePlatform(): NodeJS.Platform {
  const fake = process.env.FAKE_PLATFORM as NodeJS.Platform | undefined;
  return fake ?? process.platform;
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
      shell: effectivePlatform() === "win32",
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
  if (effectivePlatform() !== "darwin") return false;
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

// Instala o Claude CLI sem sudo. Quando o prefix npm padrão é root-owned
// (caso típico do instalador oficial nodejs.org em /usr/local), reconfigura
// para ~/.npm-global e adiciona ao rc do shell ativo, idempotente.
// fixPathForGuiLaunch() em main.ts já cobre ~/.npm-global/bin, então o app
// encontra o binário em qualquer cold start.
function writeMacInstallScript(): string {
  const tmp = path.join(
    os.tmpdir(),
    `translate-automator-claude-install-${Date.now()}.sh`,
  );
  const content = `#!/bin/bash
echo "==> Translate Automator: instalação do Claude CLI"
echo ""

if ! command -v npm >/dev/null 2>&1; then
  echo "ERRO: npm não foi encontrado neste Mac."
  echo "Instale o Node.js primeiro: https://nodejs.org/"
  echo "Depois clique em 'Instalar Claude CLI' novamente."
  read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
  exit 1
fi

echo "Node detectado: \$(node --version 2>/dev/null || echo desconhecida)"
echo "npm  detectado: \$(npm  --version 2>/dev/null || echo desconhecida)"
echo ""

CURRENT_PREFIX="\$(npm config get prefix 2>/dev/null | tr -d '[:space:]')"
echo "Prefix npm atual: \$CURRENT_PREFIX"

PREFIX_USER_OWNED=0
case "\$CURRENT_PREFIX" in
  "\$HOME"/.nvm/*|"\$HOME"/.volta/*|"\$HOME"/.asdf/*|"\$HOME"/.fnm/*|"\$HOME"/Library/pnpm*|"\$HOME"/.local/*|"\$HOME"/.npm-global*|"\$HOME"/n/*)
    PREFIX_USER_OWNED=1 ;;
esac
[ -w "\$CURRENT_PREFIX/lib/node_modules" ] 2>/dev/null && PREFIX_USER_OWNED=1

# Cleanup defensivo: tentativas anteriores podem ter deixado lixo
# em /usr/local/lib/node_modules/@anthropic-ai/.claude-code-XXXXXX
# (diretório oculto que o npm cria durante o rename).
rm -rf /usr/local/lib/node_modules/@anthropic-ai/.claude-code-* 2>/dev/null
rm -rf /opt/homebrew/lib/node_modules/@anthropic-ai/.claude-code-* 2>/dev/null

if [ \$PREFIX_USER_OWNED -eq 0 ]; then
  echo ""
  echo "==> O prefix atual não é gravável pelo seu usuário."
  echo "    Configurando prefix pessoal em ~/.npm-global (sem precisar de senha)."
  NPM_GLOBAL="\$HOME/.npm-global"
  mkdir -p "\$NPM_GLOBAL/bin" "\$NPM_GLOBAL/lib"
  npm config set prefix "\$NPM_GLOBAL"

  RC_MARK="# >>> translate-automator: npm-global PATH >>>"
  RC_END="# <<< translate-automator: npm-global PATH <<<"

  case "\$(basename "\${SHELL:-/bin/zsh}")" in
    zsh)  RC_FILES=("\$HOME/.zshrc") ;;
    bash) RC_FILES=("\$HOME/.bash_profile" "\$HOME/.bashrc") ;;
    *)    RC_FILES=("\$HOME/.profile") ;;
  esac

  for RC in "\${RC_FILES[@]}"; do
    touch "\$RC"
    if ! grep -qF "\$RC_MARK" "\$RC" 2>/dev/null; then
      {
        printf '\\n%s\\n' "\$RC_MARK"
        printf 'export PATH="%s/bin:\$PATH"\\n' "\$NPM_GLOBAL"
        printf '%s\\n' "\$RC_END"
      } >> "\$RC"
      echo "    + adicionado em \$RC"
    else
      echo "    = \$RC já contém o bloco — pulando"
    fi
  done

  export PATH="\$NPM_GLOBAL/bin:\$PATH"
fi

echo ""
echo "==> Instalando @anthropic-ai/claude-code (pode levar 1-2 minutos)..."
npm install -g @anthropic-ai/claude-code
RESULT=\$?

echo ""
if [ \$RESULT -eq 0 ] && command -v claude >/dev/null 2>&1; then
  echo "==> Sucesso. Versão instalada:"
  claude --version
  echo ""
  echo "Pode fechar esta janela. Volte ao app e clique em 'Verificar'."
elif [ \$RESULT -eq 0 ]; then
  echo "==> Instalação concluída, mas 'claude' ainda não está no PATH desta sessão."
  echo "    Feche este terminal, abra outro, e clique em 'Verificar' no app."
else
  echo "==> A instalação falhou (código \$RESULT)."
  echo ""
  echo "Possíveis causas:"
  echo "  - Sem internet ou registro npm fora do ar"
  echo "  - Node muito antigo (precisa >= 18). Cheque: node --version"
  echo "  - Antivírus/MDM bloqueando ~/.npm-global"
  echo ""
  echo "Tente rodar manualmente neste terminal:"
  echo "  npm install -g @anthropic-ai/claude-code"
fi

echo ""
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
  log.info("[claude-auth] script gerado em:", scriptPath);
  // Dev: com FAKE_PLATFORM ativo o `open`/`Terminal` do mac e o `cmd /k` real
  // não existem no SO hospedeiro — abrimos o script no editor padrão pra inspeção.
  if (process.env.FAKE_PLATFORM) {
    shell.openPath(scriptPath).then((err) => {
      if (err) log.warn("[claude-auth] shell.openPath falhou:", err);
    });
    return { ok: true };
  }
  try {
    if (effectivePlatform() === "darwin") {
      spawn("open", ["-a", "Terminal", scriptPath], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return { ok: true };
    }
    if (effectivePlatform() === "win32") {
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
        effectivePlatform() === "win32"
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
        effectivePlatform() === "win32"
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
      if (effectivePlatform() === "darwin") {
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
