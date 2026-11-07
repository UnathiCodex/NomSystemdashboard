/**
 * ## Meal in the entry by category
 *
 * A meal of the log picks my meals and my foods by name in its summary as the plan does.
 * Each value has its kcal in brackets as its param, none while it has no grams.
 * Its pencil shows below the summary how much of each food, as `With` shows its people.
 * A meal shows its foods indented below its name.
 * Its plus adds a food from my foods, then from Open Food Facts.
 * Grams start at one portion, an empty field counting nothing.
 * Amounts are estimates anyway, so none is marked as one.
 * A value picked shows its grams at once, a new name being a new meal with its search open.
 * A name left out takes its meal or its foods away.
 * Each food is a line `X-FOOD`, so the log keeps what the meal held that day,
 * whatever I change in `Meals.md` later.
 * A meal whose summary names more than its foods opens as that one meal, so its name stays.
 * A cooking, `Cook`, lists what went into the pot in the same rows and counts no kcal.
 * A meal may draw from a cooking before it on its day or the day before, written as `X-COOKED`,
 * its foods as its own lines, so meal and cooking each keep their foods.
 * A box of a meal or a cooking finds its summary in my meals and foods, only once I type, as the log does.
 * Each is its own value, so foods never show as one meal.
 */

import { choiceOf, choicesOf, listOf, rowOf, searchOf } from "./choices.ts";
import { timeOf } from "./times.ts";
import { dayAdd, dayOf, dayTextOf } from "../skill/attempts.ts";
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
import { dishesFound, mealNameOf } from "../food/meals.ts";
import { foodSearchClear, foodSearchOf } from "../food/search.ts";
import { crossPut, iconPut, plusPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { Pencil } from "lucide";

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

const nothingFound: string = "Nothing found";

/** My cookings before the meal on its day or the day before that list foods, the nearest first. */
let cookings: Cooking[] = [];

/** The cooking the meal draws from, empty for none. */
let cooked: string = "";

/** The row `Cooked`, so a meal picked can show its cooking, `null` in a cooking. */
let cookedRow: HTMLElement | null = null;

/** My foods by key, and by name alone in small letters for old lines without brand and store. */
let mine: Map<string, Food> = new Map();

/** My meals of `Meals.md`. */
let dishes: Dish[] = [];

let meals: MealPick[] = [];

/** Foods picked beside the meals. */
let picks: FoodPick[] = [];

/** The picker of the summary. */
let summaryPicker: HTMLElement = document.createElement("div");

/** The values the picker of the summary shows, so it shows anew only when the foods change them. */
let summaryValues: string[] = [];

/** The values of the summary in the order I picked them, as its lines `X-FOOD` hold them. */
let order: string[] = [];

/** The kcal shown after each value of the summary, so typing grams changes them in place. */
let kcalShown: Map<string, HTMLElement> = new Map();

/** The values whose grams show, opened by their pencil. */
let opened: string[] = [];

/** The grams of the values opened, each meal with its foods, each food alone. */
let partsRows: HTMLElement = document.createElement("div");

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
    input.placeholder = "0";
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
 * The row of a food, its name without brand and store, its grams, kcal and `×`.
 * A name not in `Foods.md` is marked.
 * Only how much I ate changes here, the food itself only in the food view.
 */
function foodRowOf(pick: FoodPick, typed: () => void, removed: () => void): HTMLElement {
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

    if (food === undefined) name.append(elementOf("span", "meal-unknown", " · not in my foods"));
    name.title = name.textContent ?? "";
    gramsFields.set(pick, input);
    crossPut(remove, `Remove ${pick.name}`);
    row.append(name, grams, kcal, remove);
    return row;
}

/** Cursor into the first empty grams of foods just picked, since those I type first, else the first. */
function gramsFocus(picked: FoodPick[]): void {
    const first: FoodPick | undefined = picked.find((pick: FoodPick): boolean => pick.grams === "") ?? picked[0];
    if (first !== undefined) gramsFields.get(first)?.focus();
}

/**
 * A meal opened by its pencil, its foods indented below its name.
 * Its name has its plus, after it stand its kcal with its `×`.
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
        ...meal.foods.map((pick: FoodPick): HTMLElement =>
            foodRowOf(
                pick,
                (): void => {
                    kcal.textContent = kcalTextOf(mealKcalOf(meal));
                    summaryShow(changed);
                    changed();
                },
                (): void => {
                    meal.foods = meal.foods.filter((other: FoodPick): boolean => other !== pick);
                    freshSend(meal);
                    meals = meals.filter((other: MealPick): boolean => other.foods.length > 0);
                    rowsChanged(changed);
                },
            ),
        ),
        box,
    );
    return [row, parts];
}

/**
 * The values of the summary in the order I picked them, each once.
 * Each meal by its name, each food beside them by its key, so two foods of one name stay apart.
 * One that came is added last, one that went is left out, so the summary never moves.
 */
function valuesOf(): string[] {
    const present: Set<string> = new Set([
        ...meals.map((meal: MealPick): string => meal.name),
        ...picks.map((pick: FoodPick): string => keyOf(pick)),
    ]);
    order = [...new Set([...order, ...present])].filter((value: string): boolean => present.has(value));
    return order;
}

/**
 * A value of the summary as its list shows it while nothing is typed, as the search shows it.
 * A meal shows its short title in brackets.
 * A food shows its brand and store there.
 */
function pickedChoiceOf(value: string): Choice {
    const pick: FoodPick | undefined = picks.find((one: FoodPick): boolean => keyOf(one) === value);
    if (pick === undefined)
        return {
            ...choiceOf(value),
            group: "Meals",
            brackets: dishes.find((dish: Dish): boolean => dish.name === value)?.short ?? "",
        };
    return {
        value: value,
        text: pick.name,
        group: "Foods",
        brackets: [pick.brand, pick.store].filter((part: string): boolean => part !== "").join(", "),
    };
}

/** The name a value of the summary shows, a meal its own, a food that of the food. */
function valueTextOf(value: string): string {
    return picks.find((pick: FoodPick): boolean => keyOf(pick) === value)?.name ?? mine.get(value)?.name ?? value;
}

/** The foods a value of the summary stands for. */
function foodsOfValue(value: string): FoodPick[] {
    return [
        ...meals.filter((meal: MealPick): boolean => meal.name === value).flatMap((meal: MealPick) => meal.foods),
        ...picks.filter((pick: FoodPick): boolean => keyOf(pick) === value),
    ];
}

/** The kcal of a value of the summary in brackets, none while none of its foods has grams. */
function kcalTextFor(value: string): string {
    const foods: FoodPick[] = foodsOfValue(value);
    if (!foods.some((pick: FoodPick): boolean => numberOf(pick.grams) !== null)) return "";
    return `(${kcalTextOf(foods.reduce((sum: number, pick: FoodPick): number => sum + kcalOf(pick), 0))})`;
}

/**
 * What stands after a value of the summary, its kcal as its param, then its pencil.
 * The pencil shows or hides its grams below the summary, taking no focus, as the pencil of a person.
 */
function valueAfterOf(value: string, changed: () => void): HTMLElement {
    const all: HTMLSpanElement = document.createElement("span");
    const kcal: HTMLElement = elementOf("span", "value-param", kcalTextFor(value));
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, `Change ${valueTextOf(value)}`);
    pencil.addEventListener("mousedown", (event: MouseEvent): void => event.preventDefault());
    pencil.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        opened = opened.includes(value)
            ? opened.filter((other: string): boolean => other !== value)
            : [...opened, value];
        rowsShow(changed);
    });
    kcalShown.set(value, kcal);
    all.append(kcal, pencil);
    return all;
}

