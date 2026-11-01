/**
 * ## Meals
 *
 * My meals of `Meals.md`, each only its foods, without grams, servings or variants,
 * since I prepare it a little differently every time.
 * - Line: What a meal gave the last time I ate it, else what its foods give at their last grams.
 * - Opened: Its name, which renames it wherever it stands, its short title and its foods with standard grams.
 *   Its plus opens the search of my foods, staying open and empty for the next, since I mostly add many.
 * - Changes: My meals load anew on a change of my files, but not while the cursor stands in their list,
 *   so nothing typed there is lost.
 */

import {
    bracketsWatch,
    buttonOf,
    dishDelete,
    dishesLoad,
    dishRename,
    dishSend,
    elementOf,
    foodNameOf,
    headingOf,
    plusOf,
    portionGramsOf,
    unitOf,
} from "./foods.ts";
import { editButtonsOf, editFieldOf, foodSearchOf, inlineFieldOf, listLineOf } from "./search.ts";
import { crossPut, iconOf, iconPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Plus } from "lucide";
import { matchesAll, wordsOf } from "../search.ts";
import { changesFollow } from "../changes.ts";
import "./meals.css";

import type { Dish } from "./foods.ts";
import type { Food } from "../../reader/food.ts";

/**
 * Writes the name of a meal as the reader does.
 * A comma between two digits becomes a point, every other comma goes, since the comma parts names.
 */
export function mealNameOf(typed: string): string {
    return typed
        .replace(/(\d),(?=\d)/g, "$1.")
        .replace(/\s*,\s*/g, " ")
        .replace(/[|;]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Cuts a text after a number of letters with `…`, a comma or space before the cut left out. */
function cutOf(text: string, letters: number): string {
    return `${text.slice(0, letters).replace(/[\s,]+$/, "")}…`;
}

/** Cuts a text after the most letters that fit, found by halving, and gives their number. */
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
 * Fits the name of a meal and its short title into one line, else the short title cut.
 * Where not one letter of it fits, no brackets, and the name cut where even it alone has no room.
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
 * The name of a meal on one line, its short title grey in brackets, both whole as its tooltip.
 * Fitted again when the line changes its width, and once the font has loaded, which changes the room it takes.
 * - `width`: Width when last fitted, so a change of its height alone fits nothing.
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

/** Finds the meals whose name or foods hold every word typed. */
export function dishesFound(dishes: Dish[], typed: string): Dish[] {
    return dishes.filter((dish: Dish): boolean =>
        matchesAll(
            [dish.name, ...dish.foods.map((line: string): string => line.split(";")[0])].join(" "),
            wordsOf(typed),
        ),
    );
}

function removeOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    crossPut(button, words);
    return button;
}

/**
 * The line of a food of a meal opened, its name a link to the food among my foods.
 * Its `×` `null` while it is the only food of the meal.
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
 * The field of the standard grams of a food of a meal, empty for none, 0 for a food I rarely put in.
 * Portions typed, like `2x`, count by the portion of the food.
 * A text that is no number of 0 or more takes nothing and shows the grams again.
 */
function gramsFieldOf(
    grams: number | null,
    name: string,
    portion: number | null,
    saved: (grams: number | null) => void,
): HTMLInputElement {
    const input: HTMLInputElement = inlineFieldOf(grams === null ? "" : String(grams), `Grams of ${name}`, (): void => {
        const text: string = input.value.trim().replace(",", ".");
        const typed: number | null = portionGramsOf(text, portion) ?? (text === "" ? null : Number(text));
        if (typed !== null && !(typed >= 0)) {
            input.value = grams === null ? "" : String(grams);
            return;
        }
        saved(typed);
    });
    input.inputMode = "decimal";
    input.classList.add("food-inline-grams");
    return input;
}

/**
 * The section of my meals in the food view.
 * The first click on the `×` of a meal only asks, `Really remove?`.
 * A new meal stays only once its first food is picked, its `×` drops it before.
 * - `open`, `adding`, `asked`: Name of the meal opened, showing its search, or asking, in small letters.
 * - `show`: The row of the meal opened is no button but a row a click closes, since its plus stands inside it.
 */
export function mealsSectionOf(foodOpen: (food: { name: string; brand: string; store: string }) => void): HTMLElement {
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
    const taken: (name: string) => boolean = (name: string): boolean =>
        dishes.some((dish: Dish): boolean => dish.name.toLowerCase() === name.toLowerCase());
    const show: () => void = (): void => {
        if (taken(fresh)) fresh = "";
        const blank: Dish = { name: fresh, short: "", foods: [], standard: [], kcal: null, portions: [], kinds: [] };
        const shown: Dish[] = [...(fresh === "" ? [] : [blank]), ...dishesFound(dishes, search.value)];
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
                ...(dish.foods.length === 0 ? [] : [elementOf("span", "food-fact", "Short"), short]),
                elementOf("span", "food-fact", "Foods"),
                parts,
            );
            error.hidden = true;
            detail.append(facts, error);
            parts.append(
                ...dish.foods.map((food: string, index: number): HTMLElement => {
                    const [name, brand, store]: string[] = food.split(";");
                    const grams: HTMLInputElement = gramsFieldOf(
                        dish.standard[index] ?? null,
                        name,
                        dish.portions[index] ?? null,
                        (typed: number | null): void =>
                            send(
                                dish,
                                dish.foods,
                                dish.short,
                                dish.standard.map((other: number | null, at: number): number | null =>
                                    at === index ? typed : other,
                                ),
                            ),
                    );
                    return partOf(
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
                        (): void => foodOpen({ name: name, brand: brand ?? "", store: store ?? "" }),
                    );
                }),
            );
            if (adding === key) {
                const foods: HTMLElement = foodSearchOf({
                    pick: (food: Food): void => {
                        const added: string = `${food.name};${food.brand};${food.store}`;
                        send(dish, [...dish.foods.filter((other: string): boolean => other !== added), added]);
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
        const plus: HTMLElement[] = typed === "" || taken(typed) ? [] : [newOf(typed)];
        list.replaceChildren(
            ...(naming ? [nameFormOf()] : []),
            ...rows,
            ...plus,
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
        const save: () => void = (): void => {
            if (mealNameOf(name.value) !== "") begin(name.value);
        };
        const name: HTMLInputElement = editFieldOf("", "Name", save, close);
        const label: HTMLElement = elementOf("span", "food-fact", "Name");
        name.className = "food-inline food-inline-new";
        name.placeholder = "";
        label.addEventListener("click", (): void => name.focus());
        facts.append(label, name);
        form.append(facts, editButtonsOf(close, save));
        queueMicrotask((): void => name.focus());
        return form;
    };

    search.addEventListener("input", show);
    section.append(
        headingOf(
            "Meals",
            plusOf("New meal", (): void => {
                naming = !naming;
                show();
            }),
            "kcal / meal",
        ),
        searchFieldOf(search, "Search meals"),
        list,
    );
    load();
    changesFollow((): void => {
        if (!list.contains(document.activeElement)) load();
    });
    return section;
}
