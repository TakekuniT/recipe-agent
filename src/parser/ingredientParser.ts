export interface IngredientParseResult {
  raw: string;
  quantity: number | null;
  unit: string | null;
  item: string;
  modifiers: string[];
  preparation: string | null;
  notes: string | null;
  confidence: number;
}

const MODIFIER_SYNONYMS: Record<string, string> = {
  freshly: "fresh",
};

const WRITTEN_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  half: 0.5,
  quarter: 0.25,
  third: 1 / 3,
  pint: 0.5,
};

const UNIT_ALIASES = [
  "c",
  "cup",
  "cups",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "tsp",
  "ounce",
  "ounces",
  "oz",
  "pound",
  "pounds",
  "lb",
  "lbs",
  "gram",
  "grams",
  "g",
  "kilogram",
  "kilograms",
  "kg",
  "liter",
  "liters",
  "litre",
  "litres",
  "ml",
  "milliliter",
  "milliliters",
  "package",
  "packages",
  "jar",
  "jars",
  "can",
  "cans",
  "bottle",
  "bottles",
  "bag",
  "bags",
  "bunch",
  "bunches",
  "clove",
  "cloves",
  "slice",
  "slices",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "piece",
  "pieces",
  "stick",
  "sticks",
  "container",
  "containers",
  "head",
  "heads",
  "ear",
  "ears",
  "box",
  "boxes",
  "packet",
  "packets",
  "block",
  "blocks",
  "pinch",
  "dashes",
  "dash",
  "handful",
  "handfuls",
  "sheet",
  "sheets",
];

const PREPARATION_TERMS = [
  "minced",
  "diced",
  "chopped",
  "sliced",
  "peeled",
  "shredded",
  "crushed",
  "grated",
  "zested",
  "crumbled",
  "mashed",
  "cubed",
  "ground",
  "softened",
  "melted",
  "beaten",
  "sifted",
  "warm",
  "coarsely chopped",
  "finely chopped",
  "thinly sliced",
  "room temperature",
  "for garnish",
  "plus more for drizzling",
  "plus more for serving",
  "pitted",
];

const NOTE_ONLY_TERMS = [
  "drained",
  "rinsed",
  "rinsed and drained",
  "to taste",
  "plus more for drizzling",
  "for garnish",
];

const MODIFIER_TERMS = [
  "fresh",
  "frozen",
  "large",
  "small",
  "medium",
  "boneless",
  "skinless",
  "lean",
  "ripe",
  "juiced",
  "drained",
  "rinsed",
  "trimmed",
  "optional",
  "packed",
  "softened",
  "peeled",
  "seeded",
  "firmly packed",
  "coarsely chopped",
  "finely chopped",
];

function normalizeUnicodeFractions(text: string): string {
  return text
    .replace(/½/g, "1/2")
    .replace(/⅓/g, "1/3")
    .replace(/⅔/g, "2/3")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/⅛/g, "1/8")
    .replace(/⅜/g, "3/8")
    .replace(/⅝/g, "5/8")
    .replace(/⅞/g, "7/8");
}

function textNumberToValue(text: string): number | null {
  const lower = text.toLowerCase().trim();

  if (WRITTEN_NUMBERS[lower] !== undefined) {
    return WRITTEN_NUMBERS[lower];
  }

  if (lower.includes("-")) {
    const parts: number[] = lower
      .split("-")
      .map((segment) => textNumberToValue(segment))
      .filter((value): value is number => value !== null);

    if (parts.length === 2) {
      return (parts[0]! + parts[1]!) / 2;
    }
  }

  if (/^\d+(\.\d+)?$/.test(lower)) {
    return parseFloat(lower);
  }

  const fractionMatch = lower.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    return Number.isFinite(num) && den !== 0 ? num / den : null;
  }

  const mixedMatch = lower.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    return Number.isFinite(whole) && Number.isFinite(num) && den !== 0
      ? whole + num / den
      : null;
  }

  return null;
}

