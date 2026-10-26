/**
 * ## Choices
 *
 * The dashboard's own picker, in place of the browser's drop-downs,
 * for every field of a dialog that picks:
 * categories, places, summaries, ways to travel, skills, types, chapters, documents,
 * semesters, tasks and efforts.
 * A field is one row of its dialog: its name at the left, then one line showing its value, like
 * `IN2028_BusinessAnalyticsMachineLearning (VO)`, empty without one, no dash and no placeholder;
 * a click anywhere on the row opens its list as a menu of its own over the dialog,
 * right under the line, never covering it, the rows of the dialog staying where they are,
 * see {@link listOf}; only one list is open at a time, and Esc or a click beside it closes it.
 * A list of one value to pick closes as I pick;
 * one of several, like tasks, stays open, its picks lighter rows, never checkboxes,
 * until I close it. A field of several values may also add each value as a row of its own,
 * like the chapters of a skill entry:
 * each pick closes the list and adds a row with a small × to take it back,
 * and opening the list again adds the next one, see {@link addedRowsOf}.
 * A search field at its top,
 * like `Search or add a place`, filters the values as I type, ignoring case and accents:
 * a value matches when each typed word stands somewhere in its name,
 * so `mensa garch` finds `Mensa-Garching`;
 * Enter picks the first match.
 * Each value shows its whole name, its detail grey beside it, like the address of a place;
 * where a list takes new values, the small grey plus with the typed text, like `+ “Zz”`,
 * or with what it makes of it,
 * like `+ New module IN2346_DeepLearning`, stands at its end while no value has that text,
 * and adds it, or first asks for what a new value needs, like the address of a new place;
 * with nothing typed it shows nowhere, so a plus inside a list always names what it adds;
 * a fixed list, like the categories, has none.
 * Values keep their order, like the most used first;
 * a group, like `Due today`, stands above its first value.
 * The parts of a field stand below it, each its name small and grey, then its field,
 * like the address of a place, see {@link partOf}.
 * Picked values are a lighter grey; a click picks a value, a click on a picked one takes it back.
 * The values come from a search function, so a list can later come from the reader, like the foods.
 * A short list that takes no new values, like the types, needs no search field and has none.
 * A value wider than its row goes on below, never cut, a long name broken where its parts meet,
 * see {@link breakableOf}. A value picked that opens what it names,
 * like a person of `Persons.md` in `With`, is a link in the line, see {@link lineValueOf}.
 *
 * - `../icons.ts`: Puts the one plus into a line that adds, or before the typed text it adds,
 *   and the one `×` into the button that takes a value back, and makes the search field of a list.
 * - `../search.ts`: Compares a typed text with the values, as every search of the page does.
 * - `../persons.ts`: Puts the people of a line apart by a middle dot.
 */

import { Star } from "lucide";
import { crossPut, iconOf, plusPut, plusTake, plusTypedPut, searchFieldOf } from "../icons.ts";
import { matchesAll, searchTextOf, wordsOf } from "../search.ts";
import { peopleOf } from "../persons.ts";

/**
 * Marks where a long name may go on over a next line, where it is wider than its room,
 * as on a phone, in the line of a field:
 * after each `_` and between a small and a capital letter, so
 * `IN0004_EinfuehrungRechnerarchitektur (VO)` breaks into `IN0004_Einfuehrung`
 * and `Rechnerarchitektur (VO)` instead of right after `Skill:` and within a word,
 * see `.picker-line` in `choices.css`;
 * the mark is a space of no width, U+200B, which shows nothing.
 *
 * @param text - Text with a long name, like `IN0004_EinfuehrungRechnerarchitektur (VO)`
 * @returns The same text with the marks
 */
export function breakableOf(text: string): string {
    return text.replace(/_/g, "_\u200b").replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1\u200b$2");
}

/**
 * Marks where a path may go on over a next line, where it is wider than its room, as on a phone:
 * after each `/` and where the parts of a name meet, see {@link breakableOf}.
 *
 * @param path - Path from `NomWorkspace` on, like `NomManageplannings/NomMetainformations/Foods.md`
 * @returns The same path with the marks
 */
export function pathBreakableOf(path: string): string {
    return breakableOf(path).replaceAll("/", "/\u200b");
}

/**
 * Writes the name of a file into its line, whole where it fits,
 * else cut in its middle and not at its end, so its ending stays in sight, the `…` right before it,
 * like `IN2028_BusinessAnalyticsMach…_Plan.ics` beside `IN2028_BusinessAnalyticsMach…_Log.ics`;
 * the name whole as its tooltip.
 * Its ending is its last part from its last `_` on, with its extension,
 * where that is the shorter part of the name, like `_Plan.ics`, else its extension alone,
 * like `.md` of `IN2028_BusinessAnalyticsMachineLearning.md`,
 * so the code of the module at its start stays in sight too;
 * a name with neither ends in `…`; a path keeps its last name from its last `/` on instead, like
 * `VO_UniversityLecture…/TUM_2026W`.
 * Its start keeps as many letters as fit, measured in the font of the line, see {@link measurer},
 * once the line shows and again whenever its width changes, like when its folder opens,
 * and once the font of the page has loaded, which changes the room the name takes,
 * as for the name of a meal, see `dishNameOf` in `../food/meals.ts`;
 * while the line does not show, like in a closed folder, it stays as it is.
 * - `slash`, `under`, `dot`:
 *   Where its last `/`, its last `_` and its last `.` stand, `-1` for none.
 * - `cut`: Where its ending starts, its length for no ending.
 * - `room`: Width the line has for the name, when last fitted, `0` while it does not show.
 * - `fit`: Writes the name into that room:
 *   whole, else with a letter less of its start before the `…` each time until it fits.
 * - `start`: Letters of its start kept.
 * - `text`: The name as it shows.
 *
 * @param line - Line of the name, as wide as its room whatever it holds, like a row of the tree
 * @param name - Name of the file, like `IN2028_BusinessAnalyticsMachineLearning_Plan.ics`,
 *   or a path of folders, like `VO_UniversityLectureLessons/TUM_2026W`
 */
