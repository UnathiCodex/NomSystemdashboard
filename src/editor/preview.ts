/**
 * ## Live preview
 *
 * A note in the editor as Obsidian's live preview shows it.
 * Its Markdown drawn as in the scripts view, the markup shown where the cursor is.
 * Only the look changes, never the text.
 * - Headings, lists and quotes stand in the elements of the scripts view.
 *   On the line of the cursor their markup shows in place, so the text never moves.
 * - Every line of the file one line on the page, an empty line half as high.
 * - Rendered pieces show as text while the cursor touches them.
 *   Tables, callouts, code and HTML blocks while the cursor is on one of their lines.
 * - The cursor never stands in what is hidden, so every key moves it where I see it.
 * - While I select by keys only what the cursor reaches shows as text.
 *   What I select with the mouse keeps its look, so no text moves under the pointer.
 * - Headings and list items fold by their arrow, a solution comes folded.
 * - While the editor is not focused the whole note shows rendered.
 * - Links resolve as the reader found them when the note was read or saved last.
 * - A copy takes the selection as the note writes it, every link it reaches into whole.
 */

import { EditorState, Facet, RangeSet, StateEffect, StateField } from "@codemirror/state";
import { BlockWrapper, Decoration, EditorView, ViewPlugin, WidgetType, keymap } from "@codemirror/view";
import {
    codeFolding,
    foldable,
    foldedRanges,
    foldEffect,
    foldKeymap,
    forceParsing,
    syntaxHighlighting,
    syntaxTree,
    unfoldEffect,
} from "@codemirror/language";
import { tagHighlighter, tags } from "@lezer/highlight";
import { Maximize2 } from "lucide";
import { iconPut } from "../icons.ts";
import { codeHighlighter, codeLanguages } from "../notes/code.ts";
import { mathRender } from "../notes/math.ts";
import { htmlOf, punctuationRule } from "../notes/markdown.ts";
import { kindRule, linkPlaceOf, noteAddressOf, placeAddressOf } from "../notes/tree.ts";
import { peopleLink, peopleRoles, personOf, personRowAddressOf, personsKept } from "../persons.ts";
import { blanksOf, columnsOf, emptyEndOf, emptyIs, quotePrefixOf, textIndentationOf, typingLine } from "./keys.ts";
import { roundHeadingShow } from "./round.ts";
import { foldedAt } from "./steps.ts";
import { cellTitleShow, tableOpen } from "./table.ts";

import type {
    Extension,
    Line,
    Range,
    SelectionRange,
    StateEffectType,
    Transaction,
    TransactionSpec,
} from "@codemirror/state";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import type { Highlighter } from "@lezer/highlight";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import type { Person } from "../../reader/persons.ts";

/** For each link of a note as written the path of its file, `null` when it leads nowhere. */
export type Links = {
    [link: string]: string | null;
};

/** What the look of a note is built from. */
type Look = {
    state: EditorState;
    links: Links;
    focused: boolean;
    cursors: number[];
    /** Start of the empty line a key just put the cursor on. */
    typing: number | null;
    decorations: Range<Decoration>[];
    wrappers: Range<BlockWrapper>[];
    rendered: number[];
};

/** Stretch of the text. */
type Span = { from: number; to: number };

/** Look of a note: its decorations and the elements its lines stand in. */
type Drawing = {
    decorations: DecorationSet;
    wrappers: RangeSet<BlockWrapper>;
};

/** Endings of images shown when embedded. */
const imageRule: RegExp = /\.(?:png|jpe?g|gif|bmp|svg|webp|avif)$/i;

/** Pieces of syntax drawn in an element of their own. */
const wrapped: string[] = ["BulletList", "OrderedList", "ListItem", "Blockquote"];

/** Blocks rendered whole while the cursor is on none of their lines. */
const renderedWhole: string[] = ["Table", "FencedCode", "HTMLBlock"];

/** First line of a callout from its `>`. */
const calloutRule: RegExp = /^>[ \t]?\[![^\]]+\]/;

/** Line break `<br>` or break opportunity `<wbr>`. */
const breakRule: RegExp = /^<(br|wbr)\s*\/?>$/i;

/** Address with a scheme, a link out of my modules opened as it is. */
const externalRule: RegExp = /^[a-z][a-z\d+.-]*:/i;

/** Heading of a note, its text as written. */
const headingRule: RegExp = /^#{1,6}[ \t]+(.*?)[ \t]*$/;

/** Section of a module file that names its responsible people, one item `- Nachname, Vorname` each. */
const responsiblesHeading: string = "## Modulverantwortliche";

/** Item of the list under {@link responsiblesHeading}. */
const responsibleRule: RegExp = /^- (\S.*?)[ \t]*$/;

/** Item of a list that names a person by its role, its role and the name. */
const roleRule: RegExp = new RegExp(`^- (${peopleRoles.join("|")}): (\\S.*?)[ \\t]*$`);

/** Heading of a solution, also with words after `Solution`. */
const solutionRule: RegExp = /^####[ \t]+Solution\b/;

/** Invisible format characters, like the soft hyphen. */
const invisibleRule: RegExp = /\p{Cf}/gu;

const hidden: Decoration = Decoration.replace({});

/** Bullet `-` of the list item the cursor is on, in place of the bullet. */
const bulletMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-bullet" });

/** Number of the list item the cursor is on, in place of the number. */
const numberMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-number" });

/** Markup `##` or `>` on the line of the cursor, left of the text. */
const hanging: Decoration = Decoration.mark({ class: "cm-hanging" });

/** Type word of a block at the start of its heading, a small grey box. */
const kindBox: Decoration = Decoration.mark({ class: "block-kind" });

/** Invisible character on the line of the cursor, kept invisible. */
const invisibleMark: Decoration = Decoration.mark({ class: "cm-hidden-char" });

/** Mark of a tab within a selection, as VS Code shows it. */
const tabMark: string = "→";

/** Tab within a selection, its mark drawn faintly over it. */
const tabShown: Decoration = Decoration.mark({ class: "cm-invisible", attributes: { "data-mark": tabMark } });

/** Text of a rendered link, which a click follows. */
const followable: Decoration = Decoration.mark({ class: "cm-follow" });

/** Text of a rendered link out of my modules, which a click opens in a new tab. */
const external: Decoration = Decoration.mark({ class: "cm-follow cm-external" });

/** Name of a person, which a click follows to its row in `Persons.md`. */
const personMark: Decoration = Decoration.mark({ class: "cm-follow cm-person" });

/** Text of a rendered link to a place the dashboard does not open, faded. */
const computerOnly: Decoration = Decoration.mark({
    class: "is-computer-only",
    attributes: { title: "Opens only on the computer" },
});

/** Empty line, half as high as a line of text. */
const gap: Decoration = Decoration.line({ class: "cm-gap" });

/** Empty line right below another, a place to write, its cursor a whole line high. */
const stop: Decoration = Decoration.line({ class: "cm-gap cm-stop" });

/**
 * Formula with the punctuation right after it, kept on one line.
 * Inclusive at its start, so it holds the drawn formula and not only the punctuation.
 */
const unbroken: Decoration = Decoration.mark({ class: "math-unbroken", inclusiveStart: true });

/** Line of a code block being edited. */
const codeLine: Decoration = Decoration.line({ class: "cm-code-block" });

/** Line of the code of a code block being edited, indented as the code rendered. */
const codeText: Decoration = Decoration.line({ class: "cm-code-text" });

/** First line of a code block being edited, with the room above the block. */
const codeFirst: Decoration = Decoration.line({ class: "cm-code-first" });

/** Last line of a code block being edited, with the room below the block. */
const codeLast: Decoration = Decoration.line({ class: "cm-code-last" });

/** Field that holds the value of the last of its effects, else its first value. */
function effectField<T>(effect: StateEffectType<T>, first: T): StateField<T> {
    return StateField.define<T>({
        create: (): T => first,
        update: (value: T, transaction: Transaction): T => {
            for (const each of transaction.effects) if (each.is(effect)) return each.value;
            return value;
        },
    });
}

/** Effect of the editor getting the focus or losing it. */
const focusChange: StateEffectType<boolean> = StateEffect.define<boolean>();

/** Whether the editor has the focus, not at first. */
const focused: StateField<boolean> = effectField(focusChange, false);

/**
 * Tells {@link focused} the focus after any update that leaves it behind.
 * Not by CodeMirror's news of the focus, which it drops once another transaction comes first,
 * like the press held by {@link pressHold}, and the note then stays rendered.
 */
function focusKeep(update: ViewUpdate): void {
    if (update.view.hasFocus === update.state.field(focused)) return;
    queueMicrotask((): void => {
        const focus: boolean = update.view.hasFocus;
        if (focus !== update.view.state.field(focused)) update.view.dispatch({ effects: focusChange.of(focus) });
    });
}

/** Whether the pointer made the selection, until any other change of the selection. */
const pointed: StateField<boolean> = StateField.define<boolean>({
    create: (): boolean => false,
    update: (value: boolean, transaction: Transaction): boolean =>
        transaction.selection === undefined ? value : transaction.isUserEvent("select.pointer"),
});

/** Effect of the mouse button going down in the text with the cursors shown then, or up again. */
const pressChange: StateEffectType<number[] | null> = StateEffect.define<number[] | null>();

