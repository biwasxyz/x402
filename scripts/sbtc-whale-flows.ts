import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const hours = process.argv[2] || "24";

  const api = await createApiClient();
  const response = await api.get(`/api/sbtc/whale-flows?hours=${hours}`);
  printResponse(response);
}

run().catch(handleAxiosError);
