/**
 * ## Session timer
 *
 * A quiet timer in the bar of the day, always there, none on a phone:
 * while an entry of the log runs, what it is at the left, as the log shows it,
 * and how long it still runs at the right.
 * While none runs, its name `Session` small and grey and `00h 00m`,
 * so the bar never jumps.
 * Where the room is too small for the whole name, it is cut with an ellipsis at its end,
 * whole in its tooltip, since a short code would not work for every name.
 * Which entry runs now the reader picks, see `entryNowRead` in `reader/day.ts`.
 * The timer asks the reader again at every full minute,
 * so its minutes change with the clock,
 * whenever the page comes back into sight, whose timers the browser slowed,
 * and each time the log was read, so an entry I end goes back to `Session` at once.
 */

import { entryPartOf, shownWhatOf, whatOf } from "./day/boxes.ts";
import { lengthOf, rangeDash, timeOf } from "./day/times.ts";
import { readerAsk } from "./reader.ts";

/**
 * The entry of the log running now, as the reader sends it.
 * `title` is its `SUMMARY`, `module` and `type` are empty for none.
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
 * Loads the entry running now from the reader, `null` while none runs.
 */
async function runningLoad(): Promise<Running | null> {
    return readerAsk<Running | null>("/api/day/now");
}

/**
 * Shows the entry running now in the timer, with what it is, whole,
 * and its start and end as tooltip.
 * - `left`: A minute begun counts whole, so `00h 01m` shows to the last minute.
 */
async function timerShow(): Promise<void> {
    const timer: HTMLElement = document.getElementById("session-timer") as HTMLElement;
    const running: Running | null = await runningLoad();
    const left: number = running === null ? 0 : Math.ceil((Date.parse(running.end) - Date.now()) / (60 * 1000));
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
        whatOf(running.category, shownWhatOf(running.category, running.title, running.module, running.type)),
    );
    timer.replaceChildren(what, entryPartOf("span", "session-left", [lengthOf(left)]));
    timer.title =
        `${what.textContent ?? ""}\n${timeOf(new Date(running.start))}${rangeDash}` + timeOf(new Date(running.end));
}

/**
 * Shows the entry running now in the timer, a failure only written to the console.
 * The day calls it each time it has read the log,
 * see `eventSourceSuccess` in `day/day.ts`.
 */
export function timerSee(): void {
    timerShow().catch((error: unknown): void => console.error(error));
}

/**
 * Starts the timer of the day: shows it now, then at every full minute,
 * and again whenever the page comes back into sight.
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
