/**
 * ## Task
 *
 * What the views show of one task: when it is due, and its history folded behind a small button
 * that opens all its attempts, each with its day, its result and my comment on what went wrong, an older one also
 * with its time, its part, my effort, where I got stuck or why I skipped, and a link to the day; in the scripts view
 * and in a card, under the heading of the task, its row with one button `⋯` for the next attempt, as a box of the day
 * has, see `../menu.ts`; in a section, an Example or a Task of a round, a check and a cross on the line of its heading
 * instead, see {@link judgeOf}.
 * Its menu writes into the skill entry of the moment, through the reader's one writer of attempts, the task judged
 * as a whole: Right at once, Wrong opens one short field for my comment on what went wrong, which
 * Enter writes with it, also empty, and Escape closes without writing; only in a session of its module, which the
 * dialog of a new entry starts while none runs, see `../editor/session.ts`.
 * Right and Wrong work only once the solution of the task is open, so I judge against it, not by feeling, since
 * self-grading runs generous (León 2023); a task without a solution takes them always. A broken task I tell my tutor
 * in the chat.
 * A card keeps the row quiet, as quiet as a box of the day: only the `⋯`, after it grey the result of today once
 * there is one, like `wrong`, no state, no hint and no history.
 *
 * - `./attempts.ts`: Sends attempts, and writes days out.
 * - `../editor/session.ts`: Makes sure a session of the module of the task runs before an attempt is written.
 * - `../icons.ts`: Puts icons, alone or with words, into buttons.
 * - `../food/foods.ts`: Makes elements.
 * - `../menu.ts`: Puts the items for the next attempt behind one button `⋯`, and opens the field of my comment below
 *   the cross of a section as a menu.
 * - `lucide`: The icons of the history and of the items.
 * - `./task.css`: Look of the row and the history of a task.
 */

import { attemptSend, dayTextOf } from "./attempts.ts";
import { sessionEnsure } from "../editor/session.ts";
import { iconOf, iconPut, iconWordsOf } from "../icons.ts";
import { elementOf } from "../food/foods.ts";
import { menuAnchor, menuItemOf, menuOf } from "../menu.ts";
import { Check, History, X } from "lucide";
import "./task.css";

import type { Attempt, SkillTask } from "./attempts.ts";
import type { IconNode } from "lucide";


/**
 * Tells when a task is due, as a line of its own, where no group of due tasks names it, see `reader/skill.ts`:
 * a task due, a cold task ready with nothing due, a task of the ladder done, else new.
 *
 * @param task - Task
 * @param today - Today like `2026-10-10`
 * @returns Text like `Due today`, also for a task due earlier, `Due 12.10.2026 (Mon)`, `New`, `Ready`, `Done`
 *   or `Skipped: too easy`
 */
export function stateTextOf(task: SkillTask, today: string): string {
    if (task.skipped) {
        const skip: string = task.attempts.at(-1)?.skip ?? "";
        return skip === "" ? "Skipped" : `Skipped: ${skip}`;
    }
    if (task.due !== "")
        return task.due <= today ? "Due today" : `Due ${dayTextOf(task.due, true)}`;
    if (task.ready)
        return "Ready";
    return task.done ? "Done" : "New";
}

/**
 * Builds the label of a cold task, to stand grey beside its heading in the scripts view in place of its `(cold)`:
 * that it is cold, how often I tried it and how often I got it right, skips left out.
 *
 * @param task - Cold task
 * @returns Label like `cold · 2 done · 1 right`
 */
export function coldLabelOf(task: SkillTask): HTMLElement {
    const done: number = task.attempts.filter((attempt: Attempt): boolean => attempt.result !== "skipped").length;
    const right: number = task.attempts.filter((attempt: Attempt): boolean => attempt.result === "right").length;
    return elementOf("span", "task-cold", `cold · ${done} done · ${right} right`);
}

/**
 * Writes the result of an attempt, with my comment on what went wrong, an older one also after its part, with where
 * I got stuck or why I skipped, and my effort when I rated it.
 * - `result`: The result with where I got stuck or why I skipped.
 * - `part`: The part before it, empty for the whole task.
 *
 * @param attempt - Attempt
 * @returns Text like `right · low effort`, `2. stuck at step 3`, `1. wrong: weights add up to 1.2`, `right with tutor`
 *   or `skipped: too easy`
 */
export function resultTextOf(attempt: Attempt): string {
    let result: string = attempt.result;
    if (attempt.error !== "")
        result = `wrong: ${attempt.error}`;
    else if (attempt.stuck !== "")
        result = `stuck at ${attempt.stuck}`;
    else if (attempt.skip !== "")
        result = `skipped: ${attempt.skip}`;
    else if (attempt.result === "guided")
        result = "right with tutor";
    const part: string = attempt.part === "" ? "" : `${attempt.part}. `;
    return attempt.effort === "" ? `${part}${result}` : `${part}${result} · ${attempt.effort} effort`;
}

