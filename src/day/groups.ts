/**
 * ## Groups
 *
 * The menu of the groups of my tutorials, see `reader/course.ts`, one and the same wherever it shows: at the right
 * of the heading of the card of the tutorials on the page of a module, see `../editor/course.ts`, and in the dialog
 * of a tutorial, see `./categories.ts`, and in a row of the page of a module, both of which pick the group of their
 * box; a box of the plan, see `./boxes.ts`, names its group only, grey, see {@link groupNameOf}.
 * Its button names a group small and grey with a small chevron, like `Group 06`, lighter under the pointer and while
 * its menu is open; a click on it opens the menu below it as the menu `⋯` does, see `menuAnchor` in `../menu.ts`,
 * its items closer together: the groups by weekday, then time, those of one day below that day small and grey,
 * like `27.10.2026 (Tue)`, each a group by its parts on the same columns as the others, see {@link groupPartsOf},
 * like `Group 01` and `10:00 – 12:00 · Zoom`, its tutors beside them on the same line as plain text, the one checked
 * by a check, the one pinned, which the weeks to come go to, by a small grey pin right before its group; a long menu
 * scrolls. A row is one click: anywhere on it closes the menu and picks the group, but for the one checked,
 * and nothing in the menu opens the box of its row or a person.
 * The menu of the heading, see {@link pinnedMenuOf}, names the group pinned with the pin before it, like `Group 06`,
 * `No group yet` while none is, and holds every group of the type, the one pinned checked: a pick pins the group, see
 * {@link pinPick}. The dialog of a box and its row name its group, see {@link boxGroupOf}: one that may still go
 * to another group, see {@link pickable}, in the menu of the session of each group in its week not over yet, the group
 * of the box checked, a pick moving only that week's box, see {@link weekPick}; any other box its group grey,
 * like `Group 03`, without menu. At the right end of every group the series icon ⟳, the same as after the times
 * of a box of a series, opens that group in the form of a series, see `groupOpen` in `./series.ts`, which makes and
 * changes the groups themselves, see {@link seriesIconOf}; a group is pinned only in the heading of the card, never
 * from a box.
 * A pick shows at once, as the page of the menu shows it, see {@link PickShow}, and the reader confirms it.
 *
 * - `./series.ts`: Sends a change of the course, gives the Monday of a day, writes a room short and the name
 *   of a weekday, and opens a group in the form of a series.
 * - `../editor/dialog.ts`: Puts the dialog of a series into the page of a module before a group opens there, loaded
 *   only then.
 * - `./times.ts`: Writes a time of day, and a day with its weekday.
 * - `../skill/attempts.ts`: Gives the day of a date.
 * - `../today.ts`: Gives today's calendar date, which tells whether the day of a box is over.
 * - `../food/foods.ts`: Makes elements.
 * - `../icons.ts`: Makes the chevron of the button, the check and the pins.
 * - `../menu.ts`: Opens the menu below its button in the place and look of the menu `⋯`, and makes its items.
 * - `../persons.ts`: Puts the tutors of a group apart by a middle dot.
 * - `lucide`: The icons chevron, check, pin and the series.
 * - `./groups.css`: Look of the button and its menu.
 */

