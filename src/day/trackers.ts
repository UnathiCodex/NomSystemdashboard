/**
 * ## Trackers
 *
 * The trackers of the shown day, at the right of the bar of the day,
 * as the reader counts them, see `reader/trackers.ts`, calm and basic:
 * three tiles of equal width side by side, each its name small and grey before its value,
 * without icons and without descriptions under the pointer;
 * none on a phone, see `trackers.css`:
 * - Sleep: how long I slept on the day, every sleep that ended on it,
 * the night and the naps;
 *   its goal, the spread of my bedtime and the average of the week left out for now,
 *   since other things come first.
 * - Water: what I drank on the day in litres, without a goal, see {@link waterOf}.
 * - Food: the kcal of the day's meals, a total without goal;
 *   no link, since the button of the food view is beside it.
 * - Neck: two tiles over the seven days up to the day, see {@link neckOf},
 *   a check from two thirds of my study days on,
 *   since about two thirds of the sessions already gave the large effects (Chen 2018);
 *   a session is an entry `Body` of my neck routine,
 *   and a study day a day with an entry `Skill`;
 *   my neck pain is the outcome the routine is judged by.
 *   Hidden until I start my neck routine, see {@link neckShown}; its code stays.
 * A glass, 0.25 l, is a log entry `Drink` `Water` of five minutes,
 * sent to the one writer of the log, see `entries.ts`;
 * the time grid shows glasses only as small marks, see `day.ts`.
 * The card loads again whenever the log of the day changes.
 * The food view loads the trackers too, for the water of its day.
 */

import { entryAdd, entryDelete } from "./entries.ts";
import { lengthOf, nowOn } from "./times.ts";
import { amountOf, elementOf } from "../food/foods.ts";
import { dayOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { iconOf } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Check, Minus } from "lucide";

import type { Calendar } from "fullcalendar";
import type { Totals } from "../../reader/food.ts";

/**
 * My goals for the trackers, the size of a glass and the numbers of my learning,
 * as the reader sends them.
 *
 * - `bedtimeVaried`: Minutes my bedtime may vary over the week, up or down,
 * for its check.
 * - `neckLongWeek`: Long neck sessions I want in seven days;
 *   a short one, or a long, on every study day.
 */
type TrackerSettings = {
    sleepHours: number;
    sleepBand: [number, number];
    glassMl: number;
    waterMl: number;
    bedtimeVaried: number;
    neckLongWeek: number;
    sessionMinutes: number;
};

/** A night of sleep, as the reader sends it. */
type Night = {
    minutes: number;
    asleep: string;
    awake: string;
};

/**
 * My sleep on a day, as the reader sends it.
 *
 * - `slept`: Minutes of every sleep that ended on the day,
 *   the night and the naps, 0 when none is logged.
 * - `minutes`: Average minutes of the nights of the week, `null` when none is logged.
 * - `varied`: How much my bedtime varied over the week, in minutes,
 *   `null` for fewer than two nights.
 */
type SleepDay = {
    night: Night | null;
    slept: number;
    minutes: number | null;
    varied: number | null;
    nights: number;
};

/**
 * A glass of a drink, of water or of another drink, as the reader sends it.
 *
 * - `water`: Whether it is a glass of water, which the counter may take back.
 * - `editable`: Whether its entry can be changed, so it can be taken back.
 */
type Glass = {
    id: string;
    start: string;
    water: boolean;
    editable: boolean;
};

/**
 * My neck routine in the seven days up to a day and my neck pain,
 * as the reader sends them.
 *
 * - `short`: My study days on which I did a neck routine, short or long.
 * - `painFirst`: Mean of my pain in the first four weeks I rated it,
 *   `null` before the first rating.
 * - `painLast`: Mean of my pain in the last four weeks up to the day,
 *   `null` while those still are the first four.
 */
type NeckWeek = {
    short: number;
    studyDays: number;
    long: number;
    painFirst: number | null;
    painLast: number | null;
};

/**
 * The trackers of a day, as the reader sends them.
 *
 * - `sleep`: My sleep, which the card leaves out for now.
 * - `food`: What my meals gave, `estimate` when one of them counts grams guessed.
 */
export type Trackers = {
    settings: TrackerSettings;
    sleep: SleepDay;
    glasses: Glass[];
    neck: NeckWeek;
    food: Totals & { estimate: boolean };
};

/** Minutes a glass of water lasts in the log. */
const glassMinutes: number = 5;

/**
 * Whether the card shows the tiles of my neck, see {@link neckOf}:
 * not until I start my neck routine, then `true`.
 */
const neckShown: boolean = false;

/** Makes the check of a goal met, see `tracker-check` in `trackers.css`. */
function checkOf(): SVGElement {
    const check: SVGElement = iconOf(Check);
    check.classList.add("tracker-check");
    return check;
}

/**
 * Makes a tile of a tracker, of the neck: its value over its name, a check after a value
 * in the healthy band or at its goal, a dash for a value not logged.
 */
function tileOf(value: string, met: boolean, name: string): HTMLElement {
    const tile: HTMLElement = elementOf("div", "tile", "");
    const amount: HTMLElement = elementOf("span", "tile-value", value === "" ? "–" : value);
    if (value !== "" && met) amount.append(checkOf());
    tile.append(amount, elementOf("span", "tile-name", name));
    return tile;
}

/**
 * Logs one more glass of water, at now on the shown day, five minutes long,
 * see `nowOn` in `times.ts`.
 *
 * @throws {Error} - When the reader does not take the glass
 */
