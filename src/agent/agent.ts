import { McpClient } from "./mcpClient.js";
import { LLMClient } from "./llmClient.js";
export class Agent {
  private messages: any[];

  constructor(
    private llm: LLMClient,
    private mcp: McpClient,
    private tools: any[],
  ) {
    this.messages = [
      {
        role: "system",
        content: "You are a grocery + recipe assistant. Use tools when needed.",
      },
    ];
  }

  async run(userInput: string) {
    this.messages.push({
      role: "user",
      content: userInput,
    });

    while (true) {
      const response = await this.llm.chat(this.messages, this.tools);

      // FINAL ANSWER
      if (!response.tool_calls || response.tool_calls.length === 0) {
        console.log("NO TOOL CALLS");

        this.messages.push({
          role: "assistant",
          content: response.content,
        });

        return response.content;
      }

      // TOOL CALLS
      this.messages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.tool_calls,
      });

      for (const toolCall of response.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log("TOOL CALL:", name);
        console.log("ARGS:", args);

        const result = await this.mcp.callTool(name, args);

        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }
}
