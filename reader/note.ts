/**
 * ## Daily notes
 *
 * Reads the daily notes of the new system, one per day in `NomFrequencediary`,
 * and writes into them what I write in the dashboard,
 * each a plain Markdown section of points, one `- ` line each:
 * my gratitude under `## Gratitude`,
 * and my points about the day overall under `## About`.
 * A section holds every line below its heading up to the next heading.
 * A further line of a point stands under its text, two spaces in, then the spacer `⠀`,
 * as the editor writes it with Shift+Enter, see `src/editor/keys.ts`.
 * Every day has its note, made at its start with both headings empty,
 * whether I write into it or not.
 * A section keeps its heading when I empty it,
 * and every other line of a note stays as it is.
 * Its empty lines are those of my Markdown, see `markdownFormOf` in `./markdown.ts`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { diaryRoot, writeAllowed } from "./sources.ts";
import { berlinDateOf, berlinInstantOf, dayAdd } from "./calendar.ts";
import { markdownFormOf } from "./markdown.ts";

/** Titles of the sections of a daily note, the only ones the reader writes. */
export type SectionTitle = "Gratitude" | "About";

/** A section text, as my gratitude and my points about the day send it. */
export type SectionNew = {
    date: string;
    title: SectionTitle;
    text: string;
};

/** The sections of a daily note, in their order. */
const titles: SectionTitle[] = ["Gratitude", "About"];

/** Start of a point line in a section. */
const pointStart: string = "- ";

/** A point, of any level, by its `-` or number. */
const pointForm: RegExp = /^[ \t]*(?:[-*+]|\d+[.)]) /;

/**
 * A further line of a point as the editor writes it with Shift+Enter: indented,
 * then the spacer `⠀` (U+2800), so Markdown keeps the line in its point.
 */
const furtherForm: RegExp = /^[ \t]+⠀/;

/**
 * A line without text: empty, or only indentation,
 * spacers and the `-` or number of an empty point.
 */
const emptyForm: RegExp = /^[ \t⠀]*(?:(?:[-*+]|\d+[.)])[ \t⠀]*)?$/;

/** A heading of a Markdown section, of any level, which ends the section before it. */
const headingForm: RegExp = /^#{1,6} /;

/** A daily note as each day starts: both headings, empty. */
const emptyNote: string = markdownFormOf(titles.map((title: SectionTitle): string => `## ${title}`).join("\n"));

/**
 * Builds the path of the daily note of a date in the new system.
 *
 * @throws {Error} - When the date is not written like `2026-10-12`
 */
function noteFileOf(date: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const [year, month, dayOfMonth]: string[] = date.split("-");
    return join(diaryRoot, year, `${year}_${month}`, `${year}_${month}_${dayOfMonth}.md`);
}

/**
 * Finds a section in the lines of a note: index of its heading
 * and of the first line after it, `null` when the note has no such section.
 */
function sectionFind(lines: string[], title: SectionTitle): [number, number] | null {
    const heading: number = lines.findIndex((line: string): boolean => line.trim() === `## ${title}`);
    if (heading === -1) return null;

    let end: number = heading + 1;
    while (end < lines.length && !headingForm.test(lines[end])) end++;
    return [heading, end];
}

/**
 * Reads the daily note of a date, `null` when the day has no note.
 *
 * @throws {Error} - When the date is not written like `2026-07-03`
 */
export function noteRead(date: string): string | null {
    const file: string = noteFileOf(date);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/**
 * Reads a section of the daily note of a date as text to edit, its lines kept points,
 * empty for a day without note or a note without the section.
 */
function sectionTextRead(date: string, title: SectionTitle): string {
    const lines: string[] = (noteRead(date) ?? "").split("\n");
    const found: [number, number] | null = sectionFind(lines, title);
    if (found === null) return "";
    return pointLinesOf(lines.slice(found[0] + 1, found[1]).join("\n")).join("\n");
}

/** Reads my gratitude and my points about the day of the daily note of a date. */
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
 * any other line a point of its own, like one whose `- ` I took away;
 * lines without text left out, like the empty point of a section without points.
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
 * Puts the new points of a section into the lines of a note, without empty lines,
 * which the note gets as it is written, see {@link sectionWrite}:
 * in place of its old lines, without points only its heading.
 * While the note has no such section, the section is added,
 * my gratitude before my points about the day when the note has them already,
 * else at the end of the note.
 */
function sectionPut(lines: string[], title: SectionTitle, points: string[]): void {
    const found: [number, number] | null = sectionFind(lines, title);
    const block: string[] = [`## ${title}`, ...points];
    if (found !== null) {
        lines.splice(found[0], found[1] - found[0], ...block);
        return;
    }

    const next: [number, number] | null = title === "Gratitude" ? sectionFind(lines, "About") : null;
    lines.splice(next?.[0] ?? lines.length, 0, ...block);
}

/**
 * Writes the text of a section into the daily note of its date.
 * A day without note, like one before {@link notesStart}, gets one, with both headings.
 *
 * @throws {Error} - When the date is not written like `2026-07-03`,
 *   the title is none of {@link titles}, or the note would lie outside the new system
 */
export function sectionWrite(section: SectionNew): void {
    const { date, title, text }: SectionNew = section;
    if (!titles.includes(title)) throw new Error(`No section ${title}`);
    const file: string = noteFileOf(date);
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${file}`);

    const lines: string[] = (noteRead(date) ?? emptyNote).split("\n");
    sectionPut(lines, title, pointLinesOf(text));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, markdownFormOf(lines.join("\n")));
}

/**
 * Makes the daily note of today now and again at the start of every day in Berlin time,
 * as long as the reader runs.
 * A note that exists stays as it is, and a failed one is printed and waits for the next.
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
