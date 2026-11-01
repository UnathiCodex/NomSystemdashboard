/**
 * ## Lists of the sport area
 *
 * My workouts and my exercises beside the day of the sport view, built as my meals and foods.
 * Each line has the small grey `×` at its end, whose first click only asks.
 * Every change sends back all of mine, so an exercise added to a workout stands among my exercises.
 * - Workouts: Each with its parts grey in brackets, opening below as a meal.
 *   The plus after its name opens the search of my exercises.
 *   A new workout is kept in `Workouts.md` with its first part.
 * - Exercises: Each with the workouts that hold it and its rule, which an entry brings every time.
 *   One name may stand several times, each a variant with values of its own.
 *   Its `×` removes it from my workouts too.
 * Both load anew on every change of the files, not while the cursor stands in them, so nothing typed is lost.
 */

import { exerciseChangeSend, exerciseDelete, exerciseSend, mineLoad, workoutDelete, workoutSend } from "./mine.ts";
import { bracketsWatch, buttonOf, elementOf, headingOf, plusOf } from "../food/foods.ts";
import { editButtonsOf, editFieldOf, inlineFieldOf, listLineOf } from "../food/search.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { changesFollow } from "../changes.ts";
import { crossPut, iconOf, iconPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Pencil, Plus } from "lucide";

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

