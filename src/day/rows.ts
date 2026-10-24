/**
 * ## Rows
 *
 * One row of a box in a list, built alike wherever boxes stand in a list, so the lists never look or work apart:
 * in the list `Entries` of the dialog of a series, see `./series.ts`, by month, and in a card of the course
 * on the page of a module, see `../editor/course.ts`, without months. A row is the same unit as a box of the plan:
 * its number in a small grey box, like `2`, `–` for one the university cancelled, of an exam its kind, like `Endterm`,
 * the one button that opens its box while it has one, see {@link numberOf}, of a box without number, like a day
 * of my sleep, its day instead; its day with its weekday after it, like `29.10.2026 (Thu)`, as wide in every row, then grey its group while it has one, like `Group 05`, a column of its own
 * that every row has, empty without group, so every column stands at the same place in every row of every list;
 * right of them grey its times and its place, then what more there is to say, like `in 77 days` of an exam or `new`
 * of a box a change of its series makes, like `10:00 – 12:00 · 5610.01.011 · in 77 days`, see {@link metaOf}, and
 * right below them all the people I am with, each a link to its row in `Persons.md`; and at its right edge, beside both
 * lines, in a column as wide in every row, its actions while open, else the icon of its state, as in the plan.
 * Greyed while not open, as a box of the plan no longer open.
 * Every row has the same columns, see `.series-row` in `./series.css`, so the rows of a list stand alike.
 *
 * - `../persons.ts`: Finds the person of a name, makes its link and puts people on one line.
 * - `./times.ts`: Writes times and a length.
 * - `./entries.ts`: The type of who I am with.
 * - `../food/foods.ts`: Makes elements.
 */

import { peopleOf, personLinkOf, personOf } from "../persons.ts";
import { lengthOf, timeOf, weekdayDateTextOf } from "./times.ts";
import { elementOf } from "../food/foods.ts";

import type { Attendee } from "./entries.ts";
import type { Person } from "../persons.ts";


/**
 * The parts of a row, see the top of this file.
 *
 * - `number`: Its number, see {@link numberOf}, or of an exam the menu of its kind.
 * - `day`: Its day, like `2026-10-29`.
 * - `open`: Opens its box from its day, of a box without number, like a day of my sleep, so it opens there instead;
 *   `null` for none, its number opening it.
 * - `group`: Its group, the menu of the groups of its week or its name, `null` for none.
 * - `meta`: The parts of its first grey line, each its texts and its link, like its times and its place,
 *   see {@link metaOf}; a part without anything left out.
 * - `people`: Who I am with, each shown as a link to its row in `Persons.md` while it has one.
 * - `persons`: The people of `Persons.md`, which the names are found among.
 * - `mark`: What more there is to say, last on its first line, like `in 77 days` or `new`, empty for nothing.
 * - `end`: Its actions or the icon of its state, at its right edge.
 * - `faded`: Whether it is greyed.
 */
export type RowParts = {
    number: HTMLElement;
    day: string;
    open: (() => void) | null;
    group: HTMLElement | null;
    meta: (string | Node)[][];
    people: Attendee[];
    persons: Person[];
    mark: string;
    end: HTMLElement;
    faded: boolean;
};


/**
 * Writes the times of a box for its row: its start and end, like `10:00 – 12:00`, its start alone without length,
 * or without times only its length, like `08h 00m` of my sleep, see `lengthOf` in `./times.ts`.
 * - `start`: Its start, `null` for none.
 *
 * @param time - Its start as ISO instant, empty for none
 * @param minutes - Its length in minutes, `null` for none
 * @returns The times, empty for neither
 */
export function rowTimesOf(time: string, minutes: number | null): string {
    const start: Date | null = time === "" ? null : new Date(time);
    if (start === null)
        return minutes === null ? "" : lengthOf(minutes);
    return minutes === null ? timeOf(start)
        : `${timeOf(start)} – ${timeOf(new Date(start.getTime() + minutes * 60 * 1000))}`;
}

/**
 * Makes the number of a row in its small grey box, as the type of a block of a section in the tree: a button that opens
 * its box while it has one, its note as tooltip, else plain; empty without number, like a box a change removes.
 * - `number`: The number.
 *
 * @param text - Its number, like `2`, or of an exam its kind, empty for none
 * @param open - Opens its box, `null` for a row without box yet
 * @param title - Its tooltip, like the note of its box
 * @returns The number
 */
