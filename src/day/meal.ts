/**
 * ## Meal in the entry by category
 *
 * A meal of the log, `Food`, in rows of the dialog,
 * with the fewest steps and nothing nested:
 * - Summary: what I ate, written by itself, never typed, see {@link mealTitle},
 *   and after it in brackets what they give together, drinks too.
 *   A drink's amount is in millilitres, any other in grams.
 * - Foods: what I ate, the one plus beside its name opening one list,
 *   a menu over the dialog, see `listOf` in `choices.ts`,
 *   whose one search finds my meals first, then my foods,
 *   then the products of Open Food Facts, see `../food/search.ts`.
 *   A meal brings its block, its foods indented below it, a food of mine its row.
 *   A product goes into `Foods.md` as Open Food Facts gives it, no form in between.
 *   While the text typed is no meal of mine, `+ New meal` puts an empty block
 *   of that name into the entry, see {@link mealNew},
 *   which goes into `Meals.md` with its first food, see {@link freshSend}.
 *   `+ New food` opens the form of a food by hand named as typed.
 *   A food of mine has a pencil beside its name, to change it right there,
 *   see {@link foodRowOf}.
 *   Its grams start at one portion of it, which I type over.
 *   An empty field counts nothing and is saved without grams.
 *   Every amount is rounded and an estimate anyway, so none is marked as one.
 *   Enter in its grams only confirms them, see `enterTake` in `categories.ts`.
 * A meal block has its own plus right after its name,
 * which adds a food to it, from the same search without my meals.
 * The dialog writes each food as a line `X-FOOD`, see {@link lineOf},
 * so the log keeps what the meal held that day, whatever I change in `Meals.md` later.
 * A meal whose summary names more than its foods, like `Bortzeit` written by hand,
 * opens as that one meal with its foods, so its name stays.
 * A cooking of the log, `Cook`, lists what went into the pot in the same rows
 * and counts no kcal, see `reader/food.ts`.
 * A meal may draw from one of my cookings of the days before it, see {@link cookedRowOf}.
 * It writes `X-COOKED` with the cooking's identifier and its foods as its own lines,
 * so meal and cooking each keep their foods.
 * A meal eaten out, where nothing can be weighed, I log by photo through Claude,
 * who writes its entry through the reader. The dialog itself takes no photo.
 */

import { choicesOf, listOf, rowOf, searchOf } from "./choices.ts";
import { timeOf } from "./times.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import {
    buttonOf,
    dishDelete,
    dishesLoad,
    dishSend,
    elementOf,
    foodsFind,
    keyOf,
    kcalTextOf,
    portionGramsOf,
    summaryOf,
    unitOf,
} from "../food/foods.ts";
import { dishesFound, dishNameOf, mealNameOf } from "../food/meals.ts";
import {
    foodDetailOf,
    foodSearchClear,
    foodSearchOf,
    listLineOf,
} from "../food/search.ts";
import { crossPut, iconOf, iconPut, plusPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Pencil, Plus } from "lucide";

import type { Choice } from "./choices.ts";
import type { Dish } from "../food/foods.ts";
import type { Food, FoodsFound, Kind } from "../../reader/food.ts";

/**
 * A food picked, beside the meals or as part of one.
 *
 * - `grams`: As typed, empty for none, which counts nothing.
 * - `fromCooking`: Whether it came with the cooking the meal draws from.
 */
type FoodPick = {
    name: string;
    brand: string;
    store: string;
    grams: string;
    fromCooking?: boolean;
};

/**
 * A line `X-FOOD` cut into its parts, see {@link lineOf}.
 * Brand and store are empty in a line written before foods had them.
 */
export type Line = {
    name: string;
    brand: string;
    store: string;
    grams: string;
    meal: string;
};

/**
 * A cooking of the log as the reader sends it, one a meal may draw from.
 *
 * - `foods`: Its lines `X-FOOD`, what went into the pot.
 * - `eaters`: How many other meals draw from it already, which share it with this one.
 */
type Cooking = {
    id: string;
    category: string;
    title: string;
    start: string;
    foods: string[];
    eaters: number;
};

/**
 * What a meal needs to draw from a cooking, see {@link cookedRowOf}.
 *
 * - `cooked`: Its `X-COOKED`, empty for none.
 * - `start`: Start of the meal, whose cookings of the days before it are offered.
 * - `id`: Identifier of the meal when it is changed, empty for a new one,
 *   so it does not count itself among the meals that share a cooking.
 */
export type Drawing = {
    cooked: string;
    start: Date;
    id: string;
};

