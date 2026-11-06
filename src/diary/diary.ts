/**
 * ## Diary
 *
 * My diary in the look of the food view, the log entries of a day by their start.
 * Each entry is one row across the page, at its left the lines of a box of the plan.
 * They say what it was and below it grey its time and place.
 * At its right stands its note in their size, which I write right there.
 * Only an entry with a note is a box, so the notes stand out among the entries without one.
 * An entry past midnight shows on the day it starts, so each note stands once.
 * A glass of water does not show, as in the log.
 * A note saves once I leave it, only while its file holds the note as the diary read it.
 * A click on an entry opens its dialog, one that cannot change shows its note only to read.
 * It loads anew the moment a file of my new system changes, but never over a note I write.
 * Not on a phone, which opens the day everywhere.
 */

import { entryPartOf, shownWhatOf, whatOf } from "../day/boxes.ts";
import { whereLinkedOf, whereOf } from "../day/places.ts";
import { roomOf } from "../day/series.ts";
import { rangeDash, timeOf } from "../day/times.ts";
import { dayAdd, dayOf, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { logEntryOpen } from "../editor/dialog.ts";
import { iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide";
import "../day/day.css";
import "../day/log.css";
import "../day/boxes.css";
import "../food/food.css";
import "./diary.css";

import type { DayEntry } from "../../reader/day.ts";

let shown: string = "";

/** Whether a change came while I wrote a note, so the day loads anew once I leave it. */
let waiting: boolean = false;

/** Whether I write a note or one holds what the reader did not take, its `before` the note in its file. */
function writing(): boolean {
    return [...document.querySelectorAll<HTMLTextAreaElement>(".diary-note")].some(
        (note: HTMLTextAreaElement): boolean =>
            note === document.activeElement || note.value.trim() !== (note.dataset.before ?? "").trim(),
    );
}

/** Loads the shown day anew after a change, once no note holds what I wrote. */
function dayAgain(): void {
    waiting = writing();
    if (!waiting) dayOpen(shown);
}

/**
 * Saves a note, only while its file holds the note as the diary read it.
 * A refused note keeps what I wrote and its hint says why.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function noteSave(id: string, note: HTMLTextAreaElement, hint: HTMLElement): Promise<void> {
    const written: string = note.value.trim();
    const response: Response = await fetch("/api/day/noted", {
        method: "POST",
        body: JSON.stringify({ id: id, before: note.dataset.before ?? "", note: written }),
    });
    if (response.ok) note.dataset.before = written;
    hint.textContent = response.status === 409 ? "Not saved: its note changed on the disk" : "Saving failed";
    hint.hidden = response.ok;
    if (waiting) dayAgain();
}

/**
 * The note of an entry, a field growing with its text, saved once I leave it changed, its hint below.
 * A click anywhere beside it goes into it.
 */
function noteOf(entry: DayEntry): HTMLElement {
    const note: HTMLTextAreaElement = document.createElement("textarea");
    const hint: HTMLElement = entryPartOf("p", "panel-error", []);
    note.className = "diary-note";
    note.rows = 1;
    note.placeholder = "Note";
    note.value = entry.note;
    note.dataset.before = entry.note;
    note.setAttribute("aria-label", `Note of ${entry.title}`);
    hint.hidden = true;
    note.addEventListener("change", (): void => {
        noteSave(entry.id, note, hint).catch((error: unknown): void => {
            console.error(error);
            hint.textContent = "Saving failed";
            hint.hidden = false;
        });
    });
    note.addEventListener("blur", (): void => {
        window.setTimeout((): void => {
            if (waiting) dayAgain();
        });
    });
    const side: HTMLElement = entryPartOf("div", "diary-side", [note, hint]);
    side.addEventListener("click", (event: MouseEvent): void => {
        if (event.target === side) note.focus();
    });
    return side;
}

/**
 * An entry as the lines of a box of the plan with its note beside it.
 * A line too long ends in `…`, its whole text in its tooltip.
 * A click on the lines opens its dialog, a click on its place the link of the place.
 */
function entryOf(entry: DayEntry): HTMLElement {
    const shownWhat: string = shownWhatOf(entry.category, entry.title, entry.module, entry.type);
    const time: string = `${timeOf(new Date(entry.start))}${rangeDash}${timeOf(new Date(entry.end))}`;
    const place: (string | Node)[] = whereLinkedOf(
        entry.category,
        entry.from,
        roomOf(entry.location),
        entry.locationLink,
        entry.online,
        entry.onlineLink,
    );
    const what: HTMLElement = entryPartOf(
        "div",
        "box-what",
        whatOf(entry.category, shownWhat === entry.category ? "" : shownWhat),
    );
    const meta: HTMLElement = entryPartOf("div", "box-meta", [
        entryPartOf("span", "box-part box-time", [time]),
        ...(place.length === 0 ? [] : [entryPartOf("span", "box-part entry-parted", place)]),
    ]);
    const box: HTMLElement = entryPartOf("div", "diary-box", [what, meta]);
    what.title = what.textContent ?? "";
    meta.title = [time, whereOf(entry.category, entry.from, entry.location, entry.online).replace("->", "→")]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
    if (!entry.editable)
        return entryPartOf("article", "diary-entry", [
            box,
            ...(entry.note.trim() === "" ? [] : [entryPartOf("p", "diary-text", [entry.note])]),
        ]);
    box.addEventListener("click", (event: MouseEvent): void => {
        if ((event.target as HTMLElement).closest("a") !== null) return;
        logEntryOpen(entry.id, entry.start).catch((error: unknown): void => console.error(error));
    });
    return entryPartOf("article", "diary-entry", [box, noteOf(entry)]);
}

/**
 * Shows a day with its entries, unless another day was asked for meanwhile.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function dayShow(day: string): Promise<void> {
    shown = day;
    waiting = false;
    (document.getElementById("diary-date") as HTMLElement).textContent = dayTextOf(day, true);
    (document.getElementById("diary-today") as HTMLButtonElement).disabled = day === calendarTodayOf();

    const start: string = new Date(`${day}T00:00`).toISOString();
    const end: string = new Date(`${dayAdd(day, 1)}T00:00`).toISOString();
    const entries: DayEntry[] = (await readerAsk<DayEntry[]>(`/api/day/log?start=${start}&end=${end}`))
        .filter((entry: DayEntry): boolean => !entry.glass && dayOf(new Date(entry.start)) === day)
        .sort((first: DayEntry, second: DayEntry): number => Date.parse(first.start) - Date.parse(second.start));
    if (day !== shown) return;
    document
        .getElementById("diary-entries")
        ?.replaceChildren(
            ...(entries.length > 0
                ? entries.map(entryOf)
                : [entryPartOf("p", "food-none", ["Nothing logged on this day"])]),
        );
}

/** Shows a day or a hint when the reader cannot read its entries. */
function dayOpen(day: string): void {
    dayShow(day).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("diary-entries")
            ?.replaceChildren(entryPartOf("p", "food-none", ["The log cannot be read"]));
    });
}

/** Starts the diary after the router has put its HTML into the page. */
export function diaryStart(): void {
    const before: HTMLElement = document.getElementById("diary-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("diary-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("diary-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayOpen(dayAdd(shown, -1)));
    after.addEventListener("click", (): void => dayOpen(dayAdd(shown, 1)));
    today.addEventListener("click", (): void => dayOpen(calendarTodayOf()));
    dayOpen(askedDayOf() ?? calendarTodayOf());
    todayFollow((): string => shown, dayOpen);
    changesFollow(dayAgain);
}
