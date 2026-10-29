/**
 * ## Foods
 *
 * Finds foods through the reader, mine first,
 * then on Open Food Facts, page by page, sends new foods to `Foods.md` and renames them,
 * loads my meals of `Meals.md`,
 * sends new and changed ones and removes them, loads the meals of a day with what they give,
 * writes amounts as the page shows them,
 * and makes the elements and buttons of both,
 * the names of foods with their brackets kept alike in a list:
 * for the food view and the entry by category of the day alike.
 *
 * - `../reader.ts`: Asks the reader.
 */

import { readerAsk } from "../reader.ts";

/**
 * Energy and nutrients of 100 g of a food, or of what one food of a meal gave,
 * as the reader sends them, as far as they are known:
 * kcal always, protein, carbs and fat `null` where unknown, never 0, see `reader/food.ts`.
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
 * What meals gave together, as the reader sends it, each the sum of what is known.
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
 * Kind of a food, as the reader sends it: `Eat`, its values per 100 g and its amounts in grams,
 * or `Drink`, its values per 100 ml and its amounts in millilitres, see {@link unitOf}.
 */
export type Kind = "Eat" | "Drink";

/**
 * A food, one row of `Foods.md`, or a product of Open Food Facts as it would go there:
 * its {@link Nutrients} per 100 of its unit with its name, barcode, brand, store, pack and kind.
 *
 * - `name`: Name, by which a meal lists it, like `Reis` of `X-FOOD:Reis;Golden Sun;Lidl;150`.
 * - `barcode`: Open Food Facts barcode it came from, empty for a food added by hand.
 * - `brand`: Its first brand, like `Milbona`, empty when none is known.
 * - `store`: The first store that sells it, like `Lidl`, empty when none is known.
 * - `pack`: Size of its pack as sold in its unit, like 450, `null` when none is known.
 * - `portion`: Amount in its unit I typically take at once, like 50 of a Semmel, one piece,
 *   or 30 of oil, two tablespoons, so an entry takes `2x` or `2 St` as twice that;
 *   `null` only in a row left empty by hand.
 * - `kind`: Its kind, `Eat` or `Drink`.
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
 * What changes of a food of mine, as typed, see {@link foodChange}:
 * its name, brand and store always;
 * for a food I made by hand a nutrient per 100 g still unknown, which once known stays,
 * and its pack; the portion of any food, `null` for none,
 * which the reader fills with 100, never with its pack; and its kind.
 */
