/**
 * ## Notes
 *
 * Reads my modules in `NomSkillingmodules` for the scripts view and the skill entries,
 * read only but for a folder a click makes.
 * Each module is a vault of its own, as in Obsidian, so a link leads to a file of the same module.
 * Paths come and go with `/` from `NomSkillingmodules`.
 * Hidden files and folders, like `.obsidian`, stay out, as in Obsidian.
 * A missing folder counts as empty, a missing note or file or folder to show is an error.
 */

import {
    createReadStream,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
} from "node:fs";
import { extname, join, posix, sep } from "node:path";
import { berlinDateOf, writtenFollow } from "./calendar.ts";
import { semesterOf } from "./categories.ts";
import { moduleName, modulesFolder, notes } from "./sources.ts";

import type { Dirent, ReadStream } from "node:fs";

/** A note of a chapter, as the menu lists it. */
export type NoteEntry = {
    name: string;
    path: string;
};

/** A chapter of a module with its notes, sorted as Obsidian's file explorer does. */
export type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/** A module with its chapters that hold notes, its `title` the name of its folder. */
export type NotesModule = {
    name: string;
    title: string;
    chapters: Chapter[];
};

/**
 * A module as the menu lists it.
 *
 * - `semester`: The semester of today for a module of the semester, else the last I took it in, empty for none.
 */
export type MenuModule = NotesModule & {
    semester: string;
};

/**
 * A note with the files its links lead to.
 *
 * - `links`: For each link as written, the path of its file, `null` when it leads nowhere.
 */
export type LinkedNote = {
    path: string;
    text: string;
    links: { [link: string]: string | null };
};

export type NotesFile = {
    type: string;
    content: Buffer;
};

/** A file the browser gets piece by piece. */
export type NotesStream = {
    type: string;
    content: ReadStream;
};

export type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * What a module folder holds besides its notes, for a skill entry of the day.
 *
 * - `folder`: The module folder from `NomWorkspace`, empty for a skill without one, like a project.
 * - `chapters`: Its chapter folders, also the empty ones.
 * - `documents`: Its files outside the chapter folders, and the notes of its chapters, from the module folder.
 * - `materials`: The folder of the material of each type.
 * - `inner`: The folders of a semester in those, also empty ones.
 */
export type ModuleContents = {
    folder: string;
    chapters: string[];
    documents: string[];
    materials: { [type: string]: string };
    inner: string[];
};

/** The folder of the material of a type of one semester in a module, made on a click while missing. */
export type MaterialFolder = {
    path: string;
    exists: boolean;
};

