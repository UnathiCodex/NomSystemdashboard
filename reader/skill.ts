/**
 * ## Skill
 *
 * Reads the tasks of my chapter notes and my attempts at them,
 * tells when each task is due,
 * and writes the skill entries of the log:
 * the one writer of their chapters, documents and rounds,
 * for the scripts view and the entry by category alike.
 * Only the modules of the semester have tasks, see `activeModulesRead` in `notes.ts`.
 * Their chapters and tasks are read live from the folders every time,
 * so a changed chapter changes the views too, and no list of them is kept anywhere.
 * A task is a block of a note of a chapter folder,
 * its kind by the type word of its heading:
 * `## Example. <name>` is an example, its scene and question,
 * then its steps `1.`, `2.`, …,
 * which I predict one by one.
 * `## Task. <name>` is cold, the one I solve alone, one of its variants due per round.
 * A `## Definition.` and the `## Algorithm.`, the one worked example, are theory.
 * An older note keeps its meaning:
 * `## Completion. <name>` is an example,
 * a heading `## Task. <name> (cold)` is cold, `(cold)` no part of its name,
 * and each plain `## Task. <name>` there an example.
 * Its sources are the `>` lines right below its heading, one per source,
 * each starting with its mode word, `Original:` or `Generated:`, which is left out.
 * The parts of a cold task, one per idea,
 * are its numbered list items at the start of a line, before its solution.
 *
 * A skill entry of the log is one block of learning of a type, as in the plan,
 * of any module of `NomSkillingmodules`, also one of another semester I attend,
 * or a block of work on a project of the semester, see `activeSkillsRead` in `notes.ts`,
 * which behaves like a module without chapters and tasks.
 * Its title and links, see `documents.ts`.
 * The type may stay empty for any skill, like my own learning.
 * Below them, each only when there is one:
 * - one `ATTACH` per real document it used, see `documents.ts`,
 *   the learning view attaches the note of each section I learn in it.
 *   Its `DESCRIPTION` is only my free note.
 * - its semester, `X-SEMESTER`, see `semesterFor` in `categories.ts`.
 * - one `X-CHAPTER` per chapter of my system it belongs to, of any type,
 *   several for a session over several chapters,
 *   the chapters of the sections of its rounds always among them.
 * - one `X-ROUND` per section it works on, of any type, also logged by hand,
 *   where I stand in its round and what I did in it, see {@link RoundLine}.
 *   The order of the lines is the order I did it in.
 * Every attempt stands in the line of its section, so no task is solved outside a round.
 * A button of a task writes into the skill entry of the moment:
 * the last one of the task's module that started before now
 * and ended at most half an hour ago.
 * It grows to the end of the quarter hour of the attempt,
 * so the half hour of a pause counts from the attempt.
 * Without one, a new entry starts, covering the quarter hour of the attempt,
 * so the rounds do the skill box of the module, see `skillBoxOf` in `boxes.ts`.
 *
 * Due by my protocol, per section, a note,
 * as `~/NomWorkspace/.claude/skills/learn/SKILL.md` says it,
 * see `## session`:
 * round 0 is its whole theory, its first Example and its first Task,
 * gone over until the Task is right, since the first can only succeed.
 * Every later round its theory from my head and the next Task not solved yet.
 * A wrong Task brings the next unused Example,
 * then the Task again, which then counts as right.
 * Wrong again, the next round comes 2 days later and the spacing starts over.
 * One Example per round. The Task decides the round and writes the day of the next one
 * into its line as `DUE`, see {@link dueOf}.
 * After round 0 the next round comes 1 day later, then 7, then 21 days later.
 * After the fourth it is ready, three runs spaced after the first,
 * and comes back about 14 days before its exam,
 * with one keep-up check halfway when the exam lies more than 6 weeks off,
 * see {@link exams} (Cepeda 2008, Rohrer 2005).
 * A right Task before its day counts as none, so the runs stay spaced.
 */

import ICAL from "ical.js";
import { boxDone, boxOpenFind, skillBoxesRead, skillBoxOf, studyBoxOf } from "./boxes.ts";
import {
    berlinDateOf,
    dayAdd,
    entriesRead,
    entryAppend,
    entryChange,
    entryFind,
    propertiesPut,
    roundPropertyOf,
} from "./calendar.ts";
import { attendeesAllow, semesterFor, skillName, skillTypes } from "./categories.ts";
import { logFileOf } from "./day.ts";
import {
    chaptersOf,
    documentLinksOf,
    linksOf,
    skillFolderOf,
    skillLinkOf,
    skillTitleOf,
    titleOf,
} from "./documents.ts";
import {
    activeModulesRead,
    activeSkillsRead,
    codeOf,
    fileRead,
    moduleContentsRead,
    moduleFolderOf,
    moduleFoldersRead,
    modulesRead,
} from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { modulesFolder, projectOf, skillLog, skillNameOf } from "./sources.ts";

import type { Box } from "./boxes.ts";
import type {
    Attendee,
    Entry,
    EntryFields,
    Link,
    Online,
    RoundMark,
} from "./calendar.ts";
import type { Chapter, ModuleContents, NoteEntry, NotesModule } from "./notes.ts";

/** Result of a cold Task. */
export type Result = "right" | "wrong";

/** Kind of a task, see the top of this file. */
export type Kind = "example" | "cold";

/**
 * A task as a chapter note holds it.
 * Its identity is its module and its name, `<module>/<name>`, not its note or chapter,
 * so it keeps its history when it moves.
 * A task whose wording improves keeps its heading and with it its history.
 * A task thrown away disappears, and its attempts stay in the log,
 * because they happened, but count nowhere.
 * Names are unique within a module.
 * A renamed one takes its attempts along, see {@link taskRename}.
 */
export type Task = {
    id: string;
    name: string;
    heading: string;
    kind: Kind;
    source: string;
    note: string;
    chapter: string;
    section: string;
    parts: string[];
};

/**
 * An attempt at a task, as the views show it, read from the lines `X-ROUND` of the log:
 * a result of a cold Task, or an Example I checked off, which reads as right.
 * Its `order` is its place among all my attempts, the oldest first.
 */
export type Attempt = {
    day: string;
    order: number;
    result: Result;
    error: string;
};

/**
 * A {@link Task} with when it is due, see the top of this file.
 * Its `due` is the day of the next round of its section for its cold Task of that round,
 * empty for any other task.
 */
export type SkillTask = Task & {
    due: string;
    done: boolean;
    level: number;
    ready: boolean;
    attempts: Attempt[];
};

/**
 * A section of a module, a note of a chapter, with the state of its rounds,
 * the unit of the ready number, read from the lines `X-ROUND` of the log alone.
 *
 * - `round`: The round shown: one going on, or closed today,
 *   else the next one, see {@link sectionOf}.
 * - `runs`: Its runs that count, decided before today, so it stays the whole day.
 * - `rightDue`, `wrongDue`: Day the next round comes after a right Task today,
 *   or a Task wrong for good today.
 * - `at`: Key of the step of the round shown I am at, by the last `Next`.
 * - `today`: What of it is due today, see {@link todayMarked}.
 */
export type SkillSection = {
    title: string;
    note: string;
    chapter: string;
    cold: string;
    example: string;
    algorithm: string;
    tasks: number;
    tried: number;
    round: number;
    ladder: boolean;
    runs: number;
    day: string;
    rightDue: string;
    wrongDue: string;
    at: string;
    closed: boolean;
    results: Result[];
    used: boolean;
    days: string[];
    today: SectionToday;
};

/** What of a section is due today, see {@link todayMarked}. */
export type SectionToday = "task" | "new" | "";

/**
 * A line `X-ROUND` of a skill entry of the log, see `RoundMark` in `calendar.ts`,
 * so where I am and what I did lives in the log alone, never in the browser or the note:
 * one line per section in a skill entry, written anew in its place as I go on.
 * Its step is the one I went on to with `Next`, where the round goes on,
 * also in another session, or `done` once I closed the round by hand.
 * The steps before the step count as passed.
 * Every skill entry that links the note of a section holds one,
 * also one I logged by hand,
 * see {@link markStartOf}, and every line links its note, see {@link linksWith},
 * so no attempt stands outside a round.
 * The lines of a section in a row with the same round are that round,
 * so a round I did not close goes on over days and entries until I close it.
 * A step is named by its key, its heading as written.
 */
