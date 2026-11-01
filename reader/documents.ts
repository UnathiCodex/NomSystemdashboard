/**
 * ## Documents
 *
 * Names a skill entry and links it to the folder of its skill
 * and to the documents it used, its paths from `NomWorkspace`.
 * Each link only points to more, the entry states its facts itself, see `./calendar.ts`,
 * like the chapters of my system it belongs to, one `X-CHAPTER` each.
 * Its `SUMMARY` names its skill and its type: the name of its skill
 * with its type in round brackets at the end when it has one, see {@link skillTitleOf}.
 * Its `ALTREP` is a link I set, by default the link of the skill,
 * see {@link skillLinkOf}.
 * Every real document a skill entry used is one `ATTACH` holding just its path,
 * see `Link` in `./calendar.ts`, in the same form for every kind.
 * The name of the file says what it is and its `X-CHAPTER`s what the session was about,
 * so a document has no name of my own.
 * A file of the university keeps the SHA-256 of its bytes as parameter,
 * so the link survives a rename.
 * A note has none, since I change my notes too often, and is found by its name,
 * see {@link linksRepairOf}. A note an older entry links with its fingerprint keeps it.
 * The folder of a chapter is no `ATTACH`:
 * an older entry that links one names that chapter, see {@link chaptersOf},
 * and it becomes its `X-CHAPTER` once the entry changes.
 * The reader checks every link of the whole log when it starts and every night at 04:00,
 * see {@link linksCheckStart}, and repairs what moved.
 * Each repair goes into the entry, every other line of the file as it is,
 * and into the reader's console, with the old and the new path.
 * A link it cannot repair stays as written,
 * like a document deleted or the folder of a project,
 * which has no code to find it by.
 * Fingerprints are kept by path, size and time of change,
 * so only new or changed files are read again.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
    sharedLinkOf,
    skillName,
} from "./calendar.ts";
import { activeModulesRead, chapterNameOf, codeOf, moduleContentsRead, moduleFolderOf } from "./notes.ts";
import { skillRowOf } from "./skills.ts";
import { moduleIs, modulesFolder, skillFileOf, skillLog, vault, topicFileOf } from "./sources.ts";

import type { Stats } from "node:fs";
import type { Entry, EntryFields, Link } from "./calendar.ts";

/** A fingerprint as computed, with the size and time of change of its file then. */
type Fingerprint = {
    size: number;
    modified: number;
    fingerprint: string;
};

/** Fingerprints computed so far, by the path of their file on the disk. */
const fingerprints: Map<string, Fingerprint> = new Map();

/** Hour of the night the reader checks every link again, in Berlin time. */
const checkHour: number = 4;

/** A year in milliseconds: the whole log is read up to a year after now. */
const yearLength: number = 366 * 24 * 60 * 60 * 1000;

/** Reads the entries of the whole skill log, up to a year after now. */
function logRead(): Entry[] {
    return entriesRead(skillLog, "1970-01-01T00:00:00Z", new Date(Date.now() + yearLength).toISOString());
}

/** Builds the path on the disk of a path from `NomWorkspace`. */
function diskOf(path: string): string {
    return join(vault, ...path.split("/"));
}

/**
 * Gives the fingerprint of a file, the SHA-256 of its bytes,
 * computed again only when the file changed.
 *
 * @throws {Error} - When the file cannot be read
 */
function fingerprintOf(file: string): string {
    const stats: Stats = statSync(file);
    const known: Fingerprint | undefined = fingerprints.get(file);
    if (known?.size === stats.size && known.modified === stats.mtimeMs) return known.fingerprint;

    const fingerprint: string = createHash("sha256").update(readFileSync(file)).digest("hex");
    fingerprints.set(file, {
        size: stats.size,
        modified: stats.mtimeMs,
        fingerprint: fingerprint,
    });
    return fingerprint;
}

/**
 * Gives the folder of a module by its code, as a path from `NomWorkspace`:
 * in `NomSkillingmodules`, or of a module of the semester whose folder is missing yet.
 * A skill of `Skills.md` has a folder only as a module whose folder is there,
 * see `./skills.ts`.
 */
export function skillFolderOf(code: string): string | undefined {
    const module: string | undefined =
        moduleFolderOf(code) ?? activeModulesRead().find((name: string): boolean => codeOf(name) === code);
    return module === undefined ? undefined : `${modulesFolder}/${module}`;
}

/**
 * Gives the name of a skill, which names its entries, its plan and its log:
 * the name of its folder, see {@link skillFolderOf}, else of its row of `Skills.md`,
 * else its code alone.
 */
function skillNameOf(code: string): string {
    return skillFolderOf(code)?.split("/").at(-1) ?? skillRowOf(code)?.name ?? code;
}

/**
 * Gives the title a skill entry has while I type none, its `SUMMARY`:
 * the name of its skill, see {@link skillNameOf},
 * with its type in round brackets when it has one.
 * An entry without skill by its type in brackets alone, like `(VO)`, or not at all.
 */
