/**
 * ## Calendars
 *
 * Reads `.ics` files into entries, their events `VEVENT` and to-dos `VTODO`, and writes them.
 * Keeps each read file until it changes on disk.
 * Every entry states its facts in its own lines.
 * A link, the `ALTREP` of a `SUMMARY` or `LOCATION` or an `ATTACH`, only points to more,
 * since a folder may be renamed or vanish.
 * Writes only into the new system, with times in Berlin time,
 * those of the two hours around a change of the clocks in UTC.
 * Every date, time and duration is in the form of the iCalendar format, also in my own properties.
 * Puts the lines of every entry it writes into one fixed order and folds each line over 100 characters.
 * Every other line stays byte for byte, but for the order of the entries of a file.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import ICAL from "ical.js";
import { mailOf } from "./persons.ts";
import { labelOf, linkForm, platformOfLink } from "./places.ts";
import { calendarRoot, moduleName, modulesRoot, vaultPathOf, writeAllowed } from "./sources.ts";

import type { CalendarSource } from "./sources.ts";

/**
 * One calendar entry.
 *
 * - `id`: Its `UID`, shared by all occurrences of a series.
 * - `category`: Its `CATEGORIES`.
 * - `title`: Its `SUMMARY`, for a skill entry the folder of its skill with its type in round brackets.
 * - `titleLink`: The `ALTREP` of its `SUMMARY`, for a skill entry the folder of its skill.
 * - `location`: Its `LOCATION`, where I physically was.
 * - `locationLink`: The `ALTREP` of its `LOCATION`.
 * - `from`: Where a way starts, its `X-FROM`.
 * - `module`, `type`: Skill and type of a skill entry from its `SUMMARY`.
 * - `semester`: Its `X-SEMESTER`, from which semester the lecture or material is, not when I did it.
 * - `chapters`: Its `X-CHAPTER`s, only in an older skill entry of the log.
 * - `links`: Its `ATTACH`es.
 * - `rounds`: Its `X-ROUND`s.
 * - `foods`: Its `X-FOOD`s, each a food of `Foods.md` by name, brand and store with grams,
 *   an older one by its name alone.
 * - `cooked`: For a meal drawn from a cooking the identifier of that entry, its `X-COOKED`.
 * - `room`: Whether its `LOCATION` is a room of `Rooms.md` of the one who shared it, its `X-ROOM`,
 *   only in a shared copy.
 * - `changed`: Whether a shared copy is a change of an entry shared before, its `X-CHANGED`,
 *   only in a shared copy.
 * - `pain`: My neck pain from 0 to 10 after a long neck session, its `X-PAIN`.
 * - `exercises`: Its `X-EXERCISE`s.
 * - `planned`: Identifier of the box a log entry was logged from.
 * - `note`: Its `DESCRIPTION`.
 * - `todo`: Whether it is a `VTODO`, a box of the plan, else a `VEVENT`.
 * - `minutes`: Its `ESTIMATED-DURATION`, `null` for an event.
 * - `deadline`: Its `DUE`.
 * - `pushed`: Its `X-PUSHED`s.
 * - `number`: Its `X-NUMBER` in its series, `NONE` for one the university cancelled.
 * - `group`: Its `X-GROUP` as TUMonline names it.
 * - `pinned`: Whether a group of the course is the one I pinned.
 * - `written`: When the entry got its day, its `DTSTAMP`,
 *   set anew with the day of its `DTSTART` or `DUE`.
 * - `version`: SHA-256 of its lines as read, for an occurrence that of its series.
 *   The dialog sends it back, so the reader writes nothing older than the file.
 * - `editable`: Whether it lies in the new system and has times or is a to-do, also one occurrence.
 * - `start`: ISO instant, or a date when all-day.
 *   A to-do with a deadline but no `DTSTART` is the whole day of its deadline.
 * - `end`: End, excluded, in the same form as `start`.
 *   A to-do with a time ends where it starts, since how long it takes is its `minutes`.
 * - `recurrence`: For an occurrence its start as the series has it, or its `RECURRENCE-ID`.
 * - `file`: Its `.ics` file from `NomWorkspace` on.
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
    room: boolean;
    changed: boolean;
    pain: string;
    exercises: string[];
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
 * What an entry did online, one `X-ONLINE` with a platform of `Online.md` as value,
 * the link of its meeting or video as `ALTREP`, its channel `X-CHANNEL`, its title `X-TITLE`.
 */
export type Online = {
    online: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
};

/**
 * A person or a group I was with, one `ATTENDEE` with its name as `CN`.
 * Its address ends in `.invalid` unless real, so the line keeps to the standard and nothing is ever sent.
 */
export type Attendee = {
    name: string;
    address: string;
};

/**
 * Where a box stood before one push, one `X-PUSHED`.
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
 * A link to a file or a folder, one `ATTACH`, its value a path from `NomWorkspace`,
 * never absolute, since `NomWorkspace` lies elsewhere on each computer.
 * A file has the SHA-256 of its content as `X-SHA256`, so the link survives a rename.
 * The value is no full URI, so other calendar apps may ignore it.
 */
export type Link = {
    path: string;
    fingerprint: string;
};

/**
 * A line `X-ROUND` of a skill entry, where I stand in the round of a section and what I did in it,
 * its section as value, the rest as parameters.
 *
 * - `section`: Name of its note, with its module before `/` once the entry's skill changed.
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
 * Text fields of an entry to write, an empty field not written.
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
 * Fields of a to-do to write.
 *
 * - `day`: Its `DTSTART;VALUE=DATE` without time, with a deadline its day and no `DTSTART`.
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

/** Read calendars by their file path. */
const calendars: Map<string, Calendar> = new Map();

/** What runs each time a plan or a log of a module is written. */
const writtenFollowers: ((module: string, kinds: [string, string][]) => void)[] = [];

/** What runs each time a summary is written anew with a link. */
const linkFollowers: ((category: string, summary: string, link: string) => void)[] = [];

/** Time zone of the times the dashboard writes, while I live in Germany. */
const zoneName: string = "Europe/Berlin";

/** Definition of {@link zoneName} as written into each new file. */
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
 * The one order of the lines of every entry by their properties,
 * so I find each line where I expect it when I read a file by hand.
 * Every other line comes after them in the order it had, a repeated property kept together.
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
    "X-PUSHED",
    "X-SERIES",
    "X-NUMBER",
    "X-GROUP",
    "X-FOOD",
    "X-COOKED",
    "X-EXERCISE",
    "X-PAIN",
    "X-SEMESTER",
    "X-CHAPTER",
    "X-ROUND",
];

/**
 * The parameter `ALTREP` always in double quotes, as the standard writes a link.
 * `ical.js` quotes only a value with `,`, `:` or `;`, or of a parameter of several values asking for it,
 * so `ALTREP` is described as one.
 */
ICAL.design.icalendar.param.altrep = { multiValue: ",", multiValueSeparateDQuote: true };

/**
 * The parameters `RESULT` and `NOTE` of an `X-ROUND`, lists of several values,
 * each note in double quotes, a `"` in one written `^'` and a line break `^n` (RFC 6868).
 */
ICAL.design.icalendar.param.result = { multiValue: "," };
ICAL.design.icalendar.param.note = { multiValue: ",", multiValueSeparateDQuote: true };

/**
 * Every `X-` property of my own as text of the standard, each `\`, `;` and `,` escaped and a line break `\n`.
 * `ical.js` writes an `X-` value raw, so a line break in one broke the file.
 * `X-PUSHED` names its own type, `VALUE=DATE-TIME`.
 */
const ownTexts: string[] = lineOrder
    .filter((name: string): boolean => name.startsWith("X-") && name !== "X-PUSHED")
    .map((name: string): string => name.toLowerCase());
ownTexts.forEach((name: string): void => {
    ICAL.design.icalendar.property[name] = { defaultType: "text" };
});

/** Most characters of a line of an `.ics` file, its line break not counted. */
const lineMost: number = 100;

/**
 * Folds a line into parts of at most {@link lineMost} characters, each after the first starting with a space.
 * It folds right after a space of the text where one fits, so a place stays whole,
 * since the space of the fold never counts as text, else inside like a long link.
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
 * The lines of a component unfolded, one per property.
 * `ical.js` folds after 75 bytes, which cut a place in two, so each fold is taken back.
 */
function linesOf(component: ICAL.Component): string[] {
    return component
        .toString()
        .replace(/\r\n[ \t]/g, "")
        .split("\r\n");
}

/** Category of skill entries, whose `ALTREP` of the `SUMMARY` names their skill and type. */
export const skillName: string = "Skill";

/**
 * The skill and type of a skill entry from its `SUMMARY`, also of a row of `Skills.md` from its name,
 * a module by its code, the part before the first `_`, a project by its name.
 * Its type is one word of letters and digits in round brackets at its end.
 */
export function skillPartsOf(summary: string): [string, string] {
    const parts: RegExpExecArray | null = /^(.*?)\s*(?:\(([\p{L}\p{N}]+)\))?$/u.exec(summary.trim());
    const name: string = parts?.[1] ?? "";
    return [moduleName.test(name) ? name.split("_")[0] : name, parts?.[2] ?? ""];
}

/** The type of a skill entry from its line `SUMMARY`. */
function summaryTypeOf(line: string): string {
    return skillPartsOf(String(ICAL.Property.fromString(line).getFirstValue() ?? ""))[1];
}

/** Turns an `ical.js` time into the form of {@link Entry}. */
function textOf(time: ICAL.Time): string {
    return time.isDate ? time.toString() : time.toJSDate().toISOString();
}

/** Reads a parameter of the first property of a name, empty for none. */
function paramOf(component: ICAL.Component, name: string, param: string): string {
    return String(component.getFirstProperty(name)?.getParameter(param) ?? "");
}

/** Reads a date or a time in the iCalendar form, as a parameter of my own holds it. */
function icsTimeRead(value: string): ICAL.Time {
    return /^\d{8}$/.test(value)
        ? ICAL.Time.fromDateString(ICAL.design.icalendar.value.date.fromICAL(value))
        : ICAL.Time.fromDateTimeString(ICAL.design.icalendar.value["date-time"].fromICAL(value));
}

