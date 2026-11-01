/**
 * ## Live preview
 *
 * Shows a note in the editor as Obsidian's live preview does:
 * the text of the file as it is,
 * its Markdown drawn as in the scripts view with the markup hidden,
 * and the markup shown where the cursor is, to edit it.
 * Only the look changes, never the text:
 * every hidden or rendered piece stays in the text as written.
 * Away from the cursor a note looks as in the scripts view,
 * drawn by the rules of the scripts view in `../notes/notes.css`:
 * - Headings, lists and quotes stand in the elements the scripts view draws them in,
 *   so they get its sizes, its bullets and numbers,
 *   its indentation per level with an item's wrapped and further lines under its text,
 *   its guide lines and the line of quotes.
 *   Their `##`, `>`, indentation, `-` and `1.` are hidden;
 *   on the line of the cursor the `##` and `>` show left of the text,
 *   and the `-` or number of an item shows in place of its bullet
 *   or number, so the text never moves.
 * - Every line of the file one line on the page, in the tighter lines of the editor,
 *   see `./editor.css`; an empty line half as high, a small gap, see {@link spaceLook},
 *   so one empty line is the air between two paragraphs and two are the air of a line;
 *   no room of their own around headings and paragraphs, nor in a list,
 *   where the guide line of sub-points runs on through the empty lines to the next point,
 *   see {@link itemLook}.
 * - The type word of a block of a section at the start of a heading `##`,
 *   a small grey box before the name,
 *   as in the tree, hanging left of the page where the file has room, see `./editor.css`,
 *   as written on the line of the cursor, see {@link headingLook}.
 * - Bold, italic, struck and code without `**`, `*`,
 *   `~~` and `` ` ``, Markdown links and wiki links `[[Note#Heading|Text]]`
 *   as their text; the markup of the piece the cursor touches shows.
 * - Line breaks `<br>` and break opportunities `<wbr>` drawn as in the scripts view,
 *   so `<br><wbr>` at the end of a line leaves an empty line below it;
 *   as their text while the cursor touches them.
 * - Task boxes `[ ]` and `[x]` as the boxes of the scripts view, which a click ticks,
 *   as written on the line of the cursor.
 * - Formulas `$…$` and `$$…$$` rendered as in the scripts view, never broken inside,
 *   with the punctuation right after one on its line, see {@link mathLook};
 *   as their TeX while the cursor touches them;
 *   a formula `$$…$$` being edited shows rendered below its TeX, as in Obsidian.
 * - Images shown, see {@link imageLook};
 *   tables, callouts `> [!note] Title`,
 *   code blocks and HTML blocks like `<table>` rendered as in the scripts view,
 *   those right below each other as one,
 *   as their text while the cursor is on one of their lines,
 *   as Obsidian shows a callout;
 *   a table opens whole over the file by the button at its top right,
 *   to edit as a spreadsheet, see `./table.ts`.
 * - Invisible characters like the soft hyphen blank, as in the scripts view;
 *   within a selection a tab shows as a faint `→`,
 *   also where the look hides it, like the indentation of a list, so I see what I select,
 *   see {@link invisiblesLook}.
 * - The cursor never stands in what is hidden, so every key moves it where I see it,
 *   see {@link caretPlace}.
 * - While I select by keys, only what the cursor reaches shows as text,
 *   never what the selection covers;
 *   what I select with the mouse keeps its look,
 *   so no text moves under the cursor or the pointer, see {@link cursorsOf}.
 * - Each heading folds its section, up to the next heading of its level or higher,
 *   by a click on its arrow after its text, as in the scripts view,
 *   and each list item with sub-points folds them
 *   and its further lines by its arrow left of its bullet,
 *   shown under the pointer, as in Obsidian;
 *   one click folds, one click unfolds, see {@link FoldWidget};
 *   a solution, the section under `#### Solution`,
 *   comes folded, see {@link solutionsFold},
 *   so I try a task before I see its solution.
 * A click on a rendered piece puts the cursor there,
 * so it shows as text, on a rendered table a double click,
 * so a single one leaves it to scroll,
 * see {@link BlockWidget}; while the editor is not focused,
 * like before the first click, the whole note shows rendered.
 * A click on a rendered link follows it, as in Obsidian, in a heading too,
 * whose text a click after its end edits,
 * and so does a click with Ctrl held on a link shown as text, see {@link addressFollow}.
 * A copy takes the selection as the note writes it, a formula as its TeX,
 * with every link it reaches into whole, so a link copied stays a link,
 * see {@link selectionCopied}.
 * Links resolve as the reader found them when the note was read or saved last,
 * see {@link linksSet}: a link that leads nowhere fades and leads nowhere,
 * a link or image written since works once the note is saved.
 * A relative link in a file of my new system leads where VSCodium follows it,
 * see {@link linkAddressOf}:
 * a file of my new system opens in the editor, a note in the scripts view,
 * the folder of a module as its overview;
 * any other place fades, opening only on the computer.
 * A name of a person in the column `Lecturers`, `Tutor` or `Head` of a rendered table,
 * is a link to its row in `Persons.md`, see `../persons.ts`,
 * a name of nobody there plain text,
 * and so is the name of an item under `## Modulverantwortliche` of a module file,
 * see {@link responsiblesLook};
 * the row an address names scrolls into sight marked, see {@link rowShow}.
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
import { columnsOf, emptyEndOf, emptyIs, quotePrefixOf, textIndentationOf, typingLine } from "./keys.ts";
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

/**
 * For each link of a note as written: path of the file it leads to,
 * `null` when it leads nowhere, as the reader sends it.
 */
export type Links = {
    [link: string]: string | null;
};

/** What the look of a note is built from, see {@link decorationsOf}. */
type Look = {
    state: EditorState;
    links: Links;
    focused: boolean;
    cursors: number[];
    decorations: Range<Decoration>[];
    wrappers: Range<BlockWrapper>[];
    rendered: number[];
};

/** Stretch of the text, like what a heading folds or the TeX of a formula. */
type Span = { from: number; to: number };

/** Look of a note: its decorations and the elements its lines stand in. */
type Drawing = {
    decorations: DecorationSet;
    wrappers: RangeSet<BlockWrapper>;
};

/** Endings of images shown when embedded, as in the scripts view. */
const imageRule: RegExp = /\.(?:png|jpe?g|gif|bmp|svg|webp|avif)$/i;

/** Pieces of syntax drawn in an element of their own, see {@link wrap}. */
const wrapped: string[] = ["BulletList", "OrderedList", "ListItem", "Blockquote"];

/** Blocks rendered whole while the cursor is on none of their lines. */
const renderedWhole: string[] = ["Table", "FencedCode", "HTMLBlock"];

/** First line of a callout from its `>`, as the scripts view reads it. */
const calloutRule: RegExp = /^>[ \t]?\[![^\]]+\]/;

/** Line break `<br>` or break opportunity `<wbr>` within a line. */
const breakRule: RegExp = /^<(br|wbr)\s*\/?>$/i;

/**
 * Address with a scheme, like `https://…`:
 * a link out of my modules, opened as it is, as in the scripts view.
 */
const externalRule: RegExp = /^[a-z][a-z\d+.-]*:/i;

/** Heading of a note, `##` and its text, with the text as written. */
const headingRule: RegExp = /^#{1,6}[ \t]+(.*?)[ \t]*$/;

/**
 * Heading of the section of a module file that names the people responsible for it,
 * one item `- Nachname, Vorname` each,
 * as `Persons.md` names them, see {@link responsibleOf}.
 */
const responsiblesHeading: string = "## Modulverantwortliche";

/** Item of the list under {@link responsiblesHeading}, `- ` and the name of a person. */
const responsibleRule: RegExp = /^- (\S.*?)[ \t]*$/;

/**
 * Item of a list that names a person by its role, see `peopleRoles` in `../persons.ts`:
 * its role and the name.
 */
const roleRule: RegExp = new RegExp(`^- (${peopleRoles.join("|")}): (\\S.*?)[ \\t]*$`);

/**
 * Heading of a solution, like `#### Solution` or `#### Solution (own, unchecked)`,
 * as the scripts view folds it.
 */
const solutionRule: RegExp = /^####[ \t]+Solution\b/;

