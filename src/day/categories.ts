/**
 * ## Categories
 *
 * The one dialog that writes an entry of the log or a box of the plan, by category.
 * One column of rows in the order of the file, the note at the bottom.
 * A click on a row opens its one list right under it.
 * An empty field stays empty, but a time says grey what it takes.
 * Esc closes an open list, else the dialog, and a click beside it closes it without saving.
 * Enter confirms only its field, the entry saves only by its check, Ctrl+Enter or Ctrl+S.
 * A changed entry of the log saves only while its file still holds it as it opened, the first save winning.
 * The categories come by their importance for my life, without `Drink`, since water has its own tracker.
 * `Sport` has no note, since what I did stands in its rows.
 * The summary of `Sport` and `Way` takes no new values, but its pencil still changes it.
 * A pencil of a summary changes only this box or entry, never a box with the entry logged from it.
 * The pencil of a param changes it for every entry and box of its category.
 * A box of a series and an entry logged from it open no list, the whole series changes only in its own dialog.
 * A link opens on a click only while it is valid.
 * Places are only my places of `Places.md`, and only where I physically am, `Online` is apart.
 * The parts of a place change it everywhere once the dialog saves.
 * Start and end are each a day and a plain time, saved exactly as they show.
 * The times of a box may stay empty, but for a lecture of TUMonline, which keeps both.
 * A box with a deadline lies on the day of its deadline and has no expected time.
 * `+` always makes one box, a new series comes only from `⟳`.
 * The dialog of a series opens over this one, which stands as it was once it closes.
 */

import { choiceOf, choicesOf, fileShow, listsStart, partFieldOf, pairOf, partOf, rowOf, searchOf } from "./choices.ts";
import { boxAdd, boxChange, boxDelete, entryAdd, entryChange, entryDelete, standardAddressOf } from "./entries.ts";
import { cookName, foodName, mealCooked, mealFoods, mealOf, mealTitle, summarySearchOf } from "./meal.ts";
import { sportName, sportOf, sportRead, sportTitle } from "./sport.ts";
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
    lengthFieldRead,
    lengthFieldShow,
    lengthSwapOf,
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
import { changeAsk, removeAsk } from "./share.ts";
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

/** What parts the names of `With`, since a person of `Persons.md` holds a comma in its name. */
const withParting: string = "; ";

/** Folders and topics of the files of plan and log, by category, as `reader/sources.ts` names them. */
const topics: { [category: string]: string } = {
    Sleep: "Health/Sleep",
    Food: "Living/Food",
    Cook: "Living/Food",
    Way: "Living/Way",
};

/**
 * A field of a category, as the reader gives it.
 *
 * - `fixed`: Whether it takes only its values, and no new ones.
 * - `many`: Whether it takes several of its values.
 * - `rooms`: For a place, the rooms of `Rooms.md`, offered only as I search.
 * - `links`: For `With` the address of each name its last entry wrote.
 * - `params`: For a summary the params each value had before, the most used first.
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

/** A category, as the reader gives it. */
export type Category = {
    name: string;
    fields: Field[];
};

/** What the dialog writes: an entry of the log, or a box of the plan. */
type EntryTarget = "log" | "box";

/**
 * What the dialog shows when it opens.
 *
 * - `start`: For a box any time on its day.
 * - `end`: For a box the same as `start`.
 * - `titleLink`: The `ALTREP` of its `SUMMARY`.
 * - `plan`: Box a new entry of the log is logged from.
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

/** The text fields an entry of the log and a box of the plan share. */
type EntryTexts = Omit<EntryFields, "foods" | "planned" | "start" | "end">;

/** Category and what of my long neck session, which I rate my neck pain with. */
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

function valuesNone(): { [key in FieldKey]: string } {
    return { title: "", from: "", location: "", online: "", with: "" };
}

/** What a new entry or box opens with, its times and nothing picked. */
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
 * Categories with the values of their fields, copied as the dialog opens,
 * since a value picked new joins the lists of the open dialog only.
 */
let categories: Category[] = [];

/** Values picked in the lists of the fields, by the field they write into. */
let values: { [key in FieldKey]: string } = valuesNone();

let opened: EntryOpening = openingOf("log", new Date(), new Date());

/** Link, channel and title of the platform picked in `Online`, empty once another is picked. */
let onlineParts: Omit<Online, "online"> = { onlineLink: "", onlineChannel: "", onlineTitle: "" };

/** Whether `Online` shows its parts below it to type. */
let onlineOpen: boolean = false;

