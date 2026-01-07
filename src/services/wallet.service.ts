import { getOpenRouter } from "./openrouter.service";

export type WalletClassification = "trader" | "dao" | "bridge" | "bot" | "whale";

export interface WalletAnalysis {
  address: string;
  classification: WalletClassification;
  confidence: number;
  reasoning: string;
  metrics: WalletMetrics;
}

export interface WalletMetrics {
  stxBalance: string;
  totalTransactions: number;
  uniqueContractsInteracted: number;
  fungibleTokensHeld: number;
  nftCount: number;
  avgTransactionFrequency: string;
  largestTransaction: string;
}

interface HiroTransaction {
  tx_id: string;
  tx_type: string;
  sender_address: string;
  fee_rate: string;
  block_time: number;
  tx_status: string;
  token_transfer?: {
    recipient_address: string;
    amount: string;
    memo: string;
  };
  contract_call?: {
    contract_id: string;
    function_name: string;
  };
  smart_contract?: {
    contract_id: string;
  };
}

interface HiroBalances {
  stx: {
    balance: string;
    total_sent: string;
    total_received: string;
    locked: string;
  };
  fungible_tokens: Record<string, { balance: string }>;
  non_fungible_tokens: Record<string, { count: number }>;
}

async function getWalletTransactions(address: string, stacksApiUrl: string): Promise<HiroTransaction[]> {
  const url = `${stacksApiUrl}/extended/v1/address/${address}/transactions?limit=50`;

  const response = await fetch(url);
  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  const data = await response.json();
  const txData = data as { results?: HiroTransaction[] };
  return txData.results || [];
}

async function getWalletBalances(address: string, stacksApiUrl: string): Promise<HiroBalances> {
  const url = `${stacksApiUrl}/extended/v1/address/${address}/balances`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data = await response.json();
  return data as HiroBalances;
}

function calculateMetrics(
  balances: HiroBalances,
  transactions: HiroTransaction[]
): WalletMetrics {
  const uniqueContracts = new Set<string>();
  let largestTx = "0";

  transactions.forEach(tx => {
    if (tx.contract_call?.contract_id) {
      uniqueContracts.add(tx.contract_call.contract_id);
    }
    if (tx.smart_contract?.contract_id) {
      uniqueContracts.add(tx.smart_contract.contract_id);
    }
    if (tx.token_transfer?.amount) {
      if (BigInt(tx.token_transfer.amount) > BigInt(largestTx)) {
        largestTx = tx.token_transfer.amount;
      }
    }
  });

  const nftCount = Object.values(balances.non_fungible_tokens || {})
    .reduce((sum, nft) => sum + (nft.count || 0), 0);

  // Calculate avg transaction frequency
  let avgFrequency = "N/A";
  if (transactions.length >= 2) {
    const times = transactions
      .filter(tx => tx.block_time)
      .map(tx => tx.block_time)
      .sort((a, b) => b - a);

    if (times.length >= 2) {
      const totalSpan = times[0] - times[times.length - 1];
      const avgSeconds = totalSpan / (times.length - 1);

      if (avgSeconds < 3600) {
        avgFrequency = `${Math.round(avgSeconds / 60)} minutes`;
      } else if (avgSeconds < 86400) {
        avgFrequency = `${Math.round(avgSeconds / 3600)} hours`;
      } else {
        avgFrequency = `${Math.round(avgSeconds / 86400)} days`;
      }
    }
  }

  return {
    stxBalance: balances.stx?.balance || "0",
    totalTransactions: transactions.length,
    uniqueContractsInteracted: uniqueContracts.size,
    fungibleTokensHeld: Object.keys(balances.fungible_tokens || {}).length,
    nftCount,
    avgTransactionFrequency: avgFrequency,
    largestTransaction: largestTx,
  };
}

export async function classifyWallet(address: string, stacksApiUrl: string): Promise<WalletAnalysis> {
  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,}$/i)) {
    throw new Error("Invalid Stacks address format");
  }

  // Fetch wallet data from Hiro API
  const [balances, transactions] = await Promise.all([
    getWalletBalances(address, stacksApiUrl),
    getWalletTransactions(address, stacksApiUrl),
  ]);

  const metrics = calculateMetrics(balances, transactions);

  // Prepare data summary for AI classification
  const walletSummary = `
Wallet Address: ${address}

STX Balance: ${metrics.stxBalance} microSTX (${(parseInt(metrics.stxBalance) / 1_000_000).toFixed(6)} STX)
Total Transactions (last 50): ${metrics.totalTransactions}
Unique Contracts Interacted: ${metrics.uniqueContractsInteracted}
Fungible Tokens Held: ${metrics.fungibleTokensHeld}
NFT Count: ${metrics.nftCount}
Average Transaction Frequency: ${metrics.avgTransactionFrequency}
Largest Transaction: ${metrics.largestTransaction} microSTX

Recent Transaction Types:
${transactions.slice(0, 20).map(tx => `- ${tx.tx_type}: ${tx.tx_status} (fee: ${tx.fee_rate})`).join("\n")}

Contract Interactions:
${[...new Set(transactions.filter(tx => tx.contract_call).map(tx => tx.contract_call?.contract_id))].slice(0, 10).join("\n")}
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a blockchain analyst specializing in wallet behavior classification on the Stacks blockchain.

Classify wallets into exactly ONE of these categories:
- trader: Active trading behavior, frequent swaps, interacts with DEXs, profit-seeking patterns
- dao: Governance participation, voting, treasury management, multi-sig patterns
- bridge: Cross-chain transfers, wrapping/unwrapping assets, high-value transfers between chains
- bot: High-frequency transactions, automated patterns, very regular timing, minimal variation
- whale: Very large holdings (>100K STX), large individual transactions, market-moving potential

Respond in valid JSON format only:
{
  "classification": "trader|dao|bridge|bot|whale",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification"
}`,
      },
      {
        role: "user",
        content: `Classify this Stacks wallet based on its on-chain activity:\n\n${walletSummary}`,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Failed to get classification from AI");
  }

  // Parse AI response
  let parsed: { classification: WalletClassification; confidence: number; reasoning: string };

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Failed to parse AI classification response: ${content}`);
  }

  // Validate classification
  const validClassifications: WalletClassification[] = ["trader", "dao", "bridge", "bot", "whale"];
  if (!validClassifications.includes(parsed.classification)) {
    parsed.classification = "trader"; // Default fallback
  }

  return {
    address,
    classification: parsed.classification,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    reasoning: parsed.reasoning || "Classification based on on-chain activity patterns",
    metrics,
  };
}