/** Invisible format characters, like the soft hyphen and the zero-width space. */
const invisibleRule: RegExp = /\p{Cf}/gu;

/** Markup hidden. */
const hidden: Decoration = Decoration.replace({});

/** Bullet `-` of the list item the cursor is on, in place of the bullet. */
const bulletMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-bullet" });

/** Number of the list item the cursor is on, in place of the number. */
const numberMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-number" });

/** Markup `##` or `>` on the line of the cursor, left of the text, see `./editor.css`. */
const hanging: Decoration = Decoration.mark({ class: "cm-hanging" });

/** Type word of a block at the start of its heading, as a small grey box. */
const kindBox: Decoration = Decoration.mark({ class: "block-kind" });

/** Invisible character on the line of the cursor, kept invisible. */
const invisibleMark: Decoration = Decoration.mark({ class: "cm-hidden-char" });

/**
 * Mark of a tab within a selection,
 * as VS Code shows it with `renderWhitespace: selection`, see {@link invisiblesLook}.
 */
const tabMark: string = "→";

/**
 * Tab within a selection where it takes its room, its mark drawn faintly over it,
 * taking no room of its own, see `./editor.css`.
 */
const tabShown: Decoration = Decoration.mark({
    class: "cm-invisible",
    attributes: { "data-mark": tabMark },
});

/** Text of a rendered link, which a click follows, see {@link linkClicked}. */
const followable: Decoration = Decoration.mark({ class: "cm-follow" });

/**
 * Text of a rendered link out of my modules, like `https://…`,
 * which a click opens in a new tab, with Obsidian's arrow out of a box after it,
 * as in the scripts view, see `../notes/notes.css`.
 */
const external: Decoration = Decoration.mark({ class: "cm-follow cm-external" });

/**
 * Name of a person under `## Modulverantwortliche` of a module file
 * or after its role in a list, which a click follows to its row in `Persons.md`,
 * which a click follows to its row in `Persons.md`,
 */
const personMark: Decoration = Decoration.mark({ class: "cm-follow cm-person" });

/**
 * Text of a rendered link to a place the dashboard does not open:
 * faded, its tooltip saying where it opens, and no click follows it.
 */
const computerOnly: Decoration = Decoration.mark({
    class: "is-computer-only",
    attributes: { title: "Opens only on the computer" },
});

/** Empty line, drawn half as high as a line of text, see {@link spaceLook}. */
const gap: Decoration = Decoration.line({ class: "cm-gap" });

/**
 * Empty line right below another, a place to write, see {@link gapIs}:
 * half as high below the half line above it, its cursor a whole line high from its top,
 * where text typed on it stands, see {@link spaceLook} and `./editor.css`.
 */
const stop: Decoration = Decoration.line({ class: "cm-gap cm-stop" });

/**
 * Formula with the punctuation right after it, kept on one line,
 * see {@link mathLook} and `../notes/notes.css`;
 * inclusive at its start, so it opens before the drawn formula and holds it,
 * not only the punctuation.
 */
const unbroken: Decoration = Decoration.mark({
    class: "math-unbroken",
    inclusiveStart: true,
});

/** Line of a code block being edited. */
const codeLine: Decoration = Decoration.line({ class: "cm-code-block" });

/** Line of the code of a code block being edited, indented as the code rendered. */
const codeText: Decoration = Decoration.line({ class: "cm-code-text" });

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

/** Effect of the editor getting the focus, `true`, or losing it, `false`. */
const focusChange: StateEffectType<boolean> = StateEffect.define<boolean>();

/**
 * Whether the editor has the focus, from the last {@link focusChange}; not at first.
 */
const focused: StateField<boolean> = effectField(focusChange, false);

/**
 * Tells {@link focused} the focus right
 * after any update of the editor that leaves it behind,
 * not by CodeMirror's news of the focus,
 * which it drops once another transaction comes first,
 * like the press held by {@link pressHold} when I come back from another window
 * by a click into the text: no heading or formula opened then,
 * the whole note staying rendered until the page loaded anew.
 */
function focusKeep(update: ViewUpdate): void {
    if (update.view.hasFocus === update.state.field(focused)) return;
    queueMicrotask((): void => {
        const focus: boolean = update.view.hasFocus;
        if (focus !== update.view.state.field(focused)) update.view.dispatch({ effects: focusChange.of(focus) });
    });
}

/**
 * Whether the pointer made the selection, by a click or a drag, see {@link cursorsOf};
 * a key, typing and any other change of the selection make it `false` again.
 */
const pointed: StateField<boolean> = StateField.define<boolean>({
    create: (): boolean => false,
    update: (value: boolean, transaction: Transaction): boolean =>
        transaction.selection === undefined ? value : transaction.isUserEvent("select.pointer"),
});

/**
 * Effect of the mouse button going down in the text,
 * with the places of the cursors that show as text at that moment,
 * or up again, `null`, see {@link frozen}.
 */
const pressChange: StateEffectType<number[] | null> = StateEffect.define<number[] | null>();

/**
 * Places of the cursors that show as text
 * while the mouse button is down after a press in the text:
 * those of the moment of the press,
 * so a click or a drag changes nothing of the look until the button goes up,
 * see {@link cursorsOf}; `null` while it is up.
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

/** Effect of the files of the links found anew, see {@link linksSet}. */
const linksFound: StateEffectType<Links> = StateEffect.define<Links>();

/**
 * Files the links of the note lead to,
 * as the reader found them when the note was read or saved last;
 * none at first, see {@link livePreview}.
 */
const linkTargets: StateField<Links> = effectField(linksFound, {});

/** Effect of the people of `Persons.md` being loaded, see {@link personsLoad}. */
const personsFound: StateEffectType<Person[]> = StateEffect.define<Person[]>();

/**
 * The people of `Persons.md`, whose names under `## Modulverantwortliche` are links,
 * see {@link responsiblesLook};
 * none until they are loaded, see {@link personsLoad}.
 */
const personsLoaded: StateField<Person[]> = effectField(personsFound, []);

/**
 * Loads the people of `Persons.md` once the editor stands,
 * see `personsKept` in `../persons.ts`,
 * and hands them to {@link personsLoaded}, unless the editor is gone by then.
 */
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

/**
 * Path of the note in `NomWorkspace`,
 * from which its relative links lead,
 * see {@link linkAddressOf}; given once by {@link livePreview}.
 */
const notePlace: Facet<string, string> = Facet.define<string, string>({
    combine: (places: readonly string[]): string => places[0] ?? "",
});

/**
 * Classes of the pieces of syntax, for their look in `./editor.css`;
 * markup like `##`, `**` and `1.` is `cm-mark`.
 */
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
 * Widget drawn by its fields alone:
 * another of its kind with the same fields looks the same, so the drawn one stays.
 * Its events stay its own, as CodeMirror keeps those of a widget from the editor,
 * which would put the cursor at its start or end on a click,
 * see {@link PassingWidget} for a widget a click goes through.
 */
abstract class FieldsWidget extends WidgetType {
    /** Tells whether another widget of its kind has the same fields. */
    override eq(other: WidgetType): boolean {
        return Object.entries(this).every(
            ([field, value]: [string, unknown]): boolean =>
                (other as unknown as { [field: string]: unknown })[field] === value,
        );
    }
}

/**
 * Widget a click goes through to the editor, which puts the cursor at it,
 * as on the text beside it, so a formula shows as TeX,
 * and a double click, which selects the TeX of a formula, see {@link formulaClicked}.
 */
abstract class PassingWidget extends FieldsWidget {
    override ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Fold arrow of a heading or a list item, see the top of this file,
 * and of the time zone of a calendar file, see `./ics.ts`:
 * down while open, turned right while folded;
 * a click on it folds or unfolds, see {@link foldToggle},
 * and leaves the cursor where it is.
 */
export class FoldWidget extends FieldsWidget {
    constructor(
        /** Whether it belongs to a list item, else to a heading or a time zone. */
        readonly item: boolean,
        /** Whether what it folds is folded. */
        readonly folded: boolean,
    ) {
        super();
    }

