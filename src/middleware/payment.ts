import { x402PaymentRequired, STXtoMicroSTX } from "x402-stacks";

const SERVER_ADDRESS = process.env.SERVER_ADDRESS || "STZWXQNJWS9WT1409PABGQCT318VWXWZ6VK2C583";
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.x402stacks.xyz";

export const requirePayment = (amountSTX: number) => {
  return x402PaymentRequired({
    amount: STXtoMicroSTX(amountSTX),
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  });
};
