/**
 * ## Devices
 *
 * Writes what each of my devices shows of the page into `Devices.md`,
 * so the dashboard is shaped for each of them:
 * one Markdown table, as `Places.md`, one row per device, its name in my tailnet,
 * like `vuenvy`, its page in CSS pixels, like `1920 × 1003`, its scale,
 * like `2` for a 4K screen at 200 %, its screen in CSS pixels, like `1920 × 1080`,
 * whether it runs as the installed app,
 * and since when its row holds these sizes, like `13.10.2026 23:20`.
 * A device is what Tailscale names it:
 * `tailscale serve` hands every request of my devices on to the reader with the Tailscale address
 * of its device in `X-Forwarded-For`, which `tailscale whois` names.
 * A report with other sizes writes the row of its device anew,
 * the same sizes leave the file as it is, and a device without row yet gets one at the end;
 * the reader creates the file with the first report.
 * A request without that address, which reached the reader without Tailscale,
 * like the browser of Claude's screenshots on skriptum, and one of skriptum itself write nothing,
 * since I never look at the dashboard on skriptum.
 *
 * - `node:child_process`: Asks Tailscale for the name of a device.
 * - `node:util`: Lets that be awaited.
 * - `node:os`: Gives the name of skriptum, which writes nothing.
 * - `node:fs`: Reads and writes `Devices.md`.
 * - `node:path`: Gives the folder of the file.
 * - `./calendar.ts`: Writes the day and the time of now in Berlin time.
 * - `./sources.ts`: Names `Devices.md` and tells which files the reader may write.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hostname } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, berlinTimeOf } from "./calendar.ts";
import { devicesFile, writeAllowed } from "./sources.ts";

/**
 * What a device shows of the page, as the page sends it.
 *
 * - `width`, `height`: Size of the page in CSS pixels, like 1920 and 1003.
 * - `scale`: Device pixels per CSS pixel, like 2 for a 4K screen at 200 %.
 * - `screenWidth`, `screenHeight`: Size of the screen in CSS pixels, like 1920 and 1080.
 * - `app`: Whether the page runs as the installed app, in a window of its own.
 */
export type DeviceReport = {
    width: number;
    height: number;
    scale: number;
    screenWidth: number;
    screenHeight: number;
    app: boolean;
};

/**
 * Head of a new `Devices.md`, its table without rows.
 */
const fileHead: string[] = [
    "| Device | Page | Scale | Screen | App | Since |",
    "|---|---|---|---|---|---|",
];

/**
 * Names a device by its Tailscale address, as my tailnet names it.
 * - `whois`: What Tailscale knows of the address, its `Node.ComputedName` the name.
 *
 * @param address - Tailscale address of the device, like `100.125.80.0`
 * @returns Its name, like `vuenvy`
 * @throws {Error} - When Tailscale does not know the address
 */
async function deviceNameOf(address: string): Promise<string> {
    const { stdout }: { stdout: string } = await promisify(execFile)("tailscale", [
        "whois",
        "--json",
        address,
    ]);
    const whois: { Node: { ComputedName: string } } = JSON.parse(stdout);
    return whois.Node.ComputedName;
}

/**
 * Gives the cells of a row of `Devices.md`, without the edges of the table.
 *
 * @param row - Row, like `| vuenvy | 1601 × 822 | 1.2 | 1600 × 900 | yes | 19.10.2026 00:06 |`
 * @returns Its cells, like `vuenvy`, `1601 × 822`, `1.2`, `1600 × 900`,
 *   `yes` and `19.10.2026 00:06`
 */
function cellsOf(row: string): string[] {
    return row
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Writes the report of a device into its row of `Devices.md`,
 * see the top of this file, every other line staying as it is.
 * - `name`: Name of the device in my tailnet.
 * - `sizes`: The numbers of the report, each checked.
 * - `now`: The moment, whose day and time in Berlin time the row holds.
 * - `row`: The row of the device as the report gives it.
 * - `lines`: Lines of the file.
 * - `index`: Index of the row of the device, -1 for none.
 *
 * @param report - Report as the page sends it
 * @param address - Tailscale address of the device, from `X-Forwarded-For`,
 *   empty for a request without Tailscale
 * @throws {Error} - When Tailscale does not know the address, a size is no number above 0,
 *   or the file lies outside the new system
 */
export async function deviceReport(report: DeviceReport, address: string): Promise<void> {
    if (address === "") return;
    const name: string = await deviceNameOf(address);
    if (name === hostname()) return;
    const sizes: number[] = [
        report.width,
        report.height,
        report.scale,
        report.screenWidth,
        report.screenHeight,
    ];
    if (
        !sizes.every(
            (size: unknown): boolean =>
                typeof size === "number" && Number.isFinite(size) && size > 0,
        )
    )
        throw new Error(`No sizes of a device: ${sizes.join(", ")}`);
    if (!writeAllowed(devicesFile))
        throw new Error(`No writing outside the new system: ${devicesFile}`);

    const now: Date = new Date();
    const row: string =
        `| ${name} | ${Math.round(report.width)} × ${Math.round(report.height)} ` +
        `| ${Math.round(report.scale * 100) / 100} ` +
        `| ${Math.round(report.screenWidth)} × ${Math.round(report.screenHeight)} ` +
        `| ${report.app === true ? "yes" : "no"} ` +
        `| ${berlinDateOf(now).split("-").reverse().join(".")} ${berlinTimeOf(now)} |`;
    const lines: string[] = existsSync(devicesFile)
        ? readFileSync(devicesFile, "utf8").split("\n")
        : [...fileHead, ""];
    const index: number = lines.findIndex(
        (line: string): boolean =>
            line.startsWith("|") && !line.startsWith("|---") && cellsOf(line)[0] === name,
    );
    if (
        index !== -1 &&
        cellsOf(lines[index]).slice(0, 5).join("|") === cellsOf(row).slice(0, 5).join("|")
    )
        return;
    if (index === -1)
        lines.splice(
            lines.findLastIndex((line: string): boolean => line.startsWith("|")) + 1,
            0,
            row,
        );
    else lines[index] = row;
    mkdirSync(dirname(devicesFile), { recursive: true });
    writeFileSync(devicesFile, lines.join("\n"));
}
