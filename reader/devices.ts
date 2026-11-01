/**
 * ## Devices
 *
 * Writes what each of my devices shows of the page into `Devices.md`, one row per device by its tailnet name.
 * `tailscale serve` hands on the address of the device in `X-Forwarded-For`, `tailscale whois` names it.
 * Only other sizes write the row anew.
 * A request without Tailscale or from skriptum writes nothing, since I never look at the dashboard there.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hostname } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { berlinDateOf, berlinTimeOf } from "./calendar.ts";
import { devicesFile, writeAllowed } from "./sources.ts";

/**
 * What a device shows of the page, in CSS pixels.
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
const fileHead: string[] = ["| Device | Page | Scale | Screen | App | Since |", "|---|---|---|---|---|---|"];

/** Names a device by its Tailscale address, throws when Tailscale does not know it. */
async function deviceNameOf(address: string): Promise<string> {
    const { stdout }: { stdout: string } = await promisify(execFile)("tailscale", ["whois", "--json", address]);
    const whois: { Node: { ComputedName: string } } = JSON.parse(stdout);
    return whois.Node.ComputedName;
}

function cellsOf(row: string): string[] {
    return row
        .split("|")
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/**
 * Writes the report of a device into its row of `Devices.md`.
 *
 * @param address - Empty for a request without Tailscale
 * @throws {Error} - When Tailscale does not know the address, a size is no number above 0, or the file lies outside
 */
export async function deviceReport(report: DeviceReport, address: string): Promise<void> {
    if (address === "") return;
    const name: string = await deviceNameOf(address);
    if (name === hostname()) return;
    const sizes: number[] = [report.width, report.height, report.scale, report.screenWidth, report.screenHeight];
    if (!sizes.every((size: unknown): boolean => typeof size === "number" && Number.isFinite(size) && size > 0))
        throw new Error(`No sizes of a device: ${sizes.join(", ")}`);
    if (!writeAllowed(devicesFile)) throw new Error(`No writing outside the new system: ${devicesFile}`);

    const now: Date = new Date();
    const row: string =
        `| ${name} | ${Math.round(report.width)} × ${Math.round(report.height)} ` +
        `| ${Math.round(report.scale * 100) / 100} ` +
        `| ${Math.round(report.screenWidth)} × ${Math.round(report.screenHeight)} ` +
        `| ${report.app === true ? "yes" : "no"} ` +
        `| ${berlinDateOf(now).split("-").reverse().join(".")} ${berlinTimeOf(now)} |`;
    const lines: string[] = existsSync(devicesFile) ? readFileSync(devicesFile, "utf8").split("\n") : [...fileHead, ""];
    const index: number = lines.findIndex(
        (line: string): boolean => line.startsWith("|") && !line.startsWith("|---") && cellsOf(line)[0] === name,
    );
    if (index !== -1 && cellsOf(lines[index]).slice(0, 5).join("|") === cellsOf(row).slice(0, 5).join("|")) return;
    if (index === -1) lines.splice(lines.findLastIndex((line: string): boolean => line.startsWith("|")) + 1, 0, row);
    else lines[index] = row;
    mkdirSync(dirname(devicesFile), { recursive: true });
    writeFileSync(devicesFile, lines.join("\n"));
}
