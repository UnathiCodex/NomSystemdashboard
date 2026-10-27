/**
 * ## Keys
 *
 * The keys of a Markdown file in the editor, as in Obsidian, see `./editor.ts`;
 * they go before CodeMirror's usual keys,
 * each the same within a line as at its end, decided by the text before the cursor,
 * the text after it carried along, the blanks at a break gone:
 * - In plain text and in a heading Enter writes one empty line more, wherever the cursor stands,
 *   before a new paragraph a line break and an empty line, see {@link paragraphBreak}.
 * - The air of a line, two empty lines, is the most air any key writes, see {@link airMost}.
 * - Lists are written as my notes write them, see §6.4, §6.5 and §6.12 of
 *   `.claude/skills/learn/3-chapter-write/document-style.md`:
 *   one tab per level, never spaces, a further line of a point in spaces under its text,
 *   see {@link textIndentationOf}.
 * - Enter continues a list or a task list with the next point of the same level, without air;
 *   right after the `-` of a point with text after it a new empty point above it,
 *   on a still empty point out one step, from the outermost level the end of the list,
 *   as in Obsidian, see {@link pointEnter};
 *   Ctrl+Enter writes the next point with one empty line above it,
 *   the air of a half line, also with the text right of the cursor,
 *   right after the `-` one empty line above the point, see {@link pointAir},
 *   in plain text and in a quote it is Enter twice, see {@link airBreak};
 *   within a further line of a point it starts the next point too, see {@link furtherContinue};
 *   on a line of only blanks, like a paragraph of a point, and before the text of a further line
 *   it puts one more empty line above it, as on an empty line, see {@link paragraphBreak};
 *   a new point there comes by typing `- `.
 * - In a quote Shift+Enter writes its next `> ` line, Enter a new paragraph in the quote,
 *   a line of only `>` and a `> ` line, and on an empty `> ` line more air, see {@link quoteBreak}.
 * - Shift+Enter goes on in the same paragraph or point on the next line, a single line break;
 *   twice it leaves an empty line, see {@link pointContinue}.
 * - Text typed first on an empty line below another becomes a paragraph of its own,
 *   in the air between two points one of the point above, see {@link paragraphTyping};
 *   a line of only blanks keeps them only while the cursor stands on it, see {@link blanksLeft}.
 * - Backspace takes away one line or one step, and nothing else moves:
 *   at the start of a line an empty line above it, then the line break,
 *   joining two texts with one blank between, as Markdown shows them, see {@link textBackward},
 *   before the text of a heading too, see {@link headingBackward};
 *   on an empty line the line, the cursor at the end of the line above;
 *   right after the `-` of an item or the `>` of a quote the `-` or `>`; never outdenting.
 *   A quote goes down its stairs as a point: a new paragraph in it, Enter,
 *   a paragraph after it with the same air, its next `> ` line, Shift+Enter, and joined,
 *   see {@link quoteBackward}.
 *   A point goes down its stairs a step each, Backspace taking only what a key wrote:
 *   right after its `-` the `-`, its blanks and air staying, see {@link markerBackward},
 *   so a new point, Enter, becomes its next line, as Shift+Enter writes it,
 *   a point with air, Ctrl+Enter, a paragraph of the point above with that air;
 *   then each empty line above goes, then the line break, see {@link blankBackward},
 *   the cursor always where text typed will stand.
 *   Delete does the same forwards, at the end of a line with the next one,
 *   see {@link markupForward}.
 * - Tab moves a list item one step in, Shift+Tab one step out, an empty line of a list too,
 *   Shift+Tab from the outermost level to the left edge, from right below text with air above it,
 *   see {@link blankIndent};
 *   always with its sub-points and further lines, taking the `-` or number of the list it joins,
 *   see {@link itemIndent} and {@link itemShift}; every change of a list counts
 *   its numbered points in order again, a sub-list from `1.`, see {@link listChange};
 *   outside a list Tab does nothing, in code it writes a tab, see {@link tabWrite},
 *   on several lines picked it moves them all one step in, and Shift+Tab one step out.
 * - Alt+Up and Alt+Down move the line of the cursor or the lines picked one line up or down,
 *   as in VS Code: a point with its sub-points and further lines as one line,
 *   a further line alone, see {@link linesMove}.
 * - Ctrl+Shift+Up and Ctrl+Shift+Down move the line of the cursor,
 *   or the lines picked, one line up or down, only them, as CodeMirror's Move line up and down.
 * - Ctrl+B and Ctrl+I make the text picked bold or italic, `**…**` and `*…*`, or take it back;
 *   with nothing picked the word at the cursor, see {@link markupToggle}.
 * - Ctrl+D takes away the line of the cursor, or the lines picked, as Obsidian's Delete paragraph.
 * - Ctrl+Z undoes and Ctrl+Shift+Z redoes only within the block of the cursor,
 *   never a change of another part of the note, see {@link historyIn}; Ctrl+Y does nothing.
 * - Arrow Up and Arrow Down go past the rows of a link or formula the cursor shows
 *   as its text in one step, and Arrow Down past a folded heading or point, see {@link lineMove};
 *   End goes past the hidden `]]` of a link that ends the line, see {@link lineEnd}.
 *
 * - `@codemirror/state`, `@codemirror/view`: The text with its cursor, and the keys.
 * - `@codemirror/commands`: CodeMirror's own commands:
 *   a tab at the cursor, indenting lines, deleting lines, moving a line up or down,
 *   undoing and redoing.
 * - `@codemirror/language`: The syntax tree of the note,
 *   which tells where a list item begins and ends and where a link
 *   or formula stands, and what is folded.
 * - `@codemirror/lang-markdown`: Continues a list on Enter and takes its markup away on Backspace.
 */

import {
    EditorSelection,
    EditorState,
    Prec,
    StateEffect,
    StateField,
    Transaction,
} from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
    cursorLineBoundaryForward,
    cursorLineDown,
    cursorLineUp,
    deleteLine,
    indentLess,
    insertTab,
    moveLineDown,
    moveLineUp,
    redo,
    selectLineBoundaryForward,
    selectLineDown,
    selectLineUp,
    undo,
} from "@codemirror/commands";
import { ensureSyntaxTree, foldedRanges, syntaxTree } from "@codemirror/language";
import {
    deleteMarkupBackward,
    insertNewlineContinueMarkupCommand,
} from "@codemirror/lang-markdown";

import type {
    ChangeSpec,
    StateEffectType,
    Extension,
    Line,
    SelectionRange,
    StateCommand,
    Text,
    TransactionSpec,
} from "@codemirror/state";
import type { Command } from "@codemirror/view";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";

/**
 * Tells an empty line: nothing or only blanks, in a quote only its `>`;
 * a line of code, of an HTML block or of a formula is none.
 * - `node`: A piece of syntax at the start of the line, from the innermost outwards.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns Whether it is empty
 */
export function emptyIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t>]*$/.test(line.text)) return false;
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from, 1);
        node !== null;
        node = node.parent
    )
        if (/^(?:FencedCode|CodeBlock|HTMLBlock|CommentBlock|InlineMath)$/.test(node.name))
            return false;
    return /^[ \t]*$/.test(line.text) || quoteMarkIs(state, line);
}

/**
 * Tells a line that starts with the `>` of a quote, not with a `>` of plain text.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns Whether it does
 */
function quoteMarkIs(state: EditorState, line: Line): boolean {
    const blanks: number = /^[ \t]*/.exec(line.text)?.[0].length ?? 0;
    return syntaxTree(state).resolveInner(line.from + blanks, 1).name === "QuoteMark";
}

/**
 * Gives the indentation of the text of a point, as my notes indent a further line of it,
 * see §6.4 and §6.12 of `.claude/skills/learn/3-chapter-write/document-style.md`:
 * only spaces, as many as its `-` or number with the space after it,
 * and one more per tab before it,
 * two under `- `, three under `\t- `, three under `1. `, four under `\t\t- `,
 * also for a still empty point without that space.
 * - `point`: Its tabs and its `-` or number.
 *
 * @param text - Text of the line of the point, like `\t- θ (theta)`
 * @returns The indentation, like three spaces, `null` for a line that starts no point
 */
export function textIndentationOf(text: string): string | null {
    const point: RegExpExecArray | null = /^(\t*)([-*+]|\d+[.)])(?:[ \t]|$)/.exec(text);
    return point !== null ? " ".repeat(point[2].length + 1 + point[1].length) : null;
}

/**
 * Gives the `>` of the quote a line stands in, each with the blank after it, like `> `,
 * so a line written within the quote begins with them; nothing outside a quote.
 *
 * @param text - Text of the line, like `> - Point`
 * @returns Its `>` with their blanks
 */
export function quotePrefixOf(text: string): string {
    return /^(?:[ \t]*>[ \t]?)*/.exec(text)?.[0] ?? "";
}

/**
 * Gives what a further line of a point begins with, see {@link pointContinue}:
 * the `>` of a quote around it, see {@link quotePrefixOf},
 * then the indentation of its text, see {@link textIndentationOf}.
 * - `prefix`: The `>` of the quote.
 * - `indentation`: The indentation of the point's text after them.
 *
 * @param text - Text of the line of the point, like `> - Point`
 * @returns What it begins with, like `>   `, `null` for a line that starts no point
 */
function pointStartOf(text: string): string | null {
    const prefix: string = quotePrefixOf(text);
    const indentation: string | null = textIndentationOf(text.slice(prefix.length));
    return indentation === null ? null : prefix + indentation;
}

/**
 * Gives empty lines to write above a line as its air, see {@link airMost}:
 * line breaks, within a quote each after the `>` of the quote, like `>`, so the air stays in it.
 * - `marks`: The `>` of the quote the line stands in, without the blank after the last.
 *
 * @param state - Text
 * @param line - The line
 * @param count - How many empty lines
 * @returns Them
 */
function airOf(state: EditorState, line: Line, count: number): string {
    const marks: string = quotePrefixOf(line.text).trimEnd();
    return (marks + state.lineBreak).repeat(count);
}

/**
 * Counts the blanks right before a place on its line, which a line break there takes away
 * with those right after it, see {@link blanksAfter}, so the text keeps no blanks at a break,
 * within a line as at its end.
 *
 * @param state - Text
 * @param pos - The place, like the cursor
 * @returns Number of blanks
 */
function blanksBefore(state: EditorState, pos: number): number {
    return /[ \t]*$/.exec(state.sliceDoc(state.doc.lineAt(pos).from, pos))?.[0].length ?? 0;
}

/**
 * Counts the blanks right after a place on its line, see {@link blanksBefore}.
 *
 * @param state - Text
 * @param pos - The place, like the cursor
 * @returns Number of blanks
 */
function blanksAfter(state: EditorState, pos: number): number {
    return /^[ \t]*/.exec(state.sliceDoc(pos, state.doc.lineAt(pos).to))?.[0].length ?? 0;
}

