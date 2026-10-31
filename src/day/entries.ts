/**
 * ## Entries
 *
 * Sends new, changed, moved and removed entries of the log to the reader, the meal of a cooking,
 * and the boxes of the plan:
 * new, changed and removed ones, a new one repeated weekly,
 * a box logged at its real time or taken back, pushed to the next day or dropped.
 * A changed entry goes with its fingerprint as the dialog opened it,
 * so the reader refuses it once its file changed it since,
 * and a moved one with its new times alone, so nothing the page holds from before is written back.
 * After a change of the log the log of the shown day loads again,
 * so the page shows what the files hold, and with it the boxes,
 * which are done once a log entry points to them, see `boxes.ts`;
 * after a change of a box alone, its sender loads the boxes again itself.
 *
 * The standard address of a name of `With` is made here, beside who I was with,
 * see {@link standardAddressOf}.
 *
 * - `../search.ts`: Writes a name without accents for its standard address in `With`.
 * - `../persons.ts`: Gives a name of `Persons.md` in the order it is spoken,
 *   for its standard address in `With`.
 * - `./series.ts`: The days of a series, the states of its boxes and the boxes it makes,
 *   for the type checker only.
 * - `fullcalendar`: Calendar that shows the log.
 */

import { searchTextOf } from "../search.ts";
import { spokenOf } from "../persons.ts";

import type { Days, Planned, States } from "./series.ts";
import type { Calendar } from "fullcalendar";

/**
 * A person or a group I was with, one `ATTENDEE` of an entry or a box,
 * like `ATTENDEE;CN=Sophale:mailto:sophale@invalid`.
 *
 * - `name`: Its name, like `Sophale` or `Socials`, a person of `Persons.md` as it names it,
 *   like `Bichler, Martin`, without `;`.
 * - `address`: Its address without `mailto:`, like `sophale@invalid`,
 *   which reaches nobody, or a real one I typed.
 */
export type Attendee = {
    name: string;
    address: string;
};

/**
 * What an entry or a box did online, apart from where I physically was, its `X-ONLINE`,
 * see `Online` in `reader/calendar.ts`.
 *
 * - `online`: Its platform, a row of `Online.md`, like `Zoom`, empty for none.
 * - `onlineLink`: The link of its own meeting or video, its `ALTREP`, empty for none.
 * - `onlineChannel`: Its channel, its `X-CHANNEL`,
 *   like the channel of a video on YouTube or the ID of a meeting, empty for none.
 * - `onlineTitle`: Its title, its `X-TITLE`,
 *   like the title of a video or the passcode of a meeting, empty for none.
 */
export type Online = {
    online: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
};

/**
 * Fields and times of an entry of the log to send; an empty field is not written.
 *
 * - `category`: Category picked, `CATEGORIES`.
 * - `title`: What picked, `SUMMARY`.
 * - `titleLink`: Link of what it was, typed, like the page of an event,
 *   the `ALTREP` of its `SUMMARY`, empty for none; left out, it keeps its link.
 * - `location`: Place picked, `LOCATION`, where I physically was,
 *   whose link the reader finds itself.
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`:
 *   What I did online, see {@link Online}; left out, it keeps them.
 * - `from`: Where a way starts, `X-FROM`.
 * - `attendees`: Who I was with, one `ATTENDEE` each, none for nobody;
 *   left out, it keeps its people.
 * - `module`: Module of a skill entry, like `IN2028`, written by the reader only in its `SUMMARY`,
 *   like `IN2028_BusinessAnalyticsMachineLearning (VO)`.
 * - `type`: Type of a skill entry, like `VO`, written only in its `SUMMARY`.
 * - `semester`: Semester of a skill entry, `X-SEMESTER`, like `2026W`, empty for any other entry;
 *   the reader fills in the semester of its day for a skill entry sent without one.
 * - `note`: Free note, `DESCRIPTION`.
 * - `foods`: Foods of a meal, its lines `X-FOOD` like `Reis;150`, none for any other entry.
 * - `planned`: Identifier of the box a new log entry is logged from,
 *   written as `RELATED-TO`, empty for none;
 *   the reader writes it only for a new entry.
 * - `pain`: My neck pain from 0 to 10 after `Neck long`, `X-PAIN`, empty for none;
 *   left out, it stays as it is.
 * - `cooked`: For a meal drawn from a cooking, the identifier of that entry `Cook`,
 *   `X-COOKED`, empty for none;
 *   left out, it stays as it is.
 * - `workout`, `exercises`, `videos`: What a session of sport did, its `X-WORKOUT` of before,
 *   like `Push`, and its lines `X-EXERCISE` and `X-VIDEO`, see `sport.ts`;
 *   empty and none for any other entry; left out, they stay as they are.
 * - `start`: Start of the entry.
 * - `end`: End of the entry, after the start.
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
 * Fields of a box of the plan to send; an empty field is not written.
 *
 * - `category`, `title`, `titleLink`, `location`,
 *   `online`, `onlineLink`, `onlineChannel`, `onlineTitle`,
 *   `from`, `attendees`, `module`, `type`, `semester`, `note`: As those of {@link EntryFields}.
 * - `day`: Day of the box, like `2026-10-13`; for a box with a deadline the day of its deadline.
 * - `time`: Expected time on its day, `null` for none and for a box with a deadline.
 * - `minutes`: Expected duration in minutes, `null` for none.
 * - `deadline`: Deadline as the reader takes it: ISO instant,
 *   or its day like `2026-10-23` without time;
 *   empty for none.
 * - `chapters`, `documents`: Chapters and documents of a skill box, see `SkillLinks` in `skill.ts`;
 *   none for any other box.
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
 * Gives the standard address of a name of `With`:
 * the name in the order it is spoken, a person of `Persons.md` `Vorname Nachname`,
 * see `spokenOf` in `../persons.ts`,
 * so a person has one address in either order of its name, in small letters, ä, ö,
 * ü and ß as ae, oe, ue and ss,
 * every other letter with an accent plainly, like é as e,
 * see `searchTextOf` in `../search.ts`, every other character but a–z and 0–9 a dot,
 * like a space, never two in a row and none at either end,
 * then `@invalid`, the ending reserved for addresses that never work, so nothing reaches anybody,
 * like `herr.mueller@invalid` of `Herr Müller`,
 * `jose.garcia@invalid` of `José García` and `philip.zimmer@invalid` of `Zimmer, Philip`.
 * - `local`: The part before `@`.
 *
 * @param name - Name, like `Herr Müller`
 * @returns Address, like `herr.mueller@invalid`
 */
