import { McpClient } from "./mcpClient.js";
import { LLMClient } from "./llmClient.js";

export class Agent {
  constructor(
    private llm: LLMClient,
    private mcp: McpClient,
  ) {}

  async run(userInput: string) {
    const messages: any[] = [
      {
        role: "system",
        content: "You are a grocery + recipe assistant. Use tools when needed.",
      },
      {
        role: "user",
        content: userInput,
      },
    ];

    while (true) {
      const response = await this.llm.chat(messages);

      // CASE 1: normal response (no tool call)
      if (!response.tool_calls) {
        console.log("NO TOOL CALLS");
        return response.content;
      }

      // CASE 2: tool call
      for (const toolCall of response.tool_calls) {
        const name = toolCall.function.name;
        console.log("TOOL CALL: ", name);
        const args = JSON.parse(toolCall.function.arguments);
        console.log("ARGS: ", args);

        const result = await this.mcp.callTool(name, args);

        // feed tool result back into LLM
        messages.push(response);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }
}
