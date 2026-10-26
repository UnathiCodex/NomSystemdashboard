/**
 * ## Documents
 *
 * Names a skill entry and links it to the folder of its skill and to the documents it used,
 * like the slides of a lecture, a sheet or the notes of a chapter, its paths from `NomWorkspace`;
 * each link only points to more, the entry states its facts itself, see `calendar.ts`,
 * like the chapters of my system it belongs to, one `X-CHAPTER` each,
 * like `X-CHAPTER:02_LogisticPoissonRegression`.
 * Its `SUMMARY` names its skill and its type: the name of the folder of its skill
 * with its type in round brackets at the end when it has one, see {@link skillTitleOf},
 * read by `skillPartsOf` in `calendar.ts`;
 * its `ALTREP` a link I set, by default the folder of the skill,
 * for a module with a type on into the folder of the material of its type
 * and of its semester, see {@link skillLinkOf},
 * like `SUMMARY;ALTREP="NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons/TUM_2026W":IN2028_BusinessAnalyticsMachineLearning (VO)`,
 * my own learning, without type, the module folder, a project its folder,
 * like `SUMMARY;ALTREP="NomProgramprojects/AsiaWok_Wokflow_2026":AsiaWok_Wokflow_2026`.
 * Every real document a skill entry used is one `ATTACH` holding just its path,
 * see `Link` in `calendar.ts`, as many as it used, in the same form for every kind:
 * a lecture its slides, like
 * `ATTACH;X-SHA256=9f86d081…:NomSkillingmodules/IN2028_…/VO_…/TUM_2026W/04_LogisticRegression.pdf`,
 * an exercise or a tutorial its sheet in `TU_UniversityTutorExercises`, a homework its sheet
 * in `HU_UniversityHomeExercises`, and my own learning the notes of its chapters, like
 * `ATTACH:NomSkillingmodules/IN2028_…/01_…/01_01_SampleMeanStandardError.md`.
 * The name of the file says what it is and its `X-CHAPTER`s what the session was about,
 * so a document has no name of my own;
 * a file of the university keeps the fingerprint of its content, the SHA-256 of its bytes,
 * as parameter, so the link survives a rename;
 * a note has none, since I change my notes too often, and is found by its name,
 * see {@link linksRepairOf}; a note an older entry links with its fingerprint keeps it.
 * An older `X-TOPIC` beside the path is no more read, and goes once the entry changes.
 * The folder of a chapter is no `ATTACH`: an older entry that links one names that chapter,
 * which is still read, see {@link chaptersOf}, and becomes its `X-CHAPTER` once the entry changes;
 * its `DESCRIPTION` is only my free note.
 * The folder of a module in an `ATTACH` of an older entry counts no more and goes
 * once the entry changes too.
 * The reader checks every link of the whole log when it starts and every night at 04:00,
 * see {@link linksCheckStart}:
 * a module folder that is gone,
 * like after a rename, is found again by the code of the entry's module,
 * see `moduleFolderOf` in `notes.ts`, see {@link folderRepair};
 * a document whose path no longer leads to a file,
 * like after a rename or a move into another folder of the module,
 * is looked for by its fingerprint among the module's documents,
 * a note without fingerprint by its name,
 * like one an older entry links among my drafts in `.claude`, once it lies in the module folder,
 * and a chapter by the name of its folder in the module folder found.
 * Each repair goes into the entry, every other line of the file as it is,
 * and into the reader's console, with the old and the new path.
 * A link it cannot repair stays as written, like a document deleted or the folder of a project,
 * which has no code to find it by.
 * Fingerprints are kept by path, size and time of change,
 * so only new or changed files are read again.
 * The reader sends a file a skill entry links, read only,
 * so the page opens it in the browser's own viewer, see {@link linkedFileRead};
 * no other file of `NomWorkspace`.
 * By the folder of its skill a skill entry also finds its log and a skill box its plan,
 * any other entry or box the log or the plan of its topic and year, see {@link calendarFileOf}.
 *
 * - `node:fs`: Reads files and their sizes and times of change.
 * - `node:path`: Builds file paths for the operating system.
 * - `node:crypto`: Computes the SHA-256 of a file.
 * - `./calendar.ts`: Reads the log, finds an entry's event,
 *   puts new values into it or changes its fields, writes its start and the days in Berlin time,
 *   and names the category of skill entries.
 * - `./notes.ts`: Finds the folder of a module by its code and of a chapter by its name,
 *   lists the documents of a module, names a folder to read, gives the content type of a file,
 *   and reads the modules of the semester.
 * - `./sources.ts`: Names `NomWorkspace`, the folder of my modules, the projects of the semester
 *   and the skill log, and builds the paths of the files of plan and log of a year and of a skill.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import {
    berlinDateOf,
    berlinInstantOf,
    berlinTimeOf,
    dayAdd,
    entriesRead,
    entryChange,
    entryFind,
    propertiesPut,
    skillName,
} from "./calendar.ts";
import {
    activeModulesRead,
    chapterNameOf,
    codeOf,
    contentTypeOf,
    moduleContentsRead,
    moduleFolderOf,
    semesterFoldersRead,
} from "./notes.ts";
import {
    moduleIs,
    modulesFolder,
    projectOf,
    skillFileOf,
    skillLog,
    vault,
    livingFileOf,
} from "./sources.ts";

import type { Stats } from "node:fs";
import type { Entry, EntryFields, Link } from "./calendar.ts";
import type { MaterialFolder, ModuleContents, NotesFile } from "./notes.ts";

/**
 * A fingerprint as computed, with what tells whether its file changed since.
 *
 * - `size`: Size of the file in bytes.
 * - `modified`: Time of the last change of the file in milliseconds.
 * - `fingerprint`: SHA-256 of the file's bytes, as 64 hexadecimal digits.
 */
