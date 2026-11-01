/**
 * ## Trackers
 *
 * The trackers of the shown day at the right of the day bar, calm and basic, none on a phone.
 * Tiles of equal width side by side, each its name small and grey before its value.
 * - Sleep: every sleep that ended on the day, the night and the naps.
 * - Water: what I drank in litres, without a goal.
 * - Food: the kcal of the day's meals, without a goal.
 * - Neck: hidden until I start my neck routine, its code stays.
 * A glass, 0.25 l, is a log entry `Drink` `Water` of five minutes.
 */

import { entryAdd, entryDelete } from "./entries.ts";
import { lengthOf, nowOn } from "./times.ts";
import { amountOf, elementOf } from "../food/foods.ts";
import { dayOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { iconOf, tileNameOf } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Check, Minus } from "lucide";

import type { Calendar } from "fullcalendar";
import type { Totals } from "../../reader/food.ts";

/**
 * My goals for the trackers, the size of a glass and the numbers of my learning.
 *
 * - `bedtimeVaried`: Minutes my bedtime may vary over the week, up or down.
 * - `neckLongWeek`: Long neck sessions I want in seven days.
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

type Night = {
    minutes: number;
    asleep: string;
    awake: string;
};

/**
 * My sleep on a day.
 *
 * - `slept`: Minutes of every sleep that ended on the day, 0 when none is logged.
 * - `minutes`: Average minutes of the nights of the week, `null` when none is logged.
 * - `varied`: Minutes my bedtime varied over the week, `null` for fewer than two nights.
 */
type SleepDay = {
    night: Night | null;
    slept: number;
    minutes: number | null;
    varied: number | null;
    nights: number;
};

/** A glass of water or of another drink, only an editable glass of water can be taken back. */
type Glass = {
    id: string;
    start: string;
    water: boolean;
    editable: boolean;
};

/**
 * My neck routine in the seven days up to a day and my neck pain.
 *
 * - `short`: My study days with a neck routine, short or long.
 * - `painFirst`: Mean pain of the first four weeks I rated it, `null` before the first rating.
 * - `painLast`: Mean pain of the last four weeks, `null` while those still are the first four.
 */
type NeckWeek = {
    short: number;
    studyDays: number;
    long: number;
    painFirst: number | null;
    painLast: number | null;
};

/** The trackers of a day, `estimate` when a meal counts grams guessed. */
export type Trackers = {
    settings: TrackerSettings;
    sleep: SleepDay;
    glasses: Glass[];
    neck: NeckWeek;
    food: Totals & { estimate: boolean };
};

/** Minutes a glass of water lasts in the log. */
const glassMinutes: number = 5;

/** Whether the card shows my neck, `true` once I start my neck routine. */
const neckShown: boolean = false;

/** The check of a goal met. */
function checkOf(): SVGElement {
    const check: SVGElement = iconOf(Check);
    check.classList.add("tracker-check");
    return check;
}

/** A tile of the neck, its value over its name, a check at its goal, a dash when not logged. */
function tileOf(value: string, met: boolean, name: string): HTMLElement {
    const tile: HTMLElement = elementOf("div", "tile", "");
    const amount: HTMLElement = elementOf("span", "tile-value", value === "" ? "–" : value);
    if (value !== "" && met) amount.append(checkOf());
    tile.append(amount, elementOf("span", "tile-name", name));
    return tile;
}

/**
 * Logs one more glass of water at now on the shown day.
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

function linesOf(name: string, value: string): HTMLElement[] {
    return [tileNameOf(name), elementOf("span", "tracker-value", value)];
}

/**
 * The water, every drink one glass, the tile logs one more glass of water, `−` takes the last back.
 * On a day still to come the tile is greyed and `−` hidden, since nothing is drunk there yet.
 * The tile takes no clicks while a glass is sent, so a double tap logs one glass.
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

/** The kcal of the day's meals, rounded and so never marked as an estimate. */
function foodOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Food", `${amountOf(trackers.food.kcal, 0)}\u00a0kcal`));
    return row;
}

/** Every sleep that ended on the day, `00h 00m` while none is logged. */
function sleepOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Sleep", lengthOf(trackers.sleep.slept)));
    return row;
}

/**
 * The neck over the seven days up to the day, my study days with a routine and the long ones.
 * The check from two thirds of my study days, since those already gave the large effects (Chen 2018).
 * My neck pain is the outcome the routine is judged by, the first four weeks against the last four.
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
    row.append(tileNameOf("Neck"), tiles);
    return row;
}

/** @throws {Error} - When the reader cannot answer */
export async function trackersFetch(day: string): Promise<Trackers> {
    return readerAsk<Trackers>(`/api/day/trackers?date=${day}`);
}

/**
 * Shows the trackers of the shown day, unless another day is shown meanwhile.
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

/** Loads the trackers again each time the log of the shown day was read, so they count what its file holds. */
export function trackersSee(calendar: Calendar): void {
    trackersLoad(calendar).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("trackers")
            ?.replaceChildren(elementOf("p", "tracker-meta", "The trackers cannot be read"));
    });
}
