/**
 * ## Notes
 *
 * Reads my modules for the scripts view, read only but for a folder a click makes,
 * see {@link folderMake}:
 * every module with its chapters and notes for the menu, see {@link menuRead},
 * the modules of the semester for their tasks, see `skill.ts`,
 * a note with the files its links lead to, single files, and a folder,
 * see {@link folderRead}.
 * For the skill entries of the day it reads every module folder with its chapters
 * and the university's documents in it,
 * for the course of a module the folders of its material of a semester, see `course.ts`.
 * Each module is a vault of its own, as in Obsidian,
 * so a link leads to a file of the same module.
 * A note of any module can be read, also one the menu does not list.
 * Paths come and go with `/` from `NomSkillingmodules`.
 * Hidden files and folders, like `.obsidian`, stay out, as in Obsidian.
 * A missing folder counts as empty,
 * like a module of the semester whose folder is not made yet,
 * or `NomSkillingmodules` itself.
 * A missing note or file is an error, and so is a missing folder to show.
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

/**
 * A note of a chapter, as the menu lists it.
 */
export type NoteEntry = {
    name: string;
    path: string;
};

/**
 * A chapter of a module with its notes, sorted as Obsidian's file explorer does.
 */
export type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/**
 * A module with its chapters that hold notes, its `title` the name of its folder.
 */
export type NotesModule = {
    name: string;
    title: string;
    chapters: Chapter[];
};

/**
 * A module as the menu of the scripts view lists it, see {@link menuRead}.
 *
 * - `semester`: For a module of the semester the semester of today,
 *   else the last I took it in, empty for none.
 */
export type MenuModule = NotesModule & {
    semester: string;
};

/**
 * A note with the files its links lead to.
 *
 * - `links`: For each link of the note as written,
 *   path of the file it leads to, `null` when it leads nowhere.
 */
export type LinkedNote = {
    path: string;
    text: string;
    links: { [link: string]: string | null };
};

/**
 * A file with its content type, as the browser gets it.
 */
export type NotesFile = {
    type: string;
    content: Buffer;
};

/**
 * A file with its content type,
 * as the browser gets it piece by piece, see {@link fileOpen}.
 */
export type NotesStream = {
    type: string;
    content: ReadStream;
};

/**
 * What a folder of my modules holds, as its view shows it, see {@link folderRead}.
 */
export type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * What a module folder holds besides its notes, for a skill entry of the day.
 *
 * - `folder`: The module folder from `NomWorkspace`, empty for a skill without one, like a project.
 * - `chapters`: Names of its chapter folders, also of the empty ones.
 * - `documents`: Its files outside the chapter folders, the university's material,
 *   and the notes of its chapters, by their paths from the module folder.
 * - `materials`: The folder of the material of each type, see {@link materialFoldersOf}.
 * - `inner`: The folders of a semester in those folders, also empty ones,
 *   which the link of an entry of that semester goes on into.
 */
export type ModuleContents = {
    folder: string;
    chapters: string[];
    documents: string[];
    materials: { [type: string]: string };
    inner: string[];
};

/**
 * The folder of the material of a type of one semester in a module,
 * for the course of the module, see {@link semesterFoldersRead}.
 * One that does not exist a click on it makes, see {@link folderMake}.
 */
export type MaterialFolder = {
    path: string;
    exists: boolean;
};

/**
 * Wiki link or embed, like `[[05_06_EulerTrigonometrie#…|…]]` or `![[Tangens.svg|300]]`:
 * its target before `#`, `|` or the `\|` written in tables.
 */