/**
 * A meal of mine picked, with its foods.
 *
 * - `fromCooking`: Whether it came with the cooking the meal draws from.
 * - `fresh`: Whether it is a new meal, named in this entry, see {@link freshSend}.
 */
type MealPick = {
    name: string;
    foods: FoodPick[];
    fromCooking?: boolean;
    fresh?: boolean;
};

/**
 * Category of meals, whose foods count what I ate.
 */
export const foodName: string = "Food";

/**
 * Category of cookings, whose foods tell what went into the pot and count nothing.
 */
export const cookName: string = "Cook";

/**
 * Days before a meal whose cookings it may draw from, three,
 * since I eat nothing I cooked longer ago.
 */
const cookingDays: number = 3;

/** The one grey line of a search of the dialog that finds nothing. */
const nothingFound: string = "Nothing found";

/** My cookings of the days before the meal that list foods, the nearest first. */
let cookings: Cooking[] = [];

/** Identifier of the cooking the meal draws from, empty for none. */
let cooked: string = "";

/**
 * The row of the cooking the meal draws from, so it shows a cooking picked by a meal,
 * see {@link dishPick}, `null` for a cooking, which draws from none.
 */
let cookedRow: HTMLElement | null = null;

/**
 * My foods by their keys, see {@link keyOf}, and by their names alone in small letters,
 * for lines written before foods had brand and store.
 */
let mine: Map<string, Food> = new Map();

/** Key of the food of mine whose pencil opened it below its row, empty for none. */
let foodOpen: string = "";

/** My meals of `Meals.md`, as they are after every meal kept since. */
let dishes: Dish[] = [];

/** Meals picked, in the order they were picked. */
let meals: MealPick[] = [];

/** Foods picked beside the meals, in the order they were picked. */
let picks: FoodPick[] = [];

/** Text of the summary, and after it the kcal of the whole meal. */
let summaryLine: HTMLElement = document.createElement("span");

/** Place of the blocks of the meals picked, then of the foods picked beside them. */
let foodsRows: HTMLElement = document.createElement("div");

/** Closes the list of the row `Foods`. */
let foodsClose: () => void = (): void => {};

/** The grams field of each food picked, so the cursor finds the food just picked. */
let gramsFields: WeakMap<FoodPick, HTMLInputElement> = new WeakMap();

/** The plus of each meal block, so a new meal opens its search at once. */
let blockPluses: WeakMap<MealPick, HTMLButtonElement> = new WeakMap();

/** Takes my meals of `Meals.md` as the reader sends them after a change. */
function dishesTake(all: Dish[]): void {
    dishes = all;
}

/**
 * Keeps a food among my foods by its key and,
 * unless a food of its name came first, by its name alone, see {@link mine}.
 */
function mineAdd(food: Food): void {
    mine.set(keyOf(food), food);
    if (!mine.has(food.name.toLowerCase())) mine.set(food.name.toLowerCase(), food);
}

/** Makes a food picked of a line `X-FOOD` or of a food. */
function pickOf(read: Pick<Line, "name" | "brand" | "store">, grams: string): FoodPick {
    return { name: read.name, brand: read.brand, store: read.store, grams: grams };
}

/** Writes grams to one decimal at most, as `X-FOOD` and the fields take them. */
function gramsTextOf(grams: number): string {
    return String(Math.round(grams * 10) / 10);
}

/** Makes a food picked newly, its grams one portion of it, empty without portion. */
function pickNewOf(food: Food): FoodPick {
    return pickOf(food, food.portion === null ? "" : gramsTextOf(food.portion));
}

/**
 * Finds a food picked among my foods, `undefined` for one `Foods.md` does not hold.
 * One without brand and store is found by its name alone.
 */
function foodOf(pick: FoodPick): Food | undefined {
    return (
        mine.get(keyOf(pick)) ??
        (pick.brand === "" && pick.store === ""
            ? mine.get(pick.name.toLowerCase())
            : undefined)
    );
}

/** Tells whether a part of a line `X-FOOD` is grams. */
function gramsIs(part: string): boolean {
    return /^~?\s*\d+(?:[.,]\d+)?$/.test(part);
}

/**
 * Turns a line `X-FOOD` into its parts, as the reader reads it.
 * One of today names its food's name, brand and store, then its grams, empty for none,
 * and for the food of one of my meals the meal,
 * told by its second part being no grams and its fourth grams or empty.
 * A food of a meal of `Meals.md` names only its name, brand and store.
 * An older line names its food alone, its grams after it, then the meal,
 * then its servings eaten and its variant, which no longer count.
 */
