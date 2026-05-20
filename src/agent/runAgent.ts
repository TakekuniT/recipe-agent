import dotenv from "dotenv";
import readline from "readline";
import { Agent } from "./agent.js";
import { LLMClient } from "./llmClient.js";
import { McpClient } from "./mcpClient.js";

dotenv.config();

const llm = new LLMClient(process.env.OPENROUTER_API_KEY!);

const mcp = new McpClient("http://localhost:3000/mcp");

const agent = new Agent(llm, mcp);

// simple CLI loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Agent ready. Ask something:");

function ask() {
  rl.question("> ", async (input) => {
    try {
      const result = await agent.run(input);
      console.log("\nAgent:", result, "\n");
    } catch (err) {
      console.error("Error:", err);
    }

    ask();
  });
}

ask();
