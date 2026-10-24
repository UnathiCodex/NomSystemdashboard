/**
 * ## Persons
 *
 * Reads the people I name from `Persons.md`: one Markdown table, `| Person | Title | Mail | … |`, one row
 * per person, its name as `Nachname, Vorname`, like `Bichler, Martin`, or a single name, linked to its page
 * in TUMonline when it has one, like `[Bichler, Martin](https://campus.tum.de/…)`, its title, like `Prof. Dr.`,
 * and its mail, like `m.bichler@tum.de`, both kept, never shown; the rows ordered by name, small and capital letters
 * alike, as the table came.
 * A name is the key of its person, as the name of a food of `Foods.md` is in `Meals.md`: the columns `Lecturers`
 * of the courses of a module and `Tutor` of its groups, `Head` of a school or chair, the lines of `Schools.md` that
 * name a person by its role, like `- Dean: Bungartz, Hans-Joachim`, and `With` of an entry name a person by its name
 * alone, never with a link, and the page finds the person by it, see `src/persons.ts`; an entry
 * written with a person of a mail names that mail as its address, see {@link mailOf}.
 * The pencil beside the people of `With` changes a person everywhere once its dialog saves, see {@link personRename}:
 * its name, its mail and its link, in its row, in those columns and lines and in every entry of my calendars.
 *
 * - `node:fs`: Reads and writes `Persons.md` and the tables that name people.
 * - `node:path`: Joins the folder and the name of a file.
 * - `./sources.ts`: Names `Persons.md` and the folders of my modules and of my lists, and tells which files the reader
 *   may write.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataRoot, personsFile, universityRoot, writeAllowed } from "./sources.ts";


/**
 * A person, one row of `Persons.md`.
 *
 * - `name`: Its name, the text of its link or its plain cell, like `Bichler, Martin`.
 * - `link`: Its page in TUMonline, the address of its link, like `https://campus.tum.de/…`; empty for none.
 * - `title`: Its title, like `Prof. Dr.`, empty for none; kept, never shown.
 * - `mail`: Its mail, like `m.bichler@tum.de`, empty for none; kept, never shown.
 */
export type Person = {
    name: string;
    link: string;
    title: string;
    mail: string;
};

/**
 * A person changed by the pencil beside the people of `With`, as the page sends it, see {@link personRename}:
 * its name as the entries named it, like `Cuzic, Mihovil`, and its name, mail and link as typed.
 *
 * - `old`: Its name as it was.
 * - `name`: Its name as typed, like `Cuzic, Mihovil`.
 * - `mail`: Its mail as typed, like `mihovil.cuzic@tum.de`, empty for none.
 * - `link`: Its page as typed, like `https://campus.tum.de/…`, empty for none.
 * - `dry`: Whether only to check the change, writing nothing; false when left out.
 */
export type PersonRenamed = {
    old: string;
    name: string;
    mail: string;
    link: string;
    dry?: boolean;
};

/**
 * Writes the people a person goes by in my calendars anew, see `attendeesRename` in `calendar.ts`, handed in, since
 * `calendar.ts` reads this file for the mails, see {@link mailOf}: the old name, the new one, its mail and whether
 * only to count.
 */
export type AttendeesRename = (old: string, name: string, mail: string, dry: boolean) => number;

/**
 * Names of the columns of a table that name people, one per line, parted by `<br>`, like `Bichler, Martin<br>Chao,
 * Yutong`, see `peopleHeads` in `src/persons.ts`.
 */
const peopleHeads: string[] = ["Lecturers", "Tutor", "Head"];

/**
 * Roles a line of a list names a person by, like `- Dean: Bungartz, Hans-Joachim` of a school in `Schools.md`
 * or `- Rector: Sieber, Volker`, see `peopleRoles` in `src/persons.ts`.
 */
const peopleRoles: string[] = ["Dean", "Vice Dean", "Rector", "Prorector", "Head", "Vice Head"];

