/**
 * ## Day
 *
 * Shows the log of a day as my one calendar, a time grid of one column, and beside it the plan of the day,
 * not as a calendar but as a calm list of boxes, see `boxes.ts`; above both the date of the day between its arrows,
 * with a small icon back to today on any other day;
 * at the right the trackers of the day, my sleep, my glasses of water and my food, and below them the daily note
 * with my gratitude and my points about the day at its top; a phone shows only plan or log, see {@link phoneShow}.
 * A click on the date opens a month to pick any day from, see `month.ts`.
 * A box goes into the log at its real time by dragging it there, or as expected with one tap on `Log`
 * in its menu `⋯`.
 * The log is written by category: `+` below the time grid opens the entry by category for the last half hour,
 * a range selected in the time grid for that range, on a phone by a short press into the grid and pulling it down
 * over the time, as in Google Calendar, the range shown meanwhile as an entry with its start and end in front
 * of the others; a click on an entry changes it.
 * Entries are moved and resized by dragging, and the reader writes their new times alone into their files.
 * Entries look as Google Calendar shows them: what first, then the time, then the place, in one size, the time a light
 * grey, and a taller one its note below, see {@link entryContentOf};
 * a dish, a meal or a cooking, shows its summary, which leaves its drinks out. The kcal of a meal stay hidden
 * for a try; the dialog and the trackers show them. A glass of water does not show in the log at all, since the
 * counter of the trackers counts it.
 * The day opens on today's calendar date, which turns at 00:00, also after a reload, and while it shows today
 * it moves on with it; only a link to a day, like `/?date=2026-07-03` from the food view, opens on that day,
 * which the address then keeps no more, see `today.ts`.
 * The day loads anew the moment a file of my new system changes, whoever changed it, like a food renamed in the food
 * view in every entry that holds it, see `../changes.ts`, so it never shows what the files held before;
 * a change that comes while a dialog is open waits until it closes, see {@link dayAgain}.
 * The grid runs over the calendar day, from 00:00 to 24:00, and opens at 06:00; an entry past midnight shows on both
 * days, cut at midnight, like a sleep from 23:00 to 07:00 at the bottom of 12 October and at the top of 13 October,
 * see {@link dayStart}.
 *
 * - `fullcalendar`: Draws the calendar.
 * - `fullcalendar/timegrid`: Draws the time grid of the day.
 * - `fullcalendar/interaction`: Selects a time range, drags entries and takes boxes dropped from the list.
 * - `fullcalendar/themes/forma`: Look of the calendar, coloured by `variants.css`.
 * - `fullcalendar/locales/en-gb`: English names of days, months and buttons, the day before the month.
 * - `./note.ts`: Shows the daily note of a day, with its Markdown renderer; loaded with `import()` after the calendar,
 *   see {@link noteStart}.
 * - `./entries.ts`: Sends moved entries to the reader.
 * - `./categories.ts`: Writes the log by category, each field picked from its own list.
 * - `./boxes.ts`: Shows the boxes of the day beside the log, logs a box dropped into it, and makes what an entry is.
 * - `./evening.ts`: Writes my gratitude and my points about the day into its daily note, any time of the day;
 *   loaded like `./note.ts`.
 * - `./month.ts`: Picks the day to show from a month.
 * - `./gifts.ts`: Writes my gift ideas for the birthdays and holidays of the plan.
 * - `./search.ts`: Finds entries in my whole log and opens them on their day.
 * - `./places.ts`: Gives the name of the place of an entry, the part of its line before the first comma.
 * - `./series.ts`: Writes a room short, by its code.
 * - `./trackers.ts`: Shows my sleep, my glasses of water, my food and my neck sessions of the day.
 * - `./times.ts`: Reads the typed times of the panels and writes the times of entries.
 * - `../skill/attempts.ts`: Writes a date as a day in the form of the reader, and a day with its weekday for the bar.
 * - `../today.ts`: Gives today's calendar date and the day a link asks for, and moves the day on to the new day
 *   while it shows today.
 * - `../changes.ts`: Loads the day anew the moment a file of my new system changes.
 * - `../icons.ts`: Puts the icons of the arrows and of `+` into their buttons.
 * - `../timer.ts`: Shows the timer of a session running now in the bar of the day, `None` while none runs.
 * - `./swipe.ts`: Changes the shown day on a phone by a swipe sideways.
 * - `../phone.ts`: Tells a phone, which changes the day by a swipe.
 * - `lucide`: The icons of the arrows and plus.
 * - `./day.css`, `./search.css`, `./month.css`: Look of the day, one stylesheet per part.
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
import { whereLinkedOf, whereOf } from "./places.ts";
import { roomOf } from "./series.ts";
import { trackersSee } from "./trackers.ts";
import { timeOf, timesStart } from "./times.ts";
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
    DateSelectInfo, DatesSetInfo, EventApi, EventChangeInfo, EventClickInfo, EventDisplayInfo,
    EventDragStartInfo, EventDragStopInfo, EventInput, EventReceiveInfo, EventResizeStartInfo, EventSourceInput,
} from "fullcalendar";


/**
 * Minutes of the time grid one line of a taller entry fills: half an hour of the grid is 2.05rem high, twice the margin
 * `--slot-margin`, 0.525rem, and once the line of an hour label, 1rem, see `.slot-label` in `log.css`, and a line
 * of a taller entry 1.015625rem, its text of 0.8125rem, as a box of the plan, at a line height of 1.25,
 * see `.entry-inner`; so a line fills about 15 minutes, see {@link linesOf}; a short one, as low as `eventShortHeight`
 * in {@link dayStart} or lower, has no space above and below its one line, 0.975rem high at a line height of 1.2,
 * so a quarter hour, 1.025rem high less the 1px below it, holds it.
 */
