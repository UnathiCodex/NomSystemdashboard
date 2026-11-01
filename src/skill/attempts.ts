/**
 * ## Attempts
 *
 * Loads my tasks with when each is due from the reader,
 * and what a module offers a skill entry,
 * orders the tasks into groups by when they are due,
 * writes days out as the page shows them,
 * and sends to the reader's one writer of skill entries:
 * an attempt from a button of a task into the skill entry of the moment,
 * and a whole skill entry from the entry by category.
 */

import { readerAsk } from "../reader.ts";
import type { Attempt, ExamDate, Result, RoundPick } from "../../reader/skill.ts";
import type { ModuleContents } from "../../reader/notes.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";

/**
 * A task as a chapter note holds it, as the reader sends it.
 *
 * - `id`: Identity, `<module>/<name>`.
 * - `source`: Its sources as written on its source lines,
 *   each without `> ` and its mode word, joined by `, `, empty without one.
 * - `kind`: Its kind by the type word of its heading: example, an Example,
 *   its steps predicted one by one, or an older Completion; or cold, a Task.
 * - `parts`: Numbers of the parts of a cold task, none for any other task.
 */
export type Task = {
    id: string;
    name: string;
    heading: string;
    source: string;
    note: string;
    chapter: string;
    section: string;
    kind: "example" | "cold";
    parts: string[];
};

/**
 * A {@link Task} with when it is due, as the reader sends it, see `reader/skill.ts`.
 *
 * - `due`: Day it is due next, the day of the next round of its section for its cold Task
 *   of that round; empty for any other task and when nothing is due.
 * - `done`: For an Example, whether I checked it off in a round.
 * - `level`: For a cold task, the runs of its section that count, 0 to 4.
 */
export type SkillTask = Task & {
    due: string;
    done: boolean;
    level: number;
    ready: boolean;
    attempts: Attempt[];
};

/**
 * A section of a module, a note of a chapter, as the reader sends it.
 *
 * - `cold`: Identity of the cold Task of the round shown, empty when it has none yet.
 * - `example`: Identity of the Example of the round shown, the next unused one.
 * - `algorithm`: Heading of its Algorithm as written, the one worked example.
 * - `round`: The round shown: one going on, or ended today, else the next one,
 *   see `sectionOf` in `reader/skill.ts`.
 * - `ladder`: Whether the round shown is round 0, its theory,
 *   one Example and its first Task.
 * - `runs`: Its runs that count, decided before today.
 * - `rightDue`, `wrongDue`: Day the next round comes after a right Task today,
 *   or after a Task wrong for good today.
 * - `at`: Key of the step of the round shown I went on to with the last `Next`.
 * - `days`: Days I learned it, by its lines in the log.
 * - `today`: What of it is due today: `task`, its Task of today, `new`, its round 0,
 *   see `todayMarked` in `reader/skill.ts`.
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
    today: "task" | "new" | "";
};

/** A module of the semester with its tasks in the order of the notes. */
export type SkillModule = {
    code: string;
    title: string;
    exam: ExamDate;
    tasks: SkillTask[];
    sections: SkillSection[];
};

/**
 * Every module of the semester with its tasks,
 * which the scripts show and the skill entries of the day pick from,
 * as the reader sends it.
 *
 * - `modules`: Also those without tasks yet.
 * - `skills`: The skills of the semester for the Skill picker,
 *   a module by its code, any other by its name, see `reader/skills.ts`.
 * - `otherModules`: The other module folders by their codes,
 *   for the search of the Skill picker.
 * - `names`: The name of each of them, which names its entries, its plan and its log.
 * - `paths`: The folder of each module, from `NomWorkspace`, empty for a skill without one.
 * - `links`: The link of each of them, one for all its entries and boxes,
 *   shown below the skill picked, empty while I entered none.
 */
export type Skilling = {
    modules: SkillModule[];
    skills: string[];
    otherModules: string[];
    names: { [name: string]: string };
    paths: { [name: string]: string };
    links: { [name: string]: string };
    types: string[];
};

/**
 * A new attempt to send, from a button of a task or as one of a skill entry:
 * the task judged as a whole.
 */
export type AttemptNew = {
    task: string;
    result: "right" | "wrong";
    comment: string;
};

/**
 * A line `X-ROUND` of a skill entry, as the reader sends it,
 * see `RoundMark` in `reader/calendar.ts`.
 */
export type RoundMark = {
    section: string;
    round: number;
    step: string;
    task: string;
    used: string;
    results: Result[];
    notes: string[];
    due: string;
};

/**
 * A new skill entry of the log to send from the entry by category;
 * an empty field is not written.
 *
 * - `titleLink`: Its link, typed, one for all entries of its skill;
 *   left out or empty, the one they share, see `titleOf` in `documents.ts`.
 * - `semester`: From which semester the lecture or the material is,
 *   see {@link semesterOf}.
 * - `documents`: Paths from the folder of its skill of the documents it used;
 *   the reader links each with its fingerprint, see `reader/documents.ts`.
 * - `rounds`: Rounds I picked by hand for its notes, see {@link RoundPick}.
 * - `planned`: Identifier of the plan entry it is logged from, empty for none.
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
    attendees: Attendee[];
    planned: string;
    note: string;
    start: Date;
    end: Date;
};

/** Tasks that are due alike. */
export type Group = {
    name: string;
    tasks: SkillTask[];
};

