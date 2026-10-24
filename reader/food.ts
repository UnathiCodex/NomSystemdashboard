/**
 * ## Food
 *
 * Reads my foods from `Foods.md`, finds foods by a name or a barcode, mine first, then on Open Food Facts,
 * page by page, adds new foods to `Foods.md` and renames them, keeps my meals in `Meals.md`, finds the grams I logged
 * each food with last, and reads the meals of a day from the log with what they give.
 * `Meals.md` holds my meals, each only its composition, one or more of my foods without grams, servings or variants,
 * since I prepare it a little differently every time: one section per meal, its name as heading, its short title
 * below, then its table with one row per food, the food, its brand, its store and its grams; an entry brings each food at the grams I logged it with last in an entry of its
 * category, see {@link gramsRead}, which I change there; the lists of my meals show each with what it gave the last
 * time I ate it, see {@link dishesRead}.
 * A meal keeps its name as I type it, its spaces too, like `Chili con Carne`, only without commas, see {@link mealNameOf}.
 * `Foods.md` is one Markdown table with one row per food: its name, kcal, protein, carbs and fat per 100 of its unit,
 * its portion, the amount I typically take at once, never empty, the Open Food Facts barcode it came from,
 * its brand and store, like `Milbona` and `Lidl`, so the same name of two shops never mixes up, the size of its
 * pack as sold, a bare number in its unit, like `265`, and last its kind, `Eat` or `Drink`, see {@link Kind}: a food
 * to eat counts per 100 g and in grams, a drink per 100 ml and in millilitres, like `Coca-Cola`; a product of Open Food
 * Facts goes in as Open Food Facts gives it, brand, store and pack empty where it knows none, a food added by hand
 * without barcode and pack, `Eat` until I change it, see {@link foodAdd}. No name, brand or
 * store of a food written holds a comma, which parts names, see {@link foodTextOf}.
 * A nutrient nobody gives is never 0: the one of protein, carbs and fat a food lacks is worked out from its kcal,
 * two or three missing stay unknown, an empty cell, which counts nothing, see {@link nutrientsOf}.
 * A row written before brand, store or pack were kept lacks them, and the table gets their columns with the next food.
 * A food renamed is renamed wherever it stands, see {@link foodChange}.
 * A meal is a log entry of the category `Food`: `SUMMARY` what I ate, its foods parted by `, `,
 * like `Reis, Bohnen, Eier`, drinks left out, `LOCATION` where, and one line `X-FOOD` per food: its name, brand and
 * store in `Foods.md`, then the grams I ate, the millilitres of a drink, a bare number either way, each part parted by
 * `;`, like `X-FOOD:Skyr natur;K-Classic;Kaufland;150` or `X-FOOD:Coca-Cola;Coca-Cola;Supermarkt;330`, so the log tells
 * which product it was, see {@link lineOf}; a line written before foods had brand and store names its food alone,
 * like `X-FOOD:Reis;150`, and a line without grams, like `X-FOOD:Skyr natur;K-Classic;Kaufland;` or `X-FOOD:Eier`,
 * counts nothing. A cooking, `Cook`, lists what went into the pot the same way, like
 * `X-FOOD:Hackfleisch;Gut & Günstig;Edeka;500`, which counts nothing.
 * Grams guessed, not weighed, like those Claude reads from a photo of a meal, carry `~`, like `X-FOOD:Döner;~400`,
 * and count as an estimate, since a guess from a photo is about a third off (Fridolfsson 2025).
 * A food of one of my meals carries the meal as a fifth part, like `X-FOOD:Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne`,
 * so the log keeps what the meal held that day, whatever I change in `Meals.md` later; its what names the meal,
 * then the foods eaten beside it, like `Chili con Carne, Weißbrot`; an older line of a meal carried its servings eaten
 * and its variant, like `Hackfleisch;62.5;Chili con Carne;0.5;09.10.2026`, still read.
 * A product of Open Food Facts is a pack as sold, its values per 100 g or 100 ml, with the size of the pack in grams
 * or millilitres, like `450` of `450 g`, its portion that of a serving where Open Food Facts gives one, else 100,
 * never its pack, since `2x` means two portions, not two packs, see {@link productOf}.
 * Open Food Facts is asked anonymously: a request carries the search and the name of the dashboard,
 * never my email or my name.
 *
 * - `node:fs`: Reads and writes `Foods.md` and `Meals.md`.
 * - `node:path`: Gives the folder of `Foods.md` and `Meals.md`.
 * - `./calendar.ts`: Reads the log, finds the file of an entry, writes the foods of an entry anew and gives the day
 *   of an instant in Berlin time.
 * - `./sources.ts`: Names `Foods.md`, `Meals.md`, the log and the addresses of Open Food Facts,
 *   and tells which files the reader may write.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, entriesRead, entryLookup, propertiesPut } from "./calendar.ts";
import { food, writeAllowed } from "./sources.ts";

import type { Entry } from "./calendar.ts";


/**
 * Energy and nutrients of 100 g of a food, or of what one food of a meal gave, as far as they are known:
 * kcal always, protein, carbs and fat `null` where unknown, never 0, since a 0 is a true 0, see {@link nutrientsOf}.
 *
 * - `kcal`: Energy in kcal.
 * - `protein`: Protein in grams, `null` when unknown.
 * - `carbs`: Carbohydrates in grams, `null` when unknown.
 * - `fat`: Fat in grams, `null` when unknown.
 */
export type Nutrients = {
    kcal: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
};

/**
 * What meals gave together, each the sum of what is known, an unknown nutrient adding nothing, see {@link sumOf}.
 *
 * - `kcal`: Energy in kcal.
 * - `protein`: Protein in grams.
 * - `carbs`: Carbohydrates in grams.
 * - `fat`: Fat in grams.
 */
export type Totals = {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
};

/**
 * Kind of a food: `Eat`, a food to eat, its values per 100 g and its amounts in grams, or `Drink`, a drink, its values
 * per 100 ml and its amounts in millilitres, like `Coca-Cola`, which a summary leaves out, see the top of this file.
 */
export type Kind = "Eat" | "Drink";

/**
 * A food, one row of `Foods.md`: its {@link Nutrients} per 100 of its unit with its name, barcode, brand, store, pack
 * and kind; no two foods have the same name, brand and store, ignoring case.
 *
 * - `name`: Name, by which a meal lists it, like `Reis` of `X-FOOD:Reis;Golden Sun;Lidl;150`; without `|` and `;`,
 *   and without `,` in a row written since commas went, see {@link foodTextOf}.
 * - `barcode`: Open Food Facts barcode it came from, like `20112745`; empty for a food added by hand.
 * - `brand`: Its brand, like `Milbona`, empty when none is known.
 * - `store`: The store I bought it in, like `Lidl`, empty when none is known.
 * - `pack`: Size of its pack as sold in its unit, like 450 of `450 g` or 330 of `0.33 l`, `null` when none is known,
 *   like for a food added by hand.
 * - `portion`: Amount in its unit I typically take at once, like 50 of a Semmel, one piece, or 30 of oil, two
 *   tablespoons, so an entry takes `2x` or `2 St` as twice that; `null` only in a row left empty by hand.
 * - `kind`: Its kind, `Eat` for a row without one, see {@link Kind}.
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
 * A product of Open Food Facts as a search sends it: a {@link Food}, but its kcal `null` where Open Food Facts does not
 * know them, like `Zwiebeln` of Edeka, so it still shows and I type its kcal from the pack, see `../src/food/search.ts`.
 */
export type Product = Omit<Food, "kcal"> & {
    kcal: number | null;
};

/**
 * What a search finds.
 *
 * - `foods`: My foods whose name holds the search, ignoring case, or whose barcode it is, the most eaten first,
 *   equal ones alphabetical; all of them for an empty search.
 * - `products`: Products of Open Food Facts on the page asked for that are not among my foods, each a {@link Product}
 *   as it would go into `Foods.md`, the best match first; none for a search shorter than {@link searchLength}
 *   or one of my foods only; `null` when Open Food Facts cannot be reached.
 * - `total`: Number of products of Open Food Facts the search matches, my foods among them;
 *   a lower bound, like 10,000, when not `exact`.
 * - `exact`: Whether `total` is exact.
 * - `more`: Whether a page after the one asked for holds more products.
 */
export type FoodsFound = {
    foods: Food[];
    products: Product[] | null;
    total: number;
    exact: boolean;
    more: boolean;
};

/**
 * One page of the products of a search of Open Food Facts.
 *
 * - `products`: Products with a name, the best match first.
 * - `total`, `exact`, `more`: As those of {@link FoodsFound}.
 */
type ProductsPage = {
    products: Product[];
    total: number;
    exact: boolean;
    more: boolean;
};

/**
 * A food of mine to change, as the page sends it, see {@link foodChange}.
 *
 * - `old`: Its name, brand and store as `Foods.md` holds them.
 * - `name`, `brand`, `store`: Its name, brand and store as typed.
 * - `protein`, `carbs`, `fat`: Its nutrients per 100 g as typed, `null` for one unknown; taken only for a food I made
 *   by hand, without barcode, and only while unknown, see {@link foodChange}.
 * - `pack`: Size of its pack in its unit as typed, for a food by hand, `null` for none.
 * - `portion`: Amount of its portion as typed, `null` for none, which takes 100, see {@link portionOf}.
 * - `kind`: Its kind as picked, see {@link Kind}.
 */
