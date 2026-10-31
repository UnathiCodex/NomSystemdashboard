/**
 * ## Session of sport in the entry by category
 *
 * A session of the log, `Sport`, below its summary and place,
 * built and working as a meal with its foods, see `meal.ts`, in its look,
 * see `meal.css`, on the computer as on a phone:
 * - Exercises: what I did, the one plus beside its name opening one list, a menu over the dialog,
 *   whose search finds my workouts first, then my exercises, then the basic ones of a gym,
 *   see `basicExercises` in `reader/sport.ts`,
 *   and a name typed that none has adds itself as a new exercise.
 *   Each variant of mine stands with its values grey beside its name,
 *   like `Dips 3 × 10` and `Dips 4 × 8 · 10 kg`, and brings them;
 *   one without values, a basic one or one typed new brings what I did of it the last time.
 *   A workout picked brings its block, as a meal brings its foods:
 *   a row with its name, the small grey plus after it,
 *   which adds an exercise to it, the kcal of its videos and a small grey `×`,
 *   which removes it with its parts;
 *   below it, indented under a thin grey line, its parts,
 *   each exercise with the values the workout holds for it,
 *   else with what I did of it the last time,
 *   each video with its minutes of `Videos.md`.
 *   An exercise picked alone stands by itself below the blocks.
 * - A row of an exercise, as that of a food: its name,
 *   then its sets, `×` and its repetitions, two small fields, and after them `reps`, a switch:
 *   a click turns it into `s` for an exercise on time, like a plank, and back,
 *   so `3 × 10 reps` and `2 × 60 s` stand alike;
 *   then its kilograms in place of the kcal of a food, empty for none, like for dips, and its `×`;
 *   the `×` between the fields and the units always show, so an empty row says what to type;
 *   a row of a video its title with its channel grey in brackets, its minutes in the field,
 *   its kcal and its `×`. On a phone the fields come first, as the grams of a food do,
 *   like `3 × 10 reps  Dips  kg`.
 *   A video comes only with a workout,
 *   which takes it in the sport area by its link, see `../sport/lists.ts`.
 * - Its time: while the session holds only videos, its end follows them as I change its parts,
 *   its start and their minutes, like `18:00` to `18:30` for two videos of 15 minutes,
 *   so a slot drawn too long in the log does not stay;
 *   with an exercise beside them it stays as I typed it,
 *   since only I know how long the exercises took.
 * No `With`, since I do sport alone, and no note,
 * which the dialog hides for a session, see `categories.ts`.
 * The dialog writes each exercise as a line `X-EXERCISE`, its name, sets,
 * repetitions and kilograms, then the workout it belongs to, parted by `;`,
 * like `Bench press;3;10;40;Push` or `Squat;3;8;50;` alone,
 * and each video as a line `X-VIDEO`, its title, channel, minutes, link and workout,
 * so the log keeps what I did that day, whatever I change in my workouts later,
 * see `reader/sport.ts`; a session written before held its one workout as `X-WORKOUT`,
 * which its parts without a workout of their own belong to.
 *
 * - `./choices.ts`: Rows of the dialog and the lists that open as menus over it.
 * - `../sport/mine.ts`: Loads my workouts, exercises and videos,
 *   and what I did of each exercise the last time.
 * - `../food/foods.ts`: Writes amounts and makes elements and buttons.
 * - `../icons.ts`: Puts the one `×` into the button that takes a part back.
 * - `./sport.css`: What the rows of a session add to those of a meal.
 */

import { choicesOf, rowOf, searchOf } from "./choices.ts";
import { mineLoad } from "../sport/mine.ts";
import { amountOf, buttonOf, elementOf } from "../food/foods.ts";
import { crossPut } from "../icons.ts";
import "./sport.css";

import type { Choice } from "./choices.ts";
import type { Exercise, Mine, Part, Video, Workout } from "../sport/mine.ts";

/**
 * An exercise of the session as its row holds it.
 *
 * - `name`: Its name, like `Bench press`.
 * - `sets`: Its sets, like `3`, empty for none.
 * - `reps`: Its repetitions per set, like `10`, or its seconds, like `60s`, empty for none.
 * - `kg`: Its kilograms, like `40`, empty for none.
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
 * A video of the session as its row holds it.
 *
 * - `title`: Its title.
 * - `channel`: Its channel, empty for none.
 * - `minutes`: The minutes I did it, like `25`, empty for none.
 * - `link`: Its link, empty for a video added by hand.
 * - `workout`: The workout it belongs to.
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
 *
 * - `workout`: Its `X-WORKOUT` of before, empty or missing for none.
 * - `exercises`: Its lines `X-EXERCISE`.
 * - `videos`: Its lines `X-VIDEO`.
 */
export type SessionLines = {
    workout?: string;
    exercises?: string[];
    videos?: string[];
};

/**
 * Category of a session, `CATEGORIES:Sport`.
 */
export const sportName: string = "Sport";

/**
 * Everything of mine as the reader sent it when the dialog picked `Sport`, `null` before.
 */
