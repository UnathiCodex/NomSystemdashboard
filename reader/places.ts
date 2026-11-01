/**
 * ## Places
 *
 * Reads and writes my places in `Places.md`, as `./food.ts` does my foods in `Foods.md`:
 * one Markdown table with one row per place, its name, address parts, link and default.
 * The column `Default` marks my default place by `★`, at most one row,
 * which a new entry starts with, see `lastPlaceFill` in `src/day/categories.ts`.
 * Only its star in the dialog sets it, and every other change of a row keeps it.
 * Every field of a place offers only these, see `./categories.ts`,
 * and an entry writes its place as Google Calendar does,
 * its name and its address in one line, see {@link lineOf}, as its `LOCATION`,
 * and where its way starts as its `X-FROM`,
 * so it keeps the address it had then, also once the address in `Places.md` changes.
 * Its name is the part before the first comma, see {@link labelOf},
 * so a name never holds a comma, see {@link nameOf}.
 * An older entry keeps the name alone, or its code and town in one part,
 * see {@link lineIs}.
 * The link of a place an entry writes as the `ALTREP` of its `LOCATION`.
 * The reader creates the file with the first place I add from the dialog of the day.
 * The pencil beside a place picked in a dialog changes it everywhere,
 * its row and every entry that names it, see {@link placeRename}.
 * A change of its row alone, as Vu shares one, see `./shared.ts`,
 * leaves every entry written before with the line and the link it had.
 * Beside it `Rooms.md` holds the rooms of the university in one table of the same form,
 * read the same way. An entry writes a room as a place.
 * A new place goes into `Rooms.md` when its name starts like the code of a room,
 * otherwise into `Places.md`. A name is unique over both files.
 * Both tables stay sorted by name.
 * A place is only where I physically am: what I do online,
 * like a meeting on Zoom or a video on YouTube, an entry writes apart from its place,
 * see `Online` in `./calendar.ts`, its platform one row of `Online.md`.
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
 * The name and the four parts of the address hold no `|` and no comma,
 * which parts them in a line, see {@link lineOf}.
 * - `street`: Its street with the number of the house, which may stay out.
 * - `standard`: Whether it is my default place, `★` in its column `Default`.
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
 * - `link`: The link of its web app.
 *   An entry links its own meeting or video, see `Online` in `./calendar.ts`.
 */
export type Platform = {
    name: string;
    provider: string;
    link: string;
};

/** A changed place, as the page sends it, with its old name. */
export type PlaceChanged = Place & {
    old: string;
};

/**
 * A place changed everywhere,
 * as the page sends it from the pencil beside a place in a dialog,
 * its old name as the entry or the box names it, the part of its line before the first
 * comma, and its name, address and link as typed.
 * - `dry`: Whether only to check the change, writing nothing.
 */
export type PlaceRenamed = PlaceChanged & {
    dry?: boolean;
};

