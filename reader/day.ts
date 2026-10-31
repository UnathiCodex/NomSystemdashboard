/**
 * ## Day
 *
 * Reads the log of a day, my one calendar,
 * and adds, changes and removes its entries, by category, see `categories.ts`;
 * the plan of the day is a list of boxes beside it, see `boxes.ts`.
 * Writes into the logs of the new system, see `sources.ts`:
 * a skill entry into the log of its skill,
 * like `Modules/IN2028_BusinessAnalyticsMachineLearning_Log.ics`,
 * any other into the log of its topic in the year of its start in Berlin time,
 * like `Health/Sleep_2026_Log.ics`, see `topicFileOf` in `sources.ts`;
 * an entry whose start moves into another year,
 * or that changes its category or its skill, moves into the log it belongs into then.
 * A skill entry names its skill and its type in its `SUMMARY`, its link one I set:
 * `CATEGORIES:Skill`,
 * `SUMMARY;ALTREP="NomSkillingmodules/IN2028_…/VO_UniversityLectureLessons":IN2028_BusinessAnalyticsMachineLearning (VO)`,
 * also one logged from a box, which takes its title, see `titleOf` in `documents.ts`;
 * its chapters, documents and rounds only `skill.ts` writes.
 * A change from the dialog is written only while the file holds the entry as the dialog opened it,
 * see {@link entryEdit}, and a drag writes only the new start and end, see {@link entryMove},
 * so no page writes back what the file held before, like a food renamed in every entry since.
 *
 * A box of the plan goes into the log at its real time,
 * dragged there or logged as expected with one tap, see {@link boxLog}:
 * the log entry points to it with the standard `RELATED-TO:<UID of the box>`,
 * for one date of a series with that date,
 * like `RELATED-TO;X-RECURRENCE-ID=20261026T130000Z:<UID>`,
 * see `relatedOf` in `calendar.ts`, written once when the log entry is added,
 * also when a box is logged through the dialog,
 * so the box shows as done, with expected and real time, and offers no second log;
 * removing the log entry opens the box again, and so does one click on the check of the done box,
 * see {@link boxUndo}. An older log entry points to its box with `X-PLANNED:<UID of the box>`,
 * which is still read. A tutorial logged moves no other week.
 *
 * The dialog of a new box takes the median of how long the last entries like it really lasted
 * as its length, see {@link realMinutesRead}.
 * The search of the log reads every entry of it, see {@link logAllRead}.
 * The timer of the day reads the entry running now, see {@link entryNowRead}.
 *
 * A meal of the log lists its foods as lines `X-FOOD`,
 * like `X-FOOD:Skyr natur;K-Classic;Kaufland;150`: appended with the entry,
 * and replaced as a whole when the entry changes, each meal of mine by its grams, the most first,
 * see `foodsRanked` in `food.ts`; the reader counts what each meal gives, see `food.ts`.
 * A cooking, `Cook`, lists what went into the pot the same way,
 * like `X-FOOD:Hackfleisch;Gut & Günstig;Edeka;500`, which counts nothing;
 * a meal drawn from it holds `X-COOKED:<UID of the Cook entry>`
 * and the foods it ate with their grams, so each keeps its foods in its own lines,
 * which follow every change of the cooking, see {@link cookedShare};
 * a link only ever points back in time, see {@link cookedCheck}.
 * A session of sport, `Sport`, holds what I did as its own lines,
 * its exercises `X-EXERCISE` and its videos `X-VIDEO`, each with its workout, see `sport.ts`:
 * appended with the entry, and each kind replaced as a whole when the entry changes it;
 * the `X-WORKOUT` of a session written before goes once the entry changes.
 *
 * - `./boxes.ts`: Finds a box of the plan, an open one, and marks a box done or open again.
 * - `./calendar.ts`: Reads `.ics` files into entries, appends, changes and removes their events.
 * - `./categories.ts`: Tells whether the fields of an entry fit its category,
 *   and names the category of skill entries.
 * - `./documents.ts`: Writes what a skill entry was, linking the folder of its skill,
 *   gives its chapters, and the log an entry belongs into.
 * - `./food.ts`: Tells what meals give and whether a line `X-FOOD` is well formed.
 * - `./sport.ts`: Tells whether the lines of a session of sport are well formed.
 * - `./sources.ts`: Names every folder and file the reader reads.
 * - `./trackers.ts`: Tells whether an entry is a glass of water.
 */

import { boxDone, boxFind, boxOpenFind, boxRename, boxReopen } from "./boxes.ts";
import {
    berlinDateOf,
    entriesOnceRead,
    entriesRead,
    entryAppend,
    entryChange,
    entryFind,
    entryLookup,
    entryRemove,
    propertiesPut,
    sportIcsOf,
} from "./calendar.ts";
import { attendeesAllow, categoryAllows, semesterFor, skillName } from "./categories.ts";
import { calendarFileOf, chaptersOf, documentLinksOf, titleOf } from "./documents.ts";
import { foodLineAllows, foodName, foodsRanked, mealsOf, mealTitleOf } from "./food.ts";
import { onlineFor, placeLinkOf } from "./places.ts";
import { sportPartsAllow } from "./sport.ts";
import { day, logEnding } from "./sources.ts";
import { glassIs } from "./trackers.ts";

