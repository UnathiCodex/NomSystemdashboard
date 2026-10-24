/**
 * ## Calendars
 *
 * Reads `.ics` files into entries, their events, `VEVENT`, and their to-dos, `VTODO`, the boxes of the plan,
 * see `boxes.ts`; appends events and to-dos to them, changes and removes single ones,
 * and moves one from one file into another, like into the log of another year; renames a place in all of them,
 * see {@link placeLinesRename}, and reads and writes a series whole, see {@link seriesLookup} and {@link seriesWrite}.
 * Keeps each read file until it changes on disk, so a file is read again only once it changed.
 * Every entry states its facts in its own lines, for every field, now and later: a link, the `ALTREP` of a `SUMMARY`
 * or a `LOCATION` or an `ATTACH`, only points to more and is never the only place of a fact, since a folder may be
 * renamed or vanish; so a skill entry names its semester in its `X-SEMESTER`, a place its label and address
 * in its `LOCATION`, what I did online its platform in its `X-ONLINE`. Only the skill and the type of a skill entry
 * stand in the `ALTREP` of its `SUMMARY` alone, since its `SUMMARY` is a free title, see {@link skillPartsOf};
 * a module folder renamed is found again by its code, see `folderRepair` in `documents.ts`.
 * Writes only into the three folders of the new system, with times in Berlin time, every date and time in the form
 * of the iCalendar format, also in a property or a parameter of my own, like `20261026T130000Z` or `20261026`,
 * never like `2026-10-26T13:00:00.000Z`, and every duration so, like `PT25M`, never like `25`, see {@link sportIcsOf};
 * puts the lines of every entry it writes, new or changed, into one fixed
 * order, see {@link lineOrder}, each property on one line, never folded, see {@link linesOf},
 * and leaves every other line as it is, byte for byte, but for the order of the entries of a file, which it keeps
 * so it reads well, see {@link componentsSorted}.
 *
 * - `node:fs`: Works with files and folders on the disk.
 * - `node:path`: Builds file paths for the operating system.
 * - `node:crypto`: Creates random identifiers and the fingerprint of each entry.
 * - `ical.js`: Reads and writes the iCalendar format of `.ics` files.
 * - `./persons.ts`: Gives the mail of a person of `Persons.md` for its `ATTENDEE`.
 * - `./places.ts`: Tells a link I typed, a web address, the platform of a link and the name of the place of a line.
 * - `./sources.ts`: Names the files of a calendar and a skill by its folder and the folder of the modules, tells a module
 *   from a project, and tells which files the reader may write.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import ICAL from "ical.js";
import { mailOf } from "./persons.ts";
import { labelOf, linkForm, platformOfLink } from "./places.ts";
import { moduleIs, modulesRoot, skillNameOf, vaultPathOf, writeAllowed } from "./sources.ts";

import type { CalendarSource } from "./sources.ts";


/**
 * One calendar entry, as the page shows it.
 *
 * - `id`: Identifier of the event, its `UID`, like `b8f1e81f-15b4-460e-910d-ef6b1b3d09b3@nomsystem`;
 *   all occurrences of a series share it, like those of a birthday.
 * - `category`: Category of the entry, its `CATEGORIES`, like `Way`; empty for an entry without one, like a birthday.
 * - `title`: Summary of the entry, what it was, like `U-Bahn`, for a skill entry its title, free, like
 *   `IN2028 Lecture 3 recap`, at first the name of the folder of its skill with its type in round brackets,
 *   like `IN2028_BusinessAnalyticsMachineLearning (VO)`, see `skillTitleOf` in `documents.ts`;
 *   empty for an entry without `SUMMARY`.
 * - `titleLink`: Link of what it was, the standard parameter `ALTREP` of its `SUMMARY`: for a skill entry the folder
 *   of its skill from `NomWorkspace`, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`, for a type
 *   on into the folder of its material, like `…/VO_UniversityLectureLessons/TUM_2026W`, see `skillLinkOf`
 *   in `documents.ts`; in an older entry a web address I typed, like the page of an event, which it keeps, while one
 *   of a platform of `Online.md` reads as its {@link Online}; empty when it has none.
 * - `location`: Place of the entry, where I physically was, its `LOCATION`,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`, or `Home Munich` in an older entry,
 *   empty when the event has none and for an older place online, which reads as its {@link Online}.
 * - `locationLink`: Link of its place, the standard parameter `ALTREP` of its `LOCATION`,
 *   like `https://nav.tum.de/room/0509.EG.980`, empty when it has none.
 * - `online`, `onlineLink`, `passcode`: What I did online, see {@link Online}.
 * - `from`: Where a way starts, its `X-FROM`, empty when the event has none.
 * - `attendees`: Who I was with, its `ATTENDEE`s in order, see {@link Attendee}, none when the event has none.
 * - `module`: Skill of a skill entry from the `ALTREP` of its `SUMMARY`, the code of a module, like `IN2028`,
 *   or a project, like `NomSystemdashboard`, see {@link skillPartsOf}; empty for any other entry.
 * - `type`: Type of a skill entry from the `ALTREP` of its `SUMMARY`, like `VO`, empty for none, like my own learning
 *   or a project, and for any other entry.
 * - `semester`: Semester of a skill entry, its `X-SEMESTER`, like `2026W`: from which semester the lecture
 *   or the material is, not when I did it, see `semesterOf` in `categories.ts`; empty when the event has none,
 *   like an older skill entry, and for any other entry.
 * - `chapters`: Chapters of an older skill entry of the log, its `X-CHAPTER`s in order, each by its name,
 *   like `01_RegressionAnalysis`, none when the event has none; a skill entry now links the folders of its chapters,
 *   see `chaptersOf` in `documents.ts`.
 * - `links`: Links of a skill entry of the log to the folder of its skill and the document it used, its `ATTACH`es
 *   in order, see {@link Link} and `documents.ts`; none when the event has none.
 * - `attempts`: Attempts of a skill entry of the log, its `X-ATTEMPT`s in order,
 *   like `140500;IN2028/Kiosk Sales Standard Error;stuck;high;step 2`, none when the event has none.
 * - `rounds`: Where I am in the rounds of my sections, of a skill entry of the log, its `X-ROUND`s in order,
 *   like `091500;IN2028/01_01_SampleMeanEstimator;0;seen;Definition. Population and Sample`, see `reader/skill.ts`;
 *   none when the event has none.
 * - `tutors`: Tasks I copied for my tutor in an older skill entry of the log, its `X-TUTOR`s in order, only read,
 *   like `IN2028/Kiosk Sales Standard Error`, none when the event has none.
 * - `foods`: Foods of a meal or a cooking, its `X-FOOD`s in order, each a food of `Foods.md` by its name, brand
 *   and store with the grams, like `Skyr natur;K-Classic;Kaufland;150`, an older one by its name alone,
 *   like `Reis;150`; none when the event has none.
 * - `cooked`: For a meal drawn from a cooking, the identifier of that entry `Cook`, its `X-COOKED`;
 *   empty when the event has none.
 * - `pain`: My neck pain from 0 to 10 after a long neck session, its `X-PAIN`, like `5`, empty when the event has none.
 * - `workout`: Workout of mine a session of sport did, its `X-WORKOUT`, like `Push`, empty when the event has none,
 *   see `sport.ts`.
 * - `exercises`: Exercises of a session, its `X-EXERCISE`s in order, each its name, sets, repetitions and kilograms,
 *   like `Bench press;3;10;40`, or seconds, like `Plank;2;60s;;` of `Plank;2;PT1M;;` in the file,
 *   see {@link sportLineOf}; none when the event has none.
 * - `videos`: Videos of a session, its `X-VIDEO`s in order, each its title, channel, minutes and link,
 *   like `Full Body Pilates;Lidia Mera;25;https://www.youtube.com/watch?v=…` of `PT25M` in the file;
 *   none when the event has none.
 * - `planned`: Identifier of the box a log entry was logged from, see {@link plannedOf}: the `UID` of its
 *   `RELATED-TO`, like `study-13@nomsystem`, for one date of a series with that date after `#`,
 *   like `weekly-lecture@nomsystem#2026-10-13T08:00:00.000Z` of
 *   `RELATED-TO;X-RECURRENCE-ID=20261013T080000Z:weekly-lecture@nomsystem`, see {@link entryIdOf};
 *   for an older entry its `X-PLANNED`, which holds the identifier so; empty when the event has neither.
 * - `note`: Free note, its `DESCRIPTION`, empty when the event has none.
 * - `todo`: Whether the entry is a to-do, a `VTODO`, a box of the plan; else it is an event, a `VEVENT`.
 * - `status`: Its `STATUS`, like `CANCELLED` for a dropped box or `COMPLETED` for a done one, empty when it has none.
 * - `minutes`: Expected duration of a to-do in minutes, its `ESTIMATED-DURATION`, like 75 of `PT1H15M`;
 *   `null` for none and for an event, whose length lies between its start and its end.
 * - `deadline`: Deadline of a to-do, its `DUE`, as ISO instant, or as date like `2026-10-23` when it has no time;
 *   empty for none and for an event.
 * - `pushed`: Where a box stood before each push to another day, its `X-PUSHED`s in order, see {@link Push},
 *   like Fri, 16.10.2026, 15:00 for 195 minutes
 *   of `X-PUSHED;TZID=Europe/Berlin;X-ESTIMATED-DURATION=PT3H15M;VALUE=DATE-TIME:20261016T150000`;
 *   none when it has none.
 * - `carried`: Whether a box is carried along once its day is over, false for its `X-CARRIED:FALSE`,
 *   see `carriedPut` in `boxes.ts`.
 * - `number`: Number of a lecture, an exercise, a tutorial or a sheet in its series, its `X-NUMBER`, like `3`,
 *   `NONE` for one the university cancelled, see `boxUniversity` in `boxes.ts`; empty for none.
 * - `group`: Group of a tutorial, its `X-GROUP`, like `03`, as TUMonline names it: of a group of the course
 *   of a module, and of the box of a tutorial, which goes to the session of that group, see `course.ts`;
 *   empty for none.
 * - `written`: When the entry was written, its `DTSTAMP`, as ISO instant, which the reader sets once as it adds an entry;
 *   empty when the event has none.
 * - `version`: Fingerprint of the entry as its file holds it, the SHA-256 of its lines as read, in hexadecimal digits,
 *   which changes with any change of the entry, by the dashboard, another device, Claude or by hand, and with no change
 *   of another entry; the dialog sends it back, so the reader writes nothing older than the file, see `entryEdit`
 *   in `day.ts`; for an occurrence that of its series.
 * - `editable`: Whether the dashboard may change the entry: it lies in the new system and has times or is a to-do;
 *   also one occurrence of a series, which becomes a component of its own once it is changed alone,
 *   see {@link occurrenceOwn}. FullCalendar lets only these events be dragged.
 * - `start`: Start as ISO instant like `2026-07-03T09:15:00.000Z`,
 *   or as date like `2026-07-03` when all-day; a to-do starts at its `DTSTART`, a day or a time,
 *   and a to-do with a deadline but no `DTSTART` on the day of its deadline, as a whole day.
 * - `end`: End, excluded, in the same form as `start`; a to-do of a day ends with the day,
 *   a to-do with a time where it starts, since how long it takes is its `minutes`.
 * - `allDay`: Whether the entry covers whole days, for a to-do whether it has no time.
 * - `recurrence`: For an occurrence of a series its start as the series has it, like `2026-10-13T08:00:00.000Z`,
 *   or `2026-10-13` for a series of whole days, for a changed occurrence its `RECURRENCE-ID`;
 *   empty for an entry that happens once.
 * - `file`: Its `.ics` file from `NomWorkspace` on, see `vaultPathOf` in `sources.ts`, which its dialog shows,
 *   like `NomManageplannings/NomManagecalendar/Living/Sleep_2026_Log.ics`.
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
    passcode: string;
    from: string;
    attendees: Attendee[];
    module: string;
    type: string;
    semester: string;
    chapters: string[];
    links: Link[];
    attempts: string[];
    rounds: string[];
    tutors: string[];
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
    carried: boolean;
    number: string;
    group: string;
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
 * What an entry or a box did online, apart from where I physically was, its place: one `X-ONLINE`, its platform
 * as value, a row of `Online.md`, see `Platform` in `places.ts`, the link of its own meeting or video as the standard
 * parameter `ALTREP` and its passcode as the parameter `X-PASSCODE`, both left out while empty, like
 * `X-ONLINE;ALTREP="https://zoom.us/j/123";X-PASSCODE=4f9K2:Zoom`, see {@link textPropertyOf}.
 * An older entry wrote it as its place, which reads so, see {@link onlineOf}: `LOCATION:Online, Zoom`
 * or `Online, Teams, Microsoft` with the link as `ALTREP`, or as a place named after its platform with `Online`
 * among its parts, like `Zoom, Zoom Video Communications, 4f9K2, Online, USA`; and as the `ALTREP` of its `SUMMARY`
 * a link of a platform of `Online.md`, like a video on YouTube.
 *
 * - `online`: The platform, like `Zoom`, empty for none.
 * - `onlineLink`: The link of its meeting or video, a web address, empty for none.
 * - `passcode`: The passcode of its meeting, empty for none.
 */
export type Online = {
    online: string;
    onlineLink: string;
    passcode: string;
};

/**
 * A person or a group I was with, one `ATTENDEE` of an entry or a box, its name as parameter `CN` and its address
 * as value, like `ATTENDEE;CN=Sophale:mailto:sophale@invalid`, see {@link attendeePropertyOf}: the address ends
 * in `.invalid`, reserved for addresses that never work, unless I typed a real one or `Persons.md` has the mail
 * of the person, see {@link attendeePropertyOf}, so the line keeps to the standard
 * and nothing is ever sent.
 *
 * - `name`: Its name, like `Sophale` or `Socials`, a person of `Persons.md` as it names it, like `Bichler, Martin`,
 *   without `;`; the address for a line without `CN`.
 * - `address`: Its address without `mailto:`, like `sophale@invalid`.
 */
export type Attendee = {
    name: string;
    address: string;
};

/**
 * Where a box stood before one push to a later day, one `X-PUSHED`, see {@link pushOf}.
 *
 * - `day`: Its day before, like `2026-10-16`.
 * - `time`: Its start before as ISO instant, like `2026-10-16T13:00:00.000Z`, empty for a box without time;
 *   for a push that noted only its day, like `X-PUSHED;VALUE=DATE:20261016`, that day at the time of day
 *   the box has now.
 * - `minutes`: Its length before in minutes, its parameter `X-ESTIMATED-DURATION`, like 195 of `PT3H15M`,
 *   `null` where the push noted none.
 */
export type Push = {
    day: string;
    time: string;
    minutes: number | null;
};

/**
 * A link of an entry to a file or a folder, one `ATTACH`: its value a path from `NomWorkspace`, never absolute,
 * since `NomWorkspace` lies elsewhere on each computer, and for a file the fingerprint of its content as parameter,
 * so the link survives a rename, see `documents.ts`, like
 * `ATTACH;X-SHA256=9f86d081…:NomSkillingmodules/IN2028_…/VO_…/04_LogisticRegression.pdf`,
 * or `ATTACH:NomSkillingmodules/IN2028_…/02_LogisticPoissonRegression` for the folder of a chapter in an older entry;
 * nothing more, the name of the file says what it is. The value is no full URI, so other calendar apps may ignore it.
 *
 * - `path`: Path from `NomWorkspace`, parted by `/`, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`.
 * - `fingerprint`: SHA-256 of the file's bytes, its parameter `X-SHA256`, as 64 hexadecimal digits; empty for a folder.
 */
export type Link = {
    path: string;
    fingerprint: string;
};

