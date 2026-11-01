/**
 * ## Session timer
 *
 * A quiet timer in the day bar, the entry of the log running now and how long it still runs.
 * While none runs, `Session` and `00h 00m`, so the bar never jumps.
 * A name too long is cut with an ellipsis, since a short code would not work for every name.
 * It asks the reader again at every full minute, so its minutes change with the clock.
 * Again when the page comes back into sight, since the browser slowed its timers.
 */

import { entryPartOf, shownWhatOf, whatOf } from "./day/boxes.ts";
import { lengthOf, rangeDash, timeOf } from "./day/times.ts";
import { readerAsk } from "./reader.ts";

/** The entry of the log running now, `title` its `SUMMARY`. */
type Running = {
    category: string;
    title: string;
    module: string;
    type: string;
    start: string;
    end: string;
};

const lookTime: number = 60 * 1000;

/** The entry running now, `null` while none runs. */
async function runningLoad(): Promise<Running | null> {
    return readerAsk<Running | null>("/api/day/now");
}

/** Shows the entry running now, a minute begun counting whole, so `00h 01m` shows to the last minute. */
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

/** Shows the entry running now, a failure only written to the console. */
export function timerSee(): void {
    timerShow().catch((error: unknown): void => console.error(error));
}

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
