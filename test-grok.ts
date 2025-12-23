import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";

async function testGetStacksAndBitcoinNews(): Promise<void> {
  const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const completion = await openRouter.chat.send({
    model: "x-ai/grok-4.1-fast:online",
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

  console.log(completion.choices[0].message.content);
}

testGetStacksAndBitcoinNews();