const lineMinutes: number = 1.015625 / 2.05 * 30;

/**
 * Minutes of the time grid the space above and below the lines of a taller entry fills, 0.42rem above its first line
 * and as much below its last, 0.84rem of the 2.05rem of half an hour, see `.entry-inner` in `log.css`,
 * on a phone as on the computer; see {@link linesOf}.
 */
const spaceMinutes: number = 0.84 / 2.05 * 30;

/**
 * Minutes of the time grid an entry loses to its edge and to the gap below it, about 4 px of the 82 px of an hour
 * at the root of 20 px, see {@link linesOf}.
 */
const edgeMinutes: number = 4 / 82 * 60;

/**
 * Shows the daily note of a day, like `2026-10-12`, with my gratitude and my points about the day;
 * does nothing until {@link noteStart} has loaded them.
 */
let dayNoteShow: (date: string) => void = (): void => {};

/**
 * Hours of the time grid, from 00:00 to 24:00 of the shown day, see `slotMinTime` and `slotMaxTime`.
 */
const gridHours: number = 24;


/**
 * Event source of the log of the reader. FullCalendar adds `start` and `end` of the shown day to the address,
 * and takes the field `editable` of each entry, so only entries that can be changed are dragged.
 * - `eventDataTransform`: Lets the entries that can be changed react to a click, see {@link entryClick};
 *   a glass of water does not show, since the counter of the trackers counts it.
 *
 * @returns Event source for FullCalendar
 */
function logSourceOf(): EventSourceInput {
    return {
        id: "log",
        url: "/api/day/log",
        eventDataTransform: (entry: EventInput): EventInput => {
            if (entry.glass === true)
                return { ...entry, display: "none" };
            return { ...entry, interactive: entry.editable === true };
        },
    };
}

/**
 * Opens the entry by category to change a clicked entry; one that cannot be changed, like an occurrence of a series,
 * stays as it is.
 * - `startEditable`: Whether the entry can be changed, the field `editable` of the reader.
 *
 * @param info - Clicked entry
 */
function entryClick(info: EventClickInfo): void {
    if (info.event.startEditable === true)
        entryOpenEdit(info.event).catch((error: unknown): void => console.error(error));
}

/**
 * Pixels per second the time grid scrolls at most while an entry is dragged to its top or bottom edge, see
 * {@link edgeScrollStart}: a whole day of 24 hours, 1,920 px, in about a second, so an entry dragged up from the
 * evening reaches 00:00 in one go.
 */
const edgeSpeed: number = 2000;

/**
 * Ends the scrolling of the time grid at its edges, see {@link edgeScrollStart}; `null` while no entry is dragged.
 */
let edgeScrollEnd: (() => void) | null = null;

/**
 * Scrolls the time grid while an entry is dragged or resized and the pointer stands near its top or bottom edge,
 * within 4rem of it or beyond, the nearer the faster, up to {@link edgeSpeed}, as Google Calendar does; and moves
 * the entry along with every scroll, also one of the wheel, by telling FullCalendar that the pointer moved where it
 * stands, so the entry stays under it and stops at 00:00 when the grid reaches its top. FullCalendar's own scrolling
 * stays off, see `dragScroll` in {@link dayStart}, since it kept the scroll of the start and threw a scroll
 * of the wheel back, like from 00:00 to 15:00. It ends with the drag, see {@link edgeScrollEnd}.
 * - `grid`: The grid that scrolls.
 * - `x`, `y`: Where the pointer stands.
 * - `last`: Time of the frame before.
 * - `frame`: The frame asked for next.
 * - `follow`: Tells FullCalendar the pointer moved where it stands.
 * - `move`: Keeps where the pointer stands.
 * - `step`: Scrolls the grid by the time since the frame before, while the pointer is near an edge.
 *
 * @param entry - The entry dragged
 * @param pointer - Where the drag started
 */
