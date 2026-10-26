/**
 * ## Live preview
 *
 * Shows a note in the editor as Obsidian's live preview does:
 * the text of the file as it is, its Markdown drawn as in the scripts view with the markup hidden,
 * and the markup shown where the cursor is, to edit it.
 * Only the look changes, never the text:
 * every hidden or rendered piece stays in the text as written.
 * Away from the cursor a note looks as in the scripts view, drawn by the rules of the scripts view
 * in `../notes/notes.css`:
 * - Headings, lists and quotes stand in the elements the scripts view draws them in, `h1` to `h6`,
 *   `ul`, `ol`, `li` and `blockquote`,
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
 *   like `Definition. `, a small grey box before the name,
 *   as in the tree, hanging left of the page where the file has room, see `./editor.css`,
 *   as written on the line of the cursor, see {@link headingLook};
 *   a click on the box does nothing, see {@link kindClicked}.
 * - Bold, italic, struck and code without `**`, `*`,
 *   `~~` and `` ` ``, Markdown links and wiki links `[[Note#Heading|Text]]` as their text; the markup of the piece the cursor touches shows.
 * - Line breaks `<br>` and break opportunities `<wbr>` drawn as in the scripts view,
 *   so `<br><wbr>` at the end of a line leaves an empty line below it;
 *   as their text while the cursor touches them.
 * - Task boxes `[ ]` and `[x]` as the boxes of the scripts view, which a click ticks,
 *   as written on the line of the cursor.
 * - Formulas `$…$` and `$$…$$` rendered as in the scripts view, never broken inside,
 *   with the punctuation right after one on its line, see {@link mathLook};
 *   as their TeX while the cursor touches them;
 *   a formula `$$…$$` being edited shows rendered below its TeX, as in Obsidian.
 * - Images `![kiosk mean bell](Visualizations/KioskMeanBell.svg)` shown, see {@link imageLook};
 *   tables, callouts `> [!note] Title`,
 *   code blocks and HTML blocks like `<table>` rendered as in the scripts view,
 *   those right below each other as one, as their text while the cursor is on one of their lines,
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
 *   and while the mouse button is down nothing of the look changes,
 *   a click showing what it touches once I let go,
 *   so no text moves under the cursor or the pointer, see {@link cursorsOf}.
 * - Each heading folds its section, up to the next heading of its level or higher,
 *   by a click on its arrow after its text, as in the scripts view,
 *   and each list item with sub-points folds them
 *   and its further lines by its arrow left of its bullet, shown under the pointer, as in Obsidian;
 *   one click folds, one click unfolds, see {@link FoldWidget};
 *   a solution, the section under `#### Solution`, comes folded, see {@link solutionsFold},
 *   so I try a task before I see its solution.
 * A click on a rendered piece puts the cursor there,
 * so it shows as text, on a rendered table a double click, so a single one leaves it to scroll,
 * see {@link BlockWidget}; while the editor is not focused,
 * like before the first click, the whole note shows rendered.
 * A click on a rendered link follows it, as in Obsidian,
 * and so does a click with Ctrl held on a link shown as text, see {@link linkFollow}:
 * a note opens in the scripts view at its heading, a heading of the same note scrolls into sight,
 * in a section its block shows alone, as a click in the tree shows it, any other file,
 * like a PDF at its page, opens in this window, in Chrome's own viewer,
 * and an address of the web in a new tab.
 * Links resolve as the reader found them when the note was read or saved last,
 * see {@link linksSet}: a link that leads nowhere fades and leads nowhere,
 * a link or image written since works once the note is saved.
 * A relative link, like `../NomModulesuniversity/IN2028_BusinessAnalyticsMachineLearning.md`
 * in a file of my new system, leads where VSCodium follows it, see {@link linkAddressOf}:
 * a file of my new system opens in the editor, a note in the scripts view,
 * the folder of a module as its overview; any other place fades, opening only on the computer.
 * A name of a person in the column `Lecturers`, `Tutor` or `Head` of a rendered table,
 * like `Bichler, Martin` of the courses of a module,
 * is a link to its row in `Persons.md`, see `../persons.ts`, a name of nobody there plain text,
 * and so is the name of an item under `## Modulverantwortliche` of a module file,
 * like `- Bichler, Martin`, see {@link responsiblesLook};
 * the row an address names,
 * like that of `Bichler, Martin`, scrolls into sight marked, see {@link rowShow}.
 *
 * - `@codemirror/state`, `@codemirror/view`:
 *   Hold the text and the cursor, draw the text with decorations and widgets,
 *   and put lines into elements with block wrappers.
 * - `@codemirror/language`: Gives the syntax tree of the note, read with `./syntax.ts`,
 *   and folds its sections, as CodeMirror's Markdown finds them:
 *   a heading's up to the next heading of its level or higher,
 *   a list item's from the end of its first line.
 * - `@lezer/highlight`: Gives pieces of the syntax the classes of their look, see `./editor.css`.
 * - `lucide`, `../icons.ts`: The arrows that open a table over the file.
 * - `../notes/math.ts`: Renders formulas as the scripts view does.
 * - `../notes/markdown.ts`:
 *   Renders tables, callouts, code blocks and HTML blocks as the scripts view does,
 *   and tells the punctuation that stays on the line of a formula.
 * - `../notes/tree.ts`: Builds the address of a note in the scripts view
 *   and the place a relative link leads to, for a link to follow,
 *   and tells the type word of a block at the start of its heading.
 * - `../persons.ts`: Turns the names of people in the columns `Lecturers`,
 *   `Tutor` and `Head` of a table into links to their rows,
 *   and gives the people, a person by its name
 *   and the address of its row for the names under `## Modulverantwortliche`.
 * - `./keys.ts`: Tells an empty line and the empty line a key just put the cursor on to write,
 *   and the indentation of the text of a list item, for the lines of blanks below it.
 * - `./round.ts`: Shows a block of a section alone, for a link to its heading.
 * - `./table.ts`: Opens a table over the file, to edit as a spreadsheet.
 * - `./steps.ts`: Tells whether a section is folded.
 */

import { EditorState, Facet, RangeSet, StateEffect, StateField } from "@codemirror/state";
import {
    BlockWrapper,
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
    keymap,
} from "@codemirror/view";
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
import { columnsOf, emptyIs, quotePrefixOf, textIndentationOf, typingLine } from "./keys.ts";
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
import type { DecorationSet } from "@codemirror/view";
import type { Highlighter } from "@lezer/highlight";
import type { Person } from "../persons.ts";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";

/**
 * For each link of a note as written,
 * like `01_05_IncomeResiduals.svg` of `![[01_05_IncomeResiduals.svg|420]]`:
 * path of the file it leads to, `null` when it leads nowhere, as the reader sends it.
 */
export type Links = {
    [link: string]: string | null;
};

/**
 * What the look of a note is built from, see {@link decorationsOf}.
 *
 * - `state`: Text, cursor and syntax tree of the note.
 * - `links`: Files the links of the note lead to.
 * - `focused`: Whether the editor has the focus, so I am editing.
 * - `cursors`: Where the cursors stand, whose places show as text, see {@link cursorsOf}.
 * - `decorations`: Decorations found so far.
 * - `wrappers`: Elements found so far that lines stand in, like the `li` of a list item.
 * - `rendered`: Starts of the blocks rendered whole so far, like a table, see {@link blockLook}.
 */
type Look = {
    state: EditorState;
    links: Links;
    focused: boolean;
    cursors: number[];
    decorations: Range<Decoration>[];
    wrappers: Range<BlockWrapper>[];
    rendered: number[];
};

/**
 * Look of a note: its decorations and the elements its lines stand in.
 *
 * - `decorations`: Hidden markup, rendered pieces and classes of lines and text.
 * - `wrappers`: Elements around lines, like `ul` and `li`.
 */
type Drawing = {
    decorations: DecorationSet;
    wrappers: RangeSet<BlockWrapper>;
};

/**
 * Endings of images shown when embedded, as in the scripts view.
 */
const imageEndings: string[] = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "avif"];

/**
 * Pieces of syntax drawn in an element of their own, see {@link wrap}, nesting in each other.
 */
const wrapped: string[] = ["BulletList", "OrderedList", "ListItem", "Blockquote"];

/**
 * Blocks rendered whole while the cursor is on none of their lines, see {@link blockLook}.
 */
const renderedWhole: string[] = ["Table", "FencedCode", "HTMLBlock"];

/**
 * First line of a callout from its `>`, like `> [!note] Title`, as the scripts view reads it,
 * see `../notes/markdown.ts`.
 */
const calloutRule: RegExp = /^>[ \t]?\[![^\]]+\]/;

/**
 * Line break `<br>` or break opportunity `<wbr>` within a line,
 * written like `<br>`, `<br/>` or `<br />`.
 */
const breakRule: RegExp = /^<(br|wbr)\s*\/?>$/i;

/**
 * Address with a scheme, like `https://…`:
 * a link out of my modules, opened as it is, as in the scripts view.
 */
const externalRule: RegExp = /^[a-z][a-z\d+.-]*:/i;

/**
 * Heading of a note, `##` and its text, with the text as written.
 */
const headingRule: RegExp = /^#{1,6}[ \t]+(.*?)[ \t]*$/;

/**
 * Heading of the section of a module file that names the people responsible for it,
 * one item `- Nachname, Vorname` each, as `Persons.md` names them, see {@link responsibleOf}.
 */
const responsiblesHeading: string = "## Modulverantwortliche";

/**
 * Item of the list under {@link responsiblesHeading}, `- ` and the name of a person,
 * like `- Bichler, Martin`.
 */
const responsibleRule: RegExp = /^- (\S.*?)[ \t]*$/;

/**
 * Item of a list that names a person by its role, see `peopleRoles` in `../persons.ts`, like
 * `- Dean: Bungartz, Hans-Joachim` of a school in `Schools.md`: its role and the name.
 */
const roleRule: RegExp = new RegExp(`^- (${peopleRoles.join("|")}): (\\S.*?)[ \\t]*$`);

/**
 * Heading of a solution, like `#### Solution` or `#### Solution (own, unchecked)`,
 * as the scripts view folds it.
 */
const solutionRule: RegExp = /^####[ \t]+Solution\b/;

/**
 * Invisible format characters, like the soft hyphen and the zero-width space.
 */
const invisibleRule: RegExp = /\p{Cf}/gu;

/**
 * Markup hidden.
 */
const hidden: Decoration = Decoration.replace({});

/**
 * Bullet `-` of the list item the cursor is on,
 * as written, in place of the bullet, see `./editor.css`.
 */
const bulletMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-bullet" });

/**
 * Number like `1.` of the list item the cursor is on,
 * as written, in place of the number, see `./editor.css`.
 */
const numberMark: Decoration = Decoration.mark({ class: "cm-list-mark cm-list-number" });

/**
 * Markup `##` of a heading or `>` of a quote on the line of the cursor,
 * left of the text, see `./editor.css`.
 */
const hanging: Decoration = Decoration.mark({ class: "cm-hanging" });

/**
 * Type word of a block at the start of its heading, like `Definition`, as a small grey box,
 * see `../notes/notes.css`.
 */
const kindBox: Decoration = Decoration.mark({ class: "block-kind" });

/**
 * Invisible character on the line of the cursor, kept invisible.
 */
const invisibleMark: Decoration = Decoration.mark({ class: "cm-hidden-char" });

