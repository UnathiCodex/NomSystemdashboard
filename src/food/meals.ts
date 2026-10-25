/**
 * ## Meals
 *
 * My meals of `Meals.md`, each only its composition, one or more of my foods without grams,
 * servings or variants, since I prepare it a little differently every time.
 * A meal goes into `Meals.md` from an entry, named in its search, see `../day/meal.ts`;
 * the food view lists my meals above my foods, where I change and remove them,
 * and the search of an entry finds them above my foods too,
 * each with its short title in brackets, see {@link dishNameOf}.
 * - The line of a meal, wherever it stands, is that of every list of meals or foods,
 *   see `listLineOf` in `search.ts`:
 *   its name with its short title grey in brackets on one line, see {@link dishNameOf},
 *   and what it gave the last time I ate it,
 *   a bare number under the head `Meals` and `kcal / meal`;
 *   for a meal never eaten what its foods give at the grams I logged each with last,
 *   see `dishesRead` in `reader/food.ts`.
 * - The section of the food view, built as that of my foods: `Meals`, then a search field,
 *   which shows only the meals whose name or foods hold what is typed, ignoring case and accents,
 *   see {@link dishesFound}, like `reis` finding every meal with rice;
 *   then the head and the line of each meal, the small grey `×` at its end,
 *   whose first click only asks,
 *   as the remove of the entry dialog does, the cross turning into the plain question mark,
 *   `Really remove?` as its tooltip.
 *   The plus beside `Meals` opens a field of a name, as the plus beside `Foods` its form,
 *   and a name typed in the search that no meal has offers `+ New meal “Linsen Curry”` last:
 *   either opens the new meal with the search of its foods,
 *   and its first food keeps it in `Meals.md`; its `×` drops it before.
 *   A click on a line opens the meal below it, its line staying as it was closed,
 *   its short title grey in brackets beside its name, though the name then stands twice:
 *   on top its name, which changes in place by a click into it,
 *   as that of a food, renaming it wherever it stands, also in every entry that holds it,
 *   see `dishRename` in `reader/food.ts`; then its short title, see {@link dishNameOf};
 *   then its foods, each with its brand and store in brackets, its standard grams,
 *   which change in place, and its `×` while the meal has more than one,
 *   ordered by their standard grams by themselves, the most first,
 *   see `rankOf` in `reader/food.ts`, so the foods that matter most stand first; right after
 *   the name of the meal the small grey plus, like `Chili con Carne +`,
 *   which opens below its foods the search of my foods and of Open Food Facts by name or barcode,
 *   as the plus of a meal in an entry does, and closes it again;
 *   a food picked, a product taken into my foods first, changed for good in `Meals.md` at once,
 *   the search staying open and empty for the next,
 *   since I mostly add many, the cursor in it unless it stands in another field;
 *   a click on the line but on its plus closes the meal again.
 * - My meals load anew the moment a file of my new system changes, whoever changed it,
 *   like a food renamed in my foods below, see `../changes.ts`,
 *   but not while the cursor stands in their list, so nothing typed there is lost;
 *   so the section never shows, nor writes back, a meal as `Meals.md` held it before.
 *
 * - `./foods.ts`: Loads my meals, sends and removes meals,
 *   writes amounts and makes elements and buttons.
 * - `./search.ts`: The search of my foods and of Open Food Facts, which adds a food to a meal,
 *   and the head and lines of every list.
 * - `../search.ts`: Compares the text typed in the search of the meals with their names and foods.
 * - `../changes.ts`: Loads my meals anew the moment a file of my new system changes.
 * - `../icons.ts`: Puts the one plus and the one `×` into the buttons,
 *   and the plain question mark, their words as tooltip, and makes the search field of the meals.
 * - `./meals.css`: Look of the section and of a meal opened.
 */

