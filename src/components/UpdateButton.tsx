import { useEffect, useRef } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Button } from "./Button";
import { useUpdater } from "@/store/updater";

export function UpdateButton() {
  const state = useUpdater((s) => s.state);
  const setChecking = useUpdater((s) => s.setChecking);
  const setError = useUpdater((s) => s.setError);
  const setDevDisabled = useUpdater((s) => s.setDevDisabled);
  const setIdle = useUpdater((s) => s.setIdle);
  const upToDateTimeout = useRef<number | null>(null);

  // Após mostrar "atualizado" por 3s, volta pra idle pra não poluir o header.
  useEffect(() => {
    if (state.kind !== "up-to-date") {
      if (upToDateTimeout.current) {
        window.clearTimeout(upToDateTimeout.current);
        upToDateTimeout.current = null;
      }
      return;
    }
    upToDateTimeout.current = window.setTimeout(() => {
      setIdle();
      upToDateTimeout.current = null;
    }, 3000);
    return () => {
      if (upToDateTimeout.current) {
        window.clearTimeout(upToDateTimeout.current);
        upToDateTimeout.current = null;
      }
    };
  }, [state.kind, setIdle]);

  const handleClick = async () => {
    if (state.kind === "downloaded") {
      await window.translateAutomator.quitAndInstall();
      return;
    }
    if (
      state.kind === "checking" ||
      state.kind === "downloading" ||
      state.kind === "dev-disabled"
    ) {
      return;
    }
    setChecking();
    const r = await window.translateAutomator.checkForUpdates();
    if (!r.ok) {
      if (r.reason === "dev-mode") {
        setDevDisabled();
        return;
      }
      setError(r.reason ?? "Falha ao verificar");
    }
    // Se ok, eventos do updater vão atualizar a store via useUpdaterEvents.
  };

  if (state.kind === "downloaded") {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleClick}
        title={`Reiniciar para instalar v${state.version}`}
        aria-label={`Reiniciar para instalar v${state.version}`}
      >
        <Download className="size-4" />
        <span>Reiniciar para atualizar</span>
      </Button>
    );
  }

  if (state.kind === "downloading") {
    const pct = Math.max(0, Math.min(100, Math.round(state.percent)));
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title={`Baixando v${state.version} — ${pct}%`}
        aria-label={`Baixando v${state.version} — ${pct}%`}
      >
        <RefreshCw className="size-4 animate-spin" />
      </Button>
    );
  }

  if (state.kind === "checking") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Verificando atualizações…"
        aria-label="Verificando atualizações"
      >
        <RefreshCw className="size-4 animate-spin" />
      </Button>
    );
  }

  if (state.kind === "up-to-date") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        title="Você está na versão mais recente"
        aria-label="Versão atualizada"
        className="text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="size-4" />
      </Button>
    );
  }

  if (state.kind === "error") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        title={`Erro ao atualizar: ${state.message} — clique para tentar de novo`}
        aria-label="Erro ao verificar atualizações"
        className="text-amber-700 dark:text-amber-400"
      >
        <AlertCircle className="size-4" />
      </Button>
    );
  }

  if (state.kind === "dev-disabled") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Auto-update indisponível em modo de desenvolvimento"
        aria-label="Atualizações indisponíveis em dev"
        className="opacity-60"
      >
        <RefreshCw className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title="Verificar atualizações"
      aria-label="Verificar atualizações"
    >
      <RefreshCw className="size-4" />
    </Button>
  );
}