/**
 * Marks of the invisible characters within a selection,
 * as VS Code shows them with `renderWhitespace: selection`:
 * a tab `→`, see {@link invisiblesLook}.
 */
const invisibleMarks: { [char: string]: string } = { "\t": "→" };

/**
 * Tabs, which a selection shows by their marks, see {@link invisibleMarks}.
 */
const markedRule: RegExp = /\t/g;

/**
 * Tab within a selection where it takes its room, its mark drawn faintly over it,
 * taking no room of its own, see `./editor.css`, by the character, see {@link invisibleMarks}.
 */
const invisibleShown: { [char: string]: Decoration } = Object.fromEntries(
    Object.entries(invisibleMarks).map(([char, mark]: [string, string]): [string, Decoration] => [
        char,
        Decoration.mark({ class: "cm-invisible", attributes: { "data-mark": mark } }),
    ]),
);

/**
 * Text of a rendered link, which a click follows, see {@link linkClicked}.
 */
const followable: Decoration = Decoration.mark({ class: "cm-follow" });

/**
 * Text of a rendered link out of my modules, like `https://…`,
 * which a click opens in a new tab, with Obsidian's arrow out of a box after it,
 * as in the scripts view, see `../notes/notes.css`.
 */
const external: Decoration = Decoration.mark({ class: "cm-follow cm-external" });

/**
 * Name of a person under the heading `## Modulverantwortliche` of a module file
 * or after its role in a list, like `- Dean: Bungartz, Hans-Joachim`,
 * which a click follows to its row in `Persons.md`,
 * see {@link responsiblesLook} and {@link personClicked}.
 */
const personMark: Decoration = Decoration.mark({ class: "cm-follow cm-person" });

/**
 * Text of a rendered link to a place the dashboard does not open,
 * like the folder of a module's lectures:
 * faded, its tooltip saying where it opens, and no click follows it.
 */
const computerOnly: Decoration = Decoration.mark({
    class: "is-computer-only",
    attributes: { title: "Opens only on the computer" },
});

/**
 * Empty line, drawn half as high as a line of text, see {@link spaceLook} and `./editor.css`.
 */
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
const unbroken: Decoration = Decoration.mark({ class: "math-unbroken", inclusiveStart: true });

/**
 * Line of a code block being edited.
 */
const codeLine: Decoration = Decoration.line({ class: "cm-code-block" });

/**
 * Line of the code of a code block being edited, between its ```,
 * indented as the code of a block rendered, see `./editor.css`.
 */
const codeText: Decoration = Decoration.line({ class: "cm-code-text" });

/**
 * Effect of the editor getting the focus, `true`, or losing it, `false`.
 */
const focusChange: StateEffectType<boolean> = StateEffect.define<boolean>();

/**
 * Whether the editor has the focus, from the last {@link focusChange}; not at first.
 */
const focused: StateField<boolean> = StateField.define<boolean>({
    create: (): boolean => false,
    update: (value: boolean, transaction: Transaction): boolean => {
        for (const effect of transaction.effects) if (effect.is(focusChange)) return effect.value;
        return value;
    },
});

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
 * Places of the cursors that show as text while the mouse button is down after a press in the text:
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

/**
 * Effect of the reader having found the files the links of the note lead
 * to anew, see {@link linksSet}.
 */
const linksFound: StateEffectType<Links> = StateEffect.define<Links>();

/**
 * Files the links of the note lead to,
 * as the reader found them when the note was read or saved last;
 * none at first, see {@link livePreview}.
 */
const linkTargets: StateField<Links> = StateField.define<Links>({
    create: (): Links => ({}),
    update: (links: Links, transaction: Transaction): Links => {
        for (const effect of transaction.effects) if (effect.is(linksFound)) return effect.value;
        return links;
    },
});

/**
 * Effect of the people of `Persons.md` being loaded, see {@link personsLoad}.
 */
const personsFound: StateEffectType<Person[]> = StateEffect.define<Person[]>();

/**
 * The people of `Persons.md`, whose names under `## Modulverantwortliche` are links,
 * see {@link responsiblesLook};
 * none until they are loaded, see {@link personsLoad}.
 */
const personsLoaded: StateField<Person[]> = StateField.define<Person[]>({
    create: (): Person[] => [],
    update: (persons: Person[], transaction: Transaction): Person[] => {
        for (const effect of transaction.effects) if (effect.is(personsFound)) return effect.value;
        return persons;
    },
});

/**
 * Loads the people of `Persons.md` once the editor stands, see `personsKept` in `../persons.ts`,
 * and hands them to {@link personsLoaded}, unless the editor is gone by then.
 * - {@link ViewPlugin}: Runs with the editor, from when it stands until it is destroyed.
 * - `open`: Whether the editor still stands.
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
 * like `NomManageplannings/NomMetainformations/Modules.md`, from which its relative links lead,
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
 * Fold arrow of a heading or a list item, see the top of this file,
 * and of the time zone of a calendar file, see `./ics.ts`:
 * down while open, turned right while folded;
 * a click on it folds or unfolds, see {@link foldToggle}, and leaves the cursor where it is.
 */
export class FoldWidget extends WidgetType {
    /**
     * Whether it belongs to a list item, else to a heading or the time zone of a calendar file.
     */
    readonly item: boolean;

    /**
     * Whether what it folds is folded.
     */
    readonly folded: boolean;

    constructor(item: boolean, folded: boolean) {
        super();
        this.item = item;
        this.folded = folded;
    }

    /**
     * Tells whether another arrow looks the same, so the drawn one stays.
     */
    override eq(other: FoldWidget): boolean {
        return other.item === this.item && other.folded === this.folded;
    }

    /**
     * Draws the arrow, its words for screen readers and as tooltip,
     * which folds or unfolds on a click.
     */
    toDOM(view: EditorView): HTMLElement {
        const arrow: HTMLSpanElement = document.createElement("span");
        arrow.className = `cm-fold ${this.item ? "cm-fold-item" : "cm-fold-heading"}${this.folded ? " cm-folded" : ""}`;
        arrow.title = this.folded ? "Unfold" : "Fold";
        arrow.setAttribute("aria-label", arrow.title);
        arrow.addEventListener("mousedown", (event: MouseEvent): void => {
            event.preventDefault();
            foldToggle(view, view.posAtDOM(arrow));
        });
        return arrow;
    }

    /**
     * Keeps a click on the arrow from the editor, which would put the cursor there.
     */
    override ignoreEvent(): boolean {
        return true;
    }
}

/**
 * Formula rendered by MathJax, as the scripts view renders it:
 * `$…$` within the line, `$$…$$` on its own.
 */
class MathWidget extends WidgetType {
    /**
     * TeX of the formula, without its `$`.
     */
    readonly tex: string;

    /**
     * Whether it is a formula `$$…$$`.
     */
    readonly display: boolean;

    /**
     * Whether it shows below its TeX being edited.
     */
    readonly preview: boolean;

    constructor(tex: string, display: boolean, preview: boolean) {
        super();
        this.tex = tex;
        this.display = display;
        this.preview = preview;
    }

    /**
     * Tells whether another formula looks the same, so the rendered one stays.
     */
    override eq(other: MathWidget): boolean {
        return (
            other.tex === this.tex &&
            other.display === this.display &&
            other.preview === this.preview
        );
    }

    /**
     * Renders the formula as the scripts view does,
     * from an element of the class `math` with its TeX.
     */
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

    /**
     * Lets a click reach the editor, which puts the cursor at the formula, so it shows as TeX.
     */
    override ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Image, as the scripts view shows it, at its own size.
 */
class ImageWidget extends WidgetType {
    /**
     * Address of the image at the reader.
     */
    readonly address: string;

    constructor(address: string) {
        super();
        this.address = address;
    }

    /**
     * Tells whether another image looks the same, so the shown one stays.
     */
    override eq(other: ImageWidget): boolean {
        return other.address === this.address;
    }

    /**
     * Shows the image; once loaded, the editor measures its lines again.
     */
    toDOM(view: EditorView): HTMLElement {
        const image: HTMLImageElement = document.createElement("img");
        image.className = "internal-embed";
        image.src = this.address;
        image.addEventListener("load", (): void => view.requestMeasure());
        return image;
    }

    /**
     * Lets a click reach the editor, which puts the cursor at the image, so it shows as text.
     */
    override ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Task box of a list item, as the scripts view shows it, which a click ticks or unticks,
 * as in Obsidian: `[ ]` becomes `[x]` and back, the cursor staying where it is;
 * in a file to read only it cannot be ticked.
 */
class TaskBoxWidget extends WidgetType {
    /**
     * Whether it is ticked, `[x]`.
     */
    readonly done: boolean;

    constructor(done: boolean) {
        super();
        this.done = done;
    }

    /**
     * Tells whether another box looks the same, so the shown one stays.
     */
    override eq(other: TaskBoxWidget): boolean {
        return other.done === this.done;
    }

    /**
     * Shows the box, as marked writes it for the scripts view;
     * a click writes `x` or a space between its brackets.
     * - `pos`: Start of the box in the text, its `[`.
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

    /**
     * Keeps a click on the box from the editor,
     * which would put the cursor there: the box ticks itself.
     */
    override ignoreEvent(): boolean {
        return true;
    }
}

/**
 * Line break `<br>` or break opportunity `<wbr>`,
 * drawn as the element itself, as in the scripts view:
 * `<br>` breaks the line, and a `<wbr>` after it at the end
 * of a line holds the empty line below it.
 */
class BreakWidget extends WidgetType {
    /**
     * Element drawn, `br` or `wbr`.
     */
    readonly tagName: string;

    constructor(tagName: string) {
        super();
        this.tagName = tagName;
    }

    /**
     * Tells whether another break is the same element, so the drawn one stays.
     */
    override eq(other: BreakWidget): boolean {
        return other.tagName === this.tagName;
    }

    /**
     * Draws the element.
     */
    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        box.append(document.createElement(this.tagName));
        return box;
    }

    /**
     * Lets a click reach the editor, which puts the cursor at the break, so it shows as text.
     */
    override ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Tabs the look hides, like the indentation of a line of a list,
 * as far as a selection covers them:
 * their marks, see {@link invisibleMarks}, faint left of where the text begins,
 * or of the bullet or number of a point, taking no room, so I see what I select,
 * see {@link invisiblesLook}.
 */
class InvisiblesWidget extends WidgetType {
    /**
     * The marks, a blank for each other character hidden with them,
     * like a space of the indentation.
     */
    readonly marks: string;

    /**
     * What the hidden stretch stands before: `bullet` or `number` for the indentation of a point,
     * whose marks go left of its bullet or number, else `text`.
     */
    readonly before: string;

    constructor(marks: string, before: string) {
        super();
        this.marks = marks;
        this.before = before;
    }

    /**
     * Tells whether other marks are the same, so the drawn ones stay.
     */
    override eq(other: InvisiblesWidget): boolean {
        return other.marks === this.marks && other.before === this.before;
    }

    /**
     * Draws the marks, see `./editor.css`.
     */
    toDOM(): HTMLElement {
        const box: HTMLSpanElement = document.createElement("span");
        box.className = `cm-invisibles cm-invisibles-${this.before}`;
        box.dataset.marks = this.marks;
        return box;
    }

