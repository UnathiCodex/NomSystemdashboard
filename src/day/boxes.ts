/**
 * ## Boxes
 *
 * The plan of the shown day as a calm list of boxes beside the log,
 * which is my one calendar, see `reader/boxes.ts`:
 * its birthdays and holidays at the top, each looking like a box,
 * with my gift idea for it beside it, when I have one, see `gifts.ts`,
 * then the boxes one after another like the stations of the day, as real as the log:
 * those with an expected time by their time, a cancelled one faded in its place,
 * then those with a deadline, then those without either,
 * which the reader puts there itself, see `reader/suggestions.ts`,
 * and the cancelled boxes without time last.
 * Every box has the same lines, open or done, see {@link boxContentOf}.
 * Every line stays one line, ending in `…` where it is too long,
 * a document cut in its middle instead, so its ending stays,
 * each line whole as its tooltip, so a box keeps its few lines.
 * No line counts the pushes or asks about them: a box goes on as often as I push it,
 * and one I no longer want I skip myself.
 * A box with a deadline shows from four days before it, see `reader/boxes.ts`,
 * until it is done, and on the day of its deadline always, done or not;
 * it has no `Move`, since it stays on the day of its deadline.
 * Its sessions are dragged into the log, as many as it needs, and leave it open;
 * `Submit` among its actions ticks it submitted, which alone makes it done.
 * An open box is dragged into the log at the real time:
 * the reader writes a log entry like it, pointing to it,
 * as long as its expected duration, else half an hour,
 * and I resize the entry when it lasted otherwise.
 * An open box shows all it can do at its right as small icon buttons,
 * not only under the pointer, see `actions.ts`;
 * when the reader does not log a box dropped or tapped,
 * a hint says so above the list until it loads again.
 * A box no longer open shows one small grey icon for its state, see {@link stateOf},
 * and a click on it takes that back, so everything undoes with one click.
 * An open box is as bright on a day that is over as on today,
 * so a day before looks like today.
 * A move to any other day by its dialog counts as a push too.
 * A pushed box stays greyed on each day it left, once per push,
 * see `leftBoxesOf` in `reader/boxes.ts`;
 * a click on it leads to the day it stands on now,
 * a click on its arrow sets it back on that day, see `boxBack` there.
 * A box neither done nor cancelled is carried along once its day is over,
 * as if I pushed it to the next day at the end of each day,
 * see `carriedOf` in `reader/boxes.ts`;
 * only on its own day it stays open, so I log it there when I log it later,
 * like my diary of yesterday: it is done on that day then, counted so, never as pushed.
 * One I add for a day that is over or move to one stays there, open,
 * and counts as skipped.
 * A box with a deadline, which is never pushed, is carried along on today as it is,
 * after the open boxes of today,
 * without a heading of its own, since its deadline says so.
 * A box without category, like a to-do another app wrote into the plan,
 * opens the entry by category of the log instead of being logged at once,
 * since the log needs a category.
 * The list loads again when the shown day or its log changes,
 * since a box is done once a log entry points to it, when the entry by category closes,
 * and after a push or a cancel.
 *
 * - `fullcalendar/interaction`: Drags the boxes into the log.
 * - `../phone.ts`: Tells a phone, which shows a skill by its code alone.
 * - `../today.ts`: Gives today's calendar date,
 *   which tells whether the day of a box is over.
 */

import { Draggable } from "fullcalendar/interaction";
import { boxBack, boxDrop, boxLog, boxPush, boxSubmit, boxUndo, boxUniversity } from "./entries.ts";
import { boxOpenEdit, boxOpenNew, entryOpenFromBox } from "./categories.ts";
import { giftOpen } from "./gifts.ts";
import { middleCutPut } from "./choices.ts";
import { whereLinkedOf, whereOf } from "./places.ts";
import { linkNameOf } from "../skill/links.ts";
import { boxMinutes, boxTimesOf, lengthOf, nearOf, rangeDash, timeOf } from "./times.ts";
import { boxActionsOf } from "./actions.ts";
import { roomOf, seriesNew } from "./series.ts";
import { dayOf, dayTextOf, masterName, skillName } from "../skill/attempts.ts";
import { skillGroups } from "./skill.ts";
import { calendarTodayOf } from "../today.ts";
import { iconOf, iconPut, plusPut } from "../icons.ts";
import { phone } from "../phone.ts";
import { readerAsk } from "../reader.ts";
import { ArrowLeft, ArrowRight, CalendarOff, Check, Gift, Repeat, X } from "lucide";