/**
 * Text fields of an event or a to-do to write; an empty field is not written.
 *
 * - `category`: Category of the entry, `CATEGORIES`.
 * - `title`: What, `SUMMARY`.
 * - `titleLink`: Link of what it was, the parameter `ALTREP` of `SUMMARY`, the folder of the skill of a skill entry,
 *   or the one an older entry kept, written only with its `SUMMARY`, empty for none.
 * - `location`: Place, `LOCATION`.
 * - `locationLink`: Link of the place, the parameter `ALTREP` of `LOCATION`, written only with its place,
 *   empty for none.
 * - `online`, `onlineLink`, `passcode`: What it did online, `X-ONLINE`, written only with its platform,
 *   see {@link Online}.
 * - `from`: Where a way starts, `X-FROM`.
 * - `attendees`: Who I was with, one `ATTENDEE` each, see {@link Attendee}; none for nobody.
 * - `module`: Skill of a skill entry, not written, since the `ALTREP` of its `SUMMARY` names it,
 *   see {@link skillPartsOf}.
 * - `type`: Type of a skill entry, not written, since the `ALTREP` of its `SUMMARY` names it.
 * - `semester`: Semester of a skill entry, `X-SEMESTER`, like `2026W`; empty for any other entry.
 * - `note`: Free note, `DESCRIPTION`.
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

/**
 * Fields and times of an event to write: its {@link EntryTexts}, its start and its end.
 *
 * - `start`: Start of the entry.
 * - `end`: End of the entry, after the start.
 */
export type EntryFields = EntryTexts & {
    start: Date;
    end: Date;
};

/**
 * Fields of a to-do to write, a box of the plan: its {@link EntryTexts}, its day and, when it has them,
 * its expected time, its expected duration and its deadline.
 *
 * - `day`: Day of the to-do, like `2026-10-13`, its `DTSTART;VALUE=DATE` when it has no time;
 *   with a deadline the day of its deadline, and no `DTSTART`, see {@link todoAppend}.
 * - `time`: Expected time, its `DTSTART` in Berlin time, on its day; `null` for none and with a deadline.
 * - `minutes`: Expected duration in minutes, its `ESTIMATED-DURATION`; `null` for none.
 * - `deadline`: Deadline, its `DUE`, as ISO instant, or as day like `2026-10-23` without time; empty for none.
 */
export type TodoFields = EntryTexts & {
    day: string;
    time: Date | null;
    minutes: number | null;
    deadline: string;
};

/**
 * A read `.ics` file.
 *
 * - `modified`: Time of the last change on disk in milliseconds.
 * - `entries`: {@link Entry}s that happen once, events and to-dos.
 * - `series`: Recurring events, each knowing its replaced occurrences.
 */
type Calendar = {
    modified: number;
    entries: Entry[];
    series: ICAL.Event[];
};

/**
 * Range of time in both forms of {@link Entry}, so entries compare as plain text.
 *
 * - `days`: First day and day after the last, like `2026-07-03` and `2026-07-04`.
 * - `instants`: Start and end as ISO instants.
 */
type Range = {
    days: [string, string];
    instants: [string, string];
};

/**
 * Text of an `.ics` file as lines.
 *
 * - `lines`: Lines of the file, one per property; a folded line of an older file is joined to the line before
 *   as it is read, see {@link linesRead}.
 * - `newline`: Line break of the file, `\r\n` as the reader writes new files, or `\n`.
 */
type FileLines = {
    lines: string[];
    newline: string;
};

/**
 * Read {@link Calendar}s by their file path.
 */
const calendars: Map<string, Calendar> = new Map();

/**
 * What runs each time a plan or a log of a module is written, see {@link writtenFollow}.
 */
const writtenFollowers: ((module: string, kinds: [string, string][]) => void)[] = [];

/**
 * Time zone of the times the dashboard writes, while I live in Germany.
 */
const zoneName: string = "Europe/Berlin";

/**
 * Definition of {@link zoneName} as the iCalendar format writes it into each new file,
 * with summer time from the last Sunday of March to the last Sunday of October.
 */
const zoneComponent: ICAL.Component = new ICAL.Component(ICAL.parse([
    "BEGIN:VTIMEZONE", `TZID:${zoneName}`,
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
].join("\r\n")));

/**
 * Time zone {@link zoneName}, to turn instants into Berlin time.
 */
const zone: ICAL.Timezone = new ICAL.Timezone(zoneComponent);

/**
 * The one order of the lines of every event and to-do in every file of mine, by the names of their properties,
 * so I find each line where I expect it when I read a file by hand; the reader writes every entry, new or changed,
 * in it, see {@link linesOrdered}: who it is, `UID` and `DTSTAMP`; when, `DTSTART`, `DTEND`, for a to-do `DUE`,
 * `DURATION` and `ESTIMATED-DURATION` after them, then `RRULE`, `RDATE`, `EXDATE` and `RECURRENCE-ID`;
 * what, `CATEGORIES`, `SUMMARY`, `STATUS`; where, `LOCATION`, where a way started,
 * `X-FROM`, and online, `X-ONLINE`; with whom, `ATTENDEE`; more about it, `DESCRIPTION`, `ATTACH`, `RELATED-TO`,
 * the box of the plan a log entry did, `X-PLANNED`, the pushes of a box, `X-PUSHED`, and whether it is carried along,
 * `X-CARRIED`; then the lines of each kind of entry: a box of a course, `X-NUMBER` and `X-GROUP`;
 * a meal, `X-FOOD` and `X-COOKED`; sport, `X-WORKOUT`, `X-EXERCISE`, `X-VIDEO` and `X-PAIN`; a skill entry, `X-TUTOR`,
 * `X-SEMESTER`, `X-CHAPTER`, `X-ATTEMPT` and `X-ROUND`. Every other line comes after them, in the order it had, and the lines of a property
 * that repeats, like `X-FOOD`, `ATTENDEE` or `EXDATE`, stay together in the order they had.
 */
const lineOrder: string[] = [
    "UID", "DTSTAMP",
    "DTSTART", "DTEND", "DUE", "DURATION", "ESTIMATED-DURATION", "RRULE", "RDATE", "EXDATE", "RECURRENCE-ID",
    "CATEGORIES", "SUMMARY", "STATUS",
    "LOCATION", "X-FROM", "X-ONLINE", "ATTENDEE",
    "DESCRIPTION", "ATTACH", "RELATED-TO", "X-PLANNED", "X-PUSHED", "X-CARRIED",
    "X-NUMBER", "X-GROUP",
    "X-FOOD", "X-COOKED",
    "X-WORKOUT", "X-EXERCISE", "X-VIDEO", "X-PAIN",
    "X-TUTOR", "X-SEMESTER", "X-CHAPTER", "X-ATTEMPT", "X-ROUND",
];

/**
 * The parameter `ALTREP` in double quotes, as the standard writes a link there, also one without `:`, like
 * `SUMMARY;ALTREP="NomSkillingmodules/IN2028_…":…`: `ical.js` quotes on its own only a value with `,`, `:` or `;`,
 * and every value of a parameter of several values that asks for it, so `ALTREP` is described as one, of one value
 * here, see {@link textPropertyOf}; one value still reads as its text.
 */
ICAL.design.icalendar.param.altrep = { multiValue: ",", multiValueSeparateDQuote: true };

/**
 * Every `X-` property of my own the reader writes or reads, as text of the standard, the value type of every `X-`
 * property without one: written with each `\`, `;` and `,` escaped by a `\` and a line break as `\n`,
 * like `X-ATTEMPT:Kiosk Chain\;wrong\;Step 2: weights add up to 1.2\, not 1`
 * or `X-FOOD:Skyr natur\;K-Classic\;Kaufland\;150`, and read back without them, as
 * `Kiosk Chain;wrong;Step 2: weights add up to 1.2, not 1`; a line written raw before reads as it is, since it holds
 * no `\` before such a sign. `ical.js` wrote every `X-` value raw, so a strict reader of the standard split
 * them at each `;` and `,`, and a line break in one broke the file, which then could not be read at all.
 * `X-PUSHED` names its own type, `VALUE=DATE-TIME`, see `pushAdd`.
 */
const ownTexts: string[] = [
    "x-from", "x-semester", "x-chapter", "x-attempt", "x-round", "x-tutor", "x-food", "x-cooked", "x-pain",
    "x-workout", "x-exercise", "x-video", "x-number", "x-group", "x-planned", "x-online",
    "x-carried",
];
ownTexts.forEach((name: string): void => {
    ICAL.design.icalendar.property[name] = { defaultType: "text" };
});

/**
 * Gives the lines of a component, one line per property, never folded: `ical.js` folds a line after 75 bytes,
 * which the standard only recommends, for e-mail, and which cut a place in two, like `Burg-Eltz-Weg\, 81`
 * and ` 375 München`; so each fold, a line break and the space after it, is taken back, as every reader
 * of the format unfolds it.
 * - {@link ICAL.Component#toString}: Writes a component in the iCalendar format, lines parted by `\r\n`.
 *
 * @param component - Event, to-do or calendar
 * @returns Its lines, each a whole property
 */
function linesOf(component: ICAL.Component): string[] {
    return component.toString().replace(/\r\n[ \t]/g, "").split("\r\n");
}

/**
 * Category of skill entries, `CATEGORIES:Skill`, whose `ALTREP` of the `SUMMARY` names their skill and type,
 * see {@link skillPartsOf}; the categories of `categories.ts` name it too.
 */
export const skillName: string = "Skill";


/**
 * Reads the skill and the type of a skill entry from the `ALTREP` of its `SUMMARY`, its link, see `skillLinkOf`
 * in `documents.ts`, since its `SUMMARY` is a free title: a link into `NomSkillingmodules` names a module by the code
 * of its folder, the part before the first `_`, like `IN2028` of `NomSkillingmodules/IN2028_…`, and its type by
 * the folder of its material below it, the two capitals before `_`, like `VO` of `…/VO_UniversityLectureLessons/TUM_2026W`,
 * none without one, like my own learning; any other folder names a project by its name, see `skillNameOf`
 * in `sources.ts`, like `NomSystemdashboard`, without type; no link or a web address names neither.
 * - `parts`: Parts of the link.
 *
 * @param link - The `ALTREP`, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_…/TUM_2026W`,
 *   empty for none
 * @returns Skill and type, like `IN2028` and `VO`, or `NomSystemdashboard` and an empty type
 */
function skillPartsOf(link: string): [string, string] {
    const parts: string[] = link.split("/");
    if (link === "" || linkForm.test(link))
        return ["", ""];
    if (!moduleIs(link))
        return [skillNameOf(link), ""];
    return [skillNameOf(parts.slice(0, 2).join("/")), /^([A-Z]{2})_/.exec(parts[2] ?? "")?.[1] ?? ""];
}

/**
 * Turns an `ical.js` time into the form of {@link Entry}.
 * - {@link ICAL.Time#toJSDate}: Converts into a JS date in the time zone of the event.
 *
 * @param time - Start or end of an event
 * @returns Date for an all-day time, else ISO instant
 */
function textOf(time: ICAL.Time): string {
    return time.isDate ? time.toString() : time.toJSDate().toISOString();
}

/**
 * Reads a date or a time in the form of the iCalendar format, as a parameter of my own holds it.
 * - {@link ICAL.design}: Turns a value of the iCalendar format into the form `ical.js` reads,
 *   like `2026-10-26T13:00:00Z` of `20261026T130000Z`.
 *
 * @param value - Date like `20261026`, or time in UTC like `20261026T130000Z`
 * @returns The date or the time
 */
function icsTimeRead(value: string): ICAL.Time {
    return /^\d{8}$/.test(value) ? ICAL.Time.fromDateString(ICAL.design.icalendar.value.date.fromICAL(value))
        : ICAL.Time.fromDateTimeString(ICAL.design.icalendar.value["date-time"].fromICAL(value));
}

/**
 * Writes a date or an instant of the form of {@link Entry} in the form of the iCalendar format, an instant in UTC,
 * as a parameter of my own holds it, see {@link relatedOf}, and the end of a weekly series its `RRULE`,
 * see `groupPut` in `course.ts`.
 * - `time`: The date or the instant in UTC.
 * - {@link ICAL.Time#toICALString}: Writes a time in the iCalendar format.
 *
 * @param text - Date like `2026-10-26`, or ISO instant like `2026-10-26T13:00:00.000Z`
 * @returns Date like `20261026`, or time like `20261026T130000Z`
 */
export function icsTextOf(text: string): string {
    const time: ICAL.Time = /^\d{4}-\d{2}-\d{2}$/.test(text) ? ICAL.Time.fromDateString(text)
        : ICAL.Time.fromJSDate(new Date(text), true);
    return time.toICALString();
}

/**
 * Writes a line of a session of sport, an `X-EXERCISE` or an `X-VIDEO` as `sport.ts` gives it, with its time
 * as a duration of the iCalendar format, as `ESTIMATED-DURATION` holds one: the seconds of an exercise on time,
 * like `Plank;2;PT1M;;Morning` of `Plank;2;60s;;Morning`, and the minutes of a video,
 * like `Full Body Pilates;Lidia Mera;PT25M;https://…;Morning` of `25`; the repetitions of an exercise, like `10`,
 * and a part left empty stay as they are. {@link sportLineOf} reads it back.
 * - `parts`: Parts of the line, parted by `;`.
 * - `time`: Its third part, the repetitions or seconds of an exercise, the minutes of a video.
 * - `seconds`: The seconds of its time, `null` when it holds none.
 * - {@link ICAL.Duration#toString}: Writes a duration in the iCalendar format, like `PT1M30S` of 90 seconds.
 *
 * @param line - Line as `sport.ts` gives it
 * @param video - Whether it is an `X-VIDEO`, else an `X-EXERCISE`
 * @returns Line to write
 */
export function sportIcsOf(line: string, video: boolean): string {
    const parts: string[] = line.split(";");
    const time: string = (parts[2] ?? "").trim();
    const seconds: number | null = video
        ? /^\d+(?:[.,]\d+)?$/.test(time) ? Math.round(Number(time.replace(",", ".")) * 60) : null
        : /^\d+\s*s$/.test(time) ? parseInt(time, 10) : null;
    if (seconds === null)
        return line;
    parts[2] = ICAL.Duration.fromSeconds(seconds).toString();
    return parts.join(";");
}

/**
 * Reads a line of a session of sport as {@link sportIcsOf} writes it, back in the form of `sport.ts`:
 * `Plank;2;60s;;Morning` of `Plank;2;PT1M;;Morning`, `…;Lidia Mera;25;…` of `PT25M`; a line written before,
 * with `60s` or `25`, and a time no duration can be read of stay as they are.
 * - `parts`: Parts of the line, parted by `;`.
 * - `seconds`: The seconds of the duration.
 *
 * @param line - Line of the file, like `Plank;2;PT1M;;Morning`
 * @param video - Whether it is an `X-VIDEO`, else an `X-EXERCISE`
 * @returns Line as `sport.ts` reads it
 */
function sportLineOf(line: string, video: boolean): string {
    const parts: string[] = line.split(";");
    if (!/^P/i.test((parts[2] ?? "").trim()))
        return line;
    try {
        const seconds: number = ICAL.Duration.fromString(parts[2].trim()).toSeconds();
        parts[2] = video ? String(seconds / 60) : `${seconds}s`;
    } catch {
        return line;
    }
    return parts.join(";");
}

/**
 * Reads the identifier of the box a log entry was logged from, see {@link Entry}: the `UID` of its `RELATED-TO`,
 * and for one date of a series that date, its parameter `X-RECURRENCE-ID`, after `#`, as {@link entryIdOf} writes it;
 * else, for an older entry, its `X-PLANNED`, which holds the identifier so. Only a `RELATED-TO` without `RELTYPE`,
 * the standard parent, names that box; one with `RELTYPE=SIBLING` is the series a series of the plan goes on from,
 * see {@link seriesPut}, and names none.
 * - `related`: Its first `RELATED-TO` to a parent, `undefined` for none.
 * - `recurrence`: Its date of a series, like `20261013T080000Z`, empty for none.
 *
 * @param component - The event
 * @returns Identifier like `study-13@nomsystem` or `weekly-lecture@nomsystem#2026-10-13T08:00:00.000Z`,
 *   empty for none
 */
function plannedOf(component: ICAL.Component): string {
    const related: ICAL.Property | undefined = component.getAllProperties("related-to")
        .find((property: ICAL.Property): boolean =>
            ["", "PARENT"].includes(String(property.getParameter("reltype") ?? "").toUpperCase()));
    if (related === undefined)
        return String(component.getFirstPropertyValue("x-planned") ?? "");
    const recurrence: string = String(related.getParameter("x-recurrence-id") ?? "");
    return recurrence === "" ? String(related.getFirstValue())
        : `${related.getFirstValue()}#${textOf(icsTimeRead(recurrence))}`;
}