    /**
     * Lets a click reach the editor, as on the text beside it.
     */
    override ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Tables, callouts, code blocks or HTML blocks right below each other,
 * rendered as the scripts view renders them, with their images, formulas and links,
 * a link that leads nowhere faded, without space of their own above and below them,
 * which only the empty lines around them give, as around any block, see `./editor.css`.
 */
class BlockWidget extends WidgetType {
    /**
     * Markdown of the blocks, their whole lines.
     */
    readonly markdown: string;

    /**
     * Files the links of the note lead to.
     */
    readonly links: Links;

    /**
     * Length of their lines in the note, with their indentation,
     * from the start of the first line to the end of the last.
     */
    readonly length: number;

    constructor(markdown: string, links: Links, length: number) {
        super();
        this.markdown = markdown;
        this.links = links;
        this.length = length;
    }

    /**
     * Tells whether other blocks look the same, so the rendered ones stay.
     */
    override eq(other: BlockWidget): boolean {
        return (
            other.markdown === this.markdown &&
            other.length === this.length &&
            other.links === this.links
        );
    }

    /**
     * Renders the blocks; once an image of them is loaded, the editor measures its lines again.
     * A table of them wider than the page, like that of `Foods.md`, scrolls sideways on its own,
     * see {@link tableMeasure}, measured again whenever its size changes,
     * like when the window narrows, and the editor measures its lines again;
     * every code block of them names its language by the list at its top right, see {@link fencesOf},
     * the languages of `../notes/code.ts`, picking one writes it after its ```, `–` takes it away;
     * every table of them opens whole over the file by the button at its top right,
     * to edit as a spreadsheet,
     * see {@link tableOpen}, the button standing in a frame around the table, `table-frame`.
     * A click on a link of them follows it,
     * see {@link addressFollow}, a click on the title of a callout that folds opens or closes it,
     * as in the scripts view, and the editor measures its lines again;
     * a press on a scrollbar of a part too wide or too high, like a code block, only scrolls it;
     * any other click or tap puts the cursor at the place of their text I pressed,
     * see {@link blockPlaceOf}, so they show as text with the cursor there, ready to type;
     * but a click or tap on a table leaves it rendered,
     * so I can scroll it, by its scrollbars too, by the wheel, the touchpad or a swipe,
     * and only a double click or double tap on it puts the cursor there.
     * - {@link ResizeObserver}: Calls back once a table is laid out and whenever its size changes.
     * - `runs`: First line of each table of them, see {@link tableRunsOf}.
     * - `fences`: The ``` of each code block of them, in the order of its `pre`.
     * - `frame`: Frame around a code block and its list, `code-frame`.
     * - `pick`: The list of the languages, `code-language`, the one written picked.
     * - `place`: Puts the cursor at the place of their text pressed.
     * - `mousedown`: Its default, focusing the editor with the cursor beside them,
     *   so they show as text, prevented, but on the list of a code block, which then opens;
     *   a scrollbar still drags. Puts the cursor there, not on a scrollbar,
     *   see {@link scrollbarHit},
     *   nor on a link, the title of a callout, the button of a table or a table.
     * - `dblclick`: Puts the cursor in a table, not on its scrollbars, a link or its button.
     * - `mouseover`: Shows the whole text of a cell of a table cut by `…`,
     *   see {@link cellTitleShow}.
     * - `from`: Start of their first line.
     * - `follow`: Follows the link clicked, here or in a table opened over the file,
     *   see {@link addressFollow}, a person to its row in `Persons.md` in this window,
     *   see `../persons.ts`, and tells whether it opened something,
     *   so a link that opens only on the computer leaves the table open.
     * - `link`: The link clicked, `null` for none.
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
        block
            .querySelectorAll<HTMLTableElement>("table")
            .forEach((table: HTMLTableElement, index: number): void => {
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
                            (markdown: string): HTMLElement =>
                                blockRender(view, markdown, this.links),
                            follow,
                        );
                });
                table.replaceWith(frame);
                frame.append(table, open);
                new ResizeObserver((): void => {
                    tableMeasure(table);
                    view.requestMeasure();
                }).observe(table);
            });
        const fences: Fence[] = fencesOf(this.markdown);
        block
            .querySelectorAll<HTMLPreElement>("pre")
            .forEach((pre: HTMLPreElement, index: number): void => {
                const fence: Fence | undefined = fences[index];
                if (fence === undefined) return;
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
            });
        const place: (event: MouseEvent) => void = (event: MouseEvent): void => {
            const from: number = view.posAtDOM(block);
            view.focus();
            view.dispatch({
                selection: { anchor: blockPlaceOf(view, from, from + this.length, event) },
            });
        };
        block.addEventListener("mousedown", (event: MouseEvent): void => {
            if (event.button !== 0 || (event.target as Element).closest("select") !== null) return;
            event.preventDefault();
            if (
                !scrollbarHit(event) &&
                (event.target as Element).closest("a, summary, button, table") === null
            )
                place(event);
        });
        block.addEventListener("dblclick", (event: MouseEvent): void => {
            if (
                event.button === 0 &&
                !scrollbarHit(event) &&
                (event.target as Element).closest("table") !== null &&
                (event.target as Element).closest("a, button") === null
            )
                place(event);
        });
        block.addEventListener("mouseover", cellTitleShow);
        block.addEventListener("toggle", (): void => view.requestMeasure(), true);
        block.addEventListener("click", (event: MouseEvent): void => {
            follow(event);
        });
        return block;
    }

    /**
     * Keeps clicks in the blocks from the editor, which would put the cursor at their start or end:
     * the blocks place the cursor themselves, in a table on a double click.
     */
    override ignoreEvent(): boolean {
        return true;
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
 * - `fences`: Those found.
 * - `open`: The ``` of the block open, `null` outside a block.
 * - `at`: Start of the line.
 * - `fence`: The `>` and blanks before it, it and what follows it, `null` for a line without one.
 *
 * @param markdown - Markdown of whole lines, like that of a {@link BlockWidget}
 * @returns The ``` that open, in the order of the blocks
 */
function fencesOf(markdown: string): Fence[] {
    const fences: Fence[] = [];
    let open: string | null = null;
    let at: number = 0;
    for (const line of markdown.split("\n")) {
        const fence: RegExpExecArray | null = /^((?:[ \t]*>[ \t]?)*[ \t]*)(`{3,}|~{3,})(.*)$/.exec(
            line,
        );
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

/**
 * Builds the address of a file at the reader, like an image of a note.
 *
 * @param path - Path, as the scripts view takes it
 * @returns Address like `/api/notes/file?path=…`
 */
function fileAddressOf(path: string): string {
    return `/api/notes/file?path=${encodeURIComponent(path)}`;
}

/**
 * Renders Markdown as the scripts view does, with its images, formulas and links,
 * a link that leads nowhere faded,
 * and so is one to a place the dashboard does not open, without the dots, see {@link computerOnly},
 * and the names of people in the columns `Lecturers`,
 * `Tutor` and `Head` of a table as links to their rows, see `peopleLink` in `../persons.ts`;
 * once an image is loaded, the editor measures its lines again.
 * Renders rendered blocks, see {@link BlockWidget},
 * and a table opened over the file, see `./table.ts`.
 *
 * @param view - The editor
 * @param markdown - The Markdown, whole lines
 * @param links - Files the links of the note lead to
 * @returns Element holding it
 */
function blockRender(view: EditorView, markdown: string, links: Links): HTMLDivElement {
    const block: HTMLDivElement = document.createElement("div");
    block.innerHTML = htmlOf(markdown);
    block
        .querySelectorAll<HTMLImageElement>("img[data-link]")
        .forEach((image: HTMLImageElement): void => {
            const path: string | null = links[image.dataset.link ?? ""] ?? null;
            if (path !== null) image.src = fileAddressOf(path);
            image.addEventListener("load", (): void => view.requestMeasure());
        });
    block
        .querySelectorAll<HTMLAnchorElement>("a[data-link]")
        .forEach((link: HTMLAnchorElement): void => {
            const target: string = link.dataset.link ?? "";
            const address: string | null = linkAddressOf(view.state, target, "");
            if (address === null) link.classList.add("is-unresolved");
            if (address === "") {
                link.classList.add("is-computer-only");
                link.title = "Opens only on the computer";
            }
        });
    peopleLink(block);
    mathRender(block);
    return block;
}

/**
 * Tells whether a click hit a scrollbar of a part of rendered blocks too wide or too high,
 * like the table of `Foods.md`, see {@link BlockWidget}:
 * below or right of its rows, within its box.
 * - `target`: What the click hit, the table itself where it hit a scrollbar.
 *
 * @param event - The click
 * @returns Whether it hit a scrollbar
 */
function scrollbarHit(event: MouseEvent): boolean {
    const target: Element = event.target as Element;
    return (
        (target.scrollWidth > target.clientWidth && event.offsetY >= target.clientHeight) ||
        (target.scrollHeight > target.clientHeight && event.offsetX >= target.clientWidth)
    );
}

/**
 * Finds the place in the text of rendered blocks that a click hit, see {@link BlockWidget}:
 * in a table the cell clicked, see {@link cellPlaceOf};
 * elsewhere, like in a code block, the letter clicked, found by the text around it;
 * else the end of the blocks, after a code block's closing fence, so typing never breaks it.
 * - {@link Document#caretPositionFromPoint}: Gives the text and the letter under the pointer.
 * - `caret`: The letter clicked, `null` beside any text.
 * - `cell`: The cell of a table clicked, `null` for none.
 * - `text`: The text around the letter clicked, empty for none.
 * - `at`: Where that text stands in the lines of the blocks, -1 for nowhere.
 *
 * @param view - The editor
 * @param from - Start of the first line of the blocks
 * @param to - End of their last line
 * @param event - The click
 * @returns The place for the cursor
 */
function blockPlaceOf(view: EditorView, from: number, to: number, event: MouseEvent): number {
    const caret: CaretPosition | null = document.caretPositionFromPoint(
        event.clientX,
        event.clientY,
    );
    const cell: HTMLTableCellElement | null = (event.target as Element).closest("td, th");
    if (cell !== null) return cellPlaceOf(view, from, to, cell, caret);

    const text: string =
        caret?.offsetNode.nodeType === Node.TEXT_NODE ? (caret.offsetNode.textContent ?? "") : "";
    const at: number = text.trim() === "" ? -1 : view.state.sliceDoc(from, to).indexOf(text);
    return at === -1 ? to : from + at + (caret?.offset ?? 0);
}

/**
 * Finds the place in the text of a table for a click on one of its cells:
 * its row is a line of the table, the line of `-` under the head left out,
 * the tables of the blocks being their runs of lines that begin with `|`;
 * in the row the text of the cell, after its `|`,
 * at the letter clicked where the cell's text holds it as it is,
 * like a number, else at its start, like for a formula.
 * - `table`: The table of the cell, and `tables` all tables of the blocks.
 * - `last`: Number of the last line of the blocks.
 * - `runs`: First line of each table of the blocks, see {@link tableRunsOf}.
 * - `row`: Number of the cell's row in its table, the head being 0.
 * - `line`: The line of that row.
 * - `bars`: How many `|` stand before the cell's text so far,
 *   escaped ones like in `[[…\|…]]` not counted.
 * - `start`: Start of the cell's text in its line.
 * - `text`, `at`: The text around the letter clicked,
 *   and where it stands in the cell's text, -1 for nowhere.
 *
 * @param view - The editor
 * @param from - Start of the first line of the blocks
 * @param to - End of their last line
 * @param cell - The cell clicked
 * @param caret - The letter clicked, `null` beside any text
 * @returns The place for the cursor
 */
function cellPlaceOf(
    view: EditorView,
    from: number,
    to: number,
    cell: HTMLTableCellElement,
    caret: CaretPosition | null,
): number {
    const table: HTMLTableElement = cell.closest("table") as HTMLTableElement;
    const tables: HTMLTableElement[] = [
        ...(table.closest(".cm-rendered")?.querySelectorAll("table") ?? []),
    ];
    const last: number = view.state.doc.lineAt(to).number;
    const runs: number[] = tableRunsOf(view, from, to);
    const row: number = [...table.rows].indexOf(cell.parentElement as HTMLTableRowElement);
    if (runs[tables.indexOf(table)] === undefined || row === -1) return to;

    const line: Line = view.state.doc.line(
        Math.min(runs[tables.indexOf(table)] + row + (row > 0 ? 1 : 0), last),
    );
    let bars: number = 0;
    let start: number = line.length;
    for (let index: number = 0; index < line.length; index++)
        if (
            line.text[index] === "|" &&
            line.text[index - 1] !== "\\" &&
            bars++ === cell.cellIndex
        ) {
            start = index + 1 + (/^[ \t]*/.exec(line.text.slice(index + 1))?.[0].length ?? 0);
            break;
        }
    const text: string =
        caret?.offsetNode.nodeType === Node.TEXT_NODE ? (caret.offsetNode.textContent ?? "") : "";
    const at: number =
        text.trim() === ""
            ? -1
            : line.text
                  .slice(start)
                  .split(/(?<!\\)\|/)[0]
                  .indexOf(text);
    return line.from + start + (at === -1 ? 0 : at + (caret?.offset ?? 0));
}

/**
 * Finds the tables in the text of rendered blocks, see {@link BlockWidget}:
 * their runs of lines that begin with `|`,
 * after the indentation and the `>` of a quote or callout around them,
 * in the order the blocks show them.
 * - `first`, `last`: Numbers of the first and the last line of the blocks.
 *
 * @param view - The editor
 * @param from - Start of the first line of the blocks
 * @param to - End of their last line
 * @returns Number of the first line of each table
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
 * none of a selection made by the pointer, which keeps the look;
 * while the mouse button is down after a press in the text those of the moment of the press,
 * see {@link frozen}, so no text moves under the pointer while I click or drag,
 * and a click shows what it touches as text once I let go.
 *
 * @param state - Text and cursor
 * @returns The places
 */
function cursorsOf(state: EditorState): number[] {
    return (
        state.field(frozen) ??
        state.selection.ranges
            .filter((range: SelectionRange): boolean => range.empty || !state.field(pointed))
            .map((range: SelectionRange): number => range.head)
    );
}

/**
 * Tells whether a cursor touches a stretch of the text, also at its ends,
 * while I am editing, see {@link cursorsOf}.
 *
 * @param look - Look being built
 * @param from - Start of the stretch
 * @param to - End of the stretch
 * @returns Whether it is touched
 */
function touched(look: Look, from: number, to: number): boolean {
    return (
        look.focused &&
        look.cursors.some((cursor: number): boolean => cursor >= from && cursor <= to)
    );
}

/**
 * Tells whether the cursor or a selection lies on a line of a stretch of the text.
 *
 * @param look - Look being built
 * @param from - Start of the stretch
 * @param to - End of the stretch
 * @returns Whether a line of it is touched
 */
function linesTouched(look: Look, from: number, to: number): boolean {
    return touched(look, look.state.doc.lineAt(from).from, look.state.doc.lineAt(to).to);
}

/**
 * Tells whether a block is a callout,
 * a quote whose first line is like `> [!note] Title`, see {@link calloutRule}.
 *
 * @param look - Look being built
 * @param node - Block, like a `Blockquote`
 * @returns Whether it is a callout
 */
function calloutIs(look: Look, node: SyntaxNode): boolean {
    return (
        node.name === "Blockquote" &&
        calloutRule.test(look.state.sliceDoc(node.from, look.state.doc.lineAt(node.from).to))
    );
}

/**
 * Hides a stretch of markup.
 *
 * @param look - Look being built
 * @param from - Start of the markup
 * @param to - End of the markup
 */
function hide(look: Look, from: number, to: number): void {
    if (from < to) look.decorations.push(hidden.range(from, to));
}

/**
 * Gives the end of markup like `##` or `>`, with the space or tab after it, which goes with it.
 *
 * @param look - Look being built
 * @param mark - Markup
 * @returns Its end, after the space or tab
 */
function markEndOf(look: Look, mark: SyntaxNode): number {
    return /[ \t]/.test(look.state.sliceDoc(mark.to, mark.to + 1)) ? mark.to + 1 : mark.to;
}

/**
 * Gives each line of a stretch of the text a class, like the lines of a code block.
 *
 * @param look - Look being built
 * @param from - Start of the stretch
 * @param to - End of the stretch
 * @param line - Decoration with the class
 */
function linesMark(look: Look, from: number, to: number, line: Decoration): void {
    const last: number = look.state.doc.lineAt(to).number;
    for (let number: number = look.state.doc.lineAt(from).number; number <= last; number++)
        look.decorations.push(line.range(look.state.doc.line(number).from));
}

/**
 * Puts the lines of a piece of syntax into an element, as the scripts view draws the piece,
 * like a list item into an `li`, so the rules of the scripts view give it their look.
 * Pieces inside each other nest by rank:
 * the deeper a piece lies among those of {@link wrapped}, the lower its rank.
 * - {@link BlockWrapper}: Element around the lines starting in a stretch of the text.
 *
 * @param look - Look being built
 * @param node - Piece of syntax, like a `ListItem`
 * @param tagName - Element, like `li`
 * @param attributes - Attributes of the element, like a class
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
    let depth: number = 0;
    for (let parent: SyntaxNode | null = node.parent; parent !== null; parent = parent.parent)
        if (wrapped.includes(parent.name)) depth++;
    look.wrappers.push(
        BlockWrapper.create({ tagName: tagName, attributes: attributes, rank: 100 - depth }).range(
            look.state.doc.lineAt(from).from,
            to,
        ),
    );
}

/**
 * Puts the fold arrow of a heading after its text,
 * or of a list item at the start of its line,
 * from where `./editor.css` moves it left of its bullet,
 * when the line folds something, see {@link FoldWidget}.
 * - {@link foldable}: Gives what a line folds, by CodeMirror's Markdown, `null` for nothing.
 *
 * @param look - Look being built
 * @param line - Line of the heading or the list item
 * @param item - Whether it is a list item, else a heading
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
 * like `Definition` of `## Definition. Population and Sample`, a small grey box before the name,
 * its dot and space hidden, while the cursor is not on the line, see {@link kindRule};
 * no text to click into, see {@link kindClicked}.
 * - `kind`: The type word with the dot and space after it, `null` for a heading without one.
 * - `start`: Where the text of the heading starts.
 *
 * @param look - Look being built
 * @param node - Heading, like `ATXHeading2`
 * @returns `true`, to look into its text
 */
function headingLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const mark: SyntaxNode | null = node.getChild("HeaderMark");
    wrap(look, node, `h${node.name.slice(-1)}`, {}, line.from + 1);
    if (mark !== null && touched(look, line.from, line.to))
        look.decorations.push(hanging.range(mark.from, markEndOf(look, mark)));
    else if (mark !== null) {
        const start: number = markEndOf(look, mark);
        const kind: RegExpExecArray | null =
            node.name === "ATXHeading2" ? kindRule.exec(look.state.sliceDoc(start, line.to)) : null;
        hide(look, mark.from, start);
        if (kind !== null) {
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
 *
 * @param look - Look being built
 * @param node - Bold, italic, struck or code
 * @returns `true`, to look into its text
 */
function markupLook(look: Look, node: SyntaxNode): boolean {
    if (!touched(look, node.from, node.to))
        for (
            let child: SyntaxNode | null = node.firstChild;
            child !== null;
            child = child.nextSibling
        )
            if (child.name.endsWith("Mark")) hide(look, child.from, child.to);
    return true;
}

/**
 * Markdown link `[Text](Address)`: only its text while the cursor does not touch it,
 * which a click follows, a link out of my modules with an arrow after it,
 * one that leads nowhere or opens only on the computer faded, see {@link linkMarkOf}.
 * - `url`: Its address, `null` for brackets without one.
 * - `address`: The address as written, without `<` and `>`.
 * - `target`: The file it leads to, before `#`, as the reader lists it.
 * Brackets without an address, like the `[!note]` of a callout, are no link,
 * as in the scripts view, and stay as written.
 *
 * @param look - Look being built
 * @param node - Link
 * @returns `true`, to look into its text
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
            (externalRule.test(address) ? external : linkMarkOf(look.state, target)).range(
                marks[0].to,
                marks[1].from,
            ),
        );
    return true;
}

/**
 * Address of the web written as it is, like `https://…`, which GitHub's Markdown takes as a link:
 * followed by a click while the cursor does not touch it,
 * with an arrow after it as a link out of my modules;
 * the address of a Markdown link is hidden there anyway.
 *
 * @param look - Look being built
 * @param node - Address, `URL`
 * @returns `false`, as it has nothing inside to look into
 */
function urlLook(look: Look, node: SyntaxNode): boolean {
    if (
        node.parent?.name !== "Link" &&
        node.parent?.name !== "Image" &&
        !touched(look, node.from, node.to)
    )
        look.decorations.push(external.range(node.from, node.to));
    return false;
}

/**
 * Markdown image while the cursor does not touch it,
 * like `![kiosk mean bell](Visualizations/KioskMeanBell.svg)`:
 * shown at its own size when the reader found its file, else left as its text.
 * Its target is the link before `#`, as the reader lists it.
 *
 * @param look - Look being built
 * @param node - Image
 * @returns `false`, as it has nothing inside to look into
 */
function imageLook(look: Look, node: SyntaxNode): boolean {
    const url: SyntaxNode | null = node.getChild("URL");
    if (url === null || touched(look, node.from, node.to)) return false;

    const address: string = look.state.sliceDoc(url.from, url.to).replace(/^<|>$/g, "");
    const target: string = address.split("#")[0].trim();
    const path: string | null | undefined = look.links[target];
    const ending: string = /\.([a-z\d]+)$/i.exec(target)?.[1].toLowerCase() ?? "";
    if (imageEndings.includes(ending) && typeof path === "string")
        look.decorations.push(
            Decoration.replace({ widget: new ImageWidget(fileAddressOf(path)) }).range(
                node.from,
                node.to,
            ),
        );
    return false;
}

/**
 * Wiki link or embed, while the cursor does not touch it: only its text after `|`,
 * or its target without one, which a click follows, faded when it leads nowhere
 * or opens only on the computer, see {@link linkMarkOf}.
 * Its target is the link before `#`, `|` or the `\|` written in tables, as the reader lists it.
 *
 * @param look - Look being built
 * @param node - `WikiLink` like `[[Note#Heading|Text]]` or `WikiEmbed` like `![[Note]]`
 * @returns `false`, as it has nothing inside to look into
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
    if (shownFrom < shownTo)
        look.decorations.push(linkMarkOf(look.state, target).range(shownFrom, shownTo));
    return false;
}

/**
 * Builds the address a link of the note opens, see {@link addressFollow}:
 * a heading of the note itself as `#` and the heading;
 * a file the reader found the link to lead to, a note in the scripts view at its heading,
 * any other file, like a PDF, at the reader at the place after `#`;
 * else the place in `NomWorkspace` it leads to as a relative link,
 * like `../NomModulesuniversity/IN2028_BusinessAnalyticsMachineLearning.md` of a file
 * of my new system, see `linkPlaceOf` and `placeAddressOf` in `../notes/tree.ts`,
 * as VSCodium follows it. A link of a note of my modules the reader found nothing
 * for leads nowhere, but for one leading out of its module, where the reader does not look.
 * - `path`: The file the reader found the link to lead to, `null` for none,
 *   `undefined` for a link it did not look at,
 *   like every link of a file of my new system, or one written since.
 * - `file`: Path of the note in `NomWorkspace`.
 * - `place`: The place in `NomWorkspace` it leads to as a relative link, `null` for none.
 * - `module`: Folder of the module of a note of my modules, like `NomSkillingmodules/IN2028_…/`.
 *
 * @param state - Text, links and path of the note
 * @param target - The link to a file, before `#`, empty for the note itself,
 *   like `../NomModulesuniversity/IN2028_BusinessAnalyticsMachineLearning.md`
 * @param heading - The place in it after `#`, empty for none
 * @returns Address, `null` for a link that leads nowhere,
 *   empty for one to a place the dashboard does not open, like the folder of a module's lectures,
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
 * followed by a click, faded when it leads nowhere, see {@link unresolvedOf},
 * or opens only on the computer, see {@link computerOnly}.
 * - `address`: The address it opens.
 *
 * @param state - Text, links and path of the note
 * @param target - The link to a file, before `#`, empty for the note itself
 * @returns Its look
 */
function linkMarkOf(state: EditorState, target: string): Decoration {
    const address: string | null = linkAddressOf(state, target, "");
    return address === null ? unresolvedOf(target) : address === "" ? computerOnly : followable;
}

/**
 * Text of a link that leads nowhere: faded and dotted below,
 * as in the scripts view, its tooltip naming what it looked for,
 * so a broken source stands out, and no click follows it.
 *
 * @param target - What the link looked for, like `VO_UniversityLectureLessons/TUM_2025W/04_….pdf`
 * @returns Its look
 */
function unresolvedOf(target: string): Decoration {
    return Decoration.mark({
        class: "is-unresolved",
        attributes: { title: `Leads nowhere: ${target}` },
    });
}

/**
 * Formula: rendered while the cursor does not touch it,
 * a formula `$…$` with the punctuation right after it, like `,`, on its line,
 * as in the scripts view, see `mathInline` in `../notes/markdown.ts`;
 * else its TeX, a formula `$$…$$` rendered below it.
 * - `after`: The rest of its line.
 * - `punctuation`: How many characters of punctuation follow it.
 *
 * @param look - Look being built
 * @param node - Formula, `InlineMath`
 * @returns `false`, as it has nothing inside to look into
 */
function mathLook(look: Look, node: SyntaxNode): boolean {
    const text: string = look.state.sliceDoc(node.from, node.to);
    const display: boolean = text.startsWith("$$");
    const tex: string = display ? text.slice(2, -2) : text.slice(1, -1);
    const after: string = look.state.sliceDoc(node.to, look.state.doc.lineAt(node.to).to);
    const punctuation: number = display ? 0 : (punctuationRule.exec(after)?.[0].length ?? 0);
    if (!touched(look, node.from, node.to)) {
        look.decorations.push(
            Decoration.replace({ widget: new MathWidget(tex, display, false) }).range(
                node.from,
                node.to,
            ),
        );
        if (punctuation > 0)
            look.decorations.push(unbroken.range(node.from, node.to + punctuation));
    } else if (display) {
        look.decorations.push(
            Decoration.widget({ widget: new MathWidget(tex, true, true), side: 1 }).range(node.to),
        );
    }
    return false;
}

/**
 * List: its lines in a `ul` or `ol`, up to where its last item ends, see {@link itemEndOf},
 * as the scripts view draws them;
 * in two around the empty line a key just put the cursor on left of the text of its points,
 * see {@link typingCutOf}, so that line stands outside it at once.
 * A list within a point, whose guide line `../notes/notes.css` draws,
 * tells the empty lines right below it that stand outside that point, see {@link airBelowOf},
 * so `./editor.css` draws its guide line on through them, as through the air within the point,
 * while the list around it goes on below them, see {@link listOnIs},
 * not before a heading or text after the list.
 * - `tagName`: Its element, `ul` or `ol`.
 * - `end`: Where its lines end.
 * - `parent`: The point it stands in, `null` for none.
 * - `air`: Empty lines right below it outside that point, the air its guide line runs through.
 * - `attributes`: Attributes of its element: those empty lines.
 * - `cut`: The empty line the cursor stands on left of the text of its points, `null` for none.
 * - `after`: Its first point below that line, `null` for none.
 *
 * @param look - Look being built
 * @param node - `BulletList` or `OrderedList`
 * @returns `true`, to look into its items
 */
function listLook(look: Look, node: SyntaxNode): boolean {
    const tagName: string = node.name === "BulletList" ? "ul" : "ol";
    const end: number = node.lastChild !== null ? itemEndOf(look, node.lastChild) : node.to;
    const parent: SyntaxNode | null = node.parent?.name === "ListItem" ? node.parent : null;
    const air: number =
        parent !== null &&
        look.state.doc.lineAt(itemDrawEndOf(look, parent)).number ===
            look.state.doc.lineAt(end).number &&
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
 * Tells whether the outermost list around a list goes on below the empty lines after a line,
 * with a point or a paragraph of a point, not a heading or text after the list,
 * see {@link listLook}.
 * - `root`: The outermost list around it.
 * - `line`: A line below, at last the first one with text.
 *
 * @param look - Look being built
 * @param node - `BulletList` or `OrderedList`
 * @param end - End of the line, the end of the list
 * @returns Whether it goes on
 */
function listOnIs(look: Look, node: SyntaxNode, end: number): boolean {
    let root: SyntaxNode = node;
    for (let up: SyntaxNode | null = node.parent; up !== null; up = up.parent)
        if (up.name === "BulletList" || up.name === "OrderedList") root = up;
    for (
        let number: number = look.state.doc.lineAt(end).number + 1;
        number <= look.state.doc.lines;
        number++
    ) {
        const line: Line = look.state.doc.line(number);
        if (!emptyIs(look.state, line)) return line.from < root.to;
    }
    return false;
}

/**
 * Counts the empty lines right below a line up to the next line with text,
 * see `emptyIs` in `./keys.ts`, through which the guide line of a list ending there runs,
 * see {@link listLook}; the empty line a key just put the cursor on ends them too,
 * see `typingLine` in `./keys.ts`.
 * - `typing`: Start of that line, `null` for none.
 *
 * @param look - Look being built
 * @param end - End of the line
 * @returns Number of those empty lines, none where the note ends below them
 */
function airBelowOf(look: Look, end: number): number {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    for (
        let number: number = look.state.doc.lineAt(end).number + 1;
        number <= look.state.doc.lines;
        number++
    ) {
        const line: Line = look.state.doc.line(number);
        if (line.from === typing || !emptyIs(look.state, line))
            return number - look.state.doc.lineAt(end).number - 1;
    }
    return 0;
}

/**
 * Finds the empty line a key just put the cursor on, see `typingLine` in `./keys.ts`,
 * below the first line of a point or list and up to where it ends,
 * when its blanks stand left of the text of the point or of the points of the list,
 * like a paragraph of a point outside, where Shift+Tab moved it:
 * the point or list then ends right before it, see {@link itemDrawEndOf} and {@link listLook}.
 * - `typing`: Start of that line, `null` for none.
 * - `item`: The point, or the first point of the list.
 * - `text`: The line of that point.
 * - `indentation`: The indentation of its text after the `>` of a quote around it,
 *   `null` for a point not indented by tabs.
 * - `line`: That line.
 *
 * @param look - Look being built
 * @param node - `ListItem`, `BulletList` or `OrderedList`
 * @param end - Where its lines end
 * @returns That line, `null` for none
 */
function typingCutOf(look: Look, node: SyntaxNode, end: number): Line | null {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    const item: SyntaxNode | null = node.name === "ListItem" ? node : node.firstChild;
    const text: string = item === null ? "" : look.state.doc.lineAt(item.from).text;
    const indentation: string | null =
        item === null ? null : textIndentationOf(text.slice(quotePrefixOf(text).length));
    if (
        typing === null ||
        indentation === null ||
        typing <= look.state.doc.lineAt(node.from).to ||
        typing > end
    )
        return null;
    const line: Line = look.state.doc.lineAt(typing);
    return columnsOf(line.text.slice(quotePrefixOf(line.text).length)) < columnsOf(indentation)
        ? line
        : null;
}

/**
 * Gives where the lines of a point end on the page: up to the next point of its list,
 * over the empty lines between, see {@link itemLook}, the last point of a list where it ends,
 * see {@link itemEndOf}; right before the empty line the cursor stands on left of its text,
 * see {@link typingCutOf}.
 * - `next`: The next point of its list, `null` for none.
 * - `end`: Where its lines end, that line aside.
 *
 * @param look - Look being built
 * @param node - `ListItem`
 * @returns End of its last line
 */
function itemDrawEndOf(look: Look, node: SyntaxNode): number {
    const next: SyntaxNode | null = node.nextSibling?.name === "ListItem" ? node.nextSibling : null;
    const end: number =
        next === null ? itemEndOf(look, node) : look.state.doc.lineAt(next.from).from - 1;
    return (typingCutOf(look, node, end)?.from ?? end + 1) - 1;
}

/**
 * Finds where a list item ends on the page: after its last line
 * and the lines of blanks below it that reach its text, also past empty lines,
 * like the one Shift+Enter writes below it or a `-` taken away leaves,
 * which Markdown reads after it, so the cursor on them stands under its text,
 * see {@link listBlankIs}; those that do not reach it belong to a point it stands in.
 * - `indentation`: Indentation of its text, `null` for a point not indented by tabs.
 * - `end`: Its last line so far.
 * - `line`: A line below it.
 *
 * @param look - Look being built
 * @param node - `ListItem`
 * @returns End of its last line
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
 * maybe past other empty lines, not code; its blanks are hidden, so it stands under the text
 * of its point, see {@link itemEndOf}, and the cursor on it where text typed will begin.
 * - `above`: The nearest line with text above it.
 * - `node`: A piece of syntax at the start of that line's text, from the innermost outwards.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns Whether it is such a line
 */
function listBlankIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t]+$/.test(line.text) || !emptyIs(state, line)) return false;
    let above: Line = line;
    while (above.number > 1 && /^[ \t]*$/.test(above.text))
        above = state.doc.line(above.number - 1);
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(
            above.from + (/^[ \t]*/.exec(above.text)?.[0].length ?? 0),
            1,
        );
        node !== null;
        node = node.parent
    )
        if (node.name === "ListItem") return true;
    return false;
}

/**
 * List item: its lines in an `li`,
 * which draws its bullet or number as in the scripts view, a number as written,
 * so a step skipped, like `4.` after `2.`, keeps its number;
 * while the cursor is on its first line, without them, as its marker shows there as written,
 * see {@link listMarkLook};
 * its fold arrow left of its bullet when it has sub-points,
 * which folds them with its further lines.
 * The `li` reaches on over the empty lines up to the next point of its list,
 * so the guide line of its sub-points runs on through that air, see `../notes/notes.css`,
 * and a list with air stays one list on the page, as in the file;
 * the last point of a list over the lines of blanks that reach its text,
 * never over the empty line the cursor stands on left of its text, see {@link itemDrawEndOf}.
 * - `mark`: Its `-` or number, `ListMark`.
 * - `attributes`: Attributes of its `li`: its classes and its number.
 *
 * @param look - Look being built
 * @param node - `ListItem`
 * @returns `true`, to look into its text
 */
function itemLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const mark: SyntaxNode | null = node.getChild("ListMark");
    const attributes: { [name: string]: string } = {};
    if (touched(look, line.from, line.to)) attributes.class = "cm-source";
    if (node.parent?.name === "OrderedList" && mark !== null)
        attributes.value = String(parseInt(look.state.sliceDoc(mark.from, mark.to)));
    wrap(look, node, "li", attributes, itemDrawEndOf(look, node));
    if (node.getChild("BulletList") !== null || node.getChild("OrderedList") !== null)
        foldLook(look, line, true);
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
 *
 * @param look - Look being built
 * @param node - Marker, `ListMark`
 * @returns `true`
 */
function listMarkLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const textFrom: number =
        node.to + (/^[ \t]*/.exec(look.state.sliceDoc(node.to, line.to))?.[0].length ?? 0);
    if (/^[ \t]*$/.test(look.state.sliceDoc(line.from, node.from)))
        hide(look, line.from, node.from);
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
 * - `first`: The first line of the paragraph.
 * - `line`: One of its lines.
 *
 * @param look - Look being built
 * @param node - `Paragraph`, or `Task`, the paragraph of a task item
 * @returns `true`, to look into its text
 */
function paragraphLook(look: Look, node: SyntaxNode): boolean {
    const first: Line = look.state.doc.lineAt(node.from);
    if (/^[ \t]*$/.test(look.state.sliceDoc(first.from, node.from)))
        hide(look, first.from, node.from);
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
 * nothing of any other line of blanks, a code block, a table or a quote, whose blanks show.
 * - `blanks`: Its indentation.
 * - `node`: A piece of syntax around the start of its text, from the innermost outwards.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns Number of characters hidden at its start
 */
function hiddenStartOf(state: EditorState, line: Line): number {
    const blanks: number = /^[ \t]*/.exec(line.text)?.[0].length ?? 0;
    if (blanks === line.length) return listBlankIs(state, line) ? blanks : 0;
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from + blanks, 1);
        node !== null;
        node = node.parent
    ) {
        if (["Paragraph", "Task", "ListItem"].includes(node.name)) return blanks;
        if (["FencedCode", "CodeBlock", "HTMLBlock", "Table", "Blockquote"].includes(node.name))
            return 0;
    }
    return 0;
}

/**
/**
 * Tells the gap between two paragraphs: the first empty line after a line of text,
 * see `emptyIs` in `./keys.ts`, no place to write, see {@link caretPlace};
 * not the empty line a key just put the cursor on to write, see `typingLine` in `./keys.ts`.
 *
 * @param state - Text, cursor and syntax tree
 * @param line - The line
 * @returns Whether it is such a gap
 */
function gapIs(state: EditorState, line: Line): boolean {
    return (
        line.number > 1 &&
        line.from !== (state.field(typingLine, false) ?? null) &&
        emptyIs(state, line) &&
        !emptyIs(state, state.doc.line(line.number - 1))
    );
}

/**
 * Counts the characters of a point's line before its text:
 * its indentation, its `-` or number with the blank after it, and a task box with its blank.
 *
 * @param text - Text of the line, like `\t- [ ] Task`
 * @returns Their number, `0` for a line that starts no point
 */
function pointMarkOf(text: string): number {
    return /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/.exec(text)?.[0].length ?? 0;
}

/**
 * Keeps the cursor off what the look hides, so every key moves it where I see it:
 * put into the hidden start of a line,
 * see {@link hiddenStartOf}, by a click, Home or an arrow up or down,
 * it goes to where the text begins;
 * moved left out of the text of a line it goes on to the end of the line above,
 * as from the start of any line;
 * moved up or down onto the line of a point before its text, like from the next line of a point
 * below it, it goes to where its text begins, after its `-` or number, see {@link pointMarkOf}.
 * Never on the gap between two paragraphs, see {@link gapIs}:
 * a click on it or an arrow down goes on to the line below it, an empty line or text,
 * an arrow up to the end of the line above;
 * an arrow that went past empty lines stops on the first of them that is no gap,
 * so each further empty line is a place to write, the lower of two empty lines too.
 * Only for a cursor moved alone, never while text is changed;
 * picking by Shift and an arrow it stops on the first empty line it went past, a gap too,
 * so a selection takes one line a step, and the mouse picks as it likes.
 * - `pointer`: Whether the mouse moved the cursor.
 * - `state`: Text and cursor before the move, the same text after it.
 * - `range`: The cursor or what is picked after the move.
 * - `head`: Where the cursor was put.
 * - `before`: Where it stood.
 * - `down`: Whether it went down, or by a click.
 * - `step`: `1` for down, `-1` for up.
 * - `vertical`: Whether an arrow up or down moved it to another line.
 * - `place`: Where it goes instead, the same for no change.
 * - `line`: A line passed, then the line of the place.
 * - `start`: Where the text of that line begins.
 * - `text`: Where the text of a point on that line begins, after its `-` or number.
 *
 * @returns Filter of the changes of the editor
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
        const vertical: boolean =
            !pointer && state.doc.lineAt(head).number !== state.doc.lineAt(before).number;
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
                      { selection: { anchor: range.anchor, head: place }, sequential: true },
                  ];
        for (let line: Line = state.doc.lineAt(place); ; line = state.doc.lineAt(place)) {
            const start: number = line.from + hiddenStartOf(state, line);
            const text: number = line.from + pointMarkOf(line.text);
            if (gapIs(state, line) && down && line.number < state.doc.lines)
                place = state.doc.line(line.number + 1).from;
            else if (gapIs(state, line)) place = state.doc.line(line.number - 1).to;
            else if (vertical && place < text) place = text;
            else if (place < start && before >= start && before <= line.to && line.number > 1)
                place = state.doc.line(line.number - 1).to;
            else if (place < start) place = start;
            else break;
            if (state.doc.lineAt(place).number === line.number) break;
        }
        return place === head
            ? transaction
            : [transaction, { selection: { anchor: place }, sequential: true }];
    },
);

/**
 * Task box `[ ]` or `[x]` of a list item: the box of the scripts view,
 * as written on the line of the cursor.
 *
 * @param look - Look being built
 * @param node - Box, `TaskMarker`
 * @returns `false`, as it has nothing inside to look into
 */
function taskBoxLook(look: Look, node: SyntaxNode): boolean {
    const line: Line = look.state.doc.lineAt(node.from);
    const done: boolean = /x/i.test(look.state.sliceDoc(node.from, node.to));
    if (!touched(look, line.from, line.to))
        look.decorations.push(
            Decoration.replace({ widget: new TaskBoxWidget(done) }).range(node.from, node.to),
        );
    return false;
}

/**
 * Quote: its lines in a `blockquote`, with the line of quotes beside them,
 * as the scripts view draws it, up to its last line with text:
 * lines of only `>` at its end are air after it, as a list's is not,
 * see {@link itemLook}, but the line a key just put the cursor on to write,
 * see `typingLine` in `./keys.ts`.
 * A callout, a quote whose first line is like `> [!note] Title`,
 * renders whole as in the scripts view while the cursor is on none of its lines,
 * see {@link blockLook}, else shows as a quote.
 * - `typing`: Start of that line, `null` for none.
 * - `last`: The last line in the `blockquote`.
 *
 * @param look - Look being built
 * @param node - Quote, `Blockquote`
 * @returns Whether to look into its text, as it shows as a quote
 */
function quoteLook(look: Look, node: SyntaxNode): boolean {
    if (calloutIs(look, node) && !blockLook(look, node)) return false;
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    let last: Line = look.state.doc.lineAt(node.to);
    while (last.from > node.from && last.from !== typing && emptyIs(look.state, last))
        last = look.state.doc.line(last.number - 1);
    wrap(look, node, "blockquote", {}, last.to);
    return true;
}

/**
 * Inline HTML: a line break `<br>` or break opportunity `<wbr>` drawn as in the scripts view
 * while the cursor does not touch it, see {@link BreakWidget};
 * any other tag stays as written, and so does every tag of a table shown as its text,
 * whose rows a break would split.
 * - `table`: Whether the tag stands in a table.
 *
 * @param look - Look being built
 * @param node - Tag, `HTMLTag`
 * @returns `false`, as it has nothing inside to look into
 */
function htmlTagLook(look: Look, node: SyntaxNode): boolean {
    const tagName: string | undefined = breakRule
        .exec(look.state.sliceDoc(node.from, node.to))?.[1]
        .toLowerCase();
    let table: boolean = false;
    for (let parent: SyntaxNode | null = node.parent; parent !== null; parent = parent.parent)
        table ||= parent.name === "Table";
    if (tagName !== undefined && !table && !touched(look, node.from, node.to))
        look.decorations.push(
            Decoration.replace({ widget: new BreakWidget(tagName) }).range(node.from, node.to),
        );
    return false;
}

/**
 * Marker `>` of a quote, hidden,
 * on the line of the cursor shown left of the text, which keeps its place.
 *
 * @param look - Look being built
 * @param node - Marker, `QuoteMark`
 * @returns `true`
 */
function quoteMarkLook(look: Look, node: SyntaxNode): boolean {
    if (linesTouched(look, node.from, node.to))
        look.decorations.push(hanging.range(node.from, markEndOf(look, node)));
    else hide(look, node.from, markEndOf(look, node));
    return true;
}

/**
 * Table, callout, code block or HTML block, with those right below it:
 * their whole lines rendered as one while the cursor is on none of them,
 * so the space between them is that of the scripts view;
 * above and below them only the empty lines around them, as around any block,
 * see {@link spaceLook}.
 *
 * @param look - Look being built
 * @param node - `Table`, `FencedCode`, `HTMLBlock`, or a callout, `Blockquote`
 * @returns Whether to look into it, as it shows as text
 */
function blockLook(look: Look, node: SyntaxNode): boolean {
    if (look.rendered.includes(node.from)) return false;

    let last: SyntaxNode = node;
    while (
        last.nextSibling !== null &&
        renderedWhole.includes(last.nextSibling.name) &&
        look.state.doc.lineAt(last.nextSibling.from).number ===
            look.state.doc.lineAt(last.to).number + 1
    )
        last = last.nextSibling;
    const from: number = look.state.doc.lineAt(node.from).from;
    const to: number = look.state.doc.lineAt(last.to).to;
    if (touched(look, from, to)) return true;

    for (
        let block: SyntaxNode | null = node;
        block !== null && block.from <= last.from;
        block = block.nextSibling
    )
        look.rendered.push(block.from);
    const markdown: string = look.state.sliceDoc(from, to);
    const indentation: RegExp = new RegExp(`^${/^[ \t]*/.exec(markdown)?.[0] ?? ""}`, "gm");
    const block: BlockWidget = new BlockWidget(
        markdown.replace(indentation, ""),
        look.links,
        to - from,
    );
    look.decorations.push(Decoration.replace({ widget: block, block: true }).range(from, to));
    return false;
}

/**
 * Code block: rendered as in the scripts view while the cursor is on none of its lines,
 * else each of its lines on grey, in a font of fixed width,
 * its code between its ``` indented as rendered, see {@link codeText}.
 * - `first`, `last`: Its first line, the ``` that opens it, and its last.
 * - `end`: The last line of its code, before the ``` that closes it.
 *
 * @param look - Look being built
 * @param node - Code block, `FencedCode`
 * @returns Whether to look into it, as it shows as text
 */
function codeLook(look: Look, node: SyntaxNode): boolean {
    if (!blockLook(look, node)) return false;

    linesMark(look, node.from, node.to, codeLine);
    const first: Line = look.state.doc.lineAt(node.from);
    const last: Line = look.state.doc.lineAt(node.to);
    const end: number =
        last.number > first.number && /^[ \t>]*(?:`{3,}|~{3,})[ \t]*$/.test(last.text)
            ? last.number - 1
            : last.number;
    if (end > first.number)
        linesMark(
            look,
            look.state.doc.line(first.number + 1).from,
            look.state.doc.line(end).to,
            codeText,
        );
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
 * - `typing`: Start of that line, `null` for none.
 * - `line`: One line of the note.
 *
 * @param look - Look being built
 */
function spaceLook(look: Look): void {
    const typing: number | null = look.state.field(typingLine, false) ?? null;
    for (let number: number = 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (listBlankIs(look.state, line)) hide(look, line.from, line.to);
        if (line.from !== typing && emptyIs(look.state, line))
            look.decorations.push(
                (number > 1 && emptyIs(look.state, look.state.doc.line(number - 1))
                    ? stop
                    : gap
                ).range(line.from),
            );
    }
}

/**
 * Marks the editor while the cursor stands on the lower of two empty lines, see {@link stop},
 * so `./editor.css` draws it half a line higher, over both, the air of a line,
 * as on a line of text standing there, never reaching into the text below;
 * the click moves nothing, text typed there goes below the half line above it as before,
 * a paragraph of its own, see `paragraphTyping` in `./keys.ts`.
 * - `range`: The cursor.
 * - `line`: Its line.
 *
 * @param view - The editor
 * @returns The class, `null` elsewhere
 */
function stopCursorOf(view: EditorView): { class: string } | null {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    return range.empty &&
        line.number > 1 &&
        line.from !== (view.state.field(typingLine, false) ?? null) &&
        emptyIs(view.state, line) &&
        emptyIs(view.state, view.state.doc.line(line.number - 1))
        ? { class: "cm-stop-cursor" }
        : null;
}

/**
 * Keeps the invisible characters on the lines of the cursor invisible, see {@link invisibleRule}.
 *
 * @param look - Look being built
 */
function invisibleCharsLook(look: Look): void {
    if (!look.focused) return;

    for (const range of look.state.selection.ranges) {
        const from: number = look.state.doc.lineAt(range.from).from;
        for (const match of look.state
            .sliceDoc(from, look.state.doc.lineAt(range.to).to)
            .matchAll(invisibleRule))
            look.decorations.push(
                invisibleMark.range(from + match.index, from + match.index + match[0].length),
            );
    }
}

/**
 * Shows the tabs within each selection by their marks, see {@link invisibleMarks},
 * so I see what I select and can check they are there: where they take their room,
 * like a tab within a line, each mark over its character, see {@link invisibleShown};
 * where the look hides them,
 * like the indentation of a line of a list,
 * the marks of what the selection covers in place of the hidden stretch,
 * left of where the text begins, see {@link InvisiblesWidget}.
 * Nothing outside a selection, and nothing takes room, so no text moves.
 * - `ranges`: The selections, none while I am not editing.
 * - `selected`: Whether a selection covers a place.
 * - `decoration`: A decoration of the look, among them the hidden stretches.
 * - `text`: A hidden stretch a selection reaches into.
 * - `marks`: Its marks, a blank for each other character.
 * - `before`: What it stands before, a point's bullet or number or text,
 *   see {@link InvisiblesWidget}.
 *
 * @param look - Look being built
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
            !ranges.some(
                (range: SelectionRange): boolean =>
                    range.from < decoration.to && range.to > decoration.from,
            )
        )
            return;
        const text: string = look.state.sliceDoc(decoration.from, decoration.to);
        const marks: string = text
            .split("")
            .map((char: string, at: number): string =>
                selected(decoration.from + at) ? (invisibleMarks[char] ?? " ") : " ",
            )
            .join("");
        const before: string = /^[-*+][ \t]/.test(
            look.state.sliceDoc(decoration.to, decoration.to + 2),
        )
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
        for (const match of look.state.sliceDoc(range.from, range.to).matchAll(markedRule))
            look.decorations.push(
                invisibleShown[match[0]].range(
                    range.from + match.index,
                    range.from + match.index + match[0].length,
                ),
            );
}

/**
 * Finds the person a line names as an item after its role, see {@link roleRule},
 * or as an item under {@link responsiblesHeading}: the heading above the line is that one;
 * the name a name of `Persons.md`, see `personOf` in `../persons.ts`.
 * - `role`: The line as an item with a role, `null` for none.
 * - `person`: The person of such an item, `undefined` for nobody there.
 * - `above`: The number of a line above it, going up to the heading of its section.
 * - `item`: The line as an item, `null` for none.
 * - `named`: The person of an item under the heading, `undefined` for none.
 *
 * @param state - Text of the note and the people of `Persons.md`
 * @param line - The line
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
 * Names of people under `## Modulverantwortliche` of a module file and after their role in a list,
 * like `- Dean: Bungartz, Hans-Joachim`: each a link to its row in `Persons.md`,
 * like a name in the column `Lecturers`, see `../persons.ts`, while the cursor is not on its line;
 * a name of nobody there plain text, see {@link responsibleOf}.
 * - `under`: Whether the lines so far stand under {@link responsiblesHeading}.
 * - `named`: The person of a line and where its name begins, `undefined` for none.
 *
 * @param look - Look being built
 */
function responsiblesLook(look: Look): void {
    let under: boolean = false;
    for (let number: number = 1; number <= look.state.doc.lines; number++) {
        const line: Line = look.state.doc.line(number);
        if (line.text.startsWith("#")) under = line.text.trim() === responsiblesHeading;
        else if ((under || roleRule.test(line.text)) && !touched(look, line.from, line.to)) {
            const named: [Person, number] | undefined = responsibleOf(look.state, line);
            if (named !== undefined)
                look.decorations.push(
                    personMark.range(line.from + named[1], line.from + line.text.trimEnd().length),
                );
        }
    }
}

/**
 * Builds the look of the whole note for its text and cursor, see the top of this file.
 * - {@link Tree#iterate}: Goes through the pieces of syntax in the order of the text,
 *   into a piece while told to.
 * - {@link Decoration.set}, {@link BlockWrapper.set}:
 *   Sort the decorations and elements by their place.
 *
 * @param state - Text, cursor, syntax tree and links of the note
 * @returns Look of the note
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
 * Folds what the line of a place folds, see {@link foldLook}, or unfolds it when it is folded.
 * - `line`: The line, of a heading, a list item or the time zone of a calendar file.
 * - `folded`: What of it is folded, `null` while nothing is.
 * - `range`: What it folds.
 *
 * @param view - The editor
 * @param pos - A place on the line, like that of its fold arrow
 */
function foldToggle(view: EditorView, pos: number): void {
    const line: Line = view.state.doc.lineAt(pos);
    let folded: { from: number; to: number } | null = null;
    foldedRanges(view.state).between(line.to, line.to, (from: number, to: number): void => {
        if (from === line.to) folded = { from: from, to: to };
    });
    const range: { from: number; to: number } | null =
        folded ?? foldable(view.state, line.from, line.to);
    if (range !== null)
        view.dispatch({ effects: (folded === null ? foldEffect : unfoldEffect).of(range) });
}

/**
 * Folds every solution of the note, the section under each heading `#### Solution…`,
 * as the scripts view shows it at first, so I try a task before I see its solution;
 * the whole note read first, as the editor reads at first only what it shows.
 * - {@link forceParsing}: Reads the syntax of the note up to its end, for at most a second.
 * - `ranges`: The sections of the solutions.
 *
 * @param view - The editor
 */
export function solutionsFold(view: EditorView): void {
    forceParsing(view, view.state.doc.length, 1000);
    const ranges: { from: number; to: number }[] = [];
    for (let number: number = 1; number <= view.state.doc.lines; number++) {
        const line: Line = view.state.doc.line(number);
        const range: { from: number; to: number } | null = solutionRule.test(line.text)
            ? foldable(view.state, line.from, line.to)
            : null;
        if (range !== null) ranges.push(range);
    }
    view.dispatch({
        effects: ranges.map(
            (range: { from: number; to: number }): StateEffect<{ from: number; to: number }> =>
                foldEffect.of(range),
        ),
    });
}

/**
 * Scrolls the note to a heading,
 * so it stands right below the head of the editor, unfolding what folds it away,
 * or to its top when the heading is empty or the note has none of that text.
 * - `unfolds`: Unfolding what folds the heading away.
 * - `line`: The line of the heading, `undefined` for none.
 *
 * @param view - The editor
 * @param heading - Heading as written, like `Definition. Standard Error of the Mean`
 */
export function headingShow(view: EditorView, heading: string): void {
    let line: Line | undefined;
    const unfolds: StateEffect<{ from: number; to: number }>[] = [];
    for (
        let number: number = 1;
        heading !== "" && line === undefined && number <= view.state.doc.lines;
        number++
    )
        if (headingRule.exec(view.state.doc.line(number).text)?.[1] === heading)
            line = view.state.doc.line(number);
    foldedRanges(view.state).between(
        line?.from ?? 0,
        line?.from ?? 0,
        (from: number, to: number): void => {
            unfolds.push(unfoldEffect.of({ from: from, to: to }));
        },
    );
    view.dispatch({
        effects: [...unfolds, EditorView.scrollIntoView(line?.from ?? 0, { y: "start" })],
    });
}

/**
 * Measures a table drawn in the note, see {@link BlockWidget}:
 * one wider than the page is marked so,
 * see `.markdown table.is-wide` in `../notes/notes.css`,
 * framed and scrolling sideways, as high as all its rows.
 *
 * @param table - The table, drawn
 */
function tableMeasure(table: HTMLTableElement): void {
    table.classList.toggle("is-wide", table.scrollWidth > table.clientWidth);
}

/**
 * Scrolls the page so a row of a table stands a third down its height.
 *
 * @param scroller - The page, which scrolls
 * @param row - The row
 */
function thirdScroll(scroller: HTMLElement, row: HTMLElement): void {
    scroller.scrollTop +=
        row.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        scroller.clientHeight / 3;
}

/**
 * Shows a row of a table, the first whose first cell reads a text, like `Bichler, Martin`
 * of `| [Bichler, Martin](https://campus.tum.de/…) | Prof. Dr. |` in `Persons.md`,
 * a third down the page, see {@link thirdScroll}, and marks it, see `.row-shown` in `./editor.css`,
 * until its table shows as text; nothing when no row reads the text.
 * A table not drawn yet, far down the note, the editor scrolls to first, see {@link BlockWidget};
 * then, right before the page is drawn, the page scrolls, so nothing jumps.
 * - `cellOf`: Gives the text of the first cell of a line of a table,
 *   of a link in it the text of the link, `null` for a line of no table.
 * - `line`: The line of the row, `undefined` for none.
 * - `rowOf`: Gives the row as drawn, `undefined` while its table is not drawn.
 * - `row`, `page`: The row as drawn and the page of the file, which scrolls.
 *
 * @param view - The editor
 * @param text - Text of the first cell of the row, like `Bichler, Martin`
 */
export function rowShow(view: EditorView, text: string): void {
    const cellOf: (line: string) => string | null = (line: string): string | null => {
        if (!/^[ \t>]*\|/.test(line)) return null;
        const cell: string = line.split("|")[1]?.trim() ?? "";
        return /^\[([^\]]*)\]\([^)]*\)$/.exec(cell)?.[1].trim() ?? cell;
    };
    let line: Line | undefined;
    for (
        let number: number = 1;
        text !== "" && line === undefined && number <= view.state.doc.lines;
        number++
    )
        if (cellOf(view.state.doc.line(number).text) === text) line = view.state.doc.line(number);
    if (line === undefined) return;

    const rowOf = (): HTMLTableRowElement | undefined =>
        [...view.contentDOM.querySelectorAll<HTMLTableRowElement>(".cm-rendered tr")].find(
            (shown: HTMLTableRowElement): boolean => shown.cells[0]?.textContent?.trim() === text,
        );
    if (rowOf() === undefined)
        view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: "start" }) });
    requestAnimationFrame((): void => {
        const row: HTMLTableRowElement | undefined = rowOf();
        const page: HTMLElement | null = view.dom.closest<HTMLElement>(".editor-file");
        if (row === undefined || page === null) return;
        row.classList.add("row-shown");
        thirdScroll(page, row);
    });
}

/**
 * Finds the link at a place of the note: a wiki link, a Markdown link,
 * or an address written as it is.
 * - `url`: An address found on the way, `null` for none.
 *
 * @param state - Text and syntax tree of the note
 * @param pos - The place
 * @returns The link, `WikiLink`, `Link` or `URL`, `null` for none
 */
function linkAt(state: EditorState, pos: number): SyntaxNode | null {
    let url: SyntaxNode | null = null;
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1);
        node !== null;
        node = node.parent
    ) {
        if (node.name === "WikiLink" || node.name === "Link") return node;
        if (node.name === "URL") url = node;
    }
    return url;
}

