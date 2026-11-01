/**
 * ## Sport
 *
 * The sessions of a day from the log with their time and their kcal.
 * My workouts, my exercises, my videos, my weight, each in its own table, never in the code.
 * A session is a log entry of `Sport`, holding what I did as a meal holds its foods.
 * Each exercise is a line `X-EXERCISE`, each video a line `X-VIDEO`, with its workout.
 * So the log keeps what I did that day, whatever I change in my workouts later.
 * An old session names its one workout as `X-WORKOUT`, which its lines without a workout belong to.
 * A session burns (MET − 1) × kg × hours, the MET from the 2024 Adult Compendium of Physical Activities.
 * Less the 1 MET I burn at rest anyway, so it counts only what the sport added.
 * An estimate written with `~`, since even a watch is more than a fifth off (Shcherbina 2017).
 * An exercise burns no kcal of its own, since nobody writes down how long or how hard.
 * One exercise name may stand in several rows, each its own variant.
 * A video is known by its link, one added by hand by its title.
 * YouTube oEmbed is asked anonymously, a request never carries my email or my name.
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
export type SportKind = {
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
    videos: SessionVideo[];
};

/** A line `X-EXERCISE` of a session, its `reps` may be seconds. */
export type SessionExercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
    workout: string;
};

/** A line `X-VIDEO` of a session, its `link` empty for a video added by hand. */
export type SessionVideo = {
    title: string;
    channel: string;
    minutes: number | null;
    link: string;
    workout: string;
};

/** The sessions of a day with their sums, at my weight of the day. */
export type SportDay = {
    sessions: Session[];
    minutes: number;
    kcal: number;
    kg: number;
};

/** A part of a workout, an exercise with the values of its variant or a video. */
export type Part = {
    kind: "Exercise" | "Video";
    name: string;
    link: string;
    sets?: string;
    reps?: string;
    kg?: string;
};

/**
 * A workout of mine.
 *
 * - `kcal`: Burned at my weight of today when all parts are videos with minutes.
 *   `null` else, since an exercise has no minutes of its own.
 */
export type Workout = {
    name: string;
    parts: Part[];
    kcal: number | null;
};

/** A row of `Exercises.md`, what I do of an exercise as a rule. */
type OwnExercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
};

/** An exercise of mine with the workouts that hold it. */
export type Exercise = OwnExercise & {
    workouts: string[];
};

/** A row of `Videos.md`, `kcal` at my weight of today. */
export type Video = {
    title: string;
    channel: string;
    minutes: number | null;
    kind: string;
    link: string;
    kcal: number | null;
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
    videos: Video[];
    kinds: string[];
    last: { [name: string]: string };
};

/** What YouTube tells of a video, cleaned for `Videos.md`. */
export type VideoFound = {
    title: string;
    channel: string;
    link: string;
};

export const sportName: string = "Sport";

/** Kind of the minutes beyond the videos, resistance training of multiple exercises in the Compendium. */
const exercisesKind: SportKind = { name: "Exercises", met: 3.5, code: "02054" };

/**
 * Kinds of a video, each with the MET of its closest activity in the Compendium.
 * `Cardio` is cardio-resistance video, `Strength` calisthenics, `Dance` Zumba, `Stretching` mild.
 */
export const videoKinds: SportKind[] = [
    { name: "HIIT", met: 7.0, code: "02210" },
    { name: "Cardio", met: 4.0, code: "02143" },
    { name: "Strength", met: 3.8, code: "02022" },
    { name: "Dance", met: 5.5, code: "02315" },
    { name: "Pilates", met: 2.8, code: "02105" },
    { name: "Yoga", met: 2.3, code: "02175" },
    { name: "Stretching", met: 2.3, code: "02101" },
];

/** Text a new `Workouts.md` starts with. */
const workoutsHead: string[] = [
    "# Workouts",
    "",
    "My workouts, each a name of mine and its parts in their order, " +
        "each an exercise with the sets, repetitions and",
    "kilograms it brings, or one of my videos of `Videos.md` by its title and its link.",
    "",
    "| Workout | Kind | Part | Sets | Reps | Kg | Link |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
];