export type FoodChanges = {
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
 * A product of Open Food Facts as a search sends it:
 * a {@link Food}, its kcal `null` where Open Food Facts does not know them,
 * like `Zwiebeln` of Edeka, so it still shows and I type its kcal from the pack, see `./search.ts`.
 */
export type Product = Omit<Food, "kcal"> & {
    kcal: number | null;
};

/**
 * What a search finds, as the reader sends it.
 *
 * - `foods`: My foods found, the most eaten first; all of them for an empty search; of every brand.
 * - `products`: Products of Open Food Facts on the page asked for that are not among my foods,
 *   each as it would go into `Foods.md`, its kcal `null` where unknown, the best match first;
 *   none for a search of only a few letters or of my foods only;
 *   `null` when Open Food Facts cannot be reached.
 * - `total`: Number of products of Open Food Facts the search matches;
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
 * A food of a meal with what it gives,
 * as the reader sends it, a nutrient its food does not know unknown too.
 *
 * - `name`: Name of the food, as the meal lists it, like `Skyr natur`.
 * - `brand`, `store`: Its brand and the store I bought it in, like `K-Classic` and `Kaufland`;
 *   empty where the line names none.
 * - `grams`: Grams eaten as the meal lists them, millilitres of a drink,
 *   0 for none, which count nothing.
 * - `estimate`: Whether the grams are guessed, marked by `~`.
 * - `known`: Whether `Foods.md` holds the food; an unknown food gives nothing.
 * - `meal`: The meal of mine it belongs to in this entry, like `Chili con Carne`;
 *   empty for a food eaten by itself.
 * - `kind`: Kind of its food, `Eat` for one `Foods.md` does not hold.
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
 * A meal, a log entry of the category `Food`, with what it gives, as the reader sends it.
 *
 * - `id`: Identifier of the entry.
 * - `start`: Start as ISO instant.
 * - `title`: What I ate, like `Reis-Bohnen-Eier`.
 * - `location`: Where, like `Home Munich`, empty when it has none.
 * - `foods`: Its foods with what each gives, none when it lists none.
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
 * A meal of mine, as the reader sends it from `Meals.md`:
 * one list of every food I may put in, never variants,
 * each with the grams I put in as a rule, and what they give.
 *
 * - `name`: Name of the meal, like `Chili con Carne`.
 * - `short`: What its brackets show, as I typed it,
 *   like `Hackfleisch, Tomaten`; empty for no brackets.
 * - `foods`: Its foods by name, brand and store parted by `;`,
 *   like `Hackfleisch;Gut & Günstig;Edeka`, in their order.
 * - `standard`: The grams of each food, in their order, which an entry starts with:
 *   0 for one I rarely put in, `null` for none set yet.
 * - `kcal`: What its foods give at those grams; `null` while none has grams.
 * - `portions`: The grams of the portion of each food, in their order,
 *   so its grams take `2x`; `null` for none.
 * - `kinds`: The kind of each food, in their order, `Eat` for one `Foods.md` does not hold.
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
 * Gives the unit of the amounts of a food by its kind: `g` for a food to eat, `ml` for a drink,
 * like `330 ml` of a Coca-Cola, wherever the page shows or asks for an amount of it.
 *
 * @param kind - Kind of the food
 * @returns `g` or `ml`
 */
export function unitOf(kind: Kind): string {
    return kind === "Drink" ? "ml" : "g";
}

/**
 * Writes the summary of a meal of the log from what it names,
 * its meals of mine and the foods beside them, in their order, parted by `, `, drinks left out,
 * so it does not fill up, like `Pizza Salami, Pizza Margherita` of those two and a `Coca-Cola`;
 * an entry of drinks alone names them all, so no summary stays empty.
 * - `eaten`: What it names but drinks.
 *
 * @param named - Its meals of mine, each `Eat`,
 *   and the foods beside them, each with the kind of its food
 * @returns Summary, empty while nothing is named
 */
export function summaryOf(named: { name: string; kind: Kind }[]): string {
    const eaten: { name: string; kind: Kind }[] = named.filter(
        (part: { name: string; kind: Kind }): boolean => part.kind !== "Drink",
    );
    return (eaten.length > 0 ? eaten : named)
        .map((part: { name: string; kind: Kind }): string => part.name)
        .join(", ");
}

/**
 * Reads portions typed into the grams of a food, by the grams of its portion I keep with the food,
 * see `portion` of {@link Food}: `2x` of oil of 30 g gives 60, `x` alone one portion,
 * and `2 St`, `2 Stk` and `2 Stück` alike, as for a Semmel of 50 g.
 * - `typed`: The number of portions typed and their word, `null` for no portions.
 *
 * @param text - Grams or portions as typed, like `2x`
 * @param portion - Grams of the portion of the food, `null` for none kept
 * @returns Grams, like 60, `null` for a text that names no portions or a food without portion
 */
export function portionGramsOf(text: string, portion: number | null): number | null {
    const typed: RegExpExecArray | null = /^(\d+(?:[.,]\d+)?)?\s*(st|stk|stück|x)\.?$/i.exec(
        text.trim(),
    );
    return typed === null || portion === null
        ? null
        : Number((typed[1] ?? "1").replace(",", ".")) * portion;
}

/**
 * The meals of a day with what they give together, as the reader sends them.
 *
 * - `meals`: Meals of the day, in the order of their starts.
 * - `estimate`: Whether a food of a meal counts grams guessed.
 */
export type FoodDay = Totals & {
    meals: Meal[];
    estimate: boolean;
};

/**
 * Finds foods by a name or a barcode: my foods first, then,
 * where asked, a page of the products of Open Food Facts.
 *
 * @param query - Search as typed, like `ric` or `20112745`; empty for all my foods
 * @param page - Page of the products, 1 for the first
 * @param products - Whether Open Food Facts is asked too;
 *   not for a meal of mine, which takes only my foods
 * @returns Foods found
 * @throws {Error} - When the reader cannot answer
 */
export async function foodsFind(
    query: string,
    page: number,
    products: boolean,
): Promise<FoodsFound> {
    return readerAsk<FoodsFound>(
        `/api/food/search?q=${encodeURIComponent(query)}&page=${page}&products=${products ? 1 : 0}`,
    );
}

/**
 * Loads my meals of `Meals.md` from the reader, in the order of the file.
 *
 * @returns My meals, each with its foods and what it gave
 * @throws {Error} - When the reader cannot answer
 */
export async function dishesLoad(): Promise<Dish[]> {
    return readerAsk<Dish[]>("/api/food/meals");
}

/**
 * Sends a meal to the reader, new or changed for good, which writes it into `Meals.md`;
 * the name keeps its spaces, like `Chili con Carne`, the reader only taking its commas.
 *
 * @param name - Name of the meal
 * @param foods - Its foods by name, brand and store, like `Hackfleisch;Gut & Günstig;Edeka`
 * @returns All my meals after
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
 * Renames a meal through the reader wherever it stands,
 * in `Meals.md` and in every entry that holds it.
 *
 * @param old - Name of the meal
 * @param name - Its new name as typed
 * @returns All my meals after
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
 * Removes a meal through the reader from `Meals.md`.
 *
 * @param name - Name of the meal
 * @returns All my meals after
 * @throws {Error} - When the reader does not remove the meal
 */
export async function dishDelete(name: string): Promise<Dish[]> {
    return readerAsk<Dish[]>(`/api/food/meals?meal=${encodeURIComponent(name)}`, {
        method: "DELETE",
    });
}

/**
 * Sends a new food to the reader, which adds it to `Foods.md`:
 * a product of Open Food Facts as it gives it, or a food typed by hand.
 *
 * @param food - Food to add
 * @returns The food as the reader wrote it, its name cleaned and its numbers rounded;
 *   for a product that is one of my foods already, like the same beans in a bigger can, that food
 * @throws {Error} - When the reader does not take the food,
 *   like a food by hand with the name, brand and store of one of mine
 */
export async function foodSend(food: Food): Promise<Food> {
    return readerAsk<Food>("/api/food/foods", { method: "POST", body: JSON.stringify(food) });
}

/**
 * Removes a food of mine from `Foods.md` through the reader;
 * entries and meals listing it keep their lines.
 * - `query`: Its name, brand and store as parameters of the address.
 *
 * @param food - The food
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
 * Changes a food of mine through the reader:
 * renames it in `Foods.md`, in my meals and in every entry of the log naming it,
 * and writes its other values, see {@link FoodChanges}.
 *
 * @param food - The food as `Foods.md` holds it
 * @param changes - Its values as typed
 * @returns The food as the reader wrote it, its name, brand and store cleaned
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
 * @param day - Day like `2026-10-10`
 * @returns The meals of the day with what they give together
 * @throws {Error} - When the reader cannot answer
 */
export async function foodDayLoad(day: string): Promise<FoodDay> {
    return readerAsk<FoodDay>(`/api/food/day?date=${day}`);
}

/**
 * Writes an amount as the page shows it,
 * with a point between thousands and a point before the decimals, always as many decimals as asked,
 * so a number keeps its width as it changes, like the date of a day: `1.00` litres, never `1`,
 * and `0.0` g of a nutrient, never `0`;
 * an unknown amount, like the fat of a food nobody gives, as nothing, no dash and no `?`,
 * so it never reads as 0. English writes the thousands with a comma,
 * its only comma, which becomes the point.
 *
 * @param value - Amount, `null` when unknown
 * @param digits - Decimals to show, like 0 for kcal, 1 for nutrients per 100 g and 2 for litres
 * @returns Amount like `1.284`, `7.4` or `1.00`, empty when unknown
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
 * Writes the key of a food, by which a line `X-FOOD` finds it, as the reader does:
 * its name, brand and store parted by `;`, in small letters.
 *
 * @param food - Food or food picked
 * @returns Key like `skyr natur;k-classic;kaufland`
 */
export function keyOf(food: { name: string; brand: string; store: string }): string {
    return `${food.name};${food.brand};${food.store}`.toLowerCase();
}

/**
 * Makes an element with a class and a text.
 *
 * @param tag - Name of the element, like `div`
 * @param className - Class, empty for none
 * @param text - Text, empty for none
 * @returns Element
 */
export function elementOf(tag: string, className: string, text: string): HTMLElement {
    const element: HTMLElement = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

/**
 * Makes the name of a food, the same wherever it stands: its name,
 * then its brand and store grey in brackets, those it has, like `Skyr natur (K-Classic, Kaufland)`,
 * since they only tell which one it is;
 * in the size of the name, never cut,
 * on a line of their own below it where one name of the list has no room,
 * see {@link bracketsWatch}.
 * - `shown`: The name with its brand and store.
 * - `place`: Brand and store, those it has.
 *
 * @param className - Class of the name where it stands, like `food-name` in the food search
 * @param name - Name, like `Skyr natur`
 * @param brand - Brand, empty for none
 * @param store - Store, empty for none
 * @returns The name
 */
export function foodNameOf(
    className: string,
    name: string,
    brand: string,
    store: string,
): HTMLElement {
    const shown: HTMLElement = elementOf("span", className, name);
    const place: string[] = [brand, store].filter((part: string): boolean => part !== "");
    if (place.length > 0) shown.append(elementOf("span", "food-brand", ` (${place.join(", ")})`));
    return shown;
}

/**
 * Keeps the brackets after the names of a list alike, like the brand and store of the foods:
 * all on the line of their name while every one fits there,
 * else every one on a line of its own below its name, never one here and one there;
 * looked at again whenever the list changes or gets narrower or wider.
 * A bracket hidden, like the brand of a food of a meal on a phone, counts as fitting.
 * - `width`: Width of the list when last looked at,
 *   so a change of its height alone looks at nothing.
 * A list watched inside another,
 * like the food search inside the parts of a meal, keeps its own brackets.
 * - `fits`: Whether a bracket stands on the first line of its name, after it.
 * - `look`: Looks at the brackets of this list
 *   and puts them all on the line of their names, or all below them.
 *
 * @param list - List of names, like the results of the food search
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
        const brackets: HTMLElement[] = [
            ...list.querySelectorAll<HTMLElement>(".food-brand"),
        ].filter(
            (bracket: HTMLElement): boolean =>
                bracket.parentElement?.closest("[data-brackets]") === list,
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
 * Makes a button that does not send a form, also inside one,
 * like the form of the dialog of an entry.
 *
 * @param className - Class, empty for none
 * @param text - Text, empty for none
 * @param click - What a click does
 * @returns Button
 */
export function buttonOf(className: string, text: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", click);
    return button;
}
