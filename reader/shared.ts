/**
 * ## Shared
 *
 * Shares with Vu, whose dashboard runs on a server of its own, skriptum,
 * what we agreed on and nothing else: an entry of my log with Vu in `With`,
 * and every food, meal and place either of us adds, changes or removes, so we both have them.
 * Who I share with names `sources.ts`, see `partners` there.
 * All we share lies only on my server, `sophabohne`, see `holder` in `sources.ts`,
 * in `NomKommunikation`; Vu's server never has that folder, nor anything in its place.
 *
 * My reader never reaches Vu's server.
 * What goes to Vu waits as a file in Vu's box on my server,
 * `NomKommunikation/to_vu/dashboard/`, named by the moment, me and what it is,
 * like `20261021T093000123Z_Sopha_entry_<UID>.ics` or `…_Sopha_list_<random>.json`.
 * Vu's reader reaches mine by SSH, `ssh nom-sopha`, where its key may run nothing but the gate,
 * see `gate.ts`: as it starts and every {@link pollSeconds} it takes what waits in its box,
 * the earliest first, by `inbox`, `take` and `done`, each into my trash once taken,
 * see {@link inboxTake} and `trash.ts`; there is no archive.
 * What Vu's reader shares it sends at once by `share <name>` into my box,
 * `NomKommunikation/to_sopha/dashboard/`, where my reader sees it at once and takes it in.
 * While my server cannot be reached, it waits in the memory of Vu's reader, in its order,
 * and goes out after the next taking; a restart of Vu's reader loses it, see {@link outbox}.
 *
 * An entry: each of us in its `With` gets a copy as I add it or log a box,
 * and one who comes into its `With` as I change it, see {@link entryShare}:
 * the same `UID`, its times, category, what, the link of what when it is a web address,
 * that of a skill entry, which names its skill and type, its place with the link of the place,
 * where a way starts, the semester of a skill entry, the foods of a meal
 * or a cooking and the cooking a meal draws from,
 * with me in `With` in place of the person, the others staying;
 * not my note, my attempts, my rounds, my chapters, the links to my files, my pain,
 * what a session of sport did, nor the box it was logged from, which are mine alone.
 * After that each copy is its owner's: a change goes to nobody,
 * and a copy that comes for an entry the log of the other has already, by its `UID`,
 * goes to their trash untaken,
 * so nothing remembers who had what, neither a file nor a line of the entry;
 * an entry I took in goes to nobody while its `With` stays,
 * since its sender sent it to everyone in it.
 * A food, a meal or a place: what changed it,
 * as the call of `food.ts` or `places.ts` that changed it, like `foodAdd` with the food as written,
 * see {@link ListChange}, which the reader of Vu makes on its own lists, see {@link listApply};
 * one Vu has already, like the same food, a place of the same name or a meal already renamed,
 * stays as Vu has it. The first time my reader shares with someone, as it makes their box,
 * it sends all my foods, meals, places and rooms, so our lists come together,
 * see {@link sharedStart}; Vu's reader, which makes no box, sent all of Vu's long ago.
 * What I change in the editor by hand goes to nobody.
 *
 * What comes to me lands in my box, `NomKommunikation/to_sopha/dashboard/`:
 * my reader takes it as it starts and whenever the box changes, Vu's reader as above,
 * the earliest first,
 * so a meal finds its foods and the cooking it draws from;
 * an entry into my log as the dialog would add it,
 * see `entryAdd` in `day.ts`, with the `UID` it brought, so it comes in only once;
 * then the file goes into my trash.
 * An entry a log cannot take, like one of a category its reader does not know, stays in its box,
 * and the reader says so once.
 *
 * - `node:child_process`: Runs `ssh` from Vu's reader to my server.
 * - `node:crypto`: Names a change of a list at random.
 * - `node:fs`: Creates the boxes on my server, lists and watches mine,
 *   writes and reads what is shared there.
 * - `node:path`: Builds the paths of the boxes.
 * - `./calendar.ts`: Reads the entries of my log and of a shared file, gives the copy of an entry,
 *   and names the category of skill entries.
 * - `./day.ts`: Adds an entry that came to my log, as the dialog adds one.
 * - `./food.ts`: Reads, adds, changes and removes my foods and meals.
 * - `./places.ts`: Reads, adds and changes my places and rooms,
 *   and tells a link I typed, a web address.
 * - `./persons.ts`: Names a person as `Persons.md` names it, so its names compare alike.
 * - `./sources.ts`: Names my log, my name, the people I share with, who holds the boxes
 *   and the boxes.
 * - `./trash.ts`: Puts what is done into my trash.
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

/**
 * A change of a list, as one call of `food.ts` or `places.ts` that changed it,
 * with what it was called with:
 * a food added as written, a food changed and removed, a meal written, renamed and removed,
 * a place added as written and changed,
 * and a platform online added and changed as written, see {@link listApply}.
 */
