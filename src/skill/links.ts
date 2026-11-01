/**
 * ## Links
 *
 * Names of links of skill entries and links into my vault below a summary.
 */

import { middleCutPut } from "../day/choices.ts";
import type { Link } from "../../reader/calendar.ts";

/** Folder of my modules in `NomWorkspace`. */
export const modulesFolder: string = "NomSkillingmodules";

/** Folder of my new system in `NomWorkspace`, which the editor shows. */
const planningsFolder: string = "NomManageplannings";

/** Name of a link, the last part of its path. */
export function linkNameOf(link: Link): string {
    return link.path.split("/").at(-1) ?? link.path;
}

/**
 * Address in the dashboard of a path from `NomWorkspace`.
 * A module folder in the scripts view, a Markdown or `.ics` file in the editor, another path in the tree.
 * Empty for a path outside these, which the dashboard does not show.
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
 * Shows a link into my vault below its summary, small and grey, opening in this window.
 * Its path alone where the dashboard does not show it.
 * Cut in its middle where it is too wide, so its last folder stays.
 * - `shown`: A new element each time, so an old cut never writes into the link again.
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
