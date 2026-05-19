import { allRecipesClient } from "../allrecipes.js";

async function main() {
  console.log("=== SEARCH RECIPES ===");

  const recipes = await allRecipesClient.searchRecipes({
    query: "pad thai",
    limit: 100000000,
  });

  console.log(recipes);

  if (recipes.length === 0) {
    console.log("No recipes found");
    return;
  }

  const firstRecipe = recipes[0];

  console.log("\n=== GET RECIPE ===");

  const recipe = await allRecipesClient.getRecipe({
    url: "https://www.allrecipes.com/recipe/68129/dads-pad-thai/",
  });

  console.log(JSON.stringify(recipe, null, 2));

  console.log("\n=== BROWSE CATEGORIES ===");

  const categories = await allRecipesClient.browseCategories();

  console.log(categories.slice(0, 10));
}

main().catch((err) => {
  console.error(err);
});
