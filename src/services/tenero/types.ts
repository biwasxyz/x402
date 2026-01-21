// Tenero API type definitions for Stacks DeFi market data

// Market Stats Types
export interface MarketStatsDay {
  period: string; // YYYY-MM-DD
  volume_usd: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  netflow_usd: number;
  unique_traders: number;
  unique_buyers: number;
  unique_sellers: number;
  unique_pools: number;
}

// Token Types
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  image_url?: string;
}

export interface TokenMetrics {
  volume_30m?: number;
  volume_1h?: number;
  volume_4h?: number;
  volume_1d?: number;
  volume_7d?: number;
  swaps_30m?: number;
  swaps_1h?: number;
  swaps_4h?: number;
  swaps_1d?: number;
  swaps_7d?: number;
  buy_count_1d?: number;
  sell_count_1d?: number;
  buy_volume_1d?: number;
  sell_volume_1d?: number;
}

export interface TokenPriceChanges {
  price_change_1h?: number;
  price_change_4h?: number;
  price_change_1d?: number;
  price_change_7d?: number;
  price_change_30d?: number;
}

export interface TokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  description?: string;
  image_url?: string;
  deployer_address?: string;
  deploy_transaction_id?: string;
  deployed_block_height?: number;
  deployed_at?: number;
  holder_count?: number;
  circulating_supply?: number;
  total_supply?: number;
  total_liquidity_usd?: number;
  base_liquidity_usd?: number;
  quote_liquidity_usd?: number;
  pool_count?: number;
  base_pool_count?: number;
  quote_pool_count?: number;
  biggest_pool_id?: string;
  biggest_pool_liquidity_usd?: number;
  price_usd?: number;
  marketcap_usd?: number;
  total_marketcap_usd?: number;
  metrics?: TokenMetrics;
  price?: TokenPriceChanges;
}

// Whale Trade Types
export interface WhaleTrade {
  tx_id: string;
  tx_index: number;
  event_index: number;
  block_height: number;
  block_time: number;
  pool_id: string;
  pool_platform: string;
  event_type: "buy" | "sell";
  maker: string;
  maker_name?: string | null;
  recipient?: string;
  recipient_name?: string | null;
  base_token_address: string;
  base_token: TokenInfo;
  base_token_amount: string;
  quote_token_address: string;
  quote_token: TokenInfo;
  quote_token_amount: string;
  amount_usd: number;
  price: number;
  price_usd: number;
}

export interface WhaleTradesResponse {
  rows: WhaleTrade[];
}

// Hourly Netflow Types
export interface HourlyNetflow {
  timestamp: number;
  inflow_usd: number;
  outflow_usd: number;
  netflow_usd: number;
}

// Pool Types
export interface PoolMetrics {
  volume_30m_usd?: number;
  volume_1h_usd?: number;
  volume_4h_usd?: number;
  volume_1d_usd?: number;
  volume_7d_usd?: number;
  swaps_30m?: number;
  swaps_1h?: number;
  swaps_4h?: number;
  swaps_1d?: number;
  swaps_7d?: number;
  buys_1d?: number;
  sells_1d?: number;
  buy_volume_1d_usd?: number;
  sell_volume_1d_usd?: number;
}

export interface PoolPriceData {
  current_price?: number;
  price_1h?: number;
  price_4h?: number;
  price_1d?: number;
  price_7d?: number;
  price_change_1h_pct?: number | null;
  price_change_4h_pct?: number | null;
  price_change_1d_pct?: number | null;
  price_change_7d_pct?: number | null;
}

export interface TrendingPool {
  pool_id: string;
  pool_platform: string;
  pool_platform_key?: string;
  pool_address?: string;
  base_token_address: string;
  base_token: TokenInfo & {
    decimals?: number;
    deployer_address?: string;
    holder_count?: number;
    total_supply?: number;
    circulating_supply?: number;
  };
  quote_token_address: string;
  quote_token: TokenInfo & {
    decimals?: number;
    deployer_address?: string;
    holder_count?: number;
    total_supply?: number;
    circulating_supply?: number;
  };
  liquidity_usd?: number;
  base_token_price_usd?: number;
  quote_token_price_usd?: number;
  marketcap_usd?: number;
  metrics?: PoolMetrics;
  price?: PoolPriceData;
}

export interface TrendingPoolsResponse {
  rows: TrendingPool[];
}

export interface PoolOhlc {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Token Summary/Profile Types
export interface TokenMarketSummary {
  token_address: string;
  price_usd: number;
  price_change_24h?: number;
  volume_24h?: number;
  liquidity?: number;
  market_cap?: number;
  holders_count?: number;
}

export interface TokenProfile {
  token_address: string;
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  website?: string;
  twitter?: string;
  logo_url?: string;
  created_at?: number;
}

// Wallet Types (for future AI-enhanced endpoints)
export interface WalletTradeStats {
  wallet_address: string;
  buy_tx_count: number;
  sell_tx_count: number;
  buy_amount: number;
  sell_amount: number;
  netflow_amount: number;
  buy_amount_usd: number;
  sell_amount_usd: number;
  netflow_amount_usd: number;
  avg_buy_price_usd: number;
  avg_sell_price_usd: number;
  first_trade_time: number;
  last_trade_time: number;
  total_tx_count: number;
  total_volume_usd: number;
  realized_pnl_usd: number;
}

export interface PnlByToken {
  token_address: string;
  token_symbol: string;
  realized_pnl: number;
  unrealized_pnl: number;
}

export interface WalletPnlDistribution {
  wallet_address: string;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  winning_trades: number;
  losing_trades: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  pnl_by_token?: PnlByToken[];
}

// Query parameter types
export type TrendingTimeframe = "1h" | "4h" | "1d" | "24h" | "7d";

export interface OhlcParams {
  period?: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  from?: number;
  to?: number;
  limit?: number;
}
