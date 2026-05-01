import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/store/translation";

export function StatusBar() {
  const errorMessage = useTranslation((s) => s.errorMessage);
  const setError = useTranslation((s) => s.setError);

  const [claudeState, setClaudeState] = useState<
    "loading" | "missing" | "needs-login" | "ready"
  >("loading");
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);

  useEffect(() => {
    window.translateAutomator.getClaudeStatus().then((r) => {
      if (!r.installed) setClaudeState("missing");
      else if (!r.loggedIn) setClaudeState("needs-login");
      else setClaudeState("ready");
    });
    const off = window.translateAutomator.onUpdateAvailable((info) => {
      setUpdateInfo(`v${info.version} disponível — reinicie para atualizar.`);
    });
    return off;
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      {claudeState === "ready" && (
        <span className="flex items-center gap-1 text-emerald-700">
          <CheckCircle2 className="size-3.5" />
          Claude conectado
        </span>
      )}
      {claudeState === "needs-login" && (
        <span className="flex items-center gap-1 text-amber-700">
          <AlertCircle className="size-3.5" />
          Claude CLI instalado — falta login
        </span>
      )}
      {claudeState === "missing" && (
        <span className="flex items-center gap-1 text-rose-700">
          <AlertCircle className="size-3.5" />
          Claude CLI não instalado
        </span>
      )}
      {updateInfo && (
        <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
          {updateInfo}
        </span>
      )}
      {errorMessage && (
        <span
          className="flex cursor-pointer items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-rose-800"
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
