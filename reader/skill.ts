/**
 * ## Skill
 *
 * Reads the tasks of my chapter notes and my attempts at them, tells when each is due,
 * and is the one writer of the skill entries of the log.
 * Only modules of the semester have tasks, read live from their folders every time.
 * A task is a block of a chapter note, its kind by the type word of its heading.
 * - `## Example. <name>`: Its scene, question and steps `1.`, `2.`, which I predict one by one.
 * - `## Task. <name>`: Cold, the one I solve alone, one variant due per round.
 * - `## Definition.`, `## Algorithm.`: Theory, the Algorithm the one worked example.
 * - Older notes: `## Completion.` is an example, `## Task. <name> (cold)` cold, a plain Task there an example.
 * Its sources are the `>` lines below its heading, its mode word `Original:` or `Generated:` left out.
 * The parts of a cold task are its numbered list items before its solution.
 *
 * A skill entry is one block of learning of a module, or of work on another skill, see `skills.ts`.
 * Its type may stay empty.
 * Below its title and links, each only when there is one:
 * - `ATTACH`: One per real document it used, `DESCRIPTION` only my free note.
 * - `X-SEMESTER`: Its semester.
 * - `X-CHAPTER`: One per chapter it belongs to, the chapters of its rounds always among them.
 * - `X-ROUND`: One per section it works on, in the order I did it, see {@link RoundLine}.
 * Every attempt stands in the line of its section, so no task is solved outside a round.
 * A button of a task writes into the last entry of its module that started before now
 * and ended at most half an hour ago, grown to the end of the quarter hour of the attempt.
 * Without one, a new entry covers that quarter hour.
 *
 * A session of `/learn` reads by `GET http://127.0.0.1:3000/api/skill/tasks`, which writes nothing,
 * only its module's part, an open round first, then what is due today, then what is `new`.
 *
 * Due per section by my protocol in `~/NomWorkspace/.claude/skills/learn/SKILL.md`, `## session`.
 * - Round 0: Its whole theory, first Example and first Task, until the Task is right.
 * - Later rounds: Its theory from my head and the next Task not solved yet.
 * - Wrong: The next unused Example, then the Task again, which then counts as right.
 * - Wrong again: The next round 2 days later, the spacing starts over.
 * One Example per round, the Task decides the round and writes its next day as `DUE`, see {@link dueOf}.
 * After round 0 the next round comes 1, then 7, then 21 days later.
 * After the fourth it is ready and comes back about 14 days before its exam,
 * with one keep-up check halfway when the exam lies more than 6 weeks off (Cepeda 2008, Rohrer 2005).
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
import { attendeesAllow, semesterFor, skillName } from "./categories.ts";
import { logFileOf } from "./day.ts";
import {
    chaptersOf,
    documentLinksOf,
    linksOf,
    skillFolderOf,
    skillLinkOf,
    skillTitleOf,
    skillTypeAllows,
    skillTypesOf,
    titleOf,
} from "./documents.ts";
import { codeOf, fileRead, moduleContentsRead, moduleFoldersRead, modulesRead } from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { activeSkillsRead, skillRowOf } from "./skills.ts";
import { modulesFolder, skillLog } from "./sources.ts";

import type { Box } from "./boxes.ts";
import type { Attendee, Entry, EntryFields, Link, Online, RoundMark } from "./calendar.ts";
import type { Chapter, ModuleContents, NoteEntry, NotesModule } from "./notes.ts";

/** Result of a cold Task. */
export type Result = "right" | "wrong";

export type Kind = "example" | "cold";

/**
 * A task as a chapter note holds it, its identity `<module>/<name>`, so it keeps its history when it moves.
 * Names are unique within a module.
 * The attempts of a task thrown away stay in the log but count nowhere.
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
 * An attempt at a task, read from the lines `X-ROUND`, an Example I checked off reads as right.
 * Its `order` is its place among all my attempts, the oldest first.
 */
export type Attempt = {
    day: string;
    order: number;
    result: Result;
    error: string;
};

/** A {@link Task} with when it is due, `due` set only for the cold Task of the next round of its section. */
export type SkillTask = Task & {
    due: string;
    done: boolean;
    level: number;
    ready: boolean;
    attempts: Attempt[];
};

/**
 * A section, a note of a chapter, with the state of its rounds, read from the lines `X-ROUND` alone.
 * - `round`: The round going on or closed today, else the next one.
 * - `runs`: Its runs decided before today, so it stays the whole day.
 * - `rightDue`, `wrongDue`: Day of the next round after a right Task today, or one wrong for good.
 * - `at`: Key of the step I am at, by the last `Next`.
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

/** What of a section is due today. */
export type SectionToday = "task" | "new" | "";

/**
 * A line `X-ROUND` of a skill entry, one per section, written anew in its place as I go on,
 * so where I am lives in the log alone, never in the browser or the note.
 * Its step is the one I went on to with `Next`, or `done` once I closed the round, the steps before passed.
 * A step is named by its key, its heading as written.
 * Every skill entry that links the note of a section holds one, and every line links its note.
 * A round I did not close goes on over days and entries until I close it.
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

/** A round of a section, its lines in a row with the same round, `decided` the day of its deciding result. */
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

