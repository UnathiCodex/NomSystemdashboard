/**
 * ## Skills
 *
 * Reads and writes my skills in `Skills.md`, see `skillsFile` in `./sources.ts`:
 * one Markdown table with one row per skill, its name and its link, sorted by name.
 * They are my skills of the semester beside the modules `Modules.md` names,
 * see `activeModulesRead` in `./notes.ts`, like my projects.
 * A skill named like a module, see `moduleName` in `./sources.ts`,
 * has its plan and its log in `Modules/`, every other one in `Skilling/`.
 * A text typed in the Skill list of the day that names no skill is a new row
 * with an empty link, see {@link skillAdd}, the first one making the file.
 * Nothing makes a folder or finds a link by itself:
 * I enter the link by hand as the link of the summary of one of its entries or boxes,
 * which every entry and box of the skill and its row then share, see {@link skillLinkSet}.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { linkFollow, skillName } from "./calendar.ts";
import { cellsOf } from "./markdown.ts";
import { activeModulesRead, codeOf, moduleFolderOf } from "./notes.ts";
import { moduleName, skillsFile, writeAllowed } from "./sources.ts";

/**
 * A skill, one row of `Skills.md`.
 * - `link`: A path from `NomWorkspace` or a web address, empty while I entered none.
 */
export type SkillRow = {
    name: string;
    link: string;
};

/** Lines a new `Skills.md` starts with: the head of its table. */
const fileHead: string[] = ["| Skill | Link |", "|---|---|"];

/** Lines of the table before its rows: the header and the line below it. */
const tableHead: number = 2;

/** Compares names as a German dictionary orders them, ignoring case. */
const nameOrder: Intl.Collator = new Intl.Collator("de");

/**
 * Gives the code of a skill by its name, as the dialog of the day picks it:
 * a module its code, the part of its name before `_`, any other its name.
 */
export function skillCodeOf(name: string): string {
    return moduleName.test(name) ? codeOf(name) : name;
}

/**
 * Reads the rows of `Skills.md`, in their order, none while the file does not exist.
 * A row without a name stays out.
 */
export function skillRowsRead(): SkillRow[] {
    if (!existsSync(skillsFile)) return [];
    return readFileSync(skillsFile, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map((line: string): SkillRow => {
            const cells: string[] = cellsOf(line);
            return { name: cells[0] ?? "", link: cells[1] ?? "" };
        })
        .filter((row: SkillRow): boolean => row.name !== "");
}

/**
 * Finds the row of a skill by its code, `undefined` for a skill without one,
 * like a module of `Modules.md`.
 */
export function skillRowOf(code: string): SkillRow | undefined {
    return skillRowsRead().find((row: SkillRow): boolean => skillCodeOf(row.name) === code);
}

/**
 * Reads the skills of the semester by their codes, each once:
 * the modules of the semester first, see `activeModulesRead` in `./notes.ts`,
 * then the rows of `Skills.md`.
 * The Skill list offers them first.
 * The menu of the scripts view shows only modules, since only they have chapters and tasks.
 */
export function activeSkillsRead(): string[] {
    return [
        ...new Set([
            ...activeModulesRead().map(codeOf),
            ...skillRowsRead().map((row: SkillRow): string => skillCodeOf(row.name)),
        ]),
    ];
}

/**
 * Writes the rows as the table of `Skills.md`, sorted by name,
 * every other line of the file staying as it is,
 * the head of a new table when the file does not exist yet.
 *
 * @throws {Error} - When the file lies outside the new system or holds no table
 */
function rowsWrite(rows: SkillRow[]): void {
    if (!writeAllowed(skillsFile)) throw new Error(`No writing outside the new system: ${skillsFile}`);
    const lines: string[] = existsSync(skillsFile) ? readFileSync(skillsFile, "utf8").split("\n") : [...fileHead, ""];
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    if (first === -1 || last === first) throw new Error(`No table in ${skillsFile}`);
    lines.splice(
        first + tableHead,
        last + 1 - first - tableHead,
        ...rows
            .toSorted((one: SkillRow, other: SkillRow): number => nameOrder.compare(one.name, other.name))
            .map((row: SkillRow): string => `| ${row.name} | ${row.link} |`),
    );
    writeFileSync(skillsFile, lines.join("\n"));
}

/**
 * Adds a skill typed in the Skill list of the day as a new row with an empty link,
 * by the name the page gives it, see `skillNewNameOf` in `src/day/skill.ts`.
 * Makes no folder.
 *
 * @returns Its code, which the list picks
 * @throws {Error} - When the name is empty, holds `|`, `/` or `\`, starts with `.`,
 *   or a skill of the semester or a module folder has its code already, ignoring case
 */
export function skillAdd(name: string): string {
    const clean: string = String(name ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const code: string = skillCodeOf(clean);
    if (clean === "" || /[|/\\]/.test(clean) || clean.startsWith(".")) throw new Error(`No name of a skill: ${clean}`);
    if (
        moduleFolderOf(code) !== undefined ||
        activeSkillsRead().some((known: string): boolean => known.toLowerCase() === code.toLowerCase())
    )
        throw new Error(`A skill has the name already: ${clean}`);
    rowsWrite([...skillRowsRead(), { name: clean, link: "" }]);
    return code;
}

/**
 * Gives the row of a skill the link a summary of it was written with anew,
 * so the link I enter for one of its entries or boxes is the link of the skill,
 * see `linesWrite` in `./calendar.ts`, a `|` in it written as `%7C`.
 * Nothing for a skill without row, like a module of `Modules.md`.
 */
function skillLinkSet(category: string, summary: string, link: string): void {
    const rows: SkillRow[] = skillRowsRead();
    const row: SkillRow | undefined = rows.find((one: SkillRow): boolean => one.name === summary);
    const written: string = link.replaceAll("|", "%7C");
    if (category !== skillName || row === undefined || row.link === written) return;
    rowsWrite(rows.map((one: SkillRow): SkillRow => (one === row ? { ...row, link: written } : one)));
}

linkFollow(skillLinkSet);
