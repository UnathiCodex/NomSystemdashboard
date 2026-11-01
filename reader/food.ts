/**
 * ## Food
 *
 * Reads my foods from `Foods.md`, finds foods by a name or a barcode, mine first,
 * then on Open Food Facts, page by page, adds new foods to `Foods.md` and renames them,
 * keeps my meals in `Meals.md`,
 * and reads the meals of a day from the log with what they give.
 * `Meals.md` holds my meals, each only its composition,
 * one or more of my foods with their grams,
 * without servings or variants, since I prepare it a little differently every time.
 * An entry brings each food of a meal at these grams
 * and a food picked alone at one portion, see `src/day/meal.ts`.
 * The lists of my meals show each with what it gave the last time I ate it,
 * see {@link dishesRead}.
 * A meal keeps its name as I type it, its spaces too, only without commas,
 * see {@link mealNameOf}.
 * `Foods.md` is one Markdown table with one row per food, see {@link Food}:
 * its brand and store keep the same name of two shops from mixing up.
 * A product of Open Food Facts goes in as Open Food Facts gives it,
 * brand, store and pack empty where it knows none,
 * a food added by hand without barcode and pack, `Eat` until I change it,
 * see {@link foodAdd}.
 * No name, brand or store of a food written holds a comma,
 * which parts names, see {@link foodTextOf}.
 * A nutrient nobody gives is never 0:
 * the one of protein, carbs and fat a food lacks is worked out from its kcal,
 * two or three missing stay unknown, an empty cell,
 * which counts nothing, see {@link nutrientsOf}.
 * A row written before brand, store or pack were kept lacks them,
 * and the table gets their columns with the next food.
 * A food renamed is renamed wherever it stands, see {@link foodChange}.
 * A meal is a log entry of the category `Food`,
 * its `SUMMARY` its foods parted by `, `, drinks left out,
 * and one line `X-FOOD` per food, like `X-FOOD:Skyr natur;K-Classic;Kaufland;150`,
 * so the log tells which product it was, see {@link lineOf}.
 * A line without grams counts nothing.
 * A cooking, `Cook`, lists what went into the pot the same way, which counts nothing.
 * Grams guessed, not weighed, like those Claude reads from a photo of a meal, carry `~`,
 * and count as an estimate,
 * since a guess from a photo is about a third off (Fridolfsson 2025).
 * A food of one of my meals carries the meal as a fifth part,
 * so the log keeps what the meal held that day, whatever I change in `Meals.md` later.
 * Its what names the meal, then the foods eaten beside it.
 * A product of Open Food Facts is a pack as sold, its values per 100 g or 100 ml,
 * its portion that of a serving where Open Food Facts gives one, else 100,
 * never its pack, since `2x` means two portions, not two packs, see {@link productOf}.
 * Open Food Facts is asked anonymously:
 * a request carries the search and the name of the dashboard,
 * never my email or my name.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, entriesRead, entryLookup, propertiesPut } from "./calendar.ts";
import { cellsOf, markdownFormOf, nameOf } from "./markdown.ts";
import { food, writeAllowed } from "./sources.ts";

import type { Entry } from "./calendar.ts";

/**
 * Energy and nutrients of 100 g of a food, or of what one food of a meal gave,
 * as far as they are known:
 * kcal always, protein, carbs and fat `null` where unknown, never 0,
 * since a 0 is a true 0, see {@link nutrientsOf}.
 */
export type Nutrients = {
    kcal: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
};

/**
 * What meals gave together, each the sum of what is known,
 * an unknown nutrient adding nothing.
 */
export type Totals = {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
};

/**
 * Kind of a food: `Eat`, its values per 100 g and its amounts in grams,
 * or `Drink`, its values per 100 ml and its amounts in millilitres,
 * which a summary leaves out.
 */
export type Kind = "Eat" | "Drink";

/**
 * A food, one row of `Foods.md`, its {@link Nutrients} per 100 of its unit.
 * No two foods have the same name, brand and store, ignoring case.
 *
 * - `name`: Without `|` and `;`, and without `,` in a row written
 *   since commas went, see {@link foodTextOf}.
 * - `barcode`: Open Food Facts barcode it came from, empty for a food added by hand.
 * - `pack`: Size of its pack as sold in its unit, `null` when none is known.
 * - `portion`: Amount in its unit I typically take at once,
 *   so an entry takes `2x` or `2 St` as twice that.
 *   `null` only in a row left empty by hand.
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

/**
 * A product of Open Food Facts as a search sends it,
 * its kcal `null` where Open Food Facts does not know them, like `Zwiebeln` of Edeka,
 * so it still shows and I type its kcal from the pack, see `../src/food/search.ts`.
 */
export type Product = Omit<Food, "kcal"> & {
    kcal: number | null;
};

/**
 * What a search finds.
 *
 * - `foods`: My foods whose name holds the search, ignoring case,
 *   or whose barcode it is, the most eaten first, equal ones alphabetical.
 *   All of them for an empty search.
 * - `products`: Products of Open Food Facts on the page asked
 *   for that are not among my foods, the best match first.
 *   None for a search shorter than {@link searchLength} or one of my foods only.
 *   `null` when Open Food Facts cannot be reached.
 * - `total`: Number of products of Open Food Facts the search matches,
 *   my foods among them, a lower bound when not `exact`.
 */
export type FoodsFound = {
    foods: Food[];
    products: Product[] | null;
    total: number;
    exact: boolean;
    more: boolean;
};

/**
 * One page of the products of a search of Open Food Facts, see {@link FoodsFound}.
 */
type ProductsPage = Omit<FoodsFound, "foods" | "products"> & { products: Product[] };

/**
 * A food of mine to change, as the page sends it, see {@link foodChange}.
 *
 * - `old`: Its name, brand and store as `Foods.md` holds them.
 * - `barcode`: Only digits, empty for none.
 * - `protein`, `carbs`, `fat`: `null` for unknown, see {@link nutrientsOf}.
 * - `portion`: `null` for none, which takes 100, see {@link portionOf}.
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
 * A food of a meal with what it gives,
 * a nutrient its food does not know unknown too.
 *
 * - `brand`, `store`: Empty where the line names none,
 *   so the page shows them grey after the name, as everywhere.
 * - `grams`: Millilitres of a drink, 0 for a line without grams, which counts nothing.
 * - `known`: Whether `Foods.md` holds the food. An unknown food gives nothing.
 * - `meal`: The meal of mine it belongs to in this entry, as its line carries it,
 *   empty for a food eaten by itself, like bread beside a meal.
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

/**
 * A line `X-FOOD` as read, see {@link lineOf}.
 * Brand and store are empty in a line written before foods had them.
 */
