/**
 * ## Course
 *
 * The course of a module on its page, above its chapters, see `./overview.ts`,
 * as the reader reads it in the semester of today, see `reader/course.ts`:
 * on top the card `Learning`, my own learning of the module, its skill entries without type,
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
 * each month at the left beside its first row, see `monthListOf` in `../day/series.ts`:
 * the rows one below the other, every row on the same columns, folded or not,
 * each row the same unit as a box of the plan, see `../day/boxes.ts`:
 * its number in a small grey box,
 * like `2`, `–` for one the university cancelled,
 * of an exam its kind in its place, its `X-NUMBER` too,
 * like `Endterm`, the one button that opens the box;
 * its weekday and date, which name its month and year, like `29.10.2026 (Thu)`,
 * then grey its group while it has one,
 * like `05`, first on its grey line,
 * the menu of the groups of its date while it may still go to another, as in the dialog of the box,
 * see `boxGroupOf` in `../day/groups.ts`;
 * right of them grey two lines, one below the other: its times,
 * like `10:00 – 12:00`, without times its length, like `01h 00m`, its place, like `5610.01.011`,
 * which opens its link, its chapters, like `01_RegressionAnalysis`,
 * and right below all the people I am with, each a link to its row in `Persons.md`,
 * see `../persons.ts`, cut by `…` where it is too long, on a phone going on over the next line;
 * and at its right edge, beside both lines,
 * the actions of an open box as small icon buttons in one row, on a phone below the row,
 * the same as in the plan, see `../day/actions.ts`;
 * an open box whose day is over counts as skipped, its box still logging it;
 * a box no longer open, or skipped so, shows in that place the icon of its state, as in the plan,
 * which takes it back with one click:
 * the check of a box logged, the cross of one I skipped,
 * the calendar crossed out of one the university cancelled.
 * A box no longer open is greyed as in the plan, and so is a box not done whose day is over,
 * which stays in sight; an exam never, since every exam matters.
 * Above the rows one calm line counts the boxes by icons,
 * as the dialog of a series, each also at none,
 * like the calendar and `12`, the check and `0`, the cross and `0`, the arrow and `1`:
 * all of them, those done, those skipped or cancelled, and those pushed;
 * one rule folds every card alike, the exams and `Learning` too:
 * of the days over only the open exams show,
 * and from today on the next open box and two more, the rest folding.
 * While some rows fold, a small chevron follows
 * the counts, down while folded, up while open,
 * and a click on the counts opens and closes all of them, the rest going on in place,
 * so what stands above what I click never moves.
 * A tap on the number of a row opens its box as the day view does, in the day view's own dialog,
 * see `./dialog.ts`; the card loads anew once it closes.
 *
 * The heading of a card names its type whole, its code in round brackets, like `Vorlesung (VO)`,
 * see {@link typeNames}, right after it the one pencil, which opens the dialog of the series,
 * see {@link seriesShow}, also of a card with nothing yet, a new series of its type,
 * its row `Group` empty for my own series and typed for a group of the university,
 * for the exams their dates, which it adds to, see `examRuleOf` in `../day/series.ts`;
 * no times and no room,
 * since its rows show them.
 * Below the heading, small and grey, the folder of the material of the type of the semester,
 * like `…/VO_UniversityLectureLessons/TUM_2026W`,
 * `…/` before it since it is no whole path from `NomWorkspace` on, as the reader names it,
 * see `semesterFoldersRead` in `reader/notes.ts`: a link that opens the folder in the scripts view,
 * see `./folder.ts`; one not there yet greyed, no link, until the first box of its type makes it,
 * see {@link folderLinkOf}; showing the page makes nothing.
 * The card of the tutorials of a module with groups names the group pinned at the right
 * of its heading, the pin before it,
 * like `Group 06`, `No group yet` while none is, a button of the menu of the groups,
 * see `../day/groups.ts`, which holds every group of the type,
 * a pick pinning the group for the weeks to come;
 * each box names its group grey after its day,
 * like `01`, the menu of the groups of its week where it may still go to another,
 * a pick moving only that week's box, as in the dialog of the box.
 * A pick shows at once and the reader confirms it, see {@link groupPick}.
 * Logging a tutorial moves no other week.
 *
 * The pencil of a card opens the day view's dialog of a series, see `../day/series.ts`,
 * the same one a box of the series opens from the day, so a series changes here as there,
 * and so do the groups of the tutorials, made and changed by its row `Group`;
 * the course loads anew as its files change.
 * Phones show no course, since they show only the day.
 *
 * - `./dialog.ts`: The day view's dialogs of an entry,
 *   which opens a box tapped and logs one, and of a series.
 * - `../day/entries.ts`: Logs a box, takes it back, pushes it and puts it back,
 *   cancels and skips it, as the plan does.
 * - `../day/places.ts`: Gives the place of a box with its link.
 * - `../persons.ts`: Gives the people of `Persons.md`.
 * - `../day/rows.ts`: Makes the row of a box, its number and its times,
 *   as every list of boxes has them.
 * - `../day/series.ts`: Opens the dialog of a series, names the numbered types, writes a room,
 *   and counts boxes by an icon.
 * - `../day/groups.ts`: Makes the menu of the group pinned of a heading,
 *   and the group of a box with its menu.
 * - `../day/times.ts`: Gives the times a box is logged at, and writes how near a day is.
 * - `../today.ts`: Gives today's calendar date.
 * - `../food/foods.ts`: Makes elements.
 * - `../icons.ts`: Makes the chevrons of the counts, puts the icons into the buttons,
 *   and the plus that adds a series.
 * - `../day/actions.ts`: Makes the actions of an open box.
 * - `../notes/tree.ts`: Gives the address of a folder in the scripts view.
 * - `../changes.ts`: Loads the course anew the moment a file of my new system changes.
 * - `../reader.ts`: Asks the reader, also to make a folder.
 * - `lucide`: The icons of the actions and states of a box, of the counts,
 *   of the pencil and the chevrons of the counts.
 * - `../day/boxes.css`, `../day/log.css`, `../day/day.css`, `../day/choices.css`,
 *   `../day/series.css`: Look of the states of a box, of a place with its link,
 *   of the rows of a dialog, of the pickers of the dialog of a series
 *   and of its rows, as in the day.
 * - `./course.css`: Look of the course.
 */

