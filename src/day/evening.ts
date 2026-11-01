/**
 * ## Evening
 *
 * My gratitude and my points about the day, two lists at the top of the daily note.
 * Both are saved a moment after I stop typing, by `Ctrl+S`, and when I leave a list or the day.
 */

import { noteShow, sectionsLoad, sectionSend } from "./note.ts";
import { pointsRead, pointsShow, pointsStart } from "./points.ts";
import type { SectionTitle } from "../../reader/note.ts";

/** A list of points of the daily note I write, by the section it writes into. */
type Box = {
    id: string;
    title: SectionTitle;
};

/** The lists of the daily note I write. */
const boxes: Box[] = [
    { id: "gratitude", title: "Gratitude" },
    { id: "about", title: "About" },
];

/** Milliseconds the typing has to pause before the fields are saved. */
const pause: number = 1000;

/** Day whose texts the fields hold, empty before the first day is shown. */
let shown: string = "";

/** Texts of the lists as last shown or saved, by the titles of their sections. */
let saved: Map<SectionTitle, string> = new Map();

/** Timer of the save waiting for the pause, 0 for none. */
let waiting: number = 0;

function listOf(box: Box): HTMLElement {
    return document.getElementById(box.id) as HTMLElement;
}

function textOf(box: Box): string {
    return pointsRead(listOf(box));
}

function errorShow(error: unknown): void {
    console.error(error);
    document.getElementById("note-boxes-error")?.removeAttribute("hidden");
}

/**
 * Saves each changed list one after the other, since both write into the same note.
 * Then shows the note again, which the first save of a day may create.
 *
 * @throws {Error} - When the reader does not take a text
 */
async function boxesSave(): Promise<void> {
    clearTimeout(waiting);
    const day: string = shown;
    const changed: Box[] = boxes.filter((box: Box): boolean => textOf(box) !== (saved.get(box.title) ?? ""));
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
 * Shows the lists of a day after saving the day shown before.
 * Its texts count as saved as the points show them, so a list only shown never saves.
 *
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

/** Folds the lists and the note, so plan and log take their height, folded at every start. */
function foldToggle(): void {
    const folded: boolean = (document.querySelector(".note-boxes") as HTMLElement).classList.toggle("note-folded");
    document
        .querySelectorAll(".note-fold")
        .forEach((fold: Element): void => fold.setAttribute("aria-expanded", String(!folded)));
}

/** Starts the lists, saved too when the page goes out of sight, so nothing typed gets lost. */
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
