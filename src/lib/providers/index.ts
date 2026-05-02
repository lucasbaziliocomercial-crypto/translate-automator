export type ModelId = "claude-opus-4-7";

export interface ModelOption {
  id: ModelId;
  label: string;
  description: string;
  provider: "claude";
}

export const MODELS: ModelOption[] = [
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    description: "Anthropic — qualidade máxima (via Claude Max)",
    provider: "claude",
  },
];

export interface TranslateRequest {
  modelId: ModelId;
  systemPrompt: string;
  userPrompt: string;
}

export interface TranslateChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
  error?: string;
}
