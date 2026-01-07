import { RuntimeConfig } from "../config";
import { PaymentInfo } from "../types";
import { jsonResponse, sendError } from "./response";

type TokenType = "STX" | "sBTC";

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

export async function requirePayment(
  request: Request,
  url: URL,
  config: RuntimeConfig,
  amountStx: number,
  body?: any
): Promise<PaymentCheckResult> {
  const requiredAmount = stxToMicroStx(amountStx);

  const signedPayment = request.headers.get("x-payment");
  const legacyTxId =
    request.headers.get("x-payment-txid") ||
    url.searchParams.get("paymentTxId") ||
    (typeof body === "object" ? body?.paymentTxId : undefined);

  const tokenHeader = request.headers.get("x-payment-token-type");
  const tokenType: TokenType = tokenHeader?.toLowerCase() === "sbtc" ? "sBTC" : "STX";

  if (!signedPayment && !legacyTxId) {
    return {
      ok: false,
      response: paymentRequiredResponse(config, requiredAmount, url.pathname, tokenType),
    };
  }

  try {
    let verification: VerificationResult;

    if (signedPayment) {
      verification = await settleSignedPayment(signedPayment, config, {
        amount: requiredAmount,
        tokenType,
        resource: url.pathname,
        method: request.method,
      });
    } else {
      verification = await verifyExistingPayment(legacyTxId!, config, {
        amount: requiredAmount,
        tokenType,
        resource: url.pathname,
        method: request.method,
      });
    }

    if (!verification.isValid) {
      return {
        ok: false,
        response: sendError(
          "Invalid payment",
          402,
          "PAYMENT_INVALID",
          verification.validationError
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

function paymentRequiredResponse(
  config: RuntimeConfig,
  amount: bigint,
  resource: string,
  tokenType: TokenType
) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const nonce = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return jsonResponse(
    {
      maxAmountRequired: amount.toString(),
      resource,
      payTo: config.serverAddress,
      network: config.network,
      nonce,
      expiresAt,
      tokenType,
      facilitatorUrl: config.facilitatorUrl,
    },
    402
  );
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
      recipient: responseData.recipient_address || "",
      amount: BigInt(responseData.amount || 0),
      blockHeight: responseData.block_height,
      isValid: false,
      validationError: responseData.validation_errors?.join(", ") || responseData.error || response.statusText,
    };
  }

  return mapSettleResponse(data);
}

async function verifyExistingPayment(
  txId: string,
  config: RuntimeConfig,
  options: {
    amount: bigint;
    tokenType: TokenType;
    resource: string;
    method: string;
  }
): Promise<VerificationResult> {
  const response = await fetch(`${config.facilitatorUrl}/api/v1/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tx_id: txId,
      expected_recipient: config.serverAddress,
      min_amount: Number(options.amount),
      network: config.network,
      resource: options.resource,
      method: options.method,
      token_type: options.tokenType === "sBTC" ? "SBTC" : "STX",
    }),
  });

  const data = await response.json();
  const responseData = data as VerifyResponseData;

  if (!response.ok) {
    return {
      txId,
      status: "not_found",
      sender: responseData.sender_address || "",
      recipient: responseData.recipient_address || "",
      amount: BigInt(responseData.amount || 0),
      blockHeight: responseData.block_height,
      isValid: false,
      validationError: responseData.validation_errors?.join(", ") || responseData.error || response.statusText,
    };
  }

  return mapVerifyResponse(txId, data);
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

function mapSettleResponse(data: any): VerificationResult {
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
    recipient: responseData.recipient_address || "",
    amount: BigInt(responseData.amount || 0),
    blockHeight: responseData.block_height,
    isValid: responseData.success === true && responseData.status === "confirmed",
    validationError: responseData.validation_errors?.join(", ") || responseData.error,
  };
}

interface VerifyResponseData {
  tx_id?: string;
  status?: string;
  sender_address?: string;
  recipient_address?: string;
  amount?: number | string;
  block_height?: number;
  valid?: boolean;
  validation_errors?: string[];
  error?: string;
}

function mapVerifyResponse(txId: string, data: any): VerificationResult {
  const responseData = data as VerifyResponseData;
  let status: VerificationResult["status"] = "not_found";
  if (responseData.status === "confirmed") {
    status = "success";
  } else if (responseData.status === "pending") {
    status = "pending";
  } else if (responseData.status === "failed") {
    status = "failed";
  }

  return {
    txId: responseData.tx_id || txId,
    status,
    sender: responseData.sender_address || "",
    recipient: responseData.recipient_address || "",
    amount: BigInt(responseData.amount || 0),
    blockHeight: responseData.block_height,
    isValid: responseData.valid === true && status === "success",
    validationError: responseData.validation_errors?.join(", ") || responseData.error,
  };
}

function stxToMicroStx(amountStx: number) {
  return BigInt(Math.round(amountStx * 1_000_000));
}

function encodeHeader(payload: Record<string, any>) {
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(json);
  }

  const bufferCtor = (globalThis as any)?.Buffer;
  if (bufferCtor) {
    return bufferCtor.from(json, "utf-8").toString("base64");
  }

  throw new Error("Base64 encoding is not supported in this environment");
}
