/**
 * ## Course
 *
 * The course of a module on its page, above its chapters, see `./overview.ts`,
 * as the reader reads it in the semester of today, see `reader/course.ts`:
 * on top the card `Learning`, my own learning of the module,
 * its skill entries without type,
 * planned or logged, numbered by date, its pencil opening it as a series,
 * see {@link learningCardOf};
 * then one card per type, in the order {@link typeNames}, a thin line between two cards,
 * always one of each numbered type and of the exams,
 * see {@link alwaysTypes}, also while it has nothing yet, so everything starts there,
 * and of any other type while it has boxes, groups or a folder of its material.
 * Then a thin line, and below it my own learning, the chapters.
 *
 * A card is the numbered list of its boxes,
 * the rows of the list `Entries` of the dialog of a series, built by the same code,
 * see `listRowOf` in `../day/rows.ts`, by month as there,
 * each row the same unit as a box of the plan, see `../day/boxes.ts`.
 * An open box whose day is over counts as skipped, its box still logging it.
 * A box no longer open is greyed as in the plan,
 * and so is a box not done whose day is over,
 * which stays in sight; an exam never, since every exam matters.
 * Above the rows one calm line counts the boxes by icons, as the dialog of a series;
 * one rule folds every card alike, the exams and `Learning` too:
 * of the days over only the open exams show,
 * and from today on the next open box and two more, the rest folding.
 * A click on the counts opens and closes all of them, the rest going on in place,
 * so what stands above what I click never moves.
 *
 * The heading of a card names its type whole, right after it the one pencil,
 * which opens the dialog of the series, see {@link seriesShow},
 * also of a card with nothing yet, a new series of its type;
 * no times and no room, since its rows show them.
 * Below the heading the folder of the material of the type of the semester,
 * see {@link folderLinkOf}; showing the page makes nothing.
 * The card of the tutorials of a module with groups names the group pinned at the right
 * of its heading, see `../day/groups.ts`.
 * A pick shows at once and the reader confirms it, see {@link groupPick}.
 * Logging a tutorial moves no other week.
 *
 * The pencil opens the same dialog of a series a box opens from the day,
 * see `../day/series.ts`, so a series changes here as there.
 * The course loads anew as its files change.
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

/**
 * The types of the cards by their codes, in the order of the cards, the exams last,
 * each with its name whole, as the heading of its card writes it.
 */
const typeNames: Map<string, string> = new Map([
    ["VO", "Vorlesung"],
    ["UE", "Übung"],
    ["ZU", "Zentralübung"],
    ["TU", "Tutorübung"],
    ["HU", "Hausaufgabe"],
    ["PR", "Praktikum"],
    ["FA", "Prüfung"],
]);

/**
 * The types every module has a card of, also while it has nothing of it yet:
 * the numbered types and the exams.
 */
const alwaysTypes: string[] = [...numberedTypes, "FA"];

/**
 * Rows of a card that show after the next open box, itself included.
 */
const shownAhead: number = 3;

/**
 * The course as loaded last, `null` before.
 */
let shown: Course | null = null;

/**
 * The people of `Persons.md` as loaded with the course, see {@link courseLoad}.
 */
let persons: Person[] = [];

/**
 * Where the cards stand, `null` before the page of a module shows.
 */
let place: HTMLElement | null = null;

/**
 * Name of the folder of the module shown.
 */
let module: string = "";

/**
 * Types of the cards whose folded rows show.
 */
const opened: Set<string> = new Set();

/**
 * Whether the course loads anew once the dialog of an entry closes,
 * see {@link dialogShow}.
 */
let dialogFollowed: boolean = false;

/**
 * Gives the groups of a type of the course shown.
 */
function groupsOf(type: string): Group[] {
    return (shown?.groups ?? []).filter((group: Group): boolean => group.rule.type === type);
}

/**
 * Loads the course of the module shown with the people of `Persons.md` and shows it.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function courseLoad(): Promise<void> {
    [shown, persons] = await Promise.all([
        readerAsk<Course>(`/api/course/module?module=${encodeURIComponent(module)}&semester=`),
        personsKept(),
    ]);
    cardsShow();
}

/**
 * Opens the dialog of a series of the course shown, the same as from the day,
 * the day view's dialogs put into the page first, see {@link dialogShow}.
 *
 * @param type - Type of the series, `FA` for the exams, empty for a new one
 */
function seriesShow(type: string): void {
    dialogShow()
        .then((): Promise<void> => seriesOpen(module, type, shown?.semester ?? ""))
        .catch((error: unknown): void => console.error(error));
}

/**
 * Sends a change of the course to the reader and then loads the course anew,
 * also when the reader does not take it, which the console says, so a pick shown at once,
 * see {@link groupPick}, goes back.
 */
function act(send: () => Promise<unknown>): void {
    send()
        .catch((error: unknown): void => console.error(error))
        .then((): Promise<void> => courseLoad())
        .catch((error: unknown): void => console.error(error));
}

/**
 * Gives the dialog of an entry, the first time also loading the course anew
 * whenever it closes, saved or not, as the plan does.
 */
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
 * Opens a box tapped as the day view does, see `boxClick` in `../day/boxes.ts`.
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