import type { Box } from "./boxes.ts";
import type { Attendee, Entry, EntryFields, Link, Online } from "./calendar.ts";
import type { Meal } from "./food.ts";

/**
 * A new entry of the log, as the entry by category sends it; an empty field is not written.
 *
 * - `category`: Category picked.
 * - `title`: What picked.
 * - `titleLink`: Link of what it was, like the page of an event, typed, empty for none;
 *   left out, it keeps the one of the entry or box it comes from, see `titleOf` in `documents.ts`.
 * - `location`: Place picked, where I physically was, its link the reader finds itself,
 *   see `placeLinkOf` in `places.ts`.
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`:
 *   What I did online, its platform picked,
 *   the link of its meeting or video, its channel and its title as typed,
 *   see `Online` in `calendar.ts`;
 *   left out by a sender that does not know them, like a drag, see {@link entryMove},
 *   so a changed entry keeps them and one logged from a box takes those of the box.
 * - `from`: Where a way starts.
 * - `attendees`: Who I was with, one `ATTENDEE` each, see `Attendee` in `calendar.ts`;
 *   left out by a sender that does not know it, like a drag,
 *   so a changed entry keeps its people and one logged from a box takes those of the box.
 * - `module`: Module of a skill entry, like `IN2028`, empty for any other entry.
 * - `type`: Type of a skill entry, like `VO`, empty for any other entry.
 * - `semester`: Semester of a skill entry, like `2026W`, the semester of its day when empty,
 *   see `semesterFor` in `categories.ts`; empty for any other entry.
 * - `note`: Free note.
 * - `foods`: Foods of a meal or a cooking, its lines `X-FOOD` like `Reis;Golden Sun;Lidl;150`,
 *   none for any other entry.
 * - `planned`: Identifier of the box a new log entry is logged from,
 *   see `entryIdOf` in `calendar.ts`, written as its `RELATED-TO`, empty for none;
 *   written only when the entry is added.
 * - `pain`: My neck pain from 0 to 10 after `Neck long`, its `X-PAIN`, like `5`, empty for none;
 *   left out by a sender that does not know it, like a drag, so it stays as it is.
 * - `cooked`: For a meal drawn from a cooking, its `X-COOKED`,
 *   the identifier of the cooking, empty for none;
 *   left out by a sender that does not know it, so it stays as it is, see {@link cookedCheck}.
 * - `workout`: For a session of sport, the workout it did, its `X-WORKOUT`,
 *   like `Push`, empty for none.
 * - `exercises`: For a session of sport, its exercises,
 *   its lines `X-EXERCISE` like `Bench press;3;10;40`.
 * - `videos`: For a session of sport, its videos,
 *   its lines `X-VIDEO` like `Pilates;Lidia Mera;25;https://…`.
 *   The three left out by a sender that does not know them, like the calendar after a drag,
 *   so they stay as they are, see {@link sportCheck}.
 * - `start`: Start as ISO instant.
 * - `end`: End as ISO instant, after the start.
 */
export type EntryNew = Partial<Online> & {
    category: string;
    title: string;
    titleLink?: string;
    location: string;
    from: string;
    attendees?: Attendee[];
    module: string;
    type: string;
    semester: string;
    note: string;
    foods: string[];
    planned: string;
    pain?: string;
    cooked?: string;
    workout?: string;
    exercises?: string[];
    videos?: string[];
    start: string;
    end: string;
};

/**
 * A changed entry, as the dialog sends it after editing:
 * an {@link EntryNew} with the identifier `id` of the entry and `version`,
 * its fingerprint as the dialog opened it, see `version` of `Entry` in `calendar.ts`,
 * so the reader writes nothing older than the file, see {@link entryEdit}.
 */
export type EntryChange = EntryNew & { id: string; version: string };

/**
 * An entry moved or resized, as the calendar sends it after a drag:
 * its new times alone, every other field staying as its file holds it, see {@link entryMove}.
 *
 * - `id`: Identifier of the entry.
 * - `start`: New start as ISO instant.
 * - `end`: New end as ISO instant, after the start.
 */
export type EntryMoved = {
    id: string;
    start: string;
    end: string;
};

/**
 * A box logged at its real time,
 * as the day sends it after a drop into the log or a tap on `Log` in its menu.
 *
 * - `box`: Identifier of the box.
 * - `start`: Real start as ISO instant.
 * - `end`: Real end as ISO instant, after the start.
 */
export type BoxLogged = {
    box: string;
    start: string;
    end: string;
};

