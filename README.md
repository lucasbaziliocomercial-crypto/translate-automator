# Translate Automator

App desktop (Mac + Windows) para traduzir roteiros do **PT-BR para EN-US** preservando a formatação do arquivo original e destacando o POV masculino (MMC) em verde.

- **Modelos:** Claude Opus 4.7 (via assinatura Claude Max) e Gemini 3 Pro (raciocínio).
- **Formatos:** DOCX e PDF (import e export).
- **Auto-update:** cada `git push` em `main` gera nova versão automaticamente para Mac e Windows.
- **Persona:** o tradutor segue à risca o prompt "AGENTE TRADUTOR IMPECÁVEL" (10 regras), aplicado tanto ao Claude quanto ao Gemini.

## Setup local

```bash
npm install
npm run electron:dev
```

Na primeira abertura:

1. Clique em **Configurações** (canto superior direito).
2. Em **Conta Claude**, clique em "Conectar conta Claude" — um terminal externo abre com o CLI; faça `/login` e OAuth.
3. Em **Google Gemini API key**, cole sua chave (obtida em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

Pronto — escolha um modelo no topo, importe um `.docx` ou `.pdf`, clique em "Traduzir" e depois "Exportar tradução".

## Build local

```bash
npm run package:mac     # gera DMG arm64 + x64 em dist-builder/
npm run package:win     # gera NSIS instalador em dist-builder/
```

## Release automática (recomendado)

A cada push em `main`, o GitHub Actions:

1. Bumpa a versão patch em `package.json` (ex.: 1.0.5 → 1.0.6), commita e cria a tag `v1.0.6`.
2. Builda Windows (NSIS, x64) e Mac (DMG arm64+x64, ZIP arm64+x64).
3. Publica todos os artefatos + `latest.yml` (Win) + `latest-mac.yml` (Mac) na release do GitHub.
4. Apps instalados detectam a nova versão via `electron-updater` e oferecem atualizar.

> **Pré-requisito:** a `publish` do `package.json` aponta para `lucasbaziliocomercial-crypto/translate-automator` — ajuste se for outro repo ou owner.

### Trigger manual via tag

```bash
npm version patch        # cria commit + tag local
git push && git push --tags
```

## Como o destaque verde (MMC) funciona

O app analisa cabeçalhos `### ✦ Nome` no roteiro traduzido. Heurística:

- O nome com **mais ocorrências** é a FMC (heroína narradora principal).
- O nome com **menos ocorrências (mas ≥ 2)** é o MMC (POV masculino).
- Empate → sem destaque (preferimos falso-negativo a falso-positivo).

Os parágrafos sob `### ✦ <MMC>` recebem fundo verde Google Docs (`#d9ead3`) tanto no preview do app quanto no DOCX/PDF exportado.

## Limitações conhecidas

- **PDF preserva pior que DOCX.** PDFs não têm estrutura semântica garantida — a importação extrai texto best-effort, e a exportação cria um PDF novo a partir do markdown traduzido. **Recomendação:** use DOCX como fluxo principal.
- **Mac não-assinado.** Os builds não passam por code signing — usuários Mac vão precisar de "Botão direito → Abrir" na primeira execução para passar do Gatekeeper.
- **Custo.** Claude usa sua assinatura Max (sem cobrança extra por tradução). Gemini usa sua API key da Google AI Studio (gratuito até cota).

## Estrutura

```
electron/             # main process: IPC, Claude SDK, Gemini SDK, format I/O
  format/             # docx-import, docx-export, pdf-import, pdf-export, highlight-mmc
  providers/          # claude-provider, gemini-provider
src/                  # renderer (React + Vite)
  components/         # UI
  lib/                # translator-prompt.ts (10 regras), highlight-mmc, providers metadata
  store/              # zustand store
.github/workflows/    # release.yml (auto-bump + build Mac+Win + publish)
```

## Troubleshooting

- **"Bridge Electron não disponível"** — você está rodando só o Vite. Use `npm run electron:dev` para abrir o Electron.
- **Auto-update Mac não detecta** — confirme que `latest-mac.yml` está nos assets da release no GitHub. Se não, é o bug clássico de electron-builder com multi-arch; o workflow já contorna isso via `gh release upload`.
- **Logs:**
  - Windows: `%APPDATA%\Translate Automator\logs\main.log`
  - Mac: `~/Library/Logs/Translate Automator/main.log`
