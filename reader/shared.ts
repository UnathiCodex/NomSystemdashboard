/**
 * ## Shared
 *
 * Shares with Vu, whose dashboard runs on skriptum, only what we agreed on,
 * an entry of my log with Vu in `With` and every food, meal and place either of us changes.
 * All we share lies only in `NomKommunikation` on my server `sophabohne`, never on Vu's.
 *
 * My reader never reaches Vu's server.
 * What goes to Vu waits as a file in `NomKommunikation/to_vu/dashboard/`, named by the moment, me and what it is.
 * Vu's reader reaches mine by SSH, its key running nothing but the gate,
 * and every {@link pollSeconds} takes what waits, the earliest first, each into my trash once taken.
 * There is no archive.
 * What Vu's reader shares goes at once into my box, where my reader takes it in at once.
 * While my server cannot be reached it waits in the memory of Vu's reader, lost by a restart.
 *
 * An entry goes as a copy to each of us in its `With` as I add it or log a box,
 * and to one who comes into its `With` as I change it, with me in place of the person.
 * Not my note, rounds, chapters, links to my files, pain, what a sport session did, nor its box.
 * After that each copy is its owner's, a change goes to nobody,
 * and a copy for an entry the other has already by its `UID` goes untaken to the trash,
 * so nothing remembers who had what.
 * An entry I took in goes to nobody while its `With` stays, since its sender sent it to all in it.
 * A food, meal or place goes as the call that changed it, made again on the other's lists.
 * One Vu has already stays as Vu has it.
 * As my reader makes the box of someone, it sends all my lists, so our lists come together.
 * What I change in the editor by hand goes to nobody.
 *
 * What comes is taken the earliest first, so a meal finds its foods and its cooking.
 * An entry keeps the `UID` it brought, so it comes in only once.
 * An entry a log cannot take stays in its box, told once.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entryIcsOf, entryLookup, skillName, textEntriesRead } from "./calendar.ts";
import { entryAdd } from "./day.ts";
import {
    compositionsRead,
    dishAdd,
    dishRemove,
    dishRename,
    foodAdd,
    foodChange,
    foodRemove,
    foodsRead,
} from "./food.ts";
import {
    linkForm,
    placeAdd,
    placeChange,
    placesRead,
    platformAdd,
    platformChange,
    platformsRead,
    roomsRead,
} from "./places.ts";
import { personNameOf } from "./persons.ts";
import { dashboardBoxOf, day, holder, myName, partners, writeAllowed } from "./sources.ts";
import { trashPut } from "./trash.ts";

import type { ChildProcess } from "node:child_process";
import type { Attendee, Entry, EntryFields } from "./calendar.ts";
import type { EntryNew } from "./day.ts";
import type { Composition, Food, FoodChanged } from "./food.ts";
import type { Place, PlaceChanged, Platform, PlatformChanged } from "./places.ts";

/** A change of a list, as the call that changed it and what it was called with. */
export type ListChange =
    | { call: "foodAdd"; with: Food }
    | { call: "foodChange"; with: FoodChanged }
    | { call: "foodRemove"; with: { name: string; brand: string; store: string } }
    | {
          call: "mealAdd";
          with: {
              name?: string;
              foods?: string[];
              short?: string;
              grams?: (number | null)[];
          };
      }
    | { call: "mealRename"; with: { old?: string; name?: string } }
    | { call: "mealRemove"; with: string }
    | { call: "placeAdd"; with: Place }
    | { call: "placeChange"; with: PlaceChanged }
    | { call: "platformAdd"; with: Platform }
    | { call: "platformChange"; with: PlatformChanged };

/** A name of a person, as the boxes are named and the gate takes it. */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/** Milliseconds of a quiet box before the reader takes from it, so a file and its rename are one. */
const quiet: number = 300;

/** Seconds `ssh` tries to reach my server, then the thing waits. */
const reachSeconds: number = 10;

/** Seconds between two takings of Vu's reader. */
const pollSeconds: number = 60;

/** Milliseconds of the last name, so each name comes later and the other takes them in order. */
let lastStamp: number = 0;

/** What Vu's reader shares and my server has not taken yet, only in memory, the earliest first. */
const outbox: [string, string][] = [];

let sending: boolean = false;

/** Whether Vu's reader sends again after it is through, since something came. */
let again: boolean = false;

let taking: boolean = false;

/** Whether Vu's reader could not reach my server, told once until it reaches it again. */
let unreached: boolean = false;

