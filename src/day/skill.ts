/**
 * ## Skill in the entry by category
 *
 * A skill entry in the dialog, for a box of the plan and the log alike.
 * Below the category skill and type side by side, a module with its fixed types,
 * any other skill with the types of its rows of `Skills.md`, a type typed there added as a row `Name (Type)`.
 * Each skill and type has its own link, a type without one that of its skill.
 * Its semester says from which semester the lecture or the material is, not when I did it.
 * It follows the day of the dialog until I pick another, never typed.
 * The Skill list searches every module folder too, since I sometimes attend another module.
 * A text typed that names no skill adds a row of `Skills.md` without link and folder.
 * An entry keeps the name a chapter had, also once its folder has another name.
 * Picks a list does not offer stay as rows until I take them back.
 * A task always comes from the Markdown of its note, never typed.
 * A Task left without result is no attempt and is not written.
 * An Example has no result, so it is no pick here, `Next` checks it off in its round.
 * Every note of a section attached gets its `X-ROUND`, also with no Task picked.
 * An entry of a type, whose documents are its material, picks no tasks.
 * Every field may stay empty, the skill too.
 * A box of the plan has the same fields but tasks and rounds, which only happen in the log.
 */

import {
    addedRowOf,
    addedRowsOf,
    addRowOf,
    breakableOf,
    choiceOf,
    choicesOf,
    lineMove,
    pairOf,
    rowOf,
    searchOf,
} from "./choices.ts";
import { crossPut } from "../icons.ts";
import { plainKeep } from "../skill/task.ts";
import {
    dayTextOf,
    groupsOf,
    masterIs,
    moduleLoad,
    semesterOf,
    skillEntrySend,
    skillingLoad,
} from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { folderLinkShow, modulesFolder } from "../skill/links.ts";
import { changesKept } from "../changes.ts";
import { readerAsk } from "../reader.ts";

import type { Calendar } from "fullcalendar";
import type { Choice } from "./choices.ts";
import type { EntryFields } from "./entries.ts";
import type {
    AttemptNew,
    Group,
    RoundMark,
    SkillModule,
    SkillSection,
    SkillTask,
    Skilling,
} from "../skill/attempts.ts";
import type { Link } from "../../reader/calendar.ts";
import type { ModuleContents } from "../../reader/notes.ts";
import type { RoundPick } from "../../reader/skill.ts";

/** A task picked for the entry, with its result. */
type AttemptPick = {
    task: string;
    result: "right" | "wrong" | "";
    comment: string;
};

/**
 * What is picked for the skill entry so far.
 *
 * - `semester`: Empty while it is the semester of the day of the dialog.
 * - `rounds`: Rounds I picked by hand, by the paths of their notes from the module folder.
 */
type SkillPicks = {
    module: string;
    type: string;
    semester: string;
    chapters: string[];
    documents: string[];
    attempts: AttemptPick[];
    rounds: Map<string, number>;
};

/** Skill and type of a skill entry. */
export type ModuleType = {
    module: string;
    type: string;
};

/**
 * A skill entry as the dialog opens it, empty values for a new one.
 *
 * - `semester`: Its `X-SEMESTER`, empty for a new one and an older one without.
 * - `titleLink`: The `ALTREP` of its `SUMMARY`, the folder of its skill or a web address.
 */
export type SkillValues = {
    module: string;
    type: string;
    semester: string;
    title: string;
    titleLink: string;
    chapters: string[];
    links: Link[];
    rounds: RoundMark[];
};

const resultChoices: Choice[] = [
    { value: "right", text: "Right", group: "" },
    { value: "wrong", text: "Wrong", group: "" },
];

/** Modules with their tasks and the lists to pick from. */
let skilling: Skilling = {
    modules: [],
    skills: [],
    otherModules: [],
    names: {},
    paths: {},
    types: {},
    links: {},
};

/**
 * The skilling as the reader last sent it, loaded anew after every change of a file,
 * so picking `Skill` waits not for the reader's fifth of a second.
 */
const skillingKept: () => Promise<Skilling> = changesKept(skillingLoad);

let picks: SkillPicks = picksOf({ module: "", type: "", semester: "", chapters: [] });

/** What is picked, with no documents, attempts and rounds yet. */
function picksOf(picked: Omit<SkillPicks, "documents" | "attempts" | "rounds">): SkillPicks {
    return { ...picked, documents: [], attempts: [], rounds: new Map() };
}

/** Path of a note of a chapter from the module folder, its chapter folder caught. */
const chapterNote: RegExp = /^(\d{2}_[^/]*)\/[^/]+$/;

/** Code of a module of the university. */
const moduleCode: RegExp = /^[A-Z]{2,4}\d{3,6}$/;

