/**
 * ## Calendar files
 *
 * Shows an `.ics` file in the editor easy to read, the file itself staying exactly as it is:
 * every line left-aligned at the depth of its block,
 * each line inside a `BEGIN:` and its `END:` one step further in,
 * like the lines of a `VEVENT` inside `VCALENDAR`,
 * and an empty line's room above each entry of the calendar, a `BEGIN:` right inside `VCALENDAR`,
 * so the entries stand apart.
 * A folded line, starting with a space, stays in the block of the line it continues.
 * Only the look changes: the steps and the room are drawn by the stylesheet,
 * see `.ics-depth-1` and `.ics-entry` in `editor.css`, no character is added.
 * The name of each property with its parameters, up to and with the colon before its value, like
 * `DTSTART;TZID=Europe/Berlin:` of `DTSTART;TZID=Europe/Berlin:20261019T140000`, is grey,
 * so the value stands out white, of a line `BEGIN:` or `END:` too,
 * so `VEVENT` of `BEGIN:VEVENT` is white;
 * its parameters, like `;TZID=Europe/Berlin`, a step fainter, since they say least.
 * After a value with a meaning, its line shows it readable, faint,
 * in a column of its own at its right, as the page writes it:
 * a date, a date with its time or a length, like
 * `20261019T140000  19.10.2026 (Mon), 14:00`, `20261019  19.10.2026 (Mon)` or `PT2H  02h 00m`,
 * a time in UTC, ending in `Z`, in Berlin time;
 * a rule of a series, its `RRULE`,
 * like `FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU  yearly in Mar on last Sun`, see {@link ruleTextOf};
 * an offset of a time zone, like `+0100  UTC+01:00`;
 * the name of a time of a time zone, like `CEST  summer time`, see {@link zoneNames};
 * each short, so its column stays narrow.
 * The stylesheet draws the grey and the readable form too,
 * see `.ics-name` and `[data-readable]` in `editor.css`, the readable form no part of the text,
 * so copying a line copies it as the file has it.
 * The text is as wide as that of a note;
 * the readable forms stand right of it, at the right edge of the save button,
 * see {@link overhangKeep}.
 * Every block folds to its first line, like `BEGIN:VTIMEZONE`, by the arrow after it,
 * as the arrow of a heading of a note does,
 * see `FoldWidget` in `./preview.ts`; each comes unfolded.
 * Left of the text stands its overview, as in ChatGPT's reports, see {@link overviewKeep}:
 * a short dash per entry, white for the entry at the top of the view;
 * resting the mouse on one shows its entry as a box of the plan shows it, only its facts,
 * and a click scrolls to it.
 *
 * - `@codemirror/state`: The text and its lines.
 * - `@codemirror/view`: Decorations of whole lines and of the names, how they reach the editor,
 *   and the measure of the room right of the text.
 * - `@codemirror/language`: Folds a block.
 * - `./preview.ts`: The fold arrow of a heading, for a block.
 * - `./steps.ts`: Tells whether a block is folded.
 * - `../skill/attempts.ts`, `../day/times.ts`:
 *   Write a day, a time and a length as the page shows them.
 * - `../day/boxes.ts`, `../day/series.ts`:
 *   Make the lines of a box of the plan and write a room short,
 *   for the box of an entry of the overview.
 * - `../day/boxes.css`: Look of a box of the plan.
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

/**
 * Most steps a line of a calendar file is drawn further in;
 * a deeper line, rare, like inside a `VALARM` of a `VEVENT` of a series, stays at it.
 */
const deepest: number = 4;

/**
 * Name of a property with its parameters, up to and with the colon before its value,
 * like `DTSTART;TZID=Europe/Berlin:` of `DTSTART;TZID=Europe/Berlin:20261019T140000`;
 * a colon in the quotes of a parameter,
 * like those of `ALTREP="https://nav.tum.de/room/5416.01.003"`, belongs to the parameter.
 */
