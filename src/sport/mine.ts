/**
 * ## Mine
 *
 * Loads the sessions of a day with what they took through the reader,
 * and my workouts, exercises and videos, sends new and changed ones and removes them,
 * sends my weight of a day,
 * and asks YouTube through the reader for the title
 * and the channel of a link, see `reader/sport.ts`.
 */

/**
 * A session of a day, as the reader sends it.
 *
 * - `id`: Identifier of its entry.
 * - `start`, `end`: Its start and end as ISO instants.
 * - `kind`: Its kind, like `Gym`.
 * - `minutes`: Minutes from its start to its end.
 * - `kcal`: kcal it burned above rest,
 *   `null` while no weight is known or for a kind the reader does not know.
 * - `workout`: The workouts it did, parted by `, `, empty for none.
 * - `exercises`: Its exercises in order, each its name, sets, repetitions,
 *   like `10` or `60s`, kilograms and workout, empty where none are written.
 * - `videos`: Its videos in order, each its title, channel, minutes, link and workout.
 */
export type Session = {
    id: string;
    start: string;
    end: string;
    kind: string;
    minutes: number;
    kcal: number | null;
    workout: string;
    exercises: { name: string; sets: string; reps: string; kg: string; workout: string }[];
    videos: {
        title: string;
        channel: string;
        minutes: number | null;
        link: string;
        workout: string;
    }[];
};

/**
 * The sessions of a day with what they took together.
 *
 * - `sessions`: The sessions in the order of their starts.
 * - `minutes`: Their minutes together.
 * - `kcal`: Their kcal together, `null` while none is known.
 * - `kg`: My weight on the day, `null` while I have none.
 */
export type SportDay = {
    sessions: Session[];
    minutes: number;
    kcal: number | null;
    kg: number | null;
};

/**
 * A part of a workout: an exercise or a video.
 *
 * - `kind`: `Exercise` or `Video`.
 * - `name`: Name of the exercise, like `Bench press`, or title of the video.
 * - `link`: Link of a video, empty for an exercise and for a video added by hand.
 * - `sets`, `reps`, `kg`: What an exercise brings,
 *   the values of the variant of mine it was picked as, like `3`, `10` and empty;
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
 * - `name`: Its name, like `Push`.
 * - `parts`: Its parts in their order.
 * - `kcal`: What its videos burn, when all its parts are videos with minutes, `null` else.
 */
export type Workout = {
    name: string;
    parts: Part[];
    kcal: number | null;
};

/**
 * An exercise of mine with what I do of it as a rule, which an entry brings every time.
 *
 * - `name`: Its name, like `Bench press`.
 * - `sets`: Its sets as a rule, like `3`, empty for none.
 * - `reps`: Its repetitions per set as a rule, like `10`, or its seconds,
 *   like `60s`, empty for none.
 * - `kg`: Its kilograms as a rule, like `40`, empty for none.
 * - `workouts`: Names of the workouts that hold it.
 */
export type Exercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
    workouts: string[];
};

/**
 * A video of mine.
 *
 * - `title`: Its title.
 * - `channel`: Its channel, empty for none.
 * - `minutes`: The minutes I do it, `null` while none are written.
 * - `kind`: Its kind, like `HIIT`.
 * - `link`: Its link, empty for a video added by hand.
 * - `kcal`: What it burns above rest at my weight of today, `null` without minutes or weight.
 */
export type Video = {
    title: string;
    channel: string;
    minutes: number | null;
    kind: string;
    link: string;
    kcal: number | null;
};

/**
 * Everything of mine the sport area lists.
 *
 * - `workouts`: My workouts.
 * - `exercises`: My exercises, alphabetical.
 * - `videos`: My videos.
 * - `basics`: Names of the basic exercises of a gym that are not mine, found as I search.
 * - `kinds`: Names of the kinds of a video, like `HIIT`.
 * - `last`: What I did of each exercise the last time, its line `X-EXERCISE`,
 *   by its name in small letters, like `Bench press;3;10;40;`,
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
 * What YouTube tells of a video.
 *
 * - `title`: Its title.
 * - `channel`: Its channel.
 * - `link`: Its link in the one form of `Videos.md`.
 */
