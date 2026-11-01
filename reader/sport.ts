/**
 * ## Sport
 *
 * The sessions of a day from the log with their time and their kcal.
 * My workouts, my exercises, my weight, each in its own table, never in the code.
 * A session is a log entry of `Sport`, holding what I did as a meal holds its foods.
 * Each exercise is a line `X-EXERCISE` with its workout.
 * So the log keeps what I did that day, whatever I change in my workouts later.
 * A session burns (MET − 1) × kg × hours of its minutes,
 * the MET of exercises from the 2024 Adult Compendium of Physical Activities.
 * Less the 1 MET I burn at rest anyway, so it counts only what the sport added.
 * An estimate written with `~`, since even a watch is more than a fifth off (Shcherbina 2017).
 * An exercise burns no kcal of its own, since nobody writes down how long or how hard.
 * One exercise name may stand in several rows, each its own variant.
 * No name holds `|` or `;`, which part table cells and log lines.
 * A name of a workout or an exercise holds no comma either, which parts a list.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, entriesRead, summaryBaseOf } from "./calendar.ts";
import { cellsOf, nameOf } from "./markdown.ts";
import { sport, writeAllowed } from "./sources.ts";

import type { Entry } from "./calendar.ts";

/** A kind of sport with the MET of its closest activity in the Compendium, its `code` there to look it up. */
type SportKind = {
    name: string;
    met: number;
    code: string;
};

/**
 * A session of a day.
 *
 * - `kcal`: Burned above rest.
 * - `workout`: Its workouts parted by `, `, empty for none.
 */
export type Session = {
    id: string;
    start: string;
    end: string;
    summary: string;
    minutes: number;
    kcal: number;
    workout: string;
    exercises: SessionExercise[];
};

/** A line `X-EXERCISE` of a session, its `reps` may be seconds. */
export type SessionExercise = Part & {
    workout: string;
};

/** The sessions of a day with their sums, at my weight of the day. */
export type SportDay = {
    sessions: Session[];
    minutes: number;
    kcal: number;
    kg: number;
};

/** An exercise with the values of its variant, a row of `Exercises.md` or a part of a workout. */
export type Part = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
};

/** A workout of mine, its exercises in their order. */
export type Workout = {
    name: string;
    parts: Part[];
};

/** An exercise of mine with the workouts that hold it. */
export type Exercise = Part & {
    workouts: string[];
};

/** A row of a table of mine, its cells by the names of its head. */
type Row = { [column: string]: string };

/** A row of `Weights.md`. */
type Weight = {
    day: string;
    kg: number;
};

/**
 * Everything of mine the sport area lists.
 *
 * - `last`: The last line `X-EXERCISE` of each exercise by its name in small letters, so an entry brings it again.
 */
export type Mine = {
    workouts: Workout[];
    exercises: Exercise[];
    last: { [name: string]: string };
};

export const sportName: string = "Sport";

/** Kind of the minutes of a session, resistance training of multiple exercises in the Compendium. */
const exercisesKind: SportKind = { name: "Exercises", met: 3.5, code: "02054" };

/** Text a new `Workouts.md` starts with. */
const workoutsHead: string[] = [
    "# Workouts",
    "",
    "My workouts, each a name of mine and its parts in their order, " +
        "each an exercise with the sets, repetitions and",
    "kilograms it brings.",
    "",
    "| Workout | Part | Sets | Reps | Kg |",
    "| --- | --- | ---: | ---: | ---: |",
];

/** Text a new `Weights.md` starts with. */
const weightsHead: string[] = [
    "# Weights",
    "",
    "My weight, a row whenever I weigh myself, like once a month or two: " + "the day and the kilograms.",
    "The sport area counts the kcal of a session " + "with the last weight on or before its day.",
    "",
    "| Day | Weight |",
    "| --- | ---: |",
];

/** Text a new `Exercises.md` starts with. */
const exercisesHead: string[] = [
    "# Exercises",
    "",
    "My exercises, each by its name, those I add by themselves " +
        "and those of my workouts, with the sets, repetitions",
    "and kilograms I do as a rule, which an entry brings every time; " +
        "repetitions with `s` are seconds, like `60s`.",
    "",
    "| Exercise | Sets | Reps | Kg |",
    "| --- | ---: | ---: | ---: |",
];

/** Lines of a table before its rows, the header and the line below it. */
const tableHead: number = 2;

/** Kilograms before I ever weighed myself. */
const assumedKg: number = 80;

