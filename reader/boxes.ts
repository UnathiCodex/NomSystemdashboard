/**
 * ## Boxes
 *
 * The plan of a day is a list of boxes, not a calendar:
 * the log is my one calendar, see `day.ts`.
 * A box is what I intend to do on a day, by category like an entry of the log,
 * with an expected time or without, and with an expected duration or without.
 * What happens anyway, like my sleep, I don't plan, see `categories.ts`.
 * When I do it, it goes into the log at its real time, see `boxLog` in `day.ts`,
 * so expected and real time can be compared later.
 * A box I decide against is cancelled and stays in its file as `STATUS:CANCELLED`,
 * so it can be counted. `STATUS:CANCELLED` is always my own decision, lectures included.
 * Any change of its day is a push, see {@link boxPush} and {@link boxEdit},
 * so every move is counted and a move by mistake is set right by moving it again.
 * A pushed box stays greyed on each day it left, see {@link leftBoxesOf}.
 * A box without deadline neither done nor cancelled
 * is carried along once its day is over:
 * it counts as pushed to the next day at the end of each day, see {@link carriedOf}.
 * Only on its own day it stays open, so I log it there when I log it later,
 * like my diary of yesterday, and it counts as done on that day, never as pushed.
 * These pushes are not written while it is carried, only once I change it,
 * see {@link carryWrite}.
 * Only a box that got its day on that day or before, its `DTSTAMP`, is carried along,
 * so one I add for a day that is over or move to one stays there, missed,
 * until its day changes again; so does one of a day over I take back to open,
 * see {@link overKeep}.
 * A box with a deadline is never pushed, see {@link boxesCarried}.
 * A lecture, an exercise, a tutorial and a sheet carry their number in their series
 * as `X-NUMBER`, see {@link numberNextOf} and {@link boxUniversity}.
 * An exam carries its kind there instead, which nothing numbers.
 * A box made a series in the dialog of a series is a rule,
 * one to-do that repeats by its `RRULE`, see `rules.ts`,
 * each of its days changed alone with its `RECURRENCE-ID`, see {@link boxOwn},
 * but a lecture, an exercise, a tutorial and a sheet,
 * whose series is one box per date, numbered, see `repeatApply` in `course.ts`.
 *
 * A box of the new system is a `VTODO` in the plan of its topic and year,
 * or a skill box in the plan of its skill, see `sources.ts` and `calendar.ts`,
 * it moves into the plan it belongs into once that changes, see {@link planFileAfter}:
 * - its day and its expected time in `DTSTART`,
 * - or instead its deadline in `DUE`.
 *   iCalendar wants `DUE` of the same kind as `DTSTART`, both days or both times,
 *   so a box with a deadline has no `DTSTART`: the day of its deadline is its day,
 *   and it has no expected time.
 *   It is done only once I tick it submitted, see {@link boxSubmit},
 *   since the log entries pointing to it are its sessions, as many as it needs;
 * - its expected duration in `ESTIMATED-DURATION`, left out when it has none:
 *   the property of the task extensions of iCalendar (draft-ietf-calext-ical-tasks),
 *   since RFC 5545 has none for how long a to-do takes:
 *   its `DURATION` is the window to do it in,
 *   and after a `DTSTART` without time it may only be whole days;
 * - its state in `STATUS`, `COMPLETED` without the moment it was done,
 *   since the log entry written from it holds its real time;
 * - each push in one `X-PUSHED` with its start and its length as they stood before,
 *   since the standard has nothing for it, see `pushAdd` in `calendar.ts`.
 * - when it got its day in `DTSTAMP`, set anew with each change of its day
 *   and as one of a day over is taken back to open, never by another change,
 *   see `componentWrite` in `calendar.ts`.
 * - its other fields as an entry of the log has them, a skill box also
 *   `X-SEMESTER`, `X-CHAPTER`s and `ATTACH`es, which a log entry from it gets too.
 * The log entry written from a box points to it with `RELATED-TO:<UID of the box>`,
 * an older one with `X-PLANNED`, see `relatedOf` in `calendar.ts`.
 * An occurrence of a series is a box of its own,
 * its identifier the `UID` and its start after `#`, see `entryIdOf` in `calendar.ts`.
 * The first time it is dropped, pushed or changed alone,
 * it becomes a component of its own in the file of its series,
 * the way the standard changes one occurrence, see `occurrenceOwn` in `calendar.ts`.
 * It stays in that file, whatever its new day.
 *
 * The plan files also hold events, `VEVENT`s, like the lectures imported from TUMonline,
 * each read as a box. A change keeps an event an event, so its time and duration stay.
 * A to-do with `X-GROUP` and without `X-NUMBER` is no box
 * but a group of the tutorials of a module, see `course.ts` and {@link groupIs}.
 *
 * Above its boxes a day shows its birthdays, holidays and semester dates,
 * see `sources.ts`, each with my gift idea for it, see `gifts.ts`.
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
    seriesDayRemove,
    stampPut,
    statusPut,
    titlePut,
    todoAppend,
    todoChange,
} from "./calendar.ts";
import { attendeesAllow, categoryAllows, semesterFor, skillName } from "./categories.ts";
import { calendarFileOf, chaptersOf, linksOf, titleOf } from "./documents.ts";
import { moduleContentsRead, moduleFolderOf } from "./notes.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { day, planEnding } from "./sources.ts";

import type { Attendee, Entry, EntryFields, EntryTexts, Link, Online, Push, TodoFields } from "./calendar.ts";

/**
 * State of a box: `university` for cancelled by the university, its `X-NUMBER:NONE`,
 * `pushed` as it shows greyed on a day it left, see {@link leftBoxesOf}.
 */
