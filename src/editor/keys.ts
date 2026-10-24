/**
 * ## Keys
 *
 * The keys of a Markdown file in the editor, as in Obsidian, see `./editor.ts`; they go before CodeMirror's usual keys:
 * - In plain text Enter starts a new paragraph, a line break and an empty line, see {@link paragraphBreak}, and
 *   Backspace at the start of a paragraph after it takes the empty line away again, see {@link gapBackward}.
 * - Enter continues a list, a task list or a quote on the next line, and on an empty item moves it one level out,
 *   at the outermost level ends the list; on a further line of a point it starts the next point too, on a spacer line
 *   the next point of its level, see {@link furtherContinue}.
 * - Shift+Enter goes on in the same paragraph or point on the next line, a single line break, in a list a spacer line
 *   without a new bullet; on a line with nothing visible, like the one a Shift+Enter just left, it keeps the spacer
 *   `⠀`, so Shift+Enter twice leaves a visible empty line, see {@link pointContinue}. Backspace right after the `-` of
 *   a new, empty item makes it the same spacer line, see {@link spacerBackward}, else right after the `-` of an item or
 *   the `>` of a quote takes it away; Backspace on an empty spacer line takes the line away, see {@link spacerRemove};
 *   a further line whose text is all taken away, by Backspace, Delete or cutting, stays a spacer line, see
 *   {@link spacerKeep}. On an empty spacer line `- ` starts the next point of its level, below a numbered point
 *   a sub-point, `-` and Tab a sub-point, and text typed there belongs to the point of its level, or after the list to
 *   no point, also in Obsidian, see {@link lineTyping} and {@link waitingIndent}.
 * - Tab moves a list item one step in, Shift+Tab one step out, always with its sub-points and further lines,
 *   see {@link itemIndent}, and a spacer line, or a line of blanks below a list, one level, see {@link spacerIndent};
 *   every change of a list counts
 *   its numbered points in order again, a sub-list from `1.`, see {@link listChange}; outside a list Tab writes a tab
 *   where the cursor is, on several lines picked it moves them all one step in, and Shift+Tab one step out.
 * - Alt+Up and Alt+Down move the line of the cursor, or the lines picked, one line up or down; a list item goes
 *   with its sub-points and further lines past the item before or after it, see {@link itemMove}.
 * - Ctrl+Shift+Up and Ctrl+Shift+Down move the line of the cursor, or the lines picked, one line up or down,
 *   only them, as CodeMirror's Move line up and down.
 * - Ctrl+B and Ctrl+I make the text picked bold or italic, `**…**` and `*…*`, or take it back;
 *   with nothing picked the word at the cursor, see {@link markupToggle}.
 * - Ctrl+D takes away the line of the cursor, or the lines picked, as Obsidian's Delete paragraph.
 * - Arrow Up and Arrow Down go past the rows of a link or formula the cursor shows as its text in one step, and Arrow
 *   Down past a folded heading or point, see {@link lineMove}; Home on an empty spacer line keeps the cursor on it, see
 *   {@link spacerHome}; End goes past the hidden `]]` of a link that ends the line, see {@link lineEnd}.
 *
 * - `@codemirror/state`, `@codemirror/view`: The text with its cursor, and the keys.
 * - `@codemirror/commands`: CodeMirror's own commands: a tab at the cursor, indenting lines, deleting lines,
 *   moving a line up or down.
 * - `@codemirror/language`: The syntax tree of the note, which tells where a list item begins and ends and where
 *   a link or formula stands, and what is folded.
 * - `@codemirror/lang-markdown`: Continues a list on Enter and takes its markup away on Backspace.
 */

import { EditorSelection, EditorState, Prec, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
    cursorLineBoundaryForward, cursorLineDown, cursorLineUp, deleteLine, indentLess, indentMore, insertTab, moveLineDown,
    moveLineUp, selectLineBoundaryForward, selectLineDown, selectLineUp,
} from "@codemirror/commands";
import { ensureSyntaxTree, foldedRanges, syntaxTree } from "@codemirror/language";
import { deleteMarkupBackward, insertNewlineContinueMarkupCommand } from "@codemirror/lang-markdown";

import type {
    ChangeSpec, Extension, Line, SelectionRange, StateCommand, Text, TransactionSpec,
} from "@codemirror/state";
import type { Command } from "@codemirror/view";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";


/**
 * Spacer `⠀` (U+2800): a line of a list with nothing visible on it, which Markdown does not read as empty,
 * so the list and its guide line go on through it, blank in the preview, see `./preview.ts`.
 */
const spacer: string = "⠀";

/**
 * Spacer line: its indentation, then the spacer, maybe text after it.
 */
export const spacerRule: RegExp = /^[ \t]*⠀/;

/**
 * Empty spacer line: its indentation and the spacer, nothing after it.
 */
const emptySpacerRule: RegExp = /^[ \t]*⠀$/;

/**
 * Gives the indentation of the text of a point, as my notes indent a further line of it: its tabs and then as many
 * spaces as its `-` or number with the space after it, two under `- `, three under `1. `.
 * - `point`: Its tabs and its `-` or number with the space after it.
 *
 * @param text - Text of the line of the point, like `\t- θ (theta)`
 * @returns The indentation, like a tab and two spaces, `null` for a line that starts no point
 */
export function textIndentationOf(text: string): string | null {
    const point: RegExpExecArray | null = /^(\t*)((?:[-*+]|\d+[.)])[ \t])/.exec(text);
    return point !== null ? point[1] + " ".repeat(point[2].length) : null;
}

/**
 * Counts the columns of the indentation of a line as Markdown does, a tab up to the next multiple of 4.
 *
 * @param text - Text of the line
 * @returns Columns of its indentation
 */
export function columnsOf(text: string): number {
    let columns: number = 0;
    for (const char of /^[ \t]*/.exec(text)?.[0] ?? "")
        columns = char === "\t" ? columns + 4 - columns % 4 : columns + 1;
    return columns;
}

