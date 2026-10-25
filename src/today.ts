/**
 * ## Today
 *
 * Today, the one day of the whole page: today's calendar date, which turns at 00:00,
 * so at 00:20 on 14.10.2026 the day and the food open on 14 October,
 * and the trackers, the skill days,
 * the done boxes and the due lists count 14 October, as the reader does.
 * A view that shows today moves on to the new day by itself at 00:00,
 * and when the page becomes visible again on a later day, like a tab left open overnight,
 * whose timer the browser may have held back;
 * a day I went to myself stays, and only marks today anew, like the icon back to today of the day.
 * A view that can load its day again,
 * like the day with its plan, its log, its trackers and its note,
 * loads it again whenever the page becomes visible, like when I come back to the app on my phone,
 * so it never shows them as they were when the page went to the background.
 * A view opens on today, also when it is reloaded,
 * opened again by the browser or started anew as the app;
 * only a link to a day, like a meal of the food view, opens on that day, see {@link askedDayOf}.
 *
 * - `./skill/attempts.ts`: Writes a date as a day in the form of the reader.
 */

import { dayOf } from "./skill/attempts.ts";

/**
 * Gives today's calendar date, which turns at 00:00: at 00:20 on 14 October today is 14 October.
 *
 * @returns Day like `2026-10-14`
 */
export function calendarTodayOf(): string {
    return dayOf(new Date());
}

/**
 * Reads the day a link asks a view to open on,
 * like `2026-10-15` of `/?date=2026-10-15` from a meal of the food view,
 * and takes it out of the address,
 * so a reload or a tab the browser opens again later shows today instead,
 * like 13 October after a night with the tab of 12 October open.
 * - `asked`: The day of the address, `null` for none.
 * - {@link History#replaceState}: Changes the address without loading the page again.
 *
 * @returns Day like `2026-10-15`,
 *   `null` when the address asks for none or for no day written like it
 */
export function askedDayOf(): string | null {
    const asked: string | null = new URLSearchParams(location.search).get("date");
    history.replaceState(null, "", location.pathname);
    return asked !== null && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : null;
}

/**
 * Moves a view on to the new day while it shows today: at the next 00:00,
 * and whenever the page becomes visible again, like a tab left open overnight;
 * a view showing another day stays on it and marks today anew;
 * a view that stays on its day when the page becomes visible loads it again.
 * - `today`: Today's calendar date when the view last looked, like `2026-10-13`.
 * - `timer`: Timer of the next look, at the next 00:00.
 * - `look`: Shows the new day when the day turned while the view showed the day before,
 *   else marks today anew once it turned, then waits for the next 00:00;
 *   a timer that comes a moment early only waits again.
 * - `current`: Today's calendar date at the look.
 * - `midnight`: The next 00:00.
 * - `before`: The day the view showed when the page became visible.
 * - {@link Document#visibilityState}: Tells whether the page can be seen, `visible`,
 *   or lies hidden, like in a tab behind others.
 *
 * @param shown - Gives the day the view shows, like `2026-10-13`
 * @param show - Shows a day, like `2026-10-14`
 * @param mark - Marks today anew in a view that stays on another day, like the icon back to today;
 *   none for a view without such a mark, like the food
 * @param again - Loads the shown day again, as it lies in the files now;
 *   none for a view that does not, like the food
 */
export function todayFollow(
    shown: () => string,
    show: (day: string) => void,
    mark?: () => void,
    again?: () => void,
): void {
    let today: string = calendarTodayOf();
    let timer: number = 0;
    const look: () => void = (): void => {
        const current: string = calendarTodayOf();
        if (current !== today && shown() === today) show(current);
        else if (current !== today) mark?.();
        today = current;
        const midnight: Date = new Date();
        midnight.setHours(24, 0, 0, 0);
        clearTimeout(timer);
        timer = window.setTimeout(look, midnight.getTime() - Date.now());
    };
    document.addEventListener("visibilitychange", (): void => {
        if (document.visibilityState !== "visible") return;
        const before: string = shown();
        look();
        if (shown() === before) again?.();
    });
    look();
}
