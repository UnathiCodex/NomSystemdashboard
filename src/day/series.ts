/**
 * ## Series
 *
 * The one form of a series of my course, the lectures, exercises,
 * tutorials and sheets of a module in a semester, see `reader/course.ts`.
 * It opens from the series icon ⟳ in the dialog of a box, see `./categories.ts`,
 * from the page of its module, see `../editor/course.ts`,
 * and new from nothing by `⟳` beside `+` of the plan, see {@link seriesNew}.
 * The same dialog in all places, {@link seriesOpen}, so a change is one and the same.
 * Opened over the dialog of a box, closing it goes back to that dialog as it was,
 * and saving it closes both.
 * It looks like the dialog of an entry, one row per field, see `./choices.ts`.
 * At the bottom the plan it writes into, small and grey, Cancel and Save.
 * Nothing is written before I save.
 * Then the reader changes only open boxes from today on, a box done, skipped,
 * cancelled or pushed staying as it is, but for the times I typed for a box,
 * which every box takes but one pushed, and numbers the series anew,
 * see `seriesApply` in `reader/course.ts`.
 * The exams of a module, single dates the reader reads back as no series,
 * open in the same dialog, see {@link examRuleOf}:
 * only what they are and their boxes, each exam with its kind, see {@link kindMenuOf}.
 * Of a numbered type of a module the row `Semester` has the group beside the semester:
 * the menu of the groups of the type, my group pinned, see {@link groupPickOf},
 * each group opening in this same form, see {@link groupOpen},
 * closing it going back to my series, see {@link groupReturn}.
 * While no group is mine, my series shows the same rows, empty and locked,
 * since its place, days and people come from the group, see {@link groupWaits}.
 * The first group made while none is mine becomes mine as it is saved.
 * So I make the groups of my tutorials by hand as the university lists them,
 * saved as one weekly to-do per weekday, its past kept and a change going on from today,
 * see `groupApply` in `reader/course.ts`.
 * Enter confirms only its field, Ctrl+Enter saves, Escape and a click beside it cancel.
 *
 * The boxes a series makes stay one calm line, see {@link previewSoon},
 * as the reader would write them, anew a moment after each change:
 * how many, what a change does, and how many happen and how many not.
 * A tap on it opens them below it as a list by month,
 * each box one row built by the same code as a row of a card on the page of its module,
 * see `./rows.ts`, so both look and work alike.
 * A box there already opens in the dialog of an entry over this one, see {@link boxShow},
 * and has its actions as in the plan, each done at once.
 * A box not written yet has `Cancel`, which marks it cancelled by the university,
 * so a date that does not take place stays, without number,
 * and an extra has `Remove`, both kept in the form until I save.
 * A day the university does not teach has no box,
 * see `lectureFreeOf` in `reader/course.ts`.
 * `+` below the list adds an extra, a single date besides its weeks.
 *
 * Every other series is a plain one, one to-do that repeats by its rule,
 * see `reader/rules.ts` and {@link plainOpen}:
 * the same dialog without numbers, types and groups,
 * its weekdays, or `Month` or `Year` on the day of its first day,
 * written per time, or by a switch only how long they last, since a rule has one time,
 * see {@link plainTimeRowsOf}.
 * Saved, the past of a series never changes, see `plainApply` in `reader/rules.ts`:
 * one lying wholly ahead is written whole,
 * one that began before today ends yesterday and goes on with a new one from today,
 * a summary changed alone renames it whole, past days and the series it goes on from too.
 * The dialog of one of its boxes changes that box alone.
 */

