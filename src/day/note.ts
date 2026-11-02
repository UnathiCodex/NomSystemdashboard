/**
 * ## Daily note
 *
 * The daily note of a day, read only, without `## Gratitude`, which its list above shows.
 * Loads and writes that section.
 */

import { Marked } from "marked";
import DOMPurify from "dompurify";
import { readerAsk } from "../reader.ts";
import type { SectionTitle } from "../../reader/note.ts";

const markdown: Marked = new Marked();

/** Takes `## Gratitude` out of a note, up to the next heading. */
function markdownOf(note: string): string {
    return note.replace(/^## Gratitude[ \t]*(?=\n|$)(?:\n(?!#{1,6} ).*)*\n?/gm, "");
}

/**
 * Shows the daily note of a date, without scripts and event handlers, like of HTML pasted into it.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function noteShow(date: string): Promise<void> {
    const response: Response = await fetch(`/api/day/note?date=${date}`);
    const note: string | null = await response.json();

    const element: HTMLElement = document.getElementById("day-note-text") as HTMLElement;
    element.innerHTML = note === null ? "" : DOMPurify.sanitize(markdown.parse(markdownOf(note), { async: false }));
}

/**
 * Loads the Markdown of my sections of a date, empty for none.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function sectionsLoad(date: string): Promise<{ [title in SectionTitle]: string }> {
    return readerAsk<{ [title in SectionTitle]: string }>(`/api/day/sections?date=${date}`);
}

/**
 * Sends the text of a section, `keepalive` lets it arrive also when the page closes meanwhile.
 *
 * @throws {Error} - When the reader does not take the text
 */
export async function sectionSend(date: string, title: SectionTitle, text: string): Promise<void> {
    const response: Response = await fetch("/api/day/sections", {
        method: "POST",
        body: JSON.stringify({ date: date, title: title, text: text }),
        keepalive: true,
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}
