/**
 * ## Search of the log
 *
 * Finds entries in my whole log, not only the shown day,
 * like every `Talk` to add who was there with `With`:
 * a small button beside `Log +` opens the search,
 * and what I type finds every entry that holds
 * each typed word in its summary, its category, its place, its people or its day,
 * as every search of the page compares, see `../search.ts`, never in its note.
 * The results stand newest first, each what it was,
 * and below it small and grey its day, its time, its place and who I was with.
 * A click on a result shows its day and opens its dialog there.
 * Closing that dialog, saved or not, brings the search back with what I typed, read anew,
 * so I go from one result to the next.
 *
 * - `./search.html?raw`: Html of the dialog of the search as text,
 *   packed into the built code by Vite.
 */

import searchHtml from "./search.html?raw";
import { entryOpenEdit } from "./categories.ts";
import { entryPartOf, shownWhatOf, whatOf } from "./boxes.ts";
import { whereLinkedOf } from "./places.ts";
import { roomOf } from "./series.ts";
import { dateTextOf, rangeDash, timeOf } from "./times.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { iconPut, searchFieldOf } from "../icons.ts";
import { dottedOf } from "../persons.ts";
import { Search } from "lucide";

import type { Calendar, EventApi } from "fullcalendar";
import type { Attendee } from "../../reader/calendar.ts";

/**
 * An entry of the log as the reader sends it for the search.
 * - `module`, `type`: Skill and type of a skill entry, empty for any other entry.
 */
type LogEntry = {
    id: string;
    category: string;
    title: string;
    module: string;
    type: string;
    location: string;
    from: string;
    online: string;
    attendees: Attendee[];
    start: string;
    end: string;
};

/** Every entry of the log, newest first, as read when the search opened last. */
let entries: LogEntry[] = [];

/** Whether the search comes back once the dialog of an entry opened from it closes. */
let returning: boolean = false;

/**
 * Gives what an entry was as the log shows it, see `shownWhatOf` in `boxes.ts`.
 * Empty when it is its category, like an old `Sleep`.
 */
function whatTextOf(entry: LogEntry): string {
    const shown: string = shownWhatOf(
        entry.category,
        entry.title,
        entry.module,
        entry.type,
    );
    return shown === entry.category ? "" : shown;
}

/**
 * Gives the text the search compares with what I type,
 * the day of its start in it so `Talk 10.2026` finds my talks of October,
 * never its note.
 */
function searchedOf(entry: LogEntry): string {
    return [
        entry.category,
        entry.title,
        entry.module,
        entry.type,
        entry.location,
        entry.from,
        ...entry.attendees.map((person: Attendee): string => person.name),
        dateTextOf(dayOf(new Date(entry.start))),
    ].join(" ");
}

/**
 * Builds a result: what the entry was in the bold of the log, see `whatOf` in `boxes.ts`,
 * and below it, small and grey, its day, its time, its place as the log shows it,
 * see `whereLinkedOf` in `places.ts`, and who I was with, parted by middle dots.
 * Its platform online stands never as a link, since the result is a button.
 * No place or nobody leaves its part out.
 */
function resultOf(calendar: Calendar, entry: LogEntry): HTMLLIElement {
    const start: Date = new Date(entry.start);
    const end: Date = new Date(entry.end);
    const day: string = dayOf(start);
    const place: (string | Node)[] = whereLinkedOf(
        entry.category,
        entry.from,
        roomOf(entry.location),
        "",
        entry.online,
        "",
    );
    const people: (string | Node)[] = dottedOf(
        entry.attendees.map((person: Attendee): string => person.name),
    );
    const where: (string | Node)[][] = [place, people].filter(
        (part: (string | Node)[]): boolean => part.length > 0,
    );
    const meta: HTMLElement = entryPartOf("span", "search-meta", [
        entryPartOf("span", "search-when", [
            dayTextOf(day, true),
            entryPartOf("span", "entry-parted", [
                `${timeOf(start)}${rangeDash}${timeOf(end)}`,
            ]),
        ]),
    ]);
    if (where.length > 0)
        meta.append(
            entryPartOf("span", "entry-parted", [
                ...where[0],
                ...where
                    .slice(1)
                    .map((part: (string | Node)[]): HTMLElement =>
                        entryPartOf("span", "entry-parted", part),
                    ),
            ]),
        );
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.append(
        entryPartOf("span", "search-what", whatOf(entry.category, whatTextOf(entry))),
        meta,
    );
    button.addEventListener("click", (): void => {
        resultOpen(calendar, entry).catch((error: unknown): void => console.error(error));
    });
    const item: HTMLLIElement = document.createElement("li");
    item.append(button);
    return item;
}

