/**
 * ## Day
 *
 * The log of a day, my one calendar, its entries added, changed and removed by category.
 * A skill entry goes into the log of its skill,
 * any other into the log of its category in the year of its start in Berlin time.
 * An entry that changes its year, category or skill moves into the log it belongs into then.
 * A change is written only while the file holds the entry as the page opened it,
 * so no page writes back what the file held before.
 *
 * The log entry of a box points to it with `RELATED-TO:<UID of the box>`, so the box shows as done.
 * A meal lists its foods as lines `X-FOOD`, a cooking `Cook` its pot the same way.
 * A meal drawn from a cooking holds `X-COOKED:<UID of the Cook entry>`.
 */

import { boxDone, boxFind, boxOpenFind, boxReopen } from "./boxes.ts";
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
 * A new entry of the log, an empty field not written.
 *
 * - `titleLink`: Left out, it keeps the one of the entry or box it comes from.
 * - `location`: Where I physically was.
 * - `online` and the fields after it with `?`:
 *   Left out by a sender that does not know them, like a drag, so they stay as they were.
 * - `semester`: The semester of its day when empty.
 * - `planned`: The box it is logged from, written as its `RELATED-TO` only when added.
 * - `pain`: My neck pain from 0 to 10 after `Neck long`.
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
    exercises?: string[];
    start: string;
    end: string;
};

/** A changed entry with its fingerprint `version` as the dialog opened it. */
export type EntryChange = EntryNew & { id: string; version: string };

/** An entry moved or resized by a drag, its new times alone. */
export type EntryMoved = {
    id: string;
    start: string;
    end: string;
};

/**
 * A box logged at its real time.
 *
 * - `shared`: Whether its entry goes to the people I share with in its `With`.
 */
export type BoxLogged = {
    box: string;
    shared: boolean;
    start: string;
    end: string;
};

/**
 * An entry of the day with what a meal gives and whether it is a glass of water.
 *
 * - `chapters`: From the folders it links and from older `X-CHAPTER`s.
 * - `glass`: Counted by the trackers instead of shown in the time grid.
 */
export type DayEntry = Entry & {
    kcal: number | null;
    estimate: boolean;
    glass: boolean;
};

/** Number of the last entries like a box whose real minutes count. */
const realCount: number = 3;

/** Category of cooking, its pot listed like a meal but counting no kcal. */
const cookName: string = "Cook";

/** The log an entry belongs into. */
export function logFileOf(fields: { category: string; module: string; start: Date }): string {
    return calendarFileOf(fields, berlinDateOf(fields.start), logEnding);
}

/**
 * Fields to write of an entry the page sends,
 * what it left out taken from the box or entry it comes from.
 *
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
    const semester: string = semesterFor(entry.category, entry.semester, berlinDateOf(new Date(entry.start)));
    const [title, titleLink]: [string, string] = titleOf({ ...entry, semester: semester }, from);
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
 * Checks fields, foods and times of an entry before they are written.
 * An entry fits its category or keeps what it or its box was,
 * so an entry written before its category got its rules can still move.
 * Only a meal or a cooking lists foods.
 *
 * @throws {Error} - When the fields or foods are not allowed or the end is not after the start
 */
function fieldsCheck(fields: EntryFields, foods: string[], old: Entry | Box | null): void {
    const kept: boolean =
        old !== null &&
        old.title !== "" &&
        fields.category === old.category &&
        (fields.category === skillName
            ? fields.module === old.module && fields.type === old.type
            : fields.title === old.title) &&
        attendeesAllow(fields.attendees);
    if (!(kept || categoryAllows(fields))) throw new Error(`No log entry ${fields.category} ${fields.title}`);
    if (foods.length > 0 && !([foodName, cookName].includes(fields.category) && foods.every(foodLineAllows)))
        throw new Error(`No foods ${foods.join(", ")} for ${fields.title}`);
    if (!(fields.start < fields.end)) throw new Error(`${fields.title} needs an end after its start`);
}

