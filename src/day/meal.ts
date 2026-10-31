/**
 * ## Meal in the entry by category
 *
 * A meal of the log, `Food`, in rows of the dialog,
 * like every field, with the fewest steps and nothing nested:
 * - Summary: what I ate, written by itself, never typed: the meals,
 *   then the foods eaten beside them, parted by `, `,
 *   like `Chili con Carne, Weißbrot`, drinks left out,
 *   like a `Coca-Cola`, see {@link mealTitle},
 *   and after it in brackets what they give together, drinks too,
 *   as a type stands after its skill, like
 *   `Chili con Carne, Weißbrot (660 kcal)`.
 *   A drink's amount is in millilitres, like `330 ml`, any other in grams.
 * - Foods: what I ate, the one plus beside its name opening one list,
 *   a menu over the dialog right under the plus, see `listOf` in `choices.ts`,
 *   whose one search finds, as I type,
 *   my meals by their names and foods first, then my foods,
 *   then the products of Open Food Facts by name or barcode,
 *   see `../food/search.ts`; one click takes one:
 *   a meal brings its block, a row with its name, its kcal and a small grey `×`,
 *   which removes it, its foods indented below it; a food of mine its row;
 *   a product goes into `Foods.md` as Open Food Facts gives it and into the meal,
 *   no form in between. While the text typed is no meal of mine,
 *   the first row of my meals is the one plus with it, `+ New meal “Chili con Carne”`,
 *   which puts an empty block of a new meal of that name into the entry
 *   and opens its own search at once, see {@link mealNew};
 *   its first food puts it into `Meals.md` as its composition, at once, saved or not,
 *   and every food added or removed changes it there, see {@link freshSend}.
 *   Last among my foods stands `+ New food “Linsensuppe”`,
 *   which opens the form of a food by hand named as typed;
 *   when nothing is found, like a barcode Open Food Facts does
 *   not know, one grey line says so.
 *   A food is a row with its name alone, its grams,
 *   its kcal and its `×`, which removes it,
 *   like a food I did not eat of a cooking;
 *   a food of mine has a pencil beside its name,
 *   which opens it below its row as the food view opens it,
 *   to change it right there, see {@link foodRowOf}.
 *   Its grams start at one portion of it,
 *   its `Portion` in `Foods.md`, white like every fact,
 *   which I type over; without a portion they start empty, and I type my amount;
 *   the cursor goes into the grams of what was picked,
 *   the first empty one first.
 *   An empty field counts nothing and is saved without grams;
 *   every amount is rounded and an estimate anyway, so none is marked as one.
 *   Enter in its grams only confirms them, as in every field of the dialog,
 *   see `enterTake` in `categories.ts`. A meal drawing from a cooking starts
 *   at the grams of the pot instead, see {@link drawnShow}.
 * A meal block has its own plus right after its name,
 * which adds a food to it, from the same search without my meals.
 * The dialog writes each food as a line `X-FOOD`: its name, brand and store,
 * then its grams, empty for none, and for a food of one of my meals the meal after them,
 * like `Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne` or `Weißbrot;Harry;Rewe;50`,
 * so the log keeps what the meal held that day, whatever I change in `Meals.md` later;
 * and the summary as its what, see {@link mealTitle}.
 * A meal whose summary names more than its foods,
 * like `Bortzeit` written by hand,
 * opens as that one meal with its foods, so its name stays.
 * A cooking of the log, `Cook`,
 * lists what went into the pot in the same rows, Summary and Foods,
 * each food with its grams, like `Hackfleisch;Gut & Günstig;Edeka;500;Chili con Carne`,
 * and counts no kcal, see `reader/food.ts`.
 * A meal may draw from one of my cookings of the days before it in a row
 * of its own, see {@link cookedRowOf}:
 * its meals and foods come along, each food with its grams of the pot,
 * which I type over with what I ate, no total for the pot,
 * and the meal writes `X-COOKED` with the cooking's identifier
 * and its foods with their grams as its own lines,
 * so meal and cooking each keep their foods, see {@link mealCooked}.
 * A meal eaten out, where nothing can be weighed, I log by photo through Claude,
 * who writes its entry through the reader;
 * the dialog itself takes no photo.
 *
 * - `./choices.ts`: Rows of the dialog, the lists that open as menus over it,
 *   and the picker of a cooking.
 * - `./times.ts`: Writes the time of a cooking.
 * - `../skill/attempts.ts`: Gives the day of an instant,
 *   and writes a day with its weekday.
 * - `../food/foods.ts`: Finds my foods, loads my meals,
 *   sends a meal, writes amounts and the key of a food, and makes elements and buttons.
 * - `../food/meals.ts`: Finds my meals for a search,
 *   writes the name of a meal as the reader does,
 *   and kcal as the page writes them.
 * - `../food/search.ts`: The food search, the lines of every list,
 *   and a food of mine opened to change it.
 * - `../icons.ts`: Puts the one plus, the one `×` and the pencil into the buttons,
 *   their words as tooltip, and makes the plus of a new meal.
 * - `../reader.ts`: Asks the reader.
 * - `lucide`: The icons of the plus and the pencil.
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
    portionGramsOf,
    summaryOf,
    unitOf,
} from "../food/foods.ts";
import { dishesFound, dishNameOf, kcalTextOf, mealNameOf } from "../food/meals.ts";
import {
    foodDetailOf,
    foodSearchClear,
    foodSearchOf,
    listLineOf,
} from "../food/search.ts";
import { crossPut, iconOf, iconPut, plusPut } from "../icons.ts";
import { summaryShownOf } from "../persons.ts";
import { readerAsk } from "../reader.ts";
import { Pencil, Plus } from "lucide";

import type { Choice } from "./choices.ts";
import type { Dish, Food, FoodsFound, Kind } from "../food/foods.ts";

/**
 * A food picked, beside the meals or as part of one.
 *
 * - `name`, `brand`, `store`:
 *   Name of the food in `Foods.md`, its brand and the store I bought it in,
 *   like `Skyr natur`, `K-Classic` and `Kaufland`;
 *   brand and store empty where none is known.
 * - `grams`: Grams as typed, like `150` or `7,5`; empty for none, which counts nothing.
 * - `fromCooking`: Whether it came with the cooking the meal draws from,
 *   see {@link drawnShow}.
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
 *
 * - `name`, `brand`, `store`:
 *   Its food, brand and store empty in a line written before foods had them.
 * - `grams`: Grams as written, like `150` or `~400`; empty for none.
 * - `meal`: The meal of mine its food belongs to, empty for none.
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
 * - `id`: Identifier of its entry.
 * - `category`: Its category, `Cook`.
 * - `title`: What it was, like `Hackfleisch, Kidneybohnen, Tomaten`.
 * - `start`: Start as ISO instant.
 * - `foods`: Its lines `X-FOOD`, what went into the pot,
 *   like `Hackfleisch;Gut & Günstig;Edeka;500`.
 * - `eaters`: How many other meals draw from it already,
 *   which share it with this one, see {@link drawnShow}.
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
 * What a meal needs to draw from a cooking, see {@link cookedRowOf};
 * a cooking itself draws from none.
 *
 * - `cooked`: Identifier of the cooking it draws from as written,
 *   its `X-COOKED`, empty for none.
 * - `start`: Start of the meal, whose cookings of the days before it are offered.
 * - `id`: Identifier of the meal when it is changed, empty for a new one,
 *   so it does not count itself among the meals
 *   that share a cooking, see {@link Cooking}.
 */
