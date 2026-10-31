/**
 * ## Session of sport in the entry by category
 *
 * A session of the log, `Sport`, built and working as a meal with its foods,
 * see `meal.ts`, in its look, see `meal.css`, on the computer as on a phone:
 * - Exercises: what I did, the one plus beside its name opening one list,
 *   whose search finds my workouts first, then my exercises,
 *   then the basic ones of a gym, see `basicExercises` in `reader/sport.ts`,
 *   and a name typed that none has adds itself as a new exercise.
 *   Each variant of mine stands with its values grey beside its name and brings them.
 *   One without values, a basic one or one typed new brings
 *   what I did of it the last time.
 *   A workout picked brings its block, as a meal brings its foods,
 *   its parts indented below it.
 *   An exercise picked alone stands by itself below the blocks.
 * - A row of an exercise, as that of a food: its name, its sets and repetitions,
 *   a switch `reps` or `s` for an exercise on time, its kilograms and its `×`.
 *   The `×` between the fields and the units always show,
 *   so an empty row says what to type.
 *   A video comes only with a workout,
 *   which takes it in the sport area by its link, see `../sport/lists.ts`.
 * - Its time: while the session holds only videos, its end follows them,
 *   so a slot drawn too long in the log does not stay.
 *   With an exercise beside them it stays as I typed it,
 *   since only I know how long the exercises took.
 * No `With`, since I do sport alone, and no note, see `categories.ts`.
 * The dialog writes each exercise as a line `X-EXERCISE` and each video as `X-VIDEO`,
 * each with the workout it belongs to,
 * so the log keeps what I did that day, whatever I change in my workouts later,
 * see `reader/sport.ts`.
 * A session written before held its one workout as `X-WORKOUT`,
 * which its parts without a workout of their own belong to.
 */

import { choicesOf, rowOf, searchOf } from "./choices.ts";
import { mineLoad } from "../sport/mine.ts";
import { buttonOf, elementOf, kcalTextOf } from "../food/foods.ts";
import { crossPut } from "../icons.ts";
import "./sport.css";

import type { Choice } from "./choices.ts";
import type { Exercise, Mine, Part, Workout } from "../sport/mine.ts";
import type { Video } from "../../reader/sport.ts";

/**
 * An exercise of the session as its row holds it, an empty value for none.
 * - `reps`: Its repetitions per set, or its seconds, like `60s`.
 * - `workout`: The workout it belongs to, empty for one picked alone.
 */
type ExerciseDone = {
    name: string;
    sets: string;
    reps: string;
    kg: string;
    workout: string;
};

/**
 * A video of the session as its row holds it, an empty value for none.
 * - `link`: Its link, empty for a video added by hand.
 */
type VideoDone = {
    title: string;
    channel: string;
    minutes: string;
    link: string;
    workout: string;
};

/**
 * What a session of the log holds, as the reader gives it with the entry.
 * - `workout`: Its `X-WORKOUT` of before, empty or missing for none.
 */
export type SessionLines = {
    workout?: string;
    exercises?: string[];
    videos?: string[];
};

/** Category of a session, `CATEGORIES:Sport`. */
export const sportName: string = "Sport";

/** Everything of mine as the reader sent it when the dialog picked `Sport`. */
let mine: Mine | null = null;

/** Names of the workouts of the session, each a block, in the order picked. */
let blocks: string[] = [];

/** Exercises of the session in their order, those of its blocks and those alone. */
let exercises: ExerciseDone[] = [];

/** Videos of the session in their order, each of a block. */
let videos: VideoDone[] = [];

/** Place of the rows in the dialog, filled anew on every change. */
const place: HTMLElement = elementOf("div", "sport-rows", "");

/** Lets the dialog know of a change, so it allows saving and shows what is picked. */
let changed: () => void = (): void => undefined;

/** Puts the end of a session minutes after its start, see `endFit` in `categories.ts`. */
let fit: (minutes: number) => void = (): void => undefined;

/** Prefix of the value of a workout in the list, tells it from an exercise of a name. */
const workoutValue: string = "workout:";

/**
 * Prefix of the value of a variant of mine in the list,
 * before its place among my exercises,
 * which tells two variants of one name apart.
 */
const variantValue: string = "variant:";

