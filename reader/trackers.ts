/**
 * ## Trackers
 *
 * The trackers of a day from the log, sleep, water and neck sessions against my goals,
 * and what my meals gave.
 * The night of a day is the longest sleep of at least 3 hours that ends on it in Berlin time,
 * so a nap never becomes the night, and a sleep `Day` never, whatever its length.
 * What I slept on a day is every sleep that ends on it, the night and the naps.
 * The week holds the day and the six days before it.
 * Glasses, meals and neck sessions count for the day of their start in Berlin time.
 * Every other drink counts as one glass too, since the 2.5 litres count the water of all drinks (EFSA 2010).
 * The counter takes back only glasses of water.
 * A neck session counts on my study days, short or long, since long holds short.
 * A long session carries my neck pain from 0 to 10, its `X-PAIN`, the outcome the routine is judged by.
 * A study day is a day with an entry `Skill` in the log.
 */

import { berlinDateOf, berlinTimeOf, entriesRead, minutesOf, summaryBaseOf } from "./calendar.ts";
import { neckRoutines, skillName } from "./categories.ts";
import { foodDayRead } from "./food.ts";
import { trackerLog } from "./sources.ts";

import type { Entry } from "./calendar.ts";
import type { FoodDay, Totals } from "./food.ts";

/**
 * My goals for the trackers, the size of a glass, and the numbers of my learning.
 * - `bedtimeVaried`: Minutes my bedtime may vary over the week, up or down.
 * - `taskMinutes`: Minutes of one Task, which every section due today brings to the box of its chapter.
 * - `theoryMinutes`: Minutes of the Definitions, Algorithm and Example of a section on round 0.
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

/** A night of sleep, its times in Berlin time. */
export type Night = {
    minutes: number;
    asleep: string;
    awake: string;
};

/**
 * My sleep on a day.
 * - `slept`: Minutes of every sleep that ended on the day, the naps too.
 * - `minutes`: Average minutes of the nights of the week.
 * - `varied`: Standard deviation of my bedtime over the week in minutes, `null` for fewer than two nights.
 */
export type SleepDay = {
    night: Night | null;
    slept: number;
    minutes: number | null;
    varied: number | null;
    nights: number;
};

/** A glass of a drink, `water` the ones the counter wrote and may take back. */
export type Glass = {
    id: string;
    start: string;
    water: boolean;
    editable: boolean;
};

/**
 * My neck routine in the week up to a day, and my neck pain.
 * - `short`: My study days with a neck routine, short or long.
 * - `painLast`: Mean pain of the last four weeks, `null` while those are still the first four.
 */
export type NeckWeek = {
    short: number;
    studyDays: number;
    long: number;
    painFirst: number | null;
    painLast: number | null;
};

/** The trackers of a day, food as totals without goals. */
export type Trackers = {
    settings: TrackerSettings;
    sleep: SleepDay;
    glasses: Glass[];
    neck: NeckWeek;
    food: Totals & { estimate: boolean };
};

/**
 * {@link TrackerSettings} as I set them, the one place to change them.
 * 8 hours of sleep within the healthy band of 7 to 9 for adults, 2.5 litres of water in glasses of 250 ml.
 * No goal for when to fall asleep, only my bedtime within 30 minutes up or down,
 * since regular sleep goes with better grades (Phillips 2017, Okano 2019)
 * and with lower mortality, more than its length (Windred 2024).
 * A neck session on every study day and 3 long ones a week,
 * since regular strengthening eased neck pain after 10 to 20 weeks (Gross 2015)
 * and about once a week did nothing (Jones 2024).
 * Study sessions of 60 minutes, 30 for a Task and 30 for new theory,
 * my choice and not a finding (`.claude/studies/science.md`, point 9).
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

const sleepName: string = "Sleep";

/** Fewest minutes of a night, a shorter sleep is a nap. */
const nightMinutes: number = 3 * 60;

/** What of a nap, never a night. */
const napName: string = "Day";

const drinkName: string = "Drink";

const waterName: string = "Water";

/** Category of a neck session. */
const bodyName: string = "Body";

const neckLongName: string = "Neck long";

const weekDays: number = 7;

/** Days of the first and the last stretch of neck pain compared. */
const painDays: number = 28;

/** Start of the log of the new system, the first day my neck pain can be rated. */
const newSystemStart: string = "2026-08-01T00:00:00+02:00";

const dayMinutes: number = 24 * 60;

/** Milliseconds of a day. */
const dayLength: number = dayMinutes * 60 * 1000;

/** How long an entry lasts in milliseconds. */
function lengthOf(entry: Entry): number {
    return Date.parse(entry.end) - Date.parse(entry.start);
}

function nightOf(sleep: Entry): Night {
    return {
        minutes: Math.round(lengthOf(sleep) / 60000),
        asleep: berlinTimeOf(new Date(sleep.start)),
        awake: berlinTimeOf(new Date(sleep.end)),
    };
}