export function skillTitleOf(code: string, type: string): string {
    const name: string = skillNameOf(code);
    if (type === "") return name;
    return name === "" ? `(${type})` : `${name} (${type})`;
}

/**
 * Gives the link of a skill, the `ALTREP` of the `SUMMARY` of its entries and boxes:
 * the link of its row of `Skills.md` while I entered one,
 * else the one they share, see `sharedLinkOf` in `./calendar.ts`,
 * else the folder of its module, empty for none.
 * The dialog fills in the same link, see `skillPathOf` in `src/day/skill.ts`.
 */
export function skillLinkOf(code: string): string {
    const entered: string = skillRowOf(code)?.link ?? "";
    if (entered !== "") return entered;
    return sharedLinkOf(skillName, skillTitleOf(code, "")) ?? skillFolderOf(code) ?? "";
}

/**
 * Gives what an entry or a box was as it is written, its `SUMMARY` and its `ALTREP`:
 * its what as sent, a skill entry the one its skill and type give it.
 * Its link as I type it, on one line, a web address or a path from `NomWorkspace` on,
 * only a valid one opening on a click.
 * A sender that knows none, like the calendar after a drag, keeps the one it comes from
 * while it is the same what.
 * A skill entry without one links the folder of its skill, see {@link skillLinkOf}.
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
    const title: string = fields.category === skillName ? skillTitleOf(fields.module, fields.type) : fields.title;
    const link: string = (fields.titleLink ?? (from !== null && from.title === title ? from.titleLink : ""))
        .replace(/[\r\n]+/g, " ")
        .trim();
    if (link !== "") return [title, link];
    if (fields.category === skillName) return [title, skillLinkOf(fields.module)];
    return [title, sharedLinkOf(fields.category, title) ?? ""];
}

/**
 * Gives the file of the plan or of the log in `NomManagecalendar` an entry
 * or a box belongs into, see `./sources.ts`:
 * for a skill entry the log or plan of its skill, named like the skill, see {@link skillNameOf},
 * for any other the log or the plan of its topic in the year of its day.
 *
 * @throws {Error} - For a skill entry without skill
 */
export function calendarFileOf(fields: { category: string; module: string }, date: string, ending: string): string {
    if (fields.category !== skillName) return topicFileOf(fields.category, date, ending);
    const name: string = skillNameOf(fields.module);
    if (name === "") throw new Error("A skill entry needs its skill");
    return skillFileOf(name, ending);
}

/**
 * Tells whether a link is one to the folder of a chapter, which an older entry has:
 * a folder, without fingerprint, named like a chapter, right in the folder of a module,
 * unlike the folder of a module itself in an `ATTACH` of an older entry,
 * which counts no more.
 */
function chapterLinkIs(link: Link): boolean {
    const parts: string[] = link.path.split("/");
    return (
        link.fingerprint === "" && moduleIs(link.path) && parts.length === 3 && /^\d{2}_/.test(parts[parts.length - 1])
    );
}

/**
 * Gives the chapters of my system a skill entry belongs to, by their names, each once:
 * those of its `X-CHAPTER`s, then those whose folders an older entry links.
 * A chapter keeps the name the entry gave it, also once its folder has another name.
 */
export function chaptersOf(entry: Entry): string[] {
    return [
        ...new Set([
            ...entry.chapters,
            ...entry.links.filter(chapterLinkIs).map((link: Link): string => chapterNameOf(link.path)),
        ]),
    ];
}

/** Tells whether a path leads to a note, which an entry links without fingerprint. */
function noteIs(path: string): boolean {
    return path.toLowerCase().endsWith(".md");
}

/** Gives the path from `NomWorkspace` of a document of a module. */
function documentPathOf(module: string, document: string): string {
    return `${modulesFolder}/${module}/${document}`;
}

/**
 * Gives the links of a skill entry to files,
 * without those to the folders of its chapters and to the folder of its module,
 * which an older entry may have.
 */
export function documentLinksOf(links: Link[]): Link[] {
    return links.filter((link: Link): boolean => {
        const parts: string[] = link.path.split("/");
        return !chapterLinkIs(link) && !(link.fingerprint === "" && moduleIs(link.path) && parts.length === 2);
    });
}

/**
 * Builds the links of a skill entry, its `ATTACH`es:
 * the documents it used, each a file of its module with its fingerprint,
 * a note without, each once.
 * A document the entry links already keeps its link with its fingerprint,
 * also when the reader could not find it any more.
 * A file it links without fingerprint,
 * like the slides a lecture of my plan links, gets its fingerprint,
 * or stays as written while its file is not there yet,
 * like the slides of a lecture to come.
 *
 * @throws {Error} - When a document is none of the module's
 */
