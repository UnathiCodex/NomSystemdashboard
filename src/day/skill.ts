/**
 * ## Skill in the entry by category
 *
 * A skill entry in the dialog, for a box of the plan and the log alike,
 * one row per field, each one line showing its value, see `choices.ts`.
 * Below the category its summary, its skill and its type side by side on one line,
 * no type for my own learning or a project, which a click opens to pick another.
 * The reader links the folder of both, which names them, see `reader/documents.ts`.
 * Its title follows skill and type, see {@link skillTitleOf}.
 * Place, times and the link of the summary come as every category has them,
 * see `categories.ts`.
 * Below them who I was with, then its semester,
 * and its chapters one after another, each with its documents.
 * Its semester says from which semester the lecture or the material is,
 * not when I did it:
 * the semester of the day of the dialog, which follows that day as I type it,
 * until I pick another from its list, never typed.
 * The Skill list shows the skills of the semester,
 * and its search every module folder, since I sometimes attend another module.
 * A module without folder yet I add there by its code and name typed,
 * which makes its empty folder in `NomSkillingmodules`, see {@link moduleFolderNameOf}.
 * Its row of `Modules.md` and its notes come later by hand.
 * Chapters come one after another once a skill is picked, see {@link chapterRowsOf}.
 * An entry keeps the name a chapter had, also once its folder has another name.
 * The list `Attach` holds the real documents the entry used,
 * see {@link documentsOfferedOf},
 * the reader writes just its path as its `ATTACH`, see `reader/documents.ts`.
 * Picks a list does not offer, like an older entry's,
 * stay as rows until I take them back.
 * The note is only my free note.
 * In the log a note of my own learning holds its tasks right below it,
 * see {@link taskRowsOf},
 * so a task always comes from the Markdown of its note, never typed.
 * A Task left without result is no attempt and is not written.
 * An Example has no result, so it is no pick here, `Next` checks it off in its round.
 * Every note of a section the entry attaches gets its line `X-ROUND`,
 * so the reader writes the round I stand in, also with no Task picked,
 * and the learning view goes on from there, see `marksOfEntry` in `reader/skill.ts`.
 * A note shows its round, which I can pick myself, see {@link roundRowsOf},
 * so I can go on with a round on purpose, like round 0 after I closed it.
 * An entry of a type, whose documents are its material, picks no tasks.
 * Every field may stay empty, the skill too.
 * Another skill or type a click on it picks for this entry alone,
 * also of a box of a series.
 * A skill entry of the log already logged shows its rounds, which stay.
 * New attempts go into the line of their section.
 * Saving sends a skill entry of the log to the reader's one writer of skill entries.
 * A skill box of the plan has the same fields but tasks and rounds,
 * which only happen in the log, and the dialog writes it itself.
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
import { dayTextOf, groupsOf, moduleLoad, semesterOf, skillEntrySend, skillingLoad } from "../skill/attempts.ts";
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

/**
 * A task picked for the entry, with its result as picked so far.
 */
type AttemptPick = {
    task: string;
    result: "right" | "wrong" | "";
    comment: string;
};

/**
 * What is picked for the skill entry so far.
 *
 * - `semester`: Empty while it is the semester of the day of the dialog,
 *   see {@link semesterDay}.
 * - `rounds`: Rounds I picked by hand,
 *   by the paths of their notes from the module folder.
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

/**
 * Skill and type of a skill entry, which boxes and the log both have.
 */
export type ModuleType = {
    module: string;
    type: string;
};

/**
 * A skill entry as the dialog opens it, empty values for a new one.
 *
 * - `semester`: Its `X-SEMESTER`, empty for a new one and an older one without.
 * - `titleLink`: The `ALTREP` of its `SUMMARY`, in the log the folder of its skill,
 *   or a web address an older entry kept.
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

/**
 * Results to pick for each task.
 */
const resultChoices: Choice[] = [
    { value: "right", text: "Right", group: "" },
    { value: "wrong", text: "Wrong", group: "" },
];

/**
 * Modules with their tasks and the lists to pick from, as kept when `Skill` was picked.
 */
