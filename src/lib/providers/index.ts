export type ModelId = "claude-opus-4-7" | "gemini-3-pro";

export interface ModelOption {
  id: ModelId;
  label: string;
  description: string;
  provider: "claude" | "gemini";
}

export const MODELS: ModelOption[] = [
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    description: "Anthropic — qualidade máxima (via Claude Max)",
    provider: "claude",
  },
  {
    id: "gemini-3-pro",
    label: "Gemini 3 Pro (raciocínio)",
    description: "Google — modo thinking ligado",
    provider: "gemini",
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
