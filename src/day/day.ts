/**
 * ## Day
 *
 * Shows the log of a day as my one calendar, a time grid of one column,
 * and beside it the plan of the day,
 * not as a calendar but as a calm list of boxes, see `boxes.ts`;
 * above both the date of the day between its arrows,
 * with a small icon back to today on any other day;
 * at the right the trackers of the day, my sleep, my glasses of water and my food,
 * and below them the daily note with my gratitude and my points about the day at its top;
 * a phone shows only plan or log, see {@link phoneShow}.
 * A click on the date opens a month to pick any day from, see `month.ts`.
 * The log is written by category:
 * `+` below the time grid opens the entry by category for the last half hour,
 * a range selected in the time grid for that range,
 * on a phone by a short press into the grid and pulling it down over the time,
 * as in Google Calendar; a click on an entry changes it.
 * Entries are moved and resized by dragging,
 * and the reader writes their new times alone into their files.
 * Entries look as Google Calendar shows them, see {@link entryContentOf}.
 * The kcal of a meal stay hidden for a try; the dialog and the trackers show them.
 * A glass of water does not show in the log at all,
 * since the counter of the trackers counts it.
 * The day opens on today's calendar date, which turns at 00:00, also after a reload,
 * and while it shows today it moves on with it;
 * only a link to a day, like from the food view, opens on that day,
 * which the address then keeps no more, see `today.ts`.
 * The day loads anew the moment a file of my new system changes, whoever changed it,
 * see `../changes.ts`, so it never shows what the files held before;
 * a change that comes while a dialog is open waits until it closes, see {@link dayAgain}.
 * The grid runs over the calendar day, from 00:00 to 24:00, and opens at 06:00;
 * an entry past midnight shows on both days, cut at midnight.
 *
 * - `./note.ts`, `./evening.ts`: Loaded with `import()` after the calendar,
 *   see {@link noteStart}.
 * - `./day.css` and the other stylesheets: Look of the day, one stylesheet per part.
 */

import { Calendar } from "fullcalendar";
import timeGridPlugin from "fullcalendar/timegrid";
import interactionPlugin from "fullcalendar/interaction";
import themePlugin from "fullcalendar/themes/forma";
import englishLocale from "fullcalendar/locales/en-gb";
import { entryMove } from "./entries.ts";
import { categoriesStart, entryOpen, entryOpenEdit, entryOpenNow } from "./categories.ts";
import { boxesAgain, boxesSee, boxesStart, boxReceive, entryPartOf, shownWhatOf, whatOf } from "./boxes.ts";
import { monthStart } from "./month.ts";
import { giftsStart } from "./gifts.ts";
import { searchStart } from "./search.ts";
import { swipeStart } from "./swipe.ts";
import { labelOf, whereLinkedOf, whereOf } from "./places.ts";
import { trackersSee } from "./trackers.ts";
import { rangeDash, timeOf, timesStart } from "./times.ts";
import { dayOf, dayTextOf } from "../skill/attempts.ts";
import { askedDayOf, calendarTodayOf, todayFollow } from "../today.ts";
import { changesFollow } from "../changes.ts";
import { iconOf, iconPut, plusPut } from "../icons.ts";
import { timerSee, timerStart } from "../timer.ts";
import { phone } from "../phone.ts";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, Repeat } from "lucide";
import "fullcalendar/skeleton.css";
import "fullcalendar/themes/forma/theme.css";
import "./day.css";
import "./search.css";
import "./month.css";
import "./trackers.css";
import "./boxes.css";
import "./note.css";
import "./meal.css";
import "./log.css";
import "./choices.css";

import type {
    DateSelectInfo,
    DatesSetInfo,
    EventApi,
    EventChangeInfo,
    EventClickInfo,
    EventDisplayInfo,
    EventDragStartInfo,
    EventDragStopInfo,
    EventInput,
    EventReceiveInfo,
    EventResizeStartInfo,
    EventSourceInput,
} from "fullcalendar";

/**
 * Minutes of the time grid one line of a taller entry fills, about 15:
 * half an hour of the grid is 2.05rem high, twice the margin `--slot-margin`, 0.525rem,
 * and once the line of an hour label, 1rem, see `.slot-label` in `log.css`,
 * and a line of a taller entry 1.015625rem, its text of 0.8125rem,
 * as a box of the plan, at a line height of 1.25, see `.entry-inner`;
 * a short one, as low as `eventShortHeight` in {@link dayStart} or lower,
 * has no space above and below its one line, 0.975rem high at a line height of 1.2,
 * so a quarter hour, 1.025rem high less the 1px below it, holds it.
 */
const lineMinutes: number = (1.015625 / 2.05) * 30;

