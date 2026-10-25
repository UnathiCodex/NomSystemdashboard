/**
 * ## Steps
 *
 * The solutions of a note in the editor one step at a time, so I predict each step before I see it:
 * an Example, `## Example. …`, shows its scene and question and none of its steps,
 * its solution from its first numbered line, like `1. Find the weights $a_i$`, to its end;
 * a solution of a Task, the section under `#### Solution…`, shows its first step once unfolded.
 * Below a solution `Next step` shows the next one and `Show all` the rest.
 * Its steps are the items of its lists in the order of the text, a parent before its own items,
 * and its other blocks, like a formula of its own or the answer in words;
 * an empty line between two steps goes with the step after it.
 * Hiding is only for reading:
 * the text stays as it is, the cursor stays at the end of the last step shown, also after End,
 * and the cursor going into a hidden step,
 * like by the arrow keys or a new line, shows the whole solution, so I edit it as before.
 *
 * - `@codemirror/state`, `@codemirror/view`:
 *   Hold how many steps of each solution show, hide the others,
 *   and draw the buttons below the solution as a widget.
 * - `@codemirror/language`:
 *   Gives the syntax tree of the note, the section of a solution and whether it is folded.
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
 * A solution of the note shown, that of an Example or the unfolded one of a Task.
 *
 * - `heading`: Start of its heading, `## Example. …` or `#### Solution…`,
 *   which names it while the text around it changes.
 * - `to`: End of its section, below which its buttons stand.
 * - `first`: Number of its first line.
 * - `steps`: For each of its lines from the first, the number of the step it belongs to, from 0.
 * - `count`: Number of its steps.
 * - `initial`: How many of its steps show at first: none of an Example, one of a Task,
 *   whose unfolding asked for it.
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
 *
 * - `shown`: How many steps of each solution show, by the start of its heading;
 *   its `initial` for a solution not in it.
 * - `decorations`: The hidden steps and the buttons below each solution with steps hidden.
 */
type Steps = {
    shown: Map<number, number>;
    decorations: DecorationSet;
};

/**
 * A click on `Next step`, or on `Show all` for `all`, below the solution that ends at `at`.
 */
type More = {
    at: number;
    all: boolean;
};

/**
 * Heading of a solution, like `#### Solution` or `#### Solution (own, unchecked)`,
 * as the scripts view folds it.
 */
export const solutionRule: RegExp = /^####[ \t]+Solution\b/;

/**
 * Heading of an Example, `## Example.`.
 */
const exampleRule: RegExp = /^##[ \t]+Example\./;

/**
 * First line of the solution of an Example, its first numbered line,
 * like `1. Find the weights $a_i$`.
 */
const stepRule: RegExp = /^\d+\.\s/;

/**
 * Lists, whose items are steps of their own.
 */
const lists: string[] = ["BulletList", "OrderedList"];

/**
 * Hidden steps.
 */
const hidden: Decoration = Decoration.replace({});

/**
 * Effect of a click on `Next step` or `Show all`.
 */
const stepsMore: StateEffectType<More> = StateEffect.define<More>();

/**
 * `Next step` and `Show all` below a solution with steps hidden; a click shows one step more
 * or all of them.
 */
class StepsWidget extends WidgetType {
    /**
     * Tells that the buttons of another solution are the same, so the drawn ones stay,
     * as a click finds its solution by their place.
     */
    override eq(): boolean {
        return true;
    }

