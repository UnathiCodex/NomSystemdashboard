/**
 * ## Shared
 *
 * Shares with Vu, whose dashboard runs on skriptum, an entry of my log with Vu in `With`.
 * Every file we share Unison keeps the same on both our servers,
 * our foods, meals, places, platforms among them.
 * Our boxes in `NomKommunikation` it keeps the same as well,
 * `to_vu/` for Vu and `to_sopha/` for me.
 *
 * What goes to Vu my reader writes as a file into `dashboard/` of Vu's box,
 * named by the moment, the sender, the kind.
 * Unison brings it to Vu's server.
 * There Vu's reader takes it in at once and puts it into the trash,
 * so Unison takes it away on my server as well.
 * What Vu shares comes the same way into my box.
 * No reader ever reaches the other's server.
 * There is no archive.
 *
 * An entry goes as a copy to each of us in its `With` as I add it or log a box,
 * and to one who comes into its `With` as I change it, with me in place of the person.
 * Not my note, rounds, chapters, links to my files, pain, what a sport session did, nor its box.
 * After that each copy is its owner's, a change goes to nobody,
 * and a copy for an entry the other has already by its `UID` goes untaken to the trash,
 * so nothing remembers who had what.
 * An entry I took in goes to nobody while its `With` stays, since its sender sent it to all in it.
 * Its place goes as its line and link, a room of mine marked, since our rooms are each our own.
 *
 * What comes is taken the earliest first, so a meal finds its cooking.
 * An entry keeps the `UID` it brought, so it comes in only once.
 * A room of it I have no place or room of its name for comes into my `Rooms.md`.
 * An entry a log cannot take stays in its box, told once.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entryIcsOf, entryLookup, skillName, textEntriesRead } from "./calendar.ts";
import { entryAdd } from "./day.ts";
import { labelOf, linkForm, placeAdd, placesRead, roomsRead } from "./places.ts";
import { personNameOf } from "./persons.ts";
import { dashboardBoxOf, day, myName, partners, writeAllowed } from "./sources.ts";
import { trashPut } from "./trash.ts";

import type { Attendee, Entry, EntryFields } from "./calendar.ts";
import type { EntryNew } from "./day.ts";
import type { Place } from "./places.ts";

/** A name of a person, as the boxes are named. */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/** Milliseconds of a quiet box before the reader takes from it, so a file and its rename are one. */
const quiet: number = 300;

/** Milliseconds of the last name, so each name comes later and the other takes them in order. */
let lastStamp: number = 0;

/** Names of shared files a log could not take, each told once. */
const failed: Set<string> = new Set();

/** The people I share with, in {@link nameForm}. */
function partnersOf(): string[] {
    return partners.filter((partner: string): boolean => nameForm.test(partner));
}

/** Tells whether I have a name and someone to share with. */
function sharingIs(): boolean {
    return nameForm.test(myName) && partnersOf().length > 0;
}

/** The moment a shared thing is named after, later than the one before. */
function stampOf(): string {
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    return new Date(lastStamp).toISOString().replace(/[-:.]/g, "");
}

/** Key of an entry in the name of a shared file, from its `UID`. */
function keyOf(id: string): string {
    return id.replace(/[^\w.@-]/g, "_");
}

/** Tells whether two names of `With` name the same person, each as `Persons.md` names it. */
function sameName(first: string, second: string): boolean {
    return personNameOf(first).toLowerCase() === personNameOf(second).toLowerCase();
}

/**
 * Lists the shared entries of a box, sorted,
 * without hidden ones or half written ones.
 */
function boxFilesOf(box: string): string[] {
    if (!existsSync(box)) return [];
    return readdirSync(box)
        .filter((name: string): boolean => !name.startsWith(".") && name.endsWith(".ics"))
        .sort();
}

/** Tells whether I have a place or room of a name, ignoring case. */
function placeHas(name: string): boolean {
    return [...placesRead(), ...roomsRead()].some(
        (mine: Place): boolean => mine.name.toLowerCase() === name.toLowerCase(),
    );
}

/** My address in an entry I send, the standard one of a name, `@invalid` the ending for addresses that never work. */
function addressOf(name: string): string {
    const local: string = name
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
    return `${local}@invalid`;
}

/** Shares a file with a person, writing it into their box, which Unison brings to their server. */
function boxWrite(partner: string, name: string, content: string): void {
    const file: string = join(dashboardBoxOf(partner), name);
    if (!writeAllowed(file)) throw new Error(`No writing outside the boxes: ${file}`);
    mkdirSync(dashboardBoxOf(partner), { recursive: true });
    writeFileSync(file, content);
}

