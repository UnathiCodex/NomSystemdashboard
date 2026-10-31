/**
 * ## Tree
 *
 * The tree on the left of the editor, see `../editor/editor.ts`,
 * which is the scripts view too,
 * as Obsidian's file explorer, of one of two roots at a time,
 * each an area of its own in the rail:
 * - `NomSkillingmodules`, the book, every module of mine, one at a time,
 *   since I learn one module at a time:
 *   the module and chapter picked, each a line that opens its menu, see {@link pickerOf},
 *   then the notes of that chapter as a plain list, nothing folding;
 *   while no module is picked, on the start of the scripts,
 *   its search and every module instead, grouped by semester, see {@link choiceListOf};
 * - `NomManageplannings`, the open folder, my new system,
 *   as the reader lists it, see `reader/files.ts`:
 *   a Markdown file opens in the editor to edit,
 *   an `.ics` file as its plain text to read, any other file shows faint and opens not.
 * The name of the root stands on top as a heading that never folds,
 * so nothing lies deeper than it needs.
 * Of my new system a search filters the tree as I type, see {@link searchStart}.
 * Under the note shown stands its outline, see {@link outlineShow};
 * under a section its blocks in the places of its round, see {@link roundListOf}.
 * Each name stands on one line, one too long for it ending in dots,
 * a file of my new system cut in its middle instead, so its ending stays in sight,
 * see {@link fileNodeOf}; each whole as its tooltip.
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
 * A folder or file of `NomManageplannings`, as the reader sends it.
 *
 * - `opens`: Whether the editor opens it:
 *   a Markdown or `.ics` file of the folders of my new system.
 */
type FileNode = {
    name: string;
    path: string;
    folder: boolean;
    opens: boolean;
    children: FileNode[];
};

/** A note of a chapter, as the reader sends it, its path from `NomSkillingmodules`. */
type NoteEntry = {
    name: string;
    path: string;
};

/** A chapter with its notes, as the reader sends it. */
type Chapter = {
    title: string;
    notes: NoteEntry[];
};

/**
 * A module with its chapters, as the reader sends it,
 * in the order of the list of the modules, see `menuRead` in `reader/notes.ts`.
 *
 * - `semester`: The semester it stands under in the list:
 *   for a module of the semester that of today, else the last I took it in.
 * - `chapters`: Its chapters that hold notes.
 */
export type NotesModule = {
    name: string;
    title: string;
    semester: string;
    chapters: Chapter[];
};

/**
 * Makes a folder of the tree that folds, its name whole as its tooltip,
 * its entries to go into its last child.
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

/** Builds the address of a note in the scripts view, at a heading or the top. */
export function noteAddressOf(path: string, heading: string): string {
    const address: string = `/scripts?path=${encodeURIComponent(path)}`;
    if (heading === "") return address;
    return `${address}#${encodeURIComponent(heading)}`;
}

/**
 * Builds the address of the page of a module in the scripts view,
 * see `../editor/overview.ts`, or of one of its chapters.
 */
export function overviewAddressOf(module: string, chapter: string): string {
    const address: string = `/scripts?module=${encodeURIComponent(module)}`;
    if (chapter === "") return address;
    return `${address}&chapter=${encodeURIComponent(chapter)}`;
}

/**
 * Builds the address of a folder of my modules in the scripts view,
 * see `../editor/folder.ts`.
 */
export function folderAddressOf(path: string): string {
    return `/scripts?folder=${encodeURIComponent(path)}`;
}

