import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useTranslation } from "@/store/translation";
import { useUpdater } from "@/store/updater";

const RELEASES_URL =
  "https://github.com/lucasbaziliocomercial-crypto/translate-automator/releases/latest";

export function StatusBar() {
  const errorMessage = useTranslation((s) => s.errorMessage);
  const setError = useTranslation((s) => s.setError);
  const updaterState = useUpdater((s) => s.state);

  const [claudeState, setClaudeState] = useState<
    "loading" | "missing" | "needs-login" | "ready"
  >("loading");
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    window.translateAutomator.getClaudeStatus().then((r) => {
      if (!r.installed) setClaudeState("missing");
      else if (!r.loggedIn) setClaudeState("needs-login");
      else setClaudeState("ready");
    });
    window.translateAutomator.getAppVersion().then(setAppVersion).catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
      {appVersion && (
        <span className="text-slate-500 dark:text-slate-500" title="Versão instalada">
          v{appVersion}
        </span>
      )}
      {claudeState === "ready" && (
        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Claude conectado
        </span>
      )}
      {claudeState === "needs-login" && (
        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3.5" />
          Claude CLI instalado — falta login
        </span>
      )}
      {claudeState === "missing" && (
        <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
          <AlertCircle className="size-3.5" />
          Claude CLI não instalado
        </span>
      )}

      {updaterState.kind === "downloading" && (
        <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Baixando v{updaterState.version}… {Math.round(updaterState.percent)}%
        </span>
      )}
      {updaterState.kind === "downloaded" && (
        <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          v{updaterState.version} pronta — reinicie para atualizar.
        </span>
      )}
      {updaterState.kind === "error" && (
        <span className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            title={updaterState.message}
          >
            <AlertCircle className="size-3.5" />
            Falha ao atualizar: {truncate(updaterState.message, 80)}
          </span>
          <button
            type="button"
            onClick={() => {
              window.translateAutomator
                .openExternalUrl(RELEASES_URL)
                .catch(() => {});
            }}
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700"
          >
            <Download className="size-3.5" />
            {updaterState.failedVersion
              ? `Baixar v${updaterState.failedVersion} manualmente`
              : "Baixar manualmente"}
          </button>
        </span>
      )}

      {errorMessage && (
        <span
          className="flex cursor-pointer items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
          onClick={() => setError(null)}
          title="Clique para descartar"
        >
          <AlertCircle className="size-3.5" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
