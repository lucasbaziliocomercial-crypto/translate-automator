import log from "electron-log/main";

export interface ClaudeStreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  error?: string;
}

export async function* streamClaudeTranslation(args: {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}): AsyncGenerator<ClaudeStreamChunk> {
  const { systemPrompt, userPrompt, signal } = args;

  try {
    // Dynamic import: @anthropic-ai/claude-agent-sdk is ESM-only. We use a
    // Function-constructor wrapper because TypeScript with module=CommonJS
    // rewrites `await import(...)` into `Promise.resolve().then(() => require(...))`,
    // which fails for ESM-only packages with ERR_REQUIRE_ESM. The Function
    // constructor preserves a real native dynamic import.
    const dynamicImport = new Function("p", "return import(p)") as (
      p: string,
    ) => Promise<typeof import("@anthropic-ai/claude-agent-sdk")>;
    const sdk = await dynamicImport("@anthropic-ai/claude-agent-sdk");
    const { query } = sdk;

    const response = query({
      prompt: userPrompt,
      options: {
        model: "claude-opus-4-7",
        systemPrompt: { type: "preset", preset: "claude_code", append: systemPrompt },
        permissionMode: "bypassPermissions",
        includePartialMessages: true,
        abortController: signal ? attachSignal(signal) : undefined,
      },
    });

    for await (const message of response as AsyncIterable<any>) {
      if (signal?.aborted) {
        yield { type: "error", error: "Tradução cancelada." };
        return;
      }

      if (message.type === "stream_event" && message.event.type === "content_block_delta") {
        const delta = message.event.delta;
        if (delta.type === "text_delta") {
          yield { type: "text", text: delta.text };
        }
      } else if (message.type === "assistant") {
        // No fallback path: when partial messages are not delivered, emit final text once.
        // (The SDK delivers stream_events when includePartialMessages is true, so this is a safety net.)
      } else if (message.type === "result") {
        yield { type: "done" };
        return;
      }
    }

    yield { type: "done" };
  } catch (err: any) {
    log.error("[claude-provider] erro:", err);
    yield {
      type: "error",
      error: err?.message ?? String(err),
    };
  }
}

function attachSignal(signal: AbortSignal): AbortController {
  const ctrl = new AbortController();
  if (signal.aborted) ctrl.abort();
  else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  return ctrl;
}
