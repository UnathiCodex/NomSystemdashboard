/**
 * ## Course
 *
 * The course of a module in the semester of today,
 * which the page of the module shows above its chapters, one card per type,
 * see `src/editor/course.ts`:
 * its boxes of the plan of every type, its series and the groups of its tutorials;
 * the series of a box of the plan opens in the same form from the day,
 * see `src/day/series.ts`, read in the semester of that box.
 * A series is no rule in a file: the plan holds one box per lecture, see `boxes.ts`,
 * and the series of a type is read back from its boxes,
 * numbered across every weekday they fall on.
 * Its rule is the one most of its boxes follow, see {@link ruleOf};
 * a box that differs from it stays as it is,
 * and a box pushed to a later day counts on the day it left, see {@link datedOf}.
 * Extras are read back as well, so no line of a file holds a rule.
 * Its weeks skip every day the university does not teach, see {@link lectureFreeOf};
 * every other day of its slots has its box,
 * and one that does not take place is a box the university cancelled, `X-NUMBER:NONE`,
 * see `boxUniversity` in `boxes.ts`, never a day without box.
 * The boxes of my tutorials that go to a group follow the rule of my group:
 * my group is the one I pinned, a choice of mine, never read from my boxes,
 * see {@link pinnedOf}, and a box of another group is my own choice,
 * see {@link chosenIs}, which never moves the pin and which no pin moves.
 * A box of my tutorials is numbered by its week of the semester,
 * see {@link tutorialWeeksOf},
 * so groups that begin in the second week begin with `2`,
 * and a week the university cancelled keeps its place.
 *
 * The groups of the tutorials of a module lie in its plan beside my boxes,
 * one weekly to-do per group as TUMonline lists it, see {@link groupPut},
 * since a plan holds only to-dos, with no `STATUS` since it is nothing I do.
 * A to-do with `X-GROUP` and without `X-NUMBER` is a group, never a box of mine,
 * see `groupIs` in `boxes.ts`.
 * A group meeting on two weekdays is one such to-do per weekday,
 * read as one group, see {@link groupsRead}.
 * A group is the notice of the university,
 * so a change by the university goes into the group, never into my box,
 * see {@link groupApply} and {@link sessionApply}.
 * My open boxes that go to it take its sessions anew, see {@link groupBoxesMove};
 * a box I pushed, done or skipped is mine and follows no change of its group,
 * so a session I catch up on another day or online stays where I put it.
 *
 * Three changes write the boxes of a series, week by week, see {@link draftsOf},
 * each leaving every box done, cancelled by me or pushed where it is,
 * since those are mine, see {@link changeable},
 * and each numbering the boxes of the type anew by their places, see {@link numbersOf}:
 * its rule changed, see {@link seriesApply}, a group made mine, see {@link groupMine},
 * and one session of a group picked for its week, see {@link weekPick}.
 * Logging a tutorial moves no other week.
 * The reader offers each as a route, see `reader.ts`,
 * so Claude fills series and groups through the same code.
 *
 * A new box repeated weekly has such a rule too, see {@link repeatApply}.
 * The exams of a module are no series, see {@link examSet}.
 */

import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";
import {
    boxDelete,
    boxDrop,
    boxesAdd,
    boxFind,
    boxUniversity,
    groupIs,
    numberedTypes,
    overKeep,
    skillBoxesRead,
} from "./boxes.ts";
import {
    berlinDateOf,
    berlinDayStartOf,
    berlinInstantOf,
    berlinTimeOf,
    dayAdd,
    entriesRead,
    entryIdOf,
    entryRemove,
    fileEntriesRead,
    groupPropertyOf,
    icsTextOf,
    minutesOf,
    occurrenceLookup,
    occurrenceOwn,
    occurrencesTidy,
    propertiesPut,
    seriesCut,
    seriesDayRemove,
    seriesDayRestore,
    skillName,
    todoAppend,
    todoChange,
    weekdayOf,
} from "./calendar.ts";
import { attendeesAllow, semesterOf, skillTypes } from "./categories.ts";
import { skillLinkOf, titleOf } from "./documents.ts";
import {
    codeOf,
    moduleFolderOf,
    moduleFoldersRead,
    semesterFoldersRead,
} from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import {
    holidays,
    logEnding,
    planEnding,
    skillFileOf,
    skillLog,
    vaultPathOf,
} from "./sources.ts";

import type { Box, BoxNew, BoxState } from "./boxes.ts";
import type { Attendee, Entry, Online, Push, TodoFields } from "./calendar.ts";
import type { MaterialFolder } from "./notes.ts";
import type { CalendarSource } from "./sources.ts";

/**
 * A slot of a rule, one weekday of it with its time, see {@link Rule}.
 * Times empty for boxes without time, which keep only their `minutes`,
 * as a plain series by its length, see `reader/rules.ts`.
 */
export type Slot = {
    weekday: number;
    start: string;
    end: string;
    minutes?: number;
};

/**
 * A single date of a rule outside its weeks, see {@link Rule}.
 */
export type Extra = {
    day: string;
    start: string;
    end: string;
};

/**
 * The dates of the slots of a rule with times of their own,
 * other than those of their slot, by their days.
 */
export type Times = { [day: string]: Pick<Slot, "start" | "end"> };

/**
 * Where a box, a session or an entry takes place: its place,
 * what it does online and its people.
 */
type Place = Online & Pick<Entry, "location" | "locationLink" | "attendees">;

/**
 * A weekly rule, of a series or of a group, see the top of this file.
 *
 * - `slots`: Each weekday once, a group has one.
 * - `extras`: None for every group.
 * - `locationLink`: The place keeping the link it has
 *   or taking that of `Places.md` or `Rooms.md`, see `placeLinkOf` in `places.ts`.
 * - `first`, `last`: Its weeks, an extra may lie before or after them.
 * - `times`: Left out as a group is written.
 * - `group`: Of a group its own, of my tutorials my group, see {@link pinnedOf}.
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
 * A series of the course, its rule read back from its boxes, see {@link ruleOf}.
 */
export type Series = {
    rule: Rule;
    count: number;
};

/**
 * A session of a group, as the page shows it.
 *
 * - `id`: The `UID` of its to-do and its start in it, see `entryIdOf` in `calendar.ts`.
 * - `start`: Of a group without times its day.
 * - `location` up to `attendees`: Those of its to-do,
 *   or its own once the university changed it alone, see {@link sessionApply}.
 */
export type Session = Place & {
    id: string;
    start: string;
    minutes: number;
    changed: boolean;
};

/**
 * A group of the tutorials of a module, as the page shows it.
 *
 * - `ids`: The `UID`s of its to-dos, one per weekday it meets on
 *   and per part a change from a day on left, see {@link groupApply},
 *   and of each session changed alone.
 * - `rule`: Read back from its sessions from today on, else from all,
 *   so a group changed from today on shows its change.
 */
export type Group = {
    ids: string[];
    rule: Rule;
    sessions: Session[];
    pinned: boolean;
};

/**
 * The course of a module in the semester of today, as the page shows it.
 *
 * - `folders`: The folder of the material of the semester of each type,
 *   also one not there yet, which a click on it makes,
 *   see `semesterFoldersRead` in `notes.ts`.
 * - `links`: The folder a box of each type links in the semester, its `ALTREP`,
 *   as the reader writes it now, see `skillLinkOf` in `documents.ts`.
 * - `learned`: My own learning of the module logged without a box of the plan,
 *   see {@link learnedRead}; what I learned from a box shows as that box.
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
 * A session of my own learning of a module,
 * a skill entry of the log without type and without the box it was logged from,
 * as the card `Learning` of the page of the module lists it.
 */
export type Learned = Place & {
    id: string;
    day: string;
    time: string;
    minutes: number;
    note: string;
};

/**
 * A change of a series, as the form of a series sends it, see {@link seriesApply}.
 *
 * - `old`: The rule as read back when the form opened, `null` for a new series.
 * - `before`: For each slot, the weekday of the slot of `old` whose boxes it takes,
 *   0 for a slot added; left out, each slot takes those of its own weekday.
 * - `states`: The state I gave a box in the form, by its identifier,
 *   a new one by its day, a new one only cancelled by the university.
 * - `dry`: Only tell what the change would make, for the preview, writing nothing.
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
 * A group made mine, see {@link groupMine}, the group empty to have none.
 */
export type MineChange = {
    module: string;
    type: string;
    group: string;
    dry?: boolean;
};

/**
 * One session of a group picked for its week, see {@link weekPick}.
 *
 * - `extra`: Whether the session becomes a box of its own besides the box of its week,
 *   as a second tutorial in one week.
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
 */
export type GroupNew = {
    module: string;
    rule: Rule;
};

/**
 * A group as the form of a series makes or changes it, see {@link groupApply}.
 *
 * - `rule`: No extras and no times of its own, since a group meets weekly.
 * - `made`: A new group, so none of its type, group and semester may be there yet.
 * - `was`: The name of the group before I renamed it, see {@link groupRename}.
 * - `states`: The dates of its slots I marked cancelled or open again, by their days.
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
 * One session of a group the university changed alone, see {@link sessionApply}.
 */
export type SessionChange = {
    module: string;
    type: string;
    group: string;
    semester: string;
    id: string;
    start: string;
    end: string;
    location: string;
};

/**
 * A group to remove, see {@link groupRemove}.
 */
export type GroupGone = {
    module: string;
    type: string;
    group: string;
    semester: string;
};

/**
 * A new box repeated weekly, see {@link repeatApply}.
 *
 * - `box`: Without its day, time, length and deadline, which each date sets.
 * - `states`: As those of a series, see {@link SeriesChange}, each new, so by its day.
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
 * Its kind is its `X-NUMBER`, both times empty to keep its times.
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
 * - `state`: `new` for a new one, `university` for a new one I cancelled.
 * - `editable`: Whether I may skip it or mark it cancelled by the university:
 *   a to-do of the new system, no date of a series of the file, not done; a new one too.
 * - `retimable`: See {@link retimable}, a new one too.
 * - `change`: Empty for one that stays as it is, or whose state alone changes.
 * - `chained`: Of a plain series, whether it is a day of another series of its chain,
 *   only shown, see `plannedOf` in `rules.ts`.
 * - `location`, `locationLink`: Only of a session of a group
 *   the university changed alone.
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
    location?: string;
    locationLink?: string;
};

/**
 * What a rule is read back from, see {@link ruleOf}: a box at its place in its series,
 * see {@link datedOf}, or a session of a group.
 */
type Dated = Pick<
    Box,
    "day" | "time" | "minutes" | "location" | "locationLink" | "attendees"
> &
    Online & { group?: string };

/**
 * A date of a rule, see {@link datesOf},
 * with the place of its slot in the rule, -1 for an extra.
 */
type RuleDate = Extra & {
    slot: number;
    minutes?: number;
};

/**
 * What of a box a change of a series sets, see {@link draftSet}.
 */
type Field = "day" | "time" | "location" | "online" | "attendees" | "group";

/**
 * A date of a series after a change, see {@link draftsOf}.
 *
 * - `before`: The weekday the box it takes fell on before the change,
 *   that of its slot as the form opened, else its own.
 * - `made`: Whether it gets a new box while no box of its week is there to take.
 * - `added`: Whether it is a date of a slot or an extra added in the form,
 *   which takes only a box of its own weekday, never one of another day of its week,
 *   so a Thursday added never takes the box of a Monday taken out.
 * - `retimed`: Whether I typed its times anew for its day in the form,
 *   which a box a change may not change otherwise takes too, see {@link retimable}.
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
 * A box of a type as a change of a series plans it,
 * see {@link draftsOf}, before anything is written, its box `null` for a new one.
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
 * Everything of a box a change sets, see {@link draftSet}.
 */
const allFields: Field[] = ["day", "time", "location", "online", "attendees", "group"];