function edgeScrollStart(entry: HTMLElement, pointer: MouseEvent): void {
    const grid: HTMLElement = gridOf(entry);
    let x: number = pointer.clientX;
    let y: number = pointer.clientY;
    let last: number = performance.now();
    let frame: number = 0;
    const follow: () => void = (): void => {
        document.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true, buttons: 1 }));
    };
    const move: (event: PointerEvent) => void = (event: PointerEvent): void => {
        x = event.clientX;
        y = event.clientY;
    };
    const step: (now: number) => void = (now: number): void => {
        const rect: DOMRect = grid.getBoundingClientRect();
        const zone: number = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        const depth: number = x < rect.left || x > rect.right ? 0
            : Math.min(zone, Math.max(0, rect.top + zone - y)) - Math.min(zone, Math.max(0, y - rect.bottom + zone));
        grid.scrollTop -= Math.sign(depth) * edgeSpeed * (depth / zone) ** 2 * (now - last) / 1000;
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
 * An entry dragged to the edge of the time grid or onto an arrow of the date, see {@link entryTurn}: its identifier
 * and the days it moves, so its drop in the grid itself, which FullCalendar reports right after, is taken back,
 * see {@link entryDrag}; `null` while none turns, and again when the next drag or resize starts, since a drop on
 * a strip outside the grid brings no drop in it, and the next resize of that entry, on the day it moved to,
 * was taken back.
 */
let turning: { id: string; days: number } | null = null;

/**
 * Whether the day was to load anew while a dialog was open, so it loads once the dialog closes, see {@link dayAgain}.
 */
let missed: boolean = false;

/**
 * Writes the new start and end of an entry moved or resized by dragging into its file, every other field staying
 * as the file holds it, see `entryMove` in `entries.ts`; puts it back where it was when the reader does not take
 * the change; a drop on the edge of the grid that turns it
 * to another day, see {@link entryTurn}, it takes back, since the entry moves to that day instead.
 *
 * @param calendar - Calendar of the day
 * @param info - Entry after dragging, with the way back
 */
function entryDrag(calendar: Calendar, info: EventChangeInfo): void {
    const entry: EventApi = info.event;
    if (turning?.id === entry.id) {
        turning = null;
        info.revert();
        return;
    }
    entryMove(calendar, entry.id, entry.start as Date, entry.end as Date)
        .catch((error: unknown): void => {
            console.error(error);
            info.revert();
        });
}

/**
 * Tells whether a point of the screen lies in an element, like the strip of the day after.
 * - `rect`: Where the element stands.
 *
 * @param element - The element
 * @param x - Point from the left of the window
 * @param y - Point from the top of the window
 * @returns Whether it lies in it, never for an element not shown
 */
function pointIn(element: HTMLElement | null, x: number, y: number): boolean {
    const rect: DOMRect | undefined = element?.getBoundingClientRect();
    return rect !== undefined && rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Tells to which day a point turns a dragged entry: the strip at the left of the time grid, over its times, or
 * the arrow of the day before, a day back; the strip at its right edge or the arrow of the day after, a day on;
 * anywhere else none, see {@link turnShow}.
 *
 * @param x - Point from the left of the window
 * @param y - Point from the top of the window
 * @returns Days, -1, 1, or 0 for none
 */
function turnOf(x: number, y: number): number {
    if (pointIn(document.querySelector(".day-turn-back"), x, y) || pointIn(document.getElementById("day-back"), x, y))
        return -1;
    if (pointIn(document.querySelector(".day-turn-next"), x, y) || pointIn(document.getElementById("day-next"), x, y))
        return 1;
    return 0;
}

/**
 * Lights the strip of the day the pointer would turn a dragged entry to, as it moves, see {@link turnOf}.
 *
 * @param event - Move of the pointer
 */
function turnNear(event: PointerEvent): void {
    const days: number = turnOf(event.clientX, event.clientY);
    document.querySelector(".day-turn-back")?.classList.toggle("day-turn-near", days === -1);
    document.querySelector(".day-turn-next")?.classList.toggle("day-turn-near", days === 1);
}

/**
 * Shows the two strips of the days before and after while an entry is dragged, as Google Calendar turns the day
 * when an entry is pulled to its edge: one over the times at the left of the time grid, one at its right edge,
 * each its arrow and the weekday it leads to, like `Wed`, lit while the pointer is in it, and the arrows of the date
 * outlined, which take an entry too; hides them when the drag stops.
 * - `grid`: Where the time grid stands.
 * - `lane`: Where the column of the day starts, right of the times.
 * - `back`, `next`: The strips.
 * - `weekdayOf`: Weekday of a day some days from the shown one, like `Wed`.
 *
 * @param calendar - Calendar of the day
 * @param shown - Whether to show them
 */
function turnShow(calendar: Calendar, shown: boolean): void {
    const day: HTMLElement | null = document.querySelector(".day");
    day?.classList.toggle("day-turning", shown);
    if (!shown) {
        document.removeEventListener("pointermove", turnNear);
        return;
    }
    const grid: DOMRect = (document.getElementById("day-calendar") as HTMLElement).getBoundingClientRect();
    const lane: number = document.querySelector("#day-calendar [role='gridcell']")?.getBoundingClientRect().left
        ?? grid.left + 48;
    const back: HTMLElement = document.querySelector(".day-turn-back") as HTMLElement;
    const next: HTMLElement = document.querySelector(".day-turn-next") as HTMLElement;
    const weekdayOf: (days: number) => string = (days: number): string => {
        const date: Date = new Date(calendar.view.currentStart);
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString("en-GB", { weekday: "short" });
    };
    back.replaceChildren(iconOf(ChevronLeft), weekdayOf(-1));
    next.replaceChildren(iconOf(ChevronRight), weekdayOf(1));
    Object.assign(back.style, { left: `${grid.left}px`, top: `${grid.top}px`, width: `${lane - grid.left}px`,
        height: `${grid.height}px` });
    Object.assign(next.style, { left: `${grid.right - (lane - grid.left)}px`, top: `${grid.top}px`,
        width: `${lane - grid.left}px`, height: `${grid.height}px` });
    document.addEventListener("pointermove", turnNear);
}

/**
 * Moves an entry dropped on a strip of the day before or after, or on an arrow of the date, see {@link turnOf},
 * to that day at the same time of day, and the day view follows it there, as Google Calendar does; an entry
 * dropped anywhere else stays as FullCalendar moved it, see {@link entryDrag}.
 * - `days`: Days it moves, 0 for none.
 * - `entry`: The entry.
 * - `start`, `end`: Its start and end on the other day.
 *
 * @param calendar - Calendar of the day
 * @param info - The drag that stopped, with where the pointer was
 */
function entryTurn(calendar: Calendar, info: EventDragStopInfo): void {
    const days: number = turnOf(info.jsEvent.clientX, info.jsEvent.clientY);
    turnShow(calendar, false);
    if (days === 0)
        return;
    const entry: EventApi = info.event;
    const start: Date = new Date(entry.start as Date);
    const end: Date = new Date((entry.end ?? entry.start) as Date);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    turning = { id: entry.id, days: days };
    entryMove(calendar, entry.id, start, end)
        .then((): void => calendar.incrementDate({ days: days }))
        .catch((error: unknown): void => console.error(error));
}

/**
 * Minutes of the shown part of an entry of the time grid, cut to the grid, from 00:00 to 24:00 of the shown day:
 * a Sleep from 23:00 to 07:00 on 12 October, shown from 23:00 to 24:00, counts that hour, not its whole 8 hours.
 * - `start`, `end`: Start and end of the entry.
 * - `day`: Midnight of the shown day, where the grid starts.
 * - `top`, `bottom`: Start and end of the entry cut to the grid, like 23:00 to 24:00 for that Sleep.
 *
 * @param info - Entry of the time grid with its render details
 * @returns Minutes, like 60
 */
function shownMinutesOf(info: EventDisplayInfo): number {
    const start: Date = info.event.start as Date;
    const end: Date = info.event.end ?? start;
    const day: Date = info.view.currentStart;
    const top: number = Math.max(start.getTime(), day.getTime());
    const bottom: number =
        Math.min(end.getTime(), new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime());
    return (bottom - top) / (60 * 1000);
}

/**
 * Lines an entry of the time grid has room for, its shown part less what its edge takes, see {@link edgeMinutes},
 * and less the space above its first line and below its last, see {@link spaceMinutes}, so no line is cut at the
 * bottom; its lines always start at the top, never centred, and fill it downwards: half an hour one,
 * (30 - 2.93 - 12.29) / 14.86 = 0.99, 45 minutes two, (45 - 2.93 - 12.29) / 14.86 = 2.004, its place beside its
 * time, like `16:00 – 16:45 · Home Munich`, an hour three, (60 - 2.93 - 12.29) / 14.86 = 3.01, and 75 minutes four,
 * (75 - 2.93 - 12.29) / 14.86 = 4.02;
 * its shown part counts, see {@link shownMinutesOf}.
 * A short entry, see `eventShortHeight` in {@link dayStart}, has room for one line, its space above and below left out.
 * - `minutes`: Minutes of its shown part its lines may fill, its edge and the space above and below them left out.
 *
 * @param info - Entry of the time grid with its render details
 * @returns Lines, at least 1
 */
function linesOf(info: EventDisplayInfo): number {
    if (info.isShort)
        return 1;
    const minutes: number = shownMinutesOf(info) - edgeMinutes - spaceMinutes;
    return Math.max(1, Math.floor(minutes / lineMinutes));
}

/**
 * Tells whether an entry of the time grid is the range being selected, which FullCalendar draws as an entry in front
 * of the others, see `selectMirror` in {@link dayStart}: the only one without category and what, since every entry
 * of the log and every box dragged into it has one of them.
 *
 * @param info - Entry of the time grid with its render details
 * @returns Whether it is the range being selected
 */
function selectionIs(info: EventDisplayInfo): boolean {
    return info.isMirror && info.event.title === "" && (info.event.extendedProps.category ?? "") === "";
}

/**
 * Content of an entry of the log, as Google Calendar shows one: what first in bold, see {@link whatOf}, then its time
 * in normal weight and the light grey of a time, then its place lighter still; a dish shows its summary, like
 * `Pizza Salami, Pizza Margherita`, never its drinks, which its summary leaves out.
 * Every entry shows its place by its label alone, its address hidden, a room of the university by its code alone,
 * like `0509.EG.980`, see `roomOf` in `series.ts`, a way its route, see `whereOf` in `places.ts`; a place with a link
 * opens it on a click, see `whereLinkedOf`. A route cut for room is cut where it starts, never at its goal,
 * like `Mensa Gar… → TUM Innenstadt`, see `.route-start` in `log.css`. A tutorial ends its line with the group
 * I went to, its `X-GROUP`, like `· Group 23`, as its box in the plan does.
 * Every line stays one line: the place gives way first where a line is too narrow, then what, each cut with
 * an ellipsis, see `log.css`; so the whole entry is its tooltip, what, its time and place, a room by its whole name,
 * a route with its arrow, and its note, each on a line of its own.
 * The range being selected shows only its start and end,
 * like `15:00 – 16:00`, see {@link selectionIs}.
 * - An entry with room for one line, of a quarter hour or half an hour, see {@link linesOf}, shows what,
 *   then its start and end, then its place, parted by a middle dot with space on both sides, which `day.css` draws,
 *   never by commas, since names hold commas,
 *   like `Skill: IN0004_EinfuehrungRechnerarchitektur (VO) · 16:00 – 16:30 · 8120.01.101`;
 *   where an entry is narrower than what and its time, as on a phone, what stays whole and its time moves
 *   onto a next line, which the entry hides, and only what wider than the whole entry ends with an ellipsis.
 * - An entry with room for two lines or more, from 45 minutes, shows what on its first line and start and end on its
 *   second with its place after a dot, like `16:00 – 16:45 · 8120.01.101`, as a box of the plan writes them; with room
 *   for more below them its note, as many lines of it as are left, cut with an ellipsis; no note when it has none
 *   or no whole line is left.
 * Its lines start at its top, never centred, on a phone as on the computer.
 * - `category`: Category of the entry, empty for an entry without one.
 * - `shownWhat`: What the entry was, a skill entry as its file writes it, like
 *   `IN0004_EinfuehrungRechnerarchitektur (VO)`, see `shownWhatOf` in `boxes.ts`.
 * - `what`: What the entry was, empty when it is its category, like an old `Sleep`
 *   written before it had its what.
 * - `from`: Where a way starts, its `X-FROM`, empty for none.
 * - `location`: Place of the entry, its `LOCATION`, like `Home Munich, Burgweg 1, 81375 München, Deutschland`.
 * - `place`: Place of the entry by its label, like `Home Munich`, for a way its route from its `X-FROM`,
 *   like `Home Munich -> TUM Garching`, see `whereOf` in `places.ts`, shown with its arrow drawn; empty when it has none.
 * - `online`: Its platform online, like `Zoom`, shown after its place, see `whereLinkedOf` in `places.ts`;
 *   empty for none.
 * - `link`: Link of the place, its `ALTREP`, like `https://nav.tum.de/room/8120.01.101`, empty for none.
 * - `where`: Its place as shown, a room by its code, see `whereLinkedOf` in `places.ts` and `roomOf` in `series.ts`,
 *   of a route its start in a part of its own, `.route-start`, which gives way first.
 * - `group`: The group of a tutorial, like `Group 23`, empty for none.
 * - `tail`: What follows the time on its line, after a middle dot: the place, then the group after one more.
 * - `onlineLink`: Link of its meeting or video online, empty for none.
 * - `note`: Note of the entry, its `DESCRIPTION`, empty when it has none.
 * - `start`, `end`: Start and end of the entry.
 * - `time`: Start and end, like `16:00 – 16:30`.
 * - `lines`: Lines the entry has room for, see {@link linesOf}.
 * - `whole`: What on its own line.
 * - `shown`: The lines of the entry, which `.entry-lines` holds to the lines it has room for.
 * - `line`: The one line of an entry with room for one: what, its time and its place, in parts beside each other,
 *   see `.entry-line` in `log.css`.
 * - `timeLine`: The line with the time, alone or with its place beside it, of an entry with room for two lines or more.
 * - `below`: The note below the lines shown, grey, its line clamp the lines left, see `.entry-note` in `log.css`.
 * - `content`: All lines, as high as the lines the entry has room for, so a line never shows cut in half
 *   at the bottom of the entry; how many in `data-lines`,
 *   fitted to the part of the entry in sight once it is on the page, see {@link linesFit}.
 *
 * @param info - Entry with its render details
 * @returns Lines of the entry for FullCalendar
 */
function entryContentOf(info: EventDisplayInfo): { domNodes: HTMLElement[] } {
    const category: string = info.event.extendedProps.category ?? "";
    const shownWhat: string = shownWhatOf(category, info.event.title, info.event.extendedProps.module ?? "",
        info.event.extendedProps.type ?? "");
    const what: string = shownWhat === category ? "" : shownWhat;
    const from: string = info.event.extendedProps.from ?? "";
    const location: string = info.event.extendedProps.location ?? "";
    const online: string = info.event.extendedProps.online ?? "";
    const place: string = whereOf(category, from, location, online);
    const link: string = info.event.extendedProps.locationLink ?? "";
    const onlineLink: string = info.event.extendedProps.onlineLink ?? "";
    const route: (string | Node)[] = whereLinkedOf(category, from, roomOf(location), link, online, onlineLink);
    const where: (string | Node)[] = route.length === 3
        ? [entryPartOf("span", "route-start", [route[0]]), ...route.slice(1)] : route;
    const group: string = (info.event.extendedProps.group ?? "") === "" ? "" : `Group ${info.event.extendedProps.group}`;
    const tail: HTMLElement[] = place === "" && group === "" ? [] : [entryPartOf("span",
        "entry-place entry-parted entry-beside", [...where, ...group === "" ? [] : place === "" ? [group]
            : [entryPartOf("span", "entry-parted", [group])]])];
    const note: string = (info.event.extendedProps.note ?? "").trim();
    const start: Date = info.event.start as Date;
    const end: Date = info.event.end ?? start;

    const time: string = `${timeOf(start)} – ${timeOf(end)}`;
    const lines: number = linesOf(info);
    const whole: (string | Node)[] = whatOf(category, what);
    let shown: HTMLElement[];
    if (selectionIs(info))
        shown = [entryPartOf("div", "entry-time", [time])];
    else if (lines < 2) {
        const line: HTMLElement = entryPartOf("div", "entry-line", [
            entryPartOf("span", "entry-what", whatOf(category, what)),
            entryPartOf("span", "entry-time entry-parted", [time]),
        ]);
        line.append(...tail);
        shown = [line];
    } else {
        const timeLine: HTMLElement = entryPartOf("div", "entry-line", [entryPartOf("span", "entry-time", [time]), ...tail]);
        shown = [entryPartOf("div", "entry-whole", whole), timeLine];
        if (note !== "" && lines > shown.length) {
            const below: HTMLElement = entryPartOf("div", "entry-note", [note]);
            below.style.webkitLineClamp = String(lines - shown.length);
            shown.push(below);
        }
    }
    const content: HTMLElement = entryPartOf("div", "entry-lines", shown);
    content.title = [
        whole.map((part: string | Node): string => typeof part === "string" ? part : part.textContent ?? "").join(""),
        [time, place.replace("->", "→"), group].filter((part: string): boolean => part !== "").join(" · "),
        note,
    ].filter((text: string): boolean => text !== "").join("\n");
    content.style.maxHeight = `${lines}lh`;
    content.dataset.lines = String(lines);
    requestAnimationFrame((): void => linesFit(content, gridOf(content)));
    return { domNodes: [content] };
}

/**
 * Fits the lines of an entry to the part of it in sight: scrolled partly out of sight at the top, an entry keeps
 * its lines 0.42rem below the top of the grid, as `.entry-lines` in `log.css` makes them stick, and those its rest
 * has no more room for, less the space below them, hide as a whole from the bottom, so no line is ever cut
 * at the top and `Sleep: Night` stays in sight the longest; an entry in sight keeps the lines it has room for;
 * lines no longer on the page, like those of the copy FullCalendar draws while an entry is dragged, stay as they are.
 * - `inside`: Inside of the entry, with the space above and below its lines, `null` for lines no longer on it.
 * - `top`: Where the lines stick, 0.42rem below the top of the grid.
 * - `bottom`: Where the space below the lines begins.
 * - `room`: Whole lines between them.
 *
 * @param lines - All lines of an entry, how many it has room for in `data-lines`, see {@link entryContentOf}
 * @param grid - Grid of the log, which scrolls the entries
 */
function linesFit(lines: HTMLElement, grid: HTMLElement): void {
    const inside: HTMLElement | null = lines.parentElement;
    if (inside === null)
        return;
    const top: number = grid.getBoundingClientRect().top + parseFloat(getComputedStyle(lines).top);
    const bottom: number = inside.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inside).paddingBottom);
    const room: number = Math.floor((bottom - top) / parseFloat(getComputedStyle(lines).lineHeight));
    lines.style.maxHeight = `${Math.max(0, Math.min(Number(lines.dataset.lines), room))}lh`;
}

