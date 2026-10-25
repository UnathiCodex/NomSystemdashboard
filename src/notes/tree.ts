/**
 * ## Tree
 *
 * The tree on the left of the editor, see `../editor/editor.ts`, which is the scripts view too,
 * as Obsidian's file explorer, of one of two roots at a time, each an area of its own in the rail:
 * - `NomSkillingmodules`, the book, every module of mine, one at a time,
 *   since I learn one module at a time:
 *   right below the name of the root the module picked,
 *   then its chapter picked, each a line of plain text that opens its menu beside the tree,
 *   a pick in it opening the page of the module or of the chapter, see {@link pickerOf},
 *   then the notes of that chapter as a plain list, nothing folding,
 *   which open in the scripts view to write, saved right into their files;
 *   while no module is picked, on the start of the scripts,
 *   its search and every module below the name of the root instead, grouped by semester,
 *   see {@link choiceListOf}, a pick opening the page of the module;
 * - `NomManageplannings`, the open folder, my new system,
 *   as the reader lists it, without my old system `NomSystemprevious`, see `reader/files.ts`:
 *   a Markdown file, like `Foods.md`, opens in the editor to edit,
 *   an `.ics` file as its plain text to read, any other file shows faint and opens not.
 * The name of the root stands on top as a heading that never folds,
 * so nothing lies deeper than it needs;
 * that of my modules a link to their start, the name of my new system no link.
 * Of my modules the module and chapter of the note shown are picked;
 * while none is shown, the module asked for, with its first chapter,
 * else none, the start then showing.
 * Of my new system its folders stand right below, folders first,
 * all closed but those on the way to the file shown.
 * Of my new system a search filters the tree as I type, see {@link searchStart};
 * of my modules one their list on the start and in the menu of their picker,
 * see {@link choiceListOf}, their chapter short enough to see without.
 * Under the note shown stands its outline, as Obsidian's outline, see {@link outlineShow};
 * under a section its blocks in the places of its round, see {@link roundListOf};
 * a click on the note shown folds them away, as a folder closes,
 * and a further click opens them again, see {@link outlineFold}.
 * Each name stands on one line, one too long for it ending in dots,
 * a file of my new system cut in its middle instead, so its ending stays in sight,
 * like `IN2028_BusinessAnalyticsMach…_Plan.ics`, see {@link fileNodeOf}; each whole as its tooltip;
 * its look is in `./notes.css`.
 *
 * - `../search.ts`: Compares a typed text with the paths of the files and notes,
 *   as every search of the page does.
 * - `../day/choices.ts`: Marks where a long name may go on below,
 *   and cuts the name of a file in its middle.
 * - `./markdown.ts`, `./math.ts`:
 *   Render the headings of the outline, their formulas as in the note.
 * - `lucide`, `../icons.ts`: The check and the cross of a block done in its round,
 *   and the search fields of my new system and of my modules.
 * - `../reader.ts`: Asks the reader for the tree.
 * - `../changes.ts`: Loads the tree of my new system anew after every change
 *   of its files, see {@link filesAgain}.
 */

import { matchesAll, wordsOf } from "../search.ts";
import { breakableOf, middleCutPut } from "../day/choices.ts";
import { inlineHtmlOf } from "./markdown.ts";
import { mathRender } from "./math.ts";
import { iconOf, searchFieldOf } from "../icons.ts";
import { Check, X } from "lucide";
import { readerAsk } from "../reader.ts";
import { changesFollow } from "../changes.ts";

/**
 * A folder or file of `NomManageplannings`, as the reader sends it.
 *
 * - `name`: Its name, like `2026_10` or `Foods.md`.
 * - `path`: Its path from `NomManageplannings`, like `NomMetainformations/Foods.md`.
 * - `folder`: Whether it is a folder.
 * - `opens`: Whether the editor opens it:
 *   a Markdown or `.ics` file of the folders of my new system.
 * - `children`: What a folder holds, its folders first.
 */
type FileNode = {
    name: string;
    path: string;
    folder: boolean;
    opens: boolean;
    children: FileNode[];
};

/**
 * A note of a chapter, as the reader sends it.
 *
 * - `name`: Name of the file, like `01_01_EstimatorConfidenceInterval.md`.
 * - `path`: Path, from `NomSkillingmodules`.
 */
type NoteEntry = {
    name: string;
    path: string;
};

/**
 * A chapter with its notes, as the reader sends it.
 *
 * - `title`: Its name, like `01_RegressionAnalysis`.
 * - `notes`: Its notes in order.
 */
type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/**
 * A module with its chapters, as the reader sends it, in the order of the list of the modules,
 * see `menuRead` in `reader/notes.ts`.
 *
 * - `name`: Name of its folder, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `title`: Its name, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `semester`: The semester it stands under in the list:
 *   for a module of the semester that of today, like `2026W`, else the last I took it in,
 *   like `2026S`, empty for none.
 * - `chapters`: Its chapters that hold notes, in order.
 */
export type NotesModule = {
    name: string;
    title: string;
    semester: string;
    chapters: Chapter[];
};

/**
 * Makes a folder of the tree that folds, like a chapter: its name, whole as its tooltip,
 * and below it the place of its entries.
 *
 * @param name - Name shown, like `01_RegressionAnalysis`
 * @returns Folder, its entries to go into its last child
 */