export function middleCutPut(line: HTMLElement, name: string): void {
    const slash: number = name.lastIndexOf("/");
    const under: number = name.lastIndexOf("_");
    const dot: number = name.lastIndexOf(".");
    const cut: number =
        slash > 0 ? slash : under > name.length - under ? under : dot > 0 ? dot : name.length;
    let room: number = 0;
    const fit: () => void = (): void => {
        if (room === 0) return;
        const style: CSSStyleDeclaration = getComputedStyle(line);
        measurer.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        let start: number = cut;
        let text: string = name;
        while (measurer.measureText(text).width > room && start > 0) {
            start -= 1;
            text = `${name.slice(0, start)}…${name.slice(cut)}`;
        }
        line.textContent = text;
    };
    line.textContent = name;
    line.title = name;
    new ResizeObserver((entries: ResizeObserverEntry[]): void => {
        const now: number = entries[0]?.contentRect.width ?? room;
        if (now === room) return;
        room = now;
        fit();
    }).observe(line);
    document.fonts.ready.then(fit).catch((error: unknown): void => console.error(error));
}

/**
 * A value to pick.
 *
 * - `value`: Value, like `IN2028/Airline Revenue Interval`.
 * - `text`: Text shown and searched, like `Airline Revenue Interval · due 12.10.2026 (Mon)`.
 * - `group`: Name of its group, like `Due today`, empty for none.
 * - `detail`: Grey detail beside the text in the list,
 *   like the address of a place; left out for none.
 * - `starred`: Whether a small filled star follows its text in the list,
 *   like my default place; none when left out.
 */
export type Choice = {
    value: string;
    text: string;
    group: string;
    detail?: string;
    starred?: boolean;
};

/**
 * How a picker is built.
 *
 * - `search`: Gives the values for a typed text,
 *   all of them for an empty one, see {@link searchOf}.
 * - `picked`: Values picked at first.
 * - `many`: Whether more than one value may be picked.
 * - `adding`: Whether the plus with the typed text at the end of the list adds it as a new value.
 * - `add`: Takes the typed text as a new value before it is picked, like a new place,
 *   which the reader writes, and gives the value to pick, `null` to pick none;
 *   left out, the plus picks the typed text itself.
 * - `newTextOf`: Gives what the plus shows for the typed text,
 *   like `New module IN2346_DeepLearning` for `IN2346 Deep Learning`,
 *   `null` to offer no plus for it; left out, the typed text in quotes, like `“skyr”`.
 * - `pick`: Takes the values picked after each change, in the order they were picked,
 *   or in `order`; for a list of one value once it is closed.
 * - `order`: Puts the values picked of a list of several in the order the line shows
 *   and `pick` takes them, like the order of the list; the order they were picked when left out.
 * - `empty`: What the line shows, grey, while nothing is picked;
 *   nothing when left out, as every field of the entry by category has it.
 * - `noun`: What a value is,
 *   like `place` or `summary`, for the search field, `Search or add a place`, `an` before a vowel,
 *   like `Search or add an exercise`,
 *   and for the tooltip of the plus, `New place`; `value` when left out.
 * - `aside`: Elements beside the line, like the pencil of a place; none when left out.
 * - `below`: Elements below the line and above the list,
 *   like the address of a place; none when left out.
 * - `locked`: Whether the value stays as picked, its line opening no list,
 *   `As planned` as its tooltip,
 *   like the summary of an entry of the log logged from a box of the plan; open when left out.
 * - `plus`: Whether the line shows the one plus in place of `empty` while nothing is picked,
 *   see `plusPut` in `../icons.ts`, `empty` then its tooltip,
 *   like the plus that adds a document to a chapter; words when left out.
 * - `besideName`: Whether the line, while it shows the plus, stands beside the name of its row,
 *   like `Cooked +`, so no plus stands on a line of its own and the value keeps the whole width,
 *   as {@link lineMove} does for a list;
 *   back in its picker once a value shows; false when left out.
 * - `textOf`: Text of a value picked before its list ever opened,
 *   like the name and day of a cooking of its identifier; the value itself when left out.
 * - `people`: Whether the values are people, like those of `With`,
 *   whose names hold a comma, parted in the line by a middle dot, like `Bichler, Martin · Willi`,
 *   see `peopleOf` in `../persons.ts`; parted by `, ` when left out.
 * - `linkOf`: Address a value picked opens from the line,
 *   like the row of a person in `Persons.md`, empty for a value that opens nothing,
 *   see {@link lineValueOf}; every value plain text when left out.
 * - `afterOf`: An element right after a value picked in the line,
 *   like the pencil of a person of `With`, whose click opens no list; nothing when left out.
 */
