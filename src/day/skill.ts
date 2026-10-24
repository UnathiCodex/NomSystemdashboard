/**
 * ## Skill in the entry by category
 *
 * A skill entry in the dialog, for a box of the plan and the log alike, one row per field, each one line showing
 * its value, see `choices.ts`: below the category its summary, its skill and its type side by side
 * on one line, like `IN2028_BusinessAnalyticsMachineLearning` and `VO`, no type, the type empty, for my own learning
 * or a project, like `WokFlow`, which a click opens to pick another; the reader links the folder of both, which names
 * them, see `reader/documents.ts`. Its title is free, like `IN2028 Lecture 3 recap`, typed by the pencil of the summary
 * as every summary is, see `summaryPartsOf` in `categories.ts`; while I never typed it, it follows skill and type,
 * like `IN2028_BusinessAnalyticsMachineLearning (VO)`, see {@link skillTitleOf}. Then its place, its name with its pencil and its address below it, and its times, see `categories.ts`,
 * as every category has them; below them who I was with, then in this order its semester, and its chapters one after
 * another, each with its documents.
 * Its semester says from which semester the lecture or the material is, not when I did it:
 * the semester of the day of the dialog, which follows that day as I type it, until I pick another from its list,
 * never typed: that semester first, then every semester the module has material for, newest first.
 * The one Skill list shows the skills of the semester by the whole names of their folders, like
 * `IN2028_BusinessAnalyticsMachineLearning` or the project `WokFlow`, and its search every module folder,
 * since I sometimes attend another module. A module without folder yet I add there by its code and name typed,
 * like `IN2346 Deep Learning`: the last row `+ New module IN2346_DeepLearning` makes its empty folder
 * in `NomSkillingmodules`, named as my module folders are, see {@link moduleFolderNameOf}, and picks it at once;
 * its row of `Modules.md` and its notes come later by hand.
 * Chapters come one after another once a skill is picked, see {@link chapterRowsOf}: the list of an empty row
 * `Chapter` offers the chapters of my system of the module, by the names of their folders, for every type, like
 * a lecture of `02_LogisticPoissonRegression` or exam training over several; a pick closes the list and makes
 * the row the chapter's, its name a link that opens the chapter in the scripts view, without the module, which
 * the summary names, with a small × that takes it back, see `addedRowOf` in `choices.ts`, and unlocks its
 * documents; below them the next empty row `Chapter` adds the next; a module without chapters keeps the row
 * `Chapter +`, its list empty, without a grey hint. The reader writes one `X-CHAPTER` each, and an entry keeps the name a chapter had, also once
 * its folder has another name.
 * The documents are the real documents the entry used, several, each a row with a small ×, see `addedRowsOf`
 * in `choices.ts`: for my own learning, no type, the notes of each chapter picked right below it; for a type,
 * once a chapter is picked, below all chapters the files of the folder fitting the type and the semester,
 * see {@link materialFolders}, the folder of the semester like `TUM_2026W` for `2026W`: a lecture's slides
 * in `VO_UniversityLectureLessons`, the sheet of an exercise or a tutorial in `TU_UniversityTutorExercises`,
 * a homework's in `HU_UniversityHomeExercises`; a project offers none. Each document picked is its row showing
 * the name of its file, like `04_LogisticRegression.pdf`, which says what it is; the reader writes just its path
 * as its `ATTACH`, see `reader/documents.ts`. Picks a list does not offer, like an older entry's, stay as rows
 * until I take them back. The note is only my free note.
 * The tasks of the chapters picked come after the documents, the due ones first, then a result for each task picked,
 * the task judged as a whole: Right, or Wrong with a short field for my comment on what went wrong; a task left
 * without result is no attempt and is not written.
 * Any type may hold attempts, like the tasks I solved in a tutorial. Every field may stay empty, the skill too.
 * Below skill and type stands the link of the summary, small and grey, as every summary has it, see `summaryPartsOf`
 * in `categories.ts`: the folder of its skill, the path its entry links, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, for a type on into the folder
 * of its material and of the semester, like `…/VO_UniversityLectureLessons/TUM_2026W`, a folder of a module opening
 * in the scripts view, see {@link skillPathOf}; after the type the pencil of the summary, which shows its title
 * to type below them; another skill or type a click on it picks for this entry alone, also of a box of a series.
 * A skill entry of the log already logged shows its attempts, which stay; new ones are added after them.
 * Everything stays editable, its skill too, whose older attempts keep their task.
 * Saving sends a skill entry of the log to the reader's one writer of skill entries, with the times, the place
 * and the note of the dialog; a skill box of the plan has the same fields but tasks and attempts, which only happen
 * in the log, and the dialog writes it itself as a box with its chapters and documents.
 *
 * - `./choices.ts`: Pickers, each one line in a row with its name, two side by side in one row, and the rows
 *   of a field of several values.
 * - `../skill/attempts.ts`: Loads the tasks with when they are due and what a module offers, groups the tasks,
 *   writes days out and sends skill entries.
 * - `../today.ts`: Gives today's calendar date, for the tasks due.
 * - `../skill/links.ts`: Names the folder of my modules, and shows the folder of a skill as the link below its
 *   summary.
 * - `../changes.ts`: Keeps the skills with their tasks, loaded once and anew after every change of a file.
 * - `../reader.ts`: Asks the reader to make the folder of a new module.
 * - `fullcalendar`: Calendar that shows the entries.
 */

import {
    addedRowOf, addedRowsOf, addRowOf, choiceOf, choicesOf, lineMove, pairOf, rowOf, searchOf,
} from "./choices.ts";
import {
    dayTextOf, groupsOf, moduleLoad, semesterOf, skillEntrySend, skillingLoad,
} from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { folderLinkShow, modulesFolder } from "../skill/links.ts";
import { changesKept } from "../changes.ts";
import { readerAsk } from "../reader.ts";

import type { Calendar } from "fullcalendar";
import type { Choice } from "./choices.ts";
import type { EntryFields } from "./entries.ts";
import type {
    AttemptNew, Group, Link, ModuleContents, SkillModule, SkillTask, Skilling,
} from "../skill/attempts.ts";


/**
 * A task picked for the entry, with its result as picked so far.
 *
 * - `task`: Identity of the task, like `IN2028/Airline Revenue Interval`.
 * - `result`: Result, right or wrong, empty before it is picked.
 * - `comment`: My comment on what went wrong, empty when not given.
 */
type AttemptPick = {
    task: string;
    result: "right" | "wrong" | "";
    comment: string;
};

/**
 * What is picked for the skill entry so far.
 *
 * - `module`: Name of the skill, a module code like `IN2028` or a project like `WokFlow`, empty before it is picked.
 * - `type`: Its type, like `VO`, empty before it is picked and for none.
 * - `semester`: Its semester, like `2025W`, empty while it is the semester of the day of the dialog,
 *   see {@link semesterDay}.
 * - `chapters`: Names of the chapters, like `01_RegressionAnalysis`.
 * - `documents`: Paths of the documents from the module folder, in the order they were picked.
 * - `attempts`: Tasks picked, in the order they were picked, each with its result.
 */
