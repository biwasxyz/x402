import { RuntimeConfig } from "../config";
import { x402PaymentRequired, EndpointConfig, PaymentInfo, TokenType } from "../types";
import { jsonResponse, sendError } from "./response";

// Convert STX to microSTX
export function STXtoMicroSTX(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

interface VerificationResult {
  txId: string;
  status: "success" | "pending" | "failed" | "not_found";
  sender: string;
  recipient: string;
  amount: bigint;
  blockHeight?: number;
  isValid: boolean;
  validationError?: string;
}

export interface PaymentSuccess {
  ok: true;
  payment: PaymentInfo;
  paymentHeader: string;
}

export interface PaymentFailure {
  ok: false;
  response: Response;
}

export type PaymentCheckResult = PaymentSuccess | PaymentFailure;

export function createPaymentRequiredResponse(
  config: RuntimeConfig,
  endpointConfig: EndpointConfig
): Response {
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const tokenType: TokenType = endpointConfig.tokenType || "STX";

  const response: x402PaymentRequired = {
    maxAmountRequired: STXtoMicroSTX(endpointConfig.amountSTX).toString(),
    resource: endpointConfig.resource,
    payTo: config.serverAddress,
    network: config.network,
    nonce,
    expiresAt,
    tokenType,
    facilitatorUrl: config.facilitatorUrl,
  };

  return jsonResponse(response, 402);
}

export async function requirePayment(
  request: Request,
  config: RuntimeConfig,
  endpointConfig: EndpointConfig
): Promise<PaymentCheckResult> {
  const signedPayment = request.headers.get("x-payment");
  const tokenType: TokenType = endpointConfig.tokenType || "STX";

  if (!signedPayment) {
    return {
      ok: false,
      response: createPaymentRequiredResponse(config, endpointConfig),
    };
  }

  try {
    const requiredAmount = STXtoMicroSTX(endpointConfig.amountSTX);

    const verification = await settleSignedPayment(signedPayment, config, {
      amount: requiredAmount,
      tokenType,
      resource: endpointConfig.resource,
      method: endpointConfig.method,
    });

    if (!verification.isValid) {
      return {
        ok: false,
        response: sendError(
          verification.validationError || "Invalid payment",
          402,
          "PAYMENT_INVALID"
        ),
      };
    }

    if (verification.status === "pending") {
      return {
        ok: false,
        response: sendError(
          "Payment not yet confirmed",
          402,
          "PAYMENT_PENDING",
          "Please wait for transaction confirmation on the blockchain"
        ),
      };
    }

    if (verification.status === "failed") {
      return {
        ok: false,
        response: sendError(
          "Payment failed",
          402,
          "PAYMENT_FAILED",
          verification.validationError || "Transaction failed on blockchain"
        ),
      };
    }

    const payment: PaymentInfo = {
      txId: verification.txId,
      amount: verification.amount.toString(),
      sender: verification.sender,
    };

    const paymentHeader = encodeHeader({
      txId: verification.txId,
      status: verification.status,
      blockHeight: verification.blockHeight,
    });

    return {
      ok: true,
      payment,
      paymentHeader,
    };
  } catch (error) {
    console.error("Payment verification error:", error);
    return {
      ok: false,
      response: sendError(
        "Payment settlement error",
        500,
        "PAYMENT_ERROR",
        error instanceof Error ? error.message : "Unknown error"
      ),
    };
  }
}

async function settleSignedPayment(
  signedPayment: string,
  config: RuntimeConfig,
  options: {
    amount: bigint;
    tokenType: TokenType;
    resource: string;
    method: string;
  }
): Promise<VerificationResult> {
  const response = await fetch(`${config.facilitatorUrl}/api/v1/settle`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      signed_transaction: signedPayment,
      expected_recipient: config.serverAddress,
      min_amount: Number(options.amount),
      network: config.network,
      resource: options.resource,
      method: options.method,
      token_type: options.tokenType === "sBTC" ? "SBTC" : "STX",
    }),
  });

  const data = await response.json();
  const responseData = data as SettleResponseData;

  if (!response.ok) {
    return {
      txId: responseData.tx_id || "",
      status: "failed",
      sender: responseData.sender_address || "",
      recipient: responseData.recipient_address || config.serverAddress,
      amount: BigInt(responseData.amount || 0),
      blockHeight: responseData.block_height,
      isValid: false,
      validationError: responseData.validation_errors?.join(", ") || responseData.error || response.statusText,
    };
  }

  return mapSettleResponse(data, config.serverAddress);
}

interface SettleResponseData {
  tx_id?: string;
  status?: string;
  sender_address?: string;
  recipient_address?: string;
  amount?: number | string;
  block_height?: number;
  success?: boolean;
  validation_errors?: string[];
  error?: string;
}

function mapSettleResponse(data: unknown, serverAddress: string): VerificationResult {
  const responseData = data as SettleResponseData;
  let status: VerificationResult["status"] = "failed";

  if (responseData.status === "confirmed") {
    status = "success";
  } else if (responseData.status === "pending") {
    status = "pending";
  }

  return {
    txId: responseData.tx_id || "",
    status,
    sender: responseData.sender_address || "",
    recipient: responseData.recipient_address || serverAddress,
    amount: BigInt(responseData.amount || 0),
    blockHeight: responseData.block_height,
    isValid: responseData.success === true && responseData.status === "confirmed",
    validationError: responseData.validation_errors?.join(", ") || responseData.error,
  };
}

function encodeHeader(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return btoa(json);
}