/**
 * Follows a link, as the scripts view does:
 * a note opens in the scripts view at the heading after `#`, a heading of the same note,
 * like `[[#Task. Kiosk Sales Standard Error|…]]`, scrolls into sight, see {@link headingShow};
 * any other file opens in this window at the place after `#`,
 * like a PDF at its page with `#page=10`, an address of the web in a new tab;
 * a relative link, like `../NomModulesuniversity/IN2028_….md`, opens where it leads,
 * see {@link linkAddressOf}; a link that leads nowhere or opens only on the computer does nothing.
 * - `url`: The address of a Markdown link or an address written as it is.
 *
 * @param view - The editor
 * @param node - The link, see {@link linkAt}
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
 * - `hash`: Where its `#` stands, -1 for none.
 * - `target`, `heading`: The link to a file before `#`, empty for the note itself,
 *   and the place in it after `#`.
 * - `opened`: The address it opens, see {@link linkAddressOf}, `null` or empty for none.
 *
 * @param view - The editor
 * @param address - The link as written,
 *   like `01_01_SampleMeanStandardError#Theorem. Central Limit Theorem`,
 *   `../NomModulesuniversity/IN2028_BusinessAnalyticsMachineLearning.md` or `https://…`
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
    if (target === "") {
        if (!roundHeadingShow(view, heading, true)) headingShow(view, heading);
    } else if (opened !== null && opened !== "") {
        location.assign(opened);
    }
    return target === "" || (opened !== null && opened !== "");
}

/**
 * Follows the link of a click: one of a rendered link, see {@link followable},
 * or with Ctrl held, on a Mac with Cmd, one of a link shown as its text.
 * Taking the mouse button down there keeps the cursor where it is, so the link stays rendered;
 * letting it go follows it, see {@link linkFollow}; any other click goes on to the editor.
 * - `pos`: The place of the text clicked, `null` beside the text.
 * - `node`: The link there, `null` for none.
 *
 * @param event - Mouse button taken down, `mousedown`, or a click, `click`
 * @param view - The editor
 * @returns Whether it was a click on a link, which the editor then leaves alone
 */