/**
 * An entry as the day gets it:
 * an {@link Entry}, with the chapters of a skill entry, what a meal gives,
 * and whether it is a glass of water.
 *
 * - `chapters`: Chapters a skill entry covered,
 *   from the folders it links and from older `X-CHAPTER`s, see `chaptersOf` in `documents.ts`;
 *   none for any other entry.
 * - `kcal`: kcal of a meal that lists foods, see `food.ts`; `null` for any other entry.
 *   The day hides them on its entries for now; its dialog and its trackers show them.
 * - `estimate`: Whether those kcal hold grams guessed, marked by `~`, see `food.ts`.
 * - `glass`: Whether the entry is a glass of water,
 *   which the counter of the day shows instead of the time grid, see `trackers.ts`.
 */
export type DayEntry = Entry & {
    kcal: number | null;
    estimate: boolean;
    glass: boolean;
};

/**
 * Number of the last entries like a box whose real minutes its dialog takes,
 * see {@link realMinutesRead}.
 */
const realCount: number = 3;

/**
 * Category of cooking, which lists what went into the pot like a meal, but counts no kcal.
 */
const cookName: string = "Cook";

/**
 * Gives the log an entry belongs into, see the top of this file:
 * the log of its skill for a skill entry,
 * else the log of its topic in the year of its start in Berlin time,
 * see `calendarFileOf` in `documents.ts`.
 *
 * @param fields - Category, skill and start of the entry,
 *   like `Skill`, `IN2028` and 2026-10-13 10:00
 * @returns Path like `Modules/IN2028_BusinessAnalyticsMachineLearning_Log.ics`
 *   or `Health/Sleep_2026_Log.ics` in `NomManagecalendar`
 */
export function logFileOf(fields: {
    category: string;
    module: string;
    start: Date;
}): string {
    return calendarFileOf(fields, berlinDateOf(fields.start), logEnding);
}

/**
 * Turns an entry as the page sends it into the fields to write:
 * its place with the link the reader finds,
 * see `placeLinkOf` in `places.ts`, what it did online and who I was with as sent,
 * else as the box or the entry being changed has them, see `onlineFor` there,
 * and what it was as the reader writes it, see `titleOf` in `documents.ts`.
 * - `semester`: Semester of a skill entry as it is written,
 *   see `semesterFor` in `categories.ts`, empty for any other.
 * - `title`, `titleLink`: What it was, its `SUMMARY`, and the link of it.
 *
 * @param entry - New or changed entry, with ISO instants
 * @param from - The box it is logged from or the entry being changed, `null` for none
 * @returns Fields and times
 * @throws {Error} - When the link typed online is no web address
 */
