/**
 * ## Edit
 *
 * Writes a note of my modules as I saved it in the editor,
 * right at its place in `NomSkillingmodules`:
 * exactly the text sent, nothing reformatted,
 * and first adds the change as a unified diff to the end of the file of my corrections,
 * so the AI can turn them into rules of my style, see `editor` in `sources.ts`.
 * Paths are those of the scripts view, from `NomSkillingmodules`, like
 * `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_SampleMeanEstimator.md`.
 *
 * - `node:fs`: Reads and writes files.
 * - `node:path`: Builds file paths for the operating system.
 * - `diff`: Writes a change as a unified diff, as `git diff` does.
 * - `temporal-polyfill`: Gives the time in Berlin, for the head of a diff.
 * - `./sources.ts`: Names the folder of my modules and the file of my corrections.
 */

import {
    appendFileSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { createTwoFilesPatch, FILE_HEADERS_ONLY } from "diff";
import { Temporal } from "temporal-polyfill";
import { editor } from "./sources.ts";

/**
 * A note as I saved it in the editor.
 *
 * - `path`: Path of the note, see the top of this file.
 * - `base`: Text of the note when the editor read it or saved it last,
 *   to tell whether the file changed since.
 * - `text`: Text to write.
 */
export type NoteChange = {
    path: string;
    base: string;
    text: string;
};

/**
 * Turns the path of a note into its file on the disk,
 * only for a note `.md` of my modules that exists.
 * - {@link realpathSync}: Makes a path absolute and follows symbolic links,
 *   so no link leads outside.
 *
 * @param path - Path like `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_SampleMeanEstimator.md`
 * @returns File on the disk
 * @throws {Error} - When the path lies outside `NomSkillingmodules`,
 *   has a hidden part like `.obsidian` or `..`, is no note `.md`, or nothing lies there
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

/**
 * Writes the time now in Berlin for the head of a diff,
 * as `diff -u` writes it beside the path of a file.
 *
 * @returns Time like `2026-10-17 14:40:19`
 */
function stampOf(): string {
    return Temporal.Now.plainDateTimeISO("Europe/Berlin")
        .toString({ smallestUnit: "second" })
        .replace("T", " ");
}

/**
 * Writes a note of my modules as I saved it, when its file did not change since the editor read it:
 * first its change as a unified diff at the end of the file of my corrections,
 * its head naming the note and the time,
 * like `--- a/IN2028_…/01_RegressionAnalysis/01_01_SampleMeanEstimator.md` and,
 * after a tab, `2026-10-17 14:40:19`;
 * then the text, exactly as sent. A text without change writes nothing.
 * - {@link createTwoFilesPatch}: Writes the change as `diff -u` does, with the path of the note
 *   in `NomSkillingmodules` and the time.
 *
 * @param change - Note as saved
 * @returns Whether it is written, `false` when its file changed since the editor read it
 * @throws {Error} - When it is no note of my modules, see {@link noteFileOf},
 *   or its file is no UTF-8 text, which could not be written back exactly
 */
export function noteWrite(change: NoteChange): boolean {
    const file: string = noteFileOf(change.path);
    const bytes: Buffer = readFileSync(file);
    const old: string = bytes.toString("utf8");
    if (!Buffer.from(old, "utf8").equals(bytes))
        throw new Error(`No UTF-8 text, so not written: ${change.path}`);
    if (old !== change.base) return false;
    if (change.text === old) return true;

    const stamp: string = stampOf();
    mkdirSync(dirname(editor.corrections), { recursive: true });
    appendFileSync(
        editor.corrections,
        createTwoFilesPatch(
            `a/${change.path}`,
            `b/${change.path}`,
            old,
            change.text,
            stamp,
            stamp,
            { headerOptions: FILE_HEADERS_ONLY },
        ),
    );
    writeFileSync(file, change.text);
    return true;
}
