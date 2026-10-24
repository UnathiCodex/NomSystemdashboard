/**
 * ## Rules
 *
 * Reads and writes a plain series of the plan: one to-do that repeats by its rule, its `RRULE`, like my sleep
 * of every night, `DTSTART;VALUE=DATE:20261013`, `ESTIMATED-DURATION:PT8H` and `RRULE:FREQ=DAILY`, unlike a series
 * of my course, whose boxes stand one by one with their numbers, see `course.ts`. Every series I make from a box
 * by its dialog is a plain one, but that of a skill box of a numbered type, see `numberedTypes` in `boxes.ts`.
 * A plain series has its weekdays, each with its time, like `14:00 – 16:00`, or no time, only how long it lasts,
 * like 8 hours, see {@link Plain}; its first day, and its last day or none, for a series without end. Since a rule has
 * one time for all its days, each time is a part of its own, one to-do, the parts of a series of several times sharing
 * one `X-SERIES`, see `seriesPartsOf` in `calendar.ts`, like my sleep of 8 hours from Sunday to Thursday and of
 * 9 hours on Friday and Saturday; the dialog reads and writes them together, see {@link plainRead}, and a part whose
 * time goes ends as a series does, see {@link plainGone}.
 * All seven weekdays write `FREQ=DAILY`, fewer `FREQ=WEEKLY;BYDAY=MO,TH`, a last day `UNTIL`, see {@link ruleOf};
 * its `DTSTART` is its first occurrence, the first of its weekdays from its first day on, see {@link firstOf}.
 * Its past never changes, see {@link plainApply}: its dialog writes one lying wholly ahead whole, its rule, its times
 * and its texts, which every day of it changed alone takes too, see `seriesWrite` in `calendar.ts`; one that has
 * begun goes on from today: it ends yesterday, and a new one with the change goes on from today, pointing back to it
 * as its sibling, see `seriesEnd` and `seriesSiblingPut` there, every day of it from today on changed alone, moved,
 * skipped or else, going with it, so no day shows twice, but a day done, see {@link aheadOwnOf}; only a summary
 * changed renames the whole chain, past
 * days too, see `seriesTitlePut` there. The dialog of one of its boxes changes that box alone,
 * see `boxEdit` in `boxes.ts`. Its bin removes it whole, see {@link plainRemove}; the bin of one of its boxes that day
 * alone, see `boxDelete` there.
 *
 * - `./boxes.ts`: Adds the to-do of a new series as a box, reads the boxes of days and finds a box, and names
 *   the numbered types.
 * - `./calendar.ts`: Finds a series and its chain, writes it whole, ends it, renames and removes it, reads the days
 *   of it changed alone and removes one, finds the file of a to-do, and calculates with days and Berlin time.
 * - `./categories.ts`: Tells whether a series fits its category, with well-formed people, and gives the semester
 *   of a skill series.
 * - `./documents.ts`: Writes what a skill series is.
 * - `./places.ts`: Gives the link of its place and what it does online.
 * - `./sources.ts`: Names the plan, and writes a file from `NomWorkspace` on.
 * - `./trash.ts`: Puts a plan a removed series leaves empty into my trash.
 */

import { boxAdd, boxesRead, boxFind, numberedTypes } from "./boxes.ts";
import {
    berlinDateOf, berlinInstantOf, berlinTimeOf, dayAdd, entryIdOf, entryRemove, fileEntriesRead, fileOfId,
    occurrenceLookup, occurrenceMove, occurrenceOwn, propertiesPut, seriesChainOf, seriesDatesOf, seriesDatesPut,
    seriesEnd, seriesLookup, seriesPartsOf, seriesRemove, seriesSiblingPut, seriesTitlePut, seriesWrite,
} from "./calendar.ts";
import { attendeesAllow, categoryAllows, semesterFor, skillName } from "./categories.ts";
import { titleOf } from "./documents.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { day, vaultPathOf } from "./sources.ts";
import { trashPut } from "./trash.ts";

import type ICAL from "ical.js";
import type { Attendee, Entry, Online, TodoFields } from "./calendar.ts";
import type { Box, PlanDay } from "./boxes.ts";
import type { Extra, Planned } from "./course.ts";


/**
 * A plain series, as the reader sends it and the dialog of a series sends it back, see the top of this file.
 *
 * - `id`: Its `UID`, like `037dba76-43d3-4e42-b85d-8e39c5ab8478@nomsystem`, empty for a new one.
 * - `category`, `title`: What it is, like `Sleep` and `Night`; of a skill series its title, like `NomFrequencediary`.
 * - `module`, `type`: Of a skill series its skill and type, like `NomFrequencediary` and none; empty for any other.
 * - `semester`: Of a skill series its semester, its `X-SEMESTER`, like `2026W`, that of its first occurrence when
 *   none is picked; empty for any other.
 * - `location`: Its place, like `Home Munich, Burg-Eltz-Weg, 81375, München, Deutschland`, empty for none.
 * - `attendees`: Who I am with.
 * - `weekdays`: Its weekdays, from 1 for Monday to 7 for Sunday, like `[1, 4]`, all seven for every day.
 * - `start`, `end`: Its times in Berlin time, like `14:00` and `16:00`, both empty for a series without time.
 * - `minutes`: How long it lasts without time, like 480, `null` for no length; with times what they span.
 * - `first`: Its first day, like `2026-10-13`.
 * - `last`: Its last day, like `2027-02-05`, empty for a series without end.
 * - `extras`: Its single dates besides its weekdays, its `RDATE`s, each its day and its times, like `2026-11-14`
 *   from `10:00` to `12:00`, of a series without time its day alone, its length that of the series; one of another
 *   length than the series is one of its days changed alone, its own `ESTIMATED-DURATION` with the start as
 *   `RECURRENCE-ID`, since `ical.js` gives no occurrence of an `RDATE` of a period, `VALUE=PERIOD`.
 * - `file`: Its plan from `NomWorkspace` on, like `NomManageplannings/NomManagecalendar/Living/Sleep_2026_Plan.ics`.
 * - `series`: The `X-SERIES` its parts share, empty for a series of one time, see the top of this file.
 * - `parts`: Its parts going on, itself among them, each a part as this one, without parts of its own; of a part over
 *   only itself.
 */
