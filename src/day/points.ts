/**
 * ## Points
 *
 * A list of points for the sections of the daily note,
 * my gratitude and my points about the day:
 * a small editor of its own per section,
 * the same as that of my files, see `../editor/editor.ts`,
 * so a point is written here exactly as there.
 * Its text is the Markdown of the section, one `- ` line per point,
 * shown as live preview, see `../editor/preview.ts`,
 * with the keys of `../editor/keys.ts`.
 * A list without points shows one empty point, `- `,
 * so there is always a bullet to write at;
 * a click beside the points goes to the end of the last.
 * The reader writes the text into the note as it is, see `reader/note.ts`.
 *
 * - `../notes/notes.css`, `../editor/editor.css`: Look of the editor,
 *   as the class `editor-text markdown` of a list takes it, see `day.html`.
 */

import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { markdownSupport } from "../editor/syntax.ts";
import { markdownKeys } from "../editor/keys.ts";
import { livePreview } from "../editor/preview.ts";
import "../notes/notes.css";
import "../editor/editor.css";

import type { Extension, Transaction } from "@codemirror/state";

/** Text of a list without points: one empty point. */
const emptyText: string = "- ";

/**
 * Extensions of the editor of a list,
 * those of a Markdown file in `../editor/editor.ts`, without links to follow.
 */
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

/** Gives the editor of a list. */
function viewOf(list: HTMLElement): EditorView {
    return EditorView.findFromDOM(list.firstElementChild as HTMLElement) as EditorView;
}

/**
 * Shows the text of a section as points, one empty point for none,
 * with an undo history of its own,
 * so undo never brings back the text of the day shown before.
 */
export function pointsShow(list: HTMLElement, text: string): void {
    viewOf(list).setState(
        EditorState.create({
            doc: text === "" ? emptyText : text,
            extensions: extensions,
        }),
    );
}

/** Reads the points of a list as the text of a section. */
export function pointsRead(list: HTMLElement): string {
    return viewOf(list).state.sliceDoc();
}

/**
 * Makes a list a list of points, without points at first, see {@link pointsShow}.
 * `changed` hears each change of the text I make, never a text shown,
 * which takes no transaction, `left` hears that the focus left the list.
 */
export function pointsStart(
    list: HTMLElement,
    changed: () => void,
    left: () => void,
): void {
    const view: EditorView = new EditorView({
        parent: list,
        state: EditorState.create({ doc: emptyText, extensions: extensions }),
        dispatchTransactions: (
            transactions: readonly Transaction[],
            editor: EditorView,
        ): void => {
            editor.update(transactions);
            if (
                transactions.some(
                    (transaction: Transaction): boolean => transaction.docChanged,
                )
            )
                changed();
        },
    });
    list.addEventListener("focusout", (event: FocusEvent): void => {
        if (!(event.relatedTarget instanceof Node && list.contains(event.relatedTarget)))
            left();
    });
    list.addEventListener("mousedown", (event: MouseEvent): void => {
        if (event.target instanceof Node && view.dom.contains(event.target)) return;
        event.preventDefault();
        view.focus();
        view.dispatch({ selection: { anchor: view.state.doc.length } });
    });
}