/** Entries of the log that overlap a range. */
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
 * The entry of the log running now, no glass of water and nothing of a whole day.
 * Of several the one begun last, like a meal during a session of learning.
 */
export function entryNowRead(): Entry | null {
    const now: number = Date.now();
    return (
        entriesRead(day.log, new Date(now).toISOString(), new Date(now + 1).toISOString())
            .filter(
                (entry: Entry): boolean =>
                    !entry.allDay && !glassIs(entry) && Date.parse(entry.start) <= now && now < Date.parse(entry.end),
            )
            .sort((first: Entry, second: Entry): number => Date.parse(first.start) - Date.parse(second.start))
            .at(-1) ?? null
    );
}

/** Every entry of the log that can be changed, newest first, no glass of water. */
export function logAllRead(): Entry[] {
    return entriesOnceRead(day.log)
        .filter((entry: Entry): boolean => entry.editable && !entry.todo && !glassIs(entry))
        .sort((one: Entry, other: Entry): number => other.start.localeCompare(one.start));
}

/**
 * Checks what a session of sport did.
 *
 * @throws {Error} - When the entry is no session of sport or a line is not well formed
 */
function sportCheck(category: string, exercises: string[]): void {
    if (!sportPartsAllow(category, exercises))
        throw new Error(`No session ${JSON.stringify(exercises)} for ${category}`);
}

/** Checks my neck pain, a whole number from 0 to 10 or empty. */
function painCheck(pain: string): void {
    if (!/^(?:\d|10)?$/.test(pain)) throw new Error(`No pain from 0 to 10: ${pain}`);
}

/**
 * Checks the cooking a meal draws from, empty or an entry `Cook` that starts before the meal.
 * A link only points back in time, so every day stays as it was once I close it.
 * A meal keeps a cooking removed since, so it can still be changed and moved.
 *
 * @param kept - The cooking the entry being changed draws from already
 * @throws {Error} - When no meal draws, or from no earlier `Cook` other than the one kept
 */
function cookedCheck(category: string, start: Date, cooked: string, kept: string = ""): void {
    if (cooked === "") return;
    if (category !== foodName) throw new Error(`Only a meal draws from a cooking: ${category}`);
    const cooking: Entry | undefined = entryLookup(day.log, cooked)?.[1];
    if (cooking === undefined && cooked === kept) return;
    if (cooking === undefined || cooking.category !== cookName || Date.parse(cooking.start) >= start.getTime())
        throw new Error(`No cooking before the meal: ${cooked}`);
}

/**
 * Carries a cooking into the meals that draw from it, so each follows every change of the pot.
 * A food new to a meal or whose grams in the pot changed gets the pot grams split by the meals.
 * Every other food keeps the grams the meal gave it, since I type what I ate.
 * A food I took out of a meal stays out.
 * Foods a meal ate beside the pot stay, unless the pot now holds the same food.
 * - `drawn`, `drawnGrams`: The pot as it was when the meals drew.
 *
 * @param before - Lines `X-FOOD` of the cooking before it changed, `undefined` while unchanged
 */