/**
 * Counts the points of the numbered lists a change touched in order again, as Obsidian does: a sub-list from `1.`,
 * a list at the left edge on from the number its first place had before, each point one more than the one before it,
 * its `.` or `)` kept. So a point moved in by Tab under `1.` becomes `1.` of its sub-list and the `3.` after it `2.`
 * again, `2.` moved above `1.` becomes `1.`; lists the change did not touch keep their numbers.
 * - `doc`: Text after the change.
 * - `from`, `to`: Where the change wrote, `to` on to the end of the line below, whose list it may have made a sub-list.
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
    change.changes.iterChangedRanges((fromA: number, toA: number, fromB: number, toB: number): void => {
        from = Math.min(from, fromB);
        to = Math.max(to, toB);
    });
    to = doc.line(Math.min(doc.lineAt(to).number + 1, doc.lines)).to;
    const changes: ChangeSpec[] = [];
    ensureSyntaxTree(change.state, doc.length, 200)?.iterate({
        from: Math.min(from, to),
        to: to,
        enter: (node: SyntaxNodeRef): void => {
            if (node.name !== "OrderedList")
                return;
            const before: RegExpExecArray | null = /^[ \t]*(\d+)[.)]/
                .exec(change.startState.doc.lineAt(change.changes.invertedDesc.mapPos(node.from, -1)).text);
            let number: number | null = node.node.parent?.name === "ListItem" ? 1
                : before !== null ? Number(before[1]) : null;
            for (const item of node.node.getChildren("ListItem")) {
                const mark: SyntaxNode | null = item.getChild("ListMark");
                if (mark === null)
                    continue;
                const written: string = doc.sliceString(mark.from, mark.to);
                if (number === null)
                    number = Number.parseInt(written);
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
 * Sends a change of a list to the editor with its numbered points counted in order again, see {@link numbersFixed},
 * both in one step of Undo, the cursor where the change put it.
 *
 * @param view - The editor
 * @param spec - The change, like a point moved in by Tab
 */
function listChange(view: EditorView, spec: TransactionSpec): void {
    view.dispatch(spec, { changes: numbersFixed(view.state.update(spec)), sequential: true });
}

/**
 * Tells whether a line holds prose, where a spacer may keep an empty line visible, see {@link spacer}: a line of
 * a paragraph or of a list, or an empty line between blocks; not one of a heading, a quote, a table, code or an HTML
 * block.
 * - `node`: A piece of syntax around the start of its text, from the innermost outwards.
 *
 * @param state - Text
 * @param line - The line
 * @returns Whether it holds prose
 */
function proseIs(state: EditorState, line: Line): boolean {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from + (/^[ \t]*/.exec(line.text)?.[0].length ?? 0), 1);
         node !== null; node = node.parent)
        if (/^(?:ATXHeading\d|SetextHeading\d|Blockquote|Table|FencedCode|CodeBlock|HTMLBlock|CommentBlock)$/.test(node.name))
            return false;
    return true;
}

/**
 * Goes on in the same paragraph or point on the next line, with Shift+Enter, where I want a new line but no new
 * paragraph or bullet, as Enter starts them, see {@link paragraphBreak} and {@link furtherContinue}: a single line
 * break, the new line with the indentation of the point's text in a list, see {@link textIndentationOf}, else with
 * that of the line. In a list the new line is a spacer line, see {@link spacer}, the cursor after the spacer, so
 * Markdown keeps it in its point while it is empty; text typed takes the place of the spacer, see {@link lineTyping}.
 * A line with nothing visible before the cursor, like the one a Shift+Enter just left empty, keeps a spacer, so
 * Shift+Enter twice leaves a visible empty line within the paragraph or point, never an empty line, which would end
 * it, and so does the line left behind by Shift+Enter before the text of a line. The preview shows a spacer line one
 * line high, in a list in its point, see `./preview.ts`. In a heading, a quote, a table, code or an HTML block
 * a plain new line with the indentation of the line.
 * - `range`: The cursor, or what is picked, which the line break replaces.
 * - `line`: Its line.
 * - `own`: Indentation of the line.
 * - `indentation`: Indentation of the new line.
 * - `before`, `after`: The text of the line before and after the cursor.
 * - `prose`: Whether the line holds prose, see {@link proseIs}.
 * - `blank`: Whether nothing visible stands before the cursor in prose, so the line keeps a spacer.
 * - `head`: What the line keeps before the line break.
 * - `start`: What the new line begins with: the indentation of the line where its text moves down, a point too,
 *   else that of the new line.
 *
 * @param view - The editor
 * @returns `true`, as it always takes the key
 */
const pointContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.from);
    const own: string = /^[ \t]*/.exec(line.text)?.[0] ?? "";
    const indentation: string = textIndentationOf(line.text) ?? own;
    const before: string = view.state.sliceDoc(line.from, range.from);
    const after: string = view.state.sliceDoc(range.to, view.state.doc.lineAt(range.to).to);
    const prose: boolean = proseIs(view.state, line);
    const blank: boolean = prose && /^[ \t]*⠀?$/.test(before);
    const head: string = blank ? own + spacer : before;
    const start: string = after !== "" && blank ? own
        : indentation + (prose && after === "" && itemOf(view.state, line) !== null ? spacer : "");
    view.dispatch({
        changes: { from: line.from, to: range.to, insert: head + view.state.lineBreak + start },
        selection: { anchor: line.from + head.length + view.state.lineBreak.length + start.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Makes a new, empty item a spacer line with Backspace right after its `-` or number, the same line Shift+Enter
 * on the point above writes, see {@link pointContinue}, instead of taking it out of the list: the indentation of its
 * text and the spacer. Only for an item below another point, the one before it in its list or the one it stands in;
 * anywhere else it leaves the key to the next, CodeMirror's Markdown, which takes the `-` away.
 * The first point of a sub-list, with no point before it in its list, leaves no sub-list behind: the spacer line goes
 * into the text of the point it stands in, and its own empty spacer lines go with it, so Enter, Tab and Backspace
 * below `1.` give back the text as it was, no deeper spacer line Markdown would read as code. An empty point Markdown
 * reads as text of the point above, like `\t- ` right below `1. one`, counts as such a first point.
 * The numbers of its list count in order again, see {@link listChange}.
 * - `line`: The line of the cursor.
 * - `item`: The list item it stands in, `null` outside a list.
 * - `own`: Whether Markdown reads the line as a point of its own, else as text of `item`.
 * - `parent`: The point it stands in.
 * - `first`: Whether it is the first point of a sub-list.
 * - `last`: Its last line, the line of the cursor or its last empty spacer line below it.
 * - `indentation`: The indentation of the text of the point the spacer line goes into, `null` for a point indented
 *   otherwise than by tabs, like by spaces, whose key it leaves to CodeMirror's Markdown too.
 * - `insert`: The spacer line.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const spacerBackward: Command = (view: EditorView): boolean => {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    if (!view.state.selection.main.empty || view.state.selection.main.head !== line.to
        || !/^\t*(?:[-*+]|\d+[.)]) $/.test(line.text))
        return false;
    const item: SyntaxNode | null = itemOf(view.state, line);
    const own: boolean = item !== null && view.state.doc.lineAt(item.from).number === line.number;
    const parent: SyntaxNode | null = own ? item?.parent?.parent ?? null : item;
    if (item === null || own && item.prevSibling?.name !== "ListItem" && parent?.name !== "ListItem")
        return false;

    const first: boolean = !own || item.prevSibling?.name !== "ListItem";
    let last: Line = line;
    while (own && first && last.number < view.state.doc.lineAt(item.to).number
           && emptySpacerRule.test(view.state.doc.line(last.number + 1).text))
        last = view.state.doc.line(last.number + 1);
    const indentation: string | null =
        textIndentationOf(first ? view.state.doc.lineAt(parent?.from ?? 0).text : line.text);
    if (indentation === null)
        return false;
    const insert: string = indentation + spacer;
    listChange(view, {
        changes: { from: line.from, to: last.to, insert: insert },
        selection: { anchor: line.from + insert.length },
        scrollIntoView: true,
        userEvent: "delete",
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
    for (let item: SyntaxNode | null = itemOf(state, line); item?.name === "ListItem"; item = item.parent?.parent ?? null)
        items.unshift(item);
    return items;
}

/**
 * Gives the levels a spacer line may stand at: the indentation of the text of each point it stands in,
 * from the outermost to the innermost, see {@link itemsOf}. Markdown reads a spacer line right below a point into
 * the text of the innermost point above it, whatever its indentation, see {@link itemOf}; its level follows its
 * indentation instead, as with any line of a list: it belongs to the innermost point whose text it reaches.
 * So below `\t- θ` a spacer with the indentation of the text of `- Estimator` ends the point `θ`,
 * but stays in `Estimator`.
 *
 * @param state - Text
 * @param line - The spacer line
 * @returns The indentations, none outside a list
 */
function spacerLevelsOf(state: EditorState, line: Line): string[] {
    return itemsOf(state, line).map((item: SyntaxNode): string => textIndentationOf(state.doc.lineAt(item.from).text) ?? "");
}

/**
 * Gives the level a spacer line, or any line of a list, stands at, see {@link spacerLevelsOf}: the innermost whose
 * indentation it reaches.
 *
 * @param levels - Indentations of the levels, from the outermost
 * @param text - Text of the line
 * @returns Number of the level, `-1` for none, outside the list
 */
function spacerLevelOf(levels: string[], text: string): number {
    return levels.findLastIndex((indentation: string): boolean => columnsOf(indentation) <= columnsOf(text));
}

/**
 * Finds the point a spacer line stands in by its level, see {@link spacerLevelOf}: the innermost point whose text it
 * reaches, not always the innermost point above it, into whose text Markdown reads it; Enter and a `- ` typed on it
 * start the next point after this one, see {@link furtherContinue} and {@link lineTyping}.
 * - `level`: Its level.
 *
 * @param state - Text
 * @param line - The spacer line
 * @returns The point, `ListItem`, `null` outside the list
 */
function spacerItemOf(state: EditorState, line: Line): SyntaxNode | null {
    const level: number = spacerLevelOf(spacerLevelsOf(state, line), line.text);
    return level >= 0 ? itemsOf(state, line)[level] : null;
}

/**
 * Takes away an empty spacer line, a visible empty line, with Backspace, in one step, as Shift+Enter wrote it, see
 * {@link pointContinue}, or Backspace on a new point, see {@link spacerBackward}, or as text taken away left it, see
 * {@link spacerKeep}: the cursor goes to the end of the line above; at the start of a paragraph, below an empty line,
 * the paragraph begins with what followed the spacer line, the cursor before it. Shift+Tab moves a spacer line a level
 * out instead, see {@link spacerIndent}. With the cursor at the start of the line, and on any other line, it leaves
 * the key to the next.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `above`: The line above it, `null` for none.
 * - `next`: The first line with text below it, `null` for none.
 * - `to`: End of what goes.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const spacerRemove: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (!range.empty || range.head === line.from || !emptySpacerRule.test(line.text))
        return false;

    const above: Line | null = line.number > 1 ? view.state.doc.line(line.number - 1) : null;
    if (above !== null && /\S/.test(above.text)) {
        view.dispatch({
            changes: { from: above.to, to: line.to },
            selection: { anchor: above.to },
            scrollIntoView: true,
            userEvent: "delete.backward",
        });
        return true;
    }
    let next: Line | null = line.number < view.state.doc.lines ? view.state.doc.line(line.number + 1) : null;
    while (next !== null && !/\S/.test(next.text))
        next = next.number < view.state.doc.lines ? view.state.doc.line(next.number + 1) : null;
    const to: number = next !== null ? next.from : line.to;
    view.dispatch({
        changes: { from: line.from, to: to },
        selection: { anchor: line.from + (next !== null ? /^[ \t]*/.exec(next.text)?.[0].length ?? 0 : 0) },
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
};

/**
 * Takes away the gap between two paragraphs with Backspace at the start of the one below it, in one step, as Enter
 * wrote it, see {@link paragraphBreak}: the empty lines above it go, so its text joins the paragraph above as its next
 * line, as Shift+Enter would have written it, or, while the new paragraph is still empty, the cursor goes back to the
 * end of the text above. Only in plain text, a paragraph or an empty line between blocks, see {@link proseIs}, outside
 * a list; anywhere else it leaves the key to the next.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `above`: The last line with text above the empty lines, `null` for none.
 * - `empty`: Whether the line of the cursor is empty, a new paragraph without text.
 * - `from`, `to`: What goes: the empty lines, with the empty line of the cursor.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const gapBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || line.number === 1
        || !/^[ \t]*$/.test(view.state.sliceDoc(line.from, range.head))
        || !/^[ \t]*$/.test(view.state.doc.line(line.number - 1).text)
        || itemOf(view.state, line) !== null || !proseIs(view.state, line))
        return false;

    let above: Line | null = view.state.doc.line(line.number - 1);
    while (above !== null && /^[ \t]*$/.test(above.text))
        above = above.number > 1 ? view.state.doc.line(above.number - 1) : null;
    const empty: boolean = /^[ \t]*$/.test(line.text);
    const from: number = above === null ? 0 : empty ? above.to : above.to + view.state.lineBreak.length;
    const to: number = empty ? line.to : line.from;
    view.dispatch({
        changes: { from: from, to: to },
        selection: { anchor: from + (empty ? 0 : range.head - line.from) },
        scrollIntoView: true,
        userEvent: "delete.backward",
    });
    return true;
};

/**
 * Leaves a further line of a point in its place when all its text is taken away, by Backspace on its last character,
 * Ctrl+Backspace, Delete or cutting what is picked: the line left with only its indentation becomes a spacer line,
 * see {@link spacer}, the cursor after the spacer, where its text began, instead of a line of blanks, which Markdown
 * reads as empty, so the list ended there, and the editor draws at the left edge; Tab and Shift+Tab then move it
 * a level, see {@link spacerIndent}, and a further Backspace takes the line away, see {@link spacerRemove}.
 * Only for a line of a list with text that starts no point, so a point taken away with its `-` stays a line of blanks,
 * and a spacer line whose spacer I take away stays empty.
 * - `range`: The cursor after the change.
 * - `line`: Its line.
 * - `from`, `to`: Where the line stood before the change.
 * - `before`: The line before the change, the first if it was several.
 * - `indentation`: Indentation of that line.
 *
 * @returns Filter of the changes of the editor
 */
const spacerKeep: Extension = EditorState.transactionFilter.of((transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
    const range: SelectionRange = transaction.newSelection.main;
    if (!transaction.docChanged || !transaction.isUserEvent("delete") || transaction.newSelection.ranges.length > 1
        || !range.empty)
        return transaction;

    const line: Line = transaction.newDoc.lineAt(range.head);
    const from: number = transaction.changes.invertedDesc.mapPos(line.from, -1);
    const to: number = transaction.changes.invertedDesc.mapPos(line.to, 1);
    const before: Line = transaction.startState.doc.lineAt(from);
    const indentation: string = /^[ \t]*/.exec(before.text)?.[0] ?? "";
    if (line.text !== indentation || !/[^\s⠀]/u.test(transaction.startState.sliceDoc(from, to))
        || /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(before.text) || itemOf(transaction.startState, before) === null)
        return transaction;
    return [transaction,
        { changes: { from: line.to, insert: spacer }, selection: { anchor: line.to + spacer.length }, sequential: true }];
});

/**
 * Tells whether Markdown would read a line of text into a deeper point than its indentation reaches: a line right
 * below a line of a point's text that starts no point itself goes on with that text, whatever its indentation,
 * so text with the indentation of the text of `x̄` right below its sub-point `:=` belongs to `:=`, and text at the left
 * edge right below a list to its last point; only a blank line before it ends that text, see {@link lineTyping}.
 * - `above`: The line above it.
 * - `levels`: Indentations of the text of the points the line above stands in, see {@link spacerLevelsOf}.
 *
 * @param state - Text
 * @param line - The line
 * @param text - What the line holds, with its indentation
 * @returns Whether its level lies outside the innermost point of the line above
 */
function lazyIs(state: EditorState, line: Line, text: string): boolean {
    if (line.number === 1)
        return false;
    const above: Line = state.doc.line(line.number - 1);
    const levels: string[] = /\S/.test(above.text) ? spacerLevelsOf(state, above) : [];
    return spacerLevelOf(levels, text) < levels.length - 1;
}

/**
 * Moves a spacer line one level in, Tab, or out, Shift+Tab, see {@link spacerLevelsOf}: out from the text of a point
 * to the text of the point it stands in, from the outermost out of the list; in to the text of the deeper point above
 * it, where there is one. A line of blanks or an empty line right below a line of a list becomes such a spacer line,
 * at the level next to its own, or at its own where there is none, the cursor after the spacer, instead of getting
 * a tab after its blanks: Markdown reads a line of blanks as empty, so text typed on it later stood at a level of its
 * own, a blank line put before it, see {@link lineTyping}. On any other line it leaves the key to the next,
 * see {@link itemIndent}.
 * - `line`: The line of the cursor.
 * - `bare`: Whether it is a line of blanks or empty, whose levels are those of the line above, as Markdown reads
 *   the spacer it gets into the point above.
 * - `above`: The line above it, `null` for none.
 * - `levels`: The levels it may stand at.
 * - `target`: Level it moves to, `-1` out of the list.
 * - `indentation`: Its indentation now.
 * - `insert`: Its new indentation, with the spacer for a line of blanks.
 *
 * @param inward - Whether it moves in, else out
 * @returns The command
 */
function spacerIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const bare: boolean = /^[ \t]*$/.test(line.text);
        if (view.state.doc.lineAt(view.state.selection.main.anchor).number !== line.number
            || !spacerRule.test(line.text) && !bare)
            return false;
        const above: Line | null = line.number > 1 ? view.state.doc.line(line.number - 1) : null;
        const levels: string[] = !bare ? spacerLevelsOf(view.state, line)
            : above !== null && /\S/.test(above.text) ? spacerLevelsOf(view.state, above) : [];
        if (levels.length === 0)
            return false;

        const level: number = spacerLevelOf(levels, line.text) + (inward ? 1 : -1);
        const target: number = bare ? Math.min(Math.max(level, -1), levels.length - 1) : level;
        const indentation: string = /^[ \t]*/.exec(line.text)?.[0] ?? "";
        const insert: string = (target === -1 ? "" : levels[target]) + (bare ? spacer : "");
        if (target >= -1 && target < levels.length)
            view.dispatch({
                changes: { from: line.from, to: line.from + indentation.length, insert: insert },
                selection: bare ? { anchor: line.from + insert.length } : undefined,
                userEvent: inward ? "input.indent" : "delete.dedent",
            });
        return true;
    };
}

