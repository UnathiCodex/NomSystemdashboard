/**
 * ## Series
 *
 * The one form of a series of my course, the lectures, exercises, tutorials and sheets
 * of a module in a semester, see `reader/course.ts`.
 * The same dialog in all places, so a change is one and the same.
 * Opened over the dialog of a box, closing it goes back to that dialog, saving closes both.
 * Nothing is written before I save.
 * Then the reader changes only open boxes from today on and numbers the series anew.
 * The exams of a module, single dates, open in the same dialog, each with its kind.
 * Of a numbered type the row `Semester` has the menu of the groups beside the semester.
 * While no group is mine, my series shows its rows empty and locked,
 * since its place, days and people come from the group.
 * The first group made while none is mine becomes mine as it is saved.
 * Enter confirms only its field, Ctrl+Enter saves, Escape and a click beside it cancel.
 *
 * The boxes a series makes stay one calm line, a tap opens them as a list by month.
 * A box not written yet has `Cancel`, so a date that does not take place stays without number.
 *
 * Every other series is a plain one, one to-do that repeats by its rule, see `reader/rules.ts`.
 * Its weekdays, or `Month` or `Year` on the day of its first day.
 * Saved, the past of a series never changes.
 */

import { breakableOf, choiceOf, choicesOf, fileShow, pairOf, partFieldOf, rowOf, searchOf } from "./choices.ts";
import {
    boxTimesOf,
    dateFieldStart,
    dateParse,
    lengthFieldRead,
    lengthFieldShow,
    lengthFieldStart,
    lengthSwapOf,
    minutesOf,
    timeFieldRead,
    timeFieldStart,
    timeOf,
    weekdayDateTextOf,
} from "./times.ts";
import {
    addressOf,
    labelOf,
    lineOf,
    placeAddressOf,
    placeChoiceOf,
    placeEditOf,
    placeOf,
    renameSend,
    standardFirst,
} from "./places.ts";
import { boxAdd, boxDrop, boxLog, boxRepeat, boxSubmit, boxUndo, boxUniversity } from "./entries.ts";
import { boxOpenEdit, dayCalendarOf, entryBoxOf, entryOpenFromBox, topicFileOf } from "./categories.ts";
import { summarySearchOf } from "./meal.ts";
import { onlineRowOf, withRowOf } from "./attendance.ts";
import { boxActionsOf } from "./actions.ts";
import { boxesFetch } from "./boxes.ts";
import { boxGroupOf, pinnedMenuOf } from "./groups.ts";
import { whereLinkedOf } from "./places.ts";
import { listRowOf, numberOf, rowTimesOf } from "./rows.ts";
import { dayAdd, dayOf, semesterOf, skillName } from "../skill/attempts.ts";
import { semestersOf, skillNamesOf, skillPairOf } from "./skill.ts";
import { buttonOf, elementOf, plusOf } from "../food/foods.ts";
import { crossPut, iconOf, iconPut, iconWordsOf, QuestionMark } from "../icons.ts";
import { menuAnchor, menuItemOf } from "../menu.ts";
import { readerAsk } from "../reader.ts";
import { folderLinkShow, modulesFolder } from "../skill/links.ts";
import { personsKept, personsRename } from "../persons.ts";
import { ArrowRight, Calendar, CalendarMinus, CalendarOff, Check, ChevronDown, Pencil, Plus, Trash, X } from "lucide";
import "./series.css";

import type { Box, PlanDay } from "./boxes.ts";
import type { Category, Field } from "./categories.ts";
import type { Choice } from "./choices.ts";
import type { BoxFields } from "./entries.ts";
import type { PersonEdit } from "../persons.ts";
import type { ModuleType } from "./skill.ts";
import type { IconNode } from "lucide";
import type { Calendar as DayCalendar } from "fullcalendar";
import type { Plain } from "../../reader/rules.ts";
import type { MaterialFolder } from "../../reader/notes.ts";
import type {
    Course,
    Extra,
    Group,
    Learned,
    Planned,
    Rule,
    Series,
    Session,
    Slot,
    Times,
} from "../../reader/course.ts";
import type { BoxState } from "../../reader/boxes.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";
import type { Place } from "../../reader/places.ts";
import type { Person } from "../../reader/persons.ts";

// The course of a module, its series and groups, as the reader sends them.
export type { Course, Group, Learned, Rule, Series, Session };

/**
 * The days of a series as typed so far.
 *
 * - `before`: For each slot the weekday of the slot read back whose boxes it takes, 0 for one added.
 * - `first`, `last`: Empty while not typed as a day.
 * - `times`: The dates with times of their own.
 */
export type Days = {
    slots: Slot[];
    before: number[];
    extras: Extra[];
    first: string;
    last: string;
    times: Times;
};

/** The state I gave a box in the form until I save, by its identifier, a new one by its day. */
export type States = { [id: string]: BoxState };

/** The kinds I gave the exams in the form until I save, by their days. */
type Kinds = { [day: string]: string };

/** The form of a series as typed so far, `old` the rule as read back, `null` for a new series. */
type Form = Days &
    Online & {
        type: string;
        old: Rule | null;
        location: string;
        locationLink: string;
        attendees: Attendee[];
        states: States;
        kinds: Kinds;
    };

/**
 * A new series made from the dialog of a new box.
 *
 * - `link`: The folder its summary links, empty for none.
 * - `file`: The plan it writes into, empty while its boxes may fill several.
 */
type Repeated = {
    box: BoxFields;
    summary: string;
    link: string;
    file: string;
};

/** Types of a series that carry their number and that the university may cancel. */
export const numberedTypes: string[] = ["VO", "UE", "ZU", "TU", "HU"];

/** Type of the exams of a module, single dates whose `X-NUMBER` is their kind. */
const examType: string = "FA";

/** The kinds of an exam in the order they come in a semester. */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/** The day of a monthly plain series among the weekdays, after Sunday. */
const monthly: number = 8;

/** The day of a yearly plain series among the weekdays, after `Month`. */
const yearly: number = 9;

/** Waiting preview, so typing asks the reader once, a moment after it rests. */
let previewWait: number = 0;

/** How many previews were asked for, so only the answer to the last one shows. */
let previewsAsked: number = 0;

/** What the boxes showed last, so rows built anew show it until the reader answers. */
let previewShown: Node[] = [];

/** Whether the boxes of the form show as a list below their line. */
let listOpened: boolean = false;

/** The boxes of the list there already, by their identifiers. */
let boxesKnown: Map<string, Box> = new Map();

/** The extra being typed below the list, `null` while none is. */
let extraTyped: Extra | null = null;

/** The session of the group being changed alone, `null` while none is. */
let sessionTyped: (Pick<Session, "id" | "location"> & Pick<Slot, "start" | "end"> & { day: string }) | null = null;

/** Of the exams, the kind I gave the date being typed, empty while I gave none. */
let kindTyped: string = "";

/** Of the exams, the day added as the dialog opened, whose menu of kinds opens first. */
let kindAsked: string = "";

/** The course whose series the dialog shows, `null` before it opened. */
let course: Course | null = null;

/** The form in the dialog, `null` while it is closed. */
let typing: Form | null = null;

/** The place as I changed it by its parts, which saving writes everywhere, `null` while unchanged. */
let placeEdit: Place | null = null;

/** Whether the place shows its parts below it. */
let placeOpen: boolean = false;

/** Whether what the series does online shows its parts below it. */
let onlineOpen: boolean = false;

/**
 * The slots taken back by the toggles of the weekdays, each its weekday and the weekday read back,
 * so the next weekday picked takes those boxes, as a day moved.
 */
let slotsFreed: [number, number][] = [];

/** The people of `With` whose parts show below its names. */
let withOpen: string[] = [];

/** Each person of `With` I changed by its parts, by its name as picked, which saving writes everywhere. */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/** The people of `Persons.md` as kept when the dialog opened. */
let persons: Person[] = [];

/** The categories with the values of their fields, for the places and the people. */
let categories: Category[] = [];

/** Whether the buttons and keys of the dialog started. */
let dialogStarted: boolean = false;

/** The new box the form makes a series of, `null` for a series of my course. */
let repeated: Repeated | null = null;

/** The plain series the form changes or makes, `null` for a series of my course. */
let plain: Plain | null = null;

/** Whether the plain series has times, else only how long it lasts. */
let plainTimed: boolean = true;

/**
 * How long each day of the plain series lasts while it has no times, by its weekday.
 * A weekday picked anew takes the length of the first.
 */
let plainLengths: Map<number, number | null> = new Map();

/**
 * The group the form makes or changes, `null` for my own series.
 * `was` is its name before, which saving renames everywhere when I typed another.
 */
let grouped: { group: string; made: boolean; was: string } | null = null;

/** My series the form of a group was opened from, to go back to once the group closes. */
let groupBack: Form | null = null;

/** A new series made from nothing, the day it starts and what is picked so far. */
let fresh: {
    day: string;
    category: string;
    picked: ModuleType;
    semester: string;
} | null = null;

/** Whether the bin of a group asked whether I really remove it. */
let removeAsked: boolean = false;

/** Comes once the form is saved, like closing the dialog of the box it opened over. */
let done: () => void = (): void => {};

/** The box the dialog of an entry showed before a row of the list opened another, shown again unsaved. */
let entryBack: Box | null = null;

/** The weekday of a day, 1 for Monday to 7 for Sunday. */
export function weekdayOf(day: string): number {
    return ((new Date(`${day}T12:00:00`).getDay() + 6) % 7) + 1;
}

/** The Monday of the week of a day, which names its week. */
export function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/** The name of a weekday in English. */
export function weekdayNameOf(weekday: number, whole: boolean): string {
    return new Date(2026, 9, 18 + weekday).toLocaleDateString("en-GB", {
        weekday: whole ? "long" : "short",
    });
}

/** The short name of a day of the form. */
function dayNameOf(weekday: number): string {
    return weekday === monthly ? "Month" : weekday === yearly ? "Year" : weekdayNameOf(weekday, false);
}

/**
 * The room of a place short, its name without what stands in brackets,
 * so whatever I write in brackets never makes a place too long for its line.
 */
export function roomOf(line: string): string {
    return labelOf(line).replace(/\s*\(.*$/, "");
}

/** Whether a box is one of a series of my course, a skill box of a numbered type with its number. */
export function seriesHas(box: Box): boolean {
    return box.category === skillName && numberedTypes.includes(box.type) && box.number !== "";
}

/** Whether a start and an end are both a time, the start before the end. */
function timesReady(times: Pick<Slot, "start" | "end">): boolean {
    return times.start !== "" && times.end !== "" && times.start < times.end;
}

/** Whether the days of a series are typed enough to make boxes. */
function daysReady(days: Days): boolean {
    return (
        days.slots.every(
            (slot: Slot): boolean =>
                slot.weekday > 0 && (slot.minutes === undefined ? timesReady(slot) : slot.minutes > 0),
        ) &&
        new Set(days.slots.map((slot: Slot): number => slot.weekday)).size === days.slots.length &&
        days.extras.every((extra: Extra): boolean => extra.day !== "" && timesReady(extra)) &&
        days.first !== "" &&
        days.last !== "" &&
        days.first <= days.last
    );
}

/** Moves the days on the weekday of a slot to its new weekday, so a moved lecture keeps its weeks. */
function daysMove(days: Days, from: number, to: number): void {
    const move: (day: string) => string = (day: string): string =>
        from !== 0 && day !== "" && weekdayOf(day) === from ? dayAdd(day, to - from) : day;
    days.first = move(days.first);
    days.last = move(days.last);
    days.times = Object.fromEntries(
        Object.entries(days.times).map(
            ([day, times]: [string, Pick<Slot, "start" | "end">]): [string, Pick<Slot, "start" | "end">] => [
                move(day),
                times,
            ],
        ),
    );
}

/** A field of a time or a day, a day written with its weekday, what I type taken as I type it. */
function fieldOf(
    kind: "time-field" | "date-field",
    value: string,
    name: string,
    take: (value: string) => void,
    changed: () => void,
): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.className = kind;
    input.type = "text";
    input.inputMode = kind === "time-field" ? "numeric" : "decimal";
    input.autocomplete = "off";
    input.value = kind === "date-field" && value !== "" ? weekdayDateTextOf(value) : value;
    input.setAttribute("aria-label", name);
    if (kind === "time-field") timeFieldStart(input);
    else dateFieldStart(input);
    input.addEventListener("input", (): void => {
        take(kind === "time-field" ? timeFieldRead(input) : (dateParse(input.value) ?? ""));
        changed();
    });
    return input;
}

