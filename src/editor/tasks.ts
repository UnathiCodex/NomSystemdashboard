/**
 * ## Tasks
 *
 * The rows of the tasks of a note in the editor,
 * as the scripts view showed them under their headings, see `../skill/task.ts`:
 * under the heading `##` of each Task of the semester its row,
 * when it is due, its history, the menu for the next attempt,
 * which goes into the skill entry of the moment, Right and Wrong once its solution is open,
 * Wrong with my short comment; after each attempt the rows load again.
 * An Example has no row and no result: `Next` checks it off in its round, see `./round.ts`.
 * A cold task, its heading ending with `(cold)`, shows a grey label in place of `(cold)`,
 * like `cold · 2 done · 1 right`, while the cursor is not on its heading.
 * Only a note with tasks of the semester has rows.
 * A section, a note whose tasks make a section of the semester,
 * has no rows but on the line of each heading of a Task, at its right end,
 * a check and a cross, its results Right and Wrong,
 * see `judgeOf` in `../skill/task.ts`, without state, hint or numbers,
 * and its `(cold)` hidden without a label, since its round says what is due, see `./round.ts`,
 * which hears of each load and each Right, see {@link tasksFollow}.
 *
 * - `@codemirror/state`, `@codemirror/view`:
 *   Hold the tasks of the note and draw the rows as widgets between its lines.
 * - `@codemirror/language`: Tells when something folds or unfolds.
 * - `./steps.ts`: The heading of a solution, whether it is folded,
 *   and whether an Example shows a step.
 * - `../skill/attempts.ts`: Loads the tasks with when they are due.
 * - `../today.ts`: Gives today's calendar date, for when a task is due.
 * - `../skill/task.ts`: Builds the row of a task, the check and the cross of a task of a section,
 *   and the label of a cold task.
 */

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { exampleOpenOf, foldedAt, solutionRule, stepsMoreIs } from "./steps.ts";
import { skillingLoad } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { coldLabelOf, judgeOf, taskRowOf } from "../skill/task.ts";

