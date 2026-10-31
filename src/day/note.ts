/**
 * ## Daily note
 *
 * Shows the daily note of a day, read only,
 * below my gratitude and my points about the day,
 * which the lists above it show,
 * so the note leaves their two sections out, `## Gratitude` and `## About`:
 * what is left shows as Markdown, nothing for a note that holds only them,
 * as the dashboard writes it.
 * Loads and writes those two sections;
 * the reader writes them into the note of the day, see `reader/note.ts`.
 *
 * - `marked`: Turns Markdown into HTML.
 * - `dompurify`: Takes scripts and the like out of that HTML, as the scripts view does,
 *   see `../notes/markdown.ts`.
 * - `../reader.ts`: Asks the reader.
 */

import { Marked } from "marked";
import DOMPurify from "dompurify";
import { readerAsk } from "../reader.ts";

/**
 * Titles of the sections the page reads and writes, as the reader names them:
 * my gratitude and my points about the day.
 */
export type SectionTitle = "Gratitude" | "About";

/**
 * Markdown reader of the daily note.
 */
const markdown: Marked = new Marked();

/**
 * Takes my gratitude and my points about the day out of a note,
 * its sections `## Gratitude` and `## About`,
 * each its heading and every line below it up to the next heading,
 * since the lists above the note show them.
 *
 * @param note - Text of the note file
 * @returns Markdown of the rest of the note, which `marked` reads
 */
function markdownOf(note: string): string {
    return note.replace(
        /^## (?:Gratitude|About)[ \t]*(?=\n|$)(?:\n(?!#{1,6} ).*)*\n?/gm,
        "",
    );
}

/**
 * Shows the daily note of a date, nothing when the day has none.
 * - {@link Marked#parse}: Turns Markdown into HTML, with `async: false` directly as text.
 * - {@link DOMPurify.sanitize}: Takes out scripts, event handlers and the like,
 *   like those of HTML pasted into a note.
 *
 * @param date - Date like `2026-07-03`
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
 * Loads my gratitude and my points about the day
 * of the daily note of a date from the reader.
 *
 * @param date - Date like `2026-07-03`
 * @returns Text of each section by its title, the Markdown of its points,
 *   see `reader/note.ts`; empty for none
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
 * Sends the text of a section to the reader,
 * which writes it into the daily note of its date;
 * `keepalive` lets it arrive also when the page closes meanwhile.
 *
 * @param date - Date like `2026-07-03`
 * @param title - Title of the section
 * @param text - Text of the section, the Markdown of its points
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