import type { Calendar, EventApi, EventReceiveInfo } from "fullcalendar";
import type { IconNode } from "lucide";
import type { BoxState, Moved, Occasion } from "../../reader/boxes.ts";
import type { Attendee, Link, Push } from "../../reader/calendar.ts";

/**
 * A box, as the reader sends it.
 *
 * - `id`: For an occurrence of a series with its start after `#`.
 * - `category`: Empty for a box without one, like a to-do another app wrote.
 * - `titleLink`: Its `ALTREP`, for a skill box the folder of its skill or of its material
 *   while I typed none.
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`: See `Online` in
 *   `reader/calendar.ts`.
 * - `day`: For a box with a deadline the day of its deadline.
 * - `deadline`: As ISO instant, or as its day alone when it has no time.
 * - `state`: Dropped is cancelled, pushed is pushed from the day it shows on.
 * - `log`: Of the log entry written from it,
 *   for a box with a deadline of its last session.
 * - `editable`: Whether it can be changed, pushed and dropped,
 *   also one occurrence of a series, alone.
 * - `series`: Whether it is one occurrence of a series,
 *   whose bin takes that day alone out of it.
 * - `todo`: Whether it is a to-do; an event, like a lecture imported from TUMonline,
 *   keeps its time and duration.
 * - `links`, `chapters`: A log entry from it gets them too.
 * - `number`: Its number in its series, `NONE` for one the university cancelled.
 * - `group`: The group of a tutorial whose session it goes to, see `./groups.ts`.
 * - `moved`: Where it went, for a box greyed on a day it was pushed from,
 *   or open on its own day while it is carried along.
 * - `file`: Its `.ics` file from `NomWorkspace` on, which its dialog shows.
 */
export type Box = {
    id: string;
    category: string;
    title: string;
    titleLink: string;
    location: string;
    locationLink: string;
    online: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
    from: string;
    attendees: Attendee[];
    module: string;
    type: string;
    semester: string;
    note: string;
    day: string;
    time: string;
    minutes: number | null;
    deadline: string;
    state: BoxState;
    pushed: Push[];
    log: { start: string; end: string } | null;
    editable: boolean;
    series: boolean;
    todo: boolean;
    links: Link[];
    chapters: string[];
    number: string;
    group: string;
    moved: Moved | null;
    file: string;
};

/**
 * The plan of a day, as the reader sends it.
 */
export type PlanDay = {
    day: string;
    occasions: Occasion[];
    boxes: Box[];
};

/**
 * The plan of the shown day, as loaded last.
 */
let shown: PlanDay = { day: "", occasions: [], boxes: [] };

/**
 * The boxes with a deadline carried along to the shown day, as loaded last,
 * none for any day but today.
 */
let carried: Box[] = [];

/**
 * Type of the boxes that go to a group, my tutorials, see `reader/course.ts`.
 */
const groupedType: string = "TU";

/**
 * What the list was loaded for last, so it loads again only when that changes.
 */
let seen: string = "";

/**
 * How many loads of the list began,
 * so only the answer of the last one shows, see {@link boxesLoad}.
 */
let loads: number = 0;

/**
 * Makes an element of an entry or a box, a line or a part of one;
 * the entries of the log in `day.ts` are made of them too.
 */
export function entryPartOf(tag: string, className: string, parts: (string | Node)[]): HTMLElement {
    const element: HTMLElement = document.createElement(tag);
    element.className = className;
    element.append(...parts);
    return element;
}

