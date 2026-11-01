/**
 * ## Steps
 *
 * The solutions of a note one step at a time, so I predict each step before I see it.
 * An Example shows none of its steps, its solution from its first numbered line on.
 * A Task solution under `#### Solution…` shows its first step once unfolded.
 * Its steps are its list items in text order, a parent first, and its other blocks.
 * Hiding is only for reading, the cursor in a hidden step shows the whole solution.
 */

import { EditorSelection, EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { foldable, foldedRanges, syntaxTree } from "@codemirror/language";

import type {
    Extension,
    Line,
    Range,
    SelectionRange,
    StateEffectType,
    Transaction,
    TransactionSpec,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { SyntaxNodeRef } from "@lezer/common";

/**
 * A solution shown, of an Example or an unfolded Task.
 * - `heading`: Start of its heading, which names it while the text changes.
 * - `steps`: The step of each of its lines, from 0.
 * - `initial`: Steps shown at first, none for an Example, one for a Task.
 */
type Solution = {
    heading: number;
    to: number;
    first: number;
    steps: number[];
    count: number;
    initial: number;
};

/**
 * The steps of the note.
 * - `shown`: Steps shown of each solution, by the start of its heading.
 */
type Steps = {
    shown: Map<number, number>;
    decorations: DecorationSet;
};

/** A click on `Next step`, or `Show all` for `all`, below the solution ending at `at`. */
type More = {
    at: number;
    all: boolean;
};

/** Heading of a solution, as the scripts view folds it. */
export const solutionRule: RegExp = /^####[ \t]+Solution\b/;

const exampleRule: RegExp = /^##[ \t]+Example\./;

/** First line of the solution of an Example. */
const stepRule: RegExp = /^\d+\.\s/;

/** Lists, whose items are steps of their own. */
const lists: string[] = ["BulletList", "OrderedList"];

const hidden: Decoration = Decoration.replace({});

/** Effect of a click on `Next step` or `Show all`. */
const stepsMore: StateEffectType<More> = StateEffect.define<More>();

/** `Next step` and `Show all` below a solution with steps hidden. */
class StepsWidget extends WidgetType {
    /** All buttons are the same, so drawn ones stay, as a click finds its solution by their place. */
    override eq(): boolean {
        return true;
    }

    toDOM(view: EditorView): HTMLElement {
        const buttons: HTMLElement = document.createElement("div");
        const next: HTMLButtonElement = document.createElement("button");
        const all: HTMLButtonElement = document.createElement("button");
        const more: (all: boolean) => void = (all: boolean): void => {
            view.dispatch({
                effects: stepsMore.of({ at: view.posAtDOM(buttons), all: all }),
            });
        };
        buttons.className = "steps-buttons";
        next.type = "button";
        next.textContent = "Next step";
        next.addEventListener("click", (): void => more(false));
        all.type = "button";
        all.textContent = "Show all";
        all.addEventListener("click", (): void => more(true));
        buttons.append(next, all);
        return buttons;
    }

    /** Keeps clicks from the editor, which would put the cursor there. */
    override ignoreEvent(): boolean {
        return true;
    }
}

/** An empty line between two steps goes with the step after it. */
function solutionOf(state: EditorState, heading: Line, start: Line, to: number, initial: number): Solution {
    const first: number = start.number;
    const last: number = state.doc.lineAt(to).number;
    const steps: number[] = Array<number>(last - first + 1).fill(-1);
    let count: number = 0;
    syntaxTree(state).iterate({
        from: start.from,
        to: to,
        enter: (node: SyntaxNodeRef): boolean => {
            if (
                node.from >= start.from &&
                (node.name === "ListItem" || (node.node.parent?.name === "Document" && !lists.includes(node.name)))
            ) {
                for (
                    let number: number = state.doc.lineAt(node.from).number;
                    number <= state.doc.lineAt(node.to).number;
                    number++
                )
                    steps[number - first] = count;
                count++;
            }
            return true;
        },
    });
    for (let index: number = steps.length - 1, next: number = count; index >= 0; index--) {
        if (steps[index] === -1) steps[index] = next;
        next = steps[index];
    }
    return {
        heading: heading.from,
        to: to,
        first: first,
        steps: steps,
        count: count,
        initial: initial,
    };
}

/** Whether a fold starts at a place, like a heading's section at the end of its line. */
export function foldedAt(state: EditorState, from: number): boolean {
    let found: boolean = false;
    foldedRanges(state).between(from, from, (start: number): void => {
        found ||= start === from;
    });
    return found;
}

/** First line of the solution of an Example, `null` without steps. */
function exampleStartOf(state: EditorState, heading: Line, to: number): Line | null {
    for (let number: number = heading.number + 1; number <= state.doc.lineAt(to).number; number++) {
        const line: Line = state.doc.line(number);
        if (stepRule.test(line.text)) return line;
    }
    return null;
}

/** Solutions of each Example and each unfolded Task. */
function solutionsOf(state: EditorState): Solution[] {
    const solutions: Solution[] = [];
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const line: Line = state.doc.line(number);
        const example: boolean = exampleRule.test(line.text);
        const section: { from: number; to: number } | null =
            example || solutionRule.test(line.text) ? foldable(state, line.from, line.to) : null;
        if (section === null || foldedAt(state, line.to)) continue;
        const start: Line | null = example ? exampleStartOf(state, line, section.to) : state.doc.line(number + 1);
        if (start !== null) solutions.push(solutionOf(state, line, start, section.to, example ? 0 : 1));
    }
    return solutions;
}

/**
 * Whether the solution of an Example is open, once a step shows, like an unfolded Task.
 * Open also without steps, `null` for no Example.
 */
export function exampleOpenOf(state: EditorState, heading: Line): boolean | null {
    if (!exampleRule.test(heading.text)) return null;
    const section: { from: number; to: number } | null = foldable(state, heading.from, heading.to);
    return (
        section === null ||
        exampleStartOf(state, heading, section.to) === null ||
        (state.field(hiddenSteps, false)?.shown.get(heading.from) ?? 0) > 0
    );
}

export function stepsMoreIs(transaction: Transaction): boolean {
    return transaction.effects.some((effect: StateEffect<unknown>): boolean => effect.is(stepsMore));
}

/** Runs of hidden lines, each from the end of the line above, so line breaks go too. */
function hiddenOf(state: EditorState, solution: Solution, shown: number): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    solution.steps.forEach((step: number, index: number): void => {
        if (step < shown) return;
        const line: Line = state.doc.line(solution.first + index);
        const above: number = state.doc.line(line.number - 1).to;
        const last: { from: number; to: number } | undefined = ranges.at(-1);
        if (last?.to === above) last.to = line.to;
        else ranges.push({ from: above, to: line.to });
    });
    return ranges;
}

