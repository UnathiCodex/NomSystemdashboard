/**
 * ## Boxes
 *
 * The plan of a day is a list of boxes, not a calendar, the log is my one calendar.
 * A box is what I intend to do on a day, by category, with an expected time and duration or without.
 * When I do it, it goes into the log at its real time, so expected and real time can be compared.
 * A box and its log entry never rename each other, so the plan keeps what I planned.
 * A box I decide against stays as `STATUS:CANCELLED`, so it can be counted.
 * `STATUS:CANCELLED` is always my own decision, lectures included.
 * Any change of its day is a push, counted until I take it back.
 * A pushed box stays greyed on each day it left, its arrow there sets it back.
 * A box without deadline still open counts as pushed to the next day at the end of each day.
 * Only on its own day it stays open, so I log it there when I log it later.
 * These pushes are written only once I change it.
 * A box I drop goes back to the first day it left, as if never pushed.
 * Only a box that got its day on that day or before, its `DTSTAMP`, is carried along,
 * so one I add for a day that is over stays there, missed.
 * A box with a deadline is never pushed.
 * A lecture, an exercise, a tutorial and a sheet carry their number in their series as `X-NUMBER`.
 * An exam carries its kind there instead.
 * A series is one to-do by its `RRULE`, each day changed alone with its `RECURRENCE-ID`,
 * but a numbered series is one box per date.
 *
 * A box is a `VTODO` in the plan of its skill or in that of its category in its year:
 * - its day and its expected time in `DTSTART`,
 * - or instead its deadline in `DUE`.
 *   iCalendar wants `DUE` of the same kind as `DTSTART`, so a box with a deadline has no `DTSTART`.
 *   It is done only once I tick it submitted, since the log entries pointing to it are its sessions.
 * - its expected duration in `ESTIMATED-DURATION` (draft-ietf-calext-ical-tasks),
 *   since the `DURATION` of RFC 5545 is the window to do it in.
 * - its state in `STATUS`, `COMPLETED` without the moment, since its log entry holds it.
 * - each push in one `X-PUSHED` with its start and its length as they stood before.
 * - when it got its day in `DTSTAMP`, set anew only with a change of its day.
 * - its other fields as an entry of the log, a skill box also `X-SEMESTER`, `X-CHAPTER`s, `ATTACH`es.
 * An occurrence of a series is a box with the `UID` and its start after `#`.
 * Changed alone, it becomes a component of its own in the file of its series and stays there.
 *
 * The plan files also hold events, `VEVENT`s, like the lectures from TUMonline, each read as a box.
 * A change keeps an event an event, so its time and duration stay.
 * A to-do with `X-GROUP` and without `X-NUMBER` is no box but a group of tutorials.
 */

import {
    berlinDateOf,
    berlinDayStartOf,
    berlinLater,
    dayAdd,
    entriesOnceRead,
    entriesRead,
    entryChange,
    entryIdOf,
    entryLookup,
    entryRemove,
    occurrenceLookup,
    occurrenceOwn,
    occurrencesTidy,
    propertiesPut,
    pushAdd,
    pushesKeep,
    seriesDayRemove,
    statusPut,
    todoAppend,
    todoChange,
} from "./calendar.ts";
import { attendeesAllow, categoryAllows, semesterFor, skillName } from "./categories.ts";
import { calendarFileOf, chaptersOf, linksOf, skillTypeAllows, titleOf } from "./documents.ts";
import { moduleContentsRead, moduleFolderOf } from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { day, planEnding } from "./sources.ts";

import type { Attendee, Entry, EntryFields, EntryTexts, Link, Online, Push, TodoFields } from "./calendar.ts";

/**
 * State of a box, `university` for cancelled by the university, its `X-NUMBER:NONE`,
 * `pushed` as it shows greyed on a day it left.
 */
export type BoxState = "open" | "done" | "dropped" | "university" | "pushed";

/** Types of skill boxes that carry their number in their series. */
export const numberedTypes: string[] = ["VO", "UE", "ZU", "TU", "HU"];

/**
 * A box.
 *
 * - `id`: Its `UID`, for an occurrence of a series with its start.
 * - `day`: For a box with a deadline the day of its deadline.
 * - `time`, `deadline`: Empty for none, a deadline without time as its day.
 * - `pushed`: Where it stood before each push, those it is carried along by last.
 * - `log`: Its log entry, of its last session for a deadline.
 * - `editable`: A to-do or an event with times, also one occurrence of a series.
 * - `series`: One occurrence of a series.
 * - `todo`: Whether it is a to-do, since an event keeps its time and duration.
 * - `chapters`: Its `X-CHAPTER`s, or those whose folders an older box links.
 * - `number`: Its `X-NUMBER`, `NONE` for one the university cancelled, or an exam's kind.
 * - `moved`: Where it went, for a box shown on a day it left.
 * - `file`: Its `.ics` file from `NomWorkspace` on.
 */
