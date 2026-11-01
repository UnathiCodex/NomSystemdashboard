/**
 * ## Trash
 *
 * Puts a file or a folder into my trash by the freedesktop.org specification, never removing for good,
 * so `gio trash --restore` and a file manager can bring it back.
 * A name the trash holds already gets a number before its ending.
 */

import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";

/** The trash of the user, `Trash` in `XDG_DATA_HOME`, else in `~/.local/share`. */
const trashRoot: string = join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "Trash");

/** Most numbers tried for a name the trash holds already. */
const triesMost: number = 1000;

/** Writes a moment in local time as the specification asks. */
function dateOf(moment: Date): string {
    const two: (value: number) => string = (value: number): string => String(value).padStart(2, "0");
    return (
        `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())}` +
        `T${two(moment.getHours())}:` +
        `${two(moment.getMinutes())}:${two(moment.getSeconds())}`
    );
}

/**
 * Writes its information under a free name first, then moves the thing there.
 * The information goes again when the thing cannot move.
 *
 * @throws {Error} - When every name tried is taken, or the thing cannot move, like one on another disk
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
            writeFileSync(info, `[Trash Info]\nPath=${encodeURI(path)}\n` + `DeletionDate=${dateOf(new Date())}\n`, {
                flag: "wx",
            });
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