type Line = {
    name: string;
    brand: string;
    store: string;
    grams: number | null;
    guessed: boolean;
    meal: string;
};

/**
 * A meal, a log entry of the category `Food`, with what it gives, the sum of its foods.
 * `estimate` tells whether one of its foods counts grams guessed.
 */
export type Meal = Totals & {
    id: string;
    start: string;
    title: string;
    location: string;
    foods: Eaten[];
    estimate: boolean;
};

/**
 * A meal of mine, as `Meals.md` holds it:
 * one list of every food I may put in, never variants,
 * each with the grams I put in as a rule.
 *
 * - `name`: Unique, without `|`, `;` and `,`.
 * - `short`: What its brackets show, as I typed it, empty for no brackets.
 * - `foods`: Its foods by name, brand and store parted by `;`.
 * - `standard`: The grams of each food, which an entry starts with:
 *   0 for one I rarely put in, `null` for none set yet.
 */
export type Composition = {
    name: string;
    short: string;
    foods: string[];
    standard: (number | null)[];
};

/**
 * A meal of mine with what it gives, see {@link dishesRead}.
 *
 * - `kcal`: What its foods give at their standard grams,
 *   a food not in `Foods.md` counting nothing, `null` while no food has standard grams.
 * - `portions`: The grams of the portion of each of its foods,
 *   so its standard grams take `2x`.
 */
export type Dish = Composition & {
    kcal: number | null;
    portions: (number | null)[];
    kinds: Kind[];
};

/**
 * The meals of a day with what they give together.
 */
export type FoodDay = Totals & {
    meals: Meal[];
    estimate: boolean;
};

/**
 * A product as Open Food Facts sends it, with the fields of {@link productFields}.
 * Each may be missing.
 * `brands` and `stores` come as a list from the search,
 * as a text parted by commas from the products.
 * `product_name_de` and the like, its name in a language, come only with a whole product.
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

/**
 * Answer of Open Food Facts:
 * from the search its `hits` and their `count`, exact or a lower bound,
 * from the products the `product`, missing for an unknown barcode.
 */
type Answer = {
    hits?: ProductSent[];
    count?: number;
    is_count_exact?: boolean;
    page_count?: number;
    product?: ProductSent;
};

/**
 * A row of `Foods.md` by the names of its columns, see {@link cellsByNameOf}.
 */
type Cells = { [column: string]: string | undefined };

/**
 * Category of meals, written as `CATEGORIES:Food` by the entry by category of the day.
 */
export const foodName: string = "Food";

/**
 * Head of the table of `Foods.md`, the header and the line below it.
 */
const foodsHead: string[] = [
    "| Food | kcal | Protein | Carbs | Fat | Barcode " +
        "| Brand | Store | Portion | Pack | Kind |",
    "| --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | --- |",
];

/**
 * Text a new `Foods.md` starts with:
 * its title, one line on the units of its columns, nothing of how the code uses them.
 */
const fileHead: string[] = [
    "# Foods",
    "",
    "Nutrients per 100 g, or per 100 ml for a drink; Portion and Pack in g or ml.",
    "",
    ...foodsHead,
];

/**
 * Lines of the table of `Foods.md` before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * Head of the table of a meal in `Meals.md`, no line above it but its short title,
 * since its columns say enough.
 */
const mealHead: string[] = [
    "| Food | Brand | Store | Grams |",
    "| --- | --- | --- | ---: |",
];

/**
 * Line `X-FOOD` written before foods had brand and store, which names its food alone,
 * like `Reis;150` or `Hackfleisch;62.5;Chili con Carne;0.5;09.10.2026`,
 * the meal then with its servings eaten and maybe its variant.
 * See {@link lineOf} for the line of today.
 */
const foodLine: RegExp = new RegExp(
    /^([^;]+?)/.source +
        /(?:;\s*(~)?\s*(\d+(?:[.,]\d+)?))?/.source +
        /(?:;\s*([^;|]+?)\s*;\s*(\d+(?:[.,]\d+)?)(?:\s*;\s*([^;|]*?))?)?/.source +
        /\s*$/.source,
);

/**
 * Grams as a part of a line `X-FOOD`, `~` before grams guessed.
 */
const gramsPart: RegExp = /^(~)?\s*(\d+(?:[.,]\d+)?)$/;

/**
 * Barcode, as a search may be one.
 */
const barcode: RegExp = /^\d{8,14}$/;

/**
 * Fewest characters a search needs to ask Open Food Facts,
 * since fewer find mostly noise; a barcode is longer.
 */
const searchLength: number = 3;

/**
 * Name the dashboard gives itself when it asks Open Food Facts, which asks apps for one;
 * on purpose without an email or a name, so nothing about me leaves.
 */
const agent: string = "NomSystemDashboard/0.1";

/**
 * Fields of a product the reader asks the search of Open Food Facts for,
 * see {@link ProductSent}.
 */
const productFields: string =
    "code,product_name,brands,stores,quantity,serving_quantity," +
    "nutrition_data_per,nutriments";

/**
 * Languages of the names a search looks in: German, since I shop in Germany, and English.
 */
const searchLanguages: string = "de,en";

/**
 * Products of Open Food Facts on a page of a search.
 * Those without name or kcal and those among my foods fall out.
 */
const pageSize: number = 8;

/**
 * Milliseconds Open Food Facts gets to answer, before a search goes on without it.
 */
const answerTime: number = 5000;

/**
 * Milliseconds of a day.
 */
const dayLength: number = 24 * 60 * 60 * 1000;

/**
 * End of every range that reads the whole log, past and to come.
 */
const logEnd: string = "9999-12-31T00:00:00Z";

/**
 * Energy of a gram of protein, of carbs and of fat in kcal, as food labels count it,
 * by which the one of them a food lacks is worked out from its kcal.
 */
const kcalPerGram: { protein: number; carbs: number; fat: number } = {
    protein: 4,
    carbs: 4,
    fat: 9,
};

