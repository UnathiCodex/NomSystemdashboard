/**
 * ## Course
 *
 * The course of a module in the semester of today, which the page of the module shows above its chapters, one card
 * per type, see `src/editor/course.ts`: its boxes of the plan of every type, its series and the groups of its
 * tutorials; the series of a box of the plan opens in the same form from the day, see `src/day/series.ts`, read
 * in the semester of that box.
 * A series is no rule in a file: the plan holds one box per lecture, see `boxes.ts`, and the series of a type is read
 * back from its boxes, every box of one numbered type of a module in its semester, see `numberedTypes` in `boxes.ts`,
 * numbered across every weekday they fall on, like IN0004's lectures on Mondays and on Tuesdays at their own times.
 * Its rule is the one most of its boxes follow, see {@link ruleOf}: its slots, each a weekday at least two of its boxes
 * fall on, with the time most of them have there, like `Mon 12:00–13:30` and `Tue 16:00–17:30`, the place and
 * the people most of them have, its first day and its last, like `Mon 14:00–16:00 · 19.10.2026–01.02.2027`, and its
 * extras, single dates besides its weeks, each with its own times, like a session on Sat, 14.11.2026, 10:00–12:00
 * or a repetition in March;
 * a box that differs from it stays as it is, like a lecture moved once to another room or another day of its week,
 * and a box pushed to a later day counts on the day it left, see {@link datedOf}. Extras are read back as well,
 * so no line of a file holds a rule.
 * Its weeks skip every day the university does not teach, see {@link lectureFreeOf}, like 28.12.2026 in the Christmas
 * break, which has no box and shows nowhere; every other day of its slots has its box, and one that does not take
 * place is a box the university cancelled, `X-NUMBER:NONE`, see `boxUniversity` in `boxes.ts`, never a day without
 * box.
 * The boxes of my tutorials that go to a group, by their `X-GROUP`, follow the rule of my group: my group is the one
 * I pinned, a choice of mine, never read from my boxes, `X-GROUP;X-PINNED=TRUE` on the to-dos of that group, see
 * {@link pinnedOf} and {@link pinPut}, and a box of another group is a week I go to that group instead, which never
 * moves the pin; taking my group back removes my open boxes from today on and the pin, see {@link groupMine}.
 * A box of my tutorials is numbered by its week of the semester, the n-th week its type's groups meet in, see
 * {@link tutorialWeeksOf}, so a second tutorial in a week takes the number of that week too, and a week the university
 * cancelled keeps its place.
 *
 * The groups of the tutorials of a module lie in its plan, `Modules/<module folder>_Plan.ics`, beside my boxes,
 * one weekly to-do per group as TUMonline lists it, see {@link groupPut}, since a plan holds only to-dos:
 * its first session as `DTSTART` in Berlin time, its length as `ESTIMATED-DURATION`, no `STATUS`, since it is
 * nothing I do, `RRULE:FREQ=WEEKLY;UNTIL=…` with the start of its last
 * session in UTC, as the standard wants it beside a time zone, one `EXDATE` per day the university does not teach
 * between them,
 * `CATEGORIES:Skill`, its `SUMMARY` as that of a box, like `IN2028_BusinessAnalyticsMachineLearning (TU)`,
 * its room as `LOCATION` with its link or what it does online as `X-ONLINE`, its tutor as `ATTENDEE` only once known,
 * `X-GROUP:03` and `X-SEMESTER:2026W`. A to-do with `X-GROUP` and without `X-NUMBER` is a group, never a box
 * of mine, see `groupIs` in `boxes.ts`, while a box of my tutorials that goes to a group has `X-GROUP`
 * and its `X-NUMBER`. A group meeting on two weekdays is one such to-do per weekday, each with its own times,
 * all of the same `X-GROUP`, read as one group, see {@link groupsRead}.
 * I make and change a group by hand in the form of a series, by its row `Group`, see {@link groupApply}: its days,
 * room, platform, tutors and weeks as typed, a date I mark cancelled one more `EXDATE`; my boxes that go to it
 * take its sessions anew, see {@link groupBoxesMove}.
 *
 * Three changes write the boxes of a series, week by week, see {@link draftsOf}, each leaving every box done,
 * cancelled by me or pushed where it is, since those are mine, see {@link changeable}, and each numbering the boxes
 * of the type anew by their places, see {@link numbersOf}:
 * - its rule changed in the form of the series, see {@link seriesApply}: each date of the rule takes the box of its
 *   week with what changed of its slot, a date without box gets one, and a box no date of its week takes goes,
 *   but only open boxes from today on, see {@link ahead}, so a day over stays as it was, but for the times I typed
 *   for its day, which every box takes but one pushed, see {@link retimable}, a box done keeping its log entry as it
 *   is; in the same form I skip a box or mark it cancelled by the university, a new one too, or take that back,
 *   see {@link stateSet}, all of it written as I save;
 * - a group made mine, see {@link groupMine}: from the week of its next session on, my boxes go to its sessions,
 *   also a week I went to another group, so the series follows the group from then on, every week alike;
 *   with no series yet, its sessions to come become one;
 * - one session of a group picked for its week in the menu of the groups, in the card of its type or in a box
 *   of the plan, see {@link weekPick}: the box of its week goes to it, its day, its time, its length, its place,
 *   its tutor and its group, its number kept, a week without box gets one, and with no series from that week on yet
 *   the sessions of the group from then on become one.
 * Logging a tutorial moves no other week. A week picked for another group carries no mark of it: a group made mine
 * moves it along with every other coming week.
 * The reader offers each as a route, see `reader.ts`, so Claude fills series and groups through the same code;
 * none of them shares anything with anyone, see `shared.ts`.
 *
 * A new box repeated weekly by the row `Repeat` of its dialog, in the dialog of a series, see `src/day/series.ts`,
 * has such a rule too, see {@link repeatApply}:
 * a skill box of a numbered type of a module becomes its series as the form of a new series makes it, numbered,
 * while its type has no box in the semester yet; any other box, like one of a project or my gym, one box per date,
 * each as the dialog adds one alone, see `boxesAdd` in `boxes.ts`.
 *
 * The exams of a module, single dates whose `X-NUMBER` is their kind, like `Endterm`, are no series: their form
 * gives each exam its kind and its times, see {@link examSet}.
 *
 * - `node:path`: Names the folder and the file of the plan of a module, which holds its groups.
 * - `./boxes.ts`: Reads the skill boxes with their states, finds a box, removes one, adds boxes and takes back one
 *   I skipped, names the numbered types, and tells a group from a box.
 * - `./calendar.ts`: Reads the groups and the holidays, writes boxes and groups, and calculates with days and times
 *   in Berlin time.
 * - `./categories.ts`: Gives the semester of a day and tells well-formed people.
 * - `./documents.ts`: Writes what a box or a group is, linking the folder of its material.
 * - `./notes.ts`: Lists the folders of my modules and of their material, and gives the code of a module.
 * - `./places.ts`: Gives the link of a place.
 * - `./sources.ts`: Names the plan of a module, also from `NomWorkspace` on, my log of skills and the calendars of the
 *   holidays.
 */

import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";
import { boxDelete, boxDrop, boxesAdd, boxFind, groupIs, numberedTypes, skillBoxesRead } from "./boxes.ts";
import {
    berlinDateOf, berlinDayStartOf, berlinInstantOf, berlinTimeOf, dayAdd, entriesRead, entryRemove,
    fileEntriesRead, groupPropertyOf, icsTextOf, propertiesPut, skillName, todoAppend, todoChange,
} from "./calendar.ts";
import { attendeesAllow, semesterOf, skillTypes } from "./categories.ts";
import { skillLinkOf, titleOf } from "./documents.ts";
import { codeOf, moduleFolderOf, moduleFoldersRead, semesterFoldersRead } from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { holidays, logEnding, planEnding, skillFileOf, skillLog, vaultPathOf } from "./sources.ts";

import type { Box, BoxNew, BoxState } from "./boxes.ts";
import type { Attendee, Entry, Online, Push, TodoFields } from "./calendar.ts";
import type { MaterialFolder } from "./notes.ts";


/**
 * A slot of a rule, one weekday of it with its time, see {@link Rule}.
 *
 * - `weekday`: Its weekday, from 1 for Monday to 7 for Sunday.
 * - `start`: Its time of start in Berlin time, like `14:00`; empty for boxes without time.
 * - `end`: Its time of end in Berlin time, like `16:00`, after its start; empty for boxes without time.
 * - `minutes`: Of a slot without times only how long its boxes last, like 480, as a plain series by its length,
 *   see `reader/rules.ts`; none for a slot with times.
 */
export type Slot = {
    weekday: number;
    start: string;
    end: string;
    minutes?: number;
};

/**
 * A single date of a rule outside its weeks, see {@link Rule}, like a session on a Saturday.
 *
 * - `day`: Its day, like `2026-11-14`.
 * - `start`, `end`: Its times in Berlin time, like `10:00` and `12:00`, as those of a slot.
 */
export type Extra = {
    day: string;
    start: string;
    end: string;
};

/**
 * The dates of the slots of a rule with times of their own, other than those of their slot, by their days,
 * like `2026-10-30` with `14:00` and `17:00` of a lecture once later than on its other Fridays, see {@link Rule}.
 */
export type Times = { [day: string]: Pick<Slot, "start" | "end"> };

/**
 * A weekly rule, of a series or of a group, see the top of this file: as read back from its boxes or its sessions,
 * see {@link ruleOf}, as the form of a series sends it, see {@link seriesApply}, or as a group is written,
 * see {@link groupPut}.
 *
 * - `type`: Type of its boxes, like `VO`.
 * - `slots`: Its weekdays with their times, by weekday, each weekday once; a group has one.
 * - `extras`: Its single dates besides its weeks, like a session on a Saturday, by their days; none for none,
 *   as for every group.
 * - `location`: Its place as an entry writes it, see `lineOf` in `places.ts`, like
 *   `5416.01.003 (Hörsaal 2 "Interims II"), Lichtenbergstraße 2b, 85748, Garching bei München, Deutschland`,
 *   empty for none.
 * - `locationLink`: Link of its place, like `https://nav.tum.de/room/5416.01.003`, the place keeping the link it has
 *   or taking that of `Places.md` or `Rooms.md`, see `placeLinkOf` in `places.ts`.
 * - `online`, `onlineLink`, `passcode`: What its boxes do online, like the stream of a lecture on `TUM-Live`
 *   with its link, see `Online` in `calendar.ts`.
 * - `attendees`: Who I am with, like a tutor, see `Attendee` in `calendar.ts`; none for nobody.
 * - `first`: The first day of its weeks, like `2026-10-19`; an extra may lie before it.
 * - `last`: The last day of its weeks, like `2027-02-01`, on or after its first; an extra may lie after it.
 * - `times`: The dates of its slots with times of their own, see {@link Times}; none for none, and left out
 *   as a group is written.
 * - `group`: The group its boxes go to, like `03`: of a group its own, of my tutorials my group, see {@link pinnedOf};
 *   empty for none.
 * - `semester`: Its semester, like `2026W`.
 */
export type Rule = Online & {
    type: string;
    slots: Slot[];
    extras: Extra[];
    location: string;
    locationLink: string;
    attendees: Attendee[];
    first: string;
    last: string;
    times?: Times;
    group: string;
    semester: string;
};

/**
 * A series of the course, see the top of this file.
 *
 * - `rule`: Its rule, read back from its boxes, see {@link ruleOf}.
 * - `count`: How many boxes it has, of every state.
 */
export type Series = {
    rule: Rule;
    count: number;
};

/**
 * A session of a group, as the page shows it.
 *
 * - `start`: Its start as ISO instant, like `2026-10-27T09:00:00.000Z`, of a group without times its day,
 *   like `2026-10-27`.
 * - `minutes`: Its length in minutes, like 120.
 */
export type Session = {
    start: string;
    minutes: number;
};

/**
 * A group of the tutorials of a module, see the top of this file, as the page shows it.
 *
 * - `ids`: The identifiers of its to-dos in the plan of its module, their `UID`s, one per weekday it meets on.
 * - `rule`: Its rule, read back from its sessions, see {@link ruleOf}: its type, its slots, mostly one, its room,
 *   its tutor, its first and last day, its group, like `03`, and its semester.
 * - `sessions`: Its sessions, the earliest first.
 * - `pinned`: Whether it is the group I pinned, see {@link pinnedOf}.
 */
export type Group = {
    ids: string[];
    rule: Rule;
    sessions: Session[];
    pinned: boolean;
};

/**
 * The course of a module in the semester of today, see the top of this file, as the page shows it.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `semester`: The semester, like `2026W`.
 * - `boxes`: Its skill boxes of the semester, of every type, each with its state, see `Box` in `boxes.ts`,
 *   the earliest first.
 * - `series`: Its series, one per numbered type with boxes, see {@link seriesListOf}.
 * - `groups`: Its groups of the semester, by type and group.
 * - `folders`: The folder of the material of the semester of each type, from the module folder,
 *   like `VO_UniversityLectureLessons/TUM_2026W` for `VO`, also one not there yet, which a click on it makes,
 *   see `semesterFoldersRead` in `notes.ts`.
 * - `links`: The folder a box of each type links in the semester, its `ALTREP`, as the reader writes it now,
 *   see `skillLinkOf` in `documents.ts`, like `NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons/TUM_2026W`
 *   for `VO`, which the dialog of a series shows below its summary, see `src/day/series.ts`.
 * - `learned`: My own learning of the module in the semester logged without a box of the plan, its skill entries
 *   of the log without type, see {@link learnedRead}, the earliest first; what I learned from a box shows as that box,
 *   among `boxes`, without type.
 * - `file`: Its plan from `NomWorkspace` on, see `vaultPathOf` in `sources.ts`,
 *   like `NomManageplannings/NomManagecalendar/Modules/IN2028_BusinessAnalyticsMachineLearning_Plan.ics`.
 */