/**
 * Most weeks a rule may span, about a year,
 * so a slip of a year typed makes no hundreds of boxes.
 */
const ruleWeeks: number = 53;

const weekLength: number = 7 * 24 * 60 * 60 * 1000;

/**
 * Type of the exams of a module, see {@link examSet}.
 */
const examType: string = "FA";

/**
 * The kinds of an exam, its `X-NUMBER`, in the order they come in a semester.
 */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/**
 * Regions whose holidays the university keeps, see {@link lectureFreeOf}:
 * Germany and Bavaria, where TUM lies.
 */
const universityRegions: string[] = ["DE", "BY"];

/**
 * Dates of the semester the university does not teach on, see {@link lectureFreeOf},
 * as `Termine und Feiertage` of TUM names them beside the holidays,
 * see `Tum_TermineFristen` in my university records.
 */
const lectureFreeTitles: string[] = [
    "Vorlesungsfreie Zeit (TUM)",
    "Weihnachtsferien (TUM)",
    "Osterferien (TUM)",
    "Pfingstferien (TUM)",
    "Dies Academicus (TUM)",
];

/**
 * Gives the Monday of the week of a day, which names its week.
 */
function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/**
 * Gives the instant of a time of a day in Berlin time.
 */
function instantOf(day: string, time: string): Date {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return berlinInstantOf(day, hours, minutes);
}

/**
 * Gives what of an item is online, see `Online` in `calendar.ts`.
 */
function onlineOf(item: Online): Online {
    return {
        online: item.online,
        onlineLink: item.onlineLink,
        onlineChannel: item.onlineChannel,
        onlineTitle: item.onlineTitle,
    };
}

/**
 * Gives the place, what is online and the people of an item, see {@link Place}.
 */
function placeOf(item: Place): Place {
    return {
        location: item.location,
        locationLink: item.locationLink,
        ...onlineOf(item),
        attendees: item.attendees,
    };
}

/**
 * Gives the first day of a semester, from which its course is read for a year,
 * so a retake after its end belongs to it.
 */
function semesterBeginOf(semester: string): string {
    return `${semester.slice(0, 4)}-${semester.endsWith("W") ? "10" : "04"}-01`;
}

/**
 * Gives of a list the value whose key most of them have,
 * the earliest of those equally many, `undefined` for none.
 */
function modeOf<T>(values: T[], keyOf: (value: T) => string): T | undefined {
    const counts: Map<string, number> = new Map();
    values.forEach((value: T): void => {
        counts.set(keyOf(value), (counts.get(keyOf(value)) ?? 0) + 1);
    });
    return values.reduce(
        (best: T | undefined, value: T): T | undefined =>
            best === undefined ||
            (counts.get(keyOf(value)) ?? 0) > (counts.get(keyOf(best)) ?? 0)
                ? value
                : best,
        undefined,
    );
}

/**
 * Gives a box at its place in its series:
 * where it stood before its first push, see `Push` in `calendar.ts`,
 * else where it stands,
 * so a lecture pushed to the next day counts on its own day.
 */
function datedOf(box: Box): Dated {
    const left: Push | undefined = box.pushed[0];
    return left === undefined
        ? box
        : {
              ...box,
              day: left.day,
              time: left.time,
              minutes: left.minutes ?? box.minutes,
          };
}

/**
 * Gives the week of a box in its series, by its Monday, see {@link datedOf}.
 */
function weekOf(box: Box): string {
    return mondayOf(datedOf(box).day);
}

/**
 * Takes out of the boxes of a week the first that falls on a weekday, else, with `any`,
 * the earliest of them, see {@link draftsOf} and {@link ruleOf}.
 * The one taken goes out of `boxes`.
 */
function weekTake<T>(
    boxes: T[],
    weekday: number,
    any: boolean,
    dayOf: (box: T) => string,
): T | undefined {
    let found: number = boxes.findIndex(
        (box: T): boolean => weekdayOf(dayOf(box)) === weekday,
    );
    if (found === -1 && any && boxes.length > 0) found = 0;
    return found === -1 ? undefined : boxes.splice(found, 1)[0];
}

/**
 * Gives the times of what a rule is read back from,
 * as a slot or an extra has them, both empty without time.
 */
function timesOf(item: Dated): [string, string] {
    return item.time === ""
        ? ["", ""]
        : [
              berlinTimeOf(new Date(item.time)),
              berlinTimeOf(
                  new Date(Date.parse(item.time) + (item.minutes ?? 0) * 60 * 1000),
              ),
          ];
}

/**
 * Gives the days the university does not teach from one day to another,
 * which a series of my course skips:
 * every day of a holiday of `Holidays.ics` whose regions,
 * the codes in the bracket at the end of its `SUMMARY`,
 * name one of {@link universityRegions},
 * and every day of a date of {@link lectureFreeTitles} of `University.ics`;
 * never a holiday only of Austria, nor another date of the semester.
 */
function lectureFreeOf(first: string, last: string): Set<string> {
    const regionsOf: (title: string) => string[] = (title: string): string[] =>
        /\(([^()]*)\)$/
            .exec(title)?.[1]
            .split(",")
            .map((code: string): string => code.trim()) ?? [];
    const skipped: Set<string> = new Set();
    entriesRead(holidays, berlinDayStartOf(first), berlinDayStartOf(dayAdd(last, 1)))
        .filter(
            (entry: Entry): boolean =>
                entry.allDay &&
                ((entry.category === "Holiday" &&
                    regionsOf(entry.title).some((code: string): boolean =>
                        universityRegions.includes(code),
                    )) ||
                    (entry.category === "University" &&
                        lectureFreeTitles.includes(entry.title))),
        )
        .forEach((entry: Entry): void => {
            for (let day: string = entry.start; day < entry.end; day = dayAdd(day, 1))
                skipped.add(day);
        });
    return skipped;
}

/**
 * Reads back the weekly rule of a series or a group:
 * its slots, each weekday at least two of what it follows fall on,
 * else the one most of them fall on, with the time and length most of them have there;
 * the place, what they do online and the people most of them have,
 * the earliest of those equally many;
 * its weeks, from the first box on the weekday of a slot to the last,
 * the days the university does not teach skipped,
 * a box on another day of a week taking the place of a missing one;
 * the times of a box on the day of a slot other than those of its slot,
 * as times of its own, see {@link Times};
 * and every other box as an extra, one more in a week,
 * or one outside its weeks, or one on a day the university does not teach.
 * - `grouped`: The first box of a week at a group:
 *   a week I went to another group stays a week of the series, never an extra,
 *   also before the first week on a slot,
 *   so its weeks begin with the week of that box.
 *
 * @param items - What the rule follows: the boxes of a series,
 *   of my tutorials those of my group, or the sessions of a group; at least one
 * @param all - What its days come from: every box of the series,
 *   also of a week at another group
 */
