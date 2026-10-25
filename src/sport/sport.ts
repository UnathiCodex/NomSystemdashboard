/**
 * ## Sport
 *
 * Shows my sessions of sport on a day,
 * and my workouts and exercises, in the scheme of the food view,
 * whose look it takes, see `../food/food.css`.
 * The bar of the day, as the day has it: its date with its weekday short after it,
 * like `17.10.2026 (Sat)`, between the arrows to the day before and after,
 * a small icon beside it back to today, faded and off on today.
 * The day: the number of its sessions, their time together and the kcal they burned above rest,
 * an estimate, see `reader/sport.ts`, written whole without `~`,
 * since every kcal of the page is rounded anyway, without goals, so the log stays a log;
 * then each session of the log: its start,
 * linking to the day in the day view,
 * and its kcal in bold, below it its kind and its workout with its time, like `Gym · Push`,
 * and below that, indented, what I did: each exercise with its sets, repetitions and kilograms,
 * like `3 × 10 · 40 kg`, and each video with its channel grey and its minutes.
 * A session counts 0 kcal while I have no weight, and so do the totals, never an empty place.
 * Last among the totals, also on a day without sessions, my weight on the day,
 * the last one I wrote on or before it,
 * like `60.5 kg`, with a small grey pencil, only the pencil while I have none:
 * a click turns it into a field in its place,
 * Enter or leaving it writes the weight of the shown day, Escape takes it back,
 * see {@link weightEdit}; I change it every month or two, so it needs no place of its own,
 * and the kcal of the day and of my videos count with it anew.
 * Beside the day my workouts and exercises, see `lists.ts`.
 * It opens on today's calendar date, which turns at 00:00, also after a reload,
 * and while it shows today it moves on with it;
 * only a link like `/sport?date=2026-10-10` opens on that day, see `today.ts`.
 * The day loads anew the moment a file of my new system changes, whoever changed it,
 * like a session logged on my phone, see `../changes.ts`,
 * so it always shows the sessions as they lie in the log;
 * not while I type my weight, which the field would lose,
 * and which shows the day anew itself once written or taken back.
 *
 * - `./mine.ts`: Loads the sessions of a day with what they took, and sends my weight of a day.
 * - `./lists.ts`: The sections of my workouts, exercises and videos,
 *   loaded anew after my weight changed.
 * - `../food/foods.ts`: Writes amounts and makes elements.
 * - `../day/times.ts`: Writes a length of time, like `01h 10m`.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader,
 *   and a day with its weekday for the bar.
 * - `../today.ts`: Gives today's calendar date and the day a link asks for,
 *   and moves the sport view on to the new day while it shows today.
 * - `../changes.ts`: Loads the day anew the moment a file of my new system changes.
 * - `../icons.ts`: Puts the arrows and the icon back to today into their buttons,
 *   their words as tooltip, and makes the pencil of my weight.
 * - `lucide`: The icons of the arrows, of today and the pencil.
 * - `../food/food.css`, `../food/search.css`, `../food/meals.css`: Look of the food view,
 *   which the sport view takes.
 * - `./sport.css`: What the sport view adds to it.
 */

import { sportDayLoad, weightSend } from "./mine.ts";
import { listsOf, mineReload } from "./lists.ts";
import { amountOf, buttonOf, elementOf } from "../food/foods.ts";
import { lengthOf } from "../day/times.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { iconOf, iconPut } from "../icons.ts";
import { CalendarCheck, ChevronLeft, ChevronRight, Pencil } from "lucide";
import "../food/food.css";
import "../food/search.css";
import "../food/meals.css";
import "./sport.css";

import type { Session, SportDay } from "./mine.ts";

/**
 * Day shown, like `2026-10-17`.
 */
let shown: string = "";

/**
 * Writes kcal burned as the page shows them, whole, 0 while none are known, like without my weight.
 *
 * @param kcal - kcal, `null` for none known
 * @returns Text like `175 kcal` or `0 kcal`
 */
function kcalTextOf(kcal: number | null): string {
    return `${amountOf(kcal ?? 0, 0)} kcal`;
}

/**
 * Turns a day into its date at midnight in local time.
 *
 * @param day - Day like `2026-10-17`
 * @returns Date
 */
function dateOf(day: string): Date {
    const [year, month, date]: number[] = day.split("-").map(Number);
    return new Date(year, month - 1, date);
}

/**
 * Shows the totals of a day:
 * on a day with sessions their number, their time and their kcal, 0 while none are known,
 * each with its name small above; and on every day my weight, last, see {@link weightOf}.
 * - `totals`: The totals side by side.
 * - `tiles`: Name and amount of each total of the sessions.
 *
 * @param day - Sessions of the day with what they took together, and my weight on it
 */
