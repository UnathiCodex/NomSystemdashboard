/**
 * ## Notes
 *
 * Reads my modules for the scripts view, read only but for a folder a click makes,
 * see {@link folderMake}, and the folder of a new module, see {@link moduleMake}:
 * every module with its chapters and notes for the menu,
 * those of the semester first, see {@link menuRead}, the modules of the semester for their tasks,
 * see `skill.ts`, a note with the files its links lead to,
 * the links of the notes of the semester that lead nowhere, single files,
 * like the images of a note, a file to send piece by piece, like a PDF,
 * and a folder with its folders and files, see {@link folderRead};
 * for the skill entries of the day,
 * every module folder with its chapters and the university's documents in it;
 * for the course of a module, the folders of its material of a semester,
 * also those not there yet, see `course.ts`.
 * Each module is a vault of its own, as in Obsidian, so a link leads to a file of the same module.
 * A note of any module can be read, also one the menu does not list,
 * like one outside the chapter folders.
 * Paths come and go with `/` from `NomSkillingmodules`,
 * like `MA0902_ReelleAnalysisInformatik/05_WichtigeFunktionstypen/Tangens.svg`.
 * Hidden files and folders, like `.obsidian`, stay out, as in Obsidian.
 * A missing folder counts as empty, like a module of the semester whose folder is not made yet,
 * or `NomSkillingmodules` itself;
 * a missing note or file is an error, and so is a missing folder to show.
 *
 * - `node:fs`: Reads files and folders on the disk, streams a file and makes a folder.
 * - `node:path`: Builds file paths, `posix` with `/` for paths inside the modules.
 * - `./sources.ts`: Names the folder of my modules for the scripts view,
 *   the overview of my modules, `Modules.md`, and the projects of the semester.
 * - `./calendar.ts`, `./categories.ts`:
 *   Give the day of today in Berlin time and its semester, for the menu.
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
import { activeProjects, modulesFolder, notes } from "./sources.ts";

import type { Dirent, ReadStream } from "node:fs";

/**
 * A note of a chapter, as the menu lists it.
 *
 * - `name`: Name of the file, like `01_01_EstimatorConfidenceInterval.md`.
 * - `path`: Path, see the top of this file.
 */
export type NoteEntry = {
    name: string;
    path: string;
};

/**
 * A chapter of a module with its notes.
 *
 * - `title`: Its name, the name of its folder as it is, like `01_RegressionAnalysis`.
 * - `notes`: Its notes, sorted as Obsidian's file explorer does.
 */
export type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/**
 * A module with its chapters.
 *
 * - `name`: Name of its folder, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `title`: Its name, the name of its folder as it is,
 *   like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `chapters`: Its chapters that hold notes, in the order of their folders.
 */
export type NotesModule = {
    name: string;
    title: string;
    chapters: Chapter[];
};

/**
 * A module as the menu of the scripts view lists it: with its chapters, see {@link NotesModule},
 * and the semester it stands under there, see {@link menuRead}.
 *
 * - `semester`: For a module of the semester the semester of today,
 *   like `2026W`, else the last I took it in, like `2026S`, empty for none.
 */
export type MenuModule = NotesModule & {
    semester: string;
};

/**
 * A note with the files its links lead to.
 *
 * - `path`: Path of the note, see the top of this file.
 * - `text`: Markdown text of the note.
 * - `links`: For each link of the note as written, like `05_06_EulerTrigonometrie` of
 *   `[[05_06_EulerTrigonometrie#05.06. Definition. Eulersche Formel|Eulersche Formel]]`
 *   or `./img/Singleton.png` of `![Singleton](./img/Singleton.png)`:
 *   path of the file it leads to, `null` when it leads nowhere.
 */
export type LinkedNote = {
    path: string;
    text: string;
    links: { [link: string]: string | null };
};

/**
 * A file with its content type, as the browser gets it.
 *
 * - `type`: Content type, like `image/svg+xml`.
 * - `content`: Bytes of the file.
 */
export type NotesFile = {
    type: string;
    content: Buffer;
};

/**
 * A file with its content type, as the browser gets it piece by piece, see {@link fileOpen}.
 *
 * - `type`: Content type, like `application/pdf`.
 * - `content`: Bytes of the file, read from the disk as they are sent.
 */
