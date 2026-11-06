/**
 * ## Session of sport in the entry by category
 *
 * A session of the log picks my workouts and my exercises by name in its summary.
 * It picks them as a meal picks my meals and my foods.
 * Its pencil shows below the summary what I did of each, as a meal shows its grams.
 * A value picked shows its rows at once, a new name being a new workout with its search open.
 * A name left out takes its workout or its exercise away.
 * - Workout: Its name with its plus, its exercises indented below it.
 *   A workout picked brings its parts, each with the values of its variant.
 *   A new workout goes into `Workouts.md` with its first exercise.
 * - Exercise: Its row holds its sets, repetitions, kilograms, `×`.
 *   Its repetitions become seconds by the switch after them.
 *   An exercise picked brings the values of its first variant, one without values what I did of it the last time.
 *   The `×` between the fields and the units always show, so an empty row says what to type.
 * Each exercise is written as `X-EXERCISE` with its workout,
 * so the log keeps what I did that day, whatever I change in my workouts later.
 */

import { choiceOf, choicesOf, listOf, rowOf, searchOf } from "./choices.ts";
import { exerciseSend, mineLoad, workoutDelete, workoutSend } from "../sport/mine.ts";
import { exerciseLineOf, newOf, ruleTextOf, typedNameOf } from "../sport/lists.ts";
import { buttonOf, elementOf } from "../food/foods.ts";
import { listHeadOf } from "../food/search.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { crossPut, iconPut, plusPut, searchFieldOf } from "../icons.ts";
import { Pencil } from "lucide";
import "./sport.css";

import type { Choice } from "./choices.ts";
import type { Exercise, Mine, Part, Workout } from "../sport/mine.ts";

/**
 * An exercise of the session as its row holds it, an empty value for none.
 * - `reps`: Its repetitions per set, or its seconds, like `60s`.
 * - `workout`: The workout it belongs to, empty for one picked alone.
 */
type ExerciseDone = Part & {
    workout: string;
};

/** What a session of the log holds. */
export type SessionLines = {
    exercises?: string[];
};

/** Category of a session, `CATEGORIES:Sport`. */
export const sportName: string = "Sport";

/** Everything of mine as sent when the dialog picked `Sport`. */
let mine: Mine | null = null;

/** Names of the workouts of the session, each a block, in the order picked. */
let blocks: string[] = [];

/** Exercises of the session in their order, those of its blocks and those alone. */
let exercises: ExerciseDone[] = [];

/**
 * Lets the dialog know of a change.
 * So it allows saving and shows what is picked.
 */
let changed: () => void = (): void => undefined;

/** Workouts named new in this session. */
let fresh: Set<string> = new Set();

/** The plus of each block, so a new workout opens its list at once. */
let blockPluses: Map<string, HTMLButtonElement> = new Map();

/** The picker of the summary. */
let summaryPicker: HTMLElement = document.createElement("div");

/** The names the picker of the summary shows, so it shows anew only when the exercises change them. */
let summaryNames: string[] = [];

/** The names whose rows show, opened by their pencil. */
let opened: string[] = [];

/** The rows of the names opened, each workout with its exercises, each exercise alone. */
let partsRows: HTMLElement = document.createElement("div");

