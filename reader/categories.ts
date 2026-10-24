/**
 * ## Categories
 *
 * Entry by category, for plan and log alike: a fixed list of categories, each with its fields, named as the file
 * names them, its `Summary`, its `SUMMARY`, its `Place`, its `LOCATION`, `Online`, what I did online, its `X-ONLINE`,
 * and `With`, who I was with, its `ATTENDEE`s, like `Way` with `Summary`, `From`, `Place`, `Online` and `With`.
 * Each field of a what offers its values from the log itself, the what of its entries of the category,
 * the most used first, equal ones alphabetical.
 * Places are one list for every field of a place, the place of an entry and where a way starts: only my places
 * of `Places.md`, each as a line with its address, like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 * see `places.ts`, only where I physically am; the most used by the entries of the log first, counted by their names.
 * `Online`, below the place in every category, offers my platforms of `Online.md`, like `Zoom`, the most used first,
 * with the link of each, see `Platform` in `places.ts`; per entry I type the link of its meeting or video
 * and its passcode, see `Online` in `calendar.ts`.
 * `With` takes one or more people or groups, each by a name without `;`, which parts them, mostly one group, like
 * `Socials`, sometimes several, like `Bichler, Martin; Willi`, a person by its name in `Persons.md`, see `persons.ts`,
 * offering the names the entries of the log wrote, the most used first,
 * equal ones alphabetical, with the address the last of them wrote, see {@link addressesOf}, and Vu, with whom
 * I share, before I ever log with Vu, see `partners` in `sources.ts`; an entry with Vu goes to Vu, see `shared.ts`;
 * the dialog offers every person of `Persons.md` besides, see `src/day/categories.ts`.
 * A value offered in the code may come with steps, which the dialog shows while it is picked, and below them
 * the note of the last entry of it, like `Last time: band red · 3×10`, so the load can rise.
 * `Body` is my body care, showering and any care, offering `Caring` and `Shower` before any use, and takes several,
 * parted by `, `, like `Caring, Shower`, its list offering each once; my neck routine,
 * `Neck short` and `Neck long`, is no what of it any more, also where the log holds it, see {@link retiredWhats}.
 * A dish, the what of `Food` and `Cook`, names its foods parted by `, `, like `Reis, Bohnen, Eier`.
 * `Shopping` is what I buy, its what as I type it, like `Brot, Milch`, its place the shop, like `Edeka Center Hadern`.
 * `Event` is what I go to that is no skill, like an evening at a company, its what as I type it, its place where it is,
 * which I add with its address and link like any place of mine.
 * `Sleep` takes only two whats, `Night` and `Day`, a nap, see {@link sleepWhats}, and no new ones,
 * so the sleep tracker tells a nap from a night, see `trackers.ts`; `Way` takes only my means of transport,
 * see {@link transports}.
 * `Sport` is a session of sport, not the moving of every day, which ways on foot or by bike are: it takes only its
 * kinds, `Gym` and `Home workout`, see `sportKinds` in `sport.ts`, so the sport area knows what each burns, and its
 * place, but no `With`, since I do sport alone; a box of the plan may have it, since a session is something I intend.
 * `Skill` has only the fields `Place`, like the room of a lecture, and `With`: in plan and log a skill, a module
 * by its code or a project by its name, and a type or none, which the dialog picks itself, written as the folder
 * of its skill with the type in brackets, like `IN2028_BusinessAnalyticsMachineLearning (VO)` or `WokFlow`,
 * see `activeSkills` in `sources.ts` and {@link skillTypes};
 * in the log also its documents and its attempts, which only `skill.ts` writes.
 * A box of the plan takes every category, like `Sleep`, since I plan all of my day.
 * `Drink` is no category I pick: water has its own tracker, whose counter writes each glass as an entry `Drink`
 * of five minutes, see `trackers.ts`, and takes no time of mine, so the dialog leaves it out, see {@link hiddenNames}.
 *
 * - `./calendar.ts`: Reads `.ics` files into entries, and names the category of skill entries.
 * - `./places.ts`: Reads my places from `Places.md` and my platforms online from `Online.md`.
 * - `./sport.ts`: Names the category of a session and its kinds.
 * - `./sources.ts`: Names every folder and file the reader reads, and the people I share with.
 * - `./persons.ts`: Names a person I share with as `Persons.md` names it.
 */