/**
 * Cursors shown as text at the press of the mouse button, `null` while it is up.
 * So a click or a drag changes nothing of the look until the button goes up.
 */
const frozen: StateField<number[] | null> = StateField.define<number[] | null>({
    create: (): number[] | null => null,
    update: (places: number[] | null, transaction: Transaction): number[] | null => {
        for (const effect of transaction.effects) if (effect.is(pressChange)) return effect.value;
        return places === null || !transaction.docChanged
            ? places
            : places.map((place: number): number => transaction.changes.mapPos(place));
    },
});

/** Effect of the files of the links found anew. */
const linksFound: StateEffectType<Links> = StateEffect.define<Links>();

/** Files the links of the note lead to, as the reader found them when the note was read or saved last. */
const linkTargets: StateField<Links> = effectField(linksFound, {});

const personsFound: StateEffectType<Person[]> = StateEffect.define<Person[]>();

/** The people of `Persons.md`, none until they are loaded. */
const personsLoaded: StateField<Person[]> = effectField(personsFound, []);

/** Loads the people of `Persons.md` once the editor stands, unless the editor is gone by then. */
const personsLoad: ViewPlugin<{ destroy: () => void }> = ViewPlugin.define(
    (view: EditorView): { destroy: () => void } => {
        let open: boolean = true;
        personsKept()
            .then((persons: Person[]): void => {
                if (open) view.dispatch({ effects: personsFound.of(persons) });
            })
            .catch((error: unknown): void => console.error(error));
        return {
            destroy: (): void => {
                open = false;
            },
        };
    },
);

/** Path of the note in `NomWorkspace`, from which its relative links lead. */
const notePlace: Facet<string, string> = Facet.define<string, string>({
    combine: (places: readonly string[]): string => places[0] ?? "",
});

/** Classes of the pieces of syntax, markup is `cm-mark`. */
const highlighter: Highlighter = tagHighlighter([
    { tag: tags.strong, class: "cm-strong" },
    { tag: tags.emphasis, class: "cm-emphasis" },
    { tag: tags.strikethrough, class: "cm-strikethrough" },
    { tag: tags.monospace, class: "cm-monospace" },
    { tag: tags.link, class: "cm-link" },
    { tag: tags.url, class: "cm-url" },
    { tag: tags.processingInstruction, class: "cm-mark" },
]);

/**
 * Widget drawn by its fields alone, so one with the same fields stays drawn.
 * Its events stay its own, else a click would put the cursor at its start or end.
 */
abstract class FieldsWidget extends WidgetType {
    override eq(other: WidgetType): boolean {
        return Object.entries(this).every(
            ([field, value]: [string, unknown]): boolean =>
                (other as unknown as { [field: string]: unknown })[field] === value,
        );
    }
}

/** Widget a click goes through to the editor, which puts the cursor at it. */
abstract class PassingWidget extends FieldsWidget {
    override ignoreEvent(): boolean {
        return false;
    }
}

/** Fold arrow, down while open, right while folded, a click leaving the cursor where it is. */
export class FoldWidget extends FieldsWidget {
    constructor(
        /** Whether it belongs to a list item, else to a heading or a time zone. */
        readonly item: boolean,
        readonly folded: boolean,
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const arrow: HTMLSpanElement = document.createElement("span");
        arrow.className =
            `cm-fold ${this.item ? "cm-fold-item" : "cm-fold-heading"}` + (this.folded ? " cm-folded" : "");
        arrow.title = this.folded ? "Unfold" : "Fold";
        arrow.setAttribute("aria-label", arrow.title);
        arrow.addEventListener("mousedown", (event: MouseEvent): void => {
            event.preventDefault();
            foldToggle(view, view.posAtDOM(arrow));
        });
        return arrow;
    }
}

/** Formula rendered by MathJax. */
class MathWidget extends PassingWidget {
    constructor(
        /** TeX of the formula, without its `$`. */
        readonly tex: string,
        /** Whether it is a formula `$$…$$`. */
        readonly display: boolean,
        /** Whether it shows with its TeX being edited. */
        readonly preview: boolean,
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        const math: HTMLSpanElement = document.createElement("span");
        box.className = this.preview ? "cm-math cm-math-preview" : this.display ? "cm-math cm-math-display" : "cm-math";
        math.className = `math math-${this.display ? "block" : "inline"}`;
        math.textContent = this.tex;
        box.append(math);
        mathRender(box);
        return box;
    }
}

/** Element drawn by its HTML, like an image, a line break or the marks of hidden tabs. */
class ElementWidget extends PassingWidget {
    constructor(readonly html: string) {
        super();
    }

    /** Draws the element, once an image is loaded the editor measures its lines again. */
    toDOM(view: EditorView): HTMLElement {
        const box: HTMLDivElement = document.createElement("div");
        box.innerHTML = this.html;
        const element: HTMLElement = box.firstElementChild as HTMLElement;
        if (element instanceof HTMLImageElement) element.addEventListener("load", (): void => view.requestMeasure());
        return element;
    }
}

/** Task box of a list item, which a click ticks or unticks, the cursor staying where it is. */
class TaskBoxWidget extends FieldsWidget {
    constructor(
        /** Whether it is ticked, `[x]`. */
        readonly done: boolean,
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const box: HTMLInputElement = document.createElement("input");
        box.type = "checkbox";
        box.disabled = view.state.readOnly;
        box.checked = this.done;
        box.addEventListener("mousedown", (event: MouseEvent): void => {
            event.preventDefault();
            if (view.state.readOnly) return;
            const pos: number = view.posAtDOM(box);
            view.dispatch({
                changes: { from: pos + 1, to: pos + 2, insert: this.done ? " " : "x" },
                userEvent: "input",
            });
        });
        return box;
    }
}

/**
 * Tables, callouts, code blocks or HTML blocks right below each other, rendered.
 * No space of their own above and below, only the empty lines around them give it.
 */
class BlockWidget extends FieldsWidget {
    constructor(
        /** Markdown of the blocks, their whole lines. */
        readonly markdown: string,
        readonly links: Links,
        /** Length of their lines in the note, with their indentation. */
        readonly length: number,
    ) {
        super();
    }

    /**
     * Renders the blocks.
     * A table wider than the page scrolls sideways on its own, measured again when its size changes.
     * A code block names its language by the list at its top right.
     * A table opens whole over the file by the button at its top right.
     * A click puts the cursor at the place of their text I pressed, a scrollbar only scrolls.
     * A click on a table leaves it rendered to scroll, a double click puts the cursor there.
     * - `mousedown`: Its default prevented, which would focus the editor beside them.
     *   But not on the list of a code block, which then opens.
     * - `follow`: Follows the link clicked, here or in a table opened over the file.
     *   Tells whether it opened something, so a link only for the computer leaves the table open.
     */
    toDOM(view: EditorView): HTMLElement {
        const block: HTMLDivElement = blockRender(view, this.markdown, this.links);
        block.className = "cm-rendered";
        const follow = (event: MouseEvent): boolean => {
            const link: HTMLAnchorElement | null = (event.target as Element).closest("a");
            if (link === null) return false;
            event.preventDefault();
            if (link.classList.contains("person-link")) {
                location.assign(link.href);
                return true;
            }
            return addressFollow(
                view,
                link.dataset.link === undefined
                    ? (link.getAttribute("href") ?? "")
                    : `${link.dataset.link}#${link.dataset.heading ?? ""}`,
            );
        };
        for (const [index, table] of block.querySelectorAll("table").entries()) {
            const frame: HTMLDivElement = document.createElement("div");
            const open: HTMLButtonElement = document.createElement("button");
            frame.className = "table-frame";
            open.className = "table-open";
            open.type = "button";
            iconPut(open, Maximize2, "Open table");
            open.addEventListener("click", (): void => {
                const from: number = view.posAtDOM(block);
                const run: number | undefined = tableRunsOf(view, from, from + this.length)[index];
                const render = (markdown: string): HTMLElement => blockRender(view, markdown, this.links);
                if (run !== undefined) tableOpen(view, view.state.doc.line(run).from, render, follow);
            });
            table.replaceWith(frame);
            frame.append(table, open);
            new ResizeObserver((): void => {
                table.classList.toggle("is-wide", table.scrollWidth > table.clientWidth);
                view.requestMeasure();
            }).observe(table);
        }
        const fences: Fence[] = fencesOf(this.markdown);
        for (const [index, pre] of block.querySelectorAll("pre").entries()) {
            const fence: Fence | undefined = fences[index];
            if (fence === undefined) continue;
            const frame: HTMLDivElement = document.createElement("div");
            const pick: HTMLSelectElement = document.createElement("select");
            frame.className = "code-frame";
            pick.className = "code-language";
            pick.title = "Language";
            for (const name of new Set(["", ...Object.keys(codeLanguages), fence.info])) {
                const option: HTMLOptionElement = document.createElement("option");
                option.value = name;
                option.textContent = name === "" ? "–" : name;
                pick.append(option);
            }
            pick.value = fence.info;
            pick.addEventListener("change", (): void => {
                const from: number = view.posAtDOM(block);
                view.dispatch({ changes: { from: from + fence.from, to: from + fence.to, insert: pick.value } });
            });
            pre.replaceWith(frame);
            frame.append(pre, pick);
        }
        const place: (event: MouseEvent) => void = (event: MouseEvent): void => {
            const from: number = view.posAtDOM(block);
            view.focus();
            view.dispatch({ selection: { anchor: blockPlaceOf(view, from, from + this.length, event) } });
        };
        block.addEventListener("mousedown", (event: MouseEvent): void => {
            if (event.button !== 0 || targetIn(event, "select")) return;
            event.preventDefault();
            if (!scrollbarHit(event) && !targetIn(event, "a, summary, button, table")) place(event);
        });
        block.addEventListener("dblclick", (event: MouseEvent): void => {
            if (event.button === 0 && !scrollbarHit(event) && targetIn(event, "table") && !targetIn(event, "a, button"))
                place(event);
        });
        block.addEventListener("mouseover", cellTitleShow);
        block.addEventListener("toggle", (): void => view.requestMeasure(), true);
        block.addEventListener("click", follow);
        return block;
    }
}