import {
    amountOf,
    bracketsWatch,
    buttonOf,
    dishDelete,
    dishesLoad,
    dishRename,
    dishSend,
    elementOf,
    foodNameOf,
    portionGramsOf,
    unitOf,
} from "./foods.ts";
import {
    editButtonsOf,
    editFieldOf,
    foodSearchOf,
    inlineFieldOf,
    listHeadOf,
    listLineOf,
} from "./search.ts";
import { crossPut, iconOf, iconPut, plusPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Plus } from "lucide";
import { matchesAll, wordsOf } from "../search.ts";
import { changesFollow } from "../changes.ts";
import "./meals.css";

import type { Dish, Food } from "./foods.ts";

/**
 * Writes the name of a meal as the reader writes it,
 * as typed, its spaces too, a comma between two digits a point, every other comma gone,
 * since the comma parts names, and spaces in a row one, like `Chili con Carne`,
 * see `mealNameOf` in `reader/food.ts`.
 *
 * @param typed - Name as typed
 * @returns Name of the meal
 */
export function mealNameOf(typed: string): string {
    return typed
        .replace(/(\d),(?=\d)/g, "$1.")
        .replace(/\s*,\s*/g, " ")
        .replace(/[|;]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Writes kcal as the page shows them in an entry, whole, with their unit.
 *
 * @param kcal - kcal
 * @returns Text like `520 kcal`
 */
export function kcalTextOf(kcal: number): string {
    return `${amountOf(kcal, 0)} kcal`;
}

/**
 * Writes a text cut after a number of letters, with `…` right after the last,
 * a comma or space before the cut left out,
 * like `Tomaten…` for `Tomaten, Hackfleisch` cut after 8 letters.
 *
 * @param text - Text, like `Tomaten, Hackfleisch`
 * @param letters - Letters it keeps
 * @returns The text cut
 */
function cutOf(text: string, letters: number): string {
    return `${text.slice(0, letters).replace(/[\s,]+$/, "")}…`;
}

/**
 * Writes a text cut after the most letters that fit, see {@link cutOf}, and leaves it so.
 * - `low`, `high`: Fewest and most letters that may fit,
 *   closer each time until they meet at the most that fit.
 *
 * @param text - Text, like `Tomaten, Hackfleisch, Bohnen`
 * @param put - Writes the text cut where it stands
 * @param fits - Whether what is written fits
 * @returns The most letters that fit, 0 where not one does
 */
function lettersFit(text: string, put: (cut: string) => void, fits: () => boolean): number {
    let low: number = 0;
    let high: number = text.length - 1;
    while (low < high) {
        const middle: number = Math.ceil((low + high) / 2);
        put(cutOf(text, middle));
        if (fits()) low = middle;
        else high = middle - 1;
    }
    put(cutOf(text, low));
    return low;
}

/**
 * Fits the name of a meal and its short title into the one line of its name,
 * see {@link dishNameOf}: both whole where they fit,
 * else the short title cut after the last letter that fits,
 * with `…` right before the closing bracket, like `Chilli con Carne (Tomaten, Hac…)`,
 * see {@link lettersFit}; where not one letter fits beside the name,
 * like a long name on a phone, no brackets,
 * and the name cut the same way with a white `…` where even it alone has no room,
 * like `Pasta mit Ricotta Tomaten und P…`.
 * - `fits`: Whether the name stands whole, not cut by the brackets or the end of the line.
 *
 * @param name - Name of the meal, white
 * @param brackets - Its brackets
 * @param dish - The meal
 */
function dishFit(name: HTMLElement, brackets: HTMLElement, dish: Dish): void {
    const fits: () => boolean = (): boolean => name.scrollWidth <= name.clientWidth;
    name.textContent = dish.name;
    brackets.textContent = ` (${dish.short})`;
    brackets.hidden = dish.short === "";
    if (fits()) return;
    if (
        dish.short !== "" &&
        lettersFit(
            dish.short,
            (cut: string): void => {
                brackets.textContent = ` (${cut})`;
            },
            fits,
        ) > 0 &&
        fits()
    )
        return;
    brackets.hidden = true;
    if (!fits())
        lettersFit(
            dish.name,
            (cut: string): void => {
                name.textContent = cut;
            },
            fits,
        );
}

/**
 * Makes the name of a meal as every list of meals shows it, always on one line: its name,
 * then grey in brackets its short title, as a food has its brand and store in brackets,
 * like `Chilli con Carne (Tomaten, Hackfleisch, Bohnen)`, cut where the line has no room,
 * see {@link dishFit}, again whenever the line gets narrower or wider,
 * and once the font of the page has loaded,
 * which changes the room it takes, both whole as its tooltip;
 * a meal without a short title shows its name alone.
 * - `line`: The name with its short title.
 * - `name`: The name itself, white.
 * - `brackets`: Its short title in brackets, hidden for none.
 * - `width`: Width of the line when last fitted, so a change of its height alone fits nothing.
 * - `fit`: Fits name and short title into the line.
 *
 * @param dish - Meal of `Meals.md`
 * @returns The name with its short title
 */
export function dishNameOf(dish: Dish): HTMLElement {
    const line: HTMLElement = elementOf("span", "food-name dish-name", "");
    const name: HTMLElement = elementOf("span", "", dish.name);
    const brackets: HTMLElement = elementOf("span", "food-brand", "");
    brackets.hidden = dish.short === "";
    line.title = dish.short === "" ? dish.name : `${dish.name} (${dish.short})`;
    line.append(name, brackets);
    let width: number = -1;
    const fit: () => void = (): void => dishFit(name, brackets, dish);
    new ResizeObserver((entries: ResizeObserverEntry[]): void => {
        const now: number = entries[0]?.contentRect.width ?? width;
        if (now === width) return;
        width = now;
        fit();
    }).observe(line);
    document.fonts.ready.then(fit).catch((error: unknown): void => console.error(error));
    return line;
}

/**
 * Finds the meals whose name or foods hold every word typed, ignoring case and accents,
 * see `../search.ts`, like `reis` finding every meal with rice; all of them for nothing typed.
 *
 * @param dishes - My meals
 * @param typed - Text typed
 * @returns The meals found, in their order
 */
export function dishesFound(dishes: Dish[], typed: string): Dish[] {
    return dishes.filter((dish: Dish): boolean =>
        matchesAll(
            [dish.name, ...dish.foods.map((line: string): string => line.split(";")[0])].join(" "),
            wordsOf(typed),
        ),
    );
}

/**
 * Makes the one plus of every list that adds one more,
 * see `plusPut` in `../icons.ts`, its words as tooltip.
 * - `button`: The +.
 *
 * @param words - What it adds, like `Add a food to Chili con Carne`
 * @param click - What a click does
 * @returns The +
 */
function plusOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    plusPut(button, words);
    return button;
}

/**
 * Makes the one `×` of every list that takes a value back,
 * see `crossPut` in `../icons.ts`, its words as tooltip.
 * - `button`: The ×.
 *
 * @param words - What it removes, like `Remove Hackfleisch`
 * @param click - What a click does
 * @returns The ×
 */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    crossPut(button, words);
    return button;
}