import { entriesRead, skillName } from "./calendar.ts";
import { personNameOf } from "./persons.ts";
import { labelOf, lineOf, placesRead, platformsRead, roomsRead } from "./places.ts";
import { sportKinds, sportName } from "./sport.ts";
import { day, partners } from "./sources.ts";

import type { Attendee, Entry, EntryTexts, Online } from "./calendar.ts";
import type { Place, Platform } from "./places.ts";
import type { SportKind } from "./sport.ts";


/**
 * Field of an entry a field of a category writes into:
 * `title` into `SUMMARY`, `from` into `X-FROM`, `location` into `LOCATION`, `online` into `X-ONLINE`,
 * `with` into its `ATTENDEE`s.
 */
export type FieldKey = "title" | "from" | "location" | "online" | "with";

/**
 * A field of a category, picked from its list.
 *
 * - `name`: Name shown, like `Summary`.
 * - `key`: Field of the entry it writes into.
 * - `values`: Values to pick, the most used first; in the code only those offered before any use.
 * - `steps`: Steps of a value offered in the code, by the value, which the dialog shows while it is picked,
 *   like the exercises of `Neck short`; none for the other values.
 * - `fixed`: Whether it takes only the values offered in the code, like `Night` and `Day` of `Sleep`, and no new ones.
 * - `many`: Whether it takes several of its values, parted by `, `, like the means of a way, `U-Bahn, Bus`,
 *   my body care, `Caring, Shower`, or the people of `With`, parted by `; `, `Bichler, Martin; Willi`; one when
 *   left out.
 */
export type Field = {
    name: string;
    key: FieldKey;
    values: string[];
    steps: { [value: string]: string[] };
    fixed: boolean;
    many?: boolean;
};

/**
 * A category with its fields.
 * A category without a field `title` writes its own name as `SUMMARY`; every category but `Skill` has one now,
 * and only an old entry `Sleep`, written before it had its what, still has its category as its what.
 *
 * - `name`: Name of the category, written as `CATEGORIES`, like `Way`.
 * - `fields`: Its fields, in the order they are picked.
 */
export type Category = {
    name: string;
    fields: Field[];
};

/**
 * A {@link Field} as the page gets it, with the rooms and the rows of its places.
 *
 * - `rooms`: For a field of a place, the rooms of `Rooms.md`, each as the line an entry writes, in the order
 *   of the table, which the list offers only as I search, see `places.ts`; none for any other field.
 * - `places`: For a field of a place, each of my places and rooms as its row holds it, its address in its parts
 *   and its link, by its line, see `places.ts`; none for any other field.
 * - `links`: For `With` the address of each name, as its last entry wrote it, like `sophale@invalid`,
 *   see {@link addressesOf}; none for any other field.
 * - `platforms`: For `Online` each of my platforms as its row of `Online.md` holds it, its provider and the link
 *   of its web app, by its name, see `Platform` in `places.ts`; none for any other field.
 */
export type FieldShown = Field & {
    rooms: string[];
    places: { [line: string]: Place };
    links: { [value: string]: string };
    platforms: { [name: string]: Platform };
};

/**
 * A {@link Category} as the page gets it, its fields with the links of their places.
 *
 * - `fields`: Its fields as the page gets them.
 */
export type CategoryShown = Category & {
    fields: FieldShown[];
};

/**
 * My neck routine, once offered as the what of `Body`, each with its steps, which the trackers still count, their neck
 * hidden, see `trackers.ts`, but no longer offered, see {@link retiredWhats}:
 * strengthening of the neck, shoulders and shoulder blades, chosen by research
 * (`.claude/studies/science.md`, point 16).
 * `Neck short` every study day, about 5 minutes: lateral raises with an elastic band eased neck pain
 * with 2 minutes a day as much as with 12. `Neck long` on three of those days, about 20 minutes: the short one
 * and four exercises more, three sets each, the load rising from about 12 repetitions toward 8,
 * as in a trial in trapezius myalgia (Gross 2015). Regularity is the dose, so the trackers count the sessions
 * of seven days against my goal, see `trackers.ts`; strengthening helped after 10 to 20 weeks, not yet after 4,
 * so the routine is judged after 10 to 12 weeks.
 */
export const neckRoutines: { [what: string]: string[] } = {
    "Neck short": [
        "About 5 minutes, every study day",
        "Lateral raises with an elastic band, 2 minutes",
        "Chin nods, 10 holds of 10 seconds",
    ],
    "Neck long": [
        "About 20 minutes, on 3 study days a week",
        "Lateral raises with an elastic band, 2 minutes",
        "Chin nods, 10 holds of 10 seconds",
        "Shrugs, one-arm rows, reverse flies, upright rows",
        "3 sets each, from about 12 toward 8 repetitions",
    ],
};