export type Box = EntryTexts & {
    id: string;
    day: string;
    time: string;
    minutes: number | null;
    deadline: string;
    state: BoxState;
    pushed: Push[];
    log: Logged | null;
    editable: boolean;
    series: boolean;
    todo: boolean;
    links: Link[];
    chapters: string[];
    number: string;
    group: string;
    moved: Moved | null;
    file: string;
};

/** The log entry of a box, its times with its place. */
export type Logged = Online & Pick<Entry, "start" | "end" | "location" | "locationLink" | "attendees">;

/**
 * Where a box went that shows on a day it left.
 *
 * - `day`: The day it stands on now.
 * - `went`: The day it went to from the day it shows on.
 */
export type Moved = {
    day: string;
    went: string;
};

/**
 * A birthday or holiday of a day.
 *
 * - `id`: Its `UID`, shared by every year of its series.
 * - `gift`: My gift idea for it, its `DESCRIPTION`.
 */
export type Occasion = {
    id: string;
    category: string;
    title: string;
    gift: string;
    file: string;
};

/** The plan of a day. */
export type PlanDay = {
    day: string;
    occasions: Occasion[];
    boxes: Box[];
};

/**
 * A new box, an empty field not written.
 *
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`, `attendees`:
 *   Left out by a sender that does not know them, so a changed box keeps them.
 * - `semester`: Of a skill box, the semester of its day when empty.
 * - `time`: On its day, empty for a box with a deadline.
 * - `documents`: Paths from the folder of its skill of the documents a skill box will use.
 */
export type BoxNew = Omit<EntryTexts, "locationLink" | "titleLink" | "attendees" | keyof Online> &
    Partial<Online> & {
        titleLink?: string;
        attendees?: Attendee[];
        day: string;
        time: string;
        minutes: number | null;
        deadline: string;
        chapters: string[];
        documents: string[];
    };

/** A changed box. */
export type BoxChange = BoxNew & { id: string };

/** A minute in milliseconds. */
const minuteLength: number = 60 * 1000;

/** Most minutes a box may be expected to last, a day. */
const dayMinutes: number = 24 * 60;

/** Days before its deadline a box with a deadline shows in the plan. */
const deadlineDays: number = 4;

/** The plan file a changed box belongs into, for an occurrence always the file of its series. */
function planFileAfter(file: string, entry: Entry, box: { category: string; module: string }, date: string): string {
    return entry.recurrence === "" ? calendarFileOf(box, date, planEnding) : file;
}

/**
 * Makes one occurrence of a series a component of its own before it changes alone.
 *
 * @throws {Error} - When the file holds no such series or occurrence
 */
function boxOwn(file: string, entry: Entry): void {
    if (entry.recurrence !== "") occurrenceOwn(file, entry);
}

/** Gives one occurrence back to its series once it holds nothing of its own. */
function boxTidy(file: string, entry: Entry): void {
    if (entry.recurrence !== "") occurrencesTidy(file, entry.id);
}

/** The day of an entry, of its start in Berlin time. */
function dayOf(entry: Entry): string {
    return entry.allDay ? entry.start : berlinDateOf(new Date(entry.start));
}

/** The times of a to-do as its file holds them, so a copy of it keeps them. */
export function todoTimesOf(entry: Entry): Omit<TodoFields, keyof EntryTexts> {
    return {
        day: dayOf(entry),
        time: entry.allDay ? null : new Date(entry.start),
        minutes: entry.minutes,
        deadline: entry.deadline,
    };
}

/** Stops a day not written like `2026-10-13`. */
function dateCheck(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);
}

/**
 * Log entries written from boxes by their box, from the first entry of the log to a day after a day,
 * so a homework I did early is found too.
 * Sorted by start, so a box with a deadline gets its last session.
 */
function logsOf(to: string): Map<string, Entry> {
    return new Map(
        entriesRead(day.log, "1970-01-01T00:00:00Z", berlinDayStartOf(dayAdd(to, 1)))
            .filter((entry: Entry): boolean => entry.planned !== "")
            .sort((first: Entry, second: Entry): number => Date.parse(first.start) - Date.parse(second.start))
            .map((entry: Entry): [string, Entry] => [entry.planned, entry]),
    );
}

/**
 * The last day whose log entries tell the state of the boxes of a day, that day or today,
 * since a box carried along is done by a log entry of the day I do it.
 */
function logsUntilOf(date: string): string {
    const today: string = berlinDateOf(new Date());
    return date < today ? today : date;
}

/** Whether an entry of the plan is a group of tutorials, never a box, which always has its number. */
export function groupIs(entry: Entry): boolean {
    return entry.group !== "" && entry.number === "";
}

