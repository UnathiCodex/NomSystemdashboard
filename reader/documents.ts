/**
 * ## Documents
 *
 * Names a skill entry and links it to the folder of its skill and the documents it used,
 * by paths from `NomWorkspace`.
 * A link only points to more, the entry states its facts itself, its chapters one `X-CHAPTER` each.
 * Its `SUMMARY` is the name of its skill, its type in round brackets at the end.
 * Its `ALTREP` is a link I set, by default the link of the skill.
 * Every document it used is one `ATTACH` with just its path, the file name saying what it is.
 * A file of the university keeps the SHA-256 of its bytes, so the link survives a rename.
 * A note has none, since I change my notes too often, and is found by its name.
 * An older entry may link the folder of a chapter, which becomes its `X-CHAPTER` once it changes.
 * The reader checks every link at start and every night at 04:00 and repairs what moved.
 * Each repair goes into the entry and the console, a link it cannot repair stays as written.
 * Fingerprints are kept by path, size and time of change, so only changed files are read again.
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
    summaryBaseOf,
} from "./calendar.ts";
import { skillTypes } from "./categories.ts";
import { activeModulesRead, chapterNameOf, codeOf, moduleContentsRead, moduleFolderOf } from "./notes.ts";
import { skillRowOf, skillRowsRead, skillTypesRead } from "./skills.ts";
import { moduleIs, modulesFolder, skillFileOf, skillLog, vault, topicFileOf } from "./sources.ts";

import type { Stats } from "node:fs";
import type { Entry, EntryFields, Link } from "./calendar.ts";
import type { SkillRow } from "./skills.ts";

/** A fingerprint with the size and time of change of its file then. */
type Fingerprint = {
    size: number;
    modified: number;
    fingerprint: string;
};

/** Fingerprints by the path of their file on the disk. */
const fingerprints: Map<string, Fingerprint> = new Map();

/** Hour of the night in Berlin the links are checked again. */
const checkHour: number = 4;

/** A year in milliseconds, how far after now the log is read. */
const yearLength: number = 366 * 24 * 60 * 60 * 1000;

/** Reads the whole skill log, up to a year after now. */
function logRead(): Entry[] {
    return entriesRead(skillLog, "1970-01-01T00:00:00Z", new Date(Date.now() + yearLength).toISOString());
}

/** The path on the disk of a path from `NomWorkspace`. */
function diskOf(path: string): string {
    return join(vault, ...path.split("/"));
}

/**
 * The SHA-256 of the bytes of a file, computed again only when the file changed.
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

/** The folder of a module by its code, also of a module of the semester whose folder is missing yet. */
export function skillFolderOf(code: string): string | undefined {
    const module: string | undefined =
        moduleFolderOf(code) ?? activeModulesRead().find((name: string): boolean => codeOf(name) === code);
    return module === undefined ? undefined : `${modulesFolder}/${module}`;
}

/** The name of a skill, of its folder, else of its row of `Skills.md`, else its code. */
function skillNameOf(code: string): string {
    return skillFolderOf(code)?.split("/").at(-1) ?? skillRowOf(code)?.name ?? code;
}

/** The `SUMMARY` of a skill entry, its skill with its type in round brackets, without skill the type alone. */
export function skillTitleOf(code: string, type: string): string {
    const name: string = skillNameOf(code);
    if (type === "") return name;
    return name === "" ? `(${type})` : `${name} (${type})`;
}

/**
 * The types a skill offers, of a module the fixed {@link skillTypes}, else those of its rows.
 * Without skill the fixed ones too, since an older entry may have a type alone.
 */
export function skillTypesOf(code: string): string[] {
    return code === "" || skillFolderOf(code) !== undefined ? skillTypes : skillTypesRead(code);
}

/** Whether a skill entry or box has a type its skill offers, else the one it had, else none. */
export function skillTypeAllows(code: string, type: string, had: string): boolean {
    return type === "" || type === had || skillTypesOf(code).includes(type);
}