/** Wiki link or embed, its target before `#`, `|` or the `\|` of tables. */
const wikiLink: RegExp = /\[\[([^\]#|\\]*)/g;

/** Markdown link or image, its address before `#`, plain or in `<…>`. */
const markdownLink: RegExp = /\]\(\s*(?:<([^>#]*)|([^\s)#]*))/g;

/** Address with a scheme, a link out of the vault, never resolved. */
const external: RegExp = /^[a-z][a-z\d+.-]*:/i;

/** Content types by ending, any other file comes as bytes. */
const types: { [ending: string]: string } = {
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
};

/** Sorts as Obsidian's file explorer does, numbers by their value, case ignored. */
const collator: Intl.Collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

/** Chapter folder, two digits and `_` first. */
const chapterFolder: RegExp = /^\d{2}_/;

/** The folder of the material of each type as my modules name it, for a module that has none yet. */
const materialFolders: { [type: string]: string } = {
    VO: "VO_UniversityLectureLessons",
    ZU: "ZU_UniversityCentralExercises",
    UE: "UE_UniversityModuleExercises",
    TU: "TU_UniversityTutorExercises",
    HU: "HU_UniversityHomeExercises",
    PR: "PR_UniversityPracticalExercises",
    FA: "FA_UniversityModuleExaminations",
};

/** Lines of the table of `Modules.md` before its rows. */
const tableHead: number = 2;

/** The place of a path inside `NomSkillingmodules`, without following links. */
function placeOf(path: string): string {
    return join(notes.modules, path);
}

/**
 * The path on the disk, only inside `NomSkillingmodules`.
 * {@link realpathSync} follows symbolic links, so no link leads outside.
 *
 * @throws {Error} - On a part starting with `.`, a path outside, or nothing there
 */
function diskPathOf(path: string): string {
    if (path.split("/").some((part: string): boolean => part.startsWith(".")))
        throw new Error(`No hidden path and no way up: ${path}`);

    const root: string = realpathSync(notes.modules);
    const file: string = realpathSync(placeOf(path));
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error(`No reading outside the modules: ${path}`);
    return file;
}

/** The module of a path, the vault its links stay in. */
function moduleOf(path: string): string {
    return path.split("/")[0];
}

/** The module code, the part of the folder name before `_`. */
export function codeOf(name: string): string {
    return name.split("_")[0];
}

/** The entries of a folder without hidden ones, a missing folder empty. */
function entriesRead(folder: string): Dirent[] {
    if (!existsSync(placeOf(folder))) return [];
    return readdirSync(diskPathOf(folder), { withFileTypes: true }).filter(
        (entry: Dirent): boolean => !entry.name.startsWith("."),
    );
}

/** Every file below a folder, without hidden ones. */
function filesRead(folder: string): string[] {
    return entriesRead(folder).flatMap((entry: Dirent): string[] => {
        const path: string = posix.join(folder, entry.name);
        return entry.isDirectory() ? filesRead(path) : [path];
    });
}

/** The files of a module, each full path by its path in the module. */
function vaultFilesRead(module: string): Map<string, string> {
    return new Map(filesRead(module).map((file: string): [string, string] => [file.slice(module.length + 1), file]));
}

/**
 * Finds the file a link leads to, as Obsidian's `getLinkpathDest`, case ignored:
 * - an empty link, like `[[#Heading]]`, leads to the note itself;
 * - candidates are the files of the link's name, else with `.md` added;
 * - a plain name with one candidate leads to it;
 * - else the candidate at the link's path, from the note's folder for `./` and `../`, else from the module;
 * - else the candidate whose path ends with the link, the note's folder first, the shortest first.
 *
 * @returns Path in the module, `null` when the link leads nowhere
 */
function linkResolve(link: string, note: string, files: string[]): string | null {
    if (link === "") return note;

    const named: (path: string) => string[] = (path: string): string[] =>
        files.filter((file: string): boolean => posix.basename(file).toLowerCase() === posix.basename(path));
    let path: string = link.toLowerCase();
    let candidates: string[] = posix.basename(path).includes(".") ? named(path) : [];
    if (candidates.length === 0) {
        path = `${link}.md`.toLowerCase();
        candidates = named(path);
    }
    if (candidates.length === 0) return null;
    if (!path.includes("/") && candidates.length === 1) return candidates[0];

    const folder: string = note.includes("/") ? note.slice(0, note.lastIndexOf("/")).toLowerCase() : "";
    const exact: string =
        path.startsWith("./") || path.startsWith("../") ? posix.join(folder, path) : path.replace(/^\//, "");
    const found: string | undefined = candidates.find((file: string): boolean => file.toLowerCase() === exact);
    if (found !== undefined) return found;
    if (link.startsWith("/")) return null;

    const endings: string[] = candidates
        .filter((file: string): boolean => file.toLowerCase().endsWith(path))
        .sort((first: string, second: string): number => first.length - second.length);
    const nearby: string | undefined = endings.find((file: string): boolean => file.toLowerCase().startsWith(folder));
    if (nearby !== undefined) return nearby;
    if (endings.length > 0) return endings[0];
    return null;
}

/** A link with `%20` and the like decoded, as Obsidian, as written when it cannot be. */
function linkDecode(link: string): string {
    try {
        return decodeURIComponent(link);
    } catch {
        return link;
    }
}

/** The cells of a table row, trimmed. */
function cellsOf(line: string): string[] {
    return line
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/** The chapters of a module with the `.md` files right in each, chapters without notes left out. */
function chaptersRead(module: string): Chapter[] {
    return entriesRead(module)
        .filter((chapter: Dirent): boolean => chapter.isDirectory() && chapterFolder.test(chapter.name))
        .map((chapter: Dirent): Chapter => ({
            title: chapter.name,
            notes: entriesRead(`${module}/${chapter.name}`)
                .filter((note: Dirent): boolean => !note.isDirectory() && note.name.toLowerCase().endsWith(".md"))
                .map((note: Dirent): NoteEntry => ({
                    name: note.name,
                    path: `${module}/${chapter.name}/${note.name}`,
                }))
                .sort((first: NoteEntry, second: NoteEntry): number => collator.compare(first.name, second.name)),
        }))
        .sort((first: Chapter, second: Chapter): number => collator.compare(first.title, second.title))
        .filter((chapter: Chapter): boolean => chapter.notes.length > 0);
}

/** The modules of the semester with their chapters and notes. */
export function modulesRead(): NotesModule[] {
    return activeModulesRead().map((module: string): NotesModule => ({
        name: module,
        title: module,
        chapters: chaptersRead(module),
    }));
}

/** Every module folder, named as a module is, so `_Inbox` is none, sorted as Obsidian. */
export function moduleFoldersRead(): string[] {
    return entriesRead("")
        .filter((entry: Dirent): boolean => entry.isDirectory() && moduleName.test(entry.name))
        .map((entry: Dirent): string => entry.name)
        .sort(collator.compare);
}

/**
 * Reads the semester of each module from `Modules.md`.
 * Of each row the folder its column `Nom` links and the newest semester of its column `Attempt`.
 * The column `Registered (not attempt)` stays unread.
 * Columns are found by their name in the head, so they may move.
 * A row without link or semester stays out.
 *
 * @returns Semester by folder, in the order of the rows, none without `Modules.md`
 */
function semestersRead(): Map<string, string> {
    if (!existsSync(notes.table)) return new Map();

    const rows: string[][] = readFileSync(notes.table, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .map(cellsOf);
    const head: string[] = rows[0] ?? [];
    return new Map(
        rows.slice(tableHead).flatMap((cells: string[]): [string, string][] => {
            const folder: string | undefined = /\]\(([^)]*)\)/
                .exec(cells[head.indexOf("Nom")] ?? "")?.[1]
                .split("/")
                .at(-1);
            const last: string | undefined = cells[head.indexOf("Attempt")]
                ?.match(/\d{4}[WS]/g)
                ?.sort(collator.compare)
                .at(-1);
            return folder === undefined || last === undefined ? [] : [[linkDecode(folder), last]];
        }),
    );
}

/**
 * The modules whose newest `Attempt` is the semester of today in Berlin time,
 * also one whose folder is missing yet, in the order of the rows.
 * Read anew each time, so a changed `Modules.md` counts at once.
 */
export function activeModulesRead(): string[] {
    const today: string = semesterOf(berlinDateOf(new Date()));
    return [...semestersRead()]
        .filter(([, semester]: [string, string]): boolean => semester === today)
        .map(([module]: [string, string]): string => module);
}

/**
 * Every module for the menu, with its chapters and semester.
 * The modules of today's semester first, in the order of their list, then the newest semester first,
 * then those without one, each group else in the order of its folders, since the sort is stable.
 */
export function menuRead(): MenuModule[] {
    const today: string = semesterOf(berlinDateOf(new Date()));
    const taken: Map<string, string> = semestersRead();
    return [...new Set([...activeModulesRead(), ...moduleFoldersRead()])]
        .map((module: string): MenuModule => ({
            name: module,
            title: module,
            semester: taken.get(module) ?? "",
            chapters: chaptersRead(module),
        }))
        .sort(
            (first: MenuModule, second: MenuModule): number =>
                Number(second.semester === today) - Number(first.semester === today) ||
                collator.compare(second.semester, first.semester),
        );
}

/**
 * The folder of a semester in each folder of material of a module, by type, also while empty.
 * Of two of one type, like `2025W_Hausuebung` beside `2025W_Praesenzuebung`, the first by name.
 * Every other type of {@link materialFolders} gets the folder a click makes, named by the semester.
 *
 * @returns Folders by type, each from the module folder, and whether it is there
 */
export function semesterFoldersRead(module: string, semester: string): { [type: string]: MaterialFolder } {
    const materials: string[] = entriesRead(module)
        .filter((material: Dirent): boolean => material.isDirectory() && /^[A-Z]{2}_/.test(material.name))
        .map((material: Dirent): string => material.name)
        .sort(collator.compare);
    const folders: { [type: string]: MaterialFolder } = {};
    materials.forEach((material: string): void => {
        const type: string = material.slice(0, 2);
        const inner: string | undefined = entriesRead(`${module}/${material}`)
            .filter(
                (folder: Dirent): boolean => folder.isDirectory() && /\d{4}[WS]/.exec(folder.name)?.[0] === semester,
            )
            .map((folder: Dirent): string => folder.name)
            .sort(collator.compare)[0];
        if (inner !== undefined && folders[type] === undefined)
            folders[type] = { path: `${material}/${inner}`, exists: true };
    });
    Object.entries(materialFoldersOf(module)).forEach(([type, material]: [string, string]): void => {
        folders[type] ??= { path: `${material}/${semester}`, exists: false };
    });
    return folders;
}

/**
 * The folder of the material of each type in a module, the first starting with the type and `_`,
 * else as {@link materialFolders} names it, so a link works while the module has none yet.
 */
export function materialFoldersOf(module: string): { [type: string]: string } {
    const materials: string[] = entriesRead(module)
        .filter((material: Dirent): boolean => material.isDirectory() && /^[A-Z]{2}_/.test(material.name))
        .map((material: Dirent): string => material.name)
        .sort(collator.compare);
    return Object.fromEntries(
        Object.entries(materialFolders).map(([type, name]: [string, string]): [string, string] => [
            type,
            materials.find((folder: string): boolean => folder.startsWith(`${type}_`)) ?? name,
        ]),
    );
}

/** The module folder of a code, `undefined` for none. */
export function moduleFolderOf(code: string): string | undefined {
    return moduleFoldersRead().find((name: string): boolean => codeOf(name) === code);
}

/** What a module folder holds, its documents every file outside its chapters and their notes, not their images. */
export function moduleContentsRead(module: string): ModuleContents {
    const chapters: string[] = entriesRead(module)
        .filter((entry: Dirent): boolean => entry.isDirectory() && chapterFolder.test(entry.name))
        .map((entry: Dirent): string => entry.name)
        .sort(collator.compare);
    const notes: string[] = chapters.flatMap((chapter: string): string[] =>
        entriesRead(`${module}/${chapter}`)
            .filter((note: Dirent): boolean => !note.isDirectory() && note.name.toLowerCase().endsWith(".md"))
            .map((note: Dirent): string => `${chapter}/${note.name}`),
    );
    const material: string[] = entriesRead(module)
        .flatMap((entry: Dirent): string[] =>
            entry.isDirectory()
                ? chapterFolder.test(entry.name)
                    ? []
                    : filesRead(`${module}/${entry.name}`)
                : [`${module}/${entry.name}`],
        )
        .map((file: string): string => file.slice(module.length + 1));
    const inner: string[] = Object.values(materialFoldersOf(module)).flatMap((folder: string): string[] =>
        entriesRead(`${module}/${folder}`)
            .filter((entry: Dirent): boolean => entry.isDirectory() && /\d{4}[WS]/.test(entry.name))
            .map((entry: Dirent): string => `${folder}/${entry.name}`),
    );
    return {
        folder: `${modulesFolder}/${module}`,
        chapters: chapters,
        documents: [...material, ...notes].sort(collator.compare),
        materials: materialFoldersOf(module),
        inner: inner.sort(collator.compare),
    };
}

/** The chapter name of the folder a path leads to, as an older skill entry links it. */
export function chapterNameOf(path: string): string {
    return path.split("/").at(-1) ?? "";
}

/** The files the links, embeds and images of a note lead to, links out of the vault left out. */
function linksOf(text: string, path: string, files: Map<string, string>): { [link: string]: string | null } {
    const note: string = path.slice(moduleOf(path).length + 1);
    const inModule: string[] = [...files.keys()];
    const links: string[] = [
        ...[...text.matchAll(wikiLink)].map((match: RegExpExecArray): string => match[1].trim()),
        ...[...text.matchAll(markdownLink)].map((match: RegExpExecArray): string => match[1] ?? match[2]),
    ].filter((link: string): boolean => !external.test(link));

    return Object.fromEntries(
        links.map((link: string): [string, string | null] => {
            const found: string | null = linkResolve(linkDecode(link), note, inModule);
            return [link, found === null ? null : (files.get(found) ?? null)];
        }),
    );
}

/**
 * A note with the files its links lead to in its module.
 * Lists the files of the module once, up to a few hundred milliseconds in a module with code.
 *
 * @throws {Error} - When the note lies outside `NomSkillingmodules`, or is missing
 */
export function linkedNoteRead(path: string): LinkedNote {
    const text: string = readFileSync(diskPathOf(path), "utf8");
    return {
        path: path,
        text: text,
        links: linksOf(text, path, vaultFilesRead(moduleOf(path))),
    };
}

function contentTypeOf(file: string): string {
    return types[extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** @throws {Error} - When the file lies outside `NomSkillingmodules`, or is missing */
export function fileRead(path: string): NotesFile {
    const file: string = diskPathOf(path);
    return { type: contentTypeOf(file), content: readFileSync(file) };
}

/**
 * Opens a file to send it piece by piece, so a large PDF never lies in memory whole.
 *
 * @throws {Error} - When the file lies outside `NomSkillingmodules`, is missing, or is a folder
 */
export function fileOpen(path: string): NotesStream {
    const file: string = diskPathOf(path);
    if (!statSync(file).isFile()) throw new Error(`No file: ${path}`);
    return { type: contentTypeOf(file), content: createReadStream(file) };
}

/**
 * A folder sorted as Obsidian, without hidden entries and symbolic links, so nothing leads out.
 *
 * @throws {Error} - When the folder lies outside `NomSkillingmodules`, is missing, or is a file
 */
export function folderRead(path: string): NotesFolder {
    const entries: Dirent[] = readdirSync(diskPathOf(path), {
        withFileTypes: true,
    }).filter((entry: Dirent): boolean => !entry.name.startsWith("."));
    return {
        folders: entries
            .filter((entry: Dirent): boolean => entry.isDirectory())
            .map((entry: Dirent): string => entry.name)
            .sort(collator.compare),
        files: entries
            .filter((entry: Dirent): boolean => entry.isFile())
            .map((entry: Dirent): string => entry.name)
            .sort(collator.compare),
    };
}

/**
 * Makes a folder of a module and the missing ones on the way,
 * only inside the module folder, never through a symbolic link.
 *
 * @throws {Error} - Outside a module, on an empty part or one starting with `.`, or a non-folder on the way
 */
export function folderMake(path: string): void {
    const parts: string[] = path.split("/");
    if (
        parts.length < 2 ||
        !moduleFoldersRead().includes(parts[0]) ||
        parts.some((part: string): boolean => part === "" || part.startsWith("."))
    )
        throw new Error(`No folder inside a module: ${path}`);

    let folder: string = diskPathOf(parts[0]);
    for (const part of parts.slice(1)) {
        folder = join(folder, part);
        if (!existsSync(folder)) mkdirSync(folder);
        else if (!lstatSync(folder).isDirectory()) throw new Error(`No folder on the way: ${path}`);
    }
}

/**
 * Makes the folder of the semester of each type a written plan or log holds,
 * so the link of every skill entry leads to a folder that is there.
 * No folder renamed or removed.
 * A folder that cannot be made is left out, since writing the entry matters more.
 *
 * @returns The folders made, from `NomSkillingmodules`
 */
export function typeFoldersMake(module: string, kinds: [string, string][]): string[] {
    const made: string[] = [];
    new Set(kinds.map(([type, semester]: [string, string]): string => `${type} ${semester}`)).forEach(
        (kind: string): void => {
            const [type, semester]: string[] = kind.split(" ");
            const folder: MaterialFolder | undefined =
                materialFolders[type] === undefined || !/^\d{4}[WS]$/.test(semester)
                    ? undefined
                    : semesterFoldersRead(module, semester)[type];
            if (folder === undefined || folder.exists) return;
            try {
                folderMake(`${module}/${folder.path}`);
                made.push(`${module}/${folder.path}`);
            } catch (error: unknown) {
                console.error(error);
            }
        },
    );
    return made;
}

writtenFollow((module: string, kinds: [string, string][]): void => {
    typeFoldersMake(module, kinds);
});
