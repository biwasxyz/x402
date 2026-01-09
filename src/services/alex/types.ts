// Alex Lab API types

export interface AlexPool {
  pool_id: string;
  token_x: string;
  token_y: string;
  token_x_symbol: string;
  token_y_symbol: string;
  balance_x: string;
  balance_y: string;
  total_supply: string;
  fee_rate: number;
  fee_rebate: number;
  tvl_usd: number;
  volume_24h_usd: number;
  price_token_x_usd: number;
  price_token_y_usd: number;
}

export interface AlexToken {
  contract_id: string;
  symbol: string;
  name: string;
  decimals: number;
  price_usd: number;
  price_change_24h: number;
  volume_24h_usd: number;
  market_cap_usd: number;
}

export interface AlexSwapRoute {
  path: string[];
  pools: string[];
  expected_output: string;
  price_impact: number;
  fee_total: number;
}

export interface AlexPoolStats {
  pool_id: string;
  tvl_usd: number;
  volume_24h_usd: number;
  volume_7d_usd: number;
  fees_24h_usd: number;
  apy: number;
  token_x_price: number;
  token_y_price: number;
}

export interface AlexTokenPrice {
  token: string;
  symbol: string;
  price_usd: number;
  price_stx: number;
  last_updated: string;
}

// Alex contract addresses (mainnet)
export const ALEX_CONTRACTS = {
  AMM_SWAP_POOL: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1",
  SWAP_HELPER: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.swap-helper-v1-03",
  ALEX_VAULT: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-vault",
  ALEX_TOKEN: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token",
};

// Common token addresses on Alex
export const ALEX_TOKENS = {
  STX: "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-wstx-v2",
  ALEX: "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex",
  xBTC: "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-wxbtc",
  sUSDT: "SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-susdt",
  sBTC: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-sbtc",
};