export function folderOf(name: string): HTMLDetailsElement {
    const folder: HTMLDetailsElement = document.createElement("details");
    const summary: HTMLElement = document.createElement("summary");
    const children: HTMLDivElement = document.createElement("div");
    folder.className = "tree-folder";
    summary.textContent = breakableOf(name);
    summary.title = name;
    children.className = "tree-children";
    folder.append(summary, children);
    return folder;
}

/**
 * Builds the address of a note in the scripts view.
 *
 * @param path - Path of the note
 * @param heading - Heading to scroll to, empty for the top
 * @returns Address like `/scripts?path=…#Heading`
 */
export function noteAddressOf(path: string, heading: string): string {
    const address: string = `/scripts?path=${encodeURIComponent(path)}`;
    if (heading === "") return address;
    return `${address}#${encodeURIComponent(heading)}`;
}

/**
 * Builds the address of the page of a module in the scripts view, see `../editor/overview.ts`,
 * or of one of its chapters, which the tree picks too.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param chapter - Name of the chapter,
 *   like `01_RegressionAnalysis`, empty for the page of the module
 * @returns Address like `/scripts?module=…&chapter=…`
 */
export function overviewAddressOf(module: string, chapter: string): string {
    const address: string = `/scripts?module=${encodeURIComponent(module)}`;
    if (chapter === "") return address;
    return `${address}&chapter=${encodeURIComponent(chapter)}`;
}

/**
 * Builds the address of a folder of my modules in the scripts view, see `../editor/folder.ts`.
 *
 * @param path - Path of the folder from `NomSkillingmodules`,
 *   like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`
 * @returns Address like `/scripts?folder=…`
 */
export function folderAddressOf(path: string): string {
    return `/scripts?folder=${encodeURIComponent(path)}`;
}

/**
 * Finds the place in `NomWorkspace` a relative link of a file leads to, as VSCodium follows it:
 * from the folder of the file, each `..` one folder up, `.` staying;
 * `%20` and the like decoded, as the reader reads a link.
 * - `parts`: The folders on the way so far, from `NomWorkspace`.
 * - `decoded`: The link decoded, as written when it cannot be decoded.
 *
 * @param file - Path of the file in `NomWorkspace`,
 *   like `NomManageplannings/NomModulesuniversity/IN2028_BusinessAnalyticsMachineLearning.md`
 * @param link - Link as written, before `#`,
 *   like `../../NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`
 * @returns Its path in `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`,
 *   `null` for a link from `/` or one leading out of `NomWorkspace`
 */
export function linkPlaceOf(file: string, link: string): string | null {
    if (link.startsWith("/")) return null;

    const parts: string[] = file.split("/").slice(0, -1);
    let decoded: string = link;
    try {
        decoded = decodeURIComponent(link);
    } catch {
        // as written
    }
    for (const part of decoded.split("/")) {
        if (part === "..") {
            if (parts.pop() === undefined) return null;
        } else if (part !== "." && part !== "") {
            parts.push(part);
        }
    }
    return parts.join("/");
}

/**
 * Builds the address the dashboard opens a place of `NomWorkspace` at, see {@link linkPlaceOf}:
 * - a Markdown or `.ics` file of my new system in the editor,
 *   like `/edit?file=NomMetainformations%2FModules.md`;
 * - a note of my modules in the scripts view at its heading, see {@link noteAddressOf};
 * - the folder of a module, like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`,
 *   as its overview, see {@link overviewAddressOf};
 * none for any other place, like another folder, a PDF or my old system,
 * which opens only on the computer.
 * - `parts`: Its folders and its name, from `NomWorkspace`.
 * - `inner`: Its path inside `NomManageplannings` or `NomSkillingmodules`.
 *
 * @param place - Path in `NomWorkspace`, like `NomManageplannings/NomMetainformations/Modules.md`
 * @param heading - Heading of a note to scroll to, empty for the top
 * @returns Address, empty for none
 */
export function placeAddressOf(place: string, heading: string): string {
    const parts: string[] = place.split("/");
    const inner: string = parts.slice(1).join("/");
    if (parts.some((part: string): boolean => part.startsWith("."))) return "";
    if (
        parts[0] === "NomManageplannings" &&
        parts.length > 2 &&
        parts[1] !== "NomSystemprevious" &&
        /\.(md|ics)$/i.test(place)
    )
        return `/edit?file=${encodeURIComponent(inner)}`;
    if (parts[0] === "NomSkillingmodules" && parts.length > 2 && /\.md$/i.test(place))
        return noteAddressOf(inner, heading);
    if (parts[0] === "NomSkillingmodules" && parts.length === 2 && !inner.includes("."))
        return overviewAddressOf(inner, "");
    return "";
}

/**
 * Makes a folder or file of `NomManageplannings`: a folder with its entries and its path,
 * so it opens again once the tree is loaded anew, see {@link filesAgain};
 * a file that opens as a link to it in the editor, named as on the disk,
 * like `Foods.md`, cut in its middle where it is too long, so its ending stays, like `_Plan.ics`,
 * see `middleCutPut` in `../day/choices.ts`, its name whole as its tooltip;
 * any other file faint, opening nothing, cut alike, its tooltip saying why below its name.
 * - `folder`: The folder of a folder.
 * - `link`: The link of a file that opens.
 * - `name`: The name of any other file.
 *
 * @param node - Folder or file as the reader sends it
 * @returns Its entry
 */