export type ListChange =
    | { call: "foodAdd"; with: Food }
    | { call: "foodChange"; with: FoodChanged }
    | { call: "foodRemove"; with: { name: string; brand: string; store: string } }
    | {
          call: "mealAdd";
          with: { name?: string; foods?: string[]; short?: string; grams?: (number | null)[] };
      }
    | { call: "mealRename"; with: { old?: string; name?: string } }
    | { call: "mealRemove"; with: string }
    | { call: "placeAdd"; with: Place }
    | { call: "placeChange"; with: PlaceChanged }
    | { call: "platformAdd"; with: Platform }
    | { call: "platformChange"; with: PlatformChanged };

/**
 * A name of a person, as the boxes are named and the gate takes it:
 * letters and digits of ASCII, starting with a letter, like `Vu`, see `gate.ts`.
 */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * Milliseconds without a change of my box before the reader takes what lies in it,
 * so a file and its rename are one.
 */
const quiet: number = 300;

/**
 * Seconds `ssh` waits to reach my server before it gives up, and the thing waits.
 */
const reachSeconds: number = 10;

/**
 * Seconds between two takings of Vu's reader from its box on my server, see {@link inboxTake}.
 */
const pollSeconds: number = 60;

/**
 * Milliseconds of the moment the last shared thing was named after,
 * so each name comes later than the one before,
 * and the other takes them in their order, see {@link stampOf}.
 */
let lastStamp: number = 0;

/**
 * What Vu's reader shares and my server has not taken yet, the earliest first,
 * each its name and what it holds, see the top of this file;
 * only in memory, since Vu's server holds nothing of our boxes, so a restart loses it.
 */
const outbox: [string, string][] = [];

/**
 * Whether Vu's reader sends now, see {@link outboxSend}.
 */
let sending: boolean = false;

/**
 * Whether Vu's reader sends again after it is through, since something came while it sent.
 */
let again: boolean = false;

/**
 * Whether Vu's reader takes from its box now, see {@link inboxTake}.
 */
let taking: boolean = false;

/**
 * Whether Vu's reader could not reach my server the last time, told once until it reaches it again.
 */
let unreached: boolean = false;

/**
 * Names of shared files a log could not take, each told once, see {@link inboxTake}.
 */
const failed: Set<string> = new Set();

/**
 * Tells whether the reader shares: I have a name,
 * see `myName` in `sources.ts`, of the form of {@link nameForm},
 * and there is someone to share with.
 *
 * @returns Whether it shares
 */
function sharingIs(): boolean {
    return nameForm.test(myName) && partnersOf().length > 0;
}

/**
 * Tells whether this reader runs on my server, the one that holds our boxes,
 * see `holder` in `sources.ts`.
 *
 * @returns Whether it does
 */
function holderIs(): boolean {
    return myName.toLowerCase() === holder.toLowerCase();
}

/**
 * Gives the people I share with whose names have the form of {@link nameForm};
 * one that has not is left out, and on every server but mine all but me,
 * since Vu's reader shares only with mine.
 *
 * @returns Names, like `Vu`
 */
function partnersOf(): string[] {
    return partners.filter(
        (partner: string): boolean =>
            nameForm.test(partner) &&
            (holderIs() || partner.toLowerCase() === holder.toLowerCase()),
    );
}

/**
 * Gives the moment a shared thing is named after, later than the one before,
 * in the form of the iCalendar format to the millisecond, like `20261021T093000123Z`.
 *
 * @returns The moment
 */
function stampOf(): string {
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    return new Date(lastStamp).toISOString().replace(/[-:.]/g, "");
}

/**
 * Gives the key of an entry in the name of a shared file:
 * its `UID`, every character but letters, digits, `.`, `@` and `-` as `_`.
 *
 * @param id - Identifier of the entry, like `b8f1e81f-15b4-460e-910d-ef6b1b3d09b3@nomsystem`
 * @returns Key, like `b8f1e81f-15b4-460e-910d-ef6b1b3d09b3@nomsystem`
 */
function keyOf(id: string): string {
    return id.replace(/[^\w.@-]/g, "_");
}

/**
 * Tells whether two names of `With` name the same person, small and capital letters alike,
 * each as `Persons.md` names its person, see `personNameOf` in `persons.ts`,
 * so `Family, Sopha` names the person I share with as `Sopha`.
 *
 * @param first - A name, like `Sopha`
 * @param second - Another, like `Family, Sopha`
 * @returns Whether they are the same
 */
function sameName(first: string, second: string): boolean {
    return personNameOf(first).toLowerCase() === personNameOf(second).toLowerCase();
}