/**
 * Tells a cursor right after the `-` or number of a point on its line, see {@link emptyPointRule},
 * within a quote too: a still empty point, or one with its text after the cursor,
 * so a key does the same at the end of a line and within it.
 *
 * @param state - Text
 * @param line - The line of the cursor
 * @param head - The cursor
 * @returns Whether it stands there
 */
function markEndIs(state: EditorState, line: Line, head: number): boolean {
    const before: string = state.sliceDoc(line.from, head);
    return (
        emptyPointRule.test(before.slice(quotePrefixOf(before).length)) &&
        !/^[ \t]/.test(state.sliceDoc(head, line.to))
    );
}

/**
 * Tells a cursor right before the text of a further line of a point, only its blanks before it,
 * like a paragraph of a point, which a key then treats as a line of only blanks,
 * so it does the same within a line as at its end; a line of code is none.
 *
 * @param state - Text and syntax tree
 * @param line - The line of the cursor
 * @param head - The cursor
 * @returns Whether it stands there
 */
function furtherStartIs(state: EditorState, line: Line, head: number): boolean {
    const before: string = state.sliceDoc(line.from, head);
    return (
        /^[ \t]+$/.test(before.slice(quotePrefixOf(before).length)) &&
        !codeIs(state, line) &&
        state.doc.lineAt(itemOf(state, line)?.from ?? line.from).number !== line.number
    );
}

/**
 * Joins the line of the cursor to the end of the line above, with one blank between two texts,
 * as Markdown shows the two lines, so a line break and Backspace give the text back;
 * what stands before the cursor goes, like the blanks of a further line or the `> ` of a quote.
 * - `rest`: The text right of the cursor.
 * - `blank`: The blank between the two texts, nothing where one of them is missing.
 *
 * @param view - The editor
 * @param above - The line above
 * @returns `true`, as the key is taken
 */
function lineJoin(view: EditorView, above: Line): boolean {
    const head: number = view.state.selection.main.head;
    const rest: string = view.state.sliceDoc(head, view.state.doc.lineAt(head).to);
    const blank: string = /\S$/.test(above.text) && /^\S/.test(rest) ? " " : "";
    view.dispatch({
        changes: { from: above.to, to: head, insert: blank },
        selection: { anchor: above.to + blank.length },
        effects: typingSet.of(null),
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
}

/**
 * Counts the columns of the indentation of a line as Markdown does,
 * a tab up to the next multiple of 4.
 *
 * @param text - Text of the line
 * @returns Columns of its indentation
 */
export function columnsOf(text: string): number {
    let columns: number = 0;
    for (const char of /^[ \t]*/.exec(text)?.[0] ?? "")
        columns = char === "\t" ? columns + 4 - (columns % 4) : columns + 1;
    return columns;
}

/**
 * Counts the points of the numbered lists a change touched in order again, as Obsidian does:
 * a sub-list from `1.`, a list at the left edge on from the number its first place had before,
 * each point one more than the one before it, its `.` or `)` kept.
 * So a point moved in by Tab under `1.` becomes `1.` of its sub-list
 * and the `3.` after it `2.` again, `2.` moved above `1.` becomes `1.`;
 * lists the change did not touch keep their numbers.
 * - `doc`: Text after the change.
 * - `from`, `to`: Where the change wrote, `to` on to the end of the line below,
 *   whose list it may have made a sub-list.
 * - `changes`: The numbers to write, each over a number that differs.
 * - `before`: Number on the first place of a list before the change, `null` for none.
 * - `number`: Number the next point of the list should have, `null` until its first point is read.
 * - `mark`: The number of a point with its `.` or `)`, `ListMark`.
 * - `written`: That number as written, like `3.`.
 * - `wanted`: The number it should have, like `2.`.
 *
 * @param change - The change, like a point moved in by Tab
 * @returns Changes of the numbers, none when every list touched counts in order
 */
function numbersFixed(change: Transaction): ChangeSpec[] {
    const doc: Text = change.newDoc;
    let from: number = doc.length;
    let to: number = 0;
    change.changes.iterChangedRanges(
        (fromA: number, toA: number, fromB: number, toB: number): void => {
            from = Math.min(from, fromB);
            to = Math.max(to, toB);
        },
    );
    to = doc.line(Math.min(doc.lineAt(to).number + 1, doc.lines)).to;
    const changes: ChangeSpec[] = [];
    ensureSyntaxTree(change.state, doc.length, 200)?.iterate({
        from: Math.min(from, to),
        to: to,
        enter: (node: SyntaxNodeRef): void => {
            if (node.name !== "OrderedList") return;
            const before: RegExpExecArray | null = /^[ \t]*(\d+)[.)]/.exec(
                change.startState.doc.lineAt(change.changes.invertedDesc.mapPos(node.from, -1))
                    .text,
            );
            let number: number | null =
                node.node.parent?.name === "ListItem"
                    ? 1
                    : before !== null
                      ? Number(before[1])
                      : null;
            for (const item of node.node.getChildren("ListItem")) {
                const mark: SyntaxNode | null = item.getChild("ListMark");
                if (mark === null) continue;
                const written: string = doc.sliceString(mark.from, mark.to);
                if (number === null) number = Number.parseInt(written);
                const wanted: string = `${number}${written.slice(-1)}`;
                if (written !== wanted)
                    changes.push({ from: mark.from, to: mark.to, insert: wanted });
                number++;
            }
        },
    });
    return changes;
}

/**
 * Sends a change of a list to the editor with its numbered points counted in order again,
 * see {@link numbersFixed}, both in one step of Undo, the cursor where the change put it.
 *
 * @param view - The editor
 * @param spec - The change, like a point moved in by Tab
 */
function listChange(view: EditorView, spec: TransactionSpec): void {
    view.dispatch(spec, { changes: numbersFixed(view.state.update(spec)), sequential: true });
}

/**
 * Gives what the next line of the quote at a place begins with:
 * the indentation and every `>` of its line, of a quote in a quote too, and a space, like `> `.
 * - `node`: A piece of syntax at the place, from the innermost outwards.
 * - `marks`: The indentation and the `>` of the line.
 *
 * @param state - Text
 * @param pos - The place, like the cursor
 * @returns What the next line begins with,
 *   `null` outside a quote, in a list within it and on a line of a quote without `>`
 */
function quoteMarksOf(state: EditorState, pos: number): string | null {
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
        node !== null;
        node = node.parent
    ) {
        if (node.name === "ListItem") return null;
        if (node.name !== "Blockquote") continue;
        const marks: RegExpExecArray | null = /^[ \t]*(?:>[ \t]?)*>/.exec(
            state.doc.lineAt(pos).text,
        );
        return marks === null ? null : `${marks[0]} `;
    }
    return null;
}

/**
 * Goes on in the same paragraph or point on the next line, with Shift+Enter,
 * where I want a new line but no new paragraph or bullet, as Enter starts them,
 * see {@link paragraphBreak} and {@link furtherContinue}:
 * a single line break, the new line with the indentation of the point's text in a list,
 * see {@link textIndentationOf}, in a quote with its `> `, see {@link quoteMarksOf},
 * as I write source lines, else with the `>` and the indentation of the line.
 * The blanks at the break go, see {@link blanksBefore};
 * a line left with nothing but blanks, like the one a Shift+Enter just wrote, becomes empty,
 * so Shift+Enter twice leaves an empty line, and the cursor goes on under the text of the point,
 * where Markdown keeps the next text in the point.
 * - `range`: The cursor, or what is picked, which the line break replaces.
 * - `line`: Its line.
 * - `before`: The text of the line before the cursor without blanks at its end.
 * - `own`: The `>` and the blanks the line begins with, kept by a further line of a point.
 * - `start`: What the new line begins with.
 *
 * @param view - The editor
 * @returns `true`, as it always takes the key
 */
const pointContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.from);
    const before: string = view.state.sliceDoc(line.from, range.from).replace(/[ \t]+$/, "");
    const own: string = /^(?:[ \t]*>[ \t]?)*[ \t]*/.exec(line.text)?.[0] ?? "";
    const start: string =
        pointStartOf(line.text) ??
        (own.length > quotePrefixOf(line.text).length ? own : null) ??
        quoteMarksOf(view.state, range.from) ??
        own;
    view.dispatch({
        changes: {
            from: line.from,
            to: range.to + blanksAfter(view.state, range.to),
            insert: before + view.state.lineBreak + start,
        },
        selection: {
            anchor: line.from + before.length + view.state.lineBreak.length + start.length,
        },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Gives the points a line stands in, from the outermost to the innermost, see {@link itemOf}.
 * - `item`: A point it stands in, from the innermost outwards.
 * - `items`: The points found so far.
 *
 * @param state - Text
 * @param line - The line
 * @returns The points, `ListItem`, none outside a list
 */
function itemsOf(state: EditorState, line: Line): SyntaxNode[] {
    const items: SyntaxNode[] = [];
    for (
        let item: SyntaxNode | null = itemOf(state, line);
        item?.name === "ListItem";
        item = item.parent?.parent ?? null
    )
        items.unshift(item);
    return items;
}

/**
 * Gives the start of the next point after a point: the `>` of a quote around it,
 * its indentation and its `-`, or its number counted on, like `2. ` after `1. `,
 * after a task an empty box, like `- [ ] `.
 * - `point`: The `>` and the indentation, then its `-`, or its number and the `.` or `)` after it,
 *   then its box.
 * - `mark`: The `-` or the number counted on of the next point.
 *
 * @param state - Text
 * @param item - The point, `ListItem`
 * @returns The start of the next point, `null` for a point written otherwise
 */
function nextPointOf(state: EditorState, item: SyntaxNode): string | null {
    const point: RegExpExecArray | null =
        /^((?:[ \t]*>[ \t]?)*[ \t]*)(?:([-*+])|(\d+)([.)]))(?:[ \t]+(\[[ xX]\]))?(?:[ \t]|$)/.exec(
            state.doc.lineAt(item.from).text,
        );
    if (point === null) return null;
    const mark: string = point[2] ?? `${Number(point[3]) + 1}${point[4]}`;
    return `${point[1]}${mark} ${point[5] !== undefined ? "[ ] " : ""}`;
}

/**
 * Starts the next point with Enter on a further line of a point, the lines written below its text,
 * see {@link pointContinue}, as Obsidian does, as Enter does on the line of its `-`:
 * the next point after that point, with what stood right of the cursor,
 * the points after it counted on, see {@link listChange}, the blanks at the break gone,
 * see {@link blanksBefore}.
 * With only blanks before the cursor, on a line of only blanks, like the line Backspace
 * left of a point, see {@link markerBackward}, and before the text of a further line alike,
 * Enter writes more air, see {@link paragraphBreak};
 * anywhere else it leaves the key to the next,
 * CodeMirror's Markdown, which continues a list from the line of a `-`.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `item`: The point the new point follows, `null` for none.
 * - `insert`: What the line of the new point begins with.
 * - `from`: Where the change begins, before the blanks at the cursor.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const furtherContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const item: SyntaxNode | null =
        range.empty && !/^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head))
            ? itemAt(view.state)
            : null;
    if (item === null || view.state.doc.lineAt(item.from).number === line.number) return false;

    const insert: string | null = nextPointOf(view.state, item);
    if (insert === null) return false;
    const from: number = range.head - blanksBefore(view.state, range.head);
    listChange(view, {
        changes: {
            from: from,
            to: range.head + blanksAfter(view.state, range.head),
            insert: view.state.lineBreak + insert,
        },
        selection: { anchor: from + view.state.lineBreak.length + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Starts a new paragraph within a quote with Enter, as in plain text, see {@link paragraphBreak}:
 * a line of only `>`, the half line of air of a quote, then the next `> ` line, the cursor after it,
 * with the rest of the line; with nothing but the `>` before the cursor,
 * like on an empty `> ` line, one more line of only `>` above it, more air.
 * Shift+Enter writes the next `> ` line of the same paragraph, see {@link pointContinue};
 * Backspace right after the `> ` of a new paragraph takes the `>` away and leaves the quote,
 * the air kept, see {@link quoteBackward}.
 * A list in a quote it leaves to the next, CodeMirror's Markdown, which continues the list.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `marks`: What the next line of the quote begins with, like `> `, see {@link quoteMarksOf}.
 * - `air`: The line of only `>`.
 * - `textStart`: Whether nothing but the `>` stands before the cursor.
 * - `insert`: What it writes.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const quoteBreak: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const marks: string | null = quoteMarksOf(view.state, range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || marks === null) return false;

    const air: string = marks.trimEnd();
    const textStart: boolean = /^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head));
    const insert: string = textStart
        ? air + view.state.lineBreak
        : view.state.lineBreak + air + view.state.lineBreak + marks;
    const from: number = textStart ? line.from : range.head - blanksBefore(view.state, range.head);
    view.dispatch({
        changes: textStart
            ? { from: from, insert: insert }
            : {
                  from: from,
                  to: range.head + blanksAfter(view.state, range.head),
                  insert: insert,
              },
        selection: { anchor: (textStart ? range.head : from) + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Finds the point whose line the cursor stands on right after its `-` or number,
 * see {@link markEndIs}, a still empty point or one with its text after the cursor.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `item`: The point of the line, `null` for none.
 *
 * @param state - Text and cursor
 * @returns The point, `ListItem`, `null` when the cursor stands elsewhere
 */
function markedItemOf(state: EditorState): SyntaxNode | null {
    const range: SelectionRange = state.selection.main;
    const line: Line = state.doc.lineAt(range.head);
    const item: SyntaxNode | null = itemOf(state, line);
    return state.selection.ranges.length === 1 &&
        range.empty &&
        markEndIs(state, line, range.head) &&
        item !== null &&
        state.doc.lineAt(item.from).number === line.number
        ? item
        : null;
}

/**
 * Enter with the cursor right after the `-` or number of a point, as Obsidian does:
 * before its text a new empty point above it, of the same level, its `-` or number,
 * the cursor staying before the text, the numbers counted on, see {@link listChange};
 * on a still empty point out one step from a sub-point, see {@link itemShift},
 * else the list ends there: the `-` gone, its line the empty line below the list,
 * the cursor on a new line below it, where text typed stands as a paragraph of its own,
 * since right below a point Markdown would take it on into that point.
 * - `item`: The point, see {@link markedItemOf}.
 * - `line`: Its line.
 * - `head`: The cursor.
 * - `prefix`: The `>` of a quote around it, which stays.
 * - `point`: The start of the new point, the `-` or number with its blank, a task box empty.
 * - `parent`: The point it stands in, `null` for none.
 * - `insert`: The empty line and the start of the new line, in a quote each with its `>`.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const pointEnter: Command = (view: EditorView): boolean => {
    const item: SyntaxNode | null = markedItemOf(view.state);
    if (item === null) return false;
    const line: Line = view.state.doc.lineAt(item.from);
    const head: number = view.state.selection.main.head;
    const prefix: string = quotePrefixOf(line.text);
    if (view.state.sliceDoc(head, line.to).trim() !== "") {
        const point: string = `${view.state.sliceDoc(line.from, head).trimEnd()} `.replace(
            /\[[xX]\] $/,
            "[ ] ",
        );
        listChange(view, {
            changes: { from: line.from, insert: point + view.state.lineBreak },
            selection: { anchor: head + point.length + view.state.lineBreak.length },
            scrollIntoView: true,
            userEvent: "input",
        });
        return true;
    }
    const parent: SyntaxNode | null =
        item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
    if (parent !== null) {
        itemShift(view, item, false, nextPointOf(view.state, parent));
        return true;
    }
    const insert: string = prefix.trimEnd() + view.state.lineBreak + prefix;
    listChange(view, {
        changes: { from: line.from, to: line.to, insert: insert },
        selection: { anchor: line.from + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Ctrl+Enter with the cursor right after the `-` or number of a point, see {@link markedItemOf}:
 * one empty line above it, the air of a half line, the point staying where it is,
 * see {@link airBreak}; never more than the air of a line, see {@link airMost}.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const pointAir: Command = (view: EditorView): boolean => {
    const item: SyntaxNode | null = markedItemOf(view.state);
    if (item === null) return false;
    const line: Line = view.state.doc.lineAt(item.from);
    view.dispatch({
        changes: { from: line.from, insert: airOf(view.state, line, 1) },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Ctrl+Enter: a new block with air above it, as Enter twice in plain text:
 * in a list the next point of the same level, see {@link furtherContinue}
 * and {@link markupContinue}, with one empty line above it, the air of a half line,
 * whatever text of the line it takes along, also within a line, from a further line
 * and in a nested or numbered list, see {@link airAbove};
 * right after the `-` or number of a point one more empty line above it, see {@link pointAir};
 * in plain text, in a quote and with only blanks before the cursor Enter twice, within a line too,
 * see {@link paragraphBreak} and {@link quoteBreak}.
 * - `enter`: Enter once outside a list.
 * - `line`: The line of the cursor.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const airBreak: Command = (view: EditorView): boolean => {
    const enter: () => boolean = (): boolean => quoteBreak(view) || paragraphBreak(view);
    if (pointAir(view)) return true;
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    if (
        itemAt(view.state) !== null &&
        !/^[ \t>]*$/.test(view.state.sliceDoc(line.from, view.state.selection.main.head))
    )
        return (furtherContinue(view) || markupContinue(view)) && airAbove(view);
    return enter() && (enter() || true);
};

/**
 * Puts one empty line above the line of the cursor, the new point Ctrl+Enter wrote,
 * see {@link airBreak}, the cursor staying in its text; none where an empty line stands there.
 * - `line`: The line of the cursor.
 *
 * @param view - The editor
 * @returns `true`, as the key is taken
 */
function airAbove(view: EditorView): boolean {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    if (line.number > 1 && !emptyIs(view.state, view.state.doc.line(line.number - 1)))
        view.dispatch({
            changes: { from: line.from, insert: airOf(view.state, line, 1) },
            scrollIntoView: true,
            userEvent: "input",
        });
    return true;
}

/**
 * Continues a list on Enter by CodeMirror's Markdown with its next point,
 * the numbers counted in order again, see {@link listChange};
 * never with the empty line CodeMirror writes before the new point in a list
 * whose first points stand apart, so Enter adds one line, as everywhere.
 * - `changes`: CodeMirror's changes without that empty line.
 * - `removed`: Characters of the empty lines left out, all before the cursor.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const markupContinue: Command = (view: EditorView): boolean =>
    insertNewlineContinueMarkupCommand({ nonTightLists: false })({
        state: view.state,
        dispatch: (transaction: Transaction): void => {
            const changes: ChangeSpec[] = [];
            let removed: number = 0;
            transaction.changes.iterChanges(
                (from: number, to: number, fromB: number, toB: number, inserted: Text): void => {
                    const insert: string = inserted.toString().replace(/^(\n)[ \t>]*\n/, "$1");
                    removed += inserted.length - insert.length;
                    changes.push({ from: from, to: to, insert: insert });
                },
            );
            listChange(view, {
                changes: changes,
                selection: { anchor: transaction.newSelection.main.head - removed },
                scrollIntoView: true,
                userEvent: transaction.annotation(Transaction.userEvent),
            });
        },
    });

/**
 * Tells a line of code, of a fenced or an indented code block, whose blanks are text.
 * - `node`: A piece of syntax at the start of the line, from the innermost outwards.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns Whether it is code
 */
function codeIs(state: EditorState, line: Line): boolean {
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from, 1);
        node !== null;
        node = node.parent
    )
        if (/^(?:FencedCode|CodeBlock)$/.test(node.name)) return true;
    return false;
}

/**
 * Backspace with nothing but blanks before the cursor, outside code, only deletes, never outdents,
 * one step back each: below an empty line it takes that empty line away, the line staying,
 * so a paragraph of a point, like the one a `-` taken away left, see {@link markerBackward},
 * becomes its next line, as Shift+Enter writes it, the cursor staying where its text begins,
 * see {@link typingLine}; below text it takes the line break before the line away
 * with those blanks, so such a line of only blanks goes whole,
 * the cursor at the end of the line above, and the text of a further line of a point
 * joins the line above, see {@link lineJoin}.
 * Before the `-` or number of a point it leaves the key to the next.
 * Moving such a line a level in or out is the job of Tab and Shift+Tab, see {@link blankIndent}.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `above`: The line above it.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const blankBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (
        !range.empty ||
        line.number === 1 ||
        !/^(?:[ \t]*>[ \t]?)*[ \t]+$/.test(view.state.sliceDoc(line.from, range.head)) ||
        /^(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(view.state.sliceDoc(range.head, line.to)) ||
        codeIs(view.state, line)
    )
        return false;
    const above: Line = view.state.doc.line(line.number - 1);
    if (!emptyIs(view.state, above)) return lineJoin(view, above);
    view.dispatch({
        changes: { from: above.from, to: line.from },
        effects: typingSet.of(null),
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
};

/**
 * Joins a line of plain text to the text right above it with Backspace at its start,
 * with one blank between, see {@link lineJoin},
 * so Enter or Shift+Enter within a line and Backspace give the text back;
 * a line that starts with markup, like a `-`, `#` or `>`, and code it leaves to the next.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `above`: The line above it.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const textBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (
        view.state.selection.ranges.length > 1 ||
        !range.empty ||
        range.head !== line.from ||
        line.number === 1 ||
        !/^[^\s>#|]/.test(line.text) ||
        /^(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(line.text) ||
        codeIs(view.state, line)
    )
        return false;
    const above: Line = view.state.doc.line(line.number - 1);
    if (emptyIs(view.state, above) || codeIs(view.state, above)) return false;
    return lineJoin(view, above);
};

/**
 * Moves an empty line or a line of blanks within a list one level in, Tab, or out, Shift+Tab,
 * a further line of a point too with the cursor before its text, see {@link furtherStartIs}:
 * to the indentation of the text of the next deeper or the next outer point of the line
 * with text above it, see {@link itemsOf}, out from the outermost to the left edge;
 * in it does nothing where there is no deeper point.
 * So Shift+Tab makes the paragraph a `-` taken away left, see {@link markerBackward},
 * one of the point outside, or one after the list, and Tab one of the point inside;
 * out from right below text it puts an empty line above it too,
 * as Markdown would take text typed there on into the line above,
 * so the cursor stands where text typed on it will stand, see {@link typingLine}.
 * - `line`: The line of the cursor.
 * - `prefix`: The `>` of a quote around it, see {@link quotePrefixOf}, which it keeps.
 * - `body`: The line after them.
 * - `above`: The nearest line with text above it.
 * - `indentationOf`: Gives the indentation of the text of a point after the `>` of its quote.
 * - `levels`: Columns of the text of the points that line stands in, from the outermost.
 * - `column`: Column of the line's own blanks.
 * - `item`: The point whose text the line moves under, `null` for the left edge.
 * - `insert`: The new blanks of the line.
 * - `air`: The line break of the empty line it puts above, nothing for none.
 *
 * @param inward - Whether it moves in, else out
 * @returns The command
 */
function blankIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const prefix: string = quotePrefixOf(line.text);
        const body: string = line.text.slice(prefix.length);
        if (
            !view.state.selection.main.empty ||
            (!/^[ \t]*$/.test(body) &&
                !furtherStartIs(view.state, line, view.state.selection.main.head))
        )
            return false;
        let above: Line = line;
        while (above.number > 1 && (above.number === line.number || /^[ \t>]*$/.test(above.text)))
            above = view.state.doc.line(above.number - 1);
        const items: SyntaxNode[] = above.number === line.number ? [] : itemsOf(view.state, above);
        if (items.length === 0) return false;

        const indentationOf = (point: SyntaxNode): string => {
            const text: string = view.state.doc.lineAt(point.from).text;
            return textIndentationOf(text.slice(quotePrefixOf(text).length)) ?? "";
        };
        const levels: number[] = items.map((point: SyntaxNode): number =>
            columnsOf(indentationOf(point)),
        );
        const column: number = columnsOf(body);
        const item: SyntaxNode | null = inward
            ? (items.find((point: SyntaxNode, index: number): boolean => levels[index] > column) ??
              null)
            : (items.findLast(
                  (point: SyntaxNode, index: number): boolean => levels[index] < column,
              ) ?? null);
        if (inward && item === null) return true;
        const insert: string = prefix + (item === null ? "" : indentationOf(item));
        const air: string =
            !inward && !emptyIs(view.state, view.state.doc.line(line.number - 1))
                ? airOf(view.state, line, 1)
                : "";
        view.dispatch({
            changes: {
                from: line.from,
                to: line.from + prefix.length + (/^[ \t]*/.exec(body)?.[0].length ?? 0),
                insert: air + insert,
            },
            selection: { anchor: line.from + air.length + insert.length },
            effects: typingSet.of(null),
            userEvent: inward ? "input.indent" : "delete.dedent",
        });
        return true;
    };
}

/**
 * Takes away one empty line above a heading with Backspace right before its text, after its `#`,
 * as Backspace does before any text: the heading moves up a line and stays a heading.
 * With text right above it it leaves the key to the next, which takes away the blank after the `#`.
 * - `range`: The cursor.
 * - `line`: Its line.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const headingBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (
        !range.empty ||
        line.number === 1 ||
        !/^#{1,6}[ \t]+$/.test(view.state.sliceDoc(line.from, range.head)) ||
        syntaxTree(view.state).resolveInner(line.from, 1).name !== "HeaderMark" ||
        !emptyIs(view.state, view.state.doc.line(line.number - 1))
    )
        return false;
    view.dispatch({
        changes: { from: view.state.doc.line(line.number - 1).from, to: line.from },
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
};

/**
 * Backspace in a quote, down its stairs a step each as a point goes down its own,
 * see {@link markerBackward}, the same within a line and at its end:
 * right after the `>` of a new paragraph, below the line of only `>` Enter wrote,
 * see {@link quoteBreak}, it takes the `>` away and leaves the quote,
 * each line of only `>` right above it an empty line, so the air stays, after the quote;
 * below one empty line after the quote the line becomes the next `> ` line of the quote,
 * as Shift+Enter writes it, not text Markdown would take into the quote without its `>`;
 * right after the `>` of a line below text it joins the line to that text, see {@link lineJoin}.
 * The `>` of the first line of a quote it leaves to the next, CodeMirror's Markdown.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `before`: The text of the line before the cursor.
 * - `above`: The line above it.
 * - `top`: The first of the lines of only `>` right above it.
 * - `changes`: Those lines emptied and the `>` of the line taken away.
 * - `quote`: The line with text of the quote above the empty line.
 * - `marks`: What the next line of that quote begins with, like `> `, see {@link quoteMarksOf}.
 * - `block`: The block of the note the line stands in, a paragraph only to go into the quote.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const quoteBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || line.number === 1) return false;
    const before: string = view.state.sliceDoc(line.from, range.head);
    const above: Line = view.state.doc.line(line.number - 1);

    if (
        /^[ \t]*(?:>[ \t]?)+$/.test(before) &&
        quoteMarkIs(view.state, line) &&
        quoteMarkIs(view.state, above)
    ) {
        if (!emptyIs(view.state, above)) return lineJoin(view, above);
        let top: Line = above;
        while (top.number > 1) {
            const next: Line = view.state.doc.line(top.number - 1);
            if (!emptyIs(view.state, next) || !quoteMarkIs(view.state, next)) break;
            top = next;
        }
        const changes: ChangeSpec[] = [];
        for (let number: number = top.number; number <= above.number; number++)
            changes.push({
                from: view.state.doc.line(number).from,
                to: view.state.doc.line(number).to,
            });
        changes.push({ from: line.from, to: range.head });
        view.dispatch({
            changes: changes,
            selection: { anchor: view.state.changes(changes).mapPos(range.head) },
            effects: typingSet.of(null),
            scrollIntoView: true,
            userEvent: "delete.backward",
        });
        return true;
    }

    if (line.number < 3 || !/^[ \t]*$/.test(before) || !/^[ \t]*$/.test(above.text)) return false;
    const quote: Line = view.state.doc.line(line.number - 2);
    const marks: string | null = quoteMarksOf(view.state, quote.to);
    let block: SyntaxNode = syntaxTree(view.state).resolveInner(line.to, -1);
    while (block.parent !== null && block.parent.parent !== null) block = block.parent;
    if (
        marks === null ||
        emptyIs(view.state, quote) ||
        (/\S/.test(line.text) && block.name !== "Paragraph")
    )
        return false;
    view.dispatch({
        changes: { from: quote.to, to: range.head, insert: view.state.lineBreak + marks },
        selection: { anchor: quote.to + view.state.lineBreak.length + marks.length },
        effects: typingSet.of(null),
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
};

/**
 * Tells a line of a table, whose rows a line break would tear apart.
 * - `node`: A piece of syntax at the start of the line, from the innermost outwards.
 *
 * @param state - Text and syntax tree
 * @param line - The line
 * @returns The table, `Table`, `null` for none
 */
function tableOf(state: EditorState, line: Line): SyntaxNode | null {
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from, 1);
        node !== null;
        node = node.parent
    )
        if (node.name === "Table") return node;
    return null;
}

/**
 * Enter, Shift+Enter and Ctrl+Enter in a table, which its widget edits, see `./table.ts`:
 * at the end of its last row a new paragraph after it, as Enter at the end of a paragraph,
 * see {@link paragraphBreak}, Ctrl+Enter with the air of a line;
 * at the start of its first row an empty line above it, the table moved down by it,
 * as Enter at the start of a paragraph, Ctrl+Enter two;
 * anywhere else nothing, so no row is torn apart.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `table`: The table it stands in.
 *
 * @param lines - Line breaks it writes at the end: 2 for Enter, 3 for Ctrl+Enter
 * @returns The command, which takes the key in a table only
 */
function tableBreak(lines: number): Command {
    return (view: EditorView): boolean => {
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        const table: SyntaxNode | null = tableOf(view.state, line);
        if (table === null) return false;
        if (
            range.empty &&
            range.head === line.to &&
            view.state.doc.lineAt(table.to).number === line.number
        )
            view.dispatch({
                changes: { from: line.to, insert: view.state.lineBreak.repeat(lines) },
                selection: { anchor: line.to + view.state.lineBreak.length * lines },
                scrollIntoView: true,
                userEvent: "input",
            });
        else if (range.empty && range.head === line.from && table.from === line.from)
            view.dispatch({
                changes: { from: line.from, insert: view.state.lineBreak.repeat(lines - 1) },
                selection: { anchor: line.from + view.state.lineBreak.length * (lines - 1) },
                scrollIntoView: true,
                userEvent: "input",
            });
        return true;
    };
}

/**
 * Backspace and Delete that would join a row of a table with a line of text, or two rows,
 * do nothing, so no row is torn apart, see {@link tableBreak};
 * an empty line above or below a table they take away, as in text, so the table moves up.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `next`: The line it would join.
 * - `textIs`: Tells a line with text, neither empty nor an empty line of code.
 *
 * @param forward - Whether it is Delete, else Backspace
 * @returns The command
 */
function tableJoin(forward: boolean): Command {
    return (view: EditorView): boolean => {
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        if (!range.empty || range.head !== (forward ? line.to : line.from)) return false;
        const number: number = line.number + (forward ? 1 : -1);
        if (number < 1 || number > view.state.doc.lines) return false;
        const next: Line = view.state.doc.line(number);
        const textIs = (row: Line): boolean => !emptyIs(view.state, row) && row.length > 0;
        return (
            (tableOf(view.state, line) !== null || tableOf(view.state, next) !== null) &&
            textIs(line) &&
            textIs(next)
        );
    };
}

/**
 * Tab outside a list, see {@link itemIndent}: a tab only in code, the lines picked one step in,
 * else nothing, as a tab in text would stand there as a stray blank or begin code.
 * - `line`: The line of the cursor.
 *
 * @param view - The editor
 * @returns `true`, as it always takes the key
 */
const tabWrite: Command = (view: EditorView): boolean => {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    return !view.state.selection.main.empty || codeIs(view.state, line) ? insertTab(view) : true;
};

/**
 * An empty point: its indentation and its `-` or number, of a task with its box, nothing after it.
 */
const emptyPointRule: RegExp = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]+\[[ xX]\])?[ \t]*$/;

