/**
 * ## Course
 *
 * The course of a module in the semester of today, its boxes, series and tutorial groups.
 * A series is no rule in a file, the plan holds one box per lecture.
 * The rule of a type is read back from its boxes, the one most of them follow.
 * A box that differs from it stays as it is, a pushed box counts on the day it left.
 * Its weeks skip every day the university does not teach.
 * A session that does not take place is a box the university cancelled, `X-NUMBER:NONE`, never a day without box.
 * My tutorial boxes follow the group I pinned, never read from my boxes.
 * A box of another group is my own choice, which no pin moves.
 * A tutorial box is numbered by its week of the semester, so a week cancelled keeps its place.
 *
 * A group is one weekly to-do per weekday in the plan, with `X-GROUP`, no `X-NUMBER` and no `STATUS`.
 * A group is the notice of the university, so its changes go into the group, never into my box.
 * My open boxes of it take its sessions anew.
 * A box I pushed, did or skipped is mine and follows no change of its group.
 *
 * A changed rule, a group made mine and a session picked write the boxes week by week,
 * each leaving every box done, cancelled by me or pushed where it is, and numbering anew.
 * The exams of a module are no series.
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
    skillBoxesRead,
} from "./boxes.ts";
import {
    berlinDateOf,
    berlinDayStartOf,
    berlinInstantOf,
    berlinTimeOf,
    dayAdd,
    dayOfStart,
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
import { codeOf, moduleFolderOf, moduleFoldersRead, semesterFoldersRead } from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { holidays, logEnding, planEnding, skillFileOf, skillLog, vaultPathOf } from "./sources.ts";

import type { Box, BoxNew, BoxState } from "./boxes.ts";
import type { Attendee, Entry, Online, Push, TodoFields } from "./calendar.ts";
import type { MaterialFolder } from "./notes.ts";
import type { CalendarSource } from "./sources.ts";

/** A weekday of a rule with its time, empty for boxes without time, which keep only their `minutes`. */
export type Slot = {
    weekday: number;
    start: string;
    end: string;
    minutes?: number;
};

/** A single date of a rule outside its weeks. */
export type Extra = {
    day: string;
    start: string;
    end: string;
};

/** The dates of a rule with times other than those of their slot, by their days. */
export type Times = { [day: string]: Pick<Slot, "start" | "end"> };

/** Where something takes place, what it does online and its people. */
type Place = Online & Pick<Entry, "location" | "locationLink" | "attendees">;

/**
 * A weekly rule of a series or of a group.
 *
 * - `slots`: Each weekday once, a group has one.
 * - `extras`: None for every group.
 * - `first`, `last`: Its weeks, an extra may lie before or after them.
 * - `times`: Left out as a group is written.
 * - `group`: Of a group its own, of my tutorials my group.
 */
export type Rule = Place & {
    type: string;
    slots: Slot[];
    extras: Extra[];
    first: string;
    last: string;
    times?: Times;
    group: string;
    semester: string;
};

/** A series of the course, its rule read back from its boxes. */
export type Series = {
    rule: Rule;
    count: number;
};

/**
 * A session of a group.
 *
 * - `id`: The `UID` of its to-do and its start in it.
 * - `start`: Of a group without times its day.
 * - `location` up to `attendees`: Those of its to-do, or its own once the university changed it alone.
 */
export type Session = Place & {
    id: string;
    start: string;
    minutes: number;
    changed: boolean;
};

/**
 * A group of the tutorials of a module.
 *
 * - `ids`: The `UID`s of its to-dos, per weekday, per part a change from a day on left,
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
 * The course of a module in the semester of today.
 *
 * - `folders`: The material folder of the semester of each type, also one not there yet.
 * - `links`: The link a box of each type has in the semester, its `ALTREP`.
 * - `learned`: My own learning of the module logged without a box.
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

/** A session of my own learning of a module, a skill entry without type and without box. */
export type Learned = Place & {
    id: string;
    day: string;
    time: string;
    minutes: number;
    note: string;
};

/**
 * A change of a series.
 *
 * - `old`: The rule as read back when the form opened, `null` for a new series.
 * - `before`: For each slot the weekday of the slot of `old` whose boxes it takes, 0 for a slot added.
 *   Left out, each slot takes those of its own weekday.
 * - `states`: The state I gave a box by its identifier, a new one by its day.
 * - `dry`: Only tell what the change would make, writing nothing.
 */
export type SeriesChange = {
    module: string;
    rule: Rule;
    old: Rule | null;
    before?: number[];
    states?: { [id: string]: BoxState };
    dry: boolean;
};

/** A group made mine, empty to have none. */
export type MineChange = {
    module: string;
    type: string;
    group: string;
    dry?: boolean;
};

/**
 * One session of a group picked for its week.
 *
 * - `extra`: Whether it becomes a second box of its week.
 */
export type PickChange = {
    module: string;
    type: string;
    group: string;
    start: string;
    extra?: boolean;
};

/** A group to write. */
export type GroupNew = {
    module: string;
    rule: Rule;
};

/**
 * A group made or changed.
 *
 * - `rule`: No extras and no times of its own, since a group meets weekly.
 * - `made`: A new group, so none of its type, group and semester may be there yet.
 * - `was`: The name of the group before I renamed it.
 * - `states`: The dates I marked cancelled or open again, by their days.
 */
export type GroupChange = {
    module: string;
    rule: Rule;
    made: boolean;
    was?: string;
    states?: { [day: string]: BoxState };
    dry: boolean;
};

/** One session of a group the university changed alone. */
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

/** A group to remove. */
export type GroupGone = {
    module: string;
    type: string;
    group: string;
    semester: string;
};

/**
 * A new box repeated weekly.
 *
 * - `box`: Without its day, time, length and deadline, which each date sets.
 * - `states`: As those of a series, each by its day.
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

/** An exam changed, its kind its `X-NUMBER`, both times empty to keep its times. */
export type ExamChange = {
    box: string;
    kind: string;
    start: string;
    end: string;
};

/**
 * A box of a series after a change, for the preview.
 *
 * - `state`: `new` for a new one, `university` for a new one I cancelled.
 * - `editable`: Whether I may skip it or mark it cancelled by the university.
 * - `change`: Empty for one that stays as it is, or whose state alone changes.
 * - `chained`: Of a plain series, whether it is a day of another series of its chain, only shown.
 * - `location`, `locationLink`: Only of a session the university changed alone.
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

/** What a rule is read back from, a box at its place in its series or a session of a group. */
type Dated = Pick<Box, "day" | "time" | "minutes" | "location" | "locationLink" | "attendees"> &
    Online & { group?: string };

/** A date of a rule with the place of its slot, -1 for an extra. */
type RuleDate = Extra & {
    slot: number;
    minutes?: number;
};

/** What of a box a change of a series sets. */
type Field = "day" | "time" | "location" | "online" | "attendees" | "group";

/**
 * A date of a series after a change.
 *
 * - `before`: The weekday the box it takes fell on before the change.
 * - `made`: Whether it gets a new box while no box of its week is there to take.
 * - `added`: Whether its slot or extra is added in the form, which takes only a box of its own weekday,
 *   so a Thursday added never takes the box of a Monday taken out.
 * - `retimed`: Whether I typed its times anew, which a box a change may not change otherwise takes too.
 */
type Target = Place & {
    day: string;
    start: string;
    minutes: number | null;
    group: string;
    before: number;
    fields: Field[];
    made: boolean;
    added: boolean;
    retimed: boolean;
};

/** A box as a change of a series plans it before anything is written, its box `null` for a new one. */
type Draft = Place & {
    box: Box | null;
    day: string;
    time: string;
    minutes: number | null;
    group: string;
    number: string;
    removed: boolean;
};

/** The fields of a new skill to-do but its place and times. */
type TodoHead = Omit<TodoFields, keyof Place | "day" | "time" | "minutes">;