function linkClicked(event: MouseEvent, view: EditorView): boolean {
    if (
        event.button !== 0 ||
        (!(event.target as Element).closest(".cm-follow") && !event.ctrlKey && !event.metaKey)
    )
        return false;

    const pos: number | null = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const node: SyntaxNode | null = pos === null ? null : linkAt(view.state, pos);
    if (node === null) return false;
    event.preventDefault();
    if (event.type === "click") linkFollow(view, node);
    return true;
}

/**
 * Follows the click on the name of a person under `## Modulverantwortliche`,
 * see {@link responsiblesLook}, to its row in `Persons.md` in this window,
 * as a click on a name in the column `Lecturers` does, see `personRowAddressOf` in `../persons.ts`.
 * Taking the mouse button down there keeps the cursor where it is, so the name stays a link;
 * letting it go follows it; any other click goes on.
 * - `pos`: The place of the text clicked, `null` beside the text.
 * - `person`: The person named there, `undefined` for none.
 *
 * @param event - Mouse button taken down, `mousedown`, or a click, `click`
 * @param view - The editor
 * @returns Whether it was a click on the name of a person, which the editor then leaves alone
 */
function personClicked(event: MouseEvent, view: EditorView): boolean {
    if (event.button !== 0 || (event.target as Element).closest(".cm-person") === null)
        return false;

    const pos: number | null = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const person: Person | undefined =
        pos === null ? undefined : responsibleOf(view.state, view.state.doc.lineAt(pos))?.[0];
    if (person === undefined) return false;
    event.preventDefault();
    if (event.type === "click") location.assign(personRowAddressOf(person));
    return true;
}