/**
 * The boxes of the plan from its first entry to a day, the groups never walked.
 *
 * @param until - Day after the last
 */
function planRead(until: string): Entry[] {
    return entriesRead(
        day.plan,
        "1970-01-01T00:00:00Z",
        berlinDayStartOf(until),
        (entry: Entry): boolean => !groupIs(entry),
    );
}

/**
 * Finds the plan file and entry of a box, never a group.
 *
 * @throws {Error} - When the plan holds no such entry, or it is a group
 */
function planEntryFind(id: string): [string, Entry] {
    const found: [string, Entry] | undefined = boxLookup(id);
    if (found === undefined || groupIs(found[1])) throw new Error(`No box ${id}`);
    return found;
}

/** An entry of the plan as a box, carried along. */
function boxOf(entry: Entry, logs: Map<string, Entry>): Box {
    const log: Entry | undefined = logs.get(entryIdOf(entry));
    let minutes: number | null = entry.minutes;
    if (!entry.todo) minutes = entry.allDay ? null : (Date.parse(entry.end) - Date.parse(entry.start)) / minuteLength;
    let state: BoxState = "open";
    if (entry.status === "CANCELLED") state = "dropped";
    else if (entry.status === "COMPLETED" || (log !== undefined && entry.deadline === "")) state = "done";
    else if (entry.number === "NONE") state = "university";
    return carriedOf(
        {
            id: entryIdOf(entry),
            category: entry.category,
            title: entry.title,
            titleLink: entry.titleLink,
            location: entry.location,
            locationLink: entry.locationLink,
            online: entry.online,
            onlineLink: entry.onlineLink,
            onlineChannel: entry.onlineChannel,
            onlineTitle: entry.onlineTitle,
            from: entry.from,
            attendees: entry.attendees,
            module: entry.module,
            type: entry.type,
            semester: entry.semester,
            note: entry.note,
            day: dayOf(entry),
            time: entry.allDay ? "" : entry.start,
            minutes: minutes,
            deadline: entry.deadline,
            state: state,
            pushed: entry.pushed,
            log:
                log === undefined
                    ? null
                    : {
                          start: log.start,
                          end: log.end,
                          location: log.location,
                          locationLink: log.locationLink,
                          online: log.online,
                          onlineLink: log.onlineLink,
                          onlineChannel: log.onlineChannel,
                          onlineTitle: log.onlineTitle,
                          attendees: log.attendees,
                      },
            editable: entry.editable,
            series: entry.recurrence !== "",
            todo: entry.todo,
            links: entry.links,
            chapters: chaptersOf(entry),
            number: entry.number,
            group: entry.group,
            moved: null,
            file: entry.file,
        },
        entry.written,
    );
}

/** Days from one day to another, below zero when the other lies before. */
function daysOf(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / (dayMinutes * minuteLength));
}

/**
 * A box as it stands carried along, pushed at the end of each day from its day to today,
 * or to the day of the log entry that did it later.
 * Any other box stands as it is, also one that got its day after that day.
 *
 * @param written - When it got its day, its `DTSTAMP`
 */
function carriedOf(box: Box, written: string): Box {
    let until: string = "";
    if (box.state === "open") until = berlinDateOf(new Date());
    else if (box.state === "done") until = loggedDayOf(box);
    if (berlinDateOf(new Date(written)) > box.day || box.deadline !== "" || until <= box.day) return box;
    const days: number = daysOf(box.day, until);
    const laterOf: (later: number) => string = (later: number): string =>
        box.time === "" ? "" : berlinLater(new Date(box.time), later).toISOString();
    return {
        ...box,
        day: until,
        time: laterOf(days),
        pushed: [
            ...box.pushed,
            ...Array.from({ length: days }, (_: unknown, later: number): Push => ({
                day: dayAdd(box.day, later),
                time: laterOf(later),
                minutes: box.minutes,
            })),
        ],
    };
}

/**
 * A box as it stood on each day it was pushed from, greyed like a skipped box.
 * An open box carried along stays open on its own day, so I log it there.
 *
 * @param written - How many of its pushes its file holds
 */
function leftBoxesOf(box: Box, written: number): Box[] {
    return box.pushed.map((push: Push, index: number): Box => ({
        ...box,
        day: push.day,
        time: push.time,
        minutes: push.minutes ?? box.minutes,
        deadline: "",
        state: box.state === "open" && index === written ? "open" : "pushed",
        pushed: box.pushed.slice(0, index),
        log: null,
        moved: { day: box.day, went: box.pushed[index + 1]?.day ?? box.day },
    }));
}

/**
 * Orders boxes so the plan reads like the log, those with a time by their time,
 * then those with a deadline by their deadline, then the rest as planned, cancelled and pushed last.
 */
