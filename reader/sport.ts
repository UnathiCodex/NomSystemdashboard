/**
 * ## Sport
 *
 * Reads the sessions of a day from the log with the time they took and the kcal they burned, and keeps my workouts,
 * my exercises and my videos.
 * A session is a log entry of the category `Sport`: its `SUMMARY` its kind, one of {@link sportKinds}, `Gym`
 * or `Home workout`, its time from its start to its end, its `LOCATION` where; and what I did, as the entry by
 * category writes it, as a meal its foods: each exercise as a line `X-EXERCISE`, its name, sets, repetitions,
 * kilograms and the workout of mine it belongs to parted by `;`, like `Bench press;3;10;40;Push`, `Dips;3;10;;Push`
 * without weight, `Plank;2;60s;;` on time and alone, and each video as a line `X-VIDEO`, its title, channel, minutes,
 * link and workout, like `Full Body Pilates;Lidia Mera;25;https://www.youtube.com/watch?v=…;Morning`,
 * the file holding the seconds and the minutes as durations of iCalendar, `PT1M` and `PT25M`, see `sportIcsOf`
 * in `calendar.ts`, so the log keeps what I did that day, whatever I change in my workouts and videos later, see {@link sportPartsAllow}; a session
 * written before named its one workout as `X-WORKOUT`, like `Push`, which its lines without a workout belong to.
 * It burned what its kind burns above rest in its minutes at my weight of its day, a home workout with videos what
 * each video burns in its minutes by its kind in `Videos.md` and its minutes beyond them, like the exercises I did
 * around them, what a home workout burns, see {@link kcalOf}:
 * (MET − 1) × kg × hours, the MET of its kind from the 2024 Adult Compendium of Physical Activities
 * (Herrmann 2024, pacompendium.com), less the 1 MET I burn at rest anyway, so a session counts only what the sport
 * added and nothing twice; an estimate, which the page writes with `~`, since even the kcal of a watch on the wrist
 * are more than a fifth off (Shcherbina 2017).
 * `Workouts.md` holds my workouts, each a name of mine, like `Push` or `Morning`, and its parts in their order,
 * each an exercise by its name with the sets, repetitions and kilograms it brings, like `Dips`, `3`, `10`, or one
 * of my videos by its title and its link: one Markdown table with one row per part, the workout, the kind of the part,
 * `Exercise` or `Video`, the part, its sets, repetitions and kilograms, and the link of a video, see
 * {@link workoutsRead}; a workout without parts has no row and so is none.
 * `Exercises.md` holds my exercises, one row each by its name, like `Squat`, those I add by themselves and those
 * a workout got, since an exercise new to a workout goes in there too, see {@link workoutSave}, each with the sets,
 * repetitions and kilograms I do as a rule, like `3`, `10` and `40`, or `60s` on time, which an entry brings
 * every time, see {@link exerciseChange}, empty while I set none; one name may stand in several rows, each its own
 * variant, like `Dips` with `3 × 10` and `Dips` with `4 × 8` and `10` kg, the same name with the same values once;
 * a variant is known by its name and its values together, see {@link sameExercise}; the list of my
 * exercises shows each once, with the workouts that hold it, also one a workout holds that `Exercises.md` lacks,
 * like one written before it existed. The basic exercises of a gym, see {@link basicExercises}, are no list of mine:
 * the page finds them as I search, as the food search finds products of Open Food Facts, and one picked becomes mine.
 * An exercise burns no kcal of its own: a session at the gym counts by its time, see {@link sportKinds}, since what
 * a single exercise burns hangs on how long and how hard I do it, which nobody writes down.
 * `Videos.md` holds my videos, one row each: its title and its channel, as YouTube gives them, the minutes I do it,
 * its kind, one of {@link videoKinds}, like `HIIT`, which tells what a minute of it burns, and its link, like
 * `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, by which it stays the same video whatever its title,
 * see {@link linkOf}; a video added by hand has no link and is known by its title.
 * `Weights.md` holds my weight, which I change in the totals of the sport view, see {@link weightSave}: one Markdown
 * table with the columns `Day` and `Weight`, one row per day I weighed myself, like once a month or two, the day like
 * `17.10.2026` and the kilograms like `60.5`; a session counts with the last weight on or before its day, else
 * the first one after it, and counts no kcal while there is none, see {@link weightOn}. Every person writes their own,
 * so it is never in the code.
 * YouTube is asked anonymously for the title and the channel of a link, by its oEmbed, which needs no key:
 * a request carries the link and the name of the dashboard, never my email or my name.
 * No name of a workout, an exercise or a video holds `|`, which parts the cells of a table, or `;`, which will part
 * the lines of a session in the log; the name of a workout or an exercise no comma either, which parts the names
 * of a list, like `(Bench press, Dips)`, see {@link nameOf}.
 *
 * - `node:fs`: Reads and writes `Workouts.md`, `Exercises.md` and `Videos.md`, and reads `Weights.md`.
 * - `node:path`: Gives the folder of the files.
 * - `./calendar.ts`: Reads the log and gives the day of an instant in Berlin time.
 * - `./sources.ts`: Names the four files, the log and the address of YouTube's oEmbed, and tells which files
 *   the reader may write.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, entriesRead } from "./calendar.ts";
import { sport, writeAllowed } from "./sources.ts";

import type { Entry } from "./calendar.ts";


/**
 * A kind of a session or of a video with what a minute of it burns: the MET of the activity of the 2024 Adult
 * Compendium of Physical Activities closest to it.
 *
 * - `name`: Name, like `Gym`.
 * - `met`: Its MET, the energy it burns as a multiple of what I burn at rest, like 3.5.
 * - `code`: Code of the activity in the Compendium, like `02054`, so the value can be looked up there.
 */
export type SportKind = {
    name: string;
    met: number;
    code: string;
};

/**
 * A session of a day, as the page shows it.
 *
 * - `id`: Identifier of its entry.
 * - `start`, `end`: Its start and end as ISO instants.
 * - `kind`: Its kind, its `SUMMARY`, like `Gym`.
 * - `minutes`: Minutes from its start to its end.
 * - `kcal`: kcal it burned above rest, see {@link kcalOf}; `null` while no weight is known or for a kind that is
 *   none of {@link sportKinds}, like one typed before the kinds were fixed.
 * - `workout`: The workouts it did, parted by `, `, like `Push, Morning`, empty for none.
 * - `exercises`: Its exercises in order.
 * - `videos`: Its videos in order.
 */
export type Session = {
    id: string;
    start: string;
    end: string;
    kind: string;
    minutes: number;
    kcal: number | null;
    workout: string;
    exercises: SessionExercise[];
    videos: SessionVideo[];
};

/**
 * An exercise of a session, a line `X-EXERCISE`, see the top of this file.
 *
 * - `name`: Its name, like `Bench press`.
 * - `sets`: Its sets, like `3`, empty for none.
 * - `reps`: Its repetitions per set, like `10`, or its seconds, like `60s`, empty for none.
 * - `kg`: Its kilograms, like `40`, empty for none, like for dips.
 * - `workout`: The workout it belongs to, empty for one alone.
 */
export type SessionExercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
    workout: string;
};

