import { McpClient } from "./mcpClient.js";
import { LLMClient } from "./llmClient.js";

export class Agent {
  constructor(
    private llm: LLMClient,
    private mcp: McpClient,
    private tools: any[],
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
      const response = await this.llm.chat(messages, this.tools);
      //console.log("RESPONSE:", response);
      // CASE 1: FINAL ANSWER
      if (!response.tool_calls || response.tool_calls.length === 0) {
        console.log("NO TOOL CALLS");
        //console.log("RESPONSE:", response);
        return response.content;
      }

      // CASE 2: TOOL CALLS
      messages.push({
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

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // loop continues → LLM sees tool result next iteration
    }
  }

  //   async run(userInput: string) {
  //     const messages: any[] = [
  //       {
  //         role: "system",
  //         content: "You are a grocery + recipe assistant. Use tools when needed.",
  //       },
  //       {
  //         role: "user",
  //         content: userInput,
  //       },
  //     ];

  //     while (true) {
  //       try {
  //         const response = await this.llm.chat(messages, this.tools);

  //         // CASE 1: normal response (no tool call)
  //         if (!response.tool_calls) {
  //           console.log("NO TOOL CALLS");
  //           console.log("RESPONSE:", response);
  //           return response.content;
  //         }

  //         // CASE 2: tool call
  //         for (const toolCall of response.tool_calls) {
  //           const name = toolCall.function.name;
  //           console.log("TOOL CALL: ", name);
  //           const args = JSON.parse(toolCall.function.arguments);
  //           console.log("ARGS: ", args);

  //           const result = await this.mcp.callTool(name, args);
  //           //console.log("Successfully called tool, result:", result);

  //           // feed tool result back into LLM
  //           messages.push(response);

  //           messages.push({
  //             role: "tool",
  //             tool_call_id: toolCall.id,
  //             content: JSON.stringify(result),
  //           });
  //         }
  //       } catch (err) {
  //         console.error("Error:", err);
  //         break;
  //       }
  //     }
  //   }
}
