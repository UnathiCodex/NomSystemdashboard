/**
 * ## Day
 *
 * The log of a day as a time grid of one column, the plan beside it as a list of boxes.
 * Above both the date between its arrows, at the right the trackers.
 * A phone shows plan or log, one at a time.
 * Entries move and resize by dragging, and the reader writes only their new times.
 * The kcal of a meal stay hidden for a try.
 * The day opens on today's calendar date and moves on with it at 00:00.
 * It loads anew the moment a file of my new system changes, after an open dialog closes.
 * The grid runs from 00:00 to 24:00 and opens at 06:00.
 * An entry past midnight shows on both days, cut at midnight.
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
import { changeAsk, shareStart } from "./share.ts";
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
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, Repeat, StickyNote } from "lucide";
import "fullcalendar/skeleton.css";
import "fullcalendar/themes/forma/theme.css";
import "./day.css";
import "./search.css";
import "./month.css";
import "./trackers.css";
import "./boxes.css";
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
import type { Attendee } from "../../reader/calendar.ts";

/**
 * Minutes one line of a taller entry fills, a line of 1.015625rem in half an hour of 2.05rem.
 * The 2.05rem are twice `--slot-margin` and the 1rem of an hour label, see `log.css`.
 */
const lineMinutes: number = (1.015625 / 2.05) * 30;

/** Minutes of the 0.42rem above the first line and below the last of a taller entry. */
const spaceMinutes: number = (0.84 / 2.05) * 30;

/** Minutes an entry loses to its edge and the gap below it, about 4 px of the 82 px of an hour. */
const edgeMinutes: number = (4 / 82) * 60;

/** Hours of the time grid, 00:00 to 24:00. */
const gridHours: number = 24;

/**
 * Event source of the log.
 * Only entries with `editable` drag or react to a click.
 * A glass of water does not show, since the counter of the trackers counts it.
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

/** Opens a clicked entry to change it, one that cannot change, like of a series, stays. */
function entryClick(info: EventClickInfo): void {
    if (info.event.startEditable === true)
        entryOpenEdit(info.event).catch((error: unknown): void => console.error(error));
}

/** Pixels per second the grid scrolls at most at its edge, so a drag reaches 00:00 in one go. */
const edgeSpeed: number = 2000;

/** Ends the scrolling of the grid at its edges, `null` while no entry is dragged. */
let edgeScrollEnd: (() => void) | null = null;

/**
 * Scrolls the grid while an entry is dragged within 4rem of its top or bottom, the nearer the faster.
 * Every scroll, also of the wheel, tells FullCalendar the pointer moved, so the entry stays under it.
 * FullCalendar's own `dragScroll` stays off, since it threw a scroll of the wheel back.
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
 * An entry dropped on a strip or arrow of another day, so its drop in the grid right after is taken back.
 * `null` again when the next drag or resize starts,
 * since a drop on a strip may bring no drop in the grid, and the next resize was taken back.
 */
let turning: { id: string; days: number } | null = null;

/** Whether the day was to load anew while a dialog was open, so it loads once it closes. */
let missed: boolean = false;

/** Asks after a moved entry whether its new times go to the people I share it with, see `share.ts`. */
function moveShare(entry: EventApi): void {
    const people: Attendee[] = entry.extendedProps.attendees ?? [];
    changeAsk(entry.id, people, people).catch((error: unknown): void => console.error(error));
}

/**
 * Writes the new times of a dragged entry into its file, puts it back when the reader refuses.
 * A drop that turns it to another day is taken back, since the entry moves to that day instead.
 */
function entryDrag(calendar: Calendar, info: EventChangeInfo): void {
    const entry: EventApi = info.event;
    if (turning?.id === entry.id) {
        turning = null;
        info.revert();
        return;
    }
    entryMove(entry.id, entry.start as Date, entry.end as Date)
        .then((): void => moveShare(entry))
        .catch((error: unknown): void => {
            console.error(error);
            info.revert();
        });
}

