// Zest Liquidation Risk - Monitor liquidation risk with price scenarios
//
// Supported assets (use symbol):
//   STX    - Stacks native token
//   sBTC   - Wrapped Bitcoin on Stacks
//   stSTX  - Stacked STX (liquid staking)
//   aeUSDC - Bridged USDC (stablecoin)
//
// Example addresses:
//   SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B
//   SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D
//
// Example usage:
//   bun run scripts/zest-liquidation-risk.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B STX 5000 aeUSDC 1000
//   bun run scripts/zest-liquidation-risk.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D stSTX 2000 STX 500

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
        "Assets: STX, sBTC, stSTX, aeUSDC\n" +
        "Example: bun run scripts/zest-liquidation-risk.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B STX 5000 aeUSDC 1000"
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
