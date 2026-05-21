## May 16

Spent a few hours working on the ingredientParser.ts file and wrote a working test file for it. I also briefly looked at allrecipe.com and its network requests. So far, it is hiding its recipe API endpoint. I still cannot see any json search results or structured recipe object within the network requests.

## May 17

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

https://www.instacart.com/graphql?operationName=CreateUserSessionFromVerificationCode the response to this request has an auth token. Tried writing it in code, got 400 errors, fixed it, but got empty arrays.

Copied the cURL and worked on postman but not on the code yet. Was missing a few headers, code works and outputs search results. Only issue is hardcoded shopIds, postalCode, zoneId, instacart cookie, auth token, and pageViewId.

https://www.instacart.com/graphql?operationName=CreateUserSessionFromVerificationCode the response to this request has an auth token.

https://www.instacart.com/graphql?operationName=ShopTags the response to this request contains shop ids. Turns out to call this request, you need to pass in shopIds, so this request cannot be used to get shopIds.

https://www.instacart.com/graphql?operationName=ExpressFulfillmentValueProps the response to this contains retailer ids, not sure if this is related to shop ids.

https://www.instacart.com/graphql?operationName=UpdateUserLocation the response to this contains zone id and postal code.

Getting an authentication error trying to call UpdateUserLocation.

Wrote a script to store cookie, manually need to copy cookie from chrome dev tools and run it once to save the cookie. Zone id is no longer hardcoded, uses UpdateUserLocation to retrieve zone id.

https://www.instacart.com/graphql?operationName=ShopCollectionUnscoped seems to have the shop ids in the response. Successfully called this request to get shop ids, no longer need to hardcode shop ids.

https://www.instacart.com/graphql?operationName=UserAddresses seems to have address information without any inputs. Made a new location resolve function that uses this request because it does not require any inputs. Missing zone id in input, so the two resolve functions are still both in use.

SearchProducts is working.

https://www.instacart.com/graphql?operationName=ItemDetailData the response to this request has details of the product, but missing several fields. Contains availability, name, product image, nutrition, ingredients, and details. Missing store name, unit size/weight, price, category.
Retrieve full product details by product ID or URL: price, unit size/weight, availability, category, product image URL, store name.

Looked at the specs again, need to redo some parts of SearchProducts to fill in the missing fields. Spent about 6 hours total today.

## May 18

https://www.instacart.com/graphql?operationName=Items endpoint has items details. Need to work on fixing the SearchProducts function to hardcode zip code, include store name, pagination, and limit. The latter 2 can be focused on later. The main problem is that https://www.instacart.com/graphql?operationName=SearchCrossRetailerGroupResults does not have store name as an input, so I need to find a different endpoint that can connect store name to shop ID which is in the output.

Found this https://www.instacart.com/graphql?operationName=GetRetailerNameByID, but I need the reverse.

Turns out what I did yesterday was meaningful. Shop resolve function includes retailer name in the collection variable, so we can use that to filter the store names. Product url can be constructed from the store slug and product id. Successfully finished up the SearchProducts function with proper specs.

Successfully finished getSearchProducts function. Generates shop ids based on location, uses retail location id and product id to construct item id to query item details. Returns an array of products from different stores in the area.

https://www.instacart.com/graphql?operationName=UserCart response has cart items. https://www.instacart.com/graphql?operationName=CartData also seems to have cart data, but less human readable, so probably will use the former. Both requires cart id as an input, must find a way to get cart id. https://www.instacart.com/graphql?operationName=CurrentUserFields has user id, which might be useful later. https://www.instacart.com/graphql?operationName=PersonalActiveCarts has no parameters and returns cart id. Encountered an issue where 'https://www.instacart.com/graphql?operationName=UserCart does not have unit price or line total. Retrieves product details in the same request using getProductDetails, this works but is not performant.

addToCart uses https://www.instacart.com/graphql?operationName=UpdateCartItemsMutation, which was pretty easy to find. One limitation is I will be using the first available shop in the area that has the product. When I added the item to cart, it worked but I learned that there can be multiple carts. One cart per store essentially. This puts another limitation on getCartId and getCart. Might need to redo getCartId logic to return the active cart id of the store instead of the first active cart id.

Ran into an issue where active cart id was not found. Was not spamming it, but got a rate limit error: Error: GraphQL error 429: 429 - Too Many Requests.

Need to have an active cart to work so far. There is a good chance getCart fails due to rate limiting because it makes a call for every item in the cart. getCart fails when there is no active cart. addToCart works without an active cart.

Delete cart looks like it uses the same endpoint as adding to cart https://www.instacart.com/graphql?operationName=UpdateCartItemsMutation.

