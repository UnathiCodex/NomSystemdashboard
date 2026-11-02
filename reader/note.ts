/**
 * ## Daily notes
 *
 * Reads and writes the daily notes in `NomFrequencediary`, one per day,
 * my gratitude under `## Gratitude`, one `- ` line each.
 * My points about the day are the notes of my log entries, which stay in the log alone.
 * A section holds every line below its heading up to the next heading.
 * A further line of a point stands in by the tabs of its point and spaces, as Shift+Enter writes it.
 * Every day gets its note at its start with its heading empty.
 * An emptied section keeps its heading, every other line of a note stays as it is.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { diaryRoot, writeAllowed } from "./sources.ts";
import { berlinDateOf, berlinInstantOf, dayAdd } from "./calendar.ts";
import { markdownFormOf } from "./markdown.ts";

/** The only sections the reader writes. */
export type SectionTitle = "Gratitude";

export type SectionNew = {
    date: string;
    title: SectionTitle;
    text: string;
};

/** The sections of a daily note, in their order. */
const titles: SectionTitle[] = ["Gratitude"];

const pointStart: string = "- ";

/** A point, of any level, by its `-` or number. */
const pointForm: RegExp = /^[ \t]*(?:[-*+]|\d+[.)]) /;

/** A line without text, at most indentation with the mark of an empty point. */
const emptyForm: RegExp = /^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]*)?$/;

/** A heading of any level, which ends the section before it. */
const headingForm: RegExp = /^#{1,6} /;

/** A daily note as each day starts: its headings, empty. */
const emptyNote: string = markdownFormOf(titles.map((title: SectionTitle): string => `## ${title}`).join("\n"));

/** @throws {Error} - When the date is not written like `2026-10-12` */
function noteFileOf(date: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const [year, month, dayOfMonth]: string[] = date.split("-");
    return join(diaryRoot, year, `${year}_${month}`, `${year}_${month}_${dayOfMonth}.md`);
}

/** Index of the heading of a section and of the first line after it, `null` without the section. */
function sectionFind(lines: string[], title: SectionTitle): [number, number] | null {
    const heading: number = lines.findIndex((line: string): boolean => line.trim() === `## ${title}`);
    if (heading === -1) return null;

    let end: number = heading + 1;
    while (end < lines.length && !headingForm.test(lines[end])) end++;
    return [heading, end];
}

/**
 * The daily note of a date, `null` when the day has none.
 *
 * @throws {Error} - When the date is not written like `2026-07-03`
 */
export function noteRead(date: string): string | null {
    const file: string = noteFileOf(date);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/** A section as text to edit, its lines kept points, empty without note or section. */
function sectionTextRead(date: string, title: SectionTitle): string {
    const lines: string[] = (noteRead(date) ?? "").split("\n");
    const found: [number, number] | null = sectionFind(lines, title);
    if (found === null) return "";
    return pointLinesOf(lines.slice(found[0] + 1, found[1]).join("\n")).join("\n");
}

export function sectionsRead(date: string): { [title in SectionTitle]: string } {
    return { Gratitude: sectionTextRead(date, "Gratitude") };
}

/**
 * Keeps the lines of a section points, as the editor writes them.
 * A point and an indented further line stay, any other line becomes a point of its own,
 * lines without text are left out.
 */
function pointLinesOf(text: string): string[] {
    return text
        .split("\n")
        .map((line: string): string => line.trimEnd())
        .filter((line: string): boolean => !emptyForm.test(line))
        .map((line: string): string => (pointForm.test(line) || /^[ \t]/.test(line) ? line : `${pointStart}${line}`));
}

/**
 * Puts the points of a section in place of its old lines, without empty lines, which the writing adds.
 * A missing section is added at the end.
 */
function sectionPut(lines: string[], title: SectionTitle, points: string[]): void {
    const found: [number, number] | null = sectionFind(lines, title);
    const block: string[] = [`## ${title}`, ...points];
    if (found === null) lines.push(...block);
    else lines.splice(found[0], found[1] - found[0], ...block);
}

/**
 * Writes a section into the daily note of its date, a day without note gets one with its headings.
 *
 * @throws {Error} - On a wrong date or title, or a note outside the new system
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
 * Makes the daily note of today now and at the start of every day in Berlin time.
 * A note that exists stays as it is, a failed one is printed and waits for the next day.
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
