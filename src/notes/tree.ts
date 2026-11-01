/**
 * ## Tree
 *
 * The tree on the left of the editor and the scripts view, as Obsidian's file explorer, one root at a time:
 * - `NomSkillingmodules`, one module at a time, since I learn one module at a time.
 *   The module and chapter picked, each a line that opens its menu, then the notes of that chapter.
 *   While no module is picked, its search and every module, grouped by semester.
 * - `NomManageplannings`, my new system, with a search that filters as I type.
 *   A Markdown or `.ics` file opens in the editor, any other file shows faint.
 * The name of the root stands on top as a heading that never folds, so nothing lies deeper than it needs.
 * Under the note shown stands its outline, under a section its blocks in the places of its round.
 * Each name stands on one line, its whole as its tooltip.
 */

import { matchesAll, wordsOf } from "../search.ts";
import { breakableOf, middleCutPut } from "../day/choices.ts";
import { inlineHtmlOf } from "./markdown.ts";
import { mathRender } from "./math.ts";
import { iconOf, iconPut, searchFieldOf } from "../icons.ts";
import { Check, ChevronsDownUp, CircleCheck, X } from "lucide";
import { readerAsk } from "../reader.ts";
import { changesFollow } from "../changes.ts";

/**
 * A folder or file of `NomManageplannings`.
 * - `opens`: Whether it is a Markdown or `.ics` file the editor opens.
 */
type FileNode = {
    name: string;
    path: string;
    folder: boolean;
    opens: boolean;
    children: FileNode[];
};

/** A note of a chapter, its path from `NomSkillingmodules`. */
type NoteEntry = {
    name: string;
    path: string;
};

type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/**
 * A module with its chapters that hold notes.
 * - `semester`: Today's semester for a module of it, else the last I took it in.
 */
export type NotesModule = {
    name: string;
    title: string;
    semester: string;
    chapters: Chapter[];
};

/** Makes a folder of the tree, its entries to go into its last child. */
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

/** Builds the address of a note in the scripts view, at a heading or the top. */
export function noteAddressOf(path: string, heading: string): string {
    const address: string = `/scripts?path=${encodeURIComponent(path)}`;
    if (heading === "") return address;
    return `${address}#${encodeURIComponent(heading)}`;
}

/** Builds the address of the overview of a module or one of its chapters. */
export function overviewAddressOf(module: string, chapter: string): string {
    const address: string = `/scripts?module=${encodeURIComponent(module)}`;
    if (chapter === "") return address;
    return `${address}&chapter=${encodeURIComponent(chapter)}`;
}

/** Builds the address of a folder of my modules in the scripts view. */
export function folderAddressOf(path: string): string {
    return `/scripts?folder=${encodeURIComponent(path)}`;
}

/**
 * Finds the place in `NomWorkspace` a relative link of a file leads to, as VSCodium follows it, decoded.
 * `null` for a link from `/` or one leading out of `NomWorkspace`.
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
 * Builds the address the dashboard opens a place of `NomWorkspace` at.
 * Empty for a place that opens only on the computer, like a PDF or my old system.
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
 * Makes a folder or file of `NomManageplannings`.
 * A folder keeps its path, so it opens again once the tree is loaded anew.
 * A file is cut in its middle where it is too long, so its ending stays.
 * A file that does not open shows faint, its tooltip saying why.
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
    name.title = `${node.name}\n` + "Only .md and .ics files of the folders of my new system open";
    return name;
}

/**
 * Folds the outline of the note shown away on a click on its entry, as a folder, the note staying open.
 * A click on another note, on a note without an outline, or with a key held, acts as usual.
 * The click never reaches the tree, which would scroll the note to its top.
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
 * Makes a module with its chapters, shown once it is picked, the group `Other` for one without semester.
 * Notes are named without `.md` as in Obsidian.
 * A module without chapter notes holds a calm `No notes yet`.
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
 * Makes a list of choices, each a link to the overview of what it picks.
 * A list of the modules, too many to see at once, has a search on top, and Enter opens the first.
 * Each group is named small and grey above its first choice.
 * - `show`: Scrolls to the top, so the first choice, which Enter opens, is in sight.
 *
 * @param groupOf - `null` for a list without search and groups, that of the chapters
 * @returns The search field, none without groups, and the list
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
                if (groupOf === null || (index > 0 && groupOf(found[index - 1]) === groupOf(choice))) return [row];
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
 * Makes a picker of my modules, a row with the name picked that opens its menu as a popover.
 * The menu makes its list anew each time it opens, the cursor in its search, the one picked in sight.
 *
 * @param kind - `module` or `chapter`, which names its anchor
 * @param groupOf - `null` for a menu without search and groups, that of the chapters
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
        if (event.newState === "open") menu.replaceChildren(...choiceListOf(choices(), nameOf, groupOf, addressOf));
    });
    menu.addEventListener("toggle", (event: ToggleEvent): void => {
        if (event.newState !== "open") return;
        menu.querySelector("input")?.focus();
        menu.querySelector(".picked")?.scrollIntoView({ block: "nearest" });
    });
    return [pick, menu];
}

/**
 * Shows one chapter of one module, their names in their pickers, every other module and chapter hidden.
 *
 * @param chapter - `null` for a module without chapters, which shows no picker of chapters
 */
