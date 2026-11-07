/**
 * ## Our docs
 *
 * Reads and writes our doc of a day in `NomMentalintelligence`, `<YYYY>/<YYYY_MM>/<YYYY_MM_DD>.md`.
 * Today's doc is made from the blueprint of my manage skill the moment it is read.
 * Another day without one gives the blueprint.
 * Its file and folders come with the first save.
 * Paths are from `NomManageplannings` with `/`, as in the editor.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { dayBlueprint, intelligenceRoot, systemFiles, writeAllowed } from "./sources.ts";
import { systemFileRead, systemFileWrite } from "./files.ts";
import { berlinDateOf } from "./calendar.ts";

import type { SystemFile } from "./files.ts";
import type { NoteChange, Written } from "./edit.ts";

/**
 * Path of the doc of a date.
 *
 * @throws {Error} - When the date is not written like `2026-11-07`
 */
function docPathOf(date: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const [year, month, dayOfMonth]: string[] = date.split("-");
    const file: string = join(intelligenceRoot, year, `${year}_${month}`, `${year}_${month}_${dayOfMonth}.md`);
    return relative(systemFiles.tree, file).split(sep).join("/");
}

/** The file on the disk of a path. */
function fileOf(path: string): string {
    return join(systemFiles.tree, ...path.split("/"));
}

/**
 * Makes a missing doc with its folders.
 *
 * @throws {Error} - When it lies outside the new system or its file came between the check and the write
 */
function docMake(path: string, text: string): void {
    const file: string = fileOf(path);
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${path}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text, { flag: "wx" });
}

/**
 * Our doc of a date, today's made at once, another day's the blueprint while it has none.
 * Nothing is made without a blueprint.
 */
export function docRead(date: string): SystemFile {
    const path: string = docPathOf(date);
    const blueprint: string = existsSync(dayBlueprint) ? readFileSync(dayBlueprint, "utf8") : "";
    if (!existsSync(fileOf(path)) && blueprint !== "" && date === berlinDateOf(new Date())) docMake(path, blueprint);
    if (!existsSync(fileOf(path))) return { path: path, text: blueprint, editable: true };
    return systemFileRead(path);
}

/**
 * Writes our doc as I saved it, a missing one made, else merged as any file of the tree.
 *
 * @throws {Error} - When it is no doc of a day, see {@link docMake} too
 */
export function docWrite(change: NoteChange): Written {
    const path: string = String(change.path ?? "");
    const date: string = (path.split("/").at(-1) ?? "").replace(/\.md$/, "").replaceAll("_", "-");
    if (docPathOf(date) !== path) throw new Error(`No doc of a day: ${path}`);
    if (existsSync(fileOf(path))) return systemFileWrite(change);

    docMake(path, change.text);
    return { text: change.text, changes: [] };
}