function ruleOf(
    type: string,
    items: Dated[],
    all: Dated[],
    group: string,
    semester: string,
): Rule {
    const counts: Map<number, number> = new Map();
    items.forEach((item: Dated): void => {
        counts.set(weekdayOf(item.day), (counts.get(weekdayOf(item.day)) ?? 0) + 1);
    });
    let weekdays: number[] = [...counts.keys()]
        .filter((weekday: number): boolean => (counts.get(weekday) ?? 0) >= 2)
        .sort();
    if (weekdays.length === 0)
        weekdays = [
            weekdayOf(
                modeOf(items, (item: Dated): string => String(weekdayOf(item.day)))
                    ?.day ?? all[0].day,
            ),
        ];
    const slots: Slot[] = weekdays.map((weekday: number): Slot => {
        const timed: Dated | undefined = modeOf(
            items.filter(
                (item: Dated): boolean =>
                    item.time !== "" && weekdayOf(item.day) === weekday,
            ),
            (item: Dated): string =>
                `${berlinTimeOf(new Date(item.time))} ${item.minutes}`,
        );
        const [start, end]: [string, string] =
            timed === undefined ? ["", ""] : timesOf(timed);
        const long: Dated | undefined =
            timed !== undefined
                ? undefined
                : modeOf(
                      items.filter(
                          (item: Dated): boolean =>
                              item.time === "" &&
                              (item.minutes ?? 0) > 0 &&
                              weekdayOf(item.day) === weekday,
                      ),
                      (item: Dated): string => String(item.minutes),
                  );
        return long === undefined
            ? { weekday: weekday, start: start, end: end }
            : { weekday: weekday, start: "", end: "", minutes: long.minutes ?? 0 };
    });
    const placed: Dated | undefined = modeOf(
        items,
        (item: Dated): string => item.location,
    );
    const met: Dated | undefined = modeOf(items, (item: Dated): string =>
        JSON.stringify(onlineOf(item)),
    );
    const people: Dated | undefined = modeOf(items, (item: Dated): string =>
        JSON.stringify(item.attendees),
    );
    const sorted: Dated[] = [...all].sort((first: Dated, second: Dated): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
    let onSlots: string[] = sorted
        .map((item: Dated): string => item.day)
        .filter((day: string): boolean => weekdays.includes(weekdayOf(day)));
    if (onSlots.length === 0) onSlots = sorted.map((item: Dated): string => item.day);
    const grouped: Dated | undefined = sorted.find(
        (item: Dated): boolean => (item.group ?? "") !== "",
    );
    const from: string =
        grouped !== undefined && mondayOf(grouped.day) < mondayOf(onSlots[0])
            ? mondayOf(grouped.day)
            : onSlots[0];
    const to: string = onSlots[onSlots.length - 1];
    const skipped: Set<string> = lectureFreeOf(from, to);
    const days: string[] = [];
    const extras: Dated[] = sorted.filter(
        (item: Dated): boolean =>
            mondayOf(item.day) < mondayOf(from) || mondayOf(item.day) > mondayOf(to),
    );
    const times: Times = {};
    for (let week: string = mondayOf(from); week <= to; week = dayAdd(week, 7)) {
        const free: Dated[] = sorted.filter(
            (item: Dated): boolean => mondayOf(item.day) === week,
        );
        const missing: string[] = [];
        slots.forEach((slot: Slot): void => {
            const day: string = dayAdd(week, slot.weekday - 1);
            if (day < from || day > to || skipped.has(day)) return;
            const taken: Dated | undefined = weekTake(
                free,
                slot.weekday,
                false,
                (item: Dated): string => item.day,
            );
            const [start, end]: [string, string] =
                taken === undefined ? ["", ""] : timesOf(taken);
            if (taken === undefined) missing.push(day);
            else days.push(taken.day);
            if (start !== "" && (start !== slot.start || end !== slot.end))
                times[day] = { start: start, end: end };
        });
        days.push(
            ...free.slice(0, missing.length).map((item: Dated): string => item.day),
        );
        extras.push(...free.slice(missing.length));
    }
    days.sort();
    return {
        type: type,
        slots: slots,
        extras: extras
            .map((item: Dated): Extra => {
                const [start, end]: [string, string] = timesOf(item);
                return { day: item.day, start: start, end: end };
            })
            .sort((first: Extra, second: Extra): number =>
                first.day.localeCompare(second.day),
            ),
        location: placed?.location ?? "",
        locationLink: placed?.locationLink ?? "",
        online: met?.online ?? "",
        onlineLink: met?.onlineLink ?? "",
        onlineChannel: met?.onlineChannel ?? "",
        onlineTitle: met?.onlineTitle ?? "",
        attendees: people?.attendees ?? [],
        first: days[0] ?? from,
        last: days[days.length - 1] ?? to,
        times: times,
        group: group,
        semester: semester,
    };
}

/**
 * Gives the dates of a rule, by their days:
 * the day of each of its slots in each week from its first day to its last, but,
 * for a rule of the university, of a numbered type,
 * the days it does not teach, see {@link lectureFreeOf},
 * and its extras, each with its times, those of its slot or its own.
 */
function datesOf(rule: Rule): RuleDate[] {
    const skipped: Set<string> = numberedTypes.includes(rule.type)
        ? lectureFreeOf(rule.first, rule.last)
        : new Set();
    const dates: RuleDate[] = rule.extras.map((extra: Extra): RuleDate => ({
        ...extra,
        slot: -1,
    }));
    for (
        let week: string = mondayOf(rule.first);
        week <= rule.last;
        week = dayAdd(week, 7)
    )
        rule.slots.forEach((slot: Slot, index: number): void => {
            const day: string = dayAdd(week, slot.weekday - 1);
            const own: Pick<Slot, "start" | "end"> = rule.times?.[day] ?? slot;
            if (rule.first <= day && day <= rule.last && !skipped.has(day))
                dates.push({
                    day: day,
                    start: own.start,
                    end: own.end,
                    slot: index,
                    minutes: slot.minutes,
                });
        });
    return dates.sort(
        (first: RuleDate, second: RuleDate): number =>
            first.day.localeCompare(second.day) ||
            first.start.localeCompare(second.start),
    );
}

/**
 * Gives my group of a type: the group I pinned, see {@link pinPut}, empty while none is.
 */
function pinnedOf(groups: Group[], type: string): string {
    return (
        groups.find((group: Group): boolean => group.rule.type === type && group.pinned)
            ?.rule.group ?? ""
    );
}

/**
 * Tells whether a box of my tutorials is my own choice:
 * a session I took from a group by hand as a box of its own,
 * or a week I picked for a group, by its `X-GROUP` other than the group pinned;
 * a box of the group pinned, or without group, follows the pin.
 */
function chosenIs(box: Box, pinned: string): boolean {
    return box.group !== "" && box.group !== pinned;
}

/**
 * Pins a group of a type: `X-PINNED=TRUE` on the `X-GROUP` of each to-do of it,
 * none on those of every other group of the type and semester; no group named pins none.
 * Writes only a to-do that changes.
 *
 * @throws {Error} - When the plan cannot be written
 */
function pinPut(module: string, type: string, semester: string, group: string): void {
    const file: string = skillFileOf(module, planEnding);
    groupsRead(module, semester)
        .filter(
            (one: Group): boolean =>
                one.rule.type === type && one.pinned !== (one.rule.group === group),
        )
        .forEach((one: Group): void =>
            one.ids.forEach((id: string): void =>
                propertiesPut(file, id, [
                    [
                        "x-group",
                        [groupPropertyOf(one.rule.group, one.rule.group === group)],
                    ],
                ]),
            ),
        );
}

/**
 * Gives the first day of lectures of a semester from `University.ics`,
 * `undefined` while the file names none.
 */
function lecturesBeginOf(semester: string): string | undefined {
    const begin: string = semesterBeginOf(semester);
    return entriesRead(
        holidays,
        berlinDayStartOf(begin),
        berlinDayStartOf(dayAdd(begin, 183)),
    ).find(
        (entry: Entry): boolean =>
            entry.allDay &&
            entry.category === "University" &&
            entry.title === `Vorlesungsbeginn ${semester}`,
    )?.start;
}

/**
 * Gives the weeks of a type with groups, by their Mondays:
 * every week from the week of the first day of lectures of its semester,
 * or of the first session of its groups while that lies before or no first day is known,
 * to the last session, that is not wholly free of lectures,
 * so a week the university cancelled one session of keeps its place,
 * and a group added or changed numbers no week anew; none for a type without groups.
 *
 * @param days - Days of sessions of a group as the form of a group changes it,
 *   see {@link groupApply}
 */
function tutorialWeeksOf(groups: Group[], type: string, days: string[] = []): string[] {
    const starts: string[] = [
        ...days,
        ...groups
            .filter((group: Group): boolean => group.rule.type === type)
            .flatMap((group: Group): string[] =>
                group.sessions.map((session: Session): string =>
                    dayOfStart(session.start),
                ),
            ),
    ].sort();
    if (starts.length === 0) return [];
    const begin: string | undefined = lecturesBeginOf(semesterOf(starts[0]));
    const first: string = mondayOf(
        begin !== undefined && begin < starts[0] ? begin : starts[0],
    );
    const last: string = mondayOf(starts[starts.length - 1]);
    const free: Set<string> = lectureFreeOf(first, dayAdd(last, 4));
    const weeks: string[] = [];
    for (let week: string = first; week <= last; week = dayAdd(week, 7))
        if ([0, 1, 2, 3, 4].some((day: number): boolean => !free.has(dayAdd(week, day))))
            weeks.push(week);
    return weeks;
}

/**
 * Gives the number of the week of a day among the weeks of a type with groups:
 * of a day before them all `1`, of one after them all that of the last week.
 */
function weekNumberOf(weeks: string[], day: string): number {
    return Math.max(
        1,
        weeks.filter((week: string): boolean => week <= mondayOf(day)).length,
    );
}

/**
 * Stops a module folder of none of my modules, which no course reads or writes.
 *
 * @throws {Error} - When `NomSkillingmodules` holds no such module folder
 */
function folderCheck(module: string): void {
    if (!moduleFoldersRead().includes(module))
        throw new Error(`No module folder ${module}`);
}

/**
 * Reads the skill boxes of a module of a semester, see `skillBoxesRead` in `boxes.ts`,
 * read up to a year after the semester begins,
 * so a retake after its end is among them.
 */
function courseBoxesRead(code: string, semester: string): Box[] {
    return skillBoxesRead(dayAdd(semesterBeginOf(semester), 366))
        .filter(
            (box: Box): boolean =>
                box.module === code &&
                (box.semester === "" ? semesterOf(box.day) : box.semester) === semester,
        )
        .sort((first: Box, second: Box): number =>
            (first.time || first.day).localeCompare(second.time || second.day),
        );
}

/**
 * Reads my own learning of a module in a semester logged without a box,
 * see {@link Learned}, of the semester they state,
 * or of their day, read up to a year after the semester begins;
 * a whole-day entry counts not.
 */
function learnedRead(code: string, semester: string): Learned[] {
    const begin: string = semesterBeginOf(semester);
    return entriesRead(
        skillLog,
        berlinDayStartOf(begin),
        berlinDayStartOf(dayAdd(begin, 366)),
    )
        .filter(
            (entry: Entry): boolean =>
                entry.category === skillName &&
                entry.module === code &&
                entry.type === "" &&
                entry.planned === "" &&
                !entry.allDay &&
                (entry.semester === ""
                    ? semesterOf(berlinDateOf(new Date(entry.start)))
                    : entry.semester) === semester,
        )
        .map((entry: Entry): Learned => ({
            id: entry.id,
            day: berlinDateOf(new Date(entry.start)),
            time: entry.start,
            minutes: Math.round(
                (Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000),
            ),
            ...placeOf(entry),
            note: entry.note,
        }))
        .sort((first: Learned, second: Learned): number =>
            first.time.localeCompare(second.time),
        );
}

/**
 * Reads the groups of a module of a semester from its plan, its to-dos with `X-GROUP`,
 * each with its sessions, read up to a year after the semester begins,
 * and its rule read back from them, see {@link ruleOf};
 * the to-dos of one type and group as one group; none while the plan is missing.
 * - `ahead`: Those from today on.
 */
function groupsRead(module: string, semester: string): Group[] {
    const file: string = skillFileOf(module, planEnding);
    const begin: string = semesterBeginOf(semester);
    const today: string = berlinDateOf(new Date());
    const sessions: Entry[] = entriesRead(
        [{ folder: dirname(file), ending: basename(file) }],
        berlinDayStartOf(begin),
        berlinDayStartOf(dayAdd(begin, 366)),
    )
        .filter(
            (entry: Entry): boolean =>
                groupIs(entry) &&
                entry.category === skillName &&
                (entry.semester === ""
                    ? semesterOf(dayOfStart(entry.start))
                    : entry.semester) === semester,
        )
        .sort((first: Entry, second: Entry): number =>
            first.start.localeCompare(second.start),
        );
    const changed: Set<string> = new Set(
        existsSync(file)
            ? fileEntriesRead(file)
                  .filter((entry: Entry): boolean => entry.recurrence !== "")
                  .map(entryIdOf)
            : [],
    );
    const keyOf: (entry: Entry) => string = (entry: Entry): string =>
        `${entry.type} ${entry.group}`;
    return [...new Set(sessions.map(keyOf))]
        .map((key: string): Group => {
            const own: Entry[] = sessions.filter(
                (entry: Entry): boolean => keyOf(entry) === key,
            );
            const dated: Dated[] = own.map((entry: Entry): Dated => ({
                day: dayOfStart(entry.start),
                time: entry.allDay ? "" : entry.start,
                minutes: entry.minutes,
                ...placeOf(entry),
            }));
            const ahead: Dated[] = dated.filter(
                (item: Dated): boolean => item.day >= today,
            );
            return {
                ids: [
                    ...new Set(
                        own.flatMap((entry: Entry): string[] =>
                            changed.has(entryIdOf(entry))
                                ? [entry.id, entryIdOf(entry)]
                                : [entry.id],
                        ),
                    ),
                ],
                rule: ruleOf(
                    own[0].type,
                    ahead.length > 0 ? ahead : dated,
                    dated,
                    own[0].group,
                    semester,
                ),
                sessions: own.map((entry: Entry): Session => ({
                    id: entryIdOf(entry),
                    start: entry.start,
                    minutes: entry.minutes ?? 0,
                    ...placeOf(entry),
                    changed: changed.has(entryIdOf(entry)),
                })),
                pinned: own.some((entry: Entry): boolean => entry.pinned),
            };
        })
        .sort(
            (first: Group, second: Group): number =>
                first.rule.type.localeCompare(second.rule.type) ||
                first.rule.group.localeCompare(second.rule.group, undefined, {
                    numeric: true,
                }),
        );
}

/**
 * Reads back the series of a module from its boxes of a semester:
 * one per numbered type with boxes, its rule read back from all its boxes,
 * or from those of my group while they go to groups, see {@link pinnedOf}.
 */
function seriesListOf(boxes: Box[], semester: string, groups: Group[]): Series[] {
    return numberedTypes.flatMap((type: string): Series[] => {
        const typed: Box[] = boxes.filter((box: Box): boolean => box.type === type);
        const mine: string = pinnedOf(groups, type);
        const own: Box[] = typed.filter(
            (box: Box): boolean => mine === "" || box.group === mine,
        );
        return typed.length === 0
            ? []
            : [
                  {
                      rule: ruleOf(
                          type,
                          own.map(datedOf),
                          typed.map(datedOf),
                          mine,
                          semester,
                      ),
                      count: typed.length,
                  },
              ];
    });
}

/**
 * Reads the course of a module in a semester, the semester of today unless named,
 * like that of a box of the plan whose series opens from the day.
 *
 * @param module - Name of the folder of the module,
 *   or its code, as a box of the plan names it
 * @throws {Error} - When `NomSkillingmodules` holds no such module folder,
 *   or the semester is not written like `2026W`
 */
export function courseRead(module: string, named: string): Course {
    const folder: string = moduleFolderOf(codeOf(module)) ?? module;
    folderCheck(folder);
    const semester: string = named === "" ? semesterOf(berlinDateOf(new Date())) : named;
    if (!/^\d{4}[WS]$/.test(semester)) throw new Error(`No semester ${semester}`);
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
        links: Object.fromEntries(
            skillTypes.map((type: string): [string, string] => [
                type,
                skillLinkOf(codeOf(folder)),
            ]),
        ),
        file: vaultPathOf(skillFileOf(folder, planEnding)),
    };
}

/**
 * Tells whether a start and an end are well formed, as of a slot, an extra or an exam:
 * both a time well written, the start before the end.
 */
function timesRight(times: Pick<Slot, "start" | "end">): boolean {
    const time: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/;
    return (
        time.test(times.start) &&
        time.test(times.end) &&
        minutesOf(times.start) < minutesOf(times.end)
    );
}