function fileNodeOf(node: FileNode): HTMLElement {
    if (node.folder) {
        const folder: HTMLDetailsElement = folderOf(node.name);
        folder.dataset.path = node.path;
        folder.lastElementChild?.append(...node.children.map(fileNodeOf));
        return folder;
    }
    if (node.opens) {
        const link: HTMLAnchorElement = document.createElement("a");
        link.className = "tree-file";
        link.dataset.path = node.path;
        link.href = `/edit?file=${encodeURIComponent(node.path)}`;
        middleCutPut(link, node.name);
        return link;
    }
    const name: HTMLSpanElement = document.createElement("span");
    name.className = "tree-file tree-closed";
    name.dataset.path = node.path;
    middleCutPut(name, node.name);
    name.title = `${node.name}\nOnly .md and .ics files of the folders of my new system open`;
    return name;
}

/**
 * Folds the outline of the note shown, or the blocks of a section, away on a click on its entry,
 * as a folder closes, and opens it again on a further click,
 * the note staying open and in place beside the tree:
 * `tree-folded` on the entry hides the outline below it, see `./notes.css`,
 * and stays on it while the outline is built anew, see {@link outlineShow}.
 * A click on another note, on a note without an outline, or with a key held, acts as usual.
 * - {@link Event#stopPropagation}: Keeps the click from the tree,
 *   which would scroll the note to its top, see `treeClick` in `../editor/editor.ts`.
 * - `entry`: The entry clicked.
 *
 * @param event - Click on the entry of a note
 */
function outlineFold(event: MouseEvent): void {
    const entry: HTMLElement = event.currentTarget as HTMLElement;
    if (
        !entry.classList.contains("shown") ||
        !entry.nextElementSibling?.classList.contains("tree-outline") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
    )
        return;
    event.preventDefault();
    event.stopPropagation();
    entry.classList.toggle("tree-folded");
}

/**
 * Makes a module, shown once it is picked, see {@link chapterShow}:
 * the name of its folder, its name and its group in the list of the modules as data,
 * so it can be picked, see {@link choiceListOf}, the group the semester it stands under,
 * like `2026W`, or `Other` for none;
 * its chapters in it, each shown once it is picked, its notes a plain list,
 * which link to the scripts view, named without `.md` as in Obsidian, whole as their tooltip,
 * the note shown folding its outline by a click on it, see {@link outlineFold};
 * a module without chapter notes, like most of my earlier modules, holds a calm `No notes yet`.
 * - `element`: The module.
 * - `group`: A chapter.
 * - `link`: Link of a note.
 * - `name`: Name of a note, without `.md`.
 * - `none`: The hint for a module without chapter notes.
 *
 * @param module - Module with its chapters and their notes
 * @returns The module
 */
function moduleNodeOf(module: NotesModule): HTMLDivElement {
    const element: HTMLDivElement = document.createElement("div");
    element.className = "tree-module";
    element.dataset.module = module.name;
    element.dataset.title = module.title;
    element.dataset.group = module.semester === "" ? "Other" : module.semester;
    element.append(
        ...module.chapters.map((chapter: Chapter): HTMLDivElement => {
            const group: HTMLDivElement = document.createElement("div");
            group.className = "tree-chapter";
            group.dataset.chapter = chapter.title;
            group.append(
                ...chapter.notes.map((note: NoteEntry): HTMLAnchorElement => {
                    const link: HTMLAnchorElement = document.createElement("a");
                    const name: string = note.name.replace(/\.md$/i, "");
                    link.className = "tree-file";
                    link.dataset.path = note.path;
                    link.href = noteAddressOf(note.path, "");
                    link.textContent = breakableOf(name);
                    link.title = name;
                    link.addEventListener("click", outlineFold);
                    return link;
                }),
            );
            return group;
        }),
    );
    if (module.chapters.length === 0) {
        const none: HTMLParagraphElement = document.createElement("p");
        none.className = "tree-none";
        none.textContent = "No notes yet";
        element.append(none);
    }
    return element;
}

/**
 * Makes a list of choices to pick from, see the top of this file:
 * every module on the start of the scripts, or the menu of a picker, see {@link pickerOf};
 * each choice a row, a link to the overview of what it picks,
 * see `../editor/overview.ts`, named by the name of its folder,
 * like `IN2028_BusinessAnalyticsMachineLearning`, whole as its tooltip,
 * plain text in the grey of a note, the one picked in the light text,
 * see `.tree-choice` in `./notes.css`.
 * A list of the modules, too many to see at once, has the one search field of the page on top,
 * see `searchFieldOf` in `../icons.ts`:
 * as I type, only the modules whose name holds each typed word stay,
 * as every search of the page compares, see `../search.ts`,
 * so `in00` finds them by their code and `software` by their name, and Enter opens the first;
 * they stand in the order of the reader, each group named small and grey above its first module,
 * like `2026W`, see `menuRead` in `reader/notes.ts`.
 * - `input`: The search field.
 * - `list`: The rows.
 * - `found`: The choices found for the typed text, all while nothing is typed.
 * - `show`: Shows the choices found for the typed text, the name of a group above its first choice,
 *   from the top of the list, so the first one, which Enter opens, is in sight.
 *
 * @param choices - What it offers: the modules, or the chapters of the module picked
 * @param nameOf - Gives the name of a choice, like `01_RegressionAnalysis`
 * @param groupOf - Gives the group of a choice, like `2026W` of a module;
 *   `null` for a list without search and groups, that of the chapters
 * @param addressOf - Gives the address of the overview of a choice, see {@link overviewAddressOf}
 * @returns The search field, none without groups, and the list, every choice shown
 */