/**
 * Reads the day of one `X-PUSHED`, see {@link pushAdd}: of its start in Berlin time,
 * like `X-PUSHED;TZID=Europe/Berlin;X-ESTIMATED-DURATION=PT3H15M;VALUE=DATE-TIME:20261016T150000`, of its date,
 * like `X-PUSHED;VALUE=DATE:20261012`, or of an older box written like `X-PUSHED:2026-10-12`.
 *
 * @param value - Its value, a time, a date or a text
 * @returns Day like `2026-10-12`
 */
function pushedDayOf(value: unknown): string {
    if (value instanceof ICAL.Time)
        return value.toString().slice(0, 10);
    return /^\d{8}$/.test(String(value)) ? icsTimeRead(String(value)).toString() : String(value);
}

/**
 * Reads one `X-PUSHED` of a box, see {@link pushAdd}, into a {@link Push}: its day, its start and its length,
 * like Fri, 16.10.2026, 15:00 and 195 minutes
 * of `X-PUSHED;TZID=Europe/Berlin;X-ESTIMATED-DURATION=PT3H15M;VALUE=DATE-TIME:20261016T150000`; a push that noted
 * only its day, like `X-PUSHED;VALUE=DATE:20261016` or `X-PUSHED:2026-10-16` of an older box, at the time of day
 * the box has now, without time for a box without.
 * - `value`: Its value, a time, a date or a text.
 * - `day`: Its day, see {@link pushedDayOf}.
 * - `duration`: Its `X-ESTIMATED-DURATION`, empty for none.
 * - `time`: The time of day it stood at, `null` for a box without time.
 * - {@link ICAL.Time.fromData}: Builds a time from its parts, in a time zone.
 * - {@link ICAL.Duration.fromString}: Reads a duration of the iCalendar format.
 *
 * @param property - The `X-PUSHED`
 * @param now - Start of the box now in Berlin time, `null` for a box without time
 * @returns Where the box stood before the push
 */
function pushOf(property: ICAL.Property, now: ICAL.Time | null): Push {
    const value: unknown = property.getFirstValue();
    const day: string = pushedDayOf(value);
    const duration: string = String(property.getParameter("x-estimated-duration") ?? "");
    const [year, month, date]: number[] = day.split("-").map(Number);
    const time: ICAL.Time | null = value instanceof ICAL.Time && !value.isDate ? value : now;
    return {
        day: day,
        time: time === null ? "" : ICAL.Time.fromData({
            year: year, month: month, day: date, hour: time.hour, minute: time.minute, second: time.second,
        }, zone).toJSDate().toISOString(),
        minutes: duration === "" ? null : ICAL.Duration.fromString(duration).toSeconds() / 60,
    };
}

/**
 * Reads the expected duration of a to-do, its `ESTIMATED-DURATION`: the property of the task extensions of iCalendar,
 * which `ical.js` does not know yet, so it gives its value as text, like `PT1H15M`.
 * - {@link ICAL.Duration.fromString}: Reads a duration of the iCalendar format.
 *
 * @param component - The to-do
 * @returns Minutes, `null` when it has none
 */
function minutesOf(component: ICAL.Component): number | null {
    const value: unknown = component.getFirstPropertyValue("estimated-duration");
    return value === null ? null : ICAL.Duration.fromString(String(value)).toSeconds() / 60;
}

/**
 * Reads the deadline of a to-do, its `DUE`, in the form of {@link Entry}.
 *
 * @param component - The to-do
 * @returns Date for a deadline without time, else ISO instant; empty when it has none
 */
function deadlineOf(component: ICAL.Component): string {
    const due: unknown = component.getFirstPropertyValue("due");
    return due instanceof ICAL.Time ? textOf(due) : "";
}

/**
 * Gives the day of a to-do with a deadline but no `DTSTART`, the day of its deadline in Berlin time,
 * as the start and the end of a whole day.
 * - `due`: Its `DUE`, a day or a time.
 * - `day`: Its day, like `2026-10-23`.
 * - {@link ICAL.Time.fromDateString}: Reads a day like `2026-10-23` into a time without time of day.
 *
 * @param component - The to-do
 * @returns Start of its day and start of the next
 */
function deadlineDayOf(component: ICAL.Component): [ICAL.Time, ICAL.Time] {
    const due: ICAL.Time = component.getFirstPropertyValue("due") as ICAL.Time;
    const day: string = due.isDate ? due.toString() : berlinDateOf(due.toJSDate());
    return [ICAL.Time.fromDateString(day), ICAL.Time.fromDateString(dayAdd(day, 1))];
}

/**
 * Where an entry was and what it did online, with the link of its summary, see {@link onlineOf}.
 */
type Placed = Online & Pick<Entry, "titleLink" | "location" | "locationLink">;

/**
 * Reads where an event or a to-do was, its place with its link, what it did online, see {@link Online},
 * and the link of its summary: from its `X-ONLINE` and its `LOCATION`, and from what an older entry wrote,
 * as one place: `Online, Zoom` or `Online, Teams, Microsoft`, its platform after `Online`, `Online` alone
 * for none named, or a place named after its platform with `Online` among its parts, like
 * `Zoom, Zoom Video Communications, 4f9K2, Online, USA`, both read as what it did online, the link of the place
 * as that of its meeting, its place then empty; and as the `ALTREP` of its `SUMMARY` a link of a platform
 * of `Online.md`, see `platformOfLink` in `places.ts`, read as its link online, its summary then without link.
 * Its own `X-ONLINE` wins over both.
 * - `summaryLink`: The `ALTREP` of its `SUMMARY`, empty for none.
 * - `line`: Its `LOCATION`, empty for none.
 * - `lineLink`: The `ALTREP` of its `LOCATION`, empty for none.
 * - `own`: Its `X-ONLINE`, `null` for none.
 * - `parts`: The parts of its `LOCATION`.
 * - `placed`: Whether its `LOCATION` was what it did online.
 * - `linked`: Whether the link of its summary is one of a platform.
 *
 * @param component - Event or to-do
 * @returns Its place with its link, what it did online and the link of its summary
 */
function onlineOf(component: ICAL.Component): Placed {
    const summaryLink: string = String(component.getFirstProperty("summary")?.getParameter("altrep") ?? "");
    const line: string = String(component.getFirstPropertyValue("location") ?? "");
    const lineLink: string = String(component.getFirstProperty("location")?.getParameter("altrep") ?? "");
    const own: ICAL.Property | null = component.getFirstProperty("x-online");
    const parts: string[] = line.split(",").map((part: string): string => part.trim());
    const placed: boolean = parts.slice(1).some((part: string): boolean => part === "Online" || part.endsWith(" Online"))
        || parts[0] === "Online";
    const linked: boolean = linkForm.test(summaryLink) && platformOfLink(summaryLink) !== undefined;
    const online: Online = own !== null ? {
        online: String(own.getFirstValue() ?? ""), onlineLink: String(own.getParameter("altrep") ?? ""),
        passcode: String(own.getParameter("x-passcode") ?? ""),
    } : placed ? { online: parts[0] === "Online" ? parts[1] ?? "Online" : labelOf(line), onlineLink: lineLink, passcode: "" }
        : linked ? { online: platformOfLink(summaryLink)?.name ?? "", onlineLink: summaryLink, passcode: "" }
            : { online: "", onlineLink: "", passcode: "" };
    return {
        ...online,
        titleLink: linked ? "" : summaryLink,
        location: placed ? "" : line,
        locationLink: placed ? "" : lineLink,
    };
}

/**
 * Turns an event or a to-do with a start and an end into an {@link Entry}.
 * `ical.js` reads a to-do as it reads an event: its start from `DTSTART`, its end the end of its day,
 * or its start when it has a time, see {@link Entry}.
 * - `todo`: Whether it is a to-do.
 * - `category`: Its `CATEGORIES`, empty for none.
 * - `module`, `type`: Skill and type of a skill entry from the `ALTREP` of its `SUMMARY`, see {@link skillPartsOf},
 *   else empty.
 * - `stamp`: Its `DTSTAMP`, an `ical.js` time when it has one.
 * - `recurrence`: For a changed occurrence its `RECURRENCE-ID`, for an occurrence of a series its start,
 *   empty for an event that happens once.
 * - `online`: Its place, the link of its summary and what it did online, see {@link onlineOf}.
 * - {@link createHash}: Computes its fingerprint, the SHA-256 of its lines as read, written out by
 *   {@link ICAL.Component#toString}, see `version` of {@link Entry}.
 *
 * @param event - Event with title and place, or the series of an occurrence, or a to-do
 * @param start - Start of the event or the occurrence
 * @param end - End of the event or the occurrence
 * @param file - Path of the `.ics` file of the event
 * @returns Entry as the page shows it
 */
