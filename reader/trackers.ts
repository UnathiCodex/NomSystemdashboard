/**
 * ## Trackers
 *
 * Reads the trackers of a day from the log:
 * my sleep against my goals, my glasses of water against my goal, my neck sessions against my goal,
 * and what my meals gave, see `food.ts`.
 * My goals stand here, in one place, and so do the numbers of my learning, see {@link settings}.
 * Sleep is an entry of the category `Sleep`,
 * written by the entry by category with its start and end,
 * and its what, `Night`, `Day` for a nap or a new one, see `categories.ts`.
 * The night of a day is the longest sleep of at least 3 hours that ends on it in Berlin time,
 * the sleep I wake up from that morning, so a nap never becomes the night,
 * and a sleep `Day` never, whatever its length; any other what counts like a `Night`.
 * What I slept on a day is every sleep that ends on it, the night and the naps,
 * so a sleep from 22:00 to 05:00 counts for the day it ends on, never for the day it began on.
 * The week holds the nights of the day and the six days before it,
 * those logged: how long I slept on average, and how regular I was, how much my bedtime varied.
 * Glasses, meals and neck sessions count for the calendar day of their start in Berlin time,
 * from 00:00 to 00:00, like a glass of water at 01:00 on 14.10.2026 for 14.10.2026.
 * A glass of water is an entry of the category `Drink` with the what `Water`,
 * which the counter of the day writes, one per glass at the moment of the tap, five minutes long;
 * such an entry from the entry by category counts too.
 * Every other drink, like `Kaffee`, counts as one glass as well,
 * since the reference of 2.5 litres a day counts the water of all drinks (EFSA 2010);
 * the counter takes back only glasses of water.
 * A neck session is an entry of the category `Body` with a neck routine as its what,
 * `Neck short` or `Neck long`, see `categories.ts`;
 * the trackers count the two parts of the routine apart over the day and the six days before it:
 * on how many of my study days I did one, short or long, since long holds short,
 * and on how many days a long one.
 * A long session carries my neck pain from 0 to 10, its `X-PAIN`,
 * the outcome the routine is judged by:
 * the mean of my first four weeks of pain against that of the last four, up to the day.
 * A study day is a day with an entry `Skill` in the log, like a lecture or a study session.
 *
 * - `./calendar.ts`: Reads the log and writes instants and their days in Berlin time.
 * - `./categories.ts`: Names the neck routines and the category of skill entries.
 * - `./food.ts`: Reads the meals of a day with what they give.
 * - `./sources.ts`: Names the log of the trackers.
 */

import { berlinDateOf, berlinTimeOf, entriesRead, summaryBaseOf } from "./calendar.ts";
import { neckRoutines, skillName } from "./categories.ts";
import { foodDayRead } from "./food.ts";
import { trackerLog } from "./sources.ts";

import type { Entry } from "./calendar.ts";
import type { FoodDay, Totals } from "./food.ts";

/**
 * My goals for the trackers, the size of a glass, and the numbers of my learning.
 *
 * - `sleepHours`: Hours of sleep I want a night.
 * - `sleepBand`: Fewest and most hours of a healthy night.
 * - `glassMl`: Millilitres of one glass of water.
 * - `waterMl`: Millilitres of water I want a day.
 * - `bedtimeVaried`: Minutes my bedtime may vary over the week, up or down, for its check.
 * - `neckLongWeek`: Long neck sessions I want in seven days;
 *   a short one, or a long, on every study day.
 * - `sessionMinutes`: Minutes of one study session, as a session the learning view opens.
 * - `taskMinutes`: Minutes of one Task,
 *   which every section due today brings to the box of its chapter in the plan
 *   of today, see `suggestions.ts`.
 * - `theoryMinutes`: Minutes of the Definitions,
 *   the Algorithm and the Example of a section on round 0,
 *   which it brings to that box besides its Task.
 */
