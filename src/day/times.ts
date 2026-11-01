/**
 * ## Times
 *
 * Time and date fields, the times a box is logged at, how near a day is.
 * A time field is one text field in 24-hour form whatever the browser's language.
 * Any other text marks a field invalid, so the browser does not send the form.
 * An empty field is left to its `required`.
 * A date field takes a date in my standard way and shows its weekday after it.
 */

import { ArrowLeftRight } from "lucide";
import { iconPut } from "../icons.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";

import type { Box } from "./boxes.ts";

/** Minutes a box without expected duration lasts in the log. */
export const boxMinutes: number = 30;

/** The dash of a range written as text, as far from its parts as the dash between two fields. */
export const rangeDash: string = " – ";

/** The time of a date as `HH:MM`. */
export function timeOf(date: Date): string {
    return date.toTimeString().slice(0, 5);
}

/** A length as `07h 30m`, with a space that never breaks, so it stays on one line. */
export function lengthOf(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}h\u00a0` + `${String(minutes % 60).padStart(2, "0")}m`;
}

/** Minutes as a length in its field, written as a time. */
export function lengthTextOf(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:` + String(minutes % 60).padStart(2, "0");
}

/** The minutes of a time or a length typed as `hh:mm`. */
export function minutesOf(time: string): number {
    const [hour, minute]: number[] = time.split(":").map(Number);
    return hour * 60 + minute;
}

/** The switch of a box or a plain series between from and to and only how long it lasts. */
export function lengthSwapOf(timed: boolean, click: () => void): HTMLButtonElement {
    const swap: HTMLButtonElement = document.createElement("button");
    swap.type = "button";
    swap.className = "plus-quiet";
    iconPut(swap, ArrowLeftRight, timed ? "Only how long" : "From and to");
    swap.addEventListener("click", click);
    return swap;
}

/** Puts a time of a time field on the day of a date. */
export function dateOf(day: Date, time: string): Date {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    const date: Date = new Date(day);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/** Now on a shown day, to the minute, the time of now on a day that isn't today. */
export function nowOn(day: Date): Date {
    const now: Date = new Date();
    now.setSeconds(0, 0);
    return dayOf(day) === calendarTodayOf() ? now : dateOf(day, timeOf(now));
}

/** Reads a typed time, the hours and two digits of minutes with or without `:`. */
function timeParse(text: string): string | null {
    const match: RegExpMatchArray | null = text.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
    if (match === null || Number(match[1]) > 23 || Number(match[2] ?? 0) > 59) return null;
    return `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
}

/** Shows the time of a date in a time field and marks the field valid. */
export function timeFieldShow(field: HTMLInputElement, date: Date | null): void {
    field.value = date === null ? "" : timeOf(date);
    field.setCustomValidity("");
}

/** The time of a time field, empty when the text is no time. */
export function timeFieldRead(field: HTMLInputElement): string {
    return timeParse(field.value) ?? "";
}

/** A day in my standard way, `dd.mm.yyyy`. */
export function dateTextOf(day: string): string {
    return day.split("-").reverse().join(".");
}

/** A day with its weekday short after it. */
export function weekdayDateTextOf(day: string): string {
    return dayTextOf(day, true);
}

/**
 * Reads a typed date in my standard way, a weekday after it not read.
 * A day the month lacks gives another day at noon, so it is no date.
 */
export function dateParse(text: string): string | null {
    const match: RegExpMatchArray | null = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*\([a-z]+\))?$/i);
    if (match === null) return null;
    const day: string = `${match[3]}-${match[2].padStart(2, "0")}-` + match[1].padStart(2, "0");
    const date: Date = new Date(`${day}T12:00:00`);
    return date.getDate() === Number(match[1]) && date.getMonth() + 1 === Number(match[2]) ? day : null;
}

/**
 * The times a box is logged at with one tap, from its expected time,
 * else from the coming quarter hour on the shown day.
 * I log from the plan what I start now, never what I finished.
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
 * How near a day is from another day.
 * Days count from noon to noon, so a day the clocks change counts right.
 */
export function nearOf(day: string, from: string): string {
    const days: number = Math.round(
        (Date.parse(`${day}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / (24 * 60 * 60 * 1000),
    );
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
}

/**
 * Starts a time field, invalid while its text is neither empty nor a time, `HH:MM` when it loses focus.
 * Its grey `hh:mm` makes an empty time read as one left open, not as a gap.
 */
export function timeFieldStart(field: HTMLInputElement): void {
    field.placeholder = "hh:mm";
    field.addEventListener("input", (): void =>
        field.setCustomValidity(
            field.value.trim() !== "" && timeParse(field.value) === null ? "Time like 14:00, 1415 or 14" : "",
        ),
    );
    field.addEventListener("change", (): void => {
        field.value = timeParse(field.value) ?? field.value;
    });
}

/** Starts a date field, invalid while its text is neither empty nor a date, with its weekday when it loses focus. */
export function dateFieldStart(field: HTMLInputElement): void {
    field.placeholder = "dd.mm.yyyy";
    field.addEventListener("input", (): void =>
        field.setCustomValidity(
            field.value.trim() !== "" && dateParse(field.value) === null ? "Date like 23.10.2026" : "",
        ),
    );
    field.addEventListener("change", (): void => {
        const day: string | null = dateParse(field.value);
        field.value = day === null ? field.value : weekdayDateTextOf(day);
    });
}

/** Starts the time and date fields after the router has put its HTML into the page. */
export function timesStart(): void {
    document.querySelectorAll<HTMLInputElement>(".time-field").forEach(timeFieldStart);
    document.querySelectorAll<HTMLInputElement>(".date-field").forEach(dateFieldStart);
}
