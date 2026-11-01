/**
 * ## Categories
 *
 * Writes plan and log the same way, by category, in one dialog without a title,
 * all its room for the fields, one column of rows in the order of the file,
 * see `choices.ts`: the category at the top, then what it is,
 * where it is, its times, then its other fields one after another,
 * the note always at the bottom,
 * a click on a row opening its one list right under it, then `Save`;
 * an empty field stays empty, without dash or placeholder,
 * but a time, which says grey `hh:mm`, see `timeFieldStart` in `times.ts`.
 * Esc closes an open list, else the dialog,
 * and a click beside the dialog closes it without saving.
 * Enter in a field confirms only that field,
 * and the entry saves only by its check or Ctrl+Enter or Ctrl+S, see {@link enterTake}.
 * A new entry opens with the list of the categories open.
 * A changed entry of the log saves
 * only while its file still holds it as the dialog opened it,
 * the first save winning, else the dialog says so above its buttons,
 * see {@link entrySave}.
 * Every category has its `Summary`, the `SUMMARY` of its file, its `Place`,
 * a way also `From` before its place, and below the times `With`,
 * who I was with, see {@link withRowOf};
 * a value with steps shows them below its line while it is picked,
 * with the note of its last entry.
 * In the log, `Food` and `Cook` have their own rows, see `meal.ts`,
 * `Sport` its workout and no note, since what I did stands in its rows, see `sport.ts`,
 * and `Skill` its skill and type, chapters, documents and attempts, see `skill.ts`.
 * The categories come in the order the reader gives them,
 * by their importance for my life,
 * without `Drink`, since water has its own tracker.
 * Each list comes from the log, the most used first,
 * searched as I type, see `choices.ts`;
 * the typed text can be added as a new value with `+ New summary` at the end of the list,
 * but to the summary of `Sport` and `Way`, whose lists take no new ones.
 * Every summary has a pencil `✎` beside it, as a place has,
 * which always changes it, in plan and log alike, see {@link summaryChange},
 * also that of `Sport` and `Way`;
 * the new text changes only this box or entry,
 * a box and the entry logged from it together;
 * a summary of several values has one pencil per value, see {@link manyRowOf}.
 * Every value takes a param by a small plus beside it, see {@link paramPickerOf},
 * which its pencil changes for every entry and box of its category,
 * see {@link paramsRename}.
 * A box of a series of the plan and an entry logged from it
 * open no list, see {@link ofSeries}, and only their pencil changes them alone;
 * the whole series changes only in the dialog of the series,
 * by the series icon ⟳ after its times, see {@link seriesShow}.
 * Every summary has its link below its text, typed,
 * a web address or a path from `NomWorkspace`,
 * opening on a click only while it is valid;
 * that of `Skill` by default the folder of its skill, which the reader writes.
 * Places are only my places of `Places.md`, see `places.ts`;
 * the pencil of a place shows its parts below it, see {@link partsOf},
 * which change the place everywhere once the dialog saves, see {@link placesRename};
 * a new place goes into `Places.md` by its typed name when picked,
 * its parts showing below it at once, so I type them next, see {@link placeAdd}.
 * A place is only where I physically am;
 * below it every category has `Online`, see {@link onlineRowOf}.
 * A new entry starts where I was last, see {@link lastPlaceFill}.
 * Plan and log use one and the same dialog with the same fields and lists:
 * an entry and a box alike have a start and an end,
 * each a day and a plain time, as calendar apps write them,
 * the day of the end filling itself,
 * see {@link endDayFill}; all saved exactly as they show.
 * The times of a box may stay empty, a box of its day,
 * but for a lecture imported from TUMonline, which keeps both, see `reader/boxes.ts`;
 * its start is its expected time, the minutes to its end its expected duration.
 * Only a to-do of the plan has one more field, its deadline;
 * a box with a deadline lies on the day of its deadline and has no expected time,
 * so start and end are off while the day of a deadline is typed.
 * `+` always makes one box;
 * a new series comes only from `⟳` beside it, see `seriesNew` in `series.ts`.
 * A box of a series of my course shows after its times its group,
 * see `../day/groups.ts`, and opens its series, see {@link seriesShow}.
 * The dialog of a series opens over this one,
 * which stands as it was once it closes, one level back,
 * and closes with it once it saves.
 * The dialog opens for the log from `+` below the time grid,
 * from a range selected in the time grid, and from a log entry that can be changed;
 * for a box from `+` below the list of boxes,
 * and from a box that can be changed, to change it or to log it instead;
 * one that cannot, like an occurrence of a weekly lecture, opens it to be logged.
 * A log entry logged from a box points to it,
 * also to an occurrence of a series, see `entries.ts`;
 * a box logged by dragging or by a tap needs no dialog, see `boxes.ts`.
 * The dialog of an entry or a box being changed duplicates it with the copy at the left
 * of its buttons, see {@link entryDuplicate}.
 */

import { choiceOf, choicesOf, fileShow, listsStart, partFieldOf, pairOf, partOf, rowOf, searchOf } from "./choices.ts";
import { boxAdd, boxChange, boxDelete, entryAdd, entryChange, entryDelete, standardAddressOf } from "./entries.ts";
import { cookName, foodName, mealCooked, mealFoods, mealOf, mealTitle } from "./meal.ts";
import { sportName, sportOpen, sportRead, sportRowsOf } from "./sport.ts";
import {
    addressOf,
    labelOf,
    lineOf,
    placeAddressOf,
    placeChoiceOf,
    placeEditOf,
    placeOf,
    placeSend,
    renameSend,
    standardFirst,
} from "./places.ts";
import {
    skillDaySet,
    skillFieldsShow,
    skillNameOf,
    skillLinksRead,
    skillModuleType,
    skillPathOf,
    skillPathShow,
    skillSave,
    skillSemesterOf,
    skillTitleOf,
} from "./skill.ts";
import { plainOpen, seriesHas, seriesOpen } from "./series.ts";
import { onlineRowOf, withRowOf } from "./attendance.ts";
import { boxGroupOf, pickable } from "./groups.ts";
import {
    dateOf,
    dateParse,
    lengthSwapOf,
    lengthTextOf,
    minutesOf,
    timeFieldRead,
    timeFieldShow,
    timeOf,
    weekdayDateTextOf,
} from "./times.ts";
import { personsKept, personsRename } from "../persons.ts";
import { dayAdd, dayOf, semesterOf, skillName } from "../skill/attempts.ts";
import { folderLinkShow } from "../skill/links.ts";
import { iconPut, QuestionMark } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { changesKept } from "../changes.ts";
import { Check, Copy, Pencil, Plus, Repeat, Trash, X } from "lucide";

import type { Calendar, EventApi } from "fullcalendar";
import type { IconNode } from "lucide";
import type { Box } from "./boxes.ts";
import type { Choice } from "./choices.ts";
import type { BoxFields, EntryFields } from "./entries.ts";
import type { ModuleType, SkillValues } from "./skill.ts";
import type { PersonEdit } from "../persons.ts";
import type { Course } from "./series.ts";
import type { FieldKey } from "../../reader/categories.ts";
import type { Place, Platform } from "../../reader/places.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";
import type { Person } from "../../reader/persons.ts";

/** Fields of a place, where an entry is and where a way starts, sharing one list. */
const placeKeys: FieldKey[] = ["from", "location"];

/**
 * What parts the names of `With` in the values of the dialog, `; `,
 * since a person of `Persons.md` holds a comma in its name;
 * its line shows them apart by a middle dot, see {@link withRowOf}.
 */
const withParting: string = "; ";

/**
 * Folders and topics of the files of plan and log, by category,
 * as `topics` in `reader/sources.ts` names them, see {@link entryFileOf}.
 */
const topics: { [category: string]: string } = {
    Sleep: "Health/Sleep",
    Food: "Living/Food",
    Cook: "Living/Food",
    Way: "Living/Way",
};

/**
 * A field of a category, as the reader gives it.
 *
 * - `steps`: Steps of a value offered in the code, by the value.
 * - `fixed`: Whether it takes only its values, and no new ones.
 * - `many`: Whether it takes several of its values, parted by `, `,
 *   see {@link manyRowOf}, or the people of `With`, parted by `; `,
 *   see {@link withRowOf}; one when left out.
 * - `rooms`: For a field of a place, the rooms of the university in `Rooms.md`,
 *   which its list offers only as I search, see {@link placeSearchOf}.
 * - `places`: For a field of a place, each of my places and rooms as its row holds it.
 * - `links`: For `With` the address of each name its last entry wrote.
 * - `params`: For a summary the params each value had before, the most used first.
 * - `platforms`: For `Online` each of my platforms as its row of `Online.md` holds it.
 */
export type Field = {
    name: string;
    key: FieldKey;
    values: string[];
    steps: { [value: string]: string[] };
    fixed: boolean;
    many?: boolean;
    rooms: string[];
    places: { [line: string]: Place };
    links: { [value: string]: string };
    params: { [value: string]: string[] };
    platforms: { [name: string]: Platform };
};

/**
 * A category, as the reader gives it;
 * without a field `title` its name would be the title,
 * as in an old `Sleep` written before it had its what.
 */
export type Category = {
    name: string;
    fields: Field[];
};

/** What the dialog writes: an entry of the log, or a box of the plan. */
type EntryTarget = "log" | "box";

/**
 * What the dialog shows when it opens.
 * The links, addresses and parts online come as the entry, the box or the box to log
 * has them, or the one it is a copy of, empty for none.
 *
 * - `start`: Start of an entry of the log; for a box any time on its day.
 *   Its day is the day of the times of the dialog.
 * - `end`: End of an entry of the log; for a box the same as `start`.
 * - `values`: Values picked already, by the field they write into,
 *   for `with` the names, parted by `; `, see {@link withParting}.
 * - `titleLink`: Link of what it was, the `ALTREP` of its `SUMMARY`,
 *   for a skill entry the folder of its skill or of its material,
 *   or a web address an older entry kept.
 * - `plan`: Box a new entry of the log is logged from, else `null`.
 */
type EntryOpening = {
    target: EntryTarget;
    start: Date;
    end: Date;
    time: Date | null;
    minutes: number | null;
    category: string | null;
    values: { [key in FieldKey]: string };
    addresses: { [name: string]: string };
    titleLink: string;
    locationLink: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
    note: string;
    foods: string[];
    skill: SkillValues;
    plan: Box | null;
    entry: EventApi | null;
    box: Box | null;
};

/** The text fields an entry of the log and a box of the plan share, see {@link textsRead}. */
type EntryTexts = Omit<EntryFields, "foods" | "planned" | "start" | "end">;

/**
 * Category and what of my long neck session,
 * which I rate my neck pain with, see {@link painRowOf}.
 */
const neckLong: [string, string] = ["Body", "Neck long"];

/** Values of a skill entry that has none yet. */
const skillNone: SkillValues = {
    module: "",
    type: "",
    semester: "",
    title: "",
    titleLink: "",
    chapters: [],
    links: [],
    rounds: [],
};

/** Gives the values of no field picked. */
function valuesNone(): { [key in FieldKey]: string } {
    return { title: "", from: "", location: "", online: "", with: "" };
}

/** Gives what a new entry or box opens with: its times, nothing picked. */
function openingOf(target: EntryTarget, start: Date, end: Date): EntryOpening {
    return {
        target: target,
        start: start,
        end: end,
        time: null,
        minutes: null,
        category: null,
        values: valuesNone(),
        addresses: {},
        titleLink: "",
        locationLink: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        note: "",
        foods: [],
        skill: skillNone,
        plan: null,
        entry: null,
        box: null,
    };
}

/**
 * Categories with the values of their fields, a copy of those kept,
 * see {@link categoriesKept}, made as the dialog opens,
 * since a value picked new joins the lists of the open dialog only, see {@link valueAdd}.
 */
let categories: Category[] = [];

/** Values picked in the lists of the fields, by the field they write into. */
let values: { [key in FieldKey]: string } = valuesNone();