import type {
    EditorState,
    Extension,
    Line,
    Range,
    SelectionRange,
    StateEffectType,
    Transaction,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { SkillModule, SkillSection, SkillTask, Skilling } from "../skill/attempts.ts";

/**
 * The tasks of the note, as loaded for its rows.
 *
 * - `path`: Path of the note, as the scripts view takes it.
 * - `tasks`: Its tasks of the semester, none for a note without.
 * - `today`: Today like `2026-10-10`.
 * - `section`: Its section, `null` for a note that is none.
 */
export type NoteTasks = {
    path: string;
    tasks: SkillTask[];
    today: string;
    section: SkillSection | null;
};

/**
 * A `##` block of the note: its heading as written, the number of its line,
 * and its task, `null` for theory.
 */
export type Block = {
    heading: string;
    line: number;
    task: SkillTask | null;
};

/**
 * The rows of the note: its tasks and the widgets drawn for them.
 *
 * - `loaded`: The tasks of the note, `null` before they are loaded.
 * - `decorations`: The rows and labels of cold tasks.
 */
type Rows = {
    loaded: NoteTasks | null;
    decorations: DecorationSet;
};

/**
 * Heading `##` of a block, with its text as written.
 */
export const blockRule: RegExp = /^##[ \t]+(.+?)[ \t]*$/;

/**
 * End of the heading of a cold task, `(cold)` with the space before it,
 * like in `Task. Kiosk Chain Review (cold)`.
 */
const coldMark: RegExp = /[ \t]*\(cold\)$/;

/**
 * Effect of the tasks of the note being loaded.
 */
const tasksLoaded: StateEffectType<NoteTasks> = StateEffect.define<NoteTasks>();

/**
 * Hears each load of the tasks, see {@link tasksFollow}, `null` for none.
 */
let follower: ((view: EditorView, loaded: NoteTasks) => void) | null = null;

/**
 * Goes on after a Right of a task of a section, see {@link tasksFollow}, `null` for none.
 */
let goer: ((view: EditorView) => void) | null = null;

/**
 * Line of the heading of a task of a section,
 * with room at its right for the check and the cross, see `./editor.css`.
 */
const judgedLine: Decoration = Decoration.line({ class: "task-heading" });

/**
 * A widget of a task, its row or its check and cross, drawn anew only when the task,
 * its attempts or the fold of its solution change.
 */
abstract class TaskWidget<Open extends boolean | null> extends WidgetType {
    /**
     * The task.
     */
    readonly task: SkillTask;

    /**
     * The tasks of the note, with what the row picks from.
     */
    readonly loaded: NoteTasks;

    /**
     * Whether its solution is open; for a row `null` for a task without a solution.
     */
    readonly open: Open;

    constructor(task: SkillTask, loaded: NoteTasks, open: Open) {
        super();
        this.task = task;
        this.loaded = loaded;
        this.open = open;
    }

    /**
     * Tells whether another widget is the same, so the drawn one stays:
     * the same task with the same attempts and state, its solution the same;
     * so a load after a result draws only the widget that changed,
     * and the rows outside the screen keep their measured heights,
     * which keeps the page where it is.
     */
    override eq(other: TaskWidget<Open>): boolean {
        return other.open === this.open && JSON.stringify(other.task) === JSON.stringify(this.task);
    }

    /**
     * Keeps clicks and keys in the widget from the editor,
     * so its buttons and fields work as in the scripts view.
     */
    override ignoreEvent(): boolean {
        return true;
    }
}

/**
 * Row of a task under its heading, see `taskRowOf` in `../skill/task.ts`;
 * Right and Wrong show while its solution is open,
 * so a fold, an unfold or a step shown draws the row anew.
 */
class RowWidget extends TaskWidget<boolean | null> {
    /**
     * Builds the row; each attempt written loads the rows again, see {@link tasksLoad}.
     */
    toDOM(view: EditorView): HTMLElement {
        return taskRowOf(
            this.task,
            this.loaded.today,
            this.open === null ? null : Object.assign(new EventTarget(), { open: this.open }),
            false,
            (): Promise<void> => tasksLoad(view, this.loaded.path),
        );
    }
}

/**
 * Check and cross of a task of a section at the right end of the line of its heading, see `judgeOf`
 * in `../skill/task.ts`; they work while its solution is open,
 * so a fold, an unfold or a step shown draws them anew.
 */
class JudgeWidget extends TaskWidget<boolean> {
    /**
     * Builds the buttons; each attempt written loads the tasks again,
     * see {@link tasksLoad}, a Right then goes on, see {@link tasksFollow}.
     */
    toDOM(view: EditorView): HTMLElement {
        return judgeOf(
            this.task,
            this.loaded.today,
            this.open,
            (): Promise<void> => tasksLoad(view, this.loaded.path),
            (): void => goer?.(view),
        );
    }
}

/**
 * Label of a cold task in place of its `(cold)`, see `coldLabelOf` in `../skill/task.ts`.
 */
class ColdWidget extends WidgetType {
    /**
     * The cold task.
     */
    readonly task: SkillTask;

    constructor(task: SkillTask) {
        super();
        this.task = task;
    }

    /**
     * Tells whether another label is that of the same task as loaded, so the drawn one stays.
     */
    override eq(other: ColdWidget): boolean {
        return other.task === this.task;
    }

    /**
     * Builds the label.
     */
    toDOM(): HTMLElement {
        return coldLabelOf(this.task);
    }
}

/**
 * Tells whether the solution of a task is open: that of an Example once a step of it shows,
 * see `exampleOpenOf` in `./steps.ts`; else the first heading `#### Solution…` of its block,
 * from its heading to the next heading `##`, unfolded.
 * - `example`: Whether the solution of an Example is open, `null` for a task of no Example.
 * - `line`: A line of the block.
 *
 * @param state - Text, folds and steps of the note
 * @param heading - Line of the heading of the task
 * @returns Whether its solution is open, `null` for a task without one
 */
function solutionOpenOf(state: EditorState, heading: Line): boolean | null {
    const example: boolean | null = exampleOpenOf(state, heading);
    if (example !== null) return example;
    for (let number: number = heading.number + 1; number <= state.doc.lines; number++) {
        const line: Line = state.doc.line(number);
        if (blockRule.test(line.text)) return null;
        if (!solutionRule.test(line.text)) continue;
        return !foldedAt(state, line.to);
    }
    return null;
}

/**
 * Reads the blocks of the note, each with its task.
 *
 * @param state - Text of the note
 * @param tasks - Its tasks
 * @returns Blocks in their order
 */
export function blocksOf(state: EditorState, tasks: SkillTask[]): Block[] {
    const blocks: Block[] = [];
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const heading: string | undefined = blockRule.exec(state.doc.line(number).text)?.[1];
        if (heading !== undefined)
            blocks.push({
                heading: heading,
                line: number,
                task: tasks.find((task: SkillTask): boolean => task.heading === heading) ?? null,
            });
    }
    return blocks;
}

