/**
 * ## Keys
 *
 * The keys of a Markdown file in the editor, as in Obsidian, see `./editor.ts`;
 * they go before CodeMirror's usual keys,
 * each the same within a line as at its end, decided by the text before the cursor,
 * the text after it carried along, the blanks at a break gone:
 * - In plain text and in a heading Enter writes one empty line more,
 *   wherever the cursor stands, see {@link paragraphBreak}.
 * - The air of a line, two empty lines,
 *   is the most air any key writes, see {@link airMost}.
 * - Lists are written as my notes write them, see
 *   `.claude/skills/learn/styles/document-style.md`:
 *   one tab per level, a further line of a point in the tabs of the point and spaces under its text.
 * - Every key keeps a point in the point it stands in,
 *   with its own sub-points and further lines:
 *   none writes, moves or leaves a point between a point
 *   and its sub-points or further lines,
 *   where Markdown would take them into it.
 *   Only Tab and Shift+Tab change the level of a point.
 *   The cursor stands on the line of a point only from where its text begins,
 *   see `caretPlace` in `./preview.ts`,
 *   so no key of CodeMirror's own takes or rewrites its tabs.
 * - Enter continues a list, see {@link pointEnter} and {@link furtherContinue},
 *   Ctrl+Enter writes a new block with air, see {@link airBreak},
 *   Shift+Enter goes on in the same paragraph or point, see {@link pointContinue},
 *   in a quote see {@link quoteBreak}.
 * - Text typed first on an empty line below another becomes a paragraph of its own,
 *   see {@link paragraphTyping}.
 * - Backspace takes away one line or one step, and nothing else moves, never outdenting,
 *   see {@link textBackward}, {@link quoteBackward}, {@link markerBackward}
 *   and {@link blankBackward}, the cursor always where text typed will stand.
 *   Delete does the same forwards, see {@link markupForward}.
 * - Tab and Shift+Tab move a list item a step in or out, see {@link itemIndent}
 *   and {@link blankIndent}, outside a list see {@link tabWrite}.
 * - Alt+Up and Alt+Down move lines as in VS Code, see {@link linesMove},
 *   Ctrl+Shift+Up and Ctrl+Shift+Down only the lines, as CodeMirror's Move line.
 * - Ctrl+B and Ctrl+I make text bold or italic, see {@link markupToggle}.
 * - Ctrl+D takes away the line of the cursor, see {@link linesDelete}.
 * - Ctrl+Z and Ctrl+Shift+Z undo only within the block of the cursor,
 *   see {@link historyIn}, Ctrl+Y does nothing.
 * - Arrow Up and Arrow Down go past a link, formula or fold in one step,
 *   see {@link lineMove}, End past the hidden `]]` of a link, see {@link lineEnd}.
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

/**
 * Tells an empty line: nothing or only blanks, in a quote only its `>`.
 * A line of code, of an HTML block or of a formula is none.
 */
export function emptyIs(state: EditorState, line: Line): boolean {
    if (!/^[ \t>]*$/.test(line.text)) return false;
    if (nodeAround(state, line.from, /^(?:FencedCode|CodeBlock|HTMLBlock|CommentBlock|InlineMath)$/) !== null)
        return false;
    return /^[ \t]*$/.test(line.text) || quoteMarkIs(state, line);
}

/**
 * Finds the farthest of the empty lines in a row right above a line, `step` -1,
 * or right below it, `step` 1, see {@link emptyIs}, the line itself for none.
 */
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

/** Finds the innermost node right after a place whose name `name` takes, or around it. */
function nodeAround(state: EditorState, pos: number, name: RegExp): SyntaxNode | null {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); node !== null; node = node.parent)
        if (name.test(node.name)) return node;
    return null;
}

/** Tells a line that starts with the `>` of a quote, not with a `>` of plain text. */
function quoteMarkIs(state: EditorState, line: Line): boolean {
    const blanks: number = /^[ \t]*/.exec(line.text)?.[0].length ?? 0;
    return syntaxTree(state).resolveInner(line.from + blanks, 1).name === "QuoteMark";
}

/**
 * Gives the indentation of the text of a point, as my notes indent a further line of it,
 * see `.claude/skills/learn/styles/document-style.md`:
 * its tabs, then as many spaces as its `-` or number with the space after it,
 * also for a still empty point without that space.
 *
 * @returns `null` for a line that starts no point
 */
export function textIndentationOf(text: string): string | null {
    const point: RegExpExecArray | null = /^(\t*)([-*+]|\d+[.)])(?:[ \t]|$)/.exec(text);
    return point !== null ? point[1] + " ".repeat(point[2].length + 1) : null;
}

