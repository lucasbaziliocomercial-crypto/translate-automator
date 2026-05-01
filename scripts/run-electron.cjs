#!/usr/bin/env node
// Wrapper que SEMPRE roda o Electron como app GUI (não como Node).
// O ambiente do shell pode ter ELECTRON_RUN_AS_NODE=1 setado (ex.: dentro
// do Claude Code), o que faz o Electron rodar como Node puro e quebra
// `require('electron')`. Aqui removemos a var antes de spawnar.

const { spawn } = require("child_process");
const path = require("path");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = env.NODE_ENV || "development";

const electronBin = require("electron");
const child = spawn(electronBin, ["."].concat(process.argv.slice(2)), {
  stdio: "inherit",
  env,
  cwd: path.resolve(__dirname, ".."),
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
child.on("error", (err) => {
  console.error("[run-electron] spawn error:", err);
  process.exit(1);
});