function choiceListOf(
    choices: HTMLElement[],
    nameOf: (choice: HTMLElement) => string,
    groupOf: ((choice: HTMLElement) => string) | null,
    addressOf: (choice: HTMLElement) => string,
): HTMLElement[] {
    const input: HTMLInputElement = document.createElement("input");
    const list: HTMLDivElement = document.createElement("div");
    let found: HTMLElement[] = [];
    const show: () => void = (): void => {
        const words: string[] = wordsOf(input.value);
        found = choices.filter((choice: HTMLElement): boolean => matchesAll(nameOf(choice), words));
        list.replaceChildren(
            ...found.flatMap((choice: HTMLElement, index: number): HTMLElement[] => {
                const row: HTMLAnchorElement = document.createElement("a");
                row.className = "tree-choice";
                row.classList.toggle("picked", choice.classList.contains("picked"));
                row.href = addressOf(choice);
                row.textContent = breakableOf(nameOf(choice));
                row.title = nameOf(choice);
                if (
                    groupOf === null ||
                    (index > 0 && groupOf(found[index - 1]) === groupOf(choice))
                )
                    return [row];
                const group: HTMLParagraphElement = document.createElement("p");
                group.className = "tree-group";
                group.textContent = groupOf(choice);
                return [group, row];
            }),
        );
        list.scrollTop = 0;
    };
    list.className = "tree-list";
    input.addEventListener("input", show);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter" && found.length > 0) location.assign(addressOf(found[0]));
    });
    show();
    return groupOf === null ? [list] : [searchFieldOf(input, "Search modules"), list];
}

/**
 * Makes a picker of the tree of my modules, see the top of this file:
 * a row, the name of what is picked, no arrow,
 * since a click on it opens its menu, the browser's own popover,
 * which a pick, Escape or a click beside it closes;
 * the menu holds its list of choices, made anew each time it opens,
 * see {@link choiceListOf}, the cursor in its search, the one picked scrolled into sight;
 * a pick opens the page of what it picks, the module or the chapter, see `../editor/overview.ts`.
 * - `pick`: The row, a button.
 * - `name`: The name of what is picked on it, see `.tree-pick` in `./notes.css`.
 * - `menu`: The menu.
 *
 * @param kind - What it picks, `module` or `chapter`, which names its anchor,
 *   see `.tree-pick` in `./notes.css`
 * @param choices - Gives what it may pick: the modules, or the chapters of the module picked
 * @param nameOf - Gives the name of a choice, like `01_RegressionAnalysis`
 * @param groupOf - Gives the group of a choice, like `2026W` of a module;
 *   `null` for a menu without search and groups, that of the chapters
 * @param addressOf - Gives the address of the overview of a choice, see {@link overviewAddressOf}
 * @returns The row and its menu
 */
function pickerOf(
    kind: string,
    choices: () => HTMLElement[],
    nameOf: (choice: HTMLElement) => string,
    groupOf: ((choice: HTMLElement) => string) | null,
    addressOf: (choice: HTMLElement) => string,
): [HTMLButtonElement, HTMLDivElement] {
    const pick: HTMLButtonElement = document.createElement("button");
    const name: HTMLSpanElement = document.createElement("span");
    const menu: HTMLDivElement = document.createElement("div");
    pick.type = "button";
    pick.className = `tree-pick tree-pick-${kind}`;
    name.className = "tree-pick-name";
    pick.append(name);
    pick.popoverTargetElement = menu;
    menu.className = `tree-menu tree-menu-${kind}`;
    menu.popover = "auto";
    menu.addEventListener("beforetoggle", (event: ToggleEvent): void => {
        if (event.newState === "open")
            menu.replaceChildren(...choiceListOf(choices(), nameOf, groupOf, addressOf));
    });
    menu.addEventListener("toggle", (event: ToggleEvent): void => {
        if (event.newState !== "open") return;
        menu.querySelector("input")?.focus();
        menu.querySelector(".picked")?.scrollIntoView({ block: "nearest" });
    });
    return [pick, menu];
}

/**
 * Shows one chapter of one module in the tree of my modules, see the top of this file:
 * their names in their pickers, each by the name of its folder on one line,
 * like `IN2028_BusinessAnalyticsMachineLearning` and `01_RegressionAnalysis`, whole as its tooltip;
 * the notes of that chapter below, both marked `picked`, every other module and chapter hidden;
 * a module without chapters shows its hint `No notes yet` and no picker of chapters.
 * - `modulePick`, `chapterPick`: The pickers of the module and of the chapter.
 * - `title`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `name`: Name of the folder of the chapter, like `01_RegressionAnalysis`, empty for none.
 *
 * @param tree - The tree
 * @param module - The module, see {@link moduleNodeOf}
 * @param chapter - A chapter of it, `null` for a module without chapters
 */
export function chapterShow(
    tree: HTMLElement,
    module: HTMLElement,
    chapter: HTMLElement | null,
): void {
    tree.querySelectorAll<HTMLElement>(".tree-module").forEach((other: HTMLElement): void => {
        other.classList.toggle("picked", other === module);
    });
    module.querySelectorAll<HTMLElement>(".tree-chapter").forEach((other: HTMLElement): void => {
        other.classList.toggle("picked", other === chapter);
    });
    const modulePick: HTMLButtonElement = tree.querySelector(
        ".tree-pick-module",
    ) as HTMLButtonElement;
    const chapterPick: HTMLButtonElement = tree.querySelector(
        ".tree-pick-chapter",
    ) as HTMLButtonElement;
    const title: string = module.dataset.title ?? "";
    const name: string = chapter?.dataset.chapter ?? "";
    (modulePick.firstElementChild as HTMLElement).textContent = breakableOf(title);
    modulePick.title = title;
    (chapterPick.firstElementChild as HTMLElement).textContent = breakableOf(name);
    chapterPick.title = name;
    chapterPick.hidden = chapter === null;
}

