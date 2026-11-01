/**
 * ## Meal in the entry by category
 *
 * A meal of the log, `Food`, in rows of the dialog, nothing nested:
 * - Summary: what I ate, written by itself, and in brackets its kcal, drinks too.
 * - Foods: one plus opens one search of my meals, my foods, then Open Food Facts.
 *   A meal brings its block with its foods indented, a food its row.
 *   Grams start at one portion, an empty field counts nothing.
 *   Amounts are estimates anyway, so none is marked as one.
 * A meal block has its own plus, which adds a food from the same search without my meals.
 * Each food is a line `X-FOOD`, so the log keeps what the meal held that day,
 * whatever I change in `Meals.md` later.
 * A meal whose summary names more than its foods opens as that one meal, so its name stays.
 * A cooking, `Cook`, lists what went into the pot in the same rows and counts no kcal.
 * A meal may draw from a cooking of the days before, written as `X-COOKED`,
 * its foods as its own lines, so meal and cooking each keep their foods.
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
import { foodDetailOf, foodSearchClear, foodSearchOf, listLineOf } from "../food/search.ts";
import { crossPut, iconOf, iconPut, plusPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Pencil, Plus } from "lucide";

import type { Choice } from "./choices.ts";
import type { Dish } from "../food/foods.ts";
import type { Food, FoodsFound, Kind } from "../../reader/food.ts";

/**
 * A food picked, beside the meals or in one.
 * - `grams`: As typed, empty counts nothing.
 * - `fromCooking`: It came with the cooking the meal draws from.
 */
type FoodPick = {
    name: string;
    brand: string;
    store: string;
    grams: string;
    fromCooking?: boolean;
};

/** A line `X-FOOD` in its parts, brand and store empty in an old line. */
export type Line = {
    name: string;
    brand: string;
    store: string;
    grams: string;
    meal: string;
};

/**
 * A cooking a meal may draw from.
 * - `foods`: Its lines `X-FOOD`, what went into the pot.
 * - `eaters`: How many other meals share it already.
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
 * What a meal needs to draw from a cooking.
 * - `cooked`: Its `X-COOKED`, empty for none.
 * - `id`: The meal changed, empty for a new one, so it does not count itself as a sharer.
 */
export type Drawing = {
    cooked: string;
    start: Date;
    id: string;
};

/**
 * A meal of mine picked, with its foods.
 * - `fromCooking`: It came with the cooking the meal draws from.
 * - `fresh`: A new meal, named in this entry.
 */
type MealPick = {
    name: string;
    foods: FoodPick[];
    fromCooking?: boolean;
    fresh?: boolean;
};

/** Category of meals. */
export const foodName: string = "Food";

/** Category of cookings, whose foods count nothing. */
export const cookName: string = "Cook";

/** Days back a meal may draw a cooking from, since I eat nothing cooked longer ago. */
const cookingDays: number = 3;

const nothingFound: string = "Nothing found";

/** My cookings of the days before the meal that list foods, the nearest first. */
let cookings: Cooking[] = [];

/** The cooking the meal draws from, empty for none. */
let cooked: string = "";

/** The row `Cooked`, so a meal picked can show its cooking, `null` in a cooking. */
let cookedRow: HTMLElement | null = null;

/** My foods by key, and by name alone in small letters for old lines without brand and store. */
let mine: Map<string, Food> = new Map();

/** Key of the food opened below its row by its pencil, empty for none. */
let foodOpen: string = "";

/** My meals of `Meals.md`. */
let dishes: Dish[] = [];

let meals: MealPick[] = [];

/** Foods picked beside the meals. */
let picks: FoodPick[] = [];

/** The summary, then the kcal of the whole meal. */
let summaryLine: HTMLElement = document.createElement("span");

/** The meal blocks, then the foods beside them. */
let foodsRows: HTMLElement = document.createElement("div");

/** Closes the list of the row `Foods`. */
let foodsClose: () => void = (): void => {};

/** The grams field of each food, so the cursor finds the food just picked. */
let gramsFields: WeakMap<FoodPick, HTMLInputElement> = new WeakMap();

/** The plus of each meal block, so a new meal opens its search at once. */
let blockPluses: WeakMap<MealPick, HTMLButtonElement> = new WeakMap();

function dishesTake(all: Dish[]): void {
    dishes = all;
}

/** Keeps a food by its key, and by its name unless a food of that name came first. */
function mineAdd(food: Food): void {
    mine.set(keyOf(food), food);
    if (!mine.has(food.name.toLowerCase())) mine.set(food.name.toLowerCase(), food);
}