type Fingerprint = {
    size: number;
    modified: number;
    fingerprint: string;
};

/**
 * Fingerprints computed so far, by the path of their file on the disk.
 */
const fingerprints: Map<string, Fingerprint> = new Map();

/**
 * Hour of the night the reader checks every link again, in Berlin time.
 */
const checkHour: number = 4;

/**
 * A year in milliseconds: the whole log is read up to a year after now.
 */
const yearLength: number = 366 * 24 * 60 * 60 * 1000;

/**
 * Reads the entries of the whole skill log, up to a year after now.
 *
 * @returns Entries of the log
 */
function logRead(): Entry[] {
    return entriesRead(
        skillLog,
        "1970-01-01T00:00:00Z",
        new Date(Date.now() + yearLength).toISOString(),
    );
}

/**
 * Builds the path on the disk of a path from `NomWorkspace`.
 *
 * @param path - Path parted by `/`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`
 * @returns Path on the disk
 */
function diskOf(path: string): string {
    return join(vault, ...path.split("/"));
}

/**
 * Gives the fingerprint of a file, the SHA-256 of its bytes,
 * computed again only when the file changed.
 * - `stats`: Size and time of change of the file now.
 * - `known`: Fingerprint computed before, `undefined` for a file not seen yet.
 * - `fingerprint`: Fingerprint computed now.
 * - {@link createHash}: Computes a hash of bytes, here SHA-256, written as hexadecimal digits.
 *
 * @param file - Path of the file on the disk
 * @returns Fingerprint as 64 hexadecimal digits
 * @throws {Error} - When the file cannot be read
 */
function fingerprintOf(file: string): string {
    const stats: Stats = statSync(file);
    const known: Fingerprint | undefined = fingerprints.get(file);
    if (known?.size === stats.size && known.modified === stats.mtimeMs) return known.fingerprint;

    const fingerprint: string = createHash("sha256").update(readFileSync(file)).digest("hex");
    fingerprints.set(file, { size: stats.size, modified: stats.mtimeMs, fingerprint: fingerprint });
    return fingerprint;
}

/**
 * Gives the folder of a skill by its name, as a path from `NomWorkspace`:
 * a project of the semester by its folder name, a module by its code,
 * its folder in `NomSkillingmodules`, or a module of the semester whose folder is missing yet.
 * - `module`: Name of the module folder, `undefined` for none.
 *
 * @param code - Name of the skill, like `IN2028` or `WokFlow`
 * @returns Path like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`,
 *   `undefined` for no skill of the name
 */