export function standardAddressOf(name: string): string {
    const local: string = searchTextOf(
        spokenOf(name)
            .toLowerCase()
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
            .replace(/ß/g, "ss"),
    )
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
    return `${local}@invalid`;
}

/**
 * Sends a request to the reader.
 *
 * @param method - HTTP method, like `POST`
 * @param address - Address of the request
 * @param body - Data to send, or `null`
 * @returns Answer of the reader, like the identifier of a new entry, `null` for none
 * @throws {Error} - When the reader does not take the request
 */
async function requestSend(
    method: string,
    address: string,
    body: object | null,
): Promise<unknown> {
    const response: Response = await fetch(address, {
        method: method,
        body: body === null ? null : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
    return await response.json();
}

/**
 * Sends a request that changes the log, then loads the log of the shown day again.
 * - {@link EventSourceApi#refetch}: Loads the entries of a calendar of the reader again.
 *
 * @param calendar - Calendar of the day
 * @param method - HTTP method, like `POST`
 * @param address - Address of the request
 * @param body - Data to send, or `null`
 * @returns Answer of the reader, like the identifier of a new entry, `null` for none
 * @throws {Error} - When the reader does not take the request
 */
async function logSend(
    calendar: Calendar,
    method: string,
    address: string,
    body: object | null,
): Promise<unknown> {
    const answer: unknown = await requestSend(method, address, body);
    calendar.getEventSourceById("log")?.refetch();
    return answer;
}

/**
 * Turns the fields of an entry into the form the reader takes, with ISO instants.
 *
 * @param fields - Fields and times
 * @returns Fields to send
 */
function bodyOf(fields: EntryFields): object {
    return {
        ...fields,
        start: fields.start.toISOString(),
        end: fields.end.toISOString(),
    };
}

/**
 * Turns the fields of a box into the form the reader takes:
 * its time as ISO instant, empty for none.
 *
 * @param fields - Fields of the box
 * @returns Fields to send
 */
function boxBodyOf(fields: BoxFields): object {
    return { ...fields, time: fields.time === null ? "" : fields.time.toISOString() };
}

/**
 * Adds an entry to the log.
 *
 * @param calendar - Calendar of the day
 * @param fields - Fields and times of the new entry
 * @returns Identifier of the new entry
 * @throws {Error} - When the reader does not take the entry
 */
export async function entryAdd(calendar: Calendar, fields: EntryFields): Promise<string> {
    return (await logSend(calendar, "POST", "/api/day/log", bodyOf(fields))) as string;
}

/**
 * Changes fields and times of an entry of the log,
 * only while its file holds it as the dialog opened it:
 * the reader refuses the change with 409 once the file changed it since,
 * like a food renamed in every entry, see `entryEdit` in `reader/day.ts`; the first save wins.
 * - `response`: Answer of the reader.
 *
 * @param calendar - Calendar of the day
 * @param id - Identifier of the entry
 * @param fields - New fields and times
 * @param version - Fingerprint of the entry as the dialog opened it,
 *   see `version` of `Entry` in `reader/calendar.ts`
 * @returns Whether it is changed, `false` when its file changed it since the dialog opened it
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
 * Moves an entry of the log to a new start and end, after a drag: sends its new times alone,
 * and the reader keeps every other field as its file holds it, see `entryMove` in `reader/day.ts`.
 * The log does not load again here, since FullCalendar shows it moved already
 * and the change of its file loads it anyway, see `changesFollow` in `../changes.ts`:
 * two loads at once showed the entry twice for a moment, at its old place and its new one.
 *
 * @param id - Identifier of the entry
 * @param start - Its new start
 * @param end - Its new end
 * @throws {Error} - When the reader does not move it,
 *   like a meal moved before the cooking it draws from
 */
export async function entryMove(id: string, start: Date, end: Date): Promise<void> {
    await requestSend("POST", "/api/day/moved", {
        id: id,
        start: start.toISOString(),
        end: end.toISOString(),
    });
}

/**
 * Removes an entry of the log; the reader opens the box it was logged from again.
 *
 * @param calendar - Calendar of the day
 * @param id - Identifier of the entry
 * @throws {Error} - When the reader does not remove the entry
 */
export async function entryDelete(calendar: Calendar, id: string): Promise<void> {
    await logSend(calendar, "DELETE", `/api/day/log?id=${encodeURIComponent(id)}`, null);
}

/**
 * Logs a box at its real time, dropped into the log or tapped:
 * the reader writes a log entry like it, pointing to it;
 * the change of its file loads the log and the boxes again, so the box shows as done,
 * see `changesFollow` in `../changes.ts`, once only, so the entry never shows twice for a moment.
 *
 * @param box - Identifier of the box
 * @param start - Real start
 * @param end - Real end
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
 * Takes a done box back to open, with one click on its check:
 * the reader removes the log entry written from it, or, when that holds what I added since,
 * like attempts or a note, only lets it go of the box, see `boxUndo` in `reader/day.ts`;
 * then the log of the shown day loads again, and with it the boxes.
 *
 * @param calendar - Calendar of the day
 * @param id - Identifier of the box
 * @throws {Error} - When the reader does not take it back, like for a box that is not done
 */
export async function boxUndo(calendar: Calendar, id: string): Promise<void> {
    await logSend(calendar, "POST", "/api/day/undone", { box: id });
}

/**
 * Adds a box to the plan.
 *
 * @param fields - Fields of the new box
 * @returns Identifier of the new box
 * @throws {Error} - When the reader does not take the box
 */
export async function boxAdd(fields: BoxFields): Promise<string> {
    return (await requestSend("POST", "/api/day/boxes", boxBodyOf(fields))) as string;
}

/**
 * Adds a new box to the plan once per date of its weekly days,
 * as the dialog of a series gives them for a box repeated by its row `Series`,
 * see `seriesRepeat` in `series.ts` and `repeatApply` in `reader/course.ts`,
 * or only tells what that would make, for the preview of the dialog;
 * the reader refuses it with 409 for a series of a type that has a box in its semester already.
 * - `response`: Answer of the reader.
 *
 * @param fields - Fields of the box, as of one made once;
 *   each date sets its own day, time and length
 * @param days - Its days with their times, its extras,
 *   its first and last day and the dates with times of their own
 * @param states - The states I gave its boxes, by their days, like a lecture cancelled,
 *   see `States` in `series.ts`
 * @param dry - Whether only to tell what it would make, writing nothing
 * @returns The boxes it makes, by their days,
 *   `null` when the reader refuses it since its series is there already
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
 * @param id - Identifier of the box
 * @param fields - New fields
 * @throws {Error} - When the reader does not take the change
 */
export async function boxChange(id: string, fields: BoxFields): Promise<void> {
    await requestSend("PATCH", "/api/day/boxes", { id: id, ...boxBodyOf(fields) });
}

/**
 * Removes a box of the plan, one planned by mistake.
 *
 * @param id - Identifier of the box
 * @throws {Error} - When the reader does not remove the box, like a done one
 */
export async function boxDelete(id: string): Promise<void> {
    await requestSend("DELETE", `/api/day/boxes?id=${encodeURIComponent(id)}`, null);
}

/**
 * Pushes an open box to the next day, one whose day is over to tomorrow.
 *
 * @param id - Identifier of the box
 * @throws {Error} - When the reader does not take it
 */
export async function boxPush(id: string): Promise<void> {
    await requestSend("POST", "/api/day/pushed", { box: id });
}

/**
 * Marks a box cancelled by the university,
 * like a lecture that does not take place, or takes that back;
 * the reader renumbers the later boxes of its series.
 *
 * @param id - Identifier of the box
 * @param cancelled - Whether the university cancelled it, else taking that back
 * @throws {Error} - When the reader does not take it
 */
export async function boxUniversity(id: string, cancelled: boolean): Promise<void> {
    await requestSend("POST", "/api/day/university", { box: id, cancelled: cancelled });
}

/**
 * Ticks a box with a deadline submitted, or takes the tick back; its sessions stay in the log.
 *
 * @param id - Identifier of the box
 * @param submitted - Whether to tick it submitted, else to take the tick back
 * @throws {Error} - When the reader does not take it
 */
export async function boxSubmit(id: string, submitted: boolean): Promise<void> {
    await requestSend("POST", "/api/day/submitted", { box: id, submitted: submitted });
}

/**
 * Drops a box, or takes a dropped box back.
 *
 * @param id - Identifier of the box
 * @param dropped - Whether to drop it, else to take it back
 * @throws {Error} - When the reader does not take it
 */
export async function boxDrop(id: string, dropped: boolean): Promise<void> {
    await requestSend("POST", "/api/day/dropped", { box: id, dropped: dropped });
}
