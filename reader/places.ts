/**
 * ## Places
 *
 * Reads and writes my places in `Places.md`, as `food.ts` does my foods in `Foods.md`:
 * one Markdown table with one row per place,
 * `| Place | Street | Code | City | Country | Link | Default |`, the fields of the dialog,
 * like `TUM Innenstadt` with `Arcisstraße 21`, `80333`, `München` and `Deutschland`,
 * each part empty for none.
 * The column `Default` marks my default place by `★`, at most one row, like `Home Munich`,
 * which a new entry starts with, see `lastPlaceFill` in `src/day/categories.ts`;
 * only its star in the dialog sets it, see {@link placeStandardSet},
 * and every other change of a row keeps it.
 * Every field of a place, the place of an entry and where a way starts, offers only these,
 * see `categories.ts`, and an entry writes its place as Google Calendar does,
 * its name and its address in one line, see {@link lineOf},
 * like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`, as its `LOCATION`,
 * and where its way starts as its `X-FROM`,
 * so it keeps the address it had then, also once the address in `Places.md` changes;
 * its name is the part before the first comma, see {@link labelOf}, so a name never holds a comma:
 * one typed or read with a comma loses it, see {@link nameOf}.
 * An older entry keeps the name alone, like `Home Munich`, or its code and town in one part,
 * like `TUM Innenstadt, Arcisstraße 21, 80333 München, Deutschland`, see {@link lineIs}.
 * The last column, `Link`, may hold a link of a place, like `https://nav.tum.de/room/0509.EG.980`,
 * which an entry writes with it
 * as the standard parameter `ALTREP` of its `LOCATION`, see {@link placeLinkOf}.
 * The file starts without places:
 * I add each place with its address from the dialog of the day the first time I need it,
 * and the reader creates the file with that first place;
 * the pencil beside a place picked in a dialog shows its parts below it, the columns of its row,
 * which change it everywhere once the dialog saves, its row and every entry that names it,
 * see {@link placeRename}; a change of its row alone, as Vu shares one,
 * see `shared.ts`, leaves every entry written before with the line
 * and the link it had, see {@link placeChange}.
 * Beside it `Rooms.md` holds the rooms of the university in one table of the same form,
 * its first column `Room`, like `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)` with its address
 * in its four parts and `https://nav.tum.de/room/0509.EG.980`, read the same way,
 * see {@link roomsRead}; an entry writes a room as a place.
 * A new place goes into `Rooms.md` when its name starts like the code of a room, digits and a dot,
 * see {@link roomForm}, otherwise into `Places.md`; a name is unique over both files.
 * Both tables stay sorted by name, see {@link rowsSort}.
 * A place is only where I physically am: what I do online,
 * like a meeting on Zoom or a video on YouTube, an entry writes apart from its place,
 * see `Online` in `calendar.ts`, its platform one row of `Online.md`, see {@link Platform}.
 *
 * - `node:fs`: Reads and writes `Places.md` and `Rooms.md`.
 * - `node:path`: Gives the folder of a file.
 * - `./calendar.ts`: Writes a place anew in every entry of my calendars that names it.
 * - `./sources.ts`: Names `Places.md`, `Rooms.md`, `Online.md`, the plan,
 *   the log and the folder of my calendars, and tells which files the reader may write.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { placeLinesRename } from "./calendar.ts";
import { calendarRoot, day, writeAllowed } from "./sources.ts";

import type { Online } from "./calendar.ts";

/**
 * A place, one row of `Places.md`, or a room, one row of `Rooms.md`.
 *
 * - `name`: Name, like `TUM Innenstadt`;
 *   unique, ignoring case, without `|` and without a comma,
 *   which ends it in a line, see {@link nameOf}.
 * - `street`: Its street with the number of the house, which may stay out, like `Arcisstraße 21`.
 * - `code`: Its code, the postcode, like `80333`.
 * - `city`: Its town, like `München`.
 * - `country`: Its country, like `Deutschland`.
 * - `link`: Its link, like `https://nav.tum.de/room/0509.EG.980`,
 *   a web address without spaces; empty for none.
 * - `standard`: Whether it is my default place, `★` in its column `Default`.
 *
 * The four parts of the address are each empty for none, without `|` and without a comma,
 * which parts them in a line, see {@link lineOf}.
 */