/**
 * Marks the file or note shown in the tree, and no other: picks the module and chapter of a note,
 * see {@link chapterShow}, opens every folder on the way to a file and scrolls the tree to it.
 * - {@link CSS.escape}: Writes a path so it can stand inside a selector.
 * - `link`: Entry of the file or note shown, `null` while it is not in the tree.
 * - `module`: The module of a note, `null` for a file of my new system.
 * - `folder`: A folder on the way to it, from the nearest one up to its root.
 *
 * @param tree - The tree
 * @param shown - Path of the file or note shown, like `NomMetainformations/Foods.md`
 *   or `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_SampleMeanStandardError.md`
 * @returns Its entry, `null` while it is not in the tree,
 *   like a note outside the chapter folders of its module
 */
export function treeMark(tree: HTMLElement, shown: string): HTMLElement | null {
    tree.querySelectorAll(".tree-file.shown").forEach((file: Element): void =>
        file.classList.remove("shown"),
    );
    const link: HTMLElement | null =
        shown === "" ? null : tree.querySelector(`.tree-file[data-path="${CSS.escape(shown)}"]`);
    if (link === null) return null;

    link.classList.add("shown");
    const module: HTMLElement | null = link.closest(".tree-module");
    if (module !== null) chapterShow(tree, module, link.closest(".tree-chapter"));
    let folder: HTMLDetailsElement | null = link.closest("details");
    while (folder !== null) {
        folder.open = true;
        folder = folder.parentElement?.closest("details") ?? null;
    }
    link.scrollIntoView({ block: "nearest" });
    return link;
}

/**
 * Starts the search of my new system:
 * as I type, only the files whose path holds each typed word show,
 * every folder on the way to them open;
 * the folders open before the search open again once it is empty.
 * Enter opens the first file shown that opens, as a click on it does;
 * Escape empties the search as in every search field of the page, by the browser itself,
 * which then tells `input` as for any change of the text, and so does the tree loaded anew,
 * see {@link filesAgain}, which the search then filters again.
 * - `opened`: Paths of the folders open before the search, `null` while nothing is typed;
 *   paths, not the folders themselves, so they still name the folders of the tree loaded anew.
 * - `files`: The files of the tree.
 * - `show`: Shows the tree for the typed text.
 *
 * @param tree - The tree
 * @param search - Its search field
 */
function searchStart(tree: HTMLElement, search: HTMLInputElement): void {
    let opened: Set<string> | null = null;
    const files: () => HTMLElement[] = (): HTMLElement[] => [
        ...tree.querySelectorAll<HTMLElement>(".tree-file"),
    ];
    const show: () => void = (): void => {
        const words: string[] = wordsOf(search.value);
        const folders: HTMLDetailsElement[] = [
            ...tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder"),
        ];
        if (words.length === 0) {
            tree.querySelectorAll(".tree-unfound").forEach((element: Element): void =>
                element.classList.remove("tree-unfound"),
            );
            if (opened !== null)
                folders.forEach((folder: HTMLDetailsElement): void => {
                    folder.open = opened?.has(folder.dataset.path ?? "") ?? false;
                });
            opened = null;
            return;
        }
        opened ??= new Set(
            folders
                .filter((folder: HTMLDetailsElement): boolean => folder.open)
                .map((folder: HTMLDetailsElement): string => folder.dataset.path ?? ""),
        );
        files().forEach((file: HTMLElement): void => {
            file.classList.toggle("tree-unfound", !matchesAll(file.dataset.path ?? "", words));
        });
        folders.forEach((folder: HTMLDetailsElement): void => {
            const found: boolean = folder.querySelector(".tree-file:not(.tree-unfound)") !== null;
            folder.classList.toggle("tree-unfound", !found);
            if (found) folder.open = true;
        });
    };
    search.addEventListener("input", show);
    search.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter")
            files()
                .find(
                    (file: HTMLElement): boolean =>
                        file instanceof HTMLAnchorElement &&
                        !file.classList.contains("tree-unfound"),
                )
                ?.click();
    });
}

/**
 * Loads the folders and files of my new system anew, as they lie on the disk now,
 * like after Syncthing took away a conflict copy, see `../changes.ts`,
 * and puts them in place of those shown, the tree else as it was:
 * the folders open before open again, the file shown marked,
 * see {@link treeMark}, the search filters them for its text, see {@link searchStart},
 * and the tree stays scrolled where it was; the search keeps its place, so typing in it goes on.
 * - `open`: Paths of the folders open before.
 * - `top`: How far the tree was scrolled.
 * - `entries`: The folders and files as they lie now.
 *
 * @param tree - The tree
 * @param search - Its search field
 * @param shown - Path of the file shown, empty for none
 * @throws {Error} - When the reader cannot answer
 */
