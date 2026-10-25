/**
 * ## Page
 *
 * Gives out the files of the page through Vite,
 * which translates TypeScript for the browser and reloads the page after each save.
 *
 * - `node:path`: Builds file paths for the operating system.
 * - `vite`: Serves the page during development.
 */

import { join } from "node:path";
import { createServer } from "vite";

import type { Server } from "node:http";
import type { ViteDevServer } from "vite";

/**
 * Starts Vite inside the server of the reader, so page and data share one address.
 * - `root`: Folder of `index.html`, one up from this file.
 * - `publicDir`: Folder of the files given out as they are,
 *   like the logo `icon.svg`, named `assets` as in WokFlow.
 * - `middlewareMode`: Answers only the requests the reader hands over, without a server of its own.
 * - `hmr.server`: Sends its reload messages through the server of the reader.
 * - `allowedHosts`: Answers my devices too,
 *   which reach skriptum through Tailscale by a name ending in `.ts.net`,
 *   like `skriptum.tail1234.ts.net`;
 *   Vite refuses every other name but `localhost` and addresses like `127.0.0.1`.
 * - `watch.ignored`: Leaves out `.claude/`, where Claude sessions write files of their own:
 *   every new `.html` there reloaded every open page.
 * - `appType`: Answers unknown addresses with `index.html`, as for a single page.
 *
 * @param server - Server of the reader
 * @returns {@link ViteDevServer} whose `middlewares` answer the requests for the page
 */
export function pageCreate(server: Server): Promise<ViteDevServer> {
    return createServer({
        root: join(import.meta.dirname, ".."),
        publicDir: "assets",
        server: {
            middlewareMode: true,
            hmr: { server: server },
            allowedHosts: [".ts.net"],
            watch: { ignored: ["**/.claude/**"] },
        },
        appType: "spa",
    });
}
