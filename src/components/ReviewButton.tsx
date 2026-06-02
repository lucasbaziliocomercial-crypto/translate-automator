import { Wand2, Square, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { useTranslation, joinPartResults } from "@/store/translation";
import { useReview } from "@/store/review";
import {
  REVIEWER_OVERVIEW_SYSTEM_PROMPT,
  REVIEWER_OVERVIEW_USER_PROMPT_PREFIX,
} from "@/lib/reviewer-prompt";

function makeJobId(): string {
  return `review-ov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ReviewButton() {
  const partResults = useTranslation((s) => s.partResults);
  const modelId = useTranslation((s) => s.modelId);
  const isTranslating = useTranslation((s) => s.inProgressCount > 0);

  const isReviewing = useReview((s) => s.isReviewing);
  const startOverview = useReview((s) => s.startOverview);
  const finishOverview = useReview((s) => s.finishOverview);
  const setError = useReview((s) => s.setError);

  const result = joinPartResults(partResults);
  const disabled = result.trim().length === 0 || isTranslating;

  const handleClick = async () => {
    if (isReviewing) {
      const id = useReview.getState().overviewJobId;
      if (id) await window.translateAutomator.cancelReview(id);
      finishOverview();
      return;
    }
    if (disabled) return;

    const jobId = makeJobId();
    startOverview(jobId);
    const r = await window.translateAutomator.startReview({
      jobId,
      modelId,
      systemPrompt: REVIEWER_OVERVIEW_SYSTEM_PROMPT,
      userPrompt: REVIEWER_OVERVIEW_USER_PROMPT_PREFIX + result,
    });
    if (!r.ok) {
      setError(r.reason ?? "Falha ao iniciar o diagnóstico.");
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!isReviewing && disabled}
      variant={isReviewing ? "danger" : "outline"}
      size="lg"
      title={
        disabled && result.trim().length === 0
          ? "Traduza algo primeiro para revisar."
          : isTranslating
            ? "Aguarde a tradução terminar."
            : "Gera um diagnóstico (overview) do inglês. O roteiro revisado só é gerado se você quiser."
      }
    >
      {isReviewing ? (
        <>
          <Square className="size-5" />
          Cancelar
          <Loader2 className="size-4 animate-spin" />
        </>
      ) : (
        <>
          <Wand2 className="size-5" />
          Revisar (inglês nativo)
        </>
      )}
    </Button>
  );
}
