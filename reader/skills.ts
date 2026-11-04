/**
 * ## Skills
 *
 * My skills of the semester beside my modules, like my projects,
 * in `Skills.md` as one table of name and link, sorted by name.
 * A row `Name (Type)` is a type of the skill `Name` with a link of its own, for any skill but a module.
 * A skill named like a module has its plan and log in `Modules/`, every other one in `Skilling/`.
 * Nothing makes a folder or finds a link by itself.
 * I enter the link on one entry or box, every one of the same summary shares it, its row too.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { linkFollow, skillName, skillPartsOf } from "./calendar.ts";
import { cellsOf } from "./markdown.ts";
import { activeModulesRead, codeOf, moduleFolderOf } from "./notes.ts";
import { skillsFile, writeAllowed } from "./sources.ts";

/** A row of `Skills.md`, `link` a path from `NomWorkspace` or a web address, empty while I entered none. */
export type SkillRow = {
    name: string;
    link: string;
};

const fileHead: string[] = ["| Skill | Link |", "|---|---|"];

/** Lines of the table before its rows. */
const tableHead: number = 2;

/** As a German dictionary orders names, ignoring case. */
const nameOrder: Intl.Collator = new Intl.Collator("de");

/** A module its code, the part of its name before `_`, any other skill its name, without a type in brackets. */
export function skillCodeOf(name: string): string {
    return skillPartsOf(name)[0];
}

/** In their order, none while the file does not exist, a row without a name left out. */
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

/** The row of the skill itself, none of its types, `undefined` for a skill without a row, like a module. */
export function skillRowOf(code: string): SkillRow | undefined {
    return skillRowsRead().find((row: SkillRow): boolean => {
        const [own, type]: [string, string] = skillPartsOf(row.name);
        return own === code && type === "";
    });
}

/** The types of a skill by its rows `Name (Type)`, in their order. */
export function skillTypesRead(code: string): string[] {
    return skillRowsRead().flatMap((row: SkillRow): string[] => {
        const [own, type]: [string, string] = skillPartsOf(row.name);
        return own === code && type !== "" ? [type] : [];
    });
}

/** The codes of the skills of the semester, each once, the modules first. */
export function activeSkillsRead(): string[] {
    return [
        ...new Set([
            ...activeModulesRead().map(codeOf),
            ...skillRowsRead().map((row: SkillRow): string => skillCodeOf(row.name)),
        ]),
    ];
}

/**
 * Writes the rows sorted by name, every other line of the file as it is.
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
 * Adds a skill typed in the Skill list of the day as a row with an empty link, giving its code.
 * A name `Name (Type)` adds a type typed in the list of types to a skill of a row, giving the code of that skill.
 *
 * @throws {Error} - When the name is empty, starts with `.`, holds `|`, `/`, `\`, brackets but those of a type,
 *   when its code is taken, when its skill has its type already, has no row, is a module
 */
export function skillAdd(name: string): string {
    const clean: string = String(name ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const [code, type]: [string, string] = skillPartsOf(clean);
    if (clean === "" || /[|/\\]/.test(clean) || clean.startsWith(".") || (type === "" && /[()]/.test(clean)))
        throw new Error(`No name of a skill: ${clean}`);
    if (type !== "") {
        if (skillRowOf(code) === undefined || moduleFolderOf(code) !== undefined || skillTypesRead(code).includes(type))
            throw new Error(`No new type of a skill: ${clean}`);
    } else if (
        moduleFolderOf(code) !== undefined ||
        activeSkillsRead().some((known: string): boolean => known.toLowerCase() === code.toLowerCase())
    )
        throw new Error(`A skill has the name already: ${clean}`);
    rowsWrite([...skillRowsRead(), { name: clean, link: "" }]);
    return code;
}

/**
 * Gives the row of a skill or of one of its types the link I entered on one of its entries or boxes,
 * found by the whole summary, a `|` written as `%7C`.
 * Nothing for a summary without a row.
 */
function skillLinkSet(category: string, summary: string, link: string): void {
    const rows: SkillRow[] = skillRowsRead();
    const row: SkillRow | undefined = rows.find((one: SkillRow): boolean => one.name === summary);
    const written: string = link.replaceAll("|", "%7C");
    if (category !== skillName || row === undefined || row.link === written) return;
    rowsWrite(rows.map((one: SkillRow): SkillRow => (one === row ? { ...row, link: written } : one)));
}

linkFollow(skillLinkSet);