function entryOf(event: ICAL.Event, start: ICAL.Time, end: ICAL.Time, file: string): Entry {
    const todo: boolean = event.component.name === "vtodo";
    const category: string = String(event.component.getFirstPropertyValue("categories") ?? "");
    const online: Placed = onlineOf(event.component);
    const [module, type]: [string, string] =
        category === skillName ? skillPartsOf(online.titleLink) : ["", ""];
    const stamp: unknown = event.component.getFirstPropertyValue("dtstamp");
    let recurrence: string = "";
    if (event.isRecurrenceException())
        recurrence = textOf(event.recurrenceId);
    else if (event.isRecurring())
        recurrence = textOf(start);
    return {
        id: event.uid,
        category: category,
        title: event.summary ?? "",
        ...online,
        from: String(event.component.getFirstPropertyValue("x-from") ?? ""),
        attendees: event.component.getAllProperties("attendee").map((property: ICAL.Property): Attendee => {
            const address: string = String(property.getFirstValue()).replace(/^mailto:/i, "");
            return { name: String(property.getParameter("cn") ?? address), address: address };
        }),
        module: module,
        type: type,
        semester: String(event.component.getFirstPropertyValue("x-semester") ?? ""),
        chapters: event.component.getAllProperties("x-chapter")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        links: event.component.getAllProperties("attach").map((property: ICAL.Property): Link => ({
            path: String(property.getFirstValue()), fingerprint: String(property.getParameter("x-sha256") ?? ""),
        })),
        attempts: event.component.getAllProperties("x-attempt")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        rounds: event.component.getAllProperties("x-round")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        tutors: event.component.getAllProperties("x-tutor")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        foods: event.component.getAllProperties("x-food")
            .map((property: ICAL.Property): string => String(property.getFirstValue())),
        cooked: String(event.component.getFirstPropertyValue("x-cooked") ?? ""),
        pain: String(event.component.getFirstPropertyValue("x-pain") ?? ""),
        workout: String(event.component.getFirstPropertyValue("x-workout") ?? ""),
        exercises: event.component.getAllProperties("x-exercise")
            .map((property: ICAL.Property): string => sportLineOf(String(property.getFirstValue()), false)),
        videos: event.component.getAllProperties("x-video")
            .map((property: ICAL.Property): string => sportLineOf(String(property.getFirstValue()), true)),
        planned: plannedOf(event.component),
        note: event.description ?? "",
        todo: todo,
        status: String(event.component.getFirstPropertyValue("status") ?? ""),
        minutes: todo ? minutesOf(event.component) : null,
        deadline: todo ? deadlineOf(event.component) : "",
        pushed: event.component.getAllProperties("x-pushed").map((property: ICAL.Property): Push =>
            pushOf(property, start.isDate ? null : berlinOf(start.toJSDate()))),
        carried: String(event.component.getFirstPropertyValue("x-carried") ?? "").toUpperCase() !== "FALSE",
        number: String(event.component.getFirstPropertyValue("x-number") ?? ""),
        group: String(event.component.getFirstPropertyValue("x-group") ?? ""),
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
 * Reads an `.ics` file into a {@link Calendar}, its events and its to-dos; a to-do without `DTSTART`
 * lies on the day of its deadline, its `DUE`, see {@link deadlineDayOf}, and one with neither,
 * which would belong to every day until done, has no day of the plan and is left out.
 * Registers the time zones of the file first, so times with a `TZID` convert correctly.
 * A changed occurrence has the `UID` of its series and a `RECURRENCE-ID`.
 * It stays an entry of its own at its new time,
 * and its series learns that it replaces the occurrence at the old time.
 * - {@link ICAL.parse}: Parses the text of the file into nested arrays.
 * - {@link ICAL.Event}: Reads an event, and a to-do the same way, by their common properties.
 * - {@link ICAL.Event#relateException}: Marks one occurrence of a series as replaced by a changed one.
 *
 * @param file - Path of the `.ics` file
 * @param modified - Time of the last change on disk
 * @returns Calendar of the file
 */
function calendarRead(file: string, modified: number): Calendar {
    const root: ICAL.Component = new ICAL.Component(ICAL.parse(readFileSync(file, "utf8")));
    root.getAllSubcomponents("vtimezone")
        .forEach((zone: ICAL.Component): void => ICAL.TimezoneService.register(zone));

    const events: ICAL.Event[] = [
        ...root.getAllSubcomponents("vevent"),
        ...root.getAllSubcomponents("vtodo")
            .filter((todo: ICAL.Component): boolean => todo.hasProperty("dtstart") || todo.hasProperty("due")),
    ].map((component: ICAL.Component): ICAL.Event => new ICAL.Event(component));
    const series: Map<string, ICAL.Event> = new Map(events
        .filter((event: ICAL.Event): boolean => event.isRecurring())
        .map((event: ICAL.Event): [string, ICAL.Event] => [event.uid, event]));
    events
        .filter((event: ICAL.Event): boolean => event.isRecurrenceException())
        .forEach((change: ICAL.Event): void => series.get(change.uid)?.relateException(change));

    return {
        modified: modified,
        entries: events
            .filter((event: ICAL.Event): boolean => !event.isRecurring())
            .map((event: ICAL.Event): Entry => event.component.hasProperty("dtstart")
                ? entryOf(event, event.startDate, event.endDate, file)
                : entryOf(event, ...deadlineDayOf(event.component), file)),
        series: [...series.values()],
    };
}

/**
 * Gives the {@link Calendar} of a file, read again only when the file changed on disk.
 *
 * @param file - Path of the `.ics` file
 * @returns Calendar of the file
 */
function calendarOf(file: string): Calendar {
    const modified: number = statSync(file).mtimeMs;
    const known: Calendar | undefined = calendars.get(file);
    if (known?.modified === modified)
        return known;

    const calendar: Calendar = calendarRead(file, modified);
    calendars.set(file, calendar);
    return calendar;
}

/**
 * Lists the `.ics` files of calendar sources.
 * A folder that does not exist yet, like the new system before its first entry, gives no files.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @returns Paths of the `.ics` files
 */
function filesOf(sources: CalendarSource[]): string[] {
    return sources
        .filter((source: CalendarSource): boolean => existsSync(source.folder))
        .flatMap((source: CalendarSource): string[] =>
            readdirSync(source.folder, { recursive: true, encoding: "utf8" })
                .filter((name: string): boolean => name.endsWith(source.ending))
                .map((name: string): string => join(source.folder, name)));
}

/**
 * Gives the bounds of a {@link Range} in the form of an {@link Entry}.
 *
 * @param allDay - Whether the entry covers whole days
 * @param range - Range in both forms
 * @returns Days for an all-day entry, else instants
 */
function boundsOf(allDay: boolean, range: Range): [string, string] {
    return allDay ? range.days : range.instants;
}

/**
 * Lists the occurrences of a series that start before the end of a range, in order.
 * Leaves out the replaced ones, their changed versions are entries of their own.
 * - {@link ICAL.Event#iterator}: Walks the starts of all occurrences, without the excluded ones.
 * - {@link ICAL.Event#getOccurrenceDetails}: Gives start and end of one occurrence,
 *   and as `item` the changed version when the occurrence is replaced.
 *
 * @param series - Recurring event
 * @param range - Range whose end stops the walk
 * @param file - Path of the `.ics` file of the series, whose occurrence may be changed alone while it may be written
 * @returns {@link Entry} of each occurrence that is not replaced
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
 * Reads the entries of calendar sources that start in a range or overlap it, the first so a to-do with a time
 * but no length, which ends where it starts, is found too; a source whose folder or files are missing gives none.
 * Compares all-day entries by their dates and timed entries by their instants,
 * so a birthday stays on its date in every time zone.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param start - Start of the range with offset, like `2026-07-03T00:00:00+02:00`
 * @param end - End of the range, excluded, in the same form
 * @param kept - Tells whether an entry is wanted, a series by its first occurrence before its occurrences are walked,
 *   so a series not wanted costs no time, like the groups of a tutorial in the plan of a module, see `groupIs`
 *   in `boxes.ts`; every entry when left out
 * @returns {@link Entry}s overlapping the range
 */
export function entriesRead(sources: CalendarSource[], start: string, end: string,
                            kept: (entry: Entry) => boolean = (): boolean => true): Entry[] {
    const range: Range = {
        days: [start.slice(0, 10), end.slice(0, 10)],
        instants: [new Date(start).toISOString(), new Date(end).toISOString()],
    };

    return filesOf(sources)
        .flatMap((file: string): Entry[] => [
            ...calendarOf(file).entries.filter(kept),
            ...calendarOf(file).series
                .filter((series: ICAL.Event): boolean => kept(entryOf(series, series.startDate, series.endDate, file)))
                .flatMap((series: ICAL.Event): Entry[] => occurrencesOf(series, range, file)),
        ])
        .filter((entry: Entry): boolean => {
            const [from, to]: [string, string] = boundsOf(entry.allDay, range);
            return entry.start < to && (entry.start >= from || entry.end > from);
        });
}

/**
 * Reads the entries of calendar sources that happen once, events, to-dos and changed occurrences of a series,
 * whenever they lie, without walking a series; a source whose folder or files are missing gives none.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @returns The {@link Entry}s, file by file in the order they were read
 */
export function entriesOnceRead(sources: CalendarSource[]): Entry[] {
    return filesOf(sources).flatMap((file: string): Entry[] => calendarOf(file).entries);
}

/**
 * Reads the entries of one `.ics` file that happen once, like an entry Vu's dashboard shared, see `shared.ts`.
 *
 * @param file - Path of the file
 * @returns The {@link Entry}s of the file, none for none
 */
export function fileEntriesRead(file: string): Entry[] {
    return calendarOf(file).entries;
}

/**
 * Looks for the entry of the one event or to-do with an identifier in calendar sources.
 * An occurrence of a series has the identifier of its series, so it counts as none, a changed one too,
 * see {@link occurrenceLookup}.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param id - Identifier of the event or to-do
 * @returns Path of its `.ics` file and its {@link Entry}, `undefined` when no entry that happens once has the identifier
 */
export function entryLookup(sources: CalendarSource[], id: string): [string, Entry] | undefined {
    for (const file of filesOf(sources)) {
        const entry: Entry | undefined = calendarOf(file).entries
            .find((candidate: Entry): boolean => candidate.id === id && candidate.recurrence === "");
        if (entry !== undefined)
            return [file, entry];
    }
    return undefined;
}

/**
 * Finds the `.ics` file of the event, to-do or series with an identifier in calendar sources, like a birthday
 * of `Birthdays.ics`, a yearly series.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param id - Identifier, its `UID`, like `birthday-anna@nomsystem`
 * @returns Path of the file, `undefined` when none holds the identifier
 */
export function fileOfId(sources: CalendarSource[], id: string): string | undefined {
    return filesOf(sources).find((file: string): boolean =>
        calendarOf(file).entries.some((entry: Entry): boolean => entry.id === id)
        || calendarOf(file).series.some((series: ICAL.Event): boolean => series.uid === id));
}

/**
 * Looks for an occurrence of a series in calendar sources by the identifier of the series and the start
 * of the occurrence as the series has it, see {@link Entry}: a changed occurrence among the entries of a file,
 * else the occurrence the series itself has at that start.
 * - `calendar`: A file read.
 * - `changed`: The changed occurrence with that `RECURRENCE-ID`, `undefined` for none.
 * - `series`: The series with the identifier, `undefined` for none in the file.
 * - `day`: Day of the occurrence, like `2026-10-13`.
 * - `range`: From the start of the occurrence to a moment later, or to the next day for a series of whole days,
 *   so walking the series stops right after it, see {@link occurrencesOf}.
 * - `occurrence`: The occurrence of the series at that start, `undefined` for none.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param id - Identifier of the series, like `weekly-lecture@nomsystem`
 * @param recurrence - Start of the occurrence as the series has it, like `2026-10-13T08:00:00.000Z`
 * @returns Path of its `.ics` file and its {@link Entry}, `undefined` when no series has such an occurrence
 */
export function occurrenceLookup(sources: CalendarSource[], id: string,
                                 recurrence: string): [string, Entry] | undefined {

    for (const file of filesOf(sources)) {
        const calendar: Calendar = calendarOf(file);
        const changed: Entry | undefined = calendar.entries
            .find((candidate: Entry): boolean => candidate.id === id && candidate.recurrence === recurrence);
        if (changed !== undefined)
            return [file, changed];

        const series: ICAL.Event | undefined =
            calendar.series.find((candidate: ICAL.Event): boolean => candidate.uid === id);
        const day: string = recurrence.slice(0, 10);
        const range: Range = {
            days: [day, dayAdd(day, 1)],
            instants: [recurrence, new Date(Date.parse(recurrence) + 1).toISOString()],
        };
        const occurrence: Entry | undefined = series === undefined ? undefined
            : occurrencesOf(series, range, file)
                .find((candidate: Entry): boolean => candidate.recurrence === recurrence);
        if (occurrence !== undefined)
            return [file, occurrence];
    }
    return undefined;
}

/**
 * Finds the entry of the one event or to-do with an identifier in calendar sources, see {@link entryLookup}.
 * - `found`: Path and entry, `undefined` for none.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param id - Identifier of the event or to-do
 * @returns Path of its `.ics` file and its {@link Entry}
 * @throws {Error} - When no entry that happens once has the identifier
 */
export function entryFind(sources: CalendarSource[], id: string): [string, Entry] {
    const found: [string, Entry] | undefined = entryLookup(sources, id);
    if (found === undefined)
        throw new Error(`No entry ${id}`);
    return found;
}

/**
 * Stops a write outside the folders of the new system, like into my modules.
 *
 * @param file - Path of the file to write
 * @throws {Error} - When the file lies outside the folders of the new system
 */
function writeCheck(file: string): void {
    if (!writeAllowed(file))
        throw new Error(`No writing outside the new system: ${file}`);
}

/**
 * Reads an `.ics` file as {@link FileLines}, one line per property: a folded line, one that starts with a space
 * or a tab, is joined to the line before without that first space or tab, as the format unfolds it, so a file written
 * back holds no fold any more, see {@link linesOf}.
 * - `text`: The file.
 * - `newline`: Its line break.
 * - `lines`: Its lines, unfolded.
 *
 * @param file - Path of the `.ics` file
 * @returns Lines of the file with its line break
 */
function linesRead(file: string): FileLines {
    const text: string = readFileSync(file, "utf8");
    const newline: string = text.includes("\r\n") ? "\r\n" : "\n";
    const lines: string[] = [];
    text.split(newline).forEach((line: string): void => {
        if (/^[ \t]/.test(line) && lines.length > 0)
            lines[lines.length - 1] += line.slice(1);
        else
            lines.push(line);
    });
    return { lines: lines, newline: newline };
}

/**
 * Types of the entries of the plan or the log of a module in the order they stand in its file,
 * see {@link componentsSorted}: lectures, exercises, central exercises, tutorials, homework, then exams.
 */
const typeOrder: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA"];

/**
 * Puts the events and to-dos of an `.ics` file into one order, so the file reads well for me too, each with its lines
 * exactly as they are, the lines before the first of them, its header and its time zone, first, and every other line
 * after them, like `END:VCALENDAR`. In the plan or the log of a module by type, see {@link typeOrder}, any other type
 * after them by its name, an entry without type last, like a box of my own learning, and within a type by start,
 * the groups of a tutorial, to-dos with `X-GROUP` and without `X-NUMBER`, after the boxes of their type; in every
 * other file by start alone, like `Sleep_2026_Log.ics`. A series is followed right by the occurrences changed alone,
 * with its `UID` and their `RECURRENCE-ID`, the earliest first. Entries of the same place keep the order they had.
 * A file it cannot read so, like one whose last entry has no end, stays as it is.
 * - `head`: The lines before the first event or to-do.
 * - `blocks`: The lines of each event or to-do, in the order they stood.
 * - `rest`: Every other line after the first event or to-do.
 * - `block`: The lines of the event or to-do being read, `null` between two.
 * - `depth`: Number of components the line is in, 1 in the calendar itself.
 * - `timeOf`: Gives a time of an event or a to-do as its line holds it, see {@link textOf}, empty for none.
 * - `typeOf`: Gives the type of a skill entry, see {@link skillPartsOf}, empty for none.
 * - `starts`: The start of each, its `DTSTART`, of a to-do with a deadline its `DUE`.
 * - `units`: Each series with its changed occurrences, or an entry alone, by its place in the file.
 * - `series`: The unit of each series by its `UID`.
 * - `keyOf`: Gives the place of a unit, of its first entry: its type's place, that type, whether it is a group
 *   and its start.
 *
 * @param lines - Lines of the file, unfolded, see {@link linesRead}
 * @param module - Whether it is the plan or the log of a module, see `modulesRoot` in `sources.ts`
 * @returns The same lines in that order
 */
export function componentsSorted(lines: string[], module: boolean): string[] {
    const head: string[] = [];
    const blocks: string[][] = [];
    const rest: string[] = [];
    let block: string[] | null = null;
    let depth: number = 0;
    lines.forEach((line: string): void => {
        if (block === null && depth === 1 && (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO"))
            block = [];
        if (line.startsWith("BEGIN:"))
            depth++;
        if (block !== null)
            block.push(line);
        else
            (blocks.length === 0 ? head : rest).push(line);
        if (line.startsWith("END:"))
            depth--;
        if (block !== null && depth === 1) {
            blocks.push(block);
            block = null;
        }
    });
    if (block !== null)
        return lines;

    const timeOf: (component: string[], name: string) => string = (component: string[], name: string): string => {
        const line: string = unfoldedOf(component, name);
        return line === "" ? "" : textOf(ICAL.Property.fromString(line).getFirstValue() as ICAL.Time);
    };
    const typeOf: (component: string[]) => string = (component: string[]): string => {
        const summary: string = unfoldedOf(component, "SUMMARY");
        const link: unknown = summary === "" ? "" : ICAL.Property.fromString(summary).getParameter("altrep");
        return skillPartsOf(String((Array.isArray(link) ? link[0] : link) ?? ""))[1];
    };
    const starts: Map<string[], string> = new Map(blocks.map((component: string[]): [string[], string] =>
        [component, timeOf(component, "DTSTART") || timeOf(component, "DUE")]));
    const units: string[][][] = [];
    const series: Map<string, string[][]> = new Map();
    blocks.filter((component: string[]): boolean => unfoldedOf(component, "RECURRENCE-ID") === "")
        .forEach((component: string[]): void => {
            const unit: string[][] = [component];
            units.push(unit);
            series.set(unfoldedOf(component, "UID"), unit);
        });
    blocks.filter((component: string[]): boolean => unfoldedOf(component, "RECURRENCE-ID") !== "")
        .sort((first: string[], second: string[]): number =>
            timeOf(first, "RECURRENCE-ID").localeCompare(timeOf(second, "RECURRENCE-ID")))
        .forEach((component: string[]): void => {
            const unit: string[][] | undefined = series.get(unfoldedOf(component, "UID"));
            if (unit === undefined)
                units.push([component]);
            else
                unit.push(component);
        });

    const keyOf: (unit: string[][]) => [number, string, number, string] = (unit: string[][]): [number, string,
        number, string] => {
        const type: string = module ? typeOf(unit[0]) : "";
        const place: number = typeOrder.indexOf(type);
        const group: boolean = unfoldedOf(unit[0], "X-GROUP") !== "" && unfoldedOf(unit[0], "X-NUMBER") === "";
        return [place !== -1 ? place : type !== "" ? typeOrder.length : typeOrder.length + 1, type, group ? 1 : 0,
            starts.get(unit[0]) ?? ""];
    };
    units.sort((first: string[][], second: string[][]): number => {
        const [one, other]: [number, string, number, string][] = [keyOf(first), keyOf(second)];
        return one[0] - other[0] || one[1].localeCompare(other[1]) || one[2] - other[2] || one[3].localeCompare(other[3]);
    });
    return [...head, ...units.flat(2), ...rest];
}

/**
 * Writes {@link FileLines} into an `.ics` file, creating its folders when missing, its events and to-dos in their
 * order, see {@link componentsSorted}.
 *
 * @param file - Path of the `.ics` file
 * @param text - Lines with their line break
 */
function linesWrite(file: string, text: FileLines): void {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, componentsSorted(text.lines, dirname(file) === modulesRoot).join(text.newline));
    if (dirname(file) === modulesRoot)
        writtenFollowers.forEach((follower: (module: string, kinds: [string, string][]) => void): void =>
            follower(basename(file).replace(/_(Plan|Log)\.ics$/, ""), kindsOf(text.lines)));
}

/**
 * Takes what runs each time a plan or a log of a module is written, see {@link linesWrite}, like the folders
 * of the material of its types being made, see `typeFoldersMake` in `notes.ts`, which registers itself here, since
 * `notes.ts` reads this file and this file may not read it in turn.
 *
 * @param follower - Takes the name of the module folder, like `IN2028_BusinessAnalyticsMachineLearning`, and the type
 *   and semester of each of its entries, see {@link kindsOf}
 */
export function writtenFollow(follower: (module: string, kinds: [string, string][]) => void): void {
    writtenFollowers.push(follower);
}

/**
 * Gives the type and the semester of each skill entry of the lines of a file, the type from the folder its `SUMMARY`
 * links, see {@link skillPartsOf}, its semester from its `X-SEMESTER`, so the folders of their material are made,
 * see `typeFoldersMake` in `notes.ts`.
 * - `kinds`: The type and the semester of each entry read so far.
 * - `type`, `semester`: Those of the entry being read, empty for none.
 *
 * @param lines - Lines of a plan or a log of a module
 * @returns Type and semester of each entry with both, like `TU` and `2026W`
 */
function kindsOf(lines: string[]): [string, string][] {
    const kinds: [string, string][] = [];
    let type: string = "";
    let semester: string = "";
    lines.forEach((line: string): void => {
        if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
            [type, semester] = ["", ""];
        else if (line.startsWith("SUMMARY;"))
            type = skillPartsOf(/ALTREP="([^"]*)"/.exec(line)?.[1] ?? "")[1];
        else if (line.startsWith("X-SEMESTER:"))
            semester = line.slice("X-SEMESTER:".length).trim();
        else if ((line === "END:VEVENT" || line === "END:VTODO") && type !== "" && semester !== "")
            kinds.push([type, semester]);
    });
    return kinds;
}

/**
 * Creates an empty calendar with only the header the standard asks for, `PRODID` and `VERSION`,
 * and the time zone {@link zoneName}, which every `DTSTART` names. No `X-WR-CALNAME`, since its name is the name
 * of its file, like `Sleep_2026_Log`, no `X-WR-TIMEZONE`, no `CALSCALE`, since `GREGORIAN` is the default,
 * and no `METHOD`, which only invitations need.
 *
 * @returns Calendar without events
 */
function calendarCreate(): ICAL.Component {
    const root: ICAL.Component = new ICAL.Component("vcalendar");
    root.addPropertyWithValue("prodid", "-//NomSystem//Dashboard//DE");
    root.addPropertyWithValue("version", "2.0");
    root.addSubcomponent(zoneComponent);
    return root;
}

/**
 * Gives the place of a line of an event or a to-do in the fixed order: the place of its property
 * in {@link lineOrder}, after them every other line.
 * - `name`: Name of its property, like `DTSTART` of `DTSTART;TZID=Europe/Berlin:20261013T100000`.
 * - `place`: Its place in the list, -1 for none.
 *
 * @param line - First line of a property
 * @returns Its rank, the lower the earlier
 */
function lineRankOf(line: string): number {
    const name: string = line.split(/[;:]/)[0].toUpperCase();
    const place: number = lineOrder.indexOf(name);
    return place === -1 ? lineOrder.length : place;
}

/**
 * Puts the lines of an event or a to-do into the fixed order, see {@link lineOrder}: each property with the lines
 * that continue it, lines of the same rank in the order they had, and the components inside it, like an alarm,
 * at its end as they are, before its last line, like `END:VEVENT`.
 * - `properties`: Each property, its rank and its lines, in the order they stood.
 * - `inner`: Lines of the components inside it.
 * - `depth`: Number of components inside it the line is in.
 * - {@link Array#sort}: Keeps the order of lines of the same rank.
 *
 * @param component - Lines from `BEGIN:VEVENT` to `END:VEVENT`, or of a to-do
 * @returns The same lines in the fixed order
 */
function linesOrdered(component: string[]): string[] {
    const properties: [number, string[]][] = [];
    const inner: string[] = [];
    let depth: number = 0;
    component.slice(1, -1).forEach((line: string): void => {
        if (line.startsWith("BEGIN:"))
            depth++;
        if (depth > 0)
            inner.push(line);
        else if (/^[ \t]/.test(line) && properties.length > 0)
            properties[properties.length - 1][1].push(line);
        else
            properties.push([lineRankOf(line), [line]]);
        if (line.startsWith("END:"))
            depth--;
    });
    return [
        component[0],
        ...properties
            .sort((first: [number, string[]], second: [number, string[]]): number => first[0] - second[0])
            .flatMap(([, lines]: [number, string[]]): string[] => lines),
        ...inner,
        component[component.length - 1],
    ];
}

/**
 * Puts the lines of an event or a to-do, in the fixed order, see {@link linesOrdered}, before the last line
 * `END:VCALENDAR` of an `.ics` file, so everything already in the file stays as it is, byte for byte.
 * A missing file is created with the header of a new calendar, see {@link calendarCreate}.
 * - {@link ICAL.Component#toString}: Writes a component in the iCalendar format, lines parted by `\r\n`.
 *
 * @param file - Path of the `.ics` file
 * @param event - Lines from `BEGIN:VEVENT` to `END:VEVENT`, or from `BEGIN:VTODO` to `END:VTODO`
 * @throws {Error} - When the file has no line `END:VCALENDAR`
 */
function componentInsert(file: string, event: string[]): void {
    const text: FileLines = existsSync(file)
        ? linesRead(file)
        : { lines: [...linesOf(calendarCreate()), ""], newline: "\r\n" };
    const calendarEnd: number = text.lines.lastIndexOf("END:VCALENDAR");
    if (calendarEnd === -1)
        throw new Error(`No END:VCALENDAR in ${file}`);

    text.lines.splice(calendarEnd, 0, ...linesOrdered(event));
    linesWrite(file, text);
}

/**
 * Finds the first property of a name among the lines of an event or a to-do,
 * leaving out the components inside it, like an alarm.
 * - `depth`: Number of components inside the event the line is in.
 *
 * @param event - Lines from `BEGIN:VEVENT` to `END:VEVENT`, or of a to-do
 * @param name - Name of the property, like `DTSTART`
 * @returns Index of its first line and of the line after its last, or `null` when the event has none
 */
function propertyFind(event: string[], name: string): [number, number] | null {
    const head: RegExp = new RegExp(`^${name}[;:]`, "i");
    let depth: number = 0;
    for (let index: number = 1; index < event.length - 1; index++) {
        if (event[index].startsWith("BEGIN:"))
            depth++;
        else if (event[index].startsWith("END:"))
            depth--;
        else if (depth === 0 && head.test(event[index])) {
            let next: number = index + 1;
            while (/^[ \t]/.test(event[next]))
                next++;
            return [index, next];
        }
    }
    return null;
}

/**
 * Gives the identifier of an entry: its `UID`, for one occurrence of a series the `UID` of its series and its start
 * in the series after `#`, see {@link Entry}, since each occurrence is a box of its own in the plan,
 * like `weekly-lecture@nomsystem#2026-10-26T09:00:00.000Z`.
 *
 * @param entry - Entry of the plan or the log
 * @returns Identifier, like `study-13@nomsystem`
 */
export function entryIdOf(entry: Entry): string {
    return entry.recurrence === "" ? entry.id : `${entry.id}#${entry.recurrence}`;
}

/**
 * Gives a property of an event or a to-do as one line, unfolded.
 * - `place`: Index of its first line and of the line after its last, `null` for none.
 *
 * @param event - Lines from `BEGIN:VEVENT` to `END:VEVENT`, or of a to-do
 * @param name - Name of the property, like `UID`
 * @returns Line like `UID:weekly-lecture@nomsystem`, empty when the event has none
 */
function unfoldedOf(event: string[], name: string): string {
    const place: [number, number] | null = propertyFind(event, name);
    return place === null ? ""
        : event.slice(...place).map((part: string): string => part.replace(/^[ \t]/, "")).join("");
}

/**
 * Finds the lines of every event or to-do with an identifier, see {@link entryIdOf}: with its `UID`
 * and without `RECURRENCE-ID`, or, for an identifier with `#`, with the `UID` before it and the `RECURRENCE-ID`
 * after it, compared as instants, like `RECURRENCE-ID;TZID=Europe/Berlin:20261026T100000`
 * for `weekly-lecture@nomsystem#2026-10-26T09:00:00.000Z`.
 * - {@link ICAL.Property.fromString}: Reads one line of a property, its time in the time zone it names.
 * - `at`: Place of the last `#`, -1 for none.
 * - `uid`, `recurrence`: `UID` and `RECURRENCE-ID` looked for, the latter empty for none.
 * - `changed`: Line of the `RECURRENCE-ID` of an event, empty for none.
 * - `start`: Its `RECURRENCE-ID` as instant or day, see {@link textOf}, empty for none.
 *
 * @param lines - Lines of an `.ics` file
 * @param id - Identifier of the event or to-do
 * @returns Index of each line `BEGIN:VEVENT` or `BEGIN:VTODO` and of the line after its `END:VEVENT` or `END:VTODO`
 */
function componentsOf(lines: string[], id: string): [number, number][] {
    const at: number = id.lastIndexOf("#");
    const uid: string = at === -1 ? id : id.slice(0, at);
    const recurrence: string = at === -1 ? "" : id.slice(at + 1);
    const found: [number, number][] = [];
    let begin: number = -1;
    lines.forEach((line: string, index: number): void => {
        if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
            begin = index;
        else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1) {
            const event: string[] = lines.slice(begin, index + 1);
            const changed: string = unfoldedOf(event, "RECURRENCE-ID");
            const start: string =
                changed === "" ? "" : textOf(ICAL.Property.fromString(changed).getFirstValue() as ICAL.Time);
            if (unfoldedOf(event, "UID").replace(/^UID:/i, "") === uid && start === recurrence)
                found.push([begin, index + 1]);
        }
    });
    return found;
}

/**
 * Finds the lines of the one event or to-do with an identifier, see {@link componentsOf}.
 * - `found`: Lines of each event or to-do with the identifier.
 *
 * @param lines - Lines of an `.ics` file
 * @param id - Identifier of the event or to-do
 * @returns Index of its line `BEGIN:VEVENT` or `BEGIN:VTODO` and of the line after its `END:VEVENT` or `END:VTODO`
 * @throws {Error} - When no event or to-do, or more than one, has the identifier
 */
function componentFind(lines: string[], id: string): [number, number] {
    const found: [number, number][] = componentsOf(lines, id);
    if (found.length !== 1)
        throw new Error(`${found.length} events ${id}`);
    return found[0];
}

/**
 * Builds a property of a time of an occurrence in the form of the `DTSTART` of its series:
 * with the same `TZID`, like `TZID=Europe/Berlin`, in UTC with `Z`, or a day with `VALUE=DATE`,
 * so calendar apps and `ical.js` match the `RECURRENCE-ID` with the occurrence.
 * - `property`: The property.
 * - `zoneId`: `TZID` of the `DTSTART` of the series, empty for none.
 *
 * @param series - The series
 * @param name - Name of the property, like `recurrence-id`
 * @param time - The time, in the time zone of the series
 * @returns Property to write
 */
function seriesTimeOf(series: ICAL.Event, name: string, time: ICAL.Time): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property(name);
    const zoneId: string = String(series.component.getFirstProperty("dtstart")?.getParameter("tzid") ?? "");
    property.setValue(time);
    if (zoneId !== "" && !time.isDate)
        property.setParameter("tzid", zoneId);
    return property;
}

/**
 * Makes one occurrence of a series a component of its own, so it can be dropped, pushed or changed alone,
 * the way the standard changes one occurrence: a copy of its series with the same `UID` right after it,
 * without `RRULE`, `RDATE` and `EXDATE`, its `DTSTAMP` now, its `DTSTART` and its `DTEND` those of the occurrence,
 * and as `RECURRENCE-ID` the start it has in the series, like `RECURRENCE-ID;TZID=Europe/Berlin:20261026T100000`;
 * its lines in the fixed order, see {@link linesOrdered}; the series stays as it is, every other line of the file too.
 * From then on the occurrence is that component, found by its identifier with `#`, see {@link entryIdOf}.
 * An occurrence that is a component of its own already stays.
 * - `text`: Lines of the file.
 * - `series`: The series, `undefined` when the file holds none of the identifier.
 * - `start`: The start of the occurrence in the series.
 * - `place`: Index of the first line of the series and of the line after its last.
 *
 * @param file - Path of the `.ics` file of the series
 * @param entry - The occurrence, see {@link Entry}
 * @throws {Error} - When the file lies outside the new system, or holds no such series or occurrence
 */
export function occurrenceOwn(file: string, entry: Entry): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    if (componentsOf(text.lines, entryIdOf(entry)).length > 0)
        return;

    const series: ICAL.Event | undefined =
        calendarOf(file).series.find((candidate: ICAL.Event): boolean => candidate.uid === entry.id);
    if (series === undefined)
        throw new Error(`No series ${entry.id} in ${file}`);
    const start: ICAL.Time | undefined = seriesStartOf(series, entry.recurrence);
    if (start === undefined)
        throw new Error(`No occurrence ${entryIdOf(entry)}`);

    const place: [number, number] = componentFind(text.lines, entry.id);
    text.lines.splice(place[1], 0, ...occurrenceLinesOf(series, text.lines.slice(...place), start));
    linesWrite(file, text);
}