export type Drawing = {
    cooked: string;
    start: Date;
    id: string;
};

/**
 * A meal of mine picked, with its foods.
 *
 * - `name`: Name of the meal, like `Chili con Carne`.
 * - `foods`: Its foods with their grams.
 * - `fromCooking`: Whether it came with the cooking the meal draws from,
 *   see {@link drawnShow}.
 * - `fresh`: Whether it is a new meal, named in this entry,
 *   which `Meals.md` holds as its foods are, see {@link freshSend}.
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

/**
 * The one grey line of a search of the dialog that finds nothing,
 * like a barcode Open Food Facts does not know;
 * a food by hand goes in by `+ New food` with its name typed,
 * see `newFoodOf` in `../food/search.ts`.
 */
const nothingFound: string = "Nothing found";

/**
 * My cookings of the days before the meal that list foods, the nearest first,
 * see {@link cookingsLoad}.
 */
let cookings: Cooking[] = [];

/**
 * Identifier of the cooking the meal draws from, empty for none.
 */
let cooked: string = "";

/**
 * The row of the cooking the meal draws from,
 * so it shows a cooking picked by a meal, see {@link dishPick};
 * `null` for a cooking, which draws from none.
 */
let cookedRow: HTMLElement | null = null;

/**
 * My foods by their keys, see {@link keyOf},
 * and by their names alone in small letters,
 * for lines written before foods had brand and store;
 * loaded when the meal was built, with every food added since.
 */