/**
 * Turns the text of a number into the number, a decimal comma counting as a point.
 * 0 for an empty or unreadable text.
 */
function numberOf(text: string | undefined): number {
    return Number((text ?? "").replace(",", ".")) || 0;
}

/**
 * Reads a nutrient, a cell of `Foods.md` or a value of Open Food Facts,
 * a decimal comma counting as a point.
 * `null` for one empty, missing or unreadable, which is unknown, never 0.
 */
function nutrientOf(sent: number | string | null | undefined): number | null {
    const text: string = String(sent ?? "")
        .trim()
        .replace(",", ".");
    const value: number = text === "" ? NaN : Number(text);
    return Number.isFinite(value) ? value : null;
}

/**
 * Rounds a number to some decimals.
 */
function roundOf(value: number, digits: number): number {
    return Math.round(value * 10 ** digits) / 10 ** digits;
}

/**
 * Gives the nutrients of a food as `Foods.md` writes them:
 * kcal whole, protein, carbs and fat to one decimal, each `null` while unknown, never 0,
 * since a 0 given is a true 0 and stays.
 * The one of protein, carbs and fat a food lacks is worked out
 * from its kcal and the other two, by the energy of a gram of each, never below 0.
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
 * Cleans the name of a food as it goes into `Foods.md`,
 * from Open Food Facts or typed by hand, and the name of a meal:
 * as a name, see `nameOf` in `markdown.ts`, and without a comma, since the comma is ours:
 * it parts the names of a summary, like `Chili con Carne, Weißbrot`,
 * and the brand from the store in `(Gut & Günstig, Edeka)`.
 * A comma between two digits becomes a point, like `Milch 1.5 %` of `Milch 1,5 %`.
 * Every other comma goes, its space with it, the words around it one space apart.
 * Rows already in `Foods.md` and `Meals.md` are read as they are.
 */
function foodTextOf(text: string): string {
    return nameOf(text.replace(/(\d),(?=\d)/g, "$1.").replace(/\s*,\s*/g, " "));
}

/**
 * Cleans a brand or a store for `Foods.md`: as the name of a food,
 * and without quotes and backslashes.
 */