/**
 * A link typed for a person, a web address without spaces, like `https://campus.tum.de/…`.
 */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Lines of the table of `Persons.md` before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * A name with its link, as a cell of `Persons.md` writes it, like `[Bichler, Martin](https://campus.tum.de/…)`:
 * the name and the address.
 */
const linkedForm: RegExp = /^\[([^\]]*)\]\(([^)]*)\)$/;


/**
 * Reads the people of `Persons.md`: the lines of its table, starting with `|`, after the head of the table,
 * each cut into its cells; a row without a name stays out.
 * - `linked`: The name and the address of a name with its link, `null` for a plain one.
 *
 * @returns People in the order of the table, none while `Persons.md` does not exist
 */
export function personsRead(): Person[] {
    if (!existsSync(personsFile))
        return [];

    return readFileSync(personsFile, "utf8").split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map((line: string): string[] => line.split("|").slice(1, -1).map((cell: string): string => cell.trim()))
        .filter((cells: string[]): boolean => (cells[0] ?? "") !== "")
        .map((cells: string[]): Person => {
            const linked: RegExpExecArray | null = linkedForm.exec(cells[0]);
            return {
                name: linked?.[1].trim() ?? cells[0], link: linked?.[2].trim() ?? "", title: cells[1] ?? "",
                mail: cells[2] ?? "",
            };
        });
}

/**
 * Gives the mail of the person a name names in `Persons.md`, by its name, like `Bichler, Martin`, or by that name
 * spoken, `Vorname Nachname`, as an older entry may name the person, like `Martin Bichler`, as the page finds a person,
 * see `personOf` in `src/persons.ts`.
 * - `parts`: The parts of the name of a person, `Nachname` and `Vorname`, one for a single name.
 *
 * @param name - Name, like `Bichler, Martin`
 * @returns Its mail, like `m.bichler@tum.de`, empty for a person without one and for nobody of `Persons.md`
 */
export function mailOf(name: string): string {
    return personsRead().find((person: Person): boolean => {
        const parts: string[] = person.name.split(", ");
        return person.name === name || (parts.length === 2 && `${parts[1]} ${parts[0]}` === name);
    })?.mail ?? "";
}

/**
 * Gives a name as `Persons.md` names its person, for a single first name the one person of that `Vorname`,
 * like `Family, Sopha` of `Sopha`, the name a person I share with has in my reader, see `partners` in `sources.ts`.
 * - `named`: The people whose `Vorname` the name is, small and capital letters alike.
 *
 * @param name - Name, like `Sopha`
 * @returns The name of its person, like `Family, Sopha`; the name itself for none or for several
 */
export function personNameOf(name: string): string {
    const named: Person[] = name.includes(",") ? [] : personsRead().filter((person: Person): boolean =>
        person.name.split(", ")[1]?.toLowerCase() === name.toLowerCase());
    return named.length === 1 ? named[0].name : name;
}

/**
 * Writes the first cell of a person's row: its name, linked to its page when it has one.
 *
 * @param name - Name, like `Bichler, Martin`
 * @param link - Its page, empty for none
 * @returns Cell like `[Bichler, Martin](https://campus.tum.de/…)` or `Bichler, Martin`
 */
function nameCellOf(name: string, link: string): string {
    return link === "" ? name : `[${name}](${link})`;
}

/**
 * Gives the name of a person's row, the text of the link of its first cell or the cell itself.
 * - `cell`: Its first cell.
 *
 * @param line - Row like `| [Bichler, Martin](https://…) | Prof. Dr. | m.bichler@tum.de | … |`
 * @returns Name like `Bichler, Martin`, empty for none
 */
function rowNameOf(line: string): string {
    const cell: string = (line.split("|")[1] ?? "").trim();
    return linkedForm.exec(cell)?.[1].trim() ?? cell;
}

