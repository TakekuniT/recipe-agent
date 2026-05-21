export const tools = [
  {
    type: "function",
    function: {
      name: "search_recipes",
      description:
        "Search Allrecipes recipes by keyword with optional cuisine, dietary restrictions, and cook time filters.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Recipe search phrase",
          },

          cuisine: {
            type: "string",
            description: "Cuisine filter such as thai, italian, mexican",
          },

          dietary: {
            type: "string",
            description:
              "Dietary filter such as vegetarian, vegan, gluten-free, dairy-free, keto",
          },

          max_cook_time_minutes: {
            type: "number",
            description: "Maximum total cook time in minutes",
          },

          page: {
            type: "number",
            description: "Results page number",
          },

          limit: {
            type: "number",
            description: "Maximum results to return",
          },
        },

        required: ["query"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "get_recipe",
      description:
        "Retrieve a full recipe from Allrecipes by recipe ID or URL.",

      parameters: {
        type: "object",

        properties: {
          recipe_id: {
            type: "string",
            description: "Allrecipes recipe ID",
          },

          url: {
            type: "string",
            description: "Full Allrecipes recipe URL",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search Instacart grocery products with optional ZIP code and store filters.",

      parameters: {
        type: "object",

        properties: {
          query: {
            type: "string",
            description: "Product search phrase",
          },

          zip_code: {
            type: "string",
            description: "ZIP code used for local pricing and availability",
          },

          store: {
            type: "string",
            description: "Store name such as Costco, Safeway, Aldi",
          },

          page: {
            type: "number",
            description: "Results page number",
          },

          limit: {
            type: "number",
            description: "Maximum number of products",
          },
        },

        required: ["query"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Retrieve full grocery product details from Instacart by product ID or URL.",

      parameters: {
        type: "object",

        properties: {
          product_id: {
            type: "string",
            description: "Instacart product ID",
          },

          url: {
            type: "string",
            description: "Full Instacart product URL",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "estimate_recipe_cost",
      description:
        "Estimate the grocery cost of a recipe by matching ingredients to Instacart grocery products.",

      parameters: {
        type: "object",

        properties: {
          recipe_id: {
            type: "string",
            description: "Recipe ID to estimate cost for",
          },

          url: {
            type: "string",
            description: "Recipe URL to estimate cost for",
          },

          zip_code: {
            type: "string",
            description: "ZIP code used for grocery pricing context",
          },

          store: {
            type: "string",
            description: "Preferred grocery store such as Costco or Safeway",
          },

          servings: {
            type: "number",
            description: "Scale recipe to this number of servings",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "find_substitutions",
      description:
        "Suggest ingredient substitutions with grocery pricing and confidence levels.",

      parameters: {
        type: "object",

        properties: {
          ingredient: {
            type: "string",
            description: "Ingredient needing substitution",
          },

          reason: {
            type: "string",
            description:
              "Reason for substitution such as allergy, dietary, unavailable, preference",
          },

          dietary_constraint: {
            type: "string",
            description:
              "Optional dietary constraint such as vegan, dairy-free, nut-free",
          },

          zip_code: {
            type: "string",
            description: "ZIP code for pricing context",
          },

          store: {
            type: "string",
            description: "Preferred grocery store",
          },
        },

        required: ["ingredient", "reason"],
      },
    },
  },
];