export function lineOf(line: string): Line {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    if (
        (parts.length === 4 || parts.length === 5) &&
        !gramsIs(parts[1]) &&
        (parts[3] === "" || gramsIs(parts[3]))
    )
        return {
            name: parts[0],
            brand: parts[1],
            store: parts[2],
            grams: parts[3],
            meal: parts[4] ?? "",
        };
    if (parts.length === 3 && !gramsIs(parts[1]) && !gramsIs(parts[2]))
        return { name: parts[0], brand: parts[1], store: parts[2], grams: "", meal: "" };
    const grams: boolean = parts.length > 1 && gramsIs(parts[1]);
    return {
        name: parts[0],
        brand: "",
        store: "",
        grams: grams ? parts[1] : "",
        meal: parts[grams ? 2 : 1] ?? "",
    };
}

/**
 * Reads a number as typed, a decimal comma counting as a point.
 * A `~` before it, which marks grams guessed from a photo, not weighed, is left out.
 * Gives `null` for an empty text, not a number for a text that is none.
 */
function numberOf(text: string): number | null {
    return text === "" ? null : Number(text.replace(/^~\s*/, "").replace(",", "."));
}

/**
 * Tells the kcal of a food picked,
 * 0 for a food not in `Foods.md`, no grams or grams that are no number.
 */
function kcalOf(pick: FoodPick): number {
    const counted: number = numberOf(pick.grams) ?? 0;
    return Number.isFinite(counted) ? (counted / 100) * (foodOf(pick)?.kcal ?? 0) : 0;
}

/** Tells the kcal of a meal picked, what its foods give. */
function mealKcalOf(meal: MealPick): number {
    return meal.foods.reduce(
        (sum: number, pick: FoodPick): number => sum + kcalOf(pick),
        0,
    );
}

/**
 * Turns portions typed into the grams of a food into its grams,
 * see `portionGramsOf` in `../food/foods.ts`. Any other text stays as it is.
 */
function portionsOf(text: string, portion: number | null): string {
    const grams: number | null = portionGramsOf(text, portion);
    return grams === null ? text : gramsTextOf(grams);
}

/**
 * Makes the small field of the grams of a food with its unit after it,
 * which a click selects so I type over them.
 * Portions typed become grams once I leave the field or press Enter.
 * It marks itself invalid while its text is no number of 0 or more,
 * so the dialog does not send it.
 * 0 is a food I did not put in this time, which the entry leaves out,
 * see {@link mealFoods}.
 *
 * @returns The field with its unit, and the text field itself
 */
function gramsFieldOf(
    value: string,
    name: string,
    portion: number | null,
    unit: string,
    typed: (text: string) => void,
): [HTMLElement, HTMLInputElement] {
    const label: HTMLElement = elementOf("label", "meal-grams", "");
    const input: HTMLInputElement = document.createElement("input");
    const portions: () => void = (): void => {
        const grams: string = portionsOf(input.value, portion);
        if (grams === input.value) return;
        input.value = grams;
        input.dispatchEvent(new Event("input"));
    };
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.value = value;
    input.addEventListener("focus", (): void => input.select());
    input.setAttribute("aria-label", name);
    input.addEventListener("input", (): void => {
        const number: number | null = numberOf(input.value.trim());
        input.setCustomValidity(
            number === null ||
                number >= 0 ||
                portionsOf(input.value, portion) !== input.value
                ? ""
                : "A number of 0 or more, portions like 2x, or empty",
        );
        typed(input.value.trim());
    });
    input.addEventListener("change", portions);
    label.append(input, ` ${unit}`);
    return [label, input];
}

/**
 * Takes a food of mine as the reader wrote it after a change in the dialog:
 * among my foods in place of the food as it was,
 * and every food picked of it under its new name, brand and store,
 * so the entry writes its lines `X-FOOD` so.
 * My meals load anew, which the reader renamed it in.
 */
function foodTake(old: Food, written: Food): void {
    const renamed: FoodPick[] = [
        ...picks,
        ...meals.flatMap((meal: MealPick): FoodPick[] => meal.foods),
    ].filter((pick: FoodPick): boolean => foodOf(pick) === old);
    [...mine.keys()]
        .filter((key: string): boolean => mine.get(key) === old)
        .forEach((key: string): void => {
            mine.delete(key);
        });
    mineAdd(written);
    renamed.forEach((pick: FoodPick): void => {
        pick.name = written.name;
        pick.brand = written.brand;
        pick.store = written.store;
    });
    dishesLoad()
        .then(dishesTake)
        .catch((error: unknown): void => console.error(error));
}