let mine: Map<string, Food> = new Map();

/**
 * Key of the food of mine whose pencil opened it below its row,
 * see {@link foodRowOf}, empty while none is open.
 */
let foodOpen: string = "";

/**
 * My meals of `Meals.md`, loaded when the meal was built,
 * as they are after every meal kept since.
 */
let dishes: Dish[] = [];

/**
 * Meals picked, in the order they were picked.
 */
let meals: MealPick[] = [];

/**
 * Foods picked beside the meals, in the order they were picked.
 */
let picks: FoodPick[] = [];

/**
 * Text of the summary, and after it the kcal of the whole meal.
 */
let summaryLine: HTMLElement = document.createElement("span");

/**
 * Place of the blocks of the meals picked,
 * then of the rows of the foods picked beside them.
 */
let foodsRows: HTMLElement = document.createElement("div");

/**
 * Closes the list of the row `Foods`.
 */
let foodsClose: () => void = (): void => {};

/**
 * The field of the grams of each food picked, as its row shows it,
 * so the cursor finds the food just picked.
 */
let gramsFields: WeakMap<FoodPick, HTMLInputElement> = new WeakMap();

/**
 * The plus of each meal block, as its row shows it,
 * so a new meal opens its search at once, see {@link mealNew}.
 */
let blockPluses: WeakMap<MealPick, HTMLButtonElement> = new WeakMap();

/**
 * Keeps a food among my foods by its key and,
 * unless a food of its name came first, by its name alone, see {@link mine}.
 *
 * @param food - Food of `Foods.md`
 */
function mineAdd(food: Food): void {
    mine.set(keyOf(food), food);
    if (!mine.has(food.name.toLowerCase())) mine.set(food.name.toLowerCase(), food);
}

/**
 * Makes a food picked of a line `X-FOOD`, see {@link lineOf}.
 *
 * @param read - Line in its parts
 * @param grams - Grams the food picked gets, empty for none
 * @returns The food picked
 */
function pickOf(read: Line, grams: string): FoodPick {
    return { name: read.name, brand: read.brand, store: read.store, grams: grams };
}

/**
 * Writes grams to one decimal at most,
 * as `X-FOOD` and the fields take them, like `62.5` or `125`.
 *
 * @param grams - Grams
 * @returns Text
 */
function gramsTextOf(grams: number): string {
    return String(Math.round(grams * 10) / 10);
}

/**
 * Makes a food picked newly, its grams one portion of it,
 * empty for a food without portion.
 *
 * @param food - Food of `Foods.md`
 * @returns The food picked
 */
function pickNewOf(food: Food): FoodPick {
    return {
        name: food.name,
        brand: food.brand,
        store: food.store,
        grams: food.portion === null ? "" : gramsTextOf(food.portion),
    };
}

/**
 * Finds a food picked among my foods:
 * by its name, brand and store, one without both by its name alone.
 *
 * @param pick - Food picked
 * @returns The food in `Foods.md`, `undefined` for one it does not hold
 */
function foodOf(pick: FoodPick): Food | undefined {
    return (
        mine.get(keyOf(pick)) ??
        (pick.brand === "" && pick.store === ""
            ? mine.get(pick.name.toLowerCase())
            : undefined)
    );
}

/**
 * Tells whether a part of a line `X-FOOD` is grams, like `150` or `~400`.
 *
 * @param part - Part of the line
 * @returns Whether it is grams
 */
