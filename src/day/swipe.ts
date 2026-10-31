/**
 * ## Swipe
 *
 * Changes the shown day on a phone by a swipe sideways, as a calendar app does:
 * a swipe to the left shows the day after, one to the right the day before,
 * and plan, log or note follow the finger meanwhile, see `--swipe` in `day.css`.
 * Only a clearly sideways move is a swipe, so nothing else of the day ever starts one:
 * - a move mostly up or down scrolls the time grid or the plan, as before;
 * - a finger resting longer than {@link restMs} before it moves is a press,
 *   so it selects a range in the time grid after 300 ms,
 *   or drags an entry after a second,
 *   see `selectLongPressDelay` in `day.ts`, and never swipes;
 * - an entry or a box being dragged, which turns the day itself at the edge,
 *   see `turnShow` in `day.ts`, never swipes;
 * - a touch in a dialog or a list over the page never swipes,
 *   since those lie outside the day.
 * A swipe beyond a quarter of the width, or a quick flick, changes the day:
 * the shown part slides out at that side and the new day slides in from the other;
 * a shorter one slides back.
 */

/**
 * Pixels a finger moves before its move counts as sideways or not,
 * so a tap that shakes a little stays a tap.
 */
const startPx: number = 10;

/**
 * Milliseconds a finger may rest before it moves and still swipe,
 * below the 300 ms press that selects a range in the time grid.
 */
const restMs: number = 250;

/**
 * Pixels per millisecond of a flick,
 * which changes the day even when shorter than a quarter of the width.
 */
const flickSpeed: number = 0.5;

/**
 * Milliseconds the shown part takes to slide out or back, as `transition` in `day.css`.
 */
const slideMs: number = 180;

/**
 * Starts the swipe of the day on a phone.
 * - `x`, `y`, `time`: Where and when the finger touched.
 * - `state`: `open` until the move shows its way,
 *   `swipe` while it follows the finger, `off` for anything else.
 * - `moved`: Pixels the finger moved sideways, positive to the right.
 * - `slide`: Moves the shown part to a place, sliding there or right there.
 * - `touchstart`: A new touch;
 *   a second finger, or one in a dialog, a list over the page or a drag, ends it.
 * - `touchmove`: Decides the way once the finger moved {@link startPx},
 *   then moves the shown part with it, keeping the time grid from scrolling meanwhile;
 *   passive no more, so it may.
 * - `touchend`: Changes the day or slides back.
 *
 * @param main - Plan, log and note with their bar,
 *   whose `--swipe` moves the shown part, see `day.css`
 * @param turn - Shows the day some days from the shown one,
 *   1 for the day after, -1 for the day before
 */
export function swipeStart(main: HTMLElement, turn: (days: number) => void): void {
    let x: number = 0;
    let y: number = 0;
    let time: number = 0;
    let state: "open" | "swipe" | "off" = "off";
    let moved: number = 0;
    const slide: (px: number, sliding: boolean) => void = (
        px: number,
        sliding: boolean,
    ): void => {
        main.classList.toggle("day-swiping", !sliding);
        main.style.setProperty("--swipe", `${px}px`);
    };
    main.addEventListener(
        "touchstart",
        (event: TouchEvent): void => {
            const target: Element = event.target as Element;
            const busy: boolean =
                target.closest("dialog, [popover], .picker-box") !== null ||
                document.querySelector(".day-turning, .day-pushing") !== null;
            state = event.touches.length === 1 && !busy ? "open" : "off";
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
            time = event.timeStamp;
            moved = 0;
        },
        { passive: true },
    );
    main.addEventListener(
        "touchmove",
        (event: TouchEvent): void => {
            const dx: number = event.touches[0].clientX - x;
            const dy: number = event.touches[0].clientY - y;
            if (state === "open" && Math.max(Math.abs(dx), Math.abs(dy)) >= startPx)
                state =
                    event.timeStamp - time <= restMs && Math.abs(dx) > 2 * Math.abs(dy)
                        ? "swipe"
                        : "off";
            if (state !== "swipe") return;
            if (event.cancelable) event.preventDefault();
            moved = dx;
            slide(moved, false);
        },
        { passive: false },
    );
    main.addEventListener("touchend", (event: TouchEvent): void => {
        if (state !== "swipe") return;
        state = "off";
        const width: number = main.clientWidth;
        const days: number =
            Math.abs(moved) > width / 4 ||
            Math.abs(moved) / (event.timeStamp - time) > flickSpeed
                ? -Math.sign(moved)
                : 0;
        slide(days === 0 ? 0 : -days * width, true);
        if (days === 0) return;
        setTimeout((): void => {
            turn(days);
            slide(days * width, false);
            requestAnimationFrame((): void => {
                requestAnimationFrame((): void => slide(0, true));
            });
        }, slideMs);
    });
    main.addEventListener("touchcancel", (): void => {
        if (state === "swipe") slide(0, true);
        state = "off";
    });
}
