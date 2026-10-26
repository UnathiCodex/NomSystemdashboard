/**
 * ## Evening
 *
 * What I write into the daily note of the shown day, any time of the day, at the top of the note,
 * each a list of points in the editor of my files, see `points.ts`:
 * my gratitude into the section `## Gratitude`,
 * and my points about the day overall into the section `## About`, both apart,
 * though they go hand in hand.
 * Both are saved into the day's note a moment after I stop typing,
 * at once by `Ctrl+S` in a list, and when I leave a list or the day;
 * the note below leaves both sections out.
 * It is all that is left of the evening panel:
 * what happened is my log and the boxes for tomorrow are plan entries,
 * so neither is written any more, and the notes keep what they hold.
 *
 * - `./note.ts`: Loads and writes the sections of a daily note and shows the note.
 * - `./points.ts`: A list of points, a small editor of Markdown.
 */

import { noteShow, sectionsLoad, sectionSend } from "./note.ts";
import { pointsRead, pointsShow, pointsStart } from "./points.ts";

import type { SectionTitle } from "./note.ts";

/**
 * A list of points of the daily note I write.
 *
 * - `id`: Identifier of its list, like `gratitude`.
 * - `title`: Section it writes into, like `Gratitude`.
 */
type Box = {
    id: string;
    title: SectionTitle;
};

/**
 * The lists of the daily note I write: my gratitude and my points about the day.
 */
const boxes: Box[] = [
    { id: "gratitude", title: "Gratitude" },
    { id: "about", title: "About" },
];

/**
 * Milliseconds the typing has to pause before the fields are saved.
 */
const pause: number = 1000;

/**
 * Day whose texts the fields hold, like `2026-10-10`, empty before the first day is shown.
 */
let shown: string = "";

/**
 * Texts of the lists as last shown or saved,
 * as their sections hold them, by the titles of the sections.
 */
let saved: Map<SectionTitle, string> = new Map();

/**
 * Timer of the save waiting for the pause, 0 for none.
 */
let waiting: number = 0;

/**
 * Gives the list of points of a box.
 *
 * @param box - Box
 * @returns Its list
 */
function listOf(box: Box): HTMLElement {
    return document.getElementById(box.id) as HTMLElement;
}

/**
 * Reads the text of a box, the Markdown of its points, see `points.ts`.
 *
 * @param box - Box
 * @returns Its text
 */
function textOf(box: Box): string {
    return pointsRead(listOf(box));
}

/**
 * Shows the hint that the reader did not take a text.
 *
 * @param error - Error of the request
 */
function errorShow(error: unknown): void {
    console.error(error);
    document.getElementById("note-boxes-error")?.removeAttribute("hidden");
}

/**
 * Saves each list whose text changed, one after the other, since both write into the same note,
 * then shows the note again, which the first save of a day may create.
 * - `day`: Day the texts belong to.
 * - `changed`: Lists whose text changed since it was loaded or saved.
 *
 * @throws {Error} - When the reader does not take a text
 */
async function boxesSave(): Promise<void> {
    clearTimeout(waiting);
    const day: string = shown;
    const changed: Box[] = boxes.filter(
        (box: Box): boolean => textOf(box) !== (saved.get(box.title) ?? ""),
    );
    if (day === "" || changed.length === 0) return;

    for (const box of changed) {
        const text: string = textOf(box);
        await sectionSend(day, box.title, text);
        saved.set(box.title, text);
    }
    document.getElementById("note-boxes-error")?.setAttribute("hidden", "");
    if (day === shown) await noteShow(day);
}

/**
 * Shows my gratitude and my points about a day,
 * after saving what was typed for the day shown before;
 * its texts count as saved as the points show them,
 * so only what I type saves, never a list only shown,
 * like the empty point of a section without points, see `points.ts`.
 * - `sections`: Sections of the day's note.
 *
 * @param day - Day like `2026-10-10`
 * @throws {Error} - When the reader gives no valid answer
 */
export async function eveningShow(day: string): Promise<void> {
    await boxesSave().catch(errorShow);
    shown = day;
    const sections: { [title in SectionTitle]: string } = await sectionsLoad(day);
    if (day !== shown) return;
    boxes.forEach((box: Box): void => pointsShow(listOf(box), sections[box.title]));
    saved = new Map(boxes.map((box: Box): [SectionTitle, string] => [box.title, textOf(box)]));
    document.getElementById("note-boxes-error")?.setAttribute("hidden", "");
}

/**
 * Hides both lists and the note below them,
 * or shows them again, after a click on the name of either list, so plan and log take their height;
 * folded at every start, see `.note-fold` in `note.css`.
 * - `folded`: Whether they are hidden now.
 */
function foldToggle(): void {
    const folded: boolean = (document.querySelector(".note-boxes") as HTMLElement).classList.toggle(
        "note-folded",
    );
    document
        .querySelectorAll(".note-fold")
        .forEach((fold: Element): void => fold.setAttribute("aria-expanded", String(!folded)));
}

/**
 * Starts the lists after the router has put their HTML into the page, each a list of points,
 * see `points.ts`, saved a moment after the typing pauses, at once by `Ctrl+S`,
 * which then saves no web page, when the focus leaves the list,
 * and when the page goes out of sight, like when I close it or switch to another app,
 * so nothing typed gets lost; their names fold them, see {@link foldToggle}.
 */
export function eveningStart(): void {
    document
        .querySelectorAll(".note-fold")
        .forEach((fold: Element): void => fold.addEventListener("click", foldToggle));
    document.addEventListener("visibilitychange", (): void => {
        if (document.visibilityState === "hidden") boxesSave().catch(errorShow);
    });
    boxes.forEach((box: Box): void => {
        listOf(box).addEventListener("keydown", (event: KeyboardEvent): void => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
            event.preventDefault();
            boxesSave().catch(errorShow);
        });
        pointsStart(
            listOf(box),
            (): void => {
                clearTimeout(waiting);
                waiting = window.setTimeout((): void => {
                    boxesSave().catch(errorShow);
                }, pause);
            },
            (): void => {
                boxesSave().catch(errorShow);
            },
        );
    });
}
