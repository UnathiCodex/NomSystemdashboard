/**
 * ## Places
 *
 * The parts of a place, typed below it in a dialog, since the fields offer only my places of `Places.md`.
 * The address has four parts, the columns of `Places.md`, as on an envelope in German.
 * Its link follows the address as the search of Google Maps until I type a link myself.
 * A place typed that is none of mine yet goes into `Places.md` at once.
 * The parts of a place picked change it everywhere once the dialog saves.
 * An entry writes a place in one line with its address and shows it by its name.
 * Nothing opens a map by itself, only a link stored with the place opens on a click.
 * A place is only where I physically am, an entry done online shows its platform instead.
 */

import { ArrowRight, Star } from "lucide";
import { iconOf, iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { partFieldOf, partOf } from "./choices.ts";

import type { Choice } from "./choices.ts";
import type { Place, Platform } from "../../reader/places.ts";

/** A link of a place as the reader takes it, a web address without spaces. */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/** The address of a place in one line, its parts parted by commas, an empty part left out. */
export function placeAddressOf(place: Place): string {
    return [place.street, place.code, place.city, place.country]
        .filter((part: string): boolean => part !== "")
        .join(", ");
}

/** A place as an entry writes it into `LOCATION`, as Google Calendar does, name and address in one line. */
export function lineOf(place: Place): string {
    return placeAddressOf(place) === "" ? place.name : `${place.name}, ${placeAddressOf(place)}`;
}

/** The name of the place of a line, the part before its first comma. */
export function labelOf(line: string): string {
    return line.split(",")[0].trim();
}

/** The address of a place as an entry writes it, the part after its name. */
export function addressOf(line: string): string {
    return line.includes(",") ? line.slice(line.indexOf(",") + 1).trim() : "";
}

/**
 * The line of my place or room a line names, the line itself for none.
 * So two places of one name stay apart by their address.
 * An older line names it with its code and town in one part.
 * A line of the name alone names it while one place has that name.
 */
export function mineLineOf(line: string, rows: { [line: string]: Place }): string {
    if (rows[line] !== undefined) return line;
    const named: Place[] = Object.values(rows).filter((place: Place): boolean => place.name === labelOf(line));
    const older: (place: Place) => string = (place: Place): string =>
        [place.name, place.street, `${place.code} ${place.city}`.trim(), place.country]
            .filter((part: string): boolean => part !== "")
            .join(", ");
    const row: Place | undefined =
        named.find((place: Place): boolean => older(place) === line) ??
        (line === labelOf(line) && named.length === 1 ? named[0] : undefined);
    return row === undefined ? line : lineOf(row);
}

/**
 * A place as the row the line names holds it.
 * One without row is read from its line.
 * An older line holds code and town in one part, parted at its first space.
 */
export function placeOf(line: string, link: string, rows: { [line: string]: Place }): Place {
    const name: string = labelOf(line);
    const row: Place | undefined = rows[mineLineOf(line, rows)];
    if (row !== undefined) return row;
    const parts: string[] = addressOf(line)
        .split(",")
        .map((part: string): string => part.trim())
        .filter((part: string): boolean => part !== "");
    const town: number = parts.length < 4 ? parts.findIndex((part: string): boolean => /^\d+ \S/.test(part)) : -1;
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
 * The parts of a place to change it below it in a dialog, the columns of its row, its star beside its label.
 * Below them a grey line while the reader would not take them.
 * Each change goes to the dialog as typed.
 * Leaving a changed part gives the name of the part I went on to, so the dialog keeps the cursor there.
 */
export function placeEditOf(
    place: Place,
    change: (typed: Place) => void,
    leave: (next: string | null) => void,
): HTMLElement[] {
    const name: HTMLInputElement = partFieldOf("text", place.name, "Name of the place");
    const street: HTMLInputElement = partFieldOf("text", place.street, "Street of the place");
    const code: HTMLInputElement = partFieldOf("text", place.code, "Code of the place");
    const city: HTMLInputElement = partFieldOf("text", place.city, "City of the place");
    const country: HTMLInputElement = partFieldOf("text", place.country, "Country of the place");
    const link: HTMLInputElement = partFieldOf("url", place.link, "Link of the place");
    let follows: boolean = link.value === "" || mapsLinkIs(link.value, placeAddressOf(place));
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
        hint.hidden = typed().name !== "" && (typed().link === "" || linkForm.test(typed().link));
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
            leave(event.relatedTarget instanceof HTMLElement ? event.relatedTarget.getAttribute("aria-label") : null);
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
 * The star of a place, filled while it is my default place, which a new entry starts with.
 * A click sends it at once, apart from the other parts, which wait for the dialog to save.
 */
function standardStarOf(place: Place): HTMLButtonElement {
    const star: HTMLButtonElement = document.createElement("button");
    star.type = "button";
    star.className = "place-star";
    iconPut(star, Star, "Default place");
    star.setAttribute("aria-pressed", String(place.standard));
    star.addEventListener("click", (): void => {
        const standard: boolean = star.getAttribute("aria-pressed") !== "true";
        standardSend(standard ? lineOf(place) : "")
            .then((): void => star.setAttribute("aria-pressed", String(standard)))
            .catch((error: unknown): void => console.error(error));
    });
    return star;
}

/** The choice of a place in a list, my default place starred, its address grey beside it. */
export function placeChoiceOf(line: string, name: string, places: { [line: string]: Place }): Choice {
    const standard: Place | undefined = Object.values(places).find((place: Place): boolean => place.standard);
    return {
        value: line,
        text: name,
        group: "",
        detail: addressOf(line),
        starred: standard !== undefined && mineLineOf(line, places) === lineOf(standard),
    };
}

/** Puts my default place first among the places of a list, an older line of it left out. */
export function standardFirst(lines: string[], places: { [line: string]: Place }): string[] {
    const standard: Place | undefined = Object.values(places).find((place: Place): boolean => place.standard);
    if (standard === undefined) return lines;
    return [
        lineOf(standard),
        ...lines.filter((line: string): boolean => mineLineOf(line, places) !== lineOf(standard)),
    ];
}

/** Category of ways, whose place shows as the route. */
export const wayName: string = "Way";

/**
 * Where an entry or a box was, by labels alone, as text.
 * A way shows its route from its `X-FROM` to its `LOCATION`, an entry done online its platform.
 */
export function whereOf(category: string, from: string, location: string, online: string): string {
    const start: string = labelOf(from);
    const goal: string = labelOf(location);
    if (online !== "") return online;
    if (category !== wayName || (start === "" && goal === "")) return goal;
    return `${start} -> ${goal}`.trim();
}

/** The link of a place, its `ALTREP`, in a new tab, its click not reaching the entry it stands in. */
function placeAnchorOf(label: string, link: string): HTMLAnchorElement {
    const anchor: HTMLAnchorElement = document.createElement("a");
    anchor.className = "place-link";
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = label;
    anchor.addEventListener("click", (event: MouseEvent): void => event.stopPropagation());
    return anchor;
}

/** The arrow of a route, an icon, not a character, so it stands in the middle of the line. */
function routeArrowOf(): SVGElement {
    const arrow: SVGElement = iconOf(ArrowRight);
    arrow.classList.add("route-arrow");
    return arrow;
}

/** Shows where an entry or a box was with the arrow drawn, its place or platform a link when it has one. */
export function whereLinkedOf(
    category: string,
    from: string,
    location: string,
    link: string,
    online: string,
    onlineLink: string,
): (string | Node)[] {
    if (online !== "") return [onlineLink === "" ? online : placeAnchorOf(online, onlineLink)];
    const start: string = labelOf(from);
    const goal: string = labelOf(location);
    const place: (string | Node)[] = goal === "" ? [] : [link === "" ? goal : placeAnchorOf(goal, link)];
    if (category !== wayName || (start === "" && goal === "")) return place;
    return [start, routeArrowOf(), ...place];
}

/** The link of the search of an address in Google Maps, in the form Google gives. */
export function mapsLinkOf(address: string): string {
    return address.trim() === ""
        ? ""
        : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address.trim());
}

/**
 * Whether a link is the search of an address in Google Maps, also in an older form.
 * The older form has its spaces as `+` and no comma between code and town.
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
 * Sends a new place.
 * My place changed goes with its old line, whose row it changes.
 *
 * @throws {Error} - When the reader does not take it, like for a line another place has
 */
export async function placeSend(place: Place, old: string): Promise<Place> {
    return readerAsk<Place>("/api/day/places", {
        method: old === "" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(old === "" ? place : { ...place, old: old }),
    });
}

/**
 * Sends a place changed by its parts with its old line, which the reader changes everywhere.
 * With `dry` it only checks, so a dialog saves nothing it refuses.
 *
 * @throws {Error} - When the reader does not take it, like for an empty name
 */
export async function renameSend(old: string, place: Place, dry: boolean): Promise<void> {
    await readerAsk<null>("/api/day/renamed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...place, old: old, dry: dry }),
    });
}

/**
 * Sends the line of my default place.
 * The reader marks it by `★` and no other.
 *
 * @throws {Error} - When the reader does not take it, like for a line no place has
 */
async function standardSend(line: string): Promise<void> {
    await readerAsk<null>("/api/day/standard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line }),
    });
}

/**
 * Sends a new platform of `Online.md`, or my platform with its old name, whose row it changes.
 *
 * @throws {Error} - When the reader does not take it, like for a name another platform has
 */
export async function platformSend(platform: Platform, old: string): Promise<Platform> {
    return readerAsk<Platform>("/api/day/online", {
        method: old === "" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(old === "" ? platform : { ...platform, old: old }),
    });
}
