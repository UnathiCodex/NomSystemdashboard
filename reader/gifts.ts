/**
 * ## Gifts
 *
 * Writes my gift idea for a birthday or holiday as its `DESCRIPTION` in its file, `Birthdays.ics`,
 * the file of my birthdays I write by hand, or `Holidays.ics`,
 * like `DESCRIPTION:Buch über Rom` in the yearly series `Karlbauer Florian`,
 * so it shows below it every year, see `boxes.ts`;
 * every other line of the file stays as it is, byte for byte.
 * I write one only when I have one, and an empty one takes the line out again.
 *
 * - `./calendar.ts`: Finds the file of a birthday and puts its `DESCRIPTION`.
 * - `./sources.ts`: Names `Birthdays.ics` and `Holidays.ics`,
 *   the calendars of the birthdays and holidays.
 */

import { fileOfId, propertiesPut } from "./calendar.ts";
import { day } from "./sources.ts";

/**
 * A gift idea, as the page sends it.
 *
 * - `id`: Identifier of the birthday or holiday in its file, its `UID`,
 *   like `birthday-anna@nomsystem`.
 * - `gift`: The gift, like `Buch über Rom`; an empty one takes the idea out again.
 */
export type Gift = {
    id: string;
    gift: string;
};

/**
 * Writes my gift idea for a birthday or holiday as its `DESCRIPTION` in its file,
 * see the top of this file, on one line, spaces in a row one, none at the ends;
 * an empty one takes its `DESCRIPTION` out.
 * - `id`, `gift`: Identifier and gift as sent, the gift cleaned.
 * - `file`: The `.ics` file of the birthday or holiday, `undefined` for none.
 *
 * @param sent - Gift idea as the page sends it
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
