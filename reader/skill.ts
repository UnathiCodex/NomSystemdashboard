/**
 * ## Skill
 *
 * Reads the tasks of my chapter notes and my attempts at them, tells when each task is due,
 * and writes the skill entries of the log:
 * the one writer of their chapters, documents and rounds,
 * for the scripts view and the entry by category alike.
 * Only the modules of the semester have tasks, see `activeModulesRead` in `notes.ts`;
 * their chapters and tasks are read live from the folders every time,
 * so a changed chapter changes the views too, and no list of them is kept anywhere.
 * A task is a block of a note of a chapter folder like `01_RegressionAnalysis` in my modules,
 * its kind by the type word of its heading:
 * `## Example. <name>` is an example, its scene and question, then its steps `1.`, `2.`, …,
 * which I predict one by one;
 * `## Task. <name>` is cold, the one I solve alone, one of its variants due per round;
 * a `## Definition.` and the `## Algorithm.`, the one worked example, are theory.
 * An older note keeps its meaning:
 * `## Completion. <name>` is an example;
 * a heading `## Task. <name> (cold)` is cold, `(cold)` no part of its name,
 * and each plain `## Task. <name>` there an example.
 * Its sources are the `>` lines right below its heading, one per source,
 * each starting with its mode word, `Original:` or `Generated:`, which is left out,
 * like `> Generated: [[VO_UniversityLectureLessons/TUM_2025W/01_CourseOverview.pdf#page=45|VO 2025W 01 CourseOverview (45)]]`.
 * The parts of a cold task, one per idea, are its numbered list items at the start of a line,
 * like `1. Sales $X_1,X_2,X_3$ of three days`, before its solution.
 *
 * A skill entry of the log is one block of learning of a type, as in the plan:
 * a lecture or a tutorial I attended, a homework sheet I worked on,
 * or study, solving the tasks of my notes, of any module of `NomSkillingmodules`,
 * also one of another semester I attend:
 * `CATEGORIES:Skill`, its `SUMMARY` the name of the folder of its module
 * with its type in round brackets, which names both,
 * by default linking the folder, for a type on into that of its material, as `ALTREP`,
 * `SUMMARY;ALTREP="NomSkillingmodules/IN2028_…/VO_…/TUM_2026W":IN2028_BusinessAnalyticsMachineLearning (VO)`,
 * see `documents.ts`; or a block of work on a project of the semester,
 * see `activeSkillsRead` in `notes.ts`,
 * which behaves like a module without chapters and tasks, linking its folder,
 * like `SUMMARY;ALTREP="NomSystemdashboard":NomSystemdashboard`;
 * the type may stay empty for any skill, like my own learning.
 * Below them, each only when there is one:
 * - one `ATTACH` per real document it used,
 *   like the slides of a lecture, the sheet of an exercise or the notes of a chapter,
 *   just its path, a file of the university with the fingerprint of its content,
 *   so the link survives a rename, a note without, since I change my notes too often,
 *   see `documents.ts`; the learning view attaches the note of each section I learn in it, like
 *   `ATTACH:NomSkillingmodules/IN2028_…/01_RegressionAnalysis/01_02_SampleMeanEstimator.md`;
 *   its `DESCRIPTION` is only my free note;
 * - its semester, `X-SEMESTER`, see `semesterFor` in `categories.ts`;
 * - one `X-CHAPTER` per chapter of my system it belongs to, of any type,
 *   like `X-CHAPTER:02_LogisticPoissonRegression`, several for a session over several chapters,
 *   like exam training, the chapters of the sections of its rounds always among them;
 *   an older entry that links the folder of a chapter instead gets its `X-CHAPTER` once it changes,
 *   see `chaptersOf` in `documents.ts`;
 * - one `X-ROUND` per section it works on, of any type, also logged by hand,
 *   where I stand in its round and what I did in it, see {@link RoundLine} and `RoundMark`
 *   in `calendar.ts`, written anew in its place as I go on, like
 *   `X-ROUND;ROUND=1;STEP=Task. Food Truck;USED=Example. Canteen Double Count;RESULT=wrong:01_02_SampleMeanEstimator`,
 *   then with `STEP=done` once I closed the round; the order of the lines is the order I did it in.
 * Every attempt stands in the line of its section, so no task is solved outside a round:
 * a result of a cold Task, right or wrong, judged as a whole, my comment on a wrong one,
 * or an Example I checked off with `Next`, which has no result.
 * A button of a task writes into the skill entry of the moment:
 * the last one of the task's module that started before now and ended at most half an hour ago,
 * like a tutorial logged from the plan;
 * it grows to the end of the quarter hour of the attempt,
 * so the half hour of a pause counts from the attempt.
 * Without one, a new entry starts, covering the quarter hour of the attempt,
 * in the steps of the day view:
 * of the type of the open skill box of the module for now, logged from it,
 * so the rounds do the box,
 * see `skillBoxOf` in `boxes.ts`, else without type, my own learning, like `IN2028`.
 * The skill entry of the moment of any module is the session running now,
 * whose timer the page shows when it is of a type I pace myself,
 * my own learning or homework, see {@link sessionRead}.
 * Due by my protocol, per section, a note like `01_01_SampleMeanStandardError.md`,
 * as `~/NomWorkspace/.claude/skills/learn/4-session-learn/session-learn.md` says it, see `## Rounds`:
 * round 0 is its whole theory, its first Example and its first Task,
 * gone over until the Task is right, since the first can only succeed;
 * every later round its theory from my head and the next Task not solved yet;
 * a wrong Task brings the next unused Example, then the Task again, which then counts as right;
 * wrong again, the next round comes 2 days later and the spacing starts over.
 * One Example per round; the Task decides the round and writes the day of the next one
 * into its line as `DUE`, see {@link dueOf}.
 * After the first run, round 0, the next round comes 1 day later,
 * after the second 7 days later, after the third 21 days later;
 * after the fourth it is ready, three runs spaced after the first,
 * and comes back about 14 days before its exam,
 * with one keep-up check halfway when the exam lies more than 6 weeks off,
 * see {@link exams} (Cepeda 2008, Rohrer 2005).
 * A right Task before its day counts as none, so the runs stay spaced.
 *
 * - `ical.js`: Builds the lines `X-ROUND` the reader writes, see `roundPropertyOf` in `calendar.ts`.
 * - `./boxes.ts`: Finds the skill box of a module for now,
 *   marks a box done once a skill entry is logged from it,
 *   and reads the skill boxes of the plan, for the exam of each module.
 * - `./calendar.ts`: Reads the log, appends entries to it,
 *   changes their events, and adds days to a day.
 * - `./categories.ts`: Names the category and the types of skill entries
 *   and writes what a skill entry was.
 * - `./day.ts`: Gives the log an entry belongs into, the log of its skill.
 * - `./documents.ts`: Builds the links of a skill entry, to the folder of its skill,
 *   to its documents with their fingerprints and to the folders of its chapters.
 * - `./notes.ts`: Reads the modules and the skills of the semester,
 *   the modules with their chapters and notes, and every module folder.
 * - `./places.ts`: Gives the link of the place of a skill entry.
 * - `./sources.ts`: Names the skill log and the projects of the semester,
 *   and the folder of my modules.
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
import type { Attendee, Entry, EntryFields, Link, Online, RoundMark } from "./calendar.ts";
import type { Chapter, ModuleContents, NoteEntry, NotesModule } from "./notes.ts";

/**
 * Result of a cold Task: solved right or wrong.
 */
export type Result = "right" | "wrong";

/**
 * Kind of a task, see the top of this file: an example, its steps predicted one by one,
 * or cold, solved alone.
 */
export type Kind = "example" | "cold";

/**
 * A task as a chapter note holds it.
 * Its identity is its module and its name, not its note or chapter,
 * so it keeps its history when it moves.
 * A task whose wording improves keeps its heading and with it its history;
 * a task thrown away disappears, and its attempts stay in the log,
 * because they happened, but count nowhere.
 * Names are unique within a module; a renamed one takes its attempts along, see {@link taskRename}.
 *
 * - `id`: Identity, `<module>/<name>`,
 *   like `IN2028/Airline Revenue Interval`, the first part of its `X-ATTEMPT`s.
 * - `name`: Name in its heading,
 *   like `Airline Revenue Interval` of `## Task. Airline Revenue Interval`.
 * - `heading`: Its heading as written, like `Task. Airline Revenue Interval`, for a link to it.
 * - `kind`: Its {@link Kind}, by the type word of its heading.
 * - `source`: Its sources as written on its source lines, each without `> ` and its mode word,
 *   joined by `, `, like `[[…|VO 2025W 01 CourseOverview (38)]], [[…|VO 2025W 02 RegressionAnalysis (8)]]`, empty without one.
 * - `note`: Path of its note, as the scripts view takes it, like
 *   `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_02_SampleMeanEstimator.md`.
 * - `chapter`: Name of its chapter, like `01_RegressionAnalysis`.
 * - `section`: Name of its section, its note, like `01_01_SampleMeanStandardError`.
 * - `parts`: Numbers of the parts of a cold task,
 *   like `1`, `2` and `3`, none for one without parts and any other task.
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
 * An attempt at a task, as the views show it, read from the lines `X-ROUND` of the log,
 * see {@link RoundLine}: a result of a cold Task, or an Example I checked off, which reads as right.
 *
 * - `day`: Day its skill entry started in Berlin time, like `2026-10-10`.
 * - `order`: Its place among all my attempts, the oldest first,
 *   by the order of the skill entries and of the lines in each.
 * - `result`: Its {@link Result}.
 * - `error`: My comment on a wrong one, like `Step 2: weights add up to 1.2, not 1`,
 *   empty when not given.
 */