export type BoxState = "open" | "done" | "dropped" | "university" | "pushed";

/**
 * Types of skill boxes that carry their number in their series, see `course.ts`.
 */
export const numberedTypes: string[] = ["VO", "UE", "ZU", "TU", "HU"];

/**
 * A box, as the page shows it.
 *
 * - `id`: Its `UID`, for an occurrence of a series with its start, see `entryIdOf`.
 * - `day`: For a box with a deadline the day of its deadline.
 * - `time`, `deadline`: Empty for none, a deadline without time as its day.
 * - `pushed`: Where it stood before each push, those it is carried along by last.
 * - `log`: Times of the log entry written from it, of its last session for a deadline.
 * - `editable`: A to-do or an event with times, also one occurrence of a series.
 * - `series`: One occurrence of a series, whose bin takes that day alone out of it.
 * - `todo`: Whether it is a to-do, since an event keeps its time and duration.
 * - `chapters`: Its `X-CHAPTER`s, or those whose folders an older box links.
 * - `number`: Its `X-NUMBER`, `NONE` for one the university cancelled, or an exam's kind.
 * - `moved`: Where it went, for a box shown on a day it left, see {@link leftBoxesOf}.
 * - `file`: Its `.ics` file from `NomWorkspace` on, which its dialog shows.
 */
