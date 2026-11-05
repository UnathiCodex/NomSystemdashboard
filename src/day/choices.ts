/**
 * ## Choices
 *
 * The dashboard's own picker for every field of a dialog that picks, in place of the browser's drop-downs.
 * A field is one row, its name at the left, then one line with its value, no dash and no placeholder.
 * A click on the row opens its list as a menu right under the line, the dialog staying as it is.
 * Only one list is open at a time, Esc or a click beside it closes it.
 * A list of one value closes as I pick, one of several stays open, its picks lighter rows.
 * A search field filters as I type, ignoring case and accents, each typed word somewhere in the name.
 * The grey plus with the typed text stands at the end while no value has that text, never with nothing typed.
 * Values keep their order, a short fixed list has no search field.
 * A value wider than its row goes on below, never cut.
 */

import { Star } from "lucide";
import { crossPut, iconOf, plusPut, plusTake, plusTypedPut, searchFieldOf } from "../icons.ts";
import { matchesAll, searchTextOf, wordsOf } from "../search.ts";
import { dottedOf, valueDot } from "../persons.ts";

/**
 * Marks where a long name may break, after each `_` and between a small and a capital letter.
 * Else it breaks right after the name of its field or within a word.
 * The mark is a space of no width, U+200B.
 */
export function breakableOf(text: string): string {
    return text.replace(/_/g, "_\u200b").replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1\u200b$2");
}

/** Marks where a path may break, after each `/` too. */
export function pathBreakableOf(path: string): string {
    return breakableOf(path).replaceAll("/", "/\u200b");
}

/**
 * Writes the name of a file into its line, whole where it fits, else cut in its middle.
 * So its ending stays in sight, the name whole as its tooltip.
 * The ending is from the last `_` on where that is the shorter part, else the extension.
 * So the code of the module at the start stays in sight too.
 * A path keeps its last name from its last `/` on.
 * Measured again when the width changes and once the font has loaded, which changes its room.
 * A line that does not show has no width and stays as it is.
 *
 * @param line - Line of the name, as wide as its room whatever it holds
 */
export function middleCutPut(line: HTMLElement, name: string): void {
    const slash: number = name.lastIndexOf("/");
    const under: number = name.lastIndexOf("_");
    const dot: number = name.lastIndexOf(".");
    const cut: number = slash > 0 ? slash : under > name.length - under ? under : dot > 0 ? dot : name.length;
    let room: number = 0;
    const fit: () => void = (): void => {
        if (room === 0) return;
        const style: CSSStyleDeclaration = getComputedStyle(line);
        measurer.font = `${style.fontStyle} ${style.fontWeight} ` + `${style.fontSize} ${style.fontFamily}`;
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
 * - `group`: Name above its first value, empty for none.
 * - `brackets`: Grey in brackets right after the text in the list, as large as it, empty for none.
 * - `detail`: Grey beside the text in the list.
 * - `starred`: Whether a small filled star follows its text, like my default place.
 */
export type Choice = {
    value: string;
    text: string;
    group: string;
    brackets?: string;
    detail?: string;
    starred?: boolean;
};

/**
 * How a picker is built.
 *
 * - `search`: Values for a typed text, all of them for an empty one.
 * - `adding`: Whether the plus at the end of the list adds the typed text as a new value.
 * - `add`: Takes the typed text as a new value, gives the value to pick, `null` for none.
 *   Left out, the plus picks the typed text itself.
 * - `newTextOf`: What the plus shows, `null` for no plus, left out the typed text in quotes.
 * - `pick`: Takes the values after each change, for a list of one value once it is closed.
 * - `order`: Order of the values picked in the line, left out the order they were picked.
 * - `empty`: What the line shows, grey, while nothing is picked.
 * - `noun`: What a value is, for the search field and the tooltip of the plus.
 * - `locked`: Whether the line opens no list, like the category of a log entry from a plan box.
 * - `plus`: Whether the line shows the plus while nothing is picked, `empty` its tooltip.
 * - `besideName`: Whether the line with the plus stands beside the name of its row.
 *   So the value keeps the whole width.
 * - `textOf`: Text of a value picked before its list ever opened.
 * - `linkOf`: Address a value picked opens from the line.
 * - `afterOf`: An element after a value in the line, whose click opens no list.
 * - `parting`: What parts the values in the line, a middle dot when left out.
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
    linkOf?: (value: string) => string;
    afterOf?: (value: string) => HTMLElement;
    parting?: string;
};

/**
 * How the rows of a field of several values are built.
 *
 * - `picked`: Values picked, also those the list no longer offers.
 * - `grouped`: Whether the search looks at the group of a value too.
 * - `hint`: In place of the line while there is nothing to offer, left out no row.
 * - `nested`: Whether the rows stand inside the value above them.
 * - `tagOf`: Grey box after the text of a value picked.
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

/** Most characters of all texts of a list without a search field. */
const searchedLength: number = 60;

/** Measures a text in the font of a line, a canvas never put into the page. */
const measurer: CanvasRenderingContext2D = document
    .createElement("canvas")
    .getContext("2d") as CanvasRenderingContext2D;

/** The picker whose list is open, so only one list is open at a time. */
let openPicker: HTMLElement | null = null;

/** Line of the open list, which may stand outside its picker and still counts as it. */
let openLine: HTMLElement | null = null;

/** The open list. */
let openBox: HTMLElement | null = null;

/** Closes the open list. */
let openClose: (() => void) | null = null;

/** Whether the lists started, since the day may start again. */
let listsStarted: boolean = false;

/** A choice that shows its value, without group. */
export function choiceOf(value: string): Choice {
    return { value: value, text: value, group: "" };
}

/** Search of a list of my own, the choices whose text holds each typed word. */
export function searchOf(choices: Choice[]): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const words: string[] = wordsOf(text);
        return choices.filter((choice: Choice): boolean => matchesAll(choice.text, words));
    };
}

