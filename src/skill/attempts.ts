/**
 * ## Attempts
 *
 * Loads my tasks with when each is due from the reader, and what a module offers a skill entry,
 * orders the tasks into groups by when they are due, writes days out as the page shows them,
 * and sends to the reader's one writer of skill entries:
 * an attempt from a button of a task into the skill entry of the moment,
 * and a whole skill entry from the entry by category.
 *
 * - `../day/entries.ts`: Names who I was with in a skill entry.
 * - `../reader.ts`: Asks the reader.
 */

import { readerAsk } from "../reader.ts";

import type { Attendee, Online } from "../day/entries.ts";

/**
 * Result of an attempt: solved right or wrong;
 * an older one may also be solved right with my tutor's help, stuck on the way,
 * or the task skipped, which nothing writes any more.
 */
export type Result = "right" | "guided" | "wrong" | "stuck" | "skipped";

/**
 * My effort on an older attempt, as one tap after it rated it; nothing rates it any more.
 */
export type Effort = "low" | "medium" | "high";

/**
 * An attempt, as the reader sends it.
 *
 * - `day`: Day its skill entry started, like `2026-10-10`.
 * - `order`: Its place among all my attempts, the oldest first,
 *   so attempts of one day keep the order I made them in.
 * - `time`: Time of the tap of an older attempt, like `14:05`, empty for any other.
 * - `part`: Part of a cold task an older attempt is about, like `2`, empty for the whole task.
 * - `result`: Its {@link Result}.
 * - `effort`: My {@link Effort} on an older attempt, empty for none.
 * - `stuck`: Where I got stuck, like `step 3`, empty when not given.
 * - `skip`: Why I skipped the task, like `too hard`, empty when not given.
 * - `error`: What went wrong in a wrong attempt, my short comment, empty when not given.
 */
export type Attempt = {
    day: string;
    order: number;
    time: string;
    part: string;
    result: Result;
    effort: Effort | "";
    stuck: string;
    skip: string;
    error: string;
};

/**
 * A task as a chapter note holds it, as the reader sends it.
 *
 * - `id`: Identity, `<module>/<name>`, like `IN2028/Airline Revenue Interval`.
 * - `name`: Name in its heading, like `Airline Revenue Interval`.
 * - `heading`: Its heading as written, like `Task. Airline Revenue Interval`.
 * - `source`: Its sources as written on its source lines, each without `> ` and its mode word,
 *   joined by `, `, like `[[…|VO 2025W 01 CourseOverview (38)]], [[…|VO 2025W 02 RegressionAnalysis (8)]]`, empty without one.
 * - `note`: Path of its note, as the scripts view takes it.
 * - `chapter`: Name of its chapter, like `01_RegressionAnalysis`.
 * - `section`: Name of its section, its note, like `01_01_SampleMeanStandardError`.
 * - `kind`: Its kind by the type word of its heading: example, an Example, its steps predicted
 *   one by one, or an older Completion; or cold, a Task.
 * - `parts`: Numbers of the parts of a cold task, like `1`, `2` and `3`, none for any other task.
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
 * - `due`: Day it is due next, like `2026-10-12`;
 *   empty when nothing is due, like for a task never tried.
 * - `done`: For a task of the ladder, whether I solved it right once,
 *   or its section has a cold run.
 * - `level`: For a cold task, the runs of its section that count, 0 to 4.
 * - `open`: For a cold task, its parts still to sit in its run; none for a task without parts.
 * - `ready`: For a cold task, whether its section has its four runs.
 * - `skipped`: Whether its last attempt skipped it.
 * - `attempts`: All its attempts, the latest last.
 */
export type SkillTask = Task & {
    due: string;
    done: boolean;
    level: number;
    open: string[];
    ready: boolean;
    skipped: boolean;
    attempts: Attempt[];
};

