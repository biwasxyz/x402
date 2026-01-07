import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

export type Network = "mainnet" | "testnet";

export interface Account {
  address: string;
  privateKey: string;
  network: Network;
}

export async function mnemonicToAccount(
  mnemonic: string,
  network: Network
): Promise<Account> {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });

  const account = wallet.accounts[0];
  const address = getStxAddress(account, network);

  return {
    address,
    privateKey: account.stxPrivateKey,
    network,
  };
}