export type ChoicesSetup = {
    search: (text: string) => Promise<Choice[]>;
    picked: string[];
    many: boolean;
    adding: boolean;
    add?: (text: string) => Promise<string | null>;
    newTextOf?: (text: string) => string | null;
    pick: (values: string[]) => void;
    order?: (values: string[]) => string[];
    empty?: string;
    noun?: string;
    aside?: HTMLElement[];
    below?: HTMLElement[];
    locked?: boolean;
    plus?: boolean;
    besideName?: boolean;
    textOf?: (value: string) => string;
    people?: boolean;
    linkOf?: (value: string) => string;
    afterOf?: (value: string) => HTMLElement;
};

/**
 * How the rows of a field of several values are built,
 * each value picked a row of its own, see {@link addedRowsOf}.
 *
 * - `choices`: Values to offer, in their order; a value picked already stays out of the list.
 * - `picked`: Values picked, in the order they were picked, also those the list does not offer,
 *   like a chapter whose folder has another name now.
 * - `textOf`: Text of a value picked in its row,
 *   like the name of the file of a document of its path.
 * - `grouped`: Whether the search looks at the group of a value too, see {@link groupedSearchOf}.
 * - `noun`: What a value is, like `chapter`, for the search of the list.
 * - `hint`: Shown in place of the line
 *   while there are no values to offer at all, like `No chapters yet`;
 *   left out, the field then has no row of its own,
 *   only the rows of the values picked, the first named by it.
 * - `change`: Takes the values picked after each pick and each value taken back, in their order.
 * - `nested`: Whether the rows stand inside the value above them, like the documents of a chapter:
 *   indented under a thin grey line, without a name at the left, the values picked first,
 *   then the list, whose plus, `Add a document` its tooltip,
 *   the one who builds the value above moves right after it,
 *   see {@link lineMove}; false when left out.
 * - `tagOf`: Grey box after the text of a value picked, like `Round 0` of a section,
 *   empty for none; none when left out.
 */
export type AddedSetup = {
    choices: Choice[];
    picked: string[];
    textOf: (value: string) => string;
    tagOf?: (value: string) => string;
    grouped: boolean;
    noun: string;
    hint?: HTMLElement;
    change: (values: string[]) => void;
    nested?: boolean;
};

/**
 * Most characters the texts of a list may have together to show
 * without a search field, like `Night` and `Day`;
 * a list with more gets one above it.
 */
const searchedLength: number = 60;

/**
 * Measures how wide a text is in the font of a line without showing it, see {@link middleCutPut}:
 * the drawing of a canvas never put into the page,
 * which measures a text exactly as the page writes it.
 */
const measurer: CanvasRenderingContext2D = document
    .createElement("canvas")
    .getContext("2d") as CanvasRenderingContext2D;

/**
 * The picker whose list is open, `null` while none is,
 * so only one list is open at a time, see {@link listOf}.
 */
let openPicker: HTMLElement | null = null;

/**
 * Line of the list that is open, `null` while none is;
 * it may stand outside its picker, like a plus moved beside the name of its field,
 * see {@link lineMove}, and a click on it still counts as one on the picker.
 */
let openLine: HTMLElement | null = null;

/**
 * The list that is open, the menu, `null` while none is.
 */
let openBox: HTMLElement | null = null;

/**
 * Closes the list that is open, `null` while none is.
 */
let openClose: (() => void) | null = null;

/**
 * Whether the lists started for the page, see {@link listsStart},
 * so the router can start the day again.
 */
let listsStarted: boolean = false;

/**
 * Makes a choice that shows its value, without group.
 *
 * @param value - Value, like `Home Munich`
 * @returns Choice
 */
export function choiceOf(value: string): Choice {
    return { value: value, text: value, group: "" };
}

/**
 * Builds the search of a list of my own:
 * the choices whose text holds each word of the typed text, in their order.
 * - `words`: Words of the typed text, as the search compares them.
 *
 * @param choices - Choices, in their order
 * @returns Search for {@link ChoicesSetup}
 */
export function searchOf(choices: Choice[]): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const words: string[] = wordsOf(text);
        return choices.filter((choice: Choice): boolean => matchesAll(choice.text, words));
    };
}

/**
 * Builds the search of a list whose values stand under their groups,
 * like documents under their folders:
 * the choices whose group and text together hold each word of the typed text, in their order,
 * so `vo 2025 04` finds `TUM_2025W/04_LogisticPoissonRegression.pdf`
 * under `VO_UniversityLectureLessons`.
 * - `words`: Words of the typed text, as the search compares them.
 *
 * @param choices - Choices, in their order
 * @returns Search for {@link ChoicesSetup}
 */
export function groupedSearchOf(choices: Choice[]): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const words: string[] = wordsOf(text);
        return choices.filter((choice: Choice): boolean =>
            matchesAll(`${choice.group} ${choice.text}`, words),
        );
    };
}

/**
 * Makes a button of a picker.
 *
 * @param text - Text of the button
 * @param chosen - Whether it shows as picked
 * @param click - What a click does
 * @returns Button
 */
function buttonOf(text: string, chosen: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.classList.toggle("chosen", chosen);
    button.addEventListener("click", click);
    return button;
}