/** Name of a module, its folder, plan and log, as the reader names it. */
const moduleName: RegExp = /^[A-Z]+\d+_/;

/** Groups of the Skill list in their order. */
export const skillGroups: string[] = ["Master", "Projects", "Modules"];

/** Umlauts and `ß` as the names of my module folders write them out. */
const umlauts: { [letter: string]: string } = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    Ä: "Ae",
    Ö: "Oe",
    Ü: "Ue",
    ß: "ss",
};

/** Day of the dialog, whose semester the entry has while I pick none. */
let semesterDay: string = "";

/**
 * Where the fields of `Skill` show and the call that tells the dialog of a change.
 *
 * - `people`: The row of who I was with.
 * - `summary`: Pencil, link and parts of the summary.
 * - `changed`: Shows the link of the summary anew and allows saving or not.
 */
type SkillShown = {
    head: HTMLElement;
    more: HTMLElement;
    people: HTMLElement[];
    summary: HTMLElement[];
    changed: () => void;
};

/** Where the fields of `Skill` last showed, so a changed day shows its semester. */
let shownIn: SkillShown | null = null;

/** Chapters and documents of the skill picked, none for a skill without module folder. */
let contents: ModuleContents = contentsNone();

function contentsNone(): ModuleContents {
    return { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
}

/** `X-ROUND`s of the skill entry of the log being changed. */
let loggedRounds: RoundMark[] = [];

/** Whether the dialog writes a box of the plan, which has no tasks and attempts. */
let inPlan: boolean = false;

/**
 * Paths of the documents from the module folder, as the list `Attach` offers them.
 * A file with its fingerprint or one in a folder of material, never a chapter folder.
 */
function documentPathsOf(links: Link[]): string[] {
    return links.flatMap((link: Link): string[] => {
        const rest: string | null =
            contents.folder !== "" && link.path.startsWith(`${contents.folder}/`)
                ? link.path.slice(contents.folder.length + 1)
                : null;
        return rest !== null && (link.fingerprint !== "" || rest.includes("/")) ? [rest] : [];
    });
}

/** Link of a skill and type, of a type without one that of its skill. */
function linkOf(module: string, type: string): string {
    const links: { [type: string]: string } = skilling.links[module] ?? {};
    return links[type] ?? links[""] ?? "";
}

/** Link of the skill and type picked. */
export function skillPathOf(): string {
    return linkOf(picks.module, picks.type);
}

/** Types a skill offers, those of a skill not offered none. */
function typesOf(module: string): string[] {
    return skilling.types[module] ?? [];
}

/**
 * Whether a skill has its folder in `NomSkillingmodules`.
 * Only such a skill has fixed types, each with its material folder.
 */
function moduleIs(code: string): boolean {
    return (skilling.paths[code] ?? "").startsWith(`${modulesFolder}/`);
}

/** Name of the skill, which names its entries and the files of its plan and log. */
export function skillNameOf(module: string = picks.module): string {
    return skilling.names[module] ?? module;
}

/** Title of the skill and type picked while I type none, as the reader writes it. */
export function skillTitleOf(): string {
    const name: string = skillNameOf();
    if (picks.type === "") return name;
    return name === "" ? `(${picks.type})` : `${name} (${picks.type})`;
}

/** The folder of the skill as the link below the summary, hidden for none. */
export function skillPathShow(link: HTMLAnchorElement): void {
    folderLinkShow(link, skillPathOf());
}

/** A calm grey hint in place of a picker. */
function hintOf(text: string): HTMLParagraphElement {
    const hint: HTMLParagraphElement = document.createElement("p");
    hint.className = "entry-none";
    hint.textContent = text;
    return hint;
}

/** Group of a skill in the Skill list. */
function skillGroupOf(module: string): string {
    if (masterIs(module)) return "Master";
    return moduleName.test(skillNameOf(module)) ? "Modules" : "Projects";
}

/**
 * Search of the Skill list, in its groups.
 * While nothing is typed the skills of the semester and the skill picked,
 * while I type every skill and module folder that holds the words.
 */
function moduleSearchOf(current: string): (text: string) => Promise<Choice[]> {
    const named: string[] = [...skilling.skills, ...skilling.otherModules];
    const choices: Choice[] = skillGroups.flatMap((group: string): Choice[] =>
        named
            .filter((name: string): boolean => skillGroupOf(name) === group)
            .map((name: string): Choice => ({ value: name, text: skillNameOf(name), group: group })),
    );
    return async (text: string): Promise<Choice[]> => {
        const shown: Choice[] =
            text.trim() !== ""
                ? choices
                : choices.filter(
                      (choice: Choice): boolean => choice.value === current || skilling.skills.includes(choice.value),
                  );
        return await searchOf(shown)(text);
    };
}

/**
 * Name of a new skill for the text typed in the Skill list.
 * A module code and a name become `CODE_CamelCase` as my module folders are named,
 * umlauts written out, other accents gone, a word all in capitals as one.
 * Any other text stays as typed.
 *
 * @returns `null` for empty, `|`, `/`, `\`, round brackets, which only a type takes,
 *   a leading `.`, a code alone, a code the list has
 */
function skillNewNameOf(text: string): string | null {
    const typed: string = text.trim().replace(/\s+/g, " ");
    const parts: RegExpMatchArray | null = typed.match(/^([A-Za-z]+\d+)[\s_]+(.+)$/);
    const code: string = parts?.[1].toUpperCase() ?? "";
    const words: string[] = (parts?.[2] ?? "")
        .replace(/[äöüÄÖÜß]/g, (letter: string): string => umlauts[letter])
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .split(/[^A-Za-z\d]+/)
        .filter((word: string): boolean => word !== "")
        .map((word: string): string => {
            const letters: string = word === word.toUpperCase() ? word.toLowerCase() : word;
            return letters[0].toUpperCase() + letters.slice(1);
        });
    if (typed === "" || /[|/\\()]/.test(typed) || typed.startsWith(".") || moduleCode.test(typed.toUpperCase()))
        return null;
    if (!moduleCode.test(code) || words.length === 0) return typed;
    return skilling.names[code] === undefined ? `${code}_${words.join("")}` : null;
}

/**
 * Adds a new skill as a row of `Skills.md` without link and to the list, so it is picked at once.
 * Makes no folder.
 *
 * @returns Code of the new skill, `null` for a text that makes none
 * @throws {Error} - When the reader does not add it
 */
async function skillAdd(text: string): Promise<string | null> {
    const name: string | null = skillNewNameOf(text);
    if (name === null) return null;
    const code: string = await readerAsk<string>("/api/skill/skills", {
        method: "POST",
        body: JSON.stringify({ name: name }),
    });
    skilling = {
        ...skilling,
        skills: [...skilling.skills, code],
        names: { ...skilling.names, [code]: name },
        types: { ...skilling.types, [code]: [] },
        links: { ...skilling.links, [code]: { "": "" } },
    };
    return code;
}

/** A new type typed in the list of types, one word the skill has not yet. */
function typeNewOf(module: string, text: string): string | null {
    const typed: string = text.trim();
    return /^[\p{L}\p{N}]+$/u.test(typed) && !typesOf(module).includes(typed) ? typed : null;
}

/**
 * Adds a new type to a skill that is no module as a row `Name (Type)` of `Skills.md` without link,
 * and to its list, so it is picked at once.
 *
 * @returns The new type, `null` for a text that makes none
 * @throws {Error} - When the reader does not add it
 */
async function typeAdd(module: string, text: string): Promise<string | null> {
    const type: string | null = typeNewOf(module, text);
    if (type === null) return null;
    await readerAsk<string>("/api/skill/skills", {
        method: "POST",
        body: JSON.stringify({ name: `${skillNameOf(module)} (${type})` }),
    });
    skilling = { ...skilling, types: { ...skilling.types, [module]: [...typesOf(module), type] } };
    return type;
}

/** Semester of the entry, the one picked, else the semester of a day. */
export function skillSemesterOf(day: string): string {
    return picks.semester !== "" ? picks.semester : semesterOf(day);
}

/**
 * Choices of the semester, that of the day first, then those of the documents newest first.
 * The one picked comes along when it is none of them.
 */
function semesterListOf(day: string, documents: string[], picked: string): Choice[] {
    const current: string = semesterOf(day);
    const others: string[] = [...new Set([...documents.map(documentSemesterOf), picked])]
        .filter((semester: string): boolean => semester !== "" && semester !== current)
        .sort((first: string, second: string): number => semesterRankOf(second) - semesterRankOf(first));
    return [current, ...others].map(choiceOf);
}

/** Choices of the semester of a skill for the dialog of a series, as an entry offers them. */
export async function semestersOf(module: string, day: string, picked: string): Promise<Choice[]> {
    const documents: string[] =
        module === ""
            ? []
            : await moduleLoad(module)
                  .then((loaded: ModuleContents): string[] => loaded.documents)
                  .catch((): string[] => []);
    return semesterListOf(day, documents, picked);
}

/** Rank of a semester, a winter after the summer of its year. */
function semesterRankOf(semester: string): number {
    return Number(semester.slice(0, 4)) * 2 + (semester.endsWith("W") ? 1 : 0);
}

/** Semester of the folder a document lies in, empty for none. */
function documentSemesterOf(path: string): string {
    const semester: RegExpMatchArray | null = path
        .split("/")
        .slice(0, -1)
        .join("/")
        .match(/\d{4}[WS]/);
    return semester === null ? "" : semester[0];
}

/** Chapter a document belongs to, empty for none. */
function chapterOfDocument(path: string): string {
    return path.match(chapterNote)?.[1] ?? "";
}

/**
 * Documents a list `Attach` offers, for my own learning the notes of a chapter,
 * for a type of a module the files of its material folder `<type>_` in the semester of the entry.
 */
function documentsOfferedOf(chapter: string): string[] {
    const folder: string = moduleIs(picks.module) && picks.type !== "" ? `${picks.type}_` : "";
    const semester: string = skillSemesterOf(semesterDay);
    return contents.documents
        .filter((path: string): boolean =>
            folder === ""
                ? chapterOfDocument(path) === chapter
                : path.startsWith(folder) && documentSemesterOf(path) === semester,
        )
        .sort((first: string, second: string): number => first.localeCompare(second));
}

/** Choices of a list `Attach`, a file of material grouped by the folders between. */
function documentChoicesOf(chapter: string): Choice[] {
    return documentsOfferedOf(chapter).map((path: string): Choice => ({
        value: path,
        text: fileNameOf(path),
        group: chapterOfDocument(path) !== "" ? "" : path.split("/").slice(1, -1).join("/"),
    }));
}

function fileNameOf(path: string): string {
    return path.split("/").at(-1) ?? path;
}

/**
 * Choices of the Tasks, grouped by when they are due, a later Task with its day.
 * An Example has no result, so it is no choice.
 */
function taskChoicesOf(tasks: SkillTask[]): Choice[] {
    return groupsOf(
        tasks.filter((task: SkillTask): boolean => task.kind === "cold"),
        calendarTodayOf(),
    ).flatMap((group: Group): Choice[] =>
        group.tasks.map((task: SkillTask): Choice => ({
            value: task.id,
            text: group.name === "Later" && task.due !== "" ? `${task.name} · ${dayTextOf(task.due, true)}` : task.name,
            group: group.name,
        })),
    );
}

/**
 * Row of a task picked, its name, its result and its ×.
 * For Wrong a field below for my comment, the cursor in it.
 */
function taskRowOf(pick: AttemptPick, name: string, again: () => void, changed: () => void): HTMLDivElement {
    const task: HTMLDivElement = document.createElement("div");
    const line: HTMLDivElement = document.createElement("div");
    const text: HTMLSpanElement = document.createElement("span");
    const remove: HTMLButtonElement = document.createElement("button");
    const detail: HTMLDivElement = document.createElement("div");
    const detailShow: () => HTMLInputElement | null = (): HTMLInputElement | null => {
        if (pick.result !== "wrong") {
            detail.replaceChildren();
            return null;
        }
        const input: HTMLInputElement = document.createElement("input");
        input.type = "text";
        input.placeholder = "What went wrong";
        input.setAttribute("aria-label", "What went wrong");
        input.autocomplete = "off";
        input.value = pick.comment;
        plainKeep(input);
        input.addEventListener("input", (): void => {
            pick.comment = input.value.trim();
        });
        detail.replaceChildren(input);
        return input;
    };

    line.className = "picker-added";
    text.className = "picker-added-text";
    text.title = name;
    text.textContent = breakableOf(name);
    remove.type = "button";
    crossPut(remove, `Remove ${name}`);
    remove.addEventListener("click", (): void => {
        picks.attempts = picks.attempts.filter((other: AttemptPick): boolean => other !== pick);
        again();
    });
    detail.className = "skill-result-detail";
    line.append(
        text,
        choicesOf({
            search: searchOf(resultChoices),
            picked: pick.result === "" ? [] : [pick.result],
            many: false,
            adding: false,
            empty: "Right or Wrong",
            pick: (values: string[]): void => {
                pick.result = values[0] === "right" || values[0] === "wrong" ? values[0] : "";
                pick.comment = "";
                detailShow()?.focus();
                changed();
            },
        }),
        remove,
    );
    task.append(line, detail);
    detailShow();
    return rowOf("", task);
}

/** Rounds of the entry being changed, which stay, one line per `X-ROUND`. */
function loggedOf(): HTMLElement[] {
    if (loggedRounds.length === 0) return [];

    const list: HTMLUListElement = document.createElement("ul");
    list.className = "entry-skill";
    list.append(
        ...loggedRounds.map((mark: RoundMark): HTMLLIElement => {
            const item: HTMLLIElement = document.createElement("li");
            item.textContent = [
                mark.section,
                `Round ${mark.round}`,
                mark.step,
                mark.used,
                mark.task === "" ? "" : `${mark.task}: ${mark.results.join(", ")}`,
                ...mark.notes,
            ]
                .filter((part: string): boolean => part !== "")
                .join(" · ");
            return item;
        }),
    );
    return [rowOf("Logged", list)];
}

/**
 * Loads the chapters and documents of the skill picked, none for a module without folder,
 * so its entry still opens.
 * What comes for a skill picked before another one is dropped.
 */
async function contentsLoad(): Promise<void> {
    const module: string = picks.module;
    const loaded: ModuleContents =
        module === ""
            ? contentsNone()
            : await moduleLoad(module).catch((error: unknown): ModuleContents => {
                  console.error(error);
                  return contentsNone();
              });
    if (module === picks.module) contents = loaded;
}

/** Tasks a document offers in the log, only those of a note of my own learning. */
function tasksOfDocument(path: string): SkillTask[] {
    const note: string = noteOf(path);
    if (inPlan || picks.type !== "") return [];
    return (
        skilling.modules
            .find((module: SkillModule): boolean => module.code === picks.module)
            ?.tasks.filter((task: SkillTask): boolean => task.note === note) ?? []
    );
}

/**
 * Tasks of a note picked below its row, each picked one indented twice.
 * The plus of the tasks not picked stands right after the name of the note.
 */
function taskRowsOf(path: string, row: HTMLElement, again: () => void, changed: () => void): HTMLElement[] {
    const tasks: SkillTask[] = tasksOfDocument(path);
    const picked: AttemptPick[] = picks.attempts.filter((pick: AttemptPick): boolean =>
        tasks.some((task: SkillTask): boolean => task.id === pick.task),
    );
    const offered: SkillTask[] = tasks.filter(
        (task: SkillTask): boolean => !picked.some((pick: AttemptPick): boolean => pick.task === task.id),
    );
    const rows: HTMLElement[] = picked.map((pick: AttemptPick): HTMLElement => {
        const name: string = tasks.find((task: SkillTask): boolean => task.id === pick.task)?.name ?? pick.task;
        const task: HTMLDivElement = taskRowOf(pick, name, again, changed);
        task.classList.add("panel-nested", "panel-nested-twice");
        return task;
    });
    if (offered.length === 0) return rows;

    const list: HTMLDivElement = rowOf(
        "",
        choicesOf({
            search: searchOf(taskChoicesOf(offered)),
            picked: [],
            many: false,
            adding: false,
            noun: "task",
            empty: "Add a task",
            plus: true,
            pick: (values: string[]): void => {
                picks.attempts = [
                    ...picks.attempts,
                    ...values.map((task: string): AttemptPick => ({
                        task: task,
                        result: "",
                        comment: "",
                    })),
                ];
                again();
            },
        }),
    );
    const text: HTMLElement | null = row.querySelector(".picker-added-text");
    if (text !== null) lineMove(list, text);
    return [...rows, list];
}

/**
 * Rows of the chapters and their documents, once a skill is picked.
 * For my own learning the notes below their chapter, for a type its material below all chapters.
 * Every plus stands right after what it adds to, none on a line of its own.
 * A module without chapter folders keeps the row `Chapter +` empty, so the row never just disappears.
 * Taking back a chapter takes back its notes, a note its tasks and its round.
 * Notes of no chapter picked stay below, to be taken back.
 */
function chapterRowsOf(again: () => void, changed: () => void): HTMLElement[] {
    picks.attempts = picks.attempts.filter((pick: AttemptPick): boolean =>
        picks.documents.some(
            (path: string): boolean =>
                picks.chapters.includes(chapterOfDocument(path)) &&
                tasksOfDocument(path).some((task: SkillTask): boolean => task.id === pick.task),
        ),
    );
    picks.rounds = new Map(
        [...picks.rounds].filter(([path]: [string, number]): boolean => picks.documents.includes(path)),
    );
    if (picks.module === "") return [];
    const own: boolean = picks.type === "";
    const offered: Choice[] = contents.chapters
        .filter((chapter: string): boolean => !picks.chapters.includes(chapter))
        .map(choiceOf);
    const rows: HTMLElement[] = [];
    picks.chapters.forEach((chapter: string, index: number): void => {
        const row: HTMLElement = addedRowOf(
            index === 0 ? "Chapter" : "",
            chapter,
            (): void => {
                picks.chapters = picks.chapters.filter((other: string): boolean => other !== chapter);
                if (own)
                    picks.documents = picks.documents.filter(
                        (path: string): boolean => chapterOfDocument(path) !== chapter,
                    );
                again();
            },
            chapterLinkOf(chapter),
        );
        const documents: HTMLElement[] = own
            ? documentRowsOf(
                  documentChoicesOf(chapter),
                  picks.documents.filter((path: string): boolean => chapterOfDocument(path) === chapter),
                  again,
                  true,
                  changed,
              )
            : [];
        const list: HTMLElement | undefined = documents.find(
            (one: HTMLElement): boolean => one.querySelector(":scope > .picker > .picker-head > .picker-line") !== null,
        );
        const text: HTMLElement | null = row.querySelector(".picker-added-text");
        if (list !== undefined && text !== null) lineMove(list, text);
        rows.push(row, ...documents);
    });
    const first: HTMLElement | undefined = rows[0];
    const loose: string[] = picks.documents.filter(
        (path: string): boolean => !picks.chapters.includes(chapterOfDocument(path)),
    );
    if (own) rows.push(...documentRowsOf([], loose, again, false, changed));
    else if (picks.chapters.length > 0 || picks.documents.length > 0)
        rows.push(...documentRowsOf(documentChoicesOf(""), picks.documents, again, false, changed));
    if (offered.length > 0 || (contents.chapters.length === 0 && picks.chapters.length === 0 && contents.folder !== ""))
        rows.push(
            addRowOf(
                "Chapter",
                first,
                choicesOf({
                    search: searchOf(offered),
                    picked: [],
                    many: false,
                    adding: false,
                    noun: "chapter",
                    empty: "Add a chapter",
                    plus: true,
                    pick: (values: string[]): void => {
                        picks.chapters = [...picks.chapters, ...values];
                        again();
                    },
                }),
            ),
        );
    return rows;
}

/** Link of a chapter to its first note in the scripts view, empty for a chapter without notes. */
function chapterLinkOf(chapter: string): string {
    const note: string | undefined = contents.documents.find(
        (path: string): boolean => chapterOfDocument(path) === chapter,
    );
    if (note === undefined) return "";
    return `/scripts?path=${encodeURIComponent(noteOf(note))}`;
}

/** Path of a document from `NomSkillingmodules`, as the scripts view and tasks name it. */
function noteOf(path: string): string {
    return `${contents.folder.slice(modulesFolder.length + 1)}/${path}`;
}

/** Section of a note of a chapter, `undefined` for any other or a module not of the semester. */
function sectionOfDocument(path: string): SkillSection | undefined {
    const note: string = noteOf(path);
    return skilling.modules
        .flatMap((module: SkillModule): SkillSection[] => module.sections)
        .find((section: SkillSection): boolean => section.note === note);
}

/** Round of a note in the plan, its section's, empty for any other document. */
function roundOfDocument(path: string): string {
    const section: SkillSection | undefined = sectionOfDocument(path);
    return section === undefined ? "" : `Round ${section.round}`;
}

/**
 * Round of a note picked in the log, a grey box right after the name of the note.
 * It shows the round I picked, else its `X-ROUND` in the entry, else its section's round now.
 * It offers the rounds from 0 to the higher of those.
 * Only a pick is written, also of the round shown.
 * The box is no line of a picker any more, so a click on the row of the note still opens its tasks.
 */
function roundRowsOf(path: string, row: HTMLElement, again: () => void): HTMLElement[] {
    const section: SkillSection | undefined = sectionOfDocument(path);
    if (section === undefined || inPlan) return [];
    const line: RoundMark | undefined = loggedRounds.findLast(
        (mark: RoundMark): boolean => mark.section === section.title,
    );
    const shown: number = picks.rounds.get(path) ?? line?.round ?? section.round;
    const list: HTMLDivElement = rowOf(
        "",
        choicesOf({
            search: searchOf(
                Array.from({ length: Math.max(section.round, shown) + 1 }, (_: unknown, round: number): Choice => ({
                    value: String(round),
                    text: `Round ${round}`,
                    group: "",
                })),
            ),
            picked: [String(shown)],
            many: false,
            adding: false,
            noun: "round",
            textOf: (value: string): string => `Round ${value}`,
            pick: (values: string[]): void => {
                picks.rounds.set(path, values.length === 0 ? shown : Number(values[0]));
                again();
            },
        }),
    );
    const box: HTMLElement | null = list.querySelector(".picker-line");
    const text: HTMLElement | null = row.querySelector(".picker-added-text");
    if (box === null || text === null) return [list];
    lineMove(list, text);
    box.className = "block-kind round-tag";
    return [list];
}

/**
 * Rows of documents, the list `Attach` and a row per document picked, each note with its round and tasks.
 * A hint when a document picked is in the module no more, not even by its fingerprint.
 *
 * @param shown - Documents picked that these rows show, a part of all documents picked
 */
function documentRowsOf(
    choices: Choice[],
    shown: string[],
    again: () => void,
    nested: boolean,
    changed: () => void,
): HTMLElement[] {
    const added: HTMLElement[] = addedRowsOf("Attach", {
        choices: choices,
        picked: shown,
        textOf: fileNameOf,
        grouped: true,
        noun: "document",
        nested: nested,
        tagOf: inPlan ? roundOfDocument : undefined,
        change: (values: string[]): void => {
            picks.documents = [...picks.documents.filter((path: string): boolean => !shown.includes(path)), ...values];
            again();
        },
    });
    const rows: HTMLElement[] = added.flatMap((row: HTMLElement, index: number): HTMLElement[] =>
        index < shown.length
            ? [
                  row,
                  ...roundRowsOf(shown[index], row, again),
                  ...(nested ? taskRowsOf(shown[index], row, again, changed) : []),
              ]
            : [row],
    );
    if (shown.some((path: string): boolean => !contents.documents.includes(path)))
        rows.push(
            rowOf(
                "",
                hintOf("Not in the module any more, not even by its fingerprint; " + "the link stays as written"),
            ),
        );
    return rows;
}

/** Skill list of a skill entry or a series, which adds a new skill typed. */
function skillPickerOf(
    module: string,
    below: HTMLElement[],
    aside: HTMLElement[] | undefined,
    pick: (values: string[]) => void,
): HTMLElement {
    return choicesOf({
        search: moduleSearchOf(module),
        picked: module === "" ? [] : [module],
        many: false,
        adding: true,
        add: skillAdd,
        noun: "skill",
        below: below,
        aside: aside,
        newTextOf: (text: string): string | null => {
            const name: string | null = skillNewNameOf(text);
            return name === null ? null : `New skill ${name}`;
        },
        pick: pick,
    });
}

/**
 * List of the type beside the skill, a plus while none is picked.
 * A module offers its fixed types, any other skill those of its rows, which a type typed adds to.
 */
function typePickerOf(
    module: string,
    type: string,
    aside: HTMLElement[] | undefined,
    pick: (type: string) => void,
): HTMLElement {
    return choicesOf({
        search: searchOf(typesOf(module).map(choiceOf)),
        picked: type === "" ? [] : [type],
        many: false,
        adding: !moduleIs(module),
        add: (text: string): Promise<string | null> => typeAdd(module, text),
        newTextOf: (text: string): string | null => {
            const typed: string | null = typeNewOf(module, text);
            return typed === null ? null : `New type ${typed}`;
        },
        noun: "type",
        empty: "Add a type",
        plus: true,
        aside: aside,
        pick: (values: string[]): void => pick(values[0] ?? ""),
    });
}

/**
 * Shows the fields of `Skill` as picked so far.
 * Picking a skill loads its chapters and documents, with nothing below it picked.
 */
function picksShow(shown: SkillShown): void {
    const again: () => void = (): void => {
        picksShow(shown);
        shown.changed();
    };

    if (picks.module === "") picks.type = "";
    const skill: HTMLElement = skillPickerOf(
        picks.module,
        shown.summary.slice(1),
        picks.module === "" ? shown.summary.slice(0, 1) : [],
        (values: string[]): void => {
            const module: string = values[0] ?? "";
            const type: string = typesOf(module).includes(picks.type) ? picks.type : "";
            picks = picksOf({ ...picks, module: module, type: type, chapters: [] });
            contentsLoad().then(again).catch(console.error);
        },
    );
    shown.head.replaceChildren(
        rowOf(
            "Summary",
            picks.module === ""
                ? skill
                : pairOf(
                      skill,
                      typePickerOf(picks.module, picks.type, shown.summary.slice(0, 1), (type: string): void => {
                          picks.type = type;
                          again();
                      }),
                  ),
        ),
        rowOf(
            "Semester",
            choicesOf({
                search: searchOf(semesterListOf(semesterDay, contents.documents, picks.semester)),
                picked: [skillSemesterOf(semesterDay)],
                many: false,
                adding: false,
                noun: "semester",
                pick: (values: string[]): void => {
                    picks.semester = values[0] ?? "";
                    again();
                },
            }),
        ),
    );
    shownIn = shown;
    shown.more.replaceChildren(...shown.people, ...chapterRowsOf(again, shown.changed), ...loggedOf());
}

/**
 * Skill and type side by side for the dialog of a new series, the link of both below the skill.
 * What is picked goes to that form, never to the dialog of an entry.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function skillPairOf(picked: ModuleType, pick: (picked: ModuleType) => void): Promise<HTMLElement> {
    skilling = await skillingKept();
    const again: (next: ModuleType) => void = (next: ModuleType): void => {
        pick(next);
        skillPairOf(next, pick)
            .then((fresh: HTMLElement): void => pair.replaceWith(fresh))
            .catch(console.error);
    };
    const link: HTMLAnchorElement = document.createElement("a");
    link.className = "entry-address";
    folderLinkShow(link, skillNamesOf(picked).link);
    const skill: HTMLElement = skillPickerOf(
        picked.module,
        picked.module === "" ? [] : [link],
        undefined,
        (values: string[]): void => {
            const module: string = values[0] ?? "";
            again({ ...picked, module: module, type: typesOf(module).includes(picked.type) ? picked.type : "" });
        },
    );
    const pair: HTMLElement =
        picked.module === ""
            ? skill
            : pairOf(
                  skill,
                  typePickerOf(picked.module, picked.type, undefined, (type: string): void =>
                      again({ ...picked, type: type }),
                  ),
              );
    return pair;
}

/** Title, link and plan file of a skill and type as the reader writes them, empty for no skill. */
export function skillNamesOf(picked: ModuleType): {
    title: string;
    link: string;
    file: string;
} {
    const name: string = skillNameOf(picked.module);
    if (name === "") return { title: "", link: "", file: "" };
    return {
        title: picked.type === "" ? name : `${name} (${picked.type})`,
        link: linkOf(picked.module, picked.type),
        file:
            "NomManageplannings/NomManagecalendar/" +
            `${moduleName.test(name) ? "Modules" : "Skilling"}/${name}_Plan.ics`,
    };
}

/**
 * Shows the fields of `Skill` for a box of the plan or an entry of the log.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function skillFieldsShow(
    head: HTMLElement,
    more: HTMLElement,
    people: HTMLElement[],
    plan: boolean,
    values: SkillValues,
    day: string,
    changed: () => void,
    summary: HTMLElement[] = [],
): Promise<void> {
    skilling = await skillingKept();
    inPlan = plan;
    semesterDay = day;
    loggedRounds = plan ? [] : values.rounds;
    picks = picksOf({
        module: values.module,
        type: values.type,
        semester: values.semester,
        chapters: values.chapters,
    });
    await contentsLoad();
    picks.documents = documentPathsOf(values.links);
    picksShow({
        head: head,
        more: more,
        people: people,
        summary: summary,
        changed: changed,
    });
}

/** `X-CHAPTER`s and `ATTACH`es of a skill entry or box as picked. */
export type SkillLinks = {
    chapters: string[];
    documents: string[];
};

export function skillLinksRead(): SkillLinks {
    return { chapters: picks.chapters, documents: picks.documents };
}

/** Takes a new day of the dialog, the fields show again when its semester is another. */
export function skillDaySet(day: string): void {
    const before: string = semesterOf(semesterDay);
    semesterDay = day;
    if (picks.semester === "" && semesterOf(day) !== before && shownIn !== null) {
        picksShow(shownIn);
        shownIn.changed();
    }
}

export function skillModuleType(): ModuleType {
    return { module: picks.module, type: picks.type };
}

/**
 * Sends the skill entry of the log, then loads the log again.
 * A change only while the file holds the entry as the dialog opened it.
 * A task without result is left out.
 *
 * @param version - Fingerprint of the entry as the dialog opened it, empty for a new one
 * @returns `false` when the file changed the entry since the dialog opened it
 * @throws {Error} - When the reader does not take the entry for another reason
 */
export async function skillSave(
    calendar: Calendar,
    id: string,
    fields: EntryFields,
    version: string,
): Promise<boolean> {
    const attempts: AttemptNew[] = picks.attempts.flatMap((pick: AttemptPick): AttemptNew[] =>
        pick.result === ""
            ? []
            : [
                  {
                      task: pick.task,
                      result: pick.result,
                      comment: pick.result === "wrong" ? pick.comment : "",
                  },
              ],
    );
    const rounds: RoundPick[] = [...picks.rounds].flatMap(([path, round]: [string, number]): RoundPick[] => {
        const section: SkillSection | undefined = sectionOfDocument(path);
        return section === undefined ? [] : [{ section: `${picks.module}/${section.title}`, round: round }];
    });

    const saved: boolean = await skillEntrySend(
        id,
        {
            title: fields.title,
            titleLink: fields.titleLink,
            type: picks.type,
            module: picks.module,
            semester: fields.semester,
            chapters: picks.chapters,
            documents: picks.documents,
            attempts: attempts,
            rounds: rounds,
            location: fields.location,
            online: fields.online,
            onlineLink: fields.onlineLink,
            onlineChannel: fields.onlineChannel,
            onlineTitle: fields.onlineTitle,
            attendees: fields.attendees ?? [],
            planned: fields.planned,
            note: fields.note,
            start: fields.start,
            end: fields.end,
        },
        version,
    );
    if (saved) calendar.getEventSourceById("log")?.refetch();
    return saved;
}
