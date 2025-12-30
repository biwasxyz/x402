import { OpenRouter } from "@openrouter/sdk";

if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not set in .env");
  process.exit(1);
}

export const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
