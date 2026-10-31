/**
 * ## Session
 *
 * No learning recorded without a session: before the learning view records something,
 * where I stand with `Next`, a result or the close of the round,
 * a session of the module runs,
 * its skill entry of the moment, into which the record goes, see `reader/skill.ts`;
 * reading a section needs none.
 * While none runs, the day view's own dialog of a new entry opens over the page,
 * the one I log every entry with in the calendar, see `../day/categories.ts`.
 * I fill and save it there as always, and the record follows into it.
 * Cancelled, or saved as no session running now,
 * nothing is recorded and I stay where I was.
 * A session of the module running now, now between its start and its end,
 * counts without the dialog.
 * The dialog comes into the page only the first time it opens, see `./dialog.ts`,
 * so the scripts load no calendar before.
 */

import { dialogOf } from "./dialog.ts";
import { nowOn, rangeDash, timeOf } from "../day/times.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { readerAsk } from "../reader.ts";

import type * as Categories from "../day/categories.ts";
import type * as Trackers from "../day/trackers.ts";
import type { Session } from "../../reader/skill.ts";

/**
 * Loads from the reader the session of a module running now:
 * its skill entry of the moment,
 * see `sessionRead` in `reader/skill.ts`, while its end lies after now.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function sessionOf(module: string): Promise<Session | null> {
    const session: Session | null = await readerAsk<Session | null>(
        `/api/skill/session?module=${encodeURIComponent(module)}`,
    );
    return session !== null && Date.parse(session.end) > Date.now() ? session : null;
}

/**
 * Writes a session out as the calendar writes an entry:
 * its day with its weekday, then its start and end.
 */
export function sessionTextOf(session: Session): string {
    const start: Date = new Date(session.start);
    return (
        `${dayTextOf(dayOf(start), true)} · ` +
        `${timeOf(start)}${rangeDash}${timeOf(new Date(session.end))}`
    );
}

/**
 * Makes sure a session of a module runs before the learning view records something:
 * without one running now opens the dialog of a new entry for it and waits
 * until it closes, saved or not.
 * Gives whether a session of the module runs now, so the record may follow.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function sessionEnsure(module: string): Promise<boolean> {
    if ((await sessionOf(module)) !== null) return true;
    const categories: typeof Categories = (await dialogOf()).categories;
    const trackers: typeof Trackers = await import("../day/trackers.ts");
    const minutes: number = (await trackers.trackersFetch(dayOf(new Date()))).settings
        .sessionMinutes;
    const start: Date = nowOn(new Date());
    const closed: Promise<void> = new Promise<void>((resolve: () => void): void =>
        document
            .getElementById("entry")
            ?.addEventListener("close", (): void => resolve(), { once: true }),
    );
    await categories.entryOpenSkill(
        module,
        start,
        new Date(start.getTime() + minutes * 60 * 1000),
    );
    await closed;
    return (await sessionOf(module)) !== null;
}