/**
 * Works out `Persons.md` with a person changed, see {@link personRename}: while no other row has the new name,
 * small and capital letters alike, the row of the old name takes the new name, its link and its mail as typed,
 * every other cell of it kept, like its title, and a person without row gets one; while another row has it,
 * the person moves to that row, which stays as it is, and the row of the old name goes, as a place moves to the row
 * of the name it is renamed to. The rows ordered anew by name, small and capital letters alike, as the table came,
 * every other line staying as it is.
 * - `lines`: Lines of the file.
 * - `first`: Index of the first row, after the head of the table.
 * - `last`: Index of the last line of the table.
 * - `isRow`: Tells whether a line is a row of the table.
 * - `row`: Index of the row of the old name, -1 for none.
 * - `target`: Index of another row of the new name, -1 for none.
 * - `kept`: The person of that other row.
 * - `width`: How many columns the table has.
 * - `cells`: The cells of the row of the old name, or of a new row.
 * - `written`: Its row as written.
 * - `end`: Index of the last line of the table then.
 * - `rows`: The rows, ordered.
 *
 * @param sent - The person as changed
 * @returns The text of the file, and the person as its row then holds it
 */
function personsTextOf(sent: PersonRenamed): [string, Person] {
    const lines: string[] = readFileSync(personsFile, "utf8").split("\n");
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    const isRow: (index: number) => boolean = (index: number): boolean => index >= first && index <= last && lines[index].startsWith("|");
    const row: number = lines.findIndex((line: string, index: number): boolean =>
        isRow(index) && rowNameOf(line) === sent.old);
    const target: number = lines.findIndex((line: string, index: number): boolean => isRow(index) && index !== row
        && rowNameOf(line).toLowerCase() === sent.name.toLowerCase());
    if (target !== -1) {
        const kept: Person = personsRead().find((person: Person): boolean =>
            person.name === rowNameOf(lines[target])) as Person;
        if (row !== -1)
            lines.splice(row, 1);
        return [lines.join("\n"), kept];
    }
    const width: number = lines[first - tableHead].split("|").length - 2;
    const cells: string[] = row === -1 ? Array.from({ length: width }, (): string => "")
        : lines[row].split("|").slice(1, -1).map((cell: string): string => cell.trim());
    cells[0] = nameCellOf(sent.name, sent.link);
    cells[2] = sent.mail;
    const written: string = `| ${cells.join(" | ")} |`;
    if (row === -1)
        lines.splice(last + 1, 0, written);
    else
        lines[row] = written;
    const end: number = row === -1 ? last + 1 : last;
    const rows: string[] = lines.slice(first, end + 1).sort((one: string, other: string): number => {
        const [a, b]: string[] = [rowNameOf(one).toLowerCase(), rowNameOf(other).toLowerCase()];
        return a < b ? -1 : a > b ? 1 : 0;
    });
    lines.splice(first, end + 1 - first, ...rows);
    return [lines.join("\n"), { name: sent.name, link: sent.link, title: cells[1] ?? "", mail: sent.mail }];
}

/**
 * Works out a Markdown file with a person renamed in its columns that name people, see {@link peopleHeads}, and in
 * the lines of a list that name a person by its role, see {@link peopleRoles}, like `- Dean: Bungartz, Hans-Joachim`:
 * in each table of such a column, every name of the old name in its cells takes the new one, a cell holding several
 * names parted by `<br>`, a name it then holds twice once, and so does such a line of the old name, every other cell
 * and line staying as it is.
 * - `role`: The role a line names the old name by, `undefined` for none.
 * - `lines`: Lines of the file.
 * - `named`: Indexes of the columns that name people in the table being read, none outside a table.
 * - `cells`: Cells of a row.
 * - `names`: The names of a cell.
 *
 * @param file - Path of the file
 * @param old - Old name, like `Cuzic, Mihovil`
 * @param name - New name
 * @returns Its text with the person renamed
 */