/** Text a new `Videos.md` starts with. */
const videosHead: string[] = [
    "# Videos",
    "",
    "My videos: the title and the channel as YouTube gives them, " +
        "the minutes I do, the kind, which tells what a minute",
    "burns, one of " + videoKinds.map((kind: SportKind): string => kind.name).join(", ") + ", and the link, by which",
    "a video stays the same whatever its title.",
    "",
    "| Video | Channel | Minutes | Kind | Link |",
    "| --- | --- | ---: | --- | --- |",
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

const videoId: RegExp = /^[A-Za-z0-9_-]{11}$/;

/** Name the dashboard gives itself when it asks YouTube, without email or name, so nothing about me leaves. */
const agent: string = "NomSystemDashboard/0.1";

/** Milliseconds YouTube gets to answer. */
const answerTime: number = 5000;

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

/**
 * Turns a YouTube link into one form, so the same video pasted any way is always the same link.
 * Empty for no link to a video.
 */
export function linkOf(text: string): string {
    let url: URL;
    try {
        url = new URL(text.trim());
    } catch {
        return "";
    }
    const host: string = url.hostname.replace(/^(www|m|music)\./, "");
    const id: string =
        host === "youtu.be"
            ? url.pathname.slice(1).split("/")[0]
            : host === "youtube.com"
              ? (url.searchParams.get("v") ?? /^\/(?:shorts|live|embed)\/([^/]+)/.exec(url.pathname)?.[1] ?? "")
              : "";
    return videoId.test(id) ? `https://www.youtube.com/watch?v=${id}` : "";
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

/** Finds a kind of a video ignoring case. */
function videoKindOf(name: string): SportKind | undefined {
    return videoKinds.find((known: SportKind): boolean => known.name.toLowerCase() === name.toLowerCase());
}

/** Reads my videos at my weight of today, an unknown kind counting nothing. */
function videosRead(weights: Weight[]): Video[] {
    const kg: number = weightOn(weights, berlinDateOf(new Date()));
    return rowsRead(sport.videos)
        .filter((cells: Row): boolean => (cells.Video ?? "") !== "")
        .map((cells: Row): Video => {
            const minutes: number | null = numberOf(cells.Minutes);
            const kind: SportKind | undefined = videoKindOf(cells.Kind ?? "");
            return {
                title: cells.Video,
                channel: cells.Channel ?? "",
                minutes: minutes,
                kind: kind?.name ?? cells.Kind ?? "",
                link: linkOf(cells.Link ?? ""),
                kcal: minutes === null || kind === undefined ? null : kcalOf(kind.met, minutes, kg),
            };
        });
}

/** Tells whether a part is a video by its link, one added by hand by its title. */
function isVideo(part: Part, video: { title: string; link: string }): boolean {
    return (
        part.kind === "Video" &&
        (part.link !== ""
            ? part.link === video.link
            : video.link === "" && part.name.toLowerCase() === video.title.toLowerCase())
    );
}

/** Reads my workouts, the rows its parts in order, a part of any kind but `Video` an exercise. */
function workoutsRead(videos: Video[]): Workout[] {
    const workouts: Map<string, Workout> = new Map();
    rowsRead(sport.workouts)
        .filter((cells: Row): boolean => (cells.Workout ?? "") !== "" && (cells.Part ?? "") !== "")
        .forEach((cells: Row): void => {
            const workout: Workout = workouts.get(cells.Workout.toLowerCase()) ?? {
                name: cells.Workout,
                parts: [],
                kcal: null,
            };
            const part: Part =
                (cells.Kind ?? "").toLowerCase() === "video"
                    ? { kind: "Video", name: cells.Part, link: linkOf(cells.Link ?? "") }
                    : {
                          kind: "Exercise",
                          name: cells.Part,
                          link: "",
                          sets: cells.Sets ?? "",
                          reps: cells.Reps ?? "",
                          kg: cells.Kg ?? "",
                      };
            if (!workout.parts.some((other: Part): boolean => samePart(other, part))) workout.parts.push(part);
            workouts.set(cells.Workout.toLowerCase(), workout);
        });
    return [...workouts.values()].map((workout: Workout): Workout => {
        const kcals: (number | null)[] = workout.parts.map(
            (part: Part): number | null => videos.find((video: Video): boolean => isVideo(part, video))?.kcal ?? null,
        );
        return {
            ...workout,
            kcal: kcals.every((kcal: number | null): kcal is number => kcal !== null) ? sumOf(kcals) : null,
        };
    });
}

/** Writes `Workouts.md` anew, a row per part, so a workout without parts is gone. */
function workoutsWrite(workouts: Workout[]): void {
    tableWrite(
        sport.workouts,
        workoutsHead,
        workouts.flatMap((workout: Workout): string[][] =>
            workout.parts.map((part: Part): string[] => [
                workout.name,
                part.kind,
                part.name,
                part.sets ?? "",
                part.reps ?? "",
                part.kg ?? "",
                part.link,
            ]),
        ),
    );
}

/** Puts what `changed` gives in place of each `held` part, writing only when one is held. */
function partsChange(held: (part: Part) => boolean, changed: (part: Part) => Part[]): void {
    const workouts: Workout[] = workoutsRead([]);
    if (!workouts.some((workout: Workout): boolean => workout.parts.some(held))) return;
    workoutsWrite(
        workouts.map((workout: Workout): Workout => ({
            ...workout,
            parts: workout.parts.flatMap((part: Part): Part[] => (held(part) ? changed(part) : [part])),
        })),
    );
}

function videosWrite(videos: Video[]): void {
    tableWrite(
        sport.videos,
        videosHead,
        videos.map((video: Video): string[] => [
            video.title,
            video.channel,
            video.minutes === null ? "" : String(video.minutes),
            video.kind,
            video.link,
        ]),
    );
}

/** Reads my exercises, each variant once. */
function exercisesRead(): OwnExercise[] {
    return rowsRead(sport.exercises)
        .map((cells: Row): OwnExercise => ({
            name: cells.Exercise ?? "",
            sets: cells.Sets ?? "",
            reps: cells.Reps ?? "",
            kg: cells.Kg ?? "",
        }))
        .filter(
            (exercise: OwnExercise, index: number, all: OwnExercise[]): boolean =>
                exercise.name !== "" &&
                all.findIndex((other: OwnExercise): boolean => sameExercise(other, exercise)) === index,
        );
}

/** Writes `Exercises.md` anew, alphabetical. */
function exercisesWrite(exercises: OwnExercise[]): void {
    tableWrite(
        sport.exercises,
        exercisesHead,
        [...exercises]
            .sort((first: OwnExercise, second: OwnExercise): number => first.name.localeCompare(second.name))
            .map((exercise: OwnExercise): string[] => [exercise.name, exercise.sets, exercise.reps, exercise.kg]),
    );
}

function ownOf(part: Part): OwnExercise {
    return {
        name: part.name,
        sets: part.sets ?? "",
        reps: part.reps ?? "",
        kg: part.kg ?? "",
    };
}

/** Lists my exercises with those only in my workouts, each variant once, alphabetical. */
function exercisesOf(workouts: Workout[], own: OwnExercise[]): Exercise[] {
    const exercises: Exercise[] = own.map((exercise: OwnExercise): Exercise => ({
        ...exercise,
        workouts: [],
    }));
    workouts.forEach((workout: Workout): void =>
        workout.parts
            .filter((part: Part): boolean => part.kind === "Exercise")
            .forEach((part: Part): void => {
                let exercise: Exercise | undefined = exercises.find((other: Exercise): boolean =>
                    sameExercise(other, part),
                );
                if (exercise === undefined) {
                    exercise = { ...ownOf(part), workouts: [] };
                    exercises.push(exercise);
                }
                if (!exercise.workouts.includes(workout.name)) exercise.workouts.push(workout.name);
            }),
    );
    return exercises.sort((first: Exercise, second: Exercise): number => first.name.localeCompare(second.name));
}

/** Reads a line `X-EXERCISE`, without its own workout that of `X-WORKOUT`. */
function sessionExerciseOf(line: string, before: string): SessionExercise {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        name: parts[0] ?? "",
        sets: parts[1] ?? "",
        reps: parts[2] ?? "",
        kg: parts[3] ?? "",
        workout: parts[4] ?? before,
    };
}

/** Reads a line `X-VIDEO`, without its own workout that of `X-WORKOUT`. */
function sessionVideoOf(line: string, before: string): SessionVideo {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        title: parts[0] ?? "",
        channel: parts[1] ?? "",
        minutes: numberOf(parts[2]),
        link: linkOf(parts[3] ?? ""),
        workout: parts[4] ?? before,
    };
}