/**
 * Makes the button of a value in a list: its text, its star while it is starred,
 * like my default place, and its detail grey beside it, like the address of a place.
 * - `star`: The star.
 * - `detail`: The grey detail.
 *
 * @param choice - The value
 * @param chosen - Whether it shows as picked
 * @param click - What a click does
 * @returns Button
 */
function valueButtonOf(choice: Choice, chosen: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf(choice.text, chosen, click);
    button.dataset.value = choice.value;
    if (choice.starred === true) {
        const star: HTMLSpanElement = document.createElement("span");
        star.className = "picker-star";
        star.append(iconOf(Star));
        button.append(star);
    }
    if ((choice.detail ?? "") !== "") {
        const detail: HTMLSpanElement = document.createElement("span");
        detail.className = "picker-detail";
        detail.textContent = choice.detail ?? "";
        button.append(detail);
    }
    return button;
}

/**
 * Makes a value picked in the line of its picker, see `linkOf` of {@link ChoicesSetup}:
 * one that opens what it names,
 * like a person its row in `Persons.md`, a link of its own in the line,
 * see `.picker-link` in `choices.css`,
 * which a click follows in this window instead of opening the list;
 * a span, since the line is a button, which holds no real link. Any other value its plain text.
 * - `link`: The value as a link.
 *
 * @param text - Text of the value, like `Bichler, Martin`
 * @param address - Address it opens,
 *   like `/edit?file=NomMetainformations%2FPersons.md&row=Bichler%2C%20Martin`, empty for none
 * @returns The value as the line shows it
 */
function lineValueOf(text: string, address: string): string | HTMLSpanElement {
    if (address === "") return breakableOf(text);
    const link: HTMLSpanElement = document.createElement("span");
    link.className = "picker-link";
    link.textContent = breakableOf(text);
    link.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        location.assign(address);
    });
    return link;
}

/**
 * Makes a list that the line of a field opens and closes as a menu of its own over the dialog,
 * see the top of this file, the same for every list of the dialogs:
 * a popover of the browser, `manual`, so this file alone decides when it closes,
 * which the anchors of CSS place right under the line that opened it,
 * as wide as the values of the row the line stands in, see `.picker-box` in `choices.css`;
 * the line and its row are those anchors while the list is open, `list-line` and `list-field`.
 * It opens on a click on the line, closing the list open before,
 * and closes on another click on the line, on Esc, see {@link listsStart},
 * and on a click beside its picker and its line.
 * - `field`: The row of the dialog the line stands in,
 *   also when moved beside the name of a field, see {@link lineMove};
 *   the picker itself while the line stands in no row.
 * - `close`: Closes the list;
 *   also takes back what an open list whose picker left the page meanwhile still holds,
 *   so the next list opens alone.
 *
 * @param picker - The picker, the line and its list
 * @param line - The line of the field, a button
 * @param box - The list, the menu
 * @param opened - Comes once the list is open, like to focus its search field
 * @param closed - Comes once the list is closed
 * @returns Closes the list, like after a pick
 */
export function listOf(
    picker: HTMLElement,
    line: HTMLButtonElement,
    box: HTMLElement,
    opened: () => void,
    closed: () => void,
): () => void {
    let field: HTMLElement = picker;
    const close: () => void = (): void => {
        const open: boolean = box.matches(":popover-open");
        if (open) box.hidePopover();
        line.classList.remove("list-line");
        field.classList.remove("list-field");
        if (openPicker === picker) {
            openPicker = null;
            openLine = null;
            openBox = null;
            openClose = null;
        }
        if (open) closed();
    };
    line.type = "button";
    box.popover = "manual";
    line.addEventListener("click", (): void => {
        if (box.matches(":popover-open")) {
            close();
            return;
        }
        openClose?.();
        field = line.closest<HTMLElement>(".panel-field") ?? picker;
        line.classList.add("list-line");
        field.classList.add("list-field");
        box.showPopover();
        openPicker = picker;
        openLine = line;
        openBox = box;
        openClose = close;
        opened();
    });
    return close;
}

/**
 * Tells whether a list is open, see {@link listOf}.
 *
 * @param box - The list
 * @returns Whether it shows
 */
export function listOpen(box: HTMLElement): boolean {
    return box.matches(":popover-open");
}