/** The ``` that opens a code block, the stretch after it on its line and that text, its language. */
type Fence = { from: number; to: number; info: string };

/**
 * Finds the ``` or `~~~` that open the code blocks of Markdown, in a quote too.
 * Each is closed by the next of the same kind, at least as long, with nothing after it.
 */
function fencesOf(markdown: string): Fence[] {
    const fences: Fence[] = [];
    let open: string | null = null;
    let at: number = 0;
    for (const line of markdown.split("\n")) {
        const fence: RegExpExecArray | null = /^((?:[ \t]*>[ \t]?)*[ \t]*)(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence !== null && open === null) {
            open = fence[2];
            fences.push({ from: at + fence[1].length + fence[2].length, to: at + line.length, info: fence[3].trim() });
        } else if (
            fence !== null &&
            open !== null &&
            fence[2][0] === open[0] &&
            fence[2].length >= open.length &&
            fence[3].trim() === ""
        )
            open = null;
        at += line.length + 1;
    }
    return fences;
}

/** Address of a file at the reader. */
function fileAddressOf(path: string): string {
    return `/api/notes/file?path=${encodeURIComponent(path)}`;
}

/**
 * Renders Markdown as the scripts view does, with its images, formulas and links.
 * A link that leads nowhere or to a place the dashboard does not open fades.
 */
function blockRender(view: EditorView, markdown: string, links: Links): HTMLDivElement {
    const block: HTMLDivElement = document.createElement("div");
    block.innerHTML = htmlOf(markdown);
    for (const image of block.querySelectorAll<HTMLImageElement>("img[data-link]")) {
        const path: string | null = links[image.dataset.link ?? ""] ?? null;
        if (path !== null) image.src = fileAddressOf(path);
        image.addEventListener("load", (): void => view.requestMeasure());
    }
    for (const link of block.querySelectorAll<HTMLAnchorElement>("a[data-link]")) {
        const target: string = link.dataset.link ?? "";
        const address: string | null = linkAddressOf(view.state, target, "");
        if (address === null) link.classList.add("is-unresolved");
        if (address === "") {
            link.classList.add("is-computer-only");
            link.title = "Opens only on the computer";
        }
    }
    peopleLink(block);
    mathRender(block);
    return block;
}

function targetIn(event: Event, selector: string): boolean {
    return (event.target as Element).closest(selector) !== null;
}

/** Tells whether a click hit a scrollbar, below or right of the rows within the box. */
function scrollbarHit(event: MouseEvent): boolean {
    const target: Element = event.target as Element;
    return (
        (target.scrollWidth > target.clientWidth && event.offsetY >= target.clientHeight) ||
        (target.scrollHeight > target.clientHeight && event.offsetX >= target.clientWidth)
    );
}

/**
 * Finds the place in the text of rendered blocks that a click hit.
 * In a table the cell clicked, elsewhere the letter clicked, found by the text around it.
 * Else the end of the blocks, after a closing fence, so typing never breaks it.
 */
function blockPlaceOf(view: EditorView, from: number, to: number, event: MouseEvent): number {
    const caret: CaretPosition | null = document.caretPositionFromPoint(event.clientX, event.clientY);
    const text: string = caret?.offsetNode.nodeType === Node.TEXT_NODE ? (caret.offsetNode.textContent ?? "") : "";
    const offset: number = caret?.offset ?? 0;
    const cell: HTMLTableCellElement | null = (event.target as Element).closest("td, th");
    if (cell !== null) return cellPlaceOf(view, from, to, cell, text, offset);

    const at: number = text.trim() === "" ? -1 : view.state.sliceDoc(from, to).indexOf(text);
    return at === -1 ? to : from + at + offset;
}

/**
 * Finds the place in the text of a table for a click on one of its cells.
 * Its row is a line of the table, the line of `-` under the head left out.
 * In the row the text of the cell, escaped `|` not counted.
 * At the letter clicked where the cell's text holds it as it is, else at its start.
 * - `text`, `offset`: The text node clicked and the place in it.
 */
function cellPlaceOf(
    view: EditorView,
    from: number,
    to: number,
    cell: HTMLTableCellElement,
    text: string,
    offset: number,
): number {
    const table: HTMLTableElement = cell.closest("table") as HTMLTableElement;
    const tables: HTMLTableElement[] = [...(table.closest(".cm-rendered")?.querySelectorAll("table") ?? [])];
    const last: number = view.state.doc.lineAt(to).number;
    const runs: number[] = tableRunsOf(view, from, to);
    const row: number = [...table.rows].indexOf(cell.parentElement as HTMLTableRowElement);
    if (runs[tables.indexOf(table)] === undefined || row === -1) return to;

    const line: Line = view.state.doc.line(Math.min(runs[tables.indexOf(table)] + row + (row > 0 ? 1 : 0), last));
    const bar: RegExpExecArray | undefined = [...line.text.matchAll(/(?<!\\)\|[ \t]*/g)][cell.cellIndex];
    const start: number = bar === undefined ? line.length : bar.index + bar[0].length;
    const at: number =
        text.trim() === ""
            ? -1
            : line.text
                  .slice(start)
                  .split(/(?<!\\)\|/)[0]
                  .indexOf(text);
    return line.from + start + (at === -1 ? 0 : at + offset);
}

/** Finds the tables in the text of rendered blocks, runs of lines that begin with `|` after any `>`. */
function tableRunsOf(view: EditorView, from: number, to: number): number[] {
    const first: number = view.state.doc.lineAt(from).number;
    const last: number = view.state.doc.lineAt(to).number;
    const runs: number[] = [];
    for (let number: number = first; number <= last; number++)
        if (
            /^[ \t>]*\|/.test(view.state.doc.line(number).text) &&
            (number === first || !/^[ \t>]*\|/.test(view.state.doc.line(number - 1).text))
        )
            runs.push(number);
    return runs;
}

/**
 * Gives the cursors whose places show as text, of each selection its end that a key moves.
 * None of a selection by the pointer, which keeps the look, but one inside a formula's TeX.
 * While the mouse button is down those of the press, so no text moves under the pointer.
 */
function cursorsOf(state: EditorState): number[] {
    return (
        state.field(frozen) ??
        state.selection.ranges
            .filter(
                (range: SelectionRange): boolean => range.empty || !state.field(pointed) || formulaHolds(state, range),
            )
            .map((range: SelectionRange): number => range.head)
    );
}

/** Gives a piece of syntax and the pieces around it, from the inside out. */
function upwardOf(node: SyntaxNode | null): SyntaxNode[] {
    const nodes: SyntaxNode[] = [];
    for (let up: SyntaxNode | null = node; up !== null; up = up.parent) nodes.push(up);
    return nodes;
}

/** Tells whether a formula holds a stretch of the text, at its ends too. */
function formulaHolds(state: EditorState, range: SelectionRange): boolean {
    const formula: SyntaxNode | undefined = upwardOf(syntaxTree(state).resolveInner(range.from, 1)).find(
        (node: SyntaxNode): boolean => node.name === "InlineMath",
    );
    return formula !== undefined && formula.from <= range.from && formula.to >= range.to;
}

/** Tells whether a cursor touches a stretch of the text, also at its ends, while I am editing. */
function touched(look: Look, from: number, to: number): boolean {
    return look.focused && look.cursors.some((cursor: number): boolean => cursor >= from && cursor <= to);
}

/** Draws a widget in place of a stretch of the text. */
function widgetPut(look: Look, widget: WidgetType, from: number, to: number): void {
    look.decorations.push(Decoration.replace({ widget: widget }).range(from, to));
}

function hide(look: Look, from: number, to: number): void {
    if (from < to) look.decorations.push(hidden.range(from, to));
}

/** Gives the end of markup like `##` or `>`, with the blank after it. */
function markEndOf(look: Look, mark: SyntaxNode): number {
    return /[ \t]/.test(look.state.sliceDoc(mark.to, mark.to + 1)) ? mark.to + 1 : mark.to;
}

/** Gives each line of a stretch of the text a class, like the lines of a code block. */
function linesMark(look: Look, from: number, to: number, line: Decoration): void {
    const last: number = look.state.doc.lineAt(to).number;
    for (let number: number = look.state.doc.lineAt(from).number; number <= last; number++)
        look.decorations.push(line.range(look.state.doc.line(number).from));
}