export function numberOf(text: string, open: (() => void) | null, title: string): HTMLElement {
    const number: HTMLElement = elementOf(open === null ? "span" : "button",
        open === null ? "block-kind series-number" : "block-kind series-number series-open", text);
    if (number instanceof HTMLButtonElement && open !== null) {
        number.type = "button";
        number.title = title;
        number.addEventListener("click", open);
    }
    return number;
}

/**
 * Makes the grey first line of a row right of its day, its times and place, apart by a middle dot, on one line;
 * a part with no room left, like `in 124 days` of an exam, goes whole onto a next line, never cut, without a dot
 * in front of it there, since every part has its dot before it and the dot of a part that begins a line lies left
 * of the line, hidden, see `.series-parts` in `series.css`; the whole line as its tooltip.
 * - `kept`: Its parts, none left out.
 * - `meta`: The line.
 * - `shown`: Its parts side by side.
 *
 * @param parts - Its parts, each its texts and its link, like `14:00 – 16:00`, none for a part left out
 * @returns The line
 */
export function metaOf(parts: (string | Node)[][]): HTMLElement {
    const kept: (string | Node)[][] = parts.filter((part: (string | Node)[]): boolean =>
        part.length > 0 && part.some((piece: string | Node): boolean => piece !== ""));
    const meta: HTMLElement = elementOf("span", "series-meta", "");
    const shown: HTMLElement = elementOf("span", "series-parts", "");
    kept.forEach((part: (string | Node)[]): void => {
        const span: HTMLElement = elementOf("span", "series-part", "");
        span.append(...part);
        shown.append(span);
    });
    meta.append(shown);
    meta.title = kept.map((part: (string | Node)[]): string => part
        .map((piece: string | Node): string => typeof piece === "string" ? piece : piece.textContent ?? "").join(""))
        .join(" · ");
    return meta;
}

/**
 * Makes the line of the people of a row: each a link to its row in `Persons.md`, see `personLinkOf`
 * in `../persons.ts`, a name of nobody there, like a group, its text, apart by middle dots, see `peopleOf` there,
 * the whole line as its tooltip; `null` for nobody.
 * - `line`: The line.
 * - `shownOf`: Gives a name as it shows.
 *
 * @param people - Who I am with
 * @param persons - The people of `Persons.md`
 * @returns The line, `null` for nobody
 */
function peopleLineOf(people: Attendee[], persons: Person[]): HTMLElement | null {
    if (people.length === 0)
        return null;
    const shownOf: (name: string) => string | Node = (name: string): string | Node => {
        const person: Person | undefined = personOf(persons, name);
        return person === undefined ? name : personLinkOf(person, name);
    };
    const line: HTMLElement = elementOf("div", "series-people", "");
    line.append(...peopleOf(people.map((person: Attendee): string | Node => shownOf(person.name))));
    line.title = people.map((person: Attendee): string => person.name).join(" · ");
    return line;
}

/**
 * Makes the row of a box, see the top of this file.
 * - `row`: The row.
 * - `people`: The line of its people, `null` for nobody.
 * - `day`: Its day, a button that opens its box where it opens from there.
 * - `group`: The column of its group, empty without group.
 *
 * @param parts - Its parts
 * @returns The row
 */
export function listRowOf(parts: RowParts): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row", "");
    const people: HTMLElement | null = peopleLineOf(parts.people, parts.persons);
    const day: HTMLElement = elementOf(parts.open === null ? "span" : "button",
        parts.open === null ? "series-day" : "series-day series-day-open", weekdayDateTextOf(parts.day));
    if (day instanceof HTMLButtonElement && parts.open !== null) {
        day.type = "button";
        day.title = "Open";
        day.addEventListener("click", parts.open);
    }
    const group: HTMLElement = elementOf("span", "series-group", "");
    if (parts.group !== null)
        group.append(parts.group);
    row.classList.toggle("series-grouped", parts.group !== null);
    row.classList.toggle("series-row-faded", parts.faded);
    row.append(parts.number, day, group, metaOf([...parts.meta, [parts.mark]]), parts.end,
        ...(people === null ? [] : [people]));
    return row;
}
