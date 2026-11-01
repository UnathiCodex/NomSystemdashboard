/**
 * ## Search
 *
 * How every search of the page compares a typed text with what it searches.
 * A text matches when it holds each typed word, in small letters and without accents.
 */

/** Writes a text in small letters and without accents, `NFD` parts a letter from its accent. */
export function searchTextOf(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase();
}

/** Splits a typed text into the words the search compares. */
export function wordsOf(text: string): string[] {
    return searchTextOf(text)
        .split(/\s+/)
        .filter((word: string): boolean => word !== "");
}

/** Tells whether a text holds each of the typed words. */
export function matchesAll(text: string, words: string[]): boolean {
    const searched: string = searchTextOf(text);
    return words.every((word: string): boolean => searched.includes(word));
}