export type FoodChanged = {
    old: { name: string; brand: string; store: string };
    name: string;
    brand: string;
    store: string;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    pack?: number | null;
    portion?: number | null;
    kind?: Kind;
};

/**
 * A food of a meal with what it gives, its {@link Nutrients}, a nutrient its food does not know unknown too.
 *
 * - `name`: Name of the food, as the meal lists it, like `Skyr natur`.
 * - `brand`, `store`: Its brand and the store I bought it in, like `K-Classic` and `Kaufland`; empty where the line
 *   names none, so the page shows them grey after the name, as everywhere.
 * - `grams`: Grams eaten as the meal lists them, millilitres of a drink, 0 for a line without grams, which counts
 *   nothing.
 * - `estimate`: Whether the grams are guessed, not weighed, marked by `~`.
 * - `known`: Whether `Foods.md` holds the food; an unknown food gives nothing.
 * - `meal`: The meal of mine it belongs to in this entry, as its line carries it, like `Chili con Carne`;
 *   empty for a food eaten by itself, like bread beside a meal.
 * - `kind`: Kind of its food, `Eat` for a food `Foods.md` does not hold, see {@link Kind}.
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
 *
 * - `name`: Name of its food, like `Skyr natur`.
 * - `brand`, `store`: Brand of its food and the store I bought it in, like `K-Classic` and `Kaufland`;
 *   empty in a line written before foods had them.
 * - `grams`: Grams it gives, `null` for none.
 * - `guessed`: Whether its grams are guessed, not weighed, marked by `~`, like `~400`.
 * - `meal`: The meal of mine its food belongs to, empty for none.
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
 *
 * - `id`: Identifier of the entry.
 * - `start`: Start as ISO instant.
 * - `title`: What I ate, its `SUMMARY`, like `Reis, Bohnen, Eier`.
 * - `location`: Where, its `LOCATION`, like `Home Munich`, empty when it has none.
 * - `foods`: Its foods in the order of its lines `X-FOOD`, none when it lists none.
 * - `estimate`: Whether one of its foods counts grams guessed.
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
 * A meal of mine, as `Meals.md` holds it: one list of every food I may put in, never variants, each with the grams
 * I put in as a rule.
 *
 * - `name`: Name of the meal, like `Chili con Carne`; unique, without `|`, `;` and `,`.
 * - `short`: What its brackets show, as I typed it, like `Hackfleisch, Tomaten`; empty for no brackets.
 * - `foods`: Its foods by name, brand and store parted by `;`, like `Hackfleisch;Gut & Günstig;Edeka`, in their order.
 * - `standard`: The grams of each food, in their order, which an entry starts with: 0 for one I rarely put in,
 *   `null` for none set yet.
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
 * - `kcal`: What its foods give at their standard grams, a food not in `Foods.md` counting nothing; `null` while
 *   no food has standard grams.
 * - `portions`: The grams of the portion of each of its foods, in their order, as `Foods.md` holds them, so its
 *   standard grams take `2x`; `null` for a food without portion or not in `Foods.md`.
 * - `kinds`: The kind of each of its foods, in their order, `Eat` for a food not in `Foods.md`, see {@link Kind}.
 */
export type Dish = Composition & {
    kcal: number | null;
    portions: (number | null)[];
    kinds: Kind[];
};

/**
 * The meals of a day with what they give together.
 *
 * - `meals`: Meals that start on the day in Berlin time, in the order of their starts.
 * - `estimate`: Whether a food of a meal counts grams guessed.
 */
export type FoodDay = Totals & {
    meals: Meal[];
    estimate: boolean;
};

/**
 * A product as Open Food Facts sends it, with the fields of {@link productFields}; each may be missing.
 *
 * - `code`: Barcode.
 * - `product_name`: Name.
 * - `brands`: Brands, a list from the search, a text parted by commas from the products.
 * - `stores`: Stores that sell it, as the brands.
 * - `quantity`: Size of the pack as its maker writes it, like `450g`.
 * - `serving_quantity`: Amount of a serving in grams or millilitres, like `30`.
 * - `nutrition_data_per`: What its nutrients are given for, `100g` or `100ml`.
 * - `nutriments`: Nutrients by their names, like `energy-kcal_100g` or `proteins_100g`.
 */
type ProductSent = {
    code?: string;
    product_name?: string;
    brands?: string | string[];
    stores?: string | string[];
    quantity?: string;
    serving_quantity?: number | string;
    nutrition_data_per?: string;
    nutriments?: { [nutrient: string]: number | string | undefined };
};

/**
 * Answer of Open Food Facts: from the search its `hits`, their number, `count`, exact or a lower bound,
 * and its number of pages, `page_count`; from the products the `product`, missing for an unknown barcode.
 */
type Answer = {
    hits?: ProductSent[];
    count?: number;
    is_count_exact?: boolean;
    page_count?: number;
    product?: ProductSent;
};

/**
 * Category of meals, written as `CATEGORIES:Food` by the entry by category of the day.
 */
export const foodName: string = "Food";

/**
 * Head of the table of `Foods.md`, the header and the line below it, with the columns of brand, store, pack and kind.
 *
 * @returns The two lines
 */
function tableHeadOf(): string[] {
    return [
        "| Food | kcal | Protein | Carbs | Fat | Barcode | Brand | Store | Portion | Pack | Kind |",
        "| --- | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | --- |",
    ];
}

/**
 * Text a new `Foods.md` starts with: its title, one line on the units of its columns, nothing of how the code
 * uses them, and the head of its table, the header and the line below it, see {@link tableHeadOf}.
 */
const fileHead: string[] = [
    "# Foods",
    "Nutrients per 100 g, or per 100 ml for a drink; Portion and Pack in g or ml.",
    "",
    ...tableHeadOf(),
];

/**
 * Lines of the table of `Foods.md` before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * Head of the table of a meal in `Meals.md`, no line above it but its short title, since its columns say enough.
 */
const mealHead: string[] = [
    "| Food | Brand | Store | Grams |",
    "| --- | --- | --- | ---: |",
];

/**
 * Line `X-FOOD` written before foods had brand and store, which names its food alone: the name of a food, then `;`
 * and the grams when given, `~` before grams guessed, then for a food of one of my meals `;` with the meal,
 * `;` with its servings eaten and maybe `;` with its variant, like `Reis;150`, `Milch;200.5`, `Döner;~400`, `Eier`
 * or `Hackfleisch;62.5;Chili con Carne;0.5;09.10.2026`; see {@link lineOf} for the line of today.
 */
const foodLine: RegExp =
    /^([^;]+?)(?:;\s*(~)?\s*(\d+(?:[.,]\d+)?))?(?:;\s*([^;|]+?)\s*;\s*(\d+(?:[.,]\d+)?)(?:\s*;\s*([^;|]*?))?)?\s*$/;

/**
 * Grams as a part of a line `X-FOOD`, `~` before grams guessed, like `150`, `200.5` or `~400`.
 */
const gramsPart: RegExp = /^(~)?\s*(\d+(?:[.,]\d+)?)$/;

/**
 * Barcode, as a search may be one: 8 to 14 digits, like `20112745` or `4316268460989`.
 */
const barcode: RegExp = /^\d{8,14}$/;

/**
 * Fewest characters a search needs to ask Open Food Facts, since fewer find mostly noise; a barcode is longer.
 */
const searchLength: number = 3;

/**
 * Name the dashboard gives itself when it asks Open Food Facts, which asks apps for one;
 * on purpose without an email or a name, so nothing about me leaves.
 */
const agent: string = "NomSystemDashboard/0.1";

/**
 * Fields of a product the reader asks Open Food Facts for, see {@link ProductSent}.
 */
const productFields: string = "code,product_name,brands,stores,quantity,serving_quantity,nutrition_data_per,nutriments";

/**
 * Languages of the names a search looks in: German, since I shop in Germany, and English.
 */
const searchLanguages: string = "de,en";

/**
 * Products of Open Food Facts on a page of a search; those without name or kcal and those among my foods fall out.
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
 * End of every range that reads the whole log, past and to come, like for a food renamed in every entry naming it.
 */
const logEnd: string = "9999-12-31T00:00:00Z";

/**
 * Energy of a gram of protein, of carbs and of fat in kcal, as food labels count it: 4, 4 and 9,
 * by which the one of them a food lacks is worked out from its kcal, see {@link nutrientsOf}.
 */
const kcalPerGram: { protein: number; carbs: number; fat: number } = { protein: 4, carbs: 4, fat: 9 };


/**
 * Turns the text of a number into the number, a decimal comma counting as a point.
 *
 * @param text - Number as written, like `7.4` or `7,4`; missing in a short row
 * @returns Number, 0 for an empty or unreadable text
 */
function numberOf(text: string | undefined): number {
    return Number((text ?? "").replace(",", ".")) || 0;
}

/**
 * Reads a nutrient, a cell of `Foods.md` or a value of Open Food Facts, a decimal comma counting as a point.
 * - `text`: The nutrient as text, without spaces at its ends.
 * - `value`: Its number, not a number for an empty or unreadable text.
 *
 * @param sent - Nutrient as written or sent, like `7.4`, `7,4` or 7.4; missing for none
 * @returns Grams, `null` for one empty, missing or unreadable, which is unknown, never 0
 */