/**
 * Finds the place in `NomWorkspace` a relative link of a file leads to,
 * as VSCodium follows it, `%20` and the like decoded, as the reader reads a link.
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
 * Builds the address the dashboard opens a place of `NomWorkspace` at,
 * see {@link linkPlaceOf}: a Markdown or `.ics` file of my new system in the editor,
 * a note of my modules in the scripts view, the folder of a module as its overview;
 * empty for any other place, like a PDF or my old system,
 * which opens only on the computer.
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
 * Makes a folder or file of `NomManageplannings`: a folder with its path,
 * so it opens again once the tree is loaded anew, see {@link filesAgain};
 * a file that opens as a link to it in the editor,
 * cut in its middle where it is too long, so its ending stays,
 * see `middleCutPut` in `../day/choices.ts`;
 * any other file faint, opening nothing, its tooltip saying why.
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
    name.title =
        `${node.name}\n` + "Only .md and .ics files of the folders of my new system open";
    return name;
}

/**
 * Folds the outline of the note shown, or the blocks of a section,
 * away on a click on its entry, as a folder closes,
 * and opens it again on a further click,
 * the note staying open: `tree-folded` hides the outline below it, see `./notes.css`,
 * and stays on it while the outline is built anew, see {@link outlineShow}.
 * A click on another note, on a note without an outline,
 * or with a key held, acts as usual.
 * - {@link Event#stopPropagation}: Keeps the click from the tree,
 *   which would scroll the note to its top, see `treeClick` in `../editor/editor.ts`.
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
 * its names and its group as data, so it can be picked, see {@link choiceListOf},
 * the group `Other` for one without semester;
 * its chapters in it, their notes a plain list, named without `.md` as in Obsidian;
 * a module without chapter notes, like most of my earlier modules,
 * holds a calm `No notes yet`.
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
 * Makes a list of choices to pick from:
 * every module on the start of the scripts,
 * or the menu of a picker, see {@link pickerOf};
 * each choice a row, a link to the overview of what it picks,
 * see `../editor/overview.ts`, the one picked in the light text,
 * see `.tree-choice` in `./notes.css`.
 * A list of the modules, too many to see at once,
 * has the one search field of the page on top, see `searchFieldOf` in `../icons.ts`,
 * which compares as every search of the page, see `../search.ts`,
 * and Enter opens the first;
 * each group named small and grey above its first module.
 * - `show`: Shows the choices found from the top of the list,
 *   so the first one, which Enter opens, is in sight.
 *
 * @param groupOf - Gives the group of a choice,
 *   `null` for a list without search and groups, that of the chapters
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
        found = choices.filter((choice: HTMLElement): boolean =>
            matchesAll(nameOf(choice), words),
        );
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
        if (event.key === "Enter" && found.length > 0)
            location.assign(addressOf(found[0]));
    });
    show();
    return groupOf === null ? [list] : [searchFieldOf(input, "Search modules"), list];
}

/**
 * Makes a picker of the tree of my modules:
 * a row, the name of what is picked, no arrow,
 * since a click on it opens its menu, the browser's own popover;
 * the menu holds its list of choices, made anew each time it opens,
 * see {@link choiceListOf}, the cursor in its search, the one picked scrolled into sight.
 *
 * @param kind - What it picks, `module` or `chapter`, which names its anchor,
 *   see `.tree-pick` in `./notes.css`
 * @param groupOf - Gives the group of a choice,
 *   `null` for a menu without search and groups, that of the chapters
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
 * Shows one chapter of one module in the tree of my modules:
 * their names in their pickers, the notes of that chapter below,
 * every other module and chapter hidden;
 * a module without chapters shows its hint `No notes yet` and no picker of chapters.
 *
 * @param chapter - A chapter of it, `null` for a module without chapters
 */