export type Course = {
    module: string;
    semester: string;
    boxes: Box[];
    learned: Learned[];
    series: Series[];
    groups: Group[];
    folders: { [type: string]: MaterialFolder };
    links: { [type: string]: string };
    file: string;
};

/**
 * A session of my own learning of a module, a skill entry of the log without type and without the box it was logged
 * from, as the card `Learning` of the page of the module lists it, see `src/editor/course.ts`.
 *
 * - `id`: Identifier of the log entry.
 * - `day`: Its day, like `2026-10-21`.
 * - `time`: Its start as ISO instant.
 * - `minutes`: How long it lasted, in minutes.
 * - `note`: Its note, empty for none.
 */
export type Learned = Online & Pick<Entry, "location" | "locationLink" | "attendees"> & {
    id: string;
    day: string;
    time: string;
    minutes: number;
    note: string;
};

/**
 * A change of a series, as the form of a series sends it, see {@link seriesApply}.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `rule`: The rule as typed, its slots in the order of the form.
 * - `old`: The rule as read back when the form opened, `null` for a new series.
 * - `before`: For each slot of the rule, the weekday of the slot of `old` whose boxes it takes, like 1 for a slot
 *   moved from Monday to Tuesday, 0 for a slot added; left out, each slot takes those of the slot of its own weekday.
 * - `states`: The state I gave a box of the series in the form, by its identifier, a new one by its day, like
 *   `2026-12-03`: `open`, `dropped`, skipped by me, or `university`, cancelled by the university, see `BoxState`
 *   in `boxes.ts`, a new one only cancelled, see {@link seriesApply}; left out for none.
 * - `dry`: Whether only to tell what the change would make, for the preview of the form, writing nothing.
 */
export type SeriesChange = {
    module: string;
    rule: Rule;
    old: Rule | null;
    before?: number[];
    states?: { [id: string]: BoxState };
    dry: boolean;
};

/**
 * A group made mine, as the page sends it, see {@link groupMine}.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `type`: Type of the group, like `TU`.
 * - `group`: The group, like `03`, empty to have none.
 * - `dry`: Whether only to tell what that would make, for the preview of the form, writing nothing; false when left
 *   out.
 */
export type MineChange = {
    module: string;
    type: string;
    group: string;
    dry?: boolean;
};

/**
 * One session of a group picked for its week, as the menu of the groups sends it, see {@link weekPick}.
 *
 * - `module`: Name of the folder of the module, like `IN0009_BetriebssystemeSystemsoftware`.
 * - `type`: Type of the group, like `TU`.
 * - `group`: The group, like `03`.
 * - `start`: The start of the session as ISO instant, like `2026-11-05T15:00:00.000Z`.
 * - `extra`: Whether the session becomes a box of its own besides the box of its week, as a second tutorial
 *   in one week, from the list of the sessions of its group; false when left out.
 */
export type PickChange = {
    module: string;
    type: string;
    group: string;
    start: string;
    extra?: boolean;
};

/**
 * A group to write, see {@link groupPut}.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `rule`: Its rule, with its one slot and its group, like `03`.
 */
export type GroupNew = {
    module: string;
    rule: Rule;
};

/**
 * A group as the form of a series makes or changes it, see {@link groupApply}.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `rule`: Its rule as typed: its type, its group, like `05`, its slots, one or more, its place, what it does online,
 *   its tutors, its first and last day and its semester; no extras and no times of its own, since a group meets
 *   weekly.
 * - `made`: Whether it is a new group, so none of its type, group and semester may be there yet; else it changes
 *   the one there.
 * - `was`: The name of the group there before I renamed it, like `Mo-0800-1`, its name everywhere taking that of the
 *   rule, see {@link groupRename}; left out, or the same, for a group not renamed.
 * - `states`: The dates of its slots I marked cancelled, `university`, or open again, `open`, by their days, like
 *   `2026-11-10`; left out for none.
 * - `dry`: Whether only to tell what it would make, for the preview of the form, writing nothing.
 */
export type GroupChange = {
    module: string;
    rule: Rule;
    made: boolean;
    was?: string;
    states?: { [day: string]: BoxState };
    dry: boolean;
};

/**
 * A group to remove, see {@link groupRemove}.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `type`: Its type, like `TU`.
 * - `group`: The group, like `03`.
 * - `semester`: Its semester, like `2026W`.
 */
export type GroupGone = {
    module: string;
    type: string;
    group: string;
    semester: string;
};

/**
 * A new box repeated weekly, as the dialog of a series sends it for a box repeated by the row `Repeat` of its dialog,
 * see {@link repeatApply}.
 *
 * - `box`: The box as the dialog sends one made once, see `BoxNew` in `boxes.ts`, without its day, time, length
 *   and deadline, which each date sets.
 * - `slots`: Its weekdays with their times, in the order of the dialog.
 * - `extras`: Its single dates besides its weeks, see {@link Extra}.
 * - `first`, `last`: Its first and last day, like `2026-10-19`.
 * - `times`: The dates of its slots with times of their own, see {@link Times}; left out for none.
 * - `states`: The states I gave its boxes, as those of a series, see `states` of {@link SeriesChange}, each new,
 *   so by its day; left out for none.
 * - `dry`: Whether only to tell what it would make, for the preview of the dialog, writing nothing.
 */
export type RepeatChange = {
    box: Omit<BoxNew, "day" | "time" | "minutes" | "deadline">;
    slots: Slot[];
    extras: Extra[];
    first: string;
    last: string;
    times?: Times;
    states?: { [day: string]: BoxState };
    dry: boolean;
};

/**
 * An exam of a module as the form of its exams changes it, see {@link examSet}.
 *
 * - `box`: Identifier of the exam.
 * - `kind`: Its kind, one of {@link examKinds}, as its `X-NUMBER`.
 * - `start`, `end`: Its times in Berlin time, like `17:00` and `18:30`; both empty to keep its times.
 */
export type ExamChange = {
    box: string;
    kind: string;
    start: string;
    end: string;
};

/**
 * A box of a series after a change, see {@link seriesApply}, for the preview of the form.
 *
 * - `id`: Its identifier, empty for a new one.
 * - `day`: Its day after the change, like `2026-10-26`.
 * - `time`: Its time after the change as ISO instant, empty for none.
 * - `minutes`: Its length after the change in minutes, `null` for none.
 * - `number`: Its number after the change, like `2`, `NONE` for one the university cancelled, empty for none.
 * - `state`: Its state, as the change gives it, see `BoxState` in `boxes.ts`, `new` for a new one, `university`
 *   for a new one I cancelled.
 * - `pushed`: Whether I pushed it to a later day, so it stands no more on its own day, see `Push` in `calendar.ts`.
 * - `editable`: Whether I may skip it or mark it cancelled by the university: a to-do of the new system, no date
 *   of a series of the file, not done; a new one too.
 * - `retimable`: Whether it takes the times typed for its day in the form, see {@link retimable}; a new one too.
 * - `change`: `new`, `changed`, its day, time, place, what it does online or its people, `renumbered`, only its number,
 *   its group, or `removed`; empty for one that stays as it is, or whose state alone changes.
 * - `attendees`: Who I am with after the change, like a tutor or the lecturers; none for nobody.
 * - `chained`: Of a plain series, whether it is a day of another series of its chain, like the one it went on from,
 *   only shown, see `plannedOf` in `rules.ts`; false when left out.
 */
export type Planned = {
    id: string;
    day: string;
    time: string;
    minutes: number | null;
    number: string;
    state: BoxState | "new";
    pushed: boolean;
    editable: boolean;
    retimable: boolean;
    change: "new" | "changed" | "renumbered" | "removed" | "";
    attendees: Attendee[];
    chained?: boolean;
};

/**
 * What a rule is read back from, see {@link ruleOf}: a box at its place in its series, see {@link datedOf},
 * or a session of a group; its day, its time as ISO instant, empty for none, its length in minutes, `null` for none,
 * its place with its link, what it does online and who I am with; a box of my tutorials also its group, its
 * `X-GROUP`, see {@link ruleOf}.
 */
type Dated = Pick<Box, "day" | "time" | "minutes" | "location" | "locationLink" | "attendees"> & Online
    & { group?: string };

/**
 * A date of a rule, see {@link datesOf}: its day, its times, like `14:00` and `16:00`, as those of its slot or its
 * extra, of a slot without times its length, and the place of its slot in the rule, -1 for an extra.
 */
type RuleDate = Extra & {
    slot: number;
    minutes?: number;
};

/**
 * What of a box a change of a series sets, see {@link draftSet}: its day, its time with its length, its place
 * with its link, what it does online, its people and its group.
 */
type Field = "day" | "time" | "location" | "online" | "attendees" | "group";

/**
 * A date of a series after a change, see {@link draftsOf}.
 *
 * - `day`: Its day, like `2026-10-26`.
 * - `start`: Its time of start in Berlin time, like `14:00`, empty for none.
 * - `minutes`: Its length in minutes, `null` for none.
 * - `location`, `locationLink`: Its place with its link.
 * - `online`, `onlineLink`, `passcode`: What it does online.
 * - `attendees`: Who I am with.
 * - `group`: The group it goes to, like `03`, empty for none.
 * - `before`: The weekday the box it takes fell on before the change, 1 for Monday to 7 for Sunday: that of its slot
 *   as the form opened, like 1 for a slot moved from Monday to Tuesday, else its own.
 * - `fields`: What of the box it takes changes, see {@link Field}.
 * - `made`: Whether it gets a new box while no box of its week is there to take, see {@link draftsOf}.
 * - `added`: Whether it is a date of a slot or an extra added in the form, which takes only a box of its own weekday,
 *   never one of another day of its week, so a Thursday added never takes the box of a Monday taken out.
 * - `retimed`: Whether I typed its times anew for its day in the form, as times of its own, those of its slot again
 *   or those of its extra, which a box a change may not change otherwise takes too, see {@link retimable}.
 */
type Target = Online & {
    day: string;
    start: string;
    minutes: number | null;
    location: string;
    locationLink: string;
    attendees: Attendee[];
    group: string;
    before: number;
    fields: Field[];
    made: boolean;
    added: boolean;
    retimed: boolean;
};

/**
 * A box of a type as a change of a series plans it, see {@link draftsOf}, before anything is written.
 *
 * - `box`: The box as it stands, `null` for a new one.
 * - `day`, `time`, `minutes`, `location`, `locationLink`, `online`, `onlineLink`, `passcode`, `attendees`, `group`,
 *   `number`: As those of a box after the change, see `Box` in `boxes.ts`.
 * - `removed`: Whether the change removes it.
 */
type Draft = Online & {
    box: Box | null;
    day: string;
    time: string;
    minutes: number | null;
    location: string;
    locationLink: string;
    attendees: Attendee[];
    group: string;
    number: string;
    removed: boolean;
};

/**
 * Everything of a box a group made mine, a week moved to a group, a session picked, a group followed or a new slot
 * sets, see {@link draftSet}.
 */
const allFields: Field[] = ["day", "time", "location", "online", "attendees", "group"];

/**
 * Most weeks a rule may span, about a year, so a slip of a year typed makes no hundreds of boxes.
 */
const ruleWeeks: number = 53;

/**
 * A week in milliseconds.
 */
const weekLength: number = 7 * 24 * 60 * 60 * 1000;

/**
 * Type of the exams of a module, single dates whose `X-NUMBER` is their kind, see {@link examSet}.
 */
const examType: string = "FA";

/**
 * The kinds of an exam, its `X-NUMBER`, in the order they come in a semester.
 */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/**
 * Regions whose holidays the university keeps, as the bracket at the end of a holiday names them, see
 * {@link lectureFreeOf}: Germany, `DE`, and Bavaria, where TUM lies, `BY`.
 */
const universityRegions: string[] = ["DE", "BY"];

/**
 * Dates of the semester, `CATEGORIES:University`, the university does not teach on, see {@link lectureFreeOf}, as
 * `Termine und Feiertage` of TUM names them beside the holidays, see `Tum_TermineFristen` in my university records:
 * the times without lectures, its breaks, and the Dies Academicus.
 */
const lectureFreeTitles: string[] = [
    "Vorlesungsfreie Zeit (TUM)", "Weihnachtsferien (TUM)", "Osterferien (TUM)", "Pfingstferien (TUM)",
    "Dies Academicus (TUM)",
];


/**
 * Gives the weekday of a day.
 *
 * @param day - Day like `2026-10-19`
 * @returns 1 for Monday to 7 for Sunday, like 1
 */