/**
 * Minutes of the time grid the space above and below the lines of a taller entry fills,
 * 0.42rem above its first line and as much below its last,
 * 0.84rem of the 2.05rem of half an hour, see `.entry-inner` in `log.css`.
 */
const spaceMinutes: number = (0.84 / 2.05) * 30;

/**
 * Minutes of the time grid an entry loses to its edge and to the gap below it,
 * about 4 px of the 82 px of an hour at the root of 20 px.
 */
const edgeMinutes: number = (4 / 82) * 60;

/**
 * Shows the daily note of a day, with my gratitude and my points about the day;
 * does nothing until {@link noteStart} has loaded them.
 */
let dayNoteShow: (date: string) => void = (): void => {};

/**
 * Hours of the time grid, from 00:00 to 24:00 of the shown day.
 */
const gridHours: number = 24;

/**
 * Event source of the log of the reader.
 * FullCalendar takes the field `editable` of each entry,
 * so only entries that can be changed are dragged or react to a click;
 * a glass of water does not show, since the counter of the trackers counts it.
 */
function logSourceOf(): EventSourceInput {
    return {
        id: "log",
        url: "/api/day/log",
        eventDataTransform: (entry: EventInput): EventInput => {
            if (entry.glass === true) return { ...entry, display: "none" };
            return { ...entry, interactive: entry.editable === true };
        },
    };
}

/**
 * Opens the entry by category to change a clicked entry;
 * one that cannot be changed, like an occurrence of a series, stays as it is.
 */
function entryClick(info: EventClickInfo): void {
    if (info.event.startEditable === true)
        entryOpenEdit(info.event).catch((error: unknown): void => console.error(error));
}

/**
 * Pixels per second the time grid scrolls at most while an entry is dragged to its edge:
 * a whole day of 24 hours, 1,920 px, in about a second,
 * so an entry dragged up from the evening reaches 00:00 in one go.
 */
const edgeSpeed: number = 2000;

/**
 * Ends the scrolling of the time grid at its edges, `null` while no entry is dragged.
 */
let edgeScrollEnd: (() => void) | null = null;

/**
 * Scrolls the time grid while an entry is dragged or resized
 * and the pointer stands near its top or bottom edge, within 4rem of it or beyond,
 * the nearer the faster, as Google Calendar does;
 * and moves the entry along with every scroll, also one of the wheel,
 * by telling FullCalendar that the pointer moved where it stands,
 * so the entry stays under it and stops at 00:00 when the grid reaches its top.
 * FullCalendar's own scrolling stays off, see `dragScroll` in {@link dayStart},
 * since it kept the scroll of the start and threw a scroll of the wheel back,
 * like from 00:00 to 15:00.
 */
function edgeScrollStart(entry: HTMLElement, pointer: MouseEvent): void {
    const grid: HTMLElement = gridOf(entry);
    let x: number = pointer.clientX;
    let y: number = pointer.clientY;
    let last: number = performance.now();
    let frame: number = 0;
    const follow: () => void = (): void => {
        document.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: x,
                clientY: y,
                bubbles: true,
                buttons: 1,
            }),
        );
    };
    const move: (event: PointerEvent) => void = (event: PointerEvent): void => {
        x = event.clientX;
        y = event.clientY;
    };
    const step: (now: number) => void = (now: number): void => {
        const rect: DOMRect = grid.getBoundingClientRect();
        const zone: number = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        const depth: number =
            x < rect.left || x > rect.right
                ? 0
                : Math.min(zone, Math.max(0, rect.top + zone - y)) -
                  Math.min(zone, Math.max(0, y - rect.bottom + zone));
        grid.scrollTop -= (Math.sign(depth) * edgeSpeed * (depth / zone) ** 2 * (now - last)) / 1000;
        last = now;
        frame = requestAnimationFrame(step);
    };
    edgeScrollEnd?.();
    grid.addEventListener("scroll", follow);
    document.addEventListener("pointermove", move);
    frame = requestAnimationFrame(step);
    edgeScrollEnd = (): void => {
        cancelAnimationFrame(frame);
        grid.removeEventListener("scroll", follow);
        document.removeEventListener("pointermove", move);
        edgeScrollEnd = null;
    };
}

/**
 * An entry dragged to the edge of the time grid or onto an arrow of the date,
 * see {@link entryTurn}, so its drop in the grid itself,
 * which FullCalendar reports right after, is taken back, see {@link entryDrag};
 * `null` again when the next drag or resize starts,
 * since a drop on a strip outside the grid brings no drop in it,
 * and the next resize of that entry, on the day it moved to, was taken back.
 */
let turning: { id: string; days: number } | null = null;

