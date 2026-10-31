/**
 * ## Calendars
 *
 * Reads `.ics` files into entries, their events, `VEVENT`,
 * and their to-dos, `VTODO`, the boxes of the plan, see `boxes.ts`;
 * appends, changes, removes and moves entries, renames a place in all of them,
 * and reads and writes a series whole.
 * Keeps each read file until it changes on disk.
 * Every entry states its facts in its own lines, for every field, now and later:
 * a link, the `ALTREP` of a `SUMMARY` or a `LOCATION` or an `ATTACH`,
 * only points to more and is never the only place of a fact,
 * since a folder may be renamed or vanish.
 * A module folder renamed is found again by its code,
 * see `folderRepair` in `documents.ts`.
 * Writes only into the three folders of the new system, with times in Berlin time,
 * those of the two hours around a change of the clocks in UTC, see {@link writtenOf},
 * every date, time and duration in the form of the iCalendar format,
 * also in a property or a parameter of my own.
 * Puts the lines of every entry it writes into one fixed order, see {@link lineOrder},
 * folds each line over 90 characters,
 * and leaves every other line as it is, byte for byte,
 * but for the order of the entries of a file, see {@link componentsSorted}.
 */

import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import ICAL from "ical.js";
import { mailOf } from "./persons.ts";
import { labelOf, linkForm, platformOfLink } from "./places.ts";
import { calendarRoot, modulesRoot, vaultPathOf, writeAllowed } from "./sources.ts";

import type { CalendarSource } from "./sources.ts";

/**
 * One calendar entry, as the page shows it.
 *
 * - `id`: Its `UID`, shared by all occurrences of a series.
 * - `category`: Its `CATEGORIES`.
 * - `title`: Its `SUMMARY`, for a skill entry the folder of its skill
 *   with its type in round brackets, see `skillTitleOf` in `documents.ts`.
 * - `titleLink`: The `ALTREP` of its `SUMMARY`,
 *   for a skill entry the folder of its skill,
 *   see `skillLinkOf` in `documents.ts`.
 *   One of a platform of `Online.md` reads as its {@link Online}.
 * - `location`: Its `LOCATION`, where I physically was.
 *   An older place online reads as its {@link Online}.
 * - `locationLink`: The `ALTREP` of its `LOCATION`.
 * - `from`: Where a way starts, its `X-FROM`.
 * - `module`, `type`: Skill and type of a skill entry from its `SUMMARY`,
 *   see {@link skillPartsOf}.
 * - `semester`: Its `X-SEMESTER`, from which semester the lecture or the material is,
 *   not when I did it, see `semesterOf` in `categories.ts`.
 * - `chapters`: Its `X-CHAPTER`s, only in an older skill entry of the log,
 *   a skill entry now links the folders of its chapters.
 * - `links`: Its `ATTACH`es, see {@link Link}.
 * - `rounds`: Its `X-ROUND`s, see {@link RoundMark}.
 * - `foods`: Its `X-FOOD`s, each a food of `Foods.md` by name,
 *   brand and store with grams,
 *   an older one by its name alone.
 * - `cooked`: For a meal drawn from a cooking, the identifier of that entry,
 *   its `X-COOKED`.
 * - `pain`: My neck pain from 0 to 10 after a long neck session, its `X-PAIN`.
 * - `workout`: Its `X-WORKOUT`, see `sport.ts`.
 * - `exercises`, `videos`: Its `X-EXERCISE`s and `X-VIDEO`s, see {@link sportLineOf}.
 * - `planned`: Identifier of the box a log entry was logged from, see {@link plannedOf}.
 * - `note`: Its `DESCRIPTION`.
 * - `todo`: Whether it is a `VTODO`, a box of the plan, else a `VEVENT`.
 * - `minutes`: Its `ESTIMATED-DURATION`, `null` for an event,
 *   whose length lies between its start and its end.
 * - `deadline`: Its `DUE`.
 * - `pushed`: Its `X-PUSHED`s, see {@link Push}.
 * - `number`: Its `X-NUMBER` in its series, `NONE` for one the university cancelled,
 *   see `boxUniversity` in `boxes.ts`.
 * - `group`: Its `X-GROUP` as TUMonline names it, see `course.ts`.
 * - `pinned`: Whether a group of the course is the one I pinned,
 *   see `pinPut` in `course.ts`.
 * - `written`: When the entry got its day, its `DTSTAMP`,
 *   set anew whenever its `DTSTART` or its `DUE` changes, see {@link componentWrite},
 *   or a box of a day over is taken back to open, see {@link stampPut},
 *   so a box is carried along only while it lies on its day or before,
 *   see `carriedOf` in `boxes.ts`.
 * - `version`: SHA-256 of its lines as read, for an occurrence that of its series.
 *   The dialog sends it back, so the reader writes nothing older than the file,
 *   see `entryEdit` in `day.ts`.
 * - `editable`: Whether the dashboard may change the entry:
 *   it lies in the new system and has times or is a to-do,
 *   also one occurrence of a series,
 *   see {@link occurrenceOwn}. FullCalendar lets only these events be dragged.
 * - `start`: ISO instant, or a date when all-day.
 *   A to-do with a deadline but no `DTSTART` starts on the day of its deadline,
 *   a whole day.
 * - `end`: End, excluded, in the same form as `start`.
 *   A to-do with a time ends where it starts, since how long it takes is its `minutes`.
 * - `recurrence`: For an occurrence of a series its start as the series has it,
 *   for a changed occurrence its `RECURRENCE-ID`.
 * - `file`: Its `.ics` file from `NomWorkspace` on, which its dialog shows.
 */
export type Entry = {
    id: string;
    category: string;
    title: string;
    titleLink: string;
    location: string;
    locationLink: string;
    online: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
    from: string;
    attendees: Attendee[];
    module: string;
    type: string;
    semester: string;
    chapters: string[];
    links: Link[];
    rounds: RoundMark[];
    foods: string[];
    cooked: string;
    pain: string;
    workout: string;
    exercises: string[];
    videos: string[];
    planned: string;
    note: string;
    todo: boolean;
    status: string;
    minutes: number | null;
    deadline: string;
    pushed: Push[];
    number: string;
    group: string;
    pinned: boolean;
    written: string;
    version: string;
    editable: boolean;
    start: string;
    end: string;
    allDay: boolean;
    recurrence: string;
    file: string;
};

/**
 * What an entry or a box did online, apart from where I physically was:
 * one `X-ONLINE`, its platform a row of `Online.md` as value,
 * see `Platform` in `places.ts`, the link of its own meeting or video as `ALTREP`,
 * its channel as `X-CHANNEL` and its title as `X-TITLE`, each left out while empty.
 * An older entry wrote it as its place or the `ALTREP` of its `SUMMARY`,
 * which reads so, see {@link onlineOf}.
 */
export type Online = {
    online: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
};

/**
 * A person or a group I was with, one `ATTENDEE`,
 * its name as `CN` and its address as value.
 * The address ends in `.invalid`, reserved for addresses that never work,
 * unless I typed a real one or `Persons.md` has the mail of the person,
 * so the line keeps to the standard and nothing is ever sent.
 */
export type Attendee = {
    name: string;
    address: string;
};

/**
 * Where a box stood before one push to a later day, one `X-PUSHED`, see {@link pushOf}.
 *
 * - `time`: For a push that noted only its day, that day at the time the box has now.
 * - `minutes`: Its parameter `X-ESTIMATED-DURATION`, `null` where the push noted none.
 */
export type Push = {
    day: string;
    time: string;
    minutes: number | null;
};

/**
 * A link of an entry to a file or a folder, one `ATTACH`:
 * its value a path from `NomWorkspace`, never absolute,
 * since `NomWorkspace` lies elsewhere on each computer,
 * and for a file the SHA-256 of its content as `X-SHA256`,
 * so the link survives a rename, see `documents.ts`.
 * The value is no full URI, so other calendar apps may ignore it.
 */
export type Link = {
    path: string;
    fingerprint: string;
};

/**
 * A line `X-ROUND` of a skill entry: where I stand in the round of a section
 * and what I did in it in this entry, its section as value, the rest as parameters,
 * an empty one left out, see `RoundLine` in `skill.ts`.
 *
 * - `section`: Name of its note,
 *   with its module before `/` once the entry's skill changed.
 * - `step`: Heading of the step I stand at, `done` once closed, empty before the first.
 * - `task`: Heading of the cold Task I solved in it.
 * - `used`: Heading of the Example I checked off in it with `Next`.
 * - `notes`: My comment on each wrong one.
 * - `due`: Day the next round comes, written once the Task decided the round.
 */
export type RoundMark = {
    section: string;
    round: number;
    step: string;
    task: string;
    used: string;
    results: string[];
    notes: string[];
    due: string;
};

/**
 * Text fields of an event or a to-do to write, see {@link Entry}.
 * An empty field is not written, nor a link or an {@link Online} without its value.
 * `module` and `type` are not written, since the `ALTREP` of its `SUMMARY` names them.
 */
export type EntryTexts = Online & {
    category: string;
    title: string;
    titleLink: string;
    location: string;
    locationLink: string;
    from: string;
    attendees: Attendee[];
    module: string;
    type: string;
    semester: string;
    note: string;
};

/** Fields and times of an event to write. */
export type EntryFields = EntryTexts & {
    start: Date;
    end: Date;
};

/**
 * Fields of a to-do to write, a box of the plan.
 *
 * - `day`: Its `DTSTART;VALUE=DATE` when it has no time,
 *   with a deadline the day of its deadline and no `DTSTART`, see {@link todoAppend}.
 * - `time`: Its `DTSTART` in Berlin time, `null` for none and with a deadline.
 */
export type TodoFields = EntryTexts & {
    day: string;
    time: Date | null;
    minutes: number | null;
    deadline: string;
};

/** A read `.ics` file, its series knowing their replaced occurrences. */
type Calendar = {
    modified: number;
    entries: Entry[];
    series: ICAL.Event[];
};

/** Range of time in both forms of {@link Entry}, so entries compare as plain text. */
type Range = {
    days: [string, string];
    instants: [string, string];
};

/**
 * Text of an `.ics` file as lines, a folded line joined to the line before.
 * `newline` is `\r\n` as the reader writes new files, or `\n`.
 */
type FileLines = {
    lines: string[];
    newline: string;
};

/** Read {@link Calendar}s by their file path. */
const calendars: Map<string, Calendar> = new Map();

/**
 * What runs each time a plan or a log of a module is written, see {@link writtenFollow}.
 */
const writtenFollowers: ((module: string, kinds: [string, string][]) => void)[] = [];

/** Time zone of the times the dashboard writes, while I live in Germany. */
const zoneName: string = "Europe/Berlin";

/**
 * Definition of {@link zoneName} as the iCalendar format writes it into each new file.
 */
const zoneComponent: ICAL.Component = new ICAL.Component(
    ICAL.parse(
        [
            "BEGIN:VTIMEZONE",
            `TZID:${zoneName}`,
            "BEGIN:DAYLIGHT",
            "TZOFFSETFROM:+0100",
            "TZOFFSETTO:+0200",
            "TZNAME:CEST",
            "DTSTART:19700329T020000",
            "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
            "END:DAYLIGHT",
            "BEGIN:STANDARD",
            "TZOFFSETFROM:+0200",
            "TZOFFSETTO:+0100",
            "TZNAME:CET",
            "DTSTART:19701025T030000",
            "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
            "END:STANDARD",
            "END:VTIMEZONE",
        ].join("\r\n"),
    ),
);

/** Time zone {@link zoneName}, to turn instants into Berlin time. */
const zone: ICAL.Timezone = new ICAL.Timezone(zoneComponent);

/**
 * The one order of the lines of every event and to-do in every file of mine,
 * by the names of their properties,
 * so I find each line where I expect it when I read a file by hand.
 * The reader writes every entry, new or changed, in it, see {@link linesOrdered}.
 * Every other line comes after them, in the order it had,
 * and the lines of a property that repeats stay together in the order they had.
 */
const lineOrder: string[] = [
    "UID",
    "DTSTAMP",
    "DTSTART",
    "DTEND",
    "DUE",
    "DURATION",
    "ESTIMATED-DURATION",
    "RRULE",
    "RDATE",
    "EXDATE",
    "RECURRENCE-ID",
    "CATEGORIES",
    "SUMMARY",
    "STATUS",
    "LOCATION",
    "X-FROM",
    "X-ONLINE",
    "ATTENDEE",
    "DESCRIPTION",
    "ATTACH",
    "RELATED-TO",
    "X-PLANNED",
    "X-PUSHED",
    "X-SERIES",
    "X-NUMBER",
    "X-GROUP",
    "X-FOOD",
    "X-COOKED",
    "X-WORKOUT",
    "X-EXERCISE",
    "X-VIDEO",
    "X-PAIN",
    "X-SEMESTER",
    "X-CHAPTER",
    "X-ROUND",
];

/**
 * The parameter `ALTREP` in double quotes, as the standard writes a link there,
 * also one without `:`.
 * `ical.js` quotes on its own only a value with `,`, `:` or `;`,
 * and every value of a parameter of several values that asks for it,
 * so `ALTREP` is described as one, of one value here.
 */
ICAL.design.icalendar.param.altrep = { multiValue: ",", multiValueSeparateDQuote: true };

/**
 * The parameters `RESULT` and `NOTE` of an `X-ROUND`, lists of several values,
 * each note in double quotes, a `"` in one written `^'` and a line break `^n` (RFC 6868).
 */
ICAL.design.icalendar.param.result = { multiValue: "," };
ICAL.design.icalendar.param.note = { multiValue: ",", multiValueSeparateDQuote: true };

/**
 * Every `X-` property of my own the reader writes or reads, as text of the standard:
 * written with each `\`, `;` and `,` escaped by a `\` and a line break as `\n`.
 * `ical.js` wrote every `X-` value raw,
 * so a strict reader of the standard split them at each `;` and `,`,
 * and a line break in one broke the file, which then could not be read at all.
 * `X-PUSHED` names its own type, `VALUE=DATE-TIME`, see `pushAdd`.
 */
