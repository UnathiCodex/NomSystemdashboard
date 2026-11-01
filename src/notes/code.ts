/**
 * ## Code
 *
 * The languages of my code blocks, a fixed list, their words in the colors of my IntelliJ theme.
 * Every other block is in the color of text.
 * Make has no language of its own there, its lines take that of Bash.
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
 * A language whose built-in words read as any other word, as my theme colors them in Python alone.
 * Its simple types written small read as keywords, as IntelliJ colors them.
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

/** The languages of my code blocks as written after the ```, in the order of the list to pick. */
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

/** Classes of the pieces of code, one for each kind of word of my theme. */
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

/** The language of a code block by what follows its ```, `null` for none of my list. */
export function codeLanguageOf(info: string): StreamLanguage<unknown> | null {
    return codeLanguages[info.trim().split(/\s/)[0].toLowerCase()] ?? null;
}

/** The code of a block as HTML with a class for each piece, `null` for no language of my list. */
export function codeHtmlOf(code: string, info: string): string | null {
    const language: StreamLanguage<unknown> | null = codeLanguageOf(info);
    if (language === null) return null;
    let html: string = "";
    const escaped = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    highlightCode(
        code,
        language.parser.parse(code),
        codeHighlighter,
        (text: string, classes: string): void => {
            html += classes === "" ? escaped(text) : `<span class="${classes}">${escaped(text)}</span>`;
        },
        (): void => {
            html += "\n";
        },
    );
    return html;
}

/** Gives every kind of code its color from my theme as `--code-…` on the page. */
export async function codeColorsSet(): Promise<void> {
    const colors: { [kind: string]: string } = await (await fetch("/api/theme")).json();
    for (const [kind, color] of Object.entries(colors))
        document.documentElement.style.setProperty(`--code-${kind}`, color);
}
