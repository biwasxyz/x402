import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const tokenAddress = process.argv[2];

  if (!tokenAddress) {
    throw new Error(
      "Usage: bun run scripts/tokens-details.ts <tokenAddress>\n" +
        "Example: bun run scripts/tokens-details.ts SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/tokens/details", { tokenAddress });
  printResponse(response);
}

run().catch(handleAxiosError);
