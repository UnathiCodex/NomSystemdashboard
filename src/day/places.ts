/**
 * ## Places
 *
 * The parts of a place, which I type below it in the dialog
 * of an entry and in that of a series,
 * see {@link placeEditOf}, since the fields offer only my places of `Places.md`,
 * each with its address, see `reader/places.ts`.
 * The address of a place has four parts, the columns of `Places.md`,
 * as on an envelope in German, umlauts included, see {@link Place},
 * then its link, which follows the address as the search of Google Maps,
 * see {@link mapsLinkOf}, until I type a link myself, like the NavigaTUM page of a room.
 * A place typed that is none of mine yet goes into `Places.md` at once, by its name,
 * see {@link placeSend}; the parts of any place picked change it everywhere
 * once the dialog saves, its row and every entry that names it, see {@link renameSend}.
 * An entry writes a place as one line, its name and its address, see {@link lineOf};
 * it shows by its name, the part before the first comma, see {@link labelOf},
 * and the dialog shows the whole line,
 * which opens the link of the place, written with it as its `ALTREP`, when it has one,
 * and nothing else: nothing opens a map by itself,
 * only a link stored with the place opens on a click.
 * A place is only where I physically am:
 * an entry that did something online shows its platform of `Online.md`
 * instead of its place the same way, see {@link whereLinkedOf}.
 * Below the parts of a place its star makes it my default place,
 * which a new entry starts with, see {@link standardStarOf}.
 */

import { ArrowRight, Star } from "lucide";
import { iconOf, iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { partFieldOf, partOf } from "./choices.ts";

import type { Choice } from "./choices.ts";
import type { Place, Platform } from "../../reader/places.ts";

/**
 * A link of a place as the reader takes it, a web address without spaces,
 * see `linkForm` in `reader/places.ts`.
 */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Writes the address of a place in one line: its street, its code,
 * its town and its country, parted by commas, a part left out while empty.
 */
export function placeAddressOf(place: Place): string {
    return [place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/**
 * Writes a place as an entry writes it into `LOCATION`,
 * as Google Calendar does, its name and its address in one line.
 */
export function lineOf(place: Place): string {
    return placeAddressOf(place) === ""
        ? place.name
        : `${place.name}, ${placeAddressOf(place)}`;
}

/**
 * Gives the name of the place of a line, the part before its first comma,
 * as the grid and the plan show it.
 */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/** Gives the address of a place as an entry writes it, the part after its name. */
export function addressOf(line: string): string {
    return line.includes(",") ? line.slice(line.indexOf(",") + 1).trim() : "";
}

/**
 * Gives a place as its row holds it, my place or the room of its name;
 * one without row, like one an older entry wrote,
 * as its line says, with the link it was written with,
 * those of an older line whose code and town stand in one part parted at its first space,
 * like `85748 Garching bei München`.
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
 * see `partOf` in `choices.ts`, the columns of its row,
 * its star at the right of its label, see {@link standardStarOf};
 * the link following the address as the search of Google Maps
 * while it is that search or empty,
 * see {@link mapsLinkIs}, until I type a link myself;
 * below them a grey line while the reader would not take them.
 * Each change goes to the dialog as typed,
 * and once I leave a part I changed, the name of the part or field I went on to,
 * so the dialog shows the place anew, the cursor kept there.
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
 * Makes the star of a place, at the right of its label:
 * filled while the place is my default place, which a new entry starts with,
 * see `lastPlaceFill` in `categories.ts`;
 * a click makes it my default place at once, or none while it is,
 * see {@link standardSend}, the star filled or emptied once the reader wrote it,
 * apart from the other parts, which wait for the dialog to save.
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
 * by its name or by the new name typed for it by its pencil,
 * my default place with its star after it, its address grey beside it.
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
 * so it always stands on top: by its line, once, an older line of the same name left out.
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

/** Category of ways, whose place shows as the route, see {@link whereOf}. */
export const wayName: string = "Way";

/**
 * Writes where an entry or a box was, by labels alone, as text,
 * which tells whether it has a place at all:
 * the route of a way, from its `X-FROM` to its `LOCATION`,
 * a missing end left out beside its arrow; the place of any other entry;
 * for an entry that did something online its platform instead.
 * The page shows it with the arrow drawn, see {@link whereLinkedOf}.
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
 * Makes the link of a place, its `ALTREP`, which opens in a new tab.
 * A click on it opens only the link, never the entry or the box it stands in,
 * so it does not reach their own click.
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
 */
function routeArrowOf(): SVGElement {
    const arrow: SVGElement = iconOf(ArrowRight);
    arrow.classList.add("route-arrow");
    return arrow;
}

/**
 * Shows where an entry or a box was, as {@link whereOf} writes it, the arrow drawn,
 * and its place or platform a link when it has one, see {@link placeAnchorOf}.
 * A place or a platform without link is plain text, never the link itself.
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
 * in the form Google gives for a link to it, empty for an empty address.
 */
export function mapsLinkOf(address: string): string {
    return address.trim() === ""
        ? ""
        : "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(address.trim());
}

/**
 * Tells whether a link is the search of an address in Google Maps,
 * as {@link mapsLinkOf} makes it or in the form an earlier one wrote it,
 * its spaces as `+` and its code and town in one part, without a comma between them,
 * so the link of my place follows its address while it is that search.
 * A link that cannot be decoded, like one with a `%` of its own, is compared as written.
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
 * Sends a place to the reader: a new one,
 * which it adds to `Places.md`, a room to `Rooms.md`,
 * or my place with its name as it was, whose row it changes, keeping its name.
 *
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
 * which changes it everywhere, see `placeRename` in `reader/places.ts`;
 * or which only checks that it would, writing nothing,
 * so a dialog saves nothing it refuses.
 *
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
 * whose row it changes.
 *
 * @throws {Error} - When the reader does not take it,
 * like for a name another platform has
 */
export async function platformSend(platform: Platform, old: string): Promise<Platform> {
    return readerAsk<Platform>("/api/day/online", {
        method: old === "" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(old === "" ? platform : { ...platform, old: old }),
    });
}
