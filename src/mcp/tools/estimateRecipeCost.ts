import { z } from "zod";

import { InstacartClient } from "../../clients/instacart.js";
import { allRecipesClient } from "../../clients/allrecipes.js";

import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);

// ======================================================
// HELPERS
// ======================================================

function extractNumber(value?: string | null): number | null {
  if (!value) return null;

  const match = value.match(/[\d.]+/);

  if (!match) return null;

  const num = parseFloat(match[0]);

  return Number.isFinite(num) ? num : null;
}

function parsePrice(price?: string | null): number | null {
  if (!price) return null;

  const cleaned = price.replace(/[^0-9.]/g, "");

  const num = parseFloat(cleaned);

  return Number.isFinite(num) ? num : null;
}

function normalizeUnit(unit?: string | null): string | null {
  if (!unit) return null;

  const u = unit.toLowerCase().trim();

  const map: Record<string, string> = {
    tbsp: "tablespoon",
    tablespoons: "tablespoon",

    tsp: "teaspoon",
    teaspoons: "teaspoon",

    cups: "cup",

    lbs: "lb",
    pounds: "lb",

    ounces: "oz",
    ounce: "oz",

    grams: "g",
    kilogram: "kg",
    kilograms: "kg",

    cloves: "clove",
    cans: "can",

    packages: "package",
  };

  return map[u] ?? u;
}

function parseProductSize(size?: string | null): {
  quantity: number | null;
  unit: string | null;
} {
  if (!size) {
    return {
      quantity: null,
      unit: null,
    };
  }

  const lower = size.toLowerCase();

  const match = lower.match(/([\d.]+)\s*([a-zA-Z]+)/);

  if (!match) {
    return {
      quantity: null,
      unit: null,
    };
  }

  return {
    quantity: parseFloat(match[1]!),
    unit: normalizeUnit(match[2]),
  };
}

function convertUnits(params: {
  amount: number;
  fromUnit?: string | null;
  toUnit?: string | null;
}): number | null {
  const from = normalizeUnit(params.fromUnit);
  const to = normalizeUnit(params.toUnit);

  if (!from || !to) return null;

  if (from === to) return params.amount;

  // volume
  const volume: Record<string, number> = {
    teaspoon: 1,
    tablespoon: 3,
    cup: 48,
  };

  // weight
  const weight: Record<string, number> = {
    oz: 1,
    lb: 16,
    g: 0.035274,
    kg: 35.274,
  };

  if (volume[from] && volume[to]) {
    return (params.amount * volume[from]) / volume[to];
  }

  if (weight[from] && weight[to]) {
    return (params.amount * weight[from]) / weight[to];
  }

  return null;
}

function estimateIngredientCost(params: {
  ingredientAmount?: number | null;
  ingredientUnit?: string | null;

  productPrice?: number | null;
  productSize?: string | null;
}) {
  const { ingredientAmount, ingredientUnit, productPrice, productSize } =
    params;

  if (!productPrice) {
    return {
      estimatedCost: null,
      matchQuality: "low",
    };
  }

  if (!ingredientAmount || !ingredientUnit || !productSize) {
    return {
      estimatedCost: productPrice,
      matchQuality: "medium",
    };
  }

  const parsedSize = parseProductSize(productSize);

  if (!parsedSize.quantity || !parsedSize.unit) {
    return {
      estimatedCost: productPrice,
      matchQuality: "medium",
    };
  }

  const convertedAmount = convertUnits({
    amount: ingredientAmount,
    fromUnit: ingredientUnit,
    toUnit: parsedSize.unit,
  });

  if (!convertedAmount) {
    return {
      estimatedCost: productPrice,
      matchQuality: "medium",
    };
  }

  const ratio = convertedAmount / parsedSize.quantity;

  return {
    estimatedCost: Number((productPrice * ratio).toFixed(2)),
    matchQuality: "high",
  };
}

// ======================================================
// TOOL
// ======================================================

