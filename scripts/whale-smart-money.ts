import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const limit = process.argv[2] || "100";

  const api = await createApiClient();
  const response = await api.get(`/api/whale/smart-money?limit=${limit}`);
  printResponse(response);
}

run().catch(handleAxiosError);