/**
 * Takes the `-` or number of a point below another point away with Backspace
 * right after it, see {@link markEndIs}, of a still empty point or one with its text after it,
 * a step down the stairs of a point, see the top of this file:
 * the line keeps the blanks of the point's text, see {@link textIndentationOf},
 * and the air above it, none or as much as stood there:
 * after Enter the next line of the point above, as Shift+Enter writes it,
 * after Ctrl+Enter a paragraph of it with the air of a half line;
 * right below a line of a sub-point of the point above, as after Shift+Tab, one empty line,
 * as Markdown would take the line on into that sub-point, told by the points, not by the blanks,
 * since a further line stands in spaces and a point in tabs, see {@link textIndentationOf};
 * the cursor stands where text typed on it will stand, see {@link typingLine},
 * which writes nothing more, see {@link paragraphTyping}.
 * The next Backspace takes each empty line above away, then the line break,
 * see {@link blankBackward}, never a level of its blanks, the job of Shift+Tab.
 * Any other `-` or number, like that of the first point of a list,
 * and the `>` of a quote it leaves to CodeMirror's Markdown, see `deleteMarkupBackward`.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `point`: Whether the cursor stands right after the `-` or number, see {@link markEndIs}.
 * - `item`: The point of the line, `ListItem`, `null` for none.
 * - `indentation`: The `>` of a quote and the blanks of the point's text, which the line keeps,
 *   see {@link pointStartOf}.
 * - `above`: The line above it.
 * - `holder`: The point the line above stands in, `null` for none.
 * - `air`: The line break of the empty line it puts above,
 *   nothing but below a line of a sub-point of the point above.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const markerBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const point: boolean = markEndIs(view.state, line, range.head);
    const item: SyntaxNode | null = itemOf(view.state, line);
    if (
        point &&
        range.empty &&
        item?.prevSibling?.name === "ListItem" &&
        view.state.doc.lineAt(item.from).number === line.number &&
        pointStartOf(line.text) !== null
    ) {
        const indentation: string = pointStartOf(line.text) ?? "";
        const above: Line = view.state.doc.line(line.number - 1);
        const holder: SyntaxNode | null = itemOf(view.state, above);
        const air: string =
            !emptyIs(view.state, above) &&
            holder !== null &&
            holder.from > item.prevSibling.from &&
            holder.to <= item.prevSibling.to
                ? airOf(view.state, line, 1)
                : "";
        listChange(view, {
            changes: { from: line.from, to: range.head, insert: air + indentation },
            selection: { anchor: line.from + air.length + indentation.length },
            effects: typingSet.of(null),
            scrollIntoView: true,
            userEvent: "delete.backward",
        });
        return true;
    }
    return deleteMarkupBackward({
        state: view.state,
        dispatch: (transaction: Transaction): void =>
            view.dispatch({
                changes: transaction.changes,
                selection: transaction.selection,
                effects: point ? typingSet.of(null) : [],
                scrollIntoView: true,
                userEvent: transaction.annotation(Transaction.userEvent),
            }),
    });
};

/**
 * Takes away the markup of the next line with Delete at the end of a line,
 * as Backspace right after it does, see {@link markerBackward}:
 * the `>` of a quote, the `-` or number of a point,
 * what CodeMirror's Markdown does not take, like a bare `>`, one character as Backspace does,
 * the cursor staying where it is; a next line of blanks it takes away whole,
 * the blanks before the text of a next line with the line break, see {@link blankBackward},
 * a line without markup it joins to the line, as CodeMirror does,
 * and on an empty line it takes the line away, as Backspace does.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `next`: The line below it.
 * - `markup`: The blanks, `>` and `-` or number at the start of the next line.
 * - `changed`: Sends a change of the text, the cursor staying where it is.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const markupForward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (
        !range.empty ||
        range.head !== line.to ||
        line.number === view.state.doc.lines ||
        emptyIs(view.state, line)
    )
        return false;
    const next: Line = view.state.doc.line(line.number + 1);
    const markup: string =
        /^[ \t]*(?:>[ \t]?)*(?:(?:[-*+]|\d+[.)])[ \t]+)?/.exec(next.text)?.[0] ?? "";
    const changed: (changes: ChangeSpec) => void = (changes: ChangeSpec): void =>
        view.dispatch({
            changes: changes,
            selection: { anchor: range.head },
            scrollIntoView: true,
            userEvent: "delete.forward",
        });
    if (markup.length === 0) return false;
    if (/^[ \t]+$/.test(markup)) {
        changed({ from: line.to, to: next.from + markup.length });
        return true;
    }
    if (
        !deleteMarkupBackward({
            state: view.state.update({ selection: { anchor: next.from + markup.length } }).state,
            dispatch: (transaction: Transaction): void => changed(transaction.changes),
        })
    )
        changed({ from: next.from + markup.length - 1, to: next.from + markup.length });
    return true;
};

/**
 * Writes the first text typed on an empty line right below another empty line
 * as a paragraph of its own, as Word does:
 * it writes the empty lines below the text it lacks, one before text or a list,
 * two before a heading, none at the end of the note,
 * so the text stands apart from both sides.
 * On the air between two points, which `./preview.ts` draws
 * as the air of the point above, under its text, the cursor too, see {@link airPointOf},
 * it writes the text with the blanks of that point's text, a paragraph of the point,
 * so text typed stands where the cursor stood, not on the left edge, which would end the list.
 * On a single empty line between two paragraphs it writes nothing more,
 * on the blanks of a point's text, like a paragraph of a point, see {@link markerBackward},
 * nothing at all, as the air stands there already, also where Shift+Tab put it,
 * see {@link blankIndent}, so text typed stands where the cursor stood.
 * - `line`: The line typed on.
 * - `point`: The point whose air it is, `null` for none
 *   or for the line a key just put the cursor on, drawn by its own blanks, see {@link typingLine}.
 * - `indentation`: The blanks of that point's text, nothing for none.
 * - `below`: Empty lines right below it.
 * - `next`: The first line with text below it, `null` for none.
 * - `wanted`: Empty lines it wants below it.
 *
 * @returns Handler of typed text
 */
const paragraphTyping: Extension = EditorView.inputHandler.of(
    (view: EditorView, from: number, to: number, text: string): boolean => {
        const line: Line = view.state.doc.lineAt(from);
        if (
            from !== to ||
            line.length > 0 ||
            line.number === 1 ||
            /[\r\n]/.test(text) ||
            !emptyIs(view.state, line) ||
            !emptyIs(view.state, view.state.doc.line(line.number - 1))
        )
            return false;
        const point: SyntaxNode | null =
            view.state.field(typingLine, false) === line.from ? null : airPointOf(view.state, line);
        const indentation: string =
            point === null ? "" : (textIndentationOf(view.state.doc.lineAt(point.from).text) ?? "");

        let below: number = 0;
        let next: Line | null = null;
        for (let number: number = line.number + 1; number <= view.state.doc.lines; number++) {
            next = view.state.doc.line(number);
            if (!emptyIs(view.state, next)) break;
            below++;
            next = null;
        }
        const wanted: number = next === null ? 0 : /^#{1,6}(?:[ \t]|$)/.test(next.text) ? 2 : 1;
        if (below >= wanted && indentation === "") return false;
        view.dispatch({
            changes: {
                from: from,
                insert:
                    indentation + text + view.state.lineBreak.repeat(Math.max(wanted - below, 0)),
            },
            selection: { anchor: from + indentation.length + text.length },
            scrollIntoView: true,
            userEvent: "input.type",
        });
        return true;
    },
);

/**
 * Keeps the air a key writes at the air of a line, two empty lines, the most there is:
 * more empty lines right above the line of the cursor, see {@link emptyIs},
 * as Enter, Ctrl+Enter or Shift+Enter on an empty line would write them, go again,
 * so a key there writes nothing; lines of code and air already in the note stay.
 * - `broken`: Whether the change wrote a line break.
 * - `state`: Text and syntax tree after the change.
 * - `line`: The line of the cursor.
 * - `top`: The first of the empty lines right above it.
 *
 * @returns Filter of the changes of the editor
 */
const airMost: Extension = EditorState.transactionFilter.of(
    (transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
        let broken: boolean = false;
        transaction.changes.iterChanges(
            (fromA: number, toA: number, fromB: number, toB: number, inserted: Text): void => {
                broken ||= inserted.lines > 1;
            },
        );
        if (!broken || !transaction.isUserEvent("input")) return transaction;
        const state: EditorState = transaction.state;
        const line: Line = state.doc.lineAt(state.selection.main.head);
        let top: Line = line;
        while (top.number > 1 && emptyIs(state, state.doc.line(top.number - 1)))
            top = state.doc.line(top.number - 1);
        if (line.number - top.number <= 2) return transaction;
        return [
            transaction,
            {
                changes: { from: top.from, to: state.doc.line(line.number - 2).from },
                sequential: true,
            },
        ];
    },
);

/**
 * Takes back the empty lines typing wrote below a paragraph of its own,
 * see {@link paragraphTyping},
 * when Backspace leaves its line empty below an empty line, its text gone,
 * not only the `-` of a point or the `>` of a quote, see {@link markerBackward}:
 * the empty lines right below it go, up to the next line with text,
 * so the air stands as before the typing, two empty lines, the cursor on the lower one.
 * - `line`: The line of the cursor before the change.
 * - `doc`: Text after the change.
 * - `now`: The line of the cursor after it.
 * - `next`: A line below it, at last the first one with text, `null` for none.
 *
 * @returns Filter of the changes of the editor
 */
const paragraphUntyped: Extension = EditorState.transactionFilter.of(
    (transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
        if (!transaction.docChanged || !transaction.isUserEvent("delete.backward"))
            return transaction;
        const line: Line = transaction.startState.doc.lineAt(
            transaction.startState.selection.main.head,
        );
        const doc: Text = transaction.newDoc;
        const now: Line = doc.lineAt(transaction.newSelection.main.head);
        if (
            /^[ \t>]*$/.test(line.text) ||
            emptyPointRule.test(line.text) ||
            codeIs(transaction.startState, line) ||
            !/^[ \t]*$/.test(now.text) ||
            now.number === 1 ||
            !/^[ \t]*$/.test(doc.line(now.number - 1).text)
        )
            return transaction;
        let next: Line | null = null;
        for (let number: number = now.number + 1; number <= doc.lines; number++) {
            next = doc.line(number);
            if (!/^[ \t]*$/.test(next.text)) break;
            next = null;
        }
        if (next === null || next.number === now.number + 1) return transaction;
        return [transaction, { changes: { from: now.to, to: next.from - 1 }, sequential: true }];
    },
);

/**
 * Finds the point an empty line between two points of a list is the air of,
 * as `./preview.ts` draws it, see `itemLook` there: the innermost point of the nearest line
 * with text above it whose `li` reaches on over the empty lines up to its next point,
 * so the line stands under the text of that point.
 * - `above`: The nearest line with text above it.
 *
 * @param state - Text and syntax tree
 * @param line - The empty line
 * @returns The point, `ListItem`, `null` for none, like below the last point of a list
 */
