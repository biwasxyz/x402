// x402-stacks Protocol Types

export type Network = "mainnet" | "testnet";
export type TokenType = "STX" | "sBTC";

// x402-stacks 402 response format
export interface x402PaymentRequired {
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  network: Network;
  nonce: string;
  expiresAt: string;
  tokenType: TokenType;
  facilitatorUrl?: string;
}

export interface EndpointConfig {
  resource: string;
  description: string;
  method: "GET" | "POST";
  paymentRequired: boolean;
  amount?: number;
  tokenType?: TokenType;
}

export interface PaymentInfo {
  txId: string;
  amount: string;
  sender: string;
}

export interface SettlementInfo {
  success?: boolean;
  tx_id?: string;
  token_type?: string;
  sender_address?: string;
  recipient_address?: string;
  amount?: number | string;
  fee?: number;
  status?: string;
  block_height?: number;
  network?: string;
  validation_errors?: string[];
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  settlement?: SettlementInfo;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ResponseMeta {
  timestamp: string;
}