/**
 * A video of a session, a line `X-VIDEO`, see the top of this file.
 *
 * - `title`: Its title.
 * - `channel`: Its channel, empty for none.
 * - `minutes`: The minutes I did it, `null` for none.
 * - `link`: Its link, empty for a video added by hand.
 * - `workout`: The workout it belongs to, empty for none.
 */
export type SessionVideo = {
    title: string;
    channel: string;
    minutes: number | null;
    link: string;
    workout: string;
};

/**
 * The sessions of a day with what they took together.
 *
 * - `sessions`: The sessions in the order of their starts.
 * - `minutes`: Their minutes together.
 * - `kcal`: Their kcal together, the sum of those known, `null` while none is known.
 * - `kg`: My weight on the day, see {@link weightOn}, `null` while I have none.
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
 * - `link`: Link of a video, see {@link linkOf}; empty for an exercise and for a video added by hand.
 * - `sets`, `reps`, `kg`: What an exercise brings, the values of the variant of mine it was picked as, like `3`, `10`
 *   and empty; empty for a video and for an exercise without them.
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
 * - `kcal`: What its videos burn above rest at my weight of today, when all its parts are videos of mine with minutes;
 *   `null` else, since an exercise has no minutes of its own.
 */
export type Workout = {
    name: string;
    parts: Part[];
    kcal: number | null;
};

/**
 * An exercise of mine, a row of `Exercises.md`: its name and what I do of it as a rule.
 *
 * - `name`: Its name, like `Bench press`.
 * - `sets`: Its sets as a rule, like `3`, empty for none.
 * - `reps`: Its repetitions per set as a rule, like `10`, or its seconds, like `60s`, empty for none.
 * - `kg`: Its kilograms as a rule, like `40`, empty for none.
 */
type OwnExercise = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
};

/**
 * An exercise of mine as the sport area lists it: what I do of it as a rule, see {@link OwnExercise}, and the workouts
 * that hold it.
 *
 * - `workouts`: Names of the workouts that hold it, in their order.
 */
export type Exercise = OwnExercise & {
    workouts: string[];
};

/**
 * A video of mine, a row of `Videos.md`.
 *
 * - `title`: Its title, like `30 Min Full Body HIIT`.
 * - `channel`: Its channel, empty for none.
 * - `minutes`: The minutes I do it, `null` while none are written.
 * - `kind`: Its kind, one of {@link videoKinds}.
 * - `link`: Its link, see {@link linkOf}; empty for a video added by hand.
 * - `kcal`: What it burns above rest at my weight of today; `null` without minutes or weight.
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
 * A weight of mine, a row of `Weights.md`.
 *
 * - `day`: Day I weighed myself, like `2026-10-17`.
 * - `kg`: Kilograms, like 60.5.
 */
type Weight = {
    day: string;
    kg: number;
};

/**
 * Everything of mine the sport area lists.
 *
 * - `workouts`: My workouts in the order of `Workouts.md`.
 * - `exercises`: My exercises, alphabetical.
 * - `videos`: My videos in the order of `Videos.md`.
 * - `basics`: Names of the basic exercises of a gym that are not mine, see {@link basicExercises}.
 * - `kinds`: Names of the kinds of a video, see {@link videoKinds}.
 * - `last`: What I did of each exercise the last time, its line `X-EXERCISE`, by its name in small letters,
 *   like `Bench press;3;10;40`, so the entry by category brings it again, see {@link lastRead}.
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
 * What YouTube tells of a video, cleaned for `Videos.md`.
 *
 * - `title`: Its title.
 * - `channel`: Its channel.
 * - `link`: Its link, see {@link linkOf}.
 */
export type VideoFound = {
    title: string;
    channel: string;
    link: string;
};


/**
 * Category of a session, `CATEGORIES:Sport`.
 */
export const sportName: string = "Sport";

/**
 * Kinds of a session, the only whats of `Sport`, see `categories.ts`, each with the MET of the activity
 * of the 2024 Adult Compendium closest to it:
 * `Gym` resistance (weight) training, multiple exercises, 8-15 reps at varied resistance (02054, 3.5);
 * `Home workout` home exercise, general (02064, 3.8). No run or hike, which I hardly ever do.
 */
export const sportKinds: SportKind[] = [
    { name: "Gym", met: 3.5, code: "02054" },
    { name: "Home workout", met: 3.8, code: "02064" },
];

/**
 * Kinds of a video, each with the MET of the activity of the 2024 Adult Compendium closest to it:
 * `HIIT` high intensity interval exercise, moderate effort (02210, 7.0); `Cardio` video, exercise workouts,
 * cardio-resistance training, moderate (02143, 4.0); `Strength` calisthenics, like push-ups, sit-ups and lunges,
 * moderate effort (02022, 3.8); `Dance` Zumba, home video (02315, 5.5); `Pilates` Pilates, general (02105, 2.8);
 * `Yoga` yoga, general (02175, 2.3); `Stretching` stretching, mild (02101, 2.3).
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

/**
 * Text a new `Workouts.md` starts with: its title, what it holds, and the head of its table.
 */
const workoutsHead: string[] = [
    "# Workouts",
    "",
    "My workouts, each a name of mine and its parts in their order, each an exercise with the sets, repetitions and",
    "kilograms it brings, or one of my videos of `Videos.md` by its title and its link.",
    "",
    "| Workout | Kind | Part | Sets | Reps | Kg | Link |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
];

/**
 * Text a new `Videos.md` starts with: its title, what it holds, and the head of its table.
 */
const videosHead: string[] = [
    "# Videos",
    "",
    "My videos: the title and the channel as YouTube gives them, the minutes I do, the kind, which tells what a minute",
    `burns, one of ${videoKinds.map((kind: SportKind): string => kind.name).join(", ")}, and the link, by which`,
    "a video stays the same whatever its title.",
    "",
    "| Video | Channel | Minutes | Kind | Link |",
    "| --- | --- | ---: | --- | --- |",
];

/**
 * Text a new `Weights.md` starts with: its title, what it holds, and the head of its table.
 */
const weightsHead: string[] = [
    "# Weights",
    "",
    "My weight, a row whenever I weigh myself, like once a month or two: the day and the kilograms.",
    "The sport area counts the kcal of a session with the last weight on or before its day.",
    "",
    "| Day | Weight |",
    "| --- | ---: |",
];

/**
 * Text a new `Exercises.md` starts with: its title, what it holds, and the head of its table.
 */
const exercisesHead: string[] = [
    "# Exercises",
    "",
    "My exercises, each by its name, those I add by themselves and those of my workouts, with the sets, repetitions",
    "and kilograms I do as a rule, which an entry brings every time; repetitions with `s` are seconds, like `60s`.",
    "",
    "| Exercise | Sets | Reps | Kg |",
    "| --- | ---: | ---: | ---: |",
];

/**
 * The basic exercises of a gym, by muscles: chest, back, shoulders, arms, legs and core, each by its common English
 * name, which a missing `Exercises.md` holds, see the top of this file.
 */