/**
 * Gives the `>` of the quote a line stands in, each with the blank after it,
 * so a line written within the quote begins with them.
 */
export function quotePrefixOf(text: string): string {
    return /^(?:[ \t]*>[ \t]?)*/.exec(text)?.[0] ?? "";
}

/**
 * Gives what a further line of a point begins with, see {@link pointContinue}:
 * the `>` of a quote around it, then the indentation of its text.
 *
 * @returns `null` for a line that starts no point
 */
function pointStartOf(text: string): string | null {
    const prefix: string = quotePrefixOf(text);
    const indentation: string | null = textIndentationOf(text.slice(prefix.length));
    return indentation === null ? null : prefix + indentation;
}

/**
 * Gives an empty line to write above a line as its air, see {@link airMost},
 * within a quote after the `>` of the quote, so the air stays in it.
 */
function airOf(state: EditorState, line: Line): string {
    return quotePrefixOf(line.text).trimEnd() + state.lineBreak;
}

/**
 * Counts the blanks right before a place on its line, which a line break there takes away
 * with those right after it, so the text keeps no blanks at a break.
 */
function blanksBefore(state: EditorState, pos: number): number {
    return /[ \t]*$/.exec(state.sliceDoc(state.doc.lineAt(pos).from, pos))?.[0].length ?? 0;
}

/** Counts the blanks right after a place on its line, see {@link blanksBefore}. */
function blanksAfter(state: EditorState, pos: number): number {
    return /^[ \t]*/.exec(state.sliceDoc(pos, state.doc.lineAt(pos).to))?.[0].length ?? 0;
}

/**
 * Tells a cursor right after the `-` or number of a point on its line,
 * within a quote too:
 * a still empty point, or one with its text after the cursor,
 * so a key does the same at the end of a line and within it.
 */
function markEndIs(state: EditorState, line: Line, head: number): boolean {
    const before: string = state.sliceDoc(line.from, head);
    return (
        emptyPointRule.test(before.slice(quotePrefixOf(before).length)) && !/^[ \t]/.test(state.sliceDoc(head, line.to))
    );
}

/**
 * Tells a cursor right before the text of a further line of a point,
 * only its blanks before it,
 * which a key then treats as a line of only blanks,
 * so it does the same within a line as at its end. A line of code is none.
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
 * Joins the line of the cursor to the end of the line above,
 * with one blank between two texts,
 * as Markdown shows the two lines, so a line break and Backspace give the text back.
 * What stands before the cursor goes, like the blanks of a further line or a `> `.
 *
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
 */
export function columnsOf(text: string): number {
    let columns: number = 0;
    for (const char of /^[ \t]*/.exec(text)?.[0] ?? "")
        columns = char === "\t" ? columns + 4 - (columns % 4) : columns + 1;
    return columns;
}

/**
 * Sends a change of a list to the editor with the points of the numbered lists it touched
 * counted in order again, as Obsidian does, both in one step of Undo,
 * the cursor where the change put it:
 * a sub-list from `1.`, a list at the left edge
 * on from the number its first place had before,
 * each point one more than the one before it, its `.` or `)` kept.
 * Lists the change did not touch keep their numbers.
 * - `to`: On to the end of the line below, whose list the change
 *   may have made a sub-list.
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
 * Gives what the next line of the quote at a place begins with:
 * the indentation and every `>` of its line, of a quote in a quote too, and a space.
 *
 * @returns `null` outside a quote, in a list within it
 *   and on a line of a quote without `>`
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
 * Goes on in the same paragraph or point on the next line, with Shift+Enter,
 * where I want a new line but no new paragraph or bullet, as Enter starts them:
 * a single line break, the new line with the indentation of the point's text in a list,
 * in a quote with its `> `, as I write source lines,
 * else with the `>` and the indentation of the line.
 * A line left with nothing but blanks,
 * like the one a Shift+Enter just wrote, becomes empty,
 * so Shift+Enter twice leaves an empty line,
 * and the cursor goes on under the text of the point,
 * where Markdown keeps the next text in the point.
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

/** Gives the points a line stands in, from the outermost to the innermost. */
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
 * its indentation and its `-`, or its number counted on,
 * after a task an empty box.
 *
 * @returns `null` for a point written otherwise
 */
function nextPointOf(state: EditorState, item: SyntaxNode): string | null {
    const point: RegExpExecArray | null = new RegExp(
        /^((?:[ \t]*>[ \t]?)*[ \t]*)/.source +
            /(?:([-*+])|(\d+)([.)]))/.source +
            /(?:[ \t]+(\[[ xX]\]))?(?:[ \t]|$)/.source,
    ).exec(state.doc.lineAt(item.from).text);
    if (point === null) return null;
    const mark: string = point[2] ?? `${Number(point[3]) + 1}${point[4]}`;
    return `${point[1]}${mark} ${point[5] !== undefined ? "[ ] " : ""}`;
}