let skilling: Skilling = {
    modules: [],
    skills: [],
    otherModules: [],
    folders: {},
    paths: {},
    links: {},
    types: [],
};

/**
 * Gives the modules with their tasks and the lists to pick from as the reader last sent
 * them, loaded anew after every change of a file, see `changesKept` in `../changes.ts`,
 * so picking `Skill` waits for no reckoning of the reader,
 * which takes it a fifth of a second.
 */
const skillingKept: () => Promise<Skilling> = changesKept(skillingLoad);

/**
 * What is picked so far.
 */
let picks: SkillPicks = picksOf({ module: "", type: "", semester: "", chapters: [] });

/** Gives what is picked, with no documents, attempts and rounds picked yet. */
function picksOf(picked: Omit<SkillPicks, "documents" | "attempts" | "rounds">): SkillPicks {
    return { ...picked, documents: [], attempts: [], rounds: new Map() };
}

/**
 * Path of a note of a chapter from the module folder, its chapter folder caught.
 */
const chapterNote: RegExp = /^(\d{2}_[^/]*)\/[^/]+$/;

/**
 * Code of a module of the university, two to four capitals and then three to six digits.
 */
const moduleCode: RegExp = /^[A-Z]{2,4}\d{3,6}$/;

/**
 * Umlauts and `ß` as the names of my module folders write them out.
 */
const umlauts: { [letter: string]: string } = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    Ä: "Ae",
    Ö: "Oe",
    Ü: "Ue",
    ß: "ss",
};

/**
 * Day of the dialog, whose semester the entry has while I pick none,
 * see {@link skillDaySet}.
 */
let semesterDay: string = "";

/**
 * Where the fields of `Skill` show and the call that tells the dialog of a change.
 *
 * - `people`: The row of who I was with, which `categories.ts` builds.
 * - `summary`: Pencil, link and parts of the summary,
 *   see `summaryPartsOf` in `categories.ts`.
 * - `changed`: Tells the dialog, so it shows the link of the summary anew
 *   and allows saving or not.
 */
type SkillShown = {
    head: HTMLElement;
    more: HTMLElement;
    people: HTMLElement[];
    summary: HTMLElement[];
    changed: () => void;
};

/**
 * Where the fields of `Skill` last showed, so a changed day shows its semester,
 * `null` before they show.
 */
let shownIn: SkillShown | null = null;

/**
 * Chapters and documents of the skill picked,
 * none before one is picked and for a project.
 */
let contents: ModuleContents = contentsNone();

