/**
 * ## Shared
 *
 * Shares what I log or plan with Vu in `With` with Vu, whose dashboard runs on skriptum.
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
 * An entry goes as a copy to each of us in its `With` as I add it or say so as I log a box,
 * and to one who comes into its `With` as I change it, with me in place of the person.
 * A box that happens once goes the same way into the other's plan, a day of a series not.
 * It goes to `/api/shared/box`, which a reader without that path refuses, so it never logs a box.
 * Not my note, rounds, chapters, links to my files, pain, what a sport session did, my pushes.
 * An entry names the box it was logged from, so the other's copy of that box is done with it.
 * After that each copy is its owner's.
 * A copy for an entry the other has already by its `UID` goes untaken,
 * so nothing remembers who had what.
 * A change goes only when I say so as I save it, then to each of us in its `With`,
 * and replaces what the other's entry of the same `UID` shares, its note staying.
 * A removal goes the same way as I remove an entry, its `UID` alone to `/api/shared/removal`,
 * which removes the other's entry of that `UID` while one of us stands in its `With`.
 * A reader without that path refuses it, so it never takes the removal for a new entry.
 * An entry I took in goes to nobody while its `With` stays, since its sender sent it to all in it.
 * Its place goes as its line and link, a room of mine marked, since our rooms are each our own.
 *
 * What comes is taken in the order it was sent, so a meal finds its cooking.
 * An entry keeps the `UID` it brought, so it comes in only once.
 * Each of us in its `With` comes in as my `Persons.md` names them.
 * A room of it I have no place or room of its name for comes into my `Rooms.md`.
 */

import { spawn } from "node:child_process";
import { boxAdd, boxDelete, boxEdit, boxFind, groupIs, todoTimesOf } from "./boxes.ts";
import { entryIcsOf, entryLookup, invalidAddressOf, skillName, textEntriesRead, todoIcsOf } from "./calendar.ts";
import { entryAdd, entryDelete, entryEdit } from "./day.ts";
import { labelOf, linkForm, placeAdd, placesRead, roomsRead } from "./places.ts";
import { personNameOf } from "./persons.ts";
import { day, myName, partners } from "./sources.ts";

import type { ChildProcess } from "node:child_process";
import type { BoxNew } from "./boxes.ts";
import type { Attendee, Entry, EntryTexts, TodoFields } from "./calendar.ts";
import type { EntryNew } from "./day.ts";
import type { Place } from "./places.ts";

/** A name of a person, as the SSH hosts are named. */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/** Seconds `ssh` tries to reach the other's server. */
const reachSeconds: number = 10;

/** Seconds between two tries while the other cannot be reached. */
const retrySeconds: number = 60;

/** A copy I hand to the other's reader, named as the path under `/api/shared/` that takes it. */
type Copied = "entry" | "box";

/** What I hand to the other's reader, named as the path under `/api/shared/` that takes it. */
type Handed = Copied | "removal";

/** What `ssh` starts on the other's server, `curl` giving what I hand to the other's reader. */
function handCommandOf(handed: Handed): string {
    return `curl -fsS --data-binary @- http://127.0.0.1:3000/api/shared/${handed}`;
}

/** Exit code of `curl -f` when the other's reader refused what I handed. */
const refusedCode: number = 22;

/** Copies and removals of entries for a person not handed over yet, the earliest first, only in memory. */
const waiting: [string, Handed, string][] = [];

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

/**
 * Hands an entry or its removal by `ssh` to the reader of a person, never asking for a password.
 * Gives the exit code, `0` when it took it, {@link refusedCode} when it refused it.
 */