/** Standard deviation of my bedtime, in minutes from noon so 23:30 and 00:30 lie an hour apart. */
function variedOf(nights: Night[]): number | null {
    if (nights.length < 2) return null;
    const bedtimes: number[] = nights.map(
        (night: Night): number => (minutesOf(night.asleep) - dayMinutes / 2 + dayMinutes) % dayMinutes,
    );
    const mean: number = bedtimes.reduce((sum: number, bedtime: number): number => sum + bedtime, 0) / bedtimes.length;
    return Math.round(
        Math.sqrt(
            bedtimes.reduce((sum: number, bedtime: number): number => sum + (bedtime - mean) ** 2, 0) / bedtimes.length,
        ),
    );
}

/** Reads my sleep on a day from noon eight days before to noon the day after, every night of the week. */
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
    const nights: (Night | null)[] = Array.from({ length: weekDays }, (_: unknown, back: number): Night | null => {
        const day: string = new Date(noon - back * dayLength).toISOString().slice(0, 10);
        const night: Entry | undefined = longs
            .filter((sleep: Entry): boolean => berlinDateOf(new Date(sleep.end)) === day)
            .sort((first: Entry, second: Entry): number => lengthOf(second) - lengthOf(first))[0];
        return night === undefined ? null : nightOf(night);
    });
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
                      logged.reduce((sum: number, night: Night): number => sum + night.minutes, 0) / logged.length,
                  ),
        varied: variedOf(logged),
        nights: logged.length,
    };
}

/** Tells whether an entry is a glass of water, ignoring case. */
export function glassIs(entry: Entry): boolean {
    return entry.category === drinkName && entry.title.trim().toLowerCase() === waterName.toLowerCase();
}

/** Reads my glasses on a day in order, from noon the day before to noon after, the day and its night. */
function glassesRead(date: string): Glass[] {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    return entriesRead(trackerLog, new Date(noon - dayLength).toISOString(), new Date(noon + dayLength).toISOString())
        .filter(
            (entry: Entry): boolean =>
                entry.category === drinkName && !entry.allDay && berlinDateOf(new Date(entry.start)) === date,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Glass => ({
            id: entry.id,
            start: entry.start,
            water: glassIs(entry),
            editable: entry.editable,
        }));
}

/** Reads my neck routine in the week up to a day, from noon eight days before to noon the day after. */
function neckRead(date: string): NeckWeek {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const first: string = new Date(noon - (weekDays - 1) * dayLength).toISOString().slice(0, 10);
    const dayOf: (entry: Entry) => string = (entry: Entry): string => berlinDateOf(new Date(entry.start));
    const entries: Entry[] = entriesRead(
        trackerLog,
        new Date(noon - (weekDays + 1) * dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    ).filter((entry: Entry): boolean => dayOf(entry) >= first && dayOf(entry) <= date);
    const necks: Entry[] = entries.filter(
        (entry: Entry): boolean => entry.category === bodyName && Object.keys(neckRoutines).includes(entry.title),
    );
    const neckDays: Set<string> = new Set(necks.map(dayOf));
    const studyDays: Set<string> = new Set(
        entries.filter((entry: Entry): boolean => entry.category === skillName).map(dayOf),
    );
    const [painFirst, painLast]: [number | null, number | null] = painRead(date);
    return {
        short: [...studyDays].filter((day: string): boolean => neckDays.has(day)).length,
        studyDays: studyDays.size,
        long: new Set(necks.filter((entry: Entry): boolean => entry.title === neckLongName).map(dayOf)).size,
        painFirst: painFirst,
        painLast: painLast,
    };
}

/** Mean to one decimal, `null` for none. */
function meanOf(numbers: number[]): number | null {
    return numbers.length === 0
        ? null
        : Math.round((numbers.reduce((sum: number, number: number): number => sum + number, 0) / numbers.length) * 10) /
              10;
}

/** Mean neck pain of the first four weeks from my first rating, and of the last four once beyond them. */
function painRead(date: string): [number | null, number | null] {
    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const rated: [string, number][] = entriesRead(trackerLog, newSystemStart, new Date(noon + dayLength).toISOString())
        .filter(
            (entry: Entry): boolean =>
                entry.category === bodyName &&
                entry.title === neckLongName &&
                entry.pain !== "" &&
                berlinDateOf(new Date(entry.start)) <= date,
        )
        .map((entry: Entry): [string, number] => [berlinDateOf(new Date(entry.start)), Number(entry.pain)]);
    if (rated.length === 0) return [null, null];
    const first: string = rated.map(([day]: [string, number]): string => day).sort()[0];
    const firstEnd: string = new Date(Date.parse(`${first}T12:00:00Z`) + painDays * dayLength)
        .toISOString()
        .slice(0, 10);
    const lastStart: string = new Date(noon - (painDays - 1) * dayLength).toISOString().slice(0, 10);
    const painsOf: (from: string, to: string) => number[] = (from: string, to: string): number[] =>
        rated
            .filter(([day]: [string, number]): boolean => day >= from && day < to)
            .map(([, pain]: [string, number]): number => pain);
    return [meanOf(painsOf(first, firstEnd)), date < firstEnd ? null : meanOf(painsOf(lastStart, "9999-12-31"))];
}

/** @throws {Error} - When the date is not written like `2026-10-10` */
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