/**
 * Makes what an entry or a box is, the first line of each,
 * in bold as a whole, so the list scans fast:
 * its category, a colon and its what;
 * only the category of an old entry written before it had its what.
 */
export function whatOf(category: string, what: string): (string | Node)[] {
    let text: string = what === "" ? category : `${category}: ${what}`;
    if (category === "") text = what;
    return [entryPartOf("strong", "entry-heading", [text])];
}

/**
 * Gives what an entry or a box shows as its what, see {@link whatOf},
 * on a phone a skill by its code alone with its type, so it stays short there.
 */
export function shownWhatOf(category: string, title: string, module: string, type: string): string {
    if (category !== skillName || !phone || module === "" || !title.startsWith(`${module}_`)) return title;
    return type === "" ? module : `${module} (${type})`;
}

/**
 * Loads the plans of the days of a range from the reader.
 *
 * @param end - Day after the last
 * @throws {Error} - When the reader cannot answer
 */
export async function boxesFetch(start: string, end: string): Promise<PlanDay[]> {
    return readerAsk<PlanDay[]>(`/api/day/boxes?start=${start}&end=${end}`);
}

/**
 * Loads the boxes with a deadline carried along to a day, today, from the reader,
 * see `boxesCarried` in `reader/boxes.ts`.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function carriedFetch(day: string): Promise<Box[]> {
    return readerAsk<Box[]>(`/api/day/carried?date=${day}`);
}

/**
 * Writes the parts of the line of the time and length of a box,
 * the same whether it is open or done, since the log shows its real time:
 * its own day while it is open and stands on a later day, carried along or pushed,
 * its expected start and end, else its expected duration,
 * never how often it was pushed.
 */
function timePartsOf(box: Box, day: string): string[] {
    const first: string = box.pushed[0]?.day ?? box.day;
    const over: string = box.state === "open" && box.deadline === "" && first < day ? dayTextOf(first, true) : "";
    const start: Date | null = box.time === "" ? null : new Date(box.time);
    let when: string = start === null ? "" : timeOf(start);
    if (start !== null && box.minutes !== null)
        when = `${timeOf(start)}${rangeDash}` + timeOf(new Date(start.getTime() + box.minutes * 60 * 1000));
    const length: string = box.minutes === null || start !== null ? "" : lengthOf(box.minutes);
    return [over, when, length].filter((part: string): boolean => part !== "");
}

/**
 * Writes the parts of the line of the deadline of a box:
 * its day, its time and how near it is while it is open,
 * not for a box carried along, since its deadline line names it;
 * its day left out on that day itself, unless nothing else is left to write.
 */
function deadlinePartsOf(box: Box, day: string, nearShown: boolean): string[] {
    if (box.deadline === "") return [];
    const time: string = box.deadline === box.day ? "" : timeOf(new Date(box.deadline));
    const near: string = !nearShown || box.state !== "open" ? "" : nearOf(box.day, day);
    const rest: string[] = [time, near].filter((part: string): boolean => part !== "");
    return box.day === day && rest.length > 0 ? rest : [dayTextOf(box.day, true), ...rest];
}

/**
 * Gives a line of a box, or a part of one, its whole text as its tooltip,
 * since it ends in `…` where it is too long:
 * its own text, or the text given where the page draws more than that,
 * like the dots between the parts of a time.
 */
function titledOf(element: HTMLElement, text?: string): HTMLElement {
    element.title = text ?? element.textContent ?? "";
    return element;
}

/**
 * Makes the parts of a line of times, each further one after its dot,
 * in one part of the line, so they stay together.
 *
 * @param start - What stands before the first, empty for nothing
 */
function timesOf(parts: string[], start: string): HTMLElement | null {
    if (parts.length === 0) return null;
    return titledOf(
        entryPartOf(
            "span",
            "box-part box-time",
            parts.map((part: string, index: number): string | Node =>
                index === 0 ? `${start}${part}` : entryPartOf("span", "entry-parted", [part]),
            ),
        ),
        `${start}${parts.join(" · ")}`,
    );
}

