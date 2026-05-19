// searchRecipes, getRecipe, browseCategories

import { chromium } from "playwright";

export interface SearchRecipesOptions {
  query: string;
  cuisine?: string;
  dietary?: string;
  maxCookTimeMinutes?: number;
  page?: number;
  limit?: number;
}

export interface RecipeSearchResult {
  id: string;
  title: string;
  description: string | null;
  cookTimeMinutes: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  sourceUrl: string;
}

export interface RecipeIngredient {
  raw: string;
}

export interface RecipeInstruction {
  step: number;
  text: string;
}

export interface RecipeDetails {
  id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: string | null;
  nutrition: Record<string, unknown> | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  sourceUrl: string;
}

export interface RecipeCategory {
  title: string;
  url: string;
}

const BASE_URL = "https://www.allrecipes.com";

const DEFAULT_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function parseMinutes(isoDuration?: string | null): number | null {
  if (!isoDuration) return null;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);

  if (!match) return null;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);

  return hours * 60 + minutes;
}

function extractJsonLd(html: string): any[] {
  const matches = [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ];

  const parsed: any[] = [];

  for (const match of matches) {
    try {
      const json = JSON.parse(match[1]!.trim());

      if (Array.isArray(json)) {
        parsed.push(...json);
      } else {
        parsed.push(json);
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return parsed;
}

function cleanText(text?: string | null): string | null {
  if (!text) return null;

  return text.replace(/\s+/g, " ").trim();
}

export class AllRecipesClient {
  async searchRecipes(
    options: SearchRecipesOptions,
  ): Promise<RecipeSearchResult[]> {
    const { query, cuisine, dietary, maxCookTimeMinutes, limit = 10 } = options;

    const browser = await chromium.launch({ headless: true });
    const browserPage = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    });

    const RESULTS_PER_PAGE = 24;

    let offset = 0;
    let allResults: RecipeSearchResult[] = [];

    while (allResults.length < limit) {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(
        query,
      )}&offset=${offset}`;

      await browserPage.goto(url, { waitUntil: "domcontentloaded" });
      await browserPage.waitForTimeout(2500);

      const pageResults: any[] = await browserPage.$$eval(
        'a[href*="/recipe/"]',
        (cards) => {
          return cards
            .map((card) => {
              const url = card.getAttribute("href");
              if (!url) return null;

              const idMatch = url.match(/recipe\/(\d+)/);
              if (!idMatch) return null;

              const title =
                card.querySelector(".card__title-text")?.textContent?.trim() ||
                "Unknown Recipe";

              const image =
                card.querySelector("img")?.getAttribute("data-src") ||
                card.querySelector("img")?.getAttribute("src") ||
                null;

              const ratingText =
                card
                  .querySelector(".mm-recipes-card-meta__rating-count-number")
                  ?.textContent?.trim() || null;

              const reviewCount = ratingText
                ? Number(ratingText.replace(/[^\d]/g, ""))
                : null;

              return {
                id: idMatch[1],
                title,
                description: null,
                cookTimeMinutes: null,
                rating: null,
                reviewCount,
                imageUrl: image,
                sourceUrl: url,
              };
            })
            .filter(Boolean);
        },
      );

      if (!pageResults.length) break;

      allResults.push(...pageResults);

      offset += RESULTS_PER_PAGE;
    }

    await browser.close();

    // dedupe across pages
    const deduped = Array.from(
      new Map(allResults.map((r) => [r.sourceUrl, r])).values(),
    );

    let filtered = deduped;

    if (cuisine) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(cuisine.toLowerCase()),
      );
    }

    if (dietary) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(dietary.toLowerCase()),
      );
    }

    if (maxCookTimeMinutes) {
      const enriched = await Promise.all(
        filtered.map(async (recipe) => {
          try {
            const details = await this.getRecipe({
              recipeId: recipe.id,
            });

            return {
              ...recipe,
              cookTimeMinutes: details.totalTimeMinutes,
            };
          } catch {
            return recipe;
          }
        }),
      );

      filtered = enriched.filter(
        (r) =>
          r.cookTimeMinutes !== null && r.cookTimeMinutes <= maxCookTimeMinutes,
      );
    }

    return filtered.slice(0, limit);
  }

  async getRecipe({
    recipeId,
    url,
  }: {
    recipeId?: string;
    url?: string;
  }): Promise<RecipeDetails> {
    if (!recipeId && !url) {
      throw new Error("recipeId or url is required");
    }

    const recipeUrl = url || `${BASE_URL}/recipe/${recipeId}/`;

    const browser = await chromium.launch({
      headless: true,
    });

    const browserPage = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    });

    await browserPage.goto(recipeUrl, {
      waitUntil: "domcontentloaded",
    });

    await browserPage.waitForTimeout(3000);

    const html = await browserPage.content();

    await browser.close();

    const jsonLdBlocks = extractJsonLd(html);

    const recipeJson = jsonLdBlocks.find((item) => {
      if (item["@type"] === "Recipe") return true;

      if (Array.isArray(item["@graph"])) {
        return item["@graph"].some((g: any) => g["@type"] === "Recipe");
      }

      return false;
    });

    let recipeData: any = recipeJson;

    if (recipeJson?.["@graph"]) {
      recipeData = recipeJson["@graph"].find(
        (g: any) => g["@type"] === "Recipe",
      );
    }

    if (!recipeData) {
      console.warn("JSON-LD missing, falling back to DOM parsing");

      return {
        id: recipeId || "",
        title: "Unknown (fallback needed)",
        description: null,
        ingredients: [],
        instructions: [],
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        totalTimeMinutes: null,
        servings: null,
        nutrition: null,
        rating: null,
        reviewCount: null,
        imageUrl: null,
        sourceUrl: recipeUrl,
      };
    }

    const ingredients: RecipeIngredient[] = (
      recipeData.recipeIngredient || []
    ).map((ingredient: string) => ({
      raw: ingredient,
    }));

    const instructions: RecipeInstruction[] = (
      recipeData.recipeInstructions || []
    ).map((instruction: any, index: number) => ({
      step: index + 1,
      text:
        typeof instruction === "string" ? instruction : instruction.text || "",
    }));

    return {
      id:
        recipeData.mainEntityOfPage?.match?.(/recipe\/(\d+)/)?.[1] ||
        recipeId ||
        "",
      title: recipeData.name,
      description: cleanText(recipeData.description),
      ingredients,
      instructions,
      prepTimeMinutes: parseMinutes(recipeData.prepTime),
      cookTimeMinutes: parseMinutes(recipeData.cookTime),
      totalTimeMinutes: parseMinutes(recipeData.totalTime),
      servings: recipeData.recipeYield?.toString?.() || null,
      nutrition: recipeData.nutrition || null,
      rating: Number(recipeData.aggregateRating?.ratingValue) || null,
      reviewCount: Number(recipeData.aggregateRating?.reviewCount) || null,
      imageUrl: Array.isArray(recipeData.image)
        ? recipeData.image[0]
        : recipeData.image || null,
      sourceUrl: recipeUrl,
    };
  }

  async browseCategories(): Promise<RecipeCategory[]> {
    const browser = await chromium.launch({
      headless: true,
    });

    const browserPage = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    });

    await browserPage.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
    });

    await browserPage.waitForTimeout(3000);

    const html = await browserPage.content();

    await browser.close();

    const matches = [
      ...html.matchAll(
        /<a[^>]+href="(https:\/\/www\.allrecipes\.com\/[^"]+)"[^>]*>([^<]+)<\/a>/g,
      ),
    ];

    const categories: RecipeCategory[] = [];

    for (const match of matches) {
      const url = match[1];
      const title = cleanText(match[2]);

      if (!title) continue;

      if (url!.includes("/recipes/") || url!.includes("/gallery/")) {
        categories.push({
          title,
          url: url || "",
        });
      }
    }

    return Array.from(
      new Map(categories.map((c) => [`${c.title}-${c.url}`, c])).values(),
    ).slice(0, 50);
  }
}

export const allRecipesClient = new AllRecipesClient();
