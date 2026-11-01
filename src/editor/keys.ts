/**
 * ## Keys
 *
 * The keys of a Markdown file in the editor, as in Obsidian, before CodeMirror's own keys.
 * Each does the same within a line as at its end, the blanks at a break gone.
 * - Enter in plain text and in a heading writes one empty line more, see {@link paragraphBreak}.
 * - Two empty lines are the most air any key writes, see {@link airMost}.
 * - Lists are written as my notes write them, see `.claude/skills/learn/styles/document-style.md`,
 *   one tab per level, a further line of a point in its tabs and spaces under its text.
 * - No key writes, moves or leaves a point between a point and its sub-points or further lines,
 *   where Markdown would take it into them. Only Tab and Shift+Tab change the level of a point.
 *   The cursor never stands in the tabs of a point, so no key of CodeMirror's own rewrites them.
 * - Enter continues a list, Ctrl+Enter writes a new block with air,
 *   Shift+Enter goes on in the same paragraph or point.
 * - Text typed first on an empty line below another becomes a paragraph of its own.
 * - Backspace takes away one line or one step and never outdents, Delete the same forwards.
 * - Tab and Shift+Tab move a list item a step in or out.
 * - Alt+Up and Alt+Down move lines as in VS Code, Ctrl+Shift+Up and Ctrl+Shift+Down only the lines.
 * - Ctrl+B and Ctrl+I make text bold or italic, Ctrl+D takes away the line.
 * - Ctrl+Z and Ctrl+Shift+Z undo only within the block of the cursor, Ctrl+Y does nothing.
 * - Arrow Up and Arrow Down go past a link, formula or fold in one step, End past the hidden `]]` of a link.
 */

import { EditorSelection, EditorState, Prec, StateEffect, StateField, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
    cursorLineBoundaryForward,
    cursorLineDown,
    cursorLineUp,
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
import { deleteMarkupBackward, insertNewlineContinueMarkupCommand } from "@codemirror/lang-markdown";

import type {
    ChangeSet,
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

/** Tells an empty line, only blanks or in a quote only its `>`, never one of code, HTML or a formula. */
export function emptyIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t>]*$/.test(line.text)) return false;
    if (nodeAround(state, line.from, /^(?:FencedCode|CodeBlock|HTMLBlock|CommentBlock|InlineMath)$/) !== null)
        return false;
    return /^[ \t]*$/.test(line.text) || quoteMarkIs(state, line);
}

/** Finds the farthest empty line in a row above a line, `step` -1, or below it, `step` 1, else the line itself. */
export function emptyEndOf(state: EditorState, line: Line, step: number): Line {
    let end: Line = line;
    for (
        let next: number = line.number + step;
        next >= 1 && next <= state.doc.lines && emptyIs(state, state.doc.line(next));
        next += step
    )
        end = state.doc.line(next);
    return end;
}

/** Finds the innermost node at or around a place whose name `name` matches. */
function nodeAround(state: EditorState, pos: number, name: RegExp): SyntaxNode | null {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); node !== null; node = node.parent)
        if (name.test(node.name)) return node;
    return null;
}

/** Counts the blanks a text begins with. */
export function blanksOf(text: string): number {
    return /^[ \t]*/.exec(text)?.[0].length ?? 0;
}

/** Tells a line that starts with the `>` of a quote, not with a `>` of plain text. */
function quoteMarkIs(state: EditorState, line: Line): boolean {
    return syntaxTree(state).resolveInner(line.from + blanksOf(line.text), 1).name === "QuoteMark";
}

/**
 * Gives the indentation of a further line of a point,
 * its tabs and spaces as wide as its `-` or number with a space, for an empty point too.
 *
 * @returns `null` for a line that starts no point
 */
export function textIndentationOf(text: string): string | null {
    const point: RegExpExecArray | null = /^(\t*)([-*+]|\d+[.)])(?:[ \t]|$)/.exec(text);
    return point !== null ? point[1] + " ".repeat(point[2].length + 1) : null;
}

/** Gives the `>` of the quote of a line, each with its blank, which a line written in the quote begins with. */
export function quotePrefixOf(text: string): string {
    return /^(?:[ \t]*>[ \t]?)*/.exec(text)?.[0] ?? "";
}

/**
 * Gives the start of a further line of a point, the `>` of its quote and the indentation of its text.
 *
 * @returns `null` for a line that starts no point
 */
function pointStartOf(text: string): string | null {
    const prefix: string = quotePrefixOf(text);
    const indentation: string | null = textIndentationOf(text.slice(prefix.length));
    return indentation === null ? null : prefix + indentation;
}

/** Gives an empty line of air to write above a line, after the `>` of its quote, so the air stays in it. */
function airOf(state: EditorState, line: Line): string {
    return quotePrefixOf(line.text).trimEnd() + state.lineBreak;
}

/** Counts the blanks before a place on its line, which a line break there takes away. */
function blanksBefore(state: EditorState, pos: number): number {
    return /[ \t]*$/.exec(state.sliceDoc(state.doc.lineAt(pos).from, pos))?.[0].length ?? 0;
}

function blanksAfter(state: EditorState, pos: number): number {
    return blanksOf(state.sliceDoc(pos, state.doc.lineAt(pos).to));
}

/**
 * Tells a cursor right after the `-` or number of a point, in a quote too,
 * the point empty or its text after the cursor, so a key does the same at the end of a line and within it.
 */
function markEndIs(state: EditorState, line: Line, head: number): boolean {
    const before: string = state.sliceDoc(line.from, head);
    return (
        emptyPointRule.test(before.slice(quotePrefixOf(before).length)) && !/^[ \t]/.test(state.sliceDoc(head, line.to))
    );
}

/**
 * Tells a cursor with only blanks before it on a further line of a point, never in code,
 * which a key treats as a line of only blanks.
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
 * Joins the line of the cursor to the line above with one blank between two texts, as Markdown shows them,
 * so a line break and Backspace give the text back. What stands before the cursor goes.
 */
function lineJoin(view: EditorView, above: Line): boolean {
    const head: number = view.state.selection.main.head;
    const rest: string = view.state.sliceDoc(head, view.state.doc.lineAt(head).to);
    const blank: string = /\S$/.test(above.text) && /^\S/.test(rest) ? " " : "";
    view.dispatch(
        keyChange({ from: above.to, to: head, insert: blank }, above.to + blank.length, "delete.backward", true),
    );
    return true;
}

/**
 * Builds the change of a key, scrolled into sight, the cursor at `anchor` or where the change maps it.
 * With `typing` its line is marked as {@link typingLine}.
 */
