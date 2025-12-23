import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";

// Test function to fetch news about Stacks and Bitcoin
async function testGetStacksAndBitcoinNews(): Promise<void> {
  console.log("🧪 Testing Grok 4.1 Fast with OpenRouter SDK...\n");
  console.log("API Key:", process.env.OPENROUTER_API_KEY ? "✓ Set" : "✗ Not set");
  console.log("Model: x-ai/grok-4.1-fast");
  console.log("=" .repeat(60));
  console.log("Fetching news... (this may take 30-60 seconds)\n");

  try {
    const openRouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openRouter.chat.send({
      model: "x-ai/grok-4.1-fast:online", // :online enables web search and X search
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that provides the latest news and updates about Stacks blockchain and Bitcoin. Provide concise, accurate, and up-to-date information from reliable sources.",
        },
        {
          role: "user",
          content:
            "What are the latest news and developments about Stacks and Bitcoin? Please provide a comprehensive summary of recent updates, price movements, technological developments, and important announcements.",
        },
      ],
      stream: false,
    });

    console.log("✅ SUCCESS!\n");
    console.log("=" .repeat(60));
    console.log("📰 NEWS CONTENT:\n");
    console.log(completion.choices[0].message.content || "Unable to fetch news at this time.");
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 API Response Details:");
    console.log("Model used:", completion.model);
    console.log("Finish reason:", completion.choices[0]?.finishReason);
    console.log("Total tokens:", completion.usage?.totalTokens);
  } catch (error: any) {
    console.error("\n❌ ERROR:\n");
    console.error("Message:", error.message);
    console.error("\nFull error:", error);
  }
}

testGetStacksAndBitcoinNews();
