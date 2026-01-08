import { Network } from "./types";

export interface EnvBindings {
  OPENROUTER_API_KEY?: string;
  SERVER_ADDRESS?: string;
  NETWORK?: string;
  FACILITATOR_URL?: string;
  CLOUDFLARE_API_TOKEN?: string;
  ANALYTICS?: KVNamespace;
}

export interface RuntimeConfig {
  serverAddress: string;
  network: Network;
  facilitatorUrl: string;
  stacksApiUrl: string;
}

const DEFAULT_FACILITATOR = "https://facilitator.x402stacks.xyz";

export function createRuntimeConfig(env: EnvBindings): RuntimeConfig {
  if (!env.SERVER_ADDRESS) {
    throw new Error("SERVER_ADDRESS environment variable is required");
  }

  const network: Network = env.NETWORK === "mainnet" ? "mainnet" : "testnet";
  const stacksApiUrl = network === "mainnet"
    ? "https://api.mainnet.hiro.so"
    : "https://api.testnet.hiro.so";

  return {
    serverAddress: env.SERVER_ADDRESS,
    network,
    facilitatorUrl: env.FACILITATOR_URL || DEFAULT_FACILITATOR,
    stacksApiUrl,
  };
}