function fieldsOf(
    entry: EntryNew,
    from:
        | (Online & {
              category: string;
              title: string;
              titleLink: string;
              module: string;
              type: string;
              location: string;
              locationLink: string;
              attendees: Attendee[];
          })
        | null,
): EntryFields {
    const semester: string = semesterFor(
        entry.category,
        entry.semester,
        berlinDateOf(new Date(entry.start)),
    );
    const [title, titleLink]: [string, string] = titleOf(
        { ...entry, semester: semester },
        from,
    );
    return {
        category: entry.category,
        title: title,
        titleLink: titleLink,
        location: entry.location,
        locationLink: placeLinkOf(entry.location, from),
        ...onlineFor(entry, from),
        from: entry.from,
        attendees: entry.attendees ?? from?.attendees ?? [],
        module: entry.module,
        type: entry.type,
        semester: semester,
        note: entry.note,
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
}

/**
 * Checks fields, foods and times of an entry of the log before they are written.
 * An entry has to fit its category, see {@link categoryAllows}, or keep what it was,
 * or what the box it is logged from was:
 * the same category and title, for a skill entry the same skill and type, with well-formed people,
 * see `attendeesAllow` in `categories.ts`, like an entry written before
 * its category got its rules, dragged to another time, or an older skill box `IN2028 DEV` of a type
 * no longer offered.
 * Only a meal lists foods, each line well formed, see {@link foodLineAllows}.
 * - `kept`: Whether the entry keeps what the entry being changed or its box was.
 *
 * @param fields - Fields and times to write
 * @param foods - Lines `X-FOOD` to write, none for an entry that is no meal
 * @param old - Entry being changed, or the box a new entry is logged from, `null` for none
 * @throws {Error} - When the fields or foods are not allowed or the end is not after the start
 */
function fieldsCheck(
    fields: EntryFields,
    foods: string[],
    old: Entry | Box | null,
): void {
    const kept: boolean =
        old !== null &&
        old.title !== "" &&
        fields.category === old.category &&
        (fields.category === skillName
            ? fields.module === old.module && fields.type === old.type
            : fields.title === old.title) &&
        attendeesAllow(fields.attendees);
    if (!(kept || categoryAllows(fields)))
        throw new Error(`No log entry ${fields.category} ${fields.title}`);
    if (
        foods.length > 0 &&
        !([foodName, cookName].includes(fields.category) && foods.every(foodLineAllows))
    )
        throw new Error(`No foods ${foods.join(", ")} for ${fields.title}`);
    if (!(fields.start < fields.end))
        throw new Error(`${fields.title} needs an end after its start`);
}

/**
 * Reads the entries of the log that overlap a range, each meal with its kcal
 * and each glass of water marked, see {@link DayEntry}.
 * - `entries`: Entries of the range.
 * - `meals`: What the meals among them give, by their identifiers.
 *
 * @param start - Start of the range with offset, like `2026-07-03T00:00:00+02:00`
 * @param end - End of the range, excluded, in the same form
 * @returns {@link DayEntry}s overlapping the range
 */
export function dayEntriesRead(start: string, end: string): DayEntry[] {
    const entries: Entry[] = entriesRead(day.log, start, end);
    const meals: Map<string, Meal> = mealsOf(entries);
    return entries.map((entry: Entry): DayEntry => ({
        ...entry,
        chapters: chaptersOf(entry),
        kcal: meals.get(entry.id)?.kcal ?? null,
        estimate: meals.get(entry.id)?.estimate ?? false,
        glass: glassIs(entry),
    }));
}

/**
 * Reads the entry of the log running now, for the timer of the day, see `src/timer.ts`:
 * of every category, as the log shows it, so no glass of water and nothing of a whole day;
 * of several running at once the one begun last, like a meal during a session of learning,
 * and the session again once the meal is over.
 * - `now`: The moment, in milliseconds.
 *
 * @returns The entry, `null` while none runs
 */
export function entryNowRead(): Entry | null {
    const now: number = Date.now();
    return (
        entriesRead(day.log, new Date(now).toISOString(), new Date(now + 1).toISOString())
            .filter(
                (entry: Entry): boolean =>
                    !entry.allDay &&
                    !glassIs(entry) &&
                    Date.parse(entry.start) <= now &&
                    now < Date.parse(entry.end),
            )
            .sort(
                (first: Entry, second: Entry): number =>
                    Date.parse(first.start) - Date.parse(second.start),
            )
            .at(-1) ?? null
    );
}

/**
 * Reads every entry of the log, of every log file the reader reads, for the search of the log,
 * newest first, see `search.ts` in `src/day`: the entries that can be changed,
 * since a click on a result opens its dialog;
 * a glass of water is no entry of its own but a mark of the trackers, so it is left out.
 *
 * @returns {@link Entry}s, the latest start first
 */
export function logAllRead(): Entry[] {
    return entriesOnceRead(day.log)
        .filter(
            (entry: Entry): boolean => entry.editable && !entry.todo && !glassIs(entry),
        )
        .sort((one: Entry, other: Entry): number => other.start.localeCompare(one.start));
}

/**
 * Checks what a session of sport did as the dialog sends it, see `sportPartsAllow` in `sport.ts`.
 *
 * @param category - Category of the entry, like `Sport`
 * @param workout - Its workout, empty for none
 * @param exercises - Its lines `X-EXERCISE`
 * @param videos - Its lines `X-VIDEO`
 * @throws {Error} - When the entry is no session of sport or a line is not well formed
 */
function sportCheck(
    category: string,
    workout: string,
    exercises: string[],
    videos: string[],
): void {
    if (!sportPartsAllow(category, workout, exercises, videos))
        throw new Error(
            `No session ${JSON.stringify({ workout, exercises, videos })} for ${category}`,
        );
}

/**
 * Checks my neck pain as the dialog sends it: a whole number from 0 to 10, or empty for none.
 *
 * @param pain - Pain, like `5`
 * @throws {Error} - When it is anything else
 */
function painCheck(pain: string): void {
    if (!/^(?:\d|10)?$/.test(pain)) throw new Error(`No pain from 0 to 10: ${pain}`);
}

/**
 * Checks the cooking a meal draws from, as the dialog sends it:
 * empty for none, else the identifier of an entry `Cook` of the log that starts before the meal;
 * only a meal draws, and a link only ever points back in time,
 * so every day stays as it was once I close it.
 * A meal keeps the cooking it drew from also once that cooking is removed from the log,
 * so it can still be changed and moved, its foods in its own lines, see {@link cookedShare}.
 * - `cooking`: The entry of the cooking, `undefined` when the log holds none.
 *
 * @param category - Category of the entry, like `Food`
 * @param start - Start of the entry
 * @param cooked - Identifier of the cooking, empty for none
 * @param kept - Identifier of the cooking the entry being changed draws from already,
 *   empty for none and for a new entry
 * @throws {Error} - When an entry other than a meal draws,
 *   or the cooking is no entry `Cook` of the log that starts before the meal, but for the one kept
 */
function cookedCheck(
    category: string,
    start: Date,
    cooked: string,
    kept: string = "",
): void {
    if (cooked === "") return;
    if (category !== foodName)
        throw new Error(`Only a meal draws from a cooking: ${category}`);
    const cooking: Entry | undefined = entryLookup(day.log, cooked)?.[1];
    if (cooking === undefined && cooked === kept) return;
    if (
        cooking === undefined ||
        cooking.category !== cookName ||
        Date.parse(cooking.start) >= start.getTime()
    )
        throw new Error(`No cooking before the meal: ${cooked}`);
}

/**
 * Carries a cooking into the meals that draw from it, whatever their time,
 * so each eats its part of the pot by itself and follows every change of the cooking:
 * a food of the pot new to a meal,
 * or whose grams in the pot changed, gets the grams of the pot divided by how many meals draw,
 * halves for two, thirds for three, to one decimal,
 * like 250 of 500 g, a `~` of grams guessed kept, in the meal of the pot;
 * every other food keeps the grams the meal gave it,
 * like 25 g of pesto typed over the 50 of the pot, since I type what I ate.
 * A food the cooking took in since a meal drew comes into the meal, also under a meal it renamed,
 * one it took out leaves it, and one I took out of a meal stays out.
 * Foods a meal ate beside the pot keep their lines,
 * after the foods of the pot of the same meal of mine,
 * unless the pot now holds the same food in the same meal;
 * the lines ordered as those of every entry, see `foodsRanked` in `food.ts`,
 * and a meal whose lines change gets its summary anew, see `mealTitleOf` in `food.ts`.
 * Called after a meal drawing from it is added, changed or removed,
 * and after the cooking itself changes, its foods, grams or time, so every meal stays right.
 * - `found`: The cooking with its file, `undefined` when it is gone.
 * - `keyOf`: Key of a line by its food and meal, in small letters.
 * - `drawn`: Keys of the lines of the pot as it was when the meals drew.
 * - `drawnGrams`: Grams of each line of the pot as it was when the meals drew, by its key.
 * - `potKeys`: Keys of the lines of the pot as it is.
 * - `eaters`: The meals drawing from it.
 * - `had`: The lines of a meal that came from the pot as it was, by their keys.
 * - `lines`: Its lines from the pot as it is, then those it ate beside.
 * - `foods`: Its lines in their order.
 *
 * @param cooked - Identifier of the cooking, empty for none
 * @param before - Lines `X-FOOD` of the cooking before it changed,
 *   `undefined` while it is as the meals drew it
 */
function cookedShare(cooked: string, before?: string[]): void {
    const found: [string, Entry] | undefined =
        cooked === "" ? undefined : entryLookup(day.log, cooked);
    if (found === undefined) return;
    const keyOf: (line: string) => string = (line: string): string => {
        const parts: string[] = line.split(";");
        return [parts[0], parts[1] ?? "", parts[2] ?? "", parts[4] ?? ""]
            .join(";")
            .toLowerCase();
    };
    const drawn: Set<string> = new Set((before ?? found[1].foods).map(keyOf));
    const drawnGrams: Map<string, string> = new Map(
        (before ?? found[1].foods).map((line: string): [string, string] => [
            keyOf(line),
            line.split(";")[3] ?? "",
        ]),
    );
    const potKeys: Set<string> = new Set(found[1].foods.map(keyOf));
    const eaters: Entry[] = entriesRead(
        day.log,
        "1970-01-01T00:00:00Z",
        "9999-12-31T00:00:00Z",
    ).filter(
        (entry: Entry): boolean => entry.category === foodName && entry.cooked === cooked,
    );
    eaters.forEach((entry: Entry): void => {
        const had: Map<string, string> = new Map(
            entry.foods
                .filter((line: string): boolean => drawn.has(keyOf(line)))
                .map((line: string): [string, string] => [keyOf(line), line]),
        );
        const lines: string[] = [
            ...found[1].foods
                .filter(
                    (line: string): boolean =>
                        had.has(keyOf(line)) || !drawn.has(keyOf(line)),
                )
                .map((line: string): string => {
                    const parts: string[] = line.split(";");
                    const grams: RegExpExecArray | null = /^(~?)\s*(\d+(?:\.\d+)?)$/.exec(
                        (parts[3] ?? "").trim(),
                    );
                    if (
                        grams === null ||
                        (had.has(keyOf(line)) && drawnGrams.get(keyOf(line)) === parts[3])
                    )
                        return had.get(keyOf(line)) ?? line;
                    parts[3] = `${grams[1]}${Math.round((Number(grams[2]) / eaters.length) * 10) / 10}`;
                    return parts.join(";");
                }),
            ...entry.foods.filter(
                (line: string): boolean =>
                    !drawn.has(keyOf(line)) && !potKeys.has(keyOf(line)),
            ),
        ];
        const foods: string[] = foodsRanked(lines);
        const file: string | undefined = entryLookup(day.log, entry.id)?.[0];
        if (file !== undefined && foods.join("\n") !== entry.foods.join("\n"))
            propertiesPut(file, entry.id, [
                ["x-food", foods],
                ["summary", [mealTitleOf(foods)]],
            ]);
    });
}

/**
 * Reads how long the last entries of the log like a box really lasted, the latest first,
 * so I anchor the expected minutes of a box on what really happened, not on a hope,
 * since plans run long (Buehler 1994):
 * the last three entries up to now with the same category and the same what,
 * or for `Skill` the same module and type, like `150, 165, 140` for `IN2028 VO`,
 * or for `IN2028` without type.
 * - `now`: The moment.
 * - `like`: Whether an entry is like the box.
 *
 * @param category - Category of the box, like `Skill`
 * @param title - What of the box, like `Neck long`, ignored for `Skill`
 * @param module - Module of a skill box, like `IN2028`
 * @param type - Type of a skill box, like `VO`, empty for none
 * @returns Minutes of each, the latest first, none for none
 */
export function realMinutesRead(
    category: string,
    title: string,
    module: string,
    type: string,
): number[] {
    const now: Date = new Date();
    const like: (entry: Entry) => boolean = (entry: Entry): boolean =>
        entry.category === category &&
        !entry.allDay &&
        (category === skillName
            ? entry.module === module && entry.type === type
            : entry.title === title);
    return entriesRead(day.log, "1970-01-01T00:00:00Z", now.toISOString())
        .filter(
            (entry: Entry): boolean =>
                like(entry) && Date.parse(entry.end) <= now.getTime(),
        )
        .sort((first: Entry, second: Entry): number =>
            second.start.localeCompare(first.start),
        )
        .slice(0, realCount)
        .map((entry: Entry): number =>
            Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000),
        );
}