/**
 * A section of a module, a note of a chapter, as the reader sends it.
 *
 * - `title`: Its name, like `01_01_SampleMeanStandardError`.
 * - `note`: Path of its note.
 * - `chapter`: Name of its chapter.
 * - `cold`: Identity of its cold task of today, the one variant due, empty when it has none yet.
 * - `algorithm`: Heading of its Algorithm as written, the one worked example,
 *   at the bottom of its ladder;
 *   empty for none.
 * - `tasks`: Number of its tasks.
 * - `tried`: Number of its tasks I tried.
 * - `round`: Its round, the runs of its cold task done before today:
 *   a right run moves it on, a failed one leaves it.
 * - `ladder`: Whether it still learns the ladder before the cold task:
 *   while no cold task has an attempt on an earlier day.
 * - `rightDue`: Day the cold task comes back after a right run today; empty without a cold task.
 * - `wrongDue`: Day it comes back after a failed run today; empty without a cold task.
 * - `seen`: Steps of the round shown I passed with `Next`, by their keys,
 *   from older lines of the log;
 *   in today's form the steps before the one I stand at count as passed.
 * - `at`: Key of the step of the round shown I went on to with the last `Next`,
 *   where I stand, empty for none yet.
 * - `closed`: Whether I closed the round shown by hand.
 * - `days`: Days I learned it, by its attempts and its lines in the log,
 *   the oldest first, like `2026-10-11`.
 * - `today`: What of it is due today: `task`, its Task of today, `new`, its round 0,
 *   or empty for nothing, see `todayMarked` in `reader/skill.ts`.
 */
export type SkillSection = {
    title: string;
    note: string;
    chapter: string;
    cold: string;
    algorithm: string;
    tasks: number;
    tried: number;
    round: number;
    ladder: boolean;
    rightDue: string;
    wrongDue: string;
    seen: string[];
    at: string;
    closed: boolean;
    days: string[];
    today: "task" | "new" | "";
};

/**
 * The exam of a module, as the reader sends it.
 *
 * - `day`: Day of the exam, like `2027-02-25`.
 * - `estimated`: Whether the day is an estimate.
 */
export type ExamDate = {
    day: string;
    estimated: boolean;
};

/**
 * A module of the semester with its tasks, as the reader sends it.
 *
 * - `code`: Module code, like `IN2028`.
 * - `title`: Its name, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `exam`: Its exam.
 * - `tasks`: Its tasks in the order of the notes.
 * - `sections`: Its sections in the same order.
 */
export type SkillModule = {
    code: string;
    title: string;
    exam: ExamDate;
    tasks: SkillTask[];
    sections: SkillSection[];
};

/**
 * Every module of the semester with its tasks,
 * which the scripts show and the skill entries of the day pick from, as the reader sends it.
 *
 * - `modules`: Modules of the semester in their order, also those without tasks yet.
 * - `skills`: The skills of the semester in their order, for the Skill picker:
 *   a module by its code, like `IN2028`, a project by its folder name, like `WokFlow`.
 * - `otherModules`: The other module folders by their codes,
 *   like `IN0024`, for the search of the Skill picker.
 * - `folders`: The whole name of the folder of each of them by its name,
 *   which the Skill picker shows, like `IN2028_BusinessAnalyticsMachineLearning` for `IN2028`.
 * - `paths`: The folder of each of them from `NomWorkspace`,
 *   which a skill entry links, shown grey below the skill picked,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`.
 * - `types`: Types of a skill entry, like `VO`.
 */
export type Skilling = {
    modules: SkillModule[];
    skills: string[];
    otherModules: string[];
    folders: { [name: string]: string };
    paths: { [name: string]: string };
    types: string[];
};

/**
 * A link of a skill entry to a file or a folder, its `ATTACH`, as the reader sends it,
 * see `reader/documents.ts`.
 *
 * - `path`: Path from `NomWorkspace`, parted by `/`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`.
 * - `fingerprint`: SHA-256 of a file, empty for a folder.
 */
export type Link = {
    path: string;
    fingerprint: string;
};

/**
 * What a skill offers a skill entry, as the reader sends it; a project offers nothing.
 *
 * - `folder`: The module folder from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, empty for a project.
 * - `chapters`: Names of its chapter folders, also of the empty ones,
 *   like `05 Decision Trees Ensembles`.
 * - `documents`: Its files outside the chapter folders, the university's material,
 *   and the notes of its chapters, by their paths from the module folder,
 *   like `VO_UniversityLectureLessons/TUM_2025W/04_….pdf`
 *   or `01_RegressionAnalysis/01_01_SampleMeanStandardError.md`.
 * - `materials`: The folder of the material of each type, also while the module has none yet, like
 *   `VO_UniversityLectureLessons` for `VO`, none for a project.
 */
export type ModuleContents = {
    folder: string;
    chapters: string[];
    documents: string[];
    materials: { [type: string]: string };
    inner: string[];
};

