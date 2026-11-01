/**
 * ## Persons
 *
 * The people I name, in `Persons.md` as one table `| Person | Title | Mail | … |`.
 * A name is `Nachname, Vorname` or a single name, linked to its page in TUMonline when it has one.
 * Its title and mail are kept, never shown.
 * The name is the key of its person, so every other file names a person by its name alone, never with a link.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataFolders, personsFile, universityRoot, writeAllowed } from "./sources.ts";

/** A row of `Persons.md`, `title` its title or what I typed. */
export type Person = {
    name: string;
    link: string;
    title: string;
    mail: string;
};

/**
 * A person changed by the pencil beside the people of `With`.
 * - `old`: Its name as the entries named it.
 * - `title`: Left out, it keeps its title.
 * - `dry`: Only checks, writing nothing.
 */
export type PersonRenamed = {
    old: string;
    name: string;
    title?: string;
    mail: string;
    link: string;
    dry?: boolean;
};

/** Renames a person in my calendars, handed in, since `./calendar.ts` imports this file for the mails. */
export type AttendeesRename = (old: string, name: string, mail: string, dry: boolean) => number;

/** Columns of a table that name people, one per line, parted by `<br>`. */
const peopleHeads: string[] = ["Lecturers", "Tutor", "Head"];

/** Follows the name of a head who leads a chair for now in `Schools.md`, kept on a rename. */
const actingMark: string = " (komm.)";

/** Roles a line of a list names a person by, like `- Dean: <name>`. */
const peopleRoles: string[] = ["Dean", "Vice Dean", "Rector", "Prorector", "Head", "Vice Head"];

/** A web address without spaces. */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/** Lines of the table before its rows. */
const tableHead: number = 2;

/** A name with its link, as a cell writes it. */
const linkedForm: RegExp = /^\[([^\]]*)\]\(([^)]*)\)$/;

