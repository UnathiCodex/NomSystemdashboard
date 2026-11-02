/**
 * ## Evening
 *
 * My gratitude and my points about the day, two lists at the top of the daily note.
 * Its notebook beside `Log +` opens the note over the page, as the search beside it opens the search.
 * My gratitude I write into the daily note.
 * It saves a moment after I stop typing, by `Ctrl+S`, as I leave the list, as I leave the day.
 * My points about the day are the notes of the log entries of the day, by their start, nothing kept of them here.
 * A click on the name of an entry opens it, so I change its note there.
 * Closing that entry brings the note back.
 */

import { noteShow, sectionsLoad, sectionSend } from "./note.ts";
import { pointsRead, pointsShow, pointsStart } from "./points.ts";
import { entryOpenEdit } from "./categories.ts";
import { entryPartOf, whatOf } from "./boxes.ts";
import { rangeDash, timeOf } from "./times.ts";
import type { EventApi } from "fullcalendar";
import type { SectionTitle } from "../../reader/note.ts";

/** The section of the daily note I write. */
const title: SectionTitle = "Gratitude";

/** Milliseconds the typing has to pause before the list is saved. */
const pause: number = 1000;

/** Day whose text the list holds, empty before the first day is shown. */
let shown: string = "";

/** Text of the list as last shown or saved. */
let saved: string = "";

/** Timer of the save waiting for the pause, 0 for none. */
let waiting: number = 0;

/** Whether the note comes back once the dialog of an entry opened from it closes. */
let returning: boolean = false;

function noteOf(): HTMLDialogElement {
    return document.getElementById("note") as HTMLDialogElement;
}

function listOf(): HTMLElement {
    return document.getElementById("gratitude") as HTMLElement;
}

function errorShow(error: unknown): void {
    console.error(error);
    document.getElementById("note-error")?.removeAttribute("hidden");
}

/**
 * Saves the list when it changed, then shows the note again, which the first save of a day may create.
 *
 * @throws {Error} - When the reader does not take the text
 */
async function gratitudeSave(): Promise<void> {
    clearTimeout(waiting);
    const day: string = shown;
    const text: string = pointsRead(listOf());
    if (day === "" || text === saved) return;
    await sectionSend(day, title, text);
    saved = text;
    document.getElementById("note-error")?.setAttribute("hidden", "");
    if (day === shown) await noteShow(day);
}

/**
 * Shows the list of a day after saving the day shown before.
 * Its text counts as saved as the points show it, so a list only shown never saves.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function eveningShow(day: string): Promise<void> {
    await gratitudeSave().catch(errorShow);
    shown = day;
    const sections: { [title in SectionTitle]: string } = await sectionsLoad(day);
    if (day !== shown) return;
    pointsShow(listOf(), sections[title]);
    saved = pointsRead(listOf());
    document.getElementById("note-error")?.setAttribute("hidden", "");
}

/** A note of a log entry under its time and what, the name a button that opens the entry in place of the note. */
function aboutOf(entry: EventApi, note: string): HTMLElement {
    const point: HTMLElement = document.createElement("li");
    const start: Date = entry.start as Date;
    const name: HTMLButtonElement = document.createElement("button");
    name.type = "button";
    name.className = "about-name";
    name.title = "Open the entry";
    name.append(...whatOf(entry.extendedProps.category ?? "", entry.title));
    name.addEventListener("click", (): void => {
        noteOf().close();
        returning = true;
        entryOpenEdit(entry).catch((error: unknown): void => console.error(error));
    });
    point.append(
        entryPartOf("div", "about-head", [
            name,
            entryPartOf("span", "entry-time", [`${timeOf(start)}${rangeDash}${timeOf(entry.end ?? start)}`]),
        ]),
        entryPartOf("div", "about-note", [note]),
    );
    return point;
}

/** Shows the notes of the log entries shown, by their start, empty while none has a note. */
export function aboutShow(entries: EventApi[]): void {
    const list: HTMLElement = document.createElement("ul");
    list.append(
        ...entries
            .filter((entry: EventApi): boolean => entry.source?.id === "log")
            .filter((entry: EventApi): boolean => (entry.extendedProps.note ?? "").trim() !== "")
            .sort((first: EventApi, second: EventApi): number => first.startStr.localeCompare(second.startStr))
            .map((entry: EventApi): HTMLElement => aboutOf(entry, entry.extendedProps.note.trim())),
    );
    (document.getElementById("about") as HTMLElement).replaceChildren(...(list.childElementCount === 0 ? [] : [list]));
}

/**
 * Starts the lists and the notebook that opens them.
 * My gratitude is saved too when the page goes out of sight, so nothing typed gets lost.
 */
export function eveningStart(): void {
    document.getElementById("log-note")?.addEventListener("click", (): void => noteOf().showModal());
    document.getElementById("entry")?.addEventListener("close", (): void => {
        if (!returning) return;
        returning = false;
        noteOf().showModal();
    });
    document.addEventListener("visibilitychange", (): void => {
        if (document.visibilityState === "hidden") gratitudeSave().catch(errorShow);
    });
    listOf().addEventListener("keydown", (event: KeyboardEvent): void => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
        event.preventDefault();
        gratitudeSave().catch(errorShow);
    });
    pointsStart(
        listOf(),
        (): void => {
            clearTimeout(waiting);
            waiting = window.setTimeout((): void => {
                gratitudeSave().catch(errorShow);
            }, pause);
        },
        (): void => {
            gratitudeSave().catch(errorShow);
        },
    );
}
