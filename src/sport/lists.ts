/**
 * ## Lists of the sport area
 *
 * My workouts and my exercises beside the day of the sport view, in this order, each section
 * built as my meals and foods in the food view, in their look, see `../food/meals.ts`:
 * its name, the small grey plus after it where it adds one,
 * a search field where the list may grow long,
 * then a small grey head and one flat line per workout or exercise, the small grey `×` at its end,
 * whose first click only asks,
 * the cross turning into the plain question mark, `Really remove?` as its tooltip.
 * Both come from one load of everything of mine, see `mineLoad` in `mine.ts`,
 * and every change sends back all of it,
 * so an exercise added to a workout stands among my exercises.
 * - Workouts: each its name with its parts grey in brackets on one line,
 *   cut with … where they have no room, whole as its tooltip, and what its videos burn,
 *   when all its parts are videos with minutes;
 *   a click opens it below, as a meal of the food view: its name,
 *   which changes in place, a click into it or on the small grey pencil after its name on top,
 *   and its parts in their order, each with its `×` while it has more than one,
 *   a video with its channel and its minutes,
 *   a click on it showing its minutes and its kind below it to change;
 *   the plus right after its name opens the search of my exercises and videos below its parts,
 *   see {@link partSearchOf},
 *   which adds the one picked, `+ New exercise “Squat”` for a name typed that no exercise has,
 *   and a new video by its YouTube link pasted into it, the one place where a video comes in.
 *   The plus beside `Workouts`
 *   opens a field of a name, and a name typed
 *   in the search that no workout has offers `+ New workout “Legs”` last:
 *   either opens the new workout with its search, and its first part keeps it in `Workouts.md`.
 * - Exercises: mine, each with the workouts that hold it grey in brackets and what I do of it
 *   as a rule at the right, like `3 × 10 · 40 kg`;
 *   a click opens it below, its sets, its repetitions with their unit, `reps` or `s`, a switch,
 *   and its kilograms changing in place, which an entry brings every time, see `../day/sport.ts`,
 *   and the workouts that hold it too;
 *   one name may stand several times, each a variant with values of its own,
 *   like `Dips 3 × 10` and `Dips 4 × 8 · 10 kg`,
 *   and `+ New exercise “Dips”` adds one more, empty, opened to fill in;
 *   a search finds the basic ones of a gym
 *   below them, see `basicExercises` in `reader/sport.ts`, as the food search finds products,
 *   and a click makes one mine; the plus beside `Exercises` opens a field of a name,
 *   and a name typed in the search that no exercise has offers `+ New exercise “Squat”` last:
 *   either adds it to `Exercises.md` by itself; its `×` removes it from my workouts too.
 * My videos have no list of their own: they live in my workouts.
 * My weight, which the kcal need, I change in the totals of the day, see `sport.ts`,
 * and the lists load anew after, see {@link mineReload},
 * since the kcal of my workouts count with it.
 * Both load anew the moment a file of my new system changes, whoever changed it,
 * like a workout changed on my phone, see `../changes.ts`, as my meals in the food view,
 * but not while the cursor stands in them, so nothing typed there is lost.
 *
 * - `./mine.ts`: Loads, sends and removes my workouts and exercises, sends my videos,
 *   and asks YouTube for a link.
 * - `../food/foods.ts`: Makes elements and buttons, the brackets of a list kept alike.
 * - `../food/search.ts`: The head and the lines of every list,
 *   the fields of a change in place and the cross and the check of a form.
 * - `../day/times.ts`: Writes a length of time.
 * - `../search.ts`: Compares the text typed in a search with the names of a list.
 * - `../changes.ts`: Loads everything of mine anew the moment a file of my new system changes.
 * - `../icons.ts`: Puts the one plus and the one `×` into the buttons,
 *   and the plain question mark, their words as tooltip, and makes every search field.
 * - `lucide`: The plus of a new workout or exercise, and the pencil that renames a workout.
 */

