/**
 * ## Times
 *
 * Turns dates into the values of time fields and back,
 * for the panels of the day and the form of a series,
 * gives the times a box is logged at with one tap, and writes how near a day is.
 * A time field is one text field, typed in 24-hour form whatever the browser's language:
 * `14` is 14:00, `1415` and `14:15` are 14:15, `915` and `9:15` are 09:15.
 * When the field loses focus, its time shows as `HH:MM`;
 * any other text marks the field invalid,
 * so the browser does not send the form and says what it takes instead.
 * An empty field is left to its `required`:
 * start and end of a log entry need a time, the expected time of a box may stay empty.
 * A date field, like the day of a deadline,
 * shows its day with its weekday short after it,
 * as every day of the page is written, `23.10.2026 (Fri)`, see {@link weekdayDateTextOf},
 * and says grey while empty what I type, `dd.mm.yyyy`;
 * it takes a date in my standard way with its year, `23.10.2026`,
 * the weekday filled in once I leave it, and marks itself invalid the same way.
 * A box of the plan and a plain series take their time either from and to,
 * or only how long they last, typed as a time is,
 * like `08:00` for my sleep, a switch after the fields going from one to the other,
 * see {@link lengthSwapOf}.
 *
 * - `lucide`: The arrows of the switch between times and a length.
 * - `../icons.ts`: Puts an icon into a button.
 * - `../skill/attempts.ts`: Writes a date as a day, and a day with its weekday.
 * - `../today.ts`: Gives today's calendar date.
 * - `./boxes.ts`: The type of a box, for the type checker only.
 */

import { ArrowLeftRight } from "lucide";
import { iconPut } from "../icons.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";

import type { Box } from "./boxes.ts";

/**
 * Minutes a box without expected duration lasts when it goes into the log,
 * like the last half hour `+` of the log opens.
 */
export const boxMinutes: number = 30;

/**
 * The dash between the start and the end of a range written as text,
 * like `14:00 – 16:00`, with a space on each side,
 * as the dot between two parts of a line has it,
 * in the plan, in the log and everywhere else,
 * and as far as the dash between two fields stands from them,
 * see `--range-gap` in `../variants.css`.
 */
export const rangeDash: string = " – ";

/**
 * Writes the time of a date as `HH:MM`, the value of a time field.
 *
 * @param date - Date with the time
 * @returns Time like `09:15`
 */
export function timeOf(date: Date): string {
    return date.toTimeString().slice(0, 5);
}

/**
 * Writes a length of time in hours and minutes,
 * each two digits, like `07h 30m` or `08h 00m`,
 * as every length of the page shows it:
 * the sleep, the timer of a session,
 * a box without times and the real minutes in the dialog of a box;
 * a space that never breaks between hours and minutes, so a length stays on one line.
 *
 * @param minutes - Whole minutes, like 450
 * @returns Length like `07h 30m`
 */