/**
 * Builds the row of a food: its name alone, without its brand and store,
 * which only tell which one it is when I pick it,
 * marked when `Foods.md` does not hold it, its grams, its kcal and its `×`.
 * A food of mine has a pencil beside its name,
 * which opens the food below its row as the food view opens it,
 * see `foodDetailOf` in `../food/search.ts`.
 * A change shows the rows anew at once, see {@link foodTake},
 * the food staying open and the cursor in the value I went on to.
 *
 * @param typed - Comes once its grams are typed, after its kcal show anew
 * @param renewed - Shows the rows anew after a change of the food
 * @returns Row, and the food opened below it while open
 */
function foodRowOf(
    pick: FoodPick,
    typed: () => void,
    removed: () => void,
    renewed: () => void,
): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const food: Food | undefined = foodOf(pick);
    const name: HTMLElement = elementOf("span", "meal-name", pick.name);
    const kcalTextFor: () => string = (): string =>
        food === undefined || pick.grams.trim() === "" ? "" : kcalTextOf(kcalOf(pick));
    const kcal: HTMLElement = elementOf("span", "meal-kcal", kcalTextFor());
    const [grams, input]: [HTMLElement, HTMLInputElement] = gramsFieldOf(
        pick.grams,
        `Grams of ${pick.name}`,
        food?.portion ?? null,
        unitOf(food?.kind ?? "Eat"),
        (text: string): void => {
            pick.grams = text;
            kcal.textContent = kcalTextFor();
            typed();
        },
    );
    const remove: HTMLButtonElement = buttonOf("", "", removed);
    const detailFor: (mineFood: Food) => HTMLElement = (mineFood: Food): HTMLElement =>
        foodDetailOf(mineFood, (written: Food): void => {
            const typing: string | null =
                document.activeElement?.closest(".food-detail") === null
                    ? null
                    : (document.activeElement?.getAttribute("aria-label") ?? null);
            foodTake(mineFood, written);
            foodOpen = keyOf(written);
            renewed();
            if (typing !== null)
                foodsRows
                    .querySelector<HTMLInputElement>(
                        `.food-detail input[aria-label="${typing}"]`,
                    )
                    ?.focus();
        });
    let detail: HTMLElement | null =
        food !== undefined && foodOpen === keyOf(food) ? detailFor(food) : null;

    if (food === undefined)
        name.append(elementOf("span", "meal-unknown", " · not in my foods"));
    name.title = name.textContent ?? "";
    if (food !== undefined) {
        const pencil: HTMLButtonElement = buttonOf("entry-pencil", "", (): void => {
            if (detail !== null) {
                detail.remove();
                detail = null;
                foodOpen = "";
                return;
            }
            foodOpen = keyOf(food);
            detail = detailFor(food);
            row.after(detail);
        });
        iconPut(pencil, Pencil, `Change ${pick.name}`);
        name.append(pencil);
    }
    gramsFields.set(pick, input);
    crossPut(remove, `Remove ${pick.name}`);
    row.append(name, grams, kcal, remove);
    return detail === null ? [row] : [row, detail];
}

/**
 * Puts the cursor into the grams of foods just picked:
 * the first of them whose grams are empty, since those I type the first time,
 * else the first of them.
 */
function gramsFocus(picked: FoodPick[]): void {
    const first: FoodPick | undefined =
        picked.find((pick: FoodPick): boolean => pick.grams === "") ?? picked[0];
    if (first !== undefined) gramsFields.get(first)?.focus();
}

/**
 * Builds the rows of a meal picked: its row, its name with the one plus after it,
 * its kcal and its `×`, below it its foods, indented, see {@link foodRowOf}.
 * The plus opens the search of my foods and of Open Food Facts as a menu of its own
 * right under the meal, see `listOf` in `choices.ts`.
 * A food picked goes into this meal of this entry only, never into `Meals.md`.
 * The meal goes with its last food.
 *
 * @returns Its row, then its parts
 */