function sshSend(partner: string, handed: Handed, text: string): Promise<number | null> {
    return new Promise((resolve: (code: number | null) => void): void => {
        const child: ChildProcess = spawn(
            "ssh",
            [
                "-o",
                "BatchMode=yes",
                "-o",
                `ConnectTimeout=${reachSeconds}`,
                `nom-${partner.toLowerCase()}`,
                handCommandOf(handed),
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
            if (code === refusedCode) console.error(new Date().toISOString(), `${partner} refused a shared ${handed}`);
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
                const [partner, handed, text]: [string, Handed, string] = waiting[0];
                const code: number | null = await sshSend(partner, handed, text);
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
 * Hands the copy of an entry or a box to one of us, with me in `With` in place of the person.
 *
 * @param changed - Whether it is a change of one shared before
 */
function copySend(entry: Entry, partner: string, changed: boolean): void {
    const texts: EntryTexts = {
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
            { name: myName, address: invalidAddressOf(myName) },
            ...entry.attendees.filter(
                (attendee: Attendee): boolean => !sameName(attendee.name, partner) && !sameName(attendee.name, myName),
            ),
        ],
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
    };
    const own: [string, string][] = entry.foods.map((food: string): [string, string] => ["x-food", food]);
    if (entry.cooked !== "") own.push(["x-cooked", entry.cooked]);
    if (entry.planned !== "") own.push(["related-to", entry.planned]);
    const place: string = labelOf(entry.location).toLowerCase();
    if (roomsRead().some((room: Place): boolean => room.name.toLowerCase() === place)) own.push(["x-room", "TRUE"]);
    if (changed) own.push(["x-changed", "TRUE"]);
    const text: string = entry.todo
        ? todoIcsOf({ ...texts, ...todoTimesOf(entry) }, own, entry.id)
        : entryIcsOf({ ...texts, start: new Date(entry.start), end: new Date(entry.end) }, own, entry.id);
    waiting.push([partner, entry.todo ? "box" : "entry", text]);
    waitingSend();
}

/**
 * An entry of my log with times or a box of my plan that happens once, by its `UID`.
 * Only those I share.
 */
function sharedFind(id: string): Entry | undefined {
    const logged: Entry | undefined = entryLookup(day.log, id)?.[1];
    if (logged !== undefined) return logged.allDay ? undefined : logged;
    const planned: Entry | undefined = entryLookup(day.plan, id)?.[1];
    return planned?.todo === true && !groupIs(planned) ? planned : undefined;
}

/** Who an entry or a box is with now, so a change can tell who comes into its `With`. */
export function attendeesRead(id: string): Attendee[] {
    return sharedFind(id)?.attendees ?? [];
}

/**
 * Sends an entry or a box to each of us in its `With` who was not in it before.
 * A copy that fails is told, never failing what I saved.
 */
export function entryShare(id: string, before: Attendee[] = []): void {
    if (!sharingIs()) return;
    try {
        const found: Entry | undefined = sharedFind(id);
        if (found === undefined) return;
        const to: Set<string> = new Set(
            found.attendees
                .filter(
                    (attendee: Attendee): boolean =>
                        !before.some((old: Attendee): boolean => sameName(old.name, attendee.name)),
                )
                .map((attendee: Attendee): string | undefined =>
                    partnersRead().find((partner: string): boolean => sameName(partner, attendee.name)),
                )
                .filter((partner: string | undefined): partner is string => partner !== undefined),
        );
        to.forEach((partner: string): void => copySend(found, partner, false));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No copy of ${id}`, error);
    }
}

/** The people I share with in the `With` of an entry. */
function partnersIn(entry: Entry): string[] {
    return partnersRead().filter((partner: string): boolean =>
        entry.attendees.some((attendee: Attendee): boolean => sameName(partner, attendee.name)),
    );
}

/**
 * Sends a change of an entry or a box to each of us in its `With`, as I said so while saving it.
 * A copy that fails is told, never failing what I saved.
 */
export function changeShare(id: string): void {
    if (!sharingIs()) return;
    try {
        const found: Entry | undefined = sharedFind(id);
        if (found === undefined) return;
        partnersIn(found).forEach((partner: string): void => copySend(found, partner, true));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No change of ${id}`, error);
    }
}

/**
 * Sends the removal of an entry or a box to each of us in its `With`, as I said so while removing it.
 * Called before my reader removes it, since only then it knows its `With`.
 * A removal that fails is told, never failing mine.
 */
export function removeShare(id: string): void {
    if (!sharingIs()) return;
    try {
        const found: Entry | undefined = sharedFind(id);
        if (found === undefined) return;
        partnersIn(found).forEach((partner: string): void => {
            waiting.push([partner, "removal", found.id]);
        });
        waitingSend();
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No removal of ${id}`, error);
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

/** Each of us in the `With` of what came, named as my `Persons.md` names them, with the address of that name. */
function attendeesNamedOf(entry: Entry): Attendee[] {
    return entry.attendees.map((attendee: Attendee): Attendee => {
        const name: string = personNameOf(attendee.name);
        return partnersRead().some((partner: string): boolean => sameName(partner, name))
            ? { name: name, address: invalidAddressOf(name) }
            : attendee;
    });
}

/** The box an entry that came was logged from, while mine of it is open, so it is done with the entry. */
function plannedOf(entry: Entry): string {
    if (entry.planned === "" || entryLookup(day.plan, entry.planned) === undefined) return "";
    return boxFind(entry.planned)[2].state === "open" ? entry.planned : "";
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
        attendees: attendeesNamedOf(entry),
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
        foods: entry.foods,
        planned: plannedOf(entry),
        cooked:
            cooking !== undefined && cooking.category === "Cook" && Date.parse(cooking.start) < Date.parse(entry.start)
                ? entry.cooked
                : "",
        start: entry.start,
        end: entry.end,
    };
}

/** Turns a to-do that came into a new box of my plan, without the files of a skill box. */
function boxNewOf(entry: Entry): BoxNew {
    const times: Omit<TodoFields, keyof EntryTexts> = todoTimesOf(entry);
    return {
        category: entry.category,
        title: entry.title,
        location: entry.location,
        online: entry.online,
        onlineLink: entry.onlineLink,
        onlineChannel: entry.onlineChannel,
        onlineTitle: entry.onlineTitle,
        from: entry.from,
        attendees: attendeesNamedOf(entry),
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
        day: times.day,
        time: times.time?.toISOString() ?? "",
        minutes: times.minutes,
        deadline: times.deadline,
        chapters: [],
        documents: [],
    };
}

/**
 * Takes in the copy of an entry into my log or of a box into my plan, as the path it came by says.
 * Gives whether my log or plan took it.
 * One they have by its `UID` goes untaken, but a change replaces what it shares, my note staying.
 * One they cannot take is told.
 */
export function copyTake(text: string, copied: Copied): boolean {
    try {
        textEntriesRead(text, "shared").forEach((entry: Entry): void => {
            const box: boolean = copied === "box";
            const mine: Entry | undefined = entryLookup(box ? day.plan : day.log, entry.id)?.[1];
            if (mine === undefined && box) boxAdd(boxNewOf(entry), entry.id);
            else if (mine === undefined) entryAdd(entryNewOf(entry), entry.id);
            else if (!entry.changed) return;
            else if (box) boxEdit({ ...boxNewOf(entry), note: mine.note, id: mine.id });
            else entryEdit({ ...entryNewOf(entry), note: mine.note, id: mine.id, version: mine.version });
            roomTake(entry);
        });
        return true;
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `My log or plan cannot take a shared ${copied}`, error);
        return false;
    }
}

/**
 * Removes the entry or the box whose `UID` the other's reader handed over.
 * Gives whether my log or plan took it.
 * Only one with one of us in its `With`, so nothing else of mine can go.
 * One they have no more goes untaken, one they cannot remove is told, like a box done already.
 */
export function removalTake(text: string): boolean {
    try {
        const mine: Entry | undefined = sharedFind(text.trim());
        if (mine === undefined || partnersIn(mine).length === 0) return true;
        if (mine.todo) boxDelete(mine.id);
        else entryDelete(mine.id);
        return true;
    } catch (error: unknown) {
        console.error(new Date().toISOString(), "My log or plan cannot remove a shared entry", error);
        return false;
    }
}

/**
 * Starts sharing as the reader starts,
 * trying again every {@link retrySeconds} while copies or removals wait.
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