const ownTexts: string[] = [
    "x-from",
    "x-semester",
    "x-chapter",
    "x-round",
    "x-food",
    "x-cooked",
    "x-pain",
    "x-workout",
    "x-exercise",
    "x-video",
    "x-number",
    "x-group",
    "x-planned",
    "x-online",
    "x-series",
];
ownTexts.forEach((name: string): void => {
    ICAL.design.icalendar.property[name] = { defaultType: "text" };
});

/** Most characters of a line of an `.ics` file, its line break not counted. */
const lineMost: number = 90;

/**
 * Folds a line of an `.ics` file as the format folds one, into parts of at most
 * {@link lineMost} characters, each after the first starting with the space of the fold:
 * right after a space of the text where one fits, so a place stays whole,
 * that space ending its line, since the space of the fold never counts as text;
 * else after the last character that fits, like inside a long link.
 */
function foldedOf(line: string): string[] {
    const folded: string[] = [];
    let rest: string[] = [...line];
    while (rest.length > lineMost) {
        const space: number = rest.lastIndexOf(" ", lineMost - 1);
        const end: number = space > 0 ? space + 1 : lineMost;
        folded.push(rest.slice(0, end).join(""));
        rest = [" ", ...rest.slice(end)];
    }
    return [...folded, rest.join("")];
}

/**
 * Gives the lines of a component, one line per property, unfolded:
 * `ical.js` folds a line after 75 bytes, which the standard only recommends, for e-mail,
 * and which cut a place in two, so each fold is taken back
 * and folded anew as it is written, see {@link foldedOf}.
 */
function linesOf(component: ICAL.Component): string[] {
    return component
        .toString()
        .replace(/\r\n[ \t]/g, "")
        .split("\r\n");
}

/**
 * Category of skill entries, whose `ALTREP` of the `SUMMARY` names their skill and type.
 */
export const skillName: string = "Skill";

/**
 * Reads the skill and the type of a skill entry from its `SUMMARY`,
 * as `skillTitleOf` in `documents.ts` writes it,
 * a module named by its code, the part before the first `_`,
 * a project by its name, without type, like my own learning.
 */
function skillPartsOf(summary: string): [string, string] {
    const parts: RegExpExecArray | null = /^(.*?)\s*(?:\(([A-Z]{2})\))?$/.exec(
        summary.trim(),
    );
    const name: string = parts?.[1] ?? "";
    return [/^[A-Z]+\d+_/.test(name) ? name.split("_")[0] : name, parts?.[2] ?? ""];
}

/** Turns an `ical.js` time into the form of {@link Entry}. */
function textOf(time: ICAL.Time): string {
    return time.isDate ? time.toString() : time.toJSDate().toISOString();
}

/**
 * Reads a date or a time in the form of the iCalendar format,
 * as a parameter of my own holds it.
 */
function icsTimeRead(value: string): ICAL.Time {
    return /^\d{8}$/.test(value)
        ? ICAL.Time.fromDateString(ICAL.design.icalendar.value.date.fromICAL(value))
        : ICAL.Time.fromDateTimeString(
              ICAL.design.icalendar.value["date-time"].fromICAL(value),
          );
}

/**
 * Writes a date or an instant of the form of {@link Entry}
 * in the form of the iCalendar format, an instant in UTC,
 * as a parameter of my own holds it and the end of a weekly series its `RRULE`.
 */
export function icsTextOf(text: string): string {
    const time: ICAL.Time = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? ICAL.Time.fromDateString(text)
        : ICAL.Time.fromJSDate(new Date(text), true);
    return time.toICALString();
}

/**
 * Writes a line of a session of sport,
 * an `X-EXERCISE` or an `X-VIDEO` as `sport.ts` gives it,
 * with its time as a duration of the iCalendar format, as `ESTIMATED-DURATION` holds one:
 * the seconds of an exercise on time and the minutes of a video.
 * The repetitions of an exercise and a part left empty stay as they are.
 * {@link sportLineOf} reads it back.
 */
export function sportIcsOf(line: string, video: boolean): string {
    const parts: string[] = line.split(";");
    const time: string = (parts[2] ?? "").trim();
    const seconds: number | null = video
        ? /^\d+(?:[.,]\d+)?$/.test(time)
            ? Math.round(Number(time.replace(",", ".")) * 60)
            : null
        : /^\d+\s*s$/.test(time)
          ? parseInt(time, 10)
          : null;
    if (seconds === null) return line;
    parts[2] = ICAL.Duration.fromSeconds(seconds).toString();
    return parts.join(";");
}

/**
 * Reads a line of a session of sport as {@link sportIcsOf} writes it,
 * back in the form of `sport.ts`.
 * A line written before, and a time no duration can be read of, stay as they are.
 */
function sportLineOf(line: string, video: boolean): string {
    const parts: string[] = line.split(";");
    if (!/^P/i.test((parts[2] ?? "").trim())) return line;
    try {
        const seconds: number = ICAL.Duration.fromString(parts[2].trim()).toSeconds();
        parts[2] = video ? String(seconds / 60) : `${seconds}s`;
    } catch {
        return line;
    }
    return parts.join(";");
}

/**
 * Reads the identifier of the box a log entry was logged from:
 * the `UID` of its `RELATED-TO`,
 * and for one date of a series that date, its parameter `X-RECURRENCE-ID`, after `#`,
 * as {@link entryIdOf} writes it; else, for an older entry, its `X-PLANNED`.
 * Only a `RELATED-TO` without `RELTYPE`, the standard parent, names that box;
 * one with `RELTYPE=SIBLING` is the series a series of the plan goes on from,
 * see {@link seriesPut}, and names none.
 */
function plannedOf(component: ICAL.Component): string {
    const related: ICAL.Property | undefined = component
        .getAllProperties("related-to")
        .find((property: ICAL.Property): boolean =>
            ["", "PARENT"].includes(
                String(property.getParameter("reltype") ?? "").toUpperCase(),
            ),
        );
    if (related === undefined)
        return String(component.getFirstPropertyValue("x-planned") ?? "");
    const recurrence: string = String(related.getParameter("x-recurrence-id") ?? "");
    return recurrence === ""
        ? String(related.getFirstValue())
        : `${related.getFirstValue()}#${textOf(icsTimeRead(recurrence))}`;
}

/**
 * Reads the day of one `X-PUSHED`, see {@link pushAdd}:
 * of its start in Berlin time, of its date, or of an older box written as a day.
 */
function pushedDayOf(value: unknown): string {
    if (value instanceof ICAL.Time) return value.toString().slice(0, 10);
    return /^\d{8}$/.test(String(value))
        ? icsTimeRead(String(value)).toString()
        : String(value);
}

/**
 * Reads one `X-PUSHED` of a box into a {@link Push}.
 * A push that noted only its day stands at the time of day the box has now,
 * without time for a box without.
 */
function pushOf(property: ICAL.Property, now: ICAL.Time | null): Push {
    const value: unknown = property.getFirstValue();
    const day: string = pushedDayOf(value);
    const duration: string = String(property.getParameter("x-estimated-duration") ?? "");
    const [year, month, date]: number[] = day.split("-").map(Number);
    const time: ICAL.Time | null =
        value instanceof ICAL.Time && !value.isDate ? value : now;
    return {
        day: day,
        time:
            time === null
                ? ""
                : ICAL.Time.fromData(
                      {
                          year: year,
                          month: month,
                          day: date,
                          hour: time.hour,
                          minute: time.minute,
                          second: time.second,
                      },
                      zone,
                  )
                      .toJSDate()
                      .toISOString(),
        minutes:
            duration === "" ? null : ICAL.Duration.fromString(duration).toSeconds() / 60,
    };
}

/**
 * Reads the expected duration of a to-do, its `ESTIMATED-DURATION`, in minutes:
 * the property of the task extensions of iCalendar, which `ical.js` does not know yet,
 * so it gives its value as text.
 */
function estimatedMinutesOf(component: ICAL.Component): number | null {
    const value: unknown = component.getFirstPropertyValue("estimated-duration");
    return value === null
        ? null
        : ICAL.Duration.fromString(String(value)).toSeconds() / 60;
}

/** Reads the deadline of a to-do, its `DUE`, in the form of {@link Entry}. */
function deadlineOf(component: ICAL.Component): string {
    const due: unknown = component.getFirstPropertyValue("due");
    return due instanceof ICAL.Time ? textOf(due) : "";
}

/**
 * Gives the day of a to-do with a deadline but no `DTSTART`,
 * the day of its deadline in Berlin time, as the start and the end of a whole day.
 */
function deadlineDayOf(component: ICAL.Component): [ICAL.Time, ICAL.Time] {
    const due: ICAL.Time = component.getFirstPropertyValue("due") as ICAL.Time;
    const day: string = due.isDate ? due.toString() : berlinDateOf(due.toJSDate());
    return [ICAL.Time.fromDateString(day), ICAL.Time.fromDateString(dayAdd(day, 1))];
}

/** Where an entry was and what it did online, with the link of its summary. */
type Placed = Online & Pick<Entry, "titleLink" | "location" | "locationLink">;

/**
 * Reads where an event or a to-do was, its place with its link, what it did online,
 * and the link of its summary, from its `X-ONLINE` and its `LOCATION`.
 * What an older entry wrote reads too:
 * a place `Online, <platform>`, `Online` alone for none named,
 * or a place named after its platform with `Online` among its parts,
 * the link of the place as that of its meeting, its place then empty;
 * and as the `ALTREP` of its `SUMMARY` a link of a platform of `Online.md`,
 * read as its link online, its summary then without link.
 * Its own `X-ONLINE` wins over both.
 */
function onlineOf(component: ICAL.Component): Placed {
    const summaryLink: string = String(
        component.getFirstProperty("summary")?.getParameter("altrep") ?? "",
    );
    const line: string = String(component.getFirstPropertyValue("location") ?? "");
    const lineLink: string = String(
        component.getFirstProperty("location")?.getParameter("altrep") ?? "",
    );
    const own: ICAL.Property | null = component.getFirstProperty("x-online");
    const parts: string[] = line.split(",").map((part: string): string => part.trim());
    const placed: boolean =
        parts
            .slice(1)
            .some(
                (part: string): boolean => part === "Online" || part.endsWith(" Online"),
            ) || parts[0] === "Online";
    const linked: boolean =
        linkForm.test(summaryLink) && platformOfLink(summaryLink) !== undefined;
    const online: Online =
        own !== null
            ? {
                  online: String(own.getFirstValue() ?? ""),
                  onlineLink: String(own.getParameter("altrep") ?? ""),
                  onlineChannel: String(own.getParameter("x-channel") ?? ""),
                  onlineTitle: String(own.getParameter("x-title") ?? ""),
              }
            : placed
              ? {
                    online:
                        parts[0] === "Online" ? (parts[1] ?? "Online") : labelOf(line),
                    onlineLink: lineLink,
                    onlineChannel: "",
                    onlineTitle: "",
                }
              : linked
                ? {
                      online: platformOfLink(summaryLink)?.name ?? "",
                      onlineLink: summaryLink,
                      onlineChannel: "",
                      onlineTitle: "",
                  }
                : { online: "", onlineLink: "", onlineChannel: "", onlineTitle: "" };
    return {
        ...online,
        titleLink: linked ? "" : summaryLink,
        location: placed ? "" : line,
        locationLink: placed ? "" : lineLink,
    };
}

/**
 * Turns an event or a to-do with a start and an end into an {@link Entry}.
 * `ical.js` reads a to-do as it reads an event:
 * its start from `DTSTART`, its end the end of its day,
 * or its start when it has a time.
 *
 * @param event - Event with title and place, or the series of an occurrence, or a to-do
 */
function entryOf(
    event: ICAL.Event,
    start: ICAL.Time,
    end: ICAL.Time,
    file: string,
): Entry {
    const todo: boolean = event.component.name === "vtodo";
    const category: string = String(
        event.component.getFirstPropertyValue("categories") ?? "",
    );
    const online: Placed = onlineOf(event.component);
    const [module, type]: [string, string] =
        category === skillName ? skillPartsOf(event.summary ?? "") : ["", ""];
    const stamp: unknown = event.component.getFirstPropertyValue("dtstamp");
    let recurrence: string = "";
    if (event.isRecurrenceException()) recurrence = textOf(event.recurrenceId);
    else if (event.isRecurring()) recurrence = textOf(start);
    return {
        id: event.uid,
        category: category,
        title: event.summary ?? "",
        ...online,
        from: String(event.component.getFirstPropertyValue("x-from") ?? ""),
        attendees: event.component
            .getAllProperties("attendee")
            .map((property: ICAL.Property): Attendee => {
                const address: string = String(property.getFirstValue()).replace(
                    /^mailto:/i,
                    "",
                );
                return {
                    name: String(property.getParameter("cn") ?? address),
                    address: address,
                };
            }),
        module: module,
        type: type,
        semester: String(event.component.getFirstPropertyValue("x-semester") ?? ""),
        chapters: event.component
            .getAllProperties("x-chapter")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        links: event.component
            .getAllProperties("attach")
            .map((property: ICAL.Property): Link => ({
                path: String(property.getFirstValue()),
                fingerprint: String(property.getParameter("x-sha256") ?? ""),
            })),
        rounds: event.component.getAllProperties("x-round").map(roundMarkOf),
        foods: event.component
            .getAllProperties("x-food")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        cooked: String(event.component.getFirstPropertyValue("x-cooked") ?? ""),
        pain: String(event.component.getFirstPropertyValue("x-pain") ?? ""),
        workout: String(event.component.getFirstPropertyValue("x-workout") ?? ""),
        exercises: event.component
            .getAllProperties("x-exercise")
            .map((property: ICAL.Property): string =>
                sportLineOf(String(property.getFirstValue()), false),
            ),
        videos: event.component
            .getAllProperties("x-video")
            .map((property: ICAL.Property): string =>
                sportLineOf(String(property.getFirstValue()), true),
            ),
        planned: plannedOf(event.component),
        note: event.description ?? "",
        todo: todo,
        status: String(event.component.getFirstPropertyValue("status") ?? ""),
        minutes: todo ? estimatedMinutesOf(event.component) : null,
        deadline: todo ? deadlineOf(event.component) : "",
        pushed: event.component
            .getAllProperties("x-pushed")
            .map((property: ICAL.Property): Push =>
                pushOf(property, start.isDate ? null : berlinOf(start.toJSDate())),
            ),
        number: String(event.component.getFirstPropertyValue("x-number") ?? ""),
        group: String(event.component.getFirstPropertyValue("x-group") ?? ""),
        pinned:
            String(
                event.component.getFirstProperty("x-group")?.getParameter("x-pinned") ??
                    "",
            ).toUpperCase() === "TRUE",
        written: stamp instanceof ICAL.Time ? stamp.toJSDate().toISOString() : "",
        version: createHash("sha256").update(event.component.toString()).digest("hex"),
        editable: writeAllowed(file) && (todo || !start.isDate),
        start: textOf(start),
        end: textOf(end),
        allDay: start.isDate,
        recurrence: recurrence,
        file: vaultPathOf(file),
    };
}