/**
 * Puts the lines of a piece of syntax into an element, so the rules of the scripts view give it their look.
 * The deeper a piece lies among those of {@link wrapped}, the lower its rank.
 *
 * @param to - A heading's right after the start of its line, so the row of a task after it stands outside
 */
function wrap(
    look: Look,
    node: SyntaxNode,
    tagName: string,
    attributes: { [name: string]: string } = {},
    to: number = node.to,
    from: number = node.from,
): void {
    const depth: number = upwardOf(node.parent).filter((up: SyntaxNode): boolean => wrapped.includes(up.name)).length;
    const wrapper: BlockWrapper = BlockWrapper.create({ tagName: tagName, attributes: attributes, rank: 100 - depth });
    look.wrappers.push(wrapper.range(look.state.doc.lineAt(from).from, to));
}

/** Puts the fold arrow of a heading after its text, of a list item at the start of its line. */
function foldLook(look: Look, line: Line, item: boolean): void {
    if (foldable(look.state, line.from, line.to) === null) return;

    const arrow: FoldWidget = new FoldWidget(item, foldedAt(look.state, line.to));
    look.decorations.push(Decoration.widget({ widget: arrow, side: item ? -1 : 1 }).range(item ? line.from : line.to));
}

/**
 * Heading, its `##` hidden, on the line of the cursor shown left of the text.
 * The type word of a block a grey box, as written only while the cursor touches it.
 * Its dot and space stay hidden while the cursor stands in the name, so a click moves no text.
 */
function headingLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const mark: SyntaxNode | null = node.getChild("HeaderMark");
    wrap(look, node, `h${node.name.slice(-1)}`, {}, line.from + 1);
    if (mark !== null) {
        const start: number = markEndOf(look, mark);
        const kind: RegExpExecArray | null =
            node.name === "ATXHeading2" ? kindRule.exec(look.state.sliceDoc(start, line.to)) : null;
        if (touched(look, line.from, line.to)) look.decorations.push(hanging.range(mark.from, start));
        else hide(look, mark.from, start);
        if (kind !== null && !touched(look, start, start + kind[1].length)) {
            look.decorations.push(kindBox.range(start, start + kind[1].length));
            hide(look, start + kind[1].length, start + kind[0].length);
        }
    }
    foldLook(look, line, false);
    return true;
}

/** Bold, italic, struck or code, its markup hidden while the cursor does not touch it. */
function markupLook(look: Look, node: SyntaxNode): boolean {
    if (!touched(look, node.from, node.to))
        for (let child: SyntaxNode | null = node.firstChild; child !== null; child = child.nextSibling)
            if (child.name.endsWith("Mark")) hide(look, child.from, child.to);
    return true;
}

/**
 * Markdown link, only its text while the cursor does not touch it.
 * Brackets without an address, like the `[!note]` of a callout, are no link.
 */
function linkLook(look: Look, node: SyntaxNode): boolean {
    const marks: SyntaxNode[] = node.getChildren("LinkMark");
    const url: SyntaxNode | null = node.getChild("URL");
    if (url === null || marks.length < 2 || touched(look, node.from, node.to)) return true;

    const address: string = addressOf(look.state, url);
    const mark: Decoration = externalRule.test(address)
        ? external
        : linkMarkOf(look.state, address.split("#")[0].trim());
    linkTextLook(look, node, marks[0].to, marks[1].from, mark);
    return true;
}

/** Gives the address of a Markdown link or image as written, without its `<` and `>`. */
function addressOf(state: EditorState, url: SyntaxNode): string {
    return state.sliceDoc(url.from, url.to).replace(/^<|>$/g, "");
}

/** Shows only the text of a link in the look of its link, the markup around it hidden. */
function linkTextLook(look: Look, node: SyntaxNode, from: number, to: number, mark: Decoration): void {
    hide(look, node.from, from);
    hide(look, to, node.to);
    if (from < to) look.decorations.push(mark.range(from, to));
}

/** Web address written as it is, a link as GitHub's Markdown takes it. */
function urlLook(look: Look, node: SyntaxNode): boolean {
    if (node.parent?.name !== "Link" && node.parent?.name !== "Image" && !touched(look, node.from, node.to))
        look.decorations.push(external.range(node.from, node.to));
    return false;
}

/** Markdown image, shown at its own size while the cursor does not touch it and the reader found its file. */
function imageLook(look: Look, node: SyntaxNode): boolean {
    const url: SyntaxNode | null = node.getChild("URL");
    if (url === null || touched(look, node.from, node.to)) return false;

    const target: string = addressOf(look.state, url).split("#")[0].trim();
    const path: string | null | undefined = look.links[target];
    if (!imageRule.test(target) || typeof path !== "string") return false;
    widgetPut(look, new ElementWidget(`<img class="internal-embed" src="${fileAddressOf(path)}">`), node.from, node.to);
    return false;
}

/**
 * Wiki link or embed, only its text after `|` or its target while the cursor does not touch it.
 * Its target ends at `#`, `|` or the `\|` of tables, as the reader lists it.
 */