import {
    exerciseChangeSend,
    exerciseDelete,
    exerciseSend,
    mineLoad,
    videoLookup,
    videoSend,
    workoutDelete,
    workoutSend,
} from "./mine.ts";
import { bracketsWatch, buttonOf, elementOf } from "../food/foods.ts";
import {
    editButtonsOf,
    editFieldOf,
    inlineFieldOf,
    listHeadOf,
    listLineOf,
} from "../food/search.ts";
import { lengthOf } from "../day/times.ts";
import { matchesAll, wordsOf } from "../search.ts";
import { changesFollow } from "../changes.ts";
import { crossPut, iconOf, iconPut, plusPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Pencil, Plus } from "lucide";

import type { Exercise, Mine, Part, Video, VideoFound, Workout } from "./mine.ts";

/**
 * Everything of mine as the reader last sent it.
 */
let mine: Mine = { workouts: [], exercises: [], videos: [], basics: [], kinds: [], last: {} };

/**
 * Shows of the sections, each showing its list anew from {@link mine}.
 */
const shows: (() => void)[] = [];

/**
 * Milliseconds to wait after the last key in the field of a link before asking YouTube,
 * so a link typed by hand asks once.
 */
const pause: number = 300;

/**
 * Takes everything of mine as the reader sent it and shows every section anew.
 *
 * @param sent - All of mine
 */
function mineShow(sent: Mine): void {
    mine = sent;
    shows.forEach((show: () => void): void => show());
}

/**
 * Logs what the reader did not take, the list staying as it was.
 *
 * @param error - What went wrong
 */
function failed(error: unknown): void {
    console.error(error);
}

/**
 * Makes the one plus of every list that adds one more,
 * see `plusPut` in `../icons.ts`, its words as tooltip.
 * - `button`: The +.
 *
 * @param words - What it adds, like `New workout`
 * @param click - What a click does
 * @returns The +
 */
function plusOf(words: string, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    plusPut(button, words);
    return button;
}

/**
 * Makes the one `×` of every list that takes a value back,
 * see `crossPut` in `../icons.ts`, its words as tooltip, the plain question mark while it asks.
 * - `button`: The ×.
 *
 * @param words - What it removes, like `Remove Push`
 * @param asking - Whether it asks `Really remove?`
 * @param click - What a click does
 * @returns The ×
 */
function removeOf(words: string, asking: boolean, click: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("", "", click);
    crossPut(button, words);
    if (asking) iconPut(button, QuestionMark, "Really remove?");
    return button;
}

/**
 * Cleans a name typed for a workout or an exercise as the reader cleans it:
 * `|`, `;` and `,` become spaces, spaces in a row one, none at the ends,
 * see `ownNameOf` in `reader/sport.ts`;
 * a link is no name, so a video's link pasted into the search
 * of my workouts never becomes a workout.
 *
 * @param typed - Name as typed, like ` Push, heavy`
 * @returns Clean name, like `Push heavy`, empty for a link
 */
