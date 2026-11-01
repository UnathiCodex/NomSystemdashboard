/**
 * ## Course
 *
 * The course of a module on its page above its chapters, in the semester of today.
 * On top the card `Learning`, my own skill entries of the module without type, numbered by date.
 * Then one card per type, always one of each numbered type and of the exams, so everything starts there.
 * Any other type has a card while it has boxes or groups or a material folder.
 *
 * A card is the list of its boxes by month, its rows those of the dialog of a series.
 * An open box whose day is over counts as skipped and is greyed, but an exam, since every exam matters.
 * One rule folds every card alike: of the days over only open exams show,
 * from today on the next open box and two more.
 * A click on the counts opens and closes the rest in place, so nothing above it moves.
 * The pencil opens the same dialog of a series as from the day, also for a new series.
 * Phones show no course, since they show only the day.
 */

import { dialogOf } from "./dialog.ts";
import { boxDrop, boxLog, boxSubmit, boxUndo, boxUniversity } from "../day/entries.ts";
import { boxActionsOf } from "../day/actions.ts";
import { whereLinkedOf } from "../day/places.ts";
import { personsKept } from "../persons.ts";
import { listRowOf, numberOf, rowTimesOf } from "../day/rows.ts";
import { learningOpen, monthListOf, numberedTypes, roomOf, seriesOpen, tallyOf } from "../day/series.ts";
import { boxGroupOf, pinnedMenuOf } from "../day/groups.ts";
import { boxTimesOf } from "../day/times.ts";
import { calendarTodayOf } from "../today.ts";
import { elementOf } from "../food/foods.ts";
import { iconOf, iconPut } from "../icons.ts";
import { folderAddressOf } from "../notes/tree.ts";
import { modulesFolder } from "../skill/links.ts";
import { skillName } from "../skill/attempts.ts";
import { changesFollow } from "../changes.ts";
import { readerAsk } from "../reader.ts";
import { ArrowRight, Calendar, CalendarOff, Check, ChevronDown, ChevronUp, Pencil, X } from "lucide";
import "../day/boxes.css";
import "../day/log.css";
import "../day/day.css";
import "../day/choices.css";
import "../day/series.css";
import "./course.css";

import type { Dialog } from "./dialog.ts";
import type { Box } from "../day/boxes.ts";
import type { Course, Group, Learned, Series } from "../day/series.ts";
import type { IconNode } from "lucide";
import type { MaterialFolder } from "../../reader/notes.ts";
import type { Person } from "../../reader/persons.ts";

/** The types of the cards in their order, each with its whole name. */
const typeNames: Map<string, string> = new Map([
    ["VO", "Vorlesung"],
    ["UE", "Übung"],
    ["ZU", "Zentralübung"],
    ["TU", "Tutorübung"],
    ["HU", "Hausaufgabe"],
    ["PR", "Praktikum"],
    ["FA", "Prüfung"],
]);

/** The types every module has a card of, also while it has nothing yet. */
const alwaysTypes: string[] = [...numberedTypes, "FA"];

/** Rows of a card shown from the next open box on. */
const shownAhead: number = 3;

/** The course as loaded last. */
let shown: Course | null = null;

/** The people of `Persons.md`. */
let persons: Person[] = [];

/** Where the cards stand. */
let place: HTMLElement | null = null;

/** Folder of the module shown. */
let module: string = "";

/** Types of the cards whose folded rows show. */
const opened: Set<string> = new Set();

/** Whether the course already loads anew once the dialog of an entry closes. */
let dialogFollowed: boolean = false;

function groupsOf(type: string): Group[] {
    return (shown?.groups ?? []).filter((group: Group): boolean => group.rule.type === type);
}

/** @throws {Error} - When the reader cannot answer */
async function courseLoad(): Promise<void> {
    [shown, persons] = await Promise.all([
        readerAsk<Course>(`/api/course/module?module=${encodeURIComponent(module)}&semester=`),
        personsKept(),
    ]);
    cardsShow();
}

