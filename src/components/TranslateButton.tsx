import { Play, Square, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./Button";
import { useTranslation } from "@/store/translation";
import {
  TRANSLATOR_SYSTEM_PROMPT,
  TRANSLATOR_USER_PROMPT_PREFIX,
} from "@/lib/translator-prompt";
import { splitByParts } from "@/lib/parts";
import type { TranslateChunkEvent } from "../../electron/preload";

function makeJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TranslateButton() {
  const source = useTranslation((s) => s.source);
  const modelId = useTranslation((s) => s.modelId);
  const inProgressCount = useTranslation((s) => s.inProgressCount);
  const registerJob = useTranslation((s) => s.registerJob);
  const unregisterJob = useTranslation((s) => s.unregisterJob);
  const appendPartText = useTranslation((s) => s.appendPartText);
  const resetResults = useTranslation((s) => s.resetResults);
  const setError = useTranslation((s) => s.setError);

  const isTranslating = inProgressCount > 0;

  // Listener global de chunks — usa getState() para sempre ler o jobToPart atual.
  useEffect(() => {
    const off = window.translateAutomator.onTranslateChunk(
      (chunk: TranslateChunkEvent) => {
        const partNum = useTranslation.getState().jobToPart[chunk.jobId];
        if (partNum === undefined) return;
        if (chunk.type === "text" && chunk.text) {
          appendPartText(partNum, chunk.text);
        } else if (chunk.type === "done") {
          unregisterJob(chunk.jobId);
        } else if (chunk.type === "error") {
          setError(chunk.error ?? "Erro desconhecido na tradução.");
          unregisterJob(chunk.jobId);
        }
      },
    );
    return off;
  }, [appendPartText, unregisterJob, setError]);

  const disabled = source.trim().length === 0;

  const handleClick = async () => {
    if (isTranslating) {
      // Cancela todos os jobs em andamento
      const jobs = Object.keys(useTranslation.getState().jobToPart);
      await Promise.all(
        jobs.map((id) => window.translateAutomator.cancelTranslation(id)),
      );
      return;
    }
    if (disabled) return;

    resetResults();

    const { parts } = splitByParts(source);
    const tasks: Array<{ partNum: number; text: string }> = [];

    if (parts.size === 0) {
      tasks.push({ partNum: 1, text: source });
    } else {
      for (const [num, text] of parts.entries()) {
        tasks.push({ partNum: num, text });
      }
    }

    // Dispara todos os jobs em paralelo. O streaming chega via listener acima.
    await Promise.all(
      tasks.map(async ({ partNum, text }) => {
        const jobId = makeJobId();
        registerJob(jobId, partNum);
        const r = await window.translateAutomator.startTranslation({
          jobId,
          modelId,
          systemPrompt: TRANSLATOR_SYSTEM_PROMPT,
          userPrompt: TRANSLATOR_USER_PROMPT_PREFIX + text,
        });
        if (!r.ok) {
          setError(r.reason ?? "Falha ao iniciar tradução.");
          unregisterJob(jobId);
        }
      }),
    );
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!isTranslating && disabled}
      variant={isTranslating ? "danger" : "primary"}
      size="lg"
    >
      {isTranslating ? (
        <>
          <Square className="size-5" />
          Cancelar
          <Loader2 className="size-4 animate-spin" />
          <span className="text-xs opacity-80">
            ({inProgressCount} parte{inProgressCount === 1 ? "" : "s"} em paralelo)
          </span>
        </>
      ) : (
        <>
          <Play className="size-5" />
          Traduzir
        </>
      )}
    </Button>
  );
}
