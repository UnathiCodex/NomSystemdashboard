/**
 * ## Router
 *
 * Opens one area of the life system by the address, the day everywhere else.
 * The areas are the buttons at the left edge in `index.html`.
 * `/edit` opens a file of my new system.
 * `/plannings/<folder>` opens the editor on that folder of `NomManageplannings` alone.
 * Older addresses of the scripts, `/notes` and `/edit?path=…`, become `/scripts`.
 * Loads the code of the shown area only, so the day loads no MathJax and the scripts no calendar.
 * Puts the area's HTML in only once its code and its look are loaded, so it never shows unstyled.
 * A phone opens the day everywhere.
 */

/// <reference types="vite/client" />
import dayHtml from "./day/day.html?raw";
import foodHtml from "./food/food.html?raw";
import sportHtml from "./sport/sport.html?raw";
import editorHtml from "./editor/editor.html?raw";
import { phone } from "./phone.ts";

/**
 * Tells the reader what this device shows of the page, so the dashboard can be shaped for each device.
 * Nothing while a size is 0, for a page loaded unseen, since the reader would refuse it.
 */
function deviceReport(): void {
    if ([innerWidth, innerHeight, screen.width, screen.height].includes(0)) return;
    navigator.sendBeacon(
        "/api/devices",
        JSON.stringify({
            width: innerWidth,
            height: innerHeight,
            scale: devicePixelRatio,
            screenWidth: screen.width,
            screenHeight: screen.height,
            app: matchMedia("(display-mode: standalone)").matches,
        }),
    );
}

/** Waiting report after a resize, so a window being dragged reports once, a second after it rests. */
let deviceWait: number = 0;

const address: URLSearchParams = new URLSearchParams(location.search);
if (location.pathname === "/notes" || (location.pathname === "/edit" && address.has("path")))
    history.replaceState(null, "", `/scripts${location.search}${location.hash}`);
const areas: string[] = phone
    ? []
    : [...document.querySelectorAll<HTMLAnchorElement>(".areas a")].map((link: HTMLAnchorElement): string =>
          decodeURIComponent(link.pathname),
      );
const area: string = [...areas, "/edit"].includes(location.pathname) ? location.pathname : "/";
const marked: string = area === "/edit" ? "/plannings" : area;
document.querySelector(`.areas a[href="${marked}"]`)?.setAttribute("aria-current", "page");
deviceReport();
addEventListener("resize", (): void => {
    clearTimeout(deviceWait);
    deviceWait = window.setTimeout(deviceReport, 1000);
});

if (area === "/food") {
    const food: { foodStart: () => void } = await import("./food/food.ts");
    document.body.insertAdjacentHTML("beforeend", foodHtml);
    food.foodStart();
} else if (area === "/sport") {
    const sport: { sportStart: () => void } = await import("./sport/sport.ts");
    document.body.insertAdjacentHTML("beforeend", sportHtml);
    sport.sportStart();
} else if (area === "/scripts" || area === "/edit" || area.startsWith("/plannings")) {
    const editor: { editorStart: () => Promise<void> } = await import("./editor/editor.ts");
    document.body.insertAdjacentHTML("beforeend", editorHtml);
    await editor.editorStart();
} else {
    const day: { dayStart: () => void } = await import("./day/day.ts");
    document.body.insertAdjacentHTML("beforeend", dayHtml);
    day.dayStart();
}