/** Shows the entries that hold each word typed, every entry while nothing is typed. */
function resultsShow(calendar: Calendar): void {
    const words: string[] = wordsOf(
        (document.getElementById("search-text") as HTMLInputElement).value,
    );
    (document.getElementById("search-results") as HTMLElement).replaceChildren(
        ...entries
            .filter((entry: LogEntry): boolean => matchesAll(searchedOf(entry), words))
            .map((entry: LogEntry): HTMLLIElement => resultOf(calendar, entry)),
    );
}

/**
 * Opens the search with what I typed last, its results at the place I left them,
 * and reads the log anew, so an entry changed from it shows as it is now.
 * A hint in the dialog says when the reader cannot answer.
 */
async function searchOpen(calendar: Calendar): Promise<void> {
    const dialog: HTMLDialogElement = document.getElementById(
        "search",
    ) as HTMLDialogElement;
    const results: HTMLElement = document.getElementById("search-results") as HTMLElement;
    const scrolled: number = results.scrollTop;
    dialog.showModal();
    const response: Response = await fetch("/api/day/all");
    document.getElementById("search-error")?.toggleAttribute("hidden", response.ok);
    if (!response.ok) return;
    entries = (await response.json()) as LogEntry[];
    resultsShow(calendar);
    results.scrollTop = scrolled;
}

/**
 * Waits until the calendar shows an entry, as it does once the log of its day is read.
 *
 * @returns The entry, `null` when the calendar shows it not within 5 seconds
 */
function entryAwait(calendar: Calendar, id: string): Promise<EventApi | null> {
    return new Promise((found: (entry: EventApi | null) => void): void => {
        const seen: () => void = (): void => {
            const entry: EventApi | null = calendar.getEventById(id);
            if (entry === null) return;
            calendar.off("eventsSet", seen);
            found(entry);
        };
        calendar.on("eventsSet", seen);
        seen();
        window.setTimeout((): void => {
            calendar.off("eventsSet", seen);
            found(calendar.getEventById(id));
        }, 5000);
    });
}

/**
 * Shows the day of a result and opens the dialog of its entry there,
 * after closing the search, which comes back once that dialog closes.
 * An entry the calendar does not show brings the search back at once.
 */
async function resultOpen(calendar: Calendar, entry: LogEntry): Promise<void> {
    const day: string = dayOf(new Date(entry.start));
    (document.getElementById("search") as HTMLDialogElement).close();
    if (dayOf(calendar.view.currentStart) !== day) calendar.gotoDate(day);
    const event: EventApi | null = await entryAwait(calendar, entry.id);
    if (event === null) {
        await searchOpen(calendar);
        return;
    }
    returning = true;
    await entryOpenEdit(event);
}

/**
 * Starts the search after the router has put the HTML of the day into the page:
 * puts its dialog into the page, its button beside `Log +` opens it,
 * and the dialog of an entry opened from it brings it back when it closes.
 */
export function searchStart(calendar: Calendar): void {
    document.body.insertAdjacentHTML("beforeend", searchHtml);
    const button: HTMLElement = document.getElementById("log-search") as HTMLElement;
    const text: HTMLInputElement = document.getElementById(
        "search-text",
    ) as HTMLInputElement;
    document
        .querySelector(".search-form")
        ?.prepend(searchFieldOf(text, "Search the log"));
    iconPut(button, Search, "Search the log");
    button.addEventListener("click", (): void => {
        searchOpen(calendar).catch((error: unknown): void => console.error(error));
    });
    text.addEventListener("input", (): void => resultsShow(calendar));
    document.getElementById("entry")?.addEventListener("close", (): void => {
        if (!returning) return;
        returning = false;
        searchOpen(calendar).catch((error: unknown): void => console.error(error));
    });
}