/**
 * A new attempt to send, from a button of a task or as one of a skill entry:
 * the task judged as a whole.
 *
 * - `task`: Identity of the task.
 * - `result`: Its result, `right` or `wrong`.
 * - `comment`: My short comment on what went wrong, only with `wrong`, empty when not given.
 */
export type AttemptNew = {
    task: string;
    result: "right" | "wrong";
    comment: string;
};

/**
 * A new skill entry of the log to send from the entry by category; an empty field is not written.
 *
 * - `title`: Its title, free,
 *   like `IN2028 Lecture 3 recap`, empty for the one its skill and type give it.
 * - `type`: Its type, like `VO`, empty for none.
 * - `module`: Name of its skill, a module code like `IN2028` or a project like `WokFlow`.
 * - `semester`: Its semester, like `2026W`:
 *   from which semester the lecture or the material is, see {@link semesterOf}.
 * - `chapters`: Names of the chapters it covered, none for none.
 * - `documents`: Paths from the folder of its skill of the documents it used, none for none;
 *   the reader links each with its fingerprint, see `reader/documents.ts`.
 * - `attempts`: Its attempts, none for none.
 * - `location`: Place, like the room of a lecture logged from the plan.
 * - `online`, `onlineLink`, `passcode`: What I did online, like the stream of a lecture,
 *   see `Online` in `../day/entries.ts`.
 * - `attendees`: Who I was with, see `Attendee` in `../day/entries.ts`, none for nobody.
 * - `planned`: Identifier of the plan entry it is logged from, empty for none.
 * - `note`: Free note.
 * - `start`: Start of the entry.
 * - `end`: End of the entry, after the start.
 */
export type SkillEntryNew = Partial<Online> & {
    title: string;
    type: string;
    module: string;
    semester: string;
    chapters: string[];
    documents: string[];
    attempts: AttemptNew[];
    location: string;
    attendees: Attendee[];
    planned: string;
    note: string;
    start: Date;
    end: Date;
};

/**
 * Tasks that are due alike.
 *
 * - `name`: Name of the group, like `Due today`.
 * - `tasks`: Its tasks.
 */
export type Group = {
    name: string;
    tasks: SkillTask[];
};

/**
 * Category of skill entries in the entry by category.
 */
export const skillName: string = "Skill";

/**
 * Loads every module of the semester with its tasks from the reader, see {@link Skilling}.
 *
 * @returns Modules with their tasks and what the pickers offer
 * @throws {Error} - When the reader cannot answer
 */
export async function skillingLoad(): Promise<Skilling> {
    return readerAsk<Skilling>("/api/skill/tasks");
}

/**
 * Loads what a skill offers a skill entry from the reader,
 * its chapters and its documents, none for a project.
 *
 * @param code - Name of the skill, a module code like `IN2028` or a project like `WokFlow`
 * @returns Chapters and documents of the skill
 * @throws {Error} - When the reader cannot answer, like for a module without folder
 */
export async function moduleLoad(code: string): Promise<ModuleContents> {
    return readerAsk<ModuleContents>(`/api/skill/module?code=${encodeURIComponent(code)}`);
}

/**
 * Sends something to write to the reader, as JSON.
 *
 * @param method - HTTP method, `POST` for something new, `PATCH` for a change
 * @param address - Address at the reader, like `/api/skill/attempt`
 * @param body - What to write
 * @throws {Error} - When the reader does not take it
 */