export type Attempt = {
    day: string;
    order: number;
    result: Result;
    error: string;
};

/**
 * A {@link Task} with when it is due, see the top of this file.
 *
 * - `due`: Day it is due next, like `2026-10-12`, the day of the next round of its section
 *   for its cold Task of that round, empty for any other task and when nothing is due.
 * - `done`: For an Example, whether I checked it off in a round.
 * - `level`: For a cold task, the runs of its section that count, 0 to 4.
 * - `ready`: For a cold task, whether its section has its four runs, spaced as the protocol says.
 * - `attempts`: All its attempts, the latest last.
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
 * - `title`: Its name, like `01_01_SampleMeanStandardError`.
 * - `note`: Path of its note, as the scripts view takes it.
 * - `chapter`: Name of its chapter, like `01_RegressionAnalysis`.
 * - `cold`: Identity of the cold Task of the round shown, see {@link coldOf},
 *   empty when it has none yet.
 * - `example`: Identity of the Example of the round shown, see {@link exampleOf},
 *   empty for none left.
 * - `algorithm`: Heading of its Algorithm as written, the one worked example,
 *   like `Algorithm. Check an Estimator for Bias`, see {@link algorithmOf}; empty for none.
 * - `tasks`: Number of its tasks, the cold one included.
 * - `tried`: Number of its tasks I tried.
 * - `round`: The round shown: one going on, or closed today, else the next one, see {@link sectionOf}.
 * - `ladder`: Whether the round shown is round 0, its theory, one Example and its first Task.
 * - `runs`: Its runs that count, decided before today, so it stays the whole day,
 *   see {@link levelsOf}.
 * - `day`: Day the round shown began, today for one not begun.
 * - `rightDue`: Day the next round comes after a right Task today,
 *   by the spacing, see {@link dueAfter}; empty without a cold task.
 * - `wrongDue`: Day it comes after a Task wrong for good today, 2 days later;
 *   empty without a cold task.
 * - `at`: Key of the step of the round shown I am at, by the last `Next`, empty for none yet.
 * - `closed`: Whether I closed the round shown by hand.
 * - `results`: Results of the Task of the round shown, in order, none for none yet.
 * - `used`: Whether the round shown checked its Example off, its `USED`.
 * - `days`: Days I learned it, the days of its lines `X-ROUND`, the oldest first,
 *   like `2026-10-11`.
 * - `today`: What of it is due today, see {@link todayMarked}:
 *   `task`, its Task of today, `new`, its round 0, or empty for nothing.
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

/**
 * What of a section is due today, see {@link todayMarked}.
 */
export type SectionToday = "task" | "new" | "";

/**
 * A line `X-ROUND` of a skill entry of the log, see `RoundMark` in `calendar.ts`,
 * so where I am and what I did lives in the log alone, never in the browser or the note:
 * one line per section in a skill entry, written anew in its place as I go on, its section,
 * its round, the step I went on to with `Next`, where the round goes on,
 * also in another session, or `done` once I closed the round by hand;
 * the cold Task I solved in it with its results and my comment on each wrong one,
 * the Example I checked off, and once the Task decided the round, the day the next one comes.
 * The steps before the step count as passed.
 * Every skill entry that links the note of a section holds one, also one I logged by hand,
 * see {@link markStartOf}, and every line links its note, see {@link linksWith},
 * so no attempt stands outside a round.
 * The lines of a section in a row with the same round are that round, see {@link roundsOf},
 * so a round I did not close goes on over days and entries until I close it.
 * A step is named by its key, its heading as written.
 *
 * - `entry`: Identifier of its skill entry.
 * - `day`: Day of its skill entry.
 * - `section`: Its section with its module, `<module>/<note name>`,
 *   like `IN2028/01_02_SampleMeanEstimator`.
 * - `round`, `step`, `results`, `notes`, `due`: As written, see `RoundMark` in `calendar.ts`.
 * - `task`, `example`: Identities of its Task and of the Example it used, `<module>/<name>`,
 *   from their headings, empty for none.
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
 * A round of a section, its lines `X-ROUND` in a row with the same round, see {@link roundsOf}.
 *
 * - `round`: Its round.
 * - `lines`: Its lines in order.
 * - `closed`: Whether I closed it, its last line `done`.
 * - `task`, `example`: Identities of its Task and its Example, the last named, empty for none.
 * - `results`: Results of its Task, of all its lines in order.
 * - `decided`: Day of the line whose result decided it, see {@link decidedIs}, empty while open.
 * - `due`: Day the next round comes, the `DUE` of that line, empty while open.
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

/**
 * Where I stand in a round, as the scripts view sends it, see {@link roundAdd}.
 *
 * - `section`: Its section with its module, like `IN2028/01_02_SampleMeanEstimator`.
 * - `round`: Its round.
 * - `step`: Key of the step I went on to, or `done` once I closed the round.
 */
export type RoundNew = {
    section: string;
    round: number;
    step: string;
};

/**
 * A round I picked by hand for a note of a skill entry, as its dialog sends it,
 * see {@link roundPicksOf}.
 *
 * - `section`: Its section with its module, like `IN2028/01_02_SampleMeanEstimator`.
 * - `round`: The round picked, like `0`.
 */
export type RoundPick = {
    section: string;
    round: number;
};

/**
 * The exam of a module: its day, and whether that day is only estimated,
 * like from the exams of earlier years.
 *
 * - `day`: Day of the exam, like `2027-02-25`.
 * - `estimated`: Whether the day is an estimate, until the university names it.
 */
export type ExamDate = {
    day: string;
    estimated: boolean;
};

/**
 * A module of the semester with its tasks.
 *
 * - `code`: Module code, like `IN2028`, the part of its folder name before `_`.
 * - `title`: Its name, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `exam`: Its exam, see {@link exams}.
 * - `tasks`: Its tasks, by chapters, notes and headings in order, each name once.
 * - `sections`: Its sections in the same order, each with its cold task.
 */
export type SkillModule = {
    code: string;
    title: string;
    exam: ExamDate;
    tasks: SkillTask[];
    sections: SkillSection[];
};

/**
 * Everything the scripts view shows of my tasks, and the skill entries of the day pick from.
 *
 * - `modules`: Modules of the semester in the order of their list, also those without tasks yet.
 * - `skills`: The skills of the semester for the Skill picker, in their order,
 *   by their names, see {@link skillNameOf}:
 *   a module by its code, like `IN2028`, a project by its folder name, like `WokFlow`.
 * - `otherModules`: The other module folders by their codes,
 *   like `IN0024`, for the search of the Skill picker, which reaches every module.
 * - `folders`: The whole name of the folder of each of them by its name,
 *   which the Skill picker shows, like `IN2028_BusinessAnalyticsMachineLearning` for `IN2028`,
 *   or `WokFlow` for a project, see `skillTitleOf` in `documents.ts`.
 * - `paths`: The folder of each of them from `NomWorkspace` by its name, like
 *   `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`,
 *   see `skillFolderOf` in `documents.ts`.
 * - `links`: The link of each of them by its name, one for all its entries and boxes,
 *   which the dialog fills in below the skill picked, see `skillLinkOf` in `documents.ts`.
 * - `types`: Types of a skill entry, like `VO`.
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
 * and as each attempt of a skill entry of the dialog comes, written into the line `X-ROUND`
 * of its section, see {@link markTried}: a cold Task judged as a whole, right or wrong,
 * or an Example checked off, always right.
 *
 * - `task`: Identity of the task, see {@link Task}.
 * - `result`: Its result, `right` or `wrong`, an Example only `right`.
 * - `comment`: My short comment on what went wrong, only with `wrong`, empty when not given.
 */
export type AttemptNew = {
    task: string;
    result: Result;
    comment: string;
};