/** What the open dialog shows. */
let opened: EntryOpening = openingOf("log", new Date(), new Date());

/**
 * Link, channel and title of the meeting or video of the platform picked in `Online`,
 * the link written as the `ALTREP` of its `X-ONLINE`, see {@link onlineRowOf};
 * empty once another platform is picked; the platform itself is in {@link values}.
 */
let onlineParts: Omit<Online, "online"> = {
    onlineLink: "",
    onlineChannel: "",
    onlineTitle: "",
};

/**
 * Whether `Online` shows its parts below it to type, see {@link onlineRowOf},
 * opened and closed by its pencil, and opened as a new platform is added.
 */
let onlineOpen: boolean = false;

/**
 * Field of a place whose place shows its parts below it, see {@link partsOf}:
 * after a new place is added, or by its pencil; `null` while none does.
 */
let partsOpen: FieldKey | null = null;

/**
 * The place picked in each field of a place as I changed it by its parts,
 * which the dialog writes everywhere once it saves, see {@link placesRename};
 * `null` while I changed nothing, and once another place is picked.
 */
let edits: { [key in FieldKey]: Place | null } = {
    title: null,
    from: null,
    location: null,
    online: null,
    with: null,
};

/** Line of the place just added, see {@link placeAdd}, so picking it shows its parts. */
let addedLine: string = "";

/**
 * A web address without spaces, as the reader takes it,
 * see `linkForm` in `reader/places.ts`;
 * any other link of a skill entry is the folder the reader writes.
 */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Link of what the entry or the box was as it kept it, the `ALTREP` of its `SUMMARY`,
 * see {@link summaryPartsOf}; empty for none, a skill entry then linking the folder
 * of its skill or of its material, which the reader writes.
 */
let summaryLink: string = "";

/** Whether the summary shows its text to change below it, see {@link summaryPartsOf}. */
let summaryOpen: boolean = false;

/**
 * The value of a summary of several values whose pencil is open, its place among them,
 * see {@link manyRowOf}; -1 while the part `Text` holds the whole summary.
 */
let summaryValue: number = -1;

/**
 * The value and the param of a value of a summary, in round brackets at its end.
 * Its list offers only the value,
 * its param stands beside it as the type of a skill entry,
 * the same in brackets, see {@link paramPickerOf}, but typed as I like.
 */
const paramForm: RegExp = /^(.*?)\s*\(([^()]*)\)\s*$/;

/** Gives a value of a summary without its param, see {@link paramForm}. */
function baseOf(value: string): string {
    return paramForm.exec(value)?.[1] ?? value;
}

/** Gives the param of a value of a summary, empty for none, see {@link paramForm}. */
function paramOf(value: string): string {
    return paramForm.exec(value)?.[2] ?? "";
}

/**
 * Writes a value of a summary with its param, see {@link paramForm},
 * without what would part it from the value.
 */
function paramPut(base: string, param: string): string {
    const clean: string = param.replace(/[,()]/g, "").trim();
    return clean === "" ? base : `${base} (${clean})`;
}

/**
 * The values of a summary of several values as its part `Text` got the cursor,
 * which it changes one of as I type, see {@link summaryValue}.
 */
let summaryValues: string[] = [];

/**
 * The title the skill and the type picked of a skill entry give it, as last shown,
 * see {@link skillChanged}; empty for any other entry.
 */
let skillGiven: string = "";

/** Pencil beside the summary, its link below it, its text, its link typed, its param. */
type SummaryParts = [HTMLButtonElement, HTMLAnchorElement, HTMLInputElement, HTMLInputElement, HTMLInputElement | null];

/**
 * Pencil beside the summary, its link below it and its fields as shown,
 * see {@link summaryPartsOf}; `null` while no summary shows them.
 */
let summaryShown: SummaryParts | null = null;

/** Category picked, `null` before picking. */
let chosen: Category | null = null;

/**
 * The rows of a meal or a cooking of the log in place of its summary, see `meal.ts`,
 * while `Food` or `Cook` is picked for the log;
 * `null` for every other category, whose summary is a plain field.
 */
let meal: HTMLElement[] | null = null;

/** Whether the remove button was clicked once and waits for the second click. */
let removeAsked: boolean = false;

/** My neck pain from 0 to 10 picked for a long neck session, empty for none. */
let pain: string = "";

/**
 * What the real minutes of the last entries like a box were loaded for last,
 * so they load again only when one of them changes, see {@link realLoad}.
 */
let realSeen: string = "";

/** Median of the real minutes of the last entries like a box, see {@link realLoad}. */
let realMiddle: number | null = null;

/**
 * Whether I typed into the day of the end of a log entry since the dialog opened,
 * so it no longer fills itself, see {@link endDayFill}.
 */
let endDayTyped: boolean = false;

/**
 * Address of each name of `With` as the dialog has it, by name,
 * as the entry or the box had it, or as typed by its pencil, see {@link withRowOf};
 * a name without one takes it by {@link peopleRead}.
 */
let addresses: { [name: string]: string } = {};

/** The names of `With` that show their parts below them, see {@link withRowOf}. */
let withOpen: string[] = [];

/**
 * Each person of `With` I changed by its parts, by its name as picked,
 * see `withPartsOf` in `./attendance.ts`,
 * which the dialog writes everywhere once it saves,
 * see `personsRename` in `../persons.ts`.
 */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/**
 * Each param I changed by the part `Param` of a pencil, by its value without param,
 * with the param it had as I first typed and the param typed,
 * which the dialog writes in every entry and box with it once it saves,
 * see {@link paramsRename}.
 */
let paramEdits: { [value: string]: { old: string; name: string } } = {};

/**
 * The people of `Persons.md` as kept when the dialog opened,
 * see `personsKept` in `../persons.ts`, which `With` offers.
 */
let persons: Person[] = [];

/**
 * Place a new entry or box started with, where I was last,
 * see {@link lastPlaceFill}, so a way picked
 * after it starts there instead of going there;
 * empty while none was filled in.
 */
let placeFilled: string = "";

/**
 * Whether the box of the dialog lasts only so long, its day and its length without times,
 * as the switch after its times sets it, see {@link lengthShow};
 * never an entry of the log.
 */
let lengthOnly: boolean = false;

/**
 * Field of the times that {@link timesCheck} marked wrong, `null` for none:
 * once I type into any field of the times, its mark goes,
 * since that may set the times right, and the next save checks them again.
 */
let timesMarked: HTMLInputElement | null = null;

/**
 * The calendar of the day the dialog writes with, see {@link categoriesStart};
 * the dialog of a series logs and takes back the boxes of its list with it,
 * see `series.ts`.
 */
let dayCalendar: Calendar | null = null;

