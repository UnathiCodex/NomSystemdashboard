/**
 * ## Food
 *
 * Shows what I ate on a day, and my foods, in the scheme of the day view;
 * my water I count in the trackers of the day.
 * The bar of the day, as the day has it: its weekday short and its date,
 * like `13.10.2026 (Tue)`, between the arrows to the day before and after,
 * a small icon beside it back to today, faded and off on today.
 * The day: the number of its meals and its totals
 * of kcal, protein, carbs and fat, all alike, without goals,
 * so the log stays a log, not calorie control;
 * then each meal of the log: its start, linking to the day in the day view, where,
 * and its kcal in bold, below it what it holds, each meal of mine with its kcal,
 * the sum of its foods, each food by its name alone with its grams grey in brackets and its kcal,
 * like `Rigatoni (230 g) 363 kcal`, a drink with its millilitres;
 * a click on it opens the day view's dialog of its entry, the same as a click on it in the log,
 * to change, copy or remove it there, see {@link mealBlockOf}.
 * A food listed without grams counts nothing; every amount is rounded and an estimate anyway,
 * so none is marked as one. A food not in `Foods.md` and a meal that lists no foods count nothing,
 * and a line below the totals says so;
 * so does a nutrient a food does not know, the totals adding what is known,
 * like `Not counted, fat unknown: Gouda`.
 * My meals and my foods, built alike, each list its search field and a flat line per meal or food,
 * a click opening it below:
 * my meals under their head, each only its foods, with what it gave the last time I ate it,
 * see `meals.ts`, above my foods, the food search, which finds mine at once,
 * then those of Open Food Facts below them, adds a product with a click,
 * opens one of mine to change its name, brand and store,
 * and adds a food by hand by the plus beside the name `Foods`, see `search.ts`.
 * It opens on today's calendar date, which turns at 00:00, also after a reload,
 * and while it shows today it moves on with it;
 * only a link like `/food?date=2026-10-10` opens on that day, see `today.ts`.
 * The day loads anew the moment a file of my new system changes, whoever changed it,
 * like a food renamed below or a meal changed beside it, see `../changes.ts`,
 * so it always shows the entries as they lie in the log.
 *
 * - `./foods.ts`: Loads the meals of a day, writes amounts and makes elements.
 * - `./search.ts`: Finds foods, mine first,
 *   then on Open Food Facts, adds new ones and changes mine.
 * - `./meals.ts`: The section of my meals.
 * - `../day/places.ts`: Gives the name of the place of a meal.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader,
 *   and a day with its weekday for the bar.
 * - `../today.ts`: Gives today's calendar date and the day a link asks for,
 *   and moves the food view on to the new day while it shows today.
 * - `../changes.ts`: Loads the day anew the moment a file of my new system changes.
 * - `../editor/dialog.ts`: Opens the day view's dialog of the entry of a meal.
 * - `../icons.ts`: Puts the arrows
 *   and the icon back to today into their buttons, their words as tooltip.
 * - `lucide`: The icons of the arrows and of today.
 * - `./food.css`: Look of the food view.
 */

import { amountOf, buttonOf, elementOf, foodDayLoad, summaryOf, unitOf } from "./foods.ts";
import { foodNewShow, foodSearchOf, foodShow } from "./search.ts";
import { mealsSectionOf } from "./meals.ts";
import { labelOf } from "../day/places.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { logEntryOpen } from "../editor/dialog.ts";
import { iconPut, plusPut } from "../icons.ts";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide";
import "./food.css";

import type { Eaten, FoodDay, Meal } from "./foods.ts";

/**
 * Day shown, like `2026-10-10`.
 */
let shown: string = "";

/**
 * Writes an amount with its unit, whole.
 *
 * @param value - Amount
 * @param unit - Unit, like `kcal` or `g`
 * @returns Text like `1.284 kcal` or `62 g`
 */
