import { z } from "zod";
import { allRecipesClient } from "../../clients/allrecipes.js";

export const searchRecipesTool = {
  name: "search_recipes",

  description:
    "Search Allrecipes by query with optional filters like cuisine, dietary restrictions, and cook time.",

  schema: z.object({
    query: z.string(),

    cuisine: z.string().optional(),
    dietary: z.string().optional(),

    max_cook_time_minutes: z.number().int().optional(),

    page: z.number().int().optional().default(1),

    limit: z.number().int().optional().default(10),
  }),

  handler: async (extra: any) => {
    const args = extra.arguments as {
      query: string;
      cuisine?: string;
      dietary?: string;
      max_cook_time_minutes?: number;
      page?: number;
      limit?: number;
    };

    if (!args.query) {
      throw new Error("query is required");
    }

    const searchArgs: any = {
      query: args.query,
      page: args.page ?? 1,
      limit: args.limit ?? 10,
    };

    if (args.cuisine !== undefined) {
      searchArgs.cuisine = args.cuisine;
    }

    if (args.dietary !== undefined) {
      searchArgs.dietary = args.dietary;
    }

    if (args.max_cook_time_minutes !== undefined) {
      searchArgs.maxCookTimeMinutes = args.max_cook_time_minutes;
    }

    const results = await allRecipesClient.searchRecipes(searchArgs);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  },
};
