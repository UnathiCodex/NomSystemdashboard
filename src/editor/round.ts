/**
 * ## Round
 *
 * The round of a section in the editor, the one view of a note:
 * a section, a note with tasks of the semester, shows its blocks, each `##` block,
 * as the round holds them, never changing the text:
 * only the current step stands on the page, the text before and after it hidden,
 * see {@link aloneOf}; every other Example and Task folded,
 * the cold Task variants not due this round among them,
 * but theory only by my hand, like a Definition or the Algorithm, see {@link theoryIs}:
 * it reads whole whenever I open it, by the tree, a link, `Next` or a reload,
 * and in the whole note, which shows while the round has no step, like once it is closed.
 * In the head stands `Next`, see {@link roundDraw}:
 * it checks a block without a result off, theory and an Example,
 * and opens the next; the Task stays unchecked until my result.
 * What a round holds, only what it needs;
 * the other blocks wait, grey in the tree, those of one kind folded into one line there.
 * Every round starts with every theory block in the order of the note,
 * the Algorithm among them,
 * so what an Example or a Task uses, like $X$, stands defined right before it,
 * also in a later round, when I forgot it; only its Examples and Tasks change:
 * - round 0: one Example, the first, its steps predicted one by one, see `./steps.ts`,
 *   then one Task alone, gone over with this Example and the theory until it is right,
 *   since the first Task can only succeed, so a wrong one leaves the Task to do;
 * - later: only the Task of the round, once it is due;
 *   until then the round holds no theory either;
 *   a wrong Task brings the Example of the round, the next unused, then the Task again,
 *   which then counts as right; wrong again, I go through it with its solution and close.
 * The Task decides the round,
 * and the reader writes the day of the next one with its result,
 * see `reader/skill.ts`
 * and `~/NomWorkspace/.claude/skills/learn/3-session-learn/session-learn.md`.
 * Where I am lives in the log alone, never in the browser or the note:
 * `Next` writes the step it goes on to, its heading,
 * where I stand, into the one line `X-ROUND` of the section
 * in the skill entry of the moment,
 * an Example it passes checked off there as the `USED` of the round,
 * written anew in its place, and the reader gives it back with the section,
 * see `RoundLine` in `reader/skill.ts`,
 * so a round goes on where I left it, in another sitting or on another day;
 * the steps without a result before it, theory and the Example, count as passed.
 * The round folds and unfolds only whole blocks, never a section in one:
 * the scene of a Definition, its section under a heading `####`,
 * folds only by my hand, also when I look the block up.
 * On the last step `Next` stays off, since a round closes only by hand,
 * with the close in the head, see {@link roundClose}.
 * Reading a round needs no session,
 * but `Next` and the close write only in a session of the module,
 * which the dialog of a new entry starts while none runs, see `./session.ts`.
 * I write only in the block shown, see {@link changesKeep} and {@link selectionKeep},
 * so no key, cut or drag takes the hidden text around the block away.
 */

import {
    EditorSelection,
    EditorState,
    Prec,
    StateEffect,
    StateField,
} from "@codemirror/state";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { foldable, foldEffect, unfoldEffect } from "@codemirror/language";
import { blockRule, blocksOf, tasksFollow } from "./tasks.ts";
import { foldedAt } from "./steps.ts";
import { sessionEnsure, sessionOf, sessionTextOf } from "./session.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { kindRule } from "../notes/tree.ts";

import type {
    Extension,
    Line,
    Range,
    SelectionRange,
    StateEffectType,
    Transaction,
    TransactionSpec,
} from "@codemirror/state";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import type { SkillSection, SkillTask } from "../skill/attempts.ts";
import type { Block, NoteTasks } from "./tasks.ts";
import type { BlockMark } from "../notes/tree.ts";
import type { Attempt, Result, Session } from "../../reader/skill.ts";

/**
 * A step of the round: its block, and whether it is the Task again after a wrong one
 * and the Example of the round, see {@link stepsOf}.
 */
type Step = {
    block: Block;
    again: boolean;
};

/**
 * The round shown, its keys following the heading I type, see {@link headingFollow}.
 *
 * - `seen`: Keys of the steps without a result passed with `Next`:
 *   those before where I stand by the log, with those passed since.
 * - `at`: Key of the current step, pinned while the page shows,
 *   so a result moves nothing, only `Next`; empty for none.
 */
type Round = {
    loaded: NoteTasks;
    section: SkillSection;
    seen: string[];
    at: string;
    changed: () => void;
};

