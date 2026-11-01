/**
 * ## Categories
 *
 * Entry by category, for plan and log alike:
 * a fixed list of categories, each with its fields,
 * `Summary`, its `SUMMARY`, `Place`, its `LOCATION`, `Online`, its `X-ONLINE`,
 * and `With`, who I was with, its `ATTENDEE`s.
 * Each field of a what offers its values from the log itself,
 * after those the code offers, in their order, the most used first,
 * equal ones alphabetical.
 * Places are one list for every field of a place: only my places of `Places.md`,
 * see `./places.ts`, only where I physically am, the most used first,
 * counted by their names.
 * `Online` offers my platforms of `Online.md`, the most used first.
 * Per entry I type the link of its meeting or video, its channel and its title,
 * see `Online` in `./calendar.ts`.
 * `With` takes one or more people or groups,
 * each by a name without `;`, which parts them,
 * a person by its name in `Persons.md`, see `./persons.ts`,
 * with the address the last entry of it wrote, see {@link addressesOf},
 * and Vu, with whom I share, before I ever log with Vu.
 * An entry with Vu goes to Vu, see `./shared.ts`.
 * A value offered in the code may come with steps, which the dialog shows while
 * it is picked, and below them the note of the last entry of it, so the load can rise.
 * `Body` is my body care, offering `Caring` first, and takes several, parted by `, `.
 * A dish, the what of `Food` and `Cook`, names its foods parted by `, `.
 * `Manage` takes several, parted by `, `, as `Body`.
 * `Event` is what I go to that is no skill, its place where it is.
 * `Sleep` offers `Night` and `Day`, a nap, first, and takes new ones,
 * the sleep tracker telling a nap from a night by `Day` and the length,
 * see `./trackers.ts`.
 * `Way` takes only my means of transport, see {@link transports}.
 * `Sport` is a session of sport, not the moving of every day,
 * which ways on foot or by bike are, its fields those of every category, see `./sport.ts`.
 * A box of the plan may have it, since a session is something I intend.
 * `Skill` has only the fields `Place` and `With`:
 * a skill, a module by its code or a project by its name, and a type or none,
 * which the dialog picks itself, see `activeSkillsRead` in `./skills.ts`.
 * In the log also its documents and its attempts, which only `./skill.ts` writes.
 * A box of the plan takes every category, since I plan all of my day.
 * `Drink` is no category I pick: water has its own tracker,
 * whose counter writes each glass as an entry `Drink`, see `./trackers.ts`,
 * and takes no time of mine, so the dialog leaves it out, see {@link hiddenNames}.
 */

import { entriesRead, skillName, summaryBaseOf } from "./calendar.ts";
import { personNameOf } from "./persons.ts";
import { labelOf, lineOf, placesRead, platformsRead, roomsRead } from "./places.ts";
import { sportName } from "./sport.ts";
import { day, partners } from "./sources.ts";

import type { Attendee, Entry, EntryTexts, Online } from "./calendar.ts";
import type { Place, Platform } from "./places.ts";

/** Field of an entry a field of a category writes into. */
export type FieldKey = "title" | "from" | "location" | "online" | "with";

/**
 * A field of a category, picked from its list.
 * - `values`: Values to pick, in the code only those it offers first.
 * - `steps`: Steps of a value offered in the code, which the dialog shows while
 *   it is picked.
 * - `fixed`: Whether it takes only the values offered in the code, and no new ones.
 * - `many`: Whether it takes several of its values, parted by `, `,
 *   or for the people of `With` by `; `.
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
 * A category with its fields, in the order they are picked.
 * A category without a field `title` writes its own name as `SUMMARY`.
 * Every category but `Skill` has one now,
 * and only an old entry `Sleep`, written before it had its what,
 * still has its category as its what.
 */
export type Category = {
    name: string;
    fields: Field[];
};

/**
 * A {@link Field} as the page gets it, with the rooms and the rows of its places,
 * none of each for a field it does not fit.
 * - `rooms`: The rooms of `Rooms.md` in the order of the table,
 *   which the list offers only as I search, see `./places.ts`.
 * - `places`: Each of my places and rooms as its row holds it, by its line.
 * - `links`: For `With` the address of each name, see {@link addressesOf}.
 * - `params`: For a summary the params each value had before, see {@link paramsOf}.
 * - `platforms`: For `Online` each of my platforms as its row of `Online.md` holds it.
 */
export type FieldShown = Field & {
    rooms: string[];
    places: { [line: string]: Place };
    links: { [value: string]: string };
    params: { [value: string]: string[] };
    platforms: { [name: string]: Platform };
};

/** A {@link Category} as the page gets it. */
export type CategoryShown = Category & {
    fields: FieldShown[];
};