/**
 * Builds the rows of the note, see the top of this file: a row after the heading of each task,
 * as wide as the page, and the label of a cold task in place of its `(cold)`
 * while the cursor is not on its heading;
 * in a section the check and the cross on the line of the heading instead of the row,
 * after its fold arrow, so the cursor at the end of the heading stands
 * at its text, see `./preview.ts`.
 * - `decorations`: The rows and labels found so far.
 * - `block`: A block of the note with a task, `task` the task, `line` the line of its heading.
 * - `cold`: Where `(cold)` stands in the heading of a cold task, `null` for no such task.
 *
 * @param state - Text, cursor and folds of the note
 * @param loaded - The tasks of the note, `null` before they are loaded
 * @returns The rows
 */
function decorationsOf(state: EditorState, loaded: NoteTasks | null): DecorationSet {
    if (loaded === null || loaded.tasks.length === 0) return Decoration.none;

    const decorations: Range<Decoration>[] = [];
    for (const block of blocksOf(state, loaded.tasks)) {
        if (block.task === null || block.task.kind === "example") continue;
        const task: SkillTask = block.task;
        const line: Line = state.doc.line(block.line);
        const cold: RegExpExecArray | null = task.kind === "cold" ? coldMark.exec(line.text) : null;
        if (
            cold !== null &&
            !state.selection.ranges.some(
                (range: SelectionRange): boolean => range.from <= line.to && range.to >= line.from,
            )
        )
            decorations.push(
                (loaded.section === null
                    ? Decoration.replace({ widget: new ColdWidget(task) })
                    : Decoration.replace({})
                ).range(line.from + cold.index, line.to),
            );
        if (loaded.section !== null) {
            decorations.push(judgedLine.range(line.from));
            decorations.push(
                Decoration.widget({
                    widget: new JudgeWidget(task, loaded, solutionOpenOf(state, line) ?? true),
                    side: 2,
                }).range(line.to),
            );
        } else {
            decorations.push(
                Decoration.widget({
                    widget: new RowWidget(task, loaded, solutionOpenOf(state, line)),
                    block: true,
                    side: 1,
                }).range(line.to),
            );
        }
    }
    return Decoration.set(decorations, true);
}

/**
 * Lets something hear each load of the tasks, after their rows are drawn,
 * and each Right of a task of a section, once written and loaded,
 * like the round of a section, see `./round.ts`.
 *
 * @param listener - Hears the editor and the tasks loaded
 * @param right - Hears the editor after a Right
 */
export function tasksFollow(
    listener: (view: EditorView, loaded: NoteTasks) => void,
    right: (view: EditorView) => void,
): void {
    follower = listener;
    goer = right;
}

/**
 * Loads the tasks of the note from the reader and shows their rows, see the top of this file;
 * without tasks of the semester the note shows no rows.
 * Then tells the one following, see {@link tasksFollow}.
 * - `skilling`: Every module of the semester with its tasks.
 * - `loaded`: The tasks of the note with its section.
 *
 * @param view - The editor
 * @param path - Path of the note, as the scripts view takes it
 * @throws {Error} - When the reader cannot read the tasks
 */
export async function tasksLoad(view: EditorView, path: string): Promise<void> {
    const skilling: Skilling = await skillingLoad();
    const loaded: NoteTasks = {
        path: path,
        tasks: skilling.modules
            .flatMap((module: SkillModule): SkillTask[] => module.tasks)
            .filter((task: SkillTask): boolean => task.note === path),
        today: calendarTodayOf(),
        section:
            skilling.modules
                .flatMap((module: SkillModule): SkillSection[] => module.sections)
                .find((section: SkillSection): boolean => section.note === path) ?? null,
    };
    view.dispatch({ effects: tasksLoaded.of(loaded) });
    follower?.(view, loaded);
}

/**
 * The rows of the tasks of a note, see the top of this file:
 * built again when the tasks load, the text or the cursor changes, something folds or unfolds,
 * or more steps show;
 * none until {@link tasksLoad} has loaded the tasks.
 * - {@link StateField}: Holds the rows; only a field may draw widgets between the lines.
 */
export const taskRows: Extension = StateField.define<Rows>({
    create: (): Rows => ({ loaded: null, decorations: Decoration.none }),
    update: (rows: Rows, transaction: Transaction): Rows => {
        let loaded: NoteTasks | null = rows.loaded;
        for (const effect of transaction.effects) if (effect.is(tasksLoaded)) loaded = effect.value;
        if (
            loaded === rows.loaded &&
            !transaction.docChanged &&
            transaction.selection === undefined &&
            foldedRanges(transaction.state) === foldedRanges(transaction.startState) &&
            !stepsMoreIs(transaction)
        )
            return rows;
        return { loaded: loaded, decorations: decorationsOf(transaction.state, loaded) };
    },
    provide: (field: StateField<Rows>): Extension =>
        EditorView.decorations.from(field, (rows: Rows): DecorationSet => rows.decorations),
});
