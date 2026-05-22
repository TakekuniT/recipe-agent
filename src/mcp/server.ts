import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
//import type { Transport } from "@modelcontextprotocol/sdk/server/transport.js";

import { searchRecipesTool } from "./tools/searchRecipes.js";
import { getRecipeTool } from "./tools/getRecipe.js";
import { searchProductsTool } from "./tools/searchProducts.js";
import { getProductDetailsTool } from "./tools/getProductDetails.js";
import { estimateRecipeCostTool } from "./tools/estimateRecipeCost.js";

import { randomUUID } from "node:crypto";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "recipe-grocery-agent",
  version: "1.0.0",
});

const tools = [
  getRecipeTool,
  searchRecipesTool,
  searchProductsTool,
  getProductDetailsTool,
  estimateRecipeCostTool,
];

// for (const tool of tools) {
//   server.tool(tool.name, tool.description, tool.schema.shape, tool.handler);
// }
// console.log("RAW SCHEMA:", getRecipeTool.schema.shape);
// for (const tool of tools) {
//   console.log(tool.name);
//   console.log("SCHEMA:", tool.schema);
// }
for (const tool of tools) {
  server.tool(
    tool.name,
    tool.description,
    tool.schema.shape,
    tool.handler as any,
  );
}

//const transport = new StreamableHTTPServerTransport();

//transport.onclose = () => {};

//await server.connect(transport as any);

app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport(); // stateless by default
    res.on("close", () => transport.close());
    await server.connect(transport as any);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
// app.post("/mcp", async (req, res) => {
//   try {
//     await transport.handleRequest(req, res, req.body);
//   } catch (err) {
//     console.error("MCP error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.get("/debug/tools", (req, res) => {
  res.json({
    tools: tools.map((t) => ({
      name: t.name,
      hasSchema: !!t.schema,
    })),
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}/mcp`);
});