/**
 * My neck routine, once offered as the what of `Body`, each with its steps,
 * which the trackers still count, see `./trackers.ts`, but no longer offered:
 * strengthening of the neck, shoulders and shoulder blades, chosen by research
 * (`.claude/studies/science.md`, point 16).
 * `Neck short`: lateral raises with an elastic band eased neck pain
 * with 2 minutes a day as much as with 12.
 * `Neck long`: the load rising from about 12 repetitions toward 8,
 * as in a trial in trapezius myalgia (Gross 2015).
 * Regularity is the dose, so the trackers count the sessions of seven days.
 * Strengthening helped after 10 to 20 weeks, not yet after 4,
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

/** Field `With` of every category, its values from the log. */
const withField: Field = {
    name: "With",
    key: "with",
    values: [],
    steps: {},
    fixed: false,
    many: true,
};

/** Field `Online` of every category, its values from `Online.md`. */
const onlineField: Field = {
    name: "Online",
    key: "online",
    values: [],
    steps: {},
    fixed: false,
};

/**
 * Builds a category with the fields `Summary`, `Place`, `Online` and `With`,
 * whose summary offers only what the log holds.
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
 * Category of skill entries: a skill and a type or none,
 * both in the `ALTREP` of its `SUMMARY`, see `skillPartsOf` in `./calendar.ts`.
 */
export { skillName };

/**
 * Types of a skill entry,
 * each written in round brackets after its skill in its `SUMMARY`.
 * A type names only a fixed form I take part in:
 * `VO` a lecture, `UE` an exercise, `ZU` a central exercise, `TU` a tutorial,
 * `HU` a homework sheet, `FA` an exam and `PR` a practical course.
 * My own learning, theory and tasks together, has no type, as a project.
 */
export const skillTypes: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA", "PR"];

/**
 * Semester of a skill entry, its `X-SEMESTER`: the year it begins in,
 * then `W` for a winter, October to March, or `S` for a summer, April to September.
 */
const semesterForm: RegExp = /^\d{4}[WS]$/;

/** The whats `Sleep` offers first, `Day` a nap, which never counts as a night. */
const sleepWhats: string[] = ["Night", "Day"];

/**
 * The only whats of `Way`, my means of transport, each written one way,
 * as German writes them, like my other names.
 * A way may use several, since I change on it.
 */
const transports: string[] = ["Walk", "Bike", "Bus", "Tram", "U-Bahn", "S-Bahn", "Train", "Car"];

/**
 * Categories the dialog leaves out, though the reader takes them:
 * the glasses of `Drink` only the counter of the trackers writes.
 */
const hiddenNames: string[] = ["Drink"];

/**
 * Whats a category no longer offers, by category, also where the log holds them:
 * the neck routine of `Body`, which is my body care now.
 */
const retiredWhats: { [category: string]: string[] } = {
    Body: Object.keys(neckRoutines),
};

/**
 * Categories with their fields, in the order of their importance for my life,
 * the one order of every list of them.
 */
const categories: Category[] = [
    {
        name: skillName,
        fields: [{ name: "Place", key: "location", values: [], steps: {}, fixed: false }, onlineField, withField],
    },
    {
        name: "Sleep",
        fields: [
            {
                name: "Summary",
                key: "title",
                values: sleepWhats,
                steps: {},
                fixed: false,
            },
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
            {
                name: "Summary",
                key: "title",
                values: ["Caring"],
                steps: {},
                fixed: false,
                many: true,
            },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    },
    categoryOf(sportName),
    categoryOf("Meditate"),
    {
        name: "Manage",
        fields: [
            {
                name: "Summary",
                key: "title",
                values: [],
                steps: {},
                fixed: false,
                many: true,
            },
            { name: "Place", key: "location", values: [], steps: {}, fixed: false },
            onlineField,
            withField,
        ],
    },
    {
        name: "Way",
        fields: [
            {
                name: "Summary",
                key: "title",
                values: transports,
                steps: {},
                fixed: true,
                many: true,
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
    categoryOf("Internet"),
    categoryOf("Game"),
];

/**
 * Gives the semester of a day,
 * which the dashboard fills in for a skill entry until I pick another.
 * January to March belong to the winter that began the year before.
 */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10) return `${year}W`;
    if (month <= 3) return `${year - 1}W`;
    return `${year}S`;
}

/**
 * Gives the semester an entry states in its `X-SEMESTER`:
 * for a skill entry the one sent or kept, else the semester of its day,
 * so every skill entry the reader writes carries one. None for any other entry.
 *
 * @throws {Error} - When the semester of a skill entry is not written like `2026W`
 */
export function semesterFor(category: string, semester: string, day: string): string {
    if (category !== skillName) return "";
    if (semester !== "" && !semesterForm.test(semester)) throw new Error(`No semester ${semester}`);
    return semester === "" ? semesterOf(day) : semester;
}

/** Reads the timed log entries up to an instant, from the first entry of the log on. */
function logsRead(now: string): Entry[] {
    return entriesRead(day.log, "1970-01-01T00:00:00Z", now).filter((log: Entry): boolean => !log.allDay);
}

/**
 * Lists the places of log entries by their names, see `labelOf` in `./places.ts`,
 * so a line with its address and an older one of the name alone count alike.
 * Their places and where their ways start, each as often as it was used.
 */
function placeUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => [labelOf(log.location), labelOf(log.from)]);
}

