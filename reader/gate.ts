/**
 * ## Gate
 *
 * The one thing the key of a person I share with may do on my server, which holds `NomKommunikation`.
 * `~/.ssh/authorized_keys` names this file before the key with `restrict`, my name first, then the person's,
 * so SSH runs it whatever the key asks, with no shell, forwarding or terminal.
 * What the key asks stands in `SSH_ORIGINAL_COMMAND`, a command and maybe a path after one space.
 * In both boxes, theirs like `to_vu/` and mine like `to_sopha/`, the person may do what I may:
 * - `readme`: Gives `README.md` of `NomKommunikation`.
 * - `list`: Lists every file of both boxes, but those of `dashboard/`.
 * - `get <path>`: Gives one file of a box.
 * - `put <path>`: Writes what comes in into a file of a box.
 * - `delete <path>`: Puts a file or folder of a box into the trash.
 * - `share <name>`: Writes what their dashboard shares with mine into `dashboard/` of my box.
 * - `inbox`: Lists what my dashboard shares with them, the earliest first.
 * - `take <name>`: Gives one of them.
 * - `done <name>`: Puts one of them into the trash, once their dashboard took it.
 * No part of a path starts with a dot, so it holds no `..`.
 * Every file it reads or writes lies inside the box after symbolic links are followed.
 * Exits with 1 on a refusal, 2 for an unknown command.
 */

