/**
 * ## Reader
 *
 * Asks the reader for JSON, alike for every area of the page, see `reader/reader.ts`.
 */

/**
 * Asks the reader for something as JSON, `init` holds method and body of a change.
 *
 * @throws {Error} - When the reader cannot answer, like for a missing note
 */
export async function readerAsk<T>(address: string, init?: RequestInit): Promise<T> {
    const response: Response = await fetch(address, init);
    if (!response.ok) throw new Error(`Reader answered ${response.status} to ${address}`);
    return (await response.json()) as T;
}