function gramsIs(part: string): boolean {
    return /^~?\s*\d+(?:[.,]\d+)?$/.test(part);
}

/**
 * Turns a line `X-FOOD` into its parts, as the reader reads it:
 * one of today names its food's name, brand and store, then its grams, empty for none,
 * and for the food of one of my meals the meal, like
 * `Skyr natur;K-Classic;Kaufland;150`
 * or `Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne`,
 * told by its second part being no grams and its fourth grams or empty;
 * a food of a meal of `Meals.md` only its name, brand and store,
 * like `Hackfleisch;Gut & Günstig;Edeka`;
 * an older line names its food alone, its grams after it,
 * and for the food of a meal the meal,
 * then its servings eaten and its variant, which no longer count, like
 * `Hackfleisch;62.5;Chili con Carne;0.5;09.10.2026`.
 * - `parts`: The parts of the line, without spaces at their ends.
 * - `grams`: Whether the second part of an older line is grams.
 *
 * @param line - Line like `Skyr natur;K-Classic;Kaufland;150`,
 *   `Hackfleisch;Gut & Günstig;Edeka`, `Reis;150` or `Eier`
 * @returns The line in its parts
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
 * Reads a number as typed, a decimal comma counting as a point and a `~` before it,
 * which marks grams guessed, not weighed, like `~400` from a photo, left out.
 *
 * @param text - Number as typed, like `150`, `7,5` or `~400`
 * @returns The number, `null` for an empty text, not a number for a text that is none
 */
function numberOf(text: string): number | null {
    return text === "" ? null : Number(text.replace(/^~\s*/, "").replace(",", "."));
}

/**
 * Tells what a food picked gives: its grams times its kcal per 100 g;
 * nothing without grams.
 * - `counted`: Grams counted, 0 for none.
 *
 * @param pick - Food picked
 * @returns kcal; 0 for a food not in `Foods.md`, no grams or grams that are no number
 */
function kcalOf(pick: FoodPick): number {
    const counted: number = numberOf(pick.grams) ?? 0;
    return Number.isFinite(counted) ? (counted / 100) * (foodOf(pick)?.kcal ?? 0) : 0;
}

/**
 * Tells what a meal picked gives: what its foods give.
 *
 * @param meal - Meal picked
 * @returns kcal
 */
function mealKcalOf(meal: MealPick): number {
    return meal.foods.reduce(
        (sum: number, pick: FoodPick): number => sum + kcalOf(pick),
        0,
    );
}

/**
 * Turns portions typed into the grams of a food into its grams,
 * see `portionGramsOf` in `../food/foods.ts`:
 * `2x` of oil of 30 g becomes `60`;
 * any other text, and portions of a food without a portion, stay as they are.
 * - `grams`: The grams of the portions typed, `null` for none.
 *
 * @param text - Grams or portions as typed
 * @param portion - Grams of the portion of the food, `null` for none kept
 * @returns Grams as text, like `60`, or the text as it was
 */
function portionsOf(text: string, portion: number | null): string {
    const grams: number | null = portionGramsOf(text, portion);
    return grams === null ? text : gramsTextOf(grams);
}