/** Everything of a box a change sets. */
const allFields: Field[] = ["day", "time", "location", "online", "attendees", "group"];

/** Most weeks a rule may span, so a slip of a year typed makes no hundreds of boxes. */
const ruleWeeks: number = 53;

const weekLength: number = 7 * 24 * 60 * 60 * 1000;

/** Type of the exams of a module. */
const examType: string = "FA";

/** The kinds of an exam, its `X-NUMBER`, in the order they come in a semester. */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/** Regions whose holidays the university keeps, Germany and Bavaria, where TUM lies. */
const universityRegions: string[] = ["DE", "BY"];

/** Dates the university does not teach on, as `Termine und Feiertage` of TUM names them. */
const lectureFreeTitles: string[] = [
    "Vorlesungsfreie Zeit (TUM)",
    "Weihnachtsferien (TUM)",
    "Osterferien (TUM)",
    "Pfingstferien (TUM)",
    "Dies Academicus (TUM)",
];

/** The Monday of the week of a day, which names its week. */
function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/** The instant of a time of a day in Berlin time. */
function instantOf(day: string, time: string): Date {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return berlinInstantOf(day, hours, minutes);
}

/** What of an item is online. */
function onlineOf(item: Online): Online {
    return {
        online: item.online,
        onlineLink: item.onlineLink,
        onlineChannel: item.onlineChannel,
        onlineTitle: item.onlineTitle,
    };
}

/** The place of an item. */
function placeOf(item: Place): Place {
    return {
        location: item.location,
        locationLink: item.locationLink,
        ...onlineOf(item),
        attendees: item.attendees,
    };
}

/** The first day of a semester, its course read for a year from it, so a retake after its end belongs to it. */
function semesterBeginOf(semester: string): string {
    return `${semester.slice(0, 4)}-${semester.endsWith("W") ? "10" : "04"}-01`;
}

/** The value whose key most of a list have, the earliest of those equally many. */
function modeOf<T>(values: T[], keyOf: (value: T) => string): T | undefined {
    const byKey: Map<string, T[]> = Map.groupBy(values, keyOf);
    const countOf: (value: T) => number = (value: T): number => byKey.get(keyOf(value))?.length ?? 0;
    return values.reduce(
        (best: T | undefined, value: T): T | undefined =>
            best === undefined || countOf(value) > countOf(best) ? value : best,
        undefined,
    );
}

/** Orders boxes, dates and sessions by their starts, of one without time its day. */
function startOrder(first: Pick<Box, "day" | "time">, second: Pick<Box, "day" | "time">): number {
    return (first.time || first.day).localeCompare(second.time || second.day);
}

/** A box at its place in its series, where it stood before its first push. */
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

/** The week of a box in its series, by its Monday. */
function weekOf(box: Box): string {
    return mondayOf(datedOf(box).day);
}

/** Takes out of the boxes of a week the first on a weekday, else with `any` the earliest. */
function weekTake<T>(boxes: T[], weekday: number, any: boolean, dayOf: (box: T) => string): T | undefined {
    let found: number = boxes.findIndex((box: T): boolean => weekdayOf(dayOf(box)) === weekday);
    if (found === -1 && any && boxes.length > 0) found = 0;
    return found === -1 ? undefined : boxes.splice(found, 1)[0];
}

/** The start and end time of an item as a slot has them, both empty without time. */
function timesOf(item: Dated | undefined): [string, string] {
    return item === undefined || item.time === ""
        ? ["", ""]
        : [
              berlinTimeOf(new Date(item.time)),
              berlinTimeOf(new Date(Date.parse(item.time) + (item.minutes ?? 0) * 60 * 1000)),
          ];
}

/**
 * The days the university does not teach from one day to another,
 * a holiday whose regions in the bracket at the end of its `SUMMARY` name one of {@link universityRegions},
 * and every day of a date of {@link lectureFreeTitles}.
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
                    regionsOf(entry.title).some((code: string): boolean => universityRegions.includes(code))) ||
                    (entry.category === "University" && lectureFreeTitles.includes(entry.title))),
        )
        .forEach((entry: Entry): void => {
            for (let day: string = entry.start; day < entry.end; day = dayAdd(day, 1)) skipped.add(day);
        });
    return skipped;
}

/**
 * Reads back the weekly rule of a series or a group.
 * Its slots are each weekday at least two items fall on, else the most common one,
 * with the time, length, place and people most of them have.
 * Its weeks run from the first item on a slot to the last, a box on another day of a week filling a missing one.
 * Every other item is an extra.
 * - `grouped`: The first box at a group, whose week stays a week of the series, never an extra.
 *
 * @param items - What the rule follows, at least one
 * @param all - What its days come from, every box of the series, also of a week at another group
 */