/**
 * Tells whether an entry may carry the lines of a session, only of `Sport` and each line well formed.
 * An old line without its workout still counts.
 */
export function sportPartsAllow(category: string, workout: string, exercises: string[], videos: string[]): boolean {
    if (workout === "" && exercises.length === 0 && videos.length === 0) return true;
    const clean: (text: string) => boolean = (text: string): boolean => !/[|;\r\n]/.test(text);
    const number: (text: string) => boolean = (text: string): boolean => text.trim() === "" || numberOf(text) !== null;
    return (
        category === sportName &&
        clean(workout) &&
        exercises.every((line: string): boolean => {
            const parts: string[] = line.split(";");
            return (
                [4, 5].includes(parts.length) &&
                parts[0].trim() !== "" &&
                clean(parts[0]) &&
                /^\s*\d*\s*$/.test(parts[1]) &&
                /^\s*(?:\d+\s*s?)?\s*$/.test(parts[2]) &&
                number(parts[3]) &&
                clean(parts[4] ?? "")
            );
        }) &&
        videos.every((line: string): boolean => {
            const parts: string[] = line.split(";");
            return (
                [4, 5].includes(parts.length) &&
                parts[0].trim() !== "" &&
                clean(parts[0]) &&
                clean(parts[1]) &&
                number(parts[2]) &&
                (parts[3].trim() === "" || linkOf(parts[3]) !== "") &&
                clean(parts[4] ?? "")
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
                last[sessionExerciseOf(line, "").name.toLowerCase()] = line;
            }),
        );
    return last;
}

export function mineRead(): Mine {
    const videos: Video[] = videosRead(weightsRead());
    const workouts: Workout[] = workoutsRead(videos);
    const exercises: Exercise[] = exercisesOf(workouts, exercisesRead());
    return {
        workouts: workouts,
        exercises: exercises,
        videos: videos,
        kinds: videoKinds.map((kind: SportKind): string => kind.name),
        last: lastRead(),
    };
}

/**
 * Reads the sessions that start on a day in Berlin time, from noon before to noon after.
 * Each video burns by its kind, one I no longer have as exercises.
 * The minutes beyond its videos burn as exercises.
 *
 * @throws {Error} - When the date is no `YYYY-MM-DD`
 */
export function sportDayRead(date: string): SportDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const kg: number = weightOn(weightsRead(), date);
    const mine: Video[] = videosRead([]);
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
            const before: string = entry.workout ?? "";
            const exercises: SessionExercise[] = (entry.exercises ?? []).map((line: string): SessionExercise =>
                sessionExerciseOf(line, before),
            );
            const videos: SessionVideo[] = (entry.videos ?? []).map((line: string): SessionVideo =>
                sessionVideoOf(line, before),
            );
            const workouts: string[] = [
                ...new Set(
                    [...exercises, ...videos]
                        .map((part: SessionExercise | SessionVideo): string => part.workout)
                        .filter((workout: string): boolean => workout !== ""),
                ),
            ];
            const metOf: (video: SessionVideo) => number = (video: SessionVideo): number =>
                videoKindOf(
                    mine.find((other: Video): boolean =>
                        isVideo({ kind: "Video", name: video.title, link: video.link }, other),
                    )?.kind ?? "",
                )?.met ?? exercisesKind.met;
            const watched: number = sumOf(videos.map((video: SessionVideo): number => video.minutes ?? 0));
            return {
                id: entry.id,
                start: entry.start,
                end: entry.end,
                summary: summaryBaseOf(entry.title),
                minutes: minutes,
                kcal:
                    sumOf(videos.map((video: SessionVideo): number => kcalOf(metOf(video), video.minutes ?? 0, kg))) +
                    kcalOf(exercisesKind.met, Math.max(0, minutes - watched), kg),
                workout: workouts.length > 0 ? workouts.join(", ") : before,
                exercises: exercises,
                videos: videos,
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

/** Reads a part the page sends, `null` for one without a name. */
function partOf(sent: unknown): Part | null {
    type Sent = Partial<Record<"kind" | "name" | "link" | "sets" | "reps" | "kg", unknown>>;
    const part: Sent = (sent as Sent) ?? {};
    const video: boolean = part.kind === "Video";
    const name: string = video ? nameOf(String(part.name ?? "")) : ownNameOf(String(part.name ?? ""));
    if (name === "") return null;
    if (video) return { kind: "Video", name: name, link: linkOf(String(part.link ?? "")) };
    const values: OwnExercise | null = valuesOf(name, part);
    return values === null ? null : { ...values, kind: "Exercise", link: "" };
}

/** Reads the values of an exercise the page sends, `null` for one that is none. */
function valuesOf(name: string, sent: { sets?: unknown; reps?: unknown; kg?: unknown }): OwnExercise | null {
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
function sameExercise(
    first: { name: string; sets?: string; reps?: string; kg?: string },
    second: { name: string; sets?: string; reps?: string; kg?: string },
): boolean {
    return (
        first.name.toLowerCase() === second.name.toLowerCase() &&
        (first.sets ?? "") === (second.sets ?? "") &&
        (first.reps ?? "") === (second.reps ?? "") &&
        (first.kg ?? "") === (second.kg ?? "")
    );
}

function samePart(first: Part, second: Part): boolean {
    return (
        first.kind === second.kind &&
        (first.kind === "Video"
            ? first.name.toLowerCase() === second.name.toLowerCase() && first.link === second.link
            : sameExercise(first, second))
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
    const workouts: Workout[] = workoutsRead([]);
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
                all.findIndex((other: Part): boolean => samePart(other, part)) === index,
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

    const workout: Workout = { name: name, parts: parts, kcal: null };
    workoutsWrite(
        at === -1
            ? [...workouts, workout]
            : workouts.map((other: Workout, index: number): Workout => (index === at ? workout : other)),
    );
    const own: OwnExercise[] = exercisesRead();
    const fresh: OwnExercise[] = parts
        .filter(
            (part: Part): boolean =>
                part.kind === "Exercise" && !own.some((other: OwnExercise): boolean => sameExercise(other, part)),
        )
        .map(ownOf);
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
    const added: OwnExercise | null = valuesOf(name, sent);
    if (name === "" || added === null) throw new Error(`No exercise: ${JSON.stringify(sent)}`);

    const own: OwnExercise[] = exercisesRead();
    if (!own.some((other: OwnExercise): boolean => sameExercise(other, added))) exercisesWrite([...own, added]);
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
    const old: OwnExercise | null = valuesOf(name, sent.old ?? {});
    const changed: OwnExercise | null = valuesOf(name, sent);
    if (name === "" || old === null || changed === null)
        throw new Error(`No sets, repetitions or kilograms: ${JSON.stringify(sent)}`);

    const own: OwnExercise[] = exercisesRead();
    const at: number = own.findIndex((other: OwnExercise): boolean => sameExercise(other, old));
    const exercise: OwnExercise = { ...changed, name: at === -1 ? name : own[at].name };
    exercisesWrite(
        at === -1
            ? [...own, exercise]
            : own.map((other: OwnExercise, index: number): OwnExercise => (index === at ? exercise : other)),
    );
    partsChange(
        (part: Part): boolean => part.kind === "Exercise" && sameExercise(part, old),
        (part: Part): Part[] => [{ ...part, sets: exercise.sets, reps: exercise.reps, kg: exercise.kg }],
    );
    return mineRead();
}

/** Removes a variant from `Exercises.md` and every workout, one left without parts gone with it. */
export function exerciseRemove(sent: { name?: string; sets?: string; reps?: string; kg?: string }): Mine {
    const gone: OwnExercise = {
        name: String(sent.name ?? "").trim(),
        sets: String(sent.sets ?? "").trim(),
        reps: String(sent.reps ?? "").trim(),
        kg: String(sent.kg ?? "").trim(),
    };
    const own: OwnExercise[] = exercisesRead();
    if (own.some((other: OwnExercise): boolean => sameExercise(other, gone)))
        exercisesWrite(own.filter((other: OwnExercise): boolean => !sameExercise(other, gone)));
    partsChange(
        (part: Part): boolean => part.kind === "Exercise" && sameExercise(part, gone),
        (): Part[] => [],
    );
    return mineRead();
}

/** Removes a workout by its name, ignoring case. */
export function workoutRemove(name: string): Mine {
    const workouts: Workout[] = workoutsRead([]);
    const kept: Workout[] = workouts.filter(
        (workout: Workout): boolean => workout.name.toLowerCase() !== name.trim().toLowerCase(),
    );
    if (kept.length !== workouts.length) workoutsWrite(kept);
    return mineRead();
}

/**
 * Asks YouTube for the title and the channel of a video by its link.
 *
 * @throws {Error} - When the text is no link to a video, or YouTube does not answer in time or knows none
 */
export async function videoFind(text: string): Promise<VideoFound> {
    const link: string = linkOf(text);
    if (link === "") throw new Error(`No link to a video: ${text}`);

    const address: URL = new URL(sport.video);
    address.searchParams.set("url", link);
    address.searchParams.set("format", "json");
    const response: Response = await fetch(address, {
        headers: { "User-Agent": agent },
        signal: AbortSignal.timeout(answerTime),
    });
    if (!response.ok) throw new Error(`YouTube answered ${response.status}`);
    const found: { title?: unknown; author_name?: unknown } = (await response.json()) as {
        title?: unknown;
        author_name?: unknown;
    };
    return {
        title: nameOf(String(found.title ?? "")),
        channel: nameOf(String(found.author_name ?? "")),
        link: link,
    };
}

/**
 * Writes a video new or changed at its place, found by the link or title it had, a new one last.
 * A changed title or link changes it in every workout too.
 *
 * @throws {Error} - When the title is empty, the kind unknown, the minutes no number, or another video has the link
 */
export function videoSave(sent: {
    title?: string;
    channel?: string;
    minutes?: unknown;
    kind?: string;
    link?: string;
    oldLink?: string;
    oldTitle?: string;
}): Mine {
    const videos: Video[] = videosRead([]);
    const title: string = nameOf(String(sent.title ?? ""));
    const channel: string = nameOf(String(sent.channel ?? ""));
    const link: string = linkOf(String(sent.link ?? ""));
    const kind: SportKind | undefined = videoKindOf(String(sent.kind ?? ""));
    const minutes: number | null = numberOf(sent.minutes);
    const before: { title: string; link: string } =
        sent.oldLink === undefined && sent.oldTitle === undefined
            ? { title: title, link: link }
            : {
                  title: nameOf(String(sent.oldTitle ?? "")),
                  link: linkOf(String(sent.oldLink ?? "")),
              };
    if (title === "") throw new Error("No title of a video");
    if (kind === undefined) throw new Error(`No kind of a video: ${sent.kind}`);
    if (String(sent.minutes ?? "").trim() !== "" && minutes === null) throw new Error(`No minutes: ${sent.minutes}`);

    const at: number = videos.findIndex((video: Video): boolean =>
        before.link !== ""
            ? video.link === before.link
            : video.link === "" && video.title.toLowerCase() === before.title.toLowerCase(),
    );
    if (link !== "" && videos.some((video: Video, index: number): boolean => index !== at && video.link === link))
        throw new Error(`Another video has the link ${link}`);
    const video: Video = {
        title: title,
        channel: channel,
        minutes: minutes,
        kind: kind.name,
        link: link,
        kcal: null,
    };
    videosWrite(
        at === -1
            ? [...videos, video]
            : videos.map((other: Video, index: number): Video => (index === at ? video : other)),
    );
    if (at !== -1 && (videos[at].title !== title || videos[at].link !== link)) {
        const old: Video = videos[at];
        workoutsWrite(
            workoutsRead([]).map((workout: Workout): Workout => ({
                ...workout,
                parts: workout.parts.map((part: Part): Part =>
                    isVideo(part, old) ? { kind: "Video", name: title, link: link } : part,
                ),
            })),
        );
    }
    return mineRead();
}

/** Removes a video from `Videos.md` and every workout, one left without parts gone with it. */
export function videoRemove(sent: { link?: string; title?: string }): Mine {
    const videos: Video[] = videosRead([]);
    const link: string = linkOf(String(sent.link ?? ""));
    const title: string = nameOf(String(sent.title ?? ""));
    const gone: Video | undefined = videos.find((video: Video): boolean =>
        isVideo({ kind: "Video", name: title, link: link }, video),
    );
    if (gone === undefined) return mineRead();

    videosWrite(videos.filter((video: Video): boolean => video !== gone));
    partsChange(
        (part: Part): boolean => isVideo(part, gone),
        (): Part[] => [],
    );
    return mineRead();
}
