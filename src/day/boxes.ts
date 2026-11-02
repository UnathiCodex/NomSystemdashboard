/**
 * ## Boxes
 *
 * The plan of the shown day as a calm list of boxes beside the log.
 * Its birthdays and holidays at the top, each looking like a box, with my gift idea beside it.
 * Then the boxes like the stations of the day, in sections, the cancelled ones last.
 * Every box has the same lines, open or done, each one line with its whole text as tooltip.
 * No line counts the pushes, a box goes on as often as I push it.
 * A box with a deadline has no `Move`, since it stays on the day of its deadline.
 * Its sessions are dragged into the log and leave it open, only `Submit` makes it done.
 * An open box is dragged into the log at the real time, as long as its expected duration.
 * A box no longer open shows one grey icon for its state, a click on it takes that back.
 * A pushed box stays greyed on each day it left, once per push.
 * A box neither done nor cancelled is carried along once its day is over.
 * On its own day it stays open, so I can still log it there later, never counted as pushed.
 * A box without category opens the entry by category, since the log needs a category.
 * The list loads again when the shown day or its log changes,
 * since a box is done once a log entry points to it.
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
import { dayOf, dayTextOf, masterIs, skillName } from "../skill/attempts.ts";
import { skillGroups } from "./skill.ts";
import { calendarTodayOf } from "../today.ts";
import { iconOf, iconPut, plusPut } from "../icons.ts";
import { phone } from "../phone.ts";
import { readerAsk } from "../reader.ts";
import { ArrowLeft, ArrowRight, CalendarOff, Check, Gift, Repeat, X } from "lucide";

import type { Calendar, EventApi, EventReceiveInfo } from "fullcalendar";
import type { IconNode } from "lucide";
import type { BoxState, Logged, Moved, Occasion } from "../../reader/boxes.ts";
import type { Attendee, Link, Push } from "../../reader/calendar.ts";

/**
 * A box, as the reader sends it.
 *
 * - `id`: For an occurrence of a series with its start after `#`.
 * - `category`: Empty for a box without one, like a to-do another app wrote.
 * - `titleLink`: Its `ALTREP`, for a skill box the folder of its skill while I typed none.
 * - `day`: For a box with a deadline the day of its deadline.
 * - `deadline`: As ISO instant, or as its day alone when it has no time.
 * - `state`: Dropped is cancelled, pushed is pushed from the day it shows on.
 * - `log`: Of the log entry written from it, for a deadline box of its last session.
 * - `editable`: Whether it can be changed, pushed and dropped.
 * - `series`: Whether it is one occurrence of a series, whose bin takes that day alone out.
 * - `todo`: Whether it is a to-do, an event keeps its time and duration.
 * - `number`: Its number in its series, `NONE` for one the university cancelled.
 * - `group`: The group of a tutorial whose session it goes to.
 * - `moved`: Where it went, for a box greyed on a day it left or open on its own day.
 * - `file`: Its `.ics` file from `NomWorkspace` on.
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
    log: Logged | null;
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

/** The plan of a day, as the reader sends it. */
export type PlanDay = {
    day: string;
    occasions: Occasion[];
    boxes: Box[];
};

/** The plan of the shown day, as loaded last. */
let shown: PlanDay = { day: "", occasions: [], boxes: [] };

/** The boxes with a deadline carried along to the shown day, none for any day but today. */
let carried: Box[] = [];

/** Type of the boxes that go to a group, my tutorials. */
const groupedType: string = "TU";

/** What the list was loaded for last, so it loads again only when that changes. */
let seen: string = "";

/** How many loads of the list began, so only the answer of the last one shows. */
let loads: number = 0;

/** An element of an entry or a box, a line or a part of one. */
export function entryPartOf(tag: string, className: string, parts: (string | Node)[]): HTMLElement {
    const element: HTMLElement = document.createElement(tag);
    element.className = className;
    element.append(...parts);
    return element;
}

/**
 * What an entry or a box is, its category and its what, in bold so the list scans fast.
 * An old entry without its what shows its category alone.
 */
export function whatOf(category: string, what: string): (string | Node)[] {
    let text: string = what === "" ? category : `${category}: ${what}`;
    if (category === "") text = what;
    return [entryPartOf("strong", "entry-heading", [text])];
}

/** The shown what, on a phone a skill by its code and type alone, so it stays short. */
export function shownWhatOf(category: string, title: string, module: string, type: string): string {
    if (category !== skillName || !phone || module === "" || !title.startsWith(`${module}_`)) return title;
    return type === "" ? module : `${module} (${type})`;
}

/**
 * Loads the plans of the days of a range, `end` the day after the last.
 *
 * @throws {Error} - When the reader cannot answer
 */
export async function boxesFetch(start: string, end: string): Promise<PlanDay[]> {
    return readerAsk<PlanDay[]>(`/api/day/boxes?start=${start}&end=${end}`);
}

/**
 * Loads the boxes with a deadline carried along to today.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function carriedFetch(day: string): Promise<Box[]> {
    return readerAsk<Box[]>(`/api/day/carried?date=${day}`);
}

/**
 * The time line of a box, its expected times, since the log shows its real time.
 * Its own day stands first while it is open on a later day.
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
 * The deadline line of a box, its day, time and how near it is while open.
 * Its day is left out on that day itself, unless nothing else is left.
 */
