/**
 * ## Actions
 *
 * What an open box of the plan can do,
 * as small icon buttons in one row in a column of their own at its right,
 * beside its first two lines, the same in a box of the day, see `boxes.ts`,
 * and in its row on the page of its module, see `../editor/course.ts`: `Log`,
 * which logs it as expected, `Submit` in its place for a box with a deadline,
 * which ticks it submitted, its sessions staying in the log;
 * then, only for a box that can be changed, `Move`,
 * which pushes it to the next day, one whose day is over to tomorrow,
 * but for a box with a deadline,
 * which stays on the day of its deadline,
 * a move by mistake set right by moving it again in its dialog, see `reader/boxes.ts`;
 * `Cancel` for a lecture, an exercise, a tutorial or a sheet, see `numberedTypes` in `series.ts`,
 * which marks it cancelled by the university; and last `Skip`, which cancels it;
 * packed together at the right, the same gap between them, however many a box has.
 * A box whose day is over has no `Move`, since what I set right moves by its dialog.
 * The series of a box opens from the pencil after its
 * times in its dialog, see `seriesShow` in `categories.ts`.
 * Each its icon, its word as tooltip, in the one look of an icon button,
 * see `.icon-button` in `../base.css` and `.box-actions` in `boxes.css`;
 * a click on one never opens the box.
 * On a phone they stay behind one button `⋯`, each its icon and then its words in its menu,
 * see `../menu.ts`, since a row of them leaves what a box is no room there,
 * like a tutorial beside its group;
 * but in the row of a list,
 * see `rows.ts`, the same icons as on the computer, on a line of their own below the row,
 * so a list works alike everywhere.
 * A box no longer open shows the icon of its state in that place instead,
 * see `stateOf` in `boxes.ts`.
 *
 * - `./entries.ts`: Sends a box submitted, pushed, cancelled and skipped to the reader.
 * - `./series.ts`: Names the numbered types.
 * - `../skill/attempts.ts`: Names the category of skill entries.
 * - `../icons.ts`: Puts the icons into the buttons, their words as tooltip.
 * - `../menu.ts`: Puts the actions behind one button `⋯` on a phone.
 * - `../phone.ts`: Tells a phone.
 * - `../today.ts`: Gives today's calendar date, which tells a box whose day is over.
 * - `lucide`: The icons check, arrow, calendar crossed out and cross.
 */

import { boxDrop, boxPush, boxSubmit, boxUniversity } from "./entries.ts";
import { numberedTypes } from "./series.ts";
import { skillName } from "../skill/attempts.ts";
import { iconPut } from "../icons.ts";
import { menuItemOf, menuOf } from "../menu.ts";
import { phone } from "../phone.ts";
import { calendarTodayOf } from "../today.ts";
import { ArrowRight, CalendarOff, Check, X } from "lucide";

import type { Box } from "./boxes.ts";
import type { IconNode } from "lucide";

/**
 * Makes one action of a box, its icon, its word as tooltip;
 * on a phone an item of its menu, its icon and then its words, but in a list.
 * - `button`: The button.
 *
 * @param icon - Icon, like `ArrowRight`
 * @param words - What it does, like `Move`
 * @param click - What a click does
 * @param listed - Whether it stands in the row of a list, which keeps its icons on a phone too
 * @returns The button
 */
function actionOf(
    icon: IconNode,
    words: string,
    click: () => void,
    listed: boolean,
): HTMLButtonElement {
    if (phone && !listed) return menuItemOf(icon, words, click);
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "box-action";
    iconPut(button, icon, words);
    button.addEventListener("click", click);
    return button;
}

/**
 * Makes the actions of an open box, see the top of this file.
 * - `send`: Makes the click of an action that sends a change of the box.
 * - `over`: Whether its day is over, without deadline, so it moves only by its dialog.
 * - `buttons`: The actions in their order.
 * - `actions`: The actions in their row, on a phone the button `⋯` with its menu, but in a list.
 *
 * @param box - The box, open
 * @param log - Logs it as expected
 * @param act - Sends a change of the box to the reader and then shows the boxes anew
 * @param listed - Whether they stand in the row of a list, see `rows.ts`,
 *   which keeps its icons on a phone too;
 *   false when left out
 * @returns The actions
 */
export function boxActionsOf(
    box: Box,
    log: () => void,
    act: (send: () => Promise<void>) => void,
    listed: boolean = false,
): HTMLElement {
    const send: (change: () => Promise<void>) => () => void =
        (change: () => Promise<void>): (() => void) =>
        (): void =>
            act(change);
    const over: boolean = box.deadline === "" && box.day < calendarTodayOf();
    const buttons: HTMLButtonElement[] = [
        box.deadline === ""
            ? actionOf(Check, "Log", log, listed)
            : actionOf(
                  Check,
                  "Submit",
                  send((): Promise<void> => boxSubmit(box.id, true)),
                  listed,
              ),
    ];
    if (box.editable)
        buttons.push(
            ...(box.deadline !== "" || over
                ? []
                : [
                      actionOf(
                          ArrowRight,
                          "Move",
                          send((): Promise<void> => boxPush(box.id)),
                          listed,
                      ),
                  ]),
            ...(box.category === skillName && numberedTypes.includes(box.type)
                ? [
                      actionOf(
                          CalendarOff,
                          "Cancel",
                          send((): Promise<void> => boxUniversity(box.id, true)),
                          listed,
                      ),
                  ]
                : []),
            actionOf(
                X,
                "Skip",
                send((): Promise<void> => boxDrop(box.id, true)),
                listed,
            ),
        );
    const actions: HTMLElement = phone && !listed ? menuOf(buttons) : document.createElement("div");
    if (!phone || listed) actions.append(...buttons);
    actions.classList.add("box-actions");
    actions.addEventListener("click", (event: MouseEvent): void => event.stopPropagation());
    return actions;
}
