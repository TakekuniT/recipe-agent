May 16
Spent a few hours working on the ingredientParser.ts file and wrote a working test file for it. I also briefly looked at allrecipe.com and its network requests. So far, it is hiding its recipe API endpoint. I still cannot see any json search results or structured recipe object within the network requests.

May 17
Did some research, this video was useful https://www.youtube.com/watch?v=mbrX1_CVG-0.
Looks like allrecipe.com is using a server side rendering and returning an HTML rather than a public JSON API call. Server renders HTML recipe cards, browser receives full HTML page, and then small JS fragments hydrate UI interactions. Could not find any API calls.

ttanemori@Mac recipe-agent % npx tsx src/clients/test-allrecipe.ts
=== SEARCH RECIPES ===
Error: Allrecipes search failed: 403
at AllRecipesClient.searchRecipes (/Users/ttanemori/myFiles/TruffleOA/recipe-agent/src/clients/allrecipes.ts:142:13)
at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
at async main (/Users/ttanemori/myFiles/TruffleOA/recipe-agent/src/clients/test-allrecipe.ts:6:19)
ttanemori@Mac recipe-agent %

I think I hit a bot protection measure of allrecipe.com since I got a 403 error with proper headers. Bypassed anti bot protection by using playwright, generated recipes from searchRecipes. getRecipes is still broken, browseCategories seems to be working. These functions need to be modified to adhere tot he specs later.

Briefly looked at instacart.com, seems to have an exposed graphql API.
