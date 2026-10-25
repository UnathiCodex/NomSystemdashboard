/**
 * ## Session timer
 *
 * A quiet timer in the bar of the day, always there,
 * taking the room between the date and the trackers, in a soft frame like them:
 * while an entry of the log runs, what it is at the left, as the log shows it,
 * like `Skill: NomSystemdashboard` or `Food: Brotzeit Nachspeise`,
 * and how long it still runs at the right, in hours and minutes, like `01h 23m`;
 * while none runs its name `Session` small and grey at the left,
 * as the trackers beside it have theirs, and `00h 00m`, so the bar never jumps; none on a phone.
 * Where the room is too small for the whole name,
 * like on my laptop, it is cut with an ellipsis at its end,
 * like `Skill: WI0219_InvestitionFin…`, whole in its tooltip,
 * see {@link timerShow}, the time always whole; a short code would not work for every name.
 * The entry running now is one of every category but a glass of water,
 * which the log does not show, a session of learning as much as a meal or a video;
 * of several running at once the one begun last, like a meal during a session,
 * and the session again once the meal is over, see `entryNowRead` in `reader/day.ts`;
 * it ends where its entry ends.
 * The timer asks the reader again at every full minute,
 * so its minutes change with the clock, whenever the page comes back into sight,
 * like a tab I return to, whose timers the browser slowed, and each time the log was read,
 * like after I saved, ended or removed an entry or a file of my new system changed,
 * so an entry whose time holds now shows at once, and one I end goes back to `Session`,
 * see {@link timerSee} and {@link timerStart}.
 *
 * - `./day/boxes.ts`: Writes what an entry is, as the log shows it.
 * - `./day/times.ts`: Writes times of day and a length in hours and minutes.
 * - `./reader.ts`: Asks the reader.
 */

import { entryPartOf, shownWhatOf, whatOf } from "./day/boxes.ts";
import { lengthOf, rangeDash, timeOf } from "./day/times.ts";
import { readerAsk } from "./reader.ts";

/**
 * The entry of the log running now, as the reader sends it.
 *
 * - `category`: Its category, like `Food` or `Skill`.
 * - `title`: What it is as written, its `SUMMARY`, like `Brotzeit Nachspeise`.
 * - `module`: Its skill, like `IN2028` or `WokFlow`, empty for none.
 * - `type`: Its type, like `HU`, empty for none.
 * - `start`, `end`: Its start and end, as ISO instants.
 */
type Running = {
    category: string;
    title: string;
    module: string;
    type: string;
    start: string;
    end: string;
};

/**
 * Milliseconds between two looks at the reader, one minute.
 */
const lookTime: number = 60 * 1000;

/**
 * Loads the entry running now from the reader.
 *
 * @returns The entry, `null` while none runs
 * @throws {Error} - When the reader cannot answer
 */
async function runningLoad(): Promise<Running | null> {
    return readerAsk<Running | null>("/api/day/now");
}

/**
 * Shows the entry running now in the timer, see the top of this file, what it is, whole,
 * and its start and end as tooltip, each on a line,
 * like `Skill: WI0219_InvestitionFinanzmanagement (VO)` and `17:45 – 20:45`;
 * while none runs and once it is over its name `Session` small and grey, as a tracker has its name,
 * see `.tracker-name` in `day/trackers.css`, and a grey `00h 00m`, without tooltip.
 * - `timer`: The timer in the bar of the day, in `day.html`.
 * - `running`: The entry running now.
 * - `left`: Whole minutes until its end, a minute begun counting whole,
 *   so `00h 01m` shows to the last minute.
 * - `what`: What it is, as the log shows it.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function timerShow(): Promise<void> {
    const timer: HTMLElement = document.getElementById("session-timer") as HTMLElement;
    const running: Running | null = await runningLoad();
    const left: number =
        running === null ? 0 : Math.ceil((Date.parse(running.end) - Date.now()) / (60 * 1000));
    if (running === null || left <= 0) {
        timer.replaceChildren(
            entryPartOf("span", "session-what tracker-name", ["Session"]),
            entryPartOf("span", "session-left", [lengthOf(0)]),
        );
        timer.removeAttribute("title");
        return;
    }

    const what: HTMLElement = entryPartOf(
        "span",
        "session-what",
        whatOf(
            running.category,
            shownWhatOf(running.category, running.title, running.module, running.type),
        ),
    );
    timer.replaceChildren(what, entryPartOf("span", "session-left", [lengthOf(left)]));
    timer.title = `${what.textContent ?? ""}\n${timeOf(new Date(running.start))}${rangeDash}${timeOf(new Date(running.end))}`;
}

/**
 * Looks at the reader for the entry running now and shows it in the timer,
 * a failure only written to the console;
 * the day calls it each time it has read the log, see `eventSourceSuccess` in `day/day.ts`,
 * so an entry saved, ended or removed shows at once, without loading the page again.
 */
export function timerSee(): void {
    timerShow().catch((error: unknown): void => console.error(error));
}

/**
 * Starts the timer of the day: shows it now, then at every full minute, like 23:06:00,
 * and again whenever the page comes back into sight.
 * - {@link setTimeout}: Calls a function once, after a number of milliseconds,
 *   here at the next full minute.
 * - {@link setInterval}: Calls a function again and again,
 *   after a number of milliseconds each time.
 * - `visibilitychange`: Comes when the page is hidden or comes back into sight.
 */
export function timerStart(): void {
    timerSee();
    setTimeout(
        (): void => {
            timerSee();
            setInterval(timerSee, lookTime);
        },
        lookTime - (Date.now() % lookTime),
    );
    document.addEventListener("visibilitychange", (): void => {
        if (document.visibilityState === "visible") timerSee();
    });
}