/** Whether a point of the screen lies in an element, never for one not shown. */
function pointIn(element: HTMLElement | null, x: number, y: number): boolean {
    const rect: DOMRect | undefined = element?.getBoundingClientRect();
    return (
        rect !== undefined && rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
}

/** Milliseconds the pointer rests on a strip before it turns a dragged entry there, so passing it turns nothing. */
const turnWait: number = 600;

/**
 * The strip the pointer stands on, -1 back, 1 ahead, 0 for none.
 * - `ready`: Whether it rested there {@link turnWait} long.
 */
let turnStrip: { days: number; ready: boolean; timer: number } = { days: 0, ready: false, timer: 0 };

/** Day the strip at a point stands for, -1 back, 1 ahead, 0 for none. */
function stripOf(x: number, y: number): number {
    if (pointIn(document.querySelector(".day-turn-back"), x, y)) return -1;
    if (pointIn(document.querySelector(".day-turn-next"), x, y)) return 1;
    return 0;
}

/**
 * Day a point turns a dragged entry to, -1 back, 1 ahead, 0 for none.
 * An arrow of the date at once, a strip only once the pointer rested on it.
 */
function turnOf(x: number, y: number): number {
    if (pointIn(document.getElementById("day-back"), x, y)) return -1;
    if (pointIn(document.getElementById("day-next"), x, y)) return 1;
    const strip: number = stripOf(x, y);
    return strip === turnStrip.days && turnStrip.ready ? strip : 0;
}

/** Lights the strip the pointer would turn a dragged entry to. */
function turnLight(x: number, y: number): void {
    const days: number = turnOf(x, y);
    document.querySelector(".day-turn-back")?.classList.toggle("day-turn-near", days === -1);
    document.querySelector(".day-turn-next")?.classList.toggle("day-turn-near", days === 1);
}

/** Waits for the pointer to rest on a strip it came onto, then lights it. */
function turnNear(event: PointerEvent): void {
    const strip: number = stripOf(event.clientX, event.clientY);
    if (strip !== turnStrip.days) {
        window.clearTimeout(turnStrip.timer);
        turnStrip = {
            days: strip,
            ready: false,
            timer:
                strip === 0
                    ? 0
                    : window.setTimeout((): void => {
                          turnStrip.ready = true;
                          turnLight(event.clientX, event.clientY);
                      }, turnWait),
        };
    }
    turnLight(event.clientX, event.clientY);
}

/**
 * Shows the strips of the days before and after while an entry is dragged, as Google Calendar does.
 * One lies over the times at the left of the grid, one at its right edge, each with its weekday.
 * Each starts waiting anew, so a strip the drag starts on turns nothing at once.
 */
function turnShow(calendar: Calendar, shown: boolean): void {
    const day: HTMLElement | null = document.querySelector(".day");
    day?.classList.toggle("day-turning", shown);
    window.clearTimeout(turnStrip.timer);
    turnStrip = { days: 0, ready: false, timer: 0 };
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

/** Moves an entry dropped on a strip or arrow to that day at the same time, and the view follows. */
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
        .then((): void => {
            calendar.incrementDate({ days: days });
            moveShare(entry);
        })
        .catch((error: unknown): void => console.error(error));
}

/** Minutes of the part of an entry shown, cut to the shown day. */
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

/** Whole lines an entry has room for, at least 1, so no line is cut at the bottom. */
function linesOf(info: EventDisplayInfo): number {
    if (info.isShort) return 1;
    const minutes: number = shownMinutesOf(info) - edgeMinutes - spaceMinutes;
    return Math.max(1, Math.floor(minutes / lineMinutes));
}

/**
 * Whether an entry is the range being selected, which `selectMirror` draws as an entry.
 * It is the only one without category and what.
 */
function selectionIs(info: EventDisplayInfo): boolean {
    return info.isMirror && info.event.title === "" && (info.event.extendedProps.category ?? "") === "";
}

/** The sign of an entry with a note. */
function noteMarkOf(): SVGElement {
    const mark: SVGElement = iconOf(StickyNote);
    mark.classList.add("entry-mark");
    return mark;
}

/**
 * Content of an entry as Google Calendar shows one, what in bold, its time grey, its place lighter.
 * A tutorial ends with the group I went to.
 * Every line stays one line, the place gives way first, then what, so the whole entry is its tooltip.
 * The range being selected shows only its start and end.
 * - One line: What, time and place parted by a middle dot, never commas, since names hold commas.
 *   Where what and time don't fit, as on a phone, the time wraps to a hidden next line.
 * - Two lines: What, then time and place, as a box of the plan writes them.
 * - Three or more: The place on a line of its own.
 * An entry with a note has a small sign after what.
 * The note itself stands in its tooltip and in the diary alone, see `diary.ts`.
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
    const mark: Node[] = note === "" ? [] : [noteMarkOf()];
    let shown: HTMLElement[];
    if (selectionIs(info)) shown = [entryPartOf("div", "entry-time", [time])];
    else if (lines < 2) {
        const line: HTMLElement = entryPartOf("div", "entry-line", [
            entryPartOf("span", "entry-what", [...whatOf(category, what), ...mark]),
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
            entryPartOf("div", "entry-whole", [...whole, ...mark]),
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
 * Fits the lines of an entry to the part of it in sight.
 * Scrolled partly out at the top, its lines stick below the top of the grid,
 * and those with no more room hide whole from the bottom, so no line is cut at the top.
 * A pixel of room more counts, as the theme leaves 1px above an entry.
 * So one of half an hour at the top keeps its line.
 * A line an entry on top covers ends before that entry.
 * Where a route starts, `.route-start`, stands whole where it has room, else `…` alone.
 * Lines no longer on the page, like of the copy dragged, stay as they are.
 * - `harness`: Box FullCalendar places the entry in, with its z-index.
 * - `over`: The entries of its column on top of it, with a higher z-index.
 */
function linesFit(lines: HTMLElement, grid: HTMLElement): void {
    const inside: HTMLElement | null = lines.parentElement;
    const harness: HTMLElement | null = inside?.parentElement?.parentElement ?? null;
    if (inside === null || harness === null) return;
    const top: number = grid.getBoundingClientRect().top + parseFloat(getComputedStyle(lines).top);
    const bottom: number = inside.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inside).paddingBottom);
    const room: number = Math.floor((bottom - top + 1) / parseFloat(getComputedStyle(lines).lineHeight));
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