/**
 * Builds a picker, see the top of this file:
 * the line of the field, showing the texts of the values picked,
 * with what stands beside and below it, and its list,
 * which the line opens and closes, see {@link listOf}:
 * the search field, when the list is long or takes new values, above the values found,
 * and the plus with the typed text at the end, where new values are taken,
 * while no value has that text already, nor shows it, case and accents ignored.
 * Values picked but not found, like a place an entry kept, come first while nothing is typed.
 * - `head`: The line with what stands beside it.
 * - `line`: The line of the field, the button that opens the list.
 * - `box`: The list, a menu over the dialog, with its search field.
 * - `field`: The search field of the list, its words naming what it searches,
 *   like `Search or add a place` or `Search a chapter`.
 * - `newButton`: The plus with the typed text at the end of the list, `New place` as its tooltip.
 * - `noun`: What a value is, like `place`.
 * - `chosen`: Values picked so far, in the order they were picked.
 * - `texts`: Text of each value seen, for the line.
 * - `long`: Whether the list is long enough for a search field,
 *   more than {@link searchedLength} characters of all values together, fixed at the start.
 * - `found`: Values found for the typed text.
 * - `close`: Closes the list.
 * - `linePlace`: Puts the line beside the name of its row while it shows the plus, see `besideName`
 *   of {@link ChoicesSetup}, else back at the start of its head;
 *   nothing before the picker stands in a row.
 * - `lineShow`: Shows the texts of the values picked in the line,
 *   each that opens what it names a link, see {@link lineValueOf}, or nothing without them.
 * - `toggle`: Picks a value or takes it back, shows it in the line, and tells the dialog;
 *   a list of one value closes first.
 * - `show`: Shows the values found for the text of the search field,
 *   unless a newer text came meanwhile, and shows the plus with what it adds for the typed text,
 *   see `newTextOf` of {@link ChoicesSetup}, while no value has that text.
 * - `typedPick`: Picks the value Enter or the plus gives,
 *   empties the search and shows all values again, the value picked scrolled into sight,
 *   like a new dish at the end of a long list;
 *   a value picked already, like the place an entry kept, now added to my places, stays picked,
 *   and the dialog is told again.
 * - `typedAdd`: Takes the typed text as a new value, by the plus or by Enter when nothing matches:
 *   picks it, or, with `add`, what `add` gives for it,
 *   and nothing when it gives `null`, the text staying typed.
 *
 * @param setup - How the picker is built
 * @returns Picker
 */
export function choicesOf(setup: ChoicesSetup): HTMLDivElement {
    const picker: HTMLDivElement = document.createElement("div");
    const head: HTMLDivElement = document.createElement("div");
    const line: HTMLButtonElement = document.createElement("button");
    const box: HTMLDivElement = document.createElement("div");
    const input: HTMLInputElement = document.createElement("input");
    const list: HTMLDivElement = document.createElement("div");
    const newButton: HTMLButtonElement = document.createElement("button");
    const noun: string = setup.noun ?? "value";
    const field: HTMLLabelElement = searchFieldOf(
        input,
        `Search ${setup.adding ? "or add " : ""}` +
            `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`,
    );
    let chosen: string[] = [...setup.picked];
    const texts: Map<string, string> = new Map();
    let long: boolean = false;
    let found: Choice[] = [];
    let close: () => void = (): void => {};

    const linePlace: (beside: boolean) => void = (beside: boolean): void => {
        const name: HTMLElement | null =
            picker.closest(".panel-field")?.querySelector(":scope > .entry-name") ?? null;
        if (setup.besideName !== true || name === null) return;
        if (beside) name.append(line);
        else head.prepend(line);
    };
    const lineShow: () => void = (): void => {
        const shown: string[] = chosen.map(
            (value: string): string => texts.get(value) ?? setup.textOf?.(value) ?? value,
        );
        const text: string = shown.join(setup.people === true ? " · " : ", ");
        if (text === "" && setup.plus === true) {
            plusPut(line, setup.empty ?? "");
            line.classList.add("picker-empty");
            linePlace(true);
            return;
        }
        linePlace(false);
        plusTake(line);
        line.textContent = text === "" ? (setup.empty ?? "") : breakableOf(text);
        const values: (string | Node)[] = chosen.map(
            (value: string, index: number): string | Node => {
                const shownValue: string | Node = lineValueOf(
                    shown[index],
                    setup.linkOf?.(value) ?? "",
                );
                if (setup.afterOf === undefined) return shownValue;
                const both: HTMLSpanElement = document.createElement("span");
                both.append(shownValue, setup.afterOf(value));
                return both;
            },
        );
        if (text !== "" && setup.people === true) line.replaceChildren(...peopleOf(values));
        else if (text !== "" && setup.linkOf !== undefined)
            line.replaceChildren(
                ...values.flatMap((value: string | Node, index: number): (string | Node)[] => [
                    ...(index === 0 ? [] : [", "]),
                    value,
                ]),
            );
        line.title = setup.locked ? "As planned" : text;
        line.classList.toggle("picker-empty", text === "");
    };
    const toggle: (value: string) => void = (value: string): void => {
        if (chosen.includes(value))
            chosen = chosen.filter((other: string): boolean => other !== value);
        else
            chosen = setup.many
                ? (setup.order ?? ((values: string[]): string[] => values))([...chosen, value])
                : [value];
        list.querySelectorAll<HTMLButtonElement>("button[data-value]").forEach(
            (button: HTMLButtonElement): void => {
                button.classList.toggle("chosen", chosen.includes(button.dataset.value ?? ""));
            },
        );
        lineShow();
        if (!setup.many) close();
        setup.pick(chosen);
    };
    const show: () => Promise<void> = async (): Promise<void> => {
        const text: string = input.value.trim();
        const choices: Choice[] = await setup.search(text);
        if (input.value.trim() !== text) return;

        choices.forEach((choice: Choice): void => {
            texts.set(choice.value, choice.text);
        });
        const missing: Choice[] =
            text !== ""
                ? []
                : chosen
                      .filter(
                          (value: string): boolean =>
                              !choices.some((choice: Choice): boolean => choice.value === value),
                      )
                      .map(choiceOf);
        found = [...missing, ...choices];
        list.replaceChildren(
            ...found.flatMap((choice: Choice, index: number): HTMLElement[] => {
                const button: HTMLButtonElement = valueButtonOf(
                    choice,
                    chosen.includes(choice.value),
                    (): void => toggle(choice.value),
                );
                if (choice.group === "" || choice.group === found[index - 1]?.group)
                    return [button];
                const group: HTMLParagraphElement = document.createElement("p");
                group.className = "picker-group";
                group.textContent = choice.group;
                return [group, button];
            }),
        );
        const newText: string | null =
            setup.newTextOf === undefined ? `“${text}”` : setup.newTextOf(text);
        newButton.hidden =
            text === "" ||
            newText === null ||
            found.some(
                (choice: Choice): boolean =>
                    searchTextOf(choice.value) === searchTextOf(text) ||
                    searchTextOf(choice.text) === searchTextOf(text),
            );
        plusTypedPut(newButton, newText ?? "");
    };
    const typedPick: (value: string) => void = (value: string): void => {
        input.value = "";
        if (chosen.includes(value)) {
            if (!setup.many) close();
            setup.pick(chosen);
        } else toggle(value);
        show()
            .then((): void => {
                lineShow();
                list.querySelector(`button[data-value="${CSS.escape(value)}"]`)?.scrollIntoView({
                    block: "nearest",
                });
            })
            .catch((error: unknown): void => console.error(error));
    };
    const typedAdd: (text: string) => void = (text: string): void => {
        if (setup.add === undefined) {
            typedPick(text);
            return;
        }
        setup
            .add(text)
            .then((value: string | null): void => {
                if (value !== null) typedPick(value);
            })
            .catch((error: unknown): void => console.error(error));
    };

    picker.className = "picker";
    head.className = "picker-head";
    line.className = "picker-line";
    line.disabled = setup.locked ?? false;
    box.className = "picker-box";
    list.className = "picker-list";
    newButton.type = "button";
    newButton.className = "picker-new";
    newButton.title = `New ${noun}`;
    newButton.hidden = true;
    input.addEventListener("input", (): void => {
        show().catch((error: unknown): void => console.error(error));
    });
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const text: string = input.value.trim();
        const first: Choice | undefined = found[0];
        if (first !== undefined) typedPick(first.value);
        else if (setup.adding && text !== "") typedAdd(text);
    });
    newButton.addEventListener("click", (): void => typedAdd(input.value.trim()));
    close = listOf(
        picker,
        line,
        box,
        (): void => {
            if (box.contains(input)) input.focus();
            list.querySelector(".chosen")?.scrollIntoView({ block: "nearest" });
        },
        (): void => {
            if (input.value !== "") {
                input.value = "";
                show().catch((error: unknown): void => console.error(error));
            }
        },
    );

    setup
        .search("")
        .then((choices: Choice[]): void => {
            long =
                choices.reduce(
                    (length: number, choice: Choice): number => length + choice.text.length,
                    0,
                ) > searchedLength;
            box.replaceChildren(
                ...(long || setup.adding ? [field] : []),
                list,
                ...(setup.adding ? [newButton] : []),
            );
            show()
                .then(lineShow)
                .catch((error: unknown): void => console.error(error));
        })
        .catch((error: unknown): void => console.error(error));
    lineShow();
    head.append(line, ...(setup.aside ?? []));
    picker.append(head, ...(setup.below ?? []), box);
    return picker;
}

