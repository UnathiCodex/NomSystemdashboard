/**
 * ## NomFrequenceintelligence
 *
 * What happened on the shown day, read like a diary, over the page from its notebook beside `Log +`.
 * The log entries of the day by their start, each what it was, its time, place, people, below them its note.
 * A glass of water does not show, as in the log.
 * A click on an entry opens it, so I change its note there, one that cannot change opens nothing.
 * Closing that entry brings the day back.
 * Below the entries our doc of the day from `NomFrequenceintelligence`, see `reader/intelligence.ts`.
 */

import { readerAsk } from "../reader.ts";
import { htmlOf } from "../notes/markdown.ts";
import { entryOpenEdit } from "./categories.ts";
import { entryPartOf, shownWhatOf, whatOf } from "./boxes.ts";
import { whereLinkedOf } from "./places.ts";
import { roomOf } from "./series.ts";
import { rangeDash, timeOf } from "./times.ts";
import { dottedOf } from "../persons.ts";
import { iconPut } from "../icons.ts";
import { NotebookText } from "lucide";
import "./story.css";

import type { EventApi } from "fullcalendar";
import type { Attendee } from "../../reader/calendar.ts";

/** Whether the day comes back once the dialog of an entry opened from it closes. */
let returning: boolean = false;

/** The shown day, like `2026-11-02`. */
let shownDate: string = "";

function storyOf(): HTMLDialogElement {
    return document.getElementById("story") as HTMLDialogElement;
}

/**
 * An entry of the day, what it was, below it in small grey its time, place, people, then its note.
 * Its place online never as a link, since the entry is a button.
 */
function entryOf(entry: EventApi): HTMLElement {
    const props: { [field: string]: string } = entry.extendedProps;
    const category: string = props.category ?? "";
    const shownWhat: string = shownWhatOf(category, entry.title, props.module ?? "", props.type ?? "");
    const start: Date = entry.start as Date;
    const place: (string | Node)[] = whereLinkedOf(
        category,
        props.from ?? "",
        roomOf(props.location ?? ""),
        "",
        props.online ?? "",
        "",
    );
    const people: (string | Node)[] = dottedOf(
        ((entry.extendedProps.attendees ?? []) as Attendee[]).map((person: Attendee): string => person.name),
    );
    const note: string = (props.note ?? "").trim();
    const editable: boolean = entry.startEditable === true;

    const item: HTMLElement = entryPartOf(editable ? "button" : "div", "story-entry", [
        entryPartOf("span", "story-what", whatOf(category, shownWhat === category ? "" : shownWhat)),
        entryPartOf("span", "story-meta", [
            `${timeOf(start)}${rangeDash}${timeOf(entry.end ?? start)}`,
            ...[place, people]
                .filter((part: (string | Node)[]): boolean => part.length > 0)
                .map((part: (string | Node)[]): HTMLElement => entryPartOf("span", "entry-parted", part)),
        ]),
        ...(note === "" ? [] : [entryPartOf("span", "story-note", [note])]),
    ]);
    if (!editable) return item;
    (item as HTMLButtonElement).type = "button";
    item.addEventListener("click", (): void => {
        storyOf().close();
        returning = true;
        entryOpenEdit(entry).catch((error: unknown): void => console.error(error));
    });
    return item;
}

/** Keeps the shown day, whose doc {@link storyShow} loads. */
export function storyDaySet(date: string): void {
    shownDate = date;
}

/**
 * Shows our doc of the shown day, nothing for a day without one.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function docShow(): Promise<void> {
    const doc: string | null = await readerAsk<string | null>(`/api/day/doc?date=${shownDate}`);
    (document.getElementById("story-doc") as HTMLElement).innerHTML = doc === null ? "" : htmlOf(doc);
}

/**
 * Shows the log entries shown by their start, a grey line for a day without any, then our doc of the day.
 * The entries load anew after every change of my new system, so the doc follows them.
 */
export function storyShow(entries: EventApi[]): void {
    docShow().catch((error: unknown): void => console.error(error));
    const shown: EventApi[] = entries
        .filter((entry: EventApi): boolean => entry.source?.id === "log" && entry.display !== "none")
        .sort((first: EventApi, second: EventApi): number => Number(first.start) - Number(second.start));
    document
        .getElementById("story-entries")
        ?.replaceChildren(
            ...(shown.length > 0 ? shown.map(entryOf) : [entryPartOf("p", "story-none", ["Nothing logged"])]),
        );
}

/** Starts the notebook beside `Log +` that opens the day. */
export function storyStart(): void {
    const button: HTMLElement = document.getElementById("log-story") as HTMLElement;
    iconPut(button, NotebookText, "NomFrequenceintelligence");
    button.addEventListener("click", (): void => storyOf().showModal());
    document.getElementById("entry")?.addEventListener("close", (): void => {
        if (!returning) return;
        returning = false;
        storyOf().showModal();
    });
}
