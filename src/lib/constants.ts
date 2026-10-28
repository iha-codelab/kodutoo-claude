export const MODELS = ["GPT-4", "Claude", "Local Llama"] as const;
export type ModelName = (typeof MODELS)[number];

export const DEFAULT_PROMPT_SLUG = "koolituste-noustaja";

export const LIMITS = {
  message: 2000,
  promptName: 60,
  promptContent: 4000,
  attachmentName: 255,
  title: 40,
} as const;

export const MOCK_REPLY_DELAY_MS = 1500;
