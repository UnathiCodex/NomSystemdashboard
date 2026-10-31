/**
 * ## Groups
 *
 * The menu of the groups of my tutorials,
 * see `reader/course.ts`, one and the same wherever it shows:
 * at the right of the heading of the card of the tutorials on the page of a module,
 * see `../editor/course.ts`, and in the dialog of a tutorial, see `./categories.ts`,
 * and in a row of the page of a module, both of which pick the group of their box;
 * a box of the plan, see `./boxes.ts`, names its group only,
 * grey, see {@link groupNameOf}.
 * Its button names a group small and grey with a small chevron;
 * a click on it opens the menu below it as the menu `⋯` does,
 * see `menuAnchor` in `../menu.ts`, see {@link groupMenuOf}.
 * A row is one click: anywhere on it closes the menu and picks the group,
 * but for the one checked, and nothing in the menu opens the box of its row or a person.
 * The menu of the heading, see {@link pinnedMenuOf}, pins a group, see {@link pinPick},
 * and its pin takes it back, see {@link unpinPick}.
 * The dialog of a box and its row name its group, see {@link boxGroupOf},
 * a pick moving only that week's box, see {@link weekPick}.
 * At the right end of every group the series icon opens that group in the form of a
 * series,
 * see `groupOpen` in `./series.ts`, which makes and changes the groups themselves,
 * see {@link seriesIconOf};
 * a group is pinned only in the heading of the card, never from a box.
 * A pick shows at once, as the page of the menu shows it, see {@link PickShow},
 * and the reader confirms it.
 *
 * - `../editor/dialog.ts`: Puts the dialog of a series into the page of a module
 *   before a group opens there, loaded only then.
 */

import { courseSend, groupOpen, mondayOf, roomOf, weekdayNameOf } from "./series.ts";
import { lengthOf, rangeDash, timeOf, weekdayDateTextOf } from "./times.ts";
import { dayOf } from "../skill/attempts.ts";
import { calendarTodayOf } from "../today.ts";
import { elementOf } from "../food/foods.ts";
import { iconOf } from "../icons.ts";
import { menuAnchor, menuItemOf } from "../menu.ts";
import { dottedOf } from "../persons.ts";
import { Check, ChevronDown, Pin, Repeat } from "lucide";
import "./groups.css";

import type { Box } from "./boxes.ts";
import type { Course, Group, Series, Session } from "./series.ts";
import type { Attendee } from "../../reader/calendar.ts";
import type { Planned, Slot } from "../../reader/course.ts";

/**
 * Shows a pick of a group at once and sends it, as the page of the menu does:
 * changes what the page shows by `change`, shows it anew,
 * then sends the pick to the reader by `send` and loads anew once the reader answers,
 * also when it does not take it, so a pick shown at once goes back.
 */
export type PickShow = (change: () => void, send: () => Promise<unknown>) => void;

/**
 * A group in the menu of the groups, see {@link groupMenuOf}.
 *
 * - `day`: The day it stands below, the weekday of the group
 *   or the day of its session, empty for none.
 */
type Item = {
    group: Group;
    day: string;
    times: string;
    checked: boolean;
    pick: () => void;
};

/**
 * Tells whether a box may go to another group by a pick:
 * an open to-do of the new system from today on,
 * no date of a series of a file, never pushed,
 * as a change of the reader may move it, see `changeable` in `reader/course.ts`.
 */
export function pickable(box: Box): boolean {
    return (
        box.state === "open" &&
        box.editable &&
        box.todo &&
        !box.series &&
        box.pushed.length === 0 &&
        box.day >= calendarTodayOf()
    );
}

/**
 * Tells whether a session of a group has no times, only its day and its length,
 * see `Session` in `reader/course.ts`.
 */
function dayIs(session: Session): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(session.start);
}

/** Writes the times of a session of a group, of one without times its length. */
function sessionTimesOf(session: Session): string {
    if (dayIs(session)) return lengthOf(session.minutes);
    const start: Date = new Date(session.start);
    return (
        `${timeOf(start)}${rangeDash}` +
        timeOf(new Date(start.getTime() + session.minutes * 60 * 1000))
    );
}

/** Tells whether a session of a group is over. */
function overOf(session: Session): boolean {
    return Date.parse(session.start) + session.minutes * 60 * 1000 <= Date.now();
}