/**
 * The block shown alone, see {@link aloneOf},
 * the only text I may change and select while it shows.
 */
type Alone = {
    from: number;
    to: number;
    heading: string;
    decorations: DecorationSet;
};

/** Effect of `Next` or a click in the tree moving to a block, `null` for none. */
const nextMoved: StateEffectType<{ block: Block; end: number } | null> =
    StateEffect.define<{
        block: Block;
        end: number;
    } | null>();

/** The round shown, `null` for a note that is no section. */
let round: Round | null = null;

/**
 * Heading of a block opened from the tree that is not the current step, as I type it,
 * see {@link headingFollow}, shown alone in its place until `Next`, also after a reload,
 * see {@link openedKeep}; empty for none.
 */
let opened: string = "";

/**
 * Headings of the blocks I had open before, as written, the last one at the end,
 * for Ctrl+Z, see {@link roundBack}; kept with the page in the history of the browser,
 * see {@link openedBeforeKeep},
 * so a reload and the way back from another note find them again.
 */
let openedBefore: string[] = Array.isArray(history.state)
    ? (history.state as string[])
    : [];

/**
 * Whether I came to the page from a note or a file of the editor, by a link or the tree,
 * as the referrer of the page tells, also after a reload and the way back to it,
 * so Ctrl+Z goes back there, see {@link roundBack}; never to Today or another area.
 */
const linked: boolean = ["/scripts?path=", "/edit?file="].some((page: string): boolean =>
    document.referrer.startsWith(`${location.origin}${page}`),
);

/** Keeps {@link openedBefore} with the page in the history of the browser. */
function openedBeforeKeep(): void {
    history.replaceState(openedBefore, "");
}

/** Keeps the block shown in {@link openedBefore} before another one shows. */
function shownRemember(view: EditorView, heading: string): void {
    const before: string = roundShownOf(view);
    if (before !== "" && before !== heading) openedBefore.push(before);
    openedBeforeKeep();
}

/**
 * Takes the block I opened in the section shown,
 * empty for the current step, see {@link opened},
 * and tells the reader, which keeps it in its memory until it restarts,
 * see {@link roundOpenedOf}.
 */
function openedKeep(shown: Round, heading: string): void {
    opened = heading;
    navigator.sendBeacon(
        "/api/skill/opened",
        JSON.stringify({ path: shown.loaded.path, heading: heading }),
    );
}

/** Where to go once the round of today is done: back to Today, see `./today.ts`. */
const todayAddress: string = "/scripts";

/**
 * The block shown alone, `null` for none:
 * built anew when `Next` moves, carried along when the text changes,
 * its start before what I type at it and its end after,
 * so what I type at either belongs to it,
 * its end never past the line break before the hidden text after it,
 * also once its last line went with that line break, see {@link changesKeep}.
 * - {@link StateField}: Only a field may hide whole lines.
 * - `heading`: The heading on the line of its start as it now stands,
 *   `undefined` while that line is none, like `## ` while I retype it,
 *   which keeps the one before.
 */
const alonePlace: StateField<Alone | null> = StateField.define<Alone | null>({
    create: (): Alone | null => null,
    update: (alone: Alone | null, transaction: Transaction): Alone | null => {
        for (const effect of transaction.effects)
            if (effect.is(nextMoved))
                return effect.value === null
                    ? null
                    : aloneOf(transaction.state, effect.value.block, effect.value.end);
        if (alone === null || !transaction.docChanged) return alone;
        const from: number = transaction.changes.mapPos(alone.from, -1);
        const decorations: DecorationSet = alone.decorations.map(transaction.changes);
        let hidden: number = transaction.state.doc.length + 1;
        decorations.between(from, transaction.state.doc.length, (start: number): void => {
            if (start > from) hidden = Math.min(hidden, start);
        });
        const heading: string | undefined = blockRule.exec(
            transaction.state.doc.lineAt(from).text,
        )?.[1];
        return {
            from: from,
            to: Math.min(transaction.changes.mapPos(alone.to, 1), hidden - 1),
            heading: heading ?? alone.heading,
            decorations: decorations,
        };
    },
    provide: (field: StateField<Alone | null>): Extension =>
        EditorView.decorations.from(
            field,
            (alone: Alone | null): DecorationSet => alone?.decorations ?? Decoration.none,
        ),
});

