/**
 * ## Places
 *
 * The parts of a place, which I type below it in the dialog of an entry and in that of a series,
 * see {@link placeEditOf}, since the fields offer only my places of `Places.md`,
 * each with its address, see `reader/places.ts`.
 * The address of a place has four parts, the columns of `Places.md`,
 * as on an envelope in German, umlauts included, see {@link Place}:
 * its street with the number of the house, which may stay out, like `Burg-Eltz-Weg`, its code,
 * like `81375`, its town, like `München`, and its country, like `Deutschland`;
 * then its link, which follows the address as the search of Google Maps,
 * in the form Google gives for it, see {@link mapsLinkOf}, until I type a link myself,
 * like the NavigaTUM page of a room.
 * A place typed that is none of mine yet goes into `Places.md` at once, by its name,
 * see {@link placeSend}; the parts of any place picked, its label,
 * the four parts of its address and its link, change it everywhere once the dialog saves,
 * its row and every entry that names it, see {@link renameSend}.
 * An entry writes a place as one line, its name and its address, like
 * `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`, see {@link lineOf};
 * it shows by its name, the part before the first comma, see {@link labelOf},
 * and the dialog shows the whole line,
 * which opens the link of the place, written with it as its `ALTREP`, when it has one,
 * and nothing else: nothing opens a map by itself,
 * only a link stored with the place opens on a click.
 * In the list of a field of a place a place shows by its name, its address grey beside it,
 * see {@link placeChoiceOf}.
 * A way shows its route by labels, with an arrow drawn between them, see {@link whereLinkedOf}.
 * A place is only where I physically am:
 * an entry that did something online shows its platform of `Online.md`,
 * like `Zoom`, instead of its place the same way,
 * its name opening the link of its meeting or video,
 * see {@link whereLinkedOf}, its place still in the dialog;
 * a platform typed that is none of mine yet goes into `Online.md` at once,
 * see {@link platformSend}.
 * Below the parts of a place its star makes it my default place, which a new entry starts with, see
 * {@link standardStarOf}.
 *
 * - `lucide`: The arrow of a route and the star of my default place.
 * - `../icons.ts`: Makes the element of an icon and puts one into a button.
 * - `../reader.ts`: Asks the reader.
 * - `./choices.ts`: Makes the parts of a field, and the type of a choice of a list.
 */