function wikiLinkLook(look: Look, node: SyntaxNode): boolean {
    if (touched(look, node.from, node.to)) return false;

    const text: string = look.state.sliceDoc(node.from, node.to);
    const open: number = node.name === "WikiEmbed" ? 3 : 2;
    const bar: RegExpExecArray | null = /\\?\|/.exec(text);
    const target: string = /^!?\[\[([^\]#|\\]*)/.exec(text)?.[1].trim() ?? "";
    const from: number = node.from + (bar === null ? open : bar.index + bar[0].length);
    linkTextLook(look, node, from, node.to - 2, linkMarkOf(look.state, target));
    return false;
}

/**
 * Builds the address a link of the note opens.
 * A file the reader found, a note in the scripts view, any other file at the reader.
 * Else the place it leads to as a relative link, as VSCodium follows it.
 * A link the reader found nothing for leads nowhere, but one out of its module, where the reader does not look.
 * - `path`: `undefined` for a link the reader did not look at, like one written since.
 *
 * @returns `null` for a link that leads nowhere, empty for one that opens only on the computer
 */
function linkAddressOf(state: EditorState, target: string, heading: string): string | null {
    if (target === "") return `#${heading}`;

    const path: string | null | undefined = state.field(linkTargets)[target];
    if (typeof path === "string")
        return /\.md$/i.test(path)
            ? noteAddressOf(path, heading)
            : heading === ""
              ? fileAddressOf(path)
              : `${fileAddressOf(path)}#${heading}`;

    const file: string = state.facet(notePlace);
    const place: string | null = linkPlaceOf(file, target);
    const module: string = `${file.split("/").slice(0, 2).join("/")}/`;
    if (path === null && (place === null || place.startsWith(module))) return null;
    return place === null ? "" : placeAddressOf(place, heading);
}

/**
 * Look of the text of a rendered link.
 * When it leads nowhere faded and dotted, its tooltip naming what it looked for, so a broken source stands out.
 */
function linkMarkOf(state: EditorState, target: string): Decoration {
    const address: string | null = linkAddressOf(state, target, "");
    if (address !== null) return address === "" ? computerOnly : followable;
    return Decoration.mark({ class: "is-unresolved", attributes: { title: `Leads nowhere: ${target}` } });
}

/**
 * Formula, rendered while the cursor does not touch it, with the punctuation right after it on its line.
 * Else its TeX, a formula `$$…$$` rendered above it, so the formula I click stays in place.
 * That one from the start of its line, as blanks hidden there would push it down a line.
 */
function mathLook(look: Look, node: SyntaxNode): boolean {
    const text: string = look.state.sliceDoc(node.from, node.to);
    const display: boolean = text.startsWith("$$");
    const tex: string = display ? text.slice(2, -2) : text.slice(1, -1);
    const after: string = look.state.sliceDoc(node.to, look.state.doc.lineAt(node.to).to);
    const punctuation: number = display ? 0 : (punctuationRule.exec(after)?.[0].length ?? 0);
    if (!touched(look, node.from, node.to)) {
        widgetPut(look, new MathWidget(tex, display, false), node.from, node.to);
        if (punctuation > 0) look.decorations.push(unbroken.range(node.from, node.to + punctuation));
    } else if (display) {
        const shown: Decoration = Decoration.widget({ widget: new MathWidget(tex, true, true), side: -1 });
        look.decorations.push(shown.range(look.state.doc.lineAt(node.from).from));
    }
    return false;
}

/**
 * List, its lines in a `ul` or `ol` up to where its last item ends.
 * In two around the empty line a key just put the cursor on left of its points, so that line stands outside.
 * A list within a point tells the empty lines below it, so its guide line runs on through them.
 * Only while the list around it goes on below them.
 */
function listLook(look: Look, node: SyntaxNode): boolean {
    const tagName: string = node.name === "BulletList" ? "ul" : "ol";
    const end: number = node.lastChild !== null ? itemEndOf(look, node.lastChild) : node.to;
    const parent: SyntaxNode | null = node.parent?.name === "ListItem" ? node.parent : null;
    const air: number =
        parent !== null &&
        look.state.doc.lineAt(itemDrawEndOf(look, parent)).number === look.state.doc.lineAt(end).number &&
        listOnIs(look, node, end)
            ? airBelowOf(look, end)
            : 0;
    const attributes: { [name: string]: string } = { style: `--air-below: ${air}` };
    const cut: Line | null = typingCutOf(look, node, end);
    wrap(look, node, tagName, attributes, cut === null ? end : cut.from - 1);
    const after: SyntaxNode | undefined =
        cut === null ? undefined : node.getChildren("ListItem").find((item: SyntaxNode): boolean => item.from > cut.to);
    if (after !== undefined) wrap(look, node, tagName, attributes, end, after.from);
    return true;
}

/** Tells whether the outermost list around a list goes on below the empty lines after a line. */
function listOnIs(look: Look, node: SyntaxNode, end: number): boolean {
    let root: SyntaxNode = node;
    for (let up: SyntaxNode | null = node.parent; up !== null; up = up.parent)
        if (up.name === "BulletList" || up.name === "OrderedList") root = up;
    const last: Line = emptyEndOf(look.state, look.state.doc.lineAt(end), 1);
    return last.number < look.state.doc.lines && look.state.doc.line(last.number + 1).from < root.to;
}

/**
 * Counts the empty lines right below a line, the empty line a key just put the cursor on ending them too.
 *
 * @returns None where the note ends below them
 */
function airBelowOf(look: Look, end: number): number {
    const last: number = look.state.doc.lineAt(end).number;
    for (let number: number = last + 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (line.from === look.typing || !emptyIs(look.state, line)) return number - last - 1;
    }
    return 0;
}

/**
 * Finds the empty line a key just put the cursor on within a point or list, its blanks left of their text.
 * The point or list then ends right before it.
 */
function typingCutOf(look: Look, node: SyntaxNode, end: number): Line | null {
    const typing: number | null = look.typing;
    const item: SyntaxNode | null = node.name === "ListItem" ? node : node.firstChild;
    const text: string = item === null ? "" : look.state.doc.lineAt(item.from).text;
    const indentation: string | null = item === null ? null : textIndentationOf(text.slice(quotePrefixOf(text).length));
    if (typing === null || indentation === null || typing <= look.state.doc.lineAt(node.from).to || typing > end)
        return null;
    const line: Line = look.state.doc.lineAt(typing);
    return columnsOf(line.text.slice(quotePrefixOf(line.text).length)) < columnsOf(indentation) ? line : null;
}

/**
 * Gives where the lines of a point end on the page, up to the next point over the empty lines between.
 * Right before the empty line the cursor stands on left of its text.
 */
function itemDrawEndOf(look: Look, node: SyntaxNode): number {
    const next: SyntaxNode | null = node.nextSibling?.name === "ListItem" ? node.nextSibling : null;
    const end: number = next === null ? itemEndOf(look, node) : look.state.doc.lineAt(next.from).from - 1;
    return (typingCutOf(look, node, end)?.from ?? end + 1) - 1;
}

/**
 * Finds where a list item ends on the page, after the lines of blanks below it that reach its text.
 * Markdown reads those after it, so the cursor on them stands under its text.
 */
function itemEndOf(look: Look, node: SyntaxNode): number {
    const indentation: string | null = textIndentationOf(look.state.doc.lineAt(node.from).text);
    if (indentation === null) return node.to;
    let end: Line = look.state.doc.lineAt(node.to);
    for (let number: number = end.number + 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (!/^[ \t]*$/.test(line.text)) break;
        if (line.length === 0) continue;
        if (columnsOf(line.text) < columnsOf(indentation)) break;
        end = line;
    }
    return end.to;
}

/**
 * Tells a line of blanks within a list, like the one Shift+Enter writes, maybe past other empty lines.
 * Its blanks are hidden, so the cursor on it stands where text typed will begin.
 */
function listBlankIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t]+$/.test(line.text) || !emptyIs(state, line)) return false;
    let above: Line = line;
    while (above.number > 1 && /^[ \t]*$/.test(above.text)) above = state.doc.line(above.number - 1);
    return upwardOf(syntaxTree(state).resolveInner(above.from + blanksOf(above.text), 1)).some(
        (node: SyntaxNode): boolean => node.name === "ListItem",
    );
}

/**
 * List item, its lines in an `li`, a number as written, so a step skipped keeps its number.
 * Without its bullet while the cursor is on its first line, where its marker shows as written.
 * The `li` reaches over the empty lines up to the next point, so a list with air stays one list.
 */
function itemLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const mark: SyntaxNode | null = node.getChild("ListMark");
    const attributes: { [name: string]: string } = {};
    if (touched(look, line.from, line.to)) attributes.class = "cm-source";
    if (node.parent?.name === "OrderedList" && mark !== null)
        attributes.value = String(parseInt(look.state.sliceDoc(mark.from, mark.to)));
    wrap(look, node, "li", attributes, itemDrawEndOf(look, node));
    if (node.getChild("BulletList") !== null || node.getChild("OrderedList") !== null) foldLook(look, line, true);
    return true;
}

/**
 * Marker of a list item with its indentation and blanks, hidden.
 * On the line of the cursor shown in place of the bullet or number, its indentation still hidden.
 * The blanks after a `-` stay hidden, so the cursor after them stands where the text begins.
 */
function listMarkLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const textFrom: number = node.to + blanksOf(look.state.sliceDoc(node.to, line.to));
    indentationHide(look, node);
    if (!touched(look, line.from, line.to)) {
        hide(look, node.from, textFrom);
    } else if (node.parent?.parent?.name === "BulletList") {
        look.decorations.push(bulletMark.range(node.from, node.to));
        hide(look, node.to, textFrom);
    } else {
        look.decorations.push(numberMark.range(node.from, textFrom));
    }
    return true;
}

/** Paragraph, the indentation of its lines hidden. */
function paragraphLook(look: Look, node: SyntaxNode): boolean {
    indentationHide(look, node);
    const last: number = look.state.doc.lineAt(node.to).number;
    for (let number: number = look.state.doc.lineAt(node.from).number + 1; number <= last; number++) {
        const line: Line = look.state.doc.line(number);
        hide(look, line.from, line.from + blanksOf(line.text));
    }
    return true;
}

/** Hides the blanks before a piece of syntax that only blanks stand before on its line. */
function indentationHide(look: Look, node: SyntaxNode): void {
    const line: Line = look.state.doc.lineAt(node.from);
    if (/^[ \t]*$/.test(look.state.sliceDoc(line.from, node.from))) hide(look, line.from, node.from);
}

/**
 * Gives how much of the start of a line the look hides.
 * Of a block or quote as many columns as its first line, so the line's own indentation shows.
 * Nothing of an indented code block or a line of blanks outside a list.
 */
function hiddenStartOf(state: EditorState, line: Line): number {
    const blanks: number = blanksOf(line.text);
    if (blanks === line.length) return listBlankIs(state, line) ? blanks : 0;
    for (const node of upwardOf(syntaxTree(state).resolveInner(line.from + blanks, 1))) {
        if (["Paragraph", "Task", "ListItem"].includes(node.name)) return blanks;
        if (node.name === "CodeBlock") return 0;
        if (![...renderedWhole, "Blockquote"].includes(node.name)) continue;
        const columns: number = columnsOf(state.doc.lineAt(node.from).text);
        let hidden: number = 0;
        while (hidden < blanks && columnsOf(line.text.slice(0, hidden)) < columns) hidden++;
        return hidden;
    }
    return 0;
}

/**
 * Tells the gap between two paragraphs, the first empty line after text, no place to write.
 * Not the empty line a key just put the cursor on.
 * - `lower`: Tells instead the lower of two empty lines.
 */
function gapIs(state: EditorState, line: Line, lower: boolean = false): boolean {
    return (
        line.number > 1 &&
        line.from !== (state.field(typingLine, false) ?? null) &&
        emptyIs(state, line) &&
        emptyIs(state, state.doc.line(line.number - 1)) === lower
    );
}

/** Counts the characters of a point's line before its text, with or without its task box. */
function pointMarkOf(text: string, box: boolean): number {
    const mark: RegExpExecArray | null = /^([ \t]*(?:[-*+]|\d+[.)])(?:[ \t]+|$))(?:\[[ xX]\][ \t]+)?/.exec(text);
    return (box ? mark?.[0] : mark?.[1])?.length ?? 0;
}

/**
 * Gives where the cursor may stand first on a line, after its hidden start.
 * On a point after its marker, where CodeMirror's own keys would not rewrite its tabs.
 * On code that looks like a point, like YAML, before the `-` too.
 */
function textStartOf(state: EditorState, line: Line): number {
    const mark: SyntaxNode = syntaxTree(state).resolveInner(line.from + blanksOf(line.text), 1);
    return (
        line.from + Math.max(hiddenStartOf(state, line), mark.name === "ListMark" ? pointMarkOf(line.text, false) : 0)
    );
}

