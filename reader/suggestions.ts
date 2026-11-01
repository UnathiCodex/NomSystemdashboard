/**
 * ## Suggestions
 *
 * Puts what I learn today into the plan of today as real boxes, without asking:
 * one box per chapter with something due today,
 * see `today` of `SkillSection` in `skill.ts`,
 * the same chapters the module overview shows.
 * A box of my own learning, without type and without time,
 * like a to-do, since only its length matters, not when,
 * see `taskMinutes` and `theoryMinutes` in `trackers.ts`,
 * and one `ATTACH` per note of the chapter with something due,
 * as it stands when the box is written; its real length the log keeps.
 * A chapter gets no box while the plan of today holds a study box of it,
 * as `studyBoxOf` in `boxes.ts` takes it, open, done, skipped or pushed away,
 * nor while such a box of it from a day before is still open,
 * see `carriedOf` in `boxes.ts`.
 * A box of the chapter with a time or a deadline,
 * like a lecture or a homework sheet, keeps none out.
 * Written before the plan of today is read, see `reader.ts`,
 * so the box stands there before I begin; nothing written is taken out again.
 * Worked out once per day, change of the new system and five minutes,
 * since every request of the plan asks for it,
 * and working it out reads every note of my modules, about 0.2 s.
 */

import { boxAdd, boxesRead } from "./boxes.ts";
import { berlinDateOf, dayAdd } from "./calendar.ts";
import { changesVersion } from "./changes.ts";
import { skillName } from "./categories.ts";
import { skillingRead } from "./skill.ts";
import { settings } from "./trackers.ts";

import type { Box } from "./boxes.ts";
import type { SkillModule, SkillSection } from "./skill.ts";

/**
 * When the boxes were last worked out:
 * today, the count of changes of the new system and the five minutes then,
 * see `changesVersion` in `changes.ts`.
 * The five minutes catch a note
 * of my modules changed outside the new system, which tells no change.
 */
let written: string = "";

/**
 * Writes the boxes of the chapters due today into the plan of today,
 * but while nothing changed since the last time, see {@link written}.
 *
 * @throws {Error} - When a folder, a note, the log or the plan cannot be read,
 *   or a box cannot be written
 */
export function suggestionsWrite(): void {
    const today: string = berlinDateOf(new Date());
    const key: string = `${today} ${changesVersion()} ` + Math.floor(Date.now() / (5 * 60 * 1000));
    if (key === written) return;
    const boxes: Box[] = boxesRead(today, dayAdd(today, 1))[0].boxes.filter(
        (box: Box): boolean => box.category === skillName && box.time === "" && box.deadline === "",
    );
    skillingRead().modules.forEach((module: SkillModule): void => {
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