/**
 * Keeps the cursor on an empty spacer line with Home: it stands already where the text of the line begins, after the
 * spacer, and the start of the line, before the spacer, counts as a move left out of its text, which puts the cursor
 * at the end of the line above, see `caretPlaceOf` in `./preview.ts`, so text typed next went there. On any other line
 * it leaves the key to CodeMirror's own Home.
 * - `range`: The cursor.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const spacerHome: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    return range.empty && range.head === view.state.doc.lineAt(range.head).to
        && emptySpacerRule.test(view.state.doc.lineAt(range.head).text);
};

/**
 * Starts the next point with Enter on a further line of a point, the lines written below its text, see
 * {@link pointContinue}, as Enter does on the line of its `-`, as Obsidian does: the new line takes the point's tabs
 * and its `-`, or its number counted on, like `2.` after `1.`, and what stood right of the cursor; an empty further
 * line becomes the new point itself, so no empty line stays behind. On a spacer line the point is that of its level,
 * see {@link spacerItemOf}, so Enter goes on with the list of the level Shift+Tab moved it to, see
 * {@link spacerIndent}; the points after it count on, see {@link listChange}. Anywhere else it leaves the key to the
 * next, CodeMirror's Markdown, which continues a list from the line of a `-`.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `item`: The list item it stands in, `null` outside a list.
 * - `first`: The first line of the item, with its `-` or number.
 * - `blank`: Whether the line of the cursor holds nothing but the room of a further line, maybe with a spacer;
 *   the item is then that of the line above, for a spacer line that of its level.
 * - `point`: Its tabs, then its `-`, or its number and the `.` or `)` after it; `null` for no point.
 * - `insert`: What the line of the new point begins with.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const furtherContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const blank: boolean = line.length > 0 && /^\s*⠀?$/.test(line.text);
    const item: SyntaxNode | null = !range.empty ? null
        : spacerRule.test(line.text) ? spacerItemOf(view.state, line)
            : blank && line.number > 1 ? itemOf(view.state, view.state.doc.line(line.number - 1)) : itemAt(view.state);
    if (item === null || view.state.doc.lineAt(item.from).number === line.number)
        return false;

    const first: Line = view.state.doc.lineAt(item.from);
    const point: RegExpExecArray | null = /^([ \t]*)(?:([-*+])|(\d+)([.)]))[ \t]/.exec(first.text);
    if (point === null)
        return false;
    const insert: string = `${point[1]}${point[2] ?? `${Number(point[3]) + 1}${point[4]}`} `;
    listChange(view, {
        changes: blank ? { from: line.from, to: line.to, insert: insert }
            : { from: range.head, insert: view.state.lineBreak + insert },
        selection: { anchor: blank ? line.from + insert.length : range.head + view.state.lineBreak.length + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Continues a list on Enter by CodeMirror's Markdown, on an empty point one level out, with the numbers counted
 * in order again, see {@link listChange}, so the `3.` of a sub-list below an emptied `2.` becomes `1.`.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const markupContinue: Command = (view: EditorView): boolean =>
    insertNewlineContinueMarkupCommand({ nonTightLists: false })({
        state: view.state,
        dispatch: (transaction: Transaction): void => listChange(view, {
            changes: transaction.changes,
            selection: transaction.selection,
            scrollIntoView: true,
            userEvent: transaction.annotation(Transaction.userEvent),
        }),
    });

/**
 * Starts a new paragraph with Enter in plain text, outside lists and quotes, as a word processor does: a line break
 * and an empty line, the cursor on the line after it, where Markdown begins the next paragraph, drawn as a small gap,
 * see `spaceLook` in `./preview.ts`; Shift+Enter stays in the paragraph on the next line, see {@link pointContinue}.
 * Before the text of a line within a paragraph it puts the empty line above that line, and on an empty line right
 * below text it writes the empty line, so there is never more than one; at the start of a paragraph, below an empty
 * line or a heading, it changes nothing, since the paragraph is begun already and Markdown reads more empty lines as
 * one. In a heading, a list, a quote, a table, code or an HTML block, or within a formula, it leaves the key to the
 * next, CodeMirror's own new line, so a heading gets no empty line below it.
 * - `range`: The cursor.
 * - `line`: Its line.
 * - `node`: A piece of syntax at the cursor, from the innermost outwards up to the block of the note it stands in,
 *   the note itself on an empty line between blocks.
 * - `above`: The line above it, `null` for none.
 * - `textStart`: Whether the cursor stands before the text of its line, after its indentation at most.
 * - `insert`: What it writes: before the text of a line at the start of the line.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const paragraphBreak: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty)
        return false;
    let node: SyntaxNode = syntaxTree(view.state).resolveInner(range.head, range.head === line.from && line.length > 0 ? 1 : -1);
    for (; node.parent !== null && node.parent.parent !== null; node = node.parent)
        if (node.name === "InlineMath" && node.from < range.head && range.head < node.to)
            return false;
    if (line.length > 0 ? node.name !== "Paragraph" : node.parent !== null)
        return false;

    const above: Line | null = line.number > 1 ? view.state.doc.line(line.number - 1) : null;
    const textStart: boolean = /^[ \t]*$/.test(view.state.sliceDoc(line.from, range.head));
    if (textStart && (above === null || /^\s*$/.test(above.text) || /^#{1,6}(?:[ \t]|$)/.test(above.text)))
        return true;
    const insert: string = textStart ? view.state.lineBreak : view.state.lineBreak + view.state.lineBreak;
    view.dispatch({
        changes: { from: textStart ? line.from : range.head, insert: insert },
        selection: { anchor: range.head + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Finds the list item a line stands in: the innermost item around the start of its text, so a further line of a point
 * or a sub-point is found too.
 * - `node`: A piece of syntax around the start of the text, from the innermost outwards.
 *
 * @param state - Text
 * @param line - The line
 * @returns The item, `ListItem`, `null` outside a list
 */
