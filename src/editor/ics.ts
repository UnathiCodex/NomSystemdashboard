/**
 * ## Calendar files
 *
 * Shows an `.ics` file in the editor easy to read, the file itself exactly as it is.
 * Each block one step further in and room above each entry, drawn by the stylesheet only.
 * Names of properties grey, so the values stand out, their parameters fainter.
 * A value with a meaning shows it readable at its right, no part of the text, so copying stays true.
 * Every block folds by the arrow after its first line.
 * The status line holds an overview of the entries.
 */

import { StateField } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import { codeFolding, foldedRanges, foldService } from "@codemirror/language";
import { FoldWidget } from "./preview.ts";
import { foldedAt } from "./steps.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { lengthOf, rangeDash, timeOf } from "../day/times.ts";
import { entryPartOf, whatOf } from "../day/boxes.ts";
import { roomOf } from "../day/series.ts";
import "../day/boxes.css";

import type { EditorState, Extension, Line, Range, Transaction } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";

/** Most steps a line is drawn in. */
const deepest: number = 4;

/** Name of a property with its parameters and colon, a colon in quotes belongs to a parameter. */
const nameRule: RegExp = /^[A-Z0-9-]+(?:;(?:[^":]|"[^"]*")*)?:/i;

/** A date, maybe with its time, `Z` in UTC. */
const dateRule: RegExp = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

/** A length in hours and minutes. */
const lengthRule: RegExp = /^PT(?:(\d+)H)?(?:(\d+)M)?$/;

/** An offset of a time zone. */
const offsetRule: RegExp = /^([+-])(\d{2})(\d{2})$/;

/** Names of the `TZNAME` my calendars use, another says itself. */
const zoneNames: Record<string, string> = { CET: "standard time", CEST: "summer time" };

/** Each `FREQ` alone and after an `INTERVAL`. */
const frequencies: Record<string, [string, string]> = {
    SECONDLY: ["every second", "seconds"],
    MINUTELY: ["every minute", "minutes"],
    HOURLY: ["hourly", "hours"],
    DAILY: ["daily", "days"],
    WEEKLY: ["weekly", "weeks"],
    MONTHLY: ["monthly", "months"],
    YEARLY: ["yearly", "years"],
};

/** Weekdays of `BYDAY` as the page writes them. */
const weekdays: Record<string, string> = {
    MO: "Mon",
    TU: "Tue",
    WE: "Wed",
    TH: "Thu",
    FR: "Fri",
    SA: "Sat",
    SU: "Sun",
};

/**
 * An entry of the calendar, a block right inside `VCALENDAR`.
 * - `values`: The first of each own property, folded lines joined, escapes read.
 */
type Block = { line: number; kind: string; values: Map<string, string> };

const nameMark: Decoration = Decoration.mark({ class: "ics-name" });

const parameterMark: Decoration = Decoration.mark({ class: "ics-parameter" });

/**
 * A date readable as the page writes it, a time in UTC in Berlin time, `null` for no date.
 * @param timed - Whether to write the time too
 */
function dateTextOf(value: string, timed: boolean): string | null {
    const date: RegExpExecArray | null = dateRule.exec(value);
    if (date === null) return null;
    if (date[4] === undefined) return dayTextOf(`${date[1]}-${date[2]}-${date[3]}`, true);
    const moment: Date = new Date(`${date[1]}-${date[2]}-${date[3]}T${date[4]}:${date[5]}:${date[6]}${date[7]}`);
    return timed ? `${dayTextOf(dayOf(moment), true)}, ${timeOf(moment)}` : dayTextOf(dayOf(moment), true);
}

/** A rule of a series readable and short, `null` without `FREQ`, an unknown part as written. */
function ruleTextOf(value: string): string | null {
    const parts: Map<string, string> = new Map(
        value
            .split(";")
            .map((part: string): [string, string] => [
                part.split("=")[0].toUpperCase(),
                part.slice(part.indexOf("=") + 1),
            ]),
    );
    const frequency: [string, string] | undefined = frequencies[parts.get("FREQ")?.toUpperCase() ?? ""];
    if (frequency === undefined) return null;
    const every: number = Number(parts.get("INTERVAL") ?? 1);
    const ordinalOf: (place: number) => string = (place: number): string => {
        const teen: boolean = place % 100 > 10 && place % 100 < 14;
        return `${place}${["th", "st", "nd", "rd"][teen ? 0 : place % 10] ?? "th"}`;
    };
    const placeOf: (place: number) => string = (place: number): string =>
        place === -1 ? "last" : place < 0 ? `${ordinalOf(-place)} last` : ordinalOf(place);
    const text: string[] = [every === 1 ? frequency[0] : `every ${every} ${frequency[1]}`];
    parts.forEach((part: string, name: string): void => {
        const list: string[] = part.split(",");
        if (name === "BYMONTH")
            text.push(
                `in ${list
                    .map((month: string): string =>
                        new Date(2000, Number(month) - 1).toLocaleDateString("en-GB", {
                            month: "short",
                        }),
                    )
                    .join(", ")}`,
            );
        else if (name === "BYMONTHDAY") text.push(`on day ${list.join(", ")}`);
        else if (name === "BYDAY")
            text.push(
                `on ${list
                    .map((day: string): string => {
                        const [, place, weekday]: string[] = /^([+-]?\d*)([A-Z]{2})$/i.exec(day) ?? ["", "", day];
                        const named: string = weekdays[weekday.toUpperCase()] ?? weekday;
                        return place === "" ? named : `${placeOf(Number(place))} ${named}`;
                    })
                    .join(", ")}`,
            );
        else if (name === "COUNT") text.push(`${part} times`);
        else if (name === "UNTIL") text.push(`until ${dateTextOf(part, false) ?? part}`);
        else if (name !== "FREQ" && name !== "INTERVAL") text.push(`${name}=${part}`);
    });
    return text.join(" ");
}

/** A value readable, `null` for one without a meaning to add. */
function readableOf(name: string, value: string): string | null {
    if (/^RRULE[;:]/i.test(name)) return ruleTextOf(value);
    if (/^TZNAME[;:]/i.test(name)) return zoneNames[value.toUpperCase()] ?? null;
    const length: RegExpExecArray | null = lengthRule.exec(value);
    if (length !== null) return lengthOf(Number(length[1] ?? 0) * 60 + Number(length[2] ?? 0));
    const offset: RegExpExecArray | null = /^TZOFFSET/i.test(name) ? offsetRule.exec(value) : null;
    if (offset !== null) return `UTC${offset[1]}${offset[2]}:${offset[3]}`;
    return dateTextOf(value, true);
}

/** What the `BEGIN:` line of a block folds, up to its own `END:`, `null` for nothing. */
function blockOf(state: EditorState, from: number, to: number): { from: number; to: number } | null {
    if (!/^BEGIN:/i.test(state.sliceDoc(from, to))) return null;
    let depth: number = 0;
    for (let number: number = state.doc.lineAt(from).number + 1; number <= state.doc.lines; number++) {
        const end: Line = state.doc.line(number);
        if (/^BEGIN:/i.test(end.text)) depth += 1;
        else if (/^END:/i.test(end.text) && depth-- === 0) return { from: to, to: end.to };
    }
    return null;
}

/** A property as one line, its folded lines joined, so a name cut by a fold reads whole. */
function propertyOf(state: EditorState, number: number): string {
    let property: string = state.doc.line(number).text;
    for (let next: number = number + 1; next <= state.doc.lines; next++) {
        const text: string = state.doc.line(next).text;
        if (!/^[ \t]/.test(text)) break;
        property += text.slice(1);
    }
    return property;
}

/**
 * The decorations of the lines, their steps, greys, readable values and fold arrows.
 * - `step`: An `END:` at the depth of its `BEGIN:`.
 */
function decorationsOf(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    let depth: number = 0;
    let property: string = "";
    let above: number = 0;
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const line: Line = state.doc.line(number);
        const text: string = line.text;
        if (/^END:/i.test(text)) depth = Math.max(0, depth - 1);
        const step: number = Math.min(depth, deepest);
        const entry: boolean = depth === 1 && /^BEGIN:/i.test(text);
        const lead: number = /^[ \t]/.test(text) ? 1 : 0;
        const first: number = line.from + lead;
        if (lead === 0) [property, above] = [propertyOf(state, number), 0];
        const name: RegExpExecArray | null = nameRule.exec(property);
        const readable: string | null =
            name === null || lead === 1 ? null : readableOf(name[0], property.slice(name[0].length));
        decorations.push(
            Decoration.line({
                class: `ics-line ics-depth-${step}${entry ? " ics-entry" : ""}`,
                attributes: readable === null ? {} : { "data-readable": readable },
            }).range(line.from),
        );
        const parameters: number = name === null ? 0 : (/^[A-Z0-9-]+/i.exec(property)?.[0].length ?? 0);
        const markPut: (mark: Decoration, from: number, to: number) => void = (
            mark: Decoration,
            from: number,
            to: number,
        ): void => {
            const start: number = first + Math.max(0, from - above);
            const end: number = first + Math.min(line.to - first, to - above);
            if (start < end) decorations.push(mark.range(start, end));
        };
        if (name !== null && parameters < name[0].length - 1) {
            markPut(nameMark, 0, parameters);
            markPut(parameterMark, parameters, name[0].length - 1);
            markPut(nameMark, name[0].length - 1, name[0].length);
        } else if (name !== null) markPut(nameMark, 0, name[0].length);
        above += line.to - first;
        if (blockOf(state, line.from, line.to) !== null)
            decorations.push(
                Decoration.widget({
                    widget: new FoldWidget(false, foldedAt(state, line.to)),
                    side: 1,
                }).range(line.to),
            );
        if (/^BEGIN:/i.test(text)) depth += 1;
    }
    return Decoration.set(decorations);
}

/** Keeps the room from the text to the right edge of the save button, where the readable forms stand. */
const overhangKeep: ViewPlugin<{ destroy: () => void }> = ViewPlugin.define(
    (view: EditorView): { destroy: () => void } => {
        const measure = (): void =>
            view.requestMeasure({
                read: (): number =>
                    Math.max(
                        0,
                        (document.getElementById("editor-save")?.getBoundingClientRect().right ?? 0) -
                            view.contentDOM.getBoundingClientRect().right,
                    ),
                write: (overhang: number): void => view.dom.style.setProperty("--ics-overhang", `${overhang}px`),
            });
        measure();
        window.addEventListener("resize", measure);
        return { destroy: (): void => window.removeEventListener("resize", measure) };
    },
);

/**
 * The look of a calendar file for the editor.
 * - {@link codeFolding}: Without the `…` of CodeMirror, since the arrow tells it.
 */
export function icsLook(): Extension {
    return [
        codeFolding({
            placeholderDOM: (): HTMLElement => document.createElement("span"),
        }),
        foldService.of(blockOf),
        overhangKeep,
        overviewKeep,
        StateField.define<DecorationSet>({
            create: decorationsOf,
            update: (decorations: DecorationSet, transaction: Transaction): DecorationSet =>
                transaction.docChanged || foldedRanges(transaction.state) !== foldedRanges(transaction.startState)
                    ? decorationsOf(transaction.state)
                    : decorations,
            provide: (field: StateField<DecorationSet>): Extension => EditorView.decorations.from(field),
        }),
    ];
}

function blocksOf(state: EditorState): Block[] {
    const blocks: Block[] = [];
    let depth: number = 0;
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const text: string = propertyOf(state, number);
        const block: Block | undefined = blocks.at(-1);
        if (/^END:/i.test(text)) depth -= 1;
        else if (/^BEGIN:/i.test(text)) {
            depth += 1;
            if (depth === 2)
                blocks.push({
                    line: number,
                    kind: text.slice("BEGIN:".length).toUpperCase(),
                    values: new Map(),
                });
        } else if (depth === 2 && block !== undefined) {
            const found: RegExpExecArray | null = nameRule.exec(text);
            const name: string = /^[A-Z0-9-]+/i.exec(text)?.[0].toUpperCase() ?? "";
            if (found !== null && !block.values.has(name)) block.values.set(name, text.slice(found[0].length));
        }
    }
    blocks.forEach((block: Block): void =>
        block.values.forEach((value: string, key: string): void => {
            block.values.set(key, value.replace(/\\([,;\\])/g, "$1").replace(/\\n/gi, " "));
        }),
    );
    return blocks;
}