function boxCompare(first: Box, second: Box): number {
    const rankOf: (box: Box) => number = (box: Box): number => {
        if (box.time !== "") return 0;
        if (box.deadline !== "") return 1;
        return box.state === "dropped" || box.state === "university" || box.state === "pushed" ? 3 : 2;
    };
    return (
        rankOf(first) - rankOf(second) ||
        first.time.localeCompare(second.time) ||
        first.deadline.localeCompare(second.deadline)
    );
}

/**
 * Whether a box with a deadline shows on a day, on its deadline always, so I see it done there,
 * and from {@link deadlineDays} days before, once done only until its last session.
 */
function deadlineShows(box: Box, date: string): boolean {
    const last: string = box.state === "done" && box.log !== null ? loggedDayOf(box) : box.day;
    return date === box.day || (dayAdd(box.day, -deadlineDays) <= date && date < box.day && date <= last);
}

/** The day of the log entry of a box in Berlin time, empty for none. */
function loggedDayOf(box: Box): string {
    return box.log === null ? "" : berlinDateOf(new Date(box.log.start));
}

/**
 * The plans of the days of a range with their birthdays, holidays and boxes.
 * A pushed box shows greyed on each day it was pushed from.
 * - `logs`: Until {@link deadlineDays} days after the last day or today, the later.
 * - `entries`: Up to {@link deadlineDays} days after the last day, so a deadline after the range shows,
 *   and those that happen once wherever they lie, so one pushed from the range shows there.
 *
 * @param end - Day after the last
 * @throws {Error} - When a day is not written like `2026-10-13`
 */
export function boxesRead(start: string, end: string): PlanDay[] {
    dateCheck(start);
    dateCheck(end);
    const from: string = berlinDayStartOf(start);
    const logs: Map<string, Entry> = logsOf(dayAdd(logsUntilOf(end), deadlineDays));
    const entries: Entry[] = [
        ...new Map(
            [...planRead(dayAdd(end, deadlineDays)), ...entriesOnceRead(day.plan)]
                .filter((entry: Entry): boolean => !groupIs(entry))
                .map((entry: Entry): [string, Entry] => [entryIdOf(entry), entry]),
        ).values(),
    ];
    const boxes: Box[] = entries.map((entry: Entry): Box => boxOf(entry, logs));
    const left: Box[] = boxes.flatMap((box: Box, index: number): Box[] =>
        leftBoxesOf(box, entries[index].pushed.length),
    );
    const occasions: Entry[] = entriesRead(day.system, from, berlinDayStartOf(end));

    const days: PlanDay[] = [];
    for (let date: string = start; date < end; date = dayAdd(date, 1)) {
        const planned: Box[] = [
            ...boxes.filter((box: Box): boolean => (box.deadline === "" ? box.day === date : deadlineShows(box, date))),
            ...left.filter((box: Box): boolean => box.day === date),
        ];
        days.push({
            day: date,
            occasions: occasions
                .filter((occasion: Entry): boolean =>
                    occasion.allDay ? occasion.start <= date && occasion.end > date : dayOf(occasion) === date,
                )
                .map((occasion: Entry): Occasion => ({
                    id: occasion.id,
                    category: occasion.category,
                    title: occasion.title,
                    gift: occasion.note.trim(),
                    file: occasion.file,
                })),
            boxes: planned.sort(boxCompare),
        });
    }
    return days;
}

/** The open boxes with a deadline before a day, the earliest first. */
export function boxesCarried(date: string): Box[] {
    dateCheck(date);
    const logs: Map<string, Entry> = logsOf(date);
    return planRead(date)
        .map((entry: Entry): Box => boxOf(entry, logs))
        .filter((box: Box): boolean => box.state === "open" && box.deadline !== "" && box.day < date)
        .sort((first: Box, second: Box): number => first.day.localeCompare(second.day) || boxCompare(first, second));
}

/**
 * The skill boxes of the plan up to a day, of every state.
 *
 * @param until - Day after the last
 */
export function skillBoxesRead(until: string): Box[] {
    dateCheck(until);
    const logs: Map<string, Entry> = logsOf(until);
    return planRead(until)
        .map((entry: Entry): Box => boxOf(entry, logs))
        .filter((box: Box): boolean => box.category === skillName);
}

/**
 * Finds a box of the plan with its plan file and entry.
 *
 * @throws {Error} - When the plan holds no such box
 */
export function boxFind(id: string): [string, Entry, Box] {
    const [file, entry]: [string, Entry] = planEntryFind(id);
    return [file, entry, boxOf(entry, logsOf(dayAdd(logsUntilOf(dayOf(entry)), 1)))];
}

