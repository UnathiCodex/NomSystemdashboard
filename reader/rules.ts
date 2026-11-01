/**
 * ## Rules
 *
 * Reads and writes a plain series of the plan:
 * one to-do that repeats by its rule, its `RRULE`, like my sleep of every night,
 * unlike a series of my course, whose boxes stand one by one with their numbers,
 * see `course.ts`.
 * Every series I make from a box by its dialog is a plain one,
 * but that of a skill box of a numbered type, see `numberedTypes` in `boxes.ts`.
 * A plain series has its weekdays, each with its time,
 * or no time, only how long it lasts, see {@link Plain}.
 * Since a rule has one time for all its days, each time is a part of its own, one to-do,
 * the parts of a series of several times sharing one `X-SERIES`,
 * see `seriesPartsOf` in `calendar.ts`,
 * like my sleep of 8 hours from Sunday to Thursday and of 9 hours on Friday and Saturday.
 * The dialog reads and writes them together, see {@link plainRead},
 * and a part whose time goes ends as a series does, see {@link plainGone}.
 * Its `DTSTART` is its first occurrence, see {@link firstOf}.
 * Its past never changes, see {@link plainApply}:
 * its dialog writes one lying wholly ahead whole,
 * which every day of it changed alone takes too, see `seriesWrite` in `calendar.ts`.
 * One that has begun goes on from today: it ends yesterday,
 * and a new one with the change goes on from today, pointing back to it as its sibling,
 * see `seriesEnd` and `seriesSiblingPut` there,
 * every day of it from today on changed alone going with it, so no day shows twice,
 * but a day done, see {@link aheadOwnOf}.
 * Only a summary changed renames the whole chain, past
 * days too, see `seriesTitlePut` there.
 * The dialog of one of its boxes changes that box alone, see `boxEdit` in `boxes.ts`.
 * Its bin removes it whole, see {@link plainRemove}.
 * The bin of one of its boxes that day alone, see `boxDelete` there.
 */