/**
 * Whether the day was to load anew while a dialog was open,
 * so it loads once the dialog closes, see {@link dayAgain}.
 */
let missed: boolean = false;

/**
 * Writes the new start and end of an entry moved or resized by dragging into its file,
 * see `entryMove` in `entries.ts`;
 * puts it back where it was when the reader does not take the change;
 * a drop that turns it to another day, see {@link entryTurn}, it takes back,
 * since the entry moves to that day instead.
 */
function entryDrag(calendar: Calendar, info: EventChangeInfo): void {
    const entry: EventApi = info.event;
    if (turning?.id === entry.id) {
        turning = null;
        info.revert();
        return;
    }
    entryMove(entry.id, entry.start as Date, entry.end as Date).catch((error: unknown): void => {
        console.error(error);
        info.revert();
    });
}

/**
 * Tells whether a point of the screen lies in an element, never for one not shown.
 */
function pointIn(element: HTMLElement | null, x: number, y: number): boolean {
    const rect: DOMRect | undefined = element?.getBoundingClientRect();
    return (
        rect !== undefined && rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
}

/**
 * Tells to which day a point turns a dragged entry, -1, 1, or 0 for none:
 * a strip at the edge of the time grid or an arrow of the date.
 */
function turnOf(x: number, y: number): number {
    if (pointIn(document.querySelector(".day-turn-back"), x, y) || pointIn(document.getElementById("day-back"), x, y))
        return -1;
    if (pointIn(document.querySelector(".day-turn-next"), x, y) || pointIn(document.getElementById("day-next"), x, y))
        return 1;
    return 0;
}

/**
 * Lights the strip of the day the pointer would turn a dragged entry to.
 */
function turnNear(event: PointerEvent): void {
    const days: number = turnOf(event.clientX, event.clientY);
    document.querySelector(".day-turn-back")?.classList.toggle("day-turn-near", days === -1);
    document.querySelector(".day-turn-next")?.classList.toggle("day-turn-near", days === 1);
}

/**
 * Shows the two strips of the days before and after while an entry is dragged,
 * as Google Calendar turns the day when an entry is pulled to its edge:
 * one over the times at the left of the time grid, one at its right edge,
 * each its arrow and the weekday it leads to,
 * and the arrows of the date outlined, which take an entry too;
 * hides them when the drag stops.
 */
function turnShow(calendar: Calendar, shown: boolean): void {
    const day: HTMLElement | null = document.querySelector(".day");
    day?.classList.toggle("day-turning", shown);
    if (!shown) {
        document.removeEventListener("pointermove", turnNear);
        return;
    }
    const grid: DOMRect = (document.getElementById("day-calendar") as HTMLElement).getBoundingClientRect();
    const lane: number =
        document.querySelector("#day-calendar [role='gridcell']")?.getBoundingClientRect().left ?? grid.left + 48;
    const back: HTMLElement = document.querySelector(".day-turn-back") as HTMLElement;
    const next: HTMLElement = document.querySelector(".day-turn-next") as HTMLElement;
    const weekdayOf: (days: number) => string = (days: number): string => {
        const date: Date = new Date(calendar.view.currentStart);
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString("en-GB", { weekday: "short" });
    };
    back.replaceChildren(iconOf(ChevronLeft), weekdayOf(-1));
    next.replaceChildren(iconOf(ChevronRight), weekdayOf(1));
    Object.assign(back.style, {
        left: `${grid.left}px`,
        top: `${grid.top}px`,
        width: `${lane - grid.left}px`,
        height: `${grid.height}px`,
    });
    Object.assign(next.style, {
        left: `${grid.right - (lane - grid.left)}px`,
        top: `${grid.top}px`,
        width: `${lane - grid.left}px`,
        height: `${grid.height}px`,
    });
    document.addEventListener("pointermove", turnNear);
}

/**
 * Moves an entry dropped on a strip of the day before or after,
 * or on an arrow of the date, to that day at the same time of day,
 * and the day view follows it there, as Google Calendar does.
 */
function entryTurn(calendar: Calendar, info: EventDragStopInfo): void {
    const days: number = turnOf(info.jsEvent.clientX, info.jsEvent.clientY);
    turnShow(calendar, false);
    if (days === 0) return;
    const entry: EventApi = info.event;
    const start: Date = new Date(entry.start as Date);
    const end: Date = new Date((entry.end ?? entry.start) as Date);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    turning = { id: entry.id, days: days };
    entryMove(entry.id, start, end)
        .then((): void => calendar.incrementDate({ days: days }))
        .catch((error: unknown): void => console.error(error));
}

/**
 * Minutes of the shown part of an entry of the time grid, cut to the shown day:
 * a Sleep from 23:00 to 07:00 shown from 23:00 to 24:00 counts that hour.
 */
function shownMinutesOf(info: EventDisplayInfo): number {
    const start: Date = info.event.start as Date;
    const end: Date = info.event.end ?? start;
    const day: Date = info.view.currentStart;
    const top: number = Math.max(start.getTime(), day.getTime());
    const bottom: number = Math.min(
        end.getTime(),
        new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime(),
    );
    return (bottom - top) / (60 * 1000);
}

/**
 * Lines an entry of the time grid has room for, at least 1, its shown part
 * less its edge and the space above its first line and below its last,
 * so no line is cut at the bottom:
 * half an hour one, 45 minutes two, its place beside its time,
 * an hour three, its place on the third, and 75 minutes four.
 * A short entry, see `eventShortHeight` in {@link dayStart}, has room for one line.
 */
function linesOf(info: EventDisplayInfo): number {
    if (info.isShort) return 1;
    const minutes: number = shownMinutesOf(info) - edgeMinutes - spaceMinutes;
    return Math.max(1, Math.floor(minutes / lineMinutes));
}

/**
 * Tells whether an entry of the time grid is the range being selected,
 * which FullCalendar draws as an entry, see `selectMirror` in {@link dayStart}:
 * the only one without category and what,
 * since every entry of the log and every box dragged into it has one of them.
 */
function selectionIs(info: EventDisplayInfo): boolean {
    return info.isMirror && info.event.title === "" && (info.event.extendedProps.category ?? "") === "";
}

/**
 * Content of an entry of the log, as Google Calendar shows one: what first in bold,
 * then its time in the light grey of a time, then its place lighter still;
 * a dish shows its summary, which leaves its drinks out.
 * A room of the university shows what its name holds in brackets,
 * which the plan leaves out.
 * A route without room for where it starts shows `…` in its place, never a part of it,
 * and never cuts its goal, see {@link linesFit}.
 * A tutorial ends its line with the group I went to, as its box in the plan does.
 * Every line stays one line: the place gives way first where a line is too narrow,
 * then what, each cut with an ellipsis, see `log.css`;
 * so the whole entry is its tooltip.
 * The range being selected shows only its start and end.
 * - An entry with room for one line shows what, its time and its place,
 *   parted by a middle dot, never by commas, since names hold commas;
 *   where an entry is narrower than what and its time, as on a phone,
 *   what stays whole and its time moves onto a next line, which the entry hides.
 * - An entry with room for two lines shows what on its first line,
 *   its time and place on its second, as a box of the plan writes them;
 *   with room for three or more its place on a third line of its own,
 *   and below them its note, as many lines of it as are left.
 * - `content`: All lines, as high as the lines the entry has room for,
 *   so a line never shows cut in half at the bottom of the entry.
 */
function entryContentOf(info: EventDisplayInfo): { domNodes: HTMLElement[] } {
    const category: string = info.event.extendedProps.category ?? "";
    const shownWhat: string = shownWhatOf(
        category,
        info.event.title,
        info.event.extendedProps.module ?? "",
        info.event.extendedProps.type ?? "",
    );
    const what: string = shownWhat === category ? "" : shownWhat;
    const from: string = info.event.extendedProps.from ?? "";
    const location: string = info.event.extendedProps.location ?? "";
    const online: string = info.event.extendedProps.online ?? "";
    const place: string = whereOf(category, from, location, online);
    const link: string = info.event.extendedProps.locationLink ?? "";
    const onlineLink: string = info.event.extendedProps.onlineLink ?? "";
    const route: (string | Node)[] = whereLinkedOf(category, from, labelOf(location), link, online, onlineLink);
    const where: (string | Node)[] =
        route.length === 3 ? [entryPartOf("span", "route-start", [route[0]]), ...route.slice(1)] : route;
    const group: string =
        (info.event.extendedProps.group ?? "") === "" ? "" : `Group ${info.event.extendedProps.group}`;
    const tail: HTMLElement[] =
        place === "" && group === ""
            ? []
            : [
                  entryPartOf("span", "entry-place entry-parted entry-beside", [
                      ...where,
                      ...(group === "" ? [] : place === "" ? [group] : [entryPartOf("span", "entry-parted", [group])]),
                  ]),
              ];
    const note: string = (info.event.extendedProps.note ?? "").trim();
    const start: Date = info.event.start as Date;
    const end: Date = info.event.end ?? start;

    const time: string = `${timeOf(start)}${rangeDash}${timeOf(end)}`;
    const lines: number = linesOf(info);
    const whole: (string | Node)[] = whatOf(category, what);
    let shown: HTMLElement[];
    if (selectionIs(info)) shown = [entryPartOf("div", "entry-time", [time])];
    else if (lines < 2) {
        const line: HTMLElement = entryPartOf("div", "entry-line", [
            entryPartOf("span", "entry-what", whatOf(category, what)),
            entryPartOf("span", "entry-time entry-parted", [time]),
        ]);
        line.append(...tail);
        shown = [line];
    } else {
        const placeBelow: boolean = lines > 2 && tail.length > 0;
        const timeLine: HTMLElement = entryPartOf("div", "entry-line", [
            entryPartOf("span", "entry-time", [time]),
            ...(placeBelow ? [] : tail),
        ]);
        shown = [
            entryPartOf("div", "entry-whole", whole),
            timeLine,
            ...(placeBelow
                ? [
                      entryPartOf("div", "entry-place", [
                          ...where,
                          ...(group === ""
                              ? []
                              : place === ""
                                ? [group]
                                : [entryPartOf("span", "entry-parted", [group])]),
                      ]),
                  ]
                : []),
        ];
        if (note !== "" && lines > shown.length) {
            const below: HTMLElement = entryPartOf("div", "entry-note", [note]);
            below.style.webkitLineClamp = String(lines - shown.length);
            shown.push(below);
        }
    }
    const content: HTMLElement = entryPartOf("div", "entry-lines", shown);
    content.title = [
        whole
            .map((part: string | Node): string => (typeof part === "string" ? part : (part.textContent ?? "")))
            .join(""),
        [time, place.replace("->", "→"), group].filter((part: string): boolean => part !== "").join(" · "),
        note,
    ]
        .filter((text: string): boolean => text !== "")
        .join("\n");
    content.style.maxHeight = `${lines}lh`;
    content.dataset.lines = String(lines);
    requestAnimationFrame((): void => linesFit(content, gridOf(content)));
    return { domNodes: [content] };
}

/**
 * Fits the lines of an entry to the part of it in sight:
 * scrolled partly out of sight at the top,
 * an entry keeps its lines 0.42rem below the top of the grid,
 * as `.entry-lines` in `log.css` makes them stick,
 * and those its rest has no more room for hide as a whole from the bottom,
 * so no line is ever cut at the top and `Sleep: Night` stays in sight the longest.
 * A line that an entry on top of it covers, see `slotEventOverlap` in {@link dayStart},
 * ends as far before that entry as before the right edge of its own,
 * and gives way there in the same order, the place first, see `log.css`.
 * Where a way starts, `.route-start`, stands whole where it has room, else `…` alone.
 * Lines no longer on the page,
 * like those of the copy FullCalendar draws while an entry is dragged, stay as they are.
 * - `harness`: Box FullCalendar places the entry in, with its z-index,
 *   among those of the other entries of its column.
 * - `over`: Where the entries on top of it stand,
 *   those of its column with a higher z-index.
 */
function linesFit(lines: HTMLElement, grid: HTMLElement): void {
    const inside: HTMLElement | null = lines.parentElement;
    const harness: HTMLElement | null = inside?.parentElement?.parentElement ?? null;
    if (inside === null || harness === null) return;
    const top: number = grid.getBoundingClientRect().top + parseFloat(getComputedStyle(lines).top);
    const bottom: number = inside.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inside).paddingBottom);
    const room: number = Math.floor((bottom - top) / parseFloat(getComputedStyle(lines).lineHeight));
    const shownLines: number = Math.max(0, Math.min(Number(lines.dataset.lines), room));
    lines.style.maxHeight = `${shownLines}lh`;
    const depth: number = Number(getComputedStyle(harness).zIndex);
    const over: DOMRect[] = [...(harness.parentElement?.children ?? [])]
        .filter((other: Element): boolean => Number(getComputedStyle(other).zIndex) > depth)
        .map((other: Element): DOMRect => (other.firstElementChild as Element).getBoundingClientRect());
    const end: number = parseFloat(getComputedStyle(inside).paddingInlineEnd);
    for (const line of lines.children as HTMLCollectionOf<HTMLElement>) {
        const rect: DOMRect = line.getBoundingClientRect();
        const edge: number = Math.min(
            ...over
                .filter((box: DOMRect): boolean => box.top < rect.bottom && box.bottom > rect.top)
                .map((box: DOMRect): number => box.left),
        );
        line.style.maxWidth = edge === Infinity ? "" : `${Math.max(0, edge - end - rect.left)}px`;
    }
    for (const start of lines.querySelectorAll<HTMLElement>(".route-start")) {
        const whole: string = start.dataset.whole ?? start.textContent ?? "";
        start.dataset.whole = whole;
        start.textContent = whole;
        if (start.scrollWidth > start.clientWidth) start.textContent = "…";
    }
}