/**
 * Keeps what I type and delete inside the block shown alone:
 * a change reaching beyond it is left out whole, never half, like Delete at its end,
 * which took the line break after it and pulled the hidden text after it into the block,
 * Backspace at the start of its heading, or a cut over a selection reaching past its end;
 * but whole lines taken away with the line break after its last line stand,
 * like the line Ctrl+X cuts with nothing picked, since the text after them only moves up;
 * undo and redo, which CodeMirror never filters, only take back what was allowed.
 */
function changesKeep(transaction: Transaction): boolean {
    const alone: Alone | null = transaction.startState.field(alonePlace);
    let inside: boolean = true;
    if (alone !== null)
        transaction.changes.iterChangedRanges(
            (from: number, to: number, fromB: number, toB: number): void => {
                const lines: boolean =
                    to === alone.to + 1 &&
                    fromB === toB &&
                    from >= alone.from &&
                    transaction.startState.doc.lineAt(from).from === from;
                inside &&= (from >= alone.from && to <= alone.to) || lines;
            },
        );
    return inside;
}

/**
 * Keeps the cursor and what I select inside the block shown alone,
 * so neither reaches the hidden text,
 * like Shift+Down on its last line, Ctrl+A or a drag past its end,
 * or a change that carries them along, like the cut of its last line:
 * a place beyond the block goes to its start or its end.
 * Only where a key, a click, a drag or a change puts them:
 * the cursor left in the block before when another shows, by `Next`, the tree or a link,
 * stays there, unseen and without the focus,
 * see {@link blockOpen}, until I click or move it,
 * so the heading of the next block shows as before.
 */
function selectionKeep(
    transaction: Transaction,
): TransactionSpec | readonly TransactionSpec[] {
    if (transaction.selection === undefined && !transaction.docChanged)
        return transaction;
    const alone: Alone | null = transaction.state.field(alonePlace);
    if (alone === null) return transaction;
    const selection: EditorSelection = transaction.newSelection;
    const inside: (place: number) => number = (place: number): number =>
        Math.min(Math.max(place, alone.from), alone.to);
    const kept: SelectionRange[] = selection.ranges.map(
        (range: SelectionRange): SelectionRange =>
            range.anchor === inside(range.anchor) && range.head === inside(range.head)
                ? range
                : EditorSelection.range(inside(range.anchor), inside(range.head)),
    );
    if (
        kept.every(
            (range: SelectionRange, index: number): boolean =>
                range === selection.ranges[index],
        )
    )
        return transaction;
    return [
        transaction,
        {
            selection: EditorSelection.create(kept, selection.mainIndex),
            sequential: true,
        },
    ];
}

/**
 * Renames where I am as I retype the heading of the block shown, see {@link Alone},
 * so `Next` goes on from that block, never from the first step:
 * the key of the current step while it shows,
 * else the heading of the block opened from the tree, see {@link opened}.
 * The key of a step passed follows too, so the tree marks it as before,
 * unless another block has the old heading, which a heading I retype may pass through.
 * The Task again after its Example follows as the Task does, see {@link keyOf}.
 */
function headingFollow(update: ViewUpdate): void {
    const before: string | undefined = update.startState.field(alonePlace)?.heading;
    const after: string | undefined = update.state.field(alonePlace)?.heading;
    if (round === null || !update.docChanged || after === undefined || after === before)
        return;
    const renamed: (key: string) => string = (key: string): string =>
        key === before ? after : key === `${before} again` ? `${after} again` : key;
    if (opened === "") round.at = renamed(round.at);
    else opened = renamed(opened);
    openedBefore = openedBefore.map(renamed);
    openedBeforeKeep();
    if (
        !blocksOf(update.state, round.loaded.tasks).some(
            (block: Block): boolean => block.heading === before,
        )
    )
        round.seen = round.seen.map(renamed);
}

/**
 * Gives where a block ends: the end of its section,
 * or of its heading line for a block with nothing below it.
 */
function endOf(state: EditorState, block: Block): number {
    return bodyOf(state, block)?.to ?? state.doc.line(block.line).to;
}

/**
 * Shows one block alone, as a card of Today asks:
 * the text before it and after it hidden whole.
 */
function aloneOf(state: EditorState, block: Block, end: number): Alone {
    const start: number = state.doc.line(block.line).from;
    const marks: Range<Decoration>[] = [];
    if (start > 0) marks.push(Decoration.replace({ block: true }).range(0, start - 1));
    if (end < state.doc.length)
        marks.push(Decoration.replace({ block: true }).range(end + 1, state.doc.length));
    return {
        from: start,
        to: end,
        heading: block.heading,
        decorations: Decoration.set(marks),
    };
}