/**
 * Makes the line of a food of a meal opened: its name with its brand and store in brackets,
 * see `foodNameOf` in `./foods.ts`, a link to the food itself among my foods, which opens it there,
 * see `foodShow` in `./search.ts`;
 * its standard grams, which change in place by a click into them,
 * millilitres for a drink; and its `×` where given.
 * - `part`: The line.
 * - `name`, `brand`, `store`: The parts of the food.
 * - `link`: Its name, as a link to the food.
 * - `amount`: Its grams with their unit.
 *
 * @param food - Food of the meal, like `Hackfleisch;Gut & Günstig;Edeka`
 * @param grams - Field of its standard grams, see {@link gramsFieldOf}
 * @param unit - Unit of its grams, `g`, or `ml` for a drink, see `unitOf` in `./foods.ts`
 * @param remove - Its `×`, `null` while it is the only food of the meal
 * @param open - Opens the food among my foods
 * @returns The line
 */
function partOf(
    food: string,
    grams: HTMLInputElement,
    unit: string,
    remove: HTMLButtonElement | null,
    open: () => void,
): HTMLElement {
    const part: HTMLElement = elementOf("div", "food-part", "");
    const [name, brand, store]: string[] = food.split(";");
    const link: HTMLButtonElement = buttonOf("food-link", "", open);
    const amount: HTMLElement = elementOf("span", "food-value food-grams", "");
    link.append(foodNameOf("food-name", name, brand ?? "", store ?? ""));
    link.title = `Open ${name} among my foods`;
    amount.append(grams, unit);
    part.append(link, amount);
    if (remove !== null) part.append(remove);
    return part;
}