export function lengthOf(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}h\u00a0${String(minutes % 60).padStart(2, "0")}m`;
}

/**
 * Writes minutes as a length in its field, hours and minutes as a time is written,
 * see {@link lengthSwapOf}.
 *
 * @param minutes - Minutes, like 480
 * @returns Length like `08:00`
 */
export function lengthTextOf(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Gives the minutes of a time or a length typed as `hh:mm`.
 *
 * @param time - Time like `08:30`
 * @returns Minutes, like 510
 */
export function minutesOf(time: string): number {
    const [hour, minute]: number[] = time.split(":").map(Number);
    return hour * 60 + minute;
}

/**
 * Makes the switch of the time of a box or a plain series between from and to
 * and only how long it lasts, see the top of this file:
 * the two arrows as a small icon button right beside the name of the row, like `Time ⇆`,
 * where the plus of a row like `Chapter +` stands, in its look,
 * see `.entry-name .plus-quiet` in `choices.ts`, saying what a click goes to.
 * - `swap`: The switch.
 *
 * @param timed - Whether the time is from and to now
 * @param click - Goes to the other
 * @returns The switch
 */
export function lengthSwapOf(timed: boolean, click: () => void): HTMLButtonElement {
    const swap: HTMLButtonElement = document.createElement("button");
    swap.type = "button";
    swap.className = "plus-quiet";
    iconPut(swap, ArrowLeftRight, timed ? "Only how long" : "From and to");
    swap.addEventListener("click", click);
    return swap;
}

/**
 * Puts a time of a time field on the day of a date.
 *
 * @param day - Date on the day
 * @param time - Time like `09:15`
 * @returns Date of the day at the time
 */
export function dateOf(day: Date, time: string): Date {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    const date: Date = new Date(day);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/**
 * Gives now on a shown day, to the minute:
 * now itself while the day is today, else the time of now on that day,
 * like a glass of water added to a past day at 01:10 of that day.
 * - `now`: Now, without its seconds.
 *
 * @param day - The shown day, like the start of the calendar's day
 * @returns The instant
 */
export function nowOn(day: Date): Date {
    const now: Date = new Date();
    now.setSeconds(0, 0);
    return dayOf(day) === calendarTodayOf() ? now : dateOf(day, timeOf(now));
}

/**
 * Reads a typed time: the hours, then, with or without `:`,
 * two digits of minutes if there are any.
 * - `match`: Hours and minutes of the text,
 *   the minutes `undefined` when only hours are typed.
 *
 * @param text - Typed text, like `915`
 * @returns Time like `09:15`, or `null` when the text is no time of the day
 */
function timeParse(text: string): string | null {
    const match: RegExpMatchArray | null = text.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
    if (match === null || Number(match[1]) > 23 || Number(match[2] ?? 0) > 59)
        return null;
    return `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
}

/**
 * Shows the time of a date in a time field and marks the field valid.
 *
 * @param field - Time field, like `<input id="entry-start">`
 * @param date - Date with the time, `null` for an empty field,
 *   like a box without expected time
 */
export function timeFieldShow(field: HTMLInputElement, date: Date | null): void {
    field.value = date === null ? "" : timeOf(date);
    field.setCustomValidity("");
}

/**
 * Reads the time of a time field.
 *
 * @param field - Time field
 * @returns Time like `09:15`, empty when the text is no time
 */
export function timeFieldRead(field: HTMLInputElement): string {
    return timeParse(field.value) ?? "";
}

/**
 * Writes a day in my standard way, like `23.10.2026`, the value of a date field.
 *
 * @param day - Day like `2026-10-23`
 * @returns Date like `23.10.2026`
 */
export function dateTextOf(day: string): string {
    return day.split("-").reverse().join(".");
}

/**
 * Writes a day with its weekday short after it,
 * like `23.10.2026 (Fri)`, the value of a date field,
 * as every day of the page is written, see `dayTextOf` in `../skill/attempts.ts`.
 *
 * @param day - Day like `2026-10-23`
 * @returns Date like `23.10.2026 (Fri)`
 */
export function weekdayDateTextOf(day: string): string {
    return dayTextOf(day, true);
}

/**
 * Reads a typed date in my standard way: day, month and year with dots between,
 * like `23.10.2026` or `1.2.2027`,
 * also with its weekday after it, as a date field shows it,
 * like `23.10.2026 (Fri)`, the weekday not read, since the date says it.
 * - `match`: Day, month and year of the text.
 * - `day`: The day, like `2026-10-23`.
 * - `date`: The day at noon,
 *   which is no date or another day for a day the month lacks, like `31.02.2027`.
 *
 * @param text - Typed text
 * @returns Day like `2026-10-23`, or `null` when the text is no date
 */
export function dateParse(text: string): string | null {
    const match: RegExpMatchArray | null = text
        .trim()
        .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*\([a-z]+\))?$/i);
    if (match === null) return null;
    const day: string = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    const date: Date = new Date(`${day}T12:00:00`);
    return date.getDate() === Number(match[1]) && date.getMonth() + 1 === Number(match[2])
        ? day
        : null;
}