/**
 * Tells whether a slot is well formed: its times well formed, see {@link timesRight},
 * or without times its length, more than nothing and at most a day.
 */
function slotRight(slot: Slot): boolean {
    return (
        timesRight(slot) ||
        (slot.start === "" &&
            slot.end === "" &&
            Number.isInteger(slot.minutes) &&
            (slot.minutes ?? 0) > 0 &&
            (slot.minutes ?? 0) <= 24 * 60)
    );
}

/**
 * Gives the length of a slot, an extra or a date: of its times, else its length,
 * `null` for none.
 */
function slotLengthOf(times: Pick<Slot, "start" | "end" | "minutes">): number | null {
    return times.start === ""
        ? (times.minutes ?? null)
        : minutesOf(times.end) - minutesOf(times.start);
}

/**
 * Gives the day of a start, an ISO instant in Berlin time or a day itself,
 * as a session of a group without times has it.
 */
function dayOfStart(start: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : berlinDateOf(new Date(start));
}

/**
 * Gives the start of a box of a date as ISO instant, empty for a date without times.
 */
function slotMomentOf(day: string, start: string): string {
    return start === "" ? "" : instantOf(day, start).toISOString();
}

/**
 * Tells whether the weeks of a rule are well formed:
 * slots on different weekdays, see {@link slotRight},
 * its first day on or before its last,
 * at most {@link ruleWeeks} weeks apart,
 * and its extras, at most {@link ruleWeeks} weeks from its first day,
 * so a slip of a year typed makes no box far away,
 * and the times of their own of its dates, see {@link timesRight}.
 */
function weeksRight(rule: Rule): boolean {
    const day: RegExp = /^\d{4}-\d{2}-\d{2}$/;
    const near: (other: string) => boolean = (other: string): boolean =>
        Math.abs(Date.parse(other) - Date.parse(rule.first)) <= ruleWeeks * weekLength;
    return (
        Array.isArray(rule.extras) &&
        rule.slots.length > 0 &&
        rule.slots.every(
            (slot: Slot): boolean =>
                Number.isInteger(slot.weekday) &&
                slot.weekday >= 1 &&
                slot.weekday <= 7 &&
                slotRight(slot),
        ) &&
        new Set(rule.slots.map((slot: Slot): number => slot.weekday)).size ===
            rule.slots.length &&
        day.test(rule.first) &&
        day.test(rule.last) &&
        rule.first <= rule.last &&
        near(rule.last) &&
        rule.extras.every(
            (extra: Extra): boolean =>
                day.test(extra.day) && near(extra.day) && timesRight(extra),
        ) &&
        Object.entries(rule.times ?? {}).every(
            ([own, times]: [string, Pick<Slot, "start" | "end">]): boolean =>
                day.test(own) && timesRight(times),
        )
    );
}

/**
 * Stops a rule not well formed: of a numbered type, its weeks well formed,
 * see {@link weeksRight}, a semester like `2026W`, well-formed people,
 * see `attendeesAllow` in `categories.ts`, and a group without spaces or empty.
 *
 * @throws {Error} - When it is not well formed
 */
function ruleCheck(rule: Rule): void {
    if (
        !numberedTypes.includes(rule.type) ||
        !weeksRight(rule) ||
        !/^\d{4}[WS]$/.test(rule.semester) ||
        !attendeesAllow(rule.attendees) ||
        !/^[\w-]*$/.test(rule.group)
    )
        throw new Error(`No rule of a series: ${JSON.stringify(rule)}`);
}

/**
 * Tells whether a change of a series may change or remove a box:
 * a to-do of the new system, no date of a series of the file, never pushed,
 * open or cancelled by the university;
 * never one done, which the log points to, nor one I cancelled or pushed,
 * which are my own decisions.
 */
function changeable(box: Box): boolean {
    return (
        box.editable &&
        box.todo &&
        !box.series &&
        box.pushed.length === 0 &&
        (box.state === "open" || box.state === "university")
    );
}

/**
 * Tells whether I may give a box another state in the form of its series:
 * a to-do of the new system, no date of a series of the file,
 * neither done, which the log decides,
 * nor pushed away from a day, as it shows on that day.
 */
function stateable(box: Box): boolean {
    return (
        box.editable &&
        box.todo &&
        !box.series &&
        box.state !== "done" &&
        box.state !== "pushed"
    );
}

/**
 * Tells whether a box takes the times I typed for its day in the form of its series:
 * a to-do of the new system, no date of a series of the file, never pushed,
 * whose times follow its pushes, see `boxPush` in `boxes.ts`,
 * but whatever its state and its day,
 * so a lecture done or over takes the times it really had,
 * while its log entry keeps its own.
 */
function retimable(box: Box): boolean {
    return box.editable && box.todo && !box.series && box.pushed.length === 0;
}

/**
 * Gives a box with the state I gave it in the form of its series,
 * as a change of the series then plans it: skipped, it keeps its number and its place;
 * cancelled by the university, its number is `NONE`;
 * open again, it takes its number anew, see {@link numbersOf}.
 * A box I may give no state, see {@link stateable},
 * and a state I may not give stay as they are.
 */
function stateSet(box: Box, state: BoxState | undefined): Box {
    if (
        state === undefined ||
        state === box.state ||
        !stateable(box) ||
        !["open", "dropped", "university"].includes(state)
    )
        return box;
    let number: string = box.number === "NONE" ? "" : box.number;
    if (state === "university") number = "NONE";
    return { ...box, state: state, number: number };
}

/**
 * Tells whether a box lies today or later in Berlin time,
 * the only kind a changed rule moves or removes,
 * so a box of a day over stays as it was, open or not,
 * but for the times I typed for its day, see {@link retimable}.
 */
function ahead(box: Box): boolean {
    return box.day >= berlinDateOf(new Date());
}

/**
 * Makes the draft of a box as it stands.
 */
function draftOf(box: Box): Draft {
    return {
        box: box,
        day: box.day,
        time: box.time,
        minutes: box.minutes,
        ...placeOf(box),
        group: box.group,
        number: box.number,
        removed: false,
    };
}

/**
 * Makes the draft of a new box of a date, with all of it.
 */
function madeDraftOf(target: Target): Draft {
    return {
        box: null,
        day: target.day,
        time:
            target.start === "" ? "" : instantOf(target.day, target.start).toISOString(),
        minutes: target.minutes,
        ...placeOf(target),
        group: target.group,
        number: "",
        removed: false,
    };
}

/**
 * Gives the date a session of a group sets the box of its week to, see {@link draftSet}:
 * all of it, its own once the university changed it alone, and the group.
 */
function targetOf(group: Group, session: Session): Target {
    const day: string = dayOfStart(session.start);
    return {
        day: day,
        start: session.start === day ? "" : berlinTimeOf(new Date(session.start)),
        minutes: session.minutes,
        ...placeOf(session),
        group: group.rule.group,
        before: weekdayOf(day),
        fields: allFields,
        made: true,
        added: false,
        retimed: false,
    };
}

/**
 * Sets a draft of a box from the date of the series it takes, see {@link draftsOf}:
 * what changed of it, see {@link Field}, the rest as it was,
 * a time kept at its time of day on a new day.
 */
function draftSet(draft: Draft, target: Target): Draft {
    const day: string = target.fields.includes("day") ? target.day : draft.day;
    let start: string = draft.time === "" ? "" : berlinTimeOf(new Date(draft.time));
    if (target.fields.includes("time")) start = target.start;
    const from: (field: Field) => Draft | Target = (field: Field): Draft | Target =>
        target.fields.includes(field) ? target : draft;
    return {
        ...draft,
        day: day,
        time: start === "" ? "" : instantOf(day, start).toISOString(),
        minutes: from("time").minutes,
        location: from("location").location,
        locationLink: from("location").locationLink,
        ...onlineOf(from("online")),
        attendees: from("attendees").attendees,
        group: from("group").group,
    };
}

/**
 * Plans a change of a series week by week, from the first week it reaches to its last:
 * each date of a week takes the box of the week
 * that fell on the weekday of its slot before, see `before` of {@link Target}, else,
 * but for a date added, the earliest box of the week no date took yet,
 * like a lecture moved once to another day;
 * a box a change may not change, see {@link changeable}, stays as it is all the same,
 * so its date gets no new box,
 * but takes the times I typed for its date where they may change,
 * see {@link retimable};
 * a box a change may change takes what changed of its date, see {@link draftSet};
 * a date without box gets a new one while it is made,
 * and every other box of the week a change may change goes.
 * A box of a week outside those reached stays as it is,
 * but for its number, see {@link numbersOf}.
 *
 * @param touched - Tells whether the change may change a box,
 *   like not one of a week I go to another group
 * @returns The drafts of every box of the series, removed ones too, and of the new ones
 */
function draftsOf(
    series: Box[],
    targets: Target[],
    weeks: [string, string],
    touched: (box: Box) => boolean,
): Draft[] {
    const [from, to]: [string, string] = weeks;
    const drafts: Draft[] = series
        .filter((box: Box): boolean => weekOf(box) < from || weekOf(box) > to)
        .map(draftOf);
    const seriesDayOf: (box: Box) => string = (box: Box): string => datedOf(box).day;
    for (let week: string = from; week <= to; week = dayAdd(week, 7)) {
        const dates: Target[] = targets.filter(
            (target: Target): boolean => mondayOf(target.day) === week,
        );
        const free: Box[] = series.filter((box: Box): boolean => weekOf(box) === week);
        const taken: (Box | undefined)[] = dates.map((target: Target): Box | undefined =>
            weekTake(free, target.before, false, seriesDayOf),
        );
        dates.forEach((target: Target, index: number): void => {
            if (!target.added)
                taken[index] ??= weekTake(free, target.before, true, seriesDayOf);
        });
        dates.forEach((target: Target, index: number): void => {
            const box: Box | undefined = taken[index];
            if (box === undefined && target.made) drafts.push(madeDraftOf(target));
            else if (box !== undefined && touched(box))
                drafts.push(draftSet(draftOf(box), target));
            else if (box !== undefined && target.retimed && retimable(box))
                drafts.push(draftSet(draftOf(box), { ...target, fields: ["time"] }));
            else if (box !== undefined) drafts.push(draftOf(box));
        });
        drafts.push(
            ...free.map((box: Box): Draft => ({
                ...draftOf(box),
                removed: touched(box),
            })),
        );
    }
    return drafts;
}

/**
 * Numbers the boxes of a type of a semester after a change,
 * the way `boxUniversity` in `boxes.ts` keeps them:
 * by their places in the series, see {@link datedOf},
 * each box one more than the box before it, a new one, one done,
 * one I skipped and one I pushed alike, so no number stands twice,
 * like a Thursday added before a Monday I skipped;
 * only its number changes, never its state, day or time;
 * one the university cancelled keeps `NONE` and counts not;
 * one of another app or one date of a series of a file,
 * which the dashboard does not number, keeps its number, the next going on from it.
 * Of a type with groups each box takes the number of its week instead,
 * a second box of a week the same, see {@link weekNumberOf}.
 *
 * @param drafts - Numbered in place
 */
function numbersOf(drafts: Draft[], weeks: string[]): void {
    const orderOf: (draft: Draft) => string = (draft: Draft): string => {
        const left: Push | undefined = draft.box?.pushed[0];
        return left === undefined ? draft.time || draft.day : left.time || left.day;
    };
    let last: number = 0;
    drafts
        .filter((draft: Draft): boolean => !draft.removed)
        .sort((first: Draft, second: Draft): number =>
            orderOf(first).localeCompare(orderOf(second)),
        )
        .forEach((draft: Draft): void => {
            if (draft.number === "NONE") return;
            if (
                draft.box !== null &&
                !(draft.box.editable && draft.box.todo && !draft.box.series)
            ) {
                last = /^\d+$/.test(draft.number) ? Number(draft.number) : last;
                return;
            }
            const place: string = orderOf(draft);
            last =
                weeks.length === 0
                    ? last + 1
                    : weekNumberOf(
                          weeks,
                          place.length > 10 ? berlinDateOf(new Date(place)) : place,
                      );
            draft.number = String(last);
        });
}

