/**
 * ## Markdown
 *
 * Gives the Markdown the reader writes the empty lines of my system,
 * see {@link markdownFormOf}:
 * two empty lines before a heading, one below it and one between paragraphs;
 * none at the start of a file, one after its front matter, and none at its end,
 * which is one line break. Only empty lines change, every other line stays as it is.
 */

/**
 * A heading, of any level, like `## Gratitude`.
 */
const headingForm: RegExp = /^ {0,3}#{1,6}(?:[ \t]|$)/;

/**
 * An empty line: nothing or only spaces and tabs;
 * a line of only the spacer `⠀` is a line of text.
 */
const emptyForm: RegExp = /^[ \t]*$/;

/**
 * The line that opens or closes a fenced block of code, like ```` ```ts ````.
 */
const fenceForm: RegExp = /^ {0,3}(?:```|~~~)/;

/**
 * Gives a Markdown text with the empty lines of my system, see the top of this file:
 * before each line of text as many empty lines as the line
 * before it and the line itself ask,
 * however many there were: none before the first line, one after the front matter,
 * two before a heading, also right below another heading, one below a heading,
 * else one where there was any and none where there was none.
 * Its front matter, `---` on the first line up to the next `---`,
 * and the lines inside a fenced block of code stay as they are.
 * - `lines`: Lines of the text.
 * - `close`: Index of the line that closes the front matter among the lines
 *   after the first, -1 for none.
 * - `matter`: Number of lines of the front matter, 0 for none.
 * - `written`: The lines as written so far.
 * - `empty`: Empty lines met since the last line of text.
 * - `before`: What the last line of text was:
 *   none yet, the end of the front matter, a heading or other text.
 * - `fenced`: Whether the line stands inside a fenced block of code.
 * - `heading`: Whether the line is a heading.
 * - `count`: The empty lines written before it.
 *
 * @param text - Markdown text
 * @returns The text with the empty lines of my system, ending with one line break,
 *   empty for a text without text
 */
export function markdownFormOf(text: string): string {
    const lines: string[] = text.split("\n");
    const close: number = lines
        .slice(1)
        .findIndex((line: string): boolean => line === "---");
    const matter: number = lines[0] === "---" && close !== -1 ? close + 2 : 0;
    const written: string[] = lines.slice(0, matter);
    let empty: number = 0;
    let before: "none" | "matter" | "heading" | "text" = matter === 0 ? "none" : "matter";
    let fenced: boolean = false;
    lines.slice(matter).forEach((line: string): void => {
        if (fenced) {
            written.push(line);
            fenced = !fenceForm.test(line);
            return;
        }
        if (emptyForm.test(line)) {
            empty++;
            return;
        }
        const heading: boolean = headingForm.test(line);
        const count: number =
            before === "none"
                ? 0
                : before === "matter"
                  ? 1
                  : heading
                    ? 2
                    : before === "heading"
                      ? 1
                      : Math.min(empty, 1);
        written.push(...Array.from({ length: count }, (): string => ""), line);
        empty = 0;
        before = heading ? "heading" : "text";
        fenced = fenceForm.test(line);
    });
    while (written.length > matter && emptyForm.test(written[written.length - 1]))
        written.pop();
    return written.length === 0 ? "" : `${written.join("\n")}\n`;
}