/**
 * The grid of the log around an element in it: the nearest box around it that scrolls,
 * the whole page for an element no longer on it.
 */
function gridOf(element: HTMLElement): HTMLElement {
    let grid: HTMLElement = element;
    while (grid.parentElement !== null && getComputedStyle(grid).overflowY !== "auto") grid = grid.parentElement;
    return grid;
}

/**
 * Shows the date of the shown day above plan and log, always fully readable,
 * with the icon back to today and its daily note;
 * the boxes and the trackers follow the entries of the log,
 * see `eventsSet` in {@link dayStart}.
 */
function dayShow(info: DatesSetInfo): void {
    const date: string = info.startStr.slice(0, 10);
    (document.getElementById("day-date") as HTMLElement).textContent = dayTextOf(date, true);
    todayButtonShow(date);
    dayNoteShow(date);
}

/**
 * Turns the small icon back to today on while the shown day is another day;
 * on today it shows faded and off, so the bar looks the same on every day;
 * also once the day turned at 00:00 while the day stays, see `todayFollow` in `today.ts`.
 */
function todayButtonShow(date: string): void {
    (document.getElementById("day-today") as HTMLButtonElement).disabled = date === calendarTodayOf();
}

/**
 * Shows plan or log on a phone, one at a time,
 * the repeat for a new series only beside the plan, since a series is one of the plan;
 * the time grid, which measures itself again once it shows, scrolls to now then.
 */