export function skillFolderOf(code: string): string | undefined {
    const module: string | undefined =
        moduleFolderOf(code) ??
        activeModulesRead().find((name: string): boolean => codeOf(name) === code);
    return projectOf(code) ?? (module === undefined ? undefined : `${modulesFolder}/${module}`);
}

/**
 * Gives the name of the folder of a skill, the last part of its path from `NomWorkspace`,
 * see {@link skillFolderOf};
 * a skill without folder by its name alone.
 *
 * @param code - Name of the skill, like `IN2028` or `WokFlow`, empty for none
 * @returns Name like `IN2028_BusinessAnalyticsMachineLearning` or `WokFlow`, empty for no skill
 */
function skillFolderNameOf(code: string): string {
    return skillFolderOf(code)?.split("/").at(-1) ?? code;
}

/**
 * Gives the title a skill entry has while I type none, its `SUMMARY`, see the top of this file:
 * the name of the folder of its skill, with its type in round brackets when it has one;
 * a skill without folder by its name alone;
 * an entry without skill by its type in brackets alone, like `(VO)`, or not at all.
 * - `name`: Name of the folder of the skill, see {@link skillFolderNameOf}.
 *
 * @param code - Name of the skill, like `IN2028` or `WokFlow`
 * @param type - Its type, like `VO`, empty for none, like my own learning
 * @returns What it is, like `IN2028_BusinessAnalyticsMachineLearning (VO)`,
 *   `IN2028_BusinessAnalyticsMachineLearning` or `WokFlow`, empty for neither skill nor type
 */
export function skillTitleOf(code: string, type: string): string {
    const name: string = skillFolderNameOf(code);
    if (type === "") return name;
    return name === "" ? `(${type})` : `${name} (${type})`;
}

/**
 * Gives the link of a skill entry, the `ALTREP` of its `SUMMARY`,
 * which names its skill and its type, see `skillPartsOf` in `calendar.ts`: the folder of its skill,
 * see {@link skillFolderOf},
 * for a module with a type on into the folder of the material of that type,
 * also while the module has none yet, see `materialFoldersOf` in `notes.ts`,
 * and in it into the folder of the semester of the entry while it is there, also empty,
 * see `semesterFoldersRead` in `notes.ts`, else as far as the module holds files there,
 * see `moduleContentsRead` in `notes.ts`,
 * like `NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons/TUM_2026W` for a lecture
 * of `2026W`, or `NomSkillingmodules/MGT1372_…/VO_UniversityLectureLessons`
 * while that module has no folder of `2026W` there;
 * a project its folder alone, without type;
 * the same link the dialog shows below the skill, see `skillPathOf` in `src/day/skill.ts`.
 * - `folder`: Folder of the skill, empty for none.
 * - `contents`: What the module folder holds.
 * - `material`: Folder of the material of the type, like `VO_UniversityLectureLessons`.
 * - `inSemester`: Path of a file in the folder of the semester there,
 *   parted by `/`, `undefined` for none.
 *
 * @param code - Name of the skill, like `IN2028` or `WokFlow`
 * @param type - Its type, like `VO`, empty for none, like my own learning
 * @param semester - Its semester, like `2026W`, empty for none
 * @returns Path like `NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons/TUM_2026W`
 *   or `NomProgramprojects/…/WokFlow`, empty for no skill
 */
export function skillLinkOf(code: string, type: string, semester: string): string {
    const folder: string = skillFolderOf(code) ?? "";
    if (type === "" || !moduleIs(folder)) return folder;
    const inner: MaterialFolder | undefined =
        semester === ""
            ? undefined
            : semesterFoldersRead(folder.slice(modulesFolder.length + 1), semester)[type];
    if (inner?.exists === true) return `${folder}/${inner.path}`;
    const contents: ModuleContents = moduleContentsRead(folder.slice(modulesFolder.length + 1));
    const material: string = contents.materials[type];
    const inSemester: string[] | undefined = contents.documents
        .map((path: string): string[] => path.split("/"))
        .find(
            (parts: string[]): boolean =>
                semester !== "" &&
                parts.length > 2 &&
                parts[0] === material &&
                /\d{4}[WS]/.exec(parts[1])?.[0] === semester,
        );
    return [folder, material, ...(inSemester?.slice(1, 2) ?? [])].join("/");
}