/**
 * Adds an entry to the log, into the log it belongs into,
 * see {@link logFileOf}, a meal with one line `X-FOOD` per food, see {@link fieldsCheck};
 * an entry logged from a box with its `RELATED-TO`, after which the box is done,
 * see `boxDone` in `boxes.ts`;
 * a long neck session with my pain as `X-PAIN`, see {@link painCheck};
 * a meal drawn from a cooking with its `X-COOKED`, see {@link cookedCheck};
 * a session of sport with its workout, exercises and videos, see {@link sportCheck}.
 * - `pain`: My pain, empty for none.
 * - `cooked`: Identifier of the cooking a meal draws from, empty for none.
 * - `workout`, `exercises`, `videos`:
 *   What a session of sport did, empty and none for any other entry.
 * - `own`: Properties of my own beyond the fields:
 *   the foods, the box, the pain, the cooking and what a session did.
 * - `added`: Identifier of the new entry.
 *
 * @param entry - Entry as the entry by category or the counter of glasses sends it
 * @param id - Identifier of the new entry, a new one when left out;
 *   the one an entry brought from Vu's log, see `shared.ts`
 * @returns Identifier of the new entry
 * @throws {Error} - When the fields or foods are not allowed,
 *   the link typed online is no web address, the end is not after the start,
 *   or the box it is logged from is not open
 */
