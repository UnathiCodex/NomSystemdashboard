/**
 * ## Food
 *
 * My foods in `Foods.md`, my meals in `Meals.md`, a search of mine and of Open Food Facts,
 * and the meals of a day from the log with what they give.
 * - `Foods.md`: One Markdown table, one row per food, brand and store keep two shops apart.
 * - `Meals.md`: Each meal only its foods with their grams, no variants, since I cook it a bit differently every time.
 * - Names: No comma in a name, brand or store, since commas part names.
 * - Nutrients: One unknown never 0, the one missing of protein, carbs and fat worked out from kcal.
 * - Old rows: A row without brand, store or pack gets their columns with the next food.
 * - Log: A meal an entry of `Food`, one `X-FOOD` line per food, so the log tells which product it was.
 * - Cooking: `Cook` lists what went into the pot the same way and counts nothing.
 * - Guessed: Grams with `~` count as an estimate, since a guess from a photo is about a third off (Fridolfsson 2025).
 * - Meal part: A food of a meal carries the meal, so the log keeps what it held that day.
 * - Portion: That of a serving, else 100, never the pack, since `2x` means two portions.
 * - Anonymous: A request to Open Food Facts carries never my email or my name.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, entriesRead, entryLookup, propertiesPut } from "./calendar.ts";
import { cellsOf, markdownFormOf, nameOf } from "./markdown.ts";
import { food, writeAllowed } from "./sources.ts";

import type { Entry } from "./calendar.ts";

/** Energy and nutrients of 100 g of a food or of one food eaten, `null` where unknown, since a 0 is a true 0. */
export type Nutrients = {
    kcal: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
};

/** What meals gave together, an unknown nutrient adding nothing. */
export type Totals = {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
};

/** `Eat` in grams, `Drink` in millilitres, which a summary leaves out. */
export type Kind = "Eat" | "Drink";

/**
 * A row of `Foods.md`, its nutrients per 100 of its unit.
 * No two foods share name, brand and store, ignoring case.
 * - `barcode`: Empty for a food added by hand.
 * - `portion`: What I take at once, so `2x` is twice that, `null` only in a row emptied by hand.
 * - `kind`: `Eat` for a row without one.
 */
export type Food = Nutrients & {
    name: string;
    barcode: string;
    brand: string;
    store: string;
    pack: number | null;
    portion: number | null;
    kind: Kind;
};

/** A product of Open Food Facts, kcal `null` when unknown, so it still shows and I type them from the pack. */
export type Product = Omit<Food, "kcal"> & {
    kcal: number | null;
};

/**
 * What a search finds.
 * - `foods`: Mine by name or barcode, the most eaten first, all for an empty search.
 * - `products`: Those of Open Food Facts not mine, `null` when it cannot be reached.
 * - `total`: Matches on Open Food Facts, mine among them, a lower bound when not `exact`.
 */
export type FoodsFound = {
    foods: Food[];
    products: Product[] | null;
    total: number;
    exact: boolean;
    more: boolean;
};

/** One page of products of Open Food Facts. */
type ProductsPage = Omit<FoodsFound, "foods" | "products"> & { products: Product[] };

/**
 * A food of mine to change.
 * - `old`: Its name, brand and store as `Foods.md` holds them.
 * - `portion`: `null` takes 100.
 */
export type FoodChanged = {
    old: { name: string; brand: string; store: string };
    name: string;
    brand: string;
    store: string;
    barcode?: string;
    kcal?: number;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    pack?: number | null;
    portion?: number | null;
    kind?: Kind;
};

/**
 * A food of a meal with what it gives.
 * - `grams`: Millilitres of a drink, 0 for a line without grams.
 * - `known`: Whether `Foods.md` holds it, an unknown food gives nothing.
 * - `meal`: The meal of mine it belongs to, empty for one eaten by itself.
 */
export type Eaten = Nutrients & {
    name: string;
    brand: string;
    store: string;
    grams: number;
    estimate: boolean;
    known: boolean;
    meal: string;
    kind: Kind;
};

/** A line `X-FOOD` as read, brand and store empty in an old line. */
type Line = {
    name: string;
    brand: string;
    store: string;
    grams: number | null;
    guessed: boolean;
    meal: string;
};

/** A log entry of `Food` with what its foods give, `estimate` when one counts grams guessed. */
export type Meal = Totals & {
    id: string;
    start: string;
    title: string;
    location: string;
    foods: Eaten[];
    estimate: boolean;
};

/**
 * A meal of mine in `Meals.md`, every food I may put in.
 * - `short`: What its brackets show, empty for none.
 * - `foods`: Name, brand and store parted by `;`.
 * - `standard`: The grams an entry starts with, 0 for a food I rarely put in, `null` for none set.
 */
export type Composition = {
    name: string;
    short: string;
    foods: string[];
    standard: (number | null)[];
};

/**
 * A meal of mine with what it gives.
 * - `kcal`: At standard grams, `null` while no food has some.
 * - `portions`: The portion of each food, so its standard grams take `2x`.
 */
export type Dish = Composition & {
    kcal: number | null;
    portions: (number | null)[];
    kinds: Kind[];
};

/** The meals of a day with what they give together. */
export type FoodDay = Totals & {
    meals: Meal[];
    estimate: boolean;
};

/**
 * A product as Open Food Facts sends it, each field maybe missing.
 * `brands` and `stores` come as a list from the search, as text with commas from the products.
 * A name in a language comes only with a whole product.
 */
