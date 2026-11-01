/**
 * ## Entries
 *
 * Sends new, changed, moved, removed entries of the log and boxes of the plan to the reader.
 * A changed entry goes with its fingerprint, so the reader refuses it once its file changed since.
 * A moved one goes with its new times alone, so nothing the page holds from before is written back.
 * After a change of the log the log of the shown day loads again, and with it the boxes.
 */

import { searchTextOf } from "../search.ts";
import { spokenOf } from "../persons.ts";

import type { Days, States } from "./series.ts";
import type { Calendar } from "fullcalendar";
import type { Attendee, Online } from "../../reader/calendar.ts";
import type { Planned } from "../../reader/course.ts";

/**
 * Fields and times of an entry of the log to send, an empty field not written.
 * A field left out keeps what the file holds.
 *
 * - `titleLink`: The `ALTREP` of its `SUMMARY`.
 * - `location`: Where I physically was.
 * - `module`, `type`: Of a skill entry, written only in its `SUMMARY`.
 * - `semester`: The reader fills in the semester of its day when empty.
 * - `planned`: The box a new log entry is logged from, `RELATED-TO`.
 * - `pain`: My neck pain from 0 to 10 after `Neck long`.
 * - `cooked`: For a meal drawn from a cooking, the identifier of that entry `Cook`.
 * - `workout`, `exercises`, `videos`: What a session of sport did.
 */
export type EntryFields = Partial<Online> & {
    category: string;
    title: string;
    titleLink?: string;
    location: string;
    from: string;
    attendees?: Attendee[];
    module: string;
    type: string;
    semester: string;
    note: string;
    foods: string[];
    planned: string;
    pain?: string;
    cooked?: string;
    workout?: string;
    exercises?: string[];
    videos?: string[];
    start: Date;
    end: Date;
};

/**
 * Fields of a box of the plan to send, an empty field not written.
 *
 * - `day`: For a box with a deadline the day of its deadline.
 * - `time`: `null` for none and for a box with a deadline.
 * - `deadline`: ISO instant, or its day without time, empty for none.
 * - `chapters`, `documents`: Of a skill box.
 */
export type BoxFields = Partial<Online> & {
    category: string;
    title: string;
    titleLink?: string;
    location: string;
    from: string;
    attendees?: Attendee[];
    module: string;
    type: string;
    semester: string;
    note: string;
    day: string;
    time: Date | null;
    minutes: number | null;
    deadline: string;
    chapters: string[];
    documents: string[];
};

/**
 * The standard address of a name of `With`, from the name in the order it is spoken,
 * so a person has one address in either order of its name.
 * It ends in `@invalid`, reserved for addresses that never work, so nothing reaches anybody.
 */
export function standardAddressOf(name: string): string {
    const local: string = searchTextOf(
        spokenOf(name).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"),
    )
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
    return `${local}@invalid`;
}

/**
 * Sends a request to the reader, gives its answer.
 *
 * @throws {Error} - When the reader does not take the request
 */
