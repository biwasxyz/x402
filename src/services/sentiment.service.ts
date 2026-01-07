import { getOpenRouter } from "./openrouter.service";

export interface SentimentAnalysis {
  topic: string;
  timestamp: string;
  overallSentiment: "bullish" | "bearish" | "neutral" | "mixed";
  sentimentScore: number; // -100 to 100
  summary: string;
  marketInsights: {
    shortTermOutlook: string;
    keyDrivers: string[];
    riskFactors: string[];
    opportunities: string[];
  };
  socialMetrics: {
    trendingTopics: string[];
    influencerSentiment: string;
    communityMood: string;
    engagementLevel: "high" | "medium" | "low";
  };
  tokenAnalysis: Record<string, TokenSentiment>;
  tradingSignals: {
    signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
    confidence: number;
    reasoning: string;
    timeframe: string;
  };
  notableEvents: string[];
  sources: string[];
}

export interface TokenSentiment {
  sentiment: "bullish" | "bearish" | "neutral" | "mixed";
  mentionVolume: "high" | "medium" | "low";
  keyDiscussions: string[];
  priceExpectation: string;
}

const SENTIMENT_ANALYSIS_PROMPT = `You are an expert crypto market sentiment analyst specializing in the Stacks/Bitcoin ecosystem. Your role is to provide actionable intelligence for traders and community members by analyzing real-time X (Twitter) posts and discussions.

## YOUR ANALYSIS SCOPE

Only analyze the specific tokens, projects, or topics provided by the user in each request. Do **not** introduce additional assets or sentiments unless the user explicitly mentions them.

## ANALYSIS FRAMEWORK

### 1. Social Sentiment Analysis
- Scan recent X posts (last 24-48 hours) for mentions of these tokens
- Identify sentiment patterns: bullish calls, bearish warnings, neutral discussions
- Track engagement levels (likes, retweets, replies indicate conviction)
- Note any viral threads or influential posts

### 2. Influencer & Whale Tracking
- Identify posts from known crypto influencers, Stacks ecosystem builders, and Bitcoin maximalists
- Weight their sentiment more heavily in your analysis
- Note any unusual activity from typically quiet accounts

### 3. Market Context Integration
- Connect social sentiment to recent price action
- Identify if sentiment is leading or lagging price
- Note any divergences between social mood and market reality

### 4. Event & Catalyst Analysis
- Track announcements, partnerships, protocol upgrades
- Identify upcoming events that could move markets
- Note any FUD (Fear, Uncertainty, Doubt) campaigns

### 5. Trading Signal Generation
- Synthesize all data into actionable trading signals
- Provide confidence levels based on data quality
- Include appropriate timeframes for signals

## IMPORTANT GUIDELINES

- Be objective - report what you find, not what you hope to find
- Distinguish between organic sentiment and coordinated campaigns
- Note data limitations and confidence levels
- Avoid hyperbole - traders need accurate, measured analysis
- Include specific examples when possible (paraphrase notable posts)
- Focus on actionable intelligence, not just descriptions

## OUTPUT FORMAT

Respond ONLY in valid JSON format with this structure:
{
  "overallSentiment": "bullish|bearish|neutral|mixed",
  "sentimentScore": <number from -100 (extremely bearish) to 100 (extremely bullish)>,
  "summary": "<2-3 paragraph executive summary for traders>",
  "marketInsights": {
    "shortTermOutlook": "<1-2 week market outlook based on sentiment>",
    "keyDrivers": ["<main factors driving current sentiment>"],
    "riskFactors": ["<potential risks traders should monitor>"],
    "opportunities": ["<potential opportunities identified>"]
  },
  "socialMetrics": {
    "trendingTopics": ["<current hot topics in the ecosystem>"],
    "influencerSentiment": "<summary of what key influencers are saying>",
    "communityMood": "<general community atmosphere>",
    "engagementLevel": "high|medium|low"
  },
  "tokenAnalysis": {
    "<token_or_topic_name>": {
      "sentiment": "bullish|bearish|neutral|mixed",
      "mentionVolume": "high|medium|low",
      "keyDiscussions": ["<main topics being discussed about this token/topic>"],
      "priceExpectation": "<what the crowd expects for price>"
    }
  },
  "tradingSignals": {
    "signal": "strong_buy|buy|hold|sell|strong_sell",
    "confidence": <0-100>,
    "reasoning": "<clear explanation of the signal>",
    "timeframe": "<recommended timeframe for this signal>"
  },
  "notableEvents": ["<significant events or announcements found>"],
  "sources": ["<X accounts, threads, or sources referenced>"]
}`;