function nutrientOf(sent: number | string | null | undefined): number | null {
    const text: string = String(sent ?? "").trim().replace(",", ".");
    const value: number = text === "" ? NaN : Number(text);
    return Number.isFinite(value) ? value : null;
}

/**
 * Rounds a number as `Foods.md` writes it: kcal whole, nutrients to one decimal.
 *
 * @param value - Number
 * @param digits - Decimals to keep
 * @returns Rounded number
 */
function roundOf(value: number, digits: number): number {
    return Math.round(value * 10 ** digits) / 10 ** digits;
}

/**
 * Gives the nutrients of a food as `Foods.md` writes them: kcal whole, protein, carbs and fat to one decimal,
 * see {@link roundOf}, each `null` while unknown, never 0, since a 0 given is a true 0 and stays.
 * The one of protein, carbs and fat a food lacks is worked out from its kcal and the other two, by the energy of
 * a gram of each, see {@link kcalPerGram}, never below 0: 190 kcal with 10 g protein and 15 g carbs give
 * (190 − 4 × 10 − 4 × 15) / 9 = 10 g fat. With two or three missing the kcal cannot tell them apart,
 * so they stay unknown.
 * - `rounded`: The values rounded.
 * - `missing`: How many of protein, carbs and fat are unknown.
 * - `rest`: kcal left for the one missing, once those of the other two are taken off.
 *
 * @param values - kcal per 100 g, and protein, carbs and fat, `null` where unknown
 * @returns The values as `Foods.md` writes them
 */
function nutrientsOf(values: Nutrients): Nutrients {
    const rounded: Nutrients = {
        kcal: roundOf(values.kcal, 0),
        protein: values.protein === null ? null : roundOf(values.protein, 1),
        carbs: values.carbs === null ? null : roundOf(values.carbs, 1),
        fat: values.fat === null ? null : roundOf(values.fat, 1),
    };
    const missing: number = [rounded.protein, rounded.carbs, rounded.fat]
        .filter((value: number | null): boolean => value === null).length;
    if (missing !== 1)
        return rounded;
    const rest: number = rounded.kcal - kcalPerGram.protein * (rounded.protein ?? 0)
        - kcalPerGram.carbs * (rounded.carbs ?? 0) - kcalPerGram.fat * (rounded.fat ?? 0);
    return {
        kcal: rounded.kcal,
        protein: rounded.protein ?? roundOf(Math.max(0, rest / kcalPerGram.protein), 1),
        carbs: rounded.carbs ?? roundOf(Math.max(0, rest / kcalPerGram.carbs), 1),
        fat: rounded.fat ?? roundOf(Math.max(0, rest / kcalPerGram.fat), 1),
    };
}

/**
 * Cleans a name for a table and the lines `X-FOOD`, like a food of a meal or the pack of a food: `|` and `;` become
 * spaces, spaces in a row one, none at the ends.
 *
 * @param name - Name as typed or as Open Food Facts writes it, like `SUPREME  RICE`
 * @returns Clean name, like `SUPREME RICE`
 */