function mealRowsOf(meal: MealPick, changed: () => void): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const kcal: HTMLElement = elementOf(
        "span",
        "meal-kcal",
        kcalTextOf(mealKcalOf(meal)),
    );
    const remove: HTMLButtonElement = buttonOf("", "", (): void => {
        meals = meals.filter((other: MealPick): boolean => other !== meal);
        rowsChanged(changed);
    });
    const name: HTMLElement = elementOf("span", "meal-name", meal.name);
    const parts: HTMLElement = elementOf("div", "meal-parts", "");
    const plus: HTMLButtonElement = document.createElement("button");
    const box: HTMLElement = elementOf("div", "picker-box meal-box", "");
    const search: HTMLElement = foodSearchOf({
        pick: (food: Food): void => {
            mineAdd(food);
            let pick: FoodPick | undefined = meal.foods.find(
                (other: FoodPick): boolean => keyOf(other) === keyOf(food),
            );
            if (pick === undefined) {
                pick = pickNewOf(food);
                meal.foods.push(pick);
                freshSend(meal);
            }
            close();
            rowsChanged(changed);
            gramsFocus([pick]);
        },
        meals: null,
        products: true,
        nothing: nothingFound,
    });
    const close: () => void = listOf(
        parts,
        plus,
        box,
        (): void => {
            foodSearchClear(search);
            search.querySelector("input")?.focus();
        },
        (): void => {},
    );
    box.append(search);

    crossPut(remove, `Remove ${meal.name}`);
    plusPut(plus, `Add a food to ${meal.name}`);
    blockPluses.set(meal, plus);
    name.append(plus);
    row.append(name, elementOf("span", "", ""), kcal, remove);
    parts.append(
        ...meal.foods.flatMap((pick: FoodPick): HTMLElement[] =>
            foodRowOf(
                pick,
                (): void => {
                    kcal.textContent = kcalTextOf(mealKcalOf(meal));
                    summaryShow();
                    changed();
                },
                (): void => {
                    meal.foods = meal.foods.filter(
                        (other: FoodPick): boolean => other !== pick,
                    );
                    freshSend(meal);
                    meals = meals.filter(
                        (other: MealPick): boolean => other.foods.length > 0,
                    );
                    rowsChanged(changed);
                },
                (): void => rowsChanged(changed),
            ),
        ),
        box,
    );
    return [row, parts];
}

/**
 * Shows the summary, see {@link mealTitle}, and after it the kcal of the whole meal
 * in brackets, none while no food has grams, as a food without grams shows none.
 */
function summaryShow(): void {
    const total: number =
        meals.reduce((sum: number, meal: MealPick): number => sum + mealKcalOf(meal), 0) +
        picks.reduce((sum: number, pick: FoodPick): number => sum + kcalOf(pick), 0);
    const text: HTMLElement = elementOf("span", "meal-summary", mealTitle());
    if (
        [...meals.flatMap((meal: MealPick): FoodPick[] => meal.foods), ...picks].some(
            (pick: FoodPick): boolean => numberOf(pick.grams) !== null,
        )
    )
        text.append(elementOf("span", "meal-total", ` (${kcalTextOf(total)})`));
    summaryLine.replaceChildren(text);
}

/** Shows the rows anew, see {@link rowsShow}, then tells the dialog of the change. */
function rowsChanged(changed: () => void): void {
    rowsShow(changed);
    changed();
}

/** Shows the blocks of the meals picked, then the foods beside them, then the summary. */
function rowsShow(changed: () => void): void {
    foodsRows.replaceChildren(
        ...meals.flatMap((meal: MealPick): HTMLElement[] => mealRowsOf(meal, changed)),
        ...picks.flatMap((pick: FoodPick): HTMLElement[] =>
            foodRowOf(
                pick,
                (): void => {
                    summaryShow();
                    changed();
                },
                (): void => {
                    picks = picks.filter((other: FoodPick): boolean => other !== pick);
                    rowsChanged(changed);
                },
                (): void => rowsChanged(changed),
            ),
        ),
    );
    summaryShow();
}

/**
 * Picks a food from the search as one more food beside the meals, unless picked already,
 * then closes the list and puts the cursor into its grams.
 */
function foodPick(food: Food, changed: () => void): void {
    mineAdd(food);
    let pick: FoodPick | undefined = picks.find(
        (other: FoodPick): boolean => keyOf(other) === keyOf(food),
    );
    if (pick === undefined) {
        pick = pickNewOf(food);
        picks.push(pick);
    }
    rowsChanged(changed);
    foodsClose();
    gramsFocus([pick]);
}

/**
 * Picks one of my meals with its foods at their standard grams, unless picked already.
 * A meal I cooked in the days before comes from the nearest cooking holding it instead,
 * in a meal that draws from none yet,
 * since a cooked meal is eaten only from what I cooked.
 */
