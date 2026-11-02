/**
 * ## Our docs
 *
 * Reads our docs in `NomFrequenceintelligence`, one per day.
 * Claude writes them, the dashboard only shows them.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { intelligenceRoot } from "./sources.ts";

/**
 * Our doc of a date, `null` when the day has none.
 *
 * @throws {Error} - When the date is not written like `2026-11-02`
 */
export function docRead(date: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`No date ${date}`);

    const [year, month, dayOfMonth]: string[] = date.split("-");
    const file: string = join(intelligenceRoot, year, `${year}_${month}`, `${year}_${month}_${dayOfMonth}.md`);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
}