import {
    createReadStream,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { basename, dirname, join, sep } from "node:path";
import { kommunikationRoot } from "./sources.ts";
import { trashPut } from "./trash.ts";

import type { Dirent } from "node:fs";

/** The commands, told on a refusal. */
const usage: string = [
    "Allowed: readme | list | get <path> | put <path> | delete <path> | share <name>",
    "  | inbox | take <name> | done <name>",
    "  A path starts with its box, like to_vu/2026-10-22_0930_antwort.md; " + "both boxes are open to both of us.",
].join("\n");

/** The most bytes of a message, big enough for a PDF of solutions. */
const messageMost: number = 50 * 1024 * 1024;

/** The most bytes of a shared entry. */
const shareMost: number = 1024 * 1024;

const partsMost: number = 12;

/** One part of a path, starting with a letter or a digit. */
const partForm: RegExp = /^[\p{L}\p{N}][\p{L}\p{N} ._()+,&'-]{0,199}$/u;

/** A name of a person, as the boxes are named. */
const nameForm: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

/** The name of a shared file of a sender. */
function sharedFormOf(sender: string): RegExp {
    return new RegExp(`^\\d{8}T\\d{9}Z_${sender}_entry_[\\w.@-]{1,160}\\.ics$`);
}

function refuse(reason: string, code: number = 1): never {
    process.stderr.write(`${reason}\n`);
    process.exit(code);
}

/** Splits a path into its parts, refusing a part not allowed. */
function partsOf(path: string): string[] {
    const parts: string[] = path.split("/");
    if (path === "" || parts.length > partsMost || !parts.every((part: string): boolean => partForm.test(part)))
        refuse(`No path allowed: ${path}`);
    return parts;
}

/** Splits a path into its box and the path in it, refusing one outside both boxes or in `dashboard/`. */
function boxPathOf(boxes: string[], path: string): string[] {
    const [first, ...parts]: string[] = partsOf(path);
    const box: string | undefined = boxes.find((one: string): boolean => basename(one) === first);
    if (box === undefined || parts.length === 0 || parts[0] === "dashboard") refuse(`No path in a box: ${path}`);
    return [box, join(box, ...parts)];
}

/** Refuses a file or folder outside a box after symbolic links are followed. */
function insideCheck(box: string, path: string): void {
    if (!realpathSync(path).startsWith(`${realpathSync(box)}${sep}`)) refuse(`Not inside the box: ${path}`);
}

/** The paths of the files of a folder, sorted, hidden ones and symbolic links left out. */
function filesOf(folder: string, left: string[]): string[] {
    if (!existsSync(folder)) return [];
    return readdirSync(folder, { recursive: true, withFileTypes: true })
        .filter((found: Dirent): boolean => found.isFile())
        .map((found: Dirent): string =>
            join(found.parentPath, found.name)
                .slice(folder.length + 1)
                .split(sep)
                .join("/"),
        )
        .filter(
            (path: string): boolean =>
                !path.split("/").some((part: string): boolean => part.startsWith(".")) &&
                !left.includes(path.split("/")[0]),
        )
        .sort();
}

/** Reads what comes in, refusing more than a number of bytes. */
async function inputRead(most: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size: number = 0;
    for await (const chunk of process.stdin) {
        size += (chunk as Buffer).length;
        if (size > most) refuse(`Too big, more than ${most} bytes`);
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}

/** Writes a file under a hidden name first, then renames it, so no one sees half of it. */
function fileWrite(file: string, bytes: Buffer | string): void {
    const hidden: string = join(dirname(file), `.${file.split(sep).at(-1)}.part`);
    writeFileSync(hidden, bytes);
    renameSync(hidden, file);
}

/** Does what the key asks, `me` the owner of this server, `caller` the person whose key calls. */
async function gateRun(): Promise<void> {
    const [me, caller]: string[] = process.argv.slice(2);
    if (!nameForm.test(me ?? "") || !nameForm.test(caller ?? ""))
        refuse("The gate needs the name of the owner and of the caller, " + "like gate.ts Sopha Vu");
    const theirs: string = join(kommunikationRoot, `to_${caller.toLowerCase()}`);
    const mine: string = join(kommunikationRoot, `to_${me.toLowerCase()}`);
    const boxes: string[] = [theirs, mine];
    const asked: string = (process.env.SSH_ORIGINAL_COMMAND ?? "").trim();
    const at: number = asked.indexOf(" ");
    const command: string = at === -1 ? asked : asked.slice(0, at);
    const path: string = at === -1 ? "" : asked.slice(at + 1).trim();

    if (command === "readme") {
        if (!existsSync(join(kommunikationRoot, "README.md")))
            refuse("No README.md on this server; it lies on sophabohne");
        process.stdout.write(readFileSync(join(kommunikationRoot, "README.md")));
    } else if (command === "list") {
        process.stdout.write(
            boxes
                .flatMap((box: string): string[] =>
                    filesOf(box, ["dashboard"]).map((file: string): string => `${basename(box)}/${file}\n`),
                )
                .join(""),
        );
    } else if (command === "get") {
        const [box, file]: string[] = boxPathOf(boxes, path);
        if (!existsSync(file) || !statSync(file).isFile()) refuse(`No such file: ${path}`);
        insideCheck(box, file);
        createReadStream(file).pipe(process.stdout);
    } else if (command === "put") {
        const [box, file]: string[] = boxPathOf(boxes, path);
        if (existsSync(file) && !statSync(file).isFile()) refuse(`A folder, no file: ${path}`);
        mkdirSync(dirname(file), { recursive: true });
        if (dirname(file) !== box) insideCheck(box, dirname(file));
        fileWrite(file, await inputRead(messageMost));
        process.stdout.write("ok\n");
    } else if (command === "delete") {
        const [box, thing]: string[] = boxPathOf(boxes, path);
        if (!existsSync(thing)) refuse(`No such file or folder: ${path}`);
        insideCheck(box, thing);
        trashPut(thing);
        process.stdout.write("ok\n");
    } else if (command === "share") {
        const box: string = join(mine, "dashboard");
        if (!sharedFormOf(caller).test(path)) refuse(`No shared name: ${path}`);
        const bytes: Buffer = await inputRead(shareMost);
        mkdirSync(box, { recursive: true });
        fileWrite(join(box, path), bytes);
        process.stdout.write("ok\n");
    } else if (command === "inbox") {
        process.stdout.write(
            filesOf(join(theirs, "dashboard"), [])
                .filter((name: string): boolean => sharedFormOf(me).test(name))
                .map((name: string): string => `${name}\n`)
                .join(""),
        );
    } else if (command === "take" || command === "done") {
        const box: string = join(theirs, "dashboard");
        const file: string = join(box, path);
        if (!sharedFormOf(me).test(path) || !existsSync(file)) refuse(`No such shared: ${path}`);
        insideCheck(box, file);
        if (command === "take") createReadStream(file).pipe(process.stdout);
        else {
            trashPut(file);
            process.stdout.write("ok\n");
        }
    } else {
        refuse(`Unknown command: ${asked}\n${usage}`, 2);
    }
}

await gateRun().catch((error: unknown): never => refuse(`The gate failed: ${String(error)}`));