/**
 * The box of an entry as the plan shows it, only its facts.
 * A time zone shows its `TZID`, a to-do without times its length, without a start its deadline.
 */
function boxOf(block: Block): HTMLElement {
    const values: Map<string, string> = block.values;
    const date: RegExpExecArray | null = dateRule.exec(values.get("DTSTART") ?? values.get("DUE") ?? "");
    const start: Date | null =
        date?.[4] === undefined
            ? null
            : new Date(`${date[1]}-${date[2]}-${date[3]}` + `T${date[4]}:${date[5]}:${date[6]}${date[7]}`);
    const end: RegExpExecArray | null = dateRule.exec(values.get("DTEND") ?? "");
    const duration: RegExpExecArray | null = lengthRule.exec(
        values.get("ESTIMATED-DURATION") ?? values.get("DURATION") ?? "",
    );
    let length: number | null = duration === null ? null : Number(duration[1] ?? 0) * 60 + Number(duration[2] ?? 0);
    if (start !== null && end?.[4] !== undefined)
        length =
            (Date.parse(`${end[1]}-${end[2]}-${end[3]}T${end[4]}:${end[5]}:${end[6]}${end[7]}`) - start.getTime()) /
            60000;
    const parts: string[] = [];
    if (date !== null)
        parts.push(
            `${values.has("DTSTART") ? "" : "Deadline: "}${
                start === null ? dayTextOf(`${date[1]}-${date[2]}-${date[3]}`, true) : dayTextOf(dayOf(start), true)
            }`,
        );
    if (start !== null)
        parts.push(
            length === null
                ? timeOf(start)
                : `${timeOf(start)}${rangeDash}` + timeOf(new Date(start.getTime() + length * 60000)),
        );
    else if (length !== null) parts.push(lengthOf(length));
    const place: string = values.get("X-ONLINE") || roomOf(values.get("LOCATION") ?? "");
    if (place !== "") parts.push(place);
    return entryPartOf("div", "box ics-box", [
        entryPartOf(
            "div",
            "box-what",
            whatOf(values.get("CATEGORIES") ?? "", values.get("SUMMARY") ?? values.get("TZID") ?? block.kind),
        ),
        ...(parts.length === 0
            ? []
            : [
                  entryPartOf(
                      "div",
                      "box-meta",
                      parts.map((part: string, index: number): HTMLElement =>
                          entryPartOf("span", index === 0 ? "box-part box-time" : "box-part entry-parted", [part]),
                      ),
                  ),
              ]),
    ]);
}