import { ArrowRight, Star } from "lucide";
import { iconOf, iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { partFieldOf, partOf } from "./choices.ts";

import type { Choice } from "./choices.ts";

/**
 * A place, one row of `Places.md` or `Rooms.md`, as the reader writes it.
 *
 * - `name`: Name, like `TUM Innenstadt`, without a comma, which the reader drops,
 *   see `nameOf` in `reader/places.ts`.
 * - `street`: Its street with the number of the house, which may stay out, like `Arcisstraße 21`.
 * - `code`: Its code, the postcode, like `80333`.
 * - `city`: Its town, like `München`.
 * - `country`: Its country, like `Deutschland`.
 * - `link`: Its link, like `https://nav.tum.de/room/0509.EG.980`.
 * - `standard`: Whether it is my default place, `★` in its column `Default`, like `Home Munich`.
 *
 * Each text empty for none.
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
 * A platform of what I do online, one row of `Online.md`, as the reader writes it, see `Platform`
 * in `reader/places.ts`.
 *
 * - `name`: Name, like `Zoom`.
 * - `provider`: Who offers it, like `Zoom Video Communications`, empty for none.
 * - `link`: The link of its web app, like `https://zoom.us`, empty for none.
 */
export type Platform = {
    name: string;
    provider: string;
    link: string;
};

/**
 * A link of a place as the reader takes it, a web address without spaces,
 * like `https://nav.tum.de/room/0509.EG.980`, see `linkForm` in `reader/places.ts`.
 */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Writes the address of a place in one line: its street, its code, its town and its country, parted
 * by commas, a part left out while empty.
 *
 * @param place - A place of `Places.md`
 * @returns Address like `Arcisstraße 21, 80333, München, Deutschland`, empty for none
 */
export function placeAddressOf(place: Place): string {
    return [place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/**
 * Writes a place as an entry writes it into `LOCATION`,
 * as Google Calendar does, its name and its address in one line, see {@link placeAddressOf}.
 *
 * @param place - A place of `Places.md`
 * @returns Line like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   the name alone without address
 */
export function lineOf(place: Place): string {
    return placeAddressOf(place) === ""
        ? place.name
        : `${place.name}, ${placeAddressOf(place)}`;
}

/**
 * Gives the name of the place of a line, the part before its first comma,
 * as the grid and the plan show it.
 *
 * @param line - Place as an entry writes it,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   or an older one, only its name, like `Home Munich`
 * @returns Name like `TUM Innenstadt`
 */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/**
 * Gives the address of a place as an entry writes it, the part after its name.
 *
 * @param line - Place like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   or only its name, like `Home Munich`
 * @returns Address like `Arcisstraße 21, 80333, München, Deutschland`, empty for none
 */
export function addressOf(line: string): string {
    return line.includes(",") ? line.slice(line.indexOf(",") + 1).trim() : "";
}

/**
 * Gives a place as its row holds it, my place or the room of its name, see {@link labelOf};
 * one without row, like one an older entry wrote,
 * as its line says, with the link it was written with: its name,
 * then its street, its code, its town and its country,
 * those of an older line whose code and town stand in one part parted at its first space,
 * like `85748` and `Garching bei München` of `85748 Garching bei München`.
 * - `name`: Its name.
 * - `row`: Its row, `undefined` for none.
 * - `parts`: The parts of its address.
 * - `town`: Index of the part of an older line that holds its code and its town, -1 for none.
 * - `space`: Where that part parts.
 *
 * @param line - Place as an entry writes it,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333 München, Deutschland`
 * @param link - Its link as the entry wrote it, its `ALTREP`, empty for none
 * @param rows - My places and the rooms by their lines, see `places` of `Field` in `categories.ts`
 * @returns The place
 */
export function placeOf(
    line: string,
    link: string,
    rows: { [line: string]: Place },
): Place {
    const name: string = labelOf(line);
    const row: Place | undefined = Object.values(rows).find(
        (place: Place): boolean => place.name === name,
    );
    if (row !== undefined) return row;
    const parts: string[] = addressOf(line)
        .split(",")
        .map((part: string): string => part.trim())
        .filter((part: string): boolean => part !== "");
    const town: number =
        parts.length < 4
            ? parts.findIndex((part: string): boolean => /^\d+ \S/.test(part))
            : -1;
    if (town === -1)
        return {
            name: name,
            street: parts[0] ?? "",
            code: parts[1] ?? "",
            city: parts[2] ?? "",
            country: parts.slice(3).join(", "),
            link: link,
            standard: false,
        };
    const space: number = parts[town].indexOf(" ");
    return {
        name: name,
        street: parts.slice(0, town).join(", "),
        code: parts[town].slice(0, space),
        city: parts[town].slice(space + 1),
        country: parts.slice(town + 1).join(", "),
        link: link,
        standard: false,
    };
}

/**
 * Makes the parts of a place to change it, below it in a dialog, each a part of its own,
 * see `partOf` in `choices.ts`, the columns of its row:
 * its label, its street, its code, its city, its country and its link,
 * its star at the right of its label, see {@link standardStarOf};
 * the link following the address as the search of Google Maps while it is that search or empty,
 * see {@link mapsLinkIs}, until I type a link myself, like the NavigaTUM page of a room;
 * below them a grey line while the reader would not take them,
 * a name left empty or a link that is no web address.
 * Each change goes to the dialog as typed,
 * and once I leave a part I changed, the name of the part or field I went on to,
 * so the dialog shows the place anew, the cursor kept there.
 * - `name`, `street`, `code`, `city`, `country`, `link`:
 *   Fields of its label, the parts of its address and its link.
 * - `follows`: Whether the link follows the address.
 * - `changed`: Whether I changed a part since I left one last.
 * - `typed`: The place as typed.
 * - `hint`: Line saying that the reader would not take it.
 * - `hintShow`: Shows the line while the reader would not take the place as typed, else hides it.
 * - `label`: The part of its label.
 * - `line`: Its field and its star in one line.
 *
 * @param place - The place as it shows, like my place as its row holds it, see {@link placeOf}
 * @param change - Takes the place as typed, after each change
 * @param leave - Takes the name of the part or field I went on to,
 *   like `Street of the place`, `null` for none, once I leave a part I changed
 * @returns The parts, the star and the grey line
 */
export function placeEditOf(
    place: Place,
    change: (typed: Place) => void,
    leave: (next: string | null) => void,
): HTMLElement[] {
    const name: HTMLInputElement = partFieldOf("text", place.name, "Name of the place");
    const street: HTMLInputElement = partFieldOf(
        "text",
        place.street,
        "Street of the place",
    );
    const code: HTMLInputElement = partFieldOf("text", place.code, "Code of the place");
    const city: HTMLInputElement = partFieldOf("text", place.city, "City of the place");
    const country: HTMLInputElement = partFieldOf(
        "text",
        place.country,
        "Country of the place",
    );
    const link: HTMLInputElement = partFieldOf("url", place.link, "Link of the place");
    let follows: boolean =
        link.value === "" || mapsLinkIs(link.value, placeAddressOf(place));
    let changed: boolean = false;
    const typed: () => Place = (): Place => ({
        name: name.value.trim(),
        street: street.value.trim(),
        code: code.value.trim(),
        city: city.value.trim(),
        country: country.value.trim(),
        link: link.value.trim(),
        standard: place.standard,
    });
    const hint: HTMLParagraphElement = document.createElement("p");
    hint.className = "entry-none";
    hint.textContent = "Not saved: it needs a name, and a link only as a web address";
    const hintShow: () => void = (): void => {
        hint.hidden =
            typed().name !== "" && (typed().link === "" || linkForm.test(typed().link));
    };
    for (const part of [street, code, city, country])
        part.addEventListener("input", (): void => {
            if (follows) link.value = mapsLinkOf(placeAddressOf(typed()));
        });
    link.addEventListener("input", (): void => {
        follows = false;
    });
    for (const part of [name, street, code, city, country, link]) {
        part.addEventListener("input", (): void => {
            changed = true;
            hintShow();
            change(typed());
        });
        part.addEventListener("focusout", (event: FocusEvent): void => {
            if (!changed) return;
            changed = false;
            leave(
                event.relatedTarget instanceof HTMLElement
                    ? event.relatedTarget.getAttribute("aria-label")
                    : null,
            );
        });
    }
    hintShow();
    const label: HTMLLabelElement = partOf("Label", name);
    const line: HTMLSpanElement = document.createElement("span");
    line.className = "place-label";
    line.append(name, standardStarOf(place));
    label.append(line);
    return [
        label,
        partOf("Street", street),
        partOf("Code", code),
        partOf("City", city),
        partOf("Country", country),
        partOf("Link", link),
        hint,
    ];
}

/**
 * Makes the star of a place, at the right of its label, see {@link placeEditOf}:
 * filled while the place is my default place, which a new entry starts with,
 * see `lastPlaceFill` in `categories.ts`, else empty;
 * a click makes it my default place at once, or none while it is,
 * see {@link standardSend}, the star filled or emptied once the reader wrote it,
 * apart from the other parts, which wait for the dialog to save.
 * - `star`: The star.
 *
 * @param place - The place as it shows, as its row holds it
 * @returns The star
 */
function standardStarOf(place: Place): HTMLButtonElement {
    const star: HTMLButtonElement = document.createElement("button");
    star.type = "button";
    star.className = "place-star";
    iconPut(star, Star, "Default place");
    star.setAttribute("aria-pressed", String(place.standard));
    star.addEventListener("click", (): void => {
        const standard: boolean = star.getAttribute("aria-pressed") !== "true";
        standardSend(standard ? place.name : "")
            .then((): void => star.setAttribute("aria-pressed", String(standard)))
            .catch((error: unknown): void => console.error(error));
    });
    return star;
}

/**
 * Makes the choice of a place in the list of a field of a place,
 * in the dialog and in the form of a series, see `../editor/course.ts`: by its name,
 * see {@link labelOf}, or by the new name typed for it by its pencil,
 * see {@link renameSend}, my default place with its star after it,
 * see {@link standardFirst}, its address grey beside it.
 *
 * @param line - Place as an entry writes it,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`
 * @param name - Name it shows, like `TUM Stammgelände` typed for it
 * @param places - My places by their lines, which tell my default place
 * @returns Choice, like one showing `TUM Innenstadt`
 */
export function placeChoiceOf(
    line: string,
    name: string,
    places: { [line: string]: Place },
): Choice {
    const standard: Place | undefined = Object.values(places).find(
        (place: Place): boolean => place.standard,
    );
    return {
        value: line,
        text: name,
        group: "",
        detail: addressOf(line),
        starred: standard !== undefined && labelOf(line) === standard.name,
    };
}

/**
 * Puts my default place, `★` in `Places.md`, first among the places of a list,
 * in the dialog and in the form of a series, so it always stands on top, see {@link placeChoiceOf}:
 * by its line, once, an older line of the same name left out;
 * the list as it is without default place.
 * - `standard`: My default place, `undefined` for none.
 *
 * @param lines - The places of the list,
 *   like `Home Munich, Burg-Eltz-Weg, 81375, München, Deutschland`
 * @param places - My places by their lines
 * @returns The places, my default place first
 */
export function standardFirst(
    lines: string[],
    places: { [line: string]: Place },
): string[] {
    const standard: Place | undefined = Object.values(places).find(
        (place: Place): boolean => place.standard,
    );
    if (standard === undefined) return lines;
    return [
        lineOf(standard),
        ...lines.filter((line: string): boolean => labelOf(line) !== standard.name),
    ];
}

/**
 * Category of ways, whose place shows as the route, see {@link whereOf}.
 */
export const wayName: string = "Way";

/**
 * Writes where an entry or a box was, by labels alone, see {@link labelOf}, as text,
 * which tells whether it has a place at all:
 * the route of a way, from where it starts, its `X-FROM`, to its goal, its `LOCATION`,
 * like `Home Munich -> TUM Garching`, a missing end left out beside its arrow,
 * like `-> TUM Garching`; the place of any other entry, like `Home Munich`;
 * for an entry that did something online its platform instead,
 * like `Zoom`, its place still in the dialog.
 * The page shows it with the arrow drawn, see {@link whereLinkedOf}.
 * - `start`: Label of where a way starts, empty for none.
 * - `goal`: Label of the place or the goal, empty for none.
 *
 * @param category - Category of the entry, like `Way`
 * @param from - Where a way starts,
 *   like `Home Munich, Burgweg 1, 81375, München, Deutschland`, empty for none
 * @param location - Place or goal,
 *   like `TUM Garching, Boltzmannstraße 3, 85748, Garching, Deutschland`
 * @param online - Its platform online, like `Zoom`, empty for none
 * @returns Where it was, like `Home Munich -> TUM Garching`,
 *   empty for no place at all and nothing online
 */
export function whereOf(
    category: string,
    from: string,
    location: string,
    online: string,
): string {
    const start: string = labelOf(from);
    const goal: string = labelOf(location);
    if (online !== "") return online;
    if (category !== wayName || (start === "" && goal === "")) return goal;
    return `${start} -> ${goal}`.trim();
}

/**
 * Makes the link of a place, its `ALTREP`, which opens in a new tab,
 * like `8120.01.101 (Audimax im Galileo)` opening `https://nav.tum.de/room/8120.01.101`.
 * A click on it opens only the link, never the entry or the box it stands in,
 * so it does not reach their own click.
 * - `anchor`: The link.
 *
 * @param label - Label of the place, like `8120.01.101 (Audimax im Galileo)`
 * @param link - Its link, like `https://nav.tum.de/room/8120.01.101`
 * @returns The link
 */
function placeAnchorOf(label: string, link: string): HTMLAnchorElement {
    const anchor: HTMLAnchorElement = document.createElement("a");
    anchor.className = "place-link";
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = label;
    anchor.addEventListener("click", (event: MouseEvent): void =>
        event.stopPropagation(),
    );
    return anchor;
}

/**
 * Makes the arrow of a route between where a way starts and its goal:
 * drawn as an icon, not a character,
 * so it stands in the middle of the line, with a little room on both sides,
 * see `.route-arrow` in `log.css`.
 * - `arrow`: The icon.
 *
 * @returns The arrow
 */
function routeArrowOf(): SVGElement {
    const arrow: SVGElement = iconOf(ArrowRight);
    arrow.classList.add("route-arrow");
    return arrow;
}

/**
 * Shows where an entry or a box was, as {@link whereOf} writes it, the arrow of a route drawn, see
 * {@link routeArrowOf}, like `Home Munich` → `TUM Garching`,
 * and its place a link when it has one, its `ALTREP`, see {@link placeAnchorOf};
 * of a way its goal, which its `LOCATION` names, like `TUM Garching`;
 * for an entry that did something online its platform instead, the same way,
 * a link to its meeting or video when it has one, like `Zoom`.
 * A place or a platform without link is plain text, never the link itself.
 * - `start`: Label of where a way starts, like `Home Munich`, empty for none.
 * - `goal`: Label of the place or the goal, like `TUM Garching`, empty for none.
 * - `place`: The place or the goal as shown, a link or plain text, none for none.
 *
 * @param category - Category of the entry, like `Way`
 * @param from - Where a way starts,
 *   like `Home Munich, Burgweg 1, 81375, München, Deutschland`, empty for none
 * @param location - Place or goal,
 *   like `TUM Garching, Boltzmannstraße 3, 85748, Garching, Deutschland`
 * @param link - Link of the place or the goal, its `ALTREP`, empty for none
 * @param online - Its platform online, like `Zoom`, empty for none
 * @param onlineLink - The link of its meeting or video, empty for none
 * @returns Where it was, its place, goal or platform a link,
 *   none for no place at all and nothing online
 */
export function whereLinkedOf(
    category: string,
    from: string,
    location: string,
    link: string,
    online: string,
    onlineLink: string,
): (string | Node)[] {
    if (online !== "")
        return [onlineLink === "" ? online : placeAnchorOf(online, onlineLink)];
    const start: string = labelOf(from);
    const goal: string = labelOf(location);
    const place: (string | Node)[] =
        goal === "" ? [] : [link === "" ? goal : placeAnchorOf(goal, link)];
    if (category !== wayName || (start === "" && goal === "")) return place;
    return [start, routeArrowOf(), ...place];
}

/**
 * Gives the link of the search of an address in Google Maps,
 * in the form Google gives for a link to it, the address encoded for an address of the web, like
 * `https://www.google.com/maps/search/?api=1&query=Burg-Eltz-Weg%2C%2081375%20M%C3%BCnchen%2C%20Deutschland`
 * of `Burg-Eltz-Weg, 81375, München, Deutschland`.
 *
 * @param address - Address as typed
 * @returns The link, empty for an empty address
 */
export function mapsLinkOf(address: string): string {
    return address.trim() === ""
        ? ""
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/**
 * Tells whether a link is the search of an address in Google Maps,
 * as {@link mapsLinkOf} makes it or in the form an earlier one wrote it,
 * its spaces as `+` and its code and town in one part, without a comma between them,
 * so the link of my place follows its address while it is that search.
 * - `plain`: Gives a link decoded, its `+` and commas as spaces, spaces in a row one,
 *   as written when it cannot be decoded, like a link with a `%` of its own,
 *   like `https://example.com/100%`.
 *
 * @param link - Link of a place,
 *   like `https://www.google.com/maps/search/?api=1&query=Burg-Eltz-Weg%2C+81375+…`
 * @param address - Address of the place, like `Burg-Eltz-Weg, 81375, München, Deutschland`
 * @returns Whether it is the search of the address
 */
export function mapsLinkIs(link: string, address: string): boolean {
    const plain: (text: string) => string = (text: string): string => {
        try {
            return decodeURIComponent(text.replace(/\+/g, " ")).replace(/[,\s]+/g, " ");
        } catch {
            return text;
        }
    };
    return plain(link) === plain(mapsLinkOf(address));
}

/**
 * Sends a place to the reader: a new one, which it adds to `Places.md`, a room to `Rooms.md`,
 * or my place with its name as it was, whose row it changes, keeping its name.
 *
 * @param place - Name, the parts of its address and link as typed
 * @param old - Name of my place being changed, like `TUM Innenstadt`, empty for a new one
 * @returns The place as written, its name, the parts of its address and link cleaned
 * @throws {Error} - When the reader does not take it,
 *   like for a name another place has or a link that is none
 */
export async function placeSend(place: Place, old: string): Promise<Place> {
    return readerAsk<Place>("/api/day/places", {
        method: old === "" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(old === "" ? place : { ...place, old: old }),
    });
}

/**
 * Sends a place changed by its parts to the reader,
 * which changes it everywhere to its name, address and link,
 * its row in `Places.md` or `Rooms.md` and every entry and box that names it,
 * or moves them to the row of another place of the new name,
 * see `placeRename` in `reader/places.ts`;
 * or which only checks that it would, writing nothing, so a dialog saves nothing it refuses.
 *
 * @param old - Name of the place as the entry or the box names it,
 *   like `5610.01.011 (Seminarraum (Inf. 18/19)`
 * @param place - The place as typed,
 *   like `5610.01.011 (Seminarraum (Inf. 18/19))` with its address and link
 * @param dry - Whether only to check it
 * @throws {Error} - When the reader does not take it,
 *   like for an empty name or a link that is no web address
 */
export async function renameSend(old: string, place: Place, dry: boolean): Promise<void> {
    await readerAsk<null>("/api/day/renamed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...place, old: old, dry: dry }),
    });
}

/**
 * Sends my default place to the reader, which marks its row by `★` and no other,
 * see `placeStandardSet` in `reader/places.ts`.
 *
 * @param name - Name of the place, like `Home Munich`, empty for none
 * @throws {Error} - When the reader does not take it, like for a name no place has
 */
async function standardSend(name: string): Promise<void> {
    await readerAsk<null>("/api/day/standard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
    });
}

/**
 * Sends a platform to the reader: one typed in `Online` that is none of mine yet,
 * which it adds to `Online.md`, or my platform with its name as it was,
 * whose row it changes, its name and who offers it as typed.
 *
 * @param platform - Its name, like `Webex`, and its provider as typed
 * @param old - Name of my platform being changed, like `Teams`, empty for a new one
 * @returns The platform as written, its name and provider cleaned
 * @throws {Error} - When the reader does not take it, like for a name another platform has
 */
export async function platformSend(platform: Platform, old: string): Promise<Platform> {
    return readerAsk<Platform>("/api/day/online", {
        method: old === "" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(old === "" ? platform : { ...platform, old: old }),
    });
}
