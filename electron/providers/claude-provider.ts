import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import log from "electron-log/main";

export interface ClaudeStreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  error?: string;
}

// Caminho do cli.js que vem dentro do SDK. Usado como fallback quando
// não encontramos o `claude` instalado pelo usuário. Em produção, a SDK
// fica em app.asar.unpacked (asarUnpack no package.json) — sem isso,
// `spawn("node", [...])` falha porque Node puro não lê dentro de asar.
function resolveBundledCliPath(): string {
  const base = app.getAppPath().replace(/app\.asar(?=$|[\\/])/, "app.asar.unpacked");
  return path.join(
    base,
    "node_modules",
    "@anthropic-ai",
    "claude-agent-sdk",
    "cli.js",
  );
}

// Procura o `claude` instalado pelo usuário (npm-global, brew, native).
// Preferimos ele porque: (1) é o mesmo binário que fez `/login`, então o
// ACL da Keychain do macOS bate; (2) está atualizado e conhece modelos
// novos (Opus 4.7), enquanto o cli.js bundled do SDK fica preso na
// versão de quando o pacote foi publicado.
function resolveUserClaudePath(): string | null {
  // No Windows, `where claude` aponta pro `.cmd`, e o spawn direto sem
  // shell trava em `.cmd` em algumas versões do Node — fica mais simples
  // usar o cli.js bundled.
  if (process.platform === "win32") return null;

  try {
    const out = execFileSync("which", ["claude"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    })
      .trim()
      .split(/\r?\n/)[0]
      ?.trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // ignore: cai pros candidatos abaixo
  }

  const home = process.env.HOME ?? "";
  const candidates = [
    path.join(home, ".claude", "local", "claude"), // claude migrate-installer
    path.join(home, ".npm-global", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

function resolveClaudeCliPath(): { path: string; source: "user-installed" | "bundled" } {
  const user = resolveUserClaudePath();
  if (user) return { path: user, source: "user-installed" };
  return { path: resolveBundledCliPath(), source: "bundled" };
}

export async function* streamClaudeTranslation(args: {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}): AsyncGenerator<ClaudeStreamChunk> {
  const { systemPrompt, userPrompt, signal } = args;

  // Buffer de stderr — quando cli.js sai com código != 0, a SDK só
  // devolve "Claude Code process exited with code 1" e a causa real
  // (token expirado, modelo inválido, etc.) fica só no stderr. Anexamos
  // as últimas linhas no erro retornado pra UI/log mostrarem algo útil.
  const stderrTail: string[] = [];
  const pushStderr = (msg: string) => {
    const trimmed = msg.trimEnd();
    if (!trimmed) return;
    stderrTail.push(trimmed);
    if (stderrTail.length > 30) stderrTail.shift();
    log.warn("[claude-provider] cli stderr:", trimmed);
  };

  try {
    // Dynamic import: @anthropic-ai/claude-agent-sdk is ESM-only. We use a
    // Function-constructor wrapper because TypeScript with module=CommonJS
    // rewrites `await import(...)` into `Promise.resolve().then(() => require(...))`,
    // which fails for ESM-only packages with ERR_REQUIRE_ESM. The Function
    // constructor preserves a real native dynamic import.
    const dynamicImport = new Function("p", "return import(p)") as (
      p: string,
    ) => Promise<typeof import("@anthropic-ai/claude-agent-sdk")>;
    const sdk = await dynamicImport("@anthropic-ai/claude-agent-sdk");
    const { query } = sdk;

    const cli = resolveClaudeCliPath();
    log.info(`[claude-provider] cli (${cli.source}):`, cli.path);

    const response = query({
      prompt: userPrompt,
      options: {
        model: "claude-opus-4-7",
        pathToClaudeCodeExecutable: cli.path,
        // String puro: sem preset "claude_code", que carregaria toda a
        // infra de tools/agentes/skills. Pra tradução não precisamos disso.
        systemPrompt,
        // SDK isolation mode: ignora ~/.claude/settings.json. Evita que
        // MCP servers/plugins/marketplaces do usuário causem exit 1.
        settingSources: [],
        // Sem tools: tradução não precisa de Bash/Read/Edit/etc.
        tools: [],
        // Não precisa de bypass — tools desabilitados nem chegam ao
        // checador de permissões.
        includePartialMessages: true,
        abortController: signal ? attachSignal(signal) : undefined,
        stderr: pushStderr,
      },
    });

    for await (const message of response as AsyncIterable<any>) {
      if (signal?.aborted) {
        yield { type: "error", error: "Tradução cancelada." };
        return;
      }

      if (message.type === "stream_event" && message.event.type === "content_block_delta") {
        const delta = message.event.delta;
        if (delta.type === "text_delta") {
          yield { type: "text", text: delta.text };
        }
      } else if (message.type === "result") {
        yield { type: "done" };
        return;
      }
    }

    yield { type: "done" };
  } catch (err: any) {
    log.error("[claude-provider] erro:", err);
    const base = err?.message ?? String(err);
    const tail = stderrTail.slice(-3).filter((s) => s.length > 0);
    const detail = tail.length > 0 ? ` — ${tail.join(" | ")}` : "";
    yield { type: "error", error: `${base}${detail}` };
  }
}

function attachSignal(signal: AbortSignal): AbortController {
  const ctrl = new AbortController();
  if (signal.aborted) ctrl.abort();
  else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  return ctrl;
}