/**
 * Makes the small field of the grams of a food with `g` after it, or `ml` for a drink,
 * see `unitOf` in `../food/foods.ts`, starting at the grams given, which a click selects
 * so I type over them, empty for none;
 * portions typed, like `2x`, become grams once I leave the field or press Enter,
 * see {@link portionsOf}; marking itself invalid
 * while its text is no number of 0 or more,
 * so the dialog does not send it;
 * 0 is a food I did not put in this time,
 * which the entry leaves out, see {@link mealFoods}.
 * - `portions`: Turns portions in the field into grams and tells of the change.
 *
 * @param value - Grams as typed, empty for none
 * @param name - Words for screen readers, like `Grams of Brot`
 * @param portion - Grams of the portion of the food, `null` for none kept
 * @param unit - Unit after the field, `g` or `ml`
 * @param typed - Takes the text typed
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
 * Takes a food of mine as the reader wrote it after a change in the dialog,
 * see {@link foodRowOf}:
 * among my foods in place of the food as it was,
 * and every food picked of it, beside the meals and in a meal,
 * under its new name, brand and store,
 * so the entry writes its lines `X-FOOD` so;
 * my meals load anew, which the reader renamed it in.
 * - `renamed`: The foods picked of it.
 *
 * @param old - The food as `Foods.md` held it
 * @param written - The food as the reader wrote it
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
        .then((all: Dish[]): void => {
            dishes = all;
        })
        .catch((error: unknown): void => console.error(error));
}

/**
 * Builds the row of a food, beside the meals or of one: its name alone,
 * like `Skyr natur`, without its brand and store,
 * which only tell which one it is when I pick it,
 * as everywhere a food stands as eaten,
 * marked when `Foods.md` does not hold it, its grams,
 * its kcal and a small grey `×`, which removes it,
 * as a value picked in every list of the dialog.
 * A food of mine has a pencil beside its name, as a place and a summary have,
 * which opens below its row the food as the food view opens it,
 * its name, brand and store,
 * its nutrients, its portion, its pack and its kind, with all its rules,
 * see `foodDetailOf` in `../food/search.ts`, and closes it again;
 * a change shows the rows anew at once,
 * see {@link foodTake}, the new name and the kcal of its grams,
 * the food staying open and the cursor in the value I went on to.
 * - `food`: The food in `Foods.md`, `undefined` for one it does not hold.
 * - `name`: Its name.
 * - `kcalTextFor`: Its kcal as written,
 *   nothing while its grams are empty or `Foods.md` does not hold it.
 * - `kcal`: Cell of its kcal.
 * - `remove`: Its `×`.
 * - `detailFor`: Opens the food below its row.
 * - `detail`: The food opened, `null` while it is closed.
 *
 * @param pick - Food picked, changed as its grams are typed
 * @param typed - Comes once its grams are typed, after its kcal show anew
 * @param removed - Takes it out of the meal, on its `×`
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
 * the first of them whose grams are empty,
 * since those I type the first time, else the first of them.
 *
 * @param picked - Foods just picked, in their order
 */
function gramsFocus(picked: FoodPick[]): void {
    const first: FoodPick | undefined =
        picked.find((pick: FoodPick): boolean => pick.grams === "") ?? picked[0];
    if (first !== undefined) gramsFields.get(first)?.focus();
}

/**
 * Builds the rows of a meal picked, as a chapter of a skill entry has its documents:
 * its row, its name with the one plus right after it,
 * like `Chili con Carne +`, its kcal and a small grey `×`, which removes it;
 * below it its parts, indented with a thin grey line at their left,
 * see `.meal-parts` in `day.css`:
 * its foods, each a row of a food, see {@link foodRowOf}.
 * The plus, `Add a food to Chili con Carne` as its tooltip,
 * opens the search of my foods and of Open Food Facts
 * as a menu of its own right under the meal,
 * like every list, see `listOf` in `choices.ts`,
 * which a click on the plus again, Escape or a click beside it closes;
 * a food picked goes into this meal of this entry only,
 * its grams as a food picked newly starts them,
 * see {@link pickNewOf}, never into `Meals.md`, and closes it.
 * The meal goes with its last food.
 * - `row`: Its row.
 * - `kcal`: Cell of its kcal.
 * - `remove`: Its `×`.
 * - `name`: Its name with the plus.
 * - `parts`: Its foods, indented, holding the menu of the search too,
 *   which takes no room among them.
 * - `plus`: The plus that adds a food to it.
 * - `box`: The menu with the search.
 * - `search`: The search.
 * - `close`: Closes the menu.
 *
 * @param meal - Meal picked
 * @param changed - Tells the dialog that the meal changed
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
        rowsShow(changed);
        changed();
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
            rowsShow(changed);
            changed();
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
                    rowsShow(changed);
                    changed();
                },
                (): void => {
                    rowsShow(changed);
                    changed();
                },
            ),
        ),
        box,
    );
    return [row, parts];
}

/**
 * Shows the summary, see {@link mealTitle},
 * and after it the kcal of the whole meal in brackets,
 * as a type stands after its skill,
 * like `Chili con Carne · Weißbrot (660 kcal)`, white like the summary;
 * no kcal while no food has grams, as a food without grams shows none.
 * - `total`: kcal of the meals and the foods beside them.
 * - `text`: The summary with its kcal.
 */