/**
 * Puts two pickers side by side in one row,
 * like the skill and the type of a skill entry in its summary, the first wider,
 * the second below it where the row has no room for both, as on a phone;
 * the list of either opens below both, as wide as the row, see `.panel-pair` in `day.css`.
 *
 * @param first - Picker at the left
 * @param second - Picker at the right
 * @returns The two pickers in one line
 */
export function pairOf(first: HTMLElement, second: HTMLElement): HTMLDivElement {
    const pair: HTMLDivElement = document.createElement("div");
    pair.className = "panel-pair";
    pair.append(first, second);
    return pair;
}

/**
 * Makes the row of a value picked of a field of several values,
 * below the row of the field, see {@link addedRowsOf}:
 * its name, mostly none, its text,
 * like `02_LogisticPoissonRegression`, going on below where it is wider than its row,
 * see {@link breakableOf}, a link when it has one,
 * which opens what it names in this window, never a second one, like a chapter in the scripts view,
 * and a small × that takes it back.
 * - `text`: The text in its own element, its whole text in its tooltip.
 * - `opening`: The text as a link, inside the element of the text,
 *   so a plus moved after the text stays outside the link, see {@link lineMove}.
 * - `remove`: The ×.
 *
 * @param name - Name of the row, like `Chapter`, empty for none
 * @param text - Text of the value, like `04_LogisticRegression.pdf`
 * @param remove - Takes the value back
 * @param link - Address the text opens, like `/scripts?path=…`, empty for none
 * @param tag - Grey box after the text, like `Round 0`, see `.round-tag` in `base.css`,
 *   empty for none
 * @returns Row
 */
export function addedRowOf(
    name: string,
    text: string,
    remove: () => void,
    link: string,
    tag: string = "",
): HTMLDivElement {
    const value: HTMLDivElement = document.createElement("div");
    const shown: HTMLSpanElement = document.createElement("span");
    const opening: HTMLAnchorElement = document.createElement("a");
    const button: HTMLButtonElement = document.createElement("button");
    value.className = "picker-added";
    shown.className = "picker-added-text";
    shown.title = text;
    opening.href = link;
    opening.textContent = breakableOf(text);
    shown.append(link === "" ? breakableOf(text) : opening);
    if (tag !== "") shown.append(roundTagOf(tag));
    button.type = "button";
    crossPut(button, `Remove ${text}`);
    button.addEventListener("click", remove);
    value.append(shown, button);
    return rowOf(name, value);
}