/** Writes a date or an instant in the iCalendar form, an instant in UTC. */
export function icsTextOf(text: string): string {
    const time: ICAL.Time = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? ICAL.Time.fromDateString(text)
        : ICAL.Time.fromJSDate(new Date(text), true);
    return time.toICALString();
}

/**
 * Writes an `X-EXERCISE` with the seconds of an exercise on time as an iCalendar duration.
 * Repetitions and a part left empty stay as they are.
 */
export function sportIcsOf(line: string): string {
    const parts: string[] = line.split(";");
    const time: string = (parts[2] ?? "").trim();
    if (!/^\d+\s*s$/.test(time)) return line;
    parts[2] = ICAL.Duration.fromSeconds(parseInt(time, 10)).toString();
    return parts.join(";");
}

/** Reads back what {@link sportIcsOf} writes, a time no duration can be read of as it is. */
function sportLineOf(line: string): string {
    const parts: string[] = line.split(";");
    if (!/^P/i.test((parts[2] ?? "").trim())) return line;
    try {
        parts[2] = `${ICAL.Duration.fromString(parts[2].trim()).toSeconds()}s`;
    } catch {
        return line;
    }
    return parts.join(";");
}

/**
 * The box a log entry was logged from, the `UID` of its `RELATED-TO`,
 * for a date of a series with its `X-RECURRENCE-ID` after `#`.
 * Only a parent `RELATED-TO` names that box, one with `RELTYPE=SIBLING` the series it goes on from.
 */
function plannedOf(component: ICAL.Component): string {
    const related: ICAL.Property | undefined = component
        .getAllProperties("related-to")
        .find((property: ICAL.Property): boolean =>
            ["", "PARENT"].includes(String(property.getParameter("reltype") ?? "").toUpperCase()),
        );
    if (related === undefined) return "";
    const recurrence: string = String(related.getParameter("x-recurrence-id") ?? "");
    return recurrence === ""
        ? String(related.getFirstValue())
        : `${related.getFirstValue()}#${textOf(icsTimeRead(recurrence))}`;
}

/** Reads one `X-PUSHED`, a push that noted only its day at the time of day the box has now. */
function pushOf(property: ICAL.Property, now: ICAL.Time | null): Push {
    const value: ICAL.Time = property.getFirstValue() as ICAL.Time;
    const day: string = value.toString().slice(0, 10);
    const duration: string = String(property.getParameter("x-estimated-duration") ?? "");
    const time: ICAL.Time | null = value.isDate ? now : value;
    return {
        day: day,
        time: time === null ? "" : berlinAt(day, time.hour, time.minute, time.second).toJSDate().toISOString(),
        minutes: duration === "" ? null : ICAL.Duration.fromString(duration).toSeconds() / 60,
    };
}

/** The `ESTIMATED-DURATION` of a to-do in minutes, which `ical.js` does not know, so it gives text. */
function estimatedMinutesOf(component: ICAL.Component): number | null {
    const value: unknown = component.getFirstPropertyValue("estimated-duration");
    return value === null ? null : ICAL.Duration.fromString(String(value)).toSeconds() / 60;
}

/** The whole day of the deadline of a to-do without `DTSTART`, in Berlin time. */
function deadlineDayOf(component: ICAL.Component): [ICAL.Time, ICAL.Time] {
    const due: ICAL.Time = component.getFirstPropertyValue("due") as ICAL.Time;
    const day: string = due.isDate ? due.toString() : berlinDateOf(due.toJSDate());
    return [ICAL.Time.fromDateString(day), ICAL.Time.fromDateString(dayAdd(day, 1))];
}

/** Whether a link is that of a platform of `Online.md`. */
function platformLinkIs(link: string): boolean {
    return linkForm.test(link) && platformOfLink(link) !== undefined;
}

/** Where an entry was and what it did online, with the link of its summary. */
type Placed = Online & Pick<Entry, "titleLink" | "location" | "locationLink">;

/**
 * Where an entry was and what it did online, from its `X-ONLINE` and `LOCATION`.
 * An older place `Online, <platform>` reads as online, its own `X-ONLINE` winning.
 */
function onlineOf(component: ICAL.Component): Placed {
    const line: string = String(component.getFirstPropertyValue("location") ?? "");
    const lineLink: string = paramOf(component, "location", "altrep");
    const own: ICAL.Property | null = component.getFirstProperty("x-online");
    const parts: string[] = line.split(",").map((part: string): string => part.trim());
    const placed: boolean = parts[0] === "Online";
    return {
        online: own !== null ? String(own.getFirstValue() ?? "") : placed ? (parts[1] ?? "Online") : "",
        onlineLink: own !== null ? String(own.getParameter("altrep") ?? "") : placed ? lineLink : "",
        onlineChannel: String(own?.getParameter("x-channel") ?? ""),
        onlineTitle: String(own?.getParameter("x-title") ?? ""),
        titleLink: paramOf(component, "summary", "altrep"),
        location: placed ? "" : line,
        locationLink: placed ? "" : lineLink,
    };
}

/**
 * An event or a to-do with a start and an end as an {@link Entry}.
 *
 * @param event - Event, the series of an occurrence, or a to-do
 */
