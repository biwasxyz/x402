import axios from "axios";

const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const STACKS_API_URL = NETWORK === "mainnet"
  ? "https://api.mainnet.hiro.so"
  : "https://api.testnet.hiro.so";

export async function getContractSource(contractIdentifier: string): Promise<string> {
  const [address, contractName] = contractIdentifier.split(".");

  if (!address || !contractName) {
    throw new Error("Invalid contract identifier. Format: ADDRESS.CONTRACT_NAME");
  }

  const url = `${STACKS_API_URL}/v2/contracts/source/${address}/${contractName}`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.source) {
      return response.data.source;
    }
    throw new Error("Contract source code not found");
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Contract not found: ${contractIdentifier}`);
    }
    throw new Error(`Failed to fetch contract: ${error.message}`);
  }
}

export { STACKS_API_URL };