/**
 * Builds the history of a task: a small button with the history icon and the number of attempts, closed at first,
 * that opens all attempts, the latest first, each its day, linking to the day in the day view, and its result.
 *
 * @param task - Task
 * @param counted - Whether the button shows the number of attempts beside its icon
 * @returns History, none for a task never tried
 */
export function historyOf(task: SkillTask, counted: boolean): HTMLElement[] {
    if (task.attempts.length === 0)
        return [];

    const history: HTMLDetailsElement = document.createElement("details");
    const summary: HTMLElement = elementOf("summary", "", "");
    const list: HTMLElement = elementOf("ol", "", "");
    history.className = "task-history";
    summary.append(...(counted ? iconWordsOf(History, String(task.attempts.length)) : [iconOf(History)]));
    summary.title = "History";
    summary.setAttribute("aria-label", `History, ${task.attempts.length} ${task.attempts.length === 1 ? "attempt" : "attempts"}`);
    list.append(...task.attempts.toReversed().map((attempt: Attempt): HTMLElement => {
        const item: HTMLElement = elementOf("li", "", "");
        const day: HTMLAnchorElement = document.createElement("a");
        day.href = `/?date=${attempt.day}`;
        day.textContent = attempt.time === "" ? dayTextOf(attempt.day, false) : `${dayTextOf(attempt.day, false)}, ${attempt.time}`;
        item.append(day, ` · ${resultTextOf(attempt)}`);
        return item;
    }));
    history.append(summary, list);
    return [history];
}

/**
 * Writes an attempt at a task into the skill entry of the moment, then shows the task again, once a session of its
 * module runs, see `sessionEnsure` in `../editor/session.ts`; without one nothing is written and the buttons stay as
 * they are. The buttons of the task take no clicks meanwhile, so a double click writes one attempt;
 * when the reader does not take the attempt, `failed` says so.
 * - {@link HTMLElement#inert}: Makes an element and its content take no clicks and no typing.
 *
 * @param place - The buttons of the task: its row, or its check and cross
 * @param task - Task
 * @param result - Result of the attempt
 * @param comment - My comment on what went wrong, empty for none and for right
 * @param written - Shows the task again once the attempt is written
 * @param failed - Says that saving failed, and lets the buttons take clicks again
 */
function attemptWrite(place: HTMLElement, task: SkillTask, result: "right" | "wrong", comment: string,
                      written: () => Promise<void>, failed: (error: unknown) => void): void {

    place.inert = true;
    sessionEnsure(task.id.split("/")[0]).then(async (running: boolean): Promise<void> => {
        if (!running) {
            place.inert = false;
            return;
        }
        await attemptSend({ task: task.id, result: result, comment: comment });
        await written();
    }).catch(failed);
}

/**
 * Says below a task that saving failed, and lets the row take clicks again.
 *
 * @param row - Row of the task
 * @param error - Why saving failed, like a lost connection
 */
function failShow(row: HTMLElement, error: unknown): void {
    console.error(error);
    const form: HTMLElement = row.querySelector(".task-form") as HTMLElement;
    form.replaceChildren(elementOf("p", "", "Saving failed"));
    form.hidden = false;
    row.inert = false;
}

/**
 * Opens the field for my comment on what went wrong below a task, focused: Enter writes the attempt as wrong
 * with the comment, also with none, Escape closes the place of the field without writing.
 * - `input`: The field.
 *
 * @param row - Row of the task
 * @param task - Task
 * @param written - Shows the task again once the attempt is written
 */
function wrongShow(row: HTMLElement, task: SkillTask, written: () => Promise<void>): void {
    const form: HTMLElement = row.querySelector(".task-form") as HTMLElement;
    const input: HTMLInputElement = document.createElement("input");
    input.type = "text";
    input.placeholder = "What went wrong";
    input.autocomplete = "off";
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter")
            attemptWrite(row, task, "wrong", input.value.trim(), written, (error: unknown): void => failShow(row, error));
        else if (event.key === "Escape")
            form.hidden = true;
    });
    form.replaceChildren(input);
    form.hidden = false;
    input.focus();
}

/**
 * Builds the row of a task under its heading in the scripts view: when it is due, then its button `⋯` with Right
 * and Wrong, see the top of this file, then its history and the place for the field of my comment, each across the
 * row. The button hides, keeping its place, until the solution is open, and the row marks itself so meanwhile,
 * a grey hint after the state saying so, see `task.css`; a card's row shows neither state nor hint nor history.
 * - `more`: The button `⋯` of the task with its menu.
 * - `judged`: Shows the button while the solution is open, or always when the task has none.
 * - `done`: The last attempt of today, whose result a card shows.
 *
 * @param task - Task
 * @param today - Today like `2026-10-10`
 * @param solution - Fold of the task's solution, `null` when it has none: whether it is open, and a `toggle` when that
 *   changes, like the fold of a card, or as the editor draws the row anew on each fold, see `../editor/tasks.ts`
 * @param card - Whether the row stands on a card, quiet
 * @param written - Shows the task again once an attempt is written
 * @returns Row
 */
