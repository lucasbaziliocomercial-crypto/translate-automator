# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

```bash
npm run electron:dev    # roda Vite (5173) + Electron concorrentemente — fluxo de dev principal
npm run dev             # só Vite (renderer); a bridge `window.translateAutomator` fica indisponível
npm run dev:electron    # só Electron (assume Vite já rodando) — compila electron/ e abre via wrapper
npm run typecheck       # tsc --noEmit em tsconfig.json (renderer) E electron/tsconfig.json (main)
npm run build           # build:web (Vite → dist/) + build:electron (tsc → dist-electron/)
npm run package:mac     # build + electron-builder DMG arm64+x64 → dist-builder/
npm run package:win     # build + electron-builder NSIS x64 → dist-builder/
```

Não há suíte de testes configurada. Não há linter — `typecheck` é a verificação de correção.

## Arquitetura

App Electron com renderer React+Vite. Comunicação main ↔ renderer estritamente por IPC; o renderer NUNCA acessa Node/fs/SDK diretamente. Toda I/O real (arquivos, providers de LLM, settings, auth) acontece no main process.

### Dois TypeScript projects, distintos

- **Renderer**: [tsconfig.json](tsconfig.json) — `module: ESNext`, `moduleResolution: Bundler`, alias `@/*` → `src/*`, exclui `electron/`.
- **Main**: [electron/tsconfig.json](electron/tsconfig.json) — `module: CommonJS`, `outDir: ../dist-electron`, sem alias `@/`.

Quando importar de `electron/preload` no renderer, use caminho relativo (`../../electron/preload`), não `@/`. Quando duplicar lógica entre os dois (ex.: highlight-mmc), são dois arquivos espelhados — [src/lib/highlight-mmc.ts](src/lib/highlight-mmc.ts) (renderer, preview) e [electron/format/highlight-mmc.ts](electron/format/highlight-mmc.ts) (main, export DOCX/PDF). Mantenha-os em sincronia.

### Fluxo de tradução (paralelo por PARTE)

1. [src/lib/parts.ts](src/lib/parts.ts) faz split do markdown por cabeçalhos `PARTE N` / `PART N` / `📙 PARTE N` / `**PARTE N**` / etc.
2. [TranslateButton](src/components/TranslateButton.tsx) dispara um job IPC por parte em paralelo, cada um com `jobId` único.
3. [translate-ipc.ts](electron/translate-ipc.ts) mantém um `Map<jobId, AbortController>` e roteia ao provider conforme `modelId`.
4. Cada chunk volta como evento `translate:chunk` carregando o `jobId`. O store ([src/store/translation.ts](src/store/translation.ts)) usa `jobToPart` para append no `partResults[partNum]` correto.
5. Quando `inProgressCount` transita de >0 para 0, [App.tsx](src/App.tsx) auto-salva no histórico.

Sem PARTE detectada → tudo vira `partResults[1]`. `joinPartResults` reordena por número ao montar o output final.

### Providers

Dois providers, mesma assinatura `AsyncGenerator<{type, text?, error?}>`, ambos recebem o MESMO `TRANSLATOR_SYSTEM_PROMPT` ([src/lib/translator-prompt.ts](src/lib/translator-prompt.ts) — 10 regras + marcadores `==...==` e `### ✦ Nome` para destaque).

- **Claude** ([electron/providers/claude-provider.ts](electron/providers/claude-provider.ts)): usa `@anthropic-ai/claude-agent-sdk`, autentica via OAuth da assinatura Claude Max (CLI `claude` instalado globalmente, credenciais em `~/.claude/.credentials.json`). Sem API key. Gerenciado por [claude-auth.ts](electron/claude-auth.ts), que dispara um terminal externo para `npm install -g @anthropic-ai/claude-code` e `/login`.
- **Gemini** ([electron/providers/gemini-provider.ts](electron/providers/gemini-provider.ts)): `@google/genai`, modelo `gemini-3.1-pro-preview` com `thinkingLevel: ThinkingLevel.HIGH`, `temperature: 0.3`. API key vem de `settings:get` (criptografada via `safeStorage` em [settings-store.ts](electron/settings-store.ts)). O ID interno é `gemini-3-1-pro`; valores antigos `gemini-3-pro` em settings/histórico são migrados em runtime ([ModelPicker.tsx](src/components/ModelPicker.tsx) e [translation.ts](src/store/translation.ts)).

### Destaque verde MMC

Heurística em [highlight-mmc.ts](electron/format/highlight-mmc.ts): nome com MAIS ocorrências em `### ✦ Nome` é a FMC; nome com MENOS ocorrências (e ≥ 2) é o MMC. Empate → sem destaque (preferimos falso-negativo). Parágrafos sob `### ✦ <MMC>` recebem `#d9ead3` no preview e no export.

### Import/Export

[electron/format/io.ts](electron/format/io.ts) faz dispatch por extensão (`.docx` → mammoth+turndown / docx; `.pdf` → pdf-parse / pdfkit). Markdown é o formato canônico interno.

## Quirks importantes

### `ELECTRON_RUN_AS_NODE` quebra `npm run dev:electron`

O ambiente do Claude Code (e alguns shells) seta `ELECTRON_RUN_AS_NODE=1`, fazendo o binário do Electron rodar como Node puro. Resultado: `require('electron')` retorna uma string em vez da API e `app.whenReady()` crasha. Por isso [scripts/run-electron.cjs](scripts/run-electron.cjs) é um wrapper que faz `delete env.ELECTRON_RUN_AS_NODE` antes de `spawn`. **Não** substitua por `cross-env ELECTRON_RUN_AS_NODE= electron .` — o comportamento é inconsistente.

### `@anthropic-ai/claude-agent-sdk` é ESM-only

Como o main é compilado com `module: CommonJS`, `await import(...)` é reescrito pelo TS como `Promise.resolve().then(() => require(...))`, que falha com `ERR_REQUIRE_ESM`. Em [claude-provider.ts](electron/providers/claude-provider.ts) usamos um wrapper `new Function("p", "return import(p)")` para preservar o `import()` nativo. Não simplifique.

### Auto-update e release

[.github/workflows/release.yml](.github/workflows/release.yml): cada push em `main` (commit que NÃO começa com `chore: release`) bumpa patch, cria tag `vX.Y.Z`, builda Mac + Windows e publica via `gh release upload` (não via `electron-builder --publish` — workaround para o bug clássico de `latest-mac.yml` sumir em build multi-arch). Tags `v*` também disparam o build sem novo bump.

`publish` em [package.json](package.json) aponta para `lucasbaziliocomercial-crypto/translate-automator`. Em fork/rename, ajustar antes de empurrar pra main.

### Idioma

Comentários, mensagens de erro, prompts e UI são em **PT-BR**. Traduções saem em EN-US (esse é o produto). Mantenha o padrão.

### Logs

- Windows: `%APPDATA%\Translate Automator\logs\main.log`
- Mac: `~/Library/Logs/Translate Automator/main.log`
