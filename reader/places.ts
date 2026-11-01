/**
 * ## Places
 *
 * Reads and writes my places in `Places.md`, one table with one row per place.
 * The column `Default` marks my default place by `★`, at most one row.
 * Only its star in the dialog sets it, every other change of a row keeps it.
 * An entry writes its place as Google Calendar does, its name and address in one line,
 * as its `LOCATION` with the link as `ALTREP`, and where its way starts as its `X-FROM`.
 * So it keeps the address it had then, also once `Places.md` changes.
 * The name is the part before the first comma, so a name never holds a comma.
 * An older entry keeps the name alone, or its code and town in one part.
 * `Rooms.md` holds the rooms of the university in a table of the same form.
 * A new place whose name starts like the code of a room goes there, otherwise into `Places.md`.
 * A name is unique over both files, both stay sorted by name.
 * A place is only where I physically am, what I do online is apart, a row of `Online.md`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { placeLinesRename } from "./calendar.ts";
import { cellsOf } from "./markdown.ts";
import { calendarRoot, day, writeAllowed } from "./sources.ts";

import type { Online } from "./calendar.ts";

/**
 * A place, one row of `Places.md`, or a room, one row of `Rooms.md`.
 * Its name is unique, ignoring case.
 * The name and the address hold no `|` and no comma, which part them in a line.
 * - `street`: With the number of the house, which may stay out.
 * - `standard`: Whether it is my default place.
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
 * A platform of what I do online, one row of `Online.md`.
 * - `link`: Its web app, an entry links its own meeting or video.
 */
export type Platform = {
    name: string;
    provider: string;
    link: string;
};

/** A changed place with its old name. */
export type PlaceChanged = Place & {
    old: string;
};

/**
 * A place changed everywhere from its pencil in a dialog,
 * its old name the part of its line before the first comma.
 * - `dry`: Only check the change, writing nothing.
 */
export type PlaceRenamed = PlaceChanged & {
    dry?: boolean;
};