    /**
     * Builds the buttons.
     * - `buttons`: Row of `Next step` and `Show all`.
     * - `more`: Tells the solution below which the buttons stand to show one step more, or all.
     */
    toDOM(view: EditorView): HTMLElement {
        const buttons: HTMLElement = document.createElement("div");
        const next: HTMLButtonElement = document.createElement("button");
        const all: HTMLButtonElement = document.createElement("button");
        const more: (all: boolean) => void = (all: boolean): void => {
            view.dispatch({ effects: stepsMore.of({ at: view.posAtDOM(buttons), all: all }) });
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

    /**
     * Keeps clicks on the buttons from the editor, which would put the cursor there.
     */
    override ignoreEvent(): boolean {
        return true;
    }
}

/**
 * Finds the steps of a solution, see the top of this file.
 * - `last`: Number of its last line.
 * - `count`: Steps found so far.
 * - `next`: Step of the line below, for a line of no step.
 *
 * @param state - Text and syntax tree of the note
 * @param heading - Line of its heading
 * @param start - Its first line
 * @param to - End of its section
 * @param initial - How many of its steps show at first
 * @returns The solution
 */
function solutionOf(
    state: EditorState,
    heading: Line,
    start: Line,
    to: number,
    initial: number,
): Solution {
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
                (node.name === "ListItem" ||
                    (node.node.parent?.name === "Document" && !lists.includes(node.name)))
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

/**
 * Tells whether something folded starts at a place,
 * like the section of a heading at the end of its line.
 *
 * @param state - Folds of the note
 * @param from - The place
 * @returns Whether it is folded
 */
export function foldedAt(state: EditorState, from: number): boolean {
    let found: boolean = false;
    foldedRanges(state).between(from, from, (start: number): void => {
        found ||= start === from;
    });
    return found;
}

/**
 * Gives the first line of the solution of an Example, its first numbered line,
 * see {@link stepRule}.
 *
 * @param state - Text of the note
 * @param heading - Line of its heading
 * @param to - End of its section
 * @returns The line, `null` for an Example without steps
 */
function exampleStartOf(state: EditorState, heading: Line, to: number): Line | null {
    for (let number: number = heading.number + 1; number <= state.doc.lineAt(to).number; number++) {
        const line: Line = state.doc.line(number);
        if (stepRule.test(line.text)) return line;
    }
    return null;
}

/**
 * Finds the solutions of the note shown with their steps:
 * that of each Example and of each Task unfolded, see the top of this file.
 * - `line`: A line of the note, the heading of an Example or a solution.
 * - `example`: Whether it is that of an Example.
 * - `section`: Its section, from the end of its heading, `null` for none.
 * - `start`: The first line of the solution, `null` for an Example without steps.
 *
 * @param state - Text, syntax tree and folds of the note
 * @returns The solutions
 */
function solutionsOf(state: EditorState): Solution[] {
    const solutions: Solution[] = [];
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const line: Line = state.doc.line(number);
        const example: boolean = exampleRule.test(line.text);
        const section: { from: number; to: number } | null =
            example || solutionRule.test(line.text) ? foldable(state, line.from, line.to) : null;
        if (section === null || foldedAt(state, line.to)) continue;
        const start: Line | null = example
            ? exampleStartOf(state, line, section.to)
            : state.doc.line(number + 1);
        if (start !== null)
            solutions.push(solutionOf(state, line, start, section.to, example ? 0 : 1));
    }
    return solutions;
}

/**
 * Tells whether the solution of an Example is open, once a step of it shows,
 * as that of a Task once unfolded, so I judge it against its steps, see `./tasks.ts`.
 * - `section`: Its section, `null` for none.
 *
 * @param state - Text and steps of the note
 * @param heading - Line of the heading of a task
 * @returns Whether it is open, also for an Example without steps;
 *   `null` for a heading of no Example
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

/**
 * Tells whether a transaction shows more steps, by `Next step` or `Show all`,
 * see {@link stepsMore}.
 *
 * @param transaction - Transaction
 * @returns Whether it does
 */
export function stepsMoreIs(transaction: Transaction): boolean {
    return transaction.effects.some((effect: StateEffect<unknown>): boolean =>
        effect.is(stepsMore),
    );
}

/**
 * Gives the stretches of a solution hidden:
 * each run of lines of hidden steps, from the end of the line above it,
 * so the lines go with their line breaks.
 * - `ranges`: The stretches found so far.
 * - `line`: A line of a hidden step, and `above` the end of the line above it.
 * - `last`: The last stretch found so far, `undefined` for none.
 *
 * @param state - Text of the note
 * @param solution - The solution
 * @param shown - How many of its steps show
 * @returns The stretches, none while every step shows
 */
function hiddenOf(
    state: EditorState,
    solution: Solution,
    shown: number,
): { from: number; to: number }[] {
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

/**
 * Builds the hidden steps of the solutions, and below each solution with steps hidden its buttons,
 * which stand outside the elements of its lines, see `wrap` in `./preview.ts`.
 * - `decorations`: The hidden steps and buttons found so far.
 *
 * @param state - Text of the note
 * @param solutions - Its unfolded solutions
 * @param shown - How many steps of each solution show, by the start of its heading
 * @returns The decorations
 */
function decorationsOf(
    state: EditorState,
    solutions: Solution[],
    shown: Map<number, number>,
): DecorationSet {
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
        decorations.push(
            Decoration.widget({ widget: new StepsWidget(), block: true, side: 1 }).range(
                solution.to,
            ),
        );
    });
    return Decoration.set(decorations, true);
}

/**
 * Takes a transaction into the steps:
 * their headings moved with the text,
 * one step more or all for a click on `Next step` or `Show all`, see {@link stepsMore},
 * and all once the cursor goes into a hidden step or to its end, see also {@link endAvoid};
 * the look built again when the text, the cursor, the syntax tree or the folds change.
 * - `solutions`: The unfolded solutions after the transaction.
 * - `head`: Where the cursor stands.
 * - `entered`: The solution the cursor went into a hidden step of, `undefined` for none.
 *
 * @param steps - Steps before the transaction
 * @param transaction - The transaction
 * @returns Steps after it
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
            (candidate: Solution): boolean =>
                candidate.heading < click.value.at && click.value.at <= candidate.to,
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
                      (range: { from: number; to: number }): boolean =>
                          range.from < head && head <= range.to,
                  ),
              );
    if (entered !== undefined) shown.set(entered.heading, Infinity);
    return { shown: shown, decorations: decorationsOf(state, solutions, shown) };
}

/**
 * Steps of the note, see {@link Steps}.
 * - {@link StateField}: Holds the steps;
 *   only a field may hide line breaks, like those of hidden steps.
 */
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
 * Keeps the cursor at the end of the last step shown
 * where it would stand at the end of the hidden steps after it, which go on that line,
 * like after End there: what I type then shows where I type it.
 * - `ends`: The start of each hidden stretch, at the end of the line above it, by its end.
 * - `selection`: The cursors and selections of the transaction.
 * - `moved`: Each of them, a cursor at the end of hidden steps moved to their start.
 * - `start`: Start of the hidden steps a cursor stands at the end of, `undefined` for none.
 *
 * @param transaction - Transaction that moves the cursor, without changing the text
 * @returns The transaction, and after it the cursor moved,
 *   when it stands at the end of hidden steps
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
    const moved: SelectionRange[] = selection.ranges.map(
        (range: SelectionRange): SelectionRange => {
            const start: number | undefined = range.empty ? ends.get(range.head) : undefined;
            return start === undefined ? range : EditorSelection.cursor(start);
        },
    );
    if (
        moved.every(
            (range: SelectionRange, index: number): boolean => range === selection.ranges[index],
        )
    )
        return transaction;
    return [
        transaction,
        { selection: EditorSelection.create(moved, selection.mainIndex), sequential: true },
    ];
}

/**
 * The steps of the solutions of a note, those of its Examples and its Tasks,
 * see the top of this file,
 * with the cursor kept at the end of the last step shown, see {@link endAvoid}.
 * - {@link EditorState.transactionFilter}: Changes a transaction before it is applied.
 */
export const solutionSteps: Extension = [hiddenSteps, EditorState.transactionFilter.of(endAvoid)];
