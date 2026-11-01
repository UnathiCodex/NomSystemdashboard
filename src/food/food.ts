/**
 * ## Food
 *
 * Shows what I ate on a day, and my foods, in the scheme of the day view,
 * my water I count in the trackers of the day.
 * The day: the number of its meals and its totals, all alike, without goals,
 * so the log stays a log, not calorie control.
 * Then each meal of the log, a click opening the day view's dialog of its entry,
 * to change, copy or remove it there, see {@link mealBlockOf}.
 * Every amount is rounded and an estimate anyway, so none is marked as one.
 * What counts nothing, a food not in `Foods.md`, without grams or a nutrient unknown,
 * a line below the totals names, see {@link totalsShow}.
 * My meals, see `meals.ts`, above my foods and the food search, see `search.ts`.
 * It opens on today, see `../today.ts`,
 * and loads anew the moment a file of my new system changes, see `../changes.ts`.
 */

import {
    amountOf,
    buttonOf,
    elementOf,
    foodDayLoad,
    summaryOf,
    unitOf,
} from "./foods.ts";
import { foodNewShow, foodSearchOf, foodShow } from "./search.ts";
import { mealsSectionOf } from "./meals.ts";
import { labelOf } from "../day/places.ts";
import { dayAdd, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { logEntryOpen } from "../editor/dialog.ts";
import { iconPut, plusPut } from "../icons.ts";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide";
import "./food.css";
import type { Eaten, FoodDay, Meal } from "../../reader/food.ts";

/**
 * Day shown.
 */
let shown: string = "";

/**
 * Writes an amount with its unit, whole.
 */
function amountTextOf(value: number, unit: string): string {
    return `${amountOf(value, 0)} ${unit}`;
}

/**
 * Names the nutrients of protein, carbs and fat a food lacks in `Foods.md`,
 * as a line below the totals writes them, like `protein and carbs`, empty for nothing.
 */
function lacksOf(eaten: Eaten): string {
    const lacks: string[] = [
        eaten.protein === null ? "protein" : "",
        eaten.carbs === null ? "carbs" : "",
        eaten.fat === null ? "fat" : "",
    ].filter((nutrient: string): boolean => nutrient !== "");
    return lacks.length < 2
        ? lacks.join("")
        : `${lacks.slice(0, -1).join(", ")} and ${lacks[lacks.length - 1]}`;
}

/**
 * Shows the totals of a day, each the sum of what is known,
 * below them a line for each kind of food or meal they leave out,
 * like `Not counted, fat unknown: Gouda`.
 * - `weightless`: My foods logged without grams, which give nothing.
 */
function totalsShow(day: FoodDay): void {
    const totals: HTMLElement = elementOf("div", "food-totals", "");
    const tiles: [string, string][] = [
        ["Meals", String(day.meals.length)],
        ["Energy", amountTextOf(day.kcal, "kcal")],
        ["Protein", amountTextOf(day.protein, "g")],
        ["Carbs", amountTextOf(day.carbs, "g")],
        ["Fat", amountTextOf(day.fat, "g")],
    ];
    for (const [name, amount] of tiles) {
        const tile: HTMLElement = elementOf("div", "food-total", "");
        tile.append(
            elementOf("span", "food-label", name),
            elementOf("span", "food-amount", amount),
        );
        totals.append(tile);
    }

    const unknown: string[] = [];
    const weightless: string[] = [];
    const lacking: Map<string, string[]> = new Map();
    for (const meal of day.meals)
        for (const eaten of meal.foods) {
            const lacks: string = lacksOf(eaten);
            if (!eaten.known && !unknown.includes(eaten.name)) unknown.push(eaten.name);
            if (eaten.known && eaten.grams === 0 && !weightless.includes(eaten.name))
                weightless.push(eaten.name);
            if (
                eaten.known &&
                lacks !== "" &&
                !(lacking.get(lacks) ?? []).includes(eaten.name)
            )
                lacking.set(lacks, [...(lacking.get(lacks) ?? []), eaten.name]);
        }
    const empty: number = day.meals.filter(
        (meal: Meal): boolean => meal.foods.length === 0,
    ).length;
    const hints: string[] = [
        unknown.length > 0 ? `Not counted, not in my foods: ${unknown.join(", ")}` : "",
        weightless.length > 0 ? `Not counted, no grams: ${weightless.join(", ")}` : "",
        ...[...lacking].map(
            ([lacks, names]: [string, string[]]): string =>
                `Not counted, ${lacks} unknown: ${names.join(", ")}`,
        ),
        empty > 0
            ? `Not counted: ${empty} ` +
              `${empty === 1 ? "meal lists" : "meals list"} no foods`
            : "",
    ];
    document
        .getElementById("food-totals")
        ?.replaceChildren(
            totals,
            ...hints
                .filter((hint: string): boolean => hint !== "")
                .map((hint: string): HTMLElement => elementOf("p", "food-hint", hint)),
        );
}

/**
 * Adds up the kcal of foods that count, those of my foods with grams,
 * `null` when none counts, so its line shows none, never 0.
 */
function kcalOf(foods: Eaten[]): number | null {
    const counted: Eaten[] = foods.filter(
        (eaten: Eaten): boolean => eaten.known && eaten.grams > 0,
    );
    return counted.length === 0
        ? null
        : counted.reduce((sum: number, eaten: Eaten): number => sum + eaten.kcal, 0);
}

/**
 * Builds a line of what an entry holds, its name and what it gives,
 * `eaten` `null` for a meal, which has no grams.
 * A food without its brand and store, which only tell which one it is when I pick it.
 * `item` tells it stands at the top of its entry, not as a food of a meal below it.
 */
function whatLineOf(
    name: string,
    kcal: number | null,
    eaten: Eaten | null,
    item: boolean,
): HTMLElement {
    const line: HTMLElement = elementOf(
        "div",
        item ? "food-line food-meal" : "food-line",
        "",
    );
    line.append(
        elementOf("span", "food-what", name),
        elementOf(
            "span",
            "food-value food-bracket",
            eaten === null || eaten.grams === 0
                ? ""
                : `(${amountTextOf(eaten.grams, unitOf(eaten.kind))})`,
        ),
        elementOf("span", "food-value", kcal === null ? "" : amountTextOf(kcal, "kcal")),
    );
    return line;
}

/**
 * Builds the lines of an entry: its start in grey above it,
 * linking to its day in the day view, so no column of times takes room beside the names,
 * and its kcal in bold, then each meal of mine with its foods below it,
 * then each food eaten by itself,
 * so a food never stands under a meal it does not belong to.
 * An older entry whose summary names more than its foods, like `Bortzeit`,
 * stands as one meal of that name.
 */
function mealLinesOf(meal: Meal): HTMLElement[] {
    const entry: HTMLElement = elementOf("div", "food-entry", "");
    const when: HTMLElement = elementOf("span", "", "");
    const start: HTMLAnchorElement = document.createElement("a");
    start.className = "food-time";
    start.href = `/?date=${shown}`;
    start.textContent = new Date(meal.start).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });
    when.append(start, ...(meal.location === "" ? [] : [` · ${labelOf(meal.location)}`]));
    entry.append(when);
    if (meal.foods.length === 0) {
        const none: HTMLElement = elementOf("div", "food-line", "");
        none.append(elementOf("span", "food-place", "No foods listed"));
        return [entry, whatLineOf(meal.title, null, null, true), none];
    }

    const meals: Map<string, Eaten[]> = new Map();
    let alone: Eaten[] = [];
    for (const eaten of meal.foods)
        if (eaten.meal === "") alone.push(eaten);
        else meals.set(eaten.meal, [...(meals.get(eaten.meal) ?? []), eaten]);
    if (
        meals.size === 0 &&
        meal.title.trim().toLowerCase() !== summaryOf(alone).toLowerCase()
    ) {
        meals.set(meal.title.trim(), alone);
        alone = [];
    }
    if (meal.foods.some((eaten: Eaten): boolean => eaten.known))
        entry.append(elementOf("span", "food-value", amountTextOf(meal.kcal, "kcal")));
    return [
        entry,
        ...[...meals].flatMap(([name, foods]: [string, Eaten[]]): HTMLElement[] => [
            whatLineOf(name, kcalOf(foods), null, true),
            ...foods.map((eaten: Eaten): HTMLElement =>
                whatLineOf(eaten.name, kcalOf([eaten]), eaten, false),
            ),
        ]),
        ...alone.map((eaten: Eaten): HTMLElement =>
            whatLineOf(eaten.name, kcalOf([eaten]), eaten, true),
        ),
    ];
}