/** Category of skill entries in the entry by category. */
export const skillName: string = "Skill";

/**
 * My skill of the time I spend logging, planning and thinking about my day,
 * which alone stands in the group `Master`,
 * first in the Skill list and in the plan, see `moduleSearchOf` in `../day/skill.ts`.
 */
export const masterName: string = "NomMasterplannings";

/** Loads every module of the semester with its tasks from the reader. */
export async function skillingLoad(): Promise<Skilling> {
    return readerAsk<Skilling>("/api/skill/tasks");
}

/**
 * Loads what a skill offers a skill entry from the reader,
 * its chapters and its documents, none for a skill without module folder, like a project.
 *
 * @throws {Error} - When the reader cannot answer, like for a skill it does not know
 */
export async function moduleLoad(code: string): Promise<ModuleContents> {
    return readerAsk<ModuleContents>(`/api/skill/module?code=${encodeURIComponent(code)}`);
}

/**
 * Sends something to write to the reader, as JSON.
 *
 * @throws {Error} - When the reader does not take it
 */
async function readerSend(method: string, address: string, body: object): Promise<void> {
    const response: Response = await fetch(address, {
        method: method,
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}

/** Sends a new attempt from a button of a task into the skill entry of the moment. */
export async function attemptSend(attempt: AttemptNew): Promise<void> {
    await readerSend("POST", "/api/skill/attempt", attempt);
}

/**
 * Sends a skill entry of the log to the reader, with ISO instants: a new one to write,
 * or with the identifier of an entry the changes of that entry,
 * only while its file holds it as the dialog opened it:
 * the reader refuses the change with 409 once the file changed it since,
 * like an attempt the learning view wrote into it,
 * see `skillEntryEdit` in `reader/skill.ts`; the first save wins.
 *
 * @param entry - Skill entry, for a change with only the new attempts
 * @param version - Fingerprint of the entry as the dialog opened it,
 *   empty for a new entry
 * @returns `false` when the file changed the entry since the dialog opened it
 * @throws {Error} - When the reader does not take the entry for another reason
 */
export async function skillEntrySend(id: string, entry: SkillEntryNew, version: string): Promise<boolean> {
    const body: object = {
        ...entry,
        start: entry.start.toISOString(),
        end: entry.end.toISOString(),
    };
    if (id === "") {
        await readerSend("POST", "/api/skill/entry", body);
        return true;
    }
    const response: Response = await fetch("/api/skill/entry", {
        method: "PATCH",
        body: JSON.stringify({ ...body, id: id, version: version }),
    });
    if (response.status === 409) return false;
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return true;
}

/** Writes the day of a date in local time, in the form of the days of the reader. */
export function dayOf(date: Date): string {
    const month: string = String(date.getMonth() + 1).padStart(2, "0");
    const day: string = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** Adds days to a day, at noon so a change of summer time never moves it. */
export function dayAdd(day: string, days: number): string {
    const date: Date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + days);
    return dayOf(date);
}

/**
 * Writes a day out as the page shows it, in my standard way with its year,
 * and its short weekday in English after it in brackets where that helps.
 */
export function dayTextOf(day: string, weekday: boolean): string {
    const [year, month, number]: number[] = day.split("-").map(Number);
    const text: string = day.split("-").reverse().join(".");
    if (!weekday) return text;
    const date: Date = new Date(year, month - 1, number);
    return `${text} (${date.toLocaleDateString("en-GB", { weekday: "short" })})`;
}

/**
 * Gives the semester of a day, which the dialog fills in for a skill entry,
 * as the reader does, see `semesterOf` in `reader/categories.ts`:
 * January to March belong to the winter that began the year before.
 */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10) return `${year}W`;
    if (month <= 3) return `${year - 1}W`;
    return `${year}S`;
}

/**
 * Orders tasks into groups by when they are due, see `reader/skill.ts`:
 * due today, also those due earlier, the earliest first;
 * new ones, never tried, in the order of the notes;
 * later ones by their day; done ones, the Examples I checked off,
 * the Tasks tried and not due, and the ready cold tasks. Empty groups stay.
 */
export function groupsOf(tasks: SkillTask[], today: string): Group[] {
    const fresh: (task: SkillTask) => boolean = (task: SkillTask): boolean => task.attempts.length === 0;
    const byDue: (first: SkillTask, second: SkillTask) => number = (first: SkillTask, second: SkillTask): number =>
        first.due.localeCompare(second.due);
    const dueToday: SkillTask[] = tasks.filter((task: SkillTask): boolean => task.due !== "" && task.due <= today);
    const later: SkillTask[] = tasks.filter((task: SkillTask): boolean => task.due > today);
    return [
        { name: "Due today", tasks: dueToday.sort(byDue) },
        {
            name: "New",
            tasks: tasks.filter((task: SkillTask): boolean => task.due === "" && fresh(task) && !task.done),
        },
        { name: "Later", tasks: later.sort(byDue) },
        {
            name: "Done",
            tasks: tasks.filter((task: SkillTask): boolean => task.due === "" && (task.done || !fresh(task))),
        },
    ];
}
