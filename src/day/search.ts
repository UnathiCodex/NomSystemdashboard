/**
 * ## Search of the log
 *
 * Finds entries in my whole log by each typed word, never in their note, newest first.
 * A click on a result shows its day and opens its dialog there.
 * Closing that dialog brings the search back with what I typed, so I go from one result to the next.
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

/** An entry of the log, `module` and `type` empty for an entry not of a skill. */
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

/** What an entry was as the log shows it, empty when it is its category, like an old `Sleep`. */
function whatTextOf(entry: LogEntry): string {
    const shown: string = shownWhatOf(entry.category, entry.title, entry.module, entry.type);
    return shown === entry.category ? "" : shown;
}

/** The text the search compares, with the day of its start, never its note. */
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
 * A result, what the entry was and below it its day, time, place and who I was with.
 * Its platform online never as a link, since the result is a button.
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
    const people: (string | Node)[] = dottedOf(entry.attendees.map((person: Attendee): string => person.name));
    const where: (string | Node)[][] = [place, people].filter((part: (string | Node)[]): boolean => part.length > 0);
    const meta: HTMLElement = entryPartOf("span", "search-meta", [
        entryPartOf("span", "search-when", [
            dayTextOf(day, true),
            entryPartOf("span", "entry-parted", [`${timeOf(start)}${rangeDash}${timeOf(end)}`]),
        ]),
    ]);
    if (where.length > 0)
        meta.append(
            entryPartOf("span", "entry-parted", [
                ...where[0],
                ...where
                    .slice(1)
                    .map((part: (string | Node)[]): HTMLElement => entryPartOf("span", "entry-parted", part)),
            ]),
        );
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.append(entryPartOf("span", "search-what", whatOf(entry.category, whatTextOf(entry))), meta);
    button.addEventListener("click", (): void => {
        resultOpen(calendar, entry).catch((error: unknown): void => console.error(error));
    });
    const item: HTMLLIElement = document.createElement("li");
    item.append(button);
    return item;
}

/** Shows the entries that hold each word typed, every entry while nothing is typed. */
function resultsShow(calendar: Calendar): void {
    const words: string[] = wordsOf((document.getElementById("search-text") as HTMLInputElement).value);
    (document.getElementById("search-results") as HTMLElement).replaceChildren(
        ...entries
            .filter((entry: LogEntry): boolean => matchesAll(searchedOf(entry), words))
            .map((entry: LogEntry): HTMLLIElement => resultOf(calendar, entry)),
    );
}

/** Opens the search where I left it and reads the log anew, so an entry changed from it shows as it is now. */
async function searchOpen(calendar: Calendar): Promise<void> {
    const dialog: HTMLDialogElement = document.getElementById("search") as HTMLDialogElement;
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

/** Waits until the calendar shows an entry, `null` when not within 5 seconds. */
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

/** Opens the dialog of a result on its day, an entry the calendar does not show brings the search back at once. */
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

/** Puts the search into the page, its button beside `Log +`. */
export function searchStart(calendar: Calendar): void {
    document.body.insertAdjacentHTML("beforeend", searchHtml);
    const button: HTMLElement = document.getElementById("log-search") as HTMLElement;
    const text: HTMLInputElement = document.getElementById("search-text") as HTMLInputElement;
    document.querySelector(".search-form")?.prepend(searchFieldOf(text, "Search the log"));
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