function totalsShow(day: SportDay): void {
    const totals: HTMLElement = elementOf("div", "food-totals", "");
    const tiles: [string, string][] =
        day.sessions.length === 0
            ? []
            : [
                  ["Sessions", String(day.sessions.length)],
                  ["Time", lengthOf(day.minutes)],
                  ["Energy", kcalTextOf(day.kcal)],
              ];
    for (const [name, amount] of tiles) {
        const tile: HTMLElement = elementOf("div", "food-total", "");
        tile.append(
            elementOf("span", "food-label", name),
            elementOf("span", "food-amount", amount),
        );
        totals.append(tile);
    }
    totals.append(weightOf(day.kg));
    document.getElementById("sport-totals")?.replaceChildren(totals);
}

/**
 * Makes the total of my weight on the shown day: its name small above,
 * then the kilograms with one decimal and the small grey pencil right after them,
 * while I have none a grey `– kg` before it, so the pencil always follows a value;
 * a click on it turns it into a field, see {@link weightEdit}.
 * - `tile`: The total.
 * - `amount`: Its kilograms with the pencil, a button.
 *
 * @param kg - My weight on the day, `null` for none
 * @returns The total
 */
function weightOf(kg: number | null): HTMLElement {
    const tile: HTMLElement = elementOf("div", "food-total sport-weight", "");
    const amount: HTMLButtonElement = buttonOf(
        "food-amount sport-weight-amount",
        kg === null ? "– kg" : `${amountOf(kg, 1)} kg`,
        (): void => weightEdit(tile, kg),
    );
    amount.classList.toggle("sport-weight-none", kg === null);
    amount.append(iconOf(Pencil));
    amount.title = "Change my weight";
    tile.append(elementOf("span", "food-label", "Weight"), amount);
    return tile;
}

/**
 * Turns the total of my weight into a field in its place,
 * its kilograms in it and the cursor after them:
 * Enter or leaving it writes the weight of the shown day, see `weightSend` in `mine.ts`,
 * and shows the day with it and my lists anew, whose kcal count with it;
 * the same weight or an empty field writes nothing; Escape takes it back;
 * kilograms the reader does not take, like `abc`, keep the field open and say what it takes.
 * - `field`: The field.
 * - `amount`: The field with its unit.
 * - `done`: Whether the field was written or taken back,
 *   so leaving it after Enter writes nothing twice.
 * - `save`: Writes the weight typed.
 *
 * @param tile - The total of my weight
 * @param kg - My weight shown, `null` for none
 */
function weightEdit(tile: HTMLElement, kg: number | null): void {
    const field: HTMLInputElement = document.createElement("input");
    const amount: HTMLElement = elementOf("span", "food-amount sport-weight-amount", "");
    let done: boolean = false;
    const save: () => void = (): void => {
        const typed: string = field.value.trim();
        if (done) return;
        if (typed === "" || Number(typed.replace(",", ".")) === kg) {
            done = true;
            dayOpen(shown);
            return;
        }
        weightSend(shown, typed)
            .then((day: SportDay): void => {
                done = true;
                dayDraw(day);
                mineReload();
            })
            .catch((error: unknown): void => {
                console.error(error);
                field.setCustomValidity("Kilograms like 60.5");
                field.reportValidity();
            });
    };
    field.type = "text";
    field.inputMode = "decimal";
    field.autocomplete = "off";
    field.className = "sport-weight-field";
    field.value = kg === null ? "" : String(kg);
    field.setAttribute("aria-label", "My weight in kilograms");
    field.addEventListener("input", (): void => field.setCustomValidity(""));
    field.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        } else if (event.key === "Escape") {
            event.preventDefault();
            done = true;
            dayOpen(shown);
        }
    });
    field.addEventListener("blur", save);
    amount.append(field, " kg");
    tile.querySelector(".sport-weight-amount")?.replaceWith(amount);
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
}

/**
 * Writes what I did of an exercise as its line shows it: its sets and repetitions,
 * then its kilograms after a middle dot, those it has,
 * like `3 × 10 · 40 kg`, `3 × 10` or `2 × 60 s`.
 * - `reps`: Its repetitions, seconds written with a space before `s`.
 * - `sets`: Its sets and repetitions.
 *
 * @param exercise - The exercise of a session
 * @returns Text like `3 × 10 · 40 kg`, empty when nothing is written
 */