/** Finds an open box, the only kind to log. */
export function boxOpenFind(id: string): Box {
    const [, , box]: [string, Entry, Box] = boxFind(id);
    if (box.state !== "open") throw new Error(`${box.title} is ${box.state} already`);
    return box;
}

/**
 * Checks a box before it is written, its fields fit its category or keep what the box was.
 * A skill box has a type its skill offers, else the one it had, else none.
 * The chapters of a skill box lie among those of its module or those it had.
 *
 * @param old - The box as it was, `null` for a new one
 */
function boxCheck(box: BoxNew, old: Entry | null): void {
    const kept: boolean =
        old !== null &&
        box.category === old.category &&
        (box.category === skillName ? box.module === old.module && box.type === old.type : box.title === old.title) &&
        attendeesAllow(box.attendees ?? []);
    dateCheck(box.day);
    if (!(kept || categoryAllows(box))) throw new Error(`No box ${box.category} ${box.title}`);
    if (box.category === skillName && !skillTypeAllows(box.module, box.type, old?.type ?? ""))
        throw new Error(`No type ${box.type} of ${box.module}`);
    if (box.time !== "" && berlinDateOf(new Date(box.time)) !== box.day)
        throw new Error(`${box.title}: its time lies on another day than ${box.day}`);
    if (box.minutes !== null && !(Number.isInteger(box.minutes) && box.minutes > 0 && box.minutes <= dayMinutes))
        throw new Error(`${box.title}: no duration of ${box.minutes} minutes`);
    const deadlineDay: string =
        box.deadline === "" || /^\d{4}-\d{2}-\d{2}$/.test(box.deadline)
            ? box.deadline
            : berlinDateOf(new Date(box.deadline));
    if (box.deadline !== "" && (deadlineDay !== box.day || box.time !== ""))
        throw new Error(
            `${box.title}: a box with a deadline lies on the day of its deadline, ` + "without expected time",
        );
    const folder: string | undefined = moduleFolderOf(box.module);
    const offered: string[] = [
        ...(folder === undefined ? [] : moduleContentsRead(folder).chapters),
        ...(old === null ? [] : chaptersOf(old)),
    ];
    if (box.chapters.some((chapter: string): boolean => !offered.includes(chapter)))
        throw new Error(`${box.title}: no chapters ${box.chapters.join(", ")} in ${box.module}`);
}

/**
 * The `X-CHAPTER`s and `ATTACH`es of a skill box, emptied for one that is no skill box any more.
 * A box that never was one, like a to-do of another app, keeps its links.
 *
 * @throws {Error} - When a document is none of the module's
 */
function boxLinksOf(box: BoxNew, old: Entry | null): [string, (string | Link)[]][] {
    if (box.category === skillName)
        return [
            ["x-chapter", box.chapters],
            ["attach", linksOf(box.module, box.documents, old?.links ?? [])],
        ];
    if (old?.category === skillName)
        return [
            ["x-chapter", []],
            ["attach", []],
        ];
    return [];
}

/**
 * The text fields of a box, what it left out online taken from what it had.
 *
 * @throws {Error} - When the link typed online is no web address
 */
function boxTextsOf(box: BoxNew, old: Entry | null): EntryTexts {
    const semester: string = semesterFor(box.category, box.semester, box.day);
    const [title, titleLink]: [string, string] = titleOf({ ...box, semester: semester }, old);
    return {
        category: box.category,
        title: title,
        titleLink: titleLink,
        location: box.location,
        locationLink: placeLinkOf(box.location, old),
        ...onlineFor(box, old),
        from: box.from,
        attendees: box.attendees ?? old?.attendees ?? [],
        module: box.module,
        type: box.type,
        semester: semester,
        note: box.note,
    };
}

/** The fields of the to-do of a box. */
function todoFieldsOf(box: BoxNew, old: Entry | null): TodoFields {
    return {
        ...boxTextsOf(box, old),
        day: box.day,
        time: box.time === "" ? null : new Date(box.time),
        minutes: box.minutes,
        deadline: box.deadline,
    };
}

/**
 * The fields of a changed box that is an event, which keeps its time and duration.
 *
 * @throws {Error} - When it would lose its time or duration, or the link typed online is no web address
 */
function eventFieldsOf(change: BoxChange, old: Entry): EntryFields {
    if (change.time === "" || change.minutes === null)
        throw new Error(`${old.title} is an event of the plan and keeps its time and its duration`);
    const start: Date = new Date(change.time);
    return {
        ...boxTextsOf(change, old),
        start: start,
        end: new Date(start.getTime() + change.minutes * minuteLength),
    };
}

/**
 * The series of a skill box, the boxes of the same skill and type by date.
 * Up to two years after today, so a daily box without end is not walked through a century.
 */
