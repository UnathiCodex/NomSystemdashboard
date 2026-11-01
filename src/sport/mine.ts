import type { SportDay, Video, VideoFound } from "../../reader/sport.ts";
/**
 * ## Mine
 *
 * My sessions, workouts, exercises, videos and weight through the reader, loaded, sent and removed.
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
 * A part of a workout, an exercise or a video.
 * - `link`: Link of a video, empty for an exercise and for a video added by hand.
 * - `sets`, `reps`, `kg`: The values of the variant an exercise was picked as, empty for a video.
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
 * - `kcal`: What its videos burn, when all its parts are videos with minutes.
 */
export type Workout = {
    name: string;
    parts: Part[];
    kcal: number | null;
};

/**
 * An exercise of mine with what I do of it as a rule, which an entry brings every time.
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
 * - `last`: Line `X-EXERCISE` of each exercise the last time, by its name in small letters.
 */
export type Mine = {
    workouts: Workout[];
    exercises: Exercise[];
    videos: Video[];
    kinds: string[];
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

/** Loads my workouts, exercises and videos. */
export async function mineLoad(): Promise<Mine> {
    return await answerOf<Mine>(await fetch("/api/sport/mine"));
}

/**
 * Sends a workout, new or changed, into `Workouts.md`, gives all of mine after.
 * @param old - Name it had, for a workout renamed
 * @throws {Error} - When the reader does not take it
 */
export async function workoutSend(name: string, parts: Part[], old?: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/workouts", {
            method: "POST",
            body: JSON.stringify({ old: old, name: name, parts: parts }),
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

/**
 * Asks YouTube through the reader for the title and the channel of a video.
 * @throws {Error} - When the text is no link to a video or YouTube does not answer
 */
export async function videoLookup(link: string): Promise<VideoFound> {
    return await answerOf<VideoFound>(await fetch(`/api/sport/video?link=${encodeURIComponent(link)}`));
}

/**
 * Sends a video, new or changed, into `Videos.md`, gives all of mine after.
 * @param before - Its title and link before a change, left out for a new one
 * @throws {Error} - When the reader does not take it
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