/**
 * Reads an `.ics` file into a {@link Calendar}, its events and its to-dos.
 * A to-do without `DTSTART` lies on the day of its deadline, see {@link deadlineDayOf},
 * and one with neither, which would belong to every day until done,
 * has no day of the plan and is left out.
 * Registers the time zones of the file first, so times with a `TZID` convert correctly.
 * A changed occurrence stays an entry of its own at its new time,
 * and its series learns that it replaces the occurrence at the old time.
 *
 * @param text - What the file holds, read from it when left out
 */
function calendarRead(
    file: string,
    modified: number,
    text: string = readFileSync(file, "utf8"),
): Calendar {
    const root: ICAL.Component = new ICAL.Component(ICAL.parse(text));
    root.getAllSubcomponents("vtimezone").forEach((zone: ICAL.Component): void =>
        ICAL.TimezoneService.register(zone),
    );

    const events: ICAL.Event[] = [
        ...root.getAllSubcomponents("vevent"),
        ...root
            .getAllSubcomponents("vtodo")
            .filter(
                (todo: ICAL.Component): boolean =>
                    todo.hasProperty("dtstart") || todo.hasProperty("due"),
            ),
    ].map((component: ICAL.Component): ICAL.Event => new ICAL.Event(component));
    const series: Map<string, ICAL.Event> = new Map(
        events
            .filter((event: ICAL.Event): boolean => event.isRecurring())
            .map((event: ICAL.Event): [string, ICAL.Event] => [event.uid, event]),
    );
    events
        .filter((event: ICAL.Event): boolean => event.isRecurrenceException())
        .forEach((change: ICAL.Event): void =>
            series.get(change.uid)?.relateException(change),
        );

    return {
        modified: modified,
        entries: events
            .filter((event: ICAL.Event): boolean => !event.isRecurring())
            .map((event: ICAL.Event): Entry =>
                event.component.hasProperty("dtstart")
                    ? entryOf(event, event.startDate, event.endDate, file)
                    : entryOf(event, ...deadlineDayOf(event.component), file),
            ),
        series: [...series.values()],
    };
}

/**
 * Gives the {@link Calendar} of a file, read again only when the file changed on disk.
 */
function calendarOf(file: string): Calendar {
    const modified: number = statSync(file).mtimeMs;
    const known: Calendar | undefined = calendars.get(file);
    if (known?.modified === modified) return known;

    const calendar: Calendar = calendarRead(file, modified);
    calendars.set(file, calendar);
    return calendar;
}

/**
 * Lists the `.ics` files of calendar sources.
 * A folder that does not exist yet, like the new system before its first entry,
 * gives none.
 */
function filesOf(sources: CalendarSource[]): string[] {
    return sources
        .filter((source: CalendarSource): boolean => existsSync(source.folder))
        .flatMap((source: CalendarSource): string[] =>
            readdirSync(source.folder, { recursive: true, encoding: "utf8" })
                .filter((name: string): boolean => name.endsWith(source.ending))
                .map((name: string): string => join(source.folder, name)),
        );
}

/** Gives the bounds of a {@link Range} in the form of an {@link Entry}. */
function boundsOf(allDay: boolean, range: Range): [string, string] {
    return allDay ? range.days : range.instants;
}

/**
 * Lists the occurrences of a series that start before the end of a range, in order.
 * Leaves out the replaced ones, their changed versions are entries of their own.
 */
function occurrencesOf(series: ICAL.Event, range: Range, file: string): Entry[] {
    const occurrences: Entry[] = [];
    const walk: ICAL.RecurExpansion = series.iterator();

    let start: ICAL.Time | undefined = walk.next();
    while (start !== undefined && textOf(start) < boundsOf(start.isDate, range)[1]) {
        const details: { item: ICAL.Event; startDate: ICAL.Time; endDate: ICAL.Time } =
            series.getOccurrenceDetails(start);
        if (details.item === series)
            occurrences.push(entryOf(series, details.startDate, details.endDate, file));
        start = walk.next();
    }
    return occurrences;
}

/**
 * Reads the entries of calendar sources that start in a range or overlap it,
 * the first so a to-do with a time but no length,
 * which ends where it starts, is found too.
 * Compares all-day entries by their dates and timed entries by their instants,
 * so a birthday stays on its date in every time zone.
 *
 * @param kept - Tells whether an entry is wanted,
 *   a series by its first occurrence before its occurrences are walked,
 *   so a series not wanted costs no time, see `groupIs` in `boxes.ts`
 */
export function entriesRead(
    sources: CalendarSource[],
    start: string,
    end: string,
    kept: (entry: Entry) => boolean = (): boolean => true,
): Entry[] {
    const range: Range = {
        days: [start.slice(0, 10), end.slice(0, 10)],
        instants: [new Date(start).toISOString(), new Date(end).toISOString()],
    };

    return filesOf(sources)
        .flatMap((file: string): Entry[] => [
            ...calendarOf(file).entries.filter(kept),
            ...calendarOf(file)
                .series.filter((series: ICAL.Event): boolean =>
                    kept(entryOf(series, series.startDate, series.endDate, file)),
                )
                .flatMap((series: ICAL.Event): Entry[] =>
                    occurrencesOf(series, range, file),
                ),
        ])
        .filter((entry: Entry): boolean => {
            const [from, to]: [string, string] = boundsOf(entry.allDay, range);
            return entry.start < to && (entry.start >= from || entry.end > from);
        });
}

/**
 * Reads the entries of calendar sources that happen once, events,
 * to-dos and changed occurrences of a series, whenever they lie,
 * without walking a series.
 */
export function entriesOnceRead(sources: CalendarSource[]): Entry[] {
    return filesOf(sources).flatMap((file: string): Entry[] => calendarOf(file).entries);
}

/** Reads the entries of one `.ics` file that happen once, see `shared.ts`. */
export function fileEntriesRead(file: string): Entry[] {
    return calendarOf(file).entries;
}

/**
 * Reads the entries that happen once of the text of an `.ics` file
 * that lies nowhere on my disk, like one that came by SSH, see `shared.ts`.
 */
export function textEntriesRead(text: string, name: string): Entry[] {
    return calendarRead(name, 0, text).entries;
}

/**
 * Looks for the entry of the one event or to-do with an identifier in calendar sources.
 * An occurrence of a series has the identifier of its series,
 * so it counts as none, a changed one too, see {@link occurrenceLookup}.
 */
export function entryLookup(
    sources: CalendarSource[],
    id: string,
): [string, Entry] | undefined {
    for (const file of filesOf(sources)) {
        const entry: Entry | undefined = calendarOf(file).entries.find(
            (candidate: Entry): boolean =>
                candidate.id === id && candidate.recurrence === "",
        );
        if (entry !== undefined) return [file, entry];
    }
    return undefined;
}

/**
 * Finds the `.ics` file of the event,
 * to-do or series with an identifier in calendar sources.
 */
export function fileOfId(sources: CalendarSource[], id: string): string | undefined {
    return filesOf(sources).find(
        (file: string): boolean =>
            calendarOf(file).entries.some((entry: Entry): boolean => entry.id === id) ||
            calendarOf(file).series.some(
                (series: ICAL.Event): boolean => series.uid === id,
            ),
    );
}

/**
 * Looks for an occurrence of a series in calendar sources by the identifier of the series
 * and the start of the occurrence as the series has it:
 * a changed occurrence among the entries of a file,
 * else the occurrence the series itself has at that start.
 * Its range ends a moment after that start,
 * so walking the series stops right after it, see {@link occurrencesOf}.
 */
export function occurrenceLookup(
    sources: CalendarSource[],
    id: string,
    recurrence: string,
): [string, Entry] | undefined {
    for (const file of filesOf(sources)) {
        const calendar: Calendar = calendarOf(file);
        const changed: Entry | undefined = calendar.entries.find(
            (candidate: Entry): boolean =>
                candidate.id === id && candidate.recurrence === recurrence,
        );
        if (changed !== undefined) return [file, changed];

        const series: ICAL.Event | undefined = calendar.series.find(
            (candidate: ICAL.Event): boolean => candidate.uid === id,
        );
        const day: string = recurrence.slice(0, 10);
        const range: Range = {
            days: [day, dayAdd(day, 1)],
            instants: [recurrence, new Date(Date.parse(recurrence) + 1).toISOString()],
        };
        const occurrence: Entry | undefined =
            series === undefined
                ? undefined
                : occurrencesOf(series, range, file).find(
                      (candidate: Entry): boolean => candidate.recurrence === recurrence,
                  );
        if (occurrence !== undefined) return [file, occurrence];
    }
    return undefined;
}

/**
 * Finds the entry of the one event or to-do with an identifier, see {@link entryLookup}.
 *
 * @throws {Error} - When no entry that happens once has the identifier
 */
export function entryFind(sources: CalendarSource[], id: string): [string, Entry] {
    const found: [string, Entry] | undefined = entryLookup(sources, id);
    if (found === undefined) throw new Error(`No entry ${id}`);
    return found;
}

/**
 * Stops a write outside the folders of the new system, like into my modules.
 *
 * @throws {Error} - When the file lies outside the folders of the new system
 */
function writeCheck(file: string): void {
    if (!writeAllowed(file))
        throw new Error(`No writing outside the new system: ${file}`);
}

/**
 * Reads an `.ics` file as {@link FileLines}, a folded line joined to the line before,
 * so a file written back is folded anew, see {@link foldedOf}.
 */
function linesRead(file: string): FileLines {
    const text: string = readFileSync(file, "utf8");
    const newline: string = text.includes("\r\n") ? "\r\n" : "\n";
    const lines: string[] = [];
    text.split(newline).forEach((line: string): void => {
        if (/^[ \t]/.test(line) && lines.length > 0)
            lines[lines.length - 1] += line.slice(1);
        else lines.push(line);
    });
    return { lines: lines, newline: newline };
}

/** Types of the entries of a module in the order they stand in its file. */
const typeOrder: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA"];

/**
 * Puts the events and to-dos of an `.ics` file into one order,
 * so the file reads well for me too, each with its lines exactly as they are,
 * the lines before the first of them, its header and its time zone, first,
 * and every other line after them.
 * In the plan or the log of a module by type, see {@link typeOrder},
 * any other type after them by its name, an entry without type last,
 * and within a type by start, the groups of a tutorial,
 * to-dos with `X-GROUP` and without `X-NUMBER`, after the boxes of their type;
 * in every other file by start alone.
 * A series is followed right by the occurrences changed alone, the earliest first.
 * Entries of the same place keep the order they had.
 * A file it cannot read so, like one whose last entry has no end, stays as it is.
 */