/**
 * Finds the folded point whose fold the cursor stands at, at its start or its end,
 * with the end of its fold.
 */
function foldedPointOf(state: EditorState): { item: SyntaxNode; to: number } | null {
    const head: number = state.selection.main.head;
    let folded: { item: SyntaxNode; to: number } | null = null;
    foldedRanges(state).between(head, head, (from: number, to: number): void => {
        const item: SyntaxNode | null = itemOf(state, state.doc.lineAt(from));
        if ((from === head || to === head) && item !== null && item.from <= from) folded = { item: item, to: to };
    });
    return folded;
}

/**
 * Finds the first sub-point right below the end of the text of a point,
 * only empty lines between, before which a new point would take all its sub-points.
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
 * Starts the next point with Enter on a further line of a point,
 * as Obsidian does, as Enter does on the line of its `-`,
 * with what stood right of the cursor, the points after it counted on.
 * A new point never stands between a point and its sub-points,
 * where it would take them all:
 * at the end of the text of a point right above its sub-points
 * it is the first of them, as Workflowy writes it,
 * at a folded point the next point after all it folds.
 * With only blanks before the cursor Enter writes more air, see {@link paragraphBreak}.
 * Right after the `-` of a point it leaves the key to {@link pointEnter},
 * anywhere else to CodeMirror's Markdown, which continues a list from the line of a `-`.
 */
const furtherContinue: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    if (!range.empty || markEndIs(view.state, line, range.head)) return false;
    const folded: { item: SyntaxNode; to: number } | null = foldedPointOf(view.state);
    const item: SyntaxNode | null =
        folded?.item ?? (!/^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head)) ? itemAt(view.state) : null);
    if (item === null) return false;
    const sub: SyntaxNode | null = folded === null ? subPointOf(view.state, item) : null;
    if (folded === null && sub === null && view.state.doc.lineAt(item.from).number === line.number) return false;

    const insert: string | null = nextPointOf(view.state, sub ?? item);
    if (insert === null) return false;
    const head: number = folded?.to ?? range.head;
    const from: number = head - blanksBefore(view.state, head);
    listChange(view, {
        changes: {
            from: from,
            to: head + blanksAfter(view.state, head),
            insert: view.state.lineBreak + insert,
        },
        selection: { anchor: from + view.state.lineBreak.length + insert.length },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
};

/**
 * Starts a new paragraph within a quote with Enter, as in plain text:
 * a line of only `>`, the half line of air of a quote,
 * then the next `> ` line with the rest of the line.
 * With nothing but the `>` before the cursor one more line of only `>`, more air.
 * A list in a quote it leaves to CodeMirror's Markdown, which continues the list.
 */
const quoteBreak: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const marks: string | null = quoteMarksOf(view.state, range.head);
    if (view.state.selection.ranges.length > 1 || !range.empty || marks === null) return false;

    const air: string = marks.trimEnd();
    const textStart: boolean = /^[ \t>]*$/.test(view.state.sliceDoc(line.from, range.head));
    return breakWrite(
        view,
        textStart,
        textStart ? air + view.state.lineBreak : view.state.lineBreak + air + view.state.lineBreak + marks,
    );
};

/**
 * Writes a break at the cursor, see {@link quoteBreak} and {@link paragraphBreak}:
 * before the text of its line at the start of the line,
 * else in place of the blanks around the cursor, the cursor after it.
 *
 * @returns `true`, as the key is taken
 */
function breakWrite(view: EditorView, textStart: boolean, insert: string): boolean {
    const range: SelectionRange = view.state.selection.main;
    const from: number = textStart
        ? view.state.doc.lineAt(range.head).from
        : range.head - blanksBefore(view.state, range.head);
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
}

/**
 * Finds the point whose line the cursor stands on right after its `-` or number,
 * see {@link markEndIs}.
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
 * before its text a new empty point above it of the same level, the numbers counted on.
 * On a still empty point out one step from a sub-point, as Shift+Tab,
 * right after the point it stood in, below the points after it, which stay sub-points,
 * so no empty point at a lower level splits a sub-list and takes the rest of it.
 * Else the list ends there: the `-` gone, its line the empty line below the list,
 * the cursor on a new line below it, where text typed stands as a paragraph of its own,
 * since right below a point Markdown would take it on into that point.
 */