type SkillPicks = {
    module: string;
    type: string;
    semester: string;
    chapters: string[];
    documents: string[];
    attempts: AttemptPick[];
};

/**
 * Skill and type of a skill entry, which boxes and the log both have.
 *
 * - `module`: Name of the skill, like `IN2028` or `WokFlow`, empty before it is picked.
 * - `type`: Its type, like `VO`, empty before it is picked and for none.
 */
export type ModuleType = {
    module: string;
    type: string;
};

/**
 * A skill entry as the dialog opens it, empty values for a new one.
 *
 * - `module`: Name of the skill, like `IN2028` or `WokFlow`.
 * - `type`: Its type, like `VO`, empty for none.
 * - `semester`: Its semester, its `X-SEMESTER`, like `2026W`, empty for a new one and an older one without.
 * - `title`: What it is as written, its `SUMMARY`, like `IN2028_BusinessAnalyticsMachineLearning (VO)`, in the log.
 * - `titleLink`: Its link, the `ALTREP` of its `SUMMARY`, in the log: the folder of its skill, or a web address an older entry kept;
 *   empty for none.
 * - `chapters`: Names of its chapters, in the log.
 * - `links`: Its links as the reader gave them, to its document, in the log.
 * - `attempts`: Its `X-ATTEMPT`s as the reader gave them, in the log, like `IN2028/Airline Revenue Interval;right;low`,
 *   or `140500;IN2028/Airline Revenue Interval;right` with the time of the tap when a button wrote it.
 */
export type SkillValues = {
    module: string;
    type: string;
    semester: string;
    title: string;
    titleLink: string;
    chapters: string[];
    links: Link[];
    attempts: string[];
};

/**
 * Results to pick for each task, each with its name.
 */
const resultChoices: Choice[] = [
    { value: "right", text: "Right", group: "" },
    { value: "wrong", text: "Wrong", group: "" },
];

/**
 * Modules with their tasks and the lists to pick from, as they were kept when `Skill` was picked,
 * see {@link skillingKept}.
 */
let skilling: Skilling = {
    modules: [], skills: [], otherModules: [], folders: {}, paths: {}, types: [],
};

/**
 * Gives the modules with their tasks and the lists to pick from as the reader last sent them, loaded as the code
 * of the dialog loads and anew after every change of a file, see `changesKept` in `../changes.ts`,
 * so picking `Skill` waits for no reckoning of the reader, which takes it a fifth of a second.
 */
const skillingKept: () => Promise<Skilling> = changesKept(skillingLoad);

/**
 * What is picked so far.
 */
let picks: SkillPicks = {
    module: "", type: "", semester: "", chapters: [], documents: [], attempts: [],
};

/**
 * Beginning of the name of the folder of the material of each type in a module, whose files the Documents list offers
 * for an entry of that type: a lecture's slides in `VO_UniversityLectureLessons`, the sheet of an exercise
 * in `UE_UniversityModuleExercises`, of a central exercise in `ZU_UniversityCentralExercises`, of a tutorial
 * in `TU_UniversityTutorExercises`, a homework's in `HU_UniversityHomeExercises`, an exam's
 * in `FA_UniversityModuleExaminations`, a practical course's in a folder starting with `PR_`.
 */
const materialFolders: { [type: string]: string } = {
    VO: "VO_", UE: "UE_", ZU: "ZU_", TU: "TU_", HU: "HU_", FA: "FA_", PR: "PR_",
};

/**
 * Path of a note of a chapter from the module folder, its chapter folder caught, like `01_RegressionAnalysis`
 * of `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`, see `ModuleContents`.
 */
const chapterNote: RegExp = /^(\d{2}_[^/]*)\/[^/]+$/;

/**
 * Code of a module of the university, two to four capitals and then three to six digits, like `IN2028` or `MGT1372`.
 */
const moduleCode: RegExp = /^[A-Z]{2,4}\d{3,6}$/;

/**
 * Umlauts and `ß` as the names of my module folders write them out, like `Mikrooekonomie` for `Mikroökonomie`.
 */
const umlauts: { [letter: string]: string } = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };

/**
 * Day of the dialog, like `2026-10-13`, whose semester the entry has while I pick none, see {@link skillDaySet}.
 */
let semesterDay: string = "";

/**
 * Where the fields of `Skill` show and the call that tells the dialog of a change, as last shown, so a changed day
 * shows its semester, see {@link skillDaySet}; `null` before the fields of `Skill` show.
 *
 * - `head`: Place of skill and type, below the category.
 * - `more`: Place of the fields below the times, before the note.
 * - `people`: The row of who I was with, which `categories.ts` builds, put first below the times.
 * - `summary`: Pencil, link and parts of the summary, which `categories.ts` builds as for every summary,
 *   see `summaryPartsOf` there: the pencil after the type, which shows the title to type, the link and the parts
 *   below skill and type.
 * - `changed`: Tells the dialog that what is picked changed, so it shows the link of the summary anew and allows
 *   saving or not.
 */
type SkillShown = {
    head: HTMLElement;
    more: HTMLElement;
    people: HTMLElement[];
    summary: HTMLElement[];
    changed: () => void;
};

/**
 * Where the fields of `Skill` last showed, see {@link SkillShown}, `null` before they show.
 */
let shownIn: SkillShown | null = null;

/**
 * Chapters and documents of the skill picked, as the reader gave them, none before a skill is picked and for a project.
 */
let contents: ModuleContents = { folder: "", chapters: [], documents: [], materials: {}, inner: [] };

/**
 * Time of the tap at the start of an `X-ATTEMPT` a button wrote, like `140500` for 14:05, or `14:05` in an older one,
 * see `reader/skill.ts`.
 */
const tapTime: RegExp = /^\d{2}:?\d{2}(?:\d{2})?$/;

/**
 * `X-ATTEMPT`s of the skill entry of the log being changed, which stay as they are, none for any other.
 */
let logged: string[] = [];

/**
 * Whether the dialog writes a box of the plan, which has the same fields as the log but tasks and attempts,
 * which only happen in the log.
 */
let inPlan: boolean = false;

/**
 * First choice of the list of types, which takes the type back, my own learning without type.
 */
const noType: string = "None";


/**
 * Gives the paths of the documents of a skill entry or a box from its links, as the Documents list offers them,
 * see `ModuleContents`: its files in the folder of its module from that folder; a file with its fingerprint,
 * or one in a folder of material, like the slides a lecture of my plan links without fingerprint, never the folder
 * of a chapter, which lies right in the module.
 * - `rest`: Path of a link from the folder of the module, `null` for a link outside it.
 *
 * @param links - Links of the entry, like `NomSkillingmodules/IN2028_…/VO_…/04_….pdf`
 * @returns Paths like `VO_UniversityLectureLessons/TUM_2025W/04_LogisticPoissonRegression.pdf`
 *   or `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`, in their order
 */