function cookedShare(cooked: string, before?: string[]): void {
    const found: [string, Entry] | undefined = cooked === "" ? undefined : entryLookup(day.log, cooked);
    if (found === undefined) return;
    const keyOf: (line: string) => string = (line: string): string => {
        const parts: string[] = line.split(";");
        return [parts[0], parts[1] ?? "", parts[2] ?? "", parts[4] ?? ""].join(";").toLowerCase();
    };
    const drawn: Set<string> = new Set((before ?? found[1].foods).map(keyOf));
    const drawnGrams: Map<string, string> = new Map(
        (before ?? found[1].foods).map((line: string): [string, string] => [keyOf(line), line.split(";")[3] ?? ""]),
    );
    const potKeys: Set<string> = new Set(found[1].foods.map(keyOf));
    const eaters: Entry[] = entriesRead(day.log, "1970-01-01T00:00:00Z", "9999-12-31T00:00:00Z").filter(
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
                .filter((line: string): boolean => had.has(keyOf(line)) || !drawn.has(keyOf(line)))
                .map((line: string): string => {
                    const parts: string[] = line.split(";");
                    const grams: RegExpExecArray | null = /^(~?)\s*(\d+(?:\.\d+)?)$/.exec((parts[3] ?? "").trim());
                    if (grams === null || (had.has(keyOf(line)) && drawnGrams.get(keyOf(line)) === parts[3]))
                        return had.get(keyOf(line)) ?? line;
                    const share: number = Number(grams[2]) / eaters.length;
                    parts[3] = `${grams[1]}${Math.round(share * 10) / 10}`;
                    return parts.join(";");
                }),
            ...entry.foods.filter((line: string): boolean => !drawn.has(keyOf(line)) && !potKeys.has(keyOf(line))),
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
 * How long the last entries like a box really lasted, the latest first,
 * since plans run long (Buehler 1994).
 * Like means the same category and title, or for `Skill` the same module and type.
 */
export function realMinutesRead(category: string, title: string, module: string, type: string): number[] {
    const now: Date = new Date();
    const like: (entry: Entry) => boolean = (entry: Entry): boolean =>
        entry.category === category &&
        !entry.allDay &&
        (category === skillName ? entry.module === module && entry.type === type : entry.title === title);
    return entriesRead(day.log, "1970-01-01T00:00:00Z", now.toISOString())
        .filter((entry: Entry): boolean => like(entry) && Date.parse(entry.end) <= now.getTime())
        .sort((first: Entry, second: Entry): number => second.start.localeCompare(first.start))
        .slice(0, realCount)
        .map((entry: Entry): number => Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000));
}

/**
 * Adds an entry to the log, the box it is logged from then done.
 *
 * @param id - The one an entry brought from Vu's log, else a new one
 * @throws {Error} - When the entry is not allowed or its box is not open
 */
export function entryAdd(entry: EntryNew, id?: string): string {
    const plan: Box | null = entry.planned === "" ? null : boxOpenFind(entry.planned);
    const fields: EntryFields = fieldsOf(entry, plan);
    fieldsCheck(fields, entry.foods, plan);

    const pain: string = entry.pain ?? "";
    painCheck(pain);
    const cooked: string = entry.cooked ?? "";
    cookedCheck(fields.category, fields.start, cooked);
    const exercises: string[] = entry.exercises ?? [];
    sportCheck(fields.category, exercises);
    const own: [string, string | Link][] = foodsRanked(entry.foods).map((food: string): [string, string] => [
        "x-food",
        food,
    ]);
    if (entry.planned !== "") own.push(["related-to", entry.planned]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    if (pain !== "") own.push(["x-pain", pain]);
    if (cooked !== "") own.push(["x-cooked", cooked]);
    own.push(...exercises.map((line: string): [string, string] => ["x-exercise", sportIcsOf(line)]));
    const added: string = entryAppend(logFileOf(fields), fields, own, id);
    if (entry.planned !== "") boxDone(entry.planned);
    cookedShare(cooked);
    return added;
}

/**
 * Logs a box at its real time with what it holds, a tutorial with its `X-GROUP`.
 * Its note stays empty, since the note of a log entry is my diary note.
 * A skill box hands on its documents and chapters.
 *
 * @throws {Error} - When the box is not open or has no category, or the times are not right
 */
export function boxLog(logged: BoxLogged): string {
    const box: Box = boxOpenFind(logged.box);
    if (box.category === "") throw new Error(`${box.title} has no category; the dialog logs it`);

    const skill: boolean = box.category === skillName;
    const semester: string = semesterFor(box.category, box.semester, box.day);
    const [title, titleLink]: [string, string] = titleOf({ ...box, semester: semester }, box);
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
        ...(skill ? documentLinksOf(box.links) : []).map((link: Link): [string, Link] => ["attach", link]),
        ...(skill ? box.chapters : []).map((chapter: string): [string, string] => ["x-chapter", chapter]),
    ]);
    boxDone(box.id);
    return id;
}