function keyChange(
    changes: ChangeSpec,
    anchor: number | undefined,
    userEvent: string,
    typing: boolean = false,
): TransactionSpec {
    return {
        changes: changes,
        selection: anchor === undefined ? undefined : { anchor: anchor },
        effects: typing ? typingSet.of(null) : [],
        scrollIntoView: true,
        userEvent: userEvent,
    };
}

/** Counts the columns of the indentation of a line as Markdown does, a tab up to the next multiple of 4. */
export function columnsOf(text: string): number {
    let columns: number = 0;
    for (const char of /^[ \t]*/.exec(text)?.[0] ?? "")
        columns = char === "\t" ? columns + 4 - (columns % 4) : columns + 1;
    return columns;
}

/**
 * Sends a change of a list with the numbered lists it touched counted in order again, as Obsidian does,
 * both one step of Undo.
 * A sub-list counts from `1.`, a list at the left edge from the number its first point had.
 * `to` reaches on to the line below, whose list the change may have made a sub-list.
 */
function listChange(view: EditorView, spec: TransactionSpec): void {
    const change: Transaction = view.state.update(spec);
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
            if (node.name !== "OrderedList") return;
            const before: RegExpExecArray | null = /^[ \t]*(\d+)[.)]/.exec(
                change.startState.doc.lineAt(change.changes.invertedDesc.mapPos(node.from, -1)).text,
            );
            let number: number | null =
                node.node.parent?.name === "ListItem" ? 1 : before !== null ? Number(before[1]) : null;
            for (const item of node.node.getChildren("ListItem")) {
                const mark: SyntaxNode | null = item.getChild("ListMark");
                if (mark === null) continue;
                const written: string = doc.sliceString(mark.from, mark.to);
                if (number === null) number = Number.parseInt(written);
                const wanted: string = `${number}${written.slice(-1)}`;
                if (written !== wanted) changes.push({ from: mark.from, to: mark.to, insert: wanted });
                number++;
            }
        },
    });
    view.dispatch(spec, { changes: changes, sequential: true });
}

/**
 * Gives the start of the next line of the quote at a place, its indentation, every `>` and a space.
 *
 * @returns `null` outside a quote, in a list within it and on a line of a quote without `>`
 */
function quoteMarksOf(state: EditorState, pos: number): string | null {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1); node !== null; node = node.parent) {
        if (node.name === "ListItem") return null;
        if (node.name !== "Blockquote") continue;
        const marks: RegExpExecArray | null = /^[ \t]*(?:>[ \t]?)*>/.exec(state.doc.lineAt(pos).text);
        return marks === null ? null : `${marks[0]} `;
    }
    return null;
}

/**
 * Shift+Enter goes on in the same paragraph or point with a single line break,
 * in a list under the text of the point, in a quote after its `> `.
 * A line left with only blanks becomes empty, so Shift+Enter twice leaves an empty line,
 * and the cursor stays under the text of the point, where Markdown keeps the next text in it.
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
    const insert: string = before + view.state.lineBreak + start;
    const to: number = range.to + blanksAfter(view.state, range.to);
    view.dispatch(keyChange({ from: line.from, to: to, insert: insert }, line.from + insert.length, "input"));
    return true;
};

/** Gives the points a line stands in, from the outermost to the innermost. */
function itemsOf(state: EditorState, line: Line): SyntaxNode[] {
    const items: SyntaxNode[] = [];
    for (let item: SyntaxNode | null = itemOf(state, line); item !== null; item = outerPointOf(item))
        items.unshift(item);
    return items;
}

/** Finds the point a sub-point stands in. */
function outerPointOf(item: SyntaxNode): SyntaxNode | null {
    return item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
}

/**
 * Gives the start of the next point after a point, its `>` and indentation,
 * its `-` or its number counted on, after a task an empty box.
 *
 * @returns `null` for a point written otherwise
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

/** Folded point and the end of its fold. */
type Folded = { item: SyntaxNode; to: number };

/** Finds the folded point at whose start or end the cursor stands. */
function foldedPointOf(state: EditorState): Folded | null {
    const head: number = state.selection.main.head;
    let folded: Folded | null = null;
    foldedRanges(state).between(head, head, (from: number, to: number): void => {
        const item: SyntaxNode | null = itemOf(state, state.doc.lineAt(from));
        if ((from === head || to === head) && item !== null && item.from <= from) folded = { item: item, to: to };
    });
    return folded;
}

/**
 * Finds the first sub-point right below the cursor at the end of a point's text, only empty lines between,
 * before which a new point would take all the sub-points.
 *
 * @returns `null` for none there or text right of the cursor
 */
function subPointOf(state: EditorState, item: SyntaxNode): SyntaxNode | null {
    const head: number = state.selection.main.head;
    const list: SyntaxNode | null = item.getChild("BulletList") ?? item.getChild("OrderedList");
    if (list === null || !/^[ \t]*$/.test(state.sliceDoc(head, state.doc.lineAt(head).to))) return null;
    const next: number = emptyEndOf(state, state.doc.lineAt(head), 1).number + 1;
    return state.doc.lineAt(list.from).number === next ? list.firstChild : null;
}

/**
 * Enter on a further line of a point starts the next point, as Obsidian does,
 * with the text right of the cursor, the numbers counted on.
 * A new point never stands between a point and its sub-points, where it would take them all.
 * So above the sub-points it is the first of them, as Workflowy does, at a fold the point after it.
 * With only blanks before the cursor it leaves the key to {@link paragraphBreak}.
 * Right after a `-` it leaves the key to {@link pointEnter}, on the line of a `-` to CodeMirror's Markdown.
 */
const furtherContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (!range.empty || markEndIs(view.state, line, range.head)) return false;
    const folded: Folded | null = foldedPointOf(view.state);
    const item: SyntaxNode | null =
        folded?.item ?? (!/^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head)) ? itemAt(view.state) : null);
    if (item === null) return false;
    const sub: SyntaxNode | null = folded === null ? subPointOf(view.state, item) : null;
    if (folded === null && sub === null && view.state.doc.lineAt(item.from).number === line.number) return false;

    const insert: string | null = nextPointOf(view.state, sub ?? item);
    if (insert === null) return false;
    const head: number = folded?.to ?? range.head;
    const from: number = head - blanksBefore(view.state, head);
    const point: string = view.state.lineBreak + insert;
    const to: number = head + blanksAfter(view.state, head);
    listChange(view, keyChange({ from: from, to: to, insert: point }, from + point.length, "input"));
    return true;
};