async function glassAdd(calendar: Calendar): Promise<void> {
    const start: Date = nowOn(calendar.view.currentStart);
    await entryAdd(calendar, {
        category: "Drink",
        title: "Water",
        location: "",
        from: "",
        module: "",
        type: "",
        semester: "",
        note: "",
        foods: [],
        planned: "",
        start: start,
        end: new Date(start.getTime() + glassMinutes * 60 * 1000),
    });
}

/**
 * Makes the name and the value of a tracker, its name small and grey before its value,
 * see `.tracker-row` in `trackers.css`.
 */
function linesOf(name: string, value: string): HTMLElement[] {
    return [elementOf("span", "tracker-name", name), elementOf("span", "tracker-value", value)];
}

/**
 * Builds the water: what I drank in litres, every drink one glass of 0.25 l,
 * its tile one button, which logs one more glass of water,
 * and `−` in its corner, which takes the last glass of water back;
 * the words of `−` only for screen readers, no description under the pointer, no goal;
 * on a day still to come the tile greyed and `−` hidden,
 * since nothing is drunk there yet.
 * The tile takes no clicks while a glass is sent, so a double tap logs one glass;
 * the card loads again once the log changed.
 */
function waterOf(calendar: Calendar, trackers: Trackers, day: string): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row tracker-water", "");
    const add: HTMLButtonElement = document.createElement("button");
    const less: HTMLButtonElement = document.createElement("button");
    const drunk: number = (trackers.glasses.length * trackers.settings.glassMl) / 1000;
    const litres: string = `${amountOf(drunk, 2)} l`;
    const last: Glass | undefined = trackers.glasses
        .filter((glass: Glass): boolean => glass.water && glass.editable)
        .at(-1);
    const coming: boolean = day > calendarTodayOf();
    const send: (change: () => Promise<void>) => void = (change: () => Promise<void>): void => {
        row.inert = true;
        change().catch((error: unknown): void => {
            console.error(error);
            row.inert = false;
        });
    };

    add.type = "button";
    add.className = "water-add";
    add.append(...linesOf("Water", litres));
    add.setAttribute("aria-label", `Water ${litres}, 0.25 l more`);
    add.disabled = coming;
    add.addEventListener("click", (): void => send((): Promise<void> => glassAdd(calendar)));
    less.type = "button";
    less.className = "icon-button chip-button water-less";
    less.append(iconOf(Minus));
    less.setAttribute("aria-label", "0.25 l less");
    less.disabled = last === undefined;
    less.hidden = coming;
    less.addEventListener("click", (): void => send((): Promise<void> => entryDelete(calendar, last?.id ?? "")));
    row.append(add, less);
    return row;
}

/**
 * Builds the food: the kcal of the day's meals,
 * rounded and so never marked as an estimate, a number never apart from its word.
 */
function foodOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Food", `${amountOf(trackers.food.kcal, 0)}\u00a0kcal`));
    return row;
}

/**
 * Builds the sleep: how long I slept on the day, every sleep that ended on it,
 * the night and the naps, so a sleep from 22:00 to 05:00 counts for the day of 05:00;
 * while no sleep is logged `00h 00m`,
 * in the colour of the text like the water's `0.00 l`, so no dash stands there.
 */
function sleepOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Sleep", lengthOf(trackers.sleep.slept)));
    return row;
}

/**
 * Builds the neck: two tiles over the seven days up to the day,
 * on how many of my study days I did a neck routine, short or long,
 * a check from two thirds on, a dash while the week has no study day,
 * and on how many days a long one against my goal, a check once reached;
 * then my neck pain, the mean of my first four weeks against the last four,
 * or the first mean alone in the first four weeks, a dash before any rating.
 */
function neckOf(trackers: Trackers): HTMLElement {
    const neck: NeckWeek = trackers.neck;
    const goal: number = trackers.settings.neckLongWeek;
    const pain: string =
        neck.painFirst === null
            ? ""
            : neck.painLast === null
              ? amountOf(neck.painFirst, 1)
              : `${amountOf(neck.painFirst, 1)} → ${amountOf(neck.painLast, 1)}`;
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    const tiles: HTMLElement = elementOf("div", "tiles", "");
    tiles.append(
        tileOf(
            neck.studyDays === 0 ? "" : `${neck.short} / ${neck.studyDays}`,
            neck.short * 3 >= neck.studyDays * 2,
            "short · study days",
        ),
        tileOf(`${neck.long} / ${goal}`, neck.long >= goal, "long · 7 days"),
        tileOf(pain, false, "pain"),
    );
    row.append(elementOf("span", "tracker-name", "Neck"), tiles);
    return row;
}

/**
 * Loads the trackers of a day from the reader.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function trackersFetch(day: string): Promise<Trackers> {
    return readerAsk<Trackers>(`/api/day/trackers?date=${day}`);
}

/**
 * Loads the trackers of the shown day and shows them,
 * unless another day is shown meanwhile; the neck only once {@link neckShown}.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function trackersLoad(calendar: Calendar): Promise<void> {
    const day: string = dayOf(calendar.view.currentStart);
    const trackers: Trackers = await trackersFetch(day);
    if (day !== dayOf(calendar.view.currentStart)) return;
    document
        .getElementById("trackers")
        ?.replaceChildren(
            sleepOf(trackers),
            waterOf(calendar, trackers, day),
            foodOf(trackers),
            ...(neckShown ? [neckOf(trackers)] : []),
        );
}

/**
 * Loads the trackers again each time the log of the shown day was read,
 * so they count what its file holds:
 * an entry dragged shows at once, before the reader has written it,
 * and the log is read again once it has.
 */
export function trackersSee(calendar: Calendar): void {
    trackersLoad(calendar).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("trackers")
            ?.replaceChildren(elementOf("p", "tracker-meta", "The trackers cannot be read"));
    });
}
