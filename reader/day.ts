/**
 * ## Day
 *
 * Reads the log of a day, my one calendar,
 * and adds, changes and removes its entries, by category, see `categories.ts`.
 * The plan of the day is a list of boxes beside it, see `boxes.ts`.
 * A skill entry goes into the log of its skill,
 * any other into the log of its topic in the year of its start in Berlin time,
 * see `topicFileOf` in `sources.ts`.
 * An entry whose start moves into another year,
 * or that changes its category or its skill, moves into the log it belongs into then.
 * A skill entry names its skill and its type in its `SUMMARY`, its link one I set,
 * see `titleOf` in `documents.ts`.
 * Its chapters, documents and rounds only `skill.ts` writes.
 * A change from the dialog is written
 * only while the file holds the entry as the dialog opened it, see {@link entryEdit},
 * and a drag writes only the new start and end, see {@link entryMove},
 * so no page writes back what the file held before,
 * like a food renamed in every entry since.
 *
 * A box of the plan goes into the log at its real time, see {@link boxLog}.
 * The log entry points to it with the standard `RELATED-TO:<UID of the box>`,
 * see `relatedOf` in `calendar.ts`, written once when the log entry is added,
 * so the box shows as done and offers no second log.
 * Removing the log entry opens the box again, and so does a click on its check,
 * see {@link boxUndo}.
 * A tutorial logged moves no other week.
 *
 * A meal lists its foods as lines `X-FOOD`, replaced as a whole when the entry changes,
 * see `food.ts`.
 * A cooking, `Cook`, lists what went into the pot the same way, which counts nothing.
 * A meal drawn from it holds `X-COOKED:<UID of the Cook entry>`
 * and the foods it ate with their grams, see {@link cookedShare}.
 * A session of sport, `Sport`, holds its exercises `X-EXERCISE` and videos `X-VIDEO`,
 * see `sport.ts`, each kind replaced as a whole when the entry changes it.
 * The `X-WORKOUT` of a session written before goes once the entry changes.
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
 * A new entry of the log, as the entry by category sends it.
 * An empty field is not written.
 *
 * - `titleLink`: Left out, it keeps the one of the entry or box it comes from,
 *   see `titleOf` in `documents.ts`.
 * - `location`: Where I physically was, its link the reader finds itself,
 *   see `placeLinkOf` in `places.ts`.
 * - `online` and its fields, `attendees`, `pain`, `cooked`, `workout`, `exercises`,
 *   `videos`:
 *   Left out by a sender that does not know them, like a drag, see {@link entryMove},
 *   so a changed entry keeps them and one logged from a box takes those of the box.
 * - `semester`: The semester of its day when empty, see `semesterFor` in `categories.ts`.
 * - `planned`: The box a new log entry is logged from, written as its `RELATED-TO`,
 *   only when the entry is added.
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
    workout?: string;
    exercises?: string[];
    videos?: string[];
    start: string;
    end: string;
};

/**
 * A changed entry, as the dialog sends it, with its fingerprint `version`
 * as the dialog opened it, so the reader writes nothing older than the file,
 * see {@link entryEdit}.
 */
export type EntryChange = EntryNew & { id: string; version: string };

/**
 * An entry moved or resized, as the calendar sends it after a drag:
 * its new times alone, every other field staying as its file holds it.
 */
export type EntryMoved = {
    id: string;
    start: string;
    end: string;
};

/**
 * A box logged at its real time,
 * as the day sends it after a drop into the log or a tap on `Log` in its menu.
 */
export type BoxLogged = {
    box: string;
    start: string;
    end: string;
};

/**
 * An entry as the day gets it, with the chapters of a skill entry, what a meal gives,
 * and whether it is a glass of water.
 *
 * - `chapters`: From the folders it links and from older `X-CHAPTER`s,
 *   see `chaptersOf` in `documents.ts`.
 * - `kcal`: The day hides them on its entries for now.
 *   Its dialog and its trackers show them.
 * - `glass`: The counter of the day shows it instead of the time grid, see `trackers.ts`.
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
 * Category of cooking, which lists what went into the pot
 * like a meal, but counts no kcal.
 */
const cookName: string = "Cook";

/**
 * Gives the log an entry belongs into, see the top of this file.
 */
export function logFileOf(fields: { category: string; module: string; start: Date }): string {
    return calendarFileOf(fields, berlinDateOf(fields.start), logEnding);
}

