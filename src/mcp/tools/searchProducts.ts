import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();
const instacartClient = new InstacartClient(cookie);
export const searchProductsTool = {
  name: "search_products",

  description: "Search Instacart for grocery products.",

  schema: z.object({
    query: z.string(),

    zip_code: z.string().optional(),
    store: z.string().optional(),

    page: z.number().int().optional().default(1),
    limit: z.number().int().optional().default(10),
  }),

  handler: async (args: any) => {
    console.log("SEARCH_PRODUCTS");
    console.log("TOOLS INPUT", args);

    if (!args.query) {
      throw new Error("query is required");
    }

    const searchParams: {
      query: string;
      zip_code?: string;
      store?: string;
      page?: number;
      limit?: number;
    } = {
      query: args.query,
      page: args.page ?? 1,
      limit: args.limit ?? 10,
    };

    if (args.zip_code) searchParams.zip_code = args.zip_code;
    if (args.store) searchParams.store = args.store;

    const result = await instacartClient.searchProducts(searchParams);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