/** In the order of the table, none while it does not exist, a row without a name left out. */
export function personsRead(): Person[] {
    if (!existsSync(personsFile)) return [];

    return readFileSync(personsFile, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map((line: string): string[] =>
            line
                .split("|")
                .slice(1, -1)
                .map((cell: string): string => cell.trim()),
        )
        .filter((cells: string[]): boolean => (cells[0] ?? "") !== "")
        .map((cells: string[]): Person => {
            const linked: RegExpExecArray | null = linkedForm.exec(cells[0]);
            return {
                name: linked?.[1].trim() ?? cells[0],
                link: linked?.[2].trim() ?? "",
                title: cells[1] ?? "",
                mail: cells[2] ?? "",
            };
        });
}

/**
 * The mail of a person, empty for none.
 * Found by its name or by `Vorname Nachname`, as an older entry may name the person.
 */
export function mailOf(name: string): string {
    return (
        personsRead().find((person: Person): boolean => {
            const parts: string[] = person.name.split(", ");
            return person.name === name || (parts.length === 2 && `${parts[1]} ${parts[0]}` === name);
        })?.mail ?? ""
    );
}

/**
 * A name as `Persons.md` names its person, for a single first name the one person of that `Vorname`.
 * The name itself for none or for several.
 */
export function personNameOf(name: string): string {
    const named: Person[] = name.includes(",")
        ? []
        : personsRead().filter(
              (person: Person): boolean => person.name.split(", ")[1]?.toLowerCase() === name.toLowerCase(),
          );
    return named.length === 1 ? named[0].name : name;
}

function nameCellOf(name: string, link: string): string {
    return link === "" ? name : `[${name}](${link})`;
}

function rowNameOf(line: string): string {
    const cell: string = (line.split("|")[1] ?? "").trim();
    return linkedForm.exec(cell)?.[1].trim() ?? cell;
}

/**
 * Gives `Persons.md` with a person changed, and the person as its row then holds it.
 * While another row has the new name, ignoring case, the person moves there and its old row goes.
 * Else its row takes the new name, link and mail, its other cells kept, and a person without a row gets one.
 * The rows are sorted by name anew, ignoring case, every other line as it is.
 */
function personsTextOf(sent: PersonRenamed): [string, Person] {
    const lines: string[] = readFileSync(personsFile, "utf8").split("\n");
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    const isRow: (index: number) => boolean = (index: number): boolean =>
        index >= first && index <= last && lines[index].startsWith("|");
    const row: number = lines.findIndex(
        (line: string, index: number): boolean => isRow(index) && rowNameOf(line) === sent.old,
    );
    const target: number = lines.findIndex(
        (line: string, index: number): boolean =>
            isRow(index) && index !== row && rowNameOf(line).toLowerCase() === sent.name.toLowerCase(),
    );
    if (target !== -1) {
        const kept: Person = personsRead().find(
            (person: Person): boolean => person.name === rowNameOf(lines[target]),
        ) as Person;
        if (row !== -1) lines.splice(row, 1);
        return [lines.join("\n"), kept];
    }
    const width: number = lines[first - tableHead].split("|").length - 2;
    const cells: string[] =
        row === -1
            ? Array.from({ length: width }, (): string => "")
            : lines[row]
                  .split("|")
                  .slice(1, -1)
                  .map((cell: string): string => cell.trim());
    cells[0] = nameCellOf(sent.name, sent.link);
    if (sent.title !== undefined) cells[1] = sent.title;
    cells[2] = sent.mail;
    const written: string = `| ${cells.join(" | ")} |`;
    if (row === -1) lines.splice(last + 1, 0, written);
    else lines[row] = written;
    const end: number = row === -1 ? last + 1 : last;
    const rows: string[] = lines.slice(first, end + 1).sort((one: string, other: string): number => {
        const [a, b]: string[] = [rowNameOf(one).toLowerCase(), rowNameOf(other).toLowerCase()];
        return a < b ? -1 : a > b ? 1 : 0;
    });
    lines.splice(first, end + 1 - first, ...rows);
    return [lines.join("\n"), { name: sent.name, link: sent.link, title: cells[1] ?? "", mail: sent.mail }];
}

/**
 * Gives a Markdown file with a person renamed in its columns of people and its lines of roles.
 * A name a cell then holds twice stays once.
 * - `named`: The columns of people of the table being read, none outside a table.
 */
function peopleTextOf(file: string, old: string, name: string): string {
    const lines: string[] = readFileSync(file, "utf8").split("\n");
    let named: number[] = [];
    lines.forEach((line: string, index: number): void => {
        if (!line.startsWith("|")) {
            named = [];
            const role: string | undefined = peopleRoles.find(
                (one: string): boolean => line.trimEnd() === `- ${one}: ${old}`,
            );
            if (role !== undefined) lines[index] = `- ${role}: ${name}`;
            return;
        }
        const cells: string[] = line.split("|");
        if (named.length === 0 && !(lines[index - 1] ?? "").startsWith("|")) {
            named = cells.flatMap((cell: string, at: number): number[] =>
                peopleHeads.includes(cell.trim()) ? [at] : [],
            );
            return;
        }
        named.forEach((at: number): void => {
            const names: string[] = (cells[at] ?? "").trim().split("<br>");
            const renamed: string[] = names.map((one: string): string =>
                one.replace(actingMark, "") === old ? one.replace(old, name) : one,
            );
            if (renamed.join("<br>") !== names.join("<br>")) cells[at] = ` ${[...new Set(renamed)].join("<br>")} `;
        });
        lines[index] = cells.join("|");
    });
    return lines.join("\n");
}

/**
 * Changes a person everywhere, its row, its name in my modules and lists, and in my calendars with its mail.
 * Works out every file first and writes only then, so nothing is written while one cannot be.
 *
 * @throws {Error} - When a name is empty, the new one holds the `;` of `With`, the link is bad or a file lies outside
 */
export function personRename(sent: PersonRenamed, attendees: AttendeesRename): void {
    const clean: (text: unknown) => string = (text: unknown): string =>
        String(text ?? "")
            .replace(/[|\n]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    const name: string = clean(sent.name);
    const mail: string = clean(sent.mail);
    const link: string = clean(sent.link);
    const cleaned: PersonRenamed = {
        old: String(sent.old ?? "").trim(),
        name: name,
        ...(sent.title === undefined ? {} : { title: clean(sent.title) }),
        mail: mail,
        link: link,
    };
    if (cleaned.old === "" || name === "" || name.includes(";")) throw new Error(`No name of a person: ${name}`);
    if (link !== "" && !linkForm.test(link)) throw new Error(`No link of ${name}: ${link}`);
    const persons: [string, Person] = personsTextOf(cleaned);
    const tables: [string, string][] = [universityRoot, ...dataFolders]
        .flatMap((folder: string): string[] =>
            existsSync(folder)
                ? readdirSync(folder)
                      .filter((file: string): boolean => file.endsWith(".md"))
                      .map((file: string): string => join(folder, file))
                : [],
        )
        .map((file: string): [string, string] => [file, peopleTextOf(file, cleaned.old, persons[1].name)])
        .filter(([file, text]: [string, string]): boolean => text !== readFileSync(file, "utf8"));
    [personsFile, ...tables.map(([file]: [string, string]): string => file)].forEach((file: string): void => {
        if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${file}`);
    });
    attendees(cleaned.old, persons[1].name, persons[1].mail, true);
    if (sent.dry === true) return;
    writeFileSync(personsFile, persons[0]);
    tables.forEach(([file, text]: [string, string]): void => writeFileSync(file, text));
    attendees(cleaned.old, persons[1].name, persons[1].mail, false);
}