/**
 * Opens a done box again and removes its log entry.
 * A log entry with rounds or a note since stays and only lets go of the box.
 * A to-do done in another app, `COMPLETED` without log entry, is `NEEDS-ACTION` again.
 *
 * @throws {Error} - When the box is not done or has a deadline, which only my tick decides
 */
export function boxUndo(id: string): void {
    const [, , box]: [string, Entry, Box] = boxFind(id);
    if (box.state !== "done" || box.deadline !== "") throw new Error(`${box.title} is not done by a log entry`);
    const logged: Entry | undefined =
        box.log === null
            ? undefined
            : entriesRead(day.log, box.log.start, new Date(Date.parse(box.log.end) + 1).toISOString()).find(
                  (entry: Entry): boolean => entry.planned === id,
              );
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
 * Writes a changed entry, all checked first, so a change refused leaves it as it was.
 * Its box keeps its summary, so the plan still shows what I planned.
 *
 * @throws {Error} - When it may not be changed or the change is not allowed
 */
function entryWrite(file: string, entry: Entry, change: EntryNew): void {
    if (!entry.editable) throw new Error(`${entry.title} may not be changed`);

    const fields: EntryFields = fieldsOf(change, entry);
    fieldsCheck(fields, change.foods, entry);
    painCheck(change.pain ?? "");
    cookedCheck(fields.category, fields.start, change.cooked ?? entry.cooked, entry.cooked);
    const exercises: string[] = change.exercises ?? entry.exercises ?? [];
    sportCheck(fields.category, exercises);
    const foods: string[] = foodsRanked(change.foods);
    if (foods.join("\n") !== entry.foods.join("\n")) propertiesPut(file, entry.id, [["x-food", foods]]);
    if (change.pain !== undefined && change.pain !== entry.pain)
        propertiesPut(file, entry.id, [["x-pain", change.pain === "" ? [] : [change.pain]]]);
    if (change.cooked !== undefined && change.cooked !== entry.cooked)
        propertiesPut(file, entry.id, [["x-cooked", change.cooked === "" ? [] : [change.cooked]]]);
    if (exercises.join("\n") !== (entry.exercises ?? []).join("\n"))
        propertiesPut(file, entry.id, [["x-exercise", exercises.map(sportIcsOf)]]);
    entryChange(file, entry, fields, logFileOf(fields));
    cookedShare(entry.cooked);
    if (change.cooked !== undefined && change.cooked !== entry.cooked) cookedShare(change.cooked);
    if (fields.category === cookName) cookedShare(entry.id, entry.foods);
}

/**
 * Changes an entry only while its file holds it as the dialog opened it,
 * so a save never writes back what another device, Claude or the reader changed since.
 *
 * @returns Whether it is written, `false` when its file changed since
 * @throws {Error} - When there is no such entry or the change is not allowed
 */
export function entryEdit(change: EntryChange): boolean {
    const [file, entry]: [string, Entry] = entryFind(day.log, change.id);
    if (entry.version !== change.version) return false;
    entryWrite(file, entry, change);
    return true;
}

/** An entry as its file holds it, so a change of one field writes every other as it was. */
function entryAsIsOf(entry: Entry): EntryNew {
    return {
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
        start: entry.start,
        end: entry.end,
    };
}

/**
 * Moves an entry to a new start and end, written as any change.
 *
 * @throws {Error} - When it may not be changed, the end is not after the start,
 *   or a meal would start before its cooking
 */
export function entryMove(moved: EntryMoved): void {
    const [file, entry]: [string, Entry] = entryFind(day.log, moved.id);
    entryWrite(file, entry, { ...entryAsIsOf(entry), start: moved.start, end: moved.end });
}

/**
 * Removes an entry of the log, its box open again.
 *
 * @throws {Error} - When there is no such entry or it may not be removed
 */
export function entryDelete(id: string): void {
    const [file, entry]: [string, Entry] = entryFind(day.log, id);
    if (!entry.editable) throw new Error(`${entry.title} may not be removed`);

    entryRemove(file, entry.id);
    if (entry.planned !== "") boxReopen(entry.planned);
    cookedShare(entry.cooked);
}
