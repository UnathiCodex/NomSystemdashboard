/**
 * ## Skill
 *
 * Reads the tasks of my chapter notes and my attempts at them, tells when each task is due,
 * and writes the skill entries of the log:
 * the one writer of their chapters, documents and attempts,
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
 * `CATEGORIES:Skill`, its `SUMMARY` its title, free,
 * at first the name of the folder of its module with its type in round brackets,
 * linking the folder, for a type on into that of its material, as `ALTREP`,
 * which names its module and type,
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
 *   `ATTACH:NomSkillingmodules/IN2028_…/01_RegressionAnalysis/01_01_SampleMeanEstimator.md`;
 *   its `DESCRIPTION` is only my free note;
 * - its semester, `X-SEMESTER`, see `semesterFor` in `categories.ts`;
 * - one `X-CHAPTER` per chapter of my system it belongs to, of any type,
 *   like `X-CHAPTER:02_LogisticPoissonRegression`, several for a session over several chapters,
 *   like exam training, the chapters of the tasks of its attempts always among them;
 *   an older entry that links the folder of a chapter instead gets its `X-CHAPTER` once it changes,
 *   see `chaptersOf` in `documents.ts`;
 * - one `X-ATTEMPT` per attempt at a task of my notes, of any type,
 *   like the tasks I solved in a tutorial:
 *   the name of its task, whose module the summary names, its result, right or wrong,
 *   the task judged as a whole, and for a wrong one my short comment on what went wrong,
 *   see {@link AttemptLine}, like `X-ATTEMPT:Kiosk Chain;right`
 *   and `X-ATTEMPT:Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`;
 *   no time, since the entry has its start and its end,
 *   and the order of the lines is the order of the attempts.
 *   An older one names its task with its module, may start with the time of the tap,
 *   like `140500` or `14:05`, may name the part of a cold task after `#`,
 *   and has my effort before its sentence, where I got stuck, why I skipped, or what went wrong,
 *   like `X-ATTEMPT:140500;IN2028/Kiosk Chain Review#2;stuck;high;step 2`
 *   or `X-ATTEMPT:IN2028/Kiosk Sales Standard Error;right`;
 *   it is read as it is, also its results guided, stuck and skipped and its effort,
 *   which nothing writes any more;
 * - one `X-ROUND` per section I learn in it, where I stand in its round,
 *   see {@link RoundLine}, written anew in its place as I go on,
 *   like `X-ROUND:01_01_SampleMeanEstimator;1;Algorithm. Check an Estimator for Bias`,
 *   then `X-ROUND:01_01_SampleMeanEstimator;1;done` once I closed the round;
 * - an older entry may hold one `X-TUTOR` per task I copied for my tutor in it, like
 *   `X-TUTOR:IN2028/Kiosk Sales Standard Error`, from when the views copied a task for my tutor;
 *   nothing writes them any more, and they are only read,
 *   so the chapters of their tasks still count among the entry's.
 * The forms above are the values of `X-ATTEMPT` and `X-ROUND`;
 * the file holds them as text of the standard, each `;`, `,` and `\` escaped by a `\`,
 * like `X-ATTEMPT:Kiosk Chain\;right`, see `calendar.ts`.
 * A button of a task writes into the skill entry of the moment:
 * the last one of the task's module that started before now and ended at most half an hour ago,
 * like a tutorial logged from the plan;
 * it grows to the end of the quarter hour of the attempt,
 * so the half hour of a pause counts from the attempt.
 * Without one, a new entry starts, covering the quarter hour of the attempt,
 * in the steps of the day view:
 * of the type of the open skill box of the module for now, logged from it,
 * so the attempts do the box,
 * see `skillBoxOf` in `boxes.ts`, else without type, my own learning, like `IN2028`.
 * The skill entry of the moment of any module is the session running now,
 * whose timer the page shows when it is of a type I pace myself,
 * my own learning or homework, see {@link sessionRead}.
 * Due by my protocol, per section, a note like `01_01_SampleMeanStandardError.md`,
 * whose cold task carries its runs (decisions 73 to 76 in `.claude/life/decisions.md`):
 * a task of the ladder is new until tried, done once right,
 * and due 2 days after a wrong, stuck or guided attempt,
 * until its section has its first cold run, after which the ladder leaves the due list,
 * since guidance hurts once a type is known (Tetzlaff 2025).
 * The cold task is one run of its section: an attempt judges it as a whole,
 * and the run counts once it is right on or after the day it was due;
 * a failed one comes back 2 days later,
 * and the section steps back one run instead of to none (Rawson 2018);
 * an older attempt may judge one of its parts, and its run counted once every part sat.
 * After the first run, mostly the Task of round 0, the section is due 1 day later,
 * after the second 7 days later, after the third 21 days later;
 * after the fourth it is ready, three runs spaced after the first,
 * and comes back about 14 days before its exam,
 * with one keep-up check halfway when the exam lies more than 6 weeks off,
 * see {@link exams} (Cepeda 2008, Rohrer 2005).
 * A right attempt before its day counts as none, so the runs stay spaced;
 * a guided one, right with my tutor's help, counts as none either,
 * and the task is due 2 days later, cold.
 * A skipped task leaves the due list until its next attempt.
 *
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

import { boxDone, boxOpenFind, skillBoxesRead, skillBoxOf, studyBoxOf } from "./boxes.ts";
import {
    berlinDateOf,
    dayAdd,
    entriesRead,
    entryAppend,
    entryChange,
    entryFind,
    propertiesPut,
} from "./calendar.ts";
import { attendeesAllow, semesterFor, skillName, skillTypes } from "./categories.ts";
import { logFileOf } from "./day.ts";
import {
    chaptersOf,
    documentLinksOf,
    linksOf,
    skillFolderOf,
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
import { settings } from "./trackers.ts";

import type { Box } from "./boxes.ts";
import type { Attendee, Entry, EntryFields, Link, Online } from "./calendar.ts";
import type { Chapter, ModuleContents, NoteEntry, NotesModule } from "./notes.ts";

/**
 * Result of an attempt: solved right or wrong;
 * an older one may also be solved right with my tutor's help, stuck on the way,
 * or the task skipped, which nothing writes any more.
 */
export type Result = "right" | "guided" | "wrong" | "stuck" | "skipped";

/**
 * My effort on an attempt, as one tap after it rated it in an older one; nothing rates it any more.
 */
