export type StacksNetwork = "mainnet" | "testnet";

export function getStacksApiUrl(network: StacksNetwork): string {
  return network === "mainnet"
    ? "https://api.mainnet.hiro.so"
    : "https://api.testnet.hiro.so";
}

export async function getContractSource(contractIdentifier: string, stacksApiUrl: string): Promise<string> {
  const [address, contractName] = contractIdentifier.split(".");

  if (!address || !contractName) {
    throw new Error("Invalid contract identifier. Format: ADDRESS.CONTRACT_NAME");
  }

  const url = `${stacksApiUrl}/v2/contracts/source/${address}/${contractName}`;
  console.log(`[stacks.service] Fetching Clarity source: ${contractIdentifier} (${url})`);

  const response = await fetch(url);

  if (response.status === 404) {
    throw new Error(`Contract not found: ${contractIdentifier}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch contract: ${response.statusText}`);
  }

  const data = await response.json();
  const contractData = data as { source?: string };
  if (contractData && contractData.source) {
    return contractData.source;
  }
  throw new Error("Contract source code not found");
}
