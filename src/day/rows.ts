/**
 * ## Rows
 *
 * One row of a box in a list, built alike wherever boxes stand in a list, so the lists never look apart.
 * Its number, its day, grey its group, times, place and first person, at its right its actions or state.
 * Greyed while not open, as a box of the plan no longer open.
 */

import { personLinkOf, personOf } from "../persons.ts";
import { lengthOf, rangeDash, timeOf, weekdayDateTextOf } from "./times.ts";
import { elementOf } from "../food/foods.ts";
import type { Attendee } from "../../reader/calendar.ts";
import type { Person } from "../../reader/persons.ts";

/**
 * The parts of a row.
 *
 * - `open`: Opens a box without number from its day, `null` when its number opens it.
 * - `mark`: What more there is to say, last on its first line.
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

/** The times of a box, its start alone without length, its length alone without times. */
export function rowTimesOf(time: string, minutes: number | null): string {
    const start: Date | null = time === "" ? null : new Date(time);
    if (start === null) return minutes === null ? "" : lengthOf(minutes);
    return minutes === null
        ? timeOf(start)
        : `${timeOf(start)}${rangeDash}` + timeOf(new Date(start.getTime() + minutes * 60 * 1000));
}

/** The number of a row, a button that opens its box while it has one. */
export function numberOf(text: string, open: (() => void) | null, title: string): HTMLElement {
    const number: HTMLElement = elementOf(
        open === null ? "span" : "button",
        open === null ? "block-kind series-number" : "block-kind series-number series-open",
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
 * The grey line of a row, always on one line, its first person cut by `…` without room.
 * Only then the line as its tooltip, its visible text alone, never what a menu in it holds.
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
            parts.some((part: HTMLElement): boolean => part.scrollWidth > part.clientWidth)
                ? parts.map((part: HTMLElement): string => part.innerText).join(" · ")
                : "";
    });
    return meta;
}

/** The first of the people of a row, all of them the box shows. */
function firstPersonOf(people: Attendee[], persons: Person[]): (string | Node)[] {
    const first: Attendee | undefined = people[0];
    if (first === undefined) return [];
    const person: Person | undefined = personOf(persons, first.name);
    const shown: HTMLElement = elementOf("span", "series-person", "");
    shown.append(person === undefined ? first.name : personLinkOf(person, first.name));
    return [shown];
}

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