/**
 * Enter in a quote starts a new paragraph, a line of only `>` as its air and then the next `> ` line.
 * With only the `>` before the cursor one more line of only `>`.
 * A list in a quote it leaves to CodeMirror's Markdown.
 */
const quoteBreak: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const marks: string | null = quoteMarksOf(view.state, range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || marks === null) return false;

    const air: string = marks.trimEnd();
    const textStart: boolean = /^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head));
    const lineBreak: string = view.state.lineBreak;
    return breakWrite(view, textStart, textStart ? air + lineBreak : lineBreak + air + lineBreak + marks);
};

/**
 * Writes a break at the cursor, before the text of its line at its start,
 * else in place of the blanks around the cursor, the cursor after it.
 */
function breakWrite(view: EditorView, textStart: boolean, insert: string): boolean {
    const range: SelectionRange = view.state.selection.main;
    const from: number = textStart
        ? view.state.doc.lineAt(range.head).from
        : range.head - blanksBefore(view.state, range.head);
    const to: number = textStart ? from : range.head + blanksAfter(view.state, range.head);
    const anchor: number = (textStart ? range.head : from) + insert.length;
    view.dispatch(keyChange({ from: from, to: to, insert: insert }, anchor, "input"));
    return true;
}

/** Finds the point whose `-` or number the cursor stands right after, see {@link markEndIs}. */
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
 * Enter right after the `-` or number of a point, as Obsidian does.
 * Before its text a new empty point above it, the numbers counted on.
 * On an empty sub-point out one step, right after the point it stood in and below its other sub-points,
 * so an empty point never splits a sub-list.
 * On an empty point at the left edge the list ends, its line the empty line below the list,
 * and the cursor goes a line further, since Markdown would take text right below a point into it.
 */
const pointEnter: Command = (view: EditorView): boolean => {
    const item: SyntaxNode | null = markedItemOf(view.state);
    if (item === null) return false;
    const line: Line = view.state.doc.lineAt(item.from);
    const head: number = view.state.selection.main.head;
    const prefix: string = quotePrefixOf(line.text);
    if (view.state.sliceDoc(head, line.to).trim() !== "") {
        const point: string = `${view.state.sliceDoc(line.from, head).trimEnd()} `.replace(/\[[xX]\] $/, "[ ] ");
        const insert: string = point + view.state.lineBreak;
        listChange(view, keyChange({ from: line.from, insert: insert }, head + insert.length, "input"));
        return true;
    }
    const parent: SyntaxNode | null = outerPointOf(item);
    if (parent !== null) {
        itemShift(view, item, item, false, nextPointOf(view.state, parent));
        return true;
    }
    const insert: string = prefix.trimEnd() + view.state.lineBreak + prefix;
    listChange(view, keyChange({ from: line.from, to: line.to, insert: insert }, line.from + insert.length, "input"));
    return true;
};

/**
 * Ctrl+Enter writes a new block with air above it, as Enter twice in plain text.
 * In a list the next point with one empty line above it, none where one stands already.
 * Right after the `-` or number of a point one empty line above it, the point staying.
 */
const airBreak: Command = (view: EditorView): boolean => {
    const enter: () => boolean = (): boolean => quoteBreak(view) || paragraphBreak(view);
    const item: SyntaxNode | null = markedItemOf(view.state);
    if (item !== null) return airAbove(view, view.state.doc.lineAt(item.from));
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    if (itemAt(view.state) === null || /^[ \t>]*$/.test(view.state.sliceDoc(line.from, view.state.selection.main.head)))
        return enter() && (enter() || true);
    if (!furtherContinue(view) && !markupContinue(view)) return false;
    const point: Line = view.state.doc.lineAt(view.state.selection.main.head);
    return point.number === 1 || emptyIs(view.state, view.state.doc.line(point.number - 1)) || airAbove(view, point);
};

/** Puts one empty line above a line, the cursor in its text. */
function airAbove(view: EditorView, line: Line): boolean {
    view.dispatch(keyChange({ from: line.from, insert: airOf(view.state, line) }, undefined, "input"));
    return true;
}

/**
 * Enter continues a list by CodeMirror's Markdown, the numbers counted again,
 * without the empty line CodeMirror writes in a list whose first points stand apart.
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

/** Tells a line of a fenced or indented code block, whose blanks are text. */
function codeIs(state: EditorState, line: Line): boolean {
    return nodeAround(state, line.from, /^(?:FencedCode|CodeBlock)$/) !== null;
}

/**
 * Backspace with only blanks before the cursor, outside code, never outdents.
 * Below an empty line it takes that line away, so a paragraph of a point becomes its next line.
 * Below text it takes the line break away too, so the line joins the line above.
 * Before a `-` or number it leaves the key to the next.
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
    view.dispatch(keyChange({ from: above.from, to: line.from }, undefined, "delete.backward", true));
    return true;
};

/**
 * Backspace at the start of a line of plain text joins it to the text above,
 * so Enter and Backspace give the text back. Markup like `-`, `#` or `>` and code it leaves to the next.
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
 * Tab and Shift+Tab on an empty line in a list, or before the text of a further line,
 * move it to the text of the next deeper or outer point above it, out from the outermost to the left edge.
 * Out right below text it puts an empty line above too, as Markdown would take text there into the line above.
 */
function blankIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const prefix: string = quotePrefixOf(line.text);
        const body: string = line.text.slice(prefix.length);
        if (
            !view.state.selection.main.empty ||
            (!/^[ \t]*$/.test(body) && !furtherStartIs(view.state, line, view.state.selection.main.head))
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
        const levels: number[] = items.map((point: SyntaxNode): number => columnsOf(indentationOf(point)));
        const column: number = columnsOf(body);
        const item: SyntaxNode | null = inward
            ? (items.find((point: SyntaxNode, index: number): boolean => levels[index] > column) ?? null)
            : (items.findLast((point: SyntaxNode, index: number): boolean => levels[index] < column) ?? null);
        if (inward && item === null) return true;
        const air: string =
            !inward && !emptyIs(view.state, view.state.doc.line(line.number - 1)) ? airOf(view.state, line) : "";
        const insert: string = air + prefix + (item === null ? "" : indentationOf(item));
        view.dispatch({
            changes: { from: line.from, to: line.from + prefix.length + blanksOf(body), insert: insert },
            selection: { anchor: line.from + insert.length },
            effects: typingSet.of(null),
            userEvent: inward ? "input.indent" : "delete.dedent",
        });
        return true;
    };
}