/**
 * The grid of the log around an element in it: the nearest box around it that scrolls.
 *
 * @param element - An element in the grid, like the lines of an entry
 * @returns The grid, the whole page for an element no longer on it
 */
function gridOf(element: HTMLElement): HTMLElement {
    let grid: HTMLElement = element;
    while (grid.parentElement !== null && getComputedStyle(grid).overflowY !== "auto")
        grid = grid.parentElement;
    return grid;
}

/**
 * Shows the date of the shown day above plan and log, in my standard way with its weekday short after it, on one line,
 * like `11.10.2026 (Sun)`, see `dayTextOf` in `../skill/attempts.ts`, always fully readable, with the icon back to today
 * on any other day,
 * see {@link todayButtonShow}, and its daily note, gratitude and points about the day, see {@link dayNoteShow};
 * the boxes and the trackers follow the entries of the log, see `eventsSet` in {@link dayStart}.
 *
 * @param info - Range of the shown day
 */
function dayShow(info: DatesSetInfo): void {
    const date: string = info.startStr.slice(0, 10);
    (document.getElementById("day-date") as HTMLElement).textContent = dayTextOf(date, true);
    todayButtonShow(date);
    dayNoteShow(date);
}

/**
 * Turns the small icon back to today beside the date on while the shown day is another than today's calendar date;
 * on today, like 13.10.2026 on that day, it shows faded and off, so the bar looks the same on every day, see
 * `.day-today` in `day.css`; also once the day turned at 00:00 while the day stays, see `todayFollow` in `today.ts`.
 *
 * @param date - Shown day, like `2026-10-13`
 */
