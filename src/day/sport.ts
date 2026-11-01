/**
 * ## Session of sport in the entry by category
 *
 * A session of the log, `Sport`, built and working as a meal with its foods.
 * - Exercises: The one plus opens a list of my workouts, then my exercises.
 *   `+ New workout` puts an empty block into the entry, which goes into `Workouts.md` with its first exercise.
 *   A variant of mine brings its values, one without values what I did of it the last time.
 *   A workout picked brings its block with its parts, an exercise alone stands below the blocks.
 * - Row: An exercise with its sets, repetitions or seconds, kilograms and `×`.
 *   The `×` between the fields and the units always show, so an empty row says what to type.
 *   A video comes only with a workout.
 * - Time: While the session holds only videos, its end follows them, so a slot drawn too long does not stay.
 *   With an exercise it stays as I typed it, since only I know how long the exercises took.
 * Each part is written as `X-EXERCISE` or `X-VIDEO` with its workout,
 * so the log keeps what I did that day, whatever I change in my workouts later.
 * An older session held its one workout as `X-WORKOUT`, which its parts without a workout belong to.
 */

import { listOf, rowOf } from "./choices.ts";
import { exerciseSend, mineLoad, workoutDelete, workoutSend } from "../sport/mine.ts";
import { lineNameOf, newOf, ruleTextOf, typedNameOf } from "../sport/lists.ts";
import { buttonOf, elementOf, kcalTextOf } from "../food/foods.ts";
import { listHeadOf, listLineOf } from "../food/search.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { crossPut, plusPut, searchFieldOf } from "../icons.ts";
import "./sport.css";

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
 * What a session of the log holds.
 * - `workout`: Its older `X-WORKOUT`, empty or missing for none.
 */
export type SessionLines = {
    workout?: string;
    exercises?: string[];
    videos?: string[];
};

/** Category of a session, `CATEGORIES:Sport`. */
export const sportName: string = "Sport";

/** Everything of mine as sent when the dialog picked `Sport`. */
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

/** Puts the end of a session minutes after its start. */
let fit: (minutes: number) => void = (): void => undefined;

/** Workouts named new in this session. */
let fresh: Set<string> = new Set();

/** The plus of each block, so a new workout opens its list at once. */
let blockPluses: Map<string, HTMLButtonElement> = new Map();

/** Reads a line `X-EXERCISE` into its row, its workout that of the line, else the older `X-WORKOUT`. */
function exerciseOf(line: string, before: string): ExerciseDone {
    const [name, sets, reps, kg, workout]: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        name: name ?? "",
        sets: sets ?? "",
        reps: reps ?? "",
        kg: kg ?? "",
        workout: workout ?? before,
    };
}

/** Reads a line `X-VIDEO` into its row, its workout as for an exercise. */
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

/** An exercise with the values of its variant, else what I did of it the last time, empty the first time. */
function exerciseLastOf(
    name: string,
    workout: string,
    values?: { sets?: string; reps?: string; kg?: string },
): ExerciseDone {
    const given: boolean = (values?.sets ?? "") !== "" || (values?.reps ?? "") !== "" || (values?.kg ?? "") !== "";
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

/** The video of mine a video of the session names, by its link, else its title. */
function videoFind(link: string, title: string): Video | undefined {
    return mine?.videos.find((video: Video): boolean =>
        link !== "" ? video.link === link : video.link === "" && video.title.toLowerCase() === title.toLowerCase(),
    );
}

/**
 * The kcal a video of the session burns in its minutes at my weight of today.
 * 0 while the video is no longer mine or has no minutes or kind.
 */
function videoKcalOf(video: VideoDone): number {
    const own: Video | undefined = videoFind(video.link, video.title);
    const minutes: number = Number(video.minutes.replace(",", ".")) || 0;
    return own?.kcal === null || own === undefined || own.minutes === null || own.minutes === 0
        ? 0
        : (own.kcal / own.minutes) * minutes;
}

/** Fits the end of the session to its videos, nothing while it holds an exercise. */
function videosFit(): void {
    const minutes: number = videos.reduce(
        (sum: number, video: VideoDone): number => sum + (Number(video.minutes.replace(",", ".")) || 0),
        0,
    );
    if (exercises.length === 0 && minutes > 0) fit(Math.round(minutes));
}

/** Picks a workout, its block with its parts last, one the session holds already stays as it is. */
function workoutPick(name: string): void {
    const picked: Workout | undefined = mine?.workouts.find((other: Workout): boolean => other.name === name);
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
                    minutes: video?.minutes === null || video === undefined ? "" : String(video.minutes),
                    link: part.link,
                    workout: name,
                };
            }),
    ];
    rowsShow();
    videosFit();
}