export type Box = EntryTexts & {
    id: string;
    day: string;
    time: string;
    minutes: number | null;
    deadline: string;
    state: BoxState;
    pushed: Push[];
    log: { start: string; end: string } | null;
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

/**
 * Where a box went that shows on a day it left, see {@link leftBoxesOf}.
 *
 * - `day`: The day it stands on now.
 * - `went`: The day it went to from the day it shows on, later or earlier.
 */
export type Moved = {
    day: string;
    went: string;
};

/**
 * A birthday or holiday of a day, as the page shows it.
 *
 * - `id`: Its `UID`, shared by every year of its series.
 * - `gift`: My gift idea for it, its `DESCRIPTION`, see `gifts.ts`.
 */
export type Occasion = {
    id: string;
    category: string;
    title: string;
    gift: string;
    file: string;
};

/**
 * The plan of a day, its boxes ordered by {@link boxCompare}.
 */
export type PlanDay = {
    day: string;
    occasions: Occasion[];
    boxes: Box[];
};

/**
 * A new box, as the entry by category and an accepted suggestion send it;
 * an empty field is not written.
 * The reader finds the link of its place, see `placeLinkOf` in `places.ts`,
 * and writes what a skill box is, see `titleOf` in `documents.ts`.
 *
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`, `attendees`:
 *   Left out by a sender that does not know them, like an accepted suggestion,
 *   so a changed box keeps them and a new one has none.
 * - `semester`: Of a skill box, the semester of its day when empty,
 *   see `semesterFor` in `categories.ts`.
 * - `time`: On its day, empty for a box with a deadline.
 * - `documents`: Paths from the folder of its skill
 *   of the documents a skill box will use.
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

/**
 * A changed box, a {@link BoxNew} with the identifier of the box.
 */
export type BoxChange = BoxNew & { id: string };

/**
 * A minute in milliseconds.
 */
const minuteLength: number = 60 * 1000;

/**
 * Most minutes a box may be expected to last: a day.
 */
const dayMinutes: number = 24 * 60;

/**
 * Days before its deadline a box with a deadline shows in the plan.
 */
const deadlineDays: number = 4;

/**
 * Gives the plan file a box is written into once it changes, the plan it belongs into:
 * of its skill for a skill box, else of its topic in the year of its day,
 * see `calendarFileOf` in `documents.ts`,
 * always the file of its series for one occurrence of a series.
 */
function planFileAfter(file: string, entry: Entry, box: { category: string; module: string }, date: string): string {
    return entry.recurrence === "" ? calendarFileOf(box, date, planEnding) : file;
}

/**
 * Makes one occurrence of a series a component of its own before it is dropped,
 * pushed or changed alone, see `occurrenceOwn` in `calendar.ts`.
 *
 * @throws {Error} - When the file holds no such series or occurrence
 */
function boxOwn(file: string, entry: Entry): void {
    if (entry.recurrence !== "") occurrenceOwn(file, entry);
}

/**
 * Gives one occurrence of a series back to its series once it holds nothing of its own,
 * like one changed and changed back, see `occurrencesTidy` in `calendar.ts`.
 */
function boxTidy(file: string, entry: Entry): void {
    if (entry.recurrence !== "") occurrencesTidy(file, entry.id);
}

/**
 * Keeps a box of a day over on its day once I take its state back to open, skipped,
 * cancelled by the university or done:
 * it gets its `DTSTAMP` now, see `stampPut` in `calendar.ts`,
 * so it stays there, missed, never carried along to today, see {@link carriedOf},
 * and I skip it or log it again there.
 *
 * @throws {Error} - When the plan holds no such box,
 *   or its file lies outside the new system
 */
export function overKeep(id: string): void {
    const [file, entry]: [string, Entry] = planEntryFind(id);
    if (!entry.editable || dayOf(entry) >= berlinDateOf(new Date())) return;
    boxOwn(file, entry);
    stampPut(file, id);
}

/**
 * Gives the day of an entry, of its start in Berlin time.
 */
function dayOf(entry: Entry): string {
    return entry.allDay ? entry.start : berlinDateOf(new Date(entry.start));
}

/**
 * Stops a day not written like `2026-10-13`.
 */
function dateCheck(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);
}

/**
 * Reads the log entries written from boxes, by the identifier of their box,
 * from the first entry of the log to a day after a day,
 * so an entry of a box is found also when it lies long before the day of its box,
 * like a homework I did early, or a little after it;
 * for a box with a deadline its last session, so the entries go in by their start.
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
 * Gives the last day whose log entries tell the state of the boxes of a day:
 * that day or today, the later,
 * since a box carried along is done by a log entry of the day I do it,
 * like the box of 18.10 my session of 22.10 did, which is done then on 18.10 too.
 */
