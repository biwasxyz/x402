import "dotenv/config";
import axios from "axios";
import { withPaymentInterceptor } from "x402-stacks";
import { mnemonicToAccount, Network } from "./wallet";

export const NETWORK: Network =
  process.env.NETWORK === "mainnet" ? "mainnet" : "testnet";
export const API_URL = process.env.API_URL || "http://localhost:8787";

export async function createApiClient() {
  const mnemonic = process.env.CLIENT_MNEMONIC || "";
  if (!mnemonic) {
    throw new Error("CLIENT_MNEMONIC is required in environment variables");
  }

  const account = await mnemonicToAccount(mnemonic, NETWORK);
  const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 60000,
  });

  const api = withPaymentInterceptor(axiosInstance, account);

  return api;
}

export function printResponse(response: any) {
  const { settlement, ...restData } = response.data || {};

  const output = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers["x-payment-response"]
      ? { "x-payment-response": response.headers["x-payment-response"] }
      : undefined,
    settlement,
    data: restData,
  };

  console.log(JSON.stringify(output, null, 2));
}

export function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const res = error.response;
    console.error(
      JSON.stringify(
        {
          message: error.message,
          status: res?.status,
          statusText: res?.statusText,
          data: res?.data,
        },
        null,
        2
      )
    );
  } else if (error instanceof Error) {
    console.error(JSON.stringify({ message: error.message }, null, 2));
  } else {
    console.error(JSON.stringify({ message: "Unknown error", error }, null, 2));
  }
  process.exit(1);
}