/**
 * Gives what an entry or a box was as it is written, its `SUMMARY` and the `ALTREP` of it:
 * its what as sent, a skill entry the one its skill and type give it, see {@link skillTitleOf},
 * which names both, see `skillPartsOf` in `calendar.ts`;
 * its link as I type it, on one line, a web address, like the page of an event,
 * or a path from `NomWorkspace` on, like `NomManageplannings`, whatever it is,
 * only a valid one opening on a click;
 * a sender that knows none, like the calendar after a drag, keeps the one it comes from
 * while it is the same what;
 * a skill entry without one links the folder of its skill and of its material,
 * see {@link skillLinkOf}.
 * - `title`: Its `SUMMARY`.
 * - `link`: Its link as typed or kept, empty for none.
 *
 * @param fields - Category, what, skill, type, semester and link of the entry or the box,
 *   as sent, the semester as it is written, see `semesterFor` in `categories.ts`
 * @param from - The entry or box it comes from,
 *   like the entry being changed or the box a log entry is logged from, `null` for none
 * @returns `SUMMARY` and `ALTREP`, like `IN2028_BusinessAnalyticsMachineLearning (VO)`
 *   and `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`,
 *   or `Planungen` and an empty link
 */
export function titleOf(
    fields: {
        category: string;
        title: string;
        module: string;
        type: string;
        semester: string;
        titleLink?: string;
    },
    from: { title: string; titleLink: string } | null,
): [string, string] {
    const title: string =
        fields.category === skillName ? skillTitleOf(fields.module, fields.type) : fields.title;
    const link: string = (
        fields.titleLink ?? (from !== null && from.title === title ? from.titleLink : "")
    )
        .replace(/[\r\n]+/g, " ")
        .trim();
    if (link === "" && fields.category === skillName)
        return [title, skillLinkOf(fields.module, fields.type, fields.semester)];
    return [title, link];
}

/**
 * Gives the file of the plan or of the log in `NomManagecalendar` an entry
 * or a box belongs into, see `sources.ts`:
 * for a skill entry the log of its skill and for a skill box its plan, in `Modules/` for a module
 * and in `Skilling/` for a project, named like the folder of the skill,
 * see {@link skillFolderNameOf}, never one without skill, which no entry is,
 * see `categoryAllows` in `categories.ts`;
 * for any other the log or the plan of its topic in the year of its day in `Living/`,
 * see `livingFileOf` in `sources.ts`.
 * - `name`: Name of the folder of the skill, empty for none.
 *
 * @param fields - Category and skill of the entry or the box,
 *   like `Skill` and `IN2028`, or `Food` and no skill
 * @param date - Its day in Berlin time, like `2026-10-13`
 * @param ending - End of the name of the file, `logEnding` or `planEnding` of `sources.ts`
 * @returns Path like `Modules/IN2028_BusinessAnalyticsMachineLearning_Log.ics`,
 *   `Skilling/NomSystemdashboard_Plan.ics` or `Living/Food_2026_Log.ics` in `NomManagecalendar`
 * @throws {Error} - For a skill entry without skill
 */
export function calendarFileOf(
    fields: { category: string; module: string },
    date: string,
    ending: string,
): string {
    if (fields.category !== skillName) return livingFileOf(fields.category, date, ending);
    const name: string = skillFolderNameOf(fields.module);
    if (name === "") throw new Error("A skill entry needs its skill");
    return skillFileOf(name, ending);
}

/**
 * Tells whether a link is one to the folder of a chapter, which an older entry has:
 * a folder, without fingerprint, named like a chapter, right in the folder of a module,
 * unlike the folder of a module itself in an `ATTACH` of an older entry, which counts no more.
 * - `parts`: The parts of its path.
 *
 * @param link - Link of a skill entry
 * @returns Whether it links a chapter
 */
function chapterLinkIs(link: Link): boolean {
    const parts: string[] = link.path.split("/");
    return (
        link.fingerprint === "" &&
        moduleIs(link.path) &&
        parts.length === 3 &&
        /^\d{2}_/.test(parts[parts.length - 1])
    );
}