function documentPathsOf(links: Link[]): string[] {
    return links.flatMap((link: Link): string[] => {
        const rest: string | null = contents.folder !== "" && link.path.startsWith(`${contents.folder}/`)
            ? link.path.slice(contents.folder.length + 1) : null;
        return rest !== null && (link.fingerprint !== "" || rest.includes("/")) ? [rest] : [];
    });
}

/**
 * Gives the folders of the material of the entry below the folder of its module, which its link goes on into,
 * as the reader writes it, see `skillLinkOf` in `reader/documents.ts`: for a type the folder of its material,
 * also while the module has none yet, see `ModuleContents`, and in it the folder of the semester of the entry
 * while it is there, also empty, else as far as the module holds files there, like `VO_UniversityLectureLessons`
 * and `TUM_2026W`, or `VO_UniversityLectureLessons` alone; none for my own learning and for a project.
 * - `folder`: The folder of that semester there, like `VO_UniversityLectureLessons/TUM_2026W`, `undefined` for none.
 * - `material`: The folder of the material of the type, `undefined` for none.
 * - `semester`: Semester of the entry, like `2026W`.
 * - `inSemester`: Path of a document in the folder of the semester there, parted by `/`, `undefined` for none.
 *
 * @returns Names of the folders, like `VO_UniversityLectureLessons` and `TUM_2026W`, none for none
 */
function materialOf(): string[] {
    const material: string | undefined = contents.materials[picks.type];
    const semester: string = skillSemesterOf(semesterDay);
    const folder: string | undefined = contents.inner.find((path: string): boolean =>
        path.split("/")[0] === material && /\d{4}[WS]/.exec(path.split("/")[1] ?? "")?.[0] === semester);
    if (material !== undefined && folder !== undefined)
        return folder.split("/");
    const inSemester: string[] | undefined = contents.documents
        .map((path: string): string[] => path.split("/"))
        .find((parts: string[]): boolean => parts.length > 2 && parts[0] === material
            && /\d{4}[WS]/.exec(parts[1])?.[0] === semester);
    return material === undefined ? [] : [material, ...(inSemester?.slice(1, 2) ?? [])];
}

/**
 * Gives the folder of the skill picked, the path its entry links as the `ALTREP` of its `SUMMARY` while I type
 * no link, as the reader writes it, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, for a type
 * on into the folders of its material, see {@link materialOf}, like
 * `NomSkillingmodules/MGT1372_EntrepreneurialBusiness/VO_UniversityLectureLessons/TUM_2026W`, so it follows the type
 * and the semester as I pick them; a project its path alone, like `NomManageplannings/NomFrequencediary`.
 * - `path`: The folder of the skill picked, empty for none.
 *
 * @returns The folder, empty while no skill is picked
 */
export function skillPathOf(): string {
    const path: string = skilling.paths[picks.module] ?? "";
    return path === "" ? "" : [path, ...materialOf()].join("/");
}

/**
 * Tells whether a skill is a module, its folder in `NomSkillingmodules`, the only skills with types, like `VO`;
 * a project, like `NomSystemdashboard`, has none, so its summary offers no type.
 *
 * @param code - Name of the skill, like `IN2028` or `NomSystemdashboard`, empty for none
 * @returns Whether it is a module
 */
function moduleIs(code: string): boolean {
    return (skilling.paths[code] ?? "").startsWith(`${modulesFolder}/`);
}

/**
 * Gives the name of the folder of the skill picked, which names the files of its plan and its log, as the reader
 * names it, see `skillFolderNameOf` in `reader/documents.ts`: the last part of its folder, a skill without folder
 * by its name alone.
 * - `path`: The folder of the skill picked, empty for none.
 *
 * @returns Name like `IN2028_BusinessAnalyticsMachineLearning` or `WokFlow`, empty while no skill is picked
 */
export function skillFolderNameOf(): string {
    const path: string = skilling.paths[picks.module] ?? "";
    return path === "" ? picks.module : path.slice(path.lastIndexOf("/") + 1);
}

/**
 * Gives the title of the skill and the type picked while I type none, as the reader writes it, see `skillTitleOf`
 * in `reader/documents.ts`: the name of the folder of the skill, see {@link skillFolderNameOf}, with the type
 * in round brackets when it has one.
 * - `name`: Name of the folder of the skill, empty while none is picked.
 *
 * @returns Title like `IN2028_BusinessAnalyticsMachineLearning (VO)`, empty while neither is picked
 */
export function skillTitleOf(): string {
    const name: string = skillFolderNameOf();
    if (picks.type === "")
        return name;
    return name === "" ? `(${picks.type})` : `${name} (${picks.type})`;
}

/**
 * Shows the folder of the skill picked, see {@link skillPathOf}, as the link below the summary, small and grey,
 * see `folderLinkShow` in `../skill/links.ts`; hidden while no skill is picked.
 *
 * @param link - The link below the summary
 */
export function skillPathShow(link: HTMLAnchorElement): void {
    folderLinkShow(link, skillPathOf());
}

/**
 * Makes a calm grey hint in place of a picker, like the one for a document the module holds no more.
 *
 * @param text - Hint
 * @returns Hint
 */
function hintOf(text: string): HTMLParagraphElement {
    const hint: HTMLParagraphElement = document.createElement("p");
    hint.className = "entry-none";
    hint.textContent = text;
    return hint;
}

/**
 * Builds the search of the Skill list: while nothing is typed the skills of the semester and the skill picked,
 * while I type every skill and module folder that holds the words, the skills of the semester first.
 * Each shows the whole name of its folder, as a summary names it, like `IN2028_BusinessAnalyticsMachineLearning`,
 * a project like `WokFlow`, and is picked by its name, a module its code, like `IN2028`.
 * My modules of the university stand apart from my projects of programming, each under its small grey head,
 * `Modules` and `Projects`, a thin line between them, as the sections of the food search, see `.picker-group`
 * in `choices.css`; a module known by its code, letters then digits, like `IN2028` or `MGT1372`.
 * - `module`: Whether a skill is a module of the university.
 * - `choices`: Every skill and module, the modules first, the skills of the semester first in each, each its name
 *   as value, the name of its folder as text, its kind as group.
 * - `shown`: Skills the search looks through.
 *
 * @param current - The skill picked, which the list offers while nothing is typed; that of the dialog when left out
 * @returns Search for the picker
 */
function moduleSearchOf(current: string = picks.module): (text: string) => Promise<Choice[]> {
    const module: (name: string) => boolean = (name: string): boolean => moduleCode.test(name);
    const named: string[] = [...skilling.skills, ...skilling.otherModules];
    const choices: Choice[] = [...named.filter(module), ...named.filter((name: string): boolean => !module(name))]
        .map((name: string): Choice =>
            ({ value: name, text: skilling.folders[name] ?? name, group: module(name) ? "Modules" : "Projects" }));
    return async (text: string): Promise<Choice[]> => {
        const shown: Choice[] = text.trim() !== "" ? choices : choices.filter((choice: Choice): boolean =>
            choice.value === current || skilling.skills.includes(choice.value));
        return await searchOf(shown)(text);
    };
}