function doneTextOf(exercise: Session["exercises"][number]): string {
    const reps: string = exercise.reps.replace(/^(\d+)s$/, "$1 s");
    const sets: string =
        exercise.sets === "" ? reps : reps === "" ? exercise.sets : `${exercise.sets} × ${reps}`;
    return [sets, exercise.kg === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
}

/**
 * Builds the line of a part of a session, indented under its kind,
 * see `.food-line` in `../food/food.css`.
 * - `line`: The line.
 * - `what`: Its name, with what stands grey after it.
 *
 * @param name - Name of the exercise or title of the video
 * @param grey - What stands grey after it, like the channel of a video, empty for none
 * @param value - What stands at the right, like `3 × 10 · 40 kg`
 * @returns The line
 */
function partLineOf(name: string, grey: string, value: string): HTMLElement {
    const line: HTMLElement = elementOf("div", "food-line", "");
    const what: HTMLElement = elementOf("span", "food-what", name);
    if (grey !== "") what.append(elementOf("span", "food-place", ` · ${grey}`));
    line.append(what, elementOf("span", "food-value", value));
    return line;
}

/**
 * Builds the lines of a session: its start in grey above it, linking to its day in the day view,
 * and at the right its kcal in bold, 0 while none are known;
 * then its kind and its workout with its time; then each exercise and each video.
 * - `entry`: Line of its start and its kcal.
 * - `start`: Its start, a link.
 * - `kind`: Line of its kind, its workout and its time.
 *
 * @param session - Session with what it took
 * @returns Lines of the session
 */
function sessionLinesOf(session: Session): HTMLElement[] {
    const entry: HTMLElement = elementOf("div", "food-entry", "");
    const start: HTMLAnchorElement = document.createElement("a");
    start.className = "food-time";
    start.href = `/?date=${shown}`;
    start.textContent = new Date(session.start).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });
    entry.append(start, elementOf("span", "food-value", kcalTextOf(session.kcal)));
    const kind: HTMLElement = elementOf("div", "food-line food-meal", "");
    kind.append(
        elementOf(
            "span",
            "food-what",
            session.workout === "" ? session.kind : `${session.kind} · ${session.workout}`,
        ),
        elementOf("span", "food-value", lengthOf(session.minutes)),
    );
    return [
        entry,
        kind,
        ...(session.exercises ?? []).map((exercise: Session["exercises"][number]): HTMLElement =>
            partLineOf(exercise.name, "", doneTextOf(exercise)),
        ),
        ...(session.videos ?? []).map((video: Session["videos"][number]): HTMLElement =>
            partLineOf(
                video.title,
                video.channel,
                video.minutes === null ? "" : lengthOf(Math.round(video.minutes)),
            ),
        ),
    ];
}

/**
 * Shows a day: writes its weekday and its date in the bar,
 * turns the icon back to today off on today,
 * then loads its sessions and draws them with their totals,
 * unless another day was asked for meanwhile, see {@link dayDraw}.
 * - `day`: Sessions of the day with what they took.
 *
 * @param date - Day like `2026-10-17`
 * @throws {Error} - When the reader cannot answer
 */
async function dayShow(date: string): Promise<void> {
    shown = date;
    (document.getElementById("sport-date") as HTMLElement).textContent = dayTextOf(date, true);
    (document.getElementById("sport-today") as HTMLButtonElement).disabled =
        date === calendarTodayOf();

    const day: SportDay = await sportDayLoad(date);
    if (date !== shown) return;
    dayDraw(day);
}

/**
 * Draws the sessions of the shown day with their totals and my weight,
 * or only my weight and that it has none.
 *
 * @param day - Sessions of the day with what they took, and my weight on it
 */
function dayDraw(day: SportDay): void {
    totalsShow(day);
    document
        .getElementById("sport-sessions")
        ?.replaceChildren(
            ...(day.sessions.length === 0
                ? [elementOf("p", "food-none", "No sport in the log on this day")]
                : day.sessions.flatMap(sessionLinesOf)),
        );
}

/**
 * Shows a day, or a hint when the reader cannot read its sessions.
 *
 * @param day - Day like `2026-10-17`
 */
function dayOpen(day: string): void {
    dayShow(day).catch((error: unknown): void => {
        console.error(error);
        document.getElementById("sport-totals")?.replaceChildren();
        document
            .getElementById("sport-sessions")
            ?.replaceChildren(elementOf("p", "food-none", "The sessions cannot be read"));
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
 * Starts the sport view after the router has put its HTML into the page:
 * the arrows and the icon back to today, the day a link asks for or today's calendar date,
 * which moves on to the new day by itself while it is shown, see `today.ts`,
 * and loads anew after every change of the files, see `../changes.ts`,
 * unless the field of my weight is open, see {@link weightEdit}, and my lists.
 * - `before`, `after`, `today`: Buttons to the day before and after, and back to today.
 */
export function sportStart(): void {
    const before: HTMLElement = document.getElementById("sport-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("sport-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("sport-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayMove(-1));
    after.addEventListener("click", (): void => dayMove(1));
    today.addEventListener("click", (): void => dayOpen(calendarTodayOf()));
    document.getElementById("sport-lists")?.append(...listsOf());
    dayOpen(askedDayOf() ?? calendarTodayOf());
    todayFollow((): string => shown, dayOpen);
    changesFollow((): void => {
        if (document.querySelector(".sport-weight-field") === null) dayOpen(shown);
    });
}
