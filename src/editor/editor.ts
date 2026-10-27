/**
 * ## Editor
 *
 * Edits a note of my modules or a Markdown file of my new system as its text,
 * its Markdown shown as in Obsidian's live preview away from the cursor, see `./preview.ts`.
 * The scripts view, `/scripts`, is this editor, always writing,
 * with no view beside it to read only.
 * It edits the text of the file itself: saving writes exactly the edited text, nothing reformatted,
 * tabs and soft hyphens,
 * spaces at the ends of lines and the line breaks of the file as they were.
 * A note of my modules is saved right into its file in `NomSkillingmodules`,
 * and the reader keeps each change as a diff, so the AI learns my style from my corrections.
 * On the left the tree of one root, see `../notes/tree.ts`:
 * `NomSkillingmodules` at `/scripts`, the outline of the note under it, built anew as I write,
 * whose headings scroll the note to them without loading the page again;
 * `NomManageplannings` for a file of my new system and at `/plannings`,
 * where a click on any Markdown file of it but my old system,
 * like `Foods.md`, a daily note or a study, opens it here to edit,
 * saved back into its file without a diff;
 * an `.ics` file opens as its plain text, to read only,
 * each block of it drawn one step in and its entries apart, its names grey,
 * its values readable and each block folding, see `./ics.ts`;
 * any other file shows in the tree, faint, and opens not.
 * A note of my modules shows the rows of its tasks under their headings, see `./tasks.ts`.
 * A section, a note with tasks of the semester, shows its round in the same view:
 * its name in words, its round below it, like `Round 1`, then only the block due,
 * `Next` and the close of the round in the head beside the save button,
 * and in the tree, in place of the outline, its blocks with their places,
 * a click opening one, see `./round.ts`.
 * While no note is open, the page asks to choose one, since the plan of the day says what is due;
 * for the address of a module or of one of its chapters,
 * which a click on its name in the tree opens, like
 * `/scripts?module=IN2028_BusinessAnalyticsMachineLearning&chapter=01_RegressionAnalysis`,
 * it shows the page of the module, its course of the university, see `./course.ts`,
 * or that of the chapter, where each of its sections stands,
 * see `./overview.ts`, the chapter picked in the tree;
 * for the address of a folder of my modules,
 * which the folder of the material of a card of the course opens, like
 * `/scripts?folder=IN2028_BusinessAnalyticsMachineLearning%2FVO_UniversityLectureLessons%2FTUM_2026W`, it shows
 * its folders and files, see `./folder.ts`, its module picked in the tree.
 * A file of my modules that is no Markdown,
 * like an `.ics` file a folder opens, shows as its plain text, to read only,
 * as an `.ics` file of my new system.
 * The address names a note by its path in the scripts view and the heading to scroll to, like
 * `/scripts?path=IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_SampleMeanEstimator.md#…`,
 * so a reload and the back button of the browser stay on it,
 * and a file of my new system by its path in the tree,
 * like `/edit?file=NomMetainformations/Foods.md`,
 * with the row of its table to scroll to and mark by the text of its first cell,
 * like `&row=Bichler%2C%20Martin` in `Persons.md`, see `rowShow` in `./preview.ts`,
 * which a person's name opens, see `../persons.ts`;
 * a section opens where its round stands,
 * a block it shows from the tree or a link staying out of the address, so a reload returns there.
 * Saves only with its button, the plain floppy disk of saving,
 * so no check stands for saving, its tooltip `Save`,
 * or Ctrl+S, never by itself, refused when the file changed on the disk since it was read,
 * and asks before leaving with changes unsaved, also for another file of the tree;
 * the button faint while nothing is to save, its full grey while there are changes,
 * and the status line above the text says when it saved last, like `Saved 20:41`,
 * or what went wrong; at its left it shows the name of the file,
 * which the tree may be too narrow to show whole, its path from `NomWorkspace` on as its title.
 *
 * - `@codemirror/state`, `@codemirror/view`:
 *   The editor, CodeMirror 6, the engine of Obsidian's editor.
 * - `@codemirror/commands`: The history of the changes, whose Undo and Redo
 *   stay within a block, see `./keys.ts`, and the usual keys, Tab indenting a line.
 * - `@codemirror/language`: Indents with tabs.
 * - `./ics.ts`: Shows an `.ics` file with its blocks one step in, its entries apart,
 *   its names grey and its values readable, each block folding.
 * - `./keys.ts`: The keys of a Markdown file as in Obsidian, like Enter continuing a list.
 * - `./syntax.ts`: Reads the note as Markdown, with the Obsidian syntax.
 * - `./preview.ts`: Shows the Markdown as in the scripts view,
 *   folds its sections and scrolls to a heading.
 * - `./steps.ts`: Shows an unfolded solution one step at a time.
 * - `./tasks.ts`: Shows the rows of the tasks of a note.
 * - `./round.ts`: Shows the round of a section in the note.
 * - `./overview.ts`: Shows the page of a module, its course, or of a chapter, its sections,
 *   and its chapter in the tree.
 * - `./folder.ts`: Shows a folder of my modules with its folders and files.
 * - `../notes/code.ts`: Gives my code blocks the colors of my theme.
 * - `../notes/tree.ts`: Shows the tree of one root, the file shown marked,
 *   and the outline of a note or the blocks of a section with their places.
 * - `lucide`, `../icons.ts`:
 *   The floppy disk of the save button, crossed out for a file to read only,
 *   and the check of the round's button.
 * - `../notes/notes.css`: Look of the notes, for the rendered formulas,
 *   tables and images, and of the tree.
 * - `../day/day.css`: The middle dot before the session,
 *   as between the parts of an entry of the day.
 * - `./editor.css`: Look of the editor.
 */

