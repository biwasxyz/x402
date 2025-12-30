import { openrouter } from "./openrouter.service";

export async function getStacksAndBitcoinNews(): Promise<string> {
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that provides the latest news and updates about Stacks blockchain and Bitcoin. Provide concise, accurate, and up-to-date information from reliable sources.",
      },
      {
        role: "user",
        content: `What are the latest news and developments about Stacks and Bitcoin in last 24 hours? Please provide a comprehensive summary of recent updates, price movements, technological developments, and important announcements searching through X and web also provide me the links to it. (Request time: ${new Date().toISOString()})`,
      },
    ],
    temperature: 0.7,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;
  return typeof content === "string" ? content : "Unable to fetch news at this time.";
}
