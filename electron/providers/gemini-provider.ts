import { GoogleGenAI } from "@google/genai";
import log from "electron-log/main";

export interface GeminiStreamChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
  error?: string;
}

export async function* streamGeminiTranslation(args: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}): AsyncGenerator<GeminiStreamChunk> {
  const { apiKey, systemPrompt, userPrompt, signal } = args;

  if (!apiKey) {
    yield {
      type: "error",
      error:
        "Google API key não configurada. Abra ⚙ Configurações e cole sua GOOGLE_API_KEY.",
    };
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-pro",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget: -1 },
        temperature: 0.3,
      },
    });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        yield { type: "error", error: "Tradução cancelada." };
        return;
      }
      const text = chunk.text;
      if (typeof text === "string" && text.length > 0) {
        yield { type: "text", text };
      }
    }

    yield { type: "done" };
  } catch (err: any) {
    log.error("[gemini-provider] erro:", err);
    yield {
      type: "error",
      error: err?.message ?? String(err),
    };
  }
}