const pointEnter: Command = (view: EditorView): boolean => {
    const item: SyntaxNode | null = markedItemOf(view.state);
    if (item === null) return false;
    const line: Line = view.state.doc.lineAt(item.from);
    const head: number = view.state.selection.main.head;
    const prefix: string = quotePrefixOf(line.text);
    if (view.state.sliceDoc(head, line.to).trim() !== "") {
        const point: string = `${view.state.sliceDoc(line.from, head).trimEnd()} `.replace(/\[[xX]\] $/, "[ ] ");
        listChange(view, {
            changes: { from: line.from, insert: point + view.state.lineBreak },
            selection: { anchor: head + point.length + view.state.lineBreak.length },
            scrollIntoView: true,
            userEvent: "input",
        });
        return true;
    }
    const parent: SyntaxNode | null = item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
    if (parent !== null) {
        itemShift(view, item, item, false, nextPointOf(view.state, parent));
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
 * Ctrl+Enter: a new block with air above it, as Enter twice in plain text.
 * In a list the next point of the same level with one empty line above it,
 * whatever text of the line it takes along, none where an empty line stands there.
 * With the cursor right after the `-` or number of a point
 * one empty line above it, the air of a half line, the point staying where it is.
 * In plain text, in a quote and with only blanks before the cursor Enter twice.
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

/** Puts one empty line above a line, the air of a half line, the cursor in its text. */
function airAbove(view: EditorView, line: Line): boolean {
    view.dispatch({
        changes: { from: line.from, insert: airOf(view.state, line) },
        scrollIntoView: true,
        userEvent: "input",
    });
    return true;
}

/**
 * Continues a list on Enter by CodeMirror's Markdown with its next point,
 * the numbers counted in order again,
 * never with the empty line CodeMirror writes before the new point in a list
 * whose first points stand apart, so Enter adds one line, as everywhere.
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

/** Tells a line of code, of a fenced or an indented code block, whose blanks are text. */
function codeIs(state: EditorState, line: Line): boolean {
    return nodeAround(state, line.from, /^(?:FencedCode|CodeBlock)$/) !== null;
}

/**
 * Backspace with nothing but blanks before the cursor,
 * outside code, only deletes, never outdents, one step back each.
 * Below an empty line it takes that empty line away, the line staying,
 * so a paragraph of a point, like the one a `-` taken away left,
 * becomes its next line, as Shift+Enter writes it.
 * Below text it takes the line break before the line away with those blanks,
 * so a line of only blanks goes whole,
 * and the text of a further line of a point joins the line above.
 * Before the `-` or number of a point it leaves the key to the next.
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
 * so Enter or Shift+Enter within a line and Backspace give the text back.
 * A line that starts with markup, like a `-`, `#` or `>`, and code it leaves to the next.
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
 * Moves an empty line or a line of blanks within a list one level in,
 * Tab, or out, Shift+Tab,
 * a further line of a point too with the cursor before its text:
 * to the indentation of the text of the next deeper or the next outer point of the line
 * with text above it, out from the outermost to the left edge.
 * So Shift+Tab makes the paragraph a `-` taken away left
 * one of the point outside, or one after the list, and Tab one of the point inside.
 * Out from right below text it puts an empty line above it too,
 * as Markdown would take text typed there on into the line above.
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
        const insert: string = prefix + (item === null ? "" : indentationOf(item));
        const air: string =
            !inward && !emptyIs(view.state, view.state.doc.line(line.number - 1)) ? airOf(view.state, line) : "";
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
 * Takes away one empty line above a heading with Backspace right before its text,
 * as Backspace does before any text: the heading moves up a line and stays a heading.
 * With text right above it it leaves the key to the next.
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
 * Backspace in a quote, down its stairs a step each as a point goes down its own:
 * right after the `>` of a new paragraph it takes the `>` away and leaves the quote,
 * each line of only `>` right above it an empty line, so the air stays.
 * Below one empty line after the quote the line becomes the next `> ` line of the quote,
 * not text Markdown would take into the quote without its `>`.
 * Right after the `>` of a line below text it joins the line to that text.
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
    if (marks === null || emptyIs(view.state, quote) || (/\S/.test(line.text) && block.name !== "Paragraph"))
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

/** Tells a line of a table, whose rows a line break would tear apart. */
function tableOf(state: EditorState, line: Line): SyntaxNode | null {
    return nodeAround(state, line.from, /^Table$/);
}

/**
 * Enter, Shift+Enter and Ctrl+Enter in a table, which its widget edits, see `./table.ts`:
 * at the end of its last row a new paragraph after it,
 * at the start of its first row an empty line above it,
 * anywhere else nothing, so no row is torn apart.
 *
 * @param lines - Line breaks it writes at the end: 2 for Enter, 3 for Ctrl+Enter
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
        if (breaks > 0)
            view.dispatch({
                changes: { from: at, insert: view.state.lineBreak.repeat(breaks) },
                selection: { anchor: at + view.state.lineBreak.length * breaks },
                scrollIntoView: true,
                userEvent: "input",
            });
        return true;
    };
}

/**
 * Backspace and Delete that would join a row of a table with a line of text, or two rows,
 * do nothing, so no row is torn apart.
 * An empty line above or below a table they take away, as in text.
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
 * Tab outside a list: a tab only in code, the lines picked one step in,
 * else nothing, as a tab in text would stand there as a stray blank or begin code.
 */
const tabWrite: Command = (view: EditorView): boolean => {
    const line: Line = view.state.doc.lineAt(view.state.selection.main.head);
    return !view.state.selection.main.empty || codeIs(view.state, line) ? insertTab(view) : true;
};

/** An empty point: its indentation and its `-` or number, a task with its box. */
const emptyPointRule: RegExp = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]+\[[ xX]\])?[ \t]*$/;