import { dialogOf } from "./dialog.ts";
import { boxDrop, boxLog, boxSubmit, boxUndo, boxUniversity } from "../day/entries.ts";
import { boxActionsOf } from "../day/actions.ts";
import { whereLinkedOf } from "../day/places.ts";
import { personsKept } from "../persons.ts";
import { listRowOf, numberOf, rowTimesOf } from "../day/rows.ts";
import {
    learningOpen,
    monthListOf,
    numberedTypes,
    roomOf,
    seriesOpen,
    tallyOf,
} from "../day/series.ts";
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
import {
    ArrowRight,
    Calendar,
    CalendarOff,
    Check,
    ChevronDown,
    ChevronUp,
    Pencil,
    X,
} from "lucide";
import "../day/boxes.css";
import "../day/log.css";
import "../day/day.css";
import "../day/choices.css";
import "../day/series.css";
import "./course.css";

import type { Dialog } from "./dialog.ts";
import type { Box } from "../day/boxes.ts";
import type { Course, Group, Learned, MaterialFolder, Series } from "../day/series.ts";
import type { Person } from "../persons.ts";
import type { IconNode } from "lucide";

/**
 * The types of the cards by their codes, in the order of the cards:
 * lectures, exercises, central exercises, tutorials, homework, a practical course,
 * and the exams last; each with its name whole, as the heading of its card writes it.
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
 * The types every module has a card of, also while it has nothing of it yet,
 * see the top of this file: the numbered types,
 * see `numberedTypes` in `../day/series.ts`, and the exams.
 */
const alwaysTypes: string[] = [...numberedTypes, "FA"];

/**
 * Rows of a card that show after the next open box, itself included, before the rest folds.
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
 * Name of the folder of the module shown, like `IN2028_BusinessAnalyticsMachineLearning`.
 */
let module: string = "";

/**
 * Cards whose folded rows show, opened by a click on their counts, by their types, like `VO`.
 */
const opened: Set<string> = new Set();

/**
 * Whether the course loads anew once the dialog of an entry closes, see {@link dialogShow}.
 */