/**
 * The picker of the summary as in a box of the plan.
 * It picks my meals by name, my foods by key.
 * A new name is a new meal, written as the reader writes the name of a meal.
 */
function summaryPickerOf(changed: () => void): HTMLElement {
    const search: (text: string) => Promise<Choice[]> = summarySearchOf(foodName, [], keyOf);
    return choicesOf({
        search: async (text: string): Promise<Choice[]> =>
            text.trim() === "" ? valuesOf().map(pickedChoiceOf) : await search(text),
        picked: summaryValues,
        many: true,
        adding: true,
        add: async (text: string): Promise<string | null> => mealNameOf(text) || null,
        newTextOf: (text: string): string => `New meal “${mealNameOf(text)}”`,
        noun: "summary",
        textOf: valueTextOf,
        linkOf: (): string => "",
        afterOf: (value: string): HTMLElement => valueAfterOf(value, changed),
        below: [partsRows],
        pick: (values: string[]): void => summaryPick(values, changed),
    });
}

/**
 * Takes the values picked in the summary.
 * A value left out takes its meal or its food away.
 * A value come is my meal, else my food by its key, else my food by the name typed.
 * Any other is a new meal, its grams shown at once.
 */
function summaryPick(values: string[], changed: () => void): void {
    const gone: string[] = summaryValues.filter((value: string): boolean => !values.includes(value));
    const come: string[] = values.filter((value: string): boolean => !summaryValues.includes(value));
    summaryValues = values;
    meals = meals.filter((meal: MealPick): boolean => !gone.includes(meal.name));
    picks = picks.filter((pick: FoodPick): boolean => !gone.includes(keyOf(pick)));
    opened = [...opened.filter((value: string): boolean => values.includes(value)), ...come];
    if (come.length === 0) rowsChanged(changed);
    come.forEach((value: string): void => {
        const dish: Dish | undefined = dishes.find(
            (one: Dish): boolean => one.name.toLowerCase() === value.toLowerCase(),
        );
        const food: Food | undefined = mine.get(value.toLowerCase());
        if (dish !== undefined) dishPick(dish, changed);
        else if (food !== undefined) foodPick(food, changed);
        else mealNew(value, changed);
    });
}