/**
 * Tells whether a block is theory, like a Definition or the Algorithm:
 * one without a task that is no Task, a step of every round, see {@link stepsOf},
 * which the round never folds, see {@link roundTake}.
 */
function theoryIs(block: Block): boolean {
    return block.task === null && !/^(Task|Completion)\./.test(block.heading);
}

/**
 * Gives the steps of the round shown, see the top of this file:
 * round 0 its theory, its Example and its Task;
 * a later round, once its Task is due or the round goes on, its theory and its Task,
 * after a wrong one its Example and the Task again; none for a later round not due.
 */
function stepsOf(blocks: Block[], section: SkillSection): Step[] {
    const step: (block: Block, again: boolean) => Step = (
        block: Block,
        again: boolean,
    ): Step => ({
        block: block,
        again: again,
    });
    const theory: Step[] = blocks
        .filter(theoryIs)
        .map((block: Block): Step => step(block, false));
    const cold: Block | undefined = blocks.find(
        (block: Block): boolean => block.task?.id === section.cold,
    );
    const example: Block | undefined = blocks.find(
        (block: Block): boolean =>
            section.example !== "" && block.task?.id === section.example,
    );
    if (section.ladder)
        return [
            ...theory,
            ...(example === undefined ? [] : [step(example, false)]),
            ...(cold === undefined ? [] : [step(cold, false)]),
        ];
    if (cold === undefined || section.today !== "task") return [];
    return [
        ...theory,
        step(cold, false),
        ...(section.results[0] === "wrong"
            ? [...(example === undefined ? [] : [step(example, false)]), step(cold, true)]
            : []),
    ];
}

/**
 * Gives the key of a step, which names it while the note changes: its heading,
 * for the Task again after its Example with ` again`, so each key is once in a round;
 * the log holds the heading alone, see {@link lineWrite} and {@link resumedOf}.
 */
function keyOf(step: Step): string {
    return step.again ? `${step.block.heading} again` : step.block.heading;
}

/**
 * Tells whether a step has no result of its own, theory like the Algorithm or an Example,
 * so `Next` passes it.
 */
function resultlessIs(step: Step): boolean {
    return step.block.task === null || step.block.task.kind === "example";
}

/**
 * Tells whether a step waits for my result: the Task not done yet, see {@link doneIs},
 * so `Next` stays off on it, and its check, Right, or its cross, Wrong, is the way on,
 * see `judgeOf` in `../skill/task.ts`.
 */
function waitingIs(shown: Round, step: Step): boolean {
    return !resultlessIs(step) && !doneIs(shown, step);
}

/**
 * Finds the step where I stand by the log, its key, see {@link keyOf}:
 * the step of that key; once its heading changed in the note,
 * or two blocks merged into one, the step of the same type word
 * whose heading shares the most words with it;
 * without such a step the last one with an attempt, so I never stand at the start again.
 */
function placeOf(steps: Step[], at: string): number {
    const exact: number = steps.findIndex((step: Step): boolean => keyOf(step) === at);
    if (exact !== -1 || at === "") return exact;
    const wordsOf: (key: string) => [string, string[]] = (
        key: string,
    ): [string, string[]] => [
        kindRule.exec(key)?.[1] ?? "",
        key
            .replace(kindRule, "")
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter((word: string): boolean => word !== ""),
    ];
    const place: [string, string[]] = wordsOf(at);
    const scores: number[] = steps.map((step: Step): number => {
        const [kind, words]: [string, string[]] = wordsOf(keyOf(step));
        const shared: number = words.filter((word: string): boolean =>
            place[1].includes(word),
        ).length;
        return kind !== place[0] ? 0 : shared / new Set([...words, ...place[1]]).size;
    });
    const best: number = Math.max(0, ...scores);
    if (best > 0) return scores.indexOf(best);
    return steps.findLastIndex(
        (step: Step): boolean => (step.block.task?.attempts.length ?? 0) > 0,
    );
}

/**
 * Gives the steps without a result before where I stand, which count as passed,
 * see {@link resultlessIs}, where I stand found also after its heading changed,
 * see {@link placeOf}.
 */
function passedOf(steps: Step[], at: string): string[] {
    const index: number = placeOf(steps, at);
    return steps.slice(0, Math.max(0, index)).filter(resultlessIs).map(keyOf);
}