function amountTextOf(value: number, unit: string): string {
    return `${amountOf(value, 0)} ${unit}`;
}

/**
 * Turns a day into its date at midnight in local time.
 *
 * @param day - Day like `2026-10-10`
 * @returns Date
 */
function dateOf(day: string): Date {
    const [year, month, date]: number[] = day.split("-").map(Number);
    return new Date(year, month - 1, date);
}

/**
 * Names the nutrients of protein, carbs and fat a food of a meal lacks,
 * those its food in `Foods.md` does not know,
 * as a line below the totals writes them, in their order there.
 * - `lacks`: Names of the nutrients unknown.
 *
 * @param eaten - Food with what it gives
 * @returns What it lacks, like `fat`,
 *   `protein and carbs` or `protein, carbs and fat`, empty for nothing
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
 * Shows the totals of a day:
 * the number of meals, kcal, protein, carbs and fat, each with its name small above,
 * each the sum of what is known;
 * below them a line for each kind of food or meal they leave out,
 * like `Not counted, not in my foods: Brot`,
 * `Not counted, no grams: Reis` for a food logged without its grams, and per what my foods lack,
 * like `Not counted, fat unknown: Gouda`.
 * - `totals`: The totals side by side.
 * - `tiles`: Name and amount of each total.
 * - `unknown`: Names of the foods not in `Foods.md`, each once.
 * - `weightless`: Names of my foods logged without grams, each once, which give nothing.
 * - `lacking`: Names of my foods eaten whose protein, carbs or fat is unknown, each once,
 *   by what they lack, see {@link lacksOf}, like `fat`.
 * - `lacks`: What a food lacks.
 * - `empty`: Number of meals that list no foods.
 * - `hints`: Lines below the totals, empty ones left out.
 *
 * @param day - Meals of the day with what they give together
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
            if (eaten.known && lacks !== "" && !(lacking.get(lacks) ?? []).includes(eaten.name))
                lacking.set(lacks, [...(lacking.get(lacks) ?? []), eaten.name]);
        }
    const empty: number = day.meals.filter((meal: Meal): boolean => meal.foods.length === 0).length;
    const hints: string[] = [
        unknown.length > 0 ? `Not counted, not in my foods: ${unknown.join(", ")}` : "",
        weightless.length > 0 ? `Not counted, no grams: ${weightless.join(", ")}` : "",
        ...[...lacking].map(
            ([lacks, names]: [string, string[]]): string =>
                `Not counted, ${lacks} unknown: ${names.join(", ")}`,
        ),
        empty > 0
            ? `Not counted: ${empty} ${empty === 1 ? "meal lists" : "meals list"} no foods`
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
 * Adds up the kcal of foods of an entry that count, those of my foods with grams.
 * - `counted`: The foods that count.
 *
 * @param foods - Foods with what they give, like those of a meal of mine
 * @returns Their kcal, `null` when none of them counts, so its line shows none, never 0
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
 * Builds a line of what an entry holds, a name: a meal of mine alone,
 * or a food alone, without its brand and store, which only tell which one it is when I pick it;
 * in the two columns of numbers what it gives, a food its grams grey in brackets and its kcal last,
 * like `(230 g) 363 kcal`, the millilitres of a drink,
 * like `(330 ml)`, a meal its kcal alone, the sum of its foods, like `842 kcal`;
 * a food not in my foods only its grams, and a food without grams nothing,
 * which the hints below the totals name, see {@link totalsShow};
 * a meal or a food eaten by itself in the text of controls,
 * the foods of a meal indented below it, see {@link mealLinesOf}.
 * - `line`: The line.
 *
 * @param name - Name of the meal or the food, like `Chili con Carne` or `Semmel`
 * @param kcal - What it gives, see {@link kcalOf}, `null` for nothing known
 * @param eaten - The food with its grams, `null` for a meal, which has none
 * @param item - Whether it stands at the top of its entry, as a meal or a food eaten by itself
 * @returns Line in the columns of the meals
 */
