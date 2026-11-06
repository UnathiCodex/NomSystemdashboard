/**
 * ## Lists of the sport area
 *
 * My workouts and my exercises beside the day of the sport view, built as my meals and foods.
 * Each line has the small grey `×` at its end, whose first click only asks.
 * A click on a line opens it in its panel, as a meal opens.
 * Every change sends back all of mine, so an exercise added to a workout stands among my exercises.
 * - Workouts: Each with its short title grey in brackets, as a meal.
 *   Its panel holds its name, its short title, its parts with the search of my exercises below them.
 *   The name of a part opens its exercise, as a food of a meal opens.
 *   A new workout is kept in `Workouts.md` with its first part.
 * - Exercises: Each with its rule, which an entry brings every time, as a food without the meals that hold it.
 *   One name may stand several times, each a variant with values of its own.
 *   Its `×` removes it from my workouts too.
 * Both load anew on every change of the files, not while the cursor stands in them, so nothing typed is lost.
 */

import { exerciseChangeSend, exerciseDelete, exerciseSend, mineLoad, workoutDelete, workoutSend } from "./mine.ts";
import { buttonOf, elementOf, headingOf, lineNameOf, partLinkOf, plusOf } from "../food/foods.ts";
import { inlineFieldOf, listLineOf } from "../food/search.ts";
import { panelClose, panelOf, panelSearchOpen, panelShow } from "../food/panel.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { changesFollow } from "../changes.ts";
import { crossPut, iconOf, iconPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Plus } from "lucide";

import type { Panel, PanelRow } from "../food/panel.ts";
import type { Exercise, Mine, Part, Workout } from "./mine.ts";

/** Everything of mine as the reader last sent it. */
let mine: Mine = {
    workouts: [],
    exercises: [],
    last: {},
};

/** Shows of the sections, each showing its list anew from {@link mine}. */
const shows: (() => void)[] = [];

/** Takes everything of mine and shows every section anew. */
function mineShow(sent: Mine): void {
    mine = sent;
    shows.forEach((show: () => void): void => show());
}

/** Logs what the reader did not take, the list staying as it was. */
function failed(error: unknown): void {
    console.error(error);
}

/** The `×` of a list, a question mark while it asks. */
function removeOf(words: string, asking: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    crossPut(button, words);
    if (asking) iconPut(button, QuestionMark, "Really remove?");
    return button;
}