/**
 * Makes the lines of a box, the same whether it is open or done,
 * as an entry of the log has them: what it is in bold,
 * then its time, its place and the group of a tutorial,
 * a place with a link opening it on a click instead of the box;
 * then its deadline, its chapters and its documents,
 * each cut in its middle where it is too long, so its ending stays;
 * a line without anything to say is left out.
 *
 * @param nearShown - Whether to write how near its deadline is,
 *   not for a box carried along
 */
function boxContentOf(box: Box, day: string, nearShown: boolean): HTMLElement[] {
    const what: string = shownWhatOf(box.category, box.title, box.module, box.type);
    const times: HTMLElement | null = timesOf(timePartsOf(box, day), "");
    const place: string = whereOf(box.category, box.from, box.location, box.online);
    const group: string = tutorialIs(box) && box.group !== "" ? `Group ${box.group}` : "";
    const meta: HTMLElement[] = [
        ...(times === null ? [] : [times]),
        ...(place === ""
            ? []
            : [
                  titledOf(
                      entryPartOf(
                          "span",
                          times === null ? "box-part" : "box-part entry-parted",
                          whereLinkedOf(
                              box.category,
                              box.from,
                              roomOf(box.location),
                              box.locationLink,
                              box.online,
                              box.onlineLink,
                          ),
                      ),
                      place.replace("->", "→"),
                  ),
              ]),
    ];
    if (group !== "")
        meta.push(titledOf(entryPartOf("span", meta.length === 0 ? "box-part" : "box-part entry-parted", [group])));
    const deadline: HTMLElement | null = timesOf(deadlinePartsOf(box, day, nearShown), "Deadline: ");
    const chapters: HTMLElement[] = chaptersOf(box).map((chapter: Node, index: number): HTMLElement =>
        titledOf(entryPartOf("span", index === 0 ? "box-part" : "box-part entry-parted", [chapter])),
    );
    const topics: string[] = topicsOf(box);
    return [
        titledOf(entryPartOf("div", "box-what", whatOf(box.category, what === box.category ? "" : what))),
        ...(meta.length === 0 ? [] : [entryPartOf("div", "box-meta", meta)]),
        ...(deadline === null ? [] : [entryPartOf("div", "box-meta", [deadline])]),
        ...(chapters.length === 0 ? [] : [entryPartOf("div", "box-meta box-chapters", chapters)]),
        ...(topics.length === 0
            ? []
            : [
                  entryPartOf(
                      "ul",
                      "box-topics",
                      topics.map((topic: string): HTMLElement => {
                          const item: HTMLElement = entryPartOf("li", "", []);
                          middleCutPut(item, topic);
                          return item;
                      }),
                  ),
              ]),
    ];
}

/**
 * Gives the chapters of a skill box,
 * each a link to the page of the chapter in the scripts view in this window,
 * instead of the box, as the place opens its link;
 * plain on a phone, which has no scripts view,
 * and for a box whose summary names no module.
 */