export type Plain = Online & {
    id: string;
    category: string;
    title: string;
    module: string;
    type: string;
    semester: string;
    location: string;
    attendees: Attendee[];
    weekdays: number[];
    start: string;
    end: string;
    minutes: number | null;
    first: string;
    last: string;
    extras: Extra[];
    file: string;
    series: string;
    parts: Plain[];
};

/**
 * A plain series to write, as the dialog sends it, see {@link plainApply}.
 *
 * - `dry`: Whether only to tell what it would make, writing nothing, for the preview of the dialog.
 * - `sibling`: Of a new series, the `UID` of the series it goes on from, like another time of one changed after it
 *   began, see `plainPartsOf` in `src/day/series.ts`; empty when left out.
 * - `gone`: Whether the part goes, its time no longer one of the series, see {@link plainGone}; false when left out.
 */
export type PlainChange = Plain & {
    dry: boolean;
    sibling?: string;
    gone?: boolean;
};

/**
 * The weekdays as a rule names them, from Monday to Sunday.
 */
const weekdayCodes: string[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/**
 * Days the preview of a series shows behind and ahead of today, or of its first day: six weeks.
 */
const previewDays: number = 42;

/**
 * Most minutes a series may last without time: a day.
 */
const dayMinutes: number = 24 * 60;


/**
 * Gives the weekday of a day.
 *
 * @param date - Day like `2026-10-19`
 * @returns Weekday from 1 for Monday to 7 for Sunday
 */
function weekdayOf(date: string): number {
    return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7 + 1;
}

/**
 * Gives the minutes of a time of day.
 *
 * @param time - Time like `14:15`
 * @returns Minutes since midnight, like 855
 */
function minutesOf(time: string): number {
    const [hour, minute]: number[] = time.split(":").map(Number);
    return hour * 60 + minute;
}

/**
 * Gives the first occurrence of a series: its first weekday from its first day on.
 * - `found`: The day looked at.
 *
 * @param plain - The series
 * @returns Day like `2026-10-19`
 */
function firstOf(plain: Plain): string {
    let found: string = plain.first;
    while (!plain.weekdays.includes(weekdayOf(found)))
        found = dayAdd(found, 1);
    return found;
}

/**
 * Writes the rule of a series, its `RRULE`: `FREQ=DAILY` for all seven weekdays, else `FREQ=WEEKLY` with its weekdays
 * as `BYDAY`; its last day as `UNTIL`, a day for a series without time, else the end of that day in Berlin time
 * as an instant in UTC, as the standard wants it beside a `DTSTART` with a time.
 * - `until`: Its `UNTIL`, empty for a series without end.
 *
 * @param plain - The series
 * @returns Rule like `FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20270205T225959Z` or `FREQ=DAILY`
 */
function ruleOf(plain: Plain): string {
    const until: string = plain.last === "" ? ""
        : plain.start === "" ? plain.last.replace(/-/g, "")
            : new Date(berlinInstantOf(dayAdd(plain.last, 1), 0).getTime() - 1000).toISOString()
                .replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const days: string = plain.weekdays.length === 7 ? "FREQ=DAILY"
        : `FREQ=WEEKLY;BYDAY=${[...plain.weekdays].sort().map((weekday: number): string =>
            weekdayCodes[weekday - 1]).join(",")}`;
    return until === "" ? days : `${days};UNTIL=${until}`;
}

/**
 * Gives the last day of a series that ends after a count of occurrences, its `COUNT`, like `2026-11-21` of 31 days
 * from `2026-10-22`: the day of its last occurrence, counted over its weekdays from its first day on.
 * - `found`: The day looked at.
 * - `counted`: Occurrences counted so far, that day included.
 *
 * @param first - Its first day, like `2026-10-22`
 * @param weekdays - Its weekdays, from 1 for Monday to 7 for Sunday
 * @param count - Its `COUNT`, like 31
 * @returns Day like `2026-11-21`
 */
function countLastOf(first: string, weekdays: number[], count: number): string {
    let found: string = first;
    let counted: number = weekdays.includes(weekdayOf(found)) ? 1 : 0;
    while (counted < count) {
        found = dayAdd(found, 1);
        if (weekdays.includes(weekdayOf(found)))
            counted++;
    }
    return found;
}

/**
 * Lists the days a series happens on within a range: each of its weekdays from its first occurrence
 * to its last day, and each of its extras, see `extras` of {@link Plain}.
 * - `days`: The days of its weekdays found.
 *
 * @param plain - The series
 * @param from - First day of the range, like `2026-10-24`
 * @param to - Last day of the range
 * @returns Days like `2026-10-26`, the earliest first
 */
function daysOf(plain: Plain, from: string, to: string): string[] {
    const days: string[] = [];
    const first: string = firstOf(plain);
    for (let found: string = from < first ? first : from; found <= to; found = dayAdd(found, 1))
        if ((plain.last === "" || found <= plain.last) && plain.weekdays.includes(weekdayOf(found)))
            days.push(found);
    return [...new Set([...days, ...plain.extras.map((extra: Extra): string => extra.day)
        .filter((day: string): boolean => day >= from && day <= to)])].sort();
}

/**
 * Reads a part of a plain series of the plan by its `UID`, see {@link Plain}: its weekdays from its rule, every day
 * for `FREQ=DAILY`, its `BYDAY` for `FREQ=WEEKLY`, else the weekday of its start; its times and its length
 * from its first occurrence, see `seriesLookup` in `calendar.ts`; its last day from its `UNTIL`, or of a series that
 * ends after a count of occurrences the day of its last one, see {@link countLastOf}, which saving writes as `UNTIL`;
 * its extras from its `RDATE`s, see `seriesDatesOf` there, each with the length of the series, or of its day changed
 * alone, see `extras` of {@link Plain}.
 * - `found`: Its file, its first occurrence and its rule.
 * - `days`: Its weekdays as its rule names them.
 * - `timed`: Whether it has a time.
 * - `start`: Its first occurrence.
 * - `weekdays`: Its weekdays, from 1 for Monday to 7 for Sunday.
 * - `own`: Its days changed alone.
 * - `extras`: Its single dates, see `extras` of {@link Plain}.
 *
 * @param id - Its `UID`
 * @param key - The `X-SERIES` of its series, empty for none
 * @returns The part, without parts of its own
 * @throws {Error} - When the plan holds no series of the `UID`, or one whose rule is no plain one, like every
 *   second week
 */
function partRead(id: string, key: string): Plain {
    const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(day.plan, id);
    if (found === undefined)
        throw new Error(`No series ${id} in the plan`);
    const [file, entry, rule]: [string, Entry, ICAL.Recur] = found;
    if (!["DAILY", "WEEKLY"].includes(rule.freq ?? "") || (rule.interval ?? 1) !== 1)
        throw new Error(`${entry.title}: no plain series`);
    const days: string[] = (rule.parts.BYDAY ?? []).map(String);
    const timed: boolean = !entry.allDay;
    const start: string = timed ? berlinDateOf(new Date(entry.start)) : entry.start;
    const own: Entry[] = fileEntriesRead(file).filter((one: Entry): boolean => one.id === id && one.recurrence !== "");
    const extras: Extra[] = seriesDatesOf(day.plan, id).map((date: string): Extra => {
        if (!timed)
            return { day: date, start: "", end: "" };
        const minutes: number | null =
            own.find((one: Entry): boolean => one.recurrence === date)?.minutes ?? entry.minutes;
        return {
            day: berlinDateOf(new Date(date)), start: berlinTimeOf(new Date(date)),
            end: berlinTimeOf(new Date(Date.parse(date) + (minutes ?? 0) * 60 * 1000)),
        };
    });
    const weekdays: number[] = rule.freq === "DAILY" ? [1, 2, 3, 4, 5, 6, 7] : days.length === 0 ? [weekdayOf(start)]
        : days.map((code: string): number => weekdayCodes.indexOf(code) + 1);
    return {
        id: id, category: entry.category, title: entry.title, module: entry.module, type: entry.type,
        semester: entry.semester, location: entry.location, online: entry.online, onlineLink: entry.onlineLink, passcode: entry.passcode,
        attendees: entry.attendees, weekdays: weekdays,
        start: timed ? berlinTimeOf(new Date(entry.start)) : "",
        end: timed && entry.minutes !== null
            ? berlinTimeOf(new Date(Date.parse(entry.start) + entry.minutes * 60 * 1000)) : "",
        minutes: entry.minutes, first: start,
        last: rule.count !== null ? countLastOf(start, weekdays, rule.count)
            : rule.until === null ? "" : rule.until.isDate ? rule.until.toString().slice(0, 10)
                : berlinDateOf(rule.until.toJSDate()),
        extras: extras, file: vaultPathOf(file), series: key, parts: [],
    };
}

/**
 * Reads a plain series of the plan by the `UID` of one of its parts, see the top of this file: that part, see
 * {@link partRead}, with every part of its series still going on, its last day today or later or none, see
 * `seriesPartsOf` in `calendar.ts`, so the dialog shows every weekday with its time; of a part over only itself,
 * as it was.
 * - `key`, `uids`: The `X-SERIES` of the series and the `UID`s of its parts.
 * - `own`: The part of the `UID`.
 * - `today`: Today in Berlin time.
 * - `going`: Tells whether a part goes on, its last day today or later or none.
 *
 * @param id - The `UID` of one of its parts
 * @returns The part with the parts of its series
 * @throws {Error} - When the plan holds no series of the `UID`, or one whose rule is no plain one
 */
export function plainRead(id: string): Plain {
    const [key, uids]: [string, string[]] = seriesPartsOf(day.plan, id);
    const own: Plain = partRead(id, key);
    const today: string = berlinDateOf(new Date());
    const going: (part: Plain) => boolean = (part: Plain): boolean => part.last === "" || part.last >= today;
    return {
        ...own, parts: !going(own) ? [own]
            : uids.map((uid: string): Plain => uid === id ? own : partRead(uid, key)).filter(going),
    };
}

/**
 * Checks a plain series as the dialog sends it: its weekdays, each once, from 1 to 7; both times or none, the start
 * before the end; without times a whole number of minutes up to a day, or none; its first day, and its last day
 * on or after it, or none; its extras each a day once, with a start before its end, of a series without time none; what it is fits its category, see `categoryAllows` in `categories.ts`, with well-formed
 * people, and is no skill box of a numbered type, whose series is one of my course.
 *
 * @param plain - The series as sent
 * @throws {Error} - When one of them is not right
 */
function plainCheck(plain: Plain): void {
    const dayForm: RegExp = /^\d{4}-\d{2}-\d{2}$/;
    const timeForm: RegExp = /^\d{2}:\d{2}$/;
    if (plain.weekdays.length === 0 || new Set(plain.weekdays).size !== plain.weekdays.length
        || plain.weekdays.some((weekday: number): boolean => !Number.isInteger(weekday) || weekday < 1 || weekday > 7))
        throw new Error(`${plain.title}: no weekdays ${plain.weekdays.join(", ")}`);
    if (plain.start !== "" || plain.end !== "") {
        if (!timeForm.test(plain.start) || !timeForm.test(plain.end) || plain.start >= plain.end)
            throw new Error(`${plain.title}: no times ${plain.start} – ${plain.end}`);
    }
    else if (plain.minutes !== null
        && !(Number.isInteger(plain.minutes) && plain.minutes > 0 && plain.minutes <= dayMinutes))
        throw new Error(`${plain.title}: no duration of ${plain.minutes} minutes`);
    if (!dayForm.test(plain.first) || (plain.last !== "" && (!dayForm.test(plain.last) || plain.last < plain.first)))
        throw new Error(`${plain.title}: no days ${plain.first} – ${plain.last}`);
    if (new Set(plain.extras.map((extra: Extra): string => extra.day)).size !== plain.extras.length
        || plain.extras.some((extra: Extra): boolean => !dayForm.test(extra.day) || (plain.start === ""
            ? extra.start !== "" || extra.end !== ""
            : !timeForm.test(extra.start) || !timeForm.test(extra.end) || extra.start >= extra.end)))
        throw new Error(`${plain.title}: no extras ${plain.extras.map((extra: Extra): string => extra.day).join(", ")}`);
    if (plain.category === skillName && numberedTypes.includes(plain.type))
        throw new Error(`${plain.title}: a series of my course, no plain series`);
    if (!attendeesAllow(plain.attendees) || !categoryAllows({
        category: plain.category, title: plain.title, location: plain.location, from: "", module: plain.module,
        type: plain.type, semester: "", note: "", attendees: plain.attendees,
    }))
        throw new Error(`No series ${plain.category} ${plain.title}`);
}

/**
 * Gives the fields of the to-do of a series: what it is as the reader writes it, see `titleOf` in `documents.ts`,
 * its place with the link the reader finds, see `placeLinkOf` in `places.ts`, what it does online, see `onlineFor`
 * there, its first occurrence as its day, with its time in Berlin time or none, and its length: what its times span,
 * else its minutes.
 * - `first`: Its first occurrence.
 * - `semester`: Semester of a skill series, the one picked, else that of its first occurrence, empty for any other.
 * - `title`, `titleLink`: What it is, its `SUMMARY`, and the link of it.
 *
 * @param plain - The series, checked, see {@link plainCheck}
 * @param old - Its first occurrence as written, `null` for a new one
 * @returns Fields of the to-do
 */
function fieldsOf(plain: Plain, old: Entry | null): TodoFields {
    const first: string = firstOf(plain);
    const semester: string = semesterFor(plain.category, String(plain.semester ?? ""), first);
    const [title, titleLink]: [string, string] = titleOf({ ...plain, semester: semester }, old);
    const timed: boolean = plain.start !== "";
    return {
        category: plain.category, title: title, titleLink: titleLink, location: plain.location,
        locationLink: placeLinkOf(plain.location, old), ...onlineFor(plain, old), from: "",
        attendees: plain.attendees, module: plain.module, type: plain.type, semester: semester, note: old?.note ?? "",
        day: first, time: timed ? berlinInstantOf(first, ...plain.start.split(":").map(Number) as [number, number])
            : null,
        minutes: timed ? minutesOf(plain.end) - minutesOf(plain.start) : plain.minutes, deadline: "",
    };
}

/**
 * Gives the boxes of the series of a chain on the days of a range by their series and their days, as the plan
 * shows them, see `boxesRead` in `boxes.ts`: each by the `UID` of its series and the day its rule gives it, the part
 * of its identifier after `#`, a day pushed elsewhere too; never the greyed copy a box leaves on a day it was
 * pushed from.
 * - `kept`: The boxes found, by `UID` and day.
 *
 * @param uids - The `UID`s of the series
 * @param from - First day of the range, like `2026-10-24`
 * @param to - Last day of the range
 * @returns The boxes, by keys like `037dba76…@nomsystem 2026-10-24`
 */
function chainBoxesOf(uids: string[], from: string, to: string): Map<string, Box> {
    const kept: Map<string, Box> = new Map();
    if (uids.length === 0)
        return kept;
    boxesRead(from, dayAdd(to, 8)).flatMap((plan: PlanDay): Box[] => plan.boxes)
        .filter((box: Box): boolean => box.state !== "pushed" && box.id.includes("#")
            && uids.includes(box.id.slice(0, box.id.lastIndexOf("#"))))
        .forEach((box: Box): void => {
            const recurrence: string = box.id.slice(box.id.lastIndexOf("#") + 1);
            kept.set(`${box.id.slice(0, box.id.lastIndexOf("#"))} ${recurrence.includes("T")
                ? berlinDateOf(new Date(recurrence)) : recurrence}`, box);
        });
    return kept;
}

/**
 * Gives the time and the length of a series on a day, by its rule: its times, or of one of its extras those of the extra,
 * see `extras` of {@link Plain}; without times none, its length that of the series.
 * - `extra`: The extra on the day, `undefined` for none.
 * - `times`: The start and the end that count.
 *
 * @param plain - The series
 * @param date - The day, like `2026-11-14`
 * @returns Its start as ISO instant, empty for none, and its length in minutes, `null` for none
 */
function timesOf(plain: Plain, date: string): [string, number | null] {
    const extra: Extra | undefined = plain.extras.find((one: Extra): boolean => one.day === date);
    const times: [string, string] = extra !== undefined && extra.start !== "" ? [extra.start, extra.end]
        : [plain.start, plain.end];
    if (times[0] === "")
        return ["", plain.minutes];
    return [berlinInstantOf(date, ...times[0].split(":").map(Number) as [number, number]).toISOString(),
        minutesOf(times[1]) - minutesOf(times[0])];
}

/**
 * Lists the boxes a series makes, for the preview of its dialog: its days from six weeks ago on, see
 * {@link previewDays}, or from its first day while that lies later, to six weeks ahead of today or of its first day,
 * each with its time and its length, the past ones as they stand, done, skipped, pushed or open, by its box, see
 * {@link chainBoxesOf}; of a series being changed also its days as it stood from today on, each marked by what
 * the change does to it: `new`, `removed`, `changed` for other times, its start and end, or its length while it has
 * no times, else nothing; a day of it there is no box of, as one removed alone, not at all. Each row of a box
 * carries its identifier, its state and whether it was pushed, so the dialog opens it and acts on it as the plan does.
 * The days of the series of its chain, see `seriesChainOf` in `calendar.ts`, like those of the series it went on from
 * before a change, stand among them by their days, marked `chained`, only shown.
 * - `today`: Today in Berlin time.
 * - `ahead`: The first day the change counts from.
 * - `first`: The first day of the series and its chain.
 * - `from`, `to`: The days of the preview.
 * - `chain`: The `UID`s of the other series of its chain, each read, `null` for one that is no plain series.
 * - `boxes`: The boxes of the series and its chain on those days.
 * - `rowOf`: Gives the row of a series on a day, by its box while it has one.
 * - `now`, `was`: The days after and before the change.
 * - `past`: The days before the change as they stood.
 * - `retimed`: Tells whether the change gives a day other times or another length.
 * - `known`: Tells whether a series has a box on a day.
 *
 * @param plain - The series after the change
 * @param old - The series as it stood, `null` for a new one
 * @returns The boxes, the earliest first
 */
function plannedOf(plain: Plain, old: Plain | null): Planned[] {
    const today: string = berlinDateOf(new Date());
    const ahead: string = plain.first > today || (plain.last !== "" && plain.last < today) ? plain.first : today;
    const chain: Plain[] = old === null ? [] : seriesChainOf(day.plan, old.id)
        .filter(([, uid]: [string, string]): boolean => uid !== old.id)
        .flatMap(([, uid]: [string, string]): Plain[] => {
            try {
                return [partRead(uid, "")];
            } catch {
                return [];
            }
        });
    const first: string = [plain, ...old === null ? [] : [old], ...chain]
        .map((series: Plain): string => series.first).sort()[0];
    const from: string = first > dayAdd(today, -previewDays) ? first : dayAdd(today, -previewDays);
    const to: string = dayAdd(ahead, previewDays - 1);
    const boxes: Map<string, Box> = chainBoxesOf([...old === null ? [] : [old.id],
        ...chain.map((series: Plain): string => series.id)], from, to);
    const rowOf: (series: Plain, date: string, state: Planned["state"], change: Planned["change"],
                  chained: boolean) => Planned =
        (series: Plain, date: string, state: Planned["state"], change: Planned["change"],
         chained: boolean): Planned => {
            const box: Box | undefined = series.id === "" ? undefined : boxes.get(`${series.id} ${date}`);
            const [time, minutes]: [string, number | null] = timesOf(series, date);
            return box === undefined || change !== "" ? {
                id: box?.id ?? "", day: date, time: time, minutes: minutes, number: "", state: box?.state ?? state,
                pushed: (box?.pushed.length ?? 0) > 0, editable: box?.editable ?? false, retimable: false,
                change: change, attendees: series.attendees, chained: chained,
            } : {
                id: box.id, day: box.day, time: box.time, minutes: box.minutes, number: "", state: box.state,
                pushed: box.pushed.length > 0, editable: box.editable, retimable: false, change: "",
                attendees: box.attendees, chained: chained,
            };
        };
    const now: string[] = daysOf(plain, ahead, to);
    const was: string[] = old === null ? [] : daysOf(old, ahead, to);
    const past: string[] = old === null ? [] : daysOf(old, from, dayAdd(ahead, -1));
    const retimed: (date: string) => boolean = (date: string): boolean =>
        old !== null && JSON.stringify(timesOf(old, date)) !== JSON.stringify(timesOf(plain, date));
    const known: (series: Plain, date: string) => boolean = (series: Plain, date: string): boolean =>
        boxes.has(`${series.id} ${date}`);
    return [
        ...old === null ? [] : past.filter((date: string): boolean => known(old, date))
            .map((date: string): Planned => rowOf(old, date, "open", "", false)),
        ...now.map((date: string): Planned => old === null ? rowOf(plain, date, "new", "new", false)
            : !was.includes(date) ? rowOf(plain, date, "open", "new", false)
                : rowOf(retimed(date) ? plain : old, date, "open", retimed(date) ? "changed" : "", false))
            .filter((row: Planned): boolean => row.change !== "" || row.id !== ""),
        ...was.filter((date: string): boolean => !now.includes(date) && known(old as Plain, date))
            .map((date: string): Planned => rowOf(old as Plain, date, "open", "removed", false)),
        ...chain.flatMap((series: Plain): Planned[] => daysOf(series, from, to)
            .filter((date: string): boolean => known(series, date))
            .map((date: string): Planned => rowOf(series, date, "open", "", true))),
    ].sort((one: Planned, other: Planned): number => (one.time || one.day).localeCompare(other.time || other.day));
}

/**
 * Gives the days of a series changed alone that take place from a day on, by their `DTSTART`, where they stand now,
 * and are not done, each its own to-do with its `RECURRENCE-ID`, like one moved, skipped or given another place,
 * which go once the series ends the day before, see {@link plainApply}, so its new rule takes their days and none
 * shows twice, like Mon 09.11. moved to Thu 12.11. as the series changes on 11.11.; a day earlier, or one done,
 * logged, stays, since its log entry points to it; an extra goes along with the series instead, see {@link plainApply}.
 * - `file`: The file of the series.
 * - `extras`: The starts of its extras.
 *
 * @param id - The `UID` of the series
 * @param from - The first day, like `2026-10-24`
 * @returns The identifiers of those days, like `037dba76…@nomsystem#2026-10-25`
 */
function aheadOwnOf(id: string, from: string): string[] {
    const file: string | undefined = fileOfId(day.plan, id);
    if (file === undefined)
        return [];
    const extras: string[] = seriesDatesOf(day.plan, id);
    return fileEntriesRead(file)
        .filter((entry: Entry): boolean => entry.id === id && entry.recurrence !== ""
            && !extras.includes(entry.recurrence)
            && (entry.allDay ? entry.start : berlinDateOf(new Date(entry.start))) >= from)
        .map(entryIdOf)
        .filter((own: string): boolean => boxFind(own)[2].state !== "done");
}

/**
 * Gives the start of an extra of a series in the form of an {@link Entry}, as its `RDATE` holds it: its day for
 * a series without time, else its time as ISO instant.
 *
 * @param plain - The series
 * @param extra - The extra
 * @returns Start like `2026-11-14` or `2026-11-14T09:00:00.000Z`
 */
function extraStartOf(plain: Plain, extra: Extra): string {
    return plain.start === "" ? extra.day
        : berlinInstantOf(extra.day, ...extra.start.split(":").map(Number) as [number, number]).toISOString();
}

/**
 * Writes minutes as a duration of the iCalendar format, the value of an `ESTIMATED-DURATION`.
 * - `hours`, `rest`: Its whole hours and the minutes left.
 *
 * @param minutes - Minutes, like 90
 * @returns Duration like `PT1H30M`
 */
function durationOf(minutes: number): string {
    const hours: number = Math.floor(minutes / 60);
    const rest: number = minutes % 60;
    return `PT${hours > 0 ? `${hours}H` : ""}${rest > 0 || hours === 0 ? `${rest}M` : ""}`;
}

/**
 * Writes the extras of a series, see `extras` of {@link Plain}: each its `RDATE`, see `seriesDatesPut`
 * in `calendar.ts`; one of another length than the series as its day changed alone with its own
 * `ESTIMATED-DURATION`, see `occurrenceOwn` there, one of its length again with the length of the series; an extra
 * taken out takes its day changed alone with it, but one done, whose log entry points to it.
 * - `starts`: The starts of its extras.
 * - `own`: The starts of its days changed alone.
 * - `gone`: The starts of extras taken out that go with their days changed alone.
 * - `length`: The length of the series with times, `null` for one without, whose extras take its length.
 *
 * @param file - Path of the `.ics` file of the series
 * @param id - Its `UID`
 * @param plain - The series with the extras to write
 * @param old - The series as it stood, `null` for a new one
 */
function extrasWrite(file: string, id: string, plain: Plain, old: Plain | null): void {
    const starts: string[] = plain.extras.map((extra: Extra): string => extraStartOf(plain, extra));
    const own: Set<string> = new Set(fileEntriesRead(file)
        .filter((entry: Entry): boolean => entry.id === id && entry.recurrence !== "")
        .map((entry: Entry): string => entry.recurrence));
    const gone: string[] = old === null ? [] : old.extras.map((extra: Extra): string => extraStartOf(old, extra))
        .filter((start: string): boolean => !starts.includes(start) && own.has(start)
            && boxFind(`${id}#${start}`)[2].state !== "done");
    seriesDatesPut(file, id, starts);
    gone.forEach((start: string): void => entryRemove(file, `${id}#${start}`));
    const length: number | null = plain.start === "" ? null : minutesOf(plain.end) - minutesOf(plain.start);
    plain.extras.forEach((extra: Extra): void => {
        const start: string = extraStartOf(plain, extra);
        const minutes: number = minutesOf(extra.end) - minutesOf(extra.start);
        if (length === null || (minutes === length && !own.has(start)))
            return;
        if (!own.has(start)) {
            const found: [string, Entry] | undefined = occurrenceLookup(day.plan, id, start);
            if (found === undefined)
                return;
            occurrenceOwn(found[0], found[1]);
        }
        propertiesPut(file, `${id}#${start}`, [["estimated-duration", [durationOf(minutes)]]]);
    });
}

/**
 * Writes a new plain series as a box of its first occurrence, see `boxAdd` in `boxes.ts`, into the plan of its topic
 * and year, its rule added, see {@link ruleOf} and `seriesWrite` in `calendar.ts`, the series it goes on from
 * as its sibling, see `seriesSiblingPut` there, and its extras, see {@link extrasWrite}.
 * - `fields`: The fields of its to-do.
 * - `id`: Its `UID`.
 * - `file`: Its file.
 *
 * @param plain - The series, checked, see {@link plainCheck}
 * @param sibling - The `UID` of the series it goes on from, empty for none
 * @returns Its `UID`
 */
function plainAdd(plain: Plain, sibling: string): string {
    const fields: TodoFields = fieldsOf(plain, null);
    const id: string = boxAdd({
        category: plain.category, title: plain.title, location: plain.location, from: "", module: plain.module,
        type: plain.type, semester: fields.semester, note: "", online: plain.online, onlineLink: plain.onlineLink,
        passcode: plain.passcode, attendees: plain.attendees, day: fields.day,
        time: fields.time === null ? "" : fields.time.toISOString(), minutes: fields.minutes, deadline: "",
        chapters: [], documents: [],
    });
    const file: string = fileOfId(day.plan, id) ?? "";
    seriesWrite(file, id, fields, ruleOf(plain));
    if (sibling !== "")
        seriesSiblingPut(file, id, sibling);
    extrasWrite(file, id, plain, null);
    return id;
}

/**
 * Writes a plain series, or only tells what it would make, for the preview of its dialog, see {@link plannedOf}:
 * a new one, see {@link plainAdd}; one there already, see the top of this file, whose past never changes: one lying
 * wholly ahead written whole, see `seriesWrite` in `calendar.ts`, every day of it changed alone taking its texts;
 * one that has begun, while when or where it is changes, its days, times or length, dates, place, what it does online
 * or who I am with, ending yesterday with every day of it so far, done, pushed or dropped, see `seriesEnd`
 * in `calendar.ts`, its days from today on changed alone going with it but one done, see {@link aheadOwnOf}, and a new
 * series of the change going on from today, pointing back to it as its sibling, see {@link plainAdd}, which takes its
 * extras from today on, each with its day changed alone, moved to it, see `occurrenceMove` in `calendar.ts`, but one
 * done, which stays as its extras before today; one over only renamed. Its extras, see {@link extrasWrite}, are single
 * dates: added or taken out from today on, they change no rule, so the series goes on whole. A summary changed is a new name, never a change of when: it renames
 * every series of the chain, past days too, see `seriesChainOf` and `seriesTitlePut` in `calendar.ts`.
 * The part written takes the `X-SERIES` of its series, see {@link seriesKeyPut}; a part whose time goes ends,
 * see {@link plainGone}. Checked before anything is written, see {@link plainCheck}.
 * - `old`: The series as it stands, `null` for a new one.
 * - `today`: Today in Berlin time.
 * - `file`, `written`: Its file and its first occurrence as written, of a series there already.
 * - `renamed`: Whether its summary changes, of a skill its skill or type.
 * - `moved`: Whether when or where it is changes.
 * - `begun`: Whether it has a day before today; `over` whether its last day lies before today.
 * - `done`: Tells whether an extra of the series as it stands is done, logged.
 * - `kept`: Its extras before today, and those done, which stay with it.
 * - `ahead`: The extras from today on, which go on with the series from today, or are written into it.
 * - `whole`: The series with its extras so, as one that has begun but goes on whole writes it.
 * - `next`: The series from today on, of one that has begun, with the extras from today on.
 * - `own`: Its days from today on changed alone and not done, which go as it ends.
 * - `id`, `target`: The `UID` and the file of the series going on from today.
 * - `part`: The `UID` of the part written, which takes the `X-SERIES`.
 *
 * @param change - The series as the dialog sends it
 * @returns The boxes it makes
 * @throws {Error} - When the series is not right, see {@link plainCheck}, a series to change is none, or one over would
 *   change when or where it was
 */
export function plainApply(change: PlainChange): Planned[] {
    if (change.gone === true)
        return plainGone(change.id, change.dry);
    plainCheck(change);
    const old: Plain | null = change.id === "" ? null : partRead(change.id, "");
    const today: string = berlinDateOf(new Date());
    if (old === null) {
        if (!change.dry)
            seriesKeyPut(plainAdd(change, change.sibling ?? ""), change.series);
        return plannedOf(change, null);
    }
    const [file, written]: [string, Entry, ICAL.Recur] =
        seriesLookup(day.plan, change.id) as [string, Entry, ICAL.Recur];
    const renamed: boolean = change.title !== old.title || change.module !== old.module || change.type !== old.type;
    const moved: boolean = JSON.stringify([change.weekdays, change.start, change.end, change.minutes, change.first,
        change.last, change.location, change.online, change.onlineLink, change.passcode, change.attendees])
        !== JSON.stringify([old.weekdays, old.start, old.end, old.minutes, old.first, old.last, old.location, old.online,
            old.onlineLink, old.passcode, old.attendees]);
    const begun: boolean = firstOf(old) < today;
    const over: boolean = old.last !== "" && old.last < today;
    if (begun && over && moved)
        throw new Error(`${old.title}: a series over keeps when and where it was`);
    const done: (extra: Extra) => boolean = (extra: Extra): boolean => {
        const start: string = extraStartOf(old, extra);
        return old.extras.includes(extra) && occurrenceLookup(day.plan, change.id, start) !== undefined
            && boxFind(`${change.id}#${start}`)[2].state === "done";
    };
    const kept: Extra[] = old.extras.filter((extra: Extra): boolean => extra.day < today || done(extra));
    const ahead: Extra[] = change.extras.filter((extra: Extra): boolean => extra.day >= today
        && !kept.some((one: Extra): boolean => one.day === extra.day));
    const whole: Plain = begun ? { ...change, extras: [...kept, ...ahead] } : change;
    const next: Plain = { ...change, id: "", first: change.first < today ? today : change.first, extras: ahead };
    if (change.dry)
        return plannedOf(begun && moved ? next : whole, old);
    let part: string = change.id;
    if (!begun) {
        seriesWrite(file, change.id, fieldsOf(change, written), ruleOf(change));
        extrasWrite(file, change.id, change, old);
    }
    else if (moved) {
        const own: string[] = aheadOwnOf(change.id, today);
        const id: string = plainAdd({ ...next, extras: [] }, change.id);
        const target: string = fileOfId(day.plan, id) ?? file;
        part = id;
        old.extras.filter((extra: Extra): boolean => ahead.some((one: Extra): boolean => one.day === extra.day))
            .map((extra: Extra): string => extraStartOf(old, extra))
            .filter((start: string): boolean => fileEntriesRead(file).some((entry: Entry): boolean =>
                entry.id === change.id && entry.recurrence === start))
            .forEach((start: string): void => occurrenceMove(file, `${change.id}#${start}`, id, target));
        extrasWrite(target, id, next, null);
        seriesEnd(file, change.id, ruleOf({ ...old, last: dayAdd(today, -1) }));
        extrasWrite(file, change.id, { ...old, extras: kept }, old);
        own.filter((own: string): boolean => fileEntriesRead(file).some((entry: Entry): boolean =>
            entryIdOf(entry) === own)).forEach((own: string): void => entryRemove(file, own));
    }
    else
        extrasWrite(file, change.id, whole, old);
    seriesKeyPut(part, change.series);
    if (renamed)
        seriesChainOf(day.plan, change.id).forEach(([chained, uid]: [string, string]): void =>
            seriesTitlePut(chained, uid, fieldsOf(change, written)));
    return plannedOf(begun && moved ? next : change, old);
}


/**
 * Puts the `X-SERIES` of its series into a part, see the top of this file, or takes it out for a series of one time,
 * written only where it changes.
 * - `now`: Its `X-SERIES` as written.
 *
 * @param uid - The `UID` of the part
 * @param key - The `X-SERIES`, empty for none
 * @throws {Error} - When its file lies outside the new system
 */
function seriesKeyPut(uid: string, key: string): void {
    const [now]: [string, string[]] = seriesPartsOf(day.plan, uid);
    if (now !== key)
        propertiesPut(fileOfId(day.plan, uid) ?? "", uid, [["x-series", key === "" ? [] : [key]]]);
}

/**
 * Ends a part of a plain series whose time is no longer one of its series, or only tells what that would make, for
 * the preview of the dialog, see {@link plannedOf}: its past never changes, so one that has begun ends yesterday,
 * as a series ends once it changes from today, see {@link plainApply}, its extras from today on and its days from
 * today on changed alone going with it but those done, see {@link aheadOwnOf}; one lying wholly ahead goes whole,
 * see `seriesRemove` in `calendar.ts`; one over stays as it was.
 * - `old`: The part as it stands.
 * - `today`, `yesterday`: Today and the day before in Berlin time.
 * - `file`: Its file.
 * - `kept`: Its extras before today and those done.
 * - `own`: Its days from today on changed alone and not done.
 * - `planned`: Its boxes after it ends, those from today on `removed`.
 *
 * @param id - The `UID` of the part
 * @param dry - Whether only to tell what it would make
 * @returns Its boxes, the earliest first
 * @throws {Error} - When the plan holds no such series, or its file lies outside the new system
 */
function plainGone(id: string, dry: boolean): Planned[] {
    const old: Plain = partRead(id, "");
    const today: string = berlinDateOf(new Date());
    const yesterday: string = dayAdd(today, -1);
    if (old.last !== "" && old.last < today)
        return [];
    const file: string = fileOfId(day.plan, id) ?? "";
    const planned: Planned[] = plannedOf({ ...old, last: yesterday }, old);
    if (dry)
        return planned;
    if (firstOf(old) >= today) {
        if (seriesRemove(file, id))
            trashPut(file);
        return planned;
    }
    const kept: Extra[] = old.extras.filter((extra: Extra): boolean => extra.day < today
        || boxFind(`${id}#${extraStartOf(old, extra)}`)[2].state === "done");
    const own: string[] = aheadOwnOf(id, today);
    seriesEnd(file, id, ruleOf({ ...old, last: yesterday }));
    extrasWrite(file, id, { ...old, extras: kept }, old);
    own.filter((one: string): boolean => fileEntriesRead(file).some((entry: Entry): boolean =>
        entryIdOf(entry) === one)).forEach((one: string): void => entryRemove(file, one));
    return planned;
}

/**
 * Removes a plain series whole, as the bin of its dialog asks: every part of it, see the top of this file, each
 * with every component of its `UID`, see `seriesRemove` in `calendar.ts`; a plan it leaves without any event or to-do
 * goes into my trash, see `trashPut` in `trash.ts`. A log entry I logged from one of its days stays as it is, since it
 * holds what happened.
 * - `uids`: The `UID`s of its parts.
 * - `found`: The file of a part, its first day and its rule, `undefined` for none.
 *
 * @param id - The `UID` of one of its parts, like `43ed5d3e-98a1-43a9-a15c-2cfce3dc5be0@nomsystem`
 * @throws {Error} - When the plan holds no such series, or its file lies outside the new system
 */
export function plainRemove(id: string): void {
    const [, uids]: [string, string[]] = seriesPartsOf(day.plan, id);
    if (uids.length === 0)
        throw new Error(`No series ${id} in the plan`);
    uids.forEach((uid: string): void => {
        const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(day.plan, uid);
        if (found !== undefined && seriesRemove(found[0], uid))
            trashPut(found[0]);
    });
}
