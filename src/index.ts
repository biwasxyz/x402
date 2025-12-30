import app from "./app";
import { STACKS_API_URL } from "./services/stacks.service";

const PORT = process.env.PORT || 3000;
const NETWORK = process.env.NETWORK || "testnet";
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || "STZWXQNJWS9WT1409PABGQCT318VWXWZ6VK2C583";

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 x402-stacks API Server");
  console.log("=".repeat(80));
  console.log(`Port: ${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Payment Address: ${SERVER_ADDRESS}`);
  console.log(`Stacks API: ${STACKS_API_URL}`);
  console.log("\n📋 Available Endpoints:");
  console.log("  GET  /health              - Health check (free)");
  console.log("  GET  /api/news            - Stacks & Bitcoin news (0.001 STX)");
  console.log("  POST /api/audit           - Clarity security audit (0.02 STX)");
  console.log("=".repeat(80) + "\n");
});