/** Gives a field of the dialog by its id. */
function inputOf(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

/** Hides an element of the dialog by its id, or shows it. */
function hiddenSet(id: string, hidden: boolean): void {
    document.getElementById(id)?.toggleAttribute("hidden", hidden);
}

/** Reads the time typed in a field of the dialog, see `timeFieldRead` in `times.ts`. */
function timeRead(id: string): string {
    return timeFieldRead(inputOf(id));
}

/** Reads the day typed in a field of the dialog, `null` while it is no date. */
function dayTypedOf(id: string): string | null {
    return dateParse(inputOf(id).value);
}

/**
 * Loads the categories with the values of their fields from the reader;
 * an answer that is an error, like while the reader cannot read a file, is no categories,
 * so the next opening of the dialog loads them again.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function categoriesLoad(): Promise<Category[]> {
    return readerAsk<Category[]>(`/api/day/categories?now=${new Date().toISOString()}`);
}

/**
 * Gives the categories with the values of their fields as the reader last sent them,
 * see `changesKept` in `../changes.ts`, so opening the dialog waits for no answer.
 */
const categoriesKept: () => Promise<Category[]> = changesKept(categoriesLoad);

/**
 * Gives the start of the entry or the box as the fields of the dialog say:
 * its time on its typed day,
 * on the day the dialog opened with should the typed day be no date.
 */
function startRead(): Date {
    const day: string = dayTypedOf("entry-start-day") ?? dayOf(opened.start);
    return dateOf(new Date(`${day}T12:00:00`), timeRead("entry-start"));
}

/**
 * Reads the values picked in the lists of the fields of the category picked,
 * empty for a field the category does not have.
 */
function valuesRead(): { [key in FieldKey]: string } {
    const picked: { [key in FieldKey]: string } = valuesNone();
    (chosen?.fields ?? []).forEach((field: Field): void => {
        picked[field.key] = values[field.key];
    });
    return picked;
}

/** Tells whether `Food` or `Cook` is picked for the log and holds a food. */
function foodsListed(): boolean {
    return [foodName, cookName].includes(chosen?.name ?? "") && opened.target === "log" && mealFoods().length > 0;
}

/**
 * Allows saving once a category and its summary are picked, never without:
 * of a skill its skill, its type may stay empty,
 * see `categoryAllows` in `reader/categories.ts`,
 * which refuses it too; while one is missing, Save stays off,
 * as everywhere in the dashboard, without a word.
 * Every other field may stay empty, but the times,
 * which the browser asks for before it sends the form;
 * a task picked without result is left out, see `skill.ts`.
 * Called on every change of the fields, it also shows the summary's parts
 * and the file, see {@link summaryPartsShow} and {@link entryFileShow}.
 */
function saveAllow(): void {
    const named: boolean =
        chosen !== null &&
        (chosen.name === skillName ? skillModuleType().module !== "" : titleRead(valuesRead().title).trim() !== "");
    (document.getElementById("entry-save") as HTMLButtonElement).disabled = !named;
    summaryPartsShow();
    realLoad().catch(console.error);
    entryFileShow();
}

/**
 * Gives the file of the entry or the box: the file it lies in,
 * or for a new one the file the reader will write it into,
 * as `calendarFileOf` in `reader/documents.ts` names it:
 * for `Skill` the log or the plan of its skill,
 * in `Modules/` for a module and in `Skilling/` for a project,
 * none while no skill is picked;
 * for any other category those of its topic in the year of its day, see {@link topics};
 * nothing while no category is picked.
 */
function entryFileOf(): string {
    const folder: string = "NomManageplannings/NomManagecalendar";
    const ending: string = opened.target === "log" ? "_Log.ics" : "_Plan.ics";
    const name: string = skillNameOf();
    const skills: string = /^[A-Z]+\d+_/.test(name) ? "Modules" : "Skilling";
    const fresh: boolean = opened.entry === null && opened.box === null;
    let file: string = opened.entry?.extendedProps.file ?? opened.box?.file ?? "";
    if (fresh && chosen?.name === skillName) file = name === "" ? "" : `${folder}/${skills}/${name}${ending}`;
    else if (fresh && chosen !== null) file = topicFileOf(chosen.name, dayRead(), ending);
    return file;
}

/**
 * Gives the file of plan or log of an entry or a box of a category other than `Skill`,
 * as the reader names it, see `topicFileOf` in `reader/sources.ts`;
 * for the dialog of an entry and that of a new series, see `series.ts`.
 */
export function topicFileOf(category: string, day: string, ending: string): string {
    return (
        `NomManageplannings/NomManagecalendar/${topics[category] ?? "Living/Living"}` + `_${day.slice(0, 4)}${ending}`
    );
}

/** Shows the file of the entry or box left of the buttons, see {@link entryFileOf}. */
function entryFileShow(): void {
    fileShow(document.getElementById("entry-file") as HTMLAnchorElement, entryFileOf());
}

/**
 * Loads how long the last three entries like a box really lasted,
 * and gives a new box their median as its length, see {@link endFill},
 * so I plan by what happened, not by a hope (Buehler 1994);
 * the dialog shows them no more,
 * since a line of minutes under the deadline only puzzled me.
 * Nothing for an entry of the log and while none is logged.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function realLoad(): Promise<void> {
    const texts: EntryTexts = textsRead(dayOf(opened.start));
    const asked: URLSearchParams = new URLSearchParams({
        category: texts.category,
        title: texts.title,
        module: texts.module,
        type: texts.type,
    });
    const key: string = `${opened.target} ${asked}`;
    if (key === realSeen) return;
    realSeen = key;
    realMiddle = null;
    if (opened.target !== "box" || texts.category === "") return;

    const real: number[] = await readerAsk<number[]>(`/api/day/real?${asked}`);
    if (key !== realSeen || real.length === 0) return;
    const sorted: number[] = [...real].sort((first: number, second: number): number => first - second);
    realMiddle = sorted[Math.floor(real.length / 2)];
    endFill();
}

/**
 * Fills the end of a new box while its time is empty, see {@link endFit},
 * from its start and the median of the real minutes of the last entries like it,
 * see {@link realLoad};
 * nothing for a box being changed, an entry of the log, a box without start time,
 * or while no entry like it is logged.
 */
function endFill(): void {
    if (
        opened.target === "box" &&
        opened.box === null &&
        realMiddle !== null &&
        inputOf("entry-end").value.trim() === ""
    )
        endFit(realMiddle);
}

/**
 * Puts the end at its start and minutes after, for a session of sport the minutes
 * of its videos, as `sport.ts` asks while it holds only videos;
 * nothing while the start has no time.
 */
function endFit(minutes: number): void {
    if (timeRead("entry-start") === "") return;
    timeFieldShow(inputOf("entry-end"), new Date(startRead().getTime() + minutes * 60 * 1000));
    endDayFill();
}

/** Tells whether a field is one of a place, see {@link placeKeys}. */
function placeIs(field: Field): boolean {
    return placeKeys.includes(field.key);
}

/**
 * Takes a value picked into the list of every field of its kind that lacks it,
 * because places are one list for every field of a place;
 * a room picked stays among the rooms, which the list offers only as I search,
 * see {@link placeSearchOf}.
 */
function valueAdd(field: Field, value: string): void {
    (chosen?.fields ?? [])
        .filter(
            (other: Field): boolean =>
                (other.key === field.key || (placeIs(other) && placeIs(field))) &&
                !other.values.includes(value) &&
                !other.rooms.includes(value),
        )
        .forEach((other: Field): void => {
            other.values.push(value);
        });
}

/** Tells whether the dialog writes a long neck session into the log. */
function neckLongPicked(): boolean {
    return opened.target === "log" && chosen?.name === neckLong[0] && values.title === neckLong[1];
}

/**
 * Builds the row of my neck pain for `Body` in the log:
 * 0 to 10 one below the other, one picked by one tap,
 * the outcome my neck routine is judged by,
 * see `reader/trackers.ts`; shown only while `Neck long` is picked.
 */
function painRowOf(): HTMLElement[] {
    if (opened.target !== "log" || chosen?.name !== neckLong[0]) return [];
    const row: HTMLElement = rowOf(
        "Pain",
        choicesOf({
            search: searchOf(
                Array.from({ length: 11 }, (_: unknown, number: number): Choice => choiceOf(String(number))),
            ),
            picked: pain === "" ? [] : [pain],
            many: false,
            adding: false,
            pick: (picked: string[]): void => {
                pain = picked[0] ?? "";
            },
        }),
    );
    row.id = "entry-pain";
    row.hidden = !neckLongPicked();
    return [row];
}

/**
 * Shows the steps of the value picked in a field, one per line;
 * hides their place while the value picked has none.
 */
function stepsShow(steps: HTMLElement, field: Field): void {
    steps.replaceChildren(
        ...(field.steps[values[field.key]] ?? []).map((step: string): HTMLLIElement => {
            const line: HTMLLIElement = document.createElement("li");
            line.textContent = step;
            return line;
        }),
    );
    steps.hidden = steps.childElementCount === 0;
}

/**
 * Gives the value of a field that takes only its values,
 * for a value an older entry wrote another way, like `U-Bahn` for `UBahn`:
 * the value that reads the same without hyphens and spaces, ignoring case;
 * any other value as it is, also one no value reads like.
 */
function fixedValueOf(field: Field, value: string): string {
    const simple: (text: string) => string = (text: string): string => text.replace(/[-\s]/g, "").toLowerCase();
    const base: string = baseOf(value);
    if (!field.fixed || field.values.includes(base)) return value;
    return paramPut(
        field.values.find((candidate: string): boolean => simple(candidate) === simple(base)) ?? base,
        paramOf(value),
    );
}

/**
 * Gives the text of a field as the field takes it:
 * each of its values as {@link fixedValueOf} gives it,
 * those of a field of several values parted by `, `;
 * the text of a field that takes new values as it is.
 */
function fixedTextOf(field: Field, text: string): string {
    return (field.many === true ? text.split(", ") : [text])
        .map((value: string): string => fixedValueOf(field, value))
        .join(", ");
}

/**
 * Makes the choice of a place of a field, see `placeChoiceOf` in `places.ts`,
 * the place picked by the name I gave it by its parts while it has one,
 * see {@link edits}, so its line shows it.
 */
function fieldChoiceOf(field: Field, value: string): Choice {
    const name: string = labelOf(value) === labelOf(values[field.key]) ? (edits[field.key]?.name ?? "") : "";
    return placeChoiceOf(value, name !== "" ? name : labelOf(value), field.places);
}

/**
 * Gives the place offered in a field that the place picked is,
 * my place of `Places.md` or a room of `Rooms.md`,
 * `undefined` while the place picked is none offered, or nothing is picked.
 */
function mineOf(field: Field): string | undefined {
    const line: string = values[field.key];
    return line === ""
        ? undefined
        : [...field.values, ...field.rooms].find((value: string): boolean => labelOf(value) === labelOf(line));
}

/**
 * Gives the place picked in a field as it is, before I change it by its parts,
 * with the link the place of the entry kept while it is that place,
 * see `placeOf` in `places.ts`.
 */
function placeOriginOf(field: Field): Place {
    const line: string = values[field.key];
    const kept: string = labelOf(line) === labelOf(opened.values.location) ? opened.locationLink : "";
    return placeOf(line, kept, field.places);
}

/**
 * Shows the address of the place picked in a field below its label, small and grey,
 * as a link that opens in a new tab the link of the place:
 * the one the place of the entry kept, its `ALTREP`,
 * while that same place stays picked,
 * else the link of my place or room in `Places.md` or `Rooms.md`,
 * never that of another place;
 * plain text for a place without link, which opens nothing;
 * never the link itself as text;
 * a place I changed by its parts with the address and the link I gave it;
 * right after the label the pencil, see {@link placePartsOf}, while a place is picked.
 */
function placePartsShow(pencil: HTMLButtonElement, address: HTMLAnchorElement, field: Field): void {
    const line: string = values[field.key];
    const edit: Place | null = edits[field.key];
    const kept: string = field.key === "location" && line === opened.values.location ? opened.locationLink : "";
    const link: string =
        edit !== null ? edit.link : kept !== "" ? kept : (field.places[mineOf(field) ?? line]?.link ?? "");
    address.textContent = edit !== null ? placeAddressOf(edit) : addressOf(line);
    if (link !== "") address.href = link;
    else address.removeAttribute("href");
    address.hidden = address.textContent === "";
    pencil.hidden = line === "";
}

/**
 * Makes a small button beside a value, as its pencil.
 *
 * @param still - Whether it takes no focus, so a field I leave by it keeps its place
 */
function pencilOf(icon: IconNode, words: string, still: boolean = false): HTMLButtonElement {
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, icon, words);
    if (still) pencil.addEventListener("mousedown", (event: MouseEvent): void => event.preventDefault());
    return pencil;
}

/** Focuses the part of a place or a summary named so, see {@link partsOf}. */
function partFocus(name: string | null): void {
    document.querySelector<HTMLInputElement>(`#entry .field-parts input[aria-label="${name}"]`)?.focus();
}

/**
 * Makes the pencil beside the label of the place picked in a field,
 * which shows its parts below it or hides them while they show,
 * one field at a time, and its address below the label, see {@link placePartsShow}.
 */
function placePartsOf(field: Field): [HTMLButtonElement, HTMLAnchorElement] {
    const pencil: HTMLButtonElement = pencilOf(Pencil, "Change the place");
    const address: HTMLAnchorElement = document.createElement("a");
    pencil.addEventListener("click", (): void => {
        partsOpen = partsOpen === field.key ? null : field.key;
        partsShow(field);
    });
    address.className = "entry-address";
    address.target = "_blank";
    address.rel = "noopener";
    placePartsShow(pencil, address, field);
    return [pencil, address];
}

/**
 * Shows the rows of where it is anew, below what it is,
 * see {@link placeRowsOf}, the other rows staying as they are.
 */
function placesShow(): void {
    document.getElementById("entry-place")?.replaceChildren(...placeRowsOf());
}

/**
 * Tells whether the place picked in a field shows its parts below it:
 * while they are open for the field and a place is picked.
 */
function partsShown(field: Field): boolean {
    return partsOpen === field.key && values[field.key] !== "";
}

/**
 * Shows the rows of the places anew, after the parts of a field opened or closed,
 * the first part focused while they show,
 * so I type at once, found by the key of their field, see {@link partsOf}.
 */
function partsShow(field: Field): void {
    placesShow();
    if (partsShown(field))
        document.querySelector<HTMLInputElement>(`#entry .field-parts[data-field="${field.key}"] input`)?.focus();
}

/**
 * Builds the parts of the place picked in a field,
 * as the foods of a meal and the documents of a chapter stand,
 * see `placeEditOf` in `places.ts`, as it is or as I changed it;
 * the dialog takes the place as I type, see {@link edits},
 * its line and its address show it once I leave a part,
 * the rows built anew, see {@link placesShow}, the part I went on to keeping the cursor,
 * and once the dialog saves, the reader writes it everywhere, see {@link placesRename}.
 * They carry the key of their field,
 * so the dialog finds them apart from those of another place
 * and from the link of the summary.
 */
function partsOf(field: Field): HTMLElement {
    const element: HTMLElement = document.createElement("div");
    element.className = "field-parts";
    element.dataset.field = field.key;
    element.append(
        ...placeEditOf(
            edits[field.key] ?? placeOriginOf(field),
            (typed: Place): void => {
                edits[field.key] = typed;
            },
            (next: string | null): void => {
                placesShow();
                partFocus(next);
            },
        ),
    );
    return element;
}

/**
 * Shows the link of what the entry or the box was below its summary, small and grey,
 * as a link that opens in a new tab, like the address of a place:
 * the link typed, a path of mine as a folder of a skill shows,
 * see `folderLinkShow` in `../skill/links.ts`;
 * for a skill entry without one the folder of its skill,
 * which opens in this window, being NomSystem's own, see `skillPathShow` in `skill.ts`;
 * the pencil beside the summary while it names something, see {@link titleRead};
 * the fields of its text and its link filled in, while I don't type in them.
 */
function summaryPartsShow(): void {
    if (summaryShown === null) return;
    const [pencil, link, text, address, param]: SummaryParts = summaryShown;
    const value: string = summaryPickedOf();
    if (text !== document.activeElement) text.value = param === null ? value : baseOf(value);
    if (param !== null && param !== document.activeElement) param.value = paramOf(value);
    if (address !== document.activeElement)
        address.value = summaryLink === "" && chosen?.name === skillName ? skillPathOf() : summaryLink;
    pencil.hidden = titleRead(valuesRead().title) === "";
    if (chosen?.name === skillName && summaryLink === "") {
        skillPathShow(link);
        return;
    }
    if (summaryLink !== "" && !linkForm.test(summaryLink)) {
        folderLinkShow(link, summaryLink);
        return;
    }
    link.textContent = summaryLink;
    link.target = "_blank";
    if (summaryLink !== "") link.href = summaryLink;
    else link.removeAttribute("href");
    link.hidden = summaryLink === "";
}

