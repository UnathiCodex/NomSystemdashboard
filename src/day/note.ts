/**
 * ## Daily note
 *
 * Shows the daily note of a day, read only,
 * below my gratitude and my points about the day,
 * which the lists above it show, so the note leaves out `## Gratitude` and `## About`.
 * Loads and writes those two sections, which the reader writes, see `reader/note.ts`.
 *
 * - `dompurify`: Takes scripts and the like out of the HTML, as the scripts view does,
 *   see `../notes/markdown.ts`.
 */

import { Marked } from "marked";
import DOMPurify from "dompurify";
import { readerAsk } from "../reader.ts";
import type { SectionTitle } from "../../reader/note.ts";

/** Markdown reader of the daily note. */
const markdown: Marked = new Marked();

/**
 * Takes my sections `## Gratitude` and `## About` out of a note,
 * each its heading and every line below it up to the next heading.
 */
function markdownOf(note: string): string {
    return note.replace(
        /^## (?:Gratitude|About)[ \t]*(?=\n|$)(?:\n(?!#{1,6} ).*)*\n?/gm,
        "",
    );
}

/**
 * Shows the daily note of a date, nothing when the day has none.
 * - {@link DOMPurify.sanitize}: Takes out scripts and event handlers,
 *   like those of HTML pasted into a note.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function noteShow(date: string): Promise<void> {
    const response: Response = await fetch(`/api/day/note?date=${date}`);
    const note: string | null = await response.json();

    const element: HTMLElement = document.getElementById("day-note-text") as HTMLElement;
    element.innerHTML =
        note === null
            ? ""
            : DOMPurify.sanitize(markdown.parse(markdownOf(note), { async: false }));
}

/**
 * Loads my gratitude and my points about the day of the daily note of a date.
 *
 * @returns Markdown of each section by its title, empty for none
 * @throws {Error} - When the reader gives no valid answer
 */
export async function sectionsLoad(
    date: string,
): Promise<{ [title in SectionTitle]: string }> {
    return readerAsk<{ [title in SectionTitle]: string }>(
        `/api/day/sections?date=${date}`,
    );
}

/**
 * Sends the text of a section to the reader, which writes it into the daily note.
 * `keepalive` lets it arrive also when the page closes meanwhile.
 *
 * @throws {Error} - When the reader does not take the text
 */
export async function sectionSend(
    date: string,
    title: SectionTitle,
    text: string,
): Promise<void> {
    const response: Response = await fetch("/api/day/sections", {
        method: "POST",
        body: JSON.stringify({ date: date, title: title, text: text }),
        keepalive: true,
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}