async function requestSend(method: string, address: string, body: object | null): Promise<unknown> {
    const response: Response = await fetch(address, {
        method: method,
        body: body === null ? null : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return await response.json();
}

/**
 * Sends a request that changes the log, then loads the log of the shown day again.
 *
 * @throws {Error} - When the reader does not take the request
 */
async function logSend(calendar: Calendar, method: string, address: string, body: object | null): Promise<unknown> {
    const answer: unknown = await requestSend(method, address, body);
    calendar.getEventSourceById("log")?.refetch();
    return answer;
}

/** The fields of an entry with ISO instants. */
function bodyOf(fields: EntryFields): object {
    return {
        ...fields,
        start: fields.start.toISOString(),
        end: fields.end.toISOString(),
    };
}

/** The fields of a box with its time as ISO instant, empty for none. */
function boxBodyOf(fields: BoxFields): object {
    return { ...fields, time: fields.time === null ? "" : fields.time.toISOString() };
}

/**
 * Adds an entry to the log, gives its identifier.
 *
 * @throws {Error} - When the reader does not take the entry
 */
export async function entryAdd(calendar: Calendar, fields: EntryFields): Promise<string> {
    return (await logSend(calendar, "POST", "/api/day/log", bodyOf(fields))) as string;
}

/**
 * Changes an entry of the log only while its file holds it as the dialog opened it.
 * The reader refuses with 409 once the file changed since, so the first save wins.
 *
 * @returns Whether it is changed
 * @throws {Error} - When the reader does not take the change for another reason
 */
export async function entryChange(
    calendar: Calendar,
    id: string,
    fields: EntryFields,
    version: string,
): Promise<boolean> {
    const response: Response = await fetch("/api/day/log", {
        method: "PATCH",
        body: JSON.stringify({ id: id, ...bodyOf(fields), version: version }),
    });
    if (response.status === 409) return false;
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    calendar.getEventSourceById("log")?.refetch();
    return true;
}

/**
 * Moves an entry of the log after a drag, its new times alone.
 * The log does not load again here, since the change of its file loads it anyway.
 * Two loads at once showed the entry twice for a moment.
 *
 * @throws {Error} - When the reader does not move it, like a meal moved before its cooking
 */
export async function entryMove(id: string, start: Date, end: Date): Promise<void> {
    await requestSend("POST", "/api/day/moved", {
        id: id,
        start: start.toISOString(),
        end: end.toISOString(),
    });
}

/**
 * Removes an entry of the log, the reader opens the box it was logged from again.
 *
 * @throws {Error} - When the reader does not remove the entry
 */
export async function entryDelete(calendar: Calendar, id: string): Promise<void> {
    await logSend(calendar, "DELETE", `/api/day/log?id=${encodeURIComponent(id)}`, null);
}

/**
 * Logs a box at its real time in a log entry pointing to it.
 * Only the change of its file loads the log again, so the entry never shows twice for a moment.
 *
 * @throws {Error} - When the reader does not log it, like for a box done already
 */
export async function boxLog(box: string, start: Date, end: Date): Promise<void> {
    await requestSend("POST", "/api/day/logged", {
        box: box,
        start: start.toISOString(),
        end: end.toISOString(),
    });
}

/**
 * Takes a done box back to open.
 * The reader removes its log entry, or only lets it go of the box when it holds what I added since.
 *
 * @throws {Error} - When the reader does not take it back, like for a box that is not done
 */
export async function boxUndo(calendar: Calendar, id: string): Promise<void> {
    await logSend(calendar, "POST", "/api/day/undone", { box: id });
}

/**
 * Adds a box to the plan, gives its identifier.
 *
 * @throws {Error} - When the reader does not take the box
 */
export async function boxAdd(fields: BoxFields): Promise<string> {
    return (await requestSend("POST", "/api/day/boxes", boxBodyOf(fields))) as string;
}

/**
 * Adds a new box once per date of its weekly days, or with `dry` only tells what that would make.
 *
 * @returns The boxes it makes, `null` when refused with 409 since the type has a box in its semester
 * @throws {Error} - When the reader does not take it for another reason
 */
export async function boxRepeat(
    fields: BoxFields,
    days: Days,
    states: States,
    dry: boolean,
): Promise<Planned[] | null> {
    const response: Response = await fetch("/api/day/repeat", {
        method: "POST",
        body: JSON.stringify({
            box: boxBodyOf(fields),
            slots: days.slots,
            extras: days.extras,
            first: days.first,
            last: days.last,
            times: days.times,
            states: states,
            dry: dry,
        }),
    });
    if (response.status === 409) return null;
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return (await response.json()) as Planned[];
}

/**
 * Changes a box of the plan.
 *
 * @throws {Error} - When the reader does not take the change
 */
export async function boxChange(id: string, fields: BoxFields): Promise<void> {
    await requestSend("PATCH", "/api/day/boxes", { id: id, ...boxBodyOf(fields) });
}

/**
 * Removes a box of the plan, one planned by mistake.
 *
 * @throws {Error} - When the reader does not remove the box, like a done one
 */
export async function boxDelete(id: string): Promise<void> {
    await requestSend("DELETE", `/api/day/boxes?id=${encodeURIComponent(id)}`, null);
}

/**
 * Pushes an open box to the next day.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function boxPush(id: string): Promise<void> {
    await requestSend("POST", "/api/day/pushed", { box: id });
}

/**
 * Sets a box back on a day it left, as if it never went on from there.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function boxBack(id: string, day: string): Promise<void> {
    await requestSend("POST", "/api/day/back", { box: id, day: day });
}

/**
 * Marks a box cancelled by the university, or takes that back.
 * The reader renumbers the later boxes of its series.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function boxUniversity(id: string, cancelled: boolean): Promise<void> {
    await requestSend("POST", "/api/day/university", { box: id, cancelled: cancelled });
}

/**
 * Ticks a box with a deadline submitted, or takes the tick back, its sessions staying in the log.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function boxSubmit(id: string, submitted: boolean): Promise<void> {
    await requestSend("POST", "/api/day/submitted", { box: id, submitted: submitted });
}

/**
 * Drops a box, or takes a dropped box back.
 *
 * @throws {Error} - When the reader does not take it
 */
export async function boxDrop(id: string, dropped: boolean): Promise<void> {
    await requestSend("POST", "/api/day/dropped", { box: id, dropped: dropped });
}
