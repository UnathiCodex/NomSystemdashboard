/**
 * ## Phone
 *
 * A phone is a screen at most 900 CSS pixels wide, or a touch screen at most 1366 wide, so my tablet too.
 * Every stylesheet a phone uses ends in one `@media` block with this same condition.
 */

/** Whether the page shows on a phone, read once at the start. */
export const phone: boolean = matchMedia("(max-width: 900px), (pointer: coarse) and (max-width: 1366px)").matches;
