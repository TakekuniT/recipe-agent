import fetch from "node-fetch";

type MCPToolCallResult = {
  content: { type: "text"; text: string }[];
};

export class McpClient {
  constructor(
    private baseUrl: string, // e.g. http://localhost:3000/mcp
  ) {}

  /**
   * Generic tool call to MCP server
   */
  async callTool<T = any>(
    toolName: string,
    args: Record<string, any>,
  ): Promise<T> {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MCP request failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as any;

    if (json.error) {
      throw new Error(JSON.stringify(json.error));
    }

    // MCP returns structured content array
    const content = json.result?.content;

    if (!content) {
      return json.result;
    }

    // Most of your tools return JSON string inside text
    const text = content?.[0]?.text;

    try {
      return JSON.parse(text);
    } catch {
      return text as T;
    }
  }

  // ----------------------------
  // Strongly typed convenience methods
  // ----------------------------

  searchRecipes(args: {
    query: string;
    cuisine?: string;
    dietary?: string;
    max_cook_time_minutes?: number;
    page?: number;
    limit?: number;
  }) {
    return this.callTool("search_recipes", args);
  }

  getRecipe(args: { recipe_id?: string; url?: string }) {
    return this.callTool("get_recipe", args);
  }

  searchProducts(args: {
    query: string;
    zip_code?: string;
    store?: string;
    page?: number;
    limit?: number;
  }) {
    return this.callTool("search_products", args);
  }

  getProductDetails(args: { product_id?: string; url?: string }) {
    return this.callTool("get_product_details", args);
  }

  estimateRecipeCost(args: {
    recipe_id?: string;
    url?: string;
    zip_code?: string;
    store?: string;
    servings?: number;
  }) {
    return this.callTool("estimate_recipe_cost", args);
  }

  findSubstitutions(args: {
    ingredient: string;
    reason: string;
    dietary_constraint?: string;
    zip_code?: string;
    store?: string;
  }) {
    return this.callTool("find_substitutions", args);
  }
}