function typedNameOf(typed: string): string {
    return linkTyped(typed) ? "" : typed.replace(/[|;,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Tells whether a text typed is a link, like that of a YouTube video.
 *
 * @param typed - Text typed
 * @returns Whether it starts like a web address
 */
function linkTyped(typed: string): boolean {
    return /^\s*https?:\/\//i.test(typed);
}

/**
 * Makes the heading of a section, its name in the text of controls,
 * and the plus after it where given.
 * - `heading`: The heading.
 *
 * @param name - Name of the section, like `Workouts`
 * @param plus - The plus after it, `null` for none
 * @returns The heading
 */
function headingOf(name: string, plus: HTMLButtonElement | null): HTMLElement {
    const heading: HTMLElement = elementOf("h2", "food-heading", name);
    if (plus !== null) heading.append(plus);
    return heading;
}

/**
 * Makes the name of a line with what stands grey in brackets after it, on one line,
 * the brackets cut with … where they have no room, like `Push (Bench press, Shoulder press, Di…)`,
 * see `.sport-name` in `sport.css`, both whole as its tooltip.
 * - `name`: The name.
 *
 * @param text - The name, like `Push`
 * @param brackets - What stands in the brackets, like `Bench press, Dips`; empty for no brackets
 * @returns The name
 */
function nameOf(text: string, brackets: string): HTMLElement {
    const name: HTMLElement = elementOf("span", "sport-name", "");
    name.title = brackets === "" ? text : `${text} (${brackets})`;
    name.append(elementOf("span", "", text));
    if (brackets !== "") name.append(elementOf("span", "food-brand", ` (${brackets})`));
    return name;
}

/**
 * Makes a value of a change in place that is a number, like the minutes of a video:
 * plain as every value, its unit after it;
 * Enter or leaving it saves a change,
 * a text that is no number of 0 or more takes nothing and shows the number again.
 * - `value`: The number with its unit.
 * - `input`: Its field.
 * - `text`: The text typed, a decimal comma as a point.
 *
 * @param number - Its number, `null` for none
 * @param unit - Its unit, like `min`
 * @param words - What it is, for screen readers, like `Minutes`
 * @param saved - Takes the number typed, `null` for none
 * @returns The number with its unit
 */
function numberFieldOf(
    number: number | null,
    unit: string,
    words: string,
    saved: (typed: number | null) => void,
): HTMLElement {
    const value: HTMLElement = elementOf("span", "food-grams", "");
    const input: HTMLInputElement = inlineFieldOf(
        number === null ? "" : String(number),
        words,
        (): void => {
            const text: string = input.value.trim().replace(",", ".");
            if (text !== "" && !(Number(text) >= 0)) {
                input.value = number === null ? "" : String(number);
                return;
            }
            saved(text === "" ? null : Number(text));
        },
    );
    input.inputMode = "decimal";
    input.classList.add("food-inline-grams");
    value.append(input, unit);
    value.addEventListener("click", (): void => input.focus());
    return value;
}

/**
 * Makes a value of a change in place that is a whole number, like the sets of an exercise:
 * plain as every value, Enter or leaving it saves a change,
 * a text that is no whole number takes nothing and shows the number again.
 * - `input`: Its field.
 *
 * @param value - Its number as text, empty for none
 * @param words - What it is, for screen readers, like `Sets`
 * @param saved - Takes the number typed as text, empty for none
 * @returns The field
 */
function wholeFieldOf(
    value: string,
    words: string,
    saved: (typed: string) => void,
): HTMLInputElement {
    const input: HTMLInputElement = inlineFieldOf(value, words, (): void => {
        const typed: string = input.value.trim();
        if (!/^\d*$/.test(typed)) {
            input.value = value;
            return;
        }
        saved(typed);
    });
    input.inputMode = "numeric";
    input.classList.add("food-inline-grams", "sport-whole");
    return input;
}

/**
 * Gives the key of a variant of an exercise: its name in small letters and its values,
 * see `sameExercise` in `reader/sport.ts`.
 *
 * @param exercise - The variant, or a part of a workout
 * @returns Key like `dips;3;10;`
 */
function variantKeyOf(exercise: {
    name: string;
    sets?: string;
    reps?: string;
    kg?: string;
}): string {
    return [
        exercise.name.toLowerCase(),
        exercise.sets ?? "",
        exercise.reps ?? "",
        exercise.kg ?? "",
    ].join(";");
}

/**
 * Writes what I do of an exercise as a rule, as its line shows it: its sets and repetitions,
 * then its kilograms after a middle dot, those it has,
 * like `3 × 10 · 40 kg`, `3 × 10` or `2 × 60 s`.
 * - `reps`: Its repetitions, seconds written with a space before `s`.
 * - `sets`: Its sets and repetitions.
 *
 * @param exercise - The exercise
 * @returns Text like `3 × 10 · 40 kg`, empty while nothing is set
 */
function ruleTextOf(exercise: { sets?: string; reps?: string; kg?: string }): string {
    const reps: string = (exercise.reps ?? "").replace(/^(\d+)s$/, "$1 s");
    const given: string = exercise.sets ?? "";
    const sets: string = given === "" ? reps : reps === "" ? `${given} ×` : `${given} × ${reps}`;
    return [sets, (exercise.kg ?? "") === "" ? "" : `${exercise.kg} kg`]
        .filter((part: string): boolean => part !== "")
        .join(" · ");
}

/**
 * Makes the pick of the kind of a video:
 * its kinds side by side as plain words, the one picked white, the others grey,
 * lighter under the pointer, a click picking one, since there are only a few and no list is needed.
 * - `kinds`: The words.
 *
 * @param picked - Kind picked, empty for none
 * @param pick - Takes the kind clicked
 * @returns The words side by side
 */
function kindsOf(picked: string, pick: (kind: string) => void): HTMLElement {
    const kinds: HTMLElement = elementOf("span", "sport-kinds", "");
    kinds.append(
        ...mine.kinds.map((kind: string): HTMLButtonElement => {
            const button: HTMLButtonElement = buttonOf("sport-kind", kind, (): void => pick(kind));
            button.setAttribute("aria-pressed", String(kind === picked));
            return button;
        }),
    );
    return kinds;
}

/**
 * Guesses the kind of a video from its title, which mostly names it,
 * like `30 Min Full Body HIIT` or `20 Min Pilates Core`:
 * the first kind whose words stand in the title, else `Cardio`,
 * the kind of a workout video of moderate effort, which I change where it is wrong.
 * - `words`: Words of the title that tell each kind, by kind.
 *
 * @param title - Title of the video
 * @returns Name of a kind, like `HIIT`
 */
function kindGuessOf(title: string): string {
    const words: [string, RegExp][] = [
        ["HIIT", /hiit|tabata|interval/i],
        ["Dance", /dance|zumba/i],
        ["Pilates", /pilates/i],
        ["Yoga", /yoga/i],
        ["Stretching", /stretch|mobility/i],
        ["Strength", /strength|dumbbell|weights|muscle|toning/i],
    ];
    return (
        words.find(
            ([kind, told]: [string, RegExp]): boolean =>
                mine.kinds.includes(kind) && told.test(title),
        )?.[0] ?? "Cardio"
    );
}

/**
 * Makes a form inside a list, in the look of a food of mine opened:
 * its values in two columns, each its name small and grey at the left,
 * a click on the name putting the cursor into its field, then the cross and the check,
 * see `food-form` in `../food/search.css`.
 * - `form`: The form.
 * - `facts`: Its values.
 *
 * @param rows - Each name with its field or value
 * @param cancelled - What the cross does
 * @param saved - What the check does
 * @returns The form
 */
function formOf(
    rows: [string, HTMLElement][],
    cancelled: () => void,
    saved: () => void,
): HTMLElement {
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
 * Makes a value that does not change, as plain as the fields beside it.
 *
 * @param text - Its text
 * @returns The value
 */
function valueOf(text: string): HTMLElement {
    return elementOf("span", "", text);
}

/**
 * Builds the section of my workouts, see the top of this file.
 * - `section`: The section.
 * - `search`: Its search field.
 * - `list`: Place of the head and the lines of the workouts.
 * - `open`: Name of the workout opened, in small letters, empty for none.
 * - `adding`: Name of the workout whose search of my exercises and videos shows,
 *   in small letters, empty for none.
 * - `asked`: Name of the workout whose `×` asked `Really remove?`,
 *   in small letters, empty for none.
 * - `fresh`: Name of a new workout not yet written, as it has no part yet, empty for none.
 * - `naming`: Whether the field of the name of a new workout shows.
 * - `focusing`: Whether the search of my exercises and videos takes the cursor when it shows next:
 *   only once it opens or a part was picked from it, never when another list shows anew.
 * - `editing`: Key of the video of a workout opened whose minutes and kind show below it, its link,
 *   or its title in small letters for one without link; empty for none.
 * - `videoChange`: Sends a video of mine changed, its minutes or its kind, and shows all of mine.
 * - `send`: Sends a workout with its parts, or renamed,
 *   and shows all of mine as the reader sends them,
 *   a workout renamed staying open under its name as the reader cleans it,
 *   like `Push Pull` of `Push, Pull`.
 * - `begin`: Opens a new workout with its search, not written until its first part.
 * - `toggle`: Opens a workout, or closes it again.
 * - `show`: Shows the workouts whose name
 *   or parts hold the words typed in the search, all for none typed.
 *
 * @returns The section
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
    let editing: string = "";

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
    const videoChange: (video: Video, changes: Partial<Video>) => void = (
        video: Video,
        changes: Partial<Video>,
    ): void => {
        videoSend({ ...video, ...changes }, { title: video.title, link: video.link })
            .then(mineShow)
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
        if (
            mine.workouts.some(
                (workout: Workout): boolean => workout.name.toLowerCase() === fresh.toLowerCase(),
            )
        )
            fresh = "";
        const shown: Workout[] = [
            ...(fresh === "" ? [] : [{ name: fresh, parts: [], kcal: null }]),
            ...mine.workouts.filter((workout: Workout): boolean =>
                matchesAll(
                    [workout.name, ...workout.parts.map((part: Part): string => part.name)].join(
                        " ",
                    ),
                    wordsOf(search.value),
                ),
            ),
        ];
        const rows: HTMLElement[] = shown.flatMap((workout: Workout): HTMLElement[] =>
            workoutLinesOf(workout),
        );
        const typed: string = typedNameOf(search.value);
        const plus: HTMLElement[] =
            typed === "" ||
            mine.workouts.some(
                (workout: Workout): boolean => workout.name.toLowerCase() === typed.toLowerCase(),
            )
                ? []
                : [
                      newOf(
                          `New workout “${typed}”`,
                          "New workout, its parts picked next",
                          (): void => begin(typed),
                      ),
                  ];
        list.replaceChildren(
            ...(naming ? [nameFormOf()] : []),
            ...(linkTyped(search.value)
                ? [
                      elementOf(
                          "p",
                          "food-none",
                          "A video goes into a workout: open it and paste the link into its search",
                      ),
                  ]
                : []),
            ...(shown.length > 0 || plus.length > 0
                ? [listHeadOf("My workouts", "kcal"), ...rows, ...plus]
                : []),
        );
    };
    const workoutLinesOf: (workout: Workout) => HTMLElement[] = (
        workout: Workout,
    ): HTMLElement[] => {
        const key: string = workout.name.toLowerCase();
        const name: HTMLElement = nameOf(
            workout.name,
            workout.parts.map((part: Part): string => part.name).join(", "),
        );
        const remove: HTMLButtonElement = removeOf(
            `Remove ${workout.name}`,
            asked === key,
            (): void => {
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
            },
        );
        const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
            name,
            workout.kcal,
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
            plusOf(`Add an exercise or a video to ${workout.name}`, (): void => {
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
        facts.append(
            elementOf("span", "food-fact", "Name"),
            rename,
            elementOf("span", "food-fact", "Parts"),
            parts,
        );
        detail.append(facts);
        parts.append(
            ...workout.parts.flatMap((part: Part, index: number): HTMLElement[] => {
                const video: Video | undefined =
                    part.kind === "Video"
                        ? mine.videos.find((other: Video): boolean =>
                              part.link !== ""
                                  ? other.link === part.link
                                  : other.title.toLowerCase() === part.name.toLowerCase(),
                          )
                        : undefined;
                const videoKey: string =
                    video === undefined
                        ? ""
                        : video.link !== ""
                          ? video.link
                          : video.title.toLowerCase();
                const line: HTMLElement = elementOf("div", "food-part", "");
                const name: HTMLElement = nameOf(part.name, video?.channel ?? "");
                if (video === undefined) line.append(name);
                else {
                    const opening: HTMLButtonElement = buttonOf("food-link", "", (): void => {
                        editing = editing === videoKey ? "" : videoKey;
                        show();
                    });
                    name.title += `\nMinutes and kind of ${video.title}`;
                    opening.append(name);
                    line.append(opening);
                }
                line.append(
                    elementOf(
                        "span",
                        "food-value sport-grey",
                        part.kind === "Exercise"
                            ? ruleTextOf(part)
                            : video?.minutes === null || video === undefined
                              ? ""
                              : lengthOf(Math.round(video.minutes)),
                    ),
                );
                if (workout.parts.length > 1)
                    line.append(
                        removeOf(`Remove ${part.name}`, false, (): void =>
                            send(
                                workout,
                                workout.parts.filter(
                                    (_: Part, at: number): boolean => at !== index,
                                ),
                            ),
                        ),
                    );
                if (video === undefined || editing !== videoKey) return [line];
                const facts: HTMLElement = elementOf("div", "food-facts sport-video-facts", "");
                facts.append(
                    elementOf("span", "food-fact", "Minutes"),
                    numberFieldOf(video.minutes, "min", "Minutes", (minutes: number | null): void =>
                        videoChange(video, { minutes: minutes }),
                    ),
                    elementOf("span", "food-fact", "Kind"),
                    kindsOf(video.kind, (kind: string): void => videoChange(video, { kind: kind })),
                );
                return [line, facts];
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
        const name: HTMLInputElement = editFieldOf(
            "",
            "Name",
            (): void => begin(name.value),
            close,
        );
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
        ),
        searchFieldOf(search, "Search workouts"),
        list,
    );
    bracketsWatch(list);
    shows.push(show);
    return section;
}

/**
 * Makes the row `+ New …` at the end of a list, which adds what was typed,
 * see `.picker-new` in `../base.css`.
 * - `button`: The row.
 *
 * @param text - Its text, like `New exercise “Squat”`
 * @param words - Its tooltip
 * @param click - What a click does
 * @returns The row
 */
function newOf(text: string, words: string, click: () => void): HTMLElement {
    const button: HTMLButtonElement = buttonOf("picker-new", "", click);
    button.replaceChildren(iconOf(Plus), text);
    button.title = words;
    return button;
}

/**
 * Makes the search of my exercises and videos below the parts of a workout opened: a field,
 * then my exercises and videos whose names hold the words typed, all of them for none typed,
 * the basic exercises of a gym only as I type, but those the workout holds,
 * and last `+ New exercise “Squat”` for a name typed that no exercise has;
 * a click or Enter on the first adds one.
 * A YouTube link pasted into it asks YouTube for its title and channel,
 * see `videoLookup` in `mine.ts`:
 * a video of mine shows as the one line to add, a new one as a form below the field,
 * its title and channel filled in, its minutes empty to type, its kind guessed from its title,
 * see {@link kindGuessOf}, whose check adds it to my videos and to the workout at once;
 * a link YouTube does not know says so in one grey line.
 * - `search`: The search with its field and its lines.
 * - `input`: The field.
 * - `results`: The lines.
 * - `wait`: Waiting question to YouTube after the last key.
 * - `held`: Whether the workout holds a part already.
 * - `found`: The exercises and videos found for the text typed.
 * - `show`: Shows the lines for the text typed, or asks YouTube for a link.
 * - `look`: Asks YouTube for the link typed and shows what it found.
 * - `formOfVideo`: Makes the form of a new video found.
 *
 * @param workout - The workout opened
 * @param pick - Adds a part to it
 * @returns The search
 */
function partSearchOf(workout: Workout, pick: (part: Part) => void): HTMLElement {
    const search: HTMLElement = elementOf("div", "food-search", "");
    const input: HTMLInputElement = document.createElement("input");
    const results: HTMLElement = elementOf("div", "food-results", "");
    let wait: number = 0;
    const held: (part: Part) => boolean = (part: Part): boolean =>
        workout.parts.some(
            (other: Part): boolean =>
                other.kind === part.kind &&
                (part.kind === "Video"
                    ? other.name.toLowerCase() === part.name.toLowerCase() &&
                      other.link === part.link
                    : variantKeyOf(other) === variantKeyOf(part)),
        );
    const found: () => Part[] = (): Part[] =>
        [
            ...mine.exercises.map((exercise: Exercise): Part => ({
                kind: "Exercise",
                name: exercise.name,
                link: "",
                sets: exercise.sets,
                reps: exercise.reps,
                kg: exercise.kg,
            })),
            ...mine.videos.map((video: Video): Part => ({
                kind: "Video",
                name: video.title,
                link: video.link,
            })),
            ...(input.value.trim() === ""
                ? []
                : mine.basics.map((name: string): Part => ({
                      kind: "Exercise",
                      name: name,
                      link: "",
                  }))),
        ].filter(
            (part: Part): boolean => !held(part) && matchesAll(part.name, wordsOf(input.value)),
        );
    const lineOf: (part: Part) => HTMLElement = (part: Part): HTMLElement => {
        const video: Video | undefined = mine.videos.find(
            (other: Video): boolean =>
                part.kind === "Video" && other.link === part.link && other.title === part.name,
        );
        return listLineOf(
            nameOf(part.name, part.kind === "Video" ? (video?.channel ?? "") : ruleTextOf(part)),
            video?.kcal ?? null,
            (): void => pick(part),
            null,
        )[0];
    };
    const formOfVideo: (video: VideoFound) => HTMLElement = (video: VideoFound): HTMLElement => {
        let kind: string = kindGuessOf(video.title);
        const close: () => void = (): void => {
            input.value = "";
            show();
        };
        const error: HTMLElement = elementOf(
            "p",
            "food-error",
            "Not added: it needs a title, and the minutes a number",
        );
        const save: () => void = (): void => {
            const typed: string = minutes.value.trim().replace(",", ".");
            if (title.value.trim() === "" || (typed !== "" && !(Number(typed) >= 0))) {
                error.hidden = false;
                return;
            }
            videoSend({
                title: title.value,
                channel: channel.value,
                minutes: typed === "" ? null : Number(typed),
                kind: kind,
                link: video.link,
            })
                .then((sent: Mine): void => {
                    mine = sent;
                    const added: Video | undefined = sent.videos.find(
                        (other: Video): boolean => other.link === video.link,
                    );
                    pick({
                        kind: "Video",
                        name: added?.title ?? title.value.trim(),
                        link: video.link,
                    });
                })
                .catch((reason: unknown): void => {
                    console.error(reason);
                    error.hidden = false;
                });
        };
        const title: HTMLInputElement = editFieldOf(video.title, "Title", save, close);
        const channel: HTMLInputElement = editFieldOf(video.channel, "Channel", save, close);
        const minutes: HTMLInputElement = editFieldOf("", "Minutes", save, close);
        const kinds: HTMLElement = elementOf("span", "", "");
        const kindShow: () => void = (): void => {
            kinds.replaceChildren(
                kindsOf(kind, (picked: string): void => {
                    kind = picked;
                    kindShow();
                }),
            );
        };
        minutes.inputMode = "decimal";
        kindShow();
        const form: HTMLElement = formOf(
            [
                ["Title", title],
                ["Channel", channel],
                ["Minutes", minutes],
                ["Kind", kinds],
                ["Link", valueOf(video.link)],
            ],
            close,
            save,
        );
        error.hidden = true;
        form.append(error);
        queueMicrotask((): void => minutes.focus());
        return form;
    };
    const look: (typed: string) => void = (typed: string): void => {
        videoLookup(typed)
            .then((video: VideoFound): void => {
                if (input.value.trim() !== typed) return;
                const known: Video | undefined = mine.videos.find(
                    (other: Video): boolean => other.link === video.link,
                );
                const part: Part | null =
                    known === undefined
                        ? null
                        : { kind: "Video", name: known.title, link: known.link };
                results.replaceChildren(
                    part === null
                        ? formOfVideo(video)
                        : held(part)
                          ? elementOf("p", "food-none", "This workout has this video already")
                          : lineOf(part),
                );
            })
            .catch((error: unknown): void => {
                console.error(error);
                if (input.value.trim() === typed)
                    results.replaceChildren(
                        elementOf("p", "food-none", "No YouTube video found for this link"),
                    );
            });
    };
    const show: () => void = (): void => {
        clearTimeout(wait);
        const typed: string = typedNameOf(input.value);
        if (/^\s*https?:\/\//i.test(input.value)) {
            results.replaceChildren();
            wait = window.setTimeout((): void => look(input.value.trim()), pause);
            return;
        }
        const lines: HTMLElement[] = found().map(lineOf);
        const plus: HTMLElement[] =
            typed === "" ||
            [
                ...mine.exercises.map((exercise: Exercise): string => exercise.name),
                ...mine.basics,
            ].some((name: string): boolean => name.toLowerCase() === typed.toLowerCase())
                ? []
                : [
                      newOf(`New exercise “${typed}”`, "New exercise of this workout", (): void =>
                          pick({ kind: "Exercise", name: typed, link: "" }),
                      ),
                  ];
        results.replaceChildren(
            ...lines,
            ...plus,
            ...(lines.length === 0 && plus.length === 0
                ? [elementOf("p", "food-none", "Type an exercise, or paste a YouTube link")]
                : []),
        );
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter" || results.querySelector(".food-form") !== null) return;
        event.preventDefault();
        (results.querySelector("button") as HTMLButtonElement | null)?.click();
    });
    search.append(
        searchFieldOf(input, "Search exercises and videos, or paste a YouTube link"),
        results,
    );
    show();
    return search;
}

/**
 * Builds the section of my exercises, see the top of this file.
 * - `section`: The section.
 * - `search`: Its search field.
 * - `list`: Place of the field of a new name, the head and the lines of the exercises.
 * - `asked`: Key of the variant whose `×` asked `Really remove?`, empty for none.
 * - `naming`: Whether the field of the name of a new exercise shows.
 * - `open`: Key of the variant opened, see {@link variantKeyOf}, empty for none.
 * - `add`: Adds an exercise by its name and shows all of mine.
 * - `show`: Shows the exercises whose name holds the words typed in the search, all for none typed.
 * - `nameFormOf`: Makes the field of the name of a new exercise with its cross and check.
 * - `ruleOf`: Makes what I do of an exercise opened as a rule, its sets,
 *   repetitions with their unit and kilograms, each changing in place and written at once.
 *
 * @returns The section
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
        const basics: HTMLElement[] =
            typed === ""
                ? []
                : mine.basics
                      .filter((name: string): boolean => matchesAll(name, wordsOf(search.value)))
                      .map(
                          (name: string): HTMLElement =>
                              listLineOf(nameOf(name, ""), null, (): void => add(name), null)[0],
                      );
        const empty: boolean =
            mine.exercises.some(
                (exercise: Exercise): boolean =>
                    variantKeyOf(exercise) ===
                    variantKeyOf({ name: typed, sets: "", reps: "", kg: "" }),
            ) ||
            mine.basics.some((name: string): boolean => name.toLowerCase() === typed.toLowerCase());
        const plus: HTMLElement[] =
            typed === "" || empty
                ? []
                : [
                      newOf(
                          `New exercise “${typed}”`,
                          "New exercise, empty, beside those of the same name",
                          (): void => add(typed),
                      ),
                  ];
        const rows: HTMLElement[] = shown.flatMap((exercise: Exercise): HTMLElement[] => {
            const key: string = variantKeyOf(exercise);
            const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
                nameOf(exercise.name, exercise.workouts.join(", ")),
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
        list.replaceChildren(
            ...(naming ? [nameFormOf()] : []),
            ...(rows.length > 0 ? [listHeadOf("My exercises", ""), ...rows] : []),
            ...(basics.length > 0 ? [listHeadOf("Basic exercises", ""), ...basics] : []),
            ...plus,
        );
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
        sets.append(
            wholeFieldOf(exercise.sets, "Sets", (typed: string): void => send({ sets: typed })),
        );
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
        ),
        searchFieldOf(search, "Search exercises"),
        list,
    );
    bracketsWatch(list);
    shows.push(show);
    return section;
}

/**
 * Loads everything of mine anew and shows it, like after my weight changed,
 * whose kcal my videos count with.
 */
export function mineReload(): void {
    mineLoad().then(mineShow).catch(failed);
}

/**
 * Builds the two sections of the lists, see the top of this file,
 * and loads everything of mine into them,
 * and anew after every change of the files while the cursor stands in neither, see `../changes.ts`.
 * - `sections`: The sections in their order.
 *
 * @returns The sections
 */
export function listsOf(): HTMLElement[] {
    const sections: HTMLElement[] = [workoutsSectionOf(), exercisesSectionOf()];
    shows.forEach((show: () => void): void => show());
    mineLoad()
        .then(mineShow)
        .catch((error: unknown): void => {
            console.error(error);
            sections.forEach((section: HTMLElement): void =>
                section
                    .querySelector(".dish-list")
                    ?.replaceChildren(elementOf("p", "food-none", "Cannot be read")),
            );
        });
    changesFollow((): void => {
        if (
            !sections.some((section: HTMLElement): boolean =>
                section.contains(document.activeElement),
            )
        )
            mineReload();
    });
    return sections;
}
