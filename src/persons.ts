/**
 * ## Persons
 *
 * The people I name in `Persons.md`, a name is the key of its person.
 * Wherever the dashboard shows a person, its name links to its row in `Persons.md`.
 * A person is found by its name in either order.
 */

import { changesKept } from "./changes.ts";
import { readerAsk } from "./reader.ts";
import type { Person } from "../reader/persons.ts";

/** A person as I changed it below `With`, each part but the name empty for none. */
export type PersonEdit = {
    name: string;
    title: string;
    mail: string;
    link: string;
};

const personsPath: string = "NomMetainformations/Persons.md";

/** Heads of the columns of a table that name people, one name per line. */
const peopleHeads: string[] = ["Lecturers", "Tutor", "Head"];

/** Roles a line of a list names a person by, TUM Campus Straubing has a rector in place of a dean. */
export const peopleRoles: string[] = ["Dean", "Vice Dean", "Rector", "Prorector", "Head", "Vice Head"];

/** What parts names besides `<br>`, the `; ` of `With` and ` (komm.)` after a head acting for now. */
const namesParting: RegExp = /(\s*;\s*| \(komm\.\))/;

/** The people of `Persons.md` as the reader last sent them. */
export const personsKept: () => Promise<Person[]> = changesKept((): Promise<Person[]> =>
    readerAsk<Person[]>("/api/persons"),
);

/** The middle dot that parts people on one line, never a comma, since a name holds a comma. */
export const valueDot: string = "\u2002·\u2002";

/** Puts people on one line apart by {@link valueDot}, or the values of a summary apart by `parting`. */
export function dottedOf(names: (string | Node)[], parting: string = valueDot): (string | Node)[] {
    return names.flatMap((name: string | Node, index: number): (string | Node)[] => {
        if (index === 0) return [name];
        const dot: HTMLSpanElement = document.createElement("span");
        dot.className = parting === valueDot ? "value-dot" : "value-comma";
        dot.textContent = parting;
        return [dot, name];
    });
}

/** A name of `Persons.md` in the order it is spoken, `Vorname Nachname`, as an older entry may name it. */
export function spokenOf(name: string): string {
    const parts: string[] = name.split(", ");
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

/** The person of a name in either order, `undefined` for nobody of `Persons.md`, like a group. */
export function personOf(persons: Person[], name: string): Person | undefined {
    return persons.find((person: Person): boolean => person.name === name || spokenOf(person.name) === name);
}

/** The address that opens `Persons.md` in the editor at the row of a person. */
export function personRowAddressOf(person: Person): string {
    return `/edit?file=${encodeURIComponent(personsPath)}` + `&row=${encodeURIComponent(person.name)}`;
}

/** The link of a person to its row, without the arrow of a link out of my files, opened in this window. */
export function personLinkOf(person: Person, text: string): HTMLAnchorElement {
    const link: HTMLAnchorElement = document.createElement("a");
    link.className = "internal-link person-link";
    link.href = personRowAddressOf(person);
    link.textContent = text;
    return link;
}

/** Turns the names of people in the texts right in a cell into links, a link already there stays. */
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

/** Turns the names of a cell into links when its column names people. */
export function peopleCellLink(cell: HTMLElement, head: string): void {
    if (!peopleHeads.includes(head.trim())) return;
    personsKept()
        .then((persons: Person[]): void => namesLink(cell, persons))
        .catch((error: unknown): void => console.error(error));
}

/** Turns the names of people in each table of rendered Markdown into links. */
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

/** A person as `Persons.md` holds it before I change it, the address of the entry only when not `@invalid`. */
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
 * Sends each person I changed below `With` to the reader, which changes it everywhere.
 * With `dry` it only checks, so a dialog saves nothing the reader refuses.
 * A person picked that `Persons.md` does not hold yet gets its row there, so its name links.
 *
 * @throws {Error} - When the reader does not take a person
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
