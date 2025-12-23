import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

export interface Account {
  address: string;
  privateKey: string;
  network: "mainnet" | "testnet";
}

/**
 * Create an account from an existing mnemonic phrase
 * Does NOT generate - only converts your existing mnemonic to account details
 */
export async function mnemonicToAccount(
  mnemonic: string,
  network: "mainnet" | "testnet" = "testnet"
): Promise<Account> {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });

  const account = wallet.accounts[0];
  const address = getStxAddress({
    account,
    transactionVersion: network === "mainnet" ? 0x00 : 0x80,
  });

  return {
    address,
    privateKey: account.stxPrivateKey,
    network,
  };
}
