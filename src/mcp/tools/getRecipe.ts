import { z } from "zod";
import { allRecipesClient } from "../../clients/allrecipes.js";

export const getRecipeTool = {
  name: "get_recipe",

  description: "Retrieve a full recipe by recipe ID or URL from Allrecipes.",

  schema: z.object({
    recipe_id: z.string().nullable(),
    url: z.string().url().nullable(),
  }),

  handler: async (extra: any) => {
    const args = extra.arguments as {
      recipe_id?: string;
      url?: string;
    };

    if (!args.recipe_id && !args.url) {
      throw new Error("Either recipe_id or url must be provided");
    }

    const recipeArgs: { recipeId?: string; url?: string } = {};

    if (args.recipe_id) recipeArgs.recipeId = args.recipe_id;
    if (args.url) recipeArgs.url = args.url;

    const recipe = await allRecipesClient.getRecipe(recipeArgs);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: recipe.id,
              title: recipe.title,
              description: recipe.description,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              prep_time_minutes: recipe.prepTimeMinutes,
              cook_time_minutes: recipe.cookTimeMinutes,
              total_time_minutes: recipe.totalTimeMinutes,
              servings: recipe.servings,
              nutrition: recipe.nutrition,
              rating: recipe.rating,
              review_count: recipe.reviewCount,
              image_url: recipe.imageUrl,
              source_url: recipe.sourceUrl,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
