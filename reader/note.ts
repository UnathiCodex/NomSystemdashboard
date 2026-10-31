/**
 * ## Daily notes
 *
 * Reads the daily notes of the new system, one per day in `NomFrequencediary`,
 * like `2026/2026_10/2026_10_12.md`,
 * and writes into them what I write in the dashboard, all a note holds,
 * each a plain Markdown section of points,
 * one `- ` line each, as the dashboard names them:
 * my gratitude under `## Gratitude`,
 * and my points about the day overall under `## About`:
 *
 * ```
 * ## Gratitude
 *
 * - Viele Socials getroffen
 *
 *
 * ## About
 *
 * - Univeranstaltungen so richtig begonnen
 * ```
 *
 * A section holds every line below its heading up to the next heading;
 * a further line of a point stands under its text, two spaces in, then the spacer `⠀`,
 * as the editor writes it with Shift+Enter, see `src/editor/keys.ts`.
 * The page edits a section as this Markdown,
 * in the editor of my files, see `src/day/points.ts`,
 * and the reader keeps its lines points, see {@link pointLinesOf}.
 * Every day has its note, made at its start with both headings empty,
 * see {@link notesStart},
 * whether I write into it or not;
 * a section keeps its heading when I empty it,
 * and every other line of a note stays as it is.
 * Its empty lines are those of my Markdown, see `markdownFormOf` in `markdown.ts`,
 * so two headings without points have two empty lines between them,
 * the one below the first and the one before the second together.
 *
 * - `node:fs`: Works with files and folders on the disk.
 * - `node:path`: Builds file paths for the operating system.
 * - `./sources.ts`: Names the folder of the daily notes and tells
 *   which files the reader may write.
 * - `./calendar.ts`: Gives today in Berlin time and the moment its next day starts.
 * - `./markdown.ts`: Gives a note the empty lines of my Markdown.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { diaryRoot, writeAllowed } from "./sources.ts";
import { berlinDateOf, berlinInstantOf, dayAdd } from "./calendar.ts";
import { markdownFormOf } from "./markdown.ts";

/**
 * Titles of the sections of a daily note, the only ones the reader writes:
 * my gratitude and my points about the day.
 */
export type SectionTitle = "Gratitude" | "About";

/**
 * A section text, as my gratitude and my points about the day send it.
 *
 * - `date`: Date of the daily note, like `2026-07-03`.
 * - `title`: Title of the section.
 * - `text`: Text of the section, its Markdown, as {@link sectionsRead} gives it.
 */
export type SectionNew = {
    date: string;
    title: SectionTitle;
    text: string;
};

/**
 * The sections of a daily note, in their order:
 * my gratitude, then my points about the day.
 */
const titles: SectionTitle[] = ["Gratitude", "About"];

/**
 * Start of a point line in a section.
 */
const pointStart: string = "- ";

/**
 * A point, of any level, by its `-` or number, like `- Schön` or `\t1. Erstens`.
 */
const pointForm: RegExp = /^[ \t]*(?:[-*+]|\d+[.)]) /;

/**
 * A further line of a point as the editor writes it with Shift+Enter: indented,
 * then the spacer `⠀` (U+2800), see `spacer` in `src/editor/keys.ts`,
 * so Markdown keeps the line in its point.
 */
const furtherForm: RegExp = /^[ \t]+⠀/;

/**
 * A line without text: empty, or only indentation,
 * spacers and the `-` or number of an empty point.
 */
const emptyForm: RegExp = /^[ \t⠀]*(?:(?:[-*+]|\d+[.)])[ \t⠀]*)?$/;

/**
 * A heading of a Markdown section, of any level, like `## Gratitude`,
 * which ends the section before it.
 */
const headingForm: RegExp = /^#{1,6} /;

/**
 * A daily note as each day starts: both headings, empty,
 * with the empty lines of my Markdown,
 * `## Gratitude`, two empty lines, `## About`.
 */
const emptyNote: string = markdownFormOf(
    titles.map((title: SectionTitle): string => `## ${title}`).join("\n"),
);

/**
 * Builds the path of the daily note of a date in the new system.
 *
 * @param date - Date like `2026-10-12`
 * @returns Path `<JJJJ>/<JJJJ_MM>/<JJJJ_MM_TT>.md` in `NomFrequencediary`,
 *   like `2026/2026_10/2026_10_12.md`
 * @throws {Error} - When the date is not written like `2026-10-12`
 */
function noteFileOf(date: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const [year, month, dayOfMonth]: string[] = date.split("-");
    return join(diaryRoot, year, `${year}_${month}`, `${year}_${month}_${dayOfMonth}.md`);
}

/**
 * Finds a section in the lines of a note:
 * its heading `## Title` and every line below it up to the next heading.
 * - `heading`: Index of its heading.
 * - `end`: Index of the next heading, or the end of the note.
 *
 * @param lines - Lines of a note
 * @param title - Title of the section
 * @returns Index of its heading and of the first line after the section,
 *   `null` when the note has no such section
 */
function sectionFind(lines: string[], title: SectionTitle): [number, number] | null {
    const heading: number = lines.findIndex(
        (line: string): boolean => line.trim() === `## ${title}`,
    );
    if (heading === -1) return null;

    let end: number = heading + 1;
    while (end < lines.length && !headingForm.test(lines[end])) end++;
    return [heading, end];
}

/**
 * Reads the daily note of a date.
 * - `file`: The note of the date in the new system.
 *
 * @param date - Date like `2026-07-03`
 * @returns Markdown text of the note, or `null` when the day has no note
 * @throws {Error} - When the date is not written like `2026-07-03`
 */