/** Field of a place whose place shows its parts below it, `null` while none does. */
let partsOpen: FieldKey | null = null;

/** The place picked in each field of a place as I changed it by its parts, written everywhere once it saves. */
let edits: { [key in FieldKey]: Place | null } = { title: null, from: null, location: null, online: null, with: null };

/** Line of the place just added, so picking it shows its parts. */
let addedLine: string = "";

/** A web address without spaces, as the reader takes it. */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/** Link of what the entry or the box was, the `ALTREP` of its `SUMMARY`, empty for none. */
let summaryLink: string = "";

/** Whether the summary shows its text to change below it. */
let summaryOpen: boolean = false;

/** Place of the value of a summary of several values whose pencil is open, -1 for the whole summary. */
let summaryValue: number = -1;

/** A value of a summary with its param in round brackets at its end, typed as I like. */
const paramForm: RegExp = /^(.*?)\s*\(([^()]*)\)\s*$/;

function baseOf(value: string): string {
    return paramForm.exec(value)?.[1] ?? value;
}

/** The param of a value of a summary, empty for none. */
function paramOf(value: string): string {
    return paramForm.exec(value)?.[2] ?? "";
}

/** Writes a value of a summary with its param, without what would part it from the value. */
function paramPut(base: string, param: string): string {
    const clean: string = param.replace(/[,()]/g, "").trim();
    return clean === "" ? base : `${base} (${clean})`;
}

/** The values of a summary of several values as its part `Text` got the cursor. */
let summaryValues: string[] = [];

/** The title the skill and the type picked of a skill entry give it, as last shown. */
let skillGiven: string = "";

/** Pencil beside the summary, its link below it, its text, its link typed, its param. */
type SummaryParts = [HTMLButtonElement, HTMLAnchorElement, HTMLInputElement, HTMLInputElement, HTMLInputElement | null];

let summaryShown: SummaryParts | null = null;

/** Category picked, `null` before picking. */
let chosen: Category | null = null;

/**
 * The rows of a meal, a cooking, a session of the log in place of its summary.
 * `null` for every other category.
 */
let summaryRows: HTMLElement[] | null = null;

/** Whether the remove button was clicked once and waits for the second click. */
let removeAsked: boolean = false;

/** My neck pain from 0 to 10 picked for a long neck session, empty for none. */
let pain: string = "";

/** What the real minutes of the last entries like a box were loaded for last, so they load only on a change. */
let realSeen: string = "";

/** Median of the real minutes of the last entries like a box. */
let realMiddle: number | null = null;

/** Whether I typed into the day of the end of a log entry, so it no longer fills itself. */
let endDayTyped: boolean = false;

/** Address of each name of `With` as the dialog has it, by name. */
let addresses: { [name: string]: string } = {};

/** The names of `With` that show their parts below them. */
let withOpen: string[] = [];

/** Each person of `With` I changed by its parts, by its name as picked, written everywhere once it saves. */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/** Each param I changed by its pencil, by its value without param, written everywhere once it saves. */
let paramEdits: { [value: string]: { old: string; name: string } } = {};

/** The people of `Persons.md` as kept when the dialog opened. */
let persons: Person[] = [];

/**
 * Place a new entry or box started with, where I was last,
 * so a way picked after it starts there instead of going there.
 */
let placeFilled: string = "";

/** Whether the box lasts only so long, its day and its length without times, never an entry of the log. */
let lengthOnly: boolean = false;

/**
 * Field of the times marked wrong, `null` for none.
 * Typing into any field of the times takes its mark, since that may set the times right.
 */
let timesMarked: HTMLInputElement | null = null;

/** The calendar of the day the dialog writes with. */
let dayCalendar: Calendar | null = null;