function airPointOf(state: EditorState, line: Line): SyntaxNode | null {
    let above: Line = line;
    while (above.number > 1 && /^[ \t]*$/.test(above.text))
        above = state.doc.line(above.number - 1);
    if (above.number === line.number) return null;
    return (
        itemsOf(state, above).findLast(
            (point: SyntaxNode): boolean =>
                point.nextSibling?.name === "ListItem" && point.nextSibling.from > line.to,
        ) ?? null
    );
}

/**
 * Starts a new paragraph with Enter in plain text and in a heading, outside lists and quotes,
 * as a word processor does: one empty line more wherever the cursor stands,
 * the text below moved down by it, each empty line drawn as half a line, see `./preview.ts`,
 * so one is a small gap and two are the air of a line, the cursor on the line to write on,
 * see {@link typingLine};
 * Shift+Enter stays in the paragraph on the next line, see {@link pointContinue}.
 * Within or at the end of a line a line break and an empty line, the cursor on the line after it,
 * where Markdown begins the next paragraph, with the rest of the line,
 * also with an empty line below it, which stays the air below the new paragraph;
 * before the text of a line, at the start of a paragraph or heading too, the empty line above it;
 * on an empty line one more, up to the air of a line, see {@link airMost}, in a list too,
 * in code as many as I press,
 * and on a line of only blanks outside code, like the line of a point
 * Backspace left, see {@link markerBackward}, one more above it, the cursor staying where its text
 * will begin, so Shift+Enter, Enter on a point gives what Ctrl+Enter, Backspace gives;
 * before the text of a further line of a point alike, so within a line as at its end.
 * Within a line the blanks at the break go, see {@link blanksBefore}.
 * On a line of a list, a quote, a table, code or an HTML block,
 * or within a formula, it leaves the key to the next, CodeMirror's own new line.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `node`: A piece of syntax at the cursor,
 *   from the innermost outwards up to the block of the note it stands in.
 * - `blank`: Whether the line holds only blanks, at least one, outside code, see {@link emptyIs},
 *   or the cursor stands right before the text of a further line of a point,
 *   see {@link furtherStartIs}.
 * - `textStart`: Whether the cursor stands before the text of its line,
 *   after its indentation at most, in a heading after its `#` too.
 * - `insert`: What it writes: before the text of a line at the start of the line.
 * - `from`: Where it writes, before the blanks at the cursor within a line.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const paragraphBreak: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty) return false;
    let node: SyntaxNode = syntaxTree(view.state).resolveInner(
        range.head,
        range.head === line.from && line.length > 0 ? 1 : -1,
    );
    for (; node.parent !== null && node.parent.parent !== null; node = node.parent)
        if (node.name === "InlineMath" && node.from < range.head && range.head < node.to)
            return false;
    const blank: boolean =
        (/^[ \t]+$/.test(line.text) && emptyIs(view.state, line)) ||
        furtherStartIs(view.state, line, range.head);
    if (line.length > 0 && !blank && !/^(?:Paragraph|ATXHeading\d)$/.test(node.name)) return false;

    const textStart: boolean =
        blank ||
        (node.name === "Paragraph" ? /^[ \t]*$/ : /^[ \t]*#*[ \t]*$/).test(
            view.state.sliceDoc(line.from, range.head),
        );
    const insert: string = textStart
        ? airOf(view.state, line, 1)
        : view.state.lineBreak + view.state.lineBreak;
    const from: number = textStart ? line.from : range.head - blanksBefore(view.state, range.head);
    view.dispatch({
        changes: {
            from: from,
            to: textStart ? from : range.head + blanksAfter(view.state, range.head),
            insert: insert,
        },
        selection: { anchor: (textStart ? range.head : from) + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Finds the list item a line stands in: the innermost item around the start of its text,
 * after the `>` of a quote around it, so a further line of a point or a sub-point is found too.
 * - `node`: A piece of syntax around the start of the text, from the innermost outwards.
 *
 * @param state - Text
 * @param line - The line
 * @returns The item, `ListItem`, `null` outside a list
 */
function itemOf(state: EditorState, line: Line): SyntaxNode | null {
    for (
        let node: SyntaxNode | null = syntaxTree(state).resolveInner(
            line.from + (/^(?:[ \t]*>[ \t]?)*[ \t]*/.exec(line.text)?.[0].length ?? 0),
            1,
        );
        node !== null;
        node = node.parent
    )
        if (node.name === "ListItem") return node;
    return null;
}

/**
 * Finds the list item the cursor stands in, or the lines picked,
 * when they lie on its lines, see {@link itemOf}.
 * - `item`: The item of the first line of what is picked.
 *
 * @param state - Text and cursor
 * @returns The item, `ListItem`, `null` outside a list or when the lines picked reach beyond it
 */
function itemAt(state: EditorState): SyntaxNode | null {
    const item: SyntaxNode | null = itemOf(state, state.doc.lineAt(state.selection.main.from));
    return item !== null && state.selection.main.to <= state.doc.lineAt(item.to).to ? item : null;
}

/**
 * Moves the lines of a list item one step in or out, see {@link itemIndent},
 * written as my notes write a list, see §6.5 and §6.12 of
 * `.claude/skills/learn/3-chapter-write/document-style.md`:
 * the line of each of its points and each line of code one tab more or one tab less,
 * each further line in spaces under the text of its point, see {@link textIndentationOf},
 * a line of blanks as it stands;
 * its own `-` or number that of the list it joins, taken from the start of a point of that list,
 * my cursor staying where it was in the text;
 * the numbers of the lists it touched count in order again, see {@link listChange}.
 * - `mark`: Its `-` or number, `ListMark`.
 * - `own`: Its `-` or number in the list it joins, `null` to keep its own.
 * - `changes`: The new blanks of its lines and its `-` or number.
 * - `line`: A line of it.
 * - `prefix`, `body`: The `>` of a quote around the line, and the rest of it.
 * - `blanks`, `from`: The blanks the rest begins with, and where they start.
 * - `point`: The point the line stands in, and `head` the tabs and `-` or number of its line.
 * - `tabs`: Tabs of that point after the move.
 *
 * @param view - The editor
 * @param item - The list item
 * @param inward - Whether it moves in, else out
 * @param start - Start of a point of the list it joins, see {@link nextPointOf},
 *   `null` to keep its own `-` or number
 */
function itemShift(
    view: EditorView,
    item: SyntaxNode,
    inward: boolean,
    start: string | null,
): void {
    const state: EditorState = view.state;
    const mark: SyntaxNode | null = item.getChild("ListMark");
    const own: string | null =
        start === null ? null : (/([-*+]|\d+[.)]) (?:\[ \] )?$/.exec(start)?.[1] ?? null);
    const changes: ChangeSpec[] =
        mark === null || own === null ? [] : [{ from: mark.from, to: mark.to, insert: own }];
    for (
        let number: number = state.doc.lineAt(item.from).number;
        number <= state.doc.lineAt(item.to).number;
        number++
    ) {
        const line: Line = state.doc.line(number);
        const prefix: string = quotePrefixOf(line.text);
        const body: string = line.text.slice(prefix.length);
        const blanks: string = /^[ \t]*/.exec(body)?.[0] ?? "";
        const from: number = line.from + prefix.length;
        const point: SyntaxNode | null = itemOf(state, line);
        if (blanks === body || point === null) continue;
        if (state.doc.lineAt(point.from).number === number || codeIs(state, line)) {
            changes.push(
                inward
                    ? { from: from, insert: "\t" }
                    : {
                          from: from,
                          to: from + (blanks.startsWith("\t") ? 1 : Math.min(4, blanks.length)),
                      },
            );
            continue;
        }
        const text: string = state.doc.lineAt(point.from).text;
        const head: RegExpExecArray | null = /^(\t*)([-*+]|\d+[.)])/.exec(
            text.slice(quotePrefixOf(text).length),
        );
        if (head === null) continue;
        const tabs: number = Math.max(head[1].length + (inward ? 1 : -1), 0);
        changes.push({
            from: from,
            to: from + blanks.length,
            insert: " ".repeat(
                (point.from === item.from ? (own ?? head[2]) : head[2]).length + 1 + tabs,
            ),
        });
    }
    listChange(view, {
        changes: changes,
        selection: state.selection.map(state.changes(changes), 1),
        userEvent: inward ? "input.indent" : "delete.dedent",
    });
}

/**
 * Moves a list item one step in, Tab,
 * or out, Shift+Tab, with its sub-points and further lines, as Obsidian does:
 * in only below an item of its own list, under which it then stands, out only from a sub-point.
 * It takes the `-` or number of the list it joins, see {@link nextPointOf}:
 * out after the point it stood in, like `4.` after `3.`,
 * in after the last sub-point of the item above, like `- ` below `- a`,
 * where it starts a sub-list it keeps its own, a number counted from `1.` again;
 * its lines written as my notes write a list, see {@link itemShift}.
 * Outside a list, and on lines picked beyond one item, it leaves the key to the next,
 * see {@link markdownKeys}.
 * - `item`: The list item of the cursor.
 * - `parent`: The point it stands in, `null` for none.
 * - `last`: The last piece of the item above it, a list for sub-points.
 * - `before`: The point it follows in the list it joins, `null` for a new sub-list.
 * - `start`: The start of its line in the list it joins, `null` to keep its own.
 *
 * @param inward - Whether it moves in, else out
 * @returns The command
 */
function itemIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const item: SyntaxNode | null = itemAt(view.state);
        if (item === null) return false;

        const parent: SyntaxNode | null =
            item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
        const last: SyntaxNode | null =
            item.prevSibling?.name === "ListItem" ? item.prevSibling.lastChild : null;
        const before: SyntaxNode | null = inward
            ? /^(?:BulletList|OrderedList)$/.test(last?.name ?? "")
                ? (last?.lastChild ?? null)
                : null
            : parent;
        const start: string | null = before === null ? null : nextPointOf(view.state, before);
        if (inward && item.prevSibling?.name === "ListItem") itemShift(view, item, true, start);
        else if (!inward && parent !== null) itemShift(view, item, false, start);
        return true;
    };
}

/**
 * Swaps two blocks of whole lines that stand right below each other,
 * like a list item and the one before it,
 * and moves the cursor or what is picked along with the block it stands in,
 * never past the end of the text;
 * numbered points count in order again,
 * so `2.` moved above `1.` becomes `1.`, see {@link listChange}.
 * - `upper`, `lower`: The text of the two blocks.
 * - `shift`: How far the cursor moves with its block.
 *
 * @param view - The editor
 * @param from - Start of the first line of the upper block
 * @param middle - Start of the first line of the lower block
 * @param to - End of the last line of the lower block
 * @param inLower - Whether the cursor stands in the lower block,
 *   which then moves up, else in the upper one
 */