/**
 * Takes the `-` or number of a point below another point away with Backspace
 * right after it, a step down the stairs of a point,
 * its text staying at its depth, never a level out, the job of Shift+Tab.
 * The line keeps the air above it, see {@link markerTaken}.
 * The next Backspace takes each empty line above away, then the line break,
 * see {@link blankBackward}.
 * Any other `-` or number, like that of the first point of a list,
 * and the `>` of a quote it leaves to CodeMirror's Markdown.
 */
const markerBackward: Command = (view: EditorView): boolean => {
    const range: SelectionRange = view.state.selection.main;
    const line: Line = view.state.doc.lineAt(range.head);
    const taken: { from: number; to: number; insert: string } | null = range.empty
        ? markerTaken(view.state, line, range.head)
        : null;
    if (taken !== null) {
        listChange(view, {
            changes: taken,
            selection: { anchor: taken.from + taken.insert.length },
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
                effects: markEndIs(view.state, line, range.head) ? typingSet.of(null) : [],
                scrollIntoView: true,
                userEvent: transaction.annotation(Transaction.userEvent),
            }),
    });
};

/**
 * Gives the change that takes the `-` or number of a point below another point away,
 * by Backspace right after it or by Delete before its line,
 * so both write the same blanks and air:
 * after Enter the next line of the point above, in the blanks of the point's text,
 * as Shift+Enter writes it.
 * After Ctrl+Enter a paragraph of it with the air of a half line,
 * in the point's tabs and its `-` or number as spaces, the blanks Markdown wants
 * for a paragraph to stay in a sub-point,
 * where those of a further line put it a level out.
 * Right below a line of a sub-point of the point above one empty line and such
 * a paragraph, as Markdown would take the line on into that sub-point,
 * told by the points, not by the blanks,
 * since a further line stands in spaces and a point in tabs.
 *
 * @returns `null` for any other `-` or number, like that of the first point of a list
 */
function markerTaken(
    state: EditorState,
    line: Line,
    head: number,
): { from: number; to: number; insert: string } | null {
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
 * Takes away the markup of the next line with Delete at the end of a line,
 * as Backspace right after it does, the cursor staying where it is:
 * the `>` of a quote, the `-` or number of a point, see {@link markerTaken},
 * what CodeMirror's Markdown does not take, like a bare `>`, one character.
 * A next line of blanks it takes away whole,
 * a line without markup it joins to the line, as CodeMirror does,
 * and on an empty line it takes the line away, as Backspace does.
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
        listChange(view, {
            changes: changes,
            selection: { anchor: range.head },
            scrollIntoView: true,
            userEvent: "delete.forward",
        });
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
 * Writes the first text typed on an empty line right below another empty line
 * as a paragraph of its own, as Word does:
 * it writes the empty lines below the text it lacks, one before text or a list,
 * two before a heading, none at the end of the note.
 * On the air between two points, which `./preview.ts` draws
 * as the air of the point above, it writes the text with the blanks of that point's text,
 * so text typed stands where the cursor stood,
 * not on the left edge, which would end the list.
 * On a single empty line between two paragraphs it writes nothing more,
 * on the blanks of a point's text nothing at all, as the air stands there already.
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
        view.dispatch({
            changes: {
                from: from,
                insert: indentation + text + view.state.lineBreak.repeat(Math.max(wanted - below, 0)),
            },
            selection: { anchor: from + indentation.length + text.length },
            scrollIntoView: true,
            userEvent: "input.type",
        });
        return true;
    },
);

/** Gives a transaction and a change right after it, as a filter of transactions does. */
function withChange(transaction: Transaction, changes: ChangeSpec): readonly TransactionSpec[] {
    return [transaction, { changes: changes, sequential: true }];
}

