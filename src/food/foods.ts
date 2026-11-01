/**
 * ## Foods
 *
 * Talks to the reader about foods: finds them, mine first, then on Open Food Facts,
 * sends, changes and removes my foods of `Foods.md` and my meals of `Meals.md`,
 * and loads the meals of a day with what they give.
 * Writes amounts as the page shows them and makes the elements and buttons
 * for the food view and the entry by category of the day alike.
 */

import { readerAsk } from "../reader.ts";
import { plusPut } from "../icons.ts";
import type { Food, FoodDay, FoodsFound, Kind } from "../../reader/food.ts";

/**
 * What changes of a food of mine, as typed, see {@link foodChange}:
 * a nutrient per 100 g `null` for unknown, and the portion `null` for none,
 * which the reader fills with 100, never with its pack.
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
 * A meal of mine, as the reader sends it from `Meals.md`:
 * one list of every food I may put in, never variants.
 *
 * - `short`: What its brackets show, as I typed it, empty for no brackets.
 * - `foods`: Its foods by name, brand and store parted by `;`.
 * - `standard`: The grams of each food an entry starts with:
 *   0 for one I rarely put in, `null` for none set yet.
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

/**
 * Gives the unit of the amounts of a food by its kind, `ml` for a drink.
 */
export function unitOf(kind: Kind): string {
    return kind === "Drink" ? "ml" : "g";
}

/**
 * Writes the summary of a meal of the log from its meals of mine and foods,
 * drinks left out, so it does not fill up,
 * an entry of drinks alone names them all, so no summary stays empty.
 */
export function summaryOf(named: { name: string; kind: Kind }[]): string {
    const eaten: { name: string; kind: Kind }[] = named.filter(
        (part: { name: string; kind: Kind }): boolean => part.kind !== "Drink",
    );
    return (eaten.length > 0 ? eaten : named).map((part: { name: string; kind: Kind }): string => part.name).join(", ");
}

/**
 * Reads portions typed into the grams of a food by the grams of its portion:
 * `2x` of oil of 30 g gives 60, `x` alone one portion,
 * and `2 St`, `2 Stk` and `2 Stück` alike.
 * `null` for a text that names no portions or a food without portion.
 */
export function portionGramsOf(text: string, portion: number | null): number | null {
    const typed: RegExpExecArray | null = /^(\d+(?:[.,]\d+)?)?\s*(st|stk|stück|x)\.?$/i.exec(text.trim());
    return typed === null || portion === null ? null : Number((typed[1] ?? "1").replace(",", ".")) * portion;
}

/**
 * Finds foods by a name or a barcode: my foods first, then,
 * with `products`, a page of Open Food Facts, not for a meal of mine.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function foodsFind(query: string, page: number, products: boolean): Promise<FoodsFound> {
    return readerAsk<FoodsFound>(
        `/api/food/search?q=${encodeURIComponent(query)}&page=${page}` + `&products=${products ? 1 : 0}`,
    );
}

/**
 * Loads my meals of `Meals.md` from the reader, in the order of the file.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function dishesLoad(): Promise<Dish[]> {
    return readerAsk<Dish[]>("/api/food/meals");
}

/**
 * Sends a meal to the reader, new or changed for good, which writes it into `Meals.md`,
 * gives all my meals after.
 *
 * @throws {Error} - When the reader does not take the meal, like one without name or food
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
 * @throws {Error} - When the reader does not take the name,
 *   like an empty one or that of another meal of mine
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
 * Sends a new food to the reader, which adds it to `Foods.md`
 * and gives it as written, its name cleaned and its numbers rounded.
 * For a product that is one of my foods already, like the same beans in a bigger can,
 * it gives that food.
 *
 * @throws {Error} - When the reader does not take the food,
 *   like a food by hand with the name, brand and store of one of mine
 */
export async function foodSend(food: Food): Promise<Food> {
    return readerAsk<Food>("/api/food/foods", {
        method: "POST",
        body: JSON.stringify(food),
    });
}

