import { create } from "zustand";

export interface ReviewState {
  /** Diagnóstico (PT-BR) acumulado — etapa 1. */
  overview: string;
  appendOverview: (text: string) => void;
  /** Roteiro revisado (EN-US) acumulado — etapa 2. */
  script: string;
  appendScript: (text: string) => void;

  overviewJobId: string | null;
  scriptJobId: string | null;

  /** Etapa 1 (overview) em andamento. */
  isReviewing: boolean;
  /** Etapa 2 (roteiro revisado) em andamento. */
  isGeneratingScript: boolean;
  /** Overview concluído com sucesso → libera a decisão (aprovar / refazer). */
  overviewDone: boolean;
  /** Roteirista aprovou a tradução como está (sem precisar gerar revisão). */
  approved: boolean;
  approve: () => void;

  errorMessage: string | null;

  /** Etapa 1: zera tudo e marca o overview em andamento. */
  startOverview: (jobId: string) => void;
  finishOverview: () => void;
  /** Etapa 2: zera só o roteiro e marca a geração em andamento. */
  startScript: (jobId: string) => void;
  finishScript: () => void;

  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useReview = create<ReviewState>((set) => ({
  overview: "",
  appendOverview: (text) => set((s) => ({ overview: s.overview + text })),
  script: "",
  appendScript: (text) => set((s) => ({ script: s.script + text })),

  overviewJobId: null,
  scriptJobId: null,

  isReviewing: false,
  isGeneratingScript: false,
  overviewDone: false,
  approved: false,
  approve: () => set({ approved: true }),

  errorMessage: null,

  startOverview: (jobId) =>
    set({
      overview: "",
      script: "",
      overviewJobId: jobId,
      scriptJobId: null,
      isReviewing: true,
      isGeneratingScript: false,
      overviewDone: false,
      approved: false,
      errorMessage: null,
    }),
  finishOverview: () =>
    set({ overviewJobId: null, isReviewing: false, overviewDone: true }),

  startScript: (jobId) =>
    set({
      script: "",
      scriptJobId: jobId,
      isGeneratingScript: true,
      approved: false,
      errorMessage: null,
    }),
  finishScript: () => set({ scriptJobId: null, isGeneratingScript: false }),

  setError: (msg) =>
    set({
      errorMessage: msg,
      overviewJobId: null,
      scriptJobId: null,
      isReviewing: false,
      isGeneratingScript: false,
    }),
  reset: () =>
    set({
      overview: "",
      script: "",
      overviewJobId: null,
      scriptJobId: null,
      isReviewing: false,
      isGeneratingScript: false,
      overviewDone: false,
      approved: false,
      errorMessage: null,
    }),
}));
