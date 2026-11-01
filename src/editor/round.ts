/**
 * ## Round
 *
 * The round of a section, a note with tasks of the semester, never changing its text.
 * Only the current step stands on the page, the text around it hidden.
 * Every other Example and Task is folded, theory only by my hand.
 * The whole note shows while the round has no step, like once it is closed.
 * `Next` checks off a block without a result and opens the next, the Task waits for my result.
 * Every round starts with all theory in note order, so what a Task uses stands defined before it.
 * - Round 0: The first Example, its steps one by one, then one Task until it is right.
 * - Later: Only the Task of the round once due, a wrong one bringing the next unused Example and the Task again.
 * The Task decides the round, and the reader writes the day of the next one.
 * Where I am lives in the log alone, the line `X-ROUND` of the section, so a round goes on another day.
 * The round folds only whole blocks, a `####` section only by my hand.
 * A round closes only by hand, `Next` and the close write only in a session of the module.
 * I write only in the block shown, so no key or cut or drag takes the hidden text away.
 */

import { EditorSelection, EditorState, Prec, StateEffect, StateField } from "@codemirror/state";
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

/** A step of the round, `again` for the Task after a wrong one and the Example. */
type Step = {
    block: Block;
    again: boolean;
};

/**
 * The round shown.
 * - `seen`: Keys of the steps without a result passed with `Next`.
 * - `at`: Key of the current step, pinned while the page shows, so a result moves nothing.
 */
type Round = {
    loaded: NoteTasks;
    section: SkillSection;
    seen: string[];
    at: string;
    changed: () => void;
};

/** The block shown alone, the only text I may change and select. */
type Alone = {
    from: number;
    to: number;
    heading: string;
    decorations: DecorationSet;
};

/** Effect of `Next` or a click in the tree moving to a block, `null` for none. */
const nextMoved: StateEffectType<{ block: Block; end: number } | null> = StateEffect.define<{
    block: Block;
    end: number;
} | null>();

/** The round shown, `null` for a note that is no section. */
let round: Round | null = null;

/** Heading of a block opened from the tree that is not the current step, shown until `Next`. */
let opened: string = "";

/**
 * Headings of the blocks I had open before, for Ctrl+Z.
 * Kept in the browser history, so a reload and the way back find them again.
 */
let openedBefore: string[] = Array.isArray(history.state) ? (history.state as string[]) : [];

/** Whether I came from a note or file of the editor, so Ctrl+Z goes back there, never to Today. */
const linked: boolean = ["/scripts?path=", "/edit?file="].some((page: string): boolean =>
    document.referrer.startsWith(`${location.origin}${page}`),
);

function openedBeforeKeep(): void {
    history.replaceState(openedBefore, "");
}

/** Keeps the block shown in {@link openedBefore} before another one shows. */
function shownRemember(view: EditorView, heading: string): void {
    const before: string = roundShownOf(view);
    if (before !== "" && before !== heading) openedBefore.push(before);
    openedBeforeKeep();
}

/** Takes the block I opened, empty for the current step, the reader keeping it until it restarts. */
function openedKeep(shown: Round, heading: string): void {
    opened = heading;
    navigator.sendBeacon("/api/skill/opened", JSON.stringify({ path: shown.loaded.path, heading: heading }));
}

/** Today, where to go once the round is done. */
const todayAddress: string = "/scripts";

/**
 * The block shown alone, a field since only a field may hide whole lines.
 * What I type at its start or end belongs to it.
 * Its end never passes the line break before the hidden text after it.
 * Its heading keeps the one before while its line is none, like `## ` while I retype it.
 */
