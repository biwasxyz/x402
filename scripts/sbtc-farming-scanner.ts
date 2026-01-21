import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  // Balance in satoshis (optional)
  // Example: 100000000 = 1 sBTC
  const balanceArg = process.argv[2];
  const balance = balanceArg ? parseInt(balanceArg, 10) : undefined;

  const api = await createApiClient();
  const response = await api.post("/api/sbtc/farming-scanner", { balance });
  printResponse(response);
}

run().catch(handleAxiosError);