function todayButtonShow(date: string): void {
    (document.getElementById("day-today") as HTMLButtonElement).disabled = date === calendarTodayOf();
}

/**
 * Shows plan or log on a phone, one at a time, see `.day-switch` in `day.css`, the button of the shown one picked,
 * the repeat for a new series only beside the plan, since a series is one of the plan;
 * the time grid, which measures itself again once it shows, scrolls to now then, see {@link nowCenter}.
 * - `main`: Plan and log with their bar, which `day.css` shows one of by its `data-shown`.
 *
 * @param calendar - Calendar of the day
 * @param shown - `plan` or `log`
 */
function phoneShow(calendar: Calendar, shown: "plan" | "log"): void {
    const main: HTMLElement = document.getElementById("day-main") as HTMLElement;
    main.dataset.shown = shown;
    for (const part of ["plan", "log"])
        document.getElementById(`day-show-${part}`)?.setAttribute("aria-pressed", String(shown === part));
    (document.getElementById("day-series") as HTMLButtonElement).hidden = shown === "log";
    if (shown === "log")
        nowCenter(calendar);
}

/**
 * Scrolls the time grid so that now stands about in its middle, its top on the full hour before, so the label of no hour
 * is cut at the top, at each load of the page and when the day moves on
 * to the new day by itself, like 14:00 in the middle of 13.10.2026; at 00:20 today's page is 14 October,
 * whose grid cannot scroll above 00:00, so now simply stands near its top.
 * A day without now keeps `scrollTime`, 06:00 at the top. It hands the time for the top to `scrollToTime`,
 * which FullCalendar keeps and applies again once it has measured the grid, so nothing undoes it.
 * - `hours`: Hours from the top of the grid, 00:00 of the shown day, to now, like 14.5 for 14:30.
 * - `root`: The root size in pixels.
 * - `hourHeight`: Height of an hour of the grid in pixels, two half hours, each the line of an hour label, 1rem,
 *   and its margin above and below it, `--slot-margin`, see {@link lineMinutes}.
 * - `visibleHours`: Hours the grid shows at once, from the height of its box, like 9.4.
 *
 * @param calendar - Calendar of the day
 */