import { courseSend, groupOpen, mondayOf, roomOf, weekdayNameOf } from "./series.ts";
import { timeOf, weekdayDateTextOf } from "./times.ts";
import { dayOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { elementOf } from "../food/foods.ts";
import { iconOf } from "../icons.ts";
import { menuAnchor, menuItemOf } from "../menu.ts";
import { peopleOf } from "../persons.ts";
import { Check, ChevronDown, Pin, Repeat } from "lucide";
import "./groups.css";

import type { Box } from "./boxes.ts";
import type { Attendee } from "./entries.ts";
import type { Course, Group, Planned, Series, Session, Slot } from "./series.ts";


/**
 * Shows a pick of a group at once and sends it, as the page of the menu does, see the top of this file: changes what
 * the page shows by `change`, shows it anew, then sends the pick to the reader by `send` and loads anew once the reader
 * answers, also when it does not take it, so a pick shown at once goes back.
 */
export type PickShow = (change: () => void, send: () => Promise<unknown>) => void;

/**
 * A group in the menu of the groups, see {@link groupMenuOf}.
 *
 * - `group`: The group.
 * - `day`: The day it stands below, the weekday of the group, like `Tue`, or the day of its session,
 *   like `27.10.2026 (Tue)`; empty for none.
 * - `times`: Its times, like `10:00 – 12:00`, empty for none.
 * - `checked`: Whether it is checked.
 * - `pick`: What a pick of it does.
 */
type Item = {
    group: Group;
    day: string;
    times: string;
    checked: boolean;
    pick: () => void;
};


/**
 * Tells whether a box may go to another group by a pick, see the top of this file: an open to-do of the new system
 * from today on, no date of a series of a file, never pushed, as a change of the reader may move it, see `changeable`
 * in `reader/course.ts`.
 *
 * @param box - The box
 * @returns Whether it may
 */
export function pickable(box: Box): boolean {
    return box.state === "open" && box.editable && box.todo && !box.series && box.pushed.length === 0
        && box.day >= calendarTodayOf();
}

/**
 * Tells whether a session of a group is over.
 *
 * @param session - The session
 * @returns Whether its end lies before now
 */
function overOf(session: Session): boolean {
    return Date.parse(session.start) + session.minutes * 60 * 1000 <= Date.now();
}

/**
 * Gives the sessions of groups in a week, each with its group, the earliest first.
 *
 * @param groups - The groups
 * @param week - Monday of the week, like `2026-10-19`
 * @returns The sessions with their groups
 */
function meetingsOf(groups: Group[], week: string): [Group, Session][] {
    return groups.flatMap((group: Group): [Group, Session][] => group.sessions
        .filter((session: Session): boolean => mondayOf(dayOf(new Date(session.start))) === week)
        .map((session: Session): [Group, Session] => [group, session]))
        .sort((first: [Group, Session], second: [Group, Session]): number =>
            first[1].start.localeCompare(second[1].start));
}

/**
 * Gives the group pinned of a type, see the top of this file: the group of its series.
 *
 * @param course - The course
 * @param type - The type, like `TU`
 * @returns The group, like `06`, empty for none
 */
function pinnedOf(course: Course, type: string): string {
    return course.series.find((series: Series): boolean => series.rule.type === type)?.rule.group ?? "";
}

/**
 * Moves a box shown to the session of a group, as the reader moves it, see `targetOf` in `reader/course.ts`:
 * its day, its time, its length, the place, what it does online, the tutor and the group.
 *
 * @param box - The box
 * @param group - The group
 * @param session - Its session
 */
function boxMove(box: Box, group: Group, session: Session): void {
    Object.assign<Box, Partial<Box>>(box, {
        day: dayOf(new Date(session.start)), time: session.start, minutes: session.minutes,
        location: group.rule.location, locationLink: group.rule.locationLink, online: group.rule.online,
        onlineLink: group.rule.onlineLink, passcode: group.rule.passcode, attendees: group.rule.attendees,
        group: group.rule.group,
    });
}

/**
 * Pins a group, see the top of this file: at once the series of its type goes to the group, a new one while it has
 * none, and every open box of its type to come goes to the session of the group in its week, where it meets one not
 * over yet, also a week picked for another group; then the reader, see `groupMine` in `reader/course.ts`, moves every
 * box it may change from the group's next session on, and with no series yet makes its sessions to come my series.
 * - `series`: The series of the type, `undefined` for none yet.
 * - `session`: The session of the group in the week of a box, `undefined` for none.
 *
 * @param course - The course
 * @param group - The group
 * @param show - Shows the pick, see {@link PickShow}
 */
function pinPick(course: Course, group: Group, show: PickShow): void {
    show((): void => {
        const series: Series | undefined = course.series
            .find((one: Series): boolean => one.rule.type === group.rule.type);
        if (series === undefined)
            course.series.push({ rule: { ...group.rule }, count: 0 });
        else
            series.rule.group = group.rule.group;
        course.boxes.filter((box: Box): boolean => box.type === group.rule.type && pickable(box))
            .forEach((box: Box): void => {
                const session: Session | undefined = group.sessions.find((one: Session): boolean => !overOf(one)
                    && mondayOf(dayOf(new Date(one.start))) === mondayOf(box.day));
                if (session !== undefined)
                    boxMove(box, group, session);
            });
    }, (): Promise<Planned[]> => courseSend<Planned[]>("/api/course/mine",
        { module: course.module, type: group.rule.type, group: group.rule.group }));
}

/**
 * Moves one week's box to the session of a group, see the top of this file, that week alone: at once, then by the
 * reader, see `weekPick` in `reader/course.ts`.
 *
 * @param course - Its course
 * @param box - The box, one that may go to another group, see {@link pickable}
 * @param group - The group
 * @param session - Its session in the week of the box
 * @param show - Shows the pick, see {@link PickShow}
 */
function weekPick(course: Course, box: Box, group: Group, session: Session, show: PickShow): void {
    show((): void => boxMove(box, group, session), (): Promise<null> => courseSend<null>("/api/course/pick",
        { module: course.module, type: box.type, group: group.rule.group, start: session.start }));
}

/**
 * Makes the tutors of a group in the menu of the groups, apart by a middle dot, see `peopleOf` in `../persons.ts`,
 * like `Durmann, Julius · Ewert, Markus`, plain text, so a click on them picks the group as anywhere on its row.
 * - `names`: The names of its tutors.
 * - `tutors`: The tutors.
 *
 * @param group - The group
 * @returns Its tutors, `null` while unknown
 */
function tutorsOf(group: Group): HTMLElement | null {
    const names: string[] = group.rule.attendees.map((attendee: Attendee): string => attendee.name);
    const tutors: HTMLElement = elementOf("span", "group-tutors", "");
    if (names.length === 0)
        return null;
    tutors.append(...peopleOf(names));
    return tutors;
}

/**
 * Gives the parts of a group in the menu of the groups, each on a column of its own, all on one line: its group, like
 * `Group 01`, then its times and where it is: its platform online whenever it has one, as every skill entry shows it,
 * see `whereOf` in `./places.ts`, else its place short, see `roomOf` in `./series.ts`, apart by a middle dot, see `.entry-parted` in `./day.css`, as a row of the page of a module writes
 * them, like `10:00 – 12:00 · Zoom`, no names in it; and its tutors while known, see {@link tutorsOf}.
 * - `where`: Its times and its place.
 *
 * @param group - The group
 * @param times - Its times, like `10:00 – 12:00`, empty for none
 * @returns Its group, its times and place, and its tutors, `null` while unknown
 */
function groupPartsOf(group: Group, times: string): [string, HTMLElement, HTMLElement | null] {
    const where: HTMLElement = elementOf("span", "group-detail", "");
    where.append(...[times, group.rule.online !== "" ? group.rule.online : roomOf(group.rule.location)]
        .filter((part: string): boolean => part !== "")
        .map((part: string, index: number): HTMLElement => elementOf("span", index === 0 ? "" : "entry-parted", part)));
    return [`Group ${group.rule.group}`, where, tutorsOf(group)];
}

/**
 * Makes the menu of the groups, see the top of this file: its button, a group small and grey with a small chevron,
 * like `Group 06`, which opens its items as the menu `⋯` does, see `menuAnchor` in `../menu.ts`: above the groups
 * of each day that day, each group by its parts, see {@link groupPartsOf}, the parts of all on the same columns,
 * the checked one by a check, the others without, the one pinned by a small pin right before its group, in a column
 * of its own, so the groups stand one below the other; a click on a group closes the menu and picks it, but for the
 * one checked; at the right end of each group its series icon, which opens the group to change it, see
 * {@link seriesIconOf}; nothing in it opens the box of its row.
 * - `place`: The button with its menu.
 * - `button`: The button.
 * - `menu`: The menu.
 * - `day`: The day of the groups so far, empty before the first.
 * - `line`: The item of a group.
 * - `mark`: The pin of the one pinned, empty for the others.
 *
 * @param words - What the button names, like `Group 06` or `No group yet`, the pin before the group pinned
 * @param items - The groups, by day and time
 * @param pinned - The group pinned, like `06`, empty for none
 * @param open - Opens a group in the form of a series, see {@link seriesIconOf}
 * @returns The button with its menu
 */
function groupMenuOf(words: (string | Node)[], items: Item[], pinned: string,
                     open: (group: string) => void): HTMLElement {
    const place: HTMLElement = elementOf("span", "group-place", "");
    const button: HTMLButtonElement = document.createElement("button");
    const menu: HTMLElement = elementOf("div", "group-menu", "");
    let day: string = "";
    button.type = "button";
    button.className = "group-name";
    button.append(...words, iconOf(ChevronDown));
    menuAnchor(menu, button);
    items.forEach((item: Item): void => {
        const [name, details, tutors]: [string, HTMLElement, HTMLElement | null] =
            groupPartsOf(item.group, item.times);
        const line: HTMLButtonElement = menuItemOf(Check, "", (): void => {
            menu.hidePopover();
            if (!item.checked)
                item.pick();
        });
        const mark: HTMLElement = elementOf("span", "group-pin", "");
        if (item.group.rule.group === pinned)
            mark.append(iconOf(Pin));
        line.classList.add("group-item");
        line.classList.toggle("menu-item-blank", !item.checked);
        line.append(mark, elementOf("span", "", name), details, tutors ?? elementOf("span", "", ""),
            seriesIconOf(item.group.rule.group, (): void => {
                menu.hidePopover();
                open(item.group.rule.group);
            }));
        if (item.day !== "" && item.day !== day)
            menu.append(elementOf("div", "group-day", item.day));
        day = item.day;
        menu.append(line);
    });
    place.addEventListener("click", (event: MouseEvent): void => event.stopPropagation());
    place.append(button, menu);
    return place;
}

/**
 * Makes the menu of the group pinned in the heading of the card of a type with groups, see the top of this file:
 * the group pinned with the pin before it, like `Group 06`, `No group yet` while none is, its items every group
 * of the type by the weekday and times of its first slot, below its weekday, like `Tue` and `10:00 – 12:00`, the one
 * pinned marked by its pin alone, no check, since a series is no one week, a pick of another pinning it,
 * see {@link pinPick}; each with its series icon, which opens it to change
 * it, see {@link groupOpenOf}, or as the form of a series asks, see `groupPickOf` in `./series.ts`.
 * - `pinned`: The group pinned, empty for none.
 * - `keyOf`: Gives the weekday and start of a group, which order the groups, like `2 10:00`, `8` for one without slot.
 * - `slot`: The first slot of a group, `undefined` for none.
 *
 * @param course - The course
 * @param type - The type, like `TU`
 * @param show - Shows a pick, see {@link PickShow}
 * @param open - Opens a group to change it; in the form of a series of its own when left out, see {@link groupOpenOf}
 * @returns The menu
 */
export function pinnedMenuOf(course: Course, type: string, show: PickShow,
                             open: (group: string) => void = groupOpenOf(course, type)): HTMLElement {
    const pinned: string = pinnedOf(course, type);
    const keyOf: (group: Group) => string = (group: Group): string => {
        const slot: Slot | undefined = group.rule.slots[0];
        return slot === undefined ? "8" : `${slot.weekday} ${slot.start}`;
    };
    return groupMenuOf(pinned === "" ? ["No group yet"] : [iconOf(Pin), `Group ${pinned}`], course.groups
        .filter((group: Group): boolean => group.rule.type === type)
        .sort((first: Group, second: Group): number => keyOf(first).localeCompare(keyOf(second)))
        .map((group: Group): Item => {
            const slot: Slot | undefined = group.rule.slots[0];
            return {
                group: group, day: slot === undefined ? "" : weekdayNameOf(slot.weekday, false),
                times: slot === undefined ? "" : `${slot.start} – ${slot.end}`, checked: false,
                pick: (): void => {
                    if (group.rule.group !== pinned)
                        pinPick(course, group, show);
                },
            };
        }), pinned, open);
}

/**
 * Gives what opens a group of the menu of the groups in the form of a series, to change it, see `groupOpen`
 * in `./series.ts`: on the page of a module, which holds no dialog of a series before one opened, the day view's
 * dialogs put into the page first, see `dialogOf` in `../editor/dialog.ts`, loaded only then.
 *
 * @param course - The course
 * @param type - The type, like `TU`
 * @returns Opens a group, like `06`
 */
function groupOpenOf(course: Course, type: string): (group: string) => void {
    return (group: string): void => {
        (document.getElementById("series") !== null ? Promise.resolve()
            : import("../editor/dialog.ts").then(async (dialog: typeof import("../editor/dialog.ts")): Promise<void> => {
                await dialog.dialogOf();
            }))
            .then((): Promise<void> => groupOpen(course.module, type, course.semester, group))
            .catch((error: unknown): void => console.error(error));
    };
}

/**
 * Makes the series icon ⟳ at the right end of a group of the menu, the same as after the times of a box of a series,
 * see `seriesShow` in `./categories.ts`, which opens the group in the form of a series: inside the row of the group,
 * which a click on it never picks, so it is no button of its own but answers a click and the keys Enter and Space
 * as one, its words, like `Change Group 06`, its tooltip.
 * - `icon`: The icon.
 * - `act`: Opens the group, the row not picked.
 *
 * @param group - The group, like `06`
 * @param open - Opens it
 * @returns The icon
 */
function seriesIconOf(group: string, open: () => void): HTMLElement {
    const icon: HTMLElement = elementOf("span", "group-series", "");
    const act: (event: Event) => void = (event: Event): void => {
        event.stopPropagation();
        event.preventDefault();
        open();
    };
    icon.append(iconOf(Repeat));
    icon.title = `Change Group ${group}`;
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", `Change Group ${group}`);
    icon.tabIndex = 0;
    icon.addEventListener("click", act);
    icon.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter" || event.key === " ")
            act(event);
    });
    return icon;
}