import { boxAdd, boxesRead, boxFind, numberedTypes } from "./boxes.ts";
import {
    berlinDateOf,
    berlinInstantOf,
    berlinTimeOf,
    dayAdd,
    entryIdOf,
    entryRemove,
    fileEntriesRead,
    fileOfId,
    minutesOf,
    occurrenceLookup,
    occurrenceMove,
    occurrenceOwn,
    propertiesPut,
    seriesChainOf,
    seriesDatesOf,
    seriesDatesPut,
    seriesEnd,
    seriesLookup,
    seriesPartsOf,
    seriesRemove,
    seriesSiblingPut,
    seriesTitlePut,
    seriesWrite,
    weekdayOf,
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
 * A plain series, as the reader sends it and the dialog of a series sends it back.
 *
 * - `id`: Its `UID`, empty for a new one.
 * - `semester`: Of a skill series its `X-SEMESTER`,
 *   that of its first occurrence when none is picked.
 * - `weekdays`: From 1 for Monday to 7 for Sunday, none for a monthly or yearly one.
 * - `monthDay`: Of a monthly or yearly series its day of the month,
 *   a month without that day left out. 0 for one by weekdays.
 * - `month`: Of a yearly series its month, 0 for any other.
 * - `start`, `end`: Its times in Berlin time, both empty for a series without time.
 * - `minutes`: How long it lasts without time, `null` for no length.
 *   With times what they span.
 * - `last`: Empty for a series without end.
 * - `extras`: Its single dates besides its weekdays, its `RDATE`s,
 *   its length that of the series.
 *   One of another length than the series is one of its days changed alone,
 *   its own `ESTIMATED-DURATION` with the start as `RECURRENCE-ID`,
 *   since `ical.js` gives no occurrence of an `RDATE` of a period, `VALUE=PERIOD`.
 * - `file`: Its plan from `NomWorkspace` on.
 * - `series`: The `X-SERIES` its parts share, empty for a series of one time.
 * - `parts`: Its parts going on, itself among them, without parts of their own.
 *   Of a part over only itself.
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
    monthDay: number;
    month: number;
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
 * - `dry`: Whether only to tell what it would make, for the preview of the dialog.
 * - `sibling`: Of a new series, the `UID` of the series it goes on from,
 *   like another time of one changed after it began,
 *   see `plainPartsOf` in `src/day/series.ts`.
 * - `gone`: Whether the part goes, its time no longer one of the series,
 *   see {@link plainGone}.
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
 * Days the preview of a series shows behind and ahead of today,
 * or of its first day: six weeks.
 */
const previewDays: number = 42;

/**
 * Most minutes a series may last without time: a day.
 */
const dayMinutes: number = 24 * 60;

/**
 * Tells whether a series happens on a day by its rule:
 * on its day of the month for a monthly one, of its month for a yearly one,
 * else on one of its weekdays.
 */
function onDay(plain: Pick<Plain, "weekdays" | "monthDay" | "month">, date: string): boolean {
    return plain.monthDay > 0
        ? Number(date.slice(8)) === plain.monthDay && (plain.month === 0 || Number(date.slice(5, 7)) === plain.month)
        : plain.weekdays.includes(weekdayOf(date));
}

/**
 * Gives the first occurrence of a series:
 * its first day by its rule from its first day on.
 */
function firstOf(plain: Plain): string {
    let found: string = plain.first;
    while (!onDay(plain, found)) found = dayAdd(found, 1);
    return found;
}

/**
 * Writes the rule of a series, its `RRULE`.
 * Its last day as `UNTIL` is a day for a series without time,
 * else the end of that day in Berlin time as an instant in UTC,
 * as the standard wants it beside a `DTSTART` with a time.
 */
function ruleOf(plain: Plain): string {
    const until: string =
        plain.last === ""
            ? ""
            : plain.start === ""
              ? plain.last.replace(/-/g, "")
              : new Date(berlinInstantOf(dayAdd(plain.last, 1), 0).getTime() - 1000)
                    .toISOString()
                    .replace(/[-:]/g, "")
                    .replace(/\.\d{3}/, "");
    const days: string =
        plain.month > 0
            ? `FREQ=YEARLY;BYMONTH=${plain.month};BYMONTHDAY=${plain.monthDay}`
            : plain.monthDay > 0
              ? `FREQ=MONTHLY;BYMONTHDAY=${plain.monthDay}`
              : plain.weekdays.length === 7
                ? "FREQ=DAILY"
                : `FREQ=WEEKLY;BYDAY=${[...plain.weekdays]
                      .sort()
                      .map((weekday: number): string => weekdayCodes[weekday - 1])
                      .join(",")}`;
    return until === "" ? days : `${days};UNTIL=${until}`;
}

/**
 * Gives the last day of a series that ends after a count of occurrences, its `COUNT`:
 * the day of its last occurrence,
 * counted over its days by its rule from its first day on.
 */
function countLastOf(plain: Pick<Plain, "weekdays" | "monthDay" | "month" | "first">, count: number): string {
    let found: string = plain.first;
    let counted: number = onDay(plain, found) ? 1 : 0;
    while (counted < count) {
        found = dayAdd(found, 1);
        if (onDay(plain, found)) counted++;
    }
    return found;
}

/**
 * Lists the days a series happens on within a range, the earliest first:
 * each of its days by its rule from its first occurrence to its last day,
 * and each of its extras.
 */
function daysOf(plain: Plain, from: string, to: string): string[] {
    const days: string[] = [];
    const first: string = firstOf(plain);
    for (let found: string = from < first ? first : from; found <= to; found = dayAdd(found, 1))
        if ((plain.last === "" || found <= plain.last) && onDay(plain, found)) days.push(found);
    return [
        ...new Set([
            ...days,
            ...plain.extras
                .map((extra: Extra): string => extra.day)
                .filter((day: string): boolean => day >= from && day <= to),
        ]),
    ].sort();
}

/**
 * Reads a part of a plain series of the plan by its `UID`, see {@link Plain}:
 * its weekdays from its rule, else the weekday of its start.
 * Of `FREQ=MONTHLY` no weekdays but its day of the month,
 * its one `BYMONTHDAY` or that of its start,
 * of `FREQ=YEARLY` also its month, its one `BYMONTH` or that of its start.
 * Its times and its length from its first occurrence,
 * see `seriesLookup` in `calendar.ts`.
 * Of a series that ends after a count of occurrences
 * its last day is the day of its last one,
 * see {@link countLastOf}, which saving writes as `UNTIL`.
 * Its extras from its `RDATE`s, see `seriesDatesOf` there,
 * each with the length of the series, or of its day changed alone.
 *
 * @param key - The `X-SERIES` of its series, empty for none
 * @returns The part, without parts of its own
 * @throws {Error} - When the plan holds no series of the `UID`,
 *   or one whose rule is no plain one,
 *   like every second week or every second Tuesday of a month
 */
function partRead(id: string, key: string): Plain {
    const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(day.plan, id);
    if (found === undefined) throw new Error(`No series ${id} in the plan`);
    const [file, entry, rule]: [string, Entry, ICAL.Recur] = found;
    const days: string[] = (rule.parts.BYDAY ?? []).map(String);
    const monthDays: number[] = (rule.parts.BYMONTHDAY ?? []).map(Number);
    const months: number[] = (rule.parts.BYMONTH ?? []).map(Number);
    const dated: boolean = ["MONTHLY", "YEARLY"].includes(rule.freq ?? "");
    if (
        !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(rule.freq ?? "") ||
        (rule.interval ?? 1) !== 1 ||
        (dated && (days.length > 0 || monthDays.length > 1 || monthDays[0] < 1)) ||
        months.length > (rule.freq === "YEARLY" ? 1 : 0)
    )
        throw new Error(`${entry.title}: no plain series`);
    const timed: boolean = !entry.allDay;
    const start: string = timed ? berlinDateOf(new Date(entry.start)) : entry.start;
    const monthDay: number = !dated ? 0 : (monthDays[0] ?? Number(start.slice(8)));
    const month: number = rule.freq !== "YEARLY" ? 0 : (months[0] ?? Number(start.slice(5, 7)));
    const own: Entry[] = fileEntriesRead(file).filter((one: Entry): boolean => one.id === id && one.recurrence !== "");
    const extras: Extra[] = seriesDatesOf(day.plan, id).map((date: string): Extra => {
        if (!timed) return { day: date, start: "", end: "" };
        const minutes: number | null =
            own.find((one: Entry): boolean => one.recurrence === date)?.minutes ?? entry.minutes;
        return {
            day: berlinDateOf(new Date(date)),
            start: berlinTimeOf(new Date(date)),
            end: berlinTimeOf(new Date(Date.parse(date) + (minutes ?? 0) * 60 * 1000)),
        };
    });
    const weekdays: number[] =
        monthDay > 0
            ? []
            : rule.freq === "DAILY"
              ? [1, 2, 3, 4, 5, 6, 7]
              : days.length === 0
                ? [weekdayOf(start)]
                : days.map((code: string): number => weekdayCodes.indexOf(code) + 1);
    return {
        id: id,
        category: entry.category,
        title: entry.title,
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        location: entry.location,
        online: entry.online,
        onlineLink: entry.onlineLink,
        onlineChannel: entry.onlineChannel,
        onlineTitle: entry.onlineTitle,
        attendees: entry.attendees,
        weekdays: weekdays,
        monthDay: monthDay,
        month: month,
        start: timed ? berlinTimeOf(new Date(entry.start)) : "",
        end:
            timed && entry.minutes !== null
                ? berlinTimeOf(new Date(Date.parse(entry.start) + entry.minutes * 60 * 1000))
                : "",
        minutes: entry.minutes,
        first: start,
        last:
            rule.count !== null
                ? countLastOf(
                      {
                          weekdays: weekdays,
                          monthDay: monthDay,
                          month: month,
                          first: start,
                      },
                      rule.count,
                  )
                : rule.until === null
                  ? ""
                  : rule.until.isDate
                    ? rule.until.toString().slice(0, 10)
                    : berlinDateOf(rule.until.toJSDate()),
        extras: extras,
        file: vaultPathOf(file),
        series: key,
        parts: [],
    };
}

/**
 * Reads a plain series of the plan by the `UID` of one of its parts:
 * that part with every part of its series still going on,
 * its last day today or later or none, see `seriesPartsOf` in `calendar.ts`,
 * so the dialog shows every weekday with its time. Of a part over only itself, as it was.
 *
 * @throws {Error} - When the plan holds no series of the `UID`,
 *   or one whose rule is no plain one
 */
export function plainRead(id: string): Plain {
    const [key, uids]: [string, string[]] = seriesPartsOf(day.plan, id);
    const own: Plain = partRead(id, key);
    const today: string = berlinDateOf(new Date());
    const going: (part: Plain) => boolean = (part: Plain): boolean => part.last === "" || part.last >= today;
    return {
        ...own,
        parts: !going(own)
            ? [own]
            : uids.map((uid: string): Plain => (uid === id ? own : partRead(uid, key))).filter(going),
    };
}

/**
 * Checks a plain series as the dialog sends it: its weekdays, or of a monthly one
 * its day of the month, of a yearly one also its month.
 * Both times or none, the start before the end.
 * Without times a whole number of minutes up to a day, or none.
 * Its last day on or after its first, or none.
 * Its extras each a day once, with a start before its end, of a series without time none.
 * What it is fits its category, see `categoryAllows` in `categories.ts`,
 * and is no skill box of a numbered type, whose series is one of my course.
 *
 * @throws {Error} - When one of them is not right
 */
function plainCheck(plain: Plain): void {
    const dayForm: RegExp = /^\d{4}-\d{2}-\d{2}$/;
    const timeForm: RegExp = /^\d{2}:\d{2}$/;
    if (
        !Number.isInteger(plain.monthDay) ||
        plain.monthDay < 0 ||
        plain.monthDay > 31 ||
        plain.monthDay > 0 !== (plain.weekdays.length === 0) ||
        !Number.isInteger(plain.month) ||
        plain.month < 0 ||
        plain.month > 12 ||
        (plain.month > 0 && plain.monthDay === 0) ||
        new Set(plain.weekdays).size !== plain.weekdays.length ||
        plain.weekdays.some((weekday: number): boolean => !Number.isInteger(weekday) || weekday < 1 || weekday > 7)
    )
        throw new Error(`${plain.title}: no weekdays ${plain.weekdays.join(", ")}`);
    if (plain.start !== "" || plain.end !== "") {
        if (!timeForm.test(plain.start) || !timeForm.test(plain.end) || plain.start >= plain.end)
            throw new Error(`${plain.title}: no times ${plain.start} – ${plain.end}`);
    } else if (
        plain.minutes !== null &&
        !(Number.isInteger(plain.minutes) && plain.minutes > 0 && plain.minutes <= dayMinutes)
    )
        throw new Error(`${plain.title}: no duration of ${plain.minutes} minutes`);
    if (!dayForm.test(plain.first) || (plain.last !== "" && (!dayForm.test(plain.last) || plain.last < plain.first)))
        throw new Error(`${plain.title}: no days ${plain.first} – ${plain.last}`);
    if (
        new Set(plain.extras.map((extra: Extra): string => extra.day)).size !== plain.extras.length ||
        plain.extras.some(
            (extra: Extra): boolean =>
                !dayForm.test(extra.day) ||
                (plain.start === ""
                    ? extra.start !== "" || extra.end !== ""
                    : !timeForm.test(extra.start) || !timeForm.test(extra.end) || extra.start >= extra.end),
        )
    )
        throw new Error(
            `${plain.title}: no extras ` + plain.extras.map((extra: Extra): string => extra.day).join(", "),
        );
    if (plain.category === skillName && numberedTypes.includes(plain.type))
        throw new Error(`${plain.title}: a series of my course, no plain series`);
    if (
        !attendeesAllow(plain.attendees) ||
        !categoryAllows({
            category: plain.category,
            title: plain.title,
            location: plain.location,
            from: "",
            module: plain.module,
            type: plain.type,
            semester: "",
            note: "",
            attendees: plain.attendees,
        })
    )
        throw new Error(`No series ${plain.category} ${plain.title}`);
}

/**
 * Gives the fields of the to-do of a series: what it is as the reader writes it,
 * see `titleOf` in `documents.ts`, its place and what it does online,
 * see `places.ts`, its first occurrence as its day,
 * and its length: what its times span, else its minutes.
 *
 * @param old - Its first occurrence as written, `null` for a new one
 */
function fieldsOf(plain: Plain, old: Entry | null): TodoFields {
    const first: string = firstOf(plain);
    const semester: string = semesterFor(plain.category, String(plain.semester ?? ""), first);
    const [title, titleLink]: [string, string] = titleOf({ ...plain, semester: semester }, old);
    const timed: boolean = plain.start !== "";
    return {
        category: plain.category,
        title: title,
        titleLink: titleLink,
        location: plain.location,
        locationLink: placeLinkOf(plain.location, old),
        ...onlineFor(plain, old),
        from: "",
        attendees: plain.attendees,
        module: plain.module,
        type: plain.type,
        semester: semester,
        note: old?.note ?? "",
        day: first,
        time: timed ? berlinInstantOf(first, ...(plain.start.split(":").map(Number) as [number, number])) : null,
        minutes: timed ? minutesOf(plain.end) - minutesOf(plain.start) : plain.minutes,
        deadline: "",
    };
}

/**
 * Gives the boxes of the series of a chain on the days of a range,
 * as the plan shows them, see `boxesRead` in `boxes.ts`,
 * each by the `UID` of its series and the day its rule gives it,
 * a day pushed elsewhere too.
 * Never the greyed copy a box leaves on a day it was pushed from.
 */
function chainBoxesOf(uids: string[], from: string, to: string): Map<string, Box> {
    const kept: Map<string, Box> = new Map();
    if (uids.length === 0) return kept;
    boxesRead(from, dayAdd(to, 8))
        .flatMap((plan: PlanDay): Box[] => plan.boxes)
        .filter(
            (box: Box): boolean =>
                box.state !== "pushed" &&
                box.id.includes("#") &&
                uids.includes(box.id.slice(0, box.id.lastIndexOf("#"))),
        )
        .forEach((box: Box): void => {
            const recurrence: string = box.id.slice(box.id.lastIndexOf("#") + 1);
            kept.set(
                `${box.id.slice(0, box.id.lastIndexOf("#"))} ${
                    recurrence.includes("T") ? berlinDateOf(new Date(recurrence)) : recurrence
                }`,
                box,
            );
        });
    return kept;
}

/**
 * Gives the time and the length of a series on a day: its times,
 * or of one of its extras those of the extra.
 * Without times none, its length that of the series.
 *
 * @returns Its start as ISO instant, empty for none,
 *   and its length in minutes, `null` for none
 */
function timesOf(plain: Plain, date: string): [string, number | null] {
    const extra: Extra | undefined = plain.extras.find((one: Extra): boolean => one.day === date);
    const times: [string, string] =
        extra !== undefined && extra.start !== "" ? [extra.start, extra.end] : [plain.start, plain.end];
    if (times[0] === "") return ["", plain.minutes];
    return [
        berlinInstantOf(date, ...(times[0].split(":").map(Number) as [number, number])).toISOString(),
        minutesOf(times[1]) - minutesOf(times[0]),
    ];
}

/**
 * Lists the boxes a series makes, for the preview of its dialog:
 * its days from six weeks ago on, or from its first day while that lies later,
 * to six weeks ahead of today or of its first day, each with its time and its length,
 * the past ones as they stand, done, skipped, pushed or open.
 * Of a series being changed also its days as it stood from today on,
 * each marked by what the change does to it:
 * `new`, `removed`, `changed` for other times or another length, else nothing.
 * A day of it there is no box of, as one removed alone, not at all.
 * Each row of a box carries its identifier, its state and whether it was pushed,
 * so the dialog opens it and acts on it as the plan does.
 * The days of the series of its chain, see `seriesChainOf` in `calendar.ts`,
 * like those of the series it went on from before a change,
 * stand among them by their days, marked `chained`, only shown.
 *
 * @param old - The series as it stood, `null` for a new one
 */
function plannedOf(plain: Plain, old: Plain | null): Planned[] {
    const today: string = berlinDateOf(new Date());
    const ahead: string = plain.first > today || (plain.last !== "" && plain.last < today) ? plain.first : today;
    const chain: Plain[] =
        old === null
            ? []
            : seriesChainOf(day.plan, old.id)
                  .filter(([, uid]: [string, string]): boolean => uid !== old.id)
                  .flatMap(([, uid]: [string, string]): Plain[] => {
                      try {
                          return [partRead(uid, "")];
                      } catch {
                          return [];
                      }
                  });
    const first: string = [plain, ...(old === null ? [] : [old]), ...chain]
        .map((series: Plain): string => series.first)
        .sort()[0];
    const from: string = first > dayAdd(today, -previewDays) ? first : dayAdd(today, -previewDays);
    const to: string = dayAdd(ahead, previewDays - 1);
    const boxes: Map<string, Box> = chainBoxesOf(
        [...(old === null ? [] : [old.id]), ...chain.map((series: Plain): string => series.id)],
        from,
        to,
    );
    const rowOf: (
        series: Plain,
        date: string,
        state: Planned["state"],
        change: Planned["change"],
        chained: boolean,
    ) => Planned = (
        series: Plain,
        date: string,
        state: Planned["state"],
        change: Planned["change"],
        chained: boolean,
    ): Planned => {
        const box: Box | undefined = series.id === "" ? undefined : boxes.get(`${series.id} ${date}`);
        const [time, minutes]: [string, number | null] = timesOf(series, date);
        return box === undefined || change !== ""
            ? {
                  id: box?.id ?? "",
                  day: date,
                  time: time,
                  minutes: minutes,
                  number: "",
                  state: box?.state ?? state,
                  pushed: (box?.pushed.length ?? 0) > 0,
                  editable: box?.editable ?? false,
                  retimable: false,
                  change: change,
                  attendees: series.attendees,
                  chained: chained,
              }
            : {
                  id: box.id,
                  day: box.day,
                  time: box.time,
                  minutes: box.minutes,
                  number: "",
                  state: box.state,
                  pushed: box.pushed.length > 0,
                  editable: box.editable,
                  retimable: false,
                  change: "",
                  attendees: box.attendees,
                  chained: chained,
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
        ...(old === null
            ? []
            : past
                  .filter((date: string): boolean => known(old, date))
                  .map((date: string): Planned => rowOf(old, date, "open", "", false))),
        ...now
            .map((date: string): Planned =>
                old === null
                    ? rowOf(plain, date, "new", "new", false)
                    : !was.includes(date)
                      ? rowOf(plain, date, "open", "new", false)
                      : rowOf(retimed(date) ? plain : old, date, "open", retimed(date) ? "changed" : "", false),
            )
            .filter((row: Planned): boolean => row.change !== "" || row.id !== ""),
        ...was
            .filter((date: string): boolean => !now.includes(date) && known(old as Plain, date))
            .map((date: string): Planned => rowOf(old as Plain, date, "open", "removed", false)),
        ...chain.flatMap((series: Plain): Planned[] =>
            daysOf(series, from, to)
                .filter((date: string): boolean => known(series, date))
                .map((date: string): Planned => rowOf(series, date, "open", "", true)),
        ),
    ].sort((one: Planned, other: Planned): number => (one.time || one.day).localeCompare(other.time || other.day));
}

/**
 * Gives the days of a series changed alone that take place from a day on,
 * where they stand now, and are not done,
 * which go once the series ends the day before, see {@link plainApply},
 * so its new rule takes their days and none shows twice,
 * like Mon 09.11. moved to Thu 12.11. as the series changes on 11.11.
 * A day earlier, or one done, logged, stays, since its log entry points to it.
 * An extra goes along with the series instead.
 */
function aheadOwnOf(id: string, from: string): string[] {
    const file: string | undefined = fileOfId(day.plan, id);
    if (file === undefined) return [];
    const extras: string[] = seriesDatesOf(day.plan, id);
    return fileEntriesRead(file)
        .filter(
            (entry: Entry): boolean =>
                entry.id === id &&
                entry.recurrence !== "" &&
                !extras.includes(entry.recurrence) &&
                (entry.allDay ? entry.start : berlinDateOf(new Date(entry.start))) >= from,
        )
        .map(entryIdOf)
        .filter((own: string): boolean => boxFind(own)[2].state !== "done");
}

/**
 * Gives the start of an extra of a series as its `RDATE` holds it:
 * its day for a series without time, else its time as ISO instant.
 */
function extraStartOf(plain: Plain, extra: Extra): string {
    return plain.start === ""
        ? extra.day
        : berlinInstantOf(extra.day, ...(extra.start.split(":").map(Number) as [number, number])).toISOString();
}

/**
 * Writes minutes as a duration of the iCalendar format,
 * the value of an `ESTIMATED-DURATION`.
 */
function durationOf(minutes: number): string {
    const hours: number = Math.floor(minutes / 60);
    const rest: number = minutes % 60;
    return `PT${hours > 0 ? `${hours}H` : ""}` + `${rest > 0 || hours === 0 ? `${rest}M` : ""}`;
}

/**
 * Writes the extras of a series: each its `RDATE`, see `seriesDatesPut` in `calendar.ts`.
 * One of another length than the series
 * as its day changed alone with its own `ESTIMATED-DURATION`,
 * see `occurrenceOwn` there, one of its length again with the length of the series.
 * An extra taken out takes its day changed alone with it, but one done,
 * whose log entry points to it.
 *
 * @param old - The series as it stood, `null` for a new one
 */
function extrasWrite(file: string, id: string, plain: Plain, old: Plain | null): void {
    const starts: string[] = plain.extras.map((extra: Extra): string => extraStartOf(plain, extra));
    const own: Set<string> = new Set(
        fileEntriesRead(file)
            .filter((entry: Entry): boolean => entry.id === id && entry.recurrence !== "")
            .map((entry: Entry): string => entry.recurrence),
    );
    const gone: string[] =
        old === null
            ? []
            : old.extras
                  .map((extra: Extra): string => extraStartOf(old, extra))
                  .filter(
                      (start: string): boolean =>
                          !starts.includes(start) && own.has(start) && boxFind(`${id}#${start}`)[2].state !== "done",
                  );
    seriesDatesPut(file, id, starts);
    gone.forEach((start: string): void => entryRemove(file, `${id}#${start}`));
    const length: number | null = plain.start === "" ? null : minutesOf(plain.end) - minutesOf(plain.start);
    plain.extras.forEach((extra: Extra): void => {
        const start: string = extraStartOf(plain, extra);
        const minutes: number = minutesOf(extra.end) - minutesOf(extra.start);
        if (length === null || (minutes === length && !own.has(start))) return;
        if (!own.has(start)) {
            const found: [string, Entry] | undefined = occurrenceLookup(day.plan, id, start);
            if (found === undefined) return;
            occurrenceOwn(found[0], found[1]);
        }
        propertiesPut(file, `${id}#${start}`, [["estimated-duration", [durationOf(minutes)]]]);
    });
}

/**
 * Writes a new plain series as a box of its first occurrence,
 * see `boxAdd` in `boxes.ts`, into the plan of its topic and year, its rule added,
 * the series it goes on from as its sibling, and its extras.
 *
 * @param sibling - The `UID` of the series it goes on from, empty for none
 */
function plainAdd(plain: Plain, sibling: string): string {
    const fields: TodoFields = fieldsOf(plain, null);
    const id: string = boxAdd({
        category: plain.category,
        title: plain.title,
        location: plain.location,
        from: "",
        module: plain.module,
        type: plain.type,
        semester: fields.semester,
        note: "",
        online: plain.online,
        onlineLink: plain.onlineLink,
        onlineChannel: plain.onlineChannel,
        onlineTitle: plain.onlineTitle,
        attendees: plain.attendees,
        day: fields.day,
        time: fields.time === null ? "" : fields.time.toISOString(),
        minutes: fields.minutes,
        deadline: "",
        chapters: [],
        documents: [],
    });
    const file: string = fileOfId(day.plan, id) ?? "";
    seriesWrite(file, id, fields, ruleOf(plain));
    if (sibling !== "") seriesSiblingPut(file, id, sibling);
    extrasWrite(file, id, plain, null);
    return id;
}

/**
 * Writes a plain series, or only tells what it would make,
 * for the preview of its dialog, see {@link plannedOf}.
 * One there already never changes its past:
 * one lying wholly ahead is written whole,
 * every day of it changed alone taking its texts.
 * One that has begun, while when or where it is changes,
 * ends yesterday with every day of it so far, done, pushed or dropped,
 * see `seriesEnd` in `calendar.ts`,
 * its days from today on changed alone going with it but one done,
 * and a new series of the change goes on from today, pointing back to it as its sibling.
 * That one takes its extras from today on, each with its day changed alone,
 * moved to it, see `occurrenceMove` in `calendar.ts`, but one done,
 * which stays as its extras before today. One over is only renamed.
 * Its extras are single dates:
 * added or taken out from today on, they change no rule, so the series goes on whole.
 * A summary changed is a new name, never a change of when:
 * it renames every series of the chain, past days too,
 * see `seriesChainOf` and `seriesTitlePut` in `calendar.ts`.
 * The part written takes the `X-SERIES` of its series, see {@link seriesKeyPut}.
 * A part whose time goes ends, see {@link plainGone}.
 * Checked before anything is written.
 * - `moved`: Whether when or where it is changes.
 * - `kept`: Its extras before today, and those done, which stay with it.
 * - `whole`: The series as one that has begun but goes on whole writes it.
 * - `part`: The `UID` of the part written, which takes the `X-SERIES`.
 *
 * @returns The boxes it makes
 * @throws {Error} - When the series is not right, a series to change is none,
 *   or one over would change when or where it was
 */
export function plainApply(change: PlainChange): Planned[] {
    if (change.gone === true) return plainGone(change.id, change.dry);
    plainCheck(change);
    const old: Plain | null = change.id === "" ? null : partRead(change.id, "");
    const today: string = berlinDateOf(new Date());
    if (old === null) {
        if (!change.dry) seriesKeyPut(plainAdd(change, change.sibling ?? ""), change.series);
        return plannedOf(change, null);
    }
    const [file, written]: [string, Entry, ICAL.Recur] = seriesLookup(day.plan, change.id) as [
        string,
        Entry,
        ICAL.Recur,
    ];
    const renamed: boolean = change.title !== old.title || change.module !== old.module || change.type !== old.type;
    const moved: boolean =
        JSON.stringify([
            change.weekdays,
            change.monthDay,
            change.month,
            change.start,
            change.end,
            change.minutes,
            change.first,
            change.last,
            change.location,
            change.online,
            change.onlineLink,
            change.onlineChannel,
            change.onlineTitle,
            change.attendees,
        ]) !==
        JSON.stringify([
            old.weekdays,
            old.monthDay,
            old.month,
            old.start,
            old.end,
            old.minutes,
            old.first,
            old.last,
            old.location,
            old.online,
            old.onlineLink,
            old.onlineChannel,
            old.onlineTitle,
            old.attendees,
        ]);
    const begun: boolean = firstOf(old) < today;
    const over: boolean = old.last !== "" && old.last < today;
    if (begun && over && moved) throw new Error(`${old.title}: a series over keeps when and where it was`);
    const done: (extra: Extra) => boolean = (extra: Extra): boolean => {
        const start: string = extraStartOf(old, extra);
        return (
            old.extras.includes(extra) &&
            occurrenceLookup(day.plan, change.id, start) !== undefined &&
            boxFind(`${change.id}#${start}`)[2].state === "done"
        );
    };
    const kept: Extra[] = old.extras.filter((extra: Extra): boolean => extra.day < today || done(extra));
    const ahead: Extra[] = change.extras.filter(
        (extra: Extra): boolean => extra.day >= today && !kept.some((one: Extra): boolean => one.day === extra.day),
    );
    const whole: Plain = begun ? { ...change, extras: [...kept, ...ahead] } : change;
    const next: Plain = {
        ...change,
        id: "",
        first: change.first < today ? today : change.first,
        extras: ahead,
    };
    if (change.dry) return plannedOf(begun && moved ? next : whole, old);
    let part: string = change.id;
    if (!begun) {
        seriesWrite(file, change.id, fieldsOf(change, written), ruleOf(change));
        extrasWrite(file, change.id, change, old);
    } else if (moved) {
        const own: string[] = aheadOwnOf(change.id, today);
        const id: string = plainAdd({ ...next, extras: [] }, change.id);
        const target: string = fileOfId(day.plan, id) ?? file;
        part = id;
        old.extras
            .filter((extra: Extra): boolean => ahead.some((one: Extra): boolean => one.day === extra.day))
            .map((extra: Extra): string => extraStartOf(old, extra))
            .filter((start: string): boolean =>
                fileEntriesRead(file).some(
                    (entry: Entry): boolean => entry.id === change.id && entry.recurrence === start,
                ),
            )
            .forEach((start: string): void => occurrenceMove(file, `${change.id}#${start}`, id, target));
        extrasWrite(target, id, next, null);
        seriesEnd(file, change.id, ruleOf({ ...old, last: dayAdd(today, -1) }));
        extrasWrite(file, change.id, { ...old, extras: kept }, old);
        own.filter((own: string): boolean =>
            fileEntriesRead(file).some((entry: Entry): boolean => entryIdOf(entry) === own),
        ).forEach((own: string): void => entryRemove(file, own));
    } else extrasWrite(file, change.id, whole, old);
    seriesKeyPut(part, change.series);
    if (renamed)
        seriesChainOf(day.plan, change.id).forEach(([chained, uid]: [string, string]): void =>
            seriesTitlePut(chained, uid, fieldsOf(change, written)),
        );
    return plannedOf(begun && moved ? next : change, old);
}

/**
 * Puts the `X-SERIES` of its series into a part,
 * or takes it out for a series of one time, written only where it changes.
 *
 * @throws {Error} - When its file lies outside the new system
 */
function seriesKeyPut(uid: string, key: string): void {
    const [now]: [string, string[]] = seriesPartsOf(day.plan, uid);
    if (now !== key) propertiesPut(fileOfId(day.plan, uid) ?? "", uid, [["x-series", key === "" ? [] : [key]]]);
}

/**
 * Ends a part of a plain series whose time is no longer one of its series,
 * or only tells what that would make, for the preview of the dialog.
 * Its past never changes, so one that has begun ends yesterday,
 * as a series ends once it changes from today, see {@link plainApply},
 * its extras and its days changed alone from today on going with it but those done.
 * One lying wholly ahead goes whole, see `seriesRemove` in `calendar.ts`.
 * One over stays as it was.
 *
 * @returns Its boxes, the earliest first
 * @throws {Error} - When the plan holds no such series,
 *   or its file lies outside the new system
 */
function plainGone(id: string, dry: boolean): Planned[] {
    const old: Plain = partRead(id, "");
    const today: string = berlinDateOf(new Date());
    const yesterday: string = dayAdd(today, -1);
    if (old.last !== "" && old.last < today) return [];
    const file: string = fileOfId(day.plan, id) ?? "";
    const planned: Planned[] = plannedOf({ ...old, last: yesterday }, old);
    if (dry) return planned;
    if (firstOf(old) >= today) {
        if (seriesRemove(file, id)) trashPut(file);
        return planned;
    }
    const kept: Extra[] = old.extras.filter(
        (extra: Extra): boolean =>
            extra.day < today || boxFind(`${id}#${extraStartOf(old, extra)}`)[2].state === "done",
    );
    const own: string[] = aheadOwnOf(id, today);
    seriesEnd(file, id, ruleOf({ ...old, last: yesterday }));
    extrasWrite(file, id, { ...old, extras: kept }, old);
    own.filter((one: string): boolean =>
        fileEntriesRead(file).some((entry: Entry): boolean => entryIdOf(entry) === one),
    ).forEach((one: string): void => entryRemove(file, one));
    return planned;
}

/**
 * Removes a plain series whole, as the bin of its dialog asks: every part of it,
 * each with every component of its `UID`, see `seriesRemove` in `calendar.ts`.
 * A plan it leaves without any event or to-do goes into my trash, see `trash.ts`.
 * A log entry I logged from one of its days stays as it is, since it holds what happened.
 *
 * @throws {Error} - When the plan holds no such series,
 *   or its file lies outside the new system
 */
export function plainRemove(id: string): void {
    const [, uids]: [string, string[]] = seriesPartsOf(day.plan, id);
    if (uids.length === 0) throw new Error(`No series ${id} in the plan`);
    uids.forEach((uid: string): void => {
        const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(day.plan, uid);
        if (found !== undefined && seriesRemove(found[0], uid)) trashPut(found[0]);
    });
}
