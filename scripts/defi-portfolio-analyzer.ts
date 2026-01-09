// DeFi Portfolio Analyzer - Combined Alex LP + Zest lending analysis
//
// Example addresses:
//   SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B
//   SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D
//
// Uses example positions (customize in script):
//   Alex LP: STX/ALEX pool with 10 LP tokens
//   Zest: STX (5000 supplied, 1000 borrowed), aeUSDC (2000 supplied)
//
// Example usage:
//   bun run scripts/defi-portfolio-analyzer.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];

  if (!address) {
    throw new Error(
      "Usage: bun run scripts/defi-portfolio-analyzer.ts <address>\n" +
        "Example: bun run scripts/defi-portfolio-analyzer.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B"
    );
  }

  // Example positions - customize these for your portfolio
  // In production these would come from on-chain data
  const alexPositions = [
    {
      poolId: "0x5b5ccc41f222978fd73284c4c73483e19444cee1eca6a8e948f37a163792603b", // STX/ALEX pool
      lpTokens: 1000000000, // 10 LP tokens (8 decimals)
      token0Symbol: "STX",
      token1Symbol: "ALEX",
    },
  ];

  const zestPositions = [
    { asset: "STX", supplied: 5000, borrowed: 1000 },
    { asset: "aeUSDC", supplied: 2000, borrowed: 0 },
  ];

  const api = await createApiClient();
  const response = await api.post("/api/defi/portfolio-analyzer", {
    address,
    alexPositions,
    zestPositions,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