type RoundLine = {
    entry: string;
    day: string;
    section: string;
    round: number;
    step: string;
    task: string;
    example: string;
    results: string[];
    notes: string[];
    due: string;
};

/**
 * A round of a section, its lines `X-ROUND` in a row with the same round.
 * Its `decided` is the day of the line whose result decided it, see {@link decidedIs}.
 */
type Round = {
    round: number;
    lines: RoundLine[];
    closed: boolean;
    task: string;
    example: string;
    results: Result[];
    decided: string;
    due: string;
};

/** Where I stand in a round, as the scripts view sends it, see {@link roundAdd}. */
export type RoundNew = {
    section: string;
    round: number;
    step: string;
};

/** A round I picked by hand for a note of a skill entry, as its dialog sends it. */
export type RoundPick = {
    section: string;
    round: number;
};

/** The exam of a module, its day estimated until the university names it. */
export type ExamDate = {
    day: string;
    estimated: boolean;
};

/** A module of the semester with its tasks and its sections, each name once. */
export type SkillModule = {
    code: string;
    title: string;
    exam: ExamDate;
    tasks: SkillTask[];
    sections: SkillSection[];
};

/**
 * Everything the scripts view shows of my tasks,
 * and the skill entries of the day pick from.
 * Its `skills` go by their names, see {@link skillNameOf},
 * its `otherModules` are for the search of the Skill picker, which reaches every module.
 * Its folders, paths and links of each, see `documents.ts`.
 */
export type Skilling = {
    modules: SkillModule[];
    skills: string[];
    otherModules: string[];
    folders: { [name: string]: string };
    paths: { [name: string]: string };
    links: { [name: string]: string };
    types: string[];
};

/**
 * A new attempt, as a button of a task sends it,
 * and as each attempt of a skill entry of the dialog comes,
 * written into the line `X-ROUND` of its section, see {@link markTried}.
 * An Example is only ever `right`, a comment comes only with `wrong`.
 */
export type AttemptNew = {
    task: string;
    result: Result;
    comment: string;
};

/**
 * A new skill entry of the log, as the entry by category sends it.
 * An empty field is not written.
 *
 * - `titleLink`: Typed, left out or empty the one all entries of its skill share,
 *   see `titleOf` in `documents.ts`.
 * - `semester`: The semester of its day when empty.
 * - `documents`: Paths from the folder of its skill.
 * - `online` fields: As for any entry of the log, see `EntryNew` in `day.ts`,
 *   left out by a sender that does not know them,
 *   so it keeps them or takes those of its box.
 * - `planned`: Identifier of the box it is logged from, written as its `RELATED-TO`.
 */
export type SkillEntryNew = Partial<Online> & {
    title: string;
    titleLink?: string;
    type: string;
    module: string;
    semester: string;
    chapters: string[];
    documents: string[];
    attempts: AttemptNew[];
    rounds: RoundPick[];
    location: string;
    attendees?: Attendee[];
    planned: string;
    note: string;
    start: string;
    end: string;
};

/**
 * A changed skill entry of the log, as the entry by category sends it.
 * Its `attempts` are only the new ones, added after those it has.
 * Its box stays as it is, and its place keeps its link while it stays the same place.
 * Its `version` is its fingerprint as the dialog opened it,
 * so the reader writes nothing older than the file, see {@link skillEntryEdit}.
 */
export type SkillEntryChange = SkillEntryNew & { id: string; version: string };

/** A session of a module running now, see {@link sessionRead}. */
export type Session = {
    module: string;
    type: string;
    title: string;
    start: string;
    end: string;
};

/** A module of the semester with the tasks of its chapter notes. */
type ModuleTasks = {
    code: string;
    title: string;
    tasks: Task[];
};

/** An attempt as the log holds it, with its task. */
type LoggedAttempt = {
    task: string;
    attempt: Attempt;
};

/** Where the decided rounds of a section leave it, see {@link levelsOf}. */
type Levels = { level: number; runs: number; due: string };

/** Step of a line `X-ROUND` once I closed its round. */
const roundDone: string = "done";

/** Days until the next round of a section after its Task stayed wrong. */
const retryDays: number = 2;

/**
 * Days until a section is due again after its first, second and third right run.
 * After the fourth, one more than there are gaps,
 * it is ready and due before its exam, see {@link dueAfter}.
 */
const spacingDays: number[] = [1, 7, 21];

/** Days before its exam a ready section comes back once more, cold. */
const examDays: number = 14;

/**
 * Days between a ready section and its exam beyond
 * which one keep-up check lies halfway between,
 * since without one 70 % fell to 24 % in 9 weeks (Rohrer 2005).
 */
const keepUpDays: number = 42;

/**
 * Runs a section must have before the next section comes new,
 * and every section of a chapter before the next chapter opens by itself,
 * see {@link todayMarked}: 2, so each passed round 0 and round 1,
 * and the day after a section comes new holds its run 1 day later, no new one.
 */
const openRuns: number = 2;

/**
 * Estimated exams of the modules of the semester
 * whose exam the university has not named yet, by their codes.
 * A named exam stands in the plan of its module as a box of the type `FA`, which wins,
 * see {@link examOf}.
 * IN2028 is estimated from its endterms of the last years,
 * all on the last Thursday or so of February:
 * 28.02.2022, 29.02.2024, 27.02.2025.
 */
export const exams: { [code: string]: ExamDate } = {
    IN2028: { day: "2027-02-25", estimated: true },
};

/**
 * Exam of a module whose exam is not listed:
 * the first Monday of the exam period after the lectures of 2026W,
 * the earliest it could be, so the last runs come in time.
 */
const examDefault: ExamDate = { day: "2027-02-15", estimated: true };

/** Days the plan is searched for exams, a year, so a series without end stops. */
const planDays: number = 366;

/** Part of a cold task, a numbered list item at the start of a line. */
const partLine: RegExp = /^(\d+)\.\s/;

/** A quarter hour in milliseconds, the step of the day view. */
const quarterHour: number = 15 * 60 * 1000;

/** Longest pause after a skill entry in which a button still writes into it. */
const sessionPause: number = 30 * 60 * 1000;

/** Heading of a task, also the older `## Completion.` and `(cold)` forms. */
const taskHeading: RegExp =
    /^## ((Example|Completion|Task)\.[ \t]+(.+?)(?:[ \t]+(\(cold\)))?)[ \t]*$/;

/** Heading of the Algorithm of a note, the one worked example. */
const algorithmHeading: RegExp = /^##[ \t]+(Algorithm\.[ \t]+.+?)[ \t]*$/;

/** Heading of a cold task written the older way, which marks the whole note so. */
const olderCold: RegExp = /^## Task\.[ \t]+.+[ \t]+\(cold\)[ \t]*$/;

/** Source line of a task, its mode word left out. */
const sourceLine: RegExp = /^>[ \t]*(?:(?:Original|Generated):[ \t]*)?(.*?)[ \t]*$/;

/** Gives the name of a section, the name of its note without `.md`. */
function sectionTitleOf(note: string): string {
    return (note.split("/").at(-1) ?? note).replace(/\.md$/, "");
}

/**
 * Reads the numbers of the parts of a cold task, each once,
 * from below its heading to the next heading,
 * which is its solution or the next block.
 */
function partsOf(lines: string[], index: number): string[] {
    const end: number = lines.findIndex(
        (line: string, at: number): boolean => at > index && line.startsWith("#"),
    );
    const body: string[] = lines.slice(index + 1, end === -1 ? lines.length : end);
    return [
        ...new Set(
            body.flatMap(
                (line: string): string[] => partLine.exec(line)?.slice(1, 2) ?? [],
            ),
        ),
    ];
}

/** Gives the sources of a task, its source lines joined by `, `. */
function sourceOf(lines: string[], index: number): string {
    const end: number = lines.findIndex(
        (line: string, at: number): boolean => at > index && !line.startsWith(">"),
    );
    const quotes: string[] = lines.slice(index + 1, end === -1 ? lines.length : end);
    return quotes
        .map((line: string): string => sourceLine.exec(line)?.[1] ?? "")
        .filter((source: string): boolean => source !== "")
        .join(", ");
}