import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import { defaultKeymap, history, indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { icsLook } from "./ics.ts";
import { markdownKeys } from "./keys.ts";
import { markdownSupport } from "./syntax.ts";
import { headingShow, linksSet, livePreview, rowShow, solutionsFold } from "./preview.ts";
import { solutionSteps } from "./steps.ts";
import { taskRows, tasksLoad } from "./tasks.ts";
import {
    roundBlocksOf,
    roundClose,
    roundGo,
    roundHeadingShow,
    roundNextOf,
    roundShownOf,
    roundStart,
} from "./round.ts";
import { outlineShow, treeShow } from "../notes/tree.ts";
import { codeColorsSet } from "../notes/code.ts";
import { overviewShow, overviewTreeShow } from "./overview.ts";
import { folderShow } from "./folder.ts";
import { timeOf } from "../day/times.ts";
import { ArrowRight, CircleCheck, Save, SaveOff } from "lucide";
import { iconPut } from "../icons.ts";
import "../notes/notes.css";
import "../day/day.css";
import "./editor.css";

import type { Extension } from "@codemirror/state";
import type { Rect, ViewUpdate } from "@codemirror/view";
import type { Links } from "./preview.ts";
import type { BlockMark } from "../notes/tree.ts";

/**
 * A note with the files its links lead to, as the reader sends it.
 *
 * - `path`: Path of the note.
 * - `text`: Text of the note, as it lies in the file.
 * - `links`: For each link of the note as written, the path of the file it leads to,
 *   `null` when it leads nowhere.
 */
type LinkedNote = {
    path: string;
    text: string;
    links: Links;
};

/**
 * A file of my new system, as the reader sends it.
 *
 * - `path`: Its path in the tree, like `NomMetainformations/Foods.md`.
 * - `text`: Its text, as it lies in the file.
 * - `editable`: Whether I may change it: a Markdown file, not an `.ics` file.
 */
type SystemFile = {
    path: string;
    text: string;
    editable: boolean;
};

/**
 * The file the editor shows,
 * a note of my modules or a file of my new system, see {@link openedRead}.
 *
 * - `text`: Its text, as it lies in the file.
 * - `links`: For a note of my modules the files its links lead to;
 *   none for a file of my new system, whose links stay as they are written.
 * - `markdown`: Whether it is Markdown, shown with its preview;
 *   else its plain text, like an `.ics` file.
 * - `editable`: Whether I may change it: a note of my modules or a Markdown file of my new system.
 * - `place`: Its path in `NomWorkspace`, from which its relative links lead,
 *   like `NomManageplannings/NomMetainformations/Modules.md`.
 */
type Opened = {
    text: string;
    links: Links;
    markdown: boolean;
    editable: boolean;
    place: string;
};

/**
 * Path of the file: of a note as the scripts view takes it,
 * of a file of my new system as the tree names it.
 */
let path: string = "";

/**
 * Address of the reader that writes the file: `/api/edit/note` for a note of my modules,
 * which keeps a diff, `/api/edit/file` for a file of my new system.
 */
let saveAddress: string = "/api/edit/note";

/**
 * Text of the file as it lies on the disk: as read, then as saved last.
 */
let saved: string = "";

/**
 * Whether a save is on its way.
 */
let saving: boolean = false;

/**
 * The editor, once the file is read.
 */
let view: EditorView;

/**
 * The tree of my modules, while the editor shows a note of them, for its outline;
 * `null` for a file of my new system.
 */
let outlineTree: HTMLElement | null = null;

/**
 * Waiting rebuild of the outline after a change of the text,
 * so typing builds it anew once, half a second after it rests.
 */
let outlineWait: number = 0;

/**
 * Shows whether the file has changes not yet saved:
 * the save button in its full grey while it has, else faint, in a section too,
 * before the close of the round, and in the status line a notice, like `Saved 20:41`,
 * or when something went wrong, like `Not saved`.
 * - {@link EditorState#sliceDoc}: Gives the text, its lines joined by the line break of the file.
 *
 * @param notice - Notice of the moment, like `Not saved`, empty for none
 */
function stateShow(notice: string): void {
    const unsaved: boolean = view.state.sliceDoc() !== saved;
    const save: HTMLElement = document.getElementById("editor-save") as HTMLElement;
    save.classList.toggle("unsaved", unsaved);
    (document.getElementById("editor-state") as HTMLElement).textContent = notice;
}

/**
 * Saves the file: sends its text to the reader with the text it had when read or saved last;
 * the reader writes it when the file has not changed since,
 * a note of my modules with its change as a diff;
 * then says so in the status line with the time, like `Saved 20:41`, until the next change,
 * and a note takes the files its links lead to anew,
 * so a link written since works, see `./preview.ts`.
 * Does nothing while a save is on its way, when nothing changed, or for a file to read only.
 * - `reread`: The note read anew with its links,
 *   `null` for a file of my new system or when it cannot be read.
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
        if (response.ok) {
            saved = text;
            stateShow(`Saved ${timeOf(new Date())}`);
            const reread: Opened | null =
                saveAddress === "/api/edit/note" ? await openedRead("") : null;
            if (reread !== null) linksSet(view, reread.links);
        } else if (response.status === 409) {
            stateShow("Not saved: it changed on the disk, reload it");
        } else {
            stateShow("Not saved");
        }
    } catch (error: unknown) {
        console.error(error);
        stateShow("Not saved: the reader is not running");
    } finally {
        saving = false;
    }
}

/**
 * Saves on Ctrl+S, Cmd+S on a Mac, also while the cursor is outside the text,
 * instead of the browser saving the page.
 *
 * @param event - Key pressed anywhere in the page
 */
function keyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        noteSave();
    }
}