    /**
     * Draws the arrow, its words for screen readers and as tooltip,
     * which folds or unfolds on a click.
     */
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

/**
 * Formula rendered by MathJax, as the scripts view renders it:
 * `$…$` within the line, `$$…$$` on its own.
 */
class MathWidget extends PassingWidget {
    constructor(
        /** TeX of the formula, without its `$`. */
        readonly tex: string,
        /** Whether it is a formula `$$…$$`. */
        readonly display: boolean,
        /** Whether it shows above its TeX being edited. */
        readonly preview: boolean,
    ) {
        super();
    }

    /** Renders the formula as the scripts view does. */
    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        const math: HTMLSpanElement = document.createElement("span");
        box.className = "cm-math";
        if (this.preview) box.className = "cm-math cm-math-preview";
        else if (this.display) box.className = "cm-math cm-math-display";
        math.className = `math math-${this.display ? "block" : "inline"}`;
        math.textContent = this.tex;
        box.append(math);
        mathRender(box);
        return box;
    }
}

/** Image, as the scripts view shows it, at its own size. */
class ImageWidget extends PassingWidget {
    constructor(
        /** Address of the image at the reader. */
        readonly address: string,
    ) {
        super();
    }

    /** Shows the image; once loaded, the editor measures its lines again. */
    toDOM(view: EditorView): HTMLElement {
        const image: HTMLImageElement = document.createElement("img");
        image.className = "internal-embed";
        image.src = this.address;
        image.addEventListener("load", (): void => view.requestMeasure());
        return image;
    }
}

/**
 * Task box of a list item, as the scripts view shows it, which a click ticks or unticks,
 * as in Obsidian: `[ ]` becomes `[x]` and back, the cursor staying where it is;
 * in a file to read only it cannot be ticked.
 */
class TaskBoxWidget extends FieldsWidget {
    constructor(
        /** Whether it is ticked, `[x]`. */
        readonly done: boolean,
    ) {
        super();
    }

    /**
     * Shows the box, as marked writes it for the scripts view;
     * a click writes `x` or a space between its brackets.
     */
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
 * Line break `<br>` or break opportunity `<wbr>`,
 * drawn as the element itself, as in the scripts view:
 * `<br>` breaks the line, and a `<wbr>` after it at the end
 * of a line holds the empty line below it.
 */
class BreakWidget extends PassingWidget {
    constructor(
        /** Element drawn, `br` or `wbr`. */
        readonly tagName: string,
    ) {
        super();
    }

    /** Draws the element. */
    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        box.append(document.createElement(this.tagName));
        return box;
    }
}

/**
 * Tabs the look hides, like the indentation of a line of a list,
 * as far as a selection covers them:
 * their marks, see {@link tabMark}, faint left of where the text begins,
 * or of the bullet or number of a point, taking no room, so I see what I select,
 * see {@link invisiblesLook}.
 */
class InvisiblesWidget extends PassingWidget {
    constructor(
        /** The marks, a blank for each other character hidden with them. */
        readonly marks: string,
        /**
         * What the hidden stretch stands before:
         * `bullet` or `number` for the indentation of a point,
         * whose marks go left of its bullet or number, else `text`.
         */
        readonly before: string,
    ) {
        super();
    }

    /** Draws the marks, see `./editor.css`. */
    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        box.className = `cm-invisibles cm-invisibles-${this.before}`;
        box.dataset.marks = this.marks;
        return box;
    }
}

/**
 * Tables, callouts, code blocks or HTML blocks right below each other,
 * rendered as the scripts view renders them, with their images, formulas and links,
 * a link that leads nowhere faded, without space of their own above and below them,
 * which only the empty lines around them give, as around any block, see `./editor.css`.
 */
class BlockWidget extends FieldsWidget {
    constructor(
        /** Markdown of the blocks, their whole lines. */
        readonly markdown: string,
        /** Files the links of the note lead to. */
        readonly links: Links,
        /** Length of their lines in the note, with their indentation. */
        readonly length: number,
    ) {
        super();
    }

