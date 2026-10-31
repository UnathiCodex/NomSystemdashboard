/**
 * ## Folder
 *
 * A folder of my modules in the scripts view, at its address, like
 * `/scripts?folder=IN2028_BusinessAnalyticsMachineLearning%2FVO_UniversityLectureLessons%2FTUM_2026W`,
 * which the folder of the material of a card of the course opens, see `./course.ts`,
 * and so does the folder of a skill below its summary in the dialog of an entry,
 * see `skillPathShow` in `../day/skill.ts`;
 * kept simple, in the look of the page of a module, see `./overview.ts`:
 * - on top, where a module names itself, the name of the folder, like `TUM_2026W`,
 *   and above it, small and grey as the weekday above the date of the day,
 *   the path to it from `NomWorkspace` on, each part a link to its folder:
 *   `NomSkillingmodules` to the start of my modules,
 *   as the name of the root of the tree, every other folder here;
 * - below it its folders, then its files, as the reader lists them,
 *   see `folderRead` in `reader/notes.ts`, each a row by its name,
 *   as a section of a chapter on the page of a module:
 *   a folder opens here, a Markdown or `.ics` file in the editor,
 *   as a note of the tree, any other file, like a PDF, in a new tab of the browser,
 *   as the reader streams it, see `/api/notes/stream` in `reader/reader.ts`;
 *   an empty folder says `Empty`.
 * A folder the reader cannot read, like one not there, says so instead.
 * The tree on the left shows the module of the folder,
 * as for the page of the module, see `./editor.ts`.
 *
 * - `../notes/tree.ts`: The addresses of a note and of a folder in the scripts view.
 * - `../day/choices.ts`: Marks where a long name may go on below,
 *   and cuts the name of a file in its middle.
 * - `../food/foods.ts`: Makes elements.
 * - `../day/boxes.css`: Look of `Empty`, as the plan's `Nothing planned`.
 * - `./overview.css`: Look of the folder, as the page of a module.
 */

import { folderAddressOf, noteAddressOf } from "../notes/tree.ts";
import { breakableOf, middleCutPut } from "../day/choices.ts";
import { elementOf } from "../food/foods.ts";
import "../day/boxes.css";
import "./overview.css";

/**
 * What a folder of my modules holds, as the reader sends it,
 * see `NotesFolder` in `reader/notes.ts`.
 *
 * - `folders`: Names of its folders, like `TUM_2025W`.
 * - `files`: Names of its files, like `04_LogisticPoissonRegression.pdf`.
 */
type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * Makes the path to a folder on top, see the top of this file,
 * and so to a module on top of its page, see `./overview.ts`:
 * `NomSkillingmodules`, a link to the start of my modules,
 * then each folder on the way, a link to it, each after a `/`;
 * each name going on below where the path is wider than its room,
 * see {@link breakableOf}.
 * - `parts`: Its folders from `NomSkillingmodules` on.
 * - `link`: A link.
 *
 * @param path - Path of the folder from `NomSkillingmodules`,
 *   like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`
 * @returns The links of the path and the `/` between them
 */
export function pathOf(path: string): (Node | string)[] {
    const parts: string[] = path.split("/");
    return ["NomSkillingmodules", ...parts.slice(0, -1)].flatMap(
        (name: string, index: number): (Node | string)[] => {
            const link: HTMLAnchorElement = document.createElement("a");
            link.href =
                index === 0
                    ? "/scripts"
                    : folderAddressOf(parts.slice(0, index).join("/"));
            link.textContent = breakableOf(name);
            return index === 0 ? [link] : ["/\u200b", link];
        },
    );
}

/**
 * Makes the row of a folder or a file in the folder shown, see the top of this file:
 * its name, a link that opens it, cut in its middle where it is too long,
 * so the ending of a file stays, like `.pdf`,
 * see `middleCutPut` in `../day/choices.ts`, whole as its tooltip.
 * - `row`: The row.
 * - `shown`: Its name as it shows.
 *
 * @param name - Its name, like `TUM_2025W` or `04_LogisticPoissonRegression.pdf`
 * @param address - The address it opens, like `/scripts?folder=…`
 * @param tab - Whether it opens in a new tab of the browser, like a PDF
 * @returns The row
 */
function rowOf(name: string, address: string, tab: boolean): HTMLAnchorElement {
    const row: HTMLAnchorElement = document.createElement("a");
    const shown: HTMLElement = elementOf("span", "overview-name", "");
    row.className = "overview-row";
    row.href = address;
    if (tab) {
        row.target = "_blank";
        row.rel = "noopener";
    }
    middleCutPut(shown, name);
    row.append(shown);
    return row;
}

/**
 * Shows a folder of my modules in its place, see the top of this file:
 * its name and the path to it on top at once, see {@link pathOf},
 * and what it holds once the reader sent it, each a row, see {@link rowOf}.
 * - `inner`: Gives the path of a folder or a file in it.
 * - `list`: The place of its folders and files.
 * - `response`: Answer of the reader.
 * - `folder`: What it holds.
 *
 * @param place - Where the folder goes, see `#editor-folder` in `./editor.html`
 * @param path - Path of the folder from `NomSkillingmodules`,
 *   like `IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`
 */
export async function folderShow(place: HTMLElement, path: string): Promise<void> {
    const inner: (name: string) => string = (name: string): string => `${path}/${name}`;
    const list: HTMLElement = place.querySelector(".folder-list") as HTMLElement;
    (place.querySelector(".folder-path") as HTMLElement).replaceChildren(...pathOf(path));
    (place.querySelector(".day-date") as HTMLElement).textContent = breakableOf(
        path.split("/").at(-1) ?? "",
    );
    place.hidden = false;
    const response: Response = await fetch(
        `/api/notes/folder?path=${encodeURIComponent(path)}`,
    );
    if (!response.ok) {
        list.replaceChildren(elementOf("p", "plan-none", "This folder cannot be read"));
        return;
    }
    const folder: NotesFolder = (await response.json()) as NotesFolder;
    list.replaceChildren(
        ...folder.folders.map((name: string): HTMLAnchorElement =>
            rowOf(name, folderAddressOf(inner(name)), false),
        ),
        ...folder.files.map((name: string): HTMLAnchorElement =>
            /\.(md|ics)$/i.test(name)
                ? rowOf(name, noteAddressOf(inner(name), ""), false)
                : rowOf(
                      name,
                      `/api/notes/stream?path=${encodeURIComponent(inner(name))}`,
                      true,
                  ),
        ),
        ...(folder.folders.length + folder.files.length === 0
            ? [elementOf("p", "plan-none", "Empty")]
            : []),
    );
}