export type TrackerSettings = {
    sleepHours: number;
    sleepBand: [number, number];
    glassMl: number;
    waterMl: number;
    bedtimeVaried: number;
    neckLongWeek: number;
    sessionMinutes: number;
    taskMinutes: number;
    theoryMinutes: number;
};

/**
 * A night of sleep.
 *
 * - `minutes`: Minutes asleep.
 * - `asleep`: When I fell asleep, in Berlin time, like `23:30`.
 * - `awake`: When I woke up, in Berlin time, like `07:15`.
 */
export type Night = {
    minutes: number;
    asleep: string;
    awake: string;
};

/**
 * My sleep on a day.
 *
 * - `night`: The night that ended on the day, `null` when none is logged.
 * - `slept`: Minutes of every sleep that ended on the day,
 *   the night and the naps, 0 when none is logged.
 * - `minutes`: Average minutes of the nights of the week, `null` when none is logged.
 * - `varied`: How much my bedtime varied over the nights of the week,
 *   its standard deviation in minutes;
 *   `null` for fewer than two nights.
 * - `nights`: Number of nights of the week logged.
 */
export type SleepDay = {
    night: Night | null;
    slept: number;
    minutes: number | null;
    varied: number | null;
    nights: number;
};

/**
 * A glass of a drink, of water or of another drink, like `Kaffee`.
 *
 * - `id`: Identifier of its entry.
 * - `start`: When I drank it, as ISO instant.
 * - `water`: Whether it is a glass of water, which the counter wrote and may take back.
 * - `editable`: Whether its entry can be changed, see `calendar.ts`,
 *   so the counter may take it back.
 */
export type Glass = {
    id: string;
    start: string;
    water: boolean;
    editable: boolean;
};

/**
 * My neck routine in the seven days up to a day, the day included, and my neck pain.
 *
 * - `short`: My study days on which I did a neck routine, short or long.
 * - `studyDays`: My study days, days with an entry `Skill` in the log.
 * - `long`: Days with a long neck session.
 * - `painFirst`: Mean of my pain in the first four weeks I rated it,
 *   `null` before the first rating.
 * - `painLast`: Mean of my pain in the last four weeks up to the day,
 *   `null` while those still are the first four.
 */
export type NeckWeek = {
    short: number;
    studyDays: number;
    long: number;
    painFirst: number | null;
    painLast: number | null;
};

/**
 * The trackers of a day.
 *
 * - `settings`: My goals, the size of a glass and the numbers of my learning, see {@link settings}.
 * - `sleep`: My sleep.
 * - `glasses`: My glasses of water and of every other drink, in the order I drank them.
 * - `neck`: My neck routine in the seven days up to the day, the day included.
 * - `food`: What my meals gave, totals without goals, see `food.ts`.
 */
export type Trackers = {
    settings: TrackerSettings;
    sleep: SleepDay;
    glasses: Glass[];
    neck: NeckWeek;
    food: Totals & { estimate: boolean };
};

/**
 * {@link TrackerSettings} as I set them, the one place to change them:
 * 8 hours of sleep a night, within the healthy band of 7 to 9 hours for adults,
 * and 2.5 litres of water a day, 10 glasses of 250 ml.
 * There is no goal for when to fall asleep:
 * the trackers show how much my bedtime varies, with a check within 30 minutes up or down,
 * since regular sleep over weeks goes with better grades (Phillips 2017, Okano 2019)
 * and the regularity of sleep with lower mortality, more than its length (Windred 2024).
 * A short neck session, or a long one, on every study day, and 3 long ones in seven days,
 * since regular strengthening eased neck pain after 10 to 20 weeks (Gross 2015) and about
 * once a week did nothing (Jones 2024).
 * My learning: study sessions of 60 minutes,
 * 30 for a Task and 30 more for the theory of a new section, my choice,
 * not a finding (`.claude/studies/science.md`, point 9);
 * a chapter opens by a skill box of my plan or by itself, see `todayMarked` in `skill.ts`.
 */
