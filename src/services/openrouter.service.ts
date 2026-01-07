import { OpenRouter } from "@openrouter/sdk";

let client: OpenRouter | null = null;
let currentApiKey: string | null = null;

export function initOpenRouter(apiKey?: string) {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!client || currentApiKey !== apiKey) {
    client = new OpenRouter({ apiKey });
    currentApiKey = apiKey;
  }

  return client;
}

export function getOpenRouter() {
  if (!client) {
    throw new Error("OpenRouter client has not been initialized");
  }

  return client;
}
