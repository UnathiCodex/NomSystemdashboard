/**
 * ## Panel
 *
 * The panel of a thing of my lists, a meal, a food, a workout, an exercise, the card of the entry by category.
 * Every value saves as it changes. The check takes the field I am in and closes, the cross closes,
 * as Esc and a click beside it do.
 * A row that adds has the plus beside its name, which opens its search as a list, as in the entry by category.
 * It stands in the element of its list, so the list loads anew on a change of my files only while I type outside.
 * Its look in `day.css` and `choices.css` loads with the food view and with the sport view, never here,
 * since the day view loads it after the look of its calendar.
 */

import { Check, X } from "lucide";
import { iconPut, plusPut } from "../icons.ts";
import { listOf, rowOf } from "../day/choices.ts";
import { buttonOf, elementOf } from "./foods.ts";

/**
 * A panel of a list, filled anew with every change of what it shows.
 * - `buttons`: The cross, then the check at the bottom right, last in its form as in every panel.
 */
export type Panel = {
    dialog: HTMLDialogElement;
    form: HTMLElement;
    buttons: HTMLElement;
};

/** A row of a panel by its name and value, where it adds also the search its plus opens. */
export type PanelRow = [string, HTMLElement] | [string, HTMLElement, HTMLElement];

/** A panel put into the element of its list, closed, `closed` run however it closes. */
export function panelOf(into: HTMLElement, closed: () => void): Panel {
    const dialog: HTMLDialogElement = document.createElement("dialog");
    const form: HTMLElement = elementOf("div", "panel-form", "");
    const buttons: HTMLElement = elementOf("div", "panel-buttons", "");
    const close: HTMLButtonElement = buttonOf("", "", (): void => dialog.close());
    const done: HTMLButtonElement = buttonOf("panel-main", "", (): void => {
        (document.activeElement as HTMLElement | null)?.blur();
        dialog.close();
    });
    dialog.className = "panel entry-panel";
    dialog.setAttribute("closedby", "any");
    iconPut(close, X, "Close");
    iconPut(done, Check, "Done");
    buttons.append(close, done);
    form.append(buttons);
    dialog.append(form);
    dialog.addEventListener("close", closed);
    into.append(dialog);
    return { dialog: dialog, form: form, buttons: buttons };
}

/**
 * Gives the plus of a row that adds, its search a list under it, emptied as it opens, the cursor in it.
 * The list closes when the panel shows anew after a pick.
 */
function plusOf(value: HTMLElement, search: HTMLElement, words: string): HTMLButtonElement {
    const plus: HTMLButtonElement = document.createElement("button");
    const box: HTMLElement = elementOf("div", "picker-box meal-box", "");
    const input: HTMLInputElement | null = search.querySelector("input");
    box.append(search);
    value.classList.add("picker");
    value.append(box);
    plusPut(plus, words);
    plus.classList.add("picker-line");
    listOf(
        value,
        plus,
        box,
        (): void => {
            if (input === null) return;
            input.value = "";
            input.dispatchEvent(new Event("input"));
            input.focus();
        },
        (): void => {},
    );
    return plus;
}

/**
 * Shows rows in a panel, each its name grey at the left, then what stands below them.
 * The cursor stays in the field it stood in, found by its name, since every row is new.
 * It takes clicks again, which a field takes away while it sends.
 * Opened, no field takes the cursor, so a phone opens no keyboard, as in the entry dialog.
 */
export function panelShow(panel: Panel, rows: PanelRow[], below: HTMLElement[]): void {
    const typing: string | null = panel.form.contains(document.activeElement)
        ? (document.activeElement?.getAttribute("aria-label") ?? null)
        : null;
    panel.form.inert = false;
    panel.form.replaceChildren(
        ...rows.map(([name, value, search]: PanelRow): HTMLElement => {
            const row: HTMLElement = rowOf(name, value);
            if (search !== undefined) row.querySelector(".entry-name")?.append(plusOf(value, search, `Add to ${name}`));
            return row;
        }),
        ...below,
        panel.buttons,
    );
    if (typing !== null) panel.form.querySelector<HTMLElement>(`input[aria-label="${CSS.escape(typing)}"]`)?.focus();
    if (panel.dialog.open) return;
    panel.dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/** Opens the search of a panel, as for a new meal whose first part I pick next. */
export function panelSearchOpen(panel: Panel): void {
    panel.form.querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/** Closes a panel while it is open. */
export function panelClose(panel: Panel): void {
    if (panel.dialog.open) panel.dialog.close();
}