/**
 * A new skill entry of the log, as the entry by category sends it; an empty field is not written.
 *
 * - `title`: Its title, `SUMMARY`, always the one its skill and type give it,
 *   see `titleOf` in `documents.ts`.
 * - `titleLink`: Its link, typed, one for all entries of its skill;
 *   left out or empty, the one they share, see `titleOf` in `documents.ts`.
 * - `type`: Its type, one of the types of `categories.ts`, like `VO`, empty for none.
 * - `module`: Name of its skill: the code of any module folder, like `IN2028`,
 *   or a project of the semester, like `WokFlow`.
 * - `semester`: Its semester, `X-SEMESTER`, like `2026W`, the semester of its day when empty,
 *   see `semesterFor` in `categories.ts`.
 * - `chapters`: Names of the chapters of my system it belongs to, like `01_RegressionAnalysis`,
 *   none for none.
 * - `documents`: Paths from the folder of its skill of the documents it used, files of its module,
 *   like `VO_UniversityLectureLessons/TUM_2025W/04_LogisticPoissonRegression.pdf`
 *   or the notes of a chapter, empty for none.
 * - `attempts`: Its attempts, in the order they were picked, none for none.
 * - `rounds`: Rounds I picked by hand for its notes, none for none.
 * - `location`: Place, `LOCATION`, like the room of a lecture logged from its box.
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`:
 *   What I did online, like the stream of a lecture,
 *   as for any entry of the log, see `EntryNew` in `day.ts`;
 *   left out by a sender that does not know them, so it keeps them or takes those of its box.
 * - `attendees`: Who I was with, one `ATTENDEE` each;
 *   left out, as for any entry of the log, see `EntryNew` in `day.ts`.
 * - `planned`: Identifier of the box it is logged from,
 *   written as its `RELATED-TO`, empty for none.
 * - `note`: Free note, `DESCRIPTION`.
 * - `start`: Start as ISO instant.
 * - `end`: End as ISO instant, after the start.
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
 * A changed skill entry of the log, as the entry by category sends it: a {@link SkillEntryNew}
 * with the identifier `id` of the entry,
 * whose `attempts` are only the new ones, added after those it has;
 * its box stays as it is, and its place keeps its link while it stays the same place;
 * and with `version`, its fingerprint as the dialog opened it,
 * see `version` of `Entry` in `calendar.ts`, so the reader writes nothing older than the file,
 * see {@link skillEntryEdit}.
 */
export type SkillEntryChange = SkillEntryNew & { id: string; version: string };

/**
 * A session of a module running now, as the learning view reads it, see {@link sessionRead}.
 *
 * - `module`: Name of its skill, like `IN2028` or `WokFlow`.
 * - `type`: Its type, `HU`, empty for none, like my own learning or a project.
 * - `title`: What its skill entry is, as written,
 *   like `IN2028_BusinessAnalyticsMachineLearning (HU)`.
 * - `start`, `end`: Start and end of its skill entry, as ISO instants; it runs until its end.
 */
export type Session = {
    module: string;
    type: string;
    title: string;
    start: string;
    end: string;
};

/**
 * A module of the semester with the tasks of its chapter notes.
 *
 * - `code`: Module code, like `IN2028`.
 * - `title`: Its name, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `tasks`: Its tasks, by chapters, notes and headings in order.
 */
type ModuleTasks = {
    code: string;
    title: string;
    tasks: Task[];
};

/**
 * An attempt as the log holds it.
 *
 * - `task`: Identity of its task.
 * - `attempt`: The attempt, as the views show it.
 */
type LoggedAttempt = {
    task: string;
    attempt: Attempt;
};

/**
 * Step of a line `X-ROUND` once I closed its round, see {@link RoundLine}.
 */
const roundDone: string = "done";

/**
 * Days until the next round of a section after its Task stayed wrong, see `session-learn.md`.
 */
const retryDays: number = 2;

/**
 * Days until a section is due again after its first, second and third right run:
 * the next round tomorrow, then after 7 and after 21 days;
 * after the fourth, one more than there are gaps,
 * it is ready and due before its exam, see {@link dueAfter}.
 */
const spacingDays: number[] = [1, 7, 21];

/**
 * Days before its exam a ready section comes back once more, cold.
 */
const examDays: number = 14;

/**
 * Days between a ready section and its exam beyond which one keep-up check lies halfway between,
 * about 6 weeks, since without one 70 % fell to 24 % in 9 weeks (Rohrer 2005).
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
 * whose exam the university has not named yet, by their codes;
 * a named exam stands in the plan of its module as a box of the type `FA`, which wins,
 * see {@link examOf}, like WI1057 on 18.02.2027 at 17:00;
 * a module neither planned nor listed is estimated at {@link examDefault}.
 * IN2028 is estimated from its endterms of the last years,
 * all on the last Thursday or so of February:
 * 28.02.2022, 29.02.2024, 27.02.2025.
 */
export const exams: { [code: string]: ExamDate } = {
    IN2028: { day: "2027-02-25", estimated: true },
};

/**
 * Exam of a module whose exam is not listed:
 * the first Monday of the exam period after the lectures of 2026W, the earliest it could be,
 * so the last runs come in time.
 */
const examDefault: ExamDate = { day: "2027-02-15", estimated: true };

/**
 * Days after today up to which the plan of each module is searched for its exam,
 * see {@link examOf}: a year, so a series without end stops.
 */
const planDays: number = 366;

/**
 * Part of a cold task, a numbered list item at the start of a line,
 * like `2. Campus kiosk, seven days in July`.
 */
const partLine: RegExp = /^(\d+)\.\s/;

/**
 * A quarter hour in milliseconds, the step of the day view.
 */
const quarterHour: number = 15 * 60 * 1000;

/**
 * Longest pause after a skill entry in which a button still writes into it,
 * half an hour in milliseconds.
 */
const sessionPause: number = 30 * 60 * 1000;

/**
 * Heading of a task, `## Example. <name>`, `## Completion. <name>` or `## Task. <name>`,
 * an older one `## Task. <name> (cold)`: the heading as written, its type word, the name,
 * and `(cold)` when it is there.
 */
const taskHeading: RegExp =
    /^## ((Example|Completion|Task)\.[ \t]+(.+?)(?:[ \t]+(\(cold\)))?)[ \t]*$/;

/**
 * Heading of the Algorithm of a note, `## Algorithm. <name>`,
 * the one worked example: the heading as written.
 */
const algorithmHeading: RegExp = /^##[ \t]+(Algorithm\.[ \t]+.+?)[ \t]*$/;

/**
 * Heading of a cold task written the older way, `## Task. <name> (cold)`,
 * which marks the whole note as written so.
 */
const olderCold: RegExp = /^## Task\.[ \t]+.+[ \t]+\(cold\)[ \t]*$/;

/**
 * Source line of a task, one per source, `> Original: …` or `> Generated: …` with its mode word,
 * which is left out, or `> …` without one.
 */
const sourceLine: RegExp = /^>[ \t]*(?:(?:Original|Generated):[ \t]*)?(.*?)[ \t]*$/;

/**
 * Gives the name of a section from the path of its note, the name of the note as it is,
 * without `.md`, like `01_01_SampleMeanStandardError` of `…/01_01_SampleMeanStandardError.md`.
 *
 * @param note - Path of the note
 * @returns Name
 */
function sectionTitleOf(note: string): string {
    return (note.split("/").at(-1) ?? note).replace(/\.md$/, "");
}

/**
 * Reads the parts of a cold task: the numbers of its lines that start with a number and `.`,
 * see {@link partLine}, from below its heading to the next heading,
 * which is its solution or the next block, each number once.
 * - `body`: Lines below the heading, up to the next heading.
 *
 * @param lines - Lines of the note
 * @param index - Line of the heading of the task
 * @returns Numbers in their order, like `1`, `2` and `3`; none for a task without parts
 */
function partsOf(lines: string[], index: number): string[] {
    const end: number = lines.findIndex(
        (line: string, at: number): boolean => at > index && line.startsWith("#"),
    );
    const body: string[] = lines.slice(index + 1, end === -1 ? lines.length : end);
    return [
        ...new Set(
            body.flatMap((line: string): string[] => partLine.exec(line)?.slice(1, 2) ?? []),
        ),
    ];
}

/**
 * Gives the sources of a task: its source lines, the `>` lines right below its heading,
 * see {@link sourceLine}, each without `> ` and its mode word, joined by `, `.
 * - `quotes`: Lines right below the heading that start with `>`.
 *
 * @param lines - Lines of the note
 * @param index - Line of the heading of the task
 * @returns Sources, like `[[…|VO 2025W 01 CourseOverview (38)]], [[…|VO 2025W 02 RegressionAnalysis (8)]]`,
 *   empty without one
 */
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
 * Tells the kind of a task by the type word of its heading, see the top of this file:
 * a `Task.` cold, any other an example;
 * in a note written the older way only a `Task.` with `(cold)` cold.
 *
 * @param word - Type word of the heading, like `Example`
 * @param cold - Whether the heading ends with `(cold)`
 * @param older - Whether the note is written the older way
 * @returns Its kind
 */
