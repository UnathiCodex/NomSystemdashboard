/**
 * ## Menu
 *
 * One plain button `⋯` that holds what a thing can do,
 * on the computer as on a phone, so both show the same:
 * a click opens its items as a small menu below it,
 * each its icon and then its words, like `Skip`,
 * so the line beside it keeps its room;
 * a click on an item, or beside the menu, closes it.
 * A box in the dialog of a series has one, see `day/series.ts`,
 * and a task, see `skill/task.ts`,
 * whose field of my comment after Wrong opens below its cross in the same place and look,
 * see {@link menuAnchor}, as the menu of the groups of my tutorials
 * below its button, see `day/groups.ts`.
 *
 * - `./icons.ts`: Puts the icon `⋯` into its button,
 *   and an icon with words into each item.
 * - `lucide`: The icon `⋯`.
 * - `./menu.css`: Look of the button and its menu.
 */

import { iconPut, iconWordsOf } from "./icons.ts";
import { Ellipsis } from "lucide";
import "./menu.css";

import type { IconNode } from "lucide";

/**
 * Makes one item of a menu, its icon and then its words, like `Move`.
 *
 * @param icon - Icon, like `ArrowRight`
 * @param words - What it does, like `Move`
 * @param click - What a click does
 * @returns Item
 */
export function menuItemOf(
    icon: IconNode,
    words: string,
    click: (event: MouseEvent) => void,
): HTMLButtonElement {
    const item: HTMLButtonElement = document.createElement("button");
    item.type = "button";
    item.className = "menu-item";
    item.replaceChildren(...iconWordsOf(icon, words));
    item.addEventListener("click", click);
    return item;
}

/**
 * Makes a menu open from its button, see the top of this file:
 * shown over the page as a popover, the button's popover target,
 * which closes by itself on a click beside it or Escape;
 * right before it opens, it moves below the button, its left edge under the button's,
 * and once open, and again whenever its size changes while open,
 * to the left as far as it must to stay inside its frame,
 * the dialog the button stands in,
 * else the window, never wider than that frame,
 * like the groups of a box or a wide menu on a phone,
 * and above the button instead when it would reach below the window but fits above it,
 * like a short menu low on the page;
 * a menu that fits neither stays under its button on the side with more room,
 * only as high as that room, scrolling inside, like the 31 groups of a module,
 * so it never covers its button or starts at the top of the window.
 * - `margin`: Room between the button and the menu, the menu's margin above,
 *   kept below it when above the button, and kept from the edges of its frame.
 * - `frame`: The dialog the button stands in, else the window.
 * - `below`, `above`: Room below and above the button, its margin kept.
 * - {@link ToggleEvent}: Fires before a popover opens or closes,
 *   `newState` telling which.
 * - {@link ResizeObserver}: Tells when the size of the menu changes, also when it opens,
 *   since closed it has none.
 *
 * @param menu - The menu, in the look of `./menu.css`
 * @param button - The button that opens and closes it
 */
export function menuAnchor(menu: HTMLElement, button: HTMLButtonElement): void {
    menu.classList.add("menu");
    menu.popover = "auto";
    button.popoverTargetElement = menu;
    menu.addEventListener("beforetoggle", (event: ToggleEvent): void => {
        if (event.newState !== "open") return;
        const rect: DOMRect = button.getBoundingClientRect();
        menu.style.maxHeight = "";
        menu.style.top = `${rect.bottom}px`;
        menu.style.left = `${rect.left}px`;
    });
    new ResizeObserver((): void => {
        if (!menu.matches(":popover-open")) return;
        const margin: number = parseFloat(getComputedStyle(menu).marginTop);
        const rect: DOMRect = button.getBoundingClientRect();
        const frame: DOMRect =
            button.closest("dialog")?.getBoundingClientRect() ??
            new DOMRect(0, 0, document.documentElement.clientWidth, innerHeight);
        menu.style.maxWidth = `${frame.width - 2 * margin}px`;
        menu.style.left = `${Math.max(
            frame.left + margin,
            Math.min(rect.left, frame.right - margin - menu.offsetWidth),
        )}px`;
        const below: number = innerHeight - rect.bottom - 2 * margin;
        const above: number = rect.top - 2 * margin;
        menu.style.top = `${rect.bottom}px`;
        if (menu.scrollHeight <= below) return;
        if (menu.scrollHeight <= above || above > below) {
            menu.style.maxHeight = `${Math.min(menu.scrollHeight, above)}px`;
            menu.style.top = `${rect.top - menu.offsetHeight - 2 * margin}px`;
            return;
        }
        menu.style.maxHeight = `${below}px`;
    }).observe(menu);
}

/**
 * Puts items behind one button `⋯`, see the top of this file.
 * - `place`: The button with its menu.
 * - `more`: The button `⋯`, which opens and closes the menu, see {@link menuAnchor}.
 * - `menu`: The menu, which a click on an item closes.
 *
 * @param items - Items, like `Move` and `Skip`
 * @returns The button `⋯` with its menu
 */
export function menuOf(items: HTMLElement[]): HTMLElement {
    const place: HTMLElement = document.createElement("div");
    const more: HTMLButtonElement = document.createElement("button");
    const menu: HTMLElement = document.createElement("div");
    more.type = "button";
    more.className = "menu-more";
    iconPut(more, Ellipsis, "More");
    menuAnchor(menu, more);
    menu.append(...items);
    menu.addEventListener("click", (): void => menu.hidePopover());
    place.className = "menu-place";
    place.append(more, menu);
    return place;
}