/** Gives the sessions of groups in a week, each with its group, the earliest first. */
function meetingsOf(groups: Group[], week: string): [Group, Session][] {
    return groups
        .flatMap((group: Group): [Group, Session][] =>
            group.sessions
                .filter(
                    (session: Session): boolean =>
                        mondayOf(dayOf(new Date(session.start))) === week,
                )
                .map((session: Session): [Group, Session] => [group, session]),
        )
        .sort((first: [Group, Session], second: [Group, Session]): number =>
            first[1].start.localeCompare(second[1].start),
        );
}

/** Gives the group pinned of a type: the group of its series, empty for none. */
function pinnedOf(course: Course, type: string): string {
    return (
        course.series.find((series: Series): boolean => series.rule.type === type)?.rule
            .group ?? ""
    );
}

/**
 * Moves a box shown to the session of a group, as the reader moves it,
 * see `targetOf` in `reader/course.ts`.
 */
function boxMove(box: Box, group: Group, session: Session): void {
    Object.assign<Box, Partial<Box>>(box, {
        day: dayOf(new Date(session.start)),
        time: dayIs(session) ? "" : session.start,
        minutes: session.minutes,
        location: group.rule.location,
        locationLink: group.rule.locationLink,
        online: group.rule.online,
        onlineLink: group.rule.onlineLink,
        onlineChannel: group.rule.onlineChannel,
        onlineTitle: group.rule.onlineTitle,
        attendees: group.rule.attendees,
        group: group.rule.group,
    });
}

/**
 * Pins a group:
 * at once the series of its type goes to the group, a new one while it has none,
 * and every open box of its type to come of the group pinned before,
 * or without group, goes to the session of the group in its week,
 * where it meets one not over yet, a box of another group staying as my own choice;
 * then the reader, see `groupMine` in `reader/course.ts`,
 * moves every such box it may change from the group's next session on,
 * and with no series yet makes its sessions to come my series.
 */
function pinPick(course: Course, group: Group, show: PickShow): void {
    show(
        (): void => {
            const pinned: string = pinnedOf(course, group.rule.type);
            const series: Series | undefined = course.series.find(
                (one: Series): boolean => one.rule.type === group.rule.type,
            );
            if (series === undefined)
                course.series.push({ rule: { ...group.rule }, count: 0 });
            else series.rule.group = group.rule.group;
            course.boxes
                .filter(
                    (box: Box): boolean =>
                        box.type === group.rule.type &&
                        pickable(box) &&
                        (box.group === "" || box.group === pinned),
                )
                .forEach((box: Box): void => {
                    const session: Session | undefined = group.sessions.find(
                        (one: Session): boolean =>
                            !overOf(one) &&
                            mondayOf(dayOf(new Date(one.start))) === mondayOf(box.day),
                    );
                    if (session !== undefined) boxMove(box, group, session);
                });
        },
        (): Promise<Planned[]> =>
            courseSend<Planned[]>("/api/course/mine", {
                module: course.module,
                type: group.rule.type,
                group: group.rule.group,
            }),
    );
}

/**
 * Takes the group pinned back:
 * at once the series of its type has no group
 * and its open boxes of the group from today on go;
 * then the reader, see `groupMine` in `reader/course.ts`,
 * removes them, every box done, skipped,
 * pushed, of a day over or of another group, my own choice, staying.
 */
function unpinPick(course: Course, type: string, show: PickShow): void {
    show(
        (): void => {
            const today: string = calendarTodayOf();
            const pinned: string = pinnedOf(course, type);
            course.series
                .filter((series: Series): boolean => series.rule.type === type)
                .forEach((series: Series): void => {
                    series.rule.group = "";
                });
            course.boxes = course.boxes.filter(
                (box: Box): boolean =>
                    box.type !== type ||
                    box.state !== "open" ||
                    box.day < today ||
                    (box.group !== "" && box.group !== pinned),
            );
        },
        (): Promise<Planned[]> =>
            courseSend<Planned[]>("/api/course/mine", {
                module: course.module,
                type: type,
                group: "",
            }),
    );
}

/**
 * Moves one week's box to the session of a group, that week alone:
 * at once, then by the reader, see `weekPick` in `reader/course.ts`.
 */