/**
 * Keeps the cursor off what the look hides, so every key moves it where I see it.
 * - Put into the hidden start of a line, it goes to where the text begins.
 * - Moved left from where the text begins, it goes on to the end of the line above.
 * - Moved up or down onto a point, it goes after its marker and task box.
 * - Never on the gap between two paragraphs, a click or arrow down goes below it, an arrow up above.
 * - An arrow that went past empty lines stops on the first that is no gap, a place to write.
 * Only for a cursor moved alone, never while text is changed.
 * Picking by Shift and an arrow stops on every empty line, a gap too, so a selection takes one line a step.
 */
const caretPlace: Extension = EditorState.transactionFilter.of(
    (transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
        const pointer: boolean = transaction.isUserEvent("select.pointer");
        if (
            transaction.docChanged ||
            transaction.selection === undefined ||
            transaction.selection.ranges.length > 1 ||
            !transaction.isUserEvent("select") ||
            (pointer && !transaction.selection.main.empty)
        )
            return transaction;

        const state: EditorState = transaction.startState;
        const range: SelectionRange = transaction.selection.main;
        const head: number = range.head;
        const before: number = state.selection.main.head;
        const down: boolean = pointer || head > before;
        const step: number = down ? 1 : -1;
        const vertical: boolean = !pointer && state.doc.lineAt(head).number !== state.doc.lineAt(before).number;
        let place: number = head;
        for (
            let number: number = state.doc.lineAt(before).number + step;
            !pointer && (number - state.doc.lineAt(head).number) * step < 0;
            number += step
        ) {
            const line: Line = state.doc.line(number);
            if (!emptyIs(state, line)) break;
            if (range.empty && gapIs(state, line)) continue;
            place = line.from;
            break;
        }
        const moved = (anchor: number): TransactionSpec | readonly TransactionSpec[] =>
            place === head
                ? transaction
                : [transaction, { selection: { anchor: anchor, head: place }, sequential: true }];
        if (!range.empty) return moved(range.anchor);
        for (let line: Line = state.doc.lineAt(place); ; line = state.doc.lineAt(place)) {
            const start: number = textStartOf(state, line);
            const text: number = line.from + pointMarkOf(line.text, true);
            if (gapIs(state, line) && down && line.number < state.doc.lines)
                place = state.doc.line(line.number + 1).from;
            else if (gapIs(state, line)) place = state.doc.line(line.number - 1).to;
            else if (vertical && place < text) place = text;
            else if (!pointer && place < start && before === start && line.number > 1)
                place = state.doc.line(line.number - 1).to;
            else if (place < start) place = start;
            else break;
            if (state.doc.lineAt(place).number === line.number) break;
        }
        return moved(place);
    },
);

/** Task box of a list item, as written on the line of the cursor. */
function taskBoxLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const done: boolean = /x/i.test(look.state.sliceDoc(node.from, node.to));
    if (!touched(look, line.from, line.to)) widgetPut(look, new TaskBoxWidget(done), node.from, node.to);
    return false;
}

/**
 * Quote, its lines in a `blockquote` up to its last line with text.
 * Lines of only `>` at its end are air after it, but the line a key just put the cursor on.
 * A callout renders whole while the cursor is on none of its lines, else shows as a quote.
 */
function quoteLook(look: Look, node: SyntaxNode): boolean {
    const callout: boolean = calloutRule.test(look.state.sliceDoc(node.from, look.state.doc.lineAt(node.from).to));
    if (callout && !blockLook(look, node)) return false;
    let last: Line = look.state.doc.lineAt(node.to);
    while (last.from > node.from && last.from !== look.typing && emptyIs(look.state, last))
        last = look.state.doc.line(last.number - 1);
    wrap(look, node, "blockquote", {}, last.to);
    return true;
}

/**
 * Inline HTML, a `<br>` or `<wbr>` drawn as the element itself while the cursor does not touch it.
 * Any other tag stays as written, and so does every tag of a table, whose rows a break would split.
 */
function htmlTagLook(look: Look, node: SyntaxNode): boolean {
    const tagName: string | undefined = breakRule.exec(look.state.sliceDoc(node.from, node.to))?.[1].toLowerCase();
    const table: boolean = upwardOf(node.parent).some((parent: SyntaxNode): boolean => parent.name === "Table");
    if (tagName !== undefined && !table && !touched(look, node.from, node.to))
        widgetPut(look, new ElementWidget(`<span><${tagName}></span>`), node.from, node.to);
    return false;
}

/** Marker `>` of a quote, hidden, on the line of the cursor shown left of the text. */
function quoteMarkLook(look: Look, node: SyntaxNode): boolean {
    if (node.parent?.name === "Blockquote") indentationHide(look, node);
    if (touched(look, look.state.doc.lineAt(node.from).from, look.state.doc.lineAt(node.to).to))
        look.decorations.push(hanging.range(node.from, markEndOf(look, node)));
    else hide(look, node.from, markEndOf(look, node));
    return true;
}

/**
 * Table, callout, code block or HTML block, with those right below it, rendered as one.
 * So the space between them is that of the scripts view.
 * While the cursor is on one of them their text, its indentation hidden, where the rendered block stands.
 */
function blockLook(look: Look, node: SyntaxNode): boolean {
    if (look.rendered.includes(node.from)) return false;

    let last: SyntaxNode = node;
    while (
        last.nextSibling !== null &&
        renderedWhole.includes(last.nextSibling.name) &&
        look.state.doc.lineAt(last.nextSibling.from).number === look.state.doc.lineAt(last.to).number + 1
    )
        last = last.nextSibling;
    const from: number = look.state.doc.lineAt(node.from).from;
    const to: number = look.state.doc.lineAt(last.to).to;
    if (touched(look, from, to)) {
        const end: number = look.state.doc.lineAt(node.to).number;
        for (let number: number = look.state.doc.lineAt(from).number; number <= end; number++) {
            const line: Line = look.state.doc.line(number);
            if (node.name !== "Blockquote") hide(look, line.from, line.from + hiddenStartOf(look.state, line));
        }
        return true;
    }

    for (let block: SyntaxNode | null = node; block !== null && block.from <= last.from; block = block.nextSibling)
        look.rendered.push(block.from);
    const markdown: string = look.state.sliceDoc(from, to);
    const indentation: RegExp = new RegExp(`^${/^[ \t]*/.exec(markdown)?.[0] ?? ""}`, "gm");
    const block: BlockWidget = new BlockWidget(markdown.replace(indentation, ""), look.links, to - from);
    look.decorations.push(Decoration.replace({ widget: block, block: true }).range(from, to));
    return false;
}

