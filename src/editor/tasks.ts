/**
 * ## Tasks
 *
 * The rows of the tasks of a note in the editor, under the `##` heading of each Task of the semester.
 * Right and Wrong show once its solution is open.
 * An Example has no row, `Next` checks it off in its round.
 * A cold task shows a grey label in place of `(cold)` while the cursor is not on its heading.
 * A section has no rows but a check and a cross at the end of each heading of a Task.
 * Its `(cold)` hides without a label, since its round says what is due.
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
 * The tasks of the note.
 * - `section`: `null` for a note that is none.
 */
export type NoteTasks = {
    path: string;
    tasks: SkillTask[];
    today: string;
    section: SkillSection | null;
};

/** A `##` block of the note, its task `null` for theory. */
export type Block = {
    heading: string;
    line: number;
    task: SkillTask | null;
};

/** The rows of the note, its tasks `null` before they load. */
type Rows = {
    loaded: NoteTasks | null;
    decorations: DecorationSet;
};

export const blockRule: RegExp = /^##[ \t]+(.+?)[ \t]*$/;

/** End of the heading of a cold task. */
const coldMark: RegExp = /[ \t]*\(cold\)$/;

const tasksLoaded: StateEffectType<NoteTasks> = StateEffect.define<NoteTasks>();

/** Hears each load of the tasks. */
let follower: ((view: EditorView, loaded: NoteTasks) => void) | null = null;

/** Goes on after a Right of a task of a section. */
let goer: ((view: EditorView) => void) | null = null;

/** Heading of a task of a section, with room at its right for the check and the cross. */
const judgedLine: Decoration = Decoration.line({ class: "task-heading" });

/** A widget of a task, drawn anew only when the task, its attempts or the fold of its solution change. */
abstract class TaskWidget<Open extends boolean | null> extends WidgetType {
    readonly task: SkillTask;

    readonly loaded: NoteTasks;

    /** Whether its solution is open, `null` for a task without one. */
    readonly open: Open;

    constructor(task: SkillTask, loaded: NoteTasks, open: Open) {
        super();
        this.task = task;
        this.loaded = loaded;
        this.open = open;
    }

    /**
     * The drawn widget stays when the same, so a load draws only what changed.
     * Rows off the screen keep their measured heights, which keeps the page where it is.
     */
    override eq(other: TaskWidget<Open>): boolean {
        return other.open === this.open && JSON.stringify(other.task) === JSON.stringify(this.task);
    }

    /** Keeps clicks and keys from the editor, so the buttons and fields work. */
    override ignoreEvent(): boolean {
        return true;
    }
}

/** Row of a task under its heading, Right and Wrong while its solution is open. */
class RowWidget extends TaskWidget<boolean | null> {
    /** Builds the row, each attempt written loads the rows again. */
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

/** Check and cross of a task of a section at the end of its heading, working while its solution is open. */
class JudgeWidget extends TaskWidget<boolean> {
    /** Builds the buttons, each attempt loads the tasks again, a Right then goes on. */
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

/** Label of a cold task in place of its `(cold)`. */
class ColdWidget extends WidgetType {
    readonly task: SkillTask;

    constructor(task: SkillTask) {
        super();
        this.task = task;
    }

    override eq(other: ColdWidget): boolean {
        return other.task === this.task;
    }

    toDOM(): HTMLElement {
        return coldLabelOf(this.task);
    }
}

/**
 * Whether the solution of a task is open, `null` for a task without one.
 * An Example once a step shows, else the first `#### Solution…` of its block unfolded.
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
 * Builds the rows of the note.
 * In a section the check and the cross go after the fold arrow, so the cursor at the end stands at the text.
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

/** Lets something hear each load of the tasks after their rows are drawn, and each Right in a section. */
export function tasksFollow(
    listener: (view: EditorView, loaded: NoteTasks) => void,
    right: (view: EditorView) => void,
): void {
    follower = listener;
    goer = right;
}

/**
 * Loads the tasks of the note and shows their rows, then tells the one following.
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
 * The rows of the tasks of a note.
 * - {@link StateField}: Only a field may draw widgets between the lines.
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