/**
 * Removes a food of mine from `Foods.md`,
 * entries and meals listing it keep their lines.
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
 * Changes a food of mine, renaming it in `Foods.md`, my meals and every entry naming it,
 * and its values in `Foods.md`.
 *
 * @throws {Error} - When the reader does not take it,
 *   like for an empty name or one another food of mine has with that brand and store
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
 * Loads the meals of a day with what they give from the reader.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function foodDayLoad(day: string): Promise<FoodDay> {
    return readerAsk<FoodDay>(`/api/food/day?date=${day}`);
}

/**
 * Writes an amount with a point between thousands and before the decimals,
 * always as many decimals as asked, so a number keeps its width as it changes.
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

/**
 * Writes kcal whole with their unit,
 * 0 while none are known, like burned without my weight.
 */
export function kcalTextOf(kcal: number | null): string {
    return `${amountOf(kcal ?? 0, 0)} kcal`;
}

/**
 * Writes the key of a food, by which a line `X-FOOD` finds it, as the reader does.
 */
export function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

/**
 * Makes an element with a class and a text, each empty for none.
 */
export function elementOf(tag: string, className: string, text: string): HTMLElement {
    const element: HTMLElement = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

/**
 * Makes the name of a food, the same wherever it stands,
 * its brand and store grey in brackets, since they only tell which one it is,
 * never cut, on a line of their own where one name of the list has no room,
 * see {@link bracketsWatch}.
 */
export function foodNameOf(className: string, name: string, brand: string, store: string): HTMLElement {
    const shown: HTMLElement = elementOf("span", className, name);
    const place: string[] = [brand, store].filter((part: string): boolean => part !== "");
    if (place.length > 0) shown.append(elementOf("span", "food-brand", ` (${place.join(", ")})`));
    return shown;
}

/**
 * Keeps the brackets after the names of a list alike:
 * all on the line of their name while every one fits there,
 * else every one below its name, never one here and one there,
 * looked at again whenever the list changes or gets narrower or wider.
 * A bracket hidden, like the brand of a food of a meal on a phone, counts as fitting.
 * A list watched inside another keeps its own brackets.
 * - `width`: Width when last looked at, so a change of its height alone looks at nothing.
 */
export function bracketsWatch(list: HTMLElement): void {
    let width: number = -1;
    list.dataset.brackets = "";
    const fits: (bracket: HTMLElement) => boolean = (bracket: HTMLElement): boolean => {
        const parts: DOMRectList = bracket.getClientRects();
        const name: Node | null = bracket.parentElement?.firstChild ?? null;
        if (parts.length === 0 || name === null || name.nodeType !== Node.TEXT_NODE) return true;
        const range: Range = document.createRange();
        range.selectNodeContents(name);
        const first: DOMRect | undefined = range.getClientRects()[0];
        return first === undefined || parts[parts.length - 1].bottom <= first.bottom + 1;
    };
    const look: () => void = (): void => {
        const brackets: HTMLElement[] = [...list.querySelectorAll<HTMLElement>(".food-brand")].filter(
            (bracket: HTMLElement): boolean => bracket.parentElement?.closest("[data-brackets]") === list,
        );
        brackets.forEach((bracket: HTMLElement): void => bracket.classList.remove("bracket-below"));
        const below: boolean = !brackets.every(fits);
        brackets.forEach((bracket: HTMLElement): void => {
            bracket.classList.toggle("bracket-below", below);
        });
    };
    new ResizeObserver((entries: ResizeObserverEntry[]): void => {
        const now: number = entries[0]?.contentRect.width ?? width;
        if (now === width) return;
        width = now;
        look();
    }).observe(list);
    new MutationObserver(look).observe(list, { childList: true, subtree: true });
}

/**
 * Makes a button that does not send a form, also inside one.
 */
export function buttonOf(className: string, text: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", click);
    return button;
}

/**
 * Makes the one plus of every list that adds one more, see `plusPut` in `../icons.ts`.
 */
export function plusOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    plusPut(button, words);
    return button;
}