function weekdayOf(day: string): number {
    return (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7 + 1;
}

/**
 * Gives the Monday of the week of a day, which names its week.
 *
 * @param day - Day like `2026-10-22`
 * @returns Day like `2026-10-19`
 */
function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/**
 * Reads a time of day as minutes after midnight.
 * - `hours`, `minutes`: Its hours and minutes.
 *
 * @param time - Time like `14:15`
 * @returns Minutes like 855
 */
function minutesOf(time: string): number {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Gives the instant of a time of a day in Berlin time.
 * - `hours`, `minutes`: Hours and minutes of the time.
 *
 * @param day - Day like `2026-10-19`
 * @param time - Time like `14:15`
 * @returns The instant
 */
function instantOf(day: string, time: string): Date {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return berlinInstantOf(day, hours, minutes);
}

/**
 * Gives the first day of a semester, from which its course is read for a year, so a retake after its end belongs
 * to it, like the retake of a winter in April.
 *
 * @param semester - Semester, like `2026W`
 * @returns Day like `2026-10-01`, or `2027-04-01` for `2027S`
 */
function semesterBeginOf(semester: string): string {
    return `${semester.slice(0, 4)}-${semester.endsWith("W") ? "10" : "04"}-01`;
}

/**
 * Gives of a list the value whose key most of them have, the earliest of those equally many.
 * - `counts`: How many of them have each key.
 *
 * @param values - Values, in their order
 * @param keyOf - Gives the key of a value, like its place
 * @returns The value, `undefined` for none
 */
function modeOf<T>(values: T[], keyOf: (value: T) => string): T | undefined {
    const counts: Map<string, number> = new Map();
    values.forEach((value: T): void => {
        counts.set(keyOf(value), (counts.get(keyOf(value)) ?? 0) + 1);
    });
    return values.reduce((best: T | undefined, value: T): T | undefined => best === undefined
        || (counts.get(keyOf(value)) ?? 0) > (counts.get(keyOf(best)) ?? 0) ? value : best, undefined);
}

/**
 * Gives a box at its place in its series, see the top of this file: where it stood before its first push,
 * see `Push` in `calendar.ts`, else where it stands, so a lecture pushed to the next day counts on its own day.
 * - `left`: Where it stood before its first push, `undefined` for a box never pushed.
 *
 * @param box - The box
 * @returns The box at its place in its series
 */
function datedOf(box: Box): Dated {
    const left: Push | undefined = box.pushed[0];
    return left === undefined ? box : { ...box, day: left.day, time: left.time, minutes: left.minutes ?? box.minutes };
}

/**
 * Gives the week of a box in its series, by its Monday, see {@link datedOf}.
 *
 * @param box - The box
 * @returns Day like `2026-10-19`
 */
function weekOf(box: Box): string {
    return mondayOf(datedOf(box).day);
}

/**
 * Takes out of the boxes of a week the first that falls on a weekday, else, with `any`, the earliest of them,
 * see {@link draftsOf} and {@link ruleOf}.
 * - `found`: Its place among them, -1 for none.
 *
 * @param boxes - The boxes of a week still free, the earliest first; the one taken goes out of them
 * @param weekday - The weekday, 1 for Monday to 7 for Sunday
 * @param any - Whether to take the earliest when none falls on the weekday
 * @param dayOf - Gives the day of a box at its place in its series, like `2026-10-19`
 * @returns The box, `undefined` for none
 */
function weekTake<T>(boxes: T[], weekday: number, any: boolean, dayOf: (box: T) => string): T | undefined {
    let found: number = boxes.findIndex((box: T): boolean => weekdayOf(dayOf(box)) === weekday);
    if (found === -1 && any && boxes.length > 0)
        found = 0;
    return found === -1 ? undefined : boxes.splice(found, 1)[0];
}

/**
 * Gives the times of what a rule is read back from, as a slot or an extra has them, see {@link Slot}.
 *
 * @param item - A box or a session
 * @returns Its start and its end in Berlin time, like `14:00` and `16:00`, both empty without time
 */
function timesOf(item: Dated): [string, string] {
    return item.time === "" ? ["", ""] : [berlinTimeOf(new Date(item.time)),
        berlinTimeOf(new Date(Date.parse(item.time) + (item.minutes ?? 0) * 60 * 1000))];
}

/**
 * Gives the days the university does not teach from one day to another, which a series of my course skips, see the top
 * of this file: every day of a holiday, `CATEGORIES:Holiday`, of `Holidays.ics`, see `holidays` in `sources.ts`,
 * whose regions, the codes in the bracket at the end of its `SUMMARY`, name one of {@link universityRegions},
 * like `Heilige Drei Könige (AT, BY)`, and every day of a date of the semester, `CATEGORIES:University`,
 * of `University.ics`, of {@link lectureFreeTitles}, like `Weihnachtsferien (TUM)` or `Dies Academicus (TUM)`; never
 * a holiday only of Austria, like `Nationalfeiertag (AT)`, nor another date of the semester, like
 * `Vorlesungsbeginn 2026W`.
 * - `regionsOf`: Gives the regions of a `SUMMARY`, parted by commas, none without a bracket at its end.
 * - `skipped`: The days so far.
 *
 * @param first - First day, like `2026-10-19`
 * @param last - Last day, like `2027-02-05`
 * @returns The days, like `2026-12-24`
 */
function lectureFreeOf(first: string, last: string): Set<string> {
    const regionsOf: (title: string) => string[] = (title: string): string[] =>
        /\(([^()]*)\)$/.exec(title)?.[1].split(",").map((code: string): string => code.trim()) ?? [];
    const skipped: Set<string> = new Set();
    entriesRead(holidays, berlinDayStartOf(first), berlinDayStartOf(dayAdd(last, 1)))
        .filter((entry: Entry): boolean => entry.allDay && (entry.category === "Holiday"
            && regionsOf(entry.title).some((code: string): boolean => universityRegions.includes(code))
            || entry.category === "University" && lectureFreeTitles.includes(entry.title)))
        .forEach((entry: Entry): void => {
            for (let day: string = entry.start; day < entry.end; day = dayAdd(day, 1))
                skipped.add(day);
        });
    return skipped;
}

/**
 * Reads back the weekly rule of a series or a group, see the top of this file: its slots, each weekday at least two
 * of what it follows fall on, else the one most of them fall on, with the time and length most of them have there;
 * the place, what they do online and the people most of them have, the earliest of those equally many; its weeks,
 * from the first box on the weekday of a slot to the last, the days the university does not teach skipped,
 * see {@link lectureFreeOf}, a box on another day of a week taking the place of a missing one, like a lecture moved
 * once from Monday to Tuesday; the times of a box on the day of a slot other than those of its slot, as times of its
 * own, see {@link Times};
 * and every other box as an extra, one more in a week, like a session on a Saturday, or one outside its weeks,
 * like a repetition in March, or one on a day the university does not teach.
 * - `counts`: How many of what it follows fall on each weekday.
 * - `weekdays`: The weekdays of its slots, in order.
 * - `timed`: Of a slot the one whose time and length most of it have, `undefined` while none has a time.
 * - `placed`: The one whose place most of them have.
 * - `met`: The one whose platform, link and passcode online most of them have.
 * - `people`: The one whose people most of them have.
 * - `sorted`: All, by their days.
 * - `onSlots`: The days of those on the weekday of a slot, in order, else of all.
 * - `grouped`: The first box of a week at a group, `undefined` for none: a week I went to another group stays a week
 *   of the series, never an extra, also before the first week on a slot, like `TU 1` at group 05 on a Thursday
 *   while my group meets on Tuesdays, so its weeks begin with the week of that box.
 * - `from`, `to`: The first and the last of them, `from` the Monday of that box where it lies before.
 * - `skipped`: The days the university does not teach from the first to the last.
 * - `days`: The days of its weeks, those on a slot and those taking the place of a missing one.
 * - `extras`: The extras, those outside its weeks first.
 * - `times`: The days of its slots whose box has times of its own.
 * - `free`: The boxes of a week no day of a slot took yet, by their days.
 * - `missing`: The days of the slots of a week without a box on their weekday.
 * - `taken`: The box on the weekday of a slot of a week, `undefined` for none.
 *
 * @param type - Type of the series, like `VO`
 * @param items - What the rule follows: the boxes of a series, of my tutorials those of my group, or the sessions
 *   of a group; at least one
 * @param all - What its days come from: every box of the series, also of a week at another group
 * @param group - Its group, like `03`, empty for none
 * @param semester - Its semester, like `2026W`
 * @returns The rule
 */
function ruleOf(type: string, items: Dated[], all: Dated[], group: string, semester: string): Rule {
    const counts: Map<number, number> = new Map();
    items.forEach((item: Dated): void => {
        counts.set(weekdayOf(item.day), (counts.get(weekdayOf(item.day)) ?? 0) + 1);
    });
    let weekdays: number[] = [...counts.keys()].filter((weekday: number): boolean => (counts.get(weekday) ?? 0) >= 2)
        .sort();
    if (weekdays.length === 0)
        weekdays = [weekdayOf(modeOf(items, (item: Dated): string => String(weekdayOf(item.day)))?.day ?? all[0].day)];
    const slots: Slot[] = weekdays.map((weekday: number): Slot => {
        const timed: Dated | undefined = modeOf(items.filter((item: Dated): boolean => item.time !== ""
            && weekdayOf(item.day) === weekday),
        (item: Dated): string => `${berlinTimeOf(new Date(item.time))} ${item.minutes}`);
        const [start, end]: [string, string] = timed === undefined ? ["", ""] : timesOf(timed);
        const long: Dated | undefined = timed !== undefined ? undefined : modeOf(items.filter((item: Dated): boolean =>
            item.time === "" && (item.minutes ?? 0) > 0 && weekdayOf(item.day) === weekday),
        (item: Dated): string => String(item.minutes));
        return long === undefined ? { weekday: weekday, start: start, end: end }
            : { weekday: weekday, start: "", end: "", minutes: long.minutes ?? 0 };
    });
    const placed: Dated | undefined = modeOf(items, (item: Dated): string => item.location);
    const met: Dated | undefined = modeOf(items, (item: Dated): string =>
        JSON.stringify([item.online, item.onlineLink, item.passcode]));
    const people: Dated | undefined = modeOf(items, (item: Dated): string => JSON.stringify(item.attendees));
    const sorted: Dated[] = [...all].sort((first: Dated, second: Dated): number =>
        (first.time || first.day).localeCompare(second.time || second.day));
    let onSlots: string[] = sorted.map((item: Dated): string => item.day)
        .filter((day: string): boolean => weekdays.includes(weekdayOf(day)));
    if (onSlots.length === 0)
        onSlots = sorted.map((item: Dated): string => item.day);
    const grouped: Dated | undefined = sorted.find((item: Dated): boolean => (item.group ?? "") !== "");
    const from: string = grouped !== undefined && mondayOf(grouped.day) < mondayOf(onSlots[0])
        ? mondayOf(grouped.day) : onSlots[0];
    const to: string = onSlots[onSlots.length - 1];
    const skipped: Set<string> = lectureFreeOf(from, to);
    const days: string[] = [];
    const extras: Dated[] = sorted.filter((item: Dated): boolean =>
        mondayOf(item.day) < mondayOf(from) || mondayOf(item.day) > mondayOf(to));
    const times: Times = {};
    for (let week: string = mondayOf(from); week <= to; week = dayAdd(week, 7)) {
        const free: Dated[] = sorted.filter((item: Dated): boolean => mondayOf(item.day) === week);
        const missing: string[] = [];
        slots.forEach((slot: Slot): void => {
            const day: string = dayAdd(week, slot.weekday - 1);
            if (day < from || day > to || skipped.has(day))
                return;
            const taken: Dated | undefined = weekTake(free, slot.weekday, false, (item: Dated): string => item.day);
            const [start, end]: [string, string] = taken === undefined ? ["", ""] : timesOf(taken);
            if (taken === undefined)
                missing.push(day);
            else
                days.push(taken.day);
            if (start !== "" && (start !== slot.start || end !== slot.end))
                times[day] = { start: start, end: end };
        });
        days.push(...free.slice(0, missing.length).map((item: Dated): string => item.day));
        extras.push(...free.slice(missing.length));
    }
    days.sort();
    return {
        type: type,
        slots: slots,
        extras: extras.map((item: Dated): Extra => {
            const [start, end]: [string, string] = timesOf(item);
            return { day: item.day, start: start, end: end };
        }).sort((first: Extra, second: Extra): number => first.day.localeCompare(second.day)),
        location: placed?.location ?? "",
        locationLink: placed?.locationLink ?? "",
        online: met?.online ?? "",
        onlineLink: met?.onlineLink ?? "",
        passcode: met?.passcode ?? "",
        attendees: people?.attendees ?? [],
        first: days[0] ?? from,
        last: days[days.length - 1] ?? to,
        times: times,
        group: group,
        semester: semester,
    };
}

/**
 * Gives the dates of a rule, see the top of this file: the day of each of its slots in each week from its first day
 * to its last, but, for a rule of the university, of a numbered type, see `numberedTypes` in `boxes.ts`, the days
 * it does not teach, see {@link lectureFreeOf}, and its extras, each with its times, those of its slot or its own,
 * see {@link Times}, and the place of its slot in the rule.
 * - `skipped`: The days the university does not teach, none for a rule of another type, like that of my gym.
 * - `dates`: The dates so far.
 * - `day`: The day of a slot of a week.
 * - `own`: Its times, those of its slot or its own.
 *
 * @param rule - The rule
 * @returns Dates, by their days
 */
function datesOf(rule: Rule): RuleDate[] {
    const skipped: Set<string> = numberedTypes.includes(rule.type) ? lectureFreeOf(rule.first, rule.last) : new Set();
    const dates: RuleDate[] = rule.extras.map((extra: Extra): RuleDate => ({ ...extra, slot: -1 }));
    for (let week: string = mondayOf(rule.first); week <= rule.last; week = dayAdd(week, 7))
        rule.slots.forEach((slot: Slot, index: number): void => {
            const day: string = dayAdd(week, slot.weekday - 1);
            const own: Pick<Slot, "start" | "end"> = rule.times?.[day] ?? slot;
            if (rule.first <= day && day <= rule.last && !skipped.has(day))
                dates.push({ day: day, start: own.start, end: own.end, slot: index, minutes: slot.minutes });
        });
    return dates.sort((first: RuleDate, second: RuleDate): number =>
        first.day.localeCompare(second.day) || first.start.localeCompare(second.start));
}

/**
 * Gives my group of a type, see the top of this file: the group I pinned, its `X-PINNED=TRUE`, see {@link pinPut};
 * empty while none is.
 *
 * @param groups - The groups of the course
 * @param type - The type, like `TU`
 * @returns The group, like `03`, empty for none
 */
function pinnedOf(groups: Group[], type: string): string {
    return groups.find((group: Group): boolean => group.rule.type === type && group.pinned)?.rule.group ?? "";
}

/**
 * Pins a group of a type, see the top of this file: `X-PINNED=TRUE` on the `X-GROUP` of each to-do of it, none on
 * those of every other group of the type and semester; no group named pins none. Writes only a to-do that changes.
 * - `file`: The plan of the module.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param type - The type, like `TU`
 * @param semester - The semester, like `2026W`
 * @param group - The group, like `06`, empty for none
 * @throws {Error} - When the plan cannot be written
 */
function pinPut(module: string, type: string, semester: string, group: string): void {
    const file: string = skillFileOf(module, planEnding);
    groupsRead(module, semester).filter((one: Group): boolean => one.rule.type === type
        && one.pinned !== (one.rule.group === group))
        .forEach((one: Group): void => one.ids.forEach((id: string): void =>
            propertiesPut(file, id, [["x-group", [groupPropertyOf(one.rule.group, one.rule.group === group)]]])));
}

/**
 * Gives the weeks of a type with groups, see the top of this file, by their Mondays: every week from the first session
 * of its groups to the last that is not wholly free of lectures, see {@link lectureFreeOf}, so a week the university
 * cancelled one session of keeps its place; none for a type without groups.
 * - `starts`: The days of the sessions of its groups, the earliest first.
 * - `free`: The days the university does not teach between them.
 * - `weeks`: The weeks.
 *
 * @param groups - The groups of the course
 * @param type - The type, like `TU`
 * @returns The Mondays of its weeks, the earliest first
 */
function tutorialWeeksOf(groups: Group[], type: string): string[] {
    const starts: string[] = groups.filter((group: Group): boolean => group.rule.type === type)
        .flatMap((group: Group): string[] => group.sessions
            .map((session: Session): string => dayOfStart(session.start))).sort();
    if (starts.length === 0)
        return [];
    const last: string = mondayOf(starts[starts.length - 1]);
    const free: Set<string> = lectureFreeOf(mondayOf(starts[0]), dayAdd(last, 4));
    const weeks: string[] = [];
    for (let week: string = mondayOf(starts[0]); week <= last; week = dayAdd(week, 7))
        if ([0, 1, 2, 3, 4].some((day: number): boolean => !free.has(dayAdd(week, day))))
            weeks.push(week);
    return weeks;
}

/**
 * Stops a module folder of none of my modules, which no course reads or writes.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @throws {Error} - When `NomSkillingmodules` holds no such module folder
 */
function folderCheck(module: string): void {
    if (!moduleFoldersRead().includes(module))
        throw new Error(`No module folder ${module}`);
}

/**
 * Reads the skill boxes of a module of a semester, see `skillBoxesRead` in `boxes.ts`: those of its semester,
 * a box without one by the semester of its day, read up to a year after the semester begins, so a retake after its end
 * is among them; the earliest first.
 *
 * @param code - Code of the module, like `IN2028`
 * @param semester - Semester, like `2026W`
 * @returns Its boxes
 */
function courseBoxesRead(code: string, semester: string): Box[] {
    return skillBoxesRead(dayAdd(semesterBeginOf(semester), 366))
        .filter((box: Box): boolean => box.module === code
            && (box.semester === "" ? semesterOf(box.day) : box.semester) === semester)
        .sort((first: Box, second: Box): number => (first.time || first.day).localeCompare(second.time || second.day));
}

/**
 * Reads my own learning of a module in a semester logged without a box, see {@link Learned}: the skill entries of the log
 * of the module without type and without the box they were logged from, of the semester they state, or of their day,
 * read up to a year after the semester begins, the earliest first; a whole-day entry counts not.
 * - `begin`: The first day of the semester.
 *
 * @param code - Code of the module, like `IN2028`
 * @param semester - The semester, like `2026W`
 * @returns The sessions
 */
function learnedRead(code: string, semester: string): Learned[] {
    const begin: string = semesterBeginOf(semester);
    return entriesRead(skillLog, berlinDayStartOf(begin), berlinDayStartOf(dayAdd(begin, 366)))
        .filter((entry: Entry): boolean => entry.category === skillName && entry.module === code && entry.type === ""
            && entry.planned === "" && !entry.allDay
            && (entry.semester === "" ? semesterOf(berlinDateOf(new Date(entry.start))) : entry.semester) === semester)
        .map((entry: Entry): Learned => ({
            id: entry.id, day: berlinDateOf(new Date(entry.start)), time: entry.start,
            minutes: Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000)),
            location: entry.location, locationLink: entry.locationLink, online: entry.online,
            onlineLink: entry.onlineLink, passcode: entry.passcode, attendees: entry.attendees, note: entry.note,
        }))
        .sort((first: Learned, second: Learned): number => first.time.localeCompare(second.time));
}