export type Effort = "low" | "medium" | "high";

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
 *   `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_SampleMeanEstimator.md`.
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
 * An attempt, as the views show it.
 *
 * - `day`: Day its skill entry started in Berlin time, like `2026-10-10`.
 * - `order`: Its place among all my attempts, the oldest first,
 *   by the order of the skill entries and of the lines in each,
 *   so attempts of one day keep the order I made them in, also without a time.
 * - `time`: Time of the tap in Berlin time, like `14:05`, of an older attempt, empty for any other.
 * - `part`: Part of a cold task an older attempt is about, like `2`, empty for the whole task.
 * - `result`: Its {@link Result}.
 * - `effort`: My {@link Effort} on an older attempt, empty for none.
 * - `stuck`: Where I got stuck, like `step 3`, empty when not given.
 * - `skip`: Why I skipped the task, like `too hard`, empty when not given.
 * - `error`: What went wrong in a wrong attempt, my short comment,
 *   like `Step 2: weights add up to 1.2, not 1`, empty when not given.
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
 * A {@link Task} with when it is due, see the top of this file.
 *
 * - `due`: Day it is due next, like `2026-10-12`;
 *   empty when nothing is due:
 *   a task never tried, a task of the ladder done or behind its section's first cold run,
 *   and a ready cold task until its exam comes near.
 * - `done`: For a task of the ladder, whether I solved it right once,
 *   or its section has a cold run.
 * - `level`: For a cold task, the runs of its section that count, 0 to 4.
 * - `open`: For a cold task, its parts still to sit in its run, all of them when none sits yet;
 *   none for a task without parts.
 * - `ready`: For a cold task, whether its section has its four runs, spaced as the protocol says.
 * - `skipped`: Whether its last attempt skipped it, which takes it out of the due list.
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
 * A section of a module, a note of a chapter, with the state of its cold task,
 * the unit of the ready number.
 *
 * - `title`: Its name, like `01_01_SampleMeanStandardError`.
 * - `note`: Path of its note, as the scripts view takes it.
 * - `chapter`: Name of its chapter, like `01_RegressionAnalysis`.
 * - `cold`: Identity of its cold task of today, the variant {@link variantIndexOf} gives,
 *   empty when it has none yet.
 * - `algorithm`: Heading of its Algorithm as written, the one worked example,
 *   at the bottom of its ladder, like `Algorithm. Check an Estimator for Bias`,
 *   see {@link algorithmOf}; empty for none.
 * - `tasks`: Number of its tasks, the cold one included.
 * - `tried`: Number of its tasks I tried, skips not counted.
 * - `round`: Its round, the runs of its cold task done before today, so it stays the whole day:
 *   round 0 until the first right run, round 1 until the second, and so on; a failed run leaves it.
 * - `ladder`: Whether it still learns the ladder, its theory and Examples before the cold task:
 *   while no cold task has an attempt on a day before today, see {@link attemptDaysOf}.
 * - `rightDue`: Day the cold task comes back after a right run today,
 *   by the spacing, see {@link dueAfter};
 *   empty without a cold task.
 * - `wrongDue`: Day it comes back after a failed run today, 2 days later;
 *   empty without a cold task.
 * - `seen`: Steps of the round shown I passed with `Next`, by their keys, from older lines `seen`,
 *   see {@link RoundLine}; in today's form the steps before the one I stand at count as passed.
 * - `at`: Key of the step of the round shown I am at, by the last `Next`, empty for none yet.
 * - `closed`: Whether I closed the round shown by hand.
 * - `days`: Days I learned it, the oldest first:
 *   those of the skill entries with an attempt at one of its tasks, skips not counted,
 *   or a line `X-ROUND` of it, like `2026-10-11`.
 * - `today`: What of it is due today, see {@link todayMarked}:
 *   `task`, its Task of today, `new`, its round 0, or empty for nothing.
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
    today: SectionToday;
};

/**
 * What of a section is due today, see {@link todayMarked}.
 */
export type SectionToday = "task" | "new" | "";

/**
 * Where I stand in the round of a section, as a line `X-ROUND` of a skill entry of the log says it,
 * so where I am lives in the log alone, never in the browser or the note:
 * one line per section in a skill entry, written anew in its place as I go on, its section,
 * its round, the number of right runs of its Task before, and the step I went on to with `Next`,
 * where the round goes on, also in another session, or `done` once I closed the round by hand,
 * like `01_01_SampleMeanEstimator;1;Algorithm. Check an Estimator for Bias`
 * and `01_01_SampleMeanEstimator;1;done`;
 * the steps before it count as passed.
 * A step is named by its key, its heading as written,
 * and for a step a failure brought back,
 * the heading of the block whose failure began the way down after ` after `,
 * like `Example. Kiosk Double Count after Task. Juice Bar`.
 * Round 0 goes on over days until I close it;
 * a later round, one Task and what its failure brings back, counts its lines of its day only,
 * since a failed run repeats the round on another day.
 * An older line, one per thing I did, starts with its time and names the section with its module,
 * then its round, its kind and its step,
 * like `091500;IN2028/01_01_SampleMeanEstimator;0;seen;Definition. Population and Sample`:
 * - `seen`: a step without a result, like theory, passed with `Next`;
 * - `at`: the step I went on to with `Next`;
 * - `closed`: the round closed by hand, without a step.
 * A line of today's form reads as `at`, or as `closed` for `done`;
 * one of an entry whose skill I changed later names the module of its section before `/`,
 * like `IN2028/01_01_SampleMeanEstimator;1;done`, see {@link skillEntryEdit}.
 *
 * - `day`: Day of its skill entry.
 * - `section`: Its section with its module, `<module>/<note name>`,
 *   like `IN2028/01_01_SampleMeanEstimator`.
 * - `round`: Its round.
 * - `kind`: What it says.
 * - `step`: Key of its step, empty for `closed`.
 */
type RoundLine = {
    day: string;
    section: string;
    round: number;
    kind: RoundKind;
    step: string;
};

/**
 * What a line `X-ROUND` says, see {@link RoundLine}.
 */
export type RoundKind = "seen" | "at" | "closed";

/**
 * Where I stand in a round, as the scripts view sends it, see {@link roundAdd}.
 *
 * - `section`: Its section with its module, like `IN2028/01_01_SampleMeanEstimator`.
 * - `round`: Its round.
 * - `step`: Key of the step I went on to, or `done` once I closed the round.
 */