function whatLineOf(
    name: string,
    kcal: number | null,
    eaten: Eaten | null,
    item: boolean,
): HTMLElement {
    const line: HTMLElement = elementOf("div", item ? "food-line food-meal" : "food-line", "");
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
 * Builds the lines of an entry: its start in grey above it, linking to its day in the day view,
 * so no column of times takes room beside the names, and where,
 * and in the column of kcal what the whole entry gives, in bold, the sum of the lines below it,
 * always where it gives anything known;
 * then what it holds, each line a name with what it gives, see {@link whatLineOf}:
 * each meal of mine with the kcal of its foods, below it its foods with their kcal and grams,
 * and each food eaten by itself with its kcal and grams,
 * like bread beside the chili or an apple alone,
 * so a food never stands under a meal it does not belong to;
 * an older entry whose summary names more than its foods,
 * like `Bortzeit`, stands as one meal of that name;
 * an entry without foods stands by its summary with a hint.
 * - `entry`: Line of its start and place, and of its kcal.
 * - `when`: Its start and place.
 * - `meals`: Foods of each meal of mine, by the name of the meal, in the order of the lines.
 * - `alone`: Foods eaten by themselves.
 *
 * @param meal - Entry with what it gives
 * @returns Lines of the entry
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
    if (meals.size === 0 && meal.title.trim().toLowerCase() !== summaryOf(alone).toLowerCase()) {
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
 * Builds an entry as one block of its lines, see {@link mealLinesOf},
 * which a click opens in the day view's dialog of the entry, the same as a click on it in the log,
 * see `logEntryOpen` in `../editor/dialog.ts`; a click on its start shows its day instead.
 * A change saved there loads the day anew, as every change of a file does, see {@link foodStart}.
 * - `block`: The block.
 *
 * @param meal - Entry with what it gives
 * @returns Block of the entry
 */
function mealBlockOf(meal: Meal): HTMLElement {
    const block: HTMLElement = elementOf("div", "food-eaten", "");
    block.append(...mealLinesOf(meal));
    block.addEventListener("click", (event: MouseEvent): void => {
        if ((event.target as HTMLElement).closest("a") === null)
            logEntryOpen(meal.id, meal.start).catch((error: unknown): void => console.error(error));
    });
    return block;
}

/**
 * Shows a day: writes its weekday short and its date in the bar,
 * like `13.10.2026 (Tue)`, turns the icon back to today off on today,
 * then loads its meals and shows them with their totals,
 * unless another day was asked for meanwhile;
 * a day without meals shows no totals, only that it has none.
 * - `food`: Meals of the day with what they give.
 * - `lines`: Blocks of all meals, see {@link mealBlockOf}.
 *
 * @param day - Day like `2026-10-10`
 * @throws {Error} - When the reader cannot answer
 */
async function dayShow(day: string): Promise<void> {
    shown = day;
    (document.getElementById("food-date") as HTMLElement).textContent = dayTextOf(day, true);
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
 *
 * @param day - Day like `2026-10-10`
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
 * Shows the day some days before or after the one shown.
 * - `date`: Date of the day to show.
 *
 * @param days - Days to go, like -1 for the day before
 */
function dayMove(days: number): void {
    const date: Date = dateOf(shown);
    date.setDate(date.getDate() + days);
    dayOpen(dayOf(date));
}

/**
 * Starts the food view after the router has put its HTML into the page:
 * the arrows and the icon back to today, the day a link asks for or today's calendar date,
 * which moves on to the new day by itself while it is shown, see `today.ts`,
 * and loads anew after every change of the files,
 * see `../changes.ts`, my meals and the food search.
 * - `before`, `after`, `today`: Buttons to the day before and after, and back to today.
 */
export function foodStart(): void {
    const before: HTMLElement = document.getElementById("food-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("food-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("food-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayMove(-1));
    after.addEventListener("click", (): void => dayMove(1));
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
