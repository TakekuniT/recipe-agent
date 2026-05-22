import { z } from "zod";

import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);

// ======================================================
// HELPERS
// ======================================================

function parsePrice(price?: string | null): number | null {
  if (!price) return null;

  const cleaned = price.replace(/[^0-9.]/g, "");

  const num = parseFloat(cleaned);

  return Number.isFinite(num) ? num : null;
}

function normalizeReason(reason?: string | null): string {
  return reason?.toLowerCase().trim() ?? "";
}

function buildSearchQueries(params: {
  ingredient: string;
  reason?: string;
}): string[] {
  const ingredient = params.ingredient.toLowerCase();

  const reason = normalizeReason(params.reason);

  const substitutions: Record<string, string[]> = {
    milk: ["oat milk", "almond milk", "soy milk", "coconut milk"],

    butter: ["olive oil", "vegan butter", "coconut oil"],

    egg: ["flax egg", "egg substitute", "applesauce"],

    eggs: ["flax egg", "egg substitute", "applesauce"],

    cream: ["coconut cream", "greek yogurt", "cashew cream"],

    peanut: ["almond", "cashew", "sunflower seed"],

    peanuts: ["almond", "cashew", "sunflower seed"],

    "fish sauce": ["soy sauce", "tamari", "coconut aminos"],

    "soy sauce": ["tamari", "coconut aminos"],

    flour: ["almond flour", "oat flour", "gluten free flour"],

    sugar: ["honey", "maple syrup", "brown sugar"],

    cheese: ["nutritional yeast", "vegan cheese"],

    chicken: ["tofu", "tempeh", "jackfruit"],

    beef: ["mushrooms", "lentils", "tofu"],
  };

  let queries: string[] = [];

  for (const key of Object.keys(substitutions)) {
    if (ingredient.includes(key)) {
      queries.push(...substitutions[key]!);
    }
  }

  // dietary overrides
  if (reason.includes("vegan")) {
    queries.push("tofu", "vegan butter", "plant based milk");
  }

  if (reason.includes("gluten")) {
    queries.push("gluten free flour", "tamari");
  }

  if (reason.includes("dairy")) {
    queries.push("oat milk", "almond milk", "vegan cheese");
  }

  if (reason.includes("nut allergy")) {
    queries.push("sunflower seed butter", "pumpkin seeds");
  }

  if (queries.length === 0) {
    queries.push(`${ingredient} substitute`);
  }

  return Array.from(new Set(queries)).slice(0, 8);
}

// ======================================================
// TOOL
// ======================================================

export const findSubstitutionsTool = {
  name: "find_substitutions",

  description:
    "Suggest ingredient substitutions with grocery pricing from Instacart.",

  schema: z.object({
    ingredient: z.string(),

    reason: z.string().optional(),

    zip_code: z.string().optional(),

    store: z.string().optional(),

    limit: z.number().int().positive().optional().default(5),
  }),

  handler: async (args: any) => {
    console.log("FIND_SUBSTITUTIONS");
    console.log("TOOLS INPUT", args);

    if (!args.ingredient) {
      throw new Error("ingredient is required");
    }

    const queries = buildSearchQueries({
      ingredient: args.ingredient,
      reason: args.reason,
    });

    const substitutions = [];

    for (const query of queries) {
      try {
        const searchParams: {
          query: string;
          limit: number;
          zip_code?: string;
          store?: string;
        } = {
          query,
          limit: args.limit ?? 5,
        };

        if (args.zip_code) {
          searchParams.zip_code = args.zip_code;
        }

        if (args.store) {
          searchParams.store = args.store;
        }

        const results = await instacartClient.searchProducts(searchParams);

        const bestMatch: any = results.results?.[0];

        if (!bestMatch) {
          continue;
        }

        substitutions.push({
          substitution: query,

          reason: args.reason ?? null,

          pricing: {
            price: bestMatch.price ?? null,
            parsed_price: parsePrice(bestMatch.price),
          },

          product: {
            product_id: bestMatch.productId,

            name: bestMatch.productName,

            brand: bestMatch.brand,

            unit_size: bestMatch.unitSize,

            store: bestMatch.storeName,

            image_url: bestMatch.imageUrl,

            product_url: bestMatch.productUrl,
          },
        });
      } catch (err) {
        substitutions.push({
          substitution: query,

          error:
            err instanceof Error
              ? err.message
              : "Failed to search substitution",
        });
      }
    }

    return {
      content: [
        {
          type: "text" as const,

          text: JSON.stringify(
            {
              ingredient: args.ingredient,

              reason: args.reason ?? null,

              pricing_context: {
                zip_code: args.zip_code ?? null,
                store: args.store ?? null,
              },

              total_substitutions: substitutions.length,

              substitutions,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