function peopleTextOf(file: string, old: string, name: string): string {
    const lines: string[] = readFileSync(file, "utf8").split("\n");
    let named: number[] = [];
    lines.forEach((line: string, index: number): void => {
        if (!line.startsWith("|")) {
            named = [];
            const role: string | undefined = peopleRoles.find((one: string): boolean =>
                line.trimEnd() === `- ${one}: ${old}`);
            if (role !== undefined)
                lines[index] = `- ${role}: ${name}`;
            return;
        }
        const cells: string[] = line.split("|");
        if (named.length === 0 && !(lines[index - 1] ?? "").startsWith("|")) {
            named = cells.flatMap((cell: string, at: number): number[] =>
                peopleHeads.includes(cell.trim()) ? [at] : []);
            return;
        }
        named.forEach((at: number): void => {
            const names: string[] = (cells[at] ?? "").trim().split("<br>");
            if (names.includes(old))
                cells[at] = ` ${[...new Set(names.map((one: string): string => one === old ? name : one))].join("<br>")} `;
        });
        lines[index] = cells.join("|");
    });
    return lines.join("\n");
}

/**
 * Changes a person everywhere, as the pencil beside the people of `With` asks once its dialog saves, see
 * `withRowOf` in `src/day/categories.ts`: its row in `Persons.md`, see {@link personsTextOf}, its name in the columns
 * that name people of the files of my modules and my lists, see {@link peopleTextOf}, and every person of that name
 * in my calendars with its mail, see {@link AttendeesRename}. Works out every file first and writes only then,
 * so nothing is written while one cannot be; with `dry` only checks.
 * - `clean`: Cleans a text: `|` and line breaks as spaces, spaces in a row one, none at the ends.
 * - `name`: The new name, cleaned.
 * - `mail`, `link`: The mail and the page, cleaned the same way.
 * - `cleaned`: The person as sent, cleaned.
 * - `persons`: `Persons.md` as it would be, with the person as its row then holds it.
 * - `tables`: Each file that names the person in a column of people, with its text as it would be.
 *
 * @param sent - The person as changed
 * @param attendees - Writes the people of my calendars anew, see {@link AttendeesRename}
 * @throws {Error} - When the old or the new name is empty, the new name holds `;`, which parts the names of `With`,
 *   the link is no web address, or a file lies outside the new system
 */
export function personRename(sent: PersonRenamed, attendees: AttendeesRename): void {
    const clean: (text: unknown) => string = (text: unknown): string => String(text ?? "").replace(/[|\n]/g, " ").replace(/\s+/g, " ").trim();
    const name: string = clean(sent.name);
    const mail: string = clean(sent.mail);
    const link: string = clean(sent.link);
    const cleaned: PersonRenamed = { old: String(sent.old ?? "").trim(), name: name, mail: mail, link: link };
    if (cleaned.old === "" || name === "" || name.includes(";"))
        throw new Error(`No name of a person: ${name}`);
    if (link !== "" && !linkForm.test(link))
        throw new Error(`No link of ${name}: ${link}`);
    const persons: [string, Person] = personsTextOf(cleaned);
    const tables: [string, string][] = [universityRoot, dataRoot]
        .flatMap((folder: string): string[] => existsSync(folder) ? readdirSync(folder)
            .filter((file: string): boolean => file.endsWith(".md")).map((file: string): string => join(folder, file)) : [])
        .map((file: string): [string, string] => [file, peopleTextOf(file, cleaned.old, persons[1].name)])
        .filter(([file, text]: [string, string]): boolean => text !== readFileSync(file, "utf8"));
    [personsFile, ...tables.map(([file]: [string, string]): string => file)].forEach((file: string): void => {
        if (!writeAllowed(file))
            throw new Error(`No writing outside the new system: ${file}`);
    });
    attendees(cleaned.old, persons[1].name, persons[1].mail, true);
    if (sent.dry === true)
        return;
    writeFileSync(personsFile, persons[0]);
    tables.forEach(([file, text]: [string, string]): void => writeFileSync(file, text));
    attendees(cleaned.old, persons[1].name, persons[1].mail, false);
}