export type Place = {
    name: string;
    street: string;
    code: string;
    city: string;
    country: string;
    link: string;
    standard: boolean;
};

/**
 * A platform of what I do online, one row of `Online.md`,
 * like `Zoom` by `Zoom Video Communications` with `https://zoom.us`.
 *
 * - `name`: Name, like `Zoom`; unique, ignoring case, without `|`.
 * - `provider`: Who offers it, like `Zoom Video Communications`, empty for none.
 * - `link`: The link of its web app, like `https://zoom.us`, empty for none;
 *   an entry links its own meeting or video, see `Online` in `calendar.ts`.
 */
export type Platform = {
    name: string;
    provider: string;
    link: string;
};

/**
 * A changed place, as the page sends it: its name, maybe new,
 * like `TUM Stammgelände`, and its parts as typed.
 *
 * - `old`: Name of the place as it was, like `TUM Innenstadt`.
 */
export type PlaceChanged = Place & {
    old: string;
};

/**
 * A place changed everywhere,
 * as the page sends it from the pencil beside a place in a dialog, see {@link placeRename}:
 * its old name, the name of the place as the entry or the box names it,
 * the part of its line before the first comma, like `5610.01.011 (Seminarraum (Inf. 18/19)`,
 * and its name, address and link as typed,
 * like `5610.01.011 (Seminarraum (Inf. 18/19))`.
 *
 * - `dry`: Whether only to check the change, writing nothing; false when left out.
 */
export type PlaceRenamed = PlaceChanged & {
    dry?: boolean;
};

/**
 * Lines a new `Places.md` starts with: the head of its table, the header and the line below it.
 */
