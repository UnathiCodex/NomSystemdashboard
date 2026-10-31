/**
 * ## Icons
 *
 * Icons for the obvious actions from Lucide, the icon set of Obsidian,
 * only the icons used go into the page.
 * A button with an icon keeps its words as tooltip and as its name for screen readers.
 * Where an icon would be unclear, like Right and Wrong, the words stay.
 * One plus adds one more and one `×` takes a value back, made only here,
 * so they look and act the same everywhere, see {@link plusPut} and {@link crossPut}.
 * Every search field of the page is made here too, see {@link searchFieldOf}.
 */

import { createElement, Plus, Search, X } from "lucide";

import type { IconNode } from "lucide";

/**
 * A plain question mark, which Lucide has no icon of without a circle:
 * the two paths of `CircleQuestionMark` alone, scaled by 1.5 about the middle,
 * so the mark fills about as much as the other icons do.
 * Shown by a remove that asks once more, `Really remove?`.
 */
export const QuestionMark: IconNode = [
    ["path", { d: "M7.64 7.5a4.5 4.5 0 0 1 8.74 1.5c0 3-4.5 4.5-4.5 4.5" }],
    ["path", { d: "M12 19.5h.01" }],
];

/**
 * Makes the element of an icon, hidden from screen readers,
 * which read the words of its button instead.
 * Its class `lucide`, which `createElement` leaves out, lets `base.css` size it.
 */
export function iconOf(icon: IconNode): SVGElement {
    return createElement(icon, { class: "lucide", "aria-hidden": "true" });
}

/**
 * Shows an icon in a button in place of its words,
 * which stay as its tooltip and its name for screen readers.
 * Only a real button takes the look `.icon-button`,
 * a mark that is no button keeps its own.
 */
export function iconPut(button: HTMLElement, icon: IconNode, words: string): void {
    button.replaceChildren(iconOf(icon));
    button.title = words;
    button.setAttribute("aria-label", words);
    if (button instanceof HTMLButtonElement) button.classList.add("icon-button");
}

/**
 * Makes an icon with words beside it, like the number of attempts of a history.
 */
export function iconWordsOf(icon: IconNode, words: string): Node[] {
    return [iconOf(icon), document.createTextNode(words)];
}

/**
 * Shows the small grey plus of every list in a button, see `.plus-quiet` in `base.css`.
 */
export function plusPut(button: HTMLElement, words: string): void {
    iconPut(button, Plus, words);
    button.classList.add("plus-quiet");
}

/**
 * Takes the plus out of a button again, with its tooltip and its name for screen readers,
 * like the line of a field once a value is picked.
 */
export function plusTake(button: HTMLElement): void {
    button.replaceChildren();
    button.classList.remove("plus-quiet", "icon-button");
    button.removeAttribute("aria-label");
    button.removeAttribute("title");
}

/**
 * Shows the small grey plus with what it adds at the end of a list with a search,
 * see `.picker-new` in `base.css`, so a plus inside a list always names what it adds.
 */
export function plusTypedPut(button: HTMLElement, text: string): void {
    button.replaceChildren(iconOf(Plus), text);
}

/**
 * Shows the small grey `×` of every list in a button, see `.cross-quiet` in `base.css`.
 */
export function crossPut(button: HTMLElement, words: string): void {
    iconPut(button, X, words);
    button.classList.add("cross-quiet");
}

/**
 * Makes the one search field of the page, see `.search-field` in `base.css`.
 * The card is the field's label,
 * so a click on the magnifier puts the cursor into the field.
 */
export function searchFieldOf(input: HTMLInputElement, words: string): HTMLLabelElement {
    const field: HTMLLabelElement = document.createElement("label");
    field.className = "search-field";
    input.type = "search";
    input.placeholder = words;
    input.autocomplete = "off";
    input.setAttribute("aria-label", words);
    field.append(iconOf(Search), input);
    return field;
}