type ProductSent = {
    code?: string;
    product_name?: string;
    [name: `product_name_${string}`]: string | undefined;
    brands?: string | string[];
    stores?: string | string[];
    quantity?: string;
    serving_quantity?: number | string;
    nutrition_data_per?: string;
    nutriments?: { [nutrient: string]: number | string | undefined };
};

/** Answer of Open Food Facts, `product` missing for an unknown barcode. */
type Answer = {
    hits?: ProductSent[];
    count?: number;
    is_count_exact?: boolean;
    page_count?: number;
    product?: ProductSent;
};

/** A row of `Foods.md` by the names of its columns. */
type Cells = { [column: string]: string | undefined };

/** Category of meals. */
export const foodName: string = "Food";

/** Head of the table of `Foods.md`. */
const foodsHead: string[] = [
    "| Food | kcal | Protein | Carbs | Fat | Barcode " + "| Brand | Store | Portion | Pack | Kind |",
    "| --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | --- |",
];

/** Text a new `Foods.md` starts with, nothing of how the code uses it. */
const fileHead: string[] = [
    "# Foods",
    "",
    "Nutrients per 100 g, or per 100 ml for a drink; Portion and Pack in g or ml.",
    "",
    ...foodsHead,
];

/** Lines of the table of `Foods.md` before its rows. */
const tableHead: number = 2;

/** Head of the table of a meal in `Meals.md`, no text above it, since its columns say enough. */
const mealHead: string[] = ["| Food | Brand | Store | Grams |", "| --- | --- | --- | ---: |"];

/** Old line `X-FOOD` without brand and store, the meal then with its servings and maybe its variant. */
const foodLine: RegExp = new RegExp(
    /^([^;]+?)/.source +
        /(?:;\s*(~)?\s*(\d+(?:[.,]\d+)?))?/.source +
        /(?:;\s*([^;|]+?)\s*;\s*(\d+(?:[.,]\d+)?)(?:\s*;\s*([^;|]*?))?)?/.source +
        /\s*$/.source,
);

/** Grams in a line `X-FOOD`, `~` before grams guessed. */
const gramsPart: RegExp = /^(~)?\s*(\d+(?:[.,]\d+)?)$/;

const barcode: RegExp = /^\d{8,14}$/;

/** Fewest characters to ask Open Food Facts, since fewer find mostly noise. */
const searchLength: number = 3;

/** Name the dashboard gives Open Food Facts, without email or name, so nothing about me leaves. */
const agent: string = "NomSystemDashboard/0.1";

const productFields: string =
    "code,product_name,brands,stores,quantity,serving_quantity," + "nutrition_data_per,nutriments";

/** German, since I shop in Germany, and English. */
const searchLanguages: string = "de,en";

/** Products on a page of a search, those without name or kcal and mine falling out. */
const pageSize: number = 8;

/** Milliseconds Open Food Facts gets before a search goes on without it. */
const answerTime: number = 5000;

const dayLength: number = 24 * 60 * 60 * 1000;

/** The whole log, its end what is to come. */
const [logStart, logEnd]: [string, string] = ["1970-01-01T00:00:00Z", "9999-12-31T00:00:00Z"];

/** kcal of a gram, as food labels count it. */
const kcalPerGram: { protein: number; carbs: number; fat: number } = {
    protein: 4,
    carbs: 4,
    fat: 9,
};

/** A number of a text with a decimal comma or point, 0 for an unreadable one. */
function numberOf(text: string | undefined): number {
    return Number((text ?? "").replace(",", ".")) || 0;
}

/** A nutrient, `null` for one empty or unreadable, never 0. */
function nutrientOf(sent: number | string | null | undefined): number | null {
    const text: string = String(sent ?? "")
        .trim()
        .replace(",", ".");
    const value: number = text === "" ? NaN : Number(text);
    return Number.isFinite(value) ? value : null;
}

function roundOf(value: number, digits: number): number {
    return Math.round(value * 10 ** digits) / 10 ** digits;
}

function isAmount(value: unknown): boolean {
    return typeof value === "number" && value >= 0;
}

/** Throws when one of the files lies outside the new system. */
function writeCheck(...files: string[]): void {
    if (!files.every((file: string): boolean => writeAllowed(file)))
        throw new Error(`No writing outside the new system: ${files[0]}`);
}

/** The lines of `Foods.md`, those of a new one where it does not exist yet. */
function foodsLinesRead(): string[] {
    return existsSync(food.foods) ? readFileSync(food.foods, "utf8").split("\n") : [...fileHead, ""];
}

/** A summary with one of its parts renamed. */
function summaryRenamed(title: string, same: (part: string) => boolean, name: string): string {
    return title
        .split(", ")
        .map((part: string): string => (same(part) ? name : part))
        .join(", ");
}

/**
 * Nutrients as `Foods.md` writes them, kcal whole, the rest to one decimal.
 * The one of protein, carbs and fat missing is worked out from kcal and the other two.
 * With two or three missing the kcal cannot tell them apart, so they stay unknown.
 */
function nutrientsOf(values: Nutrients): Nutrients {
    const rounded: Nutrients = {
        kcal: roundOf(values.kcal, 0),
        protein: values.protein === null ? null : roundOf(values.protein, 1),
        carbs: values.carbs === null ? null : roundOf(values.carbs, 1),
        fat: values.fat === null ? null : roundOf(values.fat, 1),
    };
    const missing: number = [rounded.protein, rounded.carbs, rounded.fat].filter(
        (value: number | null): boolean => value === null,
    ).length;
    if (missing !== 1) return rounded;
    const rest: number =
        rounded.kcal -
        kcalPerGram.protein * (rounded.protein ?? 0) -
        kcalPerGram.carbs * (rounded.carbs ?? 0) -
        kcalPerGram.fat * (rounded.fat ?? 0);
    return {
        kcal: rounded.kcal,
        protein: rounded.protein ?? roundOf(Math.max(0, rest / kcalPerGram.protein), 1),
        carbs: rounded.carbs ?? roundOf(Math.max(0, rest / kcalPerGram.carbs), 1),
        fat: rounded.fat ?? roundOf(Math.max(0, rest / kcalPerGram.fat), 1),
    };
}