export type NotesStream = {
    type: string;
    content: ReadStream;
};

/**
 * What a folder of my modules holds, as its view shows it, see {@link folderRead}.
 *
 * - `folders`: Names of its folders, like `TUM_2025W`.
 * - `files`: Names of its files, like `04_LogisticPoissonRegression.pdf`.
 */
export type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * A link of a note that leads nowhere.
 *
 * - `note`: Path of the note, see the top of this file.
 * - `link`: The link as written,
 *   like `VO_UniversityLectureLessons/TUM_2025W/04_LogisticPoissonRegression.pdf`
 *   of `[[VO_UniversityLectureLessons/TUM_2025W/04_LogisticPoissonRegression.pdf#page=10|lecture 04 slide 10]]`.
 */
export type BrokenLink = {
    note: string;
    link: string;
};

/**
 * What a module folder holds besides its notes, for a skill entry of the day.
 *
 * - `folder`: The module folder from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, empty for a project.
 * - `chapters`: Names of its chapter folders, also of the empty ones,
 *   like `05_DecisionTreesEnsembles`, in order.
 * - `documents`: Its files outside the chapter folders, the university's material,
 *   and the notes of its chapters, by their paths from the module folder,
 *   like `VO_UniversityLectureLessons/TUM_2025W/04_….pdf`
 *   or `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`, in order.
 * - `materials`: The folder of the material of each type, see {@link materialFoldersOf}, like
 *   `VO_UniversityLectureLessons` for `VO`, none for a project.
 * - `inner`: The folders of a semester in those folders, also empty ones,
 *   by their paths from the module folder, like `VO_UniversityLectureLessons/TUM_2026W`,
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
 * The folder of the material of a type of one semester in a module, for the course of the module,
 * see {@link semesterFoldersRead}.
 *
 * - `path`: Its path from the module folder, like `VO_UniversityLectureLessons/TUM_2026W`.
 * - `exists`: Whether it is there; one that is not a click on it makes, see {@link folderMake}.
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
 * Markdown link or image, like `[Text](Note.md#Heading)` or `![Singleton](./img/Singleton.png)`:
 * its address before `#`, written plain or in `<…>`.
 */
