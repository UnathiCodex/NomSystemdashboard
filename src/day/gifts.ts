/**
 * ## Gifts
 *
 * My gift ideas for the birthdays and holidays at the top of the plan,
 * see `reader/gifts.ts`,
 * written only when I have one:
 * a click on a birthday or holiday opens a small dialog with one field,
 * my gift idea for it,
 * which `Enter` or `Save` saves as its `DESCRIPTION` in its file,
 * `Birthdays.ics` or `Holidays.ics`, for every year of it;
 * an empty field, or `Remove`, takes the idea out again.
 * The plan shows each idea beside its birthday or holiday, see `boxes.ts`,
 * and loads again when the dialog closes.
 *
 * - `lucide`: The icons of the bin, Cancel and Save.
 * - `../icons.ts`: Shows them in their buttons.
 * - `./choices.ts`: Shows the file of the birthday or holiday.
 */

import { Check, Trash, X } from "lucide";
import { iconPut } from "../icons.ts";
import { fileShow } from "./choices.ts";
import type { Occasion } from "./boxes.ts";

/**
 * The birthday or holiday the dialog writes the gift idea of.
 */
let opened: Occasion = { id: "", category: "", title: "", gift: "", file: "" };

/**
 * Sends my gift idea for a birthday or holiday to the reader,
 * an empty one to take it out again.
 *
 * @param id - Identifier of the birthday or holiday in its file,
 *   like `birthday-anna@nomsystem`
 * @param gift - The gift, empty for none
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

/**
 * Sends the gift idea of the field, or none when it is removed, then closes the dialog;
 * shows a hint when the reader does not take it.
 *
 * @param gift - The gift, empty for none
 */
function giftSave(gift: string): void {
    giftSend(opened.id, gift.trim())
        .then((): void => (document.getElementById("gift") as HTMLDialogElement).close())
        .catch((error: unknown): void => {
            console.error(error);
            document.getElementById("gift-error")?.removeAttribute("hidden");
        });
}

/**
 * Opens the dialog of the gift idea for a birthday or holiday,
 * its category and name small and grey above the field,
 * like `Birthday: Karlbauer Florian`, the field holding the idea I have, focused;
 * the bin shows only when there is one to take out;
 * at the left of the buttons its file, see `fileShow` in `choices.ts`.
 * - {@link HTMLDialogElement#showModal}: Shows the dialog over the page, `Esc` closes it.
 *
 * @param occasion - The birthday or holiday with my gift idea for it
 */
export function giftOpen(occasion: Occasion): void {
    const field: HTMLInputElement = document.getElementById(
        "gift-text",
    ) as HTMLInputElement;
    opened = occasion;
    (document.getElementById("gift-occasion") as HTMLElement).textContent =
        occasion.category === ""
            ? occasion.title
            : `${occasion.category}: ${occasion.title}`;
    field.value = occasion.gift;
    fileShow(document.getElementById("gift-file") as HTMLAnchorElement, occasion.file);
    document
        .getElementById("gift-remove")
        ?.toggleAttribute("hidden", occasion.gift === "");
    document.getElementById("gift-error")?.setAttribute("hidden", "");
    (document.getElementById("gift") as HTMLDialogElement).showModal();
    field.focus();
}

/**
 * Starts the dialog after the router has put its HTML into the page:
 * `Cancel` closes it, `Remove` takes the idea out, `Enter` and `Save` save it.
 */
export function giftsStart(): void {
    iconPut(document.getElementById("gift-remove") as HTMLElement, Trash, "Remove");
    iconPut(document.getElementById("gift-cancel") as HTMLElement, X, "Cancel");
    iconPut(document.getElementById("gift-save") as HTMLElement, Check, "Save");
    document
        .getElementById("gift-cancel")
        ?.addEventListener("click", (): void =>
            (document.getElementById("gift") as HTMLDialogElement).close(),
        );
    document
        .getElementById("gift-remove")
        ?.addEventListener("click", (): void => giftSave(""));
    document
        .getElementById("gift-form")
        ?.addEventListener("submit", (event: SubmitEvent): void => {
            event.preventDefault();
            giftSave((document.getElementById("gift-text") as HTMLInputElement).value);
        });
}
