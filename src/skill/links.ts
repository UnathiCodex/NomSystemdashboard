/**
 * ## Links
 *
 * Names a link of a skill entry by the last part of its path, see `../day/boxes.ts`,
 * names the folder of my modules, see `../day/skill.ts`,
 * and shows the folder of a skill as the link below a summary,
 * see {@link folderLinkShow}.
 */

import { middleCutPut } from "../day/choices.ts";
import type { Link } from "../../reader/calendar.ts";

/**
 * Folder of my modules in `NomWorkspace`, the first part of the folder of a module.
 */
export const modulesFolder: string = "NomSkillingmodules";

/**
 * Gives the name of a link, the last part of its path.
 */
export function linkNameOf(link: Link): string {
    return link.path.split("/").at(-1) ?? link.path;
}

/**
 * Shows the folder of a skill as the link below its summary, small and grey,
 * as a place has its address below it, see `summaryPartsOf` in `../day/categories.ts`.
 * For a module a link that opens its folder in the scripts view,
 * see `../editor/folder.ts`,
 * in this window, for a project, which the scripts view has not, its path alone.
 * Cut in its middle where it is wider than its row, so its last folder stays.
 * - `shown`: A new element each time,
 *   so the cut of a folder shown before never writes into the link again.
 */
export function folderLinkShow(link: HTMLAnchorElement, path: string): void {
    const shown: HTMLElement = document.createElement("span");
    middleCutPut(shown, path);
    shown.title = path;
    link.replaceChildren(shown);
    link.removeAttribute("target");
    if (path.startsWith(`${modulesFolder}/`))
        link.href =
            "/scripts?folder=" + encodeURIComponent(path.slice(modulesFolder.length + 1));
    else link.removeAttribute("href");
    link.hidden = path === "";
}