/**
 * Gives the chapters of my system a skill entry belongs to, by their names:
 * those of its `X-CHAPTER`s, then those whose folders an older entry links,
 * see {@link chapterLinkIs}, by the names of their folders, each once;
 * a chapter keeps the name the entry gave it, also once its folder has another name.
 *
 * @param entry - Skill entry of the log
 * @returns Names like `02_LogisticPoissonRegression`, in order
 */
export function chaptersOf(entry: Entry): string[] {
    return [
        ...new Set([
            ...entry.chapters,
            ...entry.links
                .filter(chapterLinkIs)
                .map((link: Link): string => chapterNameOf(link.path)),
        ]),
    ];
}

/**
 * Tells whether a path leads to a note, a Markdown file,
 * which a skill entry links without fingerprint.
 *
 * @param path - Path like `NomSkillingmodules/IN2028_…/01_…/01_01_SampleMeanStandardError.md`
 * @returns Whether it ends in `.md`
 */
function noteIs(path: string): boolean {
    return path.toLowerCase().endsWith(".md");
}

/**
 * Gives the path from `NomWorkspace` of a document of a module,
 * as the reader offers it from the module folder.
 *
 * @param module - Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param document - Path from the module folder, like `VO_…/04_LogisticRegression.pdf`
 *   or `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`
 * @returns Path like `NomSkillingmodules/IN2028_…/VO_…/04_LogisticRegression.pdf`
 */
function documentPathOf(module: string, document: string): string {
    return `${modulesFolder}/${module}/${document}`;
}

/**
 * Gives the links of a skill entry to files,
 * see the top of this file,
 * without those to the folders of its chapters and to the folder of its module,
 * which an older entry may have.
 * - `parts`: Parts of the path of a link.
 *
 * @param links - Links of a skill entry
 * @returns Its links to files, in their order
 */
export function documentLinksOf(links: Link[]): Link[] {
    return links.filter((link: Link): boolean => {
        const parts: string[] = link.path.split("/");
        return (
            !chapterLinkIs(link) &&
            !(link.fingerprint === "" && moduleIs(link.path) && parts.length === 2)
        );
    });
}

/**
 * Builds the links of a skill entry, its `ATTACH`es, one line each, see the top of this file:
 * the documents it used, each a file of its module with its fingerprint, a note without, each once.
 * A document the entry links already keeps its link with its fingerprint,
 * also when the reader could not find it any more;
 * a file it links without fingerprint,
 * like the slides a lecture of my plan links, gets its fingerprint,
 * or stays as written while its file is not there yet, like the slides of a lecture to come.
 * The folder of its skill is the `ALTREP` of its `SUMMARY`, its chapters its `X-CHAPTER`s.
 * - `folder`: Folder of the skill from `NomWorkspace`,
 *   see {@link skillFolderOf}, `undefined` for none.
 * - `module`: Name of the folder of a module, empty for a project.
 * - `path`: Path of a document from `NomWorkspace`, see {@link documentPathOf}.
 * - `kept`: The entry's link to that document, `undefined` for none.
 *
 * @param code - Name of the skill, like `IN2028` or `WokFlow`
 * @param documents - Paths of the documents from the folder of the skill,
 *   like `VO_…/04_LogisticRegression.pdf`, as the reader offered them, none for none
 * @param links - Links the entry has, none for a new entry
 * @returns The links of its documents
 * @throws {Error} - When a document is none of the module's
 */
export function linksOf(code: string, documents: string[], links: Link[]): Link[] {
    const folder: string | undefined = skillFolderOf(code);
    if (folder === undefined) return [];
    const module: string = moduleIs(folder) ? folder.slice(modulesFolder.length + 1) : "";
    return [...new Set(documents)].map((document: string): Link => {
        const path: string =
            module === "" ? `${folder}/${document}` : documentPathOf(module, document);
        const kept: Link | undefined = links.find((link: Link): boolean => link.path === path);
        if (kept !== undefined && (kept.fingerprint !== "" || !existsSync(diskOf(path))))
            return kept;
        if (module === "" || !moduleContentsRead(module).documents.includes(document))
            throw new Error(`No document ${document} in ${code}`);
        return { path: path, fingerprint: noteIs(path) ? "" : fingerprintOf(diskOf(path)) };
    });
}

