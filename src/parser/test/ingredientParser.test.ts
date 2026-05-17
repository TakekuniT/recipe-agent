import { parseIngredient, parseIngredientList } from "../ingredientParser.js";
import type { Expected } from "../../models/type.js";

function expectIngredient(
  result: ReturnType<typeof parseIngredient>,
  expected: Expected,
) {
  expect(result.raw).toBe(expected.raw);
  if (expected.quantity === null) {
    expect(result.quantity).toBeNull();
  } else {
    expect(result.quantity).toBeCloseTo(expected.quantity, 3);
  }
  expect(result.unit).toBe(expected.unit);
  expect(result.item).toBe(expected.item);
  expect(result.modifiers).toEqual(expected.modifiers);
  expect(result.preparation).toBe(expected.preparation);
  expect(result.notes).toBe(expected.notes);
  expect(result.confidence).toBeGreaterThanOrEqual(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
}

describe("ingredient parser", () => {
  const cases: Expected[] = [
    {
      raw: "2 cups all-purpose flour",
      quantity: 2,
      unit: "cups",
      item: "all-purpose flour",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1/2 lb boneless skinless chicken breast, diced",
      quantity: 0.5,
      unit: "lb",
      item: "chicken breast",
      modifiers: ["boneless", "skinless"],
      preparation: "diced",
      notes: null,
    },
    {
      raw: "one 14-oz can diced tomatoes, drained",
      quantity: 1,
      unit: "can",
      item: "diced tomatoes",
      modifiers: [],
      preparation: null,
      notes: "drained",
    },
    {
      raw: "3-4 cloves garlic, minced",
      quantity: 3.5,
      unit: "cloves",
      item: "garlic",
      modifiers: [],
      preparation: "minced",
      notes: null,
    },
    {
      raw: "salt and pepper to taste",
      quantity: null,
      unit: null,
      item: "salt and pepper",
      modifiers: [],
      preparation: null,
      notes: "to taste",
    },
    {
      raw: "2 tablespoons olive oil, plus more for drizzling",
      quantity: 2,
      unit: "tablespoons",
      item: "olive oil",
      modifiers: [],
      preparation: null,
      notes: "plus more for drizzling",
    },
    {
      raw: "1 (15 ounce) can black beans, rinsed and drained",
      quantity: 1,
      unit: "can",
      item: "black beans",
      modifiers: [],
      preparation: null,
      notes: "15 ounce; rinsed and drained",
    },
    {
      raw: "3/4 cup freshly grated Parmesan cheese",
      quantity: 0.75,
      unit: "cup",
      item: "Parmesan cheese",
      modifiers: ["fresh"],
      preparation: "grated",
      notes: null,
    },
    {
      raw: "½ teaspoon red pepper flakes",
      quantity: 0.5,
      unit: "teaspoon",
      item: "red pepper flakes",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 bunch fresh cilantro, chopped",
      quantity: 1,
      unit: "bunch",
      item: "cilantro",
      modifiers: ["fresh"],
      preparation: "chopped",
      notes: null,
    },
    {
      raw: "2 1/2 cups shredded cheddar cheese",
      quantity: 2.5,
      unit: "cups",
      item: "cheddar cheese",
      modifiers: [],
      preparation: "shredded",
      notes: null,
    },
    {
      raw: "one 8-ounce package cream cheese, softened",
      quantity: 1,
      unit: "package",
      item: "cream cheese",
      modifiers: [],
      preparation: "softened",
      notes: "8-ounce",
    },
    {
      raw: "1/3 cup chopped walnuts, toasted",
      quantity: 0.333,
      unit: "cup",
      item: "walnuts",
      modifiers: [],
      preparation: "chopped",
      notes: "toasted",
    },
    {
      raw: "4 large eggs",
      quantity: 4,
      unit: null,
      item: "eggs",
      modifiers: ["large"],
      preparation: null,
      notes: null,
    },
    {
      raw: "1/2 cup packed brown sugar",
      quantity: 0.5,
      unit: "cup",
      item: "brown sugar",
      modifiers: ["packed"],
      preparation: null,
      notes: null,
    },
    {
      raw: "3 tbsp soy sauce",
      quantity: 3,
      unit: "tbsp",
      item: "soy sauce",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 cup milk",
      quantity: 1,
      unit: "cup",
      item: "milk",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "2 teaspoons baking powder",
      quantity: 2,
      unit: "teaspoons",
      item: "baking powder",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1/2 teaspoon sea salt",
      quantity: 0.5,
      unit: "teaspoon",
      item: "sea salt",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 (14 oz) bag frozen peas",
      quantity: 1,
      unit: "bag",
      item: "frozen peas",
      modifiers: ["frozen"],
      preparation: null,
      notes: "14 oz",
    },
    {
      raw: "2 sprigs fresh thyme",
      quantity: 2,
      unit: "sprigs",
      item: "thyme",
      modifiers: ["fresh"],
      preparation: null,
      notes: null,
    },
    {
      raw: "1/4 cup lemon juice",
      quantity: 0.25,
      unit: "cup",
      item: "lemon juice",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "3 cloves garlic, minced, divided",
      quantity: 3,
      unit: "cloves",
      item: "garlic",
      modifiers: [],
      preparation: "minced",
      notes: "divided",
    },
    {
      raw: "1 medium onion, diced",
      quantity: 1,
      unit: null,
      item: "onion",
      modifiers: ["medium"],
      preparation: "diced",
      notes: null,
    },
    {
      raw: "1 tbsp olive oil",
      quantity: 1,
      unit: "tbsp",
      item: "olive oil",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 can coconut milk",
      quantity: 1,
      unit: "can",
      item: "coconut milk",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "3/4 cup dry white wine",
      quantity: 0.75,
      unit: "cup",
      item: "dry white wine",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 pinch cayenne pepper",
      quantity: 1,
      unit: "pinch",
      item: "cayenne pepper",
      modifiers: [],
      preparation: null,
      notes: null,
    },
    {
      raw: "1 (8-ounce) package cream cheese, softened",
      quantity: 1,
      unit: "package",
      item: "cream cheese",
      modifiers: [],
      preparation: "softened",
      notes: "8-ounce",
    },
    {
      raw: "1/2 c packed spinach, chopped",
      quantity: 0.5,
      unit: "c",
      item: "spinach",
      modifiers: ["packed"],
      preparation: "chopped",
      notes: null,
    },
    {
      raw: "2 tbsp chopped fresh parsley",
      quantity: 2,
      unit: "tbsp",
      item: "parsley",
      modifiers: ["fresh"],
      preparation: "chopped",
      notes: null,
    },
  ];

  //   it("parses the selected ingredient cases", () => {
  //     for (const expected of cases) {
  //       expectIngredient(parseIngredient(expected.raw), expected);
  //     }
  //   });
  it.each(cases)("parses ingredient: %s", (expected) => {
    expectIngredient(parseIngredient(expected.raw), expected);
  });

  it("parses ingredient lists", () => {
    const parsed = parseIngredientList(cases.map((c) => c.raw));
    expect(parsed).toHaveLength(cases.length);
  });
});
