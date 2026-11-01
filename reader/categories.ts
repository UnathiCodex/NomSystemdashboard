/**
 * ## Categories
 *
 * The fixed list of categories of plan and log, each with its fields,
 * `Summary` its `SUMMARY`, `Place` its `LOCATION`, `Online` its `X-ONLINE`, `With` its `ATTENDEE`s.
 * A what offers the values of the code first, then those of the log, the most used first.
 * Places are one list for every field of a place, only my places of `Places.md`.
 * `With` takes people or groups, each by a name without `;`, which parts them.
 * Vu, with whom I share, is offered before I ever log with Vu.
 * A value of the code may have steps, shown with the note of its last entry, so the load can rise.
 * `Body`, `Manage` and a dish of `Food` and `Cook` take several, parted by `, `.
 * `Event` is what I go to that is no skill.
 * `Sleep` offers `Night` and `Day` first, a nap, which the sleep tracker tells apart.
 * `Way` takes only my means of transport.
 * `Sport` is a session of sport, not the moving of every day.
 * `Skill` has only `Place` and `With`, its skill and type the dialog picks itself.
 * A box of the plan takes every category, since I plan all of my day.
 * `Drink` is no category I pick, the counter of water writes each glass, taking no time of mine.
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
 * - `values`: In the code only those it offers first.
 * - `steps`: Of a value of the code, shown while it is picked.
 * - `fixed`: Whether it takes only the values of the code.
 * - `many`: Whether it takes several, parted by `, `, the people of `With` by `; `.
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
 * Without a field `title` it writes its own name as `SUMMARY`, as an old entry `Sleep` still has.
 */
export type Category = {
    name: string;
    fields: Field[];
};

/**
 * A {@link Field} as the page gets it, each part empty for a field it does not fit.
 * - `rooms`: In the order of `Rooms.md`, offered only as I search.
 * - `places`: My places and rooms by their line.
 * - `links`: For `With` the address of each name.
 * - `params`: For a summary the params each value had before.
 * - `platforms`: For `Online` my platforms by name.
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
 * My neck routine with its steps, no longer offered as a what of `Body`, still counted by the trackers.
 * Strengthening of neck and shoulders, chosen by research (`.claude/studies/science.md`, point 16).
 * `Neck short`, since 2 minutes a day with a band eased neck pain as much as 12.
 * `Neck long`, the load rising from about 12 repetitions toward 8 (Gross 2015).
 * Regularity is the dose, so the trackers count the sessions of seven days.
 * It helped after 10 to 20 weeks, not yet after 4, so it is judged after 10 to 12 weeks.
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

/** A category with `Summary`, `Place`, `Online` and `With`, its summary offering only what the log holds. */
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

/** Category of skill entries, a skill and a type or none in the `ALTREP` of its `SUMMARY`. */
export { skillName };

/**
 * Types of a skill entry, in round brackets after its skill in its `SUMMARY`.
 * Only fixed forms I take part in, `VO` lecture, `UE` exercise, `ZU` central exercise, `TU` tutorial,
 * `HU` homework sheet, `FA` exam and `PR` practical course.
 * My own learning has no type, as a project.
 */
export const skillTypes: string[] = ["VO", "UE", "ZU", "TU", "HU", "FA", "PR"];

/** `X-SEMESTER` of a skill entry, the year it begins in, `W` October to March, `S` April to September. */
const semesterForm: RegExp = /^\d{4}[WS]$/;

/** The whats `Sleep` offers first, `Day` a nap, which never counts as a night. */
const sleepWhats: string[] = ["Night", "Day"];

/** The only whats of `Way`, my means of transport, several since I change on a way. */
const transports: string[] = ["Walk", "Bike", "Bus", "Tram", "U-Bahn", "S-Bahn", "Train", "Car"];

/** Categories the dialog leaves out, `Drink` only the counter of water writes. */
const hiddenNames: string[] = ["Drink"];