/**
 * Tells whether a step is done:
 * theory and the Example once passed with `Next`;
 * the Task of round 0 once right, since the first can only succeed;
 * a later Task once it has a result in the round,
 * the Task again once it has a second one.
 */
function doneIs(shown: Round, step: Step): boolean {
    if (resultlessIs(step)) return shown.seen.includes(keyOf(step));
    const results: Result[] = shown.section.results;
    if (shown.section.ladder) return results.includes("right");
    return results.length >= (step.again ? 2 : 1);
}

/** Gives the steps of the round of the note shown. */
function roundStepsOf(view: EditorView, shown: Round): Step[] {
    return stepsOf(blocksOf(view.state, shown.loaded.tasks), shown.section);
}

/**
 * Gives the current step: the one pinned, see {@link Round};
 * none once the round is closed.
 */
function currentOf(shown: Round, steps: Step[]): Step | undefined {
    if (shown.section.closed) return undefined;
    return steps.find((step: Step): boolean => keyOf(step) === shown.at) ?? steps[0];
}

/**
 * Gives the key of the step I stand at by the log, see {@link keyOf}:
 * the heading the log holds, the Task again once the round checked its Example off
 * after a wrong Task, see `used` of `SkillSection`.
 */
function atKeyOf(section: SkillSection): string {
    const again: boolean =
        !section.ladder &&
        section.used &&
        section.results[0] === "wrong" &&
        section.at === `Task. ${section.cold.slice(section.cold.indexOf("/") + 1)}`;
    return again ? `${section.at} again` : section.at;
}

/**
 * Gives where the round goes on when the page opens, from the log alone:
 * from the step of the last `Next`, the first step not done, else that step itself;
 * without a `Next` yet, the first step not done, else the last step.
 */
function resumedOf(shown: Round, steps: Step[]): string {
    const from: number = Math.max(0, placeOf(steps, atKeyOf(shown.section)));
    const step: Step | undefined =
        steps.slice(from).find((candidate: Step): boolean => !doneIs(shown, candidate)) ??
        steps[from] ??
        steps.at(-1);
    return step === undefined ? "" : keyOf(step);
}

/**
 * Gives the module of the round shown,
 * the part of the identities of its tasks before `/`.
 */
function moduleOf(shown: Round): string {
    return shown.loaded.tasks[0]?.id.split("/")[0] ?? "";
}

/**
 * Writes where I stand in the round shown into the log, its line `X-ROUND`,
 * see `RoundLine` in `reader/skill.ts`.
 *
 * @param step - Heading of the step I went on to, or `done` once I closed the round
 * @throws {Error} - When the reader does not write it
 */
async function lineWrite(shown: Round, step: string): Promise<void> {
    const response: Response = await fetch("/api/skill/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            section: `${moduleOf(shown)}/${shown.section.title}`,
            round: shown.section.round,
            step: step,
        }),
    });
    if (!response.ok) throw new Error("The reader did not write the round");
}

/**
 * Gives what a block folds: from the end of its heading line to the end of its section.
 */
function bodyOf(state: EditorState, block: Block): { from: number; to: number } | null {
    const line: Line = state.doc.line(block.line);
    return foldable(state, line.from, line.to);
}

/**
 * Writes the round line, quiet in the grey of the day: only the round, like `Round 1`.
 */
function roundLineOf(shown: Round): string {
    return `Round ${shown.section.round}`;
}

/**
 * Shows beside the round line the session the round writes into, smaller,
 * as the calendar shows an entry: its day and its times,
 * nothing while no session of the module runs,
 * since reading needs none, see `./session.ts`.
 * What it showed stays until the reader answers, so nothing flickers.
 */
function sessionShow(shown: Round): void {
    sessionOf(moduleOf(shown))
        .then((session: Session | null): void => {
            (document.getElementById("editor-session") as HTMLElement).textContent =
                session === null ? "" : sessionTextOf(session);
        })
        .catch((error: unknown): void => console.error(error));
}

/**
 * Gives the block shown alone, where I am:
 * the one opened from the tree, else the current step.
 */
function shownOf(blocks: Block[], current: Step | undefined): Block | undefined {
    return (
        blocks.find((block: Block): boolean => block.heading === opened) ?? current?.block
    );
}