async function filesAgain(
    tree: HTMLElement,
    search: HTMLInputElement,
    shown: string,
): Promise<void> {
    const open: string[] = [
        ...tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder[open]"),
    ].map((folder: HTMLDetailsElement): string => folder.dataset.path ?? "");
    const top: number = tree.scrollTop;
    const entries: HTMLElement[] = (await readerAsk<FileNode[]>("/api/edit/tree")).map(fileNodeOf);
    tree.querySelectorAll(":scope > .tree-folder, :scope > .tree-file").forEach(
        (entry: Element): void => entry.remove(),
    );
    tree.append(...entries);
    tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder").forEach(
        (folder: HTMLDetailsElement): void => {
            folder.open = open.includes(folder.dataset.path ?? "");
        },
    );
    treeMark(tree, shown);
    search.dispatchEvent(new Event("input"));
    tree.scrollTop = top;
}

/**
 * Place of a block of a section in its round, see `../editor/round.ts`:
 * done, done with its last result failed,
 * like a Task after Wrong, the current one, later in the round, outside the round,
 * or outside it but opened from the tree and shown.
 */
export type BlockMark = "done" | "wrong" | "current" | "round" | "other" | "opened";

/**
 * Type word of a block of a section at the start of its heading, with the dot and space after it,
 * like `Definition. ` of `Definition. Population and Sample`,
 * see `.claude/modules/learning-system.md`.
 */
export const kindRule: RegExp = /^(Definition|Lemma|Algorithm|Example|Task)\.[ \t]+/;

/**
 * Builds the name of a block for the list of its section: its type word as a small grey box,
 * then its name, rendered, without an older `(cold)`,
 * like `Definition` boxed and then `Population and Sample`.
 * - `kind`: The type word with the dot and space after it, `null` for a heading without one.
 * - `name`: The name, rendered.
 * - `box`: The box of the type word.
 *
 * @param heading - Heading as written
 * @returns The name
 */
function blockNameOf(heading: string): Node[] {
    const kind: RegExpExecArray | null = kindRule.exec(heading);
    const name: HTMLSpanElement = document.createElement("span");
    name.innerHTML = inlineHtmlOf(
        heading.slice(kind?.[0].length ?? 0).replace(/[ \t]*\(cold\)$/, ""),
    );
    return kind === null ? [name] : [kindBoxOf(kind[1]), name];
}

/**
 * Builds the small grey box of a type word, like `Definition`, see `.block-kind` in `../base.css`.
 *
 * @param kind - Type word
 * @returns The box
 */
function kindBoxOf(kind: string): HTMLSpanElement {
    const box: HTMLSpanElement = document.createElement("span");
    box.className = "block-kind";
    box.textContent = kind;
    return box;
}

/**
 * Builds the list of the blocks of a section in their order,
 * each linking to its heading by its heading as written,
 * named by its type word as a small grey box and its name,
 * see {@link blockNameOf}, that heading without an older `(cold)` whole as its tooltip:
 * a block done with a check after it,
 * or with a cross, the one its heading line has, once its last result failed,
 * like `Food Truck` after Wrong, the one shown in the light text of what is shown,
 * a later one of the round grey, one outside the round fainter.
 * Every block of the section stands in it, never hidden without a trace:
 * once two or more blocks of one kind are outside the round,
 * like the Examples and Tasks round 0 does not need,
 * they fold into one grey line of their kind after its last block,
 * its type word boxed as on their lines and how many,
 * like `Task` boxed and `7 more`, the line of the Tasks with the day the next one comes,
 * like `Tomorrow`, which opens them on a click, as a folder;
 * one alone stays a line of its own, since folding it saves no room.
 * A line I opened stays open while the list is built anew,
 * and the one holding the block shown opens.
 * - `list`: The list.
 * - `linkOf`: Makes the link to a block.
 * - `kindOf`: Gives the type word of a block, empty for none.
 * - `outside`: Whether a block is outside the round.
 * - `folded`: The type words whose blocks outside the round fold into one line.
 * - `inside`: The blocks of a type word outside the round.
 * - `fold`: The line of a type word with its blocks.
 *
 * @param path - Path of the note
 * @param blocks - Headings of its blocks in their order, each with its place
 * @param opened - Type words whose lines were open in the list before
 * @param next - The day the next Task comes, like `Tomorrow`, empty for none,
 *   see `roundNextOf` in `../editor/round.ts`
 * @returns The list
 */
export function roundListOf(
    path: string,
    blocks: [string, BlockMark][],
    opened: string[],
    next: string,
): HTMLElement {
    const list: HTMLDivElement = document.createElement("div");
    const linkOf: (block: [string, BlockMark]) => HTMLAnchorElement = ([heading, mark]: [
        string,
        BlockMark,
    ]): HTMLAnchorElement => {
        const link: HTMLAnchorElement = document.createElement("a");
        link.className = `tree-file tree-${mark}`;
        link.href = noteAddressOf(path, heading);
        link.dataset.heading = heading;
        link.title = heading.replace(/[ \t]*\(cold\)$/, "");
        link.append(...blockNameOf(heading));
        if (mark === "done" || mark === "wrong") link.append(iconOf(mark === "done" ? Check : X));
        return link;
    };
    const kindOf: (block: [string, BlockMark]) => string = (block: [string, BlockMark]): string =>
        kindRule.exec(block[0])?.[1] ?? "";
    const outside: (block: [string, BlockMark]) => boolean = (
        block: [string, BlockMark],
    ): boolean => block[1] === "other" || block[1] === "opened";
    const folded: string[] = [...new Set(blocks.map(kindOf))].filter(
        (kind: string): boolean =>
            kind !== "" &&
            blocks.filter(
                (block: [string, BlockMark]): boolean => kindOf(block) === kind && outside(block),
            ).length > 1,
    );
    list.className = "tree-children tree-outline tree-round";
    blocks.forEach((block: [string, BlockMark], index: number): void => {
        const kind: string = kindOf(block);
        if (!folded.includes(kind) || !outside(block)) list.append(linkOf(block));
        if (
            !folded.includes(kind) ||
            blocks.findLastIndex(
                (other: [string, BlockMark]): boolean => kindOf(other) === kind,
            ) !== index
        )
            return;
        const inside: [string, BlockMark][] = blocks.filter(
            (other: [string, BlockMark]): boolean => kindOf(other) === kind && outside(other),
        );
        const fold: HTMLDetailsElement = folderOf("");
        fold.firstElementChild?.append(
            kindBoxOf(kind),
            `${inside.length} more${kind === "Task" && next !== "" ? ` · ${next}` : ""}`,
        );
        fold.classList.add("tree-kind");
        fold.dataset.kind = kind;
        fold.open =
            opened.includes(kind) ||
            inside.some((other: [string, BlockMark]): boolean => other[1] === "opened");
        fold.lastElementChild?.append(...inside.map(linkOf));
        list.append(fold);
    });
    mathRender(list);
    return list;
}

