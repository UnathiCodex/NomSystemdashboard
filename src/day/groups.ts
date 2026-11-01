/**
 * ## Groups
 *
 * The menu of the groups of my tutorials, one and the same wherever it shows.
 * Its button names a group small and grey with a small chevron and opens the menu below it.
 * A click anywhere on a row picks the group, and nothing in the menu opens a box or a person.
 * The menu in the heading of the card pins a group, a group is never pinned from a box.
 * The menu of a box moves only that week's box.
 * The series icon of every group opens that group in the form of a series.
 * A pick shows at once and the reader confirms it.
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
 * Shows a pick of a group at once by `change`, then sends it by `send`.
 * The page loads anew once the reader answers, also when it refuses, so a pick shown at once goes back.
 */
export type PickShow = (change: () => void, send: () => Promise<unknown>) => void;

/**
 * A group in the menu of the groups.
 *
 * - `day`: The day it stands below, the weekday of the group or the day of its session, empty for none.
 */
type Item = {
    group: Group;
    day: string;
    times: string;
    checked: boolean;
    pick: () => void;
};

/**
 * Whether a box may go to another group by a pick, as the reader may move it.
 * That is an open to-do of the new system from today on, never pushed, no date of a series of a file.
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

/** Whether a session of a group has no times, only its day and its length. */
function dayIs(session: Session): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(session.start);
}

/** The times of a session of a group, of one without times its length. */
function sessionTimesOf(session: Session): string {
    if (dayIs(session)) return lengthOf(session.minutes);
    const start: Date = new Date(session.start);
    return `${timeOf(start)}${rangeDash}` + timeOf(new Date(start.getTime() + session.minutes * 60 * 1000));
}

function overOf(session: Session): boolean {
    return Date.parse(session.start) + session.minutes * 60 * 1000 <= Date.now();
}

/** The sessions of groups in a week, each with its group, the earliest first. */
function meetingsOf(groups: Group[], week: string): [Group, Session][] {
    return groups
        .flatMap((group: Group): [Group, Session][] =>
            group.sessions
                .filter((session: Session): boolean => mondayOf(dayOf(new Date(session.start))) === week)
                .map((session: Session): [Group, Session] => [group, session]),
        )
        .sort((first: [Group, Session], second: [Group, Session]): number =>
            first[1].start.localeCompare(second[1].start),
        );
}

/** The group pinned of a type, the group of its series, empty for none. */
function pinnedOf(course: Course, type: string): string {
    return course.series.find((series: Series): boolean => series.rule.type === type)?.rule.group ?? "";
}

/** Moves a box shown to the session of a group, as the reader moves it. */
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
 * Pins a group, the series of its type going to the group, a new series while it has none.
 * Every open box of the group pinned before or without group goes to the group's session in its week.
 * A box of another group stays as my own choice.
 */
function pinPick(course: Course, group: Group, show: PickShow): void {
    show(
        (): void => {
            const pinned: string = pinnedOf(course, group.rule.type);
            const series: Series | undefined = course.series.find(
                (one: Series): boolean => one.rule.type === group.rule.type,
            );
            if (series === undefined) course.series.push({ rule: { ...group.rule }, count: 0 });
            else series.rule.group = group.rule.group;
            course.boxes
                .filter(
                    (box: Box): boolean =>
                        box.type === group.rule.type && pickable(box) && (box.group === "" || box.group === pinned),
                )
                .forEach((box: Box): void => {
                    const session: Session | undefined = group.sessions.find(
                        (one: Session): boolean =>
                            !overOf(one) && mondayOf(dayOf(new Date(one.start))) === mondayOf(box.day),
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
 * Takes the group pinned back, the series of its type without group, its open boxes from today on gone.
 * A box done or skipped or pushed stays, as one of a day over or of another group.
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

/** Moves one week's box to the session of a group, that week alone. */
function weekPick(course: Course, box: Box, group: Group, session: Session, show: PickShow): void {
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

/** The tutors of a group apart by a middle dot, plain text, so a click on them picks the group. */
function tutorsOf(group: Group): HTMLElement | null {
    const names: string[] = group.rule.attendees.map((attendee: Attendee): string => attendee.name);
    const tutors: HTMLElement = elementOf("span", "group-tutors", "");
    if (names.length === 0) return null;
    tutors.append(...dottedOf(names));
    return tutors;
}

/**
 * The parts of a group in the menu, each on a column of its own, all on one line.
 * Where it is is its platform online whenever it has one, else its place short.
 */
function groupPartsOf(group: Group, times: string): [string, HTMLElement, HTMLElement | null] {
    const where: HTMLElement = elementOf("span", "group-detail", "");
    where.append(
        ...[times, group.rule.online !== "" ? group.rule.online : roomOf(group.rule.location)]
            .filter((part: string): boolean => part !== "")
            .map((part: string, index: number): HTMLElement =>
                elementOf("span", index === 0 ? "" : "entry-parted", part),
            ),
    );
    return [`Group ${group.rule.group}`, where, tutorsOf(group)];
}

/**
 * The menu of the groups, its button opening its items as the menu `⋯` does.
 * The groups of each day stand below that day, their parts on the same columns.
 * The pin has a column of its own, so the groups stand one below the other.
 * With `unpin` a click on the pin takes the group pinned back.
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
        const [name, details, tutors]: [string, HTMLElement, HTMLElement | null] = groupPartsOf(item.group, item.times);
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
        if (item.day !== "" && item.day !== day) menu.append(elementOf("div", "group-day", item.day));
        day = item.day;
        menu.append(line);
    });
    place.addEventListener("click", (event: MouseEvent): void => event.stopPropagation());
    place.append(button, menu);
    return place;
}

/**
 * The menu of the group pinned in the heading of the card of a type with groups.
 * Its items are the groups of the type by the weekday and times of their first slot.
 * The one pinned is marked by its pin alone, no check, since a series is no one week.
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
            .sort((first: Group, second: Group): number => keyOf(first).localeCompare(keyOf(second)))
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
 * What opens a group in the form of a series.
 * The page of a module holds no dialog of a series before, so the dialogs are loaded first.
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
            .then((): Promise<void> => groupOpen(course.module, type, course.semester, group))
            .catch((error: unknown): void => console.error(error));
    };
}

/**
 * The series icon ⟳ of a group of the menu, which opens the group in the form of a series.
 * It stands inside the row button, so it is no button but answers a click and Enter and Space as one.
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

/** The group of a box as plain text, small and grey, without menu. */
export function groupNameOf(box: Box): HTMLElement | null {
    return box.group === "" ? null : elementOf("span", "group-name", box.group);
}

/**
 * The group of a box of a type with groups, a menu of the sessions of its week not over yet.
 * A box that may not go to another group shows its group grey.
 */
export function boxGroupOf(
    course: Course | null,
    box: Box,
    show: PickShow,
    open?: (group: string) => void,
): HTMLElement | null {
    const groups: Group[] = (course?.groups ?? []).filter((group: Group): boolean => group.rule.type === box.type);
    const meetings: [Group, Session][] = meetingsOf(groups, mondayOf(box.day)).filter(
        ([, session]: [Group, Session]): boolean => !overOf(session),
    );
    if (course === null || meetings.length === 0 || !pickable(box)) return groupNameOf(box);
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