function logsUntilOf(date: string): string {
    const today: string = berlinDateOf(new Date());
    return date < today ? today : date;
}

/**
 * Tells whether an entry of the plan is a group of the tutorials of a module:
 * a to-do with `X-GROUP` and without `X-NUMBER`,
 * never a box, which always has its number.
 */
export function groupIs(entry: Entry): boolean {
    return entry.group !== "" && entry.number === "";
}

/**
 * Reads the entries of the plan that are boxes from its first entry to a day,
 * every one but the groups,
 * see `entriesRead` in `calendar.ts`, whose sessions are never walked.
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
 * Finds the plan file and entry of a box by its identifier:
 * the entry that happens once with that `UID`,
 * else the occurrence named by the `UID` and the start after the last `#`,
 * a component of its own or not; never a group.
 *
 * @throws {Error} - When the plan holds no such entry, or it is a group
 */
function planEntryFind(id: string): [string, Entry] {
    const found: [string, Entry] | undefined = boxLookup(id);
    if (found === undefined || groupIs(found[1])) throw new Error(`No box ${id}`);
    return found;
}

/**
 * Turns an entry of the plan into a box, see the top of this file,
 * carried along, see {@link carriedOf}.
 */
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
            log: log === undefined ? null : { start: log.start, end: log.end },
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

/**
 * Gives the days from one day to another, below zero when the other lies before.
 */
function daysOf(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / (dayMinutes * minuteLength));
}

/**
 * Gives a box as it stands carried along, see the top of this file:
 * a box without deadline, open while its day is over,
 * as pushed at the end of each day from its day to today,
 * one done by a log entry of a later day than its own as pushed to the day of that entry;
 * each push one more {@link Push} after those of its file,
 * with its time of day and its length.
 * Any other box stands as it is, also one that got its day after that day,
 * its `DTSTAMP` later, like a box added for a day that is over,
 * which stays there, missed.
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
 * Gives a box as it stood on each day it was pushed from, greyed like a skipped box,
 * with the start and the length it had there, without deadline,
 * since a box with one is never pushed;
 * but an open box carried along stays open on its own day, the first it is carried from,
 * so I log it there, done then on that day and no longer carried.
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
 * Orders two boxes as the stations of the day, so the plan reads like the log:
 * those with a time by their time, also one cancelled or pushed away,
 * which keeps its place faded, then those with a deadline by their deadline,
 * then those without either in the order I planned them in,
 * the cancelled and pushed ones of them last.
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
 * Tells whether a box with a deadline shows on a day: on the day of its deadline always,
 * so I see there that it is done,
 * and from {@link deadlineDays} days before, once done only until its last session.
 */
function deadlineShows(box: Box, date: string): boolean {
    const last: string = box.state === "done" && box.log !== null ? loggedDayOf(box) : box.day;
    return date === box.day || (dayAdd(box.day, -deadlineDays) <= date && date < box.day && date <= last);
}

/**
 * Gives the day of the log entry written from a box, in Berlin time, empty for none.
 */
function loggedDayOf(box: Box): string {
    return box.log === null ? "" : berlinDateOf(new Date(box.log.start));
}

/**
 * Reads the plans of the days of a range, each with its birthdays and holidays
 * and its boxes, each with its state and the time of its log entry.
 * A box belongs to the day it starts on, a box with a deadline to each day it shows on,
 * see {@link deadlineShows}, and a pushed box greyed to each day it was pushed from,
 * see {@link leftBoxesOf}, wherever it lies now, also one carried along.
 * - `logs`: Until {@link deadlineDays} days after the last day or today, the later.
 * - `entries`: Entries of the plan up to {@link deadlineDays} days after the last day,
 *   so a deadline after the range shows in it, from the first entry of the plan,
 *   so one carried along into the range shows in it,
 *   and those that happen once wherever they lie,
 *   so one pushed from a day of the range shows there,
 *   since one occurrence of a series becomes one of its own before it is pushed;
 *   each once.
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

/**
 * Reads the boxes with a deadline carried along to a day, not done,
 * each on its own day, the earliest first,
 * they stay there until I tick them submitted or cancel them.
 * A box without deadline is carried along as pushed instead, see {@link carriedOf}.
 */