/**
 * Puts the outline of the note shown under its entry in the tree, as Obsidian's outline:
 * each heading `##` in order, linking to it, its name as written whole as its tooltip,
 * each Example under the block above it that is no task, like
 * `Definition. Standard Error of the Mean`,
 * which then folds its tasks by its arrow and still links to its heading by its name;
 * tasks named without their type word, `Example.`, `Completion.` or `Task.`,
 * formulas rendered as in the note.
 * A block without tasks below it stays a plain link,
 * and so does a task without such a block above it;
 * a cold task, a `Task.`, in a note written the older way `Task. … (cold)`,
 * named also without `(cold)`, stands alone, at the end of its section;
 * there a plain `Task.` and a `Completion.` stand as an Example.
 * The outline put before goes; a block I folded in it stays folded.
 * A section shows the blocks of its round instead,
 * see {@link roundListOf}, a line of a kind I opened staying open.
 * - `entry`: Entry of the note in the tree, `null` while it is none,
 *   like a note outside the chapter folders.
 * - `folded`: Names of the blocks folded in the outline before.
 * - `kinds`: Type words of the lines of a kind open in the list of a section before.
 * - `outline`: The outline.
 * - `lines`: Lines of the note.
 * - `older`: Whether the note is written the older way.
 * - `cold`, `ladder`: Whether a heading is that of a cold task, or of an Example.
 * - `block`: Link of the last block that is no task, until its first task makes it a folder.
 * - `tasks`: Place of the tasks below that block, the outline itself before the first block.
 * - `heading`: Text of a heading `##` as written, `undefined` for a line that is none.
 * - `name`: Its name shown, as written, a task's without its type word and `(cold)`.
 * - `link`: Link to a heading, its text rendered.
 *
 * @param tree - The tree
 * @param path - Path of the note shown
 * @param text - Text of the note
 * @param round - Headings of the blocks of a section with their places in its round,
 *   `null` for any other note
 * @param next - For a section the day its next Task comes, like `Tomorrow`, empty for none
 */
export function outlineShow(
    tree: HTMLElement,
    path: string,
    text: string,
    round: [string, BlockMark][] | null,
    next: string,
): void {
    const entry: HTMLElement | null = tree.querySelector(
        `.tree-file.shown[data-path="${CSS.escape(path)}"]`,
    );
    const folded: string[] = [
        ...tree.querySelectorAll<HTMLDetailsElement>(
            ".tree-outline details.tree-folder:not(.tree-kind, [open])",
        ),
    ].map(
        (folder: HTMLDetailsElement): string =>
            folder.querySelector<HTMLElement>(".tree-file")?.dataset.heading ?? "",
    );
    const kinds: string[] = [
        ...tree.querySelectorAll<HTMLDetailsElement>(".tree-round details.tree-kind[open]"),
    ].map((fold: HTMLDetailsElement): string => fold.dataset.kind ?? "");
    tree.querySelectorAll(".tree-outline").forEach((outline: Element): void => outline.remove());
    if (entry === null) return;
    if (round !== null) {
        entry.after(roundListOf(path, round, kinds, next));
        return;
    }

    const outline: HTMLDivElement = document.createElement("div");
    const lines: string[] = text.split(/\r?\n/);
    const older: boolean = lines.some((line: string): boolean =>
        /^## Task\..*\(cold\)[ \t]*$/.test(line),
    );
    let block: HTMLAnchorElement | null = null;
    let tasks: HTMLElement = outline;
    outline.className = "tree-children tree-outline";
    lines.forEach((line: string): void => {
        const heading: string | undefined = /^##[ \t]+(.+?)[ \t]*$/.exec(line)?.[1];
        if (heading === undefined) return;
        const cold: boolean = older
            ? /^Task\..*\(cold\)$/.test(heading)
            : heading.startsWith("Task. ");
        const ladder: boolean =
            !cold &&
            (heading.startsWith("Example. ") ||
                heading.startsWith("Completion. ") ||
                (older && heading.startsWith("Task. ")));
        const name: string =
            cold || ladder
                ? heading
                      .replace(/^(Task|Completion|Example)\.\s*/, "")
                      .replace(/[ \t]*\(cold\)$/, "")
                : heading;
        const link: HTMLAnchorElement = document.createElement("a");
        link.className = "tree-file";
        link.href = noteAddressOf(path, heading);
        link.dataset.heading = heading;
        link.title = name;
        link.innerHTML = inlineHtmlOf(name);
        if (!cold && !ladder) {
            outline.append(link);
            block = link;
            tasks = outline;
        } else if (cold) {
            outline.append(link);
        } else {
            if (block !== null) {
                const folder: HTMLDetailsElement = folderOf("");
                folder.open = !folded.includes(block.dataset.heading ?? "");
                block.replaceWith(folder);
                folder.firstElementChild?.replaceChildren(block);
                tasks = folder.lastElementChild as HTMLElement;
                block = null;
            }
            tasks.append(link);
        }
    });
    mathRender(outline);
    entry.after(outline);
}

