/**
 * ## Gifts
 *
 * Writes my gift idea for a birthday or holiday
 * as its `DESCRIPTION` in its file, `Birthdays.ics` or `Holidays.ics`,
 * so it shows below it every year, see `boxes.ts`.
 * Every other line of the file stays as it is, byte for byte.
 * I write one only when I have one, and an empty one takes the line out again.
 */

import { fileOfId, propertiesPut } from "./calendar.ts";
import { day } from "./sources.ts";

/** A gift idea as the page sends it, `id` the `UID` of the birthday or holiday. */
export type Gift = {
    id: string;
    gift: string;
};

/**
 * Writes my gift idea as its `DESCRIPTION` on one line, spaces in a row one,
 * none at the ends.
 *
 * @throws {Error} - When no birthday or holiday has the identifier,
 *   or its file does not hold it once, like a series with a changed occurrence
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
