/**
 * ## Editor
 *
 * Edits a note of my modules or a Markdown file of my new system as its text,
 * shown as in Obsidian's live preview, see `./preview.ts`.
 * Saving writes exactly the edited text, tabs, soft hyphens, spaces and line breaks as they were.
 * A note of my modules keeps each change as a diff in the reader, a file of my new system none.
 * An `.ics` file opens as its plain text, to read only.
 * A section shows its round, see `./round.ts`.
 * The address names the note, the heading or the row, so a reload stays on it.
 * A section opens on the block I opened last, kept by the reader, also for another device.
 * Saves only with its button or Ctrl+S, merged with a change of the file on the disk since,
 * and asks before leaving with changes unsaved.
 */

import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, RectangleMarker, drawSelection, keymap, layer } from "@codemirror/view";
import { defaultKeymap, history, indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { icsLook } from "./ics.ts";
import { markdownKeys } from "./keys.ts";
import { markdownSupport } from "./syntax.ts";
import { headingShow, linksSet, livePreview, rowShow, solutionsFold } from "./preview.ts";
import { solutionSteps } from "./steps.ts";
import { taskRows, tasksLoad } from "./tasks.ts";
import {
    roundBack,
    roundBlocksOf,
    roundClose,
    roundGo,
    roundHeadingShow,
    roundNextOf,
    roundOpenedOf,
    roundShownOf,
    roundStart,
} from "./round.ts";
import { outlineShow, treeShow } from "../notes/tree.ts";
import { codeColorsSet } from "../notes/code.ts";
import { overviewShow, overviewTreeShow } from "./overview.ts";
import { folderShow } from "./folder.ts";
import { ArrowRight, CircleCheck, Save, SaveOff } from "lucide";
import { iconPut } from "../icons.ts";
import "../notes/notes.css";
import "../day/day.css";
import "./editor.css";

import type { Extension, SelectionRange } from "@codemirror/state";
import type { Rect, ViewUpdate } from "@codemirror/view";
import type { Links } from "./preview.ts";
import type { BlockMark } from "../notes/tree.ts";

/** A note with the files its links lead to, as the reader sends it. */
type LinkedNote = {
    path: string;
    text: string;
    links: Links;
};

/** A file of my new system, as the reader sends it, editable when Markdown. */
type SystemFile = {
    path: string;
    text: string;
    editable: boolean;
};

/** A file as the reader wrote it. */
type Written = {
    text: string;
    changes: { from: number; to: number; insert: string }[];
};

/**
 * The file the editor shows.
 * - `links`: None for a file of my new system, whose links stay as written.
 * - `place`: Its path in `NomWorkspace`, from which its relative links lead.
 */
type Opened = {
    text: string;
    links: Links;
    markdown: boolean;
    editable: boolean;
    place: string;
};

/** Path of the note or the file of my new system. */
let path: string = "";

/** Address of the reader that writes the file, the one for a note keeps a diff. */
let saveAddress: string = "/api/edit/note";

/** Text of the file as it lies on the disk. */
let saved: string = "";

let saving: boolean = false;

let view: EditorView;

/** Whether the editor shows a file, its save started with the first. */
let started: boolean = false;

/** The tree of my modules for the outline of a note, `null` for my new system. */
let outlineTree: HTMLElement | null = null;

/** Waiting rebuild of the outline, so typing builds it once half a second after it rests. */
let outlineWait: number = 0;

/** Shows unsaved changes by the grey of the save button, and a notice in the status line. */
function stateShow(notice: string): void {
    const unsaved: boolean = view.state.sliceDoc() !== saved;
    const save: HTMLElement = document.getElementById("editor-save") as HTMLElement;
    save.classList.toggle("unsaved", unsaved);
    (document.getElementById("editor-state") as HTMLElement).textContent = notice;
}

/**
 * Saves the file, merged by the reader with a change on the disk since, mine winning on the same lines.
 * The editor takes that change in, never into Undo, only while I typed nothing meanwhile.
 * Else the next save merges it again.
 * A note takes its links anew, so a link written since works.
 */
async function noteSave(): Promise<void> {
    const text: string = view.state.sliceDoc();
    if (saving || text === saved || view.state.readOnly) return;

    saving = true;
    try {
        const response: Response = await fetch(saveAddress, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: path, base: saved, text: text }),
        });
        if (!response.ok) throw new Error(`The reader did not write ${path}`);
        const written: Written = (await response.json()) as Written;
        const merged: boolean = written.text !== text;
        if (merged && view.state.sliceDoc() === text)
            view.dispatch({
                changes: written.changes,
                filter: false,
                annotations: Transaction.addToHistory.of(false),
            });
        saved = view.state.sliceDoc() === written.text ? written.text : text;
        stateShow("Saved");
        const reread: Opened | null = saveAddress === "/api/edit/note" ? await openedRead("") : null;
        if (reread !== null) linksSet(view, reread.links);
    } catch (error: unknown) {
        console.error(error);
        stateShow("Failed");
    } finally {
        saving = false;
    }
}

