/**
 * ## Page
 *
 * Gives out the files of the page through Vite.
 */

import { join } from "node:path";
import { createServer } from "vite";

import type { Server } from "node:http";
import type { ViteDevServer } from "vite";

/**
 * Starts Vite inside the server of the reader, so page and data share one address.
 * - `allowedHosts`: My devices reach skriptum by its Tailscale name, which Vite refuses else.
 * - `watch.ignored`: Every new `.html` of Claude sessions in `.claude/` reloaded every open page.
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
