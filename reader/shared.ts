/**
 * ## Shared
 *
 * Shares with Vu, whose dashboard runs on skriptum, an entry of my log with Vu in `With`.
 * Every other file we share Unison keeps the same on both our servers.
 *
 * My reader hands the entry by SSH to Vu's reader,
 * by the SSH host `nom-` and the name in small letters.
 * There it starts `curl`,
 * which gives the entry to `/api/shared/entry` of Vu's reader.
 * Vu's reader hands its entries to mine the same way.
 * No file holds an entry on the way.
 * While the other cannot be reached, my reader tries again every {@link retrySeconds}.
 * What waits lies only in its memory, so a restart loses it, told in the log.
 * What the other's reader refuses goes nowhere, told.
 *
 * An entry goes as a copy to each of us in its `With` as I add it or log a box,
 * and to one who comes into its `With` as I change it, with me in place of the person.
 * Not my note, rounds, chapters, links to my files, pain, what a sport session did, nor its box.
 * After that each copy is its owner's.
 * A copy for an entry the other has already by its `UID` goes untaken,
 * so nothing remembers who had what.
 * A change goes only when I say so as I save it, then to each of us in its `With`,
 * and replaces what the other's entry of the same `UID` shares, its note staying.
 * An entry I took in goes to nobody while its `With` stays, since its sender sent it to all in it.
 * Its place goes as its line and link, a room of mine marked, since our rooms are each our own.
 *
 * What comes is taken in the order it was sent, so a meal finds its cooking.
 * An entry keeps the `UID` it brought, so it comes in only once.
 * A room of it I have no place or room of its name for comes into my `Rooms.md`.
 */

import { spawn } from "node:child_process";
import { entryIcsOf, entryLookup, skillName, textEntriesRead } from "./calendar.ts";
import { entryAdd, entryEdit } from "./day.ts";
import { labelOf, linkForm, placeAdd, placesRead, roomsRead } from "./places.ts";
import { personNameOf } from "./persons.ts";
import { day, myName, partners } from "./sources.ts";

import type { ChildProcess } from "node:child_process";
import type { Attendee, Entry, EntryFields } from "./calendar.ts";
import type { EntryNew } from "./day.ts";
import type { Place } from "./places.ts";

/** A name of a person, as the SSH hosts are named. */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/** Seconds `ssh` tries to reach the other's server. */
const reachSeconds: number = 10;

/** Seconds between two tries while the other cannot be reached. */
const retrySeconds: number = 60;

/** What `ssh` starts on the other's server, `curl` giving the entry to the other's reader. */
const handCommand: string = "curl -fsS --data-binary @- http://127.0.0.1:3000/api/shared/entry";

/** Exit code of `curl -f` when the other's reader refused the entry. */
const refusedCode: number = 22;

/** Copies of entries for a person not handed over yet, the earliest first, only in memory. */
const waiting: [string, string][] = [];

let sending: boolean = false;

/** Whether my reader sends again after it is through, since something came to wait. */
let again: boolean = false;

/** Whether the other's server could not be reached, told once until it can again. */
let unreached: boolean = false;

/** The people I share with, in {@link nameForm}, so the dialog knows whom it may ask about. */
export function partnersRead(): string[] {
    return partners.filter((partner: string): boolean => nameForm.test(partner));
}

/** Tells whether I have a name and someone to share with. */
function sharingIs(): boolean {
    return nameForm.test(myName) && partnersRead().length > 0;
}