function itemOf(state: EditorState, line: Line): SyntaxNode | null {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(line.from + (/^[ \t]*/.exec(line.text)?.[0].length ?? 0), 1);
         node !== null; node = node.parent)
        if (node.name === "ListItem")
            return node;
    return null;
}

/**
 * Finds the list item the cursor stands in, or the lines picked, when they lie on its lines, see {@link itemOf}.
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
 * Runs one of CodeMirror's commands on the lines of a list item, from the line of its `-` to its last sub-point or
 * further line, as if they were picked, and keeps my cursor where it was in the text; the numbers of the lists it
 * touched count in order again, see {@link listChange}.
 *
 * @param view - The editor
 * @param item - The list item
 * @param command - CodeMirror's command, like `indentMore`
 */
function itemLinesRun(view: EditorView, item: SyntaxNode, command: StateCommand): void {
    const lines: SelectionRange = EditorSelection.range(view.state.doc.lineAt(item.from).from, view.state.doc.lineAt(item.to).to);
    command({
        state: view.state.update({ selection: lines }).state,
        dispatch: (transaction: Transaction): void => listChange(view, {
            changes: transaction.changes,
            selection: view.state.selection.map(transaction.changes, 1),
            userEvent: transaction.annotation(Transaction.userEvent),
        }),
    });
}