function brandOf(brand: string): string {
    return foodTextOf(brand.replace(/["\\]/g, " "));
}

/**
 * Gives the first of the brands or stores of a product, cleaned,
 * as the search sends a list and a product a text parted by commas.
 */
function firstOf(sent: string | string[] | undefined): string {
    return nameOf(([sent ?? ""].flat()[0] ?? "").split(",")[0]);
}

/**
 * Grams or millilitres of one of each unit a maker writes the size of a pack in.
 */
const unitSizes: { [unit: string]: number } = {
    g: 1,
    kg: 1000,
    ml: 1,
    cl: 10,
    dl: 100,
    l: 1000,
};

/**
 * Gives the size of a pack as a bare number in grams or millilitres,
 * its first weight or volume, to one decimal, like 140 of `140 g (7 x 20 g)`.
 * Nothing for a size without a weight or volume, like `1 pcs`,
 * which tells nothing of what it gives.
 */
function packOf(quantity: string | undefined): number | null {
    const size: RegExpExecArray | null = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i.exec(
        quantity ?? "",
    );
    return size === null
        ? null
        : roundOf(numberOf(size[1]) * unitSizes[size[2].toLowerCase()], 1);
}

/**
 * Tells the kind of a product of Open Food Facts:
 * `Drink` when its nutrients are given per 100 ml or the size of its pack is a volume.
 */
function productKindOf(sent: ProductSent): Kind {
    return sent.nutrition_data_per === "100ml" ||
        /\d\s*(ml|cl|dl|l)\b/i.test(sent.quantity ?? "")
        ? "Drink"
        : "Eat";
}

/**
 * Reads the kind of a food as written, `Eat` for anything but `Drink`,
 * like a row written before kinds were kept.
 */
function kindOf(text: unknown): Kind {
    return String(text ?? "")
        .trim()
        .toLowerCase() === "drink"
        ? "Drink"
        : "Eat";
}

/**
 * Gives the portion of a food as written, never empty:
 * the amount given, to one decimal, else 100.
 * Never its pack, which only I type or pick,
 * so `1x` of a jar of jam of 450 g is one portion, not the jar.
 */
function portionOf(given: number | null): number {
    return given !== null && given > 0 ? roundOf(given, 1) : 100;
}

/**
 * Cuts a row of the table of `Foods.md` into its cells by the names of its head,
 * so a table written in an older order reads too:
 * `Piece` as `Portion`, its name for a while, a column the table lacks missing.
 */
function cellsByNameOf(head: string[], line: string): Cells {
    const cells: string[] = cellsOf(line);
    return Object.fromEntries(
        head.map((name: string, index: number): [string, string] => [
            name === "Piece" ? "Portion" : name,
            cells[index] ?? "",
        ]),
    );
}

/**
 * Reads my foods, the rows of the table of `Foods.md`, in their order.
 * kcal that cannot be read counts as 0. A nutrient empty or unreadable
 * is unknown, `null`, never 0. A row without a name stays out.
 */
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

/**
 * Reads the meals of a range: the log entries of the category `Food`.
 */
function mealsRead(start: string, end: string): Entry[] {
    return entriesRead(food.log, start, end).filter(
        (entry: Entry): boolean => entry.category === foodName,
    );
}

/**
 * Writes the label of a food as the page shows it: its name,
 * then its brand and store in brackets, those it has,
 * since they only tell which one it is.
 */
export function labelOf(food: { name: string; brand: string; store: string }): string {
    const place: string[] = [food.brand, food.store].filter(
        (part: string): boolean => part !== "",
    );
    return place.length === 0 ? food.name : `${food.name} (${place.join(", ")})`;
}

/**
 * Writes the key of a food, by which a line `X-FOOD` finds it among my foods:
 * its name, brand and store parted by `;`, in small letters.
 */
function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

/**
 * Reads my foods by their keys, see {@link keyOf},
 * and by their names alone in small letters,
 * for a line written before foods had brand and store, the first food of a name.
 */
function foodsByKeyRead(): Map<string, Food> {
    const mine: Map<string, Food> = new Map();
    foodsRead().forEach((row: Food): void => {
        mine.set(keyOf(row), row);
        if (!mine.has(row.name.toLowerCase())) mine.set(row.name.toLowerCase(), row);
    });
    return mine;
}

/**
 * Finds the food of a line among my foods:
 * by its name, brand and store, a line without both by its name alone.
 */
function foodOfLine(read: Line, mine: Map<string, Food>): Food | undefined {
    return (
        mine.get(keyOf(read)) ??
        (read.brand === "" && read.store === ""
            ? mine.get(read.name.toLowerCase())
            : undefined)
    );
}

/**
 * Cuts a line `X-FOOD` of today into its five parts:
 * its food's name, brand and store, its grams, and the meal of mine it belongs to,
 * told by its second part being no grams and its fourth grams or empty.
 * The foods of a meal in `Meals.md` come with three parts, without grams.
 *
 * @returns Its five parts, empty where it has none,
 *   `null` for a line written before foods had brand and store
 */
function partsOf(line: string): string[] | null {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    if (
        (parts.length === 4 || parts.length === 5) &&
        !gramsPart.test(parts[1]) &&
        (parts[3] === "" || gramsPart.test(parts[3]))
    )
        return [...parts, ""].slice(0, 5);
    if (parts.length === 3 && !gramsPart.test(parts[1]) && !gramsPart.test(parts[2]))
        return [...parts, "", ""];
    return null;
}

/**
 * Reads a line `X-FOOD`: one of today by its parts,
 * an older one by {@link foodLine}, which names its food alone.
 */
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

/**
 * Counts how often each food was eaten, by the key of its food:
 * the lines `X-FOOD` of the meals in the log up to now.
 */
function usesRead(): Map<string, number> {
    const uses: Map<string, number> = new Map();
    mealsRead("1970-01-01T00:00:00Z", new Date().toISOString())
        .flatMap((meal: Entry): string[] => meal.foods)
        .forEach((line: string): void => {
            const key: string = keyOf(lineOf(line));
            uses.set(key, (uses.get(key) ?? 0) + 1);
        });
    return uses;
}

/**
 * Builds the address that asks Open Food Facts for a search:
 * for a barcode its whole product, since no field lists the names of all languages,
 * see {@link productNameOf}, else a page of the products whose names match.
 */
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

/**
 * Gives the name of a product, cleaned: its main name, else its German, its English,
 * else the one of any language, since a product may have no main name,
 * like 6920584471017, which holds only `product_name_de`, `_ms` and `_zh`.
 */
function productNameOf(sent: ProductSent): string {
    const languages: string[] = Object.entries(sent)
        .filter(([key]: [string, unknown]): boolean =>
            /^product_name_[a-z]{2}$/.test(key),
        )
        .map(([, name]: [string, unknown]): string => String(name));
    return (
        [sent.product_name, sent.product_name_de, sent.product_name_en, ...languages]
            .map((name: string | undefined): string => foodTextOf(name ?? ""))
            .find((name: string): boolean => name !== "") ?? ""
    );
}

/**
 * Turns a product as Open Food Facts sends it into a {@link Product}
 * as it would go into `Foods.md`, cleaned, its first brand and store.
 * Its kcal is else its energy in kJ turned into kcal, 4.184 kJ a kcal.
 *
 * @returns The product, its kcal `null` when Open Food Facts does not know them,
 *   `null` when it has no name in any language
 */
function productOf(sent: ProductSent): Product | null {
    const nutrients: { [nutrient: string]: number | string | undefined } =
        sent.nutriments ?? {};
    const kj: number | null = nutrientOf(nutrients["energy-kj_100g"]);
    const kcal: number | null =
        nutrientOf(nutrients["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184);
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
        ...(kcal === null
            ? { kcal: null, ...given }
            : nutrientsOf({ kcal: kcal, ...given })),
        barcode: sent.code ?? "",
        brand: brandOf(firstOf(sent.brands)),
        store: brandOf(firstOf(sent.stores)),
        pack: pack,
        portion: portionOf(nutrientOf(sent.serving_quantity)),
        kind: productKindOf(sent),
    };
}

/**
 * Asks Open Food Facts for a page of the products of a search,
 * anonymously, see {@link agent}.
 * An unknown barcode answers `404 Not Found`,
 * with an answer without product. A barcode has one page.
 *
 * @throws {Error} - When Open Food Facts does not answer in time or answers with an error
 */
async function productsAsk(query: string, page: number): Promise<ProductsPage> {
    const response: Response = await fetch(addressOf(query, page), {
        headers: { "User-Agent": agent },
        signal: AbortSignal.timeout(answerTime),
    });
    if (!response.ok && response.status !== 404)
        throw new Error(`Open Food Facts answered ${response.status}`);

    const answer: Answer = (await response.json()) as Answer;
    const sent: ProductSent[] =
        answer.hits ?? (answer.product === undefined ? [] : [answer.product]);
    const products: Product[] = sent
        .map((product: ProductSent): Product | null => productOf(product))
        .filter((product: Product | null): product is Product => product !== null);
    return {
        products: products,
        total: answer.count ?? products.length,
        exact: answer.is_count_exact ?? true,
        more: page < (answer.page_count ?? 0),
    };
}

/**
 * Finds foods by a name or a barcode, see {@link FoodsFound}: my foods first, then,
 * where asked, a page of the products of Open Food Facts.
 * The one search for foods, of the food view and of the entry by category of the day.
 *
 * @param page - Page of the products, 1 for the first.
 *   Anything else that is no whole number above 0 counts as 1
 * @param products - Whether Open Food Facts is asked too.
 *   Not for a meal of mine, which takes only my foods
 */
export async function foodsFind(
    text: string,
    page: number,
    products: boolean,
): Promise<FoodsFound> {
    const query: string = text.trim().toLowerCase();
    const mine: Food[] = foodsRead();
    const uses: Map<string, number> = usesRead();
    const foods: Food[] = mine
        .filter(
            (candidate: Food): boolean =>
                labelOf(candidate).toLowerCase().includes(query) ||
                candidate.barcode === query,
        )
        .sort(
            (first: Food, second: Food): number =>
                (uses.get(keyOf(second)) ?? 0) - (uses.get(keyOf(first)) ?? 0) ||
                first.name.localeCompare(second.name),
        );
    const none: Omit<ProductsPage, "products"> = { total: 0, exact: true, more: false };
    if (!products || query.length < searchLength)
        return { foods: foods, products: [], ...none };

    try {
        const found: ProductsPage = await productsAsk(
            query,
            Number.isInteger(page) && page > 0 ? page : 1,
        );
        return {
            foods: foods,
            ...found,
            products: found.products.filter(
                (product: Product): boolean =>
                    !mine.some(
                        (candidate: Food): boolean =>
                            candidate.barcode === product.barcode,
                    ),
            ),
        };
    } catch (error: unknown) {
        console.error(new Date().toISOString(), "Open Food Facts", error);
        return { foods: foods, products: null, ...none };
    }
}

/**
 * Writes a food as a row of the table of `Foods.md`, see {@link foodsHead},
 * an unknown nutrient an empty cell, never 0.
 */
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
    const texts: string[] = cells.map((cell: string | number | null): string =>
        String(cell ?? ""),
    );
    return `| ${texts.join(" | ")} |`;
}

/**
 * Gives the table of `Foods.md` the columns of today, see {@link foodsHead},
 * like a table written before packs or kinds were kept, or in an older order:
 * its head, and each of its rows, every cell moved under the name of its column,
 * a column it lacked empty.
 *
 * @param lines - Lines of `Foods.md`, changed in place
 */
function tableHeadPut(lines: string[], header: number): void {
    if (lines[header] === foodsHead[0]) return;

    const columns: string[] = cellsOf(foodsHead[0]);
    const head: string[] = cellsOf(lines[header]);
    lines.forEach((line: string, index: number): void => {
        if (index >= header + tableHead && line.startsWith("|")) {
            const cells: Cells = cellsByNameOf(head, line);
            const row: string[] = columns.map(
                (name: string): string => cells[name] ?? "",
            );
            lines[index] = `| ${row.join(" | ")} |`;
        }
    });
    lines.splice(header, tableHead, ...foodsHead);
}

/**
 * Finds the row of a food in the lines of `Foods.md` by its key, see {@link keyOf},
 * -1 for none.
 *
 * @param header - Index of the header of its table
 */
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
 * Adds a food to `Foods.md` as the last row of its table,
 * every other line staying as it is,
 * but a table without the columns of today, which gets them, see {@link tableHeadPut}.
 * Creates `Foods.md` when it does not exist yet.
 * A product of Open Food Facts goes in as Open Food Facts gives it,
 * a food by hand as typed, cleaned, the numbers as `Foods.md` writes them,
 * see {@link nutrientsOf}.
 * Protein, carbs or fat sent as `null` is unknown,
 * so the one of them a food typed by hand lacks is worked out
 * from its kcal like that of a product, and two or three stay empty cells, never 0.
 * Its kind as sent, `Eat` for a food by hand, which sends none.
 * A product that is one of my foods already,
 * by its barcode or by its name, brand and store,
 * like the same beans in a bigger can, is that food, and nothing is written.
 * A food by hand with the name, brand and store of one of mine is refused.
 *
 * @returns The food as written, or my food the product is already
 * @throws {Error} - When kcal is no number of 0 or more,
 *   a nutrient neither one nor `null`,
 *   the name is empty, the barcode not only digits, a food by hand has the name,
 *   brand and store of one of mine, ignoring case,
 *   or `Foods.md` lies outside the new system or holds no table
 */
export function foodAdd(sent: Food): Food {
    const amount: (value: unknown) => boolean = (value: unknown): boolean =>
        typeof value === "number" && value >= 0;
    if (
        !amount(sent.kcal) ||
        ![sent.protein, sent.carbs, sent.fat].every(
            (value: unknown): boolean => value === null || amount(value),
        )
    )
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);

    const pack: number | null =
        amount(sent.pack) && Number(sent.pack) > 0 ? roundOf(Number(sent.pack), 1) : null;
    const added: Food = {
        name: foodTextOf(String(sent.name ?? "")),
        ...nutrientsOf(sent),
        barcode: String(sent.barcode ?? "").trim(),
        brand: brandOf(String(sent.brand ?? "")),
        store: brandOf(String(sent.store ?? "")),
        pack: pack,
        portion: portionOf(amount(sent.portion) ? Number(sent.portion) : null),
        kind: kindOf(sent.kind),
    };
    if (added.name === "") throw new Error(`No name of a food: ${JSON.stringify(sent)}`);
    if (!/^\d*$/.test(added.barcode)) throw new Error(`No barcode: ${added.barcode}`);
    const same: Food | undefined = foodsRead().find(
        (mine: Food): boolean =>
            keyOf(mine) === keyOf(added) ||
            (added.barcode !== "" && mine.barcode === added.barcode),
    );
    if (same !== undefined && added.barcode !== "") return same;
    if (same !== undefined) throw new Error(`No new food: ${labelOf(added)}`);
    if (!writeAllowed(food.foods))
        throw new Error(`No writing outside the new system: ${food.foods}`);

    const lines: string[] = existsSync(food.foods)
        ? readFileSync(food.foods, "utf8").split("\n")
        : [...fileHead, ""];
    const last: number = lines.findLastIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    const header: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    if (last === -1) throw new Error(`No table in ${food.foods}`);

    tableHeadPut(lines, header);
    lines.splice(last + 1, 0, rowOf(added));
    mkdirSync(dirname(food.foods), { recursive: true });
    writeFileSync(food.foods, lines.join("\n"));
    return added;
}

/**
 * Writes a line `X-FOOD` or a food of a meal of `Meals.md` with a food renamed,
 * when it names that food by its name, brand and store,
 * everything after them staying as it is.
 * Any other line stays as it is, like one written before foods had brand and store.
 */
function lineRenamed(
    line: string,
    old: string,
    renamed: { name: string; brand: string; store: string },
): string {
    const parts: string[] | null = partsOf(line);
    if (
        parts === null ||
        keyOf({ name: parts[0], brand: parts[1], store: parts[2] }) !== old
    )
        return line;
    return [renamed.name, renamed.brand, renamed.store, ...line.split(";").slice(3)].join(
        ";",
    );
}

/**
 * Changes a food of mine: renames it wherever it stands, cleaned as a food added,
 * so every entry and meal still finds it:
 * first every line `X-FOOD` of the log naming it, past and to come,
 * and its name in the summary of each entry where it stands beside the meals,
 * like `Kren` of `Hausgemachter Salat, Kren`, every other part staying as it is,
 * then every meal of `Meals.md` holding it, last its row of `Foods.md`,
 * so one stopped in between finishes when sent again.
 * Its barcode, kcal, protein, carbs, fat, pack, portion and kind change too,
 * for every food, since not everything from Open Food Facts or my typing is right.
 * What is not sent stays, kcal also when sent as `null`, since a food needs them.
 * A nutrient cleared is unknown, the one missing worked out, see {@link nutrientsOf}.
 * A food sent without change writes nothing.
 *
 * @throws {Error} - When `Foods.md` holds no such food, the new name is empty,
 *   another food of mine has the new name, brand and store, ignoring case,
 *   a number is none of 0 or more, the barcode not only digits,
 *   a kind is none of `Eat` and `Drink`, or a file lies outside the new system
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
    const found: Food | undefined = mine.find(
        (candidate: Food): boolean => keyOf(candidate) === old,
    );
    if (found === undefined)
        throw new Error(`No food of mine: ${JSON.stringify(sent.old)}`);
    if (
        renamed.name === "" ||
        mine.some(
            (candidate: Food): boolean =>
                candidate !== found && keyOf(candidate) === keyOf(renamed),
        )
    )
        throw new Error(`No new name of a food: ${labelOf(renamed)}`);
    const amount: (value: unknown) => boolean = (value: unknown): boolean =>
        typeof value === "number" && value >= 0;
    const kcal: number = sent.kcal ?? found.kcal;
    if (
        !amount(kcal) ||
        ![sent.protein, sent.carbs, sent.fat, sent.portion, sent.pack].every(
            (value: unknown): boolean =>
                value === undefined || value === null || amount(value),
        )
    )
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);
    const code: string = String(sent.barcode ?? found.barcode).trim();
    if (!/^\d*$/.test(code)) throw new Error(`No barcode: ${code}`);
    if (sent.kind !== undefined && sent.kind !== "Eat" && sent.kind !== "Drink")
        throw new Error(`No kind of a food: ${String(sent.kind)}`);
    const pack: number | null =
        sent.pack === undefined
            ? found.pack
            : sent.pack === null || sent.pack === 0
              ? null
              : roundOf(sent.pack, 1);
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
    if (!writeAllowed(food.foods) || !writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.foods}`);

    const renamedIn: (lines: string[]) => string[] = (lines: string[]): string[] =>
        lines.map((line: string): string => lineRenamed(line, old, renamed));
    const touched: (lines: string[]) => boolean = (lines: string[]): boolean =>
        lines.some((line: string): boolean => lineRenamed(line, old, renamed) !== line);
    entriesRead(food.log, "1970-01-01T00:00:00Z", logEnd)
        .filter((entry: Entry): boolean => touched(entry.foods))
        .forEach((entry: Entry): void => {
            const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
            const beside: boolean = entry.foods.some((line: string): boolean => {
                const parts: string[] | null = partsOf(line);
                return (
                    parts !== null &&
                    keyOf({ name: parts[0], brand: parts[1], store: parts[2] }) === old &&
                    parts[4] === ""
                );
            });
            const properties: [string, string[]][] = [["x-food", renamedIn(entry.foods)]];
            if (beside)
                properties.push([
                    "summary",
                    [
                        entry.title
                            .split(", ")
                            .map((part: string): string =>
                                part === found.name ? renamed.name : part,
                            )
                            .join(", "),
                    ],
                ]);
            if (file !== undefined) propertiesPut(file, entry.id, properties);
        });
    const meals: Composition[] = compositionsRead();
    if (meals.some((meal: Composition): boolean => touched(meal.foods)))
        compositionsWrite(
            meals.map((meal: Composition): Composition => ({
                ...meal,
                foods: renamedIn(meal.foods),
            })),
        );

    const lines: string[] = readFileSync(food.foods, "utf8").split("\n");
    const header: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    tableHeadPut(lines, header);
    lines[rowFind(lines, header, old)] = rowOf(changed);
    writeFileSync(food.foods, lines.join("\n"));
    return changed;
}

/**
 * Removes a food of mine from `Foods.md`, its row only.
 * Entries and meals that list it keep their lines,
 * which then count nothing and are named below the day's totals
 * as foods not in `Foods.md`.
 *
 * @throws {Error} - When `Foods.md` holds no such food, or lies outside the new system
 */
export function foodRemove(sent: { name: string; brand: string; store: string }): void {
    if (!writeAllowed(food.foods))
        throw new Error(`No writing outside the new system: ${food.foods}`);
    const lines: string[] = existsSync(food.foods)
        ? readFileSync(food.foods, "utf8").split("\n")
        : [];
    const header: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    const row: number = header === -1 ? -1 : rowFind(lines, header, keyOf(sent));
    if (row === -1) throw new Error(`No food of mine: ${JSON.stringify(sent)}`);
    lines.splice(row, 1);
    writeFileSync(food.foods, lines.join("\n"));
}

/**
 * Adds up what foods or meals give, what is known: an unknown nutrient adds nothing,
 * so a day of 20 g fat known and a food whose fat is unknown has 20 g,
 * and the food view names the food, see `src/food/food.ts`.
 */
function sumOf(parts: Nutrients[]): Totals {
    return parts.reduce(
        (sum: Totals, part: Nutrients): Totals => ({
            kcal: sum.kcal + part.kcal,
            protein: sum.protein + (part.protein ?? 0),
            carbs: sum.carbs + (part.carbs ?? 0),
            fat: sum.fat + (part.fat ?? 0),
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

/**
 * Turns a line `X-FOOD` of a meal into what its food gives,
 * with its name, brand and store as the line writes them.
 * A line without grams gives nothing.
 * A nutrient its food does not know stays unknown, `null`,
 * and so do all three of a food `Foods.md` does not hold.
 */
function eatenOf(line: string, mine: Map<string, Food>): Eaten {
    const read: Line = lineOf(line);
    const known: Food | undefined = foodOfLine(read, mine);
    const grams: number = read.grams ?? 0;
    const share: number = known === undefined ? 0 : grams / 100;
    const part: (per: number | null | undefined) => number | null = (
        per: number | null | undefined,
    ): number | null => (per === null || per === undefined ? null : share * per);
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

/**
 * Turns the log entry of a meal into a {@link Meal}.
 */
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
 * Reads the meals of a day with what they give:
 * the log entries of `Food` that start on the day in Berlin time,
 * read from noon the day before to noon the day after, which holds the whole day.
 * A food counts its grams, nothing when the meal lists none,
 * nor when `Foods.md` does not hold it.
 *
 * @throws {Error} - When the date is not written like `2026-10-10`
 */
export function foodDayRead(date: string): FoodDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const mine: Map<string, Food> = foodsByKeyRead();
    const meals: Meal[] = mealsRead(
        new Date(noon - dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    )
        .filter((entry: Entry): boolean => berlinDateOf(new Date(entry.start)) === date)
        .sort((first: Entry, second: Entry): number =>
            first.start.localeCompare(second.start),
        )
        .map((entry: Entry): Meal => mealOf(entry, mine));
    return {
        ...sumOf(meals),
        meals: meals,
        estimate: meals.some((meal: Meal): boolean => meal.estimate),
    };
}

/**
 * Gives what the meals among entries give, counted as {@link foodDayRead} counts them,
 * for the entries of the day view, by the identifier of the entry.
 */
export function mealsOf(entries: Entry[]): Map<string, Meal> {
    const mine: Map<string, Food> = foodsByKeyRead();
    return new Map(
        entries
            .filter(
                (entry: Entry): boolean =>
                    entry.category === foodName && entry.foods.length > 0,
            )
            .map((entry: Entry): [string, Meal] => [entry.id, mealOf(entry, mine)]),
    );
}

/**
 * Writes the summary of a meal from its lines `X-FOOD`, as the dialog writes it,
 * see `summaryOf` in `../src/food/foods.ts`: its meals of mine,
 * then the foods beside them, in their order, parted by `, `, drinks left out.
 * An entry of drinks alone names them all.
 */
export function mealTitleOf(lines: string[]): string {
    type Named = { name: string; kind: Kind };
    const mine: Map<string, Food> = foodsByKeyRead();
    const read: Line[] = lines.map(lineOf);
    const named: Named[] = [
        ...[
            ...new Set(
                read
                    .filter((line: Line): boolean => line.meal !== "")
                    .map((line: Line): string => line.meal),
            ),
        ].map((meal: string): Named => ({ name: meal, kind: "Eat" })),
        ...read
            .filter((line: Line): boolean => line.meal === "")
            .map((line: Line): Named => ({
                name: line.name,
                kind: foodOfLine(line, mine)?.kind ?? "Eat",
            })),
    ];
    const eaten: Named[] = named.filter((part: Named): boolean => part.kind !== "Drink");
    return (eaten.length > 0 ? eaten : named)
        .map((part: Named): string => part.name)
        .join(", ");
}

/**
 * Orders the lines `X-FOOD` of an entry as it is written:
 * the foods of each meal of mine together, the meals in the order they first stand,
 * then the foods beside them, each group by its grams,
 * the most first, as `Meals.md` orders a meal,
 * see {@link rankOf}, so the foods that matter most stand first, whatever grams I change.
 */
export function foodsRanked(lines: string[]): string[] {
    const mealOf: (line: string) => string = (line: string): string => lineOf(line).meal;
    const ranked: (meal: string) => string[] = (meal: string): string[] =>
        lines
            .filter((line: string): boolean => mealOf(line) === meal)
            .sort(
                (first: string, second: string): number =>
                    rankOf(lineOf(second).grams) - rankOf(lineOf(first).grams),
            );
    return [
        ...new Set([
            ...lines.map(mealOf).filter((meal: string): boolean => meal !== ""),
            "",
        ]),
    ].flatMap(ranked);
}

/**
 * Tells whether a line `X-FOOD` sent to be written is well formed:
 * one of today with no `|` and grams above 0 or none,
 * or an older one, see {@link foodLine}, with servings above 0.
 * Whether `Foods.md` holds the food is not asked,
 * so a meal keeps a food that left `Foods.md` when it is moved.
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

/**
 * Writes the name of a meal as typed, its spaces too, cleaned as the name of a food,
 * so no comma parts it in a summary and spaces in a row are one.
 */
function mealNameOf(typed: string): string {
    return foodTextOf(typed);
}

/**
 * Reads my meals of `Meals.md` as it holds them, see {@link Composition}:
 * a section per meal from its heading `###`, its name,
 * the line below it its short title when it is no row,
 * then a row per food of its table.
 */
export function compositionsRead(): Composition[] {
    if (!existsSync(food.meals)) return [];

    return readFileSync(food.meals, "utf8")
        .split(/^### /m)
        .slice(1)
        .map((section: string): Composition => {
            const lines: string[] = section
                .split("\n")
                .filter((line: string): boolean => line.trim() !== "");
            const rows: string[][] = lines
                .filter((line: string): boolean => line.startsWith("|"))
                .slice(tableHead)
                .map(cellsOf);
            return {
                name: lines[0].trim(),
                short: lines[1]?.startsWith("|") === false ? lines[1].trim() : "",
                foods: rows.map((cells: string[]): string => cells.slice(0, 3).join(";")),
                standard: rows.map((cells: string[]): number | null =>
                    nutrientOf(cells[3] ?? ""),
                ),
            };
        });
}

/**
 * Reads my meals of `Meals.md`,
 * each with what its foods give at their standard grams, see {@link Dish}.
 */
export function dishesRead(): Dish[] {
    const mine: Map<string, Food> = foodsByKeyRead();
    return compositionsRead().map((meal: Composition): Dish => ({
        ...meal,
        kcal: meal.standard.every((grams: number | null): boolean => grams === null)
            ? null
            : meal.foods.reduce(
                  (sum: number, line: string, index: number): number =>
                      sum +
                      ((meal.standard[index] ?? 0) / 100) *
                          (foodOfLine(lineOf(line), mine)?.kcal ?? 0),
                  0,
              ),
        portions: meal.foods.map(
            (line: string): number | null =>
                foodOfLine(lineOf(line), mine)?.portion ?? null,
        ),
        kinds: meal.foods.map(
            (line: string): Kind => foodOfLine(lineOf(line), mine)?.kind ?? "Eat",
        ),
    }));
}

/**
 * Writes my meals into `Meals.md` anew, its title first, then a section per meal,
 * with the empty lines of my Markdown, see `markdownFormOf` in `markdown.ts`.
 */
function compositionsWrite(meals: Composition[]): void {
    const sections: string[][] = meals.map((meal: Composition): string[] => [
        `### ${meal.name}`,
        ...(meal.short === "" ? [] : [meal.short]),
        ...mealHead,
        ...meal.foods.map((line: string, index: number): string => {
            const read: Line = lineOf(line);
            const grams: number | null = meal.standard[index] ?? null;
            return (
                `| ${read.name} | ${read.brand} | ${read.store} ` +
                `| ${grams === null ? "" : roundOf(grams, 1)} |`
            );
        }),
    ]);
    mkdirSync(dirname(food.meals), { recursive: true });
    writeFileSync(food.meals, markdownFormOf(["# Meals", ...sections.flat()].join("\n")));
}

/**
 * Writes a meal into `Meals.md`, new or changed for good,
 * its foods in place of those it had, at its place, a new meal last.
 * Each food by its name, brand and store as `Foods.md` holds them,
 * cleaned only for a table, each once.
 * Its short title and the standard grams of its foods as sent, else as the meal had them,
 * a food new to it without.
 * Its foods ordered by their standard grams, so the order needs no hand,
 * see {@link rankOf}.
 *
 * @param sent - Name and foods as the page sends them,
 *   and its short title and the standard grams of its foods where they change
 * @throws {Error} - When the name is empty, it holds no food,
 *   or `Meals.md` lies outside the new system
 */
export function dishAdd(sent: {
    name?: string;
    foods?: string[];
    short?: string;
    grams?: (number | null)[];
}): Dish[] {
    const meals: Composition[] = compositionsRead();
    const typed: string = mealNameOf(String(sent.name ?? ""));
    const name: string =
        meals.find(
            (meal: Composition): boolean =>
                meal.name.toLowerCase() === typed.toLowerCase(),
        )?.name ?? typed;
    const foods: string[] = [
        ...new Set(
            (sent.foods ?? []).map((line: string): string => {
                const read: Line = lineOf(String(line));
                return [read.name, read.brand, read.store].map(nameOf).join(";");
            }),
        ),
    ].filter((line: string): boolean => !line.startsWith(";"));
    if (name === "") throw new Error("No name of a meal");
    if (foods.length === 0)
        throw new Error(`No foods of a meal: ${JSON.stringify(sent.foods)}`);
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);

    const at: number = meals.findIndex(
        (meal: Composition): boolean => meal.name.toLowerCase() === name.toLowerCase(),
    );
    const before: Composition | undefined = meals[at];
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
        short:
            sent.short === undefined ? (before?.short ?? "") : nameOf(String(sent.short)),
        foods: ranked.map(([line]: [string, number | null]): string => line),
        standard: ranked.map(
            ([, grams]: [string, number | null]): number | null => grams,
        ),
    };
    compositionsWrite(
        at === -1
            ? [...meals, meal]
            : meals.map((other: Composition, index: number): Composition =>
                  index === at ? meal : other,
              ),
    );
    return dishesRead();
}

/**
 * Ranks a food of a meal by its standard grams, the higher the earlier:
 * a food without grams below every one with grams, one at 0,
 * which I rarely put in, below all.
 */
function rankOf(grams: number | null): number {
    return grams === null ? -1 : grams === 0 ? -2 : grams;
}

/**
 * Renames a meal of mine wherever it stands,
 * so every entry still shows it under its new name:
 * first, in every entry of the log that holds it, past and to come,
 * the meal of its lines `X-FOOD` and its name in the summary,
 * then its section of `Meals.md`,
 * so one stopped in between finishes when sent again.
 * A name sent without change writes nothing.
 *
 * @throws {Error} - When `Meals.md` holds no such meal,
 *   the new name is empty or that of another meal of mine, ignoring case,
 *   or a file lies outside the new system
 */
export function dishRename(sent: { old?: string; name?: string }): Dish[] {
    const meals: Composition[] = compositionsRead();
    const same: (name: string) => boolean = (name: string): boolean =>
        name.trim().toLowerCase() ===
        String(sent.old ?? "")
            .trim()
            .toLowerCase();
    const found: Composition | undefined = meals.find((meal: Composition): boolean =>
        same(meal.name),
    );
    const typed: string = mealNameOf(String(sent.name ?? ""));
    if (found === undefined) throw new Error(`No meal of mine: ${String(sent.old)}`);
    if (
        typed === "" ||
        meals.some(
            (meal: Composition): boolean =>
                meal !== found && meal.name.toLowerCase() === typed.toLowerCase(),
        )
    )
        throw new Error(`No new name of a meal: ${typed}`);
    if (typed === found.name) return dishesRead();
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);

    entriesRead(food.log, "1970-01-01T00:00:00Z", logEnd)
        .filter((entry: Entry): boolean =>
            entry.foods.some((line: string): boolean => same(line.split(";")[4] ?? "")),
        )
        .forEach((entry: Entry): void => {
            const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
            if (file === undefined) return;
            propertiesPut(file, entry.id, [
                [
                    "x-food",
                    entry.foods.map((line: string): string => {
                        const parts: string[] = line.split(";");
                        return parts.length > 4 && same(parts[4])
                            ? [...parts.slice(0, 4), typed].join(";")
                            : line;
                    }),
                ],
                [
                    "summary",
                    [
                        entry.title
                            .split(", ")
                            .map((part: string): string => (same(part) ? typed : part))
                            .join(", "),
                    ],
                ],
            ]);
        });
    compositionsWrite(
        meals.map((meal: Composition): Composition =>
            meal === found ? { ...meal, name: typed } : meal,
        ),
    );
    return dishesRead();
}

/**
 * Removes a meal from `Meals.md`, ignoring case.
 *
 * @throws {Error} - When `Meals.md` lies outside the new system
 */
export function dishRemove(name: string): Dish[] {
    if (!existsSync(food.meals)) return [];
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);
    compositionsWrite(
        compositionsRead().filter(
            (meal: Composition): boolean =>
                meal.name.toLowerCase() !== name.trim().toLowerCase(),
        ),
    );
    return dishesRead();
}