export const settings: TrackerSettings = {
    sleepHours: 8,
    sleepBand: [7, 9],
    glassMl: 250,
    waterMl: 2500,
    bedtimeVaried: 30,
    neckLongWeek: 3,
    sessionMinutes: 60,
    taskMinutes: 30,
    theoryMinutes: 30,
};

/**
 * Category of sleeps, `CATEGORIES:Sleep`.
 */
const sleepName: string = "Sleep";

/**
 * Fewest minutes of a sleep that counts as a night, 3 hours; a shorter sleep is a nap.
 */
const nightMinutes: number = 3 * 60;

/**
 * What of a nap, `SUMMARY:Day` of a sleep, which never counts as a night, see `categories.ts`.
 */
const napName: string = "Day";

/**
 * Category of a glass of water, `CATEGORIES:Drink`.
 */
const drinkName: string = "Drink";

/**
 * What of a glass of water, `SUMMARY:Water`.
 */
const waterName: string = "Water";

/**
 * Category of a neck session, `CATEGORIES:Body`.
 */
const bodyName: string = "Body";

/**
 * What of a long neck session, one of the {@link neckRoutines}.
 */
const neckLongName: string = "Neck long";

/**
 * Days a week holds, the day and the six before it.
 */
const weekDays: number = 7;

/**
 * Days of the first and of the last stretch of my neck pain compared, four weeks.
 */
const painDays: number = 28;

/**
 * Start of the log of the new system, 1 August 2026, the first day my neck pain can be rated.
 */
const newSystemStart: string = "2026-08-01T00:00:00+02:00";

/**
 * Minutes of a day.
 */
const dayMinutes: number = 24 * 60;

/**
 * Milliseconds of a day.
 */
const dayLength: number = dayMinutes * 60 * 1000;

/**
 * Turns a time of day into minutes after midnight.
 *
 * @param time - Time like `23:30`
 * @returns Minutes, like 1410
 */