const basicExercises: string[] = [
    "Bench press", "Incline bench press", "Chest press", "Chest fly", "Push-ups",
    "Lat pulldown", "Seated row", "Pull-ups", "Barbell row", "Deadlift", "Back extension",
    "Shoulder press", "Lateral raise", "Face pull",
    "Biceps curl", "Hammer curl", "Triceps pushdown", "Dips",
    "Squat", "Leg press", "Lunges", "Romanian deadlift", "Leg curl", "Leg extension", "Hip thrust", "Calf raise",
    "Plank", "Crunches", "Leg raise", "Russian twist",
];

/**
 * Lines of a table before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * Identifier of a YouTube video, 11 letters, digits, `_` and `-`, like `dQw4w9WgXcQ`.
 */
const videoId: RegExp = /^[A-Za-z0-9_-]{11}$/;

/**
 * Name the dashboard gives itself when it asks YouTube, as when it asks Open Food Facts;
 * on purpose without an email or a name, so nothing about me leaves.
 */
const agent: string = "NomSystemDashboard/0.1";

/**
 * Milliseconds YouTube gets to answer.
 */
const answerTime: number = 5000;

/**
 * Milliseconds of a day.
 */
const dayLength: number = 24 * 60 * 60 * 1000;


/**
 * Cleans a name for a table and the log: `|` and `;` become spaces, spaces in a row one, none at the ends.
 *
 * @param name - Name as typed or as YouTube writes it, like `30 MIN FULL BODY | No Equipment`
 * @returns Clean name, like `30 MIN FULL BODY No Equipment`
 */