    /**
     * Renders the blocks; once an image of them is loaded,
     * the editor measures its lines again.
     * A table of them wider than the page scrolls sideways on its own,
     * marked so, see `.markdown table.is-wide` in `../notes/notes.css`,
     * framed and as high as all its rows, measured again whenever its size changes,
     * like when the window narrows, and the editor measures its lines again;
     * every code block of them names its language by the list at its top right,
     * see {@link fencesOf},
     * the languages of `../notes/code.ts`,
     * picking one writes it after its ```, `–` takes it away;
     * every table of them opens whole over the file by the button at its top right,
     * to edit as a spreadsheet,
     * see {@link tableOpen}.
     * A click on a link of them follows it,
     * see {@link addressFollow}, a click on the title of a callout
     * that folds opens or closes it,
     * as in the scripts view, and the editor measures its lines again;
     * a press on a scrollbar of a part too wide or too high,
     * like a code block, only scrolls it;
     * any other click or tap puts the cursor at the place of their text I pressed,
     * see {@link blockPlaceOf}, so they show
     * as text with the cursor there, ready to type;
     * but a click or tap on a table leaves it rendered,
     * so I can scroll it, by its scrollbars too, by the wheel, the touchpad or a swipe,
     * and only a double click or double tap on it puts the cursor there.
     * - `mousedown`: Its default, focusing the editor with the cursor beside them,
     *   so they show as text, prevented,
     *   but on the list of a code block, which then opens;
     *   a scrollbar still drags.
     * - `follow`: Follows the link clicked, here or in a table opened over the file,
     *   see {@link addressFollow}, a person to its row in `Persons.md` in this window,
     *   see `../persons.ts`, and tells whether it opened something,
     *   so a link that opens only on the computer leaves the table open.
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
                const runs: number[] = tableRunsOf(view, from, from + this.length);
                if (runs[index] !== undefined)
                    tableOpen(
                        view,
                        view.state.doc.line(runs[index]).from,
                        (markdown: string): HTMLElement => blockRender(view, markdown, this.links),
                        follow,
                    );
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
                view.dispatch({
                    changes: {
                        from: from + fence.from,
                        to: from + fence.to,
                        insert: pick.value,
                    },
                });
            });
            pre.replaceWith(frame);
            frame.append(pre, pick);
        }
        const place: (event: MouseEvent) => void = (event: MouseEvent): void => {
            const from: number = view.posAtDOM(block);
            view.focus();
            view.dispatch({
                selection: {
                    anchor: blockPlaceOf(view, from, from + this.length, event),
                },
            });
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

/**
 * The ``` that opens a code block: where what follows it on its line begins and ends,
 * from the start of the blocks of a {@link BlockWidget}, and that text, its language.
 */
type Fence = { from: number; to: number; info: string };

/**
 * Finds the ``` or `~~~` that open the code blocks of Markdown, in a quote too,
 * each closed by the next of the same kind, at least as long, with nothing after it.
 */
function fencesOf(markdown: string): Fence[] {
    const fences: Fence[] = [];
    let open: string | null = null;
    let at: number = 0;
    for (const line of markdown.split("\n")) {
        const fence: RegExpExecArray | null = /^((?:[ \t]*>[ \t]?)*[ \t]*)(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence !== null && open === null) {
            open = fence[2];
            fences.push({
                from: at + fence[1].length + fence[2].length,
                to: at + line.length,
                info: fence[3].trim(),
            });
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

/** Builds the address of a file at the reader, like an image of a note. */
function fileAddressOf(path: string): string {
    return `/api/notes/file?path=${encodeURIComponent(path)}`;
}

/**
 * Renders Markdown as the scripts view does, with its images, formulas and links,
 * a link that leads nowhere faded,
 * and so is one to a place the dashboard does not open,
 * without the dots, see {@link computerOnly},
 * once an image is loaded, the editor measures its lines again.
 * Renders rendered blocks, see {@link BlockWidget},
 * and a table opened over the file, see `./table.ts`.
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

/** Tells whether an event happened within an element of a selector. */
function targetIn(event: Event, selector: string): boolean {
    return (event.target as Element).closest(selector) !== null;
}

/**
 * Tells whether a click hit a scrollbar of a part
 * of rendered blocks too wide or too high, see {@link BlockWidget}:
 * below or right of its rows, within its box.
 */
function scrollbarHit(event: MouseEvent): boolean {
    const target: Element = event.target as Element;
    return (
        (target.scrollWidth > target.clientWidth && event.offsetY >= target.clientHeight) ||
        (target.scrollHeight > target.clientHeight && event.offsetX >= target.clientWidth)
    );
}

/**
 * Finds the place in the text of rendered blocks that a click hit,
 * see {@link BlockWidget}:
 * in a table the cell clicked, see {@link cellPlaceOf};
 * elsewhere, like in a code block, the letter clicked, found by the text around it;
 * else the end of the blocks, after a code block's closing fence,
 * so typing never breaks it.
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
 * Finds the place in the text of a table for a click on one of its cells:
 * its row is a line of the table, the line of `-` under the head left out,
 * the tables of the blocks being their runs of lines that begin with `|`;
 * in the row the text of the cell, after its `|` and the blanks after it,
 * escaped `|` like in `[[…\|…]]` not counted,
 * at the letter clicked where the cell's text holds it as it is,
 * like a number, else at its start, like for a formula.
 * - `text`, `offset`: The text node clicked and the place in it, see {@link blockPlaceOf}.
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

/**
 * Finds the tables in the text of rendered blocks, see {@link BlockWidget}:
 * their runs of lines that begin with `|`,
 * after the indentation and the `>` of a quote or callout around them,
 * in the order the blocks show them.
 */
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
 * Gives where the cursors stand, whose places show as text, see {@link touched}:
 * of each selection its end that a key moves,
 * so a selection made by Shift and the arrows shows as text only what its cursor reaches,
 * like a link it goes into, never what it covers;
 * none of a selection made by the pointer, which keeps the look,
 * but of one inside a formula, made in its TeX, which so stays its text to edit,
 * see {@link formulaHolds};
 * while the mouse button is down
 * after a press in the text those of the moment of the press,
 * see {@link frozen}, so no text moves under the pointer while I click or drag,
 * and a click shows what it touches as text once I let go.
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

/**
 * Tells whether a formula holds a stretch of the text, at its ends too,
 * like a selection made by the pointer in its TeX, see {@link cursorsOf}.
 */
function formulaHolds(state: EditorState, range: SelectionRange): boolean {
    const formula: SyntaxNode | undefined = upwardOf(syntaxTree(state).resolveInner(range.from, 1)).find(
        (node: SyntaxNode): boolean => node.name === "InlineMath",
    );
    return formula !== undefined && formula.from <= range.from && formula.to >= range.to;
}

/**
 * Tells whether a cursor touches a stretch of the text, also at its ends,
 * while I am editing, see {@link cursorsOf}.
 */
function touched(look: Look, from: number, to: number): boolean {
    return look.focused && look.cursors.some((cursor: number): boolean => cursor >= from && cursor <= to);
}

/** Draws a widget in place of a stretch of the text. */
function widgetPut(look: Look, widget: WidgetType, from: number, to: number): void {
    look.decorations.push(Decoration.replace({ widget: widget }).range(from, to));
}

/** Hides a stretch of markup. */
function hide(look: Look, from: number, to: number): void {
    if (from < to) look.decorations.push(hidden.range(from, to));
}

/**
 * Gives the end of markup like `##` or `>`,
 * with the space or tab after it, which goes with it.
 */
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
 * Puts the lines of a piece of syntax into an element,
 * as the scripts view draws the piece,
 * like a list item into an `li`, so the rules of the scripts view give it their look.
 * Pieces inside each other nest by rank:
 * the deeper a piece lies among those of {@link wrapped}, the lower its rank.
 *
 * @param to - Where the lines put into it end, the end of the piece unless told:
 *   a heading's right after the start of its line, so the row of a task after it,
 *   see `./tasks.ts`, stands outside it, in the text of the note
 * @param from - Where they begin, the start of the piece unless told,
 *   like the part of a list below the line of the cursor, see {@link listLook}
 */
function wrap(
    look: Look,
    node: SyntaxNode,
    tagName: string,
    attributes: { [name: string]: string } = {},
    to: number = node.to,
    from: number = node.from,
): void {
    const depth: number = upwardOf(node.parent).filter((parent: SyntaxNode): boolean =>
        wrapped.includes(parent.name),
    ).length;
    look.wrappers.push(
        BlockWrapper.create({
            tagName: tagName,
            attributes: attributes,
            rank: 100 - depth,
        }).range(look.state.doc.lineAt(from).from, to),
    );
}

/**
 * Puts the fold arrow of a heading after its text,
 * or of a list item at the start of its line,
 * from where `./editor.css` moves it left of its bullet,
 * when the line folds something, see {@link FoldWidget}.
 */
function foldLook(look: Look, line: Line, item: boolean): void {
    if (foldable(look.state, line.from, line.to) === null) return;

    look.decorations.push(
        Decoration.widget({
            widget: new FoldWidget(item, foldedAt(look.state, line.to)),
            side: item ? -1 : 1,
        }).range(item ? line.from : line.to),
    );
}

/**
 * Heading `##`: its line in an `h2`, as the scripts view draws it, its `##` hidden,
 * on the line of the cursor shown left of the text, which keeps its place;
 * its fold arrow after its text.
 * The type word of a block at its start,
 * a small grey box before the name,
 * its dot and space hidden, also while the cursor stands in the name,
 * so a click into a heading moves none of its text;
 * as written only while the cursor touches it,
 * see {@link kindRule}; no text to click into, see {@link kindClicked}.
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

/**
 * Bold, italic, struck or code:
 * its `**`, `*`, `~~` or `` ` `` hidden while the cursor does not touch it.
 */
function markupLook(look: Look, node: SyntaxNode): boolean {
    if (!touched(look, node.from, node.to))
        for (let child: SyntaxNode | null = node.firstChild; child !== null; child = child.nextSibling)
            if (child.name.endsWith("Mark")) hide(look, child.from, child.to);
    return true;
}

/**
 * Markdown link `[Text](Address)`: only its text while the cursor does not touch it,
 * which a click follows, a link out of my modules with an arrow after it,
 * one that leads nowhere or opens only on the computer faded, see {@link linkMarkOf}.
 * Brackets without an address, like the `[!note]` of a callout, are no link,
 * as in the scripts view, and stay as written.
 */
function linkLook(look: Look, node: SyntaxNode): boolean {
    const marks: SyntaxNode[] = node.getChildren("LinkMark");
    const url: SyntaxNode | null = node.getChild("URL");
    if (url === null || marks.length < 2 || touched(look, node.from, node.to)) return true;

    const address: string = look.state.sliceDoc(url.from, url.to).replace(/^<|>$/g, "");
    const target: string = address.split("#")[0].trim();
    hide(look, node.from, marks[0].to);
    hide(look, marks[1].from, node.to);
    if (marks[0].to < marks[1].from)
        look.decorations.push(
            (externalRule.test(address) ? external : linkMarkOf(look.state, target)).range(marks[0].to, marks[1].from),
        );
    return true;
}

/**
 * Address of the web written as it is, like `https://…`,
 * which GitHub's Markdown takes as a link:
 * followed by a click while the cursor does not touch it,
 * with an arrow after it as a link out of my modules;
 * the address of a Markdown link is hidden there anyway.
 */
function urlLook(look: Look, node: SyntaxNode): boolean {
    if (node.parent?.name !== "Link" && node.parent?.name !== "Image" && !touched(look, node.from, node.to))
        look.decorations.push(external.range(node.from, node.to));
    return false;
}

/**
 * Markdown image while the cursor does not touch it,
 * shown at its own size when the reader found its file, else left as its text.
 * Its target is the link before `#`, as the reader lists it.
 */
function imageLook(look: Look, node: SyntaxNode): boolean {
    const url: SyntaxNode | null = node.getChild("URL");
    if (url === null || touched(look, node.from, node.to)) return false;

    const address: string = look.state.sliceDoc(url.from, url.to).replace(/^<|>$/g, "");
    const target: string = address.split("#")[0].trim();
    const path: string | null | undefined = look.links[target];
    if (imageRule.test(target) && typeof path === "string")
        widgetPut(look, new ImageWidget(fileAddressOf(path)), node.from, node.to);
    return false;
}

/**
 * Wiki link or embed, while the cursor does not touch it: only its text after `|`,
 * or its target without one, which a click follows, faded when it leads nowhere
 * or opens only on the computer, see {@link linkMarkOf}.
 * Its target is the link before `#`,
 * `|` or the `\|` written in tables, as the reader lists it.
 */
function wikiLinkLook(look: Look, node: SyntaxNode): boolean {
    if (touched(look, node.from, node.to)) return false;

    const text: string = look.state.sliceDoc(node.from, node.to);
    const open: number = node.name === "WikiEmbed" ? 3 : 2;
    const bar: RegExpExecArray | null = /\\?\|/.exec(text);
    const shownFrom: number = node.from + (bar === null ? open : bar.index + bar[0].length);
    const shownTo: number = node.to - 2;
    const target: string = /^!?\[\[([^\]#|\\]*)/.exec(text)?.[1].trim() ?? "";

    hide(look, node.from, shownFrom);
    hide(look, shownTo, node.to);
    if (shownFrom < shownTo) look.decorations.push(linkMarkOf(look.state, target).range(shownFrom, shownTo));
    return false;
}

/**
 * Builds the address a link of the note opens, see {@link addressFollow}:
 * a heading of the note itself as `#` and the heading;
 * a file the reader found the link to lead to, a note in the scripts view at its heading,
 * any other file, like a PDF, at the reader at the place after `#`;
 * else the place in `NomWorkspace` it leads to as a relative link from a file
 * of my new system, see `linkPlaceOf` and `placeAddressOf` in `../notes/tree.ts`,
 * as VSCodium follows it. A link of a note of my modules the reader found nothing
 * for leads nowhere, but for one leading out of its module,
 * where the reader does not look.
 * - `path`: The file the reader found the link to lead to, `null` for none,
 *   `undefined` for a link it did not look at,
 *   like every link of a file of my new system, or one written since.
 *
 * @returns Address, `null` for a link that leads nowhere,
 *   empty for one to a place the dashboard does not open,
 *   which opens only on the computer
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
 * Look of the text of a rendered link, see {@link linkAddressOf}:
 * followed by a click; faded when it opens only on the computer, see {@link computerOnly};
 * when it leads nowhere faded and dotted below,
 * as in the scripts view, its tooltip naming what it looked for,
 * so a broken source stands out, and no click follows it.
 */
function linkMarkOf(state: EditorState, target: string): Decoration {
    const address: string | null = linkAddressOf(state, target, "");
    if (address !== null) return address === "" ? computerOnly : followable;
    return Decoration.mark({
        class: "is-unresolved",
        attributes: { title: `Leads nowhere: ${target}` },
    });
}

/**
 * Formula: rendered while the cursor does not touch it,
 * a formula `$…$` with the punctuation right after it on its line,
 * as in the scripts view, see `mathInline` in `../notes/markdown.ts`;
 * else its TeX, also while a selection by the pointer lies in it, see {@link cursorsOf},
 * a formula `$$…$$` rendered above its TeX, where it stood,
 * so the formula I click stays in place,
 * from the start of its line, before blanks hidden there,
 * which would push it down a line.
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
        look.decorations.push(
            Decoration.widget({
                widget: new MathWidget(tex, true, true),
                side: -1,
            }).range(look.state.doc.lineAt(node.from).from),
        );
    }
    return false;
}

/**
 * List: its lines in a `ul` or `ol`,
 * up to where its last item ends, see {@link itemEndOf},
 * as the scripts view draws them;
 * in two around the empty line a key just put the cursor
 * on left of the text of its points,
 * see {@link typingCutOf}, so that line stands outside it at once.
 * A list within a point, whose guide line `../notes/notes.css` draws,
 * tells the empty lines right below it that stand outside
 * that point, see {@link airBelowOf},
 * so `./editor.css` draws its guide line on through them,
 * as through the air within the point,
 * while the list around it goes on below them, see {@link listOnIs},
 * not before a heading or text after the list.
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
    if (cut === null) {
        wrap(look, node, tagName, attributes, end);
        return true;
    }
    wrap(look, node, tagName, attributes, cut.from - 1);
    const after: SyntaxNode | undefined = node
        .getChildren("ListItem")
        .find((item: SyntaxNode): boolean => item.from > cut.to);
    if (after !== undefined) wrap(look, node, tagName, attributes, end, after.from);
    return true;
}

/**
 * Tells whether the outermost list around a list goes
 * on below the empty lines after a line,
 * with a point or a paragraph of a point, not a heading or text after the list,
 * see {@link listLook}.
 */
function listOnIs(look: Look, node: SyntaxNode, end: number): boolean {
    let root: SyntaxNode = node;
    for (let up: SyntaxNode | null = node.parent; up !== null; up = up.parent)
        if (up.name === "BulletList" || up.name === "OrderedList") root = up;
    const last: Line = emptyEndOf(look.state, look.state.doc.lineAt(end), 1);
    return last.number < look.state.doc.lines && look.state.doc.line(last.number + 1).from < root.to;
}

/**
 * Counts the empty lines right below a line up to the next line with text,
 * see `emptyIs` in `./keys.ts`, through which the guide line of a list ending there runs,
 * see {@link listLook}; the empty line a key just put the cursor on ends them too,
 * see `typingLine` in `./keys.ts`.
 *
 * @returns Number of those empty lines, none where the note ends below them
 */
function airBelowOf(look: Look, end: number): number {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    for (let number: number = look.state.doc.lineAt(end).number + 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (line.from === typing || !emptyIs(look.state, line)) return number - look.state.doc.lineAt(end).number - 1;
    }
    return 0;
}

/**
 * Finds the empty line a key just put the cursor on, see `typingLine` in `./keys.ts`,
 * below the first line of a point or list and up to where it ends,
 * when its blanks stand left of the text of the point or of the points of the list,
 * like a paragraph of a point outside, where Shift+Tab moved it:
 * the point or list then ends right before it,
 * see {@link itemDrawEndOf} and {@link listLook}.
 */
function typingCutOf(look: Look, node: SyntaxNode, end: number): Line | null {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    const item: SyntaxNode | null = node.name === "ListItem" ? node : node.firstChild;
    const text: string = item === null ? "" : look.state.doc.lineAt(item.from).text;
    const indentation: string | null = item === null ? null : textIndentationOf(text.slice(quotePrefixOf(text).length));
    if (typing === null || indentation === null || typing <= look.state.doc.lineAt(node.from).to || typing > end)
        return null;
    const line: Line = look.state.doc.lineAt(typing);
    return columnsOf(line.text.slice(quotePrefixOf(line.text).length)) < columnsOf(indentation) ? line : null;
}

/**
 * Gives where the lines of a point end on the page: up to the next point of its list,
 * over the empty lines between, see {@link itemLook},
 * the last point of a list where it ends,
 * see {@link itemEndOf};
 * right before the empty line the cursor stands on left of its text,
 * see {@link typingCutOf}.
 */
function itemDrawEndOf(look: Look, node: SyntaxNode): number {
    const next: SyntaxNode | null = node.nextSibling?.name === "ListItem" ? node.nextSibling : null;
    const end: number = next === null ? itemEndOf(look, node) : look.state.doc.lineAt(next.from).from - 1;
    return (typingCutOf(look, node, end)?.from ?? end + 1) - 1;
}

/**
 * Finds where a list item ends on the page: after its last line
 * and the lines of blanks below it that reach its text, also past empty lines,
 * like the one Shift+Enter writes below it or a `-` taken away leaves,
 * which Markdown reads after it, so the cursor on them stands under its text,
 * see {@link listBlankIs}; those that do not reach it belong to a point it stands in.
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
 * Tells a line of blanks within a list, like the one Shift+Enter writes below a point
 * or a `-` taken away leaves: only blanks, below a line of a list item,
 * maybe past other empty lines, not code;
 * its blanks are hidden, so it stands under the text of its point, see {@link itemEndOf},
 * and the cursor on it where text typed will begin.
 */
function listBlankIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t]+$/.test(line.text) || !emptyIs(state, line)) return false;
    let above: Line = line;
    while (above.number > 1 && /^[ \t]*$/.test(above.text)) above = state.doc.line(above.number - 1);
    return upwardOf(syntaxTree(state).resolveInner(above.from + (/^[ \t]*/.exec(above.text)?.[0].length ?? 0), 1)).some(
        (node: SyntaxNode): boolean => node.name === "ListItem",
    );
}

/**
 * List item: its lines in an `li`,
 * which draws its bullet or number as in the scripts view, a number as written,
 * so a step skipped, like `4.` after `2.`, keeps its number;
 * while the cursor is on its first line, without them,
 * as its marker shows there as written,
 * see {@link listMarkLook};
 * its fold arrow left of its bullet when it has sub-points,
 * which folds them with its further lines.
 * The `li` reaches on over the empty lines up to the next point of its list,
 * so the guide line of its sub-points runs on through that air, see `../notes/notes.css`,
 * and a list with air stays one list on the page, as in the file,
 * see {@link itemDrawEndOf}.
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
 * Marker of a list item, `-` or a number like `1.`,
 * with the indentation before it and the spaces after it:
 * hidden, as the item's `li` draws its bullet or number;
 * on the line of the cursor shown as written, in place of the bullet or number,
 * see `./editor.css`, its indentation still hidden;
 * of a `-` the spaces after it hidden too,
 * so the cursor after them stands where the text begins, also on a new, empty item.
 */
function listMarkLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const textFrom: number = node.to + (/^[ \t]*/.exec(look.state.sliceDoc(node.to, line.to))?.[0].length ?? 0);
    if (/^[ \t]*$/.test(look.state.sliceDoc(line.from, node.from))) hide(look, line.from, node.from);
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

/**
 * Paragraph: the indentation of its lines hidden,
 * as the scripts view leaves it out, in a list item putting them under the item's text.
 */
function paragraphLook(look: Look, node: SyntaxNode): boolean {
    const first: Line = look.state.doc.lineAt(node.from);
    if (/^[ \t]*$/.test(look.state.sliceDoc(first.from, node.from))) hide(look, first.from, node.from);
    const last: number = look.state.doc.lineAt(node.to).number;
    for (let number: number = first.number + 1; number <= last; number++) {
        const line: Line = look.state.doc.line(number);
        hide(look, line.from, line.from + (/^[ \t]*/.exec(line.text)?.[0].length ?? 0));
    }
    return true;
}

/**
 * Gives how much of the start of a line the look hides,
 * see {@link paragraphLook} and {@link listMarkLook}:
 * of a line of a paragraph its indentation;
 * of the line of a list item the indentation before its `-` or number;
 * all of a line of blanks within a list, see {@link listBlankIs};
 * of a line of a code block, HTML block, table or quote as many columns as its first line,
 * see {@link blockLook} and {@link quoteMarkLook}, so the line's own indentation shows;
 * nothing of any other line of blanks or an indented code block, whose blanks show.
 */
function hiddenStartOf(state: EditorState, line: Line): number {
    const blanks: number = /^[ \t]*/.exec(line.text)?.[0].length ?? 0;
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
 * Tells the gap between two paragraphs: the first empty line after a line of text,
 * see `emptyIs` in `./keys.ts`, no place to write, see {@link caretPlace};
 * not the empty line a key just put the cursor on to write,
 * see `typingLine` in `./keys.ts`.
 * - `lower`: Tells instead the lower of two empty lines, see {@link stop}.
 */
function gapIs(state: EditorState, line: Line, lower: boolean = false): boolean {
    return (
        line.number > 1 &&
        line.from !== (state.field(typingLine, false) ?? null) &&
        emptyIs(state, line) &&
        emptyIs(state, state.doc.line(line.number - 1)) === lower
    );
}

/**
 * Counts the characters of a point's line before its text:
 * its indentation, its `-` or number with the blank after it,
 * and a task box with its blank.
 */
function pointMarkOf(text: string, box: boolean): number {
    const mark: RegExpExecArray | null = /^([ \t]*(?:[-*+]|\d+[.)])(?:[ \t]+|$))(?:\[[ xX]\][ \t]+)?/.exec(text);
    return (box ? mark?.[0] : mark?.[1])?.length ?? 0;
}

/**
 * Gives where the cursor may stand first on a line, see {@link caretPlace}:
 * after its hidden start, see {@link hiddenStartOf},
 * on the line of a point after its `-` or number with the blank
 * after it, see {@link pointMarkOf},
 * never before them, where CodeMirror's own keys would take
 * or rewrite the tabs of the point,
 * see `./keys.ts`, its task box still after the cursor, to be written;
 * on a line of code that looks like a point, like YAML, before the `-` too.
 */
function textStartOf(state: EditorState, line: Line): number {
    const mark: SyntaxNode = syntaxTree(state).resolveInner(
        line.from + (/^[ \t]*/.exec(line.text)?.[0].length ?? 0),
        1,
    );
    return (
        line.from + Math.max(hiddenStartOf(state, line), mark.name === "ListMark" ? pointMarkOf(line.text, false) : 0)
    );
}

/**
 * Keeps the cursor off what the look hides, so every key moves it where I see it:
 * put into the hidden start of a line,
 * see {@link hiddenStartOf}, by a click, Home or an arrow up or down,
 * it goes to where the text begins, on the line of a point after its `-` or number,
 * see {@link textStartOf};
 * moved left out of the text of a line by a key from where it begins,
 * it goes on to the end of the line above, as from the start of any line;
 * moved up or down onto the line of a point before its text,
 * like from the next line of a point below it, it goes to where its text begins,
 * after its `-` or number and its task box,
 * see {@link pointMarkOf}.
 * Never on the gap between two paragraphs, see {@link gapIs}:
 * a click on it or an arrow down goes on to the line below it, an empty line or text,
 * an arrow up to the end of the line above;
 * an arrow that went past empty lines stops on the first of them that is no gap,
 * so each further empty line is a place to write, the lower of two empty lines too.
 * Only for a cursor moved alone, never while text is changed;
 * picking by Shift and an arrow it stops on the first empty line it went past, a gap too,
 * so a selection takes one line a step, and the mouse picks as it likes.
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
        if (!range.empty)
            return place === head
                ? transaction
                : [
                      transaction,
                      {
                          selection: { anchor: range.anchor, head: place },
                          sequential: true,
                      },
                  ];
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
        return place === head ? transaction : [transaction, { selection: { anchor: place }, sequential: true }];
    },
);

/**
 * Task box `[ ]` or `[x]` of a list item: the box of the scripts view,
 * as written on the line of the cursor.
 */
function taskBoxLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const done: boolean = /x/i.test(look.state.sliceDoc(node.from, node.to));
    if (!touched(look, line.from, line.to)) widgetPut(look, new TaskBoxWidget(done), node.from, node.to);
    return false;
}

/**
 * Quote: its lines in a `blockquote`, with the line of quotes beside them,
 * as the scripts view draws it, up to its last line with text:
 * lines of only `>` at its end are air after it, as a list's is not,
 * see {@link itemLook}, but the line a key just put the cursor on to write,
 * see `typingLine` in `./keys.ts`.
 * A callout, a quote whose first line is like `> [!note] Title`, see {@link calloutRule},
 * renders whole as in the scripts view while the cursor is on none of its lines,
 * see {@link blockLook}, else shows as a quote.
 */
function quoteLook(look: Look, node: SyntaxNode): boolean {
    const callout: boolean = calloutRule.test(look.state.sliceDoc(node.from, look.state.doc.lineAt(node.from).to));
    if (callout && !blockLook(look, node)) return false;
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    let last: Line = look.state.doc.lineAt(node.to);
    while (last.from > node.from && last.from !== typing && emptyIs(look.state, last))
        last = look.state.doc.line(last.number - 1);
    wrap(look, node, "blockquote", {}, last.to);
    return true;
}

/**
 * Inline HTML: a line break `<br>` or break opportunity `<wbr>` drawn
 * as in the scripts view while the cursor does not touch it, see {@link BreakWidget};
 * any other tag stays as written, and so does every tag of a table shown as its text,
 * whose rows a break would split.
 */
function htmlTagLook(look: Look, node: SyntaxNode): boolean {
    const tagName: string | undefined = breakRule.exec(look.state.sliceDoc(node.from, node.to))?.[1].toLowerCase();
    const table: boolean = upwardOf(node.parent).some((parent: SyntaxNode): boolean => parent.name === "Table");
    if (tagName !== undefined && !table && !touched(look, node.from, node.to))
        widgetPut(look, new BreakWidget(tagName), node.from, node.to);
    return false;
}

/**
 * Marker `>` of a quote, hidden,
 * on the line of the cursor or a selection shown left of the text, which keeps its place;
 * the indentation before it hidden, in a list item putting the quote under the item's text,
 * of a further line of a paragraph see {@link paragraphLook}.
 */
function quoteMarkLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    if (node.parent?.name === "Blockquote" && /^[ \t]*$/.test(look.state.sliceDoc(line.from, node.from)))
        hide(look, line.from, node.from);
    if (touched(look, line.from, look.state.doc.lineAt(node.to).to))
        look.decorations.push(hanging.range(node.from, markEndOf(look, node)));
    else hide(look, node.from, markEndOf(look, node));
    return true;
}

/**
 * Table, callout, code block or HTML block, with those right below it:
 * their whole lines rendered as one while the cursor is on none of them,
 * so the space between them is that of the scripts view;
 * above and below them only the empty lines around them, as around any block,
 * see {@link spaceLook};
 * else as their text, its indentation hidden, see {@link hiddenStartOf},
 * so in a list item it stands under the item's text, where the block rendered stands,
 * a callout by {@link quoteMarkLook}.
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

/**
 * Code block: rendered as in the scripts view while the cursor is on none of its lines,
 * else each of its lines on grey, in a font of fixed width,
 * its code between its ``` indented as rendered, see {@link codeText}.
 */
function codeLook(look: Look, node: SyntaxNode): boolean {
    if (!blockLook(look, node)) return false;

    linesMark(look, node.from, node.to, codeLine);
    const first: Line = look.state.doc.lineAt(node.from);
    const last: Line = look.state.doc.lineAt(node.to);
    const end: number =
        last.number > first.number && /^[ \t>]*(?:`{3,}|~{3,})[ \t]*$/.test(last.text) ? last.number - 1 : last.number;
    if (end > first.number)
        linesMark(look, look.state.doc.line(first.number + 1).from, look.state.doc.line(end).to, codeText);
    return true;
}

/**
 * Look of each piece of syntax by its name;
 * each tells whether to look into the piece, at the pieces inside it.
 */
const looks: { [name: string]: (look: Look, node: SyntaxNode) => boolean } = {
    ATXHeading1: headingLook,
    ATXHeading2: headingLook,
    ATXHeading3: headingLook,
    ATXHeading4: headingLook,
    ATXHeading5: headingLook,
    ATXHeading6: headingLook,
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
 * Draws every empty line, see `emptyIs` in `./keys.ts`, half as high as a line of text,
 * every one alike and every one a line the cursor stands on, by a click or an arrow key,
 * as the small gap between two paragraphs, two of them as the air of a line,
 * see {@link gap}; one right below another, a place to write, see {@link gapIs},
 * below the half line above it, with a cursor a whole line high from its top,
 * where text typed on it stands, see {@link stop};
 * only the empty line a key just put the cursor on to write is as high as a line of text,
 * see `typingLine` in `./keys.ts`;
 * the blanks of a line within a list hidden, see {@link listBlankIs}.
 */
function spaceLook(look: Look): void {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    for (let number: number = 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (listBlankIs(look.state, line)) hide(look, line.from, line.to);
        if (line.from !== typing && emptyIs(look.state, line))
            look.decorations.push((gapIs(look.state, line, true) ? stop : gap).range(line.from));
    }
}

/**
 * Marks the editor while the cursor stands on the lower of two empty lines,
 * see {@link stop},
 * so `./editor.css` draws it half a line higher, over both, the air of a line,
 * as on a line of text standing there, never reaching into the text below;
 * the click moves nothing, text typed there goes below the half line above it as before,
 * a paragraph of its own, see `paragraphTyping` in `./keys.ts`.
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
 * Shows the tabs within each selection by their marks, see {@link tabMark},
 * so I see what I select and can check they are there: where they take their room,
 * like a tab within a line, each mark over its character, see {@link tabShown};
 * where the look hides them,
 * like the indentation of a line of a list,
 * the marks of what the selection covers in place of the hidden stretch,
 * left of where the text begins, see {@link InvisiblesWidget}.
 * Nothing outside a selection, and nothing takes room, so no text moves.
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
        if (/\S/.test(marks))
            look.decorations[index] = Decoration.replace({
                widget: new InvisiblesWidget(marks, before),
            }).range(decoration.from, decoration.to);
    });
    for (const range of ranges)
        for (const match of look.state.sliceDoc(range.from, range.to).matchAll(/\t/g))
            look.decorations.push(tabShown.range(range.from + match.index, range.from + match.index + 1));
}

/**
 * Finds the person a line names as an item after its role, see {@link roleRule},
 * or as an item under {@link responsiblesHeading}:
 * the heading above the line is that one;
 * the name a name of `Persons.md`, see `personOf` in `../persons.ts`.
 *
 * @returns The person and where its name begins in the line,
 *   `undefined` for a line of no such item or a name of nobody of `Persons.md`
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

/**
 * Names of people under `## Modulverantwortliche` of a module file
 * and after their role in a list,
 * each a link to its row in `Persons.md`,
 * like a name in the column `Lecturers`, see `../persons.ts`,
 * while the cursor is not on its line;
 * a name of nobody there plain text, see {@link responsibleOf}.
 */
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

/**
 * Builds the look of the whole note for its text and cursor, see the top of this file.
 */
function drawingOf(state: EditorState): Drawing {
    const look: Look = {
        state: state,
        links: state.field(linkTargets),
        focused: state.field(focused),
        cursors: cursorsOf(state),
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
    return {
        decorations: Decoration.set(look.decorations, true),
        wrappers: BlockWrapper.set(look.wrappers, true),
    };
}

/**
 * Folds what the line of a place folds, see {@link foldLook},
 * or unfolds it when it is folded.
 */
function foldToggle(view: EditorView, pos: number): void {
    const line: Line = view.state.doc.lineAt(pos);
    let folded: Span | null = null;
    foldedRanges(view.state).between(line.to, line.to, (from: number, to: number): void => {
        if (from === line.to) folded = { from: from, to: to };
    });
    const range: Span | null = folded ?? foldable(view.state, line.from, line.to);
    if (range !== null)
        view.dispatch({
            effects: (folded === null ? foldEffect : unfoldEffect).of(range),
        });
}

/**
 * Folds every solution of the note, the section under each heading `#### Solution…`,
 * as the scripts view shows it at first, so I try a task before I see its solution;
 * the whole note read first, as the editor reads at first only what it shows.
 */
export function solutionsFold(view: EditorView): void {
    forceParsing(view, view.state.doc.length, 1000);
    const ranges: Span[] = [];
    for (let number: number = 1; number <= view.state.doc.lines; number++) {
        const line: Line = view.state.doc.line(number);
        const range: Span | null = solutionRule.test(line.text) ? foldable(view.state, line.from, line.to) : null;
        if (range !== null) ranges.push(range);
    }
    view.dispatch({
        effects: ranges.map((range: Span): StateEffect<Span> => foldEffect.of(range)),
    });
}

/**
 * Scrolls the note to a heading,
 * so it stands right below the head of the editor, unfolding what folds it away,
 * or to its top when the heading is empty or the note has none of that text.
 */
export function headingShow(view: EditorView, heading: string): void {
    let line: Line | undefined;
    const unfolds: StateEffect<Span>[] = [];
    for (let number: number = 1; heading !== "" && line === undefined && number <= view.state.doc.lines; number++)
        if (headingRule.exec(view.state.doc.line(number).text)?.[1] === heading) line = view.state.doc.line(number);
    foldedRanges(view.state).between(line?.from ?? 0, line?.from ?? 0, (from: number, to: number): void => {
        unfolds.push(unfoldEffect.of({ from: from, to: to }));
    });
    view.dispatch({
        effects: [...unfolds, EditorView.scrollIntoView(line?.from ?? 0, { y: "start" })],
    });
}

/**
 * Shows a row of a table, the first whose first cell reads a text,
 * a third down the page, and marks it,
 * see `.row-shown` in `./editor.css`,
 * until its table shows as text; nothing when no row reads the text.
 * A table not drawn yet, far down the note,
 * the editor scrolls to first, see {@link BlockWidget};
 * then, right before the page is drawn, the page scrolls, so nothing jumps.
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

/**
 * Finds the link at a place of the note: a wiki link, a Markdown link,
 * or an address written as it is.
 */
function linkAt(state: EditorState, pos: number): SyntaxNode | null {
    let url: SyntaxNode | null = null;
    for (const node of upwardOf(syntaxTree(state).resolveInner(pos, 1))) {
        if (node.name === "WikiLink" || node.name === "Link") return node;
        if (node.name === "URL") url = node;
    }
    return url;
}

/**
 * Follows a link, as the scripts view does:
 * a note opens in the scripts view at the heading after `#`, a heading of the same note,
 * scrolls into sight, see {@link headingShow};
 * any other file opens in this window at the place after `#`,
 * an address of the web in a new tab;
 * a relative link opens where it leads,
 * see {@link linkAddressOf}; a link that leads nowhere or opens
 * only on the computer does nothing.
 */
function linkFollow(view: EditorView, node: SyntaxNode): void {
    const url: SyntaxNode | null = node.name === "URL" ? node : node.getChild("URL");
    addressFollow(
        view,
        node.name === "WikiLink"
            ? (/^\[\[([^\]|\\]*)/.exec(view.state.sliceDoc(node.from, node.to))?.[1] ?? "")
            : url === null
              ? ""
              : view.state.sliceDoc(url.from, url.to).replace(/^<|>$/g, ""),
    );
}

/**
 * Follows a link by its address as written, see {@link linkFollow};
 * a heading of the same note in a section shows its block alone,
 * see `roundHeadingShow` in `./round.ts`, since every other block there is hidden;
 * a note opens in this window, and so does any other file,
 * like a PDF in Chrome's own viewer, never in a second tab of NomSystem;
 * only an address of the web, like `https://…`, opens in a new tab.
 * The one place a link is followed:
 * in the text, in rendered blocks and in a table opened over the file, see `./table.ts`.
 *
 * @returns Whether it opened something,
 *   not for a link that leads nowhere or opens only on the computer
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

/**
 * Whether the click before followed a link, see {@link linkClicked},
 * so the further clicks of a double click on it do nothing.
 */
let followed: boolean = false;

/**
 * Follows the link of a click: one of a rendered link, see {@link followable},
 * in a heading too,
 * whose text a click after its end edits, the cursor there and its Markdown shown,
 * or with Ctrl held, on a Mac with Cmd, one of a link shown as its text.
 * Taking the mouse button down there keeps the cursor where it is,
 * so the link stays rendered;
 * letting it go follows it, see {@link linkFollow};
 * any other click goes on to the editor.
 * The further clicks of a double click on a link do nothing, see {@link followed},
 * so they neither follow a second link nor put the cursor into what the link showed,
 * where Ctrl+Z would undo instead of going back, see `roundBack` in `./round.ts`.
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

/**
 * TeX of the rendered formula the press before landed on, see {@link formulaClicked},
 * `null` for none.
 */
let formulaPressed: Span | null = null;

/**
 * Gives the TeX of the formula a rendered one stands for, without its `$` or `$$`:
 * of the formula it replaces, see {@link MathWidget},
 * or of the formula `$$…$$` being edited below it, the first on the line it stands at.
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
 * Selects the whole TeX of a rendered formula double clicked, without its `$` or `$$`,
 * so Ctrl+C copies it, ready to paste:
 * the first click puts the cursor at the formula, which shows as TeX, as any click does,
 * the second selects that TeX, wherever in it it lands, see {@link formulaPressed};
 * also the TeX of a formula `$$…$$` being edited, by a double click on it rendered above.
 * Any other press goes on to the editor,
 * like a double click into TeX shown, selecting a word.
 */
function formulaClicked(event: MouseEvent, view: EditorView): boolean {
    const tex: Span | null = formulaPressed;
    const box: Element | null = (event.target as Element).closest(".cm-math");
    formulaPressed = event.button === 0 && event.detail === 1 && box !== null ? texOf(view, box) : null;
    if (event.button !== 0 || event.detail !== 2 || tex === null) return false;
    event.preventDefault();
    view.dispatch({
        selection: { anchor: tex.from, head: tex.to },
        userEvent: "select.pointer",
    });
    return true;
}

/**
 * Copies the selection as the note writes it, a formula as its TeX,
 * with every link it reaches into whole, see {@link linkAt},
 * like `by [probability distribution](<#Definition. Probability Distribution>)`
 * for `by probability distribution` selected,
 * whose end before the hidden `](…)` would leave the link out.
 * A copy without a selection goes on to the editor, which copies the line,
 * and so does a cut, which takes out only what is selected.
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
 * Follows the click on the name of a person under `## Modulverantwortliche`,
 * see {@link responsiblesLook}, to its row in `Persons.md` in this window,
 * as a click on a name in the column `Lecturers` does,
 * see `personRowAddressOf` in `../persons.ts`.
 * Taking the mouse button down there keeps the cursor where it is,
 * so the name stays a link;
 * letting it go follows it; any other click goes on.
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

/**
 * Holds the look while the mouse button is down
 * after a press in the text, see {@link frozen}:
 * from the press, with the cursors that show as text at that moment,
 * none while the editor has no focus, until the button goes up,
 * wherever the pointer is then.
 */
function pressHold(event: MouseEvent, view: EditorView): void {
    if (event.button !== 0) return;
    view.dispatch({
        effects: pressChange.of(view.state.field(focused) ? cursorsOf(view.state) : []),
    });
    document.addEventListener("mouseup", (): void => view.dispatch({ effects: pressChange.of(null) }), { once: true });
}

/**
 * Lets a selection by the mouse take the hidden start of a line,
 * like the tabs of the indentation of a list, which has no room to point at:
 * an end of a drag where the pointer stood left of where the text of its line begins,
 * in the room of the bullets and guide lines,
 * reaches to the start of the line, as in VS Code,
 * so its tabs are selected, shown by their marks, see {@link invisiblesLook},
 * and go with Backspace or Delete.
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
                    view.dispatch({
                        selection: { anchor: anchor, head: head },
                        userEvent: "select.pointer",
                    });
            });
        },
        { once: true },
    );
}

/**
 * Leaves a click on the type word of a heading, its small grey box,
 * see {@link headingLook}, to nothing: the box is no text,
 * so the cursor never goes into it and the heading stays drawn;
 * a click on the name edits it as before.
 */
function kindClicked(event: MouseEvent): boolean {
    if (!targetIn(event, ".block-kind")) return false;
    event.preventDefault();
    return true;
}

/**
 * Takes the files the links of the note lead to anew,
 * as the reader found them for the note just saved,
 * so a link written since works and one that leads nowhere fades.
 */
export function linksSet(view: EditorView, links: Links): void {
    view.dispatch({ effects: linksFound.of(links) });
}

/**
 * Live preview of a note, see the top of this file:
 * its look, built again when the text, the cursor, the focus, the syntax tree,
 * what is folded or the files its links lead to change, and the classes of its syntax.
 * - {@link StateField}: Holds the look;
 *   only a field may hide line breaks, like those inside a table.
 * - {@link EditorView.domEventObservers}: Holds the look while the mouse button is down,
 *   see {@link pressHold}, before the editor reads where I pressed,
 *   and lets a drag take the hidden start of a line, see {@link marginSelect}.
 * - {@link EditorView.domEventHandlers}: Follow a link clicked,
 *   see {@link linkClicked}, before the editor puts the cursor there,
 *   select the TeX of a formula double clicked, see {@link formulaClicked},
 *   and copy a selection with its links whole, see {@link selectionCopied}.
 * - {@link codeFolding}: Holds what is folded,
 *   without the `…` CodeMirror puts in place of it,
 *   since the arrow turned right tells it;
 *   {@link foldKeymap} folds and unfolds by keys too, like Ctrl+Shift+[ and Ctrl+Shift+].
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
        codeFolding({
            placeholderDOM: (): HTMLElement => document.createElement("span"),
        }),
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
