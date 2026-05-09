# Translate Automator

App desktop (Mac + Windows) para traduzir roteiros do **PT-BR para EN-US** preservando a formatação do arquivo original e destacando o POV masculino (MMC) em verde.

- **Modelo:** Claude Opus 4.7 (via assinatura Claude Max).
- **Formatos:** DOCX e PDF (import e export).
- **Auto-update:** cada `git push` em `main` gera nova versão automaticamente para Mac e Windows.
- **Persona:** o tradutor segue à risca o prompt "AGENTE TRADUTOR IMPECÁVEL" (10 regras).

## Setup local

```bash
git clone https://github.com/lucasbaziliocomercial-crypto/translate-automator.git
cd translate-automator
npm install
npm run electron:dev
```

> **macOS:** o `npm install` roda automaticamente o script `scripts/postinstall.cjs`, que re-assina o Electron baixado com signature ad-hoc e remove a flag de quarentena. Isso evita que o Gatekeeper peça confirmação na primeira execução. Se mesmo assim o sistema bloquear, abra **Configurações do Sistema → Privacidade e Segurança** e clique em "Permitir mesmo assim".

Na primeira abertura:

1. Clique em **Configurações** (canto superior direito).
2. Em **Conta Claude**, clique em "Conectar conta Claude" — um terminal externo abre com o CLI; faça `/login` e OAuth.

Pronto — importe um `.docx` ou `.pdf`, clique em "Traduzir" e depois "Exportar tradução".

## Build local

```bash
npm run package:mac     # gera DMG arm64 + x64 em dist-builder/
npm run package:win     # gera NSIS instalador em dist-builder/
```

### macOS: liberando o `.app` instalado pelo `.dmg` ou `.zip`

Como os builds Mac não são assinados com Apple Developer ID ($99/ano), usuários que baixarem o `.dmg` ou `.zip` de uma release do GitHub vão ver "está danificado e não pode ser aberto" ao abrir o app. **Não é dano** — é o Gatekeeper bloqueando porque o app não tem assinatura Apple.

A solução é remover a flag de quarentena via Terminal:

```bash
xattr -cr "/Applications/Translate Automator.app"
```

> ⚠️ A rota de **Configurações → Privacidade e Segurança → "Abrir mesmo assim"** **não funciona** quando a mensagem do macOS é "está danificado" (versões recentes do macOS — Sonoma+). Esse caminho só ajuda quando aparece "developer cannot be verified". Pra "danificado", **só** o `xattr -cr` resolve.

Atualizações **automáticas** disparadas pelo `electron-updater` (in-app) não passam pelo Gatekeeper — o aviso só aparece em downloads **manuais** via browser. Por isso esse comando só precisa ser rodado uma vez por instalação manual.

📄 Pra entregar ao usuário final (não-dev), passe o link para **[INSTALL-MAC.md](INSTALL-MAC.md)** — tem o passo a passo com Spotlight, instalação no Applications, troubleshooting de DMGs múltiplos montados, etc.

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
- **Mac não-assinado.** Os builds não passam por code signing. Usuários Mac que baixarem o `.dmg` manualmente vão ver "está danificado" e precisam rodar `xattr -cr` no Terminal — ver **[INSTALL-MAC.md](INSTALL-MAC.md)**. Atualizações automáticas in-app não têm esse problema.
- **Custo.** Claude usa sua assinatura Max (sem cobrança extra por tradução).

## Estrutura

```
electron/             # main process: IPC, Claude SDK, format I/O
  format/             # docx-import, docx-export, pdf-import, pdf-export, highlight-mmc
  providers/          # claude-provider
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