/** Lists the platforms of log entries, each as often as it was used. */
function onlineUsesOf(logs: Entry[]): string[] {
    return logs.map((log: Entry): string => log.online);
}

/**
 * Lists the values of the field `title` of a category in log entries,
 * each value of a what of several on its own, as often as it was used.
 */
function titleUsesOf(logs: Entry[], name: string, many: boolean): string[] {
    return logs
        .filter((log: Entry): boolean => log.category === name)
        .flatMap((log: Entry): string[] => (many ? log.title.split(", ") : [log.title]));
}

/**
 * Gives the params each value of a summary had in log entries, by value,
 * in round brackets at its end, the most used first.
 */
function paramsOf(logs: Entry[], name: string, many: boolean): { [value: string]: string[] } {
    const uses: string[] = titleUsesOf(logs, name, many).filter((use: string): boolean => summaryBaseOf(use) !== use);
    return Object.fromEntries(
        [...new Set(uses.map(summaryBaseOf))].map((base: string): [string, string[]] => [
            base,
            valuesOrder(
                uses
                    .filter((use: string): boolean => summaryBaseOf(use) === base)
                    .map((use: string): string => use.slice(summaryBaseOf(use).length).trim().slice(1, -1)),
                [],
            ),
        ]),
    );
}

/** Lists the people of log entries by their names, each as often as it was used. */
function peopleUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => log.attendees.map((attendee: Attendee): string => attendee.name));
}

/**
 * Gives the address of each person of log entries as the last entry with them wrote it,
 * so a name picked again takes it.
 */
function addressesOf(logs: Entry[]): { [name: string]: string } {
    return Object.fromEntries(
        [...logs]
            .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
            .flatMap((log: Entry): [string, string][] =>
                log.attendees.map((attendee: Attendee): [string, string] => [attendee.name, attendee.address]),
            ),
    );
}

/**
 * Orders values by how often they were used, each once without empty ones,
 * the most used first, equal ones alphabetical.
 */
