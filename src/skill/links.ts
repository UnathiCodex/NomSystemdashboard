/**
 * ## Links
 *
 * Names a link of a skill entry by the last part of its path, see `../day/boxes.ts`,
 * names the folder of my modules, see `../day/skill.ts`,
 * and shows a link into my vault, like that of a skill, as the link below a summary,
 * see {@link folderLinkShow}.
 */

import { middleCutPut } from "../day/choices.ts";
import type { Link } from "../../reader/calendar.ts";

/**
 * Folder of my modules in `NomWorkspace`, the first part of the folder of a module.
 */
export const modulesFolder: string = "NomSkillingmodules";

/**
 * Folder of my new system in `NomWorkspace`, which the editor shows, see `../editor/editor.ts`.
 */
const planningsFolder: string = "NomManageplannings";

/**
 * Gives the name of a link, the last part of its path.
 */
export function linkNameOf(link: Link): string {
    return link.path.split("/").at(-1) ?? link.path;
}

/**
 * Gives the address in the dashboard of a path into my vault, from `NomWorkspace`:
 * a folder of my modules in the scripts view, see `../editor/folder.ts`,
 * of my new system a Markdown or `.ics` file in the editor and any other path its folder
 * opened in the tree, see `treeMark` in `../notes/tree.ts`;
 * empty for any other path, which the dashboard does not show, like the folder of a project
 * outside my new system.
 */
function vaultAddressOf(path: string): string {
    if (path.startsWith(`${modulesFolder}/`))
        return "/scripts?folder=" + encodeURIComponent(path.slice(modulesFolder.length + 1));
    if (path !== planningsFolder && !path.startsWith(`${planningsFolder}/`)) return "";
    const inner: string = path.slice(planningsFolder.length + 1);
    if (/\.(md|ics)$/i.test(inner)) return "/edit?file=" + encodeURIComponent(inner);
    return inner === "" ? "/plannings" : "/plannings?folder=" + encodeURIComponent(inner);
}

/**
 * Shows a link into my vault, like the link of a skill, below its summary, small and grey,
 * as a place has its address below it, see `summaryPartsOf` in `../day/categories.ts`:
 * a link that opens it in the dashboard in this window, see {@link vaultAddressOf},
 * its path alone where the dashboard does not show it.
 * Cut in its middle where it is wider than its row, so its last folder stays.
 * - `shown`: A new element each time,
 *   so the cut of a folder shown before never writes into the link again.
 */
export function folderLinkShow(link: HTMLAnchorElement, path: string): void {
    const shown: HTMLElement = document.createElement("span");
    const address: string = vaultAddressOf(path);
    middleCutPut(shown, path);
    shown.title = path;
    link.replaceChildren(shown);
    link.removeAttribute("target");
    if (address !== "") link.href = address;
    else link.removeAttribute("href");
    link.hidden = path === "";
}