/** Where I stand in a round. */
export type RoundNew = {
    section: string;
    round: number;
    step: string;
};

/** A round I picked by hand for a note of a skill entry. */
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
 * All of my tasks and skills, `skills` those of the semester, `otherModules` every other module.
 * Of each its name, the folder of its module, the types it offers, its link by type, `""` the one of no type.
 */
export type Skilling = {
    modules: SkillModule[];
    skills: string[];
    otherModules: string[];
    names: { [name: string]: string };
    paths: { [name: string]: string };
    types: { [name: string]: string[] };
    links: { [name: string]: { [type: string]: string } };
};

/** A new attempt, an Example only ever `right`, a comment only with `wrong`. */
export type AttemptNew = {
    task: string;
    result: Result;
    comment: string;
};

/**
 * A new skill entry of the log, an empty field not written.
 * - `titleLink`: Typed, left out or empty the one all entries of its skill share.
 * - `semester`: The semester of its day when empty.
 * - `documents`: Paths from the folder of its skill.
 * - `online` fields: Left out by a sender that does not know them, so it keeps them or takes those of its box.
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
 * A changed skill entry, its `attempts` only the new ones, its box as it is.
 * Its `version` is its fingerprint as the dialog opened it, so nothing older than the file is written.
 */
export type SkillEntryChange = SkillEntryNew & { id: string; version: string };

/** A session of a module running now. */
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

type LoggedAttempt = {
    task: string;
    attempt: Attempt;
};

/** Where the decided rounds of a section leave it. */
type Levels = { level: number; runs: number; due: string };

/** Step of a line `X-ROUND` once I closed its round. */
const roundDone: string = "done";

/** Days until the next round after a Task stayed wrong. */
const retryDays: number = 2;

/** Days until a section is due again after its first, second and third right run, after the fourth it is ready. */
const spacingDays: number[] = [1, 7, 21];

/** Days before its exam a ready section comes back once more, cold. */
const examDays: number = 14;

/** Days to the exam beyond which one keep-up check lies halfway, since without one 70 % fell to 24 % in 9 weeks. */
const keepUpDays: number = 42;

/**
 * Runs every section must have before the next comes new, and of a chapter before the next chapter opens.
 * 2, so the day after a section comes new holds its run 1 day later, no new one.
 */
const openRuns: number = 2;

/**
 * Estimated exams by module code, until the university names them as a box of type `FA` in the plan.
 * IN2028 by its endterms on the last Thursday or so of February.
 */
export const exams: { [code: string]: ExamDate } = {
    IN2028: { day: "2027-02-25", estimated: true },
};

/** Exam of a module not listed, the first Monday of the exam period, the earliest, so the last runs come in time. */
const examDefault: ExamDate = { day: "2027-02-15", estimated: true };

/** Days the plan is searched for exams, so a series without end stops. */
const planDays: number = 366;

/** Part of a cold task. */
const partLine: RegExp = /^(\d+)\.\s/;

/** The step of the day view in milliseconds. */
const quarterHour: number = 15 * 60 * 1000;

/** Longest pause after a skill entry in which a button still writes into it. */
const sessionPause: number = 30 * 60 * 1000;

/** Heading of a task, also the older `## Completion.` and `(cold)` forms. */
const taskHeading: RegExp = /^## ((Example|Completion|Task)\.[ \t]+(.+?)(?:[ \t]+(\(cold\)))?)[ \t]*$/;

/** Heading of the Algorithm of a note, the one worked example. */
const algorithmHeading: RegExp = /^##[ \t]+(Algorithm\.[ \t]+.+?)[ \t]*$/;

/** Heading of a cold task written the older way, which marks the whole note so. */
const olderCold: RegExp = /^## Task\.[ \t]+.+[ \t]+\(cold\)[ \t]*$/;

/** Source line of a task, its mode word left out. */
const sourceLine: RegExp = /^>[ \t]*(?:(?:Original|Generated):[ \t]*)?(.*?)[ \t]*$/;

/** Reads the numbers of the parts of a cold task, each once, up to the next heading, its solution. */
function partsOf(lines: string[], index: number): string[] {
    const end: number = lines.findIndex((line: string, at: number): boolean => at > index && line.startsWith("#"));
    const body: string[] = lines.slice(index + 1, end === -1 ? lines.length : end);
    return [...new Set(body.flatMap((line: string): string[] => partLine.exec(line)?.slice(1, 2) ?? []))];
}

function sourceOf(lines: string[], index: number): string {
    const end: number = lines.findIndex((line: string, at: number): boolean => at > index && !line.startsWith(">"));
    const quotes: string[] = lines.slice(index + 1, end === -1 ? lines.length : end);
    return quotes
        .map((line: string): string => sourceLine.exec(line)?.[1] ?? "")
        .filter((source: string): boolean => source !== "")
        .join(", ");
}