function weekPick(
    course: Course,
    box: Box,
    group: Group,
    session: Session,
    show: PickShow,
): void {
    show(
        (): void => boxMove(box, group, session),
        (): Promise<null> =>
            courseSend<null>("/api/course/pick", {
                module: course.module,
                type: box.type,
                group: group.rule.group,
                start: session.start,
            }),
    );
}

/**
 * Makes the tutors of a group in the menu of the groups, apart by a middle dot,
 * see `dottedOf` in `../persons.ts`, plain text,
 * so a click on them picks the group as anywhere on its row.
 */
function tutorsOf(group: Group): HTMLElement | null {
    const names: string[] = group.rule.attendees.map(
        (attendee: Attendee): string => attendee.name,
    );
    const tutors: HTMLElement = elementOf("span", "group-tutors", "");
    if (names.length === 0) return null;
    tutors.append(...dottedOf(names));
    return tutors;
}

/**
 * Gives the parts of a group in the menu of the groups, each on a column of its own,
 * all on one line: its group, then its times and where it is:
 * its platform online whenever it has one, as every skill entry shows it,
 * see `whereOf` in `./places.ts`, else its place short,
 * see `roomOf` in `./series.ts`, as a row of the page of a module writes them;
 * and its tutors while known, see {@link tutorsOf}.
 */
function groupPartsOf(
    group: Group,
    times: string,
): [string, HTMLElement, HTMLElement | null] {
    const where: HTMLElement = elementOf("span", "group-detail", "");
    where.append(
        ...[
            times,
            group.rule.online !== "" ? group.rule.online : roomOf(group.rule.location),
        ]
            .filter((part: string): boolean => part !== "")
            .map((part: string, index: number): HTMLElement =>
                elementOf("span", index === 0 ? "" : "entry-parted", part),
            ),
    );
    return [`Group ${group.rule.group}`, where, tutorsOf(group)];
}

/**
 * Makes the menu of the groups:
 * its button, which opens its items as the menu `⋯` does,
 * above the groups of each day that day, each group by its parts,
 * see {@link groupPartsOf}, the parts of all on the same columns,
 * the checked one by a check, the one pinned by a small pin
 * in a column of its own, so the groups stand one below the other;
 * a click on a group closes the menu and picks it, but for the one checked;
 * at the right end of each group its series icon, see {@link seriesIconOf};
 * while it has a way to take the group pinned back, a click on that pin does so.
 */
function groupMenuOf(
    words: (string | Node)[],
    items: Item[],
    pinned: string,
    open: (group: string) => void,
    unpin?: () => void,
): HTMLElement {
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
            if (!item.checked) item.pick();
        });
        const mark: HTMLElement = elementOf("span", "group-pin", "");
        if (item.group.rule.group === pinned) mark.append(iconOf(Pin));
        if (item.group.rule.group === pinned && unpin !== undefined) {
            const release: (event: Event) => void = (event: Event): void => {
                event.stopPropagation();
                event.preventDefault();
                menu.hidePopover();
                unpin();
            };
            mark.classList.add("group-unpin");
            mark.title = "Unpin";
            mark.setAttribute("role", "button");
            mark.setAttribute("aria-label", "Unpin");
            mark.tabIndex = 0;
            mark.addEventListener("click", release);
            mark.addEventListener("keydown", (event: KeyboardEvent): void => {
                if (event.key === "Enter" || event.key === " ") release(event);
            });
        }
        line.classList.add("group-item");
        line.classList.toggle("menu-item-blank", !item.checked);
        line.append(
            mark,
            elementOf("span", "", name),
            details,
            tutors ?? elementOf("span", "", ""),
            seriesIconOf(item.group.rule.group, (): void => {
                menu.hidePopover();
                open(item.group.rule.group);
            }),
        );
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
 * Makes the menu of the group pinned in the heading of the card of a type with groups:
 * the group pinned with the pin before it, `No group yet` while none is,
 * its items every group of the type by the weekday and times of its first slot,
 * the one pinned marked by its pin alone, no check,
 * since a series is no one week, a pick of another pinning it, see {@link pinPick},
 * and while one is pinned its pin takes it back, see {@link unpinPick};
 * each with its series icon, which opens it to change it, see {@link groupOpenOf},
 * or as the form of a series asks, see `groupPickOf` in `./series.ts`.
 */