/**
 * Turns an entry as the page sends it into the fields to write:
 * what it did online and who I was with as sent,
 * else as the box or the entry being changed has them, see `onlineFor` in `places.ts`,
 * and what it was as the reader writes it, see `titleOf` in `documents.ts`.
 *
 * @param from - The box it is logged from or the entry being changed, `null` for none
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
 * Checks fields, foods and times of an entry of the log before they are written.
 * An entry has to fit its category, see {@link categoryAllows}, or keep what it was,
 * or what the box it is logged from was:
 * the same category and title, for a skill entry the same skill
 * and type, with well-formed people, like an entry written before
 * its category got its rules, dragged to another time,
 * or an older skill box `IN2028 DEV` of a type no longer offered.
 * Only a meal or a cooking lists foods, each line well formed.
 *
 * @throws {Error} - When the fields or foods are not allowed
 *   or the end is not after the start
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

/**
 * Reads the entries of the log that overlap a range, each meal with its kcal
 * and each glass of water marked.
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
 * no glass of water and nothing of a whole day.
 * Of several running at once the one begun last,
 * like a meal during a session of learning,
 * and the session again once the meal is over.
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

/**
 * Reads every entry of the log for its search, newest first, see `src/day/search.ts`:
 * the entries that can be changed, since a click on a result opens its dialog.
 * A glass of water is no entry of its own but a mark of the trackers, so it is left out.
 */
export function logAllRead(): Entry[] {
    return entriesOnceRead(day.log)
        .filter((entry: Entry): boolean => entry.editable && !entry.todo && !glassIs(entry))
        .sort((one: Entry, other: Entry): number => other.start.localeCompare(one.start));
}

/**
 * Checks what a session of sport did as the dialog sends it,
 * see `sportPartsAllow` in `sport.ts`.
 *
 * @throws {Error} - When the entry is no session of sport or a line is not well formed
 */
function sportCheck(category: string, workout: string, exercises: string[], videos: string[]): void {
    if (!sportPartsAllow(category, workout, exercises, videos))
        throw new Error(`No session ${JSON.stringify({ workout, exercises, videos })} ` + `for ${category}`);
}

/**
 * Checks my neck pain as the dialog sends it: a whole number from 0 to 10, or empty.
 */
function painCheck(pain: string): void {
    if (!/^(?:\d|10)?$/.test(pain)) throw new Error(`No pain from 0 to 10: ${pain}`);
}

/**
 * Checks the cooking a meal draws from, as the dialog sends it:
 * empty for none, else an entry `Cook` of the log that starts before the meal.
 * A link only ever points back in time, so every day stays as it was once I close it.
 * A meal keeps the cooking it drew from also once that cooking is removed from the log,
 * so it can still be changed and moved, see {@link cookedShare}.
 *
 * @param kept - The cooking the entry being changed draws from already
 * @throws {Error} - When an entry other than a meal draws,
 *   or the cooking is no entry `Cook` of the log that starts
 *   before the meal, but for the one kept
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
 * Carries a cooking into the meals that draw from it, whatever their time,
 * so each eats its part of the pot by itself and follows every change of the cooking:
 * a food of the pot new to a meal, or whose grams in the pot changed,
 * gets the grams of the pot divided by how many meals draw, to one decimal,
 * a `~` of grams guessed kept.
 * Every other food keeps the grams the meal gave it,
 * like 25 g of pesto typed over the 50 of the pot, since I type what I ate.
 * A food the cooking took in since a meal drew comes into the meal,
 * also under a meal it renamed,
 * one it took out leaves it, and one I took out of a meal stays out.
 * Foods a meal ate beside the pot keep their lines,
 * unless the pot now holds the same food in the same meal.
 * A meal whose lines change gets its summary anew, see `mealTitleOf` in `food.ts`.
 * Called after a meal drawing from it is added, changed or removed,
 * and after the cooking itself changes, so every meal stays right.
 * - `drawn`, `drawnGrams`: The pot as it was when the meals drew.
 *
 * @param before - Lines `X-FOOD` of the cooking before it changed,
 *   `undefined` while it is as the meals drew it
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
 * Reads how long the last entries of the log like a box really lasted, the latest first,
 * so I anchor the expected minutes of a box on what really happened, not on a hope,
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
 * Adds an entry to the log, into the log it belongs into, see {@link logFileOf}.
 * An entry logged from a box gets its `RELATED-TO`, after which the box is done,
 * see `boxDone` in `boxes.ts`.
 *
 * @param id - Identifier of the new entry, a new one when left out.
 *   The one an entry brought from Vu's log, see `shared.ts`
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
    const own: [string, string | Link][] = foodsRanked(entry.foods).map((food: string): [string, string] => [
        "x-food",
        food,
    ]);
    if (entry.planned !== "") own.push(["related-to", entry.planned]);
    if ((plan?.group ?? "") !== "") own.push(["x-group", plan?.group ?? ""]);
    if (pain !== "") own.push(["x-pain", pain]);
    if (cooked !== "") own.push(["x-cooked", cooked]);
    if (workout !== "") own.push(["x-workout", workout]);
    own.push(
        ...exercises.map((line: string): [string, string] => ["x-exercise", sportIcsOf(line, false)]),
        ...videos.map((line: string): [string, string] => ["x-video", sportIcsOf(line, true)]),
    );
    const added: string = entryAppend(logFileOf(fields), fields, own, id);
    if (entry.planned !== "") boxDone(entry.planned);
    cookedShare(cooked);
    return added;
}

/**
 * Logs a box at its real time, with one drop or one tap:
 * a log entry with what the box holds, written as the reader writes it,
 * see `titleOf` in `documents.ts`, pointing to the box with `RELATED-TO`,
 * a tutorial with the group I went to as its `X-GROUP`,
 * so the log shows it as the plan does.
 * Its note stays empty, since the note
 * of a log entry is my diary note about what happened.
 * A skill box hands on its links to documents, see `documents.ts`,
 * and its chapters as `X-CHAPTER`s, also those whose folders an older box links.
 *
 * @throws {Error} - When there is no such box, it is not open or has no category,
 *   or the times are not right
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
 * Takes a done box back to open, with one click on its check:
 * removes the log entry written from it, as if I had not logged it.
 * One that holds what I added since, rounds or a note,
 * stays in the log and only lets go of the box.
 * A to-do done in another app, `COMPLETED` without log entry, is `NEEDS-ACTION` again.
 *
 * @throws {Error} - When there is no such box, it is not done, or it has a deadline,
 *   which only my tick decides, see `boxSubmit` in `boxes.ts`
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
 * Writes fields, foods, pain and times of an entry of the log,
 * all of them checked before anything is written,
 * so a change refused leaves the entry as it was.
 * The entry moves into the log it belongs into now when that is another file.
 * Its box takes a new summary with it, see `boxRename` in `boxes.ts`,
 * but for a meal, whose foods write its summary, what I really ate.
 *
 * @throws {Error} - When it may not be changed, the fields or foods are not allowed,
 *   the link typed online is no web address, or the end is not after the start
 */
