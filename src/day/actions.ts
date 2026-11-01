/**
 * ## Actions
 *
 * What an open box of the plan can do, as small icon buttons in one row at its right,
 * the same in a box of the day, see `boxes.ts`,
 * and in its row on the page of its module, see `../editor/course.ts`:
 * `Log`, or `Submit` for a box with a deadline, its sessions staying in the log;
 * then, only for a box that can be changed, `Move` to the next day,
 * but not for a box with a deadline, which stays on the day of its deadline;
 * `Cancel` by the university for the types of `numberedTypes` in `series.ts`;
 * and last `Skip`.
 * A box whose day is over has no `Move`, since what I set right moves by its dialog.
 * A click on one never opens the box.
 * On a phone they stay behind one button `⋯`, see `../menu.ts`,
 * since a row of them leaves what a box is no room there;
 * but in the row of a list, see `rows.ts`, the same icons as on the computer,
 * so a list works alike everywhere.
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

/** Makes one action of a box, on a phone an item of its menu, but in a list. */
function actionOf(icon: IconNode, words: string, click: () => void, listed: boolean): HTMLButtonElement {
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
 *
 * @param act - Sends a change of the box to the reader and then shows the boxes anew
 * @param listed - Whether they stand in the row of a list, see `rows.ts`,
 *   which keeps its icons on a phone too
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