let dialogFollowed: boolean = false;

/**
 * Gives the groups of a type of the course shown.
 *
 * @param type - Type, like `TU`
 * @returns Its groups, by group
 */
function groupsOf(type: string): Group[] {
    return (shown?.groups ?? []).filter((group: Group): boolean => group.rule.type === type);
}

/**
 * Loads the course of the module shown from the reader in the semester of today,
 * with the people of `Persons.md`, see `personsKept` in `../persons.ts`,
 * and shows it, see {@link cardsShow}.
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
 * see `seriesOpen` in `../day/series.ts`,
 * the day view's dialogs put into the page first, see {@link dialogShow}.
 *
 * @param type - Type of the series, like `VO`, `FA` for the exams, empty for a new one
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
 *
 * @param send - Sends the change
 */
function act(send: () => Promise<unknown>): void {
    send()
        .catch((error: unknown): void => console.error(error))
        .then((): Promise<void> => courseLoad())
        .catch((error: unknown): void => console.error(error));
}

/**
 * Gives the dialog of an entry,
 * see `./dialog.ts`, the first time also loading the course anew whenever it closes,
 * saved or not, as the plan does.
 * - `dialog`: The dialog.
 *
 * @returns The dialog
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
 * Opens a box tapped as the day view does, see `boxClick` in `../day/boxes.ts`:
 * a box that can be changed in the dialog to change it,
 * an open one that cannot in the dialog of the log, at the times it is logged at.
 * - `dialog`: The dialog.
 * - `start`, `end`: The times it is logged at.
 *
 * @param box - The box
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
 * Makes the actions of an open box as the plan does, see `boxActionsOf` in `../day/actions.ts`:
 * `Log` logs it as expected, every action sends its change and then loads the course anew,
 * see {@link act}; no `Series`, which the pencil of its card opens.
 * - `log`: Logs the box as expected, at its times, see `boxTimesOf` in `../day/times.ts`.
 *
 * @param box - The box, open
 * @returns Its actions
 */
function actionsOf(box: Box): HTMLElement {
    const log: () => Promise<void> = async (): Promise<void> => {
        const [start, end]: [Date, Date] = boxTimesOf(box, new Date(`${box.day}T12:00:00`));
        await boxLog((await dialogShow()).calendar, box.id, start, end);
    };
    return boxActionsOf(box, (): void => act(log), act, true);
}

/**
 * Makes the state of a box no longer open in the place of its actions, as the plan shows it,
 * see `stateOf` in `../day/boxes.ts`: the check of a box logged, `Logged`,
 * or ticked submitted, `Submitted`, the cross of one I skipped, `Skipped`,
 * the calendar crossed out of one the university cancelled, `Cancelled`;
 * a click on it takes that back,
 * as there, for a box that can be changed, a logged one always.
 * - `state`: Its icon, its word and how it is taken back, `null` where it cannot be.
 * - `button`: The icon as a button, or alone.
 *
 * @param box - The box, no longer open
 * @returns Its icon
 */