/**
 * Makes the parts of what the entry or the box was, as a place has its parts,
 * see {@link placePartsOf}: the pencil beside its summary, which always changes it,
 * see {@link summaryChange}, and the link below the summary,
 * see {@link summaryPartsShow};
 * that of a skill entry beside and below its skill and type, see `skill.ts`.
 * The summary of a field, also one as planned, has the part `Text`,
 * indented with the grey line at its left, see {@link partOf}, its summary as written,
 * which its pencil shows and hides and I change in place, as the name of my place:
 * the entry takes it as I type,
 * the values of a field that takes only its values as that field writes them,
 * see {@link fixedTextOf}, and its line shows it once I leave the part,
 * its rows built anew, see {@link titleRowsShow};
 * that happens at `focusout`, whose `relatedTarget` names the field I went on to,
 * which then keeps the cursor.
 * The title of a skill entry has the part `Text` too, taken as I type,
 * its skill and type staying as they show;
 * a summary written by itself, that of a meal, has no text to type.
 * The summary of a field has the part `Link` below `Text`, its link as typed;
 * a skill entry links the folder of its skill, a meal nothing typed.
 * - `before`: The value of the pencil as I entered `param`, whose param I type over,
 *   see {@link paramEdits}.
 *
 * @param typed - Whether it has its text to change, like the title of a skill entry;
 *   whether it has a field when left out
 */
function summaryPartsOf(
    summary?: Field,
    typed: boolean = summary !== undefined,
): [HTMLButtonElement, HTMLAnchorElement, HTMLElement] {
    const pencil: HTMLButtonElement = pencilOf(Pencil, "Change the summary");
    const link: HTMLAnchorElement = document.createElement("a");
    const text: HTMLInputElement = partFieldOf("text", "", "Text of the summary");
    const address: HTMLInputElement = partFieldOf("url", "", "Link of the summary");
    const parts: HTMLElement = document.createElement("div");
    const param: HTMLInputElement | null =
        summary === undefined ? null : partFieldOf("text", "", "Param of the summary");
    let shown: string = values.title;
    link.className = "entry-address";
    link.rel = "noopener";
    parts.className = "field-parts";
    if (typed) parts.append(partOf("Text", text));
    if (param !== null && paramOf(summaryPickedOf()) !== "") parts.append(partOf("Param", param));
    if (summary !== undefined || chosen?.name === skillName) parts.append(partOf("Link", address));
    parts.hidden = !summaryOpen;
    for (const input of param === null ? [text] : [text, param]) {
        input.addEventListener("focusin", (): void => {
            shown = values.title;
            summaryValues = values.title.split(", ");
        });
        input.addEventListener("input", (): void => {
            const name: string = text.value.trim();
            const typed: string = summaryTypedOf(param === null ? name : paramPut(name, param.value));
            values.title = summary === undefined ? typed : fixedTextOf(summary, typed);
            saveAllow();
        });
        input.addEventListener("focusout", (event: FocusEvent): void => {
            const next: string | null =
                event.relatedTarget instanceof HTMLElement ? event.relatedTarget.getAttribute("aria-label") : null;
            if (values.title === shown || summary === undefined) return;
            titleRowsShow();
            partFocus(next);
        });
    }
    param?.addEventListener("input", (): void => {
        const before: string = summaryValue === -1 ? shown : summaryValues[summaryValue];
        paramEdits[baseOf(before)] = {
            old: paramEdits[baseOf(before)]?.old ?? paramOf(before),
            name: paramOf(summaryPickedOf()),
        };
    });
    address.addEventListener("input", (): void => {
        summaryLink = address.value.trim();
        summaryPartsShow();
    });
    pencil.addEventListener("click", (): void => summaryChange(parts));
    summaryShown = [pencil, link, text, address, param];
    summaryPartsShow();
    return [pencil, link, parts];
}

/** Gives what the parts of the summary change, see {@link summaryValue}. */
function summaryPickedOf(): string {
    return summaryValue === -1 ? values.title : (values.title.split(", ")[summaryValue] ?? "");
}

/**
 * Gives the summary as the part `Text` holds it:
 * the text typed, or the values of a summary of several
 * with the one of its pencil changed, an emptied value left out.
 */
function summaryTypedOf(typed: string): string {
    if (summaryValue === -1) return typed;
    return summaryValues
        .map((value: string, index: number): string => (index === summaryValue ? typed : value))
        .filter((value: string): boolean => value !== "")
        .join(", ");
}

/**
 * Changes the summary of this entry alone as its pencil asks, never opening a series:
 * opens the list of the foods of a meal, which its foods write, see `meal.ts`;
 * shows and hides the text of any other summary, its field focused as it shows.
 */
function summaryChange(parts: HTMLElement): void {
    if (meal !== null) meal.at(-1)?.querySelector<HTMLButtonElement>(".picker-line")?.click();
    else {
        summaryValue = -1;
        summaryOpen = !summaryOpen;
        parts.hidden = !summaryOpen;
        if (summaryOpen) parts.querySelector("input")?.focus();
    }
}

/**
 * Tells the dialog that what is picked for a skill entry changed:
 * its title follows its skill and type, see `skillTitleOf` in `skill.ts`,
 * and its link, once they change, the folder they give it;
 * shows the link of its summary anew and allows saving or not.
 */
function skillChanged(): void {
    const given: string = skillTitleOf();
    if (given !== skillGiven) summaryLink = "";
    values.title = given;
    skillGiven = given;
    summaryPartsShow();
    saveAllow();
}

/**
 * Adds a place typed that is none of mine yet:
 * the reader writes it into `Places.md` at once by its name, a room into `Rooms.md`,
 * and picked it shows its parts, so I type its address and its link below it next,
 * see {@link partsOf}; nothing for an empty name, which no place has.
 *
 * @throws {Error} - When the reader does not take it, like for a name another place has
 */
async function placeAdd(field: Field, name: string): Promise<string | null> {
    if (name.trim() === "") return null;
    const place: Place = await placeSend(
        {
            name: name,
            street: "",
            code: "",
            city: "",
            country: "",
            link: "",
            standard: false,
        },
        "",
    );
    addedLine = lineOf(place);
    partsOpen = field.key;
    return addedLine;
}

/**
 * Builds the search of the list of a field of a place:
 * my default place always first, see `standardFirst` in `places.ts`;
 * while nothing is typed my places, the most used first,
 * and the place picked when it is none of them, so its line shows it by its label;
 * as I type my places, then the rooms of the university, see {@link fieldChoiceOf}.
 */
function placeSearchOf(field: Field): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const line: string = values[field.key];
        const more: string[] = text.trim() !== "" ? field.rooms : line === "" ? [] : [mineOf(field) ?? line];
        return await searchOf(
            standardFirst([...new Set([...field.values, ...more])], field.places).map((value: string): Choice =>
                fieldChoiceOf(field, value),
            ),
        )(text);
    };
}

/**
 * Builds the row of a field of the category picked:
 * its name and one line showing its value, see {@link choicesOf},
 * the typed text taken as a new value, see {@link valueAdd},
 * but in a field that takes no new values,
 * a new place written into `Places.md` by its name, see {@link placeAdd}.
 * A place shows by its name, once,
 * however often it was used and whatever address an entry kept,
 * which a place picked again keeps, see {@link placePartsOf};
 * a summary with the steps of the value picked below it, see {@link stepsShow}.
 * A meal of the log has its own rows in place of the summary, see {@link meal}.
 * A place shows its parts below it, see {@link partsOf}, once added, or by its pencil,
 * and hides them as another place is picked,
 * which forgets what I changed of the one before, see {@link edits}.
 * `Online` has a row of its own, see {@link onlineRowOf}.
 */
function fieldRowsOf(field: Field): HTMLElement[] {
    if (field.key === "with")
        return [
            withRowOf({
                field: field,
                persons: persons,
                people: peopleRead(),
                open: withOpen,
                edits: personEdits,
                opened: (open: string[]): void => {
                    withOpen = open;
                },
                pick: (people: Attendee[]): void => {
                    values.with = namesOf(people);
                    addresses = { ...addresses, ...addressesOf(people) };
                    people.forEach((person: Attendee): void => valueAdd(field, person.name));
                    saveAllow();
                },
            }),
        ];
    if (field.key === "online")
        return [
            onlineRowOf({
                field: field,
                categories: categories,
                online: { ...onlineParts, online: values.online },
                open: onlineOpen,
                opened: (open: boolean): void => {
                    onlineOpen = open;
                },
                pick: (online: Online): void => {
                    values.online = online.online;
                    onlineParts = { ...online };
                    saveAllow();
                },
            }),
        ];
    if (field.key === "title" && meal !== null) return meal;
    if (field.key === "title" && field.many === true && !ofSeries()) return [manyRowOf(field)];
    const place: [HTMLButtonElement, HTMLAnchorElement] | null = field.key === "title" ? null : placePartsOf(field);
    const summary: HTMLElement[] = field.key === "title" ? summaryPartsOf(field) : [];
    const steps: HTMLElement = document.createElement("ul");
    const shown: boolean = partsShown(field);
    steps.className = "entry-steps";
    stepsShow(steps, field);
    const paired: boolean = field.key === "title" && values.title !== "";
    const picker: HTMLElement = choicesOf({
        search:
            field.key !== "title"
                ? placeSearchOf(field)
                : (text: string): Promise<Choice[]> => searchOf(field.values.map(choiceOf))(text),
        picked:
            values[field.key] === ""
                ? []
                : [field.key === "title" ? baseOf(values.title) : (mineOf(field) ?? values[field.key])],
        many: false,
        adding: !field.fixed,
        locked: field.key === "title" && ofSeries(),
        add: field.key === "title" ? undefined : (name: string): Promise<string | null> => placeAdd(field, name),
        noun: field.key === "title" ? "summary" : "place",
        aside: place !== null ? [place[0]] : paired ? [] : summary.slice(0, 1),
        below: place === null ? [...summary.slice(1), steps] : [place[1], ...(shown ? [partsOf(field)] : [])],
        pick: (picked: string[]): void => {
            const line: string = picked[0] ?? "";
            const before: string = labelOf(values[field.key]);
            values[field.key] =
                field.key !== "title" && line !== "" && labelOf(line) === before ? values[field.key] : line;
            if (line !== "") valueAdd(field, line);
            if (place !== null && labelOf(line) !== before) {
                edits[field.key] = null;
                if (line === addedLine) partsOpen = field.key;
                else if (partsOpen === field.key) partsOpen = null;
            }
            if (place !== null) {
                addedLine = "";
                placePartsShow(place[0], place[1], field);
            }
            stepsShow(steps, field);
            hiddenSet("entry-pain", !neckLongPicked());
            saveAllow();
            if (partsShown(field) !== shown || (shown && labelOf(line) !== before)) partsShow(field);
            if (field.key === "title") titleRowsShow();
        },
    });
    if (!paired) return [rowOf(field.name, picker)];
    const pair: HTMLElement = pairOf(picker, paramPickerOf(field, -1, values.title, summary.slice(0, 1)));
    pair.classList.add("summary-pair");
    return [rowOf(field.name, pair)];
}

/**
 * Builds the row of a summary of several values,
 * like the means of a way, since I change on it, or my body care:
 * one line of the row, the values picked parted by `, ` as its entry writes them,
 * see `.value-comma` in `day.css`;
 * its list, a menu, takes a value or takes it back by a click
 * and stays open for the next,
 * see `many` in `choices.ts`, and takes a new value where the field takes new ones.
 * A way keeps the order picked, the order I rode in;
 * any other summary the order of its list, the most used first, see {@link rankOf}.
 * While none is picked, the row empty without a plus, as every field of one value,
 * since a click into it opens its list;
 * each value its own pencil, see {@link valueAfterOf},
 * and the link of the summary below it, see {@link summaryPartsOf}.
 */