/** A field of a length, what I type taken as I type it, `null` while it holds none. */
function lengthFieldOf(
    minutes: number | null,
    name: string,
    take: (minutes: number | null) => void,
    changed: () => void,
): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.className = "length-field";
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    lengthFieldShow(input, minutes);
    input.setAttribute("aria-label", name);
    lengthFieldStart(input);
    input.addEventListener("input", (): void => {
        take(lengthFieldRead(input));
        changed();
    });
    return input;
}

/** The two fields of a range with the dash going with the second, so a narrow row breaks before it. */
function rangeOf<Key extends string>(
    kind: "time-field" | "date-field",
    range: { [key in Key]: string },
    keys: Key[],
    names: string[],
    changed: () => void,
): HTMLElement {
    const [from, to]: HTMLInputElement[] = keys.map((key: Key, at: number): HTMLInputElement =>
        fieldOf(
            kind,
            range[key],
            names[at],
            (value: string): void => {
                range[key] = value;
            },
            changed,
        ),
    );
    const both: HTMLElement = elementOf("span", "entry-range", "");
    const second: HTMLElement = elementOf("span", "entry-moment", "");
    second.append(elementOf("span", "entry-dash", "–"), to);
    both.append(from, second);
    return both;
}

/** The fields of the times of a slot, an extra or a box. */
function timesRangeOf(times: Pick<Slot, "start" | "end">, changed: () => void): HTMLElement {
    return rangeOf("time-field", times, ["start", "end"], ["Start", "End"], changed);
}

/** The button `×` that takes a day or an extra back. */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const remove: HTMLButtonElement = buttonOf("", "", click);
    crossPut(remove, words);
    return remove;
}

/**
 * The row `Day`, the one way every series takes its days.
 * On top the weekdays as toggles, below each day picked one line with its times.
 * A plain series has `Month` and `Year` after Sunday, each a day alone.
 */
function slotRowsOf(
    days: Days,
    aside: HTMLElement[],
    lengthOf: ((slot: Slot) => HTMLElement) | null,
    month: boolean = false,
): HTMLElement[] {
    const shown: number[] = [1, 2, 3, 4, 5, 6, 7, ...(month ? [monthly, yearly] : [])];
    const toggles: HTMLElement = elementOf("span", "series-weekdays", "");
    toggles.append(
        ...shown.map((weekday: number): HTMLButtonElement => {
            const index: number = days.slots.findIndex((slot: Slot): boolean => slot.weekday === weekday);
            const toggle: HTMLButtonElement = buttonOf("series-weekday", dayNameOf(weekday), (): void => {
                slotToggle(days, weekday);
                formFill();
            });
            toggle.setAttribute("aria-pressed", String(index !== -1));
            return toggle;
        }),
    );
    const lines: HTMLElement = elementOf("div", "series-slots", "");
    lines.append(
        toggles,
        ...days.slots
            .filter((slot: Slot): boolean => slot.weekday > 0)
            .map((slot: Slot): HTMLElement => {
                const line: HTMLElement = elementOf("div", "series-slot", "");
                line.append(
                    elementOf("span", "series-slot-day", dayNameOf(slot.weekday)),
                    lengthOf === null ? timesRangeOf(slot, formChanged) : lengthOf(slot),
                );
                return line;
            }),
    );
    const row: HTMLElement = rowOf("Day", lines);
    row.querySelector(".entry-name")?.append(...aside);
    return [row];
}

/**
 * Picks a weekday or takes it back.
 * A new slot takes the times of the first and the boxes of a slot taken back before, as a day moved.
 * The last slot is never taken back.
 * `Month` or `Year` stays alone, another day picked takes its slot.
 */
function slotToggle(days: Days, weekday: number): void {
    const index: number = days.slots.findIndex((slot: Slot): boolean => slot.weekday === weekday);
    const empty: number = days.slots.findIndex((slot: Slot): boolean => slot.weekday === 0 || slot.weekday >= monthly);
    if (weekday >= monthly && index === -1) {
        days.slots = [{ ...days.slots[0], weekday: weekday }];
        days.before = [0];
    } else if (index === -1 && empty !== -1) days.slots[empty].weekday = weekday;
    else if (index === -1) {
        const freed: [number, number] | undefined = slotsFreed.shift();
        if (freed !== undefined) daysMove(days, freed[0], weekday);
        days.slots.push({
            weekday: weekday,
            start: days.slots[0]?.start ?? "",
            end: days.slots[0]?.end ?? "",
            ...(days.slots[0]?.minutes === undefined ? {} : { minutes: days.slots[0].minutes }),
        });
        days.before.push(freed?.[1] ?? 0);
    } else if (days.slots.length > 1) {
        if ((days.before[index] ?? 0) !== 0) slotsFreed.push([weekday, days.before[index]]);
        days.slots.splice(index, 1);
        days.before.splice(index, 1);
    }
    const pairs: [Slot, number][] = days.slots
        .map((slot: Slot, at: number): [Slot, number] => [slot, days.before[at] ?? 0])
        .sort((first: [Slot, number], second: [Slot, number]): number => first[0].weekday - second[0].weekday);
    days.slots = pairs.map(([slot]: [Slot, number]): Slot => slot);
    days.before = pairs.map(([, before]: [Slot, number]): number => before);
}

/** The row of the first and the last day. */
function datesRowOf(days: Days, changed: () => void): HTMLElement {
    return rowOf("Dates", rangeOf("date-field", days, ["first", "last"], ["First day", "Last day"], changed));
}

/** The row `Entries` of the boxes, showing what it showed last until the reader answers. */
function boxesRowOf(): HTMLElement {
    const preview: HTMLElement = elementOf("div", "series-preview", "");
    preview.append(...previewShown);
    const row: HTMLElement = rowOf("Entries", preview);
    row.hidden = previewShown.length === 0;
    return row;
}

/** Forgets what the boxes showed and folds their list, as another form opens. */
function previewForget(): void {
    clearTimeout(previewWait);
    previewsAsked += 1;
    previewShown = [];
    listOpened = false;
    extraTyped = null;
    sessionTyped = null;
    kindAsked = "";
}

/** A count of boxes by an icon, its words as tooltip. */
export function tallyOf(count: number, icon: IconNode, words: string): HTMLElement {
    const part: HTMLElement = elementOf("span", "series-tally", "");
    part.title = `${count} ${words}`;
    part.setAttribute("aria-label", part.title);
    part.append(...iconWordsOf(icon, String(count)));
    return part;
}

/**
 * The line of the boxes, how many, what a change does, and how many are done, not and pushed.
 * A tap opens and closes the list below it.
 */
function summaryOf(planned: Planned[], toggle: () => void): HTMLButtonElement {
    const kept: Planned[] = planned.filter((box: Planned): boolean => box.change !== "removed");
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const counted: (keep: (box: Planned) => boolean) => number = (keep: (box: Planned) => boolean): number =>
        planned.filter(keep).length;
    const line: HTMLButtonElement = document.createElement("button");
    // How many each change makes, none for none.
    const parts: string[] = [...(had ? ["new"] : []), "changed", "removed"].flatMap((change: string): string[] => {
        const count: number = counted((box: Planned): boolean => box.change === change);
        return count === 0 ? [] : [`${count} ${change}`];
    });
    const states: [number, IconNode, string][] = [
        [counted((box: Planned): boolean => box.change !== "removed" && box.state === "done"), Check, "done"],
        [
            counted(
                (box: Planned): boolean =>
                    box.change !== "removed" && (box.state === "dropped" || box.state === "university"),
            ),
            X,
            "skipped or cancelled",
        ],
        [counted((box: Planned): boolean => box.pushed), ArrowRight, "pushed"],
    ];
    line.type = "button";
    line.className = "series-summary";
    line.setAttribute("aria-expanded", String(listOpened));
    line.append(
        tallyOf(kept.length, Calendar, kept.length === 1 ? "entry" : "entries"),
        ...parts.map((part: string): HTMLElement => elementOf("span", "entry-parted", part)),
        ...states.map(([count, icon, words]: [number, IconNode, string]): HTMLElement => {
            const part: HTMLElement = tallyOf(count, icon, words);
            part.classList.add("entry-parted");
            return part;
        }),
    );
    line.addEventListener("click", toggle);
    return line;
}

/** The icon of the state of a box, a button that takes it back where it can be. */
function markOf(icon: IconNode, word: string, back: (() => void) | null): HTMLElement {
    const mark: HTMLElement = document.createElement(back === null ? "span" : "button");
    if (mark instanceof HTMLButtonElement && back !== null) {
        mark.type = "button";
        mark.addEventListener("click", back);
    }
    mark.className = "box-state";
    iconPut(mark, icon, word);
    return mark;
}

/** Sends a change of a box of the list, then shows the list anew, also when the reader refuses. */
function seriesAct(send: () => Promise<unknown>): void {
    send()
        .catch(console.error)
        .then((): Promise<void> => seriesRefresh())
        .catch(console.error);
}

/**
 * Shows the list anew as the files hold it now, nothing once the dialog closed.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRefresh(): Promise<void> {
    if (typing === null) return;
    if (course !== null) course = await courseLoad(course.module, course.semester);
    formChanged();
}

/**
 * Opens a box of the list over the dialog of the series.
 * The dialog of an entry the series opened from closes first, its box kept to show again.
 * The box shows on top, marked `data-over`.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function boxShow(box: Box): Promise<void> {
    const entry: HTMLDialogElement = document.getElementById("entry") as HTMLDialogElement;
    if (entry.open && entryBack === null) entryBack = entryBoxOf();
    if (entry.open) entry.close();
    if (box.editable) await boxOpenEdit(box);
    else if (box.state === "open") {
        const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
        await entryOpenFromBox(box, start, end);
    }
    if (entry.open) entry.dataset.over = "";
}

/**
 * Shows the box of the dialog of an entry again as it stands now, once the series closes unsaved.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function entryBackShow(box: Box): Promise<void> {
    const fresh: Box | undefined = (await boxesFetch(box.day, dayAdd(box.day, 1)))
        .flatMap((plan: PlanDay): Box[] => plan.boxes)
        .find((other: Box): boolean => other.id === box.id);
    if (fresh !== undefined) await boxOpenEdit(fresh);
}

/**
 * Loads the boxes of the rows of the list.
 * Never the greyed copy a pushed box leaves, none of a group, whose rows are its sessions.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function boxesLoad(planned: Planned[]): Promise<void> {
    const ids: string[] = planned
        .filter((box: Planned): boolean => box.id !== "")
        .map((box: Planned): string => box.id);
    const days: string[] = planned.map((box: Planned): string => box.day).sort();
    if (ids.length === 0 || grouped !== null) {
        boxesKnown = new Map();
        return;
    }
    const boxes: Box[] =
        course !== null && plain === null
            ? course.boxes
            : (await boxesFetch(days[0], dayAdd(days[days.length - 1], 8)))
                  .flatMap((plan: PlanDay): Box[] => plan.boxes)
                  .filter((box: Box): boolean => box.state !== "pushed");
    boxesKnown = new Map(
        boxes.filter((box: Box): boolean => ids.includes(box.id)).map((box: Box): [string, Box] => [box.id, box]),
    );
}

/**
 * A button by its icon, its words as tooltip.
 *
 * @param still - Whether it takes no focus, so the extra being typed joins as it is clicked
 */