/**
 * Keeps the air a key writes at the air of a line, two empty lines, the most there is:
 * more empty lines right above the line of the cursor go again,
 * so a key there writes nothing. Lines of code and air already in the note stay.
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
        return withChange(transaction, {
            from: top.from,
            to: state.doc.line(line.number - 2).from,
        });
    },
);

/**
 * Takes back the empty lines typing wrote below a paragraph of its own,
 * see {@link paragraphTyping},
 * when Backspace leaves its line empty below an empty line, its text gone,
 * not only the `-` of a point or the `>` of a quote,
 * so the air stands as before the typing, two empty lines, the cursor on the lower one.
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
        let next: Line | null = null;
        for (let number: number = now.number + 1; number <= doc.lines; number++) {
            next = doc.line(number);
            if (!/^[ \t]*$/.test(next.text)) break;
            next = null;
        }
        if (next === null || next.number === now.number + 1) return transaction;
        return withChange(transaction, { from: now.to, to: next.from - 1 });
    },
);

/**
 * Finds the point an empty line between two points of a list is the air of,
 * as `./preview.ts` draws it, see `itemLook` there:
 * the innermost point of the nearest line with text above it whose `li` reaches
 * on over the empty lines up to its next point.
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
 * Starts a new paragraph with Enter in plain text and in a heading,
 * as a word processor does: one empty line more wherever the cursor stands,
 * each empty line drawn as half a line, see `./preview.ts`,
 * so one is a small gap and two are the air of a line.
 * Within or at the end of a line a line break and an empty line,
 * where Markdown begins the next paragraph, with the rest of the line.
 * Before the text of a line the empty line above it.
 * On an empty line one more, up to the air of a line, in code as many as I press.
 * On a line of only blanks outside code, like the line of a point Backspace left,
 * one more above it, the cursor staying where its text will begin.
 * On a line of a list, a quote, a table, code or an HTML block,
 * or within a formula, it leaves the key to CodeMirror's own new line.
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
    return breakWrite(
        view,
        textStart,
        textStart ? airOf(view.state, line) : view.state.lineBreak + view.state.lineBreak,
    );
};

/**
 * Finds the list item a line stands in: the innermost item around the start of its text,
 * after the `>` of a quote, so a further line of a point or a sub-point is found too.
 */
function itemOf(state: EditorState, line: Line): SyntaxNode | null {
    return nodeAround(state, line.from + (/^(?:[ \t]*>[ \t]?)*[ \t]*/.exec(line.text)?.[0].length ?? 0), /^ListItem$/);
}

/**
 * Finds the list item the cursor stands in, or the lines picked.
 *
 * @returns `null` outside a list or when the lines picked reach beyond it
 */
function itemAt(state: EditorState): SyntaxNode | null {
    const item: SyntaxNode | null = itemOf(state, state.doc.lineAt(state.selection.main.from));
    return item !== null && state.selection.main.to <= state.doc.lineAt(item.to).to ? item : null;
}

/**
 * Finds the first and the last of the points of one list the cursor stands in,
 * or the lines picked lie on.
 *
 * @returns `null` outside a list or when the lines picked reach beyond that list
 */
function itemsAt(state: EditorState): [SyntaxNode, SyntaxNode] | null {
    const range: SelectionRange = state.selection.main;
    let end: Line = state.doc.lineAt(range.to);
    if (!range.empty && range.to === end.from && end.number > 1) end = state.doc.line(end.number - 1);
    const first: SyntaxNode | null = itemOf(state, state.doc.lineAt(range.from));
    let last: SyntaxNode | null = itemOf(state, end);
    while (first !== null && last !== null && last.parent?.from !== first.parent?.from)
        last = last.parent?.parent?.name === "ListItem" ? last.parent.parent : null;
    return first !== null && last !== null && last.from >= first.from ? [first, last] : null;
}

/**
 * Moves the lines of points of one list one step in or out, see {@link itemIndent},
 * written as my notes write a list:
 * the line of each of its points and each line of code one tab more or one tab less,
 * each further line in spaces under the text of its point, a line of blanks as it stands.
 * The `-` or number of each point moved becomes that of the list it joins.
 * Out they stand right after the point they stood in,
 * below the points after them in its list, which stay in it,
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

    const parent: SyntaxNode | null = !inward && item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
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
        selection: EditorSelection.create(
            state.selection.ranges.map((range: SelectionRange): SelectionRange =>
                EditorSelection.range(place(range.anchor), place(range.head)),
            ),
            state.selection.mainIndex,
        ),
        scrollIntoView: true,
        userEvent: "delete.dedent",
    });
}

/**
 * Moves a list item one step in, Tab,
 * or out, Shift+Tab, with its sub-points and further lines, as Obsidian does,
 * and so the points of one list picked together:
 * in only below an item of its own list, out only from a sub-point.
 * It takes the `-` or number of the list it joins,
 * where it starts a sub-list it keeps its own, a number counted from `1.` again.
 * Outside a list it leaves the key to the next.
 */
