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

  console.log(`Using API_URL: ${API_URL}`);

  const account = await mnemonicToAccount(mnemonic, NETWORK);
  const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 60000,
    transformResponse: [
      (data) => {
        if (typeof data !== "string") {
          return data;
        }
        const trimmed = data.trim();
        if (!trimmed) {
          return data;
        }
        try {
          return JSON.parse(trimmed);
        } catch {
          return data;
        }
      },
    ],
  });

  // Ensure 402 payloads are parsed before x402-stacks validates them.
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const data = error?.response?.data;
      if (error?.response?.status === 402) {
        console.error(
          "x402 debug 402 payload",
          typeof data === "string" ? data : JSON.stringify(data)
        );
      }
      if (typeof data === "string") {
        const trimmed = data.trim();
        if (trimmed) {
          try {
            error.response.data = JSON.parse(trimmed);
          } catch {
            // Leave as-is if it's not JSON.
          }
        }
      }
      return Promise.reject(error);
    }
  );

  const api = withPaymentInterceptor(axiosInstance, account);

  return api;
}

export function printResponse(response: any) {
  console.log(JSON.stringify(response.data ?? null, null, 2));
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
