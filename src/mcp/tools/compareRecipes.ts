import { z } from "zod";

import { allRecipesClient } from "../../clients/allrecipes.js";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();
const instacartClient = new InstacartClient(cookie);

// ======================================================
// HELPERS
// ======================================================
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
  if (!size) return { quantity: null, unit: null };

  const match = size.toLowerCase().match(/([\d.]+)\s*([a-zA-Z]+)/);

  if (!match) return { quantity: null, unit: null };

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

  const volume: Record<string, number> = {
    teaspoon: 1,
    tablespoon: 3,
    cup: 48,
  };

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

// ======================================================
// TOOL
// ======================================================

export const compareRecipesTool = {
  name: "compare_recipes",
  description:
    "Compare 2-3 recipes side by side with grocery pricing and merged shopping list.",

  schema: z.object({
    recipe_urls: z.array(z.string().url()).min(2).max(3),
    zip_code: z.string().optional(),
    store: z.string().optional(),
  }),

  handler: async (args: any) => {
    const recipes = await Promise.all(
      args.recipe_urls.map((url: string) =>
        allRecipesClient.getRecipe({ url }),
      ),
    );

    const recipeComparisons: any[] = [];

    // IMPORTANT: no stored cost here → recompute from merged state
    const ingredientMap = new Map<
      string,
      {
        ingredient: string;
        totalAmount: number | null;
        unit: string | null;
        usedInRecipes: string[];
        matches: any[];
        rawVariants: string[];
      }
    >();

    // ======================================================
    // PROCESS RECIPES
    // ======================================================

    for (const recipe of recipes) {
      let recipeCost = 0;
      const matchedIngredients: any[] = [];

      for (const ingredient of recipe.ingredients as any[]) {
        const ingredientName =
          ingredient.name ?? ingredient.ingredient ?? ingredient.raw;

        const normalizedName = ingredientName
          .toLowerCase()
          .replace(/[,()-]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const amount = ingredient.amount ?? ingredient.quantity ?? null;
        const unit = ingredient.unit ?? null;

        const searchResult = await instacartClient.searchProducts({
          query: ingredientName,
          limit: 5,
          ...(args.zip_code && { zip_code: args.zip_code }),
          ...(args.store && { store: args.store }),
        });

        const bestMatch: any = searchResult.results?.[0];
        if (!bestMatch) continue;

        const productPrice = parsePrice(bestMatch.price);

        const estimate = estimateIngredientCost({
          ingredientAmount: amount,
          ingredientUnit: unit,
          productPrice,
          productSize: bestMatch.unitSize,
        });

        if (estimate.estimatedCost) {
          recipeCost += estimate.estimatedCost;
        }

        matchedIngredients.push({
          ingredient: ingredient.raw,
          normalizedIngredient: normalizedName,
          amount,
          unit,
          matched: true,
          estimatedIngredientCost: estimate.estimatedCost,
          product: bestMatch,
        });

        // ======================================================
        // MERGE INGREDIENTS
        // ======================================================

        const existing = ingredientMap.get(normalizedName);

        if (!existing) {
          ingredientMap.set(normalizedName, {
            ingredient: ingredientName,
            totalAmount: typeof amount === "number" ? amount : null,
            unit,
            usedInRecipes: [recipe.title],
            matches: [bestMatch],
            rawVariants: [ingredient.raw],
          });
        } else {
          const sameUnit = normalizeUnit(existing.unit) === normalizeUnit(unit);

          if (
            existing.totalAmount !== null &&
            typeof amount === "number" &&
            sameUnit
          ) {
            existing.totalAmount += amount;
          } else {
            existing.totalAmount = null;
          }

          existing.usedInRecipes.push(recipe.title);
          existing.matches.push(bestMatch);
          existing.rawVariants.push(ingredient.raw);
        }
      }

      recipeComparisons.push({
        recipe: {
          id: recipe.id,
          title: recipe.title,
          source_url: recipe.sourceUrl,
          image_url: recipe.imageUrl,
          description: recipe.description,
          servings: recipe.servings,
        },
        totals: {
          ingredient_count: matchedIngredients.length,
          estimated_recipe_cost: Number(recipeCost.toFixed(2)),
        },
        ingredients: matchedIngredients,
      });
    }

    // ======================================================
    // SHARED INGREDIENTS
    // ======================================================

    const sharedIngredients = Array.from(ingredientMap.values()).filter(
      (i) => i.usedInRecipes.length > 1,
    );

    // ======================================================
    // FINAL SHOPPING LIST (NO DOUBLE COUNTING)
    // ======================================================

    const combinedShoppingList = Array.from(ingredientMap.entries()).map(
      ([normalizedName, item]) => {
        const firstMatch = item.matches[0];

        const basePrice = parsePrice(firstMatch?.price);

        const mergedCost = estimateIngredientCost({
          ingredientAmount: item.totalAmount,
          ingredientUnit: item.unit,
          productPrice: basePrice,
          productSize: firstMatch?.unitSize,
        });

        return {
          ingredient: item.ingredient,
          normalized_ingredient: normalizedName,

          merged_quantity:
            item.totalAmount !== null
              ? {
                  amount: Number(item.totalAmount.toFixed(2)),
                  unit: item.unit,
                }
              : null,

          appears_in_recipes: item.usedInRecipes,

          estimated_total_cost: Number(
            (mergedCost.estimatedCost ?? 0).toFixed(2),
          ),

          suggested_product: firstMatch ?? null,
        };
      },
    );

    // ======================================================
    // TOTAL COST (SAFE)
    // ======================================================

    const combinedTotalCost = combinedShoppingList.reduce(
      (sum, item) => sum + item.estimated_total_cost,
      0,
    );

    // ======================================================
    // RETURN
    // ======================================================

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              comparison_summary: {
                recipe_count: recipes.length,
                shared_ingredient_count: sharedIngredients.length,
                combined_shopping_items: combinedShoppingList.length,
                estimated_combined_total_cost: Number(
                  combinedTotalCost.toFixed(2),
                ),
              },

              recipes: recipeComparisons,
              shared_ingredients: sharedIngredients,
              combined_shopping_list: combinedShoppingList,

              matching_notes: {
                strategy:
                  "Merged ingredient quantities first, then recomputed cost once per ingredient to avoid double counting.",
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