/**
 * Lists the shared files of a box, without hidden files and half written ones:
 * entries and changes of a list, the earliest first.
 *
 * @param box - The box, like `NomKommunikation/to_sopha/dashboard`
 * @returns Names, sorted
 */
function boxFilesOf(box: string): string[] {
    if (!existsSync(box)) return [];
    return readdirSync(box)
        .filter((name: string): boolean => !name.startsWith(".") && /\.(?:ics|json)$/.test(name))
        .sort();
}

/**
 * Gives my address in an entry I send, the standard address the dialog gives a name,
 * see `standardAddressOf` in `src/day/categories.ts`:
 * the name in small letters, ä, ö, ü and ß as ae, oe, ue and ss,
 * every other letter with an accent plainly, every other character but a–z and 0–9 a dot,
 * never two in a row and none at either end,
 * then `@invalid`, the ending reserved for addresses that never work.
 * - `local`: The part before `@`.
 *
 * @param name - Name, like `Sopha`
 * @returns Address, like `sopha@invalid`
 */
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
 * Runs `ssh` from Vu's reader to my server, `nom-` and my name in small letters,
 * like `ssh nom-sopha share <name>`,
 * never asking for a password and giving up after {@link reachSeconds};
 * what it gives goes in.
 * Tells once that my server cannot be reached, and once that it can again.
 * - `child`: The running `ssh`.
 * - `given`: What the gate gives.
 * - `told`: Its error output.
 *
 * @param words - What the gate there is to do,
 *   like `["share", "20261021T093000123Z_Vu_entry_….ics"]`
 * @param input - What goes in, nothing for none
 * @returns What the gate gave, `undefined` when it did not do it
 */
function sshRun(words: string[], input: string = ""): Promise<string | undefined> {
    return new Promise((resolve: (given: string | undefined) => void): void => {
        const child: ChildProcess = spawn(
            "ssh",
            [
                "-o",
                "BatchMode=yes",
                "-o",
                `ConnectTimeout=${reachSeconds}`,
                `nom-${holder.toLowerCase()}`,
                ...words,
            ],
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
                console.error(
                    new Date().toISOString(),
                    `${holder} not reached: ${words[0]}`,
                    told.trim(),
                );
            if (code === 0 && unreached)
                console.log(new Date().toISOString(), `${holder} reached again`);
            unreached = code !== 0;
            resolve(code === 0 ? Buffer.concat(given).toString("utf8") : undefined);
        });
        child.stdin?.end(input);
    });
}

/**
 * Sends what Vu's reader shares to my server, the earliest first, see {@link outbox};
 * stops at the first my server does not take, which waits with every one after it.
 * Runs once at a time: called while it runs, it runs again after.
 * - `name`, `content`: The name of the first and what it holds.
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

/**
 * Shares a file with a person, see the top of this file:
 * on my server into their box, where it waits for their reader,
 * on Vu's into {@link outbox}, sent at once.
 * - `file`: The file in their box.
 *
 * @param partner - The person, like `Vu`
 * @param name - Its name, see the top of this file
 * @param content - What it holds
 */
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

/**
 * Shares the copy of an entry of my log with one of us, see the top of this file:
 * what we both have of it, with me in `With` in place of the person.
 * - `fields`: Its fields and times as the copy has them.
 * - `own`: Its foods and the cooking a meal draws from.
 *
 * @param entry - The entry as my log holds it
 * @param partner - The person, like `Vu`
 */
function copyWrite(entry: Entry, partner: string): void {
    const fields: EntryFields = {
        category: entry.category,
        title: entry.title,
        titleLink:
            entry.category === skillName || linkForm.test(entry.titleLink) ? entry.titleLink : "",
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
                (attendee: Attendee): boolean =>
                    !sameName(attendee.name, partner) && !sameName(attendee.name, myName),
            ),
        ],
        module: entry.module,
        type: entry.type,
        semester: entry.semester,
        note: "",
        start: new Date(entry.start),
        end: new Date(entry.end),
    };
    const own: [string, string][] = entry.foods.map((food: string): [string, string] => [
        "x-food",
        food,
    ]);
    if (entry.cooked !== "") own.push(["x-cooked", entry.cooked]);
    outboxWrite(
        partner,
        `${stampOf()}_${myName}_entry_${keyOf(entry.id)}.ics`,
        entryIcsOf(fields, own, entry.id),
    );
}

/**
 * Gives who an entry of my log is with as it is now,
 * so a change can tell who comes into its `With`, see {@link entryShare}.
 *
 * @param id - Identifier of the entry
 * @returns Its people, none when there is no such entry
 */
export function attendeesRead(id: string): Attendee[] {
    return entryLookup(day.log, id)?.[1].attendees ?? [];
}

