/**
 * ## Panel
 *
 * The panel of a thing of my lists, a meal, a food, a workout, an exercise, the card of the entry by category.
 * Every value saves as it changes, so it has only the cross, which closes it as Esc and a click beside it do.
 * It stands in the element of its list, so the list loads anew on a change of my files only while I type outside.
 * Its look in `day.css` loads with the food view and with the sport view, never here,
 * since the day view loads it after the look of its calendar.
 */

import { X } from "lucide";
import { iconPut } from "../icons.ts";
import { rowOf } from "../day/choices.ts";
import { buttonOf, elementOf } from "./foods.ts";

/**
 * A panel of a list, filled anew with every change of what it shows.
 * - `buttons`: The cross at the bottom right, last in its form as in every panel.
 */
export type Panel = {
    dialog: HTMLDialogElement;
    form: HTMLElement;
    buttons: HTMLElement;
};

/** A panel put into the element of its list, closed, `closed` run however it closes. */
export function panelOf(into: HTMLElement, closed: () => void): Panel {
    const dialog: HTMLDialogElement = document.createElement("dialog");
    const form: HTMLElement = elementOf("div", "panel-form", "");
    const buttons: HTMLElement = elementOf("div", "panel-buttons", "");
    const close: HTMLButtonElement = buttonOf("", "", (): void => dialog.close());
    dialog.className = "panel entry-panel";
    dialog.setAttribute("closedby", "any");
    iconPut(close, X, "Close");
    buttons.append(close);
    form.append(buttons);
    dialog.append(form);
    dialog.addEventListener("close", closed);
    into.append(dialog);
    return { dialog: dialog, form: form, buttons: buttons };
}

/**
 * Shows rows in a panel, each its name grey at the left, then what stands below them.
 * The cursor stays in the field it stood in, found by its name, since every row is new.
 * It takes clicks again, which a field takes away while it sends.
 * Opened, no field takes the cursor, so a phone opens no keyboard, as in the entry dialog.
 */
export function panelShow(panel: Panel, rows: [string, HTMLElement][], below: HTMLElement[]): void {
    const typing: string | null = panel.form.contains(document.activeElement)
        ? (document.activeElement?.getAttribute("aria-label") ?? null)
        : null;
    panel.form.inert = false;
    panel.form.replaceChildren(
        ...rows.map(([name, value]: [string, HTMLElement]): HTMLElement => rowOf(name, value)),
        ...below,
        panel.buttons,
    );
    if (typing !== null) panel.form.querySelector<HTMLElement>(`input[aria-label="${CSS.escape(typing)}"]`)?.focus();
    if (panel.dialog.open) return;
    panel.dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/**
 * Puts the cursor into the search of a panel, which keeps it while the panel shows anew.
 * So I add one after another.
 */
export function panelSearchFocus(panel: Panel): void {
    panel.form.querySelector<HTMLInputElement>(".food-search input")?.focus();
}

/** Closes a panel while it is open. */
export function panelClose(panel: Panel): void {
    if (panel.dialog.open) panel.dialog.close();
}
