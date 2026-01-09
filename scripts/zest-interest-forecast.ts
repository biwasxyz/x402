import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const api = await createApiClient();
  const response = await api.get("/api/zest/interest-forecast");
  printResponse(response);
}

run().catch(handleAxiosError);
