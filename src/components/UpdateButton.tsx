import { useEffect, useRef, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Button } from "./Button";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string }
  | { kind: "downloading"; percent: number; version?: string }
  | { kind: "downloaded"; version: string }
  | { kind: "error"; message: string }
  | { kind: "dev-disabled" };

export function UpdateButton() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const upToDateTimeout = useRef<number | null>(null);

  useEffect(() => {
    const offs = [
      window.translateAutomator.onUpdateAvailable(({ version }) => {
        setStatus({ kind: "available", version });
      }),
      window.translateAutomator.onUpdateNotAvailable(() => {
        setStatus({ kind: "up-to-date" });
        if (upToDateTimeout.current) {
          window.clearTimeout(upToDateTimeout.current);
        }
        upToDateTimeout.current = window.setTimeout(() => {
          setStatus({ kind: "idle" });
          upToDateTimeout.current = null;
        }, 3000);
      }),
      window.translateAutomator.onUpdateDownloadProgress(({ percent }) => {
        setStatus((prev) => ({
          kind: "downloading",
          percent,
          version: prev.kind === "available" || prev.kind === "downloading"
            ? prev.version
            : undefined,
        }));
      }),
      window.translateAutomator.onUpdateDownloaded(({ version }) => {
        setStatus({ kind: "downloaded", version });
      }),
      window.translateAutomator.onUpdateError(({ message }) => {
        setStatus({ kind: "error", message });
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      if (upToDateTimeout.current) {
        window.clearTimeout(upToDateTimeout.current);
      }
    };
  }, []);

  const handleClick = async () => {
    if (status.kind === "downloaded") {
      await window.translateAutomator.quitAndInstall();
      return;
    }
    if (
      status.kind === "checking" ||
      status.kind === "available" ||
      status.kind === "downloading" ||
      status.kind === "dev-disabled"
    ) {
      return;
    }
    setStatus({ kind: "checking" });
    const r = await window.translateAutomator.checkForUpdates();
    if (!r.ok) {
      if (r.reason === "dev-mode") {
        setStatus({ kind: "dev-disabled" });
        return;
      }
      setStatus({ kind: "error", message: r.reason ?? "Falha ao verificar" });
      return;
    }
    // Se ok mas nenhum evento chegou ainda, fica em "checking" até evento
    // update-available ou update-not-available disparar.
  };

  if (status.kind === "downloaded") {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleClick}
        title={`Reiniciar para instalar v${status.version}`}
        aria-label={`Reiniciar para instalar v${status.version}`}
      >
        <Download className="size-4" />
        <span>Reiniciar para atualizar</span>
      </Button>
    );
  }

  if (status.kind === "downloading") {
    const pct = Math.max(0, Math.min(100, Math.round(status.percent)));
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title={`Baixando atualização — ${pct}%`}
        aria-label={`Baixando atualização — ${pct}%`}
      >
        <RefreshCw className="size-4 animate-spin" />
        <span>Baixando {pct}%</span>
      </Button>
    );
  }

  if (status.kind === "available") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title={`v${status.version} disponível — baixando…`}
        aria-label={`v${status.version} disponível — baixando`}
      >
        <RefreshCw className="size-4 animate-spin" />
        <span>Baixando…</span>
      </Button>
    );
  }

  if (status.kind === "checking") {
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

  if (status.kind === "up-to-date") {
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

  if (status.kind === "error") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        title={`Erro ao atualizar: ${status.message} — clique para tentar de novo`}
        aria-label="Erro ao verificar atualizações"
        className="text-amber-700 dark:text-amber-400"
      >
        <AlertCircle className="size-4" />
      </Button>
    );
  }

  if (status.kind === "dev-disabled") {
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