/**
 * Builds an entry as one block of its lines,
 * which a click opens in the day view's dialog of the entry, as in the log,
 * a click on its start shows its day instead.
 */
function mealBlockOf(meal: Meal): HTMLElement {
    const block: HTMLElement = elementOf("div", "food-eaten", "");
    block.append(...mealLinesOf(meal));
    block.addEventListener("click", (event: MouseEvent): void => {
        if ((event.target as HTMLElement).closest("a") === null)
            logEntryOpen(meal.id, meal.start).catch((error: unknown): void =>
                console.error(error),
            );
    });
    return block;
}

/**
 * Shows a day in the bar, then loads its meals and shows them with their totals,
 * unless another day was asked for meanwhile.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function dayShow(day: string): Promise<void> {
    shown = day;
    (document.getElementById("food-date") as HTMLElement).textContent = dayTextOf(
        day,
        true,
    );
    (document.getElementById("food-today") as HTMLButtonElement).disabled =
        day === calendarTodayOf();

    const food: FoodDay = await foodDayLoad(day);
    if (day !== shown) return;
    const lines: HTMLElement[] = food.meals.map(mealBlockOf);
    if (food.meals.length > 0) totalsShow(food);
    else {
        document.getElementById("food-totals")?.replaceChildren();
        lines.push(elementOf("p", "food-none", "No meals in the log on this day"));
    }
    document.getElementById("food-meals")?.replaceChildren(...lines);
}

/**
 * Shows a day, or a hint when the reader cannot read its meals.
 */
