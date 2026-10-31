/**
 * ## Changes
 *
 * Tells every open page the moment a file of my new system changes, whoever changed it: the reader,
 * like a food renamed in every entry that holds it, a page of another device,
 * or Syncthing bringing a change, so each page loads anew what it shows, see `src/changes.ts`,
 * and never shows, nor writes back, what the files held before.
 * A page asks `GET /api/changes` and keeps the answer open, a stream of server-sent events,
 * one `data: changed` per change;
 * changes coming within a tenth of a second of each other,
 * like the entries a rename writes one by one, are told once, after the last.
 * `Devices.md`, which a page writes when its size changes,
 * see `devices.ts`, tells nothing, since no page shows it.
 * Nor does a file of a folder the reader does not use, see `systemRoots` in `sources.ts`,
 * like `NomStudysciences/learning/adesope-2017-practice-tests-meta.md`,
 * since only the editor opens it, reading it anew each time.
 *
 * - `node:fs`: Watches the folders the reader uses, every folder in them too.
 * - `node:path`: Builds the path of a file changed.
 * - `./sources.ts`: Names the folders the reader uses and `Devices.md`.
 */

import { existsSync, watch } from "node:fs";
import { join } from "node:path";
import { devicesFile, systemRoots } from "./sources.ts";

import type { WatchEventType } from "node:fs";
import type { ServerResponse } from "node:http";

/**
 * The open pages, each by the answer the reader keeps open for it.
 */
const pages: Set<ServerResponse> = new Set();

/**
 * Milliseconds without a change before the pages are told, so many changes in a row are told once.
 */
const quiet: number = 100;

/**
 * Timer of the next telling, waiting for {@link quiet}; `undefined` while none waits.
 */
let waiting: NodeJS.Timeout | undefined = undefined;

/**
 * How many changes of the new system the reader has seen, counted the moment each happens,
 * see {@link changesWatch}, so what is worked out of its files may be kept until the next change,
 * like the boxes `suggestions.ts` writes.
 */
let version: number = 0;

/**
 * Keeps the answer to a page open as a stream of server-sent events, one per change,
 * until the page goes, see the top of this file;
 * its head goes out at once, so the page knows it hears the reader.
 *
 * @param response - Answer to the page
 */
export function changesSend(response: ServerResponse): void {
    response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    });
    response.flushHeaders();
    pages.add(response);
    response.on("close", (): void => {
        pages.delete(response);
    });
}

/**
 * Watches those of the folders the reader uses that exist, as long as the reader runs:
 * every change of a file in them but `Devices.md` waits for {@link quiet},
 * then tells every open page.
 */
export function changesWatch(): void {
    systemRoots
        .filter((root: string): boolean => existsSync(root))
        .forEach((root: string): void => {
            watch(
                root,
                { recursive: true },
                (_event: WatchEventType, name: string | null): void => {
                    if (name !== null && join(root, name) === devicesFile) return;
                    version += 1;
                    clearTimeout(waiting);
                    waiting = setTimeout(
                        (): void =>
                            pages.forEach((page: ServerResponse): void => {
                                page.write("data: changed\n\n");
                            }),
                        quiet,
                    );
                },
            );
        });
}

/**
 * Tells how many changes of the new system the reader has seen, see {@link version}.
 *
 * @returns The count, like `12`
 */
export function changesVersion(): number {
    return version;
}
