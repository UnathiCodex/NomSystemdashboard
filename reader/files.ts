/**
 * ## Files
 *
 * Lists the files of my new system for the tree of the editor,
 * reads one and writes one back as I saved it.
 * The tree is `NomManageplannings` with every folder in it, also one I add later,
 * but never my old system, `NomSystemprevious`, at any depth, nor a hidden file or folder,
 * like `.obsidian`, nor a symbolic link.
 * Reads and writes only inside the folders of my new system, see `systemFiles` in `sources.ts`:
 * a Markdown file, like `NomMetainformations/Foods.md` or a daily note, to edit,
 * written exactly as sent, without a diff, since only the notes of my modules keep diffs,
 * see `edit.ts`; an `.ics` file only to read.
 * Paths are written from `NomManageplannings` with `/`,
 * like `NomManagecalendar/Health/Sleep_2026_Log.ics`.
 *
 * - `node:fs`: Lists folders, reads and writes files.
 * - `node:path`: Builds file paths for the operating system.
 * - `./edit.ts`: Gives the form of a file as I saved it in the editor.
 * - `./sources.ts`: Names the tree, the folder left out of it and the folders of the new system,
 *   and tells which files the reader may write.
 */

import {
    existsSync,
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { basename, extname, join, sep } from "node:path";
import { systemFiles, writeAllowed } from "./sources.ts";

import type { Dirent } from "node:fs";
import type { NoteChange } from "./edit.ts";

/**
 * A folder or file of the tree, as the editor shows it.
 *
 * - `name`: Its name, like `2026_10` or `Foods.md`.
 * - `path`: Its path, see the top of this file, like `NomMetainformations/Foods.md`.
 * - `folder`: Whether it is a folder.
 * - `opens`: Whether the editor opens it:
 *   a Markdown or `.ics` file of the folders of the new system, never a folder.
 * - `children`: What a folder holds, its folders first, each part by name; none for a file.
 */
export type FileNode = {
    name: string;
    path: string;
    folder: boolean;
    opens: boolean;
    children: FileNode[];
};

/**
 * A file of my new system, as the editor shows it.
 *
 * - `path`: Its path, like `NomMetainformations/Foods.md`.
 * - `text`: Its text, as it lies in the file.
 * - `editable`: Whether I may change it: a Markdown file, not an `.ics` file.
 */
export type SystemFile = {
    path: string;
    text: string;
    editable: boolean;
};

/**
 * Endings of the files I edit: Markdown.
 */
const editEndings: string[] = [".md"];

/**
 * Endings of the files the editor opens: Markdown to edit, `.ics` to read only.
 */
const openEndings: string[] = [...editEndings, ".ics"];

/**
 * Tells whether a part of a path is left out of the tree and never read: my old system,
 * or a hidden one, like `.obsidian` or `..`.
 *
 * @param part - Name of a folder or file, like `NomSystemprevious`
 * @returns Whether it is left out
 */
function leftOut(part: string): boolean {
    return part === systemFiles.previous || part.startsWith(".");
}

/**
 * Tells whether the editor opens a file of a path:
 * it lies in one of the folders and is Markdown or `.ics`.
 * - `top`: The folder of `NomManageplannings` it lies in, like `NomMetainformations`.
 *
 * @param path - Path like `NomMetainformations/Foods.md`
 * @returns Whether it opens
 */
function opensOf(path: string): boolean {
    const top: string = path.split("/")[0];
    return (
        path.includes("/") &&
        systemFiles.folders.some((folder: string): boolean => basename(folder) === top) &&
        openEndings.includes(extname(path).toLowerCase())
    );
}

/**
 * Lists a folder of the tree, its folders first,
 * then its files the editor opens, each part by name, any other file and the left out ones not,
 * see {@link leftOut}; a symbolic link is neither a folder nor a file here, so it is left out too.
 * - `entries`: Folders and files in it.
 *
 * @param folder - Folder on the disk, like `NomManageplannings/NomManagecalendar`
 * @param path - Its path, see the top of this file, empty for `NomManageplannings` itself
 * @returns What it holds
 */
function nodesOf(folder: string, path: string): FileNode[] {
    const entries: Dirent[] = readdirSync(folder, { withFileTypes: true })
        .filter(
            (entry: Dirent): boolean =>
                !leftOut(entry.name) && (entry.isDirectory() || entry.isFile()),
        )
        .sort(
            (first: Dirent, second: Dirent): number =>
                Number(second.isDirectory()) - Number(first.isDirectory()) ||
                first.name.localeCompare(second.name),
        );
    return entries
        .map((entry: Dirent): FileNode => {
            const inner: string = path === "" ? entry.name : `${path}/${entry.name}`;
            return {
                name: entry.name,
                path: inner,
                folder: entry.isDirectory(),
                opens: entry.isFile() && opensOf(inner),
                children: entry.isDirectory() ? nodesOf(join(folder, entry.name), inner) : [],
            };
        })
        .filter((node: FileNode): boolean => node.folder || node.opens);
}

/**
 * Reads the tree of the editor, see the top of this file.
 *
 * @returns The folders and files in `NomManageplannings`, none while it is missing
 */
export function treeRead(): FileNode[] {
    try {
        return nodesOf(systemFiles.tree, "");
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
}

/**
 * Turns the path of a file of my new system into its file on the disk,
 * only for a file with one of the endings that lies in one of the folders and exists.
 * - {@link realpathSync}: Makes a path absolute and follows symbolic links,
 *   so no link leads outside the folders.
 * - `parts`: The parts of the path as sent.
 * - `file`: The file on the disk.
 * - `root`: The one of the folders it lies in, `undefined` for none; a folder still missing,
 *   like `NomFrequencediary` before my first daily note, holds nothing.
 *
 * @param path - Path like `NomMetainformations/Foods.md`
 * @param endings - Endings it may have, like `.md`
 * @returns File on the disk
 * @throws {Error} - When the path has a part left out,
 *   like `NomSystemprevious`, `.obsidian` or `..`,
 *   or a `\`, has none of the endings,
 *   lies outside the folders of the new system, or nothing lies there
 */
function systemFileOf(path: string, endings: string[]): string {
    const parts: string[] = path.split("/");
    if (
        path.includes("\\") ||
        parts.some((part: string): boolean => part === "" || leftOut(part)) ||
        !endings.includes(extname(path).toLowerCase())
    )
        throw new Error(`No file of the new system the editor opens: ${path}`);

    const file: string = realpathSync(join(systemFiles.tree, ...parts));
    const root: string | undefined = systemFiles.folders
        .filter((folder: string): boolean => existsSync(folder))
        .map((folder: string): string => realpathSync(folder))
        .find((folder: string): boolean => file.startsWith(`${folder}${sep}`));
    if (
        root === undefined ||
        file
            .slice(root.length + 1)
            .split(sep)
            .some(leftOut) ||
        !statSync(file).isFile()
    )
        throw new Error(`No file of the folders of the new system: ${path}`);
    return file;
}

/**
 * Reads a file of my new system for the editor:
 * a Markdown file to edit, an `.ics` file to read only.
 *
 * @param path - Path like `NomManagecalendar/Health/Sleep_2026_Log.ics`
 * @returns The file with its text
 * @throws {Error} - When it is no such file, see {@link systemFileOf}
 */
export function systemFileRead(path: string): SystemFile {
    const file: string = systemFileOf(path, openEndings);
    return {
        path: path,
        text: readFileSync(file, "utf8"),
        editable: editEndings.includes(extname(path).toLowerCase()),
    };
}

/**
 * Writes a Markdown file of my new system as I saved it, exactly the text sent,
 * when its file did not change since the editor read it; without a diff.
 * A text without change writes nothing.
 * - `file`: The file on the disk.
 * - `bytes`, `old`: What it holds now, as bytes and as text.
 *
 * @param change - File as saved
 * @returns Whether it is written, `false` when its file changed since the editor read it
 * @throws {Error} - When it is no Markdown file of the folders of the new system,
 *   see {@link systemFileOf}, or its file is no UTF-8 text, which could not be written back exactly
 */
export function systemFileWrite(change: NoteChange): boolean {
    const file: string = systemFileOf(String(change.path ?? ""), editEndings);
    if (!writeAllowed(join(systemFiles.tree, ...change.path.split("/"))))
        throw new Error(`No writing outside the new system: ${change.path}`);
    const bytes: Buffer = readFileSync(file);
    const old: string = bytes.toString("utf8");
    if (!Buffer.from(old, "utf8").equals(bytes))
        throw new Error(`No UTF-8 text, so not written: ${change.path}`);
    if (old !== change.base) return false;
    if (change.text !== old) writeFileSync(file, String(change.text));
    return true;
}