function nameOf(name: string): string {
    return name.replace(/[|;]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cleans the name of a workout or an exercise: as a name, see {@link nameOf}, and without a comma, which parts
 * the names of a list, like `(Bench press, Dips)`; a link is no name, like a video's pasted into the wrong field.
 *
 * @param name - Name as typed, like `Push, heavy`
 * @returns Clean name, like `Push heavy`, empty for a link
 */
function ownNameOf(name: string): string {
    return /^\s*https?:\/\//i.test(name) ? "" : nameOf(name.replace(/\s*,\s*/g, " "));
}

/**
 * Turns the text of a number into the number, a decimal comma counting as a point.
 *
 * @param text - Number as written, like `30` or `60,5`
 * @returns Number, `null` for an empty or unreadable text and for one below 0
 */
function numberOf(text: unknown): number | null {
    const written: string = String(text ?? "").trim().replace(",", ".");
    const value: number = written === "" ? NaN : Number(written);
    return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Turns a YouTube link into the one form `Videos.md` writes, so the same video pasted as `youtu.be/…`,
 * `m.youtube.com/watch?v=…&t=42` or `youtube.com/shorts/…` is always the same link.
 * - `url`: The link read.
 * - `host`: Its host without `www.`, `m.` or `music.`.
 * - `id`: Identifier of the video, see {@link videoId}.
 *
 * @param text - Link as pasted, like `https://youtu.be/dQw4w9WgXcQ?si=abc`
 * @returns Link like `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, empty for a text that is no link to a video
 */
export function linkOf(text: string): string {
    let url: URL;
    try {
        url = new URL(text.trim());
    } catch {
        return "";
    }
    const host: string = url.hostname.replace(/^(www|m|music)\./, "");
    const id: string = host === "youtu.be" ? url.pathname.slice(1).split("/")[0]
        : host === "youtube.com" ? url.searchParams.get("v")
            ?? /^\/(?:shorts|live|embed)\/([^/]+)/.exec(url.pathname)?.[1] ?? ""
        : "";
    return videoId.test(id) ? `https://www.youtube.com/watch?v=${id}` : "";
}

/**
 * Turns a day into the form `Weights.md` writes, my standard way.
 *
 * @param day - Day like `2026-10-17`
 * @returns Day like `17.10.2026`
 */
function dayTextOf(day: string): string {
    return day.split("-").reverse().join(".");
}

/**
 * Reads a day of `Weights.md`, written my standard way or as the reader writes days.
 *
 * @param text - Day like `17.10.2026`, `2026-10-17` or `1.9.2026`
 * @returns Day like `2026-10-17`, empty for a text that is no day
 */
function dayOf(text: string): string {
    const german: RegExpExecArray | null = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
    if (german !== null)
        return `${german[3]}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : "";
}

/**
 * Cuts a row of a table into its cells, without the empty texts before its first `|` and after its last,
 * each without spaces at its ends: parted only by a `|` that is no `\|`, as the editor writes a `|` typed into a cell,
 * see `cellWritten` in `src/editor/table.ts`, so such a cell never moves the cells after it one column on; the cell
 * keeps its `\|` as written, so it stays one when its file is written anew.
 *
 * @param line - Row like `| Push | Exercise | Bench press |  |`
 * @returns Its cells
 */
function cellsOf(line: string): string[] {
    return line.split(/(?<!\\)\|/).slice(1, -1).map((cell: string): string => cell.trim());
}

/**
 * Reads the rows of the table of a file, each by the names of its head, so a column added later or moved
 * reads as well; a cell the row lacks is empty.
 * - `rows`: The lines of the table.
 * - `head`: Names of its columns.
 *
 * @param file - Path of the file, like that of `Videos.md`
 * @returns Each row as its cells by the names of the head, none while the file does not exist
 */
function rowsRead(file: string): { [column: string]: string }[] {
    if (!existsSync(file))
        return [];

    const rows: string[] = readFileSync(file, "utf8").split("\n").filter((line: string): boolean => line.startsWith("|"));
    const head: string[] = cellsOf(rows[0] ?? "");
    return rows.slice(tableHead).map((line: string): { [column: string]: string } => {
        const cells: string[] = cellsOf(line);
        return Object.fromEntries(head.map((name: string, index: number): [string, string] => [name, cells[index] ?? ""]));
    });
}

/**
 * Writes a file of mine anew, its head, then its rows, so a table written by hand turns into the table of today.
 *
 * @param file - Path of the file
 * @param head - Its head, see {@link workoutsHead}
 * @param rows - Its rows, each its cells in the order of the head
 * @throws {Error} - When the file lies outside the new system
 */
function tableWrite(file: string, head: string[], rows: string[][]): void {
    if (!writeAllowed(file))
        throw new Error(`No writing outside the new system: ${file}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, [...head, ...rows.map((cells: string[]): string => `| ${cells.join(" | ")} |`), ""].join("\n"));
}

/**
 * Reads my weights, the rows of `Weights.md` with a day and kilograms above 0, one per day, the last row of a day
 * counting.
 * - `days`: Kilograms by day.
 *
 * @returns My weights, the latest first, none while `Weights.md` does not exist
 */
function weightsRead(): Weight[] {
    const days: Map<string, number> = new Map();
    rowsRead(sport.weights).forEach((cells: { [column: string]: string }): void => {
        const day: string = dayOf(cells.Day ?? "");
        const kg: number | null = numberOf(cells.Weight);
        if (day !== "" && kg !== null && kg > 0)
            days.set(day, kg);
    });
    return [...days].map(([day, kg]: [string, number]): Weight => ({ day: day, kg: kg }))
        .sort((first: Weight, second: Weight): number => second.day.localeCompare(first.day));
}

/**
 * Gives my weight on a day: the last weight on or before it, else the first one after it, so a session before my first
 * weighing still counts.
 *
 * @param weights - My weights, the latest first, see {@link weightsRead}
 * @param day - Day like `2026-10-17`
 * @returns Kilograms, `null` while I have no weight
 */
function weightOn(weights: Weight[], day: string): number | null {
    return (weights.find((weight: Weight): boolean => weight.day <= day) ?? weights.at(-1))?.kg ?? null;
}

/**
 * Gives what a kind burns above rest in some minutes at a weight: (MET − 1) × kg × hours, since 1 MET is what I burn
 * at rest anyway, see the top of this file.
 *
 * @param met - MET of the kind, like 3.5
 * @param minutes - Minutes, like 70
 * @param kg - Weight, `null` for none
 * @returns kcal, like 175 for 3.5 MET, 70 minutes and 60 kg; `null` without weight
 */
function kcalOf(met: number, minutes: number, kg: number | null): number | null {
    return kg === null ? null : Math.max(0, met - 1) * kg * minutes / 60;
}

/**
 * Reads my videos, the rows of `Videos.md` with a title, each with what it burns at my weight of today;
 * a kind none of {@link videoKinds} counts nothing.
 * - `kg`: My weight of today.
 *
 * @param weights - My weights, see {@link weightsRead}
 * @returns My videos in the order of the table, none while `Videos.md` does not exist
 */
function videosRead(weights: Weight[]): Video[] {
    const kg: number | null = weightOn(weights, berlinDateOf(new Date()));
    return rowsRead(sport.videos)
        .filter((cells: { [column: string]: string }): boolean => (cells.Video ?? "") !== "")
        .map((cells: { [column: string]: string }): Video => {
            const minutes: number | null = numberOf(cells.Minutes);
            const kind: SportKind | undefined = videoKinds.find((known: SportKind): boolean =>
                known.name.toLowerCase() === (cells.Kind ?? "").toLowerCase());
            return {
                title: cells.Video, channel: cells.Channel ?? "", minutes: minutes, kind: kind?.name ?? cells.Kind ?? "",
                link: linkOf(cells.Link ?? ""),
                kcal: minutes === null || kind === undefined ? null : kcalOf(kind.met, minutes, kg),
            };
        });
}

/**
 * Tells whether a part is a video, by its link, else for a video added by hand by its title, ignoring case.
 *
 * @param part - Part of a workout
 * @param video - Video of mine
 * @returns Whether the part is the video
 */
function isVideo(part: Part, video: { title: string; link: string }): boolean {
    return part.kind === "Video" && (part.link !== "" ? part.link === video.link
        : video.link === "" && part.name.toLowerCase() === video.title.toLowerCase());
}

/**
 * Reads my workouts, the rows of `Workouts.md` with a workout and a part, the rows of a workout its parts in their order,
 * each once; a part of the kind `Video` a video, any other an exercise; each workout with what its videos burn,
 * see {@link Workout}.
 * - `workouts`: The workouts read so far, by their names in small letters.
 * - `found`: The video of mine of a part.
 *
 * @param videos - My videos, see {@link videosRead}
 * @returns My workouts in the order of the table, none while `Workouts.md` does not exist
 */
function workoutsRead(videos: Video[]): Workout[] {
    const workouts: Map<string, Workout> = new Map();
    rowsRead(sport.workouts)
        .filter((cells: { [column: string]: string }): boolean => (cells.Workout ?? "") !== "" && (cells.Part ?? "") !== "")
        .forEach((cells: { [column: string]: string }): void => {
            const workout: Workout = workouts.get(cells.Workout.toLowerCase())
                ?? { name: cells.Workout, parts: [], kcal: null };
            const part: Part = (cells.Kind ?? "").toLowerCase() === "video"
                ? { kind: "Video", name: cells.Part, link: linkOf(cells.Link ?? "") }
                : { kind: "Exercise", name: cells.Part, link: "", sets: cells.Sets ?? "", reps: cells.Reps ?? "",
                    kg: cells.Kg ?? "" };
            if (!workout.parts.some((other: Part): boolean => samePart(other, part)))
                workout.parts.push(part);
            workouts.set(cells.Workout.toLowerCase(), workout);
        });
    return [...workouts.values()].map((workout: Workout): Workout => {
        const found: (Video | undefined)[] = workout.parts.map((part: Part): Video | undefined =>
            videos.find((video: Video): boolean => isVideo(part, video)));
        return {
            ...workout,
            kcal: found.every((video: Video | undefined): boolean => video?.kcal !== null && video?.kcal !== undefined)
                ? found.reduce((sum: number, video: Video | undefined): number => sum + (video?.kcal ?? 0), 0) : null,
        };
    });
}

/**
 * Writes my workouts into `Workouts.md` anew, a row per part, see {@link workoutsHead}; a workout without parts
 * writes no row and so is gone.
 *
 * @param workouts - My workouts to write, in their order
 */
function workoutsWrite(workouts: Workout[]): void {
    tableWrite(sport.workouts, workoutsHead, workouts.flatMap((workout: Workout): string[][] =>
        workout.parts.map((part: Part): string[] => [workout.name, part.kind, part.name, part.sets ?? "", part.reps ?? "",
            part.kg ?? "", part.link])));
}

/**
 * Writes my videos into `Videos.md` anew, see {@link videosHead}, the minutes empty where none are written.
 *
 * @param videos - My videos to write, in their order
 */
function videosWrite(videos: Video[]): void {
    tableWrite(sport.videos, videosHead, videos.map((video: Video): string[] =>
        [video.title, video.channel, video.minutes === null ? "" : String(video.minutes), video.kind, video.link]));
}

/**
 * Reads my exercises, the rows of `Exercises.md` with a name, with what I do of each as a rule, each variant once,
 * see {@link sameExercise}; a row written before these columns has them empty.
 *
 * @returns My exercises in the order of the table, none while `Exercises.md` does not exist
 */
function exercisesRead(): OwnExercise[] {
    return rowsRead(sport.exercises)
        .map((cells: { [column: string]: string }): OwnExercise => ({
            name: cells.Exercise ?? "", sets: cells.Sets ?? "", reps: cells.Reps ?? "", kg: cells.Kg ?? "",
        }))
        .filter((exercise: OwnExercise, index: number, all: OwnExercise[]): boolean => exercise.name !== ""
            && all.findIndex((other: OwnExercise): boolean => sameExercise(other, exercise)) === index);
}

/**
 * Writes my exercises into `Exercises.md` anew, alphabetical, see {@link exercisesHead}.
 *
 * @param exercises - My exercises with what I do of each as a rule
 */
function exercisesWrite(exercises: OwnExercise[]): void {
    tableWrite(sport.exercises, exercisesHead, [...exercises].sort((first: OwnExercise, second: OwnExercise): number =>
        first.name.localeCompare(second.name)).map((exercise: OwnExercise): string[] =>
        [exercise.name, exercise.sets, exercise.reps, exercise.kg]));
}

/**
 * Lists my exercises, those of `Exercises.md` and those of my workouts, each variant once, see {@link sameExercise},
 * with the workouts that hold it.
 * - `exercises`: The exercises listed so far.
 *
 * @param workouts - My workouts
 * @param own - The exercises of `Exercises.md`
 * @returns My exercises, alphabetical
 */
function exercisesOf(workouts: Workout[], own: OwnExercise[]): Exercise[] {
    const exercises: Exercise[] = own.map((exercise: OwnExercise): Exercise => ({ ...exercise, workouts: [] }));
    workouts.forEach((workout: Workout): void => workout.parts
        .filter((part: Part): boolean => part.kind === "Exercise")
        .forEach((part: Part): void => {
            let exercise: Exercise | undefined = exercises.find((other: Exercise): boolean => sameExercise(other, part));
            if (exercise === undefined) {
                exercise = { name: part.name, sets: part.sets ?? "", reps: part.reps ?? "", kg: part.kg ?? "", workouts: [] };
                exercises.push(exercise);
            }
            if (!exercise.workouts.includes(workout.name))
                exercise.workouts.push(workout.name);
        }));
    return exercises.sort((first: Exercise, second: Exercise): number => first.name.localeCompare(second.name));
}

/**
 * Reads a line `X-EXERCISE` of a session, see the top of this file, its workout that of the line, else the one
 * of a session written before.
 * - `parts`: Its parts parted by `;`.
 *
 * @param line - Line like `Bench press;3;10;40;Push` or `Dips;3;10;`
 * @param before - The workout of a session written before, its `X-WORKOUT`, empty for none
 * @returns The exercise, its parts empty where the line has none
 */
function sessionExerciseOf(line: string, before: string): SessionExercise {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        name: parts[0] ?? "", sets: parts[1] ?? "", reps: parts[2] ?? "", kg: parts[3] ?? "", workout: parts[4] ?? before,
    };
}

