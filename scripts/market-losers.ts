import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const limit = process.argv[2] || "10";
  const api = await createApiClient();
  const response = await api.get(`/api/market/losers?limit=${limit}`);
  printResponse(response);
}

run().catch(handleAxiosError);