/**
 * Tells the kind of a task by the type word of its heading, see the top of this file.
 * In a note written the older way only a `Task.` with `(cold)` is cold.
 */
function kindOf(word: string, cold: boolean, older: boolean): Kind {
    return word === "Task" && (!older || cold) ? "cold" : "example";
}

/**
 * Gives the heading of the Algorithm of a note, its first, empty for none.
 *
 * @throws {Error} - When the note cannot be read
 */
function algorithmOf(note: string): string {
    return (
        fileRead(note)
            .content.toString("utf8")
            .split(/\r?\n/)
            .map((line: string): string => algorithmHeading.exec(line)?.[1] ?? "")
            .find((heading: string): boolean => heading !== "") ?? ""
    );
}

/**
 * Reads the tasks of a note in their order.
 *
 * @throws {Error} - When the note cannot be read
 */
function noteTasksRead(code: string, chapter: string, note: string): Task[] {
    const lines: string[] = fileRead(note).content.toString("utf8").split(/\r?\n/);
    const section: string = sectionTitleOf(note);
    const older: boolean = lines.some((line: string): boolean => olderCold.test(line));
    return lines.flatMap((line: string, index: number): Task[] => {
        const heading: RegExpExecArray | null = taskHeading.exec(line);
        if (heading === null) return [];
        const kind: Kind = kindOf(heading[2], heading[4] !== undefined, older);
        return [
            {
                id: `${code}/${heading[3]}`,
                name: heading[3],
                heading: heading[1],
                kind: kind,
                source: sourceOf(lines, index),
                note: note,
                chapter: chapter,
                section: section,
                parts: kind === "cold" ? partsOf(lines, index) : [],
            },
        ];
    });
}

/**
 * Reads the modules of the semester with their tasks, live from the folders,
 * in the order of the menu of the scripts view, also those without tasks.
 *
 * @throws {Error} - When a folder or note cannot be read
 */
function moduleTasksRead(): ModuleTasks[] {
    return modulesRead().map((module: NotesModule): ModuleTasks => ({
        code: codeOf(module.name),
        title: module.title,
        tasks: module.chapters.flatMap((chapter: Chapter): Task[] =>
            chapter.notes.flatMap((note: NoteEntry): Task[] =>
                noteTasksRead(codeOf(module.name), chapter.title, note.path),
            ),
        ),
    }));
}

/**
 * Reads every task of the modules of the semester.
 *
 * @throws {Error} - When a folder or note cannot be read
 */
function tasksRead(): Task[] {
    return moduleTasksRead().flatMap((module: ModuleTasks): Task[] => module.tasks);
}

/** Reads the skill entries of the log that overlap a range, the end excluded. */
function skillEntriesRead(start: string, end: string): Entry[] {
    return entriesRead(skillLog, start, end)
        .filter((entry: Entry): boolean => entry.category === skillName)
        .sort((first: Entry, second: Entry): number =>
            first.start.localeCompare(second.start),
        );
}

/**
 * Reads the lines `X-ROUND` of all skill entries of the log up to now, in order,
 * each section, Task and Example with its module, the module of its entry
 * unless the section names its own, once the entry's skill changed.
 */
function roundsRead(): RoundLine[] {
    return skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).flatMap(
        (entry: Entry): RoundLine[] => {
            const day: string = berlinDateOf(new Date(entry.start));
            return entry.rounds.map((mark: RoundMark): RoundLine =>
                lineOf(mark, entry.module, entry.id, day),
            );
        },
    );
}

/** Gives the name in the heading of a task, after its type word. */
function nameOf(heading: string): string {
    return heading.slice(heading.indexOf(". ") + 2);
}

/**
 * Reads my attempts from the lines `X-ROUND` in their order:
 * per line its Example checked off,
 * then each result of its Task with my comment on a wrong one.
 */
function attemptsOf(lines: RoundLine[]): LoggedAttempt[] {
    let order: number = 0;
    return lines.flatMap((line: RoundLine): LoggedAttempt[] => {
        const own: LoggedAttempt[] = [];
        if (line.example !== "")
            own.push({
                task: line.example,
                attempt: { day: line.day, order: order++, result: "right", error: "" },
            });
        let wrongs: number = 0;
        line.results.forEach((result: string): void => {
            own.push({
                task: line.task,
                attempt: {
                    day: line.day,
                    order: order++,
                    result: result as Result,
                    error: result === "wrong" ? (line.notes[wrongs++] ?? "") : "",
                },
            });
        });
        return own;
    });
}

/**
 * Tells whether a round is over on a day: I closed it,
 * or its Task decided it on a day before, so a round decided in a unit I logged by hand
 * and never closed lets the next one start.
 */
function overIs(round: Round, day: string): boolean {
    return round.closed || (round.decided !== "" && round.decided < day);
}

/** Gives the rounds of a section from its lines, a round over ending its own. */
function roundsOf(lines: RoundLine[]): Round[] {
    const rounds: Round[] = [];
    lines.forEach((line: RoundLine): void => {
        const last: Round | undefined = rounds.at(-1);
        if (last === undefined || overIs(last, line.day) || last.round !== line.round)
            rounds.push({
                round: line.round,
                lines: [],
                closed: false,
                task: "",
                example: "",
                results: [],
                decided: "",
                due: "",
            });
        const round: Round = rounds[rounds.length - 1];
        round.lines.push(line);
        round.closed = line.step === roundDone;
        if (line.task !== "") round.task = line.task;
        if (line.example !== "") round.example = line.example;
        round.results.push(...(line.results as Result[]));
        if (round.decided === "" && decidedIs(round)) {
            round.decided = line.day;
            round.due = line.due;
        }
    });
    return rounds;
}

/**
 * Tells whether the Task of a round decided it, see `SKILL.md`:
 * right, also right after a wrong one and its Example,
 * in a later round wrong for good, wrong twice or wrong once I closed it.
 * Round 0 ends only right, since its first Task can only succeed.
 */
function decidedIs(round: Round): boolean {
    if (round.results.at(-1) === "right") return true;
    if (round.round === 0 || round.results.length === 0) return false;
    return (
        round.closed ||
        round.results.filter((result: Result): boolean => result === "wrong").length >= 2
    );
}

