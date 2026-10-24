/**
 * ## Search of the log
 *
 * Finds entries in my whole log, not only the shown day, like every `Talk` to add who was there with `With`:
 * a small button beside `Log +` opens the search, and what I type finds every entry that holds each typed word
 * in its summary, its category, its place, its people or its day,
 * as every search of the page compares, see `../search.ts`, like `Talk Sophale` or `Talk 10.2026`, never in its note. The results stand newest first,
 * each what it was, like `Talk: Artificial Intelligence`, and below it small and grey its day, its time, its place
 * and who I was with, like `16.10.2026 (Fri) · 13:45 – 14:15 · Mensa Leopoldstraße · Kicktipp`. A click on a result
 * shows its day and opens its dialog there; closing that dialog, saved or not, brings the search back with what I
 * typed, read anew, so I go from one result to the next. The search brings its dialog itself, `search.html`.
 *
 * - `./search.html?raw`: Html of the dialog of the search as text, packed into the built code by Vite.
 * - `./categories.ts`: Opens the dialog of an entry.
 * - `./boxes.ts`: Writes what an entry was as the log shows it, and builds the parts of a result.
 * - `./places.ts`: Gives the place of an entry by its label, a route with its arrow drawn.
 * - `./series.ts`: Writes a room by its code, without what stands in brackets.
 * - `./times.ts`: Writes the times and the date of an entry.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader, and a day with its weekday.
 * - `../search.ts`: Compares a typed text with an entry, alike everywhere.
 * - `../icons.ts`: Puts the icon of the search into its button, and makes its search field.
 * - `../persons.ts`: Puts who I was with apart by a middle dot.
 * - `lucide`: The icon of the search.
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
import { peopleOf } from "../persons.ts";
import { Search } from "lucide";

import type { Calendar, EventApi } from "fullcalendar";
import type { Attendee } from "./entries.ts";


/**
 * An entry of the log as the reader sends it for the search, the fields the search reads of it.
 *
 * - `id`: Its identifier, which the calendar of its day knows it by.
 * - `category`: Its category, like `Talk`.
 * - `title`: What it was, its `SUMMARY`, like `Artificial Intelligence`.
 * - `module`, `type`: Skill and type of a skill entry, like `IN2028` and `VO`, empty for any other entry.
 * - `location`: Its place, its `LOCATION`, like `Mensa Leopoldstraße, Leopoldstraße 13a, 80802 München, Deutschland`.
 * - `from`: Where a way starts, its `X-FROM`, empty for none.
 * - `online`: Its platform online, its `X-ONLINE`, like `Zoom`, empty for none.
 * - `attendees`: Who I was with, none for nobody.
 * - `start`, `end`: Its start and end as ISO instants.
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

/**
 * Every entry of the log, newest first, as read when the search opened last.
 */
let entries: LogEntry[] = [];

/**
 * Whether the search comes back once the dialog of an entry opened from it closes, see {@link resultOpen}.
 */
let returning: boolean = false;


/**
 * Gives what an entry was as the log shows it, like `Artificial Intelligence`, a skill entry by its skill and type,
 * see `shownWhatOf` in `boxes.ts`; empty when it is its category, like an old `Sleep`.
 * - `shown`: What it was, or its category.
 *
 * @param entry - The entry
 * @returns What it was
 */
function whatTextOf(entry: LogEntry): string {
    const shown: string = shownWhatOf(entry.category, entry.title, entry.module, entry.type);
    return shown === entry.category ? "" : shown;
}

/**
 * Gives the text the search compares with what I type: the summary of an entry, its category, its place,
 * its people and the day of its start, like `Talk Artificial Intelligence Mensa Leopoldstraße … Kicktipp 16.10.2026`,
 * so `Talk 10.2026` finds my talks of October and `Talk 16.10` those of one day; never its note.
 *
 * @param entry - The entry
 * @returns Its text
 */
function searchedOf(entry: LogEntry): string {
    return [entry.category, entry.title, entry.module, entry.type, entry.location, entry.from,
        ...entry.attendees.map((person: Attendee): string => person.name),
        dateTextOf(dayOf(new Date(entry.start)))].join(" ");
}

/**
 * Builds a result: what the entry was in the bold of the log, like `Talk: Artificial Intelligence`, see `whatOf`
 * in `boxes.ts`, and below it, small and grey, its day with its weekday short after it, its time, its place by its label
 * as the plan and the log show it, a room by its code, a route with its arrow drawn, see `whereLinkedOf` in `places.ts`,
 * or its platform online instead, never as a link, since the result is a button, and who I was with, parted by middle dots,
 * like `16.10.2026 (Fri) · 13:45 – 14:15 · Mensa Leopoldstraße · Kicktipp`; no place or nobody leaves its part out.
 * - `start`, `end`: Start and end of the entry.
 * - `day`: Day of its start, like `2026-10-16`.
 * - `place`: Its place as shown, see `whereLinkedOf` in `places.ts`, none for none.
 * - `people`: The names of who I was with, apart by a middle dot, like `Sophale, Willi · Socials`, see `peopleOf`
 *   in `../persons.ts`, none for nobody.
 * - `where`: Its place and who I was with, those it has.
 * - `meta`: The grey line below what it was, its day and time, then where.
 * - `button`: The result, which opens the entry.
 *
 * @param calendar - Calendar of the day
 * @param entry - The entry
 * @returns The result
 */