/** Gives the contents of no skill. */
function contentsNone(): ModuleContents {
    return { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
}

/**
 * `X-ROUND`s of the skill entry of the log being changed, none for any other.
 */
let loggedRounds: RoundMark[] = [];

/**
 * Whether the dialog writes a box of the plan, which has no tasks and attempts.
 */
let inPlan: boolean = false;

/**
 * First choice of the list of types, which takes the type back.
 */
const noType: string = "None";

/**
 * Gives the paths of the documents of a skill entry or a box from its links,
 * as the list `Attach` offers them, from the folder of its module:
 * a file with its fingerprint, or one in a folder of material,
 * like the slides a lecture of my plan links without fingerprint,
 * never the folder of a chapter, which lies right in the module.
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

/**
 * Gives the link of the skill picked, one for all its entries and boxes, whatever their
 * type, as the reader gives it, see `skillLinkOf` in `reader/documents.ts`.
 */
export function skillPathOf(): string {
    return skilling.links[picks.module] ?? "";
}

/**
 * Tells whether a skill is a module, its folder in `NomSkillingmodules`,
 * the only skills with types, so a project's summary offers no type.
 */
function moduleIs(code: string): boolean {
    return (skilling.paths[code] ?? "").startsWith(`${modulesFolder}/`);
}

/**
 * Gives the name of the folder of the skill picked, which names the files of its plan
 * and its log, as the reader names it, see `skillFolderNameOf` in `reader/documents.ts`.
 */
export function skillFolderNameOf(module: string = picks.module): string {
    const path: string = skilling.paths[module] ?? "";
    return path === "" ? module : path.slice(path.lastIndexOf("/") + 1);
}

/**
 * Gives the title of the skill and type picked while I type none,
 * as the reader writes it, see `skillTitleOf` in `reader/documents.ts`.
 */
export function skillTitleOf(): string {
    const name: string = skillFolderNameOf();
    if (picks.type === "") return name;
    return name === "" ? `(${picks.type})` : `${name} (${picks.type})`;
}

/**
 * Shows the folder of the skill picked as the link below the summary, hidden for none.
 */
export function skillPathShow(link: HTMLAnchorElement): void {
    folderLinkShow(link, skillPathOf());
}

/**
 * Makes a calm grey hint in place of a picker.
 */
function hintOf(text: string): HTMLParagraphElement {
    const hint: HTMLParagraphElement = document.createElement("p");
    hint.className = "entry-none";
    hint.textContent = text;
    return hint;
}

/**
 * Builds the search of the Skill list:
 * while nothing is typed the skills of the semester and the skill picked,
 * while I type every skill and module folder that holds the words.
 * Modules stand apart from projects, each under its small grey head,
 * as the sections of the food search, see `.picker-group` in `choices.css`.
 */
function moduleSearchOf(current: string): (text: string) => Promise<Choice[]> {
    const module: (name: string) => boolean = (name: string): boolean => moduleCode.test(name);
    const named: string[] = [...skilling.skills, ...skilling.otherModules];
    const choices: Choice[] = [...named.filter(module), ...named.filter((name: string): boolean => !module(name))].map(
        (name: string): Choice => ({
            value: name,
            text: skilling.folders[name] ?? name,
            group: module(name) ? "Modules" : "Projects",
        }),
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
 * Gives the folder of a new module for the text typed in the Skill list,
 * named as my module folders are: the code in capitals, `_`,
 * and the name in CamelCase without spaces, umlauts written out, other accents gone,
 * a word all in capitals as one.
 *
 * @returns `null` for a text that makes no new module: no code first, no name after it,
 *   or the code of a skill the list has already
 */
function moduleFolderNameOf(text: string): string | null {
    const typed: RegExpMatchArray | null = text.trim().match(/^([A-Za-z]+\d+)[\s_]+(.+)$/);
    const code: string = typed?.[1].toUpperCase() ?? "";
    const words: string[] = (typed?.[2] ?? "")
        .replace(/[äöüÄÖÜß]/g, (letter: string): string => umlauts[letter])
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .split(/[^A-Za-z\d]+/)
        .filter((word: string): boolean => word !== "")
        .map((word: string): string => {
            const letters: string = word === word.toUpperCase() ? word.toLowerCase() : word;
            return letters[0].toUpperCase() + letters.slice(1);
        });
    if (!moduleCode.test(code) || words.length === 0 || skilling.folders[code] !== undefined) return null;
    return `${code}_${words.join("")}`;
}

/**
 * Makes the empty folder of a new module typed in the Skill list by the reader,
 * see `moduleMake` in `reader/notes.ts`, and adds it to the modules of the list,
 * so it is picked at once.
 *
 * @returns Code of the new module, `null` for a text that makes no new module
 * @throws {Error} - When the reader does not make it, like for a folder there already
 */
async function moduleAdd(text: string): Promise<string | null> {
    const folder: string | null = moduleFolderNameOf(text);
    if (folder === null) return null;
    await readerAsk<null>("/api/notes/module", {
        method: "POST",
        body: JSON.stringify({ folder: folder }),
    });
    const code: string = folder.slice(0, folder.indexOf("_"));
    skilling = {
        ...skilling,
        otherModules: [...skilling.otherModules, code],
        folders: { ...skilling.folders, [code]: folder },
        paths: { ...skilling.paths, [code]: `${modulesFolder}/${folder}` },
        links: { ...skilling.links, [code]: `${modulesFolder}/${folder}` },
    };
    return code;
}

/**
 * Gives the semester of the entry: the one picked, else the semester of a day.
 */
export function skillSemesterOf(day: string): string {
    return picks.semester !== "" ? picks.semester : semesterOf(day);
}

/**
 * Builds the choices of the semester, never typed: that of a day first,
 * like the day of the dialog,
 * then every semester the documents of a module are of, newest first,
 * and the one picked when it is none of them, like that of an older entry.
 */
function semesterListOf(day: string, documents: string[], picked: string): Choice[] {
    const current: string = semesterOf(day);
    const others: string[] = [...new Set([...documents.map(documentSemesterOf), picked])]
        .filter((semester: string): boolean => semester !== "" && semester !== current)
        .sort((first: string, second: string): number => semesterRankOf(second) - semesterRankOf(first));
    return [current, ...others].map(choiceOf);
}

/**
 * Gives the choices of the semester of a skill for the dialog of a series,
 * see `series.ts`, the same as the dialog of an entry offers.
 * A skill without module, like a project,
 * has only the semester of the day and the one picked.
 */
export async function semestersOf(module: string, day: string, picked: string): Promise<Choice[]> {
    const documents: string[] =
        module === ""
            ? []
            : await moduleLoad(module)
                  .then((loaded: ModuleContents): string[] => loaded.documents)
                  .catch((): string[] => []);
    return semesterListOf(day, documents, picked);
}

/**
 * Ranks a semester by its year and season, a winter after the summer of its year,
 * so the newer ranks higher.
 */
function semesterRankOf(semester: string): number {
    return Number(semester.slice(0, 4)) * 2 + (semester.endsWith("W") ? 1 : 0);
}

/**
 * Gives the semester of the folder a document lies in, empty for none.
 */
function documentSemesterOf(path: string): string {
    const semester: RegExpMatchArray | null = path
        .split("/")
        .slice(0, -1)
        .join("/")
        .match(/\d{4}[WS]/);
    return semester === null ? "" : semester[0];
}

/**
 * Gives the chapter a document belongs to, empty for a document of no chapter,
 * like the slides of a lecture.
 */
function chapterOfDocument(path: string): string {
    return path.match(chapterNote)?.[1] ?? "";
}

/**
 * Gives the documents a list `Attach` offers, in the order of their paths:
 * for my own learning the notes of a chapter,
 * for a type the files of the folder of its material, named by the type and `_`,
 * see `materialFolders` in `reader/notes.ts`,
 * in the folder of the semester of the entry.
 */
function documentsOfferedOf(chapter: string): string[] {
    const folder: string = skilling.types.includes(picks.type) ? `${picks.type}_` : "";
    const semester: string = skillSemesterOf(semesterDay);
    return contents.documents
        .filter((path: string): boolean =>
            folder === ""
                ? chapterOfDocument(path) === chapter
                : path.startsWith(folder) && documentSemesterOf(path) === semester,
        )
        .sort((first: string, second: string): number => first.localeCompare(second));
}

/**
 * Builds the choices of a list `Attach`, the name of its file as text,
 * and as group for a file of material
 * the folders between the folder of its material and it.
 */
function documentChoicesOf(chapter: string): Choice[] {
    return documentsOfferedOf(chapter).map((path: string): Choice => ({
        value: path,
        text: fileNameOf(path),
        group: chapterOfDocument(path) !== "" ? "" : path.split("/").slice(1, -1).join("/"),
    }));
}

/**
 * Gives the name of the file of a document, which says what it is.
 */
function fileNameOf(path: string): string {
    return path.split("/").at(-1) ?? path;
}

/**
 * Builds the choices of the Tasks of the chapters picked,
 * in groups by when they are due, the due ones first, a later Task with its day.
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
 * Builds the row of a task picked, below its note, see {@link taskRowsOf}:
 * its name, the line of its result, grey `Right or Wrong` until I pick one, and its ×.
 * For Wrong a field below for my comment, the cursor in it once I pick Wrong.
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

/**
 * Builds the rounds of the entry being changed, which stay, one line per line `X-ROUND`.
 */
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
 * Loads the chapters and documents of the skill picked, none for a project
 * and none for a module without folder, so its entry still opens.
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

/**
 * Gives the tasks a document offers in the log: those of a note of my own learning,
 * none for any other document nor in the plan.
 */
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
 * Builds the tasks of a note picked below its row:
 * each task picked a row of its own, indented under a second thin grey line,
 * see `.panel-nested-twice` in `choices.css`, then the list of its tasks not picked yet,
 * whose plus stands right after the name of the note, see `lineMove` in `choices.ts`.
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
 * Builds the rows of the chapters of the entry and their documents,
 * once a skill is picked:
 * each chapter picked its row, its name a link to it in the scripts view,
 * see {@link chapterLinkOf}, for my own learning its notes right below it,
 * see {@link documentRowsOf},
 * for a type the documents of its material below all chapters,
 * then the list that adds a chapter while the module has some left.
 * Every plus stands right after what it adds to, none on a line of its own.
 * A module without any chapter folder keeps the row `Chapter +` with its list empty,
 * so the row never just disappears, a project has no chapters and no row.
 * Taking back a chapter of my own learning takes back its notes too,
 * a note its tasks and the round I picked for it.
 * Documents of my own learning that belong to no chapter picked stay below,
 * to be taken back.
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

/**
 * Gives the link of a chapter picked, which opens its first note in the scripts view,
 * without the module, which the summary names,
 * empty for a chapter without notes, like one whose folder has another name now.
 */
function chapterLinkOf(chapter: string): string {
    const note: string | undefined = contents.documents.find(
        (path: string): boolean => chapterOfDocument(path) === chapter,
    );
    if (note === undefined) return "";
    return `/scripts?path=${encodeURIComponent(noteOf(note))}`;
}

/**
 * Gives the path of a document from `NomSkillingmodules`, as the scripts view takes it
 * and its section and its tasks name their note.
 */
function noteOf(path: string): string {
    return `${contents.folder.slice(modulesFolder.length + 1)}/${path}`;
}

/**
 * Gives the section of a note of a chapter, with its round,
 * `undefined` for any other document or a module not of the semester.
 */
function sectionOfDocument(path: string): SkillSection | undefined {
    const note: string = noteOf(path);
    return skilling.modules
        .flatMap((module: SkillModule): SkillSection[] => module.sections)
        .find((section: SkillSection): boolean => section.note === note);
}

/**
 * Gives the round of a note of a chapter in the plan, its section's,
 * as the scripts view shows it, empty for any other document.
 */
function roundOfDocument(path: string): string {
    const section: SkillSection | undefined = sectionOfDocument(path);
    return section === undefined ? "" : `Round ${section.round}`;
}

/**
 * Builds the round of a note picked in the log: a list whose line is the grey box
 * of the round right after the name of the note, moved there as the plus of its tasks.
 * It shows the round I picked, else the one its line `X-ROUND` in the entry names,
 * else its section's round now, and offers the rounds from 0 to the higher of those.
 * A pick, also of the round shown, is mine,
 * and the reader writes it as the line `X-ROUND`,
 * see `marksOfEntry` in `reader/skill.ts`. Without a pick nothing is written.
 * The box is no line of a picker any more,
 * so a click on the row of the note still opens its tasks, see `rowOf` in `choices.ts`.
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
 * Builds the rows of documents, see `addedRowsOf` in `choices.ts`:
 * the list `Attach` and a row per document picked of it, the name of its file,
 * no list while it offers nothing, and a hint when a document picked is in the module
 * no more, which the reader could not find by its fingerprint either.
 * Each note with its round and, inside a chapter, its tasks below it.
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

/**
 * Makes the Skill list of a skill entry or a series, see {@link moduleSearchOf},
 * which adds a new module typed, see {@link moduleAdd}.
 */
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
        add: moduleAdd,
        noun: "module",
        below: below,
        aside: aside,
        newTextOf: (text: string): string | null => {
            const folder: string | null = moduleFolderNameOf(text);
            return folder === null ? null : `New module ${folder}`;
        },
        pick: pick,
    });
}