/**
 * Makes the grey box of a round, like `Round 0`, see `.round-tag` in `base.css`,
 * as the dialog of a box shows it after a note.
 *
 * @param text - The round, like `Round 0`
 * @returns The box
 */
export function roundTagOf(text: string): HTMLSpanElement {
    const tag: HTMLSpanElement = document.createElement("span");
    tag.className = "round-tag";
    tag.textContent = text;
    return tag;
}

/**
 * Builds the rows of a field of several values, like the documents of a skill entry,
 * as the chapters and the means of a way are built:
 * a row per value picked, the first named by the field, see {@link addedRowOf},
 * then the row of the list, whose plus stands beside the name of the field, see {@link addRowOf};
 * a pick closes the list and adds the value as a row of its own,
 * opening the list again adds the next one.
 * The list offers the values not picked yet, and has no row while every value is picked;
 * while there are none at all, a hint stands in its place,
 * or without hint the field has no row of its own.
 * Nested inside the value above,
 * see `nested` of {@link AddedSetup}, the rows stand indented under a thin grey line,
 * and the plus of the list waits for the one who builds that value to move it right after it,
 * see {@link lineMove}, so a chapter and its documents read as one.
 * - `offered`: Values the list offers.
 * - `nested`: Whether the rows stand inside the value above them.
 * - `added`: The rows of the values picked.
 * - `last`: The row of the list, or of the hint, none without either.
 *
 * @param name - Name of the field, like `Documents`
 * @param setup - How the rows are built
 * @returns One row per value picked, then the row of the list
 */
export function addedRowsOf(name: string, setup: AddedSetup): HTMLDivElement[] {
    const offered: Choice[] = setup.choices.filter(
        (choice: Choice): boolean => !setup.picked.includes(choice.value),
    );
    const nested: boolean = setup.nested ?? false;
    const added: HTMLDivElement[] = setup.picked.map(
        (value: string, index: number): HTMLDivElement =>
            addedRowOf(
                !nested && index === 0 ? name : "",
                setup.textOf(value),
                (): void =>
                    setup.change(setup.picked.filter((other: string): boolean => other !== value)),
                "",
                setup.tagOf?.(value) ?? "",
            ),
    );
    let last: HTMLDivElement[] =
        setup.hint === undefined || setup.choices.length > 0
            ? []
            : [rowOf(nested || added.length > 0 ? "" : name, setup.hint)];
    if (offered.length > 0) {
        const picker: HTMLDivElement = choicesOf({
            search: setup.grouped ? groupedSearchOf(offered) : searchOf(offered),
            picked: [],
            many: false,
            adding: false,
            noun: setup.noun,
            empty: `Add a ${setup.noun}`,
            plus: true,
            pick: (values: string[]): void => {
                if (values.length > 0) setup.change([...setup.picked, values[0]]);
            },
        });
        last = [nested ? rowOf("", picker) : addRowOf(name, added[0], picker)];
    }
    if (!nested) return [...added, ...last];
    const rows: HTMLDivElement[] = [...added, ...last];
    rows.forEach((row: HTMLDivElement): void => row.classList.add("panel-nested"));
    return rows;
}

/**
 * Builds the row of the list that adds the next value of a field of several values,
 * like a chapter or a document, its plus beside the name of the field, see {@link lineMove}:
 * on the row of the first value picked, the row of the list keeping only the list then,
 * or on the row of the list itself while none is picked, named by the field, like `Chapter +`.
 * Its picker is built with a plus as its line, see `plus` of {@link ChoicesSetup}.
 * - `row`: The row of the list.
 * - `place`: The name the plus goes beside.
 *
 * @param name - Name of the field, like `Chapter`
 * @param first - Row of the first value picked, `undefined` while none is
 * @param picker - The picker of the list
 * @returns The row of the list
 */
export function addRowOf(
    name: string,
    first: HTMLElement | undefined,
    picker: HTMLElement,
): HTMLDivElement {
    const row: HTMLDivElement = rowOf(first === undefined ? name : "", picker);
    const place: HTMLElement | null = (first ?? row).querySelector(".entry-name");
    if (place !== null) lineMove(row, place);
    return row;
}

/**
 * Moves the line of the picker of a row, its plus, right after what it adds to,
 * so no plus stands on a line of its own:
 * beside the name of a field, like `Chapter +`, or after a value,
 * like a chapter's plus that adds a document to it;
 * moved out of its row, the row keeps only the list, which takes no room of the dialog,
 * see `.panel-list` in `choices.css`, and opens as a menu right under the plus, see {@link listOf}.
 * - `line`: The line of the picker of the row.
 *
 * @param row - Row with its picker, built with a plus as its line,
 *   see `plus` in {@link ChoicesSetup}
 * @param place - Where the plus goes, like the name of the field or the text of a value
 */
export function lineMove(row: HTMLElement, place: HTMLElement): void {
    const line: HTMLElement | null = row.querySelector(".picker-line");
    if (line === null) return;
    place.append(line);
    if (!row.contains(place)) row.classList.add("panel-list");
}