/** Name of a line with grey brackets after it, both whole as its tooltip. */
export function lineNameOf(text: string, brackets: string): HTMLElement {
    const name: HTMLElement = elementOf("span", "sport-name", "");
    name.title = brackets === "" ? text : `${text} (${brackets})`;
    name.append(elementOf("span", "", text));
    if (brackets !== "") name.append(elementOf("span", "food-brand", ` (${brackets})`));
    return name;
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

/** The rule of an exercise as its line shows it, empty while nothing is set. */
export function ruleTextOf(exercise: { sets: string; reps: string; kg: string }): string {
    const reps: string = exercise.reps.replace(/^(\d+)s$/, "$1 s");
    const sets: string =
        exercise.sets === "" ? reps : reps === "" ? `${exercise.sets} ×` : `${exercise.sets} × ${reps}`;
    return [sets, exercise.kg === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
}

/** Form inside a list as a food opened, a click on a name putting the cursor into its field. */
function formOf(rows: [string, HTMLElement][], cancelled: () => void, saved: () => void): HTMLElement {
    const form: HTMLElement = elementOf("div", "food-form food-detail", "");
    const facts: HTMLElement = elementOf("div", "food-facts", "");
    rows.forEach(([name, field]: [string, HTMLElement]): void => {
        const label: HTMLElement = elementOf("span", "food-fact", name);
        label.addEventListener("click", (): void =>
            (field instanceof HTMLInputElement ? field : field.querySelector("input"))?.focus(),
        );
        if (field instanceof HTMLInputElement) {
            field.className = "food-inline food-inline-new";
            field.placeholder = "";
        }
        facts.append(label, field);
    });
    form.append(facts, editButtonsOf(cancelled, saved));
    return form;
}

/**
 * Section of my workouts.
 * - `open`, `adding`, `asked`: Names in small letters, empty for none.
 * - `fresh`: Name of a new workout not yet written, as it has no part yet.
 * - `focusing`: Whether the part search takes the cursor when it shows next, never when another list shows anew.
 * - `send`: Sends a workout, a workout renamed staying open under its name as the reader cleans it.
 */
function workoutsSectionOf(): HTMLElement {
    const section: HTMLElement = elementOf("section", "food-dishes", "");
    const search: HTMLInputElement = document.createElement("input");
    const list: HTMLElement = elementOf("div", "dish-list", "");
    let open: string = "";
    let adding: string = "";
    let asked: string = "";
    let fresh: string = "";
    let naming: boolean = false;
    let focusing: boolean = false;

    const send: (workout: Workout, parts: Part[], name?: string) => void = (
        workout: Workout,
        parts: Part[],
        name?: string,
    ): void => {
        workoutSend(name ?? workout.name, parts, name === undefined ? undefined : workout.name)
            .then((sent: Mine): void => {
                if (workout.name === fresh) fresh = "";
                if (name !== undefined) open = typedNameOf(name).toLowerCase();
                mineShow(sent);
            })
            .catch(failed);
    };
    const begin: (name: string) => void = (name: string): void => {
        fresh = typedNameOf(name);
        if (fresh === "") return;
        naming = false;
        open = fresh.toLowerCase();
        adding = open;
        focusing = true;
        search.value = "";
        show();
    };
    const toggle: (key: string) => void = (key: string): void => {
        open = open === key ? "" : key;
        adding = "";
        show();
    };
    const show: () => void = (): void => {
        if (mine.workouts.some((workout: Workout): boolean => workout.name.toLowerCase() === fresh.toLowerCase()))
            fresh = "";
        const shown: Workout[] = [
            ...(fresh === "" ? [] : [{ name: fresh, parts: [] }]),
            ...mine.workouts.filter((workout: Workout): boolean =>
                matchesAll(
                    [workout.name, ...workout.parts.map((part: Part): string => part.name)].join(" "),
                    wordsOf(search.value),
                ),
            ),
        ];
        const rows: HTMLElement[] = shown.flatMap((workout: Workout): HTMLElement[] => workoutLinesOf(workout));
        const typed: string = typedNameOf(search.value);
        const plus: HTMLElement[] =
            typed === "" ||
            mine.workouts.some((workout: Workout): boolean => workout.name.toLowerCase() === typed.toLowerCase())
                ? []
                : [newOf(`New workout “${typed}”`, "New workout, its parts picked next", (): void => begin(typed))];
        list.replaceChildren(...(naming ? [nameFormOf()] : []), ...rows, ...plus);
    };
    const workoutLinesOf: (workout: Workout) => HTMLElement[] = (workout: Workout): HTMLElement[] => {
        const key: string = workout.name.toLowerCase();
        const name: HTMLElement = lineNameOf(
            workout.name,
            workout.parts.map((part: Part): string => part.name).join(", "),
        );
        const remove: HTMLButtonElement = removeOf(`Remove ${workout.name}`, asked === key, (): void => {
            if (workout.parts.length === 0) {
                fresh = "";
                show();
            } else if (asked !== key) {
                asked = key;
                show();
            } else {
                asked = "";
                workoutDelete(workout.name).then(mineShow).catch(failed);
            }
        });
        const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
            name,
            null,
            open === key ? null : (): void => toggle(key),
            remove,
        );
        row.setAttribute("aria-expanded", String(open === key));
        if (open !== key) return [line];

        const pencil: HTMLButtonElement = buttonOf("plus-quiet", "", (): void => {
            rename.focus();
            rename.select();
        });
        iconPut(pencil, Pencil, `Rename ${workout.name}`);
        name.replaceChildren(
            elementOf("span", "", workout.name),
            pencil,
            plusOf(`Add an exercise to ${workout.name}`, (): void => {
                adding = adding === key ? "" : key;
                focusing = true;
                show();
            }),
        );
        row.addEventListener("click", (event: MouseEvent): void => {
            if ((event.target as HTMLElement).closest("button") === null) toggle(key);
        });
        const detail: HTMLElement = elementOf("div", "food-detail", "");
        const facts: HTMLElement = elementOf("div", "food-facts", "");
        const parts: HTMLElement = elementOf("div", "dish-foods", "");
        const rename: HTMLInputElement = inlineFieldOf(workout.name, "Name", (): void => {
            if (workout.parts.length === 0) begin(rename.value);
            else send(workout, workout.parts, rename.value);
        });
        facts.append(elementOf("span", "food-fact", "Name"), rename, elementOf("span", "food-fact", "Parts"), parts);
        detail.append(facts);
        parts.append(
            ...workout.parts.map((part: Part, index: number): HTMLElement => {
                const line: HTMLElement = elementOf("div", "food-part", "");
                line.append(lineNameOf(part.name, ""), elementOf("span", "food-value sport-grey", ruleTextOf(part)));
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
        if (adding === key) {
            const added: HTMLElement = partSearchOf(workout, (part: Part): void => {
                focusing = true;
                send(workout, [...workout.parts, part]);
            });
            parts.append(added);
            if (focusing) queueMicrotask((): void => added.querySelector("input")?.focus());
            focusing = false;
        }
        return [line, detail];
    };
    const nameFormOf: () => HTMLElement = (): HTMLElement => {
        const close: () => void = (): void => {
            naming = false;
            show();
        };
        const name: HTMLInputElement = editFieldOf("", "Name", (): void => begin(name.value), close);
        queueMicrotask((): void => name.focus());
        return formOf([["Name", name]], close, (): void => begin(name.value));
    };

    search.addEventListener("input", show);
    section.append(
        headingOf(
            "Workouts",
            plusOf("New workout", (): void => {
                naming = !naming;
                show();
            }),
            "",
        ),
        searchFieldOf(search, "Search workouts"),
        list,
    );
    bracketsWatch(list);
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
 * Search of my exercises below a workout opened, without those it holds.
 * Last `+ New exercise` for a name no exercise has, a click or Enter on the first adds one.
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
        (results.querySelector("button") as HTMLButtonElement | null)?.click();
    });
    search.append(searchFieldOf(input, "Search exercises"), results);
    show();
    return search;
}

/**
 * Section of my exercises.
 * - `asked`, `open`: Keys of variants, empty for none.
 * - `ruleOf`: The rule of an exercise opened, each value changing in place and written at once.
 */
function exercisesSectionOf(): HTMLElement {
    const section: HTMLElement = elementOf("section", "food-dishes", "");
    const search: HTMLInputElement = document.createElement("input");
    const list: HTMLElement = elementOf("div", "dish-list sport-exercises", "");
    let asked: string = "";
    let naming: boolean = false;
    let open: string = "";

    const add: (name: string) => void = (name: string): void => {
        const typed: string = typedNameOf(name);
        if (typed === "") return;
        exerciseSend(typed)
            .then((sent: Mine): void => {
                naming = false;
                search.value = "";
                open = variantKeyOf({ name: typed, sets: "", reps: "", kg: "" });
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
                          add(typed),
                      ),
                  ];
        const rows: HTMLElement[] = shown.flatMap((exercise: Exercise): HTMLElement[] => {
            const key: string = variantKeyOf(exercise);
            const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
                lineNameOf(exercise.name, exercise.workouts.join(", ")),
                null,
                (): void => {
                    open = open === key ? "" : key;
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
            row.setAttribute("aria-expanded", String(open === key));
            return open === key ? [line, ruleOf(exercise)] : [line];
        });
        list.replaceChildren(...(naming ? [nameFormOf()] : []), ...rows, ...plus);
    };
    const nameFormOf: () => HTMLElement = (): HTMLElement => {
        const close: () => void = (): void => {
            naming = false;
            show();
        };
        const name: HTMLInputElement = editFieldOf("", "Name", (): void => add(name.value), close);
        queueMicrotask((): void => name.focus());
        return formOf([["Name", name]], close, (): void => add(name.value));
    };
    const ruleOf: (exercise: Exercise) => HTMLElement = (exercise: Exercise): HTMLElement => {
        const detail: HTMLElement = elementOf("div", "food-detail", "");
        const facts: HTMLElement = elementOf("div", "food-facts", "");
        const send: (changes: Partial<Exercise>) => void = (changes: Partial<Exercise>): void => {
            const values: { sets: string; reps: string; kg: string } = {
                sets: changes.sets ?? exercise.sets,
                reps: changes.reps ?? exercise.reps,
                kg: changes.kg ?? exercise.kg,
            };
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
        facts.append(
            elementOf("span", "food-fact", "Sets"),
            sets,
            elementOf("span", "food-fact", "Reps"),
            reps,
            elementOf("span", "food-fact", "Weight"),
            numberFieldOf(
                exercise.kg === "" ? null : Number(exercise.kg),
                "kg",
                "Kilograms",
                (kg: number | null): void => send({ kg: kg === null ? "" : String(kg) }),
            ),
        );
        detail.append(facts);
        return detail;
    };

    search.addEventListener("input", show);
    section.append(
        headingOf(
            "Exercises",
            plusOf("New exercise", (): void => {
                naming = !naming;
                show();
            }),
            "",
        ),
        searchFieldOf(search, "Search exercises"),
        list,
    );
    bracketsWatch(list);
    shows.push(show);
    return section;
}

/** Loads everything of mine anew and shows it, like after my weight changed. */
export function mineReload(): void {
    mineLoad().then(mineShow).catch(failed);
}

/** The two sections of the lists with everything of mine loaded into them. */
export function listsOf(): HTMLElement[] {
    const sections: HTMLElement[] = [workoutsSectionOf(), exercisesSectionOf()];
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