function entryOf(event: ICAL.Event, start: ICAL.Time, end: ICAL.Time, file: string): Entry {
    const todo: boolean = event.component.name === "vtodo";
    const valueOf: (name: string) => string = (name: string): string =>
        String(event.component.getFirstPropertyValue(name) ?? "");
    const valuesOf: (name: string) => string[] = (name: string): string[] =>
        event.component
            .getAllProperties(name)
            .map((property: ICAL.Property): string => String(property.getFirstValue()));
    const category: string = valueOf("categories");
    const online: Placed = onlineOf(event.component);
    const [module, type]: [string, string] = category === skillName ? skillPartsOf(event.summary ?? "") : ["", ""];
    const stamp: unknown = event.component.getFirstPropertyValue("dtstamp");
    const due: unknown = event.component.getFirstPropertyValue("due");
    let recurrence: string = "";
    if (event.isRecurrenceException()) recurrence = textOf(event.recurrenceId);
    else if (event.isRecurring()) recurrence = textOf(start);
    return {
        id: event.uid,
        category: category,
        title: event.summary ?? "",
        ...online,
        from: valueOf("x-from"),
        attendees: event.component.getAllProperties("attendee").map((property: ICAL.Property): Attendee => {
            const address: string = String(property.getFirstValue()).replace(/^mailto:/i, "");
            return {
                name: String(property.getParameter("cn") ?? address),
                address: address,
            };
        }),
        module: module,
        type: type,
        semester: valueOf("x-semester"),
        chapters: valuesOf("x-chapter"),
        links: event.component.getAllProperties("attach").map((property: ICAL.Property): Link => ({
            path: String(property.getFirstValue()),
            fingerprint: String(property.getParameter("x-sha256") ?? ""),
        })),
        rounds: event.component.getAllProperties("x-round").map(roundMarkOf),
        foods: valuesOf("x-food"),
        cooked: valueOf("x-cooked"),
        room: valueOf("x-room").toUpperCase() === "TRUE",
        changed: valueOf("x-changed").toUpperCase() === "TRUE",
        pain: valueOf("x-pain"),
        exercises: valuesOf("x-exercise").map(sportLineOf),
        planned: plannedOf(event.component),
        note: event.description ?? "",
        todo: todo,
        status: valueOf("status"),
        minutes: todo ? estimatedMinutesOf(event.component) : null,
        deadline: todo && due instanceof ICAL.Time ? textOf(due) : "",
        pushed: event.component
            .getAllProperties("x-pushed")
            .map((property: ICAL.Property): Push => pushOf(property, start.isDate ? null : berlinOf(start.toJSDate()))),
        number: valueOf("x-number"),
        group: valueOf("x-group"),
        pinned: paramOf(event.component, "x-group", "x-pinned").toUpperCase() === "TRUE",
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
 * Reads an `.ics` file, a to-do without `DTSTART` on the day of its deadline, one with neither left out.
 * Registers the time zones of the file first, so times with a `TZID` convert correctly.
 * A changed occurrence is an entry of its own, its series knowing it replaces the old one.
 *
 * @param text - What the file holds, read from it when left out
 */
function calendarRead(file: string, modified: number, text: string = readFileSync(file, "utf8")): Calendar {
    const root: ICAL.Component = new ICAL.Component(ICAL.parse(text));
    root.getAllSubcomponents("vtimezone").forEach((zone: ICAL.Component): void => ICAL.TimezoneService.register(zone));

    const events: ICAL.Event[] = [
        ...root.getAllSubcomponents("vevent"),
        ...root
            .getAllSubcomponents("vtodo")
            .filter((todo: ICAL.Component): boolean => todo.hasProperty("dtstart") || todo.hasProperty("due")),
    ].map((component: ICAL.Component): ICAL.Event => new ICAL.Event(component));
    const series: Map<string, ICAL.Event> = new Map(
        events
            .filter((event: ICAL.Event): boolean => event.isRecurring())
            .map((event: ICAL.Event): [string, ICAL.Event] => [event.uid, event]),
    );
    events
        .filter((event: ICAL.Event): boolean => event.isRecurrenceException())
        .forEach((change: ICAL.Event): void => series.get(change.uid)?.relateException(change));

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

/** The calendar of a file, read again only when the file changed on disk. */
function calendarOf(file: string): Calendar {
    const modified: number = statSync(file).mtimeMs;
    const known: Calendar | undefined = calendars.get(file);
    if (known?.modified === modified) return known;

    const calendar: Calendar = calendarRead(file, modified);
    calendars.set(file, calendar);
    return calendar;
}

/** The `.ics` files of calendar sources, none of a folder not there yet. */
function filesOf(sources: CalendarSource[]): string[] {
    return sources
        .filter((source: CalendarSource): boolean => existsSync(source.folder))
        .flatMap((source: CalendarSource): string[] =>
            readdirSync(source.folder, { recursive: true, encoding: "utf8" })
                .filter((name: string): boolean => name.endsWith(source.ending))
                .map((name: string): string => join(source.folder, name)),
        );
}

/** Finds the series with a `UID` in an `.ics` file, `undefined` for none. */
function seriesOf(file: string, uid: string): ICAL.Event | undefined {
    return calendarOf(file).series.find((series: ICAL.Event): boolean => series.uid === uid);
}

/** The bounds of a range in the form of an entry. */
function boundsOf(allDay: boolean, range: Range): [string, string] {
    return allDay ? range.days : range.instants;
}

/** The occurrences of a series before the end of a range, but the replaced ones, which are entries of their own. */
function occurrencesOf(series: ICAL.Event, range: Range, file: string): Entry[] {
    const occurrences: Entry[] = [];
    const walk: ICAL.RecurExpansion = series.iterator();

    let start: ICAL.Time | undefined = walk.next();
    while (start !== undefined && textOf(start) < boundsOf(start.isDate, range)[1]) {
        const details: { item: ICAL.Event; startDate: ICAL.Time; endDate: ICAL.Time } =
            series.getOccurrenceDetails(start);
        if (details.item === series) occurrences.push(entryOf(series, details.startDate, details.endDate, file));
        start = walk.next();
    }
    return occurrences;
}

/**
 * The entries of calendar sources that start in a range or overlap it,
 * so a to-do with a time that ends where it starts is found too.
 * All-day entries compare by their dates, so a birthday stays on its date in every time zone.
 *
 * @param kept - Whether an entry is wanted, a series by its first occurrence, so one not wanted is never walked
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
                .flatMap((series: ICAL.Event): Entry[] => occurrencesOf(series, range, file)),
        ])
        .filter((entry: Entry): boolean => {
            const [from, to]: [string, string] = boundsOf(entry.allDay, range);
            return entry.start < to && (entry.start >= from || entry.end > from);
        });
}

/** The entries of calendar sources that happen once, changed occurrences too, whenever they lie. */
export function entriesOnceRead(sources: CalendarSource[]): Entry[] {
    return filesOf(sources).flatMap((file: string): Entry[] => calendarOf(file).entries);
}

/** The entries of one `.ics` file that happen once. */
export function fileEntriesRead(file: string): Entry[] {
    return calendarOf(file).entries;
}

/** The entries that happen once of the text of an `.ics` file nowhere on my disk, like one by SSH. */
export function textEntriesRead(text: string, name: string): Entry[] {
    return calendarRead(name, 0, text).entries;
}

/** Looks for the one event or to-do with an identifier, never an occurrence of a series. */
export function entryLookup(sources: CalendarSource[], id: string): [string, Entry] | undefined {
    return occurrenceLookup(sources, id, "");
}

/** The `.ics` file of the event, to-do or series with an identifier. */
export function fileOfId(sources: CalendarSource[], id: string): string | undefined {
    return filesOf(sources).find(
        (file: string): boolean =>
            calendarOf(file).entries.some((entry: Entry): boolean => entry.id === id) ||
            calendarOf(file).series.some((series: ICAL.Event): boolean => series.uid === id),
    );
}

/**
 * Looks for an occurrence by the `UID` of its series and its start as the series has it,
 * a changed one first, an empty start finding the entry that happens once.
 * Its range ends a moment after that start, so walking the series stops right after it.
 */
export function occurrenceLookup(
    sources: CalendarSource[],
    id: string,
    recurrence: string,
): [string, Entry] | undefined {
    for (const file of filesOf(sources)) {
        const changed: Entry | undefined = calendarOf(file).entries.find(
            (candidate: Entry): boolean => candidate.id === id && candidate.recurrence === recurrence,
        );
        if (changed !== undefined) return [file, changed];
        if (recurrence === "") continue;

        const series: ICAL.Event | undefined = seriesOf(file, id);
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
 * Finds the one event or to-do with an identifier.
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
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${file}`);
}

/** Reads an `.ics` file as lines unfolded, so a file written back is folded anew. */
function linesRead(file: string): FileLines {
    const text: string = readFileSync(file, "utf8");
    const newline: string = text.includes("\r\n") ? "\r\n" : "\n";
    const lines: string[] = [];
    text.split(newline).forEach((line: string): void => {
        if (/^[ \t]/.test(line) && lines.length > 0) lines[lines.length - 1] += line.slice(1);
        else lines.push(line);
    });
    return { lines: lines, newline: newline };
}

/**
 * Changes the lines of an `.ics` file of the new system and writes them back.
 *
 * @param change - Changes the lines in place, telling whether to write them
 * @throws {Error} - When the file lies outside the new system
 */
function fileChange(file: string, change: (text: FileLines) => boolean): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    if (change(text)) linesWrite(file, text);
}

/** Takes entries out of the lines of a file by their places, from the last, so those before stay where they are. */
function placesCut(lines: string[], places: [number, number][]): void {
    [...places]
        .sort((first: [number, number], second: [number, number]): number => second[0] - first[0])
        .forEach(([first, after]: [number, number]): void => {
            lines.splice(first, after - first);
        });
}

/**
 * Changes entries of the lines of a file by their places, from the last, so those before stay where they are,
 * each one changed in the fixed order of its lines.
 *
 * @param change - Changes the lines of one in place, giving how many of them changed
 * @returns How many lines changed
 */
function placesChange(lines: string[], places: [number, number][], change: (component: string[]) => number): number {
    return [...places].reverse().reduce((count: number, [first, after]: [number, number]): number => {
        const component: string[] = lines.slice(first, after);
        const changed: number = change(component);
        if (changed > 0) lines.splice(first, after - first, ...linesOrdered(component));
        return count + changed;
    }, 0);
}

/** The first lines of an event and of a to-do. */
const begins: string[] = ["BEGIN:VEVENT", "BEGIN:VTODO"];

/** The last lines of an event and of a to-do. */
const ends: string[] = ["END:VEVENT", "END:VTODO"];

/** Types of the entries of a module in the order they stand in its file. */
const typeOrder: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA"];

/**
 * Puts the entries of an `.ics` file into one order, so the file reads well for me too, each line as it is.
 * A module file goes by {@link typeOrder}, then by start, the groups after the boxes of their type.
 * Every other file goes by start alone.
 * A series is followed right by its occurrences changed alone.
 * A file it cannot read so, like one whose last entry has no end, stays as it is.
 */
export function componentsSorted(lines: string[], module: boolean): string[] {
    const head: string[] = [];
    const blocks: string[][] = [];
    const rest: string[] = [];
    let block: string[] | null = null;
    let depth: number = 0;
    lines.forEach((line: string): void => {
        if (block === null && depth === 1 && begins.includes(line)) block = [];
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

    const starts: Map<string[], string> = new Map(
        blocks.map((component: string[]): [string[], string] => [
            component,
            timeOf(component, "DTSTART") || timeOf(component, "DUE"),
        ]),
    );
    const units: string[][][] = [];
    const series: Map<string, string[][]> = new Map();
    blocks
        .map((component: string[]): [string[], string] => [component, timeOf(component, "RECURRENCE-ID")])
        .sort((first: [string[], string], second: [string[], string]): number => first[1].localeCompare(second[1]))
        .forEach(([component, recurrence]: [string[], string]): void => {
            const unit: string[][] | undefined =
                recurrence === "" ? undefined : series.get(unfoldedOf(component, "UID"));
            if (unit !== undefined) unit.push(component);
            else units.push([component]);
            if (recurrence === "") series.set(unfoldedOf(component, "UID"), units[units.length - 1]);
        });

    const keyOf: (unit: string[][]) => [number, string, number, string] = (
        unit: string[][],
    ): [number, string, number, string] => {
        const summary: string = module ? unfoldedOf(unit[0], "SUMMARY") : "";
        const type: string = summary === "" ? "" : summaryTypeOf(summary);
        const place: number = typeOrder.indexOf(type);
        const group: boolean = unfoldedOf(unit[0], "X-GROUP") !== "" && unfoldedOf(unit[0], "X-NUMBER") === "";
        return [
            place !== -1 ? place : type !== "" ? typeOrder.length : typeOrder.length + 1,
            type,
            group ? 1 : 0,
            starts.get(unit[0]) ?? "",
        ];
    };
    units.sort((first: string[][], second: string[][]): number => {
        const [one, other]: [number, string, number, string][] = [keyOf(first), keyOf(second)];
        return (
            one[0] - other[0] || one[1].localeCompare(other[1]) || one[2] - other[2] || one[3].localeCompare(other[3])
        );
    });
    return [...head, ...units.flat(2), ...rest];
}

/**
 * A summary of an entry of a file.
 * `index` is that of its line `SUMMARY`, `summary` the whole, its round brackets too, which a link is shared by.
 */
type Summed = {
    index: number;
    category: string;
    summary: string;
    link: string;
};

/** A summary without what stands in round brackets at its end. */
export function summaryBaseOf(summary: string): string {
    return summary.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

/** The summaries of the entries of the lines of a file. */
function summariesOf(lines: string[]): Summed[] {
    const found: Summed[] = [];
    let category: string = "";
    let index: number = -1;
    let depth: number = 0;
    lines.forEach((line: string, at: number): void => {
        if (line.startsWith("BEGIN:")) depth++;
        if (depth === 2 && begins.includes(line)) [category, index] = ["", -1];
        else if (depth === 2 && line.startsWith("CATEGORIES:")) category = line.slice("CATEGORIES:".length);
        else if (depth === 2 && /^SUMMARY[;:]/.test(line)) index = at;
        else if (depth === 2 && ends.includes(line) && index >= 0) {
            const property: ICAL.Property = ICAL.Property.fromString(lines[index]);
            found.push({
                index: index,
                category: category,
                summary: String(property.getFirstValue() ?? "").trim(),
                link: String(property.getParameter("altrep") ?? ""),
            });
        }
        if (line.startsWith("END:")) depth--;
    });
    return found;
}

/** The summaries of a file as read, with its time of change then. */
type SummariesRead = {
    modified: number;
    summaries: Summed[];
};

/** Read summaries by their file path, so a link is looked up again only in a file changed since. */
const summariesKept: Map<string, SummariesRead> = new Map();

/** The summaries of the entries of a file, read again only when the file changed on disk. */
function summariesRead(file: string): Summed[] {
    const modified: number = statSync(file).mtimeMs;
    const known: SummariesRead | undefined = summariesKept.get(file);
    if (known?.modified === modified) return known.summaries;

    const summaries: Summed[] = summariesOf(linesRead(file).lines);
    summariesKept.set(file, { modified: modified, summaries: summaries });
    return summaries;
}

/** Every `.ics` file of plan and log. */
function calendarFilesOf(): string[] {
    return readdirSync(calendarRoot, { recursive: true, encoding: "utf8" })
        .filter((path: string): boolean => path.endsWith(".ics"))
        .map((path: string): string => join(calendarRoot, path));
}

/**
 * The link every entry of a category with the same summary shares, its round brackets too,
 * never that of a platform online.
 */
export function sharedLinkOf(category: string, summary: string): string | undefined {
    const whole: string = summary.trim();
    for (const file of calendarFilesOf()) {
        const found: Summed | undefined = summariesRead(file).find(
            (summed: Summed): boolean =>
                summed.category === category &&
                summed.summary === whole &&
                summed.link !== "" &&
                !platformLinkIs(summed.link),
        );
        if (found !== undefined) return found.link;
    }
    return undefined;
}

/**
 * Writes lines into an `.ics` file, its entries in their order, every line folded.
 * A summary written anew with a link gives it to every entry of its category with the same summary,
 * its round brackets too, so one summary has one link everywhere, beyond the calendars too.
 * The link of a platform online is never given.
 *
 * @param spread - Whether it spreads a link, not for the files a spread writes, so they spread it no further
 */
function linesWrite(file: string, text: FileLines, spread: boolean = true): void {
    const before: string[] = existsSync(file) ? linesRead(file).lines : [];
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
        file,
        componentsSorted(text.lines, dirname(file) === modulesRoot)
            .flatMap(foldedOf)
            .join(text.newline),
    );
    if (dirname(file) === modulesRoot)
        writtenFollowers.forEach((follower: (module: string, kinds: [string, string][]) => void): void =>
            follower(basename(file).replace(/_(Plan|Log)\.ics$/, ""), kindsOf(text.lines)),
        );
    if (!spread || !file.startsWith(`${calendarRoot}/`)) return;
    const changed: Summed[] = summariesOf(text.lines).filter(
        (summed: Summed): boolean =>
            summed.category !== "" &&
            summed.link !== "" &&
            !before.includes(text.lines[summed.index]) &&
            !platformLinkIs(summed.link),
    );
    if (changed.length === 0) return;
    changed.forEach((summed: Summed): void =>
        linkFollowers.forEach((follower: (category: string, summary: string, link: string) => void): void =>
            follower(summed.category, summed.summary, summed.link),
        ),
    );
    calendarFilesOf().forEach((path: string): void => linkSpread(path, changed));
}

/** Gives the summaries of a file the links of summaries written anew, writing only what changed where I may. */
function linkSpread(file: string, changed: Summed[]): void {
    if (!writeAllowed(file)) return;
    const text: FileLines = linesRead(file);
    let spread: boolean = false;
    summariesOf(text.lines).forEach((summed: Summed): void => {
        const rule: Summed | undefined = changed.find(
            (one: Summed): boolean => one.category === summed.category && one.summary === summed.summary,
        );
        if (rule === undefined || rule.link === summed.link) return;
        const property: ICAL.Property = ICAL.Property.fromString(text.lines[summed.index]);
        property.setParameter("altrep", rule.link);
        text.lines[summed.index] = property.toICALString();
        spread = true;
    });
    if (spread) linesWrite(file, text, false);
}

/**
 * Takes what runs each time a plan or a log of a module is written.
 * It registers itself, since its file reads this one and this one may not read it in turn.
 */
export function writtenFollow(follower: (module: string, kinds: [string, string][]) => void): void {
    writtenFollowers.push(follower);
}

/**
 * Takes what runs each time a summary is written anew with a link, given the whole summary.
 * It registers itself, since its file reads this one and this one may not read it in turn.
 */
export function linkFollow(follower: (category: string, summary: string, link: string) => void): void {
    linkFollowers.push(follower);
}

/** The type and semester of each skill entry of the lines of a file. */
function kindsOf(lines: string[]): [string, string][] {
    const kinds: [string, string][] = [];
    let type: string = "";
    let semester: string = "";
    lines.forEach((line: string): void => {
        if (begins.includes(line)) [type, semester] = ["", ""];
        else if (line.startsWith("SUMMARY")) type = summaryTypeOf(line);
        else if (line.startsWith("X-SEMESTER:")) semester = line.slice("X-SEMESTER:".length).trim();
        else if (ends.includes(line) && type !== "" && semester !== "") kinds.push([type, semester]);
    });
    return kinds;
}

/**
 * The lines of an empty calendar, only the header the standard asks for and the time zone.
 * No `X-WR-CALNAME`, since its name is that of its file, no `CALSCALE`, since `GREGORIAN` is the default,
 * and no `METHOD`, which only invitations need.
 */
function newLinesOf(): string[] {
    const root: ICAL.Component = new ICAL.Component("vcalendar");
    root.addPropertyWithValue("prodid", "-//NomSystem//Dashboard//DE");
    root.addPropertyWithValue("version", "2.0");
    root.addSubcomponent(zoneComponent);
    return [...linesOf(root), ""];
}

/** Puts the lines of an entry into {@link lineOrder}, the components inside it, like an alarm, at its end. */
function linesOrdered(component: string[]): string[] {
    const properties: [number, string][] = [];
    const inner: string[] = [];
    let depth: number = 0;
    component.slice(1, -1).forEach((line: string): void => {
        const rank: number = lineOrder.indexOf(line.split(/[;:]/)[0].toUpperCase());
        if (line.startsWith("BEGIN:")) depth++;
        if (depth > 0) inner.push(line);
        else properties.push([rank === -1 ? lineOrder.length : rank, line]);
        if (line.startsWith("END:")) depth--;
    });
    return [
        component[0],
        ...properties
            .sort((first: [number, string], second: [number, string]): number => first[0] - second[0])
            .map(([, line]: [number, string]): string => line),
        ...inner,
        component[component.length - 1],
    ];
}

/**
 * Puts an entry before the last `END:VCALENDAR` of a file, a missing file created.
 *
 * @throws {Error} - When the file has no line `END:VCALENDAR`
 */
function componentInsert(file: string, event: string[]): void {
    const text: FileLines = existsSync(file) ? linesRead(file) : { lines: newLinesOf(), newline: "\r\n" };
    const calendarEnd: number = text.lines.lastIndexOf("END:VCALENDAR");
    if (calendarEnd === -1) throw new Error(`No END:VCALENDAR in ${file}`);

    text.lines.splice(calendarEnd, 0, ...linesOrdered(event));
    linesWrite(file, text);
}

/**
 * Finds the first property of a name in an entry, not in the components inside it.
 *
 * @returns Index of its line, -1 for none
 */
function propertyFind(event: string[], name: string): number {
    const head: RegExp = new RegExp(`^${name}[;:]`, "i");
    let depth: number = 0;
    for (let index: number = 1; index < event.length - 1; index++) {
        if (event[index].startsWith("BEGIN:")) depth++;
        else if (event[index].startsWith("END:")) depth--;
        else if (depth === 0 && head.test(event[index])) return index;
    }
    return -1;
}

/**
 * The identifier of an entry, its `UID`, for an occurrence with its start after `#`,
 * since each occurrence is a box of its own.
 */
export function entryIdOf(entry: Entry): string {
    return entry.recurrence === "" ? entry.id : `${entry.id}#${entry.recurrence}`;
}

/** A property of an entry as one line, empty for none. */
function unfoldedOf(event: string[], name: string): string {
    const place: number = propertyFind(event, name);
    return place === -1 ? "" : event[place];
}

/** A time property of an entry in the form of {@link Entry}, empty for none. */
function timeOf(component: string[], name: string): string {
    const line: string = unfoldedOf(component, name);
    return line === "" ? "" : textOf(ICAL.Property.fromString(line).getFirstValue() as ICAL.Time);
}

/** The day of a time property of an entry, empty for none. */
function dayIn(component: string[], name: string): string {
    const time: string = timeOf(component, name);
    return time === "" ? "" : dayOfStart(time);
}

/** Reads the `UID` of an event or a to-do. */
function uidOf(component: string[]): string {
    return unfoldedOf(component, "UID").replace(/^UID:/i, "");
}

/**
 * Finds the lines of every entry of a file, with a `UID` given only those of it.
 * - `closed`: An `END:` closes its component, so a stray one after it counts for none.
 *
 * @returns Index of each line `BEGIN:` and of the line after its `END:`
 */
function placesOf(lines: string[], uid?: string, closed: boolean = false): [number, number][] {
    const found: [number, number][] = [];
    let begin: number = -1;
    lines.forEach((line: string, index: number): void => {
        if (begins.includes(line)) begin = index;
        else if (ends.includes(line) && begin !== -1) {
            if (uid === undefined || uidOf(lines.slice(begin, index + 1)) === uid) found.push([begin, index + 1]);
            if (closed) begin = -1;
        }
    });
    return found;
}

/**
 * Finds the lines of every entry with an identifier, for one with `#` the `RECURRENCE-ID` after it as instant.
 *
 * @returns Index of each line `BEGIN:` and of the line after its `END:`
 */
function componentsOf(lines: string[], id: string): [number, number][] {
    const at: number = id.lastIndexOf("#");
    const uid: string = at === -1 ? id : id.slice(0, at);
    const recurrence: string = at === -1 ? "" : id.slice(at + 1);
    // The RECURRENCE-ID of every component is read, so a broken one throws.
    return placesOf(lines).filter((place: [number, number]): boolean => {
        const component: string[] = lines.slice(...place);
        const start: string = timeOf(component, "RECURRENCE-ID");
        return uidOf(component) === uid && start === recurrence;
    });
}

/**
 * Finds the lines of the one entry with an identifier.
 *
 * @throws {Error} - When no entry, or more than one, has the identifier
 */
function componentFind(lines: string[], id: string): [number, number] {
    const found: [number, number][] = componentsOf(lines, id);
    if (found.length !== 1) throw new Error(`${found.length} events ${id}`);
    return found[0];
}

/**
 * A time property of an occurrence in the form of the `DTSTART` of its series,
 * so calendar apps and `ical.js` match the `RECURRENCE-ID` with the occurrence.
 */
function seriesTimeOf(series: ICAL.Event, name: string, time: ICAL.Time): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property(name);
    const zoneId: string = paramOf(series.component, "dtstart", "tzid");
    property.setValue(time);
    if (zoneId !== "" && !time.isDate) property.setParameter("tzid", zoneId);
    return property;
}

/**
 * Makes one occurrence a component of its own, so it can change alone the way the standard does,
 * a copy of its series right after it.
 * Its `DTSTAMP` is that of its series, since it got its day with the series.
 *
 * @throws {Error} - When the file lies outside the new system, or holds no such series or occurrence
 */
export function occurrenceOwn(file: string, entry: Entry): void {
    fileChange(file, (text: FileLines): boolean => {
        if (componentsOf(text.lines, entryIdOf(entry)).length > 0) return false;
        const series: ICAL.Event | undefined = seriesOf(file, entry.id);
        if (series === undefined) throw new Error(`No series ${entry.id} in ${file}`);
        const start: ICAL.Time | undefined = seriesStartOf(series, entry.recurrence);
        if (start === undefined) throw new Error(`No occurrence ${entryIdOf(entry)}`);
        const place: [number, number] = componentFind(text.lines, entry.id);
        text.lines.splice(place[1], 0, ...occurrenceLinesOf(series, text.lines.slice(...place), start));
        return true;
    });
}

/** Finds a start of a series, walking its starts up to it. */
function seriesStartOf(series: ICAL.Event, recurrence: string): ICAL.Time | undefined {
    const walk: ICAL.RecurExpansion = series.iterator();
    let start: ICAL.Time | undefined = walk.next();
    while (start !== undefined && textOf(start) < recurrence) start = walk.next();
    return start !== undefined && textOf(start) === recurrence ? start : undefined;
}

/**
 * The lines of an occurrence of its own as its series gives it, without `RRULE`, `RDATE` and `EXDATE`,
 * its start as `DTSTART` and `RECURRENCE-ID`.
 */
function occurrenceLinesOf(series: ICAL.Event, lines: string[], start: ICAL.Time): string[] {
    const own: string[] = [...lines];
    propertyPut(own, "rrule", []);
    propertyPut(own, "rdate", []);
    propertyPut(own, "exdate", []);
    propertyPut(own, "dtstart", [seriesTimeOf(series, "dtstart", start)]);
    if (propertyFind(own, "dtend") !== -1) {
        const end: ICAL.Time = start.clone();
        end.addDuration(series.duration);
        propertyPut(own, "dtend", [seriesTimeOf(series, "dtend", end)]);
    }
    propertyPut(own, "recurrence-id", [seriesTimeOf(series, "recurrence-id", start)]);
    return linesOrdered(own);
}

/**
 * Takes out each occurrence of its own that holds nothing of its own any more,
 * its lines those its series gives it but its `DTSTAMP`, `STATUS:NEEDS-ACTION` the same as none.
 * A log entry pointing to it keeps pointing to its day.
 *
 * @throws {Error} - When the file lies outside the new system
 */
export function occurrencesTidy(file: string, uid: string): void {
    fileChange(file, (text: FileLines): boolean => {
        const series: ICAL.Event | undefined = seriesOf(file, uid);
        const master: [number, number] | undefined = componentsOf(text.lines, uid)[0];
        if (series === undefined || master === undefined) return false;
        const lines: string[] = text.lines.slice(...master);
        const plain: (lines: string[]) => string = (lines: string[]): string =>
            JSON.stringify(
                lines.filter(
                    (line: string): boolean => !/^DTSTAMP[:;]/i.test(line) && !/^STATUS:NEEDS-ACTION$/i.test(line),
                ),
            );
        const gone: [number, number][] = placesOf(text.lines, uid).filter(
            ([first, after]: [number, number]): boolean => {
                const own: string[] = text.lines.slice(first, after);
                const recurrence: string = timeOf(own, "RECURRENCE-ID");
                const start: ICAL.Time | undefined = recurrence === "" ? undefined : seriesStartOf(series, recurrence);
                return (
                    start !== undefined && plain(linesOrdered(own)) === plain(occurrenceLinesOf(series, lines, start))
                );
            },
        );
        placesCut(text.lines, gone);
        return gone.length > 0;
    });
}

/** Turns an instant into Berlin time. */
function berlinOf(instant: Date): ICAL.Time {
    return ICAL.Time.fromJSDate(instant, true).convertToZone(zone);
}

/**
 * The time written into a file, Berlin time, but UTC where `ical.js` would read it back as another instant.
 * Around a change of the clocks 02:30 comes twice, and `ical.js` reads it as the second.
 * Every reader of the format takes a time in UTC as the very instant.
 */
function writtenOf(instant: Date): ICAL.Time {
    const time: ICAL.Time = berlinOf(instant);
    return time.toJSDate().getTime() === instant.getTime() ? time : ICAL.Time.fromJSDate(instant, true);
}

/** Writes the date of an instant in Berlin time. */
export function berlinDateOf(instant: Date): string {
    return berlinOf(instant).toString().slice(0, 10);
}

/** The day of a start or a deadline, an ISO instant in Berlin time or a day itself. */
export function dayOfStart(start: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : berlinDateOf(new Date(start));
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

/** The weekday of a day, 1 for Monday to 7 for Sunday. */
export function weekdayOf(day: string): number {
    return ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** Reads a time of day as minutes after midnight. */
export function minutesOf(time: string): number {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/** Moves an instant by whole days in Berlin time, keeping its time of day also over a change of the clocks. */
export function berlinLater(instant: Date, days: number): Date {
    const time: ICAL.Time = berlinOf(instant);
    time.adjust(days, 0, 0, 0);
    return time.toJSDate();
}

/** The start of a day in Berlin time with its offset, so whole-day entries compare by day. */
export function berlinDayStartOf(day: string): string {
    const offset: number = zone.utcOffset(berlinAt(day, 0, 0)) / 60;
    return (
        `${day}T00:00:00+${String(Math.floor(offset / 60)).padStart(2, "0")}:` + String(offset % 60).padStart(2, "0")
    );
}

/** The instant of an hour and minute of a day in Berlin time, right also on the days the clocks change. */
export function berlinInstantOf(day: string, hour: number, minute: number = 0): Date {
    return berlinAt(day, hour, minute).toJSDate();
}

/** A time of a day in Berlin time. */
function berlinAt(day: string, hour: number, minute: number, second: number = 0): ICAL.Time {
    const [year, month, date]: number[] = day.split("-").map(Number);
    return ICAL.Time.fromData(
        {
            year: year,
            month: month,
            day: date,
            hour: hour,
            minute: minute,
            second: second,
        },
        zone,
    );
}

/** A value of a property to write. */
type Value = string | ICAL.Time | ICAL.Recur | Date | Link;

/** Builds a property, a time in Berlin time with `TZID`, a link with its path and `X-SHA256`. */
function propertyOf(name: string, value: Value): ICAL.Property {
    if (value instanceof Date) return propertyOf(name, writtenOf(value));
    const property: ICAL.Property = new ICAL.Property(name);
    if (typeof value === "object" && "path" in value) {
        property.setValue(value.path);
        if (value.fingerprint !== "") property.setParameter("x-sha256", value.fingerprint);
    } else property.setValue(value);
    if (value instanceof ICAL.Time && value.zone === zone) property.setParameter("tzid", zoneName);
    return property;
}

/** The property of a text field, `LOCATION`, `SUMMARY` and `X-ONLINE` with their link as `ALTREP`. */
function textPropertyOf(name: string, value: string, fields: EntryTexts): ICAL.Property {
    const property: ICAL.Property = propertyOf(name, value);
    if (name === "location" && fields.locationLink !== "") property.setParameter("altrep", [fields.locationLink]);
    if (name === "summary" && fields.titleLink !== "") property.setParameter("altrep", [fields.titleLink]);
    if (name === "x-online" && fields.onlineLink !== "") property.setParameter("altrep", [fields.onlineLink]);
    if (name === "x-online" && fields.onlineChannel !== "") property.setParameter("x-channel", fields.onlineChannel);
    if (name === "x-online" && fields.onlineTitle !== "") property.setParameter("x-title", fields.onlineTitle);
    return property;
}

/** The `ATTENDEE` of a person I was with, the mail of `Persons.md` in place of an address ending in `@invalid`. */
function attendeePropertyOf(attendee: Attendee): ICAL.Property {
    const mail: string = attendee.address.endsWith("@invalid") ? mailOf(attendee.name) : "";
    const property: ICAL.Property = propertyOf("attendee", `mailto:${mail !== "" ? mail : attendee.address}`);
    property.setParameter("cn", attendee.name);
    return property;
}

/**
 * The `RELATED-TO` of a log entry to its box by its `UID`,
 * for a date of a series with `X-RECURRENCE-ID`, since the `UID` names the whole series.
 */
function relatedOf(box: string): ICAL.Property {
    const at: number = box.lastIndexOf("#");
    const property: ICAL.Property = propertyOf("related-to", at === -1 ? box : box.slice(0, at));
    if (at !== -1) property.setParameter("x-recurrence-id", icsTextOf(box.slice(at + 1)));
    return property;
}

/**
 * A property of a new entry beyond its fields, a day as `EXDATE;VALUE=DATE`.
 * The `RRULE` is read by {@link ICAL.Recur.fromString}, since `ical.js` writes a rule given as text letter by letter.
 */
function ownPropertyOf(name: string, value: string | Link | Date): ICAL.Property {
    if (typeof value !== "string") return propertyOf(name, value);
    if (name === "exdate" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return propertyOf(name, ICAL.Time.fromDateString(value));
    if (name === "rrule") return propertyOf(name, ICAL.Recur.fromString(value));
    return name === "related-to" ? relatedOf(value) : propertyOf(name, value);
}

/**
 * Puts a property into an entry, one line per value where the first old one stood, no value removing it.
 *
 * @param values - New values, a property built already goes in as it is
 */
function propertyPut(event: string[], name: string, values: (Value | ICAL.Property)[]): void {
    const first: number = propertyFind(event, name);
    for (let old: number = first; old !== -1; old = propertyFind(event, name)) event.splice(old, 1);
    event.splice(
        first === -1 ? event.length - 1 : first,
        0,
        ...values.map((value: Value | ICAL.Property): string =>
            (value instanceof ICAL.Property ? value : propertyOf(name, value)).toICALString(),
        ),
    );
}

/** Text fields of an entry with the names of their properties, in the order they are written. */
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

/** A property of an entry beyond its fields, its name with its value, or a property built already. */
type OwnProperty = [string, string | Link | Date | ICAL.Property];

/**
 * Appends an entry to an `.ics` file, only what is not empty.
 *
 * @param own - Properties beyond the fields
 * @param id - Its `UID`, a new one or the one an entry brought from Vu's log
 * @throws {Error} - When the file lies outside the new system or has no line `END:VCALENDAR`
 */
export function entryAppend(
    file: string,
    fields: EntryFields,
    own: OwnProperty[],
    id: string = `${randomUUID()}@nomsystem`,
): string {
    writeCheck(file);
    componentInsert(file, eventLinesOf(fields, own, id));
    return id;
}

/** The text of a new `.ics` file holding one entry, like the copy of an entry I share. */
export function entryIcsOf(fields: EntryFields, own: OwnProperty[], id: string): string {
    const lines: string[] = newLinesOf();
    lines.splice(lines.lastIndexOf("END:VCALENDAR"), 0, ...linesOrdered(eventLinesOf(fields, own, id)));
    return componentsSorted(lines, false).flatMap(foldedOf).join("\r\n");
}

/** The lines of the event of an entry. */
function eventLinesOf(fields: EntryFields, own: OwnProperty[], id: string): string[] {
    const times: ICAL.Property[] = [
        propertyOf("dtstart", writtenOf(fields.start)),
        propertyOf("dtend", writtenOf(fields.end)),
    ];
    return newComponentLinesOf("vevent", id, times, fields, own);
}

/**
 * The lines of a new entry, its `DTSTAMP` now, only what is not empty.
 *
 * @param first - Its first properties, like its start and its end
 */
function newComponentLinesOf(
    name: string,
    id: string,
    first: ICAL.Property[],
    fields: EntryTexts,
    own: OwnProperty[],
): string[] {
    const component: ICAL.Component = new ICAL.Component(name);
    [
        ...first,
        propertyOf("dtstamp", ICAL.Time.fromJSDate(new Date(), true)),
        propertyOf("uid", id),
        ...textsOf(fields)
            .filter(([, value]: [string, string]): boolean => value !== "")
            .map(([name, value]: [string, string]): ICAL.Property => textPropertyOf(name, value, fields)),
        ...fields.attendees.map(attendeePropertyOf),
        ...own
            .filter(([, value]: OwnProperty): boolean => value !== "")
            .map(([name, value]: OwnProperty): ICAL.Property =>
                value instanceof ICAL.Property ? value : ownPropertyOf(name, value),
            ),
    ].forEach((property: ICAL.Property): void => {
        component.addProperty(property);
    });
    return linesOf(component);
}

/** The `DTSTART` of a to-do, its day when it has no time, else its time. */
function todoStartOf(fields: TodoFields): ICAL.Time {
    return fields.time === null ? ICAL.Time.fromDateString(fields.day) : writtenOf(fields.time);
}

/** The `DUE` of a to-do, a day or a time in Berlin time. */
function deadlineTimeOf(deadline: string): ICAL.Time {
    return /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? ICAL.Time.fromDateString(deadline) : writtenOf(new Date(deadline));
}

/** Minutes as an iCalendar duration. */
function durationOf(minutes: number): string {
    return ICAL.Duration.fromSeconds(minutes * 60).toString();
}

/**
 * Appends a to-do, its day or time as `DTSTART`, or instead its deadline as `DUE`.
 * A to-do with a deadline has no `DTSTART`, since RFC 5545 wants `DUE` of the same kind and later.
 *
 * @param open - Whether it is a box, `STATUS:NEEDS-ACTION`, false for a group of a tutorial
 * @throws {Error} - When the file lies outside the new system or has no line `END:VCALENDAR`
 */
export function todoAppend(
    file: string,
    fields: TodoFields,
    own: [string, string | Link | Date][] = [],
    open: boolean = true,
): string {
    writeCheck(file);
    const id: string = `${randomUUID()}@nomsystem`;
    const first: ICAL.Property[] = [
        fields.deadline === ""
            ? propertyOf("dtstart", todoStartOf(fields))
            : propertyOf("due", deadlineTimeOf(fields.deadline)),
        ...(fields.minutes === null ? [] : [propertyOf("estimated-duration", durationOf(fields.minutes))]),
        ...(open ? [propertyOf("status", "NEEDS-ACTION")] : []),
    ];
    componentInsert(file, newComponentLinesOf("vtodo", id, first, fields, own));
    return id;
}

/**
 * Puts the text fields that changed into an entry, a place that stays keeping its line with its `ALTREP`.
 * A `SUMMARY` or `X-ONLINE` whose link alone changed is written anew too.
 * Once what it did online changes, its `LOCATION` is written anew too, since an older entry wrote it there.
 */
function textsPut(component: string[], entry: Entry, fields: EntryTexts): void {
    const textsOld: [string, string][] = textsOf(entry);
    const reonline: boolean =
        fields.online !== entry.online ||
        fields.onlineLink !== entry.onlineLink ||
        fields.onlineChannel !== entry.onlineChannel ||
        fields.onlineTitle !== entry.onlineTitle;
    textsOf(fields).forEach(([name, value]: [string, string], index: number): void => {
        if (
            value !== textsOld[index][1] ||
            (name === "summary" && fields.titleLink !== entry.titleLink) ||
            (["location", "x-online"].includes(name) && reonline)
        )
            textPut(component, name, value, fields);
    });
    if (JSON.stringify(fields.attendees) !== JSON.stringify(entry.attendees))
        propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
}

/** Puts a text field into an entry, none when empty. */
function textPut(component: string[], name: string, value: string, fields: EntryTexts): void {
    propertyPut(component, name, value === "" ? [] : [textPropertyOf(name, value, fields)]);
}

/**
 * Changes the entry with an identifier where it stood, or moves it into another file.
 * A move writes it there first, so a failure in between leaves it twice instead of losing it.
 * Its `DTSTAMP` turns now once the day of its `DTSTART` or `DUE` changed, so it tells when it got its day.
 *
 * @param edit - Changes the lines of the entry in place
 * @param target - Path of the `.ics` file it belongs into, `file` when it stays
 * @param cut - Gives the places of the entries taken out of the file first
 * @throws {Error} - When a file lies outside the new system or does not hold the entry once
 */
function componentEdit(
    file: string,
    id: string,
    edit: (component: string[]) => void,
    target: string = file,
    cut: (lines: string[]) => [number, number][] = (): [number, number][] => [],
): void {
    writeCheck(file);
    writeCheck(target);
    fileChange(file, (text: FileLines): boolean => {
        placesCut(text.lines, cut(text.lines));
        const [begin, end]: [number, number] = componentFind(text.lines, id);
        const old: string[] = text.lines.slice(begin, end);
        const component: string[] = [...old];
        edit(component);
        if (["DTSTART", "DUE"].some((name: string): boolean => dayIn(old, name) !== dayIn(component, name)))
            propertyPut(component, "dtstamp", [ICAL.Time.fromJSDate(new Date(), true)]);
        if (target !== file) componentInsert(target, component);
        text.lines.splice(begin, end - begin, ...(target === file ? linesOrdered(component) : []));
        return true;
    });
}

/**
 * Changes fields and times of an event, writing only what changed, moved when a target is given.
 *
 * @throws {Error} - When a file lies outside the new system or does not hold the event once
 */
export function entryChange(file: string, entry: Entry, fields: EntryFields, target: string): void {
    const edit: (event: string[]) => void = (event: string[]): void => {
        textsPut(event, entry, fields);
        if (fields.start.getTime() !== new Date(entry.start).getTime())
            propertyPut(event, "dtstart", [writtenOf(fields.start)]);
        if (fields.end.getTime() !== new Date(entry.end).getTime())
            propertyPut(event, "dtend", [writtenOf(fields.end)]);
    };
    componentEdit(file, entryIdOf(entry), edit, target);
}

/**
 * Changes the fields of a to-do, writing only what changed, moved when a target is given.
 * A to-do that gets a deadline loses its `DTSTART`, one that loses its deadline gets one.
 *
 * @throws {Error} - When a file lies outside the new system or does not hold the to-do once
 */
export function todoChange(file: string, entry: Entry, fields: TodoFields, target: string): void {
    const start: string = fields.time === null ? fields.day : fields.time.toISOString();
    const edit: (todo: string[]) => void = (todo: string[]): void => {
        textsPut(todo, entry, fields);
        if (fields.deadline === "" && (start !== entry.start || entry.deadline !== ""))
            propertyPut(todo, "dtstart", [todoStartOf(fields)]);
        if (fields.deadline !== "" && entry.deadline === "") propertyPut(todo, "dtstart", []);
        if (fields.deadline !== entry.deadline)
            propertyPut(todo, "due", fields.deadline === "" ? [] : [deadlineTimeOf(fields.deadline)]);
        if (fields.minutes !== entry.minutes)
            propertyPut(todo, "estimated-duration", fields.minutes === null ? [] : [durationOf(fields.minutes)]);
    };
    componentEdit(file, entryIdOf(entry), edit, target);
}

/** The `X-GROUP` of a group of a course, `X-PINNED=TRUE` while I pinned it. */
export function groupPropertyOf(group: string, pinned: boolean): ICAL.Property {
    const property: ICAL.Property = propertyOf("x-group", group);
    if (pinned) property.setParameter("x-pinned", "TRUE");
    return property;
}

/** Reads an `X-ROUND`, a parameter of one value as a list of one. */
function roundMarkOf(property: ICAL.Property): RoundMark {
    const listOf: (name: string) => string[] = (name: string): string[] => {
        const value: unknown = property.getParameter(name);
        return value === undefined ? [] : Array.isArray(value) ? value.map(String) : [String(value)];
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
    const property: ICAL.Property = propertyOf("x-round", mark.section);
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
 * Puts new values into properties of the entry with an identifier, replacing all old lines of each.
 *
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function propertiesPut(file: string, id: string, properties: [string, (Value | ICAL.Property)[]][]): void {
    componentEdit(file, id, (event: string[]): void =>
        properties.forEach(([name, values]: [string, (Value | ICAL.Property)[]]): void =>
            propertyPut(event, name, values),
        ),
    );
}

/**
 * Sets the summary of an entry with its link.
 *
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function titlePut(file: string, id: string, fields: EntryTexts): void {
    propertiesPut(file, id, [["summary", [textPropertyOf("summary", fields.title, fields)]]]);
}

/**
 * Sets the `STATUS` of a box, without a `COMPLETED` moment, since its log entry holds the real time.
 *
 * @param status - New `STATUS`, empty to take it out
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function statusPut(file: string, id: string, status: string): void {
    propertiesPut(file, id, [["status", status === "" ? [] : [status]]]);
}

/**
 * Notes one more push of a box before its start and length change,
 * its start as its `DTSTART` holds it, its length as `X-ESTIMATED-DURATION`.
 * `VALUE` says it is a time or a date, since iCalendar reads a property of my own as text without it.
 *
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function pushAdd(file: string, id: string, entry: Entry): void {
    const minutes: number | null = entry.todo
        ? entry.minutes
        : (Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000);
    const pushed: ICAL.Property = propertyOf(
        "x-pushed",
        entry.allDay ? ICAL.Time.fromDateString(entry.start) : berlinOf(new Date(entry.start)),
    );
    if (minutes !== null) pushed.setParameter("x-estimated-duration", durationOf(minutes));
    pushesPut(file, id, (before: ICAL.Property[]): ICAL.Property[] => [...before, pushed]);
}

/**
 * Keeps the first pushes of a box and takes away the later ones.
 *
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function pushesKeep(file: string, id: string, kept: number): void {
    pushesPut(file, id, (before: ICAL.Property[]): ICAL.Property[] => before.slice(0, kept));
}

/** Writes the `X-PUSHED`s of a box anew from those it has. */
function pushesPut(file: string, id: string, pushes: (before: ICAL.Property[]) => ICAL.Property[]): void {
    componentEdit(file, id, (component: string[]): void =>
        propertyPut(
            component,
            "x-pushed",
            pushes(new ICAL.Component(ICAL.parse(component.join("\r\n"))).getAllProperties("x-pushed")),
        ),
    );
}

/**
 * Removes the entry with an identifier from an `.ics` file.
 *
 * @throws {Error} - When the file lies outside the new system or does not hold the entry once
 */
export function entryRemove(file: string, id: string): void {
    fileChange(file, (text: FileLines): boolean => {
        placesCut(text.lines, [componentFind(text.lines, id)]);
        return true;
    });
}

/**
 * Removes a series whole, every occurrence changed alone too.
 *
 * @returns Whether the file holds no entry any more
 * @throws {Error} - When the file lies outside the new system, or holds no such series
 */
export function seriesRemove(file: string, uid: string): boolean {
    let empty: boolean = false;
    fileChange(file, (text: FileLines): boolean => {
        if (componentsOf(text.lines, uid).length === 0) throw new Error(`No series ${uid} in ${file}`);
        placesCut(text.lines, placesOf(text.lines, uid, true));
        empty = !text.lines.some((line: string): boolean => begins.includes(line));
        return true;
    });
    return empty;
}

/**
 * Finds the series with a `UID` in a file of the new system and one of its starts.
 *
 * @param what - What the start is to the error, a `day` or a `start`
 * @throws {Error} - When the file lies outside the new system, or holds no such series or start
 */
function seriesStartFind(file: string, uid: string, recurrence: string, what: string): [ICAL.Event, ICAL.Time] {
    writeCheck(file);
    const series: ICAL.Event | undefined = seriesOf(file, uid);
    const start: ICAL.Time | undefined = series === undefined ? undefined : seriesStartOf(series, recurrence);
    if (series === undefined || start === undefined) throw new Error(`No ${what} ${recurrence} of the series ${uid}`);
    return [series, start];
}

/**
 * Takes one day out of a series as one more `EXDATE`, or out of its `RDATE`s, its component of its own too.
 *
 * @throws {Error} - When the file lies outside the new system, or holds no such series or day
 */
export function seriesDayRemove(file: string, uid: string, recurrence: string): void {
    const [series, start]: [ICAL.Event, ICAL.Time] = seriesStartFind(file, uid, recurrence, "day");
    const dates: ICAL.Time[] = seriesDatesRead(series);
    const edit: (component: string[]) => void = (component: string[]): void =>
        dates.some((date: ICAL.Time): boolean => date.compare(start) === 0)
            ? propertyPut(
                  component,
                  "rdate",
                  dates
                      .filter((date: ICAL.Time): boolean => date.compare(start) !== 0)
                      .map((date: ICAL.Time): ICAL.Property => seriesTimeOf(series, "rdate", date)),
              )
            : propertyPut(component, "exdate", [
                  ...series.component.getAllProperties("exdate"),
                  seriesTimeOf(series, "exdate", start),
              ]);
    componentEdit(file, uid, edit, file, (lines: string[]): [number, number][] =>
        componentsOf(lines, `${uid}#${recurrence}`),
    );
}

/**
 * Gives a day back to a series, its `EXDATE` at that start taken out.
 *
 * @throws {Error} - When the file lies outside the new system, or holds no such series or day left out
 */
export function seriesDayRestore(file: string, uid: string, recurrence: string): void {
    writeCheck(file);
    const series: ICAL.Event | undefined = seriesOf(file, uid);
    const excluded: ICAL.Property[] = series?.component.getAllProperties("exdate") ?? [];
    const kept: ICAL.Property[] = excluded.filter(
        (property: ICAL.Property): boolean => textOf(property.getFirstValue() as ICAL.Time) !== recurrence,
    );
    if (kept.length === excluded.length) throw new Error(`No day ${recurrence} left out of the series ${uid}`);
    propertiesPut(file, uid, [["exdate", kept]]);
}

/**
 * Ends a series at one of its starts, `UNTIL` in UTC for times, as the standard wants it beside a time zone.
 * Its `EXDATE`s and occurrences changed alone after it go, so nothing of it stays after its end.
 *
 * @throws {Error} - When the file lies outside the new system, or holds no such series or start
 */
export function seriesCut(file: string, uid: string, last: string): void {
    const [series, end]: [ICAL.Event, ICAL.Time] = seriesStartFind(file, uid, last, "start");
    const rule: ICAL.Recur = (series.component.getFirstPropertyValue("rrule") as ICAL.Recur).clone();
    rule.until = end.isDate ? end : ICAL.Time.fromJSDate(end.toJSDate(), true);
    const edit: (component: string[]) => void = (component: string[]): void => {
        propertyPut(component, "rrule", [ownPropertyOf("rrule", rule.toString())]);
        propertyPut(
            component,
            "exdate",
            series.component
                .getAllProperties("exdate")
                .filter((property: ICAL.Property): boolean => (property.getFirstValue() as ICAL.Time).compare(end) < 0),
        );
    };
    componentEdit(file, uid, edit, file, (lines: string[]): [number, number][] =>
        calendarOf(file)
            .entries.filter((entry: Entry): boolean => entry.id === uid && entry.recurrence > last)
            .flatMap((entry: Entry): [number, number][] => componentsOf(lines, entryIdOf(entry))),
    );
}

/**
 * The `RDATE`s of a series, the earliest first.
 * A period, `VALUE=PERIOD`, is left out, since `ical.js` cannot give its occurrence.
 */
function seriesDatesRead(series: ICAL.Event): ICAL.Time[] {
    return series.component
        .getAllProperties("rdate")
        .flatMap((property: ICAL.Property): unknown[] => property.getValues())
        .filter((value: unknown): value is ICAL.Time => value instanceof ICAL.Time)
        .sort((first: ICAL.Time, second: ICAL.Time): number => first.compare(second));
}

/** The `RDATE`s of a series of calendar sources. */
export function seriesDatesOf(sources: CalendarSource[], uid: string): string[] {
    const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(sources, uid);
    const series: ICAL.Event | undefined = found === undefined ? undefined : seriesOf(found[0], uid);
    return series === undefined ? [] : seriesDatesRead(series).map(textOf);
}

/**
 * Writes the `RDATE`s of a series, a day or a time in Berlin time, none taking them all out.
 *
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesDatesPut(file: string, uid: string, starts: string[]): void {
    componentEdit(file, uid, (component: string[]): void =>
        propertyPut(
            component,
            "rdate",
            starts.map((start: string): ICAL.Time =>
                /^\d{4}-\d{2}-\d{2}$/.test(start) ? ICAL.Time.fromDateString(start) : berlinOf(new Date(start)),
            ),
        ),
    );
}

/**
 * Moves one day of a series changed alone to another series with that `UID`, its `RECURRENCE-ID` kept.
 *
 * @throws {Error} - When a file lies outside the new system, or does not hold the day once
 */
export function occurrenceMove(file: string, id: string, uid: string, target: string): void {
    componentEdit(file, id, (own: string[]): void => propertyPut(own, "uid", [uid]), target);
}

/**
 * Finds a series by its `UID` with its file, its first occurrence and its rule.
 * A series without `RRULE`, like one of `RDATE`s alone, counts as none.
 */
export function seriesLookup(sources: CalendarSource[], uid: string): [string, Entry, ICAL.Recur] | undefined {
    for (const file of filesOf(sources)) {
        const series: ICAL.Event | undefined = seriesOf(file, uid);
        const rule: unknown = series?.component.getFirstPropertyValue("rrule");
        if (series !== undefined && rule instanceof ICAL.Recur)
            return [file, entryOf(series, series.startDate, series.endDate, file), rule];
    }
    return undefined;
}

/**
 * Writes a to-do that repeats whole, its `DTSTART`, `ESTIMATED-DURATION`, `RRULE` and texts but its note.
 * Every occurrence changed alone takes the same texts, its own times and note kept.
 *
 * @throws {Error} - When the file lies outside the new system, or holds no such series once
 */
export function seriesWrite(file: string, uid: string, fields: TodoFields, rule: string): void {
    fileChange(file, (text: FileLines): boolean => {
        componentFind(text.lines, uid);
        const todos: [number, number][] = placesOf(text.lines, uid).filter(
            ([, after]: [number, number]): boolean => text.lines[after - 1] === "END:VTODO",
        );
        placesChange(text.lines, todos, (component: string[]): number => {
            textsOf(fields)
                .filter(([name]: [string, string]): boolean => name !== "description")
                .forEach(([name, value]: [string, string]): void => textPut(component, name, value, fields));
            propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
            if (unfoldedOf(component, "RECURRENCE-ID") !== "") return 1;
            propertyPut(component, "dtstart", [todoStartOf(fields)]);
            propertyPut(component, "estimated-duration", fields.minutes === null ? [] : [durationOf(fields.minutes)]);
            propertyPut(component, "rrule", [ownPropertyOf("rrule", rule)]);
            return 1;
        });
        return true;
    });
    occurrencesTidy(file, uid);
}

/**
 * Ends a series with its rule with `UNTIL`, its occurrences changed alone left as they are.
 *
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesEnd(file: string, uid: string, rule: string): void {
    propertiesPut(file, uid, [["rrule", [ownPropertyOf("rrule", rule)]]]);
}

/**
 * Points a series to the series it goes on from with `RELATED-TO;RELTYPE=SIBLING:<UID>`,
 * which tells it apart from the `RELATED-TO` of a log entry.
 *
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesSiblingPut(file: string, uid: string, sibling: string): void {
    const link: ICAL.Property = propertyOf("related-to", sibling);
    link.setParameter("reltype", "SIBLING");
    propertiesPut(file, uid, [["related-to", [link]]]);
}

/**
 * Finds the parts of a plain series, one to-do per time with the same `X-SERIES`,
 * since a rule has one time for all its days.
 *
 * @returns Its `X-SERIES`, empty for none, and the `UID`s of its parts
 */
export function seriesPartsOf(sources: CalendarSource[], uid: string): [string, string[]] {
    const masters: ICAL.Event[] = filesOf(sources).flatMap((file: string): ICAL.Event[] => calendarOf(file).series);
    const own: ICAL.Event | undefined = masters.find((series: ICAL.Event): boolean => series.uid === uid);
    const keyOf: (series: ICAL.Event) => string = (series: ICAL.Event): string =>
        String(series.component.getFirstPropertyValue("x-series") ?? "");
    if (own === undefined) return ["", []];
    const key: string = keyOf(own);
    return [
        key,
        key === ""
            ? [uid]
            : masters
                  .filter((series: ICAL.Event): boolean => keyOf(series) === key)
                  .map((series: ICAL.Event): string => series.uid),
    ];
}

/**
 * Finds every series one series goes on from or as, link by link of `RELATED-TO;RELTYPE=SIBLING`.
 *
 * @returns Each series of the chain, its file and its `UID`, the series itself first
 */
export function seriesChainOf(sources: CalendarSource[], uid: string): [string, string][] {
    const masters: [string, ICAL.Event][] = filesOf(sources).flatMap((file: string): [string, ICAL.Event][] =>
        calendarOf(file).series.map((series: ICAL.Event): [string, ICAL.Event] => [file, series]),
    );
    const linked: (series: ICAL.Event) => string[] = (series: ICAL.Event): string[] =>
        series.component
            .getAllProperties("related-to")
            .filter(
                (link: ICAL.Property): boolean =>
                    String(link.getParameter("reltype") ?? "").toUpperCase() === "SIBLING",
            )
            .map((link: ICAL.Property): string => String(link.getFirstValue()));
    const found: Map<string, [string, string]> = new Map();
    const waiting: string[] = [uid];
    for (const next of waiting) {
        const own: [string, ICAL.Event] | undefined = masters.find(
            ([, series]: [string, ICAL.Event]): boolean => series.uid === next,
        );
        if (found.has(next) || own === undefined) continue;
        found.set(next, [own[0], next]);
        waiting.push(
            ...linked(own[1]),
            ...masters
                .filter(([, series]: [string, ICAL.Event]): boolean => linked(series).includes(next))
                .map(([, series]: [string, ICAL.Event]): string => series.uid),
        );
    }
    return [...found.values()];
}

/**
 * Writes the summary of a series into every component of its `UID`, past days changed alone too.
 *
 * @throws {Error} - When the file lies outside the new system
 */
export function seriesTitlePut(file: string, uid: string, fields: EntryTexts): void {
    fileChange(file, (text: FileLines): boolean => {
        placesChange(text.lines, placesOf(text.lines, uid, true), (component: string[]): number => {
            textPut(component, "summary", fields.title, fields);
            return 1;
        });
        return true;
    });
}

/**
 * The address of a name while nobody typed a real one, the same as the page gives it.
 * The name in small letters, umlauts written out, every other character but a–z and 0–9 a dot,
 * `Vorname` first, then `@invalid`.
 */
export function invalidAddressOf(name: string): string {
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
 * Renames a person in every `ATTENDEE` whose `CN` is the old name, with its mail or the address it had.
 * An address that never works is made anew for the new name.
 * A person named twice so, once moved to the name of another, stays once.
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
    return componentsRewrite(filesOf(sources), dry, (component: string[]): number => {
        const people: ICAL.Property[] = component
            .filter((line: string): boolean => /^ATTENDEE[;:]/i.test(line))
            .map((line: string): ICAL.Property => ICAL.Property.fromString(line));
        let renamed: boolean = false;
        const written: ICAL.Property[] = people.map((person: ICAL.Property): ICAL.Property => {
            if (String(person.getParameter("cn") ?? "") !== old) return person;
            renamed = true;
            const address: string = String(person.getFirstValue() ?? "").replace(/^mailto:/i, "");
            const target: string = mail !== "" ? mail : address.endsWith("@invalid") ? invalidAddressOf(name) : address;
            const property: ICAL.Property = propertyOf("attendee", `mailto:${target}`);
            property.setParameter("cn", name);
            return property;
        });
        if (!renamed) return 0;
        propertyPut(
            component,
            "attendee",
            written.filter(
                (person: ICAL.Property, at: number): boolean =>
                    written.findIndex(
                        (other: ICAL.Property): boolean =>
                            String(other.getParameter("cn") ?? "") === String(person.getParameter("cn") ?? ""),
                    ) === at,
            ),
        );
        return 1;
    });
}

/**
 * Changes the lines of files and writes them only then,
 * so a line that cannot be read or a file outside the new system stops it before anything is written.
 */
function filesRewrite(files: string[], dry: boolean, change: (text: FileLines) => number): number {
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    files.forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const changed: number = change(text);
        if (changed === 0) return;
        count += changed;
        writeCheck(file);
        changes.push([file, text]);
    });
    if (!dry) changes.forEach(([file, text]: [string, FileLines]): void => linesWrite(file, text));
    return count;
}

/** Changes every entry of files. */
function componentsRewrite(files: string[], dry: boolean, change: (component: string[]) => number): number {
    return filesRewrite(files, dry, (text: FileLines): number =>
        placesChange(text.lines, placesOf(text.lines), change),
    );
}

/** A param of a value renamed. */
export type ParamRenamed = {
    category: string;
    value: string;
    old: string;
    name: string;
    dry: boolean;
};

/**
 * Renames a param of a value in every summary of its category, alone or among its values.
 * The same param of another value stays, since each value has its own list of params.
 *
 * @returns How many lines change
 * @throws {Error} - When the new param is none or would part the value, or a file lies outside the new system
 */
export function paramRename(sent: ParamRenamed): number {
    if (!/^[^,()]+$/.test(sent.name)) throw new Error(`No param: ${sent.name}`);
    const from: string = `${sent.value} (${sent.old})`;
    const to: string = `${sent.value} (${sent.name})`;
    return filesRewrite(calendarFilesOf(), sent.dry, (text: FileLines): number => {
        let count: number = 0;
        summariesOf(text.lines)
            .filter((summed: Summed): boolean => summed.category === sent.category)
            .forEach((summed: Summed): void => {
                const property: ICAL.Property = ICAL.Property.fromString(text.lines[summed.index]);
                const summary: string = String(property.getFirstValue() ?? "");
                const written: string =
                    summary === from
                        ? to
                        : summary
                              .split(", ")
                              .map((value: string): string => (value === from ? to : value))
                              .join(", ");
                if (written === summary) return;
                property.setValue(written);
                text.lines[summed.index] = property.toICALString();
                count++;
            });
        return count;
    });
}

/**
 * Renames a place in each `LOCATION` and `X-FROM` that names it, a `LOCATION` with its link as `ALTREP`.
 *
 * @param place - The line it takes
 * @param link - The link a `LOCATION` takes, empty for none, an `X-FROM` has none
 * @param dry - Whether only to count the lines, writing nothing
 * @returns How many lines change
 * @throws {Error} - When a file to write lies outside the new system, or a line of a place cannot be read
 */
export function placeLinesRename(
    sources: CalendarSource[],
    old: string,
    place: string,
    link: string,
    dry: boolean,
): number {
    return componentsRewrite(filesOf(sources), dry, (component: string[]): number => {
        let count: number = 0;
        ["location", "x-from"].forEach((name: string): void => {
            const line: string = unfoldedOf(component, name);
            if (line === "") return;
            const value: string = String(ICAL.Property.fromString(line).getFirstValue() ?? "");
            if (labelOf(value) !== old) return;
            const written: ICAL.Property = propertyOf(name, place);
            if (name === "location" && link !== "") written.setParameter("altrep", [link]);
            if (written.toICALString() === line) return;
            propertyPut(component, name, [written]);
            count++;
        });
        return count;
    });
}