/**
 * Opens the dialog of a series, the same as from the day.
 *
 * @param type - `FA` for the exams, empty for a new one
 */
function seriesShow(type: string): void {
    dialogShow()
        .then((): Promise<void> => seriesOpen(module, type, shown?.semester ?? ""))
        .catch((error: unknown): void => console.error(error));
}

/** Sends a change, then loads anew also when it fails, so a pick shown at once goes back. */
function act(send: () => Promise<unknown>): void {
    send()
        .catch((error: unknown): void => console.error(error))
        .then((): Promise<void> => courseLoad())
        .catch((error: unknown): void => console.error(error));
}

/** The dialog of an entry, the course loading anew whenever it closes, saved or not. */
async function dialogShow(): Promise<Dialog> {
    const dialog: Dialog = await dialogOf();
    if (!dialogFollowed)
        document.getElementById("entry")?.addEventListener("close", (): void => {
            courseLoad().catch((error: unknown): void => console.error(error));
        });
    dialogFollowed = true;
    return dialog;
}

/**
 * Opens a box tapped as the day view does.
 *
 * @throws {Error} - When the reader does not answer
 */
async function boxOpen(box: Box): Promise<void> {
    const dialog: Dialog = await dialogShow();
    if (box.editable) await dialog.categories.boxOpenEdit(box);
    else if (box.state === "open") {
        const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
        await dialog.categories.entryOpenFromBox(box, start, end);
    }
}

/** Actions of an open box as in the plan, no `Series`, which the pencil of its card opens. */
function actionsOf(box: Box): HTMLElement {
    const log: () => Promise<void> = async (): Promise<void> => {
        const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
        await boxLog(box.id, start, end);
    };
    return boxActionsOf(box, (): void => act(log), act, true);
}

/** State of a box no longer open in place of its actions, a click taking it back. */
function stateOf(box: Box): HTMLElement {
    const undo: () => Promise<void> = async (): Promise<void> => boxUndo((await dialogShow()).calendar, box.id);
    let state: [IconNode, string, (() => Promise<void>) | null] = [
        CalendarOff,
        "Cancelled",
        box.editable ? (): Promise<void> => boxUniversity(box.id, false) : null,
    ];
    if (box.state === "done")
        state =
            box.deadline === ""
                ? [Check, "Logged", undo]
                : [Check, "Submitted", (): Promise<void> => boxSubmit(box.id, false)];
    else if (box.state === "dropped" || box.state === "open")
        state = [
            X,
            "Skipped",
            box.editable && box.state === "dropped" ? (): Promise<void> => boxDrop(box.id, false) : null,
        ];
    const [icon, word, back]: [IconNode, string, (() => Promise<void>) | null] = state;
    const button: HTMLElement = document.createElement(back === null ? "span" : "button");
    if (button instanceof HTMLButtonElement) button.type = "button";
    button.className = "box-state";
    iconPut(button, icon, word);
    button.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        if (back !== null) act(back);
    });
    return button;
}

/** An open box counts as skipped once its day is over, but an exam, nothing written. */
function overIs(box: Box): boolean {
    return box.state === "open" && box.type !== "FA" && box.day < calendarTodayOf();
}