const nameRule: RegExp = /^[A-Z0-9-]+(?:;(?:[^":]|"[^"]*")*)?:/i;

/**
 * Date of a value: its year, month and day, like `20261019`,
 * and of a date with its time its hours, minutes and seconds, like `T140000`, with `Z` in UTC.
 */
const dateRule: RegExp = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

/**
 * A length, like `PT2H` or `PT1H30M`: its hours and its minutes.
 */
const lengthRule: RegExp = /^PT(?:(\d+)H)?(?:(\d+)M)?$/;

/**
 * An offset of a time zone, like `+0100`: its sign, hours and minutes.
 */
const offsetRule: RegExp = /^([+-])(\d{2})(\d{2})$/;

/**
 * Names of the times of a time zone, its `TZNAME`, said short, those my calendars use,
 * the zone itself standing in its `TZID` above, like `Europe/Berlin`;
 * another, like `GMT+1`, says itself.
 */
const zoneNames: Record<string, string> = { CET: "standard time", CEST: "summer time" };

/**
 * How often a series repeats, its `FREQ`, after every how many of it, its `INTERVAL`,
 * like `weekly` or `every 2 weeks`.
 */
const frequencies: Record<string, [string, string]> = {
    SECONDLY: ["every second", "seconds"],
    MINUTELY: ["every minute", "minutes"],
    HOURLY: ["hourly", "hours"],
    DAILY: ["daily", "days"],
    WEEKLY: ["weekly", "weeks"],
    MONTHLY: ["monthly", "months"],
    YEARLY: ["yearly", "years"],
};

/**
 * Weekdays of a series, its `BYDAY`, short as the page writes a weekday, like `Sun` for `SU`.
 */
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
 * An entry of the calendar, a block right inside `VCALENDAR`, for the overview,
 * see {@link overviewKeep}.
 * - `line`: Number of its first line, its `BEGIN:`, from 1.
 * - `kind`: Its kind, like `VTODO`.
 * - `values`: Its own properties by their names,
 *   like `SUMMARY`, the first of each, its folded lines joined, its escapes, like `\\,`, read.
 */
type Block = { line: number; kind: string; values: Map<string, string> };

/**
 * Grey of the name of a property with its colon, see {@link nameRule}, also of `BEGIN:` or `END:`.
 */
const nameMark: Decoration = Decoration.mark({ class: "ics-name" });

/**
 * Fainter grey of the parameters of a property, like `;TZID=Europe/Berlin`.
 */
const parameterMark: Decoration = Decoration.mark({ class: "ics-parameter" });

/**
 * Writes a date readable, see the top of this file:
 * a date like `19.10.2026 (Mon)`, a date with its time like `19.10.2026 (Mon), 14:00`,
 * as the page writes them, see `dayTextOf` in `../skill/attempts.ts`.
 * - `date`: The parts of the date, see {@link dateRule}, `null` for none.
 * - `moment`: The moment of a date with its time: as written,
 *   or with its `Z` in UTC, written in Berlin time.
 *
 * @param value - A date, like `20261019T140000`
 * @param timed - Whether to write the time of a date with its time, else only its day
 * @returns The date readable, `null` for no date
 */
function dateTextOf(value: string, timed: boolean): string | null {
    const date: RegExpExecArray | null = dateRule.exec(value);
    if (date === null) return null;
    if (date[4] === undefined) return dayTextOf(`${date[1]}-${date[2]}-${date[3]}`, true);
    const moment: Date = new Date(
        `${date[1]}-${date[2]}-${date[3]}T${date[4]}:${date[5]}:${date[6]}${date[7]}`,
    );
    return timed
        ? `${dayTextOf(dayOf(moment), true)}, ${timeOf(moment)}`
        : dayTextOf(dayOf(moment), true);
}

/**
 * Writes a rule of a series readable,
 * see the top of this file, short, its parts in the order they are read,
 * like `yearly in Mar on last Sun` of `FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU`
 * or `weekly until 04.02.2027 (Thu)` of `FREQ=WEEKLY;UNTIL=20270204T090000Z`:
 * how often, its `FREQ` after every how many, its `INTERVAL`;
 * the months, `BYMONTH`, short, like `Mar`; the days of the month, `BYMONTHDAY`;
 * the weekdays, `BYDAY`, short, see {@link weekdays}, each with its place in the month,
 * like `-1` for the last; how many times, `COUNT`, or until when, `UNTIL`, its day alone;
 * any other part as written.
 * - `parts`: The parts of the rule by their names, like `FREQ` to `YEARLY`.
 * - `every`: How many of its frequency lie between two of the series, 1 for each.
 * - `ordinalOf`: Writes a number as a place, like `2nd` for 2.
 * - `placeOf`: Writes the place of a weekday in its month,
 *   like `last` for `-1`, `2nd last` for `-2` or `2nd` for 2.
 *
 * @param value - The rule, like `FREQ=WEEKLY;UNTIL=20270204T090000Z`
 * @returns The rule readable, `null` for one without `FREQ`
 */
function ruleTextOf(value: string): string | null {
    const parts: Map<string, string> = new Map(
        value
            .split(";")
            .map((part: string): [string, string] => [
                part.split("=")[0].toUpperCase(),
                part.slice(part.indexOf("=") + 1),
            ]),
    );
    const frequency: [string, string] | undefined =
        frequencies[parts.get("FREQ")?.toUpperCase() ?? ""];
    if (frequency === undefined) return null;
    const every: number = Number(parts.get("INTERVAL") ?? 1);
    const ordinalOf: (place: number) => string = (place: number): string =>
        `${place}${["th", "st", "nd", "rd"][place % 100 > 10 && place % 100 < 14 ? 0 : place % 10] ?? "th"}`;
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
                        const [, place, weekday]: string[] = /^([+-]?\d*)([A-Z]{2})$/i.exec(
                            day,
                        ) ?? ["", "", day];
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

/**
 * Writes a value readable, see the top of this file: a date or a date with its time,
 * see {@link dateTextOf}, a length like `02h 00m`,
 * see `lengthOf` in `../day/times.ts`, a rule of a series,
 * see {@link ruleTextOf}, an offset of a time zone, like `UTC+01:00`,
 * and the name of a time of a time zone, see {@link zoneNames}.
 * - `length`: Hours and minutes of a length, see {@link lengthRule}, `null` for none.
 * - `offset`: Sign, hours and minutes of an offset, see {@link offsetRule}, `null` for none.
 *
 * @param name - Name of the property with its parameters, like `DTSTART;TZID=Europe/Berlin:`
 * @param value - Its value, like `20261019T140000`
 * @returns The value readable, `null` for a value without a meaning to add
 */
function readableOf(name: string, value: string): string | null {
    if (/^RRULE[;:]/i.test(name)) return ruleTextOf(value);
    if (/^TZNAME[;:]/i.test(name)) return zoneNames[value.toUpperCase()] ?? null;
    const length: RegExpExecArray | null = lengthRule.exec(value);
    if (length !== null) return lengthOf(Number(length[1] ?? 0) * 60 + Number(length[2] ?? 0));
    const offset: RegExpExecArray | null = /^TZOFFSET/i.test(name) ? offsetRule.exec(value) : null;
    if (offset !== null) return `UTC${offset[1]}${offset[2]}:${offset[3]}`;
    return dateTextOf(value, true);
}

/**
 * Tells what the first line of a block folds, see the top of this file:
 * from the end of its `BEGIN:` to the end of its `END:`, blocks inside it skipped,
 * so only its first line shows; nothing for any other line.
 * - `depth`: How many blocks inside it are open at a line below it.
 * - `end`: A line below it, at last its `END:`.
 *
 * @param state - State of the editor, with the text of the file
 * @param from - Start of the line
 * @param to - End of the line
 * @returns What it folds, `null` for nothing
 */
function blockOf(
    state: EditorState,
    from: number,
    to: number,
): { from: number; to: number } | null {
    if (!/^BEGIN:/i.test(state.sliceDoc(from, to))) return null;
    let depth: number = 0;
    for (
        let number: number = state.doc.lineAt(from).number + 1;
        number <= state.doc.lines;
        number++
    ) {
        const end: Line = state.doc.line(number);
        if (/^BEGIN:/i.test(end.text)) depth += 1;
        else if (/^END:/i.test(end.text) && depth-- === 0) return { from: to, to: end.to };
    }
    return null;
}

/**
 * Gives the decorations of the lines of a calendar file, see the top of this file:
 * each line as one, `ics-line`, with its step, as a class like `ics-depth-1`,
 * and for each entry, a `BEGIN:` right inside `VCALENDAR`, the room above it;
 * the grey of the name of each property and the fainter grey of its parameters;
 * its value readable, as the attribute `data-readable` of its line;
 * and the fold arrow of each block.
 * - `decorations`: Decorations found so far, in the order of the lines.
 * - `depth`: Depth of the block the next line lies in, 0 outside every block.
 * - `number`: Number of a line, from 1.
 * - `line`, `text`: A line and its text.
 * - `step`: Step the line is drawn at:
 *   an `END:` at the depth of its `BEGIN:`, a further line one inside.
 * - `entry`: Whether the line begins an entry of the calendar.
 * - `name`: The name of its property, see {@link nameRule}, `null` for a folded line,
 *   which goes on the line above.
 * - `parameters`: Where its parameters start, after the name of its property,
 *   right before its colon for none.
 * - `readable`: Its value readable, see {@link readableOf}, `null` for none.
 *
 * @param state - State of the editor, with the text of the file and what of it is folded
 * @returns Decorations of the lines
 */
function decorationsOf(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    let depth: number = 0;
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const line: Line = state.doc.line(number);
        const text: string = line.text;
        if (/^END:/i.test(text)) depth = Math.max(0, depth - 1);
        const step: number = Math.min(depth, deepest);
        const entry: boolean = depth === 1 && /^BEGIN:/i.test(text);
        const name: RegExpExecArray | null = nameRule.exec(text);
        const readable: string | null =
            name === null ? null : readableOf(name[0], text.slice(name[0].length));
        decorations.push(
            Decoration.line({
                class: `ics-line ics-depth-${step}${entry ? " ics-entry" : ""}`,
                attributes: readable === null ? {} : { "data-readable": readable },
            }).range(line.from),
        );
        const parameters: number = name === null ? 0 : (/^[A-Z0-9-]+/i.exec(text)?.[0].length ?? 0);
        if (name !== null && parameters < name[0].length - 1)
            decorations.push(
                nameMark.range(line.from, line.from + parameters),
                parameterMark.range(line.from + parameters, line.from + name[0].length - 1),
                nameMark.range(line.from + name[0].length - 1, line.from + name[0].length),
            );
        else if (name !== null)
            decorations.push(nameMark.range(line.from, line.from + name[0].length));
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

/**
 * Keeps the room from the right edge of the text to the right edge of the save button,
 * see `./editor.html`, as the variable `--ics-overhang` of the editor,
 * so the readable forms of the values stand at that edge, see `[data-readable]` in `editor.css`:
 * measured as the editor stands and again whenever the window changes its size.
 * - {@link EditorView#requestMeasure}:
 *   Reads the edges and writes the room at the moment the editor measures.
 * - `measure`: Measures it.
 */
const overhangKeep: ViewPlugin<{ destroy: () => void }> = ViewPlugin.define(
    (view: EditorView): { destroy: () => void } => {
        const measure = (): void =>
            view.requestMeasure({
                read: (): number =>
                    Math.max(
                        0,
                        (document.getElementById("editor-save")?.getBoundingClientRect().right ??
                            0) - view.contentDOM.getBoundingClientRect().right,
                    ),
                write: (overhang: number): void =>
                    view.dom.style.setProperty("--ics-overhang", `${overhang}px`),
            });
        measure();
        window.addEventListener("resize", measure);
        return { destroy: (): void => window.removeEventListener("resize", measure) };
    },
);

/**
 * The look of a calendar file for the editor, see the top of this file:
 * its lines decorated once as it opens,
 * and again whenever its text changes or a block folds or unfolds;
 * the readable forms at the right edge of the save button, see {@link overhangKeep};
 * its overview left of it, see {@link overviewKeep}.
 * - {@link codeFolding}: Holds what is folded, without the `…` CodeMirror puts in place of it,
 *   since the arrow turned right tells it, as in a note, see `livePreview` in `./preview.ts`.
 * - {@link foldService}: Tells what the first line of a block folds, see {@link blockOf}.
 *
 * @returns Extension of the editor
 */
export function icsLook(): Extension {
    return [
        codeFolding({ placeholderDOM: (): HTMLElement => document.createElement("span") }),
        foldService.of(blockOf),
        overhangKeep,
        overviewKeep,
        StateField.define<DecorationSet>({
            create: decorationsOf,
            update: (decorations: DecorationSet, transaction: Transaction): DecorationSet =>
                transaction.docChanged ||
                foldedRanges(transaction.state) !== foldedRanges(transaction.startState)
                    ? decorationsOf(transaction.state)
                    : decorations,
            provide: (field: StateField<DecorationSet>): Extension =>
                EditorView.decorations.from(field),
        }),
    ];
}

/**
 * Reads the entries of a calendar file, see {@link Block}.
 * - `blocks`: The entries so far.
 * - `depth`: Depth of the block the next line lies in, 0 outside every block.
 * - `name`: Name of the last own property of the entry read,
 *   for a folded line going on with it, empty for none.
 * - `text`: Text of a line.
 *
 * @param state - State of the editor, with the text of the file
 * @returns The entries, in order
 */
function blocksOf(state: EditorState): Block[] {
    const blocks: Block[] = [];
    let depth: number = 0;
    let name: string = "";
    for (let number: number = 1; number <= state.doc.lines; number++) {
        const text: string = state.doc.line(number).text;
        const block: Block | undefined = blocks.at(-1);
        if (/^END:/i.test(text)) {
            depth -= 1;
            name = "";
        } else if (/^BEGIN:/i.test(text)) {
            depth += 1;
            name = "";
            if (depth === 2)
                blocks.push({
                    line: number,
                    kind: text.slice("BEGIN:".length).toUpperCase(),
                    values: new Map(),
                });
        } else if (depth === 2 && block !== undefined && /^[ \t]/.test(text) && name !== "") {
            block.values.set(name, (block.values.get(name) ?? "") + text.slice(1));
        } else if (depth === 2 && block !== undefined) {
            const found: RegExpExecArray | null = nameRule.exec(text);
            name = found === null ? "" : (/^[A-Z0-9-]+/i.exec(found[0])?.[0] ?? "").toUpperCase();
            if (found !== null && !block.values.has(name))
                block.values.set(name, text.slice(found[0].length));
            else name = "";
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
 * Makes the box of an entry of the overview, see {@link overviewKeep},
 * as a box of the plan shows it,
 * see `boxContentOf` in `../day/boxes.ts`, only its facts, no buttons:
 * what it is in bold, its category and its name,
 * like **`Skill: IN2028 Business Analytics Machine Learning (VO)`**, of a time zone its `TZID`;
 * then in grey its day, its times or, of a to-do without times, its length,
 * of one without a start its deadline, and its place, a room by its code,
 * see `roomOf` in `../day/series.ts`, or what it does online, like
 * `19.10.2026 (Mon) · 14:00 – 16:00 · 5416.01.003`.
 * - `values`: Its properties.
 * - `date`: The parts of its start or deadline, see {@link dateRule}, `null` for none.
 * - `start`: Its start, `null` for none or a whole day.
 * - `length`: Its length in minutes, of its end or of its duration, `null` for none.
 * - `parts`: The parts of its grey line, in order.
 * - `place`: Its place or what it does online, empty for none.
 *
 * @param block - The entry
 * @returns The box
 */
function boxOf(block: Block): HTMLElement {
    const values: Map<string, string> = block.values;
    const date: RegExpExecArray | null = dateRule.exec(
        values.get("DTSTART") ?? values.get("DUE") ?? "",
    );
    const start: Date | null =
        date?.[4] === undefined
            ? null
            : new Date(
                  `${date[1]}-${date[2]}-${date[3]}T${date[4]}:${date[5]}:${date[6]}${date[7]}`,
              );
    const end: RegExpExecArray | null = dateRule.exec(values.get("DTEND") ?? "");
    const duration: RegExpExecArray | null = lengthRule.exec(
        values.get("ESTIMATED-DURATION") ?? values.get("DURATION") ?? "",
    );
    let length: number | null =
        duration === null ? null : Number(duration[1] ?? 0) * 60 + Number(duration[2] ?? 0);
    if (start !== null && end?.[4] !== undefined)
        length =
            (Date.parse(`${end[1]}-${end[2]}-${end[3]}T${end[4]}:${end[5]}:${end[6]}${end[7]}`) -
                start.getTime()) /
            60000;
    const parts: string[] = [];
    if (date !== null)
        parts.push(
            `${values.has("DTSTART") ? "" : "Deadline: "}${
                start === null
                    ? dayTextOf(`${date[1]}-${date[2]}-${date[3]}`, true)
                    : dayTextOf(dayOf(start), true)
            }`,
        );
    if (start !== null)
        parts.push(
            length === null
                ? timeOf(start)
                : `${timeOf(start)}${rangeDash}${timeOf(new Date(start.getTime() + length * 60000))}`,
        );
    else if (length !== null) parts.push(lengthOf(length));
    const place: string = values.get("X-ONLINE") || roomOf(values.get("LOCATION") ?? "");
    if (place !== "") parts.push(place);
    return entryPartOf("div", "box ics-box", [
        entryPartOf(
            "div",
            "box-what",
            whatOf(
                values.get("CATEGORIES") ?? "",
                values.get("SUMMARY") ?? values.get("TZID") ?? block.kind,
            ),
        ),
        ...(parts.length === 0
            ? []
            : [
                  entryPartOf(
                      "div",
                      "box-meta",
                      parts.map((part: string, index: number): HTMLElement =>
                          entryPartOf(
                              "span",
                              index === 0 ? "box-part box-time" : "box-part entry-parted",
                              [part],
                          ),
                      ),
                  ),
              ]),
    ]);
}

/**
 * Keeps the overview of a calendar file left of its text, see the top of this file:
 * in the room left of the page, see `.ics-overview` in `editor.css`, a dash per entry,
 * see {@link blocksOf}, named by its name for screen readers;
 * the dash of the entry at the top of the view, the last that begins above it, white,
 * followed as the file scrolls, and the overview scrolled so that dash stays in its middle,
 * so many entries never crowd it;
 * resting the mouse on a dash shows the box of its entry right of the overview at its height,
 * see {@link boxOf}, a click scrolls the file to the entry's first line. It goes with the editor.
 * - `file`: The part of the page that scrolls the file,
 *   see `.editor-file` in `editor.css`, `null` for none.
 * - `overview`: The overview.
 * - `blocks`, `dashes`: The entries and their dashes.
 * - `shown`: The box shown, `null` while none shows.
 * - `boxHide`: Takes the box away.
 * - `follow`: Marks the dash of the entry at the top of the view.
 * - `top`: Height just below the status line, where the view begins.
 * - `at`: Number of the line at the top of the view.
 * - `current`: Place of its entry, the first while none begins above it.
 */
const overviewKeep: ViewPlugin<{ destroy: () => void }> = ViewPlugin.define(
    (view: EditorView): { destroy: () => void } => {
        const file: HTMLElement | null = view.dom.closest(".editor-file");
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
            dash.setAttribute(
                "aria-label",
                block.values.get("SUMMARY") ?? block.values.get("TZID") ?? block.kind,
            );
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
                shown.style.left = `${overview.getBoundingClientRect().right + 8}px`;
                shown.style.top = `${dash.getBoundingClientRect().top - 8}px`;
                document.body.append(shown);
            });
            dash.addEventListener("mouseleave", boxHide);
            return dash;
        });
        const follow = (): void => {
            const top: number =
                (document.getElementById("editor-status")?.getBoundingClientRect().bottom ?? 0) + 1;
            const at: number = view.state.doc.lineAt(
                view.posAtCoords(
                    { x: view.contentDOM.getBoundingClientRect().left + 1, y: top },
                    false,
                ),
            ).number;
            const current: number = Math.max(
                0,
                blocks.findLastIndex((block: Block): boolean => block.line <= at),
            );
            dashes.forEach((dash: HTMLButtonElement, index: number): void => {
                dash.classList.toggle("ics-dash-current", index === current);
            });
            overview.scrollTop = (dashes[current]?.offsetTop ?? 0) - overview.clientHeight / 2;
        };
        if (file === null || blocks.length === 0) return { destroy: (): void => {} };
        overview.className = "ics-overview";
        overview.setAttribute("aria-label", "Entries");
        overview.append(...dashes);
        file.append(overview);
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