/**
 * Reads the groups of a module of a semester from its plan, its to-dos with `X-GROUP`, see the top of this file, each
 * with its sessions, read up to a year after the semester begins, and its rule read back from them, see {@link ruleOf};
 * the to-dos of one type and group, like one per weekday of a group meeting twice a week, as one group; none while
 * the plan is missing.
 * - `file`: The plan of the module.
 * - `begin`: The first day of the semester.
 * - `sessions`: The sessions of every group of the semester, each an entry, see `Entry` in `calendar.ts`, the earliest
 *   first.
 * - `keyOf`: Gives the type and the group of a session, like `TU 03`.
 * - `own`: The sessions of one group.
 * - `dated`: Them as what its rule is read back from.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param semester - Semester, like `2026W`
 * @returns Its groups, by type and group
 */
function groupsRead(module: string, semester: string): Group[] {
    const file: string = skillFileOf(module, planEnding);
    const begin: string = semesterBeginOf(semester);
    const sessions: Entry[] = entriesRead([{ folder: dirname(file), ending: basename(file) }],
        berlinDayStartOf(begin), berlinDayStartOf(dayAdd(begin, 366)))
        .filter((entry: Entry): boolean => groupIs(entry) && entry.category === skillName
            && (entry.semester === "" ? semesterOf(dayOfStart(entry.start)) : entry.semester) === semester)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
    const keyOf: (entry: Entry) => string = (entry: Entry): string => `${entry.type} ${entry.group}`;
    return [...new Set(sessions.map(keyOf))].map((key: string): Group => {
        const own: Entry[] = sessions.filter((entry: Entry): boolean => keyOf(entry) === key);
        const dated: Dated[] = own.map((entry: Entry): Dated => ({
            day: dayOfStart(entry.start), time: entry.allDay ? "" : entry.start,
            minutes: entry.minutes, location: entry.location,
            locationLink: entry.locationLink, online: entry.online, onlineLink: entry.onlineLink, passcode: entry.passcode,
            attendees: entry.attendees,
        }));
        return {
            ids: [...new Set(own.map((entry: Entry): string => entry.id))],
            rule: ruleOf(own[0].type, dated, dated, own[0].group, semester),
            sessions: dated.map((item: Dated): Session => ({ start: item.time || item.day, minutes: item.minutes ?? 0 })),
            pinned: own.some((entry: Entry): boolean => entry.pinned),
        };
    }).sort((first: Group, second: Group): number => first.rule.type.localeCompare(second.rule.type)
        || first.rule.group.localeCompare(second.rule.group, undefined, { numeric: true }));
}

/**
 * Reads back the series of a module from its boxes of a semester, see the top of this file: one per numbered type
 * with boxes, see `numberedTypes` in `boxes.ts`, its rule read back from all its boxes, or from those of my group
 * while they go to groups, see {@link pinnedOf}; each with how many boxes it has.
 * - `typed`: The boxes of a type.
 * - `mine`: My group of the type, empty for none.
 * - `own`: The boxes the rule follows.
 *
 * @param boxes - Its boxes of the semester, the earliest first
 * @param semester - Semester, like `2026W`
 * @param groups - Its groups of the semester
 * @returns Its series, in the order of the types
 */
function seriesListOf(boxes: Box[], semester: string, groups: Group[]): Series[] {
    return numberedTypes.flatMap((type: string): Series[] => {
        const typed: Box[] = boxes.filter((box: Box): boolean => box.type === type);
        const mine: string = pinnedOf(groups, type);
        const own: Box[] = typed.filter((box: Box): boolean => mine === "" || box.group === mine);
        return typed.length === 0 ? []
            : [{ rule: ruleOf(type, own.map(datedOf), typed.map(datedOf), mine, semester), count: typed.length }];
    });
}

/**
 * Reads the course of a module in a semester, the semester of today unless named, like that of a box of the plan
 * whose series opens from the day, see the top of this file and {@link Course}.
 * - `folder`: Name of the folder of the module.
 * - `semester`: The semester.
 * - `boxes`: Its skill boxes of the semester.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`, or its code,
 *   like `IN2028`, as a box of the plan names it
 * @param named - Semester, like `2026W`, empty for that of today in Berlin time
 * @returns Its course
 * @throws {Error} - When `NomSkillingmodules` holds no such module folder, or the semester is not written
 *   like `2026W`
 */
export function courseRead(module: string, named: string): Course {
    const folder: string = moduleFolderOf(codeOf(module)) ?? module;
    folderCheck(folder);
    const semester: string = named === "" ? semesterOf(berlinDateOf(new Date())) : named;
    if (!/^\d{4}[WS]$/.test(semester))
        throw new Error(`No semester ${semester}`);
    const boxes: Box[] = courseBoxesRead(codeOf(folder), semester);
    const groups: Group[] = groupsRead(folder, semester);
    return {
        module: folder,
        semester: semester,
        boxes: boxes,
        learned: learnedRead(codeOf(folder), semester),
        series: seriesListOf(boxes, semester, groups),
        groups: groups,
        folders: semesterFoldersRead(folder, semester),
        links: Object.fromEntries(skillTypes.map((type: string): [string, string] =>
            [type, skillLinkOf(codeOf(folder), type, semester)])),
        file: vaultPathOf(skillFileOf(folder, planEnding)),
    };
}

/**
 * Tells whether a start and an end are well formed, as of a slot, an extra or an exam: both a time well written,
 * like `14:00`, the start before the end.
 * - `time`: A time well written.
 *
 * @param times - The start and the end
 * @returns Whether they are
 */
function timesRight(times: Pick<Slot, "start" | "end">): boolean {
    const time: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/;
    return time.test(times.start) && time.test(times.end) && minutesOf(times.start) < minutesOf(times.end);
}

/**
 * Tells whether a slot is well formed: its times well formed, see {@link timesRight}, or without times its length,
 * a whole number of minutes, more than nothing and at most a day.
 *
 * @param slot - The slot
 * @returns Whether it is
 */
function slotRight(slot: Slot): boolean {
    return timesRight(slot) || slot.start === "" && slot.end === "" && Number.isInteger(slot.minutes)
        && (slot.minutes ?? 0) > 0 && (slot.minutes ?? 0) <= 24 * 60;
}

/**
 * Gives the length of a slot, an extra or a date: of its times, else its length, see `minutes` of {@link Slot}.
 *
 * @param times - The slot, the extra or the date
 * @returns Its length in minutes, `null` for none
 */
function slotLengthOf(times: Pick<Slot, "start" | "end" | "minutes">): number | null {
    return times.start === "" ? times.minutes ?? null : minutesOf(times.end) - minutesOf(times.start);
}

/**
 * Gives the day of a start, an ISO instant in Berlin time or a day itself, as a session of a group without times
 * has it, see {@link Session}.
 *
 * @param start - The start, like `2026-10-29T13:00:00.000Z` or `2026-10-29`
 * @returns The day, like `2026-10-29`
 */
function dayOfStart(start: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : berlinDateOf(new Date(start));
}

/**
 * Gives the start of a box of a date as ISO instant, empty for a date without times, see `minutes` of {@link Slot}.
 *
 * @param day - The day, like `2026-10-29`
 * @param start - Its time of start, like `14:00`, empty for none
 * @returns The start, like `2026-10-29T13:00:00.000Z`, empty for none
 */
function slotMomentOf(day: string, start: string): string {
    return start === "" ? "" : instantOf(day, start).toISOString();
}

/**
 * Tells whether the weeks of a rule are well formed, see {@link Rule}: slots on different weekdays, each with a start
 * before its end or only a length, see {@link slotRight}, its first day on or before its last, at most {@link ruleWeeks} weeks apart, its days written like
 * `2026-10-19`, and its extras, each a day with a start before its end, at most {@link ruleWeeks} weeks from its first
 * day, so a slip of a year typed makes no box far away, and the times of their own of its dates, each of a day with
 * a start before its end, see {@link timesRight}.
 * - `day`: A day well written.
 * - `near`: Whether a day lies at most {@link ruleWeeks} weeks from the first day.
 *
 * @param rule - The rule as sent
 * @returns Whether they are
 */
function weeksRight(rule: Rule): boolean {
    const day: RegExp = /^\d{4}-\d{2}-\d{2}$/;
    const near: (other: string) => boolean = (other: string): boolean =>
        Math.abs(Date.parse(other) - Date.parse(rule.first)) <= ruleWeeks * weekLength;
    return Array.isArray(rule.extras) && rule.slots.length > 0 && rule.slots.every((slot: Slot): boolean =>
            Number.isInteger(slot.weekday)
            && slot.weekday >= 1 && slot.weekday <= 7 && slotRight(slot))
        && new Set(rule.slots.map((slot: Slot): number => slot.weekday)).size === rule.slots.length
        && day.test(rule.first) && day.test(rule.last) && rule.first <= rule.last && near(rule.last)
        && rule.extras.every((extra: Extra): boolean => day.test(extra.day) && near(extra.day) && timesRight(extra))
        && Object.entries(rule.times ?? {}).every(([own, times]: [string, Pick<Slot, "start" | "end">]): boolean =>
            day.test(own) && timesRight(times));
}

/**
 * Stops a rule not well formed, see {@link Rule}: of a numbered type, see `numberedTypes` in `boxes.ts`, its weeks
 * well formed, see {@link weeksRight}, a semester like `2026W`, well-formed people, see `attendeesAllow`
 * in `categories.ts`, and a group without spaces or empty.
 *
 * @param rule - The rule as sent
 * @throws {Error} - When it is not well formed
 */
