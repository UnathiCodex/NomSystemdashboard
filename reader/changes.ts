/**
 * ## Changes
 *
 * Tells every open page when a file of my new system changes, whoever changed it,
 * so no page shows or writes back what the files held before.
 * `GET /api/changes` stays open as server-sent events, one `data: changed` per change.
 * `Devices.md` tells nothing, since no page shows it.
 */

import { existsSync, watch } from "node:fs";
import { join } from "node:path";
import { devicesFile, systemRoots } from "./sources.ts";

import type { WatchEventType } from "node:fs";
import type { ServerResponse } from "node:http";

/** The open pages, each by its open answer. */
const pages: Set<ServerResponse> = new Set();

/** Milliseconds without a change before the pages are told, so a rename is told once. */
const quiet: number = 100;

let waiting: NodeJS.Timeout | undefined = undefined;

/** How many changes the reader has seen, so what is worked out of the files is kept until the next. */
let version: number = 0;

/** Keeps the answer to a page open, its head out at once so the page knows it hears the reader. */
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

/** Watches the folders of the reader that exist and tells the pages of each change but `Devices.md`. */
export function changesWatch(): void {
    systemRoots
        .filter((root: string): boolean => existsSync(root))
        .forEach((root: string): void => {
            watch(root, { recursive: true }, (_event: WatchEventType, name: string | null): void => {
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
            });
        });
}

export function changesVersion(): number {
    return version;
}
