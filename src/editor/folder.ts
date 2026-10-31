/**
 * ## Folder
 *
 * A folder of my modules in the scripts view, at its address,
 * which the folder of the material of a card of the course opens, see `./course.ts`,
 * and so does the folder of a skill in the dialog of an entry,
 * see `skillPathShow` in `../day/skill.ts`;
 * kept simple, in the look of the page of a module, see `./overview.ts`:
 * - on top the name of the folder, above it the path to it, each part a link;
 * - below it its folders, then its files, as the reader lists them,
 *   see `folderRead` in `reader/notes.ts`, each a row by its name:
 *   a folder opens here, a Markdown or `.ics` file in the editor,
 *   any other file in a new tab of the browser,
 *   as the reader streams it, see `/api/notes/stream` in `reader/reader.ts`.
 * A folder the reader cannot read says so instead.
 * The tree on the left shows the module of the folder, see `./editor.ts`.
 */

import { folderAddressOf, noteAddressOf } from "../notes/tree.ts";
import { breakableOf, middleCutPut } from "../day/choices.ts";
import { elementOf } from "../food/foods.ts";
import "../day/boxes.css";
import "./overview.css";

/**
 * What a folder of my modules holds, see `NotesFolder` in `reader/notes.ts`.
 */
type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * Makes the path to a folder, and so to a module on top of its page:
 * `NomSkillingmodules`, a link to the start of my modules,
 * then each folder on the way, a link to it, each after a `/`.
 *
 * @param path - Path of the folder from `NomSkillingmodules`
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
 * Makes the row of a folder or a file in the folder shown,
 * its name cut in its middle where it is too long, so the ending of a file stays,
 * whole as its tooltip.
 *
 * @param tab - Whether it opens in a new tab of the browser
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
 * Shows a folder of my modules in its place:
 * its name and the path to it on top at once,
 * and what it holds once the reader sent it.
 *
 * @param place - Where the folder goes, see `#editor-folder` in `./editor.html`
 * @param path - Path of the folder from `NomSkillingmodules`
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