function ruleCheck(rule: Rule): void {
    if (!numberedTypes.includes(rule.type) || !weeksRight(rule) || !/^\d{4}[WS]$/.test(rule.semester)
        || !attendeesAllow(rule.attendees) || !/^[\w-]*$/.test(rule.group))
        throw new Error(`No rule of a series: ${JSON.stringify(rule)}`);
}

/**
 * Tells whether a change of a series may change or remove a box, see the top of this file: a to-do of the new system,
 * no date of a series of the file, never pushed, open or cancelled by the university; never one done, which the log
 * points to, nor one I cancelled or pushed, which are my own decisions.
 *
 * @param box - The box
 * @returns Whether a change may change or remove it
 */
function changeable(box: Box): boolean {
    return box.editable && box.todo && !box.series && box.pushed.length === 0
        && (box.state === "open" || box.state === "university");
}

/**
 * Tells whether I may give a box another state in the form of its series, see `states` of {@link SeriesChange}:
 * a to-do of the new system, no date of a series of the file, neither done, which the log decides, nor pushed away
 * from a day, as it shows on that day.
 *
 * @param box - The box
 * @returns Whether I may
 */
function stateable(box: Box): boolean {
    return box.editable && box.todo && !box.series && box.state !== "done" && box.state !== "pushed";
}

/**
 * Tells whether a box takes the times I typed for its day in the form of its series, see `retimed` of {@link Target}:
 * a to-do of the new system, no date of a series of the file, never pushed, whose times follow its pushes,
 * see `boxPush` in `boxes.ts`, but whatever its state and its day, so a lecture done or over takes the times it really
 * had, while its log entry keeps its own.
 *
 * @param box - The box
 * @returns Whether it does
 */
function retimable(box: Box): boolean {
    return box.editable && box.todo && !box.series && box.pushed.length === 0;
}

/**
 * Gives a box with the state I gave it in the form of its series, see `states` of {@link SeriesChange}, as a change
 * of the series then plans it, see {@link draftsOf}: skipped, it keeps its number and its place; cancelled by the
 * university, its number is `NONE`; open again, it takes its number anew, see {@link numbersOf}.
 * A box I may give no state, see {@link stateable}, and a state I may not give stay as they are.
 *
 * @param box - The box as it stands
 * @param state - The state I gave it, `undefined` for none
 * @returns The box with its state
 */
function stateSet(box: Box, state: BoxState | undefined): Box {
    if (state === undefined || state === box.state || !stateable(box) || !["open", "dropped", "university"]
        .includes(state))
        return box;
    let number: string = box.number === "NONE" ? "" : box.number;
    if (state === "university")
        number = "NONE";
    return { ...box, state: state, number: number };
}

/**
 * Tells whether a box lies today or later in Berlin time, the only kind a changed rule moves or removes, see
 * {@link seriesApply}, so a box of a day over stays as it was, open or not, but for the times I typed for its day,
 * see {@link retimable}.
 *
 * @param box - The box
 * @returns Whether it does
 */
function ahead(box: Box): boolean {
    return box.day >= berlinDateOf(new Date());
}

/**
 * Makes the draft of a box as it stands, see {@link Draft}.
 *
 * @param box - The box
 * @returns Its draft
 */
function draftOf(box: Box): Draft {
    return {
        box: box, day: box.day, time: box.time, minutes: box.minutes, location: box.location,
        locationLink: box.locationLink, online: box.online, onlineLink: box.onlineLink, passcode: box.passcode,
        attendees: box.attendees, group: box.group, number: box.number, removed: false,
    };
}

/**
 * Makes the draft of a new box of a date, with all of it, see {@link draftsOf} and {@link weekPick}.
 *
 * @param target - The date
 * @returns The draft, of no box yet
 */
function madeDraftOf(target: Target): Draft {
    return {
        box: null, day: target.day, time: target.start === "" ? "" : instantOf(target.day, target.start).toISOString(),
        minutes: target.minutes, location: target.location, locationLink: target.locationLink, online: target.online,
        onlineLink: target.onlineLink, passcode: target.passcode, attendees: target.attendees, group: target.group,
        number: "", removed: false,
    };
}

/**
 * Gives the date a session of a group sets the box of its week to, see {@link draftSet}: all of it, its day, its time,
 * its length, the room, what it does online, the tutor and the group.
 * - `day`: The day of the session.
 *
 * @param group - The group
 * @param session - Its session
 * @returns The date
 */
function targetOf(group: Group, session: Session): Target {
    const day: string = dayOfStart(session.start);
    return {
        day: day, start: session.start === day ? "" : berlinTimeOf(new Date(session.start)), minutes: session.minutes,
        location: group.rule.location, locationLink: group.rule.locationLink, online: group.rule.online,
        onlineLink: group.rule.onlineLink, passcode: group.rule.passcode, attendees: group.rule.attendees,
        group: group.rule.group, before: weekdayOf(day), fields: allFields, made: true, added: false,
        retimed: false,
    };
}

/**
 * Sets a draft of a box from the date of the series it takes, see {@link draftsOf}: what changed of it,
 * see {@link Field}, its day, its time with its length, its place with its link, what it does online, its people
 * and its group;
 * the rest as it was, a time kept at its time of day on a new day, like 14:00 of a lecture moved from Monday
 * to Tuesday.
 * - `day`: Its day after.
 * - `start`: Its time of day after, empty for a box without time.
 *
 * @param draft - The draft of the box
 * @param target - The date it takes
 * @returns The draft as set
 */
function draftSet(draft: Draft, target: Target): Draft {
    const day: string = target.fields.includes("day") ? target.day : draft.day;
    let start: string = draft.time === "" ? "" : berlinTimeOf(new Date(draft.time));
    if (target.fields.includes("time"))
        start = target.start;
    return {
        ...draft,
        day: day,
        time: start === "" ? "" : instantOf(day, start).toISOString(),
        minutes: target.fields.includes("time") ? target.minutes : draft.minutes,
        location: target.fields.includes("location") ? target.location : draft.location,
        locationLink: target.fields.includes("location") ? target.locationLink : draft.locationLink,
        online: target.fields.includes("online") ? target.online : draft.online,
        onlineLink: target.fields.includes("online") ? target.onlineLink : draft.onlineLink,
        passcode: target.fields.includes("online") ? target.passcode : draft.passcode,
        attendees: target.fields.includes("attendees") ? target.attendees : draft.attendees,
        group: target.fields.includes("group") ? target.group : draft.group,
    };
}

/**
 * Plans a change of a series week by week, see the top of this file, from the first week it reaches to its last:
 * each date of a week takes the box of the week that fell on the weekday of its slot before, see `before`
 * of {@link Target}, else, but for a date added, the earliest box of the week no date took yet, like a lecture moved
 * once to another day;
 * a box a change may not change, see {@link changeable}, stays as it is all the same, so its date gets no new box,
 * but takes the times I typed for its date where they may change, see `retimed` of {@link Target} and
 * {@link retimable};
 * a box a change may change takes what changed of its date, see {@link draftSet}; a date without box gets a new one,
 * with all of its date, while it is made, see `made` of {@link Target}; every other box of the week a change may change
 * goes.
 * A box of a week outside those reached stays as it is, but for its number, see {@link numbersOf}.
 * - `drafts`: The drafts so far: every box outside the weeks reached, then the weeks one by one.
 * - `seriesDayOf`: Gives the day of a box at its place in its series, see {@link datedOf}.
 * - `dates`: The dates of a week.
 * - `free`: The boxes of the week no date took yet, the earliest first.
 * - `taken`: The box each date of the week takes, `undefined` for none.
 *
 * @param series - Every box of the series, the earliest first
 * @param targets - The dates of the series after the change, in order
 * @param weeks - Monday of the first and of the last week the change reaches
 * @param touched - Tells whether the change may change a box, like not one of a week I go to another group
 * @returns The drafts of every box of the series, removed ones too, and of the new ones
 */
function draftsOf(series: Box[], targets: Target[], weeks: [string, string], touched: (box: Box) => boolean): Draft[] {
    const [from, to]: [string, string] = weeks;
    const drafts: Draft[] = series.filter((box: Box): boolean => weekOf(box) < from || weekOf(box) > to).map(draftOf);
    const seriesDayOf: (box: Box) => string = (box: Box): string => datedOf(box).day;
    for (let week: string = from; week <= to; week = dayAdd(week, 7)) {
        const dates: Target[] = targets.filter((target: Target): boolean => mondayOf(target.day) === week);
        const free: Box[] = series.filter((box: Box): boolean => weekOf(box) === week);
        const taken: (Box | undefined)[] = dates.map((target: Target): Box | undefined =>
            weekTake(free, target.before, false, seriesDayOf));
        dates.forEach((target: Target, index: number): void => {
            if (!target.added)
                taken[index] ??= weekTake(free, target.before, true, seriesDayOf);
        });
        dates.forEach((target: Target, index: number): void => {
            const box: Box | undefined = taken[index];
            if (box === undefined && target.made)
                drafts.push(madeDraftOf(target));
            else if (box !== undefined && touched(box))
                drafts.push(draftSet(draftOf(box), target));
            else if (box !== undefined && target.retimed && retimable(box))
                drafts.push(draftSet(draftOf(box), { ...target, fields: ["time"] }));
            else if (box !== undefined)
                drafts.push(draftOf(box));
        });
        drafts.push(...free.map((box: Box): Draft => ({ ...draftOf(box), removed: touched(box) })));
    }
    return drafts;
}

/**
 * Numbers the boxes of a type of a semester after a change, see the top of this file, the way `boxUniversity`
 * in `boxes.ts` keeps them: by their places in the series, see {@link datedOf}, each box one more than the box before
 * it, a new one, one done, one I skipped and one I pushed alike, so no number stands twice, like a Thursday added
 * before a Monday I skipped; only its number changes, never its state, day or time; one the university cancelled keeps
 * `NONE` and counts not; one of another app or one date of a series of a file, which the dashboard does not number,
 * keeps its number, the next going on from it.
 * Of a type with groups each box takes the number of its week instead, see {@link tutorialWeeksOf}, a second box
 * of a week the same, one of a week before them all `1`, one after them all the number after the last week.
 * - `placeOf`: Gives the place of a draft in the series: where its box stood before its first push, else its time,
 *   or its day for a box without time, after the change.
 * - `last`: The number of the box before.
 *
 * @param drafts - The drafts of every box of the type, see {@link draftsOf}, numbered in place
 * @param weeks - The weeks of the type with groups, see {@link tutorialWeeksOf}; none for a type without
 */
function numbersOf(drafts: Draft[], weeks: string[]): void {
    const placeOf: (draft: Draft) => string = (draft: Draft): string => {
        const left: Push | undefined = draft.box?.pushed[0];
        return left === undefined ? draft.time || draft.day : left.time || left.day;
    };
    let last: number = 0;
    drafts.filter((draft: Draft): boolean => !draft.removed)
        .sort((first: Draft, second: Draft): number => placeOf(first).localeCompare(placeOf(second)))
        .forEach((draft: Draft): void => {
            if (draft.number === "NONE")
                return;
            if (draft.box !== null && !(draft.box.editable && draft.box.todo && !draft.box.series)) {
                last = /^\d+$/.test(draft.number) ? Number(draft.number) : last;
                return;
            }
            const place: string = placeOf(draft);
            const week: string = mondayOf(place.length > 10 ? berlinDateOf(new Date(place)) : place);
            last = weeks.length === 0 ? last + 1
                : Math.max(1, weeks.filter((one: string): boolean => one <= week).length);
            draft.number = String(last);
        });
}

/**
 * Numbers the boxes of a type of a module of a semester anew, see {@link numbersOf}, as after the university cancelled
 * one of them or took that back, see `boxUniversity` in `boxes.ts`, writing only the numbers that change.
 * - `typed`: The boxes of the type.
 * - `drafts`: Them as they stand.
 *
 * @param module - The module, its folder or its code, like `IN2028`
 * @param type - The type, like `TU`
 * @param semester - The semester, like `2026W`
 * @throws {Error} - When there is no such module folder, or a box cannot be written
 */
export function numbersRenew(module: string, type: string, semester: string): void {
    const folder: string = moduleFolderOf(codeOf(module)) ?? module;
    folderCheck(folder);
    const typed: Box[] = courseBoxesRead(codeOf(folder), semester).filter((box: Box): boolean => box.type === type);
    const drafts: Draft[] = typed.map(draftOf);
    numbersOf(drafts, tutorialWeeksOf(groupsRead(folder, semester), type));
    draftsWrite(folder, type, semester, drafts);
}

/**
 * Tells whether a draft of a box that stays sets its day, its time, its length, its place, what it does online
 * or its people anew.
 *
 * @param draft - The draft of a box that stays
 * @param box - The box as it stands
 * @returns Whether one of them changes
 */
function draftMoved(draft: Draft, box: Box): boolean {
    return draft.day !== box.day || draft.time !== box.time || draft.minutes !== box.minutes
        || draft.location !== box.location || draft.locationLink !== box.locationLink || draft.online !== box.online
        || draft.onlineLink !== box.onlineLink || draft.passcode !== box.passcode
        || JSON.stringify(draft.attendees) !== JSON.stringify(box.attendees);
}