function blocksSwap(
    view: EditorView,
    from: number,
    middle: number,
    to: number,
    inLower: boolean,
): void {
    const upper: string = view.state.sliceDoc(from, middle - view.state.lineBreak.length);
    const lower: string = view.state.sliceDoc(middle, to);
    const shift: number = inLower
        ? -(upper.length + view.state.lineBreak.length)
        : lower.length + view.state.lineBreak.length;
    listChange(view, {
        changes: { from: from, to: to, insert: lower + view.state.lineBreak + upper },
        selection: EditorSelection.create(
            view.state.selection.ranges.map((range: SelectionRange): SelectionRange =>
                EditorSelection.range(
                    Math.min(range.anchor + shift, view.state.doc.length),
                    Math.min(range.head + shift, view.state.doc.length),
                ),
            ),
            view.state.selection.mainIndex,
        ),
        scrollIntoView: true,
        userEvent: "move.line",
    });
}

/**
 * Tells how far a line stands in: its tabs and spaces after the `>` of a quote around it,
 * each counting one, as my notes indent a point by one tab per level
 * and its further lines by spaces under its text, see {@link textIndentationOf}.
 * - `body`: The line after the `>` of the quote.
 * - `blanks`: Number of the tabs and spaces it begins with.
 *
 * @param text - Text of the line, like `> \t- Point`
 * @returns How far it stands in, like `1`, `null` for an empty line
 */
function depthOf(text: string): number | null {
    const body: string = text.slice(quotePrefixOf(text).length);
    const blanks: number = /^[ \t]*/.exec(body)?.[0].length ?? 0;
    return blanks === body.length ? null : blanks;
}

/**
 * Tells the line of a point: its `-` or number first, after the `>` of a quote and the blanks;
 * never a line of code, like a list in a block of YAML, see {@link codeIs}.
 * - `line`: The line.
 * - `body`: The line after the `>` of the quote.
 *
 * @param state - Text and syntax tree
 * @param number - Number of the line, like that of `> \t- Point`
 * @returns Whether it starts a point
 */
function pointIs(state: EditorState, number: number): boolean {
    const line: Line = state.doc.line(number);
    const body: string = line.text.slice(quotePrefixOf(line.text).length);
    return /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(body) && !codeIs(state, line);
}

/**
 * Finds the last line of a point with its sub-points and further lines:
 * the lines right below it that stand further in, see {@link depthOf},
 * with the empty lines between them, not those after them.
 * - `depth`: How far the point stands in.
 * - `last`: Number of the last line found.
 * - `blanks`: How far the next line stands in, `null` for an empty line.
 *
 * @param doc - Text
 * @param number - Number of the line of the point
 * @returns Number of its last line
 */
function pointLastOf(doc: Text, number: number): number {
    const depth: number = depthOf(doc.line(number).text) ?? 0;
    let last: number = number;
    for (let next: number = number + 1; next <= doc.lines; next++) {
        const blanks: number | null = depthOf(doc.line(next).text);
        if (blanks !== null && blanks <= depth) break;
        if (blanks !== null) last = next;
    }
    return last;
}

/**
 * Moves the line of the cursor or the lines picked one line up, Alt+Up, or down, Alt+Down,
 * as VS Code does, past an empty line too.
 * A point counts as one line with its sub-points and further lines, see {@link pointLastOf}:
 * it moves with them, and it goes past a point of its level with that point's own;
 * a line of no point goes past a whole point of its level too.
 * A further line moves alone, like a line of code, so I put the lines of a point in order.
 * The first point of a sub-list goes up past the line above,
 * the last one down past the line below.
 * Lines picked take the sub-points and further lines of their points along.
 * - `doc`: Text.
 * - `text`: Gives the text of a line by its number.
 * - `range`: The cursor or what is picked.
 * - `first`, `last`: Numbers of the first and the last line that move,
 *   not the line where what is picked ends at its start.
 * - `end`: Number of the last line picked.
 * - `level`: How far the first line that moves stands in, `null` for an empty line.
 * - `below`, `bottom`: Numbers of the first and the last line they go past downwards.
 * - `top`: Number of the first line they go past upwards, the line above them the last.
 * - `blanks`: How far a line stands in, `null` for an empty line.
 *
 * @param down - Whether they move down, else up
 * @returns The command
 */
function linesMove(down: boolean): Command {
    return (view: EditorView): boolean => {
        const doc: Text = view.state.doc;
        if (view.state.readOnly) return false;

        const text: (number: number) => string = (number: number): string => doc.line(number).text;
        const range: SelectionRange = view.state.selection.main;
        const first: number = doc.lineAt(range.from).number;
        let last: number = doc.lineAt(range.to).number;
        if (!range.empty && range.to === doc.line(last).from) last--;
        const end: number = last;
        for (let number: number = first; number <= end; number++)
            if (pointIs(view.state, number)) last = Math.max(last, pointLastOf(doc, number));

        const level: number | null = depthOf(text(first));
        if (down) {
            if (last === doc.lines) return true;
            const below: number = last + 1;
            const bottom: number =
                pointIs(view.state, below) && depthOf(text(below)) === level
                    ? pointLastOf(doc, below)
                    : below;
            blocksSwap(
                view,
                doc.line(first).from,
                doc.line(below).from,
                doc.line(bottom).to,
                false,
            );
            return true;
        }
        if (first === 1) return true;
        let top: number = first - 1;
        if (level !== null && depthOf(text(top)) !== null)
            for (let number: number = top; number >= 1; number--) {
                const blanks: number | null = depthOf(text(number));
                if (blanks === null || blanks > level) continue;
                if (blanks === level && pointIs(view.state, number)) top = number;
                break;
            }
        blocksSwap(view, doc.line(top).from, doc.line(first).from, doc.line(last).to, true);
        return true;
    };
}

/**
 * Counts the markup characters, like `*`, right before or after a place, up to three,
 * as `***` is bold and italic.
 *
 * @param state - Text
 * @param pos - Place
 * @param forward - Whether to count after it, else before
 * @param char - Markup character, like `*`
 * @returns How many stand there in a row, at most three
 */
function marksCount(state: EditorState, pos: number, forward: boolean, char: string): number {
    let count: number = 0;
    while (
        count < 3 &&
        state.sliceDoc(
            forward ? pos + count : pos - count - 1,
            forward ? pos + count + 1 : pos - count,
        ) === char
    )
        count++;
    return count;
}

/**
 * Makes text bold, Ctrl+B with `**`, or italic, Ctrl+I with `*`, as Obsidian does:
 * the text picked, else the word at the cursor, gets the markup around it,
 * or loses it when it is already bold or italic, so the same key takes it back;
 * `***` counts as both. In empty space it writes the markup twice
 * with the cursor between, to type into.
 * - `word`: The text to mark: the text picked, or the word at the cursor, `null` for none.
 * - `before`, `after`: The markup characters right before and after it.
 * - `marked`: Whether it is marked already:
 *   bold with two or three on both sides, italic with one or three.
 *
 * @param mark - Markup, `**` or `*`
 * @returns The command
 */
function markupToggle(mark: string): Command {
    return (view: EditorView): boolean => {
        if (view.state.readOnly) return false;

        view.dispatch(
            view.state.changeByRange(
                (range: SelectionRange): { range: SelectionRange; changes: ChangeSpec } => {
                    const word: SelectionRange | null = range.empty
                        ? view.state.wordAt(range.head)
                        : range;
                    if (word === null)
                        return {
                            range: EditorSelection.cursor(range.head + mark.length),
                            changes: { from: range.head, insert: mark + mark },
                        };

                    const before: number = marksCount(view.state, word.from, false, mark[0]);
                    const after: number = marksCount(view.state, word.to, true, mark[0]);
                    const marked: boolean =
                        mark.length === 2
                            ? Math.min(before, after) >= 2
                            : Math.min(before, after) % 2 === 1;
                    if (marked)
                        return {
                            range: EditorSelection.range(
                                range.anchor - mark.length,
                                range.head - mark.length,
                            ),
                            changes: [
                                { from: word.from - mark.length, to: word.from },
                                { from: word.to, to: word.to + mark.length },
                            ],
                        };
                    return {
                        range: EditorSelection.range(
                            range.anchor + mark.length,
                            range.head + mark.length,
                        ),
                        changes: [
                            { from: word.from, insert: mark },
                            { from: word.to, insert: mark },
                        ],
                    };
                },
            ),
            { scrollIntoView: true, userEvent: "input" },
        );
        return true;
    };
}

/**
 * Pieces of syntax that show as their text where the cursor stands,
 * see `./preview.ts`, on more rows than drawn when long, see {@link lineMove}:
 * wiki links, Markdown links and formulas.
 */
const sourcePieces: string[] = ["WikiLink", "Link", "InlineMath"];

/**
 * Finds the link or formula the cursor stands on, which shows as its text there,
 * see {@link sourcePieces}: the one around a place, also at its ends.
 * - {@link Tree#iterate}: Goes through the pieces of syntax that touch the place.
 * - `piece`: The link or formula found so far.
 *
 * @param state - Text and syntax tree
 * @param pos - The place
 * @returns The link or formula, `null` for none
 */
function sourcePieceOf(state: EditorState, pos: number): SyntaxNode | null {
    let piece: SyntaxNode | null = null;
    syntaxTree(state).iterate({
        from: pos,
        to: pos,
        enter: (node: SyntaxNodeRef): void => {
            if (sourcePieces.includes(node.name)) piece = node.node;
        },
    });
    return piece;
}

/**
 * Moves the cursor a line up or down, Arrow Up or Arrow Down,
 * or picks up to there with Shift, by CodeMirror's own command,
 * but in one step past what held it on its line: the end of a folded heading or point,
 * where CodeMirror's step down ends first, on the same line,
 * so a first Arrow Down seemed to do nothing;
 * and the rows of the link or formula the cursor stands on, which shows as its text there,
 * see {@link sourcePieceOf}, on more rows than drawn,
 * like `#### [[01_01_SampleMeanEstimator#Algorithm. Check an Estimator for Bias|Ice Cream Kiosk]]`
 * or a long formula, so a step stopped on its next row instead of the next line.
 * - `line`: The line the cursor stood on.
 * - `piece`: The link or formula it stood on, `null` for none.
 * - `head`: Where the step put the cursor.
 * - `held`: Whether the step ended at the end of what that line folds,
 *   or on that line within that link or formula.
 *
 * @param command - CodeMirror's command, like `cursorLineDown` or `selectLineUp`
 * @returns The command
 */
function lineMove(command: Command): Command {
    const move: Command = (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state, view.state.selection.main.head);
        if (!command(view)) return false;
        const head: number = view.state.selection.main.head;
        let held: boolean =
            piece !== null &&
            head >= piece.from &&
            head <= piece.to &&
            view.state.doc.lineAt(head).number === line.number;
        foldedRanges(view.state).between(line.to, line.to, (from: number, to: number): void => {
            held ||= from === line.to && to === head;
        });
        if (held) move(view);
        return true;
    };
    return move;
}