export const estimateRecipeCostTool = {
  name: "estimate_recipe_cost",

  description:
    "Estimate grocery cost for a recipe by matching ingredients to Instacart grocery products.",

  schema: z.object({
    recipe_id: z.string().optional(),

    url: z.string().url().optional(),

    zip_code: z.string().optional(),

    store: z.string().optional(),

    servings: z.number().int().positive().optional(),
  }),

  handler: async (extra: any) => {
    const args = extra.arguments as {
      recipe_id?: string;
      url?: string;

      zip_code?: string;
      store?: string;

      servings?: number;
    };

    if (!args.recipe_id && !args.url) {
      throw new Error("recipe_id or url is required");
    }

    // ======================================================
    // GET RECIPE
    // ======================================================

    const recipeParams: Parameters<typeof allRecipesClient.getRecipe>[0] = {};

    if (args.recipe_id !== undefined) {
      recipeParams.recipeId = args.recipe_id;
    }

    if (args.url !== undefined) {
      recipeParams.url = args.url;
    }

    const recipe = await allRecipesClient.getRecipe(recipeParams);

    // ======================================================
    // SERVING SCALE
    // ======================================================

    let scaleFactor = 1;

    const recipeServings = extractNumber(recipe.servings);

    if (args.servings && recipeServings) {
      scaleFactor = args.servings / recipeServings;
    }

    // ======================================================
    // MATCH INGREDIENTS
    // ======================================================

    let totalEstimatedCost = 0;

    const ingredientBreakdown = [];

    for (const ingredient of recipe.ingredients) {
      const parsedIngredient = ingredient as any;

      const ingredientName =
        parsedIngredient.name ??
        parsedIngredient.ingredient ??
        parsedIngredient.raw;

      const amount =
        (parsedIngredient.amount ?? parsedIngredient.quantity ?? 1) *
        scaleFactor;

      const unit = parsedIngredient.unit ?? null;

      let searchResult;

      try {
        const searchParams: Parameters<
          typeof instacartClient.searchProducts
        >[0] = {
          query: ingredientName,
          limit: 5,
        };

        if (args.zip_code !== undefined) {
          searchParams.zip_code = args.zip_code;
        }

        if (args.store !== undefined) {
          searchParams.store = args.store;
        }

        searchResult = await instacartClient.searchProducts(searchParams);
      } catch (err) {
        ingredientBreakdown.push({
          ingredient: ingredient.raw,

          matched: false,

          error:
            err instanceof Error ? err.message : "Failed to search products",
        });

        continue;
      }

      const bestMatch: any = searchResult.results?.[0];

      if (!bestMatch) {
        ingredientBreakdown.push({
          ingredient: ingredient.raw,

          matched: false,

          error: "No matching products found",
        });

        continue;
      }

      const productPrice = parsePrice(bestMatch.price);

      const estimate = estimateIngredientCost({
        ingredientAmount: amount,
        ingredientUnit: unit,

        productPrice,
        productSize: bestMatch.unitSize,
      });

      if (estimate.estimatedCost) {
        totalEstimatedCost += estimate.estimatedCost;
      }

      ingredientBreakdown.push({
        ingredient: ingredient.raw,

        scaledAmount: amount,

        unit,

        matched: true,

        matchQuality: estimate.matchQuality,

        product: {
          product_id: bestMatch.productId,

          name: bestMatch.productName,

          brand: bestMatch.brand,

          price: bestMatch.price,

          unit_size: bestMatch.unitSize,

          store: bestMatch.storeName,

          image_url: bestMatch.imageUrl,

          product_url: bestMatch.productUrl,
        },

        estimatedIngredientCost: estimate.estimatedCost,
      });
    }

    // ======================================================
    // RETURN
    // ======================================================

    return {
      content: [
        {
          type: "text" as const,

          text: JSON.stringify(
            {
              recipe: {
                id: recipe.id,
                title: recipe.title,
                servings: recipe.servings,
                scaled_servings: args.servings ?? recipe.servings,
                source_url: recipe.sourceUrl,
              },

              pricing_context: {
                zip_code: args.zip_code ?? null,
                store: args.store ?? null,
              },

              totals: {
                estimated_total_cost: Number(totalEstimatedCost.toFixed(2)),

                ingredient_count: ingredientBreakdown.length,
              },

              ingredients: ingredientBreakdown,

              matching_notes: {
                strategy:
                  "Uses Instacart product search to find the best grocery match for each recipe ingredient.",

                unit_conversion_support: [
                  "teaspoon",
                  "tablespoon",
                  "cup",
                  "oz",
                  "lb",
                  "g",
                  "kg",
                ],

                limitations: [
                  "Density-based conversions are not supported.",
                  "Package counts and produce sizing may be inaccurate.",
                  "Ingredient matching is keyword-based and may select imperfect products.",
                  "Some products only expose total package pricing.",
                ],
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