/**
 * Backspace right before the text of a heading takes away one empty line above it, the heading staying.
 * With text right above it leaves the key to the next.
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
    view.dispatch(
        keyChange({ from: view.state.doc.line(line.number - 1).from, to: line.from }, undefined, "delete.backward"),
    );
    return true;
};

/**
 * Backspace in a quote, a step each.
 * Right after the `>` of a new paragraph it leaves the quote, each line of only `>` above it an empty line.
 * Right after the `>` of a line below text it joins the line to that text.
 * Below one empty line after a quote the line becomes its next `> ` line,
 * which Markdown would take into the quote without its `>`.
 * The `>` of the first line of a quote it leaves to CodeMirror's Markdown.
 */
const quoteBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || line.number === 1) return false;
    const before: string = view.state.sliceDoc(line.from, range.head);
    const above: Line = view.state.doc.line(line.number - 1);

    if (/^[ \t]*(?:>[ \t]?)+$/.test(before) && quoteMarkIs(view.state, line) && quoteMarkIs(view.state, above)) {
        if (!emptyIs(view.state, above)) return lineJoin(view, above);
        let top: Line = above;
        while (top.number > 1) {
            const next: Line = view.state.doc.line(top.number - 1);
            if (!emptyIs(view.state, next) || !quoteMarkIs(view.state, next)) break;
            top = next;
        }
        const changes: ChangeSpec[] = [];
        for (let number: number = top.number; number <= above.number; number++)
            changes.push({ from: view.state.doc.line(number).from, to: view.state.doc.line(number).to });
        changes.push({ from: line.from, to: range.head });
        const head: number = view.state.changes(changes).mapPos(range.head);
        view.dispatch(keyChange(changes, head, "delete.backward", true));
        return true;
    }

    if (line.number < 3 || !/^[ \t]*$/.test(before) || !/^[ \t]*$/.test(above.text)) return false;
    const quote: Line = view.state.doc.line(line.number - 2);
    const marks: string | null = quoteMarksOf(view.state, quote.to);
    let block: SyntaxNode = syntaxTree(view.state).resolveInner(line.to, -1);
    while (block.parent !== null && block.parent.parent !== null) block = block.parent;
    if (marks === null || emptyIs(view.state, quote) || (/\S/.test(line.text) && block.name !== "Paragraph"))
        return false;
    const change: Replace = { from: quote.to, to: range.head, insert: view.state.lineBreak + marks };
    view.dispatch(keyChange(change, change.from + change.insert.length, "delete.backward", true));
    return true;
};

/** Tells a line of a table, whose rows a line break would tear apart. */
function tableOf(state: EditorState, line: Line): SyntaxNode | null {
    return nodeAround(state, line.from, /^Table$/);
}

/**
 * Enter, Shift+Enter and Ctrl+Enter in a table, which its widget edits, never tear a row apart.
 * At the end of its last row they write a paragraph after it, at the start of its first row an empty line above.
 *
 * @param lines - Line breaks at the end, 2 for Enter, 3 for Ctrl+Enter
 */
function tableBreak(lines: number): Command {
    return (view: EditorView): boolean => {
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        const table: SyntaxNode | null = tableOf(view.state, line);
        if (table === null) return false;
        const end: boolean =
            range.empty && range.head === line.to && view.state.doc.lineAt(table.to).number === line.number;
        const breaks: number = end
            ? lines
            : range.empty && range.head === line.from && table.from === line.from
              ? lines - 1
              : 0;
        const at: number = end ? line.to : line.from;
        const insert: string = view.state.lineBreak.repeat(breaks);
        if (breaks > 0) view.dispatch(keyChange({ from: at, insert: insert }, at + insert.length, "input"));
        return true;
    };
}

/**
 * Backspace and Delete never join a row of a table with text or another row.
 * An empty line next to a table they take away.
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
            (tableOf(view.state, line) !== null || tableOf(view.state, next) !== null) && textIs(line) && textIs(next)
        );
    };
}

/**
 * Tab outside a list writes a tab only in code or over lines picked,
 * as a tab in text would stand as a stray blank or begin code.
 */
const tabWrite: Command = (view: EditorView): boolean => {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    return !view.state.selection.main.empty || codeIs(view.state, line) ? insertTab(view) : true;
};

/** An empty point: its indentation and its `-` or number, a task with its box. */
const emptyPointRule: RegExp = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]+\[[ xX]\])?[ \t]*$/;

/**
 * Backspace right after the `-` or number of a point below another takes the mark away,
 * its text staying at its depth, see {@link markerTaken}, never a level out, the job of Shift+Tab.
 * Any other `-` or number and the `>` of a quote it leaves to CodeMirror's Markdown.
 */
const markerBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const taken: Replace | null = range.empty ? markerTaken(view.state, line, range.head) : null;
    if (taken !== null) {
        listChange(view, keyChange(taken, taken.from + taken.insert.length, "delete.backward", true));
        return true;
    }
    return deleteMarkupBackward({
        state: view.state,
        dispatch: (transaction: Transaction): void =>
            view.dispatch({
                changes: transaction.changes,
                selection: transaction.selection,
                effects: markEndIs(view.state, line, range.head) ? typingSet.of(null) : [],
                scrollIntoView: true,
                userEvent: transaction.annotation(Transaction.userEvent),
            }),
    });
};

/** Change of a stretch of the text, with what is written in its place. */
type Replace = { from: number; to: number; insert: string };

/**
 * Gives the change that takes away the `-` or number of a point below another point,
 * the same for Backspace after it and Delete before its line.
 * Below text the line becomes the next line of the point above, as Shift+Enter writes it.
 * Below an empty line it becomes a paragraph of the point, in its tabs and spaces for its mark,
 * which Markdown wants to keep it in a sub-point.
 * Right below a sub-point of the point above it gets one empty line and such a paragraph,
 * told by the points, not the blanks, since a further line stands in spaces and a point in tabs.
 *
 * @returns `null` for any other `-` or number, like that of the first point of a list
 */
