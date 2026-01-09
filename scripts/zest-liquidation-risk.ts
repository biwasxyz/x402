import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];
  const collateralAsset = process.argv[3];
  const collateralAmount = parseFloat(process.argv[4]);
  const debtAsset = process.argv[5];
  const debtAmount = parseFloat(process.argv[6]);

  if (!address || !collateralAsset || isNaN(collateralAmount) || !debtAsset || isNaN(debtAmount)) {
    throw new Error(
      "Usage: bun run scripts/zest-liquidation-risk.ts <address> <collateralAsset> <collateralAmount> <debtAsset> <debtAmount>\n" +
        "Example: bun run scripts/zest-liquidation-risk.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D STX 1000 aeUSDC 500"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/zest/liquidation-risk", {
    address,
    collateralAsset,
    collateralAmount,
    debtAsset,
    debtAmount,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