/**
 * Shows the round as it stands.
 * `Next` is on while it goes somewhere:
 * from a block shown from the tree back to the current step,
 * else on from the current step;
 * off and faint on the last step, and on an Example or a Task until it has my result,
 * see {@link waitingIs}, as the close before the round may close;
 * hidden once the round is closed or for a round without steps, as the close.
 */
function roundDraw(view: EditorView, shown: Round): void {
    const steps: Step[] = roundStepsOf(view, shown);
    const current: Step | undefined = currentOf(shown, steps);
    const line: HTMLElement = document.getElementById("editor-round") as HTMLElement;
    const next: HTMLButtonElement = document.getElementById(
        "editor-next",
    ) as HTMLButtonElement;
    (document.getElementById("editor-round-label") as HTMLElement).textContent =
        roundLineOf(shown);
    line.hidden = false;
    sessionShow(shown);
    const alone: Block | undefined = shownOf(
        blocksOf(view.state, shown.loaded.tasks),
        current,
    );
    view.dispatch({
        effects: nextMoved.of(
            alone === undefined ? null : { block: alone, end: endOf(view.state, alone) },
        ),
    });
    next.hidden = current === undefined;
    next.disabled =
        current === undefined ||
        (alone === current.block &&
            (steps.indexOf(current) === steps.length - 1 || waitingIs(shown, current)));
    closeShow(shown, steps);
    shown.changed();
}

/**
 * Opens a block, which then stands alone on the page, and scrolls the page to its top,
 * so the block starts at the top of the screen, once the page is drawn anew.
 * The text gives up the focus, also after a link in it,
 * so the cursor left in the block before stays there unseen, see {@link selectionKeep},
 * and Ctrl+Z goes back to that block, see {@link roundBack},
 * never undoing in it while hidden.
 */
function blockOpen(view: EditorView, block: Block): void {
    const body: { from: number; to: number } | null = bodyOf(view.state, block);
    if (body !== null && foldedAt(view.state, body.from))
        view.dispatch({ effects: unfoldEffect.of(body) });
    view.contentDOM.blur();
    requestAnimationFrame((): void => {
        (document.querySelector(".editor-file") as HTMLElement).scrollTop = 0;
    });
}

/**
 * Goes on from the current step, see the top of this file:
 * from a block shown from the tree, back to the current step;
 * from an Example or a Task without my result not at all, see {@link waitingIs};
 * else, once a session of the module runs,
 * see `sessionEnsure` in `./session.ts`, writes into the log which step comes next,
 * so a step without a result before it counts as passed, and shows it;
 * from the last step not at all.
 * Where I am moves at once;
 * a line the reader does not take shows in the status line, see {@link failShow};
 * without a session, or once the round was shown anew meanwhile,
 * as after a result, nothing moves.
 *
 * @throws {Error} - When the reader cannot say whether a session runs
 */
async function roundNext(view: EditorView): Promise<void> {
    if (round === null) return;
    const shown: Round = round;
    const steps: Step[] = roundStepsOf(view, shown);
    const current: Step | undefined = currentOf(shown, steps);
    if (current === undefined) return;
    const back: boolean = opened !== "" && opened !== current.block.heading;
    if (back) shownRemember(view, current.block.heading);
    if (opened !== "") openedKeep(shown, "");
    if (back) {
        blockOpen(view, current.block);
        roundDraw(view, shown);
        return;
    }
    const following: Step | undefined = steps[steps.indexOf(current) + 1];
    if (following === undefined || waitingIs(shown, current)) return;
    if (!(await sessionEnsure(moduleOf(shown))) || round !== shown) return;
    const passed: boolean = resultlessIs(current) && !shown.seen.includes(keyOf(current));
    if (passed) shown.seen.push(keyOf(current));
    shownRemember(view, following.block.heading);
    shown.at = keyOf(following);
    lineWrite(shown, following.block.heading).catch(failShow);
    blockOpen(view, following.block);
    roundDraw(view, shown);
}

/**
 * Says `Failed` in the status line when the log did not take where I am,
 * as a save that fails says so.
 */
function failShow(error: unknown): void {
    console.error(error);
    (document.getElementById("editor-state") as HTMLElement).textContent = "Failed";
}

/**
 * Shows the close of the round in the head, see {@link roundClose}:
 * a loose icon, a check in a ring, so it never looks like the check of a block,
 * on once the round's Task decided it,
 * off and faint before; hidden once the round is closed or for a round without steps.
 * The Task decides round 0 once it is right, a later round once it is right,
 * also after its Example, or wrong a second time, see `decidedIs` in `reader/skill.ts`,
 * so after Wrong the close stays off until the Task again has its result.
 */