const wikiLink: RegExp = /\[\[([^\]#|\\]*)/g;

/**
 * Markdown link or image, like `[Text](Note.md#Heading)`
 * or `![Singleton](./img/Singleton.png)`:
 * its address before `#`, written plain or in `<…>`.
 */
const markdownLink: RegExp = /\]\(\s*(?:<([^>#]*)|([^\s)#]*))/g;

/**
 * Address with a scheme, like `https://…` or `mailto:…`:
 * a link out of the vault, never resolved.
 */
const external: RegExp = /^[a-z][a-z\d+.-]*:/i;

/**
 * Content types of the files the scripts view shows or opens,
 * and of the files skill entries link, by their ending.
 * Any other file comes as bytes.
 */
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

/**
 * Sorts names as Obsidian's file explorer does:
 * alphabetical, numbers by their value, case ignored.
 */
const collator: Intl.Collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

/**
 * Chapter folder, like `01_RegressionAnalysis`: two digits and `_` first.
 */
const chapterFolder: RegExp = /^\d{2}_/;

/**
 * The folder of the material of each type in a module, as my modules name it.
 * The name of the folder of a type in a module that has none yet,
 * see {@link materialFoldersOf}.
 */
const materialFolders: { [type: string]: string } = {
    VO: "VO_UniversityLectureLessons",
    ZU: "ZU_UniversityCentralExercises",
    UE: "UE_UniversityModuleExercises",
    TU: "TU_UniversityTutorExercises",
    HU: "HU_UniversityHomeExercises",
    PR: "PR_UniversityPracticalExercises",
    FA: "FA_UniversityModuleExaminations",
};

/**
 * Lines of the table of `Modules.md` before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * Builds the place of a path on the disk, inside `NomSkillingmodules`,
 * as written, without following links.
 */
function placeOf(path: string): string {
    return join(notes.modules, path);
}

/**
 * Turns a path into the path on the disk, only when it stays inside `NomSkillingmodules`.
 * {@link realpathSync} follows symbolic links, so no link leads outside.
 *
 * @throws {Error} - When a part of the path starts with `.`, like `..` or `.obsidian`,
 *   when it leads outside its folder, or when nothing lies there
 */
function diskPathOf(path: string): string {
    if (path.split("/").some((part: string): boolean => part.startsWith(".")))
        throw new Error(`No hidden path and no way up: ${path}`);

    const root: string = realpathSync(notes.modules);
    const file: string = realpathSync(placeOf(path));
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error(`No reading outside the modules: ${path}`);
    return file;
}

/**
 * Gives the module of a path, the vault its links stay in.
 */
function moduleOf(path: string): string {
    return path.split("/")[0];
}

/**
 * Gives the module code of a module folder, the part of its name before `_`.
 */
export function codeOf(name: string): string {
    return name.split("_")[0];
}

/**
 * Reads the entries of a folder without hidden ones, as Obsidian lists a vault.
 * A missing folder counts as empty.
 */
function entriesRead(folder: string): Dirent[] {
    if (!existsSync(placeOf(folder))) return [];
    return readdirSync(diskPathOf(folder), { withFileTypes: true }).filter(
        (entry: Dirent): boolean => !entry.name.startsWith("."),
    );
}

/**
 * Lists every file below a folder, without hidden files and folders,
 * as Obsidian lists a vault.
 */
function filesRead(folder: string): string[] {
    return entriesRead(folder).flatMap((entry: Dirent): string[] => {
        const path: string = posix.join(folder, entry.name);
        return entry.isDirectory() ? filesRead(path) : [path];
    });
}

/**
 * Lists the files of a module the links of a note may lead to,
 * each full path by its path in the module.
 */
function vaultFilesRead(module: string): Map<string, string> {
    return new Map(filesRead(module).map((file: string): [string, string] => [file.slice(module.length + 1), file]));
}

/**
 * Finds the file a link leads to, as Obsidian does in `getLinkpathDest`, ignoring case:
 * - an empty link, like the one of `[[#Heading]]`, leads to the note itself;
 * - candidates are the files with the link's name, like `Tangens.svg`;
 *   when its name has no ending or no file has it, the files with `.md` added,
 *   like `03_05_AbsoluteKonvergenz.md`;
 * - a plain name with one candidate leads to it;
 * - else the candidate at the link's path,
 *   from the note's folder for `./` and `../`, else from the module;
 * - else the candidate whose path ends with the link,
 *   the note's folder first, the shortest path first.
 *
 *
 * @param note - Path of the note in its module
 * @returns Path of the file in the module, or `null` when the link leads nowhere
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

/**
 * Reads a link as Obsidian does: with `%20` and the like decoded,
 * as written when it cannot be decoded.
 */
function linkDecode(link: string): string {
    try {
        return decodeURIComponent(link);
    } catch {
        return link;
    }
}

/**
 * Cuts a row of a table into its cells, each without spaces at its ends.
 */
function cellsOf(line: string): string[] {
    return line
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Reads the chapters of a module with their notes, the `.md` files right in each.
 * Chapters without notes stay out, and so do the other folders,
 * like `FA_UniversityModuleExaminations` with the university's material,
 * and the other files, like images.
 */
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

/**
 * Reads the modules of the semester, see {@link activeModulesRead},
 * each with its chapters and their notes, for their tasks, see `skill.ts`.
 */
export function modulesRead(): NotesModule[] {
    return activeModulesRead().map((module: string): NotesModule => ({
        name: module,
        title: module,
        chapters: chaptersRead(module),
    }));
}

/**
 * Lists every module folder in `NomSkillingmodules`, named as a module is,
 * see `moduleName` in `sources.ts`, so a folder like `_Inbox` is none,
 * also of the modules that are not of the semester,
 * as Obsidian's file explorer sorts them.
 */
export function moduleFoldersRead(): string[] {
    return entriesRead("")
        .filter((entry: Dirent): boolean => entry.isDirectory() && moduleName.test(entry.name))
        .map((entry: Dirent): string => entry.name)
        .sort(collator.compare);
}

/**
 * Reads the semester of each module from the overview of my modules,
 * `Modules.md`, see {@link notes}:
 * of each row the folder its column `Nom` links, the last part of the link,
 * and the newest semester its column `Attempt` names,
 * of every semester I seriously took it in, graded or not.
 * Its column `Registered (not attempt)`,
 * every semester I was registered in, stays unread.
 * Each column found by its name in the head of the table, so the columns may move.
 * A row without such a link or without a semester stays out.
 *
 * @returns The semester of each module by its folder, in the order of the rows,
 *   none while `Modules.md` does not exist
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
 * Reads the modules of the semester, by their folders in `NomSkillingmodules`:
 * those whose newest `Attempt` in `Modules.md` is the semester of today in Berlin time,
 * also one whose folder is missing yet, in the order of the rows.
 * Read anew each time, so a changed `Modules.md` changes them at once.
 * Only these have tasks, see `skill.ts`,
 * and the menu of the scripts view shows them first, see {@link menuRead}.
 */
export function activeModulesRead(): string[] {
    const today: string = semesterOf(berlinDateOf(new Date()));
    return [...semestersRead()]
        .filter(([, semester]: [string, string]): boolean => semester === today)
        .map(([module]: [string, string]): string => module);
}

/**
 * Reads every module for the menu of the scripts view,
 * each with its chapters and the semester it stands under:
 * the modules under the semester of today first, in the order of their list,
 * also one whose folder is missing yet,
 * then those of the other semesters, the newest first,
 * then those without a semester, each group else in the order of its folders,
 * since a sort keeps the order of what it ranks the same.
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
 * Lists the folders of the material of a module of one semester, by type,
 * for the course of the module, see `course.ts`:
 * in each folder of material the folder of the semester, also while it holds nothing yet.
 * Of two of one type, like `LMU_2026W` beside `TUM_2026W`, the first by name,
 * as the tree lists them.
 * For every other type of {@link materialFolders} the folder
 * a click on it makes, see {@link folderMake}: `TUM_` and the semester.
 *
 * @returns Folders by type, each its path from the module folder, and whether it is there
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
        folders[type] ??= { path: `${material}/TUM_${semester}`, exists: false };
    });
    return folders;
}

/**
 * Gives the folder of the material of each type in a module:
 * the folder starting with the type and `_` as the module names it, the first by name,
 * else as my modules name it, see {@link materialFolders},
 * so a skill entry of a type links the folder of its material also
 * while the module has none yet, see `skillLinkOf` in `documents.ts`.
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

/**
 * Finds the folder of a module in `NomSkillingmodules` by its code,
 * `undefined` when no folder has the code.
 */
export function moduleFolderOf(code: string): string | undefined {
    return moduleFoldersRead().find((name: string): boolean => codeOf(name) === code);
}

/**
 * Reads what a module folder holds for a skill entry, see {@link ModuleContents}:
 * as documents every file of the module outside its chapter folders,
 * and the notes of its chapters, but not their images.
 */
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

/**
 * Gives the name of the chapter whose folder a path leads to,
 * like the folder an older skill entry links.
 */
export function chapterNameOf(path: string): string {
    return path.split("/").at(-1) ?? "";
}

/**
 * Finds the files the wiki links, embeds,
 * Markdown links and images of a note lead to, see {@link linkResolve}.
 * Links out of the vault, like `https://…`, stay out.
 */
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
 * Reads a note with the files its links lead to within its module, see {@link linksOf}.
 * Lists the files of its module once,
 * which takes up to a few hundred milliseconds in a module with code.
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

/**
 * Gives the content type of a file by its ending, see {@link types}.
 */
function contentTypeOf(file: string): string {
    return types[extname(file).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Reads a file of my modules with its content type,
 * like an image of a note or a PDF to open.
 *
 * @throws {Error} - When the file lies outside `NomSkillingmodules`, or is missing
 */
export function fileRead(path: string): NotesFile {
    const file: string = diskPathOf(path);
    return { type: contentTypeOf(file), content: readFileSync(file) };
}

/**
 * Opens a file of my modules with its content type to send it piece by piece,
 * so a large file, like a book as PDF, never lies in the reader's memory whole.
 *
 * @throws {Error} - When the file lies outside `NomSkillingmodules`,
 *   is missing, or is a folder
 */
export function fileOpen(path: string): NotesStream {
    const file: string = diskPathOf(path);
    if (!statSync(file).isFile()) throw new Error(`No file: ${path}`);
    return { type: contentTypeOf(file), content: createReadStream(file) };
}

/**
 * Lists a folder of my modules for its view, see `src/editor/folder.ts`,
 * as Obsidian's file explorer sorts it, without hidden ones,
 * and without symbolic links, which are neither, so nothing leads out.
 *
 * @throws {Error} - When the folder lies outside `NomSkillingmodules`,
 *   is missing, or is a file
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
 * Makes a folder of a module of mine on a click on it,
 * like the folder of the material of the semester a card of its course names:
 * it and the missing folders on the way to it,
 * only inside the folder of the module, never through a symbolic link, and nothing else.
 *
 * @throws {Error} - When it lies in no folder of a module of mine,
 *   a part of it is empty or starts with `.`, like `..`,
 *   or a part on the way is no folder, like a file or a symbolic link
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
 * Makes the folder of the material of each type
 * of a module a written plan or log of it holds,
 * so folder and type always go together
 * and the link of every skill entry leads to a folder that is there,
 * see `linesWrite` in `calendar.ts`.
 * For each type with a folder of material and its semester,
 * the folder of that semester as the course names it, see {@link semesterFoldersRead}.
 * No folder renamed or removed.
 * A folder that cannot be made is left out, since writing the entry matters more.
 *
 * @returns The folders made, each its path from `NomSkillingmodules`
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
