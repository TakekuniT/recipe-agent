// searchRecipes, getRecipe, browseCategories

import { chromium } from "playwright";
import { parseIngredient } from "../parser/ingredientParser.js";

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

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    });

    try {
      await page.goto(recipeUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);

      const html = await page.content();

      // =========================
      // 1. JSON-LD (MOST IMPORTANT FIX)
      // =========================
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        );

        const parsed: any[] = [];

        for (const s of scripts) {
          try {
            const json = JSON.parse(s.textContent || "");
            if (Array.isArray(json)) parsed.push(...json);
            else parsed.push(json);
          } catch {}
        }

        return parsed;
      });

      const recipeSchema =
        jsonLd.find((x) => x?.["@type"]?.includes("Recipe")) || {};

      // =========================
      // 2. BASIC FIELDS (DOM fallback)
      // =========================
      const title =
        html
          .match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]
          ?.replace(/\s+/g, " ")
          .trim() ||
        recipeSchema.name ||
        "Unknown Recipe";

      const description =
        recipeSchema.description ||
        html
          .match(/article-subheading[^>]*>(.*?)<\/p>/)?.[1]
          ?.replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim() ||
        null;

      // =========================
      // 3. INGREDIENTS
      // =========================
      const ingredients = [
        ...html.matchAll(
          /mm-recipes-structured-ingredients__list-item[^>]*>([\s\S]*?)<\/li>/g,
        ),
      ]
        .map((m) => ({
          raw: m[1]!
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim(),
        }))
        .filter((x) => x.raw);
      const parsedIngredients = ingredients.map((i) => parseIngredient(i.raw));

      // =========================
      // 4. INSTRUCTIONS
      // =========================
      const instructions = [
        ...html.matchAll(
          /mm-recipes-steps__content[^>]*>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/g,
        ),
      ].flatMap((m) => {
        const ol = m[1] || "";

        const steps = [...ol.matchAll(/<li[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g)];

        return steps.map((s, i) => ({
          step: i + 1,
          text: s[1]!
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim(),
        }));
      });

      // =========================
      // 5. META (DOM fallback)
      // =========================
      const getMeta = (label: string) => {
        const items = Array.from(
          html.matchAll(
            /mm-recipes-details__item[\s\S]*?mm-recipes-details__label[^>]*>(.*?)<\/div>[\s\S]*?mm-recipes-details__value[^>]*>(.*?)<\/div>/g,
          ),
        );

        for (const m of items) {
          const key = m[1]?.toLowerCase() || "";
          const value = m[2]?.replace(/<[^>]+>/g, "").trim();

          if (key.includes(label.toLowerCase())) return value;
        }

        return null;
      };

      // =========================
      // 6. IMAGE
      // =========================
      const image =
        recipeSchema.image?.url ||
        html.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
        html.match(/<img[^>]+data-src="([^"]+)"/)?.[1] ||
        null;

      // =========================
      // 7. FINAL RETURN
      // =========================
      await browser.close();

      return {
        id: recipeId || "",
        title,
        description,
        ingredients: parsedIngredients,
        instructions,

        prepTimeMinutes: parseMinutes(recipeSchema?.prepTime),
        cookTimeMinutes: parseMinutes(recipeSchema?.cookTime),
        totalTimeMinutes: parseMinutes(recipeSchema?.totalTime),

        servings: recipeSchema?.recipeYield || getMeta("Servings"),

        nutrition: recipeSchema?.nutrition || null,

        rating: recipeSchema?.aggregateRating?.ratingValue
          ? Number(recipeSchema.aggregateRating.ratingValue)
          : null,

        reviewCount: recipeSchema?.aggregateRating?.ratingCount
          ? Number(recipeSchema.aggregateRating.ratingCount)
          : null,

        imageUrl: image,
        sourceUrl: recipeUrl,
      };
    } catch (err) {
      await browser.close();
      throw err;
    }
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