function manyRowOf(field: Field): HTMLElement {
    const picked: string[] = values[field.key] === "" ? [] : values[field.key].split(", ").map(baseOf);
    const [, link, linkParts]: [HTMLButtonElement, HTMLAnchorElement, HTMLElement] = summaryPartsOf(field);
    const param: HTMLElement = document.createElement("div");
    param.className = "picker-quiet";
    return rowOf(
        field.name,
        choicesOf({
            search: searchOf(field.values.map(choiceOf)),
            picked: picked,
            many: true,
            adding: !field.fixed,
            noun: "summary",
            linkOf: (): string => "",
            afterOf: (value: string): HTMLElement => valueAfterOf(field, param, value),
            parting: ", ",
            below: [link, linkParts, param],
            order: field.fixed
                ? undefined
                : (chosen: string[]): string[] =>
                      [...chosen].sort(
                          (first: string, second: string): number => rankOf(field, first) - rankOf(field, second),
                      ),
            pick: (chosen: string[]): void => {
                const before: string[] = values[field.key].split(", ");
                values[field.key] = chosen
                    .map(
                        (value: string): string =>
                            before.find((old: string): boolean => baseOf(old) === value) ?? value,
                    )
                    .join(", ");
                summaryOpen = false;
                summaryValue = -1;
                linkParts.hidden = true;
                saveAllow();
            },
        }),
    );
}

/**
 * Makes what stands after one value of a summary of several in its line:
 * its param in brackets, or a plus without one, both opening the list of its param,
 * see {@link paramListOpen}, then its pencil.
 * The pencil shows and hides the parts of that value, its click opening no list,
 * and takes no focus, so a part I leave by it keeps what I typed.
 * Only that value changes, in this entry or box, see {@link summaryTypedOf},
 * its param in every entry and box that has it, see {@link paramsRename}.
 * A value I changed and did not leave yet is found no more, which closes it.
 */
function valueAfterOf(field: Field, home: HTMLElement, value: string): HTMLElement {
    const all: HTMLSpanElement = document.createElement("span");
    const found: string = values.title.split(", ")[valueAtOf(value)] ?? "";
    const shown: HTMLElement = paramShownOf(found);
    const pencil: HTMLButtonElement = pencilOf(Pencil, `Change ${value}`, true);
    pencil.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        const at: number = valueAtOf(value);
        summaryOpen = at !== -1 && at !== summaryValue;
        summaryValue = summaryOpen ? at : -1;
        titleRowsShow();
        if (summaryOpen) partFocus("Text of the summary");
    });
    shown.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        paramListOpen(field, home, value);
    });
    all.append(shown, pencil);
    return all;
}

/** Gives where a value picked stands in the summary now, -1 once it changed. */
function valueAtOf(value: string): number {
    return values.title.split(", ").findIndex((old: string): boolean => baseOf(old) === value);
}

/** Makes what shows the param of a value: in brackets, or a plus without one. */
function paramShownOf(value: string): HTMLElement {
    const param: string = paramOf(value);
    if (param === "") {
        const plus: HTMLButtonElement = pencilOf(Plus, "Add a param");
        plus.classList.add("plus-quiet");
        return plus;
    }
    const shown: HTMLSpanElement = document.createElement("span");
    shown.className = "value-param";
    shown.textContent = `(${param})`;
    return shown;
}

/**
 * Makes the picker of the param of a value, as the type of a skill entry has it:
 * a small plus while it has none, its list the params
 * that value had before, the most used first, and any other typed.
 * A click on the param picked takes it back.
 *
 * @param at - Place of the value in the summary, -1 for a summary of one value
 */
function paramPickerOf(field: Field, at: number, value: string, aside: HTMLElement[]): HTMLElement {
    const param: string = paramOf(value);
    return choicesOf({
        search: searchOf((field.params[baseOf(value)] ?? []).map(choiceOf)),
        picked: param === "" ? [] : [param],
        many: false,
        adding: true,
        noun: "param",
        empty: "Add a param",
        plus: true,
        aside: aside,
        pick: (picked: string[]): void => {
            paramPick(field, at, picked[0] ?? "");
        },
    });
}

/**
 * Writes the param of a value into the summary and shows its rows anew;
 * its list keeps offering it, also once I pick another, until the page loads anew,
 * then those of the log, see `paramsOf` in `reader/categories.ts`.
 *
 * @param at - Place of the value in the summary, -1 for a summary of one value
 */
function paramPick(field: Field, at: number, param: string): void {
    const all: string[] = at === -1 ? [values.title] : values.title.split(", ");
    const base: string = baseOf(all[Math.max(at, 0)]);
    const written: string = paramPut(base, param);
    values.title = all
        .map((value: string, index: number): string => (index === Math.max(at, 0) ? written : value))
        .join(", ");
    if (paramOf(written) !== "") field.params[base] = [...new Set([...(field.params[base] ?? []), paramOf(written)])];
    saveAllow();
    titleRowsShow();
}

/**
 * Opens the list of the param of a value of a summary of several,
 * from a picker without line below the row, made now,
 * since the line of the summary, a button, can hold no picker.
 */