function markerTaken(state: EditorState, line: Line, head: number): Replace | null {
    const item: SyntaxNode | null = itemOf(state, line);
    let previous: SyntaxNode | null = item?.prevSibling ?? null;
    while (previous?.name === "QuoteMark") previous = previous.prevSibling;
    if (
        !markEndIs(state, line, head) ||
        item === null ||
        previous?.name !== "ListItem" ||
        state.doc.lineAt(item.from).number !== line.number ||
        pointStartOf(line.text) === null
    )
        return null;
    const above: Line = state.doc.line(line.number - 1);
    const holder: SyntaxNode | null = itemOf(state, above);
    const air: string =
        !emptyIs(state, above) && holder !== null && holder.from > previous.from && holder.to <= previous.to
            ? airOf(state, line)
            : "";
    const mark: RegExpExecArray | null = /^((?:[ \t]*>[ \t]?)*\t*)([-*+]|\d+[.)])/.exec(line.text);
    const indentation: string =
        air === "" && !emptyIs(state, above)
            ? (pointStartOf(line.text) ?? "")
            : (mark?.[1] ?? "") + " ".repeat((mark?.[2].length ?? 0) + 1);
    return { from: line.from, to: head, insert: air + indentation };
}

/**
 * Delete at the end of a line takes away the markup of the next line, as Backspace after it does,
 * the cursor staying. Markup CodeMirror's Markdown does not take, like a bare `>`, loses one character.
 * A next line of blanks goes whole, a line without markup joins this one.
 */
const markupForward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (!range.empty || range.head !== line.to || line.number === view.state.doc.lines || emptyIs(view.state, line))
        return false;
    const next: Line = view.state.doc.line(line.number + 1);
    const markup: string = /^[ \t]*(?:>[ \t]?)*(?:(?:[-*+]|\d+[.)])[ \t]+)?/.exec(next.text)?.[0] ?? "";
    const end: number = next.from + markup.length;
    const changed: (changes: ChangeSpec) => void = (changes: ChangeSpec): void =>
        listChange(view, keyChange(changes, range.head, "delete.forward"));
    if (markup.length === 0) return false;
    if (/^[ \t]+$/.test(markup)) {
        changed({ from: line.to, to: end });
        return true;
    }
    const taken: ChangeSpec | null = markerTaken(view.state, next, end);
    if (taken !== null) changed(taken);
    else if (
        !deleteMarkupBackward({
            state: view.state.update({ selection: { anchor: end } }).state,
            dispatch: (transaction: Transaction): void => changed(transaction.changes),
        })
    )
        changed({ from: end - 1, to: end });
    return true;
};

/**
 * Text typed first on an empty line below another empty line becomes a paragraph of its own, as in Word,
 * with the empty lines below it lacks, one before text or a list, two before a heading, none at the end.
 * On the air between two points it writes the text under the text of the point above,
 * so it stands where the cursor stood, not on the left edge, which would end the list.
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

        const last: Line = emptyEndOf(view.state, line, 1);
        const below: number = last.number - line.number;
        const next: Line | null = last.number < view.state.doc.lines ? view.state.doc.line(last.number + 1) : null;
        const wanted: number = next === null ? 0 : /^#{1,6}(?:[ \t]|$)/.test(next.text) ? 2 : 1;
        if (below >= wanted && indentation === "") return false;
        const insert: string = indentation + text + view.state.lineBreak.repeat(Math.max(wanted - below, 0));
        view.dispatch(keyChange({ from: from, insert: insert }, from + indentation.length + text.length, "input.type"));
        return true;
    },
);

/** Gives a transaction and a change right after it, as a filter of transactions does. */
function withChange(transaction: Transaction, changes: ChangeSpec): readonly TransactionSpec[] {
    return [transaction, { changes: changes, sequential: true }];
}

/**
 * Keeps the air a key writes at two empty lines, more right above the cursor go again.
 * Code and air already in the note stay.
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
        const top: Line = emptyEndOf(state, line, -1);
        if (line.number - top.number <= 2) return transaction;
        return withChange(transaction, { from: top.from, to: state.doc.line(line.number - 2).from });
    },
);

/**
 * Takes back the empty lines {@link paragraphTyping} wrote, when Backspace leaves its line empty
 * below an empty line, its text gone, so two empty lines stand as before.
 */
const paragraphUntyped: Extension = EditorState.transactionFilter.of(
    (transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
        if (!transaction.docChanged || !transaction.isUserEvent("delete.backward")) return transaction;
        const line: Line = transaction.startState.doc.lineAt(transaction.startState.selection.main.head);
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
        let next: number = now.number + 1;
        while (next <= doc.lines && /^[ \t]*$/.test(doc.line(next).text)) next++;
        if (next > doc.lines || next === now.number + 1) return transaction;
        return withChange(transaction, { from: now.to, to: doc.line(next).from - 1 });
    },
);

/**
 * Finds the point an empty line between two points is the air of, as `./preview.ts` draws it,
 * the innermost point of the nearest line with text above whose `li` reaches over it to its next point.
 *
 * @returns `null` for none, like below the last point of a list
 */
function airPointOf(state: EditorState, line: Line): SyntaxNode | null {
    let above: Line = line;
    while (above.number > 1 && /^[ \t]*$/.test(above.text)) above = state.doc.line(above.number - 1);
    if (above.number === line.number) return null;
    return (
        itemsOf(state, above).findLast(
            (point: SyntaxNode): boolean => point.nextSibling?.name === "ListItem" && point.nextSibling.from > line.to,
        ) ?? null
    );
}

/**
 * Enter in plain text and in a heading writes one empty line more, as a word processor does,
 * each empty line drawn as half a line, so two are the air of a line.
 * Within a line it writes a line break and an empty line, the rest of the line after them.
 * Before the text of a line it writes the empty line above it.
 * On a line of only blanks it writes one more above it, the cursor staying where its text will begin.
 * A list, quote, table, code, HTML block or formula it leaves to CodeMirror's own new line.
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
        if (node.name === "InlineMath" && node.from < range.head && range.head < node.to) return false;
    const blank: boolean =
        (/^[ \t]+$/.test(line.text) && emptyIs(view.state, line)) || furtherStartIs(view.state, line, range.head);
    if (line.length > 0 && !blank && !/^(?:Paragraph|ATXHeading\d)$/.test(node.name)) return false;

    const textStart: boolean =
        blank ||
        (node.name === "Paragraph" ? /^[ \t]*$/ : /^[ \t]*#*[ \t]*$/).test(view.state.sliceDoc(line.from, range.head));
    return breakWrite(view, textStart, textStart ? airOf(view.state, line) : view.state.lineBreak.repeat(2));
};

/** Finds the list item at the start of the text of a line, after its `>`, so a further line finds its point. */
function itemOf(state: EditorState, line: Line): SyntaxNode | null {
    return nodeAround(state, line.from + (/^(?:[ \t]*>[ \t]?)*[ \t]*/.exec(line.text)?.[0].length ?? 0), /^ListItem$/);
}