function nowCenter(calendar: Calendar): void {
    const hours: number = (Date.now() - calendar.view.currentStart.getTime()) / (60 * 60 * 1000);
    if (hours < 0 || hours > gridHours)
        return;
    const root: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    const hourHeight: number =
        2 * (1 + 2 * parseFloat(root.getPropertyValue("--slot-margin"))) * parseFloat(root.fontSize);
    const visibleHours: number = (document.getElementById("day-calendar") as HTMLElement).clientHeight / hourHeight;
    calendar.scrollToTime({ hours: Math.max(0, Math.floor(hours - visibleHours / 2)) });
}

/**
 * Loads the shown day again, as it lies in the files now, whenever the page becomes visible, like when I come back
 * to the app on my phone, see `todayFollow` in `today.ts`, and the moment a file of my new system changes,
 * see `../changes.ts`: its log, with its trackers, see `eventSourceSuccess` in {@link dayStart}, its plan, and its
 * note but while I type in a field, like a point of my note, so nothing typed gets lost; nothing while a dialog is
 * open, which keeps the entry as it opened, but once it closes, see {@link missed}.
 * - `typing`: Whether the focus stands in a field to type in.
 *
 * @param calendar - Calendar of the day
 */
function dayAgain(calendar: Calendar): void {
    const typing: boolean = document.activeElement?.matches("input, textarea, [contenteditable='true']") ?? false;
    missed = document.querySelector("dialog[open]") !== null;
    if (missed)
        return;
    calendar.refetchEvents();
    boxesAgain(calendar);
    if (!typing)
        dayNoteShow(dayOf(calendar.view.currentStart));
}