function closeShow(shown: Round, steps: Step[]): void {
    const close: HTMLButtonElement = document.getElementById(
        "editor-close",
    ) as HTMLButtonElement;
    const results: Result[] = shown.section.results;
    close.hidden = shown.section.closed || steps.length === 0;
    close.disabled = !(
        results.at(-1) === "right" ||
        (!shown.section.ladder && results.length >= 2)
    );
}

/**
 * Closes the round shown by hand, the close in the head,
 * once a session of the module runs,
 * see `sessionEnsure` in `./session.ts`: writes `done` where I stand into the log,
 * then shows Today, where the round stands done.
 */
export function roundClose(): void {
    if (round === null) return;
    const shown: Round = round;
    sessionEnsure(moduleOf(shown))
        .then(async (running: boolean): Promise<void> => {
            if (!running) return;
            await lineWrite(shown, "done");
            location.href = todayAddress;
        })
        .catch(failShow);
}

/**
 * Takes the tasks of the note as they load, see `tasksFollow` in `./tasks.ts`:
 * for a section, the first time its round from the log, where it goes on,
 * see {@link resumedOf}, theory, the blocks done and the current one open,
 * the other Examples and Tasks folded, the Task variants not due among them,
 * and where I am pinned to the current step,
 * so a result moves nothing, only `Next`, a click and the check of a Right;
 * each time after, like after a result, the round as it now stands.
 */
function roundTake(view: EditorView, loaded: NoteTasks, changed: () => void): void {
    const section: SkillSection | null = loaded.section;
    if (section === null) {
        round = null;
        return;
    }
    const fresh: boolean = round === null || round.loaded.path !== loaded.path;
    const blocks: Block[] = blocksOf(view.state, loaded.tasks);
    const steps: Step[] = stepsOf(blocks, section);
    round = {
        loaded: loaded,
        section: section,
        changed: changed,
        seen: fresh ? passedOf(steps, atKeyOf(section)) : (round?.seen ?? []),
        at: fresh ? "" : (round?.at ?? ""),
    };
    if (fresh) round.at = resumedOf(round, steps);
    if (fresh) {
        const shown: Round = round;
        const current: Step | undefined = currentOf(shown, steps);
        const open: (block: Block) => boolean = (block: Block): boolean =>
            theoryIs(block) ||
            block === current?.block ||
            steps.some(
                (step: Step): boolean => step.block === block && doneIs(shown, step),
            );
        const effects: StateEffect<{ from: number; to: number }>[] = [];
        blocks.forEach((block: Block): void => {
            const body: { from: number; to: number } | null = bodyOf(view.state, block);
            if (body !== null && !open(block) && !foldedAt(view.state, body.from))
                effects.push(foldEffect.of(body));
        });
        view.dispatch({ effects: effects });
        if (current !== undefined && current.block !== blocks[0])
            blockOpen(view, current.block);
    }
    roundDraw(view, round);
}

/**
 * Gives the places of the blocks of the round shown in their order,
 * every block of the note,
 * for the tree: done, wrong once its last result was wrong,
 * so the tree shows the cross its heading line shows, still to do in the round,
 * the current step among them, or outside it, like a Task variant not due.
 * The tree lights the block shown, see {@link roundShownOf},
 * never the current step for itself:
 * where I am is the block shown, where the round goes on the first one after those done.
 */
export function roundBlocksOf(view: EditorView): [string, BlockMark][] | null {
    if (round === null) return null;
    const shown: Round = round;
    const steps: Step[] = roundStepsOf(view, shown);
    return blocksOf(view.state, shown.loaded.tasks).map(
        (block: Block): [string, BlockMark] => {
            const own: Step[] = steps.filter(
                (step: Step): boolean => step.block.heading === block.heading,
            );
            if (own.length === 0) return [block.heading, "other"];
            if (!own.every((step: Step): boolean => doneIs(shown, step)))
                return [block.heading, "round"];
            const last: Attempt | undefined = block.task?.attempts.at(-1);
            return [block.heading, last?.result === "wrong" ? "wrong" : "done"];
        },
    );
}

/**
 * Gives the heading of the block shown alone, where I am, which the tree lights,
 * also right after a click in the tree shows another block, see {@link shownOf}.
 */
