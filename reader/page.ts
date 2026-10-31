/**
 * ## Page
 *
 * Gives out the files of the page through Vite,
 * which translates TypeScript for the browser and reloads the page after each save.
 */

import { join } from "node:path";
import { createServer } from "vite";

import type { Server } from "node:http";
import type { ViteDevServer } from "vite";

/**
 * Starts Vite inside the server of the reader, so page and data share one address.
 * - `publicDir`: Named `assets` as in WokFlow.
 * - `allowedHosts`: My devices reach skriptum through Tailscale by a name ending
 *   in `.ts.net`, and Vite refuses every other name but `localhost` and addresses.
 * - `watch.ignored`: Leaves out `.claude/`,
 *   where Claude sessions write files of their own:
 *   every new `.html` there reloaded every open page.
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