function chaptersOf(box: Box): Node[] {
    const module: string = box.title.replace(/\s*\(.*$/, "");
    return box.chapters.map((chapter: string): Node => {
        if (phone || !/^[A-Z]+\d+_/.test(module)) return document.createTextNode(chapter);
        const anchor: HTMLAnchorElement = document.createElement("a");
        anchor.className = "chapter-link";
        anchor.href = `/scripts?module=${encodeURIComponent(module)}` + `&chapter=${encodeURIComponent(chapter)}`;
        anchor.textContent = chapter;
        anchor.addEventListener("click", (event: MouseEvent): void => event.stopPropagation());
        return anchor;
    });
}

/**
 * Gives the documents a box will use, by the last part of their path;
 * a folder it links, which an older box may, shows as its chapter or not at all,
 * see `chaptersOf` in `reader/documents.ts`.
 */
function topicsOf(box: Box): string[] {
    return box.links.filter((link: Link): boolean => link.fingerprint !== "").map(linkNameOf);
}

/**
 * Makes the birthdays and holidays of a day, each looking like a box,
 * so it reads as an appointment of the day, with my gift idea for it beside it,
 * and no buttons, since it is never logged.
 * A click on it opens the dialog of its gift idea, see `gifts.ts`.
 */
function occasionsOf(occasions: Occasion[], open: (occasion: Occasion) => void): HTMLElement[] {
    return occasions.map((occasion: Occasion): HTMLElement => {
        const what: (string | Node)[] = whatOf(occasion.category, occasion.title);
        const text: string = what
            .map((part: string | Node): string => (typeof part === "string" ? part : (part.textContent ?? "")))
            .join("");
        const after: HTMLElement =
            occasion.gift === ""
                ? entryPartOf("span", "occasion-hint", [iconOf(Gift)])
                : entryPartOf("span", "entry-parted occasion-gift", [occasion.gift]);
        const element: HTMLElement = entryPartOf("div", "box occasion", [
            entryPartOf("div", "box-body", [entryPartOf("div", "box-what", [...what, after])]),
        ]);
        element.title = occasion.gift === "" ? `${text}\nGift idea` : `${text} · ${occasion.gift}\nChange gift idea`;
        element.addEventListener("click", (): void => open(occasion));
        return element;
    });
}

/**
 * Logs a box as expected, with one tap, see {@link boxTimesOf};
 * a box without category opens the entry by category of the log at those times instead,
 * since the log needs a category.
 *
 * @throws {Error} - When the reader does not log it, or does not answer
 */
async function boxTap(calendar: Calendar, box: Box): Promise<void> {
    const [start, end]: [Date, Date] = boxTimesOf(box, calendar.view.currentStart);
    await (box.category === "" ? entryOpenFromBox(box, start, end) : boxLog(box.id, start, end));
}

/**
 * Acts on a click on what a box is:
 * a moved box leads to the day it stands on now,
 * one that can be changed opens the entry by category to change it,
 * an open one that cannot, like a lecture of a file outside the new system,
 * the entry by category of the log at the times of a tap.
 *
 * @throws {Error} - When the reader does not answer
 */
async function boxClick(calendar: Calendar, box: Box): Promise<void> {
    if (box.moved !== null) calendar.gotoDate(box.moved.day);
    else if (box.editable) await boxOpenEdit(box);
    else if (box.state === "open") {
        const [start, end]: [Date, Date] = boxTimesOf(box, calendar.view.currentStart);
        await entryOpenFromBox(box, start, end);
    }
}

/**
 * Makes the state of a box no longer open, one small grey icon,
 * the one of the action that made it; a click on it takes that back.
 * A box that cannot be changed has its icon alone, unless it is done.
 */
function stateOf(calendar: Calendar, box: Box): HTMLElement {
    if (box.state === "done")
        return box.deadline === ""
            ? stateMarkOf(calendar, Check, "Logged", (): Promise<void> => boxUndo(calendar, box.id))
            : stateMarkOf(calendar, Check, "Submitted", (): Promise<void> => boxSubmit(box.id, false));
    if (box.state === "dropped" || box.state === "open")
        return stateMarkOf(
            calendar,
            X,
            "Skipped",
            box.editable && box.state === "dropped" ? (): Promise<void> => boxDrop(box.id, false) : null,
        );
    if (box.state === "university")
        return stateMarkOf(
            calendar,
            CalendarOff,
            "Cancelled",
            box.editable ? (): Promise<void> => boxUniversity(box.id, false) : null,
        );
    return stateMarkOf(
        calendar,
        (box.moved?.went ?? "") < box.day ? ArrowLeft : ArrowRight,
        "Moved",
        box.editable ? (): Promise<void> => boxBack(box.id, box.day) : null,
    );
}

/**
 * Makes the icon of the state of a box, see {@link stateOf},
 * a button where the state can be taken back, else the icon alone.
 *
 * @param back - Sends taking it back to the reader, `null` where it cannot be taken back
 */
function stateMarkOf(
    calendar: Calendar,
    icon: IconNode,
    word: string,
    back: (() => Promise<void>) | null,
): HTMLElement {
    if (back === null) {
        const mark: HTMLElement = entryPartOf("span", "box-state", []);
        iconPut(mark, icon, word);
        return mark;
    }
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "box-state";
    iconPut(button, icon, word);
    button.addEventListener("click", (): void => {
        back()
            .then((): Promise<void> => boxesLoad(calendar))
            .catch((error: unknown): void => console.error(error));
    });
    return button;
}

/**
 * Says above the list of boxes that the reader did
 * not log a box dropped into the log or tapped,
 * like after a lost connection, until the list loads again.
 */
function logFailShow(error: unknown): void {
    console.error(error);
    document.getElementById("plan-error")?.removeAttribute("hidden");
}

/**
 * Makes the actions of an open box, see `boxActionsOf` in `actions.ts`:
 * every action but `Log` sends its change and then loads the list again.
 */
function actionsOf(calendar: Calendar, box: Box): HTMLElement {
    return boxActionsOf(
        box,
        (): void => {
            boxTap(calendar, box).catch(logFailShow);
        },
        (send: () => Promise<void>): void => {
            send()
                .then((): Promise<void> => boxesLoad(calendar))
                .catch((error: unknown): void => console.error(error));
        },
    );
}

/**
 * Tells whether a box is a tutorial of a module, which names its group.
 */
function tutorialIs(box: Box): boolean {
    return box.category === skillName && box.type === groupedType && box.module !== "";
}

/**
 * Makes a box of the list, its actions at its right while open, else its state.
 * An open box without deadline whose day is over counts as skipped,
 * as in the list of a module, see `overIs` in `../editor/course.ts`,
 * and is not carried along, greyed as `box-over`, yet keeps its actions,
 * so I still log or skip it.
 * An open box keeps its identifier, category, title and minutes as data of its element,
 * for the drag into the log, and how many lines it has as `--box-lines`,
 * so its actions or its state stand in the middle of all of them.
 *
 * @param carriedShown - Whether it shows in the list carried along,
 *   else among the boxes of the shown day
 */
function boxElementOf(calendar: Calendar, box: Box, carriedShown: boolean): HTMLElement {
    const element: HTMLElement = entryPartOf("div", `box box-${box.state}`, []);
    const body: HTMLElement = entryPartOf("div", "box-body", boxContentOf(box, shown.day, !carriedShown));
    element.classList.toggle(
        "box-over",
        box.state === "open" && box.deadline === "" && box.day < calendarTodayOf() && box.moved === null,
    );
    element.classList.toggle("box-draggable", box.state === "open");
    element.dataset.id = box.id;
    element.dataset.category = box.category;
    element.dataset.title = box.title;
    element.dataset.minutes = String(box.minutes ?? boxMinutes);
    element.style.setProperty("--box-lines", String(body.children.length));
    element.addEventListener("click", (event: MouseEvent): void => {
        if (event.target === element || body.contains(event.target as Node))
            boxClick(calendar, box).catch((error: unknown): void => console.error(error));
    });
    const end: HTMLElement = box.state === "open" ? actionsOf(calendar, box) : stateOf(calendar, box);
    element.append(body, end);
    return element;
}

/**
 * Sections of the plan, in order, the first named as the Skill list names its groups,
 * see `skillGroups` in `skill.ts`.
 */
const sections: string[] = [...skillGroups, "Living", "Health"];

/**
 * Gives the section of the plan a box stands in, by the plan it lies in:
 * `Master` for the plan of my skill of planning, see `masterName` in `../skill/attempts.ts`,
 * `Projects` for any other in `Skilling`, else the name of its folder.
 */
function sectionOf(box: Box): string {
    const [folder, file]: string[] = box.file.split("/").slice(-2);
    if (folder !== "Skilling") return folder;
    return file === `${masterName}_Plan.ics` ? "Master" : "Projects";
}

/**
 * Gives the boxes of the list: those of the shown day, then those carried along.
 */
function listedOf(): Box[] {
    return [...shown.boxes, ...carried];
}

/**
 * Shows the plan of the shown day in the list: its birthdays and holidays,
 * then its boxes in their sections, a section without boxes left out,
 * the cancelled ones last in each; a calm hint when the day has none of them.
 */
function boxesShow(calendar: Calendar): void {
    const listed: [Box, HTMLElement][] = [
        ...shown.boxes.map((box: Box): [Box, HTMLElement] => [box, boxElementOf(calendar, box, false)]),
        ...carried.map((box: Box): [Box, HTMLElement] => [box, boxElementOf(calendar, box, true)]),
    ];
    const inSection: (section: string, dropped: boolean) => HTMLElement[] = (
        section: string,
        dropped: boolean,
    ): HTMLElement[] =>
        listed
            .filter(
                ([box]: [Box, HTMLElement]): boolean =>
                    sectionOf(box) === section && (box.state === "dropped") === dropped,
            )
            .map(([, element]: [Box, HTMLElement]): HTMLElement => element);
    const elements: HTMLElement[] = [
        ...occasionsOf(shown.occasions, giftOpen),
        ...sections.flatMap((section: string): HTMLElement[] => {
            const boxes: HTMLElement[] = [...inSection(section, false), ...inSection(section, true)];
            return boxes.length === 0 ? [] : [entryPartOf("h3", "plan-section", [section]), ...boxes];
        }),
    ];
    document
        .getElementById("plan-boxes")
        ?.replaceChildren(...(elements.length > 0 ? elements : [entryPartOf("p", "plan-none", ["Nothing planned"])]));
}

/**
 * Loads the plan of the shown day and, on today, the boxes carried along to it,
 * and shows them, unless another day is shown meanwhile or a later load began,
 * so a change saved never shows the list as it was before.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function boxesLoad(calendar: Calendar): Promise<void> {
    loads += 1;
    const load: number = loads;
    const day: string = dayOf(calendar.view.currentStart);
    const [plans, carriedNow]: [PlanDay[], Box[]] = await Promise.all([
        boxesFetch(day, dayOf(calendar.view.currentEnd)),
        day === calendarTodayOf() ? carriedFetch(day) : Promise.resolve([]),
    ]);
    if (load !== loads || day !== dayOf(calendar.view.currentStart)) return;
    shown = plans[0];
    carried = carriedNow;
    document.getElementById("plan-error")?.setAttribute("hidden", "");
    boxesShow(calendar);
}

/**
 * Loads the list again when the shown day or its log entries changed,
 * as the calendar tells after every change,
 * since a box is done once a log entry points to it.
 */
export function boxesSee(calendar: Calendar, events: EventApi[]): void {
    const key: string = JSON.stringify([
        dayOf(calendar.view.currentStart),
        ...events
            .filter((event: EventApi): boolean => event.source?.id === "log")
            .map((event: EventApi): string[] => [event.id, event.startStr, event.endStr]),
    ]);
    if (key === seen) return;
    seen = key;
    boxesAgain(calendar);
}

/**
 * Loads the list of the shown day again, as its plan lies in the files now,
 * like when I come back to the page;
 * says so in the list when the reader cannot answer.
 */
export function boxesAgain(calendar: Calendar): void {
    boxesLoad(calendar).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("plan-boxes")
            ?.replaceChildren(entryPartOf("p", "plan-none", ["The plan cannot be read"]));
    });
}

