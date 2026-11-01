/**
 * ## Markdown
 *
 * The empty lines of my system in the Markdown the reader writes, the cells of a table row, a clean name.
 */

const headingForm: RegExp = /^ {0,3}#{1,6}(?:[ \t]|$)/;

/** Only spaces and tabs, a line of only the spacer `⠀` is text. */
const emptyForm: RegExp = /^[ \t]*$/;

/** The line that opens or closes a fenced block of code. */
const fenceForm: RegExp = /^ {0,3}(?:```|~~~)/;

/**
 * Gives a Markdown text with the empty lines of my system.
 * None before the first line, one after the front matter, two before a heading, one below it.
 * Else one where there was any, none where there was none.
 * The front matter and fenced code stay as they are.
 */
export function markdownFormOf(text: string): string {
    const lines: string[] = text.split("\n");
    const close: number = lines.slice(1).findIndex((line: string): boolean => line === "---");
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
    while (written.length > matter && emptyForm.test(written[written.length - 1])) written.pop();
    return written.length === 0 ? "" : `${written.join("\n")}\n`;
}

/**
 * Cuts a row of a table into its trimmed cells, parted only by a `|` that is no `\|`.
 * A cell keeps its `\|`, so it stays one cell when its row is written back.
 */
export function cellsOf(line: string): string[] {
    return line
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((cell: string): string => cell.trim());
}

/** Cleans a name for a table and the log, `|` and `;` become one space. */
export function nameOf(name: string): string {
    return name.replace(/[|;]/g, " ").replace(/\s+/g, " ").trim();
}