/** Finds the list item of the cursor or the lines picked, `null` when they reach beyond it. */
function itemAt(state: EditorState): SyntaxNode | null {
    const item: SyntaxNode | null = itemOf(state, state.doc.lineAt(state.selection.main.from));
    return item !== null && state.selection.main.to <= state.doc.lineAt(item.to).to ? item : null;
}

/** Finds the first and last point of one list the cursor or the lines picked lie on, `null` beyond it. */
function itemsAt(state: EditorState): [SyntaxNode, SyntaxNode] | null {
    const range: SelectionRange = state.selection.main;
    let end: Line = state.doc.lineAt(range.to);
    if (!range.empty && range.to === end.from && end.number > 1) end = state.doc.line(end.number - 1);
    const first: SyntaxNode | null = itemOf(state, state.doc.lineAt(range.from));
    let last: SyntaxNode | null = itemOf(state, end);
    while (first !== null && last !== null && last.parent?.from !== first.parent?.from) last = outerPointOf(last);
    return first !== null && last !== null && last.from >= first.from ? [first, last] : null;
}

/**
 * Moves the lines of points of one list one step in or out, written as my notes write a list.
 * Each point and line of code gets one tab more or less, each further line spaces under its point's text.
 * The `-` or number of each point moved becomes that of the list it joins.
 * Out they stand right after the point they stood in, below its other points,
 * so no point takes the points of another list as its sub-points.
 *
 * @param start - Start of a point of the list they join, `null` to keep their own mark
 */
function itemShift(view: EditorView, item: SyntaxNode, last: SyntaxNode, inward: boolean, start: string | null): void {
    const state: EditorState = view.state;
    const own: string | null = start === null ? null : (/([-*+]|\d+[.)]) (?:\[ \] )?$/.exec(start)?.[1] ?? null);
    const first: Line = state.doc.lineAt(item.from);
    const end: Line = state.doc.lineAt(last.to);
    const changes: ChangeSpec[] = [];
    for (let number: number = first.number; number <= end.number; number++) {
        const line: Line = state.doc.line(number);
        const prefix: string = quotePrefixOf(line.text);
        const body: string = line.text.slice(prefix.length);
        const blanks: string = /^[ \t]*/.exec(body)?.[0] ?? "";
        const from: number = line.from + prefix.length;
        const point: SyntaxNode | null = itemOf(state, line);
        if (blanks === body || point === null) continue;
        const moved: boolean = own !== null && point.parent?.from === item.parent?.from;
        if (state.doc.lineAt(point.from).number === number || codeIs(state, line)) {
            const cut: number = blanks.startsWith("\t") ? 1 : Math.min(4, blanks.length);
            changes.push(inward ? { from: from, insert: "\t" } : { from: from, to: from + cut });
            const mark: SyntaxNode | null = point.getChild("ListMark");
            if (moved && mark !== null && state.doc.lineAt(mark.from).number === number)
                changes.push({ from: mark.from, to: mark.to, insert: own ?? "" });
            continue;
        }
        const text: string = state.doc.lineAt(point.from).text;
        const head: RegExpExecArray | null = /^(\t*)([-*+]|\d+[.)])/.exec(text.slice(quotePrefixOf(text).length));
        if (head === null) continue;
        const tabs: number = Math.max(head[1].length + (inward ? 1 : -1), 0);
        changes.push({
            from: from,
            to: from + blanks.length,
            insert: " ".repeat(((moved ? own : null) ?? head[2]).length + 1 + tabs),
        });
    }

    const parent: SyntaxNode | null = inward ? null : outerPointOf(item);
    const below: Line | null =
        parent !== null && state.doc.lineAt(parent.to).number > end.number ? state.doc.lineAt(parent.to) : null;
    if (below === null) {
        listChange(view, {
            changes: changes,
            selection: state.selection.map(state.changes(changes), 1),
            userEvent: inward ? "input.indent" : "delete.dedent",
        });
        return;
    }
    const shifted: ChangeSet = state.changes(changes);
    const text: string = shifted
        .apply(state.doc)
        .sliceString(shifted.mapPos(first.from, -1), shifted.mapPos(end.to, 1));
    const moves: ChangeSet = state.changes([
        { from: first.from, to: end.to + 1 },
        { from: below.to, insert: state.lineBreak + text },
    ]);
    const at: number = below.to - (end.to + 1 - first.from) + 1;
    const place = (pos: number): number =>
        pos >= first.from && pos <= end.to ? at + shifted.mapPos(pos, 1) - first.from : moves.mapPos(pos);
    listChange(view, {
        changes: moves,
        selection: selectionMoved(state, place),
        scrollIntoView: true,
        userEvent: "delete.dedent",
    });
}

/**
 * Tab and Shift+Tab move a list item with its sub-points and further lines, as Obsidian does,
 * in only below an item of its own list, out only from a sub-point.
 * It takes the mark of the list it joins, a new sub-list keeps its own, counted from `1.`.
 */
function itemIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const items: [SyntaxNode, SyntaxNode] | null = itemsAt(view.state);
        if (items === null) return false;
        const item: SyntaxNode = items[0];

        const parent: SyntaxNode | null = outerPointOf(item);
        const last: SyntaxNode | null = item.prevSibling?.name === "ListItem" ? item.prevSibling.lastChild : null;
        const before: SyntaxNode | null = inward
            ? /^(?:BulletList|OrderedList)$/.test(last?.name ?? "")
                ? (last?.lastChild ?? null)
                : null
            : parent;
        const start: string | null = before === null ? null : nextPointOf(view.state, before);
        if (inward && item.prevSibling?.name === "ListItem") itemShift(view, item, items[1], true, start);
        else if (!inward && parent !== null) itemShift(view, item, items[1], false, start);
        return true;
    };
}

/**
 * Swaps the block of lines from `top` with the block from `middle` to `bottom` right below it,
 * the cursor moving along with its block, never past the end of the text.
 *
 * @param inLower - Whether the cursor stands in the lower block, which then moves up
 */
function blocksSwap(view: EditorView, top: number, middle: number, bottom: number, inLower: boolean): void {
    const from: number = view.state.doc.line(top).from;
    const split: number = view.state.doc.line(middle).from;
    const to: number = view.state.doc.line(bottom).to;
    const upper: string = view.state.sliceDoc(from, split - view.state.lineBreak.length);
    const lower: string = view.state.sliceDoc(split, to);
    const shift: number = inLower
        ? -(upper.length + view.state.lineBreak.length)
        : lower.length + view.state.lineBreak.length;
    listChange(view, {
        changes: { from: from, to: to, insert: lower + view.state.lineBreak + upper },
        selection: selectionMoved(view.state, (pos: number): number => Math.min(pos + shift, view.state.doc.length)),
        scrollIntoView: true,
        userEvent: "move.line",
    });
}

