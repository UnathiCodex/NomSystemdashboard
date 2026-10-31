/**
 * ## Dialog
 *
 * The day view's own dialog of an entry, the one I log every entry with in the calendar,
 * see `../day/categories.ts`, in the scripts view:
 * for the session the learning view asks for before it records, see `./session.ts`,
 * and for a box of the plan tapped on the page of a module,
 * which it opens as the day view does,
 * see `./course.ts`; with it the day view's dialog of a series,
 * which the page of a module opens,
 * see `../day/series.ts`; and in the food view for a meal of the day shown,
 * which it opens as a click on it in the log does, see {@link logEntryOpen}.
 * The dialog, its HTML from `../day/day.html`,
 * its code and its look come into the page only the first time it opens,
 * so the scripts load no calendar before.
 *
 * - `../day/day.html?raw`: Html of the day as text, of which the dialogs `#entry`,
 *   `#series` and the still copy below a group, `#series-under`.
 * - `../day/categories.ts`: Starts the dialog and opens it.
 * - `../day/times.ts`: Starts the fields of the times of the dialog,
 *   as the day view starts them.
 * - `../reader.ts`: Asks the reader for an entry of the log.
 * - `fullcalendar`, `fullcalendar/timegrid`: A calendar of a day, never drawn,
 *   which the dialog's writes ask for, to load its log again.
 * - `../day/day.css`, `../day/choices.css`, `../day/meal.css`:
 *   Look of the dialog and of its fields.
 */

import { timesStart } from "../day/times.ts";
import { readerAsk } from "../reader.ts";

import type * as Categories from "../day/categories.ts";
import type * as FullCalendar from "fullcalendar";
import type * as TimeGrid from "fullcalendar/timegrid";

/**
 * The dialog of an entry in the page, once started, see {@link dialogOf}.
 *
 * - `categories`: The code of the dialog, which opens it for an entry or a box.
 * - `calendar`: A calendar of a day, never drawn and without entries,
 *   which the dialog writes with,
 *   like a box logged, since the scripts view shows no log;
 *   only the entry the food view opens, see {@link logEntryOpen}.
 */
export type Dialog = {
    categories: typeof Categories;
    calendar: FullCalendar.Calendar;
};

/**
 * The dialog once in the page and started, `null` before it opened first.
 */
let dialogReady: Promise<Dialog> | null = null;

/**
 * Puts the dialog of an entry of the day into the page and starts it,
 * see `categoriesStart` in `../day/categories.ts`,
 * with a calendar of a day as the day view has,
 * but never drawn and without entries, since the scripts view shows no log;
 * its look loaded in the order the day loads it,
 * so `choices.css` wins over `day.css` as there,
 * like a row that keeps only a list taking no room;
 * its times and days checked and written as the day view does,
 * see `timesStart` in `../day/times.ts`, like `14:15` of `1415`.
 * - `html`, `categories`, `full`, `timeGrid`:
 *   The HTML of the day, with the dialogs `#entry` and `#series`, the code of the dialog,
 *   that of the calendar and of its view of a day.
 * - `day`: The HTML of the day as a document, whose dialogs go into the page.
 * - `calendar`: The calendar, never drawn.
 *
 * @returns The dialog
 */
async function dialogStart(): Promise<Dialog> {
    await import("../day/day.css");
    await import("../day/choices.css");
    await import("../day/meal.css");
    const html: string = (await import("../day/day.html?raw")).default;
    const categories: typeof Categories = await import("../day/categories.ts");
    const full: typeof FullCalendar = await import("fullcalendar");
    const timeGrid: typeof TimeGrid = await import("fullcalendar/timegrid");
    const calendar: FullCalendar.Calendar = new full.Calendar(
        document.createElement("div"),
        {
            plugins: [timeGrid.default],
            initialView: "timeGridDay",
        },
    );
    const day: Document = new DOMParser().parseFromString(html, "text/html");
    document.body.append(
        ...["entry", "series", "series-under"].map(
            (id: string): HTMLElement => day.getElementById(id) as HTMLElement,
        ),
    );
    categories.categoriesStart(calendar);
    timesStart();
    return { categories: categories, calendar: calendar };
}

/**
 * Gives the dialog of an entry,
 * put into the page and started the first time, see {@link dialogStart}.
 *
 * @returns The dialog
 */
export function dialogOf(): Promise<Dialog> {
    dialogReady ??= dialogStart();
    return dialogReady;
}

/**
 * Opens the dialog to change an entry of the log,
 * as a click on it in the log of the day does,
 * see `entryOpenEdit` in `../day/categories.ts`:
 * the entry as the reader sends it to the day view, in the calendar of the dialog alone;
 * one the reader sends no more, or that cannot be changed,
 * like an occurrence of a series, opens nothing, as there.
 * - `dialog`: The dialog.
 * - `moment`: The start of the entry, in milliseconds.
 * - `found`: The entry as the reader sends it, `undefined` for none.
 * - `entry`: The entry in the calendar of the dialog.
 *
 * @param id - Identifier of the entry
 * @param start - Its start as ISO instant
 * @throws {Error} - When the reader gives no valid answer
 */
export async function logEntryOpen(id: string, start: string): Promise<void> {
    const dialog: Dialog = await dialogOf();
    const moment: number = Date.parse(start);
    const found: FullCalendar.EventInput | undefined = (
        await readerAsk<FullCalendar.EventInput[]>(
            `/api/day/log?start=${new Date(moment).toISOString()}&end=${new Date(moment + 1).toISOString()}`,
        )
    ).find((entry: FullCalendar.EventInput): boolean => entry.id === id);
    dialog.calendar.removeAllEvents();
    const entry: FullCalendar.EventApi | null =
        found === undefined ? null : dialog.calendar.addEvent(found);
    if (entry?.startEditable === true) await dialog.categories.entryOpenEdit(entry);
}
