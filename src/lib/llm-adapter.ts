/**
 * LLM Adapter — unifies OpenAI and Anthropic chat APIs behind a common interface.
 *
 * Strategy:
 *   - If ANTHROPIC_API_KEY is set and caller requests "claude", use Anthropic.
 *   - Otherwise fall back to OpenAI gpt-4o.
 *   - Always returns the text content as a string.
 *
 * Provider selection is controlled via env:
 *   PPT_LLM_PROVIDER=claude|openai   (default: claude when ANTHROPIC_API_KEY exists)
 *   PPT_LLM_MODEL=claude-sonnet-4-5  (override model id)
 */
import { openai } from "./openai";
import { anthropic, resolveClaudeModel, isAnthropicConfigured } from "./anthropic";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatOptions {
  messages: ChatMessage[];
  /** Which provider to use. "auto" picks Claude if available, else OpenAI. */
  provider?: "auto" | "claude" | "openai";
  /** Explicit model id override. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  provider: "claude" | "openai";
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export function pickProvider(requested?: "auto" | "claude" | "openai"): "claude" | "openai" {
  const envProvider = process.env.PPT_LLM_PROVIDER?.toLowerCase();
  if (requested && requested !== "auto") return requested;
  if (envProvider === "openai") return "openai";
  if (envProvider === "claude" && isAnthropicConfigured()) return "claude";
  return isAnthropicConfigured() ? "claude" : "openai";
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const provider = pickProvider(opts.provider);

  // ── Claude (Anthropic) ─────────────────────────────────────────────────
  if (provider === "claude") {
    // opts.model can be a tier alias ("sonnet"/"opus"/"haiku") or a raw model id
    const model = resolveClaudeModel(opts.model ?? process.env.PPT_LLM_MODEL);

    // Anthropic separates system prompt from messages
    const systemParts: string[] = [];
    const dialog: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const m of opts.messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
      } else {
        dialog.push({ role: m.role, content: m.content });
      }
    }

    const res = await anthropic.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 16384,
      temperature: opts.temperature ?? 0.4,
      system: systemParts.join("\n\n") || undefined,
      messages: dialog.length > 0 ? dialog : [{ role: "user", content: "" }],
    });

    // Extract text from content blocks
    const text = res.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return {
      text,
      provider: "claude",
      model,
      usage: {
        inputTokens: res.usage?.input_tokens,
        outputTokens: res.usage?.output_tokens,
      },
    };
  }

  // ── OpenAI (GPT-4o) ────────────────────────────────────────────────────
  const model = opts.model ?? "gpt-4o";
  const res = await openai.chat.completions.create({
    model,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4096,
  });

  return {
    text: res.choices[0]?.message?.content ?? "",
    provider: "openai",
    model,
    usage: {
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
    },
  };
}

/** Convenience helper: strip markdown fences from JSON responses */
export function stripJsonFences(s: string): string {
  return s.replace(/^```[\w]*\n?/m, "").replace(/```\s*$/m, "").trim();
}