/**
 * Saves on Ctrl+S or Cmd+S, also with the cursor outside the text, instead of the browser.
 * Ctrl+Z outside the text goes back to the block I had open before.
 * Never in a field, which undoes its own text.
 */
function keyDown(event: KeyboardEvent): void {
    const command: boolean = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        noteSave();
    } else if (
        command &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z" &&
        !event.defaultPrevented &&
        (event.target as Element).closest("input, textarea") === null &&
        roundBack(view)
    )
        event.preventDefault();
}

/** Builds the outline of a note in the tree anew, for a section its blocks in its round. */
function outlineRefresh(): void {
    const blocks: [string, BlockMark][] | null = roundBlocksOf(view);
    if (outlineTree !== null)
        outlineShow(outlineTree, path, view.state.sliceDoc(), blocks, roundShownOf(view), roundNextOf());
}

/** A piece of the screen, in pixels of the window. */
type Box = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

/** A row on the screen without a width yet. */
function rowOf(top: number, bottom: number): Box {
    return { left: Infinity, right: -Infinity, top: top, bottom: bottom };
}

/**
 * The rows a line wraps into on the screen, parted halfway between their text.
 * They take the line's own small room above and below, so the rows of a selection touch.
 * Never more than a quarter of a line, like the room above a heading.
 */
function rowsOf(view: EditorView, line: HTMLElement): Box[] {
    const range: Range = document.createRange();
    range.selectNodeContents(line);
    const texts: Box[] = [];
    for (const rect of [...range.getClientRects()].sort((a: DOMRect, b: DOMRect): number => a.top - b.top)) {
        const row: Box | undefined = texts.at(-1);
        if (row !== undefined && (rect.top + rect.bottom) / 2 < row.bottom)
            row.bottom = Math.max(row.bottom, rect.bottom);
        else if (rect.height > 0) texts.push(rowOf(rect.top, rect.bottom));
    }
    const style: CSSStyleDeclaration = getComputedStyle(line);
    const box: DOMRect = line.getBoundingClientRect();
    const air: number = view.defaultLineHeight / 4;
    const above: number = parseFloat(style.paddingTop);
    const below: number = parseFloat(style.paddingBottom);
    const top: number = box.top + (above > air ? above : 0);
    const bottom: number = box.bottom - (below > air ? below : 0);
    if (texts.length === 0) return [rowOf(top, bottom)];
    return texts.map((row: Box, index: number): Box =>
        rowOf(
            index === 0 ? top : (texts[index - 1].bottom + row.top) / 2,
            index === texts.length - 1 ? bottom : (row.bottom + texts[index + 1].top) / 2,
        ),
    );
}

/**
 * The boxes of what a selection covers of a line.
 * A widget it touches counts whole by its own box, since a wide formula scrolls inside it.
 * Never a widget without text, like the fold arrow.
 */
function selectedBoxesOf(view: EditorView, line: HTMLElement, from: number, to: number): Box[] {
    const boxes: Box[] = [];
    const range: Range = document.createRange();
    line.childNodes.forEach((child: ChildNode, index: number): void => {
        const start: number = view.posAtDOM(line, index);
        const end: number = view.posAtDOM(line, index + 1);
        if (start === end || end <= from || start >= to) return;
        if (child instanceof HTMLElement && (child.contentEditable === "false" || (start >= from && end <= to))) {
            boxes.push(...child.getClientRects());
            return;
        }
        const first: { node: Node; offset: number } = view.domAtPos(Math.max(from, start), 1);
        const last: { node: Node; offset: number } = view.domAtPos(Math.min(to, end), -1);
        range.setStart(first.node, first.offset);
        range.setEnd(last.node, last.offset);
        boxes.push(...range.getClientRects());
    });
    return boxes.filter((box: Box): boolean => box.right > box.left);
}