function resultOf(calendar: Calendar, entry: LogEntry): HTMLLIElement {
    const start: Date = new Date(entry.start);
    const end: Date = new Date(entry.end);
    const day: string = dayOf(start);
    const place: (string | Node)[] = whereLinkedOf(entry.category, entry.from, roomOf(entry.location), "", entry.online, "");
    const people: (string | Node)[] = peopleOf(entry.attendees.map((person: Attendee): string => person.name));
    const where: (string | Node)[][] = [place, people]
        .filter((part: (string | Node)[]): boolean => part.length > 0);
    const meta: HTMLElement = entryPartOf("span", "search-meta", [entryPartOf("span", "search-when",
        [dayTextOf(day, true),
            entryPartOf("span", "entry-parted", [`${timeOf(start)}${rangeDash}${timeOf(end)}`])])]);
    if (where.length > 0)
        meta.append(entryPartOf("span", "entry-parted", [...where[0],
            ...where.slice(1).map((part: (string | Node)[]): HTMLElement =>
                entryPartOf("span", "entry-parted", part))]));
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

/**
 * Shows the entries that hold each word typed, newest first, every entry while nothing is typed.
 * - `words`: The words typed, see `wordsOf` in `../search.ts`.
 *
 * @param calendar - Calendar of the day
 */
function resultsShow(calendar: Calendar): void {
    const words: string[] = wordsOf((document.getElementById("search-text") as HTMLInputElement).value);
    (document.getElementById("search-results") as HTMLElement).replaceChildren(...entries
        .filter((entry: LogEntry): boolean => matchesAll(searchedOf(entry), words))
        .map((entry: LogEntry): HTMLLIElement => resultOf(calendar, entry)));
}

/**
 * Opens the search with what I typed last, its results at the place I left them, and reads the log anew,
 * so an entry changed from it, like a `Talk` with its people added, shows as it is now; a hint in the dialog
 * says when the reader cannot answer.
 * - `dialog`: The dialog of the search.
 * - `results`: The list of the results, which keeps where it was scrolled to.
 * - `scrolled`: Where it was scrolled to before it was read anew.
 * - `response`: The answer of the reader.
 * - {@link HTMLDialogElement#showModal}: Shows the search over the page, `Esc` and a click beside it close it.
 *
 * @param calendar - Calendar of the day
 */
async function searchOpen(calendar: Calendar): Promise<void> {
    const dialog: HTMLDialogElement = document.getElementById("search") as HTMLDialogElement;
    const results: HTMLElement = document.getElementById("search-results") as HTMLElement;
    const scrolled: number = results.scrollTop;
    dialog.showModal();
    const response: Response = await fetch("/api/day/all");
    document.getElementById("search-error")?.toggleAttribute("hidden", response.ok);
    if (!response.ok)
        return;
    entries = await response.json() as LogEntry[];
    resultsShow(calendar);
    results.scrollTop = scrolled;
}

/**
 * Waits until the calendar shows an entry, as it does once the log of its day is read.
 * - `found`: Gives the entry once the calendar has it, `null` before.
 * - `seen`: Looks for it after every change of the entries, see `eventsSet`.
 *
 * @param calendar - Calendar of the day
 * @param id - Identifier of the entry
 * @returns The entry, `null` when the calendar shows it not within 5 seconds
 */
function entryAwait(calendar: Calendar, id: string): Promise<EventApi | null> {
    return new Promise((found: (entry: EventApi | null) => void): void => {
        const seen: () => void = (): void => {
            const entry: EventApi | null = calendar.getEventById(id);
            if (entry === null)
                return;
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
 * Shows the day of a result and opens the dialog of its entry there, after closing the search, which comes back
 * once that dialog closes, see {@link searchStart}; an entry the calendar does not show brings the search back
 * at once.
 * - `day`: The day of its start, like `2026-10-16`.
 * - `event`: The entry as the calendar shows it.
 *
 * @param calendar - Calendar of the day
 * @param entry - The entry of the result
 */
async function resultOpen(calendar: Calendar, entry: LogEntry): Promise<void> {
    const day: string = dayOf(new Date(entry.start));
    (document.getElementById("search") as HTMLDialogElement).close();
    if (dayOf(calendar.view.currentStart) !== day)
        calendar.gotoDate(day);
    const event: EventApi | null = await entryAwait(calendar, entry.id);
    if (event === null) {
        await searchOpen(calendar);
        return;
    }
    returning = true;
    await entryOpenEdit(event);
}

/**
 * Starts the search after the router has put the HTML of the day into the page: puts its dialog into the page,
 * its field into the search field of the page, its button beside `Log +` opens it, what I type shows its results
 * at once, and the dialog of an entry opened from it brings it back when it closes.
 * - `button`: The button that opens the search.
 * - `text`: The field of what I type, which goes into the search field at the top of the dialog.
 *
 * @param calendar - Calendar of the day
 */
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
        if (!returning)
            return;
        returning = false;
        searchOpen(calendar).catch((error: unknown): void => console.error(error));
    });
}