export function chapterShow(
    tree: HTMLElement,
    module: HTMLElement,
    chapter: HTMLElement | null,
): void {
    tree.querySelectorAll<HTMLElement>(".tree-module").forEach(
        (other: HTMLElement): void => {
            other.classList.toggle("picked", other === module);
        },
    );
    module
        .querySelectorAll<HTMLElement>(".tree-chapter")
        .forEach((other: HTMLElement): void => {
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
 * Marks the file or note shown in the tree, and no other:
 * picks the module and chapter of a note, see {@link chapterShow},
 * opens every folder on the way to a file and scrolls the tree to it.
 * `null` while it is not in the tree,
 * like a note outside the chapter folders of its module.
 */
export function treeMark(tree: HTMLElement, shown: string): HTMLElement | null {
    tree.querySelectorAll(".tree-file.shown").forEach((file: Element): void =>
        file.classList.remove("shown"),
    );
    const link: HTMLElement | null =
        shown === ""
            ? null
            : tree.querySelector(`.tree-file[data-path="${CSS.escape(shown)}"]`);
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
 * Escape empties the search by the browser itself, which then tells `input`,
 * and so does the tree loaded anew, see {@link filesAgain}.
 * - `opened`: Paths of the folders open before the search, `null` while nothing is typed;
 *   paths, not the folders themselves,
 *   so they still name the folders of the tree loaded anew.
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
            file.classList.toggle(
                "tree-unfound",
                !matchesAll(file.dataset.path ?? "", words),
            );
        });
        folders.forEach((folder: HTMLDetailsElement): void => {
            const found: boolean =
                folder.querySelector(".tree-file:not(.tree-unfound)") !== null;
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
 * the search filters them for its text, and the tree stays scrolled where it was;
 * the search keeps its place, so typing in it goes on.
 *
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
    const entries: HTMLElement[] = (await readerAsk<FileNode[]>("/api/edit/tree")).map(
        fileNodeOf,
    );
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
 * done, done with its last result failed, like a Task after Wrong,
 * still to do in the round, the current step among them, or outside the round.
 */
export type BlockMark = "done" | "wrong" | "round" | "other";

/**
 * Type word of a block of a section at the start of its heading,
 * with the dot and space after it.
 */
export const kindRule: RegExp =
    /^(Definition|Theorem|Lemma|Algorithm|Example|Task)\.[ \t]+/;

/**
 * Type words as the tree writes them, short, so the names beside them keep their room,
 * like `Def` for `Definition`; the note writes them out.
 */
const kindShorts: Map<string, string> = new Map([
    ["Definition", "Def"],
    ["Theorem", "Thm"],
    ["Lemma", "Lem"],
    ["Algorithm", "Alg"],
    ["Example", "Ex"],
    ["Task", "Task"],
]);

/**
 * Builds the name of a block for the list of its section:
 * its type word as a small grey box, then its name, rendered, without an older `(cold)`.
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
 * Builds the small grey box of a type word, short, see {@link kindShorts}
 * and `.block-kind` in `../base.css`.
 */
function kindBoxOf(kind: string): HTMLSpanElement {
    const box: HTMLSpanElement = document.createElement("span");
    box.className = "block-kind";
    box.textContent = kindShorts.get(kind) ?? kind;
    return box;
}

/**
 * Builds the list of the blocks of a section in their order, each linking to its heading:
 * an Example or a Task done with a check after it,
 * or with a cross, the one its heading line has, once its last result failed;
 * theory, which is never right or wrong, only done, with a check in a ring,
 * the close of a round in the head of the editor;
 * the one shown in the light text of what is shown, where I am,
 * one still to do in the round grey, one outside the round fainter.
 * Every block of the section stands in it, never hidden without a trace:
 * once two or more blocks of one kind are outside the round,
 * like the Examples and Tasks round 0 does not need,
 * they fold into one grey line of their kind after its last block,
 * like `Task` boxed and `7 more`, the line of the Tasks with the day the next one comes,
 * which opens them on a click, as a folder;
 * one alone stays a line of its own, since folding it saves no room.
 * A line I opened stays open while the list is built anew,
 * and the one holding the block shown opens.
 *
 * @param shown - Heading of the block shown, see `roundShownOf` in `../editor/round.ts`
 * @param opened - Type words whose lines were open in the list before
 * @param next - The day the next Task comes, see `roundNextOf` in `../editor/round.ts`
 */
export function roundListOf(
    path: string,
    blocks: [string, BlockMark][],
    shown: string,
    opened: string[],
    next: string,
): HTMLElement {
    const list: HTMLDivElement = document.createElement("div");
    const kindOf: (block: [string, BlockMark]) => string = (
        block: [string, BlockMark],
    ): string => kindRule.exec(block[0])?.[1] ?? "";
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
    const outside: (block: [string, BlockMark]) => boolean = (
        block: [string, BlockMark],
    ): boolean => block[1] === "other";
    const folded: string[] = [...new Set(blocks.map(kindOf))].filter(
        (kind: string): boolean =>
            kind !== "" &&
            blocks.filter(
                (block: [string, BlockMark]): boolean =>
                    kindOf(block) === kind && outside(block),
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
            (other: [string, BlockMark]): boolean =>
                kindOf(other) === kind && outside(other),
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
        fold.open =
            opened.includes(kind) ||
            inside.some((other: [string, BlockMark]): boolean => other[0] === shown);
        fold.lastElementChild?.append(...inside.map(linkOf));
        list.append(fold);
    });
    mathRender(list);
    return list;
}

/**
 * Puts the outline of the note shown under its entry in the tree, as Obsidian's outline:
 * each heading `##` in order, linking to it,
 * each Example under the block above it that is no task,
 * which then folds its tasks by its arrow and still links to its heading by its name;
 * tasks named without their type word, formulas rendered as in the note.
 * A block without tasks below it stays a plain link,
 * and so does a task without such a block above it;
 * a cold task, a `Task.`, in a note written the older way `Task. … (cold)`,
 * named also without `(cold)`, stands alone, at the end of its section;
 * there a plain `Task.` and a `Completion.` stand as an Example.
 * The outline put before goes; a block I folded in it stays folded.
 * A section shows the blocks of its round instead, see {@link roundListOf}.
 * - `block`: Link of the last block that is no task,
 *   until its first task makes it a folder.
 * - `tasks`: Place of the tasks below that block,
 *   the outline itself before the first block.
 *
 * @param round - Headings of the blocks of a section with their places in its round,
 *   `null` for any other note
 */
export function outlineShow(
    tree: HTMLElement,
    path: string,
    text: string,
    round: [string, BlockMark][] | null,
    shown: string,
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
        ...tree.querySelectorAll<HTMLDetailsElement>(
            ".tree-round details.tree-kind[open]",
        ),
    ].map((fold: HTMLDetailsElement): string => fold.dataset.kind ?? "");
    tree.querySelectorAll(".tree-outline").forEach((outline: Element): void =>
        outline.remove(),
    );
    if (entry === null) return;
    if (round !== null) {
        entry.after(roundListOf(path, round, shown, kinds, next));
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

/** A root of the tree, an area of its own in the rail: my modules or my new system. */
export type TreeRoot = "NomSkillingmodules" | "NomManageplannings";

/**
 * Loads one root of the tree from the reader and shows it, see the top of this file,
 * those of my new system loaded anew after every change of its files,
 * see {@link filesAgain}, the file or note shown marked, see {@link treeMark}.
 * In the modules, while none is shown, the module asked for is picked,
 * like the module of a skill entry clicked in the day,
 * see `../skill/links.ts`, with its first chapter;
 * else none, the start then showing the search and every module in place of the pickers.
 * - `moduleOf`: Gives the name of the folder of the module picked,
 *   for the address of the overview of a chapter.
 *
 * @param module - Name of the folder of the module to open while none is shown
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
        const entries: HTMLElement[] = (
            await readerAsk<FileNode[]>("/api/edit/tree")
        ).map(fileNodeOf);
        tree.replaceChildren(heading, searchFieldOf(search, "Search files"), ...entries);
        searchStart(tree, search);
        treeMark(tree, shown);
        changesFollow((): void => {
            filesAgain(tree, search, shown).catch((error: unknown): void =>
                console.error(error),
            );
        });
        return;
    }

    const link: HTMLAnchorElement = document.createElement("a");
    const modules: HTMLDivElement[] = (
        await readerAsk<NotesModule[]>("/api/notes/modules")
    ).map(moduleNodeOf);
    const nameOf: (choice: HTMLElement) => string = (choice: HTMLElement): string =>
        choice.dataset.title ?? "";
    const groupOf: (choice: HTMLElement) => string = (choice: HTMLElement): string =>
        choice.dataset.group ?? "";
    const moduleAddressOf: (choice: HTMLElement) => string = (
        choice: HTMLElement,
    ): string => overviewAddressOf(choice.dataset.module ?? "", "");
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
    else
        tree.replaceChildren(
            heading,
            ...choiceListOf(modules, nameOf, groupOf, moduleAddressOf),
        );
}