function pickOf(read: Pick<Line, "name" | "brand" | "store">, grams: string): FoodPick {
    return { name: read.name, brand: read.brand, store: read.store, grams: grams };
}

/** Grams to one decimal at most. */
function gramsTextOf(grams: number): string {
    return String(Math.round(grams * 10) / 10);
}

/** A food picked newly, its grams one portion, empty without one. */
function pickNewOf(food: Food): FoodPick {
    return pickOf(food, food.portion === null ? "" : gramsTextOf(food.portion));
}

/** The food of mine of a pick, by its name alone when it has no brand and store. */
function foodOf(pick: FoodPick): Food | undefined {
    return (
        mine.get(keyOf(pick)) ??
        (pick.brand === "" && pick.store === "" ? mine.get(pick.name.toLowerCase()) : undefined)
    );
}

function gramsIs(part: string): boolean {
    return /^~?\s*\d+(?:[.,]\d+)?$/.test(part);
}

/**
 * A line `X-FOOD` in its parts, as the reader reads it.
 * Today `name;brand;store;grams;meal`, told by a second part that is no grams.
 * In `Meals.md` only `name;brand;store`.
 * An old line is `name;grams;meal`, its servings and variant after it no longer count.
 */
export function lineOf(line: string): Line {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    if ((parts.length === 4 || parts.length === 5) && !gramsIs(parts[1]) && (parts[3] === "" || gramsIs(parts[3])))
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
 * A number as typed, a comma as a point, `null` for empty, `NaN` for no number.
 * A `~` before it marks grams guessed from a photo and is left out.
 */
function numberOf(text: string): number | null {
    return text === "" ? null : Number(text.replace(/^~\s*/, "").replace(",", "."));
}

/** Kcal of a food picked, 0 for one not in `Foods.md` or without grams. */
function kcalOf(pick: FoodPick): number {
    const counted: number = numberOf(pick.grams) ?? 0;
    return Number.isFinite(counted) ? (counted / 100) * (foodOf(pick)?.kcal ?? 0) : 0;
}

function mealKcalOf(meal: MealPick): number {
    return meal.foods.reduce((sum: number, pick: FoodPick): number => sum + kcalOf(pick), 0);
}

/** Portions typed as grams, any other text as it is. */
function portionsOf(text: string, portion: number | null): string {
    const grams: number | null = portionGramsOf(text, portion);
    return grams === null ? text : gramsTextOf(grams);
}

/**
 * The grams field of a food with its unit, selected on click so I type over it.
 * Portions typed become grams on leaving or Enter.
 * It is invalid while no number of 0 or more, so the dialog does not send it.
 * 0 is a food I left out this time.
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
            number === null || number >= 0 || portionsOf(input.value, portion) !== input.value
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
 * Takes a food of mine changed in the dialog, its picks renamed with it.
 * My meals load anew, since the reader renamed it in them.
 */
function foodTake(old: Food, written: Food): void {
    const renamed: FoodPick[] = [...picks, ...meals.flatMap((meal: MealPick): FoodPick[] => meal.foods)].filter(
        (pick: FoodPick): boolean => foodOf(pick) === old,
    );
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
 * The row of a food, its name without brand and store, its grams, kcal and `×`.
 * A name not in `Foods.md` is marked.
 * The pencil of a food of mine opens it below its row, as the food view does.
 * A change shows the rows anew, the food staying open and the cursor where I went on.
 *
 * @returns Row, and the food opened below it
 */
function foodRowOf(pick: FoodPick, typed: () => void, removed: () => void, renewed: () => void): HTMLElement[] {
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
                foodsRows.querySelector<HTMLInputElement>(`.food-detail input[aria-label="${typing}"]`)?.focus();
        });
    let detail: HTMLElement | null = food !== undefined && foodOpen === keyOf(food) ? detailFor(food) : null;

    if (food === undefined) name.append(elementOf("span", "meal-unknown", " · not in my foods"));
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

/** Cursor into the first empty grams of foods just picked, since those I type first, else the first. */
function gramsFocus(picked: FoodPick[]): void {
    const first: FoodPick | undefined = picked.find((pick: FoodPick): boolean => pick.grams === "") ?? picked[0];
    if (first !== undefined) gramsFields.get(first)?.focus();
}

/**
 * A meal block, its name with a plus, its kcal and `×`, its foods indented below.
 * A food added goes into this entry only, never into `Meals.md`.
 * The meal goes with its last food.
 */
function mealRowsOf(meal: MealPick, changed: () => void): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const kcal: HTMLElement = elementOf("span", "meal-kcal", kcalTextOf(mealKcalOf(meal)));
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
                    meal.foods = meal.foods.filter((other: FoodPick): boolean => other !== pick);
                    freshSend(meal);
                    meals = meals.filter((other: MealPick): boolean => other.foods.length > 0);
                    rowsChanged(changed);
                },
                (): void => rowsChanged(changed),
            ),
        ),
        box,
    );
    return [row, parts];
}