function minutesOf(time: string): number {
    const [hours, minutes]: number[] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Gives how long an entry lasts.
 *
 * @param entry - Entry with times
 * @returns Its length in milliseconds
 */
function lengthOf(entry: Entry): number {
    return Date.parse(entry.end) - Date.parse(entry.start);
}

/**
 * Turns a sleep into a {@link Night}.
 *
 * @param sleep - Entry of the category `Sleep`
 * @returns Night
 */
function nightOf(sleep: Entry): Night {
    return {
        minutes: Math.round(lengthOf(sleep) / 60000),
        asleep: berlinTimeOf(new Date(sleep.start)),
        awake: berlinTimeOf(new Date(sleep.end)),
    };
}

/**
 * Tells how much my bedtime varied over nights: the standard deviation of when I fell asleep,
 * each counted in minutes from noon, so 23:30 and 00:30 lie an hour apart.
 * - `bedtimes`: When I fell asleep each night, in minutes from noon.
 * - `mean`: Their mean.
 *
 * @param nights - Nights
 * @returns Minutes, `null` for fewer than two nights
 */
function variedOf(nights: Night[]): number | null {
    if (nights.length < 2) return null;
    const bedtimes: number[] = nights.map(
        (night: Night): number =>
            (minutesOf(night.asleep) - dayMinutes / 2 + dayMinutes) % dayMinutes,
    );
    const mean: number =
        bedtimes.reduce((sum: number, bedtime: number): number => sum + bedtime, 0) /
        bedtimes.length;
    return Math.round(
        Math.sqrt(
            bedtimes.reduce(
                (sum: number, bedtime: number): number => sum + (bedtime - mean) ** 2,
                0,
            ) / bedtimes.length,
        ),
    );
}

/**
 * Reads my sleep on a day, see the top of this file:
 * the sleeps of the log from noon eight days before to noon the day after,
 * which hold every night of the week;
 * the night of each day the longest that ends on it, without the naps,
 * and what I slept on the day all that end on it, the naps too.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 * - `sleeps`: Sleeps of the range.
 * - `longs`: Those that are no `Day`, at least {@link nightMinutes} long.
 * - `nights`: Night of each day of the week, the day first, `null` for a day without one.
 * - `day`: A day of the week, like `2026-10-09`.
 * - `logged`: The nights logged.
 *
 * @param date - Day like `2026-10-10`
 * @returns My sleep on the day
 */
function sleepRead(date: string): SleepDay {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const sleeps: Entry[] = entriesRead(
        trackerLog,
        new Date(noon - (weekDays + 1) * dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    ).filter((entry: Entry): boolean => entry.category === sleepName && !entry.allDay);
    const longs: Entry[] = sleeps.filter(
        (sleep: Entry): boolean =>
            summaryBaseOf(sleep.title) !== napName && lengthOf(sleep) >= nightMinutes * 60 * 1000,
    );
    const nights: (Night | null)[] = Array.from(
        { length: weekDays },
        (_: unknown, back: number): Night | null => {
            const day: string = new Date(noon - back * dayLength).toISOString().slice(0, 10);
            const night: Entry | undefined = longs
                .filter((sleep: Entry): boolean => berlinDateOf(new Date(sleep.end)) === day)
                .sort(
                    (first: Entry, second: Entry): number => lengthOf(second) - lengthOf(first),
                )[0];
            return night === undefined ? null : nightOf(night);
        },
    );
    const logged: Night[] = nights.filter((night: Night | null): night is Night => night !== null);
    return {
        night: nights[0],
        slept: Math.round(
            sleeps
                .filter((sleep: Entry): boolean => berlinDateOf(new Date(sleep.end)) === date)
                .reduce((sum: number, sleep: Entry): number => sum + lengthOf(sleep), 0) / 60000,
        ),
        minutes:
            logged.length === 0
                ? null
                : Math.round(
                      logged.reduce((sum: number, night: Night): number => sum + night.minutes, 0) /
                          logged.length,
                  ),
        varied: variedOf(logged),
        nights: logged.length,
    };
}

/**
 * Tells whether an entry is a glass of water:
 * of the category `Drink`, with the what `Water`, ignoring case.
 *
 * @param entry - Entry of the log
 * @returns Whether it is a glass of water
 */
export function glassIs(entry: Entry): boolean {
    return (
        entry.category === drinkName && entry.title.trim().toLowerCase() === waterName.toLowerCase()
    );
}

/**
 * Reads my glasses on a day, of water and of every other drink:
 * the entries `Drink` that start on it, read from noon the day before to noon the day after,
 * which holds the whole day and its night.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 *
 * @param date - Day like `2026-10-10`
 * @returns Glasses in the order I drank them
 */
function glassesRead(date: string): Glass[] {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    return entriesRead(
        trackerLog,
        new Date(noon - dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    )
        .filter(
            (entry: Entry): boolean =>
                entry.category === drinkName &&
                !entry.allDay &&
                berlinDateOf(new Date(entry.start)) === date,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Glass => ({
            id: entry.id,
            start: entry.start,
            water: glassIs(entry),
            editable: entry.editable,
        }));
}

/**
 * Reads my neck routine in the seven days up to a day, see {@link NeckWeek}:
 * from the entries that start on the day or on one of the six days before it,
 * read from noon eight days before to noon the day after,
 * which holds all seven days, my neck sessions,
 * the entries `Body` with a neck routine as their what,
 * and my study days, the days with an entry `Skill`.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 * - `first`: The first of the seven days, like `2026-10-04`.
 * - `dayOf`: Day of an entry's start in Berlin time.
 * - `entries`: Entries of the seven days.
 * - `necks`: My neck sessions.
 * - `neckDays`: Days with a neck session.
 * - `studyDays`: My study days.
 *
 * @param date - Day like `2026-10-10`
 * @returns My neck routine of the seven days
 */
function neckRead(date: string): NeckWeek {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const first: string = new Date(noon - (weekDays - 1) * dayLength).toISOString().slice(0, 10);
    const dayOf: (entry: Entry) => string = (entry: Entry): string =>
        berlinDateOf(new Date(entry.start));
    const entries: Entry[] = entriesRead(
        trackerLog,
        new Date(noon - (weekDays + 1) * dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    ).filter((entry: Entry): boolean => dayOf(entry) >= first && dayOf(entry) <= date);
    const necks: Entry[] = entries.filter(
        (entry: Entry): boolean =>
            entry.category === bodyName && Object.keys(neckRoutines).includes(entry.title),
    );
    const neckDays: Set<string> = new Set(necks.map(dayOf));
    const studyDays: Set<string> = new Set(
        entries.filter((entry: Entry): boolean => entry.category === skillName).map(dayOf),
    );
    const [painFirst, painLast]: [number | null, number | null] = painRead(date);
    return {
        short: [...studyDays].filter((day: string): boolean => neckDays.has(day)).length,
        studyDays: studyDays.size,
        long: new Set(
            necks.filter((entry: Entry): boolean => entry.title === neckLongName).map(dayOf),
        ).size,
        painFirst: painFirst,
        painLast: painLast,
    };
}

/**
 * Gives the mean of numbers to one decimal.
 *
 * @param numbers - Numbers
 * @returns Mean, like 5.2, `null` for none
 */
function meanOf(numbers: number[]): number | null {
    return numbers.length === 0
        ? null
        : Math.round(
              (numbers.reduce((sum: number, number: number): number => sum + number, 0) /
                  numbers.length) *
                  10,
          ) / 10;
}

/**
 * Reads my neck pain up to a day: the pain of my long neck sessions in the log of the new system,
 * the mean of the first four weeks from my first rating, and of the last four weeks up to the day,
 * once the day lies beyond the first four.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 * - `rated`: Long sessions up to the day with a pain, each as its day and its pain.
 * - `first`: Day of the first rating.
 * - `firstEnd`: First day after the first four weeks.
 * - `lastStart`: First day of the last four weeks up to the day.
 * - `painsOf`: Pains of the ratings from a day on, before another.
 *
 * @param date - Day like `2026-10-10`
 * @returns Mean of the first four weeks and of the last four, each `null` when there is none
 */
function painRead(date: string): [number | null, number | null] {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const rated: [string, number][] = entriesRead(
        trackerLog,
        newSystemStart,
        new Date(noon + dayLength).toISOString(),
    )
        .filter(
            (entry: Entry): boolean =>
                entry.category === bodyName &&
                entry.title === neckLongName &&
                entry.pain !== "" &&
                berlinDateOf(new Date(entry.start)) <= date,
        )
        .map((entry: Entry): [string, number] => [
            berlinDateOf(new Date(entry.start)),
            Number(entry.pain),
        ]);
    if (rated.length === 0) return [null, null];
    const first: string = rated.map(([day]: [string, number]): string => day).sort()[0];
    const firstEnd: string = new Date(Date.parse(`${first}T12:00:00Z`) + painDays * dayLength)
        .toISOString()
        .slice(0, 10);
    const lastStart: string = new Date(noon - (painDays - 1) * dayLength)
        .toISOString()
        .slice(0, 10);
    const painsOf: (from: string, to: string) => number[] = (from: string, to: string): number[] =>
        rated
            .filter(([day]: [string, number]): boolean => day >= from && day < to)
            .map(([, pain]: [string, number]): number => pain);
    return [
        meanOf(painsOf(first, firstEnd)),
        date < firstEnd ? null : meanOf(painsOf(lastStart, "9999-12-31")),
    ];
}

/**
 * Reads the trackers of a day, see {@link Trackers}.
 * - `food`: The meals of the day with what they give.
 *
 * @param date - Day like `2026-10-10`
 * @returns The trackers of the day
 * @throws {Error} - When the date is not written like `2026-10-10`
 */
export function trackersRead(date: string): Trackers {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const food: FoodDay = foodDayRead(date);
    return {
        settings: settings,
        sleep: sleepRead(date),
        glasses: glassesRead(date),
        neck: neckRead(date),
        food: {
            kcal: food.kcal,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            estimate: food.estimate,
        },
    };
}