/**
 * Moves a list item one step in, Tab, or out, Shift+Tab, with its sub-points and further lines, as Obsidian does:
 * in only below an item of its own list, under which it then stands, out only from a sub-point.
 * Outside a list, and on lines picked beyond one item, it leaves the key to the next, see {@link markdownKeys}.
 * - `item`: The list item of the cursor.
 * - `nested`: Whether it is a sub-point, an item of a list inside another item.
 *
 * @param inward - Whether it moves in, else out
 * @returns The command
 */
function itemIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const item: SyntaxNode | null = itemAt(view.state);
        if (item === null)
            return false;

        const nested: boolean = item.parent?.parent?.name === "ListItem";
        if (inward && item.prevSibling?.name === "ListItem")
            itemLinesRun(view, item, indentMore);
        else if (!inward && nested)
            itemLinesRun(view, item, indentLess);
        return true;
    };
}

/**
 * Swaps two blocks of whole lines that stand right below each other, like a list item and the one before it,
 * and moves the cursor or what is picked along with the block it stands in; numbered points count in order again,
 * so `2.` moved above `1.` becomes `1.`, see {@link listChange}.
 * - `upper`, `lower`: The text of the two blocks.
 * - `shift`: How far the cursor moves with its block.
 *
 * @param view - The editor
 * @param from - Start of the first line of the upper block
 * @param middle - Start of the first line of the lower block
 * @param to - End of the last line of the lower block
 * @param inLower - Whether the cursor stands in the lower block, which then moves up, else in the upper one
 */
function blocksSwap(view: EditorView, from: number, middle: number, to: number, inLower: boolean): void {
    const upper: string = view.state.sliceDoc(from, middle - view.state.lineBreak.length);
    const lower: string = view.state.sliceDoc(middle, to);
    const shift: number = inLower ? -(upper.length + view.state.lineBreak.length) : lower.length + view.state.lineBreak.length;
    listChange(view, {
        changes: { from: from, to: to, insert: lower + view.state.lineBreak + upper },
        selection: EditorSelection.create(view.state.selection.ranges.map((range: SelectionRange): SelectionRange =>
            EditorSelection.range(range.anchor + shift, range.head + shift)), view.state.selection.mainIndex),
        scrollIntoView: true,
        userEvent: "move.line",
    });
}

/**
 * Moves a list item one up, Alt+Up, or down, Alt+Down, with its sub-points and further lines, past the item before
 * or after it in its list, with that item's own sub-points; the first or last item of its list moves one line,
 * still with its sub-points. Outside a list, and on lines picked beyond one item, it leaves the key to CodeMirror's
 * own Move line up or down, which moves the lines of the cursor or picked one line, as Obsidian does.
 * - `item`: The list item of the cursor.
 * - `first`, `last`: The first and the last line of the item.
 * - `sibling`: The item before or after it in its list, `null` for none.
 * - `line`: The line it moves past where it has no such item.
 *
 * @param down - Whether it moves down, else up
 * @returns The command
 */
function itemMove(down: boolean): Command {
    return (view: EditorView): boolean => {
        const item: SyntaxNode | null = itemAt(view.state);
        if (item === null || view.state.readOnly)
            return false;

        const first: Line = view.state.doc.lineAt(item.from);
        const last: Line = view.state.doc.lineAt(item.to);
        const sibling: SyntaxNode | null = down ? item.nextSibling : item.prevSibling;
        if (sibling?.name === "ListItem") {
            if (down)
                blocksSwap(view, first.from, view.state.doc.lineAt(sibling.from).from, view.state.doc.lineAt(sibling.to).to, false);
            else
                blocksSwap(view, view.state.doc.lineAt(sibling.from).from, first.from, last.to, true);
            return true;
        }
        if (down ? last.number === view.state.doc.lines : first.number === 1)
            return true;
        const line: Line = view.state.doc.line(down ? last.number + 1 : first.number - 1);
        if (down)
            blocksSwap(view, first.from, line.from, line.to, false);
        else
            blocksSwap(view, line.from, first.from, last.to, true);
        return true;
    };
}

/**
 * Counts the markup characters, like `*`, right before or after a place, up to three, as `***` is bold and italic.
 *
 * @param state - Text
 * @param pos - Place
 * @param forward - Whether to count after it, else before
 * @param char - Markup character, like `*`
 * @returns How many stand there in a row, at most three
 */
function marksCount(state: EditorState, pos: number, forward: boolean, char: string): number {
    let count: number = 0;
    while (count < 3 && state.sliceDoc(forward ? pos + count : pos - count - 1, forward ? pos + count + 1 : pos - count) === char)
        count++;
    return count;
}

/**
 * Makes text bold, Ctrl+B with `**`, or italic, Ctrl+I with `*`, as Obsidian does: the text picked, else the word
 * at the cursor, gets the markup around it, or loses it when it is already bold or italic, so the same key takes it
 * back; `***` counts as both. In empty space it writes the markup twice with the cursor between, to type into.
 * - `word`: The text to mark: the text picked, or the word at the cursor, `null` for none.
 * - `before`, `after`: The markup characters right before and after it.
 * - `marked`: Whether it is marked already: bold with two or three on both sides, italic with one or three.
 *
 * @param mark - Markup, `**` or `*`
 * @returns The command
 */