function iconButtonOf(
    className: string,
    icon: IconNode,
    words: string,
    click: () => void,
    still: boolean = false,
): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf(className, "", click);
    iconPut(button, icon, words);
    if (still) button.addEventListener("mousedown", (event: MouseEvent): void => event.preventDefault());
    return button;
}

/** The right edge of the row of a box there already, its actions while open, else its state. */
function knownEndOf(box: Box): HTMLElement {
    const calendar: DayCalendar | null = dayCalendarOf();
    if (box.state === "open")
        return boxActionsOf(
            box,
            (): void =>
                seriesAct(async (): Promise<void> => {
                    const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
                    await boxLog(box, start, end);
                }),
            seriesAct,
            true,
        );
    let back: (() => Promise<void>) | null = null;
    if (box.state === "done")
        back =
            box.deadline !== ""
                ? (): Promise<void> => boxSubmit(box.id, false)
                : calendar === null
                  ? null
                  : (): Promise<void> => boxUndo(calendar, box.id);
    else if (box.editable)
        back =
            box.state === "dropped"
                ? (): Promise<void> => boxDrop(box.id, false)
                : (): Promise<void> => boxUniversity(box.id, false);
    const shown: [IconNode, string] =
        box.state === "done"
            ? [Check, box.deadline === "" ? "Logged" : "Submitted"]
            : box.state === "dropped"
              ? [X, "Skipped"]
              : [CalendarOff, "Cancelled"];
    const take: (() => Promise<void>) | null = back;
    return markOf(shown[0], shown[1], take === null ? null : (): void => seriesAct(take));
}

/**
 * The right edge of the row of a box not written yet, kept by the form until I save.
 * `Cancel` for one numbered and for a session, `Remove` for an extra from today on.
 * A session of a group has `+`, past days too, so a tutorial I went to is added afterwards,
 * but not where a box of mine stands already.
 * Its pencil changes it alone, as the university changed it.
 * A day of another series of the chain, and one the change removes, show only their state.
 */
function pendingEndOf(box: Planned, form: Form): HTMLElement {
    const today: string = dayOf(new Date());
    const extra: Extra | undefined = form.extras.find((one: Extra): boolean => one.day === box.day);
    const stated: (state: BoxState) => () => void =
        (state: BoxState): (() => void) =>
        (): void => {
            form.states[box.id || box.day] = state;
            formFill();
        };
    const shown: boolean = box.chained === true || box.change === "removed";
    const back: (() => void) | null = box.editable && !shown ? stated("open") : null;
    if (box.state === "done") return markOf(Check, "Done", null);
    if (box.state === "dropped") return markOf(X, "Skipped", back);
    if (box.state === "university") return markOf(CalendarOff, "Cancelled", back);
    if (shown) return elementOf("span", "series-end", "");
    const session: Session | undefined = sessionOf(box);
    const buttons: HTMLButtonElement[] = [];
    if (box.editable && (/^\d+$/.test(box.number) || grouped !== null))
        buttons.push(iconButtonOf("box-action", CalendarOff, "Cancel", stated("university")));
    if (extra !== undefined && box.day >= today && !box.pushed)
        buttons.push(
            iconButtonOf("box-action", CalendarMinus, "Remove", (): void => {
                form.extras.splice(form.extras.indexOf(extra), 1);
                formFill();
            }),
        );
    if (grouped !== null && !grouped.made && !mineAt(box.time || box.day))
        buttons.push(
            iconButtonOf("box-action", Plus, "Add as a box of mine", (): void => {
                groupSend("/api/course/pick", { start: box.time || box.day, extra: true }).catch(console.error);
            }),
        );
    if (session !== undefined)
        buttons.push(
            iconButtonOf("box-action", Pencil, "Change this session alone", (): void => {
                sessionTyped = {
                    id: session.id,
                    day: box.day,
                    start: timeOf(new Date(session.start)),
                    end: timeOf(new Date(Date.parse(session.start) + session.minutes * 60 * 1000)),
                    location: session.location,
                };
                formFill();
            }),
        );
    if (box.pushed && buttons.length === 0) return markOf(ArrowRight, "Pushed", null);
    const actions: HTMLElement = elementOf("div", buttons.length === 0 ? "series-end" : "box-actions", "");
    actions.append(...buttons);
    return actions;
}

/**
 * The session there already a row stands for, none of a new group, without times,
 * cancelled or removed, and none while the form moved the row from its session.
 */
function sessionOf(box: Planned): Session | undefined {
    const group: typeof grouped = grouped;
    return group === null ||
        group.made ||
        typing === null ||
        box.time === "" ||
        box.state === "university" ||
        box.change === "removed"
        ? undefined
        : groupsOf(typing.type)
              .find((one: Group): boolean => one.rule.group === group.was)
              ?.sessions.find((one: Session): boolean => Date.parse(one.start) === Date.parse(box.time));
}

/**
 * The row of a session being changed alone, its times and room.
 * Save writes it at once, my box at that session following it.
 */
function sessionRowOf(session: NonNullable<typeof sessionTyped>, redraw: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row series-session", "");
    const fields: HTMLElement = elementOf("div", "", "");
    const actions: HTMLElement = elementOf("div", "box-actions", "");
    fields.append(
        timesRangeOf(session, (): void => {}),
        choicesOf({
            search: placeSearchOf(session.location, labelOf),
            picked: session.location === "" ? [] : [session.location],
            many: false,
            adding: false,
            noun: "place",
            textOf: labelOf,
            pick: (values: string[]): void => {
                session.location = values[0] ?? "";
            },
        }),
    );
    actions.append(
        iconButtonOf("box-action", Check, "Save this session", (): void => {
            if (!timesReady(session)) return;
            const { id, start, end, location }: NonNullable<typeof sessionTyped> = session;
            groupSend(
                "/api/course/session",
                { semester: course?.semester ?? "", id: id, start: start, end: end, location: location },
                (): void => {
                    sessionTyped = null;
                },
            ).catch(console.error);
        }),
        removeOf("Keep the session as it is", (): void => {
            sessionTyped = null;
            redraw();
        }),
    );
    row.append(
        elementOf("span", "series-number", ""),
        elementOf("span", "", weekdayDateTextOf(session.day)),
        fields,
        actions,
    );
    return row;
}

/**
 * Writes a session of the group as saved, not as typed since, at once, then shows the list anew.
 * The form stays, so I take one session after another.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function groupSend(address: string, body: object, sent: () => void = (): void => {}): Promise<void> {
    if (course === null || typing === null || grouped === null) return;
    try {
        await courseSend<null>(address, { module: course.module, type: typing.type, group: grouped.was, ...body });
    } catch (error: unknown) {
        failed(error);
        return;
    }
    sent();
    await seriesRefresh();
}

/** Whether a box of mine of the type stands at the start of a session, so it offers no `+`. */
function mineAt(start: string): boolean {
    return (course?.boxes ?? []).some(
        (one: Box): boolean =>
            one.type === typing?.type &&
            ((one.time || one.day) === start || (one.time !== "" && Date.parse(one.time) === Date.parse(start))),
    );
}

/** The kind of an exam where a box has its number, a button that opens the menu of the kinds. */
function kindMenuOf(kind: string, asked: boolean, pick: (kind: string) => void): HTMLElement {
    const place: HTMLElement = elementOf("span", "series-kind", "");
    const button: HTMLButtonElement = document.createElement("button");
    const menu: HTMLElement = document.createElement("div");
    const items: HTMLButtonElement[] = examKinds.map((one: string): HTMLButtonElement =>
        menuItemOf(Check, one, (): void => {
            menu.hidePopover();
            if (one === kind) return;
            kind = one;
            shown();
            pick(one);
        }),
    );
    const shown: () => void = (): void => {
        button.replaceChildren(kind === "" ? "Kind" : kind, iconOf(ChevronDown));
        items.forEach((item: HTMLButtonElement, index: number): void => {
            item.classList.toggle("menu-item-blank", examKinds[index] !== kind);
        });
    };
    button.type = "button";
    button.className = "block-kind series-number";
    menuAnchor(menu, button);
    menu.append(...items);
    shown();
    place.append(button, menu);
    if (asked) {
        kindAsked = "";
        queueMicrotask((): void => {
            if (menu.isConnected) menu.showPopover();
        });
    }
    return place;
}

/**
 * The row of a box in the list, the same row as on the page of its module.
 * A box not written yet shows the people of the series.
 * It says `new` only while not every box is new.
 */
function boxRowOf(box: Planned, had: boolean, form: Form): HTMLElement {
    const kinds: Kinds | undefined = form.type === examType ? form.kinds : undefined;
    const known: Box | undefined = box.change === "removed" ? undefined : boxesKnown.get(box.id);
    let word: string = box.change === "renumbered" || (box.change === "new" && !had) ? "" : box.change;
    if (word === "" && box.pushed && box.editable && box.state === "open") word = "pushed";
    if (word === "" && box.location !== undefined) word = "changed";
    if (form.extras.some((extra: Extra): boolean => extra.day === box.day))
        word = word === "" ? "extra" : `${word} extra`;
    const show: (() => void) | null =
        known === undefined
            ? null
            : (): void => {
                  boxShow(known).catch(console.error);
              };
    const number: HTMLElement =
        kinds === undefined
            ? numberOf(
                  box.change === "removed" ? "" : box.number.replace("NONE", "–"),
                  box.number === "" ? null : show,
                  known?.note || "Open",
              )
            : kindMenuOf(box.number, box.id === "" && box.day === kindAsked, (kind: string): void => {
                  kinds[box.day] = kind;
                  formFill();
              });
    const place: (string | Node)[] =
        known !== undefined
            ? whereLinkedOf(
                  known.category,
                  known.from,
                  roomOf(known.location),
                  known.locationLink,
                  known.online,
                  known.onlineLink,
              )
            : whereLinkedOf(
                  plain?.category ?? skillName,
                  "",
                  roomOf(box.location ?? typing?.location ?? ""),
                  box.locationLink ?? typing?.locationLink ?? "",
                  typing?.online ?? "",
                  typing?.onlineLink ?? "",
              );
    const mine: Form | null = grouped === null ? typing : null;
    return listRowOf({
        number: number,
        day: box.day,
        open: kinds !== undefined || box.number !== "" ? null : show,
        group:
            known !== undefined && known.group !== "" && course !== null
                ? boxGroupOf(
                      course,
                      known,
                      (_: () => void, send: () => Promise<unknown>): void => seriesAct(send),
                      mine === null ? undefined : (group: string): void => groupFrom(mine, group),
                  )
                : null,
        meta: [[rowTimesOf(box.time, box.minutes)], place],
        people: known?.attendees ?? (box.attendees.length > 0 ? box.attendees : (typing?.attendees ?? [])),
        persons: persons,
        mark: word,
        end: known !== undefined && box.chained !== true ? knownEndOf(known) : pendingEndOf(box, form),
        faded: box.change === "removed" || ["done", "dropped", "university"].includes(box.state),
    });
}