function deadlinePartsOf(box: Box, day: string, nearShown: boolean): string[] {
    if (box.deadline === "") return [];
    const time: string = box.deadline === box.day ? "" : timeOf(new Date(box.deadline));
    const near: string = !nearShown || box.state !== "open" ? "" : nearOf(box.day, day);
    const rest: string[] = [time, near].filter((part: string): boolean => part !== "");
    return box.day === day && rest.length > 0 ? rest : [dayTextOf(box.day, true), ...rest];
}

/**
 * Gives a line its whole text as tooltip, since it ends in `…` where it is too long.
 * A text is given where the page draws more, like the dots between times.
 */
function titledOf(element: HTMLElement, text?: string): HTMLElement {
    element.title = text ?? element.textContent ?? "";
    return element;
}

/** A line of times with dots between, in one part so they stay together, `start` before the first. */
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
 * The lines of a box, open or done, as an entry of the log has them.
 * What it is, then time, place and group, then deadline, chapters and documents.
 * A document is cut in its middle, so its ending stays.
 * A line without anything to say is left out.
 *
 * @param nearShown - Whether to write how near its deadline is, not for a box carried along
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
 * The chapters of a skill box, each a link to its page in the scripts view.
 * Plain on a phone, which has no scripts view, and for a box that names no module.
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
 * The documents a box will use, by the last part of their path.
 * A folder an older box links shows as its chapter or not at all.
 */
function topicsOf(box: Box): string[] {
    return box.links.filter((link: Link): boolean => link.fingerprint !== "").map(linkNameOf);
}

/**
 * The birthdays and holidays of a day, each like a box with my gift idea beside it.
 * No buttons, since it is never logged, a click opens its gift idea.
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
 * Logs a box as expected with one tap, one without category opens the entry by category.
 *
 * @throws {Error} - When the reader does not log it, or does not answer
 */
async function boxTap(calendar: Calendar, box: Box): Promise<void> {
    const [start, end]: [Date, Date] = boxTimesOf(box, calendar.view.currentStart);
    await (box.category === "" ? entryOpenFromBox(box, start, end) : boxLog(box.id, start, end));
}

/**
 * A click on a box, a moved one leads to the day it stands on now.
 * One that can be changed opens to change it, an open one that cannot opens a log entry.
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
 * The state of a box no longer open, the grey icon of the action that made it.
 * A click takes it back, a box that cannot be changed has its icon alone unless done.
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

/** The icon of a state, a button where `back` can take it back, else the icon alone. */
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

/** Says above the list that the reader did not log a box, until the list loads again. */
function logFailShow(error: unknown): void {
    console.error(error);
    document.getElementById("plan-error")?.removeAttribute("hidden");
}

/** The actions of an open box, each but `Log` loads the list again after its change. */
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

/** Whether a box is a tutorial of a module, which names its group. */
function tutorialIs(box: Box): boolean {
    return box.category === skillName && box.type === groupedType && box.module !== "";
}

/**
 * A box of the list, its actions at its right while open, else its state.
 * An open box whose day is over and that is not carried along is greyed, yet keeps its actions.
 * Its data are for the drag into the log.
 * `--box-lines` sets its actions or state in the middle of all its lines.
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

/** Sections of the plan, in order, the first named as the Skill list names its groups. */
const sections: string[] = [...skillGroups, "Living", "Health"];

/**
 * The section of a box by its plan, in `Skilling` as the Skill list groups its skill.
 * Else the name of its folder.
 */
function sectionOf(box: Box): string {
    const [folder, file]: string[] = box.file.split("/").slice(-2);
    if (folder !== "Skilling") return folder;
    return masterIs(file) ? "Master" : "Projects";
}

/** The boxes of the shown day, then those carried along. */
function listedOf(): Box[] {
    return [...shown.boxes, ...carried];
}

/**
 * Shows the birthdays and holidays, then the boxes in their sections, the cancelled last.
 * A calm hint when the day has none.
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
 * Loads and shows the plan of the shown day, on today with the boxes carried along.
 * It shows nothing when another day or a later load came meanwhile, so a saved change never shows as before.
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

/** Loads the list again when the shown day or its log changed, since a box is done once logged. */
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

/** Loads the list again from the files, and says so when the reader cannot answer. */
export function boxesAgain(calendar: Calendar): void {
    boxesLoad(calendar).catch((error: unknown): void => {
        console.error(error);
        document
            .getElementById("plan-boxes")
            ?.replaceChildren(entryPartOf("p", "plan-none", ["The plan cannot be read"]));
    });
}

/**
 * Logs a box dropped into the log at the time of the drop.
 * The dropped entry is taken out again, because only the reader writes entries.
 * The box is found by its identifier, so a list loaded anew while I drag logs the box I dragged.
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
 * Follows an open box I press, let go on the arrow of the day after it is pushed there.
 * Let go anywhere else, FullCalendar takes it.
 * A press that never ends here, like a scroll, is dropped at the next press,
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
 * Starts the list, its open boxes draggable into the log.
 * It loads again whenever the entry, gift or series dialog closes.
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