/**
 * Sends an entry of my log to each of us in its `With` who was not in it before,
 * see the top of this file:
 * to all of them after it is added or logged from a box, to those who came in after it is changed,
 * never after a drag, which leaves `With` as it is.
 * Sends nothing while the reader shares nothing, see {@link sharingIs}, nor for a whole day;
 * a copy that fails is told, never failing what I saved.
 * - `found`: The entry as my log holds it, `undefined` when gone.
 * - `to`: Those I share with in its `With` now and not before, each once.
 *
 * @param id - Identifier of the entry
 * @param before - Who it was with before it changed,
 *   see {@link attendeesRead}; none for a new entry
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
                    partnersOf().find((partner: string): boolean =>
                        sameName(partner, attendee.name),
                    ),
                )
                .filter((partner: string | undefined): partner is string => partner !== undefined),
        );
        to.forEach((partner: string): void => copyWrite(found[1], partner));
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No copy of ${id}`, error);
    }
}

/**
 * Sends a change of a list to everyone I share with, or to one, see the top of this file;
 * one that fails is told, never failing what I saved.
 *
 * @param change - The change, like a food added as written
 * @param only - The one person, everyone I share with when left out
 */
export function listShare(change: ListChange, only?: string): void {
    if (!sharingIs()) return;
    try {
        (only === undefined ? partnersOf() : [only]).forEach((partner: string): void => {
            outboxWrite(
                partner,
                `${stampOf()}_${myName}_list_${randomUUID()}.json`,
                `${JSON.stringify(change)}\n`,
            );
        });
    } catch (error: unknown) {
        console.error(new Date().toISOString(), `No change shared: ${change.call}`, error);
    }
}

/**
 * Sends all my foods, meals, places, rooms and platforms to a person,
 * the first time my reader shares with them, so our lists come together, see the top of this file:
 * the foods first, then the meals, which name them, then the places, then the platforms.
 *
 * @param partner - The person, like `Vu`
 */
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
    platformsRead().forEach((platform: Platform): void =>
        listShare({ call: "platformAdd", with: platform }, partner),
    );
}

/**
 * Makes a change of a list that came on my own lists, with the same call as the one who made it,
 * see the top of this file.
 *
 * @param change - The change
 * @throws {Error} - When the call is none of a {@link ListChange}, or refuses it,
 *   like a food I have already
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
 * Turns an entry that came into a new entry of my log, as the dialog sends one,
 * see `EntryNew` in `day.ts`:
 * its fields as it brought them, its skill and type by the folder it links,
 * a skill entry its link anew, to the folder of its skill in my modules,
 * see `titleOf` in `documents.ts`,
 * and the cooking a meal draws from only when it is an entry `Cook` of my log before the meal,
 * as I have it once it came with us both in its `With`.
 * - `cooking`: The entry of that cooking in my log, `undefined` for none.
 *
 * @param entry - The entry as it came
 * @returns The entry to add
 */
function entryNewOf(entry: Entry): EntryNew {
    const cooking: Entry | undefined =
        entry.cooked === "" ? undefined : entryLookup(day.log, entry.cooked)?.[1];
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
            cooking !== undefined &&
            cooking.category === "Cook" &&
            Date.parse(cooking.start) < Date.parse(entry.start)
                ? entry.cooked
                : "",
        start: entry.start,
        end: entry.end,
    };
}

/**
 * Takes one shared thing that came, see the top of this file:
 * an entry the log has already, by its `UID`, goes untaken,
 * a change of a list the lists refuse, like a food I have, is told and goes too;
 * an entry the log cannot take stays, told once.
 *
 * @param name - Its name, see the top of this file
 * @param text - What it holds
 * @returns Whether it is done with, so it goes into my trash
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
        if (!failed.has(name))
            console.error(new Date().toISOString(), `My log cannot take ${name}`, error);
        failed.add(name);
        return false;
    }
}

/**
 * Takes what waits for this reader, the earliest first, each into my trash after,
 * see {@link thingTake}:
 * on my server what lies in my box,
 * on Vu's what lies in Vu's box on my server, by SSH, once at a time,
 * then sends what waits in {@link outbox}, since my server is there.
 * - `box`: My box, like `NomKommunikation/to_sopha/dashboard`.
 * - `file`: The file of a thing in my box.
 * - `names`: The names of what waits in Vu's box, one a line, `undefined` when not reached.
 * - `text`: What one holds, `undefined` when not reached.
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
 * Starts sharing as the reader starts, while it shares, see {@link sharingIs}:
 * on my server creates my box, and for each person I share with their box,
 * sending all my lists the first time, see {@link listsShareAll};
 * takes what lies in my box,
 * and watches it as long as the reader runs,
 * taking what comes after every change once it is quiet for {@link quiet}.
 * On Vu's server takes what waits for it on mine, and again every {@link pollSeconds}.
 * - `box`: My box.
 * - `waiting`: Timer of the next taking, `undefined` while none waits.
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