async function readerSend(method: string, address: string, body: object): Promise<void> {
    const response: Response = await fetch(address, { method: method, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}

/**
 * Sends a new attempt from a button of a task to the reader,
 * which writes it into the skill entry of the moment.
 *
 * @param attempt - Attempt to write
 * @throws {Error} - When the reader does not take the attempt
 */
export async function attemptSend(attempt: AttemptNew): Promise<void> {
    await readerSend("POST", "/api/skill/attempt", attempt);
}

/**
 * Sends a skill entry of the log to the reader, with ISO instants: a new one to write,
 * or with the identifier of an entry the changes of that entry,
 * its attempts added after those it has, only while its file holds it as the dialog opened it:
 * the reader refuses the change with 409 once the file changed it since,
 * like an attempt the learning view wrote into it, see `skillEntryEdit` in `reader/skill.ts`,
 * as for any entry of the log, see `entryChange` in `../day/entries.ts`; the first save wins.
 * - `body`: The entry with ISO instants.
 * - `response`: Answer of the reader to a change.
 *
 * @param id - Identifier of the entry to change, empty for a new entry
 * @param entry - Skill entry, for a change with only the new attempts
 * @param version - Fingerprint of the entry to change as the dialog opened it,
 *   see `version` of `Entry` in `reader/calendar.ts`; empty for a new entry
 * @returns Whether it is written,
 *   `false` when the file changed the entry since the dialog opened it
 * @throws {Error} - When the reader does not take the entry for another reason
 */
export async function skillEntrySend(
    id: string,
    entry: SkillEntryNew,
    version: string,
): Promise<boolean> {
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

/**
 * Writes the day of a date in local time, in the form of the days of the reader.
 *
 * @param date - Date on the day
 * @returns Day like `2026-10-10`
 */
export function dayOf(date: Date): string {
    const month: string = String(date.getMonth() + 1).padStart(2, "0");
    const day: string = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Writes a day out as the page shows it, in my standard way with its year,
 * and its short weekday in English after it in brackets where that helps,
 * like for the day a task is due, as every day of the page shows it.
 *
 * @param day - Day like `2026-10-17`
 * @param weekday - Whether to write the weekday
 * @returns Day like `17.10.2026`, or `17.10.2026 (Sat)`
 */
export function dayTextOf(day: string, weekday: boolean): string {
    const [year, month, number]: number[] = day.split("-").map(Number);
    const text: string = day.split("-").reverse().join(".");
    if (!weekday) return text;
    const date: Date = new Date(year, month - 1, number);
    return `${text} (${date.toLocaleDateString("en-GB", { weekday: "short" })})`;
}

/**
 * Gives the semester of a day, which the dialog fills in for a skill entry until I pick another,
 * as the reader does, see `semesterOf` in `reader/categories.ts`:
 * October to March a winter, April to September a summer;
 * January to March belong to the winter that began the year before.
 * - `year`, `month`: Year and month of the day.
 *
 * @param day - Day like `2027-02-15`
 * @returns Semester like `2026W`, or `2027S` for `2027-05-04`
 */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10) return `${year}W`;
    if (month <= 3) return `${year - 1}W`;
    return `${year}S`;
}

/**
 * Orders tasks, like those of a module or of a chapter,
 * into groups by when they are due, see `reader/skill.ts`:
 * due today, also those due earlier, the earliest first;
 * new ones, never tried, in the order of the notes;
 * later ones by their day; done ones,
 * the ladder behind me and the ready cold tasks; skipped ones last.
 * - `open`: Tasks not skipped.
 * - `fresh`: Whether a task was never tried, skips aside.
 * - `byDue`: Compares two tasks by their due day, the earliest first.
 *
 * @param tasks - Tasks in the order of the notes
 * @param today - Today like `2026-10-10`
 * @returns Groups `Due today`, `New`, `Later`, `Done` and `Skipped`, also empty ones
 */
export function groupsOf(tasks: SkillTask[], today: string): Group[] {
    const open: SkillTask[] = tasks.filter((task: SkillTask): boolean => !task.skipped);
    const fresh: (task: SkillTask) => boolean = (task: SkillTask): boolean =>
        task.attempts.every((attempt: Attempt): boolean => attempt.result === "skipped");
    const byDue: (first: SkillTask, second: SkillTask) => number = (
        first: SkillTask,
        second: SkillTask,
    ): number => first.due.localeCompare(second.due);
    const dueToday: SkillTask[] = open.filter(
        (task: SkillTask): boolean => task.due !== "" && task.due <= today,
    );
    const later: SkillTask[] = open.filter((task: SkillTask): boolean => task.due > today);
    return [
        { name: "Due today", tasks: dueToday.sort(byDue) },
        {
            name: "New",
            tasks: open.filter(
                (task: SkillTask): boolean => task.due === "" && fresh(task) && !task.done,
            ),
        },
        { name: "Later", tasks: later.sort(byDue) },
        {
            name: "Done",
            tasks: open.filter(
                (task: SkillTask): boolean => task.due === "" && (task.done || !fresh(task)),
            ),
        },
        { name: "Skipped", tasks: tasks.filter((task: SkillTask): boolean => task.skipped) },
    ];
}