/**
 * Cleans the name of a food or meal as it goes in, without a comma, since commas part names.
 * A comma between two digits becomes a point, every other comma one space.
 */
function foodTextOf(text: string): string {
    return nameOf(text.replace(/(\d),(?=\d)/g, "$1.").replace(/\s*,\s*/g, " "));
}

/** Cleans a brand or a store as a food name, without quotes and backslashes. */
function brandOf(brand: string): string {
    return foodTextOf(brand.replace(/["\\]/g, " "));
}

/** The first of the brands or stores of a product, from a list or a text with commas. */
function firstOf(sent: string | string[] | undefined): string {
    return nameOf(([sent ?? ""].flat()[0] ?? "").split(",")[0]);
}

/** Grams or millilitres of one of each unit of a pack. */
const unitSizes: { [unit: string]: number } = {
    g: 1,
    kg: 1000,
    ml: 1,
    cl: 10,
    dl: 100,
    l: 1000,
};

/** The size of a pack in grams or millilitres, its first weight or volume, nothing for `1 pcs`. */
function packOf(quantity: string | undefined): number | null {
    const size: RegExpExecArray | null = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i.exec(quantity ?? "");
    return size === null ? null : roundOf(numberOf(size[1]) * unitSizes[size[2].toLowerCase()], 1);
}

/** `Drink` when its nutrients are per 100 ml or its pack a volume. */
function productKindOf(sent: ProductSent): Kind {
    return sent.nutrition_data_per === "100ml" || /\d\s*(ml|cl|dl|l)\b/i.test(sent.quantity ?? "") ? "Drink" : "Eat";
}

/** `Eat` for anything but `Drink`, an old row without kind too. */
function kindOf(text: unknown): Kind {
    return String(text ?? "")
        .trim()
        .toLowerCase() === "drink"
        ? "Drink"
        : "Eat";
}

/** The portion given, else 100, never the pack, so `1x` of a jar of jam is not the jar. */
function portionOf(given: number | null): number {
    return given !== null && given > 0 ? roundOf(given, 1) : 100;
}

/** Cells of a row by the names of its head, so an older order reads too, `Piece` as `Portion`. */
function cellsByNameOf(head: string[], line: string): Cells {
    const cells: string[] = cellsOf(line);
    return Object.fromEntries(
        head.map((name: string, index: number): [string, string] => [
            name === "Piece" ? "Portion" : name,
            cells[index] ?? "",
        ]),
    );
}

/** My foods in their order, a row without a name left out. */
export function foodsRead(): Food[] {
    if (!existsSync(food.foods)) return [];

    const rows: string[] = readFileSync(food.foods, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"));
    const head: string[] = cellsOf(rows[0] ?? "");
    return rows
        .slice(tableHead)
        .map((line: string): Cells => cellsByNameOf(head, line))
        .filter((cells: Cells): boolean => (cells.Food ?? "") !== "")
        .map((cells: Cells): Food => ({
            name: cells.Food ?? "",
            kcal: numberOf(cells.kcal),
            protein: nutrientOf(cells.Protein),
            carbs: nutrientOf(cells.Carbs),
            fat: nutrientOf(cells.Fat),
            barcode: cells.Barcode ?? "",
            brand: cells.Brand ?? "",
            store: cells.Store ?? "",
            pack: nutrientOf(cells.Pack),
            portion: nutrientOf(cells.Portion),
            kind: kindOf(cells.Kind),
        }));
}

function mealsRead(start: string, end: string): Entry[] {
    return entriesRead(food.log, start, end).filter((entry: Entry): boolean => entry.category === foodName);
}

/** Name, then brand and store in brackets, since they only tell which one it is. */
export function labelOf(food: { name: string; brand: string; store: string }): string {
    const place: string[] = [food.brand, food.store].filter((part: string): boolean => part !== "");
    return place.length === 0 ? food.name : `${food.name} (${place.join(", ")})`;
}

/** The key by which a line `X-FOOD` finds its food. */
function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

/** My foods by key, and by name alone for an old line, the first food of a name. */
function foodsByKeyRead(): Map<string, Food> {
    const mine: Map<string, Food> = new Map();
    for (const row of foodsRead()) {
        mine.set(keyOf(row), row);
        if (!mine.has(row.name.toLowerCase())) mine.set(row.name.toLowerCase(), row);
    }
    return mine;
}

/** The food of a line, by name alone when it has no brand and store. */
function foodOfLine(read: Line, mine: Map<string, Food>): Food | undefined {
    return (
        mine.get(keyOf(read)) ??
        (read.brand === "" && read.store === "" ? mine.get(read.name.toLowerCase()) : undefined)
    );
}

/**
 * Name, brand, store, grams and meal of a line `X-FOOD`, a food of `Meals.md` with three parts.
 * Told apart from an old line by its second part being no grams and its fourth grams or empty.
 *
 * @returns `null` for an old line without brand and store
 */
function partsOf(line: string): string[] | null {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    if (
        (parts.length === 4 || parts.length === 5) &&
        !gramsPart.test(parts[1]) &&
        (parts[3] === "" || gramsPart.test(parts[3]))
    )
        return [...parts, ""].slice(0, 5);
    if (parts.length === 3 && !gramsPart.test(parts[1]) && !gramsPart.test(parts[2])) return [...parts, "", ""];
    return null;
}

/** Reads a line `X-FOOD`, an old one by {@link foodLine}. */
function lineOf(line: string): Line {
    const parts: string[] | null = partsOf(line);
    if (parts !== null) {
        const grams: RegExpExecArray | null = gramsPart.exec(parts[3]);
        return {
            name: parts[0],
            brand: parts[1],
            store: parts[2],
            grams: grams === null ? null : numberOf(grams[2]),
            guessed: grams?.[1] !== undefined,
            meal: parts[4],
        };
    }
    const old: RegExpExecArray | null = foodLine.exec(line.trim());
    return {
        name: old === null ? line.trim() : old[1].trim(),
        brand: "",
        store: "",
        grams: old?.[3] === undefined ? null : numberOf(old[3]),
        guessed: old?.[2] !== undefined,
        meal: old?.[4] ?? "",
    };
}

/** How often each food was eaten up to now, by its key. */
function usesRead(): Map<string, number> {
    const uses: Map<string, number> = new Map();
    for (const meal of mealsRead(logStart, new Date().toISOString()))
        for (const line of meal.foods) {
            const key: string = keyOf(lineOf(line));
            uses.set(key, (uses.get(key) ?? 0) + 1);
        }
    return uses;
}

/** A barcode asks for the whole product, since no field lists the names of all languages. */
function addressOf(query: string, page: number): URL {
    if (barcode.test(query)) return new URL(`${food.product}${query}`);
    const address: URL = new URL(food.search);
    address.searchParams.set("q", query);
    address.searchParams.set("langs", searchLanguages);
    address.searchParams.set("page_size", String(pageSize));
    address.searchParams.set("page", String(page));
    address.searchParams.set("fields", productFields);
    return address;
}

/** Its main name, else German, English or any, since a product may have no main name. */
function productNameOf(sent: ProductSent): string {
    const languages: string[] = Object.entries(sent)
        .filter(([key]: [string, unknown]): boolean => /^product_name_[a-z]{2}$/.test(key))
        .map(([, name]: [string, unknown]): string => String(name));
    return (
        [sent.product_name, sent.product_name_de, sent.product_name_en, ...languages]
            .map((name: string | undefined): string => foodTextOf(name ?? ""))
            .find((name: string): boolean => name !== "") ?? ""
    );
}

/**
 * A product as it would go into `Foods.md`, kcal else from its kJ.
 *
 * @returns `null` when it has no name in any language
 */
function productOf(sent: ProductSent): Product | null {
    const nutrients: { [nutrient: string]: number | string | undefined } = sent.nutriments ?? {};
    const kj: number | null = nutrientOf(nutrients["energy-kj_100g"]);
    const kcal: number | null = nutrientOf(nutrients["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184);
    const given: Omit<Nutrients, "kcal"> = {
        protein: nutrientOf(nutrients.proteins_100g),
        carbs: nutrientOf(nutrients.carbohydrates_100g),
        fat: nutrientOf(nutrients.fat_100g),
    };
    const name: string = productNameOf(sent);
    const pack: number | null = packOf(sent.quantity);
    if (name === "") return null;

    return {
        name: name,
        ...(kcal === null ? { kcal: null, ...given } : nutrientsOf({ kcal: kcal, ...given })),
        barcode: sent.code ?? "",
        brand: brandOf(firstOf(sent.brands)),
        store: brandOf(firstOf(sent.stores)),
        pack: pack,
        portion: portionOf(nutrientOf(sent.serving_quantity)),
        kind: productKindOf(sent),
    };
}

/**
 * Asks Open Food Facts for a page of a search, an unknown barcode answering `404 Not Found`.
 *
 * @throws {Error} - When Open Food Facts does not answer in time or answers with an error
 */
async function productsAsk(query: string, page: number): Promise<ProductsPage> {
    const response: Response = await fetch(addressOf(query, page), {
        headers: { "User-Agent": agent },
        signal: AbortSignal.timeout(answerTime),
    });
    if (!response.ok && response.status !== 404) throw new Error(`Open Food Facts answered ${response.status}`);

    const answer: Answer = (await response.json()) as Answer;
    const sent: ProductSent[] = answer.hits ?? (answer.product === undefined ? [] : [answer.product]);
    const products: Product[] = sent
        .map(productOf)
        .filter((product: Product | null): product is Product => product !== null);
    return {
        products: products,
        total: answer.count ?? products.length,
        exact: answer.is_count_exact ?? true,
        more: page < (answer.page_count ?? 0),
    };
}

/**
 * Finds foods by a name or a barcode, mine first, then a page of Open Food Facts.
 *
 * @param page - 1 for the first, anything no whole number above 0 counting as 1
 * @param products - Whether Open Food Facts is asked too, not for a meal of mine
 */
export async function foodsFind(text: string, page: number, products: boolean): Promise<FoodsFound> {
    const query: string = text.trim().toLowerCase();
    const mine: Food[] = foodsRead();
    const uses: Map<string, number> = usesRead();
    const foods: Food[] = mine
        .filter(
            (candidate: Food): boolean =>
                labelOf(candidate).toLowerCase().includes(query) || candidate.barcode === query,
        )
        .sort(
            (first: Food, second: Food): number =>
                (uses.get(keyOf(second)) ?? 0) - (uses.get(keyOf(first)) ?? 0) || first.name.localeCompare(second.name),
        );
    const none: Omit<ProductsPage, "products"> = { total: 0, exact: true, more: false };
    if (!products || query.length < searchLength) return { foods: foods, products: [], ...none };

    try {
        const found: ProductsPage = await productsAsk(query, Number.isInteger(page) && page > 0 ? page : 1);
        return {
            foods: foods,
            ...found,
            products: found.products.filter(
                (product: Product): boolean =>
                    !mine.some((candidate: Food): boolean => candidate.barcode === product.barcode),
            ),
        };
    } catch (error: unknown) {
        console.error(new Date().toISOString(), "Open Food Facts", error);
        return { foods: foods, products: null, ...none };
    }
}

/** A food as a row of `Foods.md`, an unknown nutrient an empty cell. */
function rowOf(food: Food): string {
    const cells: (string | number | null)[] = [
        food.name,
        food.kcal,
        food.protein,
        food.carbs,
        food.fat,
        food.barcode,
        food.brand,
        food.store,
        food.portion,
        food.pack,
        food.kind,
    ];
    const texts: string[] = cells.map((cell: string | number | null): string => String(cell ?? ""));
    return `| ${texts.join(" | ")} |`;
}

/**
 * Gives an old table of `Foods.md` the columns of today, every cell under its column.
 *
 * @param lines - Changed in place
 */
function tableHeadPut(lines: string[], header: number): void {
    if (lines[header] === foodsHead[0]) return;

    const columns: string[] = cellsOf(foodsHead[0]);
    const head: string[] = cellsOf(lines[header]);
    for (const [index, line] of lines.entries())
        if (index >= header + tableHead && line.startsWith("|")) {
            const cells: Cells = cellsByNameOf(head, line);
            lines[index] = `| ${columns.map((name: string): string => cells[name] ?? "").join(" | ")} |`;
        }
    lines.splice(header, tableHead, ...foodsHead);
}

/** The row of a food by its key, -1 for none. */
function rowFind(lines: string[], header: number, key: string): number {
    const head: string[] = cellsOf(lines[header]);
    return lines.findIndex((line: string, index: number): boolean => {
        const cells: Cells = cellsByNameOf(head, line);
        return (
            index >= header + tableHead &&
            line.startsWith("|") &&
            keyOf({
                name: cells.Food ?? "",
                brand: cells.Brand ?? "",
                store: cells.Store ?? "",
            }) === key
        );
    });
}

/**
 * Adds a food as the last row of `Foods.md`, every other line staying.
 * A product that is mine already by barcode or key, like the same beans in a bigger can, is that food.
 * A food by hand with the name, brand and store of one of mine is refused.
 *
 * @returns The food as written, or my food the product is already
 * @throws {Error} - When a number or the name or barcode is wrong, the food is mine already, or no table
 */
export function foodAdd(sent: Food): Food {
    if (
        !isAmount(sent.kcal) ||
        ![sent.protein, sent.carbs, sent.fat].every((value: unknown): boolean => value === null || isAmount(value))
    )
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);

    const pack: number | null = isAmount(sent.pack) && Number(sent.pack) > 0 ? roundOf(Number(sent.pack), 1) : null;
    const added: Food = {
        name: foodTextOf(String(sent.name ?? "")),
        ...nutrientsOf(sent),
        barcode: String(sent.barcode ?? "").trim(),
        brand: brandOf(String(sent.brand ?? "")),
        store: brandOf(String(sent.store ?? "")),
        pack: pack,
        portion: portionOf(isAmount(sent.portion) ? Number(sent.portion) : null),
        kind: kindOf(sent.kind),
    };
    if (added.name === "") throw new Error(`No name of a food: ${JSON.stringify(sent)}`);
    if (!/^\d*$/.test(added.barcode)) throw new Error(`No barcode: ${added.barcode}`);
    const same: Food | undefined = foodsRead().find(
        (mine: Food): boolean =>
            keyOf(mine) === keyOf(added) || (added.barcode !== "" && mine.barcode === added.barcode),
    );
    if (same !== undefined && added.barcode !== "") return same;
    if (same !== undefined) throw new Error(`No new food: ${labelOf(added)}`);
    writeCheck(food.foods);

    const lines: string[] = foodsLinesRead();
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    if (last === -1) throw new Error(`No table in ${food.foods}`);

    tableHeadPut(lines, header);
    lines.splice(last + 1, 0, rowOf(added));
    mkdirSync(dirname(food.foods), { recursive: true });
    writeFileSync(food.foods, lines.join("\n"));
    return added;
}

/** The key of the food of a line, `null` for an old line. */
function lineKeyOf(line: string): string | null {
    const parts: string[] | null = partsOf(line);
    return parts === null ? null : keyOf({ name: parts[0], brand: parts[1], store: parts[2] });
}

/** A line with its food renamed when it names it by key, any other line as it is. */
function lineRenamed(line: string, old: string, renamed: { name: string; brand: string; store: string }): string {
    if (lineKeyOf(line) !== old) return line;
    return [renamed.name, renamed.brand, renamed.store, ...line.split(";").slice(3)].join(";");
}

/**
 * Changes a food of mine, renamed wherever it stands, so every entry and meal still finds it.
 * The log first, its summary too where it stands beside a meal, then `Meals.md`, last `Foods.md`,
 * so one stopped in between finishes when sent again.
 * What is not sent stays, kcal also when `null`, since a food needs them.
 *
 * @throws {Error} - When no such food, a wrong name, number, barcode or kind, or a file outside the new system
 */
export function foodChange(sent: FoodChanged): Food {
    const old: string = keyOf({
        name: String(sent.old?.name ?? ""),
        brand: String(sent.old?.brand ?? ""),
        store: String(sent.old?.store ?? ""),
    });
    const renamed: { name: string; brand: string; store: string } = {
        name: foodTextOf(String(sent.name ?? "")),
        brand: brandOf(String(sent.brand ?? "")),
        store: brandOf(String(sent.store ?? "")),
    };
    const mine: Food[] = foodsRead();
    const found: Food | undefined = mine.find((candidate: Food): boolean => keyOf(candidate) === old);
    if (found === undefined) throw new Error(`No food of mine: ${JSON.stringify(sent.old)}`);
    if (
        renamed.name === "" ||
        mine.some((candidate: Food): boolean => candidate !== found && keyOf(candidate) === keyOf(renamed))
    )
        throw new Error(`No new name of a food: ${labelOf(renamed)}`);
    const kcal: number = sent.kcal ?? found.kcal;
    if (
        !isAmount(kcal) ||
        ![sent.protein, sent.carbs, sent.fat, sent.portion, sent.pack].every(
            (value: unknown): boolean => value === undefined || value === null || isAmount(value),
        )
    )
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);
    const code: string = String(sent.barcode ?? found.barcode).trim();
    if (!/^\d*$/.test(code)) throw new Error(`No barcode: ${code}`);
    if (sent.kind !== undefined && sent.kind !== "Eat" && sent.kind !== "Drink")
        throw new Error(`No kind of a food: ${String(sent.kind)}`);
    const pack: number | null =
        sent.pack === undefined ? found.pack : sent.pack === null || sent.pack === 0 ? null : roundOf(sent.pack, 1);
    const changed: Food = {
        ...found,
        ...renamed,
        barcode: code,
        ...nutrientsOf({
            kcal: kcal,
            protein: sent.protein === undefined ? found.protein : sent.protein,
            carbs: sent.carbs === undefined ? found.carbs : sent.carbs,
            fat: sent.fat === undefined ? found.fat : sent.fat,
        }),
        pack: pack,
        portion: sent.portion === undefined ? found.portion : portionOf(sent.portion),
        kind: sent.kind ?? found.kind,
    };
    if (rowOf(changed) === rowOf(found)) return found;
    writeCheck(food.foods, food.meals);

    const renamedIn: (lines: string[]) => string[] = (lines: string[]): string[] =>
        lines.map((line: string): string => lineRenamed(line, old, renamed));
    const touched: (lines: string[]) => boolean = (lines: string[]): boolean =>
        lines.some((line: string): boolean => lineRenamed(line, old, renamed) !== line);
    for (const entry of entriesRead(food.log, logStart, logEnd)) {
        if (!touched(entry.foods)) continue;
        const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
        const beside: boolean = entry.foods.some(
            (line: string): boolean => lineKeyOf(line) === old && lineOf(line).meal === "",
        );
        const properties: [string, string[]][] = [["x-food", renamedIn(entry.foods)]];
        if (beside)
            properties.push([
                "summary",
                [summaryRenamed(entry.title, (part: string): boolean => part === found.name, renamed.name)],
            ]);
        if (file !== undefined) propertiesPut(file, entry.id, properties);
    }
    const meals: Composition[] = compositionsRead();
    if (meals.some((meal: Composition): boolean => touched(meal.foods)))
        compositionsWrite(meals.map((meal: Composition): Composition => ({ ...meal, foods: renamedIn(meal.foods) })));

    const lines: string[] = foodsLinesRead();
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    tableHeadPut(lines, header);
    lines[rowFind(lines, header, old)] = rowOf(changed);
    writeFileSync(food.foods, lines.join("\n"));
    return changed;
}

/**
 * Removes the row of a food, entries and meals keeping their lines, which then count nothing.
 *
 * @throws {Error} - When `Foods.md` holds no such food, or lies outside the new system
 */
export function foodRemove(sent: { name: string; brand: string; store: string }): void {
    writeCheck(food.foods);
    const lines: string[] = foodsLinesRead();
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const row: number = header === -1 ? -1 : rowFind(lines, header, keyOf(sent));
    if (row === -1) throw new Error(`No food of mine: ${JSON.stringify(sent)}`);
    lines.splice(row, 1);
    writeFileSync(food.foods, lines.join("\n"));
}

/** Adds up what is known, an unknown nutrient adding nothing. */
function sumOf(parts: Nutrients[]): Totals {
    const sum: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const part of parts) {
        sum.kcal += part.kcal;
        sum.protein += part.protein ?? 0;
        sum.carbs += part.carbs ?? 0;
        sum.fat += part.fat ?? 0;
    }
    return sum;
}

/** What the food of a line gives, unknown nutrients staying `null`, nothing without grams. */
function eatenOf(line: string, mine: Map<string, Food>): Eaten {
    const read: Line = lineOf(line);
    const known: Food | undefined = foodOfLine(read, mine);
    const grams: number = read.grams ?? 0;
    const share: number = known === undefined ? 0 : grams / 100;
    const part: (per: number | null | undefined) => number | null = (per: number | null | undefined): number | null =>
        per === null || per === undefined ? null : share * per;
    return {
        name: read.name,
        brand: read.brand,
        store: read.store,
        grams: grams,
        estimate: read.guessed,
        known: known !== undefined,
        meal: read.meal,
        kind: known?.kind ?? "Eat",
        kcal: share * (known?.kcal ?? 0),
        protein: part(known?.protein),
        carbs: part(known?.carbs),
        fat: part(known?.fat),
    };
}

function mealOf(entry: Entry, mine: Map<string, Food>): Meal {
    const foods: Eaten[] = entry.foods.map((line: string): Eaten => eatenOf(line, mine));
    return {
        ...sumOf(foods),
        id: entry.id,
        start: entry.start,
        title: entry.title,
        location: entry.location,
        foods: foods,
        estimate: foods.some((eaten: Eaten): boolean => eaten.estimate),
    };
}

/**
 * The meals that start on the day in Berlin time, read from noon before to noon after, which holds the whole day.
 *
 * @throws {Error} - When the date is not written like `2026-10-10`
 */
export function foodDayRead(date: string): FoodDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const mine: Map<string, Food> = foodsByKeyRead();
    const meals: Meal[] = mealsRead(new Date(noon - dayLength).toISOString(), new Date(noon + dayLength).toISOString())
        .filter((entry: Entry): boolean => berlinDateOf(new Date(entry.start)) === date)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Meal => mealOf(entry, mine));
    return {
        ...sumOf(meals),
        meals: meals,
        estimate: meals.some((meal: Meal): boolean => meal.estimate),
    };
}

/** What the meals among entries give, by their id. */
export function mealsOf(entries: Entry[]): Map<string, Meal> {
    const mine: Map<string, Food> = foodsByKeyRead();
    return new Map(
        entries
            .filter((entry: Entry): boolean => entry.category === foodName && entry.foods.length > 0)
            .map((entry: Entry): [string, Meal] => [entry.id, mealOf(entry, mine)]),
    );
}

/** The summary of a meal, its meals of mine, then the foods beside them, drinks out unless only drinks. */
export function mealTitleOf(lines: string[]): string {
    type Named = { name: string; kind: Kind };
    const mine: Map<string, Food> = foodsByKeyRead();
    const read: Line[] = lines.map(lineOf);
    const named: Named[] = [
        ...[
            ...new Set(read.filter((line: Line): boolean => line.meal !== "").map((line: Line): string => line.meal)),
        ].map((meal: string): Named => ({ name: meal, kind: "Eat" })),
        ...read
            .filter((line: Line): boolean => line.meal === "")
            .map((line: Line): Named => ({
                name: line.name,
                kind: foodOfLine(line, mine)?.kind ?? "Eat",
            })),
    ];
    const eaten: Named[] = named.filter((part: Named): boolean => part.kind !== "Drink");
    return (eaten.length > 0 ? eaten : named).map((part: Named): string => part.name).join(", ");
}

/**
 * The foods of each meal together, then those beside them, each group by its grams,
 * so the foods that matter most stand first, whatever grams I change.
 */
export function foodsRanked(lines: string[]): string[] {
    const mealOf: (line: string) => string = (line: string): string => lineOf(line).meal;
    const ranked: (meal: string) => string[] = (meal: string): string[] =>
        lines
            .filter((line: string): boolean => mealOf(line) === meal)
            .sort(
                (first: string, second: string): number => rankOf(lineOf(second).grams) - rankOf(lineOf(first).grams),
            );
    return [...new Set([...lines.map(mealOf).filter((meal: string): boolean => meal !== ""), ""])].flatMap(ranked);
}

/**
 * Whether a line `X-FOOD` sent is well formed, an old one with servings above 0.
 * Whether `Foods.md` holds the food is not asked, so a moved meal keeps a food that left it.
 */
export function foodLineAllows(line: string): boolean {
    const read: Line = lineOf(line);
    const parts: string[] | null = partsOf(line);
    if (parts !== null)
        return (
            read.name !== "" &&
            !parts.some((part: string): boolean => part.includes("|")) &&
            (read.grams === null || read.grams > 0)
        );
    const old: RegExpExecArray | null = foodLine.exec(line.trim());
    return (
        old !== null &&
        read.name !== "" &&
        !/[;|]/.test(read.name) &&
        (read.grams === null || read.grams > 0) &&
        (old[5] === undefined || numberOf(old[5]) > 0)
    );
}

/** My meals, a section per heading `###`, the line below its short title when it is no row. */
export function compositionsRead(): Composition[] {
    if (!existsSync(food.meals)) return [];

    return readFileSync(food.meals, "utf8")
        .split(/^### /m)
        .slice(1)
        .map((section: string): Composition => {
            const lines: string[] = section.split("\n").filter((line: string): boolean => line.trim() !== "");
            const rows: string[][] = lines
                .filter((line: string): boolean => line.startsWith("|"))
                .slice(tableHead)
                .map(cellsOf);
            return {
                name: lines[0].trim(),
                short: lines[1]?.startsWith("|") === false ? lines[1].trim() : "",
                foods: rows.map((cells: string[]): string => cells.slice(0, 3).join(";")),
                standard: rows.map((cells: string[]): number | null => nutrientOf(cells[3] ?? "")),
            };
        });
}

/** My meals with what they give at standard grams. */
export function dishesRead(): Dish[] {
    const mine: Map<string, Food> = foodsByKeyRead();
    return compositionsRead().map((meal: Composition): Dish => ({
        ...meal,
        kcal: meal.standard.every((grams: number | null): boolean => grams === null)
            ? null
            : meal.foods.reduce(
                  (sum: number, line: string, index: number): number =>
                      sum + ((meal.standard[index] ?? 0) / 100) * (foodOfLine(lineOf(line), mine)?.kcal ?? 0),
                  0,
              ),
        portions: meal.foods.map((line: string): number | null => foodOfLine(lineOf(line), mine)?.portion ?? null),
        kinds: meal.foods.map((line: string): Kind => foodOfLine(lineOf(line), mine)?.kind ?? "Eat"),
    }));
}

/** Writes `Meals.md` anew, a section per meal. */
function compositionsWrite(meals: Composition[]): void {
    const sections: string[][] = meals.map((meal: Composition): string[] => [
        `### ${meal.name}`,
        ...(meal.short === "" ? [] : [meal.short]),
        ...mealHead,
        ...meal.foods.map((line: string, index: number): string => {
            const read: Line = lineOf(line);
            const grams: number | null = meal.standard[index] ?? null;
            return `| ${read.name} | ${read.brand} | ${read.store} ` + `| ${grams === null ? "" : roundOf(grams, 1)} |`;
        }),
    ]);
    mkdirSync(dirname(food.meals), { recursive: true });
    writeFileSync(food.meals, markdownFormOf(["# Meals", ...sections.flat()].join("\n")));
}

/**
 * Writes a meal new or changed at its place, a new one last.
 * Short title and standard grams as sent, else as the meal had them.
 * Its foods ordered by their standard grams, so the order needs no hand.
 *
 * @throws {Error} - When the name is empty, it holds no food, or `Meals.md` lies outside the new system
 */
export function dishAdd(sent: { name?: string; foods?: string[]; short?: string; grams?: (number | null)[] }): Dish[] {
    const meals: Composition[] = compositionsRead();
    const typed: string = foodTextOf(String(sent.name ?? ""));
    const at: number = meals.findIndex((meal: Composition): boolean => meal.name.toLowerCase() === typed.toLowerCase());
    const before: Composition | undefined = meals[at];
    const name: string = before?.name ?? typed;
    const foods: string[] = [
        ...new Set(
            (sent.foods ?? []).map((line: string): string => {
                const read: Line = lineOf(String(line));
                return [read.name, read.brand, read.store].map(nameOf).join(";");
            }),
        ),
    ].filter((line: string): boolean => !line.startsWith(";"));
    if (name === "") throw new Error("No name of a meal");
    if (foods.length === 0) throw new Error(`No foods of a meal: ${JSON.stringify(sent.foods)}`);
    writeCheck(food.meals);

    const ranked: [string, number | null][] = foods
        .map((line: string, index: number): [string, number | null] => [
            line,
            sent.grams !== undefined
                ? nutrientOf(sent.grams[index])
                : (before?.standard[before.foods.indexOf(line)] ?? null),
        ])
        .sort(
            (first: [string, number | null], second: [string, number | null]): number =>
                rankOf(second[1]) - rankOf(first[1]),
        );
    const meal: Composition = {
        name: name,
        short: sent.short === undefined ? (before?.short ?? "") : nameOf(String(sent.short)),
        foods: ranked.map(([line]: [string, number | null]): string => line),
        standard: ranked.map(([, grams]: [string, number | null]): number | null => grams),
    };
    compositionsWrite(
        at === -1
            ? [...meals, meal]
            : meals.map((other: Composition, index: number): Composition => (index === at ? meal : other)),
    );
    return dishesRead();
}

/** The more grams the earlier, a food without grams below, one at 0, which I rarely put in, last. */
function rankOf(grams: number | null): number {
    return grams === null ? -1 : grams === 0 ? -2 : grams;
}

/**
 * Renames a meal of mine in the log first, then in `Meals.md`, so one stopped in between finishes when sent again.
 *
 * @throws {Error} - When no such meal, the new name empty or taken, or a file outside the new system
 */
export function dishRename(sent: { old?: string; name?: string }): Dish[] {
    const meals: Composition[] = compositionsRead();
    const same: (name: string) => boolean = (name: string): boolean =>
        name.trim().toLowerCase() ===
        String(sent.old ?? "")
            .trim()
            .toLowerCase();
    const found: Composition | undefined = meals.find((meal: Composition): boolean => same(meal.name));
    const typed: string = foodTextOf(String(sent.name ?? ""));
    if (found === undefined) throw new Error(`No meal of mine: ${String(sent.old)}`);
    if (
        typed === "" ||
        meals.some((meal: Composition): boolean => meal !== found && meal.name.toLowerCase() === typed.toLowerCase())
    )
        throw new Error(`No new name of a meal: ${typed}`);
    if (typed === found.name) return dishesRead();
    writeCheck(food.meals);

    for (const entry of entriesRead(food.log, logStart, logEnd)) {
        if (!entry.foods.some((line: string): boolean => same(line.split(";")[4] ?? ""))) continue;
        const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
        if (file === undefined) continue;
        propertiesPut(file, entry.id, [
            [
                "x-food",
                entry.foods.map((line: string): string => {
                    const parts: string[] = line.split(";");
                    return parts.length > 4 && same(parts[4]) ? [...parts.slice(0, 4), typed].join(";") : line;
                }),
            ],
            ["summary", [summaryRenamed(entry.title, same, typed)]],
        ]);
    }
    compositionsWrite(
        meals.map((meal: Composition): Composition => (meal === found ? { ...meal, name: typed } : meal)),
    );
    return dishesRead();
}

/**
 * Removes a meal, ignoring case.
 *
 * @throws {Error} - When `Meals.md` lies outside the new system
 */
export function dishRemove(name: string): Dish[] {
    if (!existsSync(food.meals)) return [];
    writeCheck(food.meals);
    compositionsWrite(
        compositionsRead().filter(
            (meal: Composition): boolean => meal.name.toLowerCase() !== name.trim().toLowerCase(),
        ),
    );
    return dishesRead();
}
