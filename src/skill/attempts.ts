/**
 * ## Attempts
 *
 * My tasks and modules from the reader, grouped by when they are due, and days as the page shows them.
 * Sends attempts and whole skill entries to the reader's one writer of skill entries.
 */

import { readerAsk } from "../reader.ts";
import type { Attempt, ExamDate, Result, RoundPick } from "../../reader/skill.ts";
import type { ModuleContents } from "../../reader/notes.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";

/**
 * A task as a chapter note holds it.
 * - `id`: Identity, `<module>/<name>`.
 * - `source`: Its source lines without `> ` and mode word, joined by `, `.
 * - `kind`: By the type word of its heading, example for an Example or Completion, cold for a Task.
 * - `parts`: Numbers of the parts of a cold task.
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
 * A {@link Task} with when it is due.
 * - `due`: Day of the next round of its section for the cold Task of that round, else empty.
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
 * A section of a module, a note of a chapter.
 * - `cold`: Identity of the cold Task of the round shown, empty when it has none yet.
 * - `example`: Identity of the next unused Example of the round shown.
 * - `algorithm`: Heading of its Algorithm, the one worked example.
 * - `round`: The round going on or ended today, else the next one.
 * - `ladder`: Whether the round shown is round 0, its theory, one Example and its first Task.
 * - `runs`: Its runs that count, decided before today.
 * - `rightDue`, `wrongDue`: Day of the next round after a Task right or wrong for good today.
 * - `at`: Key of the step I went on to with the last `Next`.
 * - `days`: Days I learned it, by its lines in the log.
 * - `today`: `task` for its Task of today, `new` for its round 0.
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
 * Every module of the semester with its tasks.
 * - `modules`: Also those without tasks yet.
 * - `skills`: The skills of the semester, a module by its code, any other by its name.
 * - `otherModules`: The other module folders by their codes, for the search.
 * - `names`: The name of each, which names its entries, its plan and its log.
 * - `paths`: The folder of each from `NomWorkspace`, empty for a skill without one.
 * - `links`: The link of each, one for all its entries and boxes, empty while I entered none.
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

/** A new attempt, the task judged as a whole. */
export type AttemptNew = {
    task: string;
    result: "right" | "wrong";
    comment: string;
};

/** A line `X-ROUND` of a skill entry. */
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
 * A new skill entry of the log, an empty field not written.
 * - `titleLink`: Its link typed, one for all entries of its skill, empty for the one they share.
 * - `semester`: Semester of the lecture or the material.
 * - `documents`: Paths of the documents it used from the folder of its skill.
 * - `rounds`: Rounds I picked by hand for its notes.
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

/** Whether a skill is one of my own system, named `Nom…`, which stand in the group `Master`. */
export function masterIs(name: string): boolean {
    return name.startsWith("Nom");
}

export async function skillingLoad(): Promise<Skilling> {
    return readerAsk<Skilling>("/api/skill/tasks");
}

/**
 * Loads the chapters and documents of a skill, none for a skill without module folder.
 * @throws {Error} - When the reader cannot answer
 */
export async function moduleLoad(code: string): Promise<ModuleContents> {
    return readerAsk<ModuleContents>(`/api/skill/module?code=${encodeURIComponent(code)}`);
}

/**
 * Sends something to write to the reader, as JSON.
 * @throws {Error} - When the reader does not take it
 */
async function readerSend(method: string, address: string, body: object): Promise<void> {
    const response: Response = await fetch(address, {
        method: method,
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}

/** Sends a new attempt into the skill entry of the moment. */
export async function attemptSend(attempt: AttemptNew): Promise<void> {
    await readerSend("POST", "/api/skill/attempt", attempt);
}

/**
 * Sends a skill entry of the log, new, or with its identifier the changes of that entry.
 * The reader refuses a change with 409 once the file changed it since the dialog opened it, the first save wins.
 * @param entry - Skill entry, for a change with only the new attempts
 * @param version - Fingerprint of the entry as the dialog opened it, empty for a new entry
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

/** A day as the page shows it, its short weekday in brackets where that helps. */
export function dayTextOf(day: string, weekday: boolean): string {
    const [year, month, number]: number[] = day.split("-").map(Number);
    const text: string = day.split("-").reverse().join(".");
    if (!weekday) return text;
    const date: Date = new Date(year, month - 1, number);
    return `${text} (${date.toLocaleDateString("en-GB", { weekday: "short" })})`;
}

/** Semester of a day, January to March belong to the winter that began the year before. */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10) return `${year}W`;
    if (month <= 3) return `${year - 1}W`;
    return `${year}S`;
}

/**
 * Orders tasks into groups by when they are due, empty groups stay.
 * Due today with those due earlier, new in the order of the notes, later by their day, then done.
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
