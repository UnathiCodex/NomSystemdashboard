import type { SportDay, Video, VideoFound } from "../../reader/sport.ts";
/**
 * ## Mine
 *
 * Loads the sessions of a day and my workouts, exercises and videos through the reader,
 * sends new and changed ones, removes them, sends my weight of a day,
 * and asks YouTube through the reader for the title and channel of a link,
 * see `reader/sport.ts`.
 */

/**
 * A session of a day, as the reader sends it.
 *
 * - `kcal`: kcal it burned above rest,
 *   `null` while no weight is known or for a kind the reader does not know.
 * - `workout`: The workouts it did, parted by `, `, empty for none.
 */
export type Session = {
    id: string;
    start: string;
    end: string;
    kind: string;
    minutes: number;
    kcal: number | null;
    workout: string;
    exercises: {
        name: string;
        sets: string;
        reps: string;
        kg: string;
        workout: string;
    }[];
    videos: {
        title: string;
        channel: string;
        minutes: number | null;
        link: string;
        workout: string;
    }[];
};

/**
 * A part of a workout: an exercise or a video.
 *
 * - `link`: Link of a video, empty for an exercise and for a video added by hand.
 * - `sets`, `reps`, `kg`: The values of the variant of mine an exercise was picked as;
 *   left out or empty for a video.
 */
export type Part = {
    kind: "Exercise" | "Video";
    name: string;
    link: string;
    sets?: string;
    reps?: string;
    kg?: string;
};

/**
 * A workout of mine with its parts.
 *
 * - `kcal`: What its videos burn, when all its parts are videos with minutes.
 */
export type Workout = {
    name: string;
    parts: Part[];
    kcal: number | null;
};

/**
 * An exercise of mine with what I do of it as a rule, which an entry brings every time.
 *
 * - `reps`: Its repetitions per set, or its seconds like `60s`.
 */
export type Exercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
    workouts: string[];
};

/**
 * Everything of mine the sport area lists.
 *
 * - `basics`: Names of the basic exercises of a gym that are not mine, found as I search.
 * - `last`: What I did of each exercise the last time, its line `X-EXERCISE`,
 *   by its name in small letters,
 *   which the dialog brings again for one without values,
 *   see `exerciseLastOf` in `../day/sport.ts`.
 */
export type Mine = {
    workouts: Workout[];
    exercises: Exercise[];
    videos: Video[];
    basics: string[];
    kinds: string[];
    last: { [name: string]: string };
};

/**
 * Reads the answer of the reader.
 *
 * @throws {Error} - When the reader did not take the request
 */
async function answerOf<Sent>(response: Response): Promise<Sent> {
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return (await response.json()) as Sent;
}

/** Loads the sessions of a day with what they took from the reader. */
export async function sportDayLoad(day: string): Promise<SportDay> {
    return await answerOf<SportDay>(await fetch(`/api/sport/day?date=${day}`));
}

/**
 * Sends my weight of a day to the reader,
 * which writes it into `Weights.md` in place of the one of that day.
 *
 * @returns The sessions of the day, counted with the new weight
 * @throws {Error} - When the reader does not take it, like kilograms that are no number
 */
export async function weightSend(day: string, kg: string): Promise<SportDay> {
    return await answerOf<SportDay>(
        await fetch("/api/sport/weight", {
            method: "POST",
            body: JSON.stringify({ day: day, kg: kg }),
        }),
    );
}

/** Loads my workouts, exercises and videos from the reader. */
export async function mineLoad(): Promise<Mine> {
    return await answerOf<Mine>(await fetch("/api/sport/mine"));
}

/**
 * Sends a workout to the reader, new or changed, which writes it into `Workouts.md`.
 *
 * @param old - Name it had, for a workout renamed
 * @returns All of mine after
 * @throws {Error} - When the reader does not take it,
 *   like one without parts or with the name of another
 */
export async function workoutSend(name: string, parts: Part[], old?: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/workouts", {
            method: "POST",
            body: JSON.stringify({ old: old, name: name, parts: parts }),
        }),
    );
}

/** Removes a workout through the reader from `Workouts.md`, gives all of mine after. */
export async function workoutDelete(name: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch(`/api/sport/workouts?name=${encodeURIComponent(name)}`, {
            method: "DELETE",
        }),
    );
}

/**
 * Asks YouTube through the reader for the title and the channel of a video.
 *
 * @throws {Error} - When the text is no link to a video or YouTube does not answer
 */
export async function videoLookup(link: string): Promise<VideoFound> {
    return await answerOf<VideoFound>(await fetch(`/api/sport/video?link=${encodeURIComponent(link)}`));
}

/**
 * Sends a video to the reader, new or changed, which writes it into `Videos.md`.
 *
 * @param before - Its title and link before a change; left out for a new one
 * @returns All of mine after
 * @throws {Error} - When the reader does not take it, like one without title
 */
export async function videoSend(video: Omit<Video, "kcal">, before?: { title: string; link: string }): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/videos", {
            method: "POST",
            body: JSON.stringify({
                ...video,
                oldTitle: before?.title,
                oldLink: before?.link,
            }),
        }),
    );
}

/**
 * Sends a new exercise to the reader,
 * which adds it to `Exercises.md` as a variant of its own,
 * empty, beside those of the same name. Gives all of mine after.
 */
export async function exerciseSend(name: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/exercises", {
            method: "POST",
            body: JSON.stringify({ name: name }),
        }),
    );
}

/**
 * Sends what I do of a variant of an exercise as a rule to the reader,
 * which writes it into `Exercises.md` in place of the variant as it was,
 * and into the workouts that hold it. Gives all of mine after.
 *
 * @throws {Error} - When the reader does not take it, like sets that are no whole number
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

/**
 * Removes a variant of an exercise through the reader from `Exercises.md`
 * and from every workout that holds it. Gives all of mine after.
 */
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