export function pinnedMenuOf(
    course: Course,
    type: string,
    show: PickShow,
    open: (group: string) => void = groupOpenOf(course, type),
): HTMLElement {
    const pinned: string = pinnedOf(course, type);
    const keyOf: (group: Group) => string = (group: Group): string => {
        const slot: Slot | undefined = group.rule.slots[0];
        return slot === undefined ? "8" : `${slot.weekday} ${slot.start}`;
    };
    return groupMenuOf(
        pinned === "" ? ["No group yet"] : [iconOf(Pin), `Group ${pinned}`],
        course.groups
            .filter((group: Group): boolean => group.rule.type === type)
            .sort((first: Group, second: Group): number =>
                keyOf(first).localeCompare(keyOf(second)),
            )
            .map((group: Group): Item => {
                const slot: Slot | undefined = group.rule.slots[0];
                return {
                    group: group,
                    day: slot === undefined ? "" : weekdayNameOf(slot.weekday, false),
                    times:
                        slot === undefined
                            ? ""
                            : slot.start === ""
                              ? lengthOf(slot.minutes ?? 0)
                              : `${slot.start}${rangeDash}${slot.end}`,
                    checked: false,
                    pick: (): void => {
                        if (group.rule.group !== pinned) pinPick(course, group, show);
                    },
                };
            }),
        pinned,
        open,
        pinned === "" ? undefined : (): void => unpinPick(course, type, show),
    );
}

/**
 * Gives what opens a group of the menu of the groups in the form of a series,
 * see `groupOpen` in `./series.ts`: on the page of a module,
 * which holds no dialog of a series before one opened,
 * the day view's dialogs put into the page first,
 * see `dialogOf` in `../editor/dialog.ts`, loaded only then.
 */
function groupOpenOf(course: Course, type: string): (group: string) => void {
    return (group: string): void => {
        (document.getElementById("series") !== null
            ? Promise.resolve()
            : import("../editor/dialog.ts").then(
                  async (dialog: typeof import("../editor/dialog.ts")): Promise<void> => {
                      await dialog.dialogOf();
                  },
              )
        )
            .then((): Promise<void> =>
                groupOpen(course.module, type, course.semester, group),
            )
            .catch((error: unknown): void => console.error(error));
    };
}

/**
 * Makes the series icon ⟳ at the right end of a group of the menu,
 * the same as after the times of a box of a series,
 * which opens the group in the form of a series: inside the row of the group,
 * which a click on it never picks,
 * so it is no button of its own but answers a click
 * and the keys Enter and Space as one.
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
        if (event.key === "Enter" || event.key === " ") act(event);
    });
    return icon;
}

/**
 * Makes the group of a box as plain text, small and grey, without menu,
 * as a box of the plan names it,
 * where only its dialog and its row on the page of its module pick it.
 */
export function groupNameOf(box: Box): HTMLElement | null {
    return box.group === "" ? null : elementOf("span", "group-name", box.group);
}

/**
 * Makes the group of a box of a type with groups in its dialog
 * and in its row on the page of its module:
 * of a box that may go to another group, see {@link pickable},
 * while groups meet in its week, the menu of the groups
 * of the session of each group in its week not over yet,
 * the group of the box checked, a pick moving only this box, see {@link weekPick};
 * of any other box its group grey, see {@link groupNameOf}.
 */
export function boxGroupOf(
    course: Course | null,
    box: Box,
    show: PickShow,
    open?: (group: string) => void,
): HTMLElement | null {
    const groups: Group[] = (course?.groups ?? []).filter(
        (group: Group): boolean => group.rule.type === box.type,
    );
    const meetings: [Group, Session][] = meetingsOf(groups, mondayOf(box.day)).filter(
        ([, session]: [Group, Session]): boolean => !overOf(session),
    );
    if (course === null || meetings.length === 0 || !pickable(box))
        return groupNameOf(box);
    const pinned: string = pinnedOf(course, box.type);
    return groupMenuOf(
        [box.group === "" ? "No group" : box.group],
        meetings.map(([group, session]: [Group, Session]): Item => {
            const start: Date = new Date(session.start);
            return {
                group: group,
                day: weekdayDateTextOf(dayOf(start)),
                times: sessionTimesOf(session),
                checked: group.rule.group === box.group,
                pick: (): void => weekPick(course, box, group, session, show),
            };
        }),
        pinned,
        open ?? groupOpenOf(course, box.type),
    );
}
