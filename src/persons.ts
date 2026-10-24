/**
 * ## Persons
 *
 * The people I name, as the reader reads them from `Persons.md`, see `reader/persons.ts`, kept and loaded anew after
 * every change of a file, see `changesKept` in `./changes.ts`. A name is the key of its person, and no file links
 * a person: wherever the dashboard shows names of people, in the columns `Lecturers` of the courses of a module file,
 * `Tutor` of its groups and `Head` of the departments and chairs in `Schools.md`, one name per line, like
 * `Bichler, Martin<br>Chao, Yutong`, see {@link peopleLink}, under `## Modulverantwortliche`
 * of a module file, one name per item, see `responsiblesLook` in `./editor/preview.ts`, in `With` of an entry,
 * see `../day/categories.ts`, and in the rows of the course of a module, see `./editor/course.ts`, the name of a person is a link that opens `Persons.md` in the editor at its row,
 * marked there, see `rowShow` in `./editor/preview.ts`; any other name stays plain text.
 * The pencil beside the people of `With` changes a person, its name, its mail and its link, and the dialog sends
 * each person I changed so once it saves, see {@link personsRename}, which renames it everywhere.
 * A person is found by its name in either order, `Nachname, Vorname` as `Persons.md` writes it, or `Vorname Nachname`
 * as an older entry may, like `Philip Zimmer` for `Zimmer, Philip`, see {@link personOf}.
 *
 * - `./changes.ts`: Keeps the people, loaded once and anew after every change of a file.
 * - `./reader.ts`: Asks the reader.
 */

import { changesKept } from "./changes.ts";
import { readerAsk } from "./reader.ts";


/**
 * A person of `Persons.md`, as the reader sends it.
 *
 * - `name`: Its name, like `Bichler, Martin`.
 * - `link`: Its page in TUMonline, like `https://campus.tum.de/…`, empty for none.
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
 * A person as I changed it by its parts below `With`, see `withRowOf` in `./day/categories.ts`: its name, its mail
 * and its link as typed.
 *
 * - `name`: Its name, like `Cuzic, Mihovil`.
 * - `mail`: Its mail, like `mihovil.cuzic@tum.de`, empty for none.
 * - `link`: Its page, like `https://campus.tum.de/…`, empty for none.
 */
export type PersonEdit = {
    name: string;
    mail: string;
    link: string;
};

/**
 * Path of `Persons.md` in the tree of my new system, as the editor opens it, see `./editor/editor.ts`.
 */
const personsPath: string = "NomMetainformations/Persons.md";

/**
 * Heads of the columns of a table that name people: `Lecturers` of the courses of a module file, `Tutor`
 * of its groups, and `Head` of the departments and chairs in `Schools.md`.
 */
const peopleHeads: string[] = ["Lecturers", "Tutor", "Head"];

/**
 * Roles a line of a list names a person by, like `- Dean: Bungartz, Hans-Joachim` of a school in `Schools.md`, its
 * name a link to its row, see `responsibleOf` in `./editor/preview.ts`.
 */
export const peopleRoles: string[] = ["Dean", "Vice Dean", "Head", "Vice Head"];

/**
 * What parts names in a text besides a line break `<br>`: `; ` with the spaces around it, as `With` parts them.
 */
const namesParting: RegExp = /(\s*;\s*)/;

/**
 * Gives the people of `Persons.md` as the reader last sent them, loaded as the code of the page loads and anew after
 * every change of a file, see `changesKept` in `./changes.ts`, so whoever needs them gets them without waiting.
 */
export const personsKept: () => Promise<Person[]> = changesKept((): Promise<Person[]> =>
    readerAsk<Person[]>("/api/persons"));


/**
 * Puts several people on one line, each name apart by a middle dot, like `Durmann, Julius · Ewert, Markus`, never
 * a comma or `; `, since a name holds a comma; the dot with more room on both sides than a dot between other parts
 * of a line, see `.people-dot` in `./day/day.css`, the line going on after it where it is too long.
 * - `dot`: The dot between two names.
 *
 * @param names - The names, each its text or its link
 * @returns The names with the dots between them
 */
export function peopleOf(names: (string | Node)[]): (string | Node)[] {
    return names.flatMap((name: string | Node, index: number): (string | Node)[] => {
        if (index === 0)
            return [name];
        const dot: HTMLSpanElement = document.createElement("span");
        dot.className = "people-dot";
        dot.textContent = " · ";
        return [dot, name];
    });
}

/**
 * Gives a name of `Persons.md` in the order it is spoken, `Vorname Nachname`, as an older entry may name the person;
 * a single name as it is.
 * - `parts`: The parts of the name, `Nachname` and `Vorname`, one for a single name.
 *
 * @param name - Name, like `Zimmer, Philip`
 * @returns The name spoken, like `Philip Zimmer`
 */