export function componentsSorted(lines: string[], module: boolean): string[] {
    const head: string[] = [];
    const blocks: string[][] = [];
    const rest: string[] = [];
    let block: string[] | null = null;
    let depth: number = 0;
    lines.forEach((line: string): void => {
        if (
            block === null &&
            depth === 1 &&
            (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
        )
            block = [];
        if (line.startsWith("BEGIN:")) depth++;
        if (block !== null) block.push(line);
        else (blocks.length === 0 ? head : rest).push(line);
        if (line.startsWith("END:")) depth--;
        if (block !== null && depth === 1) {
            blocks.push(block);
            block = null;
        }
    });
    if (block !== null) return lines;

    const timeOf: (component: string[], name: string) => string = (
        component: string[],
        name: string,
    ): string => {
        const line: string = unfoldedOf(component, name);
        return line === ""
            ? ""
            : textOf(ICAL.Property.fromString(line).getFirstValue() as ICAL.Time);
    };
    const typeOf: (component: string[]) => string = (component: string[]): string => {
        const summary: string = unfoldedOf(component, "SUMMARY");
        return summary === ""
            ? ""
            : skillPartsOf(
                  String(ICAL.Property.fromString(summary).getFirstValue() ?? ""),
              )[1];
    };
    const starts: Map<string[], string> = new Map(
        blocks.map((component: string[]): [string[], string] => [
            component,
            timeOf(component, "DTSTART") || timeOf(component, "DUE"),
        ]),
    );
    const units: string[][][] = [];
    const series: Map<string, string[][]> = new Map();
    blocks
        .filter(
            (component: string[]): boolean =>
                unfoldedOf(component, "RECURRENCE-ID") === "",
        )
        .forEach((component: string[]): void => {
            const unit: string[][] = [component];
            units.push(unit);
            series.set(unfoldedOf(component, "UID"), unit);
        });
    blocks
        .filter(
            (component: string[]): boolean =>
                unfoldedOf(component, "RECURRENCE-ID") !== "",
        )
        .sort((first: string[], second: string[]): number =>
            timeOf(first, "RECURRENCE-ID").localeCompare(timeOf(second, "RECURRENCE-ID")),
        )
        .forEach((component: string[]): void => {
            const unit: string[][] | undefined = series.get(unfoldedOf(component, "UID"));
            if (unit === undefined) units.push([component]);
            else unit.push(component);
        });

    const keyOf: (unit: string[][]) => [number, string, number, string] = (
        unit: string[][],
    ): [number, string, number, string] => {
        const type: string = module ? typeOf(unit[0]) : "";
        const place: number = typeOrder.indexOf(type);
        const group: boolean =
            unfoldedOf(unit[0], "X-GROUP") !== "" &&
            unfoldedOf(unit[0], "X-NUMBER") === "";
        return [
            place !== -1 ? place : type !== "" ? typeOrder.length : typeOrder.length + 1,
            type,
            group ? 1 : 0,
            starts.get(unit[0]) ?? "",
        ];
    };
    units.sort((first: string[][], second: string[][]): number => {
        const [one, other]: [number, string, number, string][] = [
            keyOf(first),
            keyOf(second),
        ];
        return (
            one[0] - other[0] ||
            one[1].localeCompare(other[1]) ||
            one[2] - other[2] ||
            one[3].localeCompare(other[3])
        );
    });
    return [...head, ...units.flat(2), ...rest];
}

/**
 * A summary of an event or a to-do of a file, see {@link summariesOf}.
 * `index` is that of its line `SUMMARY`, `base` the summary without its round brackets.
 */
type Summed = {
    index: number;
    category: string;
    base: string;
    link: string;
};

/**
 * Whether {@link linesWrite} spreads a link now,
 * so the files it writes for that spread no further.
 */
let spreading: boolean = false;

/**
 * Gives a summary without what stands in round brackets at its end,
 * which a link is shared by, see {@link linesWrite}.
 */
export function summaryBaseOf(summary: string): string {
    return summary.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

/** Gives the summaries of the events and to-dos of the lines of a file. */
function summariesOf(lines: string[]): Summed[] {
    const found: Summed[] = [];
    let category: string = "";
    let index: number = -1;
    let depth: number = 0;
    lines.forEach((line: string, at: number): void => {
        if (line.startsWith("BEGIN:")) depth++;
        if (depth === 2 && (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO"))
            [category, index] = ["", -1];
        else if (depth === 2 && line.startsWith("CATEGORIES:"))
            category = line.slice("CATEGORIES:".length);
        else if (depth === 2 && /^SUMMARY[;:]/.test(line)) index = at;
        else if (
            depth === 2 &&
            (line === "END:VEVENT" || line === "END:VTODO") &&
            index >= 0
        ) {
            const property: ICAL.Property = ICAL.Property.fromString(lines[index]);
            found.push({
                index: index,
                category: category,
                base: summaryBaseOf(String(property.getFirstValue() ?? "")),
                link: String(property.getParameter("altrep") ?? ""),
            });
        }
        if (line.startsWith("END:")) depth--;
    });
    return found;
}

/** Gives every `.ics` file of plan and log, all in {@link calendarRoot}. */
function calendarFilesOf(): string[] {
    return readdirSync(calendarRoot, { recursive: true, encoding: "utf8" })
        .filter((path: string): boolean => path.endsWith(".ics"))
        .map((path: string): string => join(calendarRoot, path));
}

/**
 * Gives the link every entry and box of a category with the same summary shares,
 * see {@link linesWrite}, never the link of a platform online of an older entry.
 */
export function sharedLinkOf(category: string, summary: string): string | undefined {
    const base: string = summaryBaseOf(summary);
    for (const file of calendarFilesOf()) {
        const found: Summed | undefined = summariesOf(linesRead(file).lines).find(
            (summed: Summed): boolean =>
                summed.category === category &&
                summed.base === base &&
                summed.link !== "" &&
                !(
                    linkForm.test(summed.link) &&
                    platformOfLink(summed.link) !== undefined
                ),
        );
        if (found !== undefined) return found.link;
    }
    return undefined;
}

/**
 * Writes {@link FileLines} into an `.ics` file, creating its folders when missing,
 * its events and to-dos in their order, see {@link componentsSorted}, every line folded.
 * A summary written anew in plan or log, with a link or another one,
 * gives its link to every entry and box of its category with the same summary,
 * counted without what stands in round brackets at its end, in every file,
 * so one summary has one link everywhere and a link changed once changes for all.
 * A summary without link or with the link of a platform online gives none.
 */
function linesWrite(file: string, text: FileLines): void {
    const before: string[] = existsSync(file) ? linesRead(file).lines : [];
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
        file,
        componentsSorted(text.lines, dirname(file) === modulesRoot)
            .flatMap(foldedOf)
            .join(text.newline),
    );
    if (dirname(file) === modulesRoot)
        writtenFollowers.forEach(
            (follower: (module: string, kinds: [string, string][]) => void): void =>
                follower(
                    basename(file).replace(/_(Plan|Log)\.ics$/, ""),
                    kindsOf(text.lines),
                ),
        );
    if (spreading || !file.startsWith(`${calendarRoot}/`)) return;
    const changed: Summed[] = summariesOf(text.lines).filter(
        (summed: Summed): boolean =>
            summed.category !== "" &&
            summed.link !== "" &&
            !before.includes(text.lines[summed.index]) &&
            !(linkForm.test(summed.link) && platformOfLink(summed.link) !== undefined),
    );
    if (changed.length === 0) return;
    spreading = true;
    try {
        calendarFilesOf().forEach((path: string): void => linkSpread(path, changed));
    } finally {
        spreading = false;
    }
}

/**
 * Gives the summaries of a file the links of summaries written anew,
 * see {@link linesWrite}.
 * Writes the file only when one of them changed, and only where the reader may write.
 */
function linkSpread(file: string, changed: Summed[]): void {
    if (!writeAllowed(file)) return;
    const text: FileLines = linesRead(file);
    let spread: boolean = false;
    summariesOf(text.lines).forEach((summed: Summed): void => {
        const rule: Summed | undefined = changed.find(
            (one: Summed): boolean =>
                one.category === summed.category && one.base === summed.base,
        );
        if (rule === undefined || rule.link === summed.link) return;
        const property: ICAL.Property = ICAL.Property.fromString(
            text.lines[summed.index],
        );
        property.setParameter("altrep", rule.link);
        text.lines[summed.index] = property.toICALString();
        spread = true;
    });
    if (spread) linesWrite(file, text);
}

/**
 * Takes what runs each time a plan or a log of a module is written,
 * like `typeFoldersMake` in `notes.ts`, which registers itself here,
 * since `notes.ts` reads this file and this file may not read it in turn.
 */
export function writtenFollow(
    follower: (module: string, kinds: [string, string][]) => void,
): void {
    writtenFollowers.push(follower);
}

/**
 * Gives the type and the semester of each skill entry of the lines of a file,
 * so the folders of their material are made, see `typeFoldersMake` in `notes.ts`.
 */
function kindsOf(lines: string[]): [string, string][] {
    const kinds: [string, string][] = [];
    let type: string = "";
    let semester: string = "";
    lines.forEach((line: string): void => {
        if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
            [type, semester] = ["", ""];
        else if (line.startsWith("SUMMARY"))
            type = skillPartsOf(
                String(ICAL.Property.fromString(line).getFirstValue() ?? ""),
            )[1];
        else if (line.startsWith("X-SEMESTER:"))
            semester = line.slice("X-SEMESTER:".length).trim();
        else if (
            (line === "END:VEVENT" || line === "END:VTODO") &&
            type !== "" &&
            semester !== ""
        )
            kinds.push([type, semester]);
    });
    return kinds;
}

/**
 * Creates an empty calendar with only the header the standard asks for,
 * and the time zone {@link zoneName}, which every `DTSTART` names.
 * No `X-WR-CALNAME`, since its name is the name of its file, no `X-WR-TIMEZONE`,
 * no `CALSCALE`, since `GREGORIAN` is the default,
 * and no `METHOD`, which only invitations need.
 */
function calendarCreate(): ICAL.Component {
    const root: ICAL.Component = new ICAL.Component("vcalendar");
    root.addPropertyWithValue("prodid", "-//NomSystem//Dashboard//DE");
    root.addPropertyWithValue("version", "2.0");
    root.addSubcomponent(zoneComponent);
    return root;
}

/**
 * Gives the place of a line of an event or a to-do in {@link lineOrder},
 * every other line after them.
 */
function lineRankOf(line: string): number {
    const name: string = line.split(/[;:]/)[0].toUpperCase();
    const place: number = lineOrder.indexOf(name);
    return place === -1 ? lineOrder.length : place;
}

/**
 * Puts the lines of an event or a to-do into the fixed order, see {@link lineOrder}:
 * each property with the lines that continue it,
 * lines of the same rank in the order they had,
 * and the components inside it, like an alarm, at its end as they are.
 */
function linesOrdered(component: string[]): string[] {
    const properties: [number, string[]][] = [];
    const inner: string[] = [];
    let depth: number = 0;
    component.slice(1, -1).forEach((line: string): void => {
        if (line.startsWith("BEGIN:")) depth++;
        if (depth > 0) inner.push(line);
        else if (/^[ \t]/.test(line) && properties.length > 0)
            properties[properties.length - 1][1].push(line);
        else properties.push([lineRankOf(line), [line]]);
        if (line.startsWith("END:")) depth--;
    });
    return [
        component[0],
        ...properties
            .sort(
                (first: [number, string[]], second: [number, string[]]): number =>
                    first[0] - second[0],
            )
            .flatMap(([, lines]: [number, string[]]): string[] => lines),
        ...inner,
        component[component.length - 1],
    ];
}

/**
 * Puts the lines of an event or a to-do, in the fixed order,
 * before the last line `END:VCALENDAR` of an `.ics` file,
 * so everything already in the file stays as it is, byte for byte.
 * A missing file is created with the header of a new calendar.
 *
 * @throws {Error} - When the file has no line `END:VCALENDAR`
 */
function componentInsert(file: string, event: string[]): void {
    const text: FileLines = existsSync(file)
        ? linesRead(file)
        : { lines: [...linesOf(calendarCreate()), ""], newline: "\r\n" };
    const calendarEnd: number = text.lines.lastIndexOf("END:VCALENDAR");
    if (calendarEnd === -1) throw new Error(`No END:VCALENDAR in ${file}`);

    text.lines.splice(calendarEnd, 0, ...linesOrdered(event));
    linesWrite(file, text);
}

/**
 * Finds the first property of a name among the lines of an event or a to-do,
 * leaving out the components inside it, like an alarm.
 *
 * @returns Index of its first line and of the line after its last, `null` for none
 */
function propertyFind(event: string[], name: string): [number, number] | null {
    const head: RegExp = new RegExp(`^${name}[;:]`, "i");
    let depth: number = 0;
    for (let index: number = 1; index < event.length - 1; index++) {
        if (event[index].startsWith("BEGIN:")) depth++;
        else if (event[index].startsWith("END:")) depth--;
        else if (depth === 0 && head.test(event[index])) {
            let next: number = index + 1;
            while (/^[ \t]/.test(event[next])) next++;
            return [index, next];
        }
    }
    return null;
}

/**
 * Gives the identifier of an entry: its `UID`, for one occurrence of a series
 * the `UID` of its series and its start in the series after `#`,
 * since each occurrence is a box of its own in the plan.
 */
export function entryIdOf(entry: Entry): string {
    return entry.recurrence === "" ? entry.id : `${entry.id}#${entry.recurrence}`;
}

/** Gives a property of an event or a to-do as one line, unfolded, empty for none. */
function unfoldedOf(event: string[], name: string): string {
    const place: [number, number] | null = propertyFind(event, name);
    return place === null
        ? ""
        : event
              .slice(...place)
              .map((part: string): string => part.replace(/^[ \t]/, ""))
              .join("");
}

/**
 * Finds the lines of every event or to-do with an identifier, see {@link entryIdOf}:
 * with its `UID` and without `RECURRENCE-ID`, or, for an identifier with `#`,
 * with the `UID` before it and the `RECURRENCE-ID` after it, compared as instants.
 *
 * @returns Index of each line `BEGIN:` and of the line after its `END:`
 */
function componentsOf(lines: string[], id: string): [number, number][] {
    const at: number = id.lastIndexOf("#");
    const uid: string = at === -1 ? id : id.slice(0, at);
    const recurrence: string = at === -1 ? "" : id.slice(at + 1);
    const found: [number, number][] = [];
    let begin: number = -1;
    lines.forEach((line: string, index: number): void => {
        if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO") begin = index;
        else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1) {
            const event: string[] = lines.slice(begin, index + 1);
            const changed: string = unfoldedOf(event, "RECURRENCE-ID");
            const start: string =
                changed === ""
                    ? ""
                    : textOf(
                          ICAL.Property.fromString(changed).getFirstValue() as ICAL.Time,
                      );
            if (
                unfoldedOf(event, "UID").replace(/^UID:/i, "") === uid &&
                start === recurrence
            )
                found.push([begin, index + 1]);
        }
    });
    return found;
}

/**
 * Finds the lines of the one event or to-do with an identifier, see {@link componentsOf}.
 *
 * @throws {Error} - When no event or to-do, or more than one, has the identifier
 */
function componentFind(lines: string[], id: string): [number, number] {
    const found: [number, number][] = componentsOf(lines, id);
    if (found.length !== 1) throw new Error(`${found.length} events ${id}`);
    return found[0];
}

/**
 * Builds a property of a time of an occurrence in the form
 * of the `DTSTART` of its series, the same `TZID`, UTC or a day,
 * so calendar apps and `ical.js` match the `RECURRENCE-ID` with the occurrence.
 */
function seriesTimeOf(series: ICAL.Event, name: string, time: ICAL.Time): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property(name);
    const zoneId: string = String(
        series.component.getFirstProperty("dtstart")?.getParameter("tzid") ?? "",
    );
    property.setValue(time);
    if (zoneId !== "" && !time.isDate) property.setParameter("tzid", zoneId);
    return property;
}

/**
 * Makes one occurrence of a series a component of its own,
 * so it can be dropped, pushed or changed alone,
 * the way the standard changes one occurrence:
 * a copy of its series with the same `UID` right after it, see {@link occurrenceLinesOf},
 * its `DTSTAMP` that of its series,
 * since it got its day with the series, see `written` of {@link Entry}.
 * The series stays as it is, every other line of the file too.
 * An occurrence that is a component of its own already stays.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or holds no such series or occurrence
 */
export function occurrenceOwn(file: string, entry: Entry): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    if (componentsOf(text.lines, entryIdOf(entry)).length > 0) return;

    const series: ICAL.Event | undefined = calendarOf(file).series.find(
        (candidate: ICAL.Event): boolean => candidate.uid === entry.id,
    );
    if (series === undefined) throw new Error(`No series ${entry.id} in ${file}`);
    const start: ICAL.Time | undefined = seriesStartOf(series, entry.recurrence);
    if (start === undefined) throw new Error(`No occurrence ${entryIdOf(entry)}`);

    const place: [number, number] = componentFind(text.lines, entry.id);
    text.lines.splice(
        place[1],
        0,
        ...occurrenceLinesOf(series, text.lines.slice(...place), start),
    );
    linesWrite(file, text);
}