const alonePlace: StateField<Alone | null> = StateField.define<Alone | null>({
    create: (): Alone | null => null,
    update: (alone: Alone | null, transaction: Transaction): Alone | null => {
        for (const effect of transaction.effects)
            if (effect.is(nextMoved))
                return effect.value === null ? null : aloneOf(transaction.state, effect.value.block, effect.value.end);
        if (alone === null || !transaction.docChanged) return alone;
        const from: number = transaction.changes.mapPos(alone.from, -1);
        const decorations: DecorationSet = alone.decorations.map(transaction.changes);
        let hidden: number = transaction.state.doc.length + 1;
        decorations.between(from, transaction.state.doc.length, (start: number): void => {
            if (start > from) hidden = Math.min(hidden, start);
        });
        const heading: string | undefined = blockRule.exec(transaction.state.doc.lineAt(from).text)?.[1];
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
 * Keeps changes inside the block shown, one reaching beyond it left out whole.
 * Delete at its end would pull the hidden text after it into the block.
 * Whole lines cut with the line break after the last line stand, since the text after only moves up.
 * Undo and redo, which CodeMirror never filters, only take back what was allowed.
 */
function changesKeep(transaction: Transaction): boolean {
    const alone: Alone | null = transaction.startState.field(alonePlace);
    let inside: boolean = true;
    if (alone !== null)
        transaction.changes.iterChangedRanges((from: number, to: number, fromB: number, toB: number): void => {
            const lines: boolean =
                to === alone.to + 1 &&
                fromB === toB &&
                from >= alone.from &&
                transaction.startState.doc.lineAt(from).from === from;
            inside &&= (from >= alone.from && to <= alone.to) || lines;
        });
    return inside;
}

/**
 * Keeps the cursor and selection inside the block shown, like after Ctrl+A or a drag past its end.
 * Only where a key or click or drag or change puts them.
 * The cursor left in the block before stays there unseen, so the next heading shows as before.
 */
function selectionKeep(transaction: Transaction): TransactionSpec | readonly TransactionSpec[] {
    if (transaction.selection === undefined && !transaction.docChanged) return transaction;
    const alone: Alone | null = transaction.state.field(alonePlace);
    if (alone === null) return transaction;
    const selection: EditorSelection = transaction.newSelection;
    const inside: (place: number) => number = (place: number): number =>
        Math.min(Math.max(place, alone.from), alone.to);
    const kept: SelectionRange[] = selection.ranges.map((range: SelectionRange): SelectionRange =>
        range.anchor === inside(range.anchor) && range.head === inside(range.head)
            ? range
            : EditorSelection.range(inside(range.anchor), inside(range.head)),
    );
    if (kept.every((range: SelectionRange, index: number): boolean => range === selection.ranges[index]))
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
 * Renames where I am as I retype the heading shown, so `Next` never goes on from the first step.
 * A passed step follows too, unless another block has the old heading a retyped one may pass through.
 */
function headingFollow(update: ViewUpdate): void {
    const before: string | undefined = update.startState.field(alonePlace)?.heading;
    const after: string | undefined = update.state.field(alonePlace)?.heading;
    if (round === null || !update.docChanged || after === undefined || after === before) return;
    const renamed: (key: string) => string = (key: string): string =>
        key === before ? after : key === `${before} again` ? `${after} again` : key;
    if (opened === "") round.at = renamed(round.at);
    else opened = renamed(opened);
    openedBefore = openedBefore.map(renamed);
    openedBeforeKeep();
    if (!blocksOf(update.state, round.loaded.tasks).some((block: Block): boolean => block.heading === before))
        round.seen = round.seen.map(renamed);
}

/** End of the section of a block, or of its heading line with nothing below. */
function endOf(state: EditorState, block: Block): number {
    return bodyOf(state, block)?.to ?? state.doc.line(block.line).to;
}

/** One block alone, the text before and after it hidden. */
function aloneOf(state: EditorState, block: Block, end: number): Alone {
    const start: number = state.doc.line(block.line).from;
    const marks: Range<Decoration>[] = [];
    if (start > 0) marks.push(Decoration.replace({ block: true }).range(0, start - 1));
    if (end < state.doc.length) marks.push(Decoration.replace({ block: true }).range(end + 1, state.doc.length));
    return {
        from: start,
        to: end,
        heading: block.heading,
        decorations: Decoration.set(marks),
    };
}

/** Theory, like a Definition or the Algorithm, a block without a task that is no Task. */
function theoryIs(block: Block): boolean {
    return block.task === null && !/^(Task|Completion)\./.test(block.heading);
}

/** Steps of the round, none for a later round not due. */
function stepsOf(blocks: Block[], section: SkillSection): Step[] {
    const step: (block: Block, again: boolean) => Step = (block: Block, again: boolean): Step => ({
        block: block,
        again: again,
    });
    const theory: Step[] = blocks.filter(theoryIs).map((block: Block): Step => step(block, false));
    const cold: Block | undefined = blocks.find((block: Block): boolean => block.task?.id === section.cold);
    const example: Block | undefined = blocks.find(
        (block: Block): boolean => section.example !== "" && block.task?.id === section.example,
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

/** Key of a step, its heading, ` again` added for the Task again, so each key is once in a round. */
function keyOf(step: Step): string {
    return step.again ? `${step.block.heading} again` : step.block.heading;
}

/** Theory or an Example, a step `Next` passes. */
function resultlessIs(step: Step): boolean {
    return step.block.task === null || step.block.task.kind === "example";
}

/** The Task not done yet, `Next` off on it until Right or Wrong. */
function waitingIs(shown: Round, step: Step): boolean {
    return !resultlessIs(step) && !doneIs(shown, step);
}

/**
 * The step of a key from the log.
 * Once its heading changed, the step of the same type word sharing the most words.
 * Else the last one with an attempt, so I never stand at the start again.
 */
function placeOf(steps: Step[], at: string): number {
    const exact: number = steps.findIndex((step: Step): boolean => keyOf(step) === at);
    if (exact !== -1 || at === "") return exact;
    const wordsOf: (key: string) => [string, string[]] = (key: string): [string, string[]] => [
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
        const shared: number = words.filter((word: string): boolean => place[1].includes(word)).length;
        return kind !== place[0] ? 0 : shared / new Set([...words, ...place[1]]).size;
    });
    const best: number = Math.max(0, ...scores);
    if (best > 0) return scores.indexOf(best);
    return steps.findLastIndex((step: Step): boolean => (step.block.task?.attempts.length ?? 0) > 0);
}

/** Steps without a result before where I stand, which count as passed. */
function passedOf(steps: Step[], at: string): string[] {
    const index: number = placeOf(steps, at);
    return steps.slice(0, Math.max(0, index)).filter(resultlessIs).map(keyOf);
}

/**
 * Whether a step is done, theory and the Example once passed with `Next`.
 * The Task of round 0 once right, since the first can only succeed.
 * A later Task once it has a result, the Task again once it has a second.
 */
function doneIs(shown: Round, step: Step): boolean {
    if (resultlessIs(step)) return shown.seen.includes(keyOf(step));
    const results: Result[] = shown.section.results;
    if (shown.section.ladder) return results.includes("right");
    return results.length >= (step.again ? 2 : 1);
}

function roundStepsOf(view: EditorView, shown: Round): Step[] {
    return stepsOf(blocksOf(view.state, shown.loaded.tasks), shown.section);
}

/** The step pinned, none once the round is closed. */
function currentOf(shown: Round, steps: Step[]): Step | undefined {
    if (shown.section.closed) return undefined;
    return steps.find((step: Step): boolean => keyOf(step) === shown.at) ?? steps[0];
}

/** Key of the step by the log, the Task again once its Example is used after a wrong Task. */
function atKeyOf(section: SkillSection): string {
    const again: boolean =
        !section.ladder &&
        section.used &&
        section.results[0] === "wrong" &&
        section.at === `Task. ${section.cold.slice(section.cold.indexOf("/") + 1)}`;
    return again ? `${section.at} again` : section.at;
}

/** Where the round goes on, from the last `Next` the first step not done, else that step or the last. */
function resumedOf(shown: Round, steps: Step[]): string {
    const from: number = Math.max(0, placeOf(steps, atKeyOf(shown.section)));
    const step: Step | undefined =
        steps.slice(from).find((candidate: Step): boolean => !doneIs(shown, candidate)) ?? steps[from] ?? steps.at(-1);
    return step === undefined ? "" : keyOf(step);
}

/** The module, the part of task identities before `/`. */
function moduleOf(shown: Round): string {
    return shown.loaded.tasks[0]?.id.split("/")[0] ?? "";
}

/**
 * Writes where I stand into the line `X-ROUND` of the log.
 *
 * @param step - Heading of the next step, or `done` once I closed the round
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

/** What a block folds, from the end of its heading line to the end of its section. */
function bodyOf(state: EditorState, block: Block): { from: number; to: number } | null {
    const line: Line = state.doc.line(block.line);
    return foldable(state, line.from, line.to);
}

function roundLineOf(shown: Round): string {
    return `Round ${shown.section.round}`;
}

/**
 * Shows the session the round writes into, nothing while none runs.
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

/** The block shown, the one opened from the tree, else the current step. */
function shownOf(blocks: Block[], current: Step | undefined): Block | undefined {
    return blocks.find((block: Block): boolean => block.heading === opened) ?? current?.block;
}

/**
 * Shows the round, `Next` on while it goes somewhere.
 * `Next` is off on the last step and on a Task until my result, hidden once the round is closed.
 */
function roundDraw(view: EditorView, shown: Round): void {
    const steps: Step[] = roundStepsOf(view, shown);
    const current: Step | undefined = currentOf(shown, steps);
    const line: HTMLElement = document.getElementById("editor-round") as HTMLElement;
    const next: HTMLButtonElement = document.getElementById("editor-next") as HTMLButtonElement;
    (document.getElementById("editor-round-label") as HTMLElement).textContent = roundLineOf(shown);
    line.hidden = false;
    sessionShow(shown);
    const alone: Block | undefined = shownOf(blocksOf(view.state, shown.loaded.tasks), current);
    view.dispatch({
        effects: nextMoved.of(alone === undefined ? null : { block: alone, end: endOf(view.state, alone) }),
    });
    next.hidden = current === undefined;
    next.disabled =
        current === undefined ||
        (alone === current.block && (steps.indexOf(current) === steps.length - 1 || waitingIs(shown, current)));
    closeShow(shown, steps);
    shown.changed();
}

/**
 * Opens a block, scrolled to the top once the page is drawn anew.
 * The text gives up the focus, so Ctrl+Z goes back to the block before, never undoing in it while hidden.
 */
function blockOpen(view: EditorView, block: Block): void {
    const body: { from: number; to: number } | null = bodyOf(view.state, block);
    if (body !== null && foldedAt(view.state, body.from)) view.dispatch({ effects: unfoldEffect.of(body) });
    view.contentDOM.blur();
    requestAnimationFrame((): void => {
        (document.querySelector(".editor-file") as HTMLElement).scrollTop = 0;
    });
}

/**
 * Goes on, from a block opened from the tree back to the current step.
 * Else, once a session runs, writes the next step into the log and shows it.
 * Without a session, or once the round was shown anew meanwhile, nothing moves.
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

/** `Failed` in the status line when the log did not take where I am. */
function failShow(error: unknown): void {
    console.error(error);
    (document.getElementById("editor-state") as HTMLElement).textContent = "Failed";
}

/**
 * The close of the round, on once the Task decided it.
 * The Task decides once right, or in a later round wrong a second time.
 */
function closeShow(shown: Round, steps: Step[]): void {
    const close: HTMLButtonElement = document.getElementById("editor-close") as HTMLButtonElement;
    const results: Result[] = shown.section.results;
    close.hidden = shown.section.closed || steps.length === 0;
    close.disabled = !(results.at(-1) === "right" || (!shown.section.ladder && results.length >= 2));
}

/** Closes the round once a session runs, writing `done` into the log, then shows Today. */
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
 * Takes the tasks of the note as they load.
 * The first time, the round from the log, with theory and done blocks and the current one open.
 * The rest folds.
 * Each time after, like after a result, the round as it now stands.
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
            steps.some((step: Step): boolean => step.block === block && doneIs(shown, step));
        const effects: StateEffect<{ from: number; to: number }>[] = [];
        blocks.forEach((block: Block): void => {
            const body: { from: number; to: number } | null = bodyOf(view.state, block);
            if (body !== null && !open(block) && !foldedAt(view.state, body.from)) effects.push(foldEffect.of(body));
        });
        view.dispatch({ effects: effects });
        if (current !== undefined && current.block !== blocks[0]) blockOpen(view, current.block);
    }
    roundDraw(view, round);
}

/** Mark of every block of the note for the tree, wrong once its last result was wrong. */
export function roundBlocksOf(view: EditorView): [string, BlockMark][] | null {
    if (round === null) return null;
    const shown: Round = round;
    const steps: Step[] = roundStepsOf(view, shown);
    return blocksOf(view.state, shown.loaded.tasks).map((block: Block): [string, BlockMark] => {
        const own: Step[] = steps.filter((step: Step): boolean => step.block.heading === block.heading);
        if (own.length === 0) return [block.heading, "other"];
        if (!own.every((step: Step): boolean => doneIs(shown, step))) return [block.heading, "round"];
        const last: Attempt | undefined = block.task?.attempts.at(-1);
        return [block.heading, last?.result === "wrong" ? "wrong" : "done"];
    });
}

/** Heading of the block shown, which the tree lights. */
export function roundShownOf(view: EditorView): string {
    if (round === null) return "";
    const shown: Round = round;
    const current: Step | undefined = currentOf(shown, roundStepsOf(view, shown));
    return shownOf(blocksOf(view.state, shown.loaded.tasks), current)?.heading ?? "";
}

/** Day the next Task comes back, nothing while it is due today, since its result decides the day. */
export function roundNextOf(): string {
    if (round === null) return "";
    const today: string = round.loaded.today;
    const due: string =
        round.loaded.tasks.find((task: SkillTask): boolean => task.kind === "cold" && task.due !== "")?.due ?? "";
    const [year, month, day]: number[] = today.split("-").map(Number);
    const tomorrow: string = dayOf(new Date(year, month - 1, day + 1));
    if (due <= today) return "";
    return due === tomorrow ? "Tomorrow" : dayTextOf(due, true);
}

/**
 * Shows a block by its heading, `Next` returning to the current step.
 *
 * @param remembered - Whether Ctrl+Z goes back from it to the block shown before
 */
export function roundHeadingShow(view: EditorView, heading: string, remembered: boolean = true): boolean {
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
 * Goes back to the block I had open before, as Ctrl+Z with nothing left to undo.
 * With none before, back to the note I came from by a link.
 */
export function roundBack(view: EditorView): boolean {
    const heading: string | undefined = openedBefore.pop();
    openedBeforeKeep();
    if (heading !== undefined) return roundHeadingShow(view, heading, false);
    if (linked) history.back();
    return linked;
}

/**
 * Heading of the block I opened last in a section, empty for the current step.
 *
 * @throws {Error} - When the reader cannot be reached
 */
export async function roundOpenedOf(path: string): Promise<string> {
    const response: Response = await fetch(`/api/skill/opened?path=${encodeURIComponent(path)}`);
    return response.ok ? ((await response.json()) as string) : "";
}

/** Goes on, as `Next` and the check of a Right ask. */
export function roundGo(view: EditorView): void {
    roundNext(view).catch(failShow);
}

/**
 * Starts the round of the notes the editor shows.
 * {@link Prec.highest} runs {@link selectionKeep} after the other filters that move the cursor,
 * so it has the last word.
 */
export function roundStart(changed: () => void): Extension {
    tasksFollow((view: EditorView, loaded: NoteTasks): void => roundTake(view, loaded, changed), roundGo);
    return [
        alonePlace,
        keymap.of([{ key: "Mod-z", run: roundBack }]),
        EditorState.changeFilter.of(changesKeep),
        Prec.highest(EditorState.transactionFilter.of(selectionKeep)),
        EditorView.updateListener.of(headingFollow),
    ];
}