/** Widens each row over the boxes whose middle stands in it. */
function markedRowsOf(rows: Box[], boxes: Box[]): Box[] {
    for (const box of boxes) {
        const middle: number = (box.top + box.bottom) / 2;
        const row: Box = rows.find((candidate: Box): boolean => middle < candidate.bottom) ?? rows[rows.length - 1];
        row.left = Math.min(row.left, box.left);
        row.right = Math.max(row.right, box.right);
    }
    return rows.filter((row: Box): boolean => row.right > row.left);
}

/**
 * Marks each selection line by line as a browser and Obsidian do, not as one CodeMirror block.
 * Half a letter past the end of a line it goes on over, so an empty line shows a small mark.
 * A rendered block counts whole once the selection covers some of it.
 */
function selectionRowsOf(view: EditorView): RectangleMarker[] {
    const ranges: SelectionRange[] = view.state.selection.ranges.filter(
        (range: SelectionRange): boolean => !range.empty,
    );
    const scroller: DOMRect = view.scrollDOM.getBoundingClientRect();
    const left: number = scroller.left - view.scrollDOM.scrollLeft;
    const top: number = scroller.top - view.scrollDOM.scrollTop;
    const rows: Box[] = [];
    if (ranges.length > 0)
        for (const element of view.contentDOM.querySelectorAll<HTMLElement>(
            ".cm-line, " + "[contenteditable=false]:not(.cm-line *, [contenteditable=false] *)",
        )) {
            const line: boolean = element.classList.contains("cm-line");
            const from: number = view.posAtDOM(element, 0);
            const to: number = line ? view.posAtDOM(element, element.childNodes.length) : view.lineBlockAt(from).to;
            for (const range of ranges) {
                if (range.from > to || range.to <= from) continue;
                if (!line) {
                    const box: DOMRect = element.getBoundingClientRect();
                    const parts: DOMRect[] = [...element.children].map((child: Element): DOMRect =>
                        child.getBoundingClientRect(),
                    );
                    rows.push(...markedRowsOf([rowOf(box.top, box.bottom)], parts));
                    continue;
                }
                const boxes: Box[] = selectedBoxesOf(view, element, Math.max(range.from, from), Math.min(range.to, to));
                const end: Rect | null = range.to > to ? view.coordsAtPos(to, -1) : null;
                if (end !== null)
                    boxes.push({
                        left: end.right,
                        right: end.right + view.defaultCharacterWidth / 2,
                        top: end.top,
                        bottom: end.bottom,
                    });
                rows.push(...markedRowsOf(rowsOf(view, element), boxes));
            }
        }
    return rows.map(
        (row: Box): RectangleMarker =>
            new RectangleMarker(
                "cm-selectionBackground",
                row.left - left,
                row.top - top,
                row.right - row.left,
                row.bottom - row.top,
            ),
    );
}

/**
 * Selection marked line by line in place of CodeMirror's own.
 * `drawSelection` still draws the cursor and hides the browser's selection.
 */
const selectionLines: Extension = layer({
    above: true,
    class: "cm-selection-lines",
    update: (update: ViewUpdate): boolean => update.docChanged || update.selectionSet || update.viewportChanged,
    markers: selectionRowsOf,
});

/**
 * The extensions of the editor for a file.
 * - `lineSeparator`: The line break of the file, so saving writes them as they were.
 * - `scrollMargins`: Keeps the cursor below the status line, which stays on top.
 */
function extensionsOf(opened: Opened): Extension[] {
    return [
        EditorState.lineSeparator.of(opened.text.includes("\r\n") ? "\r\n" : "\n"),
        EditorState.readOnly.of(!opened.editable),
        ...(opened.markdown ? [markdownSupport, markdownKeys] : []),
        indentUnit.of("\t"),
        history(),
        drawSelection(),
        selectionLines,
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.darkTheme.of(true),
        EditorView.scrollMargins.of((): Partial<Rect> => ({
            top: (document.getElementById("editor-status") as HTMLElement).offsetHeight,
        })),
        ...(opened.markdown
            ? [livePreview(opened.links, opened.place), solutionSteps, taskRows, roundStart(outlineRefresh)]
            : []),
        ...(/\.ics$/i.test(path) ? [icsLook()] : []),
        EditorView.updateListener.of((update: ViewUpdate): void => {
            if (!update.docChanged) return;
            stateShow("");
            clearTimeout(outlineWait);
            outlineWait = window.setTimeout(outlineRefresh, 500);
        }),
    ];
}