/** Gives the selection with both ends of each range moved by `place`. */
function selectionMoved(state: EditorState, place: (pos: number) => number): EditorSelection {
    return EditorSelection.create(
        state.selection.ranges.map((range: SelectionRange): SelectionRange =>
            EditorSelection.range(place(range.anchor), place(range.head)),
        ),
        state.selection.mainIndex,
    );
}

/**
 * Tells how far a line stands in, its blanks after the `>` of a quote each counting one,
 * as my notes indent a point by tabs and its further lines by spaces.
 *
 * @returns `null` for an empty line
 */
function depthOf(text: string): number | null {
    const body: string = text.slice(quotePrefixOf(text).length);
    return blanksOf(body) === body.length ? null : blanksOf(body);
}

/** Tells the line of a point, its `-` or number first, never code like a list in YAML. */
function pointIs(state: EditorState, number: number): boolean {
    const line: Line = state.doc.line(number);
    const body: string = line.text.slice(quotePrefixOf(line.text).length);
    return /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(body) && !codeIs(state, line);
}

/** Finds the last line of a point with its sub-points and further lines, not the empty lines after them. */
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

/** Finds the last line of the text of a point, the lines further in below it that start no point. */
function textLastOf(state: EditorState, number: number): number {
    const depth: number = depthOf(state.doc.line(number).text) ?? 0;
    let last: number = number;
    while (last < state.doc.lines && (depthOf(state.doc.line(last + 1).text) ?? 0) > depth && !pointIs(state, last + 1))
        last++;
    return last;
}

/**
 * Gives the first and last line a key moves or takes away, the line of the cursor or the lines picked,
 * each point with its sub-points and further lines. A line where the pick ends at its start is none.
 */
function linesOf(state: EditorState): { first: number; last: number } {
    const range: SelectionRange = state.selection.main;
    const first: number = state.doc.lineAt(range.from).number;
    let last: number = state.doc.lineAt(range.to).number;
    if (!range.empty && range.to === state.doc.line(last).from) last--;
    const end: number = last;
    for (let number: number = first; number <= end; number++)
        if (pointIs(state, number)) last = Math.max(last, pointLastOf(state.doc, number));
    return { first: first, last: last };
}

/**
 * Moves the lines one line up or down, as VS Code does, past an empty line too.
 * A point moves with its sub-points and further lines, and past a point of its level with that point's own.
 * A further line moves alone, like a line of code, so I put the lines of a point in order.
 * The first point of a sub-list goes up past the text of its point, the last down past a lower point's text,
 * so a point never stands between a point and its further lines, which it would take.
 */
function linesMove(down: boolean): Command {
    return (view: EditorView): boolean => {
        const doc: Text = view.state.doc;
        if (view.state.readOnly) return false;

        const text = (number: number): string => doc.line(number).text;
        const { first, last }: { first: number; last: number } = linesOf(view.state);
        const point: boolean = pointIs(view.state, first);
        const level: number | null = depthOf(text(first));
        if (down) {
            if (last === doc.lines) return true;
            const below: number = last + 1;
            const bottom: number = !pointIs(view.state, below)
                ? below
                : depthOf(text(below)) === level
                  ? pointLastOf(doc, below)
                  : point && level !== null && (depthOf(text(below)) ?? 0) < level
                    ? textLastOf(view.state, below)
                    : below;
            blocksSwap(view, first, below, bottom, false);
            return true;
        }
        if (first === 1) return true;
        let top: number = first - 1;
        if (level !== null && depthOf(text(top)) !== null)
            for (let number: number = top; number >= 1; number--) {
                const blanks: number | null = depthOf(text(number));
                if (blanks === null || blanks > level || (point && blanks > 0 && !pointIs(view.state, number)))
                    continue;
                if (pointIs(view.state, number) && (blanks === level || point)) top = number;
                break;
            }
        blocksSwap(view, top, first, last, true);
        return true;
    };
}

/**
 * Ctrl+D takes away the lines, a point with its sub-points and further lines,
 * so none stays behind for the point above to take.
 * The cursor goes where the text of the line below begins.
 */
const linesDelete: Command = (view: EditorView): boolean => {
    const doc: Text = view.state.doc;
    if (view.state.readOnly) return false;

    const { first, last }: { first: number; last: number } = linesOf(view.state);
    const below: Line | null = last < doc.lines ? doc.line(last + 1) : null;
    const from: number = below === null && first > 1 ? doc.line(first).from - 1 : doc.line(first).from;
    const to: number = below === null ? doc.line(last).to : below.from;
    const mark: string =
        /^(?:[ \t]*>[ \t]?)*[ \t]*(?:(?:[-*+]|\d+[.)])(?:[ \t]|$))?/.exec(below?.text ?? "")?.[0] ?? "";
    listChange(view, keyChange({ from: from, to: to }, from + mark.length, "delete.line"));
    return true;
};

/** Counts the markup characters right before or after a place, up to three, as `***` is bold and italic. */
function marksCount(state: EditorState, pos: number, forward: boolean, char: string): number {
    let count: number = 0;
    while (
        count < 3 &&
        state.sliceDoc(forward ? pos + count : pos - count - 1, forward ? pos + count + 1 : pos - count) === char
    )
        count++;
    return count;
}

/**
 * Ctrl+B with `**` and Ctrl+I with `*` toggle the markup around the text picked or the word, as Obsidian does.
 * In empty space they write it twice with the cursor between.
 */
function markupToggle(mark: string): Command {
    return (view: EditorView): boolean => {
        if (view.state.readOnly) return false;

        const state: EditorState = view.state;
        const toggled = (range: SelectionRange): { range: SelectionRange; changes: ChangeSpec } => {
            const word: SelectionRange | null = range.empty ? state.wordAt(range.head) : range;
            if (word === null)
                return {
                    range: EditorSelection.cursor(range.head + mark.length),
                    changes: { from: range.head, insert: mark + mark },
                };

            const before: number = marksCount(state, word.from, false, mark[0]);
            const after: number = marksCount(state, word.to, true, mark[0]);
            const marks: number = Math.min(before, after);
            const marked: boolean = mark.length === 2 ? marks >= 2 : marks % 2 === 1;
            const shift: number = marked ? -mark.length : mark.length;
            const cut: number = marked ? mark.length : 0;
            const insert: string = marked ? "" : mark;
            return {
                range: EditorSelection.range(range.anchor + shift, range.head + shift),
                changes: [
                    { from: word.from - cut, to: word.from, insert: insert },
                    { from: word.to, to: word.to + cut, insert: insert },
                ],
            };
        };
        view.dispatch(state.changeByRange(toggled), { scrollIntoView: true, userEvent: "input" });
        return true;
    };
}