let mine: Mine | null = null;

/**
 * Names of the workouts of the session, each a block, in the order picked.
 */
let blocks: string[] = [];

/**
 * Exercises of the session in their order, those of its blocks and those alone.
 */
let exercises: ExerciseDone[] = [];

/**
 * Videos of the session in their order, each of a block.
 */
let videos: VideoDone[] = [];

/**
 * Place of the rows in the dialog, filled anew on every change, see {@link rowsShow}.
 */
const place: HTMLElement = elementOf("div", "sport-rows", "");

/**
 * Lets the dialog know of a change, so it allows saving and shows what is picked.
 */
let changed: () => void = (): void => undefined;

/**
 * Puts the end of the session in the dialog at its start and some minutes after,
 * see `endFit` in `categories.ts`.
 */
let fit: (minutes: number) => void = (): void => undefined;

/**
 * Prefix of the value of a workout in the list, which tells it from an exercise of the same name.
 */
const workoutValue: string = "workout:";

/**
 * Prefix of the value of a variant of mine in the list, before its place among my exercises,
 * which tells two variants of one name apart, like `Dips 3 × 10` and `Dips 4 × 8 · 10 kg`.
 */
const variantValue: string = "variant:";

/**
 * Cleans a name typed for an exercise, as the reader cleans it:
 * `|`, `;` and `,` become spaces, spaces in a row one, none at the ends.
 *
 * @param typed - Name as typed
 * @returns Clean name
 */