/**
 * Moves the cursor to the end of its line, End,
 * or picks up to there, Shift+End, by CodeMirror's own command,
 * but past the hidden end of a link drawn as its name, like its `]]`, when the link ends the line:
 * CodeMirror's step ends where the drawn line ends, before that hidden end,
 * so the cursor stood in the link, which then showed as its text with the cursor before its `]]`,
 * and Shift+End with Backspace left the `]]` behind.
 * Not in a link the cursor already stood on, which shows as its text, see {@link sourcePieceOf}.
 * - `before`: The link or formula the cursor stood on, `null` for none.
 * - `range`: The cursor or what is picked after the step.
 * - `line`: Its line.
 * - `piece`: The link or formula the step put it in, `null` for none.
 *
 * @param command - CodeMirror's command, `cursorLineBoundaryForward` or `selectLineBoundaryForward`
 * @returns The command
 */
function lineEnd(command: Command): Command {
    return (view: EditorView): boolean => {
        const before: SyntaxNode | null = sourcePieceOf(view.state, view.state.selection.main.head);
        if (!command(view)) return false;
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state, range.head);
        if (
            piece !== null &&
            piece.to === line.to &&
            range.head < line.to &&
            piece.from !== before?.from
        )
            view.dispatch({
                selection: { anchor: range.empty ? line.to : range.anchor, head: line.to },
                userEvent: "select",
            });
        return true;
    };
}

/**
 * Marks the line of the cursor as the line a key just put it on to write, see {@link typingLine},
 * where the key took text away, like the `-` of a point, see {@link markerBackward}.
 */
const typingSet: StateEffectType<null> = StateEffect.define<null>();

/**
 * The empty line a key just put the cursor on to write, like the new line of Enter or Shift+Enter,
 * the `> ` line of a quote or the blanks Backspace left of a point:
 * drawn as high as a line of text, not as the half line of an empty line,
 * see `spaceLook` in `./preview.ts`,
 * so the cursor stands where text typed on it will stand, not in the air between paragraphs;
 * while the cursor stays on it and it is empty, also after Backspace took its `>` away.
 * An empty line clicked into stays a half line.
 * - `line`: The line of the cursor after the change.
 *
 * @returns The start of that line, `null` for none
 */
export const typingLine: StateField<number | null> = StateField.define<number | null>({
    create: (): number | null => null,
    update: (start: number | null, transaction: Transaction): number | null => {
        const line: Line = transaction.newDoc.lineAt(transaction.newSelection.main.head);
        if (!/^[ \t>]*$/.test(line.text)) return null;
        if (
            (transaction.docChanged && transaction.isUserEvent("input")) ||
            transaction.effects.some((effect: StateEffect<unknown>): boolean =>
                effect.is(typingSet),
            )
        )
            return line.from;
        return start !== null && transaction.changes.mapPos(start) === line.from ? line.from : null;
    },
});

/**
 * Takes the blanks of a line of only blanks away when the cursor alone moves off it,
 * of an empty line of a quote those after its `>`,
 * like the line of a point Backspace left, see {@link markerBackward}, or Shift+Enter wrote:
 * only the line of the cursor holds the blanks where its text will begin,
 * every other empty line of the note stays empty; a line of code keeps its blanks.
 * Where the empty line it leaves stands among more than two, like the line Enter wrote above
 * the air below a paragraph, that line goes, then the ones below it, then above it,
 * down to two, the air of a line, the most there is, see {@link airMost}.
 * After the moves of the cursor, see `caretPlace` in `./preview.ts`.
 * - `cursor`: The cursor before the move.
 * - `state`: Text and syntax tree.
 * - `line`: Its line.
 * - `top`, `bottom`: The first and the last of the empty lines it stands among.
 * - `excess`: How many of them go.
 * - `down`: How many of them go from its line downwards, the rest right above it.
 * - `first`, `last`: The first and the last line that go.
 *
 * @returns Filter of changes
 */
const blanksLeft: Extension = Prec.high(
    EditorState.transactionFilter.of(
        (transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
            const cursor: SelectionRange = transaction.startState.selection.main;
            const state: EditorState = transaction.startState;
            const line: Line = state.doc.lineAt(cursor.head);
            if (
                transaction.docChanged ||
                transaction.selection === undefined ||
                !cursor.empty ||
                !emptyIs(state, line) ||
                transaction.newDoc.lineAt(transaction.newSelection.main.head).number === line.number
            )
                return transaction;
            let top: Line = line;
            while (top.number > 1 && emptyIs(state, state.doc.line(top.number - 1)))
                top = state.doc.line(top.number - 1);
            let bottom: Line = line;
            while (
                bottom.number < state.doc.lines &&
                emptyIs(state, state.doc.line(bottom.number + 1))
            )
                bottom = state.doc.line(bottom.number + 1);
            const excess: number = bottom.number - top.number - 1;
            if (excess > 0) {
                const down: number = Math.min(excess, bottom.number - line.number + 1);
                const first: Line = state.doc.line(line.number - (excess - down));
                const last: Line = state.doc.line(line.number + down - 1);
                return [
                    transaction,
                    {
                        changes:
                            last.number < state.doc.lines
                                ? { from: first.from, to: last.to + 1 }
                                : { from: first.from - 1, to: last.to },
                        sequential: true,
                    },
                ];
            }
            if (line.text === line.text.trimEnd()) return transaction;
            return [
                transaction,
                {
                    changes: { from: line.from + line.text.trimEnd().length, to: line.to },
                    sequential: true,
                },
            ];
        },
    ),
);

/**
 * Gives the block the cursor stands in, a definition, an example or a task:
 * from its heading `##` to the line before the next one,
 * from the start of the note before the first heading `##`; the whole note without one.
 * In the round of a section it is the block shown, which the cursor never leaves,
 * see `selectionKeep` in `./round.ts`.
 * - `line`: Number of the line of the cursor.
 * - `heading`: Tells a line of a heading `##`.
 * - `first`, `last`: Numbers of the first and the last line of the block.
 *
 * @param state - Text and cursor
 * @returns Start of its first line and end of its last line
 */
function blockOf(state: EditorState): { from: number; to: number } {
    const line: number = state.doc.lineAt(state.selection.main.head).number;
    const heading: (number: number) => boolean = (number: number): boolean =>
        /^##[ \t]/.test(state.doc.line(number).text);
    let first: number = line;
    while (first > 1 && !heading(first)) first--;
    let last: number = line;
    while (last < state.doc.lines && !heading(last + 1)) last++;
    return { from: state.doc.line(first).from, to: state.doc.line(last).to };
}

/**
 * Undo or Redo only within the block of the cursor, see {@link blockOf},
 * so it never changes another part of the note, which a round hides:
 * the next step of the history goes back or comes again
 * only while all it changes lies in that block, else nothing happens.
 * - `block`: The block.
 * - `steps`: The step CodeMirror's command would take, none at the end of the history.
 * - `inside`: Whether all it changes lies in the block.
 *
 * @param command - CodeMirror's `undo` or `redo`
 * @returns The command, which always takes the key
 */
function historyIn(command: StateCommand): Command {
    return (view: EditorView): boolean => {
        const block: { from: number; to: number } = blockOf(view.state);
        const steps: Transaction[] = [];
        command({
            state: view.state,
            dispatch: (transaction: Transaction): void => {
                steps.push(transaction);
            },
        });
        let inside: boolean = steps.length > 0;
        steps[0]?.changes.iterChangedRanges((from: number, to: number): void => {
            inside &&= from >= block.from && to <= block.to;
        });
        if (inside) view.dispatch(steps[0]);
        return true;
    };
}

/**
 * Undo and Redo of the browser itself, like from the menu of a right click,
 * only within the block of the cursor too, see {@link historyIn},
 * before CodeMirror's history takes them.
 */
const historyInput: Extension = EditorView.domEventHandlers({
    beforeinput: (event: InputEvent, view: EditorView): boolean => {
        const command: StateCommand | null =
            event.inputType === "historyUndo"
                ? undo
                : event.inputType === "historyRedo"
                  ? redo
                  : null;
        if (command === null) return false;
        event.preventDefault();
        return historyIn(command)(view);
    },
});

/**
 * Keys of a Markdown file, see the top of this file;
 * Enter, Tab and Shift+Tab try the list item first,
 * Enter then a new paragraph in a quote, a new paragraph and CodeMirror's list,
 * Enter on an empty point air above it before CodeMirror's list, Ctrl+Enter a block with air,
 * Backspace an empty line above a heading before CodeMirror's markup,
 * Delete the markup below,
 * then the key goes on to the next command, CodeMirror's own;
 * and the first text typed on an empty line below another, see {@link paragraphTyping};
 * and the empty line a key put the cursor on to write, see {@link typingLine},
 * whose blanks go when the cursor leaves it, see {@link blanksLeft}.
 */
export const markdownKeys: Extension = [
    typingLine,
    paragraphTyping,
    paragraphUntyped,
    airMost,
    blanksLeft,
    Prec.high(historyInput),
    Prec.high(
        keymap.of([
            { key: "Enter", run: tableBreak(2), shift: tableBreak(2) },
            { key: "Mod-Enter", run: tableBreak(3) },
            { key: "Backspace", run: tableJoin(false) },
            { key: "Delete", run: tableJoin(true) },
            { key: "Enter", run: furtherContinue },
            { key: "Enter", run: quoteBreak },
            { key: "Enter", run: pointEnter },
            { key: "Enter", run: paragraphBreak },
            { key: "Enter", run: markupContinue },
            { key: "Shift-Enter", run: pointContinue },
            { key: "Mod-Enter", run: airBreak },
            { key: "Backspace", run: quoteBackward },
            { key: "Backspace", run: blankBackward },
            { key: "Backspace", run: textBackward },
            { key: "Backspace", run: headingBackward },
            { key: "Backspace", run: markerBackward },
            { key: "Delete", run: markupForward },
            { key: "Tab", run: blankIndent(true), shift: blankIndent(false) },
            { key: "Tab", run: itemIndent(true), shift: itemIndent(false) },
            { key: "Tab", run: tabWrite, shift: indentLess },
            { key: "Alt-ArrowUp", run: linesMove(false) },
            { key: "Alt-ArrowDown", run: linesMove(true) },
            { key: "Mod-Shift-ArrowUp", run: moveLineUp },
            { key: "Mod-Shift-ArrowDown", run: moveLineDown },
            { key: "Mod-b", run: markupToggle("**") },
            { key: "Mod-i", run: markupToggle("*") },
            { key: "Mod-d", run: deleteLine },
            { key: "Mod-z", run: historyIn(undo), preventDefault: true },
            { key: "Mod-Shift-z", run: historyIn(redo), preventDefault: true },
            { key: "Mod-y", run: (): boolean => true, preventDefault: true },
            { key: "ArrowUp", run: lineMove(cursorLineUp), shift: lineMove(selectLineUp) },
            { key: "ArrowDown", run: lineMove(cursorLineDown), shift: lineMove(selectLineDown) },
            {
                key: "End",
                run: lineEnd(cursorLineBoundaryForward),
                shift: lineEnd(selectLineBoundaryForward),
            },
        ]),
    ),
];