/**
 * Gives the times a box is logged at as expected, with one tap:
 * from its expected time for its expected duration,
 * else from the coming quarter hour on the shown day, like 14:45 at 14:41,
 * since I log from the plan what I start now or am about to do, never what I finished;
 * for {@link boxMinutes} when it has no duration.
 * - `length`: Its length in milliseconds.
 * - `start`: Its expected time, else the time of now on the shown day,
 *   moved on to the coming quarter hour.
 *
 * @param box - The box
 * @param day - A date on the shown day
 * @returns Start and end
 */
export function boxTimesOf(box: Box, day: Date): [Date, Date] {
    const length: number = (box.minutes ?? boxMinutes) * 60 * 1000;
    if (box.time !== "") {
        const start: Date = new Date(box.time);
        return [start, new Date(start.getTime() + length)];
    }
    const start: Date = dateOf(day, timeOf(new Date()));
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
    return [start, new Date(start.getTime() + length)];
}

/**
 * Writes how near a day is, seen from another day: `today`, `tomorrow` or `in 3 days`,
 * like the deadline of a box on the day it shows on,
 * see `boxes.ts`, or an exam of a module,
 * see `../editor/course.ts`.
 * - `days`: Whole days from the one day to the other, from noon to noon,
 *   so a day the clocks change counts right.
 *
 * @param day - The day, like `2026-10-23`
 * @param from - The day it is seen from, like `2026-10-20`, on or before it
 * @returns How near it is
 */
export function nearOf(day: string, from: string): string {
    const days: number = Math.round(
        (Date.parse(`${day}T12:00:00`) - Date.parse(`${from}T12:00:00`)) /
            (24 * 60 * 60 * 1000),
    );
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
}

/**
 * Starts a time field: while empty it says grey what it takes, `hh:mm`,
 * as a date field says `dd.mm.yyyy`,
 * so an empty time reads as one left open, not as a gap;
 * it marks itself invalid while its text is neither empty nor a time,
 * and writes its time as `HH:MM` when it loses focus, like `14:15` of `1415`.
 * - {@link HTMLInputElement#setCustomValidity}: Marks a field invalid with a message,
 *   or valid with an empty one;
 *   the browser shows the message instead of sending the form.
 * - `change`: Comes when a changed field loses focus.
 *
 * @param field - Time field, like `<input class="time-field">`
 */
export function timeFieldStart(field: HTMLInputElement): void {
    field.placeholder = "hh:mm";
    field.addEventListener("input", (): void =>
        field.setCustomValidity(
            field.value.trim() !== "" && timeParse(field.value) === null
                ? "Time like 14:00, 1415 or 14"
                : "",
        ),
    );
    field.addEventListener("change", (): void => {
        field.value = timeParse(field.value) ?? field.value;
    });
}

/**
 * Starts a date field: while empty it says grey what it takes, `dd.mm.yyyy`,
 * as a time field says `hh:mm`;
 * it marks itself invalid while its text is neither empty nor a date,
 * and writes its date with its weekday when it loses focus,
 * like `01.02.2027 (Mon)` of `1.2.2027`,
 * see {@link weekdayDateTextOf}.
 * - `change`: Comes when a changed field loses focus.
 * - `day`: Typed date as day, `null` when it is no date.
 *
 * @param field - Date field, like `<input class="date-field">`
 */
export function dateFieldStart(field: HTMLInputElement): void {
    field.placeholder = "dd.mm.yyyy";
    field.addEventListener("input", (): void =>
        field.setCustomValidity(
            field.value.trim() !== "" && dateParse(field.value) === null
                ? "Date like 23.10.2026"
                : "",
        ),
    );
    field.addEventListener("change", (): void => {
        const day: string | null = dateParse(field.value);
        field.value = day === null ? field.value : weekdayDateTextOf(day);
    });
}

/**
 * Starts the time and date fields after the router has put its HTML into the page,
 * see {@link timeFieldStart} and {@link dateFieldStart}.
 */
export function timesStart(): void {
    document.querySelectorAll<HTMLInputElement>(".time-field").forEach(timeFieldStart);
    document.querySelectorAll<HTMLInputElement>(".date-field").forEach(dateFieldStart);
}