/** Whats a category no longer offers, also where the log holds them. */
const retiredWhats: { [category: string]: string[] } = {
    Body: Object.keys(neckRoutines),
};

/** Categories with their fields, in the order of their importance for my life. */
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

/** The semester of a day, January to March in the winter that began the year before. */
export function semesterOf(day: string): string {
    const [year, month]: number[] = day.split("-").map(Number);
    if (month >= 10) return `${year}W`;
    if (month <= 3) return `${year - 1}W`;
    return `${year}S`;
}

/**
 * The `X-SEMESTER` of an entry, so every skill entry carries one, sent or that of its day.
 * None for any other entry.
 *
 * @throws {Error} - When the semester of a skill entry is not written like `2026W`
 */
export function semesterFor(category: string, semester: string, day: string): string {
    if (category !== skillName) return "";
    if (semester !== "" && !semesterForm.test(semester)) throw new Error(`No semester ${semester}`);
    return semester === "" ? semesterOf(day) : semester;
}

/** Reads the timed log entries up to an instant. */
function logsRead(now: string): Entry[] {
    return entriesRead(day.log, "1970-01-01T00:00:00Z", now).filter((log: Entry): boolean => !log.allDay);
}

/**
 * Lists the places and starts of ways of log entries by their names, as often as used.
 * By name, so a line with its address and an older one of the name alone count alike.
 */
function placeUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => [labelOf(log.location), labelOf(log.from)]);
}

/** Lists the platforms of log entries, as often as used. */
function onlineUsesOf(logs: Entry[]): string[] {
    return logs.map((log: Entry): string => log.online);
}

/** Lists the whats of a category in log entries, each of several on its own, as often as used. */
function titleUsesOf(logs: Entry[], name: string, many: boolean): string[] {
    return logs
        .filter((log: Entry): boolean => log.category === name)
        .flatMap((log: Entry): string[] => (many ? log.title.split(", ") : [log.title]));
}

/** The params in round brackets each what had in log entries, the most used first. */
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

/** Lists the people of log entries by their names, as often as used. */
function peopleUsesOf(logs: Entry[]): string[] {
    return logs.flatMap((log: Entry): string[] => log.attendees.map((attendee: Attendee): string => attendee.name));
}

/** The address of each person as the last entry with them wrote it, so a name picked again takes it. */
function addressesOf(logs: Entry[]): { [name: string]: string } {
    return Object.fromEntries(
        [...logs]
            .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
            .flatMap((log: Entry): [string, string][] =>
                log.attendees.map((attendee: Attendee): [string, string] => [attendee.name, attendee.address]),
            ),
    );
}

/** Orders values, each once and none empty, the most used first, equal ones alphabetical. */
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

/** The steps of each value, the note of its last log entry after them. */
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
 * Reads the categories the dialog shows with the values of their fields.
 * A fixed field only those of the code, in their order, and no retired what.
 * - `places`: One list for every field of a place, each as the line an entry writes.
 * - `rooms`: None of the name of one of my places.
 * - `people`: Those I share with offered before any use.
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
 * Where I was last before an instant, the line of the last entry at one of my places.
 * A way's place is its goal, and a place I changed by hand counts as a way there.
 * A room counts as none, so after a lecture I am where I was before it.
 */
export function lastPlaceRead(before: string): string {
    const names: string[] = placesRead().map((place: Place): string => place.name);
    const last: Entry | undefined = logsRead(before)
        .filter((log: Entry): boolean => names.includes(labelOf(log.location)))
        .sort((first: Entry, second: Entry): number => second.start.localeCompare(first.start))[0];
    return last?.location ?? "";
}

/** Whether each person has a name without `;` and spaces around, and an address without spaces and commas. */
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
 * Whether the fields of an entry fit its category, the people well formed.
 * The what is never empty, one of the values of a fixed field, without a field `title` the category.
 * `from` only where the category has it, module and type empty.
 * `Skill` has a skill and one of the {@link skillTypes} or none, its title free.
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
