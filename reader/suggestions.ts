/**
 * ## Suggestions
 *
 * Puts what I learn today into the plan of today as real boxes, without asking:
 * one box per chapter with something due today, a Task by its spacing or a section on round 0,
 * see `today` of `SkillSection` in `skill.ts`, the same chapters the module overview shows;
 * a section on round 0 only in an open chapter, see `todayMarked` in `skill.ts`.
 * A box of my own learning, without type and without time,
 * like a to-do, since only its length matters, not when:
 * 30 minutes for the Task of each section with something due,
 * and 30 more for the theory of a section on round 0, its Definitions, Algorithm and Example,
 * see `taskMinutes` and `theoryMinutes` in `trackers.ts`,
 * like `SUMMARY:IN2028_BusinessAnalyticsMachineLearning` with `X-CHAPTER:01_RegressionAnalysis`
 * and `ESTIMATED-DURATION:PT2H` for 01.03 on round 0 with the Tasks of 01.01 and 01.02,
 * see `boxes.ts`, and one `ATTACH` per note of the chapter with something due,
 * at most one Task each, like
 * `ATTACH:NomSkillingmodules/IN2028_…/01_RegressionAnalysis/01_02_SampleMeanEstimator.md`,
 * as it stands when the box is written; its real length the log keeps.
 * A chapter gets no box while the plan of today holds a study box of it,
 * one without time and deadline,
 * as `studyBoxOf` in `boxes.ts` takes it, open, done, skipped or pushed away,
 * nor while such a box of it from a day before is still open:
 * that one is carried along to today until I do it,
 * and once done by a log entry of today stands there too, see `carriedOf` in `boxes.ts`,
 * like the box of 18.10 done by my session of 19.10.
 * A box of the chapter with a time or a deadline,
 * like a lecture or a homework sheet, keeps none out.
 * Learning does the box: the session the learning view opens
 * and the attempts of a session are logged from it, see `studyBoxOf` in `boxes.ts`.
 * Written before the plan of today or the learning view is read, see `reader.ts`,
 * so the box stands there before I begin; nothing written is taken out again.
 * Worked out once per day, change of the new system and five minutes, see {@link written},
 * since every request of the plan asks for it,
 * and working it out reads every note of my modules, about 0.2 s.
 *
 * - `./boxes.ts`: Reads the boxes of today, those carried along among them, and adds a box.
 * - `./calendar.ts`: Gives today in Berlin time and adds a day to a day.
 * - `./changes.ts`: Counts the changes of the new system.
 * - `./categories.ts`: Names the category of skill entries.
 * - `./skill.ts`: Reads what of each section is due today.
 * - `./trackers.ts`: Holds the minutes of a Task and of the theory of a new section.
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
 * see `changesVersion` in `changes.ts`, like `2026-10-24 12 5847`; empty before the first time.
 * The five minutes catch a note
 * of my modules changed outside the new system, which tells no change.
 */
let written: string = "";

/**
 * Writes the boxes of the chapters due today into the plan of today, see the top of this file,
 * but while nothing changed since the last time, see {@link written}.
 * - `today`: Today in Berlin time.
 * - `key`: When it is worked out now, in the form of {@link written}.
 * - `boxes`: Study boxes of today, skill boxes without time and deadline, in any state,
 *   those of a day before done today and those carried along to it among them.
 * - `due`: Sections of a module with something due today, in their order.
 * - `chapters`: Their chapters, in their order.
 * - `sections`: Sections of a chapter with something due today, in their order.
 *
 * @throws {Error} - When a folder, a note, the log or the plan cannot be read,
 *   or a box cannot be written
 */
export function suggestionsWrite(): void {
    const today: string = berlinDateOf(new Date());
    const key: string = `${today} ${changesVersion()} ${Math.floor(Date.now() / (5 * 60 * 1000))}`;
    if (key === written) return;
    const boxes: Box[] = boxesRead(today, dayAdd(today, 1))[0].boxes.filter(
        (box: Box): boolean => box.category === skillName && box.time === "" && box.deadline === "",
    );
    skillingRead().modules.forEach((module: SkillModule): void => {
        const due: SkillSection[] = module.sections.filter(
            (section: SkillSection): boolean => section.today !== "",
        );
        const chapters: string[] = [
            ...new Set(due.map((section: SkillSection): string => section.chapter)),
        ];
        chapters
            .filter(
                (chapter: string): boolean =>
                    !boxes.some(
                        (box: Box): boolean =>
                            box.module === module.code && box.chapters.includes(chapter),
                    ),
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
                            minutes +
                            settings.taskMinutes +
                            (section.today === "new" ? settings.theoryMinutes : 0),
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
