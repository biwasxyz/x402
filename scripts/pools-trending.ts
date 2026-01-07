import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const timeframe = process.argv[2] || "1d";
  const api = await createApiClient();
  const response = await api.get(`/api/pools/trending?timeframe=${timeframe}`);
  printResponse(response);
}

run().catch(handleAxiosError);