function inputOf(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

function hiddenSet(id: string, hidden: boolean): void {
    document.getElementById(id)?.toggleAttribute("hidden", hidden);
}

function timeRead(id: string): string {
    return timeFieldRead(inputOf(id));
}

/** Reads the day typed in a field of the dialog, `null` while it is no date. */
function dayTypedOf(id: string): string | null {
    return dateParse(inputOf(id).value);
}

/**
 * Loads the categories with the values of their fields from the reader.
 * An error is no categories, so the next opening loads them again.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function categoriesLoad(): Promise<Category[]> {
    return readerAsk<Category[]>(`/api/day/categories?now=${new Date().toISOString()}`);
}

/** The categories as the reader last sent them, so opening the dialog waits for no answer. */
const categoriesKept: () => Promise<Category[]> = changesKept(categoriesLoad);

/** The start as the fields say, on the day the dialog opened with should the typed day be no date. */
function startRead(): Date {
    const day: string = dayTypedOf("entry-start-day") ?? dayOf(opened.start);
    return dateOf(new Date(`${day}T12:00:00`), timeRead("entry-start"));
}

/** Reads the values picked, empty for a field the category picked does not have. */
function valuesRead(): { [key in FieldKey]: string } {
    const picked: { [key in FieldKey]: string } = valuesNone();
    (chosen?.fields ?? []).forEach((field: Field): void => {
        picked[field.key] = values[field.key];
    });
    return picked;
}

function foodsListed(): boolean {
    return [foodName, cookName].includes(chosen?.name ?? "") && opened.target === "log" && mealFoods().length > 0;
}

/**
 * Allows saving once a category and its summary are picked, of a skill its skill.
 * Save stays off without a word, as everywhere in the dashboard.
 * Called on every change of the fields, it also shows the summary's parts and the file.
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
 * The file the entry or the box lies in, or for a new one the file the reader will write it into.
 * For `Skill` that of its skill, else that of its topic in the year of its day.
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

/** The file of plan or log of a category other than `Skill`, as the reader names it. */
export function topicFileOf(category: string, day: string, ending: string): string {
    return (
        `NomManageplannings/NomManagecalendar/${topics[category] ?? "Living/Living"}` + `_${day.slice(0, 4)}${ending}`
    );
}

/** Shows the file of the entry or box left of the buttons. */
function entryFileShow(): void {
    fileShow(document.getElementById("entry-file") as HTMLAnchorElement, entryFileOf());
}

/**
 * Loads how long the last three entries like a box really lasted, their median the length of a new box,
 * so I plan by what happened, not by a hope (Buehler 1994).
 * The dialog does not show them, since a line of minutes under the deadline only puzzled me.
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

/** Fills the empty end of a new box from its start and the median of the real minutes of entries like it. */
function endFill(): void {
    if (
        opened.target === "box" &&
        opened.box === null &&
        realMiddle !== null &&
        inputOf("entry-end").value.trim() === ""
    )
        endFit(realMiddle);
}

/** Puts the end at its start and minutes after, nothing while the start has no time. */
function endFit(minutes: number): void {
    if (timeRead("entry-start") === "") return;
    timeFieldShow(inputOf("entry-end"), new Date(startRead().getTime() + minutes * 60 * 1000));
    endDayFill();
}

function placeIs(field: Field): boolean {
    return placeKeys.includes(field.key);
}

/**
 * Takes a value picked into the list of every field of its kind that lacks it,
 * because places are one list for every field of a place.
 * A room picked stays among the rooms, which the list offers only as I search.
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

function neckLongPicked(): boolean {
    return opened.target === "log" && chosen?.name === neckLong[0] && values.title === neckLong[1];
}

/**
 * The row of my neck pain from 0 to 10 for `Body` in the log, shown only while `Neck long` is picked.
 * It is the outcome my neck routine is judged by.
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

/** Shows the steps of the value picked in a field, one per line. */
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
 * The value of a field that takes only its values, for a value an older entry wrote another way.
 * That is the value that reads the same without hyphens, spaces and case.
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

/** The text of a field as the field takes it, each of its values by {@link fixedValueOf}. */
function fixedTextOf(field: Field, text: string): string {
    return (field.many === true ? text.split(", ") : [text])
        .map((value: string): string => fixedValueOf(field, value))
        .join(", ");
}

/** The choice of a place of a field, the place picked by the name I gave it by its parts. */
function fieldChoiceOf(field: Field, value: string): Choice {
    const name: string = labelOf(value) === labelOf(values[field.key]) ? (edits[field.key]?.name ?? "") : "";
    return placeChoiceOf(value, name !== "" ? name : labelOf(value), field.places);
}

/** The place offered in a field that the place picked is, `undefined` for none. */
function mineOf(field: Field): string | undefined {
    const line: string = values[field.key];
    return line === ""
        ? undefined
        : [...field.values, ...field.rooms].find((value: string): boolean => labelOf(value) === labelOf(line));
}

/** The place picked in a field before I change it by its parts, with the link the entry kept. */
function placeOriginOf(field: Field): Place {
    const line: string = values[field.key];
    const kept: string = labelOf(line) === labelOf(opened.values.location) ? opened.locationLink : "";
    return placeOf(line, kept, field.places);
}

/**
 * Shows the address of the place picked below its label, as a link to the link of the place.
 * The link is the one the entry kept while that same place stays picked, else that of my place or room.
 * A place without link shows plain text, never the link itself.
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

/** Focuses the part of a place or a summary named so. */
function partFocus(name: string | null): void {
    document.querySelector<HTMLInputElement>(`#entry .field-parts input[aria-label="${name}"]`)?.focus();
}

/** The pencil of the place picked, which shows or hides its parts, one field at a time, and its address. */
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

/** Shows the rows of where it is anew, the other rows staying as they are. */
function placesShow(): void {
    document
        .getElementById("entry-place")
        ?.replaceChildren(...rowsOf((field: Field): boolean => placeIs(field) || field.key === "online"));
}

function partsShown(field: Field): boolean {
    return partsOpen === field.key && values[field.key] !== "";
}

/** Shows the rows of the places anew, the first part focused while they show, so I type at once. */
function partsShow(field: Field): void {
    placesShow();
    if (partsShown(field))
        document.querySelector<HTMLInputElement>(`#entry .field-parts[data-field="${field.key}"] input`)?.focus();
}

/**
 * The parts of the place picked, taken as I type, its line showing them once I leave a part.
 * They carry the key of their field, so the dialog finds them apart from those of another place.
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
 * Shows the link of what the entry or the box was below its summary, and fills its fields while I don't type in them.
 * A skill entry without link shows the folder of its skill, which opens in this window, being NomSystem's own.
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
 * The pencil, link and parts `Text`, `Param` and `Link` of what the entry or the box was.
 * The entry takes the text as I type, its line shows it once I leave the part.
 * That happens at `focusout`, whose `relatedTarget` names the field I went on to, which keeps the cursor.
 *
 * @param typed - Whether it has its text to change, by default whether it has a field
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
    if (param !== null) parts.append(partOf("Param", param));
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

/** What the parts of the summary change. */
function summaryPickedOf(): string {
    return summaryValue === -1 ? values.title : (values.title.split(", ")[summaryValue] ?? "");
}

/** The summary as the part `Text` holds it, an emptied value of several left out. */
function summaryTypedOf(typed: string): string {
    if (summaryValue === -1) return typed;
    return summaryValues
        .map((value: string, index: number): string => (index === summaryValue ? typed : value))
        .filter((value: string): boolean => value !== "")
        .join(", ");
}

/**
 * Changes the summary of this entry alone, never opening a series.
 * Its text shows or hides.
 */
function summaryChange(parts: HTMLElement): void {
    summaryValue = -1;
    summaryOpen = !summaryOpen;
    parts.hidden = !summaryOpen;
    if (summaryOpen) parts.querySelector("input")?.focus();
}

/** Takes a change of a skill entry, its title and link following its skill and type. */
function skillChanged(): void {
    const given: string = skillTitleOf();
    if (given !== skillGiven) summaryLink = "";
    values.title = given;
    skillGiven = given;
    summaryPartsShow();
    saveAllow();
}

/**
 * Adds a place typed into `Places.md` at once by its name, its parts showing so I type them next.
 *
 * @throws {Error} - When the reader does not take it
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
 * The search of the list of a place, my default place first, then my places, the most used first.
 * The rooms of the university join only as I type.
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
 * The rows of a field of the category picked.
 * A place shows by its name once, however often it was used and whatever address an entry kept.
 * Picking another place forgets what I changed of the one before.
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
    if (field.key === "title" && summaryRows !== null) return summaryRows;
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
 * The row of a summary of several values, each value with its own pencil.
 * A meal or a cooking only picks and adds its values, without param, pencil, link.
 * A way keeps the order picked, the order I rode in, any other summary the order of its list.
 * While none is picked, the row is empty without a plus, since a click into it opens its list.
 */
function manyRowOf(field: Field): HTMLElement {
    const picked: string[] = values[field.key] === "" ? [] : values[field.key].split(", ").map(baseOf);
    const dish: boolean = [foodName, cookName].includes(chosen?.name ?? "");
    const [link, linkParts]: (HTMLElement | undefined)[] = dish ? [] : summaryPartsOf(field).slice(1);
    const param: HTMLElement = document.createElement("div");
    param.className = "picker-quiet";
    return rowOf(
        field.name,
        choicesOf({
            search: summarySearchOf(chosen?.name ?? "", field.values),
            picked: picked,
            many: true,
            adding: !field.fixed,
            noun: "summary",
            linkOf: (): string => "",
            afterOf: dish ? undefined : (value: string): HTMLElement => valueAfterOf(field, param, value),
            below: link === undefined || linkParts === undefined ? [] : [link, linkParts, param],
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
                if (linkParts !== undefined) linkParts.hidden = true;
                saveAllow();
            },
        }),
    );
}