/** Tells the kind of a task, in a note written the older way only a `Task.` with `(cold)` cold. */
function kindOf(word: string, cold: boolean, older: boolean): Kind {
    return word === "Task" && (!older || cold) ? "cold" : "example";
}

/** Gives the heading of the first Algorithm of a note, empty for none. */
function algorithmOf(note: string): string {
    return (
        fileRead(note)
            .content.toString("utf8")
            .split(/\r?\n/)
            .map((line: string): string => algorithmHeading.exec(line)?.[1] ?? "")
            .find((heading: string): boolean => heading !== "") ?? ""
    );
}

/** Reads the tasks of a note in order, their section the name of the note. */
function noteTasksRead(code: string, chapter: string, note: string): Task[] {
    const lines: string[] = fileRead(note).content.toString("utf8").split(/\r?\n/);
    const section: string = (note.split("/").at(-1) ?? note).replace(/\.md$/, "");
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

/** Reads the modules of the semester with their tasks, also those without. */
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

function tasksRead(): Task[] {
    return moduleTasksRead().flatMap((module: ModuleTasks): Task[] => module.tasks);
}

/** Reads the skill entries that overlap a range, the end excluded. */
function skillEntriesRead(start: string, end: string): Entry[] {
    return entriesRead(skillLog, start, end)
        .filter((entry: Entry): boolean => entry.category === skillName)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
}

/** Reads all lines `X-ROUND` up to now in order, each with the module of its entry unless it names its own. */
function roundsRead(): RoundLine[] {
    return skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).flatMap((entry: Entry): RoundLine[] => {
        const day: string = berlinDateOf(new Date(entry.start));
        return entry.rounds.map((mark: RoundMark): RoundLine => lineOf(mark, entry.module, entry.id, day));
    });
}

/** Gives the name in the heading of a task. */
function nameOf(heading: string): string {
    return heading.slice(heading.indexOf(". ") + 2);
}

/** Reads my attempts in order, per line its Example, then each result of its Task with my comment on a wrong one. */
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
 * Tells whether a round is over on a day, closed or decided on a day before,
 * so a round decided in a unit logged by hand lets the next one start.
 */
function overIs(round: Round, day: string): boolean {
    return round.closed || (round.decided !== "" && round.decided < day);
}

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
 * Tells whether the Task of a round decided it, right, or after round 0 wrong twice or wrong and closed.
 * Round 0 ends only right, since its first Task can only succeed.
 */
function decidedIs(round: Round): boolean {
    if (round.results.at(-1) === "right") return true;
    if (round.round === 0 || round.results.length === 0) return false;
    return round.closed || round.results.filter((result: Result): boolean => result === "wrong").length >= 2;
}

function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / (24 * 60 * 60 * 1000));
}

/** Tells when a section is due after a run on a day, nothing once the last check before the exam is done. */
function dueAfter(level: number, day: string, exam: ExamDate): string {
    if (level <= spacingDays.length) return dayAdd(day, spacingDays[level - 1]);
    const check: string = dayAdd(exam.day, -examDays);
    if (day >= check) return "";
    return daysBetween(day, exam.day) > keepUpDays ? dayAdd(day, Math.floor(daysBetween(day, check) / 2)) : check;
}

/**
 * Walks the decided rounds of a section, a right one a run only on or after its day, so the runs stay spaced.
 * One wrong for good starts the spacing over.
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
 * Tells the next round once a Task decides a round, written as `DUE` so the log holds it.
 * A right one before its day keeps the day it was due.
 */
function dueOf(earlier: Round[], result: Result, day: string, exam: ExamDate): string {
    if (result !== "right") return dayAdd(day, retryDays);
    const { level, due }: Levels = levelsOf(earlier, "9999-12-31");
    if (due !== "" && day < due) return due;
    return dueAfter(Math.min(level + 1, spacingDays.length + 1), day, exam);
}

/** Gives the cold Task of a round, the one its lines name, else the first not solved yet, all solved in turns. */
function coldOf(colds: Task[], rounds: Round[], shown: Round | undefined): string {
    if (shown !== undefined && shown.task !== "") return shown.task;
    if (colds.length === 0) return "";
    const solved: (task: Task) => boolean = (task: Task): boolean =>
        rounds.some((round: Round): boolean => round.task === task.id && round.results.includes("right"));
    return (
        colds.find((task: Task): boolean => !solved(task)) ??
        colds[rounds.filter((round: Round): boolean => round.task !== "").length % colds.length]
    ).id;
}

/** Gives the Example of a round, the one its lines name, else the first no round checked off. */
function exampleOf(examples: Task[], rounds: Round[], shown: Round | undefined): string {
    if (shown !== undefined && shown.example !== "") return shown.example;
    return (
        examples.find((task: Task): boolean => !rounds.some((round: Round): boolean => round.example === task.id))
            ?.id ?? ""
    );
}