/** Cleans a name typed for an exercise, as the reader cleans it. */
function nameOf(typed: string): string {
    return typed.replace(/[|;,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Reads a line `X-EXERCISE` into its row, its workout that of the line,
 * else `before`, the `X-WORKOUT` of the session of before.
 */
function exerciseOf(line: string, before: string): ExerciseDone {
    const [name, sets, reps, kg, workout]: string[] = line
        .split(";")
        .map((part: string): string => part.trim());
    return {
        name: name ?? "",
        sets: sets ?? "",
        reps: reps ?? "",
        kg: kg ?? "",
        workout: workout ?? before,
    };
}

/** Reads a line `X-VIDEO` into its row, its workout as {@link exerciseOf} takes it. */
function videoOf(line: string, before: string): VideoDone {
    const [title, channel, minutes, link, workout]: string[] = line
        .split(";")
        .map((part: string): string => part.trim());
    return {
        title: title ?? "",
        channel: channel ?? "",
        minutes: minutes ?? "",
        link: link ?? "",
        workout: workout ?? before,
    };
}

/**
 * Brings an exercise with the values of the variant of mine it was picked as,
 * else with what I did of it the last time,
 * see `last` of `Mine` in `../sport/mine.ts`, empty the first time.
 */
function exerciseLastOf(
    name: string,
    workout: string,
    values?: { sets?: string; reps?: string; kg?: string },
): ExerciseDone {
    const given: boolean =
        (values?.sets ?? "") !== "" ||
        (values?.reps ?? "") !== "" ||
        (values?.kg ?? "") !== "";
    if (given)
        return {
            name: name,
            sets: values?.sets ?? "",
            reps: values?.reps ?? "",
            kg: values?.kg ?? "",
            workout: workout,
        };
    const last: string | undefined = mine?.last[name.toLowerCase()];
    return last === undefined
        ? { name: name, sets: "", reps: "", kg: "", workout: workout }
        : { ...exerciseOf(last, ""), name: name, workout: workout };
}

/** Finds the video of mine a video of the session names, by its link, else its title. */
function videoFind(link: string, title: string): Video | undefined {
    return mine?.videos.find((video: Video): boolean =>
        link !== ""
            ? video.link === link
            : video.link === "" && video.title.toLowerCase() === title.toLowerCase(),
    );
}

/**
 * Gives the kcal a video of the session burns in its minutes,
 * as my video burns in its own at my weight of today, see `Video` in `reader/sport.ts`.
 * 0 while I have no weight or the video is no longer mine.
 */
function videoKcalOf(video: VideoDone): number {
    const own: Video | undefined = videoFind(video.link, video.title);
    const minutes: number = Number(video.minutes.replace(",", ".")) || 0;
    return own?.kcal === null ||
        own === undefined ||
        own.minutes === null ||
        own.minutes === 0
        ? 0
        : (own.kcal / own.minutes) * minutes;
}

/** Writes the values of a variant as the list shows them grey beside its name. */
function valuesTextOf(exercise: { sets: string; reps: string; kg: string }): string {
    const reps: string = exercise.reps.replace(/^(\d+)s$/, "$1 s");
    const sets: string =
        exercise.sets === ""
            ? reps
            : reps === ""
              ? `${exercise.sets} ×`
              : `${exercise.sets} × ${reps}`;
    return [sets, exercise.kg === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
}

/**
 * Fits the end of the session to its videos after a change of its parts,
 * nothing while it holds an exercise, see the top of this file.
 */
function videosFit(): void {
    const minutes: number = videos.reduce(
        (sum: number, video: VideoDone): number =>
            sum + (Number(video.minutes.replace(",", ".")) || 0),
        0,
    );
    if (exercises.length === 0 && minutes > 0) fit(Math.round(minutes));
}

/**
 * Picks a workout: its block below the blocks there are, with its parts.
 * A workout the session holds already stays as it is.
 */
function workoutPick(name: string): void {
    const picked: Workout | undefined = mine?.workouts.find(
        (other: Workout): boolean => other.name === name,
    );
    if (picked === undefined || blocks.includes(name)) return;
    blocks = [...blocks, name];
    exercises = [
        ...exercises,
        ...picked.parts
            .filter((part: Part): boolean => part.kind === "Exercise")
            .map((part: Part): ExerciseDone => exerciseLastOf(part.name, name, part)),
    ];
    videos = [
        ...videos,
        ...picked.parts
            .filter((part: Part): boolean => part.kind === "Video")
            .map((part: Part): VideoDone => {
                const video: Video | undefined = videoFind(part.link, part.name);
                return {
                    title: video?.title ?? part.name,
                    channel: video?.channel ?? "",
                    minutes:
                        video?.minutes === null || video === undefined
                            ? ""
                            : String(video.minutes),
                    link: part.link,
                    workout: name,
                };
            }),
    ];
    rowsShow();
    videosFit();
}

/**
 * Adds an exercise, to a block or alone, and puts the cursor into its sets.
 *
 * @param value - Value picked, a variant by {@link variantValue} and its place,
 *   else a name as picked or typed
 * @param workout - The workout it belongs to, empty for one alone
 */
function exerciseAdd(value: string, workout: string): void {
    const variant: Exercise | undefined = value.startsWith(variantValue)
        ? mine?.exercises[Number(value.slice(variantValue.length))]
        : undefined;
    const name: string = nameOf(variant?.name ?? value);
    if (name === "") return;
    const added: ExerciseDone = exerciseLastOf(name, workout, variant);
    exercises = [...exercises, added];
    rowsShow();
    place
        .querySelector<HTMLInputElement>(
            `[data-part="${exercises.indexOf(added)}"] .sport-sets input`,
        )
        ?.focus();
}

/**
 * Makes a small field of a number, as the grams of a food:
 * a change saves it, a text not taken marks it.
 *
 * @param saved - Takes the text typed, gives whether it was taken
 */
function inputOf(
    value: string,
    words: string,
    wrong: string,
    saved: (text: string) => boolean,
): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.value = value;
    input.setAttribute("aria-label", words);
    input.addEventListener("input", (): void => input.setCustomValidity(""));
    input.addEventListener("change", (): void => {
        if (!saved(input.value)) input.setCustomValidity(wrong);
        input.reportValidity();
    });
    return input;
}

/**
 * Makes a small field of a row with its unit after it, as the grams of a food.
 *
 * @param className - Class of the field, which a phone puts first in its row
 */
function fieldOf(
    className: string,
    value: string,
    unit: string,
    words: string,
    saved: (text: string) => boolean,
): HTMLLabelElement {
    const label: HTMLLabelElement = document.createElement("label");
    label.className = className;
    label.append(inputOf(value, words, `A number of ${unit}`, saved), ` ${unit}`);
    return label;
}

/**
 * Makes the sets and repetitions of an exercise:
 * two small fields of whole numbers with `×` between them
 * and the switch of the unit after them, `reps` or `s`.
 *
 * @param exercise - The exercise, changed in place
 */
function setsOf(exercise: ExerciseDone): HTMLElement {
    const place: HTMLElement = elementOf("span", "meal-grams sport-sets", "");
    let seconds: boolean = exercise.reps.endsWith("s");
    const whole: (text: string) => string | null = (text: string): string | null =>
        /^\s*\d*\s*$/.test(text) ? text.trim() : null;
    const unitShow: () => void = (): void => {
        unit.textContent = seconds ? "s" : "reps";
        unit.title = seconds
            ? "Seconds per set; a click makes them repetitions"
            : "Repetitions per set; a click makes them seconds";
    };
    const unit: HTMLButtonElement = buttonOf("sport-unit", "", (): void => {
        seconds = !seconds;
        exercise.reps =
            exercise.reps.replace(/s$/, "") +
            (seconds && exercise.reps !== "" ? "s" : "");
        unitShow();
    });
    unitShow();
    place.append(
        inputOf(
            exercise.sets,
            `Sets of ${exercise.name}`,
            "A whole number of sets",
            (text: string): boolean => {
                const typed: string | null = whole(text);
                if (typed !== null) exercise.sets = typed;
                return typed !== null;
            },
        ),
        elementOf("span", "sport-times", "×"),
        inputOf(
            exercise.reps.replace(/s$/, ""),
            `Repetitions or seconds of ${exercise.name}`,
            "A whole number",
            (text: string): boolean => {
                const typed: string | null = whole(text);
                if (typed !== null)
                    exercise.reps = typed === "" ? "" : `${typed}${seconds ? "s" : ""}`;
                return typed !== null;
            },
        ),
        unit,
    );
    return place;
}

/** Makes the small grey `×` of a row, which takes its part or its block back. */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("cross-quiet", "", click);
    crossPut(button, words);
    return button;
}

/**
 * Makes the list of exercises, a menu with the one plus as its line.
 *
 * @param workouts - Whether the list offers my workouts first,
 *   as the list of the row `Exercises` does
 * @param pick - Takes the value picked, a workout by {@link workoutValue} and its name,
 *   a variant of mine by {@link variantValue} and its place, else the name of an exercise
 */
function listOfExercises(
    words: string,
    workouts: boolean,
    pick: (value: string) => void,
): HTMLElement {
    const group: string = workouts ? "Exercises" : "";
    const choices: Choice[] = [
        ...(workouts
            ? (mine?.workouts ?? []).map((workout: Workout): Choice => ({
                  value: `${workoutValue}${workout.name}`,
                  text: workout.name,
                  group: "My workouts",
                  detail: workout.parts.map((part: Part): string => part.name).join(", "),
              }))
            : []),
        ...(mine?.exercises ?? []).map((exercise: Exercise, index: number): Choice => ({
            value: `${variantValue}${index}`,
            text: exercise.name,
            group: group,
            detail: valuesTextOf(exercise),
        })),
        ...(mine?.basics ?? []).map((name: string): Choice => ({
            value: name,
            text: name,
            group: group,
        })),
    ];
    return choicesOf({
        search: searchOf(choices),
        picked: [],
        many: false,
        adding: true,
        noun: "exercise",
        empty: words,
        plus: true,
        pick: (values: string[]): void => {
            if (values.length > 0) pick(values[0]);
        },
    });
}

/** Makes the row of an exercise. */
function exerciseRowOf(exercise: ExerciseDone): HTMLElement {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const index: number = exercises.indexOf(exercise);
    row.dataset.part = String(index);
    row.append(
        elementOf("span", "meal-name", exercise.name),
        setsOf(exercise),
        fieldOf(
            "sport-kg",
            exercise.kg,
            "kg",
            `Kilograms of ${exercise.name}`,
            (text: string): boolean => {
                const typed: string = text.trim().replace(",", ".");
                if (typed !== "" && !(Number(typed) >= 0)) return false;
                exercise.kg = typed;
                return true;
            },
        ),
        removeOf(`Remove ${exercise.name}`, (): void => {
            exercises = exercises.filter(
                (other: ExerciseDone): boolean => other !== exercise,
            );
            rowsShow();
            videosFit();
        }),
    );
    return row;
}

/**
 * Makes the row of a video, its kcal shown anew as its minutes change.
 *
 * @param shown - Shows the kcal of its block anew
 */
function videoRowOf(video: VideoDone, shown: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const name: HTMLElement = elementOf("span", "meal-name", video.title);
    const kcal: HTMLElement = elementOf(
        "span",
        "meal-kcal",
        kcalTextOf(videoKcalOf(video)),
    );
    if (video.channel !== "")
        name.append(elementOf("span", "meal-unknown", ` (${video.channel})`));
    row.append(
        name,
        fieldOf(
            "meal-grams",
            video.minutes,
            "min",
            `Minutes of ${video.title}`,
            (text: string): boolean => {
                const typed: string = text.trim().replace(",", ".");
                if (typed !== "" && !(Number(typed) >= 0)) return false;
                video.minutes = typed;
                kcal.textContent = kcalTextOf(videoKcalOf(video));
                shown();
                videosFit();
                return true;
            },
        ),
        kcal,
        removeOf(`Remove ${video.title}`, (): void => {
            videos = videos.filter((other: VideoDone): boolean => other !== video);
            rowsShow();
            videosFit();
        }),
    );
    return row;
}

/**
 * Makes the block of a workout, as a meal stands with its foods:
 * its row with the small grey plus right after its name,
 * the kcal of its videos and its `×`, which removes it with its parts.
 * Then its parts below it, indented under a thin grey line,
 * and the list of its plus below them, as the search of a meal stands,
 * see `mealRowsOf` in `meal.ts`.
 */
function blockOf(workout: string): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const name: HTMLElement = elementOf("span", "meal-name", workout);
    const kcal: HTMLElement = elementOf("span", "meal-kcal", "");
    const parts: HTMLElement = elementOf("div", "meal-parts", "");
    const own: VideoDone[] = videos.filter(
        (video: VideoDone): boolean => video.workout === workout,
    );
    const total: () => void = (): void => {
        kcal.textContent =
            own.length === 0
                ? ""
                : kcalTextOf(
                      own.reduce(
                          (sum: number, video: VideoDone): number =>
                              sum + videoKcalOf(video),
                          0,
                      ),
                  );
    };
    const list: HTMLElement = listOfExercises(
        `Add an exercise to ${workout}`,
        false,
        (value: string): void => exerciseAdd(value, workout),
    );
    const line: HTMLElement | null = list.querySelector(".picker-line");
    if (line !== null) name.append(line);
    row.append(
        name,
        elementOf("span", "", ""),
        kcal,
        removeOf(`Remove ${workout}`, (): void => {
            blocks = blocks.filter((other: string): boolean => other !== workout);
            exercises = exercises.filter(
                (exercise: ExerciseDone): boolean => exercise.workout !== workout,
            );
            videos = videos.filter(
                (video: VideoDone): boolean => video.workout !== workout,
            );
            rowsShow();
            videosFit();
        }),
    );
    parts.append(
        ...exercises
            .filter((exercise: ExerciseDone): boolean => exercise.workout === workout)
            .map(exerciseRowOf),
        ...own.map((video: VideoDone): HTMLElement => videoRowOf(video, total)),
        list,
    );
    total();
    return [row, parts];
}

/**
 * Shows the row of what I did anew in its place, then lets the dialog know.
 * - `alone`: The exercises picked alone,
 *   and those of a workout the session no longer holds.
 * - `list`: The list of the row, whose plus goes beside its name,
 *   as `lineMove` in `choices.ts` moves it, and not the plus of a block,
 *   which stands first in the row.
 */
function rowsShow(): void {
    const rows: HTMLElement = elementOf("div", "meal-rows", "");
    const alone: ExerciseDone[] = exercises.filter(
        (exercise: ExerciseDone): boolean => !blocks.includes(exercise.workout),
    );
    rows.append(...blocks.flatMap(blockOf), ...alone.map(exerciseRowOf));
    const box: HTMLElement = elementOf("div", "meal", "");
    const list: HTMLElement = listOfExercises(
        "Add a workout or an exercise",
        true,
        (value: string): void => {
            if (value.startsWith(workoutValue))
                workoutPick(value.slice(workoutValue.length));
            else exerciseAdd(value, "");
        },
    );
    box.append(rows, list);
    const row: HTMLElement = rowOf("Exercises", box);
    const label: HTMLElement | null = row.querySelector(".entry-name");
    const line: HTMLElement | null = list.querySelector(".picker-line");
    if (label !== null && line !== null) label.append(line);
    place.replaceChildren(row);
    changed();
}

/**
 * Opens a session in the dialog: loads my workouts, exercises and videos,
 * and takes what the entry holds.
 * A workout of a part is a block, in the order the parts name them.
 *
 * @param lines - What the entry holds, `null` for a new one or one of another category
 * @throws {Error} - When the reader cannot answer
 */
export async function sportOpen(lines: SessionLines | null): Promise<void> {
    mine = await mineLoad();
    const before: string = lines?.workout ?? "";
    exercises = (lines?.exercises ?? []).map((line: string): ExerciseDone =>
        exerciseOf(line, before),
    );
    videos = (lines?.videos ?? []).map((line: string): VideoDone =>
        videoOf(line, before),
    );
    blocks = [
        ...new Set(
            [
                ...exercises.map((exercise: ExerciseDone): string => exercise.workout),
                ...videos.map((video: VideoDone): string => video.workout),
            ].filter((workout: string): boolean => workout !== ""),
        ),
    ];
}

/**
 * Gives the rows of the session for the dialog.
 *
 * @returns One element whose rows count as rows of the dialog, see `sport.css`
 */
export function sportRowsOf(
    change: () => void,
    end: (minutes: number) => void,
): HTMLElement[] {
    changed = change;
    fit = end;
    rowsShow();
    return [place];
}

/**
 * Reads what the session holds, as the reader writes it.
 * No `X-WORKOUT` any more, since each part names its workout.
 */
export function sportRead(): { workout: string; exercises: string[]; videos: string[] } {
    return {
        workout: "",
        exercises: exercises.map((exercise: ExerciseDone): string =>
            [
                exercise.name,
                exercise.sets,
                exercise.reps,
                exercise.kg,
                exercise.workout,
            ].join(";"),
        ),
        videos: videos.map((video: VideoDone): string =>
            [video.title, video.channel, video.minutes, video.link, video.workout].join(
                ";",
            ),
        ),
    };
}
