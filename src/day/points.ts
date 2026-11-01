/**
 * ## Points
 *
 * A list of points for a section of the daily note, one `- ` line per point.
 * A small editor the same as that of my files, so a point is written here exactly as there.
 * A list without points shows one empty point, so there is always a bullet to write at.
 * A click beside the points goes to the end of the last.
 */

import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { markdownSupport } from "../editor/syntax.ts";
import { markdownKeys } from "../editor/keys.ts";
import { livePreview } from "../editor/preview.ts";
import "../notes/notes.css";
import "../editor/editor.css";

import type { Extension, Transaction } from "@codemirror/state";

const emptyText: string = "- ";

/** Extensions of a Markdown file, without links to follow. */
const extensions: Extension[] = [
    markdownSupport,
    markdownKeys,
    indentUnit.of("\t"),
    history(),
    drawSelection(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorView.lineWrapping,
    EditorView.darkTheme.of(true),
    livePreview({}, ""),
];

function viewOf(list: HTMLElement): EditorView {
    return EditorView.findFromDOM(list.firstElementChild as HTMLElement) as EditorView;
}

/** Shows the text of a section with an undo history of its own, so undo never brings back the day before. */
export function pointsShow(list: HTMLElement, text: string): void {
    viewOf(list).setState(
        EditorState.create({
            doc: text === "" ? emptyText : text,
            extensions: extensions,
        }),
    );
}

export function pointsRead(list: HTMLElement): string {
    return viewOf(list).state.sliceDoc();
}

/** Makes a list a list of points, `changed` hears only my changes, since a text shown takes no transaction. */
export function pointsStart(list: HTMLElement, changed: () => void, left: () => void): void {
    const view: EditorView = new EditorView({
        parent: list,
        state: EditorState.create({ doc: emptyText, extensions: extensions }),
        dispatchTransactions: (transactions: readonly Transaction[], editor: EditorView): void => {
            editor.update(transactions);
            if (transactions.some((transaction: Transaction): boolean => transaction.docChanged)) changed();
        },
    });
    list.addEventListener("focusout", (event: FocusEvent): void => {
        if (!(event.relatedTarget instanceof Node && list.contains(event.relatedTarget))) left();
    });
    list.addEventListener("mousedown", (event: MouseEvent): void => {
        if (event.target instanceof Node && view.dom.contains(event.target)) return;
        event.preventDefault();
        view.focus();
        view.dispatch({ selection: { anchor: view.state.doc.length } });
    });
}
