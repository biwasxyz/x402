// NFT Portfolio Valuation Service
import { fetchNftHoldings } from "./hiro/client";
import { getOpenRouter } from "./openrouter.service";
import { NftHolding } from "./hiro/types";

// Result types
export interface NftCollectionSummary {
  contractId: string;
  collectionName: string;
  itemsOwned: number;
  estimatedFloorPrice: number;
  estimatedValue: number;
  items: Array<{
    tokenId: string;
    estimatedValue: number;
  }>;
}

export interface NftPortfolioValuation {
  address: string;
  totalNfts: number;
  totalCollections: number;
  estimatedTotalValue: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  collections: NftCollectionSummary[];
  topHoldings: Array<{
    contractId: string;
    tokenId: string;
    collectionName: string;
    estimatedValue: number;
  }>;
  insights: string[];
  recommendation: string;
}

// Known collection floor prices (hardcoded for demo, would be fetched from marketplace)
const KNOWN_COLLECTIONS: Record<string, { name: string; floorPrice: number }> = {
  "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild": {
    name: "The Explorer Guild",
    floorPrice: 50,
  },
  "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.megapont-ape-club-nft": {
    name: "Megapont Ape Club",
    floorPrice: 200,
  },
  "SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.megapont-robot-expansion-nft": {
    name: "Megapont Robots",
    floorPrice: 80,
  },
  "SPNWZ5V2TPWGQGVDR6T7B6RQ4XMGZ4PXTEE0VQ0S.bitcoin-monkeys": {
    name: "Bitcoin Monkeys",
    floorPrice: 30,
  },
  "SP1CSHTKVHMMQJ7PRQRFYW6SB4QAW6SR3XY2F81PA.stacks-punks-v3": {
    name: "Stacks Punks",
    floorPrice: 150,
  },
  "SPJW1XE278YMCEYMXB8ZFGJMH8ZVAAEDP2S2PJYG.stacks-parrots": {
    name: "Stacks Parrots",
    floorPrice: 25,
  },
  "SP176ZMV706NZGDDX8VSQRGMB7QN33BBDVZ6BMNHD.project-indigo-act1": {
    name: "Project Indigo",
    floorPrice: 45,
  },
};

// Default floor price for unknown collections
const DEFAULT_FLOOR_PRICE = 10;

function extractContractId(assetIdentifier: string): string {
  // Format: contract_id::asset_name
  const parts = assetIdentifier.split("::");
  return parts[0];
}

function extractTokenId(value: { repr: string }): string {
  // Extract token ID from repr (e.g., "u123" -> "123")
  const match = value.repr.match(/u(\d+)/);
  return match ? match[1] : value.repr;
}

function getCollectionInfo(contractId: string): { name: string; floorPrice: number } {
  return KNOWN_COLLECTIONS[contractId] || {
    name: contractId.split(".").pop() || "Unknown Collection",
    floorPrice: DEFAULT_FLOOR_PRICE,
  };
}

export async function valuateNftPortfolio(address: string): Promise<NftPortfolioValuation> {
  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,}$/i)) {
    throw new Error("Invalid Stacks address format");
  }

  // Fetch NFT holdings
  const holdingsResponse = await fetchNftHoldings(address, 200, 0, "/api/nft/portfolio-valuation");
  const holdings = holdingsResponse.results || [];

  if (holdings.length === 0) {
    return {
      address,
      totalNfts: 0,
      totalCollections: 0,
      estimatedTotalValue: { low: 0, mid: 0, high: 0, currency: "STX" },
      collections: [],
      topHoldings: [],
      insights: ["This address does not hold any NFTs."],
      recommendation: "Consider exploring Stacks NFT collections to diversify your portfolio.",
    };
  }

  // Group by collection
  const collectionMap = new Map<string, NftHolding[]>();
  for (const nft of holdings) {
    const contractId = extractContractId(nft.asset_identifier);
    if (!collectionMap.has(contractId)) {
      collectionMap.set(contractId, []);
    }
    collectionMap.get(contractId)!.push(nft);
  }

  // Calculate collection summaries
  const collections: NftCollectionSummary[] = [];
  let totalValueLow = 0;
  let totalValueMid = 0;
  let totalValueHigh = 0;

  for (const [contractId, nfts] of collectionMap) {
    const info = getCollectionInfo(contractId);
    const floorPrice = info.floorPrice;

    const items = nfts.map(nft => ({
      tokenId: extractTokenId(nft.value),
      estimatedValue: floorPrice, // Floor price as estimate
    }));

    const collectionValue = floorPrice * nfts.length;

    collections.push({
      contractId,
      collectionName: info.name,
      itemsOwned: nfts.length,
      estimatedFloorPrice: floorPrice,
      estimatedValue: collectionValue,
      items,
    });

    // Value ranges: low (70%), mid (100%), high (150% of floor)
    totalValueLow += collectionValue * 0.7;
    totalValueMid += collectionValue;
    totalValueHigh += collectionValue * 1.5;
  }

  // Sort collections by value
  collections.sort((a, b) => b.estimatedValue - a.estimatedValue);

  // Get top holdings
  const topHoldings = collections
    .flatMap(c => c.items.map(item => ({
      contractId: c.contractId,
      tokenId: item.tokenId,
      collectionName: c.collectionName,
      estimatedValue: item.estimatedValue,
    })))
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 10);

  // Build summary for AI analysis
  const summary = `
NFT Portfolio Analysis for: ${address}

Total NFTs: ${holdings.length}
Total Collections: ${collections.length}

Collections:
${collections.map(c =>
  `- ${c.collectionName}: ${c.itemsOwned} items, Floor ${c.estimatedFloorPrice} STX, Total ${c.estimatedValue} STX`
).join("\n")}

Estimated Portfolio Value (STX):
- Low: ${totalValueLow.toFixed(0)}
- Mid: ${totalValueMid.toFixed(0)}
- High: ${totalValueHigh.toFixed(0)}

Top Holdings:
${topHoldings.slice(0, 5).map(h =>
  `- ${h.collectionName} #${h.tokenId}: ${h.estimatedValue} STX`
).join("\n")}

Provide:
1. 3-5 insights about this NFT portfolio
2. Strategic recommendation for the holder
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a Stacks NFT portfolio analyst.

Analyze NFT portfolios and provide:
- Insights about collection diversity and quality
- Market positioning of holdings
- Risk assessment (concentration, liquidity)
- Strategic recommendations (hold, sell, diversify)

Consider:
- Blue chip collections vs speculative holdings
- Floor price trends (conceptual)
- Portfolio concentration risk

Respond in valid JSON format only:
{
  "insights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
  "recommendation": "Strategic recommendation for portfolio optimization"
}`,
      },
      {
        role: "user",
        content: summary,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let parsed: { insights: string[]; recommendation: string };

  try {
    if (content && typeof content === "string") {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } else {
      throw new Error("Invalid response");
    }
  } catch (e) {
    parsed = {
      insights: [
        `Portfolio contains ${holdings.length} NFTs across ${collections.length} collections.`,
        "Consider diversification across multiple collections to reduce risk.",
      ],
      recommendation: "Monitor floor prices and consider taking profits on appreciated holdings.",
    };
  }

  return {
    address,
    totalNfts: holdings.length,
    totalCollections: collections.length,
    estimatedTotalValue: {
      low: Math.round(totalValueLow),
      mid: Math.round(totalValueMid),
      high: Math.round(totalValueHigh),
      currency: "STX",
    },
    collections,
    topHoldings,
    insights: parsed.insights || [],
    recommendation: parsed.recommendation || "Review portfolio regularly.",
  };
}