/**
 * Field `With` of every category, who I was with, one or more people or groups, see the top of this file;
 * its values the reader gives from the log, see {@link categoriesRead}.
 */
const withField: Field = { name: "With", key: "with", values: [], steps: {}, fixed: false, many: true };

/**
 * Field `Online` of every category, what I did online, below its place, see the top of this file; its values
 * the reader gives from `Online.md`, see {@link categoriesRead}.
 */
const onlineField: Field = { name: "Online", key: "online", values: [], steps: {}, fixed: false };

/**
 * Builds a category with the fields `Summary`, `Place`, `Online` and `With`, whose summary offers only what the log
 * holds.
 *
 * @param name - Name of the category, like `Food`
 * @returns Category to pick what, where and with whom
 */
function categoryOf(name: string): Category {
    return {
        name: name,
        fields: [
            { name: "Summary", key: "title", values: [], steps: {}, fixed: false },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    };
}

/**
 * Category of skill entries, written as `CATEGORIES:Skill`: in plan and log a skill and a type or none,
 * both in the `ALTREP` of its `SUMMARY`, like `NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons`,
 * see `skillPartsOf` in `calendar.ts`,
 * which names the category, its place and who I was with,
 * in the log also its documents and its attempts, which only `skill.ts` writes.
 */
export { skillName };

/**
 * Types of a skill entry, each written in round brackets after its skill in its `SUMMARY`,
 * like `IN2028_BusinessAnalyticsMachineLearning (VO)`; a type names only a fixed form I take part in: `VO` a lecture,
 * `UE` an exercise, `ZU` a central exercise, `TU` a tutorial, `HU` a homework sheet, `FA` an exam
 * and `PR` a practical course.
 * My own learning, theory and tasks together, has no type, like `Skill: IN2028_BusinessAnalyticsMachineLearning`,
 * as a project, `Skill: WokFlow`.
 */
export const skillTypes: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA", "PR"];

/**
 * Semester of a skill entry, its `X-SEMESTER`, like `2026W` or `2027S`: the year it begins in, then `W` for a winter,
 * October to March, or `S` for a summer, April to September.
 */
const semesterForm: RegExp = /^\d{4}[WS]$/;

/**
 * The only whats of `Sleep`, in this order: `Night`, the sleep of a night, and `Day`, a nap,
 * which the sleep tracker never counts as a night, see `trackers.ts`.
 */
const sleepWhats: string[] = ["Night", "Day"];

/**
 * The only whats of `Way`, my means of transport, each written one way, as German writes them, like my other names:
 * `Walk`, `Bike`, `Bus`, `Tram`, `U-Bahn`, `S-Bahn`, `Train` and `Car`; a way may use several, since I change on it,
 * parted by `, `, like `U-Bahn, Bus`.
 */
const transports: string[] = ["Walk", "Bike", "Bus", "Tram", "U-Bahn", "S-Bahn", "Train", "Car"];

/**
 * Categories the dialog leaves out, though the reader takes them: `Drink`, whose glasses of water only the counter
 * of the trackers writes, see the top of this file.
 */
const hiddenNames: string[] = ["Drink"];

/**
 * Whats a category no longer offers, by category, also where the log holds them: the neck routine of `Body`,
 * which is my body care now, see {@link neckRoutines}.
 */
const retiredWhats: { [category: string]: string[] } = { Body: Object.keys(neckRoutines) };

/**
 * Categories with their fields, in the order of their importance for my life, the one order of every list of them.
 */
const categories: Category[] = [
    {
        name: skillName,
        fields: [{ name: "Place", key: "location", values: [], steps: {}, fixed: false }, onlineField, withField],
    },
    {
        name: "Sleep",
        fields: [
            { name: "Summary", key: "title", values: sleepWhats, steps: {}, fixed: true },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    },
    categoryOf("Food"),
    categoryOf("Cook"),
    categoryOf("Shopping"),
    {
        name: "Body",
        fields: [
            { name: "Summary", key: "title", values: ["Caring", "Shower"], steps: {}, fixed: false, many: true },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    },
    {
        name: sportName,
        fields: [
            {
                name: "Summary", key: "title", values: sportKinds.map((kind: SportKind): string => kind.name),
                steps: {}, fixed: true,
            },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
        ],
    },
    categoryOf("Meditate"),
    {
        name: "Way",
        fields: [
            {
                name: "Summary", key: "title", values: transports, steps: {}, fixed: true, many: true,
            },
            { name: "From", key: "from", values: [], steps: {}, fixed: false },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    },
    categoryOf("Talk"),
    categoryOf("Event"),
    categoryOf("Drink"),
    categoryOf("Watch"),
    categoryOf("Game"),
];


/**
 * Gives the semester of a day, which the dashboard fills in for a skill entry until I pick another: October to March
 * a winter, April to September a summer; January to March belong to the winter that began the year before.
 * - `year`, `month`: Year and month of the day.
 *
 * @param day - Day like `2027-02-15`
 * @returns Semester like `2026W`, or `2027S` for `2027-05-04`
 */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10)
        return `${year}W`;
    if (month <= 3)
        return `${year - 1}W`;
    return `${year}S`;
}

/**
 * Gives the semester an entry states in its `X-SEMESTER`: for a skill entry the one sent or kept, else the semester
 * of its day, see {@link semesterOf}, so every skill entry the reader writes carries one; none for any other entry.
 *
 * @param category - Category of the entry, like `Skill`
 * @param semester - Semester sent or kept, like `2025W`, empty for none
 * @param day - Day of the entry, like `2026-10-13`
 * @returns Semester like `2026W`, empty for an entry of another category
 * @throws {Error} - When the semester of a skill entry is not written like `2026W`
 */
export function semesterFor(category: string, semester: string, day: string): string {
    if (category !== skillName)
        return "";
    if (semester !== "" && !semesterForm.test(semester))
        throw new Error(`No semester ${semester}`);
    return semester === "" ? semesterOf(day) : semester;
}

/**
 * Reads the timed log entries up to an instant, from the first entry of the log on.
 *
 * @param now - Present as ISO instant
 * @returns Log entries that started before the instant
 */
function logsRead(now: string): Entry[] {
    return entriesRead(day.log, "1970-01-01T00:00:00Z", now).filter((log: Entry): boolean => !log.allDay);
}

/**
 * Lists the places of log entries by their names: their places and where their ways start, see `labelOf`
 * in `places.ts`, so `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland` and an older `TUM Innenstadt` count alike.
 *
 * @param logs - Log entries
 * @returns Every use of a place by its name, like `TUM Innenstadt`, a place as often as it was used
 */
function placeUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => [labelOf(log.location), labelOf(log.from)]);
}

