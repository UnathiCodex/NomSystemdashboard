/**
 * ## Suggestions
 *
 * Puts one box per chapter due today into the plan of today, without asking.
 * A box of my own learning without type and time, since only its length matters.
 * It holds one `ATTACH` per due note of the chapter.
 * A chapter gets no box while today holds a study box of it in any state, or one from before is still open.
 * A box with a time or a deadline keeps none out.
 * Written before the plan is read, so the box stands there before I begin, never taken out again.
 * Worked out once per day, change and five minutes, since it reads every note of my modules, about 0.2 s.
 */

import { boxAdd, boxesRead } from "./boxes.ts";
import { berlinDateOf, dayAdd } from "./calendar.ts";
import { changesVersion } from "./changes.ts";
import { skillName } from "./categories.ts";
import { skillModulesRead } from "./skill.ts";
import { settings } from "./trackers.ts";

import type { Box } from "./boxes.ts";
import type { SkillModule, SkillSection } from "./skill.ts";

/**
 * When the boxes were last worked out, today, the count of changes and the five minutes.
 * The five minutes catch a note changed outside the new system.
 */
let written: string = "";

/**
 * Writes the boxes of the chapters due today, unless nothing changed since {@link written}.
 *
 * @throws {Error} - When a folder, note, the log or the plan cannot be read, or a box cannot be written
 */
export function suggestionsWrite(): void {
    const today: string = berlinDateOf(new Date());
    const key: string = `${today} ${changesVersion()} ` + Math.floor(Date.now() / (5 * 60 * 1000));
    if (key === written) return;
    const boxes: Box[] = boxesRead(today, dayAdd(today, 1))[0].boxes.filter(
        (box: Box): boolean => box.category === skillName && box.time === "" && box.deadline === "",
    );
    skillModulesRead().forEach((module: SkillModule): void => {
        const due: SkillSection[] = module.sections.filter((section: SkillSection): boolean => section.today !== "");
        const chapters: string[] = [...new Set(due.map((section: SkillSection): string => section.chapter))];
        chapters
            .filter(
                (chapter: string): boolean =>
                    !boxes.some((box: Box): boolean => box.module === module.code && box.chapters.includes(chapter)),
            )
            .forEach((chapter: string): void => {
                const sections: SkillSection[] = due.filter(
                    (section: SkillSection): boolean => section.chapter === chapter,
                );
                boxAdd({
                    category: skillName,
                    title: "",
                    location: "",
                    from: "",
                    module: module.code,
                    type: "",
                    semester: "",
                    note: "",
                    day: today,
                    time: "",
                    deadline: "",
                    chapters: [chapter],
                    minutes: sections.reduce(
                        (minutes: number, section: SkillSection): number =>
                            minutes + settings.taskMinutes + (section.today === "new" ? settings.theoryMinutes : 0),
                        0,
                    ),
                    documents: sections.map((section: SkillSection): string =>
                        section.note.split("/").slice(1).join("/"),
                    ),
                });
            });
    });
    written = key;
}