function parseQuantity(raw: string): {
  quantity: number | null;
  remainder: string;
} {
  let text = normalizeUnicodeFractions(raw.trim());

  const rangeMatch =
    /^\s*((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?|[a-z]+))(?:\s*(?:-|to)\s*((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?|[a-z]+)))?\s+/i.exec(
      text,
    );
  if (!rangeMatch) {
    return { quantity: null, remainder: text };
  }

  const [, quantityText, rangeText] = rangeMatch;
  const first = textNumberToValue(quantityText || "");
  const second = rangeText ? textNumberToValue(rangeText || "") : null;
  const quantity =
    first !== null && second !== null
      ? (first + second) / 2
      : (first ?? second);

  if (quantity === null) {
    return { quantity: null, remainder: text };
  }

  return {
    quantity,
    remainder: text.slice(rangeMatch[0].length).trim(),
  };
}

function findUnit(text: string): {
  unit: string | null;
  remainder: string;
  leadingSizeNote: string | null;
} {
  const unitPattern = new RegExp(`^(${UNIT_ALIASES.join("|")})\\b`, "i");
  const match = unitPattern.exec(text);
  if (match) {
    return {
      unit: match[1]!.toLowerCase(),
      remainder: text.slice(match[0].length).trim(),
      leadingSizeNote: null,
    };
  }

  const secondaryPattern = new RegExp(
    `^([^\\s]+)\\s+(${UNIT_ALIASES.join("|")})\\b`,
    "i",
  );
  const secondaryMatch = secondaryPattern.exec(text);
  if (secondaryMatch) {
    return {
      unit: secondaryMatch[2]!.toLowerCase(),
      remainder: text.slice(secondaryMatch[0].length).trim(),
      leadingSizeNote: secondaryMatch[1]!,
    };
  }

  return { unit: null, remainder: text, leadingSizeNote: null };
}

function extractParenthetical(text: string): {
  note: string | null;
  remainder: string;
} {
  const match = /^\(([^)]+)\)\s*/.exec(text);
  if (!match) {
    return { note: null, remainder: text };
  }

  const [, innerText] = match;
  return {
    note: (innerText || "").trim(),
    remainder: text.slice(match[0].length).trim(),
  };
}

function extractPreparationAndNotes(text: string): {
  preparation: string | null;
  notes: string | null;
} {
  const pieces = text
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);
  const prep: string[] = [];
  const note: string[] = [];

  for (const piece of pieces.slice(1)) {
    const lower = piece.toLowerCase();

    if (NOTE_ONLY_TERMS.some((term) => lower.includes(term))) {
      note.push(piece);
      continue;
    }

    const isPrep = PREPARATION_TERMS.some((term) => lower.includes(term));
    if (isPrep) prep.push(piece);
    else note.push(piece);
  }

  let preparation = prep.length ? prep.join(", ") : null;
  let notes = note.length ? note.join(", ") : null;

  if (!preparation && pieces.length === 1) {
    const part = pieces[0];
    const lower = part!.toLowerCase();
    const noteTerm = NOTE_ONLY_TERMS.find((term) => lower.includes(term));

    if (noteTerm) {
      notes = noteTerm;
      preparation = null;
    } else {
      const prepTerms = PREPARATION_TERMS.filter((term) =>
        lower.includes(term),
      );
      if (prepTerms.length) {
        preparation = prepTerms.join(", ");
        notes = null;
      }
    }
  }

  return { preparation, notes };
}

function extractModifiers(
  itemText: string,
  keepModifierInItem = false,
): {
  item: string;
  modifiers: string[];
} {
  const tokens = itemText.split(/\s+/).filter(Boolean);
  const modifiers: string[] = [];
  const itemTokens: string[] = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const alias = MODIFIER_SYNONYMS[normalized] ?? normalized;

    if (MODIFIER_TERMS.includes(alias)) {
      if (!modifiers.includes(alias)) modifiers.push(alias);
      if (keepModifierInItem) itemTokens.push(token);
      continue;
    }

    if (alias === "and" || alias === "or") {
      itemTokens.push(normalized);
      continue;
    }

    const term = MODIFIER_TERMS.find((term) => alias.includes(term));
    if (term && !modifiers.includes(term)) {
      modifiers.push(term);
      itemTokens.push(token);
      continue;
    }

    itemTokens.push(token);
  }

  return { item: itemTokens.join(" ").trim(), modifiers };
}