function kindOf(word: string, cold: boolean, older: boolean): Kind {
    return word === "Task" && (!older || cold) ? "cold" : "example";
}

/**
 * Gives the heading of the Algorithm of a note, its first `## Algorithm. <name>`,
 * see {@link algorithmHeading}.
 *
 * @param note - Path of the note, as the scripts view takes it
 * @returns Heading as written, like `Algorithm. Check an Estimator for Bias`, empty for none
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
 * Reads the tasks of a note in their order: each heading of a task with its sources,
 * see {@link sourceOf}, its kind, see {@link kindOf}, and for a cold task its parts.
 * - `lines`: Lines of the note.
 * - `section`: Name of the note's section.
 * - `older`: Whether the note is written the older way, with a heading `## Task. <name> (cold)`.
 *
 * @param code - Module code of the note
 * @param chapter - Name of the chapter of the note
 * @param note - Path of the note, as the scripts view takes it
 * @returns Tasks of the note
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
 * Reads the modules of the semester with their tasks, live from the folders:
 * every chapter of the module, every note in the chapter, every task in the note,
 * in the order of the menu of the scripts view.
 *
 * @returns Modules, also those without tasks
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
 * @returns Tasks in order
 * @throws {Error} - When a folder or note cannot be read
 */
function tasksRead(): Task[] {
    return moduleTasksRead().flatMap((module: ModuleTasks): Task[] => module.tasks);
}

/**
 * Reads the skill entries of the log that overlap a range, in the order of their starts.
 *
 * @param start - Start of the range as ISO instant
 * @param end - End of the range, excluded, as ISO instant
 * @returns Log entries `Skill`
 */
function skillEntriesRead(start: string, end: string): Entry[] {
    return entriesRead(skillLog, start, end)
        .filter((entry: Entry): boolean => entry.category === skillName)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
}

/**
 * Reads the lines `X-ROUND` of all skill entries of the log up to now, see {@link RoundLine},
 * in the order of their entries and within each,
 * each section, Task and Example with its module, the module of its entry
 * unless the section names its own, like `IN2028/01_02_…` once the entry's skill changed,
 * a Task and an Example by the name in its heading, see {@link nameOf}.
 * - `day`: Day of a skill entry.
 * - `module`: Module of a line.
 *
 * @returns Lines in order
 */
function roundsRead(): RoundLine[] {
    return skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).flatMap(
        (entry: Entry): RoundLine[] => {
            const day: string = berlinDateOf(new Date(entry.start));
            return entry.rounds.map((mark: RoundMark): RoundLine => {
                const section: string = mark.section.includes("/")
                    ? mark.section
                    : `${entry.module}/${mark.section}`;
                const module: string = section.split("/")[0];
                return {
                    entry: entry.id,
                    day: day,
                    section: section,
                    round: mark.round,
                    step: mark.step,
                    task: mark.task === "" ? "" : `${module}/${nameOf(mark.task)}`,
                    example: mark.used === "" ? "" : `${module}/${nameOf(mark.used)}`,
                    results: mark.results,
                    notes: mark.notes,
                    due: mark.due,
                };
            });
        },
    );
}

/**
 * Gives the name in the heading of a task, after its type word,
 * like `Food Truck` of `Task. Food Truck`.
 *
 * @param heading - Heading as written, like `Example. Canteen Double Count`
 * @returns The name
 */
function nameOf(heading: string): string {
    return heading.slice(heading.indexOf(". ") + 2);
}

/**
 * Reads my attempts from the lines `X-ROUND`, see {@link Attempt}, in their order:
 * per line its Example checked off, then each result of its Task with my comment on a wrong one.
 * - `order`: Place of the next attempt.
 * - `wrongs`: Wrong results of a line so far, whose comment is the next of its notes.
 *
 * @param lines - Lines `X-ROUND` in order, see {@link roundsRead}
 * @returns Attempts with their tasks
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
 *
 * @param round - The round
 * @param day - The day, like `2026-10-29`
 * @returns Whether it is over
 */
function overIs(round: Round, day: string): boolean {
    return round.closed || (round.decided !== "" && round.decided < day);
}

/**
 * Gives the rounds of a section from its lines, see {@link Round}:
 * the lines in a row with the same round, a round over ending its own, see {@link overIs}.
 * - `last`: The round so far.
 *
 * @param lines - Lines `X-ROUND` of the section, in order
 * @returns Its rounds, in order
 */
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
 * Tells whether the Task of a round decided it, see `session-learn.md`:
 * right, also right after a wrong one and its Example;
 * in a later round wrong for good, wrong twice or wrong once I closed it.
 * Round 0 ends only right, since its first Task can only succeed.
 *
 * @param round - The round
 * @returns Whether it is decided
 */
function decidedIs(round: Round): boolean {
    if (round.results.at(-1) === "right") return true;
    if (round.round === 0 || round.results.length === 0) return false;
    return (
        round.closed ||
        round.results.filter((result: Result): boolean => result === "wrong").length >= 2
    );
}

/**
 * Gives whole days from one day to another.
 *
 * @param from - Day like `2026-10-12`
 * @param to - Day like `2026-10-19`
 * @returns Days, like 7, below 0 when `to` lies before `from`
 */