export type RoundNew = {
    section: string;
    round: number;
    step: string;
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
 * - `paths`: The folder of each of them from `NomWorkspace` by its name,
 *   which a skill entry links as the `ALTREP` of its `SUMMARY`
 *   and the dialog shows grey below the skill picked, like
 *   `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`,
 *   see `skillFolderOf` in `documents.ts`.
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
 * A new attempt, as a button of a task sends it,
 * and as each attempt of a skill entry of the dialog comes:
 * the task judged as a whole, right or wrong.
 *
 * - `task`: Identity of the task, see {@link Task}.
 * - `result`: Its result, `right` or `wrong`.
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
 * - `title`: Its title, `SUMMARY`, free,
 *   like `IN2028 Lecture 3 recap`, empty for the one its skill and type give it,
 *   see `titleOf` in `documents.ts`.
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
 * - `location`: Place, `LOCATION`, like the room of a lecture logged from its box.
 * - `online`, `onlineLink`, `passcode`: What I did online, like the stream of a lecture,
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
    type: string;
    module: string;
    semester: string;
    chapters: string[];
    documents: string[];
    attempts: AttemptNew[];
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
 * The parts of an `X-ATTEMPT`, see the top of this file and {@link attemptLineOf}.
 *
 * - `older`: Whether it is written the older way, its task with its module,
 *   so it is written back that way.
 * - `time`: Time of the tap of an older one, like `14:05`, written like `140500`, empty for none.
 * - `task`: Identity of the task, with its module, like `IN2028/Kiosk Chain Review`.
 * - `part`: Part of a cold task of an older one, like `2`, empty for the whole task.
 * - `result`: The result as written, like `wrong`.
 * - `effort`: My effort of an older one as written, empty for none.
 * - `detail`: My comment on what went wrong,
 *   or of an older one where I got stuck or why I skipped, empty for none.
 */
type AttemptLine = {
    older: boolean;
    time: string;
    task: string;
    part: string;
    result: string;
    effort: string;
    detail: string;
};

/**
 * Results a new attempt can have, the task judged as a whole.
 */
const judged: Result[] = ["right", "wrong"];

/**
 * Step of a line `X-ROUND` once I closed its round, see {@link RoundLine}.
 */
const roundDone: string = "done";

/**
 * Days until a task is due again after a wrong or stuck attempt.
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
 * Round every section of a chapter must stand in before the next chapter begins,
 * see {@link todayMarked}: 2, so each had its Task of round 0 and of round 1 right;
 * whether 2 or 3 is still open.
 */
const chapterOpenRound: number = 2;

/**
 * Estimated exams of the modules of the semester
 * whose exam the university has not named yet, by their codes;
 * a named exam stands in the plan of its module as a box of the type `FA`, which wins,
 * see {@link examOf}, like WI1057 on 18.02.2027 at 17:00;
 * a module neither planned nor listed is estimated at {@link examDefault}.
 * IN2028 is estimated from its endterms of the last years,
 * all on the last Thursday or so of February:
 * 28.02.2022, 29.02.2024, 27.02.2025;
 * IN0004 from its last two, each on the second Friday of February:
 * 14.02.2025, 13.02.2026.
 */
export const exams: { [code: string]: ExamDate } = {
    IN2028: { day: "2027-02-25", estimated: true },
    IN0004: { day: "2027-02-12", estimated: true },
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
 * Time of the tap at the start of an `X-ATTEMPT` in the form of the iCalendar format, hours,
 * minutes and seconds, like `140500` for 14:05, or of an older one like `14:05`;
 * its hours and its minutes.
 */
const tapTime: RegExp = /^(\d{2}):?(\d{2})(?:\d{2})?$/;

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
 * Cuts an `X-ATTEMPT` into its parts, see the top of this file:
 * the name of its task, its result and my comment on what went wrong, put together again,
 * since it may hold a `;`. An older one,
 * whose task names its module before `/`, may start with the time of the tap,
 * and has the part of a cold task after `#`, then the result, my effort,
 * and the rest where I got stuck, why I skipped or what went wrong.
 * - `fields`: The value cut at each `;`, without the time.
 * - `tap`: Hours and minutes of the time, `null` for none.
 * - `time`: The time, like `14:05`, empty for none.
 * - `named`: The task as written, with its part after `#` in an older one.
 * - `before`: What stands before its first `/`.
 * - `task`, `part`: The task and its part, the part `undefined` for none.
 * - `older`: Whether it is written the older way:
 *   what stands before its first `/` is the module of its skill entry
 *   or the code of a module folder, see `notes.ts`,
 *   so a task of today's form keeps a `/` in its name, like `Train/Test Split`.
 *
 * @param value - `X-ATTEMPT`, like `Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`,
 *   or of an older one `140500;IN2028/Kiosk Chain Review#2;stuck;high;step 2` or `14:05;…`
 * @param module - Module of its skill entry, like `IN2028`, whose task it names
 * @returns Its parts
 */
function attemptLineOf(value: string, module: string): AttemptLine {
    const fields: string[] = value.split(";");
    const tap: RegExpExecArray | null = tapTime.exec(fields[0]);
    const time: string = tap === null ? "" : `${tap[1]}:${tap[2]}`;
    if (time !== "") fields.shift();
    const named: string = fields[0] ?? "";
    const before: string = named.split("/")[0];
    const older: boolean =
        named.includes("/") &&
        (before === module || moduleFoldersRead().map(codeOf).includes(before));
    if (!older)
        return {
            older: false,
            time: "",
            task: `${module}/${named}`,
            part: "",
            result: fields[1] ?? "",
            effort: "",
            detail: fields.slice(2).join(";"),
        };
    const [task, part]: (string | undefined)[] = named.split("#");
    return {
        older: true,
        time: time,
        task: task ?? "",
        part: part ?? "",
        result: fields[1] ?? "",
        effort: fields[2] ?? "",
        detail: fields.slice(3).join(";"),
    };
}

/**
 * Writes the parts of an `X-ATTEMPT` back into one value, see {@link attemptLineOf}:
 * the name of its task, its result and my comment,
 * like `Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`;
 * an older one the older way, its task with its module and its part,
 * its time in the form of the iCalendar format,
 * like `140500` for 14:05, also the time of one written like `14:05`;
 * each leaving out the time when there is none and the empty parts at the end.
 * - `named`: The task as written, without its module in today's form.
 * - `fields`: Task with its part, result, effort and detail, without the effort in today's form.
 * - `end`: Number of them written, at least task and result.
 *
 * @param line - Parts of the attempt
 * @returns Value like `Kiosk Chain;right` or `140500;IN2028/Kiosk Chain Review#2;stuck;;step 2`
 */
function lineValueOf(line: AttemptLine): string {
    const named: string = line.older ? line.task : line.task.slice(line.task.indexOf("/") + 1);
    const fields: string[] = line.older
        ? [
              line.part === "" ? named : `${named}#${line.part}`,
              line.result,
              line.effort,
              line.detail,
          ]
        : [named, line.result, line.detail];
    let end: number = fields.length;
    while (end > 2 && fields[end - 1] === "") end--;
    const kept: string[] = fields.slice(0, end);
    if (line.time !== "") kept.unshift(`${line.time.replace(":", "")}00`);
    return kept.join(";");
}

/**
 * Reads an attempt from its `X-ATTEMPT`, see {@link attemptLineOf}.
 * - `line`: Its parts.
 * - `result`: Result of the attempt.
 *
 * @param value - `X-ATTEMPT`, like `Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`
 * @param day - Day its skill entry started in Berlin time
 * @param module - Module of its skill entry, like `IN2028`
 * @param order - Its place among all my attempts, see {@link Attempt}
 * @returns The attempt with its task
 */
function attemptOf(value: string, day: string, module: string, order: number): LoggedAttempt {
    const line: AttemptLine = attemptLineOf(value, module);
    const result: Result = line.result as Result;
    return {
        task: line.task,
        attempt: {
            day: day,
            order: order,
            time: line.time,
            part: line.part,
            result: result,
            effort: line.effort as Effort | "",
            stuck: result === "stuck" ? line.detail : "",
            skip: result === "skipped" ? line.detail : "",
            error: result === "wrong" ? line.detail : "",
        },
    };
}

/**
 * Reads my attempts: those of the skill entries of the log up to now,
 * in the order of their entries and within each,
 * each with its place in that order, see {@link attemptOf}.
 * - `values`: The `X-ATTEMPT`s of every entry, each with its day and module.
 *
 * @returns Attempts with their tasks
 */
function attemptsRead(): LoggedAttempt[] {
    const values: [string, string, string][] = skillEntriesRead(
        "1970-01-01T00:00:00Z",
        new Date().toISOString(),
    ).flatMap((entry: Entry): [string, string, string][] =>
        entry.attempts.map((value: string): [string, string, string] => [
            value,
            berlinDateOf(new Date(entry.start)),
            entry.module,
        ]),
    );
    return values.map(
        ([value, day, module]: [string, string, string], index: number): LoggedAttempt =>
            attemptOf(value, day, module, index),
    );
}

/**
 * Reads the lines `X-ROUND` of all skill entries of the log,
 * see {@link RoundLine}, in the order of their entries and within each, the oldest first:
 * one of today's form, its section without module, as where I stand, `at`, or `closed` for `done`;
 * an older one with its time, the section with its module, and its kind.
 * - `day`: Day of a skill entry.
 * - `fields`: A line cut at each `;`.
 *
 * @returns Lines in order
 */
function roundsRead(): RoundLine[] {
    return skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).flatMap(
        (entry: Entry): RoundLine[] => {
            const day: string = berlinDateOf(new Date(entry.start));
            return entry.rounds.map((value: string): RoundLine => {
                const fields: string[] = value.split(";");
                if (tapTime.test(fields[0] ?? "")) {
                    const [, section, round, kind, ...step]: string[] = fields;
                    return {
                        day: day,
                        section: section ?? "",
                        round: Number(round),
                        kind: kind as RoundKind,
                        step: step.join(";"),
                    };
                }
                const [, round, ...step]: string[] = fields;
                const done: boolean = step.join(";") === roundDone;
                return {
                    day: day,
                    section: roundSectionOf(value, entry.module),
                    round: Number(round),
                    kind: done ? "closed" : "at",
                    step: done ? "" : step.join(";"),
                };
            });
        },
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
 * Tells when a task of the ladder is due, see the top of this file:
 * by its last attempt that is no skip, done when that was right,
 * due 2 days later when it was wrong, stuck or guided;
 * done too, and never due, once its section has a cold run.
 * - `last`: Its last attempt that is no skip.
 * - `done`: Whether it is done.
 *
 * @param task - Task of the ladder
 * @param attempts - Its attempts, in order
 * @param run - Whether its section has a cold run
 * @returns Task with when it is due
 */
function ladderScheduleOf(task: Task, attempts: Attempt[], run: boolean): SkillTask {
    const last: Attempt | undefined = attempts.findLast(
        (attempt: Attempt): boolean => attempt.result !== "skipped",
    );
    const done: boolean = run || last?.result === "right";
    return {
        ...task,
        due: done || last === undefined ? "" : dayAdd(last.day, retryDays),
        done: done,
        level: 0,
        open: [],
        ready: false,
        skipped: attempts.at(-1)?.result === "skipped",
        attempts: attempts,
    };
}

/**
 * Tells when a cold task is due by walking its attempts in order, see the top of this file:
 * each part still open in the run has its own day;
 * a right attempt on or after that day sits the part, the whole task every part,
 * and the run counts once every part sits;
 * a wrong, stuck or guided attempt opens its parts again, due 2 days later,
 * and steps the section back one run, once per run.
 * - `all`: Its parts, one empty part for a task without parts.
 * - `level`: Runs that count so far.
 * - `runs`: Runs ever done, also those a failure stepped back.
 * - `dues`: Parts still open in the run, each with the day it is due, empty for none.
 * - `begun`: Day of the first attempt of the run, empty before it;
 *   a part without a day of its own is due from it on.
 * - `failed`: Whether the run has stepped back already.
 * - `skipped`: Whether the attempts so far end with a skip.
 * - `parts`: Parts an attempt is about.
 * - `next`: Day the section is due after a run.
 * - `due`: The earliest day of the open parts, empty when none has one.
 *
 * @param task - Cold task
 * @param attempts - Its attempts, in order
 * @param exam - Exam of its module
 * @returns Task with when it is due, and the runs its section ever had
 */
function coldScheduleOf(task: Task, attempts: Attempt[], exam: ExamDate): [SkillTask, number] {
    const all: string[] = task.parts.length === 0 ? [""] : task.parts;
    let level: number = 0;
    let runs: number = 0;
    let dues: Map<string, string> = new Map(
        all.map((part: string): [string, string] => [part, ""]),
    );
    let begun: string = "";
    let failed: boolean = false;
    let skipped: boolean = false;
    attempts.forEach((attempt: Attempt): void => {
        skipped = attempt.result === "skipped";
        if (skipped) return;
        if (begun === "") begun = attempt.day;
        const parts: string[] =
            attempt.part === "" || !all.includes(attempt.part) ? all : [attempt.part];
        if (attempt.result !== "right") {
            parts.forEach((part: string): void => {
                dues.set(part, dayAdd(attempt.day, retryDays));
            });
            if (!failed) level = Math.max(0, level - 1);
            failed = true;
            return;
        }
        parts
            .filter(
                (part: string): boolean => dues.has(part) && attempt.day >= (dues.get(part) ?? ""),
            )
            .forEach((part: string): void => {
                dues.delete(part);
            });
        if (dues.size > 0) return;
        level = Math.min(level + 1, spacingDays.length + 1);
        runs++;
        const next: string = dueAfter(level, attempt.day, exam);
        dues = new Map(all.map((part: string): [string, string] => [part, next]));
        begun = "";
        failed = false;
    });
    const due: string =
        [...dues.values()]
            .map((day: string): string => (day === "" ? begun : day))
            .filter((day: string): boolean => day !== "")
            .sort()[0] ?? "";
    return [
        {
            ...task,
            due: due,
            done: false,
            level: level,
            open: task.parts.length === 0 ? [] : [...dues.keys()],
            ready: level > spacingDays.length,
            skipped: skipped,
            attempts: attempts,
        },
        runs,
    ];
}

/**
 * Gives the attempts at all cold tasks of a section in the order I made them:
 * the variants of a section share its runs, so a run done on one variant counts for all.
 *
 * @param own - Cold tasks of a section, its variants, in the order of the note
 * @param attemptsOf - Attempts at a task
 * @returns Attempts, the oldest first
 */
function variantAttemptsOf<T extends Task>(
    own: T[],
    attemptsOf: (task: T) => Attempt[],
): Attempt[] {
    return own
        .flatMap(attemptsOf)
        .sort((first: Attempt, second: Attempt): number => first.order - second.order);
}

/**
 * Gives the days of attempts at the cold tasks of a section before today, skips left out.
 *
 * @param own - Cold tasks of a section, its variants, in the order of the note
 * @param attemptsOf - Attempts at a task
 * @param today - Today like `2026-10-17`
 * @returns Number of days, 0 at first
 */
function attemptDaysOf<T extends Task>(
    own: T[],
    attemptsOf: (task: T) => Attempt[],
    today: string,
): number {
    const days: string[] = [
        ...new Set(
            own
                .flatMap(attemptsOf)
                .filter((attempt: Attempt): boolean => attempt.result !== "skipped")
                .map((attempt: Attempt): string => attempt.day),
        ),
    ].sort();
    return days.at(-1) === today ? days.length - 1 : days.length;
}

/**
 * Gives which variant of a section's cold task is due:
 * each new day of attempts takes the next variant, see {@link attemptDaysOf},
 * so a run never repeats the numbers of the run before; the variant of today stays while I'm at it.
 *
 * @param own - Cold tasks of a section, its variants, in the order of the note
 * @param attemptsOf - Attempts at a task
 * @param today - Today like `2026-10-17`
 * @returns Index of the variant in `own`
 */
function variantIndexOf<T extends Task>(
    own: T[],
    attemptsOf: (task: T) => Attempt[],
    today: string,
): number {
    return attemptDaysOf(own, attemptsOf, today) % own.length;
}

/**
 * Builds the sections of a module from its tasks, in their order: one per note, with its round,
 * whether it still learns the ladder,
 * its cold task of today with the days it comes back after a right or a failed run today,
 * the heading of its Algorithm, and how many of its tasks I tried,
 * and where I am in the round shown, from the lines `X-ROUND` of the log alone,
 * see {@link RoundLine}. Round 0, the ladder,
 * lasts while no cold task has an attempt on a day before today,
 * or while I began it with `Next` and have not closed it, so it goes on over days until my close;
 * its Task is the first variant.
 * - `notes`: Tasks by their notes, in order.
 * - `colds`: Cold tasks of a note, its variants, and `cold` the first,
 *   which holds the level of all.
 * - `attemptsOf`: Attempts at a task.
 * - `key`: The section as its lines name it, like `IN2028/01_01_SampleMeanEstimator`.
 * - `first`: Its lines of round 0, and `begun` whether round 0 is begun and not closed.
 * - `round`: The round shown: 0 on the ladder, else the runs of its cold task done before today.
 * - `shown`: The lines of the round shown: all of round 0, or those of today of a later round.
 * - `days`: The days of its attempts, skips left out, and of its lines.
 *
 * @param tasks - Tasks of the module with when each is due
 * @param today - Today like `2026-10-17`
 * @param exam - Exam of the module
 * @param lines - Lines `X-ROUND` of the log, see {@link roundsRead}
 * @returns Sections
 */
function sectionsOf(
    tasks: SkillTask[],
    today: string,
    exam: ExamDate,
    lines: RoundLine[],
): SkillSection[] {
    const notes: Map<string, SkillTask[]> = Map.groupBy(
        tasks,
        (task: SkillTask): string => task.note,
    );
    const attemptsOf: (task: SkillTask) => Attempt[] = (task: SkillTask): Attempt[] =>
        task.attempts;
    return todayMarked(
        [...notes.values()].map((own: SkillTask[]): SkillSection => {
            const colds: SkillTask[] = own.filter(
                (task: SkillTask): boolean => task.kind === "cold",
            );
            const cold: SkillTask | undefined = colds[0];
            const key: string = `${own[0].id.split("/")[0]}/${own[0].section}`;
            const first: RoundLine[] = lines.filter(
                (line: RoundLine): boolean => line.section === key && line.round === 0,
            );
            const begun: boolean =
                first.length > 0 &&
                !first.some((line: RoundLine): boolean => line.kind === "closed");
            const ladder: boolean = attemptDaysOf(colds, attemptsOf, today) === 0 || begun;
            const round: number = ladder
                ? 0
                : cold === undefined
                  ? 0
                  : coldScheduleOf(
                        cold,
                        variantAttemptsOf(colds, (task: SkillTask): Attempt[] =>
                            task.attempts.filter(
                                (attempt: Attempt): boolean => attempt.day < today,
                            ),
                        ),
                        exam,
                    )[1];
            const shown: RoundLine[] = ladder
                ? first
                : lines.filter(
                      (line: RoundLine): boolean =>
                          line.section === key && line.round === round && line.day === today,
                  );
            const days: string[] = [
                ...own
                    .flatMap(attemptsOf)
                    .filter((attempt: Attempt): boolean => attempt.result !== "skipped")
                    .map((attempt: Attempt): string => attempt.day),
                ...lines
                    .filter((line: RoundLine): boolean => line.section === key)
                    .map((line: RoundLine): string => line.day),
            ];
            return {
                title: own[0].section,
                note: own[0].note,
                chapter: own[0].chapter,
                cold:
                    cold === undefined
                        ? ""
                        : ladder
                          ? cold.id
                          : colds[variantIndexOf(colds, attemptsOf, today)].id,
                algorithm: algorithmOf(own[0].note),
                tasks: own.length,
                tried: own.filter((task: SkillTask): boolean =>
                    task.attempts.some((attempt: Attempt): boolean => attempt.result !== "skipped"),
                ).length,
                round: round,
                ladder: ladder,
                rightDue:
                    cold === undefined
                        ? ""
                        : dueAfter(Math.min(cold.level + 1, spacingDays.length + 1), today, exam),
                wrongDue: cold === undefined ? "" : dayAdd(today, retryDays),
                seen: shown
                    .filter((line: RoundLine): boolean => line.kind === "seen")
                    .map((line: RoundLine): string => line.step),
                at: shown.findLast((line: RoundLine): boolean => line.kind === "at")?.step ?? "",
                closed: shown.some((line: RoundLine): boolean => line.kind === "closed"),
                days: [...new Set(days)].sort(),
                today: "",
            };
        }),
        tasks,
        today,
    );
}

/**
 * Marks what of each section of a module is due today, which the plan of today holds,
 * see `suggestions.ts`: `task` for a section past round 0 whose Task of today is due,
 * or which I tried today; `new` for a section on round 0 I began, by an attempt,
 * a `Next` or its close, and while there is none, for the first section not begun yet, one a day,
 * when its chapter has begun: the first chapter,
 * or one whose chapter before has every section in round {@link chapterOpenRound} or later.
 * Before the day my learning starts nothing is marked, see `learningStart` in `trackers.ts`.
 * - `cold`: The Task of today of a section, `undefined` for none.
 * - `begun`: Whether a section on round 0 is begun.
 * - `marked`: The sections with their Tasks and begun rounds 0 marked.
 * - `next`: The first section not begun yet, `undefined` for none.
 * - `before`: The sections of the chapter before that of `next`, none for the first chapter.
 *
 * @param sections - Sections of a module in the order of their notes, nothing marked yet
 * @param tasks - Tasks of the module with when each is due
 * @param today - Today like `2026-10-17`
 * @returns The sections, marked
 */
function todayMarked(sections: SkillSection[], tasks: SkillTask[], today: string): SkillSection[] {
    if (today < settings.learningStart) return sections;
    const cold: (section: SkillSection) => SkillTask | undefined = (
        section: SkillSection,
    ): SkillTask | undefined =>
        section.cold === ""
            ? undefined
            : tasks.find((task: SkillTask): boolean => task.id === section.cold);
    const begun: (section: SkillSection) => boolean = (section: SkillSection): boolean =>
        section.tried > 0 || section.at !== "" || section.closed;
    const marked: SkillSection[] = sections.map((section: SkillSection): SkillSection => {
        const task: SkillTask | undefined = cold(section);
        if (task === undefined) return section;
        if (section.ladder) return begun(section) ? { ...section, today: "new" } : section;
        const due: boolean = task.due !== "" && task.due <= today;
        const tried: boolean = task.attempts.some(
            (attempt: Attempt): boolean => attempt.day === today && attempt.result !== "skipped",
        );
        return due || tried ? { ...section, today: "task" } : section;
    });
    if (marked.some((section: SkillSection): boolean => section.today === "new")) return marked;
    const next: SkillSection | undefined = marked.find(
        (section: SkillSection): boolean => cold(section) !== undefined && !begun(section),
    );
    if (next === undefined) return marked;
    const chapters: string[] = [
        ...new Set(marked.map((section: SkillSection): string => section.chapter)),
    ];
    const before: SkillSection[] = marked.filter(
        (section: SkillSection): boolean =>
            cold(section) !== undefined &&
            section.chapter === chapters[chapters.indexOf(next.chapter) - 1],
    );
    return before.every((section: SkillSection): boolean => section.round >= chapterOpenRound)
        ? marked.map((section: SkillSection): SkillSection =>
              section === next ? { ...section, today: "new" } : section,
          )
        : marked;
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
 * - `attempts`: My attempts, in order.
 * - `boxes`: Skill boxes of the plan up to {@link planDays} days after today.
 * - `byTask`: The same attempts by the identity of their task.
 * - `unique`: Tasks of a module, each name once.
 * - `exam`: Exam of a module, see {@link examOf}.
 * - `attemptsOf`: Attempts at a task.
 * - `colds`: Cold tasks of a module with when each is due and the runs its section had,
 *   by their notes, the first of a note.
 * - `tasks`: Tasks of a module with when each is due.
 *
 * @returns {@link Skilling}
 * @throws {Error} - When a folder or note cannot be read
 */
export function skillingRead(): Skilling {
    const attempts: LoggedAttempt[] = attemptsRead();
    const rounds: RoundLine[] = roundsRead();
    const byTask: Map<string, LoggedAttempt[]> = Map.groupBy(
        attempts,
        (logged: LoggedAttempt): string => logged.task,
    );
    const boxes: Box[] = skillBoxesRead(dayAdd(berlinDateOf(new Date()), planDays));
    const modules: SkillModule[] = moduleTasksRead().map((module: ModuleTasks): SkillModule => {
        const unique: Task[] = module.tasks.filter(
            (task: Task, index: number): boolean =>
                module.tasks.findIndex((known: Task): boolean => known.id === task.id) === index,
        );
        const exam: ExamDate = examOf(module.code, boxes);
        const attemptsOf: (task: Task) => Attempt[] = (task: Task): Attempt[] =>
            (byTask.get(task.id) ?? []).map((logged: LoggedAttempt): Attempt => logged.attempt);
        const variants: Map<string, Task[]> = Map.groupBy(
            unique.filter((task: Task): boolean => task.kind === "cold"),
            (task: Task): string => task.note,
        );
        const colds: Map<string, [SkillTask, number]> = new Map(
            [...variants].map(([note, own]: [string, Task[]]): [string, [SkillTask, number]] => [
                note,
                coldScheduleOf(own[0], variantAttemptsOf(own, attemptsOf), exam),
            ]),
        );
        const today: string = berlinDateOf(new Date());
        const tasks: SkillTask[] = unique.map((task: Task): SkillTask => {
            if (task.kind !== "cold")
                return ladderScheduleOf(
                    task,
                    attemptsOf(task),
                    (colds.get(task.note)?.[1] ?? 0) > 0,
                );
            const own: Task[] = variants.get(task.note) ?? [task];
            const run: SkillTask =
                colds.get(task.note)?.[0] ?? coldScheduleOf(task, attemptsOf(task), exam)[0];
            const current: boolean = own[variantIndexOf(own, attemptsOf, today)] === task;
            return {
                ...task,
                due: current ? run.due : "",
                done: run.done,
                level: run.level,
                open: run.open,
                ready: run.ready,
                skipped: current && run.skipped,
                attempts: attemptsOf(task),
            };
        });
        return {
            code: module.code,
            title: module.title,
            exam: exam,
            tasks: tasks,
            sections: sectionsOf(tasks, today, exam, rounds),
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
 * Writes an attempt as its `X-ATTEMPT`, after checking it:
 * the name of its task, its result, right or wrong,
 * and for a wrong one my comment, in one line without line breaks,
 * like `Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`, see {@link lineValueOf}.
 * - `task`: Task of the attempt, as its note holds it now.
 * - `comment`: My comment in one line.
 *
 * @param attempt - New attempt
 * @param tasks - Tasks of the modules of the semester
 * @returns Value like `Kiosk Chain;right`
 * @throws {Error} - When no note holds the task, the result is neither right nor wrong,
 *   or a comment comes with right
 */
function attemptValueOf(attempt: AttemptNew, tasks: Task[]): string {
    const task: Task | undefined = tasks.find(
        (candidate: Task): boolean => candidate.id === attempt.task,
    );
    if (task === undefined) throw new Error(`No task ${attempt.task}`);
    if (!judged.includes(attempt.result)) throw new Error(`No result ${attempt.result}`);
    const comment: string = attempt.comment.replace(/\s+/g, " ").trim();
    if (comment !== "" && attempt.result !== "wrong")
        throw new Error(`No comment with ${attempt.result}`);
    return lineValueOf({
        older: false,
        time: "",
        task: task.id,
        part: "",
        result: attempt.result,
        effort: "",
        detail: comment,
    });
}

/**
 * Lists the chapters of a skill entry: those picked,
 * then the chapters of the tasks of its attempts and older copies for my tutor, each once,
 * since an entry covers the chapters of the tasks I worked on in it.
 * - `solved`: Chapter of each task, as its note lies now; none for a task no note holds any more.
 *
 * @param chapters - Chapters picked, by their names
 * @param worked - Identities of the tasks of its `X-ATTEMPT`s and `X-TUTOR`s
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
 * Gives the identities of the tasks of `X-ATTEMPT`s, see {@link attemptLineOf}.
 *
 * @param values - `X-ATTEMPT`s
 * @param module - Module of their skill entry, like `IN2028`
 * @returns Identities, like `IN2028/Kiosk Chain Review`
 */
function tasksOf(values: string[], module: string): string[] {
    return values.map((value: string): string => attemptLineOf(value, module).task);
}

/**
 * Checks a skill entry before it is written: one of the types, the type it had,
 * like an older `DEV` no longer offered,
 * or none, a module with a folder, a project or no skill at all,
 * chapters among the module's or among those the entry had,
 * new attempts at tasks of its module only, well-formed people,
 * see `attendeesAllow` in `categories.ts`, and an end after the start; the attempts a changed entry
 * has keep their task, also once I changed its skill.
 * - `offered`: Chapters of the module, see `notes.ts`.
 * - `unknown`: First chapter that is neither offered nor kept.
 *
 * @param entry - Skill entry as the page sends it
 * @param values - Its new `X-ATTEMPT`s
 * @param kept - Chapters the entry had,
 *   or the box a new entry is logged from, by the names they gave them,
 *   also once a folder has another name; none for a new entry without box
 * @param keptType - Type the entry or the box it is logged from had, like `DEV`, empty for none
 * @throws {Error} - When one of these does not hold
 */
function skillEntryCheck(
    entry: SkillEntryNew,
    values: string[],
    kept: string[],
    keptType: string,
): void {
    if (entry.type !== "" && entry.type !== keptType && !skillTypes.includes(entry.type))
        throw new Error(`No type ${entry.type}`);
    const offered: string[] = entry.module === "" ? [] : moduleRead(entry.module).chapters;
    const unknown: string | undefined = entry.chapters.find(
        (chapter: string): boolean => !offered.includes(chapter) && !kept.includes(chapter),
    );
    if (unknown !== undefined) throw new Error(`No chapter ${unknown} in ${entry.module}`);
    if (
        values.some(
            (value: string): boolean =>
                attemptLineOf(value, entry.module).task.split("/")[0] !== entry.module,
        )
    )
        throw new Error(`Only attempts at tasks of ${entry.module}`);
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
 * see {@link chaptersWith}, one `X-ATTEMPT` per attempt,
 * and the box it is logged from, which is done then;
 * my own learning, without type and box,
 * like the session the learning view opens, is logged from the study box of its module and day,
 * see `studyBoxOf` in `boxes.ts`, so learning does the box of the plan.
 * - `tasks`: Tasks of the modules of the semester.
 * - `values`: `X-ATTEMPT`s of the entry.
 * - `chapters`: Its chapters, those picked and those of its attempts.
 * - `plan`: The box it is logged from, `null` for none, whose place keeps its link,
 *   see `placeLinkOf` in `places.ts`, and whose chapters it may keep by their names,
 *   see {@link skillEntryCheck}.
 * - `fields`: Fields and times of the entry.
 * - `own`: Its chapters, links, attempts and box, as properties of my own.
 * - `id`: Identifier of the new entry.
 *
 * @param entry - Skill entry as the page sends it
 * @returns Identifier of the new entry, so the reader can send it to Vu, see `shared.ts`
 * @throws {Error} - When an attempt is not right,
 *   see {@link attemptValueOf}, the entry is not right,
 *   see {@link skillEntryCheck}, a document is none of the module's,
 *   the link typed online is no web address, or the box it is logged from is not open
 */
export function skillEntryAdd(entry: SkillEntryNew): string {
    const tasks: Task[] = tasksRead();
    const values: string[] = entry.attempts.map((attempt: AttemptNew): string =>
        attemptValueOf(attempt, tasks),
    );
    const chapters: string[] = chaptersWith(entry.chapters, tasksOf(values, entry.module), tasks);
    const plan: Box | null =
        entry.planned !== ""
            ? boxOpenFind(entry.planned)
            : entry.module !== "" && entry.type === ""
              ? (studyBoxOf(entry.module, berlinDateOf(new Date(entry.start)), chapters) ?? null)
              : null;
    skillEntryCheck(entry, values, plan?.chapters ?? [], plan?.type ?? "");

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
    const own: [string, string | Link][] = linksOf(entry.module, entry.documents, []).map(
        (link: Link): [string, Link] => ["attach", link],
    );
    own.push(...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]));
    own.push(...values.map((value: string): [string, string] => ["x-attempt", value]));
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
 * The attempts it has keep their task, also once I change its skill:
 * then each that names its task without module is written the older way, with its module,
 * see {@link lineValueOf}, and each line `X-ROUND` of today's form names the module of its section,
 * see {@link roundSectionOf}.
 * Written only while its file holds it as the dialog opened it,
 * its fingerprint still the one the dialog sends, as for any entry of the log,
 * see `entryEdit` in `day.ts`: after any change of it since,
 * like an attempt the learning view wrote into it,
 * see {@link attemptAdd}, nothing is written; the first save wins.
 * - `file`: `.ics` file of the entry.
 * - `old`: The entry as it is.
 * - `tasks`: Tasks of the modules of the semester.
 * - `added`: `X-ATTEMPT`s of the new attempts.
 * - `values`: `X-ATTEMPT`s it has, with their module once its skill changes, then the new ones.
 * - `marks`: Its `X-ROUND`s,
 *   of today's form with the module of their section once its skill changes.
 * - `worked`: Identities of the tasks of its attempts
 *   and older copies for my tutor at tasks of its skill, whose chapters it covered.
 *
 * @param change - Changed skill entry as the page sends it,
 *   with its fingerprint as the dialog opened it
 * @returns Whether it is written, `false` when its file changed it since the dialog opened it
 * @throws {Error} - When there is no such skill entry in the log of the new system,
 *   a new attempt is not right, see {@link attemptValueOf}, the entry is not right,
 *   see {@link skillEntryCheck}, a document is none of the module's,
 *   or the link typed online is no web address
 */
export function skillEntryEdit(change: SkillEntryChange): boolean {
    const [file, old]: [string, Entry] = entryFind(skillLog, change.id);
    if (!old.editable || old.category !== skillName)
        throw new Error(`${old.title} is no skill entry of the new system`);
    if (old.version !== change.version) return false;
    const tasks: Task[] = tasksRead();
    const added: string[] = change.attempts.map((attempt: AttemptNew): string =>
        attemptValueOf(attempt, tasks),
    );
    const values: string[] = [
        ...old.attempts.map((value: string): string =>
            change.module === old.module
                ? value
                : lineValueOf({ ...attemptLineOf(value, old.module), older: true }),
        ),
        ...added,
    ];
    const marks: string[] = old.rounds.map((value: string): string =>
        change.module === old.module || tapTime.test(value.split(";")[0] ?? "")
            ? value
            : [roundSectionOf(value, old.module), ...value.split(";").slice(1)].join(";"),
    );
    skillEntryCheck(change, added, chaptersOf(old), old.type);

    const worked: string[] = [...tasksOf(values, change.module), ...old.tutors].filter(
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
        ["attach", linksOf(change.module, change.documents, old.links)],
        ["x-attempt", values],
        ["x-round", marks],
    ]);
    entryChange(file, old, fields, logFileOf(fields));
    return true;
}

/**
 * Writes attempts and where I stand in rounds into the skill entry of the moment of a module,
 * see the top of this file:
 * adds the new `X-ATTEMPT`s after those it has,
 * puts each new `X-ROUND` in the place of the line of today's form of its section,
 * or after the others when it has none,
 * links the note of each section of them as an `ATTACH` without fingerprint,
 * see {@link notePathOf}, with the chapters of their tasks,
 * and moves its end to the end of the quarter hour of now, if that is later.
 * Without an open entry of the module, starts one covering the quarter hour of now:
 * logged from the open skill box of the module for now, with its type and its title,
 * which is done then, else without type.
 * - `quarter`: End of the quarter hour of now, now rounded up to the quarter hour.
 * - `worked`: Identities of the tasks of the new lines,
 *   and for a line `X-ROUND` one task of its section.
 * - `notes`: Links to the notes of their sections, each once, without fingerprint.
 * - `plan`: Open skill box of the module for now and the chapters of the new lines,
 *   see `skillBoxOf` in `boxes.ts`.
 * - `type`: Type of a new entry, the box's or none.
 * - `chapters`: Chapters of a new entry, those of the tasks of the new lines,
 *   or of the open entry with them.
 * - `own`: The links, chapters, attempts, rounds and box of a new entry, as properties of my own.
 * - `start`: Start of a new entry, a quarter hour before its end.
 * - `semester`: Semester of a new entry, the box's or that of its day, which its link names too,
 *   see `titleOf` in `documents.ts`.
 * - `fields`: Fields and times of a new entry, which go into the log of the module,
 *   see `logFileOf` in `day.ts`.
 * - `values`: `X-ATTEMPT`s of the open entry with the new ones.
 * - `marks`: `X-ROUND`s of the open entry with the new ones,
 *   each in the place of the one of its section.
 * - `links`: Links of the open entry to files,
 *   without the folders of chapters an older entry links, see `documentLinksOf` in `documents.ts`,
 *   then the notes it links not yet.
 * - `properties`: Properties of the open entry to write again, its chapters as `X-CHAPTER`s,
 *   with those of its older `X-TUTOR`s, which stay as they are.
 *
 * @param module - Module code, like `IN2028`
 * @param open - The skill entry of the moment of the module, `undefined` for none
 * @param attempts - New `X-ATTEMPT`s
 * @param rounds - New `X-ROUND`s of today's form, at most one per section
 * @param tasks - Tasks of the modules of the semester
 * @param now - The moment
 */
function momentWrite(
    module: string,
    open: Entry | undefined,
    attempts: string[],
    rounds: string[],
    tasks: Task[],
    now: Date,
): void {
    const quarter: Date = new Date(Math.ceil(now.getTime() / quarterHour) * quarterHour);
    const worked: string[] = [...tasksOf(attempts, module), ...roundTasksOf(rounds, module, tasks)];
    const notes: Link[] = [
        ...new Set(
            worked.flatMap((id: string): string[] => {
                const task: Task | undefined = tasks.find(
                    (candidate: Task): boolean => candidate.id === id,
                );
                return task === undefined ? [] : [notePathOf(task)];
            }),
        ),
    ].map((path: string): Link => ({ path: path, fingerprint: "" }));
    if (open === undefined) {
        const chapters: string[] = chaptersWith([], worked, tasks);
        const plan: Box | undefined = skillBoxOf(module, now, chapters);
        const type: string = plan?.type ?? "";
        const own: [string, string | Link][] = [
            ...notes.map((link: Link): [string, Link] => ["attach", link]),
            ...chapters.map((chapter: string): [string, string] => ["x-chapter", chapter]),
            ...attempts.map((value: string): [string, string] => ["x-attempt", value]),
            ...rounds.map((value: string): [string, string] => ["x-round", value]),
        ];
        if (plan !== undefined) own.push(["related-to", plan.id]);
        if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
        const start: Date = new Date(quarter.getTime() - quarterHour);
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
            passcode: plan?.passcode ?? "",
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

    const values: string[] = [...open.attempts, ...attempts];
    const marks: string[] = rounds.reduce((kept: string[], value: string): string[] => {
        const index: number = kept.findIndex(
            (other: string): boolean =>
                !tapTime.test(other.split(";")[0] ?? "") &&
                roundSectionOf(other, module) === roundSectionOf(value, module),
        );
        return index === -1 ? [...kept, value] : kept.with(index, value);
    }, open.rounds);
    const links: Link[] = [
        ...documentLinksOf(open.links),
        ...notes.filter(
            (note: Link): boolean =>
                !open.links.some((link: Link): boolean => link.path === note.path),
        ),
    ];
    const chapters: string[] = chaptersWith(
        chaptersOf(open),
        [...tasksOf(values, module), ...open.tutors, ...roundTasksOf(marks, module, tasks)],
        tasks,
    );
    const properties: [string, (string | Date | Link)[]][] = [
        ["x-chapter", chapters],
        ["attach", links],
        ["x-attempt", values],
        ["x-round", marks],
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
 * the last one of the module that started before now and ended at most {@link sessionPause} ago.
 *
 * @param module - Module code, like `IN2028`
 * @param now - The moment
 * @returns The entry, `undefined` for none
 */
function momentOf(module: string, now: Date): Entry | undefined {
    return skillEntriesRead(new Date(now.getTime() - sessionPause).toISOString(), now.toISOString())
        .filter((entry: Entry): boolean => entry.module === module)
        .at(-1);
}

/**
 * Writes an attempt from a button of a task into the skill entry
 * of the moment, see {@link momentWrite}.
 * - `tasks`: Tasks of the modules of the semester.
 * - `module`: Module code of its task, the part of its identity before `/`.
 * - `now`: The moment of the attempt.
 *
 * @param attempt - Attempt as the page sends it
 * @throws {Error} - When the attempt is not right, see {@link attemptValueOf}
 */
export function attemptAdd(attempt: AttemptNew): void {
    const tasks: Task[] = tasksRead();
    const module: string = attempt.task.split("/")[0];
    const now: Date = new Date();
    momentWrite(module, momentOf(module, now), [attemptValueOf(attempt, tasks)], [], tasks, now);
}

/**
 * Gives the section of a line `X-ROUND` with its module, see {@link RoundLine}:
 * of today's form its first part after the module of its skill entry,
 * unless it names its module itself, of an older one its second part, which does.
 * - `fields`: The line cut at each `;`.
 *
 * @param value - Line `X-ROUND`, like `01_01_SampleMeanEstimator;1;done`
 * @param module - Module of its skill entry, like `IN2028`
 * @returns Section like `IN2028/01_01_SampleMeanEstimator`
 */
function roundSectionOf(value: string, module: string): string {
    const fields: string[] = value.split(";");
    if (tapTime.test(fields[0] ?? "")) return fields[1] ?? "";
    return (fields[0] ?? "").includes("/") ? fields[0] : `${module}/${fields[0] ?? ""}`;
}

/**
 * Gives a task of the section of each line `X-ROUND`,
 * so the skill entry names the chapter of the section and links its note.
 *
 * @param values - Lines `X-ROUND`
 * @param module - Module of their skill entry, like `IN2028`
 * @param tasks - All tasks
 * @returns Identities of tasks, one per line whose section has tasks
 */
function roundTasksOf(values: string[], module: string, tasks: Task[]): string[] {
    return values.flatMap((value: string): string[] => {
        const section: string = roundSectionOf(value, module);
        const task: Task | undefined = tasks.find(
            (candidate: Task): boolean =>
                `${candidate.id.split("/")[0]}/${candidate.section}` === section,
        );
        return task === undefined ? [] : [task.id];
    });
}

/**
 * Writes where I stand in the round of a section into the skill entry of the moment of its module,
 * as an attempt is written, see {@link attemptAdd} and {@link RoundLine}:
 * its line `X-ROUND` there, written anew in its place, its section without its module,
 * its round and the step I went on to, like
 * `01_01_SampleMeanEstimator;0;Example. Ice Cream Kiosk`, or `done` once I closed the round.
 * - `module`: Module of the section, the part of it before `/`.
 * - `name`: Name of the section, its note, the part after `/`.
 * - `step`: The step in one line.
 * - `value`: The line `X-ROUND`.
 *
 * @param line - Where I stand
 * @throws {Error} - When no task names its section,
 *   its round is no number from 0, or it names no step
 */
export function roundAdd(line: RoundNew): void {
    const tasks: Task[] = tasksRead();
    const [module, name]: (string | undefined)[] = line.section.split("/");
    if (
        !tasks.some(
            (task: Task): boolean => task.id.startsWith(`${module}/`) && task.section === name,
        )
    )
        throw new Error(`No section ${line.section}`);
    if (!Number.isInteger(line.round) || line.round < 0) throw new Error(`No round ${line.round}`);
    const step: string = line.step.replace(/\s+/g, " ").trim();
    if (step === "") throw new Error(`No step in ${line.section}`);
    const now: Date = new Date();
    const value: string = [name, String(line.round), step].join(";");
    momentWrite(module ?? "", momentOf(module ?? "", now), [], [value], tasks, now);
}

/**
 * Reads the session of a module running now, for the learning view: its skill entry of the moment,
 * see {@link momentOf}, of every type, a lecture as my own learning, into which its round writes,
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
 * every attempt at it up to now gets the new identity in its `X-ATTEMPT`,
 * one of today's form the new name, every other line stays as it is.
 * For the AI, not for a button; run in the folder of the dashboard like
 * `node -e 'import("./reader/skill.ts").then((skill) => console.log(skill.taskRename("IN2028/Old Name", "IN2028/New Name")))'`.
 * - `tasks`: Tasks of the modules of the semester.
 * - `renamed`: Number of attempts renamed so far.
 *
 * @param from - Identity the task had, like `IN2028/Airline Revenue Interval`
 * @param to - Its new identity, in the same form
 * @returns Number of attempts renamed
 * @throws {Error} - When a note still holds the old identity or none holds the new one,
 *   so the heading has to be renamed first
 */
export function taskRename(from: string, to: string): number {
    const tasks: Task[] = tasksRead();
    if (
        tasks.some((task: Task): boolean => task.id === from) ||
        !tasks.some((task: Task): boolean => task.id === to)
    )
        throw new Error(`Rename the heading in its note first: ${from} to ${to}`);

    let renamed: number = 0;
    skillEntriesRead("1970-01-01T00:00:00Z", new Date().toISOString()).forEach(
        (entry: Entry): void => {
            const values: string[] = entry.attempts.map((value: string): string => {
                const line: AttemptLine = attemptLineOf(value, entry.module);
                return line.task === from ? lineValueOf({ ...line, task: to }) : value;
            });
            const count: number = values.filter(
                (value: string, index: number): boolean => value !== entry.attempts[index],
            ).length;
            if (count === 0) return;
            const [file]: [string, Entry] = entryFind(skillLog, entry.id);
            propertiesPut(file, entry.id, [["x-attempt", values]]);
            renamed += count;
        },
    );
    return renamed;
}