/** Shows a pick of a group at once, the reader confirming it as the course loads anew. */
function groupPick(change: () => void, send: () => Promise<unknown>): void {
    change();
    shown?.boxes.sort((first: Box, second: Box): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
    cardsShow();
    act(send);
}

/**
 * Row of a box, greyed while not open or its day over, but an exam.
 *
 * @param number - Its `X-NUMBER` when left out, `–` for an exam without kind
 */
function boxRowOf(
    box: Box,
    number: string = box.number.replace("NONE", "–") || (box.type === "FA" ? "–" : ""),
): HTMLElement {
    const over: boolean = overIs(box);
    return listRowOf({
        number: numberOf(
            number,
            (): void => {
                boxOpen(box).catch((error: unknown): void => console.error(error));
            },
            box.note || "Open",
        ),
        day: box.day,
        open: null,
        group: boxGroupOf(shown, box, groupPick),
        meta: [
            [rowTimesOf(box.time, box.minutes)],
            whereLinkedOf(box.category, box.from, roomOf(box.location), box.locationLink, box.online, box.onlineLink),
            [box.chapters.join(", ")],
        ],
        people: box.attendees,
        persons: persons,
        mark: "",
        end: box.state === "open" && !over ? actionsOf(box) : stateOf(box),
        faded: box.type !== "FA" && (box.state !== "open" || box.day < calendarTodayOf()),
    });
}

/** The counts of a card as a button that opens or closes its folded rows. */
function foldOf(type: string): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    const open: boolean = opened.has(type);
    button.type = "button";
    button.className = "series-summary";
    button.setAttribute("aria-expanded", String(open));
    button.addEventListener("click", (): void => {
        if (open) opened.delete(type);
        else opened.add(type);
        cardsShow();
    });
    return button;
}

/**
 * Line of counts of a card, a button with a chevron while some rows fold.
 *
 * @param type - Empty for the card `Learning`
 * @param learned - Sessions of `Learning` counted besides its boxes, all done
 */
function countsOf(type: string, boxes: Box[], folds: boolean, learned: number = 0): HTMLElement {
    const line: HTMLElement = elementOf("div", "course-counts", "");
    const counts: HTMLElement = folds ? foldOf(type) : elementOf("span", "series-summary course-still", "");
    const states: [number, IconNode, string][] = [
        [boxes.filter((box: Box): boolean => box.state === "done").length + learned, Check, "done"],
        [
            boxes.filter((box: Box): boolean => box.state === "dropped" || box.state === "university" || overIs(box))
                .length,
            X,
            "skipped or cancelled",
        ],
        [boxes.filter((box: Box): boolean => box.pushed.length > 0).length, ArrowRight, "pushed"],
    ];
    counts.append(
        tallyOf(boxes.length + learned, Calendar, boxes.length + learned === 1 ? "entry" : "entries"),
        ...states.map(([count, icon, words]: [number, IconNode, string]): HTMLElement => {
            const part: HTMLElement = tallyOf(count, icon, words);
            part.classList.add("entry-parted");
            return part;
        }),
    );
    if (folds) counts.append(iconOf(opened.has(type) ? ChevronUp : ChevronDown));
    line.append(counts);
    return line;
}

/**
 * Line of counts and list of the boxes of a card, folded by the one rule.
 *
 * @param boxes - The earliest first
 */
function listOf(type: string, boxes: Box[]): [HTMLElement, HTMLElement] {
    const today: string = calendarTodayOf();
    const past: Box[] = boxes.filter((box: Box): boolean => box.day < today);
    const coming: Box[] = boxes.filter((box: Box): boolean => box.day >= today);
    const next: Box | undefined = coming.find((box: Box): boolean => box.state === "open");
    const cut: number = next === undefined ? shownAhead : coming.indexOf(next) + shownAhead;
    const folded: Box[] = [
        ...past.filter((box: Box): boolean => box.state === "open" && box.type === "FA"),
        ...coming.slice(0, cut),
    ];
    const list: HTMLElement = elementOf("div", type === "FA" ? "course-list series-kinds" : "course-list", "");
    list.classList.toggle("course-open", opened.has(type));
    list.append(
        monthListOf(
            (opened.has(type) ? boxes : folded).map((box: Box): [string, HTMLElement] => [
                box.time || box.day,
                boxRowOf(box),
            ]),
        ),
    );
    if (!opened.has(type) && folded.length === 0 && boxes.length > 0)
        list.append(
            foldedOf(
                type,
                boxes.length,
                boxes.every((box: Box): boolean => box.state === "done"),
            ),
        );
    return [countsOf(type, boxes, folded.length < boxes.length), list];
}