/**
 * Makes the field of the standard grams of a food of a meal opened, see {@link inlineFieldOf}:
 * plain as every value, a click puts the cursor into it, Enter or leaving it saves a change;
 * empty for none set, 0 for a food I rarely put in;
 * portions typed, like `2x`, count as grams by the portion of the food,
 * see `portionGramsOf` in `foods.ts`;
 * a text that is no number of 0 or more takes nothing and shows the grams again.
 * - `input`: The field.
 * - `text`: The text typed, a decimal comma as a point.
 * - `typed`: The grams typed, `null` for none, not a number for an unreadable text.
 *
 * @param grams - Its standard grams, `null` for none
 * @param name - Name of the food, for screen readers
 * @param portion - Grams of the portion of the food, `null` for none
 * @param saved - Takes the grams typed, `null` for none
 * @returns The field
 */
function gramsFieldOf(
    grams: number | null,
    name: string,
    portion: number | null,
    saved: (grams: number | null) => void,
): HTMLInputElement {
    const input: HTMLInputElement = inlineFieldOf(
        grams === null ? "" : String(grams),
        `Grams of ${name}`,
        (): void => {
            const text: string = input.value.trim().replace(",", ".");
            const typed: number | null =
                portionGramsOf(text, portion) ?? (text === "" ? null : Number(text));
            if (typed !== null && !(typed >= 0)) {
                input.value = grams === null ? "" : String(grams);
                return;
            }
            saved(typed);
        },
    );
    input.inputMode = "decimal";
    input.classList.add("food-inline-grams");
    return input;
}

/**
 * Builds the section of my meals in the food view, see the top of this file, loading my meals,
 * and again after every meal changed or removed, and after every change of a file of my new system
 * while the cursor stands outside their list.
 * - `section`: The section.
 * - `search`: The search field of the meals, `Search meals` grey in it while empty.
 * - `list`: Place of the head and the lines of the meals.
 * - `dishes`: My meals.
 * - `open`: Name of the meal opened, in small letters, empty for none.
 * - `adding`: Name of the meal whose search of my foods shows, in small letters, empty for none.
 * - `asked`: Name of the meal whose `×` asked `Really remove?`, in small letters, empty for none.
 * - `take`: Shows my meals as the reader sends them.
 * - `load`: Loads my meals again and shows them.
 * - `send`: Sends a meal changed for good, its foods,
 *   and where given its short title and grams, and shows my meals.
 * - `toggle`: Opens a meal, or closes it again, its search of my foods with it.
 * - `show`: Shows the meals found for the words typed in the search, all of them for none typed,
 *   or a hint when none is found;
 *   the row of the meal opened no button but a row that a click closes again,
 *   since its plus stands inside it.
 * - `shown`: The meals found.
 *
 * @returns The section
 */