/** Puts an empty block of a new workout into the session and opens its list at once. */
function workoutNew(name: string): void {
    blocks = [...blocks, name];
    fresh.add(name);
    rowsShow();
    blockPluses.get(name)?.click();
}

/**
 * Keeps a new workout in `Workouts.md` as its exercises are now, saved entry or not, as a new meal.
 * With its last exercise removed it leaves, since `Workouts.md` holds no workout without parts.
 * Its block removed by its `×`, it stays mine. A workout I had before stays as it is.
 */
function freshSend(workout: string): void {
    if (!fresh.has(workout)) return;
    const parts: Part[] = exercises
        .filter((exercise: ExerciseDone): boolean => exercise.workout === workout)
        .map((exercise: ExerciseDone): Part => ({ ...exercise, kind: "Exercise", link: "" }));
    (parts.length === 0 ? workoutDelete(workout) : workoutSend(workout, parts))
        .then((sent: Mine): void => {
            mine = sent;
        })
        .catch((error: unknown): void => console.error(error));
}

/**
 * Adds an exercise to a block or alone, unless it stands there already, the cursor in its sets.
 * @param workout - The workout it belongs to, empty for one alone
 * @param variant - The variant of mine picked, none for one typed new
 */
function exerciseAdd(name: string, workout: string, variant?: Exercise): void {
    let added: ExerciseDone | undefined = exercises.find(
        (other: ExerciseDone): boolean => other.workout === workout && other.name.toLowerCase() === name.toLowerCase(),
    );
    if (added === undefined) {
        added = exerciseLastOf(name, workout, variant);
        exercises = [...exercises, added];
        rowsShow();
        freshSend(workout);
    }
    place.querySelector<HTMLInputElement>(`[data-part="${exercises.indexOf(added)}"] .sport-sets input`)?.focus();
}

/** Adds an exercise typed new into `Exercises.md`, then into the session. */
function exerciseNew(name: string, workout: string): void {
    exerciseSend(name)
        .then((sent: Mine): void => {
            mine = sent;
            exerciseAdd(name, workout);
        })
        .catch((error: unknown): void => console.error(error));
}

/**
 * Small field of a number, a change saves it, a text not taken marks it.
 * @param saved - Takes the text typed, gives whether it was taken
 */
function inputOf(value: string, words: string, wrong: string, saved: (text: string) => boolean): HTMLInputElement {
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
 * Small field of a row with its unit after it.
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
 * Sets and repetitions of an exercise, `×` between them, the switch `reps` or `s` after them.
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
        exercise.reps = exercise.reps.replace(/s$/, "") + (seconds && exercise.reps !== "" ? "s" : "");
        unitShow();
    });
    unitShow();
    place.append(
        inputOf(exercise.sets, `Sets of ${exercise.name}`, "A whole number of sets", (text: string): boolean => {
            const typed: string | null = whole(text);
            if (typed !== null) exercise.sets = typed;
            return typed !== null;
        }),
        elementOf("span", "sport-times", "×"),
        inputOf(
            exercise.reps.replace(/s$/, ""),
            `Repetitions or seconds of ${exercise.name}`,
            "A whole number",
            (text: string): boolean => {
                const typed: string | null = whole(text);
                if (typed !== null) exercise.reps = typed === "" ? "" : `${typed}${seconds ? "s" : ""}`;
                return typed !== null;
            },
        ),
        unit,
    );
    return place;
}

/** The `×` of a row, which takes its part or its block back. */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("cross-quiet", "", click);
    crossPut(button, words);
    return button;
}

/**
 * List of a plus as a menu, a search field, my workouts only in the row `Exercises`, then my exercises.
 * Each section ends in `+ New workout` or `+ New exercise` for a name none has.
 * Enter takes the first workout or exercise found, never a new one.
 * @param picker - Element the list stands in, below the rows it adds to
 * @param workout - The block it adds to, empty for the row `Exercises`, which offers my workouts too
 * @returns The plus, which opens it
 */