const fileHead: string[] = [
    "| Place | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/**
 * Head of the table of a new `Rooms.md`, its header and the line below it.
 */
const roomHead: string[] = [
    "| Room | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/**
 * Beginning of the name of a room, the code of a room of the TUM: digits and a dot,
 * like `0509.EG.980` of `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)`
 * or `8120.01.101` of `8120.01.101 (Audimax im Galileo)`.
 */
const roomForm: RegExp = /^\d+\./;

/**
 * A link typed, of a place or of what an entry was, see `titleOf` in `documents.ts`:
 * a web address without spaces, like `https://nav.tum.de/room/0509.EG.980`.
 */
export const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Lines of the table of `Places.md` before its rows: the header and the line below it.
 */
const tableHead: number = 2;

/**
 * Compares names as a German dictionary orders them, ignoring case,
 * like `itestra GmbH` between `Home Munich` and `McDonald's Hohenzollernstraße`.
 */
const nameOrder: Intl.Collator = new Intl.Collator("de");

/**
 * Lines a new `Online.md` starts with, as `Foods.md` starts:
 * its title, one line on what a reader cannot guess, and the head of its table.
 */
const platformHead: string[] = [
    "# Online",
    "",
    "Link is the platform's web app; an entry carries its own channel, title and link.",
    "",
    "| Label | Provider | Link |",
    "|---|---|---|",
];

/**
 * Cleans a text for a cell of `Places.md`:
 * `|` and line breaks become spaces, spaces in a row one, none at the ends.
 *
 * @param text - Text as typed, like `Arcisstraße 21,  80333 München`
 * @returns Clean text, like `Arcisstraße 21, 80333 München`
 */
function cellOf(text: string): string {
    return text.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cuts a row of the table of `Places.md`, `Rooms.md` or `Online.md` into its cells,
 * without the empty texts before its first `|` and after its last, each without spaces at its ends:
 * parted only by a `|` that is no `\|`, as the editor writes a `|` typed into a cell,
 * see `cellWritten` in `src/editor/table.ts`,
 * so such a cell never moves the cells after it one column on,
 * like a link into the column of the country.
 *
 * @param line - Row like `| TUM Innenstadt | Arcisstraße 21 | 80333 | München | Deutschland | https://nav.tum.de |`
 * @returns Its cells
 */
function cellsOf(line: string): string[] {
    return line
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Cleans the name or a part of the address of a place, which never holds a comma,
 * since an entry writes its place as one line whose commas part it: as a cell,
 * see {@link cellOf}, each comma dropped, leaving a space,
 * as for a name of a room from NavigaTUM,
 * `0509.EG.980 (Audimax, Werner-von-Siemens-Hörsaal)` becoming
 * `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)`, and for a name typed with a comma.
 *
 * @param text - Name or part as typed or read,
 *   like `0509.EG.980 (Audimax, Werner-von-Siemens-Hörsaal)`
 * @returns It without comma, like `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)`
 */
function nameOf(text: string): string {
    return cellOf(text.replace(/,/g, " "));
}

/**
 * Writes a place as an entry writes it,
 * its name and its address in one line, as Google Calendar does:
 * its name, its street, its code, its town and its country, parted by commas,
 * a part left out while empty.
 *
 * @param place - A place of `Places.md`
 * @returns Line like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   the name alone without address
 */
export function lineOf(place: Place): string {
    return [place.name, place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/**
 * Tells whether a line is the one of a place,
 * as {@link lineOf} writes it or as an older entry wrote it, its code and town in one part,
 * like `TUM Innenstadt, Arcisstraße 21, 80333 München, Deutschland`.
 *
 * @param place - A place of `Places.md` or a room of `Rooms.md`
 * @param line - Place as an entry writes it
 * @returns Whether it is the line of the place
 */
function lineIs(place: Place, line: string): boolean {
    return (
        line === lineOf(place) ||
        line ===
            [
                place.name,
                place.street,
                `${place.code} ${place.city}`.trim(),
                place.country,
            ]
                .filter((part: string): boolean => part !== "")
                .join(", ")
    );
}

/**
 * Gives the name of the place of a line, the part before its first comma.
 *
 * @param line - Place as an entry writes it,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   or only its name, like `Home Munich`
 * @returns Name like `TUM Innenstadt`
 */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/**
 * Gives the link to write with a place as the `ALTREP` of `LOCATION`:
 * the link it had in the entry or box it comes from,
 * like the box a log entry is logged from or the entry being changed,
 * while it is that same place, else the link of my place or the room of that line,
 * see {@link lineIs}, in `Places.md` or `Rooms.md`, else none;
 * never one typed for the entry, since a place is only where I am, see `Online` in `calendar.ts`.
 *
 * @param line - Place as an entry writes it,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`
 * @param from - The entry or box it comes from, `null` for none
 * @returns Link like `https://nav.tum.de/room/0509.EG.980`, empty for none
 */
export function placeLinkOf(
    line: string,
    from: { location: string; locationLink: string } | null,
): string {
    if (from !== null && from.location === line) return from.locationLink;
    return (
        [...placesRead(), ...roomsRead()].find((place: Place): boolean =>
            lineIs(place, line),
        )?.link ?? ""
    );
}

/**
 * Reads a row of the table of `Places.md` or `Rooms.md`; a row without link has none.
 * - `cells`: Its cells, see {@link cellsOf}.
 *
 * @param line - Row, like `| Home Munich | Burg-Eltz-Weg | 81375 | München | Deutschland | https://… | ★ |`
 * @returns The place, its name empty for a row without one
 */
function rowPlaceOf(line: string): Place {
    const cells: string[] = cellsOf(line);
    return {
        name: nameOf(cells[0] ?? ""),
        street: cells[1] ?? "",
        code: cells[2] ?? "",
        city: cells[3] ?? "",
        country: cells[4] ?? "",
        link: cells[5] ?? "",
        standard: cells[6] === "★",
    };
}

/**
 * Reads the rows of the table of `Places.md` or `Rooms.md`:
 * its lines starting with `|`, after the head of the table, see {@link rowPlaceOf}.
 * A row without a name stays out.
 *
 * @param file - Path of the file, like that of `Rooms.md`
 * @returns Places in the order of the table, none while the file does not exist
 */
function tableRead(file: string): Place[] {
    if (!existsSync(file)) return [];

    return readFileSync(file, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map(rowPlaceOf)
        .filter((place: Place): boolean => place.name !== "");
}

/**
 * Reads my places, the rows of `Places.md`, see {@link tableRead}.
 *
 * @returns Places in the order of the table, none while `Places.md` does not exist
 */
export function placesRead(): Place[] {
    return tableRead(day.places);
}

/**
 * Reads the rooms of the university, the rows of `Rooms.md`, see {@link tableRead}, like
 * `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)` with its address and its link to NavigaTUM.
 *
 * @returns Rooms in the order of the table, none while `Rooms.md` does not exist
 */
export function roomsRead(): Place[] {
    return tableRead(day.rooms);
}

/**
 * Cleans a place as the page sends it,
 * see {@link cellOf}, a comma in its name or a part of its address dropped, see {@link nameOf},
 * and checks it against my other places and the rooms:
 * its name is needed, its address and its link may stay empty,
 * and an address needs no number of a house, like `Burg-Eltz-Weg`;
 * never my default place, which only {@link placeStandardSet} sets.
 * - `clean`: The place cleaned.
 *
 * @param sent - Place as the page sends it, its name,
 *   the parts of its address and its link as typed
 * @param others - My other places and the rooms, whose names it may not have
 * @returns The place cleaned
 * @throws {Error} - When the name is empty, another place has the name, ignoring case,
 *   or the link is no web address
 */
function placeCleanOf(sent: Place, others: Place[]): Place {
    const clean: Place = {
        name: nameOf(String(sent.name ?? "")),
        street: nameOf(String(sent.street ?? "")),
        code: nameOf(String(sent.code ?? "")),
        city: nameOf(String(sent.city ?? "")),
        country: nameOf(String(sent.country ?? "")),
        link: cellOf(String(sent.link ?? "")),
        standard: false,
    };
    if (
        clean.name === "" ||
        others.some(
            (mine: Place): boolean =>
                mine.name.toLowerCase() === clean.name.toLowerCase(),
        )
    )
        throw new Error(`No new name of a place: ${clean.name}`);
    if (clean.link !== "" && !linkForm.test(clean.link))
        throw new Error(`No link of ${clean.name}: ${clean.link}`);
    return clean;
}

/**
 * Reads the lines of `Places.md` or `Rooms.md` to write a place into;
 * those of a new file, the head of its table, see {@link fileHead} and {@link roomHead},
 * when it does not exist yet.
 * - `lines`: Lines of the file.
 * - `first`, `last`: Index of the first line of its table, its header, and of its last.
 *
 * @param file - Path of the file, like that of `Places.md`
 * @returns Lines of the file
 * @throws {Error} - When the file lies outside the new system or holds no table
 */
function placeLinesRead(file: string): string[] {
    if (!writeAllowed(file))
        throw new Error(`No writing outside the new system: ${file}`);
    const lines: string[] = existsSync(file)
        ? readFileSync(file, "utf8").split("\n")
        : [...(file === day.rooms ? roomHead : fileHead), ""];
    const first: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    const last: number = lines.findLastIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    if (first === -1 || last === first) throw new Error(`No table in ${file}`);
    return lines;
}

/**
 * Writes a place as a row of the table of `Places.md` or `Rooms.md`.
 *
 * @param place - Place cleaned
 * @returns Row like `| Home Munich | Burg-Eltz-Weg | 81375 | München | Deutschland | https://www.google.com/… | ★ |`
 */
function rowOf(place: Place): string {
    return (
        `| ${place.name} | ${place.street} | ${place.code} | ${place.city} | ${place.country} | ${place.link} ` +
        `| ${place.standard ? "★" : ""} |`
    );
}

/**
 * Sorts the rows of the table of `Places.md` or `Rooms.md` by name,
 * see {@link nameOrder}, every other line staying where it is.
 * - `first`: Index of the first row, after the head of the table.
 * - `last`: Index of the last line of the table.
 *
 * @param lines - Lines of the file, sorted in place
 */
function rowsSort(lines: string[]): void {
    const first: number =
        lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
    const last: number = lines.findLastIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    lines.splice(
        first,
        last + 1 - first,
        ...lines
            .slice(first, last + 1)
            .sort((one: string, other: string): number =>
                nameOrder.compare(
                    nameOf(cellsOf(one)[0] ?? ""),
                    nameOf(cellsOf(other)[0] ?? ""),
                ),
            ),
    );
}

/**
 * Adds a place as the last row of the table of `Rooms.md` when its name starts
 * like the code of a room, see {@link roomForm},
 * like `5602.EG.001 (Hörsaal 1)`, else of `Places.md`, with its link or an empty cell,
 * then sorts the rows, see {@link rowsSort}, every other line staying as it is,
 * see {@link placeLinesRead};
 * creates the file when it does not exist yet.
 * - `added`: The place as written, cleaned, see {@link placeCleanOf}.
 * - `file`: `Rooms.md` or `Places.md`.
 * - `lines`: Lines of the file.
 * - `last`: Index of the last line of its table.
 *
 * @param sent - Place as the page sends it, its name,
 *   the parts of its address and its link as typed
 * @returns The place as written
 * @throws {Error} - When the name is empty, another place or a room has the name, ignoring case,
 *   the link is no web address, or the file lies outside the new system or holds no table
 */
export function placeAdd(sent: Place): Place {
    const added: Place = placeCleanOf(sent, [...placesRead(), ...roomsRead()]);
    const file: string = roomForm.test(added.name) ? day.rooms : day.places;
    const lines: string[] = placeLinesRead(file);
    const last: number = lines.findLastIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    lines.splice(last + 1, 0, rowOf(added));
    rowsSort(lines);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, lines.join("\n"));
    return added;
}

/**
 * Changes my place of a name in `Places.md`,
 * or a room in `Rooms.md`, its name, its address and its link, in its own row, its star kept,
 * the rows sorted anew, see {@link rowsSort}, every other line staying as it is,
 * see {@link placeLinesRead}, and nothing else:
 * every entry written before keeps the line and the link it had,
 * since each writes its place itself.
 * - `old`: The old name in small letters, as names compare, ignoring case.
 * - `file`: `Places.md`, or `Rooms.md` for a room.
 * - `changed`: The place as written, cleaned, see {@link placeCleanOf}.
 * - `lines`: Lines of the file.
 * - `first`: Index of the first line of its table, its header.
 * - `row`: Index of the row of the place, -1 for none.
 *
 * @param sent - The place as the page sends it, its old name and its name,
 *   address and link as typed
 * @returns The place as written
 * @throws {Error} - When no place has the old name, the name is empty, another place or a room has
 *   the name, ignoring case, the link is no web address, or the file lies outside the new system
 */
export function placeChange(sent: PlaceChanged): Place {
    const old: string = nameOf(String(sent.old ?? "")).toLowerCase();
    const file: string = roomsRead().some(
        (room: Place): boolean => room.name.toLowerCase() === old,
    )
        ? day.rooms
        : day.places;
    const changed: Place = placeCleanOf(
        sent,
        [...placesRead(), ...roomsRead()].filter(
            (mine: Place): boolean => mine.name.toLowerCase() !== old,
        ),
    );
    const lines: string[] = placeLinesRead(file);
    const first: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    const row: number = lines.findIndex(
        (line: string, index: number): boolean =>
            index >= first + tableHead &&
            line.startsWith("|") &&
            nameOf(cellsOf(line)[0] ?? "").toLowerCase() === old,
    );
    if (old === "" || row === -1) throw new Error(`No place of the name: ${sent.old}`);
    lines[row] = rowOf({ ...changed, standard: rowPlaceOf(lines[row]).standard });
    rowsSort(lines);
    writeFileSync(file, lines.join("\n"));
    return changed;
}

/**
 * Changes a place everywhere, as its pencil in a dialog asks once the dialog saves,
 * see `src/day/categories.ts`:
 * every row of its old name in `Places.md` and `Rooms.md`,
 * and every line of my calendars that names it,
 * each `LOCATION` and `X-FROM` in every `.ics` file of `NomManagecalendar`,
 * see `placeLinesRename` in `calendar.ts`.
 * While no other row has its new name, the place takes its name, address and link as sent,
 * cleaned as those of a place added, see {@link placeCleanOf}:
 * each row of the old name becomes its row, its star kept, the rows sorted anew,
 * see {@link rowsSort}, and each line its line with its link, see {@link lineOf}, like
 * `TUM Stammgelände, Arcisstraße 21, 80333, München, Deutschland`; a place without row gets none.
 * While another row has the new name, ignoring case, the place moves to that row:
 * each line takes the line and the link of that row, the address and the link sent counting not,
 * and each row of the old name goes, so no second row of the name is made;
 * my default place moved so makes that row my default place, see {@link placeStandardSet}.
 * Works out every file first and writes only then, so nothing is written while one file cannot be;
 * a row or a line written so already, and every other line of every file, stays as it is.
 * - `old`: The old name, as the entries write it.
 * - `name`: The new name, cleaned, see {@link nameOf}.
 * - `rows`: My places and the rooms.
 * - `target`: The row of another place with the new name, ignoring case, `undefined` for none.
 * - `changed`: The place as its rows and lines take it, that row or the place as sent, cleaned.
 * - `tables`: `Places.md` and `Rooms.md` while a row of the old name changes,
 *   each with its text as written then.
 * - `lines`: Lines of such a file.
 * - `first`: Index of the first line of its table, its header.
 * - `named`: Index of each row of the old name in it, the last first.
 *
 * @param sent - The place changed, as the page sends it
 * @returns The place as written with its old name, as {@link placeChange} takes it, to send to Vu,
 *   see `listShare` in `shared.ts`;
 *   `null` for a dry run, a place moved to another row and while no row changes
 * @throws {Error} - When the old or the new name is empty, the link is no web address,
 *   a line of a place cannot be read, or a file lies outside the new system
 */
export function placeRename(sent: PlaceRenamed): PlaceChanged | null {
    const old: string = String(sent.old ?? "").trim();
    const name: string = nameOf(String(sent.name ?? ""));
    if (old === "") throw new Error(`No place of the name: ${sent.old}`);
    const rows: Place[] = [...placesRead(), ...roomsRead()];
    const target: Place | undefined = rows.find(
        (place: Place): boolean =>
            place.name !== old && place.name.toLowerCase() === name.toLowerCase(),
    );
    const changed: Place =
        target ??
        placeCleanOf(
            sent,
            rows.filter((place: Place): boolean => place.name !== old),
        );
    const tables: [string, string][] = [day.places, day.rooms]
        .filter((file: string): boolean =>
            tableRead(file).some((place: Place): boolean => place.name === old),
        )
        .map((file: string): [string, string] => {
            const lines: string[] = placeLinesRead(file);
            const first: number = lines.findIndex((line: string): boolean =>
                line.startsWith("|"),
            );
            const named: number[] = lines
                .flatMap((line: string, index: number): number[] =>
                    index >= first + tableHead &&
                    line.startsWith("|") &&
                    nameOf(cellsOf(line)[0] ?? "") === old
                        ? [index]
                        : [],
                )
                .reverse();
            named.forEach((row: number): void => {
                if (target === undefined)
                    lines[row] = rowOf({
                        ...changed,
                        standard: rowPlaceOf(lines[row]).standard,
                    });
                else lines.splice(row, 1);
            });
            if (target === undefined) rowsSort(lines);
            return [file, lines.join("\n")];
        })
        .filter(
            ([file, text]: [string, string]): boolean =>
                text !== readFileSync(file, "utf8"),
        );
    placeLinesRename(
        [{ folder: calendarRoot, ending: ".ics" }],
        old,
        lineOf(changed),
        changed.link,
        sent.dry === true,
    );
    if (sent.dry === true) return null;
    tables.forEach(([file, text]: [string, string]): void => writeFileSync(file, text));
    if (
        target !== undefined &&
        rows.some((place: Place): boolean => place.name === old && place.standard)
    )
        placeStandardSet(target.name);
    return target === undefined && tables.length > 0 ? { ...changed, old: old } : null;
}

/**
 * Makes a place my default place, as its star in the dialog asks,
 * see `placeEditOf` in `src/day/places.ts`:
 * `★` in the column `Default` of its row in `Places.md` or `Rooms.md`, and none in any other row,
 * so at most one place is it; an empty name leaves none.
 * Writes only a file that changes, every other line staying as it is.
 * Mine alone: never sent to Vu, see `shared.ts`.
 * - `first`: Index of the first row of a table, after its head.
 * - `text`: The text of a file as it is.
 * - `marked`: Its text with the star set.
 *
 * @param name - Name of the place, like `Home Munich`, empty for none
 * @throws {Error} - When no place or room has the name, or a file lies outside the new system
 */
export function placeStandardSet(name: string): void {
    if (
        name !== "" &&
        ![...placesRead(), ...roomsRead()].some(
            (place: Place): boolean => place.name === name,
        )
    )
        throw new Error(`No place of the name: ${name}`);
    [day.places, day.rooms].filter(existsSync).forEach((file: string): void => {
        const lines: string[] = placeLinesRead(file);
        const first: number =
            lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
        const text: string = lines.join("\n");
        const marked: string = lines
            .map((line: string, index: number): string =>
                index < first || !line.startsWith("|")
                    ? line
                    : rowOf({
                          ...rowPlaceOf(line),
                          standard: rowPlaceOf(line).name === name,
                      }),
            )
            .join("\n");
        if (marked !== text) writeFileSync(file, marked);
    });
}

/**
 * Reads my platforms online, the rows of the table of `Online.md`:
 * its lines starting with `|`, after the head of the table; a row without a name stays out.
 * - `cells`: Cells of a row, without the empty texts before its first `|` and after its last.
 *
 * @returns Platforms in the order of the table, none while `Online.md` does not exist
 */
export function platformsRead(): Platform[] {
    if (!existsSync(day.online)) return [];
    return readFileSync(day.online, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map(cellsOf)
        .filter((cells: string[]): boolean => (cells[0] ?? "") !== "")
        .map((cells: string[]): Platform => ({
            name: cells[0],
            provider: cells[1] ?? "",
            link: cells[2] ?? "",
        }));
}

/**
 * Gives the platform of a link, the one whose web app lies on the same host, `www.` left out,
 * like `YouTube` of `https://www.youtube.com/watch?v=…`,
 * so an older entry that linked a video or a meeting
 * as the `ALTREP` of its `SUMMARY` shows it online, see `entryOf` in `calendar.ts`.
 * - `host`: Gives the host of a link without `www.`, empty for no web address.
 *
 * @param link - A web address, like `https://www.youtube.com/watch?v=…`
 * @returns The platform, `undefined` for none
 */
export function platformOfLink(link: string): Platform | undefined {
    const host: (text: string) => string = (text: string): string =>
        URL.canParse(text) ? new URL(text).hostname.replace(/^www\./, "") : "";
    return host(link) === ""
        ? undefined
        : platformsRead().find(
              (platform: Platform): boolean => host(platform.link) === host(link),
          );
}

/**
 * Adds a platform that is none of mine yet as a row of the table of `Online.md`,
 * as typed in the field `Online`, its provider and link then empty for me to fill in there,
 * or as it came from Vu with them, see `shared.ts`;
 * the rows sorted by name, see {@link rowsSort}, every other line staying as it is;
 * creates the file with its head, see {@link platformHead}, when it does not exist yet.
 * - `added`: The platform cleaned, see {@link cellOf}.
 * - `lines`: Lines of the file.
 * - `last`: Index of the last line of its table.
 *
 * @param sent - Its name, like `Webex`, and maybe its provider and link
 * @returns The platform as written
 * @throws {Error} - When the name is empty or another platform has it, ignoring case,
 *   the link is no web address, or the file lies outside the new system
 */
export function platformAdd(sent: Platform): Platform {
    const added: Platform = {
        name: cellOf(String(sent.name ?? "")),
        provider: cellOf(String(sent.provider ?? "")),
        link: cellOf(String(sent.link ?? "")),
    };
    if (
        added.name === "" ||
        platformsRead().some(
            (platform: Platform): boolean =>
                platform.name.toLowerCase() === added.name.toLowerCase(),
        )
    )
        throw new Error(`No new name of a platform: ${added.name}`);
    if (added.link !== "" && !linkForm.test(added.link))
        throw new Error(`No link of ${added.name}: ${added.link}`);
    if (!writeAllowed(day.online))
        throw new Error(`No writing outside the new system: ${day.online}`);
    const lines: string[] = existsSync(day.online)
        ? readFileSync(day.online, "utf8").split("\n")
        : [...platformHead, ""];
    const last: number = lines.findLastIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    lines.splice(last + 1, 0, `| ${added.name} | ${added.provider} | ${added.link} |`);
    rowsSort(lines);
    mkdirSync(dirname(day.online), { recursive: true });
    writeFileSync(day.online, lines.join("\n"));
    return added;
}

/**
 * Gives what an entry or a box did online as it is written, see `Online` in `calendar.ts`:
 * as sent, its platform, the link of its meeting or video, its channel and its title cleaned,
 * see {@link cellOf}, all four empty without a platform;
 * from a sender that knows none, like the calendar after a drag,
 * as the entry or box it comes from has it,
 * like the box a log entry is logged from or the entry being changed.
 * - `online`: The platform as sent, cleaned.
 * - `link`: The link as sent, cleaned.
 *
 * @param sent - What it did online, as sent; its platform `undefined` from a sender that knows none
 * @param from - The entry or box it comes from, `null` for none
 * @returns What it did online
 * @throws {Error} - When the link is no web address
 */
export function onlineFor(
    sent: {
        online?: string;
        onlineLink?: string;
        onlineChannel?: string;
        onlineTitle?: string;
    },
    from: Online | null,
): Online {
    if (sent.online === undefined)
        return {
            online: from?.online ?? "",
            onlineLink: from?.onlineLink ?? "",
            onlineChannel: from?.onlineChannel ?? "",
            onlineTitle: from?.onlineTitle ?? "",
        };
    const online: string = cellOf(String(sent.online));
    const link: string = online === "" ? "" : cellOf(String(sent.onlineLink ?? ""));
    if (link !== "" && !linkForm.test(link))
        throw new Error(`No link of ${online}: ${link}`);
    return {
        online: online,
        onlineLink: link,
        onlineChannel: online === "" ? "" : cellOf(String(sent.onlineChannel ?? "")),
        onlineTitle: online === "" ? "" : cellOf(String(sent.onlineTitle ?? "")),
    };
}

/**
 * A changed platform, as the page sends it: its name, maybe new, like `MS Teams`,
 * and its provider as typed.
 *
 * - `old`: Name of the platform as it was, like `Teams`.
 */
export type PlatformChanged = Platform & {
    old: string;
};

/**
 * Changes my platform of a name in `Online.md`, its name and who offers it,
 * as typed in the parts of `Online` in the dialog, in its own row, the link of its web app kept,
 * the rows sorted anew, see {@link rowsSort}, every other line staying as it is;
 * entries written before keep the platform they name, as they keep their places.
 * - `old`: The old name in small letters, as names compare, ignoring case.
 * - `lines`: Lines of the file.
 * - `first`: Index of the first line of its table, its header.
 * - `row`: Index of the row of the platform, -1 for none.
 * - `changed`: The platform as written.
 *
 * @param sent - Its old name, like `Teams`, its name and its provider as typed
 * @returns The platform as written
 * @throws {Error} - When no platform has the old name,
 *   the name is empty or another platform has it, ignoring case,
 *   or the file lies outside the new system
 */
export function platformChange(sent: PlatformChanged): Platform {
    const old: string = cellOf(String(sent.old ?? "")).toLowerCase();
    if (!writeAllowed(day.online))
        throw new Error(`No writing outside the new system: ${day.online}`);
    const lines: string[] = existsSync(day.online)
        ? readFileSync(day.online, "utf8").split("\n")
        : [];
    const first: number = lines.findIndex((line: string): boolean =>
        line.startsWith("|"),
    );
    const row: number = lines.findIndex(
        (line: string, index: number): boolean =>
            index >= first + tableHead &&
            line.startsWith("|") &&
            (cellsOf(line)[0] ?? "").toLowerCase() === old,
    );
    if (old === "" || row === -1) throw new Error(`No platform of the name: ${sent.old}`);
    const changed: Platform = {
        name: cellOf(String(sent.name ?? "")),
        provider: cellOf(String(sent.provider ?? "")),
        link: cellsOf(lines[row])[2] ?? "",
    };
    if (
        changed.name === "" ||
        platformsRead().some(
            (platform: Platform): boolean =>
                platform.name.toLowerCase() === changed.name.toLowerCase() &&
                platform.name.toLowerCase() !== old,
        )
    )
        throw new Error(`No new name of a platform: ${changed.name}`);
    lines[row] = `| ${changed.name} | ${changed.provider} | ${changed.link} |`;
    rowsSort(lines);
    writeFileSync(day.online, lines.join("\n"));
    return changed;
}
