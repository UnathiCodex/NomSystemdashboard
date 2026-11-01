/**
 * ## Persons
 *
 * The people I name, as the reader reads them from `Persons.md`, see `reader/persons.ts`.
 * A name is the key of its person, and no file links a person:
 * wherever the dashboard shows names of people,
 * the name of a person is a link that opens `Persons.md` in the editor at its row,
 * any other name stays plain text.
 * The pencil beside the people of `With` changes a person,
 * and the dialog sends each person I changed once it saves, see {@link personsRename}.
 * A person is found by its name in either order, see {@link personOf}.
 */

import { changesKept } from "./changes.ts";
import { readerAsk } from "./reader.ts";
import type { Person } from "../reader/persons.ts";

/**
 * A person as I changed it below `With`, see `withRowOf` in `./day/attendance.ts`,
 * each part empty for none but the name.
 */
export type PersonEdit = {
    name: string;
    title: string;
    mail: string;
    link: string;
};

/**
 * Path of `Persons.md` in the tree of my new system, as the editor opens it.
 */
const personsPath: string = "NomMetainformations/Persons.md";

/**
 * Heads of the columns of a table that name people, one name per line.
 */
const peopleHeads: string[] = ["Lecturers", "Tutor", "Head"];

/**
 * Roles a line of a list names a person by, see `responsibleOf` in `./editor/preview.ts`.
 * TUM Campus Straubing has a rector in place of a dean.
 */
export const peopleRoles: string[] = ["Dean", "Vice Dean", "Rector", "Prorector", "Head", "Vice Head"];

/**
 * What parts names in a text besides a line break `<br>`:
 * `; ` as `With` parts them, and ` (komm.)` after a head who leads a chair for now,
 * see `actingMark` in `reader/persons.ts`.
 */
const namesParting: RegExp = /(\s*;\s*| \(komm\.\))/;

/**
 * Gives the people of `Persons.md` as the reader last sent them,
 * see `changesKept` in `./changes.ts`.
 */
export const personsKept: () => Promise<Person[]> = changesKept((): Promise<Person[]> =>
    readerAsk<Person[]>("/api/persons"),
);

/**
 * The middle dot that parts people on one line,
 * never a comma or `; `, since a name holds a comma.
 * An en space on each side, as far as every dot that parts a line.
 */
export const valueDot: string = "\u2002·\u2002";

/**
 * Puts several people on one line, each apart by {@link valueDot},
 * or the values of a summary, apart by `parting`, the comma of its file,
 * the line going on after it where it is too long.
 */
export function dottedOf(names: (string | Node)[], parting: string = valueDot): (string | Node)[] {
    return names.flatMap((name: string | Node, index: number): (string | Node)[] => {
        if (index === 0) return [name];
        const dot: HTMLSpanElement = document.createElement("span");
        dot.className = parting === valueDot ? "value-dot" : "value-comma";
        dot.textContent = parting;
        return [dot, name];
    });
}

/**
 * Gives a name of `Persons.md` in the order it is spoken, `Vorname Nachname`,
 * as an older entry may name the person, a single name as it is.
 */