function paramListOpen(field: Field, home: HTMLElement, value: string): void {
    const at: number = valueAtOf(value);
    if (at === -1) return;
    const picker: HTMLElement = paramPickerOf(field, at, values.title.split(", ")[at], []);
    home.replaceChildren(picker);
    picker.querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/**
 * Gives where a value stands in the list of a field, the most used first,
 * a value not in it, a new one, after all.
 */
function rankOf(field: Field, value: string): number {
    const at: number = field.values.indexOf(value);
    return at === -1 ? field.values.length : at;
}

/**
 * Reads who I was with as picked in `With`, each name with its address:
 * as the dialog has it, else as its last entry wrote it,
 * else the standard one, see {@link standardAddressOf}.
 */
function peopleRead(): Attendee[] {
    const field: Field | undefined = chosen?.fields.find((other: Field): boolean => other.key === "with");
    if (field === undefined || values.with === "") return [];
    return values.with.split(withParting).map((name: string): Attendee => ({
        name: name,
        address: addresses[name] ?? field.links[name] ?? standardAddressOf(name),
    }));
}

/**
 * Builds the rows of where it is, in the order of the fields of the category picked:
 * a way where it starts, then its place, then what it did online.
 */
function placeRowsOf(): HTMLElement[] {
    return rowsOf((field: Field): boolean => placeIs(field) || field.key === "online");
}

/**
 * Builds the rows of the fields of the category picked below its times,
 * those neither its summary nor where it is, which is who I was with.
 */
function moreRowsOf(): HTMLElement[] {
    return rowsOf((field: Field): boolean => field.key !== "title" && !placeIs(field) && field.key !== "online");
}

/** Builds the rows of the fields of the category picked that `keep` keeps. */
function rowsOf(keep: (field: Field) => boolean): HTMLElement[] {
    return (chosen?.fields ?? []).filter(keep).flatMap(fieldRowsOf);
}

/**
 * Tells whether the dialog logs a box of the plan that has a category,
 * or changes an entry of the log logged from a box, which points to it with `RELATED-TO`:
 * its category stays the plan's, so the link shows how the plan was really done,
 * and its summary changes in the box too, see `boxRename` in `boxes.ts`,
 * while its times, place, people, semester and note change freely,
 * like a lecture watched online at home;
 * the skill and type of a skill entry change by a click on them, see `skill.ts`.
 * A box without category leaves it open, to be picked.
 */
function asPlanned(): boolean {
    return (
        opened.target === "log" &&
        opened.category !== null &&
        (opened.plan !== null || (opened.entry?.extendedProps.planned ?? "") !== "")
    );
}

/**
 * Tells whether the dialog shows a box of a series or an entry logged from one:
 * its line opens no list, so another summary comes only by the dialog of the series,
 * see {@link seriesShow}; its pencil still renames this box and its entry.
 */
function ofSeries(): boolean {
    return (
        opened.box?.series === true ||
        opened.plan?.series === true ||
        String(opened.entry?.extendedProps.planned ?? "").includes("#")
    );
}

/**
 * Shows the rows of the summary of the category picked, also anew after its text changed,
 * the rows below it staying as they are.
 */
function titleRowsShow(): void {
    document
        .getElementById("entry-fields")
        ?.replaceChildren(...rowsOf((field: Field): boolean => field.key === "title"));
}

/**
 * Shows the fields of the category picked, each its rows,
 * in the order of the file, the same for every category,
 * see {@link placesShow} and {@link moreRowsOf};
 * after them for `Body` my neck pain, see {@link painRowOf}.
 */
function fieldsShow(): void {
    titleRowsShow();
    placesShow();
    document
        .getElementById("entry-more")
        ?.replaceChildren(...moreRowsOf(), ...painRowOf(), ...(sportShown() ? sportRowsOf(saveAllow, endFit) : []));
    document.getElementById("entry-note")?.closest(".panel-field")?.toggleAttribute("hidden", sportShown());
    saveAllow();
}

/** Tells whether `Sport` is picked for the log, see `sport.ts`. */
function sportShown(): boolean {
    return chosen?.name === sportName && opened.target === "log";
}

/**
 * Loads where I was last before the start of the entry, from the reader,
 * see `lastPlaceRead` in `reader/categories.ts`;
 * for an entry without start time where I was last before the end of its day.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function lastPlaceLoad(): Promise<string> {
    const before: Date =
        timeRead("entry-start") === "" ? dateOf(new Date(`${dayRead()}T12:00:00`), "23:59") : startRead();
    const response: Response = await fetch(`/api/day/last-place?before=${before.toISOString()}`);
    return await response.json();
}

/**
 * Fills in where a new entry starts, also one logged from a box,
 * as where I was last before it, see {@link lastPlaceLoad},
 * the place of the last entry before it, a way's goal, or a place I changed by hand,
 * never a room, so after a lecture I am where I was before it,
 * else as my default place, `★` in `Places.md`;
 * a new box of the plan always as my default place,
 * since no entry before it tells where I will be:
 * a way its `From`, every other category its place, while that field is empty;
 * nothing for an entry or a box being changed.
 * The place is my place of that name as its list offers it, so it shows with its link;
 * a way picked after another category leaves the place filled in for it,
 * so its place, its goal, stays empty;
 * nothing once another category was picked meanwhile.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function lastPlaceFill(category: Category): Promise<void> {
    const way: boolean = category.fields.some((field: Field): boolean => field.key === "from");
    const field: Field | undefined = category.fields.find(
        (other: Field): boolean => other.key === (way ? "from" : "location"),
    );
    if (way && placeFilled !== "" && values.location === placeFilled) values.location = "";
    if (field === undefined || opened.entry !== null || opened.box !== null || values[field.key] !== "") return;
    const last: string = opened.target === "box" ? "" : await lastPlaceLoad();
    if (chosen !== category) return;
    const standard: Place | undefined = Object.values(field.places).find((place: Place): boolean => place.standard);
    const line: string = last !== "" ? last : standard === undefined ? "" : lineOf(standard);
    values[field.key] =
        field.values.find((value: string): boolean => line !== "" && labelOf(value) === labelOf(line)) ?? line;
    if (!way) placeFilled = values.location;
}

/**
 * Picks a category: shows its fields,
 * keeping the places picked under the category before,
 * but not its summary with its link,
 * and an older value of a field that takes only its values as that field writes it,
 * see {@link fixedValueOf}.
 * `Food` in the log builds its rows before its fields show, see `meal.ts`,
 * unless another category was picked meanwhile,
 * the link of a meal or a cooking beside and below its summary,
 * which `meal.ts` writes by itself from its foods, see {@link summaryPartsOf};
 * `Skill` shows its fields, see `skill.ts`, with the title skill and type give it
 * while it has none, its title shown to type below them while it is another;
 * `Sport` in the log loads my workouts, exercises and videos, see `sport.ts`.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function categoryPick(category: Category | null): Promise<void> {
    values = chosen === null ? { ...opened.values } : { ...valuesRead(), title: "" };
    if (chosen !== null) summaryLink = "";
    summaryShown = null;
    chosen = category;
    (category?.fields ?? []).forEach((field: Field): void => {
        values[field.key] = fixedTextOf(field, values[field.key]);
    });
    meal = null;
    document.getElementById("entry-place")?.replaceChildren();
    document.getElementById("entry-more")?.replaceChildren();
    if (category !== null) await lastPlaceFill(category);
    if (category?.name === skillName) {
        const summary: HTMLElement[] = summaryPartsOf(undefined, false);
        await skillFieldsShow(
            document.getElementById("entry-fields") as HTMLElement,
            document.getElementById("entry-more") as HTMLElement,
            moreRowsOf(),
            opened.target === "box",
            opened.category === skillName ? opened.skill : skillNone,
            dayRead(),
            skillChanged,
            summary,
        );
        skillGiven = skillTitleOf();
        values.title = skillGiven;
        summary[2].hidden = !summaryOpen;
        placesShow();
        skillChanged();
        return;
    }
    if ((category?.name === foodName || category?.name === cookName) && opened.target === "log") {
        const changing: boolean = opened.category === category.name;
        const built: HTMLElement[] = await mealOf(
            changing ? opened.foods : [],
            changing ? opened.values.title : "",
            saveAllow,
            category.name === cookName
                ? null
                : {
                      cooked: changing ? String(opened.entry?.extendedProps.cooked ?? "") : "",
                      start: startRead(),
                      id: changing ? (opened.entry?.id ?? "") : "",
                  },
        );
        if (chosen !== category) return;
        const value: HTMLDivElement = document.createElement("div");
        meal = built;
        value.append(built[0].lastElementChild as HTMLElement, ...summaryPartsOf());
        built[0].append(value);
    }
    if (category?.name === sportName && opened.target === "log") {
        await sportOpen(opened.category === sportName ? (opened.entry?.extendedProps ?? null) : null);
        if (chosen !== category) return;
    }
    fieldsShow();
}

/**
 * Shows the category of the dialog as its first row, one line like every field,
 * whose list offers the categories in the order the reader gives them.
 * While a log entry is changed, `Skill` stays apart:
 * a skill entry cannot become another category, nor another entry a skill entry,
 * because only `reader/skill.ts` writes the documents
 * and attempts of a skill entry of the log;
 * a skill box is a plain box, which may change its category.
 */
function categoryShow(): void {
    const offered: Category[] = categories.filter(
        (category: Category): boolean =>
            !(
                opened.target === "log" &&
                opened.entry !== null &&
                (category.name === skillName) !== (opened.category === skillName)
            ),
    );
    document.getElementById("entry-category")?.replaceChildren(
        rowOf(
            "Category",
            choicesOf({
                search: searchOf(offered.map((category: Category): Choice => choiceOf(category.name))),
                picked: chosen === null ? [] : [chosen.name],
                many: false,
                adding: false,
                noun: "category",
                locked: asPlanned(),
                pick: (picked: string[]): void => {
                    categoryPick(
                        offered.find((category: Category): boolean => category.name === picked[0]) ?? null,
                    ).catch(errorShow);
                },
            }),
        ),
    );
}

/**
 * Reads what the entry was, its `SUMMARY`:
 * the title of a skill entry, see {@link skillChanged},
 * a meal of the log with foods their names, see {@link mealTitle};
 * else what is picked, or the name of a category without the field `title`.
 */
function titleRead(picked: string): string {
    if (chosen?.name === skillName) return values.title;
    if (foodsListed()) return mealTitle();
    return chosen?.fields.some((field: Field): boolean => field.key === "title") ? picked : (chosen?.name ?? "");
}

/**
 * Reads the text fields of the dialog,
 * as an entry of the log and a box both have them, a skill entry its place too;
 * the semester of a skill entry as picked, else of a day.
 */
function textsRead(day: string): EntryTexts {
    const picked: { [key in FieldKey]: string } = valuesRead();
    const skill: ModuleType = chosen?.name === skillName ? skillModuleType() : { module: "", type: "" };
    return {
        category: chosen?.name ?? "",
        title: titleRead(picked.title),
        titleLink: summaryLink,
        location: picked.location,
        online: picked.online,
        onlineLink: picked.online === "" ? "" : onlineParts.onlineLink,
        onlineChannel: picked.online === "" ? "" : onlineParts.onlineChannel,
        onlineTitle: picked.online === "" ? "" : onlineParts.onlineTitle,
        from: picked.from,
        attendees: peopleRead(),
        module: skill.module,
        type: skill.type,
        semester: chosen?.name === skillName ? skillSemesterOf(day) : "",
        note: (document.getElementById("entry-note") as HTMLTextAreaElement).value.trim(),
    };
}

/**
 * Gives the day of the entry as the fields of the dialog say:
 * the typed day of its start, for a box with a deadline the typed day of its deadline;
 * the day the dialog opened with while the typed day is no date.
 */
function dayRead(): string {
    const deadlineDay: string | null = opened.target === "box" ? dayTypedOf("entry-deadline-day") : null;
    const typed: string | null = deadlineDay ?? dayTypedOf("entry-start-day");
    return typed ?? dayOf(opened.start);
}

/**
 * Gives the end of the entry or the box as the fields of the dialog say:
 * its time on the typed day of the end,
 * on the day of the start should the typed day be no date.
 */
function endRead(start: Date): Date {
    const day: string = dayTypedOf("entry-end-day") ?? dayOf(start);
    return dateOf(new Date(`${day}T12:00:00`), timeRead("entry-end"));
}

/**
 * Fills the day of the end as the day of the start and the times are typed,
 * until I type into it myself:
 * the day of the start, or the day after while the end time lies at or before
 * the start time, like a night of sleep;
 * nothing while one of them is no day or no time.
 */
function endDayFill(): void {
    const day: string | null = dayTypedOf("entry-start-day");
    const start: string = timeRead("entry-start");
    const end: string = timeRead("entry-end");
    if (endDayTyped || day === null || start === "" || end === "") return;
    const field: HTMLInputElement = inputOf("entry-end-day");
    field.value = weekdayDateTextOf(end <= start ? dayAdd(day, 1) : day);
    field.setCustomValidity("");
    endDayShow();
}

/**
 * Reads fields, note and times of the dialog for an entry of the log,
 * and the box a new log entry is logged from, also an occurrence of a series,
 * which is a box of its own, see `reader/boxes.ts`.
 * The start is a plain time on the typed day, the end a plain time on its own typed day.
 * What the fields show is exactly what is saved.
 */
function fieldsRead(): EntryFields {
    const start: Date = startRead();
    const end: Date = endRead(start);
    return {
        ...textsRead(dayOf(start)),
        foods: [foodName, cookName].includes(chosen?.name ?? "") ? mealFoods() : [],
        cooked: chosen?.name === foodName ? mealCooked() : "",
        planned: opened.entry === null ? (opened.plan?.id ?? "") : "",
        pain: neckLongPicked() ? pain : "",
        ...(sportShown() ? sportRead() : { workout: "", exercises: [], videos: [] }),
        start: start,
        end: end,
    };
}

/**
 * Reads fields, note, start, end and deadline of the dialog for a box,
 * as for an entry of the log:
 * its day is the day of its start, its expected time its start,
 * its expected duration the minutes from its start to its end,
 * and the reader moves it into the plan it belongs into;
 * a box whose times stay empty lies on its day without time and duration;
 * a box that lasts only so long, see {@link lengthOnly}, lies on its day without time
 * for its length, none for an empty length or `00:00`;
 * with a deadline it lies on the day of its deadline,
 * without expected time, start and end off,
 * keeping the duration it had; an empty deadline is none.
 */
function boxFieldsRead(): BoxFields {
    const day: string = dayTypedOf("entry-start-day") ?? dayOf(opened.start);
    const startTime: string = timeRead("entry-start");
    const endTime: string = timeRead("entry-end");
    const length: string = timeRead("entry-length");
    const deadlineDay: string = dayTypedOf("entry-deadline-day") ?? "";
    const deadlineTime: string = timeRead("entry-deadline-time");
    const start: Date | null = startTime === "" || lengthOnly ? null : dateOf(new Date(`${day}T12:00:00`), startTime);
    let minutes: number | null = lengthOnly
        ? length === "" || minutesOf(length) === 0
            ? null
            : minutesOf(length)
        : start === null || endTime === ""
          ? null
          : Math.round((endRead(start).getTime() - start.getTime()) / (60 * 1000));
    if (deadlineDay !== "") minutes = opened.minutes;
    return {
        ...textsRead(deadlineDay === "" ? day : deadlineDay),
        day: deadlineDay === "" ? day : deadlineDay,
        time: deadlineDay !== "" ? null : start,
        minutes: minutes,
        deadline:
            deadlineDay === "" || deadlineTime === ""
                ? deadlineDay
                : dateOf(new Date(`${deadlineDay}T12:00:00`), deadlineTime).toISOString(),
        ...(chosen?.name === skillName ? skillLinksRead() : { chapters: [], documents: [] }),
    };
}

/**
 * Shows a hint of the dialog, which stands below its rows, right above its buttons,
 * and scrolls the dialog down to it, so a long one,
 * like a meal of many foods, shows it too instead of keeping it below its rows.
 */
function hintShow(id: string): void {
    const dialog: HTMLDialogElement = dialogOf();
    hiddenSet(id, false);
    dialog.scrollTo({ top: dialog.scrollHeight });
}

/** Shows the hint that the reader did not take what the dialog sent, `Saving failed`. */
function errorShow(error: unknown): void {
    console.error(error);
    hintShow("entry-error");
}

/**
 * Writes each place picked that I changed by its parts everywhere,
 * see `renameSend` in `places.ts`;
 * nothing for a place I left as it is, nor for a field the category picked does not have.
 * Before the entry or the box is saved only checked,
 * so the dialog saves nothing the reader would refuse, and after it written,
 * so the entry or the box, saved with the place as it was, takes it with every other.
 *
 * @throws {Error} - When the reader does not take a place, like one with an empty name
 */
async function placesRename(dry: boolean): Promise<void> {
    for (const field of (chosen?.fields ?? []).filter(placeIs)) {
        const edit: Place | null = edits[field.key];
        if (values[field.key] !== "" && edit !== null && JSON.stringify(edit) !== JSON.stringify(placeOriginOf(field)))
            await renameSend(labelOf(values[field.key]), edit, dry);
    }
}

/**
 * Writes each param I changed by the part `Param` of a pencil in every entry and box
 * of the category picked that gives it to its value, see {@link paramEdits}
 * and `paramRename` in `reader/calendar.ts`:
 * before the entry or the box is saved only checked, and after it written, as a place.
 * Nothing for a param emptied, which leaves only this entry or box,
 * nor for one the summary no longer holds, since I picked another from its list.
 *
 * @throws {Error} - When the reader does not take a param
 */
async function paramsRename(dry: boolean): Promise<void> {
    for (const [value, edit] of Object.entries(paramEdits)) {
        const written: string = paramPut(value, edit.name);
        if (
            edit.name !== "" &&
            edit.name !== edit.old &&
            (values.title === written || values.title.split(", ").includes(written))
        )
            await readerAsk<null>("/api/day/param-renamed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: chosen?.name ?? "",
                    value: value,
                    old: edit.old,
                    name: edit.name,
                    dry: dry,
                }),
            });
    }
}

/**
 * Writes what I changed by its parts everywhere: the places, see {@link placesRename},
 * the people, see `personsRename` in `../persons.ts`, the names picked in `With`
 * so a person `Persons.md` does not hold yet gets its row there,
 * and the params, see {@link paramsRename}.
 *
 * @param dry - Whether they are only checked, before the entry or the box is saved
 */
async function renamesSend(dry: boolean): Promise<void> {
    await placesRename(dry);
    await personsRename(
        personEdits,
        persons,
        dry,
        peopleRead().map((person: Attendee): string => person.name),
    );
    await paramsRename(dry);
}

/**
 * Sends the new or changed entry to the reader, into the log, then closes the dialog;
 * a box goes into the plan, after which the list of boxes loads again, see `boxes.ts`.
 * A skill entry goes to the one writer of skill entries, see `skill.ts`.
 * A changed entry, a skill entry alike,
 * goes with its fingerprint as the dialog opened it,
 * and the reader writes it only while its file still holds it so,
 * see `entryChange` in `entries.ts` and `skillSave` in `skill.ts`: the first save wins.
 * When the file changed it since,
 * like Eier renamed on the phone while the dialog on the laptop showed Eier,
 * nothing is saved and the dialog stays open, saying so, see {@link hintShow};
 * opened again, it shows the entry as the file holds it, to change and save once more.
 * A place, the people and a param I changed by their parts
 * are checked before anything is saved,
 * and written everywhere once the entry or the box is,
 * see {@link placesRename}, `personsRename` in `../persons.ts` and {@link paramsRename}.
 *
 * @throws {Error} - When the reader does not take the entry
 *   or a place or person I changed
 */