/**
 * Numbers the boxes of a type of a module of a semester anew, see {@link numbersOf},
 * as after the university cancelled one of them or took that back,
 * writing only the numbers that change.
 *
 * @throws {Error} - When there is no such module folder, or a box cannot be written
 */
export function numbersRenew(module: string, type: string, semester: string): void {
    const folder: string = moduleFolderOf(codeOf(module)) ?? module;
    folderCheck(folder);
    const typed: Box[] = courseBoxesRead(codeOf(folder), semester).filter(
        (box: Box): boolean => box.type === type,
    );
    const drafts: Draft[] = typed.map(draftOf);
    numbersOf(drafts, tutorialWeeksOf(groupsRead(folder, semester), type));
    draftsWrite(folder, type, semester, drafts);
}

/**
 * Tells whether a draft of a box that stays sets its day,
 * its time, its length, its place, what it does online or its people anew.
 */
function draftMoved(draft: Draft, box: Box): boolean {
    const keyOf: (item: Draft | Box) => string = (item: Draft | Box): string =>
        JSON.stringify([item.day, item.time, item.minutes, placeOf(item)]);
    return keyOf(draft) !== keyOf(box);
}

/**
 * Writes a change of a series as planned, see {@link draftsOf},
 * into the plan of the module, every other line of it as it is:
 * a box removed goes, a new one is a to-do as the dialog adds one,
 * see `todoAppend` in `calendar.ts`;
 * of a box that stays only what changed against its file,
 * one of a day over open again staying on its day, see `overKeep` in `boxes.ts`.
 *
 * @throws {Error} - When a box cannot be found or written, like one done meanwhile
 */