function plusOfList(picker: HTMLElement, words: string, workout: string): HTMLButtonElement {
    const plus: HTMLButtonElement = document.createElement("button");
    const box: HTMLElement = elementOf("div", "picker-box meal-box", "");
    const search: HTMLElement = elementOf("div", "food-search", "");
    const input: HTMLInputElement = document.createElement("input");
    const results: HTMLElement = elementOf("div", "food-results", "");
    const taken: (pick: () => void) => () => void =
        (pick: () => void): (() => void) =>
        (): void => {
            close();
            pick();
        };
    const show: () => void = (): void => {
        const typed: string = typedNameOf(input.value);
        const found: (name: string) => boolean = (name: string): boolean => matchesAll(name, wordsOf(input.value));
        const known: (name: string) => boolean = (name: string): boolean => name.toLowerCase() === typed.toLowerCase();
        const sectionOf: (name: string, lines: HTMLElement[], names: string[], add: HTMLElement) => HTMLElement[] = (
            name: string,
            lines: HTMLElement[],
            names: string[],
            add: HTMLElement,
        ): HTMLElement[] => {
            const all: HTMLElement[] = [...lines, ...(typed === "" || names.some(known) ? [] : [add])];
            return all.length === 0 ? [] : [listHeadOf(name, ""), ...all];
        };
        const workouts: Workout[] =
            workout !== "" ? [] : (mine?.workouts ?? []).filter((one: Workout) => found(one.name));
        const own: Exercise[] = (mine?.exercises ?? []).filter((one: Exercise): boolean => found(one.name));
        const lines: HTMLElement[] = [
            ...(workout !== ""
                ? []
                : sectionOf(
                      "Workouts",
                      workouts.map((one: Workout): HTMLElement => {
                          const parts: string = one.parts.map((part: Part): string => part.name).join(", ");
                          return listLineOf(
                              lineNameOf(one.name, parts),
                              one.kcal,
                              taken((): void => workoutPick(one.name)),
                              null,
                          )[0];
                      }),
                      [...(mine?.workouts ?? []).map((one: Workout): string => one.name), ...blocks],
                      newOf(
                          `New workout “${typed}”`,
                          "New workout, its exercises picked next",
                          taken((): void => workoutNew(typed)),
                      ),
                  )),
            ...sectionOf(
                "Exercises",
                own.map((one: Exercise): HTMLElement => {
                    const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
                        lineNameOf(one.name, ""),
                        null,
                        taken((): void => exerciseAdd(one.name, workout, one)),
                        null,
                    );
                    row.querySelector(".food-value")?.replaceChildren(ruleTextOf(one));
                    return line;
                }),
                (mine?.exercises ?? []).map((one: Exercise): string => one.name),
                newOf(
                    `New exercise “${typed}”`,
                    "New exercise, mine from now on",
                    taken((): void => exerciseNew(typed, workout)),
                ),
            ),
        ];
        results.replaceChildren(
            ...(lines.length > 0 ? lines : [elementOf("p", "food-none", "Type a workout or an exercise")]),
        );
    };
    const close: () => void = listOf(
        picker,
        plus,
        box,
        (): void => {
            input.value = "";
            show();
            input.focus();
        },
        (): void => {},
    );
    input.addEventListener("input", show);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        results.querySelector<HTMLButtonElement>(".food-item > button.food-row")?.click();
    });
    plusPut(plus, words);
    search.append(searchFieldOf(input, workout === "" ? "Search workouts or exercises" : "Search exercises"), results);
    box.append(search);
    picker.append(box);
    return plus;
}

function exerciseRowOf(exercise: ExerciseDone): HTMLElement {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const index: number = exercises.indexOf(exercise);
    row.dataset.part = String(index);
    row.append(
        elementOf("span", "meal-name", exercise.name),
        setsOf(exercise),
        fieldOf("sport-kg", exercise.kg, "kg", `Kilograms of ${exercise.name}`, (text: string): boolean => {
            const typed: string = text.trim().replace(",", ".");
            if (typed !== "" && !(Number(typed) >= 0)) return false;
            exercise.kg = typed;
            return true;
        }),
        removeOf(`Remove ${exercise.name}`, (): void => {
            exercises = exercises.filter((other: ExerciseDone): boolean => other !== exercise);
            rowsShow();
            videosFit();
            freshSend(exercise.workout);
        }),
    );
    return row;
}

/**
 * Row of a video, its kcal shown anew as its minutes change.
 * @param shown - Shows the kcal of its block anew
 */