/**
 * Logs a box dropped into the log, at the time of the drop;
 * a box without category opens the entry by category of the log instead.
 * Takes the dropped entry out of the calendar again,
 * because only the reader writes entries.
 * The box is found again by its identifier among the open ones,
 * so a list loaded anew while I drag, like after a change on another device,
 * logs the box I dragged, never the one that took its place.
 */
export function boxReceive(calendar: Calendar, info: EventReceiveInfo): void {
    info.revert();
    const box: Box | undefined = listedOf().find(
        (one: Box): boolean => one.state === "open" && one.id === info.draggedEl.dataset.id,
    );
    if (box === undefined) {
        logFailShow(new Error(`No open box ${info.draggedEl.dataset.id ?? ""}`));
        return;
    }
    const start: Date = info.event.start as Date;
    const end: Date = info.event.end as Date;
    (box.category === "" ? entryOpenFromBox(box, start, end) : boxLog(box.id, start, end)).catch(logFailShow);
}

/**
 * Follows an open box I press, see {@link boxesStart}:
 * once it moves, the arrow of the day after is outlined,
 * and the box let go on that arrow is pushed to the day after,
 * and the day view follows it there;
 * let go anywhere else, FullCalendar takes it, like into the log.
 * A press that ends without being let go here,
 * like one the browser takes for a scroll or one let go outside the window,
 * is followed no more, at the latest once the next press comes,
 * so a later click on the arrow never pushes a box pressed long before.
 */
