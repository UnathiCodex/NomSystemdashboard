/**
 * ## Trackers
 *
 * The trackers of the shown day, at the right of the bar of the day, as the reader counts them,
 * see `reader/trackers.ts`, calm and basic:
 * three tiles of equal width side by side, each its name small and grey before its value,
 * like `Sleep 09h 15m`, every tile alike, without icons and without descriptions under the pointer;
 * none on a phone, see `trackers.css`:
 * - Sleep: how long I slept on the day, every sleep that ended on it,
 *   the night and the naps, like `07h 30m`;
 *   its goal, the spread of my bedtime and the average of the week left out for now,
 *   since other things come first.
 * - Water: what I drank on the day in litres, like `1.5 l`, without a goal;
 *   the whole tile logs 0.25 l more, one glass of water, at the time of the tap on the shown day,
 *   a small `−` in its corner takes the last glass of water back;
 *   every other drink, like `Kaffee`, counts as one glass too.
 *   A day still to come takes no glasses.
 * - Food: the kcal of the day's meals, a total without goal, like `1.850 kcal`;
 *   no link, since the button of the food view is beside it.
 * - Neck: two tiles over the seven days up to the day: on how many of my study days I did
 *   a neck routine, short or long,
 *   like `2 / 5` over `short · study days`, a check from two thirds of them on,
 *   since about two thirds of the sessions already gave the large effects (Chen 2018),
 *   and on how many days a long one against my goal,
 *   like `1 / 3` over `long · 7 days`, a check once it is reached;
 *   a session is an entry `Body` of my neck routine, written by the entry by category,
 *   and a study day a day with an entry `Skill`;
 *   then my neck pain, rated 0 to 10 with each long session,
 *   the mean of my first four weeks against the last four,
 *   like `5.2 → 4.0` over `pain`, the outcome the routine is judged by.
 *   Hidden until I start my neck routine, see {@link neckShown}; its code stays.
 * A glass, 0.25 l, is a log entry `Drink` `Water` of five minutes,
 * sent to the one writer of the log, see `entries.ts`;
 * the time grid shows glasses only as small marks, see `day.ts`.
 * The card loads again whenever the log of the day changes.
 * The food view loads the trackers too, for the water of its day.
 *
 * - `./entries.ts`: Sends new and removed entries to the reader.
 * - `./times.ts`: Gives now on the shown day.
 * - `../food/foods.ts`: Writes amounts and makes elements.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader.
 * - `../today.ts`: Gives today's calendar date.
 * - `../icons.ts`: Makes the icons of the buttons.
 * - `../reader.ts`: Asks the reader.
 * - `lucide`: The icons minus and check.
 * - `fullcalendar`: Calendar that shows the day.
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
import type { Totals } from "../food/foods.ts";

/**
 * My goals for the trackers, the size of a glass and the numbers of my learning,
 * as the reader sends them.
 *
 * - `sleepHours`: Hours of sleep I want a night.
 * - `sleepBand`: Fewest and most hours of a healthy night.
 * - `glassMl`: Millilitres of one glass of water.
 * - `waterMl`: Millilitres of water I want a day.
 * - `bedtimeVaried`: Minutes my bedtime may vary over the week, up or down, for its check.
 * - `neckLongWeek`: Long neck sessions I want in seven days;
 *   a short one, or a long, on every study day.
 * - `sessionMinutes`: Minutes of one study session.
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

/**
 * A night of sleep, as the reader sends it.
 *
 * - `minutes`: Minutes asleep.
 * - `asleep`: When I fell asleep, like `23:30`.
 * - `awake`: When I woke up, like `07:15`.
 */
type Night = {
    minutes: number;
    asleep: string;
    awake: string;
};

/**
 * My sleep on a day, as the reader sends it.
 *
 * - `night`: The night that ended on the day, `null` when none is logged.
 * - `slept`: Minutes of every sleep that ended on the day,
 *   the night and the naps, 0 when none is logged.
 * - `minutes`: Average minutes of the nights of the week, `null` when none is logged.
 * - `varied`: How much my bedtime varied over the week, in minutes,
 *   `null` for fewer than two nights.
 * - `nights`: Number of nights of the week logged.
 */