function dishPick(dish: Dish, changed: () => void): void {
    const cooking: Cooking | undefined =
        cooked !== ""
            ? undefined
            : cookings.find((one: Cooking): boolean =>
                  one.foods.some(
                      (line: string): boolean =>
                          lineOf(line).meal.toLowerCase() === dish.name.toLowerCase(),
                  ),
              );
    if (cooking !== undefined) {
        cooked = cooking.id;
        drawnShow(changed);
        if (cookedRow !== null) {
            const row: HTMLElement = cookedRowOf(changed);
            cookedRow.replaceWith(row);
            cookedRow = row;
        }
        foodsClose();
        return;
    }
    let meal: MealPick | undefined = meals.find(
        (other: MealPick): boolean =>
            other.name.toLowerCase() === dish.name.toLowerCase(),
    );
    if (meal === undefined) {
        meal = {
            name: dish.name,
            foods: dish.foods.map((line: string, index: number): FoodPick => {
                const standard: number | null = dish.standard[index] ?? null;
                return pickOf(
                    lineOf(line),
                    standard === null ? "" : gramsTextOf(standard),
                );
            }),
        };
        meals.push(meal);
        rowsChanged(changed);
    }
    foodsClose();
    gramsFocus(meal.foods);
}

/**
 * Puts an empty block of a new meal into the entry, named as typed,
 * and opens its own search at once.
 */
function mealNew(name: string, changed: () => void): void {
    const meal: MealPick = { name: name, foods: [], fresh: true };
    meals.push(meal);
    foodsClose();
    rowsChanged(changed);
    blockPluses.get(meal)?.click();
}

/**
 * Keeps a new meal of the entry in `Meals.md` as its foods are now,
 * so it is mine the moment it holds one, whether the entry is saved or not,
 * see `dishAdd` in `reader/food.ts`.
 * With its last food removed it leaves `Meals.md`, which holds no meal without food.
 * Its block removed by its `×`, it stays mine. A meal I had before stays as it is.
 */
function freshSend(meal: MealPick): void {
    if (meal.fresh !== true) return;
    (meal.foods.length === 0
        ? dishDelete(meal.name)
        : dishSend(
              meal.name,
              meal.foods.map(
                  (pick: FoodPick): string => `${pick.name};${pick.brand};${pick.store}`,
              ),
          )
    )
        .then(dishesTake)
        .catch((error: unknown): void => console.error(error));
}

/**
 * Builds my meals as the search of the row `Foods` shows them above my foods,
 * see `dishesFound` in `../food/meals.ts`, a click picking one.
 * Last, while the text typed is no meal of mine nor of this entry, nor a barcode,
 * the plus of a new meal, so Enter takes a meal or food found first,
 * see `firstPick` in `../food/search.ts`.
 */
function dishLinesOf(query: string, changed: () => void): HTMLElement[] {
    const name: string = mealNameOf(query);
    const lines: HTMLElement[] = dishesFound(dishes, query).map(
        (dish: Dish): HTMLElement =>
            listLineOf(
                dishNameOf(dish),
                dish.kcal,
                (): void => dishPick(dish, changed),
                null,
            )[0],
    );
    if (
        name === "" ||
        /^\d{8,14}$/.test(name) ||
        [...dishes, ...meals].some(
            (meal: Dish | MealPick): boolean =>
                meal.name.toLowerCase() === name.toLowerCase(),
        )
    )
        return lines;
    const plus: HTMLButtonElement = buttonOf("picker-new", "", (): void =>
        mealNew(name, changed),
    );
    plus.replaceChildren(iconOf(Plus), `New meal “${name}”`);
    plus.title = "New meal, its foods picked next";
    return [...lines, plus];
}

/**
 * Loads my cookings of the days before a meal that list foods, the nearest first,
 * each with how many other meals of those days and the days after draw from it.
 *
 * @param id - Identifier of the meal when it is changed, empty for a new one,
 *   so it counts not itself
 * @throws {Error} - When the reader cannot answer
 */
async function cookingsLoad(start: Date, id: string): Promise<Cooking[]> {
    const days: number = cookingDays * 24 * 60 * 60 * 1000;
    const from: Date = new Date(start.getTime() - days);
    const until: Date = new Date(start.getTime() + days);
    const entries: (Cooking & { cooked?: string })[] = await readerAsk<
        (Cooking & { cooked?: string })[]
    >(`/api/day/log?start=${from.toISOString()}&end=${until.toISOString()}`);
    return entries
        .filter(
            (entry: Cooking): boolean =>
                entry.category === cookName &&
                entry.foods.length > 0 &&
                Date.parse(entry.start) < start.getTime(),
        )
        .map((cooking: Cooking): Cooking => ({
            ...cooking,
            eaters: entries.filter(
                (entry: Cooking & { cooked?: string }): boolean =>
                    entry.category === foodName &&
                    entry.cooked === cooking.id &&
                    entry.id !== id,
            ).length,
        }))
        .sort((first: Cooking, second: Cooking): number =>
            second.start.localeCompare(first.start),
        );
}