function itemIndent(inward: boolean): Command {
    return (view: EditorView): boolean => {
        const items: [SyntaxNode, SyntaxNode] | null = itemsAt(view.state);
        if (items === null) return false;
        const item: SyntaxNode = items[0];

        const parent: SyntaxNode | null = item.parent?.parent?.name === "ListItem" ? item.parent.parent : null;
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
 * Swaps two blocks of whole lines that stand right below each other,
 * the upper from line `top`, the lower from line `middle` to line `bottom`,
 * and moves the cursor along with the block it stands in,
 * never past the end of the text. Numbered points count in order again.
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
 * Tells how far a line stands in: its tabs and spaces after the `>` of a quote,
 * each counting one, as my notes indent a point by tabs and its further lines by spaces.
 *
 * @returns `null` for an empty line
 */
function depthOf(text: string): number | null {
    const body: string = text.slice(quotePrefixOf(text).length);
    const blanks: number = /^[ \t]*/.exec(body)?.[0].length ?? 0;
    return blanks === body.length ? null : blanks;
}

/**
 * Tells the line of a point: its `-` or number first,
 * never a line of code, like a list in a block of YAML.
 */
function pointIs(state: EditorState, number: number): boolean {
    const line: Line = state.doc.line(number);
    const body: string = line.text.slice(quotePrefixOf(line.text).length);
    return /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/.test(body) && !codeIs(state, line);
}

/**
 * Finds the last line of a point with its sub-points and further lines:
 * the lines right below it that stand further in,
 * with the empty lines between them, not those after them.
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
 * Finds the last line of the text of a point, without its sub-points:
 * the lines right below it that stand further in and start no point.
 */
function textLastOf(state: EditorState, number: number): number {
    const depth: number = depthOf(state.doc.line(number).text) ?? 0;
    let last: number = number;
    while (last < state.doc.lines && (depthOf(state.doc.line(last + 1).text) ?? 0) > depth && !pointIs(state, last + 1))
        last++;
    return last;
}

/**
 * Gives the first and last line a key moves or takes away:
 * the line of the cursor or the lines picked,
 * not the line where what is picked ends at its start,
 * each point with its sub-points and further lines.
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
 * Moves the line of the cursor or the lines picked one line up or down,
 * as VS Code does, past an empty line too.
 * A point counts as one line with its sub-points and further lines:
 * it moves with them, and it goes past a point of its level with that point's own.
 * A further line moves alone, like a line of code,
 * so I put the lines of a point in order.
 * The first point of a sub-list goes up past the text of the point it stands in,
 * the last one down past the text of a point of a lower level,
 * keeping its level in the point it then stands in,
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
 * Takes away the line of the cursor or the lines picked, Ctrl+D,
 * a point with its sub-points and further lines,
 * so none of its lines stays behind for the point above to take.
 * The cursor goes where the text of the line below begins.
 *
 * @returns Whether it took the key, not in a file to read only
 */
const linesDelete: Command = (view: EditorView): boolean => {
    const doc: Text = view.state.doc;
    if (view.state.readOnly) return false;

    const { first, last }: { first: number; last: number } = linesOf(view.state);
    const below: Line | null = last < doc.lines ? doc.line(last + 1) : null;
    const from: number = below === null && first > 1 ? doc.line(first).from - 1 : doc.line(first).from;
    const to: number = below === null ? doc.line(last).to : below.from;
    listChange(view, {
        changes: { from: from, to: to },
        selection: {
            anchor:
                from +
                (below === null
                    ? 0
                    : (/^(?:[ \t]*>[ \t]?)*[ \t]*(?:(?:[-*+]|\d+[.)])(?:[ \t]|$))?/.exec(below.text)?.[0].length ?? 0)),
        },
        scrollIntoView: true,
        userEvent: "delete.line",
    });
    return true;
};

/**
 * Counts the markup characters right before or after a place, up to three,
 * as `***` is bold and italic.
 */
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
 * Makes text bold, Ctrl+B with `**`, or italic, Ctrl+I with `*`, as Obsidian does:
 * the text picked, else the word at the cursor, gets the markup around it,
 * or loses it when it is already bold or italic, so the same key takes it back.
 * In empty space it writes the markup twice with the cursor between, to type into.
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
            return {
                range: EditorSelection.range(range.anchor + shift, range.head + shift),
                changes: marked
                    ? [
                          { from: word.from - mark.length, to: word.from },
                          { from: word.to, to: word.to + mark.length },
                      ]
                    : [
                          { from: word.from, insert: mark },
                          { from: word.to, insert: mark },
                      ],
            };
        };
        view.dispatch(state.changeByRange(toggled), {
            scrollIntoView: true,
            userEvent: "input",
        });
        return true;
    };
}