function nameOf(typed: string): string {
    return typed.replace(/[|;,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Reads a line `X-EXERCISE` into its row, its workout that of the line,
 * else the one of the session of before.
 *
 * @param line - Line like `Bench press;3;10;40;Push`
 * @param before - The workout of the session of before, its `X-WORKOUT`, empty for none
 * @returns The exercise
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

/**
 * Reads a line `X-VIDEO` into its row, its workout that of the line,
 * else the one of the session of before.
 *
 * @param line - Line like `Pilates;Lidia Mera;25;https://www.youtube.com/watch?v=…;Morning`
 * @param before - The workout of the session of before, its `X-WORKOUT`, empty for none
 * @returns The video
 */
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
 * of the sport area or of a workout, see `../sport/lists.ts`, else, for one without values,
 * like a basic one or one typed new, with what I did of it the last time,
 * see `last` of `Mine` in `../sport/mine.ts`, empty the first time.
 * - `given`: Whether the variant has any value.
 * - `last`: The line of the last time.
 *
 * @param name - Name of the exercise
 * @param workout - The workout it belongs to, empty for one alone
 * @param values - Sets, repetitions and kilograms of its variant, left out for none
 * @returns The exercise
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

/**
 * Finds the video of mine a video of the session or a part of a workout names,
 * by its link, else by its title.
 *
 * @param link - Its link, empty for a video added by hand
 * @param title - Its title
 * @returns The video, `undefined` for one I no longer have
 */
function videoFind(link: string, title: string): Video | undefined {
    return mine?.videos.find((video: Video): boolean =>
        link !== ""
            ? video.link === link
            : video.link === "" && video.title.toLowerCase() === title.toLowerCase(),
    );
}

/**
 * Gives what a video of the session burns in its minutes,
 * as my video burns in its own at my weight of today, see `Video` in `../sport/mine.ts`;
 * 0 while I have no weight or the video is no longer mine.
 * - `own`: The video of mine.
 * - `minutes`: Its minutes in the session.
 *
 * @param video - The video of the session
 * @returns kcal
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

/**
 * Writes the values of a variant as the list shows them grey beside its name,
 * like `3 × 10 · 40 kg` or `2 × 60 s`.
 * - `reps`: Its repetitions, seconds written with a space before `s`.
 * - `sets`: Its sets and repetitions.
 *
 * @param exercise - The variant
 * @returns Text of its values, empty for none
 */
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
 * Writes kcal as a row shows them, whole, like `180 kcal`.
 *
 * @param kcal - kcal
 * @returns Text of the kcal
 */
function kcalTextOf(kcal: number): string {
    return `${amountOf(kcal, 0)} kcal`;
}

/**
 * Fits the end of the session to its videos after a change of its parts,
 * while it holds only videos with minutes, see the top of this file;
 * nothing while it holds an exercise.
 * - `minutes`: Minutes of its videos together.
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
 * Picks a workout: its block below the blocks there are, with its parts,
 * its exercises with what I did the last time, its videos with their minutes;
 * a workout the session holds already stays as it is.
 * - `picked`: The workout of mine of the name.
 *
 * @param name - Name of the workout
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
 * Adds an exercise, to a block or alone, picked as a variant of mine with its values,
 * or by its name, see {@link exerciseLastOf}, and puts the cursor into its sets.
 * - `variant`: The variant of mine picked, by its place among my exercises, `undefined` for a name.
 * - `name`: Its name, cleaned.
 * - `added`: The exercise added.
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
 * - `input`: The field.
 *
 * @param value - Text it starts with
 * @param words - What it holds, for screen readers, like `Kilograms of Squat`
 * @param wrong - What a text not taken says, like `A number of kg`
 * @param saved - Takes the text typed; gives whether it was taken
 * @returns The field
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
 * Makes a small field of a row, as the grams of a food, its unit after it.
 * - `label`: The field with its unit.
 *
 * @param className - Class of the field, like `meal-grams`, which a phone puts first in its row
 * @param value - Text it starts with
 * @param unit - Unit after it, like `kg`
 * @param words - What it holds, for screen readers, like `Kilograms of Squat`
 * @param saved - Takes the text typed;
 *   gives whether it was taken, so a text not taken marks the field
 * @returns The field with its unit
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
 * Makes the sets and repetitions of an exercise, see the top of this file:
 * two small fields of whole numbers with `×` between them and the switch of the unit after them,
 * `reps` or `s`, which a click turns into the other.
 * - `place`: The fields with the `×` and the unit.
 * - `seconds`: Whether the exercise is on time, its repetitions written with `s`, like `60s`.
 * - `whole`: Reads a whole number typed, empty for none, `null` for a text that is none.
 * - `unitShow`: Shows the unit and its tooltip as it now is.
 * - `unit`: The switch of the unit.
 *
 * @param exercise - The exercise, changed in place
 * @returns The fields
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

/**
 * Makes the small grey `×` of a row, which takes its part or its block back.
 * - `button`: The ×.
 *
 * @param words - What it removes, like `Remove Squat`
 * @param click - What a click does
 * @returns The ×
 */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("cross-quiet", "", click);
    crossPut(button, words);
    return button;
}

/**
 * Makes the list of exercises, a menu with the one plus as its line, whose pick adds an exercise.
 *
 * @param words - What the plus adds, its tooltip, like `Add an exercise to Push`
 * @param workouts - Whether the list offers my workouts first,
 *   as the list of the row `Exercises` does
 * @param pick - Takes the value picked, a workout by {@link workoutValue} and its name,
 *   a variant of mine by {@link variantValue} and its place, its values grey beside it,
 *   else the name of an exercise
 * @returns The list with its plus
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

/**
 * Makes the row of an exercise: its name, its sets and repetitions,
 * see {@link setsOf}, its kilograms and its `×`.
 * - `row`: The row.
 * - `index`: Its place among the exercises.
 *
 * @param exercise - The exercise
 * @returns The row
 */
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
 * Makes the row of a video:
 * its title with its channel grey in brackets, its minutes, its kcal and its `×`.
 * - `row`: The row.
 * - `name`: Its title with its channel.
 * - `kcal`: Its kcal, shown anew as its minutes change.
 *
 * @param video - The video
 * @param shown - Shows the kcal of its block anew
 * @returns The row
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
 * its row, its name with the small grey plus after it,
 * which adds an exercise to it, the kcal of its videos, none while it has no video, and its `×`,
 * which removes it with its parts; then its parts below it, indented under a thin grey line.
 * - `row`: Its row.
 * - `name`: Its name with its plus, the line of its list, right after the name,
 *   as the plus of a meal stands.
 * - `list`: The list of its plus, below its parts, as the search of a meal stands,
 *   see `mealRowsOf` in `meal.ts`.
 * - `line`: The plus.
 * - `kcal`: kcal of its videos.
 * - `parts`: Its parts.
 * - `own`: Its videos.
 * - `total`: Shows the kcal of its videos anew.
 *
 * @param workout - Name of the workout
 * @returns Its row and its parts
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
 * Shows the row of what I did anew in its place, see the top of this file:
 * its name `Exercises` with the one plus beside it, then the blocks of the workouts in their order,
 * then the exercises alone; then lets the dialog know.
 * - `rows`: The blocks and the rows alone, as the rows of the foods of a meal stand.
 * - `alone`: The exercises picked alone, and those of a workout the session no longer holds.
 * - `box`: The rows and the list of the row.
 * - `list`: The list of the row, whose plus goes beside its name,
 *   as `lineMove` in `choices.ts` moves it, and not the plus of a block,
 *   which stands first in the row.
 * - `line`: The plus of the list.
 * - `row`: The row of the dialog.
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
 * and takes what the entry holds, a new entry nothing;
 * a workout of a part is a block, in the order the parts name them.
 * - `before`: The one workout of a session written before, its `X-WORKOUT`.
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
 * Gives the rows of the session for the dialog, the same for every kind, see {@link rowsShow}.
 *
 * @param change - Lets the dialog know of a change
 * @param end - Puts the end of the session at its start
 *   and some minutes after, see {@link videosFit}
 * @returns The place of the rows,
 *   one element whose rows count as rows of the dialog, see `sport.css`
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
 * Reads what the session holds, as the reader writes it, see the top of this file;
 * no `X-WORKOUT` any more, since each part names its workout.
 *
 * @returns No workout, the lines `X-EXERCISE` and the lines `X-VIDEO`
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