/**
 * A root of the tree, an area of its own in the rail: my modules or my new system.
 */
export type TreeRoot = "NomSkillingmodules" | "NomManageplannings";

/**
 * Loads one root of the tree from the reader and shows it, see the top of this file:
 * its name as a heading, that of my modules a link to their start,
 * then of my modules the pickers of module and chapter,
 * see {@link pickerOf}, of my new system its search, see {@link searchStart},
 * its folders or notes below, those of my new system loaded anew after every change of its files,
 * see {@link filesAgain}, the file or note shown marked, see {@link treeMark};
 * in the modules, while none is shown, the module asked for is picked,
 * like the module of a skill entry clicked in the day,
 * see `../skill/links.ts`, with its first chapter, see {@link chapterShow};
 * else none, the start then showing the search and every module in place of the pickers,
 * see {@link choiceListOf}.
 * - `heading`: The name of the root on top.
 * - `search`: The search of my new system, below its name.
 * - `link`: The name of my modules, a link to their start.
 * - `modules`: Of my modules the modules, each with its chapters and notes,
 *   see {@link moduleNodeOf}.
 * - `nameOf`, `groupOf`, `moduleAddressOf`: Give the name of a module, its group, like `2026W`,
 *   and the address of its overview.
 * - `moduleOf`: Gives the name of the folder of the module picked,
 *   for the address of the overview of a chapter.
 * - `modulePick`, `chapterPick`: The pickers of module and chapter, each with its menu.
 * - `entries`: Of my new system its folders and files.
 * - `asked`: The module asked for, `undefined` for none.
 *
 * @param tree - Place of the tree
 * @param root - The root to show
 * @param shown - Path of the file or note shown, empty for none
 * @param module - Name of the folder of the module to open while none is shown,
 *   like `IN2028_BusinessAnalyticsMachineLearning`, empty for none
 * @throws {Error} - When the reader cannot answer
 */
export async function treeShow(
    tree: HTMLElement,
    root: TreeRoot,
    shown: string,
    module: string,
): Promise<void> {
    const heading: HTMLHeadingElement = document.createElement("h2");
    heading.className = "tree-root";
    heading.textContent = root;
    tree.classList.toggle("is-files", root === "NomManageplannings");
    if (root === "NomManageplannings") {
        const search: HTMLInputElement = document.createElement("input");
        const entries: HTMLElement[] = (await readerAsk<FileNode[]>("/api/edit/tree")).map(
            fileNodeOf,
        );
        tree.replaceChildren(heading, searchFieldOf(search, "Search files"), ...entries);
        searchStart(tree, search);
        treeMark(tree, shown);
        changesFollow((): void => {
            filesAgain(tree, search, shown).catch((error: unknown): void => console.error(error));
        });
        return;
    }

    const link: HTMLAnchorElement = document.createElement("a");
    const modules: HTMLDivElement[] = (await readerAsk<NotesModule[]>("/api/notes/modules")).map(
        moduleNodeOf,
    );
    const nameOf: (choice: HTMLElement) => string = (choice: HTMLElement): string =>
        choice.dataset.title ?? "";
    const groupOf: (choice: HTMLElement) => string = (choice: HTMLElement): string =>
        choice.dataset.group ?? "";
    const moduleAddressOf: (choice: HTMLElement) => string = (choice: HTMLElement): string =>
        overviewAddressOf(choice.dataset.module ?? "", "");
    const moduleOf: () => string = (): string =>
        tree.querySelector<HTMLElement>(".tree-module.picked")?.dataset.module ?? "";
    const modulePick: [HTMLButtonElement, HTMLDivElement] = pickerOf(
        "module",
        (): HTMLElement[] => modules,
        nameOf,
        groupOf,
        moduleAddressOf,
    );
    const chapterPick: [HTMLButtonElement, HTMLDivElement] = pickerOf(
        "chapter",
        (): HTMLElement[] => [
            ...tree.querySelectorAll<HTMLElement>(".tree-module.picked > .tree-chapter"),
        ],
        (choice: HTMLElement): string => choice.dataset.chapter ?? "",
        null,
        (choice: HTMLElement): string =>
            overviewAddressOf(moduleOf(), choice.dataset.chapter ?? ""),
    );
    link.className = "tree-root-link";
    link.href = "/scripts";
    link.textContent = root;
    heading.replaceChildren(link);
    tree.replaceChildren(heading, ...modulePick, ...chapterPick, ...modules);
    if (treeMark(tree, shown) !== null) return;
    const asked: HTMLDivElement | undefined = modules.find(
        (element: HTMLDivElement): boolean => element.dataset.module === module,
    );
    if (asked !== undefined)
        chapterShow(tree, asked, asked.querySelector<HTMLElement>(".tree-chapter"));
    else tree.replaceChildren(heading, ...choiceListOf(modules, nameOf, groupOf, moduleAddressOf));
}