/**
 * Gives the folder of a new module for the text typed in the Skill list, its code and then its name, named as my
 * module folders are: the code in capitals, `_`, and the name in CamelCase without spaces, umlauts written out,
 * each word with a capital first, a word all in capitals as one, so `IN2346 Deep Learning` makes
 * `IN2346_DeepLearning`, `wi0021 Mikroökonomie` `WI0021_Mikrooekonomie` and `IN0042 Grundlagen IT-Sicherheit`
 * `IN0042_GrundlagenItSicherheit`; a word is letters and digits, anything else between them, like a space or `-`,
 * parts them, and other accents go, like `é` to `e`.
 * - `typed`: Code and name as typed, parted by spaces or `_`.
 * - `code`: The code in capitals, like `IN2346`.
 * - `words`: Words of the name, each as the folder writes it, like `Deep`.
 *
 * @param text - Text typed, like `IN2346 Deep Learning`
 * @returns Name of the folder, like `IN2346_DeepLearning`; `null` for a text that makes no new module: no code first,
 *   no name after it, or the code of a skill the list has already
 */
function moduleFolderNameOf(text: string): string | null {
    const typed: RegExpMatchArray | null = text.trim().match(/^([A-Za-z]+\d+)[\s_]+(.+)$/);
    const code: string = typed?.[1].toUpperCase() ?? "";
    const words: string[] = (typed?.[2] ?? "").replace(/[äöüÄÖÜß]/g, (letter: string): string => umlauts[letter])
        .normalize("NFD").replace(/\p{M}/gu, "").split(/[^A-Za-z\d]+/).filter((word: string): boolean => word !== "")
        .map((word: string): string => {
            const letters: string = word === word.toUpperCase() ? word.toLowerCase() : word;
            return letters[0].toUpperCase() + letters.slice(1);
        });
    if (!moduleCode.test(code) || words.length === 0 || skilling.folders[code] !== undefined)
        return null;
    return `${code}_${words.join("")}`;
}

/**
 * Makes the empty folder of a new module typed in the Skill list by the reader, see {@link moduleFolderNameOf}
 * and `moduleMake` in `reader/notes.ts`, and adds it to the modules of the list, so it is picked at once,
 * by its folder like every module.
 * - `folder`: Name of its folder, like `IN2346_DeepLearning`.
 * - `code`: Its code, like `IN2346`.
 *
 * @param text - Text typed, like `IN2346 Deep Learning`
 * @returns Code of the new module to pick, `null` for a text that makes no new module
 * @throws {Error} - When the reader does not make it, like for a folder there already
 */
async function moduleAdd(text: string): Promise<string | null> {
    const folder: string | null = moduleFolderNameOf(text);
    if (folder === null)
        return null;
    await readerAsk<null>("/api/notes/module", { method: "POST", body: JSON.stringify({ folder: folder }) });
    const code: string = folder.slice(0, folder.indexOf("_"));
    skilling = {
        ...skilling, otherModules: [...skilling.otherModules, code], folders: { ...skilling.folders, [code]: folder },
        paths: { ...skilling.paths, [code]: `${modulesFolder}/${folder}` },
    };
    return code;
}

/**
 * Gives the semester of the entry as it stands: the one picked, else the semester of a day.
 *
 * @param day - Day like `2026-10-13`
 * @returns Semester like `2026W`
 */
export function skillSemesterOf(day: string): string {
    return picks.semester !== "" ? picks.semester : semesterOf(day);
}

/**
 * Builds the choices of the semester, picked from them, never typed: the semester of the day of the dialog first,
 * then every semester the module has material for, by the folders of its material, like `TUM_2026S`, `TUM_2024W`
 * and `LMU_2024S` giving `2026S`, `2024W` and `2024S`, newest first, see {@link documentSemesterOf}; and the one
 * picked when it is none of them, like that of an older entry, among them by its rank.
 *
 * @returns Choices of the semester
 */
function semesterChoicesOf(): Choice[] {
    return semesterListOf(semesterDay, contents.documents, picks.semester);
}

/**
 * Builds the choices of the semester from a day, the documents of a module and the semester picked,
 * as {@link semesterChoicesOf} gives them for the dialog of an entry.
 * - `current`: The semester of the day.
 * - `others`: The other semesters, each once.
 *
 * @param day - Day like `2026-10-24`, whose semester comes first
 * @param documents - Paths of the documents of the module, like `VO_UniversityLectureLessons/TUM_2026W/01.pdf`
 * @param picked - The semester picked, like `2025W`, empty for none
 * @returns Choices of the semester
 */
function semesterListOf(day: string, documents: string[], picked: string): Choice[] {
    const current: string = semesterOf(day);
    const others: string[] = [...new Set([...documents.map(documentSemesterOf), picked])]
        .filter((semester: string): boolean => semester !== "" && semester !== current)
        .sort((first: string, second: string): number => semesterRankOf(second) - semesterRankOf(first));
    return [current, ...others].map(choiceOf);
}

/**
 * Gives the choices of the semester of a skill for a form of its own, the dialog of a series, see `series.ts`:
 * the same as the dialog of an entry offers, see {@link semesterListOf}, by the documents of its module; a skill
 * without module, like a project, has only the semester of the day and the one picked.
 * - `documents`: The documents of the module, none for none or while the reader cannot give them.
 *
 * @param module - The skill, like `IN2028` or `NomFrequencediary`
 * @param day - Day like `2026-10-24`, whose semester comes first
 * @param picked - The semester picked, like `2025W`, empty for none
 * @returns Choices of the semester
 */
export async function semestersOf(module: string, day: string, picked: string): Promise<Choice[]> {
    const documents: string[] = module === "" ? [] : await moduleLoad(module)
        .then((loaded: ModuleContents): string[] => loaded.documents)
        .catch((): string[] => []);
    return semesterListOf(day, documents, picked);
}

/**
 * Ranks a semester by its year and season, a winter after the summer of its year, so the newer ranks higher.
 *
 * @param semester - Semester like `2026W`
 * @returns Rank like 4053 for `2026W` and 4052 for `2026S`
 */
function semesterRankOf(semester: string): number {
    return Number(semester.slice(0, 4)) * 2 + (semester.endsWith("W") ? 1 : 0);
}

/**
 * Gives the semester of the folder a document lies in, like `2026W` of `TUM_2026W`.
 * - `semester`: The first semester its folders name, `null` for none.
 *
 * @param path - Path of the document from the module folder, like `VO_…/TUM_2026W/04_LogisticPoissonRegression.pdf`
 * @returns Semester like `2026W`, empty for a document in no folder of a semester
 */