/**
 * Finds a start of a series, walking its starts up to it.
 * - `walk`, `start`: Walk through the starts of the series.
 *
 * @param series - The series
 * @param recurrence - The start looked for, in the form of {@link Entry}, like `2026-10-24` or an instant
 * @returns The start, `undefined` when the series has none such
 */
function seriesStartOf(series: ICAL.Event, recurrence: string): ICAL.Time | undefined {
    const walk: ICAL.RecurExpansion = series.iterator();
    let start: ICAL.Time | undefined = walk.next();
    while (start !== undefined && textOf(start) < recurrence)
        start = walk.next();
    return start !== undefined && textOf(start) === recurrence ? start : undefined;
}

/**
 * Gives the lines of the component of its own of one occurrence as its series gives it, see {@link occurrenceOwn}:
 * a copy of the series without `RRULE`, `RDATE` and `EXDATE`, its `DTSTAMP` now, its `DTSTART` the start
 * of the occurrence, its `DTEND`, while the series has one, that start and the length of the series, as `ical.js`
 * gives an occurrence, and as `RECURRENCE-ID` that start; in the fixed order, see {@link linesOrdered}.
 * - `own`: The lines.
 * - `end`: The end of the occurrence.
 *
 * @param series - The series
 * @param lines - Lines of the series in its file
 * @param start - The start of the occurrence in the series
 * @returns The lines
 */
function occurrenceLinesOf(series: ICAL.Event, lines: string[], start: ICAL.Time): string[] {
    const own: string[] = [...lines];
    propertyPut(own, "rrule", []);
    propertyPut(own, "rdate", []);
    propertyPut(own, "exdate", []);
    propertyPut(own, "dtstamp", [ICAL.Time.fromJSDate(new Date(), true)]);
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
 * Takes out each occurrence of a series that is a component of its own, see {@link occurrenceOwn}, but holds nothing
 * of its own any more: its lines are those its series gives it, see {@link occurrenceLinesOf}, but its `DTSTAMP`,
 * an open `STATUS:NEEDS-ACTION` the same as none, and the series still has its start; so the day is the series' again,
 * like my sleep of 24.10.2026, once I gave the whole series my place. One done, dropped, pushed, carried along or
 * changed in anything stays, since a line of its own tells it; a log entry pointing to it keeps pointing to its day,
 * see {@link relatedOf}. Every other line of the file stays as it is; the file is written only when one goes.
 * - `text`: Lines of the file.
 * - `series`: The series, `undefined` when the file holds none of the identifier.
 * - `master`: Index of the first line of the series and of the line after its last, `undefined` for none.
 * - `lines`: Lines of the series.
 * - `plain`: Gives the lines of a component that say something, unfolded, see {@link unfoldedOf}, without `DTSTAMP`
 *   and an open status.
 * - `places`: Index of the line `BEGIN:VEVENT` or `BEGIN:VTODO` of each occurrence of its own of the series
 *   and of the line after its end, the last first, so one taken out leaves those before it where they are.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 before the first.
 * - `gone`: How many occurrences went.
 * - `own`: Lines of an occurrence of its own.
 * - `start`: Its start in the series, `undefined` when the series has it no more.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series, like `037dba76-43d3-4e42-b85d-8e39c5ab8478@nomsystem`
 * @throws {Error} - When the file lies outside the new system
 */
export function occurrencesTidy(file: string, uid: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const series: ICAL.Event | undefined =
        calendarOf(file).series.find((candidate: ICAL.Event): boolean => candidate.uid === uid);
    const master: [number, number] | undefined = componentsOf(text.lines, uid)[0];
    if (series === undefined || master === undefined)
        return;
    const lines: string[] = text.lines.slice(...master);
    const plain: (lines: string[]) => string[] = (lines: string[]): string[] => lines
        .reduce((unfolded: string[], line: string): string[] => /^[ \t]/.test(line)
            ? [...unfolded.slice(0, -1), `${unfolded[unfolded.length - 1]}${line.slice(1)}`] : [...unfolded, line], [])
        .filter((line: string): boolean => !/^DTSTAMP[:;]/i.test(line) && !/^STATUS:NEEDS-ACTION$/i.test(line));
    const places: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO")
            begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            const component: string[] = text.lines.slice(begin, index + 1);
            if (unfoldedOf(component, "UID").replace(/^UID:/i, "") === uid
                && unfoldedOf(component, "RECURRENCE-ID") !== "")
                places.unshift([begin, index + 1]);
        }
    });
    let gone: number = 0;
    places.forEach(([first, after]: [number, number]): void => {
        const own: string[] = text.lines.slice(first, after);
        const start: ICAL.Time | undefined = seriesStartOf(series,
            textOf(ICAL.Property.fromString(unfoldedOf(own, "RECURRENCE-ID")).getFirstValue() as ICAL.Time));
        if (start === undefined || JSON.stringify(plain(linesOrdered(own)))
            !== JSON.stringify(plain(occurrenceLinesOf(series, lines, start))))
            return;
        text.lines.splice(first, after - first);
        gone++;
    });
    if (gone > 0)
        linesWrite(file, text);
}

/**
 * Turns an instant into Berlin time.
 * - {@link ICAL.Time.fromJSDate}: Turns a JS date into an `ical.js` time, in UTC with `true`.
 * - {@link ICAL.Time#convertToZone}: Gives the same instant in another time zone.
 *
 * @param instant - Start or end of an entry
 * @returns Time in {@link zoneName}
 */
function berlinOf(instant: Date): ICAL.Time {
    return ICAL.Time.fromJSDate(instant, true).convertToZone(zone);
}

/**
 * Writes the date of an instant in Berlin time.
 *
 * @param instant - Start of an entry
 * @returns Date like `2026-07-03`
 */
export function berlinDateOf(instant: Date): string {
    return berlinOf(instant).toString().slice(0, 10);
}

/**
 * Writes the time of day of an instant in Berlin time.
 *
 * @param instant - An instant, like the start of a sleep
 * @returns Time like `23:30`
 */
export function berlinTimeOf(instant: Date): string {
    return berlinOf(instant).toString().slice(11, 16);
}

/**
 * Adds days to a day.
 *
 * @param day - Day like `2026-10-10`
 * @param days - Number of days to add
 * @returns Day like `2026-10-12`
 */
