/**
 * ## Files
 *
 * Lists the files of my new system for the tree of the editor,
 * reads one and writes one back as I saved it.
 * The tree is `NomManageplannings` with every folder in it, also one I add later,
 * but never my old system, `NomSystemprevious`,
 * at any depth, nor a hidden file or folder, nor a symbolic link.
 * A Markdown file is written exactly as sent, without a diff,
 * since only the notes of my modules keep diffs, see `edit.ts`.
 * An `.ics` file is only read.
 * Paths are written from `NomManageplannings` with `/`.
 */

import {
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { extname, join, sep } from "node:path";
import { systemFiles, writeAllowed } from "./sources.ts";
import { changesOf, textMerged } from "./edit.ts";

import type { Dirent } from "node:fs";
import type { NoteChange, Written } from "./edit.ts";

/**
 * A folder or file of the tree, as the editor shows it.
 * - `children`: What a folder holds, its folders first, each part by name.
 */
export type FileNode = {
    name: string;
    path: string;
    folder: boolean;
    opens: boolean;
    children: FileNode[];
};

/** A file of my new system, as the editor shows it, editable when Markdown. */
export type SystemFile = {
    path: string;
    text: string;
    editable: boolean;
};

/** Endings of the files I edit. */
const editEndings: string[] = [".md"];

/** Endings of the files the editor opens: Markdown to edit, `.ics` to read only. */
const openEndings: string[] = [...editEndings, ".ics"];

/**
 * Tells whether a part of a path is left out of the tree and never read: my old system,
 * or a hidden one, like `.obsidian` or `..`.
 */
function leftOut(part: string): boolean {
    return part === systemFiles.previous || part.startsWith(".");
}

/** Tells whether the editor opens a file of the tree. */
function opensOf(path: string): boolean {
    return openEndings.includes(extname(path).toLowerCase());
}

/**
 * Lists a folder of the tree, its folders first,
 * then its files the editor opens, each part by name.
 * A symbolic link is neither a folder nor a file here, so it is left out too.
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
                children: entry.isDirectory()
                    ? nodesOf(join(folder, entry.name), inner)
                    : [],
            };
        })
        .filter((node: FileNode): boolean => node.folder || node.opens);
}

/** Reads the tree of the editor, none while `NomManageplannings` is missing. */
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
 * only for a file with one of the endings that lies in the tree and exists.
 * {@link realpathSync} follows symbolic links,
 * so no link leads outside the tree or into a part left out of it.
 *
 * @throws {Error} - When the path has a part left out,
 *   like `NomSystemprevious`, `.obsidian` or `..`,
 *   or a `\`, has none of the endings,
 *   lies outside the tree, or nothing lies there
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
    const root: string = realpathSync(systemFiles.tree);
    if (
        !file.startsWith(`${root}${sep}`) ||
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
 * Reads a file of my new system for the editor.
 *
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
 * Writes a Markdown file of my new system as I saved it,
 * merged with a change on the disk, see `textMerged` in `./edit.ts`.
 * A text without change writes nothing.
 *
 * @throws {Error} - When it is no Markdown file of the folders of the new system,
 *   see {@link systemFileOf}, or its file is no UTF-8 text,
 *   which could not be written back exactly
 */
export function systemFileWrite(change: NoteChange): Written {
    const file: string = systemFileOf(String(change.path ?? ""), editEndings);
    if (!writeAllowed(join(systemFiles.tree, ...change.path.split("/"))))
        throw new Error(`No writing outside the new system: ${change.path}`);
    const bytes: Buffer = readFileSync(file);
    const old: string = bytes.toString("utf8");
    if (!Buffer.from(old, "utf8").equals(bytes))
        throw new Error(`No UTF-8 text, so not written: ${change.path}`);
    const text: string =
        old === change.base ? change.text : textMerged(change.base, change.text, old);
    if (text !== old) writeFileSync(file, text);
    return { text: text, changes: changesOf(change.text, text) };
}