/** Code block, while the cursor is on it its lines on grey with the room and indentation as rendered. */
function codeLook(look: Look, node: SyntaxNode): boolean {
    if (!blockLook(look, node)) return false;

    linesMark(look, node.from, node.to, codeLine);
    const first: Line = look.state.doc.lineAt(node.from);
    const last: Line = look.state.doc.lineAt(node.to);
    look.decorations.push(codeFirst.range(first.from), codeLast.range(last.from));
    const end: number =
        last.number > first.number && /^[ \t>]*(?:`{3,}|~{3,})[ \t]*$/.test(last.text) ? last.number - 1 : last.number;
    if (end > first.number)
        linesMark(look, look.state.doc.line(first.number + 1).from, look.state.doc.line(end).to, codeText);
    return true;
}

/** Look of each piece of syntax by its name, each tells whether to look at the pieces inside it. */
const looks: { [name: string]: (look: Look, node: SyntaxNode) => boolean } = {
    ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((level: number): [string, typeof headingLook] => [`ATXHeading${level}`, headingLook]),
    ),
    Emphasis: markupLook,
    StrongEmphasis: markupLook,
    Strikethrough: markupLook,
    InlineCode: markupLook,
    Link: linkLook,
    Image: imageLook,
    URL: urlLook,
    WikiLink: wikiLinkLook,
    WikiEmbed: wikiLinkLook,
    InlineMath: mathLook,
    BulletList: listLook,
    OrderedList: listLook,
    ListItem: itemLook,
    ListMark: listMarkLook,
    Paragraph: paragraphLook,
    Task: paragraphLook,
    TaskMarker: taskBoxLook,
    Blockquote: quoteLook,
    QuoteMark: quoteMarkLook,
    HTMLTag: htmlTagLook,
    FencedCode: codeLook,
    Table: blockLook,
    HTMLBlock: blockLook,
};

/**
 * Draws every empty line half as high as a line of text, so two of them are the air of a line.
 * Only the empty line a key just put the cursor on is a whole line high.
 */
function spaceLook(look: Look): void {
    for (let number: number = 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (listBlankIs(look.state, line)) hide(look, line.from, line.to);
        if (line.from !== look.typing && emptyIs(look.state, line))
            look.decorations.push((gapIs(look.state, line, true) ? stop : gap).range(line.from));
    }
}

/**
 * Marks the editor while the cursor stands on the lower of two empty lines.
 * So its cursor is drawn half a line higher, over both, never reaching into the text below.
 */
function stopCursorOf(view: EditorView): { class: string } | null {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    return range.empty && gapIs(view.state, line, true) ? { class: "cm-stop-cursor" } : null;
}

/** Keeps the invisible characters on the lines of the cursor invisible. */
function invisibleCharsLook(look: Look): void {
    if (!look.focused) return;

    for (const range of look.state.selection.ranges) {
        const from: number = look.state.doc.lineAt(range.from).from;
        for (const match of look.state.sliceDoc(from, look.state.doc.lineAt(range.to).to).matchAll(invisibleRule))
            look.decorations.push(invisibleMark.range(from + match.index, from + match.index + match[0].length));
    }
}

/**
 * Shows the tabs within each selection by their marks, so I see what I select.
 * Where the look hides them the marks stand in place of the hidden stretch, a blank for each other character.
 * Nothing takes room, so no text moves.
 */
function invisiblesLook(look: Look): void {
    const ranges: SelectionRange[] = look.focused
        ? look.state.selection.ranges.filter((range: SelectionRange): boolean => !range.empty)
        : [];
    const selected: (pos: number) => boolean = (pos: number): boolean =>
        ranges.some((range: SelectionRange): boolean => range.from <= pos && pos < range.to);
    look.decorations.forEach((decoration: Range<Decoration>, index: number): void => {
        if (
            decoration.value !== hidden ||
            !ranges.some((range: SelectionRange): boolean => range.from < decoration.to && range.to > decoration.from)
        )
            return;
        const text: string = look.state.sliceDoc(decoration.from, decoration.to);
        const marks: string = text
            .split("")
            .map((char: string, at: number): string =>
                selected(decoration.from + at) && char === "\t" ? tabMark : " ",
            )
            .join("");
        const before: string = /^[-*+][ \t]/.test(look.state.sliceDoc(decoration.to, decoration.to + 2))
            ? "bullet"
            : /^\d+[.)]/.test(look.state.sliceDoc(decoration.to, decoration.to + 10))
              ? "number"
              : "text";
        const widget: ElementWidget = new ElementWidget(
            `<span class="cm-invisibles cm-invisibles-${before}" data-marks="${marks}"></span>`,
        );
        if (/\S/.test(marks))
            look.decorations[index] = Decoration.replace({ widget: widget }).range(decoration.from, decoration.to);
    });
    for (const range of ranges)
        for (const match of look.state.sliceDoc(range.from, range.to).matchAll(/\t/g))
            look.decorations.push(tabShown.range(range.from + match.index, range.from + match.index + 1));
}

/**
 * Finds the person a line names as an item after its role or under {@link responsiblesHeading}.
 *
 * @returns The person and where its name begins in the line, `undefined` for nobody of `Persons.md`
 */
function responsibleOf(state: EditorState, line: Line): [Person, number] | undefined {
    const role: RegExpExecArray | null = roleRule.exec(line.text);
    if (role !== null) {
        const person: Person | undefined = personOf(state.field(personsLoaded), role[2]);
        return person === undefined ? undefined : [person, role[1].length + 4];
    }
    const item: RegExpExecArray | null = responsibleRule.exec(line.text);
    if (item === null) return undefined;
    let above: number = line.number - 1;
    while (above >= 1 && !state.doc.line(above).text.startsWith("#")) above--;
    const named: Person | undefined =
        above >= 1 && state.doc.line(above).text.trim() === responsiblesHeading
            ? personOf(state.field(personsLoaded), item[1])
            : undefined;
    return named === undefined ? undefined : [named, 2];
}

/** Names of people as links to their row in `Persons.md`, while the cursor is not on their line. */
function responsiblesLook(look: Look): void {
    let under: boolean = false;
    for (let number: number = 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (line.text.startsWith("#")) under = line.text.trim() === responsiblesHeading;
        else if ((under || roleRule.test(line.text)) && !touched(look, line.from, line.to)) {
            const named: [Person, number] | undefined = responsibleOf(look.state, line);
            if (named !== undefined)
                look.decorations.push(personMark.range(line.from + named[1], line.from + line.text.trimEnd().length));
        }
    }
}

/** Builds the look of the whole note for its text and cursor. */
function drawingOf(state: EditorState): Drawing {
    const look: Look = {
        state: state,
        links: state.field(linkTargets),
        focused: state.field(focused),
        cursors: cursorsOf(state),
        typing: state.field(typingLine, false) ?? null,
        decorations: [],
        wrappers: [],
        rendered: [],
    };
    syntaxTree(state).iterate({
        enter: (node: SyntaxNodeRef): boolean => looks[node.name]?.(look, node.node) ?? true,
    });
    responsiblesLook(look);
    spaceLook(look);
    invisibleCharsLook(look);
    invisiblesLook(look);
    return { decorations: Decoration.set(look.decorations, true), wrappers: BlockWrapper.set(look.wrappers, true) };
}

/** Folds what the line of a place folds, or unfolds it. */
function foldToggle(view: EditorView, pos: number): void {
    const line: Line = view.state.doc.lineAt(pos);
    let folded: Span | null = null;
    foldedRanges(view.state).between(line.to, line.to, (from: number, to: number): void => {
        if (from === line.to) folded = { from: from, to: to };
    });
    const range: Span | null = folded ?? foldable(view.state, line.from, line.to);
    if (range !== null) view.dispatch({ effects: (folded === null ? foldEffect : unfoldEffect).of(range) });
}

/**
 * Folds every solution of the note, so I try a task before I see its solution.
 * The whole note parsed first, as the editor parses at first only what it shows.
 */
export function solutionsFold(view: EditorView): void {
    forceParsing(view, view.state.doc.length, 1000);
    const ranges: Span[] = [];
    for (let number: number = 1; number <= view.state.doc.lines; number++) {
        const line: Line = view.state.doc.line(number);
        const range: Span | null = solutionRule.test(line.text) ? foldable(view.state, line.from, line.to) : null;
        if (range !== null) ranges.push(range);
    }
    view.dispatch({ effects: ranges.map((range: Span): StateEffect<Span> => foldEffect.of(range)) });
}

/** Scrolls the note to a heading, unfolding what folds it away, else to its top. */
export function headingShow(view: EditorView, heading: string): void {
    let line: Line | undefined;
    const unfolds: StateEffect<Span>[] = [];
    for (let number: number = 1; heading !== "" && line === undefined && number <= view.state.doc.lines; number++)
        if (headingRule.exec(view.state.doc.line(number).text)?.[1] === heading) line = view.state.doc.line(number);
    foldedRanges(view.state).between(line?.from ?? 0, line?.from ?? 0, (from: number, to: number): void => {
        unfolds.push(unfoldEffect.of({ from: from, to: to }));
    });
    view.dispatch({ effects: [...unfolds, EditorView.scrollIntoView(line?.from ?? 0, { y: "start" })] });
}

/**
 * Shows the first row of a table whose first cell reads a text, a third down the page, marked.
 * A table not drawn yet the editor scrolls to first.
 * Then the page scrolls right before it is drawn, so nothing jumps.
 */
export function rowShow(view: EditorView, text: string): void {
    const cellOf: (line: string) => string | null = (line: string): string | null => {
        if (!/^[ \t>]*\|/.test(line)) return null;
        const cell: string = line.split("|")[1]?.trim() ?? "";
        return /^\[([^\]]*)\]\([^)]*\)$/.exec(cell)?.[1].trim() ?? cell;
    };
    let line: Line | undefined;
    for (let number: number = 1; text !== "" && line === undefined && number <= view.state.doc.lines; number++)
        if (cellOf(view.state.doc.line(number).text) === text) line = view.state.doc.line(number);
    if (line === undefined) return;

    const rowOf = (): HTMLTableRowElement | undefined =>
        [...view.contentDOM.querySelectorAll<HTMLTableRowElement>(".cm-rendered tr")].find(
            (shown: HTMLTableRowElement): boolean => shown.cells[0]?.textContent?.trim() === text,
        );
    if (rowOf() === undefined) view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: "start" }) });
    requestAnimationFrame((): void => {
        const row: HTMLTableRowElement | undefined = rowOf();
        const page: HTMLElement | null = view.dom.closest<HTMLElement>(".editor-file");
        if (row === undefined || page === null) return;
        row.classList.add("row-shown");
        page.scrollTop += row.getBoundingClientRect().top - page.getBoundingClientRect().top - page.clientHeight / 3;
    });
}

/** Finds the link at a place of the note, also an address written as it is. */
function linkAt(state: EditorState, pos: number): SyntaxNode | null {
    let url: SyntaxNode | null = null;
    for (const node of upwardOf(syntaxTree(state).resolveInner(pos, 1))) {
        if (node.name === "WikiLink" || node.name === "Link") return node;
        if (node.name === "URL") url = node;
    }
    return url;
}

/** Follows a link of the text. */
function linkFollow(view: EditorView, node: SyntaxNode): void {
    const url: SyntaxNode | null = node.name === "URL" ? node : node.getChild("URL");
    addressFollow(
        view,
        node.name === "WikiLink"
            ? (/^\[\[([^\]|\\]*)/.exec(view.state.sliceDoc(node.from, node.to))?.[1] ?? "")
            : url === null
              ? ""
              : addressOf(view.state, url),
    );
}

/**
 * Follows a link by its address as written, the one place a link is followed.
 * A heading of the same note in a section shows its block alone, since every other block there is hidden.
 * Files open in this window, never in a second tab of NomSystem, only a web address in a new tab.
 *
 * @returns Whether it opened something
 */
function addressFollow(view: EditorView, address: string): boolean {
    if (externalRule.test(address)) {
        window.open(address, "_blank", "noopener");
        return true;
    }

    const hash: number = address.indexOf("#");
    const target: string = (hash === -1 ? address : address.slice(0, hash)).trim();
    const heading: string = hash === -1 ? "" : address.slice(hash + 1).trim();
    const opened: string | null = linkAddressOf(view.state, target, heading);
    if (opened === null || opened === "") return false;
    if (target !== "") location.assign(opened);
    else if (!roundHeadingShow(view, heading)) headingShow(view, heading);
    return true;
}

/** Whether the click before followed a link, so the further clicks of a double click do nothing. */
let followed: boolean = false;

/**
 * Follows a click on a rendered link, or with Ctrl or Cmd held on a link shown as text.
 * The mouse button down keeps the cursor where it is, so the link stays rendered, letting go follows it.
 * The further clicks of a double click do nothing.
 * Else they would put the cursor into what the link showed, where Ctrl+Z would undo instead of going back.
 */
function linkClicked(event: MouseEvent, view: EditorView): boolean {
    if (event.detail > 1 && followed) {
        event.preventDefault();
        return true;
    }
    followed = false;
    if (event.button !== 0 || (!targetIn(event, ".cm-follow") && !event.ctrlKey && !event.metaKey)) return false;

    const pos: number | null = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const node: SyntaxNode | null = pos === null ? null : linkAt(view.state, pos);
    if (node === null) return false;
    event.preventDefault();
    if (event.type === "click") {
        linkFollow(view, node);
        followed = true;
    }
    return true;
}

/** TeX of the rendered formula the press before landed on. */
let formulaPressed: Span | null = null;

/**
 * Gives the TeX of the formula a rendered one stands for, without its `$`.
 * Of the one it replaces, or of the formula `$$…$$` being edited, the first on its line.
 */
function texOf(view: EditorView, box: Element): Span | null {
    const from: number = view.posAtDOM(box);
    let tex: Span | null = null;
    syntaxTree(view.state).iterate({
        from: from,
        to: view.state.doc.lineAt(from).to,
        enter: (node: SyntaxNodeRef): void => {
            const marks: number = view.state.sliceDoc(node.from, node.from + 2) === "$$" ? 2 : 1;
            if (
                tex === null &&
                node.name === "InlineMath" &&
                node.from >= from &&
                (marks === 2 || !box.classList.contains("cm-math-preview"))
            )
                tex = { from: node.from + marks, to: node.to - marks };
        },
    });
    return tex;
}

/**
 * Selects the whole TeX of a rendered formula double clicked, so Ctrl+C copies it.
 * The first click shows the TeX, so the second selects it by the TeX of the first, wherever it lands.
 */
function formulaClicked(event: MouseEvent, view: EditorView): boolean {
    const tex: Span | null = formulaPressed;
    const box: Element | null = (event.target as Element).closest(".cm-math");
    formulaPressed = event.button === 0 && event.detail === 1 && box !== null ? texOf(view, box) : null;
    if (event.button !== 0 || event.detail !== 2 || tex === null) return false;
    event.preventDefault();
    view.dispatch({ selection: { anchor: tex.from, head: tex.to }, userEvent: "select.pointer" });
    return true;
}

/**
 * Copies the selection as the note writes it, with every link it reaches into whole.
 * Else its end before a hidden `](…)` would leave the link out.
 * A copy without a selection and a cut go on to the editor.
 */
function selectionCopied(event: ClipboardEvent, view: EditorView): boolean {
    const state: EditorState = view.state;
    const ranges: SelectionRange[] = state.selection.ranges.filter((range: SelectionRange): boolean => !range.empty);
    if (ranges.length === 0 || event.clipboardData === null) return false;
    event.preventDefault();
    event.clipboardData.setData(
        "text/plain",
        ranges
            .map((range: SelectionRange): string =>
                state.sliceDoc(
                    linkAt(state, range.from)?.from ?? range.from,
                    linkAt(state, range.to - 1)?.to ?? range.to,
                ),
            )
            .join(state.lineBreak),
    );
    return true;
}

/**
 * Follows a click on the name of a person to its row in `Persons.md`.
 * The mouse button down keeps the cursor where it is, so the name stays a link, letting go follows it.
 */
function personClicked(event: MouseEvent, view: EditorView): boolean {
    if (event.button !== 0 || !targetIn(event, ".cm-person")) return false;

    const pos: number | null = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const person: Person | undefined =
        pos === null ? undefined : responsibleOf(view.state, view.state.doc.lineAt(pos))?.[0];
    if (person === undefined) return false;
    event.preventDefault();
    if (event.type === "click") location.assign(personRowAddressOf(person));
    return true;
}

/** Holds the look of the press while the mouse button is down, wherever the pointer goes up. */
function pressHold(event: MouseEvent, view: EditorView): void {
    if (event.button !== 0) return;
    view.dispatch({ effects: pressChange.of(view.state.field(focused) ? cursorsOf(view.state) : []) });
    document.addEventListener("mouseup", (): void => view.dispatch({ effects: pressChange.of(null) }), { once: true });
}

/**
 * Lets a drag take the hidden start of a line, which has no room to point at.
 * An end left of where the text begins reaches to the start of the line, as in VS Code.
 * Set once the button is up and the editor has made the selection.
 */
function marginSelect(event: MouseEvent, view: EditorView): void {
    if (event.button !== 0) return;
    const down: number = event.clientX;
    document.addEventListener(
        "mouseup",
        (up: MouseEvent): void => {
            setTimeout((): void => {
                const range: SelectionRange = view.state.selection.main;
                const reach = (pos: number, x: number): number => {
                    const line: Line = view.state.doc.lineAt(pos);
                    const start: number = line.from + hiddenStartOf(view.state, line);
                    const coords: { left: number } | null = view.coordsAtPos(start);
                    return pos === start && start > line.from && coords !== null && x < coords.left - 4
                        ? line.from
                        : pos;
                };
                if (range.empty || view.state.selection.ranges.length > 1) return;
                const anchor: number = reach(range.anchor, down);
                const head: number = reach(range.head, up.clientX);
                if (anchor !== range.anchor || head !== range.head)
                    view.dispatch({ selection: { anchor: anchor, head: head }, userEvent: "select.pointer" });
            });
        },
        { once: true },
    );
}

/** Leaves a click on the type word of a heading to nothing, the box is no text to edit. */
function kindClicked(event: MouseEvent): boolean {
    if (!targetIn(event, ".block-kind")) return false;
    event.preventDefault();
    return true;
}

/** Takes the files the links lead to anew, as the reader found them for the note just saved. */
export function linksSet(view: EditorView, links: Links): void {
    view.dispatch({ effects: linksFound.of(links) });
}

/**
 * Live preview of a note, its look built again when anything it is built from changes.
 * - {@link StateField}: Holds the look, as only a field may hide line breaks.
 * - {@link EditorView.domEventObservers}: Hold the look before the editor reads where I pressed.
 * - {@link EditorView.domEventHandlers}: Follow a link before the editor puts the cursor there.
 * - {@link codeFolding}: Without the `…` in place of what is folded, since the arrow tells it.
 */
export function livePreview(links: Links, place: string): Extension {
    const look: StateField<Drawing> = StateField.define<Drawing>({
        create: (state: EditorState): Drawing => drawingOf(state),
        update: (drawing: Drawing, transaction: Transaction): Drawing =>
            transaction.docChanged ||
            transaction.selection !== undefined ||
            transaction.state.field(focused) !== transaction.startState.field(focused) ||
            transaction.state.field(frozen) !== transaction.startState.field(frozen) ||
            syntaxTree(transaction.state) !== syntaxTree(transaction.startState) ||
            foldedRanges(transaction.state) !== foldedRanges(transaction.startState) ||
            transaction.state.field(linkTargets) !== transaction.startState.field(linkTargets) ||
            transaction.state.field(personsLoaded) !== transaction.startState.field(personsLoaded)
                ? drawingOf(transaction.state)
                : drawing,
        provide: (field: StateField<Drawing>): Extension => [
            EditorView.decorations.from(field, (drawing: Drawing): DecorationSet => drawing.decorations),
            EditorView.blockWrappers.from(field, (drawing: Drawing): RangeSet<BlockWrapper> => drawing.wrappers),
        ],
    });
    return [
        focused,
        pointed,
        frozen,
        linkTargets.init((): Links => links),
        personsLoaded,
        personsLoad,
        notePlace.of(place),
        codeFolding({ placeholderDOM: (): HTMLElement => document.createElement("span") }),
        keymap.of(foldKeymap),
        look,
        caretPlace,
        EditorView.editorAttributes.of(stopCursorOf),
        EditorView.updateListener.of(focusKeep),
        EditorView.domEventObservers({ mousedown: pressHold }),
        EditorView.domEventObservers({ mousedown: marginSelect }),
        EditorView.domEventHandlers({ mousedown: kindClicked }),
        EditorView.domEventHandlers({ mousedown: personClicked, click: personClicked }),
        EditorView.domEventHandlers({ mousedown: linkClicked, click: linkClicked }),
        EditorView.domEventHandlers({ mousedown: formulaClicked }),
        EditorView.domEventHandlers({ copy: selectionCopied }),
        syntaxHighlighting(highlighter),
        syntaxHighlighting(codeHighlighter),
    ];
}