/** Lines a new `Places.md` starts with: the head of its table. */
const fileHead: string[] = [
    "| Place | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/** Head of the table of a new `Rooms.md`. */
const roomHead: string[] = [
    "| Room | Street | Code | City | Country | Link | Default |",
    "|---|---|---|---|---|---|---|",
];

/** Beginning of the name of a room, the code of a room of the TUM: digits and a dot. */
const roomForm: RegExp = /^\d+\./;

/**
 * A link typed, of a place or of what an entry was, see `titleOf` in `./documents.ts`:
 * a web address without spaces.
 */
export const linkForm: RegExp = /^https?:\/\/\S+$/;

/** Lines of the table of `Places.md` before its rows: the header and the line below. */
const tableHead: number = 2;

/** Compares names as a German dictionary orders them, ignoring case. */
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

/** Cleans a text for a cell: `|` and line breaks become spaces, spaces in a row one. */
function cellOf(text: string): string {
    return text.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cleans the name or a part of the address of a place, which never holds a comma,
 * since an entry writes its place as one line whose commas part it:
 * each comma dropped, leaving a space,
 * as for a name of a room from NavigaTUM and for a name typed with a comma.
 */
function nameOf(text: string): string {
    return cellOf(text.replace(/,/g, " "));
}

/**
 * Writes a place as an entry writes it, as Google Calendar does:
 * its name, its street, its code, its town and its country, parted by commas,
 * a part left out while empty.
 */
export function lineOf(place: Place): string {
    return [place.name, place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/**
 * Tells whether a line is the one of a place,
 * as {@link lineOf} writes it or as an older entry wrote it,
 * its code and town in one part.
 */
function lineIs(place: Place, line: string): boolean {
    return (
        line === lineOf(place) ||
        line ===
            [place.name, place.street, `${place.code} ${place.city}`.trim(), place.country]
                .filter((part: string): boolean => part !== "")
                .join(", ")
    );
}

/** Gives the name of the place of a line, the part before its first comma. */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/**
 * Gives the link to write with a place as the `ALTREP` of `LOCATION`:
 * the link it had in the entry or box it comes from while it is that same place,
 * else the link of my place or the room of that line, else none.
 * Never one typed for the entry, since a place is only where I am,
 * see `Online` in `./calendar.ts`.
 */
export function placeLinkOf(line: string, from: { location: string; locationLink: string } | null): string {
    if (from !== null && from.location === line) return from.locationLink;
    return [...placesRead(), ...roomsRead()].find((place: Place): boolean => lineIs(place, line))?.link ?? "";
}

/** Reads a row of the table of `Places.md` or `Rooms.md`, its name empty for none. */
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
 * Reads the rows of the table of `Places.md` or `Rooms.md`, in their order,
 * none while the file does not exist. A row without a name stays out.
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

/** Reads my places, the rows of `Places.md`. */
export function placesRead(): Place[] {
    return tableRead(day.places);
}

/** Reads the rooms of the university, the rows of `Rooms.md`. */
export function roomsRead(): Place[] {
    return tableRead(day.rooms);
}

/**
 * Cleans a place as the page sends it, and checks it against my other places and rooms:
 * its name is needed, its address and its link may stay empty,
 * and an address needs no number of a house.
 * Never my default place, which only {@link placeStandardSet} sets.
 *
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
        others.some((mine: Place): boolean => mine.name.toLowerCase() === clean.name.toLowerCase())
    )
        throw new Error(`No new name of a place: ${clean.name}`);
    if (clean.link !== "" && !linkForm.test(clean.link)) throw new Error(`No link of ${clean.name}: ${clean.link}`);
    return clean;
}

/**
 * Reads the lines of `Places.md` or `Rooms.md` to write a place into,
 * the head of a new table when the file does not exist yet.
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

/** Writes a place as a row of the table of `Places.md` or `Rooms.md`. */
function rowOf(place: Place): string {
    return (
        `| ${place.name} | ${place.street} | ${place.code} | ${place.city} ` +
        `| ${place.country} | ${place.link} | ${place.standard ? "★" : ""} |`
    );
}

/**
 * Sorts the rows of a table by name, see {@link nameOrder},
 * every other line staying where it is.
 */
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
 * Adds a place as a row of `Rooms.md` when its name starts
 * like the code of a room, else of `Places.md`, then sorts the rows,
 * every other line staying as it is.
 * Creates the file when it does not exist yet.
 *
 * @throws {Error} - When the name is empty,
 *   another place or a room has the name, ignoring case,
 *   the link is no web address, or the file lies outside the new system or holds no table
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
 * Changes my place of a name in `Places.md`, or a room in `Rooms.md`,
 * in its own row, its star kept, the rows sorted anew, and nothing else:
 * every entry written before keeps the line and the link it had,
 * since each writes its place itself.
 *
 * @throws {Error} - When no place has the old name, the name is empty,
 *   another place or a room has the name, ignoring case, the link is no web address,
 *   or the file lies outside the new system
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
 * Changes a place everywhere, as its pencil in a dialog asks once the dialog saves:
 * every row of its old name in `Places.md` and `Rooms.md`,
 * and each `LOCATION` and `X-FROM` in every `.ics` file of `NomManagecalendar`,
 * see `placeLinesRename` in `./calendar.ts`.
 * While no other row has its new name,
 * the place takes its name, address and link as sent, cleaned as for a place added:
 * each row of the old name becomes its row, its star kept, the rows sorted anew,
 * and each line its line with its link. A place without row gets none.
 * While another row has the new name, ignoring case, the place moves to that row:
 * each line takes the line and the link of that row,
 * the address and the link sent counting not,
 * and each row of the old name goes, so no second row of the name is made.
 * My default place moved so makes that row my default place.
 * Works out every file first and writes only then,
 * so nothing is written while one file cannot be.
 * Gives the place as written with its old name, to send to Vu,
 * `null` for a dry run, a place moved to another row and while no row changes.
 *
 * @throws {Error} - When the old or the new name is empty, the link is no web address,
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
 * Makes a place my default place, as its star in the dialog asks,
 * see `placeEditOf` in `src/day/places.ts`,
 * and no other, so at most one place is it. An empty name leaves none.
 * Writes only a file that changes.
 * Mine alone: never sent to Vu, see `./shared.ts`.
 *
 * @throws {Error} - When no place or room has the name,
 *   or a file lies outside the new system
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

/**
 * Reads my platforms online, the rows of the table of `Online.md`, in their order,
 * none while it does not exist. A row without a name stays out.
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
 * Gives the platform of a link, the one whose web app lies on the same host,
 * `www.` left out, so an older entry that linked a video or a meeting
 * as the `ALTREP` of its `SUMMARY` shows it online, see `entryOf` in `./calendar.ts`.
 */
export function platformOfLink(link: string): Platform | undefined {
    const host: (text: string) => string = (text: string): string =>
        URL.canParse(text) ? new URL(text).hostname.replace(/^www\./, "") : "";
    return host(link) === ""
        ? undefined
        : platformsRead().find((platform: Platform): boolean => host(platform.link) === host(link));
}

/**
 * Adds a platform that is none of mine yet as a row of the table of `Online.md`,
 * as typed in the field `Online`, its provider and link then empty for me to fill in,
 * or as it came from Vu with them, see `./shared.ts`.
 * The rows sorted by name, every other line staying as it is.
 * Creates the file with its head when it does not exist yet.
 *
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
 * Gives what an entry or a box did online as it is written,
 * see `Online` in `./calendar.ts`:
 * as sent, cleaned, all four empty without a platform.
 * From a sender that knows none, like the calendar after a drag,
 * as the entry or box it comes from has it.
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

/** A changed platform, as the page sends it, with its old name. */
export type PlatformChanged = Platform & {
    old: string;
};

/**
 * Changes my platform of a name in `Online.md`, its name and who offers it,
 * in its own row, the link of its web app kept, the rows sorted anew.
 * Entries written before keep the platform they name, as they keep their places.
 *
 * @throws {Error} - When no platform has the old name,
 *   the name is empty or another platform has it, ignoring case,
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