/** Cleans a name typed for a workout or an exercise as the reader cleans it, a link no name. */
export function typedNameOf(typed: string): string {
    return /^\s*https?:\/\//i.test(typed) ? "" : typed.replace(/[|;,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Number changed in place, its unit after it, saved on Enter or leaving it.
 * Empty, a grey 0 keeps its room, so I see where to type.
 * A text that is no number of 0 or more shows the number again.
 * - `text`: The text typed, a decimal comma as a point.
 */
function numberFieldOf(
    number: number | null,
    unit: string,
    words: string,
    saved: (typed: number | null) => void,
): HTMLElement {
    const value: HTMLElement = elementOf("span", "food-grams", "");
    const input: HTMLInputElement = inlineFieldOf(number === null ? "" : String(number), words, (): void => {
        const text: string = input.value.trim().replace(",", ".");
        if (text !== "" && !(Number(text) >= 0)) {
            input.value = number === null ? "" : String(number);
            return;
        }
        saved(text === "" ? null : Number(text));
    });
    input.inputMode = "decimal";
    input.placeholder = "0";
    input.classList.add("food-inline-grams");
    value.append(input, unit);
    value.addEventListener("click", (): void => input.focus());
    return value;
}

/** Whole number changed in place, saved on Enter or leaving it, else shown again. */
function wholeFieldOf(value: string, words: string, saved: (typed: string) => void): HTMLInputElement {
    const input: HTMLInputElement = inlineFieldOf(value, words, (): void => {
        const typed: string = input.value.trim();
        if (!/^\d*$/.test(typed)) {
            input.value = value;
            return;
        }
        saved(typed);
    });
    input.inputMode = "numeric";
    input.placeholder = "0";
    input.classList.add("food-inline-grams", "sport-whole");
    return input;
}

/** Key of a variant of an exercise, its name in small letters and its values, as the reader keys it. */
function variantKeyOf(exercise: Part): string {
    return [exercise.name.toLowerCase(), exercise.sets, exercise.reps, exercise.kg].join(";");
}

/** A count with its word, plural but for 1. */
function countOf(count: string, word: string): string {
    return `${count} ${word}${count === "1" ? "" : "s"}`;
}

/**
 * The rule of an exercise as its line shows it, like `3 Sets (10 Reps): 20 kg`, empty while nothing is set.
 * Seconds like `60 s` in place of the repetitions, without sets the repetitions alone.
 */
export function ruleTextOf(exercise: { sets: string; reps: string; kg: string }): string {
    const reps: string =
        exercise.reps === ""
            ? ""
            : exercise.reps.endsWith("s")
              ? `${exercise.reps.slice(0, -1)} s`
              : countOf(exercise.reps, "Rep");
    const sets: string = exercise.sets === "" ? "" : countOf(exercise.sets, "Set");
    const both: string = sets === "" ? reps : reps === "" ? sets : `${sets} (${reps})`;
    return [both, exercise.kg === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(": ");
}

/**
 * Section of my workouts.
 * The plus of the heading opens the panel of a new workout, its name typed first, then its parts.
 * - `open`: Name of the workout in the panel in small letters, empty for none.
 * - `asked`: Name of the workout asking in small letters, empty for none.
 * - `fresh`: Name of a new workout not yet written, as it has no part yet, dropped when its panel closes.
 *   Empty while its name is not typed yet, `null` for none.
 * - `send`: Sends a workout, a workout renamed staying open under its name as the reader cleans it.
 *
 * @param exerciseOpen - Opens an exercise of the workout in its panel over that of the workout
 */
function workoutsSectionOf(exerciseOpen: (part: Part) => void): HTMLElement {
    const section: HTMLElement = elementOf("section", "food-dishes", "");
    const search: HTMLInputElement = document.createElement("input");
    const list: HTMLElement = elementOf("div", "dish-list", "");
    let open: string = "";
    let asked: string = "";
    let fresh: string | null = null;
    const panel: Panel = panelOf(section, (): void => {
        open = "";
        if (fresh === null) return;
        fresh = null;
        show();
    });

    const send: (workout: Workout, parts: Part[], name?: string, short?: string) => void = (
        workout: Workout,
        parts: Part[],
        name?: string,
        short?: string,
    ): void => {
        workoutSend(name ?? workout.name, parts, name === undefined ? undefined : workout.name, short)
            .then((sent: Mine): void => {
                if (workout.name === fresh) fresh = null;
                if (name !== undefined) open = typedNameOf(name).toLowerCase();
                mineShow(sent);
            })
            .catch(failed);
    };
    const begin: (name: string) => void = (name: string): void => {
        if (typedNameOf(name) === "") return;
        fresh = typedNameOf(name);
        open = fresh.toLowerCase();
        search.value = "";
        show();
        panelSearchOpen(panel);
    };
    const show: () => void = (): void => {
        const name: string = fresh ?? "";
        if (mine.workouts.some((workout: Workout): boolean => workout.name.toLowerCase() === name.toLowerCase()))
            fresh = null;
        const blank: Workout = { name: fresh ?? "", short: "", parts: [] };
        const shown: Workout[] = [
            ...(blank.name === "" ? [] : [blank]),
            ...mine.workouts.filter((workout: Workout): boolean =>
                matchesAll(
                    [workout.name, ...workout.parts.map((part: Part): string => part.name)].join(" "),
                    wordsOf(search.value),
                ),
            ),
        ];
        const rows: HTMLElement[] = shown.map((workout: Workout): HTMLElement => workoutLineOf(workout));
        const typed: string = typedNameOf(search.value);
        const plus: HTMLElement[] =
            typed === "" ||
            mine.workouts.some((workout: Workout): boolean => workout.name.toLowerCase() === typed.toLowerCase())
                ? []
                : [newOf(`New workout “${typed}”`, "New workout, its parts picked next", (): void => begin(typed))];
        list.replaceChildren(...rows, ...plus);
        const opened: Workout | undefined = [...(fresh === null ? [] : [blank]), ...mine.workouts].find(
            (workout: Workout): boolean => workout.name.toLowerCase() === open,
        );
        if (opened === undefined) panelClose(panel);
        else panelFill(opened);
    };
    const workoutLineOf: (workout: Workout) => HTMLElement = (workout: Workout): HTMLElement => {
        const key: string = workout.name.toLowerCase();
        const remove: HTMLButtonElement = removeOf(`Remove ${workout.name}`, asked === key, (): void => {
            if (workout.parts.length === 0) {
                fresh = null;
                show();
            } else if (asked !== key) {
                asked = key;
                show();
            } else {
                asked = "";
                workoutDelete(workout.name).then(mineShow).catch(failed);
            }
        });
        return listLineOf(
            lineNameOf(workout.name, workout.short),
            null,
            (): void => {
                open = key;
                show();
            },
            remove,
        )[0];
    };
    const panelFill: (workout: Workout) => void = (workout: Workout): void => {
        const parts: HTMLElement = elementOf("div", "dish-foods", "");
        const rename: HTMLInputElement = inlineFieldOf(workout.name, "Name", (): void => {
            if (workout.parts.length === 0) begin(rename.value);
            else send(workout, workout.parts, rename.value);
        });
        const short: HTMLInputElement = inlineFieldOf(workout.short, "Short", (): void =>
            send(workout, workout.parts, undefined, short.value),
        );
        parts.append(
            ...workout.parts.map((part: Part, index: number): HTMLElement => {
                const line: HTMLElement = elementOf("div", "food-part", "");
                line.append(
                    partLinkOf(part.name, lineNameOf(part.name, ""), (): void => exerciseOpen(part)),
                    elementOf("span", "food-value sport-grey", ruleTextOf(part)),
                );
                if (workout.parts.length > 1)
                    line.append(
                        removeOf(`Remove ${part.name}`, false, (): void =>
                            send(
                                workout,
                                workout.parts.filter((_: Part, at: number): boolean => at !== index),
                            ),
                        ),
                    );
                return line;
            }),
        );
        panelShow(
            panel,
            [
                ["Name", rename],
                ...(workout.parts.length === 0 ? [] : [["Short", short] as PanelRow]),
                ...(workout.name === ""
                    ? []
                    : [
                          [
                              "Parts",
                              parts,
                              partSearchOf(workout, (part: Part): void => send(workout, [...workout.parts, part])),
                          ] as PanelRow,
                      ]),
            ],
            [],
        );
        if (workout.name === "") rename.focus();
    };

    search.addEventListener("input", show);
    section.append(
        headingOf(
            "Workouts",
            plusOf("New workout", (): void => {
                fresh = "";
                open = "";
                show();
            }),
            "",
        ),
        searchFieldOf(search, "Search workouts"),
        list,
    );
    shows.push(show);
    return section;
}

/** Row `+ New …` at the end of a list, which adds what was typed. */
export function newOf(text: string, words: string, click: () => void): HTMLElement {
    const button: HTMLButtonElement = buttonOf("picker-new", "", click);
    button.replaceChildren(iconOf(Plus), text);
    button.title = words;
    return button;
}

/**
 * Search of my exercises in the panel of a workout, without those it holds.
 * Last `+ New exercise` for a name no exercise has.
 * Enter takes the first exercise found, never a new one, as the food search does.
 */
function partSearchOf(workout: Workout, pick: (part: Part) => void): HTMLElement {
    const search: HTMLElement = elementOf("div", "food-search", "");
    const input: HTMLInputElement = document.createElement("input");
    const results: HTMLElement = elementOf("div", "food-results", "");
    const held: (part: Part) => boolean = (part: Part): boolean =>
        workout.parts.some((other: Part): boolean => variantKeyOf(other) === variantKeyOf(part));
    const lineOf: (exercise: Exercise) => HTMLElement = (exercise: Exercise): HTMLElement =>
        listLineOf(
            lineNameOf(exercise.name, ruleTextOf(exercise)),
            null,
            (): void => pick({ name: exercise.name, sets: exercise.sets, reps: exercise.reps, kg: exercise.kg }),
            null,
        )[0];
    const show: () => void = (): void => {
        const typed: string = typedNameOf(input.value);
        const lines: HTMLElement[] = mine.exercises
            .filter((exercise: Exercise): boolean => !held(exercise) && matchesAll(exercise.name, wordsOf(input.value)))
            .map(lineOf);
        const plus: HTMLElement[] =
            typed === "" ||
            mine.exercises.some((exercise: Exercise): boolean => exercise.name.toLowerCase() === typed.toLowerCase())
                ? []
                : [
                      newOf(`New exercise “${typed}”`, "New exercise of this workout", (): void =>
                          pick({ name: typed, sets: "", reps: "", kg: "" }),
                      ),
                  ];
        results.replaceChildren(
            ...lines,
            ...plus,
            ...(lines.length === 0 && plus.length === 0 ? [elementOf("p", "food-none", "Type an exercise")] : []),
        );
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        results.querySelector<HTMLButtonElement>(".food-item > button.food-row")?.click();
    });
    search.append(searchFieldOf(input, "Search exercises"), results);
    show();
    return search;
}

/**
 * Section of my exercises.
 * The plus of the heading opens the panel of a new exercise, written once its name is typed.
 * - `asked`: Key of the variant asking, empty for none.
 * - `open`: Key of the variant in the panel, empty for none.
 * - `fresh`: The new exercise in the panel, its values kept until its name is typed, `null` for none.
 * - `add`: Writes an exercise with the values it has, then shows it in the panel.
 * - `panelFill`: Shows the rule of the exercise in the panel, each value written at once as it changes.
 * Gives also how to open an exercise, as a click on it in a workout asks, its name put into the search.
 */
function exercisesSectionOf(): [HTMLElement, (part: Part) => void] {
    const section: HTMLElement = elementOf("section", "food-dishes", "");
    const search: HTMLInputElement = document.createElement("input");
    const list: HTMLElement = elementOf("div", "dish-list sport-exercises", "");
    const none: Part = { name: "", sets: "", reps: "", kg: "" };
    let asked: string = "";
    let open: string = "";
    let fresh: Part | null = null;
    const panel: Panel = panelOf(section, (): void => {
        open = "";
        fresh = null;
    });

    const add: (name: string, values: Part) => void = (name: string, values: Part): void => {
        const typed: string = typedNameOf(name);
        if (typed === "") return;
        const exercise: Part = { ...values, name: typed };
        // Typed in the panel of a new one, it opens only while that panel is still open, not after its check.
        const typedInPanel: boolean = fresh !== null;
        exerciseSend(typed)
            .then((sent: Mine): Promise<Mine> =>
                variantKeyOf(exercise) === variantKeyOf({ ...none, name: typed })
                    ? Promise.resolve(sent)
                    : exerciseChangeSend({ ...none, name: typed }, exercise),
            )
            .then((sent: Mine): void => {
                if (!typedInPanel || fresh !== null) open = variantKeyOf(exercise);
                fresh = null;
                search.value = "";
                mineShow(sent);
            })
            .catch(failed);
    };
    const show: () => void = (): void => {
        const shown: Exercise[] = mine.exercises.filter((exercise: Exercise): boolean =>
            matchesAll(exercise.name, wordsOf(search.value)),
        );
        const typed: string = typedNameOf(search.value);
        const empty: boolean = mine.exercises.some(
            (exercise: Exercise): boolean =>
                variantKeyOf(exercise) === variantKeyOf({ name: typed, sets: "", reps: "", kg: "" }),
        );
        const plus: HTMLElement[] =
            typed === "" || empty
                ? []
                : [
                      newOf(`New exercise “${typed}”`, "New exercise, empty, beside those of the same name", (): void =>
                          add(typed, none),
                      ),
                  ];
        const rows: HTMLElement[] = shown.map((exercise: Exercise): HTMLElement => {
            const key: string = variantKeyOf(exercise);
            const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
                lineNameOf(exercise.name, ""),
                null,
                (): void => {
                    open = key;
                    show();
                },
                removeOf(`Remove ${exercise.name}`, asked === key, (): void => {
                    if (asked !== key) {
                        asked = key;
                        show();
                        return;
                    }
                    asked = "";
                    exerciseDelete(exercise).then(mineShow).catch(failed);
                }),
            );
            row.querySelector(".food-value")?.replaceChildren(ruleTextOf(exercise));
            return line;
        });
        list.replaceChildren(...rows, ...plus);
        const opened: Exercise | undefined =
            fresh ?? mine.exercises.find((exercise: Exercise): boolean => variantKeyOf(exercise) === open);
        if (opened === undefined) panelClose(panel);
        else panelFill(opened);
    };
    const panelFill: (exercise: Exercise) => void = (exercise: Exercise): void => {
        const name: HTMLInputElement = inlineFieldOf("", "Name", (): void => add(name.value, exercise));
        const send: (changes: Partial<Exercise>) => void = (changes: Partial<Exercise>): void => {
            const values: { sets: string; reps: string; kg: string } = {
                sets: changes.sets ?? exercise.sets,
                reps: changes.reps ?? exercise.reps,
                kg: changes.kg ?? exercise.kg,
            };
            if (fresh !== null) {
                fresh = { ...fresh, ...values };
                show();
                return;
            }
            exerciseChangeSend(exercise, values)
                .then((sent: Mine): void => {
                    open = variantKeyOf({ name: exercise.name, ...values });
                    mineShow(sent);
                })
                .catch(failed);
        };
        let seconds: boolean = exercise.reps.endsWith("s");
        const reps: HTMLElement = elementOf("span", "food-grams", "");
        const unit: HTMLButtonElement = buttonOf("sport-kind", seconds ? "s" : "reps", (): void => {
            seconds = !seconds;
            const number: string = exercise.reps.replace(/s$/, "");
            send({ reps: number === "" ? "" : `${number}${seconds ? "s" : ""}` });
        });
        unit.setAttribute("aria-pressed", "true");
        unit.title = seconds
            ? "Seconds per set; a click makes them repetitions"
            : "Repetitions per set; a click makes them seconds";
        reps.append(
            wholeFieldOf(exercise.reps.replace(/s$/, ""), "Repetitions", (typed: string): void =>
                send({ reps: typed === "" ? "" : `${typed}${seconds ? "s" : ""}` }),
            ),
            unit,
        );
        const sets: HTMLElement = elementOf("span", "food-grams", "");
        sets.append(wholeFieldOf(exercise.sets, "Sets", (typed: string): void => send({ sets: typed })));
        panelShow(
            panel,
            [
                fresh === null ? ["Exercise", lineNameOf(exercise.name, "")] : ["Name", name],
                ["Sets", sets],
                ["Reps", reps],
                [
                    "Weight",
                    numberFieldOf(
                        exercise.kg === "" ? null : Number(exercise.kg),
                        "kg",
                        "Kilograms",
                        (kg: number | null): void => send({ kg: kg === null ? "" : String(kg) }),
                    ),
                ],
            ],
            [],
        );
        // The name of an exercise written is no field, so its row shows no frame under the pointer.
        if (fresh === null) panel.form.firstElementChild?.classList.add("panel-fixed");
        else if (!panel.form.contains(document.activeElement)) name.focus();
    };

    search.addEventListener("input", show);
    section.append(
        headingOf(
            "Exercises",
            plusOf("New exercise", (): void => {
                fresh = none;
                show();
            }),
            "",
        ),
        searchFieldOf(search, "Search exercises"),
        list,
    );
    shows.push(show);
    return [
        section,
        (part: Part): void => {
            search.value = part.name;
            open = variantKeyOf(part);
            show();
        },
    ];
}

/** Loads everything of mine anew and shows it, like after my weight changed. */
export function mineReload(): void {
    mineLoad().then(mineShow).catch(failed);
}

/** The two sections of the lists with everything of mine loaded into them. */
export function listsOf(): HTMLElement[] {
    const [exercises, exerciseOpen]: [HTMLElement, (part: Part) => void] = exercisesSectionOf();
    const sections: HTMLElement[] = [workoutsSectionOf(exerciseOpen), exercises];
    shows.forEach((show: () => void): void => show());
    mineLoad()
        .then(mineShow)
        .catch((error: unknown): void => {
            console.error(error);
            sections.forEach((section: HTMLElement): void =>
                section.querySelector(".dish-list")?.replaceChildren(elementOf("p", "food-none", "Cannot be read")),
            );
        });
    changesFollow((): void => {
        if (!sections.some((section: HTMLElement): boolean => section.contains(document.activeElement))) mineReload();
    });
    return sections;
}
