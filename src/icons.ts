/**
 * ## Icons
 *
 * Icons for the obvious actions from Lucide, the icon set of Obsidian, only the icons used go into the page.
 * A button with an icon keeps its words as tooltip and as its name for screen readers.
 * Where an icon would be unclear, the words stay.
 * The plus, the `×` and the search field are made only here, so they look and act the same everywhere.
 */

import {
    Clock,
    createElement,
    Droplets,
    Dumbbell,
    Egg,
    Flame,
    GlassWater,
    Moon,
    Plus,
    Search,
    Soup,
    Utensils,
    Weight,
    Wheat,
    X,
} from "lucide";

import type { IconNode } from "lucide";

/**
 * A plain question mark, which Lucide has only in a circle.
 * The paths of `CircleQuestionMark` scaled by 1.5, so it fills as much as the other icons.
 */
export const QuestionMark: IconNode = [
    ["path", { d: "M7.64 7.5a4.5 4.5 0 0 1 8.74 1.5c0 3-4.5 4.5-4.5 4.5" }],
    ["path", { d: "M12 19.5h.01" }],
];

/**
 * An icon hidden from screen readers, which read the words of its button instead.
 * Its class `lucide`, which `createElement` leaves out, lets `base.css` size it.
 */
export function iconOf(icon: IconNode): SVGElement {
    return createElement(icon, { class: "lucide", "aria-hidden": "true" });
}

/** Shows an icon in place of its words, only a real button takes the look `.icon-button`. */
export function iconPut(button: HTMLElement, icon: IconNode, words: string): void {
    button.replaceChildren(iconOf(icon));
    button.title = words;
    button.setAttribute("aria-label", words);
    if (button instanceof HTMLButtonElement) button.classList.add("icon-button");
}

/** The icon of each name of a tile of a bar, a nutrient by a food made mostly of it, fat by drops of oil. */
const tileIcons: { [name: string]: IconNode } = {
    Sleep: Moon,
    Water: GlassWater,
    Food: Utensils,
    Meals: Soup,
    Energy: Flame,
    Protein: Egg,
    Carbs: Wheat,
    Fat: Droplets,
    Sessions: Dumbbell,
    Time: Clock,
    Weight: Weight,
};

/** The name of a tile of a bar as its icon, the name its tooltip, the word itself where no icon is clear. */
export function tileNameOf(name: string): HTMLElement {
    const label: HTMLElement = document.createElement("span");
    label.className = "tracker-name";
    const icon: IconNode | undefined = tileIcons[name];
    if (icon === undefined) {
        label.textContent = name;
        return label;
    }
    label.append(iconOf(icon));
    label.title = name;
    label.setAttribute("aria-label", name);
    return label;
}

export function iconWordsOf(icon: IconNode, words: string): Node[] {
    return [iconOf(icon), document.createTextNode(words)];
}

/** The small grey plus of every list. */
export function plusPut(button: HTMLElement, words: string): void {
    iconPut(button, Plus, words);
    button.classList.add("plus-quiet");
}

/** Takes the plus out of a button again, with its tooltip and its name for screen readers. */
export function plusTake(button: HTMLElement): void {
    button.replaceChildren();
    button.classList.remove("plus-quiet", "icon-button");
    button.removeAttribute("aria-label");
    button.removeAttribute("title");
}

/** The small grey plus with what it adds, so a plus inside a list always names what it adds. */
export function plusTypedPut(button: HTMLElement, text: string): void {
    button.replaceChildren(iconOf(Plus), text);
}

/** The small grey `×` of every list. */
export function crossPut(button: HTMLElement, words: string): void {
    iconPut(button, X, words);
    button.classList.add("cross-quiet");
}

/** The one search field of the page, its card the label, so a click on the magnifier puts the cursor in. */
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