function boxDragFollow(calendar: Calendar, down: PointerEvent): void {
    const item: HTMLElement | null = (down.target as HTMLElement).closest<HTMLElement>(".box-draggable");
    const day: HTMLElement | null = document.querySelector(".day");
    if (item === null) return;
    const move: (event: PointerEvent) => void = (event: PointerEvent): void => {
        if (Math.abs(event.clientX - down.clientX) + Math.abs(event.clientY - down.clientY) > 4)
            day?.classList.add("day-pushing");
    };
    const end: () => void = (): void => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", end);
        document.removeEventListener("pointerdown", end, true);
        day?.classList.remove("day-pushing");
    };
    const up: (event: PointerEvent) => void = (event: PointerEvent): void => {
        const rect: DOMRect | undefined = document.getElementById("day-next")?.getBoundingClientRect();
        end();
        if (
            rect === undefined ||
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        )
            return;
        boxPush(item.dataset.id ?? "")
            .then((): void => calendar.next())
            .catch(logFailShow);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", end);
    document.addEventListener("pointerdown", end, true);
}

/**
 * Starts the list after the router has put its HTML into the page:
 * the open boxes become draggable into the log, shown as an entry as long as it will be,
 * and the list loads again whenever the entry by category,
 * the dialog of a gift idea or of a series closes.
 */