/**
 * Reads a line `X-VIDEO` of a session, see the top of this file, its workout that of the line, else the one
 * of a session written before.
 * - `parts`: Its parts parted by `;`.
 *
 * @param line - Line like `Full Body Pilates;Lidia Mera;25;https://www.youtube.com/watch?v=…;Morning`
 * @param before - The workout of a session written before, its `X-WORKOUT`, empty for none
 * @returns The video, its parts empty where the line has none
 */
function sessionVideoOf(line: string, before: string): SessionVideo {
    const parts: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        title: parts[0] ?? "", channel: parts[1] ?? "", minutes: numberOf(parts[2]), link: linkOf(parts[3] ?? ""),
        workout: parts[4] ?? before,
    };
}

/**
 * Tells whether an entry may carry the lines of a session as the entry by category sends them: only a session
 * of `Sport`, and each line well formed, see the top of this file: a workout and the names and titles without `|`,
 * `;` or a line break, an exercise its four parts and its workout, its sets a whole number or empty, its repetitions
 * a whole number, with `s` for seconds, or empty, its kilograms a number or empty, a video its four parts and its
 * workout, its minutes a number or empty, its link one to YouTube or empty; a line of before without its workout
 * still counts.
 * - `clean`: Whether a text holds no `|`, `;` and line break.
 * - `number`: Whether a text is a number of 0 or more, or empty.
 *
 * @param category - Category of the entry, like `Sport`
 * @param workout - Its `X-WORKOUT`, empty for none
 * @param exercises - Its lines `X-EXERCISE`
 * @param videos - Its lines `X-VIDEO`
 * @returns Whether the entry may carry them
 */
export function sportPartsAllow(category: string, workout: string, exercises: string[], videos: string[]): boolean {
    if (workout === "" && exercises.length === 0 && videos.length === 0)
        return true;
    const clean: (text: string) => boolean = (text: string): boolean => !/[|;\r\n]/.test(text);
    const number: (text: string) => boolean = (text: string): boolean =>
        text.trim() === "" || numberOf(text) !== null;
    return category === sportName && clean(workout)
        && exercises.every((line: string): boolean => {
            const parts: string[] = line.split(";");
            return [4, 5].includes(parts.length) && parts[0].trim() !== "" && clean(parts[0])
                && /^\s*\d*\s*$/.test(parts[1]) && /^\s*(?:\d+\s*s?)?\s*$/.test(parts[2]) && number(parts[3])
                && clean(parts[4] ?? "");
        })
        && videos.every((line: string): boolean => {
            const parts: string[] = line.split(";");
            return [4, 5].includes(parts.length) && parts[0].trim() !== "" && clean(parts[0]) && clean(parts[1])
                && number(parts[2]) && (parts[3].trim() === "" || linkOf(parts[3]) !== "") && clean(parts[4] ?? "");
        });
}

/**
 * Reads what I did of each exercise the last time, from every session of the log, the latest line `X-EXERCISE`
 * of each exercise by its name, ignoring case.
 * - `last`: Lines by name in small letters, the later overwriting the earlier.
 *
 * @returns Lines by name in small letters, like `bench press` with `Bench press;3;10;40`
 */
function lastRead(): { [name: string]: string } {
    const last: { [name: string]: string } = {};
    entriesRead(sport.log, "1970-01-01T00:00:00Z", "9999-12-31T00:00:00Z")
        .filter((entry: Entry): boolean => entry.category === sportName)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .forEach((entry: Entry): void => (entry.exercises ?? []).forEach((line: string): void => {
            last[sessionExerciseOf(line, "").name.toLowerCase()] = line;
        }));
    return last;
}

/**
 * Reads everything of mine the sport area lists, see {@link Mine}.
 * - `videos`: My videos, with what they burn at my weight of today.
 * - `workouts`: My workouts.
 *
 * @returns My workouts, exercises and videos, and the kinds of a video
 */
export function mineRead(): Mine {
    const videos: Video[] = videosRead(weightsRead());
    const workouts: Workout[] = workoutsRead(videos);
    const exercises: Exercise[] = exercisesOf(workouts, exercisesRead());
    return {
        workouts: workouts, exercises: exercises, videos: videos,
        basics: basicExercises.filter((name: string): boolean => !exercises.some((exercise: Exercise): boolean =>
            exercise.name.toLowerCase() === name.toLowerCase())),
        kinds: videoKinds.map((kind: SportKind): string => kind.name),
        last: lastRead(),
    };
}

/**
 * Reads the sessions of a day with what they took: the log entries of the category `Sport` that start on the day
 * in Berlin time, from 00:00 to 00:00, read from noon the day before to noon the day after, which holds the whole day;
 * each its minutes, its workout, exercises and videos, and the kcal it burned at my weight of the day,
 * see {@link kcalOf}: a home workout with videos what each video burns in its minutes by its kind in `Videos.md`,
 * a video I no longer have by the kind of the session, and its minutes beyond its videos by its kind, like 60 minutes
 * with a video of 30 its other 30 as a home workout, none should it be shorter than its videos; else the whole
 * session by its kind.
 * - `noon`: Noon of the day in UTC, in milliseconds.
 * - `kg`: My weight of the day.
 * - `mine`: My videos, whose kinds tell what a video of a session burns.
 * - `sessions`: The sessions of the day.
 * - `known`: kcal of the sessions that have some.
 *
 * @param date - Day like `2026-10-17`
 * @returns The sessions of the day with what they took together
 * @throws {Error} - When the date is not written like `2026-10-17`
 */