/** Reads a line `X-EXERCISE` into its row. */
function exerciseOf(line: string): ExerciseDone {
    const [name, sets, reps, kg, workout]: string[] = line.split(";").map((part: string): string => part.trim());
    return {
        name: name ?? "",
        sets: sets ?? "",
        reps: reps ?? "",
        kg: kg ?? "",
        workout: workout ?? "",
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
        : { ...exerciseOf(last), name: name, workout: workout };
}

/** The exercises picked alone, also those of a workout the session no longer holds. */
function aloneOf(): ExerciseDone[] {
    return exercises.filter((exercise: ExerciseDone): boolean => !blocks.includes(exercise.workout));
}

/** The names of the workouts and of the exercises alone, each once, as the summary picks them. */
function namesOf(): string[] {
    return [...new Set([...blocks, ...aloneOf().map((exercise: ExerciseDone): string => exercise.name)])];
}

/** Picks a workout, its block with its parts last, one the session holds already stays as it is. */
function workoutPick(name: string): void {
    const picked: Workout | undefined = mine?.workouts.find((other: Workout): boolean => other.name === name);
    if (picked === undefined || blocks.includes(name)) return;
    blocks = [...blocks, name];
    exercises = [
        ...exercises,
        ...picked.parts.map((part: Part): ExerciseDone => exerciseLastOf(part.name, name, part)),
    ];
    rowsChanged();
}

/** Puts an empty block of a new workout into the session and opens its list at once. */
function workoutNew(name: string): void {
    blocks = [...blocks, name];
    fresh.add(name);
    rowsChanged();
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
        .map(({ name, sets, reps, kg }: ExerciseDone): Part => ({ name: name, sets: sets, reps: reps, kg: kg }));
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
        rowsChanged();
        freshSend(workout);
    }
    partsRows.querySelector<HTMLInputElement>(`[data-part="${exercises.indexOf(added)}"] .sport-sets input`)?.focus();
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
 * Empty, a grey 0 shows where to type.
 * @param saved - Takes the text typed, gives whether it was taken
 */
function inputOf(value: string, words: string, wrong: string, saved: (text: string) => boolean): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.value = value;
    input.placeholder = "0";
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
 * List of the plus of a workout as a menu, a search field, then my exercises with their rule.
 * It ends in `+ New exercise` for a name none has.
 * Enter takes the first exercise found, never a new one.
 * @param parts - Element the list stands in, below the exercises it adds to
 * @returns The plus, which opens it
 */
function exercisePlusOf(parts: HTMLElement, workout: string): HTMLButtonElement {
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
        const own: Exercise[] = (mine?.exercises ?? []).filter((one: Exercise): boolean =>
            matchesAll(one.name, wordsOf(input.value)),
        );
        const known: boolean = (mine?.exercises ?? []).some(
            (one: Exercise): boolean => one.name.toLowerCase() === typed.toLowerCase(),
        );
        const lines: HTMLElement[] = [
            ...own.map((one: Exercise): HTMLElement =>
                exerciseLineOf(
                    one,
                    taken((): void => exerciseAdd(one.name, workout, one)),
                    null,
                ),
            ),
            ...(typed === "" || known
                ? []
                : [
                      newOf(
                          `New exercise “${typed}”`,
                          "New exercise, mine from now on",
                          taken((): void => exerciseNew(typed, workout)),
                      ),
                  ]),
        ];
        results.replaceChildren(
            ...(lines.length > 0
                ? [listHeadOf("Exercises", ""), ...lines]
                : [elementOf("p", "food-none", "Type an exercise")]),
        );
    };
    const close: () => void = listOf(
        parts,
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
    plusPut(plus, `Add an exercise to ${workout}`);
    search.append(searchFieldOf(input, "Search exercises"), results);
    box.append(search);
    parts.append(box);
    return plus;
}

function exerciseRowOf(exercise: ExerciseDone): HTMLElement {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    row.dataset.part = String(exercises.indexOf(exercise));
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
            rowsChanged();
            freshSend(exercise.workout);
        }),
    );
    return row;
}

/**
 * Block of a workout as a meal, its row the name with the plus, then the `×`.
 * Two empty columns stand between them, where an exercise has its values.
 * Its parts indented below it, then the list of its plus.
 */
function blockOf(workout: string): HTMLElement[] {
    const row: HTMLElement = elementOf("div", "meal-row", "");
    const name: HTMLElement = elementOf("span", "meal-name", workout);
    const parts: HTMLElement = elementOf("div", "meal-parts", "");
    const plus: HTMLButtonElement = exercisePlusOf(parts, workout);
    blockPluses.set(workout, plus);
    name.append(plus);
    row.append(
        name,
        elementOf("span", "", ""),
        elementOf("span", "", ""),
        removeOf(`Remove ${workout}`, (): void => {
            blocks = blocks.filter((other: string): boolean => other !== workout);
            exercises = exercises.filter((exercise: ExerciseDone): boolean => exercise.workout !== workout);
            rowsChanged();
        }),
    );
    parts.prepend(
        ...exercises.filter((exercise: ExerciseDone): boolean => exercise.workout === workout).map(exerciseRowOf),
    );
    return [row, parts];
}

/**
 * The pencil after a name of the summary.
 * It shows or hides its rows below the summary, taking no focus, as the pencil of a meal.
 */
function pencilOf(name: string): HTMLElement {
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, `Change ${name}`);
    pencil.addEventListener("mousedown", (event: MouseEvent): void => event.preventDefault());
    pencil.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        opened = opened.includes(name) ? opened.filter((other: string): boolean => other !== name) : [...opened, name];
        rowsShow();
    });
    return pencil;
}

/**
 * The search of the summary, my workouts with their short title in brackets, then my exercises with their rule.
 * An exercise of several variants stands once.
 */
function summarySearchOf(): (text: string) => Promise<Choice[]> {
    const own: Exercise[] = (mine?.exercises ?? []).filter(
        (one: Exercise, index: number, all: Exercise[]): boolean =>
            all.findIndex((other: Exercise): boolean => other.name.toLowerCase() === one.name.toLowerCase()) === index,
    );
    return searchOf([
        ...(mine?.workouts ?? []).map((one: Workout): Choice => ({
            ...choiceOf(one.name),
            group: "Workouts",
            brackets: one.short,
        })),
        ...own.map((one: Exercise): Choice => ({ ...choiceOf(one.name), group: "Exercises", detail: ruleTextOf(one) })),
    ]);
}