function phoneShow(calendar: Calendar, shown: "plan" | "log"): void {
    const main: HTMLElement = document.getElementById("day-main") as HTMLElement;
    main.dataset.shown = shown;
    for (const part of ["plan", "log"])
        document.getElementById(`day-show-${part}`)?.setAttribute("aria-pressed", String(shown === part));
    (document.getElementById("day-series") as HTMLButtonElement).hidden = shown === "log";
    if (shown === "log") nowCenter(calendar);
}

/**
 * Scrolls the time grid so that now stands about in its middle,
 * its top on the full hour before, so the label of no hour is cut at the top,
 * at each load of the page and when the day moves on to the new day by itself;
 * just after midnight the grid cannot scroll above 00:00,
 * so now simply stands near its top.
 * A day without now keeps `scrollTime`, 06:00 at the top.
 * It hands the time for the top to `scrollToTime`,
 * which FullCalendar keeps and applies again once it has measured the grid,
 * so nothing undoes it.
 */
function nowCenter(calendar: Calendar): void {
    const hours: number = (Date.now() - calendar.view.currentStart.getTime()) / (60 * 60 * 1000);
    if (hours < 0 || hours > gridHours) return;
    const root: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    const hourHeight: number =
        2 * (1 + 2 * parseFloat(root.getPropertyValue("--slot-margin"))) * parseFloat(root.fontSize);
    const visibleHours: number = (document.getElementById("day-calendar") as HTMLElement).clientHeight / hourHeight;
    calendar.scrollToTime({ hours: Math.max(0, Math.floor(hours - visibleHours / 2)) });
}

