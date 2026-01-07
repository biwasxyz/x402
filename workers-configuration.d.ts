// Cloudflare Workers Environment Bindings for x402-stacks
interface Env {
  /** OpenRouter API key for AI services */
  OPENROUTER_API_KEY: string;
  /** Stacks address for receiving STX/sBTC payments (SP... or ST...) */
  SERVER_ADDRESS: string;
  /** Network: "mainnet" or "testnet" */
  NETWORK?: string;
  /** x402-stacks facilitator URL */
  FACILITATOR_URL?: string;
}
