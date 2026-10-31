/**
 * ## Search
 *
 * How every search of the page compares a typed text with what it searches,
 * alike everywhere:
 * the lists of the dialogs, see `./day/choices.ts`,
 * and the tree of Plannings, see `./notes/tree.ts`.
 * A text matches when it holds each typed word, in small letters and without accents,
 * so `munchen` finds `München`
 * and `2028 regression` finds the notes
 * of `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis`.
 */

/**
 * Writes a text as the search compares it: in small letters and without accents,
 * so `munchen` finds `München`.
 * - {@link String#normalize}:
 *   With `NFD`, parts a letter like `ü` into `u` and its accent, which is then dropped.
 *
 * @param text - Text, like `München`
 * @returns Text like `munchen`
 */
export function searchTextOf(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase();
}

/**
 * Splits a typed text into the words the search compares.
 *
 * @param text - Typed text, like `Mensa Garch`
 * @returns Words like `mensa`, `garch`
 */
export function wordsOf(text: string): string[] {
    return searchTextOf(text)
        .split(/\s+/)
        .filter((word: string): boolean => word !== "");
}

/**
 * Tells whether a text holds each of the typed words, see {@link wordsOf}.
 * - `searched`: The text as the search compares it.
 *
 * @param text - Text searched,
 *   like `IN2028_BusinessAnalyticsMachineLearning/01_RegressionAnalysis/01_01_….md`
 * @param words - Typed words, like `2028`, `regression`
 * @returns Whether it holds each of them
 */
export function matchesAll(text: string, words: string[]): boolean {
    const searched: string = searchTextOf(text);
    return words.every((word: string): boolean => searched.includes(word));
}
