/**
 * ## Trash
 *
 * Puts a file or a folder into the trash of the user the reader runs as,
 * never removing anything for good,
 * as the desktop does it, by the Trash specification of freedesktop.org:
 * the thing goes into `~/.local/share/Trash/files/`,
 * and beside it into `info/` a file `<name>.trashinfo`
 * with the path it had and when it went,
 * so `gio trash --restore` and a file manager can bring it back.
 * A name the trash holds already gets a number before its ending, like `Tabelle 2.tsv`.
 * What Vu and I share and our messages go there once done, see `shared.ts` and `gate.ts`.
 *
 * - `node:fs`: Moves the thing and writes its information.
 * - `node:os`: Gives the home folder.
 * - `node:path`: Builds the paths of the trash.
 */

import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";

/**
 * The trash of the user, `Trash` in `XDG_DATA_HOME`, else in `~/.local/share`.
 */
const trashRoot: string = join(
    process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
    "Trash",
);

/**
 * Most numbers tried for a name the trash holds already.
 */
const triesMost: number = 1000;

/**
 * Writes a moment in local time as the specification asks, like `2026-10-22T21:50:07`.
 *
 * @param moment - The moment
 * @returns The moment written
 */
function dateOf(moment: Date): string {
    const two: (value: number) => string = (value: number): string =>
        String(value).padStart(2, "0");
    return (
        `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())}T${two(moment.getHours())}:` +
        `${two(moment.getMinutes())}:${two(moment.getSeconds())}`
    );
}

/**
 * Puts a file or a folder into the trash, see the top of this file:
 * first its information under a name no other thing of the trash has,
 * written only if that name is free, then the thing itself under that name;
 * the information goes again when the thing cannot move.
 * - `path`: The thing, absolute.
 * - `stem`, `ending`: Its name without its ending, and its ending, like `.md`.
 * - `name`: Its name in the trash.
 * - `info`: Its information.
 *
 * @param thing - Path of the file or folder
 * @throws {Error} - When the trash holds every name tried,
 *   or the thing cannot move, like one on another disk
 */
export function trashPut(thing: string): void {
    const path: string = resolve(thing);
    const ending: string = extname(path);
    const stem: string = basename(path, ending);
    mkdirSync(join(trashRoot, "files"), { recursive: true });
    mkdirSync(join(trashRoot, "info"), { recursive: true });
    for (let number: number = 1; number <= triesMost; number++) {
        const name: string = number === 1 ? basename(path) : `${stem} ${number}${ending}`;
        const info: string = join(trashRoot, "info", `${name}.trashinfo`);
        if (existsSync(join(trashRoot, "files", name))) continue;
        try {
            writeFileSync(
                info,
                `[Trash Info]\nPath=${encodeURI(path)}\nDeletionDate=${dateOf(new Date())}\n`,
                { flag: "wx" },
            );
        } catch {
            continue;
        }
        try {
            renameSync(path, join(trashRoot, "files", name));
            return;
        } catch (error: unknown) {
            rmSync(info, { force: true });
            throw error;
        }
    }
    throw new Error(`No free name in the trash for ${path}`);
}