export function taskRowOf(task: SkillTask, today: string, solution: (EventTarget & { open: boolean }) | null,
                          card: boolean, written: () => Promise<void>): HTMLElement {

    const row: HTMLElement = elementOf("div", `task-row${card ? " task-quiet" : ""}`, "");
    const form: HTMLElement = elementOf("div", "task-form", "");
    const more: HTMLElement = menuOf([
        menuItemOf(Check, "Right", (): void =>
            attemptWrite(row, task, "right", "", written, (error: unknown): void => failShow(row, error))),
        menuItemOf(X, "Wrong", (): void => wrongShow(row, task, written)),
    ]);
    const judged: () => void = (): void => {
        row.classList.toggle("task-unjudged", solution !== null && !solution.open);
    };

    form.hidden = true;
    const done: Attempt | undefined = task.attempts.findLast((attempt: Attempt): boolean => attempt.day === today);
    row.append(...(card ? [] : [elementOf("span", "task-state", stateTextOf(task, today)),
        elementOf("span", "task-hint", "Right and Wrong once the solution is open")]), more,
        ...(card && done !== undefined ? [elementOf("span", "task-state", resultTextOf(done))] : []),
        ...(card ? [] : historyOf(task, true)), form);
    judged();
    solution?.addEventListener("toggle", judged);
    return row;
}

/**
 * Makes a button of the check and the cross of a task, see {@link judgeOf}: one chip high and as wide, its icon
 * in place of its word, which is its tooltip.
 *
 * @param icon - Icon, `Check` or `X`
 * @param words - What it writes, `Right` or `Wrong`
 * @returns Button
 */
function judgeButtonOf(icon: IconNode, words: string): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    iconPut(button, icon, words);
    return button;
}

/**
 * Builds the check and the cross of a task in a section, its results Right and Wrong, see the top of this file:
 * two small buttons side by side, to stand at the right end of the line of its heading, see `../editor/tasks.ts`.
 * The check writes Right at once and then goes on, as `Next` does; the cross opens below it the field of my comment
 * on what went wrong, in the place and look of a menu, see `menuAnchor` in `../menu.ts`, which Enter writes with it,
 * also empty, and Escape or a click beside it closes without writing. Both stay faint and off until the solution is
 * open, so I judge against it; the result of today stands pressed, in the calm grey of what is picked, the cross with
 * my comment as its tooltip.
 * - `judge`: The check and the cross.
 * - `right`, `wrong`: The check and the cross.
 * - `reason`: The menu below the cross with the field of my comment.
 * - `input`: The field.
 * - `done`: The last attempt of today, whose result stands pressed.
 * - `failed`: Says in the menu below the cross that saving failed, the field below it, to try again.
 *
 * @param task - Task
 * @param today - Today like `2026-10-17`
 * @param open - Whether its solution is open, also for a task without one
 * @param written - Shows the task again once an attempt is written
 * @param wentOn - Goes on as `Next` does, once a Right is written
 * @returns The check and the cross
 */
export function judgeOf(task: SkillTask, today: string, open: boolean, written: () => Promise<void>,
                        wentOn: () => void): HTMLElement {

    const judge: HTMLElement = elementOf("span", "task-judge", "");
    const right: HTMLButtonElement = judgeButtonOf(Check, "Right");
    const wrong: HTMLButtonElement = judgeButtonOf(X, "Wrong");
    const reason: HTMLElement = elementOf("div", "task-reason", "");
    const input: HTMLInputElement = document.createElement("input");
    const done: Attempt | undefined = task.attempts.findLast((attempt: Attempt): boolean =>
        attempt.day === today && attempt.result !== "skipped");
    const failed: (error: unknown) => void = (error: unknown): void => {
        console.error(error);
        reason.replaceChildren(elementOf("p", "", "Saving failed"), input);
        judge.inert = false;
        reason.showPopover();
    };

    input.type = "text";
    input.placeholder = "What went wrong";
    input.autocomplete = "off";
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter")
            return;
        reason.hidePopover();
        attemptWrite(judge, task, "wrong", input.value.trim(), written, failed);
    });
    reason.append(input);
    menuAnchor(reason, wrong);
    reason.addEventListener("toggle", (event: ToggleEvent): void => {
        if (event.newState === "open")
            input.focus();
    });
    right.addEventListener("click", (): void => attemptWrite(judge, task, "right", "", async (): Promise<void> => {
        await written();
        wentOn();
    }, failed));
    right.disabled = !open;
    wrong.disabled = !open;
    right.setAttribute("aria-pressed", String(done?.result === "right"));
    wrong.setAttribute("aria-pressed", String(done !== undefined && done.result !== "right"));
    if (done !== undefined && done.error !== "")
        wrong.title = `Wrong: ${done.error}`;
    if (!open) {
        right.title = "Right once the solution is open";
        wrong.title = "Wrong once the solution is open";
    }
    judge.append(right, wrong, reason);
    return judge;
}
