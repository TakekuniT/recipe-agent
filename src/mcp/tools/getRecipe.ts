import { z } from "zod";
import { allRecipesClient } from "../../clients/allrecipes.js";

export const getRecipeTool = {
  name: "get_recipe",

  description: "Retrieve a full recipe by recipe ID or URL from Allrecipes.",

  schema: z.object({
    recipe_id: z.string().optional(),
    url: z.string().url().optional(),
  }),

  handler: async (args: { recipe_id?: string; url?: string }) => {
    if (!args.recipe_id && !args.url) {
      throw new Error("Either recipe_id or url must be provided");
    }

    // const recipe = await allRecipesClient.getRecipe({
    //   recipeId: args.recipe_id,
    //   url: args.url,
    // });

    const recipeArgs: { recipeId?: string; url?: string } = {};

    if (args.recipe_id) recipeArgs.recipeId = args.recipe_id;
    if (args.url) recipeArgs.url = args.url;

    const recipe = await allRecipesClient.getRecipe(recipeArgs);

    return {
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
    };
  },
};