/**
 * Loads the shown day again, as it lies in the files now,
 * whenever the page becomes visible and the moment a file of my new system changes:
 * its log, with its trackers, its plan,
 * and its note but while I type in a field, so nothing typed gets lost;
 * nothing while a dialog is open, which keeps the entry as it opened,
 * but once it closes, see {@link missed}.
 */
function dayAgain(calendar: Calendar): void {
    const typing: boolean = document.activeElement?.matches("input, textarea, [contenteditable='true']") ?? false;
    missed = document.querySelector("dialog[open]") !== null;
    if (missed) return;
    calendar.refetchEvents();
    boxesAgain(calendar);
    if (!typing) dayNoteShow(dayOf(calendar.view.currentStart));
}

/**
 * Loads the daily note with `import()`, its Markdown renderer with it,
 * starts my gratitude and my points about the day,
 * and shows them for the shown day and from then on for every day shown.
 * `evening.ts` comes first, since it loads `note.ts` too, which is then at hand at once.
 */
async function noteStart(calendar: Calendar): Promise<void> {
    const evening: {
        eveningShow: (day: string) => Promise<void>;
        eveningStart: () => void;
    } = await import("./evening.ts");
    const note: { noteShow: (date: string) => Promise<void> } = await import("./note.ts");
    evening.eveningStart();
    dayNoteShow = (date: string): void => {
        note.noteShow(date).catch((error: unknown): void => console.error(error));
        evening.eveningShow(date).catch((error: unknown): void => console.error(error));
    };
    dayNoteShow(dayOf(calendar.view.currentStart));
}

