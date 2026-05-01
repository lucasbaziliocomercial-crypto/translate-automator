import { create } from "zustand";
import type { ModelId } from "@/lib/providers";

export type FileFormat = "docx" | "pdf";

export interface TranslationState {
  source: string;
  setSource: (s: string) => void;

  /**
   * Tradução por parte. Quando o roteiro tem `PARTE 1`, `PARTE 2`, etc.,
   * cada parte é traduzida em paralelo e armazenada aqui sob seu número.
   * Quando o roteiro não tem cabeçalhos de parte, usamos a chave 1.
   */
  partResults: Record<number, string>;
  appendPartText: (partNum: number, text: string) => void;
  setPartText: (partNum: number, text: string) => void;
  resetResults: () => void;

  /**
   * Mapa jobId → partNum para roteamento de chunks de streaming.
   * Múltiplos jobs ativos = tradução em paralelo.
   */
  jobToPart: Record<string, number>;
  registerJob: (jobId: string, partNum: number) => void;
  unregisterJob: (jobId: string) => void;

  /** Quantos jobs estão em andamento agora. */
  inProgressCount: number;

  modelId: ModelId;
  setModelId: (m: ModelId) => void;

  sourceFormat: FileFormat | null;
  sourceName: string | null;
  setSourceFile: (args: { format: FileFormat; markdown: string; name: string }) => void;

  errorMessage: string | null;
  setError: (msg: string | null) => void;

  loadHistoryEntry: (entry: {
    source: string;
    partResults: Record<number, string>;
    sourceName: string | null;
    sourceFormat: FileFormat | null;
    modelId: string;
  }) => void;
}

export const useTranslation = create<TranslationState>((set) => ({
  source: "",
  setSource: (s) => set({ source: s }),

  partResults: {},
  appendPartText: (partNum, text) =>
    set((state) => ({
      partResults: {
        ...state.partResults,
        [partNum]: (state.partResults[partNum] ?? "") + text,
      },
    })),
  setPartText: (partNum, text) =>
    set((state) => ({
      partResults: { ...state.partResults, [partNum]: text },
    })),
  resetResults: () => set({ partResults: {}, errorMessage: null }),

  jobToPart: {},
  registerJob: (jobId, partNum) =>
    set((state) => ({
      jobToPart: { ...state.jobToPart, [jobId]: partNum },
      inProgressCount: state.inProgressCount + 1,
    })),
  unregisterJob: (jobId) =>
    set((state) => {
      if (!(jobId in state.jobToPart)) return state;
      const { [jobId]: _removed, ...rest } = state.jobToPart;
      return {
        jobToPart: rest,
        inProgressCount: Math.max(0, state.inProgressCount - 1),
      };
    }),

  inProgressCount: 0,

  modelId: "claude-opus-4-7",
  setModelId: (m) => set({ modelId: m }),

  sourceFormat: null,
  sourceName: null,
  setSourceFile: ({ format, markdown, name }) =>
    set({
      sourceFormat: format,
      source: markdown,
      sourceName: name,
      partResults: {},
      jobToPart: {},
      inProgressCount: 0,
      errorMessage: null,
    }),

  errorMessage: null,
  setError: (msg) =>
    set({ errorMessage: msg, jobToPart: {}, inProgressCount: 0 }),

  loadHistoryEntry: (entry) => {
    const allowedModel: ModelId =
      entry.modelId === "gemini-3-pro" ? "gemini-3-pro" : "claude-opus-4-7";
    set({
      source: entry.source,
      partResults: entry.partResults,
      sourceName: entry.sourceName,
      sourceFormat: entry.sourceFormat,
      modelId: allowedModel,
      jobToPart: {},
      inProgressCount: 0,
      errorMessage: null,
    });
  },
}));

export function joinPartResults(parts: Record<number, string>): string {
  const keys = Object.keys(parts)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  return keys
    .map((k) => parts[k])
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n")
    .trim();
}
