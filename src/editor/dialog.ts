/**
 * ## Dialog
 *
 * The day view's dialog of an entry and of a series, outside the day view.
 * It opens for a session or a box of the plan of a module or a meal in the food view.
 * Its HTML, code and look come into the page only the first time it opens, so no calendar loads before.
 */

import { timesStart } from "../day/times.ts";
import { readerAsk } from "../reader.ts";

import type * as Categories from "../day/categories.ts";
import type * as FullCalendar from "fullcalendar";
import type * as TimeGrid from "fullcalendar/timegrid";

/**
 * The dialog of an entry in the page, once started.
 *
 * - `calendar`: A calendar of a day, never drawn and without entries, which the dialog writes with.
 */
export type Dialog = {
    categories: typeof Categories;
    calendar: FullCalendar.Calendar;
};

/** The dialog once in the page and started, `null` before it opened first. */
let dialogReady: Promise<Dialog> | null = null;

/**
 * Puts the dialog of an entry into the page and starts it.
 * Its look loads in the order of the day view, so `choices.css` wins over `day.css` as there.
 */
async function dialogStart(): Promise<Dialog> {
    await import("../day/day.css");
    await import("../day/choices.css");
    await import("../day/meal.css");
    const html: string = (await import("../day/day.html?raw")).default;
    const categories: typeof Categories = await import("../day/categories.ts");
    const full: typeof FullCalendar = await import("fullcalendar");
    const timeGrid: typeof TimeGrid = await import("fullcalendar/timegrid");
    const calendar: FullCalendar.Calendar = new full.Calendar(document.createElement("div"), {
        plugins: [timeGrid.default],
        initialView: "timeGridDay",
    });
    const day: Document = new DOMParser().parseFromString(html, "text/html");
    document.body.append(
        ...["entry", "series", "series-under"].map((id: string): HTMLElement => day.getElementById(id) as HTMLElement),
    );
    categories.categoriesStart(calendar);
    timesStart();
    return { categories: categories, calendar: calendar };
}

/** The dialog of an entry, put into the page and started the first time. */
export function dialogOf(): Promise<Dialog> {
    dialogReady ??= dialogStart();
    return dialogReady;
}

/**
 * Opens the dialog to change an entry of the log, as a click on it in the log of the day does.
 * One the reader sends no more, or that cannot be changed like an occurrence of a series, opens nothing.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
export async function logEntryOpen(id: string, start: string): Promise<void> {
    const dialog: Dialog = await dialogOf();
    const moment: number = Date.parse(start);
    const found: FullCalendar.EventInput | undefined = (
        await readerAsk<FullCalendar.EventInput[]>(
            `/api/day/log?start=${new Date(moment).toISOString()}` + `&end=${new Date(moment + 1).toISOString()}`,
        )
    ).find((entry: FullCalendar.EventInput): boolean => entry.id === id);
    dialog.calendar.removeAllEvents();
    const entry: FullCalendar.EventApi | null = found === undefined ? null : dialog.calendar.addEvent(found);
    if (entry?.startEditable === true) await dialog.categories.entryOpenEdit(entry);
}
