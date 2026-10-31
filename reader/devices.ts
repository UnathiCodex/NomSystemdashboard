/**
 * ## Devices
 *
 * Writes what each of my devices shows of the page into `Devices.md`,
 * so the dashboard is shaped for each of them:
 * one Markdown table, one row per device, by its name in my tailnet.
 * `tailscale serve` hands every request on to the reader with the Tailscale
 * address of its device in `X-Forwarded-For`, which `tailscale whois` names.
 * A report with other sizes writes the row of its device anew,
 * the same sizes leave the file as it is.
 * A request without that address, which reached the reader without Tailscale,
 * like the browser of Claude's screenshots on skriptum,
 * and one of skriptum itself write nothing,
 * since I never look at the dashboard on skriptum.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hostname } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, berlinTimeOf } from "./calendar.ts";
import { devicesFile, writeAllowed } from "./sources.ts";

/**
 * What a device shows of the page, as the page sends it, sizes in CSS pixels.
 * `scale` is device pixels per CSS pixel, `app` whether it runs as the installed app.
 */
export type DeviceReport = {
    width: number;
    height: number;
    scale: number;
    screenWidth: number;
    screenHeight: number;
    app: boolean;
};

/** Head of a new `Devices.md`, its table without rows. */
const fileHead: string[] = [
    "| Device | Page | Scale | Screen | App | Since |",
    "|---|---|---|---|---|---|",
];

/**
 * Names a device by its Tailscale address, as my tailnet names it.
 *
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

/** Gives the cells of a row of `Devices.md`, without the edges of the table. */
function cellsOf(row: string): string[] {
    return row
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Writes the report of a device into its row of `Devices.md`,
 * every other line staying as it is.
 *
 * @param address - Tailscale address of the device, empty for a request without Tailscale
 * @throws {Error} - When Tailscale does not know the address,
 *   a size is no number above 0,
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