/** Names of shared files a log could not take, each told once. */
const failed: Set<string> = new Set();

/** Tells whether I have a name and someone to share with. */
function sharingIs(): boolean {
    return nameForm.test(myName) && partnersOf().length > 0;
}

/** Tells whether this reader runs on my server, which holds our boxes. */
function holderIs(): boolean {
    return myName.toLowerCase() === holder.toLowerCase();
}

/** The people I share with in {@link nameForm}, on Vu's server only me, since Vu's reader shares only with mine. */
function partnersOf(): string[] {
    return partners.filter(
        (partner: string): boolean =>
            nameForm.test(partner) && (holderIs() || partner.toLowerCase() === holder.toLowerCase()),
    );
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

/** Lists the shared files of a box, without hidden and half written ones, sorted. */
function boxFilesOf(box: string): string[] {
    if (!existsSync(box)) return [];
    return readdirSync(box)
        .filter((name: string): boolean => !name.startsWith(".") && /\.(?:ics|json)$/.test(name))
        .sort();
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
 * Runs `ssh` from Vu's reader to my server, never asking for a password.
 * Tells once that my server cannot be reached, and once that it can again.
 * Gives what the gate gave, `undefined` when it did not do it.
 */
function sshRun(words: string[], input: string = ""): Promise<string | undefined> {
    return new Promise((resolve: (given: string | undefined) => void): void => {
        const child: ChildProcess = spawn(
            "ssh",
            ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${reachSeconds}`, `nom-${holder.toLowerCase()}`, ...words],
            { stdio: ["pipe", "pipe", "pipe"] },
        );
        const given: Buffer[] = [];
        let told: string = "";
        child.stdout?.on("data", (chunk: Buffer): void => {
            given.push(chunk);
        });
        child.stderr?.on("data", (chunk: Buffer): void => {
            told += chunk.toString();
        });
        child.stdin?.on("error", (): void => undefined);
        child.on("error", (error: Error): void => {
            told += error.message;
        });
        child.on("close", (code: number | null): void => {
            if (code !== 0 && !unreached)
                console.error(new Date().toISOString(), `${holder} not reached: ${words[0]}`, told.trim());
            if (code === 0 && unreached) console.log(new Date().toISOString(), `${holder} reached again`);
            unreached = code !== 0;
            resolve(code === 0 ? Buffer.concat(given).toString("utf8") : undefined);
        });
        child.stdin?.end(input);
    });
}

/**
 * Sends {@link outbox} to my server, stopping at the first it does not take.
 * Runs once at a time, called while it runs it runs again after.
 */
function outboxSend(): void {
    if (sending) {
        again = true;
        return;
    }
    sending = true;
    const run: () => Promise<void> = async (): Promise<void> => {
        do {
            again = false;
            while (outbox.length > 0) {
                const [name, content]: [string, string] = outbox[0];
                if ((await sshRun(["share", name], content)) === undefined) return;
                outbox.shift();
            }
        } while (again);
    };
    run()
        .catch((error: unknown): void => {
            console.error(new Date().toISOString(), `Nothing sent to ${holder}`, error);
        })
        .finally((): void => {
            sending = false;
        });
}

/** Shares a file with a person, on my server into their box, on Vu's into {@link outbox}. */
function outboxWrite(partner: string, name: string, content: string): void {
    if (!holderIs()) {
        outbox.push([name, content]);
        outboxSend();
        return;
    }
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
    outboxWrite(partner, `${stampOf()}_${myName}_entry_${keyOf(entry.id)}.ics`, entryIcsOf(fields, own, entry.id));
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

/** Sends a change of a list to everyone I share with, or to one, a failure told, never failing what I saved. */
export function listShare(change: ListChange, only?: string): void {
    if (!sharingIs()) return;
    try {
        (only === undefined ? partnersOf() : [only]).forEach((partner: string): void => {
            outboxWrite(partner, `${stampOf()}_${myName}_list_${randomUUID()}.json`, `${JSON.stringify(change)}\n`);
        });
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No change shared: ${change.call}`, error);
    }
}

/** Sends all my lists to a person, the foods before the meals, which name them. */
function listsShareAll(partner: string): void {
    foodsRead().forEach((food: Food): void => listShare({ call: "foodAdd", with: food }, partner));
    compositionsRead().forEach((meal: Composition): void =>
        listShare(
            {
                call: "mealAdd",
                with: {
                    name: meal.name,
                    foods: meal.foods,
                    short: meal.short,
                    grams: meal.standard,
                },
            },
            partner,
        ),
    );
    [...placesRead(), ...roomsRead()].forEach((place: Place): void =>
        listShare({ call: "placeAdd", with: place }, partner),
    );
    platformsRead().forEach((platform: Platform): void => listShare({ call: "platformAdd", with: platform }, partner));
}

/**
 * Makes a change of a list that came on my own lists, with the same call.
 *
 * @throws {Error} - When the call is unknown or refuses it, like a food I have already
 */
function listApply(change: ListChange): void {
    if (change.call === "foodAdd") foodAdd(change.with);
    else if (change.call === "foodChange") foodChange(change.with);
    else if (change.call === "foodRemove") foodRemove(change.with);
    else if (change.call === "mealAdd") dishAdd(change.with);
    else if (change.call === "mealRename") dishRename(change.with);
    else if (change.call === "mealRemove") dishRemove(String(change.with));
    else if (change.call === "placeAdd") placeAdd(change.with);
    else if (change.call === "placeChange") placeChange(change.with);
    else if (change.call === "platformAdd") platformAdd(change.with);
    else if (change.call === "platformChange") platformChange(change.with);
    else throw new Error(`No change of a list: ${JSON.stringify(change)}`);
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
 * Takes one shared thing that came, giving whether it is done with and goes into my trash.
 * An entry the log has by its `UID` goes untaken, a change the lists refuse is told and goes too.
 * An entry the log cannot take stays, told once.
 */
function thingTake(name: string, text: string): boolean {
    try {
        if (name.endsWith(".ics"))
            textEntriesRead(text, name)
                .filter((entry: Entry): boolean => entryLookup(day.log, entry.id) === undefined)
                .forEach((entry: Entry): void => {
                    entryAdd(entryNewOf(entry), entry.id);
                });
        else
            try {
                listApply(JSON.parse(text) as ListChange);
            } catch (error: unknown) {
                console.log(
                    new Date().toISOString(),
                    `Kept my lists as they are for ${name}:`,
                    error instanceof Error ? error.message : error,
                );
            }
        return true;
    } catch (error: unknown) {
        if (!failed.has(name)) console.error(new Date().toISOString(), `My log cannot take ${name}`, error);
        failed.add(name);
        return false;
    }
}

/**
 * Takes what waits for this reader, the earliest first, each into my trash after.
 * On Vu's server by SSH once at a time, then sends {@link outbox}, since my server is there.
 */
export function inboxTake(): void {
    if (!sharingIs()) return;
    if (holderIs()) {
        const box: string = dashboardBoxOf(myName);
        boxFilesOf(box).forEach((name: string): void => {
            const file: string = join(box, name);
            if (thingTake(name, readFileSync(file, "utf8"))) trashPut(file);
        });
        return;
    }
    if (taking) return;
    taking = true;
    const run: () => Promise<void> = async (): Promise<void> => {
        const names: string | undefined = await sshRun(["inbox"]);
        if (names === undefined) return;
        for (const name of names.split("\n").filter((one: string): boolean => one !== "")) {
            const text: string | undefined = await sshRun(["take", name]);
            if (text === undefined) return;
            if (thingTake(name, text)) await sshRun(["done", name]);
        }
        outboxSend();
    };
    run()
        .catch((error: unknown): void => {
            console.error(new Date().toISOString(), `Nothing taken from ${holder}`, error);
        })
        .finally((): void => {
            taking = false;
        });
}

/**
 * Starts sharing as the reader starts.
 * On my server makes the boxes, sending all my lists into a new one, and watches my box.
 * On Vu's server takes what waits on mine, again every {@link pollSeconds}.
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
    if (!holderIs()) {
        inboxTake();
        setInterval(inboxTake, pollSeconds * 1000);
        return;
    }
    const box: string = dashboardBoxOf(myName);
    mkdirSync(box, { recursive: true });
    partnersOf().forEach((partner: string): void => {
        if (!existsSync(dashboardBoxOf(partner))) {
            mkdirSync(dashboardBoxOf(partner), { recursive: true });
            listsShareAll(partner);
        }
    });
    inboxTake();
    let waiting: NodeJS.Timeout | undefined = undefined;
    watch(box, (): void => {
        clearTimeout(waiting);
        waiting = setTimeout(inboxTake, quiet);
    });
}
