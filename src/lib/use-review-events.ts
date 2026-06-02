import { useEffect } from "react";
import { useReview } from "@/store/review";
import type { ReviewChunkEvent } from "../../electron/preload";

/**
 * Registra o listener de chunks da revisão uma única vez, num componente sempre
 * montado (App). Necessário porque o app troca para a aba Revisão durante o
 * streaming — se o listener morasse no ReviewButton (aba Tradução), ele seria
 * desmontado e os chunks se perderiam. Roteia por jobId entre as duas etapas.
 */
export function useReviewEvents(): void {
  useEffect(() => {
    const off = window.translateAutomator.onReviewChunk(
      (chunk: ReviewChunkEvent) => {
        const st = useReview.getState();
        if (chunk.jobId === st.overviewJobId) {
          if (chunk.type === "text" && chunk.text) st.appendOverview(chunk.text);
          else if (chunk.type === "done") st.finishOverview();
          else if (chunk.type === "error")
            st.setError(chunk.error ?? "Erro desconhecido no diagnóstico.");
        } else if (chunk.jobId === st.scriptJobId) {
          if (chunk.type === "text" && chunk.text) st.appendScript(chunk.text);
          else if (chunk.type === "done") st.finishScript();
          else if (chunk.type === "error")
            st.setError(chunk.error ?? "Erro ao gerar o roteiro revisado.");
        }
      },
    );
    return off;
  }, []);
}