/** Finds a start of a series, walking its starts up to it, `undefined` for none. */
function seriesStartOf(series: ICAL.Event, recurrence: string): ICAL.Time | undefined {
    const walk: ICAL.RecurExpansion = series.iterator();
    let start: ICAL.Time | undefined = walk.next();
    while (start !== undefined && textOf(start) < recurrence) start = walk.next();
    return start !== undefined && textOf(start) === recurrence ? start : undefined;
}

/**
 * Gives the lines of the component of its own of one occurrence as its series gives it,
 * see {@link occurrenceOwn}:
 * a copy of the series without `RRULE`, `RDATE` and `EXDATE`,
 * its `DTSTART` the start of the occurrence, its `DTEND`,
 * while the series has one, that start and the length of the series,
 * as `ical.js` gives an occurrence, and as `RECURRENCE-ID` that start.
 */
function occurrenceLinesOf(
    series: ICAL.Event,
    lines: string[],
    start: ICAL.Time,
): string[] {
    const own: string[] = [...lines];
    propertyPut(own, "rrule", []);
    propertyPut(own, "rdate", []);
    propertyPut(own, "exdate", []);
    propertyPut(own, "dtstart", [seriesTimeOf(series, "dtstart", start)]);
    if (propertyFind(own, "dtend") !== null) {
        const end: ICAL.Time = start.clone();
        end.addDuration(series.duration);
        propertyPut(own, "dtend", [seriesTimeOf(series, "dtend", end)]);
    }
    propertyPut(own, "recurrence-id", [seriesTimeOf(series, "recurrence-id", start)]);
    return linesOrdered(own);
}

/**
 * Takes out each occurrence of a series that is a component of its own
 * but holds nothing of its own any more: its lines are those its series gives it,
 * see {@link occurrenceLinesOf}, but its `DTSTAMP`,
 * an open `STATUS:NEEDS-ACTION` the same as none,
 * and the series still has its start;
 * so the day is the series' again, like my sleep of 24.10.2026,
 * once I gave the whole series my place.
 * One done, dropped, pushed, carried along or changed in anything stays,
 * since a line of its own tells it;
 * a log entry pointing to it keeps pointing to its day, see {@link relatedOf}.
 * The occurrences are walked from the last,
 * so one taken out leaves those before it where they are.
 *
 * @throws {Error} - When the file lies outside the new system
 */
export function occurrencesTidy(file: string, uid: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const series: ICAL.Event | undefined = calendarOf(file).series.find(
        (candidate: ICAL.Event): boolean => candidate.uid === uid,
    );
    const master: [number, number] | undefined = componentsOf(text.lines, uid)[0];
    if (series === undefined || master === undefined) return;
    const lines: string[] = text.lines.slice(...master);
    const plain: (lines: string[]) => string[] = (lines: string[]): string[] =>
        lines
            .reduce(
                (unfolded: string[], line: string): string[] =>
                    /^[ \t]/.test(line)
                        ? [
                              ...unfolded.slice(0, -1),
                              `${unfolded[unfolded.length - 1]}${line.slice(1)}`,
                          ]
                        : [...unfolded, line],
                [],
            )
            .filter(
                (line: string): boolean =>
                    !/^DTSTAMP[:;]/i.test(line) && !/^STATUS:NEEDS-ACTION$/i.test(line),
            );
    const places: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO") begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            const component: string[] = text.lines.slice(begin, index + 1);
            if (
                unfoldedOf(component, "UID").replace(/^UID:/i, "") === uid &&
                unfoldedOf(component, "RECURRENCE-ID") !== ""
            )
                places.unshift([begin, index + 1]);
        }
    });
    let gone: number = 0;
    places.forEach(([first, after]: [number, number]): void => {
        const own: string[] = text.lines.slice(first, after);
        const start: ICAL.Time | undefined = seriesStartOf(
            series,
            textOf(
                ICAL.Property.fromString(
                    unfoldedOf(own, "RECURRENCE-ID"),
                ).getFirstValue() as ICAL.Time,
            ),
        );
        if (
            start === undefined ||
            JSON.stringify(plain(linesOrdered(own))) !==
                JSON.stringify(plain(occurrenceLinesOf(series, lines, start)))
        )
            return;
        text.lines.splice(first, after - first);
        gone++;
    });
    if (gone > 0) linesWrite(file, text);
}

/** Turns an instant into Berlin time. */
function berlinOf(instant: Date): ICAL.Time {
    return ICAL.Time.fromJSDate(instant, true).convertToZone(zone);
}

/**
 * Turns an instant into the time the reader writes into a file: Berlin time,
 * but in UTC for an instant whose Berlin time `ical.js` reads back as another instant,
 * those of the two hours around a change of the clocks:
 * 02:30 of 25.10.2026 comes twice, at 00:30 and at 01:30 UTC,
 * and `ical.js` reads it as the second,
 * while it writes 01:30 UTC as 03:30,
 * so a sleep from 02:30 began an hour later and one until 02:30 ended an hour later;
 * every reader of the format takes a time in UTC as the very instant.
 */
function writtenOf(instant: Date): ICAL.Time {
    const time: ICAL.Time = berlinOf(instant);
    return time.toJSDate().getTime() === instant.getTime()
        ? time
        : ICAL.Time.fromJSDate(instant, true);
}

/** Writes the date of an instant in Berlin time. */
export function berlinDateOf(instant: Date): string {
    return berlinOf(instant).toString().slice(0, 10);
}

/** Writes the time of day of an instant in Berlin time. */
export function berlinTimeOf(instant: Date): string {
    return berlinOf(instant).toString().slice(11, 16);
}