/**
 * What stands after one value of a summary of several, its param or a plus, then its pencil.
 * The pencil takes no focus, so a part I leave by it keeps what I typed.
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

/** Where a value picked stands in the summary now, -1 once it changed. */
function valueAtOf(value: string): number {
    return values.title.split(", ").findIndex((old: string): boolean => baseOf(old) === value);
}

/** The param of a value in brackets, or a plus without one. */
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
 * The picker of the param of a value, its list the params that value had before.
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
            paramPick(at, picked[0] ?? "");
        },
    });
}

/**
 * Writes the param of a value into the summary, its list offering it only once the entry is saved.
 *
 * @param at - Place of the value in the summary, -1 for a summary of one value
 */
function paramPick(at: number, param: string): void {
    const all: string[] = at === -1 ? [values.title] : values.title.split(", ");
    const base: string = baseOf(all[Math.max(at, 0)]);
    const written: string = paramPut(base, param);
    values.title = all
        .map((value: string, index: number): string => (index === Math.max(at, 0) ? written : value))
        .join(", ");
    saveAllow();
    titleRowsShow();
}

/**
 * Opens the list of the param of a value of several from a picker below the row,
 * since the line of the summary, a button, can hold no picker.
 */
function paramListOpen(field: Field, home: HTMLElement, value: string): void {
    const at: number = valueAtOf(value);
    if (at === -1) return;
    const picker: HTMLElement = paramPickerOf(field, at, values.title.split(", ")[at], []);
    home.replaceChildren(picker);
    picker.querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/** Where a value stands in the list of a field, a new one after all. */
function rankOf(field: Field, value: string): number {
    const at: number = field.values.indexOf(value);
    return at === -1 ? field.values.length : at;
}

/** Who I was with, each name with its address as the dialog has it, else as its last entry wrote it. */
function peopleRead(): Attendee[] {
    const field: Field | undefined = chosen?.fields.find((other: Field): boolean => other.key === "with");
    if (field === undefined || values.with === "") return [];
    return values.with.split(withParting).map((name: string): Attendee => ({
        name: name,
        address: addresses[name] ?? field.links[name] ?? standardAddressOf(name),
    }));
}

/** The rows of the fields below the times, which is who I was with. */
function moreRowsOf(): HTMLElement[] {
    return rowsOf((field: Field): boolean => field.key !== "title" && !placeIs(field) && field.key !== "online");
}

function rowsOf(keep: (field: Field) => boolean): HTMLElement[] {
    return (chosen?.fields ?? []).filter(keep).flatMap(fieldRowsOf);
}

/**
 * Whether the dialog logs a box with a category, or changes an entry logged from a box.
 * Its category stays the plan's, so the link shows how the plan was really done.
 */
function asPlanned(): boolean {
    return (
        opened.target === "log" &&
        opened.category !== null &&
        (opened.plan !== null || (opened.entry?.extendedProps.planned ?? "") !== "")
    );
}

/** Whether the dialog shows a box of a series or an entry logged from one, whose line opens no list. */
function ofSeries(): boolean {
    return (
        opened.box?.series === true ||
        opened.plan?.series === true ||
        String(opened.entry?.extendedProps.planned ?? "").includes("#")
    );
}

/** Shows the rows of the summary anew, the rows below staying as they are. */
function titleRowsShow(): void {
    document
        .getElementById("entry-fields")
        ?.replaceChildren(...rowsOf((field: Field): boolean => field.key === "title"));
}

/** Shows the fields of the category picked in the order of the file, the same for every category. */
function fieldsShow(): void {
    titleRowsShow();
    placesShow();
    document.getElementById("entry-more")?.replaceChildren(...moreRowsOf(), ...painRowOf());
    document.getElementById("entry-note")?.closest(".panel-field")?.toggleAttribute("hidden", sportShown());
    saveAllow();
}

function sportShown(): boolean {
    return chosen?.name === sportName && opened.target === "log";
}

/**
 * Loads where I was last before the start of the entry, without start time before the end of its day.
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
 * Fills in where a new entry starts as where I was last, else my default place.
 * Never a room, so after a lecture I am where I was before it.
 * A new box always takes my default place, since no entry before it tells where I will be.
 * A way picked after another category leaves the place filled in for it, so its goal stays empty.
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
 * Picks a category and shows its fields, keeping the places picked before, but not the summary.
 * A wait for the reader shows nothing once another category was picked meanwhile.
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
    summaryRows = null;
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
        summaryRows = built;
    }
    if (category?.name === sportName && opened.target === "log") {
        const built: HTMLElement[] = await sportOf(
            opened.category === sportName ? (opened.entry?.extendedProps ?? null) : null,
            saveAllow,
        );
        if (chosen !== category) return;
        summaryRows = built;
    }
    fieldsShow();
}

/**
 * Shows the category as the first row.
 * A changed skill entry of the log cannot become another category, nor another entry a skill entry,
 * because only `reader/skill.ts` writes its documents and attempts.
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

/** What the entry was, its `SUMMARY`, the name of a category without the field `title`. */
function titleRead(picked: string): string {
    if (chosen?.name === skillName) return values.title;
    if (foodsListed()) return mealTitle();
    if (sportShown() && sportTitle() !== "") return sportTitle();
    return chosen?.fields.some((field: Field): boolean => field.key === "title") ? picked : (chosen?.name ?? "");
}

/** Reads the text fields of the dialog, the semester of a skill entry as picked, else of the day. */
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

/** The day of the entry as typed, of a box with a deadline the day of its deadline. */
function dayRead(): string {
    const deadlineDay: string | null = opened.target === "box" ? dayTypedOf("entry-deadline-day") : null;
    const typed: string | null = deadlineDay ?? dayTypedOf("entry-start-day");
    return typed ?? dayOf(opened.start);
}

/** The end as the fields say, on the day of the start should the typed day be no date. */
function endRead(start: Date): Date {
    const day: string = dayTypedOf("entry-end-day") ?? dayOf(start);
    return dateOf(new Date(`${day}T12:00:00`), timeRead("entry-end"));
}

/**
 * Fills the day of the end until I type into it myself.
 * It is the day after while the end time lies at or before the start time, as a night of sleep.
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

/** Reads the dialog for an entry of the log, exactly as the fields show. */
function fieldsRead(): EntryFields {
    const start: Date = startRead();
    const end: Date = endRead(start);
    return {
        ...textsRead(dayOf(start)),
        foods: [foodName, cookName].includes(chosen?.name ?? "") ? mealFoods() : [],
        cooked: chosen?.name === foodName ? mealCooked() : "",
        planned: opened.entry === null ? (opened.plan?.id ?? "") : "",
        pain: neckLongPicked() ? pain : "",
        ...(sportShown() ? sportRead() : { exercises: [] }),
        start: start,
        end: end,
    };
}

/**
 * Reads the dialog for a box, its start the expected time, the minutes to its end the expected duration.
 * A length of `00:00` is none.
 * With a deadline it lies on the day of its deadline without expected time, keeping the duration it had.
 */
function boxFieldsRead(): BoxFields {
    const day: string = dayTypedOf("entry-start-day") ?? dayOf(opened.start);
    const startTime: string = timeRead("entry-start");
    const endTime: string = timeRead("entry-end");
    const length: number | null = lengthFieldRead(inputOf("entry-length"));
    const deadlineDay: string = dayTypedOf("entry-deadline-day") ?? "";
    const deadlineTime: string = timeRead("entry-deadline-time");
    const start: Date | null = startTime === "" || lengthOnly ? null : dateOf(new Date(`${day}T12:00:00`), startTime);
    let minutes: number | null = lengthOnly
        ? length
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

/** Shows a hint above the buttons and scrolls down to it, so a long dialog shows it too. */
function hintShow(id: string): void {
    const dialog: HTMLDialogElement = dialogOf();
    hiddenSet(id, false);
    dialog.scrollTo({ top: dialog.scrollHeight });
}

/** Shows the hint that the reader did not take what the dialog sent. */
function errorShow(error: unknown): void {
    console.error(error);
    hintShow("entry-error");
}

/**
 * Writes each param I changed in every entry and box of the category that gives it to its value.
 * A param emptied leaves only this entry or box, one the summary no longer holds nothing.
 * A param of a value that had none comes only into this entry or box.
 *
 * @throws {Error} - When the reader does not take a param
 */
async function paramsRename(dry: boolean): Promise<void> {
    for (const [value, edit] of Object.entries(paramEdits)) {
        const written: string = paramPut(value, edit.name);
        if (
            edit.old !== "" &&
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
 * Writes the places, people and params I changed everywhere.
 * Checked before the entry is saved, so the dialog saves nothing the reader would refuse.
 * Written after it, so the entry, saved as it was, takes it with every other.
 * A person `Persons.md` does not hold yet gets its row there.
 *
 * @param dry - Whether they are only checked
 * @throws {Error} - When the reader does not take one
 */
async function renamesSend(dry: boolean): Promise<void> {
    for (const field of (chosen?.fields ?? []).filter(placeIs)) {
        const edit: Place | null = edits[field.key];
        if (values[field.key] !== "" && edit !== null && JSON.stringify(edit) !== JSON.stringify(placeOriginOf(field)))
            await renameSend(labelOf(values[field.key]), edit, dry);
    }
    await personsRename(
        personEdits,
        persons,
        dry,
        peopleRead().map((person: Attendee): string => person.name),
    );
    await paramsRename(dry);
}

/**
 * Sends the new or changed entry or box to the reader, then closes the dialog.
 * A changed entry goes with its fingerprint as the dialog opened it, so the first save wins.
 * When its file changed it since, nothing is saved and the dialog stays open, saying so.
 * A change asks whether it goes to those I share it with, see `share.ts`.
 *
 * @throws {Error} - When the reader does not take the entry or a place or person I changed
 */
async function entrySave(calendar: Calendar): Promise<void> {
    await renamesSend(true);
    const version: string = opened.entry?.extendedProps.version ?? "";
    const shared: [string, Attendee[]] | null = sharedOf();
    let saved: boolean = true;
    if (opened.target === "box" && opened.box !== null) await boxChange(opened.box.id, boxFieldsRead());
    else if (opened.target === "box") await boxAdd(boxFieldsRead());
    else if (chosen?.name === skillName)
        saved = await skillSave(calendar, opened.entry?.id ?? "", fieldsRead(), version);
    else if (opened.entry !== null) saved = await entryChange(calendar, opened.entry.id, fieldsRead(), version);
    else await entryAdd(calendar, fieldsRead());
    if (saved) {
        await renamesSend(false);
        if (shared !== null) await changeAsk(shared[0], shared[1], peopleRead());
        entryClose();
    } else hintShow("entry-changed");
}

/**
 * `UID` and `With` of the entry or the box the dialog shows, which I may share.
 * `null` for a new one and for a day of a series.
 */
function sharedOf(): [string, Attendee[]] | null {
    if (opened.target === "box")
        return opened.box === null || opened.box.series ? null : [opened.box.id, opened.box.attendees];
    return opened.entry === null ? null : [opened.entry.id, opened.entry.extendedProps.attendees ?? []];
}

/**
 * Removes the entry or the box on the second click, the first only asks.
 * A box of a series goes that day alone.
 * A box I decided against is dropped by its cross instead, so it can be counted.
 * It asks whether it goes for those I share it with too, see `share.ts`.
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

    const shared: [string, Attendee[]] | null = sharedOf();
    if (shared !== null) await removeAsk(shared[0], shared[1]);
    if (opened.target === "box") await boxDelete(opened.box?.id ?? "");
    else await entryDelete(calendar, opened.entry?.id ?? "");
    entryClose();
}

/**
 * Turns the times of a box off while the day of a deadline is typed, since then it has no expected time.
 * Asks for the day of a deadline while its time is typed, since a time alone is no deadline.
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
 * Shows the times of the dialog, for a to-do its deadline too.
 * The deadline is hidden and disabled otherwise, so the browser checks only the times shown.
 * A box without time but with a duration and without deadline shows only its day and its length.
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
    lengthFieldShow(inputOf("entry-length"), lengthOnly ? opening.minutes : null);
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

/** Hides the day of the end while it is the day of the start, but while I type in it. */
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
 * Shows the times from and to, or the day and how long the box lasts, as {@link lengthOnly} says.
 * A box whose times may stay empty has the switch between them, which keeps how long the times last.
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
                      lengthFieldShow(length, lengthOnly ? null : minutes);
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
 * Shows after the times of a box of a series the icon ⟳, which opens its series, and of my course its group.
 * ⟳ and not a pencil, since the pencil always changes one property and ⟳ always means the series.
 * ⟳ takes no focus, so a field of the times I leave by it never moves it from under the pointer.
 * A group picked closes the dialog without saving, since the box moves to the session of that group.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function seriesShow(): Promise<void> {
    const of: HTMLElement = document.getElementById("entry-of-series") as HTMLElement;
    const box: Box | null = opened.target === "box" ? opened.box : null;
    of.replaceChildren();
    of.hidden = box === null || (!box.series && !seriesHas(box));
    if (box === null || of.hidden) return;
    const course: boolean = seriesHas(box);
    const semester: string = box.semester || semesterOf(box.day);
    const pencil: HTMLButtonElement = pencilOf(Repeat, "Change the series", true);
    pencil.addEventListener("click", (): void => {
        (course
            ? seriesOpen(box.module, box.type, semester, entryClose)
            : plainOpen(box.id.split("#")[0], entryClose)
        ).catch(console.error);
    });
    const loaded: Course | null =
        !course || box.group === "" || !pickable(box)
            ? null
            : await readerAsk<Course>(
                  `/api/course/module?module=${encodeURIComponent(box.module)}` + `&semester=${semester}`,
              ).catch((error: unknown): null => {
                  console.error(error);
                  return null;
              });
    const group: HTMLElement | null =
        !course || box.group === ""
            ? null
            : boxGroupOf(loaded, box, (_: () => void, send: () => Promise<unknown>): void => {
                  entryClose();
                  send().catch(console.error);
              });
    of.append(pencil, ...(group === null ? [] : [group]));
}

/** Closes the dialog without saving it. */
function entryClose(): void {
    dialogOf().close();
}

function dialogOf(): HTMLDialogElement {
    return document.getElementById("entry") as HTMLDialogElement;
}

/**
 * Shows the dialog as an opening says, a new one with the list of the categories open.
 * The first button, which the dialog focuses as it opens, loses the focus, so its ring never looks like a pick.
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

/** The box the dialog shows, `null` while it is closed. */
export function entryBoxOf(): Box | null {
    return dialogOf().open ? opened.box : null;
}

/** The names of who I was with as the values of `With` keep them. */
function namesOf(people: Attendee[]): string {
    return people.map((person: Attendee): string => person.name).join(withParting);
}

/** The address of each person by name. */
function addressesOf(people: Attendee[]): { [name: string]: string } {
    return Object.fromEntries(people.map((person: Attendee): [string, string] => [person.name, person.address]));
}

/**
 * Opens the dialog for a new entry of the log.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpen(start: Date, end: Date): Promise<void> {
    await entryShow(openingOf("log", start, end));
}

/**
 * Opens the dialog for a new log entry of the last half hour before now on the shown day, in quarter hours.
 * Before 00:30 the half hour starts the evening before.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenNow(calendar: Calendar): Promise<void> {
    const end: Date = dateOf(calendar.view.currentStart, timeOf(new Date()));
    end.setMinutes(end.getMinutes() - (end.getMinutes() % 15), 0, 0);
    await entryOpen(new Date(end.getTime() - 30 * 60 * 1000), end);
}

/**
 * Opens the dialog for a new skill entry of the log, `Skill` and its module picked.
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
 * Opens the dialog to log a box, its category and fields picked as planned.
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
 * Opens the dialog to change a box, its fields picked.
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

/** The fields, links and skill a box or an entry opens the dialog with, empty for those it lacks. */
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
 * Opens the dialog to change an entry of the log, its fields picked.
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
 * Opens the dialog anew for a copy of the entry or the box, without its rounds, plan and deadline.
 * A copy of a box is always a to-do, also that of a lecture of TUMonline.
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

/** Checks that the end lies after the start, and an end has a start, saying what is wrong at its field. */
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
 * Takes the mark of {@link timesCheck} back once I type into a field of the times.
 * Typed into the marked field itself, its own check of its text marks it anew.
 */
function timesUnmark(event: Event): void {
    if (timesMarked !== null && timesMarked !== event.target) timesMarked.setCustomValidity("");
    timesMarked = null;
}

/**
 * Takes the keys of the dialog.
 * Ctrl+Enter and Ctrl+S save it, the field left first, so it takes what I typed.
 * Ctrl+S works with no field focused too, and leaves the key to another dialog over this one.
 * Enter in a field without its own use of it only confirms that field instead of sending the form.
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

function listen(ids: string[], type: string, handler: (event: Event) => void): void {
    ids.forEach((id: string): void => {
        document.getElementById(id)?.addEventListener(type, handler);
    });
}

/** The calendar of the day the dialog writes with, `null` before it started. */
export function dayCalendarOf(): Calendar | null {
    return dayCalendar;
}

/**
 * Starts the dialog, its buttons and the fields that fill or check one another.
 * It logs no box, since the menu of the box in the plan does that already.
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