/**
 * Lists the platforms of log entries, what they did online, see `Online` in `calendar.ts`.
 *
 * @param logs - Log entries
 * @returns Every use of a platform, like `Zoom`, a platform as often as it was used
 */
function onlineUsesOf(logs: Entry[]): string[] {
    return logs.map((log: Entry): string => log.online);
}

/**
 * Gives the names of my places and of the rooms of the university, which an entry writes as places, see `places.ts`.
 *
 * @returns Names like `Home Munich`, in the order of `Places.md`, then those of `Rooms.md`
 */
function placeNamesRead(): string[] {
    return [...placesRead(), ...roomsRead()].map((place: Place): string => place.name);
}

/**
 * Lists the values of the field `title` of a category in log entries: the what of its entries, each value of a what
 * of several on its own, like `Caring` and `Shower` of `Caring, Shower`.
 *
 * @param logs - Log entries
 * @param name - Name of the category
 * @param many - Whether its what takes several values, parted by `, `
 * @returns Every use of a value, a value as often as it was used
 */
function titleUsesOf(logs: Entry[], name: string, many: boolean): string[] {
    return logs.filter((log: Entry): boolean => log.category === name)
        .flatMap((log: Entry): string[] => many ? log.title.split(", ") : [log.title]);
}

/**
 * Lists the people of log entries, who I was with, by their names, see `Attendee` in `calendar.ts`.
 *
 * @param logs - Log entries
 * @returns Every use of a name, like `Sophale`, a name as often as it was used
 */
function peopleUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => log.attendees.map((attendee: Attendee): string => attendee.name));
}

/**
 * Gives the address of each person of log entries as the last entry with the person wrote it, so a name picked again
 * takes it, like `sophale@invalid`, or a real one I typed.
 *
 * @param logs - Log entries, in any order
 * @returns Address by name
 */
function addressesOf(logs: Entry[]): { [name: string]: string } {
    return Object.fromEntries([...logs]
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .flatMap((log: Entry): [string, string][] =>
            log.attendees.map((attendee: Attendee): [string, string] => [attendee.name, attendee.address])));
}

