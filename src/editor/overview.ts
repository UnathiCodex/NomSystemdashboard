/**
 * ## Overview
 *
 * The two pages the scripts view shows of a module where a note stands, kept simple,
 * in the look of the day view, see `../day/`, as Today, see `./today.ts`:
 * - the page of the module, once I pick it in the tree:
 *   its name with the path to it, see `pathOf` in `./folder.ts`,
 *   then its course of the university, see `./course.ts`;
 * - the page of a chapter: its name, with `Round` at the right,
 *   and below it its sections in the order of the notes, each a row
 *   with the round its view shows, see `./round.ts`;
 *   a tap on a row opens the section.
 * Nothing more, until I want more:
 * every further piece only after Claude recommends it and I say yes.
 * Everything is computed from the log by the reader,
 * see `reader/skill.ts`; nothing is kept here.
 */

import { skillingLoad } from "../skill/attempts.ts";
import { courseShow } from "./course.ts";
import { pathOf } from "./folder.ts";
import { chapterShow, noteAddressOf } from "../notes/tree.ts";
import { breakableOf } from "../day/choices.ts";
import { elementOf } from "../food/foods.ts";
import "./overview.css";

import type {
    SkillModule,
    SkillSection,
    SkillTask,
    Skilling,
} from "../skill/attempts.ts";

/**
 * Tells the round of a section: `0` while I never learned it,
 * `Ready` once its Task has its runs spaced.
 */
function roundOf(module: SkillModule, section: SkillSection): string {
    const ready: boolean = module.tasks.some(
        (task: SkillTask): boolean => task.id === section.cold && task.ready,
    );
    if (ready) return "Ready";
    return String(section.round);
}

/**
 * Makes the row of a section: a link to it, its name, whole as its tooltip,
 * since a long one ends in `…`, and its round.
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
 * Makes the page of a chapter: its name with `Round` at the right,
 * then the card of its sections.
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
 * Shows in its place the page of a module, with its course, or of one of its chapters;
 * a chapter of a module of an earlier semester,
 * whose tasks the reader does not read, shows no sections.
 *
 * @param place - Where the page goes, see `#editor-overview` in `./editor.html`
 * @param chapter - Name of the chapter, empty for the page of the module
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
    (title.querySelector(".folder-path") as HTMLElement).replaceChildren(
        ...pathOf(module),
    );
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
        found.sections.some(
            (section: SkillSection): boolean => section.chapter === chapter,
        )
    )
        list.replaceChildren(groupOf(found, chapter));
    place.hidden = false;
}

/**
 * Shows in the tree the chapter of the address, see `chapterShow` in `../notes/tree.ts`,
 * once the tree is there; the module the tree picks itself, from the address.
 *
 * @param chapter - Name of the chapter, empty for none
 */
export function overviewTreeShow(
    tree: HTMLElement,
    module: string,
    chapter: string,
): void {
    const picked: HTMLElement | null = tree.querySelector(
        `.tree-module[data-module="${CSS.escape(module)}"]`,
    );
    const shown: HTMLElement | null =
        picked?.querySelector(`.tree-chapter[data-chapter="${CSS.escape(chapter)}"]`) ??
        null;
    if (picked !== null && shown !== null) chapterShow(tree, picked, shown);
}