/**
 * Builds the outline of a note in the tree anew,
 * or for a section its blocks with their places in its round, the one shown lit,
 * with the day its next Task comes.
 * - `blocks`: The blocks of a section with their places, `null` for any other note.
 */
function outlineRefresh(): void {
    const blocks: [string, BlockMark][] | null = roundBlocksOf(view);
    if (outlineTree !== null)
        outlineShow(
            outlineTree,
            path,
            view.state.sliceDoc(),
            blocks,
            roundShownOf(view),
            roundNextOf(),
        );
}

/**
 * Builds the extensions of the editor for a file.
 * - `lineSeparator`: Splits and joins the lines by the line break of the file, `\r\n` or `\n`,
 *   so saving writes the line breaks as they were, also a single other one,
 *   which stays inside its line.
 * - `readOnly`: Lets me read an `.ics` file, never change it.
 * - `markdownSupport`, `markdownKeys`, `livePreview`:
 *   Read a Markdown file as Markdown, take its keys as in Obsidian, see `./keys.ts`,
 *   and show it as in the scripts view;
 *   any other file stays its plain text,
 *   an `.ics` file with its blocks one step in, see `./ics.ts`.
 * - `indentUnit`: Indents with a tab, as my notes do.
 * - `lineWrapping`: Wraps long lines at the reading width, as the scripts view does,
 *   so I see where a line overflows.
 * - `darkTheme`: Draws cursor and selection for a dark page.
 * - `scrollMargins`: Keeps the cursor below the status line,
 *   which stays on top while the file scrolls, so moving up never hides the cursor under it.
 * - `solutionSteps`: The steps of an unfolded solution, one at a time, see `./steps.ts`.
 * - `taskRows`: The rows of the tasks of a note, once loaded, see `./tasks.ts`.
 * - `roundStart`: The round of a section, see `./round.ts`,
 *   which shows the places of its blocks anew as it moves.
 * - `updateListener`: Shows whether the file has unsaved changes after each change of the text,
 *   and builds the outline of a note anew once the typing rests, see {@link outlineRefresh}.
 *
 * @param opened - The file
 * @returns Extensions
 */