const dayLength: number = 24 * 60 * 60 * 1000;

/**
 * Cleans the name of a workout or an exercise, without a comma, which parts a list.
 * A link pasted into the wrong field is no name.
 */
function ownNameOf(name: string): string {
    return /^\s*https?:\/\//i.test(name) ? "" : nameOf(name.replace(/\s*,\s*/g, " "));
}

/** Reads a number, a decimal comma as a point, `null` for none or one below 0. */
function numberOf(text: unknown): number | null {
    const written: string = String(text ?? "")
        .trim()
        .replace(",", ".");
    const value: number = written === "" ? NaN : Number(written);
    return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Turns a day into my standard way `Weights.md` writes. */
function dayTextOf(day: string): string {
    return day.split("-").reverse().join(".");
}

/** Reads a day of `Weights.md` written my standard way or as the reader writes days, empty for none. */
function dayOf(text: string): string {
    const german: RegExpExecArray | null = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
    if (german !== null) return `${german[3]}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : "";
}

/** Reads the rows of a table by the names of its head, so a moved column reads as well. */
function rowsRead(file: string): Row[] {
    if (!existsSync(file)) return [];

    const rows: string[] = readFileSync(file, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"));
    const head: string[] = cellsOf(rows[0] ?? "");
    return rows.slice(tableHead).map((line: string): Row => {
        const cells: string[] = cellsOf(line);
        return Object.fromEntries(
            head.map((name: string, index: number): [string, string] => [name, cells[index] ?? ""]),
        );
    });
}

/**
 * Writes a table of mine anew, so one written by hand turns into the form of today.
 *
 * @throws {Error} - When the file lies outside the new system
 */
function tableWrite(file: string, head: string[], rows: string[][]): void {
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${file}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, [...head, ...rows.map((cells: string[]): string => `| ${cells.join(" | ")} |`), ""].join("\n"));
}

/** Reads my weights, the latest first, the last row of a day counting. */
function weightsRead(): Weight[] {
    const days: Map<string, number> = new Map();
    rowsRead(sport.weights).forEach((cells: Row): void => {
        const day: string = dayOf(cells.Day ?? "");
        const kg: number | null = numberOf(cells.Weight);
        if (day !== "" && kg !== null && kg > 0) days.set(day, kg);
    });
    return [...days]
        .map(([day, kg]: [string, number]): Weight => ({ day: day, kg: kg }))
        .sort((first: Weight, second: Weight): number => second.day.localeCompare(first.day));
}

/**
 * Gives my last weight on or before a day.
 * Else the first after, else {@link assumedKg}, so a session always counts.
 */
function weightOn(weights: Weight[], day: string): number {
    return (weights.find((weight: Weight): boolean => weight.day <= day) ?? weights.at(-1))?.kg ?? assumedKg;
}

/** Gives the kcal above rest, less 1 MET, since that I burn at rest anyway. */
function kcalOf(met: number, minutes: number, kg: number): number {
    return (Math.max(0, met - 1) * kg * minutes) / 60;
}

function sumOf(numbers: number[]): number {
    return numbers.reduce((sum: number, number: number): number => sum + number, 0);
}

/** Reads my workouts, the rows its parts in order. */
function workoutsRead(): Workout[] {
    const workouts: Map<string, Workout> = new Map();
    rowsRead(sport.workouts)
        .filter((cells: Row): boolean => (cells.Workout ?? "") !== "" && (cells.Part ?? "") !== "")
        .forEach((cells: Row): void => {
            const workout: Workout = workouts.get(cells.Workout.toLowerCase()) ?? { name: cells.Workout, parts: [] };
            const part: Part = { name: cells.Part, sets: cells.Sets ?? "", reps: cells.Reps ?? "", kg: cells.Kg ?? "" };
            if (!workout.parts.some((other: Part): boolean => sameExercise(other, part))) workout.parts.push(part);
            workouts.set(cells.Workout.toLowerCase(), workout);
        });
    return [...workouts.values()];
}

/** Writes `Workouts.md` anew, a row per part, so a workout without parts is gone. */
function workoutsWrite(workouts: Workout[]): void {
    tableWrite(
        sport.workouts,
        workoutsHead,
        workouts.flatMap((workout: Workout): string[][] =>
            workout.parts.map((part: Part): string[] => [workout.name, part.name, part.sets, part.reps, part.kg]),
        ),
    );
}

/** Puts what `changed` gives in place of each `held` part, writing only when one is held. */
function partsChange(held: (part: Part) => boolean, changed: (part: Part) => Part[]): void {
    const workouts: Workout[] = workoutsRead();
    if (!workouts.some((workout: Workout): boolean => workout.parts.some(held))) return;
    workoutsWrite(
        workouts.map((workout: Workout): Workout => ({
            ...workout,
            parts: workout.parts.flatMap((part: Part): Part[] => (held(part) ? changed(part) : [part])),
        })),
    );
}

/** Reads my exercises, each variant once. */
function exercisesRead(): Part[] {
    return rowsRead(sport.exercises)
        .map((cells: Row): Part => ({
            name: cells.Exercise ?? "",
            sets: cells.Sets ?? "",
            reps: cells.Reps ?? "",
            kg: cells.Kg ?? "",
        }))
        .filter(
            (exercise: Part, index: number, all: Part[]): boolean =>
                exercise.name !== "" &&
                all.findIndex((other: Part): boolean => sameExercise(other, exercise)) === index,
        );
}

/** Writes `Exercises.md` anew, alphabetical. */
function exercisesWrite(exercises: Part[]): void {
    tableWrite(
        sport.exercises,
        exercisesHead,
        [...exercises]
            .sort((first: Part, second: Part): number => first.name.localeCompare(second.name))
            .map((exercise: Part): string[] => [exercise.name, exercise.sets, exercise.reps, exercise.kg]),
    );
}

/** Lists my exercises with those only in my workouts, each variant once, alphabetical. */
function exercisesOf(workouts: Workout[], own: Part[]): Exercise[] {
    const exercises: Exercise[] = own.map((exercise: Part): Exercise => ({ ...exercise, workouts: [] }));
    workouts.forEach((workout: Workout): void =>
        workout.parts.forEach((part: Part): void => {
            let exercise: Exercise | undefined = exercises.find((other: Exercise): boolean =>
                sameExercise(other, part),
            );
            if (exercise === undefined) {
                exercise = { ...part, workouts: [] };
                exercises.push(exercise);
            }
            if (!exercise.workouts.includes(workout.name)) exercise.workouts.push(workout.name);
        }),
    );
    return exercises.sort((first: Exercise, second: Exercise): number => first.name.localeCompare(second.name));
}

/** Reads a line `X-EXERCISE`. */
function sessionExerciseOf(line: string): SessionExercise {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        name: parts[0] ?? "",
        sets: parts[1] ?? "",
        reps: parts[2] ?? "",
        kg: parts[3] ?? "",
        workout: parts[4] ?? "",
    };
}

/**
 * Tells whether an entry may carry the lines of a session.
 * Only an entry of `Sport` may, each line well formed.
 */
export function sportPartsAllow(category: string, exercises: string[]): boolean {
    if (exercises.length === 0) return true;
    const clean: (text: string) => boolean = (text: string): boolean => !/[|;\r\n]/.test(text);
    return (
        category === sportName &&
        exercises.every((line: string): boolean => {
            const parts: string[] = line.split(";");
            return (
                parts.length === 5 &&
                parts[0].trim() !== "" &&
                clean(parts[0]) &&
                /^\s*\d*\s*$/.test(parts[1]) &&
                /^\s*(?:\d+\s*s?)?\s*$/.test(parts[2]) &&
                (parts[3].trim() === "" || numberOf(parts[3]) !== null) &&
                clean(parts[4])
            );
        })
    );
}

/** Reads the latest line `X-EXERCISE` of each exercise in the whole log. */
function lastRead(): { [name: string]: string } {
    const last: { [name: string]: string } = {};
    entriesRead(sport.log, "1970-01-01T00:00:00Z", "9999-12-31T00:00:00Z")
        .filter((entry: Entry): boolean => entry.category === sportName)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .forEach((entry: Entry): void =>
            (entry.exercises ?? []).forEach((line: string): void => {
                last[sessionExerciseOf(line).name.toLowerCase()] = line;
            }),
        );
    return last;
}

export function mineRead(): Mine {
    const workouts: Workout[] = workoutsRead();
    return {
        workouts: workouts,
        exercises: exercisesOf(workouts, exercisesRead()),
        last: lastRead(),
    };
}

/**
 * Reads the sessions that start on a day in Berlin time, from noon before to noon after.
 * Each burns its minutes as exercises.
 *
 * @throws {Error} - When the date is no `YYYY-MM-DD`
 */
export function sportDayRead(date: string): SportDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const kg: number = weightOn(weightsRead(), date);
    const sessions: Session[] = entriesRead(
        sport.log,
        new Date(noon - dayLength).toISOString(),
        new Date(noon + dayLength).toISOString(),
    )
        .filter(
            (entry: Entry): boolean =>
                entry.category === sportName && !entry.allDay && berlinDateOf(new Date(entry.start)) === date,
        )
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Session => {
            const minutes: number =
                Math.max(0, Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000)) || 0;
            const exercises: SessionExercise[] = (entry.exercises ?? []).map(sessionExerciseOf);
            const workouts: string[] = [
                ...new Set(
                    exercises
                        .map((exercise: SessionExercise): string => exercise.workout)
                        .filter((workout: string): boolean => workout !== ""),
                ),
            ];
            return {
                id: entry.id,
                start: entry.start,
                end: entry.end,
                summary: summaryBaseOf(entry.title),
                minutes: minutes,
                kcal: kcalOf(exercisesKind.met, minutes, kg),
                workout: workouts.join(", "),
                exercises: exercises,
            };
        });
    return {
        sessions: sessions,
        minutes: sumOf(sessions.map((session: Session): number => session.minutes)),
        kcal: sumOf(sessions.map((session: Session): number => session.kcal)),
        kg: kg,
    };
}

/**
 * Writes my weight of a day into `Weights.md` to one decimal, the latest first.
 *
 * @returns The sessions of the day, counted with the new weight
 * @throws {Error} - When the day is none, the kilograms not between 0 and 500, or the file lies outside
 */
export function weightSave(sent: { day?: string; kg?: unknown }): SportDay {
    const day: string = dayOf(String(sent.day ?? ""));
    const kg: number | null = numberOf(sent.kg);
    if (day === "" || Number.isNaN(Date.parse(day))) throw new Error(`No day: ${sent.day}`);
    if (kg === null || kg <= 0 || kg >= 500) throw new Error(`No weight: ${sent.kg}`);

    const weights: Weight[] = [
        ...weightsRead().filter((weight: Weight): boolean => weight.day !== day),
        { day: day, kg: Math.round(kg * 10) / 10 },
    ].sort((first: Weight, second: Weight): number => second.day.localeCompare(first.day));
    tableWrite(
        sport.weights,
        weightsHead,
        weights.map((weight: Weight): string[] => [dayTextOf(weight.day), weight.kg.toFixed(1)]),
    );
    return sportDayRead(day);
}

/** Reads a part the page sends, `null` for one that is none. */
function partOf(sent: unknown): Part | null {
    const part: { name?: unknown; sets?: unknown; reps?: unknown; kg?: unknown } = (sent as { name?: unknown }) ?? {};
    const name: string = ownNameOf(String(part.name ?? ""));
    return name === "" ? null : valuesOf(name, part);
}

/** Reads the values of an exercise the page sends, `null` for one that is none. */
function valuesOf(name: string, sent: { sets?: unknown; reps?: unknown; kg?: unknown }): Part | null {
    const sets: string = String(sent.sets ?? "").trim();
    const reps: string = String(sent.reps ?? "").trim();
    const kg: string = String(sent.kg ?? "")
        .trim()
        .replace(",", ".");
    return /^\d*$/.test(sets) && /^(?:\d+s?)?$/.test(reps) && (kg === "" || numberOf(kg) !== null)
        ? { name: name, sets: sets, reps: reps, kg: kg }
        : null;
}

/** Tells whether two exercises are the same variant, the name ignoring case, the values the same. */
function sameExercise(first: Part, second: Part): boolean {
    return (
        first.name.toLowerCase() === second.name.toLowerCase() &&
        first.sets === second.sets &&
        first.reps === second.reps &&
        first.kg === second.kg
    );
}

/**
 * Writes a workout new or changed at its place, a new one last, renamed when the page sends its old name.
 * A variant of an exercise `Exercises.md` lacks goes in there too.
 * The name stays as my workout already writes it, unless renamed.
 *
 * @throws {Error} - When the name is empty, another workout has it, or it holds no part
 */
export function workoutSave(sent: { old?: string; name?: string; parts?: unknown[] }): Mine {
    const workouts: Workout[] = workoutsRead();
    const typed: string = ownNameOf(String(sent.name ?? ""));
    const renamed: boolean = sent.old !== undefined;
    const old: string = (renamed ? ownNameOf(String(sent.old)) : typed).toLowerCase();
    const at: number = workouts.findIndex((workout: Workout): boolean => workout.name.toLowerCase() === old);
    const name: string = renamed ? typed : (workouts[at]?.name ?? typed);
    const parts: Part[] = (sent.parts ?? [])
        .map(partOf)
        .filter((part: Part | null): part is Part => part !== null)
        .filter(
            (part: Part, index: number, all: Part[]): boolean =>
                all.findIndex((other: Part): boolean => sameExercise(other, part)) === index,
        );
    if (name === "") throw new Error("No name of a workout");
    if (
        workouts.some(
            (workout: Workout): boolean =>
                workout.name.toLowerCase() === name.toLowerCase() && workout.name.toLowerCase() !== old,
        )
    )
        throw new Error(`Another workout is called ${name}`);
    if (parts.length === 0) throw new Error(`No parts of a workout: ${JSON.stringify(sent.parts)}`);

    const workout: Workout = { name: name, parts: parts };
    workoutsWrite(
        at === -1
            ? [...workouts, workout]
            : workouts.map((other: Workout, index: number): Workout => (index === at ? workout : other)),
    );
    const own: Part[] = exercisesRead();
    const fresh: Part[] = parts.filter(
        (part: Part): boolean => !own.some((other: Part): boolean => sameExercise(other, part)),
    );
    if (fresh.length > 0) exercisesWrite([...own, ...fresh]);
    return mineRead();
}

/**
 * Adds an exercise to `Exercises.md` as its own variant, one I have already changing nothing.
 *
 * @throws {Error} - When the name is empty or a value is none
 */
export function exerciseAdd(sent: { name?: string; sets?: string; reps?: string; kg?: string }): Mine {
    const name: string = ownNameOf(String(sent.name ?? ""));
    const added: Part | null = valuesOf(name, sent);
    if (name === "" || added === null) throw new Error(`No exercise: ${JSON.stringify(sent)}`);

    const own: Part[] = exercisesRead();
    if (!own.some((other: Part): boolean => sameExercise(other, added))) exercisesWrite([...own, added]);
    return mineRead();
}

/**
 * Changes the values of a variant in `Exercises.md`, adding it when only a workout had it.
 * Every workout part of that variant takes the new values too, so a workout brings them.
 *
 * @throws {Error} - When the name is empty or a value is none
 */
export function exerciseChange(sent: {
    old?: { name?: string; sets?: string; reps?: string; kg?: string };
    sets?: string;
    reps?: string;
    kg?: string;
}): Mine {
    const name: string = ownNameOf(String(sent.old?.name ?? ""));
    const old: Part | null = valuesOf(name, sent.old ?? {});
    const changed: Part | null = valuesOf(name, sent);
    if (name === "" || old === null || changed === null)
        throw new Error(`No sets, repetitions or kilograms: ${JSON.stringify(sent)}`);

    const own: Part[] = exercisesRead();
    const at: number = own.findIndex((other: Part): boolean => sameExercise(other, old));
    const exercise: Part = { ...changed, name: at === -1 ? name : own[at].name };
    exercisesWrite(
        at === -1
            ? [...own, exercise]
            : own.map((other: Part, index: number): Part => (index === at ? exercise : other)),
    );
    partsChange(
        (part: Part): boolean => sameExercise(part, old),
        (part: Part): Part[] => [{ ...part, sets: exercise.sets, reps: exercise.reps, kg: exercise.kg }],
    );
    return mineRead();
}

/** Removes a variant from `Exercises.md` and every workout, one left without parts gone with it. */
export function exerciseRemove(sent: { name?: string; sets?: string; reps?: string; kg?: string }): Mine {
    const gone: Part = {
        name: String(sent.name ?? "").trim(),
        sets: String(sent.sets ?? "").trim(),
        reps: String(sent.reps ?? "").trim(),
        kg: String(sent.kg ?? "").trim(),
    };
    const own: Part[] = exercisesRead();
    if (own.some((other: Part): boolean => sameExercise(other, gone)))
        exercisesWrite(own.filter((other: Part): boolean => !sameExercise(other, gone)));
    partsChange(
        (part: Part): boolean => sameExercise(part, gone),
        (): Part[] => [],
    );
    return mineRead();
}

/** Removes a workout by its name, ignoring case. */
export function workoutRemove(name: string): Mine {
    const workouts: Workout[] = workoutsRead();
    const kept: Workout[] = workouts.filter(
        (workout: Workout): boolean => workout.name.toLowerCase() !== name.trim().toLowerCase(),
    );
    if (kept.length !== workouts.length) workoutsWrite(kept);
    return mineRead();
}