export function mealsSectionOf(
    foodOpen: (food: { name: string; brand: string; store: string }) => void,
): HTMLElement {
    const section: HTMLElement = elementOf("section", "food-dishes", "");
    const search: HTMLInputElement = document.createElement("input");
    const list: HTMLElement = elementOf("div", "dish-list", "");
    bracketsWatch(list);
    let dishes: Dish[] = [];
    let open: string = "";
    let adding: string = "";
    let asked: string = "";
    let fresh: string = "";
    let naming: boolean = false;

    const take: (meals: Dish[]) => void = (meals: Dish[]): void => {
        dishes = meals;
        show();
    };
    const load: () => void = (): void => {
        dishesLoad()
            .then(take)
            .catch((error: unknown): void => {
                console.error(error);
                list.replaceChildren(elementOf("p", "food-none", "The meals cannot be read"));
            });
    };
    const send: (dish: Dish, foods: string[], short?: string, grams?: (number | null)[]) => void = (
        dish: Dish,
        foods: string[],
        short?: string,
        grams?: (number | null)[],
    ): void => {
        dishSend(dish.name, foods, short, grams)
            .then(take)
            .catch((error: unknown): void => console.error(error));
    };
    const toggle: (key: string) => void = (key: string): void => {
        open = open === key ? "" : key;
        adding = "";
        show();
    };
    const begin: (name: string) => void = (name: string): void => {
        fresh = mealNameOf(name);
        naming = false;
        open = fresh.toLowerCase();
        adding = open;
        search.value = "";
        show();
    };
    const show: () => void = (): void => {
        const taken: boolean = dishes.some(
            (dish: Dish): boolean => dish.name.toLowerCase() === fresh.toLowerCase(),
        );
        if (taken) fresh = "";
        const shown: Dish[] = [
            ...(fresh === ""
                ? []
                : [
                      {
                          name: fresh,
                          short: "",
                          foods: [],
                          standard: [],
                          kcal: null,
                          portions: [],
                          kinds: [],
                      },
                  ]),
            ...dishesFound(dishes, search.value),
        ];
        const rows: HTMLElement[] = shown.flatMap((dish: Dish): HTMLElement[] => {
            const key: string = dish.name.toLowerCase();
            const name: HTMLElement = dishNameOf(dish);
            const remove: HTMLButtonElement = removeOf(`Remove ${dish.name}`, (): void => {
                if (dish.foods.length === 0) {
                    fresh = "";
                    show();
                    return;
                }
                if (asked !== key) {
                    asked = key;
                    show();
                    return;
                }
                asked = "";
                dishDelete(dish.name)
                    .then(take)
                    .catch((error: unknown): void => console.error(error));
            });
            const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
                name,
                dish.kcal,
                open === key ? null : (): void => toggle(key),
                remove,
            );
            if (asked === key) iconPut(remove, QuestionMark, "Really remove?");
            row.setAttribute("aria-expanded", String(open === key));
            if (open !== key) return [line];

            name.append(
                plusOf(`Add a food to ${dish.name}`, (): void => {
                    adding = adding === key ? "" : key;
                    show();
                }),
            );
            row.addEventListener("click", (event: MouseEvent): void => {
                if ((event.target as HTMLElement).closest("button") === null) toggle(key);
            });
            const detail: HTMLElement = elementOf("div", "food-detail", "");
            const facts: HTMLElement = elementOf("div", "food-facts", "");
            const error: HTMLElement = elementOf(
                "p",
                "food-error",
                "Not changed: it needs a name, and no other meal of mine may have it",
            );
            const rename: HTMLInputElement = inlineFieldOf(dish.name, "Name", (): void => {
                if (dish.foods.length === 0) {
                    begin(rename.value);
                    return;
                }
                detail.inert = true;
                dishRename(dish.name, rename.value)
                    .then((meals: Dish[]): void => {
                        open = mealNameOf(rename.value).toLowerCase();
                        take(meals);
                    })
                    .catch((reason: unknown): void => {
                        console.error(reason);
                        error.hidden = false;
                        detail.inert = false;
                    });
            });
            const short: HTMLInputElement = inlineFieldOf(dish.short, "Short", (): void =>
                send(dish, dish.foods, short.value, dish.standard),
            );
            const parts: HTMLElement = elementOf("div", "dish-foods", "");
            facts.append(
                elementOf("span", "food-fact", "Name"),
                rename,
                ...(dish.foods.length === 0
                    ? []
                    : [elementOf("span", "food-fact", "Short"), short]),
                elementOf("span", "food-fact", "Foods"),
                parts,
            );
            error.hidden = true;
            detail.append(facts, error);
            parts.append(
                ...dish.foods.map((food: string, index: number): HTMLElement => {
                    const grams: HTMLInputElement = gramsFieldOf(
                        dish.standard[index] ?? null,
                        food.split(";")[0],
                        dish.portions[index] ?? null,
                        (typed: number | null): void =>
                            send(
                                dish,
                                dish.foods,
                                dish.short,
                                dish.standard.map(
                                    (other: number | null, at: number): number | null =>
                                        at === index ? typed : other,
                                ),
                            ),
                    );
                    const [name, brand, store]: string[] = food.split(";");
                    const part: HTMLElement = partOf(
                        food,
                        grams,
                        unitOf(dish.kinds[index] ?? "Eat"),
                        dish.foods.length > 1
                            ? removeOf(`Remove ${name}`, (): void =>
                                  send(
                                      dish,
                                      dish.foods.filter((other: string): boolean => other !== food),
                                  ),
                              )
                            : null,
                        (): void =>
                            foodOpen({ name: name, brand: brand ?? "", store: store ?? "" }),
                    );
                    return part;
                }),
            );
            if (adding === key) {
                const foods: HTMLElement = foodSearchOf({
                    pick: (food: Food): void => {
                        const added: string = `${food.name};${food.brand};${food.store}`;
                        send(dish, [
                            ...dish.foods.filter((other: string): boolean => other !== added),
                            added,
                        ]);
                    },
                    meals: null,
                    products: true,
                    nothing: "Nothing found",
                });
                parts.append(foods);
                queueMicrotask((): void => {
                    if (!(document.activeElement?.matches("input, textarea") ?? false))
                        foods.querySelector("input")?.focus();
                });
            }
            return [line, detail];
        });
        const typed: string = mealNameOf(search.value);
        const plus: HTMLElement[] =
            typed === "" ||
            dishes.some((dish: Dish): boolean => dish.name.toLowerCase() === typed.toLowerCase())
                ? []
                : [newOf(typed)];
        list.replaceChildren(
            ...(naming ? [nameFormOf()] : []),
            ...(shown.length > 0 || plus.length > 0
                ? [listHeadOf("Meals", "kcal / meal"), ...rows, ...plus]
                : []),
            ...(dishes.length === 0 && fresh === "" && plus.length === 0 && !naming
                ? [elementOf("p", "food-none", "No meals yet")]
                : []),
        );
    };
    const newOf: (name: string) => HTMLElement = (name: string): HTMLElement => {
        const button: HTMLButtonElement = buttonOf("picker-new", "", (): void => begin(name));
        button.replaceChildren(iconOf(Plus), `New meal “${name}”`);
        button.title = "New meal, its foods picked next";
        return button;
    };
    const nameFormOf: () => HTMLElement = (): HTMLElement => {
        const form: HTMLElement = elementOf("div", "food-form food-detail", "");
        const facts: HTMLElement = elementOf("div", "food-facts", "");
        const close: () => void = (): void => {
            naming = false;
            show();
        };
        const name: HTMLInputElement = editFieldOf(
            "",
            "Name",
            (): void => {
                if (mealNameOf(name.value) !== "") begin(name.value);
            },
            close,
        );
        const label: HTMLElement = elementOf("span", "food-fact", "Name");
        name.className = "food-inline food-inline-new";
        name.placeholder = "";
        label.addEventListener("click", (): void => name.focus());
        facts.append(label, name);
        form.append(
            facts,
            editButtonsOf(close, (): void => {
                if (mealNameOf(name.value) !== "") begin(name.value);
            }),
        );
        queueMicrotask((): void => name.focus());
        return form;
    };

    search.addEventListener("input", show);
    const heading: HTMLElement = elementOf("h2", "food-heading", "Meals");
    heading.append(
        plusOf("New meal", (): void => {
            naming = !naming;
            show();
        }),
    );
    section.append(heading, searchFieldOf(search, "Search meals"), list);
    load();
    changesFollow((): void => {
        if (!list.contains(document.activeElement)) load();
    });
    return section;
}