function ruleOf(type: string, items: Dated[], all: Dated[], group: string, semester: string): Rule {
    const counts: Map<number, number> = new Map();
    items.forEach((item: Dated): void => {
        counts.set(weekdayOf(item.day), (counts.get(weekdayOf(item.day)) ?? 0) + 1);
    });
    let weekdays: number[] = [...counts.keys()]
        .filter((weekday: number): boolean => (counts.get(weekday) ?? 0) >= 2)
        .sort();
    if (weekdays.length === 0)
        weekdays = [weekdayOf(modeOf(items, (item: Dated): string => String(weekdayOf(item.day)))?.day ?? all[0].day)];
    const slots: Slot[] = weekdays.map((weekday: number): Slot => {
        const timed: Dated | undefined = modeOf(
            items.filter((item: Dated): boolean => item.time !== "" && weekdayOf(item.day) === weekday),
            (item: Dated): string => `${berlinTimeOf(new Date(item.time))} ${item.minutes}`,
        );
        const [start, end]: [string, string] = timesOf(timed);
        const long: Dated | undefined =
            timed !== undefined
                ? undefined
                : modeOf(
                      items.filter(
                          (item: Dated): boolean =>
                              item.time === "" && (item.minutes ?? 0) > 0 && weekdayOf(item.day) === weekday,
                      ),
                      (item: Dated): string => String(item.minutes),
                  );
        return long === undefined
            ? { weekday: weekday, start: start, end: end }
            : { weekday: weekday, start: "", end: "", minutes: long.minutes ?? 0 };
    });
    const placed: Dated | undefined = modeOf(items, (item: Dated): string => item.location);
    const met: Dated | undefined = modeOf(items, (item: Dated): string => JSON.stringify(onlineOf(item)));
    const people: Dated | undefined = modeOf(items, (item: Dated): string => JSON.stringify(item.attendees));
    const sorted: Dated[] = [...all].sort(startOrder);
    let onSlots: string[] = sorted
        .map((item: Dated): string => item.day)
        .filter((day: string): boolean => weekdays.includes(weekdayOf(day)));
    if (onSlots.length === 0) onSlots = sorted.map((item: Dated): string => item.day);
    const grouped: Dated | undefined = sorted.find((item: Dated): boolean => (item.group ?? "") !== "");
    const from: string =
        grouped !== undefined && mondayOf(grouped.day) < mondayOf(onSlots[0]) ? mondayOf(grouped.day) : onSlots[0];
    const to: string = onSlots[onSlots.length - 1];
    const skipped: Set<string> = lectureFreeOf(from, to);
    const days: string[] = [];
    const extras: Dated[] = sorted.filter(
        (item: Dated): boolean => mondayOf(item.day) < mondayOf(from) || mondayOf(item.day) > mondayOf(to),
    );
    const times: Times = {};
    for (let week: string = mondayOf(from); week <= to; week = dayAdd(week, 7)) {
        const free: Dated[] = sorted.filter((item: Dated): boolean => mondayOf(item.day) === week);
        const missing: string[] = [];
        slots.forEach((slot: Slot): void => {
            const day: string = dayAdd(week, slot.weekday - 1);
            if (day < from || day > to || skipped.has(day)) return;
            const taken: Dated | undefined = weekTake(free, slot.weekday, false, (item: Dated): string => item.day);
            const [start, end]: [string, string] = timesOf(taken);
            if (taken === undefined) missing.push(day);
            else days.push(taken.day);
            if (start !== "" && (start !== slot.start || end !== slot.end)) times[day] = { start: start, end: end };
        });
        days.push(...free.slice(0, missing.length).map((item: Dated): string => item.day));
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
            .sort((first: Extra, second: Extra): number => first.day.localeCompare(second.day)),
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
 * The dates of a rule by their days, its slots in each of its weeks and its extras.
 * A numbered type skips the days the university does not teach.
 */
function datesOf(rule: Rule): RuleDate[] {
    const skipped: Set<string> = numberedTypes.includes(rule.type) ? lectureFreeOf(rule.first, rule.last) : new Set();
    const dates: RuleDate[] = rule.extras.map((extra: Extra): RuleDate => ({
        ...extra,
        slot: -1,
    }));
    for (let week: string = mondayOf(rule.first); week <= rule.last; week = dayAdd(week, 7))
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
            first.day.localeCompare(second.day) || first.start.localeCompare(second.start),
    );
}

/** My group of a type, the one I pinned, empty while none is. */
function pinnedOf(groups: Group[], type: string): string {
    return groups.find((group: Group): boolean => group.rule.type === type && group.pinned)?.rule.group ?? "";
}

/** A test for the group of a type and a name. */
function groupMatch(type: string, group: string): (one: Group) => boolean {
    return (one: Group): boolean => one.rule.type === type && one.rule.group === group;
}

/** Whether a tutorial box is my own choice, its `X-GROUP` another than the group pinned. */
function chosenIs(box: Box, pinned: string): boolean {
    return box.group !== "" && box.group !== pinned;
}

/**
 * Pins a group of a type with `X-PINNED=TRUE` on its `X-GROUP`, unpinning every other, none for empty.
 *
 * @throws {Error} - When the plan cannot be written
 */
function pinPut(module: string, type: string, semester: string, group: string): void {
    const file: string = skillFileOf(module, planEnding);
    groupsRead(module, semester)
        .filter((one: Group): boolean => one.rule.type === type && one.pinned !== (one.rule.group === group))
        .forEach((one: Group): void =>
            one.ids.forEach((id: string): void =>
                propertiesPut(file, id, [["x-group", [groupPropertyOf(one.rule.group, one.rule.group === group)]]]),
            ),
        );
}

/** The first day of lectures of a semester from `University.ics`. */
function lecturesBeginOf(semester: string): string | undefined {
    const begin: string = semesterBeginOf(semester);
    return entriesRead(holidays, berlinDayStartOf(begin), berlinDayStartOf(dayAdd(begin, 183))).find(
        (entry: Entry): boolean =>
            entry.allDay && entry.category === "University" && entry.title === `Vorlesungsbeginn ${semester}`,
    )?.start;
}

/**
 * The weeks of a type with groups by their Mondays, from the first day of lectures or session to the last,
 * those not wholly free of lectures.
 * So a week with one session cancelled keeps its place and a group added numbers no week anew.
 *
 * @param days - Days of sessions of a group being changed
 */
function tutorialWeeksOf(groups: Group[], type: string, days: string[] = []): string[] {
    const starts: string[] = [
        ...days,
        ...sessionDaysOf(groups.filter((group: Group): boolean => group.rule.type === type)),
    ].sort();
    if (starts.length === 0) return [];
    const begin: string | undefined = lecturesBeginOf(semesterOf(starts[0]));
    const first: string = mondayOf(begin !== undefined && begin < starts[0] ? begin : starts[0]);
    const last: string = mondayOf(starts[starts.length - 1]);
    const free: Set<string> = lectureFreeOf(first, dayAdd(last, 4));
    const weeks: string[] = [];
    for (let week: string = first; week <= last; week = dayAdd(week, 7))
        if ([0, 1, 2, 3, 4].some((day: number): boolean => !free.has(dayAdd(week, day)))) weeks.push(week);
    return weeks;
}

/** The number of the week of a day among the weeks of a type, at least `1`. */
function weekNumberOf(weeks: string[], day: string): number {
    return Math.max(1, weeks.filter((week: string): boolean => week <= mondayOf(day)).length);
}

/**
 * Stops a module folder of none of my modules.
 *
 * @throws {Error} - When `NomSkillingmodules` holds no such module folder
 */
function folderCheck(module: string): void {
    if (!moduleFoldersRead().includes(module)) throw new Error(`No module folder ${module}`);
}

/** The skill boxes of a module of a semester, up to a year after it begins, so a retake is among them. */
function courseBoxesRead(code: string, semester: string): Box[] {
    return skillBoxesRead(dayAdd(semesterBeginOf(semester), 366))
        .filter(
            (box: Box): boolean =>
                box.module === code && (box.semester === "" ? semesterOf(box.day) : box.semester) === semester,
        )
        .sort(startOrder);
}

/** The boxes of a type of a module folder of a semester. */
function typedBoxesRead(module: string, semester: string, type: string): Box[] {
    return courseBoxesRead(codeOf(module), semester).filter((box: Box): boolean => box.type === type);
}

/** My own learning of a module in a semester, a whole-day entry not counted. */
function learnedRead(code: string, semester: string): Learned[] {
    const begin: string = semesterBeginOf(semester);
    return entriesRead(skillLog, berlinDayStartOf(begin), berlinDayStartOf(dayAdd(begin, 366)))
        .filter(
            (entry: Entry): boolean =>
                entry.category === skillName &&
                entry.module === code &&
                entry.type === "" &&
                entry.planned === "" &&
                !entry.allDay &&
                (entry.semester === "" ? semesterOf(berlinDateOf(new Date(entry.start))) : entry.semester) === semester,
        )
        .map((entry: Entry): Learned => ({
            id: entry.id,
            day: berlinDateOf(new Date(entry.start)),
            time: entry.start,
            minutes: Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000)),
            ...placeOf(entry),
            note: entry.note,
        }))
        .sort(startOrder);
}

/**
 * The groups of a module of a semester with their sessions, the to-dos of one type and group as one.
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
                (entry.semester === "" ? semesterOf(dayOfStart(entry.start)) : entry.semester) === semester,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
    const changed: Set<string> = new Set(
        existsSync(file)
            ? fileEntriesRead(file)
                  .filter((entry: Entry): boolean => entry.recurrence !== "")
                  .map(entryIdOf)
            : [],
    );
    const keyOf: (entry: Entry) => string = (entry: Entry): string => `${entry.type} ${entry.group}`;
    return [...Map.groupBy(sessions, keyOf).values()]
        .map((own: Entry[]): Group => {
            const dated: Dated[] = own.map((entry: Entry): Dated => ({
                day: dayOfStart(entry.start),
                time: entry.allDay ? "" : entry.start,
                minutes: entry.minutes,
                ...placeOf(entry),
            }));
            const ahead: Dated[] = dated.filter((item: Dated): boolean => item.day >= today);
            return {
                ids: [
                    ...new Set(
                        own.flatMap((entry: Entry): string[] =>
                            changed.has(entryIdOf(entry)) ? [entry.id, entryIdOf(entry)] : [entry.id],
                        ),
                    ),
                ],
                rule: ruleOf(own[0].type, ahead.length > 0 ? ahead : dated, dated, own[0].group, semester),
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

/** The series of a module, one per numbered type, its rule read from the boxes of my group if any. */
function seriesListOf(boxes: Box[], semester: string, groups: Group[]): Series[] {
    return numberedTypes.flatMap((type: string): Series[] => {
        const typed: Box[] = boxes.filter((box: Box): boolean => box.type === type);
        const mine: string = pinnedOf(groups, type);
        const own: Box[] = typed.filter((box: Box): boolean => mine === "" || box.group === mine);
        return typed.length === 0
            ? []
            : [
                  {
                      rule: ruleOf(type, own.map(datedOf), typed.map(datedOf), mine, semester),
                      count: typed.length,
                  },
              ];
    });
}