/** The summary and in brackets the kcal of the meal, none while no food has grams. */
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

function rowsChanged(changed: () => void): void {
    rowsShow(changed);
    changed();
}

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

/** Picks a food beside the meals unless picked already, the cursor into its grams. */
function foodPick(food: Food, changed: () => void): void {
    mineAdd(food);
    let pick: FoodPick | undefined = picks.find((other: FoodPick): boolean => keyOf(other) === keyOf(food));
    if (pick === undefined) {
        pick = pickNewOf(food);
        picks.push(pick);
    }
    rowsChanged(changed);
    foodsClose();
    gramsFocus([pick]);
}

/**
 * Picks one of my meals at its standard grams unless picked already.
 * A meal cooked in the days before comes from the nearest cooking instead,
 * since a cooked meal is eaten only from what I cooked.
 */
function dishPick(dish: Dish, changed: () => void): void {
    const cooking: Cooking | undefined =
        cooked !== ""
            ? undefined
            : cookings.find((one: Cooking): boolean =>
                  one.foods.some(
                      (line: string): boolean => lineOf(line).meal.toLowerCase() === dish.name.toLowerCase(),
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
        (other: MealPick): boolean => other.name.toLowerCase() === dish.name.toLowerCase(),
    );
    if (meal === undefined) {
        meal = {
            name: dish.name,
            foods: dish.foods.map((line: string, index: number): FoodPick => {
                const standard: number | null = dish.standard[index] ?? null;
                return pickOf(lineOf(line), standard === null ? "" : gramsTextOf(standard));
            }),
        };
        meals.push(meal);
        rowsChanged(changed);
    }
    foodsClose();
    gramsFocus(meal.foods);
}

/** An empty block of a new meal named as typed, its search open at once. */
function mealNew(name: string, changed: () => void): void {
    const meal: MealPick = { name: name, foods: [], fresh: true };
    meals.push(meal);
    foodsClose();
    rowsChanged(changed);
    blockPluses.get(meal)?.click();
}

/**
 * Keeps a new meal in `Meals.md` the moment it holds a food, saved entry or not.
 * Without food it leaves, since `Meals.md` holds no meal without food.
 * Removed by its `×`, it stays mine.
 */
function freshSend(meal: MealPick): void {
    if (meal.fresh !== true) return;
    (meal.foods.length === 0
        ? dishDelete(meal.name)
        : dishSend(
              meal.name,
              meal.foods.map((pick: FoodPick): string => `${pick.name};${pick.brand};${pick.store}`),
          )
    )
        .then(dishesTake)
        .catch((error: unknown): void => console.error(error));
}

/**
 * My meals found in the search of `Foods`.
 * Last the plus of a new meal, while the text is no meal yet nor a barcode.
 * It comes last so Enter takes a meal or food found first.
 */
function dishLinesOf(query: string, changed: () => void): HTMLElement[] {
    const name: string = mealNameOf(query);
    const lines: HTMLElement[] = dishesFound(dishes, query).map(
        (dish: Dish): HTMLElement =>
            listLineOf(dishNameOf(dish), dish.kcal, (): void => dishPick(dish, changed), null)[0],
    );
    if (
        name === "" ||
        /^\d{8,14}$/.test(name) ||
        [...dishes, ...meals].some((meal: Dish | MealPick): boolean => meal.name.toLowerCase() === name.toLowerCase())
    )
        return lines;
    const plus: HTMLButtonElement = buttonOf("picker-new", "", (): void => mealNew(name, changed));
    plus.replaceChildren(iconOf(Plus), `New meal “${name}”`);
    plus.title = "New meal, its foods picked next";
    return [...lines, plus];
}

/**
 * My cookings with foods of the days before a meal, the nearest first,
 * each with how many other meals draw from it.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function cookingsLoad(start: Date, id: string): Promise<Cooking[]> {
    const days: number = cookingDays * 24 * 60 * 60 * 1000;
    const from: Date = new Date(start.getTime() - days);
    const until: Date = new Date(start.getTime() + days);
    const entries: (Cooking & { cooked?: string })[] = await readerAsk<(Cooking & { cooked?: string })[]>(
        `/api/day/log?start=${from.toISOString()}&end=${until.toISOString()}`,
    );
    return entries
        .filter(
            (entry: Cooking): boolean =>
                entry.category === cookName && entry.foods.length > 0 && Date.parse(entry.start) < start.getTime(),
        )
        .map((cooking: Cooking): Cooking => ({
            ...cooking,
            eaters: entries.filter(
                (entry: Cooking & { cooked?: string }): boolean =>
                    entry.category === foodName && entry.cooked === cooking.id && entry.id !== id,
            ).length,
        }))
        .sort((first: Cooking, second: Cooking): number => second.start.localeCompare(first.start));
}

/** A cooking as what it was and when. */
function cookingTextOf(cooking: Cooking): string {
    const start: Date = new Date(cooking.start);
    return `${cooking.title} · ${dayTextOf(dayOf(start), true)} ${timeOf(start)}`;
}

/**
 * Puts the meals and foods of the cooking drawn from first, in place of those it brought.
 * Each is at its even share of the pot among every meal drawing from it, as the reader writes it.
 */
function drawnShow(changed: () => void): void {
    const cooking: Cooking | undefined = cookings.find((one: Cooking): boolean => one.id === cooked);
    const share: number = 1 / ((cooking?.eaters ?? 0) + 1);
    const drawnMeals: MealPick[] = [];
    const drawn: FoodPick[] = [];
    (cooking?.foods ?? []).forEach((line: string): void => {
        const read: Line = lineOf(line);
        const pot: number | null = numberOf(read.grams);
        const pick: FoodPick = {
            ...pickOf(read, pot === null || !Number.isFinite(pot) ? read.grams : gramsTextOf(pot * share)),
            fromCooking: true,
        };
        if (read.meal === "") {
            drawn.push(pick);
            return;
        }
        let meal: MealPick | undefined = drawnMeals.find((one: MealPick): boolean => one.name === read.meal);
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
                meal.fromCooking !== true && !drawnMeals.some((other: MealPick): boolean => other.name === meal.name),
        ),
    ];
    picks = [
        ...drawn,
        ...picks.filter(
            (pick: FoodPick): boolean =>
                pick.fromCooking !== true && !drawn.some((other: FoodPick): boolean => keyOf(other) === keyOf(pick)),
        ),
    ];
    rowsChanged(changed);
}

/**
 * The row `Cooked`, a grey plus beside its name offering my cookings.
 * A cooking picked brings its foods, picked again it takes them back.
 */
function cookedRowOf(changed: () => void): HTMLElement {
    const textOf: (id: string) => string = (id: string): string => {
        const cooking: Cooking | undefined = cookings.find((one: Cooking): boolean => one.id === id);
        return cooking === undefined ? "A cooking of another day" : cookingTextOf(cooking);
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

/** The cooking the meal draws from, empty for none. */
export function mealCooked(): string {
    return cooked;
}

/**
 * The rows of a meal, its summary and its foods, its lines grouped by the meal they carry.
 * A meal whose summary names more than its foods takes them all as that one meal.
 *
 * @param drawing - `null` for a cooking, which draws from none
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
    const drawnLines: Line[] = (cookings.find((one: Cooking): boolean => one.id === cooked)?.foods ?? []).map(lineOf);
    const brought: Set<string> = new Set(drawnLines.filter((read: Line): boolean => read.meal === "").map(keyOf));
    const broughtMeals: Set<string> = new Set(drawnLines.map((read: Line): string => read.meal));
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

/** A food picked as a line `X-FOOD` without a meal. */
function lineTextOf(pick: FoodPick): string {
    return `${pick.name};${pick.brand};${pick.store};${pick.grams.replace(",", ".")}`;
}

/** The meal as lines `X-FOOD`, a food at 0 g left out since I did not eat it. */
export function mealFoods(): string[] {
    const eaten: (pick: FoodPick) => boolean = (pick: FoodPick): boolean => numberOf(pick.grams) !== 0;
    return [
        ...meals.flatMap((meal: MealPick): string[] =>
            meal.foods.filter(eaten).map((pick: FoodPick): string => `${lineTextOf(pick)};${meal.name}`),
        ),
        ...picks.filter(eaten).map(lineTextOf),
    ];
}

/** The summary, the names of the meals with food and of the foods beside them, drinks left out. */
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
