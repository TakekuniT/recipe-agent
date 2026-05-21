import { z } from "zod";
import { allRecipesClient } from "../../clients/allrecipes.js";

export const getRecipeTool = {
  name: "get_recipe",

  description:
    "Retrieve a full recipe by URL from Allrecipes. Recipe URL must include a recipe id and a recipe name slug. It looks like this: https://www.allrecipes.com/recipe/244255/whole30-thai-stir-fry/",

  schema: z.object({
    //recipe_id: z.string().nullable(),
    url: z.string(), //.nullable(),
  }),

  handler: async (args: any) => {
    console.log("GET_RECIPE");
    //console.log("CTX KEYS", Object.keys(ctx));

    //const args = ctx.arguments ?? ctx.params?.arguments ?? ctx;
    console.log("TOOLS INPUT", args);

    if (!args.url) {
      throw new Error("Either recipe_id or url must be provided");
    }

    //const recipeArgs: { recipeId?: string; url?: string } = {};
    const recipeArgs: { url?: string } = {};

    //if (args.recipe_id) recipeArgs.recipeId = args.recipe_id;
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