function stateOf(box: Box): HTMLElement {
    const undo: () => Promise<void> = async (): Promise<void> =>
        boxUndo((await dialogShow()).calendar, box.id);
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
            box.editable && box.state === "dropped"
                ? (): Promise<void> => boxDrop(box.id, false)
                : null,
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
 *
 * @param box - The box
 * @returns Whether it counts as skipped
 */
function overIs(box: Box): boolean {
    return box.state === "open" && box.type !== "FA" && box.day < calendarTodayOf();
}

/**
 * Shows a pick of a group at once,
 * see `PickShow` in `../day/groups.ts`, the boxes it moved in their order,
 * then sends it to the reader, which confirms it as the course loads anew, see {@link act}.
 *
 * @param change - Changes the course shown as the pick does
 * @param send - Sends the pick
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
 * Makes the row of a box, see the top of this file, with the one row of a box of every list,
 * see `listRowOf` in `../day/rows.ts`, so it stands as a box of the list of a series:
 * its number, an exam its kind there, like `Endterm`, a button that opens the box,
 * see {@link boxOpen}, its note as tooltip;
 * its day, its group grey, its menu where it may still go to another,
 * see `boxGroupOf` in `../day/groups.ts`, a pick shown at once, see {@link groupPick};
 * its times, without times its length, its place short,
 * see {@link roomOf}, its platform in its place while it does something online, its chapters,
 * its first person; then its actions while open and its day not over,
 * see {@link actionsOf}, else its state,
 * see {@link stateOf}, an open one whose day is over skipped;
 * greyed while not open, and so is a box not done whose day is over, but
 * an exam, which stays light; of an exam without kind `–` where the kind stands.
 * - `over`: Whether it is open and its day over, so skipped, see {@link overIs}.
 *
 * @param box - The box
 * @param number - Its number, like `2`;
 *   its `X-NUMBER` when left out, of an exam without kind `–`,
 *   of the card `Learning` its place by date
 * @returns The row
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
            whereLinkedOf(
                box.category,
                box.from,
                roomOf(box.location),
                box.locationLink,
                box.online,
                box.onlineLink,
            ),
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
 * Makes the counts of a card a button while some of its rows fold,
 * see the top of this file, the card showing anew:
 * a click opening its folded rows, or closing them while open.
 * - `button`: The button.
 * - `open`: Whether its folded rows show.
 *
 * @param type - The type of the card, like `VO`
 * @returns The button
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
 * Makes the line of counts of a card, see the top of this file,
 * as the line of the boxes in the dialog of a series, see `summaryOf` in `../day/series.ts`:
 * how many boxes it has, by the icon of a calendar,
 * then by the icons of their states how many are done, how many skipped or cancelled,
 * and how many pushed, each also at none, apart by middle dots;
 * while some rows fold a button,
 * see {@link foldOf}, with a chevron after the counts, down while folded, up while open.
 * - `line`: The line.
 * - `counts`: The counts, a button while some rows fold, else a line alone.
 * - `states`: How many are done, how many not,
 *   and how many pushed, each with its icon and its words.
 *
 * @param type - The type, like `TU`, empty for the card `Learning`
 * @param boxes - Its boxes
 * @param folds - Whether some of its rows fold
 * @param learned - How many sessions of the card `Learning` it counts besides its boxes, all done,
 *   see {@link learningListOf}; none when left out
 * @returns The line
 */
function countsOf(type: string, boxes: Box[], folds: boolean, learned: number = 0): HTMLElement {
    const line: HTMLElement = elementOf("div", "course-counts", "");
    const counts: HTMLElement = folds
        ? foldOf(type)
        : elementOf("span", "series-summary course-still", "");
    const states: [number, IconNode, string][] = [
        [boxes.filter((box: Box): boolean => box.state === "done").length + learned, Check, "done"],
        [
            boxes.filter(
                (box: Box): boolean =>
                    box.state === "dropped" || box.state === "university" || overIs(box),
            ).length,
            X,
            "skipped or cancelled",
        ],
        [boxes.filter((box: Box): boolean => box.pushed.length > 0).length, ArrowRight, "pushed"],
    ];
    counts.append(
        tallyOf(
            boxes.length + learned,
            Calendar,
            boxes.length + learned === 1 ? "entry" : "entries",
        ),
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
 * Makes the line of counts of a card and the list of its boxes, see the top of this file: the line,
 * see {@link countsOf}; the list one row per box, see {@link boxRowOf}, by month,
 * see `monthListOf` in `../day/series.ts`, folded by the one rule of every card:
 * of the days over the open exams, the others only while opened;
 * then from today on the next open box and the rows up to two after it, the rest only while opened,
 * going on in place, so nothing above what I click moves.
 * - `today`: Today's calendar date.
 * - `past`, `coming`: The boxes of the days over and those from today on.
 * - `next`: The next open box from today on, `undefined` for none.
 * - `cut`: How many boxes to come show while folded.
 * - `folded`: The boxes that show while folded, the earliest first.
 * - `list`: The list.
 *
 * @param type - The type, like `VO`
 * @param boxes - Its boxes, the earliest first
 * @returns The line of counts and the list
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
    const list: HTMLElement = elementOf(
        "div",
        type === "FA" ? "course-list series-kinds" : "course-list",
        "",
    );
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
 * Makes the one line of a card whose rows all fold, so it never looks empty: a chevron,
 * then how many rows fold and what they are, like `⌄ 1 done`,
 * or `⌄ 3 folded` while they are of several states,
 * a click opening them as the counts do, see {@link foldOf}.
 * - `line`: The line, a button.
 *
 * @param type - The type of the card, like `TU`, empty for `Learning`
 * @param count - How many rows fold
 * @param done - Whether all of them are done
 * @returns The line
 */
function foldedOf(type: string, count: number, done: boolean): HTMLButtonElement {
    const line: HTMLButtonElement = foldOf(type);
    line.classList.add("course-folded");
    line.append(iconOf(ChevronDown), `${count} ${done ? "done" : "folded"}`);
    return line;
}

/**
 * Makes the row of a session of my own learning logged without a box, in the card `Learning`,
 * see {@link learningListOf}:
 * as the row of a box done, see {@link boxRowOf}, its number its place by date, no button,
 * since a log entry opens in the day;
 * its day, its times and its place, its people below them,
 * the check of a session done at its right, greyed.
 * - `done`: The check.
 *
 * @param learned - The session
 * @param number - Its place by date, like `3`
 * @returns The row
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
 * Makes the line of counts and the list of the card `Learning`, see the top of this file:
 * my own learning of the module in the semester, its boxes without type, planned or done,
 * and the sessions logged without a box,
 * see `learned` of `Course` in `../day/series.ts`, together by date, numbered by date from 1 on,
 * as many as there are, like `142`;
 * folded by the one rule of every card, see {@link listOf}: of the days over none,
 * then from today on the next open box and two more, the rest only while opened.
 * - `boxes`: Its boxes without type.
 * - `learned`: The sessions logged without a box.
 * - `items`: Both, each its moment, whether it is open and how it shows by its number.
 * - `today`: Today's calendar date.
 * - `coming`: Index of the first item from today on, -1 for none.
 * - `next`: Index of the next open box from today on, -1 for none.
 * - `shownTo`: Index of the first item from today on that folds.
 * - `folded`: The items that show while folded.
 *
 * @returns The line of counts and the list
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
        ([moment]: [string, boolean, (number: number) => HTMLElement]): boolean =>
            moment.slice(0, 10) >= today,
    );
    const next: number = items.findIndex(
        ([moment, open]: [string, boolean, (number: number) => HTMLElement]): boolean =>
            open && moment.slice(0, 10) >= today,
    );
    const shownTo: number =
        next !== -1 ? next + shownAhead : coming === -1 ? items.length : coming + shownAhead;
    const folded: number[] = items
        .map(
            (_: [string, boolean, (number: number) => HTMLElement], index: number): number => index,
        )
        .filter(
            (index: number): boolean => items[index][0].slice(0, 10) >= today && index < shownTo,
        );
    const list: HTMLElement = elementOf("div", "course-list", "");
    list.classList.toggle("course-open", opened.has(""));
    list.append(
        monthListOf(
            (opened.has("")
                ? items.map(
                      (
                          _: [string, boolean, (number: number) => HTMLElement],
                          index: number,
                      ): number => index,
                  )
                : folded
            ).map((index: number): [string, HTMLElement] => [
                items[index][0],
                items[index][2](index + 1),
            ]),
        ),
    );
    if (!opened.has("") && folded.length === 0 && items.length > 0)
        list.append(
            foldedOf(
                "",
                items.length,
                items.every(
                    ([, open]: [string, boolean, (number: number) => HTMLElement]): boolean =>
                        !open,
                ),
            ),
        );
    return [countsOf("", boxes, folded.length < items.length, learned.length), list];
}

/**
 * Opens the dialog of my own learning of the module as a series,
 * see `learningOpen` in `../day/series.ts`:
 * the series its planned boxes belong to while they belong to one,
 * by the `UID` before `#` of a box of it, else a new one.
 * - `series`: A box without type of a series, `undefined` for none.
 */
function learningShow(): void {
    const series: Box | undefined = (shown?.boxes ?? []).find(
        (box: Box): boolean => box.type === "" && box.series,
    );
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
 * Makes the heading of a card, see the top of this file:
 * its type whole, its code in round brackets, like `Vorlesung (VO)`,
 * see {@link typeNames}, of my own learning just `Learning`, right after it the pencil,
 * which opens the form of the series, also for a type with groups but no series yet,
 * whose row `Group` makes and changes its groups, see `groupRowOf` in `../day/series.ts`;
 * at its right for a type with groups the menu of the group pinned,
 * see `pinnedMenuOf` in `../day/groups.ts`.
 * - `head`: The heading.
 * - `title`: The name of the type with its pencil.
 * - `pencil`: The pencil.
 *
 * @param type - The type, like `VO`, empty for my own learning,
 *   whose pencil opens its series, see {@link learningShow}
 * @param series - Its series, `undefined` for none
 * @returns The heading
 */
function headOf(type: string, series: Series | undefined): HTMLElement {
    const head: HTMLElement = elementOf("div", "course-head", "");
    const title: HTMLElement = elementOf("div", "course-title", "");
    title.append(
        elementOf(
            "h3",
            "overview-chapter",
            type === "" ? "Learning" : `${typeNames.get(type) ?? type} (${type})`,
        ),
    );
    head.append(title);
    if (shown !== null && groupsOf(type).length > 0)
        head.append(pinnedMenuOf(shown, type, groupPick));
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, "Change the series");
    pencil.addEventListener("click", (): void => (type === "" ? learningShow() : seriesShow(type)));
    title.append(pencil);
    return head;
}

/**
 * Makes the folder of the material of a type of the semester below the heading of its card,
 * see the top of this file:
 * its path from the module folder after `…/`,
 * a link in the grey of a link of the page that opens the folder in the scripts view;
 * one not there yet greyed further and no link, `Not there yet` as its tooltip,
 * until the first box of its type makes it, see `writtenFollow` in `reader/calendar.ts`.
 * - `link`: The link, or the path alone.
 *
 * @param folder - The folder, its path from the module folder and whether it is there
 * @returns The link, or the path alone
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
 * Makes the card of a type, see the top of this file: its heading,
 * see {@link headOf}, below it the folder of its material of the semester,
 * see {@link folderLinkOf}, then while it has boxes its line of counts and the list of its boxes,
 * see {@link listOf}, the list only while it shows some.
 * - `boxes`: Its boxes.
 * - `series`: Its series, `undefined` for none.
 * - `card`: The card.
 * - `folder`: The folder of its material of the semester,
 *   `undefined` for a type whose folder has no name.
 * - `counts`, `list`: Its line of counts and its list.
 *
 * @param type - The type, like `VO`
 * @returns The card
 */
function cardOf(type: string): HTMLElement {
    const boxes: Box[] = (shown?.boxes ?? []).filter((box: Box): boolean => box.type === type);
    const series: Series | undefined = shown?.series.find(
        (one: Series): boolean => one.rule.type === type,
    );
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
 * see the top of this file: its heading with its pencil,
 * see {@link headOf}, below it the module folder, its whole path from `NomWorkspace` on,
 * a link that opens it in the scripts view,
 * then while it has sessions its line of counts and the list of them,
 * the list only while it shows some, see {@link learningListOf}.
 * - `card`: The card.
 * - `folder`: The link of the module folder.
 * - `counts`, `list`: Its line of counts and its list.
 * - `some`: Whether it has sessions, planned or logged.
 *
 * @returns The card
 */
function learningCardOf(): HTMLElement {
    const card: HTMLElement = elementOf("section", "overview-group course-card", "");
    const folder: HTMLAnchorElement = document.createElement("a");
    const [counts, list]: [HTMLElement, HTMLElement] = learningListOf();
    const some: boolean =
        (shown?.learned.length ?? 0) > 0 ||
        (shown?.boxes ?? []).some((box: Box): boolean => box.type === "");
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
 * Shows the course of the module as loaded last, see the top of this file:
 * the card `Learning`, then its cards.
 * - `types`: The types of its cards, in their order: those it always has, see {@link alwaysTypes},
 *   and any other with boxes, groups or a folder of its material.
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
 * Shows the course of a module in its place on its page, see the top of this file,
 * and loads it anew the moment a file of my new system changes, see `../changes.ts`,
 * or the dialog of an entry closes.
 *
 * @param element - Where the cards go, see `.overview-course` in `./editor.html`
 * @param folder - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
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