/**
 * Makes the group of a box as plain text, small and grey, like `Group 03`, without menu, as a box of the plan names
 * it, see the top of this file, where only its dialog and its row on the page of its module pick it.
 *
 * @param box - The box
 * @returns Its group, `null` for a box without group
 */
export function groupNameOf(box: Box): HTMLElement | null {
    return box.group === "" ? null : elementOf("span", "group-name", `Group ${box.group}`);
}

/**
 * Makes the group of a box of a type with groups in its dialog and in its row on the page of its module, see the top
 * of this file: of a box that may go to another group, see {@link pickable}, while groups meet in its week, the menu
 * of the groups, see {@link groupMenuOf}, of the session of each group in its week not over yet, the earliest first,
 * below its day, by its times, the group of the box checked, a pick moving only this box, see {@link weekPick}, each
 * with its series icon, which opens it, see {@link groupOpenOf}; of any other box its group grey,
 * see {@link groupNameOf}.
 * - `groups`: The groups of its type.
 * - `meetings`: The sessions of the groups in the week of the box not over yet, each with its group.
 * - `pinned`: The group pinned of its type, empty for none.
 * - `start`: The start of a session.
 *
 * @param course - Its course, `null` for none
 * @param box - The box
 * @param show - Shows a pick, see {@link PickShow}
 * @returns The menu, its group, `null` for a box without group and menu
 */
export function boxGroupOf(course: Course | null, box: Box, show: PickShow): HTMLElement | null {
    const groups: Group[] = (course?.groups ?? []).filter((group: Group): boolean => group.rule.type === box.type);
    const meetings: [Group, Session][] = meetingsOf(groups, mondayOf(box.day))
        .filter(([, session]: [Group, Session]): boolean => !overOf(session));
    if (course === null || meetings.length === 0 || !pickable(box))
        return groupNameOf(box);
    const pinned: string = pinnedOf(course, box.type);
    return groupMenuOf([box.group === "" ? "No group" : `Group ${box.group}`],
        meetings.map(([group, session]: [Group, Session]): Item => {
            const start: Date = new Date(session.start);
            return {
                group: group, day: weekdayDateTextOf(dayOf(start)),
                times: `${timeOf(start)} – ${timeOf(new Date(start.getTime() + session.minutes * 60 * 1000))}`,
                checked: group.rule.group === box.group, pick: (): void => weekPick(course, box, group, session, show),
            };
        }), pinned, groupOpenOf(course, box.type));
}