function valuesOrder(uses: string[], offered: string[]): string[] {
    const counts: Map<string, number> = new Map(
        [...offered, ...uses]
            .filter((value: string): boolean => value !== "")
            .map((value: string): [string, number] => [value, 0]),
    );
    uses.filter((value: string): boolean => counts.has(value)).forEach((value: string): void => {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    return [...counts.keys()].sort(
        (first: string, second: string): number =>
            (counts.get(second) ?? 0) - (counts.get(first) ?? 0) || first.localeCompare(second),
    );
}

/**
 * Gives the steps of each value with steps,
 * and after them the note of the last log entry of the value.
 */
function stepsWithNoteOf(
    logs: Entry[],
    name: string,
    steps: { [what: string]: string[] },
): { [what: string]: string[] } {
    return Object.fromEntries(
        Object.entries(steps).map(([what, own]: [string, string[]]): [string, string[]] => {
            const last: Entry | undefined = logs
                .filter((log: Entry): boolean => log.category === name && log.title === what && log.note.trim() !== "")
                .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
                .at(-1);
            return [what, last === undefined ? own : [...own, `Last time: ${last.note.trim()}`]];
        }),
    );
}

/**
 * Reads the categories with the values of their fields, see {@link valuesOrder},
 * a field that takes no new values only those of the code in their order.
 * Leaves out the categories the dialog leaves out
 * and the whats a category no longer offers.
 * - `places`: One list of places for every field of a place,
 *   each as the line an entry writes, see `lineOf` in `./places.ts`.
 * - `rooms`: None of the name of one of my places.
 * - `people`: Those I share with offered before any use,
 *   each as `Persons.md` names it.
 */
export function categoriesRead(now: string): CategoryShown[] {
    const logs: Entry[] = logsRead(now);
    const mine: Place[] = placesRead();
    const names: string[] = mine.map((place: Place): string => place.name);
    const places: string[] = valuesOrder(
        placeUsesOf(logs).filter((use: string): boolean => names.includes(use)),
        names,
    ).map((name: string): string => lineOf(mine[names.indexOf(name)]));
    const platformNames: string[] = platformsRead().map((platform: Platform): string => platform.name);
    const platforms: string[] = valuesOrder(
        onlineUsesOf(logs).filter((use: string): boolean => platformNames.includes(use)),
        platformNames,
    );
    const rowsOnline: { [name: string]: Platform } = Object.fromEntries(
        platformsRead().map((platform: Platform): [string, Platform] => [platform.name, platform]),
    );
    const rooms: Place[] = roomsRead().filter((room: Place): boolean => !names.includes(room.name));
    const rows: { [line: string]: Place } = Object.fromEntries(
        [...mine, ...rooms].map((place: Place): [string, Place] => [lineOf(place), place]),
    );
    const people: string[] = valuesOrder(peopleUsesOf(logs), partners.map(personNameOf));
    const addresses: { [name: string]: string } = addressesOf(logs);
    return categories
        .filter((category: Category): boolean => !hiddenNames.includes(category.name))
        .map((category: Category): CategoryShown => ({
            name: category.name,
            fields: category.fields.map((field: Field): FieldShown => ({
                ...field,
                values:
                    field.key === "with"
                        ? people
                        : field.key === "online"
                          ? platforms
                          : field.key !== "title"
                            ? places
                            : field.fixed
                              ? field.values
                              : [
                                    ...field.values,
                                    ...valuesOrder(
                                        titleUsesOf(logs, category.name, field.many === true).map(summaryBaseOf),
                                        [],
                                    ).filter((value: string): boolean => !field.values.includes(value)),
                                ].filter(
                                    (value: string): boolean => !(retiredWhats[category.name] ?? []).includes(value),
                                ),
                steps: stepsWithNoteOf(logs, category.name, field.steps),
                rooms: ["location", "from"].includes(field.key) ? rooms.map(lineOf) : [],
                places: ["location", "from"].includes(field.key) ? rows : {},
                links: field.key === "with" ? addresses : {},
                params: field.key === "title" ? paramsOf(logs, category.name, field.many === true) : {},
                platforms: field.key === "online" ? rowsOnline : {},
            })),
        }));
}

/**
 * Finds where I was last before an instant:
 * the place of the last entry at one of my places as it wrote it,
 * with the address it had then.
 * A way's place is its goal, and a place I changed by hand counts as a way there.
 * A room of the university counts as none, so after a lecture I am where I was before it.
 * Empty when no entry before is at one of my places.
 */
export function lastPlaceRead(before: string): string {
    const names: string[] = placesRead().map((place: Place): string => place.name);
    const last: Entry | undefined = logsRead(before)
        .filter((log: Entry): boolean => names.includes(labelOf(log.location)))
        .sort((first: Entry, second: Entry): number => second.start.localeCompare(first.start))[0];
    return last?.location ?? "";
}

/**
 * Tells whether the people of an entry or a box are well formed:
 * each a name without `;`, which parts the names of `With`, and without spaces around it,
 * and an address without spaces and commas.
 */
export function attendeesAllow(attendees: Attendee[]): boolean {
    return attendees.every(
        (attendee: Attendee): boolean =>
            attendee.name !== "" &&
            !attendee.name.includes(";") &&
            attendee.name.trim() === attendee.name &&
            /^[^\s,]+$/.test(attendee.address),
    );
}

/**
 * Tells whether the fields of an entry fit its category, in plan and log alike:
 * the category is in the list, what is picked, never empty,
 * one of its values for a field that takes no new ones, or,
 * without a field `title`, the name of the category,
 * `from` is only set when the category has the field,
 * module and type stay empty, and the people are well formed.
 * Every other field but the category and the times may stay empty.
 * `Skill` is a skill, never none, and one of the {@link skillTypes} or none,
 * its title free, at first what the reader writes from both,
 * see `skillTitleOf` in `./documents.ts`.
 */
export function categoryAllows(
    fields: Omit<EntryTexts, "locationLink" | "titleLink" | "attendees" | keyof Online> & {
        attendees?: Attendee[];
    },
): boolean {
    const category: Category | undefined = categories.find(
        (candidate: Category): boolean => candidate.name === fields.category,
    );
    if (category === undefined || !attendeesAllow(fields.attendees ?? [])) return false;
    if (category.name === skillName)
        return (
            /^\w+$/.test(fields.module) &&
            (fields.type === "" || skillTypes.includes(fields.type)) &&
            fields.from === ""
        );

    const keys: FieldKey[] = category.fields.map((field: Field): FieldKey => field.key);
    const what: Field | undefined = category.fields.find((field: Field): boolean => field.key === "title");
    const whatAllowed: boolean =
        what === undefined
            ? fields.title === category.name
            : fields.title.trim() !== "" &&
              (!what.fixed ||
                  (what.many === true ? fields.title.split(", ") : [fields.title]).every((value: string): boolean =>
                      what.values.includes(summaryBaseOf(value)),
                  ));
    return whatAllowed && (keys.includes("from") || fields.from === "") && fields.module === "" && fields.type === "";
}