/**
 * Repairs the links of a skill entry that lead nowhere, see the top of this file:
 * each document by its fingerprint among the documents of the module of the entry,
 * each note without fingerprint by the name of its file among them,
 * each folder of a chapter an older entry links by its name in the module folder found now,
 * like after the module folder was renamed.
 * The folder of a module in an older `ATTACH` stays as it is.
 * - `folder`: Name of the folder of the entry's module,
 *   as found now, `undefined` for none, like for a project.
 * - `repaired`: The links as repaired so far, in their order.
 * - `name`: Name of the folder of a chapter, or of the file of a note.
 * - `note`: Path of the note of that name from the module folder, `undefined` for none.
 * - `chapter`: Path of the folder of a chapter of that name
 *   in the module folder found now, `undefined` for none.
 * - `found`: Path of the document with the fingerprint
 *   from the module folder, `undefined` for none.
 *
 * @param entry - Skill entry of the log
 * @returns Its links, those repaired with their new paths, the others as written
 */
function linksRepairOf(entry: Entry): Link[] {
    const folder: string | undefined = moduleFolderOf(entry.module);
    const repaired: Link[] = entry.links.map((link: Link): Link => {
        if (
            (link.fingerprint === "" && !chapterLinkIs(link) && !noteIs(link.path)) ||
            existsSync(diskOf(link.path))
        )
            return link;
        const name: string = link.path.split("/").at(-1) ?? "";
        if (link.fingerprint === "" && noteIs(link.path)) {
            const note: string | undefined =
                folder === undefined
                    ? undefined
                    : moduleContentsRead(folder).documents.find(
                          (document: string): boolean => document.split("/").at(-1) === name,
                      );
            if (note !== undefined && folder !== undefined)
                return { ...link, path: documentPathOf(folder, note) };
            return link;
        }
        if (link.fingerprint === "") {
            const chapter: string | undefined =
                folder === undefined ? undefined : `${modulesFolder}/${folder}/${name}`;
            if (chapter !== undefined && existsSync(diskOf(chapter)))
                return { ...link, path: chapter };
            return link;
        }
        const found: string | undefined =
            folder === undefined
                ? undefined
                : moduleContentsRead(folder).documents.find(
                      (document: string): boolean =>
                          fingerprintOf(diskOf(documentPathOf(folder, document))) ===
                          link.fingerprint,
                  );
        if (found !== undefined && folder !== undefined)
            return { ...link, path: documentPathOf(folder, found) };
        return link;
    });
    return repaired;
}

/**
 * Prints a repair of a link of a skill entry into the reader's console, like `Repaired a link
 * of IN2028_BusinessAnalyticsMachineLearning (VO) on 2026-10-13 at 14:00:
 * NomSkillingmodules/IN2028_…/04_Old.pdf is now NomSkillingmodules/IN2028_…/04_New.pdf`.
 *
 * @param entry - Skill entry of the log, as it was
 * @param old - Path of the link as it was
 * @param path - Path of the link now
 */
function repairPrint(entry: Entry, old: string, path: string): void {
    console.log(
        new Date().toISOString(),
        `Repaired a link of ${entry.title}` +
            ` on ${berlinDateOf(new Date(entry.start))} at ${berlinTimeOf(new Date(entry.start))}:` +
            ` ${old} is now ${path}`,
    );
}

/**
 * Repairs the link of a skill entry, the `ALTREP` of its `SUMMARY`,
 * when the folder of its module is gone, like after a rename:
 * the folder found again by the code of the entry's module,
 * see `moduleFolderOf` in `notes.ts`, with the material of its type and semester as before,
 * see {@link skillLinkOf}; its title follows, see {@link skillTitleOf}.
 * The folder of a project stays as written,
 * and so does the folder of a material or a semester that is gone,
 * since the type stays named by it.
 * - `parts`: Parts of the link.
 * - `given`: The title its skill and type gave it by the folder as it was.
 * - `fields`: Fields and times of the entry, its `ALTREP` repaired.
 *
 * @param file - `.ics` file of the entry
 * @param entry - Skill entry of the log
 */
