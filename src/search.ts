/**
 * ## Search
 *
 * How every search of the page compares a typed text with what it searches,
 * alike in the dialogs, see `./day/choices.ts`, and in Plannings, see `./notes/tree.ts`.
 * A text matches when it holds each typed word, in small letters and without accents.
 */

/**
 * Writes a text in small letters and without accents, so `munchen` finds `München`.
 * `NFD` parts a letter like `ü` into `u` and its accent, which is then dropped.
 */
export function searchTextOf(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase();
}

/**
 * Splits a typed text into the words the search compares.
 */
export function wordsOf(text: string): string[] {
    return searchTextOf(text)
        .split(/\s+/)
        .filter((word: string): boolean => word !== "");
}

/**
 * Tells whether a text holds each of the typed words.
 */
export function matchesAll(text: string, words: string[]): boolean {
    const searched: string = searchTextOf(text);
    return words.every((word: string): boolean => searched.includes(word));
}