/**
 * Keeps the overview in the status line, a dash per entry.
 * The dash of the entry at the top is white and stays in the middle, so many entries never crowd it.
 * The mouse on a dash shows its box, a click scrolls to its entry.
 */
const overviewKeep: ViewPlugin<{ destroy: () => void }> = ViewPlugin.define(
    (view: EditorView): { destroy: () => void } => {
        const file: HTMLElement | null = view.dom.closest(".editor-file");
        const state: HTMLElement | null = document.getElementById("editor-state");
        const overview: HTMLElement = document.createElement("nav");
        const blocks: Block[] = blocksOf(view.state);
        let shown: HTMLElement | null = null;
        const boxHide = (): void => {
            shown?.remove();
            shown = null;
        };
        const dashes: HTMLButtonElement[] = blocks.map((block: Block): HTMLButtonElement => {
            const dash: HTMLButtonElement = document.createElement("button");
            dash.type = "button";
            dash.className = "ics-dash";
            dash.setAttribute("aria-label", block.values.get("SUMMARY") ?? block.values.get("TZID") ?? block.kind);
            dash.addEventListener("click", (): void =>
                view.dispatch({
                    effects: EditorView.scrollIntoView(view.state.doc.line(block.line).from, {
                        y: "start",
                    }),
                }),
            );
            dash.addEventListener("mouseenter", (): void => {
                boxHide();
                shown = boxOf(block);
                document.body.append(shown);
                const room: number = innerWidth - shown.offsetWidth - 8;
                const left: number = dash.getBoundingClientRect().left;
                shown.style.left = `${Math.min(left, room)}px`;
                shown.style.top = `${overview.getBoundingClientRect().bottom + 8}px`;
            });
            dash.addEventListener("mouseleave", boxHide);
            return dash;
        });
        const follow = (): void => {
            const top: number = (document.getElementById("editor-status")?.getBoundingClientRect().bottom ?? 0) + 1;
            const at: number = view.state.doc.lineAt(
                view.posAtCoords({ x: view.contentDOM.getBoundingClientRect().left + 1, y: top }, false),
            ).number;
            const current: number = Math.max(
                0,
                blocks.findLastIndex((block: Block): boolean => block.line <= at),
            );
            dashes.forEach((dash: HTMLButtonElement, index: number): void => {
                dash.classList.toggle("ics-dash-current", index === current);
            });
            overview.scrollLeft = (dashes[current]?.offsetLeft ?? 0) - overview.clientWidth / 2;
        };
        if (file === null || state === null || blocks.length === 0) return { destroy: (): void => {} };
        overview.className = "ics-overview";
        overview.setAttribute("aria-label", "Entries");
        overview.append(...dashes);
        state.before(overview);
        requestAnimationFrame(follow);
        file.addEventListener("scroll", follow);
        return {
            destroy: (): void => {
                file.removeEventListener("scroll", follow);
                overview.remove();
                boxHide();
            },
        };
    },
);
