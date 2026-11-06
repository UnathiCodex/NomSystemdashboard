/**
 * ## Foods
 *
 * Talks to the reader about my foods of `Foods.md`, my meals of `Meals.md` and the meals of a day.
 * Writes amounts and makes the elements and buttons alike for the food view and the entry of the day.
 */

import { readerAsk } from "../reader.ts";
import { plusPut, tileNameOf } from "../icons.ts";
import type { Food, FoodDay, FoodsFound, Kind } from "../../reader/food.ts";

/**
 * What changes of a food of mine, a nutrient per 100 g `null` for unknown.
 * The portion `null` for none, which the reader fills with 100, never with its pack.
 */
export type FoodChanges = {
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
 * A meal of mine, one list of every food I may put in, never variants.
 *
 * - `short`: What its brackets show, empty for no brackets.
 * - `foods`: Its foods by name, brand and store parted by `;`.
 * - `standard`: The grams of each food an entry starts with, 0 for one I rarely put in, `null` for none set.
 * - `kcal`: What its foods give at those grams, `null` while none has grams.
 * - `portions`: The grams of the portion of each food, so its grams take `2x`.
 * - `kinds`: `Eat` for a food `Foods.md` does not hold.
 */
export type Dish = {
    name: string;
    short: string;
    foods: string[];
    standard: (number | null)[];
    kcal: number | null;
    portions: (number | null)[];
    kinds: Kind[];
};

/** The unit of the amounts of a food by its kind. */
export function unitOf(kind: Kind): string {
    return kind === "Drink" ? "ml" : "g";
}

/**
 * The summary of a meal of the log from its meals and foods, drinks left out, so it does not fill up.
 * An entry of drinks alone names them all, so no summary stays empty.
 */
export function summaryOf(named: { name: string; kind: Kind }[]): string {
    const eaten: typeof named = named.filter((part: (typeof named)[number]): boolean => part.kind !== "Drink");
    return (eaten.length > 0 ? eaten : named).map((part: (typeof named)[number]): string => part.name).join(", ");
}

/**
 * Reads portions typed, like `2x` or `2 Stück`, into grams by the portion of a food, `x` alone one portion.
 * `null` for a text that names no portions or a food without portion.
 */
export function portionGramsOf(text: string, portion: number | null): number | null {
    const typed: RegExpExecArray | null = /^(\d+(?:[.,]\d+)?)?\s*(st|stk|stück|x)\.?$/i.exec(text.trim());
    return typed === null || portion === null ? null : Number((typed[1] ?? "1").replace(",", ".")) * portion;
}

/**
 * Finds foods by a name or a barcode, my foods first, then with `products` a page of Open Food Facts.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function foodsFind(query: string, page: number, products: boolean): Promise<FoodsFound> {
    return readerAsk<FoodsFound>(
        `/api/food/search?q=${encodeURIComponent(query)}&page=${page}` + `&products=${products ? 1 : 0}`,
    );
}

/**
 * Loads my meals in the order of `Meals.md`.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function dishesLoad(): Promise<Dish[]> {
    return readerAsk<Dish[]>("/api/food/meals");
}

/**
 * Sends a meal, new or changed, into `Meals.md`, and gives all my meals after.
 *
 * @throws {Error} - When the reader does not take the meal
 */
export async function dishSend(
    name: string,
    foods: string[],
    short?: string,
    grams?: (number | null)[],
): Promise<Dish[]> {
    return readerAsk<Dish[]>("/api/food/meals", {
        method: "POST",
        body: JSON.stringify({ name: name, foods: foods, short: short, grams: grams }),
    });
}

/**
 * Renames a meal in `Meals.md` and in every entry that holds it.
 *
 * @throws {Error} - When the reader does not take the name
 */
export async function dishRename(old: string, name: string): Promise<Dish[]> {
    return readerAsk<Dish[]>("/api/food/meals", {
        method: "PATCH",
        body: JSON.stringify({ old: old, name: name }),
    });
}

/**
 * Removes a meal from `Meals.md`.
 *
 * @throws {Error} - When the reader does not remove the meal
 */
export async function dishDelete(name: string): Promise<Dish[]> {
    return readerAsk<Dish[]>(`/api/food/meals?meal=${encodeURIComponent(name)}`, {
        method: "DELETE",
    });
}

/**
 * Adds a new food to `Foods.md` and gives it as written, its name cleaned and its numbers rounded.
 * For a product that is one of my foods already, like the same beans in a bigger can, it gives that food.
 *
 * @throws {Error} - When the reader does not take the food
 */
export async function foodSend(food: Food): Promise<Food> {
    return readerAsk<Food>("/api/food/foods", {
        method: "POST",
        body: JSON.stringify(food),
    });
}

/**
 * Removes a food of mine from `Foods.md`, entries and meals listing it keep their lines.
 *
 * @throws {Error} - When the reader does not remove it
 */
export async function foodDelete(food: Food): Promise<void> {
    const query: URLSearchParams = new URLSearchParams({
        name: food.name,
        brand: food.brand,
        store: food.store,
    });
    await readerAsk<null>(`/api/food/foods?${query}`, { method: "DELETE" });
}

/**
 * Changes a food of mine, a new name also in my meals and every entry naming it.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function foodChange(food: Food, changes: FoodChanges): Promise<Food> {
    return readerAsk<Food>("/api/food/foods", {
        method: "PATCH",
        body: JSON.stringify({
            old: { name: food.name, brand: food.brand, store: food.store },
            ...changes,
        }),
    });
}

/**
 * Loads the meals of a day with what they give.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function foodDayLoad(day: string): Promise<FoodDay> {
    return readerAsk<FoodDay>(`/api/food/day?date=${day}`);
}

/**
 * Writes an amount with a point between thousands, always as many decimals as asked, so it keeps its width.
 * An unknown amount as nothing, no dash and no `?`, so it never reads as 0.
 * English writes the thousands with a comma, its only comma, which becomes the point.
 */
export function amountOf(value: number | null, digits: number): string {
    return value === null
        ? ""
        : value
              .toLocaleString("en-GB", {
                  minimumFractionDigits: digits,
                  maximumFractionDigits: digits,
              })
              .replaceAll(",", ".");
}

/** Writes kcal whole with their unit, 0 while none are known. */
export function kcalTextOf(kcal: number | null): string {
    return `${amountOf(kcal ?? 0, 0)} kcal`;
}

/** The key by which a line `X-FOOD` finds a food, as the reader writes it. */
export function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

export function elementOf(tag: string, className: string, text: string): HTMLElement {
    const element: HTMLElement = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

/** The heading of a list, its name, its plus and the unit of its numbers, so no head inside the list repeats it. */
export function headingOf(name: string, plus: HTMLButtonElement, unit: string): HTMLElement {
    const heading: HTMLElement = elementOf("h2", "food-heading", name);
    heading.append(plus);
    if (unit !== "") heading.append(elementOf("span", "food-unit", `(${unit})`));
    return heading;
}

/** A total of a day in the bar, as a tile of the trackers of the day view. */
export function totalOf(name: string, value: string | HTMLElement): HTMLElement {
    const tile: HTMLElement = elementOf("div", "tracker-row", "");
    const shown: HTMLElement = elementOf("span", "tracker-value", "");
    shown.append(value);
    tile.append(tileNameOf(name), shown);
    return tile;
}

/** Name of a line in a list on one line, grey brackets after it, both whole as its tooltip. */
export function lineNameOf(text: string, brackets: string): HTMLElement {
    const name: HTMLElement = elementOf("span", "food-name", "");
    name.title = brackets === "" ? text : `${text} (${brackets})`;
    name.append(elementOf("span", "", text));
    if (brackets !== "") name.append(elementOf("span", "food-brand", ` (${brackets})`));
    return name;
}

/**
 * The name of a food with its brand and store grey in brackets.
 * They only tell which one it is.
 */
export function foodNameOf(name: string, brand: string, store: string): HTMLElement {
    return lineNameOf(name, [brand, store].filter((part: string): boolean => part !== "").join(", "));
}

/** A button that does not send a form, also inside one. */
export function buttonOf(className: string, text: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", click);
    return button;
}

/** The name of a part in a panel as a link that opens the part itself. */
export function partLinkOf(name: string, shown: HTMLElement, open: () => void): HTMLButtonElement {
    const link: HTMLButtonElement = buttonOf("food-link", "", open);
    link.append(shown);
    link.title = `Open ${name}`;
    return link;
}

export function plusOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    plusPut(button, words);
    return button;
}