export function boxesCarried(date: string): Box[] {
    dateCheck(date);
    const logs: Map<string, Entry> = logsOf(date);
    return planRead(date)
        .map((entry: Entry): Box => boxOf(entry, logs))
        .filter((box: Box): boolean => box.state === "open" && box.deadline !== "" && box.day < date)
        .sort((first: Box, second: Box): number => first.day.localeCompare(second.day) || boxCompare(first, second));
}

/**
 * Reads the skill boxes of the plan up to a day, of every state,
 * for the exam of each module, see `examOf` in `skill.ts`;
 * a series without end stops at that day.
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
 * Finds a box of the plan by its identifier, with its plan file and entry,
 * its state by the log entries up to the day after its day or today, the later.
 *
 * @throws {Error} - When the plan holds no such box
 */
export function boxFind(id: string): [string, Entry, Box] {
    const [file, entry]: [string, Entry] = planEntryFind(id);
    return [file, entry, boxOf(entry, logsOf(dayAdd(logsUntilOf(dayOf(entry)), 1)))];
}

/**
 * Finds an open box, the only kind to log:
 * a done box is logged already, a dropped one I decided against.
 */
export function boxOpenFind(id: string): Box {
    const [, , box]: [string, Entry, Box] = boxFind(id);
    if (box.state !== "open") throw new Error(`${box.title} is ${box.state} already`);
    return box;
}

/**
 * Checks a new or changed box before it is written, see the top of this file:
 * its fields fit its category, see `categoryAllows` in `categories.ts`,
 * or keep what the box was, with well-formed people,
 * like an older `IN2028 DEV` of a type no longer offered;
 * the chapters of a skill box lie among those of its module or those it had.
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
 * Gives the chapters of a skill box as its `X-CHAPTER`s and the documents it will use
 * as its `ATTACH`es, see `linksOf` in `documents.ts`, a document it linked already kept,
 * also one not there yet, like the slides of a lecture to come;
 * for a box that is no skill box any more none of them,
 * but nothing for a box that never was one, like a to-do of another app,
 * so its links stay as they are.
 * Given before anything is written,
 * so a document that is none of the module's changes nothing.
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
 * Turns a box as the page sends it into its text fields:
 * its place with the link the reader finds, see `placeLinkOf` in `places.ts`,
 * what it does online as sent, else as it had it, see `onlineFor` there,
 * and what a skill box is as the reader writes it, see `titleOf` in `documents.ts`.
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

/** Turns a box as the page sends it into the fields of its to-do. */
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
 * Turns a changed box that is an event of the plan into its fields,
 * as {@link todoFieldsOf} does for a to-do, keeping its time and its duration.
 *
 * @throws {Error} - When it would lose its time or its duration,
 *   or the link typed online is no web address
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
 * Reads the series of a skill box: the entries of the plan of the same skill and type,
 * by date, whatever their state, see `skillPartsOf` in `calendar.ts`;
 * up to two years after today, so a daily box without end,
 * like that of my diary, is not walked through a century,
 * which took seconds for each lecture cancelled or added.
 */
function seriesOf(module: string, type: string): Entry[] {
    return planRead(dayAdd(berlinDateOf(new Date()), 2 * 366))
        .filter(
            (entry: Entry): boolean => entry.category === skillName && entry.module === module && entry.type === type,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start));
}