function documentSemesterOf(path: string): string {
    const semester: RegExpMatchArray | null = path.split("/").slice(0, -1).join("/").match(/\d{4}[WS]/);
    return semester === null ? "" : semester[0];
}

/**
 * Gives the chapter a document belongs to, by the name of the folder of a note of a chapter,
 * like `01_RegressionAnalysis` of `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`, see {@link chapterNote}.
 *
 * @param path - Path of a document from the module folder
 * @returns Name of its chapter, empty for a document of no chapter, like the slides of a lecture
 */
function chapterOfDocument(path: string): string {
    return path.match(chapterNote)?.[1] ?? "";
}

/**
 * Gives the documents a Documents list offers, see the top of this file: for my own learning the notes of a chapter,
 * see {@link chapterOfDocument}, like `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`; for a type
 * the files of the folder of its material, see {@link materialFolders}, in the folder of the semester of the entry,
 * like `TUM_2026W` for `2026W`; each by path, in the order of their paths.
 * - `folder`: Beginning of the name of the folder of the material of the type, empty for my own learning.
 * - `semester`: Semester of the entry, like `2026W`.
 *
 * @param chapter - Chapter whose notes my own learning offers, like `01_RegressionAnalysis`
 * @returns Paths like `VO_UniversityLectureLessons/TUM_2026W/04_LogisticPoissonRegression.pdf`
 */
function documentsOfferedOf(chapter: string): string[] {
    const folder: string = materialFolders[picks.type] ?? "";
    const semester: string = skillSemesterOf(semesterDay);
    return contents.documents
        .filter((path: string): boolean => folder === "" ? chapterOfDocument(path) === chapter
            : path.startsWith(folder) && documentSemesterOf(path) === semester)
        .sort((first: string, second: string): number => first.localeCompare(second));
}

/**
 * Builds the choices of a Documents list, see {@link documentsOfferedOf}, each its path as value, the name of its file
 * as text, and as group for a file of material the folders between the folder of its material and it, like
 * `04_LogisticPoissonRegression.pdf` under `TUM_2026W`, none for a note.
 * - `parts`: Parts of the path of a document.
 *
 * @param chapter - Chapter whose notes my own learning offers, like `01_RegressionAnalysis`
 * @returns Choices of the documents
 */
function documentChoicesOf(chapter: string): Choice[] {
    return documentsOfferedOf(chapter).map((path: string): Choice => {
        const parts: string[] = path.split("/");
        if (chapterOfDocument(path) !== "")
            return { value: path, text: parts.at(-1) ?? path, group: "" };
        return { value: path, text: parts.at(-1) ?? path, group: parts.slice(1, -1).join("/") };
    });
}

/**
 * Gives the name of the file of a document, which says what it is, as its row shows it.
 *
 * @param path - Path of a document, like `VO_…/TUM_2026W/04_LogisticRegression.pdf`
 * @returns Name like `04_LogisticRegression.pdf`
 */
function fileNameOf(path: string): string {
    return path.split("/").at(-1) ?? path;
}

/**
 * Builds the choices of the tasks of the chapters picked, in groups by when they are due, the due ones first;
 * a later task shows its day.
 *
 * @param tasks - Tasks of the chapters picked
 * @returns Choices of the tasks
 */
function taskChoicesOf(tasks: SkillTask[]): Choice[] {
    return groupsOf(tasks, calendarTodayOf()).flatMap((group: Group): Choice[] =>
        group.tasks.map((task: SkillTask): Choice => ({
            value: task.id,
            text: group.name === "Later" && task.due !== "" ? `${task.name} · ${dayTextOf(task.due, true)}` : task.name,
            group: group.name,
        })));
}

/**
 * Builds the result of a task picked: its name, whole in its tooltip, the line of its result, and below that line,
 * for Wrong, the field for my comment on what went wrong.
 * - `detail`: Place of the field.
 * - `detailShow`: Shows the field for Wrong.
 *
 * @param pick - Task picked, changed as its result and comment are picked
 * @param name - Name of the task
 * @param changed - Tells the dialog that what is picked changed
 * @returns Result of the task
 */
function resultElementOf(pick: AttemptPick, name: string, changed: () => void): HTMLElement {
    const element: HTMLDivElement = document.createElement("div");
    const label: HTMLSpanElement = document.createElement("span");
    const detail: HTMLDivElement = document.createElement("div");
    const detailShow: () => void = (): void => {
        if (pick.result !== "wrong") {
            detail.replaceChildren();
            return;
        }
        const input: HTMLInputElement = document.createElement("input");
        input.type = "text";
        input.placeholder = "What went wrong";
        input.setAttribute("aria-label", "What went wrong");
        input.autocomplete = "off";
        input.value = pick.comment;
        input.addEventListener("input", (): void => {
            pick.comment = input.value.trim();
        });
        detail.replaceChildren(input);
        input.focus();
    };

    element.className = "skill-result";
    label.className = "skill-result-name";
    label.textContent = name;
    label.title = name;
    detail.className = "skill-result-detail";
    element.append(label, choicesOf({
        search: searchOf(resultChoices), picked: pick.result === "" ? [] : [pick.result], many: false, adding: false,
        pick: (values: string[]): void => {
            pick.result = values[0] === "right" || values[0] === "wrong" ? values[0] : "";
            pick.comment = "";
            detailShow();
            changed();
        },
    }), detail);
    detailShow();
    return element;
}

/**
 * Builds the attempts of the entry being changed, which stay: one line per attempt, its task and result, with my
 * comment on what went wrong, an older one also with my effort, where I got stuck or why I skipped.
 * - `parts`: An `X-ATTEMPT` cut at each `;`: task, result and comment, of an older one task, result, effort, and where
 *   I got stuck, why I skipped or what went wrong, without the time of the tap a button wrote at its start,
 *   see {@link tapTime}.
 * - `older`: Whether it is written the older way, its task with its module, a skill or another module before `/`,
 *   see `attemptLineOf` in `reader/skill.ts`, so a task of today's form keeps a `/` in its name, like `Train/Test Split`.
 *
 * @returns Attempts, none for an entry without attempts
 */
function loggedOf(): HTMLElement[] {
    if (logged.length === 0)
        return [];

    const list: HTMLUListElement = document.createElement("ul");
    list.className = "entry-skill";
    list.append(...logged.map((value: string): HTMLLIElement => {
        const parts: string[] = value.split(";");
        if (tapTime.test(parts[0]))
            parts.shift();
        const older: boolean = parts[0].includes("/")
            && [...skilling.skills, ...skilling.otherModules].includes(parts[0].split("/")[0]);
        const effort: string = older ? parts[2] ?? "" : "";
        const item: HTMLLIElement = document.createElement("li");
        item.textContent = [older ? parts[0].slice(parts[0].indexOf("/") + 1) : parts[0], parts[1],
            effort === "" ? "" : `${effort} effort`,
            parts.slice(older ? 3 : 2).join(";")].filter((part: string): boolean => part !== "").join(" · ");
        return item;
    }));
    return [rowOf("Logged", list)];
}