export function chapterShow(tree: HTMLElement, module: HTMLElement, chapter: HTMLElement | null): void {
    tree.querySelectorAll<HTMLElement>(".tree-module").forEach((other: HTMLElement): void => {
        other.classList.toggle("picked", other === module);
    });
    module.querySelectorAll<HTMLElement>(".tree-chapter").forEach((other: HTMLElement): void => {
        other.classList.toggle("picked", other === chapter);
    });
    const modulePick: HTMLButtonElement = tree.querySelector(".tree-pick-module") as HTMLButtonElement;
    const chapterPick: HTMLButtonElement = tree.querySelector(".tree-pick-chapter") as HTMLButtonElement;
    const title: string = module.dataset.title ?? "";
    const name: string = chapter?.dataset.chapter ?? "";
    (modulePick.firstElementChild as HTMLElement).textContent = breakableOf(title);
    modulePick.title = title;
    (chapterPick.firstElementChild as HTMLElement).textContent = breakableOf(name);
    chapterPick.title = name;
    chapterPick.hidden = chapter === null;
}

/**
 * Marks the file or note shown, opens every folder on its way and scrolls the tree to it.
 * A folder shown opens with the folders on its way, its files unmarked.
 * `null` while it is not in the tree, like a note outside the chapter folders of its module.
 */
export function treeMark(tree: HTMLElement, shown: string): HTMLElement | null {
    tree.querySelectorAll(".tree-file.shown").forEach((file: Element): void => file.classList.remove("shown"));
    const path: string = CSS.escape(shown);
    const link: HTMLElement | null =
        shown === "" ? null : tree.querySelector(`.tree-file[data-path="${path}"], .tree-folder[data-path="${path}"]`);
    if (link === null) return null;

    if (link.classList.contains("tree-file")) link.classList.add("shown");
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
 * Starts the search of my new system, showing only the files whose path holds each typed word.
 * The folders open before the search open again once it is empty.
 * Enter opens the first file shown that opens.
 * - `opened`: Paths of the folders open before the search, `null` while nothing is typed.
 *   Paths, not folders, so they still name the folders of the tree loaded anew.
 */
function searchStart(tree: HTMLElement, search: HTMLInputElement): void {
    let opened: Set<string> | null = null;
    const files: () => HTMLElement[] = (): HTMLElement[] => [...tree.querySelectorAll<HTMLElement>(".tree-file")];
    const show: () => void = (): void => {
        const words: string[] = wordsOf(search.value);
        const folders: HTMLDetailsElement[] = [...tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder")];
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
                        file instanceof HTMLAnchorElement && !file.classList.contains("tree-unfound"),
                )
                ?.click();
    });
}

/**
 * Loads the files of my new system anew from the disk, the tree else as it was.
 * The search keeps its place, so typing in it goes on.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function filesAgain(tree: HTMLElement, search: HTMLInputElement, shown: string): Promise<void> {
    const open: string[] = [...tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder[open]")].map(
        (folder: HTMLDetailsElement): string => folder.dataset.path ?? "",
    );
    const top: number = tree.scrollTop;
    const entries: HTMLElement[] = (await readerAsk<FileNode[]>("/api/edit/tree")).map(fileNodeOf);
    tree.querySelectorAll(":scope > .tree-folder, :scope > .tree-file").forEach((entry: Element): void =>
        entry.remove(),
    );
    tree.append(...entries);
    tree.querySelectorAll<HTMLDetailsElement>("details.tree-folder").forEach((folder: HTMLDetailsElement): void => {
        folder.open = open.includes(folder.dataset.path ?? "");
    });
    treeMark(tree, shown);
    search.dispatchEvent(new Event("input"));
    tree.scrollTop = top;
}

/** Place of a block of a section in its round, `wrong` for done with its last result failed. */
export type BlockMark = "done" | "wrong" | "round" | "other";

/** Type word at the start of the heading of a block, with the dot and space after it. */
export const kindRule: RegExp = /^(Definition|Theorem|Lemma|Algorithm|Example|Task)\.[ \t]+/;

/** Type words written short, so the names beside them keep their room. */
const kindShorts: Map<string, string> = new Map([
    ["Definition", "Def"],
    ["Theorem", "Thm"],
    ["Lemma", "Lem"],
    ["Algorithm", "Alg"],
    ["Example", "Ex"],
    ["Task", "Task"],
]);