/** Adds days to a day. */
export function dayAdd(day: string, days: number): string {
    const date: Date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** Gives the weekday of a day, 1 for Monday to 7 for Sunday. */
export function weekdayOf(day: string): number {
    return ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** Reads a time of day as minutes after midnight. */
export function minutesOf(time: string): number {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Moves an instant by whole days in Berlin time, keeping its time of day,
 * also over a day the clocks change.
 */
export function berlinLater(instant: Date, days: number): Date {
    const time: ICAL.Time = berlinOf(instant);
    time.adjust(days, 0, 0, 0);
    return time.toJSDate();
}

/**
 * Writes the start of a day in Berlin time with its offset,
 * the form of a range of {@link entriesRead},
 * so whole-day entries compare by the day and timed ones by the instant.
 */
export function berlinDayStartOf(day: string): string {
    const [year, month, date]: number[] = day.split("-").map(Number);
    const start: ICAL.Time = ICAL.Time.fromData(
        { year: year, month: month, day: date, hour: 0, minute: 0, second: 0 },
        zone,
    );
    const offset: number = zone.utcOffset(start) / 60;
    return (
        `${day}T00:00:00+${String(Math.floor(offset / 60)).padStart(2, "0")}:` +
        String(offset % 60).padStart(2, "0")
    );
}

/**
 * Turns an hour and minute of a day in Berlin time into an instant,
 * right also on the days the clocks change.
 */
export function berlinInstantOf(day: string, hour: number, minute: number = 0): Date {
    const [year, month, date]: number[] = day.split("-").map(Number);
    return ICAL.Time.fromData(
        { year: year, month: month, day: date, hour: hour, minute: minute, second: 0 },
        zone,
    ).toJSDate();
}

/**
 * Builds a property; a time in Berlin time gets the parameter `TZID`,
 * a link its path as value and the fingerprint of a file as `X-SHA256`, see {@link Link}.
 */
function propertyOf(name: string, value: string | ICAL.Time | Link): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property(name);
    if (typeof value === "string" || value instanceof ICAL.Time) property.setValue(value);
    else {
        property.setValue(value.path);
        if (value.fingerprint !== "")
            property.setParameter("x-sha256", value.fingerprint);
    }
    if (value instanceof ICAL.Time && value.zone === zone)
        property.setParameter("tzid", zoneName);
    return property;
}

/**
 * Builds the property of a text field of an entry, see {@link textsOf}:
 * its `LOCATION` and its `SUMMARY` with their link as the standard parameter `ALTREP`,
 * and its `X-ONLINE` with the link, the channel and the title, see {@link Online},
 * every other one as its text.
 */
function textPropertyOf(name: string, value: string, fields: EntryTexts): ICAL.Property {
    const property: ICAL.Property = propertyOf(name, value);
    if (name === "location" && fields.locationLink !== "")
        property.setParameter("altrep", [fields.locationLink]);
    if (name === "summary" && fields.titleLink !== "")
        property.setParameter("altrep", [fields.titleLink]);
    if (name === "x-online" && fields.onlineLink !== "")
        property.setParameter("altrep", [fields.onlineLink]);
    if (name === "x-online" && fields.onlineChannel !== "")
        property.setParameter("x-channel", fields.onlineChannel);
    if (name === "x-online" && fields.onlineTitle !== "")
        property.setParameter("x-title", fields.onlineTitle);
    return property;
}

/**
 * Builds the `ATTENDEE` of a person I was with, see {@link Attendee}.
 * A name with a comma, `;` or `:` goes in double quotes, as the standard asks,
 * which `ical.js` writes itself.
 * A person of `Persons.md` with a mail there gets that mail in place of an address ending
 * in `@invalid`, see `mailOf` in `./persons.ts`.
 */
function attendeePropertyOf(attendee: Attendee): ICAL.Property {
    const mail: string = attendee.address.endsWith("@invalid")
        ? mailOf(attendee.name)
        : "";
    const property: ICAL.Property = propertyOf(
        "attendee",
        `mailto:${mail !== "" ? mail : attendee.address}`,
    );
    property.setParameter("cn", attendee.name);
    return property;
}

/**
 * Builds the `RELATED-TO` of a log entry,
 * which points to the box it was logged from by its `UID`, the standard way.
 * For one date of a series that date goes along as parameter `X-RECURRENCE-ID`,
 * since the `UID` names the whole series.
 */
function relatedOf(box: string): ICAL.Property {
    const at: number = box.lastIndexOf("#");
    const property: ICAL.Property = propertyOf(
        "related-to",
        at === -1 ? box : box.slice(0, at),
    );
    if (at !== -1) property.setParameter("x-recurrence-id", icsTextOf(box.slice(at + 1)));
    return property;
}

/**
 * Builds a property of a new entry beyond its fields, see {@link entryAppend}:
 * the box a log entry was logged from as its `RELATED-TO`, see {@link relatedOf},
 * the rule of a series as its `RRULE`, a moment in Berlin time,
 * or a day of a series without times as `EXDATE;VALUE=DATE`,
 * every other one with its value as it is, see {@link propertyOf}.
 * The rule is read by {@link ICAL.Recur.fromString},
 * since `ical.js` writes a rule given as text letter by letter.
 */
function ownPropertyOf(name: string, value: string | Link | Date): ICAL.Property {
    if (value instanceof Date) return propertyOf(name, writtenOf(value));
    if (
        name === "exdate" &&
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    )
        return propertyOf(name, ICAL.Time.fromDateString(value));
    if (name === "rrule" && typeof value === "string") {
        const rule: ICAL.Property = new ICAL.Property(name);
        rule.setValue(ICAL.Recur.fromString(value));
        return rule;
    }
    return name === "related-to" && typeof value === "string"
        ? relatedOf(value)
        : propertyOf(name, value);
}

/**
 * Puts a property into the lines of an event, one line per value:
 * takes out all its old lines and puts the new ones where the first old one stood,
 * or before the end of the event when there was none;
 * no value removes the property.
 *
 * @param values - New values, a property built already goes in as it is
 */
function propertyPut(
    event: string[],
    name: string,
    values: (string | ICAL.Time | Link | ICAL.Property)[],
): void {
    let at: number = event.length - 1;
    for (
        let old: [number, number] | null = propertyFind(event, name);
        old !== null;
        old = propertyFind(event, name)
    ) {
        at = Math.min(at, old[0]);
        event.splice(old[0], old[1] - old[0]);
    }
    event.splice(
        at,
        0,
        ...values.map((value: string | ICAL.Time | Link | ICAL.Property): string =>
            (value instanceof ICAL.Property
                ? value
                : propertyOf(name, value)
            ).toICALString(),
        ),
    );
}

/**
 * Text fields of an entry with the names of their properties,
 * in the order they are written.
 * The skill and type of a skill entry stand only in the `ALTREP` of its `SUMMARY`,
 * and who I was with in one `ATTENDEE` per person after them.
 */
function textsOf(fields: EntryTexts): [string, string][] {
    return [
        ["categories", fields.category],
        ["summary", fields.title],
        ["location", fields.location],
        ["x-online", fields.online],
        ["x-from", fields.from],
        ["description", fields.note],
        ["x-semester", fields.semester],
    ];
}

/**
 * Appends an entry to an `.ics` file, creating file and folders when missing.
 * Writes start and end in Berlin time,
 * and only the text fields and the properties beyond them that are not empty.
 *
 * @param own - Properties beyond the fields, each its name with its value,
 *   see {@link ownPropertyOf}
 * @param id - Its `UID`: a new one, or the one an entry brought from Vu's log,
 *   see `shared.ts`
 * @throws {Error} - When the file lies outside the new system
 *   or has no line `END:VCALENDAR`
 */
export function entryAppend(
    file: string,
    fields: EntryFields,
    own: [string, string | Link | Date | ICAL.Property][],
    id: string = `${randomUUID()}@nomsystem`,
): string {
    writeCheck(file);
    componentInsert(file, linesOf(eventOf(fields, own, id)));
    return id;
}

/**
 * Gives the text of a new `.ics` file that holds one entry and nothing else,
 * the same as {@link entryAppend} writes into a file missing,
 * like the copy of an entry I share, see `shared.ts`.
 */
export function entryIcsOf(
    fields: EntryFields,
    own: [string, string | Link | Date | ICAL.Property][],
    id: string,
): string {
    const lines: string[] = [...linesOf(calendarCreate()), ""];
    lines.splice(
        lines.lastIndexOf("END:VCALENDAR"),
        0,
        ...linesOrdered(linesOf(eventOf(fields, own, id))),
    );
    return componentsSorted(lines, false).flatMap(foldedOf).join("\r\n");
}

/** Builds the event of an entry, see {@link entryAppend}. */
function eventOf(
    fields: EntryFields,
    own: [string, string | Link | Date | ICAL.Property][],
    id: string,
): ICAL.Component {
    const event: ICAL.Component = new ICAL.Component("vevent");
    event.addProperty(propertyOf("dtstart", writtenOf(fields.start)));
    event.addProperty(propertyOf("dtend", writtenOf(fields.end)));
    event.addPropertyWithValue("dtstamp", ICAL.Time.fromJSDate(new Date(), true));
    event.addPropertyWithValue("uid", id);
    textsOf(fields)
        .filter(([, value]: [string, string]): boolean => value !== "")
        .forEach(([name, value]: [string, string]): void => {
            event.addProperty(textPropertyOf(name, value, fields));
        });
    fields.attendees.forEach((attendee: Attendee): void => {
        event.addProperty(attendeePropertyOf(attendee));
    });
    own.filter(
        ([, value]: [string, string | Link | Date | ICAL.Property]): boolean =>
            value !== "",
    ).forEach(([name, value]: [string, string | Link | Date | ICAL.Property]): void => {
        event.addProperty(
            value instanceof ICAL.Property ? value : ownPropertyOf(name, value),
        );
    });
    return event;
}

/** Gives the `DTSTART` of a to-do: its day when it has no time, else its time. */
function todoStartOf(fields: TodoFields): ICAL.Time {
    return fields.time === null
        ? ICAL.Time.fromDateString(fields.day)
        : writtenOf(fields.time);
}

/** Gives the `DUE` of a to-do: its deadline, a day or a time in Berlin time. */
function deadlineTimeOf(deadline: string): ICAL.Time {
    return /^\d{4}-\d{2}-\d{2}$/.test(deadline)
        ? ICAL.Time.fromDateString(deadline)
        : writtenOf(new Date(deadline));
}

/**
 * Writes minutes as a duration of the iCalendar format, as `ESTIMATED-DURATION` holds it.
 */
function durationOf(minutes: number): string {
    return ICAL.Duration.fromSeconds(minutes * 60).toString();
}

/**
 * Appends a to-do to an `.ics` file, a box of the plan,
 * creating file and folders when missing:
 * its day or its time as `DTSTART`, or instead its deadline as `DUE`,
 * `STATUS:NEEDS-ACTION`, since it is open, and only the fields that are not empty,
 * as an entry writes them, see {@link entryAppend}.
 * A to-do with a deadline has no `DTSTART`:
 * iCalendar (RFC 5545) wants `DUE` of the same kind as `DTSTART`,
 * both days or both times, and later,
 * so the day of its deadline is its day, see {@link deadlineDayOf}.
 *
 * @param open - Whether it is a box, open, `STATUS:NEEDS-ACTION`;
 *   false for a group of a tutorial, which is no box I do, see `groupPut` in `course.ts`
 * @throws {Error} - When the file lies outside the new system
 *   or has no line `END:VCALENDAR`
 */
export function todoAppend(
    file: string,
    fields: TodoFields,
    own: [string, string | Link | Date][] = [],
    open: boolean = true,
): string {
    writeCheck(file);
    const id: string = `${randomUUID()}@nomsystem`;
    const todo: ICAL.Component = new ICAL.Component("vtodo");
    if (fields.deadline === "")
        todo.addProperty(propertyOf("dtstart", todoStartOf(fields)));
    else todo.addProperty(propertyOf("due", deadlineTimeOf(fields.deadline)));
    if (fields.minutes !== null)
        todo.addProperty(propertyOf("estimated-duration", durationOf(fields.minutes)));
    todo.addPropertyWithValue("dtstamp", ICAL.Time.fromJSDate(new Date(), true));
    todo.addPropertyWithValue("uid", id);
    if (open) todo.addPropertyWithValue("status", "NEEDS-ACTION");
    textsOf(fields)
        .filter(([, value]: [string, string]): boolean => value !== "")
        .forEach(([name, value]: [string, string]): void => {
            todo.addProperty(textPropertyOf(name, value, fields));
        });
    fields.attendees.forEach((attendee: Attendee): void => {
        todo.addProperty(attendeePropertyOf(attendee));
    });
    own.filter(
        ([, value]: [string, string | Link | Date]): boolean => value !== "",
    ).forEach(([name, value]: [string, string | Link | Date]): void => {
        todo.addProperty(ownPropertyOf(name, value));
    });
    componentInsert(file, linesOf(todo));
    return id;
}

/**
 * Puts the text fields that changed into the lines of an event or a to-do.
 * A place that stays keeps its line as it is, with its `ALTREP`.
 * Who I was with, once changed, replaces all its `ATTENDEE`s.
 * A `SUMMARY` whose link alone changed is written anew too,
 * like that of a skill entry moved to another semester,
 * and so is an `X-ONLINE` whose link, channel or title alone changed;
 * once what it did online changes, its `LOCATION` and its `SUMMARY` are written anew too,
 * since an older entry wrote it there, see {@link onlineOf}.
 */
function textsPut(component: string[], entry: Entry, fields: EntryTexts): void {
    const textsOld: [string, string][] = textsOf(entry);
    const relinked: boolean = fields.titleLink !== entry.titleLink;
    const reonline: boolean =
        fields.online !== entry.online ||
        fields.onlineLink !== entry.onlineLink ||
        fields.onlineChannel !== entry.onlineChannel ||
        fields.onlineTitle !== entry.onlineTitle;
    textsOf(fields).forEach(([name, value]: [string, string], index: number): void => {
        if (
            value !== textsOld[index][1] ||
            (name === "summary" && relinked) ||
            (["summary", "location", "x-online"].includes(name) && reonline)
        )
            propertyPut(
                component,
                name,
                value === "" ? [] : [textPropertyOf(name, value, fields)],
            );
    });
    if (JSON.stringify(fields.attendees) !== JSON.stringify(entry.attendees))
        propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
}

/**
 * Sets the `DTSTAMP` of an event or a to-do anew to now once its `DTSTART` or `DUE`
 * changed, so it tells when it got its day, see `written` of {@link Entry}.
 */
function stampRenew(old: string[], component: string[]): void {
    if (
        ["DTSTART", "DUE"].some(
            (name: string): boolean =>
                unfoldedOf(old, name) !== unfoldedOf(component, name),
        )
    )
        propertyPut(component, "dtstamp", [ICAL.Time.fromJSDate(new Date(), true)]);
}

/**
 * Writes the changed lines of an event or a to-do back where they stood in their file,
 * or moves them into another file, like the log of another year: writes them there first,
 * so a failure in between leaves them twice instead of losing them.
 * Its `DTSTAMP` turns now once its day changed, see {@link stampRenew}.
 *
 * @param target - Path of the `.ics` file it belongs into, `file` when it stays
 */
function componentWrite(
    file: string,
    text: FileLines,
    place: [number, number],
    component: string[],
    target: string,
): void {
    const [begin, end]: [number, number] = place;
    stampRenew(text.lines.slice(begin, end), component);
    if (target === file)
        text.lines.splice(begin, end - begin, ...linesOrdered(component));
    else {
        componentInsert(target, component);
        text.lines.splice(begin, end - begin);
    }
    linesWrite(file, text);
}

/**
 * Changes fields and times of the event of an entry,
 * writing only the properties that changed,
 * and moves it into another file when one is given, see {@link componentWrite}.
 *
 * @throws {Error} - When a file lies outside the new system
 *   or does not hold the event once
 */
export function entryChange(
    file: string,
    entry: Entry,
    fields: EntryFields,
    target: string,
): void {
    writeCheck(file);
    writeCheck(target);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, entryIdOf(entry));
    const event: string[] = text.lines.slice(...place);

    textsPut(event, entry, fields);
    if (fields.start.getTime() !== new Date(entry.start).getTime())
        propertyPut(event, "dtstart", [writtenOf(fields.start)]);
    if (fields.end.getTime() !== new Date(entry.end).getTime())
        propertyPut(event, "dtend", [writtenOf(fields.end)]);
    componentWrite(file, text, place, event, target);
}

/**
 * Changes the fields of a to-do, a box of the plan,
 * writing only the properties that changed.
 * A to-do that gets a deadline loses its `DTSTART`, and one that loses its deadline
 * gets one, see {@link todoAppend}.
 * Moves it into another file when one is given, see {@link componentWrite}.
 *
 * @throws {Error} - When a file lies outside the new system
 *   or does not hold the to-do once
 */
export function todoChange(
    file: string,
    entry: Entry,
    fields: TodoFields,
    target: string,
): void {
    writeCheck(file);
    writeCheck(target);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, entryIdOf(entry));
    const todo: string[] = text.lines.slice(...place);

    textsPut(todo, entry, fields);
    const start: string = fields.time === null ? fields.day : fields.time.toISOString();
    if (fields.deadline === "" && (start !== entry.start || entry.deadline !== ""))
        propertyPut(todo, "dtstart", [todoStartOf(fields)]);
    if (fields.deadline !== "" && entry.deadline === "") propertyPut(todo, "dtstart", []);
    if (fields.deadline !== entry.deadline)
        propertyPut(
            todo,
            "due",
            fields.deadline === "" ? [] : [deadlineTimeOf(fields.deadline)],
        );
    if (fields.minutes !== entry.minutes)
        propertyPut(
            todo,
            "estimated-duration",
            fields.minutes === null ? [] : [durationOf(fields.minutes)],
        );
    componentWrite(file, text, place, todo, target);
}

/**
 * Makes the `X-GROUP` of a group of a course, with `X-PINNED=TRUE`
 * while it is the group I pinned, see `pinPut` in `course.ts`.
 */
export function groupPropertyOf(group: string, pinned: boolean): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property("x-group");
    property.setValue(group);
    if (pinned) property.setParameter("x-pinned", "TRUE");
    return property;
}

/** Reads an `X-ROUND`, a parameter of one value as a list of one. */
function roundMarkOf(property: ICAL.Property): RoundMark {
    const listOf: (name: string) => string[] = (name: string): string[] => {
        const value: unknown = property.getParameter(name);
        return value === undefined
            ? []
            : Array.isArray(value)
              ? value.map(String)
              : [String(value)];
    };
    const due: string = listOf("due")[0] ?? "";
    return {
        section: String(property.getFirstValue()),
        round: Number(listOf("round")[0] ?? 0),
        step: listOf("step")[0] ?? "",
        task: listOf("task")[0] ?? "",
        used: listOf("used")[0] ?? "",
        results: listOf("result"),
        notes: listOf("note"),
        due: due === "" ? "" : `${due.slice(0, 4)}-${due.slice(4, 6)}-${due.slice(6, 8)}`,
    };
}

/** Makes an `X-ROUND`, each parameter only when it holds something. */
export function roundPropertyOf(mark: RoundMark): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property("x-round");
    property.setValue(mark.section);
    property.setParameter("round", String(mark.round));
    if (mark.step !== "") property.setParameter("step", mark.step);
    if (mark.task !== "") property.setParameter("task", mark.task);
    if (mark.used !== "") property.setParameter("used", mark.used);
    if (mark.results.length > 0) property.setParameter("result", mark.results);
    if (mark.notes.length > 0) property.setParameter("note", mark.notes);
    if (mark.due !== "") property.setParameter("due", mark.due.replaceAll("-", ""));
    return property;
}

/**
 * Puts new values into properties of the event or to-do with an identifier,
 * replacing all old lines of each,
 * like the end, the `X-CHAPTER`s and the `X-ROUND`s of a skill entry
 * that goes on in a round, a date in Berlin time.
 *
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the event once
 */
export function propertiesPut(
    file: string,
    id: string,
    properties: [string, (string | Date | Link | ICAL.Property)[]][],
): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const event: string[] = text.lines.slice(...place);
    properties.forEach(
        ([name, values]: [string, (string | Date | Link | ICAL.Property)[]]): void =>
            propertyPut(
                event,
                name,
                values.map(
                    (
                        value: string | Date | Link | ICAL.Property,
                    ): string | ICAL.Time | Link | ICAL.Property =>
                        value instanceof Date ? writtenOf(value) : value,
                ),
            ),
    );
    componentWrite(file, text, place, event, file);
}