/**
 * Builds a section with its tasks, the round shown the last while not over or on the day it ended, else the next.
 * It is due as `new` while its round 0 began, as `task` while a later round is shown or due.
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
        last !== undefined && (!overIs(last, today) || (last.lines.at(-1)?.day ?? "") >= today) ? last : undefined;
    const round: number = shown?.round ?? (last === undefined ? 0 : last.round + 1);
    const all: Levels = levelsOf(rounds, "9999-12-31");
    const before: Levels = levelsOf(rounds, today);
    const cold: string = coldOf(colds, rounds, shown);
    const days: string[] = [...new Set(lines.map((line: RoundLine): string => line.day))].sort();
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
            tried: own.filter((task: Task): boolean => attemptsOf(task).length > 0).length,
            round: round,
            ladder: round === 0,
            runs: before.runs,
            day: shown?.lines[0].day ?? today,
            rightDue: cold === "" ? "" : dueOf(earlier, "right", today, exam),
            wrongDue: cold === "" ? "" : dayAdd(today, retryDays),
            at: shown === undefined || shown.closed ? "" : (shown.lines.at(-1)?.step ?? ""),
            closed: shown?.closed ?? false,
            results: shown?.results ?? [],
            used: (shown?.example ?? "") !== "",
            days: days,
            today: marked,
        },
        own.map((task: Task): SkillTask => ({
            ...task,
            due: task.id === cold ? all.due : "",
            done: task.kind === "example" && rounds.some((done: Round): boolean => done.example === task.id),
            level: task.kind === "cold" ? all.level : 0,
            ready: task.kind === "cold" && all.level > spacingDays.length,
            attempts: attemptsOf(task),
        })),
    ];
}

/**
 * Marks the next section to learn new today, while none is on a begun round 0.
 * It is the first not begun of an open chapter, once the section before has {@link openRuns} runs.
 * A chapter opens by a skill box of my plan that names it, a later one also once the chapter before has them.
 */
function todayMarked(sections: SkillSection[], opened: string[]): SkillSection[] {
    const tasked: (section: SkillSection) => boolean = (section: SkillSection): boolean => section.cold !== "";
    const begun: (section: SkillSection) => boolean = (section: SkillSection): boolean => section.days.length > 0;
    if (sections.some((section: SkillSection): boolean => section.today === "new")) return sections;
    const chapters: string[] = [
        ...new Set(sections.filter(tasked).map((section: SkillSection): string => section.chapter)),
    ];
    const open: (chapter: string) => boolean = (chapter: string): boolean =>
        opened.includes(chapter) ||
        (chapters.indexOf(chapter) > 0 &&
            sections
                .filter(
                    (section: SkillSection): boolean =>
                        tasked(section) && section.chapter === chapters[chapters.indexOf(chapter) - 1],
                )
                .every((section: SkillSection): boolean => section.runs >= openRuns));
    const next: SkillSection | undefined = sections.find(
        (section: SkillSection): boolean => tasked(section) && !begun(section) && open(section.chapter),
    );
    if (next === undefined) return sections;
    const before: SkillSection | undefined = sections.slice(0, sections.indexOf(next)).findLast(tasked);
    if (before !== undefined && begun(before) && before.runs < openRuns) return sections;
    return sections.map((section: SkillSection): SkillSection =>
        section === next ? { ...section, today: "new" } : section,
    );
}

/** Gives the chapters a skill box of my plan names by today, not dropped nor cancelled by the university. */
function openedOf(module: string, boxes: Box[], today: string): string[] {
    return boxes
        .filter(
            (box: Box): boolean =>
                box.module === module && box.day <= today && box.state !== "dropped" && box.state !== "university",
        )
        .flatMap((box: Box): string[] => box.chapters);
}

/** Gives the exam of a module, its first box of type `FA` from today on, else its estimate. */
function examOf(module: string, boxes: Box[]): ExamDate {
    const today: string = berlinDateOf(new Date());
    const planned: Box | undefined = boxes
        .filter((box: Box): boolean => box.module === module && box.type === "FA" && box.day >= today)
        .sort((first: Box, second: Box): number => first.day.localeCompare(second.day))[0];
    return planned !== undefined ? { day: planned.day, estimated: false } : (exams[module] ?? examDefault);
}

/**
 * Reads per module of the semester its exam, its tasks with when each is due and its sections.
 * A task whose name an earlier one has is left out.
 *
 * @throws {Error} - When a folder or note cannot be read
 */