function summaryShow(): void {
    const total: number =
        meals.reduce((sum: number, meal: MealPick): number => sum + mealKcalOf(meal), 0) +
        picks.reduce((sum: number, pick: FoodPick): number => sum + kcalOf(pick), 0);
    const text: HTMLElement = elementOf(
        "span",
        "meal-summary",
        summaryShownOf(mealTitle()),
    );
    if (
        [...meals.flatMap((meal: MealPick): FoodPick[] => meal.foods), ...picks].some(
            (pick: FoodPick): boolean => numberOf(pick.grams) !== null,
        )
    )
        text.append(elementOf("span", "meal-total", ` (${kcalTextOf(total)})`));
    summaryLine.replaceChildren(text);
}

/**
 * Shows the blocks of the meals picked,
 * then the rows of the foods beside them, then the summary.
 *
 * @param changed - Tells the dialog that the meal changed
 */
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
                    rowsShow(changed);
                    changed();
                },
                (): void => {
                    rowsShow(changed);
                    changed();
                },
            ),
        ),
    );
    summaryShow();
}

/**
 * Picks a food from the search as one more food beside the meals,
 * unless it is picked already, its grams as a food picked newly starts them,
 * see {@link pickNewOf};
 * then closes the list and puts the cursor into its grams.
 * - `pick`: The food picked.
 *
 * @param food - Food picked, or a product just added to `Foods.md`
 * @param changed - Tells the dialog that the meal changed
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
    rowsShow(changed);
    changed();
    foodsClose();
    gramsFocus([pick]);
}

/**
 * Picks one of my meals with its foods, each at its standard grams,
 * which I set in the food view,
 * see `../food/meals.ts`, a food I rarely put in at 0, one without standard grams empty,
 * unless it is picked already;
 * then closes the list and puts the cursor into the grams of its foods,
 * see {@link gramsFocus}.
 * A meal I cooked in the days before comes from its cooking instead,
 * in a meal that draws from none yet:
 * the nearest cooking holding it is picked in the row `Cooked`,
 * which brings its pot at this meal's share, see {@link drawnShow},
 * since a cooked meal is eaten only from what I cooked.
 * - `cooking`: The nearest cooking holding the meal,
 *   `undefined` for none or while the meal draws already.
 * - `meal`: The meal picked.
 *
 * @param dish - Meal of `Meals.md`
 * @param changed - Tells the dialog that the meal changed
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
        rowsShow(changed);
        changed();
    }
    foodsClose();
    gramsFocus(meal.foods);
}

/**
 * Puts an empty block of a new meal into the entry, named as typed,
 * and opens its own search at once, see {@link mealRowsOf};
 * the foods picked there go into it with their grams.
 * - `meal`: The new meal.
 *
 * @param name - Name of the meal, as the reader writes it,
 *   see `mealNameOf` in `../food/meals.ts`
 * @param changed - Tells the dialog that the meal changed
 */
function mealNew(name: string, changed: () => void): void {
    const meal: MealPick = { name: name, foods: [], fresh: true };
    meals.push(meal);
    foodsClose();
    rowsShow(changed);
    changed();
    blockPluses.get(meal)?.click();
}