function folderRepair(file: string, entry: Entry): void {
    const parts: string[] = entry.titleLink.split("/");
    if (
        !moduleIs(entry.titleLink) ||
        existsSync(diskOf(parts.slice(0, 2).join("/"))) ||
        moduleFolderOf(entry.module) === undefined
    )
        return;

    const given: string = entry.type === "" ? parts[1] : `${parts[1]} (${entry.type})`;
    const fields: EntryFields = {
        ...entry,
        title: entry.title === given ? skillTitleOf(entry.module, entry.type) : entry.title,
        titleLink: skillLinkOf(entry.module, entry.type, entry.semester),
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
    entryChange(file, entry, fields, file);
    repairPrint(entry, entry.titleLink, fields.titleLink);
}

/**
 * Checks every link of the skill entries of the whole log, up to a year after now,
 * see the top of this file:
 * the folder of each, the `ALTREP` of its `SUMMARY`, see {@link folderRepair},
 * then its documents and chapters, see {@link linksRepairOf};
 * writes the repaired links into their entries and prints each repair, see {@link repairPrint}.
 * Entries that cannot be changed stay as they are.
 * - `entries`: Skill entries of the log with links.
 * - `file`: `.ics` file of an entry.
 * - `links`: The links of an entry to files as repaired.
 *
 * @throws {Error} - When a module folder or file cannot be read, or the log cannot be written
 */
export function linksCheck(): void {
    const entries: Entry[] = logRead()
        .filter(
            (entry: Entry): boolean =>
                entry.category === skillName &&
                entry.editable &&
                (entry.titleLink !== "" || entry.links.length > 0),
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
    entries.forEach((entry: Entry): void => {
        const [file]: [string, Entry] = entryFind(skillLog, entry.id);
        folderRepair(file, entry);
        const links: Link[] = linksRepairOf(entry);
        if (
            links.some(
                (link: Link, index: number): boolean => link.path !== entry.links[index].path,
            )
        ) {
            propertiesPut(file, entry.id, [["attach", links]]);
            links.forEach((link: Link, index: number): void => {
                if (link.path !== entry.links[index].path)
                    repairPrint(entry, entry.links[index].path, link.path);
            });
        }
    });
}

/**
 * Checks every link now, see {@link linksCheck}, and again every night at 04:00 in Berlin time,
 * as long as the reader runs; a failed check is printed and waits for the next.
 * - `check`: Checks the links, then waits for the next 04:00.
 * - `now`: The moment of the check.
 * - `next`: The next 04:00 after it, of today or of tomorrow.
 */
export function linksCheckStart(): void {
    const check: () => void = (): void => {
        try {
            linksCheck();
        } catch (error: unknown) {
            console.error(new Date().toISOString(), "The check of the links failed", error);
        }
        const now: Date = new Date();
        let next: Date = berlinInstantOf(berlinDateOf(now), checkHour);
        if (next <= now) next = berlinInstantOf(dayAdd(berlinDateOf(now), 1), checkHour);
        setTimeout(check, next.getTime() - now.getTime());
    };
    check();
}

/**
 * Reads a file a skill entry of the log links, to send it read only,
 * so the page opens it in the browser's own viewer, like the slides of a lecture as PDF;
 * no other file, and none outside `NomWorkspace` or hidden, like `.git` or `.claude`.
 * - `linked`: Whether a skill entry of the whole log links the file, see {@link linksCheck}.
 * - `file`: Path of the file on the disk.
 * - `hidden`: Whether a part of the path starts with `.`, like `..` or `.git`.
 *
 * @param path - Path from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_…/VO_…/04_LogisticPoissonRegression.pdf`
 * @returns File with its content type
 * @throws {Error} - When no skill entry links the file,
 *   it lies outside `NomWorkspace` or is hidden, or it is missing
 */
export function linkedFileRead(path: string): NotesFile {
    const linked: boolean = logRead().some((entry: Entry): boolean =>
        entry.links.some((link: Link): boolean => link.fingerprint !== "" && link.path === path),
    );
    const file: string = diskOf(path);
    const hidden: boolean = path.split("/").some((part: string): boolean => part.startsWith("."));
    if (!linked || hidden || !resolve(file).startsWith(`${resolve(vault)}${sep}`))
        throw new Error(`No linked file ${path}`);
    return { type: contentTypeOf(file), content: readFileSync(file) };
}
