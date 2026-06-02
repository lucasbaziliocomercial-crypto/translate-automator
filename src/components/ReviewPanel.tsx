import { useMemo, useState } from "react";
import {
  Wand2,
  Copy,
  Check,
  Download,
  Loader2,
  Square,
  AlertCircle,
  FileCheck2,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";
import { useReview } from "@/store/review";
import { useTranslation, joinPartResults } from "@/store/translation";
import {
  REVIEWER_SCRIPT_SYSTEM_PROMPT,
  buildReviewScriptUserPrompt,
} from "@/lib/reviewer-prompt";
import { detectMaleLeadName } from "@/lib/highlight-mmc";
import { RichRenderer } from "@/lib/markdown-blocks";
import { markdownToRichHtml, markdownToPlainText } from "@/lib/format-html";
import { getPart, listAvailableParts } from "@/lib/parts";
import { useFindBar } from "@/lib/use-find-bar";
import { Button } from "./Button";
import { FindBar } from "./FindBar";

function makeJobId(): string {
  return `review-sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Dispara/cancela a etapa 2 (geração do roteiro revisado). Reaproveitado em 2 lugares. */
function useGenerateScript() {
  const partResults = useTranslation((s) => s.partResults);
  const modelId = useTranslation((s) => s.modelId);
  const overview = useReview((s) => s.overview);
  const isGeneratingScript = useReview((s) => s.isGeneratingScript);
  const startScript = useReview((s) => s.startScript);
  const finishScript = useReview((s) => s.finishScript);
  const setError = useReview((s) => s.setError);

  const generate = async () => {
    const original = joinPartResults(partResults);
    if (original.trim().length === 0) {
      setError("Sem tradução para revisar.");
      return;
    }
    const jobId = makeJobId();
    startScript(jobId);
    const r = await window.translateAutomator.startReview({
      jobId,
      modelId,
      systemPrompt: REVIEWER_SCRIPT_SYSTEM_PROMPT,
      userPrompt: buildReviewScriptUserPrompt(original, overview),
    });
    if (!r.ok) {
      setError(r.reason ?? "Falha ao gerar o roteiro revisado.");
    }
  };

  const cancel = async () => {
    const id = useReview.getState().scriptJobId;
    if (id) await window.translateAutomator.cancelReview(id);
    finishScript();
  };

  return { generate, cancel, isGeneratingScript };
}

export function ReviewPanel() {
  const overview = useReview((s) => s.overview);
  const script = useReview((s) => s.script);
  const isReviewing = useReview((s) => s.isReviewing);
  const isGeneratingScript = useReview((s) => s.isGeneratingScript);
  const overviewDone = useReview((s) => s.overviewDone);
  const approved = useReview((s) => s.approved);
  const errorMessage = useReview((s) => s.errorMessage);

  const maleLead = useMemo(() => detectMaleLeadName(script), [script]);
  const scriptFind = useFindBar(script);

  const hasScriptPhase = isGeneratingScript || script.trim().length > 0;
  const hasAnything = overview.trim().length > 0 || isReviewing;

  if (!hasAnything && !errorMessage) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-3">
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Enquanto não há fase de roteiro, o overview ocupa a tela toda para leitura. */}
      <OverviewCard
        overview={overview}
        isReviewing={isReviewing}
        grow={!hasScriptPhase}
      />

      {/* Gate de decisão: aparece após o diagnóstico, antes de gerar qualquer roteiro. */}
      {overviewDone && !isReviewing && !hasScriptPhase && (
        <DecisionBar approved={approved} />
      )}

      {hasScriptPhase && (
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Roteiro revisado (EN-US)
              </span>
              {maleLead && (
                <span className="rounded bg-mmcGreen px-2 py-0.5 text-xs text-emerald-900 dark:bg-mmcGreenDark dark:text-emerald-100">
                  MMC:{" "}
                  <span className="font-semibold capitalize">{maleLead}</span>
                </span>
              )}
              {isGeneratingScript && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  gerando…
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GenerateScriptButton />
              {script.trim().length > 0 && (
                <>
                  <PartCopyButtons script={script} maleLeadName={maleLead} />
                  <ExportReviewButton markdown={script} />
                </>
              )}
            </div>
          </div>

          <FindBar
            isOpen={scriptFind.isOpen}
            query={scriptFind.query}
            caseSensitive={scriptFind.caseSensitive}
            currentIndex={scriptFind.currentIndex}
            matchCount={scriptFind.matchCount}
            onQueryChange={scriptFind.setQuery}
            onToggleCaseSensitive={scriptFind.toggleCaseSensitive}
            onPrev={scriptFind.prev}
            onNext={scriptFind.next}
            onClose={scriptFind.close}
            placeholder="Pesquisar no roteiro revisado…"
          />

          {script.trim().length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Aplicando as correções do diagnóstico…
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-6 py-5">
              <RichRenderer
                markdown={script}
                options={{ showCursor: isGeneratingScript, maleLeadName: maleLead }}
                searchQuery={scriptFind.query}
                searchCaseSensitive={scriptFind.caseSensitive}
                currentMatchIndex={scriptFind.currentIndex}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverviewCard({
  overview,
  isReviewing,
  grow,
}: {
  overview: string;
  isReviewing: boolean;
  grow: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col rounded-xl border border-amber-200 bg-amber-50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 " +
        (grow ? "min-h-0 flex-1" : "max-h-[45%]")
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 px-3 py-2 dark:border-amber-900/50">
        <span className="flex items-center gap-1.5 text-sm font-medium text-amber-900 dark:text-amber-200">
          <Wand2 className="size-4" />
          Overview do revisor (para o roteirista)
          {isReviewing && (
            <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
          )}
        </span>
        <CopyTextButton label="Copiar overview" text={overview} />
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
        {overview.trim().length === 0 ? (
          <span className="text-xs text-amber-700/70 dark:text-amber-300/70">
            {isReviewing ? "Gerando diagnóstico…" : "Sem overview."}
          </span>
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{overview}</pre>
        )}
      </div>
    </div>
  );
}

function DecisionBar({ approved }: { approved: boolean }) {
  const approve = useReview((s) => s.approve);
  const { generate } = useGenerateScript();

  if (approved) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <ThumbsUp className="size-4" />
        Tradução aprovada — nenhuma revisão necessária.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Leu o diagnóstico? Decida o próximo passo:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => approve()} variant="outline" size="sm">
          <ThumbsUp className="size-4" />
          Aprovar (está bom)
        </Button>
        <Button onClick={() => generate()} variant="primary" size="sm">
          <RefreshCw className="size-4" />
          Refazer com as correções
        </Button>
      </div>
    </div>
  );
}

function GenerateScriptButton() {
  const { generate, cancel, isGeneratingScript } = useGenerateScript();
  const hasScript = useReview((s) => s.script.trim().length > 0);

  return (
    <Button
      onClick={() => (isGeneratingScript ? cancel() : generate())}
      variant={isGeneratingScript ? "danger" : "primary"}
      size="sm"
    >
      {isGeneratingScript ? (
        <>
          <Square className="size-3.5" />
          Cancelar
        </>
      ) : (
        <>
          <FileCheck2 className="size-3.5" />
          {hasScript ? "Gerar de novo" : "Gerar roteiro revisado"}
        </>
      )}
    </Button>
  );
}

function PartCopyButtons({
  script,
  maleLeadName,
}: {
  script: string;
  maleLeadName: string | null;
}) {
  // Sempre oferece Parte 1 e Parte 2 (+ extras presentes), como no ResultViewer.
  const partsToShow = useMemo(() => {
    const present = listAvailableParts(script);
    return Array.from(new Set<number>([1, 2, ...present])).sort((a, b) => a - b);
  }, [script]);

  return (
    <>
      {partsToShow.map((n) => (
        <PartCopyButton
          key={n}
          partNumber={n}
          script={script}
          maleLeadName={maleLeadName}
        />
      ))}
    </>
  );
}

function PartCopyButton({
  partNumber,
  script,
  maleLeadName,
}: {
  partNumber: number;
  script: string;
  maleLeadName: string | null;
}) {
  const setError = useReview((s) => s.setError);
  const [copied, setCopied] = useState(false);

  // Quando o roteiro não tem cabeçalhos de PARTE, tudo é a Parte 1.
  const present = listAvailableParts(script);
  const content =
    present.length === 0
      ? partNumber === 1
        ? script
        : null
      : getPart(script, partNumber);
  const disabled = !content || content.trim().length === 0;

  const handleClick = async () => {
    if (disabled || !content) return;
    const html = markdownToRichHtml(content, { maleLeadName });
    const text = markdownToPlainText(content);
    const r = await window.translateAutomator.writeClipboardHtml({ html, text });
    if (!r.ok) {
      setError(r.reason ?? "Falha ao copiar.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={copied ? "primary" : "outline"}
      size="sm"
      title={
        disabled
          ? `Parte ${partNumber} não existe no roteiro revisado.`
          : `Copia a Parte ${partNumber} revisada (cole no Google Docs).`
      }
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copiar Parte {partNumber}
        </>
      )}
    </Button>
  );
}

function CopyTextButton({ label, text }: { label: string; text: string }) {
  const setError = useReview((s) => s.setError);
  const [copied, setCopied] = useState(false);
  const disabled = text.trim().length === 0;

  const handleClick = async () => {
    if (disabled) return;
    const plain = markdownToPlainText(text);
    const r = await window.translateAutomator.writeClipboardHtml({
      html: plain,
      text: plain,
    });
    if (!r.ok) {
      setError(r.reason ?? "Falha ao copiar.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={copied ? "primary" : "outline"}
      size="sm"
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}

function ExportReviewButton({ markdown }: { markdown: string }) {
  const setError = useReview((s) => s.setError);
  const sourceFormat = useTranslation((s) => s.sourceFormat);
  const sourceName = useTranslation((s) => s.sourceName);
  const [busy, setBusy] = useState(false);
  const disabled = markdown.trim().length === 0 || busy;

  const handleClick = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      const r = await window.translateAutomator.exportFile({
        markdown,
        defaultFormat: sourceFormat ?? "docx",
        defaultName: (sourceName ?? "roteiro") + "-revisado",
      });
      if (r.canceled) return;
      if (!r.ok) {
        setError(r.reason ?? "Falha ao exportar.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled} variant="primary" size="sm">
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      Exportar revisão
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-amber-50 p-3 dark:bg-amber-950/40">
        <Wand2 className="size-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          A revisão aparecerá aqui
        </p>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Traduza um roteiro e clique em{" "}
          <span className="font-medium">Revisar (inglês nativo)</span> na aba
          Tradução. Primeiro sai o overview para o roteirista; você lê e decide
          aprovar ou refazer com as correções.
        </p>
      </div>
    </div>
  );
}
