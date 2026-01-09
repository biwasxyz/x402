import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const api = await createApiClient();
  const response = await api.get("/api/alex/arbitrage-scan");
  printResponse(response);
}

run().catch(handleAxiosError);