function daysBetween(from: string, to: string): number {
    return Math.round(
        (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / (24 * 60 * 60 * 1000),
    );
}

/**
 * Tells when a section is due after a run on a day, see the top of this file:
 * after the first 1 day later, after the second 7, after the third 21 days later;
 * once ready, {@link examDays} before its exam,
 * with a keep-up check halfway while the exam lies more than {@link keepUpDays} off,
 * and nothing once that last check before the exam is done.
 * - `check`: Day of the last check, before the exam.
 *
 * @param level - Runs that count, the new one included
 * @param day - Day of the run, like `2026-10-12`
 * @param exam - Exam of the module
 * @returns Day it is due next, empty for none
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
 * one before counts as none, so the runs stay spaced;
 * one wrong for good starts the spacing over,
 * since all other rounds planned for the section fall away (`session-learn.md`).
 * - `level`: Runs that count since the spacing last started over, 0 to 4.
 * - `runs`: Runs that count, ever.
 * - `due`: Day the next round comes, by the last decided round, empty for none.
 *
 * @param rounds - Rounds of a section, in order
 * @param before - Day before which a round must be decided to count, like `2026-10-29`
 * @returns Its level, its runs and the day of its next round
 */
function levelsOf(rounds: Round[], before: string): { level: number; runs: number; due: string } {
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
 * written as `DUE` into the line that decides it, so the log holds it, see {@link markDecide}:
 * after a Task wrong for good 2 days later;
 * after a right one by the spacing, see {@link dueAfter}, unless it came before its day,
 * which keeps the day it was due.
 * - `level`, `due`: Level and next round by the rounds decided before, see {@link levelsOf}.
 *
 * @param earlier - Rounds of the section before the one it decides
 * @param result - The result that decides it
 * @param day - Day it decides it, like `2026-10-29`
 * @param exam - Exam of the module
 * @returns Day of the next round, empty for none
 */
function dueOf(earlier: Round[], result: Result, day: string, exam: ExamDate): string {
    if (result !== "right") return dayAdd(day, retryDays);
    const { level, due }: { level: number; due: string } = levelsOf(earlier, "9999-12-31");
    if (due !== "" && day < due) return due;
    return dueAfter(Math.min(level + 1, spacingDays.length + 1), day, exam);
}

/**
 * Gives the cold Task of a round of a section, see `session-learn.md`:
 * the one its lines name, else the first variant not solved right yet,
 * so round 0 takes the first; once every variant is solved, they take turns.
 * - `solved`: Whether a variant was right in a round.
 *
 * @param colds - Cold tasks of the section, its variants, in the order of the note
 * @param rounds - Rounds of the section, in order
 * @param shown - The round shown, `undefined` for one not begun
 * @returns Identity of the Task, empty for none
 */
function coldOf(colds: Task[], rounds: Round[], shown: Round | undefined): string {
    if (shown !== undefined && shown.task !== "") return shown.task;
    if (colds.length === 0) return "";
    const solved: (task: Task) => boolean = (task: Task): boolean =>
        rounds.some(
            (round: Round): boolean => round.task === task.id && round.results.includes("right"),
        );
    return (
        colds.find((task: Task): boolean => !solved(task)) ??
        colds[rounds.filter((round: Round): boolean => round.task !== "").length % colds.length]
    ).id;
}

/**
 * Gives the Example of a round of a section, see `session-learn.md`:
 * the one its lines name, else the next unused, the first of the note no round checked off,
 * so round 0 takes the first.
 *
 * @param examples - Examples of the section, in the order of the note
 * @param rounds - Rounds of the section, in order
 * @param shown - The round shown, `undefined` for one not begun
 * @returns Identity of the Example, empty for none left
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
 * Builds a section of a module with its tasks, from its note and its lines `X-ROUND` alone,
 * see {@link SkillSection}:
 * the round shown is the last one while it is not over, see {@link overIs},
 * or on the day it ended, else the next one, its number one more, round 0 for a section never begun;
 * it is due today as `new` while its round 0 began, see {@link todayMarked} for the next one,
 * as `task` while a later round is shown or its next round is due.
 * Its cold Task of the round is due on the day of the next round, its Examples never;
 * an Example is done once a round checked it off.
 * - `colds`, `examples`: Its cold tasks, its variants, and its Examples, in the order of the note.
 * - `rounds`, `last`, `shown`: Its rounds, the last one and the round shown.
 * - `round`: Number of the round shown.
 * - `all`: Its level and next round by every round decided, `before` by those before today.
 * - `cold`: Identity of the Task of the round shown.
 * - `days`: Days of its lines.
 * - `today`: What of it is due today.
 *
 * @param own - Tasks of its note, in order
 * @param lines - Its lines `X-ROUND`, in order
 * @param attemptsOf - Attempts at a task
 * @param today - Today like `2026-10-17`
 * @param exam - Exam of the module
 * @returns The section and its tasks with when each is due
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
        last !== undefined && (!overIs(last, today) || (last.lines.at(-1)?.day ?? "") >= today)
            ? last
            : undefined;
    const round: number = shown?.round ?? (last === undefined ? 0 : last.round + 1);
    const all: { level: number; runs: number; due: string } = levelsOf(rounds, "9999-12-31");
    const before: { level: number; runs: number; due: string } = levelsOf(rounds, today);
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
 * see `suggestions.ts`, the sections due today already marked, see {@link sectionOf}:
 * while no section is on a begun round 0, the first section not begun yet of an open chapter,
 * one at a time, once the section before it, when begun, has {@link openRuns} runs:
 * the first chapter opens by a skill box of my plan that names it, see {@link openedOf},
 * a later one too, or by itself once every section of the chapter before has them.
 * - `tasked`: Whether a section has a cold Task.
 * - `begun`: Whether I began a section, on a day I learned it.
 * - `chapters`: The chapters with sections, in order.
 * - `open`: Whether a chapter is open.
 * - `next`: The first section not begun yet of an open chapter, `undefined` for none.
 * - `before`: The section with a Task before it, `undefined` for none.
 *
 * @param sections - Sections of a module in the order of their notes, those due today marked
 * @param opened - Chapters of the module I opened, like `01_StatisticsFoundations`
 * @returns The sections, marked
 */
function todayMarked(sections: SkillSection[], opened: string[]): SkillSection[] {
    const tasked: (section: SkillSection) => boolean = (section: SkillSection): boolean =>
        section.cold !== "";
    const begun: (section: SkillSection) => boolean = (section: SkillSection): boolean =>
        section.days.length > 0;
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
 * Gives the chapters of a module I opened by hand by now, see {@link todayMarked}:
 * those a skill box of my plan names, on today or a day before, neither dropped by me
 * nor cancelled by the university.
 *
 * @param module - Code of the module, like `IN2028`
 * @param boxes - Skill boxes of the plan, see `skillBoxesRead` in `boxes.ts`
 * @param today - Today like `2026-10-17`
 * @returns The chapters, like `01_StatisticsFoundations`
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
 * Gives the exam of a module:
 * the first box of the type `FA` of its plan from today on, its day as the university named it,
 * else its estimate, see {@link exams}, else {@link examDefault}.
 * - `today`: Today in Berlin time.
 * - `planned`: The first exam of its plan from today on, `undefined` for none.
 *
 * @param module - Code of the module, like `WI1057`
 * @param boxes - Skill boxes of the plan, see `skillBoxesRead` in `boxes.ts`
 * @returns Its exam
 */
function examOf(module: string, boxes: Box[]): ExamDate {
    const today: string = berlinDateOf(new Date());
    const planned: Box | undefined = boxes
        .filter(
            (box: Box): boolean => box.module === module && box.type === "FA" && box.day >= today,
        )
        .sort((first: Box, second: Box): number => first.day.localeCompare(second.day))[0];
    return planned !== undefined
        ? { day: planned.day, estimated: false }
        : (exams[module] ?? examDefault);
}

/**
 * Reads everything the scripts view shows:
 * per module of the semester its exam, its tasks with when each is due, see the top of this file,
 * and its sections; a module without chapter notes yet has no tasks,
 * and a task whose name an earlier task of the module has already is left out.
 * Attempts on other modules count nowhere.
 * Also the skills of the semester and every other module folder
 * and the types of a skill entry, for the pickers.
 * - `lines`: Lines `X-ROUND` of the log, in order, and `bySection` by their sections.
 * - `byTask`: My attempts by the identity of their task, see {@link attemptsOf}.
 * - `boxes`: Skill boxes of the plan up to {@link planDays} days after today.
 * - `unique`: Tasks of a module, each name once.
 * - `exam`: Exam of a module, see {@link examOf}.
 * - `attemptsOf`: Attempts at a task.
 * - `built`: Each section of a module with its tasks, see {@link sectionOf}.
 *
 * @returns {@link Skilling}
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
    const modules: SkillModule[] = moduleTasksRead().map((module: ModuleTasks): SkillModule => {
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
            tasks: built.flatMap(([, tasks]: [SkillSection, SkillTask[]]): SkillTask[] => tasks),
            sections: todayMarked(
                built.map(([section]: [SkillSection, SkillTask[]]): SkillSection => section),
                openedOf(module.code, boxes, today),
            ),
        };
    });

    const active: string[] = activeModulesRead();
    const skills: string[] = activeSkillsRead().map(skillNameOf);
    const others: string[] = moduleFoldersRead()
        .filter((name: string): boolean => !active.includes(name))
        .map(codeOf);
    return {
        modules: modules,
        skills: skills,
        otherModules: others,
        folders: Object.fromEntries(
            [...skills, ...others].map((name: string): [string, string] => [
                name,
                skillTitleOf(name, ""),
            ]),
        ),
        paths: Object.fromEntries(
            [...skills, ...others].map((name: string): [string, string] => [
                name,
                skillFolderOf(name) ?? "",
            ]),
        ),
        links: Object.fromEntries(
            [...skills, ...others].map((name: string): [string, string] => [
                name,
                skillLinkOf(name),
            ]),
        ),
        types: skillTypes,
    };
}

/**
 * Finds the folder of a module by its code:
 * in `NomSkillingmodules`, else among the modules of the semester,
 * whose folder may be missing yet and then counts as empty, see `notes.ts`.
 *
 * @param code - Module code, like `IN2028`
 * @returns Name of its folder, like `IN2028_BusinessAnalyticsMachineLearning`
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
 * Reads what the dialog of a skill entry offers for a skill:
 * for a module, any module folder, its chapters and its documents,
 * see `notes.ts`, none for a module of the semester whose folder is missing;
 * for a project of the semester none, since it behaves like a module without chapters and tasks.
 *
 * @param code - Name of the skill, a module code like `IN2028` or a project like `WokFlow`
 * @returns Chapters and documents of the skill
 * @throws {Error} - When no module folder, no module of the semester and no project has the name
 */
export function moduleRead(code: string): ModuleContents {
    if (projectOf(code) !== undefined)
        return { folder: "", chapters: [], documents: [], materials: {}, inner: [] };
    return moduleContentsRead(folderOf(code));
}

/**
 * Starts the line `X-ROUND` of a section for a skill entry that has none of it yet,
 * see {@link RoundLine}, so every unit stands in a round, also one I log by hand:
 * a round going on goes on at its step, after one over or none the next round starts,
 * one more, round 0 for the first, see {@link overIs};
 * a round I pick by hand in the dialog goes on at the step I last stood at in it.
 * Written without its module, unless the section is of another module than the entry.
 * - `own`: Lines of the section, and `rounds` its rounds, `last` the last one.
 * - `round`: The round of the line.
 * - `step`: Its step.
 *
 * @param section - Section with its module, like `IN2028/01_02_SampleMeanEstimator`
 * @param module - Module of the skill entry, like `IN2028`
 * @param lines - Lines `X-ROUND` of the log before, see {@link roundsRead}
 * @param picked - Round picked in the dialog, `undefined` for none
 * @param day - Day of the entry, like `2026-10-29`
 * @returns The line
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
        own.findLast((line: RoundLine): boolean => line.round === round && line.step !== roundDone)
            ?.step ?? "";
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

/**
 * Gives a line `X-ROUND` as read, see {@link roundsRead}, for a line about to be written.
 * - `section`: Its section with its module.
 *
 * @param mark - The line
 * @param module - Module of its skill entry
 * @param entry - Identifier of its skill entry
 * @param day - Day of its skill entry
 * @returns The line as read
 */
function lineOf(mark: RoundMark, module: string, entry: string, day: string): RoundLine {
    const section: string = mark.section.includes("/") ? mark.section : `${module}/${mark.section}`;
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
 * Writes an attempt into the line `X-ROUND` of its section, see {@link AttemptNew}:
 * an Example checked off as its `USED`, the one Example of the round;
 * a result of the cold Task with its heading as `TASK`, its result after those of the line,
 * and for a wrong one my comment as `NOTE`, an empty one kept for its place
 * unless no later one follows.
 * - `comment`: My comment as plain text in one line: each `"` a `'`,
 *   each run of line breaks, other space and control signs one space, none at its ends.
 * - `notes`: The comments with the new one.
 *
 * @param mark - The line of the section
 * @param task - Task of the attempt, as its note holds it now
 * @param attempt - The attempt
 * @param decided - Whether the round is decided already, see {@link decidedIs}
 * @returns The line
 * @throws {Error} - When an Example comes with a result other than right, its round has another
 *   Example already, the round is decided already, the result is neither right nor wrong,
 *   or a comment comes with right
 */
function markTried(mark: RoundMark, task: Task, attempt: AttemptNew, decided: boolean): RoundMark {
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
    const notes: string[] = attempt.result === "wrong" ? [...mark.notes, comment] : [...mark.notes];
    while (notes.at(-1) === "") notes.pop();
    return {
        ...mark,
        task: task.heading,
        results: [...mark.results, attempt.result],
        notes: notes,
    };
}

/**
 * Writes the day the next round comes as `DUE` into the line whose result decides its round,
 * see {@link decidedIs} and {@link dueOf}, so the dashboard shows the next round right away
 * and the log holds it; a round decided before keeps its day.
 * - `rounds`: Rounds of the section with the line, `round` the one of the line.
 *
 * @param mark - The line
 * @param earlier - Lines `X-ROUND` of the section before it
 * @param line - The line as read, see {@link lineOf}
 * @param exam - Exam of the module
 * @returns The line
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
 * Applies changes to the line `X-ROUND` of a section of a skill entry, see {@link RoundLine},
 * and decides its round once its Task did, see {@link markDecide}:
 * the attempts at tasks of the section in order, see {@link markTried},
 * then the step I went on to, see {@link markStepped}.
 * - `earlier`: Lines of the section before the line, see {@link othersOf}.
 * - `decided`: Whether the round of the line is decided.
 *
 * @param mark - The line
 * @param change - Attempts and the step, empty for none
 * @param context - Module, identifier and day of the entry, the lines of the log, the tasks,
 *   and the exam of the module of the section
 * @returns The line
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
    const section: string = lineOf(mark, context.module, context.entry, context.day).section;
    const earlier: RoundLine[] = othersOf(context.lines, context.entry).filter(
        (line: RoundLine): boolean => line.section === section,
    );
    const decided: (now: RoundMark) => boolean = (now: RoundMark): boolean =>
        roundsOf([...earlier, lineOf(now, context.module, context.entry, context.day)]).at(-1)
            ?.decided !== "";
    let now: RoundMark = mark;
    change.attempts.forEach((attempt: AttemptNew): void => {
        const task: Task | undefined = context.tasks.find(
            (candidate: Task): boolean => candidate.id === attempt.task,
        );
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
 * passing an Example with `Next` checks it off as the `USED` of the round, see {@link markTried};
 * round 0 closes only once its Task is right, since its first Task can only succeed.
 * - `left`: The Example I leave, `undefined` for none.
 *
 * @param mark - The line
 * @param step - Key of the step, a heading as written, or `done`
 * @param decided - Whether its round is decided
 * @param tasks - Tasks of the modules of the semester
 * @param section - Its section with its module
 * @returns The line
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
            `${task.id.split("/")[0]}/${task.section}` === section &&
            task.heading === mark.step,
    );
    const now: RoundMark =
        left === undefined || step === mark.step
            ? mark
            : markTried(mark, left, { task: left.id, result: "right", comment: "" }, decided);
    return { ...now, step: step };
}

/**
 * Puts lines `X-ROUND` into those of a skill entry, see {@link RoundLine}:
 * each in the place of the last line of its section, unless that one closed its round,
 * after the others without one.
 *
 * @param kept - Lines the entry has
 * @param marks - New lines, at most one per section
 * @returns The lines
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
 * its last one while that did not close its round, else a new one, see {@link markStartOf};
 * a round picked moves the line it has to that round, at the step I last stood at in it.
 *
 * @param kept - Lines the entry has, none for a new entry
 * @param section - Section with its module, like `IN2028/01_02_SampleMeanEstimator`
 * @param module - Module of the entry
 * @param lines - Lines `X-ROUND` of the log, see {@link roundsRead}
 * @param picked - Round picked in the dialog, `undefined` for none
 * @param day - Day of the entry, like `2026-10-29`
 * @returns The line
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
        (mark: RoundMark): boolean =>
            (mark.section.includes("/") ? mark.section : `${module}/${mark.section}`) === section,
    );
    if (own === undefined || own.step === roundDone)
        return markStartOf(section, module, lines, picked, day);
    return picked === undefined || picked === own.round
        ? own
        : { ...own, round: picked, step: markStartOf(section, module, lines, picked, day).step };
}

/**
 * Gives the lines `X-ROUND` of the log before those a skill entry writes anew:
 * those of the other entries, and its own that closed a round, which it never writes again.
 *
 * @param lines - Lines `X-ROUND` of the log, see {@link roundsRead}
 * @param entry - Identifier of the entry, empty for a new one
 * @returns The lines, in order
 */
function othersOf(lines: RoundLine[], entry: string): RoundLine[] {
    return lines.filter(
        (line: RoundLine): boolean => line.entry !== entry || line.step === roundDone,
    );
}

/**
 * Gives the section of a task with its module, like `IN2028/01_02_SampleMeanEstimator`.
 *
 * @param task - Task
 * @returns Its section
 */
function sectionKeyOf(task: Task): string {
    return `${task.id.split("/")[0]}/${task.section}`;
}

/**
 * Gives the sections of the notes a skill entry links, by the tasks of the semester.
 *
 * @param links - Links of the entry
 * @param tasks - Tasks of the modules of the semester
 * @returns Sections with their modules, each once, in the order of the tasks
 */
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
 * so every line links its note, see {@link RoundLine}; a note it links keeps its link.
 *
 * @param links - Links of the entry
 * @param marks - Its lines `X-ROUND`
 * @param module - Module of the entry
 * @param tasks - Tasks of the modules of the semester
 * @returns Links, those it had first
 */
function linksWith(links: Link[], marks: RoundMark[], module: string, tasks: Task[]): Link[] {
    const notes: string[] = [
        ...new Set(
            marks.flatMap((mark: RoundMark): string[] => {
                const section: string = mark.section.includes("/")
                    ? mark.section
                    : `${module}/${mark.section}`;
                const task: Task | undefined = tasks.find(
                    (candidate: Task): boolean => sectionKeyOf(candidate) === section,
                );
                return task === undefined ? [] : [notePathOf(task)];
            }),
        ),
    ];
    return [
        ...links,
        ...notes
            .filter(
                (path: string): boolean => !links.some((link: Link): boolean => link.path === path),
            )
            .map((path: string): Link => ({ path: path, fingerprint: "" })),
    ];
}

/**
 * Gives one task of the section of each line `X-ROUND`,
 * so the skill entry names the chapter of the section, see {@link chaptersWith}.
 *
 * @param marks - Lines `X-ROUND`
 * @param module - Module of their skill entry, like `IN2028`
 * @param tasks - Tasks of the modules of the semester
 * @returns Identities of tasks, one per line whose section has tasks
 */
function markTasksOf(marks: RoundMark[], module: string, tasks: Task[]): string[] {
    return marks.flatMap((mark: RoundMark): string[] => {
        const section: string = mark.section.includes("/")
            ? mark.section
            : `${module}/${mark.section}`;
        const task: Task | undefined = tasks.find(
            (candidate: Task): boolean => sectionKeyOf(candidate) === section,
        );
        return task === undefined ? [] : [task.id];
    });
}

/**
 * Checks a round I pick by hand in the dialog:
 * its section must have tasks of the module and its round must be a number from 0.
 *
 * @param pick - Section with its module, like `IN2028/01_02_SampleMeanEstimator`, and its round
 * @param module - Module of the entry
 * @param tasks - Tasks of the modules of the semester
 * @throws {Error} - When no task of the module names its section, or its round is no number from 0
 */
function pickCheck(pick: RoundPick, module: string, tasks: Task[]): void {
    if (
        !pick.section.startsWith(`${module}/`) ||
        !tasks.some((task: Task): boolean => sectionKeyOf(task) === pick.section)
    )
        throw new Error(`No section ${pick.section}`);
    if (!Number.isInteger(pick.round) || pick.round < 0) throw new Error(`No round ${pick.round}`);
}

/**
 * Gives the lines `X-ROUND` of a skill entry from the dialog, see {@link RoundLine}:
 * none for an entry of a type, like a lecture or a tutorial, whose sheet or slides it links
 * and whose tasks are no attempts, since no task stands outside a round;
 * for my own learning one per section it works on, the rounds I picked, the notes it links
 * and the tasks it tried,
 * each going on in the line the entry has, see {@link markOf}, with its attempts and decided,
 * see {@link markWith}; a line the entry has of a note it no longer links goes
 * while it holds nothing I did, else it stays and links its note again, see {@link linksWith}.
 * - `lines`: Lines `X-ROUND` of the log.
 * - `boxes`: Skill boxes of the plan, for the exam of the module.
 * - `sections`: Sections it works on, with their modules.
 * - `kept`: The lines it keeps.
 *
 * @param entry - Module, start, documents, picks and new attempts of the entry
 * @param old - Lines and identifier the entry has, none and empty for a new one
 * @param tasks - Tasks of the modules of the semester
 * @returns Its lines and its links with the notes of their sections
 * @throws {Error} - When a pick, an attempt or a step is not right,
 *   see {@link pickCheck} and {@link markTried}, an attempt is at a task of another module,
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
    const kept: RoundMark[] = old.marks.filter((mark: RoundMark): boolean => {
        const section: string = mark.section.includes("/")
            ? mark.section
            : `${entry.module}/${mark.section}`;
        return (
            linked.includes(section) ||
            mark.task !== "" ||
            mark.used !== "" ||
            mark.results.length > 0
        );
    });
    const sections: string[] = [
        ...new Set([
            ...entry.rounds.map((pick: RoundPick): string => pick.section),
            ...linked,
            ...entry.attempts.flatMap((attempt: AttemptNew): string[] => {
                const task: Task | undefined = tasks.find(
                    (candidate: Task): boolean => candidate.id === attempt.task,
                );
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
 * - `solved`: Chapter of each task, as its note lies now; none for a task no note holds any more.
 *
 * @param chapters - Chapters picked, by their names
 * @param worked - Identities of one task of each section of its lines, see {@link markTasksOf}
 * @param tasks - Tasks of the modules of the semester
 * @returns Chapters, each once, in this order
 */
function chaptersWith(chapters: string[], worked: string[], tasks: Task[]): string[] {
    const solved: string[] = [];
    for (const id of worked) {
        const task: Task | undefined = tasks.find(
            (candidate: Task): boolean => candidate.id === id,
        );
        if (task !== undefined) solved.push(task.chapter);
    }
    return [...new Set([...chapters, ...solved])];
}

/**
 * Checks a skill entry before it is written: one of the types, the type it had,
 * like an older `DEV` no longer offered,
 * or none, a module with a folder, a project or no skill at all,
 * chapters among the module's or among those the entry had, well-formed people,
 * see `attendeesAllow` in `categories.ts`, and an end after the start.
 * - `offered`: Chapters of the module, see `notes.ts`.
 * - `unknown`: First chapter that is neither offered nor kept.
 *
 * @param entry - Skill entry as the page sends it
 * @param kept - Chapters the entry had,
 *   or the box a new entry is logged from, by the names they gave them,
 *   also once a folder has another name; none for a new entry without box
 * @param keptType - Type the entry or the box it is logged from had, like `DEV`, empty for none
 * @throws {Error} - When one of these does not hold
 */
function skillEntryCheck(entry: SkillEntryNew, kept: string[], keptType: string): void {
    if (entry.type !== "" && entry.type !== keptType && !skillTypes.includes(entry.type))
        throw new Error(`No type ${entry.type}`);
    const offered: string[] = entry.module === "" ? [] : moduleRead(entry.module).chapters;
    const unknown: string | undefined = entry.chapters.find(
        (chapter: string): boolean => !offered.includes(chapter) && !kept.includes(chapter),
    );
    if (unknown !== undefined) throw new Error(`No chapter ${unknown} in ${entry.module}`);
    if (!attendeesAllow(entry.attendees ?? []))
        throw new Error(
            `No people ${(entry.attendees ?? []).map((attendee: Attendee): string => attendee.name)}`,
        );
    if (!(new Date(entry.start) < new Date(entry.end)))
        throw new Error("A skill entry needs an end after its start");
}

/**
 * Writes a new skill entry into the log, into the log of its skill,
 * see `logFileOf` in `day.ts`, from the entry by category:
 * `CATEGORIES` is `Skill`, `SUMMARY` its title with the folder of its skill and material
 * as `ALTREP`, which names its module and type,
 * see `titleOf` in `documents.ts`, its place and note,
 * the documents it used, see `linksOf` in `documents.ts`, one `X-CHAPTER` per chapter,
 * see {@link chaptersWith}, one `X-ROUND` per section it works on with its attempts,
 * also for a note it only links, see {@link marksOfEntry},
 * the box it is logged from, which is done then;
 * my own learning, without type and box,
 * like the session the learning view opens, is logged from the study box of its module and day,
 * see `studyBoxOf` in `boxes.ts`, so learning does the box of the plan.
 * - `tasks`: Tasks of the modules of the semester.
 * - `marks`, `links`: Its `X-ROUND`s and its links with the notes of their sections.
 * - `chapters`: Its chapters, those picked and those of the sections of its rounds.
 * - `plan`: The box it is logged from, `null` for none, whose place keeps its link,
 *   see `placeLinkOf` in `places.ts`, and whose chapters it may keep by their names,
 *   see {@link skillEntryCheck}.
 * - `fields`: Fields and times of the entry.
 * - `own`: Its links, chapters, rounds and box, as properties of my own.
 * - `id`: Identifier of the new entry.
 *
 * @param entry - Skill entry as the page sends it
 * @returns Identifier of the new entry, so the reader can send it to Vu, see `shared.ts`
 * @throws {Error} - When an attempt or a round picked is not right, see {@link marksOfEntry},
 *   the entry is not right, see {@link skillEntryCheck}, a document is none of the module's,
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
              ? (studyBoxOf(entry.module, berlinDateOf(new Date(entry.start)), chapters) ?? null)
              : null;
    skillEntryCheck(entry, plan?.chapters ?? [], plan?.type ?? "");

    const [title, titleLink]: [string, string] = titleOf({ ...entry, category: skillName }, null);
    const fields: EntryFields = {
        category: skillName,
        title: title,
        titleLink: titleLink,
        location: entry.location,
        locationLink: placeLinkOf(entry.location, plan),
        ...onlineFor(entry, plan),
        from: "",
        attendees: entry.attendees ?? plan?.attendees ?? [],
        module: entry.module,
        type: entry.type,
        semester: semesterFor(skillName, entry.semester, berlinDateOf(new Date(entry.start))),
        note: entry.note.trim(),
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
    const own: [string, string | Link | ICAL.Property][] = links.map(
        (link: Link): [string, Link] => ["attach", link],
    );
    own.push(...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]));
    own.push(
        ...marks.map((mark: RoundMark): [string, ICAL.Property] => [
            "x-round",
            roundPropertyOf(mark),
        ]),
    );
    if (plan !== null) own.push(["related-to", plan.id]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    const id: string = entryAppend(logFileOf(fields), fields, own);
    if (plan !== null) boxDone(plan.id);
    return id;
}

/**
 * Changes a skill entry of the log from the entry by category:
 * its type, module, place, semester, chapters, documents, note and times,
 * and adds the new attempts after those it has, every other line as it is;
 * the entry moves into the log of its new skill when that is another file,
 * see `logFileOf` in `day.ts`.
 * Its title, its `SUMMARY`, is the one sent, the link of it follows its skill and type,
 * see `titleOf` in `documents.ts`, and its links its skill and documents, see `linksOf` there:
 * a document it had keeps its link with its fingerprint, a new one gets its own;
 * its chapters are its `X-CHAPTER`s, the folders of chapters an older entry links going.
 * Its place keeps its link while it stays the same, see `placeLinkOf` in `places.ts`.
 * Its lines `X-ROUND` keep their section, also once I change its skill:
 * then each names the module of its section.
 * A round I picked for a note moves the line of its section there, the new attempts go into
 * the lines of their sections, and a newly linked note gets its line, see {@link marksOfEntry}.
 * Written only while its file holds it as the dialog opened it,
 * its fingerprint still the one the dialog sends, as for any entry of the log,
 * see `entryEdit` in `day.ts`: after any change of it since,
 * like an attempt the learning view wrote into it,
 * see {@link attemptAdd}, nothing is written; the first save wins.
 * - `file`: `.ics` file of the entry.
 * - `old`: The entry as it is.
 * - `tasks`: Tasks of the modules of the semester.
 * - `kept`: Its `X-ROUND`s, with the module of their section once its skill changes.
 * - `marks`, `links`: Its `X-ROUND`s with the rounds picked and the new attempts,
 *   and its links with the notes of their sections, see {@link marksOfEntry}.
 * - `worked`: One task of each section of its rounds of its skill, for its chapters.
 *
 * @param change - Changed skill entry as the page sends it,
 *   with its fingerprint as the dialog opened it
 * @returns Whether it is written, `false` when its file changed it since the dialog opened it
 * @throws {Error} - When there is no such skill entry in the log of the new system,
 *   a new attempt or a round picked is not right, see {@link marksOfEntry}, the entry is not right,
 *   see {@link skillEntryCheck}, a document is none of the module's,
 *   the link typed online is no web address
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
    const [title, titleLink]: [string, string] = titleOf({ ...change, category: skillName }, old);
    const fields: EntryFields = {
        category: skillName,
        title: title,
        titleLink: titleLink,
        location: change.location,
        locationLink: placeLinkOf(change.location, old),
        ...onlineFor(change, old),
        from: "",
        attendees: change.attendees ?? old.attendees,
        module: change.module,
        type: change.type,
        semester: semesterFor(skillName, change.semester, berlinDateOf(new Date(change.start))),
        note: change.note.trim(),
        start: new Date(change.start),
        end: new Date(change.end),
    };
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
 * the line `X-ROUND` of its section there, written anew in its place, see {@link marksWith},
 * started at the round going on when the entry has none of it, see {@link markOf},
 * with the attempts and the step, decided once its Task did, see {@link markWith},
 * the note of its section linked as an `ATTACH` without fingerprint, see {@link linksWith},
 * with the chapter of the section,
 * and its end moved to the end of the quarter hour of now, if that is later.
 * Without an open entry of the module, starts one without type covering the quarter hour of now,
 * logged from the open skill box of the module for now while that has no type either,
 * with its title, which is done then.
 * - `quarter`: End of the quarter hour of now, now rounded up to the quarter hour.
 * - `open`: The skill entry of the moment, see {@link momentOf}, `undefined` for none.
 * - `kept`: Its lines `X-ROUND`, none for a new entry.
 * - `start`: Start of the entry, a quarter hour before its end for a new one.
 * - `mark`: The new line of the section.
 * - `marks`: The lines of the entry with it.
 * - `links`: Links of the entry, without the folders of chapters an older entry links,
 *   see `documentLinksOf` in `documents.ts`, with the note of each section of its lines.
 * - `chapters`: Its chapters, with that of the section.
 * - `box`: Open skill box of the module for now and the chapter of the section,
 *   see `skillBoxOf` in `boxes.ts`, for a new entry, and `plan` that box while it has no type.
 * - `type`: Type of a new entry, none.
 * - `own`: The links, chapters, rounds and box of a new entry, as properties of my own.
 * - `semester`: Semester of a new entry, the box's or that of its day, which its link names too,
 *   see `titleOf` in `documents.ts`.
 * - `fields`: Fields and times of a new entry, which go into the log of the module,
 *   see `logFileOf` in `day.ts`.
 * - `properties`: Properties of the open entry to write again.
 *
 * @param section - Section with its module, like `IN2028/01_02_SampleMeanEstimator`
 * @param change - Attempts at its tasks and the step I went on to, empty for none
 * @param tasks - Tasks of the modules of the semester
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
        open === undefined ? new Date(quarter.getTime() - quarterHour) : new Date(open.start);
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
        const own: [string, string | Link | ICAL.Property][] = [
            ...links.map((link: Link): [string, Link] => ["attach", link]),
            ...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]),
            ...marks.map((line: RoundMark): [string, ICAL.Property] => [
                "x-round",
                roundPropertyOf(line),
            ]),
        ];
        if (plan !== undefined) own.push(["related-to", plan.id]);
        if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
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
        entryAppend(logFileOf(fields), fields, own);
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

/**
 * Gives the path from `NomWorkspace` of the note of a task,
 * as a skill entry links it, in `NomSkillingmodules`.
 *
 * @param task - Task
 * @returns Path like `NomSkillingmodules/IN2028_…/01_RegressionAnalysis/01_01_….md`
 */
function notePathOf(task: Task): string {
    return `${modulesFolder}/${task.note}`;
}

/**
 * Finds the skill entry of the moment of a module:
 * the last one of the module without type that started before now
 * and ended at most {@link sessionPause} ago,
 * since only my own learning has rounds, never a lecture or a tutorial, see {@link marksOfEntry}.
 *
 * @param module - Module code, like `IN2028`
 * @param now - The moment
 * @returns The entry, `undefined` for none
 */
function momentOf(module: string, now: Date): Entry | undefined {
    return skillEntriesRead(new Date(now.getTime() - sessionPause).toISOString(), now.toISOString())
        .filter((entry: Entry): boolean => entry.module === module && entry.type === "")
        .at(-1);
}

/**
 * Writes an attempt from a button of a task into the line `X-ROUND` of its section
 * in the skill entry of the moment, see {@link momentWrite}:
 * a result of a cold Task, which decides the round once it is right or wrong for good.
 * - `tasks`: Tasks of the modules of the semester.
 * - `task`: Its task.
 *
 * @param attempt - Attempt as the page sends it
 * @throws {Error} - When no note holds its task or the attempt is not right, see {@link markTried}
 */
export function attemptAdd(attempt: AttemptNew): void {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = tasks.find(
        (candidate: Task): boolean => candidate.id === attempt.task,
    );
    if (task === undefined) throw new Error(`No task ${attempt.task}`);
    momentWrite(sectionKeyOf(task), { attempts: [attempt], step: "" }, tasks);
}

/**
 * Writes where I stand in the round of a section into the skill entry of the moment of its module,
 * see {@link momentWrite} and {@link RoundLine}: the step I went on to with `Next`,
 * an Example I passed checked off, or `done` once I closed the round, see {@link markStepped}.
 * - `step`: The step in one line.
 *
 * @param line - Where I stand
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
 * Reads the session of a module running now, for the learning view: its skill entry of the moment,
 * see {@link momentOf}, without type, my own learning, into which its round writes,
 * as the buttons of a task write into it, see {@link attemptAdd},
 * so the learning view records only in a session of the module, see `src/editor/session.ts`.
 * The timer of the day shows any entry running now instead, see `entryNowRead` in `day.ts`.
 * - `now`: The moment.
 * - `open`: The skill entry of the moment.
 *
 * @param module - Code of a module, like `IN2028`, whose session alone counts
 * @returns The session, `null` while none runs
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
 * every line `X-ROUND` of its section that names it as `TASK` or `USED` gets the new heading,
 * every other line stays as it is.
 * For the AI, not for a button; run in the folder of the dashboard like
 * `node -e 'import("./reader/skill.ts").then((skill) => console.log(skill.taskRename("IN2028/Old Name", "IN2028/New Name")))'`.
 * - `tasks`: Tasks of the modules of the semester.
 * - `task`: The task by its new identity.
 * - `before`, `after`: Its heading before and after, its type word with the old and the new name.
 * - `renamed`: Number of lines renamed so far.
 *
 * @param from - Identity the task had, like `IN2028/Airline Revenue Interval`
 * @param to - Its new identity, in the same form
 * @returns Number of lines renamed
 * @throws {Error} - When a note still holds the old identity or none holds the new one,
 *   so the heading has to be renamed first
 */
export function taskRename(from: string, to: string): number {
    const tasks: Task[] = tasksRead();
    const task: Task | undefined = tasks.find((candidate: Task): boolean => candidate.id === to);
    if (tasks.some((candidate: Task): boolean => candidate.id === from) || task === undefined)
        throw new Error(`Rename the heading in its note first: ${from} to ${to}`);
    const after: string = task.heading;
    const before: string = `${after.slice(0, after.indexOf(". ") + 2)}${from.slice(from.indexOf("/") + 1)}`;
    let renamed: number = 0;
    skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).forEach(
        (entry: Entry): void => {
            const marks: RoundMark[] = entry.rounds.map((mark: RoundMark): RoundMark => {
                const section: string = mark.section.includes("/")
                    ? mark.section
                    : `${entry.module}/${mark.section}`;
                if (section !== sectionKeyOf(task)) return mark;
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
