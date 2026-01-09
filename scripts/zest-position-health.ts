// Zest Position Health - Comprehensive health check with rebalancing suggestions
//
// Example addresses:
//   SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B
//   SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D
//
// Default positions (if not provided):
//   STX: 1000 supplied, 200 borrowed
//   aeUSDC: 500 supplied, 0 borrowed
//
// Example usage:
//   bun run scripts/zest-position-health.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B
//   bun run scripts/zest-position-health.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D '[{"asset":"STX","supplied":5000,"borrowed":1000}]'

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];

  if (!address) {
    throw new Error(
      "Usage: bun run scripts/zest-position-health.ts <address> [positions JSON]\n" +
        "Example: bun run scripts/zest-position-health.ts SP1M8KHCJXB3SBRQRDBCG3J3859AA1CN0AWDHN17B\n" +
        "With positions: bun run scripts/zest-position-health.ts SP2K... '[{\"asset\":\"STX\",\"supplied\":5000,\"borrowed\":1000}]'"
    );
  }

  // Parse positions from command line or use defaults
  let positions = [
    { asset: "STX", supplied: 1000, borrowed: 200 },
    { asset: "aeUSDC", supplied: 500, borrowed: 0 },
  ];

  if (process.argv[3]) {
    try {
      positions = JSON.parse(process.argv[3]);
    } catch {
      console.warn("Warning: Could not parse positions JSON, using defaults");
    }
  }

  const api = await createApiClient();
  const response = await api.post("/api/zest/position-health", {
    address,
    positions,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