/** Gives whole days from one day to another, below 0 when `to` lies before `from`. */
function daysBetween(from: string, to: string): number {
    return Math.round(
        (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
            (24 * 60 * 60 * 1000),
    );
}

/**
 * Tells when a section is due after a run on a day, see the top of this file,
 * nothing once the last check before the exam is done.
 */
function dueAfter(level: number, day: string, exam: ExamDate): string {
    if (level <= spacingDays.length) return dayAdd(day, spacingDays[level - 1]);
    const check: string = dayAdd(exam.day, -examDays);
    if (day >= check) return "";
    return daysBetween(day, exam.day) > keepUpDays
        ? dayAdd(day, Math.floor(daysBetween(day, check) / 2))
        : check;
}

/**
 * Walks the decided rounds of a section in order, see the top of this file:
 * a right one counts as a run once decided on or after the day it was due,
 * one before counts as none, so the runs stay spaced.
 * One wrong for good starts the spacing over,
 * since all other rounds planned for the section fall away (`SKILL.md`).
 */
function levelsOf(rounds: Round[], before: string): Levels {
    let level: number = 0;
    let runs: number = 0;
    let due: string = "";
    rounds
        .filter((round: Round): boolean => round.decided !== "" && round.decided < before)
        .forEach((round: Round): void => {
            if (round.results.at(-1) !== "right") level = 0;
            else if (due === "" || round.decided >= due) {
                level = Math.min(level + 1, spacingDays.length + 1);
                runs++;
            }
            due = round.due;
        });
    return { level: level, runs: runs, due: due };
}

/**
 * Tells when the next round of a section comes once its Task decides a round on a day,
 * written as `DUE` into the line that decides it, so the log holds it:
 * after a Task wrong for good 2 days later,
 * after a right one by the spacing, see {@link dueAfter}, unless it came before its day,
 * which keeps the day it was due.
 */
function dueOf(earlier: Round[], result: Result, day: string, exam: ExamDate): string {
    if (result !== "right") return dayAdd(day, retryDays);
    const { level, due }: Levels = levelsOf(earlier, "9999-12-31");
    if (due !== "" && day < due) return due;
    return dueAfter(Math.min(level + 1, spacingDays.length + 1), day, exam);
}

/**
 * Gives the cold Task of a round of a section, see `SKILL.md`:
 * the one its lines name, else the first variant not solved right yet,
 * so round 0 takes the first. Once every variant is solved, they take turns.
 */
function coldOf(colds: Task[], rounds: Round[], shown: Round | undefined): string {
    if (shown !== undefined && shown.task !== "") return shown.task;
    if (colds.length === 0) return "";
    const solved: (task: Task) => boolean = (task: Task): boolean =>
        rounds.some(
            (round: Round): boolean =>
                round.task === task.id && round.results.includes("right"),
        );
    return (
        colds.find((task: Task): boolean => !solved(task)) ??
        colds[
            rounds.filter((round: Round): boolean => round.task !== "").length %
                colds.length
        ]
    ).id;
}

/**
 * Gives the Example of a round of a section:
 * the one its lines name, else the first of the note no round checked off.
 */
function exampleOf(examples: Task[], rounds: Round[], shown: Round | undefined): string {
    if (shown !== undefined && shown.example !== "") return shown.example;
    return (
        examples.find(
            (task: Task): boolean =>
                !rounds.some((round: Round): boolean => round.example === task.id),
        )?.id ?? ""
    );
}

/**
 * Builds a section of a module with its tasks, from its note and its lines `X-ROUND`:
 * the round shown is the last one while it is not over, see {@link overIs},
 * or on the day it ended, else the next one, round 0 for a section never begun.
 * It is due today as `new` while its round 0 began,
 * see {@link todayMarked} for the next one,
 * as `task` while a later round is shown or its next round is due.
 * Its cold Task of the round is due on the day of the next round, its Examples never.
 */
function sectionOf(
    own: Task[],
    lines: RoundLine[],
    attemptsOf: (task: Task) => Attempt[],
    today: string,
    exam: ExamDate,
): [SkillSection, SkillTask[]] {
    const colds: Task[] = own.filter((task: Task): boolean => task.kind === "cold");
    const examples: Task[] = own.filter((task: Task): boolean => task.kind === "example");
    const rounds: Round[] = roundsOf(lines);
    const last: Round | undefined = rounds.at(-1);
    const shown: Round | undefined =
        last !== undefined &&
        (!overIs(last, today) || (last.lines.at(-1)?.day ?? "") >= today)
            ? last
            : undefined;
    const round: number = shown?.round ?? (last === undefined ? 0 : last.round + 1);
    const all: Levels = levelsOf(rounds, "9999-12-31");
    const before: Levels = levelsOf(rounds, today);
    const cold: string = coldOf(colds, rounds, shown);
    const days: string[] = [
        ...new Set(lines.map((line: RoundLine): string => line.day)),
    ].sort();
    const marked: SectionToday =
        cold === ""
            ? ""
            : round === 0
              ? days.length > 0
                  ? "new"
                  : ""
              : shown !== undefined || (all.due !== "" && all.due <= today)
                ? "task"
                : "";
    const earlier: Round[] = shown === undefined ? rounds : rounds.slice(0, -1);
    return [
        {
            title: own[0].section,
            note: own[0].note,
            chapter: own[0].chapter,
            cold: cold,
            example: exampleOf(examples, rounds, shown),
            algorithm: algorithmOf(own[0].note),
            tasks: own.length,
            tried: own.filter((task: Task): boolean => attemptsOf(task).length > 0)
                .length,
            round: round,
            ladder: round === 0,
            runs: before.runs,
            day: shown?.lines[0].day ?? today,
            rightDue: cold === "" ? "" : dueOf(earlier, "right", today, exam),
            wrongDue: cold === "" ? "" : dayAdd(today, retryDays),
            at:
                shown === undefined || shown.closed
                    ? ""
                    : (shown.lines.at(-1)?.step ?? ""),
            closed: shown?.closed ?? false,
            results: shown?.results ?? [],
            used: (shown?.example ?? "") !== "",
            days: days,
            today: marked,
        },
        own.map((task: Task): SkillTask => ({
            ...task,
            due: task.id === cold ? all.due : "",
            done:
                task.kind === "example" &&
                rounds.some((done: Round): boolean => done.example === task.id),
            level: task.kind === "cold" ? all.level : 0,
            ready: task.kind === "cold" && all.level > spacingDays.length,
            attempts: attemptsOf(task),
        })),
    ];
}

/**
 * Marks the next section of a module to learn new today, which the plan of today holds,
 * see `suggestions.ts`:
 * while no section is on a begun round 0,
 * the first section not begun yet of an open chapter,
 * one at a time, once the section before it, when begun, has {@link openRuns} runs.
 * The first chapter opens by a skill box of my plan that names it, see {@link openedOf},
 * a later one too, or by itself once every section of the chapter before has them.
 */
function todayMarked(sections: SkillSection[], opened: string[]): SkillSection[] {
    const tasked: (section: SkillSection) => boolean = (section: SkillSection): boolean =>
        section.cold !== "";
    const begun: (section: SkillSection) => boolean = (section: SkillSection): boolean =>
        section.days.length > 0;
    if (sections.some((section: SkillSection): boolean => section.today === "new"))
        return sections;
    const chapters: string[] = [
        ...new Set(
            sections
                .filter(tasked)
                .map((section: SkillSection): string => section.chapter),
        ),
    ];
    const open: (chapter: string) => boolean = (chapter: string): boolean =>
        opened.includes(chapter) ||
        (chapters.indexOf(chapter) > 0 &&
            sections
                .filter(
                    (section: SkillSection): boolean =>
                        tasked(section) &&
                        section.chapter === chapters[chapters.indexOf(chapter) - 1],
                )
                .every((section: SkillSection): boolean => section.runs >= openRuns));
    const next: SkillSection | undefined = sections.find(
        (section: SkillSection): boolean =>
            tasked(section) && !begun(section) && open(section.chapter),
    );
    if (next === undefined) return sections;
    const before: SkillSection | undefined = sections
        .slice(0, sections.indexOf(next))
        .findLast(tasked);
    if (before !== undefined && begun(before) && before.runs < openRuns) return sections;
    return sections.map((section: SkillSection): SkillSection =>
        section === next ? { ...section, today: "new" } : section,
    );
}

/**
 * Gives the chapters of a module I opened by hand by now:
 * those a skill box of my plan names, on today or a day before, neither dropped by me
 * nor cancelled by the university.
 */
function openedOf(module: string, boxes: Box[], today: string): string[] {
    return boxes
        .filter(
            (box: Box): boolean =>
                box.module === module &&
                box.day <= today &&
                box.state !== "dropped" &&
                box.state !== "university",
        )
        .flatMap((box: Box): string[] => box.chapters);
}

/**
 * Gives the exam of a module: the first box of the type `FA` of its plan from today on,
 * else its estimate, see {@link exams}, else {@link examDefault}.
 */
function examOf(module: string, boxes: Box[]): ExamDate {
    const today: string = berlinDateOf(new Date());
    const planned: Box | undefined = boxes
        .filter(
            (box: Box): boolean =>
                box.module === module && box.type === "FA" && box.day >= today,
        )
        .sort((first: Box, second: Box): number =>
            first.day.localeCompare(second.day),
        )[0];
    return planned !== undefined
        ? { day: planned.day, estimated: false }
        : (exams[module] ?? examDefault);
}

/**
 * Reads everything the scripts view shows:
 * per module of the semester its exam, its tasks with when each is due and its sections.
 * A task whose name an earlier task of the module has already is left out.
 * Attempts on other modules count nowhere.
 *
 * @throws {Error} - When a folder or note cannot be read
 */
export function skillingRead(): Skilling {
    const lines: RoundLine[] = roundsRead();
    const bySection: Map<string, RoundLine[]> = Map.groupBy(
        lines,
        (line: RoundLine): string => line.section,
    );
    const byTask: Map<string, LoggedAttempt[]> = Map.groupBy(
        attemptsOf(lines),
        (logged: LoggedAttempt): string => logged.task,
    );
    const boxes: Box[] = skillBoxesRead(dayAdd(berlinDateOf(new Date()), planDays));
    const today: string = berlinDateOf(new Date());
    const modules: SkillModule[] = moduleTasksRead().map(
        (module: ModuleTasks): SkillModule => {
            const unique: Task[] = module.tasks.filter(
                (task: Task, index: number): boolean =>
                    module.tasks.findIndex(
                        (known: Task): boolean => known.id === task.id,
                    ) === index,
            );
            const exam: ExamDate = examOf(module.code, boxes);
            const attemptsOf: (task: Task) => Attempt[] = (task: Task): Attempt[] =>
                (byTask.get(task.id) ?? []).map(
                    (logged: LoggedAttempt): Attempt => logged.attempt,
                );
            const built: [SkillSection, SkillTask[]][] = [
                ...Map.groupBy(unique, (task: Task): string => task.note).values(),
            ].map((own: Task[]): [SkillSection, SkillTask[]] =>
                sectionOf(
                    own,
                    bySection.get(`${module.code}/${own[0].section}`) ?? [],
                    attemptsOf,
                    today,
                    exam,
                ),
            );
            return {
                code: module.code,
                title: module.title,
                exam: exam,
                tasks: built.flatMap(
                    ([, tasks]: [SkillSection, SkillTask[]]): SkillTask[] => tasks,
                ),
                sections: todayMarked(
                    built.map(
                        ([section]: [SkillSection, SkillTask[]]): SkillSection => section,
                    ),
                    openedOf(module.code, boxes, today),
                ),
            };
        },
    );

    const active: string[] = activeModulesRead();
    const skills: string[] = activeSkillsRead().map(skillNameOf);
    const others: string[] = moduleFoldersRead()
        .filter((name: string): boolean => !active.includes(name))
        .map(codeOf);
    const byName: (valueOf: (name: string) => string) => { [name: string]: string } = (
        valueOf: (name: string) => string,
    ): { [name: string]: string } =>
        Object.fromEntries(
            [...skills, ...others].map((name: string): [string, string] => [
                name,
                valueOf(name),
            ]),
        );
    return {
        modules: modules,
        skills: skills,
        otherModules: others,
        folders: byName((name: string): string => skillTitleOf(name, "")),
        paths: byName((name: string): string => skillFolderOf(name) ?? ""),
        links: byName(skillLinkOf),
        types: skillTypes,
    };
}

/**
 * Finds the folder of a module by its code:
 * in `NomSkillingmodules`, else among the modules of the semester,
 * whose folder may be missing yet and then counts as empty, see `notes.ts`.
 *
 * @throws {Error} - When no module folder and no module of the semester has the code
 */
function folderOf(code: string): string {
    const folder: string | undefined =
        moduleFolderOf(code) ??
        activeModulesRead().find((name: string): boolean => codeOf(name) === code);
    if (folder === undefined) throw new Error(`No module ${code}`);
    return folder;
}

/**
 * Reads the chapters and documents the dialog of a skill entry offers for a skill,
 * none for a module of the semester whose folder is missing,
 * and none for a project, since it behaves like a module without chapters and tasks.
 *
 * @throws {Error} - When no module folder,
 *   no module of the semester and no project has the name
 */
export function moduleRead(code: string): ModuleContents {
    if (projectOf(code) !== undefined)
        return { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
    return moduleContentsRead(folderOf(code));
}

/**
 * Starts the line `X-ROUND` of a section for a skill entry that has none of it yet,
 * so every unit stands in a round, also one I log by hand:
 * a round going on goes on at its step, after one over or none the next round starts.
 * A round I pick by hand in the dialog goes on at the step I last stood at in it.
 * Written without its module, unless the section is of another module than the entry.
 */
function markStartOf(
    section: string,
    module: string,
    lines: RoundLine[],
    picked: number | undefined,
    day: string,
): RoundMark {
    const own: RoundLine[] = lines.filter(
        (line: RoundLine): boolean => line.section === section,
    );
    const last: Round | undefined = roundsOf(own).at(-1);
    const going: boolean = last !== undefined && !overIs(last, day);
    const round: number =
        picked ?? (last === undefined ? 0 : going ? last.round : last.round + 1);
    const step: string =
        own.findLast(
            (line: RoundLine): boolean => line.round === round && line.step !== roundDone,
        )?.step ?? "";
    return {
        section: section.startsWith(`${module}/`)
            ? section.slice(module.length + 1)
            : section,
        round: round,
        step: picked !== undefined || going ? step : "",
        task: "",
        used: "",
        results: [],
        notes: [],
        due: "",
    };
}

/** Gives a line `X-ROUND` as read, also for a line about to be written. */
function lineOf(mark: RoundMark, module: string, entry: string, day: string): RoundLine {
    const section: string = markSectionOf(mark, module);
    const own: string = section.split("/")[0];
    return {
        entry: entry,
        day: day,
        section: section,
        round: mark.round,
        step: mark.step,
        task: mark.task === "" ? "" : `${own}/${nameOf(mark.task)}`,
        example: mark.used === "" ? "" : `${own}/${nameOf(mark.used)}`,
        results: mark.results,
        notes: mark.notes,
        due: mark.due,
    };
}

/**
 * Writes an attempt into the line `X-ROUND` of its section:
 * an Example checked off as its `USED`, the one Example of the round,
 * a result of the cold Task with its heading as `TASK`,
 * and for a wrong one my comment as `NOTE`, an empty one kept for its place
 * unless no later one follows.
 * The comment goes into one line, each `"` a `'`.
 *
 * @throws {Error} - When an Example comes with a result other than right,
 *   its round has another Example already, the round is decided already,
 *   the result is neither right nor wrong,
 *   or a comment comes with right
 */
function markTried(
    mark: RoundMark,
    task: Task,
    attempt: AttemptNew,
    decided: boolean,
): RoundMark {
    const comment: string = attempt.comment
        .replaceAll('"', "'")
        .replace(/[\s\p{Cc}]+/gu, " ")
        .trim();
    if (task.kind === "example") {
        if (attempt.result !== "right" || comment !== "")
            throw new Error(`An Example has no result: ${task.id}`);
        if (mark.used !== "" && mark.used !== task.heading)
            throw new Error(`One Example per round, ${mark.used} already`);
        return { ...mark, used: task.heading };
    }
    if (decided) throw new Error(`The round of ${task.section} is decided, close it`);
    if (attempt.result !== "right" && attempt.result !== "wrong")
        throw new Error(`No result ${attempt.result}`);
    if (comment !== "" && attempt.result !== "wrong")
        throw new Error(`No comment with ${attempt.result}`);
    const notes: string[] =
        attempt.result === "wrong" ? [...mark.notes, comment] : [...mark.notes];
    while (notes.at(-1) === "") notes.pop();
    return {
        ...mark,
        task: task.heading,
        results: [...mark.results, attempt.result],
        notes: notes,
    };
}

/**
 * Writes the day the next round comes as `DUE` into the line
 * whose result decides its round, see {@link dueOf},
 * so the dashboard shows the next round right away and the log holds it.
 * A round decided before keeps its day.
 */
function markDecide(
    mark: RoundMark,
    earlier: RoundLine[],
    line: RoundLine,
    exam: ExamDate,
): RoundMark {
    const rounds: Round[] = roundsOf([...earlier, line]);
    const round: Round = rounds[rounds.length - 1];
    if (round.decided === "" || round.due !== "" || mark.due !== "") return mark;
    return {
        ...mark,
        due: dueOf(rounds.slice(0, -1), round.results.at(-1) ?? "wrong", line.day, exam),
    };
}

/**
 * Applies the attempts and then the step to the line `X-ROUND` of a section,
 * and decides its round once its Task did, see {@link markDecide}.
 */
function markWith(
    mark: RoundMark,
    change: { attempts: AttemptNew[]; step: string },
    context: {
        module: string;
        entry: string;
        day: string;
        lines: RoundLine[];
        tasks: Task[];
        exam: ExamDate;
    },
): RoundMark {
    const section: string = markSectionOf(mark, context.module);
    const earlier: RoundLine[] = othersOf(context.lines, context.entry).filter(
        (line: RoundLine): boolean => line.section === section,
    );
    const decided: (now: RoundMark) => boolean = (now: RoundMark): boolean =>
        roundsOf([
            ...earlier,
            lineOf(now, context.module, context.entry, context.day),
        ]).at(-1)?.decided !== "";
    let now: RoundMark = mark;
    change.attempts.forEach((attempt: AttemptNew): void => {
        const task: Task | undefined = taskOf(context.tasks, attempt.task);
        if (task === undefined) throw new Error(`No task ${attempt.task}`);
        now = markTried(now, task, attempt, decided(now));
    });
    if (change.step !== "")
        now = markStepped(now, change.step, decided(now), context.tasks, section);
    return markDecide(
        now,
        earlier,
        lineOf(now, context.module, context.entry, context.day),
        context.exam,
    );
}

/**
 * Writes the step I went on to into a line `X-ROUND`, or `done` once I close its round:
 * passing an Example with `Next` checks it off as the `USED` of the round.
 * Round 0 closes only once its Task is right, since its first Task can only succeed.
 *
 * @throws {Error} - When it closes round 0 before its Task is right
 */
function markStepped(
    mark: RoundMark,
    step: string,
    decided: boolean,
    tasks: Task[],
    section: string,
): RoundMark {
    if (step === roundDone && mark.round === 0 && !decided)
        throw new Error(`Round 0 of ${section} closes only once its Task is right`);
    const left: Task | undefined = tasks.find(
        (task: Task): boolean =>
            task.kind === "example" &&
            sectionKeyOf(task) === section &&
            task.heading === mark.step,
    );
    const now: RoundMark =
        left === undefined || step === mark.step
            ? mark
            : markTried(
                  mark,
                  left,
                  { task: left.id, result: "right", comment: "" },
                  decided,
              );
    return { ...now, step: step };
}

/**
 * Puts lines `X-ROUND` into those of a skill entry:
 * each in the place of the last line of its section, unless that one closed its round,
 * after the others without one.
 */
function marksWith(kept: RoundMark[], marks: RoundMark[]): RoundMark[] {
    return marks.reduce((all: RoundMark[], mark: RoundMark): RoundMark[] => {
        const index: number = all.findLastIndex(
            (other: RoundMark): boolean => other.section === mark.section,
        );
        return index === -1 || all[index].step === roundDone
            ? [...all, mark]
            : all.with(index, mark);
    }, kept);
}

/**
 * Gives the line `X-ROUND` of a section a skill entry holds now and goes on in,
 * its last one while that did not close its round, else a new one.
 * A round picked moves the line it has to that round, at the step I last stood at in it.
 */
function markOf(
    kept: RoundMark[],
    section: string,
    module: string,
    lines: RoundLine[],
    picked: number | undefined,
    day: string,
): RoundMark {
    const own: RoundMark | undefined = kept.findLast(
        (mark: RoundMark): boolean => markSectionOf(mark, module) === section,
    );
    if (own === undefined || own.step === roundDone)
        return markStartOf(section, module, lines, picked, day);
    return picked === undefined || picked === own.round
        ? own
        : {
              ...own,
              round: picked,
              step: markStartOf(section, module, lines, picked, day).step,
          };
}

/**
 * Gives the lines `X-ROUND` of the log before those a skill entry writes anew:
 * those of the other entries, and its own that closed a round,
 * which it never writes again.
 */
function othersOf(lines: RoundLine[], entry: string): RoundLine[] {
    return lines.filter(
        (line: RoundLine): boolean => line.entry !== entry || line.step === roundDone,
    );
}

/** Gives the section of a task with its module. */
function sectionKeyOf(task: Task): string {
    return `${task.id.split("/")[0]}/${task.section}`;
}

/**
 * Gives the section of a line `X-ROUND` with its module,
 * the module of its entry unless it names its own.
 */
function markSectionOf(mark: RoundMark, module: string): string {
    return mark.section.includes("/") ? mark.section : `${module}/${mark.section}`;
}

/** Gives the first task of the section of a line `X-ROUND`, see {@link markSectionOf}. */
function markTaskOf(mark: RoundMark, module: string, tasks: Task[]): Task | undefined {
    return tasks.find(
        (task: Task): boolean => sectionKeyOf(task) === markSectionOf(mark, module),
    );
}

/** Gives the task of an identity, the first that has it. */
function taskOf(tasks: Task[], id: string): Task | undefined {
    return tasks.find((task: Task): boolean => task.id === id);
}

/** Gives the sections of the notes a skill entry links, each once. */
function linkedSectionsOf(links: Link[], tasks: Task[]): string[] {
    return [
        ...new Set(
            tasks
                .filter((task: Task): boolean =>
                    links.some((link: Link): boolean => link.path === notePathOf(task)),
                )
                .map(sectionKeyOf),
        ),
    ];
}

/**
 * Gives the links of a skill entry with the note of the section of every line `X-ROUND`,
 * so every line links its note. A note it links keeps its link.
 */
function linksWith(
    links: Link[],
    marks: RoundMark[],
    module: string,
    tasks: Task[],
): Link[] {
    const notes: string[] = [
        ...new Set(
            marks.flatMap((mark: RoundMark): string[] => {
                const task: Task | undefined = markTaskOf(mark, module, tasks);
                return task === undefined ? [] : [notePathOf(task)];
            }),
        ),
    ];
    return [
        ...links,
        ...notes
            .filter(
                (path: string): boolean =>
                    !links.some((link: Link): boolean => link.path === path),
            )
            .map((path: string): Link => ({ path: path, fingerprint: "" })),
    ];
}

/**
 * Gives one task of the section of each line `X-ROUND`,
 * so the skill entry names the chapter of the section, see {@link chaptersWith}.
 */
function markTasksOf(marks: RoundMark[], module: string, tasks: Task[]): string[] {
    return marks.flatMap((mark: RoundMark): string[] => {
        const task: Task | undefined = markTaskOf(mark, module, tasks);
        return task === undefined ? [] : [task.id];
    });
}

/**
 * Checks a round I pick by hand in the dialog.
 *
 * @throws {Error} - When no task of the module names its section,
 *   or its round is no number from 0
 */
function pickCheck(pick: RoundPick, module: string, tasks: Task[]): void {
    if (
        !pick.section.startsWith(`${module}/`) ||
        !tasks.some((task: Task): boolean => sectionKeyOf(task) === pick.section)
    )
        throw new Error(`No section ${pick.section}`);
    if (!Number.isInteger(pick.round) || pick.round < 0)
        throw new Error(`No round ${pick.round}`);
}

/**
 * Gives the lines `X-ROUND` of a skill entry from the dialog, and its links with them:
 * none for an entry of a type, like a lecture or a tutorial, whose sheet or slides
 * it links and whose tasks are no attempts, since no task stands outside a round.
 * For my own learning one per section it works on, the rounds I picked,
 * the notes it links and the tasks it tried.
 * A line the entry has of a note it no longer links goes
 * while it holds nothing I did, else it stays and links its note again.
 *
 * @throws {Error} - When a pick, an attempt or a step is not right,
 *   an attempt is at a task of another module,
 *   or an entry of a type comes with picks or attempts
 */
function marksOfEntry(
    entry: SkillEntryNew,
    old: { marks: RoundMark[]; id: string; links: Link[] },
    tasks: Task[],
): [RoundMark[], Link[]] {
    const links: Link[] = linksOf(entry.module, entry.documents, old.links);
    if (entry.type !== "") {
        if (entry.rounds.length > 0 || entry.attempts.length > 0)
            throw new Error(`A ${entry.type} has no rounds, only my own learning`);
        return [old.marks, links];
    }
    entry.rounds.forEach((pick: RoundPick): void => pickCheck(pick, entry.module, tasks));
    if (
        entry.attempts.some(
            (attempt: AttemptNew): boolean => attempt.task.split("/")[0] !== entry.module,
        )
    )
        throw new Error(`Only attempts at tasks of ${entry.module}`);
    const lines: RoundLine[] = roundsRead();
    const exam: ExamDate = examOf(
        entry.module,
        skillBoxesRead(dayAdd(berlinDateOf(new Date()), planDays)),
    );
    const linked: string[] = linkedSectionsOf(links, tasks);
    const kept: RoundMark[] = old.marks.filter(
        (mark: RoundMark): boolean =>
            linked.includes(markSectionOf(mark, entry.module)) ||
            mark.task !== "" ||
            mark.used !== "" ||
            mark.results.length > 0,
    );
    const sections: string[] = [
        ...new Set([
            ...entry.rounds.map((pick: RoundPick): string => pick.section),
            ...linked,
            ...entry.attempts.flatMap((attempt: AttemptNew): string[] => {
                const task: Task | undefined = taskOf(tasks, attempt.task);
                return task === undefined ? [] : [sectionKeyOf(task)];
            }),
        ]),
    ];
    const marks: RoundMark[] = sections.map((section: string): RoundMark =>
        markWith(
            markOf(
                kept,
                section,
                entry.module,
                othersOf(lines, old.id),
                entry.rounds.find((pick: RoundPick): boolean => pick.section === section)
                    ?.round,
                berlinDateOf(new Date(entry.start)),
            ),
            {
                attempts: entry.attempts.filter((attempt: AttemptNew): boolean =>
                    tasks.some(
                        (task: Task): boolean =>
                            task.id === attempt.task && sectionKeyOf(task) === section,
                    ),
                ),
                step: "",
            },
            {
                module: entry.module,
                entry: old.id,
                day: berlinDateOf(new Date(entry.start)),
                lines: lines,
                tasks: tasks,
                exam: exam,
            },
        ),
    );
    const all: RoundMark[] = marksWith(kept, marks);
    return [all, linksWith(links, all, entry.module, tasks)];
}

/**
 * Lists the chapters of a skill entry: those picked,
 * then the chapters of the sections of its lines `X-ROUND`, each once,
 * since an entry covers the chapters of the sections I worked on in it.
 * A task no note holds any more gives no chapter.
 */
function chaptersWith(chapters: string[], worked: string[], tasks: Task[]): string[] {
    const solved: string[] = worked.flatMap((id: string): string[] => {
        const task: Task | undefined = taskOf(tasks, id);
        return task === undefined ? [] : [task.chapter];
    });
    return [...new Set([...chapters, ...solved])];
}

/**
 * Checks a skill entry before it is written: one of the types, the type it had,
 * like an older `DEV` no longer offered,
 * or none, a module with a folder, a project or no skill at all,
 * chapters among the module's or among those the entry or its box had,
 * also once a folder has another name,
 * well-formed people, and an end after the start.
 *
 * @throws {Error} - When one of these does not hold
 */
function skillEntryCheck(entry: SkillEntryNew, kept: string[], keptType: string): void {
    if (entry.type !== "" && entry.type !== keptType && !skillTypes.includes(entry.type))
        throw new Error(`No type ${entry.type}`);
    const offered: string[] =
        entry.module === "" ? [] : moduleRead(entry.module).chapters;
    const unknown: string | undefined = entry.chapters.find(
        (chapter: string): boolean =>
            !offered.includes(chapter) && !kept.includes(chapter),
    );
    if (unknown !== undefined)
        throw new Error(`No chapter ${unknown} in ${entry.module}`);
    if (!attendeesAllow(entry.attendees ?? []))
        throw new Error(
            `No people ${(entry.attendees ?? []).map(
                (attendee: Attendee): string => attendee.name,
            )}`,
        );
    if (!(new Date(entry.start) < new Date(entry.end)))
        throw new Error("A skill entry needs an end after its start");
}

/**
 * Gives the fields of a skill entry as the dialog sends it:
 * its place keeping the link of the place of what it comes from while the same,
 * what it does online and its people those of that while it sends none.
 *
 * @param from - The box a new entry is logged from, or the entry before a change
 * @param titled - The entry before a change, whose link of its summary it keeps
 */
function skillFieldsOf(
    entry: SkillEntryNew,
    from: Box | Entry | null,
    titled: Entry | null,
): EntryFields {
    const [title, titleLink]: [string, string] = titleOf(
        { ...entry, category: skillName },
        titled,
    );
    return {
        category: skillName,
        title: title,
        titleLink: titleLink,
        location: entry.location,
        locationLink: placeLinkOf(entry.location, from),
        ...onlineFor(entry, from),
        from: "",
        attendees: entry.attendees ?? from?.attendees ?? [],
        module: entry.module,
        type: entry.type,
        semester: semesterFor(
            skillName,
            entry.semester,
            berlinDateOf(new Date(entry.start)),
        ),
        note: entry.note.trim(),
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
}

/**
 * Gives the properties of a new skill entry beyond its fields:
 * its links, its chapters, its lines `X-ROUND`,
 * and the box it is logged from with the group of that box.
 */
function ownOf(
    links: Link[],
    chapters: string[],
    marks: RoundMark[],
    plan: Box | undefined,
): [string, string | Link | ICAL.Property][] {
    const own: [string, string | Link | ICAL.Property][] = [
        ...links.map((link: Link): [string, Link] => ["attach", link]),
        ...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]),
        ...marks.map((mark: RoundMark): [string, ICAL.Property] => [
            "x-round",
            roundPropertyOf(mark),
        ]),
    ];
    if (plan !== undefined) own.push(["related-to", plan.id]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    return own;
}

/**
 * Writes a new skill entry into the log of its skill, see `logFileOf` in `day.ts`,
 * with its title and links, see `documents.ts`, its chapters and its rounds,
 * also for a note it only links, see {@link marksOfEntry},
 * and marks the box it is logged from done.
 * My own learning, without type and box,
 * is logged from the study box of its module and day,
 * see `studyBoxOf` in `boxes.ts`, so learning does the box of the plan.
 *
 * @returns Identifier of the new entry, so the reader can send it to Vu, see `shared.ts`
 * @throws {Error} - When an attempt or a round picked is not right,
 *   the entry is not right, a document is none of the module's,
 *   the link typed online is no web address, the box it is logged from is not open
 */
export function skillEntryAdd(entry: SkillEntryNew): string {
    const tasks: Task[] = tasksRead();
    const [marks, links]: [RoundMark[], Link[]] = marksOfEntry(
        entry,
        { marks: [], id: "", links: [] },
        tasks,
    );
    const chapters: string[] = chaptersWith(
        entry.chapters,
        markTasksOf(marks, entry.module, tasks),
        tasks,
    );
    const plan: Box | null =
        entry.planned !== ""
            ? boxOpenFind(entry.planned)
            : entry.module !== "" && entry.type === ""
              ? (studyBoxOf(
                    entry.module,
                    berlinDateOf(new Date(entry.start)),
                    chapters,
                ) ?? null)
              : null;
    skillEntryCheck(entry, plan?.chapters ?? [], plan?.type ?? "");

    const fields: EntryFields = skillFieldsOf(entry, plan, null);
    const id: string = entryAppend(
        logFileOf(fields),
        fields,
        ownOf(links, chapters, marks, plan ?? undefined),
    );
    if (plan !== null) boxDone(plan.id);
    return id;
}

/**
 * Changes a skill entry of the log from the entry by category,
 * and adds the new attempts after those it has, every other line as it is.
 * The entry moves into the log of its new skill when that is another file.
 * A document it had keeps its link with its fingerprint, a new one gets its own.
 * The folders of chapters an older entry links go.
 * Its lines `X-ROUND` keep their section, also once I change its skill:
 * then each names the module of its section.
 * Written only while its file holds it as the dialog opened it,
 * as for any entry of the log, see `entryEdit` in `day.ts`:
 * after any change of it since, like an attempt the learning view wrote into it,
 * nothing is written. The first save wins.
 *
 * @returns Whether it is written,
 *   `false` when its file changed it since the dialog opened it
 * @throws {Error} - When there is no such skill entry in the log of the new system,
 *   a new attempt or a round picked is not right, the entry is not right,
 *   a document is none of the module's, the link typed online is no web address
 */
export function skillEntryEdit(change: SkillEntryChange): boolean {
    const [file, old]: [string, Entry] = entryFind(skillLog, change.id);
    if (!old.editable || old.category !== skillName)
        throw new Error(`${old.title} is no skill entry of the new system`);
    if (old.version !== change.version) return false;
    const tasks: Task[] = tasksRead();
    const kept: RoundMark[] = old.rounds.map((mark: RoundMark): RoundMark =>
        change.module === old.module || mark.section.includes("/")
            ? mark
            : { ...mark, section: `${old.module}/${mark.section}` },
    );
    const [marks, links]: [RoundMark[], Link[]] = marksOfEntry(
        change,
        { marks: kept, id: old.id, links: old.links },
        tasks,
    );
    skillEntryCheck(change, chaptersOf(old), old.type);

    const worked: string[] = markTasksOf(marks, change.module, tasks).filter(
        (task: string): boolean => task.split("/")[0] === change.module,
    );
    const chapters: string[] = chaptersWith(change.chapters, worked, tasks);
    const fields: EntryFields = skillFieldsOf(change, old, old);
    propertiesPut(file, old.id, [
        ["x-chapter", chapters],
        ["attach", links],
        ["x-round", marks.map(roundPropertyOf)],
    ]);
    entryChange(file, old, fields, logFileOf(fields));
    return true;
}

/**
 * Writes where I stand in a round and what I did in it into the skill entry of the moment
 * of its module, see the top of this file:
 * the line `X-ROUND` of its section there, written anew in its place,
 * the note of its section linked as an `ATTACH` without fingerprint,
 * with the chapter of the section,
 * and its end moved to the end of the quarter hour of now, if that is later.
 * Without an open entry of the module,
 * starts one without type covering the quarter hour of now,
 * logged from the open skill box of the module for now while that has no type either,
 * which is done then.
 *
 * @throws {Error} - When an attempt or the step is not right, see {@link markWith}
 */
function momentWrite(
    section: string,
    change: { attempts: AttemptNew[]; step: string },
    tasks: Task[],
): void {
    const module: string = section.split("/")[0];
    const now: Date = new Date();
    const quarter: Date = new Date(Math.ceil(now.getTime() / quarterHour) * quarterHour);
    const open: Entry | undefined = momentOf(module, now);
    const kept: RoundMark[] = open?.rounds ?? [];
    const start: Date =
        open === undefined
            ? new Date(quarter.getTime() - quarterHour)
            : new Date(open.start);
    const lines: RoundLine[] = roundsRead();
    const mark: RoundMark = markWith(
        markOf(
            kept,
            section,
            module,
            othersOf(lines, open?.id ?? ""),
            undefined,
            berlinDateOf(start),
        ),
        change,
        {
            module: module,
            entry: open?.id ?? "",
            day: berlinDateOf(start),
            lines: lines,
            tasks: tasks,
            exam: examOf(module, skillBoxesRead(dayAdd(berlinDateOf(now), planDays))),
        },
    );
    const marks: RoundMark[] = marksWith(kept, [mark]);
    const links: Link[] = linksWith(
        open === undefined ? [] : documentLinksOf(open.links),
        marks,
        module,
        tasks,
    );
    const chapters: string[] = chaptersWith(
        open === undefined ? [] : chaptersOf(open),
        markTasksOf(marks, module, tasks),
        tasks,
    );
    if (open === undefined) {
        const box: Box | undefined = skillBoxOf(module, now, chapters);
        const plan: Box | undefined = box?.type === "" ? box : undefined;
        const type: string = "";
        const semester: string = semesterFor(
            skillName,
            plan?.semester ?? "",
            berlinDateOf(start),
        );
        const [title, titleLink]: [string, string] = titleOf(
            {
                category: skillName,
                title: plan?.title ?? "",
                module: module,
                type: type,
                semester: semester,
            },
            null,
        );
        const fields: EntryFields = {
            category: skillName,
            title: title,
            titleLink: titleLink,
            location: plan?.location ?? "",
            locationLink: plan?.locationLink ?? "",
            online: plan?.online ?? "",
            onlineLink: plan?.onlineLink ?? "",
            onlineChannel: plan?.onlineChannel ?? "",
            onlineTitle: plan?.onlineTitle ?? "",
            from: "",
            attendees: plan?.attendees ?? [],
            module: module,
            type: type,
            semester: semester,
            note: "",
            start: start,
            end: quarter,
        };
        entryAppend(logFileOf(fields), fields, ownOf(links, chapters, marks, plan));
        if (plan !== undefined) boxDone(plan.id);
        return;
    }
    const properties: [string, (string | Date | Link | ICAL.Property)[]][] = [
        ["x-chapter", chapters],
        ["attach", links],
        ["x-round", marks.map(roundPropertyOf)],
    ];
    if (quarter > new Date(open.end)) properties.push(["dtend", [quarter]]);
    const [file]: [string, Entry] = entryFind(skillLog, open.id);
    propertiesPut(file, open.id, properties);
}

/** Gives the path from `NomWorkspace` of the note of a task, as an entry links it. */
function notePathOf(task: Task): string {
    return `${modulesFolder}/${task.note}`;
}

/**
 * Finds the skill entry of the moment of a module:
 * the last one of the module without type that started before now
 * and ended at most {@link sessionPause} ago,
 * since only my own learning has rounds, never a lecture or a tutorial.
 */
function momentOf(module: string, now: Date): Entry | undefined {
    return skillEntriesRead(
        new Date(now.getTime() - sessionPause).toISOString(),
        now.toISOString(),
    )
        .filter((entry: Entry): boolean => entry.module === module && entry.type === "")
        .at(-1);
}

/**
 * Writes an attempt from a button of a task into the skill entry of the moment,
 * see {@link momentWrite}.
 *
 * @throws {Error} - When no note holds its task
 *   or the attempt is not right, see {@link markTried}
 */
export function attemptAdd(attempt: AttemptNew): void {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = taskOf(tasks, attempt.task);
    if (task === undefined) throw new Error(`No task ${attempt.task}`);
    momentWrite(sectionKeyOf(task), { attempts: [attempt], step: "" }, tasks);
}

/**
 * Writes where I stand in the round of a section
 * into the skill entry of the moment of its module, see {@link momentWrite}.
 *
 * @throws {Error} - When no task names its section, it names no step,
 *   or it closes round 0 before its Task is right
 */
export function roundAdd(line: RoundNew): void {
    const tasks: Task[] = tasksRead();
    if (!tasks.some((task: Task): boolean => sectionKeyOf(task) === line.section))
        throw new Error(`No section ${line.section}`);
    const step: string = line.step.replace(/\s+/g, " ").trim();
    if (step === "") throw new Error(`No step in ${line.section}`);
    momentWrite(line.section, { attempts: [], step: step }, tasks);
}

/**
 * Reads the session of a module running now, for the learning view:
 * its skill entry of the moment, see {@link momentOf},
 * so the learning view records only in a session of the module.
 * The timer of the day shows any entry running now instead,
 * see `entryNowRead` in `day.ts`.
 */
export function sessionRead(module: string): Session | null {
    const now: Date = new Date();
    const open: Entry | undefined = momentOf(module, now);
    if (open === undefined) return null;
    return {
        module: open.module,
        type: open.type,
        title: open.title,
        start: new Date(open.start).toISOString(),
        end: new Date(open.end).toISOString(),
    };
}

/**
 * Renames a task in the log, in the same step as its heading in its note,
 * so its history stays with it:
 * every line `X-ROUND` of its section that names it as `TASK` or `USED`
 * gets the new heading.
 * For the AI, not for a button, run in the folder of the dashboard like
 * `node -e 'import("./reader/skill.ts").then((skill) =>
 * console.log(skill.taskRename("IN2028/Old Name", "IN2028/New Name")))'`.
 *
 * @throws {Error} - When a note still holds the old identity or none holds the new one,
 *   so the heading has to be renamed first
 */
export function taskRename(from: string, to: string): number {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = taskOf(tasks, to);
    if (taskOf(tasks, from) !== undefined || task === undefined)
        throw new Error(`Rename the heading in its note first: ${from} to ${to}`);
    const after: string = task.heading;
    const before: string =
        after.slice(0, after.indexOf(". ") + 2) + from.slice(from.indexOf("/") + 1);
    let renamed: number = 0;
    skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).forEach(
        (entry: Entry): void => {
            const marks: RoundMark[] = entry.rounds.map((mark: RoundMark): RoundMark => {
                if (markSectionOf(mark, entry.module) !== sectionKeyOf(task)) return mark;
                return {
                    ...mark,
                    task: mark.task === before ? after : mark.task,
                    used: mark.used === before ? after : mark.used,
                };
            });
            const count: number = marks.filter(
                (mark: RoundMark, index: number): boolean => mark !== entry.rounds[index],
            ).length;
            if (count === 0) return;
            const [file]: [string, Entry] = entryFind(skillLog, entry.id);
            propertiesPut(file, entry.id, [["x-round", marks.map(roundPropertyOf)]]);
            renamed += count;
        },
    );
    return renamed;
}
