/**
 * ## Folder
 *
 * A folder of my modules in the scripts view, at its address, in the look of the page of a module.
 * - On top the name of the folder, above it the path to it, each part a link.
 * - Below it its folders, then its files, each a row by its name.
 *   A folder opens here, a Markdown or `.ics` file in the editor, any other file in a new tab.
 * A folder the reader cannot read says so instead.
 */

import { folderAddressOf, noteAddressOf } from "../notes/tree.ts";
import { breakableOf, middleCutPut } from "../day/choices.ts";
import { elementOf } from "../food/foods.ts";
import "../day/boxes.css";
import "./overview.css";

/** What a folder of my modules holds. */
type NotesFolder = {
    folders: string[];
    files: string[];
};

/**
 * The path to a folder, `NomSkillingmodules` then each folder on the way, each a link after a `/`.
 *
 * @param path - Path of the folder from `NomSkillingmodules`
 */
export function pathOf(path: string): (Node | string)[] {
    const parts: string[] = path.split("/");
    return ["NomSkillingmodules", ...parts.slice(0, -1)].flatMap((name: string, index: number): (Node | string)[] => {
        const link: HTMLAnchorElement = document.createElement("a");
        link.href = index === 0 ? "/scripts" : folderAddressOf(parts.slice(0, index).join("/"));
        link.textContent = breakableOf(name);
        return index === 0 ? [link] : ["/\u200b", link];
    });
}

/**
 * The row of a folder or a file, its name cut in its middle so the ending of a file stays.
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
 * Shows a folder of my modules, its name and path at once, what it holds once the reader sent it.
 *
 * @param path - Path of the folder from `NomSkillingmodules`
 */
export async function folderShow(place: HTMLElement, path: string): Promise<void> {
    const inner: (name: string) => string = (name: string): string => `${path}/${name}`;
    const list: HTMLElement = place.querySelector(".folder-list") as HTMLElement;
    (place.querySelector(".folder-path") as HTMLElement).replaceChildren(...pathOf(path));
    (place.querySelector(".day-date") as HTMLElement).textContent = breakableOf(path.split("/").at(-1) ?? "");
    place.hidden = false;
    const response: Response = await fetch(`/api/notes/folder?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
        list.replaceChildren(elementOf("p", "plan-none", "This folder cannot be read"));
        return;
    }
    const folder: NotesFolder = (await response.json()) as NotesFolder;
    list.replaceChildren(
        ...folder.folders.map((name: string): HTMLAnchorElement => rowOf(name, folderAddressOf(inner(name)), false)),
        ...folder.files.map((name: string): HTMLAnchorElement =>
            /\.(md|ics)$/i.test(name)
                ? rowOf(name, noteAddressOf(inner(name), ""), false)
                : rowOf(name, `/api/notes/stream?path=${encodeURIComponent(inner(name))}`, true),
        ),
        ...(folder.folders.length + folder.files.length === 0 ? [elementOf("p", "plan-none", "Empty")] : []),
    );
}