function markupToggle(mark: string): Command {
    return (view: EditorView): boolean => {
        if (view.state.readOnly)
            return false;

        view.dispatch(view.state.changeByRange((range: SelectionRange): { range: SelectionRange; changes: ChangeSpec } => {
            const word: SelectionRange | null = range.empty ? view.state.wordAt(range.head) : range;
            if (word === null)
                return { range: EditorSelection.cursor(range.head + mark.length), changes: { from: range.head, insert: mark + mark } };

            const before: number = marksCount(view.state, word.from, false, mark[0]);
            const after: number = marksCount(view.state, word.to, true, mark[0]);
            const marked: boolean = mark.length === 2 ? Math.min(before, after) >= 2 : Math.min(before, after) % 2 === 1;
            if (marked)
                return {
                    range: EditorSelection.range(range.anchor - mark.length, range.head - mark.length),
                    changes: [{ from: word.from - mark.length, to: word.from }, { from: word.to, to: word.to + mark.length }],
                };
            return {
                range: EditorSelection.range(range.anchor + mark.length, range.head + mark.length),
                changes: [{ from: word.from, insert: mark }, { from: word.to, insert: mark }],
            };
        }), { scrollIntoView: true, userEvent: "input" });
        return true;
    };
}

/**
 * Pieces of syntax that show as their text where the cursor stands, see `./preview.ts`, on more rows than drawn when
 * long, see {@link lineMove}: wiki links, Markdown links and formulas.
 */
const sourcePieces: string[] = ["WikiLink", "Link", "InlineMath"];

/**
 * Finds the link or formula the cursor stands on, which shows as its text there, see {@link sourcePieces}: the one
 * around a place, also at its ends.
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
            if (sourcePieces.includes(node.name))
                piece = node.node;
        },
    });
    return piece;
}

/**
 * Moves the cursor a line up or down, Arrow Up or Arrow Down, or picks up to there with Shift, by CodeMirror's own
 * command, but in one step past what held it on its line: the end of a folded heading or point, where CodeMirror's
 * step down ends first, on the same line, so a first Arrow Down seemed to do nothing; and the rows of the link or
 * formula the cursor stands on, which shows as its text there, see {@link sourcePieceOf}, on more rows than drawn,
 * like `#### [[01_01_SampleMeanEstimator#Algorithm. Check an Estimator for Bias|Ice Cream Kiosk]]` or a long
 * formula, so a step stopped on its next row instead of the next line.
 * - `line`: The line the cursor stood on.
 * - `piece`: The link or formula it stood on, `null` for none.
 * - `head`: Where the step put the cursor.
 * - `held`: Whether the step ended at the end of what that line folds, or on that line within that link or formula.
 *
 * @param command - CodeMirror's command, like `cursorLineDown` or `selectLineUp`
 * @returns The command
 */
function lineMove(command: Command): Command {
    const move: Command = (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state, view.state.selection.main.head);
        if (!command(view))
            return false;
        const head: number = view.state.selection.main.head;
        let held: boolean = piece !== null && head >= piece.from && head <= piece.to
            && view.state.doc.lineAt(head).number === line.number;
        foldedRanges(view.state).between(line.to, line.to, (from: number, to: number): void => {
            held ||= from === line.to && to === head;
        });
        if (held)
            move(view);
        return true;
    };
    return move;
}

/**
 * Moves the cursor to the end of its line, End, or picks up to there, Shift+End, by CodeMirror's own command, but
 * past the hidden end of a link drawn as its name, like its `]]`, when the link ends the line: CodeMirror's step
 * ends where the drawn line ends, before that hidden end, so the cursor stood in the link, which then showed as its
 * text with the cursor before its `]]`, and Shift+End with Backspace left the `]]` behind. Not in a link the cursor
 * already stood on, which shows as its text, see {@link sourcePieceOf}.
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
        if (!command(view))
            return false;
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state, range.head);
        if (piece !== null && piece.to === line.to && range.head < line.to && piece.from !== before?.from)
            view.dispatch({ selection: { anchor: range.empty ? line.to : range.anchor, head: line.to }, userEvent: "select" });
        return true;
    };
}

/**
 * Spacer line with a `-`, `*` or `+` waiting after the spacer, typed on an empty spacer line, see {@link lineTyping}:
 * its indentation and the mark.
 */
const waitingRule: RegExp = /^([ \t]*)⠀([-*+])$/;

/**
 * Gives the start of a new point that a `-`, `*` or `+` waiting on a spacer line of a point begins, see
 * {@link lineTyping}: by a space the next point of that point's level, with the indentation of its `-`, below
 * a numbered point a sub-point of it, since a `- ` beside `1.` would end the numbered list; by Tab always a sub-point,
 * see {@link waitingIndent}. Sub-points take one tab more, as my notes indent them.
 * - `indentation`: Indentation of the point's `-` or number.
 * - `sub`: Whether the new point is a sub-point.
 *
 * @param state - Text
 * @param item - The point of the spacer line's level, see {@link spacerItemOf}
 * @param mark - The mark typed, like `-`
 * @param inward - Whether Tab was pressed, which always makes a sub-point
 * @returns The start of the line, like `\t- `
 */
function pointStartOf(state: EditorState, item: SyntaxNode, mark: string, inward: boolean): string {
    const indentation: string = /^[ \t]*/.exec(state.doc.lineAt(item.from).text)?.[0] ?? "";
    const sub: boolean = inward || item.parent?.name === "OrderedList";
    return indentation + (sub ? "\t" : "") + mark + " ";
}

/**
 * Makes the `-`, `*` or `+` waiting on a spacer line a sub-point with Tab, see {@link pointStartOf}: below
 * `1. Compute sample mean` a `-` and Tab give `\t- ` under it, the cursor after it, ready to type, as Tab moves a new
 * point in; on any other line it leaves the key to the next.
 * - `line`: The line of the cursor.
 * - `waiting`: Indentation and mark of the line, `null` for a line without a waiting mark.
 * - `item`: The point of the spacer line's level, `null` outside a list.
 * - `insert`: What the line becomes.
 *
 * @param view - The editor
 * @returns Whether it took the key
 */
