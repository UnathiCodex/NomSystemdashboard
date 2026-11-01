/**
 * ## Sport
 *
 * Shows my sessions of sport on a day and my workouts and exercises, in the look of the food view.
 * The bar holds the number of sessions, their time and the kcal burned above rest, without goals,
 * so the log stays a log.
 * The kcal are an estimate written without `~`, since every kcal of the page is rounded anyway.
 * Last among the totals my weight, the last one written on or before the day, 80 kg before the first.
 * I change it every month or two, so it needs no place of its own.
 * The day loads anew on every change of the files, not while I type my weight, which the field would lose.
 */

import { sportDayLoad, weightSend } from "./mine.ts";
import { listsOf, mineReload, ruleTextOf } from "./lists.ts";
import { amountOf, buttonOf, elementOf, kcalTextOf, totalOf } from "../food/foods.ts";
import { lengthOf } from "../day/times.ts";
import { dayAdd, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { iconOf, iconPut } from "../icons.ts";
import { CalendarCheck, ChevronLeft, ChevronRight, Pencil } from "lucide";
import "../day/trackers.css";
import "../food/food.css";
import "../food/search.css";
import "../food/meals.css";
import "./sport.css";

import type { Session } from "./mine.ts";
import type { SportDay } from "../../reader/sport.ts";

/** Day shown. */
let shown: string = "";

/** Shows the totals of a day in the bar, 0 on a day without sessions, so the bar always looks the same. */
function totalsShow(day: SportDay): void {
    document
        .getElementById("sport-totals")
        ?.replaceChildren(
            totalOf("Sessions", String(day.sessions.length)),
            totalOf("Time", lengthOf(day.minutes)),
            totalOf("Energy", kcalTextOf(day.kcal)),
            weightOf(day.kg),
        );
}

/** Total of my weight on the shown day, the small grey pencil after it. */
function weightOf(kg: number): HTMLElement {
    const amount: HTMLButtonElement = buttonOf("sport-weight-amount", `${amountOf(kg, 1)} kg`, (): void =>
        weightEdit(tile, kg),
    );
    const tile: HTMLElement = totalOf("Weight", amount);
    amount.append(iconOf(Pencil));
    amount.title = "Change my weight";
    return tile;
}

/**
 * Turns the total of my weight into a field in its place.
 * Enter or leaving it writes the weight and shows the day and my lists anew, whose kcal count with it.
 * The same weight or an empty field writes nothing, Escape takes it back.
 * Kilograms the reader does not take keep the field open and say what it takes.
 * - `done`: Whether the field was written or taken back, so leaving it after Enter writes nothing twice.
 */
function weightEdit(tile: HTMLElement, kg: number): void {
    const field: HTMLInputElement = document.createElement("input");
    const amount: HTMLElement = elementOf("span", "sport-weight-amount", "");
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

/** Line of a part of a session, indented under its summary. */
function partLineOf(name: string, grey: string, value: string): HTMLElement {
    const line: HTMLElement = elementOf("div", "food-line", "");
    const what: HTMLElement = elementOf("span", "food-what", name);
    if (grey !== "") what.append(elementOf("span", "food-place", ` · ${grey}`));
    line.append(what, elementOf("span", "food-value", value));
    return line;
}

/**
 * Lines of a session, its start linking to its day and its kcal,
 * then its summary and workout with its time, then each exercise and video.
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
            partLineOf(exercise.name, "", ruleTextOf(exercise)),
        ),
        ...(session.videos ?? []).map((video: Session["videos"][number]): HTMLElement =>
            partLineOf(video.title, video.channel, video.minutes === null ? "" : lengthOf(Math.round(video.minutes))),
        ),
    ];
}

/**
 * Shows a day, its sessions drawn unless another day was asked for meanwhile.
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

/** Starts the sport view after the router has put its HTML into the page. */
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