/**
 * Writes a change of a series as planned, see {@link draftsOf}, into the plan of the module, every other line of it
 * as it is: a box removed goes, see `boxDelete` in `boxes.ts`; a new one is a to-do as the dialog adds one, see
 * `todoAppend` in `calendar.ts`, what it is written as the folder of the module with its type in brackets, linking
 * the folder of its material, see `titleOf` in `documents.ts`, with its place, its people, its `X-NUMBER`, its
 * `X-GROUP` while it goes to a group, and its `X-SEMESTER`; of a box that
 * stays only what changed against its file: skipped or open again, see `boxDrop` in `boxes.ts`, its day, its time
 * and its place as the dialog changes them, see `todoChange` in `calendar.ts`, its number, `NONE` once the university
 * cancelled it, and its group in their lines.
 * - `file`: The plan of the module.
 * - `stands`: A box that stays as its file holds it now.
 * - `code`: The code of the module, like `IN2028`.
 * - `title`, `titleLink`: What a new box is, its `SUMMARY` and the `ALTREP` of it, the same for all.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param type - Type of the boxes, like `TU`
 * @param semester - Their semester, like `2026W`
 * @param drafts - The drafts of the boxes, see {@link draftsOf}
 * @throws {Error} - When a box cannot be found or written, like one done meanwhile
 */
function draftsWrite(module: string, type: string, semester: string, drafts: Draft[]): void {
    const file: string = skillFileOf(module, planEnding);
    const code: string = codeOf(module);
    const [title, titleLink]: [string, string] =
        titleOf({ category: skillName, title: "", module: code, type: type, semester: semester }, null);
    drafts.forEach((draft: Draft): void => {
        const box: Box | null = draft.box;
        if (box === null) {
            const id: string = todoAppend(file, {
                category: skillName, title: title, titleLink: titleLink, location: draft.location,
                locationLink: draft.locationLink, online: draft.online, onlineLink: draft.onlineLink,
                passcode: draft.passcode, from: "", attendees: draft.attendees, module: code, type: type,
                semester: semester, note: "", day: draft.day, time: draft.time === "" ? null : new Date(draft.time),
                minutes: draft.minutes, deadline: "",
            });
            propertiesPut(file, id, [
                ["x-number", [draft.number]],
                ["x-group", draft.group === "" ? [] : [draft.group]],
            ]);
            return;
        }
        if (draft.removed) {
            boxDelete(box.id);
            return;
        }
        const [boxFile, entry, stands]: [string, Entry, Box] = boxFind(box.id);
        if ((box.state === "dropped") !== (stands.state === "dropped"))
            boxDrop(box.id, box.state === "dropped");
        if (draftMoved(draft, box))
            todoChange(boxFile, entry, {
                ...entry, location: draft.location, locationLink: draft.locationLink, online: draft.online,
                onlineLink: draft.onlineLink, passcode: draft.passcode, attendees: draft.attendees,
                day: draft.day, time: draft.time === "" ? null : new Date(draft.time), minutes: draft.minutes,
            }, boxFile);
        if (draft.number !== stands.number || draft.group !== stands.group)
            propertiesPut(boxFile, box.id, [
                ["x-number", draft.number === "" ? [] : [draft.number]],
                ["x-group", draft.group === "" ? [] : [draft.group]],
            ]);
    });
}

/**
 * Gives the boxes of a series as planned, see {@link draftsOf}, for the preview of the form: each with its day,
 * its times and its number after the change, its state, whether I pushed it, may give it another state and may give it
 * other times, whether the change adds, changes, renumbers or removes it, and its people after it.
 * - `change`: What the change does to a box.
 *
 * @param drafts - The drafts of every box of the series, numbered, see {@link numbersOf}
 * @returns The boxes, removed ones too, by their days
 */
function plannedOf(drafts: Draft[]): Planned[] {
    return drafts.map((draft: Draft): Planned => {
        let change: Planned["change"] = "";
        if (draft.box === null)
            change = "new";
        else if (draft.removed)
            change = "removed";
        else if (draftMoved(draft, draft.box))
            change = "changed";
        else if (draft.number !== draft.box.number || draft.group !== draft.box.group)
            change = "renumbered";
        return {
            id: draft.box?.id ?? "", day: draft.day, time: draft.time, minutes: draft.minutes, number: draft.number,
            state: draft.box?.state ?? (draft.number === "NONE" ? "university" : "new"),
            pushed: (draft.box?.pushed.length ?? 0) > 0,
            editable: draft.box === null || stateable(draft.box),
            retimable: draft.box === null || retimable(draft.box), change: change, attendees: draft.attendees,
        };
    }).sort((first: Planned, second: Planned): number =>
        (first.time || first.day).localeCompare(second.time || second.day));
}

/**
 * Tells what of a date of a rule changed against the slot or the extra whose boxes it takes in the rule as read back
 * when the form opened, which then goes into every box it takes, see {@link draftSet}: its weekday, its time, and what
 * changed of the whole rule, its place, what it does online or its people; all of it for a slot or an extra added.
 * - `changed`: Each field with whether it changed.
 *
 * @param before - The slot or the extra as read back, `undefined` for one added
 * @param date - The slot or the extra as typed
 * @param shared - What changed of the whole rule, its place, what it does online or its people
 * @returns What changed
 */
function slotFieldsOf(before: Slot | Extra | undefined, date: Slot | Extra, shared: Field[]): Field[] {
    if (before === undefined)
        return ["day", "time", "location", "online", "attendees"];
    const changed: [Field, boolean][] = [
        ["day", "weekday" in before && "weekday" in date && before.weekday !== date.weekday],
        ["time", before.start !== date.start || slotLengthOf(before) !== slotLengthOf(date)],
    ];
    return [...changed.filter(([, differs]: [Field, boolean]): boolean => differs)
        .map(([field]: [Field, boolean]): Field => field), ...shared];
}

/**
 * Changes a series by its rule, as typed in its form, see the top of this file, or only tells what that would make,
 * for the preview of the form: first each box takes the state I gave it, see {@link stateSet}; then each date
 * of the rule takes the box of its week of the slot it takes the boxes of, see `before` of {@link SeriesChange},
 * an extra the box of its day, with what changed of its slot, of its own times, see {@link Times}, or of its extra,
 * see {@link slotFieldsOf}, all of it for a new series or a slot or an extra added; a date without box gets one,
 * for a series that has boxes only from today on, a date I cancelled by its day one cancelled by the university,
 * its number `NONE`;
 * a box no date takes goes, but only an open one from today on, see {@link ahead}, every other box staying, see
 * {@link changeable}, and so does that of a week I go to another group, each taking only the times I typed for its day,
 * see `retimed` of {@link Target}; then the boxes of the type are numbered anew, see {@link numbersOf}.
 * A new box goes to my group while my tutorials go to groups, and takes the place of the rule with its link,
 * see `placeLinkOf` in `places.ts`, and what the rule does online, see `onlineFor` there.
 * - `rule`, `old`: The rule as typed and as read back.
 * - `today`: Today in Berlin time.
 * - `typed`: The boxes of its type of its semester, each with the state I gave it.
 * - `groups`: The groups of its semester.
 * - `mine`: My group of the type, see {@link pinnedOf}, empty for none.
 * - `link`: The link of the place of the rule.
 * - `online`: What the rule does online, as written.
 * - `changed`: Each field of the whole rule, its place, what it does online and its people, with whether it changed.
 * - `shared`: Those of them that changed.
 * - `wasOf`: Gives the slot or the extra of the rule as read back whose boxes a date takes, `undefined` for none.
 * - `wasDay`: The day of a date as read back, on the weekday of the slot whose boxes it takes, whose times of its own,
 *   see {@link Times}, stand for those of its slot, so a box with times of its own keeps them while the times of its
 *   slot change, and only a box whose times I typed anew takes them.
 * - `retimed`: Whether I typed the times of a date anew for its day: of an extra others than as read back, of a date
 *   of a slot times of its own, see {@link Times}, other than those of its day as read back, its slot's again too.
 * - `own`: Of a type with groups, my group, each of its templates, none without group of mine.
 * - `met`: Of a type with groups, the days my group meets, its real sessions, cancelled ones left out, so a week it does
 *   not meet and that holds no box of mine is no new date; `null` without groups or group of mine.
 * - `held`: The weeks that hold a box of the type.
 * - `targets`: The dates of the rule, but those of a week my group does not meet and that holds no box of mine.
 * - `weeks`: The weeks the change reaches, from the first of the rule or the series to the last of either.
 * - `drafts`: The boxes of the type as planned, the new ones I cancelled with `NONE`.
 *
 * @param change - The change as the form sends it
 * @returns The boxes of the series after the change, removed ones too, by their times
 * @throws {Error} - When there is no such module folder, the rule is not well formed, the link online is no
 *   web address, or a box cannot be written
 */
export function seriesApply(change: SeriesChange): Planned[] {
    folderCheck(change.module);
    ruleCheck(change.rule);
    const rule: Rule = change.rule;
    const old: Rule | null = change.old;
    const today: string = berlinDateOf(new Date());
    const typed: Box[] = courseBoxesRead(codeOf(change.module), rule.semester)
        .filter((box: Box): boolean => box.type === rule.type)
        .map((box: Box): Box => stateSet(box, change.states?.[box.id]));
    const groups: Group[] = groupsRead(change.module, rule.semester);
    const mine: string = pinnedOf(groups, rule.type);
    const link: string = placeLinkOf(rule.location, old);
    const online: Online = onlineFor(rule, null);
    const changed: [Field, boolean][] = old === null ? [] : [
        ["location", old.location !== rule.location],
        ["online", old.online !== online.online || old.onlineLink !== online.onlineLink
            || old.passcode !== online.passcode],
        ["attendees", JSON.stringify(old.attendees) !== JSON.stringify(rule.attendees)],
    ];
    const shared: Field[] = changed.filter(([, differs]: [Field, boolean]): boolean => differs)
        .map(([field]: [Field, boolean]): Field => field);
    const wasOf: (date: RuleDate) => Slot | Extra | undefined = (date: RuleDate): Slot | Extra | undefined =>
        date.slot === -1 ? old?.extras.find((extra: Extra): boolean => extra.day === date.day)
            : old?.slots.find((slot: Slot): boolean =>
                slot.weekday === (change.before?.[date.slot] ?? rule.slots[date.slot].weekday));
    const own: Group[] = mine === "" ? [] : groups
        .filter((group: Group): boolean => group.rule.type === rule.type && group.rule.group === mine);
    const met: Set<string> | null = own.length === 0 ? null : new Set(own.flatMap((group: Group): string[] =>
        group.sessions.map((session: Session): string => dayOfStart(session.start))));
    const held: Set<string> = new Set(typed.map(weekOf));
    const targets: Target[] = datesOf(rule).filter((date: RuleDate): boolean =>
        met === null || met.has(date.day) || held.has(mondayOf(date.day))).map((date: RuleDate): Target => {
        const was: Slot | Extra | undefined = wasOf(date);
        const wasDay: string = was !== undefined && "weekday" in was
            ? dayAdd(date.day, was.weekday - weekdayOf(date.day)) : date.day;
        const retimed: boolean = date.slot === -1
            ? was !== undefined && (was.start !== date.start || was.end !== date.end)
            : JSON.stringify(rule.times?.[date.day]) !== JSON.stringify(old?.times?.[wasDay]);
        return {
            day: date.day, start: date.start, minutes: slotLengthOf(date),
            location: rule.location, locationLink: link, ...online, attendees: rule.attendees, group: mine,
            before: was !== undefined && "weekday" in was ? was.weekday : weekdayOf(date.day),
            fields: slotFieldsOf(was === undefined ? undefined : { ...was, ...old?.times?.[wasDay] },
                date.slot === -1 ? date : { ...rule.slots[date.slot], start: date.start, end: date.end }, shared),
            made: old === null || date.day >= today, added: was === undefined, retimed: retimed,
        };
    });
    const weeks: string[] = [mondayOf(rule.first), mondayOf(rule.last), ...targets.map((target: Target): string =>
        mondayOf(target.day)), ...typed.map(weekOf)].sort();
    const drafts: Draft[] = draftsOf(typed, targets, [weeks[0], weeks[weeks.length - 1]],
        (box: Box): boolean => changeable(box) && ahead(box) && (box.group === "" || box.group === mine));
    drafts.filter((draft: Draft): boolean => draft.box === null && change.states?.[draft.day] === "university")
        .forEach((draft: Draft): void => {
            draft.number = "NONE";
        });
    numbersOf(drafts, tutorialWeeksOf(groups, rule.type));
    if (!change.dry)
        draftsWrite(change.module, rule.type, rule.semester, drafts);
    return plannedOf(drafts);
}

/**
 * Makes a new box of the dialog once per date of its weekly rule, see the top of this file, or only tells what that
 * would make, for the preview of the dialog. A skill box of a numbered type of a module becomes its series as the form
 * of a new series makes it, see {@link seriesApply}, with the place, the people and the semester of the box and
 * the dates I cancelled, so the page of the module shows it as the card of its type, numbered; while its type has a box
 * in that semester, its series is there already, which only the form of that series changes, so nothing is made.
 * Any other box, like one of a project or my gym, is added once per date into the plan it belongs into, as the dialog
 * adds one alone, see `boxesAdd` in `boxes.ts`: its day the date, its time and length those of the slot or the extra
 * of the date, no deadline.
 * - `box`: The box as sent.
 * - `rule`: Its rule, its days with the fields of the box.
 * - `module`: Name of the folder of the module of a skill box of a numbered type, `undefined` for any other box.
 * - `boxes`: The boxes of any other box, one per date.
 *
 * @param change - The box and its days, as the dialog sends them
 * @returns The boxes it makes, by their days; `null` for a series of a type with a box in its semester already
 * @throws {Error} - When the rule or the box is not well formed, the link online is no web address, a document is
 *   none of the module's, or a box cannot be written
 */