export function boxesStart(calendar: Calendar): void {
    new Draggable(document.getElementById("plan-boxes") as HTMLElement, {
        itemSelector: ".box-draggable",
        eventData: (item: HTMLElement): { title: string; duration: { minutes: number }; category: string } => ({
            title: item.dataset.title ?? "",
            duration: { minutes: Number(item.dataset.minutes) },
            category: item.dataset.category ?? "",
        }),
    });
    document
        .getElementById("plan-boxes")
        ?.addEventListener("pointerdown", (event: PointerEvent): void => boxDragFollow(calendar, event));
    plusPut(document.getElementById("plan-new") as HTMLElement, "New box");
    document.getElementById("plan-new")?.addEventListener("click", (): void => {
        boxOpenNew(calendar.view.currentStart).catch((error: unknown): void => console.error(error));
    });
    const series: HTMLElement = document.getElementById("plan-series") as HTMLElement;
    iconPut(series, Repeat, "New series");
    series.classList.add("plus-quiet");
    series.addEventListener("click", (): void => {
        seriesNew(dayOf(calendar.view.currentStart), (): void => {}).catch((error: unknown): void =>
            console.error(error),
        );
    });
    ["entry", "gift", "series"].forEach((id: string): void =>
        document.getElementById(id)?.addEventListener("close", (): void => {
            boxesLoad(calendar).catch((error: unknown): void => console.error(error));
        }),
    );
}