async function entrySave(calendar: Calendar): Promise<void> {
    await renamesSend(true);
    const version: string = opened.entry?.extendedProps.version ?? "";
    let saved: boolean = true;
    if (opened.target === "box" && opened.box !== null) await boxChange(opened.box.id, boxFieldsRead());
    else if (opened.target === "box") await boxAdd(boxFieldsRead());
    else if (chosen?.name === skillName)
        saved = await skillSave(calendar, opened.entry?.id ?? "", fieldsRead(), version);
    else if (opened.entry !== null) saved = await entryChange(calendar, opened.entry.id, fieldsRead(), version);
    else await entryAdd(calendar, fieldsRead());
    if (saved) {
        await renamesSend(false);
        entryClose();
    } else hintShow("entry-changed");
}

/**
 * Removes the entry of the log
 * or the box being changed on the second click, then closes the dialog;
 * the first click only asks, the bin turning into a question mark.
 * A box planned by mistake is removed;
 * a box of a series that day alone, the series staying,
 * see `boxDelete` in `reader/boxes.ts`;
 * a box I decided against is dropped instead,
 * with its cross in the list, so it can be counted.
 *
 * @throws {Error} - When the reader does not remove the entry or the box
 */
async function entryRemove(calendar: Calendar): Promise<void> {
    const button: HTMLButtonElement = document.getElementById("entry-remove") as HTMLButtonElement;
    if (!removeAsked) {
        removeAsked = true;
        iconPut(button, QuestionMark, "Really remove?");
        return;
    }

    if (opened.target === "box") await boxDelete(opened.box?.id ?? "");
    else await entryDelete(calendar, opened.entry?.id ?? "");
    entryClose();
}

/**
 * Turns start and end of a box off while the day of a deadline is typed,
 * its length and the switch to it too, see {@link lengthShow},
 * since a box with a deadline lies on the day of its deadline and has no expected time;
 * and asks for the day of a deadline while its time is typed,
 * since a time alone is no deadline.
 */
function deadlineSee(): void {
    const deadlineDay: HTMLInputElement = inputOf("entry-deadline-day");
    const deadlineTime: HTMLInputElement = inputOf("entry-deadline-time");
    const off: boolean = opened.target === "box" && deadlineDay.value.trim() !== "";
    ["entry-start-day", "entry-start", "entry-end-day", "entry-end", "entry-length"]
        .map(inputOf)
        .forEach((field: HTMLInputElement): void => {
            field.disabled = off;
        });
    document.querySelectorAll<HTMLButtonElement>("#entry-swap button").forEach((swap: HTMLButtonElement): void => {
        swap.disabled = off;
    });
    deadlineDay.required = deadlineTime.value.trim() !== "";
}

/**
 * Shows the times of the dialog, the same for an entry of the log and a box of the plan:
 * the day and the time of the start and of the end,
 * and for a box its deadline, hidden and disabled for an entry of the log,
 * so the browser checks only the times shown before it sends the form.
 * The day of the end fills itself again as I type, see {@link endDayFill}.
 * A box starts at its expected time, on the day the dialog opened with,
 * and ends after its expected duration;
 * its times may stay empty, but for an event of the plan,
 * which keeps both and has no deadline, since only a to-do has one;
 * a box without time but with a duration and without deadline
 * shows only its day and its length, see {@link lengthShow}.
 */
function timesShow(opening: EntryOpening): void {
    const boxed: boolean = opening.target === "box";
    const required: boolean = !boxed || (opening.box !== null && !opening.box.todo);
    const start: Date | null = boxed ? opening.time : opening.start;
    const end: Date | null = !boxed
        ? opening.end
        : opening.time === null || opening.minutes === null
          ? null
          : new Date(opening.time.getTime() + opening.minutes * 60 * 1000);
    const startDay: HTMLInputElement = inputOf("entry-start-day");
    const endDay: HTMLInputElement = inputOf("entry-end-day");
    const startTime: HTMLInputElement = inputOf("entry-start");
    const endTime: HTMLInputElement = inputOf("entry-end");
    const deadlineRow: HTMLElement = document.getElementById("entry-deadline") as HTMLElement;
    const deadlineDay: HTMLInputElement = inputOf("entry-deadline-day");
    const deadline: string = opening.box?.deadline ?? "";
    startDay.value = weekdayDateTextOf(dayOf(opening.start));
    startDay.setCustomValidity("");
    endDay.value = weekdayDateTextOf(dayOf(end ?? opening.start));
    endDay.setCustomValidity("");
    endDayTyped = false;
    timeFieldShow(startTime, start);
    timeFieldShow(endTime, end);
    startTime.required = required;
    endTime.required = required;
    lengthOnly = boxed && !required && start === null && opening.minutes !== null && deadline === "";
    inputOf("entry-length").value = lengthOnly && opening.minutes !== null ? lengthTextOf(opening.minutes) : "";
    lengthShow();
    deadlineRow.hidden = required;
    deadlineRow.querySelectorAll("input").forEach((field: HTMLInputElement): void => {
        field.disabled = required;
    });
    deadlineDay.value = deadline === "" ? "" : weekdayDateTextOf(opening.box?.day ?? "");
    deadlineDay.setCustomValidity("");
    timeFieldShow(
        inputOf("entry-deadline-time"),
        deadline === "" || deadline === opening.box?.day ? null : new Date(deadline),
    );
    deadlineSee();
    endDayShow();
}

/**
 * Hides the day of the end while it is the day of the start,
 * and shows it once the end lies on another day, see `.entry-same-day` in `day.css`;
 * a field being typed in stays.
 */
function endDayShow(): void {
    const start: HTMLInputElement = inputOf("entry-start-day");
    const end: HTMLInputElement = inputOf("entry-end-day");
    end.classList.toggle(
        "entry-same-day",
        end !== document.activeElement &&
            dateParse(end.value) !== null &&
            dateParse(end.value) === dateParse(start.value),
    );
}

/**
 * Shows the time of the dialog as {@link lengthOnly} says: from and to,
 * or the day and how long the box lasts;
 * right beside the name `Time` of a box of the plan whose times may stay empty,
 * not an event imported, which keeps both, nor an entry of the log,
 * the switch between them, see `lengthSwapOf` in `times.ts`,
 * as in the dialog of a series: to a length it keeps how long the times typed last,
 * and empties them; to times it empties the length; the field shown then focused.
 */
function lengthShow(): void {
    const length: HTMLInputElement = inputOf("entry-length");
    const start: HTMLInputElement = inputOf("entry-start");
    const end: HTMLInputElement = inputOf("entry-end");
    const swappable: boolean = opened.target === "box" && !start.required;
    document.getElementById("entry-times")?.classList.toggle("entry-length-only", lengthOnly);
    document.getElementById("entry-swap")?.replaceChildren(
        ...(!swappable
            ? []
            : [
                  lengthSwapOf(!lengthOnly, (): void => {
                      const minutes: number =
                          timeFieldRead(start) === "" || timeFieldRead(end) === ""
                              ? 0
                              : Math.round((endRead(startRead()).getTime() - startRead().getTime()) / (60 * 1000));
                      length.value = !lengthOnly && minutes > 0 ? lengthTextOf(minutes) : "";
                      if (!lengthOnly) {
                          timeFieldShow(start, null);
                          timeFieldShow(end, null);
                      }
                      lengthOnly = !lengthOnly;
                      lengthShow();
                      (lengthOnly ? length : start).focus();
                  }),
              ]),
    );
}

/**
 * Shows the series of the box:
 * after the times of a box of a series the series icon ⟳,
 * the same as the new series beside `Plan +`, see `boxes.ts`,
 * since the pencil always changes one property and ⟳ always means the series,
 * as far from the times as the pencil from a summary;
 * for a box of a series of my course, see `seriesHas` in `series.ts`,
 * after it its group, see `boxGroupOf` in `groups.ts`, a pick closing the dialog,
 * see {@link groupPick}, ⟳ opening that series over this dialog,
 * see `seriesOpen` in `series.ts`;
 * for a box of a plain series ⟳ opening that series whole,
 * see `plainOpen` in `series.ts`;
 * saving the series closes this dialog too;
 * nothing for a new box, a box alone or an entry of the log.
 * - `pencil`: The series icon ⟳, which takes no focus,
 *   so a field of the times I leave by it,
 *   like a day written out with its weekday then,
 *   never moves it away from under the pointer before the click.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function seriesShow(): Promise<void> {
    const of: HTMLElement = document.getElementById("entry-of-series") as HTMLElement;
    const box: Box | null = opened.target === "box" ? opened.box : null;
    const pencil: HTMLButtonElement = pencilOf(Repeat, "Change the series", true);
    of.replaceChildren();
    of.hidden = box === null || (!box.series && !seriesHas(box));
    if (box !== null && seriesHas(box)) {
        const semester: string = box.semester || semesterOf(box.day);
        pencil.addEventListener("click", (): void => {
            seriesOpen(box.module, box.type, semester, entryClose).catch(console.error);
        });
        const course: Course | null =
            box.group === "" || !pickable(box)
                ? null
                : await readerAsk<Course>(
                      `/api/course/module?module=${encodeURIComponent(box.module)}` + `&semester=${semester}`,
                  ).catch((error: unknown): null => {
                      console.error(error);
                      return null;
                  });
        const group: HTMLElement | null = box.group === "" ? null : boxGroupOf(course, box, groupPick);
        of.append(pencil, ...(group === null ? [] : [group]));
    } else if (box !== null && box.series) {
        pencil.addEventListener("click", (): void => {
            plainOpen(box.id.split("#")[0], entryClose).catch(console.error);
        });
        of.append(pencil);
    }
}

/**
 * Closes the dialog without saving it,
 * as once the dialog of a series opened over it saved, see {@link seriesShow}.
 */
function entryClose(): void {
    dialogOf().close();
}

/** Gives the dialog of an entry or a box. */
function dialogOf(): HTMLDialogElement {
    return document.getElementById("entry") as HTMLDialogElement;
}

/**
 * Picks a group for the box of the dialog, from the menu of the groups after its times:
 * closes the dialog without saving, since the box moves to the session of that group,
 * and sends the pick, see `PickShow` in `groups.ts`;
 * the plan and the page of the module load anew as their files change.
 *
 * @param change - Changes the box as the pick does,
 *   which the dialog leaves to the page loading anew
 */
function groupPick(change: () => void, send: () => Promise<unknown>): void {
    entryClose();
    send().catch(console.error);
}