/**
 * Makes the actions of an open box as the plan does,
 * see `boxActionsOf` in `../day/actions.ts`,
 * no `Series`, which the pencil of its card opens.
 */
function actionsOf(box: Box): HTMLElement {
    const log: () => Promise<void> = async (): Promise<void> => {
        const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
        await boxLog(box.id, start, end);
    };
    return boxActionsOf(box, (): void => act(log), act, true);
}

/**
 * Makes the state of a box no longer open in the place of its actions,
 * as the plan shows it, see `stateOf` in `../day/boxes.ts`;
 * a click on it takes that back, for a box that can be changed.
 */
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

/**
 * Tells whether an open box counts as skipped: its day over, but an exam's,
 * which stays open, as every exam matters;
 * nothing written, its box still logging it.
 */
function overIs(box: Box): boolean {
    return box.state === "open" && box.type !== "FA" && box.day < calendarTodayOf();
}

/**
 * Shows a pick of a group at once, then sends it to the reader,
 * which confirms it as the course loads anew, see {@link act}.
 */
function groupPick(change: () => void, send: () => Promise<unknown>): void {
    change();
    shown?.boxes.sort((first: Box, second: Box): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
    cardsShow();
    act(send);
}

/**
 * Makes the row of a box with the one row of a box of every list,
 * see `listRowOf` in `../day/rows.ts`, so it stands as a box of the list of a series;
 * greyed while not open, and so is a box not done whose day is over, but
 * an exam, which stays light.
 *
 * @param number - Its number;
 *   its `X-NUMBER` when left out, of an exam without kind `–`,
 *   of the card `Learning` its place by date
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

/**
 * Makes the counts of a card a button that opens or closes its folded rows.
 */
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
 * Makes the line of counts of a card,
 * as the line of the boxes in the dialog of a series,
 * see `summaryOf` in `../day/series.ts`,
 * a button with a chevron while some rows fold, see {@link foldOf}.
 *
 * @param type - The type, empty for the card `Learning`
 * @param learned - How many sessions of the card `Learning` it counts besides its boxes,
 *   all done; none when left out
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
 * Makes the line of counts of a card and the list of its boxes by month,
 * folded by the one rule of every card, see the top of this file,
 * going on in place, so nothing above what I click moves.
 *
 * @param boxes - Its boxes, the earliest first
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
 * Makes the one line of a card whose rows all fold, so it never looks empty,
 * a click opening them as the counts do, see {@link foldOf}.
 *
 * @param type - The type of the card, empty for `Learning`
 */
function foldedOf(type: string, count: number, done: boolean): HTMLButtonElement {
    const line: HTMLButtonElement = foldOf(type);
    line.classList.add("course-folded");
    line.append(iconOf(ChevronDown), `${count} ${done ? "done" : "folded"}`);
    return line;
}

/**
 * Makes the row of a session of my own learning logged without a box,
 * as the row of a box done, see {@link boxRowOf}, no button,
 * since a log entry opens in the day.
 */
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

/**
 * Makes the line of counts and the list of the card `Learning`:
 * its boxes without type and the sessions logged without a box,
 * together by date, numbered by date from 1 on,
 * folded by the one rule of every card, see {@link listOf}.
 */
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

/**
 * Opens the dialog of my own learning of the module as a series,
 * see `learningOpen` in `../day/series.ts`:
 * the series its planned boxes belong to while they belong to one, else a new one.
 */
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
 * Makes the heading of a card with its pencil, which opens the form of the series,
 * also for a type with groups but no series yet, whose row `Group` makes its groups;
 * for a type with groups the menu of the group pinned at its right.
 *
 * @param type - The type, empty for my own learning
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

/**
 * Makes the folder of the material of a type of the semester
 * below the heading of its card,
 * a link that opens the folder in the scripts view, see `./folder.ts`;
 * one not there yet greyed and no link,
 * until the first box of its type makes it, see `writtenFollow` in `reader/calendar.ts`.
 */
function folderLinkOf(folder: MaterialFolder): HTMLElement {
    const link: HTMLElement = document.createElement(folder.exists ? "a" : "span");
    link.className = folder.exists ? "course-folder" : "course-folder course-folder-none";
    link.textContent = `…/${folder.path}`;
    if (link instanceof HTMLAnchorElement) link.href = folderAddressOf(`${module}/${folder.path}`);
    else link.title = "Not there yet";
    return link;
}

/**
 * Makes the card of a type: its heading, the folder of its material,
 * then while it has boxes its line of counts and the list of its boxes.
 */
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

/**
 * Makes the card `Learning` of my own learning of the module, on top of the others,
 * the module folder below its heading.
 */
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

/**
 * Shows the course of the module as loaded last: the card `Learning`, then its cards.
 */
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
 * Shows the course of a module in its place on its page and loads it anew
 * the moment a file of my new system changes, see `../changes.ts`,
 * or the dialog of an entry closes.
 *
 * @param element - Where the cards go, see `.overview-course` in `./editor.html`
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