/** Builds the name of a block, its type word as a small grey box, without an older `(cold)`. */
function blockNameOf(heading: string): Node[] {
    const kind: RegExpExecArray | null = kindRule.exec(heading);
    const name: HTMLSpanElement = document.createElement("span");
    name.innerHTML = inlineHtmlOf(heading.slice(kind?.[0].length ?? 0).replace(/[ \t]*\(cold\)$/, ""));
    return kind === null ? [name] : [kindBoxOf(kind[1]), name];
}

/** Builds the small grey box of a type word. */
function kindBoxOf(kind: string): HTMLSpanElement {
    const box: HTMLSpanElement = document.createElement("span");
    box.className = "block-kind";
    box.textContent = kindShorts.get(kind) ?? kind;
    return box;
}

/**
 * Builds the list of the blocks of a section, each linking to its heading.
 * An Example or Task done gets a check, a cross once its last result failed.
 * Theory is never right or wrong, so done gets a check in a ring.
 * The one shown stands light, one still to do grey, one outside the round fainter.
 * Every block stands in it, never hidden without a trace.
 * Two or more of one kind outside the round fold into one line `7 more` after the last of the kind.
 * One alone stays a line of its own, since folding it saves no room.
 * The line of the Tasks shows the day the next one comes.
 *
 * @param opened - Type words whose lines were open in the list before
 */
export function roundListOf(
    path: string,
    blocks: [string, BlockMark][],
    shown: string,
    opened: string[],
    next: string,
): HTMLElement {
    const list: HTMLDivElement = document.createElement("div");
    const kindOf: (block: [string, BlockMark]) => string = (block: [string, BlockMark]): string =>
        kindRule.exec(block[0])?.[1] ?? "";
    const linkOf: (block: [string, BlockMark]) => HTMLAnchorElement = ([heading, mark]: [
        string,
        BlockMark,
    ]): HTMLAnchorElement => {
        const link: HTMLAnchorElement = document.createElement("a");
        const judged: boolean = ["Example", "Task"].includes(kindOf([heading, mark]));
        link.className = `tree-file tree-${mark}`;
        link.classList.toggle("tree-current", heading === shown);
        link.href = noteAddressOf(path, heading);
        link.dataset.heading = heading;
        link.title = heading.replace(/[ \t]*\(cold\)$/, "");
        link.append(...blockNameOf(heading));
        if (mark === "wrong") link.append(iconOf(X));
        if (mark === "done") link.append(iconOf(judged ? Check : CircleCheck));
        link.classList.toggle("tree-theory", !judged);
        return link;
    };
    const outside: (block: [string, BlockMark]) => boolean = (block: [string, BlockMark]): boolean =>
        block[1] === "other";
    const folded: string[] = [...new Set(blocks.map(kindOf))].filter(
        (kind: string): boolean =>
            kind !== "" &&
            blocks.filter((block: [string, BlockMark]): boolean => kindOf(block) === kind && outside(block)).length > 1,
    );
    list.className = "tree-children tree-outline tree-round";
    blocks.forEach((block: [string, BlockMark], index: number): void => {
        const kind: string = kindOf(block);
        if (!folded.includes(kind) || !outside(block)) list.append(linkOf(block));
        if (
            !folded.includes(kind) ||
            blocks.findLastIndex((other: [string, BlockMark]): boolean => kindOf(other) === kind) !== index
        )
            return;
        const inside: [string, BlockMark][] = blocks.filter(
            (other: [string, BlockMark]): boolean => kindOf(other) === kind && outside(other),
        );
        const fold: HTMLDetailsElement = folderOf("");
        const more: HTMLSpanElement = document.createElement("span");
        const less: HTMLSpanElement = document.createElement("span");
        more.className = "tree-more";
        more.textContent = `${inside.length} more`;
        less.className = "tree-less";
        iconPut(less, ChevronsDownUp, "Less");
        fold.firstElementChild?.append(
            kindBoxOf(kind),
            more,
            less,
            ...(kind === "Task" && next !== "" ? [` · ${next}`] : []),
        );
        fold.classList.add("tree-kind");
        fold.dataset.kind = kind;
        fold.open = opened.includes(kind) || inside.some((other: [string, BlockMark]): boolean => other[0] === shown);
        fold.lastElementChild?.append(...inside.map(linkOf));
        list.append(fold);
    });
    mathRender(list);
    return list;
}