function nameOf(name: string): string {
    return name.replace(/[|;]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cleans the name of a food as it goes into `Foods.md`, from Open Food Facts or typed by hand, and the name of a meal:
 * as a name, see {@link nameOf}, and without a comma, since the comma is ours: it parts the names of a summary,
 * like `Chili con Carne, Weißbrot`, and the brand from the store in `(Gut & Günstig, Edeka)`. A comma between two digits
 * becomes a point, like `Milch 1.5 %` of `Milch 1,5 %`; every other comma goes, its space with it, the words around it
 * one space apart, like `Sonnenmais zart` of `Sonnenmais, zart`; everything else stays exactly as given.
 * Rows already in `Foods.md` and `Meals.md` are read as they are.
 *
 * @param text - Name as typed or as Open Food Facts writes it, like `Sonnenmais, zart`
 * @returns Clean name, like `Sonnenmais zart`
 */
function foodTextOf(text: string): string {
    return nameOf(text.replace(/(\d),(?=\d)/g, "$1.").replace(/\s*,\s*/g, " "));
}

/**
 * Cleans a brand or a store for `Foods.md`: as the name of a food, see {@link foodTextOf}, and without quotes and
 * backslashes.
 *
 * @param brand - Brand as typed or as Open Food Facts writes it, like ` Gut & Günstig`
 * @returns Clean brand, like `Gut & Günstig`
 */
function brandOf(brand: string): string {
    return foodTextOf(brand.replace(/["\\]/g, " "));
}

/**
 * Gives the first of the brands or stores of a product, as the search sends a list and a product a text
 * parted by commas, cleaned for `Foods.md`, see {@link nameOf}.
 *
 * @param sent - Brands or stores as sent, like `["Milbona", "Lidl"]` or `Milbona, Lidl`; missing for none
 * @returns The first, like `Milbona`, empty for none
 */
function firstOf(sent: string | string[] | undefined): string {
    return nameOf(([sent ?? ""].flat()[0] ?? "").split(",")[0]);
}

/**
 * Grams or millilitres of one of each unit a maker writes the size of a pack in.
 */
const unitSizes: { [unit: string]: number } = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000 };

/**
 * Gives the size of a pack as a bare number in grams or millilitres, its first weight or volume, to one decimal,
 * like 450 of `450g`, 500 of `500.0 g`, 330 of `0.33 l` and 140 of `140 g (7 x 20 g)`; nothing for a size without
 * a weight or volume, like `1 pcs`, which tells nothing of what it gives.
 * - `size`: Its first weight or volume cut into number and unit, `null` for none.
 *
 * @param quantity - Size as its maker writes it, like `450g` or `0.33 l`; missing when none is known
 * @returns Size in grams or millilitres, `null` for none
 */
function packOf(quantity: string | undefined): number | null {
    const size: RegExpExecArray | null = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i.exec(quantity ?? "");
    return size === null ? null : roundOf(numberOf(size[1]) * unitSizes[size[2].toLowerCase()], 1);
}

/**
 * Tells the kind of a product of Open Food Facts, see {@link Kind}: `Drink` when its nutrients are given per 100 ml or
 * the size of its pack is a volume, like `0.33 l`, else `Eat`.
 *
 * @param sent - Product as sent
 * @returns Its kind
 */
function productKindOf(sent: ProductSent): Kind {
    return sent.nutrition_data_per === "100ml" || /\d\s*(ml|cl|dl|l)\b/i.test(sent.quantity ?? "") ? "Drink" : "Eat";
}

/**
 * Reads the kind of a food as written, see {@link Kind}.
 *
 * @param text - Kind as written or sent, like `Drink`; missing in a row written before kinds were kept
 * @returns `Drink` for `Drink`, ignoring case, else `Eat`
 */
function kindOf(text: unknown): Kind {
    return String(text ?? "").trim().toLowerCase() === "drink" ? "Drink" : "Eat";
}

/**
 * Gives the portion of a food as written, never empty: the amount given, to one decimal, else 100; never its pack,
 * which only I type or pick, so `1x` of a jar of jam of 450 g is one portion, not the jar.
 *
 * @param given - Amount of its portion given, like a serving of Open Food Facts or one typed; `null` for none
 * @returns Its portion
 */
function portionOf(given: number | null): number {
    return given !== null && given > 0 ? roundOf(given, 1) : 100;
}

/**
 * Cuts a row of a table into its cells, without the empty texts before its first `|` and after its last,
 * each without spaces at its ends: parted only by a `|` that is no `\|`, as the editor writes a `|` typed into a cell,
 * see `cellWritten` in `src/editor/table.ts`, so such a cell never moves the cells after it one column on; the cell
 * keeps its `\|` as written, so it stays one when its row is written back.
 *
 * @param line - Row like `| Gouda | 356 | 25 |  |  | 4056489012345 | Milbona | Lidl | 30 | 400 | Eat |`
 * @returns Its cells
 */
function cellsOf(line: string): string[] {
    return line.split(/(?<!\\)\|/).slice(1, -1).map((cell: string): string => cell.trim());
}

/**
 * Cuts a row of the table of `Foods.md` into its cells by the names of its head, so a table written in an older order
 * reads too: `Piece` as `Portion`, its name for a while, a column the table lacks, like `Pack` or `Kind`, missing.
 * - `cells`: Its cells in the order of the head.
 *
 * @param head - Names of the columns, the header of the table cut into cells, see {@link cellsOf}
 * @param line - Row of the table
 * @returns Its cells by the names of the columns
 */
function cellsByNameOf(head: string[], line: string): { [column: string]: string | undefined } {
    const cells: string[] = cellsOf(line);
    return Object.fromEntries(head.map((name: string, index: number): [string, string] =>
        [name === "Piece" ? "Portion" : name, cells[index] ?? ""]));
}

/**
 * Reads my foods, the rows of the table of `Foods.md`: its lines starting with `|`, after the head of the table,
 * as they are, each cell found by the name of its column, see {@link cellsByNameOf}, the column `Portion` the amount
 * I typically take at once, the pack a bare number, and the kind, `Eat` where a row has none, see {@link kindOf}.
 * kcal that cannot be read counts as 0; a nutrient empty or unreadable
 * is unknown, `null`, never 0, see {@link nutrientOf}; a row without a name stays out.
 * - `rows`: The lines of the table.
 * - `head`: Names of its columns.
 *
 * @returns Foods in the order of the table, none while `Foods.md` does not exist
 */
export function foodsRead(): Food[] {
    if (!existsSync(food.foods))
        return [];

    const rows: string[] = readFileSync(food.foods, "utf8").split("\n").filter((line: string): boolean => line.startsWith("|"));
    const head: string[] = cellsOf(rows[0] ?? "");
    return rows.slice(tableHead)
        .map((line: string): { [column: string]: string | undefined } => cellsByNameOf(head, line))
        .filter((cells: { [column: string]: string | undefined }): boolean => (cells.Food ?? "") !== "")
        .map((cells: { [column: string]: string | undefined }): Food => ({
            name: cells.Food ?? "", kcal: numberOf(cells.kcal), protein: nutrientOf(cells.Protein),
            carbs: nutrientOf(cells.Carbs), fat: nutrientOf(cells.Fat), barcode: cells.Barcode ?? "",
            brand: cells.Brand ?? "", store: cells.Store ?? "", pack: nutrientOf(cells.Pack),
            portion: nutrientOf(cells.Portion), kind: kindOf(cells.Kind),
        }));
}

/**
 * Reads the meals of a range: the log entries of the category `Food`.
 *
 * @param start - Start of the range as ISO instant
 * @param end - End of the range, excluded, in the same form
 * @returns Log entries of the meals
 */
function mealsRead(start: string, end: string): Entry[] {
    return entriesRead(food.log, start, end).filter((entry: Entry): boolean => entry.category === foodName);
}

/**
 * Writes the label of a food as the page shows it: its name, then its brand and store in brackets, those it has,
 * like `Skyr natur (K-Classic, Kaufland)`, since they only tell which one it is.
 *
 * @param food - Food with its name, brand and store
 * @returns Label, the name alone for a food without brand and store
 */
export function labelOf(food: { name: string; brand: string; store: string }): string {
    const place: string[] = [food.brand, food.store].filter((part: string): boolean => part !== "");
    return place.length === 0 ? food.name : `${food.name} (${place.join(", ")})`;
}

/**
 * Writes the key of a food, by which a line `X-FOOD` finds it among my foods: its name, brand and store
 * parted by `;`, in small letters, like `skyr natur;k-classic;kaufland`.
 *
 * @param food - Food or line with its name, brand and store
 * @returns Key
 */
function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

/**
 * Reads my foods by their keys, see {@link keyOf}, and by their names alone in small letters, for a line written
 * before foods had brand and store, the first food of a name.
 * - `mine`: My foods by key and by name.
 *
 * @returns Foods by their keys and names
 */
function foodsByKeyRead(): Map<string, Food> {
    const mine: Map<string, Food> = new Map();
    foodsRead().forEach((row: Food): void => {
        mine.set(keyOf(row), row);
        if (!mine.has(row.name.toLowerCase()))
            mine.set(row.name.toLowerCase(), row);
    });
    return mine;
}

/**
 * Finds the food of a line among my foods: by its name, brand and store, a line without both by its name alone.
 *
 * @param read - Line as read, see {@link lineOf}
 * @param mine - My foods by their keys and names, see {@link foodsByKeyRead}
 * @returns The food, `undefined` when `Foods.md` holds none
 */
function foodOfLine(read: Line, mine: Map<string, Food>): Food | undefined {
    return mine.get(keyOf(read)) ?? (read.brand === "" && read.store === "" ? mine.get(read.name.toLowerCase()) : undefined);
}

/**
 * Cuts a line `X-FOOD` of today into its five parts: its food's name, brand and store, its grams, empty for a food
 * `Foods.md` does not hold, and the meal of mine it belongs to, like `Skyr natur;K-Classic;Kaufland;150`,
 * `Reis;;;80` of a food without brand and store, or `Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne`,
 * told by its second part being no grams and its fourth grams or empty; the foods of a meal in `Meals.md`
 * without grams, like `Hackfleisch;Gut & Günstig;Edeka`.
 *
 * @param line - Value of the line
 * @returns Its five parts, empty where it has none, `null` for a line written before foods had brand and store
 */
function partsOf(line: string): string[] | null {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    if ((parts.length === 4 || parts.length === 5) && !gramsPart.test(parts[1])
        && (parts[3] === "" || gramsPart.test(parts[3])))
        return [...parts, ""].slice(0, 5);
    if (parts.length === 3 && !gramsPart.test(parts[1]) && !gramsPart.test(parts[2]))
        return [...parts, "", ""];
    return null;
}

/**
 * Reads a line `X-FOOD`: one of today by its parts, see {@link partsOf}, an older one by {@link foodLine},
 * which names its food alone.
 * - `parts`: Parts of a line of today, `null` for an older one.
 * - `grams`: Its grams cut into `~` and number, `null` for none.
 * - `old`: An older line cut into its parts, `null` when it is none.
 *
 * @param line - Value of the line, like `Skyr natur;K-Classic;Kaufland;150` or `Reis;150`
 * @returns The line as read
 */
function lineOf(line: string): Line {
    const parts: string[] | null = partsOf(line);
    if (parts !== null) {
        const grams: RegExpExecArray | null = gramsPart.exec(parts[3]);
        return {
            name: parts[0], brand: parts[1], store: parts[2], grams: grams === null ? null : numberOf(grams[2]),
            guessed: grams?.[1] !== undefined, meal: parts[4],
        };
    }
    const old: RegExpExecArray | null = foodLine.exec(line.trim());
    return {
        name: old === null ? line.trim() : old[1].trim(), brand: "", store: "",
        grams: old?.[3] === undefined ? null : numberOf(old[3]), guessed: old?.[2] !== undefined, meal: old?.[4] ?? "",
    };
}

/**
 * Counts how often each food was eaten: the lines `X-FOOD` of the meals in the log up to now.
 * - `uses`: Number of lines by the key of their food, see {@link keyOf}.
 *
 * @returns Number of lines by the key of their food
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
 * Reads the entries of the log up to now that list foods, my meals, `Food`, and my cookings, `Cook`, the newest first.
 *
 * @returns The entries
 */
function foodEntriesRead(): Entry[] {
    return entriesRead(food.log, "1970-01-01T00:00:00Z", new Date().toISOString())
        .filter((entry: Entry): boolean => entry.foods.length > 0)
        .sort((first: Entry, second: Entry): number => second.start.localeCompare(first.start));
}

/**
 * Finds the grams each food was logged with last among entries: for each food, by its name, brand and store,
 * the grams of its line in the first entry that holds it with grams; a food never logged so is not among them.
 * - `last`: Grams by the key of each food, see {@link keyOf}.
 *
 * @param entries - Entries listing foods, the newest first
 * @returns Grams by the key of each food
 */
function lastGramsOf(entries: Entry[]): Map<string, number> {
    const last: Map<string, number> = new Map();
    entries.flatMap((entry: Entry): Line[] => entry.foods.map(lineOf)).forEach((read: Line): void => {
        if (read.grams !== null && !last.has(keyOf(read)))
            last.set(keyOf(read), read.grams);
    });
    return last;
}

/**
 * Finds the grams I logged each food with last in an entry of a category, at which a food picked into an entry of it
 * starts, see `src/day/meal.ts`: the grams of its line in the newest entry of the category up to now that holds it
 * with grams, see {@link lastGramsOf}.
 *
 * @param category - Category of the entries, `Food` or `Cook`
 * @returns Grams by the key of each food, see {@link keyOf}
 */
export function gramsRead(category: string): Map<string, number> {
    return lastGramsOf(foodEntriesRead().filter((entry: Entry): boolean => entry.category === category));
}

/**
 * Builds the address that asks Open Food Facts for a search:
 * for a barcode its product, else a page of the products whose names match, in {@link searchLanguages}.
 *
 * @param query - Name or barcode
 * @param page - Page, 1 for the first
 * @returns Address with the fields to send
 */
function addressOf(query: string, page: number): URL {
    const address: URL = new URL(barcode.test(query) ? `${food.product}${query}` : food.search);
    if (!barcode.test(query)) {
        address.searchParams.set("q", query);
        address.searchParams.set("langs", searchLanguages);
        address.searchParams.set("page_size", String(pageSize));
        address.searchParams.set("page", String(page));
    }
    address.searchParams.set("fields", productFields);
    return address;
}

/**
 * Turns a product as Open Food Facts sends it into a {@link Food} as it would go into `Foods.md`: its name cleaned,
 * see {@link foodTextOf}, the first of its brands and of its stores, cleaned too, its nutrients as `Foods.md` writes
 * them, the one of protein, carbs and fat it lacks worked out from its kcal, more missing unknown,
 * see {@link nutrientsOf}, the size of its pack, see {@link packOf}, its portion, its serving where given, else 100,
 * see {@link portionOf}, and its kind, see {@link productKindOf}.
 * - `nutrients`: Its nutrients by their names.
 * - `kcal`: Its kcal per 100 g, else its energy in kJ per 100 g turned into kcal, 4.184 kJ a kcal, `null` when both
 *   are missing.
 * - `given`: Its protein, carbs and fat per 100 g, `null` where missing.
 * - `name`: Its clean name.
 * - `pack`: Size of its pack, `null` for none.
 *
 * @param sent - Product as sent
 * @returns The product, its kcal `null` when Open Food Facts does not know them, see {@link Product};
 *   `null` when it has no name
 */
function productOf(sent: ProductSent): Product | null {
    const nutrients: { [nutrient: string]: number | string | undefined } = sent.nutriments ?? {};
    const kj: number | null = nutrientOf(nutrients["energy-kj_100g"]);
    const kcal: number | null = nutrientOf(nutrients["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184);
    const given: Omit<Nutrients, "kcal"> = {
        protein: nutrientOf(nutrients.proteins_100g), carbs: nutrientOf(nutrients.carbohydrates_100g),
        fat: nutrientOf(nutrients.fat_100g),
    };
    const name: string = foodTextOf(sent.product_name ?? "");
    const pack: number | null = packOf(sent.quantity);
    if (name === "")
        return null;

    return {
        name: name,
        ...kcal === null ? { kcal: null, ...given } : nutrientsOf({ kcal: kcal, ...given }),
        barcode: sent.code ?? "",
        brand: brandOf(firstOf(sent.brands)),
        store: brandOf(firstOf(sent.stores)),
        pack: pack,
        portion: portionOf(nutrientOf(sent.serving_quantity)),
        kind: productKindOf(sent),
    };
}

/**
 * Asks Open Food Facts for a page of the products of a search, anonymously, see {@link agent}.
 * An unknown barcode answers `404 Not Found`, with an answer without product; a barcode has one page.
 * - `answer`: Answer of Open Food Facts.
 * - `sent`: Products as sent, the hits of a search or the one product of a barcode.
 * - `products`: Those that can count.
 *
 * @param query - Name or barcode
 * @param page - Page, 1 for the first
 * @returns The page of products
 * @throws {Error} - When Open Food Facts does not answer in time or answers with an error
 */
async function productsAsk(query: string, page: number): Promise<ProductsPage> {
    const response: Response = await fetch(addressOf(query, page), {
        headers: { "User-Agent": agent },
        signal: AbortSignal.timeout(answerTime),
    });
    if (!response.ok && response.status !== 404)
        throw new Error(`Open Food Facts answered ${response.status}`);

    const answer: Answer = await response.json() as Answer;
    const sent: ProductSent[] = answer.hits ?? (answer.product === undefined ? [] : [answer.product]);
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
 * Finds foods by a name or a barcode, see {@link FoodsFound}: my foods first, then, where asked, a page of the products
 * of Open Food Facts.
 * The one search for foods, of the food view and of the entry by category of the day.
 * - `query`: Search without spaces at its ends, in small letters.
 * - `mine`: My foods.
 * - `uses`: How often each food was eaten, see {@link usesRead}.
 * - `foods`: My foods found.
 * - `none`: What a search finds on Open Food Facts that does not ask it.
 * - `found`: The page of products found.
 *
 * @param text - Search as typed, like `ric` or `20112745`
 * @param page - Page of the products, 1 for the first; anything else that is no whole number above 0 counts as 1
 * @param products - Whether Open Food Facts is asked too; not for a meal of mine, which takes only my foods
 * @returns Foods found
 */
export async function foodsFind(text: string, page: number, products: boolean): Promise<FoodsFound> {
    const query: string = text.trim().toLowerCase();
    const mine: Food[] = foodsRead();
    const uses: Map<string, number> = usesRead();
    const foods: Food[] = mine
        .filter((candidate: Food): boolean => labelOf(candidate).toLowerCase().includes(query) || candidate.barcode === query)
        .sort((first: Food, second: Food): number =>
            (uses.get(keyOf(second)) ?? 0) - (uses.get(keyOf(first)) ?? 0)
            || first.name.localeCompare(second.name));
    const none: Omit<FoodsFound, "foods" | "products"> = { total: 0, exact: true, more: false };
    if (!products || query.length < searchLength)
        return { foods: foods, products: [], ...none };

    try {
        const found: ProductsPage = await productsAsk(query, Number.isInteger(page) && page > 0 ? page : 1);
        return {
            foods: foods,
            products: found.products.filter((product: Product): boolean =>
                !mine.some((candidate: Food): boolean => candidate.barcode === product.barcode)),
            total: found.total, exact: found.exact, more: found.more,
        };
    } catch (error: unknown) {
        console.error(new Date().toISOString(), "Open Food Facts", error);
        return { foods: foods, products: null, ...none };
    }
}

/**
 * Writes a food as a row of the table of `Foods.md`, an unknown nutrient an empty cell, never 0, the amount of its
 * portion in the column `Portion` before its pack, a bare number, empty for none, and its kind last, see the top of
 * this file.
 * - `cells`: Its values in the order of the columns, see {@link tableHeadOf}.
 *
 * @param food - Food as written
 * @returns Row like `| Gouda | 356 | 25 |  |  | 4056489012345 | Milbona | Lidl | 30 | 400 | Eat |`
 */
function rowOf(food: Food): string {
    const cells: (string | number | null)[] = [food.name, food.kcal, food.protein, food.carbs, food.fat,
        food.barcode, food.brand, food.store, food.portion, food.pack, food.kind];
    return `| ${cells.map((cell: string | number | null): string => String(cell ?? "")).join(" | ")} |`;
}

/**
 * Gives the table of `Foods.md` the columns of today, see {@link tableHeadOf}, like a table written before packs or
 * kinds were kept, with `Piece` where `Portion` stands now, or in an older order: its head, and each of its rows,
 * every cell moved under the name of its column, see {@link cellsByNameOf}, a column it lacked empty.
 * - `columns`: Names of the columns of today.
 * - `head`: Names of the columns of the table as written.
 *
 * @param lines - Lines of `Foods.md`, changed in place
 * @param header - Index of the header of its table
 */
function tableHeadPut(lines: string[], header: number): void {
    if (lines[header] === tableHeadOf()[0])
        return;

    const columns: string[] = cellsOf(tableHeadOf()[0]);
    const head: string[] = cellsOf(lines[header]);
    lines.forEach((line: string, index: number): void => {
        if (index >= header + tableHead && line.startsWith("|")) {
            const cells: { [column: string]: string | undefined } = cellsByNameOf(head, line);
            lines[index] = `| ${columns.map((name: string): string => cells[name] ?? "").join(" | ")} |`;
        }
    });
    lines.splice(header, tableHead, ...tableHeadOf());
}

/**
 * Adds a food to `Foods.md` as the last row of its table, every other line staying as it is, but a table without
 * the columns of brand, store, pack or kind, or in an older order, which gets those of today, see {@link tableHeadPut};
 * creates `Foods.md` with its head, see {@link fileHead}, when it does not exist yet.
 * A product of Open Food Facts goes in as Open Food Facts gives it, a food by hand as typed: the name, brand and store
 * cleaned, see {@link foodTextOf}, brand, store and pack empty where none is known, the numbers as `Foods.md`
 * writes them, see {@link nutrientsOf}: protein, carbs or fat sent as `null` is unknown, so the one of them a food
 * typed by hand lacks is worked out from its kcal like that of a product, and two or three stay empty cells, never 0;
 * its portion never empty, see {@link portionOf}; its kind as sent, `Eat` for a food by hand, which sends none.
 * A product that is one of my foods already, by its barcode or by its name, brand and store, like the same beans
 * in a bigger can, is that food, and nothing is written; a food by hand with the name, brand and store of one of mine
 * is refused.
 * - `amount`: Tells whether a value is a number of 0 or more, as kcal is to be, and every nutrient known.
 * - `pack`: Size of its pack, `null` for none.
 * - `added`: The food as written.
 * - `same`: My food it is already, `undefined` for none.
 * - `lines`: Lines of `Foods.md`.
 * - `last`: Index of the last line of its table.
 * - `header`: Index of the header of its table.
 *
 * @param sent - Food as the page sends it, a product of Open Food Facts or typed by hand
 * @returns The food as written, or my food the product is already
 * @throws {Error} - When kcal is no number of 0 or more, a nutrient neither one nor `null`, the name is empty,
 *   the barcode not only digits, a food by hand has the name, brand and store of one of mine, ignoring case,
 *   or `Foods.md` lies outside the new system or holds no table
 */
export function foodAdd(sent: Food): Food {
    const amount: (value: unknown) => boolean = (value: unknown): boolean => typeof value === "number" && value >= 0;
    if (!amount(sent.kcal)
        || ![sent.protein, sent.carbs, sent.fat].every((value: unknown): boolean => value === null || amount(value)))
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);

    const pack: number | null = amount(sent.pack) && Number(sent.pack) > 0 ? roundOf(Number(sent.pack), 1) : null;
    const added: Food = {
        name: foodTextOf(String(sent.name ?? "")),
        ...nutrientsOf({ kcal: sent.kcal, protein: sent.protein, carbs: sent.carbs, fat: sent.fat }),
        barcode: String(sent.barcode ?? "").trim(),
        brand: brandOf(String(sent.brand ?? "")),
        store: brandOf(String(sent.store ?? "")),
        pack: pack,
        portion: portionOf(amount(sent.portion) ? Number(sent.portion) : null),
        kind: kindOf(sent.kind),
    };
    if (added.name === "")
        throw new Error(`No name of a food: ${JSON.stringify(sent)}`);
    if (!/^\d*$/.test(added.barcode))
        throw new Error(`No barcode: ${added.barcode}`);
    const same: Food | undefined = foodsRead().find((mine: Food): boolean => keyOf(mine) === keyOf(added)
        || (added.barcode !== "" && mine.barcode === added.barcode));
    if (same !== undefined && added.barcode !== "")
        return same;
    if (same !== undefined)
        throw new Error(`No new food: ${labelOf(added)}`);
    if (!writeAllowed(food.foods))
        throw new Error(`No writing outside the new system: ${food.foods}`);

    const lines: string[] = existsSync(food.foods) ? readFileSync(food.foods, "utf8").split("\n") : [...fileHead, ""];
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    if (last === -1)
        throw new Error(`No table in ${food.foods}`);

    tableHeadPut(lines, header);
    lines.splice(last + 1, 0, rowOf(added));
    mkdirSync(dirname(food.foods), { recursive: true });
    writeFileSync(food.foods, lines.join("\n"));
    return added;
}

/**
 * Writes a line `X-FOOD` or a food of a meal of `Meals.md` with a food renamed, when it names that food by its name,
 * brand and store, everything after them staying as it is, like its grams and its meal; any other line as it is,
 * like one written before foods had brand and store.
 * - `parts`: Parts of the line, `null` for an older one.
 *
 * @param line - Line like `Sonnenmais zart;GUT&GÜNSTIG;Edeka;265;Chili con Carne` or `Hackfleisch;Gut & Günstig;Edeka`
 * @param old - Key of the food renamed, see {@link keyOf}
 * @param renamed - Its new name, brand and store
 * @returns The line, the food renamed where it names it
 */
function lineRenamed(line: string, old: string, renamed: { name: string; brand: string; store: string }): string {
    const parts: string[] | null = partsOf(line);
    if (parts === null || keyOf({ name: parts[0], brand: parts[1], store: parts[2] }) !== old)
        return line;
    return [renamed.name, renamed.brand, renamed.store, ...line.split(";").slice(3)].join(";");
}

/**
 * Changes a food of mine: renames it wherever it stands, its name, brand and store as typed, cleaned as those of
 * a food added, see {@link foodTextOf}, so every entry and meal still finds it: first every line `X-FOOD` of the log
 * naming it, past and to come, its grams and meal kept, and its name in the summary of each entry where it stands
 * beside the meals, like `Kren` of `Hausgemachter Salat, Kren`, every other part staying as it is, then every meal of `Meals.md` holding it, last its row of
 * `Foods.md`, every other line staying as it is, so one stopped in between finishes when sent again; with its row
 * for a food I made by hand, without barcode, its protein, carbs and fat where they are still unknown, each set once
 * and then fixed, as its kcal from the start, so nothing known is changed by mistake, and its pack; those of Open Food
 * Facts stay as they came; and the portion of any food, never empty, see {@link portionOf}, and its kind, `Eat` or
 * `Drink`. A food sent without change writes nothing.
 * - `old`: Key of the food, see {@link keyOf}.
 * - `renamed`: Its new name, brand and store, cleaned.
 * - `mine`: My foods.
 * - `found`: The food changed.
 * - `amount`: Tells whether a value is a number of 0 or more.
 * - `own`: Whether I made it by hand, so its nutrients still unknown and its pack change.
 * - `settled`: Gives a nutrient of it as written: as it is once known, else as sent for my own food.
 * - `pack`: Size of its pack as written, as sent for my own food, `null` for none.
 * - `changed`: The food as written.
 * - `meals`: My meals.
 * - `lines`: Lines of `Foods.md`.
 * - `header`: Index of the header of its table.
 * - `head`: Names of its columns.
 * - `row`: Index of the row of the food.
 *
 * @param sent - The food and what changes, as the page sends it
 * @returns The food as written
 * @throws {Error} - When `Foods.md` holds no such food, the new name is empty, another food of mine has the new name,
 *   brand and store, ignoring case, a number is none of 0 or more, a kind is none of `Eat` and `Drink`, or a file lies
 *   outside the new system
 */
export function foodChange(sent: FoodChanged): Food {
    const old: string = keyOf({
        name: String(sent.old?.name ?? ""), brand: String(sent.old?.brand ?? ""), store: String(sent.old?.store ?? ""),
    });
    const renamed: { name: string; brand: string; store: string } = {
        name: foodTextOf(String(sent.name ?? "")), brand: brandOf(String(sent.brand ?? "")),
        store: brandOf(String(sent.store ?? "")),
    };
    const mine: Food[] = foodsRead();
    const found: Food | undefined = mine.find((candidate: Food): boolean => keyOf(candidate) === old);
    if (found === undefined)
        throw new Error(`No food of mine: ${JSON.stringify(sent.old)}`);
    if (renamed.name === "" || mine.some((candidate: Food): boolean =>
        candidate !== found && keyOf(candidate) === keyOf(renamed)))
        throw new Error(`No new name of a food: ${labelOf(renamed)}`);
    const amount: (value: unknown) => boolean = (value: unknown): boolean => typeof value === "number" && value >= 0;
    const own: boolean = found.barcode === "";
    if (![sent.protein, sent.carbs, sent.fat, sent.portion, sent.pack].every((value: unknown): boolean =>
        value === undefined || value === null || amount(value)))
        throw new Error(`No numbers of a food: ${JSON.stringify(sent)}`);
    if (sent.kind !== undefined && sent.kind !== "Eat" && sent.kind !== "Drink")
        throw new Error(`No kind of a food: ${String(sent.kind)}`);
    const settled: (known: number | null, typed: number | null | undefined) => number | null =
        (known: number | null, typed: number | null | undefined): number | null =>
            known !== null || !own || typed === undefined ? known : typed;
    const pack: number | null = !own || sent.pack === undefined ? found.pack
        : sent.pack === null || sent.pack === 0 ? null : roundOf(sent.pack, 1);
    const changed: Food = {
        ...found, ...renamed,
        ...nutrientsOf({
            kcal: found.kcal, protein: settled(found.protein, sent.protein), carbs: settled(found.carbs, sent.carbs),
            fat: settled(found.fat, sent.fat),
        }),
        pack: pack,
        portion: sent.portion === undefined ? found.portion : portionOf(sent.portion),
        kind: sent.kind ?? found.kind,
    };
    if (rowOf(changed) === rowOf(found))
        return found;
    if (!writeAllowed(food.foods) || !writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.foods}`);

    entriesRead(food.log, "1970-01-01T00:00:00Z", logEnd)
        .filter((entry: Entry): boolean =>
            entry.foods.some((line: string): boolean => lineRenamed(line, old, renamed) !== line))
        .forEach((entry: Entry): void => {
            const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
            const beside: boolean = entry.foods.some((line: string): boolean => {
                const parts: string[] | null = partsOf(line);
                return parts !== null && keyOf({ name: parts[0], brand: parts[1], store: parts[2] }) === old
                    && parts[4] === "";
            });
            const properties: [string, string[]][] =
                [["x-food", entry.foods.map((line: string): string => lineRenamed(line, old, renamed))]];
            if (beside)
                properties.push(["summary", [entry.title.split(", ")
                    .map((part: string): string => part === found.name ? renamed.name : part).join(", ")]]);
            if (file !== undefined)
                propertiesPut(file, entry.id, properties);
        });
    const meals: Composition[] = compositionsRead();
    if (meals.some((meal: Composition): boolean =>
        meal.foods.some((line: string): boolean => lineRenamed(line, old, renamed) !== line)))
        compositionsWrite(meals.map((meal: Composition): Composition => ({
            ...meal, foods: meal.foods.map((line: string): string => lineRenamed(line, old, renamed)),
        })));

    const lines: string[] = readFileSync(food.foods, "utf8").split("\n");
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    tableHeadPut(lines, header);
    const head: string[] = cellsOf(lines[header]);
    const row: number = lines.findIndex((line: string, index: number): boolean => {
        const cells: { [column: string]: string | undefined } = cellsByNameOf(head, line);
        return index >= header + tableHead && line.startsWith("|")
            && keyOf({ name: cells.Food ?? "", brand: cells.Brand ?? "", store: cells.Store ?? "" }) === old;
    });
    lines[row] = rowOf(changed);
    writeFileSync(food.foods, lines.join("\n"));
    return changed;
}

/**
 * Removes a food of mine from `Foods.md`, its row only, every other line staying as it is; entries and meals that list
 * it keep their lines, which then count nothing and are named below the day's totals as foods not in `Foods.md`.
 * - `old`: Key of the food, see {@link keyOf}.
 * - `lines`: Lines of `Foods.md`.
 * - `header`: Index of the header of its table.
 * - `head`: Names of its columns.
 * - `row`: Index of the row of the food, -1 for none.
 *
 * @param sent - The food, its name, brand and store, as the page sends them
 * @throws {Error} - When `Foods.md` holds no such food, or lies outside the new system
 */
export function foodRemove(sent: { name: string; brand: string; store: string }): void {
    const old: string = keyOf({ name: sent.name, brand: sent.brand, store: sent.store });
    if (!writeAllowed(food.foods))
        throw new Error(`No writing outside the new system: ${food.foods}`);
    const lines: string[] = existsSync(food.foods) ? readFileSync(food.foods, "utf8").split("\n") : [];
    const header: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const head: string[] = cellsOf(lines[header] ?? "");
    const row: number = header === -1 ? -1 : lines.findIndex((line: string, index: number): boolean => {
        const cells: { [column: string]: string | undefined } = cellsByNameOf(head, line);
        return index >= header + tableHead && line.startsWith("|")
            && keyOf({ name: cells.Food ?? "", brand: cells.Brand ?? "", store: cells.Store ?? "" }) === old;
    });
    if (row === -1)
        throw new Error(`No food of mine: ${JSON.stringify(sent)}`);
    lines.splice(row, 1);
    writeFileSync(food.foods, lines.join("\n"));
}

/**
 * Adds up what foods or meals give, what is known: an unknown nutrient adds nothing, so a day of 20 g fat known
 * and a food whose fat is unknown has 20 g, and the food view names the food, see `src/food/food.ts`.
 *
 * @param parts - What each gives
 * @returns Their sum, 0 each for none
 */
function sumOf(parts: Nutrients[]): Totals {
    return parts.reduce((sum: Totals, part: Nutrients): Totals => ({
        kcal: sum.kcal + part.kcal, protein: sum.protein + (part.protein ?? 0), carbs: sum.carbs + (part.carbs ?? 0),
        fat: sum.fat + (part.fat ?? 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

/**
 * Turns a line `X-FOOD` of a meal into what its food gives, see {@link Eaten}, with its name, brand and store
 * as the line writes them; a line without grams gives nothing; a nutrient its food does not know stays unknown,
 * `null`, and so do all three of a food `Foods.md` does not hold.
 * - `read`: The line as read, see {@link lineOf}.
 * - `known`: The food in `Foods.md`, `undefined` when it holds none, see {@link foodOfLine}.
 * - `grams`: Grams that count, 0 for none.
 * - `share`: Share of 100 g eaten, 0 for an unknown food.
 * - `part`: What the grams eaten give of a nutrient per 100 g, `null` for one unknown.
 *
 * @param line - Line like `Skyr natur;K-Classic;Kaufland;150` or `Reis;150`
 * @param mine - My foods by their keys and names, see {@link foodsByKeyRead}
 * @returns The food with what it gives
 */
function eatenOf(line: string, mine: Map<string, Food>): Eaten {
    const read: Line = lineOf(line);
    const known: Food | undefined = foodOfLine(read, mine);
    const grams: number = read.grams ?? 0;
    const share: number = known === undefined ? 0 : grams / 100;
    const part: (per: number | null | undefined) => number | null = (per: number | null | undefined): number | null =>
        per === null || per === undefined ? null : share * per;
    return {
        name: read.name, brand: read.brand, store: read.store, grams: grams, estimate: read.guessed,
        known: known !== undefined, meal: read.meal, kind: known?.kind ?? "Eat",
        kcal: share * (known?.kcal ?? 0), protein: part(known?.protein), carbs: part(known?.carbs), fat: part(known?.fat),
    };
}

/**
 * Turns the log entry of a meal into a {@link Meal}.
 * - `foods`: Its foods with what each gives.
 *
 * @param entry - Log entry of the category `Food`
 * @param mine - My foods by their keys and names, see {@link foodsByKeyRead}
 * @returns Meal with what it gives
 */
function mealOf(entry: Entry, mine: Map<string, Food>): Meal {
    const foods: Eaten[] = entry.foods.map((line: string): Eaten => eatenOf(line, mine));
    return {
        ...sumOf(foods), id: entry.id, start: entry.start, title: entry.title, location: entry.location,
        foods: foods, estimate: foods.some((eaten: Eaten): boolean => eaten.estimate),
    };
}

/**
 * Reads the meals of a day with what they give: the log entries of the category `Food` that start on the day
 * in Berlin time, from 00:00 to 00:00, read from noon the day before to noon the day after, which holds the whole day.
 * A food counts its grams, nothing when the meal lists none, nor when `Foods.md` does not hold it.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 * - `mine`: My foods by their keys and names, see {@link foodsByKeyRead}.
 * - `meals`: Meals of the day with what they give.
 *
 * @param date - Day like `2026-10-10`
 * @returns The meals of the day with what they give together
 * @throws {Error} - When the date is not written like `2026-10-10`
 */
export function foodDayRead(date: string): FoodDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const mine: Map<string, Food> = foodsByKeyRead();
    const meals: Meal[] = mealsRead(new Date(noon - dayLength).toISOString(), new Date(noon + dayLength).toISOString())
        .filter((entry: Entry): boolean => berlinDateOf(new Date(entry.start)) === date)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Meal => mealOf(entry, mine));
    return { ...sumOf(meals), meals: meals, estimate: meals.some((meal: Meal): boolean => meal.estimate) };
}

/**
 * Gives what the meals among entries give, counted as {@link foodDayRead} counts them, for the entries of the day view:
 * each entry of the category `Food` that lists foods.
 * - `mine`: My foods by their keys and names, see {@link foodsByKeyRead}.
 *
 * @param entries - Entries, like those of a day
 * @returns {@link Meal} of each entry that is one, by the identifier of the entry
 */
export function mealsOf(entries: Entry[]): Map<string, Meal> {
    const mine: Map<string, Food> = foodsByKeyRead();
    return new Map(entries
        .filter((entry: Entry): boolean => entry.category === foodName && entry.foods.length > 0)
        .map((entry: Entry): [string, Meal] => [entry.id, mealOf(entry, mine)]));
}

/**
 * Writes the summary of a meal from its lines `X-FOOD`, as the dialog writes it, see `summaryOf` in
 * `../src/food/foods.ts`: its meals of mine, then the foods beside them, in their order, parted by `, `, drinks left
 * out, like `Pizza Salami, Pizza Margherita` of those two and a `Coca-Cola`; an entry of drinks alone names them all.
 * - `mine`: My foods by their keys and names, see {@link foodsByKeyRead}.
 * - `read`: The lines as read, see {@link lineOf}.
 * - `named`: Its meals, each `Eat`, then the foods beside them, each with the kind of its food.
 * - `eaten`: What it names but drinks.
 *
 * @param lines - Lines `X-FOOD` of the meal, like `Hackfleisch;Gut & Günstig;Edeka;250;Chili con Carne`
 * @returns Summary, empty for no lines
 */
export function mealTitleOf(lines: string[]): string {
    const mine: Map<string, Food> = foodsByKeyRead();
    const read: Line[] = lines.map(lineOf);
    const named: { name: string; kind: Kind }[] = [
        ...[...new Set(read.filter((line: Line): boolean => line.meal !== "").map((line: Line): string => line.meal))]
            .map((meal: string): { name: string; kind: Kind } => ({ name: meal, kind: "Eat" })),
        ...read.filter((line: Line): boolean => line.meal === "").map((line: Line): { name: string; kind: Kind } =>
            ({ name: line.name, kind: foodOfLine(line, mine)?.kind ?? "Eat" })),
    ];
    const eaten: { name: string; kind: Kind }[] = named.filter((part: { name: string; kind: Kind }): boolean =>
        part.kind !== "Drink");
    return (eaten.length > 0 ? eaten : named).map((part: { name: string; kind: Kind }): string => part.name).join(", ");
}

/**
 * Tells whether a line `X-FOOD` sent to be written is well formed: one of today, see {@link partsOf}, a name,
 * brand and store without `|`, like `Skyr natur;K-Classic;Kaufland;150`, grams above 0 or none, and maybe the meal
 * it belongs to; or an older one,
 * see {@link foodLine}, a name without `;` and `|`, then grams above 0 when given, like `Reis;150` or `Eier`,
 * and for a food of a meal the meal, servings above 0 and maybe its variant, like `Hackfleisch;62.5;Chili con Carne;0.5`.
 * Whether `Foods.md` holds the food is not asked, so a meal keeps a food that left `Foods.md` when it is moved.
 * - `read`: The line as read, see {@link lineOf}.
 * - `parts`: A line of today cut into its five parts, `null` for an older one.
 * - `old`: An older line cut into its parts, `null` when it is none.
 *
 * @param line - Line as the page sends it
 * @returns Whether the line may be written
 */
export function foodLineAllows(line: string): boolean {
    const read: Line = lineOf(line);
    const parts: string[] | null = partsOf(line);
    if (parts !== null)
        return read.name !== "" && !parts.some((part: string): boolean => part.includes("|"))
            && (read.grams === null || read.grams > 0);
    const old: RegExpExecArray | null = foodLine.exec(line.trim());
    return old !== null && read.name !== "" && !/[;|]/.test(read.name) && (read.grams === null || read.grams > 0)
        && (old[5] === undefined || numberOf(old[5]) > 0);
}

/**
 * Writes the name of a meal as typed, its spaces too, cleaned as the name of a food, see {@link foodTextOf}, so no
 * comma parts it in a summary and spaces in a row are one, like `Chili con Carne` of `Chili con  Carne,`.
 *
 * @param typed - Name as typed
 * @returns Name of the meal
 */
function mealNameOf(typed: string): string {
    return foodTextOf(typed);
}

/**
 * Reads my meals of `Meals.md` as it holds them, see {@link Composition}: a section per meal from its heading `###`,
 * its name, the line below it its short title when it is no row, then a row per food of its table, each food in its
 * order, see {@link mealHead}.
 * - `lines`: Lines of a section, its name first.
 * - `rows`: Rows of its table after its head.
 *
 * @returns My meals in the order of their sections, none while `Meals.md` does not exist
 */
export function compositionsRead(): Composition[] {
    if (!existsSync(food.meals))
        return [];

    return readFileSync(food.meals, "utf8").split(/^### /m).slice(1).map((section: string): Composition => {
        const lines: string[] = section.trim().split("\n");
        const rows: string[][] = lines.filter((line: string): boolean => line.startsWith("|")).slice(tableHead)
            .map(cellsOf);
        return {
            name: lines[0].trim(),
            short: lines[1]?.startsWith("|") === false ? lines[1].trim() : "",
            foods: rows.map((cells: string[]): string => cells.slice(0, 3).join(";")),
            standard: rows.map((cells: string[]): number | null => nutrientOf(cells[3] ?? "")),
        };
    });
}

/**
 * Reads my meals of `Meals.md`, each with what its foods give at their standard grams and the portion and kind of
 * each, see {@link Dish}.
 * - `mine`: My foods by their keys and names, see {@link foodsByKeyRead}.
 *
 * @returns My meals in the order of their sections, none while `Meals.md` does not exist
 */
export function dishesRead(): Dish[] {
    const mine: Map<string, Food> = foodsByKeyRead();
    return compositionsRead().map((meal: Composition): Dish => ({
        ...meal,
        kcal: meal.standard.every((grams: number | null): boolean => grams === null) ? null
            : meal.foods.reduce((sum: number, line: string, index: number): number =>
                sum + (meal.standard[index] ?? 0) / 100 * (foodOfLine(lineOf(line), mine)?.kcal ?? 0), 0),
        portions: meal.foods.map((line: string): number | null => foodOfLine(lineOf(line), mine)?.portion ?? null),
        kinds: meal.foods.map((line: string): Kind => foodOfLine(lineOf(line), mine)?.kind ?? "Eat"),
    }));
}

/**
 * Writes my meals into `Meals.md` anew, its title first, then a section per meal: its name as heading `###`,
 * its short title below unless empty, then its table, see {@link mealHead}, a row per food, its standard grams whole
 * or to one decimal, empty where none is set; an empty line only before the next heading.
 * - `sections`: Lines of the section of each meal.
 *
 * @param meals - My meals to write, in their order
 */
function compositionsWrite(meals: Composition[]): void {
    const sections: string[][] = meals.map((meal: Composition): string[] => [
        `### ${meal.name}`,
        ...meal.short === "" ? [] : [meal.short],
        ...mealHead,
        ...meal.foods.map((line: string, index: number): string => {
            const read: Line = lineOf(line);
            const grams: number | null = meal.standard[index] ?? null;
            return `| ${read.name} | ${read.brand} | ${read.store} | ${grams === null ? "" : roundOf(grams, 1)} |`;
        }),
    ]);
    mkdirSync(dirname(food.meals), { recursive: true });
    writeFileSync(food.meals, ["# Meals", ...sections.flatMap((section: string[], index: number): string[] =>
        index === 0 ? section : ["", ...section]), ""].join("\n"));
}

/**
 * Writes a meal into `Meals.md`, new or changed for good, its foods in place of those it had, at its place,
 * a new meal last; the name as typed, see {@link mealNameOf}, each food by its name, brand and store as `Foods.md`
 * holds them, cleaned only for a table, see {@link nameOf}, each once; its short title and the standard grams of its
 * foods as sent, else as the meal had them, a food new to it without; its foods ordered by their standard grams,
 * the most first, those without grams after them and those at 0 last, so the order needs no hand, see {@link rankOf}.
 * - `ranked`: Its foods with their standard grams in that order.
 * - `meals`: My meals so far.
 * - `name`: Name of the meal, as a meal of mine of the name, ignoring case, already writes it.
 * - `foods`: Its foods, like `Hackfleisch;Gut & Günstig;Edeka`.
 * - `before`: The meal as it was, `undefined` for a new one.
 * - `standard`: Standard grams of its foods.
 *
 * @param sent - Name and foods as the page sends them, and its short title and the standard grams of its foods,
 *   in their order, where they change
 * @returns All my meals, each with what it gives, see {@link dishesRead}
 * @throws {Error} - When the name is empty, it holds no food, or `Meals.md` lies outside the new system
 */
export function dishAdd(sent: { name?: string; foods?: string[]; short?: string; grams?: (number | null)[] }):
    Dish[] {
    const meals: Composition[] = compositionsRead();
    const typed: string = mealNameOf(String(sent.name ?? ""));
    const name: string = meals.find((meal: Composition): boolean => meal.name.toLowerCase() === typed.toLowerCase())
        ?.name ?? typed;
    const foods: string[] = [...new Set((sent.foods ?? []).map((line: string): string => {
        const read: Line = lineOf(String(line));
        return [read.name, read.brand, read.store].map(nameOf).join(";");
    }))].filter((line: string): boolean => !line.startsWith(";"));
    if (name === "")
        throw new Error("No name of a meal");
    if (foods.length === 0)
        throw new Error(`No foods of a meal: ${JSON.stringify(sent.foods)}`);
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);

    const at: number = meals.findIndex((meal: Composition): boolean => meal.name.toLowerCase() === name.toLowerCase());
    const before: Composition | undefined = meals[at];
    const standard: (number | null)[] = foods.map((line: string, index: number): number | null =>
        sent.grams !== undefined ? nutrientOf(sent.grams[index])
            : before?.standard[before.foods.indexOf(line)] ?? null);
    const ranked: [string, number | null][] = foods.map((line: string, index: number): [string, number | null] =>
        [line, standard[index]]).sort((first: [string, number | null], second: [string, number | null]): number =>
        rankOf(second[1]) - rankOf(first[1]));
    const meal: Composition = {
        name: name, short: sent.short === undefined ? before?.short ?? "" : nameOf(String(sent.short)),
        foods: ranked.map(([line]: [string, number | null]): string => line),
        standard: ranked.map(([, grams]: [string, number | null]): number | null => grams),
    };
    compositionsWrite(at === -1 ? [...meals, meal]
        : meals.map((other: Composition, index: number): Composition => index === at ? meal : other));
    return dishesRead();
}

/**
 * Ranks a food of a meal by its standard grams, see {@link dishAdd}: the grams themselves, a food without grams below
 * every one with grams, one at 0, which I rarely put in, below all.
 *
 * @param grams - Its standard grams, `null` for none set
 * @returns Its rank, the higher the earlier
 */
function rankOf(grams: number | null): number {
    return grams === null ? -1 : grams === 0 ? -2 : grams;
}

/**
 * Renames a meal of mine wherever it stands, so every entry still shows it under its new name: first, in every entry
 * of the log that holds it, past and to come, the meal of its lines `X-FOOD`, like `Chili con Carne` of
 * `Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne`, and its name in the summary, every other part of the summary
 * staying as it is; then its section of `Meals.md`, every other line staying as it is, so one stopped in between
 * finishes when sent again. A name sent without change writes nothing.
 * - `meals`: My meals.
 * - `found`: The meal renamed.
 * - `typed`: Its new name, see {@link mealNameOf}.
 * - `same`: Whether a name is the old one, ignoring case.
 *
 * @param sent - The old name of the meal and its new one, as the page sends them
 * @returns All my meals after, each with what it gave, see {@link dishesRead}
 * @throws {Error} - When `Meals.md` holds no such meal, the new name is empty or that of another meal of mine,
 *   ignoring case, or a file lies outside the new system
 */
export function dishRename(sent: { old?: string; name?: string }): Dish[] {
    const meals: Composition[] = compositionsRead();
    const same: (name: string) => boolean = (name: string): boolean =>
        name.trim().toLowerCase() === String(sent.old ?? "").trim().toLowerCase();
    const found: Composition | undefined = meals.find((meal: Composition): boolean => same(meal.name));
    const typed: string = mealNameOf(String(sent.name ?? ""));
    if (found === undefined)
        throw new Error(`No meal of mine: ${String(sent.old)}`);
    if (typed === "" || meals.some((meal: Composition): boolean =>
        meal !== found && meal.name.toLowerCase() === typed.toLowerCase()))
        throw new Error(`No new name of a meal: ${typed}`);
    if (typed === found.name)
        return dishesRead();
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);

    entriesRead(food.log, "1970-01-01T00:00:00Z", logEnd)
        .filter((entry: Entry): boolean => entry.foods.some((line: string): boolean => same(line.split(";")[4] ?? "")))
        .forEach((entry: Entry): void => {
            const file: string | undefined = entryLookup(food.log, entry.id)?.[0];
            if (file === undefined)
                return;
            propertiesPut(file, entry.id, [
                ["x-food", entry.foods.map((line: string): string => {
                    const parts: string[] = line.split(";");
                    return parts.length > 4 && same(parts[4]) ? [...parts.slice(0, 4), typed].join(";") : line;
                })],
                ["summary", [entry.title.split(", ")
                    .map((part: string): string => same(part) ? typed : part).join(", ")]],
            ]);
        });
    compositionsWrite(meals.map((meal: Composition): Composition =>
        meal === found ? { ...meal, name: typed } : meal));
    return dishesRead();
}

/**
 * Removes a meal from `Meals.md`, ignoring case, every other meal staying as it is.
 *
 * @param name - Name of the meal
 * @returns All my meals left, each with what it gave, see {@link dishesRead}
 * @throws {Error} - When `Meals.md` lies outside the new system
 */
export function dishRemove(name: string): Dish[] {
    if (!existsSync(food.meals))
        return [];
    if (!writeAllowed(food.meals))
        throw new Error(`No writing outside the new system: ${food.meals}`);
    compositionsWrite(compositionsRead().filter((meal: Composition): boolean =>
        meal.name.toLowerCase() !== name.trim().toLowerCase()));
    return dishesRead();
}