/**
 * Orders values by how often they were used, the most used first, equal ones alphabetical.
 *
 * @param uses - Every use of a value
 * @param offered - Values offered even when never used
 * @returns Each value once, without empty ones
 */
function valuesOrder(uses: string[], offered: string[]): string[] {
    const counts: Map<string, number> = new Map([...offered, ...uses]
        .filter((value: string): boolean => value !== "")
        .map((value: string): [string, number] => [value, 0]));
    uses.filter((value: string): boolean => counts.has(value))
        .forEach((value: string): void => {
            counts.set(value, (counts.get(value) ?? 0) + 1);
        });
    return [...counts.keys()].sort((first: string, second: string): number =>
        (counts.get(second) ?? 0) - (counts.get(first) ?? 0) || first.localeCompare(second));
}

/**
 * Gives the steps of each value with steps, and after them the note of the last log entry of the value,
 * like `Last time: band red · 3×10` for `Neck long`.
 * - `last`: Last log entry of the category and the value with a note, `undefined` for none.
 *
 * @param logs - Log entries up to now, in any order
 * @param name - Name of the category, like `Body`
 * @param steps - Steps of each value, like {@link neckRoutines}
 * @returns Steps of each value, with the last note
 */
function stepsWithNoteOf(logs: Entry[], name: string, steps: { [what: string]: string[] }): { [what: string]: string[] } {
    return Object.fromEntries(Object.entries(steps).map(([what, own]: [string, string[]]): [string, string[]] => {
        const last: Entry | undefined = logs
            .filter((log: Entry): boolean => log.category === name && log.title === what && log.note.trim() !== "")
            .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
            .at(-1);
        return [what, last === undefined ? own : [...own, `Last time: ${last.note.trim()}`]];
    }));
}

/**
 * Reads the categories with the values of their fields, see {@link valuesOrder}, a field that takes no new values
 * only those of the code in their order, like `Night` and `Day` of `Sleep`,
 * each telling whether a box of the plan may have it; a value with steps gets the note of its last entry,
 * see {@link stepsWithNoteOf}; but the categories the dialog leaves out, see {@link hiddenNames}, and the whats
 * a category no longer offers, see {@link retiredWhats}.
 * - `logs`: Log entries up to now.
 * - `mine`: My places.
 * - `names`: Their names.
 * - `places`: One list of places for every field of a place: my places, the most used first,
 *   see {@link placeUsesOf}, each as the line an entry writes, see `lineOf` in `places.ts`.
 * - `platformNames`: The names of my platforms online, in the order of `Online.md`.
 * - `platforms`: The same, the most used first, see {@link onlineUsesOf}.
 * - `rowsOnline`: Each of them as its row holds it, by its name.
 * - `rooms`: The rooms of the university for every field of a place, each as the line an entry writes, in the order
 *   of `Rooms.md`, none of the name of one of my places.
 * - `rows`: My places and rooms by their lines.
 * - `people`: The names of `With`, the most used first, see {@link peopleUsesOf}, those I share with offered
 *   before any use, see `partners` in `sources.ts`, each as `Persons.md` names it, like `Family, Sopha`.
 * - `addresses`: The address of each of them, see {@link addressesOf}.
 *
 * @param now - Present as ISO instant, as the page knows it
 * @returns {@link CategoryShown}s in their order
 */
export function categoriesRead(now: string): CategoryShown[] {
    const logs: Entry[] = logsRead(now);
    const mine: Place[] = placesRead();
    const names: string[] = mine.map((place: Place): string => place.name);
    const places: string[] = valuesOrder(placeUsesOf(logs).filter((use: string): boolean => names.includes(use)), names)
        .map((name: string): string => lineOf(mine[names.indexOf(name)]));
    const platformNames: string[] = platformsRead().map((platform: Platform): string => platform.name);
    const platforms: string[] = valuesOrder(onlineUsesOf(logs).filter((use: string): boolean =>
        platformNames.includes(use)), platformNames);
    const rowsOnline: { [name: string]: Platform } = Object.fromEntries(platformsRead()
        .map((platform: Platform): [string, Platform] => [platform.name, platform]));
    const rooms: Place[] = roomsRead().filter((room: Place): boolean => !names.includes(room.name));
    const rows: { [line: string]: Place } = Object.fromEntries([...mine, ...rooms]
        .map((place: Place): [string, Place] => [lineOf(place), place]));
    const people: string[] = valuesOrder(peopleUsesOf(logs), partners.map(personNameOf));
    const addresses: { [name: string]: string } = addressesOf(logs);
    return categories
        .filter((category: Category): boolean => !hiddenNames.includes(category.name))
        .map((category: Category): CategoryShown => ({
            name: category.name,
            fields: category.fields.map((field: Field): FieldShown => ({
                ...field,
                values: field.key === "with" ? people : field.key === "online" ? platforms
                    : field.key !== "title" ? places
                        : field.fixed ? field.values : valuesOrder(titleUsesOf(logs, category.name, field.many === true), field.values)
                            .filter((value: string): boolean => !(retiredWhats[category.name] ?? []).includes(value)),
                steps: stepsWithNoteOf(logs, category.name, field.steps),
                rooms: ["location", "from"].includes(field.key) ? rooms.map(lineOf) : [],
                places: ["location", "from"].includes(field.key) ? rows : {},
                links: field.key === "with" ? addresses : {},
                platforms: field.key === "online" ? rowsOnline : {},
            })),
        }));
}

