/**
 * ## Code
 *
 * The languages of my code blocks, a fixed list, see {@link codeLanguages},
 * named after the ``` of a block, like ```python, and picked in the editor from that list:
 * the words of a block of one of them in the colors of my IntelliJ theme, see `reader/theme.ts`,
 * every other block in the color of text, white;
 * in the scripts view, see {@link codeHtmlOf}, and in the editor, see `../editor/syntax.ts`.
 * Make has no language of its own there, its lines take that of Bash.
 * Built-in functions, like `print` and `len`, take a color of their own only in Python,
 * as my theme gives it for Python alone, see {@link plain}, and so do `self` and `cls`;
 * simple types, like `int` and `void`, that of keywords.
 *
 * - `@codemirror/language`: Reads a language of CodeMirror's older modes, `StreamLanguage`.
 * - `@codemirror/legacy-modes`: The languages.
 * - `@lezer/highlight`: Gives each piece of code its class, like `code-keyword`,
 *   see {@link codeHighlighter}, colored by `notes.css`.
 */

import { StreamLanguage } from "@codemirror/language";
import { c, java } from "@codemirror/legacy-modes/mode/clike";
import { json } from "@codemirror/legacy-modes/mode/javascript";
import { python } from "@codemirror/legacy-modes/mode/python";
import { r } from "@codemirror/legacy-modes/mode/r";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { standardSQL } from "@codemirror/legacy-modes/mode/sql";
import { xml } from "@codemirror/legacy-modes/mode/xml";
import { highlightCode, tagHighlighter, tags } from "@lezer/highlight";

import type { StreamParser, StringStream } from "@codemirror/language";
import type { Highlighter } from "@lezer/highlight";

/**
 * A language whose built-in words read as any other word,
 * as my theme colors built-in functions of Python alone;
 * its simple types, written small like `void`, `int` and `boolean`, as keywords,
 * as IntelliJ colors them, while types like `String` and `size_t` stay types.
 * - `style`: The kind of the word the mode reads.
 *
 * @param mode - The language as CodeMirror's old mode, like `java`
 * @returns The language, its built-in words plain, its simple types keywords
 */
function plain(mode: StreamParser<unknown>): StreamLanguage<unknown> {
    return StreamLanguage.define({
        ...mode,
        token: (stream: StringStream, state: unknown): string | null => {
            const style: string | null = mode.token(stream, state);
            if (style === "builtin") return "variable";
            return style === "type" && /^[a-z]+$/.test(stream.current()) ? "keyword" : style;
        },
    });
}

/**
 * The languages of my code blocks, as written after the ```, in the order of the list to pick.
 */
export const codeLanguages: { [name: string]: StreamLanguage<unknown> } = {
    bash: StreamLanguage.define(shell),
    c: plain(c),
    java: plain(java),
    python: StreamLanguage.define({ ...python, tokenTable: { self: tags.self } }),
    r: plain(r),
    sql: plain(standardSQL),
    make: StreamLanguage.define(shell),
    json: StreamLanguage.define(json),
    xml: StreamLanguage.define(xml),
};

/**
 * Classes of the pieces of code, one for each kind of word of `reader/theme.ts`,
 * like `code-keyword`, which `notes.css` colors by `--code-keyword`;
 * every other word, like the name of a variable, in the color of text.
 */
export const codeHighlighter: Highlighter = tagHighlighter([
    { tag: tags.self, class: "code-self" },
    { tag: tags.keyword, class: "code-keyword" },
    { tag: tags.atom, class: "code-atom" },
    { tag: tags.bool, class: "code-bool" },
    { tag: tags.number, class: "code-number" },
    { tag: tags.string, class: "code-string" },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "code-string2" },
    { tag: tags.comment, class: "code-comment" },
    { tag: tags.definition(tags.variableName), class: "code-definition" },
    { tag: tags.standard(tags.variableName), class: "code-builtin" },
    { tag: tags.typeName, class: "code-typeName" },
    { tag: tags.className, class: "code-className" },
    { tag: tags.propertyName, class: "code-propertyName" },
    { tag: tags.operator, class: "code-operator" },
    { tag: tags.meta, class: "code-meta" },
    { tag: tags.tagName, class: "code-tagName" },
    { tag: tags.attributeName, class: "code-attributeName" },
]);

/**
 * Finds the language of a code block by what follows its ```.
 *
 * @param info - What follows the ```, like `python` or `Python title="x"`
 * @returns The language, `null` for none of my list
 */
export function codeLanguageOf(info: string): StreamLanguage<unknown> | null {
    return codeLanguages[info.trim().split(/\s/)[0].toLowerCase()] ?? null;
}

/**
 * Turns the code of a block into HTML with a class for each piece, like `code-keyword`,
 * see {@link codeHighlighter}.
 * - `language`: Its language.
 * - `html`: The HTML so far.
 * - `escaped`: Gives a piece of code as text of HTML.
 *
 * @param code - The code
 * @param info - What follows the ``` of the block
 * @returns The HTML, `null` for a block of no language of my list
 */
export function codeHtmlOf(code: string, info: string): string | null {
    const language: StreamLanguage<unknown> | null = codeLanguageOf(info);
    if (language === null) return null;
    let html: string = "";
    const escaped = (text: string): string =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    highlightCode(
        code,
        language.parser.parse(code),
        codeHighlighter,
        (text: string, classes: string): void => {
            html +=
                classes === "" ? escaped(text) : `<span class="${classes}">${escaped(text)}</span>`;
        },
        (): void => {
            html += "\n";
        },
    );
    return html;
}

/**
 * Gives every kind of code its color from my theme, see `reader/theme.ts`,
 * as `--code-…` on the page, like `--code-string`, for `notes.css`.
 * - `colors`: Color of each kind, like `{ "string": "#6aab73", … }`.
 */
export async function codeColorsSet(): Promise<void> {
    const colors: { [kind: string]: string } = await (await fetch("/api/theme")).json();
    for (const [kind, color] of Object.entries(colors))
        document.documentElement.style.setProperty(`--code-${kind}`, color);
}
