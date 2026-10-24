/**
 * ## Links
 *
 * Names a link of a skill entry, a document it used, by its name, the last part of its path,
 * like `04_LogisticPoissonRegression.pdf`, as a box lists its documents, see `../day/boxes.ts`; names the folder
 * of my modules, whose modules open in the scripts view, see `../day/skill.ts`; and shows the folder of a skill
 * as the link below a summary, in the dialog of an entry and in that of a series, see {@link folderLinkShow}.
 *
 * - `./attempts.ts`: Names a link as the reader sends it.
 * - `../day/choices.ts`: Cuts a long path in its middle.
 */

import { middleCutPut } from "../day/choices.ts";

import type { Link } from "./attempts.ts";


/**
 * Folder of my modules in `NomWorkspace`, the first part of the folder of a module.
 */
export const modulesFolder: string = "NomSkillingmodules";


/**
 * Gives the name of a link, the last part of its path.
 *
 * @param link - Link, like `NomSkillingmodules/IN2028_…/VO_…/04_LogisticPoissonRegression.pdf`
 * @returns Name, like `04_LogisticPoissonRegression.pdf`
 */
export function linkNameOf(link: Link): string {
    return link.path.split("/").at(-1) ?? link.path;
}

/**
 * Shows the folder of a skill as the link below its summary, small and grey, as a place has its address below it,
 * see `summaryPartsOf` in `../day/categories.ts`, and so below the summary of the dialog of a series, see
 * `../day/series.ts`: for a module a link that opens the folder it names in the scripts view, see
 * `../editor/folder.ts`, in this window, never a second one, lighter under the pointer, as the folder of a card
 * on the page of the module, for a project, which the scripts view has not, its path alone; hidden for none.
 * It shows its whole path from `NomWorkspace` on, like
 * `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`;
 * on one line, cut in its middle where it is wider than its row, as on a phone, so its last folder stays,
 * see `middleCutPut` in `../day/choices.ts`; its whole path as its tooltip.
 * - `shown`: The folder as it shows, a new element each time, so the cut of a folder shown before never writes
 *   into the link again, like into a web address an older entry kept, see `summaryPartsShow` in `../day/categories.ts`.
 *
 * @param link - The link below the summary
 * @param path - The folder, like
 *   `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons/TUM_2026W`
 *   or `NomManageplannings/NomFrequencediary`, empty for none
 */
export function folderLinkShow(link: HTMLAnchorElement, path: string): void {
    const shown: HTMLElement = document.createElement("span");
    middleCutPut(shown, path);
    shown.title = path;
    link.replaceChildren(shown);
    link.removeAttribute("target");
    if (path.startsWith(`${modulesFolder}/`))
        link.href = `/scripts?folder=${encodeURIComponent(path.slice(modulesFolder.length + 1))}`;
    else
        link.removeAttribute("href");
    link.hidden = path === "";
}
