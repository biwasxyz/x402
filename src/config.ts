export type Network = "mainnet" | "testnet";

export interface EnvBindings {
  OPENROUTER_API_KEY?: string;
  NETWORK?: string;
  SERVER_ADDRESS?: string;
  FACILITATOR_URL?: string;
}

export interface RuntimeConfig {
  network: Network;
  serverAddress: string;
  facilitatorUrl: string;
  stacksApiUrl: string;
}

const DEFAULT_ADDRESS = "STZWXQNJWS9WT1409PABGQCT318VWXWZ6VK2C583";
const DEFAULT_FACILITATOR = "https://facilitator.x402stacks.xyz";

export function createRuntimeConfig(env: EnvBindings): RuntimeConfig {
  const network: Network = env.NETWORK === "mainnet" ? "mainnet" : "testnet";
  const serverAddress = env.SERVER_ADDRESS || DEFAULT_ADDRESS;
  const facilitatorUrl = env.FACILITATOR_URL || DEFAULT_FACILITATOR;
  const stacksApiUrl = network === "mainnet"
    ? "https://api.mainnet.hiro.so"
    : "https://api.testnet.hiro.so";

  return {
    network,
    serverAddress,
    facilitatorUrl,
    stacksApiUrl,
  };
}
