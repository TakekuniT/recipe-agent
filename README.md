# recipe-agent

## Set up insstructions

Sign in / create account for Instcart and add a delivery location. Go to inspect element, network tab, and click on Fetch/XHR. Click on any of the network request that has all the necessary cookie data like https://www.instacart.com/graphql?operationName=AuthCreateUserSessionFromGoogleSso. This network request is triggered when signing in with google. Copy the cookie data and paste it into line 16 of src/clients/test/test-instacart.ts. Run test-instacart.ts and make sure it runs properly without any errors.

```
npx tsx src/clients/test/test-instacart.ts
```

Ensure env file contains the openrouter API key in the .env file. Format as follows:

```
OPENROUTER_API_KEY=your_openrouter_key_here
```

Install necessary dependencies and run the MCP server in one terminal.

```
npm install
npm run dev
```

Run the agent in another terminal.

```
npx tsx src/agent/runAgent.ts
```

## Architecture

src/clients contains the allrecipe and instacart clients which contains the reverse engineered API calls.

src/mcp/tools/ contains the tools that are registered with the MCP server calling the reverse engineered APIs from the clients.

src/mcp/server.ts creates the MCP server and registers the MCP tools to the server. It also creates the HTTP server.

src/mcp/agent/llmClient.ts is the LLM wrapper for the agent.
src/mcp/agent/mcpClient.ts is the MCP wrapper. It is the communication layer between the agent and the MCP server.
src/mcp/agent/tools.ts contains the tools that are registered with the MCP server calling the reverse engineered APIs from the clients.
src/mcp/agent/agent.ts is the agent and runs the loop that calls the MCP tools to get the final answer.
src/mcp/agent/runAgent.ts is the main entry point for the CLI agent system. It sets up the LLM and MCP clients and allows users to interact with the agent through the terminal.

doc/ contains documentations.
demo/ contains the required files for submission.
scripts/ contains the script for storing login cookies.
src/parser/ contains the ingredient parser.

## Limitations

I was unable to start/finish the background worker for this assignment.

Allrecipe does not have a exposed API endpoint so I kind of webscraped instead. Allrecipe function is a bit flaky because the parameters is not aligned with the assignment specs. searchRecipe is missing all the parameters except for query. getRecipeDetails only works with recipe url and recipe id alone is not enough.

Instacart client is fully implemented with the reverse engineered APIs, but some functions are a little flaky. removeFromCart works but only is able to remove items from the first active cart. Instacart does not have one univesral cart, but one cart per store. This made deleting from carts a little tricky and I did not have enough time to implement it properly.

Ingredient parser is not perfect, very niche cases still cause it to fail. I noticed this when I was parsing ingredients from allrecipes.

## Time Spent

Spent around 2 hours on parser. Spent around 12 hours reverse engineering the APIs. Spent around 12 hours on setting up the agent and the MCP server and the tools.

This week was my graduation so there were days I could not work as much as I hoped.

Total time spent is around 26 hours.
