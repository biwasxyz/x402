// Hiro API type definitions for BNS, NFT, and transfer data

// BNS Types
export interface BnsNameInfo {
  address: string;
  blockchain: string;
  expire_block: number;
  last_txid: string;
  status: string;
  zonefile: string;
  zonefile_hash: string;
}

export interface BnsAddressNamesResponse {
  names: string[];
}

// NFT Types
export interface NftHolding {
  asset_identifier: string;
  value: {
    hex: string;
    repr: string;
  };
  block_height: number;
  tx_id: string;
}

export interface NftHoldingsResponse {
  limit: number;
  offset: number;
  total: number;
  results: NftHolding[];
}

export interface NftMetadata {
  token_uri: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  };
}

// Transfer Types
export interface StxTransfer {
  amount: string;
  sender: string;
  recipient: string;
}

export interface FtTransfer {
  asset_identifier: string;
  amount: string;
  sender: string;
  recipient: string;
}

export interface TransactionWithTransfers {
  tx: {
    tx_id: string;
    tx_type: string;
    sender_address: string;
    fee_rate: string;
    block_time: number;
    block_time_iso: string;
    block_height: number;
    tx_status: string;
  };
  stx_sent: string;
  stx_received: string;
  stx_transfers: StxTransfer[];
  ft_transfers: FtTransfer[];
}

export interface TransactionsWithTransfersResponse {
  limit: number;
  offset: number;
  total: number;
  results: TransactionWithTransfers[];
}

// sBTC specific types
export interface SbtcTransfer extends FtTransfer {
  // sBTC is identified by contract: SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
}

// Token balance types
export interface FungibleTokenBalance {
  balance: string;
  total_sent: string;
  total_received: string;
}

export interface BalancesResponse {
  stx: {
    balance: string;
    total_sent: string;
    total_received: string;
    locked: string;
  };
  fungible_tokens: Record<string, FungibleTokenBalance>;
  non_fungible_tokens: Record<string, { count: number }>;
}