/**
 * Holds the look while the mouse button is down after a press in the text, see {@link frozen}:
 * from the press, with the cursors that show as text at that moment,
 * none while the editor has no focus, until the button goes up, wherever the pointer is then.
 *
 * @param event - Mouse button taken down, `mousedown`
 * @param view - The editor
 */
function pressHold(event: MouseEvent, view: EditorView): void {
    if (event.button !== 0) return;
    view.dispatch({
        effects: pressChange.of(view.state.field(focused) ? cursorsOf(view.state) : []),
    });
    document.addEventListener(
        "mouseup",
        (): void => view.dispatch({ effects: pressChange.of(null) }),
        { once: true },
    );
}

/**
 * Lets a selection by the mouse take the hidden start of a line,
 * like the tabs of the indentation of a list, which has no room to point at:
 * an end of a drag where the pointer stood left of where the text of its line begins,
 * in the room of the bullets and guide lines, reaches to the start of the line, as in VS Code,
 * so its tabs are selected, shown by their marks, see {@link invisiblesLook},
 * and go with Backspace or Delete. Set once the button is up and the editor has made the selection.
 * - `down`: Where the pointer went down, across the page.
 * - `range`: The selection made.
 * - `reach`: Gives where an end of it reaches:
 *   the start of its line where the pointer stood left of the line's text, else the end as it is.
 *
 * @param event - Mouse button taken down, `mousedown`
 * @param view - The editor
 */