export function sportDayRead(date: string): SportDay {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error(`No date ${date}`);

    const noon: number = new Date(`${date}T12:00:00Z`).getTime();
    const kg: number | null = weightOn(weightsRead(), date);
    const mine: Video[] = videosRead([]);
    const sessions: Session[] = entriesRead(sport.log, new Date(noon - dayLength).toISOString(),
        new Date(noon + dayLength).toISOString())
        .filter((entry: Entry): boolean => entry.category === sportName && !entry.allDay
            && berlinDateOf(new Date(entry.start)) === date)
        .sort((first: Entry, second: Entry): number => first.start.localeCompare(second.start))
        .map((entry: Entry): Session => {
            const minutes: number = Math.max(0, Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000))
                || 0;
            const kind: SportKind | undefined = sportKinds.find((known: SportKind): boolean => known.name === entry.title);
            const before: string = entry.workout ?? "";
            const exercises: SessionExercise[] = (entry.exercises ?? []).map((line: string): SessionExercise =>
                sessionExerciseOf(line, before));
            const videos: SessionVideo[] = (entry.videos ?? []).map((line: string): SessionVideo =>
                sessionVideoOf(line, before));
            const workouts: string[] = [...new Set([...exercises, ...videos]
                .map((part: SessionExercise | SessionVideo): string => part.workout)
                .filter((workout: string): boolean => workout !== ""))];
            const metOf: (video: SessionVideo) => number = (video: SessionVideo): number => videoKinds
                .find((known: SportKind): boolean => known.name === mine.find((other: Video): boolean =>
                    isVideo({ kind: "Video", name: video.title, link: video.link }, other))?.kind)?.met ?? kind?.met ?? 0;
            const watched: number = videos.reduce((sum: number, video: SessionVideo): number =>
                sum + (video.minutes ?? 0), 0);
            return {
                id: entry.id, start: entry.start, end: entry.end, kind: entry.title, minutes: minutes,
                kcal: kind === undefined ? null : kind.name === "Home workout" && videos.length > 0 && kg !== null
                    ? videos.reduce((sum: number, video: SessionVideo): number =>
                        sum + (kcalOf(metOf(video), video.minutes ?? 0, kg) ?? 0), 0)
                        + (kcalOf(kind.met, Math.max(0, minutes - watched), kg) ?? 0)
                    : kcalOf(kind.met, minutes, kg),
                workout: workouts.length > 0 ? workouts.join(", ") : before, exercises: exercises, videos: videos,
            };
        });
    const known: number[] = sessions.flatMap((session: Session): number[] => session.kcal === null ? [] : [session.kcal]);
    return {
        sessions: sessions,
        minutes: sessions.reduce((sum: number, session: Session): number => sum + session.minutes, 0),
        kcal: known.length === 0 ? null : known.reduce((sum: number, kcal: number): number => sum + kcal, 0),
        kg: kg,
    };
}

/**
 * Writes my weight of a day into `Weights.md`, in place of the one of that day, the rows by their days, the latest
 * first, to one decimal.
 * - `day`: The day.
 * - `kg`: The kilograms.
 * - `weights`: My weights with the new one.
 *
 * @param sent - Day like `2026-10-17` and kilograms like 60.5 or `60,5`, as the page sends them
 * @returns The sessions of the day, counted with the new weight, see {@link sportDayRead}
 * @throws {Error} - When the day is no day, the kilograms are not above 0 and below 500, or `Weights.md` lies
 *   outside the new system
 */
export function weightSave(sent: { day?: string; kg?: unknown }): SportDay {
    const day: string = dayOf(String(sent.day ?? ""));
    const kg: number | null = numberOf(sent.kg);
    if (day === "" || Number.isNaN(Date.parse(day)))
        throw new Error(`No day: ${sent.day}`);
    if (kg === null || kg <= 0 || kg >= 500)
        throw new Error(`No weight: ${sent.kg}`);

    const weights: Weight[] = [...weightsRead().filter((weight: Weight): boolean => weight.day !== day),
        { day: day, kg: Math.round(kg * 10) / 10 }].sort((first: Weight, second: Weight): number =>
        second.day.localeCompare(first.day));
    tableWrite(sport.weights, weightsHead, weights.map((weight: Weight): string[] =>
        [dayTextOf(weight.day), weight.kg.toFixed(1)]));
    return sportDayRead(day);
}

/**
 * Reads a part as the page sends it: an exercise by its name, cleaned, see {@link ownNameOf}, or a video by its title
 * and its link.
 *
 * @param sent - Part as the page sends it
 * @returns The part, `null` for one without a name
 */
function partOf(sent: unknown): Part | null {
    const part: { kind?: unknown; name?: unknown; link?: unknown; sets?: unknown; reps?: unknown; kg?: unknown } =
        sent as { kind?: unknown; name?: unknown; link?: unknown; sets?: unknown; reps?: unknown; kg?: unknown } ?? {};
    const video: boolean = part.kind === "Video";
    const name: string = video ? nameOf(String(part.name ?? "")) : ownNameOf(String(part.name ?? ""));
    if (name === "")
        return null;
    if (video)
        return { kind: "Video", name: name, link: linkOf(String(part.link ?? "")) };
    const values: OwnExercise | null = valuesOf(name, part);
    return values === null ? null : { kind: "Exercise", name: name, link: "", sets: values.sets, reps: values.reps,
        kg: values.kg };
}

/**
 * Reads the sets, repetitions and kilograms of an exercise as the page sends them: sets a whole number, repetitions
 * a whole number, with `s` for seconds, kilograms a number, each empty for none.
 * - `sets`, `reps`, `kg`: The values as sent, without spaces at the ends, a decimal comma of the kilograms a point.
 *
 * @param name - Name of the exercise, cleaned
 * @param sent - Its values as sent
 * @returns The exercise with its values, `null` for a value that is none of these
 */
function valuesOf(name: string, sent: { sets?: unknown; reps?: unknown; kg?: unknown }): OwnExercise | null {
    const sets: string = String(sent.sets ?? "").trim();
    const reps: string = String(sent.reps ?? "").trim();
    const kg: string = String(sent.kg ?? "").trim().replace(",", ".");
    return /^\d*$/.test(sets) && /^(?:\d+s?)?$/.test(reps) && (kg === "" || numberOf(kg) !== null)
        ? { name: name, sets: sets, reps: reps, kg: kg } : null;
}

/**
 * Tells whether two exercises are the same variant: the same name, ignoring case, and the same sets, repetitions
 * and kilograms.
 *
 * @param first - An exercise or a part
 * @param second - Another
 * @returns Whether they are the same variant
 */
function sameExercise(first: { name: string; sets?: string; reps?: string; kg?: string },
                      second: { name: string; sets?: string; reps?: string; kg?: string }): boolean {
    return first.name.toLowerCase() === second.name.toLowerCase() && (first.sets ?? "") === (second.sets ?? "")
        && (first.reps ?? "") === (second.reps ?? "") && (first.kg ?? "") === (second.kg ?? "");
}

/**
 * Tells whether two parts of a workout are the same: the same video, or the same variant of an exercise.
 *
 * @param first - A part
 * @param second - Another
 * @returns Whether they are the same
 */
