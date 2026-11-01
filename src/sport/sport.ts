/**
 * ## Sport
 *
 * Shows my sessions of sport on a day,
 * and my workouts and exercises, see `lists.ts`, in the scheme of the food view,
 * whose look it takes, see `../food/food.css`.
 * The bar of the day, as the day has it, between the arrows to the day before and after.
 * The day: the number of its sessions,
 * their time together and the kcal they burned above rest,
 * an estimate, see `reader/sport.ts`, written whole without `~`,
 * since every kcal of the page is rounded anyway, without goals, so the log stays a log;
 * then each session of the log with what I did.
 * Last among the totals my weight on the day, the last one I wrote on or before it,
 * 80 kg before the first, see {@link weightEdit}; I change it every month or two,
 * so it needs no place of its own.
 * It opens on today's calendar date and moves on with it, see `../today.ts`.
 * The day loads anew the moment a file of my new system changes, whoever changed it,
 * see `../changes.ts`, so it always shows the sessions as they lie in the log;
 * not while I type my weight, which the field would lose,
 * and which shows the day anew itself once written or taken back.
 */

import { sportDayLoad, weightSend } from "./mine.ts";
import { listsOf, mineReload } from "./lists.ts";
import { amountOf, buttonOf, elementOf, kcalTextOf } from "../food/foods.ts";
import { lengthOf } from "../day/times.ts";
import { dayAdd, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { iconOf, iconPut } from "../icons.ts";
import { CalendarCheck, ChevronLeft, ChevronRight, Pencil } from "lucide";
import "../food/food.css";
import "../food/search.css";
import "../food/meals.css";
import "./sport.css";

import type { Session } from "./mine.ts";
import type { SportDay } from "../../reader/sport.ts";

/** Day shown. */
let shown: string = "";

/**
 * Shows the totals of a day: on a day with sessions their number, time and kcal,
 * and on every day my weight, last, see {@link weightOf}.
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
        tile.append(elementOf("span", "food-label", name), elementOf("span", "food-amount", amount));
        totals.append(tile);
    }
    totals.append(weightOf(day.kg));
    document.getElementById("sport-totals")?.replaceChildren(totals);
}

/**
 * Makes the total of my weight on the shown day, the small grey pencil after it.
 */
function weightOf(kg: number): HTMLElement {
    const tile: HTMLElement = elementOf("div", "food-total sport-weight", "");
    const amount: HTMLButtonElement = buttonOf("food-amount sport-weight-amount", `${amountOf(kg, 1)} kg`, (): void =>
        weightEdit(tile, kg),
    );
    amount.append(iconOf(Pencil));
    amount.title = "Change my weight";
    tile.append(elementOf("span", "food-label", "Weight"), amount);
    return tile;
}

/**
 * Turns the total of my weight into a field in its place:
 * Enter or leaving it writes the weight of the shown day, see `weightSend` in `mine.ts`,
 * and shows the day with it and my lists anew, whose kcal count with it;
 * the same weight or an empty field writes nothing; Escape takes it back;
 * kilograms the reader does not take keep the field open and say what it takes.
 * - `done`: Whether the field was written or taken back,
 *   so leaving it after Enter writes nothing twice.
 */
function weightEdit(tile: HTMLElement, kg: number): void {
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
    field.value = String(kg);
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
 * then its kilograms after a middle dot, those it has. Empty when nothing is written.
 */
function doneTextOf(exercise: Session["exercises"][number]): string {
    const reps: string = exercise.reps.replace(/^(\d+)s$/, "$1 s");
    const sets: string = exercise.sets === "" ? reps : reps === "" ? exercise.sets : `${exercise.sets} × ${reps}`;
    return [sets, exercise.kg === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
}

/**
 * Builds the line of a part of a session, indented under its summary,
 * see `.food-line` in `../food/food.css`.
 */
function partLineOf(name: string, grey: string, value: string): HTMLElement {
    const line: HTMLElement = elementOf("div", "food-line", "");
    const what: HTMLElement = elementOf("span", "food-what", name);
    if (grey !== "") what.append(elementOf("span", "food-place", ` · ${grey}`));
    line.append(what, elementOf("span", "food-value", value));
    return line;
}

/**
 * Builds the lines of a session: its start in grey linking to its day in the day view,
 * its kcal at the right; then its summary and workout with its time,
 * then each exercise and each video.
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
    const summary: HTMLElement = elementOf("div", "food-line food-meal", "");
    summary.append(
        elementOf(
            "span",
            "food-what",
            session.workout === "" ? session.summary : `${session.summary} · ${session.workout}`,
        ),
        elementOf("span", "food-value", lengthOf(session.minutes)),
    );
    return [
        entry,
        summary,
        ...(session.exercises ?? []).map((exercise: Session["exercises"][number]): HTMLElement =>
            partLineOf(exercise.name, "", doneTextOf(exercise)),
        ),
        ...(session.videos ?? []).map((video: Session["videos"][number]): HTMLElement =>
            partLineOf(video.title, video.channel, video.minutes === null ? "" : lengthOf(Math.round(video.minutes))),
        ),
    ];
}

/**
 * Shows a day: writes its date in the bar, then loads its sessions and draws them,
 * unless another day was asked for meanwhile.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function dayShow(date: string): Promise<void> {
    shown = date;
    (document.getElementById("sport-date") as HTMLElement).textContent = dayTextOf(date, true);
    (document.getElementById("sport-today") as HTMLButtonElement).disabled = date === calendarTodayOf();

    const day: SportDay = await sportDayLoad(date);
    if (date !== shown) return;
    dayDraw(day);
}

/** Draws the sessions of the shown day with their totals and my weight. */
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

/** Shows a day, or a hint when the reader cannot read its sessions. */
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
 * Starts the sport view after the router has put its HTML into the page.
 * It loads anew after every change of the files,
 * unless the field of my weight is open, see {@link weightEdit}.
 */
export function sportStart(): void {
    const before: HTMLElement = document.getElementById("sport-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("sport-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("sport-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayOpen(dayAdd(shown, -1)));
    after.addEventListener("click", (): void => dayOpen(dayAdd(shown, 1)));
    today.addEventListener("click", (): void => dayOpen(calendarTodayOf()));
    document.getElementById("sport-lists")?.append(...listsOf());
    dayOpen(askedDayOf() ?? calendarTodayOf());
    todayFollow((): string => shown, dayOpen);
    changesFollow((): void => {
        if (document.querySelector(".sport-weight-field") === null) dayOpen(shown);
    });
}
