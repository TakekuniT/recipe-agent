import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/server/transport.js";

import { searchRecipesTool } from "./tools/searchRecipes.js";
import { getRecipeTool } from "./tools/getRecipe.js";
import { searchProductsTool } from "./tools/searchProducts.js";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "recipe-grocery-agent",
  version: "1.0.0",
});

const tools = [getRecipeTool];

// for (const tool of tools) {
//   server.tool(tool.name, tool.description, tool.schema.shape, tool.handler);
// }
for (const tool of tools) {
  server.registerTool(tool.name, tool.schema, tool.handler);
}

const transport = new StreamableHTTPServerTransport();

transport.onclose = () => {};

await server.connect(transport as Transport);
app.post("/mcp", async (req, res) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}/mcp`);
});