/** A file of my new system as the editor shows it. */
function systemOpenedOf(sent: SystemFile): Opened {
    return {
        text: sent.text,
        links: {},
        markdown: /\.md$/i.test(sent.path),
        editable: sent.editable,
        place: `NomManageplannings/${sent.path}`,
    };
}

/** Reads the file the address names, `null` when the reader cannot read it. */
async function openedRead(file: string): Promise<Opened | null> {
    if (file !== "") {
        const response: Response = await fetch(`/api/edit/file?path=${encodeURIComponent(file)}`);
        if (!response.ok) return null;
        return systemOpenedOf((await response.json()) as SystemFile);
    }

    const response: Response = await fetch(`/api/notes/note?path=${encodeURIComponent(path)}`);
    if (!response.ok) return null;
    const note: LinkedNote = (await response.json()) as LinkedNote;
    const markdown: boolean = /\.md$/i.test(note.path);
    return {
        text: note.text,
        links: note.links,
        markdown: markdown,
        editable: markdown,
        place: `NomSkillingmodules/${note.path}`,
    };
}

/** Scrolls to the heading of the address, or to the top. */
function addressHeadingShow(): void {
    const heading: string = decodeURIComponent(location.hash.slice(1));
    if (heading === "") (document.querySelector(".editor-file") as HTMLElement).scrollTop = 0;
    else headingShow(view, heading);
}

/**
 * Scrolls to a heading of the note shown on a click in the tree, without a reload.
 * A block of a section stays out of the address, since the reader keeps it.
 */