/**
 * The link of a skill and type, of its row of `Skills.md`, else the one its entries share,
 * else for a type the link of its skill, else the folder of its skill.
 */
export function skillLinkOf(code: string, type: string): string {
    const title: string = skillTitleOf(code, type);
    const entered: string = skillRowsRead().find((row: SkillRow): boolean => row.name === title)?.link ?? "";
    if (entered !== "") return entered;
    const shared: string | undefined = sharedLinkOf(skillName, title);
    if (shared !== undefined) return shared;
    return type === "" ? (skillFolderOf(code) ?? "") : skillLinkOf(code, "");
}

/**
 * The `SUMMARY` and `ALTREP` of an entry, a skill entry named by its skill and type.
 * The link as typed on one line, a sender that knows none keeping the one of the same what.
 * A skill entry without one takes the link of its skill and type.
 * Any other the link its summary shares, with round brackets else that of the name before them.
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
    if (fields.category === skillName) return [title, skillLinkOf(fields.module, fields.type)];
    const base: string = summaryBaseOf(title);
    const shared: string | undefined = sharedLinkOf(fields.category, title);
    return [title, shared ?? (base === title ? "" : (sharedLinkOf(fields.category, base) ?? ""))];
}

/**
 * The calendar file an entry belongs into, of its skill, else of its topic in the year of its day.
 *
 * @throws {Error} - For a skill entry without skill
 */
export function calendarFileOf(fields: { category: string; module: string }, date: string, ending: string): string {
    if (fields.category !== skillName) return topicFileOf(fields.category, date, ending);
    const name: string = skillNameOf(fields.module);
    if (name === "") throw new Error("A skill entry needs its skill");
    return skillFileOf(name, ending);
}

/** Whether a link of an older entry leads to the folder of a chapter, right in the folder of a module. */
function chapterLinkIs(link: Link): boolean {
    const parts: string[] = link.path.split("/");
    return (
        link.fingerprint === "" && moduleIs(link.path) && parts.length === 3 && /^\d{2}_/.test(parts[parts.length - 1])
    );
}

/**
 * The chapters of a skill entry, its `X-CHAPTER`s, then those whose folders an older entry links.
 * A chapter keeps the name the entry gave it, also once its folder is renamed.
 */
export function chaptersOf(entry: Entry): string[] {
    return [
        ...new Set([
            ...entry.chapters,
            ...entry.links.filter(chapterLinkIs).map((link: Link): string => chapterNameOf(link.path)),
        ]),
    ];
}

/** Whether a path leads to a note, linked without fingerprint. */
function noteIs(path: string): boolean {
    return path.toLowerCase().endsWith(".md");
}

/** The path of a document of a module. */
function documentPathOf(module: string, document: string): string {
    return `${modulesFolder}/${module}/${document}`;
}

/** The links of a skill entry to files, without the folders of chapters and module an older entry may have. */
export function documentLinksOf(links: Link[]): Link[] {
    return links.filter((link: Link): boolean => {
        const parts: string[] = link.path.split("/");
        return !chapterLinkIs(link) && !(link.fingerprint === "" && moduleIs(link.path) && parts.length === 2);
    });
}

/**
 * The `ATTACH`es of a skill entry, each document once, a file with its fingerprint, a note without.
 * A link already there with its fingerprint stays, also when its file is gone.
 * A file linked without fingerprint gets one, or stays while it is not there yet.
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
 * Repairs the links of a skill entry that lead nowhere, among the documents of its module.
 * A document by its fingerprint, a note by its file name, a folder of a chapter by its name.
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

/** Prints a repair of a link into the console. */
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
 * Repairs the `ALTREP` of a skill entry whose module folder is gone, found again by its code.
 * Its title follows. The folder of a project, a material or a semester stays as written.
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
 * Checks every link of the skill log, writes and prints each repair.
 * Entries that cannot be changed stay as they are.
 *
 * @throws {Error} - When a module folder or file cannot be read, or the log cannot be written
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

/** Checks every link now and every night at 04:00 in Berlin, a failed check printed. */
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