/**
 * Sets the `DTSTAMP` of an event or a to-do to now, as if it got its day now,
 * like a box of a day over taken back to open,
 * which so stays on its day, missed, see `overKeep` in `boxes.ts`.
 *
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the to-do or the event once
 */
export function stampPut(file: string, id: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const component: string[] = text.lines.slice(...place);
    propertyPut(component, "dtstamp", [ICAL.Time.fromJSDate(new Date(), true)]);
    componentWrite(file, text, place, component, file);
}

/**
 * Sets the summary of a to-do or an event with its link.
 *
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the to-do or the event once
 */
export function titlePut(file: string, id: string, fields: EntryTexts): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const component: string[] = text.lines.slice(...place);
    propertyPut(component, "summary", [textPropertyOf("summary", fields.title, fields)]);
    componentWrite(file, text, place, component, file);
}

/**
 * Sets the state of a box of the plan, its `STATUS`, `COMPLETED` for a done one,
 * without the moment it was done, the `COMPLETED` line iCalendar offers for it,
 * since the log entry written from the box holds its real time.
 *
 * @param status - New `STATUS`, empty to take it out
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the to-do or the event once
 */
export function statusPut(file: string, id: string, status: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const component: string[] = text.lines.slice(...place);
    propertyPut(component, "status", status === "" ? [] : [status]);
    componentWrite(file, text, place, component, file);
}

/**
 * Notes one more push of a box to a later day, before its start and length change,
 * after its `X-PUSHED`s from before, which stay as they are:
 * its start as its `DTSTART` holds it,
 * its length as the parameter `X-ESTIMATED-DURATION`,
 * named and written as the `ESTIMATED-DURATION` of a to-do, which it is,
 * or the time between start and end of an event.
 * `VALUE` says it is a time or a date,
 * since iCalendar reads a property of my own as text without it.
 *
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the to-do or the event once
 */
export function pushAdd(file: string, id: string, entry: Entry): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const component: string[] = text.lines.slice(...place);
    const before: ICAL.Property[] = new ICAL.Component(
        ICAL.parse(component.join("\r\n")),
    ).getAllProperties("x-pushed");
    const minutes: number | null = entry.todo
        ? entry.minutes
        : (Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000);
    const pushed: ICAL.Property = propertyOf(
        "x-pushed",
        entry.allDay
            ? ICAL.Time.fromDateString(entry.start)
            : berlinOf(new Date(entry.start)),
    );
    if (minutes !== null)
        pushed.setParameter("x-estimated-duration", durationOf(minutes));
    propertyPut(component, "x-pushed", [...before, pushed]);
    componentWrite(file, text, place, component, file);
}

/**
 * Removes the event or to-do with an identifier from an `.ics` file.
 *
 * @throws {Error} - When the file lies outside the new system
 *   or does not hold the event once
 */
export function entryRemove(file: string, id: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const [begin, end]: [number, number] = componentFind(text.lines, id);
    text.lines.splice(begin, end - begin);
    linesWrite(file, text);
}

/**
 * Removes a series whole from an `.ics` file, as the bin of its dialog asks,
 * see `plainRemove` in `rules.ts`:
 * every component of its `UID`, the series and every occurrence changed alone.
 * The components are taken out from the last,
 * so one taken out leaves those before it where they are.
 *
 * @returns Whether the file holds no event and no to-do any more
 * @throws {Error} - When the file lies outside the new system, or holds no such series
 */
export function seriesRemove(file: string, uid: string): boolean {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    if (componentsOf(text.lines, uid).length === 0)
        throw new Error(`No series ${uid} in ${file}`);
    const all: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO") begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            if (
                unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(
                    /^UID:/i,
                    "",
                ) === uid
            )
                all.unshift([begin, index + 1]);
            begin = -1;
        }
    });
    all.forEach(([first, after]: [number, number]): void => {
        text.lines.splice(first, after - first);
    });
    linesWrite(file, text);
    return !text.lines.some(
        (line: string): boolean => line === "BEGIN:VEVENT" || line === "BEGIN:VTODO",
    );
}

/**
 * Takes one day out of a series, as the bin of the dialog of one of its boxes asks,
 * see `boxDelete` in `boxes.ts`:
 * its start as one more `EXDATE` in the form of its `DTSTART`, see {@link seriesTimeOf},
 * or, for one of its `RDATE`s, taken out of them instead,
 * and its component of its own, when it has one, taken out,
 * so the day shows no more and every other day of the series stays.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or holds no such series or day
 */
export function seriesDayRemove(file: string, uid: string, recurrence: string): void {
    writeCheck(file);
    const series: ICAL.Event | undefined = calendarOf(file).series.find(
        (candidate: ICAL.Event): boolean => candidate.uid === uid,
    );
    const start: ICAL.Time | undefined =
        series === undefined ? undefined : seriesStartOf(series, recurrence);
    if (series === undefined || start === undefined)
        throw new Error(`No day ${recurrence} of the series ${uid}`);
    const text: FileLines = linesRead(file);
    const own: [number, number][] = componentsOf(text.lines, `${uid}#${recurrence}`);
    own.reverse().forEach(([first, after]: [number, number]): void => {
        text.lines.splice(first, after - first);
    });
    const place: [number, number] = componentFind(text.lines, uid);
    const component: string[] = text.lines.slice(...place);
    const dates: ICAL.Time[] = seriesDatesRead(series);
    if (dates.some((date: ICAL.Time): boolean => date.compare(start) === 0))
        propertyPut(
            component,
            "rdate",
            dates
                .filter((date: ICAL.Time): boolean => date.compare(start) !== 0)
                .map((date: ICAL.Time): ICAL.Property =>
                    seriesTimeOf(series, "rdate", date),
                ),
        );
    else {
        const excluded: string[] = series.component
            .getAllProperties("exdate")
            .map((property: ICAL.Property): string => property.toICALString());
        propertyPut(component, "exdate", [
            ...excluded.map((line: string): ICAL.Property =>
                ICAL.Property.fromString(line),
            ),
            seriesTimeOf(series, "exdate", start),
        ]);
    }
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Gives a day back to a series that left it out, its `EXDATE` at that start taken out,
 * as a session of a group marked cancelled is open again,
 * see `groupApply` in `course.ts`.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or holds no such series or day left out
 */
export function seriesDayRestore(file: string, uid: string, recurrence: string): void {
    writeCheck(file);
    const series: ICAL.Event | undefined = calendarOf(file).series.find(
        (candidate: ICAL.Event): boolean => candidate.uid === uid,
    );
    const excluded: ICAL.Property[] = series?.component.getAllProperties("exdate") ?? [];
    const kept: ICAL.Property[] = excluded.filter(
        (property: ICAL.Property): boolean =>
            textOf(property.getFirstValue() as ICAL.Time) !== recurrence,
    );
    if (kept.length === excluded.length)
        throw new Error(`No day ${recurrence} left out of the series ${uid}`);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, uid);
    const component: string[] = text.lines.slice(...place);
    propertyPut(
        component,
        "exdate",
        kept.map((property: ICAL.Property): ICAL.Property =>
            ICAL.Property.fromString(property.toICALString()),
        ),
    );
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Ends a series at one of its starts,
 * as a group of the tutorials of a module changed from today on ends at its last session
 * before today, see `groupApply` in `course.ts`:
 * its rule with `UNTIL` that start, in UTC for a series with times,
 * as the standard wants it beside a time zone,
 * its `EXDATE`s after it and every occurrence of it changed alone after it taken out,
 * so nothing of it stays after its end.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or holds no such series or start
 */
export function seriesCut(file: string, uid: string, last: string): void {
    writeCheck(file);
    const series: ICAL.Event | undefined = calendarOf(file).series.find(
        (candidate: ICAL.Event): boolean => candidate.uid === uid,
    );
    const end: ICAL.Time | undefined =
        series === undefined ? undefined : seriesStartOf(series, last);
    if (series === undefined || end === undefined)
        throw new Error(`No start ${last} of the series ${uid}`);
    const rule: ICAL.Recur = (
        series.component.getFirstPropertyValue("rrule") as ICAL.Recur
    ).clone();
    rule.until = end.isDate ? end : ICAL.Time.fromJSDate(end.toJSDate(), true);
    const text: FileLines = linesRead(file);
    calendarOf(file)
        .entries.filter(
            (entry: Entry): boolean => entry.id === uid && entry.recurrence > last,
        )
        .flatMap((entry: Entry): [number, number][] =>
            componentsOf(text.lines, entryIdOf(entry)),
        )
        .sort(
            (first: [number, number], second: [number, number]): number =>
                second[0] - first[0],
        )
        .forEach(([first, after]: [number, number]): void => {
            text.lines.splice(first, after - first);
        });
    const place: [number, number] = componentFind(text.lines, uid);
    const component: string[] = text.lines.slice(...place);
    propertyPut(component, "rrule", [ownPropertyOf("rrule", rule.toString())]);
    propertyPut(
        component,
        "exdate",
        series.component
            .getAllProperties("exdate")
            .filter(
                (property: ICAL.Property): boolean =>
                    (property.getFirstValue() as ICAL.Time).compare(end) < 0,
            )
            .map((property: ICAL.Property): ICAL.Property =>
                ICAL.Property.fromString(property.toICALString()),
            ),
    );
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Gives the single dates of a series besides its rule, its `RDATE`s, the earliest first.
 * A period, `VALUE=PERIOD`, is left out, since `ical.js` cannot give its occurrence.
 */
function seriesDatesRead(series: ICAL.Event): ICAL.Time[] {
    return series.component
        .getAllProperties("rdate")
        .flatMap((property: ICAL.Property): unknown[] => property.getValues())
        .filter((value: unknown): value is ICAL.Time => value instanceof ICAL.Time)
        .sort((first: ICAL.Time, second: ICAL.Time): number => first.compare(second));
}

/**
 * Gives the single dates of a series of calendar sources, see {@link seriesDatesRead},
 * like the extras of a plain series, see `rules.ts`.
 */
export function seriesDatesOf(sources: CalendarSource[], uid: string): string[] {
    const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(sources, uid);
    const series: ICAL.Event | undefined =
        found === undefined
            ? undefined
            : calendarOf(found[0]).series.find(
                  (candidate: ICAL.Event): boolean => candidate.uid === uid,
              );
    return series === undefined ? [] : seriesDatesRead(series).map(textOf);
}

/**
 * Writes the single dates of a series besides its rule, its `RDATE`s, one line each,
 * in the form of its `DTSTART`, a day or a time in Berlin time.
 * None takes them all out.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or does not hold the series once
 */
export function seriesDatesPut(file: string, uid: string, starts: string[]): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, uid);
    const component: string[] = text.lines.slice(...place);
    propertyPut(
        component,
        "rdate",
        starts.map((start: string): ICAL.Time =>
            /^\d{4}-\d{2}-\d{2}$/.test(start)
                ? ICAL.Time.fromDateString(start)
                : berlinOf(new Date(start)),
        ),
    );
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Moves one day of a series changed alone, its component of its own,
 * to another series, as a plain series going on from today takes its extras along,
 * see `plainApply` in `rules.ts`: its lines with the `UID` of that series, into its file,
 * then taken out of its own.
 * Its `RECURRENCE-ID` stays, the start of the same single date in the other series.
 *
 * @throws {Error} - When a file lies outside the new system,
 *   or does not hold the day once
 */
export function occurrenceMove(
    file: string,
    id: string,
    uid: string,
    target: string,
): void {
    writeCheck(file);
    writeCheck(target);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const own: string[] = text.lines.slice(...place);
    propertyPut(own, "uid", [uid]);
    if (target === file) {
        text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(own));
        linesWrite(file, text);
        return;
    }
    componentInsert(target, own);
    text.lines.splice(place[0], place[1] - place[0]);
    linesWrite(file, text);
}

/**
 * Finds a series of calendar sources by its `UID`, see `rules.ts`:
 * its file, its first occurrence as an {@link Entry},
 * which holds what the series is, and its rule.
 * A series without `RRULE`, like one of `RDATE`s alone, counts as none.
 */
export function seriesLookup(
    sources: CalendarSource[],
    uid: string,
): [string, Entry, ICAL.Recur] | undefined {
    for (const file of filesOf(sources)) {
        const series: ICAL.Event | undefined = calendarOf(file).series.find(
            (candidate: ICAL.Event): boolean => candidate.uid === uid,
        );
        const rule: unknown = series?.component.getFirstPropertyValue("rrule");
        if (series !== undefined && rule instanceof ICAL.Recur)
            return [file, entryOf(series, series.startDate, series.endDate, file), rule];
    }
    return undefined;
}

/**
 * Writes a to-do that repeats, a series of the plan, as its dialog changes it whole,
 * see `rules.ts`: its `DTSTART`, its `ESTIMATED-DURATION` and its `RRULE`,
 * and its texts but its note, with who I am with.
 * Every occurrence changed alone takes the same texts,
 * so a new summary or place of the series holds on every day,
 * its own times and its own note kept;
 * one left with nothing of its own goes, see {@link occurrencesTidy}.
 * The components are written from the last,
 * so one written anew leaves those before it where they are.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or holds no such series once
 */
