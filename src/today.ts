/**
 * ## Today
 *
 * Today, the one day of the whole page: today's calendar date, which turns at 00:00,
 * as the reader counts it.
 * A view that shows today moves on to the new day by itself at 00:00,
 * and when the page becomes visible again on a later day, like a tab left open overnight,
 * whose timer the browser may have held back.
 * A day I went to myself stays, and only marks today anew.
 * A view that can load its day again loads it whenever the page becomes visible,
 * so it never shows it as it was when the page went to the background.
 * A view opens on today, also when reloaded or started anew as the app,
 * only a link to a day opens on that day, see {@link askedDayOf}.
 */

import { dayOf } from "./skill/attempts.ts";

/**
 * Gives today's calendar date, which turns at 00:00.
 */
export function calendarTodayOf(): string {
    return dayOf(new Date());
}

/**
 * Reads the day a link asks a view to open on, `null` for none or no valid day,
 * and takes it out of the address,
 * so a reload or a tab the browser opens again later shows today instead.
 */
export function askedDayOf(): string | null {
    const asked: string | null = new URLSearchParams(location.search).get("date");
    history.replaceState(null, "", location.pathname);
    return asked !== null && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : null;
}

/**
 * Moves a view on to the new day while it shows today, see the top of this file.
 * `mark` marks today anew in a view that stays on another day,
 * `again` loads the shown day again, both left out by a view without them.
 * A timer that comes a moment early only waits again.
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
