import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];

  if (!address) {
    throw new Error(
      "Usage: bun run scripts/wallet-trading.ts <address>\n" +
        "Example: bun run scripts/wallet-trading.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/wallet/trading", { address });
  printResponse(response);
}

run().catch(handleAxiosError);