export function spokenOf(name: string): string {
    const parts: string[] = name.split(", ");
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

/**
 * Finds the person a name names: by its name in `Persons.md`, like `Zimmer, Philip`, or by that name spoken,
 * see {@link spokenOf}, like `Philip Zimmer`.
 *
 * @param persons - The people of `Persons.md`
 * @param name - Name, like `Philip Zimmer`
 * @returns The person, `undefined` for a name of nobody of `Persons.md`, like a group, `Socials`
 */
export function personOf(persons: Person[], name: string): Person | undefined {
    return persons.find((person: Person): boolean => person.name === name || spokenOf(person.name) === name);
}

/**
 * Gives the address that opens `Persons.md` in the editor at the row of a person, marked there, see `rowShow`
 * in `./editor/preview.ts`.
 *
 * @param person - The person, like `Bichler, Martin`
 * @returns Address like `/edit?file=NomMetainformations%2FPersons.md&row=Bichler%2C%20Martin`
 */
export function personRowAddressOf(person: Person): string {
    return `/edit?file=${encodeURIComponent(personsPath)}&row=${encodeURIComponent(person.name)}`;
}

/**
 * Makes the link of a person, in a table or in a row of a card of the course, see `../editor/course.ts`, to its row
 * in `Persons.md`, see {@link personRowAddressOf}: a link into my files, `internal-link`, without the arrow of a link
 * out of them, see `../notes/notes.css`, and `person-link`, which the editor follows in this window, see `BlockWidget`
 * in `./editor/preview.ts`.
 * - `link`: The link.
 *
 * @param person - The person
 * @param text - Its name as written, like `Bichler, Martin`
 * @returns The link
 */
export function personLinkOf(person: Person, text: string): HTMLAnchorElement {
    const link: HTMLAnchorElement = document.createElement("a");
    link.className = "internal-link person-link";
    link.href = personRowAddressOf(person);
    link.textContent = text;
    return link;
}

/**
 * Turns the names of people in a cell of a table into links, see {@link personLinkOf}: each text right in the cell,
 * its names one per line, parted by `<br>`, or parted by `; `, a name of a person a link, any other name staying text,
 * and so does the text of a link already there.
 * - `parts`: The names of a text and what parts them, in turns.
 * - `person`: The person a name names, `undefined` for nobody and for what parts names.
 *
 * @param cell - The cell, rendered
 * @param persons - The people of `Persons.md`
 */
function namesLink(cell: HTMLElement, persons: Person[]): void {
    [...cell.childNodes].filter((node: ChildNode): boolean => node.nodeType === Node.TEXT_NODE)
        .forEach((node: ChildNode): void => {
            const parts: string[] = (node.textContent ?? "").split(namesParting);
            node.replaceWith(...parts.map((part: string, index: number): string | HTMLAnchorElement => {
                const person: Person | undefined = index % 2 === 0 ? personOf(persons, part) : undefined;
                return person === undefined ? part : personLinkOf(person, part);
            }));
        });
}

/**
 * Turns the names of a cell of a column that names people, see {@link peopleHeads}, into links once the people
 * are loaded, see {@link namesLink}; a cell of any other column stays as it is. Used for each cell of a table opened
 * over the page, see `../editor/table.ts`, and of a table rendered in a file, see {@link peopleLink}.
 *
 * @param cell - The cell, rendered
 * @param head - Head of its column, like `Lecturers`
 */
export function peopleCellLink(cell: HTMLElement, head: string): void {
    if (!peopleHeads.includes(head.trim()))
        return;
    personsKept().then((persons: Person[]): void => namesLink(cell, persons))
        .catch((error: unknown): void => console.error(error));
}

/**
 * Turns the names in the columns that name people of each table of rendered Markdown into links,
 * see {@link peopleCellLink}, like those of the courses and the groups of a module file, as the editor renders
 * its tables, see `blockRender`
 * in `./editor/preview.ts`.
 * - `heads`: The heads of the columns of a table, its first row.
 *
 * @param block - Rendered Markdown
 */
export function peopleLink(block: HTMLElement): void {
    block.querySelectorAll<HTMLTableElement>("table").forEach((table: HTMLTableElement): void => {
        const heads: string[] = [...(table.rows[0]?.cells ?? [])]
            .map((head: HTMLTableCellElement): string => head.textContent ?? "");
        [...table.rows].slice(1).forEach((row: HTMLTableRowElement): void => {
            [...row.cells].forEach((cell: HTMLTableCellElement, column: number): void => {
                peopleCellLink(cell, heads[column] ?? "");
            });
        });
    });
}

/**
 * Gives a person as its parts below `With` show it before I change it: its name, its mail and its link
 * as `Persons.md` holds them, a person not there with no link, and with the address the entry gives it while that
 * is a real one, not one ending in `@invalid`, see `standardAddressOf` in `./day/entries.ts`.
 * - `person`: The person of `Persons.md` the name names, `undefined` for none.
 *
 * @param persons - The people of `Persons.md`
 * @param name - Name as picked, like `Cuzic, Mihovil`
 * @param address - Its address in the entry, like `mihovil.cuzic@invalid`
 * @returns The person as it is
 */
export function personEditOf(persons: Person[], name: string, address: string): PersonEdit {
    const person: Person | undefined = personOf(persons, name);
    return {
        name: person?.name ?? name, link: person?.link ?? "",
        mail: person !== undefined && person.mail !== "" ? person.mail : address.endsWith("@invalid") ? "" : address,
    };
}

/**
 * Sends each person I changed by its parts below `With` to the reader, which changes it everywhere, its row
 * in `Persons.md`, the columns that name people and every entry of my calendars, see `personRename`
 * in `reader/persons.ts`; or which only checks that it would, writing nothing, so a dialog saves nothing it refuses.
 * A person as it was, see {@link personEditOf}, goes nowhere.
 *
 * @param edits - Each person I changed, by its name as picked, with the address it had in the entry
 * @param persons - The people of `Persons.md`
 * @param dry - Whether only to check
 * @throws {Error} - When the reader does not take a person, like one without name or with a link that is none
 */
export async function personsRename(edits: { [old: string]: PersonEdit & { address: string } },
                                    persons: Person[], dry: boolean): Promise<void> {
    for (const [old, edit] of Object.entries(edits)) {
        const was: PersonEdit = personEditOf(persons, old, edit.address);
        if (edit.name !== was.name || edit.mail !== was.mail || edit.link !== was.link)
            await readerAsk<null>("/api/persons/renamed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old: old, name: edit.name, mail: edit.mail, link: edit.link, dry: dry }),
            });
    }
}