type SleepDay = {
    night: Night | null;
    slept: number;
    minutes: number | null;
    varied: number | null;
    nights: number;
};

/**
 * A glass of a drink, of water or of another drink, like `Kaffee`, as the reader sends it.
 *
 * - `id`: Identifier of its entry.
 * - `start`: When I drank it, as ISO instant.
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
 * My neck routine in the seven days up to a day and my neck pain, as the reader sends them.
 *
 * - `short`: My study days on which I did a neck routine, short or long.
 * - `studyDays`: My study days, days with an entry `Skill` in the log.
 * - `long`: Days with a long neck session.
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
 * - `settings`: My goals, the size of a glass and the numbers of my learning.
 * - `sleep`: My sleep, which the card leaves out for now.
 * - `glasses`: My glasses of water and of every other drink, in the order I drank them.
 * - `neck`: My neck routine in the seven days up to the day.
 * - `food`: What my meals gave, `estimate` when one of them counts grams guessed.
 */
export type Trackers = {
    settings: TrackerSettings;
    sleep: SleepDay;
    glasses: Glass[];
    neck: NeckWeek;
    food: Totals & { estimate: boolean };
};

/**
 * Minutes a glass of water lasts in the log.
 */
const glassMinutes: number = 5;

/**
 * Whether the card shows the tiles of my neck, see {@link neckOf}:
 * not until I start my neck routine, then `true`.
 */
const neckShown: boolean = false;

/**
 * Makes the check of a goal met, small and grey, see the class `tracker-check` in `trackers.css`.
 *
 * @returns Icon of the check
 */
function checkOf(): SVGElement {
    const check: SVGElement = iconOf(Check);
    check.classList.add("tracker-check");
    return check;
}

/**
 * Makes a tile of a tracker, of the neck: its value over its name, a check after a value
 * in the healthy band or at its goal, a dash for a value not logged.
 *
 * @param value - Value, empty for none
 * @param met - Whether it lies in the healthy band or reaches its goal
 * @param name - What the value is, like `long · 7 days`
 * @returns Tile
 */
function tileOf(value: string, met: boolean, name: string): HTMLElement {
    const tile: HTMLElement = elementOf("div", "tile", "");
    const amount: HTMLElement = elementOf(
        "span",
        "tile-value",
        value === "" ? "–" : value,
    );
    if (value !== "" && met) amount.append(checkOf());
    tile.append(amount, elementOf("span", "tile-name", name));
    return tile;
}

/**
 * Logs one more glass of water, at now on the shown day, five minutes long,
 * see `nowOn` in `times.ts`.
 * - `start`: Start of the glass.
 *
 * @param calendar - Calendar of the day
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
 * like `Sleep 07h 30m`, see `.tracker-row` in `trackers.css`.
 *
 * @param name - Name of the tracker, like `Sleep`
 * @param value - Its value as shown, like `07h 30m`
 * @returns Name and value
 */
function linesOf(name: string, value: string): HTMLElement[] {
    return [
        elementOf("span", "tracker-name", name),
        elementOf("span", "tracker-value", value),
    ];
}

/**
 * Builds the water: what I drank in litres, every drink one glass of 0.25 l,
 * like `1.5 l` of six glasses, its tile one button, which logs one more glass of water,
 * and `−` in its corner, which takes the last glass of water back;
 * the words of `−` only for screen readers, no description under the pointer, no goal;
 * on a day still to come the tile greyed and `−` hidden, since nothing is drunk there yet.
 * The tile takes no clicks while a glass is sent, so a double tap logs one glass;
 * the card loads again once the log changed.
 * - `litres`: What I drank, in litres, as shown.
 * - `last`: The last glass of water that can be taken back, `undefined` for none.
 * - `coming`: Whether the day is still to come.
 * - `send`: Sends a change of the glasses, the tile inert meanwhile.
 *
 * @param calendar - Calendar of the day
 * @param trackers - Trackers of the day
 * @param day - The shown day, like `2026-10-10`
 * @returns Tile of the water
 */