/** Hidden steps and the buttons below each solution. */
function decorationsOf(state: EditorState, solutions: Solution[], shown: Map<number, number>): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    solutions.forEach((solution: Solution): void => {
        const ranges: { from: number; to: number }[] = hiddenOf(
            state,
            solution,
            shown.get(solution.heading) ?? solution.initial,
        );
        if (ranges.length === 0) return;
        decorations.push(
            ...ranges.map((range: { from: number; to: number }): Range<Decoration> =>
                hidden.range(range.from, range.to),
            ),
        );
        decorations.push(Decoration.widget({ widget: new StepsWidget(), block: true, side: 1 }).range(solution.to));
    });
    return Decoration.set(decorations, true);
}

/**
 * One step more or all for a click, all once the cursor goes into a hidden step.
 * Built again when the text, the cursor, the syntax tree, the folds change.
 */
function stepsUpdate(steps: Steps, transaction: Transaction): Steps {
    const clicks: StateEffect<More>[] = transaction.effects.filter(
        (effect: StateEffect<unknown>): effect is StateEffect<More> => effect.is(stepsMore),
    );
    if (
        clicks.length === 0 &&
        !transaction.docChanged &&
        transaction.selection === undefined &&
        syntaxTree(transaction.state) === syntaxTree(transaction.startState) &&
        foldedRanges(transaction.state) === foldedRanges(transaction.startState)
    )
        return steps;

    const state: EditorState = transaction.state;
    const shown: Map<number, number> = new Map(
        [...steps.shown].map(([heading, count]: [number, number]): [number, number] => [
            transaction.changes.mapPos(heading),
            count,
        ]),
    );
    const solutions: Solution[] = solutionsOf(state);
    clicks.forEach((click: StateEffect<More>): void => {
        const solution: Solution | undefined = solutions.find(
            (candidate: Solution): boolean => candidate.heading < click.value.at && click.value.at <= candidate.to,
        );
        if (solution !== undefined)
            shown.set(
                solution.heading,
                click.value.all ? Infinity : (shown.get(solution.heading) ?? solution.initial) + 1,
            );
    });
    const head: number = state.selection.main.head;
    const entered: Solution | undefined =
        transaction.selection === undefined
            ? undefined
            : solutions.find((solution: Solution): boolean =>
                  hiddenOf(state, solution, shown.get(solution.heading) ?? solution.initial).some(
                      (range: { from: number; to: number }): boolean => range.from < head && head <= range.to,
                  ),
              );
    if (entered !== undefined) shown.set(entered.heading, Infinity);
    return { shown: shown, decorations: decorationsOf(state, solutions, shown) };
}

/** A field, since only a field may hide line breaks. */
const hiddenSteps: StateField<Steps> = StateField.define<Steps>({
    create: (state: EditorState): Steps => ({
        shown: new Map(),
        decorations: decorationsOf(state, solutionsOf(state), new Map()),
    }),
    update: stepsUpdate,
    provide: (field: StateField<Steps>): Extension =>
        EditorView.decorations.from(field, (value: Steps): DecorationSet => value.decorations),
});

/**
 * Keeps the cursor at the end of the last step shown, not after the hidden steps on that line,
 * so what I type shows where I type it.
 */
function endAvoid(transaction: Transaction): TransactionSpec | readonly TransactionSpec[] {
    if (transaction.selection === undefined || transaction.docChanged) return transaction;
    const ends: Map<number, number> = new Map();
    transaction.startState
        .field(hiddenSteps)
        .decorations.between(
            0,
            transaction.startState.doc.length,
            (from: number, to: number, value: Decoration): void => {
                if (value === hidden) ends.set(to, from);
            },
        );
    const selection: EditorSelection = transaction.selection;
    const moved: SelectionRange[] = selection.ranges.map((range: SelectionRange): SelectionRange => {
        const start: number | undefined = range.empty ? ends.get(range.head) : undefined;
        return start === undefined ? range : EditorSelection.cursor(start);
    });
    if (moved.every((range: SelectionRange, index: number): boolean => range === selection.ranges[index]))
        return transaction;
    return [
        transaction,
        {
            selection: EditorSelection.create(moved, selection.mainIndex),
            sequential: true,
        },
    ];
}

/** The steps of the solutions of a note. */
export const solutionSteps: Extension = [hiddenSteps, EditorState.transactionFilter.of(endAvoid)];