/**
 * Shows the kcal of each value of the summary anew.
 * The picker shows anew only when the foods changed the values it shows, so a list I pick in stays open.
 */
function summaryShow(changed: () => void): void {
    kcalShown.forEach((kcal: HTMLElement, value: string): void => {
        kcal.textContent = kcalTextFor(value);
    });
    if (valuesOf().join("\n") === summaryValues.join("\n")) return;
    summaryValues = valuesOf();
    opened = opened.filter((value: string): boolean => summaryValues.includes(value));
    kcalShown = new Map();
    const picker: HTMLElement = summaryPickerOf(changed);
    summaryPicker.replaceWith(picker);
    summaryPicker = picker;
}

function rowsChanged(changed: () => void): void {
    rowsShow(changed);
    changed();
}

/** Shows the grams of the values opened, in the order of the summary. */
function rowsShow(changed: () => void): void {
    partsRows.replaceChildren(
        ...valuesOf()
            .filter((value: string): boolean => opened.includes(value))
            .flatMap((value: string): HTMLElement[] => [
                ...meals
                    .filter((meal: MealPick): boolean => meal.name === value)
                    .flatMap((meal: MealPick): HTMLElement[] => mealRowsOf(meal, changed)),
                ...picks
                    .filter((pick: FoodPick): boolean => keyOf(pick) === value)
                    .map((pick: FoodPick): HTMLElement =>
                        foodRowOf(
                            pick,
                            (): void => {
                                summaryShow(changed);
                                changed();
                            },
                            (): void => {
                                picks = picks.filter((other: FoodPick): boolean => other !== pick);
                                rowsChanged(changed);
                            },
                        ),
                    ),
            ]),
    );
    summaryShow(changed);
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
    gramsFocus([pick]);
}