export function dayAdd(day: string, days: number): string {
    const date: Date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/**
 * Moves an instant by whole days in Berlin time, keeping its time of day, also over a day the clocks change,
 * like a box at 12:00 pushed to the next day.
 * - `time`: The instant in Berlin time, moved.
 * - {@link ICAL.Time#adjust}: Adds days, hours, minutes and seconds to a time, in its time zone.
 *
 * @param instant - An instant, like the expected time of a box
 * @param days - Number of days to move it by
 * @returns The instant at the same time of day, days later
 */
export function berlinLater(instant: Date, days: number): Date {
    const time: ICAL.Time = berlinOf(instant);
    time.adjust(days, 0, 0, 0);
    return time.toJSDate();
}

/**
 * Writes the start of a day in Berlin time with its offset, the form of a range of {@link entriesRead},
 * so whole-day entries compare by the day and timed ones by the instant.
 * - `start`: Midnight of the day in Berlin time.
 * - `offset`: Minutes Berlin time is ahead of UTC then, 120 in summer.
 * - {@link ICAL.Timezone#utcOffset}: Gives the offset of a time zone at a time, in seconds.
 *
 * @param day - Day like `2026-10-13`
 * @returns Start like `2026-10-13T00:00:00+02:00`
 */
export function berlinDayStartOf(day: string): string {
    const [year, month, date]: number[] = day.split("-").map(Number);
    const start: ICAL.Time = ICAL.Time.fromData({ year: year, month: month, day: date, hour: 0, minute: 0, second: 0 }, zone);
    const offset: number = zone.utcOffset(start) / 60;
    return `${day}T00:00:00+${String(Math.floor(offset / 60)).padStart(2, "0")}:${String(offset % 60).padStart(2, "0")}`;
}

/**
 * Turns an hour of a day in Berlin time into an instant, right also on the days the clocks change, with its minutes,
 * like 14:15 of a lecture.
 * - {@link ICAL.Time.fromData}: Builds a time from its parts, in a time zone.
 * - {@link ICAL.Time#toJSDate}: Gives the instant of a time.
 *
 * @param day - Day like `2026-10-12`
 * @param hour - Hour of the day, from 0 to 23, like 9 for 09:00
 * @param minute - Minute of the hour, from 0 to 59, like 15 for 09:15; 0 when left out
 * @returns The instant, like `2026-10-12T07:00:00.000Z` for 09:00 in summer time
 */
export function berlinInstantOf(day: string, hour: number, minute: number = 0): Date {
    const [year, month, date]: number[] = day.split("-").map(Number);
    return ICAL.Time.fromData({ year: year, month: month, day: date, hour: hour, minute: minute, second: 0 }, zone)
        .toJSDate();
}

/**
 * Builds a property; a time in Berlin time gets the parameter `TZID`, like `DTSTART;TZID=Europe/Berlin:…`,
 * a link its path as value and the fingerprint of a file as parameter `X-SHA256`, see {@link Link}.
 *
 * @param name - Name of the property, like `dtstart`, `attach` for a link
 * @param value - Value of the property
 * @returns Property to write
 */
function propertyOf(name: string, value: string | ICAL.Time | Link): ICAL.Property {
    const property: ICAL.Property = new ICAL.Property(name);
    if (typeof value === "string" || value instanceof ICAL.Time)
        property.setValue(value);
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
 * Builds the property of a text field of an entry, see {@link textsOf}: its `LOCATION` with the link of its place
 * as the standard parameter `ALTREP`, when it has one, like
 * `LOCATION;ALTREP="https://nav.tum.de/room/0509.EG.980":Audimax 0509.EG.980\, Arcisstraße 21\, 80333 München…`,
 * and its `SUMMARY` with its link the same way, like the folder of a skill,
 * `SUMMARY;ALTREP="NomSkillingmodules/IN2028_…":IN2028_BusinessAnalyticsMachineLearning (VO)`,
 * and its `X-ONLINE` with the link of its meeting and its passcode, see {@link Online};
 * every other one as its text.
 *
 * @param name - Name of the property, like `location`
 * @param value - Its text, like `Audimax 0509.EG.980, Arcisstraße 21, 80333 München, Deutschland`
 * @param fields - Text fields of the entry, with the link of its place
 * @returns Property to write
 */
function textPropertyOf(name: string, value: string, fields: EntryTexts): ICAL.Property {
    const property: ICAL.Property = propertyOf(name, value);
    if (name === "location" && fields.locationLink !== "")
        property.setParameter("altrep", [fields.locationLink]);
    if (name === "summary" && fields.titleLink !== "")
        property.setParameter("altrep", [fields.titleLink]);
    if (name === "x-online" && fields.onlineLink !== "")
        property.setParameter("altrep", [fields.onlineLink]);
    if (name === "x-online" && fields.passcode !== "")
        property.setParameter("x-passcode", fields.passcode);
    return property;
}

/**
 * Builds the `ATTENDEE` of a person I was with, see {@link Attendee}, like
 * `ATTENDEE;CN=Herr Müller:mailto:herr.mueller@invalid`; a name with a comma, `;` or `:` in double quotes, as the
 * standard asks, which `ical.js` writes itself; a person of `Persons.md` with a mail there with that mail in place
 * of an address ending in `@invalid`, see `mailOf` in `./persons.ts`, like
 * `ATTENDEE;CN="Bichler, Martin":mailto:m.bichler@tum.de`.
 * - `mail`: The mail of the person in `Persons.md`, empty for none and for an address I typed.
 * - `property`: The property.
 *
 * @param attendee - The person, like `Herr Müller` with `herr.mueller@invalid`
 * @returns Property to write
 */
function attendeePropertyOf(attendee: Attendee): ICAL.Property {
    const mail: string = attendee.address.endsWith("@invalid") ? mailOf(attendee.name) : "";
    const property: ICAL.Property = propertyOf("attendee", `mailto:${mail !== "" ? mail : attendee.address}`);
    property.setParameter("cn", attendee.name);
    return property;
}

/**
 * Builds the `RELATED-TO` of a log entry, which points to the box it was logged from by its `UID`, the standard way,
 * like `RELATED-TO:study-13@nomsystem`; for one date of a series that date goes along as parameter `X-RECURRENCE-ID`
 * in the form of the iCalendar format, see {@link icsTextOf}, since the `UID` names the whole series,
 * like `RELATED-TO;X-RECURRENCE-ID=20261026T130000Z:weekly-lecture@nomsystem`.
 * - `at`: Place of the last `#` in the identifier, -1 for none.
 * - `property`: The property.
 *
 * @param box - Identifier of the box, see {@link entryIdOf}, like `weekly-lecture@nomsystem#2026-10-26T13:00:00.000Z`
 * @returns Property to write
 */
function relatedOf(box: string): ICAL.Property {
    const at: number = box.lastIndexOf("#");
    const property: ICAL.Property = propertyOf("related-to", at === -1 ? box : box.slice(0, at));
    if (at !== -1)
        property.setParameter("x-recurrence-id", icsTextOf(box.slice(at + 1)));
    return property;
}

/**
 * Builds a property of a new entry beyond its fields, see {@link entryAppend}: the box a log entry was logged from
 * as its `RELATED-TO`, see {@link relatedOf}, the rule of a series as its `RRULE`, read from its text,
 * like `FREQ=WEEKLY;UNTIL=20270202T090000Z`, a moment in Berlin time, like a date a series leaves out as `EXDATE`,
 * `EXDATE;TZID=Europe/Berlin:20261110T100000`, every other one with its value as it is, see {@link propertyOf}.
 * - `rule`: The `RRULE`.
 * - {@link ICAL.Recur.fromString}: Reads the rule of a series into the form `ical.js` writes it from, since it writes
 *   a rule given as text letter by letter.
 *
 * @param name - Name of the property, like `x-food`, `related-to` for the box
 * @param value - Value of the property, the identifier of the box for `related-to`, the rule as text for `rrule`
 * @returns Property to write
 */
function ownPropertyOf(name: string, value: string | Link | Date): ICAL.Property {
    if (value instanceof Date)
        return propertyOf(name, berlinOf(value));
    if (name === "rrule" && typeof value === "string") {
        const rule: ICAL.Property = new ICAL.Property(name);
        rule.setValue(ICAL.Recur.fromString(value));
        return rule;
    }
    return name === "related-to" && typeof value === "string" ? relatedOf(value) : propertyOf(name, value);
}

/**
 * Puts a property into the lines of an event, one line per value: takes out all its old lines
 * and puts the new ones where the first old one stood, or before the end of the event when there was none;
 * no value removes the property. Most properties have one value, the `X-ATTEMPT`s of a skill entry one per attempt,
 * its `ATTACH`es one per link, the `ATTENDEE`s of an entry one per person, see {@link attendeePropertyOf}.
 * - `at`: Line of the first old value, or the end of the event.
 * - {@link ICAL.Property#toICALString}: Writes a property in the iCalendar format, as one line, never folded,
 *   see {@link linesOf}.
 *
 * @param event - Lines from `BEGIN:VEVENT` to `END:VEVENT`, changed in place
 * @param name - Name of the property, like `dtstart`
 * @param values - New values, none to remove the property; a property built already, like a `LOCATION`
 *   with its `ALTREP`, see {@link textPropertyOf}, goes in as it is
 */
function propertyPut(event: string[], name: string, values: (string | ICAL.Time | Link | ICAL.Property)[]): void {
    let at: number = event.length - 1;
    for (let old: [number, number] | null = propertyFind(event, name); old !== null; old = propertyFind(event, name)) {
        at = Math.min(at, old[0]);
        event.splice(old[0], old[1] - old[0]);
    }
    event.splice(at, 0, ...values.map((value: string | ICAL.Time | Link | ICAL.Property): string =>
        (value instanceof ICAL.Property ? value : propertyOf(name, value)).toICALString()));
}

/**
 * Text fields of an entry with the names of their properties, in the order they are written;
 * the skill and type of a skill entry stand only in the `ALTREP` of its `SUMMARY`, see {@link skillPartsOf}, and who I was with
 * in one `ATTENDEE` per person after them, see {@link attendeePropertyOf}.
 *
 * @param fields - Text fields of an event or a to-do
 * @returns Name of each property with its value, empty when it is not written
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
 * Writes start and end in Berlin time, and only the text fields and the properties beyond them that are not empty,
 * its place with its link, see {@link textPropertyOf}, one `ATTENDEE` per person I was with,
 * see {@link attendeePropertyOf}, the box it was logged from as `RELATED-TO`, and the rule of a series with the dates
 * it leaves out, like a group of a tutorial, see {@link ownPropertyOf}.
 *
 * @param file - Path of the `.ics` file
 * @param fields - Fields and times of the entry
 * @param own - Properties beyond the fields, each its name with its value,
 *   like `["x-attempt", "IN2028/Airline Revenue Interval;right"]` of a skill entry or `["x-food", "Reis;150"]`
 *   of a meal, `["attach", link]` for a link, see {@link Link}, `["related-to", "study-13@nomsystem"]`
 *   for the box it was logged from, or `["rrule", "FREQ=WEEKLY;UNTIL=20270202T090000Z"]` and one `["exdate", date]`
 *   per date left out for a weekly series
 * @param id - Identifier of the new event, its `UID`: a new one, or the one an entry brought from Vu's log,
 *   see `shared.ts`
 * @returns Identifier of the new entry, like `b8f1e81f-15b4-460e-910d-ef6b1b3d09b3@nomsystem`
 * @throws {Error} - When the file lies outside the new system or has no line `END:VCALENDAR`
 */
export function entryAppend(file: string, fields: EntryFields, own: [string, string | Link | Date][],
                            id: string = `${randomUUID()}@nomsystem`): string {
    writeCheck(file);
    const event: ICAL.Component = new ICAL.Component("vevent");
    event.addProperty(propertyOf("dtstart", berlinOf(fields.start)));
    event.addProperty(propertyOf("dtend", berlinOf(fields.end)));
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
    own.filter(([, value]: [string, string | Link | Date]): boolean => value !== "")
        .forEach(([name, value]: [string, string | Link | Date]): void => {
            event.addProperty(ownPropertyOf(name, value));
        });
    componentInsert(file, linesOf(event));
    return id;
}

/**
 * Gives the `DTSTART` of a to-do: its day, written as `DTSTART;VALUE=DATE:20261013`, when it has no time,
 * else its time in Berlin time.
 * - {@link ICAL.Time.fromDateString}: Reads a day like `2026-10-13` into a time without time of day.
 *
 * @param fields - Fields of the to-do
 * @returns Value of its `DTSTART`
 */
function todoStartOf(fields: TodoFields): ICAL.Time {
    return fields.time === null ? ICAL.Time.fromDateString(fields.day) : berlinOf(fields.time);
}

/**
 * Gives the `DUE` of a to-do: its deadline, written as `DUE;VALUE=DATE:20261023` when it has no time,
 * else its time in Berlin time, like `DUE;TZID=Europe/Berlin:20261023T120000`.
 *
 * @param deadline - Deadline as ISO instant, or as day like `2026-10-23`
 * @returns Value of its `DUE`
 */
function deadlineTimeOf(deadline: string): ICAL.Time {
    return /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? ICAL.Time.fromDateString(deadline) : berlinOf(new Date(deadline));
}

/**
 * Writes minutes as a duration of the iCalendar format, the value of an `ESTIMATED-DURATION`.
 * - {@link ICAL.Duration.fromSeconds}: Builds a duration from seconds.
 *
 * @param minutes - Minutes, like 75
 * @returns Duration like `PT1H15M`
 */
function durationOf(minutes: number): string {
    return ICAL.Duration.fromSeconds(minutes * 60).toString();
}

/**
 * Appends a to-do to an `.ics` file, a box of the plan, creating file and folders when missing:
 * its day or its time as `DTSTART`, or instead its deadline as `DUE`, its expected duration as `ESTIMATED-DURATION`
 * when it has one, `STATUS:NEEDS-ACTION`, since it is open, and only the text fields that are not empty, then one
 * `ATTENDEE` per person I will be with, see {@link attendeePropertyOf}, and the properties beyond them, as an entry
 * writes them, see {@link entryAppend}; a group of a tutorial, which is no box I do, without `STATUS`,
 * see `groupPut` in `course.ts`.
 * A to-do with a deadline has no `DTSTART`: iCalendar (RFC 5545) wants `DUE` of the same kind as `DTSTART`,
 * both days or both times, and later, so the day of its deadline is its day, see {@link deadlineDayOf}.
 * - `id`: Identifier of the new to-do, its `UID`.
 *
 * @param file - Path of the `.ics` file
 * @param fields - Fields of the to-do
 * @param own - Properties beyond the fields, each its name with its value, like
 *   `["rrule", "FREQ=WEEKLY;UNTIL=20270202T090000Z"]` and one `["exdate", date]` per date left out of a group;
 *   none when left out
 * @param open - Whether it is a box, open, `STATUS:NEEDS-ACTION`; false for a group, without `STATUS`
 * @returns Identifier of the new to-do, like `b8f1e81f-15b4-460e-910d-ef6b1b3d09b3@nomsystem`
 * @throws {Error} - When the file lies outside the new system or has no line `END:VCALENDAR`
 */
export function todoAppend(file: string, fields: TodoFields, own: [string, string | Link | Date][] = [],
                           open: boolean = true): string {
    writeCheck(file);
    const id: string = `${randomUUID()}@nomsystem`;
    const todo: ICAL.Component = new ICAL.Component("vtodo");
    if (fields.deadline === "")
        todo.addProperty(propertyOf("dtstart", todoStartOf(fields)));
    else
        todo.addProperty(propertyOf("due", deadlineTimeOf(fields.deadline)));
    if (fields.minutes !== null)
        todo.addProperty(propertyOf("estimated-duration", durationOf(fields.minutes)));
    todo.addPropertyWithValue("dtstamp", ICAL.Time.fromJSDate(new Date(), true));
    todo.addPropertyWithValue("uid", id);
    if (open)
        todo.addPropertyWithValue("status", "NEEDS-ACTION");
    textsOf(fields)
        .filter(([, value]: [string, string]): boolean => value !== "")
        .forEach(([name, value]: [string, string]): void => {
            todo.addProperty(textPropertyOf(name, value, fields));
        });
    fields.attendees.forEach((attendee: Attendee): void => {
        todo.addProperty(attendeePropertyOf(attendee));
    });
    own.filter(([, value]: [string, string | Link | Date]): boolean => value !== "")
        .forEach(([name, value]: [string, string | Link | Date]): void => {
            todo.addProperty(ownPropertyOf(name, value));
        });
    componentInsert(file, linesOf(todo));
    return id;
}

/**
 * Puts the text fields that changed into the lines of an event or a to-do, a new place with its link,
 * see {@link textPropertyOf}; a place that stays keeps its line as it is, with its `ALTREP`. Who I was with,
 * once changed, replaces all its `ATTENDEE`s, see {@link attendeePropertyOf}.
 * A `SUMMARY` whose link alone changed is written anew too, like that of a skill entry moved to another semester,
 * whose link names the folder of its semester, see `skillLinkOf` in `documents.ts`, and so is an `X-ONLINE` whose link
 * or passcode alone changed; once what it did online changes, its `LOCATION` and its `SUMMARY` are written anew too,
 * since an older entry wrote it there, see {@link onlineOf}.
 * - `textsOld`: Its text fields as read, with the names of their properties.
 * - `relinked`: Whether the link of its `SUMMARY` changed.
 * - `reonline`: Whether what it did online changed, its platform, link or passcode.
 *
 * @param component - Lines of the event or the to-do, changed in place
 * @param entry - Its entry as read
 * @param fields - New text fields
 */
function textsPut(component: string[], entry: Entry, fields: EntryTexts): void {
    const textsOld: [string, string][] = textsOf(entry);
    const relinked: boolean = fields.titleLink !== entry.titleLink;
    const reonline: boolean = fields.online !== entry.online || fields.onlineLink !== entry.onlineLink
        || fields.passcode !== entry.passcode;
    textsOf(fields).forEach(([name, value]: [string, string], index: number): void => {
        if (value !== textsOld[index][1] || (name === "summary" && relinked)
            || (["summary", "location", "x-online"].includes(name) && reonline))
            propertyPut(component, name, value === "" ? [] : [textPropertyOf(name, value, fields)]);
    });
    if (JSON.stringify(fields.attendees) !== JSON.stringify(entry.attendees))
        propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
}

/**
 * Writes the changed lines of an event or a to-do back where they stood in their file, or moves them into another file,
 * like the log of another year: writes them there first, so a failure in between leaves them twice
 * instead of losing them; its lines in the fixed order, see {@link linesOrdered}. Every other line of both files
 * stays as it is, byte for byte.
 *
 * @param file - Path of the `.ics` file of the event or the to-do
 * @param text - Lines of that file as read
 * @param place - Index of its first line and of the line after its last in the file
 * @param component - Its changed lines
 * @param target - Path of the `.ics` file it belongs into, `file` when it stays
 */
function componentWrite(file: string, text: FileLines, place: [number, number], component: string[],
                        target: string): void {

    const [begin, end]: [number, number] = place;
    if (target === file)
        text.lines.splice(begin, end - begin, ...linesOrdered(component));
    else {
        componentInsert(target, component);
        text.lines.splice(begin, end - begin);
    }
    linesWrite(file, text);
}

/**
 * Changes fields and times of the event of an entry, writing only the properties that changed,
 * and moves it into another file when one is given, see {@link componentWrite}.
 * - `place`: Index of its first line and of the line after its last in the file.
 *
 * @param file - Path of the `.ics` file of the event
 * @param entry - Entry of the event as read
 * @param fields - New fields and times
 * @param target - Path of the `.ics` file the event belongs into, `file` when it stays
 * @throws {Error} - When a file lies outside the new system or does not hold the event once
 */
export function entryChange(file: string, entry: Entry, fields: EntryFields, target: string): void {
    writeCheck(file);
    writeCheck(target);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, entryIdOf(entry));
    const event: string[] = text.lines.slice(...place);

    textsPut(event, entry, fields);
    if (fields.start.getTime() !== new Date(entry.start).getTime())
        propertyPut(event, "dtstart", [berlinOf(fields.start)]);
    if (fields.end.getTime() !== new Date(entry.end).getTime())
        propertyPut(event, "dtend", [berlinOf(fields.end)]);
    componentWrite(file, text, place, event, target);
}

/**
 * Changes the fields of a to-do, a box of the plan, writing only the properties that changed: its texts,
 * its `DTSTART` when its day or its time changed, its `DUE` when its deadline changed, its `ESTIMATED-DURATION`
 * when its expected duration changed; a to-do that gets a deadline loses its `DTSTART`, and one that loses
 * its deadline gets one, see {@link todoAppend}; moves it into another file when one is given,
 * see {@link componentWrite}.
 * - `place`: Index of its first line and of the line after its last in the file.
 * - `start`: Its new start in the form of {@link Entry}, its day without time, else its instant.
 *
 * @param file - Path of the `.ics` file of the to-do
 * @param entry - Entry of the to-do as read
 * @param fields - New fields
 * @param target - Path of the `.ics` file the to-do belongs into, `file` when it stays
 * @throws {Error} - When a file lies outside the new system or does not hold the to-do once
 */
export function todoChange(file: string, entry: Entry, fields: TodoFields, target: string): void {
    writeCheck(file);
    writeCheck(target);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, entryIdOf(entry));
    const todo: string[] = text.lines.slice(...place);

    textsPut(todo, entry, fields);
    const start: string = fields.time === null ? fields.day : fields.time.toISOString();
    if (fields.deadline === "" && (start !== entry.start || entry.deadline !== ""))
        propertyPut(todo, "dtstart", [todoStartOf(fields)]);
    if (fields.deadline !== "" && entry.deadline === "")
        propertyPut(todo, "dtstart", []);
    if (fields.deadline !== entry.deadline)
        propertyPut(todo, "due", fields.deadline === "" ? [] : [deadlineTimeOf(fields.deadline)]);
    if (fields.minutes !== entry.minutes)
        propertyPut(todo, "estimated-duration", fields.minutes === null ? [] : [durationOf(fields.minutes)]);
    componentWrite(file, text, place, todo, target);
}