const waitingIndent: Command = (view: EditorView): boolean => {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    const waiting: RegExpExecArray | null = waitingRule.exec(line.text);
    const item: SyntaxNode | null = waiting !== null && view.state.selection.main.empty
        ? spacerItemOf(view.state, line) : null;
    if (waiting === null || item === null)
        return false;

    const insert: string = pointStartOf(view.state, item, waiting[2], true);
    view.dispatch({
        changes: { from: line.from, to: line.to, insert: insert },
        selection: { anchor: line.from + insert.length },
        scrollIntoView: true,
        userEvent: "input.indent",
    });
    return true;
};

/**
 * Writes the first text typed on an empty line of a list where its level says, as Google Docs keeps a line in its place:
 * - On an empty spacer line, see {@link spacer}, the text takes the place of the spacer: the line stays in the point
 *   of its level as a further line, its text under the point's text, since the spacer is needed only while the line
 *   is empty.
 * - A `-`, `*` or `+` typed first waits after the spacer, the line still a spacer line of its level: a space after it
 *   starts the next point of that level, see {@link spacerItemOf}, as Enter does, with the indentation of that point's
 *   `-`, so the `- ` stands where Shift+Tab moved the line, see {@link spacerIndent}, and Obsidian reads it as the next
 *   point of that level, not as a sub-point; below a numbered point, like `1. Compute sample mean`, a sub-point of it,
 *   `\t- `, since a `- ` beside `1.` would end its numbered list; Tab after it makes a sub-point too, see
 *   {@link waitingIndent}; any other text after it takes the place of the spacer too.
 * - On an empty line right below a list, where Enter ended it, the same, as on a spacer line outside it.
 * - Where Markdown would read the text into a deeper point than its level, see {@link lazyIs}, like text with the
 *   indentation of the text of `x̄` right below its sub-point `:=`, or text at the left edge right below a list,
 *   a blank line goes before it, which ends the deeper point, so the text belongs to `x̄`, or stands after the list,
 *   in Obsidian too; the editor draws that blank line as every empty line, one line high, see `spaceLook`
 *   in `./preview.ts`.
 * - `line`: The line typed on.
 * - `waiting`: Indentation and `-`, `*` or `+` of a line where one waits after the spacer, `null` for none,
 *   see {@link waitingRule}.
 * - `empty`: Indentation of the line while it is an empty spacer line or an empty line below a list, `null` else.
 * - `item`: The point of the spacer's level, `null` for none.
 * - `insert`: What the line becomes.
 * - `textual`: Whether it becomes a line of text, not a point and not a spacer line with a waiting `-`.
 * - `blank`: The line break of the blank line before it, empty for none.
 *
 * @returns Handler of typed text
 */
const lineTyping: Extension = EditorView.inputHandler.of((view: EditorView, from: number, to: number,
                                                          text: string): boolean => {
    const line: Line = view.state.doc.lineAt(from);
    if (from !== to || from !== line.to || /[\r\n]/.test(text))
        return false;

    const waiting: RegExpExecArray | null = waitingRule.exec(line.text);
    const empty: string | null = emptySpacerRule.test(line.text) ? line.text.slice(0, -spacer.length)
        : line.length === 0 && lazyIs(view.state, line, "") ? "" : null;
    let insert: string;
    let textual: boolean = true;
    if (waiting !== null && text === " ") {
        const item: SyntaxNode | null = spacerItemOf(view.state, line);
        insert = item === null ? waiting[1] + waiting[2] + " " : pointStartOf(view.state, item, waiting[2], false);
        textual = false;
    } else if (waiting !== null) {
        insert = waiting[1] + waiting[2] + text;
    } else if (empty !== null && /^[-*+]$/.test(text)) {
        insert = empty + spacer + text;
        textual = false;
    } else if (empty !== null) {
        insert = empty + text;
    } else {
        return false;
    }
    const blank: string = textual && lazyIs(view.state, line, insert) ? view.state.lineBreak : "";
    view.dispatch({ changes: { from: line.from, to: line.to, insert: blank + insert },
        selection: { anchor: line.from + blank.length + insert.length }, scrollIntoView: true, userEvent: "input.type" });
    return true;
});

/**
 * Keys of a Markdown file, see the top of this file; Enter, Tab and Shift+Tab, Alt+Up and Alt+Down try the list item
 * first, Enter a new paragraph after it, Backspace, Tab and Shift+Tab a spacer line before it, Backspace the gap
 * before a paragraph after it, Tab a waiting `-` before that, then the key goes on to the next command,
 * CodeMirror's own; the first text typed on an empty line of a list where its level says, see {@link lineTyping};
 * and a further line emptied of its text kept as a spacer line, see {@link spacerKeep}.
 */
export const markdownKeys: Extension = [lineTyping, spacerKeep, Prec.high(keymap.of([
    { key: "Enter", run: furtherContinue },
    { key: "Enter", run: markupContinue },
    { key: "Enter", run: paragraphBreak },
    { key: "Shift-Enter", run: pointContinue },
    { key: "Backspace", run: spacerBackward },
    { key: "Backspace", run: spacerRemove },
    { key: "Backspace", run: gapBackward },
    { key: "Backspace", run: deleteMarkupBackward },
    { key: "Tab", run: waitingIndent },
    { key: "Tab", run: spacerIndent(true), shift: spacerIndent(false) },
    { key: "Tab", run: itemIndent(true), shift: itemIndent(false) },
    { key: "Tab", run: insertTab, shift: indentLess },
    { key: "Alt-ArrowUp", run: itemMove(false) },
    { key: "Alt-ArrowDown", run: itemMove(true) },
    { key: "Mod-Shift-ArrowUp", run: moveLineUp },
    { key: "Mod-Shift-ArrowDown", run: moveLineDown },
    { key: "Mod-b", run: markupToggle("**") },
    { key: "Mod-i", run: markupToggle("*") },
    { key: "Mod-d", run: deleteLine },
    { key: "ArrowUp", run: lineMove(cursorLineUp), shift: lineMove(selectLineUp) },
    { key: "ArrowDown", run: lineMove(cursorLineDown), shift: lineMove(selectLineDown) },
    { key: "Home", run: spacerHome },
    { key: "End", run: lineEnd(cursorLineBoundaryForward), shift: lineEnd(selectLineBoundaryForward) },
]))];