export function noteRead(date: string): string | null {
    const file: string = noteFileOf(date);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/**
 * Reads a section of the daily note of a date as text to edit:
 * its Markdown, its lines kept points,
 * see {@link pointLinesOf}.
 * - `lines`: Lines of the note.
 * - `found`: The section in the note, `null` for none.
 *
 * @param date - Date like `2026-07-03`
 * @param title - Title of the section
 * @returns Text of the section,
 *   empty for a day without note or a note without the section
 * @throws {Error} - When the date is not written like `2026-07-03`
 */
function sectionTextRead(date: string, title: SectionTitle): string {
    const lines: string[] = (noteRead(date) ?? "").split("\n");
    const found: [number, number] | null = sectionFind(lines, title);
    if (found === null) return "";
    return pointLinesOf(lines.slice(found[0] + 1, found[1]).join("\n")).join("\n");
}

/**
 * Reads my gratitude and my points about the day
 * of the daily note of a date as texts to edit,
 * see {@link sectionTextRead}.
 *
 * @param date - Date like `2026-07-03`
 * @returns Text of each section
 * @throws {Error} - When the date is not written like `2026-07-03`
 */
export function sectionsRead(date: string): { [title in SectionTitle]: string } {
    return {
        Gratitude: sectionTextRead(date, "Gratitude"),
        About: sectionTextRead(date, "About"),
    };
}

/**
 * Keeps the lines of my gratitude or my points about the day points,
 * as the editor writes them:
 * a point and a further line as written, an indented line without the spacer,
 * as further lines were written before it, given the spacer,
 * see {@link furtherForm}, any other line a point of its own,
 * like one whose `- ` I took away, without a spacer at its start;
 * lines without text left out, like the empty point of a section without points.
 *
 * @param text - Text of the section, its Markdown,
 *   as the page sends it or the note holds it
 * @returns Lines like `- Schön, dass alle da waren`, none for a text without text
 */
function pointLinesOf(text: string): string[] {
    return text
        .split("\n")
        .map((line: string): string => line.trimEnd())
        .filter((line: string): boolean => !emptyForm.test(line))
        .map((line: string): string =>
            pointForm.test(line) || furtherForm.test(line)
                ? line
                : /^[ \t]/.test(line)
                  ? line.replace(/^[ \t]+/, "$&⠀")
                  : `${pointStart}${line.replace(/^⠀+/, "")}`,
        );
}

/**
 * Puts the new points of a section into the lines of a note,
 * each section its heading and below it its points, without empty lines,
 * which the note gets as it is written, see {@link sectionWrite}:
 * in place of its old lines, without points only its heading;
 * while the note has no such section, the section added,
 * my gratitude before my points about the day when the note has them already,
 * else at the end of the note.
 * - `found`: The section in the note, see {@link sectionFind},
 *   `null` when the note has none.
 * - `block`: The section as written: its heading and its points.
 * - `next`: My points about the day,
 *   which my gratitude goes before, `null` for none and when they are added.
 *
 * @param lines - Lines of the note, changed in place
 * @param title - Title of the section
 * @param points - Its new point lines, none to empty it
 */
function sectionPut(lines: string[], title: SectionTitle, points: string[]): void {
    const found: [number, number] | null = sectionFind(lines, title);
    const block: string[] = [`## ${title}`, ...points];
    if (found !== null) {
        lines.splice(found[0], found[1] - found[0], ...block);
        return;
    }

    const next: [number, number] | null =
        title === "Gratitude" ? sectionFind(lines, "About") : null;
    lines.splice(next?.[0] ?? lines.length, 0, ...block);
}

/**
 * Writes the text of a section into the daily note of its date,
 * see {@link sectionPut}, both as points, see {@link pointLinesOf};
 * an empty text leaves only its heading.
 * A day without note, like one before {@link notesStart}, gets one, with both headings.
 * The note is written with the empty lines of my Markdown,
 * see `markdownFormOf` in `markdown.ts`, every other line as it is.
 * - `file`: The note of the date in the new system.
 * - `lines`: Lines of the note, those of {@link emptyNote} for a day without note.
 * - `points`: New point lines of the section, none for an empty text.
 * - `text`: The note as written.
 *
 * @param section - Section text as my gratitude or my points about the day send it
 * @throws {Error} - When the date is not written like `2026-07-03`,
 *   the title is none of {@link titles}, or the note would lie outside the new system
 */
export function sectionWrite(section: SectionNew): void {
    const { date, title, text }: SectionNew = section;
    if (!titles.includes(title)) throw new Error(`No section ${title}`);
    const file: string = noteFileOf(date);
    if (!writeAllowed(file))
        throw new Error(`No writing outside the new system: ${file}`);

    const lines: string[] = (noteRead(date) ?? emptyNote).split("\n");
    sectionPut(lines, title, pointLinesOf(text));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, markdownFormOf(lines.join("\n")));
}

/**
 * Makes the daily note of today,
 * see {@link emptyNote}, now and again at the start of every day in Berlin time,
 * as long as the reader runs;
 * a note that exists stays as it is, and a failed one is printed and waits for the next.
 * - `start`: Makes today's note, then waits for the next day.
 * - `now`: The moment it runs.
 * - `today`: Today in Berlin time, like `2026-10-23`.
 * - `file`: Today's note.
 */
export function notesStart(): void {
    const start: () => void = (): void => {
        const now: Date = new Date();
        const today: string = berlinDateOf(now);
        try {
            const file: string = noteFileOf(today);
            if (!existsSync(file) && writeAllowed(file)) {
                mkdirSync(dirname(file), { recursive: true });
                writeFileSync(file, emptyNote);
            }
        } catch (error: unknown) {
            console.error(now.toISOString(), "The daily note could not be made", error);
        }
        setTimeout(start, berlinInstantOf(dayAdd(today, 1), 0).getTime() - now.getTime());
    };
    start();
}
