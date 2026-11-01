/**
 * ## Gifts
 *
 * My gift idea for a birthday or holiday, its `DESCRIPTION` in `Birthdays.ics` or `Holidays.ics`.
 * Every other line of the file stays byte for byte.
 * An empty idea takes the line out.
 */

import { fileOfId, propertiesPut } from "./calendar.ts";
import { day } from "./sources.ts";

/** A gift idea as the page sends it, `id` the `UID` of the birthday or holiday. */
export type Gift = {
    id: string;
    gift: string;
};

/**
 * Writes my gift idea on one line, spaces in a row one.
 *
 * @throws {Error} - When no birthday or holiday has the id, or its file holds it more than once
 */
export function giftWrite(sent: Gift): void {
    const id: string = String(sent.id ?? "");
    const gift: string = String(sent.gift ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const file: string | undefined = fileOfId(day.system, id);
    if (file === undefined) throw new Error(`No birthday or holiday ${id}`);
    propertiesPut(file, id, [["description", gift === "" ? [] : [gift]]]);
}