/**
 * The course of a module in a semester, the semester of today unless named.
 *
 * @param module - Name of the module folder or its code
 * @throws {Error} - When there is no such module folder or the semester is not written like `2026W`
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
            skillTypes.map((type: string): [string, string] => [type, skillLinkOf(codeOf(folder), type)]),
        ),
        file: vaultPathOf(skillFileOf(folder, planEnding)),
    };
}

/** Whether a start and an end are times well written, the start before the end. */
function timesRight(times: Pick<Slot, "start" | "end">): boolean {
    const time: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/;
    return time.test(times.start) && time.test(times.end) && minutesOf(times.start) < minutesOf(times.end);
}

/** Whether a slot has right times, or without times a length up to a day. */
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

/** The length of a slot, an extra or a date, `null` for none. */
function slotLengthOf(times: Pick<Slot, "start" | "end" | "minutes">): number | null {
    return times.start === "" ? (times.minutes ?? null) : minutesOf(times.end) - minutesOf(times.start);
}

/** The days of the sessions of groups. */
function sessionDaysOf(groups: Group[]): string[] {
    return groups.flatMap((group: Group): string[] =>
        group.sessions.map((session: Session): string => dayOfStart(session.start)),
    );
}

/** The `UID` and the start of a session by its identifier. */
function idPartsOf(id: string): [string, string] {
    return [id.slice(0, id.lastIndexOf("#")), id.slice(id.lastIndexOf("#") + 1)];
}

/** The start of a box of a date as ISO instant, empty without times. */
function slotMomentOf(day: string, start: string): string {
    return start === "" ? "" : instantOf(day, start).toISOString();
}

/**
 * Whether the weeks of a rule are right, slots on different weekdays,
 * its last day and extras at most {@link ruleWeeks} weeks from its first, so a slip of a year makes no box far away.
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
                Number.isInteger(slot.weekday) && slot.weekday >= 1 && slot.weekday <= 7 && slotRight(slot),
        ) &&
        new Set(rule.slots.map((slot: Slot): number => slot.weekday)).size === rule.slots.length &&
        day.test(rule.first) &&
        day.test(rule.last) &&
        rule.first <= rule.last &&
        near(rule.last) &&
        rule.extras.every((extra: Extra): boolean => day.test(extra.day) && near(extra.day) && timesRight(extra)) &&
        Object.entries(rule.times ?? {}).every(
            ([own, times]: [string, Pick<Slot, "start" | "end">]): boolean => day.test(own) && timesRight(times),
        )
    );
}

/**
 * Stops a rule not of a numbered type, with wrong weeks, semester or people, or a group with spaces.
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

/** Whether a box is a to-do of the new system and no date of a series of a file, the only kind I number. */
function newTodoIs(box: Box): boolean {
    return box.editable && box.todo && !box.series;
}

/**
 * Whether a change of a series may change or remove a box, never pushed, open or cancelled by the university.
 * One done, cancelled or pushed by me is my own decision.
 */
function changeable(box: Box): boolean {
    return newTodoIs(box) && box.pushed.length === 0 && (box.state === "open" || box.state === "university");
}

/** Whether I may give a box another state, neither done, which the log decides, nor pushed. */
function stateable(box: Box): boolean {
    return newTodoIs(box) && box.state !== "done" && box.state !== "pushed";
}

/**
 * Whether a box takes the times I typed for its day, never pushed, whatever its state and day,
 * so a lecture done takes the times it really had.
 */
function retimable(box: Box): boolean {
    return newTodoIs(box) && box.pushed.length === 0;
}

/**
 * A box with the state I gave it, skipped keeping its number, `NONE` cancelled by the university,
 * open again numbered anew.
 * A state I may not give leaves it as it is.
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

/** Whether a box lies today or later, the only kind a changed rule moves or removes. */
function ahead(box: Box): boolean {
    return box.day >= berlinDateOf(new Date());
}

/** The draft of a box as it stands. */
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

/** The draft of a new box of a date. */
function madeDraftOf(target: Target): Draft {
    return {
        box: null,
        day: target.day,
        time: slotMomentOf(target.day, target.start),
        minutes: target.minutes,
        ...placeOf(target),
        group: target.group,
        number: "",
        removed: false,
    };
}

/** The date a session of a group sets the box of its week to, all of it and the group. */
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