function entryWrite(file: string, entry: Entry, change: EntryNew): void {
    if (!entry.editable) throw new Error(`${entry.title} may not be changed`);

    const fields: EntryFields = fieldsOf(change, entry);
    fieldsCheck(fields, change.foods, entry);
    painCheck(change.pain ?? "");
    cookedCheck(fields.category, fields.start, change.cooked ?? entry.cooked, entry.cooked);
    const workout: string = (change.workout ?? entry.workout ?? "").trim();
    const exercises: string[] = change.exercises ?? entry.exercises ?? [];
    const videos: string[] = change.videos ?? entry.videos ?? [];
    sportCheck(fields.category, workout, exercises, videos);
    const foods: string[] = foodsRanked(change.foods);
    if (foods.join("\n") !== entry.foods.join("\n")) propertiesPut(file, entry.id, [["x-food", foods]]);
    if (change.pain !== undefined && change.pain !== entry.pain)
        propertiesPut(file, entry.id, [["x-pain", change.pain === "" ? [] : [change.pain]]]);
    if (change.cooked !== undefined && change.cooked !== entry.cooked)
        propertiesPut(file, entry.id, [["x-cooked", change.cooked === "" ? [] : [change.cooked]]]);
    if (workout !== (entry.workout ?? ""))
        propertiesPut(file, entry.id, [["x-workout", workout === "" ? [] : [workout]]]);
    if (exercises.join("\n") !== (entry.exercises ?? []).join("\n"))
        propertiesPut(file, entry.id, [
            ["x-exercise", exercises.map((line: string): string => sportIcsOf(line, false))],
        ]);
    if (videos.join("\n") !== (entry.videos ?? []).join("\n"))
        propertiesPut(file, entry.id, [["x-video", videos.map((line: string): string => sportIcsOf(line, true))]]);
    entryChange(file, entry, fields, logFileOf(fields));
    if (entry.planned !== "" && foods.length === 0 && fields.title !== entry.title)
        boxRename(entry.planned, fields.title);
    cookedShare(entry.cooked);
    if (change.cooked !== undefined && change.cooked !== entry.cooked) cookedShare(change.cooked);
    if (fields.category === cookName) cookedShare(entry.id, entry.foods);
}

/**
 * Changes an entry of the log as the dialog sends it,
 * only while its file holds it as the dialog opened it,
 * see `version` of `Entry` in `calendar.ts`.
 * After any change of it since, by another device, Claude or the reader,
 * like a food renamed in every entry while the dialog was open, nothing is written,
 * so a save never writes back what the file held before.
 * The first save wins, and the dialog says so,
 * see `entrySave` in `src/day/categories.ts`.
 *
 * @returns Whether it is written,
 *   `false` when its file changed it since the dialog opened it
 * @throws {Error} - When there is no such entry or the change is not allowed
 */
export function entryEdit(change: EntryChange): boolean {
    const [file, entry]: [string, Entry] = entryFind(day.log, change.id);
    if (entry.version !== change.version) return false;
    entryWrite(file, entry, change);
    return true;
}

/**
 * Moves an entry of the log to a new start and end,
 * as the calendar sends it after a drag.
 * Every other field stays as its file holds it, the ones a drag does not know left out,
 * see {@link EntryNew}.
 * Written as any change, so an entry moved into another year moves into its log,
 * and a meal moved before the cooking it draws from is refused, see {@link cookedCheck}.
 *
 * @throws {Error} - When there is no such entry, it may not be changed,
 *   the end is not after the start,
 *   or a meal would start before the cooking it draws from
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
 * Removes an entry of the log.
 * When it was logged from a box, the box is open again, see `boxReopen` in `boxes.ts`.
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