/**
 * Finds where the last way before an instant ended: the place of the last `Way` as it wrote it, with the address
 * it had then, like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`, when its name is one of my places
 * or of the rooms.
 * - `last`: Last way that started before the instant.
 *
 * @param before - Start of the new entry as ISO instant
 * @returns Place, empty when there was no way before or it ended at no place of mine and no room
 */
export function wayEndRead(before: string): string {
    const last: Entry | undefined = logsRead(before)
        .filter((log: Entry): boolean => log.category === "Way")
        .sort((first: Entry, second: Entry): number => second.start.localeCompare(first.start))[0];
    return last !== undefined && placeNamesRead().includes(labelOf(last.location)) ? last.location : "";
}

/**
 * Tells whether the people of an entry or a box are well formed, see `Attendee` in `calendar.ts`: each a name without
 * `;`, which parts the names of `With`, and without spaces around it, like `Bichler, Martin` or `Herr Müller`,
 * and an address without spaces and commas, like `martin.bichler@invalid`.
 *
 * @param attendees - Who I was with
 * @returns Whether they may be written
 */
export function attendeesAllow(attendees: Attendee[]): boolean {
    return attendees.every((attendee: Attendee): boolean => attendee.name !== "" && !attendee.name.includes(";")
        && attendee.name.trim() === attendee.name && /^[^\s,]+$/.test(attendee.address));
}

/**
 * Tells whether the fields of an entry fit its category, in plan and log alike:
 * the category is in the list, what is picked, never empty, one of its values for a field that takes no new ones,
 * like `Night` or `Day` of `Sleep`, or, without a field `title`, the name of the category,
 * `from` is only set when the category has the field, and module and type stay empty, the people of every category
 * well formed, see {@link attendeesAllow}; every other field but the category and the times may stay empty.
 * `Skill` is a skill, never none, a module code like `IN2028` or a project like `WokFlow`, and one of the
 * {@link skillTypes} or none, and its title free, at first what the reader writes from both, see `skillTitleOf`
 * in `documents.ts`,
 * and its chapters, documents and attempts in the log only `skill.ts` writes.
 * - `keys`: Fields of the category.
 * - `what`: Its field `title`, `undefined` for none.
 * - `whatAllowed`: Whether what the entry was fits that field.
 *
 * @param fields - Text fields of an entry or a box to write
 * @returns Whether the entry may be written
 */
export function categoryAllows(fields: Omit<EntryTexts, "locationLink" | "titleLink" | "attendees" | keyof Online>
    & { attendees?: Attendee[] }): boolean {
    const category: Category | undefined = categories.find((candidate: Category): boolean =>
        candidate.name === fields.category);
    if (category === undefined || !attendeesAllow(fields.attendees ?? []))
        return false;
    if (category.name === skillName)
        return /^\w+$/.test(fields.module) && (fields.type === "" || skillTypes.includes(fields.type))
            && fields.from === "";

    const keys: FieldKey[] = category.fields.map((field: Field): FieldKey => field.key);
    const what: Field | undefined = category.fields.find((field: Field): boolean => field.key === "title");
    const whatAllowed: boolean = what === undefined ? fields.title === category.name
        : fields.title.trim() !== "" && (!what.fixed
            || (what.many === true ? fields.title.split(", ") : [fields.title])
                .every((value: string): boolean => what.values.includes(value)));
    return whatAllowed && (keys.includes("from") || fields.from === "") && fields.module === "" && fields.type === "";
}