/** Sets a draft to what changed of the date it takes, a time kept at its time of day on a new day. */
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
 * Plans a change of a series week by week.
 * Each date takes the box of its week on its weekday before, else but for a date added the earliest left.
 * A box the change may not change stays, so its date gets no new box, but takes the times I typed.
 * A date without box gets a new one, and every other box of the week the change may change goes.
 *
 * @param touched - Whether the change may change a box, not one of a week I go to another group
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
            weekTake(free, target.before, false, seriesDayOf),
        );
        dates.forEach((target: Target, index: number): void => {
            if (!target.added) taken[index] ??= weekTake(free, target.before, true, seriesDayOf);
        });
        dates.forEach((target: Target, index: number): void => {
            const box: Box | undefined = taken[index];
            if (box === undefined && target.made) drafts.push(madeDraftOf(target));
            else if (box !== undefined && touched(box)) drafts.push(draftSet(draftOf(box), target));
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
 * Numbers the boxes of a type by their places in the series, each one more than the one before,
 * done, skipped and pushed alike, so no number stands twice.
 * One the university cancelled keeps `NONE` and counts not.
 * One I do not number keeps its number, the next going on from it.
 * Of a type with groups each box takes the number of its week instead.
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
        .sort((first: Draft, second: Draft): number => orderOf(first).localeCompare(orderOf(second)))
        .forEach((draft: Draft): void => {
            if (draft.number === "NONE") return;
            if (draft.box !== null && !newTodoIs(draft.box)) {
                last = /^\d+$/.test(draft.number) ? Number(draft.number) : last;
                return;
            }
            const place: string = orderOf(draft);
            last =
                weeks.length === 0
                    ? last + 1
                    : weekNumberOf(weeks, place.length > 10 ? berlinDateOf(new Date(place)) : place);
            draft.number = String(last);
        });
}

/**
 * Numbers the boxes of a type of a module of a semester anew, writing only the numbers that change.
 *
 * @throws {Error} - When there is no such module folder, or a box cannot be written
 */
export function numbersRenew(module: string, type: string, semester: string): void {
    const folder: string = moduleFolderOf(codeOf(module)) ?? module;
    folderCheck(folder);
    draftsApply(
        folder,
        type,
        semester,
        groupsRead(folder, semester),
        typedBoxesRead(folder, semester, type).map(draftOf),
    );
}

/**
 * Numbers the drafts of a type anew, writes them and gives them for the preview.
 *
 * @param dry - Whether only to give them, writing nothing
 */
function draftsApply(
    module: string,
    type: string,
    semester: string,
    groups: Group[],
    drafts: Draft[],
    dry: boolean = false,
): Planned[] {
    numbersOf(drafts, tutorialWeeksOf(groups, type));
    if (!dry) draftsWrite(module, type, semester, drafts);
    return plannedOf(drafts);
}

/** The fields of a new skill to-do of a type of a module but its place and times. */
function skillTodoOf(module: string, type: string, semester: string): TodoHead {
    const code: string = codeOf(module);
    const [title, titleLink]: [string, string] = titleOf(
        { category: skillName, title: "", module: code, type: type, semester: semester },
        null,
    );
    return {
        category: skillName,
        title: title,
        titleLink: titleLink,
        from: "",
        module: code,
        type: type,
        semester: semester,
        note: "",
        deadline: "",
    };
}

/** Whether a draft sets the day, time, length or place of its box anew. */
function draftMoved(draft: Draft, box: Box): boolean {
    const keyOf: (item: Draft | Box) => string = (item: Draft | Box): string =>
        JSON.stringify([item.day, item.time, item.minutes, placeOf(item)]);
    return keyOf(draft) !== keyOf(box);
}

/**
 * Writes a change of a series as planned, of a box that stays only what changed against its file.
 *
 * @throws {Error} - When a box cannot be found or written, like one done meanwhile
 */
function draftsWrite(module: string, type: string, semester: string, drafts: Draft[]): void {
    const file: string = skillFileOf(module, planEnding);
    const head: TodoHead = skillTodoOf(module, type, semester);
    drafts.forEach((draft: Draft): void => {
        const box: Box | null = draft.box;
        const times: Omit<TodoFields, keyof TodoHead> = {
            ...placeOf(draft),
            day: draft.day,
            time: draft.time === "" ? null : new Date(draft.time),
            minutes: draft.minutes,
        };
        const numbered: [string, string[]][] = [
            ["x-number", draft.number === "" ? [] : [draft.number]],
            ["x-group", draft.group === "" ? [] : [draft.group]],
        ];
        if (box === null) return propertiesPut(file, todoAppend(file, { ...head, ...times }), numbered);
        if (draft.removed) return boxDelete(box.id);
        const [boxFile, entry, stands]: [string, Entry, Box] = boxFind(box.id);
        if ((box.state === "dropped") !== (stands.state === "dropped")) boxDrop(box.id, box.state === "dropped");
        if (draftMoved(draft, box)) todoChange(boxFile, entry, { ...entry, ...times }, boxFile);
        if (draft.number !== stands.number || draft.group !== stands.group) propertiesPut(boxFile, box.id, numbered);
    });
}

/** The boxes of a series as planned for the preview, removed ones too, by their days. */
function plannedOf(drafts: Draft[]): Planned[] {
    return drafts
        .map((draft: Draft): Planned => {
            let change: Planned["change"] = "";
            if (draft.box === null) change = "new";
            else if (draft.removed) change = "removed";
            else if (draftMoved(draft, draft.box)) change = "changed";
            else if (draft.number !== draft.box.number || draft.group !== draft.box.group) change = "renumbered";
            return {
                id: draft.box?.id ?? "",
                day: draft.day,
                time: draft.time,
                minutes: draft.minutes,
                number: draft.number,
                state: draft.box?.state ?? (draft.number === "NONE" ? "university" : "new"),
                pushed: (draft.box?.pushed.length ?? 0) > 0,
                editable: draft.box === null || stateable(draft.box),
                retimable: draft.box === null || retimable(draft.box),
                change: change,
                attendees: draft.attendees,
            };
        })
        .sort(startOrder);
}

/**
 * What of a date changed against the slot or extra whose boxes it takes, all for one added.
 *
 * @param before - The slot or the extra as read back, `undefined` for one added
 * @param shared - What changed of the whole rule
 */
function slotFieldsOf(before: Slot | Extra | undefined, date: Slot | Extra, shared: Field[]): Field[] {
    if (before === undefined) return ["day", "time", "location", "online", "attendees"];
    const changed: [Field, boolean][] = [
        ["day", "weekday" in before && "weekday" in date && before.weekday !== date.weekday],
        ["time", before.start !== date.start || slotLengthOf(before) !== slotLengthOf(date)],
    ];
    return [
        ...changed
            .filter(([, differs]: [Field, boolean]): boolean => differs)
            .map(([field]: [Field, boolean]): Field => field),
        ...shared,
    ];
}

/**
 * Changes a series by its rule, or only tells what that would make.
 * Each box takes the state I gave it, then each date takes the box of its week with what changed.
 * A date without box gets one, only from today on for a series with boxes.
 * A box no date takes goes, but only an open one from today on that is not my own choice.
 * - `wasDay`: The day of a date as read back, so a box with times of its own keeps them
 *   while the times of its slot change.
 * - `met`: Of a type with groups the days my group meets, so a week it does not meet is no new date.
 * - `picked`: The weeks I gave to another group, holding boxes of my own choice only.
 *
 * @throws {Error} - When the module or rule is not right, or a box cannot be written
 */
export function seriesApply(change: SeriesChange): Planned[] {
    folderCheck(change.module);
    ruleCheck(change.rule);
    const rule: Rule = change.rule;
    const old: Rule | null = change.old;
    const today: string = berlinDateOf(new Date());
    const typed: Box[] = typedBoxesRead(change.module, rule.semester, rule.type).map((box: Box): Box =>
        stateSet(box, change.states?.[box.id]),
    );
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
                  ["attendees", JSON.stringify(old.attendees) !== JSON.stringify(rule.attendees)],
              ];
    const shared: Field[] = changed
        .filter(([, differs]: [Field, boolean]): boolean => differs)
        .map(([field]: [Field, boolean]): Field => field);
    const wasOf: (date: RuleDate) => Slot | Extra | undefined = (date: RuleDate): Slot | Extra | undefined =>
        date.slot === -1
            ? old?.extras.find((extra: Extra): boolean => extra.day === date.day)
            : old?.slots.find(
                  (slot: Slot): boolean =>
                      slot.weekday === (change.before?.[date.slot] ?? rule.slots[date.slot].weekday),
              );
    const own: Group[] = mine === "" ? [] : groups.filter(groupMatch(rule.type, mine));
    const met: Set<string> | null = own.length === 0 ? null : new Set(sessionDaysOf(own));
    const held: Set<string> = new Set(typed.map(weekOf));
    const picked: Set<string> = new Set(
        mine === ""
            ? []
            : [...held].filter((week: string): boolean =>
                  typed.every((box: Box): boolean => weekOf(box) !== week || chosenIs(box, mine)),
              ),
    );
    const targets: Target[] = datesOf(rule)
        .filter(
            (date: RuleDate): boolean =>
                (met === null || met.has(date.day) || held.has(mondayOf(date.day))) && !picked.has(mondayOf(date.day)),
        )
        .map((date: RuleDate): Target => {
            const was: Slot | Extra | undefined = wasOf(date);
            const wasDay: string =
                was !== undefined && "weekday" in was ? dayAdd(date.day, was.weekday - weekdayOf(date.day)) : date.day;
            const retimed: boolean =
                date.slot === -1
                    ? was !== undefined && (was.start !== date.start || was.end !== date.end)
                    : JSON.stringify(rule.times?.[date.day]) !== JSON.stringify(old?.times?.[wasDay]);
            return {
                day: date.day,
                start: date.start,
                minutes: slotLengthOf(date),
                location: rule.location,
                locationLink: link,
                ...online,
                attendees: rule.attendees,
                group: mine,
                before: was !== undefined && "weekday" in was ? was.weekday : weekdayOf(date.day),
                fields: slotFieldsOf(
                    was === undefined ? undefined : { ...was, ...old?.times?.[wasDay] },
                    date.slot === -1 ? date : { ...rule.slots[date.slot], start: date.start, end: date.end },
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
        .filter((draft: Draft): boolean => draft.box === null && change.states?.[draft.day] === "university")
        .forEach((draft: Draft): void => {
            draft.number = "NONE";
        });
    return draftsApply(change.module, rule.type, rule.semester, groups, drafts, change.dry);
}

/**
 * Makes a new box once per date of its weekly rule, or only tells what that would make.
 * A skill box of a numbered type becomes its series, numbered.
 * While its type has a box in that semester, its series is there already, so nothing is made.
 *
 * @returns The boxes it makes by their days, `null` for a type with a series already
 * @throws {Error} - When the rule or the box is not right, or a box cannot be written
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
        box.category === skillName && numberedTypes.includes(box.type) ? moduleFolderOf(box.module) : undefined;
    if (module !== undefined)
        return courseBoxesRead(box.module, box.semester).some((one: Box): boolean => one.type === box.type)
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
 * Gives an exam the kind and times I gave it, each only when it changed, its log entry as it is.
 *
 * @throws {Error} - When it is no exam I may change, its kind is none of {@link examKinds}, or its times are wrong
 */
export function examSet(change: ExamChange): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(change.box);
    const timed: boolean = change.start !== "" || change.end !== "";
    if (
        box.category !== skillName ||
        box.type !== examType ||
        !newTodoIs(box) ||
        (change.kind !== box.number && !examKinds.includes(change.kind)) ||
        (timed && (!retimable(box) || !timesRight(change)))
    )
        throw new Error(`No change of an exam: ${JSON.stringify(change)}`);
    const time: string = timed ? instantOf(box.day, change.start).toISOString() : box.time;
    const minutes: number | null = timed ? minutesOf(change.end) - minutesOf(change.start) : box.minutes;
    if (time !== box.time || minutes !== box.minutes)
        todoChange(file, entry, { ...entry, day: box.day, time: new Date(time), minutes: minutes }, file);
    if (change.kind !== box.number) propertiesPut(file, box.id, [["x-number", [change.kind]]]);
}

/**
 * Makes a group mine and pins it, or only tells what that would make.
 * From the week of its next session on, the boxes that follow the pin go to its sessions,
 * a session without box getting one and a box of a week it does not meet going.
 * The past never changes by a pin, and my own choices stay as they are.
 * No group named takes my group back, its boxes from today on going.
 * - `picked`: The weeks that hold a box of my own choice but none that follows the pin.
 * - `drafts`: One the university cancelled for my old group open again once it goes to the new one.
 *
 * @throws {Error} - When there is no such module folder or group, it meets no more, or a box cannot be written
 */
export function groupMine(change: MineChange): Planned[] {
    folderCheck(change.module);
    const semester: string = semesterOf(berlinDateOf(new Date()));
    const groups: Group[] = groupsRead(change.module, semester);
    const pinned: string = pinnedOf(groups, change.type);
    const typed: Box[] = typedBoxesRead(change.module, semester, change.type);
    const dry: boolean = change.dry === true;
    if (change.group === "") {
        const kept: Draft[] = typed.map((box: Box): Draft => ({
            ...draftOf(box),
            removed: ahead(box) && changeable(box) && !chosenIs(box, pinned),
        }));
        const planned: Planned[] = draftsApply(change.module, change.type, semester, groups, kept, dry);
        if (!dry) pinPut(change.module, change.type, semester, "");
        return planned;
    }
    const group: Group | undefined = groups.find(groupMatch(change.type, change.group));
    const now: number = Date.now();
    const coming: Session[] = (group?.sessions ?? []).filter(
        (session: Session): boolean => Date.parse(session.start) + session.minutes * 60 * 1000 > now,
    );
    if (group === undefined || coming.length === 0)
        throw new Error(`No group ${change.type} ${change.group} ` + `with sessions to come in ${change.module}`);
    const from: string = mondayOf(berlinDateOf(new Date(coming[0].start)));
    const own: Box[] = typed.filter((box: Box): boolean => box.group === change.group);
    const chosen: Box[] = typed.filter((box: Box): boolean => box.group !== change.group && chosenIs(box, pinned));
    const regular: Box[] = typed.filter((box: Box): boolean => !own.includes(box) && !chosen.includes(box));
    const picked: Set<string> = new Set(
        chosen
            .map(weekOf)
            .filter((week: string): boolean => !regular.some((box: Box): boolean => weekOf(box) === week)),
    );
    let targets: Target[] = coming
        .map((session: Session): Target => targetOf(group, session))
        .filter((target: Target): boolean => !picked.has(mondayOf(target.day)));
    own.forEach((box: Box): void => {
        const week: Target[] = targets.filter((target: Target): boolean => mondayOf(target.day) === weekOf(box));
        const taken: Target | undefined = week.find((target: Target): boolean => target.day === box.day) ?? week[0];
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
            (draft: Draft): boolean => draft.number === "NONE" && draft.box !== null && draft.group !== draft.box.group,
        )
        .forEach((draft: Draft): void => {
            draft.number = "";
        });
    const planned: Planned[] = draftsApply(change.module, change.type, semester, groups, drafts, dry);
    if (!dry) pinPut(change.module, change.type, semester, change.group);
    return planned;
}

/**
 * Picks one session of a group for its week, no other week moving.
 * A box I skipped that week opens again, then the open box of the week goes to the session.
 * When I hold that session already by an extra, the box goes instead.
 * A week without box gets one, and with no later box the sessions from then on become my series.
 * As an extra the session becomes a second box of its week.
 *
 * @throws {Error} - When there is no such group or session, the week may not change, or a box cannot be written
 */
export function weekPick(change: PickChange): void {
    folderCheck(change.module);
    const semester: string = semesterOf(dayOfStart(change.start));
    const groups: Group[] = groupsRead(change.module, semester);
    const group: Group | undefined = groups.find(groupMatch(change.type, change.group));
    const session: Session | undefined = group?.sessions.find(
        (one: Session): boolean => Date.parse(one.start) === Date.parse(change.start),
    );
    if (group === undefined || session === undefined)
        throw new Error(
            `No session of group ${change.type} ${change.group} ` + `at ${change.start} in ${change.module}`,
        );
    const weekOfSession: (one: Session) => string = (one: Session): string => mondayOf(dayOfStart(one.start));
    const week: string = weekOfSession(session);
    let typed: Box[] = typedBoxesRead(change.module, semester, change.type);
    const at: (one: Box) => boolean = (one: Box): boolean =>
        (one.time || one.day) === session.start ||
        (one.time !== "" && Date.parse(one.time) === Date.parse(session.start));
    if (change.extra === true) {
        if (typed.some(at))
            throw new Error(`A box of ${change.type} of ${change.module} ` + `is there already at ${change.start}`);
        draftsApply(change.module, change.type, semester, groups, [
            ...typed.map(draftOf),
            madeDraftOf(targetOf(group, session)),
        ]);
        return;
    }
    const skipped: Box | undefined = typed.find(
        (one: Box): boolean => weekOf(one) === week && one.state === "dropped" && changeable({ ...one, state: "open" }),
    );
    if (skipped !== undefined) {
        boxDrop(skipped.id, false);
        typed = typedBoxesRead(change.module, semester, change.type);
    }
    const open: Box[] = typed.filter(
        (one: Box): boolean => weekOf(one) === week && changeable(one) && one.state === "open",
    );
    const box: Box | undefined =
        open.find((one: Box): boolean => !chosenIs(one, pinnedOf(groups, change.type))) ?? open[0];
    const held: Box | undefined = typed.find(at);
    if (box !== undefined) {
        draftsWrite(change.module, change.type, semester, [
            held !== undefined && held.id !== box.id
                ? { ...draftOf(box), removed: true }
                : draftSet(draftOf(box), targetOf(group, session)),
        ]);
        return;
    }
    if (typed.some((one: Box): boolean => weekOf(one) === week))
        throw new Error(`The ${change.type} of ${change.module} in the week of ${week} ` + "is done or may not change");
    const later: boolean = typed.some((one: Box): boolean => weekOf(one) > week);
    const firsts: Session[] = later
        ? []
        : [...Map.groupBy(group.sessions, weekOfSession).values()]
              .map((own: Session[]): Session => own[0])
              .filter((one: Session): boolean => weekOfSession(one) > week);
    const targets: Target[] = [targetOf(group, session), ...firsts.map((one: Session): Target => targetOf(group, one))];
    const drafts: Draft[] = draftsOf(
        typed,
        targets,
        [week, mondayOf(targets[targets.length - 1].day)],
        (): boolean => false,
    );
    draftsApply(change.module, change.type, semester, groups, drafts);
}

/**
 * Removes the to-dos of a group of a semester, each session changed alone too.
 *
 * @returns How many were removed
 */
function groupsTake(gone: GroupGone): number {
    const file: string = skillFileOf(gone.module, planEnding);
    const found: Group[] = groupsRead(gone.module, gone.semester).filter(groupMatch(gone.type, gone.group));
    found.forEach((group: Group): void => group.ids.forEach((id: string): void => entryRemove(file, id)));
    return found.length;
}

/**
 * Writes one slot of a group as one weekly to-do with one `EXDATE` per day without session.
 * Its `UNTIL` is the start of its last session in UTC, as the standard wants it beside a time zone.
 * A slot without times writes days.
 *
 * @param rule - The rule of the group with one slot, checked
 * @param days - The days of its sessions on that slot, at least one, the earliest first
 * @returns Identifier of the to-do written
 * @throws {Error} - When the link online is no web address
 */
function groupWrite(module: string, rule: Rule, days: string[]): string {
    const slot: Slot = rule.slots[0];
    const head: TodoHead = skillTodoOf(module, rule.type, rule.semester);
    const start: Date | null = slot.start === "" ? null : instantOf(days[0], slot.start);
    const fields: TodoFields = {
        ...head,
        location: rule.location,
        locationLink: placeLinkOf(rule.location, null),
        ...onlineFor(rule, null),
        attendees: rule.attendees,
        day: days[0],
        time: start,
        minutes: slotLengthOf(slot),
    };
    const until: string =
        start === null
            ? days[days.length - 1].replace(/-/g, "")
            : icsTextOf(instantOf(days[days.length - 1], slot.start).toISOString());
    const left: string[] = [];
    for (let day: string = dayAdd(days[0], 7); day < days[days.length - 1]; day = dayAdd(day, 7))
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
 * Moves my open boxes of a group from today on to its sessions anew, once the group changed.
 * Each takes a session of its week no other box of mine holds, so two boxes never take one session.
 * A box of a week the group no longer meets in stays as it is.
 *
 * @throws {Error} - When a box cannot be written
 */
function groupBoxesMove(module: string, type: string, group: string, semester: string): void {
    const found: Group | undefined = groupsRead(module, semester).find(groupMatch(type, group));
    if (found === undefined) return;
    const typed: Box[] = typedBoxesRead(module, semester, type).filter((box: Box): boolean => box.group === group);
    const moving: Box[] = typed.filter((box: Box): boolean => box.state === "open" && changeable(box) && ahead(box));
    const free: Map<string, Session[]> = Map.groupBy(found.sessions, (one: Session): string =>
        mondayOf(dayOfStart(one.start)),
    );
    const takeOf: (box: Box, any: boolean) => Session | undefined = (box: Box, any: boolean): Session | undefined =>
        weekTake(free.get(weekOf(box)) ?? [], weekdayOf(datedOf(box).day), any, (one: Session): string =>
            dayOfStart(one.start),
        );
    typed
        .filter((box: Box): boolean => !moving.includes(box))
        .forEach((box: Box): void => {
            takeOf(box, false);
        });
    const taken: (Session | undefined)[] = moving.map((box: Box): Session | undefined => takeOf(box, false));
    const drafts: Draft[] = moving.flatMap((box: Box, index: number): Draft[] => {
        const session: Session | undefined = taken[index] ?? takeOf(box, true);
        const draft: Draft | undefined =
            session === undefined ? undefined : draftSet(draftOf(box), targetOf(found, session));
        return draft !== undefined && draftMoved(draft, box) ? [draft] : [];
    });
    draftsWrite(module, type, semester, drafts);
}

/**
 * Writes a group in place of every to-do of the same type, group and semester.
 * - `rule`: Without extras, since a group meets weekly.
 *
 * @throws {Error} - When the rule is not right, has no group or not one slot, or holds no session
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
 * Makes or changes a group, or only tells what that would make.
 * Its sessions are the dates of its slots in its weeks, but those I marked cancelled
 * and the days its `EXDATE`s left out while not marked open again.
 * Only marking dates or renaming changes it in place.
 * Any other change is a new notice of the university, whose past stays true.
 * So a begun group ends at its last session before today and goes on from today, still pinned.
 * Then my boxes of it take its sessions anew, cancelled or opened with the sessions I marked.
 *
 * @returns Its sessions after the change as the boxes of a series, cancelled and removed ones too
 * @throws {Error} - When the rule is not right, a new group is there already or a changed one is not,
 *   it keeps no session, or a box cannot be written
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
    const old: Group | undefined = groups.find(groupMatch(rule.type, was));
    if (rule.group === "" || change.made !== (old === undefined))
        throw new Error(`${change.made ? "A group there already" : "No group"}: ${rule.type} ${was}`);
    if (was !== rule.group && groups.some(groupMatch(rule.type, rule.group)))
        throw new Error(`A group there already: ${rule.type} ${rule.group}`);
    const sessions: Session[] = old?.sessions ?? [];
    const met: Set<string> = new Set(sessionDaysOf(old === undefined ? [] : [old]));
    const skipped: Set<string> = new Set(
        old === undefined
            ? []
            : datesOf(old.rule)
                  .map((date: RuleDate): string => date.day)
                  .filter((day: string): boolean => !met.has(day)),
    );
    const dates: RuleDate[] = datesOf(rule);
    const cancelled: (date: RuleDate) => boolean = (date: RuleDate): boolean =>
        (change.states?.[date.day] ?? (skipped.has(date.day) ? "university" : "open")) === "university";
    const shared: boolean =
        old !== undefined &&
        JSON.stringify([old.rule.location, onlineOf(old.rule), old.rule.attendees]) !==
            JSON.stringify([rule.location, onlineOf(rule), rule.attendees]);
    const whenOf: (one: Rule) => string = (one: Rule): string =>
        JSON.stringify([
            one.slots.map((slot: Slot): string => `${slot.weekday} ${slot.start} ${slotLengthOf(slot)}`),
            one.first,
            one.last,
        ]);
    const sessionOn: (day: string) => Session | undefined = (day: string): Session | undefined =>
        sessions.find((session: Session): boolean => dayOfStart(session.start) === day);
    const opened: (string | undefined)[] = dates
        .filter((date: RuleDate): boolean => !cancelled(date) && skipped.has(date.day))
        .map((date: RuleDate): string | undefined => {
            const near: Session[] = sessions.filter(
                (session: Session): boolean =>
                    !session.changed && weekdayOf(dayOfStart(session.start)) === weekdayOf(date.day),
            );
            const before: Session | undefined = near
                .filter((session: Session): boolean => dayOfStart(session.start) < date.day)
                .pop();
            const uid: string = idPartsOf(before?.id ?? "")[0];
            return before === undefined ||
                !near.some(
                    (session: Session): boolean =>
                        dayOfStart(session.start) > date.day && session.id.startsWith(`${uid}#`),
                )
                ? undefined
                : `${uid}#${
                      date.start === ""
                          ? date.day
                          : instantOf(date.day, berlinTimeOf(new Date(before.start))).toISOString()
                  }`;
        });
    const whole: boolean =
        old === undefined || shared || whenOf(old.rule) !== whenOf(rule) || opened.includes(undefined);
    const begun: boolean = whole && sessions.some((session: Session): boolean => dayOfStart(session.start) < today);
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
                const time: string = own && was !== undefined ? was.start : slotMomentOf(date.day, date.start);
                const minutes: number | null = own && was !== undefined ? was.minutes : slotLengthOf(date);
                const had: boolean = was !== undefined || skipped.has(date.day);
                return {
                    id: "",
                    day: date.day,
                    time: time,
                    minutes: minutes,
                    number: cancelled(date) ? "NONE" : String(weekNumberOf(weeks, date.day)),
                    state: cancelled(date) ? "university" : had ? "open" : "new",
                    pushed: false,
                    editable: true,
                    retimable: false,
                    attendees: rule.attendees,
                    change: !had
                        ? "new"
                        : shared ||
                            (was === undefined) !== cancelled(date) ||
                            (was !== undefined && (was.start !== (time || date.day) || was.minutes !== minutes))
                          ? "changed"
                          : "",
                    ...(own && was !== undefined ? { location: was.location, locationLink: was.locationLink } : {}),
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
        ...sessions
            .filter(
                (session: Session): boolean =>
                    kept(dayOfStart(session.start)) ||
                    !dates.some((date: RuleDate): boolean => date.day === dayOfStart(session.start)),
            )
            .map((session: Session): Planned => ({
                id: "",
                day: dayOfStart(session.start),
                time: session.start === dayOfStart(session.start) ? "" : session.start,
                minutes: session.minutes,
                number: kept(dayOfStart(session.start)) ? String(weekNumberOf(weeks, dayOfStart(session.start))) : "",
                state: "open",
                pushed: false,
                editable: false,
                retimable: false,
                change: kept(dayOfStart(session.start)) ? "" : "removed",
                attendees: session.attendees,
                ...(session.changed ? { location: session.location, locationLink: session.locationLink } : {}),
            })),
    ].sort(startOrder);
    if (change.dry) return planned;
    const days: string[][] = rule.slots.map((_: Slot, index: number): string[] =>
        dates
            .filter((date: RuleDate): boolean => date.slot === index && !cancelled(date) && !kept(date.day))
            .map((date: RuleDate): string => date.day),
    );
    if (
        days.every((one: string[]): boolean => one.length === 0) &&
        !sessions.some((session: Session): boolean => kept(dayOfStart(session.start)))
    )
        throw new Error(`No session of group ${rule.type} ${rule.group} of ${change.module}`);
    if (was !== rule.group) groupRename(change.module, rule.type, rule.semester, was, rule.group);
    if (!whole) {
        dates
            .filter((date: RuleDate): boolean => cancelled(date) && met.has(date.day))
            .forEach((date: RuleDate): void => {
                seriesDayRemove(file, ...idPartsOf(sessionOn(date.day)?.id ?? ""));
            });
        opened.forEach((id: string | undefined): void => {
            if (id !== undefined) seriesDayRestore(file, ...idPartsOf(id));
        });
    } else {
        (old?.ids ?? [])
            .filter((id: string): boolean => !id.includes("#"))
            .forEach((uid: string): void => {
                const last: Session | undefined = sessions
                    .filter(
                        (session: Session): boolean =>
                            session.id.startsWith(`${uid}#`) && kept(dayOfStart(session.start)),
                    )
                    .pop();
                if (last !== undefined) seriesCut(file, uid, last.id.slice(uid.length + 1));
                else
                    (old?.ids ?? [])
                        .filter((id: string): boolean => id === uid || id.startsWith(`${uid}#`))
                        .forEach((id: string): void => entryRemove(file, id));
            });
        const written: string[] = rule.slots.flatMap((slot: Slot, index: number): string[] =>
            days[index].length === 0 ? [] : [groupWrite(change.module, { ...rule, slots: [slot] }, days[index])],
        );
        if (old?.pinned === true)
            written.forEach((id: string): void =>
                propertiesPut(file, id, [["x-group", [groupPropertyOf(rule.group, true)]]]),
            );
    }
    groupBoxesMove(change.module, rule.type, rule.group, rule.semester);
    const off: string[] = dates.filter(cancelled).map((date: RuleDate): string => date.day);
    const back: string[] = dates
        .filter((date: RuleDate): boolean => change.states?.[date.day] === "open" && skipped.has(date.day))
        .map((date: RuleDate): string => date.day);
    typedBoxesRead(change.module, rule.semester, rule.type)
        .filter((box: Box): boolean => box.group === rule.group && changeable(box))
        .forEach((box: Box): void => {
            if (box.state === "open" && off.includes(box.day)) boxUniversity(box.id, true);
            else if (box.state === "university" && back.includes(box.day)) boxUniversity(box.id, false);
        });
    if (back.length > 0) numbersRenew(change.module, rule.type, rule.semester);
    return planned;
}

/**
 * Changes one session of a group as the university changed it alone, as its own `RECURRENCE-ID`.
 * My open box at that session follows it.
 *
 * @throws {Error} - When there is no such group or session, its times are wrong, or the plan cannot be written
 */
export function sessionApply(change: SessionChange): void {
    folderCheck(change.module);
    const file: string = skillFileOf(change.module, planEnding);
    const sources: CalendarSource[] = [{ folder: dirname(file), ending: basename(file) }];
    const group: Group | undefined = groupsRead(change.module, change.semester).find(
        groupMatch(change.type, change.group),
    );
    const session: Session | undefined = group?.sessions.find((one: Session): boolean => one.id === change.id);
    const found: [string, Entry] | undefined =
        session === undefined ? undefined : occurrenceLookup(sources, ...idPartsOf(change.id));
    if (found === undefined || !timesRight(change))
        throw new Error(`No session ${change.id} of group ${change.type} ${change.group} ` + `in ${change.module}`);
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
 * Renames the `X-GROUP` of a group in its to-dos, my boxes and my log entries of its type and semester.
 *
 * @throws {Error} - When a file cannot be written
 */
function groupRename(module: string, type: string, semester: string, was: string, group: string): void {
    const plan: string = skillFileOf(module, planEnding);
    groupsRead(module, semester)
        .filter(groupMatch(type, was))
        .forEach((one: Group): void =>
            one.ids.forEach((id: string): void =>
                propertiesPut(plan, id, [["x-group", [groupPropertyOf(group, one.pinned)]]]),
            ),
        );
    const files: string[] = [planEnding, logEnding]
        .map((ending: string): string => skillFileOf(module, ending))
        .filter((file: string): boolean => existsSync(file));
    const taken: (entry: Entry) => boolean = (entry: Entry): boolean =>
        entry.type === type &&
        entry.group === was &&
        (entry.semester !== "" ? entry.semester : semesterOf(berlinDateOf(new Date(entry.start)))) === semester;
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
 * Removes my series of a type but its boxes done, since a log entry points to them.
 *
 * @returns How many boxes done stay
 * @throws {Error} - When there is no such module folder or series
 */
export function courseSeriesRemove(gone: Omit<GroupGone, "group">): number {
    folderCheck(gone.module);
    const boxes: Box[] = typedBoxesRead(gone.module, gone.semester, gone.type).filter(
        (box: Box): boolean => box.number !== "",
    );
    if (boxes.length === 0) throw new Error(`No series ${gone.type} of ${gone.semester} in ${gone.module}`);
    boxes.filter((box: Box): boolean => box.state !== "done").forEach((box: Box): void => boxDelete(box.id));
    return boxes.filter((box: Box): boolean => box.state === "done").length;
}

/**
 * Removes a group and my open boxes of it from today on, my boxes of days over staying.
 *
 * @throws {Error} - When there is no such module folder or group
 */
export function groupRemove(gone: GroupGone): void {
    folderCheck(gone.module);
    if (groupsTake(gone) === 0)
        throw new Error(`No group ${gone.type} ${gone.group} of ${gone.semester} in ${gone.module}`);
    const kept: Draft[] = typedBoxesRead(gone.module, gone.semester, gone.type).map((box: Box): Draft => ({
        ...draftOf(box),
        removed: box.group === gone.group && ahead(box) && changeable(box),
    }));
    draftsApply(gone.module, gone.type, gone.semester, groupsRead(gone.module, gone.semester), kept);
}
