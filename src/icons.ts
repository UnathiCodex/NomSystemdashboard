/**
 * ## Icons
 *
 * Icons for the obvious actions, like save, cancel, add, remove and history, from Lucide, the icon set of Obsidian;
 * only the icons used go into the page. A button with an icon keeps its words as tooltip and as its name
 * for screen readers; the icon draws in the grey of the button's text, one icon size big, see `variants.css`.
 * Where an icon would be unclear, like Right and Wrong, the words stay.
 * One plus adds one more and one `×` takes a value back, made only here, so they look and act the same everywhere,
 * for a meal, a food, a chapter, a type, a document or a way, see {@link plusPut} and {@link crossPut}.
 * A remove that asks once more shows a plain question mark, see {@link QuestionMark}.
 * Every search field of the page is made here too, with its quiet magnifier, see {@link searchFieldOf}.
 *
 * - `lucide`: Makes the SVG element of an icon; the icons plus, cross and magnifier.
 */

import { createElement, Plus, Search, X } from "lucide";

import type { IconNode } from "lucide";


/**
 * A plain question mark, without the circle of Lucide's `CircleQuestionMark`, which Lucide has no icon of: its two
 * paths alone, scaled by 1.5 about the middle of the icon, (12, 12), so the mark fills about as much of it as the
 * other icons do; shown by a remove that asks once more, `Really remove?`, like the bin of a dialog or the `×`
 * of a meal.
 */
export const QuestionMark: IconNode = [
    ["path", { d: "M7.64 7.5a4.5 4.5 0 0 1 8.74 1.5c0 3-4.5 4.5-4.5 4.5" }],
    ["path", { d: "M12 19.5h.01" }],
];

/**
 * Makes the element of an icon, hidden from screen readers, which read the words of its button instead.
 * Lucide draws it 24 px big; its class `lucide`, which `createElement` leaves out, lets `base.css` size it.
 * - {@link createElement}: Makes the SVG element of an icon, which draws in the colour of the text.
 *
 * @param icon - Icon, like `Check`
 * @returns SVG element of the icon
 */
export function iconOf(icon: IconNode): SVGElement {
    return createElement(icon, { class: "lucide", "aria-hidden": "true" });
}

/**
 * Shows an icon in a button in place of its words, which stay as its tooltip and its name for screen readers;
 * a button takes the one look of every icon button, see `.icon-button` in `base.css`, a mark that is no button,
 * like the state of a box that cannot be taken back, keeps its own.
 *
 * @param button - Button, like the save button of a dialog
 * @param icon - Icon, like `Check`
 * @param words - What the button does, like `Save`
 */
export function iconPut(button: HTMLElement, icon: IconNode, words: string): void {
    button.replaceChildren(iconOf(icon));
    button.title = words;
    button.setAttribute("aria-label", words);
    if (button instanceof HTMLButtonElement)
        button.classList.add("icon-button");
}

/**
 * Makes an icon with words beside it, like the number of attempts of a history.
 *
 * @param icon - Icon, like `History`
 * @param words - Words after the icon, like `3`
 * @returns Icon and words, to put into a button
 */
export function iconWordsOf(icon: IconNode, words: string): Node[] {
    return [iconOf(icon), document.createTextNode(words)];
}

/**
 * Shows the small grey plus of every list in a button, see `.plus-quiet` in `base.css`: the one plus that adds one more,
 * like a meal, a food, a chapter, a type or a document, its words as tooltip and as its name for screen readers.
 *
 * @param button - Button, like the line below the meals picked
 * @param words - What it adds, like `Add a meal`
 */
export function plusPut(button: HTMLElement, words: string): void {
    iconPut(button, Plus, words);
    button.classList.add("plus-quiet");
}

/**
 * Takes the plus out of a button again, with its tooltip and its name for screen readers, so the button shows
 * its text or nothing, like the line of a field once a value is picked.
 *
 * @param button - Button that showed the plus
 */
export function plusTake(button: HTMLElement): void {
    button.replaceChildren();
    button.classList.remove("plus-quiet", "icon-button");
    button.removeAttribute("aria-label");
    button.removeAttribute("title");
}

/**
 * Shows the small grey plus with what it adds in a button at the end of a list with a search, like `+ “skyr”`
 * for the text typed, or `+ New module IN2346_DeepLearning` for the folder a typed code and name make,
 * see `.picker-new` in `base.css`, so a plus inside a list always names what it adds.
 *
 * @param button - Button at the end of the list
 * @param text - What it adds, like `“skyr”`
 */
export function plusTypedPut(button: HTMLElement, text: string): void {
    button.replaceChildren(iconOf(Plus), text);
}

/**
 * Shows the small grey `×` of every list in a button, see `.cross-quiet` in `base.css`: the one `×` that takes
 * a value picked back, like a food, a meal or a chapter, its words as tooltip and as its name for screen readers.
 *
 * @param button - Button beside the value
 * @param words - What it takes back, like `Remove Hackfleisch`
 */
export function crossPut(button: HTMLElement, words: string): void {
    iconPut(button, X, words);
    button.classList.add("cross-quiet");
}

/**
 * Makes the one search field of the page around a field, see `.search-field` in `base.css`: a card of the soft grey
 * without a frame, the small grey magnifier at its left, then the field, its words naming what it searches, like
 * `Search places` or `Search files`, grey till I type, and its name for screen readers; the same in the food view,
 * in the tree, in the search of the log and in every list of a dialog, only as high as where it stands asks.
 * A click on the magnifier puts the cursor into the field, as the card is the field's label.
 * - `field`: The card around the magnifier and the field.
 *
 * @param input - The field, its events added by the search it belongs to
 * @param words - What it searches, like `Search meals`
 * @returns The card with the field, to put into the page in place of the field
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