/**
 * Loads the chapters and documents of the skill picked, in plan and log alike, none while no skill is picked,
 * none for a project, and none for a module without folder, like a module code of the plan that has none,
 * so its entry still opens; what comes for a skill picked before another one is dropped.
 * - `module`: Skill picked when the loading starts.
 * - `none`: No chapters and no documents.
 * - `loaded`: Chapters and documents of the module.
 */
async function contentsLoad(): Promise<void> {
    const module: string = picks.module;
    const none: ModuleContents = { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
    const loaded: ModuleContents = module === "" ? none
        : await moduleLoad(module).catch((error: unknown): ModuleContents => {
            console.error(error);
            return none;
        });
    if (module === picks.module)
        contents = loaded;
}

/**
 * Builds the tasks of the chapters picked, in the log, the due ones first, see {@link taskChoicesOf}, and below them
 * a result for each task picked, see {@link resultElementOf}; drops the tasks picked that are offered no more,
 * like those of a chapter taken back. Picking tasks shows their results as they are picked, the list staying open.
 * - `module`: Module of the semester picked, with its tasks, `undefined` for another module or before one is picked.
 * - `tasks`: Tasks of the chapters picked.
 * - `results`: Place of the results of the tasks picked.
 * - `resultsShow`: Shows a result for each task picked.
 *
 * @param changed - Tells the dialog that what is picked changed, so it allows saving or not
 * @returns The row of the tasks with the results below its line, none while the chapters picked have no tasks
 */
function tasksOf(changed: () => void): HTMLElement[] {
    const module: SkillModule | undefined = skilling.modules.find((candidate: SkillModule): boolean =>
        candidate.code === picks.module);
    const tasks: SkillTask[] = module?.tasks.filter((task: SkillTask): boolean => picks.chapters.includes(task.chapter)) ?? [];
    picks.attempts = picks.attempts.filter((pick: AttemptPick): boolean =>
        tasks.some((task: SkillTask): boolean => task.id === pick.task));
    const results: HTMLDivElement = document.createElement("div");
    const resultsShow: () => void = (): void => {
        results.replaceChildren(...picks.attempts.map((pick: AttemptPick): HTMLElement => resultElementOf(pick,
            tasks.find((task: SkillTask): boolean => task.id === pick.task)?.name ?? pick.task, changed)));
    };
    if (inPlan || tasks.length === 0)
        return [];

    results.className = "skill-results";
    resultsShow();
    return [rowOf("Tasks", choicesOf({
        below: [results],
        search: searchOf(taskChoicesOf(tasks)), picked: picks.attempts.map((pick: AttemptPick): string => pick.task),
        many: true, adding: false, noun: "task",
        pick: (values: string[]): void => {
            picks.attempts = values.map((task: string): AttemptPick =>
                picks.attempts.find((pick: AttemptPick): boolean => pick.task === task)
                ?? { task: task, result: "", comment: "" });
            resultsShow();
            changed();
        },
    }))];
}

/**
 * Builds the rows of the chapters of my system the entry belongs to and of its documents, in plan and log,
 * one chapter after another, see the top of this file, once a skill is picked: each chapter picked its row,
 * the first named `Chapter`, its name a link to it in the scripts view, see {@link chapterLinkOf}, with a small ×
 * that takes it back, see `addedRowOf` in `choices.ts`, and for my own
 * learning the one plus right after its name, `Add a document` as its tooltip, and right below it, indented under
 * a thin grey line, its documents, the notes of that chapter, each with its ×, see {@link documentRowsOf}; for a type
 * the documents of its material once a chapter is picked, or while the entry has some, below all chapters; then,
 * while the module has chapters left, the list that adds one by the names of their folders, its plus beside the name
 * `Chapter`, `Add a chapter` as its tooltip, see `addRowOf` in `choices.ts`, as a meal adds its next food: every plus
 * right after what it adds to, none on a line of its own; a module without any chapter folder,
 * like `MGT1372` before its chapters are written, keeps the row `Chapter +` with its list empty, no grey hint,
 * so the row never just disappears; a project has no chapters and no row. A chapter keeps the name it has
 * in the entry, also once its folder has another name. Taking back a chapter of my own learning takes back
 * its notes too; documents of my own learning that belong to no chapter picked stay below, to be taken back.
 * Each change shows the fields again, the tasks of the chapters picked with them, see {@link tasksOf}.
 * - `own`: Whether it is my own learning, without type, whose documents belong to their chapters.
 * - `offered`: Chapters of the module not picked yet.
 * - `rows`: The rows so far.
 * - `loose`: Documents of my own learning of no chapter picked.
 *
 * @param again - Shows the fields again and tells the dialog
 * @returns The rows, none while no skill is picked
 */
function chapterRowsOf(again: () => void): HTMLElement[] {
    if (picks.module === "")
        return [];
    const own: boolean = picks.type === "";
    const offered: Choice[] = contents.chapters.filter((chapter: string): boolean => !picks.chapters.includes(chapter))
        .map(choiceOf);
    const rows: HTMLElement[] = [];
    picks.chapters.forEach((chapter: string, index: number): void => {
        const row: HTMLElement = addedRowOf(index === 0 ? "Chapter" : "", chapter, (): void => {
            picks.chapters = picks.chapters.filter((other: string): boolean => other !== chapter);
            if (own)
                picks.documents = picks.documents.filter((path: string): boolean =>
                    chapterOfDocument(path) !== chapter);
            again();
        }, chapterLinkOf(chapter));
        const documents: HTMLElement[] = own ? documentRowsOf(documentChoicesOf(chapter),
            picks.documents.filter((path: string): boolean => chapterOfDocument(path) === chapter), again, true) : [];
        const list: HTMLElement | undefined = documents.find((one: HTMLElement): boolean =>
            one.querySelector(".picker-line") !== null);
        const text: HTMLElement | null = row.querySelector(".picker-added-text");
        if (list !== undefined && text !== null)
            lineMove(list, text);
        rows.push(row, ...documents);
    });
    const first: HTMLElement | undefined = rows[0];
    const loose: string[] = picks.documents.filter((path: string): boolean =>
        !picks.chapters.includes(chapterOfDocument(path)));
    if (own)
        rows.push(...documentRowsOf([], loose, again, false));
    else if (picks.chapters.length > 0 || picks.documents.length > 0)
        rows.push(...documentRowsOf(documentChoicesOf(""), picks.documents, again, false));
    if (offered.length > 0 || (contents.chapters.length === 0 && picks.chapters.length === 0 && contents.folder !== ""))
        rows.push(addRowOf("Chapter", first, choicesOf({
            search: searchOf(offered), picked: [], many: false, adding: false, noun: "chapter",
            empty: "Add a chapter", plus: true,
            pick: (values: string[]): void => {
                picks.chapters = [...picks.chapters, ...values];
                again();
            },
        })));
    return rows;
}

/**
 * Gives the link of a chapter picked, which opens it in the scripts view in this window at its first note, like
 * `/scripts?path=IN2028_BusinessAnalyticsMachineLearning%2F01_RegressionAnalysis%2F01_01_….md`, the module already
 * named by the summary above; none for a chapter without notes, like one whose folder has another name now.
 * - `module`: Name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `note`: Path of the first note of the chapter from the module folder, `undefined` for none.
 *
 * @param chapter - Name of the chapter, like `01_RegressionAnalysis`
 * @returns Address like `/scripts?path=…`, empty for none
 */
function chapterLinkOf(chapter: string): string {
    const module: string = contents.folder.slice(modulesFolder.length + 1);
    const note: string | undefined = contents.documents.find((path: string): boolean =>
        chapterOfDocument(path) === chapter);
    if (note === undefined)
        return "";
    return `/scripts?path=${encodeURIComponent(`${module}/${note}`)}`;
}

/**
 * Builds the rows of documents, see `addedRowsOf` in `choices.ts`: the Documents list of what it offers, see
 * {@link documentChoicesOf}, and a row per document picked of it, the name of its file, see {@link fileNameOf};
 * no list while it offers nothing, like for a chapter without notes, and a hint below when a document picked
 * is in the module no more, which the reader could not find by its fingerprint either. Inside a chapter they stand
 * below it, indented under a thin grey line, see `nested` in `choices.ts`, their plus moved after the chapter's name.
 * - `rows`: The rows of the list and of the documents picked.
 *
 * @param choices - Documents the list offers, none for no list
 * @param shown - Documents picked that these rows show, a part of all documents picked
 * @param again - Shows the fields again and tells the dialog
 * @param nested - Whether they stand inside the chapter above them
 * @returns The rows, none for neither documents offered nor picked
 */
function documentRowsOf(choices: Choice[], shown: string[], again: () => void, nested: boolean): HTMLElement[] {
    const rows: HTMLElement[] = addedRowsOf("Documents", {
        choices: choices, picked: shown, textOf: fileNameOf, grouped: true, noun: "document", nested: nested,
        change: (values: string[]): void => {
            picks.documents = [...picks.documents.filter((path: string): boolean => !shown.includes(path)), ...values];
            again();
        },
    });
    if (shown.some((path: string): boolean => !contents.documents.includes(path)))
        rows.push(rowOf("",
            hintOf("Not in the module any more, not even by its fingerprint; the link stays as written")));
    return rows;
}

/**
 * Shows the fields of `Skill` as picked so far, see the top of this file: skill and type side by side in the row
 * of its summary below the category, the type only for a module, see {@link moduleIs}, and right below it the semester,
 * as the form of a series has it; below the place and the times who I was with, the chapters
 * one after another with their documents, see {@link chapterRowsOf}, and in the log the tasks of the chapters picked with a result
 * for each task picked, see {@link tasksOf}, and the attempts the entry has; the link of the summary below skill
 * and type, see {@link SkillShown}.
 * Picking a skill loads its chapters and documents and shows the fields again, with no chapters, documents or tasks
 * picked; picking a type, a semester, a chapter or a document, or taking one back, shows them again, the documents
 * offering what follows from them.
 * - `again`: Shows the fields again and tells the dialog.
 *
 * @param shown - Where the fields show, see {@link SkillShown}
 */
function picksShow(shown: SkillShown): void {
    const again: () => void = (): void => {
        picksShow(shown);
        shown.changed();
    };

    if (!moduleIs(picks.module))
        picks.type = "";
    const skill: HTMLElement = choicesOf({
        search: moduleSearchOf(), picked: picks.module === "" ? [] : [picks.module], many: false, adding: true,
        add: moduleAdd, noun: "module", below: shown.summary.slice(1),
        aside: moduleIs(picks.module) ? [] : shown.summary.slice(0, 1),
        newTextOf: (text: string): string | null => {
            const folder: string | null = moduleFolderNameOf(text);
            return folder === null ? null : `New module ${folder}`;
        },
        pick: (values: string[]): void => {
            picks = { ...picks, module: values[0] ?? "", chapters: [], documents: [], attempts: [] };
            contentsLoad().then(again).catch((error: unknown): void => console.error(error));
        },
    });
    shown.head.replaceChildren(rowOf("Summary", !moduleIs(picks.module) ? skill : pairOf(skill,
        choicesOf({
            search: searchOf([noType, ...skilling.types].map(choiceOf)), picked: picks.type === "" ? [] : [picks.type],
            many: false, adding: false, noun: "type", empty: "Add a type", plus: true,
            aside: shown.summary.slice(0, 1),
            pick: (values: string[]): void => {
                picks.type = values[0] === noType ? "" : values[0] ?? "";
                again();
            },
        }))), rowOf("Semester", choicesOf({
        search: searchOf(semesterChoicesOf()), picked: [skillSemesterOf(semesterDay)], many: false, adding: false,
        noun: "semester",
        pick: (values: string[]): void => {
            picks.semester = values[0] ?? "";
            again();
        },
    })));
    shownIn = shown;
    shown.more.replaceChildren(
        ...shown.people,
        ...chapterRowsOf(again),
        ...tasksOf(shown.changed),
        ...loggedOf(),
    );
}

/**
 * Makes skill and type side by side, as the row of the summary of the dialog has them, see {@link picksShow}, for a form
 * of its own, the dialog of a new series, see `seriesNew` in `series.ts`: the same lists, a new module typed as there,
 * see {@link moduleAdd}, and below the skill once one is picked the folder they link, small and grey, as the dialog
 * shows it, see `folderLinkShow` in `../skill/links.ts`, like `NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons`,
 * so the plus of the type stands as high as there; what is picked goes to that form, never to the dialog of an entry.
 * - `again`: Builds the pair anew in its place once something is picked, and tells the form.
 * - `link`: The folder below the skill.
 * - `pair`: The two pickers.
 *
 * @param picked - Skill and type picked so far, like `IN2028` and `VO`, each empty for none
 * @param pick - Takes skill and type once one of them is picked
 * @returns The two pickers side by side
 * @throws {Error} - When the reader cannot answer
 */
export async function skillPairOf(picked: ModuleType, pick: (picked: ModuleType) => void): Promise<HTMLElement> {
    skilling = await skillingKept();
    const again: (next: ModuleType) => void = (next: ModuleType): void => {
        pick(next);
        skillPairOf(next, pick).then((fresh: HTMLElement): void => pair.replaceWith(fresh))
            .catch((error: unknown): void => console.error(error));
    };
    const link: HTMLAnchorElement = document.createElement("a");
    link.className = "entry-address";
    folderLinkShow(link, skillNamesOf(picked).link);
    const skill: HTMLElement = choicesOf({
        search: moduleSearchOf(picked.module), picked: picked.module === "" ? [] : [picked.module], many: false,
        adding: true, add: moduleAdd, noun: "module", below: picked.module === "" ? [] : [link],
        newTextOf: (text: string): string | null => {
            const folder: string | null = moduleFolderNameOf(text);
            return folder === null ? null : `New module ${folder}`;
        },
        pick: (values: string[]): void =>
            again({ ...picked, module: values[0] ?? "", type: moduleIs(values[0] ?? "") ? picked.type : "" }),
    });
    const pair: HTMLElement = !moduleIs(picked.module) ? skill : pairOf(skill,
        choicesOf({
            search: searchOf([noType, ...skilling.types].map(choiceOf)), picked: picked.type === "" ? [] : [picked.type],
            many: false, adding: false, noun: "type", empty: "Add a type", plus: true,
            pick: (values: string[]): void => again({ ...picked, type: values[0] === noType ? "" : values[0] ?? "" }),
        }));
    return pair;
}

/**
 * Gives what a skill and a type are as the reader writes them, see `skillTitleOf` and `skillLinkOf`
 * in `reader/documents.ts`: the title they give, like `IN2028_BusinessAnalyticsMachineLearning (VO)`, the folder they
 * link, the folder of the skill and of the material of the type, like
 * `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_`, and the plan their boxes go into, like
 * `NomManageplannings/NomManagecalendar/Modules/IN2028_BusinessAnalyticsMachineLearning_Plan.ics`.
 * - `path`: The folder of the skill, empty for none.
 * - `name`: Its last part, the skill by its name without folder.
 *
 * @param picked - Skill and type, like `IN2028` and `VO`
 * @returns Title, folder and plan, each empty while no skill is picked
 */
export function skillNamesOf(picked: ModuleType): { title: string; link: string; file: string } {
    const path: string = skilling.paths[picked.module] ?? "";
    const name: string = path === "" ? picked.module : path.slice(path.lastIndexOf("/") + 1);
    if (name === "")
        return { title: "", link: "", file: "" };
    return {
        title: picked.type === "" ? name : `${name} (${picked.type})`,
        link: [path, ...picked.type === "" ? [] : [materialFolders[picked.type] ?? ""]]
            .filter((part: string): boolean => part !== "").join("/"),
        file: `NomManageplannings/NomManagecalendar/${/^[A-Z]+\d+_/.test(name) ? "Modules" : "Skilling"}/${name}_Plan.ics`,
    };
}

/**
 * Shows the fields of `Skill` for a box of the plan or an entry of the log, as it has them, see {@link picksShow}.
 *
 * @param head - Place of skill and type in the dialog, below the category
 * @param more - Place of the fields below the times, before the note
 * @param people - The row of who I was with, put first below the times
 * @param plan - Whether it is a box of the plan, which takes no tasks and attempts
 * @param values - Values of the entry, empty for a new one
 * @param day - Day of the dialog, like `2026-10-13`, whose semester the entry has while it has none
 * @param changed - Tells the dialog that what is picked changed, so it shows the link of the summary anew and allows
 *   saving or not
 * @param summary - Pencil, link and parts of the summary, see {@link SkillShown}; none when left out
 * @throws {Error} - When the reader cannot answer
 */
export async function skillFieldsShow(head: HTMLElement, more: HTMLElement, people: HTMLElement[], plan: boolean,
                                      values: SkillValues, day: string,
                                      changed: () => void, summary: HTMLElement[] = []): Promise<void> {

    skilling = await skillingKept();
    inPlan = plan;
    semesterDay = day;
    logged = plan ? [] : values.attempts;
    picks = {
        module: values.module, type: values.type, semester: values.semester, chapters: values.chapters,
        documents: [], attempts: [],
    };
    await contentsLoad();
    picks.documents = documentPathsOf(values.links);
    picksShow({ head: head, more: more, people: people, summary: summary, changed: changed });
}

/**
 * Links of a skill entry or box as picked, which the reader writes, see `linksOf` in `reader/documents.ts`.
 *
 * - `chapters`: Names of its chapters, its `X-CHAPTER`s, like `01_RegressionAnalysis`.
 * - `documents`: Paths of its documents from the folder of its skill, its `ATTACH`es.
 */
export type SkillLinks = {
    chapters: string[];
    documents: string[];
};

/**
 * Reads the chapters and documents picked, of a box of the plan or an entry of the log.
 *
 * @returns Chapters and documents, none while nothing is picked
 */
export function skillLinksRead(): SkillLinks {
    return { chapters: picks.chapters, documents: picks.documents };
}

/**
 * Takes a new day of the dialog, as I type it: while I picked no semester the entry has the semester of that day,
 * so the fields show again when that semester is another, the documents with the files of that semester,
 * and the link of the summary with the folder of that semester.
 * - `before`: Semester of the day before.
 *
 * @param day - Day like `2027-04-02`
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
 * Reads the skill and the type picked, of a box of the plan or an entry of the log.
 *
 * @returns Skill and type, each empty while not picked, the type also for none
 */
export function skillModuleType(): ModuleType {
    return { module: picks.module, type: picks.type };
}

/**
 * Sends the skill entry of the log as picked, with the times, place, people, semester, note and box of the dialog,
 * new or as the changes of the entry being changed, then loads the log of the shown day again; a change only while
 * the file holds the entry as the dialog opened it, see `skillEntrySend` in `../skill/attempts.ts`, else nothing.
 * - {@link EventSourceApi#refetch}: Loads the entries of a calendar of the reader again.
 * - `attempts`: The tasks picked with their results, as attempts to send, a task without result left out.
 * - `saved`: Whether the reader wrote it.
 *
 * @param calendar - Calendar of the day
 * @param id - Identifier of the entry being changed, empty for a new one
 * @param fields - Fields, note, times and box of the dialog
 * @param version - Fingerprint of the entry being changed as the dialog opened it, see `version` of `Entry`
 *   in `reader/calendar.ts`; empty for a new one
 * @returns Whether it is written, `false` when the file changed the entry since the dialog opened it
 * @throws {Error} - When the reader does not take the entry for another reason
 */
export async function skillSave(calendar: Calendar, id: string, fields: EntryFields,
                                version: string): Promise<boolean> {
    const attempts: AttemptNew[] = picks.attempts.flatMap((pick: AttemptPick): AttemptNew[] => pick.result === "" ? []
        : [{ task: pick.task, result: pick.result, comment: pick.result === "wrong" ? pick.comment : "" }]);

    const saved: boolean = await skillEntrySend(id, {
        title: fields.title, type: picks.type, module: picks.module, semester: fields.semester,
        chapters: picks.chapters, documents: picks.documents, attempts: attempts,
        location: fields.location, online: fields.online, onlineLink: fields.onlineLink, passcode: fields.passcode,
        attendees: fields.attendees ?? [],
        planned: fields.planned, note: fields.note,
        start: fields.start, end: fields.end,
    }, version);
    if (saved)
        calendar.getEventSourceById("log")?.refetch();
    return saved;
}
