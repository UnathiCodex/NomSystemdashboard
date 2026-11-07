/**
 * ## Diary
 *
 * My diary, the log entries of a day at the left, our doc of the day at the right.
 * The entries with a note come first, then those without, each by their start.
 * Each entry shows the lines of a box of the plan.
 * They say what it was and below it grey its time and place.
 * Its note stands below them, only where it has one.
 * Only an entry with a note is a box, so the notes stand out among the entries without one.
 * An entry past midnight shows on the day it starts, so each note stands once.
 * A glass of water does not show, as in the log.
 * A click on an entry opens its dialog, where I write its note.
 * Our doc of the day from `NomFrequenceintelligence` I write as in the editor, see `reader/intelligence.ts`.
 * Another day shows only once the doc is saved.
 * It loads anew the moment a file of my new system changes, but never over the doc while I write in it.
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
import { fileSaved, fileWriting, systemFileShow } from "../editor/editor.ts";
import { iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide";
import "../day/day.css";
import "../day/log.css";
import "../day/boxes.css";
import "../food/food.css";
import "./diary.css";

import type { DayEntry } from "../../reader/day.ts";
import type { SystemFile } from "../../reader/files.ts";

let shown: string = "";

/** Whether a change came while I wrote in the doc, so the day loads anew once I leave it. */
let waiting: boolean = false;

/** Loads the shown day anew after a change, once I no longer write in the doc. */
function dayAgain(): void {
    waiting = fileWriting();
    if (!waiting) dayOpen(shown);
}

/**
 * An entry as the lines of a box of the plan, its note below them.
 * A line too long ends in `…`, its whole text in its tooltip.
 * A click on it opens its dialog, a click on its place the link of the place.
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
    const article: HTMLElement = entryPartOf("article", "diary-entry", [
        what,
        meta,
        ...(entry.note.trim() === "" ? [] : [entryPartOf("p", "diary-note", [entry.note])]),
    ]);
    what.title = what.textContent ?? "";
    meta.title = [time, whereOf(entry.category, entry.from, entry.location, entry.online).replace("->", "→")]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
    if (!entry.editable) return article;
    article.classList.add("diary-opens");
    article.addEventListener("click", (event: MouseEvent): void => {
        if ((event.target as HTMLElement).closest("a") !== null) return;
        logEntryOpen(entry.id, entry.start).catch((error: unknown): void => console.error(error));
    });
    return article;
}

/**
 * Shows a day with its entries and its doc, unless another day was asked for meanwhile.
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
    const [logged, doc]: [DayEntry[], SystemFile] = await Promise.all([
        readerAsk<DayEntry[]>(`/api/day/log?start=${start}&end=${end}`),
        readerAsk<SystemFile>(`/api/day/doc?date=${day}`),
    ]);
    if (day !== shown) return;
    const entries: DayEntry[] = logged
        .filter((entry: DayEntry): boolean => !entry.glass && dayOf(new Date(entry.start)) === day)
        .sort(
            (first: DayEntry, second: DayEntry): number =>
                Number(first.note.trim() === "") - Number(second.note.trim() === "") ||
                Date.parse(first.start) - Date.parse(second.start),
        );
    document
        .getElementById("diary-entries")
        ?.replaceChildren(
            ...(entries.length > 0
                ? entries.map(entryOf)
                : [entryPartOf("p", "food-none", ["Nothing logged on this day"])]),
        );
    systemFileShow(doc, "/api/day/doc");
}

/** Shows a day or a hint when the reader cannot read it. */
function dayOpen(day: string): void {
    dayShow(day).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("diary-entries")
            ?.replaceChildren(entryPartOf("p", "food-none", ["The log cannot be read"]));
    });
}

/** Shows another day once the doc is saved, else stays on the day, the failure in the status line of the doc. */
function dayGo(day: string): void {
    fileSaved()
        .then((saved: boolean): void => {
            if (saved) dayOpen(day);
        })
        .catch((error: unknown): void => console.error(error));
}

/** Starts the diary after the router has put its HTML into the page. */
export function diaryStart(): void {
    const before: HTMLElement = document.getElementById("diary-before") as HTMLElement;
    const after: HTMLElement = document.getElementById("diary-after") as HTMLElement;
    const today: HTMLElement = document.getElementById("diary-today") as HTMLElement;
    iconPut(before, ChevronLeft, "Day before");
    iconPut(after, ChevronRight, "Day after");
    iconPut(today, CalendarCheck, "Back to today");
    before.addEventListener("click", (): void => dayGo(dayAdd(shown, -1)));
    after.addEventListener("click", (): void => dayGo(dayAdd(shown, 1)));
    today.addEventListener("click", (): void => dayGo(calendarTodayOf()));
    document.getElementById("editor-text")?.addEventListener("focusout", (): void => {
        window.setTimeout((): void => {
            if (waiting) dayAgain();
        });
    });
    dayOpen(askedDayOf() ?? calendarTodayOf());
    todayFollow((): string => shown, dayGo);
    changesFollow(dayAgain);
}