/** Writes a cooking as the list of the cookings offers it: what it was and when. */
function cookingTextOf(cooking: Cooking): string {
    const start: Date = new Date(cooking.start);
    return `${cooking.title} · ${dayTextOf(dayOf(start), true)} ${timeOf(start)}`;
}

/**
 * Puts the meals and foods of the cooking the meal draws from first,
 * in place of those it brought before, each at its share of the pot:
 * the pot shared evenly among every meal drawing from it, this one too,
 * as the reader writes it once saved, see `cookedShare` in `reader/day.ts`.
 */
function drawnShow(changed: () => void): void {
    const cooking: Cooking | undefined = cookings.find(
        (one: Cooking): boolean => one.id === cooked,
    );
    const share: number = 1 / ((cooking?.eaters ?? 0) + 1);
    const drawnMeals: MealPick[] = [];
    const drawn: FoodPick[] = [];
    (cooking?.foods ?? []).forEach((line: string): void => {
        const read: Line = lineOf(line);
        const pot: number | null = numberOf(read.grams);
        const pick: FoodPick = {
            ...pickOf(
                read,
                pot === null || !Number.isFinite(pot)
                    ? read.grams
                    : gramsTextOf(pot * share),
            ),
            fromCooking: true,
        };
        if (read.meal === "") {
            drawn.push(pick);
            return;
        }
        let meal: MealPick | undefined = drawnMeals.find(
            (one: MealPick): boolean => one.name === read.meal,
        );
        if (meal === undefined) {
            meal = { name: read.meal, foods: [], fromCooking: true };
            drawnMeals.push(meal);
        }
        meal.foods.push(pick);
    });
    meals = [
        ...drawnMeals,
        ...meals.filter(
            (meal: MealPick): boolean =>
                meal.fromCooking !== true &&
                !drawnMeals.some((other: MealPick): boolean => other.name === meal.name),
        ),
    ];
    picks = [
        ...drawn,
        ...picks.filter(
            (pick: FoodPick): boolean =>
                pick.fromCooking !== true &&
                !drawn.some((other: FoodPick): boolean => keyOf(other) === keyOf(pick)),
        ),
    ];
    rowsChanged(changed);
}

/**
 * Builds the row `Cooked`: a small grey plus beside its name while none is picked,
 * whose list offers my cookings of the days before the meal, the nearest first.
 * Picked, the cooking shows in the line and its foods come along, see {@link drawnShow}.
 * Picking it again takes it back with its foods.
 */
function cookedRowOf(changed: () => void): HTMLElement {
    const textOf: (id: string) => string = (id: string): string => {
        const cooking: Cooking | undefined = cookings.find(
            (one: Cooking): boolean => one.id === id,
        );
        return cooking === undefined
            ? "A cooking of another day"
            : cookingTextOf(cooking);
    };
    return rowOf(
        "Cooked",
        choicesOf({
            search: searchOf(
                cookings.map((cooking: Cooking): Choice => ({
                    value: cooking.id,
                    text: cookingTextOf(cooking),
                    group: "",
                })),
            ),
            picked: cooked === "" ? [] : [cooked],
            many: false,
            adding: false,
            empty: "Draw from a cooking",
            plus: true,
            besideName: true,
            textOf: textOf,
            pick: (picked: string[]): void => {
                if ((picked[0] ?? "") === cooked) return;
                cooked = picked[0] ?? "";
                drawnShow(changed);
            },
        }),
    );
}

/** Gives the identifier of the cooking the meal draws from, empty for none. */
export function mealCooked(): string {
    return cooked;
}

/**
 * Builds the meal, see the top of this file, with the foods it lists already,
 * after loading my foods and my meals: the rows of its summary and its foods.
 * The lines `X-FOOD` of a meal go to its meal, by the meal they carry.
 * A meal whose summary names more than its foods takes all its foods as that one meal.
 *
 * @param drawing - The cooking a meal draws from and its start,
 *   `null` for a cooking, which shows its summary and its foods
 * @returns The rows, to put into the dialog in place of the summary
 * @throws {Error} - When the reader cannot answer
 */