function seriesOf(module: string, type: string): Entry[] {
    return planRead(dayAdd(berlinDateOf(new Date()), 2 * 366))
        .filter(
            (entry: Entry): boolean => entry.category === skillName && entry.module === module && entry.type === type,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
}

/** The next number of a series, one more than the highest before its day, `1` for the first. */
function numberNextOf(module: string, type: string, date: string): string {
    const before: number[] = seriesOf(module, type)
        .filter((entry: Entry): boolean => dayOf(entry) < date && /^\d+$/.test(entry.number))
        .map((entry: Entry): number => Number(entry.number));
    return String(Math.max(0, ...before) + 1);
}

/**
 * Adds a box to the plan it belongs into, nothing written while it is not right.
 *
 * @param given - The `UID` a box brought from Vu's plan, left out for a new one
 * @returns Identifier of the new box
 * @throws {Error} - When the box is not right
 */
export function boxAdd(box: BoxNew, given?: string): string {
    boxCheck(box, null);
    const file: string = calendarFileOf(box, box.day, planEnding);
    const fields: TodoFields = todoFieldsOf(box, null);
    const links: [string, (string | Link)[]][] = boxLinksOf(box, null);
    const id: string = todoAppend(file, fields, [], true, given);
    if (links.length > 0) propertiesPut(file, id, links);
    if (box.category === skillName && numberedTypes.includes(box.type))
        propertiesPut(file, id, [["x-number", [numberNextOf(box.module, box.type, box.day)]]]);
    return id;
}

/**
 * Adds boxes that differ only in their days and times, or only checks them when `dry`.
 * The first is checked before any is written, since the others share all but their times.
 *
 * @throws {Error} - As {@link boxAdd} for the first box
 */
export function boxesAdd(boxes: BoxNew[], dry: boolean): string[] {
    const first: BoxNew | undefined = boxes[0];
    if (first !== undefined) {
        boxCheck(first, null);
        todoFieldsOf(first, null);
        boxLinksOf(first, null);
    }
    return dry ? [] : boxes.map((box: BoxNew): string => boxAdd(box));
}

/**
 * Marks a box the university cancelled, its number `NONE`, or takes that back.
 * Every later numbered box of its series moves up one, taken back down one again.
 * Boxes I cancelled myself keep their numbers.
 * A box of a tutorial group, numbered by its week, moves no other box and gets `1` until renumbered.
 *
 * @throws {Error} - When the box is not open, or not cancelled by the university, or of no numbered type
 */
export function boxUniversity(id: string, cancelled: boolean): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(id);
    if (!entry.editable || box.state !== (cancelled ? "open" : "university") || !numberedTypes.includes(entry.type))
        throw new Error(`${entry.title} is no box of the new system to mark`);
    const series: Entry[] = seriesOf(entry.module, entry.type).filter(
        (other: Entry): boolean => entryIdOf(other) !== id && /^\d+$/.test(other.number),
    );
    const before: number[] = series
        .filter((other: Entry): boolean => other.start < entry.start)
        .map((other: Entry): number => Number(other.number));
    const after: Entry[] = series.filter((other: Entry): boolean => other.start > entry.start);
    let number: string = "NONE";
    if (!cancelled) number = before.length > 0 ? String(Math.max(...before) + 1) : (after[0]?.number ?? "1");
    const step: number = cancelled ? -1 : 1;
    boxOwn(file, entry);
    propertiesPut(file, id, [["x-number", [entry.group !== "" && !cancelled ? "1" : number]]]);
    if (entry.group !== "") return;
    after.forEach((other: Entry): void => {
        const [otherFile, otherEntry]: [string, Entry] = planEntryFind(entryIdOf(other));
        boxOwn(otherFile, otherEntry);
        propertiesPut(otherFile, entryIdOf(other), [["x-number", [String(Number(other.number) + step)]]]);
    });
}

/**
 * Changes a box, one occurrence of a series alone.
 * An open box without deadline whose day moves is pushed.
 * All is checked before anything is written, so a change refused changes nothing.
 * - `old`: Its entry as its file holds it, before the pushes of a box carried along are written.
 *
 * @throws {Error} - When the box may not be changed or the change is not right
 */
export function boxEdit(change: BoxChange): void {
    const found: [string, Entry, Box] = boxFind(change.id);
    const old: Entry = found[1];
    if (!old.editable) throw new Error(`${old.title} may not be changed`);
    boxCheck(change, old);
    const todo: TodoFields | null = old.todo ? todoFieldsOf(change, old) : null;
    const event: EntryFields | null = old.todo ? null : eventFieldsOf(change, old);
    const links: [string, (string | Link)[]][] = boxLinksOf(change, old);
    const [file, entry, box]: [string, Entry, Box] = carryWrite(found);
    boxOwn(file, entry);
    if (box.state === "open" && box.deadline === "" && change.deadline === "" && change.day !== box.day)
        pushAdd(file, change.id, entry);
    const target: string = planFileAfter(file, entry, change, change.day);
    if (todo !== null) todoChange(file, entry, todo, target);
    else if (event !== null) entryChange(file, entry, event, target);
    if (links.length > 0) propertiesPut(target, change.id, links);
    boxTidy(file, entry);
}