/**
 * Finds the link or formula at the cursor, also at its ends,
 * which shows as its text there, on more rows than drawn when long.
 */
function sourcePieceOf(state: EditorState): SyntaxNode | null {
    let piece: SyntaxNode | null = null;
    syntaxTree(state).iterate({
        from: state.selection.main.head,
        to: state.selection.main.head,
        enter: (node: SyntaxNodeRef): void => {
            if (["WikiLink", "Link", "InlineMath"].includes(node.name)) piece = node.node;
        },
    });
    return piece;
}

/**
 * Moves the cursor a line up or down by CodeMirror's command, but in one step past what held it on its line.
 * The end of a fold held it, where CodeMirror's step down ends first, so Arrow Down seemed to do nothing.
 * A link or formula shown as its text held it, on more rows than drawn.
 */
function lineMove(command: Command): Command {
    const move: Command = (view: EditorView): boolean => {
        const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state);
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
 * End and Shift+End by CodeMirror's command, but past the hidden `]]` of a link at the end of the line,
 * where CodeMirror stops, so Shift+End with Backspace left the `]]` behind.
 * Not in a link the cursor stood on already, which shows as its text.
 */
function lineEnd(command: Command): Command {
    return (view: EditorView): boolean => {
        const before: SyntaxNode | null = sourcePieceOf(view.state);
        if (!command(view)) return false;
        const range: SelectionRange = view.state.selection.main;
        const line: Line = view.state.doc.lineAt(range.head);
        const piece: SyntaxNode | null = sourcePieceOf(view.state);
        if (piece !== null && piece.to === line.to && range.head < line.to && piece.from !== before?.from)
            view.dispatch({
                selection: { anchor: range.empty ? line.to : range.anchor, head: line.to },
                userEvent: "select",
            });
        return true;
    };
}

/** Marks the line of the cursor as {@link typingLine} where a key took text away. */
const typingSet: StateEffectType<null> = StateEffect.define<null>();

/**
 * The empty line a key just put the cursor on, drawn as high as a line of text,
 * so the cursor stands where text typed will stand, not in the air between paragraphs.
 * An empty line clicked into stays a half line.
 */
export const typingLine: StateField<number | null> = StateField.define<number | null>({
    create: (): number | null => null,
    update: (start: number | null, transaction: Transaction): number | null => {
        const line: Line = transaction.newDoc.lineAt(transaction.newSelection.main.head);
        if (!/^[ \t>]*$/.test(line.text)) return null;
        if (
            (transaction.docChanged && transaction.isUserEvent("input")) ||
            transaction.effects.some((effect: StateEffect<unknown>): boolean => effect.is(typingSet))
        )
            return line.from;
        return start !== null && transaction.changes.mapPos(start) === line.from ? line.from : null;
    },
});

/**
 * Takes the blanks of a line of only blanks away when the cursor alone moves off it, never in code,
 * as only the line of the cursor holds the blanks where its text will begin.
 * Where that line stands among more than two empty lines the extra ones go, down to two.
 * It sees the cursor after the moves of `caretPlace` in `./preview.ts`.
 */
const blanksLeft: Extension = Prec.high(
    EditorState.transactionFilter.of((transaction: Transaction): TransactionSpec | readonly TransactionSpec[] => {
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
        const top: Line = emptyEndOf(state, line, -1);
        const bottom: Line = emptyEndOf(state, line, 1);
        const excess: number = bottom.number - top.number - 1;
        if (excess > 0) {
            const down: number = Math.min(excess, bottom.number - line.number + 1);
            const first: Line = state.doc.line(line.number - (excess - down));
            const last: Line = state.doc.line(line.number + down - 1);
            const end: boolean = last.number === state.doc.lines;
            return withChange(transaction, { from: first.from - (end ? 1 : 0), to: last.to + (end ? 0 : 1) });
        }
        if (line.text === line.text.trimEnd()) return transaction;
        return withChange(transaction, { from: line.from + line.text.trimEnd().length, to: line.to });
    }),
);

/**
 * Undo or Redo only within the block of the cursor, from its `##` heading to the next one,
 * so it never changes a part of the note a round hides.
 * Else the key goes on to the next command, never to the browser's own Undo.
 */
function historyIn(command: StateCommand): Command {
    return (view: EditorView): boolean => {
        const state: EditorState = view.state;
        const heading = (number: number): boolean => /^##[ \t]/.test(state.doc.line(number).text);
        let first: number = state.doc.lineAt(state.selection.main.head).number;
        let last: number = first;
        while (first > 1 && !heading(first)) first--;
        while (last < state.doc.lines && !heading(last + 1)) last++;
        const steps: Transaction[] = [];
        command({ state: state, dispatch: (transaction: Transaction): number => steps.push(transaction) });
        let inside: boolean = steps.length > 0;
        steps[0]?.changes.iterChangedRanges((from: number, to: number): void => {
            inside &&= from >= state.doc.line(first).from && to <= state.doc.line(last).to;
        });
        if (inside) view.dispatch(steps[0]);
        return inside;
    };
}

/** The browser's own Undo and Redo, like from a right click, only within the block of the cursor too. */
const historyInput: Extension = EditorView.domEventHandlers({
    beforeinput: (event: InputEvent, view: EditorView): boolean => {
        const command: StateCommand | null =
            event.inputType === "historyUndo" ? undo : event.inputType === "historyRedo" ? redo : null;
        if (command === null) return false;
        event.preventDefault();
        historyIn(command)(view);
        return true;
    },
});

/** Keys of a Markdown file in the order they are tried, then CodeMirror's own. */
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
            { key: "Mod-d", run: linesDelete },
            { key: "Mod-z", run: historyIn(undo), preventDefault: true },
            { key: "Mod-Shift-z", run: historyIn(redo), preventDefault: true },
            { key: "Mod-y", run: (): boolean => true, preventDefault: true },
            { key: "ArrowUp", run: lineMove(cursorLineUp), shift: lineMove(selectLineUp) },
            { key: "ArrowDown", run: lineMove(cursorLineDown), shift: lineMove(selectLineDown) },
            { key: "End", run: lineEnd(cursorLineBoundaryForward), shift: lineEnd(selectLineBoundaryForward) },
        ]),
    ),
];