export function spokenOf(name: string): string {
    const parts: string[] = name.split(", ");
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

/**
 * Finds the person a name names, by its name in `Persons.md` or that name spoken,
 * `undefined` for nobody of `Persons.md`, like a group.
 */
export function personOf(persons: Person[], name: string): Person | undefined {
    return persons.find((person: Person): boolean => person.name === name || spokenOf(person.name) === name);
}

/**
 * Gives the address that opens `Persons.md` in the editor at the row of a person,
 * see `rowShow` in `./editor/preview.ts`.
 */
export function personRowAddressOf(person: Person): string {
    return `/edit?file=${encodeURIComponent(personsPath)}` + `&row=${encodeURIComponent(person.name)}`;
}

/**
 * Makes the link of a person to its row in `Persons.md`:
 * `internal-link` without the arrow of a link out of my files,
 * and `person-link`, which the editor follows in this window,
 * see `BlockWidget` in `./editor/preview.ts`.
 */
export function personLinkOf(person: Person, text: string): HTMLAnchorElement {
    const link: HTMLAnchorElement = document.createElement("a");
    link.className = "internal-link person-link";
    link.href = personRowAddressOf(person);
    link.textContent = text;
    return link;
}

/**
 * Turns the names of people in each text right in a cell into links,
 * any other name and the text of a link already there staying text.
 * - `parts`: The names of a text and what parts them, in turns.
 */
function namesLink(cell: HTMLElement, persons: Person[]): void {
    [...cell.childNodes]
        .filter((node: ChildNode): boolean => node.nodeType === Node.TEXT_NODE)
        .forEach((node: ChildNode): void => {
            const parts: string[] = (node.textContent ?? "").split(namesParting);
            node.replaceWith(
                ...parts.map((part: string, index: number): string | HTMLAnchorElement => {
                    const person: Person | undefined = index % 2 === 0 ? personOf(persons, part) : undefined;
                    return person === undefined ? part : personLinkOf(person, part);
                }),
            );
        });
}

/**
 * Turns the names of a cell of a column that names people into links,
 * once the people are loaded, a cell of any other column stays as it is.
 */
export function peopleCellLink(cell: HTMLElement, head: string): void {
    if (!peopleHeads.includes(head.trim())) return;
    personsKept()
        .then((persons: Person[]): void => namesLink(cell, persons))
        .catch((error: unknown): void => console.error(error));
}

/**
 * Turns the names in the columns that name people of each table
 * of rendered Markdown into links, see `blockRender` in `./editor/preview.ts`.
 */
export function peopleLink(block: HTMLElement): void {
    block.querySelectorAll<HTMLTableElement>("table").forEach((table: HTMLTableElement): void => {
        const heads: string[] = [...(table.rows[0]?.cells ?? [])].map(
            (head: HTMLTableCellElement): string => head.textContent ?? "",
        );
        [...table.rows].slice(1).forEach((row: HTMLTableRowElement): void => {
            [...row.cells].forEach((cell: HTMLTableCellElement, column: number): void => {
                peopleCellLink(cell, heads[column] ?? "");
            });
        });
    });
}

/**
 * Gives a person as its parts below `With` show it before I change it,
 * as `Persons.md` holds it, with the address of the entry only while that is a real one,
 * not one ending in `@invalid`, see `standardAddressOf` in `./day/entries.ts`.
 */
export function personEditOf(persons: Person[], name: string, address: string): PersonEdit {
    const person: Person | undefined = personOf(persons, name);
    return {
        name: person?.name ?? name,
        title: person?.title ?? "",
        link: person?.link ?? "",
        mail: person !== undefined && person.mail !== "" ? person.mail : address.endsWith("@invalid") ? "" : address,
    };
}

/**
 * Sends each person I changed below `With` to the reader, which changes it everywhere,
 * see `personRename` in `reader/persons.ts`.
 * With `dry` it only checks that it would, so a dialog saves nothing it refuses.
 * A person as it was goes nowhere, but one `Persons.md` does not hold yet,
 * also one picked without changing it, which then gets its row there, so its name links.
 *
 * @throws {Error} - When the reader does not take a person,
 *   like one without name or with a link that is none
 */
export async function personsRename(
    edits: { [old: string]: PersonEdit & { address: string } },
    persons: Person[],
    dry: boolean,
    picked: string[] = [],
): Promise<void> {
    const all: { [old: string]: PersonEdit & { address: string } } = {
        ...Object.fromEntries(
            picked
                .filter((name: string): boolean => personOf(persons, name) === undefined)
                .map((name: string): [string, PersonEdit & { address: string }] => [
                    name,
                    { name: name, title: "", mail: "", link: "", address: "" },
                ]),
        ),
        ...edits,
    };
    for (const [old, edit] of Object.entries(all)) {
        const was: PersonEdit = personEditOf(persons, old, edit.address);
        if (
            personOf(persons, old) === undefined ||
            edit.name !== was.name ||
            edit.title !== was.title ||
            edit.mail !== was.mail ||
            edit.link !== was.link
        )
            await readerAsk<null>("/api/persons/renamed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    old: old,
                    name: edit.name,
                    title: edit.title,
                    mail: edit.mail,
                    link: edit.link,
                    dry: dry,
                }),
            });
    }
}