/**
 * Makes the field of a part of a field, like the address of a place,
 * see `partsOf` in `categories.ts`, or the link of `Online` in the form of a series,
 * see `../editor/course.ts`:
 * a plain field without placeholder, empty until I type or paste into it;
 * a link a field of text like every other part,
 * so every browser shows it as plain as they, never in a colour of its own,
 * only the keyboard of a phone the one of a web address.
 * - `input`: The field.
 *
 * @param keyboard - Keyboard of a phone for the field, `url` for a link, else `text`
 * @param value - What it holds at first, like `Arcisstraße 21`
 * @param name - What it holds, for screen readers, like `Address of the place`
 * @returns The field
 */
export function partFieldOf(keyboard: string, value: string, name: string): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.inputMode = keyboard;
    input.value = value;
    input.autocomplete = "off";
    input.setAttribute("aria-label", name);
    return input;
}

/**
 * Makes a part of a field, like of a place, see {@link partFieldOf}: its name small and grey,
 * then its field; a click on the name puts the focus into the field.
 * - `part`: The part, a label around name and field.
 * - `label`: Its name.
 *
 * @param name - Name of the part, like `Address`
 * @param input - Its field
 * @returns The part
 */
export function partOf(name: string, input: HTMLInputElement): HTMLLabelElement {
    const part: HTMLLabelElement = document.createElement("label");
    const label: HTMLSpanElement = document.createElement("span");
    part.className = "field-part";
    label.className = "entry-name";
    label.textContent = name;
    part.append(label, input);
    return part;
}

/**
 * Makes a row of a dialog: the name of a field before its picker, like `Place`.
 * A click anywhere on the row but on something to click itself, like the pencil of a place,
 * or on a label of a part, like the link of a place,
 * which puts the focus into its own field, opens the list of its first picker, see {@link listOf},
 * or puts the focus into its first field.
 * No `<label>` around the row,
 * which would pass a click on the name to the first button of the picker.
 * - `target`: What was clicked.
 * - `line`: The line of the first picker of the row, `null` for none.
 *
 * @param name - Name of the field
 * @param picker - Picker of the field
 * @returns Row
 */
export function rowOf(name: string, picker: HTMLElement): HTMLDivElement {
    const row: HTMLDivElement = document.createElement("div");
    const label: HTMLSpanElement = document.createElement("span");
    row.className = "panel-field";
    label.className = "entry-name";
    label.textContent = name;
    row.addEventListener("click", (event: MouseEvent): void => {
        const target: HTMLElement = event.target as HTMLElement;
        const line: HTMLButtonElement | null = row.querySelector(".picker-line");
        if (target.closest("button, input, textarea, a, label, .picker-box") !== null) return;
        if (line !== null) line.click();
        else row.querySelector<HTMLInputElement>("input, textarea")?.focus();
    });
    row.append(label, picker);
    return row;
}

/**
 * Shows the file of the entry of a dialog, the box of a plan, the entry of a log,
 * a series or a birthday, at the left of its buttons, small and grey,
 * see `.panel-file` in `day.css`: only its folder and its name after `…/`,
 * since it is no whole path, like `…/Modules/WI1059_FinancialAccounting_Plan.ics`,
 * so it stays on one line beside the buttons, its whole path from `NomWorkspace` on as its title,
 * like `NomManageplannings/NomManagecalendar/Modules/WI1059_FinancialAccounting_Plan.ics`;
 * a link that opens it in the editor of my new system,
 * whose paths start inside `NomManageplannings`,
 * like `/edit?file=NomManagecalendar%2FModules%2FWI1059_FinancialAccounting_Plan.ics`;
 * hidden while the file is not known, like that of a new entry before its category is picked.
 * Where even the name is wider than its room,
 * as on a phone, it goes on below where the parts of the name meet, see {@link pathBreakableOf}.
 *
 * @param link - The link at the left of the buttons
 * @param file - Path of the file from `NomWorkspace` on, empty while not known
 */
export function fileShow(link: HTMLAnchorElement, file: string): void {
    link.textContent = pathBreakableOf(`…/${file.split("/").slice(-2).join("/")}`);
    link.title = file;
    link.href = `/edit?file=${encodeURIComponent(file.replace(/^NomManageplannings\//, ""))}`;
    link.hidden = file === "";
}

/**
 * Starts the lists of the pickers once for the page, however often the day starts:
 * Esc closes the open list and not the dialog around it,
 * and a click beside the picker of the open list closes it, see {@link listOf}.
 * - `keydown`: Comes before the dialog sees Esc, since it listens first;
 *   a list whose picker left the page meanwhile,
 *   like rows shown anew, lets Esc go on to the dialog.
 * - `shown`: Whether the open list still shows.
 * - `click`: Comes before the element clicked sees it,
 *   so the list is closed before another one opens.
 */
export function listsStart(): void {
    if (listsStarted) return;
    listsStarted = true;
    document.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (event.key !== "Escape" || openClose === null) return;
            const shown: boolean = openBox !== null && listOpen(openBox);
            openClose();
            if (!shown) return;
            event.preventDefault();
            event.stopPropagation();
        },
        true,
    );
    document.addEventListener(
        "click",
        (event: MouseEvent): void => {
            if (
                openPicker !== null &&
                !openPicker.contains(event.target as Node) &&
                !(openLine?.contains(event.target as Node) ?? false)
            )
                openClose?.();
        },
        true,
    );
}