function dayOpen(day: string): void {
    dayShow(day).catch((error: unknown): void => {
        console.error(error);
        document.getElementById("food-totals")?.replaceChildren();
        document
            .getElementById("food-meals")
            ?.replaceChildren(elementOf("p", "food-none", "The meals cannot be read"));
    });
}

/**
 * Starts the food view after the router has put its HTML into the page.
 */
export function foodStart(): void {
    const before: HTMLElement = document.getElementById("food-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("food-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("food-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayOpen(dayAdd(shown, -1)));
    after.addEventListener("click", (): void => dayOpen(dayAdd(shown, 1)));
    today.addEventListener("click", (): void => dayOpen(calendarTodayOf()));
    const search: HTMLElement = foodSearchOf({
        pick: null,
        meals: null,
        products: true,
        nothing: "Nothing found; the plus beside Foods adds a food by hand",
    });
    document
        .getElementById("food-dishes")
        ?.append(
            mealsSectionOf((food: { name: string; brand: string; store: string }): void =>
                foodShow(search, food),
            ),
        );
    const plus: HTMLButtonElement = buttonOf("", "", (): void => foodNewShow(search));
    plusPut(plus, "New food");
    document.getElementById("food-foods-heading")?.append(plus);
    document.getElementById("food-search")?.append(search);
    dayOpen(askedDayOf() ?? calendarTodayOf());
    todayFollow((): string => shown, dayOpen);
    changesFollow((): void => dayOpen(shown));
}