export function repeatApply(change: RepeatChange): Planned[] | null {
    const box: RepeatChange["box"] = change.box;
    const rule: Rule = {
        type: box.type, slots: change.slots, extras: change.extras, location: box.location, locationLink: "",
        online: box.online ?? "", onlineLink: box.onlineLink ?? "", passcode: box.passcode ?? "",
        attendees: box.attendees ?? [], first: change.first, last: change.last, times: change.times, group: "",
        semester: box.semester,
    };
    const module: string | undefined = box.category === skillName && numberedTypes.includes(box.type)
        ? moduleFolderOf(box.module) : undefined;
    if (module !== undefined)
        return courseBoxesRead(box.module, box.semester).some((one: Box): boolean => one.type === box.type) ? null
            : seriesApply({ module: module, rule: rule, old: null, states: change.states, dry: change.dry });
    if (!weeksRight(rule))
        throw new Error(`No days of a box: ${JSON.stringify(rule)}`);
    const boxes: BoxNew[] = datesOf(rule).map((date: RuleDate): BoxNew => ({
        ...box, day: date.day, time: slotMomentOf(date.day, date.start), minutes: slotLengthOf(date), deadline: "",
    }));
    boxesAdd(boxes, change.dry);
    return boxes.map((one: BoxNew): Planned => ({
        id: "", day: one.day, time: one.time, minutes: one.minutes, number: "", state: "new", pushed: false,
        editable: true, retimable: true, change: "new", attendees: one.attendees ?? [],
    }));
}

/**
 * Gives an exam of a module the kind and the times I gave it in the form of its exams, see the top of this file:
 * its kind as its `X-NUMBER`, its times as its time and its length on its day, see `todoChange` in `calendar.ts`,
 * each only when it changed, every other line of its file as it is; a done exam keeps its log entry as it is.
 * - `file`, `entry`, `box`: The exam with its file.
 * - `timed`: Whether the form sends times.
 * - `time`, `minutes`: Its time as ISO instant and its length after the change.
 *
 * @param change - The exam with its kind and its times, as the form sends them
 * @throws {Error} - When there is no such box, it is no exam that is a to-do of the new system, no date of a series
 *   of a file, its new kind is none of {@link examKinds}, or its times are not well formed, see {@link timesRight},
 *   or may not change, see {@link retimable}
 */
export function examSet(change: ExamChange): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(change.box);
    const timed: boolean = change.start !== "" || change.end !== "";
    if (box.category !== skillName || box.type !== examType || !box.editable || !box.todo || box.series
        || (change.kind !== box.number && !examKinds.includes(change.kind))
        || (timed && (!retimable(box) || !timesRight(change))))
        throw new Error(`No change of an exam: ${JSON.stringify(change)}`);
    const time: string = timed ? instantOf(box.day, change.start).toISOString() : box.time;
    const minutes: number | null = timed ? minutesOf(change.end) - minutesOf(change.start) : box.minutes;
    if (time !== box.time || minutes !== box.minutes)
        todoChange(file, entry, { ...entry, day: box.day, time: new Date(time), minutes: minutes }, file);
    if (change.kind !== box.number)
        propertiesPut(file, box.id, [["x-number", [change.kind]]]);
}

/**
 * Makes a group mine, see the top of this file, or only tells what that would make, for the preview of the form:
 * from the week of its next session that is not over on, the boxes of its type go to its sessions, its day, time,
 * length, room, tutor and group, also the box of a week I went to another group, so the series follows the group
 * from then on, a session without box getting one, a box of a week it does not meet going, but every box a change
 * may not change staying, see {@link changeable}, every coming open week alike, also one picked for another group;
 * a week before stays as it is, like this week's box at another group
 * while the group meets only from next week on. With no series yet, its sessions to come become one. Then the boxes
 * of the type are numbered anew, see {@link numbersOf}, from 1 for a new series, and the group is pinned, see
 * {@link pinPut}.
 * No group named takes my group back, `No group yet` again: every box of the type from today on that a change may
 * change goes, see {@link ahead} and {@link changeable}, every box done, skipped, pushed or of a day over staying;
 * then the boxes left are numbered anew and no group is pinned.
 * - `semester`: The semester of today.
 * - `groups`: The groups of the semester.
 * - `group`: The group, `undefined` for none.
 * - `now`: Now in milliseconds.
 * - `coming`: Its sessions not over.
 * - `typed`: The boxes of its type of the semester.
 * - `from`: Monday of the week of its next session.
 * - `targets`: Its sessions not over, as the dates of the series.
 * - `weeks`: The weeks of the group and of the boxes from that week on.
 * - `drafts`: The boxes of the type as planned.
 *
 * @param change - The group, as the page sends it
 * @returns The boxes of the series after the change, removed ones too, by their days
 * @throws {Error} - When there is no such module folder or group, the group meets no more, or a box cannot be written
 */
export function groupMine(change: MineChange): Planned[] {
    folderCheck(change.module);
    const semester: string = semesterOf(berlinDateOf(new Date()));
    if (change.group === "") {
        const kept: Draft[] = courseBoxesRead(codeOf(change.module), semester)
            .filter((box: Box): boolean => box.type === change.type)
            .map((box: Box): Draft => ({ ...draftOf(box), removed: ahead(box) && changeable(box) }));
        numbersOf(kept, tutorialWeeksOf(groupsRead(change.module, semester), change.type));
        if (change.dry !== true) {
            draftsWrite(change.module, change.type, semester, kept);
            pinPut(change.module, change.type, semester, "");
        }
        return plannedOf(kept);
    }
    const groups: Group[] = groupsRead(change.module, semester);
    const group: Group | undefined = groups
        .find((one: Group): boolean => one.rule.type === change.type && one.rule.group === change.group);
    const now: number = Date.now();
    const coming: Session[] = (group?.sessions ?? [])
        .filter((session: Session): boolean => Date.parse(session.start) + session.minutes * 60 * 1000 > now);
    if (group === undefined || coming.length === 0)
        throw new Error(`No group ${change.type} ${change.group} with sessions to come in ${change.module}`);
    const typed: Box[] = courseBoxesRead(codeOf(change.module), semester)
        .filter((box: Box): boolean => box.type === change.type);
    const from: string = mondayOf(berlinDateOf(new Date(coming[0].start)));
    const targets: Target[] = coming.map((session: Session): Target => targetOf(group, session));
    const weeks: string[] = [...targets.map((target: Target): string => mondayOf(target.day)), ...typed.map(weekOf)]
        .filter((week: string): boolean => week >= from).sort();
    const drafts: Draft[] = draftsOf(typed, targets, [from, weeks[weeks.length - 1]],
        (box: Box): boolean => changeable(box));
    numbersOf(drafts, tutorialWeeksOf(groups, change.type));
    if (change.dry !== true) {
        draftsWrite(change.module, change.type, semester, drafts);
        pinPut(change.module, change.type, semester, change.group);
    }
    return plannedOf(drafts);
}

/**
 * Picks one session of a group for its week, as the menu of the groups sends it, see the top of this file: a box
 * I skipped that week is open again, one a change may change, see {@link changeable}; then the open box of the week
 * goes to the session, its day, its time, its length, its room,
 * its tutor and its group, its number kept, and no other week. A week without box gets one, and with
 * no box of the type after that week the sessions of the group from that week on become my series, one per week,
 * so later weeks follow it; then the boxes of the type are numbered anew, see {@link numbersOf}.
 * A week done, or whose box may not change, see {@link changeable}, stays as it is.
 * As an extra, see `extra` of {@link PickChange}, the session becomes a box of its own instead, besides the box of its
 * week, which stays, as a second tutorial in one week; then the boxes are numbered anew, once per session; one of a
 * day over stays on its day, never carried along to today, `X-CARRIED:FALSE`, so I log it there.
 * - `semester`: The semester of the session.
 * - `groups`: The groups of the semester.
 * - `group`, `session`: The group and its session, `undefined` for none.
 * - `week`: Monday of the week of the session.
 * - `weekOfSession`: Gives the Monday of the week of a session.
 * - `typedRead`: Reads the boxes of the type of the semester.
 * - `typed`: The boxes of the type of the semester.
 * - `skipped`: The box of the week I skipped, `undefined` for none.
 * - `box`: The open box of the week a change may change, `undefined` for none.
 * - `later`: Whether a box of the type falls after the week.
 * - `firsts`: Without later box the first session of the group of every later week, else none.
 * - `targets`: The dates: the session, then those of the later weeks.
 * - `drafts`: The boxes of the type as planned; one of a day over stays on
 * its day, never carried along to today, `X-CARRIED:FALSE`, so I log it there.
 *
 * @param change - The session, as the page sends it
 * @throws {Error} - When there is no such module folder, group or session, the week is done or its box may not change,
 *   or a box cannot be written
 */
export function weekPick(change: PickChange): void {
    folderCheck(change.module);
    const semester: string = semesterOf(dayOfStart(change.start));
    const groups: Group[] = groupsRead(change.module, semester);
    const group: Group | undefined = groups
        .find((one: Group): boolean => one.rule.type === change.type && one.rule.group === change.group);
    const session: Session | undefined = group?.sessions
        .find((one: Session): boolean => Date.parse(one.start) === Date.parse(change.start));
    if (group === undefined || session === undefined)
        throw new Error(`No session of group ${change.type} ${change.group} at ${change.start} in ${change.module}`);
    const weekOfSession: (one: Session) => string = (one: Session): string => mondayOf(dayOfStart(one.start));
    const week: string = weekOfSession(session);
    const typedRead: () => Box[] = (): Box[] => courseBoxesRead(codeOf(change.module), semester)
        .filter((one: Box): boolean => one.type === change.type);
    let typed: Box[] = typedRead();
    if (change.extra === true) {
        if (typed.some((one: Box): boolean => (one.time || one.day) === session.start
            || one.time !== "" && Date.parse(one.time) === Date.parse(session.start)))
            throw new Error(`A box of ${change.type} of ${change.module} is there already at ${change.start}`);
        const drafts: Draft[] = [...typed.map(draftOf), madeDraftOf(targetOf(group, session))];
        numbersOf(drafts, tutorialWeeksOf(groups, change.type));
        draftsWrite(change.module, change.type, semester, drafts);
        if (dayOfStart(session.start) < berlinDateOf(new Date())) {
            const plan: string = skillFileOf(change.module, planEnding);
            fileEntriesRead(plan).filter((entry: Entry): boolean => entry.type === change.type
                && Date.parse(entry.start) === Date.parse(session.start))
                .forEach((entry: Entry): void => propertiesPut(plan, entry.id, [["x-carried", ["FALSE"]]]));
        }
        return;
    }
    const skipped: Box | undefined = typed.find((one: Box): boolean => weekOf(one) === week && one.state === "dropped"
        && changeable({ ...one, state: "open" }));
    if (skipped !== undefined) {
        boxDrop(skipped.id, false);
        typed = typedRead();
    }
    const box: Box | undefined = typed.find((one: Box): boolean => weekOf(one) === week && changeable(one)
        && one.state === "open");
    if (box !== undefined) {
        draftsWrite(change.module, change.type, semester, [draftSet(draftOf(box), targetOf(group, session))]);
        return;
    }
    if (typed.some((one: Box): boolean => weekOf(one) === week))
        throw new Error(`The ${change.type} of ${change.module} in the week of ${week} is done or may not change`);
    const later: boolean = typed.some((one: Box): boolean => weekOf(one) > week);
    const firsts: Session[] = later ? [] : group.sessions.filter((one: Session, index: number): boolean =>
        weekOfSession(one) > week && group.sessions
            .findIndex((other: Session): boolean => weekOfSession(other) === weekOfSession(one)) === index);
    const targets: Target[] = [targetOf(group, session),
        ...firsts.map((one: Session): Target => targetOf(group, one))];
    const drafts: Draft[] = draftsOf(typed, targets,
        [week, mondayOf(targets[targets.length - 1].day)], (): boolean => false);
    numbersOf(drafts, tutorialWeeksOf(groups, change.type));
    draftsWrite(change.module, change.type, semester, drafts);
}

/**
 * Removes the groups of a type and a group of a semester from the plan of a module, each to-do of them
 * with every line of it; a session of it changed alone, which the dashboard never writes, stays.
 * - `file`: The plan of the module.
 * - `found`: The groups to remove.
 *
 * @param gone - The group, as sent
 * @returns How many were removed
 */
function groupsTake(gone: GroupGone): number {
    const file: string = skillFileOf(gone.module, planEnding);
    const found: Group[] = groupsRead(gone.module, gone.semester)
        .filter((group: Group): boolean => group.rule.type === gone.type && group.rule.group === gone.group);
    found.forEach((group: Group): void => group.ids.forEach((id: string): void => entryRemove(file, id)));
    return found.length;
}

/**
 * Writes one slot of a group into the plan of a module, see the top of this file: one weekly to-do, its first session
 * as `DTSTART`, its length as `ESTIMATED-DURATION`, no `STATUS`,
 * `RRULE:FREQ=WEEKLY;UNTIL=…` with the start of its last session in UTC, like `UNTIL=20270202T090000Z`, one `EXDATE`
 * per day of its slot between them without session, a day the university does not teach or one cancelled, like
 * `EXDATE;TZID=Europe/Berlin:20261229T100000`, what it is as a box of its type is,
 * see `titleOf` in `documents.ts`, its room with its link, see `placeLinkOf` in `places.ts`, what it does online,
 * see `onlineFor` there, its tutor, `X-GROUP` and `X-SEMESTER`; the plan made when missing. A slot without times,
 * only its length, see `minutes` of {@link Slot}, writes days, as my sleep: `DTSTART;VALUE=DATE`, `UNTIL` its last day
 * and `EXDATE;VALUE=DATE`.
 * - `slot`: Its one slot.
 * - `code`: Code of the module, like `IN2028`.
 * - `title`, `titleLink`: What it is, its `SUMMARY` and the `ALTREP` of it.
 * - `start`: The start of its first session, `null` for a slot without times.
 * - `fields`: Its fields, the time of its first session and its length.
 * - `until`: The start of its last session, in the form of the iCalendar format in UTC, or its day.
 * - `left`: The days of its slot between its first and its last session without a session.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param rule - The rule of the group with one slot, checked, see {@link ruleCheck}
 * @param days - The days of its sessions on that slot, at least one, the earliest first
 * @returns Identifier of the to-do written
 * @throws {Error} - When the link online is no web address
 */