/**
 * Starts the day after the router has put its HTML into the page,
 * on the day a link asks for or today's calendar date, see `askedDayOf` in `today.ts`,
 * with its buttons, the swipe of a phone, the daily note and the timer of a session.
 * While the grid scrolls, the lines of every entry fit to the part of it in sight,
 * see {@link linesFit}; the calendar catches the scroll on its way down to the grid,
 * `capture`, since it never rises;
 * they fit again when the grid changes its size, like with the window,
 * since FullCalendar then moves the entries without drawing their lines anew.
 * - `headerToolbar`: None, since the date and its buttons stand above plan
 *   and log together.
 * - `allDaySlot`: Left out, since no entry of my log lasts a whole day.
 * - `slotHeaderInnerClass`: So `log.css` sets the size of the hour labels
 *   and with it the height of the slots.
 * - `eventShortHeight`: Makes entries short that have no room for one line with the space
 *   above and below it, as high as 36 px in the grid or lower:
 *   such a line needs 37 px at the page's root size of 20 px, 0.42rem above,
 *   a line of 1.0125rem and 0.42rem below, see `.entry-inner` in `log.css`,
 *   and the inside of an entry is 3 px lower than its place in the grid;
 *   so an entry of a quarter hour is short, one of half an hour, 41 px, is not.
 * - `eventMinHeight`: As high as a quarter hour, 20 px, so a shorter one,
 *   like ten minutes of my neck routine, still shows its line whole.
 * - `blockEventInnerClass`: So `log.css` cuts the lines at the edge of the entry
 *   instead of letting them stick out.
 * - `snapDuration`: Steps of 15 minutes, while the grid keeps a line every 30 minutes.
 * - `dragScroll`: FullCalendar's own scrolling at the edges is off,
 *   since it threw a scroll of the wheel back, see {@link edgeScrollStart}.
 * - `eventSourceSuccess`: Loads the trackers and the timer again each time the log
 *   was read, so an entry saved, ended or removed shows there at once.
 * - `selectMirror`: Draws the range being selected as an entry in front of the others,
 *   since FullCalendar's own grey of a selection lies behind the entries,
 *   so a range over an entry,
 *   like an hour of food during a workshop, showed only in the free strip beside it.
 * - `select`: Lets go of the range at once,
 *   so it never stays in the log as if it were an entry
 *   once the dialog is closed, also with `Esc`.
 * - `selectLongPressDelay`: Starts a selection on a phone after a short press of 300 ms,
 *   in place of FullCalendar's long press of a second,
 *   so a finger presses into the time grid and pulls the range down over the time,
 *   as in Google Calendar; a swipe moves at once, so it scrolls the grid,
 *   and once the grid scrolled FullCalendar selects nothing.
 *   An entry keeps the long press of a second before it is dragged,
 *   so a slow tap never moves it.
 * - `slotEventOverlap`: Lets an entry at the same time
 *   as a longer one lie over the right part of it, as in Google Calendar,
 *   so the longer one keeps its text at its left.
 * - `nowIndicatorLineClass`, `nowIndicatorDotClass`: So `log.css` draws the line of now
 *   calm grey behind the entries, never through their text.
 * - `slotMinTime`, `slotMaxTime`: The calendar day,
 *   as the trackers and the done boxes count it.
 *
 * The theme keeps its own classes beside `slot-label`, `entry` and the others;
 * `log.css` wins because it comes after the theme's stylesheet.
 */
