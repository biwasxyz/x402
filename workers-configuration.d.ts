/**
 * Cloudflare Workers Environment Bindings
 */
interface Env {
  OPENROUTER_API_KEY?: string;
  NETWORK?: string;
  SERVER_ADDRESS?: string;
  FACILITATOR_URL?: string;
}

/**
 * Field definition for x402 protocol schema
 */
type FieldDef = {
  type: string;
  required?: boolean;
  description?: string;
};

/**
 * x402 Payment Protocol - Accept object
 * Describes payment requirements and expectations
 */
type Accepts = {
  /** Payment scheme - currently only "exact" is supported */
  scheme: "exact";

  /** Blockchain network */
  network: "base";

  /** Maximum amount required in smallest unit (e.g., microSTX) */
  maxAmountRequired: string;

  /** Resource being accessed */
  resource: string;

  /** Human-readable description of the payment */
  description: string;

  /** Expected response MIME type */
  mimeType: string;

  /** Address to send payment to */
  payTo: string;

  /** Maximum timeout in seconds */
  maxTimeoutSeconds: number;

  /** Asset type (e.g., "STX", "sBTC") */
  asset: string;

  /** Schema describing input/output expectations */
  outputSchema?: {
    input: {
      type: "http";
      method: "GET" | "POST";
      bodyType?: "json" | "form-data";
      queryParams?: Record<string, FieldDef>;
      headerFields?: Record<string, FieldDef>;
    };
    output?: Record<string, any>;
  };
};

/**
 * x402 Payment Protocol - Response format
 * Returned when payment is required (HTTP 402)
 */
type x402Response = {
  /** Protocol version */
  x402Version: number;

  /** Error message if any */
  error?: string;

  /** Array of acceptable payment methods */
  accepts?: Array<Accepts>;

  /** Address of the payer */
  payer?: string;
};

export {};