/**
 * Shows the dialog as an opening says,
 * a new one without category with the list of the categories open.
 * It has no title: below its fields, small and grey, the box a log entry comes from,
 * with a pencil beside it to change that box instead, when it can be changed;
 * at the bottom its file at the left, the copy, the bin, cancel and save at the right.
 * The first button, which the dialog focuses as it opens, loses the focus again,
 * so its ring never looks like a pick.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function entryShow(opening: EntryOpening): Promise<void> {
    const dialog: HTMLDialogElement = dialogOf();
    categories = structuredClone(await categoriesKept());
    persons = await personsKept();
    opened = opening;
    onlineParts = {
        onlineLink: opening.onlineLink,
        onlineChannel: opening.onlineChannel,
        onlineTitle: opening.onlineTitle,
    };
    onlineOpen = false;
    summaryLink = opening.titleLink;
    summaryOpen = false;
    summaryValue = -1;
    partsOpen = null;
    edits = { title: null, from: null, location: null, online: null, with: null };
    addresses = { ...opening.addresses };
    withOpen = [];
    personEdits = {};
    paramEdits = {};
    addedLine = "";
    placeFilled = "";
    chosen = null;
    realSeen = "";
    realMiddle = null;
    removeAsked = false;
    pain = String(opening.entry?.extendedProps.pain ?? "");

    (document.getElementById("entry-plan-title") as HTMLElement).textContent =
        opening.plan === null ? "" : `From the plan: ${opening.plan.title}`;
    hiddenSet("entry-plan", opening.target === "box" || opening.plan === null);
    hiddenSet("entry-plan-edit", opening.plan?.editable !== true);
    timesShow(opening);
    await seriesShow();
    (document.getElementById("entry-note") as HTMLTextAreaElement).value = opening.note;
    iconPut(document.getElementById("entry-remove") as HTMLElement, Trash, "Remove");
    hiddenSet("entry-remove", opening.entry === null && (opening.box === null || opening.box.state === "done"));
    hiddenSet("entry-duplicate", opening.entry === null && opening.box === null);
    hiddenSet("entry-error", true);
    hiddenSet("entry-changed", true);
    await categoryPick(categories.find((category: Category): boolean => category.name === opening.category) ?? null);
    categoryShow();
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
    if (chosen === null) document.querySelector<HTMLButtonElement>("#entry-category .picker-line")?.click();
}

/**
 * Gives the box the dialog shows,
 * so the dialog of a series that opens another box
 * in it can show this one again once it closes, see `boxShow` in `series.ts`.
 */
export function entryBoxOf(): Box | null {
    return dialogOf().open ? opened.box : null;
}

/** Gives the names of who I was with as the values of `With` keep them. */
function namesOf(people: Attendee[]): string {
    return people.map((person: Attendee): string => person.name).join(withParting);
}

/** Gives the address of each person of an entry or a box by name, as it wrote them. */
function addressesOf(people: Attendee[]): { [name: string]: string } {
    return Object.fromEntries(people.map((person: Attendee): [string, string] => [person.name, person.address]));
}

/**
 * Opens the dialog for a new entry of the log with start and end,
 * its day the calendar date of the start.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpen(start: Date, end: Date): Promise<void> {
    await entryShow(openingOf("log", start, end));
}

/**
 * Opens the dialog for a new log entry of the last half hour before the time of now
 * on the shown day, in quarter hours, so on today's page the half hour before now;
 * only before 00:30 the half hour starts the evening before,
 * so its day is the day before.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenNow(calendar: Calendar): Promise<void> {
    const end: Date = dateOf(calendar.view.currentStart, timeOf(new Date()));
    end.setMinutes(end.getMinutes() - (end.getMinutes() % 15), 0, 0);
    await entryOpen(new Date(end.getTime() - 30 * 60 * 1000), end);
}

/**
 * Opens the dialog for a new skill entry of the log with start and end,
 * `Skill` and its module picked, the rest as for any new entry:
 * the session the learning view asks for before it records, see `../editor/session.ts`.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenSkill(module: string, start: Date, end: Date): Promise<void> {
    await entryShow({
        ...openingOf("log", start, end),
        category: skillName,
        skill: { ...skillNone, module: module },
    });
}

/**
 * Opens the dialog to log a box at a start and an end;
 * a box with a category comes with its category
 * and fields picked as planned, see `skill.ts` for a skill box,
 * ready to save or to change;
 * a box without category, like a to-do another app wrote, without them.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenFromBox(box: Box, start: Date, end: Date): Promise<void> {
    const opening: Partial<EntryOpening> & { skill: SkillValues } = keptOpeningOf(box);
    await entryShow({
        ...openingOf("log", start, end),
        ...(box.category === "" ? { skill: opening.skill } : { ...opening, category: box.category }),
        plan: box,
    });
}

/**
 * Opens the dialog for a new box of a day, without category, time or duration.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function boxOpenNew(day: Date): Promise<void> {
    await entryShow(openingOf("box", day, day));
}

/**
 * Opens the dialog to change a box of the new system, its fields picked,
 * its start and end typed as far as it has them.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function boxOpenEdit(box: Box): Promise<void> {
    const day: Date = box.time === "" ? new Date(`${box.day}T12:00:00`) : new Date(box.time);
    await entryShow({
        ...openingOf("box", day, day),
        ...keptOpeningOf(box),
        time: box.time === "" ? null : day,
        minutes: box.minutes,
        category: box.category === "" ? null : box.category,
        note: box.note,
        box: box,
    });
}

/**
 * Gives what a box or an entry of the log opens the dialog with as it kept them:
 * its fields, its links and its skill, empty for those an entry lacks.
 */
function keptOpeningOf(kept: Partial<Box>): Partial<EntryOpening> & { skill: SkillValues } {
    const people: Attendee[] = kept.attendees ?? [];
    return {
        values: {
            title: kept.title ?? "",
            from: kept.from ?? "",
            location: kept.location ?? "",
            online: kept.online ?? "",
            with: namesOf(people),
        },
        addresses: addressesOf(people),
        titleLink: kept.titleLink ?? "",
        locationLink: kept.locationLink ?? "",
        onlineLink: kept.onlineLink ?? "",
        onlineChannel: kept.onlineChannel ?? "",
        onlineTitle: kept.onlineTitle ?? "",
        skill: {
            ...skillNone,
            module: kept.module ?? "",
            type: kept.type ?? "",
            semester: kept.semester ?? "",
            chapters: kept.chapters ?? [],
            links: kept.links ?? [],
        },
    };
}

/**
 * Opens the dialog to change an entry of the log of the new system, its fields picked,
 * its skill with its title and its rounds.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenEdit(entry: EventApi): Promise<void> {
    const props: { [field: string]: string } = entry.extendedProps;
    const opening: Partial<EntryOpening> & { skill: SkillValues } = keptOpeningOf({
        ...entry.extendedProps,
        title: entry.title,
    });
    await entryShow({
        ...openingOf("log", entry.start as Date, entry.end as Date),
        ...opening,
        category: props.category ?? null,
        note: props.note ?? "",
        foods: entry.extendedProps.foods ?? [],
        skill: {
            ...opening.skill,
            title: entry.title,
            titleLink: props.titleLink ?? "",
            rounds: entry.extendedProps.rounds ?? [],
        },
        entry: entry,
    });
}

/**
 * Opens the dialog anew for a copy of the entry of the log
 * or the box it shows, as it was saved,
 * but without its attempts, rounds, the box it was logged from, its deadline,
 * so I change what differs and save it as one more;
 * the entry or the box itself stays as it is.
 * A copy of a box is always a to-do, also that of a lecture imported from TUMonline.
 */
async function entryDuplicate(): Promise<void> {
    await entryShow({
        ...opened,
        skill: { ...opened.skill, title: "", titleLink: "", rounds: [] },
        plan: null,
        entry: null,
        box: null,
    });
}

/**
 * Checks the times before the dialog sends them, saying what is wrong at its field:
 * the end lies after the start, for an entry of the log and for a box with both times,
 * and a box with the time of its end has the time of its start;
 * a box with a deadline has no times to check, its start and end being off,
 * see {@link deadlineSee}, and neither has a box that lasts
 * only so long, see {@link lengthOnly}.
 */
function timesCheck(): boolean {
    const startTime: HTMLInputElement = inputOf("entry-start");
    const endTime: HTMLInputElement = inputOf("entry-end");
    let field: HTMLInputElement | null = null;
    if (startTime.matches(":disabled") || lengthOnly) return true;
    if (timeFieldRead(startTime) === "" && timeFieldRead(endTime) !== "") {
        field = startTime;
        field.setCustomValidity("A start before the end");
    } else if (
        timeFieldRead(startTime) !== "" &&
        timeFieldRead(endTime) !== "" &&
        endRead(startRead()) <= startRead()
    ) {
        field = inputOf("entry-end-day");
        field.setCustomValidity("The end lies after the start");
    }
    timesMarked = field;
    field?.reportValidity();
    return field === null;
}

/**
 * Takes the mark of {@link timesCheck} back once I type into a field of the times:
 * the field marked is valid again, since the dialog was sent with it;
 * typed into itself, its own check of its text marks it anew,
 * see `timesStart` in `times.ts`.
 */
function timesUnmark(event: Event): void {
    if (timesMarked !== null && timesMarked !== event.target) timesMarked.setCustomValidity("");
    timesMarked = null;
}

/**
 * Takes Enter in the dialog, for an entry of the log and a box of the plan alike:
 * Ctrl+Enter from any field saves it,
 * as its check does, before the field sees the key, the field left first,
 * as a click on the check leaves it, so it takes what I typed,
 * like the sets of an exercise, which a field takes once I leave it;
 * Enter in a field without its own use of it
 * only confirms that field, what I typed staying and the cursor leaving it,
 * instead of sending the form;
 * a field that uses Enter keeps it, and the note keeps it as a new line.
 * Ctrl+S saves it alike, from anywhere in the open dialog, also with no field focused,
 * in place of the browser saving the page;
 * with another dialog over it, like that of a new place,
 * it leaves the key to that one.
 */
function enterTake(): void {
    const form: HTMLFormElement = document.getElementById("entry-form") as HTMLFormElement;
    const dialog: HTMLDialogElement = dialogOf();
    const submit = (event: KeyboardEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        (document.activeElement as HTMLElement | null)?.blur();
        form.requestSubmit();
    };
    document.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
            const target: Node = event.target as Node;
            if (dialog.open && (target === document.body || dialog.contains(target))) submit(event);
        },
        true,
    );
    form.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (event.key === "Enter" && event.ctrlKey) submit(event);
        },
        true,
    );
    form.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter" || event.defaultPrevented || !(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        event.target.blur();
    });
}

/** Puts its icon into a button of the dialog, and what a click on it does. */
function buttonStart(id: string, icon: IconNode, words: string, click?: () => void): void {
    const button: HTMLElement = document.getElementById(id) as HTMLElement;
    iconPut(button, icon, words);
    if (click !== undefined) button.addEventListener("click", click);
}

/** Lets each element of the dialog by its id take an event by `handler`. */
function listen(ids: string[], type: string, handler: (event: Event) => void): void {
    ids.forEach((id: string): void => {
        document.getElementById(id)?.addEventListener(type, handler);
    });
}

/** Gives the calendar of the day the dialog writes with, `null` before it started. */
export function dayCalendarOf(): Calendar | null {
    return dayCalendar;
}

/**
 * Starts the entry by category after the router has put its HTML into the page,
 * its buttons and the fields that fill or check one another;
 * the dialog logs no box, since the menu of the box in the plan does that already;
 * the dialog of a new place starts too, see `places.ts`.
 */
export function categoriesStart(calendar: Calendar): void {
    dayCalendar = calendar;
    listsStart();
    buttonStart("entry-cancel", X, "Cancel", entryClose);
    buttonStart("entry-save", Check, "Save");
    listen(["entry-remove"], "click", (): void => {
        entryRemove(calendar).catch(errorShow);
    });
    buttonStart("entry-duplicate", Copy, "Duplicate", (): void => {
        entryDuplicate().catch(errorShow);
    });
    buttonStart("entry-plan-edit", Pencil, "Change the box in the plan", (): void => {
        if (opened.plan !== null) boxOpenEdit(opened.plan).catch(errorShow);
    });
    listen(["entry-deadline-day", "entry-deadline-time"], "input", deadlineSee);
    listen(["entry-start-day", "entry-start", "entry-end"], "input", endDayFill);
    listen(["entry-start-day", "entry-end-day"], "change", endDayShow);
    listen(["entry-start-day", "entry-start", "entry-end-day", "entry-end"], "input", timesUnmark);
    listen(["entry-start"], "change", endFill);
    listen(["entry-start-day", "entry-deadline-day"], "input", (): void => {
        if (chosen?.name === skillName) skillDaySet(dayRead());
        entryFileShow();
    });
    listen(["entry-end-day"], "input", (): void => {
        endDayTyped = true;
    });
    enterTake();
    listen(["entry-form"], "submit", (event: Event): void => {
        event.preventDefault();
        if (timesCheck()) entrySave(calendar).catch(errorShow);
    });
}