Going back to allrecipe.com, found this url https://feeds-api.dotdashmeredith.com/v1/rss/google/afd5e9ea-c220-419e-9135-d8457772e240 in the document response. Allrecipes is using a backend service called feeds-api.dotdashmeredith.com. Getting a problem with the webscraper because it only webscrapes the first page of results. Fixed this issue by loading more pages in a while loop. Might have to treat html as an API response.

Working on getRecipe function was relatively easy pretty similar to the searchRecipes function in terms of scraping from the html.

Worked on it for 6 hours today, finished up client functions.

## May 19

Building the MCP tool and server now.

Made a few tools, trying to check if working with agent now. It is not working, checking if tools are properly registered to the MCP server.

```
{
    "result": {
        "tools": [
            {
                "name": "get_recipe",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "execution": {
                    "taskSupport": "forbidden"
                }
            },
            {
                "name": "search_recipes",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "execution": {
                    "taskSupport": "forbidden"
                }
            },
            {
                "name": "search_products",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "execution": {
                    "taskSupport": "forbidden"
                }
            },
            {
                "name": "get_product_details",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "execution": {
                    "taskSupport": "forbidden"
                }
            },
            {
                "name": "estimate_recipe_cost",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "execution": {
                    "taskSupport": "forbidden"
                }
            }
        ]
    },
    "jsonrpc": "2.0",
    "id": 1
}
```

Tools are registered, but the agent is unable to call them for some reason. Tools are not registered properly, they are missing the schema. Trying to fix it. There might have been an issue with how I was calling the AI. Worked on it for 3 hours.

## May 20

Fixed up some stuff by adding tools as an extra parameter, got a 406 error when trying to call tools. Added proper headers and got error 500. Getting inconsistent errors, sometimes the query parameter is missing, other times error 500 is being returned.

```
{"id":"gen-1779334358-5uErgorPN1rJbPw8AVrM","object":"chat.completion","created":1779334358,"model":"qwen/qwen3.5-35b-a3b-20260224","provider":"Parasail","system_fingerprint":"vllm-0.20.2rc1.dev1310+gb13770ae3-tp2-24836ff9","choices":[{"index":0,"logprobs":null,"finish_reason":"tool_calls","native_finish_reason":"tool_calls","message":{"role":"assistant","content":null,"refusal":null,"reasoning":"The user is asking for a pad thai recipe. I should search for pad thai recipes using the search_recipes function. I'll use \"pad thai\" as the query parameter.\n","tool_calls":[{"type":"function","index":0,"id":"call_7b205c4c32234f3e91624804","function":{"name":"search_recipes","arguments":"{\"query\": \"pad thai\"}"}}],"reasoning_details":[{"type":"reasoning.text","text":"The user is asking for a pad thai recipe. I should search for pad thai recipes using the search_recipes function. I'll use \"pad thai\" as the query parameter.\n","format":"unknown","index":0}]}}],"usage":{"prompt_tokens":1077,"completion_tokens":66,"total_tokens":1143,"cost":0.00012195,"is_byok":false,"prompt_tokens_details":{"cached_tokens":1056,"cache_write_tokens":0,"audio_tokens":0,"video_tokens":0},"cost_details":{"upstream_inference_cost":0.00012195,"upstream_inference_prompt_cost":0.00005595,"upstream_inference_completions_cost":0.000066},"completion_tokens_details":{"reasoning_tokens":41,"image_tokens":0,"audio_tokens":0}}}
```

Able to call the tools, but the parameters are not being passed in properly.

```
CTX KEYS [
  'signal',
  'sessionId',
  '_meta',
  'sendNotification',
  'sendRequest',
  'authInfo',
  'requestId',
  'requestInfo',
  'taskId',
  'taskStore',
  'taskRequestedTtl',
  'closeSSEStream',
  'closeStandaloneSSEStream'
]
```

Argument is not being passed in properly.

```
MCP server running on http://localhost:3000/mcp
CTX KEYS [ 'query', 'page', 'limit' ]
TOOLS INPUT { query: 'pad thai', page: 1, limit: 10 }
```

Input is reaching the server properly, but getting internal server error 500 still. Worked on it for an hour today.

## May 21

There is a lot of variability in the responses from the AI, leading to inconsistent errors. Sometimes I get a server error 500 from get_recipe and other times from search_recipes. Get recipe is failing because I am constructing the url incorrectly using recipe id. Allrecipes does not let you construct a url with recipe id alone, you must have a slug of the name of the recipe as well. Removed any mention of recipe_id so the input is only url. Still crashes with an internal server error 500. Get recipe tool is not properly called because the logs in handler are not being triggered. Tried inputting url to call get_recipe tool alone, it worked. The issue is calling multiple tools at once for some reason.
