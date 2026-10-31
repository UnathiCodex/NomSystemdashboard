/**
 * ## Month
 *
 * Picks the day to show from a month, to jump far back or ahead much faster than day by day,
 * like to a birthday next spring to write down a gift idea for it, see `gifts.ts`:
 * a click on the date above plan
 * and log opens the month of the shown day over the page, the shown day marked;
 * the arrows move by a month, the double arrows by a year,
 * and a click on a day shows it and closes the month.
 * The month brings its dialog itself, `month.html`.
 *
 * - `fullcalendar`: Draws the month.
 * - `fullcalendar/daygrid`: Draws the month as a grid of its days.
 * - `fullcalendar/interaction`: Takes the click on a day.
 * - `fullcalendar/themes/forma`: Look of the month, coloured by `day.css` as the log is.
 * - `fullcalendar/locales/en-gb`: English names of days and months, the week starting on Monday.
 * - `./month.html?raw`: Html of the dialog of the month as text,
 *   packed into the built code by Vite.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader.
 * - `../icons.ts`: Puts the icons of the arrows into their buttons.
 * - `lucide`: The icons of the arrows.
 */

import { Calendar } from "fullcalendar";
import dayGridPlugin from "fullcalendar/daygrid";
import interactionPlugin from "fullcalendar/interaction";
import themePlugin from "fullcalendar/themes/forma";
import englishLocale from "fullcalendar/locales/en-gb";
import monthHtml from "./month.html?raw";
import { dayOf } from "../skill/attempts.ts";
import { iconPut } from "../icons.ts";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide";
import "fullcalendar/skeleton.css";
import "fullcalendar/themes/forma/theme.css";

import type { DateClickInfo, DatesSetInfo, DayCellInfo } from "fullcalendar";

/**
 * The month as drawn last, `null` before it is first opened.
 */
let month: Calendar | null = null;

/**
 * Opens the month of the first shown day, drawn anew each time, so the shown days are marked:
 * drawn only once the dialog shows, since FullCalendar measures its place,
 * which a closed dialog does not have.
 * - `dialog`: The dialog of the month.
 * - `initialView`: A grid of the days of a month, always six weeks, so the dialog keeps its height.
 * - `aspectRatio`: Makes the grid 1.8 times as wide as high,
 *   so its days are small and wider than high.
 * - `headerToolbar`: None, since the month and its arrows stand above it, as above plan and log.
 * - `dayHeaderFormat`: Writes the days of the week short, like `Mon`.
 * - `dayCellClass`: Adds the class `month-day` to every day, which `month.css` makes clickable,
 *   `month-other` to the days of the months before and after, which it greys,
 *   and `month-shown` to the shown days, which it marks.
 * - `dayCellTopClass`, `dayCellTopInnerClass`:
 *   Add the classes `month-top` and `month-number` to the top of a day and to its number,
 *   which `month.css` puts into the middle in the size of the page.
 * - `dateClick`: Shows the clicked day and closes the month.
 * - `datesSet`: Writes the month above the grid, like `October 2026`.
 * - {@link HTMLDialogElement#showModal}:
 *   Shows the month over the page, `Esc` and a click beside it close it.
 *
 * @param shown - The shown days, the first first, like `2026-10-11`
 * @param pick - Shows a day, like `2026-10-23`
 */
function monthOpen(shown: string[], pick: (day: string) => void): void {
    const dialog: HTMLDialogElement = document.getElementById(
        "month",
    ) as HTMLDialogElement;
    dialog.showModal();
    month?.destroy();
    month = new Calendar(document.getElementById("month-calendar") as HTMLElement, {
        plugins: [dayGridPlugin, interactionPlugin, themePlugin],
        locale: englishLocale,
        initialView: "dayGridMonth",
        initialDate: shown[0],
        aspectRatio: 1.8,
        headerToolbar: false,
        dayHeaderFormat: { weekday: "short" },
        dayCellClass: (info: DayCellInfo): string =>
            [
                "month-day",
                info.isOther ? "month-other" : "",
                shown.includes(dayOf(info.date)) ? "month-shown" : "",
            ].join(" "),
        dayCellTopClass: "month-top",
        dayCellTopInnerClass: "month-number",
        dateClick: (info: DateClickInfo): void => {
            pick(dayOf(info.date));
            dialog.close();
        },
        datesSet: (info: DatesSetInfo): void => {
            (document.getElementById("month-title") as HTMLElement).textContent =
                info.view.title;
        },
    });
    month.render();
}

/**
 * Starts the month after the router has put the HTML of its area into the page:
 * puts its dialog into the page, the button of the area opens it, the arrows move it by a month,
 * the double arrows by a year.
 *
 * @param button - Button that opens the month, the date above plan and log
 * @param shown - Gives the shown days, the first first, like `2026-10-11`
 * @param pick - Shows a day, like `2026-10-23`
 */
export function monthStart(
    button: HTMLElement,
    shown: () => string[],
    pick: (day: string) => void,
): void {
    document.body.insertAdjacentHTML("beforeend", monthHtml);
    iconPut(
        document.getElementById("month-year-back") as HTMLElement,
        ChevronsLeft,
        "Year before",
    );
    iconPut(
        document.getElementById("month-back") as HTMLElement,
        ChevronLeft,
        "Month before",
    );
    iconPut(
        document.getElementById("month-next") as HTMLElement,
        ChevronRight,
        "Month after",
    );
    iconPut(
        document.getElementById("month-year-next") as HTMLElement,
        ChevronsRight,
        "Year after",
    );
    button.addEventListener("click", (): void => monthOpen(shown(), pick));
    (document.getElementById("month-year-back") as HTMLElement).addEventListener(
        "click",
        (): void => month?.prevYear(),
    );
    (document.getElementById("month-back") as HTMLElement).addEventListener(
        "click",
        (): void => month?.prev(),
    );
    (document.getElementById("month-next") as HTMLElement).addEventListener(
        "click",
        (): void => month?.next(),
    );
    (document.getElementById("month-year-next") as HTMLElement).addEventListener(
        "click",
        (): void => month?.nextYear(),
    );
}