/**
 * Puts new values into properties of the event or to-do with an identifier, replacing all old lines of each,
 * like the end, the `X-CHAPTER`s and the `X-ATTEMPT`s of a skill entry that gets one more attempt;
 * a date goes in Berlin time, a link as `ATTACH`, see {@link Link}. Every other line of the file stays as it is,
 * byte for byte.
 *
 * @param file - Path of the `.ics` file
 * @param id - Identifier of the event or to-do
 * @param properties - Properties, each its name with its new values, like `["x-attempt", ["IN2028/…;right", …]]`
 * @throws {Error} - When the file lies outside the new system or does not hold the event once
 */
export function propertiesPut(file: string, id: string, properties: [string, (string | Date | Link)[]][]): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const event: string[] = text.lines.slice(...place);
    properties.forEach(([name, values]: [string, (string | Date | Link)[]]): void => propertyPut(event, name,
        values.map((value: string | Date | Link): string | ICAL.Time | Link =>
            value instanceof Date ? berlinOf(value) : value)));
    componentWrite(file, text, place, event, file);
}

/**
 * Sets the state of a box of the plan, its `STATUS`, `COMPLETED` for a done one, without the moment it was done,
 * the `COMPLETED` line iCalendar offers for it, since the log entry written from the box holds its real time.
 * Every other line of the file stays as it is, byte for byte.
 *
 * @param file - Path of the `.ics` file
 * @param id - Identifier of the to-do or the event
 * @param status - New `STATUS`, like `CANCELLED`, empty to take it out, as for an event of the plan that is open again
 * @throws {Error} - When the file lies outside the new system or does not hold the to-do or the event once
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
 * Notes one more push of a box to a later day, before its start and length change, after its `X-PUSHED`s
 * from before, which stay as they are: its start and its length as they stood, its start as its `DTSTART` holds it,
 * its length as the parameter `X-ESTIMATED-DURATION`, named and written as the `ESTIMATED-DURATION` of a to-do,
 * which it is, or the time between start and end of an event, like
 * `X-PUSHED;TZID=Europe/Berlin;X-ESTIMATED-DURATION=PT3H15M;VALUE=DATE-TIME:20261016T150000`,
 * and for a box without time `X-PUSHED;X-ESTIMATED-DURATION=PT1H15M;VALUE=DATE:20261013`,
 * without `X-ESTIMATED-DURATION` for one without length.
 * `VALUE` says it is a time or a date, since iCalendar reads a property of my own as text without it.
 * Every other line of the file stays as it is, byte for byte.
 * - `before`: The `X-PUSHED`s it has.
 * - `minutes`: Its length in minutes, `null` for none.
 * - `pushed`: The new `X-PUSHED`.
 * - {@link ICAL.parse}: Reads the lines of the box into the form `ical.js` reads.
 *
 * @param file - Path of the `.ics` file
 * @param id - Identifier of the to-do or the event
 * @param entry - The box as it stands before the push
 * @throws {Error} - When the file lies outside the new system or does not hold the to-do or the event once
 */
export function pushAdd(file: string, id: string, entry: Entry): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, id);
    const component: string[] = text.lines.slice(...place);
    const before: ICAL.Property[] = new ICAL.Component(ICAL.parse(component.join("\r\n")))
        .getAllProperties("x-pushed");
    const minutes: number | null = entry.todo ? entry.minutes
        : (Date.parse(entry.end) - Date.parse(entry.start)) / (60 * 1000);
    const pushed: ICAL.Property = propertyOf("x-pushed",
        entry.allDay ? ICAL.Time.fromDateString(entry.start) : berlinOf(new Date(entry.start)));
    if (minutes !== null)
        pushed.setParameter("x-estimated-duration", durationOf(minutes));
    propertyPut(component, "x-pushed", [...before, pushed]);
    componentWrite(file, text, place, component, file);
}

/**
 * Removes the event or to-do with an identifier from an `.ics` file.
 * Every other line of the file stays as it is, byte for byte.
 *
 * @param file - Path of the `.ics` file
 * @param id - Identifier of the event or to-do
 * @throws {Error} - When the file lies outside the new system or does not hold the event once
 */
export function entryRemove(file: string, id: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const [begin, end]: [number, number] = componentFind(text.lines, id);
    text.lines.splice(begin, end - begin);
    linesWrite(file, text);
}

/**
 * Removes a series whole from an `.ics` file, as the bin of its dialog asks, see `plainRemove` in `rules.ts`:
 * every component of its `UID`, the series and every occurrence changed alone, with its `RECURRENCE-ID`.
 * Every other line of the file stays as it is, byte for byte.
 * - `text`: Lines of the file.
 * - `all`: Index of the first line of each component of the series and of the line after its last, the last first,
 *   so one taken out leaves those before it where they are.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 outside a component.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
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
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO")
            begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            if (unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(/^UID:/i, "") === uid)
                all.unshift([begin, index + 1]);
            begin = -1;
        }
    });
    all.forEach(([first, after]: [number, number]): void => {
        text.lines.splice(first, after - first);
    });
    linesWrite(file, text);
    return !text.lines.some((line: string): boolean => line === "BEGIN:VEVENT" || line === "BEGIN:VTODO");
}

/**
 * Takes one day out of a series, as the bin of the dialog of one of its boxes asks, see `plainDayRemove`
 * in `rules.ts`: its start in the series as one more `EXDATE` of the series, in the form of its `DTSTART`, see
 * {@link seriesTimeOf}, a single date of it, one of its `RDATE`s, taken out of them instead, see
 * {@link seriesDatesRead}, and its component of its own, when it has one, taken out, so the day shows no more and
 * every other day of the series stays.
 * - `series`: The series in the file.
 * - `start`: The start of the day in the series.
 * - `text`: Lines of the file.
 * - `place`: Index of the first line of the series and of the line after its last.
 * - `component`: Lines of the series.
 * - `dates`: Its single dates, its `RDATE`s.
 * - `excluded`: Its `EXDATE`s as they are, and the new one.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param recurrence - Start of the day in the series, see {@link Entry}, like `2026-10-24`
 * @throws {Error} - When the file lies outside the new system, or holds no such series or day
 */