/** Search of a list under groups, the choices whose group and text hold each typed word. */
export function groupedSearchOf(choices: Choice[]): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const words: string[] = wordsOf(text);
        return choices.filter((choice: Choice): boolean => matchesAll(`${choice.group} ${choice.text}`, words));
    };
}

function buttonOf(text: string, chosen: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.classList.toggle("chosen", chosen);
    button.addEventListener("click", click);
    return button;
}

/** Button of a value in a list, its text, its brackets, its star, its grey detail. */
function valueButtonOf(choice: Choice, chosen: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf(choice.text, chosen, click);
    button.dataset.value = choice.value;
    if ((choice.brackets ?? "") !== "") {
        const brackets: HTMLSpanElement = document.createElement("span");
        brackets.className = "picker-brackets";
        brackets.textContent = ` (${choice.brackets})`;
        button.append(brackets);
    }
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
 * A value picked in the line, a link in this window where it has an address, else plain text.
 * A span, since the line is a button, which holds no real link.
 *
 * @param address - Address it opens, empty for none
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
 * A list the line of a field opens and closes as a menu over the dialog.
 * A `manual` popover, so this file alone decides when it closes.
 * CSS anchors place it under the line, as wide as the values of its row.
 * It closes on another click on the line, on Esc and on a click beside it.
 * - `field`: The row the line stands in, the picker while it stands in none.
 * - `close`: Also clears a list whose picker left the page meanwhile, so the next opens alone.
 *
 * @param opened - Comes once the list is open, like to focus its search field
 * @returns Closes the list
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

export function listOpen(box: HTMLElement): boolean {
    return box.matches(":popover-open");
}

/**
 * A picker, the line with the values picked, what stands beside and below it, and its list.
 * Values picked but not found come first while nothing is typed.
 * - `long`: Whether the list gets a search field, fixed at the start.
 * - `show`: Shows the values for the search text, unless a newer text came meanwhile.
 * - `typedPick`: Picks the value of Enter or the plus, empties the search, the value scrolled into sight.
 *   A value picked already stays picked, and the dialog is told again.
 * - `typedAdd`: Takes the typed text as a new value, the text staying typed when `add` gives `null`.
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
        `Search ${setup.adding ? "or add " : ""}` + `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`,
    );
    let chosen: string[] = [...setup.picked];
    const texts: Map<string, string> = new Map();
    let long: boolean = false;
    let found: Choice[] = [];
    let close: () => void = (): void => {};

    const linePlace: (beside: boolean) => void = (beside: boolean): void => {
        const name: HTMLElement | null = picker.closest(".panel-field")?.querySelector(":scope > .entry-name") ?? null;
        if (setup.besideName !== true || name === null) return;
        if (beside) name.append(line);
        else head.prepend(line);
    };
    const lineShow: () => void = (): void => {
        const shown: string[] = chosen.map(
            (value: string): string => texts.get(value) ?? setup.textOf?.(value) ?? value,
        );
        const text: string = shown.join(setup.parting ?? valueDot);
        if (text === "" && setup.plus === true) {
            plusPut(line, setup.empty ?? "");
            line.classList.add("picker-empty");
            linePlace(true);
            return;
        }
        linePlace(false);
        plusTake(line);
        line.textContent = text === "" ? (setup.empty ?? "") : breakableOf(text);
        const values: (string | Node)[] = chosen.map((value: string, index: number): string | Node => {
            const shownValue: string | Node = lineValueOf(shown[index], setup.linkOf?.(value) ?? "");
            if (setup.afterOf === undefined) return shownValue;
            const both: HTMLSpanElement = document.createElement("span");
            both.append(shownValue, setup.afterOf(value));
            return both;
        });
        if (text !== "" && setup.linkOf !== undefined) line.replaceChildren(...dottedOf(values, setup.parting));
        line.title = setup.locked ? "As planned" : text;
        line.classList.toggle("picker-empty", text === "");
    };
    const toggle: (value: string) => void = (value: string): void => {
        if (chosen.includes(value)) chosen = chosen.filter((other: string): boolean => other !== value);
        else
            chosen = setup.many
                ? (setup.order ?? ((values: string[]): string[] => values))([...chosen, value])
                : [value];
        list.querySelectorAll<HTMLButtonElement>("button[data-value]").forEach((button: HTMLButtonElement): void => {
            button.classList.toggle("chosen", chosen.includes(button.dataset.value ?? ""));
        });
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
                const button: HTMLButtonElement = valueButtonOf(choice, chosen.includes(choice.value), (): void =>
                    toggle(choice.value),
                );
                if (choice.group === "" || choice.group === found[index - 1]?.group) return [button];
                const group: HTMLParagraphElement = document.createElement("p");
                group.className = "picker-group";
                group.textContent = choice.group;
                return [group, button];
            }),
        );
        const newText: string | null = setup.newTextOf === undefined ? `“${text}”` : setup.newTextOf(text);
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
                choices.reduce((length: number, choice: Choice): number => length + choice.text.length, 0) >
                searchedLength;
            box.replaceChildren(...(long || setup.adding ? [field] : []), list, ...(setup.adding ? [newButton] : []));
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

/** Two pickers side by side in one row, the first wider, the second below where there is no room. */
export function pairOf(first: HTMLElement, second: HTMLElement): HTMLDivElement {
    const pair: HTMLDivElement = document.createElement("div");
    pair.className = "panel-pair";
    pair.append(first, second);
    return pair;
}

/**
 * Row of a value picked of a field of several values, its text, a link where it has one, and a small ×.
 * - `opening`: The link inside the element of the text, so a plus moved after the text stays outside it.
 *
 * @param link - Address the text opens in this window, empty for none
 * @param tag - Grey box after the text, empty for none
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

/** Grey box of a round after a note, as the status line of the editor shows it. */
export function roundTagOf(text: string): HTMLSpanElement {
    const tag: HTMLSpanElement = document.createElement("span");
    tag.className = "block-kind round-tag";
    tag.textContent = text;
    return tag;
}

/**
 * Rows of a field of several values, a row per value picked, the first named by the field.
 * Then the row of the list, its plus beside the name, which offers the values not picked yet.
 * A pick adds the value as a row of its own.
 * Nested, the rows stand indented, and the one who builds the value above moves the plus after it.
 * So a chapter and its documents read as one.
 */
export function addedRowsOf(name: string, setup: AddedSetup): HTMLDivElement[] {
    const offered: Choice[] = setup.choices.filter((choice: Choice): boolean => !setup.picked.includes(choice.value));
    const nested: boolean = setup.nested ?? false;
    const added: HTMLDivElement[] = setup.picked.map((value: string, index: number): HTMLDivElement =>
        addedRowOf(
            !nested && index === 0 ? name : "",
            setup.textOf(value),
            (): void => setup.change(setup.picked.filter((other: string): boolean => other !== value)),
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
 * Row of the list that adds the next value, its plus beside the name of the field.
 * The name stands on the row of the first value picked, else on this row.
 *
 * @param first - Row of the first value picked, `undefined` while none is
 */
export function addRowOf(name: string, first: HTMLElement | undefined, picker: HTMLElement): HTMLDivElement {
    const row: HTMLDivElement = rowOf(first === undefined ? name : "", picker);
    const place: HTMLElement | null = (first ?? row).querySelector(".entry-name");
    if (place !== null) lineMove(row, place);
    return row;
}

/**
 * Moves the plus of a row right after what it adds to, so no plus stands on a line of its own.
 * Moved out, the row keeps only the list, which takes no room of the dialog.
 *
 * @param row - Row with its picker, built with a plus as its line
 */
export function lineMove(row: HTMLElement, place: HTMLElement): void {
    const line: HTMLElement | null = row.querySelector(".picker-line");
    if (line === null) return;
    place.append(line);
    if (!row.contains(place)) row.classList.add("panel-list");
}

/**
 * Plain field of a part of a field, without placeholder.
 * A link is a text field too, so no browser shows it in a colour of its own.
 *
 * @param keyboard - Keyboard of a phone for the field, `url` for a link, else `text`
 * @param name - What it holds, for screen readers
 */
export function partFieldOf(keyboard: string, value: string, name: string): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.inputMode = keyboard;
    input.value = value;
    input.autocomplete = "off";
    input.setAttribute("aria-label", name);
    return input;
}

/** Part of a field, its name small and grey, then its field. */
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
 * Row of a dialog, the name of a field before its picker.
 * A click on the row opens its first list or focuses its first field, unless it hits something to click.
 * No `<label>` around the row, which would pass a click on the name to the first button.
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
 * File of the entry of a dialog beside its buttons, a link into the editor.
 * Only its folder and name after `…/`, so it stays on one line, its whole path as its title.
 * The paths of the editor start inside `NomManageplannings`.
 *
 * @param file - Path of the file from `NomWorkspace` on, empty while not known
 */
export function fileShow(link: HTMLAnchorElement, file: string): void {
    link.textContent = pathBreakableOf(`…/${file.split("/").slice(-2).join("/")}`);
    link.title = file;
    link.href = "/edit?file=" + encodeURIComponent(file.replace(/^NomManageplannings\//, ""));
    link.hidden = file === "";
}

/**
 * Moves through the open list by the arrow keys, from its search field to the plus, stopping at both ends.
 * A field outside these rows keeps its arrows for its own text.
 */
function listStep(event: KeyboardEvent): void {
    if (openBox === null || !listOpen(openBox)) return;
    const focused: Element = document.activeElement ?? document.body;
    const rows: HTMLElement[] = [...openBox.querySelectorAll<HTMLElement>("input[type=search], button:not([hidden])")];
    const at: number = rows.indexOf(focused as HTMLElement);
    if (at < 0 && focused.matches("input, textarea, [contenteditable]")) return;
    event.preventDefault();
    rows[at + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
}

/**
 * Starts the lists once for the page, Esc closing the open list and not its dialog.
 * - `keydown`: Listens first, so it sees Esc before the dialog.
 *   A list whose picker left the page meanwhile lets Esc go on to the dialog.
 * - `click`: Listens first, so the list is closed before another one opens.
 */
export function listsStart(): void {
    if (listsStarted) return;
    listsStarted = true;
    document.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") listStep(event);
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
