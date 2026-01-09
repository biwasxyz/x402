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
        "Example: bun run scripts/zest-position-health.ts SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D\n" +
        "With positions: bun run scripts/zest-position-health.ts SP2K... '[{\"asset\":\"STX\",\"supplied\":1000,\"borrowed\":200}]'"
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