function groupWrite(module: string, rule: Rule, days: string[]): string {
    const slot: Slot = rule.slots[0];
    const code: string = codeOf(module);
    const [title, titleLink]: [string, string] =
        titleOf({ category: skillName, title: "", module: code, type: rule.type, semester: rule.semester }, null);
    const start: Date | null = slot.start === "" ? null : instantOf(days[0], slot.start);
    const fields: TodoFields = {
        category: skillName, title: title, titleLink: titleLink, location: rule.location,
        locationLink: placeLinkOf(rule.location, null), ...onlineFor(rule, null), from: "", attendees: rule.attendees,
        module: code, type: rule.type, semester: rule.semester, note: "",
        day: days[0], time: start, minutes: slotLengthOf(slot), deadline: "",
    };
    const until: string = start === null ? days[days.length - 1].replace(/-/g, "")
        : icsTextOf(instantOf(days[days.length - 1], slot.start).toISOString());
    const left: string[] = [];
    for (let day: string = dayAdd(days[0], 7); day < days[days.length - 1]; day = dayAdd(day, 7))
        if (!days.includes(day))
            left.push(day);
    return todoAppend(skillFileOf(module, planEnding), fields, [
        ["rrule", `FREQ=WEEKLY;UNTIL=${until}`],
        ...left.map((day: string): [string, string | Date] => ["exdate", start === null ? day : instantOf(day, slot.start)]),
        ["x-group", rule.group],
    ], false);
}

/**
 * Moves my boxes that go to a group to its sessions anew, once the group changed, see the top of this file: each open
 * box of its type from today on that goes to it, one a change may change, see {@link changeable}, takes the session
 * of the group in its week, the one on its weekday, else its first, all of it, see {@link targetOf}, like a new room;
 * a box of a week the group no longer meets in stays as it is.
 * - `found`: The group as written, `undefined` for none.
 * - `drafts`: The boxes that move.
 * - `week`: The sessions of the group in the week of a box.
 * - `session`: The one the box takes, `undefined` for none.
 * - `draft`: The box as it moves, `undefined` for none.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param type - Type of the group, like `TU`
 * @param group - The group, like `05`
 * @param semester - Its semester, like `2026W`
 * @throws {Error} - When a box cannot be written
 */
function groupBoxesMove(module: string, type: string, group: string, semester: string): void {
    const found: Group | undefined = groupsRead(module, semester)
        .find((one: Group): boolean => one.rule.type === type && one.rule.group === group);
    if (found === undefined)
        return;
    const drafts: Draft[] = courseBoxesRead(codeOf(module), semester)
        .filter((box: Box): boolean => box.type === type && box.group === group && box.state === "open"
            && changeable(box) && ahead(box))
        .flatMap((box: Box): Draft[] => {
            const week: Session[] = found.sessions.filter((one: Session): boolean =>
                mondayOf(berlinDateOf(new Date(one.start))) === weekOf(box));
            const session: Session | undefined = week.find((one: Session): boolean =>
                weekdayOf(berlinDateOf(new Date(one.start))) === weekdayOf(box.day)) ?? week[0];
            const draft: Draft | undefined =
                session === undefined ? undefined : draftSet(draftOf(box), targetOf(found, session));
            return draft !== undefined && draftMoved(draft, box) ? [draft] : [];
        });
    draftsWrite(module, type, semester, drafts);
}

/**
 * Writes a group into the plan of a module as Claude sends it, see the top of this file, in place of every to-do
 * of the same type, group and semester: one weekly to-do of its one slot, see {@link groupWrite}, its sessions every
 * day of its slot in its weeks the university teaches, see {@link datesOf}; my boxes that go to it take its sessions
 * anew, see {@link groupBoxesMove}.
 * - `rule`: The rule of the group, without extras, since a group meets weekly, so a group sent without them is right.
 * - `days`: The days of its sessions.
 * - `id`: Identifier of the to-do written.
 *
 * @param change - The group with its rule, as sent
 * @returns Identifier of the group written
 * @throws {Error} - When there is no such module folder, the rule is not well formed, has no group or not one slot,
 *   it holds no session, the link online is no web address, or a box cannot be written
 */
export function groupPut(change: GroupNew): string {
    folderCheck(change.module);
    const rule: Rule = { ...change.rule, extras: [] };
    ruleCheck(rule);
    const days: string[] = datesOf(rule).map((date: RuleDate): string => date.day);
    if (rule.group === "" || rule.slots.length !== 1 || days.length === 0)
        throw new Error(`No group of sessions: ${JSON.stringify(rule)}`);
    groupsTake({ module: change.module, type: rule.type, group: rule.group, semester: rule.semester });
    const id: string = groupWrite(change.module, rule, days);
    groupBoxesMove(change.module, rule.type, rule.group, rule.semester);
    return id;
}

/**
 * Makes or changes a group as the form of a series sends it, see the top of this file, or only tells what that would
 * make, for the preview of the form: its sessions are the dates of its slots in its weeks, see {@link datesOf}, the days
 * the university does not teach left out, each a session but those I marked cancelled, see `states`
 * of {@link GroupChange}, and, of a group there already, the dates of its weeks it did not meet on, as its `EXDATE`s
 * said, while not marked open again. Written, it takes the place of the group of its type, group and semester, one
 * to-do per slot, see {@link groupWrite}, pinned still while it was, see {@link pinPut}, and my boxes that go to it
 * take its sessions anew, see {@link groupBoxesMove}.
 * - `rule`: The rule as sent, without extras and times of their own.
 * - `old`: The group there already, `undefined` for none.
 * - `met`: The days it met on.
 * - `skipped`: The dates of its weeks it did not meet on.
 * - `dates`: The dates of the rule.
 * - `cancelled`: Tells whether a date is cancelled.
 * - `shared`: Whether its place, what it does online or its tutors changed.
 * - `planned`: Its sessions after the change, cancelled ones too, and those of the group there already it loses.
 * - `time`, `minutes`: The start and the length of a date.
 * - `was`: The session of the group there already on its day, `undefined` for none.
 * - `had`: Whether the group there already had the date, as a session or cancelled.
 * - `days`: The days of the sessions of a slot.
 *
 * @param change - The group, as the form sends it
 * @returns Its sessions after the change as the boxes of a series, cancelled and removed ones too, by their days
 * @throws {Error} - When there is no such module folder, the rule is not well formed or has no group, a new group is
 *   there already or a group changed is not, it keeps no session, the link online is no web address, or a box cannot
 *   be written
 */
export function groupApply(change: GroupChange): Planned[] {
    folderCheck(change.module);
    const rule: Rule = { ...change.rule, extras: [], times: {} };
    ruleCheck(rule);
    const was: string = change.was || rule.group;
    const groups: Group[] = groupsRead(change.module, rule.semester)
        .filter((group: Group): boolean => group.rule.type === rule.type);
    const old: Group | undefined = groups.find((group: Group): boolean => group.rule.group === was);
    if (rule.group === "" || change.made !== (old === undefined))
        throw new Error(`${change.made ? "A group there already" : "No group"}: ${rule.type} ${was}`);
    if (was !== rule.group && groups.some((group: Group): boolean => group.rule.group === rule.group))
        throw new Error(`A group there already: ${rule.type} ${rule.group}`);
    const met: Set<string> = new Set((old?.sessions ?? [])
        .map((session: Session): string => dayOfStart(session.start)));
    const skipped: Set<string> = new Set(old === undefined ? [] : datesOf(old.rule)
        .map((date: RuleDate): string => date.day).filter((day: string): boolean => !met.has(day)));
    const dates: RuleDate[] = datesOf(rule);
    const cancelled: (date: RuleDate) => boolean = (date: RuleDate): boolean =>
        (change.states?.[date.day] ?? (skipped.has(date.day) ? "university" : "open")) === "university";
    const shared: boolean = old !== undefined
        && JSON.stringify([old.rule.location, old.rule.online, old.rule.onlineLink, old.rule.passcode, old.rule.attendees])
        !== JSON.stringify([rule.location, rule.online, rule.onlineLink, rule.passcode, rule.attendees]);
    const planned: Planned[] = [
        ...dates.map((date: RuleDate): Planned => {
            const time: string = slotMomentOf(date.day, date.start);
            const minutes: number | null = slotLengthOf(date);
            const was: Session | undefined = old?.sessions
                .find((session: Session): boolean => dayOfStart(session.start) === date.day);
            const had: boolean = was !== undefined || skipped.has(date.day);
            return {
                id: "", day: date.day, time: time, minutes: minutes, number: "",
                state: cancelled(date) ? "university" : had ? "open" : "new", pushed: false, editable: true,
                retimable: false, attendees: rule.attendees,
                change: !had ? "new" : shared || (was === undefined) !== cancelled(date)
                    || (was !== undefined && (was.start !== (time || date.day) || was.minutes !== minutes))
                    ? "changed" : "",
            };
        }),
        ...(old?.sessions ?? [])
            .filter((session: Session): boolean => !dates.some((date: RuleDate): boolean =>
                date.day === dayOfStart(session.start)))
            .map((session: Session): Planned => ({
                id: "", day: dayOfStart(session.start), time: session.start === dayOfStart(session.start) ? ""
                    : session.start, minutes: session.minutes,
                number: "", state: "open", pushed: false, editable: false, retimable: false, change: "removed",
                attendees: old?.rule.attendees ?? [],
            })),
    ].sort((first: Planned, second: Planned): number =>
        (first.time || first.day).localeCompare(second.time || second.day));
    if (change.dry)
        return planned;
    if (dates.every(cancelled))
        throw new Error(`No session of group ${rule.type} ${rule.group} of ${change.module}`);
    if (was !== rule.group)
        groupRename(change.module, rule.type, rule.semester, was, rule.group);
    groupsTake({ module: change.module, type: rule.type, group: rule.group, semester: rule.semester });
    rule.slots.forEach((slot: Slot, index: number): void => {
        const days: string[] = dates.filter((date: RuleDate): boolean => date.slot === index && !cancelled(date))
            .map((date: RuleDate): string => date.day);
        if (days.length > 0)
            groupWrite(change.module, { ...rule, slots: [slot] }, days);
    });
    if (old?.pinned === true)
        pinPut(change.module, rule.type, rule.semester, rule.group);
    groupBoxesMove(change.module, rule.type, rule.group, rule.semester);
    return planned;
}

/**
 * Renames a group everywhere, as the form of a group sends a new name for it, see {@link groupApply}: the `X-GROUP`
 * of its to-dos, which repeat, so they are read as groups, see {@link groupsRead}, of my boxes that go to it, done
 * ones too, so the group pinned, the group of my series, keeps its new name, and of every entry of the log of the
 * module I went to it in; of its type and semester only, an entry without semester by its day.
 * - `plan`: The plan of the module.
 * - `files`: The plan and the log of the module, those there.
 * - `taken`: Whether an entry goes to the group.
 *
 * @param module - Name of the folder of the module, like `IN0004_EinfuehrungRechnerarchitektur`
 * @param type - Type of the group, like `TU`
 * @param semester - Its semester, like `2026W`
 * @param was - Its name before, like `Mo-0800-1`
 * @param group - Its new name, like `01`
 * @throws {Error} - When a file cannot be written
 */
function groupRename(module: string, type: string, semester: string, was: string, group: string): void {
    const plan: string = skillFileOf(module, planEnding);
    groupsRead(module, semester).filter((one: Group): boolean => one.rule.type === type && one.rule.group === was)
        .forEach((one: Group): void => one.ids.forEach((id: string): void =>
            propertiesPut(plan, id, [["x-group", [groupPropertyOf(group, one.pinned)]]])));
    const files: string[] = [planEnding, logEnding].map((ending: string): string => skillFileOf(module, ending))
        .filter((file: string): boolean => existsSync(file));
    const taken: (entry: Entry) => boolean = (entry: Entry): boolean => entry.type === type && entry.group === was
        && (entry.semester !== "" ? entry.semester : semesterOf(berlinDateOf(new Date(entry.start)))) === semester;
    files.forEach((file: string): void => {
        [...new Set(fileEntriesRead(file).filter(taken).map((entry: Entry): string => entry.id))]
            .forEach((id: string): void => propertiesPut(file, id, [["x-group", [group]]]));
    });
}

/**
 * Removes my series of a type of a module of a semester, as the bin of its form asks, see `src/day/series.ts`: each
 * of its boxes but those done goes, see `boxDelete` in `boxes.ts`; a box done stays, since its log entry points to it.
 * - `boxes`: Its boxes.
 *
 * @param gone - The module, the type and the semester, as sent
 * @returns How many boxes done stay
 * @throws {Error} - When there is no such module folder or series
 */
export function courseSeriesRemove(gone: Omit<GroupGone, "group">): number {
    folderCheck(gone.module);
    const boxes: Box[] = courseBoxesRead(codeOf(gone.module), gone.semester)
        .filter((box: Box): boolean => box.type === gone.type && box.number !== "");
    if (boxes.length === 0)
        throw new Error(`No series ${gone.type} of ${gone.semester} in ${gone.module}`);
    boxes.filter((box: Box): boolean => box.state !== "done").forEach((box: Box): void => boxDelete(box.id));
    return boxes.filter((box: Box): boolean => box.state === "done").length;
}

/**
 * Removes a group from the plan of a module, see {@link groupsTake}.
 *
 * @param gone - The group, as sent
 * @throws {Error} - When there is no such module folder or group
 */
export function groupRemove(gone: GroupGone): void {
    folderCheck(gone.module);
    if (groupsTake(gone) === 0)
        throw new Error(`No group ${gone.type} ${gone.group} of ${gone.semester} in ${gone.module}`);
}
