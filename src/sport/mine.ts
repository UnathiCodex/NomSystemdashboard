import type { SportDay } from "../../reader/sport.ts";
/**
 * ## Mine
 *
 * My sessions, workouts, exercises, weight through the reader.
 * Each loaded, sent, removed.
 */

/**
 * A session of a day, as the reader sends it.
 * - `kcal`: kcal it burned above rest.
 * - `workout`: The workouts it did, parted by `, `, empty for none.
 */
export type Session = {
    id: string;
    start: string;
    end: string;
    summary: string;
    minutes: number;
    kcal: number;
    workout: string;
    exercises: (Part & { workout: string })[];
};

/**
 * An exercise with the values of its variant.
 * What I do of it as a rule or in a workout.
 * - `reps`: Its repetitions per set or its seconds like `60s`.
 */
export type Part = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
};

/**
 * A workout of mine with its exercises in their order.
 * - `short`: What its brackets show, empty for none.
 */
export type Workout = {
    name: string;
    short: string;
    parts: Part[];
};

/** An exercise of mine, its values an entry brings every time. */
export type Exercise = Part;

/**
 * Everything of mine the sport area lists.
 * - `last`: Line `X-EXERCISE` of each exercise the last time, by its name in small letters.
 */
export type Mine = {
    workouts: Workout[];
    exercises: Exercise[];
    last: { [name: string]: string };
};

/**
 * Reads the answer of the reader.
 * @throws {Error} - When the reader did not take the request
 */
async function answerOf<Sent>(response: Response): Promise<Sent> {
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return (await response.json()) as Sent;
}

/** Loads the sessions of a day. */
export async function sportDayLoad(day: string): Promise<SportDay> {
    return await answerOf<SportDay>(await fetch(`/api/sport/day?date=${day}`));
}

/**
 * Sends my weight of a day into `Weights.md`, in place of the one of that day.
 * @returns The sessions of the day, counted with the new weight
 * @throws {Error} - When the reader does not take it
 */
export async function weightSend(day: string, kg: string): Promise<SportDay> {
    return await answerOf<SportDay>(
        await fetch("/api/sport/weight", {
            method: "POST",
            body: JSON.stringify({ day: day, kg: kg }),
        }),
    );
}

/** Loads my workouts and exercises. */
export async function mineLoad(): Promise<Mine> {
    return await answerOf<Mine>(await fetch("/api/sport/mine"));
}

/**
 * Sends a workout, new or changed, into `Workouts.md`, gives all of mine after.
 * @param old - Name it had, for a workout renamed
 * @param short - Its short title, the one it had when not sent
 * @throws {Error} - When the reader does not take it
 */
export async function workoutSend(name: string, parts: Part[], old?: string, short?: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/workouts", {
            method: "POST",
            body: JSON.stringify({ old: old, name: name, short: short, parts: parts }),
        }),
    );
}

/** Removes a workout from `Workouts.md`, gives all of mine after. */
export async function workoutDelete(name: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch(`/api/sport/workouts?name=${encodeURIComponent(name)}`, {
            method: "DELETE",
        }),
    );
}

/** Adds a new exercise to `Exercises.md` as an empty variant of its own, gives all of mine after. */
export async function exerciseSend(name: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/exercises", {
            method: "POST",
            body: JSON.stringify({ name: name }),
        }),
    );
}

/**
 * Sends the rule of a variant of an exercise into `Exercises.md` and the workouts that hold it.
 * Gives all of mine after.
 * @throws {Error} - When the reader does not take it
 */
export async function exerciseChangeSend(
    old: { name: string; sets: string; reps: string; kg: string },
    values: { sets: string; reps: string; kg: string },
): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/exercises", {
            method: "PATCH",
            body: JSON.stringify({
                old: { name: old.name, sets: old.sets, reps: old.reps, kg: old.kg },
                ...values,
            }),
        }),
    );
}

/** Removes a variant of an exercise from `Exercises.md` and every workout, gives all of mine after. */
export async function exerciseDelete(exercise: {
    name: string;
    sets: string;
    reps: string;
    kg: string;
}): Promise<Mine> {
    const query: URLSearchParams = new URLSearchParams({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        kg: exercise.kg,
    });
    return await answerOf<Mine>(await fetch(`/api/sport/exercises?${query}`, { method: "DELETE" }));
}
