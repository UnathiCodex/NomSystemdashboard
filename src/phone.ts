/**
 * ## Phone
 *
 * Tells the code whether the page shows on a phone: a screen at most 900 CSS pixels wide,
 * or a touch screen at most 1366 wide, so my tablet shows the phone layout too, always.
 * Every stylesheet a phone uses ends in one `@media` block with this same condition,
 * and the code asks {@link phone} for what a stylesheet cannot do.
 * My PC and my laptop, 1920 and 1601 wide and used with a mouse, keep their layout.
 */

/**
 * Whether the page shows on a phone, read once at the start.
 */
export const phone: boolean = matchMedia(
    "(max-width: 900px), (pointer: coarse) and (max-width: 1366px)",
).matches;