/**
 * Gives the next number of a series for a new skill box
 * of a type of {@link numberedTypes}:
 * one more than the highest number of its series before its day, `1` for the first.
 */
function numberNextOf(module: string, type: string, date: string): string {
    const before: number[] = seriesOf(module, type)
        .filter((entry: Entry): boolean => dayOf(entry) < date && /^\d+$/.test(entry.number))
        .map((entry: Entry): number => Number(entry.number));
    return String(Math.max(0, ...before) + 1);
}

/**
 * Adds a box to the plan it belongs into, see `calendarFileOf` in `documents.ts`,
 * a skill box with its chapters and documents,
 * a numbered one with its number, see {@link numberNextOf},
 * nothing is written while it is not right.
 *
 * @returns Identifier of the new box
 * @throws {Error} - When the box is not right, see {@link boxCheck},
 *   the link typed online is no web address, or a document is none of the module's
 */
export function boxAdd(box: BoxNew): string {
    boxCheck(box, null);
    const file: string = calendarFileOf(box, box.day, planEnding);
    const fields: TodoFields = todoFieldsOf(box, null);
    const links: [string, (string | Link)[]][] = boxLinksOf(box, null);
    const id: string = todoAppend(file, fields);
    if (links.length > 0) propertiesPut(file, id, links);
    if (box.category === skillName && numberedTypes.includes(box.type))
        propertiesPut(file, id, [["x-number", [numberNextOf(box.module, box.type, box.day)]]]);
    return id;
}

/**
 * Adds boxes that differ only in their days and times, like a box repeated weekly,
 * see `repeatApply` in `course.ts`, each as {@link boxAdd} adds one,
 * or only checks them, for the preview of the dialog.
 * The first is checked before any is written,
 * since the others share all of it, their days and times checked by their rule,
 * so boxes the reader does not take write nothing.
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
 * Marks a box the university cancelled, like a lecture that does not take place,
 * or takes that back, with one tap:
 * cancelled, its number becomes `NONE`,
 * and every later box of its series with a number moves up one, once, here.
 * Taken back, it gets the number after the last one before it,
 * or the first number after it, or `1`, and every later one moves down one again,
 * so the numbers are as before, and one of a day over stays on its day.
 * Boxes I cancelled myself keep their numbers.
 * A box of my tutorials that goes to a group, numbered by its week,
 * see `numbersRenew` in `course.ts`, moves no other box:
 * taken back, it gets `1` here and its week's number there,
 * as the reader asks next, see `reader.ts`.
 *
 * @throws {Error} - When there is no such box in the new system,
 *   it is not open, or, taken back, not cancelled by the university,
 *   or it is of no numbered type, like an exam, whose `X-NUMBER` is its kind
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
    if (!cancelled) overKeep(id);
    if (entry.group !== "") return;
    after.forEach((other: Entry): void => {
        const [otherFile, otherEntry]: [string, Entry] = planEntryFind(entryIdOf(other));
        boxOwn(otherFile, otherEntry);
        propertiesPut(otherFile, entryIdOf(other), [["x-number", [String(Number(other.number) + step)]]]);
    });
}

/**
 * Changes a box of the new system, one occurrence of a series alone, its summary too,
 * the whole series changing only in the dialog of the series, see `rules.ts`.
 * A box moves into the plan it belongs into now, see {@link planFileAfter}.
 * An event, like a lecture imported from TUMonline, keeps a time and a duration.
 * An open box without deadline whose day moves, later or earlier, is pushed,
 * like with its arrow, see {@link boxPush}.
 * A box carried along has the pushes it stands for written first, see {@link carryWrite},
 * and one moved to a day that is over stays there, no longer carried along.
 * All of it is checked before anything is written,
 * so a change the reader does not take changes nothing.
 * The log entry written from it takes a new summary with it, see {@link logRename}.
 * - `old`: Its entry as its file holds it,
 *   before the pushes of a box carried along are written.
 *
 * @throws {Error} - When there is no such box in the new system, the box is not right,
 *   the link typed online is no web address,
 *   an event would lose its time or its duration,
 *   or a document is none of the module's
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
    if (change.title !== old.title && box.category !== skillName) logRename(change.id, box, change.title);
}

/**
 * Renames the log entry written from a box once the box is renamed,
 * so both keep one summary,
 * but a meal, whose foods write its summary, and one of the old system.
 */