export function seriesDayRemove(file: string, uid: string, recurrence: string): void {
    writeCheck(file);
    const series: ICAL.Event | undefined =
        calendarOf(file).series.find((candidate: ICAL.Event): boolean => candidate.uid === uid);
    const start: ICAL.Time | undefined = series === undefined ? undefined : seriesStartOf(series, recurrence);
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
        propertyPut(component, "rdate", dates.filter((date: ICAL.Time): boolean => date.compare(start) !== 0)
            .map((date: ICAL.Time): ICAL.Property => seriesTimeOf(series, "rdate", date)));
    else {
        const excluded: string[] = series.component.getAllProperties("exdate")
            .map((property: ICAL.Property): string => property.toICALString());
        propertyPut(component, "exdate", [...excluded.map((line: string): ICAL.Property =>
            ICAL.Property.fromString(line)), seriesTimeOf(series, "exdate", start)]);
    }
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Gives the single dates of a series besides its rule, its `RDATE`s, each value of each line, the earliest first;
 * a period, `VALUE=PERIOD`, left out, since `ical.js` cannot give its occurrence.
 *
 * @param series - The series
 * @returns The dates, as days or times
 */
function seriesDatesRead(series: ICAL.Event): ICAL.Time[] {
    return series.component.getAllProperties("rdate")
        .flatMap((property: ICAL.Property): unknown[] => property.getValues())
        .filter((value: unknown): value is ICAL.Time => value instanceof ICAL.Time)
        .sort((first: ICAL.Time, second: ICAL.Time): number => first.compare(second));
}

/**
 * Gives the single dates of a series of calendar sources besides its rule, its `RDATE`s, see {@link seriesDatesRead},
 * like the extras of a plain series, see `rules.ts`.
 * - `found`: Its file, its first occurrence and its rule, `undefined` for none.
 * - `series`: The series in its file.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param uid - The `UID` of the series
 * @returns The starts in the form of {@link Entry}, like `2026-11-14` or `2026-11-14T09:00:00.000Z`, none for no series
 */
export function seriesDatesOf(sources: CalendarSource[], uid: string): string[] {
    const found: [string, Entry, ICAL.Recur] | undefined = seriesLookup(sources, uid);
    const series: ICAL.Event | undefined = found === undefined ? undefined
        : calendarOf(found[0]).series.find((candidate: ICAL.Event): boolean => candidate.uid === uid);
    return series === undefined ? [] : seriesDatesRead(series).map(textOf);
}

/**
 * Writes the single dates of a series besides its rule, its `RDATE`s, one line each, in the form of its `DTSTART`:
 * a day for a series of days, like `RDATE;VALUE=DATE:20261114`, else a time in Berlin time, like
 * `RDATE;TZID=Europe/Berlin:20261114T100000`; none takes them all out. Every other line stays as it is.
 * - `text`: Lines of the file.
 * - `place`: Index of the first line of the series and of the line after its last.
 * - `component`: Lines of the series.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param starts - The starts in the form of {@link Entry}, like `2026-11-14` or `2026-11-14T09:00:00.000Z`
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesDatesPut(file: string, uid: string, starts: string[]): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const place: [number, number] = componentFind(text.lines, uid);
    const component: string[] = text.lines.slice(...place);
    propertyPut(component, "rdate", starts.map((start: string): ICAL.Time => /^\d{4}-\d{2}-\d{2}$/.test(start)
        ? ICAL.Time.fromDateString(start) : berlinOf(new Date(start))));
    text.lines.splice(place[0], place[1] - place[0], ...linesOrdered(component));
    linesWrite(file, text);
}

/**
 * Moves one day of a series changed alone, its component of its own with its `RECURRENCE-ID`, to another series,
 * as a plain series going on from today takes its extras along, see `plainApply` in `rules.ts`: its lines with
 * the `UID` of that series, into its file, then taken out of its own; its `RECURRENCE-ID` stays, the start of the same
 * single date in the other series.
 * - `text`: Lines of the file.
 * - `place`: Index of the first line of the day and of the line after its last.
 * - `own`: Its lines with the other `UID`.
 *
 * @param file - Path of the `.ics` file of the day
 * @param id - Its identifier, like `037dba76…@nomsystem#2026-11-14T09:00:00.000Z`
 * @param uid - The `UID` of the other series
 * @param target - Path of the `.ics` file of the other series
 * @throws {Error} - When a file lies outside the new system, or does not hold the day once
 */
export function occurrenceMove(file: string, id: string, uid: string, target: string): void {
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
 * Finds a series of calendar sources by its `UID`, like my sleep of every night, see `rules.ts`: its file,
 * its first occurrence as an {@link Entry}, see {@link entryOf}, which holds what the series is, and its rule.
 * - `series`: The series in a file, `undefined` for none.
 * - `rule`: Its `RRULE`, `undefined` for a series without one, like one of `RDATE`s alone.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param uid - The `UID` of the series, like `037dba76-43d3-4e42-b85d-8e39c5ab8478@nomsystem`
 * @returns Path of its `.ics` file, its first occurrence and its rule, `undefined` when no file holds such a series
 */
export function seriesLookup(sources: CalendarSource[], uid: string): [string, Entry, ICAL.Recur] | undefined {
    for (const file of filesOf(sources)) {
        const series: ICAL.Event | undefined =
            calendarOf(file).series.find((candidate: ICAL.Event): boolean => candidate.uid === uid);
        const rule: unknown = series?.component.getFirstPropertyValue("rrule");
        if (series !== undefined && rule instanceof ICAL.Recur)
            return [file, entryOf(series, series.startDate, series.endDate, file), rule];
    }
    return undefined;
}

/**
 * Writes a to-do that repeats, a series of the plan, as its dialog changes it whole, see `rules.ts`: its `DTSTART`,
 * its `ESTIMATED-DURATION` and its `RRULE`, and its texts but its note, see {@link textsOf}, with who I am with;
 * every occurrence changed alone, with its `RECURRENCE-ID`, takes the same texts, so a new summary or place
 * of the series holds on every day, its own times and its own note kept; one left with nothing of its own goes,
 * see {@link occurrencesTidy}. Lines in the fixed order, see {@link linesOrdered}; every other line of the file
 * stays as it is.
 * - `text`: Lines of the file.
 * - `put`: Writes the texts into the lines of a component, of the series also its times and its rule.
 * - `places`: Index of the line `BEGIN:VTODO` of each component of the series and of the line after its end,
 *   the last first, so one written anew leaves those before it where they are.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 before the first.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param fields - Its fields, its day that of its first occurrence
 * @param rule - Its rule, like `FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20270131`
 * @throws {Error} - When the file lies outside the new system, or holds no such series once
 */
export function seriesWrite(file: string, uid: string, fields: TodoFields, rule: string): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const put: (component: string[], whole: boolean) => void = (component: string[], whole: boolean): void => {
        textsOf(fields).filter(([name]: [string, string]): boolean => name !== "description")
            .forEach(([name, value]: [string, string]): void =>
                propertyPut(component, name, value === "" ? [] : [textPropertyOf(name, value, fields)]));
        propertyPut(component, "attendee", fields.attendees.map(attendeePropertyOf));
        if (!whole)
            return;
        propertyPut(component, "dtstart", [todoStartOf(fields)]);
        propertyPut(component, "estimated-duration", fields.minutes === null ? [] : [durationOf(fields.minutes)]);
        propertyPut(component, "rrule", [ownPropertyOf("rrule", rule)]);
    };
    componentFind(text.lines, uid);
    const places: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO")
            begin = index;
        else if (read === "END:VTODO" && begin !== -1
            && unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(/^UID:/i, "") === uid)
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
 * Puts a property into a series of the plan alone, its occurrences changed alone left as they are, lines in the fixed
 * order, see {@link linesOrdered}; every other line of the file stays as it is. Splits a series from a day on, as its
 * dialog asks for a change from today on, see `plainApply` in `rules.ts`: the series ends the day before, its rule
 * with `UNTIL`, see {@link ownPropertyOf}, its texts and every occurrence changed alone staying as they are; and each
 * new series that goes on from that day points back to it as its sibling, `RELATED-TO;RELTYPE=SIBLING:<UID>`,
 * the standard parameter that tells it apart from the `RELATED-TO` of a log entry, which points to the box it was
 * logged from, see {@link relatedOf} and {@link plannedOf}.
 * - `text`: Lines of the file.
 * - `place`: Index of the line `BEGIN:VTODO` of the series and of the line after its end.
 * - `series`: Its lines.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param property - The property, its rule, see {@link seriesEnd}, or its sibling, see {@link seriesSiblingPut}
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
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
 * Ends a series of the plan, its rule with `UNTIL` put into it alone, see {@link seriesPut}.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param rule - Its rule ending the day before, like `FREQ=DAILY;UNTIL=20261023`
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesEnd(file: string, uid: string, rule: string): void {
    seriesPut(file, uid, ownPropertyOf("rrule", rule));
}

/**
 * Points a series of the plan to the series it goes on from, `RELATED-TO;RELTYPE=SIBLING:<UID>`, see {@link seriesPut}.
 * - `link`: The property.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param sibling - The `UID` of the series it goes on from
 * @throws {Error} - When the file lies outside the new system, or does not hold the series once
 */
export function seriesSiblingPut(file: string, uid: string, sibling: string): void {
    const link: ICAL.Property = propertyOf("related-to", sibling);
    link.setParameter("reltype", "SIBLING");
    seriesPut(file, uid, link);
}

/**
 * Finds every series of calendar sources one series goes on from or goes on as, see {@link seriesSiblingPut}:
 * the series itself and, link by link, every series its `RELATED-TO;RELTYPE=SIBLING` names or that names it,
 * so a summary changed renames them all, see `plainApply` in `rules.ts`.
 * - `masters`: Every series of the sources with its file.
 * - `linked`: Gives the `UID`s a series names as its siblings.
 * - `found`: The series found so far, by `UID`, with its file.
 * - `waiting`: The `UID`s whose links are still to follow.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param uid - The `UID` of a series
 * @returns Each series of the chain, its file and its `UID`, the series itself first
 */
export function seriesChainOf(sources: CalendarSource[], uid: string): [string, string][] {
    const masters: [string, ICAL.Event][] = filesOf(sources).flatMap((file: string): [string, ICAL.Event][] =>
        calendarOf(file).series.map((series: ICAL.Event): [string, ICAL.Event] => [file, series]));
    const linked: (series: ICAL.Event) => string[] = (series: ICAL.Event): string[] =>
        series.component.getAllProperties("related-to")
            .filter((link: ICAL.Property): boolean => String(link.getParameter("reltype") ?? "").toUpperCase() === "SIBLING")
            .map((link: ICAL.Property): string => String(link.getFirstValue()));
    const found: Map<string, string> = new Map();
    const waiting: string[] = [uid];
    while (waiting.length > 0) {
        const next: string = waiting.shift() as string;
        const own: [string, ICAL.Event] | undefined =
            masters.find(([, series]: [string, ICAL.Event]): boolean => series.uid === next);
        if (found.has(next) || own === undefined)
            continue;
        found.set(next, own[0]);
        waiting.push(...linked(own[1]), ...masters
            .filter(([, series]: [string, ICAL.Event]): boolean => linked(series).includes(next))
            .map(([, series]: [string, ICAL.Event]): string => series.uid));
    }
    return [...found.entries()].map(([id, file]: [string, string]): [string, string] => [file, id]);
}

/**
 * Writes the summary of a series into every component of its `UID`, the series and every day of it changed alone,
 * past ones too, as a summary changed renames a series whole, see `plainApply` in `rules.ts`: its `SUMMARY` with its
 * link, see {@link textPropertyOf}; every other line stays as it is.
 * - `text`: Lines of the file.
 * - `summary`: The `SUMMARY` to write.
 * - `all`: Index of the first line of each component of the series and of the line after its last, the last first.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 outside a component.
 *
 * @param file - Path of the `.ics` file of the series
 * @param uid - The `UID` of the series
 * @param fields - Text fields with its summary and the link of it
 * @throws {Error} - When the file lies outside the new system
 */
export function seriesTitlePut(file: string, uid: string, fields: EntryTexts): void {
    writeCheck(file);
    const text: FileLines = linesRead(file);
    const summary: ICAL.Property = textPropertyOf("summary", fields.title, fields);
    const all: [number, number][] = [];
    let begin: number = -1;
    text.lines.forEach((read: string, index: number): void => {
        if (read === "BEGIN:VEVENT" || read === "BEGIN:VTODO")
            begin = index;
        else if ((read === "END:VEVENT" || read === "END:VTODO") && begin !== -1) {
            if (unfoldedOf(text.lines.slice(begin, index + 1), "UID").replace(/^UID:/i, "") === uid)
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
 * Gives the address a name has while nobody typed a real one, as the page gives it, see `standardAddressOf`
 * in `src/day/entries.ts`: the name in small letters, umlauts written out and accents plainly, every other character
 * but a–z and 0–9 a dot, never two in a row and none at either end, `Vorname` first, then `@invalid`.
 * - `parts`: `Nachname` and `Vorname` of a name written so, one part for a single name.
 * - `local`: The part before `@`.
 *
 * @param name - Name, like `Cuzic, Mihovil`
 * @returns Address, like `mihovil.cuzic@invalid`
 */
function invalidAddressOf(name: string): string {
    const parts: string[] = name.split(", ");
    const local: string = (parts.length === 2 ? `${parts[1]} ${parts[0]}` : name).toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    return `${local}@invalid`;
}

/**
 * Writes a person anew in every event and to-do of calendar sources that names it, see `personRename`
 * in `persons.ts`: each `ATTENDEE` whose `CN` is the old name takes the new name and, while the person has a mail,
 * that mail, else the address it had, one that never works made anew for the new name, see {@link invalidAddressOf};
 * a person it names twice so, once moved to the name of another, stays once; the lines of its event or to-do go into
 * the fixed order, see {@link linesOrdered}. Reads every file and works out
 * each of its lines first, and writes only then, as {@link placeLinesRename} does.
 * - `changes`: Each file to write with its lines.
 * - `count`: How many lines change.
 * - `text`: Lines of a file.
 * - `places`: Index of the line `BEGIN:VEVENT` or `BEGIN:VTODO` of each event and to-do of a file and of the line
 *   after its end, the last first.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 before the first.
 * - `named`: How many lines changed before the file.
 * - `component`: Lines of an event or a to-do.
 * - `unfolded`: Its lines, a folded property as one line.
 * - `people`: Its `ATTENDEE`s, each read as a property.
 * - `renamed`: Whether one of them is the person.
 * - `written`: Its `ATTENDEE`s as written, the person renamed.
 * - `address`: The address the person had.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param old - Old name, like `Cuzic, Mihovil`
 * @param name - New name
 * @param mail - Its mail, like `mihovil.cuzic@tum.de`, empty for none
 * @param dry - Whether only to count the lines, writing nothing
 * @returns How many lines change
 * @throws {Error} - When a file to write lies outside the new system
 */
export function attendeesRename(sources: CalendarSource[], old: string, name: string, mail: string,
                                dry: boolean): number {
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    filesOf(sources).forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const places: [number, number][] = [];
        let begin: number = -1;
        text.lines.forEach((line: string, index: number): void => {
            if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
                begin = index;
            else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1)
                places.unshift([begin, index + 1]);
        });
        const named: number = count;
        places.forEach(([first, after]: [number, number]): void => {
            const component: string[] = text.lines.slice(first, after);
            const unfolded: string[] = component.reduce((lines: string[], part: string): string[] =>
                /^[ \t]/.test(part) && lines.length > 0
                    ? [...lines.slice(0, -1), `${lines[lines.length - 1]}${part.slice(1)}`] : [...lines, part], []);
            const people: ICAL.Property[] = unfolded.filter((line: string): boolean => /^ATTENDEE[;:]/i.test(line))
                .map((line: string): ICAL.Property => ICAL.Property.fromString(line));
            let renamed: boolean = false;
            const written: ICAL.Property[] = people.map((person: ICAL.Property): ICAL.Property => {
                if (String(person.getParameter("cn") ?? "") !== old)
                    return person;
                renamed = true;
                const address: string = String(person.getFirstValue() ?? "").replace(/^mailto:/i, "");
                const property: ICAL.Property = propertyOf("attendee",
                    `mailto:${mail !== "" ? mail : address.endsWith("@invalid") ? invalidAddressOf(name) : address}`);
                property.setParameter("cn", name);
                return property;
            });
            if (!renamed)
                return;
            propertyPut(component, "attendee", written.filter((person: ICAL.Property, at: number): boolean =>
                written.findIndex((other: ICAL.Property): boolean =>
                    String(other.getParameter("cn") ?? "") === String(person.getParameter("cn") ?? "")) === at));
            text.lines.splice(first, after - first, ...linesOrdered(component));
            count++;
        });
        if (count > named) {
            writeCheck(file);
            changes.push([file, text]);
        }
    });
    if (!dry)
        changes.forEach(([file, text]: [string, FileLines]): void => linesWrite(file, text));
    return count;
}

/**
 * Writes a place anew in every event and to-do of calendar sources that names it, see `placeRename` in `places.ts`:
 * each `LOCATION` and each `X-FROM`, where a way starts, whose name, the part of its line before the first comma,
 * see `labelOf` in `places.ts`, is the old name takes the line of the place, a `LOCATION` with its link as `ALTREP`,
 * as {@link textPropertyOf} writes them, and the lines of its event or to-do go into the fixed order,
 * see {@link linesOrdered}; a line written so already, and every other line of every file, stays as it is, byte
 * for byte. Reads every file and works out each of its lines first, and writes only then, so a line that cannot be read
 * or a file outside the new system stops it before anything is written.
 * - `changes`: Each file to write with its lines.
 * - `count`: How many lines change.
 * - `text`: Lines of a file.
 * - `places`: Index of the line `BEGIN:VEVENT` or `BEGIN:VTODO` of each event and to-do of a file and of the line
 *   after its end, the last first, so one written anew leaves those before it where they are.
 * - `begin`: Index of the last line `BEGIN:VEVENT` or `BEGIN:VTODO` read, -1 before the first.
 * - `named`: How many lines changed before the file.
 * - `component`: Lines of an event or a to-do.
 * - `found`: How many lines changed before the event or the to-do.
 * - `line`: Its `LOCATION` or `X-FROM` as one line, unfolded, see {@link unfoldedOf}, empty for none.
 * - `value`: Its place as written, without the `\` before a comma, like `Home Munich, Burg-Eltz-Weg, …`.
 * - `written`: The property written anew.
 * - {@link ICAL.Property.fromString}: Reads one line of a property.
 *
 * @param sources - Calendars, each the files of a folder with a name ending
 * @param old - Name of the place, like `5610.01.011 (Seminarraum (Inf. 18/19)`
 * @param place - The line it takes, see `lineOf` in `places.ts`,
 *   like `5610.01.011 (Seminarraum (Inf. 18/19)), Boltzmannstraße 3, 85748, Garching bei München, Deutschland`
 * @param link - The link a `LOCATION` takes, like `https://nav.tum.de/room/5610.01.011`, empty for none;
 *   an `X-FROM` has none
 * @param dry - Whether only to count the lines, writing nothing
 * @returns How many lines change
 * @throws {Error} - When a file to write lies outside the new system, or a line of a place cannot be read
 */
export function placeLinesRename(sources: CalendarSource[], old: string, place: string, link: string,
                                 dry: boolean): number {
    const changes: [string, FileLines][] = [];
    let count: number = 0;
    filesOf(sources).forEach((file: string): void => {
        const text: FileLines = linesRead(file);
        const places: [number, number][] = [];
        let begin: number = -1;
        text.lines.forEach((line: string, index: number): void => {
            if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO")
                begin = index;
            else if ((line === "END:VEVENT" || line === "END:VTODO") && begin !== -1)
                places.unshift([begin, index + 1]);
        });
        const named: number = count;
        places.forEach(([first, after]: [number, number]): void => {
            const component: string[] = text.lines.slice(first, after);
            const found: number = count;
            ["location", "x-from"].forEach((name: string): void => {
                const line: string = unfoldedOf(component, name);
                if (line === "")
                    return;
                const value: string = String(ICAL.Property.fromString(line).getFirstValue() ?? "");
                if (labelOf(value) !== old)
                    return;
                const written: ICAL.Property = propertyOf(name, place);
                if (name === "location" && link !== "")
                    written.setParameter("altrep", [link]);
                if (written.toICALString() === line)
                    return;
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
        changes.forEach(([file, text]: [string, FileLines]): void => linesWrite(file, text));
    return count;
}