/** Shares the copy of an entry with one of us, with me in `With` in place of the person. */
function copyWrite(entry: Entry, partner: string): void {
    const fields: EntryFields = {
        category: entry.category,
        title: entry.title,
        titleLink: entry.category === skillName || linkForm.test(entry.titleLink) ? entry.titleLink : "",
        location: entry.location,
        locationLink: entry.locationLink,
        online: entry.online,
        onlineLink: entry.onlineLink,
        onlineChannel: entry.onlineChannel,
        onlineTitle: entry.onlineTitle,
        from: entry.from,
        attendees: [
            { name: myName, address: addressOf(myName) },
            ...entry.attendees.filter(
                (attendee: Attendee): boolean => !sameName(attendee.name, partner) && !sameName(attendee.name, myName),
            ),
        ],
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
    const own: [string, string][] = entry.foods.map((food: string): [string, string] => ["x-food", food]);
    if (entry.cooked !== "") own.push(["x-cooked", entry.cooked]);
    const place: string = labelOf(entry.location).toLowerCase();
    if (roomsRead().some((room: Place): boolean => room.name.toLowerCase() === place)) own.push(["x-room", "TRUE"]);
    boxWrite(partner, `${stampOf()}_${myName}_entry_${keyOf(entry.id)}.ics`, entryIcsOf(fields, own, entry.id));
}

/** Who an entry is with now, so a change can tell who comes into its `With`. */
export function attendeesRead(id: string): Attendee[] {
    return entryLookup(day.log, id)?.[1].attendees ?? [];
}

/**
 * Sends an entry to each of us in its `With` who was not in it before, never for a whole day.
 * A copy that fails is told, never failing what I saved.
 */
export function entryShare(id: string, before: Attendee[] = []): void {
    if (!sharingIs()) return;
    try {
        const found: [string, Entry] | undefined = entryLookup(day.log, id);
        if (found === undefined || found[1].allDay) return;
        const to: Set<string> = new Set(
            found[1].attendees
                .filter(
                    (attendee: Attendee): boolean =>
                        !before.some((old: Attendee): boolean => sameName(old.name, attendee.name)),
                )
                .map((attendee: Attendee): string | undefined =>
                    partnersOf().find((partner: string): boolean => sameName(partner, attendee.name)),
                )
                .filter((partner: string | undefined): partner is string => partner !== undefined),
        );
        to.forEach((partner: string): void => copyWrite(found[1], partner));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No copy of ${id}`, error);
    }
}

/**
 * Adds the room of an entry that came into my `Rooms.md` while I have no place or room of its name.
 * Name and link come from the entry,
 * the address only when its line has every part.
 * A room that cannot be added is told, never failing the entry.
 */
function roomTake(entry: Entry): void {
    const parts: string[] = entry.location.split(",").map((part: string): string => part.trim());
    if (!entry.room || parts[0] === "" || placeHas(parts[0])) return;
    const [street, code, city, country]: string[] = parts.length === 5 ? parts.slice(1) : ["", "", "", ""];
    try {
        placeAdd({ name: parts[0], street, code, city, country, link: entry.locationLink, standard: false }, true);
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No room ${parts[0]}`, error);
    }
}

/**
 * Turns an entry that came into a new entry of my log, a skill entry linking anew to its folder.
 * It keeps the cooking a meal draws from only when that is an entry `Cook` of my log before the meal.
 */
function entryNewOf(entry: Entry): EntryNew {
    const cooking: Entry | undefined = entry.cooked === "" ? undefined : entryLookup(day.log, entry.cooked)?.[1];
    return {
        category: entry.category,
        title: entry.title,
        location: entry.location,
        online: entry.online,
        onlineLink: entry.onlineLink,
        onlineChannel: entry.onlineChannel,
        onlineTitle: entry.onlineTitle,
        from: entry.from,
        attendees: entry.attendees,
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
        foods: entry.foods,
        planned: "",
        cooked:
            cooking !== undefined && cooking.category === "Cook" && Date.parse(cooking.start) < Date.parse(entry.start)
                ? entry.cooked
                : "",
        start: entry.start,
        end: entry.end,
    };
}

/**
 * Takes one shared entry that came,
 * giving whether it is done with, so it goes into my trash.
 * An entry the log has by its `UID` goes untaken.
 * An entry the log cannot take stays, told once.
 */
function thingTake(name: string, text: string): boolean {
    try {
        textEntriesRead(text, name)
            .filter((entry: Entry): boolean => entryLookup(day.log, entry.id) === undefined)
            .forEach((entry: Entry): void => {
                entryAdd(entryNewOf(entry), entry.id);
                roomTake(entry);
            });
        return true;
    } catch (error: unknown) {
        if (!failed.has(name)) console.error(new Date().toISOString(), `My log cannot take ${name}`, error);
        failed.add(name);
        return false;
    }
}

/** Takes what waits in my box, the earliest first, each into my trash after. */
function inboxTake(): void {
    const box: string = dashboardBoxOf(myName);
    boxFilesOf(box).forEach((name: string): void => {
        const file: string = join(box, name);
        if (thingTake(name, readFileSync(file, "utf8"))) trashPut(file);
    });
}

/**
 * Starts sharing as the reader starts,
 * making the boxes and watching mine.
 */
export function sharedStart(): void {
    if (!sharingIs()) {
        if (myName !== "" || partners.length > 0)
            console.error(
                new Date().toISOString(),
                `Sharing nothing: no name or no one to share with in the form ${
                    nameForm
                }: ${myName}, ${partners.join(", ")}`,
            );
        return;
    }
    const box: string = dashboardBoxOf(myName);
    mkdirSync(box, { recursive: true });
    partnersOf().forEach((partner: string): void => {
        mkdirSync(dashboardBoxOf(partner), { recursive: true });
    });
    inboxTake();
    let waiting: NodeJS.Timeout | undefined = undefined;
    watch(box, (): void => {
        clearTimeout(waiting);
        waiting = setTimeout(inboxTake, quiet);
    });
}
