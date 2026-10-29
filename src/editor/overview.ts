/**
 * ## Overview
 *
 * The two pages the scripts view shows of a module where a note stands, kept simple,
 * in the look of the day view, see `../day/`, as Today, see `./today.ts`:
 * - the page of the module, once I pick it in the tree, see `pickerOf` in `../notes/tree.ts`:
 *   on top its name, above it the path to it, as a folder of it has them,
 *   see `pathOf` in `./folder.ts`;
 *   then its course of the university, one card per type of its boxes,
 *   like its lectures, numbered, its tutorials with their groups and its exams, see `./course.ts`;
 * - the page of a chapter, once I pick it in the tree: its name, white,
 *   like `01_RegressionAnalysis`, with `Round` grey at the right,
 *   and below it its sections without a grey box around them,
 *   as the rows of the course, each a row, in the order of the notes, grey, as a note of the tree,
 *   see `.tree-file` in `../notes/notes.css`, white under the pointer:
 *   the name of the section as the tree names it, like `01_02_SampleMeanEstimator`, and its round,
 *   like `2`, the one its view shows,
 *   see `./round.ts`, `Ready` once its Task has its runs spaced, `0` while I never learned it;
 *   a tap on a row opens the section.
 * Nothing more, until I want more:
 * every further piece only after Claude recommends it and I say yes.
 * Everything is computed from the log by the reader, see `reader/skill.ts`; nothing is kept here.
 *
 * - `../skill/attempts.ts`: Loads the modules with their tasks and sections.
 * - `./course.ts`: Shows the course of the module.
 * - `./folder.ts`: Writes the path to the module on top of its page.
 * - `../notes/tree.ts`: The address of a note, and shows a chapter in the tree.
 * - `../day/choices.ts`: Marks where a long name may go on below.
 * - `../food/foods.ts`: Makes elements.
 * - `./overview.css`: Look of both pages.
 */

import { skillingLoad } from "../skill/attempts.ts";
import { courseShow } from "./course.ts";
import { pathOf } from "./folder.ts";
import { chapterShow, noteAddressOf } from "../notes/tree.ts";
import { breakableOf } from "../day/choices.ts";
import { elementOf } from "../food/foods.ts";
import "./overview.css";

import type { SkillModule, SkillSection, SkillTask, Skilling } from "../skill/attempts.ts";

/**
 * Tells the round of a section, see the top of this file.
 * - `ready`: Whether its Task has its runs spaced.
 *
 * @param module - Its module with its tasks
 * @param section - The section
 * @returns Its round, like `2`, `0` while I never learned it, or `Ready`
 */
function roundOf(module: SkillModule, section: SkillSection): string {
    const ready: boolean = module.tasks.some(
        (task: SkillTask): boolean => task.id === section.cold && task.ready,
    );
    if (ready) return "Ready";
    return String(section.round);
}

/**
 * Makes the row of a section, see the top of this file:
 * a link to it, its name, whole as its tooltip, since a long one ends in `…`,
 * see `.overview-name` in `./overview.css`, and its round.
 * - `row`: The row.
 *
 * @param module - Its module with its tasks
 * @param section - The section
 * @returns The row
 */
function rowOf(module: SkillModule, section: SkillSection): HTMLAnchorElement {
    const row: HTMLAnchorElement = document.createElement("a");
    row.className = "overview-row";
    row.href = noteAddressOf(section.note, "");
    row.title = section.title;
    row.append(
        elementOf("span", "overview-name", section.title),
        elementOf("span", "overview-round", roundOf(module, section)),
    );
    return row;
}

/**
 * Makes the page of a chapter, see the top of this file: its name with `Round` at the right,
 * then the card of its sections.
 * - `group`: The chapter.
 * - `head`: The line of its name.
 * - `card`: The card of its rows.
 *
 * @param module - Its module
 * @param chapter - Name of the chapter, like `01_RegressionAnalysis`
 * @returns The group
 */
function groupOf(module: SkillModule, chapter: string): HTMLElement {
    const group: HTMLElement = elementOf("section", "overview-group", "");
    const head: HTMLElement = elementOf("div", "overview-head", "");
    const card: HTMLElement = elementOf("div", "overview-card", "");
    head.append(
        elementOf("h3", "overview-chapter", breakableOf(chapter)),
        elementOf("span", "overview-column", "Round"),
    );
    card.append(
        ...module.sections
            .filter((section: SkillSection): boolean => section.chapter === chapter)
            .map((section: SkillSection): HTMLAnchorElement => rowOf(module, section)),
    );
    group.append(head, card);
    return group;
}

/**
 * Shows in its place the page of a module or of one of its chapters, see the top of this file:
 * of the module its course, see `courseShow` in `./course.ts`, of a chapter its sections;
 * a chapter without sections, like one of a module of an earlier semester,
 * whose tasks the reader does not read, shows none.
 * - `title`: The name of the module on top of its page, with the path to it.
 * - `course`: The place of the course.
 * - `list`: The place of the chapter.
 * - `skilling`: Every module with its tasks and sections.
 * - `found`: The module, `undefined` for one not of the semester.
 *
 * @param place - Where the page goes, see `#editor-overview` in `./editor.html`
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param chapter - Name of the chapter,
 *   like `01_RegressionAnalysis`, empty for the page of the module
 * @throws {Error} - When the reader cannot read the tasks or the course
 */
export async function overviewShow(
    place: HTMLElement,
    module: string,
    chapter: string,
): Promise<void> {
    const course: HTMLElement = place.querySelector(".overview-course") as HTMLElement;
    const list: HTMLElement = place.querySelector(".overview-list") as HTMLElement;
    const title: HTMLElement = place.querySelector(".overview-title") as HTMLElement;
    title.hidden = chapter !== "";
    (title.querySelector(".folder-path") as HTMLElement).replaceChildren(...pathOf(module));
    (title.querySelector(".day-date") as HTMLElement).textContent = breakableOf(module);
    course.hidden = chapter !== "";
    list.hidden = chapter === "";
    if (chapter === "") {
        place.hidden = false;
        await courseShow(course, module);
        return;
    }
    const skilling: Skilling = await skillingLoad();
    const found: SkillModule | undefined = skilling.modules.find(
        (candidate: SkillModule): boolean => candidate.title === module,
    );
    if (
        found !== undefined &&
        found.sections.some((section: SkillSection): boolean => section.chapter === chapter)
    )
        list.replaceChildren(groupOf(found, chapter));
    place.hidden = false;
}

/**
 * Shows in the tree the chapter of the address, see `chapterShow` in `../notes/tree.ts`,
 * once the tree is there, like the chapter whose name I clicked;
 * the module the tree picks itself, from the address.
 * - `picked`: The module in the tree, `null` for one not in it.
 * - `shown`: The chapter in it, `null` for none.
 *
 * @param tree - The tree
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param chapter - Name of the chapter, like `01_RegressionAnalysis`, empty for none
 */
export function overviewTreeShow(tree: HTMLElement, module: string, chapter: string): void {
    const picked: HTMLElement | null = tree.querySelector(
        `.tree-module[data-module="${CSS.escape(module)}"]`,
    );
    const shown: HTMLElement | null =
        picked?.querySelector(`.tree-chapter[data-chapter="${CSS.escape(chapter)}"]`) ?? null;
    if (picked !== null && shown !== null) chapterShow(tree, picked, shown);
}