function marginSelect(event: MouseEvent, view: EditorView): void {
    if (event.button !== 0) return;
    const down: number = event.clientX;
    document.addEventListener(
        "mouseup",
        (up: MouseEvent): void => {
            setTimeout((): void => {
                const range: SelectionRange = view.state.selection.main;
                const reach: (pos: number, x: number) => number = (
                    pos: number,
                    x: number,
                ): number => {
                    const line: Line = view.state.doc.lineAt(pos);
                    const start: number = line.from + hiddenStartOf(view.state, line);
                    const coords: { left: number } | null = view.coordsAtPos(start);
                    return pos === start &&
                        start > line.from &&
                        coords !== null &&
                        x < coords.left - 4
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
 *
 * @param event - Mouse button taken down, `mousedown`
 * @returns Whether it was a click on the box, which the editor then leaves alone
 */
function kindClicked(event: MouseEvent): boolean {
    if ((event.target as Element).closest(".block-kind") === null) return false;
    event.preventDefault();
    return true;
}

/**
 * Takes the files the links of the note lead to anew,
 * as the reader found them for the note just saved,
 * so a link written since works and one that leads nowhere fades.
 *
 * @param view - The editor
 * @param links - Files the links of the note lead to
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
 * - {@link EditorView.decorations}, {@link EditorView.blockWrappers}:
 *   Take the decorations and elements of the look.
 * - {@link EditorView.editorAttributes}: Marks the cursor on the lower of two empty lines,
 *   see {@link stopCursorOf}.
 * - {@link EditorView.focusChangeEffect}:
 *   Tells {@link focused} when the editor gets or loses the focus.
 * - {@link EditorView.domEventObservers}: Holds the look while the mouse button is down,
 *   see {@link pressHold}, before the editor reads where I pressed,
 *   and lets a drag take the hidden start of a line, see {@link marginSelect}.
 * - {@link EditorView.domEventHandlers}: Follow a link clicked,
 *   see {@link linkClicked}, before the editor puts the cursor there.
 * - {@link syntaxHighlighting}: Gives the pieces of syntax their classes, see {@link highlighter},
 *   those of code their colors of my theme, see `codeHighlighter` in `../notes/code.ts`.
 * - {@link codeFolding}: Holds what is folded, without the `…` CodeMirror puts in place of it,
 *   since the arrow turned right tells it;
 *   {@link foldKeymap} folds and unfolds by keys too, like Ctrl+Shift+[ and Ctrl+Shift+].
 *
 * @param links - Files the links of the note lead to, as the reader found them when it was read
 * @param place - Path of the note in `NomWorkspace`, from which its relative links lead,
 *   like `NomManageplannings/NomMetainformations/Modules.md`
 * @returns Extension for the editor
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
            EditorView.decorations.from(
                field,
                (drawing: Drawing): DecorationSet => drawing.decorations,
            ),
            EditorView.blockWrappers.from(
                field,
                (drawing: Drawing): RangeSet<BlockWrapper> => drawing.wrappers,
            ),
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
        EditorView.focusChangeEffect.of(
            (_state: EditorState, focusing: boolean): StateEffect<boolean> =>
                focusChange.of(focusing),
        ),
        EditorView.domEventObservers({ mousedown: pressHold }),
        EditorView.domEventObservers({ mousedown: marginSelect }),
        EditorView.domEventHandlers({ mousedown: kindClicked }),
        EditorView.domEventHandlers({ mousedown: personClicked, click: personClicked }),
        EditorView.domEventHandlers({ mousedown: linkClicked, click: linkClicked }),
        syntaxHighlighting(highlighter),
        syntaxHighlighting(codeHighlighter),
    ];
}