/**
 * The picker of the summary.
 * It picks my workouts and my exercises by name.
 * A new name is a new workout.
 */
function summaryPickerOf(): HTMLElement {
    return choicesOf({
        search: summarySearchOf(),
        picked: summaryNames,
        many: true,
        adding: true,
        add: async (text: string): Promise<string | null> => typedNameOf(text) || null,
        newTextOf: (text: string): string | null =>
            typedNameOf(text) === "" ? null : `New workout “${typedNameOf(text)}”`,
        noun: "summary",
        linkOf: (): string => "",
        afterOf: pencilOf,
        below: [partsRows],
        pick: summaryPick,
    });
}

/**
 * Takes the names picked in the summary.
 * A name left out takes its workout with its exercises or its exercise away.
 * A name come is my workout, else my exercise, else a new workout, its rows shown at once.
 */
function summaryPick(names: string[]): void {
    const gone: string[] = summaryNames.filter((name: string): boolean => !names.includes(name));
    const come: string[] = names.filter((name: string): boolean => !summaryNames.includes(name));
    summaryNames = names;
    exercises = exercises.filter(
        (exercise: ExerciseDone): boolean =>
            !gone.includes(blocks.includes(exercise.workout) ? exercise.workout : exercise.name),
    );
    blocks = blocks.filter((workout: string): boolean => !gone.includes(workout));
    opened = [...opened.filter((name: string): boolean => names.includes(name)), ...come];
    if (come.length === 0) rowsChanged();
    come.forEach((name: string): void => {
        const workout: Workout | undefined = mine?.workouts.find(
            (one: Workout): boolean => one.name.toLowerCase() === name.toLowerCase(),
        );
        const exercise: Exercise | undefined = mine?.exercises.find(
            (one: Exercise): boolean => one.name.toLowerCase() === name.toLowerCase(),
        );
        if (workout !== undefined) workoutPick(workout.name);
        else if (exercise !== undefined) exerciseAdd(exercise.name, "", exercise);
        else workoutNew(name);
    });
}

/** Shows the picker of the summary anew only when the exercises changed the names it shows, so a list stays open. */
function summaryShow(): void {
    if (namesOf().join("\n") === summaryNames.join("\n")) return;
    summaryNames = namesOf();
    opened = opened.filter((name: string): boolean => summaryNames.includes(name));
    const picker: HTMLElement = summaryPickerOf();
    summaryPicker.replaceWith(picker);
    summaryPicker = picker;
}

function rowsChanged(): void {
    rowsShow();
    changed();
}

/** Shows the rows of the names opened, in the order of the summary. */
function rowsShow(): void {
    blockPluses = new Map();
    partsRows.replaceChildren(
        ...namesOf()
            .filter((name: string): boolean => opened.includes(name))
            .flatMap((name: string): HTMLElement[] =>
                blocks.includes(name)
                    ? blockOf(name)
                    : aloneOf()
                          .filter((exercise: ExerciseDone): boolean => exercise.name === name)
                          .map(exerciseRowOf),
            ),
    );
    summaryShow();
}

/**
 * The summary of a session as it writes itself, as a meal from its foods,
 * its workouts that hold an exercise, then the exercises picked alone, parted by `, `.
 * Empty without exercises, then an old entry keeps the summary it had.
 */
export function sportTitle(): string {
    return [
        ...blocks.filter((workout: string): boolean =>
            exercises.some((exercise: ExerciseDone): boolean => exercise.workout === workout),
        ),
        ...aloneOf().map((exercise: ExerciseDone): string => exercise.name),
    ].join(", ");
}

/**
 * The rows of a session with everything of mine, its summary, a block for each workout in the order its parts name it.
 * @param lines - What the entry holds, `null` for a new one or one of another category
 * @param change - Lets the dialog know of a change
 * @throws {Error} - When the reader cannot answer
 */
export async function sportOf(lines: SessionLines | null, change: () => void): Promise<HTMLElement[]> {
    mine = await mineLoad();
    changed = change;
    fresh = new Set();
    exercises = (lines?.exercises ?? []).map(exerciseOf);
    blocks = [
        ...new Set(
            exercises
                .map((exercise: ExerciseDone): string => exercise.workout)
                .filter((workout: string): boolean => workout !== ""),
        ),
    ];
    opened = [];
    partsRows = elementOf("div", "meal-rows sport-parts", "");
    summaryNames = namesOf();
    summaryPicker = summaryPickerOf();
    rowsShow();
    return [rowOf("Summary", summaryPicker)];
}

/** What the session holds, each exercise with its workout. */
export function sportRead(): { exercises: string[] } {
    return {
        exercises: exercises.map((exercise: ExerciseDone): string =>
            [exercise.name, exercise.sets, exercise.reps, exercise.kg, exercise.workout].join(";"),
        ),
    };
}
