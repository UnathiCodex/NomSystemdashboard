/**
 * ## Rows
 *
 * One row of a box in a list, built alike wherever boxes stand in a list,
 * so the lists never look or work apart:
 * in the list `Entries` of the dialog of a series, see `./series.ts`,
 * and in a card of the course on the page of a module, see `../editor/course.ts`.
 * A row is the same unit as a box of the plan: its number, its day with its weekday,
 * grey its group, times, place and first person, see {@link metaOf},
 * and at its right edge its actions while open, else the icon of its state.
 * Greyed while not open, as a box of the plan no longer open.
 * Every row has the same columns, see `.series-row` in `./series.css`,
 * so the rows of a list stand alike.
 */

import { personLinkOf, personOf } from "../persons.ts";
import { lengthOf, rangeDash, timeOf, weekdayDateTextOf } from "./times.ts";
import { elementOf } from "../food/foods.ts";
import type { Attendee } from "../../reader/calendar.ts";
import type { Person } from "../../reader/persons.ts";

/**
 * The parts of a row, see the top of this file.
 *
 * - `open`: Opens its box from its day, of a box without number, like a day of my sleep,
 *   so it opens there instead, `null` for none, its number opening it.
 * - `meta`: The parts of its first grey line, see {@link metaOf}.
 * - `mark`: What more there is to say, last on its first line, empty for nothing.
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
 * Writes the times of a box for its row: its start and end,
 * its start alone without length, or without times only its length,
 * see `lengthOf` in `./times.ts`.
 */
export function rowTimesOf(time: string, minutes: number | null): string {
    const start: Date | null = time === "" ? null : new Date(time);
    if (start === null) return minutes === null ? "" : lengthOf(minutes);
    return minutes === null
        ? timeOf(start)
        : `${timeOf(start)}${rangeDash}` +
              timeOf(new Date(start.getTime() + minutes * 60 * 1000));
}

/**
 * Makes the number of a row in its small grey box,
 * a button that opens its box while it has one, else plain, empty without number.
 */
export function numberOf(
    text: string,
    open: (() => void) | null,
    title: string,
): HTMLElement {
    const number: HTMLElement = elementOf(
        open === null ? "span" : "button",
        open === null
            ? "block-kind series-number"
            : "block-kind series-number series-open",
        text,
    );
    if (number instanceof HTMLButtonElement && open !== null) {
        number.type = "button";
        number.title = title;
        number.addEventListener("click", open);
    }
    return number;
}

/**
 * Makes the grey line of a row right of its day, its parts apart by a middle dot,
 * always on one line, its first person cut by `…` where the line has no more room,
 * see `.series-parts` in `series.css`;
 * only then the line as its tooltip, its visible text alone,
 * never what a menu in it holds.
 */
export function metaOf(parts: (string | Node)[][]): HTMLElement {
    const kept: (string | Node)[][] = parts.filter(
        (part: (string | Node)[]): boolean =>
            part.length > 0 && part.some((piece: string | Node): boolean => piece !== ""),
    );
    const meta: HTMLElement = elementOf("span", "series-meta", "");
    const shown: HTMLElement = elementOf("span", "series-parts", "");
    kept.forEach((part: (string | Node)[]): void => {
        const span: HTMLElement = elementOf("span", "series-part", "");
        span.append(...part);
        shown.append(span);
    });
    meta.append(shown);
    meta.addEventListener("pointerenter", (): void => {
        const parts: HTMLElement[] = [...shown.children] as HTMLElement[];
        meta.title =
            meta.scrollWidth > meta.clientWidth ||
            parts.some(
                (part: HTMLElement): boolean => part.scrollWidth > part.clientWidth,
            )
                ? parts.map((part: HTMLElement): string => part.innerText).join(" · ")
                : "";
    });
    return meta;
}

/**
 * Shows the first of the people of a row, a link to its row in `Persons.md`,
 * see `personLinkOf` in `../persons.ts`, a name of nobody there its text;
 * all of them the box shows.
 */
function firstPersonOf(people: Attendee[], persons: Person[]): (string | Node)[] {
    const first: Attendee | undefined = people[0];
    if (first === undefined) return [];
    const person: Person | undefined = personOf(persons, first.name);
    const shown: HTMLElement = elementOf("span", "series-person", "");
    shown.append(person === undefined ? first.name : personLinkOf(person, first.name));
    return [shown];
}

/** Makes the row of a box, see the top of this file. */
export function listRowOf(parts: RowParts): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row", "");
    const day: HTMLElement = elementOf(
        parts.open === null ? "span" : "button",
        parts.open === null ? "series-day" : "series-day series-day-open",
        weekdayDateTextOf(parts.day),
    );
    if (day instanceof HTMLButtonElement && parts.open !== null) {
        day.type = "button";
        day.title = "Open";
        day.addEventListener("click", parts.open);
    }
    row.classList.toggle("series-row-faded", parts.faded);
    row.append(
        parts.number,
        day,
        metaOf([
            parts.group === null ? [] : [parts.group],
            ...parts.meta,
            firstPersonOf(parts.people, parts.persons),
            [parts.mark],
        ]),
        parts.end,
    );
    return row;
}