export function skillModulesRead(): SkillModule[] {
    const lines: RoundLine[] = roundsRead();
    const bySection: Map<string, RoundLine[]> = Map.groupBy(lines, (line: RoundLine): string => line.section);
    const byTask: Map<string, LoggedAttempt[]> = Map.groupBy(
        attemptsOf(lines),
        (logged: LoggedAttempt): string => logged.task,
    );
    const boxes: Box[] = skillBoxesRead(dayAdd(berlinDateOf(new Date()), planDays));
    const today: string = berlinDateOf(new Date());
    return moduleTasksRead().map((module: ModuleTasks): SkillModule => {
        const unique: Task[] = module.tasks.filter(
            (task: Task, index: number): boolean =>
                module.tasks.findIndex((known: Task): boolean => known.id === task.id) === index,
        );
        const exam: ExamDate = examOf(module.code, boxes);
        const attemptsOf: (task: Task) => Attempt[] = (task: Task): Attempt[] =>
            (byTask.get(task.id) ?? []).map((logged: LoggedAttempt): Attempt => logged.attempt);
        const built: [SkillSection, SkillTask[]][] = [
            ...Map.groupBy(unique, (task: Task): string => task.note).values(),
        ].map((own: Task[]): [SkillSection, SkillTask[]] =>
            sectionOf(own, bySection.get(`${module.code}/${own[0].section}`) ?? [], attemptsOf, today, exam),
        );
        return {
            code: module.code,
            title: module.title,
            exam: exam,
            tasks: built.flatMap(([, tasks]: [SkillSection, SkillTask[]]): SkillTask[] => tasks),
            sections: todayMarked(
                built.map(([section]: [SkillSection, SkillTask[]]): SkillSection => section),
                openedOf(module.code, boxes, today),
            ),
        };
    });
}

/**
 * Reads the modules of the semester with their tasks.
 * Then every skill with its name, folder, types, links.
 *
 * @throws {Error} - When a folder or note cannot be read
 */
export function skillingRead(): Skilling {
    const skills: string[] = activeSkillsRead();
    const others: string[] = moduleFoldersRead()
        .map(codeOf)
        .filter((code: string): boolean => !skills.includes(code));
    const byName: <Value>(valueOf: (name: string) => Value) => { [name: string]: Value } = <Value>(
        valueOf: (name: string) => Value,
    ): { [name: string]: Value } =>
        Object.fromEntries([...skills, ...others].map((name: string): [string, Value] => [name, valueOf(name)]));
    return {
        modules: skillModulesRead(),
        skills: skills,
        otherModules: others,
        names: byName((name: string): string => skillTitleOf(name, "")),
        paths: byName((name: string): string => skillFolderOf(name) ?? ""),
        types: byName(skillTypesOf),
        links: byName((name: string): { [type: string]: string } =>
            Object.fromEntries(
                ["", ...skillTypesOf(name)].map((type: string): [string, string] => [type, skillLinkOf(name, type)]),
            ),
        ),
    };
}

/**
 * Reads the chapters and documents of the folder of a skill, none for a skill without folder.
 *
 * @throws {Error} - When no module folder and no row of `Skills.md` has the code
 */