/**
 * Removes a box planned by mistake, one day of a series alone.
 * A done box stays, since its log entry points to it.
 *
 * @throws {Error} - When there is no such box in the new system, or it is done
 */
export function boxDelete(id: string): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(id);
    if (!entry.editable || box.state === "done") throw new Error(`${entry.title} may not be removed`);
    if (entry.recurrence !== "") seriesDayRemove(file, entry.id, entry.recurrence);
    else entryRemove(file, id);
}

/** An entry as it would stand days later, its time of day and length kept. */
function entryLater(entry: Entry, days: number): Entry {
    const laterOf: (instant: string) => string = (instant: string): string =>
        entry.allDay ? dayAdd(instant, days) : berlinLater(new Date(instant), days).toISOString();
    return { ...entry, start: laterOf(entry.start), end: laterOf(entry.end) };
}

/**
 * Moves a box by days, its time of day and length kept.
 *
 * @returns The plan file it lies in then
 */
function boxShift(file: string, entry: Entry, days: number): string {
    const later: Entry = entryLater(entry, days);
    const day: string = dayOf(later);
    const target: string = planFileAfter(file, entry, entry, day);
    if (entry.todo)
        todoChange(
            file,
            entry,
            {
                ...entry,
                day: day,
                time: entry.allDay ? null : new Date(later.start),
                deadline: "",
            },
            target,
        );
    else entryChange(file, entry, { ...entry, start: new Date(later.start), end: new Date(later.end) }, target);
    return target;
}

/**
 * Writes the pushes a box carried along stands for before it changes,
 * as if I had pushed it by hand each day.
 *
 * @throws {Error} - When the file lies outside the new system
 */
function carryWrite(found: [string, Entry, Box]): [string, Entry, Box] {
    const [file, entry, box]: [string, Entry, Box] = found;
    const carried: number = box.pushed.length - entry.pushed.length;
    if (carried === 0) return found;
    boxOwn(file, entry);
    for (let later: number = 0; later < carried; later++) pushAdd(file, box.id, entryLater(entry, later));
    boxShift(file, entry, carried);
    return boxFind(box.id);
}

/**
 * Pushes an open box to the next day, or when its day is over to tomorrow.
 * A box with a deadline stays, since its day is the day of its deadline.
 *
 * @throws {Error} - When the box is not open or has a deadline
 */
export function boxPush(id: string): void {
    const found: [string, Entry, Box] = boxFind(id);
    if (!found[1].editable || found[2].state !== "open" || found[2].deadline !== "")
        throw new Error(`${found[1].title} is no open box of the new system without deadline`);

    const [file, entry, box]: [string, Entry, Box] = carryWrite(found);
    const today: string = berlinDateOf(new Date());
    const next: string = dayAdd(box.day < today ? today : box.day, 1);
    boxOwn(file, entry);
    pushAdd(file, id, entry);
    boxShift(file, entry, daysOf(box.day, next));
}

/**
 * Sets a box back on one of the days it left as it stood there, that push and all after it gone.
 *
 * @param at - Which of its pushes
 * @returns The box as it stands then
 * @throws {Error} - When the file lies outside the new system
 */
function boxReturn(found: [string, Entry, Box], at: number): [string, Entry, Box] {
    const [file, entry, box]: [string, Entry, Box] = carryWrite(found);
    const push: Push = box.pushed[at];
    const minutes: number | null = push.minutes ?? box.minutes;
    const target: string = planFileAfter(file, entry, entry, push.day);
    boxOwn(file, entry);
    pushesKeep(file, box.id, at);
    if (entry.todo)
        todoChange(
            file,
            entry,
            {
                ...entry,
                day: push.day,
                time: push.time === "" ? null : new Date(push.time),
                minutes: minutes,
                deadline: "",
            },
            target,
        );
    else
        entryChange(
            file,
            entry,
            {
                ...entry,
                start: new Date(push.time),
                end: new Date(Date.parse(push.time) + (minutes ?? 0) * minuteLength),
            },
            target,
        );
    return boxFind(box.id);
}

/**
 * Sets a box back on a day it left in the state it has.
 *
 * @throws {Error} - When there is no such box in the new system, or it never left that day
 */
