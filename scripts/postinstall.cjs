#!/usr/bin/env node
/**
 * Pós-instalação multi-plataforma.
 *
 * macOS: Electron baixado pelo npm vem com signature ad-hoc, mas Macs com
 * Gatekeeper rigoroso (especialmente após Sonoma 14.4+) podem exigir
 * confirmação manual na primeira execução. Aqui re-assinamos o app ad-hoc
 * e removemos qualquer atributo `com.apple.quarantine` para que
 * `npm run electron:dev` rode sem prompt de segurança.
 *
 * Esse script é idempotente: pode rodar múltiplas vezes sem problema.
 * Falhas não bloqueiam o install — pior caso é o usuário ver o prompt
 * uma vez e o app abrir normalmente.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronApp = path.join(
  __dirname,
  "..",
  "node_modules",
  "electron",
  "dist",
  "Electron.app",
);

if (!fs.existsSync(electronApp)) {
  console.log(
    "[postinstall] Electron.app não encontrado em node_modules — pulando setup macOS",
  );
  process.exit(0);
}

console.log("[postinstall] Preparando Electron para macOS…");

const xattrResult = spawnSync(
  "xattr",
  ["-dr", "com.apple.quarantine", electronApp],
  { stdio: "ignore" },
);
if (xattrResult.status === 0) {
  console.log("  ✓ flag de quarentena removida");
}

const codesignResult = spawnSync(
  "codesign",
  ["--force", "--deep", "--sign", "-", electronApp],
  { stdio: "ignore" },
);
if (codesignResult.status === 0) {
  console.log("  ✓ Electron re-assinado ad-hoc");
  console.log("[postinstall] Pronto. Rode `npm run electron:dev` para abrir.");
} else {
  console.log(
    "  ⚠ codesign falhou — se o macOS bloquear o app na primeira execução,",
  );
  console.log(
    "    abra Configurações do Sistema → Privacidade e Segurança e clique em",
  );
  console.log('    "Permitir mesmo assim" para o Translate Automator.');
}