/**
 * Picks one of my meals at its standard grams unless picked already.
 * A meal cooked today or the day before comes from the nearest cooking instead,
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
    gramsFocus(meal.foods);
}

/** An empty block of a new meal named as typed, its search open at once. */
function mealNew(name: string, changed: () => void): void {
    const meal: MealPick = { name: name, foods: [], fresh: true };
    meals.push(meal);
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
 * The search of the summary of a box or a meal.
 * For `Food` and `Cook` it finds my meals, then my foods by their names, each its own value.
 * A meal shows its short title in brackets as in the food view.
 * A food shows its brand and store there.
 * It finds them only once I type, since I search what I eat, not what I ate before.
 *
 * @param valueOf - The value of a food, its name in a box, whose summary only names it
 */
export function summarySearchOf(
    category: string,
    values: string[],
    valueOf: (food: Food) => string = (food: Food): string => food.name,
): (text: string) => Promise<Choice[]> {
    if (![foodName, cookName].includes(category)) return searchOf(values.map(choiceOf));
    return async (text: string): Promise<Choice[]> => {
        if (text.trim() === "") return [];
        const [mealsMine, found]: [Dish[], FoodsFound] = await Promise.all([dishesLoad(), foodsFind("", 1, false)]);
        const foods: Food[] = found.foods.filter(
            (food: Food, index: number, all: Food[]): boolean =>
                matchesAll(food.name, wordsOf(text)) &&
                all.findIndex((other: Food): boolean => valueOf(other) === valueOf(food)) === index,
        );
        return [
            ...dishesFound(mealsMine, text).map((dish: Dish): Choice => ({
                ...choiceOf(dish.name),
                group: "Meals",
                brackets: dish.short,
            })),
            ...foods.map((food: Food): Choice => ({
                value: valueOf(food),
                text: food.name,
                group: "Foods",
                brackets: [food.brand, food.store].filter((part: string): boolean => part !== "").join(", "),
            })),
        ];
    };
}

/**
 * My cookings with foods before a meal on its day or the day before, the nearest first,
 * each with how many other meals draw from it.
 * The log is read until the end of the day after the meal, the last day a meal may draw from them.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function cookingsLoad(start: Date, id: string): Promise<Cooking[]> {
    const day: string = dayOf(start);
    const from: Date = new Date(`${dayAdd(day, -1)}T00:00`);
    const until: Date = new Date(`${dayAdd(day, 2)}T00:00`);
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
    order = [...drawnMeals.map((meal: MealPick): string => meal.name), ...drawn.map(keyOf), ...order];
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
 * Its values stand in the order its summary names them, so it opens as it was saved.
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
    const titled: string[] = title.split(", ").map((part: string): string => part.trim());
    const placeOf: (value: string) => number = (value: string): number => {
        const at: number = titled.indexOf(valueTextOf(value));
        return at === -1 ? titled.length : at;
    };
    order = [
        ...new Set(lines.map(lineOf).map((read: Line): string => (read.meal === "" ? keyOf(read) : read.meal))),
    ].sort((first: string, second: string): number => placeOf(first) - placeOf(second));
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

    gramsFields = new WeakMap();
    blockPluses = new WeakMap();
    kcalShown = new Map();
    opened = [];
    partsRows = elementOf("div", "meal-rows", "");
    summaryValues = valuesOf();
    summaryPicker = summaryPickerOf(changed);
    rowsShow(changed);
    const summaryRow: HTMLDivElement = rowOf("Summary", summaryPicker);
    cookedRow = drawing === null ? null : cookedRowOf(changed);
    return cookedRow === null ? [summaryRow] : [summaryRow, cookedRow];
}

/** A food picked as a line `X-FOOD` without a meal. */
function lineTextOf(pick: FoodPick): string {
    return `${pick.name};${pick.brand};${pick.store};${pick.grams.replace(",", ".")}`;
}

/** The meal as lines `X-FOOD` in the order of its summary, a food at 0 g left out since I did not eat it. */
export function mealFoods(): string[] {
    const eaten: (pick: FoodPick) => boolean = (pick: FoodPick): boolean => numberOf(pick.grams) !== 0;
    return valuesOf().flatMap((value: string): string[] => [
        ...meals
            .filter((meal: MealPick): boolean => meal.name === value)
            .flatMap((meal: MealPick): string[] =>
                meal.foods.filter(eaten).map((pick: FoodPick): string => `${lineTextOf(pick)};${meal.name}`),
            ),
        ...picks.filter((pick: FoodPick): boolean => keyOf(pick) === value && eaten(pick)).map(lineTextOf),
    ]);
}

/**
 * The summary in the order I picked, drinks left out.
 * It names each meal with food and each food beside them.
 */
export function mealTitle(): string {
    return summaryOf(
        valuesOf().flatMap((value: string): { name: string; kind: Kind }[] => [
            ...meals
                .filter((meal: MealPick): boolean => meal.name === value && meal.foods.length > 0)
                .map((meal: MealPick): { name: string; kind: Kind } => ({ name: meal.name, kind: "Eat" })),
            ...picks
                .filter((pick: FoodPick): boolean => keyOf(pick) === value)
                .map((pick: FoodPick): { name: string; kind: Kind } => ({
                    name: pick.name,
                    kind: foodOf(pick)?.kind ?? "Eat",
                })),
        ]),
    );
}