/**
 * Finds the link or formula around the cursor, also at its ends:
 * a piece of syntax that shows as its text where the cursor stands,
 * see `./preview.ts`, on more rows than drawn when long, see {@link lineMove}.
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
 * Moves the cursor a line up or down, or picks up to there with Shift,
 * by CodeMirror's own command, but in one step past what held it on its line:
 * the end of a folded heading or point,
 * where CodeMirror's step down ends first, on the same line,
 * so a first Arrow Down seemed to do nothing.
 * And the rows of the link or formula the cursor stands on, shown as its text there,
 * on more rows than drawn, so a step stopped on its next row instead of the next line.
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
 * Moves the cursor to the end of its line, End, or picks up to there, Shift+End,
 * by CodeMirror's own command, but past the hidden `]]` of a link that ends the line:
 * CodeMirror's step ends where the drawn line ends, before that hidden end,
 * so the cursor stood in the link,
 * and Shift+End with Backspace left the `]]` behind.
 * Not in a link the cursor already stood on, which shows as its text.
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
                selection: {
                    anchor: range.empty ? line.to : range.anchor,
                    head: line.to,
                },
                userEvent: "select",
            });
        return true;
    };
}

/**
 * Marks the line of the cursor as the line a key just put it on to write,
 * see {@link typingLine}, where the key took text away.
 */
const typingSet: StateEffectType<null> = StateEffect.define<null>();

/**
 * The empty line a key just put the cursor on to write,
 * drawn as high as a line of text, not as the half line of an empty line,
 * see `spaceLook` in `./preview.ts`,
 * so the cursor stands where text typed on it will stand,
 * not in the air between paragraphs.
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
 * Takes the blanks of a line of only blanks away when the cursor alone moves off it:
 * only the line of the cursor holds the blanks where its text will begin,
 * every other empty line of the note stays empty. A line of code keeps its blanks.
 * Where the empty line it leaves stands among more than two, like the line Enter wrote
 * above the air below a paragraph, the extra lines go, down to two, the air of a line.
 * After the moves of the cursor, see `caretPlace` in `./preview.ts`.
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
            return withChange(
                transaction,
                last.number < state.doc.lines
                    ? { from: first.from, to: last.to + 1 }
                    : { from: first.from - 1, to: last.to },
            );
        }
        if (line.text === line.text.trimEnd()) return transaction;
        return withChange(transaction, {
            from: line.from + line.text.trimEnd().length,
            to: line.to,
        });
    }),
);

/**
 * Undo or Redo only within the block of the cursor, a definition, an example or a task:
 * from its heading `##` to the line before the next one, the whole note without one,
 * so it never changes another part of the note, which a round hides.
 * In the round of a section it is the block shown, see `selectionKeep` in `./round.ts`.
 * Else the key goes on to the next command,
 * like going back to the block I had open before, see `roundBack` in `./round.ts`,
 * and never to the browser's own Undo.
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
        command({
            state: state,
            dispatch: (transaction: Transaction): void => {
                steps.push(transaction);
            },
        });
        let inside: boolean = steps.length > 0;
        steps[0]?.changes.iterChangedRanges((from: number, to: number): void => {
            inside &&= from >= state.doc.line(first).from && to <= state.doc.line(last).to;
        });
        if (inside) view.dispatch(steps[0]);
        return inside;
    };
}

/**
 * Undo and Redo of the browser itself, like from the menu of a right click,
 * only within the block of the cursor too, before CodeMirror's history takes them.
 */
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

/**
 * Keys of a Markdown file, see the top of this file, in the order they are tried,
 * then the key goes on to CodeMirror's own command.
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
            { key: "Mod-d", run: linesDelete },
            { key: "Mod-z", run: historyIn(undo), preventDefault: true },
            { key: "Mod-Shift-z", run: historyIn(redo), preventDefault: true },
            { key: "Mod-y", run: (): boolean => true, preventDefault: true },
            {
                key: "ArrowUp",
                run: lineMove(cursorLineUp),
                shift: lineMove(selectLineUp),
            },
            {
                key: "ArrowDown",
                run: lineMove(cursorLineDown),
                shift: lineMove(selectLineDown),
            },
            {
                key: "End",
                run: lineEnd(cursorLineBoundaryForward),
                shift: lineEnd(selectLineBoundaryForward),
            },
        ]),
    ),
];