/** The line `+` below the list, which opens the row of an extra with the times of the last day. */
function addRowOf(form: Form, redraw: () => void): HTMLButtonElement {
    const add: HTMLButtonElement = document.createElement("button");
    const plus: HTMLElement = elementOf("span", "series-number", "");
    add.type = "button";
    add.className = "series-row series-add";
    add.setAttribute("aria-label", "Add a date");
    add.title = "Add a date";
    plus.append(iconOf(Plus));
    add.append(plus);
    add.addEventListener("click", (): void => {
        const last: Slot | undefined = form.slots[form.slots.length - 1];
        extraTyped =
            plain !== null && !plainTimed
                ? { day: "", start: "", end: "" }
                : { day: "", start: last?.start ?? "", end: last?.end ?? "" };
        kindTyped = "";
        redraw();
        if (form.type !== examType) document.querySelector<HTMLInputElement>(".series-draft .date-field")?.focus();
        else document.querySelector<HTMLElement>(".series-draft .menu")?.showPopover();
    });
    return add;
}

/**
 * The row of an extra being typed, its day and times.
 * Of a plain series without time no times, since it takes the length of the series.
 * Typed enough, it joins as the focus leaves the row, one taken back by its `×` never.
 */
function draftRowOf(extra: Extra, form: Form, redraw: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row series-draft", "");
    const day: HTMLInputElement = fieldOf(
        "date-field",
        extra.day,
        "Day of the extra",
        (typed: string): void => {
            extra.day = typed;
        },
        (): void => {},
    );
    const times: HTMLElement =
        plain !== null && !plainTimed ? elementOf("span", "series-times", "") : timesRangeOf(extra, (): void => {});
    times.classList.add("series-times");
    const number: HTMLElement =
        form.type !== examType
            ? elementOf("span", "series-number", "")
            : kindMenuOf(kindTyped, kindAsked !== "" && extra.day === kindAsked, (kind: string): void => {
                  kindTyped = kind;
                  day.focus();
              });
    row.append(
        number,
        day,
        times,
        elementOf("span", "series-word", ""),
        removeOf("Take the date back", (): void => {
            extraTyped = null;
            redraw();
        }),
    );
    row.addEventListener("focusout", (event: FocusEvent): void => {
        if (extraTyped === extra && !row.contains(event.relatedTarget as Node | null) && extraJoin(form)) formFill();
    });
    return row;
}

/** Joins the extra being typed once typed enough, and gives whether it joined. */
function extraJoin(form: Form): boolean {
    const extra: Extra | null = extraTyped;
    if (extra === null || extra.day === "" || ((plain === null || plainTimed) && !timesReady(extra))) return false;
    extraTyped = null;
    if (form.type === examType && kindTyped !== "") form.kinds[extra.day] = kindTyped;
    form.extras.push(extra);
    form.extras.sort((first: Extra, second: Extra): number => first.day.localeCompare(second.day));
    return true;
}

