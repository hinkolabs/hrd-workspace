import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Well-known Claude model tiers. Actual model id is resolved via env var overrides. */
export const CLAUDE_MODELS = {
  sonnet: process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-5",
  opus: process.env.CLAUDE_OPUS_MODEL ?? "claude-opus-4-5",
  haiku: process.env.CLAUDE_HAIKU_MODEL ?? "claude-haiku-4-5",
} as const;

export type ClaudeTier = keyof typeof CLAUDE_MODELS;

/** Default tier when none specified. Sonnet balances speed and quality. */
export const CLAUDE_DEFAULT_TIER: ClaudeTier = "sonnet";

export const CLAUDE_MODEL_DEFAULT = CLAUDE_MODELS[CLAUDE_DEFAULT_TIER];

export function resolveClaudeModel(tierOrModel?: string): string {
  if (!tierOrModel) return CLAUDE_MODEL_DEFAULT;
  if (tierOrModel in CLAUDE_MODELS) return CLAUDE_MODELS[tierOrModel as ClaudeTier];
  return tierOrModel;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