import {
    breakableOf,
    choiceOf,
    choicesOf,
    fileShow,
    pairOf,
    partFieldOf,
    rowOf,
    searchOf,
} from "./choices.ts";
import {
    boxTimesOf,
    dateFieldStart,
    dateParse,
    lengthSwapOf,
    lengthTextOf,
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
import {
    boxAdd,
    boxDrop,
    boxLog,
    boxRepeat,
    boxSubmit,
    boxUndo,
    boxUniversity,
} from "./entries.ts";
import {
    boxOpenEdit,
    dayCalendarOf,
    entryBoxOf,
    entryOpenFromBox,
    topicFileOf,
} from "./categories.ts";
import { onlineRowOf, withRowOf } from "./attendance.ts";
import { boxActionsOf } from "./actions.ts";
import { boxesFetch } from "./boxes.ts";
import { boxGroupOf, pinnedMenuOf } from "./groups.ts";
import { whereLinkedOf } from "./places.ts";
import { listRowOf, numberOf, rowTimesOf } from "./rows.ts";
import { dayAdd, dayOf, semesterOf, skillName } from "../skill/attempts.ts";
import { semestersOf, skillNamesOf, skillPairOf } from "./skill.ts";
import { elementOf } from "../food/foods.ts";
import {
    crossPut,
    iconOf,
    iconPut,
    iconWordsOf,
    plusPut,
    QuestionMark,
} from "../icons.ts";
import { menuAnchor, menuItemOf } from "../menu.ts";
import { readerAsk } from "../reader.ts";
import { folderLinkShow, modulesFolder } from "../skill/links.ts";
import { personsKept, personsRename } from "../persons.ts";
import {
    ArrowRight,
    Calendar,
    CalendarMinus,
    CalendarOff,
    Check,
    ChevronDown,
    Pencil,
    Plus,
    Trash,
    X,
} from "lucide";
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
import type { Extra, Planned, Slot, Times } from "../../reader/course.ts";
import type { BoxState } from "../../reader/boxes.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";
import type { Place } from "../../reader/places.ts";
import type { Person } from "../../reader/persons.ts";

/**
 * The days of a series as typed so far.
 *
 * - `before`: For each slot the weekday of the slot of the series as read back
 *   whose boxes it takes, 0 for a slot added,
 *   see `before` of `SeriesChange` in `reader/course.ts`.
 * - `first`, `last`: Empty while not typed as a day.
 * - `times`: The dates of its slots with times of their own, see {@link Times},
 *   of the exams the exams I gave other times.
 */
export type Days = {
    slots: Slot[];
    before: number[];
    extras: Extra[];
    first: string;
    last: string;
    times: Times;
};

/**
 * The state I gave a box of a series in its form until I save,
 * by its identifier, a new one by its day.
 */
export type States = { [id: string]: BoxState };

/** The kinds I gave the exams of a module in their form, by their days, until I save. */
export type Kinds = { [day: string]: string };

/**
 * How the boxes of a series show, see {@link previewSoon}.
 *
 * - `ask`: Asks the reader for its boxes, or a hint why it makes none,
 *   `null` while the series is not typed enough.
 * - `kinds`: Left out for every series but the exams.
 * - `filled`: Builds the rows of the form anew, once a row of a box changed it.
 */
export type Preview = {
    ask: (() => Promise<Planned[] | HTMLElement>) | null;
    days: Days;
    states: States;
    kinds?: Kinds;
    filled: () => void;
};

/**
 * A weekly rule of a series or a group, as the reader sends it and the form sends back,
 * see `Rule` in `reader/course.ts`.
 */
export type Rule = Online & {
    type: string;
    slots: Slot[];
    extras: Extra[];
    location: string;
    locationLink: string;
    attendees: Attendee[];
    first: string;
    last: string;
    times: Times;
    group: string;
    semester: string;
};

/**
 * A series of the course, as the reader sends it: its rule read back from its boxes,
 * and how many boxes it has.
 */
export type Series = {
    rule: Rule;
    count: number;
};

/** A session of a group, as the reader sends it, see `Session` in `reader/course.ts`. */
export type Session = {
    id: string;
    start: string;
    minutes: number;
    location: string;
    locationLink: string;
    changed: boolean;
};

/**
 * A group of the tutorials of a module, as the reader sends it:
 * one to-do per weekday it meets on, its sessions the earliest first.
 */
export type Group = {
    ids: string[];
    rule: Rule;
    sessions: Session[];
};

/**
 * A session of my own learning of a module logged without a box,
 * see `Learned` in `reader/course.ts`.
 */
export type Learned = Online & {
    id: string;
    day: string;
    time: string;
    minutes: number;
    location: string;
    locationLink: string;
    attendees: Attendee[];
    note: string;
};

/**
 * The course of a module in a semester, see `Course` in `reader/course.ts`.
 *
 * - `folders`: The folder of the material of the semester of each type,
 *   also one not there yet.
 * - `links`: The folder a box of each type links, as the reader writes it now.
 * - `file`: Its plan from `NomWorkspace` on.
 */
export type Course = {
    module: string;
    semester: string;
    boxes: Box[];
    learned: Learned[];
    series: Series[];
    groups: Group[];
    folders: { [type: string]: MaterialFolder };
    links: { [type: string]: string };
    file: string;
};

/**
 * The form of a series as typed so far, see {@link seriesOpen},
 * the `before` of its days the weekdays of the slots of `old` whose boxes they take.
 * `old` is the rule as read back when the form opened, `null` for a new series.
 */
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
 * A new series of my course, as the rows on top of the dialog of a new series picked it,
 * see {@link seriesNew}.
 *
 * - `box`: Its fields as that dialog adds a box, see `BoxFields` in `./entries.ts`.
 * - `link`: The folder its summary links, empty for none.
 * - `file`: The plan it writes into, empty while its boxes may fill several.
 */
export type Repeated = {
    box: BoxFields;
    summary: string;
    link: string;
    file: string;
};

/**
 * Types of a series, which carry their number and which the university may cancel,
 * see `numberedTypes` in `reader/boxes.ts`.
 */
export const numberedTypes: string[] = ["VO", "UE", "ZU", "TU", "HU"];

/**
 * Type of the exams of a module, single dates whose `X-NUMBER` is their kind,
 * no series the reader reads back, see {@link examRuleOf}.
 */
const examType: string = "FA";

/** The kinds of an exam, its `X-NUMBER`, in the order they come in a semester. */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/**
 * The day of a monthly plain series among the weekdays of its form, after Sunday,
 * on the day of the month of its first day.
 */
const monthly: number = 8;

/**
 * The day of a yearly plain series among the weekdays of its form, after `Month`,
 * on the day and month of its first day.
 */
const yearly: number = 9;

/** Waiting preview, so typing asks the reader once, a moment after it rests. */
let previewWait: number = 0;

/** How many previews were asked for, so only the answer to the last one shows. */
let previewsAsked: number = 0;

/**
 * What the boxes of the form showed last,
 * so the rows built anew show it at once until the reader answers again.
 */
let previewShown: Node[] = [];

/** Whether the boxes of the form show as a list below their line. */
let listOpened: boolean = false;

/**
 * The boxes of the rows of the list there already, by their identifiers,
 * as loaded with the list last, see {@link boxesLoad}.
 */
let boxesKnown: Map<string, Box> = new Map();

/** The extra being typed below the list of the boxes, `null` while none is. */
let extraTyped: Extra | null = null;

/**
 * The session of the group of the form being changed alone, see {@link sessionRowOf},
 * `null` while none is.
 */
let sessionTyped:
    | (Pick<Session, "id" | "location"> & Pick<Slot, "start" | "end"> & { day: string })
    | null = null;

/** Of the exams, the kind I gave the date being typed, empty while I gave none. */
let kindTyped: string = "";

/**
 * Of the exams, the day of the date added as the dialog opened,
 * whose menu of the kinds opens once its row shows,
 * so I pick its kind first, as after `+`.
 */
let kindAsked: string = "";

/** The course whose series the dialog shows, `null` before it opened. */
let course: Course | null = null;

/** The form of the series in the dialog, `null` while it is closed. */
let typing: Form | null = null;

/**
 * The place of the form as I changed it by its parts, which saving writes everywhere,
 * see {@link placeRename}.
 * `null` while I changed nothing, and once another place is picked.
 */
let placeEdit: Place | null = null;

/** Whether the place of the form shows its parts below it to change. */
let placeOpen: boolean = false;

/**
 * Whether what the series does online shows its parts below it,
 * as in the dialog of an entry.
 */
let onlineOpen: boolean = false;

/**
 * The slots of the form taken back by the toggles of its weekdays since it opened,
 * each its weekday and the weekday of the slot read back whose boxes it had,
 * so the next weekday picked takes those boxes, as a day moved, see {@link slotToggle}.
 */
let slotsFreed: [number, number][] = [];

/**
 * The people of `With` of the form whose parts show below its names,
 * see `withRowOf` in `./attendance.ts`.
 */
let withOpen: string[] = [];

/**
 * Each person of `With` I changed by its parts, by its name as picked,
 * which saving writes everywhere, see `personsRename` in `../persons.ts`.
 */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/** The people of `Persons.md` as kept when the dialog opened, which `With` offers. */
let persons: Person[] = [];

/** The categories with the values of their fields, for the places and the people. */
let categories: Category[] = [];

/** Whether the dialog started, its buttons and keys, see {@link dialogStart}. */
let dialogStarted: boolean = false;

/**
 * The new box of the dialog of an entry the form makes a series of,
 * see {@link seriesRepeat}, `null` for a series of my course.
 */
let repeated: Repeated | null = null;

/**
 * The plain series the form changes or makes, see {@link plainOpen},
 * but what the form holds, `null` for a series of my course.
 */
let plain: Plain | null = null;

/** Whether the plain series of the form has times, else only how long it lasts. */
let plainTimed: boolean = true;

/**
 * How long each day of the plain series of the form lasts while it has no times,
 * by its weekday, `null` for none yet.
 * A weekday picked anew takes the length of the first.
 */
let plainLengths: Map<number, number | null> = new Map();

/**
 * The group of the tutorials of its type the form makes or changes,
 * see {@link groupPartOf}, `null` while the form is that of my own series.
 * `was` is its name there before, which saving renames everywhere when I typed another,
 * see `groupRename` in `reader/course.ts`.
 */
let grouped: { group: string; made: boolean; was: string } | null = null;

/**
 * My series of the type the form of a group was opened from, as typed so far,
 * to which the form goes back once the group closes, is saved or removed,
 * see {@link groupReturn}, `null` for a group opened from elsewhere.
 */
let groupBack: Form | null = null;

/**
 * A new series made from nothing, by `⟳` beside `+` of the plan, see {@link seriesNew}:
 * the day it starts on and what is picked so far, see {@link freshRowsOf},
 * `null` for any other form.
 */
let fresh: {
    day: string;
    category: string;
    picked: ModuleType;
    semester: string;
} | null = null;

/** Whether the bin of a group asked whether I really remove it. */
let removeAsked: boolean = false;

/**
 * Comes once the form is saved, like closing the dialog of the box it opened over,
 * see {@link seriesOpen}.
 */
let done: () => void = (): void => {};

/**
 * The box the dialog of an entry showed below this one before a number of the list
 * opened another box in it, see {@link boxShow},
 * which that dialog shows again once this one closes unsaved, one level back.
 */
let entryBack: Box | null = null;

/** Gives the weekday of a day, 1 for Monday to 7 for Sunday. */
export function weekdayOf(day: string): number {
    return ((new Date(`${day}T12:00:00`).getDay() + 6) % 7) + 1;
}

/** Gives the Monday of the week of a day, which names its week. */
export function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/** Writes the name of a weekday in English, as the dates of the page write it. */
export function weekdayNameOf(weekday: number, whole: boolean): string {
    return new Date(2026, 9, 18 + weekday).toLocaleDateString("en-GB", {
        weekday: whole ? "long" : "short",
    });
}

/** Writes the name of a day of the form of a series short, see {@link slotRowsOf}. */
function dayNameOf(weekday: number): string {
    return weekday === monthly
        ? "Month"
        : weekday === yearly
          ? "Year"
          : weekdayNameOf(weekday, false);
}

/**
 * Writes the room of a place short, as the plan, the rule of a series and a box name it:
 * its name, see `labelOf` in `./places.ts`, without what stands in brackets,
 * which only its row in `Places.md` or `Rooms.md` and the dialog show,
 * so whatever I write in brackets never makes a place too long for its line.
 */
export function roomOf(line: string): string {
    return labelOf(line).replace(/\s*\(.*$/, "");
}

/**
 * Tells whether a box of the plan is one of a series of my course,
 * a skill box of a numbered type with its number.
 */
export function seriesHas(box: Box): boolean {
    return (
        box.category === skillName &&
        numberedTypes.includes(box.type) &&
        box.number !== ""
    );
}

/** Tells whether a start and an end are both a time, the start before the end. */
function timesReady(times: Pick<Slot, "start" | "end">): boolean {
    return times.start !== "" && times.end !== "" && times.start < times.end;
}

/**
 * Tells whether the days of a series are typed enough to make boxes:
 * each a weekday, each once, with a start before its end or by its length a length,
 * each extra a day with a start before its end, and a first day on or before its last.
 */
export function daysReady(days: Days): boolean {
    return (
        days.slots.every(
            (slot: Slot): boolean =>
                slot.weekday > 0 &&
                (slot.minutes === undefined ? timesReady(slot) : slot.minutes > 0),
        ) &&
        new Set(days.slots.map((slot: Slot): number => slot.weekday)).size ===
            days.slots.length &&
        days.extras.every(
            (extra: Extra): boolean => extra.day !== "" && timesReady(extra),
        ) &&
        days.first !== "" &&
        days.last !== "" &&
        days.first <= days.last
    );
}

/**
 * Moves the days of a series that fall on the weekday of a slot
 * to its new weekday in their week,
 * so a lecture moved from Monday to Tuesday keeps its weeks.
 */
function daysMove(days: Days, from: number, to: number): void {
    const move: (day: string) => string = (day: string): string =>
        from !== 0 && day !== "" && weekdayOf(day) === from
            ? dayAdd(day, to - from)
            : day;
    days.first = move(days.first);
    days.last = move(days.last);
    days.times = Object.fromEntries(
        Object.entries(days.times).map(
            ([day, times]: [string, Pick<Slot, "start" | "end">]): [
                string,
                Pick<Slot, "start" | "end">,
            ] => [move(day), times],
        ),
    );
}

/**
 * Makes a field of a time or a day of a series, as the dialog has them, see `./times.ts`.
 * What I type goes into the series as I type it.
 */
function fieldOf(
    kind: string,
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
    input.value = value;
    input.setAttribute("aria-label", name);
    if (kind === "time-field") timeFieldStart(input);
    else dateFieldStart(input);
    input.addEventListener("input", (): void => {
        take(
            kind === "time-field" ? timeFieldRead(input) : (dateParse(input.value) ?? ""),
        );
        changed();
    });
    return input;
}

/**
 * Makes two fields of a series side by side with the range dash between them,
 * the dash going with the second, so a narrow row breaks before it.
 */
function rangeOf(from: HTMLInputElement, to: HTMLInputElement): HTMLElement {
    const range: HTMLElement = elementOf("span", "entry-range", "");
    const second: HTMLElement = elementOf("span", "entry-moment", "");
    second.append(elementOf("span", "entry-dash", "–"), to);
    range.append(from, second);
    return range;
}

/** Makes the fields of the times of a slot, an extra or a box side by side. */
function timesRangeOf(
    times: Pick<Slot, "start" | "end">,
    changed: () => void,
): HTMLElement {
    return rangeOf(
        fieldOf(
            "time-field",
            times.start,
            "Start",
            (time: string): void => {
                times.start = time;
            },
            changed,
        ),
        fieldOf(
            "time-field",
            times.end,
            "End",
            (time: string): void => {
                times.end = time;
            },
            changed,
        ),
    );
}

/** Makes the button `×` that takes a day or an extra of a series back. */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const remove: HTMLButtonElement = document.createElement("button");
    remove.type = "button";
    crossPut(remove, words);
    remove.addEventListener("click", click);
    return remove;
}

/** Makes the plus beside the name of a row that adds one more. */
function plusOf(words: string, click: () => void): HTMLButtonElement {
    const plus: HTMLButtonElement = document.createElement("button");
    plus.type = "button";
    plusPut(plus, words);
    plus.addEventListener("click", click);
    return plus;
}

/**
 * Makes the row `Day` of the days of a series, the one way every series takes its days,
 * a plain one, the series of a type of a module and a group alike:
 * on top its weekdays as seven toggles, below them each day picked one line
 * with its times, a day picked anew taking the times of the first,
 * so a lecture on Monday and Thursday at different times
 * and a group meeting twice a week are typed as my sleep of every night is.
 * A weekday picked after one taken back takes its boxes, as a day moved,
 * see {@link slotToggle}, so a lecture moved from Monday to Tuesday keeps its boxes.
 * A plain series has `Month` and `Year` after Sunday, each a day alone.
 */
export function slotRowsOf(
    days: Days,
    changed: () => void,
    filled: () => void,
    aside: HTMLElement[] = [],
    lengthOf: ((slot: Slot) => HTMLElement) | null = null,
    month: boolean = false,
): HTMLElement[] {
    const shown: number[] = [1, 2, 3, 4, 5, 6, 7, ...(month ? [monthly, yearly] : [])];
    const toggles: HTMLElement = elementOf("span", "series-weekdays", "");
    toggles.append(
        ...shown.map((weekday: number): HTMLButtonElement => {
            const index: number = days.slots.findIndex(
                (slot: Slot): boolean => slot.weekday === weekday,
            );
            const toggle: HTMLButtonElement = elementOf(
                "button",
                "series-weekday",
                dayNameOf(weekday),
            ) as HTMLButtonElement;
            toggle.type = "button";
            toggle.setAttribute("aria-pressed", String(index !== -1));
            toggle.addEventListener("click", (): void => {
                slotToggle(days, weekday);
                filled();
            });
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
                    lengthOf === null ? timesRangeOf(slot, changed) : lengthOf(slot),
                );
                return line;
            }),
    );
    const row: HTMLElement = rowOf("Day", lines);
    row.querySelector(".entry-name")?.append(...aside);
    return [row];
}

/**
 * Picks a weekday of a series or takes it back, see {@link slotRowsOf}:
 * picked, a slot without weekday yet takes it,
 * else a new slot with the times of the first,
 * which takes the boxes of a slot taken back before,
 * moving the days of the series with it, see {@link daysMove}.
 * Taken back, but the last one, its slot goes,
 * its boxes kept for the next weekday picked.
 * `Month` or `Year` picked stays alone with the times of the first,
 * and another day picked takes its slot as that of a slot without weekday.
 * The slots stay in the order of their weekdays, each with its `before`.
 */
function slotToggle(days: Days, weekday: number): void {
    const index: number = days.slots.findIndex(
        (slot: Slot): boolean => slot.weekday === weekday,
    );
    const empty: number = days.slots.findIndex(
        (slot: Slot): boolean => slot.weekday === 0 || slot.weekday >= monthly,
    );
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
            ...(days.slots[0]?.minutes === undefined
                ? {}
                : { minutes: days.slots[0].minutes }),
        });
        days.before.push(freed?.[1] ?? 0);
    } else if (days.slots.length > 1) {
        if ((days.before[index] ?? 0) !== 0)
            slotsFreed.push([weekday, days.before[index]]);
        days.slots.splice(index, 1);
        days.before.splice(index, 1);
    }
    const pairs: [Slot, number][] = days.slots
        .map((slot: Slot, at: number): [Slot, number] => [slot, days.before[at] ?? 0])
        .sort(
            (first: [Slot, number], second: [Slot, number]): number =>
                first[0].weekday - second[0].weekday,
        );
    days.slots = pairs.map(([slot]: [Slot, number]): Slot => slot);
    days.before = pairs.map(([, before]: [Slot, number]): number => before);
}

/**
 * Makes the row of the first and the last day of a series,
 * each saying grey `dd.mm.yyyy` while empty, as the day of a deadline.
 */
export function datesRowOf(days: Days, changed: () => void): HTMLElement {
    const first: HTMLInputElement = fieldOf(
        "date-field",
        days.first === "" ? "" : weekdayDateTextOf(days.first),
        "First day",
        (day: string): void => {
            days.first = day;
        },
        changed,
    );
    const last: HTMLInputElement = fieldOf(
        "date-field",
        days.last === "" ? "" : weekdayDateTextOf(days.last),
        "Last day",
        (day: string): void => {
            days.last = day;
        },
        changed,
    );
    return rowOf("Dates", rangeOf(first, last));
}

/**
 * Makes the row `Entries` of the boxes a series makes,
 * showing what it showed last until the reader answers again.
 */