export function seriesWrite(
    file: string,
    uid: string,
    fields: TodoFields,
    rule: string,
): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const put: (component: string[], whole: boolean) => void = (
        component: string[],
        whole: boolean,
    ): void => {
        textsOf(fields)
            .filter(([name]: [string, string]): boolean => name !== "description")
            .forEach(([name, value]: [string, string]): void =>
                propertyPut(
                    component,
                    name,
                    value === "" ? [] : [textPropertyOf(name, value, fields)],
                ),
            );
        propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
        if (!whole) return;
        propertyPut(component, "dtstart", [todoStartOf(fields)]);
        propertyPut(
            component,
            "estimated-duration",
            fields.minutes === null ? [] : [durationOf(fields.minutes)],
        );
        propertyPut(component, "rrule", [ownPropertyOf("rrule", rule)]);
    };
    componentFind(text.lines, uid);
    const places: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO") begin = index;
        else if (
            read === "END:VTODO" &&
            begin !== -1 &&
            unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(
                /^UID:/i,
                "",
            ) === uid
        )
            places.unshift([begin, index + 1]);
    });
    places.forEach(([first, after]: [number, number]): void => {
        const component: string[] = text.lines.slice(first, after);
        put(component, unfoldedOf(component, "RECURRENCE-ID") === "");
        text.lines.splice(first, after - first, ...linesOrdered(component));
    });
    linesWrite(file, text);
    occurrencesTidy(file, uid);
}

/**
 * Puts a property into a series of the plan alone,
 * its occurrences changed alone left as they are.
 * Splits a series from a day on, as its dialog asks for a change from today on,
 * see `plainApply` in `rules.ts`: the series ends the day before, see {@link seriesEnd},
 * and each new series that goes on from that day points back to it as its sibling,
 * see {@link seriesSiblingPut}, the standard parameter that tells it apart
 * from the `RELATED-TO` of a log entry, see {@link relatedOf}.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or does not hold the series once
 */
function seriesPut(file: string, uid: string, property: ICAL.Property): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, uid);
    const series: string[] = text.lines.slice(...place);
    propertyPut(series, property.name, [property]);
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(series));
    linesWrite(file, text);
}

/**
 * Ends a series of the plan, its rule with `UNTIL` put into it alone,
 * see {@link seriesPut}.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or does not hold the series once
 */
export function seriesEnd(file: string, uid: string, rule: string): void {
    seriesPut(file, uid, ownPropertyOf("rrule", rule));
}

/**
 * Points a series of the plan to the series it goes on from,
 * `RELATED-TO;RELTYPE=SIBLING:<UID>`, see {@link seriesPut}.
 *
 * @throws {Error} - When the file lies outside the new system,
 *   or does not hold the series once
 */
export function seriesSiblingPut(file: string, uid: string, sibling: string): void {
    const link: ICAL.Property = propertyOf("related-to", sibling);
    link.setParameter("reltype", "SIBLING");
    seriesPut(file, uid, link);
}

/**
 * Finds the parts of a plain series, see `plainRead` in `rules.ts`:
 * a series whose weekdays have other times or lengths is one to-do per time,
 * all of them with the same `X-SERIES`, since a rule has one time for all its days;
 * a series of one time has no `X-SERIES` and is its one part.
 *
 * @returns Its `X-SERIES`, empty for none, and the `UID`s of its parts
 */
export function seriesPartsOf(
    sources: CalendarSource[],
    uid: string,
): [string, string[]] {
    const masters: ICAL.Event[] = filesOf(sources).flatMap(
        (file: string): ICAL.Event[] => calendarOf(file).series,
    );
    const own: ICAL.Event | undefined = masters.find(
        (series: ICAL.Event): boolean => series.uid === uid,
    );
    const key: string = String(own?.component.getFirstPropertyValue("x-series") ?? "");
    if (own === undefined) return ["", []];
    return [
        key,
        key === ""
            ? [uid]
            : masters
                  .filter(
                      (series: ICAL.Event): boolean =>
                          String(
                              series.component.getFirstPropertyValue("x-series") ?? "",
                          ) === key,
                  )
                  .map((series: ICAL.Event): string => series.uid),
    ];
}

/**
 * Finds every series of calendar sources one series goes on from or goes on as:
 * the series itself and, link by link,
 * every series its `RELATED-TO;RELTYPE=SIBLING` names or that names it,
 * so a summary changed renames them all, see `plainApply` in `rules.ts`.
 *
 * @returns Each series of the chain, its file and its `UID`, the series itself first
 */
export function seriesChainOf(
    sources: CalendarSource[],
    uid: string,
): [string, string][] {
    const masters: [string, ICAL.Event][] = filesOf(sources).flatMap(
        (file: string): [string, ICAL.Event][] =>
            calendarOf(file).series.map((series: ICAL.Event): [string, ICAL.Event] => [
                file,
                series,
            ]),
    );
    const linked: (series: ICAL.Event) => string[] = (series: ICAL.Event): string[] =>
        series.component
            .getAllProperties("related-to")
            .filter(
                (link: ICAL.Property): boolean =>
                    String(link.getParameter("reltype") ?? "").toUpperCase() ===
                    "SIBLING",
            )
            .map((link: ICAL.Property): string => String(link.getFirstValue()));
    const found: Map<string, string> = new Map();
    const waiting: string[] = [uid];
    while (waiting.length > 0) {
        const next: string = waiting.shift() as string;
        const own: [string, ICAL.Event] | undefined = masters.find(
            ([, series]: [string, ICAL.Event]): boolean => series.uid === next,
        );
        if (found.has(next) || own === undefined) continue;
        found.set(next, own[0]);
        waiting.push(
            ...linked(own[1]),
            ...masters
                .filter(([, series]: [string, ICAL.Event]): boolean =>
                    linked(series).includes(next),
                )
                .map(([, series]: [string, ICAL.Event]): string => series.uid),
        );
    }
    return [...found.entries()].map(([id, file]: [string, string]): [string, string] => [
        file,
        id,
    ]);
}

/**
 * Writes the summary of a series into every component of its `UID`,
 * the series and every day of it changed alone, past ones too,
 * as a summary changed renames a series whole, see `plainApply` in `rules.ts`.
 *
 * @throws {Error} - When the file lies outside the new system
 */
export function seriesTitlePut(file: string, uid: string, fields: EntryTexts): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const summary: ICAL.Property = textPropertyOf("summary", fields.title, fields);
    const all: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO") begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            if (
                unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(
                    /^UID:/i,
                    "",
                ) === uid
            )
                all.unshift([begin, index + 1]);
            begin = -1;
        }
    });
    all.forEach(([first, after]: [number, number]): void => {
        const component: string[] = text.lines.slice(first, after);
        propertyPut(component, "summary", fields.title === "" ? [] : [summary]);
        text.lines.splice(first, after - first, ...linesOrdered(component));
    });
    linesWrite(file, text);
}

/**
 * Gives the address a name has while nobody typed a real one, as the page gives it,
 * see `standardAddressOf` in `src/day/entries.ts`:
 * the name in small letters, umlauts written out and accents plainly,
 * every other character but a–z and 0–9 a dot, `Vorname` first, then `@invalid`.
 */
function invalidAddressOf(name: string): string {
    const parts: string[] = name.split(", ");
    const local: string = (parts.length === 2 ? `${parts[1]} ${parts[0]}` : name)
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
    return `${local}@invalid`;
}

/**
 * Writes a person anew in every event and to-do of calendar sources that names it,
 * see `personRename` in `persons.ts`:
 * each `ATTENDEE` whose `CN` is the old name takes the new name and,
 * while the person has a mail, that mail, else the address it had,
 * one that never works made anew for the new name, see {@link invalidAddressOf}.
 * A person it names twice so, once moved to the name of another, stays once.
 * Reads every file and works out each of its lines first, and writes only then,
 * as {@link placeLinesRename} does.
 *
 * @param dry - Whether only to count the lines, writing nothing
 * @returns How many lines change
 * @throws {Error} - When a file to write lies outside the new system
 */
export function attendeesRename(
    sources: CalendarSource[],
    old: string,
    name: string,
    mail: string,
    dry: boolean,
): number {
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    filesOf(sources).forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const places: [number, number][] = [];
        let begin: number = -1;
        text.lines.forEach((line: string, index: number): void => {
            if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO") begin = index;
            else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1)
                places.unshift([begin, index + 1]);
        });
        const named: number = count;
        places.forEach(([first, after]: [number, number]): void => {
            const component: string[] = text.lines.slice(first, after);
            const unfolded: string[] = component.reduce(
                (lines: string[], part: string): string[] =>
                    /^[ \t]/.test(part) && lines.length > 0
                        ? [
                              ...lines.slice(0, -1),
                              `${lines[lines.length - 1]}${part.slice(1)}`,
                          ]
                        : [...lines, part],
                [],
            );
            const people: ICAL.Property[] = unfolded
                .filter((line: string): boolean => /^ATTENDEE[;:]/i.test(line))
                .map((line: string): ICAL.Property => ICAL.Property.fromString(line));
            let renamed: boolean = false;
            const written: ICAL.Property[] = people.map(
                (person: ICAL.Property): ICAL.Property => {
                    if (String(person.getParameter("cn") ?? "") !== old) return person;
                    renamed = true;
                    const address: string = String(person.getFirstValue() ?? "").replace(
                        /^mailto:/i,
                        "",
                    );
                    const target: string =
                        mail !== ""
                            ? mail
                            : address.endsWith("@invalid")
                              ? invalidAddressOf(name)
                              : address;
                    const property: ICAL.Property = propertyOf(
                        "attendee",
                        `mailto:${target}`,
                    );
                    property.setParameter("cn", name);
                    return property;
                },
            );
            if (!renamed) return;
            propertyPut(
                component,
                "attendee",
                written.filter(
                    (person: ICAL.Property, at: number): boolean =>
                        written.findIndex(
                            (other: ICAL.Property): boolean =>
                                String(other.getParameter("cn") ?? "") ===
                                String(person.getParameter("cn") ?? ""),
                        ) === at,
                ),
            );
            text.lines.splice(first, after - first, ...linesOrdered(component));
            count++;
        });
        if (count > named) {
            writeCheck(file);
            changes.push([file, text]);
        }
    });
    if (!dry)
        changes.forEach(([file, text]: [string, FileLines]): void =>
            linesWrite(file, text),
        );
    return count;
}

/**
 * A param changed by the pencil of a value, as the page sends it,
 * see {@link paramRename}.
 */
export type ParamRenamed = {
    category: string;
    value: string;
    old: string;
    name: string;
    dry: boolean;
};

/**
 * Writes a param anew in every event and to-do of its category
 * that gives it to its value, as the pencil of a value sends it,
 * see `paramsRename` in `src/day/categories.ts`,
 * alone or among the values of a summary.
 * The same param of another value stays, since each value has its own list of params,
 * see `paramsOf` in `categories.ts`.
 * Reads every file and works out each of its lines first, and writes only then.
 *
 * @returns How many lines change
 * @throws {Error} - When the new param is none or would part the value,
 *   or a file to write lies outside the new system
 */
export function paramRename(sent: ParamRenamed): number {
    if (!/^[^,()]+$/.test(sent.name)) throw new Error(`No param: ${sent.name}`);
    const from: string = `${sent.value} (${sent.old})`;
    const to: string = `${sent.value} (${sent.name})`;
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    calendarFilesOf().forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const named: number = count;
        summariesOf(text.lines)
            .filter((summed: Summed): boolean => summed.category === sent.category)
            .forEach((summed: Summed): void => {
                const property: ICAL.Property = ICAL.Property.fromString(
                    text.lines[summed.index],
                );
                const summary: string = String(property.getFirstValue() ?? "");
                const written: string =
                    summary === from
                        ? to
                        : summary
                              .split(", ")
                              .map((value: string): string =>
                                  value === from ? to : value,
                              )
                              .join(", ");
                if (written === summary) return;
                property.setValue(written);
                text.lines[summed.index] = property.toICALString();
                count++;
            });
        if (count > named) {
            writeCheck(file);
            changes.push([file, text]);
        }
    });
    if (!sent.dry)
        changes.forEach(([file, text]: [string, FileLines]): void =>
            linesWrite(file, text),
        );
    return count;
}

/**
 * Writes a place anew in every event and to-do of calendar sources that names it,
 * see `placeRename` in `places.ts`:
 * each `LOCATION` and each `X-FROM` whose name, see `labelOf` in `places.ts`,
 * is the old name takes the line of the place,
 * a `LOCATION` with its link as `ALTREP`, as {@link textPropertyOf} writes them.
 * A line written so already stays as it is.
 * Reads every file and works out each of its lines first, and writes only then,
 * so a line that cannot be read
 * or a file outside the new system stops it before anything is written.
 * The components are written from the last,
 * so one written anew leaves those before it where they are.
 *
 * @param place - The line it takes, see `lineOf` in `places.ts`
 * @param link - The link a `LOCATION` takes, empty for none, an `X-FROM` has none
 * @param dry - Whether only to count the lines, writing nothing
 * @returns How many lines change
 * @throws {Error} - When a file to write lies outside the new system,
 *   or a line of a place cannot be read
 */
export function placeLinesRename(
    sources: CalendarSource[],
    old: string,
    place: string,
    link: string,
    dry: boolean,
): number {
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    filesOf(sources).forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const places: [number, number][] = [];
        let begin: number = -1;
        text.lines.forEach((line: string, index: number): void => {
            if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO") begin = index;
            else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1)
                places.unshift([begin, index + 1]);
        });
        const named: number = count;
        places.forEach(([first, after]: [number, number]): void => {
            const component: string[] = text.lines.slice(first, after);
            const found: number = count;
            ["location", "x-from"].forEach((name: string): void => {
                const line: string = unfoldedOf(component, name);
                if (line === "") return;
                const value: string = String(
                    ICAL.Property.fromString(line).getFirstValue() ?? "",
                );
                if (labelOf(value) !== old) return;
                const written: ICAL.Property = propertyOf(name, place);
                if (name === "location" && link !== "")
                    written.setParameter("altrep", [link]);
                if (written.toICALString() === line) return;
                propertyPut(component, name, [written]);
                count++;
            });
            if (count > found)
                text.lines.splice(first, after - first, ...linesOrdered(component));
        });
        if (count > named) {
            writeCheck(file);
            changes.push([file, text]);
        }
    });
    if (!dry)
        changes.forEach(([file, text]: [string, FileLines]): void =>
            linesWrite(file, text),
        );
    return count;
}
