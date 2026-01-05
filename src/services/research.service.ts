import { openrouter } from "./openrouter.service";

export interface UserResearch {
  username: string;
  platform: string;
  summary: string;
  keyFindings: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  topics: string[];
  sources: string[];
}

export async function researchUser(username: string): Promise<UserResearch> {
  // Clean username input
  const cleanUsername = username.replace(/^@/, "").trim();

  if (!cleanUsername || cleanUsername.length < 2) {
    throw new Error("Invalid username provided");
  }

  // Use grok-4.1-fast with online search capability
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a research analyst with access to real-time web and social media data. Your task is to research users and provide comprehensive profiles based on their online presence.

Research the user thoroughly using X (Twitter), web search, and any available public information. Focus on:
1. Their professional background and expertise
2. Recent activity and posts
3. Key topics they discuss
4. Notable projects or affiliations
5. Community sentiment about them

Respond in valid JSON format only:
{
  "platform": "The primary platform where this user is active (e.g., X/Twitter, GitHub, etc.)",
  "summary": "A comprehensive 2-3 paragraph summary of who this person is and what they do",
  "keyFindings": ["Array of 3-5 key facts or notable points about this user"],
  "sentiment": "positive|neutral|negative|mixed - overall community sentiment toward this user",
  "topics": ["Array of main topics/themes this user discusses or is associated with"],
  "sources": ["Array of source URLs or references where information was found"]
}`,
      },
      {
        role: "user",
        content: `Research the user "${cleanUsername}" and provide a comprehensive profile. Search X/Twitter, web, and any relevant sources to gather information about this person. Include recent activity if available. (Request time: ${new Date().toISOString()})`,
      },
    ],
    temperature: 0.5,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Failed to get research results from AI");
  }

  // Parse AI response
  let parsed: Omit<UserResearch, "username">;

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
      platform: "Unknown",
      summary: content,
      keyFindings: ["Research completed but structured data extraction failed"],
      sentiment: "neutral",
      topics: [],
      sources: [],
    };
  }

  // Validate and normalize response
  const validSentiments = ["positive", "neutral", "negative", "mixed"] as const;
  const sentiment = validSentiments.includes(parsed.sentiment as any)
    ? parsed.sentiment
    : "neutral";

  return {
    username: cleanUsername,
    platform: parsed.platform || "Unknown",
    summary: parsed.summary || "No summary available",
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
    sentiment,
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}
