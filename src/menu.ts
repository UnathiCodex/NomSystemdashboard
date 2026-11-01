/**
 * ## Menu
 *
 * One plain button `⋯` that holds what a thing can do, alike on the computer and on a phone.
 * A click opens its items as a small menu below it, so the line beside it keeps its room.
 */

import { iconPut, iconWordsOf } from "./icons.ts";
import { Ellipsis } from "lucide";
import "./menu.css";

import type { IconNode } from "lucide";

/** One item of a menu, its icon and then its words. */
export function menuItemOf(icon: IconNode, words: string, click: (event: MouseEvent) => void): HTMLButtonElement {
    const item: HTMLButtonElement = document.createElement("button");
    item.type = "button";
    item.className = "menu-item";
    item.replaceChildren(...iconWordsOf(icon, words));
    item.addEventListener("click", click);
    return item;
}

/**
 * Makes a menu open below its button as a popover, which closes on a click beside it or Escape.
 * It moves left to stay inside its dialog, else the window, and above when only there it fits.
 * A menu that fits neither stays on the side with more room, scrolling inside, so it never covers its button.
 * The {@link ResizeObserver} also tells when it opens, since closed it has no size.
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

/** Puts items behind one button `⋯`, a click on an item closes the menu. */
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