/**
 * One line of a card whose rows all fold, so it never looks empty.
 *
 * @param type - Empty for `Learning`
 */
function foldedOf(type: string, count: number, done: boolean): HTMLButtonElement {
    const line: HTMLButtonElement = foldOf(type);
    line.classList.add("course-folded");
    line.append(iconOf(ChevronDown), `${count} ${done ? "done" : "folded"}`);
    return line;
}

/** Row of a session logged without a box, no button, since a log entry opens in the day. */
function learnedRowOf(learned: Learned, number: number): HTMLElement {
    const done: HTMLElement = document.createElement("span");
    done.className = "box-state";
    iconPut(done, Check, "Logged");
    return listRowOf({
        number: numberOf(String(number), null, learned.note),
        day: learned.day,
        open: null,
        group: null,
        meta: [
            [rowTimesOf(learned.time, learned.minutes)],
            whereLinkedOf(
                skillName,
                "",
                roomOf(learned.location),
                learned.locationLink,
                learned.online,
                learned.onlineLink,
            ),
        ],
        people: learned.attendees,
        persons: persons,
        mark: "",
        end: done,
        faded: true,
    });
}

/** Counts and list of `Learning`, boxes without type and sessions without a box by date. */
function learningListOf(): [HTMLElement, HTMLElement] {
    const boxes: Box[] = (shown?.boxes ?? []).filter((box: Box): boolean => box.type === "");
    const learned: Learned[] = shown?.learned ?? [];
    const items: [string, boolean, (number: number) => HTMLElement][] = [
        ...boxes.map((box: Box): [string, boolean, (number: number) => HTMLElement] => [
            box.time || box.day,
            box.state === "open",
            (number: number): HTMLElement => boxRowOf(box, String(number)),
        ]),
        ...learned.map((session: Learned): [string, boolean, (number: number) => HTMLElement] => [
            session.time,
            false,
            (number: number): HTMLElement => learnedRowOf(session, number),
        ]),
    ].sort(
        (
            first: [string, boolean, (number: number) => HTMLElement],
            second: [string, boolean, (number: number) => HTMLElement],
        ): number => first[0].localeCompare(second[0]),
    );
    const today: string = calendarTodayOf();
    const coming: number = items.findIndex(
        ([moment]: [string, boolean, (number: number) => HTMLElement]): boolean => moment.slice(0, 10) >= today,
    );
    const next: number = items.findIndex(
        ([moment, open]: [string, boolean, (number: number) => HTMLElement]): boolean =>
            open && moment.slice(0, 10) >= today,
    );
    const shownTo: number = next !== -1 ? next + shownAhead : coming === -1 ? items.length : coming + shownAhead;
    const folded: number[] = items
        .map((_: [string, boolean, (number: number) => HTMLElement], index: number): number => index)
        .filter((index: number): boolean => items[index][0].slice(0, 10) >= today && index < shownTo);
    const list: HTMLElement = elementOf("div", "course-list", "");
    list.classList.toggle("course-open", opened.has(""));
    list.append(
        monthListOf(
            (opened.has("")
                ? items.map((_: [string, boolean, (number: number) => HTMLElement], index: number): number => index)
                : folded
            ).map((index: number): [string, HTMLElement] => [items[index][0], items[index][2](index + 1)]),
        ),
    );
    if (!opened.has("") && folded.length === 0 && items.length > 0)
        list.append(
            foldedOf(
                "",
                items.length,
                items.every(([, open]: [string, boolean, (number: number) => HTMLElement]): boolean => !open),
            ),
        );
    return [countsOf("", boxes, folded.length < items.length, learned.length), list];
}

/** Opens my learning of the module as a series, that of its planned boxes or a new one. */
function learningShow(): void {
    const series: Box | undefined = (shown?.boxes ?? []).find((box: Box): boolean => box.type === "" && box.series);
    dialogShow()
        .then((): Promise<void> =>
            learningOpen(
                module.split("_")[0],
                shown?.semester ?? "",
                series === undefined ? "" : series.id.split("#")[0],
            ),
        )
        .catch((error: unknown): void => console.error(error));
}