export function parseIngredient(rawText: string): IngredientParseResult {
  const raw = rawText.trim();

  const cleaned = normalizeUnicodeFractions(raw).replace(/\s+/g, " ").trim();

  const { quantity, remainder: afterQuantity } = parseQuantity(cleaned);

  const { note: parentheticalNote, remainder: afterParenthetical } =
    extractParenthetical(afterQuantity);

  const {
    unit,
    remainder: afterUnit,
    leadingSizeNote,
  } = findUnit(afterParenthetical);

  const { preparation: commaPreparation, notes: commaNotes } =
    extractPreparationAndNotes(afterUnit);

  const baseItemRaw =
    afterUnit
      .split(",")[0]
      ?.trim()
      .replace(/^\(|\)$/g, "") ?? "";

  const hasComma = afterUnit.includes(",");
  const noteOnlySuffixPattern =
    /\s*(?:to taste|plus more for drizzling|for garnish|rinsed and drained|rinsed|drained)$/i;

  const baseItemWithoutNoteSuffix = hasComma
    ? baseItemRaw
    : baseItemRaw.replace(noteOnlySuffixPattern, "").trim();

  const preserveContainerItem =
    unit !== null && /^(can|package|jar|bottle|box|bag)$/i.test(unit);

  const extractedPrepFromItem =
    hasComma && !preserveContainerItem
      ? (() => {
          const sortedPrepTerms = [...PREPARATION_TERMS].sort(
            (a, b) => b.length - a.length,
          );
          return (
            sortedPrepTerms.find((term) =>
              new RegExp(
                `\\b${term.replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
                "i",
              ).test(baseItemWithoutNoteSuffix),
            ) ?? null
          );
        })()
      : null;

  const baseItemForModifiers =
    extractedPrepFromItem && !preserveContainerItem
      ? baseItemWithoutNoteSuffix
          .replace(
            new RegExp(
              `\\b${extractedPrepFromItem.replace(
                /[-\\/\\^$*+?.()|[\]{}]/g,
                "\\$&",
              )}\\b`,
              "i",
            ),
            "",
          )
          .trim()
      : baseItemWithoutNoteSuffix;

  const baseItemCleaned = hasComma
    ? baseItemForModifiers
    : baseItemForModifiers
        .replace(
          /\b(minced|diced|chopped|sliced|peeled|shredded|crushed|grated|zested|crumbled|mashed|cubed|ground|softened|melted|beaten|sifted)\b/gi,
          "",
        )
        .replace(/\s{2,}/g, " ")
        .trim();

  const { item, modifiers } = extractModifiers(
    baseItemCleaned,
    preserveContainerItem,
  );
  const includeLeadingSizeNote =
    leadingSizeNote !== null &&
    /^(?:package|bag|box|jar|bottle)$/i.test(unit ?? "");

  const noteParts: string[] = [];
  if (includeLeadingSizeNote && leadingSizeNote)
    noteParts.push(leadingSizeNote);
  if (parentheticalNote) noteParts.push(parentheticalNote);
  if (commaNotes) noteParts.push(commaNotes);

  const notes = noteParts.length > 0 ? noteParts.join("; ") : null;
  const preparation = commaPreparation ?? extractedPrepFromItem;

  const confidenceBase = 0.4;
  const confidence = Math.min(
    1,
    confidenceBase +
      (quantity !== null ? 0.25 : 0) +
      (item.length > 0 ? 0.25 : 0) +
      (unit !== null ? 0.1 : 0) +
      (preparation !== null ? 0.1 : 0),
  );

  return {
    raw,
    quantity,
    unit,
    item: item || cleaned,
    modifiers,
    preparation,
    notes,
    confidence: Number(confidence.toFixed(2)),
  };
}

export function parseIngredientList(lines: string[]): IngredientParseResult[] {
  return lines.map((line) => parseIngredient(line));
}