function draftsWrite(
    module: string,
    type: string,
    semester: string,
    drafts: Draft[],
): void {
    const file: string = skillFileOf(module, planEnding);
    const code: string = codeOf(module);
    const [title, titleLink]: [string, string] = titleOf(
        { category: skillName, title: "", module: code, type: type, semester: semester },
        null,
    );
    drafts.forEach((draft: Draft): void => {
        const box: Box | null = draft.box;
        if (box === null) {
            const id: string = todoAppend(file, {
                category: skillName,
                title: title,
                titleLink: titleLink,
                ...placeOf(draft),
                from: "",
                module: code,
                type: type,
                semester: semester,
                note: "",
                day: draft.day,
                time: draft.time === "" ? null : new Date(draft.time),
                minutes: draft.minutes,
                deadline: "",
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
            todoChange(
                boxFile,
                entry,
                {
                    ...entry,
                    ...placeOf(draft),
                    day: draft.day,
                    time: draft.time === "" ? null : new Date(draft.time),
                    minutes: draft.minutes,
                },
                boxFile,
            );
        if (draft.number !== stands.number || draft.group !== stands.group)
            propertiesPut(boxFile, box.id, [
                ["x-number", draft.number === "" ? [] : [draft.number]],
                ["x-group", draft.group === "" ? [] : [draft.group]],
            ]);
        if (stands.number === "NONE" && draft.number !== "NONE") overKeep(box.id);
    });
}

/**
 * Gives the boxes of a series as planned, see {@link draftsOf},
 * for the preview of the form, removed ones too, by their days.
 */
function plannedOf(drafts: Draft[]): Planned[] {
    return drafts
        .map((draft: Draft): Planned => {
            let change: Planned["change"] = "";
            if (draft.box === null) change = "new";
            else if (draft.removed) change = "removed";
            else if (draftMoved(draft, draft.box)) change = "changed";
            else if (draft.number !== draft.box.number || draft.group !== draft.box.group)
                change = "renumbered";
            return {
                id: draft.box?.id ?? "",
                day: draft.day,
                time: draft.time,
                minutes: draft.minutes,
                number: draft.number,
                state:
                    draft.box?.state ?? (draft.number === "NONE" ? "university" : "new"),
                pushed: (draft.box?.pushed.length ?? 0) > 0,
                editable: draft.box === null || stateable(draft.box),
                retimable: draft.box === null || retimable(draft.box),
                change: change,
                attendees: draft.attendees,
            };
        })
        .sort((first: Planned, second: Planned): number =>
            (first.time || first.day).localeCompare(second.time || second.day),
        );
}

/**
 * Tells what of a date of a rule changed against the slot or the extra
 * whose boxes it takes in the rule as read back when the form opened,
 * which then goes into every box it takes, see {@link draftSet};
 * all of it for a slot or an extra added.
 *
 * @param before - The slot or the extra as read back, `undefined` for one added
 * @param shared - What changed of the whole rule
 */
function slotFieldsOf(
    before: Slot | Extra | undefined,
    date: Slot | Extra,
    shared: Field[],
): Field[] {
    if (before === undefined) return ["day", "time", "location", "online", "attendees"];
    const changed: [Field, boolean][] = [
        [
            "day",
            "weekday" in before && "weekday" in date && before.weekday !== date.weekday,
        ],
        [
            "time",
            before.start !== date.start || slotLengthOf(before) !== slotLengthOf(date),
        ],
    ];
    return [
        ...changed
            .filter(([, differs]: [Field, boolean]): boolean => differs)
            .map(([field]: [Field, boolean]): Field => field),
        ...shared,
    ];
}

/**
 * Changes a series by its rule, as typed in its form,
 * or only tells what that would make, for the preview of the form:
 * first each box takes the state I gave it, see {@link stateSet};
 * then each date of the rule takes the box of its week of the slot it takes the boxes of,
 * an extra the box of its day, with what changed, see {@link slotFieldsOf};
 * a date without box gets one, for a series that has boxes only from today on,
 * a date I cancelled by its day one cancelled by the university;
 * a box no date takes goes, but only an open one from today on,
 * see {@link ahead}, every other box staying, see {@link changeable},
 * and so does one of my own choice,
 * see {@link chosenIs}, each taking only the times I typed for its day;
 * then the boxes of the type are numbered anew, see {@link numbersOf}.
 * A new box goes to my group while my tutorials go to groups.
 * - `wasDay`: The day of a date as read back,
 *   whose times of its own stand for those of its slot,
 *   so a box with times of its own keeps them while the times of its slot change,
 *   and only a box whose times I typed anew takes them.
 * - `met`: Of a type with groups, the days my group meets, cancelled ones left out,
 *   so a week it does not meet and that holds no box of mine is no new date.
 * - `picked`: The weeks I gave to another group, see {@link weekPick}:
 *   they hold boxes of my own choice only.
 *
 * @throws {Error} - When there is no such module folder, the rule is not well formed,
 *   the link online is no web address, or a box cannot be written
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
    const changed: [Field, boolean][] =
        old === null
            ? []
            : [
                  ["location", old.location !== rule.location],
                  ["online", JSON.stringify(onlineOf(old)) !== JSON.stringify(online)],
                  [
                      "attendees",
                      JSON.stringify(old.attendees) !== JSON.stringify(rule.attendees),
                  ],
              ];
    const shared: Field[] = changed
        .filter(([, differs]: [Field, boolean]): boolean => differs)
        .map(([field]: [Field, boolean]): Field => field);
    const wasOf: (date: RuleDate) => Slot | Extra | undefined = (
        date: RuleDate,
    ): Slot | Extra | undefined =>
        date.slot === -1
            ? old?.extras.find((extra: Extra): boolean => extra.day === date.day)
            : old?.slots.find(
                  (slot: Slot): boolean =>
                      slot.weekday ===
                      (change.before?.[date.slot] ?? rule.slots[date.slot].weekday),
              );
    const own: Group[] =
        mine === ""
            ? []
            : groups.filter(
                  (group: Group): boolean =>
                      group.rule.type === rule.type && group.rule.group === mine,
              );
    const met: Set<string> | null =
        own.length === 0
            ? null
            : new Set(
                  own.flatMap((group: Group): string[] =>
                      group.sessions.map((session: Session): string =>
                          dayOfStart(session.start),
                      ),
                  ),
              );
    const held: Set<string> = new Set(typed.map(weekOf));
    const picked: Set<string> = new Set(
        mine === ""
            ? []
            : [...held].filter((week: string): boolean =>
                  typed.every(
                      (box: Box): boolean => weekOf(box) !== week || chosenIs(box, mine),
                  ),
              ),
    );
    const targets: Target[] = datesOf(rule)
        .filter(
            (date: RuleDate): boolean =>
                (met === null || met.has(date.day) || held.has(mondayOf(date.day))) &&
                !picked.has(mondayOf(date.day)),
        )
        .map((date: RuleDate): Target => {
            const was: Slot | Extra | undefined = wasOf(date);
            const wasDay: string =
                was !== undefined && "weekday" in was
                    ? dayAdd(date.day, was.weekday - weekdayOf(date.day))
                    : date.day;
            const retimed: boolean =
                date.slot === -1
                    ? was !== undefined &&
                      (was.start !== date.start || was.end !== date.end)
                    : JSON.stringify(rule.times?.[date.day]) !==
                      JSON.stringify(old?.times?.[wasDay]);
            return {
                day: date.day,
                start: date.start,
                minutes: slotLengthOf(date),
                location: rule.location,
                locationLink: link,
                ...online,
                attendees: rule.attendees,
                group: mine,
                before:
                    was !== undefined && "weekday" in was
                        ? was.weekday
                        : weekdayOf(date.day),
                fields: slotFieldsOf(
                    was === undefined ? undefined : { ...was, ...old?.times?.[wasDay] },
                    date.slot === -1
                        ? date
                        : { ...rule.slots[date.slot], start: date.start, end: date.end },
                    shared,
                ),
                made: old === null || date.day >= today,
                added: was === undefined,
                retimed: retimed,
            };
        });
    const weeks: string[] = [
        mondayOf(rule.first),
        mondayOf(rule.last),
        ...targets.map((target: Target): string => mondayOf(target.day)),
        ...typed.map(weekOf),
    ].sort();
    const drafts: Draft[] = draftsOf(
        typed,
        targets,
        [weeks[0], weeks[weeks.length - 1]],
        (box: Box): boolean => changeable(box) && ahead(box) && !chosenIs(box, mine),
    );
    drafts
        .filter(
            (draft: Draft): boolean =>
                draft.box === null && change.states?.[draft.day] === "university",
        )
        .forEach((draft: Draft): void => {
            draft.number = "NONE";
        });
    numbersOf(drafts, tutorialWeeksOf(groups, rule.type));
    if (!change.dry) draftsWrite(change.module, rule.type, rule.semester, drafts);
    return plannedOf(drafts);
}

/**
 * Makes a new box of the dialog once per date of its weekly rule,
 * or only tells what that would make, for the preview of the dialog.
 * A skill box of a numbered type of a module becomes its series
 * as the form of a new series makes it, see {@link seriesApply},
 * so the page of the module shows it as the card of its type, numbered;
 * while its type has a box in that semester, its series is there already,
 * which only the form of that series changes, so nothing is made.
 * Any other box is added once per date into the plan it belongs into,
 * as the dialog adds one alone, see `boxesAdd` in `boxes.ts`.
 *
 * @returns The boxes it makes, by their days;
 *   `null` for a series of a type with a box in its semester already
 * @throws {Error} - When the rule or the box is not well formed,
 *   the link online is no web address,
 *   a document is none of the module's, or a box cannot be written
 */
export function repeatApply(change: RepeatChange): Planned[] | null {
    const box: RepeatChange["box"] = change.box;
    const rule: Rule = {
        type: box.type,
        slots: change.slots,
        extras: change.extras,
        location: box.location,
        locationLink: "",
        online: box.online ?? "",
        onlineLink: box.onlineLink ?? "",
        onlineChannel: box.onlineChannel ?? "",
        onlineTitle: box.onlineTitle ?? "",
        attendees: box.attendees ?? [],
        first: change.first,
        last: change.last,
        times: change.times,
        group: "",
        semester: box.semester,
    };
    const module: string | undefined =
        box.category === skillName && numberedTypes.includes(box.type)
            ? moduleFolderOf(box.module)
            : undefined;
    if (module !== undefined)
        return courseBoxesRead(box.module, box.semester).some(
            (one: Box): boolean => one.type === box.type,
        )
            ? null
            : seriesApply({
                  module: module,
                  rule: rule,
                  old: null,
                  states: change.states,
                  dry: change.dry,
              });
    if (!weeksRight(rule)) throw new Error(`No days of a box: ${JSON.stringify(rule)}`);
    const boxes: BoxNew[] = datesOf(rule).map((date: RuleDate): BoxNew => ({
        ...box,
        day: date.day,
        time: slotMomentOf(date.day, date.start),
        minutes: slotLengthOf(date),
        deadline: "",
    }));
    boxesAdd(boxes, change.dry);
    return boxes.map((one: BoxNew): Planned => ({
        id: "",
        day: one.day,
        time: one.time,
        minutes: one.minutes,
        number: "",
        state: "new",
        pushed: false,
        editable: true,
        retimable: true,
        change: "new",
        attendees: one.attendees ?? [],
    }));
}

/**
 * Gives an exam of a module the kind and the times I gave it in the form of its exams,
 * each only when it changed, every other line of its file as it is;
 * a done exam keeps its log entry as it is.
 *
 * @throws {Error} - When there is no such box,
 *   it is no exam that is a to-do of the new system,
 *   no date of a series of a file, its new kind is none of {@link examKinds},
 *   or its times are not well formed, see {@link timesRight},
 *   or may not change, see {@link retimable}
 */
export function examSet(change: ExamChange): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(change.box);
    const timed: boolean = change.start !== "" || change.end !== "";
    if (
        box.category !== skillName ||
        box.type !== examType ||
        !box.editable ||
        !box.todo ||
        box.series ||
        (change.kind !== box.number && !examKinds.includes(change.kind)) ||
        (timed && (!retimable(box) || !timesRight(change)))
    )
        throw new Error(`No change of an exam: ${JSON.stringify(change)}`);
    const time: string = timed
        ? instantOf(box.day, change.start).toISOString()
        : box.time;
    const minutes: number | null = timed
        ? minutesOf(change.end) - minutesOf(change.start)
        : box.minutes;
    if (time !== box.time || minutes !== box.minutes)
        todoChange(
            file,
            entry,
            { ...entry, day: box.day, time: new Date(time), minutes: minutes },
            file,
        );
    if (change.kind !== box.number)
        propertiesPut(file, box.id, [["x-number", [change.kind]]]);
}

/**
 * Makes a group mine, or only tells what that would make, for the preview of the form:
 * from the week of its next session that is not over on, the boxes that follow the pin
 * go to its sessions, a session without box getting one,
 * a box of a week it does not meet going,
 * but every box a change may not change staying, see {@link changeable},
 * and every box of a day over, see {@link ahead},
 * as the past never changes by a pin, its session then getting no box either;
 * a week before stays as it is,
 * like this week's box at another group while the group meets only from next week on.
 * My own choices stay as they are, see {@link chosenIs}:
 * a week that holds my own choices only gets no box of the group either,
 * and a choice of the group is its box of its week from then on,
 * its session in that week getting no second box.
 * With no series yet, its sessions to come become one.
 * Then the boxes of the type are numbered anew and the group is pinned.
 * No group named takes my group back:
 * every box of my group from today on that a change may change goes,
 * then the boxes left are numbered anew and no group is pinned.
 * - `picked`: The weeks that hold a box of my own choice but no box that follows the pin,
 *   also after I took my group back.
 * - `drafts`: One the university cancelled for my old group open again
 *   once it goes to the new one, whose session that week meets.
 *
 * @throws {Error} - When there is no such module folder or group,
 *   the group meets no more, or a box cannot be written
 */
export function groupMine(change: MineChange): Planned[] {
    folderCheck(change.module);
    const semester: string = semesterOf(berlinDateOf(new Date()));
    const groups: Group[] = groupsRead(change.module, semester);
    const pinned: string = pinnedOf(groups, change.type);
    const typed: Box[] = courseBoxesRead(codeOf(change.module), semester).filter(
        (box: Box): boolean => box.type === change.type,
    );
    if (change.group === "") {
        const kept: Draft[] = typed.map((box: Box): Draft => ({
            ...draftOf(box),
            removed: ahead(box) && changeable(box) && !chosenIs(box, pinned),
        }));
        numbersOf(kept, tutorialWeeksOf(groups, change.type));
        if (change.dry !== true) {
            draftsWrite(change.module, change.type, semester, kept);
            pinPut(change.module, change.type, semester, "");
        }
        return plannedOf(kept);
    }
    const group: Group | undefined = groups.find(
        (one: Group): boolean =>
            one.rule.type === change.type && one.rule.group === change.group,
    );
    const now: number = Date.now();
    const coming: Session[] = (group?.sessions ?? []).filter(
        (session: Session): boolean =>
            Date.parse(session.start) + session.minutes * 60 * 1000 > now,
    );
    if (group === undefined || coming.length === 0)
        throw new Error(
            `No group ${change.type} ${change.group} ` +
                `with sessions to come in ${change.module}`,
        );
    const from: string = mondayOf(berlinDateOf(new Date(coming[0].start)));
    const own: Box[] = typed.filter((box: Box): boolean => box.group === change.group);
    const chosen: Box[] = typed.filter(
        (box: Box): boolean => box.group !== change.group && chosenIs(box, pinned),
    );
    const regular: Box[] = typed.filter(
        (box: Box): boolean => !own.includes(box) && !chosen.includes(box),
    );
    const picked: Set<string> = new Set(
        chosen
            .map(weekOf)
            .filter(
                (week: string): boolean =>
                    !regular.some((box: Box): boolean => weekOf(box) === week),
            ),
    );
    let targets: Target[] = coming
        .map((session: Session): Target => targetOf(group, session))
        .filter((target: Target): boolean => !picked.has(mondayOf(target.day)));
    own.forEach((box: Box): void => {
        const week: Target[] = targets.filter(
            (target: Target): boolean => mondayOf(target.day) === weekOf(box),
        );
        const taken: Target | undefined =
            week.find((target: Target): boolean => target.day === box.day) ?? week[0];
        targets = targets.filter((target: Target): boolean => target !== taken);
    });
    const weeks: string[] = [
        from,
        ...targets.map((target: Target): string => mondayOf(target.day)),
        ...regular.map(weekOf),
    ]
        .filter((week: string): boolean => week >= from)
        .sort();
    const drafts: Draft[] = [
        ...draftsOf(
            regular,
            targets,
            [from, weeks[weeks.length - 1]],
            (box: Box): boolean => changeable(box) && ahead(box),
        ),
        ...[...own, ...chosen].map(draftOf),
    ];
    drafts
        .filter(
            (draft: Draft): boolean =>
                draft.number === "NONE" &&
                draft.box !== null &&
                draft.group !== draft.box.group,
        )
        .forEach((draft: Draft): void => {
            draft.number = "";
        });
    numbersOf(drafts, tutorialWeeksOf(groups, change.type));
    if (change.dry !== true) {
        draftsWrite(change.module, change.type, semester, drafts);
        pinPut(change.module, change.type, semester, change.group);
    }
    return plannedOf(drafts);
}

/**
 * Picks one session of a group for its week, as the menu of the groups sends it:
 * a box I skipped that week is open again, one a change may change;
 * then the open box of the week,
 * the one that follows the pin before one of my own choice,
 * goes to the session, its number kept, and no other week;
 * when I hold that session already, by an extra,
 * the box goes instead, so the week keeps the one.
 * A week without box gets one,
 * and with no box of the type after that week the sessions of the group from that week
 * on become my series, one per week, so later weeks follow it;
 * then the boxes of the type are numbered anew, see {@link numbersOf}.
 * A week done, or whose box may not change, see {@link changeable}, stays as it is.
 * As an extra the session becomes a box of its own instead,
 * besides the box of its week, which stays;
 * one of a day over stays on its day, never carried along to today,
 * since it got its day after it, see `carriedOf` in `boxes.ts`, so I log it there.
 *
 * @throws {Error} - When there is no such module folder, group or session,
 *   the week is done or its box may not change, or a box cannot be written
 */
export function weekPick(change: PickChange): void {
    folderCheck(change.module);
    const semester: string = semesterOf(dayOfStart(change.start));
    const groups: Group[] = groupsRead(change.module, semester);
    const group: Group | undefined = groups.find(
        (one: Group): boolean =>
            one.rule.type === change.type && one.rule.group === change.group,
    );
    const session: Session | undefined = group?.sessions.find(
        (one: Session): boolean => Date.parse(one.start) === Date.parse(change.start),
    );
    if (group === undefined || session === undefined)
        throw new Error(
            `No session of group ${change.type} ${change.group} ` +
                `at ${change.start} in ${change.module}`,
        );
    const weekOfSession: (one: Session) => string = (one: Session): string =>
        mondayOf(dayOfStart(one.start));
    const week: string = weekOfSession(session);
    const typedRead: () => Box[] = (): Box[] =>
        courseBoxesRead(codeOf(change.module), semester).filter(
            (one: Box): boolean => one.type === change.type,
        );
    let typed: Box[] = typedRead();
    const at: (one: Box) => boolean = (one: Box): boolean =>
        (one.time || one.day) === session.start ||
        (one.time !== "" && Date.parse(one.time) === Date.parse(session.start));
    if (change.extra === true) {
        if (typed.some(at))
            throw new Error(
                `A box of ${change.type} of ${change.module} ` +
                    `is there already at ${change.start}`,
            );
        const drafts: Draft[] = [
            ...typed.map(draftOf),
            madeDraftOf(targetOf(group, session)),
        ];
        numbersOf(drafts, tutorialWeeksOf(groups, change.type));
        draftsWrite(change.module, change.type, semester, drafts);
        return;
    }
    const skipped: Box | undefined = typed.find(
        (one: Box): boolean =>
            weekOf(one) === week &&
            one.state === "dropped" &&
            changeable({ ...one, state: "open" }),
    );
    if (skipped !== undefined) {
        boxDrop(skipped.id, false);
        typed = typedRead();
    }
    const open: Box[] = typed.filter(
        (one: Box): boolean =>
            weekOf(one) === week && changeable(one) && one.state === "open",
    );
    const box: Box | undefined =
        open.find((one: Box): boolean => !chosenIs(one, pinnedOf(groups, change.type))) ??
        open[0];
    const held: Box | undefined = typed.find(at);
    if (box !== undefined && held !== undefined && held.id !== box.id) {
        draftsWrite(change.module, change.type, semester, [
            { ...draftOf(box), removed: true },
        ]);
        return;
    }
    if (box !== undefined) {
        draftsWrite(change.module, change.type, semester, [
            draftSet(draftOf(box), targetOf(group, session)),
        ]);
        return;
    }
    if (typed.some((one: Box): boolean => weekOf(one) === week))
        throw new Error(
            `The ${change.type} of ${change.module} in the week of ${week} ` +
                "is done or may not change",
        );
    const later: boolean = typed.some((one: Box): boolean => weekOf(one) > week);
    const firsts: Session[] = later
        ? []
        : group.sessions.filter(
              (one: Session, index: number): boolean =>
                  weekOfSession(one) > week &&
                  group.sessions.findIndex(
                      (other: Session): boolean =>
                          weekOfSession(other) === weekOfSession(one),
                  ) === index,
          );
    const targets: Target[] = [
        targetOf(group, session),
        ...firsts.map((one: Session): Target => targetOf(group, one)),
    ];
    const drafts: Draft[] = draftsOf(
        typed,
        targets,
        [week, mondayOf(targets[targets.length - 1].day)],
        (): boolean => false,
    );
    numbersOf(drafts, tutorialWeeksOf(groups, change.type));
    draftsWrite(change.module, change.type, semester, drafts);
}

/**
 * Removes the groups of a type and a group of a semester from the plan of a module,
 * each to-do of them with every line of it, each session of it changed alone too.
 *
 * @returns How many were removed
 */
function groupsTake(gone: GroupGone): number {
    const file: string = skillFileOf(gone.module, planEnding);
    const found: Group[] = groupsRead(gone.module, gone.semester).filter(
        (group: Group): boolean =>
            group.rule.type === gone.type && group.rule.group === gone.group,
    );
    found.forEach((group: Group): void =>
        group.ids.forEach((id: string): void => entryRemove(file, id)),
    );
    return found.length;
}

/**
 * Writes one slot of a group into the plan of a module as one weekly to-do,
 * the plan made when missing:
 * `UNTIL` the start of its last session in UTC,
 * as the standard wants it beside a time zone,
 * and one `EXDATE` per day of its slot between them without session.
 * A slot without times, only its length, writes days, as my sleep.
 *
 * @param rule - The rule of the group with one slot, checked, see {@link ruleCheck}
 * @param days - The days of its sessions on that slot, at least one, the earliest first
 * @returns Identifier of the to-do written
 * @throws {Error} - When the link online is no web address
 */
function groupWrite(module: string, rule: Rule, days: string[]): string {
    const slot: Slot = rule.slots[0];
    const code: string = codeOf(module);
    const [title, titleLink]: [string, string] = titleOf(
        {
            category: skillName,
            title: "",
            module: code,
            type: rule.type,
            semester: rule.semester,
        },
        null,
    );
    const start: Date | null = slot.start === "" ? null : instantOf(days[0], slot.start);
    const fields: TodoFields = {
        category: skillName,
        title: title,
        titleLink: titleLink,
        location: rule.location,
        locationLink: placeLinkOf(rule.location, null),
        ...onlineFor(rule, null),
        from: "",
        attendees: rule.attendees,
        module: code,
        type: rule.type,
        semester: rule.semester,
        note: "",
        day: days[0],
        time: start,
        minutes: slotLengthOf(slot),
        deadline: "",
    };
    const until: string =
        start === null
            ? days[days.length - 1].replace(/-/g, "")
            : icsTextOf(instantOf(days[days.length - 1], slot.start).toISOString());
    const left: string[] = [];
    for (
        let day: string = dayAdd(days[0], 7);
        day < days[days.length - 1];
        day = dayAdd(day, 7)
    )
        if (!days.includes(day)) left.push(day);
    return todoAppend(
        skillFileOf(module, planEnding),
        fields,
        [
            ["rrule", `FREQ=WEEKLY;UNTIL=${until}`],
            ...left.map((day: string): [string, string | Date] => [
                "exdate",
                start === null ? day : instantOf(day, slot.start),
            ]),
            ["x-group", rule.group],
        ],
        false,
    );
}

/**
 * Moves my boxes that go to a group to its sessions anew, once the group changed:
 * each open box of its type from today on that goes to it, one a change may change,
 * takes a session of the group in its week no other box of mine
 * at it holds, the one on its weekday, else the first left,
 * so two boxes of a week never take one session;
 * a box of a week the group no longer meets in stays as it is.
 *
 * @throws {Error} - When a box cannot be written
 */
function groupBoxesMove(
    module: string,
    type: string,
    group: string,
    semester: string,
): void {
    const found: Group | undefined = groupsRead(module, semester).find(
        (one: Group): boolean => one.rule.type === type && one.rule.group === group,
    );
    if (found === undefined) return;
    const typed: Box[] = courseBoxesRead(codeOf(module), semester).filter(
        (box: Box): boolean => box.type === type && box.group === group,
    );
    const moving: Box[] = typed.filter(
        (box: Box): boolean => box.state === "open" && changeable(box) && ahead(box),
    );
    const free: Map<string, Session[]> = new Map();
    found.sessions.forEach((one: Session): void => {
        const week: string = mondayOf(dayOfStart(one.start));
        free.set(week, [...(free.get(week) ?? []), one]);
    });
    const takeOf: (box: Box, any: boolean) => Session | undefined = (
        box: Box,
        any: boolean,
    ): Session | undefined =>
        weekTake(
            free.get(weekOf(box)) ?? [],
            weekdayOf(datedOf(box).day),
            any,
            (one: Session): string => dayOfStart(one.start),
        );
    typed
        .filter((box: Box): boolean => !moving.includes(box))
        .forEach((box: Box): void => {
            takeOf(box, false);
        });
    const taken: (Session | undefined)[] = moving.map((box: Box): Session | undefined =>
        takeOf(box, false),
    );
    const drafts: Draft[] = moving.flatMap((box: Box, index: number): Draft[] => {
        const session: Session | undefined = taken[index] ?? takeOf(box, true);
        const draft: Draft | undefined =
            session === undefined
                ? undefined
                : draftSet(draftOf(box), targetOf(found, session));
        return draft !== undefined && draftMoved(draft, box) ? [draft] : [];
    });
    draftsWrite(module, type, semester, drafts);
}

/**
 * Writes a group into the plan of a module as Claude sends it,
 * in place of every to-do of the same type, group and semester;
 * my boxes that go to it take its sessions anew, see {@link groupBoxesMove}.
 * - `rule`: Without extras, since a group meets weekly,
 *   so a group sent without them is right.
 *
 * @throws {Error} - When there is no such module folder, the rule is not well formed,
 *   has no group or not one slot, it holds no session, the link online is no web address,
 *   or a box cannot be written
 */
export function groupPut(change: GroupNew): string {
    folderCheck(change.module);
    const rule: Rule = { ...change.rule, extras: [] };
    ruleCheck(rule);
    const days: string[] = datesOf(rule).map((date: RuleDate): string => date.day);
    if (rule.group === "" || rule.slots.length !== 1 || days.length === 0)
        throw new Error(`No group of sessions: ${JSON.stringify(rule)}`);
    groupsTake({
        module: change.module,
        type: rule.type,
        group: rule.group,
        semester: rule.semester,
    });
    const id: string = groupWrite(change.module, rule, days);
    groupBoxesMove(change.module, rule.type, rule.group, rule.semester);
    return id;
}

/**
 * Makes or changes a group as the form of a series sends it,
 * or only tells what that would make, for the preview of the form:
 * its sessions are the dates of its slots in its weeks,
 * the days the university does not teach left out,
 * each a session but those I marked cancelled, and, of a group there already,
 * the dates of its weeks it did not meet on,
 * as its `EXDATE`s said, while not marked open again.
 * A group there already whose dates I only mark cancelled or open again,
 * or rename, changes in place.
 * Any other change is a new notice of the university,
 * whose past stays true, as that of a plain series, see `plainApply` in `rules.ts`:
 * a group with a session before today ends there,
 * each of its to-dos at its last session before today, one without such gone,
 * and goes on from today, one to-do per slot with the same `X-GROUP`;
 * a group wholly ahead is written anew in place of the group of its type,
 * group and semester;
 * either way its sessions changed alone from today on go, the change taking their place,
 * and it stays pinned while it was.
 * Then my boxes that go to it take its sessions anew, see {@link groupBoxesMove},
 * an open one on a session I marked cancelled cancelled by the university too,
 * and one cancelled on a session I marked open again open again,
 * numbered by its week again.
 * The preview shows a session changed alone with its own times and room
 * while the group changes in place,
 * and of a group going on from today its sessions before today as they are.
 *
 * @returns Its sessions after the change as the boxes of a series,
 *   cancelled and removed ones too, by their days
 * @throws {Error} - When there is no such module folder,
 *   the rule is not well formed or has no group,
 *   a new group is there already or a group changed is not, it keeps no session,
 *   the link online is no web address, or a box cannot be written
 */
export function groupApply(change: GroupChange): Planned[] {
    folderCheck(change.module);
    const rule: Rule = { ...change.rule, extras: [], times: {} };
    ruleCheck(rule);
    const file: string = skillFileOf(change.module, planEnding);
    const today: string = berlinDateOf(new Date());
    const was: string = change.was || rule.group;
    const groups: Group[] = groupsRead(change.module, rule.semester).filter(
        (group: Group): boolean => group.rule.type === rule.type,
    );
    const old: Group | undefined = groups.find(
        (group: Group): boolean => group.rule.group === was,
    );
    if (rule.group === "" || change.made !== (old === undefined))
        throw new Error(
            `${change.made ? "A group there already" : "No group"}: ${rule.type} ${was}`,
        );
    if (
        was !== rule.group &&
        groups.some((group: Group): boolean => group.rule.group === rule.group)
    )
        throw new Error(`A group there already: ${rule.type} ${rule.group}`);
    const met: Set<string> = new Set(
        (old?.sessions ?? []).map((session: Session): string =>
            dayOfStart(session.start),
        ),
    );
    const skipped: Set<string> = new Set(
        old === undefined
            ? []
            : datesOf(old.rule)
                  .map((date: RuleDate): string => date.day)
                  .filter((day: string): boolean => !met.has(day)),
    );
    const dates: RuleDate[] = datesOf(rule);
    const cancelled: (date: RuleDate) => boolean = (date: RuleDate): boolean =>
        (change.states?.[date.day] ?? (skipped.has(date.day) ? "university" : "open")) ===
        "university";
    const shared: boolean =
        old !== undefined &&
        JSON.stringify([old.rule.location, onlineOf(old.rule), old.rule.attendees]) !==
            JSON.stringify([rule.location, onlineOf(rule), rule.attendees]);
    const whenOf: (one: Rule) => string = (one: Rule): string =>
        JSON.stringify([
            one.slots.map(
                (slot: Slot): string =>
                    `${slot.weekday} ${slot.start} ${slotLengthOf(slot)}`,
            ),
            one.first,
            one.last,
        ]);
    const sessionOn: (day: string) => Session | undefined = (
        day: string,
    ): Session | undefined =>
        old?.sessions.find(
            (session: Session): boolean => dayOfStart(session.start) === day,
        );
    const opened: (string | undefined)[] = dates
        .filter((date: RuleDate): boolean => !cancelled(date) && skipped.has(date.day))
        .map((date: RuleDate): string | undefined => {
            const near: Session[] = (old?.sessions ?? []).filter(
                (session: Session): boolean =>
                    !session.changed &&
                    weekdayOf(dayOfStart(session.start)) === weekdayOf(date.day),
            );
            const before: Session | undefined = near
                .filter(
                    (session: Session): boolean => dayOfStart(session.start) < date.day,
                )
                .pop();
            const uid: string = before?.id.slice(0, before.id.lastIndexOf("#")) ?? "";
            return before === undefined ||
                !near.some(
                    (session: Session): boolean =>
                        dayOfStart(session.start) > date.day &&
                        session.id.startsWith(`${uid}#`),
                )
                ? undefined
                : `${uid}#${
                      date.start === ""
                          ? date.day
                          : instantOf(
                                date.day,
                                berlinTimeOf(new Date(before.start)),
                            ).toISOString()
                  }`;
        });
    const whole: boolean =
        old === undefined ||
        shared ||
        whenOf(old.rule) !== whenOf(rule) ||
        opened.includes(undefined);
    const begun: boolean =
        whole &&
        (old?.sessions ?? []).some(
            (session: Session): boolean => dayOfStart(session.start) < today,
        );
    const kept: (day: string) => boolean = (day: string): boolean => begun && day < today;
    const weeks: string[] = tutorialWeeksOf(
        groups,
        rule.type,
        dates.map((date: RuleDate): string => date.day),
    );
    const planned: Planned[] = [
        ...dates
            .filter((date: RuleDate): boolean => !kept(date.day))
            .map((date: RuleDate): Planned => {
                const was: Session | undefined = sessionOn(date.day);
                const own: boolean = was !== undefined && was.changed && !whole;
                const time: string =
                    own && was !== undefined
                        ? was.start
                        : slotMomentOf(date.day, date.start);
                const minutes: number | null =
                    own && was !== undefined ? was.minutes : slotLengthOf(date);
                const had: boolean = was !== undefined || skipped.has(date.day);
                return {
                    id: "",
                    day: date.day,
                    time: time,
                    minutes: minutes,
                    number: cancelled(date)
                        ? "NONE"
                        : String(weekNumberOf(weeks, date.day)),
                    state: cancelled(date) ? "university" : had ? "open" : "new",
                    pushed: false,
                    editable: true,
                    retimable: false,
                    attendees: rule.attendees,
                    change: !had
                        ? "new"
                        : shared ||
                            (was === undefined) !== cancelled(date) ||
                            (was !== undefined &&
                                (was.start !== (time || date.day) ||
                                    was.minutes !== minutes))
                          ? "changed"
                          : "",
                    ...(own && was !== undefined
                        ? { location: was.location, locationLink: was.locationLink }
                        : {}),
                };
            }),
        ...(old === undefined ? [] : datesOf(old.rule))
            .filter((date: RuleDate): boolean => kept(date.day) && skipped.has(date.day))
            .map((date: RuleDate): Planned => ({
                id: "",
                day: date.day,
                time: slotMomentOf(date.day, date.start),
                minutes: slotLengthOf(date),
                number: "NONE",
                state: "university",
                pushed: false,
                editable: false,
                retimable: false,
                change: "",
                attendees: old?.rule.attendees ?? [],
            })),
        ...(old?.sessions ?? [])
            .filter(
                (session: Session): boolean =>
                    kept(dayOfStart(session.start)) ||
                    !dates.some(
                        (date: RuleDate): boolean =>
                            date.day === dayOfStart(session.start),
                    ),
            )
            .map((session: Session): Planned => ({
                id: "",
                day: dayOfStart(session.start),
                time: session.start === dayOfStart(session.start) ? "" : session.start,
                minutes: session.minutes,
                number: kept(dayOfStart(session.start))
                    ? String(weekNumberOf(weeks, dayOfStart(session.start)))
                    : "",
                state: "open",
                pushed: false,
                editable: false,
                retimable: false,
                change: kept(dayOfStart(session.start)) ? "" : "removed",
                attendees: session.attendees,
                ...(session.changed
                    ? { location: session.location, locationLink: session.locationLink }
                    : {}),
            })),
    ].sort((first: Planned, second: Planned): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
    if (change.dry) return planned;
    const days: string[][] = rule.slots.map((_: Slot, index: number): string[] =>
        dates
            .filter(
                (date: RuleDate): boolean =>
                    date.slot === index && !cancelled(date) && !kept(date.day),
            )
            .map((date: RuleDate): string => date.day),
    );
    if (
        days.every((one: string[]): boolean => one.length === 0) &&
        !(old?.sessions ?? []).some((session: Session): boolean =>
            kept(dayOfStart(session.start)),
        )
    )
        throw new Error(
            `No session of group ${rule.type} ${rule.group} of ${change.module}`,
        );
    if (was !== rule.group)
        groupRename(change.module, rule.type, rule.semester, was, rule.group);
    if (!whole) {
        dates
            .filter((date: RuleDate): boolean => cancelled(date) && met.has(date.day))
            .forEach((date: RuleDate): void => {
                const id: string = sessionOn(date.day)?.id ?? "";
                seriesDayRemove(
                    file,
                    id.slice(0, id.lastIndexOf("#")),
                    id.slice(id.lastIndexOf("#") + 1),
                );
            });
        opened.forEach((id: string | undefined): void => {
            if (id !== undefined)
                seriesDayRestore(
                    file,
                    id.slice(0, id.lastIndexOf("#")),
                    id.slice(id.lastIndexOf("#") + 1),
                );
        });
    } else {
        (old?.ids ?? [])
            .filter((id: string): boolean => !id.includes("#"))
            .forEach((uid: string): void => {
                const last: Session | undefined = (old?.sessions ?? [])
                    .filter(
                        (session: Session): boolean =>
                            session.id.startsWith(`${uid}#`) &&
                            kept(dayOfStart(session.start)),
                    )
                    .pop();
                if (last !== undefined)
                    seriesCut(file, uid, last.id.slice(uid.length + 1));
                else
                    (old?.ids ?? [])
                        .filter(
                            (id: string): boolean =>
                                id === uid || id.startsWith(`${uid}#`),
                        )
                        .forEach((id: string): void => entryRemove(file, id));
            });
        const written: string[] = rule.slots.flatMap(
            (slot: Slot, index: number): string[] =>
                days[index].length === 0
                    ? []
                    : [
                          groupWrite(
                              change.module,
                              { ...rule, slots: [slot] },
                              days[index],
                          ),
                      ],
        );
        if (old?.pinned === true)
            written.forEach((id: string): void =>
                propertiesPut(file, id, [
                    ["x-group", [groupPropertyOf(rule.group, true)]],
                ]),
            );
    }
    groupBoxesMove(change.module, rule.type, rule.group, rule.semester);
    const off: string[] = dates
        .filter(cancelled)
        .map((date: RuleDate): string => date.day);
    const back: string[] = dates
        .filter(
            (date: RuleDate): boolean =>
                change.states?.[date.day] === "open" && skipped.has(date.day),
        )
        .map((date: RuleDate): string => date.day);
    courseBoxesRead(codeOf(change.module), rule.semester)
        .filter(
            (box: Box): boolean =>
                box.type === rule.type && box.group === rule.group && changeable(box),
        )
        .forEach((box: Box): void => {
            if (box.state === "open" && off.includes(box.day))
                boxUniversity(box.id, true);
            else if (box.state === "university" && back.includes(box.day))
                boxUniversity(box.id, false);
        });
    if (back.length > 0) numbersRenew(change.module, rule.type, rule.semester);
    return planned;
}

/**
 * Changes one session of a group as the university changed it alone:
 * the way the standard changes one occurrence,
 * a component of its own with the same `UID` and its start as `RECURRENCE-ID`,
 * see `occurrenceOwn` in `calendar.ts`, its rule untouched,
 * given back to its to-do once they are its own again, see `occurrencesTidy` there;
 * then my boxes that go to the group take its sessions anew, see {@link groupBoxesMove},
 * so my box at that session follows it, one I pushed, done or skipped staying as it is.
 *
 * @throws {Error} - When there is no such module folder, group or session,
 *   its times are not well formed, or the plan cannot be written
 */
export function sessionApply(change: SessionChange): void {
    folderCheck(change.module);
    const file: string = skillFileOf(change.module, planEnding);
    const sources: CalendarSource[] = [{ folder: dirname(file), ending: basename(file) }];
    const group: Group | undefined = groupsRead(change.module, change.semester).find(
        (one: Group): boolean =>
            one.rule.type === change.type && one.rule.group === change.group,
    );
    const session: Session | undefined = group?.sessions.find(
        (one: Session): boolean => one.id === change.id,
    );
    const at: number = change.id.lastIndexOf("#");
    const found: [string, Entry] | undefined =
        session === undefined
            ? undefined
            : occurrenceLookup(sources, change.id.slice(0, at), change.id.slice(at + 1));
    if (found === undefined || !timesRight(change))
        throw new Error(
            `No session ${change.id} of group ${change.type} ${change.group} ` +
                `in ${change.module}`,
        );
    const day: string = dayOfStart(found[1].start);
    occurrenceOwn(file, found[1]);
    todoChange(
        file,
        found[1],
        {
            ...found[1],
            location: change.location,
            locationLink: placeLinkOf(change.location, found[1]),
            day: day,
            time: instantOf(day, change.start),
            minutes: minutesOf(change.end) - minutesOf(change.start),
            deadline: "",
        },
        file,
    );
    occurrencesTidy(file, found[1].id);
    groupBoxesMove(change.module, change.type, change.group, change.semester);
}

/**
 * Renames a group everywhere: the `X-GROUP` of its to-dos,
 * of my boxes that go to it, done ones too,
 * so the group pinned, the group of my series, keeps its new name,
 * and of every entry of the log of the module I went to it in;
 * of its type and semester only, an entry without semester by its day.
 *
 * @throws {Error} - When a file cannot be written
 */
function groupRename(
    module: string,
    type: string,
    semester: string,
    was: string,
    group: string,
): void {
    const plan: string = skillFileOf(module, planEnding);
    groupsRead(module, semester)
        .filter((one: Group): boolean => one.rule.type === type && one.rule.group === was)
        .forEach((one: Group): void =>
            one.ids.forEach((id: string): void =>
                propertiesPut(plan, id, [
                    ["x-group", [groupPropertyOf(group, one.pinned)]],
                ]),
            ),
        );
    const files: string[] = [planEnding, logEnding]
        .map((ending: string): string => skillFileOf(module, ending))
        .filter((file: string): boolean => existsSync(file));
    const taken: (entry: Entry) => boolean = (entry: Entry): boolean =>
        entry.type === type &&
        entry.group === was &&
        (entry.semester !== ""
            ? entry.semester
            : semesterOf(berlinDateOf(new Date(entry.start)))) === semester;
    files.forEach((file: string): void => {
        [
            ...new Set(
                fileEntriesRead(file)
                    .filter(taken)
                    .map((entry: Entry): string => entry.id),
            ),
        ].forEach((id: string): void => propertiesPut(file, id, [["x-group", [group]]]));
    });
}

/**
 * Removes my series of a type of a module of a semester, as the bin of its form asks:
 * each of its boxes but those done goes, since a log entry points to a box done.
 *
 * @returns How many boxes done stay
 * @throws {Error} - When there is no such module folder or series
 */
export function courseSeriesRemove(gone: Omit<GroupGone, "group">): number {
    folderCheck(gone.module);
    const boxes: Box[] = courseBoxesRead(codeOf(gone.module), gone.semester).filter(
        (box: Box): boolean => box.type === gone.type && box.number !== "",
    );
    if (boxes.length === 0)
        throw new Error(`No series ${gone.type} of ${gone.semester} in ${gone.module}`);
    boxes
        .filter((box: Box): boolean => box.state !== "done")
        .forEach((box: Box): void => boxDelete(box.id));
    return boxes.filter((box: Box): boolean => box.state === "done").length;
}

/**
 * Removes a group from the plan of a module, see {@link groupsTake},
 * and with it my open boxes from today on that go to it, as unpinning takes them,
 * since no session of it is left for them;
 * my boxes of days over, done, skipped or open, stay as they are;
 * the boxes of the type then numbered anew, see {@link numbersOf}.
 *
 * @throws {Error} - When there is no such module folder or group
 */
export function groupRemove(gone: GroupGone): void {
    folderCheck(gone.module);
    if (groupsTake(gone) === 0)
        throw new Error(
            `No group ${gone.type} ${gone.group} of ${gone.semester} in ${gone.module}`,
        );
    const kept: Draft[] = courseBoxesRead(codeOf(gone.module), gone.semester)
        .filter((box: Box): boolean => box.type === gone.type)
        .map((box: Box): Draft => ({
            ...draftOf(box),
            removed: box.group === gone.group && ahead(box) && changeable(box),
        }));
    numbersOf(kept, tutorialWeeksOf(groupsRead(gone.module, gone.semester), gone.type));
    draftsWrite(gone.module, gone.type, gone.semester, kept);
}