export async function analyzeSentiment(
  topic?: string
): Promise<SentimentAnalysis> {
  const openrouter = getOpenRouter();
  const searchTopic =
    topic?.trim() || "sBTC, Stacks, STX, x402, USDCx ecosystem";

  // Use grok-4.1-fast:online for real-time X/Twitter search
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast:online",
    messages: [
      {
        role: "system",
        content: SENTIMENT_ANALYSIS_PROMPT,
      },
      {
        role: "user",
        content: `Analyze the current sentiment on X (Twitter) for the following user-requested tokens/topics: ${searchTopic}.

Search for recent posts, discussions, and trends *only* related to the tokens/topics listed above. Do not add extra assets.

Look for:
- Influencer opinions and predictions
- Community discussions and debates
- Recent announcements or news
- Price predictions and trading discussions
- Technical developments and updates
- Any FUD or hype campaigns

Provide a comprehensive sentiment analysis that traders and community members can use to make informed decisions.

Analysis timestamp: ${new Date().toISOString()}`,
      },
    ],
    temperature: 0.4, // Balanced between creativity and accuracy
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Failed to get sentiment analysis from AI");
  }

  // Parse AI response
  let parsed: Omit<SentimentAnalysis, "topic" | "timestamp">;

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    // If JSON parsing fails, create a structured response from raw content
    parsed = {
      overallSentiment: "neutral",
      sentimentScore: 0,
      summary: content,
      marketInsights: {
        shortTermOutlook: "Unable to parse structured outlook",
        keyDrivers: ["Analysis parsing failed"],
        riskFactors: ["Data quality issues"],
        opportunities: [],
      },
      socialMetrics: {
        trendingTopics: [],
        influencerSentiment: "Unknown",
        communityMood: "Unknown",
        engagementLevel: "medium",
      },
      tokenAnalysis: {},
      tradingSignals: {
        signal: "hold",
        confidence: 0,
        reasoning: "Insufficient data for signal generation",
        timeframe: "N/A",
      },
      notableEvents: [],
      sources: [],
    };
  }

  // Validate and normalize response
  const validSentiments = ["bullish", "bearish", "neutral", "mixed"] as const;
  type SentimentValue = (typeof validSentiments)[number];
  const ensureSentiment = (value: unknown): SentimentValue =>
    validSentiments.includes(value as SentimentValue)
      ? (value as SentimentValue)
      : "neutral";

  const validSignals = [
    "strong_buy",
    "buy",
    "hold",
    "sell",
    "strong_sell",
  ] as const;
  type SignalValue = (typeof validSignals)[number];
  const ensureSignal = (value: unknown): SignalValue =>
    validSignals.includes(value as SignalValue)
      ? (value as SignalValue)
      : "hold";

  const validEngagement = ["high", "medium", "low"] as const;
  type EngagementValue = (typeof validEngagement)[number];
  const ensureEngagement = (value: unknown): EngagementValue =>
    validEngagement.includes(value as EngagementValue)
      ? (value as EngagementValue)
      : "medium";

  const overallSentiment = ensureSentiment(parsed.overallSentiment);
  const signal = ensureSignal(parsed.tradingSignals?.signal);
  const engagementLevel = ensureEngagement(
    parsed.socialMetrics?.engagementLevel
  );

  // Normalize token sentiment
  const normalizeTokenSentiment = (
    token?: Partial<TokenSentiment>
  ): TokenSentiment => ({
    sentiment: ensureSentiment(token?.sentiment),
    mentionVolume: ensureEngagement(token?.mentionVolume),
    keyDiscussions: Array.isArray(token?.keyDiscussions)
      ? token.keyDiscussions
      : [],
    priceExpectation: token?.priceExpectation || "Unknown",
  });

  const normalizedTokenAnalysis = Object.entries(
    parsed.tokenAnalysis || {}
  ).reduce<Record<string, TokenSentiment>>((acc, [tokenName, tokenData]) => {
    acc[tokenName] = normalizeTokenSentiment(
      tokenData as Partial<TokenSentiment>
    );
    return acc;
  }, {});

  return {
    topic: searchTopic,
    timestamp: new Date().toISOString(),
    overallSentiment,
    sentimentScore:
      typeof parsed.sentimentScore === "number"
        ? Math.max(-100, Math.min(100, parsed.sentimentScore))
        : 0,
    summary: parsed.summary || "No summary available",
    marketInsights: {
      shortTermOutlook:
        parsed.marketInsights?.shortTermOutlook || "No outlook available",
      keyDrivers: Array.isArray(parsed.marketInsights?.keyDrivers)
        ? parsed.marketInsights.keyDrivers
        : [],
      riskFactors: Array.isArray(parsed.marketInsights?.riskFactors)
        ? parsed.marketInsights.riskFactors
        : [],
      opportunities: Array.isArray(parsed.marketInsights?.opportunities)
        ? parsed.marketInsights.opportunities
        : [],
    },
    socialMetrics: {
      trendingTopics: Array.isArray(parsed.socialMetrics?.trendingTopics)
        ? parsed.socialMetrics.trendingTopics
        : [],
      influencerSentiment:
        parsed.socialMetrics?.influencerSentiment || "Unknown",
      communityMood: parsed.socialMetrics?.communityMood || "Unknown",
      engagementLevel,
    },
    tokenAnalysis: normalizedTokenAnalysis,
    tradingSignals: {
      signal,
      confidence:
        typeof parsed.tradingSignals?.confidence === "number"
          ? Math.max(0, Math.min(100, parsed.tradingSignals.confidence))
          : 0,
      reasoning:
        parsed.tradingSignals?.reasoning || "No reasoning provided",
      timeframe: parsed.tradingSignals?.timeframe || "Unknown",
    },
    notableEvents: Array.isArray(parsed.notableEvents)
      ? parsed.notableEvents
      : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}