export async function mealOf(
    lines: string[],
    title: string,
    changed: () => void,
    drawing: Drawing | null,
): Promise<HTMLElement[]> {
    const [found, mealsMine, cooks]: [FoodsFound, Dish[], Cooking[]] = await Promise.all([
        foodsFind("", 1, false),
        dishesLoad(),
        drawing === null ? Promise.resolve([]) : cookingsLoad(drawing.start, drawing.id),
    ]);
    dishes = mealsMine;
    cookings = cooks;
    cooked = drawing?.cooked ?? "";
    mine = new Map();
    found.foods.forEach(mineAdd);
    foodOpen = "";
    meals = [];
    picks = [];
    lines.map(lineOf).forEach((read: Line): void => {
        if (read.meal === "") {
            picks.push(pickOf(read, read.grams));
            return;
        }
        let last: MealPick | undefined = meals.at(-1);
        if (last === undefined || last.name !== read.meal) {
            last = { name: read.meal, foods: [] };
            meals.push(last);
        }
        last.foods.push(pickOf(read, read.grams));
    });
    if (
        drawing !== null &&
        meals.length === 0 &&
        picks.length > 0 &&
        title.trim() !== "" &&
        title.trim().toLowerCase() !== mealTitle().toLowerCase()
    ) {
        meals = [{ name: title.trim(), foods: picks }];
        picks = [];
    }
    const drawnLines: Line[] = (
        cookings.find((one: Cooking): boolean => one.id === cooked)?.foods ?? []
    ).map(lineOf);
    const brought: Set<string> = new Set(
        drawnLines.filter((read: Line): boolean => read.meal === "").map(keyOf),
    );
    const broughtMeals: Set<string> = new Set(
        drawnLines.map((read: Line): string => read.meal),
    );
    picks.forEach((pick: FoodPick): void => {
        pick.fromCooking = brought.has(keyOf(pick));
    });
    meals.forEach((meal: MealPick): void => {
        meal.fromCooking = broughtMeals.has(meal.name);
    });

    summaryLine = elementOf("span", "", "");
    gramsFields = new WeakMap();
    blockPluses = new WeakMap();
    const foodsLine: HTMLButtonElement = document.createElement("button");
    plusPut(foodsLine, "Add a meal or a food");
    foodsRows = elementOf("div", "meal-rows", "");
    const foodsSearch: HTMLElement = foodSearchOf({
        pick: (food: Food): void => foodPick(food, changed),
        meals: (query: string): HTMLElement[] => dishLinesOf(query, changed),
        products: true,
        nothing: nothingFound,
    });
    const foodsBox: HTMLElement = elementOf("div", "picker-box meal-box", "");
    foodsBox.append(foodsSearch);
    // The row `Foods`: its name with the plus that opens the list,
    // then the blocks and rows picked.
    const picker: HTMLElement = elementOf("div", "meal picker", "");
    foodsLine.classList.add("picker-line");
    foodsClose = listOf(
        picker,
        foodsLine,
        foodsBox,
        (): void => {
            foodSearchClear(foodsSearch);
            foodsSearch.querySelector("input")?.focus();
        },
        (): void => {},
    );
    picker.append(foodsRows, foodsBox);
    const foodsRow: HTMLElement = rowOf("Foods", picker);
    foodsRow.querySelector(".entry-name")?.append(foodsLine);
    rowsShow(changed);
    const summaryRow: HTMLDivElement = rowOf("Summary", summaryLine);
    summaryRow.classList.add("panel-fixed");
    cookedRow = drawing === null ? null : cookedRowOf(changed);
    if (cookedRow === null) return [summaryRow, foodsRow];
    return [summaryRow, cookedRow, foodsRow];
}

/**
 * Writes a food picked as a line `X-FOOD` without a meal,
 * so every line says which product it was and how much.
 */
function lineTextOf(pick: FoodPick): string {
    return `${pick.name};${pick.brand};${pick.store};${pick.grams.replace(",", ".")}`;
}

/**
 * Gives the meal as lines `X-FOOD`, the foods of each meal with its name, then the rest.
 * A food at 0 g is left out, since I did not eat it.
 */
export function mealFoods(): string[] {
    const eaten: (pick: FoodPick) => boolean = (pick: FoodPick): boolean =>
        numberOf(pick.grams) !== 0;
    return [
        ...meals.flatMap((meal: MealPick): string[] =>
            meal.foods
                .filter(eaten)
                .map((pick: FoodPick): string => `${lineTextOf(pick)};${meal.name}`),
        ),
        ...picks.filter(eaten).map(lineTextOf),
    ];
}

/**
 * Gives the summary: the names of the meals that hold a food,
 * then of the foods beside them, parted by `, `, drinks left out,
 * whose kcal still count, see `summaryOf` in `../food/foods.ts`.
 */
export function mealTitle(): string {
    return summaryOf([
        ...meals
            .filter((meal: MealPick): boolean => meal.foods.length > 0)
            .map((meal: MealPick): { name: string; kind: Kind } => ({
                name: meal.name,
                kind: "Eat",
            })),
        ...picks.map((pick: FoodPick): { name: string; kind: Kind } => ({
            name: pick.name,
            kind: foodOf(pick)?.kind ?? "Eat",
        })),
    ]);
}
