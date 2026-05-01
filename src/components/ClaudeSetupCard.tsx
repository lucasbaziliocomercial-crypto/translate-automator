import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { Button } from "./Button";

type Status =
  | { kind: "loading" }
  | { kind: "no-bridge" }
  | { kind: "needs-install" }
  | { kind: "needs-setup"; version?: string }
  | { kind: "opening-terminal"; nextStep: "install" | "login" }
  | { kind: "waiting-install" }
  | { kind: "waiting-login" }
  | { kind: "connected"; version?: string }
  | { kind: "error"; message: string };

export function ClaudeSetupCard() {
  const [state, setState] = useState<Status>({ kind: "loading" });

  const refresh = async () => {
    if (typeof window === "undefined" || !window.translateAutomator) {
      setState({ kind: "no-bridge" });
      return;
    }
    try {
      const r = await window.translateAutomator.getClaudeStatus();
      if (!r.installed) {
        setState({ kind: "needs-install" });
        return;
      }
      if (r.loggedIn) {
        setState({ kind: "connected", version: r.version });
        return;
      }
      setState({ kind: "needs-setup", version: r.version });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? String(e) });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleInstall = async () => {
    setState({ kind: "opening-terminal", nextStep: "install" });
    const r = await window.translateAutomator.installClaude();
    if (!r.ok) {
      setState({ kind: "error", message: r.reason ?? "Falha ao abrir terminal." });
      return;
    }
    setState({ kind: "waiting-install" });
  };

  const handleLogin = async () => {
    setState({ kind: "opening-terminal", nextStep: "login" });
    const r = await window.translateAutomator.setupClaude();
    if (!r.ok) {
      setState({ kind: "error", message: r.reason ?? "Falha ao abrir terminal." });
      return;
    }
    setState({ kind: "waiting-login" });
  };

  const handleSwitch = async () => {
    if (!window.confirm("Trocar de conta Claude? Isso vai deslogar a conta atual.")) return;
    setState({ kind: "opening-terminal", nextStep: "login" });
    const out = await window.translateAutomator.logoutClaude();
    if (!out.ok) {
      setState({ kind: "error", message: out.reason ?? "Falha ao deslogar." });
      return;
    }
    const setup = await window.translateAutomator.setupClaude();
    if (!setup.ok) {
      setState({ kind: "error", message: setup.reason ?? "Falha ao abrir terminal." });
      return;
    }
    setState({ kind: "waiting-login" });
  };

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <Loader2 className="size-4 animate-spin" />
        Verificando status do Claude...
      </div>
    );
  }

  if (state.kind === "no-bridge") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Bridge Electron não disponível (rodando no navegador?).
      </div>
    );
  }

  if (state.kind === "connected") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <div className="flex flex-1 items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <div>
            Conta Claude conectada — pronto para traduzir com Opus 4.7.
            {state.version && (
              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs">
                {state.version}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSwitch}>
          <LogOut className="size-3.5" />
          Trocar de conta
        </Button>
      </div>
    );
  }

  if (state.kind === "needs-install") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
        <div className="mb-2 flex items-center gap-2 text-amber-900">
          <Terminal className="size-4" />
          Claude CLI não está instalado neste computador.
        </div>
        <p className="mb-3 text-xs text-amber-800">
          Vou abrir um terminal e rodar{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
            npm install -g @anthropic-ai/claude-code
          </code>
          . Requer Node.js previamente instalado em{" "}
          <a
            href="https://nodejs.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            nodejs.org
          </a>
          .
        </p>
        <Button variant="primary" size="sm" onClick={handleInstall}>
          <Download className="size-3.5" />
          Instalar Claude CLI
        </Button>
      </div>
    );
  }

  if (state.kind === "needs-setup") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
        <div className="mb-2 flex items-center gap-2 text-slate-700">
          <ShieldAlert className="size-4" />
          Claude CLI instalado{state.version && ` (${state.version})`}, mas sem login.
        </div>
        <p className="mb-3 text-xs text-slate-600">
          Para usar Opus 4.7 sem cobrança de API, conecte sua assinatura Claude Max.
          Vou abrir um terminal externo com o CLI.
        </p>
        <Button variant="primary" size="sm" onClick={handleLogin}>
          <ExternalLink className="size-3.5" />
          Conectar conta Claude
        </Button>
      </div>
    );
  }

  if (state.kind === "opening-terminal") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <Loader2 className="size-4 animate-spin" />
        Abrindo terminal...
      </div>
    );
  }

  if (state.kind === "waiting-install") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
        <div className="mb-2 font-medium">Aguardando instalação no terminal</div>
        <ol className="mb-3 list-inside list-decimal space-y-1 text-xs">
          <li>O terminal aberto vai rodar <span className="font-mono">npm install -g @anthropic-ai/claude-code</span>.</li>
          <li>Pode demorar 1-2 minutos. Se pedir senha de admin (Mac), digite e dê Enter.</li>
          <li>Quando aparecer "claude --version", a instalação concluiu.</li>
          <li>Feche a janela do terminal e clique em "Verificar" abaixo.</li>
        </ol>
        <Button variant="primary" size="sm" onClick={refresh}>
          <RefreshCw className="size-3.5" />
          Verificar instalação
        </Button>
      </div>
    );
  }

  if (state.kind === "waiting-login") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
        <div className="mb-2 font-medium">Aguardando login no terminal</div>
        <ol className="mb-3 list-inside list-decimal space-y-1 text-xs">
          <li>No terminal aberto, digite <span className="font-mono">/login</span> e dê Enter.</li>
          <li>Faça o OAuth no navegador.</li>
          <li>Volte ao terminal, digite <span className="font-mono">/quit</span>, feche a janela.</li>
          <li>Clique em "Verificar" abaixo.</li>
        </ol>
        <Button variant="primary" size="sm" onClick={refresh}>
          <RefreshCw className="size-3.5" />
          Já loguei — verificar
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      <div className="mb-2">Erro: {state.message}</div>
      <Button variant="outline" size="sm" onClick={refresh}>
        <RefreshCw className="size-3.5" />
        Tentar novamente
      </Button>
    </div>
  );
}