export function linksOf(code: string, documents: string[], links: Link[]): Link[] {
    const folder: string | undefined = skillFolderOf(code);
    if (folder === undefined) return [];
    const module: string = moduleIs(folder) ? folder.slice(modulesFolder.length + 1) : "";
    return [...new Set(documents)].map((document: string): Link => {
        const path: string = module === "" ? `${folder}/${document}` : documentPathOf(module, document);
        const kept: Link | undefined = links.find((link: Link): boolean => link.path === path);
        if (kept !== undefined && (kept.fingerprint !== "" || !existsSync(diskOf(path)))) return kept;
        if (module === "" || !moduleContentsRead(module).documents.includes(document))
            throw new Error(`No document ${document} in ${code}`);
        return {
            path: path,
            fingerprint: noteIs(path) ? "" : fingerprintOf(diskOf(path)),
        };
    });
}

/**
 * Repairs the links of a skill entry that lead nowhere:
 * each document by its fingerprint among the documents of the module of the entry,
 * each note without fingerprint by the name of its file among them,
 * each folder of a chapter an older entry links by its name
 * in the module folder found now, like after the module folder was renamed.
 * The folder of a module in an older `ATTACH` stays as it is.
 */
function linksRepairOf(entry: Entry): Link[] {
    const folder: string | undefined = moduleFolderOf(entry.module);
    const repaired: Link[] = entry.links.map((link: Link): Link => {
        if ((link.fingerprint === "" && !chapterLinkIs(link) && !noteIs(link.path)) || existsSync(diskOf(link.path)))
            return link;
        const name: string = link.path.split("/").at(-1) ?? "";
        if (link.fingerprint === "" && noteIs(link.path)) {
            const note: string | undefined =
                folder === undefined
                    ? undefined
                    : moduleContentsRead(folder).documents.find(
                          (document: string): boolean => document.split("/").at(-1) === name,
                      );
            if (note !== undefined && folder !== undefined) return { ...link, path: documentPathOf(folder, note) };
            return link;
        }
        if (link.fingerprint === "") {
            const chapter: string | undefined = folder === undefined ? undefined : `${modulesFolder}/${folder}/${name}`;
            if (chapter !== undefined && existsSync(diskOf(chapter))) return { ...link, path: chapter };
            return link;
        }
        const found: string | undefined =
            folder === undefined
                ? undefined
                : moduleContentsRead(folder).documents.find(
                      (document: string): boolean =>
                          fingerprintOf(diskOf(documentPathOf(folder, document))) === link.fingerprint,
                  );
        if (found !== undefined && folder !== undefined) return { ...link, path: documentPathOf(folder, found) };
        return link;
    });
    return repaired;
}

/** Prints a repair of a link of a skill entry into the reader's console. */
function repairPrint(entry: Entry, old: string, path: string): void {
    console.log(
        new Date().toISOString(),
        `Repaired a link of ${entry.title}` +
            ` on ${berlinDateOf(new Date(entry.start))}` +
            ` at ${berlinTimeOf(new Date(entry.start))}:` +
            ` ${old} is now ${path}`,
    );
}

/**
 * Repairs the link of a skill entry, the `ALTREP` of its `SUMMARY`,
 * when the folder of its module is gone, like after a rename:
 * the folder found again by the code of the entry's module,
 * see `moduleFolderOf` in `./notes.ts`. Its title follows.
 * The folder of a project stays as written,
 * and so does the folder of a material or a semester that is gone,
 * since the type stays named by it.
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
        titleLink: skillFolderOf(entry.module) ?? entry.titleLink,
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
    entryChange(file, entry, fields, file);
    repairPrint(entry, entry.titleLink, fields.titleLink);
}

/**
 * Checks every link of the skill entries of the whole log, up to a year after now,
 * the folder of each, then its documents and chapters,
 * and writes and prints each repair.
 * Entries that cannot be changed stay as they are.
 *
 * @throws {Error} - When a module folder or file cannot be read,
 *   or the log cannot be written
 */
export function linksCheck(): void {
    const entries: Entry[] = logRead()
        .filter(
            (entry: Entry): boolean =>
                entry.category === skillName && entry.editable && (entry.titleLink !== "" || entry.links.length > 0),
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
    entries.forEach((entry: Entry): void => {
        const [file]: [string, Entry] = entryFind(skillLog, entry.id);
        folderRepair(file, entry);
        const links: Link[] = linksRepairOf(entry);
        if (links.some((link: Link, index: number): boolean => link.path !== entry.links[index].path)) {
            propertiesPut(file, entry.id, [["attach", links]]);
            links.forEach((link: Link, index: number): void => {
                if (link.path !== entry.links[index].path) repairPrint(entry, entry.links[index].path, link.path);
            });
        }
    });
}

/**
 * Checks every link now and again every night at 04:00 in Berlin time,
 * as long as the reader runs. A failed check is printed and waits for the next.
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