function videoRowOf(video: VideoDone, shown: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const name: HTMLElement = elementOf("span", "meal-name", video.title);
    const kcal: HTMLElement = elementOf("span", "meal-kcal", kcalTextOf(videoKcalOf(video)));
    if (video.channel !== "") name.append(elementOf("span", "meal-unknown", ` (${video.channel})`));
    row.append(
        name,
        fieldOf("meal-grams", video.minutes, "min", `Minutes of ${video.title}`, (text: string): boolean => {
            const typed: string = text.trim().replace(",", ".");
            if (typed !== "" && !(Number(typed) >= 0)) return false;
            video.minutes = typed;
            kcal.textContent = kcalTextOf(videoKcalOf(video));
            shown();
            videosFit();
            return true;
        }),
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
 * Block of a workout as a meal, its row with the plus, the kcal of its videos and its `×`.
 * Its parts indented below it, then the list of its plus.
 */
function blockOf(workout: string): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const name: HTMLElement = elementOf("span", "meal-name", workout);
    const kcal: HTMLElement = elementOf("span", "meal-kcal", "");
    const parts: HTMLElement = elementOf("div", "meal-parts", "");
    const own: VideoDone[] = videos.filter((video: VideoDone): boolean => video.workout === workout);
    const total: () => void = (): void => {
        kcal.textContent =
            own.length === 0
                ? ""
                : kcalTextOf(own.reduce((sum: number, video: VideoDone): number => sum + videoKcalOf(video), 0));
    };
    const plus: HTMLButtonElement = plusOfList(parts, `Add an exercise to ${workout}`, workout);
    blockPluses.set(workout, plus);
    name.append(plus);
    row.append(
        name,
        elementOf("span", "", ""),
        kcal,
        removeOf(`Remove ${workout}`, (): void => {
            blocks = blocks.filter((other: string): boolean => other !== workout);
            exercises = exercises.filter((exercise: ExerciseDone): boolean => exercise.workout !== workout);
            videos = videos.filter((video: VideoDone): boolean => video.workout !== workout);
            rowsShow();
            videosFit();
        }),
    );
    parts.prepend(
        ...exercises.filter((exercise: ExerciseDone): boolean => exercise.workout === workout).map(exerciseRowOf),
        ...own.map((video: VideoDone): HTMLElement => videoRowOf(video, total)),
    );
    total();
    return [row, parts];
}

/**
 * Shows the rows anew, the plus, then the blocks,
 * then the exercises alone and those of a workout the session no longer holds.
 */
function rowsShow(): void {
    const rows: HTMLElement = elementOf("div", "meal-rows", "");
    const alone: ExerciseDone[] = exercises.filter(
        (exercise: ExerciseDone): boolean => !blocks.includes(exercise.workout),
    );
    blockPluses = new Map();
    rows.append(...blocks.flatMap(blockOf), ...alone.map(exerciseRowOf));
    const picker: HTMLElement = elementOf("div", "meal picker", "");
    picker.append(rows);
    const plus: HTMLButtonElement = plusOfList(picker, "Add a workout or an exercise", "");
    plus.classList.add("picker-line");
    const row: HTMLElement = rowOf("Exercises", picker);
    row.querySelector(".entry-name")?.append(plus);
    place.replaceChildren(row);
    changed();
}

/**
 * Opens a session in the dialog with everything of mine, a block for each workout in the order the parts name them.
 * @param lines - What the entry holds, `null` for a new one or one of another category
 * @throws {Error} - When the reader cannot answer
 */
export async function sportOpen(lines: SessionLines | null): Promise<void> {
    mine = await mineLoad();
    fresh = new Set();
    const before: string = lines?.workout ?? "";
    exercises = (lines?.exercises ?? []).map((line: string): ExerciseDone => exerciseOf(line, before));
    videos = (lines?.videos ?? []).map((line: string): VideoDone => videoOf(line, before));
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
 * Rows of the session for the dialog.
 * @returns One element whose rows count as rows of the dialog, see `sport.css`
 */
export function sportRowsOf(change: () => void, end: (minutes: number) => void): HTMLElement[] {
    changed = change;
    fit = end;
    rowsShow();
    return [place];
}

/** What the session holds, no `X-WORKOUT` since each part names its workout. */
export function sportRead(): { workout: string; exercises: string[]; videos: string[] } {
    return {
        workout: "",
        exercises: exercises.map((exercise: ExerciseDone): string =>
            [exercise.name, exercise.sets, exercise.reps, exercise.kg, exercise.workout].join(";"),
        ),
        videos: videos.map((video: VideoDone): string =>
            [video.title, video.channel, video.minutes, video.link, video.workout].join(";"),
        ),
    };
}