/** Head of the table of a new `Places.md`. */
const fileHead: string[] = [
    "| Place | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/** Head of the table of a new `Rooms.md`. */
const roomHead: string[] = [
    "| Room | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/** Beginning of the code of a room of the TUM, digits and a dot. */
const roomForm: RegExp = /^\d+\./;

/** A web address without spaces. */
export const linkForm: RegExp = /^https?:\/\/\S+$/;

/** Lines of a table before its rows, the header and the line below. */
const tableHead: number = 2;

/** Orders names as a German dictionary, ignoring case. */
const nameOrder: Intl.Collator = new Intl.Collator("de");

/** Lines a new `Online.md` starts with, its title, one line a reader cannot guess, and its head. */
const platformHead: string[] = [
    "# Online",
    "",
    "Link is the platform's web app; an entry carries its own channel, title and link.",
    "",
    "| Label | Provider | Link |",
    "|---|---|---|",
];

/** Cleans a text for a cell, `|` and line breaks become spaces, spaces in a row one. */
function cellOf(text: string): string {
    return text.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

/** Cleans a name or part of an address, each comma a space, since commas part the line of a place. */
function nameOf(text: string): string {
    return cellOf(text.replace(/,/g, " "));
}

/** Writes a place as Google Calendar does, its name and address parted by commas, empty parts left out. */
export function lineOf(place: Place): string {
    return [place.name, place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/** Whether a line is the one of a place, also as an older entry wrote it, its code and town in one part. */
function lineIs(place: Place, line: string): boolean {
    return (
        line === lineOf(place) ||
        line ===
            [place.name, place.street, `${place.code} ${place.city}`.trim(), place.country]
                .filter((part: string): boolean => part !== "")
                .join(", ")
    );
}

/** The name of the place of a line, the part before its first comma. */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/**
 * The link to write as the `ALTREP` of `LOCATION`.
 * The link of the entry it comes from while it is the same place, else of my place or room, else none.
 * Never one typed for the entry, since a place is only where I am.
 */
export function placeLinkOf(line: string, from: { location: string; locationLink: string } | null): string {
    if (from !== null && from.location === line) return from.locationLink;
    return [...placesRead(), ...roomsRead()].find((place: Place): boolean => lineIs(place, line))?.link ?? "";
}

/** Reads a row of a table of places, its name empty for none. */
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

/** Reads the rows of a table of places in their order, a row without a name left out. */
function tableRead(file: string): Place[] {
    if (!existsSync(file)) return [];

    return readFileSync(file, "utf8")
        .split("\n")
        .filter((line: string): boolean => line.startsWith("|"))
        .slice(tableHead)
        .map(rowPlaceOf)
        .filter((place: Place): boolean => place.name !== "");
}

/** Reads my places, the rows of `Places.md`. */
export function placesRead(): Place[] {
    return tableRead(day.places);
}

/** Reads the rooms of the university, the rows of `Rooms.md`. */
export function roomsRead(): Place[] {
    return tableRead(day.rooms);
}

/**
 * Cleans a place as sent and checks it against my other places and rooms.
 * Only the name is needed. Never my default place, which only {@link placeStandardSet} sets.
 *
 * @throws {Error} - When the name is empty or taken, ignoring case, or the link is no web address
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
        others.some((mine: Place): boolean => mine.name.toLowerCase() === clean.name.toLowerCase())
    )
        throw new Error(`No new name of a place: ${clean.name}`);
    if (clean.link !== "" && !linkForm.test(clean.link)) throw new Error(`No link of ${clean.name}: ${clean.link}`);
    return clean;
}

/**
 * Reads the lines of a table of places to write into, the head of a new table when there is no file.
 *
 * @throws {Error} - When the file lies outside the new system or holds no table
 */
function placeLinesRead(file: string): string[] {
    if (!writeAllowed(file)) throw new Error(`No writing outside the new system: ${file}`);
    const lines: string[] = existsSync(file)
        ? readFileSync(file, "utf8").split("\n")
        : [...(file === day.rooms ? roomHead : fileHead), ""];
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    if (first === -1 || last === first) throw new Error(`No table in ${file}`);
    return lines;
}

/** Writes a place as a row of a table of places. */
function rowOf(place: Place): string {
    return (
        `| ${place.name} | ${place.street} | ${place.code} | ${place.city} ` +
        `| ${place.country} | ${place.link} | ${place.standard ? "★" : ""} |`
    );
}

/** Sorts the rows of a table by name, every other line staying where it is. */
function rowsSort(lines: string[]): void {
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    lines.splice(
        first,
        last + 1 - first,
        ...lines
            .slice(first, last + 1)
            .sort((one: string, other: string): number =>
                nameOrder.compare(nameOf(cellsOf(one)[0] ?? ""), nameOf(cellsOf(other)[0] ?? "")),
            ),
    );
}

/**
 * Adds a place as a row of `Rooms.md` when its name starts like the code of a room, else of `Places.md`.
 *
 * @throws {Error} - When the place is not valid, or the file lies outside the new system or holds no table
 */
export function placeAdd(sent: Place): Place {
    const added: Place = placeCleanOf(sent, [...placesRead(), ...roomsRead()]);
    const file: string = roomForm.test(added.name) ? day.rooms : day.places;
    const lines: string[] = placeLinesRead(file);
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    lines.splice(last + 1, 0, rowOf(added));
    rowsSort(lines);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, lines.join("\n"));
    return added;
}

/**
 * Changes the row of a place or room of a name, its star kept, and nothing else.
 * Every entry written before keeps the line and the link it had.
 *
 * @throws {Error} - When no place has the old name, the place is not valid, or the file lies outside the new system
 */
export function placeChange(sent: PlaceChanged): Place {
    const old: string = nameOf(String(sent.old ?? "")).toLowerCase();
    const file: string = roomsRead().some((room: Place): boolean => room.name.toLowerCase() === old)
        ? day.rooms
        : day.places;
    const changed: Place = placeCleanOf(
        sent,
        [...placesRead(), ...roomsRead()].filter((mine: Place): boolean => mine.name.toLowerCase() !== old),
    );
    const lines: string[] = placeLinesRead(file);
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const row: number = lines.findIndex(
        (line: string, index: number): boolean =>
            index >= first + tableHead && line.startsWith("|") && nameOf(cellsOf(line)[0] ?? "").toLowerCase() === old,
    );
    if (old === "" || row === -1) throw new Error(`No place of the name: ${sent.old}`);
    lines[row] = rowOf({ ...changed, standard: rowPlaceOf(lines[row]).standard });
    rowsSort(lines);
    writeFileSync(file, lines.join("\n"));
    return changed;
}

/**
 * Changes a place everywhere, its rows and each `LOCATION` and `X-FROM` in every `.ics` file.
 * While no other row has the new name, each row and line takes the place as sent, its star kept.
 * While another row has it, ignoring case, the place moves to that row and takes its line and link.
 * Then the rows of the old name go, so no name has two rows, and a moved default place makes that row it.
 * Works out every file first and writes only then, so nothing is written while one file cannot be.
 * Gives the place with its old name to send to Vu,
 * `null` for a dry run, a move to another row and while no row changes.
 *
 * @throws {Error} - When a name is empty, the link is no web address,
 *   a line of a place cannot be read, or a file lies outside the new system
 */
export function placeRename(sent: PlaceRenamed): PlaceChanged | null {
    const old: string = String(sent.old ?? "").trim();
    const name: string = nameOf(String(sent.name ?? ""));
    if (old === "") throw new Error(`No place of the name: ${sent.old}`);
    const rows: Place[] = [...placesRead(), ...roomsRead()];
    const target: Place | undefined = rows.find(
        (place: Place): boolean => place.name !== old && place.name.toLowerCase() === name.toLowerCase(),
    );
    const changed: Place =
        target ??
        placeCleanOf(
            sent,
            rows.filter((place: Place): boolean => place.name !== old),
        );
    const tables: [string, string][] = [day.places, day.rooms]
        .filter((file: string): boolean => tableRead(file).some((place: Place): boolean => place.name === old))
        .map((file: string): [string, string] => {
            const lines: string[] = placeLinesRead(file);
            const first: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
            const named: number[] = lines
                .flatMap((line: string, index: number): number[] =>
                    index >= first + tableHead && line.startsWith("|") && nameOf(cellsOf(line)[0] ?? "") === old
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
        .filter(([file, text]: [string, string]): boolean => text !== readFileSync(file, "utf8"));
    placeLinesRename([{ folder: calendarRoot, ending: ".ics" }], old, lineOf(changed), changed.link, sent.dry === true);
    if (sent.dry === true) return null;
    tables.forEach(([file, text]: [string, string]): void => writeFileSync(file, text));
    if (target !== undefined && rows.some((place: Place): boolean => place.name === old && place.standard))
        placeStandardSet(target.name);
    return target === undefined && tables.length > 0 ? { ...changed, old: old } : null;
}

/**
 * Makes a place my only default place, an empty name leaves none.
 * Writes only a file that changes. Mine alone, never sent to Vu.
 *
 * @throws {Error} - When no place or room has the name, or a file lies outside the new system
 */
export function placeStandardSet(name: string): void {
    if (name !== "" && ![...placesRead(), ...roomsRead()].some((place: Place): boolean => place.name === name))
        throw new Error(`No place of the name: ${name}`);
    [day.places, day.rooms].filter(existsSync).forEach((file: string): void => {
        const lines: string[] = placeLinesRead(file);
        const first: number = lines.findIndex((line: string): boolean => line.startsWith("|")) + tableHead;
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

/** Reads my platforms, the rows of `Online.md` in their order, a row without a name left out. */
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
 * The platform whose web app lies on the host of a link, `www.` left out.
 * So an older entry that linked its video as the `ALTREP` of its `SUMMARY` shows it online.
 */
export function platformOfLink(link: string): Platform | undefined {
    const host: (text: string) => string = (text: string): string =>
        URL.canParse(text) ? new URL(text).hostname.replace(/^www\./, "") : "";
    return host(link) === ""
        ? undefined
        : platformsRead().find((platform: Platform): boolean => host(platform.link) === host(link));
}

/**
 * Adds a new platform as a row of `Online.md`, the rows sorted by name.
 * Typed, its provider and link stay empty for me to fill in.
 *
 * @throws {Error} - When the name is empty or taken, ignoring case,
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
        platformsRead().some((platform: Platform): boolean => platform.name.toLowerCase() === added.name.toLowerCase())
    )
        throw new Error(`No new name of a platform: ${added.name}`);
    if (added.link !== "" && !linkForm.test(added.link)) throw new Error(`No link of ${added.name}: ${added.link}`);
    if (!writeAllowed(day.online)) throw new Error(`No writing outside the new system: ${day.online}`);
    const lines: string[] = existsSync(day.online)
        ? readFileSync(day.online, "utf8").split("\n")
        : [...platformHead, ""];
    const last: number = lines.findLastIndex((line: string): boolean => line.startsWith("|"));
    lines.splice(last + 1, 0, `| ${added.name} | ${added.provider} | ${added.link} |`);
    rowsSort(lines);
    mkdirSync(dirname(day.online), { recursive: true });
    writeFileSync(day.online, lines.join("\n"));
    return added;
}

/**
 * What an entry did online as it is written, cleaned, all four empty without a platform.
 * From a sender that knows none, like the calendar after a drag, as the entry it comes from has it.
 *
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
    if (link !== "" && !linkForm.test(link)) throw new Error(`No link of ${online}: ${link}`);
    return {
        online: online,
        onlineLink: link,
        onlineChannel: online === "" ? "" : cellOf(String(sent.onlineChannel ?? "")),
        onlineTitle: online === "" ? "" : cellOf(String(sent.onlineTitle ?? "")),
    };
}

/** A changed platform with its old name. */
export type PlatformChanged = Platform & {
    old: string;
};

/**
 * Changes the name and provider of my platform of a name, its link kept.
 * Entries written before keep the platform they name.
 *
 * @throws {Error} - When no platform has the old name, the name is empty or taken, ignoring case,
 *   or the file lies outside the new system
 */
export function platformChange(sent: PlatformChanged): Platform {
    const old: string = cellOf(String(sent.old ?? "")).toLowerCase();
    if (!writeAllowed(day.online)) throw new Error(`No writing outside the new system: ${day.online}`);
    const lines: string[] = existsSync(day.online) ? readFileSync(day.online, "utf8").split("\n") : [];
    const first: number = lines.findIndex((line: string): boolean => line.startsWith("|"));
    const row: number = lines.findIndex(
        (line: string, index: number): boolean =>
            index >= first + tableHead && line.startsWith("|") && (cellsOf(line)[0] ?? "").toLowerCase() === old,
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
                platform.name.toLowerCase() === changed.name.toLowerCase() && platform.name.toLowerCase() !== old,
        )
    )
        throw new Error(`No new name of a platform: ${changed.name}`);
    lines[row] = `| ${changed.name} | ${changed.provider} | ${changed.link} |`;
    rowsSort(lines);
    writeFileSync(day.online, lines.join("\n"));
    return changed;
}
