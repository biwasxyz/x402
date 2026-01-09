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
        "Example: bun run scripts/defi-portfolio-analyzer.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D"
    );
  }

  // Example positions - in production these would come from on-chain data
  const alexPositions = [
    {
      poolId: "SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-stx-alex",
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