export type VideoFound = {
    title: string;
    channel: string;
    link: string;
};

/**
 * Reads the answer of the reader.
 *
 * @param response - Answer of the reader
 * @returns What it sent
 * @throws {Error} - When the reader did not take the request
 */
async function answerOf<Sent>(response: Response): Promise<Sent> {
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return (await response.json()) as Sent;
}

/**
 * Loads the sessions of a day with what they took from the reader.
 *
 * @param day - Day like `2026-10-17`
 * @returns The sessions of the day with what they took together
 * @throws {Error} - When the reader cannot answer
 */
export async function sportDayLoad(day: string): Promise<SportDay> {
    return await answerOf<SportDay>(await fetch(`/api/sport/day?date=${day}`));
}

/**
 * Sends my weight of a day to the reader,
 * which writes it into `Weights.md` in place of the one of that day.
 *
 * @param day - Day like `2026-10-17`
 * @param kg - Kilograms as typed, like `60,5`
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

/**
 * Loads my workouts, exercises and videos from the reader.
 *
 * @returns All of mine
 * @throws {Error} - When the reader cannot answer
 */
export async function mineLoad(): Promise<Mine> {
    return await answerOf<Mine>(await fetch("/api/sport/mine"));
}

/**
 * Sends a workout to the reader, new or changed, which writes it into `Workouts.md`.
 *
 * @param name - Its name as typed
 * @param parts - Its parts in their order
 * @param old - Name it had, for a workout renamed; left out for none
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

/**
 * Removes a workout through the reader from `Workouts.md`.
 *
 * @param name - Its name
 * @returns All of mine after
 * @throws {Error} - When the reader does not remove it
 */
export async function workoutDelete(name: string): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch(`/api/sport/workouts?name=${encodeURIComponent(name)}`, { method: "DELETE" }),
    );
}

/**
 * Asks YouTube through the reader for the title and the channel of a video.
 *
 * @param link - Link as pasted, like `https://youtu.be/dQw4w9WgXcQ`
 * @returns Title, channel and link
 * @throws {Error} - When the text is no link to a video or YouTube does not answer
 */
export async function videoLookup(link: string): Promise<VideoFound> {
    return await answerOf<VideoFound>(
        await fetch(`/api/sport/video?link=${encodeURIComponent(link)}`),
    );
}

/**
 * Sends a video to the reader, new or changed, which writes it into `Videos.md`.
 *
 * @param video - Its title, channel, minutes, kind and link
 * @param before - Its title and link before a change; left out for a new one
 * @returns All of mine after
 * @throws {Error} - When the reader does not take it, like one without title
 */
export async function videoSend(
    video: Omit<Video, "kcal">,
    before?: { title: string; link: string },
): Promise<Mine> {
    return await answerOf<Mine>(
        await fetch("/api/sport/videos", {
            method: "POST",
            body: JSON.stringify({ ...video, oldTitle: before?.title, oldLink: before?.link }),
        }),
    );
}

/**
 * Sends a new exercise to the reader,
 * which adds it to `Exercises.md` as a variant of its own, empty, beside those of the same name.
 *
 * @param name - Its name as typed
 * @returns All of mine after
 * @throws {Error} - When the reader does not take it, like one without name
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
 * and into the workouts that hold it.
 *
 * @param old - The variant as it was, its name, sets, repetitions and kilograms
 * @param values - Its new sets, repetitions, like `10` or `60s`, and kilograms, each empty for none
 * @returns All of mine after
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
 * and from every workout that holds it.
 * - `query`: The variant, its name, sets, repetitions and kilograms.
 *
 * @param exercise - The variant
 * @returns All of mine after
 * @throws {Error} - When the reader does not remove it
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