/**
 * Loads the daily note with `import()`, its Markdown renderer with it, starts my gratitude and my points
 * about the day, and shows them for the shown day and from then on for every day shown, see {@link dayShow}.
 * `evening.ts` comes first, since it loads `note.ts` too, which is then at hand at once.
 * - `evening`: Writes my gratitude and my points about the day, see `evening.ts`.
 * - `note`: Shows the daily note of a day, see `note.ts`.
 *
 * @param calendar - Calendar of the day, for the shown day
 */
async function noteStart(calendar: Calendar): Promise<void> {
    const evening: { eveningShow: (day: string) => Promise<void>; eveningStart: () => void } =
        await import("./evening.ts");
    const note: { noteShow: (date: string) => Promise<void> } = await import("./note.ts");
    evening.eveningStart();
    dayNoteShow = (date: string): void => {
        note.noteShow(date).catch((error: unknown): void => console.error(error));
        evening.eveningShow(date).catch((error: unknown): void => console.error(error));
    };
    dayNoteShow(dayOf(calendar.view.currentStart));
}

/**
 * Starts the day after the router has put its HTML into the page, on the day a link asks for or today's calendar date,
 * see `askedDayOf` in `today.ts`:
 * the arrows beside the date above plan and log move the calendar by a day, the icon beside it back to today,
 * the date opens the month to pick a day from, `+` below the time grid opens the entry by category of the log
 * for the last half hour, the search beside it the search of the whole log, see `search.ts`; on a phone the buttons
 * at the bottom switch between plan and log, see {@link phoneShow}, and their `+` starts a box or an entry
 * of the shown plan or log, and a swipe sideways changes the day in place of the arrows, see `swipe.ts`;
 * it shows the daily note, see {@link noteStart}, and the timer of a session, see `timer.ts`; while it shows today,
 * the day moves on to the new day by itself, now centred again, see `todayFollow` in `today.ts`, and while it shows
 * another day, the icon back to today follows the new day; a day the page stays on when it becomes visible loads again,
 * see {@link dayAgain}.
 * While the grid scrolls, the lines of every entry fit to the part of it in sight, see {@link linesFit};
 * the calendar catches the scroll on its way down to the grid, `capture`, since it never rises.
 * - `initialView`: A time grid of the shown day, one column, the log.
 * - `headerToolbar`: None, since the date and its buttons stand above plan and log together, see {@link dayShow}.
 * - `dayHeaders`: Leaves out the name of the day above the column, which the date above says already.
 * - `allDaySlot`: Leaves out the row of the whole day above the grid, since no entry of my log lasts a whole day.
 * - `slotHeaderInnerClass`: Adds the class `slot-label` to the hour labels,
 *   so `log.css` sets their size and with it the height of the slots.
 * - `slotHeaderFormat`: Writes the hours in 24-hour form, like `14:00`; the entries write their times themselves.
 * - `eventContent`: Shows what an entry was, then its time and its place, see {@link entryContentOf}.
 * - `eventShortHeight`: Makes entries short that have no room for one line with the space above and below it,
 *   as high as 36 px in the grid or lower: such a line needs 37 px at the page's root size of 20 px, 0.42rem above,
 *   a line of 1.0125rem and 0.42rem below, see `.entry-inner` in `log.css`, and the inside of an entry is 3 px lower
 *   than its place in the grid; so they show their one line without that space, like an entry of a quarter hour,
 *   but not one of half an hour, 41 px, at that root size, see {@link entryContentOf}.
 * - `eventMinHeight`: Makes every entry at least as high as a quarter hour, 20 px, one line of an entry with its edge,
 *   so a shorter one, like ten minutes of my neck routine, still shows its line whole.
 * - `eventColor`: Edges the entries in the grey of the log from `variants.css`.
 * - `blockEventClass`: Adds the class `entry` to the entries,
 *   so `log.css` fills them in grey and only their edge keeps the grey of the log,
 *   and `entry-selection` to the range being selected, see {@link selectionIs}, which it fills in the calm grey
 *   of what is picked.
 * - `blockEventInnerClass`: Adds the class `entry-inner` to the inside of the entries,
 *   so `log.css` sets the size of their lines and cuts them at the edge of the entry instead of letting them stick out,
 *   and `entry-inner-short` to the inside of short ones, which takes away the space above and below their one line
 *   and keeps it 0.9rem high.
 * - `eventSources`: The log, see {@link logSourceOf}.
 * - `editable`: Lets entries be moved and resized, those that the reader marks `editable`.
 * - `snapDuration`: Moves, resizes and selects in steps of 15 minutes, while the grid keeps a line every 30 minutes.
 * - `eventDrop`, `eventResize`: Write a moved or resized entry back, see {@link entryDrag}.
 * - `dragScroll`: Turns FullCalendar's own scrolling at the edges off, which threw a scroll of the wheel back,
 *   see {@link edgeScrollStart}.
 * - `eventDragStart`, `eventDragStop`: Show the strips of the days before and after while an entry is dragged,
 *   and move an entry dropped on one of them, or on an arrow of the date, to that day, see {@link entryTurn};
 *   scroll the grid at its edges meanwhile, see {@link edgeScrollStart}.
 * - `eventResizeStart`, `eventResizeStop`: Scroll the grid at its edges while an entry is resized.
 * - `droppable`: Takes the boxes dragged from the list.
 * - `eventReceive`: Logs a box dropped into the log at the time of the drop, see `boxes.ts`.
 * - `eventsSet`: Tells the boxes the entries of the shown day, after every change.
 * - `eventSourceSuccess`: Loads the trackers again each time the log was read, see `trackersSee` in `trackers.ts`,
 *   and the timer of a session, so an entry saved, ended or removed shows there at once, see `timerSee` in `timer.ts`.
 * - `eventClick`: Opens the entry by category for an entry that can be changed, see {@link entryClick}.
 * - `selectMirror`: Draws the range being selected as an entry in front of the others, with its start and end,
 *   see {@link entryContentOf}; FullCalendar's own grey of a selection lies behind the entries, so a range over
 *   an entry, like an hour of food during a workshop, showed only in the free strip beside it.
 * - `select`: Opens the entry by category for a range selected in the time grid, and lets go of the range at once,
 *   so it never stays in the log as if it were an entry once the dialog is closed, also with `Esc`.
 * - `selectLongPressDelay`: Starts a selection on a phone after a short press of 300 ms, in place of FullCalendar's
 *   long press of a second, so a finger presses into the time grid and pulls the range down over the time,
 *   as in Google Calendar; a swipe moves at once, so it scrolls the grid, and once the grid scrolled FullCalendar
 *   selects nothing. An entry keeps the long press of a second before it is dragged, so a slow tap never moves it.
 * - `slotEventOverlap`: Lets an entry at the same time as a longer one lie over the right part of it, as in Google
 *   Calendar, on a computer and on a phone alike, so the longer one keeps its text at its left, like a workshop
 *   with `Food: Pizza Salami` during it.
 * - `nowIndicatorLineClass`, `nowIndicatorDotClass`: Add the classes `now-line` and `now-dot` to the line of now
 *   and its dot, so `log.css` draws them calm grey behind the entries, never through their text.
 * - `slotMinTime`, `slotMaxTime`: Run the grid over the calendar day, 00:00 to 24:00, as the trackers and the done
 *   boxes count it; an entry past midnight shows on both days, cut at midnight.
 * - `scrollTime`: Scrolls the grid to 06:00 at the start, for a day that does not hold now; today centres on now instead, see {@link nowCenter}.
 *
 * The theme keeps its own classes beside `slot-label`, `entry`, `entry-inner` and the others;
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
        blockEventClass: (info: EventDisplayInfo): string => selectionIs(info) ? "entry entry-selection" : "entry",
        blockEventInnerClass: (info: EventDisplayInfo): string => {
            if (info.isShort)
                return "entry-inner entry-inner-short";
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
    document.querySelector(".day")?.append(...["day-turn day-turn-back", "day-turn day-turn-next"]
        .map((name: string): HTMLElement => {
            const strip: HTMLElement = document.createElement("div");
            strip.className = name;
            return strip;
        }));
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
    document.getElementById("day-series")?.addEventListener("click", (): void =>
        document.getElementById("plan-series")?.click());
    document.getElementById("day-back")?.addEventListener("click", (): void => calendar.prev());
    document.getElementById("day-today")?.addEventListener("click", (): void => calendar.gotoDate(calendarTodayOf()));
    document.getElementById("day-next")?.addEventListener("click", (): void => calendar.next());
    if (phone)
        swipeStart(document.getElementById("day-main") as HTMLElement,
            (days: number): void => calendar.incrementDate({ days: days }));
    document.getElementById("day-calendar")?.addEventListener("scroll", (event: Event): void => {
        const grid: HTMLElement = event.target as HTMLElement;
        for (const lines of grid.querySelectorAll<HTMLElement>(".entry-lines"))
            linesFit(lines, grid);
    }, { capture: true });
    document.getElementById("log-new")?.addEventListener("click", (): void => {
        entryOpenNow(calendar).catch((error: unknown): void => console.error(error));
    });
    categoriesStart(calendar);
    boxesStart(calendar);
    monthStart(document.getElementById("day-title") as HTMLElement, (): string[] => [dayOf(calendar.view.currentStart)],
        (day: string): void => calendar.gotoDate(day));
    todayFollow((): string => dayOf(calendar.view.currentStart), (day: string): void => {
        calendar.gotoDate(day);
        nowCenter(calendar);
    }, (): void => todayButtonShow(dayOf(calendar.view.currentStart)), (): void => dayAgain(calendar));
    changesFollow((): void => dayAgain(calendar));
    document.addEventListener("close", (): void => {
        if (missed)
            dayAgain(calendar);
    }, { capture: true });
    giftsStart();
    searchStart(calendar);
    timesStart();
    noteStart(calendar).catch((error: unknown): void => console.error(error));
    timerStart();
}