function waterOf(calendar: Calendar, trackers: Trackers, day: string): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row tracker-water", "");
    const add: HTMLButtonElement = document.createElement("button");
    const less: HTMLButtonElement = document.createElement("button");
    const litres: string = `${amountOf((trackers.glasses.length * trackers.settings.glassMl) / 1000, 2)} l`;
    const last: Glass | undefined = trackers.glasses
        .filter((glass: Glass): boolean => glass.water && glass.editable)
        .at(-1);
    const coming: boolean = day > calendarTodayOf();
    const send: (change: () => Promise<void>) => void = (
        change: () => Promise<void>,
    ): void => {
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
    add.addEventListener("click", (): void =>
        send((): Promise<void> => glassAdd(calendar)),
    );
    less.type = "button";
    less.className = "icon-button chip-button water-less";
    less.append(iconOf(Minus));
    less.setAttribute("aria-label", "0.25 l less");
    less.disabled = last === undefined;
    less.hidden = coming;
    less.addEventListener("click", (): void =>
        send((): Promise<void> => entryDelete(calendar, last?.id ?? "")),
    );
    row.append(add, less);
    return row;
}

/**
 * Builds the food: the kcal of the day's meals, rounded and so never marked as an estimate,
 * like `1.850 kcal` or `0 kcal`, a number never apart from its word.
 * - `food`: What the meals gave.
 *
 * @param trackers - Trackers of the day
 * @returns Tile of the food
 */
function foodOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Food", `${amountOf(trackers.food.kcal, 0)}\u00a0kcal`));
    return row;
}

/**
 * Builds the sleep: how long I slept on the day, every sleep that ended on it,
 * the night and the naps, so a sleep from 22:00 to 05:00 counts for the day of 05:00,
 * in hours and minutes, each two digits, like `07h 30m`, or `08h 00m` on the hour;
 * while no sleep is logged `00h 00m`,
 * in the colour of the text like the water's `0.00 l`, so no dash stands there.
 *
 * @param trackers - Trackers of the day
 * @returns Tile of the sleep
 */
function sleepOf(trackers: Trackers): HTMLElement {
    const row: HTMLElement = elementOf("div", "tracker-row", "");
    row.append(...linesOf("Sleep", lengthOf(trackers.sleep.slept)));
    return row;
}

/**
 * Builds the neck: two tiles over the seven days up to the day,
 * on how many of my study days I did a neck routine, short or long,
 * like `2 / 5`, a check from two thirds on, a dash while the week has no study day,
 * and on how many days a long one against my goal, like `1 / 3`, a check once reached;
 * then my neck pain, like `5.2 → 4.0`,
 * or the first mean alone in the first four weeks, a dash before any rating.
 * - `neck`: My neck routine of the seven days.
 * - `goal`: Days with a long neck session I want in seven days.
 * - `pain`: My pain as the tile writes it.
 * - `tiles`: The tiles side by side.
 *
 * @param trackers - Trackers of the day
 * @returns Row of the neck
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
 * @param day - Day like `2026-10-10`
 * @returns The trackers of the day
 * @throws {Error} - When the reader cannot answer
 */
export async function trackersFetch(day: string): Promise<Trackers> {
    return readerAsk<Trackers>(`/api/day/trackers?date=${day}`);
}

/**
 * Loads the trackers of the shown day and shows them, unless another day is shown meanwhile;
 * the neck only once {@link neckShown}.
 * - `day`: The shown day.
 * - `trackers`: Its trackers.
 *
 * @param calendar - Calendar of the day
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
 *
 * @param calendar - Calendar of the day
 */
export function trackersSee(calendar: Calendar): void {
    trackersLoad(calendar).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("trackers")
            ?.replaceChildren(
                elementOf("p", "tracker-meta", "The trackers cannot be read"),
            );
    });
}