export function boxesRowOf(): HTMLElement {
    const preview: HTMLElement = elementOf("div", "series-preview", "");
    preview.append(...previewShown);
    const row: HTMLElement = rowOf("Entries", preview);
    row.hidden = previewShown.length === 0;
    return row;
}

/**
 * Puts what the boxes of a series show into the row `Entries` of the form,
 * the row shown only while it shows something,
 * so a series not typed enough yet has no empty row.
 */
function previewPut(form: HTMLElement, shown: Node[]): void {
    const place: HTMLElement | null = form.querySelector(".series-preview");
    place?.replaceChildren(...shown);
    const row: HTMLElement | null = place?.closest<HTMLElement>(".panel-field") ?? null;
    if (row !== null) row.hidden = shown.length === 0;
}

/**
 * Forgets what the boxes of a form showed, and folds their list,
 * as a form of another series or another new box opens.
 */
export function previewForget(): void {
    clearTimeout(previewWait);
    previewsAsked += 1;
    previewShown = [];
    listOpened = false;
    extraTyped = null;
    sessionTyped = null;
    kindAsked = "";
}

/** Writes how many there are of something, or nothing for none. */
function countOf(count: number, words: string): string[] {
    return count === 0 ? [] : [`${count} ${words}`];
}

/**
 * Makes a part of the line of the boxes of a series that counts them by an icon,
 * its words as tooltip and as its name for screen readers.
 */
export function tallyOf(count: number, icon: IconNode, words: string): HTMLElement {
    const part: HTMLElement = elementOf("span", "series-tally", "");
    part.title = `${count} ${words}`;
    part.setAttribute("aria-label", part.title);
    part.append(...iconWordsOf(icon, String(count)));
    return part;
}

/**
 * Makes the line of the boxes of a series, grey, lighter under the pointer:
 * how many entries, what a change does to them while the series had boxes before,
 * and by the icons of their states how many it keeps are done, not, and pushed,
 * each also at none, as the cards of the course count.
 * A tap opens and closes the list below it.
 */