export function roundShownOf(view: EditorView): string {
    if (round === null) return "";
    const shown: Round = round;
    const current: Step | undefined = currentOf(shown, roundStepsOf(view, shown));
    return shownOf(blocksOf(view.state, shown.loaded.tasks), current)?.heading ?? "";
}

/**
 * Tells when the section shown has its next Task,
 * for the line of its Tasks outside the round in the tree,
 * see `roundListOf` in `../notes/tree.ts`:
 * the day its Task comes back, by the rule of the overview,
 * see `dueOf` in `reader/skill.ts`, `Tomorrow` for the day after today,
 * nothing while its Task is due today,
 * since its result decides the day, or no day is known.
 */
export function roundNextOf(): string {
    if (round === null) return "";
    const today: string = round.loaded.today;
    const due: string =
        round.loaded.tasks.find(
            (task: SkillTask): boolean => task.kind === "cold" && task.due !== "",
        )?.due ?? "";
    const [year, month, day]: number[] = today.split("-").map(Number);
    const tomorrow: string = dayOf(new Date(year, month - 1, day + 1));
    if (due <= today) return "";
    return due === tomorrow ? "Tomorrow" : dayTextOf(due, true);
}

/**
 * Shows a block by its heading alone,
 * as its line in the tree or a link to it in the note asks, back or ahead;
 * `Next` returns from it to the current step, which stays where it was;
 * the tree lights the block shown, see {@link roundShownOf}.
 *
 * @param remembered - Whether Ctrl+Z goes back from it to the block shown before,
 *   not for the block a page opens with or one Ctrl+Z goes back to
 */
export function roundHeadingShow(
    view: EditorView,
    heading: string,
    remembered: boolean = true,
): boolean {
    if (round === null) return false;
    const shown: Round = round;
    const block: Block | undefined = blocksOf(view.state, shown.loaded.tasks).find(
        (candidate: Block): boolean => candidate.heading === heading,
    );
    if (block === undefined) return false;
    const current: Step | undefined = currentOf(shown, roundStepsOf(view, shown));
    if (remembered) shownRemember(view, heading);
    openedKeep(shown, current?.block.heading === heading ? "" : heading);
    blockOpen(view, block);
    roundDraw(view, shown);
    return true;
}

/**
 * Goes back to the block I had open before, see {@link openedBefore},
 * as Ctrl+Z asks once the block shown has nothing left to undo,
 * see `historyIn` in `./keys.ts`,
 * or while the focus stands outside the text, see `keyDown` in `./editor.ts`;
 * while I opened none before, back to the note I came from by a link, see {@link linked},
 * as the back button of the browser,
 * which shows the block I left it on, see {@link openedKeep}.
 *
 * @returns Whether it went back, not while I opened none before and came from no note
 */
export function roundBack(view: EditorView): boolean {
    const heading: string | undefined = openedBefore.pop();
    openedBeforeKeep();
    if (heading !== undefined) return roundHeadingShow(view, heading, false);
    if (linked) history.back();
    return linked;
}

/**
 * Gives the block I opened last in a section,
 * as the reader keeps it, see {@link openedKeep}.
 *
 * @returns Heading as written, empty for the current step,
 *   also while I opened none since the reader started
 * @throws {Error} - When the reader cannot be reached
 */
export async function roundOpenedOf(path: string): Promise<string> {
    const response: Response = await fetch(
        `/api/skill/opened?path=${encodeURIComponent(path)}`,
    );
    return response.ok ? ((await response.json()) as string) : "";
}

/**
 * Goes on, see {@link roundNext}, as `Next` in the head and the check of a Right ask;
 * a line the reader does not take shows in the status line, see {@link failShow}.
 */
export function roundGo(view: EditorView): void {
    roundNext(view).catch(failShow);
}

/**
 * Starts the round of the notes the editor shows: it hears each load of their tasks,
 * see {@link roundTake}, and goes on after a Right as `Next` does, see {@link roundGo}.
 * {@link Prec.highest} runs {@link selectionKeep} after the other filters,
 * which move the cursor too, so it has the last word.
 */
export function roundStart(changed: () => void): Extension {
    tasksFollow(
        (view: EditorView, loaded: NoteTasks): void => roundTake(view, loaded, changed),
        roundGo,
    );
    return [
        alonePlace,
        keymap.of([{ key: "Mod-z", run: roundBack }]),
        EditorState.changeFilter.of(changesKeep),
        Prec.highest(EditorState.transactionFilter.of(selectionKeep)),
        EditorView.updateListener.of(headingFollow),
    ];
}
