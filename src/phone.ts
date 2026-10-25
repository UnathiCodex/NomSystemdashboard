/**
 * ## Phone
 *
 * Tells the code whether the page shows on a phone: a screen at most 900 CSS pixels wide,
 * like my phone's 388, or a screen I touch with a finger at most 1366 wide,
 * like my tablet's 1067 lying and 428 standing, which shows the phone layout too, always.
 * That is the one condition at which the whole dashboard changes to its phone layout,
 * the plan and the log of a day alone, see `main.ts`:
 * every stylesheet a phone uses ends
 * in one block `@media (max-width: 900px), (pointer: coarse) and (max-width: 1366px)`,
 * which holds all its rules for a phone,
 * and the code asks {@link phone} for what a stylesheet cannot do,
 * like a skill shown by its code alone.
 * My PC and my laptop, 1920 and 1601 wide and used with a mouse, are far above it,
 * so they keep their layout.
 */

/**
 * Whether the page shows on a phone,
 * by the same condition as the phone layout of the stylesheets, read once at the start.
 */
export const phone: boolean = matchMedia(
    "(max-width: 900px), (pointer: coarse) and (max-width: 1366px)",
).matches;