/** The list of the boxes by month, each month short at the left. */
export function monthListOf(items: [string, HTMLElement][]): HTMLElement {
    const list: HTMLElement = elementOf("div", "series-list", "");
    let month: string = "";
    let boxes: HTMLElement = list;
    items.forEach(([moment, row]: [string, HTMLElement]): void => {
        const name: string = new Date(`${moment.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
        });
        if (name !== month) {
            boxes = elementOf("div", "series-boxes", "");
            list.append(elementOf("span", "entry-name series-month", name), boxes);
        }
        month = name;
        boxes.append(row);
    });
    return list;
}

/**
 * The list of the boxes, below them `+` or the extra being typed.
 * A group has no `+`, since its sessions are the university's.
 */
function boxListOf(planned: Planned[], form: Form, redraw: () => void): HTMLElement {
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const items: [string, HTMLElement][] = planned.map((box: Planned): [string, HTMLElement] => [
        box.time || box.day,
        sessionTyped !== null && sessionOf(box)?.id === sessionTyped.id
            ? sessionRowOf(sessionTyped, redraw)
            : boxRowOf(box, had, form),
    ]);
    const list: HTMLElement = monthListOf(items);
    if (grouped === null && (typing === null || !groupWaits(typing)))
        list.append(extraTyped === null ? addRowOf(form, redraw) : draftRowOf(extraTyped, form, redraw));
    return list;
}

/**
 * Shows the boxes a series makes as the reader answers, only the answer to the last question.
 * Nothing while not typed enough, `ask` then `null`.
 *
 * @throws {Error} - When the reader does not answer
 */
async function previewShow(form: Form, ask: (() => Promise<Planned[]>) | null): Promise<void> {
    const asked: number = ++previewsAsked;
    // The row shown only while it shows something, so it never stands empty.
    const put: (shown: Node[]) => void = (shown: Node[]): void => {
        previewShown = shown;
        const place: HTMLElement | null = formElementOf().querySelector(".series-preview");
        place?.replaceChildren(...shown);
        const row: HTMLElement | null = place?.closest<HTMLElement>(".panel-field") ?? null;
        if (row !== null) row.hidden = shown.length === 0;
    };
    if (ask === null) {
        put([]);
        return;
    }
    let planned: Planned[];
    try {
        planned = await ask();
    } catch (error: unknown) {
        if (asked === previewsAsked) put([]);
        throw error;
    }
    if (asked !== previewsAsked) return;
    await boxesLoad(planned);
    if (asked !== previewsAsked) return;
    const draw: () => void = (): void =>
        put([
            summaryOf(planned, (): void => {
                listOpened = !listOpened;
                draw();
            }),
            ...(listOpened ? [boxListOf(planned, form, draw)] : []),
        ]);
    draw();
}

/**
 * Asks the reader for a change of the course as JSON.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function courseSend<T>(address: string, body: object): Promise<T> {
    return readerAsk<T>(address, { method: "POST", body: JSON.stringify(body) });
}

/** Logs an error of the reader and shows the hint above the buttons of the form. */
function failed(error: unknown): void {
    console.error(error);
    formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
}

/** The dialog of a series. */
function dialogOf(): HTMLDialogElement {
    return document.getElementById("series") as HTMLDialogElement;
}

/** Shows the dialog with nothing focused. */
function dialogShow(): void {
    if (!dialogOf().open) dialogOf().showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/**
 * Loads the course of a module in a semester.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function courseLoad(module: string, semester: string): Promise<Course> {
    return readerAsk<Course>(`/api/course/module?module=${encodeURIComponent(module)}&semester=${semester}`);
}

/**
 * Loads the categories with the values of their fields as of now, and the people of `Persons.md`.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function offersLoad(): Promise<[Category[], Person[]]> {
    return Promise.all([
        readerAsk<Category[]>(`/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`),
        personsKept(),
    ]);
}

/** Forgets which series the form was, as another form opens, and takes what saving does next. */
function formsForget(saved: () => void): void {
    repeated = null;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
}

/** Forgets what the form showed and opened, as another form opens. */
function formReset(): void {
    previewForget();
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
}

/** What something does online, each part empty where it has none. */
function onlineOf(source: Partial<Online> | null | undefined): Online {
    return {
        online: source?.online ?? "",
        onlineLink: source?.onlineLink ?? "",
        onlineChannel: source?.onlineChannel ?? "",
        onlineTitle: source?.onlineTitle ?? "",
    };
}

/** The link of a place of mine or a room, empty for none. */
function placeLinkOf(line: string): string {
    return skillFieldOf("location")?.places[line]?.link ?? "";
}

/** The form of a series as its rule reads back, of a new one its type and one slot without weekday. */
function formOf(type: string, rule: Rule | null): Form {
    return {
        type: rule?.type ?? type,
        old: rule,
        slots: rule?.slots.map((slot: Slot): Slot => ({ ...slot })) ?? [{ weekday: 0, start: "", end: "" }],
        before: rule?.slots.map((slot: Slot): number => slot.weekday) ?? [0],
        extras: rule?.extras.map((extra: Extra): Extra => ({ ...extra })) ?? [],
        location: rule?.location ?? "",
        locationLink: rule?.locationLink ?? "",
        ...onlineOf(rule),
        attendees: rule?.attendees ?? [],
        first: rule?.first ?? "",
        last: rule?.last ?? "",
        times: { ...(rule?.times ?? {}) },
        states: {},
        kinds: {},
    };
}

/** The groups of a type of the course of the dialog. */
function groupsOf(type: string): Group[] {
    return (course?.groups ?? []).filter((group: Group): boolean => group.rule.type === type);
}

/** A field of `Skill`, `undefined` while the categories are not loaded. */
function skillFieldOf(key: string): Field | undefined {
    return categories
        .find((category: Category): boolean => category.name === skillName)
        ?.fields.find((field: Field): boolean => field.key === key);
}

/** My default place, `★` in `Places.md`, which every new series starts with, empty for none. */
function standardLineOf(): string {
    const standard: Place | undefined = Object.values(skillFieldOf("location")?.places ?? {}).find(
        (place: Place): boolean => place.standard,
    );
    return standard === undefined ? "" : lineOf(standard);
}

/**
 * The plan a plain series lies in or goes into, from `NomWorkspace` on, empty while not known.
 * A new one goes into the plan of its skill, or of its topic in the year of its first day.
 */
function plainFileOf(series: Plain, form: Form): string {
    if (series.file !== "") return series.file;
    if (series.category === skillName) return skillNamesOf({ module: series.module, type: series.type }).file;
    return series.category === "" || form.first === "" ? "" : topicFileOf(series.category, form.first, "_Plan.ics");
}

/** Whether the form asks who I am with, for my course and a category with `With`, so not for `Sport`. */
function withAsked(): boolean {
    const category: Category | undefined = categories.find(
        (one: Category): boolean => one.name === (plain?.category ?? repeated?.box.category),
    );
    return (
        (repeated === null && plain === null) ||
        (category?.fields.some((field: Field): boolean => field.key === "with") ?? false)
    );
}

/** Whether the name of the group, new or renamed, is taken by another group of its type. */
function groupTaken(form: Form): boolean {
    return (
        grouped !== null &&
        grouped.group !== grouped.was &&
        groupsOf(form.type).some((group: Group): boolean => group.rule.group === grouped?.group)
    );
}

/** Whether the form is typed enough to make boxes, a group named and not as one there already. */
function formReady(form: Form): boolean {
    if (fresh !== null && (fresh.category === "" || (fresh.category === skillName && fresh.picked.module === "")))
        return false;
    if (plain !== null) return plainReady(plain, form);
    if (form.type === "" && repeated === null) return false;
    return daysReady(form) && !groupTaken(form) && grouped?.group !== "" && !groupWaits(form);
}

/**
 * The exams of the course as the rule of a series, no weekdays and no extras,
 * so its extras are only the dates I add.
 */
function examRuleOf(loaded: Course): Rule {
    const days: string[] = loaded.boxes
        .filter((box: Box): boolean => box.type === examType)
        .map((box: Box): string => box.day);
    return {
        type: examType,
        slots: [],
        extras: [],
        location: "",
        locationLink: "",
        ...onlineOf(null),
        attendees: [],
        first: days[0] ?? dayOf(new Date()),
        last: days[days.length - 1] ?? dayOf(new Date()),
        times: {},
        group: "",
        semester: loaded.semester,
    };
}

/**
 * Lists the exams with the kinds and times I gave them and the dates I added, the earliest first.
 * Without `dry` it writes each exam changed, then each date added as an exam alone.
 *
 * @throws {Error} - When the reader does not take an exam or a date
 */
async function examSend(form: Form, dry: boolean): Promise<Planned[]> {
    const timed: (day: string, times: Pick<Slot, "start" | "end">) => [Date, number] = (
        day: string,
        times: Pick<Slot, "start" | "end">,
    ): [Date, number] => {
        const start: Date = new Date(`${day}T${times.start}:00`);
        return [start, (new Date(`${day}T${times.end}:00`).getTime() - start.getTime()) / (60 * 1000)];
    };
    const exams: Planned[] = (course?.boxes ?? [])
        .filter((box: Box): boolean => box.type === examType)
        .map((box: Box): Planned => {
            const [start, minutes]: [Date | null, number | null] =
                form.times[box.day] === undefined ? [null, box.minutes] : timed(box.day, form.times[box.day]);
            const time: string = start === null ? box.time : start.toISOString();
            const number: string = form.kinds[box.day] ?? box.number;
            return {
                ...plannedOf(box),
                time: time,
                minutes: minutes,
                number: number,
                retimable: box.editable && box.todo && !box.series && box.pushed.length === 0,
                change: time === box.time && minutes === box.minutes && number === box.number ? "" : "changed",
            };
        });
    const added: [Extra, Date, number][] = form.extras.map((extra: Extra): [Extra, Date, number] => [
        extra,
        ...timed(extra.day, extra),
    ]);
    if (!dry) {
        for (const exam of exams.filter((one: Planned): boolean => one.change === "changed"))
            await courseSend<null>("/api/course/exam", {
                box: exam.id,
                kind: exam.number,
                start: form.times[exam.day]?.start ?? "",
                end: form.times[exam.day]?.end ?? "",
            });
        for (const [extra, start, minutes] of added) {
            const id: string = await boxAdd({
                category: skillName,
                title: "",
                location: "",
                from: "",
                module: (course?.module ?? "").split("_")[0],
                type: examType,
                semester: course?.semester ?? "",
                note: "",
                day: extra.day,
                time: start,
                minutes: minutes,
                deadline: "",
                chapters: [],
                documents: [],
                attendees: form.attendees,
            });
            if (form.kinds[extra.day] !== undefined)
                await courseSend<null>("/api/course/exam", {
                    box: id,
                    kind: form.kinds[extra.day],
                    start: "",
                    end: "",
                });
        }
    }
    return [
        ...exams,
        ...added.map(([extra, start, minutes]: [Extra, Date, number]): Planned => ({
            id: "",
            day: extra.day,
            time: start.toISOString(),
            minutes: minutes,
            number: form.kinds[extra.day] ?? "",
            state: "new",
            pushed: false,
            editable: true,
            retimable: true,
            change: "new",
            attendees: form.attendees,
        })),
    ].sort((first: Planned, second: Planned): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
}

/**
 * Sends the form to the reader, or with `dry` only tells what it would make.
 *
 * @throws {Error} - When the reader does not take it
 */
async function formSend(form: Form, dry: boolean): Promise<Planned[]> {
    if (plain !== null) return plainSend(plain, form, dry);
    const rule: Omit<Rule, "times" | "group" | "semester"> = {
        type: form.type,
        slots: form.slots,
        extras: form.extras,
        location: form.location,
        locationLink: form.locationLink,
        ...onlineOf(form),
        attendees: form.attendees,
        first: form.first,
        last: form.last,
    };
    if (grouped !== null)
        return courseSend<Planned[]>("/api/course/groups", {
            module: course?.module ?? "",
            made: grouped.made,
            was: grouped.was,
            states: form.states,
            dry: dry,
            rule: {
                ...rule,
                extras: [],
                group: grouped.group,
                semester: course?.semester ?? "",
            },
        });
    if (form.type === examType) return examSend(form, dry);
    if (repeated !== null) return repeatedSend(repeated.box, form, dry);
    return courseSend<Planned[]>("/api/course/series", {
        module: course?.module ?? "",
        old: form.old,
        before: form.before,
        states: form.states,
        dry: dry,
        rule: {
            ...rule,
            times: form.times,
            group: form.old?.group ?? "",
            semester: course?.semester ?? "",
        },
    });
}

/**
 * Sends a new box repeated once per date of the form, with the states I gave its boxes.
 *
 * @throws {Error} - When the reader does not take it, also since the series of its type is there already
 */
async function repeatedSend(box: BoxFields, form: Form, dry: boolean): Promise<Planned[]> {
    const planned: Planned[] | null = await boxRepeat(
        {
            ...box,
            location: form.location,
            ...onlineOf(form),
            attendees: form.attendees,
        },
        form,
        form.states,
        dry,
    );
    if (planned === null) throw new Error(`${box.module} ${box.type} has its series already`);
    return planned;
}

/** The form of the dialog. */
function formElementOf(): HTMLFormElement {
    return document.getElementById("series-form") as HTMLFormElement;
}

/** Locks rows of my series of a type with groups, since they come from the group I pin. */
function lockedOf(locked: boolean, rows: HTMLElement[]): HTMLElement[] {
    rows.forEach((row: HTMLElement): void => {
        row.inert = locked;
    });
    return rows;
}

/**
 * Fills my series that waits for my group, what comes from a group empty,
 * its dates as far as the groups of its type and my boxes know them.
 */
function waitingFill(form: Form): void {
    Object.assign(form, {
        location: "",
        locationLink: "",
        ...onlineOf(null),
        attendees: [],
        slots: [],
    });
    const rules: Rule[] = groupsOf(form.type).map((group: Group): Rule => group.rule);
    const firsts: string[] = [
        form.first,
        ...rules.map((rule: Rule): string => rule.first),
        ...keptOf(form).map((box: Planned): string => box.day),
    ]
        .filter((day: string): boolean => day !== "")
        .sort();
    const lasts: string[] = [form.last, ...rules.map((rule: Rule): string => rule.last)]
        .filter((day: string): boolean => day !== "")
        .sort();
    form.first = firsts[0] ?? "";
    form.last = lasts[lasts.length - 1] ?? "";
}

/** My boxes of the type of my series that waits for my group, which stay whatever group is pinned. */
function keptOf(form: Form): Planned[] {
    return (course?.boxes ?? []).filter((box: Box): boolean => box.type === form.type).map(plannedOf);
}

/** A box there already as a row of the list shows it, to be changed nowhere. */
function plannedOf(box: Box): Planned {
    return {
        id: box.id,
        day: box.day,
        time: box.time,
        minutes: box.minutes,
        number: box.number,
        state: box.state,
        pushed: box.pushed.length > 0,
        editable: false,
        retimable: false,
        change: "",
        attendees: box.attendees,
    };
}

/** Takes a change of the form, allows saving while ready and shows the boxes anew once typing rests. */
function formChanged(): void {
    const save: HTMLButtonElement | null = formElementOf().querySelector(".panel-main");
    if (typing === null || save === null) return;
    const form: Form = typing;
    const kept: Planned[] = groupWaits(form) ? keptOf(form) : [];
    const ask: (() => Promise<Planned[]>) | null = formReady(form)
        ? (): Promise<Planned[]> => formSend(form, true)
        : kept.length > 0
          ? async (): Promise<Planned[]> => kept
          : null;
    save.disabled = !formReady(form);
    clearTimeout(previewWait);
    previewWait = window.setTimeout((): void => {
        previewShow(form, ask).catch(console.error);
    }, 150);
}

/** The address of the place below it, linked while it has a link, never the link as text. */
function addressShow(address: HTMLAnchorElement, form: Form): void {
    const link: string = placeEdit?.link ?? form.locationLink;
    address.textContent = placeEdit !== null ? placeAddressOf(placeEdit) : addressOf(form.location);
    if (link !== "") address.href = link;
    else address.removeAttribute("href");
    address.hidden = address.textContent === "";
}

/** The place of the form before I change it by its parts. */
function placeOriginOf(form: Form): Place {
    return placeOf(form.location, form.locationLink, skillFieldOf("location")?.places ?? {});
}

/**
 * The row `Summary`, never changed here, since it follows from elsewhere.
 * A new one has only its type to pick.
 * Below it the folder of the material of its type, no link until its first box makes it.
 */
function seriesRowOf(form: Form): HTMLElement {
    const module: string = course?.module ?? "";
    const types: string[] = numberedTypes.filter(
        (type: string): boolean =>
            type === form.type || !(course?.series ?? []).some((series: Series): boolean => series.rule.type === type),
    );
    const link: HTMLAnchorElement = elementOf("a", "entry-address", "") as HTMLAnchorElement;
    const folder: MaterialFolder | undefined = repeated === null ? course?.folders[form.type] : undefined;
    folderLinkShow(
        link,
        folder === undefined
            ? (repeated?.link ?? course?.links[form.type] ?? "")
            : `${modulesFolder}/${module}/${folder.path}`,
    );
    if (folder !== undefined && !folder.exists) {
        link.removeAttribute("href");
        link.title = "Not there yet";
    }
    const value: HTMLElement = elementOf("div", "", "");
    if (form.old !== null || repeated !== null || grouped !== null || groupWaits(form))
        value.append(elementOf("span", "", breakableOf(repeated?.summary ?? `${module} (${form.type})`)), link);
    else
        value.append(
            pairOf(
                elementOf("span", "", breakableOf(module)),
                choicesOf({
                    search: searchOf(types.map(choiceOf)),
                    picked: form.type === "" ? [] : [form.type],
                    many: false,
                    adding: false,
                    noun: "type",
                    plus: true,
                    empty: "Pick a type",
                    pick: (values: string[]): void => {
                        form.type = values[0] ?? "";
                        grouped = null;
                        formFill();
                    },
                }),
            ),
            link,
        );
    const row: HTMLElement = rowOf("Summary", value);
    row.classList.add("panel-fixed");
    return row;
}

/**
 * The search of a place, while nothing is typed my places and the place there already,
 * my default place first, as I type the rooms of the university too.
 */
function placeSearchOf(current: string, nameShown: (line: string) => string): (text: string) => Promise<Choice[]> {
    const field: Field | undefined = skillFieldOf("location");
    return async (text: string): Promise<Choice[]> => {
        const values: string[] =
            text.trim() === ""
                ? [...(field?.values ?? []), ...(current === "" ? [] : [current])]
                : [...(field?.values ?? []), ...(field?.rooms ?? [])];
        const places: { [line: string]: Place } = field?.places ?? {};
        return await searchOf(
            standardFirst([...new Set(values)], places).map((value: string): Choice =>
                placeChoiceOf(value, nameShown(value), places),
            ),
        )(text);
    };
}

/**
 * The row of the place, below it its address and its parts behind the pencil.
 * The row is built anew once I leave a part, the part I went on to keeping the cursor.
 */
function placeRowOf(form: Form): HTMLElement {
    const field: Field | undefined = skillFieldOf("location");
    const address: HTMLAnchorElement = document.createElement("a");
    const parts: HTMLElement = elementOf("div", "field-parts", "");
    const pencil: HTMLButtonElement = iconButtonOf("entry-pencil", Pencil, "Change the place", (): void => {
        placeOpen = !placeOpen;
        parts.hidden = !placeOpen;
        if (placeOpen) parts.querySelector("input")?.focus();
    });
    const nameShown: (line: string) => string = (line: string): string =>
        line === form.location && placeEdit !== null && placeEdit.name !== "" ? placeEdit.name : labelOf(line);
    address.className = "entry-address";
    address.target = "_blank";
    address.rel = "noopener";
    addressShow(address, form);
    pencil.hidden = form.location === "";
    parts.hidden = !placeOpen;
    const row: HTMLElement = rowOf(
        "Place",
        choicesOf({
            search: placeSearchOf(form.location, nameShown),
            picked: form.location === "" ? [] : [form.location],
            many: false,
            adding: false,
            noun: "place",
            textOf: nameShown,
            aside: [pencil],
            below: [address, parts],
            pick: (values: string[]): void => {
                const line: string = values[0] ?? "";
                if (line === form.location) return;
                form.location = line;
                form.locationLink = field?.places[line]?.link ?? "";
                placeEdit = null;
                formFill();
            },
        }),
    );
    parts.append(
        ...placeEditOf(
            placeEdit ?? placeOriginOf(form),
            (typed: Place): void => {
                placeEdit = typed;
            },
            (next: string | null): void => {
                row.replaceWith(placeRowOf(form));
                formElementOf().querySelector<HTMLInputElement>(`input[aria-label="${next}"]`)?.focus();
            },
        ),
    );
    return row;
}

/** The row `Online`, none while the categories are not loaded. */
function onlineRowsOf(form: Form): HTMLElement[] {
    const field: Field | undefined = skillFieldOf("online");
    return field === undefined
        ? []
        : [
              onlineRowOf({
                  field: field,
                  categories: categories,
                  online: onlineOf(form),
                  open: onlineOpen,
                  opened: (open: boolean): void => {
                      onlineOpen = open;
                  },
                  pick: (online: Online): void => {
                      Object.assign(form, online);
                      formChanged();
                  },
              }),
          ];
}

/** The row `With`, none while the categories are not loaded. */
function peopleRowsOf(form: Form): HTMLElement[] {
    const field: Field | undefined = skillFieldOf("with");
    return field === undefined
        ? []
        : [
              withRowOf({
                  field: field,
                  persons: persons,
                  people: form.attendees,
                  open: withOpen,
                  edits: personEdits,
                  opened: (open: string[]): void => {
                      withOpen = open;
                  },
                  pick: (people: Attendee[]): void => {
                      form.attendees = people;
                      formChanged();
                  },
              }),
          ];
}

/**
 * The group typed as a group is named, digits filled up to two.
 * A space anywhere makes no name, never trimmed away in silence.
 * Empty for nothing typed, `null` for a text a group may not be named.
 */
function groupTypedOf(text: string): string | null {
    const name: string = /^\d+$/.test(text) ? text.padStart(2, "0") : text;
    return name === "" || /^[\w-]+$/.test(name) ? name : null;
}

/** The name field of a group beside its semester, a hint beside it while the name is taken or invalid. */
function groupPartOf(): HTMLElement {
    const input: HTMLInputElement = partFieldOf("text", grouped?.group ?? "", "Group");
    const hint: HTMLElement = elementOf("span", "entry-none", "");
    const value: HTMLElement = elementOf("div", "series-group-part", "");
    input.placeholder = "Group name";
    hint.hidden = true;
    input.addEventListener("input", (): void => {
        const name: string | null = groupTypedOf(input.value);
        grouped = {
            group: name ?? "",
            made: grouped?.made ?? true,
            was: grouped?.was ?? "",
        };
        hint.hidden = name !== null && (typing === null || !groupTaken(typing));
        hint.textContent = name === null ? "Invalid group name" : "Group is there already";
        formChanged();
    });
    value.append(input, hint);
    return value;
}

/** The menu of the groups of my series beside its semester, a pick making the group mine, then `+`. */
function groupPickOf(form: Form): HTMLElement {
    const loaded: Course | null = course;
    const plus: HTMLButtonElement = plusOf("Add a group", (): void => groupFrom(form, ""));
    const part: HTMLElement = elementOf("span", "series-group-pick", "");
    if (loaded !== null && groupsOf(form.type).length > 0)
        part.append(
            pinnedMenuOf(
                loaded,
                form.type,
                (_change: () => void, send: () => Promise<unknown>): void => {
                    send()
                        .then((): Promise<void> => seriesOpen(loaded.module, form.type, loaded.semester, done))
                        .catch(console.error);
                },
                (group: string): void => groupFrom(form, group),
            ),
        );
    part.append(plus);
    return part;
}

/** Whether my series of a type with groups waits for my group, since my boxes to come follow it. */
function groupWaits(form: Form): boolean {
    return (
        course !== null &&
        grouped === null &&
        numberedTypes.includes(form.type) &&
        groupsOf(form.type).length > 0 &&
        (form.old?.group ?? "") === ""
    );
}

/**
 * Opens a group from my series, my series kept to go back to.
 * A still copy of it stays below, so the group reads as a dialog of its own over my series.
 * The group a little lower right, my series a little higher left, however long either is.
 */
function groupFrom(form: Form, group: string): void {
    const series: HTMLDialogElement = dialogOf();
    const under: HTMLDialogElement = document.getElementById("series-under") as HTMLDialogElement;
    const copy: HTMLElement = formElementOf().cloneNode(true) as HTMLElement;
    [copy, ...copy.querySelectorAll<HTMLElement>("[id]")].forEach((part: HTMLElement): void =>
        part.removeAttribute("id"),
    );
    under.replaceChildren(copy);
    under.show();
    under.scrollTop = series.scrollTop;
    groupBack = form;
    groupStart(form.type, group);
    const rem: number = parseFloat(getComputedStyle(document.documentElement).fontSize);
    series.style.translate = "1.5rem 1.5rem";
    const lift: number = series.getBoundingClientRect().top - 3 * rem - under.offsetTop;
    under.style.translate = `-1.5rem ${lift}px`;
}

/** Takes away the still copy of my series below the form of a group. */
function underClose(): void {
    const under: HTMLDialogElement = document.getElementById("series-under") as HTMLDialogElement;
    under.close();
    under.replaceChildren();
    under.style.translate = "";
    dialogOf().style.translate = "";
}

/**
 * Turns the form into that of a group of a type.
 * A new one takes the weeks of the series of its type, else of any series of the course,
 * so it needs only its day, its times and its room.
 */
function groupStart(type: string, group: string): void {
    const found: Group | undefined = groupsOf(type).find((one: Group): boolean => one.rule.group === group);
    const rule: Rule | undefined = found?.rule;
    const weeks: Rule | undefined = (
        course?.series.find((series: Series): boolean => series.rule.type === type) ?? course?.series[0]
    )?.rule;
    grouped = {
        group: group,
        made: found === undefined,
        was: found === undefined ? "" : group,
    };
    repeated = null;
    removeAsked = false;
    formReset();
    typing = {
        ...formOf(type, rule ?? null),
        extras: [],
        times: {},
        ...(rule === undefined
            ? {
                  location: standardLineOf(),
                  locationLink: placeLinkOf(standardLineOf()),
                  first: weeks?.first ?? "",
                  last: weeks?.last ?? "",
              }
            : {}),
    };
    formFill();
}

/** Whether the form has the bin, for a series or group there already, never a new one. */
function binShows(form: Form): boolean {
    if (grouped !== null) return !grouped.made;
    if (plain !== null) return plain.id !== "";
    return course !== null && repeated === null && form.old !== null;
}

/**
 * The bin of a series there already, the first click only asks, the second removes it.
 * My series of a module keeps its boxes done, since log entries point to them.
 */
function seriesBinOf(form: Form): HTMLButtonElement {
    const ask: string = grouped === null && plain === null ? "Really remove? Its boxes done stay" : "Really remove?";
    const address: string =
        grouped !== null
            ? `/api/course/groups?${new URLSearchParams({
                  module: course?.module ?? "",
                  type: form.type,
                  group: grouped.was || grouped.group,
                  semester: course?.semester ?? "",
              })}`
            : plain !== null
              ? `/api/day/plain?${new URLSearchParams({ id: plain.id })}`
              : `/api/course/series?${new URLSearchParams({
                    module: course?.module ?? "",
                    type: form.type,
                    semester: course?.semester ?? "",
                })}`;
    const bin: HTMLButtonElement = iconButtonOf(
        "panel-remove",
        Trash,
        grouped !== null ? "Remove the group" : "Remove the series",
        (): void => {
            if (!removeAsked) {
                removeAsked = true;
                iconPut(bin, QuestionMark, ask);
                return;
            }
            readerAsk<unknown>(address, { method: "DELETE" }).then(formDone).catch(failed);
        },
        true,
    );
    return bin;
}

/**
 * Builds the rows of the form anew from what it holds.
 * The scroll is read before, since building takes the boxes out and would scroll the dialog up.
 * Save takes no focus, else the rows built anew under the pointer would lose the click.
 * While my series waits for my group its rows stand as with a group, so pinning makes none appear.
 */
function formFill(): void {
    if (typing === null) return;
    const dialog: HTMLDialogElement = dialogOf();
    const scrolled: number = dialog.scrollTop;
    const form: Form = typing;
    const picking: boolean =
        (fresh !== null && (fresh.category === "" || (fresh.category === skillName && fresh.picked.module === ""))) ||
        (plain === null && repeated === null && course === null);
    const waits: boolean = groupWaits(form);
    const follows: boolean = waits || (grouped === null && plain === null && (form.old?.group ?? "") !== "");
    if (waits) waitingFill(form);
    const rows: HTMLElement[] = picking
        ? []
        : plain !== null
          ? plainRowsOf(plain, form)
          : form.type === examType
            ? [seriesRowOf(form), semesterRowOf(courseSemesterOf()), boxesRowOf()]
            : [
                  seriesRowOf(form),
                  semesterRowOf(courseSemesterOf()),
                  ...lockedOf(follows, [
                      placeRowOf(form),
                      ...onlineRowsOf(form),
                      ...courseTimeRowsOf(form),
                      datesRowOf(form, formChanged),
                  ]),
                  boxesRowOf(),
                  ...lockedOf(follows, grouped !== null || withAsked() ? peopleRowsOf(form) : []),
              ];
    const fields: HTMLElement = elementOf("div", "panel-form", "");
    if (grouped !== null) fields.append(elementOf("h2", "series-heading", "Series: Group"));
    fields.append(
        ...(fresh === null ? rows : [...freshRowsOf(), ...(fresh.category === skillName ? rows.slice(1) : rows)]),
    );
    const buttons: HTMLElement = elementOf("div", "panel-buttons", "");
    const cancel: HTMLButtonElement = iconButtonOf(
        "",
        X,
        "Cancel",
        (): void => {
            groupReturn(false)
                .then((back: boolean): void => {
                    if (!back) dialogOf().close();
                })
                .catch(console.error);
        },
        true,
    );
    const save: HTMLButtonElement = iconButtonOf("panel-main", Check, "Save", (): void => {}, true);
    save.type = "submit";
    const hint: HTMLElement = elementOf("p", "panel-error", "Saving failed");
    hint.hidden = true;
    const file: HTMLAnchorElement = elementOf("a", "panel-file", "") as HTMLAnchorElement;
    fileShow(file, plain === null ? (repeated?.file ?? course?.file ?? "") : plainFileOf(plain, form));
    buttons.append(file, ...(binShows(form) ? [seriesBinOf(form)] : []), cancel, save);
    formElementOf().replaceChildren(fields, hint, buttons);
    formElementOf().classList.toggle("series-exams", form.type === examType);
    dialog.scrollTop = scrolled;
    formChanged();
}

/**
 * Writes the place everywhere while I changed it by its parts.
 * Checked before the series is saved, so nothing is written the reader would refuse,
 * written after, so its boxes take it with every other entry.
 *
 * @throws {Error} - When the reader does not take the place, like one with an empty name
 */
async function placeRename(form: Form, dry: boolean): Promise<void> {
    if (form.location !== "" && placeEdit !== null && JSON.stringify(placeEdit) !== JSON.stringify(placeOriginOf(form)))
        await renameSend(labelOf(form.location), placeEdit, dry);
}

/**
 * Saves the form, the extra being typed joined first, so one click on Save takes it.
 * A place and people renamed are checked before and renamed after.
 * A group saved never becomes mine by itself, since pinning is my choice.
 */
async function formSave(): Promise<void> {
    if (typing === null) return;
    if (extraJoin(typing)) formFill();
    if (!formReady(typing)) return;
    try {
        await placeRename(typing, true);
        const picked: string[] = typing.attendees.map((person: Attendee): string => person.name);
        await personsRename(personEdits, persons, true, picked);
        await formSend(typing, false);
        await placeRename(typing, false);
        await personsRename(personEdits, persons, false, picked);
    } catch (error: unknown) {
        failed(error);
        return;
    }
    await formDone();
}

/**
 * Closes the form once saved or removed, a group opened from my series going back to it.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function formDone(): Promise<void> {
    if (await groupReturn(true)) return;
    entryBack = null;
    dialogOf().close();
    done();
}

/**
 * Goes back from a group to my series as I left it, the course reloaded once the group changed.
 * Gives false for a form opened otherwise.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function groupReturn(reload: boolean): Promise<boolean> {
    if (groupBack === null || grouped === null) return false;
    if (reload && course !== null) course = await courseLoad(course.module, course.semester);
    typing = groupBack;
    groupBack = null;
    grouped = null;
    removeAsked = false;
    previewForget();
    underClose();
    formFill();
    return true;
}

/**
 * Starts the buttons and keys of the dialog once for the page.
 * Escape from a group goes back to my series by hand, since the copy below blocks the browser's own.
 */
function dialogStart(): void {
    if (dialogStarted) return;
    dialogStarted = true;
    const dialog: HTMLDialogElement = dialogOf();
    formElementOf().addEventListener("submit", (event: SubmitEvent): void => {
        event.preventDefault();
        formSave().catch(console.error);
    });
    formElementOf().addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement) || event.defaultPrevented) return;
        event.preventDefault();
        event.target.blur();
        if (event.ctrlKey) formSave().catch(console.error);
    });
    const entry: HTMLDialogElement = document.getElementById("entry") as HTMLDialogElement;
    entry.addEventListener("close", (): void => {
        if (!entry.open) entry.removeAttribute("data-over");
        if (dialog.open && !entry.open) seriesRefresh().catch(console.error);
    });
    const back: (event: Event) => void = (event: Event): void => {
        if (
            groupBack === null ||
            !dialog.open ||
            (event instanceof KeyboardEvent &&
                (event.key !== "Escape" || document.querySelector(":popover-open") !== null))
        )
            return;
        event.preventDefault();
        groupReturn(false).catch(console.error);
    };
    dialog.addEventListener("cancel", back);
    document.addEventListener("keydown", back);
    dialog.addEventListener("close", (): void => {
        underClose();
        if (entryBack !== null) entryBackShow(entryBack).catch(console.error);
        entryBack = null;
        typing = null;
        plain = null;
        grouped = null;
        personEdits = {};
        previewForget();
    });
}

/**
 * Opens the dialog of a series of a type of a module in a semester, new for a type without one.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function seriesOpen(
    module: string,
    type: string,
    semester: string,
    saved: () => void = (): void => {},
): Promise<void> {
    dialogStart();
    fresh = null;
    formsForget(saved);
    [course, [categories, persons]] = await Promise.all([courseLoad(module, semester), offersLoad()]);
    const rule: Rule | null =
        course.series.find((series: Series): boolean => series.rule.type === type)?.rule ??
        (type === examType ? examRuleOf(course) : null);
    formReset();
    listOpened = type === examType;
    typing = formOf(type, rule);
    kindTyped = "";
    formFill();
    dialogShow();
    if (rule === null && type === "") formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/**
 * Opens a group of the tutorials of a module in the form.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function groupOpen(module: string, type: string, semester: string, group: string): Promise<void> {
    dialogStart();
    fresh = null;
    groupBack = null;
    plain = null;
    done = (): void => {};
    [course, [categories, persons]] = await Promise.all([courseLoad(module, semester), offersLoad()]);
    groupStart(type, group);
    dialogShow();
}

/**
 * Shows my new series of a numbered type, the one there already if there is one,
 * so making a series and changing one are one dialog.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRepeat(from: Repeated, days: Days, saved: () => void): Promise<void> {
    const loaded: [Course | null, [Category[], Person[]]] = await Promise.all([
        courseLoad(from.box.module, from.box.semester).catch((): null => null),
        offersLoad(),
    ]);
    if (loaded[0]?.series.some((series: Series): boolean => series.rule.type === from.box.type) === true) {
        await seriesOpen(from.box.module, from.box.type, from.box.semester, saved);
        return;
    }
    dialogStart();
    [course, [categories, persons]] = loaded;
    formsForget(saved);
    repeated = from;
    formReset();
    typing = {
        ...days,
        type: from.box.type,
        old: null,
        location: from.box.location,
        locationLink: placeLinkOf(from.box.location),
        ...onlineOf(from.box),
        attendees: from.box.attendees ?? [],
        states: {},
        kinds: {},
    };
    formFill();
    dialogShow();
}

/** Whether a plain series is typed enough to make boxes, its last day optional. */
function plainReady(series: Plain, form: Form): boolean {
    const days: boolean =
        form.slots.length > 0 &&
        form.slots.every(
            (slot: Slot): boolean =>
                slot.weekday > 0 && (plainTimed ? timesReady(slot) : (plainLengths.get(slot.weekday) ?? 0) > 0),
        ) &&
        new Set(form.slots.map((slot: Slot): number => slot.weekday)).size === form.slots.length;
    const named: boolean = series.category === skillName ? series.module !== "" : series.title.trim() !== "";
    return named && days && form.first !== "" && (form.last === "" || form.first <= form.last);
}

/**
 * The parts a plain series is written as, one per time, since a rule has one time,
 * and the `UID`s of the parts that go.
 * A part keeps its `UID` where its time stays, so its days stay as they are.
 * A new time takes a part whose time went, so a series whose one time changes stays that series.
 * The parts of several times share one `X-SERIES`, a series of one time has none.
 * Its extras go with the part being changed, else with the first part.
 * Each part keeps its own first day while the form keeps the earliest.
 */
function plainPartsOf(series: Plain, form: Form): [Plain[], string[]] {
    const texts: Plain = {
        ...series,
        location: form.location,
        ...onlineOf(form),
        attendees: form.attendees,
        first: form.first,
        last: form.last,
        extras: [],
        parts: [],
    };
    const was: Plain[] =
        series.id === ""
            ? []
            : (series.parts.length > 0 ? series.parts : [series]).sort(
                  (first: Plain, second: Plain): number =>
                      Number(second.id === series.id) - Number(first.id === series.id),
              );
    const keyOf: (start: string, end: string, minutes: number | null) => string = (
        start: string,
        end: string,
        minutes: number | null,
    ): string => (plainTimed ? `${start}-${end}` : String(minutes));
    const groups: Map<string, number[]> = new Map();
    form.slots.forEach((slot: Slot): void => {
        const time: string = keyOf(slot.start, slot.end, plainLengths.get(slot.weekday) ?? null);
        groups.set(time, [...(groups.get(time) ?? []), slot.weekday]);
    });
    const owners: Map<string, Plain> = new Map();
    was.filter(
        (part: Plain): boolean =>
            (part.start !== "") === plainTimed && groups.has(keyOf(part.start, part.end, part.minutes)),
    ).forEach((part: Plain): void => {
        owners.set(keyOf(part.start, part.end, part.minutes), part);
    });
    const free: Plain[] = was.filter((part: Plain): boolean => ![...owners.values()].includes(part));
    [...groups.keys()]
        .filter((time: string): boolean => !owners.has(time))
        .forEach((time: string): void => {
            const part: Plain | undefined = free.shift();
            if (part !== undefined) owners.set(time, part);
        });
    const key: string =
        groups.size < 2
            ? ""
            : series.series || series.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const earliest: string = was.map((part: Plain): string => part.first).sort()[0] ?? "";
    const kept: string =
        [...owners.entries()].find(([, part]: [string, Plain]): boolean => part.id === series.id)?.[0] ??
        [...groups.keys()][0];
    const parts: Plain[] = [...groups.entries()].map(([time, weekdays]: [string, number[]]): Plain => ({
        ...texts,
        id: owners.get(time)?.id ?? "",
        start: plainTimed ? time.split("-")[0] : "",
        first:
            owners.get(time) !== undefined && form.first === earliest
                ? (owners.get(time)?.first ?? form.first)
                : form.first,
        end: plainTimed ? time.split("-")[1] : "",
        minutes: plainTimed ? null : Number(time),
        weekdays:
            weekdays[0] >= monthly ? [] : weekdays.sort((first: number, second: number): number => first - second),
        monthDay: weekdays[0] >= monthly ? Number(form.first.slice(8)) : 0,
        month: weekdays[0] === yearly ? Number(form.first.slice(5, 7)) : 0,
        series: key,
        extras:
            time !== kept
                ? []
                : plainTimed
                  ? form.extras
                  : form.extras.map((extra: Extra): Extra => ({
                        day: extra.day,
                        start: "",
                        end: "",
                    })),
    }));
    return [parts, free.map((part: Plain): string => part.id)];
}

/**
 * Sends a plain series part by part, then each part that goes.
 * Of a series begun, a new part starts today at the earliest, its sibling the series changed.
 * A day one part takes from another counts once, as what really happens to it.
 *
 * @throws {Error} - When the reader does not take a part
 */
async function plainSend(series: Plain, form: Form, dry: boolean): Promise<Planned[]> {
    const planned: Planned[] = [];
    const today: string = dayOf(new Date());
    const begun: boolean = series.id !== "" && series.first < today;
    const [parts, gone]: [Plain[], string[]] = plainPartsOf(series, form);
    for (const part of parts)
        planned.push(
            ...(await courseSend<Planned[]>("/api/day/plain", {
                ...part,
                first: begun && part.id === "" && part.first < today ? today : part.first,
                dry: dry,
                sibling: begun && part.id === "" ? series.id : "",
            })),
        );
    for (const id of gone)
        planned.push(
            ...(await courseSend<Planned[]>("/api/day/plain", {
                id: id,
                gone: true,
                dry: dry,
            })),
        );
    const removed: Planned[] = planned.filter((box: Planned): boolean => box.change === "removed");
    const moved: (box: Planned) => Planned | undefined = (box: Planned): Planned | undefined =>
        box.change === "new" ? removed.find((gone: Planned): boolean => gone.day === box.day) : undefined;
    return planned
        .filter(
            (box: Planned, index: number): boolean =>
                box.chained !== true || planned.findIndex((other: Planned): boolean => other.id === box.id) === index,
        )
        .filter(
            (box: Planned): boolean =>
                box.change !== "removed" ||
                !planned.some((other: Planned): boolean => other.change === "new" && other.day === box.day),
        )
        .map((box: Planned): Planned => {
            const gone: Planned | undefined = moved(box);
            return gone === undefined
                ? box
                : {
                      ...box,
                      state: gone.state,
                      change: gone.time === box.time && gone.minutes === box.minutes ? "" : "changed",
                  };
        })
        .sort((first: Planned, second: Planned): number =>
            (first.time || first.day).localeCompare(second.time || second.day),
        );
}

/**
 * The row `Day` of my course or a group with the switch between times and a length.
 * From times to a length each day takes the length of its times.
 */
function courseTimeRowsOf(form: Form): HTMLElement[] {
    const timed: boolean = form.slots.every((slot: Slot): boolean => slot.minutes === undefined);
    const swap: HTMLButtonElement = lengthSwapOf(timed, (): void => {
        form.slots = form.slots.map((slot: Slot): Slot => ({
            weekday: slot.weekday,
            start: "",
            end: "",
            ...(timed ? { minutes: timesReady(slot) ? minutesOf(slot.end) - minutesOf(slot.start) : 0 } : {}),
        }));
        formChanged();
        formFill();
    });
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement =>
        lengthFieldOf(
            slot.minutes ?? null,
            `How long on ${weekdayNameOf(slot.weekday, false)}`,
            (minutes: number | null): void => {
                slot.minutes = minutes ?? 0;
            },
            formChanged,
        );
    return slotRowsOf(form, [swap], timed ? null : lengthOf);
}

/** The row `Day` of a plain series with the switch between times and a length. */
function plainTimeRowsOf(form: Form): HTMLElement[] {
    const swap: HTMLButtonElement = lengthSwapOf(plainTimed, (): void => {
        if (plainTimed)
            plainLengths = new Map(
                form.slots.map((slot: Slot): [number, number | null] => [
                    slot.weekday,
                    timesReady(slot)
                        ? minutesOf(slot.end) - minutesOf(slot.start)
                        : (plainLengths.get(slot.weekday) ?? null),
                ]),
            );
        form.slots = form.slots.map((slot: Slot): Slot => ({ weekday: slot.weekday, start: "", end: "" }));
        plainTimed = !plainTimed;
        formFill();
    });
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement => {
        const minutes: number | null =
            plainLengths.get(slot.weekday) ??
            plainLengths.get(form.slots[0]?.weekday ?? 0) ??
            [...plainLengths.values()].find((one: number | null): boolean => one !== null) ??
            null;
        plainLengths.set(slot.weekday, minutes);
        return lengthFieldOf(
            minutes,
            `How long on ${dayNameOf(slot.weekday)}`,
            (typed: number | null): void => {
                plainLengths.set(slot.weekday, typed);
            },
            formChanged,
        );
    };
    return slotRowsOf(form, [swap], plainTimed ? null : lengthOf, true);
}

/** The rows of a plain series, no category, which stays that of the box it opened from. */
function plainRowsOf(series: Plain, form: Form): HTMLElement[] {
    return [
        rowOf("Summary", plainSummaryOf(series)),
        ...(series.category === skillName ? [semesterRowOf(series.semester || semesterOf(form.first))] : []),
        placeRowOf(form),
        ...onlineRowsOf(form),
        ...plainTimeRowsOf(form),
        datesRowOf(form, formChanged),
        boxesRowOf(),
        ...(withAsked() ? peopleRowsOf(form) : []),
    ];
}

/** The summary of a plain series, of a skill a text, since what a skill box is follows from its skill. */
function plainSummaryOf(series: Plain): HTMLElement {
    const field: Field | undefined =
        series.category === skillName
            ? undefined
            : categories
                  .find((category: Category): boolean => category.name === series.category)
                  ?.fields.find((one: Field): boolean => one.key === "title");
    if (field === undefined) {
        const title: HTMLInputElement = partFieldOf("text", series.title, "Summary");
        title.addEventListener("input", (): void => {
            series.title = title.value;
            formChanged();
        });
        return title;
    }
    const rankOf: (value: string) => number = (value: string): number =>
        field.values.includes(value) ? field.values.indexOf(value) : field.values.length;
    const pencil: HTMLButtonElement = iconButtonOf("entry-pencil", Pencil, "Change the summary", (): void => {});
    pencil.hidden = series.title === "";
    const picker: HTMLElement = choicesOf({
        search: summarySearchOf(series.category, field.values),
        picked: series.title === "" ? [] : field.many === true ? series.title.split(", ") : [series.title],
        many: field.many === true,
        adding: !field.fixed,
        noun: "summary",
        order:
            field.many !== true || field.fixed
                ? undefined
                : (chosen: string[]): string[] =>
                      [...chosen].sort((first: string, second: string): number => rankOf(first) - rankOf(second)),
        aside: [pencil],
        pick: (values: string[]): void => {
            series.title = values.join(", ");
            pencil.hidden = series.title === "";
            formChanged();
        },
    });
    pencil.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        picker.querySelector<HTMLButtonElement>(".picker-line")?.click();
    });
    return picker;
}

/**
 * Opens the dialog for a plain series, filled from the series and its parts.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function plainStart(series: Plain, saved: () => void): Promise<void> {
    const parts: Plain[] = series.parts.length > 0 ? series.parts : [series];
    const daysOf: (part: Plain) => number[] = (part: Plain): number[] =>
        part.month > 0 ? [yearly] : part.monthDay > 0 ? [monthly] : part.weekdays;
    const loaded: [Category[], Person[]] = await offersLoad();
    dialogStart();
    [categories, persons] = loaded;
    course = null;
    formsForget(saved);
    plain = series;
    plainTimed = series.start !== "";
    plainLengths = new Map(
        parts.flatMap((part: Plain): [number, number | null][] =>
            daysOf(part).map((weekday: number): [number, number | null] => [weekday, part.minutes]),
        ),
    );
    formReset();
    const slots: Slot[] = parts
        .flatMap((part: Plain): Slot[] =>
            daysOf(part).map((weekday: number): Slot => ({
                weekday: weekday,
                start: part.start,
                end: part.end,
            })),
        )
        .sort((first: Slot, second: Slot): number => first.weekday - second.weekday);
    typing = {
        ...formOf("", null),
        slots: slots,
        before: slots.map((): number => 0),
        extras: parts
            .flatMap((part: Plain): Extra[] => part.extras.map((extra: Extra): Extra => ({ ...extra })))
            .sort((first: Extra, second: Extra): number => first.day.localeCompare(second.day)),
        location: series.location,
        locationLink: placeLinkOf(series.location),
        ...onlineOf(series),
        attendees: series.attendees,
        first: parts.map((part: Plain): string => part.first).sort()[0],
        last: series.last,
    };
    formFill();
    dialogShow();
}

/**
 * Opens the dialog of a plain series by its `UID`.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function plainOpen(id: string, saved: () => void): Promise<void> {
    fresh = null;
    await plainStart(await readerAsk<Plain>(`/api/day/plain?id=${encodeURIComponent(id)}`), saved);
}

/** A new plain series from a day on its weekday, without times, at my default place. */
function plainNewOf(category: string, module: string, type: string, semester: string, day: string): Plain {
    return {
        id: "",
        category: category,
        title: "",
        module: module,
        type: type,
        semester: semester,
        location: standardLineOf(),
        ...onlineOf(null),
        attendees: [],
        weekdays: [weekdayOf(day)],
        monthDay: 0,
        month: 0,
        start: "",
        end: "",
        minutes: null,
        first: day,
        last: "",
        extras: [],
        file: "",
        series: "",
        parts: [],
    };
}

/**
 * Opens my own learning of a module as a plain series, else a new one without type from today.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function learningOpen(module: string, semester: string, id: string): Promise<void> {
    fresh = null;
    if (id !== "") {
        await plainOpen(id, (): void => {});
        return;
    }
    const today: string = dayOf(new Date());
    await plainStart(plainNewOf(skillName, module, "", semester, today), (): void => {});
}

/** The rows on top of a new series, its category and of a skill its skill and type. */
function freshRowsOf(): HTMLElement[] {
    if (fresh === null) return [];
    const category: HTMLElement = rowOf(
        "Category",
        choicesOf({
            search: searchOf(categories.map((one: Category): Choice => choiceOf(one.name))),
            picked: fresh.category === "" ? [] : [fresh.category],
            many: false,
            adding: false,
            noun: "category",
            pick: (values: string[]): void => {
                if (fresh === null) return;
                fresh = {
                    ...fresh,
                    category: values[0] ?? "",
                    picked: { module: "", type: "" },
                };
                freshFollow().catch(console.error);
            },
        }),
    );
    if (fresh.category !== skillName) return [category];
    const holder: HTMLElement = elementOf("div", "", "");
    skillPairOf(fresh.picked, (picked: ModuleType): void => {
        if (fresh === null) return;
        fresh = { ...fresh, picked: picked };
        freshFollow().catch(console.error);
    })
        .then((pair: HTMLElement): void => holder.replaceChildren(pair))
        .catch(console.error);
    return [category, rowOf("Summary", holder)];
}

/** The semester of a series of my course, of its course, the box it repeats or as picked. */
function courseSemesterOf(): string {
    return course?.semester ?? repeated?.box.semester ?? fresh?.semester ?? "";
}

/**
 * The row `Semester`, picked from those of its skill, never typed.
 * Picking another shows the form of that semester,
 * since a series of my course is one of a module, a type and a semester.
 * Of a numbered type the group stands beside it.
 */
function semesterRowOf(semester: string): HTMLElement {
    const module: string =
        plain?.module ??
        repeated?.box.module ??
        (course === null ? (fresh?.picked.module ?? "") : course.module.split("_")[0]);
    const day: string = typing?.first || dayOf(new Date());
    const picker: HTMLElement = choicesOf({
        search: async (text: string): Promise<Choice[]> => searchOf(await semestersOf(module, day, semester))(text),
        picked: semester === "" ? [] : [semester],
        many: false,
        adding: false,
        noun: "semester",
        pick: (values: string[]): void => {
            if ((values[0] ?? semester) !== semester) semesterSwitch(values[0]).catch(console.error);
        },
    });
    const form: Form | null = typing;
    if (plain !== null || course === null || form === null || !numberedTypes.includes(form.type))
        return rowOf("Semester", picker);
    const pair: HTMLDivElement = pairOf(picker, grouped === null ? groupPickOf(form) : groupPartOf());
    pair.classList.add("series-semester");
    return rowOf("Semester", pair);
}

/**
 * Shows the same series, group or new series in another semester, new while it has none.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function semesterSwitch(semester: string): Promise<void> {
    if (plain !== null) {
        plain.semester = semester;
        formFill();
        return;
    }
    if (fresh !== null && grouped === null) {
        fresh = { ...fresh, semester: semester };
        await freshFollow();
        return;
    }
    const module: string = course?.module ?? repeated?.box.module ?? "";
    const type: string = typing?.type ?? "";
    if (grouped !== null) await groupOpen(module, type, semester, grouped.group);
    else await seriesOpen(module, type, semester, done);
}

/**
 * Shows the form the rows on top of a new series picked, the exams, my series of a type,
 * else a new plain series, the rows on top staying above every new one.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function freshFollow(): Promise<void> {
    if (fresh === null) return;
    const day: string = fresh.day;
    const picked: ModuleType = fresh.picked;
    const skill: boolean = fresh.category === skillName;
    if (fresh.category === "" || (skill && picked.module === "")) {
        plain = null;
        repeated = null;
        course = null;
        formFill();
        return;
    }
    if (skill && picked.type === examType) {
        await seriesOpen(picked.module, examType, fresh.semester, done);
        return;
    }
    if (skill && numberedTypes.includes(picked.type)) {
        const names: { title: string; link: string; file: string } = skillNamesOf(picked);
        const kept: NonNullable<typeof fresh> = fresh;
        await seriesRepeat(
            {
                box: {
                    category: skillName,
                    title: "",
                    location: standardLineOf(),
                    from: "",
                    module: picked.module,
                    type: picked.type,
                    semester: fresh.semester,
                    note: "",
                    day: day,
                    time: null,
                    minutes: null,
                    deadline: "",
                    chapters: [],
                    documents: [],
                    attendees: [],
                },
                summary: names.title,
                link: names.link,
                file: names.file,
            },
            {
                slots: [{ weekday: weekdayOf(day), start: "", end: "" }],
                before: [0],
                extras: [],
                first: day,
                last: "",
                times: {},
            },
            done,
        );
        if (course !== null && course.series.some((series: Series): boolean => series.rule.type === picked.type))
            return;
        fresh = kept;
        formFill();
        return;
    }
    await plainStart(
        skill
            ? plainNewOf(skillName, picked.module, picked.type, fresh.semester, day)
            : plainNewOf(fresh.category, "", "", "", day),
        done,
    );
}

/**
 * Opens a new series from nothing, its first day the day shown.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function seriesNew(day: string, saved: () => void): Promise<void> {
    const loaded: [Category[], Person[]] = await offersLoad();
    dialogStart();
    [categories, persons] = loaded;
    fresh = {
        day: day,
        category: "",
        picked: { module: "", type: "" },
        semester: semesterOf(day),
    };
    course = null;
    formsForget(saved);
    formReset();
    typing = {
        ...formOf("", null),
        slots: [{ weekday: weekdayOf(day), start: "", end: "" }],
        location: standardLineOf(),
        locationLink: placeLinkOf(standardLineOf()),
        first: day,
    };
    formFill();
    dialogShow();
    formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}