export function boxBack(id: string, date: string): void {
    const found: [string, Entry, Box] = boxFind(id);
    const at: number = found[2].pushed.findIndex((push: Push): boolean => push.day === date);
    if (!found[1].editable || at === -1) throw new Error(`${found[1].title} did not leave ${date}`);
    const [file, entry]: [string, Entry, Box] = boxReturn(found, at);
    boxTidy(file, entry);
}

/**
 * Drops a box not done as `STATUS:CANCELLED`, or takes it back.
 * Taken back, a to-do is `NEEDS-ACTION` again, an event without status as it was imported.
 * A box with pushes in its file is dropped on the first day it left, so no day shows it moved.
 * One only carried along stands there already, so it keeps when it got its day.
 *
 * @throws {Error} - When there is no such box in the new system, or it is done
 */
export function boxDrop(id: string, dropped: boolean): void {
    const found: [string, Entry, Box] = boxFind(id);
    if (!found[1].editable || found[2].state === "done") throw new Error(`${found[1].title} cannot be dropped`);
    const [file, entry]: [string, Entry, Box] = dropped && found[1].pushed.length > 0 ? boxReturn(found, 0) : found;
    let status: string = "";
    if (dropped) status = "CANCELLED";
    else if (entry.todo) status = "NEEDS-ACTION";
    boxOwn(file, entry);
    statusPut(file, id, status);
    if (!dropped) boxTidy(file, entry);
}

/**
 * Marks a to-do that happens once `COMPLETED` once its log entry is written.
 * An event or occurrence is done by the log entry alone.
 * One with a deadline stays open, since the log entry is one of its sessions.
 *
 * @throws {Error} - When the plan holds no such box
 */
export function boxDone(id: string): void {
    const [file, entry]: [string, Entry] = planEntryFind(id);
    if (entry.todo && entry.editable && entry.recurrence === "" && entry.deadline === "")
        statusPut(file, id, "COMPLETED");
}

/**
 * Ticks a box with a deadline submitted or takes the tick back, its sessions staying in the log.
 *
 * @throws {Error} - When it has no deadline, or is not open, or not done for taking the tick back
 */
export function boxSubmit(id: string, submitted: boolean): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(id);
    if (!entry.editable || box.deadline === "" || box.state !== (submitted ? "open" : "done"))
        throw new Error(`${entry.title} cannot be ${submitted ? "ticked submitted" : "taken back"}`);
    statusPut(file, id, submitted ? "COMPLETED" : "NEEDS-ACTION");
}

/** Finds a box of the plan, also an occurrence of a series, `undefined` when it is gone. */
function boxLookup(id: string): [string, Entry] | undefined {
    const at: number = id.lastIndexOf("#");
    return (
        entryLookup(day.plan, id) ??
        (at === -1 ? undefined : occurrenceLookup(day.plan, id.slice(0, at), id.slice(at + 1)))
    );
}

/**
 * Opens a box again once its log entry is removed.
 * One with a deadline stays as it is, since only my tick decides it.
 */
export function boxReopen(id: string): void {
    const found: [string, Entry] | undefined = boxLookup(id);
    if (found === undefined || found[1].deadline !== "") return;
    if (found[1].todo && found[1].editable && found[1].status === "COMPLETED") statusPut(found[0], id, "NEEDS-ACTION");
}

/**
 * Whether a box is an open skill box of a module my learning logs,
 * never one with a deadline or of a series, which I log myself.
 */
function skillBoxOpen(box: Box, module: string): boolean {
    return (
        box.category === skillName &&
        box.module === module &&
        box.state === "open" &&
        box.editable &&
        !box.series &&
        box.deadline === ""
    );
}

/**
 * The first open study box without time of a module on a day, one with chapters only for those.
 *
 * @param chapters - Chapters I learn, none when not known yet
 */
export function studyBoxOf(module: string, date: string, chapters: string[]): Box | undefined {
    const fits: (box: Box) => boolean = (box: Box): boolean =>
        skillBoxOpen(box, module) &&
        box.time === "" &&
        (chapters.length === 0 ||
            box.chapters.length === 0 ||
            box.chapters.some((chapter: string): boolean => chapters.includes(chapter)));
    return boxesRead(date, dayAdd(date, 1))[0].boxes.find(fits);
}

/** The open skill box of a module whose expected time holds a moment, else its study box. */
export function skillBoxOf(module: string, moment: Date, chapters: string[]): Box | undefined {
    const date: string = berlinDateOf(moment);
    const now: number = moment.getTime();
    return (
        boxesRead(date, dayAdd(date, 1))[0].boxes.find(
            (box: Box): boolean =>
                skillBoxOpen(box, module) &&
                box.time !== "" &&
                box.minutes !== null &&
                Date.parse(box.time) <= now &&
                now < Date.parse(box.time) + box.minutes * minuteLength,
        ) ?? studyBoxOf(module, date, chapters)
    );
}
