/**
 * ## Task
 *
 * What the views show of one task: when it is due,
 * and its history folded behind a small button that opens all its attempts.
 * In the scripts view and in a card its row has one button `⋯` for the next attempt,
 * in a section, the Task of a round, a check and a cross instead, see {@link judgeOf}.
 * Only a cold Task has a result; an Example has none, `Next` checks it off in its round,
 * see `../editor/round.ts`.
 * Right writes at once, Wrong opens one short field for my comment on what went wrong,
 * only in a session of its module, see `../editor/session.ts`.
 * Right and Wrong work only once the solution of the task is open,
 * so I judge against it, not by feeling, since self-grading runs generous (León 2023);
 * a task without a solution takes them always. A broken task I tell my tutor in the chat.
 * A card keeps the row quiet, as quiet as a box of the day:
 * only the `⋯`, after it grey the result of today once there is one.
 */

import { attemptSend, dayTextOf } from "./attempts.ts";
import { sessionEnsure } from "../editor/session.ts";
import { iconOf, iconPut, iconWordsOf } from "../icons.ts";
import { elementOf } from "../food/foods.ts";
import { menuAnchor, menuItemOf, menuOf } from "../menu.ts";
import { Check, History, X } from "lucide";
import "./task.css";

import type { SkillTask } from "./attempts.ts";
import type { IconNode } from "lucide";
import type { Attempt } from "../../reader/skill.ts";

/**
 * Tells when a task is due, as a line of its own,
 * where no group of due tasks names it, see `reader/skill.ts`.
 * `Due today` also for a task due earlier.
 */
export function stateTextOf(task: SkillTask, today: string): string {
    if (task.due !== "")
        return task.due <= today ? "Due today" : `Due ${dayTextOf(task.due, true)}`;
    if (task.ready) return "Ready";
    return task.done ? "Done" : "New";
}

/**
 * Builds the grey label of a cold task in place of its `(cold)` in the scripts view:
 * that it is cold, how often I tried it and how often I got it right.
 */
export function coldLabelOf(task: SkillTask): HTMLElement {
    const done: number = task.attempts.length;
    const right: number = task.attempts.filter(
        (attempt: Attempt): boolean => attempt.result === "right",
    ).length;
    return elementOf("span", "task-cold", `cold · ${done} done · ${right} right`);
}

/** Writes the result of an attempt, with my comment on what went wrong. */
export function resultTextOf(attempt: Attempt): string {
    return attempt.error === "" ? attempt.result : `wrong: ${attempt.error}`;
}

/**
 * Keeps a field of my comment on what went wrong plain text in one line,
 * since it goes into the line `X-ROUND` as its `NOTE`, see `reader/skill.ts`:
 * a `"`, a line break or another control sign I type or paste never stands in it;
 * the reader replaces them once more as it writes.
 */