export function entryAdd(entry: EntryNew, id?: string): string {
    const plan: Box | null = entry.planned === "" ? null : boxOpenFind(entry.planned);
    const fields: EntryFields = fieldsOf(entry, plan);
    fieldsCheck(fields, entry.foods, plan);

    const pain: string = entry.pain ?? "";
    painCheck(pain);
    const cooked: string = entry.cooked ?? "";
    cookedCheck(fields.category, fields.start, cooked);
    const workout: string = (entry.workout ?? "").trim();
    const exercises: string[] = entry.exercises ?? [];
    const videos: string[] = entry.videos ?? [];
    sportCheck(fields.category, workout, exercises, videos);
    const own: [string, string | Link][] = foodsRanked(entry.foods).map(
        (food: string): [string, string] => ["x-food", food],
    );
    if (entry.planned !== "") own.push(["related-to", entry.planned]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    if (pain !== "") own.push(["x-pain", pain]);
    if (cooked !== "") own.push(["x-cooked", cooked]);
    if (workout !== "") own.push(["x-workout", workout]);
    own.push(
        ...exercises.map((line: string): [string, string] => [
            "x-exercise",
            sportIcsOf(line, false),
        ]),
        ...videos.map((line: string): [string, string] => [
            "x-video",
            sportIcsOf(line, true),
        ]),
    );
    const added: string = entryAppend(logFileOf(fields), fields, own, id);
    if (entry.planned !== "") boxDone(entry.planned);
    cookedShare(cooked);
    return added;
}

/**
 * Logs a box at its real time, with one drop or one tap:
 * a log entry of its category, what, place, people, and a skill entry
 * with its skill and type, written as the reader writes them,
 * see `titleOf` in `documents.ts`, linking the folder of its skill and of its material,
 * or the web address I typed for the box, from the start to the end the day sends,
 * pointing to the box with `RELATED-TO`, a tutorial with the group I went to as its `X-GROUP`,
 * like `X-GROUP:23`, so the log shows it as the plan does, after which the box is done,
 * see `boxDone` in `boxes.ts`.
 * Its note stays empty, since the note of a log entry is my diary note about what happened;
 * a skill box hands on its links to documents, like the slides of a lecture, see `documents.ts`,
 * and its chapters as `X-CHAPTER`s, also those whose folders an older box links;
 * more chapters and documents a skill entry gets later in the dialog.
 * - `box`: The box.
 * - `skill`: Whether it is a skill box, whose links go along.
 * - `semester`: Semester of a skill entry as it is written,
 *   see `semesterFor` in `categories.ts`, empty for any other.
 * - `title`, `titleLink`: What it was, its `SUMMARY`, and the link of it.
 * - `fields`: Fields and times of the log entry.
 * - `id`: Identifier of the new log entry.
 *
 * @param logged - The box with its real start and end
 * @returns Identifier of the new log entry
 * @throws {Error} - When there is no such box, it is not open or has no category,
 *   or the times are not right
 */
export function boxLog(logged: BoxLogged): string {
    const box: Box = boxOpenFind(logged.box);
    if (box.category === "")
        throw new Error(`${box.title} has no category; the dialog logs it`);

    const skill: boolean = box.category === skillName;
    const semester: string = semesterFor(box.category, box.semester, box.day);
    const [title, titleLink]: [string, string] = titleOf(
        { ...box, semester: semester },
        box,
    );
    const fields: EntryFields = {
        category: box.category,
        title: title,
        titleLink: titleLink,
        location: box.location,
        locationLink: box.locationLink,
        online: box.online,
        onlineLink: box.onlineLink,
        onlineChannel: box.onlineChannel,
        onlineTitle: box.onlineTitle,
        from: box.from,
        attendees: box.attendees,
        module: box.module,
        type: box.type,
        semester: semester,
        note: "",
        start: new Date(logged.start),
        end: new Date(logged.end),
    };
    fieldsCheck(fields, [], box);
    const id: string = entryAppend(logFileOf(fields), fields, [
        ["related-to", box.id],
        ...(box.group === "" ? [] : [["x-group", box.group] as [string, string]]),
        ...(skill ? documentLinksOf(box.links) : []).map((link: Link): [string, Link] => [
            "attach",
            link,
        ]),
        ...(skill ? box.chapters : []).map((chapter: string): [string, string] => [
            "x-chapter",
            chapter,
        ]),
    ]);
    boxDone(box.id);
    return id;
}

/**
 * Takes a done box back to open, with one click on its check, see the top of this file:
 * removes the log entry written from it, as if I had not logged it;
 * one that holds what I added since, rounds or a note,
 * stays in the log and only lets go of the box,
 * its `RELATED-TO` or its older `X-PLANNED` taken out.
 * A to-do done in another app, `COMPLETED` without log entry, is `NEEDS-ACTION` again.
 * - `box`: The box with its state and the times of its log entry.
 * - `logged`: The log entry pointing to it, `undefined` for none.
 * - `file`: `.ics` file of that log entry.
 *
 * @param id - Identifier of the box, like `study-13@nomsystem`
 * @throws {Error} - When there is no such box, it is not done, or it has a deadline,
 *   which only my tick decides, see `boxSubmit` in `boxes.ts`
 */
export function boxUndo(id: string): void {
    const [, , box]: [string, Entry, Box] = boxFind(id);
    if (box.state !== "done" || box.deadline !== "")
        throw new Error(`${box.title} is not done by a log entry`);
    const logged: Entry | undefined =
        box.log === null
            ? undefined
            : entriesRead(
                  day.log,
                  box.log.start,
                  new Date(Date.parse(box.log.end) + 1).toISOString(),
              ).find((entry: Entry): boolean => entry.planned === id);
    if (logged !== undefined) {
        const [file]: [string, Entry] = entryFind(day.log, logged.id);
        if (logged.rounds.length > 0 || logged.note.trim() !== "")
            propertiesPut(file, logged.id, [
                ["related-to", []],
                ["x-planned", []],
            ]);
        else entryRemove(file, logged.id);
    }
    boxReopen(id);
}

/**
 * Writes fields, foods, pain and times of an entry of the log,
 * see {@link fieldsCheck}, all of them checked before anything is written,
 * so a change refused leaves the entry as it was:
 * changed foods replace all lines `X-FOOD` of the entry first, a changed pain its `X-PAIN`,
 * a changed cooking of a meal its `X-COOKED`,
 * see {@link cookedCheck}, a changed workout,
 * exercises or videos of a session of sport their lines, see {@link sportCheck},
 * then its fields and times change.
 * The entry moves into the log it belongs into now
 * when that is another file, see {@link logFileOf}.
 * Its box takes a new summary with it, see `boxRename` in `boxes.ts`,
 * but for a meal, whose foods write its summary, what I really ate.
 *
 * @param file - `.ics` file of the entry
 * @param entry - The entry as its file holds it
 * @param change - Its fields and times as they are to be, as the dialog sends them,
 *   see {@link entryEdit}, or as a drag leaves them, see {@link entryMove}
 * @throws {Error} - When it may not be changed, the fields or foods are not allowed,
 *   the link typed online is no web address, or the end is not after the start
 */
function entryWrite(file: string, entry: Entry, change: EntryNew): void {
    if (!entry.editable) throw new Error(`${entry.title} may not be changed`);

    const fields: EntryFields = fieldsOf(change, entry);
    fieldsCheck(fields, change.foods, entry);
    painCheck(change.pain ?? "");
    cookedCheck(
        fields.category,
        fields.start,
        change.cooked ?? entry.cooked,
        entry.cooked,
    );
    const workout: string = (change.workout ?? entry.workout ?? "").trim();
    const exercises: string[] = change.exercises ?? entry.exercises ?? [];
    const videos: string[] = change.videos ?? entry.videos ?? [];
    sportCheck(fields.category, workout, exercises, videos);
    const foods: string[] = foodsRanked(change.foods);
    if (foods.join("\n") !== entry.foods.join("\n"))
        propertiesPut(file, entry.id, [["x-food", foods]]);
    if (change.pain !== undefined && change.pain !== entry.pain)
        propertiesPut(file, entry.id, [
            ["x-pain", change.pain === "" ? [] : [change.pain]],
        ]);
    if (change.cooked !== undefined && change.cooked !== entry.cooked)
        propertiesPut(file, entry.id, [
            ["x-cooked", change.cooked === "" ? [] : [change.cooked]],
        ]);
    if (workout !== (entry.workout ?? ""))
        propertiesPut(file, entry.id, [["x-workout", workout === "" ? [] : [workout]]]);
    if (exercises.join("\n") !== (entry.exercises ?? []).join("\n"))
        propertiesPut(file, entry.id, [
            [
                "x-exercise",
                exercises.map((line: string): string => sportIcsOf(line, false)),
            ],
        ]);
    if (videos.join("\n") !== (entry.videos ?? []).join("\n"))
        propertiesPut(file, entry.id, [
            ["x-video", videos.map((line: string): string => sportIcsOf(line, true))],
        ]);
    entryChange(file, entry, fields, logFileOf(fields));
    if (entry.planned !== "" && foods.length === 0 && fields.title !== entry.title)
        boxRename(entry.planned, fields.title);
    cookedShare(entry.cooked);
    if (change.cooked !== undefined && change.cooked !== entry.cooked)
        cookedShare(change.cooked);
    if (fields.category === cookName) cookedShare(entry.id, entry.foods);
}

/**
 * Changes an entry of the log as the dialog sends it,
 * see {@link entryWrite}, only while its file holds it as the dialog opened it,
 * its fingerprint still the one the dialog sends, see `version` of `Entry` in `calendar.ts`:
 * after any change of it since, by another device, Claude or the reader,
 * like a food renamed in every entry while the dialog was open,
 * see `foodChange` in `food.ts`, nothing is written,
 * so a save never writes back what the file held before;
 * the first save wins, and the dialog says so, see `entrySave` in `src/day/categories.ts`;
 * a skill entry alike, see `skillEntryEdit` in `skill.ts`.
 * - `file`, `entry`: Its `.ics` file and the entry as the file holds it.
 *
 * @param change - Changed entry as the dialog sends it,
 *   with its fingerprint as the dialog opened it
 * @returns Whether it is written, `false` when its file changed it since the dialog opened it
 * @throws {Error} - When there is no such entry, it may not be changed,
 *   the fields or foods are not allowed, the link typed online is no web address,
 *   or the end is not after the start
 */
export function entryEdit(change: EntryChange): boolean {
    const [file, entry]: [string, Entry] = entryFind(day.log, change.id);
    if (entry.version !== change.version) return false;
    entryWrite(file, entry, change);
    return true;
}

/**
 * Moves an entry of the log to a new start and end,
 * as the calendar sends it after a drag, see {@link EntryMoved}:
 * every other field stays as its file holds it, its link, the link of its place,
 * what it did online, its people, its pain, its cooking
 * and the workout, exercises and videos of a session of sport left out,
 * so they stay too, see {@link EntryNew};
 * written as any change, see {@link entryWrite}, so an entry moved
 * into another year moves into the log of that year,
 * and a meal moved before the cooking it draws from is refused, see {@link cookedCheck}.
 * - `file`, `entry`: Its `.ics` file and the entry as the file holds it.
 *
 * @param moved - The entry with its new start and end
 * @throws {Error} - When there is no such entry, it may not be changed,
 *   the end is not after the start, or a meal would start before the cooking it draws from
 */
export function entryMove(moved: EntryMoved): void {
    const [file, entry]: [string, Entry] = entryFind(day.log, moved.id);
    entryWrite(file, entry, {
        category: entry.category,
        title: entry.title,
        location: entry.location,
        from: entry.from,
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: entry.note,
        foods: entry.foods,
        planned: "",
        start: moved.start,
        end: moved.end,
    });
}

/**
 * Removes an entry of the log;
 * when it was logged from a box, the box is open again, see `boxReopen` in `boxes.ts`.
 *
 * @param id - Identifier of the entry
 * @throws {Error} - When there is no such entry or it may not be removed
 */
export function entryDelete(id: string): void {
    const [file, entry]: [string, Entry] = entryFind(day.log, id);
    if (!entry.editable) throw new Error(`${entry.title} may not be removed`);

    entryRemove(file, entry.id);
    if (entry.planned !== "") boxReopen(entry.planned);
    cookedShare(entry.cooked);
}