const markdownLink: RegExp = /\]\(\s*(?:<([^>#]*)|([^\s)#]*))/g;

/**
 * Address with a scheme, like `https://…` or `mailto:…`: a link out of the vault, never resolved.
 */
const external: RegExp = /^[a-z][a-z\d+.-]*:/i;

/**
 * Content types of the files the scripts view shows or opens, and of the files skill entries link,
 * by their ending; any other file comes as bytes.
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
 * Sorts names as Obsidian's file explorer does: alphabetical, numbers by their value, case ignored.
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
 * Module folder, like `IN2028_BusinessAnalyticsMachineLearning`:
 * its code, capitals and then digits, and `_` first, so a folder like `_Inbox` is none.
 */
const moduleFolder: RegExp = /^[A-Z]+\d+_/;

/**
 * The folder of the material of each type in a module, by its type, as my modules name it:
 * a lecture's slides in `VO_UniversityLectureLessons`,
 * a central exercise's sheets in `ZU_UniversityCentralExercises`,
 * an exercise's in `UE_UniversityModuleExercises`, a tutorial's in `TU_UniversityTutorExercises`,
 * a homework's in `HU_UniversityHomeExercises`,
 * a practical course's in `PR_UniversityPracticalExercises`
 * and the exams in `FA_UniversityModuleExaminations`;
 * the name of the folder of a type in a module that has none yet, see {@link materialFoldersOf}.
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
 *
 * @param path - Path like `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis`
 * @returns Place on the disk,
 *   like `…/NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis`
 */
function placeOf(path: string): string {
    return join(notes.modules, path);
}

/**
 * Turns a path into the path on the disk, only when it stays inside `NomSkillingmodules`.
 * - {@link realpathSync}: Makes a path absolute and follows symbolic links,
 *   so no link leads outside.
 *
 * @param path - Path like `MA0902_ReelleAnalysisInformatik/05_WichtigeFunktionstypen`
 * @returns Path on the disk
 * @throws {Error} - When a part of the path starts with `.`, like `..` or `.obsidian`,
 *   when it leads outside its folder, or when nothing lies there
 */
function diskPathOf(path: string): string {
    if (path.split("/").some((part: string): boolean => part.startsWith(".")))
        throw new Error(`No hidden path and no way up: ${path}`);

    const root: string = realpathSync(notes.modules);
    const file: string = realpathSync(placeOf(path));
    if (file !== root && !file.startsWith(`${root}${sep}`))
        throw new Error(`No reading outside the modules: ${path}`);
    return file;
}

/**
 * Gives the module of a path, the vault its links stay in.
 *
 * @param path - Path like `MA0902_ReelleAnalysisInformatik/05_WichtigeFunktionstypen/05_07_TrigonometrischeFunktionen.md`
 * @returns Path of its module, like `MA0902_ReelleAnalysisInformatik`
 */
function moduleOf(path: string): string {
    return path.split("/")[0];
}

/**
 * Gives the module code of a module folder, the part of its name before `_`.
 *
 * @param name - Folder name, like `IN2028_BusinessAnalyticsMachineLearning`
 * @returns Code, like `IN2028`
 */
export function codeOf(name: string): string {
    return name.split("_")[0];
}

/**
 * Reads the entries of a folder without hidden ones, as Obsidian lists a vault;
 * a missing folder counts as empty.
 *
 * @param folder - Path of the folder, like `MA0902_ReelleAnalysisInformatik`
 * @returns Entries of the folder, none for a missing folder
 */
function entriesRead(folder: string): Dirent[] {
    if (!existsSync(placeOf(folder))) return [];
    return readdirSync(diskPathOf(folder), { withFileTypes: true }).filter(
        (entry: Dirent): boolean => !entry.name.startsWith("."),
    );
}

/**
 * Lists every file below a folder, without hidden files and folders, as Obsidian lists a vault.
 *
 * @param folder - Path of the folder, like `MA0902_ReelleAnalysisInformatik`
 * @returns Paths of the files
 */
function filesRead(folder: string): string[] {
    return entriesRead(folder).flatMap((entry: Dirent): string[] => {
        const path: string = posix.join(folder, entry.name);
        return entry.isDirectory() ? filesRead(path) : [path];
    });
}

/**
 * Lists the files the links of a note may lead to, the files of its module, by their paths in it,
 * each with its path, see the top of this file.
 *
 * @param module - Path of the module of the note, like `IN2028_BusinessAnalyticsMachineLearning`
 * @returns Path of each file,
 *   like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2025W/…`,
 *   by its path in the module, like `VO_UniversityLectureLessons/TUM_2025W/…`
 */
function vaultFilesRead(module: string): Map<string, string> {
    return new Map(
        filesRead(module).map((file: string): [string, string] => [
            file.slice(module.length + 1),
            file,
        ]),
    );
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
 * @param link - Link as Obsidian reads it, like `03_05_AbsoluteKonvergenz` or `./img/Singleton.png`
 * @param note - Path of the note in its module,
 *   like `05_WichtigeFunktionstypen/05_07_TrigonometrischeFunktionen.md`
 * @param files - Paths of all files in the module
 * @returns Path of the file in the module, or `null` when the link leads nowhere
 */
function linkResolve(link: string, note: string, files: string[]): string | null {
    if (link === "") return note;

    const named: (path: string) => string[] = (path: string): string[] =>
        files.filter(
            (file: string): boolean => posix.basename(file).toLowerCase() === posix.basename(path),
        );
    let path: string = link.toLowerCase();
    let candidates: string[] = posix.basename(path).includes(".") ? named(path) : [];
    if (candidates.length === 0) {
        path = `${link}.md`.toLowerCase();
        candidates = named(path);
    }
    if (candidates.length === 0) return null;
    if (!path.includes("/") && candidates.length === 1) return candidates[0];

    const folder: string = note.includes("/")
        ? note.slice(0, note.lastIndexOf("/")).toLowerCase()
        : "";
    const exact: string =
        path.startsWith("./") || path.startsWith("../")
            ? posix.join(folder, path)
            : path.replace(/^\//, "");
    const found: string | undefined = candidates.find(
        (file: string): boolean => file.toLowerCase() === exact,
    );
    if (found !== undefined) return found;
    if (link.startsWith("/")) return null;

    const endings: string[] = candidates
        .filter((file: string): boolean => file.toLowerCase().endsWith(path))
        .sort((first: string, second: string): number => first.length - second.length);
    const nearby: string | undefined = endings.find((file: string): boolean =>
        file.toLowerCase().startsWith(folder),
    );
    if (nearby !== undefined) return nearby;
    if (endings.length > 0) return endings[0];
    return null;
}

/**
 * Reads a link as Obsidian does: with `%20` and the like decoded,
 * as written when it cannot be decoded.
 *
 * @param link - Link as written, like `Note%20One.md`
 * @returns Decoded link, like `Note One.md`
 */
function linkDecode(link: string): string {
    try {
        return decodeURIComponent(link);
    } catch {
        return link;
    }
}

/**
 * Cuts a row of a table into its cells,
 * without the empty texts before its first `|` and after its last, each without spaces at its ends.
 *
 * @param line - Row like `| [IN2028](…) | [BusinessAnalyticsMachineLearning](…) | … | 2026W | … |`
 * @returns Its cells
 */
function cellsOf(line: string): string[] {
    return line
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Reads the chapters of a module with their notes: its chapter folders,
 * like `01_RegressionAnalysis`, each with its notes, the `.md` files right in it.
 * Chapters without notes stay out, and so do the other folders,
 * like `FA_UniversityModuleExaminations` with the university's material,
 * and the other files, like images.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @returns Chapters in the order of their folders, none for a missing folder
 */
function chaptersRead(module: string): Chapter[] {
    return entriesRead(module)
        .filter(
            (chapter: Dirent): boolean => chapter.isDirectory() && chapterFolder.test(chapter.name),
        )
        .map((chapter: Dirent): Chapter => ({
            title: chapter.name,
            notes: entriesRead(`${module}/${chapter.name}`)
                .filter(
                    (note: Dirent): boolean =>
                        !note.isDirectory() && note.name.toLowerCase().endsWith(".md"),
                )
                .map((note: Dirent): NoteEntry => ({
                    name: note.name,
                    path: `${module}/${chapter.name}/${note.name}`,
                }))
                .sort((first: NoteEntry, second: NoteEntry): number =>
                    collator.compare(first.name, second.name),
                ),
        }))
        .sort((first: Chapter, second: Chapter): number =>
            collator.compare(first.title, second.title),
        )
        .filter((chapter: Chapter): boolean => chapter.notes.length > 0);
}

/**
 * Reads the modules of the semester,
 * see {@link activeModulesRead}, each with its chapters and their notes,
 * see {@link chaptersRead}, for their tasks, see `skill.ts`, and the links that lead nowhere,
 * see {@link brokenLinksRead}.
 *
 * @returns Modules in the order of the list, a module whose folder is missing without chapters
 */
export function modulesRead(): NotesModule[] {
    return activeModulesRead().map((module: string): NotesModule => ({
        name: module,
        title: module,
        chapters: chaptersRead(module),
    }));
}

/**
 * Lists every module folder in `NomSkillingmodules`,
 * like `IN0024_OperationsResearch`, also of the modules that are not of the semester,
 * as Obsidian's file explorer sorts them.
 *
 * @returns Names of the module folders
 */
export function moduleFoldersRead(): string[] {
    return entriesRead("")
        .filter((entry: Dirent): boolean => entry.isDirectory() && moduleFolder.test(entry.name))
        .map((entry: Dirent): string => entry.name)
        .sort(collator.compare);
}

/**
 * Reads the semester of each module from the overview of my modules,
 * `Modules.md`, see {@link notes}:
 * of each row the folder its column `Nom` links, the last part of the link,
 * like `IN2028_BusinessAnalyticsMachineLearning`
 * of `[BusinessAnalyticsMachineLearning](../../NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning)`,
 * and the semester its column `Semester` names,
 * the newest one I seriously took it in, graded or not, like `2026S`, the newest of several;
 * its column `Registered`, every semester I was registered in, stays unread.
 * Each column found by its name in the head of the table, so the columns may move.
 * A row without such a link or without a semester stays out.
 * - `rows`: The rows of the table, the head first, each cut into its cells.
 * - `head`: Names of the columns.
 * - `folder`: The folder a row links, `undefined` for none.
 * - `last`: The newest semester of a row, `undefined` for none.
 *
 * @returns The semester of each module, like `2026S`, by its folder, in the order of the rows,
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
            const last: string | undefined = cells[head.indexOf("Semester")]
                ?.match(/\d{4}[WS]/g)
                ?.sort(collator.compare)
                .at(-1);
            return folder === undefined || last === undefined ? [] : [[linkDecode(folder), last]];
        }),
    );
}

/**
 * Reads the modules of the semester, by their folders in `NomSkillingmodules`, like
 * `IN2028_BusinessAnalyticsMachineLearning`:
 * those whose column `Semester` in `Modules.md` names the semester of today in Berlin time,
 * see {@link semestersRead} and `semesterOf` in `categories.ts`,
 * also one whose folder is missing yet, in the order of the rows;
 * read anew each time, so a changed `Modules.md` changes them at once.
 * Only these have tasks, see `skill.ts`,
 * and the menu of the scripts view shows them first, in this order,
 * under the semester of today, see {@link menuRead}.
 * - `today`: The semester of today, like `2026W`.
 *
 * @returns Names of their folders, none while `Modules.md` does not exist
 */
export function activeModulesRead(): string[] {
    const today: string = semesterOf(berlinDateOf(new Date()));
    return [...semestersRead()]
        .filter(([, semester]: [string, string]): boolean => semester === today)
        .map(([module]: [string, string]): string => module);
}

/**
 * Reads the skills of the semester of this reader,
 * each by its folder from `NomWorkspace`, written with `/`:
 * the modules of the semester first, see {@link activeModulesRead}, like
 * `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, then its projects,
 * see `activeProjects` in `sources.ts`.
 * The Skill picker offers them first, in this order, a module by its code,
 * the part of its folder name before `_`, like `IN2028`, a project by its folder name,
 * like `WokFlow`; the menu of the scripts view shows the modules first, and no project,
 * since a project has no chapters and no tasks.
 * Each skill entry names the folder of its skill in its `SUMMARY` and links it by this path,
 * for a type on into the folder of its material, see `skillLinkOf` in `documents.ts`.
 * A link in a note still opens a note of any module.
 *
 * @returns Folders of the skills
 */
export function activeSkillsRead(): string[] {
    return [
        ...activeModulesRead().map((module: string): string => `${modulesFolder}/${module}`),
        ...activeProjects,
    ];
}

/**
 * Reads every module for the menu of the scripts view, each with its chapters and their notes, see
 * {@link chaptersRead}, and the semester it stands under, see {@link MenuModule}:
 * the modules of the semester, see {@link activeModulesRead}, also one whose folder is missing yet,
 * then every other module folder, see {@link moduleFoldersRead}, each with its semester,
 * see {@link semestersRead}.
 * In the order of the menu:
 * the modules under the semester of today first, in the order of their list,
 * then those of the other semesters, the newest first,
 * then those without a semester, each group else in the order of its folders,
 * as Obsidian's file explorer sorts them, since a sort keeps the order of what it ranks the same.
 * - `today`: The semester of today in Berlin time, like `2026W`,
 *   see `semesterOf` in `categories.ts`.
 * - `taken`: The semester of each module, by its folder.
 *
 * @returns Modules in the order of the menu
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
 * Lists the folders of the material of a module of one semester, by the type of their material,
 * for the course of the module, see `course.ts`: in each folder of material,
 * like `VO_UniversityLectureLessons`, the folder of the semester,
 * like `TUM_2026W`, also while it holds nothing yet;
 * of two of one type, like `LMU_2026W` beside `TUM_2026W`, the first by name,
 * as the tree lists them; for every other type of {@link materialFolders} the folder a click
 * on it makes, see {@link folderMake}: `TUM_` and the semester,
 * like `TUM_2026W`, in the folder of the material of the type, see {@link materialFoldersOf}.
 * - `materials`: Names of the folders of material of the module, in order.
 * - `folders`: The folders found so far, by type.
 * - `type`: The type of a folder of material, like `VO` of `VO_UniversityLectureLessons`.
 * - `inner`: The folder of the semester in it, `undefined` for none.
 * - `material`: The folder of the material of a type without a folder of the semester.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param semester - Semester, like `2026W`
 * @returns Folders by type, each its path from the module folder,
 *   like `VO_UniversityLectureLessons/TUM_2026W` for `VO`, and whether it is there
 */
export function semesterFoldersRead(
    module: string,
    semester: string,
): { [type: string]: MaterialFolder } {
    const materials: string[] = entriesRead(module)
        .filter(
            (material: Dirent): boolean =>
                material.isDirectory() && /^[A-Z]{2}_/.test(material.name),
        )
        .map((material: Dirent): string => material.name)
        .sort(collator.compare);
    const folders: { [type: string]: MaterialFolder } = {};
    materials.forEach((material: string): void => {
        const type: string = material.slice(0, 2);
        const inner: string | undefined = entriesRead(`${module}/${material}`)
            .filter(
                (folder: Dirent): boolean =>
                    folder.isDirectory() && /\d{4}[WS]/.exec(folder.name)?.[0] === semester,
            )
            .map((folder: Dirent): string => folder.name)
            .sort(collator.compare)[0];
        if (inner !== undefined && folders[type] === undefined)
            folders[type] = { path: `${material}/${inner}`, exists: true };
    });
    Object.entries(materialFoldersOf(module)).forEach(
        ([type, material]: [string, string]): void => {
            folders[type] ??= { path: `${material}/TUM_${semester}`, exists: false };
        },
    );
    return folders;
}

/**
 * Gives the folder of the material of each type in a module, by its type:
 * the folder starting with the type and `_` as the module names it, the first by name,
 * else as my modules name it, see {@link materialFolders},
 * so a skill entry of a type links the folder of its material also while the module has none yet,
 * see `skillLinkOf` in `documents.ts`.
 * - `materials`: Names of the folders of material of the module, in order.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @returns Folders by type, like `VO_UniversityLectureLessons` for `VO`
 */
export function materialFoldersOf(module: string): { [type: string]: string } {
    const materials: string[] = entriesRead(module)
        .filter(
            (material: Dirent): boolean =>
                material.isDirectory() && /^[A-Z]{2}_/.test(material.name),
        )
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
 * Finds the folder of a module in `NomSkillingmodules` by its code.
 *
 * @param code - Module code, like `IN2028`
 * @returns Name of its folder,
 *   like `IN2028_BusinessAnalyticsMachineLearning`, `undefined` when no folder has the code
 */
export function moduleFolderOf(code: string): string | undefined {
    return moduleFoldersRead().find((name: string): boolean => codeOf(name) === code);
}

/**
 * Reads what a module folder holds for a skill entry, see {@link ModuleContents}:
 * the chapter folders of the module, and as documents every file of the module outside them,
 * like the lecture's slides, and the notes of its chapters,
 * like `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`, but not their images.
 * - `chapters`: Names of the chapter folders, in order.
 * - `notes`: Paths of the notes of every chapter from the module folder.
 * - `material`: Paths of the files of the module outside its chapter folders.
 * - `inner`: Paths of the folders of a semester in the folders
 *   of its material, like `VO_…/TUM_2026W`.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @returns Chapters and documents of the module, none for a missing folder
 */
export function moduleContentsRead(module: string): ModuleContents {
    const chapters: string[] = entriesRead(module)
        .filter((entry: Dirent): boolean => entry.isDirectory() && chapterFolder.test(entry.name))
        .map((entry: Dirent): string => entry.name)
        .sort(collator.compare);
    const notes: string[] = chapters.flatMap((chapter: string): string[] =>
        entriesRead(`${module}/${chapter}`)
            .filter(
                (note: Dirent): boolean =>
                    !note.isDirectory() && note.name.toLowerCase().endsWith(".md"),
            )
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
    const inner: string[] = Object.values(materialFoldersOf(module)).flatMap(
        (folder: string): string[] =>
            entriesRead(`${module}/${folder}`)
                .filter(
                    (entry: Dirent): boolean => entry.isDirectory() && /\d{4}[WS]/.test(entry.name),
                )
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
 *
 * @param path - Path of the folder of a chapter from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/02_LogisticPoissonRegression`
 * @returns Name like `02_LogisticPoissonRegression`
 */
export function chapterNameOf(path: string): string {
    return path.split("/").at(-1) ?? "";
}

/**
 * Finds the files the wiki links, embeds,
 * Markdown links and images of a note lead to, see {@link linkResolve}.
 * - `note`: Path of the note in its module.
 * - `inModule`: Paths in the module of the files the links may lead to.
 * - `links`: Links of the note as written, without links out of the vault, like `https://…`.
 *
 * @param text - Text of the note
 * @param path - Path of the note
 * @param files - Files the links of the note may lead to, see {@link vaultFilesRead}
 * @returns For each link as written, path of the file it leads to, `null` when it leads nowhere
 */
function linksOf(
    text: string,
    path: string,
    files: Map<string, string>,
): { [link: string]: string | null } {
    const note: string = path.slice(moduleOf(path).length + 1);
    const inModule: string[] = [...files.keys()];
    const links: string[] = [
        ...[...text.matchAll(wikiLink)].map((match: RegExpExecArray): string => match[1].trim()),
        ...[...text.matchAll(markdownLink)].map(
            (match: RegExpExecArray): string => match[1] ?? match[2],
        ),
    ].filter((link: string): boolean => !external.test(link));

    return Object.fromEntries(
        links.map((link: string): [string, string | null] => {
            const found: string | null = linkResolve(linkDecode(link), note, inModule);
            return [link, found === null ? null : (files.get(found) ?? null)];
        }),
    );
}

/**
 * Reads a note with the files its wiki links, embeds,
 * Markdown links and images lead to, see {@link linksOf}:
 * within its module, see {@link vaultFilesRead}.
 * Lists the files of its module once,
 * which takes up to a few hundred milliseconds in a module with code.
 *
 * @param path - Path of the note, like
 *   `MA0902_ReelleAnalysisInformatik/05_WichtigeFunktionstypen/05_07_TrigonometrischeFunktionen.md`
 * @returns Note with its links
 * @throws {Error} - When the note lies outside `NomSkillingmodules`, or is missing
 */
export function linkedNoteRead(path: string): LinkedNote {
    const text: string = readFileSync(diskPathOf(path), "utf8");
    return { path: path, text: text, links: linksOf(text, path, vaultFilesRead(moduleOf(path))) };
}

/**
 * Reads the links that lead nowhere in the notes of the semester, the chapter notes of the modules
 * of the semester, see {@link modulesRead}, each link once per note,
 * like a link to a slide whose file was renamed.
 * Lists the files of each module once.
 * - `vaults`: Files the links may lead to, by the path of the module of a note, as listed so far.
 * - `root`: Path of the module of a note, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `files`: Files the links of the note may lead to.
 *
 * @returns Links that lead nowhere, by the order of the modules of the semester
 * @throws {Error} - When a folder or note cannot be read
 */
export function brokenLinksRead(): BrokenLink[] {
    const vaults: Map<string, Map<string, string>> = new Map();
    return modulesRead()
        .flatMap((module: NotesModule): NoteEntry[] =>
            module.chapters.flatMap((chapter: Chapter): NoteEntry[] => chapter.notes),
        )
        .flatMap((note: NoteEntry): BrokenLink[] => {
            const root: string = moduleOf(note.path);
            const files: Map<string, string> = vaults.get(root) ?? vaultFilesRead(root);
            vaults.set(root, files);
            return Object.entries(
                linksOf(readFileSync(diskPathOf(note.path), "utf8"), note.path, files),
            )
                .filter(([, file]: [string, string | null]): boolean => file === null)
                .map(([link]: [string, string | null]): BrokenLink => ({
                    note: note.path,
                    link: link,
                }));
        });
}

/**
 * Gives the content type of a file by its ending, see {@link types}.
 *
 * @param file - Path of the file, like `…/04_LogisticPoissonRegression.pdf`
 * @returns Content type, like `application/pdf`, `application/octet-stream` for any other ending
 */
export function contentTypeOf(file: string): string {
    return types[extname(file).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Reads a file of my modules with its content type, like an image of a note or a PDF to open.
 *
 * @param path - Path like `MA0902_ReelleAnalysisInformatik/05_WichtigeFunktionstypen/Tangens.svg`
 * @returns File with its content type
 * @throws {Error} - When the file lies outside `NomSkillingmodules`, or is missing
 */
export function fileRead(path: string): NotesFile {
    const file: string = diskPathOf(path);
    return { type: contentTypeOf(file), content: readFileSync(file) };
}

/**
 * Opens a file of my modules with its content type to send it piece by piece as it is read,
 * like a PDF of its folder, see {@link folderRead}, so a large file,
 * like a book as PDF, never lies in the reader's memory whole; read only.
 *
 * @param path - Path like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2025W/01_….pdf`
 * @returns File with its content type, opened to be read
 * @throws {Error} - When the file lies outside `NomSkillingmodules`, is missing, or is a folder
 */
export function fileOpen(path: string): NotesStream {
    const file: string = diskPathOf(path);
    if (!statSync(file).isFile()) throw new Error(`No file: ${path}`);
    return { type: contentTypeOf(file), content: createReadStream(file) };
}

/**
 * Lists a folder of my modules for its view, see `src/editor/folder.ts`:
 * its folders and its files, each by name as Obsidian's file explorer sorts them,
 * without hidden ones, as in Obsidian, and without symbolic links,
 * which are neither, so nothing leads out.
 * - `entries`: What it holds but the hidden.
 *
 * @param path - Path of the folder,
 *   like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons`
 * @returns Its folders and files
 * @throws {Error} - When the folder lies outside `NomSkillingmodules`, is missing, or is a file
 */
export function folderRead(path: string): NotesFolder {
    const entries: Dirent[] = readdirSync(diskPathOf(path), { withFileTypes: true }).filter(
        (entry: Dirent): boolean => !entry.name.startsWith("."),
    );
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
 * like the folder of the material of a type of the semester a card of its course names,
 * see {@link semesterFoldersRead}:
 * it and the folders on the way to it that are missing, one after another,
 * only inside the folder of the module, never through a symbolic link, and nothing else;
 * nothing for a folder that is there.
 * - `parts`: Its folders from `NomSkillingmodules` on, the module first.
 * - `folder`: A folder on the way, on the disk.
 *
 * @param path - Path of the folder,
 *   like `IN2028_BusinessAnalyticsMachineLearning/TU_UniversityTutorExercises/TUM_2026W`
 * @throws {Error} - When it lies in no folder of a module of mine,
 *   a part of it is empty or starts with `.`, like `..`, or a part on the way is no folder,
 *   like a file or a symbolic link
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
 * Makes the folder of the material of each type of a module a written plan or log of it holds,
 * so folder and type always go together
 * and the link of every skill entry leads to a folder that is there,
 * see `linesWrite` in `calendar.ts`:
 * for each of its entries and boxes of a type with a folder of material,
 * like `TU` with its semester,
 * like `2026W`, the folder of that semester in it as the course names it,
 * see {@link semesterFoldersRead},
 * like `TU_UniversityTutorExercises/TUM_2026W`, made while it is not there, see {@link folderMake};
 * nothing else, no folder renamed or removed.
 * A folder that cannot be made is left out, since writing the entry matters more.
 * - `made`: The folders made, each its path from `NomSkillingmodules`.
 * - `folder`: The folder of the type of that semester,
 *   `undefined` for a type without folder of material.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param kinds - The type and semester of each entry, like `TU` and `2026W`
 * @returns The folders made,
 *   like `IN2028_BusinessAnalyticsMachineLearning/TU_UniversityTutorExercises/TUM_2026W`
 */
export function typeFoldersMake(module: string, kinds: [string, string][]): string[] {
    const made: string[] = [];
    new Set(
        kinds.map(([type, semester]: [string, string]): string => `${type} ${semester}`),
    ).forEach((kind: string): void => {
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
    });
    return made;
}

writtenFollow((module: string, kinds: [string, string][]): void => {
    typeFoldersMake(module, kinds);
});

/**
 * Makes the empty folder of a new module in `NomSkillingmodules`,
 * picked new in the Skill list of an entry,
 * see `moduleFolderNameOf` in `src/day/skill.ts`, named as my module folders are:
 * its code, two to four capitals and then three to six digits, `_`,
 * and its name in CamelCase of letters and digits, like `IN2346_DeepLearning`;
 * nothing else, no row of `Modules.md` and no note.
 *
 * @param folder - Name of the folder, like `IN2346_DeepLearning`
 * @throws {Error} - When the name is not named so, or a module folder has its code already
 */
export function moduleMake(folder: string): void {
    if (!/^[A-Z]{2,4}\d{3,6}_[A-Z][A-Za-z\d]*$/.test(folder))
        throw new Error(`No name of a module folder: ${folder}`);
    if (moduleFolderOf(codeOf(folder)) !== undefined)
        throw new Error(`A folder of the module is there already: ${folder}`);
    mkdirSync(join(diskPathOf(""), folder));
}