function summaryOf(planned: Planned[], toggle: () => void): HTMLButtonElement {
    const kept: Planned[] = planned.filter(
        (box: Planned): boolean => box.change !== "removed",
    );
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const counted: (keep: (box: Planned) => boolean) => number = (
        keep: (box: Planned) => boolean,
    ): number => planned.filter(keep).length;
    const line: HTMLButtonElement = document.createElement("button");
    const parts: string[] = [
        ...(had
            ? countOf(
                  counted((box: Planned): boolean => box.change === "new"),
                  "new",
              )
            : []),
        ...countOf(
            counted((box: Planned): boolean => box.change === "changed"),
            "changed",
        ),
        ...countOf(
            counted((box: Planned): boolean => box.change === "removed"),
            "removed",
        ),
    ];
    const states: [number, IconNode, string][] = [
        [
            counted(
                (box: Planned): boolean =>
                    box.change !== "removed" && box.state === "done",
            ),
            Check,
            "done",
        ],
        [
            counted(
                (box: Planned): boolean =>
                    box.change !== "removed" &&
                    (box.state === "dropped" || box.state === "university"),
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
        ...parts.map((part: string): HTMLElement =>
            elementOf("span", "entry-parted", part),
        ),
        ...states.map(([count, icon, words]: [number, IconNode, string]): HTMLElement => {
            const part: HTMLElement = tallyOf(count, icon, words);
            part.classList.add("entry-parted");
            return part;
        }),
    );
    line.addEventListener("click", toggle);
    return line;
}

/**
 * Makes the icon of the state of a box in its row, as the plan shows it:
 * a button that takes the state back where it can be, else the icon alone.
 */
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

/**
 * Sends a change of a box of the list to the reader, then shows the list anew,
 * also when the reader does not take it, which the console says.
 */
function seriesAct(send: () => Promise<unknown>): void {
    send()
        .catch(logged)
        .then((): Promise<void> => seriesRefresh())
        .catch(logged);
}

/**
 * Shows the list of the form anew as its files hold it now, after a box of it changed,
 * by its actions or in the dialog of the box, nothing once the dialog closed.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRefresh(): Promise<void> {
    if (typing === null) return;
    if (course !== null) course = await courseLoad(course.module, course.semester);
    formChanged();
}

/**
 * Opens a box of the list over the dialog of the series, as the plan opens it,
 * see `boxClick` in `./boxes.ts`.
 * The dialog of an entry the series opened from closes first,
 * its box kept to show again once the series closes unsaved, see {@link entryBack},
 * and the box shows on top, marked `data-over`, which `series.css` leaves visible.
 * Once it closes, saved or not, the list shows anew, see {@link dialogStart}.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function boxShow(box: Box): Promise<void> {
    const entry: HTMLDialogElement = document.getElementById(
        "entry",
    ) as HTMLDialogElement;
    if (entry.open && entryBack === null) entryBack = entryBoxOf();
    if (entry.open) entry.close();
    if (box.editable) await boxOpenEdit(box);
    else if (box.state === "open") {
        const [start, end]: [Date, Date] = boxTimesOf(
            box,
            new Date(`${box.day}T12:00:00`),
        );
        await entryOpenFromBox(box, start, end);
    }
    if (entry.open) entry.dataset.over = "";
}

/**
 * Shows the box again in the dialog of an entry that it showed before,
 * as it stands now, changes of the series included, once the series closes unsaved.
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
 * Loads the boxes of the rows of the list: of my course its boxes as loaded with it,
 * of a plain series those of the days of its rows, see `boxesFetch` in `./boxes.ts`,
 * never the greyed copy a box leaves on a day it was pushed from,
 * none of a group, whose rows are its sessions.
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
        boxes
            .filter((box: Box): boolean => ids.includes(box.id))
            .map((box: Box): [string, Box] => [box.id, box]),
    );
}

/**
 * Makes one action of a box of the list not written yet,
 * as an action of a box of the plan looks, see `./actions.ts`.
 */
function pendingActionOf(
    icon: IconNode,
    words: string,
    click: () => void,
): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "box-action";
    iconPut(button, icon, words);
    button.addEventListener("click", click);
    return button;
}

/**
 * Makes what stands at the right edge of the row of a box there already,
 * as on the page of its module: its actions while open, as in the plan,
 * see `./actions.ts`, each sent at once, else the icon of its state,
 * which takes it back with a click where it can be.
 */
function knownEndOf(box: Box): HTMLElement {
    const calendar: DayCalendar | null = dayCalendarOf();
    if (box.state === "open")
        return boxActionsOf(
            box,
            (): void =>
                seriesAct(async (): Promise<void> => {
                    const [start, end]: [Date, Date] = boxTimesOf(
                        box,
                        new Date(`${box.day}T12:00:00`),
                    );
                    await boxLog(box.id, start, end);
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
 * Makes what stands at the right edge of the row of a box not written yet,
 * or of one only shown, kept by the form until I save:
 * `Cancel` for one numbered in its series and for a session of a group,
 * which the reader makes cancelled, `Remove` for an extra from today on.
 * Of a session of a group there already, of the days over too,
 * so a tutorial I went to is added afterwards and then logged,
 * `+`, see {@link extraAdd},
 * but not where a box of mine stands already, see {@link mineAt},
 * and a pencil, which opens it to change alone, as the university changed it.
 * A state given shows its icon, which takes it back.
 * A day of another series of the chain of a plain series, and one the change removes,
 * show only the icon of its state, or nothing.
 */
function pendingEndOf(box: Planned, preview: Preview): HTMLElement {
    const days: Days = preview.days;
    const today: string = dayOf(new Date());
    const extra: Extra | undefined = days.extras.find(
        (one: Extra): boolean => one.day === box.day,
    );
    const stated: (state: BoxState) => () => void =
        (state: BoxState): (() => void) =>
        (): void => {
            preview.states[box.id || box.day] = state;
            preview.filled();
        };
    const shown: boolean = box.chained === true || box.change === "removed";
    if (box.state === "done") return markOf(Check, "Done", null);
    if (box.state === "dropped")
        return markOf(X, "Skipped", box.editable && !shown ? stated("open") : null);
    if (box.state === "university")
        return markOf(
            CalendarOff,
            "Cancelled",
            box.editable && !shown ? stated("open") : null,
        );
    if (shown) return elementOf("span", "series-end", "");
    const session: Session | undefined = sessionOf(box);
    const buttons: HTMLButtonElement[] = [
        ...(box.editable && (/^\d+$/.test(box.number) || grouped !== null)
            ? [pendingActionOf(CalendarOff, "Cancel", stated("university"))]
            : []),
        ...(extra !== undefined && box.day >= today && !box.pushed
            ? [
                  pendingActionOf(CalendarMinus, "Remove", (): void => {
                      days.extras.splice(days.extras.indexOf(extra), 1);
                      preview.filled();
                  }),
              ]
            : []),
        ...(grouped !== null && !grouped.made && !mineAt(box.time || box.day)
            ? [
                  pendingActionOf(Plus, "Add as a box of mine", (): void => {
                      extraAdd(box.time || box.day).catch(logged);
                  }),
              ]
            : []),
        ...(session !== undefined
            ? [
                  pendingActionOf(Pencil, "Change this session alone", (): void => {
                      sessionTyped = {
                          id: session.id,
                          day: box.day,
                          start: timeOf(new Date(session.start)),
                          end: timeOf(
                              new Date(
                                  Date.parse(session.start) + session.minutes * 60 * 1000,
                              ),
                          ),
                          location: session.location,
                      };
                      preview.filled();
                  }),
              ]
            : []),
    ];
    if (box.pushed && buttons.length === 0) return markOf(ArrowRight, "Pushed", null);
    const actions: HTMLElement = elementOf(
        "div",
        buttons.length === 0 ? "series-end" : "box-actions",
        "",
    );
    actions.append(...buttons);
    return actions;
}

/**
 * Gives the session of the group there already a row of its list stands for,
 * which its pencil changes alone: none of a new group, of one without times,
 * of one cancelled or removed, and none while the form moved the row from its session.
 */
function sessionOf(box: Planned): Session | undefined {
    const group: { group: string; made: boolean; was: string } | null = grouped;
    return group === null ||
        group.made ||
        typing === null ||
        box.time === "" ||
        box.state === "university" ||
        box.change === "removed"
        ? undefined
        : groupsOf(typing.type)
              .find((one: Group): boolean => one.rule.group === group.was)
              ?.sessions.find(
                  (one: Session): boolean =>
                      Date.parse(one.start) === Date.parse(box.time),
              );
}

/**
 * Makes the row of a session of the group of the form being changed alone,
 * as the university changed it that day, see `sessionApply` in `reader/course.ts`:
 * its times and its room, Save, which writes it at once,
 * my box at that session following it, and `×`, which leaves it as it is.
 */
function sessionRowOf(
    session: NonNullable<typeof sessionTyped>,
    redraw: () => void,
): HTMLElement {
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
        pendingActionOf(Check, "Save this session", (): void => {
            sessionSave(session).catch(logged);
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
 * Writes the session being changed alone while its start lies before its end,
 * then shows the list anew.
 * The hint of the form shows when the reader does not take it.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function sessionSave(session: NonNullable<typeof sessionTyped>): Promise<void> {
    if (course === null || typing === null || grouped === null || !timesReady(session))
        return;
    try {
        await courseSend<null>("/api/course/session", {
            module: course.module,
            type: typing.type,
            group: grouped.was,
            semester: course.semester,
            id: session.id,
            start: session.start,
            end: session.end,
            location: session.location,
        });
    } catch (error: unknown) {
        failed(error);
        return;
    }
    sessionTyped = null;
    await seriesRefresh();
}

/**
 * Tells whether a box of mine of the type of the form stands at the start of a session,
 * so the session is mine already and offers no `+`, as the reader tells it,
 * see `weekPick` in `reader/course.ts`.
 */
function mineAt(start: string): boolean {
    return (course?.boxes ?? []).some(
        (one: Box): boolean =>
            one.type === typing?.type &&
            ((one.time || one.day) === start ||
                (one.time !== "" && Date.parse(one.time) === Date.parse(start))),
    );
}

/**
 * Makes a session of the group of the form a box of mine of its own,
 * besides the box of its week, as a second tutorial in one week,
 * the group as saved, not as typed since.
 * The form stays, the session now without `+`, so I take one session after another.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function extraAdd(start: string): Promise<void> {
    if (course === null || typing === null || grouped === null) return;
    try {
        await courseSend<null>("/api/course/pick", {
            module: course.module,
            type: typing.type,
            group: grouped.was,
            start: start,
            extra: true,
        });
    } catch (error: unknown) {
        failed(error);
        return;
    }
    await seriesRefresh();
}

/**
 * Makes the kind of an exam in its row where a box of a series has its number:
 * a button that opens the menu of the kinds as the menu `⋯` does,
 * see `menuAnchor` in `../menu.ts`, in the look of the menu of the groups,
 * see `pinnedMenuOf` in `./groups.ts`.
 * A click on a kind gives it to the exam, but for the one checked.
 */
function kindMenuOf(
    kind: string,
    asked: boolean,
    pick: (kind: string) => void,
): HTMLElement {
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
 * Makes the row of a box in the list with the one row of a box of every list,
 * see `listRowOf` in `./rows.ts`, so it stands as on the page of its module.
 * A box not written yet shows the people of the series,
 * which its dialog changes once it is.
 * What the change does says `new` but while every box is new.
 * At its right edge, see {@link knownEndOf} and {@link pendingEndOf}.
 * Greyed while not open, done, skipped, cancelled or removed, as in the plan.
 */
function boxRowOf(box: Planned, had: boolean, preview: Preview): HTMLElement {
    const kinds: Kinds | undefined = preview.kinds;
    const known: Box | undefined =
        box.change === "removed" ? undefined : boxesKnown.get(box.id);
    let word: string =
        box.change === "renumbered" || (box.change === "new" && !had) ? "" : box.change;
    if (word === "" && box.pushed && box.editable && box.state === "open")
        word = "pushed";
    if (word === "" && box.location !== undefined) word = "changed";
    if (preview.days.extras.some((extra: Extra): boolean => extra.day === box.day))
        word = word === "" ? "extra" : `${word} extra`;
    const number: HTMLElement =
        kinds === undefined
            ? numberOf(
                  box.change === "removed" ? "" : box.number.replace("NONE", "–"),
                  known === undefined || box.number === ""
                      ? null
                      : (): void => {
                            boxShow(known).catch(logged);
                        },
                  known?.note || "Open",
              )
            : kindMenuOf(
                  box.number,
                  box.id === "" && box.day === kindAsked,
                  (kind: string): void => {
                      kinds[box.day] = kind;
                      preview.filled();
                  },
              );
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
    const opening: (() => void) | null =
        known === undefined || kinds !== undefined || box.number !== ""
            ? null
            : (): void => {
                  boxShow(known).catch(logged);
              };
    const mine: Form | null = grouped === null ? typing : null;
    return listRowOf({
        number: number,
        day: box.day,
        open: opening,
        group:
            known !== undefined && known.group !== "" && course !== null
                ? boxGroupOf(
                      course,
                      known,
                      (_: () => void, send: () => Promise<unknown>): void =>
                          seriesAct(send),
                      mine === null
                          ? undefined
                          : (group: string): void => groupFrom(mine, group),
                  )
                : null,
        meta: [[rowTimesOf(box.time, box.minutes)], place],
        people:
            known?.attendees ??
            (box.attendees.length > 0 ? box.attendees : (typing?.attendees ?? [])),
        persons: persons,
        mark: word,
        end:
            known !== undefined && box.chained !== true
                ? knownEndOf(known)
                : pendingEndOf(box, preview),
        faded:
            box.change === "removed" ||
            ["done", "dropped", "university"].includes(box.state),
    });
}

/**
 * Makes the line `+` below the list, which opens the row of an extra to type,
 * with the times of the last day of the series,
 * of the exams with the menu of its kind open, to pick it first.
 */
function addRowOf(preview: Preview, redraw: () => void): HTMLButtonElement {
    const add: HTMLButtonElement = document.createElement("button");
    const plus: HTMLElement = elementOf("span", "series-number", "");
    add.type = "button";
    add.className = "series-row series-add";
    add.setAttribute("aria-label", "Add a date");
    add.title = "Add a date";
    plus.append(iconOf(Plus));
    add.append(plus);
    add.addEventListener("click", (): void => {
        const last: Slot | undefined = preview.days.slots[preview.days.slots.length - 1];
        extraTyped =
            plain !== null && !plainTimed
                ? { day: "", start: "", end: "" }
                : { day: "", start: last?.start ?? "", end: last?.end ?? "" };
        kindTyped = "";
        redraw();
        if (preview.kinds === undefined)
            document
                .querySelector<HTMLInputElement>(".series-draft .date-field")
                ?.focus();
        else document.querySelector<HTMLElement>(".series-draft .menu")?.showPopover();
    });
    return add;
}

/**
 * Makes the row of an extra being typed below the list, as a box stands in it:
 * its day and its times, those of the series at first,
 * of a plain series without time none, since it takes the length of the series.
 * It takes what the series is, its place and who I am with.
 * Typed enough, it joins the series as the focus leaves the row, by Enter too,
 * one taken back by its `×` never,
 * though its field loses the focus as the list shows anew.
 */
function draftRowOf(extra: Extra, preview: Preview, redraw: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row series-draft", "");
    const kinds: Kinds | undefined = preview.kinds;
    const day: HTMLInputElement = fieldOf(
        "date-field",
        extra.day === "" ? "" : weekdayDateTextOf(extra.day),
        "Day of the extra",
        (typed: string): void => {
            extra.day = typed;
        },
        (): void => {},
    );
    const times: HTMLElement =
        plain !== null && !plainTimed
            ? elementOf("span", "series-times", "")
            : timesRangeOf(extra, (): void => {});
    times.classList.add("series-times");
    const number: HTMLElement =
        kinds === undefined
            ? elementOf("span", "series-number", "")
            : kindMenuOf(
                  kindTyped,
                  kindAsked !== "" && extra.day === kindAsked,
                  (kind: string): void => {
                      kindTyped = kind;
                      day.focus();
                  },
              );
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
        if (
            extraTyped === extra &&
            !row.contains(event.relatedTarget as Node | null) &&
            extraJoin(preview.days, kinds)
        )
            preview.filled();
    });
    return row;
}

/**
 * Joins the extra being typed to the series once typed enough,
 * as the focus leaves its row or the form saves, see {@link formSave}.
 * Gives whether it joined, so the list shows anew.
 */
function extraJoin(days: Days, kinds: Kinds | undefined): boolean {
    const extra: Extra | null = extraTyped;
    if (
        extra === null ||
        extra.day === "" ||
        ((plain === null || plainTimed) && !timesReady(extra))
    )
        return false;
    extraTyped = null;
    if (kinds !== undefined && kindTyped !== "") kinds[extra.day] = kindTyped;
    days.extras.push(extra);
    days.extras.sort((first: Extra, second: Extra): number =>
        first.day.localeCompare(second.day),
    );
    return true;
}

/**
 * Makes the list of the boxes of a series by month, each month short at the left,
 * the cards of the course on the page of a module the same, see `../editor/course.ts`.
 */
export function monthListOf(items: [string, HTMLElement][]): HTMLElement {
    const list: HTMLElement = elementOf("div", "series-list", "");
    let month: string = "";
    let boxes: HTMLElement = list;
    items.forEach(([moment, row]: [string, HTMLElement]): void => {
        const name: string = new Date(
            `${moment.slice(0, 10)}T12:00:00`,
        ).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
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
 * Makes the list of the boxes of a series by their days, by month,
 * below them `+` or the extra being typed, but for a group,
 * whose sessions are the university's.
 * Of a plain series an extra is one of its single dates, its `RDATE`.
 * The sessions of a group numbered by their weeks of the semester
 * as the reader numbers them,
 * as my boxes are, see `groupApply` in `reader/course.ts`.
 */
function boxListOf(
    planned: Planned[],
    preview: Preview,
    redraw: () => void,
): HTMLElement {
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const items: [string, HTMLElement][] = planned.map(
        (box: Planned): [string, HTMLElement] => [
            box.time || box.day,
            sessionTyped !== null && sessionOf(box)?.id === sessionTyped.id
                ? sessionRowOf(sessionTyped, redraw)
                : boxRowOf(box, had, preview),
        ],
    );
    const list: HTMLElement = monthListOf(items);
    if (grouped === null && (typing === null || !groupWaits(typing)))
        list.append(
            extraTyped === null
                ? addRowOf(preview, redraw)
                : draftRowOf(extraTyped, preview, redraw),
        );
    return list;
}

/**
 * Shows the boxes a series makes in the row of its boxes, as the reader answers:
 * their line, below it their list while opened, or the hint why it makes none.
 * Nothing while the series is not typed enough or the reader does not take it,
 * and only the answer to the last question.
 *
 * @throws {Error} - When the reader does not answer
 */
async function previewShow(form: HTMLElement, preview: Preview): Promise<void> {
    const asked: number = ++previewsAsked;
    if (preview.ask === null) {
        previewShown = [];
        previewPut(form, previewShown);
        return;
    }
    let answer: Planned[] | HTMLElement;
    try {
        answer = await preview.ask();
    } catch (error: unknown) {
        if (asked === previewsAsked) {
            previewShown = [];
            previewPut(form, previewShown);
        }
        throw error;
    }
    if (asked !== previewsAsked) return;
    if (answer instanceof HTMLElement) {
        previewShown = [answer];
        previewPut(form, previewShown);
        return;
    }
    const planned: Planned[] = answer;
    await boxesLoad(planned);
    if (asked !== previewsAsked) return;
    const draw: () => void = (): void => {
        previewShown = [
            summaryOf(planned, (): void => {
                listOpened = !listOpened;
                draw();
            }),
            ...(listOpened ? [boxListOf(planned, preview, draw)] : []),
        ];
        previewPut(form, previewShown);
    };
    draw();
}

/**
 * Shows anew the boxes a series makes a moment after the typing rests,
 * so typing asks the reader once.
 */
export function previewSoon(form: HTMLElement, preview: Preview): void {
    clearTimeout(previewWait);
    previewWait = window.setTimeout((): void => {
        previewShow(form, preview).catch(logged);
    }, 150);
}

/**
 * Asks the reader for a change of the course as JSON.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function courseSend<T>(address: string, body: object): Promise<T> {
    return readerAsk<T>(address, { method: "POST", body: JSON.stringify(body) });
}

/** Logs an error the dialog shows nothing of. */
function logged(error: unknown): void {
    console.error(error);
}

/** Logs an error of the reader and shows the hint above the buttons of the form. */
function failed(error: unknown): void {
    console.error(error);
    formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
}

/** Gives the dialog of a series, its element. */
function dialogOf(): HTMLDialogElement {
    return document.getElementById("series") as HTMLDialogElement;
}

/** Shows the dialog of a series with nothing focused, see {@link seriesOpen}. */
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
    return readerAsk<Course>(
        `/api/course/module?module=${encodeURIComponent(module)}&semester=${semester}`,
    );
}

/**
 * Loads the categories with the values of their fields as of now.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function categoriesLoad(): Promise<Category[]> {
    return readerAsk<Category[]>(
        `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
    );
}

/**
 * Forgets what the form showed and opened, as the form of another series opens,
 * see {@link previewForget}.
 */
function formReset(): void {
    previewForget();
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
}

/** Gives the groups of a type of the course of the dialog. */
function groupsOf(type: string): Group[] {
    return (course?.groups ?? []).filter(
        (group: Group): boolean => group.rule.type === type,
    );
}

/**
 * Gives a field of `Skill` as the reader offers it,
 * `undefined` while the categories are not loaded.
 */
function skillFieldOf(key: string): Field | undefined {
    return categories
        .find((category: Category): boolean => category.name === skillName)
        ?.fields.find((field: Field): boolean => field.key === key);
}

/**
 * Gives my default place, `★` in `Places.md`, empty for none,
 * which every new series starts with, a new group and my learning too, as a new box does,
 * see `lastPlaceFill` in `./categories.ts`.
 */
function standardLineOf(): string {
    const standard: Place | undefined = Object.values(
        skillFieldOf("location")?.places ?? {},
    ).find((place: Place): boolean => place.standard);
    return standard === undefined ? "" : lineOf(standard);
}

/**
 * Gives the plan a plain series lies in or goes into, from `NomWorkspace` on,
 * shown at the left of the buttons of its form, empty while not known:
 * of one there its file, of a new one the plan of its skill,
 * or the plan of its topic in the year of its first day,
 * see `topicFileOf` in `./categories.ts`.
 */
function plainFileOf(series: Plain, form: Form): string {
    if (series.file !== "") return series.file;
    if (series.category === skillName)
        return skillNamesOf({ module: series.module, type: series.type }).file;
    return series.category === "" || form.first === ""
        ? ""
        : topicFileOf(series.category, form.first, "_Plan.ics");
}

/**
 * Tells whether the form asks who I am with: for a series of my course,
 * and for a new box repeated or a plain series whose category has `With`,
 * as the dialog of the box asks it, so not for `Sport`, which I do alone.
 */
function withAsked(): boolean {
    const category: Category | undefined = categories.find(
        (one: Category): boolean =>
            one.name === (plain?.category ?? repeated?.box.category),
    );
    return (
        (repeated === null && plain === null) ||
        (category?.fields.some((field: Field): boolean => field.key === "with") ?? false)
    );
}

/**
 * Tells whether the name of the group of the form, new or renamed,
 * is taken by another group of its type.
 */
function groupTaken(form: Form): boolean {
    return (
        grouped !== null &&
        grouped.group !== grouped.was &&
        groupsOf(form.type).some(
            (group: Group): boolean => group.rule.group === grouped?.group,
        )
    );
}

/** Tells whether the form of a new group has no name yet, see {@link groupPartOf}. */
function groupUnnamed(): boolean {
    return grouped !== null && grouped.group === "";
}

/**
 * Tells whether the form of a series is typed enough to make boxes:
 * of a plain series as {@link plainReady} says, else its type picked,
 * but for a new box repeated, and its days, a new group not named as one there already.
 */
function formReady(form: Form): boolean {
    if (
        fresh !== null &&
        (fresh.category === "" ||
            (fresh.category === skillName && fresh.picked.module === ""))
    )
        return false;
    if (plain !== null) return plainReady(plain, form);
    if (form.type === "" && repeated === null) return false;
    return daysReady(form) && !groupTaken(form) && !groupUnnamed() && !groupWaits(form);
}

/**
 * Gives the exams of the course of the dialog as the rule of a series:
 * no weekdays, its first and last day those of its exams, no extras,
 * so its form lists the exams with the kinds and the times I give them and holds
 * as extras only the dates I add, see {@link examSend}.
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
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        attendees: [],
        first: days[0] ?? dayOf(new Date()),
        last: days[days.length - 1] ?? dayOf(new Date()),
        times: {},
        group: "",
        semester: loaded.semester,
    };
}

/**
 * Lists the exams of the form, each with the kind and the times I gave it,
 * and the dates I added as new, the earliest first.
 * Or writes them: each exam I gave another kind or other times,
 * see `examSet` in `reader/course.ts`,
 * then each date added as an exam of the module alone,
 * as the dialog of an entry adds a box, see `boxAdd` in `./entries.ts`.
 *
 * @throws {Error} - When the reader does not take an exam or a date
 */
async function examSend(form: Form, dry: boolean): Promise<Planned[]> {
    const timed: (day: string, times: Pick<Slot, "start" | "end">) => [Date, number] = (
        day: string,
        times: Pick<Slot, "start" | "end">,
    ): [Date, number] => {
        const start: Date = new Date(`${day}T${times.start}:00`);
        return [
            start,
            (new Date(`${day}T${times.end}:00`).getTime() - start.getTime()) /
                (60 * 1000),
        ];
    };
    const exams: Planned[] = (course?.boxes ?? [])
        .filter((box: Box): boolean => box.type === examType)
        .map((box: Box): Planned => {
            const [start, minutes]: [Date | null, number | null] =
                form.times[box.day] === undefined
                    ? [null, box.minutes]
                    : timed(box.day, form.times[box.day]);
            const time: string = start === null ? box.time : start.toISOString();
            const number: string = form.kinds[box.day] ?? box.number;
            return {
                id: box.id,
                day: box.day,
                time: time,
                minutes: minutes,
                number: number,
                state: box.state,
                pushed: box.pushed.length > 0,
                editable: false,
                retimable:
                    box.editable && box.todo && !box.series && box.pushed.length === 0,
                change:
                    time === box.time && minutes === box.minutes && number === box.number
                        ? ""
                        : "changed",
                attendees: box.attendees,
            };
        });
    const added: [Extra, Date, number][] = form.extras.map(
        (extra: Extra): [Extra, Date, number] => [extra, ...timed(extra.day, extra)],
    );
    if (!dry) {
        for (const exam of exams.filter(
            (one: Planned): boolean => one.change === "changed",
        ))
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
 * Sends the form of a series to the reader, or with `dry` only tells what it would make:
 * a plain series, a group, see `groupApply` in `reader/course.ts`, the exams,
 * a group made mine, see `groupMine` there, a new box repeated,
 * else the series by its rule and the states I gave its boxes, see `seriesApply` there.
 *
 * @throws {Error} - When the reader does not take it
 */
async function formSend(form: Form, dry: boolean): Promise<Planned[]> {
    if (plain !== null) return plainSend(plain, form, dry);
    if (grouped !== null)
        return courseSend<Planned[]>("/api/course/groups", {
            module: course?.module ?? "",
            made: grouped.made,
            was: grouped.was,
            states: form.states,
            dry: dry,
            rule: {
                type: form.type,
                slots: form.slots,
                extras: [],
                location: form.location,
                locationLink: form.locationLink,
                online: form.online,
                onlineLink: form.onlineLink,
                onlineChannel: form.onlineChannel,
                onlineTitle: form.onlineTitle,
                attendees: form.attendees,
                first: form.first,
                last: form.last,
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
            type: form.type,
            slots: form.slots,
            extras: form.extras,
            location: form.location,
            locationLink: form.locationLink,
            online: form.online,
            onlineLink: form.onlineLink,
            onlineChannel: form.onlineChannel,
            onlineTitle: form.onlineTitle,
            attendees: form.attendees,
            first: form.first,
            last: form.last,
            times: form.times,
            group: form.old?.group ?? "",
            semester: course?.semester ?? "",
        },
    });
}

/**
 * Sends a new box repeated once per date of the days of the form,
 * see `boxRepeat` in `./entries.ts`,
 * with the states I gave its boxes, of a lecture a date cancelled by its day.
 *
 * @throws {Error} - When the reader does not take it,
 *   also since the series of its type is there already
 */
async function repeatedSend(
    box: BoxFields,
    form: Form,
    dry: boolean,
): Promise<Planned[]> {
    const planned: Planned[] | null = await boxRepeat(
        {
            ...box,
            location: form.location,
            online: form.online,
            onlineLink: form.onlineLink,
            onlineChannel: form.onlineChannel,
            onlineTitle: form.onlineTitle,
            attendees: form.attendees,
        },
        form,
        form.states,
        dry,
    );
    if (planned === null)
        throw new Error(`${box.module} ${box.type} has its series already`);
    return planned;
}

/** Gives the form of the dialog, its element. */
function formElementOf(): HTMLFormElement {
    return document.getElementById("series-form") as HTMLFormElement;
}

/**
 * Locks rows of my series of a type with groups:
 * its place, what it does online, its days, its dates and who I am with
 * come from the group I pin, so they show as the group has them but take no input.
 */
function lockedOf(locked: boolean, rows: HTMLElement[]): HTMLElement[] {
    rows.forEach((row: HTMLElement): void => {
        row.inert = locked;
    });
    return rows;
}

/**
 * Fills my series that waits for my group, see {@link groupWaits}:
 * what comes from a group empty, even where a group of before left them,
 * its dates as far as they are known, from the groups of its type and my boxes there.
 * Nothing is saved, since such a form saves nothing.
 */
function waitingFill(form: Form): void {
    Object.assign(form, {
        location: "",
        locationLink: "",
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
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

/**
 * Gives my boxes of the type of my series that waits for my group:
 * those of the days over and those I took from a group by hand, of days to come too,
 * see `chosenIs` in `reader/course.ts`, which stay whatever group is pinned,
 * so its list shows them while no group is mine, none to change there.
 */
function keptOf(form: Form): Planned[] {
    return (course?.boxes ?? [])
        .filter((box: Box): boolean => box.type === form.type)
        .map((box: Box): Planned => ({
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
        }));
}

/**
 * Takes a change of the form of a series:
 * allows saving while it is ready and shows anew the boxes it makes,
 * of my series waiting for my group my boxes there, see {@link keptOf}.
 */
function formChanged(): void {
    const save: HTMLButtonElement | null = formElementOf().querySelector(".panel-main");
    if (typing === null || save === null) return;
    const form: Form = typing;
    const kept: Planned[] = groupWaits(form) ? keptOf(form) : [];
    save.disabled = !formReady(form);
    previewSoon(formElementOf(), {
        ask: formReady(form)
            ? (): Promise<Planned[]> => formSend(form, true)
            : kept.length > 0
              ? async (): Promise<Planned[]> => kept
              : null,
        days: form,
        states: form.states,
        kinds: form.type === examType ? form.kinds : undefined,
        filled: formFill,
    });
}

/**
 * Shows the address of the place of the form below it, small and grey,
 * as the dialog does, a link to the link of the place while it has one,
 * never the link itself as text, so nothing for no place or a place without address.
 */
function addressShow(address: HTMLAnchorElement, form: Form): void {
    const link: string = placeEdit?.link ?? form.locationLink;
    address.textContent =
        placeEdit !== null ? placeAddressOf(placeEdit) : addressOf(form.location);
    if (link !== "") address.href = link;
    else address.removeAttribute("href");
    address.hidden = address.textContent === "";
}

/**
 * Gives the place of the form as it is, before I change it by its parts,
 * see `placeOf` in `./places.ts`.
 */
function placeOriginOf(form: Form): Place {
    return placeOf(
        form.location,
        form.locationLink,
        skillFieldOf("location")?.places ?? {},
    );
}

/**
 * Makes the row `Summary`, what the series is,
 * as the dialog of one of its boxes names it,
 * see `summaryPartsOf` in `./categories.ts`, never changed here,
 * since it follows from elsewhere.
 * A new one has only its type to pick, its list open as the dialog opens.
 * Below it, small and grey, the folder of the material of its type in the semester,
 * see `folderLinkShow` in `../skill/links.ts`, one not there yet no link,
 * until its first box makes it.
 * No frame under the pointer, as every row written by itself,
 * see `.panel-fixed` in `./day.css`.
 */
function seriesRowOf(form: Form): HTMLElement {
    const module: string = course?.module ?? "";
    const types: string[] = numberedTypes.filter(
        (type: string): boolean =>
            type === form.type ||
            !(course?.series ?? []).some(
                (series: Series): boolean => series.rule.type === type,
            ),
    );
    const link: HTMLAnchorElement = elementOf(
        "a",
        "entry-address",
        "",
    ) as HTMLAnchorElement;
    const folder: MaterialFolder | undefined =
        repeated === null ? course?.folders[form.type] : undefined;
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
        value.append(
            elementOf(
                "span",
                "",
                breakableOf(repeated?.summary ?? `${module} (${form.type})`),
            ),
            link,
        );
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
 * Gives the search of a place of the form and of a session changed alone:
 * while nothing is typed my places and the place there already, my default place first,
 * as I type the rooms of the university too, see `placeChoiceOf` in `./places.ts`.
 */
function placeSearchOf(
    current: string,
    nameShown: (line: string) => string,
): (text: string) => Promise<Choice[]> {
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
 * Makes the row of the place of the form, picked as in the dialog,
 * see `placeSearchOf` in `./categories.ts`, below it its address, a link.
 * A place picked takes the link of my place or room.
 * Its pencil shows and hides its parts below it, see `placeEditOf` in `./places.ts`.
 * The row is built anew once I leave a part, the part I went on to keeping the cursor,
 * and saving writes the place everywhere, see {@link placeRename}.
 */
function placeRowOf(form: Form): HTMLElement {
    const field: Field | undefined = skillFieldOf("location");
    const address: HTMLAnchorElement = document.createElement("a");
    const pencil: HTMLButtonElement = document.createElement("button");
    const parts: HTMLElement = elementOf("div", "field-parts", "");
    const nameShown: (line: string) => string = (line: string): string =>
        line === form.location && placeEdit !== null && placeEdit.name !== ""
            ? placeEdit.name
            : labelOf(line);
    address.className = "entry-address";
    address.target = "_blank";
    address.rel = "noopener";
    addressShow(address, form);
    pencil.type = "button";
    pencil.className = "entry-pencil";
    pencil.hidden = form.location === "";
    iconPut(pencil, Pencil, "Change the place");
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
                formElementOf()
                    .querySelector<HTMLInputElement>(`input[aria-label="${next}"]`)
                    ?.focus();
            },
        ),
    );
    pencil.addEventListener("click", (): void => {
        placeOpen = !placeOpen;
        parts.hidden = !placeOpen;
        if (placeOpen) parts.querySelector("input")?.focus();
    });
    return row;
}

/**
 * Makes the row of what the series does online in the form,
 * the row `Online` of the dialog of an entry, see `onlineRowOf` in `./attendance.ts`,
 * none while the categories are not loaded.
 */
function onlineRowsOf(form: Form): HTMLElement[] {
    const field: Field | undefined = skillFieldOf("online");
    return field === undefined
        ? []
        : [
              onlineRowOf({
                  field: field,
                  categories: categories,
                  online: {
                      online: form.online,
                      onlineLink: form.onlineLink,
                      onlineChannel: form.onlineChannel,
                      onlineTitle: form.onlineTitle,
                  },
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

/**
 * Makes the row of who I am with in the form, the row `With` of the dialog of an entry,
 * see `withRowOf` in `./attendance.ts`, none while the categories are not loaded.
 */
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
 * Gives the group typed in the row `Group` as a group is named:
 * digits filled up to two, any other name as typed, of letters, digits, `_` and `-`.
 * A space anywhere, also at an end, makes no name, never trimmed away in silence.
 * Gives empty for nothing typed, `null` for a text a group may not be named.
 */
function groupTypedOf(text: string): string | null {
    const name: string = /^\d+$/.test(text) ? text.padStart(2, "0") : text;
    return name === "" || /^[\w-]+$/.test(name) ? name : null;
}

/**
 * Makes the group of the form of a group of the tutorials, beside its semester:
 * a field I type its name into, saving renaming it everywhere,
 * with a grey hint beside it while the name is taken or holds what a name may not.
 */
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
        hint.textContent =
            name === null ? "Invalid group name" : "Group is there already";
        formChanged();
    });
    value.append(input, hint);
    return value;
}

/**
 * Makes the group of my series of a numbered type of a module beside its semester,
 * as the summary has its type beside its skill: the menu of the groups of the type,
 * see `pinnedMenuOf` in `./groups.ts`, a pick making the group mine,
 * my boxes to come going to it, and right after it the plus of a new group.
 */
function groupPickOf(form: Form): HTMLElement {
    const loaded: Course | null = course;
    const plus: HTMLButtonElement = plusOf("Add a group", (): void =>
        groupFrom(form, ""),
    );
    const part: HTMLElement = elementOf("span", "series-group-pick", "");
    plus.classList.add("plus-quiet");
    if (loaded !== null && groupsOf(form.type).length > 0)
        part.append(
            pinnedMenuOf(
                loaded,
                form.type,
                (_change: () => void, send: () => Promise<unknown>): void => {
                    send()
                        .then((): Promise<void> =>
                            seriesOpen(loaded.module, form.type, loaded.semester, done),
                        )
                        .catch(logged);
                },
                (group: string): void => groupFrom(form, group),
            ),
        );
    part.append(plus);
    return part;
}

/**
 * Tells whether the form of my series of a type with groups waits for my group:
 * while none is mine, its rows from the group show empty and locked,
 * since my boxes to come follow my group.
 */
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
 * Opens a group in the form from my series,
 * my series kept as I left it to go back to, see {@link groupBack},
 * and a still copy of it left below, dimmed with the page,
 * so the form of the group reads as a dialog of its own over my series.
 * The form of the group a little lower and further right,
 * my series behind it a little higher and further left,
 * see `#series-under` in `series.css`,
 * so it shows above and left of it, however long either is,
 * the two together in the middle.
 */
function groupFrom(form: Form, group: string): void {
    const series: HTMLDialogElement = dialogOf();
    const under: HTMLDialogElement = document.getElementById(
        "series-under",
    ) as HTMLDialogElement;
    const copy: HTMLElement = formElementOf().cloneNode(true) as HTMLElement;
    [copy, ...copy.querySelectorAll<HTMLElement>("[id]")].forEach(
        (part: HTMLElement): void => part.removeAttribute("id"),
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

/**
 * Takes away the still copy of my series below the form of a group,
 * once that form goes back to my series or the dialog closes.
 */
function underClose(): void {
    const under: HTMLDialogElement = document.getElementById(
        "series-under",
    ) as HTMLDialogElement;
    under.close();
    under.replaceChildren();
    under.style.translate = "";
    dialogOf().style.translate = "";
}

/**
 * Turns the form into that of a group of the tutorials of a type:
 * of a group there as the reader reads it back, see `groupsRead` in `reader/course.ts`,
 * of a new one its days, place and tutors empty,
 * its weeks those of the series of its type, else of any series of the course,
 * so a group of the semester needs only its day, its times and its room.
 * The form it came from is left as it was, unsaved.
 */
function groupStart(type: string, group: string): void {
    const found: Group | undefined = groupsOf(type).find(
        (one: Group): boolean => one.rule.group === group,
    );
    const rule: Rule | undefined = found?.rule;
    const weeks: Rule | undefined = (
        course?.series.find((series: Series): boolean => series.rule.type === type) ??
        course?.series[0]
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
        type: type,
        old: rule ?? null,
        slots: rule?.slots.map((slot: Slot): Slot => ({ ...slot })) ?? [
            { weekday: 0, start: "", end: "" },
        ],
        before: rule?.slots.map((slot: Slot): number => slot.weekday) ?? [0],
        extras: [],
        location: rule?.location ?? standardLineOf(),
        locationLink:
            rule?.locationLink ??
            skillFieldOf("location")?.places[standardLineOf()]?.link ??
            "",
        online: rule?.online ?? "",
        onlineLink: rule?.onlineLink ?? "",
        onlineChannel: rule?.onlineChannel ?? "",
        onlineTitle: rule?.onlineTitle ?? "",
        attendees: rule?.attendees ?? [],
        first: rule?.first ?? weeks?.first ?? "",
        last: rule?.last ?? weeks?.last ?? "",
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
}

/**
 * Tells whether the form has the bin: a group, a plain series,
 * or my series of a type of a module there already, the exams too, never a new one.
 */
function binShows(form: Form): boolean {
    if (grouped !== null) return !grouped.made;
    if (plain !== null) return plain.id !== "";
    return course !== null && repeated === null && form.old !== null;
}

/**
 * Makes the bin of a series there already, at the left of Cancel,
 * as the dialog of an entry has it: the first click only asks,
 * the second removes it and closes the dialog,
 * my series of a module but its boxes done, whose log entries point to them,
 * see `courseSeriesRemove` in `reader/course.ts`.
 * When the reader does not take it, the hint above the buttons says so.
 */
function seriesBinOf(form: Form): HTMLButtonElement {
    const bin: HTMLButtonElement = document.createElement("button");
    const ask: string =
        grouped === null && plain === null
            ? "Really remove? Its boxes done stay"
            : "Really remove?";
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
    bin.type = "button";
    bin.className = "panel-remove";
    iconPut(bin, Trash, grouped !== null ? "Remove the group" : "Remove the series");
    bin.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    bin.addEventListener("click", (): void => {
        if (!removeAsked) {
            removeAsked = true;
            iconPut(bin, QuestionMark, ask);
            return;
        }
        readerAsk<unknown>(address, { method: "DELETE" })
            .then(async (): Promise<void> => {
                if (await groupReturn(true)) return;
                entryBack = null;
                dialogOf().close();
                done();
            })
            .catch(failed);
    });
    return bin;
}

/**
 * Builds the rows of the form of a series anew from what it holds.
 * The dialog stays where it is scrolled to, read before the rows are built,
 * since building them takes the boxes shown out of the rows standing,
 * which would scroll a dialog scrolled to its end up.
 * Save takes no focus, so the extra being typed joins as it saves,
 * not as the focus leaves it, which would build the rows anew under the pointer
 * and lose the click, see {@link formSave}.
 * While my series waits for my group its rows are the same as with a group,
 * in the same places, so pinning one never makes rows appear.
 */
function formFill(): void {
    if (typing === null) return;
    const dialog: HTMLDialogElement = dialogOf();
    const scrolled: number = dialog.scrollTop;
    const form: Form = typing;
    const picking: boolean =
        (fresh !== null &&
            (fresh.category === "" ||
                (fresh.category === skillName && fresh.picked.module === ""))) ||
        (plain === null && repeated === null && course === null);
    const waits: boolean = groupWaits(form);
    const follows: boolean =
        waits || (grouped === null && plain === null && (form.old?.group ?? "") !== "");
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
                  ...lockedOf(
                      follows,
                      grouped !== null || withAsked() ? peopleRowsOf(form) : [],
                  ),
              ];
    const fields: HTMLElement = elementOf("div", "panel-form", "");
    if (grouped !== null)
        fields.append(elementOf("h2", "series-heading", "Series: Group"));
    fields.append(
        ...(fresh === null
            ? rows
            : [
                  ...freshRowsOf(),
                  ...(fresh.category === skillName ? rows.slice(1) : rows),
              ]),
    );
    const buttons: HTMLElement = elementOf("div", "panel-buttons", "");
    const cancel: HTMLButtonElement = document.createElement("button");
    const save: HTMLButtonElement = document.createElement("button");
    cancel.type = "button";
    iconPut(cancel, X, "Cancel");
    cancel.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    cancel.addEventListener("click", (): void => {
        groupReturn(false)
            .then((back: boolean): void => {
                if (!back) dialogOf().close();
            })
            .catch(logged);
    });
    save.type = "submit";
    save.className = "panel-main";
    iconPut(save, Check, "Save");
    save.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    const hint: HTMLElement = elementOf("p", "panel-error", "Saving failed");
    hint.hidden = true;
    const file: HTMLAnchorElement = elementOf("a", "panel-file", "") as HTMLAnchorElement;
    fileShow(
        file,
        plain === null
            ? (repeated?.file ?? course?.file ?? "")
            : plainFileOf(plain, form),
    );
    buttons.append(file, ...(binShows(form) ? [seriesBinOf(form)] : []), cancel, save);
    formElementOf().replaceChildren(fields, hint, buttons);
    formElementOf().classList.toggle("series-exams", form.type === examType);
    dialog.scrollTop = scrolled;
    formChanged();
}

/**
 * Writes the place of the form everywhere while I changed it by its parts,
 * see `renameSend` in `./places.ts`.
 * Before the series is saved only checked, so nothing is written while the reader
 * would refuse it, and after it written, so its boxes, saved with the place as it was,
 * take it with every other entry.
 *
 * @throws {Error} - When the reader does not take the place, like one with an empty name
 */
async function placeRename(form: Form, dry: boolean): Promise<void> {
    if (
        form.location !== "" &&
        placeEdit !== null &&
        JSON.stringify(placeEdit) !== JSON.stringify(placeOriginOf(form))
    )
        await renameSend(labelOf(form.location), placeEdit, dry);
}

/**
 * Saves the form of a series, the extra being typed joined first,
 * so one click on Save takes it,
 * a place and the people renamed checked before and renamed after,
 * and closes the dialog, with the dialog of the box it opened over.
 * When the reader does not take it, the hint above the buttons says so,
 * and the dialog stays.
 * A group saved, new or not, never becomes mine by itself,
 * since pinning is a choice of mine in the menu of the groups.
 */
async function formSave(): Promise<void> {
    if (typing === null) return;
    const exams: boolean = typing.type === examType;
    if (extraJoin(typing, exams ? typing.kinds : undefined)) formFill();
    if (!formReady(typing)) return;
    try {
        await placeRename(typing, true);
        const picked: string[] = typing.attendees.map(
            (person: Attendee): string => person.name,
        );
        await personsRename(personEdits, persons, true, picked);
        await formSend(typing, false);
        await placeRename(typing, false);
        await personsRename(personEdits, persons, false, picked);
    } catch (error: unknown) {
        failed(error);
        return;
    }
    if (await groupReturn(true)) return;
    entryBack = null;
    dialogOf().close();
    done();
}

/**
 * Goes back from the form of a group to my series it was opened from, as I left it,
 * the course loaded anew once the group was saved or removed,
 * so the menu of its groups shows them as they are now.
 * Gives false for a form opened otherwise, which closes as usual.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function groupReturn(reload: boolean): Promise<boolean> {
    if (groupBack === null || grouped === null) return false;
    if (reload && course !== null)
        course = await courseLoad(course.module, course.semester);
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
 * Starts the dialog once for the page: Save or Ctrl+Enter saves,
 * Enter confirms only its field, Cancel, Escape or a click beside it forgets the form,
 * but the form of a group opened from my series goes back to it instead.
 * That back is done by hand, since the copy of my series below
 * stands in the way of the browser's own Escape.
 */
function dialogStart(): void {
    if (dialogStarted) return;
    dialogStarted = true;
    const dialog: HTMLDialogElement = dialogOf();
    formElementOf().addEventListener("submit", (event: SubmitEvent): void => {
        event.preventDefault();
        formSave().catch(logged);
    });
    formElementOf().addEventListener("keydown", (event: KeyboardEvent): void => {
        if (
            event.key !== "Enter" ||
            !(event.target instanceof HTMLInputElement) ||
            event.defaultPrevented
        )
            return;
        event.preventDefault();
        event.target.blur();
        if (event.ctrlKey) formSave().catch(logged);
    });
    const entry: HTMLDialogElement = document.getElementById(
        "entry",
    ) as HTMLDialogElement;
    entry.addEventListener("close", (): void => {
        if (!entry.open) entry.removeAttribute("data-over");
        if (dialog.open && !entry.open) seriesRefresh().catch(logged);
    });
    const back: (event: Event) => void = (event: Event): void => {
        if (
            groupBack === null ||
            !dialog.open ||
            (event instanceof KeyboardEvent &&
                (event.key !== "Escape" ||
                    document.querySelector(":popover-open") !== null))
        )
            return;
        event.preventDefault();
        groupReturn(false).catch(logged);
    };
    dialog.addEventListener("cancel", back);
    document.addEventListener("keydown", back);
    dialog.addEventListener("close", (): void => {
        underClose();
        if (entryBack !== null) entryBackShow(entryBack).catch(logged);
        entryBack = null;
        typing = null;
        plain = null;
        grouped = null;
        personEdits = {};
        previewForget();
    });
}

/**
 * Opens the dialog of a series of a type of a module in a semester,
 * as its rule reads back, a type without series yet new with that type,
 * or without type a new series of the module,
 * over the dialog of a box when that opens it.
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
    repeated = null;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    const loaded: [Course, Category[], Person[]] = await Promise.all([
        courseLoad(module, semester),
        categoriesLoad(),
        personsKept(),
    ]);
    [course, categories, persons] = loaded;
    const rule: Rule | null =
        course.series.find((series: Series): boolean => series.rule.type === type)
            ?.rule ?? (type === examType ? examRuleOf(course) : null);
    formReset();
    listOpened = type === examType;
    typing = {
        type: rule?.type ?? type,
        old: rule,
        slots: rule?.slots.map((slot: Slot): Slot => ({ ...slot })) ?? [
            { weekday: 0, start: "", end: "" },
        ],
        before: rule?.slots.map((slot: Slot): number => slot.weekday) ?? [0],
        extras: rule?.extras.map((extra: Extra): Extra => ({ ...extra })) ?? [],
        location: rule?.location ?? "",
        locationLink: rule?.locationLink ?? "",
        online: rule?.online ?? "",
        onlineLink: rule?.onlineLink ?? "",
        onlineChannel: rule?.onlineChannel ?? "",
        onlineTitle: rule?.onlineTitle ?? "",
        attendees: rule?.attendees ?? [],
        first: rule?.first ?? "",
        last: rule?.last ?? "",
        times: { ...(rule?.times ?? {}) },
        states: {},
        kinds: {},
    };
    kindTyped = "";
    kindAsked = "";
    extraTyped = null;
    formFill();
    dialogShow();
    if (rule === null && type === "")
        formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/**
 * Opens a group of the tutorials of a module in the form of a series,
 * from the menu of the groups, see `./groups.ts`, its group fixed.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function groupOpen(
    module: string,
    type: string,
    semester: string,
    group: string,
): Promise<void> {
    dialogStart();
    fresh = null;
    groupBack = null;
    plain = null;
    done = (): void => {};
    const loaded: [Course, Category[], Person[]] = await Promise.all([
        courseLoad(module, semester),
        categoriesLoad(),
        personsKept(),
    ]);
    [course, categories, persons] = loaded;
    groupStart(type, group);
    dialogShow();
}

/**
 * Shows in the dialog my new series of a skill of a numbered type
 * of a module picked in its rows on top, see {@link seriesNew},
 * so making a series and changing one are one dialog:
 * the one there already as {@link seriesOpen} opens it,
 * else a new one, which saves as a box repeated, see {@link repeatedSend}.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRepeat(
    from: Repeated,
    days: Days,
    saved: () => void,
): Promise<void> {
    const loaded: [Course | null, Category[], Person[]] = await Promise.all([
        courseLoad(from.box.module, from.box.semester).catch((): null => null),
        categoriesLoad(),
        personsKept(),
    ]);
    if (
        loaded[0]?.series.some(
            (series: Series): boolean => series.rule.type === from.box.type,
        ) === true
    ) {
        await seriesOpen(from.box.module, from.box.type, from.box.semester, saved);
        return;
    }
    dialogStart();
    [course, categories, persons] = loaded;
    repeated = from;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    formReset();
    typing = {
        ...days,
        type: from.box.type,
        old: null,
        location: from.box.location,
        locationLink: skillFieldOf("location")?.places[from.box.location]?.link ?? "",
        online: from.box.online ?? "",
        onlineLink: from.box.onlineLink ?? "",
        onlineChannel: from.box.onlineChannel ?? "",
        onlineTitle: from.box.onlineTitle ?? "",
        attendees: from.box.attendees ?? [],
        states: {},
        kinds: {},
    };
    formFill();
    dialogShow();
}

/**
 * Tells whether the form of a plain series is typed enough to make boxes:
 * its days, each a weekday, each once, with a start before its end or a length,
 * and its first day on or before its last, or no last day.
 */
function plainReady(series: Plain, form: Form): boolean {
    const days: boolean = plainTimed
        ? form.slots.length > 0 &&
          form.slots.every(
              (slot: Slot): boolean => slot.weekday > 0 && timesReady(slot),
          ) &&
          new Set(form.slots.map((slot: Slot): number => slot.weekday)).size ===
              form.slots.length
        : form.slots.length > 0 &&
          form.slots.every((slot: Slot): boolean => slot.weekday > 0) &&
          new Set(form.slots.map((slot: Slot): number => slot.weekday)).size ===
              form.slots.length &&
          form.slots.every(
              (slot: Slot): boolean => (plainLengths.get(slot.weekday) ?? 0) > 0,
          );
    const named: boolean =
        series.category === skillName ? series.module !== "" : series.title.trim() !== "";
    return (
        named &&
        days &&
        form.first !== "" &&
        (form.last === "" || form.first <= form.last)
    );
}

/**
 * Gives the parts a plain series is written as, one per time,
 * since a rule has one time for all its weekdays, see `reader/rules.ts`,
 * and the `UID`s of the parts that go.
 * A part of the series as it was keeps its `UID` where its time stays,
 * so its days of that time stay as they are.
 * A time new takes a part whose time went, the series being changed first,
 * so a series whose one time changes stays that series.
 * A part left over goes, see `plainGone` in `reader/rules.ts`.
 * The parts of a series of several times share its `X-SERIES`, the one it had,
 * else one made from the series or anew; a series of one time has none.
 * Its extras go with the part of the series being changed, else with the first part.
 * Each part keeps the earliest first day of the series as it was while the form keeps it.
 */
function plainPartsOf(series: Plain, form: Form): [Plain[], string[]] {
    const texts: Plain = {
        ...series,
        location: form.location,
        online: form.online,
        onlineLink: form.onlineLink,
        onlineChannel: form.onlineChannel,
        onlineTitle: form.onlineTitle,
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
        const time: string = keyOf(
            slot.start,
            slot.end,
            plainLengths.get(slot.weekday) ?? null,
        );
        groups.set(time, [...(groups.get(time) ?? []), slot.weekday]);
    });
    const owners: Map<string, Plain> = new Map();
    was.filter(
        (part: Plain): boolean =>
            (part.start !== "") === plainTimed &&
            groups.has(keyOf(part.start, part.end, part.minutes)),
    ).forEach((part: Plain): void => {
        owners.set(keyOf(part.start, part.end, part.minutes), part);
    });
    const free: Plain[] = was.filter(
        (part: Plain): boolean => ![...owners.values()].includes(part),
    );
    [...groups.keys()]
        .filter((time: string): boolean => !owners.has(time))
        .forEach((time: string): void => {
            const part: Plain | undefined = free.shift();
            if (part !== undefined) owners.set(time, part);
        });
    const key: string =
        groups.size < 2
            ? ""
            : series.series ||
              series.id ||
              `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const earliest: string = was.map((part: Plain): string => part.first).sort()[0] ?? "";
    const kept: string =
        [...owners.entries()].find(
            ([, part]: [string, Plain]): boolean => part.id === series.id,
        )?.[0] ?? [...groups.keys()][0];
    const parts: Plain[] = [...groups.entries()].map(
        ([time, weekdays]: [string, number[]]): Plain => ({
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
                weekdays[0] >= monthly
                    ? []
                    : weekdays.sort(
                          (first: number, second: number): number => first - second,
                      ),
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
        }),
    );
    return [parts, free.map((part: Plain): string => part.id)];
}

/**
 * Sends a plain series to the reader, see `plainApply` in `reader/rules.ts`,
 * each of its parts one after another, then each part that goes.
 * Of a series that has begun, whose past never changes,
 * every further one from today on at the earliest,
 * pointing back to the series being changed as its sibling.
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
    const removed: Planned[] = planned.filter(
        (box: Planned): boolean => box.change === "removed",
    );
    const moved: (box: Planned) => Planned | undefined = (
        box: Planned,
    ): Planned | undefined =>
        box.change === "new"
            ? removed.find((gone: Planned): boolean => gone.day === box.day)
            : undefined;
    return planned
        .filter(
            (box: Planned, index: number): boolean =>
                box.chained !== true ||
                planned.findIndex((other: Planned): boolean => other.id === box.id) ===
                    index,
        )
        .filter(
            (box: Planned): boolean =>
                box.change !== "removed" ||
                !planned.some(
                    (other: Planned): boolean =>
                        other.change === "new" && other.day === box.day,
                ),
        )
        .map((box: Planned): Planned => {
            const gone: Planned | undefined = moved(box);
            return gone === undefined
                ? box
                : {
                      ...box,
                      state: gone.state,
                      change:
                          gone.time === box.time && gone.minutes === box.minutes
                              ? ""
                              : "changed",
                  };
        })
        .sort((first: Planned, second: Planned): number =>
            (first.time || first.day).localeCompare(second.time || second.day),
        );
}

/**
 * Makes the switch of a series of my course or of a group between times and a length,
 * as a plain series has it, by its length its boxes days without time.
 * From times to a length each day takes the length of its times,
 * from a length to times its times stay to type.
 */
function courseSwapOf(form: Form): HTMLButtonElement {
    const timed: boolean = form.slots.every(
        (slot: Slot): boolean => slot.minutes === undefined,
    );
    return lengthSwapOf(timed, (): void => {
        form.slots = form.slots.map((slot: Slot): Slot =>
            timed
                ? {
                      weekday: slot.weekday,
                      start: "",
                      end: "",
                      minutes: timesReady(slot)
                          ? minutesOf(slot.end) - minutesOf(slot.start)
                          : 0,
                  }
                : { weekday: slot.weekday, start: "", end: "" },
        );
        formChanged();
        formFill();
    });
}

/**
 * Makes the row `Day` of a series of my course or of a group, see {@link slotRowsOf},
 * with the switch between times and a length, see {@link courseSwapOf}.
 */
function courseTimeRowsOf(form: Form): HTMLElement[] {
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement =>
        fieldOf(
            "time-field",
            (slot.minutes ?? 0) > 0 ? lengthTextOf(slot.minutes ?? 0) : "",
            `How long on ${weekdayNameOf(slot.weekday, false)}`,
            (time: string): void => {
                slot.minutes = time === "" ? 0 : minutesOf(time);
            },
            formChanged,
        );
    return slotRowsOf(
        form,
        formChanged,
        formFill,
        [courseSwapOf(form)],
        form.slots.every((slot: Slot): boolean => slot.minutes === undefined)
            ? null
            : lengthOf,
    );
}

/**
 * Makes the switch of a plain series between times and a length,
 * see `lengthSwapOf` in `./times.ts`, either way keeping its weekdays.
 */
function plainSwapOf(form: Form): HTMLButtonElement {
    return lengthSwapOf(plainTimed, (): void => {
        if (plainTimed)
            plainLengths = new Map(
                form.slots.map((slot: Slot): [number, number | null] => [
                    slot.weekday,
                    timesReady(slot)
                        ? minutesOf(slot.end) - minutesOf(slot.start)
                        : (plainLengths.get(slot.weekday) ?? null),
                ]),
            );
        form.slots = form.slots.map((slot: Slot): Slot => ({
            weekday: slot.weekday,
            start: "",
            end: "",
        }));
        plainTimed = !plainTimed;
        formFill();
    });
}

/**
 * Makes the row `Day` of a plain series, see {@link slotRowsOf},
 * with the switch between times and a length, see {@link plainSwapOf}.
 */
function plainTimeRowsOf(form: Form): HTMLElement[] {
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement => {
        const minutes: number | null =
            plainLengths.get(slot.weekday) ??
            plainLengths.get(form.slots[0]?.weekday ?? 0) ??
            [...plainLengths.values()].find(
                (one: number | null): boolean => one !== null,
            ) ??
            null;
        plainLengths.set(slot.weekday, minutes);
        return fieldOf(
            "time-field",
            minutes === null ? "" : lengthTextOf(minutes),
            `How long on ${dayNameOf(slot.weekday)}`,
            (time: string): void => {
                plainLengths.set(slot.weekday, time === "" ? null : minutesOf(time));
            },
            formChanged,
        );
    };
    return slotRowsOf(
        form,
        formChanged,
        formFill,
        [plainSwapOf(form)],
        plainTimed ? null : lengthOf,
        true,
    );
}

/**
 * Makes the rows of the form of a plain series,
 * no row of its category, which stays that of the box it opened from.
 */
function plainRowsOf(series: Plain, form: Form): HTMLElement[] {
    return [
        rowOf("Summary", plainSummaryOf(series)),
        ...(series.category === skillName
            ? [semesterRowOf(series.semester || semesterOf(form.first))]
            : []),
        placeRowOf(form),
        ...onlineRowsOf(form),
        ...plainTimeRowsOf(form),
        datesRowOf(form, formChanged),
        boxesRowOf(),
        ...(withAsked() ? peopleRowsOf(form) : []),
    ];
}

/**
 * Makes the summary of a plain series, which every box of it takes,
 * picked as the dialog of a box picks it, see `fieldRowsOf` in `./categories.ts`,
 * of a skill its text to type, since what a skill box is follows from its skill.
 */
function plainSummaryOf(series: Plain): HTMLElement {
    const field: Field | undefined =
        series.category === skillName
            ? undefined
            : categories
                  .find(
                      (category: Category): boolean => category.name === series.category,
                  )
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
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    pencil.hidden = series.title === "";
    iconPut(pencil, Pencil, "Change the summary");
    const picker: HTMLElement = choicesOf({
        search: searchOf(field.values.map(choiceOf)),
        picked:
            series.title === ""
                ? []
                : field.many === true
                  ? series.title.split(", ")
                  : [series.title],
        many: field.many === true,
        adding: !field.fixed,
        noun: "summary",
        order:
            field.many !== true || field.fixed
                ? undefined
                : (chosen: string[]): string[] =>
                      [...chosen].sort(
                          (first: string, second: string): number =>
                              rankOf(first) - rankOf(second),
                      ),
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
 * Opens the dialog for a plain series, over the dialog of a box when that opens it,
 * its form filled from the series and its parts going on,
 * see `plainRead` in `reader/rules.ts`,
 * with times while it has them, else with its length.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function plainStart(series: Plain, saved: () => void): Promise<void> {
    const parts: Plain[] = series.parts.length > 0 ? series.parts : [series];
    const daysOf: (part: Plain) => number[] = (part: Plain): number[] =>
        part.month > 0 ? [yearly] : part.monthDay > 0 ? [monthly] : part.weekdays;
    const loaded: [Category[], Person[]] = await Promise.all([
        categoriesLoad(),
        personsKept(),
    ]);
    dialogStart();
    [categories, persons] = loaded;
    course = null;
    repeated = null;
    plain = series;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    plainTimed = series.start !== "";
    plainLengths = new Map(
        parts.flatMap((part: Plain): [number, number | null][] =>
            daysOf(part).map((weekday: number): [number, number | null] => [
                weekday,
                part.minutes,
            ]),
        ),
    );
    done = saved;
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
        type: "",
        old: null,
        slots: slots,
        before: slots.map((): number => 0),
        extras: parts
            .flatMap((part: Plain): Extra[] =>
                part.extras.map((extra: Extra): Extra => ({ ...extra })),
            )
            .sort((first: Extra, second: Extra): number =>
                first.day.localeCompare(second.day),
            ),
        location: series.location,
        locationLink: skillFieldOf("location")?.places[series.location]?.link ?? "",
        online: series.online,
        onlineLink: series.onlineLink,
        onlineChannel: series.onlineChannel,
        onlineTitle: series.onlineTitle,
        attendees: series.attendees,
        first: parts.map((part: Plain): string => part.first).sort()[0],
        last: series.last,
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
    dialogShow();
}

/**
 * Opens the dialog of a plain series by its `UID`,
 * from the series icon ⟳ after the times of one of its boxes,
 * see `seriesShow` in `./categories.ts`.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function plainOpen(id: string, saved: () => void): Promise<void> {
    fresh = null;
    await plainStart(
        await readerAsk<Plain>(`/api/day/plain?id=${encodeURIComponent(id)}`),
        saved,
    );
}

/**
 * Opens the dialog of my own learning of a module as a series,
 * from the card `Learning` on the page of the module, see `../editor/course.ts`:
 * the plain series its planned boxes belong to,
 * else a new one of the skill without type in the semester from today.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function learningOpen(
    module: string,
    semester: string,
    id: string,
): Promise<void> {
    fresh = null;
    if (id !== "") {
        await plainOpen(id, (): void => {});
        return;
    }
    const today: string = dayOf(new Date());
    await plainStart(
        {
            id: "",
            category: skillName,
            title: "",
            module: module,
            type: "",
            semester: semester,
            location: standardLineOf(),
            online: "",
            onlineLink: "",
            onlineChannel: "",
            onlineTitle: "",
            attendees: [],
            weekdays: [weekdayOf(today)],
            monthDay: 0,
            month: 0,
            start: "",
            end: "",
            minutes: null,
            first: today,
            last: "",
            extras: [],
            file: "",
            series: "",
            parts: [],
        },
        (): void => {},
    );
}

/**
 * Makes the rows on top of the dialog of a new series: its category,
 * and of a skill its skill and type, see `skillPairOf` in `./skill.ts`,
 * in place of the summary its form shows below them.
 */
function freshRowsOf(): HTMLElement[] {
    if (fresh === null) return [];
    const category: HTMLElement = rowOf(
        "Category",
        choicesOf({
            search: searchOf(
                categories.map((one: Category): Choice => choiceOf(one.name)),
            ),
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
                freshFollow().catch(logged);
            },
        }),
    );
    if (fresh.category !== skillName) return [category];
    const holder: HTMLElement = elementOf("div", "", "");
    skillPairOf(fresh.picked, (picked: ModuleType): void => {
        if (fresh === null) return;
        fresh = { ...fresh, picked: picked };
        freshFollow().catch(logged);
    })
        .then((pair: HTMLElement): void => holder.replaceChildren(pair))
        .catch(logged);
    return [category, rowOf("Summary", holder)];
}

/**
 * Gives the semester of the form of a series of my course, empty for none:
 * that of its course, else of the box it repeats, else the one picked for a new series.
 */
function courseSemesterOf(): string {
    return course?.semester ?? repeated?.box.semester ?? fresh?.semester ?? "";
}

/**
 * Makes the row `Semester` of a skill series,
 * picked from those of its skill, never typed.
 * Picking another shows the form of that semester, see {@link semesterSwitch},
 * since a series of my course is one of a module, a type and a semester.
 * Of a numbered type of a module the group stands beside it,
 * as the type beside the skill in the summary.
 */
function semesterRowOf(semester: string): HTMLElement {
    const module: string =
        plain?.module ??
        repeated?.box.module ??
        (course === null ? (fresh?.picked.module ?? "") : course.module.split("_")[0]);
    const day: string = typing?.first || dayOf(new Date());
    const picker: HTMLElement = choicesOf({
        search: async (text: string): Promise<Choice[]> =>
            searchOf(await semestersOf(module, day, semester))(text),
        picked: semester === "" ? [] : [semester],
        many: false,
        adding: false,
        noun: "semester",
        pick: (values: string[]): void => {
            if ((values[0] ?? semester) !== semester)
                semesterSwitch(values[0]).catch(logged);
        },
    });
    const form: Form | null = typing;
    if (
        plain !== null ||
        course === null ||
        form === null ||
        !numberedTypes.includes(form.type)
    )
        return rowOf("Semester", picker);
    const pair: HTMLDivElement = pairOf(
        picker,
        grouped === null ? groupPickOf(form) : groupPartOf(),
    );
    pair.classList.add("series-semester");
    return rowOf("Semester", pair);
}

/**
 * Shows the form in another semester, as its row `Semester` picks it:
 * the same series, group or new series in that semester, new while it has none.
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
 * Shows the form the rows on top of the dialog of a new series picked:
 * while nothing is picked those rows alone, of the exams the exams of its module,
 * of a skill of a numbered type my series of that type, see {@link seriesRepeat},
 * of any other a new plain series, see {@link plainStart}.
 * The rows on top stay above every new one.
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
        const kept: {
            day: string;
            category: string;
            picked: ModuleType;
            semester: string;
        } = fresh;
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
        if (
            course !== null &&
            course.series.some(
                (series: Series): boolean => series.rule.type === picked.type,
            )
        )
            return;
        fresh = kept;
        formFill();
        return;
    }
    await plainStart(
        {
            id: "",
            category: fresh.category,
            title: "",
            module: skill ? picked.module : "",
            type: skill ? picked.type : "",
            semester: skill ? fresh.semester : "",
            location: standardLineOf(),
            online: "",
            onlineLink: "",
            onlineChannel: "",
            onlineTitle: "",
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
        },
        done,
    );
}

/**
 * Opens the dialog of a new series from nothing, by `⟳` beside `+` of the plan,
 * see `boxesStart` in `./boxes.ts`, its first day the day shown.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function seriesNew(day: string, saved: () => void): Promise<void> {
    const loaded: [Category[], Person[]] = await Promise.all([
        categoriesLoad(),
        personsKept(),
    ]);
    dialogStart();
    [categories, persons] = loaded;
    fresh = {
        day: day,
        category: "",
        picked: { module: "", type: "" },
        semester: semesterOf(day),
    };
    course = null;
    repeated = null;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    formReset();
    typing = {
        type: "",
        old: null,
        slots: [{ weekday: weekdayOf(day), start: "", end: "" }],
        before: [0],
        extras: [],
        location: standardLineOf(),
        locationLink: skillFieldOf("location")?.places[standardLineOf()]?.link ?? "",
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        attendees: [],
        first: day,
        last: "",
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
    dialogShow();
    formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}