function samePart(first: Part, second: Part): boolean {
    return first.kind === second.kind && (first.kind === "Video"
        ? first.name.toLowerCase() === second.name.toLowerCase() && first.link === second.link
        : sameExercise(first, second));
}

/**
 * Writes a workout into `Workouts.md`, new or changed, its parts in place of those it had, at its place, a new workout
 * last; renamed when the page sends its old name, see {@link ownNameOf}; each part once; an exercise of it whose
 * variant `Exercises.md` lacks goes in there too, see {@link sameExercise}.
 * - `workouts`: My workouts so far.
 * - `typed`: Name as sent, cleaned.
 * - `renamed`: Whether the page sends the old name of the workout.
 * - `old`: Name it had, in small letters, its name as sent for a workout not renamed.
 * - `name`: Name of the workout, as typed for one renamed, else as a workout of mine of the name, ignoring case,
 *   already writes it.
 * - `parts`: Its parts as sent, each once.
 * - `at`: Place of the workout among mine, -1 for a new one.
 * - `own`: Names of the exercises of `Exercises.md`.
 * - `fresh`: Its exercises whose variants `Exercises.md` lacks.
 *
 * @param sent - Name and parts as the page sends them, and the old name of a workout renamed
 * @returns All of mine, see {@link mineRead}
 * @throws {Error} - When the name is empty, another workout has it, or it holds no part
 */
export function workoutSave(sent: { old?: string; name?: string; parts?: unknown[] }): Mine {
    const workouts: Workout[] = workoutsRead([]);
    const typed: string = ownNameOf(String(sent.name ?? ""));
    const renamed: boolean = sent.old !== undefined;
    const old: string = (renamed ? ownNameOf(String(sent.old)) : typed).toLowerCase();
    const name: string = renamed ? typed
        : workouts.find((workout: Workout): boolean => workout.name.toLowerCase() === old)?.name ?? typed;
    const parts: Part[] = (sent.parts ?? []).map(partOf)
        .filter((part: Part | null): part is Part => part !== null)
        .filter((part: Part, index: number, all: Part[]): boolean => all.findIndex((other: Part): boolean =>
            samePart(other, part)) === index);
    if (name === "")
        throw new Error("No name of a workout");
    if (workouts.some((workout: Workout): boolean => workout.name.toLowerCase() === name.toLowerCase()
        && workout.name.toLowerCase() !== old))
        throw new Error(`Another workout is called ${name}`);
    if (parts.length === 0)
        throw new Error(`No parts of a workout: ${JSON.stringify(sent.parts)}`);

    const at: number = workouts.findIndex((workout: Workout): boolean => workout.name.toLowerCase() === old);
    const workout: Workout = { name: name, parts: parts, kcal: null };
    workoutsWrite(at === -1 ? [...workouts, workout]
        : workouts.map((other: Workout, index: number): Workout => index === at ? workout : other));
    const own: OwnExercise[] = exercisesRead();
    const fresh: OwnExercise[] = parts.filter((part: Part): boolean => part.kind === "Exercise"
        && !own.some((other: OwnExercise): boolean => sameExercise(other, part)))
        .map((part: Part): OwnExercise => ({ name: part.name, sets: part.sets ?? "", reps: part.reps ?? "",
            kg: part.kg ?? "" }));
    if (fresh.length > 0)
        exercisesWrite([...own, ...fresh]);
    return mineRead();
}

/**
 * Adds an exercise to `Exercises.md` by itself, its name cleaned, see {@link ownNameOf}, empty or with its values,
 * a variant of its own beside those of the same name; the same variant I have changes nothing.
 * - `name`: Its name.
 * - `added`: The variant with its values.
 * - `own`: My exercises so far.
 *
 * @param sent - Name, and sets, repetitions and kilograms where given, as the page sends them
 * @returns All of mine, see {@link mineRead}
 * @throws {Error} - When the name is empty or a value is none, see {@link valuesOf}
 */
export function exerciseAdd(sent: { name?: string; sets?: string; reps?: string; kg?: string }): Mine {
    const name: string = ownNameOf(String(sent.name ?? ""));
    const added: OwnExercise | null = valuesOf(name, sent);
    if (name === "" || added === null)
        throw new Error(`No exercise: ${JSON.stringify(sent)}`);

    const own: OwnExercise[] = exercisesRead();
    if (!own.some((other: OwnExercise): boolean => sameExercise(other, added)))
        exercisesWrite([...own, added]);
    return mineRead();
}

/**
 * Writes what I do of a variant of an exercise as a rule into `Exercises.md`, its sets, repetitions and kilograms,
 * in place of the variant the page sends as it was, adding it where it is not there yet, like a basic one or one
 * of a workout only; every part of a workout that was that variant takes the new values too, so a workout brings
 * them; a variant that becomes another I have already stands once.
 * - `old`: The variant as it was.
 * - `changed`: The variant with its new values.
 * - `own`: My exercises so far.
 * - `at`: Place of the variant among them, -1 for one not there yet.
 * - `workouts`: My workouts so far.
 *
 * @param sent - The variant as it was, its name, sets, repetitions and kilograms, and its new sets, repetitions and
 *   kilograms, each empty for none, repetitions like `10` or `60s`
 * @returns All of mine, see {@link mineRead}
 * @throws {Error} - When the name is empty or a value is none, see {@link valuesOf}
 */
export function exerciseChange(sent: { old?: { name?: string; sets?: string; reps?: string; kg?: string };
    sets?: string; reps?: string; kg?: string }): Mine {
    const name: string = ownNameOf(String(sent.old?.name ?? ""));
    const old: OwnExercise | null = valuesOf(name, sent.old ?? {});
    const changed: OwnExercise | null = valuesOf(name, sent);
    if (name === "" || old === null || changed === null)
        throw new Error(`No sets, repetitions or kilograms: ${JSON.stringify(sent)}`);

    const own: OwnExercise[] = exercisesRead();
    const at: number = own.findIndex((other: OwnExercise): boolean => sameExercise(other, old));
    const exercise: OwnExercise = { ...changed, name: at === -1 ? name : own[at].name };
    exercisesWrite(at === -1 ? [...own, exercise]
        : own.map((other: OwnExercise, index: number): OwnExercise => index === at ? exercise : other));
    const workouts: Workout[] = workoutsRead([]);
    if (workouts.some((workout: Workout): boolean => workout.parts.some((part: Part): boolean =>
        part.kind === "Exercise" && sameExercise(part, old))))
        workoutsWrite(workouts.map((workout: Workout): Workout => ({
            ...workout,
            parts: workout.parts.map((part: Part): Part => part.kind === "Exercise" && sameExercise(part, old)
                ? { ...part, sets: exercise.sets, reps: exercise.reps, kg: exercise.kg } : part),
        })));
    return mineRead();
}

/**
 * Removes a variant of an exercise from `Exercises.md` and from every workout that holds it, so no workout names
 * a variant I no longer have; a workout left without parts is gone with it.
 * - `gone`: The variant removed.
 * - `held`: Whether a part is the variant.
 * - `workouts`: My workouts so far.
 *
 * @param sent - The variant, its name, sets, repetitions and kilograms, each empty for none
 * @returns All of mine, see {@link mineRead}
 */