/** Tells whether two names of `With` name the same person, each as `Persons.md` names it. */
function sameName(first: string, second: string): boolean {
    return personNameOf(first).toLowerCase() === personNameOf(second).toLowerCase();
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

/**
 * Hands an entry by `ssh` to the reader of a person, never asking for a password.
 * Gives the exit code, `0` when it took the entry, {@link refusedCode} when it refused it.
 */
function sshSend(partner: string, text: string): Promise<number | null> {
    return new Promise((resolve: (code: number | null) => void): void => {
        const child: ChildProcess = spawn(
            "ssh",
            [
                "-o",
                "BatchMode=yes",
                "-o",
                `ConnectTimeout=${reachSeconds}`,
                `nom-${partner.toLowerCase()}`,
                handCommand,
            ],
            { stdio: ["pipe", "ignore", "pipe"] },
        );
        let told: string = "";
        child.stderr?.on("data", (chunk: Buffer): void => {
            told += chunk.toString();
        });
        child.stdin?.on("error", (): void => undefined);
        child.on("error", (error: Error): void => {
            told += error.message;
        });
        child.on("close", (code: number | null): void => {
            if (code !== 0 && code !== refusedCode && !unreached)
                console.error(new Date().toISOString(), `${partner} not reached, entries wait:`, told.trim());
            if (code === refusedCode) console.error(new Date().toISOString(), `${partner} refused an entry`);
            if (code === 0 && unreached) console.log(new Date().toISOString(), `${partner} reached again`);
            unreached = code !== 0 && code !== refusedCode;
            resolve(code);
        });
        child.stdin?.end(text);
    });
}

/**
 * Hands over what waits, the earliest first, stopping while the other cannot be reached.
 * Runs once at a time, called while it runs it runs again after.
 */
function waitingSend(): void {
    if (sending) {
        again = true;
        return;
    }
    sending = true;
    const run: () => Promise<void> = async (): Promise<void> => {
        do {
            again = false;
            while (waiting.length > 0) {
                const [partner, text]: [string, string] = waiting[0];
                const code: number | null = await sshSend(partner, text);
                if (code !== 0 && code !== refusedCode) return;
                waiting.shift();
            }
        } while (again);
    };
    run()
        .catch((error: unknown): void => {
            console.error(new Date().toISOString(), "Nothing handed over", error);
        })
        .finally((): void => {
            sending = false;
        });
}

/**
 * Hands the copy of an entry to one of us, with me in `With` in place of the person.
 *
 * @param changed - Whether it is a change of an entry shared before
 */
function copySend(entry: Entry, partner: string, changed: boolean): void {
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
    if (changed) own.push(["x-changed", "TRUE"]);
    waiting.push([partner, entryIcsOf(fields, own, entry.id)]);
    waitingSend();
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
                    partnersRead().find((partner: string): boolean => sameName(partner, attendee.name)),
                )
                .filter((partner: string | undefined): partner is string => partner !== undefined),
        );
        to.forEach((partner: string): void => copySend(found[1], partner, false));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No copy of ${id}`, error);
    }
}

/**
 * Sends a change of an entry to each of us in its `With`, as I said so while saving it.
 * A copy that fails is told, never failing what I saved.
 */
export function changeShare(id: string): void {
    if (!sharingIs()) return;
    try {
        const found: [string, Entry] | undefined = entryLookup(day.log, id);
        if (found === undefined || found[1].allDay) return;
        partnersRead()
            .filter((partner: string): boolean =>
                found[1].attendees.some((attendee: Attendee): boolean => sameName(partner, attendee.name)),
            )
            .forEach((partner: string): void => copySend(found[1], partner, true));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No change of ${id}`, error);
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
 * Takes in an entry the other's reader handed over, giving whether my log took it.
 * An entry the log has by its `UID` goes untaken, but a change replaces what it shares, my note staying.
 * One the log cannot take is told.
 */
export function entryTake(text: string): boolean {
    try {
        textEntriesRead(text, "shared").forEach((entry: Entry): void => {
            const mine: Entry | undefined = entryLookup(day.log, entry.id)?.[1];
            if (mine === undefined) entryAdd(entryNewOf(entry), entry.id);
            else if (entry.changed)
                entryEdit({ ...entryNewOf(entry), note: mine.note, id: mine.id, version: mine.version });
            else return;
            roomTake(entry);
        });
        return true;
    } catch (error: unknown) {
        console.error(new Date().toISOString(), "My log cannot take a shared entry", error);
        return false;
    }
}

/**
 * Starts sharing as the reader starts,
 * trying again every {@link retrySeconds} while entries wait.
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
    setInterval((): void => {
        if (waiting.length > 0) waitingSend();
    }, retrySeconds * 1000);
}