function treeClick(event: MouseEvent): void {
    const link: HTMLAnchorElement | null = (event.target as Element).closest("a[href]");
    if (link === null || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const address: URL = new URL(link.href);
    if (address.pathname !== "/scripts" || address.searchParams.get("path") !== path) return;
    event.preventDefault();
    if (roundHeadingShow(view, decodeURIComponent(address.hash.slice(1)))) return;
    window.history.pushState(null, "", address);
    addressHeadingShow();
}

/**
 * Shows a file in the place of the one before.
 * The first one starts its save by the button or Ctrl+S.
 * It also asks before I leave a change unsaved.
 */
function fileShow(opened: Opened): void {
    const text: HTMLElement = document.getElementById("editor-text") as HTMLElement;
    const save: HTMLButtonElement = document.getElementById("editor-save") as HTMLButtonElement;
    const state: EditorState = EditorState.create({ doc: opened.text, extensions: extensionsOf(opened) });
    text.classList.toggle("markdown", opened.markdown);
    text.classList.toggle("editor-plain", !opened.markdown);
    saved = opened.text;
    if (started) view.setState(state);
    else {
        view = new EditorView({ parent: text, state: state });
        save.addEventListener("click", noteSave);
        window.addEventListener("keydown", keyDown);
        window.addEventListener("beforeunload", (event: BeforeUnloadEvent): void => {
            if (view.state.sliceDoc() !== saved) event.preventDefault();
        });
        started = true;
    }
    if (opened.markdown) solutionsFold(view);
    iconPut(save, view.state.readOnly ? SaveOff : Save, view.state.readOnly ? "Read only" : "Save");
    save.disabled = view.state.readOnly;
    stateShow("");
}

/**
 * Shows a file of my new system read by a route of its own, saved by `address`.
 * The file shown already with the same text stays as it is, so nothing jumps.
 */
export function systemFileShow(sent: SystemFile, address: string): void {
    if (started && sent.path === path && sent.text === saved) return;
    path = sent.path;
    saveAddress = address;
    fileShow(systemOpenedOf(sent));
}

/** Saves the file shown, telling whether nothing of it stays unsaved. */
export async function fileSaved(): Promise<boolean> {
    if (!started) return true;
    await noteSave();
    return view.state.sliceDoc() === saved;
}

/** Whether I write in the file shown: the cursor in it or a change unsaved. */
export function fileWriting(): boolean {
    return started && (view.hasFocus || view.state.sliceDoc() !== saved);
}

/**
 * Starts the editor, the tree on the left and the module, chapter, folder or file the address names.
 * A section stays hidden until its tasks are loaded, so its blocks fold before they show.
 * It opens on the heading of the address once, then the heading leaves the address.
 * Else it opens on the block I opened last.
 */
export async function editorStart(): Promise<void> {
    void codeColorsSet();
    const address: URLSearchParams = new URLSearchParams(location.search);
    const file: string = address.get("file") ?? "";
    const folder: string = address.get("folder") ?? "";
    const save: HTMLElement = document.getElementById("editor-save") as HTMLElement;
    const plannings: boolean = file !== "" || location.pathname.startsWith("/plannings");
    const alone: string = decodeURIComponent(location.pathname).split("/")[2] ?? "";
    const tree: HTMLElement = document.getElementById("notes-tree") as HTMLElement;
    path = file !== "" ? file : (address.get("path") ?? "");
    saveAddress = file !== "" ? "/api/edit/file" : "/api/edit/note";
    const shown: Promise<void> = treeShow(
        tree,
        !plannings ? "NomSkillingmodules" : alone === "" ? "NomManageplannings" : `NomManageplannings/${alone}`,
        plannings && path === "" ? folder : path,
        address.get("module") ?? folder.split("/")[0],
    );
    shown.catch((error: unknown): void => console.error(error));
    const close: HTMLButtonElement = document.getElementById("editor-close") as HTMLButtonElement;
    const next: HTMLButtonElement = document.getElementById("editor-next") as HTMLButtonElement;
    iconPut(close, CircleCheck, "Close the round");
    close.addEventListener("click", roundClose);
    iconPut(next, ArrowRight, "Next");
    next.addEventListener("click", (): void => roundGo(view));
    if (path === "" && !plannings && folder !== "") {
        save.hidden = true;
        (document.getElementById("editor") as HTMLElement).classList.add("editor-on-overview");
        await folderShow(document.getElementById("editor-folder") as HTMLElement, folder);
        return;
    }
    if (path === "" && !plannings && address.has("module")) {
        const module: string = address.get("module") ?? "";
        const chapter: string = address.get("chapter") ?? "";
        save.hidden = true;
        (document.getElementById("editor") as HTMLElement).classList.add("editor-on-overview");
        shown
            .then((): void => overviewTreeShow(tree, module, chapter))
            .catch((error: unknown): void => console.error(error));
        await overviewShow(document.getElementById("editor-overview") as HTMLElement, module, chapter);
        return;
    }
    const opened: Opened | null = path === "" ? null : await openedRead(file);
    if (opened === null) {
        save.hidden = true;
        (document.getElementById("editor-state") as HTMLElement).textContent =
            path === "" ? `Choose a ${plannings ? "file" : "module"} on the left` : "This file cannot be read";
        return;
    }

    fileShow(opened);
    if (opened.markdown && address.has("row")) rowShow(view, address.get("row") ?? "");
    if (plannings || !opened.markdown) return;

    const text: HTMLElement = document.getElementById("editor-text") as HTMLElement;
    text.style.visibility = "hidden";
    const kept: Promise<string> = roundOpenedOf(path).catch((): string => "");
    tasksLoad(view, path)
        .catch((error: unknown): void => console.error(error))
        .then(async (): Promise<void> => {
            const sectionShown: boolean = roundBlocksOf(view) !== null;
            const heading: string = sectionShown && location.hash === "" ? await kept : "";
            text.style.visibility = "";
            if (!sectionShown) addressHeadingShow();
            else if (location.hash !== "") {
                roundHeadingShow(view, decodeURIComponent(location.hash.slice(1)), false);
                window.history.replaceState(null, "", location.pathname + location.search);
            } else if (heading !== "") roundHeadingShow(view, heading, false);
        })
        .catch((error: unknown): void => console.error(error));
    shown
        .then((): void => {
            outlineTree = tree;
            outlineRefresh();
        })
        .catch((error: unknown): void => console.error(error));
    tree.addEventListener("click", treeClick);
    window.addEventListener("popstate", addressHeadingShow);
}