export function moduleRead(code: string): ModuleContents {
    const folder: string | undefined = skillFolderOf(code);
    if (folder !== undefined) return moduleContentsRead(folder.slice(modulesFolder.length + 1));
    if (skillRowOf(code) === undefined) throw new Error(`No skill ${code}`);
    return { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
}

/**
 * Starts the line `X-ROUND` of a section for an entry without one, so every unit stands in a round.
 * A round going on or picked by hand goes on at its last step, else the next round starts.
 * Its module is written only when it differs from the entry's.
 */
function markStartOf(
    section: string,
    module: string,
    lines: RoundLine[],
    picked: number | undefined,
    day: string,
): RoundMark {
    const own: RoundLine[] = lines.filter((line: RoundLine): boolean => line.section === section);
    const last: Round | undefined = roundsOf(own).at(-1);
    const going: boolean = last !== undefined && !overIs(last, day);
    const round: number = picked ?? (last === undefined ? 0 : going ? last.round : last.round + 1);
    const step: string =
        own.findLast((line: RoundLine): boolean => line.round === round && line.step !== roundDone)?.step ?? "";
    return {
        section: section.startsWith(`${module}/`) ? section.slice(module.length + 1) : section,
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
 * Writes an attempt into the line of its section, an Example as `USED`, a cold Task as `TASK`.
 * A wrong one writes my comment as `NOTE` in one line, each `"` a `'`, an empty one kept for its place.
 *
 * @throws {Error} - When an attempt breaks the rules of its round
 */
function markTried(mark: RoundMark, task: Task, attempt: AttemptNew, decided: boolean): RoundMark {
    const comment: string = attempt.comment
        .replaceAll('"', "'")
        .replace(/[\s\p{Cc}]+/gu, " ")
        .trim();
    if (task.kind === "example") {
        if (attempt.result !== "right" || comment !== "") throw new Error(`An Example has no result: ${task.id}`);
        if (mark.used !== "" && mark.used !== task.heading)
            throw new Error(`One Example per round, ${mark.used} already`);
        return { ...mark, used: task.heading };
    }
    if (decided) throw new Error(`The round of ${task.section} is decided, close it`);
    if (attempt.result !== "right" && attempt.result !== "wrong") throw new Error(`No result ${attempt.result}`);
    if (comment !== "" && attempt.result !== "wrong") throw new Error(`No comment with ${attempt.result}`);
    const notes: string[] = attempt.result === "wrong" ? [...mark.notes, comment] : [...mark.notes];
    while (notes.at(-1) === "") notes.pop();
    return {
        ...mark,
        task: task.heading,
        results: [...mark.results, attempt.result],
        notes: notes,
    };
}

/** Writes the day of the next round as `DUE` into the line that decides its round, one decided before kept. */
function markDecide(mark: RoundMark, earlier: RoundLine[], line: RoundLine, exam: ExamDate): RoundMark {
    const rounds: Round[] = roundsOf([...earlier, line]);
    const round: Round = rounds[rounds.length - 1];
    if (round.decided === "" || round.due !== "" || mark.due !== "") return mark;
    return {
        ...mark,
        due: dueOf(rounds.slice(0, -1), round.results.at(-1) ?? "wrong", line.day, exam),
    };
}

/** Applies the attempts and then the step to the line of a section, and decides its round. */
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
        roundsOf([...earlier, lineOf(now, context.module, context.entry, context.day)]).at(-1)?.decided !== "";
    let now: RoundMark = mark;
    change.attempts.forEach((attempt: AttemptNew): void => {
        const task: Task | undefined = taskOf(context.tasks, attempt.task);
        if (task === undefined) throw new Error(`No task ${attempt.task}`);
        now = markTried(now, task, attempt, decided(now));
    });
    if (change.step !== "") now = markStepped(now, change.step, decided(now), context.tasks, section);
    return markDecide(now, earlier, lineOf(now, context.module, context.entry, context.day), context.exam);
}

/**
 * Writes the step I went on to, or `done`, passing an Example with `Next` checks it off.
 *
 * @throws {Error} - When it closes round 0 before its Task is right
 */
function markStepped(mark: RoundMark, step: string, decided: boolean, tasks: Task[], section: string): RoundMark {
    if (step === roundDone && mark.round === 0 && !decided)
        throw new Error(`Round 0 of ${section} closes only once its Task is right`);
    const left: Task | undefined = tasks.find(
        (task: Task): boolean =>
            task.kind === "example" && sectionKeyOf(task) === section && task.heading === mark.step,
    );
    const now: RoundMark =
        left === undefined || step === mark.step
            ? mark
            : markTried(mark, left, { task: left.id, result: "right", comment: "" }, decided);
    return { ...now, step: step };
}

/** Puts lines into a skill entry, each in the place of the last of its section unless that closed its round. */
function marksWith(kept: RoundMark[], marks: RoundMark[]): RoundMark[] {
    return marks.reduce((all: RoundMark[], mark: RoundMark): RoundMark[] => {
        const index: number = all.findLastIndex((other: RoundMark): boolean => other.section === mark.section);
        return index === -1 || all[index].step === roundDone ? [...all, mark] : all.with(index, mark);
    }, kept);
}

/**
 * Gives the line of a section an entry goes on in, its last while not closed, else a new one.
 * A round picked moves it to that round, at the step I last stood at in it.
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
    if (own === undefined || own.step === roundDone) return markStartOf(section, module, lines, picked, day);
    return picked === undefined || picked === own.round
        ? own
        : {
              ...own,
              round: picked,
              step: markStartOf(section, module, lines, picked, day).step,
          };
}

/** Gives the lines of the other entries and the entry's own that closed a round, which it never writes again. */
function othersOf(lines: RoundLine[], entry: string): RoundLine[] {
    return lines.filter((line: RoundLine): boolean => line.entry !== entry || line.step === roundDone);
}

/** Gives the section of a task with its module. */
function sectionKeyOf(task: Task): string {
    return `${task.id.split("/")[0]}/${task.section}`;
}

/** Gives the section of a line with its module, the module of its entry unless it names its own. */
function markSectionOf(mark: RoundMark, module: string): string {
    return mark.section.includes("/") ? mark.section : `${module}/${mark.section}`;
}

/** Gives the first task of the section of each line, so the entry links its note and names its chapter. */
function markTasksOf(marks: RoundMark[], module: string, tasks: Task[]): Task[] {
    return marks.flatMap((mark: RoundMark): Task[] => {
        const task: Task | undefined = tasks.find(
            (one: Task): boolean => sectionKeyOf(one) === markSectionOf(mark, module),
        );
        return task === undefined ? [] : [task];
    });
}

function taskOf(tasks: Task[], id: string): Task | undefined {
    return tasks.find((task: Task): boolean => task.id === id);
}

/** Gives the sections of the notes a skill entry links, each once. */
function linkedSectionsOf(links: Link[], tasks: Task[]): string[] {
    return [
        ...new Set(
            tasks
                .filter((task: Task): boolean => links.some((link: Link): boolean => link.path === notePathOf(task)))
                .map(sectionKeyOf),
        ),
    ];
}

/** Gives the links of a skill entry with the note of every line, a note it links keeping its link. */
function linksWith(links: Link[], marks: RoundMark[], module: string, tasks: Task[]): Link[] {
    const notes: string[] = [...new Set(markTasksOf(marks, module, tasks).map(notePathOf))];
    return [
        ...links,
        ...notes
            .filter((path: string): boolean => !links.some((link: Link): boolean => link.path === path))
            .map((path: string): Link => ({ path: path, fingerprint: "" })),
    ];
}

/**
 * Gives the lines `X-ROUND` of a skill entry and its links with them.
 * An entry of a type has none, since the tasks of its sheet or slides are no attempts.
 * My own learning has one per section it picked, links or tried.
 * A line of a note no longer linked goes while it holds nothing I did, else links its note again.
 *
 * @throws {Error} - When a pick, an attempt or a step is not right, or an entry of a type has them
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
    entry.rounds.forEach((pick: RoundPick): void => {
        if (
            !pick.section.startsWith(`${entry.module}/`) ||
            !tasks.some((task: Task): boolean => sectionKeyOf(task) === pick.section)
        )
            throw new Error(`No section ${pick.section}`);
        if (!Number.isInteger(pick.round) || pick.round < 0) throw new Error(`No round ${pick.round}`);
    });
    if (entry.attempts.some((attempt: AttemptNew): boolean => attempt.task.split("/")[0] !== entry.module))
        throw new Error(`Only attempts at tasks of ${entry.module}`);
    const lines: RoundLine[] = roundsRead();
    const exam: ExamDate = examOf(entry.module, skillBoxesRead(dayAdd(berlinDateOf(new Date()), planDays)));
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
                entry.rounds.find((pick: RoundPick): boolean => pick.section === section)?.round,
                berlinDateOf(new Date(entry.start)),
            ),
            {
                attempts: entry.attempts.filter((attempt: AttemptNew): boolean =>
                    tasks.some((task: Task): boolean => task.id === attempt.task && sectionKeyOf(task) === section),
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

/** Lists the chapters picked, then those of the sections I worked on, each once. */
function chaptersWith(chapters: string[], worked: string[], tasks: Task[]): string[] {
    const solved: string[] = worked.flatMap((id: string): string[] => {
        const task: Task | undefined = taskOf(tasks, id);
        return task === undefined ? [] : [task.chapter];
    });
    return [...new Set([...chapters, ...solved])];
}

/**
 * Checks a skill entry before it is written, its type offered, the one it had or none.
 * Its chapters are the module's or those it had, also once a folder has another name.
 *
 * @throws {Error} - When it or its people or times are not right
 */
function skillEntryCheck(entry: SkillEntryNew, kept: string[], keptType: string): void {
    if (!skillTypeAllows(entry.module, entry.type, keptType))
        throw new Error(`No type ${entry.type} of ${entry.module}`);
    const offered: string[] = entry.module === "" ? [] : moduleRead(entry.module).chapters;
    const unknown: string | undefined = entry.chapters.find(
        (chapter: string): boolean => !offered.includes(chapter) && !kept.includes(chapter),
    );
    if (unknown !== undefined) throw new Error(`No chapter ${unknown} in ${entry.module}`);
    if (!attendeesAllow(entry.attendees ?? []))
        throw new Error(`No people ${(entry.attendees ?? []).map((attendee: Attendee): string => attendee.name)}`);
    if (!(new Date(entry.start) < new Date(entry.end))) throw new Error("A skill entry needs an end after its start");
}

/**
 * Gives the fields of a skill entry, its place, online and people those of `from` while it sends none.
 *
 * @param from - The box a new entry is logged from, or the entry before a change
 * @param titled - The entry before a change, whose link of its summary it keeps
 */
function skillFieldsOf(entry: SkillEntryNew, from: Box | Entry | null, titled: Entry | null): EntryFields {
    const [title, titleLink]: [string, string] = titleOf({ ...entry, category: skillName }, titled);
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
        semester: semesterFor(skillName, entry.semester, berlinDateOf(new Date(entry.start))),
        note: entry.note.trim(),
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
}

/** Gives the properties of a new skill entry beyond its fields, with the box it is logged from and its group. */
function ownOf(
    links: Link[],
    chapters: string[],
    marks: RoundMark[],
    plan: Box | undefined,
): [string, string | Link | ICAL.Property][] {
    const own: [string, string | Link | ICAL.Property][] = [
        ...links.map((link: Link): [string, Link] => ["attach", link]),
        ...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]),
        ...marks.map((mark: RoundMark): [string, ICAL.Property] => ["x-round", roundPropertyOf(mark)]),
    ];
    if (plan !== undefined) own.push(["related-to", plan.id]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    return own;
}

/**
 * Writes a new skill entry into the log of its skill and marks the box it is logged from done.
 * My own learning without box is logged from the study box of its module and day, so learning does the plan.
 *
 * @throws {Error} - When the entry, its attempts, documents or online link are not right, or its box is not open
 */
export function skillEntryAdd(entry: SkillEntryNew): string {
    const tasks: Task[] = tasksRead();
    const [marks, links]: [RoundMark[], Link[]] = marksOfEntry(entry, { marks: [], id: "", links: [] }, tasks);
    const chapters: string[] = chaptersWith(
        entry.chapters,
        markTasksOf(marks, entry.module, tasks).map((task: Task): string => task.id),
        tasks,
    );
    const plan: Box | null =
        entry.planned !== ""
            ? boxOpenFind(entry.planned)
            : entry.module !== "" && entry.type === ""
              ? (studyBoxOf(entry.module, berlinDateOf(new Date(entry.start)), chapters) ?? null)
              : null;
    skillEntryCheck(entry, plan?.chapters ?? [], plan?.type ?? "");

    const fields: EntryFields = skillFieldsOf(entry, plan, null);
    const id: string = entryAppend(logFileOf(fields), fields, ownOf(links, chapters, marks, plan ?? undefined));
    if (plan !== null) boxDone(plan.id);
    return id;
}

/**
 * Changes a skill entry and adds the new attempts, moving it into the log of its new skill.
 * Its lines `X-ROUND` keep their section, naming its module once I change its skill.
 * Written only while its file holds it as the dialog opened it, so the first save wins.
 *
 * @returns Whether it is written, `false` when its file changed since the dialog opened it
 * @throws {Error} - When there is no such entry, or it, its attempts, documents or online link are not right
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

    const worked: string[] = markTasksOf(marks, change.module, tasks)
        .map((task: Task): string => task.id)
        .filter((task: string): boolean => task.split("/")[0] === change.module);
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
 * Writes where I stand in a round into the skill entry of the moment, with the note and chapter of its section.
 * Its end moves to the end of the quarter hour of now, if that is later.
 * Without one it starts one covering that quarter hour, logged from the open skill box without type.
 *
 * @throws {Error} - When an attempt or the step is not right
 */
function momentWrite(section: string, change: { attempts: AttemptNew[]; step: string }, tasks: Task[]): void {
    const module: string = section.split("/")[0];
    const now: Date = new Date();
    const quarter: Date = new Date(Math.ceil(now.getTime() / quarterHour) * quarterHour);
    const open: Entry | undefined = momentOf(module, now);
    const kept: RoundMark[] = open?.rounds ?? [];
    const start: Date = open === undefined ? new Date(quarter.getTime() - quarterHour) : new Date(open.start);
    const lines: RoundLine[] = roundsRead();
    const mark: RoundMark = markWith(
        markOf(kept, section, module, othersOf(lines, open?.id ?? ""), undefined, berlinDateOf(start)),
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
    const links: Link[] = linksWith(open === undefined ? [] : documentLinksOf(open.links), marks, module, tasks);
    const chapters: string[] = chaptersWith(
        open === undefined ? [] : chaptersOf(open),
        markTasksOf(marks, module, tasks).map((task: Task): string => task.id),
        tasks,
    );
    if (open === undefined) {
        const box: Box | undefined = skillBoxOf(module, now, chapters);
        const plan: Box | undefined = box?.type === "" ? box : undefined;
        const type: string = "";
        const semester: string = semesterFor(skillName, plan?.semester ?? "", berlinDateOf(start));
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

/** Gives the path from `NomWorkspace` of the note of a task. */
function notePathOf(task: Task): string {
    return `${modulesFolder}/${task.note}`;
}

/**
 * Finds the last entry of a module without type that started before now and ended at most {@link sessionPause} ago.
 * Without type, since only my own learning has rounds.
 */
function momentOf(module: string, now: Date): Entry | undefined {
    return skillEntriesRead(new Date(now.getTime() - sessionPause).toISOString(), now.toISOString())
        .filter((entry: Entry): boolean => entry.module === module && entry.type === "")
        .at(-1);
}

/**
 * Writes an attempt from a button of a task into the skill entry of the moment.
 *
 * @throws {Error} - When no note holds its task or the attempt is not right
 */
export function attemptAdd(attempt: AttemptNew): void {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = taskOf(tasks, attempt.task);
    if (task === undefined) throw new Error(`No task ${attempt.task}`);
    momentWrite(sectionKeyOf(task), { attempts: [attempt], step: "" }, tasks);
}

/**
 * Writes where I stand in the round of a section into the skill entry of the moment.
 *
 * @throws {Error} - When no task names its section, it names no step, or it closes round 0 too early
 */
export function roundAdd(line: RoundNew): void {
    const tasks: Task[] = tasksRead();
    if (!tasks.some((task: Task): boolean => sectionKeyOf(task) === line.section))
        throw new Error(`No section ${line.section}`);
    const step: string = line.step.replace(/\s+/g, " ").trim();
    if (step === "") throw new Error(`No step in ${line.section}`);
    momentWrite(line.section, { attempts: [], step: step }, tasks);
}

/** Reads the skill entry of the moment of a module, so the learning view records only in a session. */
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
 * Renames a task as `TASK` or `USED` in the lines of its section, so its history stays with it.
 * For the AI, by `node -e` in the folder of the dashboard, after the heading in its note.
 *
 * @throws {Error} - When the heading is not renamed in its note yet
 */
export function taskRename(from: string, to: string): number {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = taskOf(tasks, to);
    if (taskOf(tasks, from) !== undefined || task === undefined)
        throw new Error(`Rename the heading in its note first: ${from} to ${to}`);
    const after: string = task.heading;
    const before: string = after.slice(0, after.indexOf(". ") + 2) + from.slice(from.indexOf("/") + 1);
    let renamed: number = 0;
    skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).forEach((entry: Entry): void => {
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
    });
    return renamed;
}