/**
 * Keeps a new meal of the entry in `Meals.md` as its foods are now,
 * so it is mine the moment it holds one, whether the entry is saved or not:
 * its composition, its foods by name, brand and store without grams,
 * see `dishAdd` in `reader/food.ts`;
 * with its last food removed it leaves `Meals.md` again,
 * which holds no meal without food.
 * Its block removed by its `×`, it stays mine, only this entry dropping it.
 * A meal I had before stays as it is.
 *
 * @param meal - Meal of the entry whose foods changed
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
        .then((all: Dish[]): void => {
            dishes = all;
        })
        .catch((error: unknown): void => console.error(error));
}

/**
 * Builds my meals as the search of the row `Foods` shows them above my foods,
 * see `../food/search.ts`: the line of each meal
 * whose name or foods hold the words typed,
 * see `dishesFound` in `../food/meals.ts`, its name with its short title in brackets,
 * see `dishNameOf` there, and what it gave the last time I ate it, a click picking it,
 * see {@link dishPick}; then, while the text typed is no meal of mine nor of this entry,
 * nor a barcode, last, the one plus with it,
 * `+ New meal “Chili con Carne”`, see {@link mealNew},
 * so `chili` offers Chili con Carne before a new meal
 * and Enter takes a meal or food found first,
 * see `firstPick` in `../food/search.ts`.
 * - `name`: The text typed as the name of a meal.
 * - `lines`: Lines of the meals found.
 * - `plus`: The plus of a new meal.
 *
 * @param query - The search as typed
 * @param changed - Tells the dialog that the meal changed
 * @returns The lines of the meals
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
 * Loads my cookings of the days before a meal from the reader,
 * those that list foods and start before it, the nearest first,
 * see {@link cookingDays}, each with how many other meals of those days
 * and the days after draw from it already, see {@link Cooking}.
 * - `days`: Length of those days in milliseconds.
 * - `from`, `until`: Start of the days before the meal and end of as many after it.
 * - `entries`: Entries of the log of those days.
 *
 * @param start - Start of the meal
 * @param id - Identifier of the meal when it is changed,
 *   empty for a new one, which counts not itself
 * @returns The cookings
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

/**
 * Writes a cooking as the list of the cookings offers it:
 * what it was and when it started,
 * like `Hackfleisch · Kidneybohnen · Tomaten · 13.10.2026 (Tue) 16:00`.
 * - `start`: Its start.
 *
 * @param cooking - Cooking
 * @returns Text
 */
function cookingTextOf(cooking: Cooking): string {
    const start: Date = new Date(cooking.start);
    return `${summaryShownOf(cooking.title)} · ${dayTextOf(dayOf(start), true)} ${timeOf(start)}`;
}

/**
 * Puts the meals and foods of the cooking the meal draws
 * from first among its meals and foods,
 * in place of those it brought before, each at its share of the pot:
 * the pot shared evenly among every meal drawing from it, this one too, halves for two,
 * thirds for three, as the reader writes it once saved,
 * see `cookedShare` in `reader/day.ts`;
 * none while no cooking is picked.
 * - `cooking`: The cooking picked, `undefined` for none.
 * - `share`: Part of the pot of each meal, like 0.5 for two.
 * - `drawnMeals`: The meals of the cooking, each with its foods.
 * - `drawn`: The foods of the cooking beside its meals.
 *
 * @param changed - Tells the dialog that the meal changed
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
    rowsShow(changed);
    changed();
}

/**
 * Builds the row of the cooking a meal draws from, see the top of this file:
 * while none is picked, a small grey plus beside the name of the row, `Cooked +`,
 * see `besideName` in `choices.ts`, `Draw from a cooking` its tooltip,
 * whose list offers my cookings of the days before the meal, the nearest first;
 * picked, the cooking shows in the line and its foods come along, see {@link drawnShow};
 * picking it again takes it back with its foods.
 * - `textOf`: Text of a cooking by its identifier, also of one no longer among them.
 *
 * @param changed - Tells the dialog that the meal changed
 * @returns The row
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

/**
 * Gives the identifier of the cooking the meal draws from,
 * for its `X-COOKED`; empty for none.
 *
 * @returns Identifier, empty for none
 */
export function mealCooked(): string {
    return cooked;
}

/**
 * Builds the row `Foods` with its picker:
 * its name with the plus beside it that opens the list, a menu over the dialog,
 * see `listOf` in `choices.ts`, then the blocks and rows picked.
 * - `picker`: Rows and list.
 * - `row`: The row.
 * - `close`: Closes the list.
 *
 * @param line - The plus
 * @param rows - Place of the blocks and rows picked
 * @param box - The list
 * @param opened - Comes once the list is open
 * @returns The row and what closes its list
 */