function logRename(id: string, box: Box, title: string): void {
    if (box.log === null) return;
    const logged: Entry | undefined = entriesRead(
        day.log,
        box.log.start,
        new Date(Date.parse(box.log.end) + 1).toISOString(),
    ).find((entry: Entry): boolean => entry.planned === id);
    if (logged === undefined || logged.foods.length > 0 || !logged.editable) return;
    const found: [string, Entry] | undefined = entryLookup(day.log, logged.id);
    if (found !== undefined) titlePut(found[0], logged.id, { ...logged, title: title });
}

/**
 * Removes a box of the new system that is not done, like one planned by mistake;
 * a box I decided against is dropped instead, see {@link boxDrop}, so it can be counted.
 * A done box stays, since its log entry points to it.
 * One day of a series goes alone, see `seriesDayRemove` in `calendar.ts`.
 *
 * @throws {Error} - When there is no such box in the new system, or it is done
 */
export function boxDelete(id: string): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(id);
    if (!entry.editable || box.state === "done") throw new Error(`${entry.title} may not be removed`);
    if (entry.recurrence !== "") seriesDayRemove(file, entry.id, entry.recurrence);
    else entryRemove(file, id);
}

/**
 * Gives an entry as it would stand days later, its time of day and its length kept,
 * see `berlinLater` in `calendar.ts`, a whole-day entry by whole days.
 */
function entryLater(entry: Entry, days: number): Entry {
    const laterOf: (instant: string) => string = (instant: string): string =>
        entry.allDay ? dayAdd(instant, days) : berlinLater(new Date(instant), days).toISOString();
    return { ...entry, start: laterOf(entry.start), end: laterOf(entry.end) };
}

/**
 * Moves a box of the new system by days, its time of day and its length kept,
 * into the plan of the next year when it moves into it, see {@link planFileAfter}.
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
 * Writes the pushes a box carried along stands for into its file before it changes,
 * see {@link carriedOf}, and moves it to the day it is carried to,
 * so its file holds what I would have written pushing it by hand each day;
 * one occurrence of a series alone. Any other box stays as it is.
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
 * Pushes an open box of the new system with one tap, by its arrow,
 * also one carried along, which gets the pushes it stands for first,
 * see {@link carryWrite}: to the next day, or, when its day is over, to tomorrow,
 * so it does not land on a day over too.
 * Notes where it leaves in one more `X-PUSHED`, then moves it, see {@link boxShift}.
 * A box with a deadline stays, since its day is the day of its deadline.
 *
 * @throws {Error} - When there is no such box in the new system,
 *   it is not open, or it has a deadline
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
 * Drops a box of the new system that is not done, with one tap, or takes it back:
 * a dropped box stays in its file as `STATUS:CANCELLED`, so it can be counted;
 * taken back, a to-do is `NEEDS-ACTION` again,
 * an event without status, as it was imported.
 * A box carried along has the pushes it stands for written first, see {@link carryWrite},
 * so it is dropped where it stands, like a box pushed by hand;
 * taken back, one of a day over stays on its day, see {@link overKeep}.
 *
 * @throws {Error} - When there is no such box in the new system, or it is done
 */
export function boxDrop(id: string, dropped: boolean): void {
    const found: [string, Entry, Box] = boxFind(id);
    if (!found[1].editable || found[2].state === "done") throw new Error(`${found[1].title} cannot be dropped`);
    const [file, entry]: [string, Entry, Box] = carryWrite(found);
    let status: string = "";
    if (dropped) status = "CANCELLED";
    else if (entry.todo) status = "NEEDS-ACTION";
    boxOwn(file, entry);
    statusPut(file, id, status);
    if (!dropped) {
        boxTidy(file, entry);
        overKeep(id);
    }
}