/**
 * Heading of a card with its pencil, for a type with groups the pinned group at its right.
 *
 * @param type - Empty for my own learning
 */
function headOf(type: string, series: Series | undefined): HTMLElement {
    const head: HTMLElement = elementOf("div", "course-head", "");
    const title: HTMLElement = elementOf("div", "course-title", "");
    title.append(
        elementOf("h3", "overview-chapter", type === "" ? "Learning" : `${typeNames.get(type) ?? type} (${type})`),
    );
    head.append(title);
    if (shown !== null && groupsOf(type).length > 0) head.append(pinnedMenuOf(shown, type, groupPick));
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, "Change the series");
    pencil.addEventListener("click", (): void => (type === "" ? learningShow() : seriesShow(type)));
    title.append(pencil);
    return head;
}

/** Link to the material folder of a type, greyed until the first box of its type makes it. */
function folderLinkOf(folder: MaterialFolder): HTMLElement {
    const link: HTMLElement = document.createElement(folder.exists ? "a" : "span");
    link.className = folder.exists ? "course-folder" : "course-folder course-folder-none";
    link.textContent = `…/${folder.path}`;
    if (link instanceof HTMLAnchorElement) link.href = folderAddressOf(`${module}/${folder.path}`);
    else link.title = "Not there yet";
    return link;
}

function cardOf(type: string): HTMLElement {
    const boxes: Box[] = (shown?.boxes ?? []).filter((box: Box): boolean => box.type === type);
    const series: Series | undefined = shown?.series.find((one: Series): boolean => one.rule.type === type);
    const card: HTMLElement = elementOf("section", "overview-group course-card", "");
    const folder: MaterialFolder | undefined = shown?.folders[type];
    const [counts, list]: [HTMLElement, HTMLElement] = listOf(type, boxes);
    card.dataset.type = type;
    card.append(
        headOf(type, series),
        ...(folder === undefined ? [] : [folderLinkOf(folder)]),
        ...(boxes.length === 0 ? [] : [counts]),
        ...(list.childElementCount === 0 ? [] : [list]),
    );
    return card;
}

/** The card `Learning`, the module folder below its heading. */
function learningCardOf(): HTMLElement {
    const card: HTMLElement = elementOf("section", "overview-group course-card", "");
    const folder: HTMLAnchorElement = document.createElement("a");
    const [counts, list]: [HTMLElement, HTMLElement] = learningListOf();
    const some: boolean =
        (shown?.learned.length ?? 0) > 0 || (shown?.boxes ?? []).some((box: Box): boolean => box.type === "");
    folder.className = "course-folder";
    folder.href = folderAddressOf(module);
    folder.textContent = `${modulesFolder}/${module}`;
    card.dataset.type = "";
    card.append(
        headOf("", undefined),
        folder,
        ...(some ? [counts] : []),
        ...(list.childElementCount === 0 ? [] : [list]),
    );
    return card;
}

function cardsShow(): void {
    if (place === null || shown === null) return;
    const course: Course = shown;
    const types: string[] = [...typeNames.keys()].filter(
        (type: string): boolean =>
            alwaysTypes.includes(type) ||
            course.boxes.some((box: Box): boolean => box.type === type) ||
            groupsOf(type).length > 0 ||
            course.folders[type]?.exists === true,
    );
    place.replaceChildren(learningCardOf(), ...types.map(cardOf));
}

/**
 * Shows the course of a module, loading it anew as a file changes or an entry dialog closes.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function courseShow(element: HTMLElement, folder: string): Promise<void> {
    place = element;
    module = folder;
    changesFollow((): void => {
        courseLoad().catch((error: unknown): void => console.error(error));
    });
    await courseLoad();
}