export function plainKeep(input: HTMLInputElement): void {
    input.addEventListener("input", (): void => {
        const plain: string = input.value.replace(/["\p{Cc}]/gu, "");
        if (plain === input.value) return;
        const at: number = input.value
            .slice(0, input.selectionStart ?? input.value.length)
            .replace(/["\p{Cc}]/gu, "").length;
        input.value = plain;
        input.setSelectionRange(at, at);
    });
}

/**
 * Builds the history of a task, closed at first, the latest attempt first,
 * each day linking to the day view. None for a task never tried.
 */
export function historyOf(task: SkillTask, counted: boolean): HTMLElement[] {
    if (task.attempts.length === 0) return [];

    const history: HTMLDetailsElement = document.createElement("details");
    const summary: HTMLElement = elementOf("summary", "", "");
    const list: HTMLElement = elementOf("ol", "", "");
    history.className = "task-history";
    summary.append(
        ...(counted
            ? iconWordsOf(History, String(task.attempts.length))
            : [iconOf(History)]),
    );
    summary.title = "History";
    summary.setAttribute(
        "aria-label",
        `History, ${task.attempts.length} ` +
            (task.attempts.length === 1 ? "attempt" : "attempts"),
    );
    list.append(
        ...task.attempts.toReversed().map((attempt: Attempt): HTMLElement => {
            const item: HTMLElement = elementOf("li", "", "");
            const day: HTMLAnchorElement = document.createElement("a");
            day.href = `/?date=${attempt.day}`;
            day.textContent = dayTextOf(attempt.day, false);
            item.append(day, ` · ${resultTextOf(attempt)}`);
            return item;
        }),
    );
    history.append(summary, list);
    return [history];
}

/**
 * Writes an attempt at a task into the skill entry of the moment,
 * then shows the task again,
 * once a session of its module runs, see `sessionEnsure` in `../editor/session.ts`;
 * without one nothing is written and the buttons stay as they are.
 * The buttons of the task take no clicks meanwhile, so a double click writes one attempt.
 */
function attemptWrite(
    place: HTMLElement,
    task: SkillTask,
    result: "right" | "wrong",
    comment: string,
    written: () => Promise<void>,
    failed: (error: unknown) => void,
): void {
    place.inert = true;
    sessionEnsure(task.id.split("/")[0])
        .then(async (running: boolean): Promise<void> => {
            if (!running) {
                place.inert = false;
                return;
            }
            await attemptSend({ task: task.id, result: result, comment: comment });
            await written();
        })
        .catch(failed);
}

/** Says below a task that saving failed, and lets the row take clicks again. */
function failShow(row: HTMLElement, error: unknown): void {
    console.error(error);
    const form: HTMLElement = row.querySelector(".task-form") as HTMLElement;
    form.replaceChildren(elementOf("p", "", "Saving failed"));
    form.hidden = false;
    row.inert = false;
}

/**
 * Opens the field for my comment on what went wrong below a task, focused:
 * Enter writes the attempt as wrong, also with no comment, Escape closes without writing.
 */
function wrongShow(
    row: HTMLElement,
    task: SkillTask,
    written: () => Promise<void>,
): void {
    const form: HTMLElement = row.querySelector(".task-form") as HTMLElement;
    const input: HTMLInputElement = document.createElement("input");
    input.type = "text";
    input.placeholder = "What went wrong";
    input.autocomplete = "off";
    plainKeep(input);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter")
            attemptWrite(
                row,
                task,
                "wrong",
                input.value.trim(),
                written,
                (error: unknown): void => failShow(row, error),
            );
        else if (event.key === "Escape") form.hidden = true;
    });
    form.replaceChildren(input);
    form.hidden = false;
    input.focus();
}

/**
 * Builds the row of a task under its heading in the scripts view.
 * The button hides, keeping its place, until the solution is open,
 * with a grey hint after the state saying so, see `task.css`.
 * - `done`: The last attempt of today, whose result a card shows.
 *
 * @param solution - Fold of the task's solution, `null` when it has none,
 *   or as the editor draws the row anew on each fold, see `../editor/tasks.ts`
 */
export function taskRowOf(
    task: SkillTask,
    today: string,
    solution: (EventTarget & { open: boolean }) | null,
    card: boolean,
    written: () => Promise<void>,
): HTMLElement {
    const row: HTMLElement = elementOf("div", `task-row${card ? " task-quiet" : ""}`, "");
    const form: HTMLElement = elementOf("div", "task-form", "");
    const more: HTMLElement = menuOf([
        menuItemOf(Check, "Right", (): void =>
            attemptWrite(row, task, "right", "", written, (error: unknown): void =>
                failShow(row, error),
            ),
        ),
        menuItemOf(X, "Wrong", (): void => wrongShow(row, task, written)),
    ]);
    const judged: () => void = (): void => {
        row.classList.toggle("task-unjudged", solution !== null && !solution.open);
    };

    form.hidden = true;
    const done: Attempt | undefined = task.attempts.findLast(
        (attempt: Attempt): boolean => attempt.day === today,
    );
    row.append(
        ...(card
            ? []
            : [
                  elementOf("span", "task-state", stateTextOf(task, today)),
                  elementOf(
                      "span",
                      "task-hint",
                      "Right and Wrong once the solution is open",
                  ),
              ]),
        more,
        ...(card && done !== undefined
            ? [elementOf("span", "task-state", resultTextOf(done))]
            : []),
        ...(card ? [] : historyOf(task, true)),
        form,
    );
    judged();
    solution?.addEventListener("toggle", judged);
    return row;
}

/**
 * Makes a button of the check and the cross of a task, see {@link judgeOf}:
 * one chip high and as wide, its icon in place of its word, which is its tooltip.
 */
function judgeButtonOf(icon: IconNode, words: string): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    iconPut(button, icon, words);
    return button;
}

/**
 * Builds the check and the cross of a task in a section,
 * to stand at the right end of the line of its heading, see `../editor/tasks.ts`.
 * The check writes Right at once and then goes on, as `Next` does;
 * the cross opens below it the field of my comment in the place and look of a menu,
 * see `menuAnchor` in `../menu.ts`.
 * Both stay faint and off until the solution is open, so I judge against it;
 * the result of today stands pressed, the cross with my comment as its tooltip.
 *
 * @param open - Whether its solution is open, also for a task without one
 */
export function judgeOf(
    task: SkillTask,
    today: string,
    open: boolean,
    written: () => Promise<void>,
    wentOn: () => void,
): HTMLElement {
    const judge: HTMLElement = elementOf("span", "task-judge", "");
    const right: HTMLButtonElement = judgeButtonOf(Check, "Right");
    const wrong: HTMLButtonElement = judgeButtonOf(X, "Wrong");
    const reason: HTMLElement = elementOf("div", "task-reason", "");
    const input: HTMLInputElement = document.createElement("input");
    const done: Attempt | undefined = task.attempts.findLast(
        (attempt: Attempt): boolean => attempt.day === today,
    );
    const failed: (error: unknown) => void = (error: unknown): void => {
        console.error(error);
        reason.replaceChildren(elementOf("p", "", "Saving failed"), input);
        judge.inert = false;
        reason.showPopover();
    };

    input.type = "text";
    input.placeholder = "What went wrong";
    input.autocomplete = "off";
    plainKeep(input);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter") return;
        reason.hidePopover();
        attemptWrite(judge, task, "wrong", input.value.trim(), written, failed);
    });
    reason.append(input);
    menuAnchor(reason, wrong);
    reason.addEventListener("toggle", (event: ToggleEvent): void => {
        if (event.newState === "open") input.focus();
    });
    right.addEventListener("click", (): void =>
        attemptWrite(
            judge,
            task,
            "right",
            "",
            async (): Promise<void> => {
                await written();
                wentOn();
            },
            failed,
        ),
    );
    right.disabled = !open;
    wrong.disabled = !open;
    right.setAttribute("aria-pressed", String(done?.result === "right"));
    wrong.setAttribute(
        "aria-pressed",
        String(done !== undefined && done.result !== "right"),
    );
    if (done !== undefined && done.error !== "") wrong.title = `Wrong: ${done.error}`;
    if (!open) {
        right.title = "Right once the solution is open";
        wrong.title = "Wrong once the solution is open";
    }
    judge.append(right, wrong, reason);
    return judge;
}