export function dayStart(): void {
    const calendar: Calendar = new Calendar(document.getElementById("day-calendar") as HTMLElement, {
        plugins: [timeGridPlugin, interactionPlugin, themePlugin],
        locale: englishLocale,
        initialView: "timeGridDay",
        initialDate: askedDayOf() ?? calendarTodayOf(),
        height: "100%",
        headerToolbar: false,
        dayHeaders: false,
        allDaySlot: false,
        slotHeaderFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
        slotHeaderInnerClass: "slot-label",
        eventContent: entryContentOf,
        eventShortHeight: 36,
        eventMinHeight: 20,
        eventColor: "var(--log)",
        blockEventClass: (info: EventDisplayInfo): string => (selectionIs(info) ? "entry entry-selection" : "entry"),
        blockEventInnerClass: (info: EventDisplayInfo): string => {
            if (info.isShort) return "entry-inner entry-inner-short";
            return "entry-inner";
        },
        eventSources: [logSourceOf()],
        editable: true,
        snapDuration: "00:15:00",
        eventDrop: (info: EventChangeInfo): void => entryDrag(calendar, info),
        eventResize: (info: EventChangeInfo): void => entryDrag(calendar, info),
        dragScroll: false,
        eventDragStart: (info: EventDragStartInfo): void => {
            turning = null;
            turnShow(calendar, true);
            edgeScrollStart(info.el, info.jsEvent);
        },
        eventDragStop: (info: EventDragStopInfo): void => {
            edgeScrollEnd?.();
            entryTurn(calendar, info);
        },
        eventResizeStart: (info: EventResizeStartInfo): void => {
            turning = null;
            edgeScrollStart(info.el, info.jsEvent);
        },
        eventResizeStop: (): void => edgeScrollEnd?.(),
        droppable: true,
        eventReceive: (info: EventReceiveInfo): void => boxReceive(calendar, info),
        eventsSet: (events: EventApi[]): void => boxesSee(calendar, events),
        eventSourceSuccess: (): void => {
            trackersSee(calendar);
            timerSee();
        },
        eventClick: entryClick,
        selectable: true,
        selectMirror: true,
        selectLongPressDelay: 300,
        select: (info: DateSelectInfo): void => {
            calendar.unselect();
            entryOpen(info.start, info.end).catch((error: unknown): void => console.error(error));
        },
        slotEventOverlap: true,
        nowIndicator: true,
        nowIndicatorLineClass: "now-line",
        nowIndicatorDotClass: "now-dot",
        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        scrollTime: "06:00:00",
        datesSet: dayShow,
    });

    calendar.render();
    nowCenter(calendar);
    document.querySelector(".day")?.append(
        ...["day-turn day-turn-back", "day-turn day-turn-next"].map((name: string): HTMLElement => {
            const strip: HTMLElement = document.createElement("div");
            strip.className = name;
            return strip;
        }),
    );
    iconPut(document.getElementById("day-back") as HTMLElement, ChevronLeft, "Day before");
    iconPut(document.getElementById("day-next") as HTMLElement, ChevronRight, "Day after");
    plusPut(document.getElementById("log-new") as HTMLElement, "New entry");
    iconPut(document.getElementById("day-today") as HTMLElement, CalendarCheck, "Back to today");
    iconPut(document.getElementById("day-new") as HTMLElement, Plus, "New box or entry");
    iconPut(document.getElementById("day-series") as HTMLElement, Repeat, "New series");
    document.getElementById("day-show-plan")?.addEventListener("click", (): void => phoneShow(calendar, "plan"));
    document.getElementById("day-show-log")?.addEventListener("click", (): void => phoneShow(calendar, "log"));
    document.getElementById("day-new")?.addEventListener("click", (): void => {
        const shown: string = (document.getElementById("day-main") as HTMLElement).dataset.shown ?? "plan";
        document.getElementById(shown === "log" ? "log-new" : "plan-new")?.click();
    });
    document
        .getElementById("day-series")
        ?.addEventListener("click", (): void => document.getElementById("plan-series")?.click());
    document.getElementById("day-back")?.addEventListener("click", (): void => calendar.prev());
    document.getElementById("day-today")?.addEventListener("click", (): void => calendar.gotoDate(calendarTodayOf()));
    document.getElementById("day-next")?.addEventListener("click", (): void => calendar.next());
    if (phone)
        swipeStart(document.getElementById("day-main") as HTMLElement, (days: number): void =>
            calendar.incrementDate({ days: days }),
        );
    document.getElementById("day-calendar")?.addEventListener(
        "scroll",
        (event: Event): void => {
            const grid: HTMLElement = event.target as HTMLElement;
            for (const lines of grid.querySelectorAll<HTMLElement>(".entry-lines")) linesFit(lines, grid);
        },
        { capture: true },
    );
    new ResizeObserver((): void => {
        for (const lines of document.querySelectorAll<HTMLElement>("#day-calendar .entry-lines"))
            linesFit(lines, gridOf(lines));
    }).observe(document.getElementById("day-calendar") as HTMLElement);
    document.getElementById("log-new")?.addEventListener("click", (): void => {
        entryOpenNow(calendar).catch((error: unknown): void => console.error(error));
    });
    categoriesStart(calendar);
    boxesStart(calendar);
    monthStart(
        document.getElementById("day-title") as HTMLElement,
        (): string[] => [dayOf(calendar.view.currentStart)],
        (day: string): void => calendar.gotoDate(day),
    );
    todayFollow(
        (): string => dayOf(calendar.view.currentStart),
        (day: string): void => {
            calendar.gotoDate(day);
            nowCenter(calendar);
        },
        (): void => todayButtonShow(dayOf(calendar.view.currentStart)),
        (): void => dayAgain(calendar),
    );
    changesFollow((): void => dayAgain(calendar));
    document.addEventListener(
        "close",
        (): void => {
            if (missed) dayAgain(calendar);
        },
        { capture: true },
    );
    giftsStart();
    searchStart(calendar);
    timesStart();
    noteStart(calendar).catch((error: unknown): void => console.error(error));
    timerStart();
}
