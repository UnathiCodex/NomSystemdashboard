/**
 * ## Edit
 *
 * Writes a note of my modules exactly as I saved it in the editor,
 * its change first added as a unified diff to the file of my corrections.
 * A change on the disk since the editor read it is merged in, so nothing I typed is lost.
 * Paths are from `NomSkillingmodules`.
 */

import { appendFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { createTwoFilesPatch, diffArrays, FILE_HEADERS_ONLY } from "diff";
import { Temporal } from "temporal-polyfill";
import { editor } from "./sources.ts";

/**
 * A note as I saved it in the editor.
 * - `base`: Its text when the editor read or saved it last.
 */
export type NoteChange = {
    path: string;
    base: string;
    text: string;
};

/** The text from `from` to `to` replaced by `insert`, both places in the text before. */
export type TextChange = {
    from: number;
    to: number;
    insert: string;
};

/** A file as written, `changes` what the merge changed in the text sent. */
export type Written = {
    text: string;
    changes: TextChange[];
};

/** The lines from `from` up to `to` of a text, counted from 0, replaced by `lines`. */
type Hunk = {
    from: number;
    to: number;
    lines: string[];
};

/** Gives the lines of a text, each with its line break, none for an empty text. */
function linesOf(text: string): string[] {
    return text === "" ? [] : text.split(/(?<=\n)/);
}

/** What another text changed in the lines of a text, each run of changed lines one hunk. */
function hunksOf(base: string[], other: string[]): Hunk[] {
    const hunks: Hunk[] = [];
    let at: number = 0;
    for (const part of diffArrays(base, other)) {
        if (!part.added && !part.removed) {
            at += part.count;
            continue;
        }
        const last: Hunk | undefined = hunks.at(-1);
        const hunk: Hunk = last !== undefined && last.to === at ? last : { from: at, to: at, lines: [] };
        if (hunk !== last) hunks.push(hunk);
        if (part.removed) {
            hunk.to += part.count;
            at += part.count;
        } else hunk.lines.push(...part.value);
    }
    return hunks;
}

/**
 * Merges what I typed with what changed on the disk meanwhile, both against the text the editor read.
 * A change on the disk goes in only where I left its lines and those beside them as they were.
 * Lines are compared whole, with their line breaks.
 */
export function textMerged(base: string, text: string, disk: string): string {
    const original: string[] = linesOf(base);
    const mine: Hunk[] = hunksOf(original, linesOf(text));
    const theirs: Hunk[] = hunksOf(original, linesOf(disk)).filter(
        (hunk: Hunk): boolean => !mine.some((own: Hunk): boolean => own.from <= hunk.to && hunk.from <= own.to),
    );
    const merged: string[] = [];
    let at: number = 0;
    for (const hunk of [...mine, ...theirs].sort((first: Hunk, second: Hunk): number => first.from - second.from)) {
        merged.push(...original.slice(at, hunk.from), ...hunk.lines);
        at = hunk.to;
    }
    return [...merged, ...original.slice(at)].join("");
}

/** The changes that turn one text into another, line by line, places in the first text. */
export function changesOf(before: string, after: string): TextChange[] {
    const changes: TextChange[] = [];
    let at: number = 0;
    for (const part of diffArrays(linesOf(before), linesOf(after))) {
        const text: string = part.value.join("");
        if (!part.added && !part.removed) {
            at += text.length;
            continue;
        }
        const last: TextChange | undefined = changes.at(-1);
        const change: TextChange = last !== undefined && last.to === at ? last : { from: at, to: at, insert: "" };
        if (change !== last) changes.push(change);
        if (part.removed) {
            change.to += text.length;
            at += text.length;
        } else change.insert += text;
    }
    return changes;
}

/**
 * The file of an existing note `.md` of my modules.
 * {@link realpathSync} follows symbolic links, so no link leads outside.
 *
 * @throws {Error} - When it lies outside `NomSkillingmodules`, has a hidden part or is no existing note
 */
function noteFileOf(path: string): string {
    const root: string = realpathSync(editor.modules);
    const file: string = realpathSync(join(root, path));
    const parts: string[] = file.slice(root.length + 1).split(sep);
    if (
        !file.startsWith(`${root}${sep}`) ||
        parts.some((part: string): boolean => part.startsWith(".")) ||
        extname(file).toLowerCase() !== ".md" ||
        !statSync(file).isFile()
    )
        throw new Error(`No writing but notes of my modules: ${path}`);
    return file;
}

/** The time now in Berlin to the second, for the head of a diff. */
function stampOf(): string {
    return Temporal.Now.plainDateTimeISO("Europe/Berlin").toString({ smallestUnit: "second" }).replace("T", " ");
}

/**
 * Writes a note as I saved it, merged, its diff first, nothing when the text did not change.
 *
 * @throws {Error} - When it is no note of my modules or no UTF-8 text, which could not be written back exactly
 */
export function noteWrite(change: NoteChange): Written {
    const file: string = noteFileOf(change.path);
    const bytes: Buffer = readFileSync(file);
    const old: string = bytes.toString("utf8");
    if (!Buffer.from(old, "utf8").equals(bytes)) throw new Error(`No UTF-8 text, so not written: ${change.path}`);
    const text: string = old === change.base ? change.text : textMerged(change.base, change.text, old);
    const written: Written = { text: text, changes: changesOf(change.text, text) };
    if (text === old) return written;

    const stamp: string = stampOf();
    mkdirSync(dirname(editor.corrections), { recursive: true });
    appendFileSync(
        editor.corrections,
        createTwoFilesPatch(`a/${change.path}`, `b/${change.path}`, old, text, stamp, stamp, {
            headerOptions: FILE_HEADERS_ONLY,
        }),
    );
    writeFileSync(file, text);
    return written;
}
