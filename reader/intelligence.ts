/**
 * ## Our docs
 *
 * Reads and writes our doc of a day in `NomFrequenceintelligence`, `<YYYY>/<YYYY_MM>/<YYYY_MM_DD>.md`.
 * A day without one gives the blueprint of my manage skill.
 * Its file and folders come with the first save.
 * Paths are from `NomManageplannings` with `/`, as in the editor.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { dayBlueprint, intelligenceRoot, systemFiles, writeAllowed } from "./sources.ts";
import { systemFileRead, systemFileWrite } from "./files.ts";

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

/** Our doc of a date, the blueprint while the day has none, nothing without a blueprint. */
export function docRead(date: string): SystemFile {
    const path: string = docPathOf(date);
    if (existsSync(fileOf(path))) return systemFileRead(path);
    return { path: path, text: existsSync(dayBlueprint) ? readFileSync(dayBlueprint, "utf8") : "", editable: true };
}

/**
 * Writes our doc as I saved it, a missing one with its folders, else merged as any file of the tree.
 *
 * @throws {Error} - When it is no doc of a day or its file came between the check and the write
 */
export function docWrite(change: NoteChange): Written {
    const path: string = String(change.path ?? "");
    const date: string = (path.split("/").at(-1) ?? "").replace(/\.md$/, "").replaceAll("_", "-");
    if (docPathOf(date) !== path) throw new Error(`No doc of a day: ${path}`);
    const file: string = fileOf(path);
    if (existsSync(file)) return systemFileWrite(change);
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${path}`);

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, change.text, { flag: "wx" });
    return { text: change.text, changes: [] };
}