export function exerciseRemove(sent: { name?: string; sets?: string; reps?: string; kg?: string }): Mine {
    const gone: OwnExercise = {
        name: String(sent.name ?? "").trim(), sets: String(sent.sets ?? "").trim(), reps: String(sent.reps ?? "").trim(),
        kg: String(sent.kg ?? "").trim(),
    };
    const own: OwnExercise[] = exercisesRead();
    if (own.some((other: OwnExercise): boolean => sameExercise(other, gone)))
        exercisesWrite(own.filter((other: OwnExercise): boolean => !sameExercise(other, gone)));
    const held: (part: Part) => boolean = (part: Part): boolean => part.kind === "Exercise" && sameExercise(part, gone);
    const workouts: Workout[] = workoutsRead([]);
    if (workouts.some((workout: Workout): boolean => workout.parts.some(held)))
        workoutsWrite(workouts.map((workout: Workout): Workout => ({
            ...workout, parts: workout.parts.filter((part: Part): boolean => !held(part)),
        })));
    return mineRead();
}

/**
 * Removes a workout from `Workouts.md`, by its name, ignoring case; a name no workout has changes nothing.
 *
 * @param name - Name of the workout, like `Push`
 * @returns All of mine, see {@link mineRead}
 */
export function workoutRemove(name: string): Mine {
    const workouts: Workout[] = workoutsRead([]);
    const kept: Workout[] = workouts.filter((workout: Workout): boolean =>
        workout.name.toLowerCase() !== name.trim().toLowerCase());
    if (kept.length !== workouts.length)
        workoutsWrite(kept);
    return mineRead();
}

/**
 * Asks YouTube for the title and the channel of a video by its link, see the top of this file.
 * - `address`: Address of the question, with the link of the video.
 * - `response`: Answer of YouTube.
 * - `found`: Title and channel as YouTube sends them.
 *
 * @param text - Link as pasted, see {@link linkOf}
 * @returns Title, channel and the link in the one form of `Videos.md`
 * @throws {Error} - When the text is no link to a video, or YouTube does not answer in time or knows no such video
 */
export async function videoFind(text: string): Promise<VideoFound> {
    const link: string = linkOf(text);
    if (link === "")
        throw new Error(`No link to a video: ${text}`);

    const address: URL = new URL(sport.video);
    address.searchParams.set("url", link);
    address.searchParams.set("format", "json");
    const response: Response = await fetch(address, {
        headers: { "User-Agent": agent }, signal: AbortSignal.timeout(answerTime),
    });
    if (!response.ok)
        throw new Error(`YouTube answered ${response.status}`);
    const found: { title?: unknown; author_name?: unknown } = await response.json() as { title?: unknown;
        author_name?: unknown };
    return { title: nameOf(String(found.title ?? "")), channel: nameOf(String(found.author_name ?? "")), link: link };
}

/**
 * Writes a video into `Videos.md`, new or changed: the one of its link, else for a video added by hand the one of its
 * title, ignoring case, changed at its place, a new one last; when the page sends the link or title it had, that one;
 * a title changed changes it in every workout that holds the video too.
 * - `videos`: My videos so far.
 * - `title`, `channel`, `link`: Title, channel and link as sent, cleaned.
 * - `kind`: Its kind, one of {@link videoKinds}, by its name as the code writes it.
 * - `before`: Link and title of the video changed, those sent when none was sent before.
 * - `at`: Place of the video among mine, -1 for a new one.
 * - `video`: The video as written.
 *
 * @param sent - Title, channel, minutes, kind and link of the video as the page sends them, and its link and title
 *   before a change
 * @returns All of mine, see {@link mineRead}
 * @throws {Error} - When the title is empty, the kind is none of {@link videoKinds}, the minutes are no number,
 *   or another video has the link
 */
export function videoSave(sent: { title?: string; channel?: string; minutes?: unknown; kind?: string; link?: string;
    oldLink?: string; oldTitle?: string }): Mine {
    const videos: Video[] = videosRead([]);
    const title: string = nameOf(String(sent.title ?? ""));
    const channel: string = nameOf(String(sent.channel ?? ""));
    const link: string = linkOf(String(sent.link ?? ""));
    const kind: SportKind | undefined = videoKinds.find((known: SportKind): boolean =>
        known.name.toLowerCase() === String(sent.kind ?? "").toLowerCase());
    const minutes: number | null = numberOf(sent.minutes);
    const before: { title: string; link: string } = sent.oldLink === undefined && sent.oldTitle === undefined
        ? { title: title, link: link }
        : { title: nameOf(String(sent.oldTitle ?? "")), link: linkOf(String(sent.oldLink ?? "")) };
    if (title === "")
        throw new Error("No title of a video");
    if (kind === undefined)
        throw new Error(`No kind of a video: ${sent.kind}`);
    if (String(sent.minutes ?? "").trim() !== "" && minutes === null)
        throw new Error(`No minutes: ${sent.minutes}`);

    const at: number = videos.findIndex((video: Video): boolean => before.link !== "" ? video.link === before.link
        : video.link === "" && video.title.toLowerCase() === before.title.toLowerCase());
    if (link !== "" && videos.some((video: Video, index: number): boolean => index !== at && video.link === link))
        throw new Error(`Another video has the link ${link}`);
    const video: Video = { title: title, channel: channel, minutes: minutes, kind: kind.name, link: link, kcal: null };
    videosWrite(at === -1 ? [...videos, video]
        : videos.map((other: Video, index: number): Video => index === at ? video : other));
    if (at !== -1 && (videos[at].title !== title || videos[at].link !== link)) {
        const old: Video = videos[at];
        workoutsWrite(workoutsRead([]).map((workout: Workout): Workout => ({
            ...workout,
            parts: workout.parts.map((part: Part): Part => isVideo(part, old)
                ? { kind: "Video", name: title, link: link } : part),
        })));
    }
    return mineRead();
}

/**
 * Removes a video from `Videos.md`, by its link, else for a video added by hand by its title, and from every workout
 * that holds it, so no workout names a video I no longer have; a workout left without parts is gone with it.
 * - `videos`: My videos so far.
 * - `gone`: The video removed, `undefined` for none.
 *
 * @param sent - Link of the video, or title of one added by hand
 * @returns All of mine, see {@link mineRead}
 */
export function videoRemove(sent: { link?: string; title?: string }): Mine {
    const videos: Video[] = videosRead([]);
    const link: string = linkOf(String(sent.link ?? ""));
    const title: string = nameOf(String(sent.title ?? "")).toLowerCase();
    const gone: Video | undefined = videos.find((video: Video): boolean => link !== "" ? video.link === link
        : video.link === "" && video.title.toLowerCase() === title);
    if (gone === undefined)
        return mineRead();

    videosWrite(videos.filter((video: Video): boolean => video !== gone));
    const workouts: Workout[] = workoutsRead([]);
    if (workouts.some((workout: Workout): boolean => workout.parts.some((part: Part): boolean => isVideo(part, gone))))
        workoutsWrite(workouts.map((workout: Workout): Workout => ({
            ...workout, parts: workout.parts.filter((part: Part): boolean => !isVideo(part, gone)),
        })));
    return mineRead();
}
