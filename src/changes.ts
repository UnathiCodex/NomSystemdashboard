/**
 * ## Changes
 *
 * Loads what a view shows anew the moment a file of my new system changes, whoever changed it.
 * Also once the page hears the reader again after losing it, since a change may have come meanwhile.
 */

/** Loads of the views that follow the changes. */
const followers: (() => void)[] = [];

/** The open answer of the reader, `null` until the first view follows the changes. */
let source: EventSource | null = null;

/** Whether the page lost the reader since it last heard it. */
let lost: boolean = false;

/** Loads a view anew after every change, the first view to follow opens the answer of the reader. */
export function changesFollow(again: () => void): void {
    followers.push(again);
    if (source !== null) return;
    const loadAll: () => void = (): void => followers.forEach((follower: () => void): void => follower());
    source = new EventSource("/api/changes");
    source.addEventListener("message", loadAll);
    source.addEventListener("error", (): void => {
        lost = true;
    });
    source.addEventListener("open", (): void => {
        if (lost) loadAll();
        lost = false;
    });
}

/**
 * Keeps what a load gives, anew after every change, so a dialog opens without waiting for the reader.
 * A load that failed, like while the reader starts anew, runs again when it is needed.
 */
export function changesKept<T>(load: () => Promise<T>): () => Promise<T> {
    let kept: Promise<T> = load();
    changesFollow((): void => {
        kept = load();
    });
    return (): Promise<T> => (kept = kept.catch((): Promise<T> => load()));
}
