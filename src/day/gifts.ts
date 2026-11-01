/**
 * ## Gifts
 *
 * My gift ideas for the birthdays and holidays at the top of the plan, written only when I have one.
 * A click on one opens a dialog with one field, saved as its `DESCRIPTION` for every year of it.
 * An empty field, or `Remove`, takes the idea out again.
 */

import { Check, Trash, X } from "lucide";
import { iconPut } from "../icons.ts";
import { fileShow } from "./choices.ts";
import type { Occasion } from "../../reader/boxes.ts";

/** The birthday or holiday the dialog writes the gift idea of. */
let opened: Occasion = { id: "", category: "", title: "", gift: "", file: "" };

/**
 * Sends my gift idea, empty to take it out.
 *
 * @throws {Error} - When the reader does not take it
 */
async function giftSend(id: string, gift: string): Promise<void> {
    const response: Response = await fetch("/api/day/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, gift: gift }),
    });
    if (!response.ok) throw new Error(`Reader answered ${response.status}`);
}

/** Sends the gift idea of the field and closes the dialog, a hint when the reader does not take it. */
function giftSave(gift: string): void {
    giftSend(opened.id, gift.trim())
        .then((): void => (document.getElementById("gift") as HTMLDialogElement).close())
        .catch((error: unknown): void => {
            console.error(error);
            document.getElementById("gift-error")?.removeAttribute("hidden");
        });
}

/** Opens the dialog of the gift idea, the bin only when there is an idea to take out. */
export function giftOpen(occasion: Occasion): void {
    const field: HTMLInputElement = document.getElementById("gift-text") as HTMLInputElement;
    opened = occasion;
    (document.getElementById("gift-occasion") as HTMLElement).textContent =
        occasion.category === "" ? occasion.title : `${occasion.category}: ${occasion.title}`;
    field.value = occasion.gift;
    fileShow(document.getElementById("gift-file") as HTMLAnchorElement, occasion.file);
    document.getElementById("gift-remove")?.toggleAttribute("hidden", occasion.gift === "");
    document.getElementById("gift-error")?.setAttribute("hidden", "");
    (document.getElementById("gift") as HTMLDialogElement).showModal();
    field.focus();
}

export function giftsStart(): void {
    iconPut(document.getElementById("gift-remove") as HTMLElement, Trash, "Remove");
    iconPut(document.getElementById("gift-cancel") as HTMLElement, X, "Cancel");
    iconPut(document.getElementById("gift-save") as HTMLElement, Check, "Save");
    document
        .getElementById("gift-cancel")
        ?.addEventListener("click", (): void => (document.getElementById("gift") as HTMLDialogElement).close());
    document.getElementById("gift-remove")?.addEventListener("click", (): void => giftSave(""));
    document.getElementById("gift-form")?.addEventListener("submit", (event: SubmitEvent): void => {
        event.preventDefault();
        giftSave((document.getElementById("gift-text") as HTMLInputElement).value);
    });
}