/** The nearest box around an element that scrolls, the whole page for one no longer on it. */
function gridOf(element: HTMLElement): HTMLElement {
    let grid: HTMLElement = element;
    while (grid.parentElement !== null && getComputedStyle(grid).overflowY !== "auto") grid = grid.parentElement;
    return grid;
}

/** Shows the date of the shown day and the icon back to today. */
function dayShow(info: DatesSetInfo): void {
    const date: string = info.startStr.slice(0, 10);
    (document.getElementById("day-date") as HTMLElement).textContent = dayTextOf(date, true);
    todayButtonShow(date);
}

/** Turns the icon back to today on for another day, faded on today so the bar looks the same. */
function todayButtonShow(date: string): void {
    (document.getElementById("day-today") as HTMLButtonElement).disabled = date === calendarTodayOf();
}

/**
 * Shows plan or log on a phone, the repeat for a new series only beside the plan.
 * The grid measures itself again once it shows, so it scrolls to now then.
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
 * Scrolls the grid so now stands about in its middle, its top on a full hour so no label is cut.
 * A day without now keeps `scrollTime`, 06:00.
 * `scrollToTime` is kept and applied again once FullCalendar has measured the grid, so nothing undoes it.
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
 * Loads the log and plan of the shown day again from the files.
 * Nothing while a dialog is open, which keeps the entry as it opened, but once it closes.
 */
function dayAgain(calendar: Calendar): void {
    missed = document.querySelector("dialog[open]") !== null;
    if (missed) return;
    calendar.refetchEvents();
    boxesAgain(calendar);
}

/**
 * Starts the day on the day a link asks for or today, with its buttons, swipe, timer.
 * The scroll is caught with `capture` on its way down to the grid, since it never rises.
 * Lines fit again when the grid resizes, since FullCalendar then moves entries without drawing them anew.
 * - `allDaySlot`: Off, since no entry of my log lasts a whole day.
 * - `eventShortHeight`: 36 px or lower is short, since one line with its space above and below needs 37 px.
 * - `eventMinHeight`: A quarter hour, so a shorter entry still shows its line whole.
 * - `dragScroll`: Off, since it threw a scroll of the wheel back.
 * - `eventSourceSuccess`: Trackers and timer load again, so a saved entry shows there at once.
 * - `selectMirror`: The range drawn in front, since FullCalendar's grey lies behind the entries.
 * - `select`: Lets go of the range at once, so it never stays in the log after the dialog.
 * - `selectLongPressDelay`: A short press of 300 ms selects on a phone, a swipe still scrolls.
 *   An entry keeps the long press of a second, so a slow tap never moves it.
 * - `slotEventOverlap`: An entry lies over the right part of a longer one, which keeps its text at its left.
 * - `nowIndicatorLineClass`, `nowIndicatorDotClass`: So `log.css` draws now grey behind the entries.
 *
 * `log.css` wins over the theme's own classes because it comes after the theme's stylesheet.
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
    shareStart();
    searchStart(calendar);
    timesStart();
    timerStart();
}