function extensionsOf(opened: Opened): Extension[] {
    return [
        EditorState.lineSeparator.of(opened.text.includes("\r\n") ? "\r\n" : "\n"),
        EditorState.readOnly.of(!opened.editable),
        ...(opened.markdown ? [markdownSupport, markdownKeys] : []),
        indentUnit.of("\t"),
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.darkTheme.of(true),
        EditorView.scrollMargins.of((): Partial<Rect> => ({
            top: (document.getElementById("editor-status") as HTMLElement).offsetHeight,
        })),
        ...(opened.markdown
            ? [
                  livePreview(opened.links, opened.place),
                  solutionSteps,
                  taskRows,
                  roundStart(outlineRefresh),
              ]
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

/**
 * Reads the file the address names, see the top of this file: a file of my new system, else a note.
 * - `response`: Answer of the reader.
 * - `sent`: The file of my new system as the reader sends it.
 * - `note`: The note as the reader sends it.
 * - `markdown`: Whether the note is Markdown,
 *   else a file of my modules to read only, like an `.ics` file.
 *
 * @param file - Path of a file of my new system,
 *   like `NomMetainformations/Foods.md`, empty for a note
 * @returns The file, `null` when the reader cannot read it
 */
async function openedRead(file: string): Promise<Opened | null> {
    if (file !== "") {
        const response: Response = await fetch(`/api/edit/file?path=${encodeURIComponent(file)}`);
        if (!response.ok) return null;
        const sent: SystemFile = (await response.json()) as SystemFile;
        return {
            text: sent.text,
            links: {},
            markdown: /\.md$/i.test(sent.path),
            editable: sent.editable,
            place: `NomManageplannings/${sent.path}`,
        };
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

/**
 * Scrolls the note shown to the heading of the address, see `headingShow` in `./preview.ts`,
 * or to the very top of the page.
 * - `heading`: The heading of the address, empty for none.
 */
function addressHeadingShow(): void {
    const heading: string = decodeURIComponent(location.hash.slice(1));
    if (heading === "") (document.querySelector(".editor-file") as HTMLElement).scrollTop = 0;
    else headingShow(view, heading);
}

/**
 * Scrolls to a heading of the note shown on a click on a link to it in the tree,
 * like in its outline, without loading the page again,
 * and keeps it in the address and the history of the browser;
 * a block of a section shows alone in its round, see `roundHeadingShow` in `./round.ts`,
 * and stays out of the address, so a reload returns to where the round stands;
 * links to other notes, and clicks with a key held, act as usual.
 * - {@link History#pushState}:
 *   Writes the address as a new step of the history, for the back button.
 * - `link`: The link clicked, `null` for none.
 * - `address`: Its address.
 *
 * @param event - Click inside the tree or the list of blocks
 */
function treeClick(event: MouseEvent): void {
    const link: HTMLAnchorElement | null = (event.target as Element).closest("a[href]");
    if (link === null || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const address: URL = new URL(link.href);
    if (address.pathname !== "/scripts" || address.searchParams.get("path") !== path) return;
    event.preventDefault();
    if (roundHeadingShow(view, decodeURIComponent(address.hash.slice(1)), false)) return;
    window.history.pushState(null, "", address);
    addressHeadingShow();
}

/**
 * Starts the editor after the router has put its HTML into the page:
 * gives my code blocks the colors of my theme, see `../notes/code.ts`;
 * shows the tree on the left, that of my new system for one of its files and at `/plannings`,
 * else that of my modules, the module of the address picked while no note is shown,
 * like `/scripts?module=IN2028_BusinessAnalyticsMachineLearning` from a skill entry,
 * see `../notes/tree.ts`, and its chapter of the address,
 * like `&chapter=01_RegressionAnalysis`, picked in the tree, while the page of the module,
 * or of the chapter the address names, stands on the right, see `./overview.ts`,
 * and so does a folder of my modules the address names,
 * like `/scripts?folder=…`, with its module picked, see `./folder.ts`;
 * Today stands there while the address names neither a note nor a module nor a folder;
 * reads the file the address names, named by the tree alone,
 * and shows it to edit, its solutions folded,
 * see `./preview.ts`, scrolled to the row of a table the address names, marked,
 * see `rowShow` there, with the save
 * button, Ctrl+S, and a question before leaving with changes unsaved;
 * a file to read only has the save button crossed out, a file that cannot
 * be read shows a hint instead, and so does the editor while it shows no file.
 * A note of my modules gets the rows of its tasks, see `./tasks.ts`, its outline in the tree,
 * and scrolls to the heading of the address,
 * also when the back or forward button of the browser changes it;
 * a section its round, see `./round.ts`, its text hidden until its tasks are loaded,
 * so its blocks fold before they show,
 * scrolled to its current block unless the address names a heading,
 * whose block it shows once as looked up, the heading then dropped from the address,
 * see {@link History#replaceState}.
 * - `address`: The parameters of the address.
 * - `file`: Path of the file of my new system, empty for a note.
 * - `folder`: Path of the folder of my modules, empty for none.
 * - `plannings`: Whether the editor shows my new system,
 *   for one of its files or at `/plannings`; else my modules.
 * - `tree`: Place of the tree, and `shown` the tree once it is shown.
 * - `close`, `next`: The close of a round and `Next` in the head, see `./round.ts`.
 * - `opened`: The file read.
 * - `text`: Element of the text, with the look of the notes for Markdown, else of plain text.
 * - `beforeunload`: Comes before the page closes or loads again, also for another file of the tree;
 *   `preventDefault` makes the browser ask.
 * - `popstate`: Comes when the back or forward button of the browser changes the address.
 */
export async function editorStart(): Promise<void> {
    void codeColorsSet();
    const address: URLSearchParams = new URLSearchParams(location.search);
    const file: string = address.get("file") ?? "";
    const folder: string = address.get("folder") ?? "";
    const save: HTMLElement = document.getElementById("editor-save") as HTMLElement;
    const plannings: boolean = file !== "" || location.pathname === "/plannings";
    const tree: HTMLElement = document.getElementById("notes-tree") as HTMLElement;
    path = file !== "" ? file : (address.get("path") ?? "");
    saveAddress = file !== "" ? "/api/edit/file" : "/api/edit/note";
    const shown: Promise<void> = treeShow(
        tree,
        plannings ? "NomManageplannings" : "NomSkillingmodules",
        path,
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
        await overviewShow(
            document.getElementById("editor-overview") as HTMLElement,
            module,
            chapter,
        );
        return;
    }
    const opened: Opened | null = path === "" ? null : await openedRead(file);
    if (opened === null) {
        save.hidden = true;
        (document.getElementById("editor-state") as HTMLElement).textContent =
            path === ""
                ? `Choose a ${plannings ? "file" : "module"} on the left`
                : "This file cannot be read";
        return;
    }

    const text: HTMLElement = document.getElementById("editor-text") as HTMLElement;
    text.classList.toggle("markdown", opened.markdown);
    text.classList.toggle("editor-plain", !opened.markdown);
    saved = opened.text;
    view = new EditorView({
        parent: text,
        state: EditorState.create({ doc: opened.text, extensions: extensionsOf(opened) }),
    });
    if (opened.markdown) solutionsFold(view);
    iconPut(save, view.state.readOnly ? SaveOff : Save, view.state.readOnly ? "Read only" : "Save");
    save.addEventListener("click", noteSave);
    (save as HTMLButtonElement).disabled = view.state.readOnly;
    stateShow("");
    window.addEventListener("keydown", keyDown);
    window.addEventListener("beforeunload", (event: BeforeUnloadEvent): void => {
        if (view.state.sliceDoc() !== saved) event.preventDefault();
    });
    if (opened.markdown && address.has("row")) rowShow(view, address.get("row") ?? "");
    if (plannings || !opened.markdown) return;

    text.style.visibility = "hidden";
    tasksLoad(view, path)
        .catch((error: unknown): void => console.error(error))
        .finally((): void => {
            text.style.visibility = "";
            const sectionShown: boolean = roundBlocksOf(view) !== null;
            if (!sectionShown) addressHeadingShow();
            else if (location.hash !== "") {
                roundHeadingShow(view, decodeURIComponent(location.hash.slice(1)), true);
                window.history.replaceState(null, "", location.pathname + location.search);
            }
        });
    shown
        .then((): void => {
            outlineTree = tree;
            outlineRefresh();
        })
        .catch((error: unknown): void => console.error(error));
    tree.addEventListener("click", treeClick);
    window.addEventListener("popstate", addressHeadingShow);
}
