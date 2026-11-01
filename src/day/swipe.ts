/**
 * ## Swipe
 *
 * Changes the shown day on a phone by a swipe sideways, plan, log or note following the finger.
 * Only a clearly sideways move is a swipe, so nothing else of the day ever starts one.
 * - Up or down: scrolls the time grid or the plan.
 * - Resting first: a press, which selects a range or drags an entry.
 * - Dragging: an entry being dragged turns the day itself at the edge.
 * - Dialog: a touch in a dialog or a list over the page lies outside the day.
 * A swipe beyond a quarter of the width, or a quick flick, changes the day.
 */

/** Pixels a finger moves before its move counts, so a tap that shakes a little stays a tap. */
const startPx: number = 10;

/** Milliseconds a finger may rest and still swipe, below the 300 ms press that selects a range. */
const restMs: number = 250;

/** Pixels per millisecond of a flick, which changes the day even when shorter. */
const flickSpeed: number = 0.5;

/** Milliseconds the shown part takes to slide out or back, as in `day.css`. */
const slideMs: number = 180;

/**
 * Starts the swipe of the day on a phone.
 * `touchmove` is not passive, so it may keep the time grid from scrolling while it swipes.
 *
 * @param turn - Shows the day some days from the shown one
 */
export function swipeStart(main: HTMLElement, turn: (days: number) => void): void {
    let x: number = 0;
    let y: number = 0;
    let time: number = 0;
    let state: "open" | "swipe" | "off" = "off";
    let moved: number = 0;
    const slide: (px: number, sliding: boolean) => void = (px: number, sliding: boolean): void => {
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
                state = event.timeStamp - time <= restMs && Math.abs(dx) > 2 * Math.abs(dy) ? "swipe" : "off";
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
            Math.abs(moved) > width / 4 || Math.abs(moved) / (event.timeStamp - time) > flickSpeed
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