/**
 * Makes the list of the type beside the skill, a plus while none is picked,
 * its first choice taking the type back, see {@link noType}.
 */
function typePickerOf(type: string, aside: HTMLElement[] | undefined, pick: (type: string) => void): HTMLElement {
    return choicesOf({
        search: searchOf([noType, ...skilling.types].map(choiceOf)),
        picked: type === "" ? [] : [type],
        many: false,
        adding: false,
        noun: "type",
        empty: "Add a type",
        plus: true,
        aside: aside,
        pick: (values: string[]): void => pick(values[0] === noType ? "" : (values[0] ?? "")),
    });
}

/**
 * Shows the fields of `Skill` as picked so far:
 * skill and type in the row of its summary, the type only for a module,
 * the semester below,
 * who I was with, the chapters with their documents and the rounds the entry has.
 * Picking a skill loads its chapters and documents, with nothing below it picked.
 */
function picksShow(shown: SkillShown): void {
    const again: () => void = (): void => {
        picksShow(shown);
        shown.changed();
    };

    if (!moduleIs(picks.module)) picks.type = "";
    const skill: HTMLElement = skillPickerOf(
        picks.module,
        shown.summary.slice(1),
        moduleIs(picks.module) ? [] : shown.summary.slice(0, 1),
        (values: string[]): void => {
            picks = picksOf({ ...picks, module: values[0] ?? "", chapters: [] });
            contentsLoad().then(again).catch(console.error);
        },
    );
    shown.head.replaceChildren(
        rowOf(
            "Summary",
            !moduleIs(picks.module)
                ? skill
                : pairOf(
                      skill,
                      typePickerOf(picks.type, shown.summary.slice(0, 1), (type: string): void => {
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
 * Makes skill and type side by side for the dialog of a new series,
 * see `seriesNew` in `series.ts`, the same lists as {@link picksShow},
 * with the folder they link below the skill,
 * so the plus of the type stands as high as there.
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
        (values: string[]): void =>
            again({
                ...picked,
                module: values[0] ?? "",
                type: moduleIs(values[0] ?? "") ? picked.type : "",
            }),
    );
    const pair: HTMLElement = !moduleIs(picked.module)
        ? skill
        : pairOf(
              skill,
              typePickerOf(picked.type, undefined, (type: string): void => again({ ...picked, type: type })),
          );
    return pair;
}

/**
 * Gives what a skill and a type are as the reader writes them,
 * see `skillTitleOf` and `skillLinkOf` in `reader/documents.ts`:
 * the title, the link of the skill, whatever the type, and the plan their boxes go into,
 * each empty while no skill is picked.
 */
export function skillNamesOf(picked: ModuleType): {
    title: string;
    link: string;
    file: string;
} {
    const name: string = skillFolderNameOf(picked.module);
    if (name === "") return { title: "", link: "", file: "" };
    return {
        title: picked.type === "" ? name : `${name} (${picked.type})`,
        link: skilling.links[picked.module] ?? skilling.paths[picked.module] ?? "",
        file:
            "NomManageplannings/NomManagecalendar/" +
            `${/^[A-Z]+\d+_/.test(name) ? "Modules" : "Skilling"}/${name}_Plan.ics`,
    };
}

/**
 * Shows the fields of `Skill` for a box of the plan or an entry of the log,
 * see {@link picksShow}.
 *
 * @param day - Day of the dialog, whose semester the entry has while it has none
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

/**
 * Links of a skill entry or box as picked, which the reader writes,
 * see `linksOf` in `reader/documents.ts`: its `X-CHAPTER`s and its `ATTACH`es.
 */
export type SkillLinks = {
    chapters: string[];
    documents: string[];
};

/**
 * Reads the chapters and documents picked, of a box of the plan or an entry of the log.
 */
export function skillLinksRead(): SkillLinks {
    return { chapters: picks.chapters, documents: picks.documents };
}

/**
 * Takes a new day of the dialog, as I type it:
 * while I picked no semester the entry has the semester of that day,
 * so the fields show again when that semester is another.
 */
export function skillDaySet(day: string): void {
    const before: string = semesterOf(semesterDay);
    semesterDay = day;
    if (picks.semester === "" && semesterOf(day) !== before && shownIn !== null) {
        picksShow(shownIn);
        shownIn.changed();
    }
}

/**
 * Reads the skill and the type picked, each empty while not picked.
 */
export function skillModuleType(): ModuleType {
    return { module: picks.module, type: picks.type };
}

/**
 * Sends the skill entry of the log as picked with the fields of the dialog,
 * then loads the log of the shown day again.
 * A change only while the file holds the entry as the dialog opened it,
 * see `skillEntrySend` in `../skill/attempts.ts`, else nothing.
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