/**
 * Puts the outline of the note shown under its entry, as Obsidian's outline, each heading `##` a link.
 * Each Example stands under the block above it, which then folds its tasks.
 * A cold `Task.` stands alone at the end of its section.
 * In a note of the older way `Task. … (cold)`, a plain `Task.` and a `Completion.` stand as an Example.
 * A block I folded stays folded.
 * - `block`: Link of the last block that is no task, until its first task makes it a folder.
 * - `tasks`: Place of the tasks below that block, the outline itself before the first block.
 *
 * @param round - The blocks of a section with their places in its round, `null` for any other note
 */
export function outlineShow(
    tree: HTMLElement,
    path: string,
    text: string,
    round: [string, BlockMark][] | null,
    shown: string,
    next: string,
): void {
    const entry: HTMLElement | null = tree.querySelector(`.tree-file.shown[data-path="${CSS.escape(path)}"]`);
    const folded: string[] = [
        ...tree.querySelectorAll<HTMLDetailsElement>(".tree-outline details.tree-folder:not(.tree-kind, [open])"),
    ].map(
        (folder: HTMLDetailsElement): string => folder.querySelector<HTMLElement>(".tree-file")?.dataset.heading ?? "",
    );
    const kinds: string[] = [...tree.querySelectorAll<HTMLDetailsElement>(".tree-round details.tree-kind[open]")].map(
        (fold: HTMLDetailsElement): string => fold.dataset.kind ?? "",
    );
    tree.querySelectorAll(".tree-outline").forEach((outline: Element): void => outline.remove());
    if (entry === null) return;
    if (round !== null) {
        entry.after(roundListOf(path, round, shown, kinds, next));
        return;
    }

    const outline: HTMLDivElement = document.createElement("div");
    const lines: string[] = text.split(/\r?\n/);
    const older: boolean = lines.some((line: string): boolean => /^## Task\..*\(cold\)[ \t]*$/.test(line));
    let block: HTMLAnchorElement | null = null;
    let tasks: HTMLElement = outline;
    outline.className = "tree-children tree-outline";
    lines.forEach((line: string): void => {
        const heading: string | undefined = /^##[ \t]+(.+?)[ \t]*$/.exec(line)?.[1];
        if (heading === undefined) return;
        const cold: boolean = older ? /^Task\..*\(cold\)$/.test(heading) : heading.startsWith("Task. ");
        const ladder: boolean =
            !cold &&
            (heading.startsWith("Example. ") ||
                heading.startsWith("Completion. ") ||
                (older && heading.startsWith("Task. ")));
        const name: string =
            cold || ladder
                ? heading.replace(/^(Task|Completion|Example)\.\s*/, "").replace(/[ \t]*\(cold\)$/, "")
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

/** A root of the tree, an area of its own in the rail. */
export type TreeRoot = "NomSkillingmodules" | "NomManageplannings";

/**
 * Loads one root of the tree and shows it, my new system loaded anew after every change of its files.
 * While no note is shown, the module asked for is picked with its first chapter.
 * Without one, the search and every module stand in place of the pickers.
 *
 * @param module - Folder of the module to open while none is shown
 * @throws {Error} - When the reader cannot answer
 */
export async function treeShow(tree: HTMLElement, root: TreeRoot, shown: string, module: string): Promise<void> {
    const heading: HTMLHeadingElement = document.createElement("h2");
    heading.className = "tree-root";
    heading.textContent = root;
    tree.classList.toggle("is-files", root === "NomManageplannings");
    if (root === "NomManageplannings") {
        const search: HTMLInputElement = document.createElement("input");
        const entries: HTMLElement[] = (await readerAsk<FileNode[]>("/api/edit/tree")).map(fileNodeOf);
        tree.replaceChildren(heading, searchFieldOf(search, "Search files"), ...entries);
        searchStart(tree, search);
        treeMark(tree, shown);
        changesFollow((): void => {
            filesAgain(tree, search, shown).catch((error: unknown): void => console.error(error));
        });
        return;
    }

    const link: HTMLAnchorElement = document.createElement("a");
    const modules: HTMLDivElement[] = (await readerAsk<NotesModule[]>("/api/notes/modules")).map(moduleNodeOf);
    const nameOf: (choice: HTMLElement) => string = (choice: HTMLElement): string => choice.dataset.title ?? "";
    const groupOf: (choice: HTMLElement) => string = (choice: HTMLElement): string => choice.dataset.group ?? "";
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
        (): HTMLElement[] => [...tree.querySelectorAll<HTMLElement>(".tree-module.picked > .tree-chapter")],
        (choice: HTMLElement): string => choice.dataset.chapter ?? "",
        null,
        (choice: HTMLElement): string => overviewAddressOf(moduleOf(), choice.dataset.chapter ?? ""),
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
    if (asked !== undefined) chapterShow(tree, asked, asked.querySelector<HTMLElement>(".tree-chapter"));
    else tree.replaceChildren(heading, ...choiceListOf(modules, nameOf, groupOf, moduleAddressOf));
}