function foodsRowOf(
    line: HTMLButtonElement,
    rows: HTMLElement,
    box: HTMLElement,
    opened: () => void,
): [HTMLElement, () => void] {
    const picker: HTMLElement = elementOf("div", "meal picker", "");
    line.classList.add("picker-line");
    const close: () => void = listOf(picker, line, box, opened, (): void => {});
    picker.append(rows, box);
    const row: HTMLElement = rowOf("Foods", picker);
    row.querySelector(".entry-name")?.append(line);
    return [row, close];
}

/**
 * Builds the meal, see the top of this file, with the foods it lists already,
 * after loading my foods and my meals:
 * the rows of its summary and its foods.
 * The lines `X-FOOD` of a meal go to its meal, by the meal they carry;
 * a meal whose summary names more than its foods,
 * like `Bortzeit`, takes all its foods as that one meal.
 * - `found`: All my foods, as the search finds them for an empty text.
 * - `mealsMine`: My meals of `Meals.md`.
 * - `cooks`: My cookings of the days before a meal, none for a cooking.
 * - `last`: The meal the lines so far went to.
 * - `drawnLines`: The lines of the cooking the meal draws from, none for none.
 * - `brought`: Keys of the foods of that cooking beside its meals,
 *   whose lines came with it.
 * - `broughtMeals`: Names of the meals of that cooking, which came with it.
 * - `foodsLine`: The plus beside the name `Foods`, which opens the list.
 * - `foodsSearch`: The search in the list of the row `Foods`, emptied as the list opens.
 * - `foodsBox`: The list of the row `Foods`, with its search.
 * - `foodsRow`: The row `Foods`.
 *
 * @param lines - Lines `X-FOOD` of the meal,
 *   like `Skyr natur;K-Classic;Kaufland;150`; none for a new meal
 * @param title - Summary of the meal written before,
 *   like `Chili con Carne, Brot`; empty for a new meal
 * @param changed - Tells the dialog that the meal changed
 * @param drawing - The cooking a meal draws from and its start, see {@link Drawing};
 *   `null` for a cooking, which shows its summary and its foods,
 *   and draws from no cooking
 * @returns The rows of summary and foods, to put into the dialog in place of the summary
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
    const [foodsRow, closeFoods]: [HTMLElement, () => void] = foodsRowOf(
        foodsLine,
        foodsRows,
        foodsBox,
        (): void => {
            foodSearchClear(foodsSearch);
            foodsSearch.querySelector("input")?.focus();
        },
    );
    foodsClose = closeFoods;
    rowsShow(changed);
    const summaryRow: HTMLDivElement = rowOf("Summary", summaryLine);
    summaryRow.classList.add("panel-fixed");
    cookedRow = drawing === null ? null : cookedRowOf(changed);
    if (cookedRow === null) return [summaryRow, foodsRow];
    return [summaryRow, cookedRow, foodsRow];
}

/**
 * Writes a food picked as a line `X-FOOD`: its name, brand and store,
 * then its grams typed, a decimal comma as a point, empty for none, parted by `;`,
 * like `Skyr natur;K-Classic;Kaufland;150`,
 * so every line says which product it was and how much.
 *
 * @param pick - Food picked
 * @returns The line, without a meal
 */
function lineTextOf(pick: FoodPick): string {
    return `${pick.name};${pick.brand};${pick.store};${pick.grams.replace(",", ".")}`;
}

/**
 * Gives the meal as lines `X-FOOD`, see {@link lineTextOf}:
 * first the foods of each meal, its name after each,
 * like `Hackfleisch;Gut & Günstig;Edeka;125;Chili con Carne`,
 * then the foods beside the meals;
 * a food at 0 g, like one I rarely put into a meal and did not this time,
 * left out, since I did not eat it.
 *
 * @returns Lines in the order of the meals and the foods picked
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
 * Gives the summary of the meal: the names of the meals that hold a food,
 * then of the foods beside them without brand and store,
 * in the order picked, parted by `, `,
 * like `Chili con Carne, Weißbrot`, drinks left out,
 * like a `Coca-Cola`, whose kcal still count,
 * see `summaryOf` in `../food/foods.ts`.
 *
 * @returns Summary, empty while nothing is picked
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