/**
 * Marks a box done once a log entry pointing to it is written:
 * a to-do that happens once becomes `COMPLETED`;
 * an event, which has no such status,
 * and an occurrence of a series are done by the log entry alone;
 * one with a deadline stays open,
 * since that log entry is one of its sessions, see {@link boxSubmit}.
 *
 * @throws {Error} - When the plan holds no such box
 */
export function boxDone(id: string): void {
    const [file, entry]: [string, Entry] = planEntryFind(id);
    if (entry.todo && entry.editable && entry.recurrence === "" && entry.deadline === "")
        statusPut(file, id, "COMPLETED");
}

/**
 * Ticks a box with a deadline submitted, like a homework sheet I handed in,
 * or takes the tick back: it becomes `COMPLETED`,
 * or `NEEDS-ACTION` again, its sessions staying in the log.
 *
 * @throws {Error} - When there is no such box in the new system, it has no deadline,
 *   or it is not open, or not done for taking the tick back
 */
export function boxSubmit(id: string, submitted: boolean): void {
    const [file, entry, box]: [string, Entry, Box] = boxFind(id);
    if (!entry.editable || box.deadline === "" || box.state !== (submitted ? "open" : "done"))
        throw new Error(`${entry.title} cannot be ${submitted ? "ticked submitted" : "taken back"}`);
    statusPut(file, id, submitted ? "COMPLETED" : "NEEDS-ACTION");
}

/**
 * Finds a box of the plan, also an occurrence of a series, `undefined` when it is gone.
 */
function boxLookup(id: string): [string, Entry] | undefined {
    const at: number = id.lastIndexOf("#");
    return (
        entryLookup(day.plan, id) ??
        (at === -1 ? undefined : occurrenceLookup(day.plan, id.slice(0, at), id.slice(at + 1)))
    );
}

/**
 * Renames a box once the log entry written from it is renamed, so both keep one summary.
 * A box no longer in the plan or of the old system stays as it is.
 */
export function boxRename(id: string, title: string): void {
    const found: [string, Entry] | undefined = boxLookup(id);
    if (found === undefined || !found[1].editable) return;
    const [file, entry]: [string, Entry] = found;
    boxOwn(file, entry);
    titlePut(file, id, { ...entry, title: title });
    boxTidy(file, entry);
}

/**
 * Opens a box again once the log entry written from it is removed:
 * a done to-do of the new system becomes `NEEDS-ACTION`;
 * an occurrence of a series is open again by itself,
 * and one with a deadline stays as it is, since only my tick decides it.
 * One of a day over stays on its day, see {@link overKeep}.
 */
export function boxReopen(id: string): void {
    const found: [string, Entry] | undefined = boxLookup(id);
    if (found === undefined || found[1].deadline !== "") return;
    if (found[1].todo && found[1].editable && found[1].status === "COMPLETED") statusPut(found[0], id, "NEEDS-ACTION");
    overKeep(id);
}

/**
 * Tells whether a box is an open skill box of a module I log from my learning:
 * of the new system, neither with a deadline, like a homework sheet,
 * which I log myself, nor one occurrence of a series, like a weekly lecture.
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
 * Finds the open study box of a module for a day, one without time,
 * like the box of a chapter the plan of today holds, also one carried along to it,
 * the first as the day orders them,
 * a box with chapters only for learning in one of them.
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

/**
 * Finds the open skill box of a module for a moment,
 * which the attempts of that moment log, see `skill.ts`:
 * one whose expected time and duration hold the moment,
 * like a tutorial, else a study box, see {@link studyBoxOf}.
 */
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
