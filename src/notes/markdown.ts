/**
 * ## Markdown
 *
 * Turns the Markdown of a note into clean HTML as Obsidian reads it, with the syntax my notes use:
 * - formulas `$…$` and `$$…$$`, taken whole before any other Markdown, so their TeX stays TeX
 * - callouts, wiki links and embeds, images only in Markdown's form
 * - a single line break as a break, a lazy line as part of its list item
 * - an HTML block ending on the line its tag closes, as in Obsidian's editor
 * - `|` inside `[[…]]` on a table row as part of the link
 * Beyond Obsidian, a heading `##` folds its block, a section `#### Solution…` comes folded,
 * so I try a task before I see its solution.
 * Also beyond Obsidian, every empty line between two blocks stays one line high.
 * The HTML comes cleaned of scripts, because some notes in my modules come from the internet.
 */

import { Marked } from "marked";
import DOMPurify from "dompurify";

import { codeHtmlOf } from "./code.ts";

import type {
    Renderer,
    RendererThis,
    Token,
    Tokens,
    TokenizerAndRendererExtension,
    TokenizerThis,
    TokensList,
} from "marked";

/** Formula on lines of its own, from a line starting with `$$` to a line ending with `$$`. */
const mathBlockRule: RegExp = /^ {0,3}\$\$([^$\n]*\n(?:.*\n)*?[^$\n]*)\$\$[ \t]*(?:\n|$)/;

/**
 * Formula `$$…$$` within a line, with one line break after it,
 * since it stands on a line of its own anyway.
 */
const mathDisplayRule: RegExp = /^\$\$((?:\\[\s\S]|[^\\])*?)\$\$(?:[^\S\n]*\n)?/;

/**
 * Formula `$…$`, no space inside its signs and no digit after it, so `$5 and $6` stays text.
 * A backslash keeps the next character, so `\$` ends no formula.
 */
const mathInlineRule: RegExp = /^\$(?![ \t$])((?:\\[\s\S]|[^\\])+?)(?<![ \t])\$(?!\d)/;

/**
 * Punctuation right after a formula `$…$`, which stays on its line.
 * A formula never breaks, so a break before it would leave the punctuation alone on the next line.
 */
export const punctuationRule: RegExp = /^[.,;:!?)]+/;

/** Callout, a quote whose first line is `> [!type] Title`, `-` or `+` for folding. */
const calloutRule: RegExp = /^ {0,3}>[ \t]?\[!([^\]]+)\]([+-]?)[ \t]*(.*)(?:\n|$)((?: {0,3}>.*(?:\n|$))*)/;

/** Wiki link `[[Note#Heading|Text]]` or embed `![[Note]]`. */
const wikiLinkRule: RegExp = /^(!?)\[\[([^\]]+)\]\]/;

/** HTML block of a block tag, up to the end of the line where the tag closes. */
const htmlBlockRule: RegExp = new RegExp(
    /^ {0,3}/.source +
        /<(table|div|details|figure|center)\b(?:(?!\n[ \t]*\n)[\s\S])*?<\/\1>/.source +
        /[^\n]*(?:\n|$)/.source,
    "i",
);

/** Front matter between `---` lines, which the view leaves out. */
const frontMatterRule: RegExp = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** Row of a table, also inside a quote. */
const tableRowRule: RegExp = /^[ \t>]*\|.*$/gm;

/** List item with its indentation, its marker and the spaces after. */
const listItemRule: RegExp = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)/;

/**
 * Line that begins a block of its own, so it never goes on with the text above it.
 * A line with `$$` goes on with it, so a formula stays whole.
 */
const blockStartRule: RegExp = /^[ \t]*(?:#{1,6}(?:[ \t]|$)|>|```|~~~|\||<|(?:[-*_][ \t]*){3,}$)/;

/** Text of a heading that opens a solution. */
const solutionRule: RegExp = /^Solution\b/;

/** Address with a scheme, a link out of the module. */
const externalRule: RegExp = /^[a-z][a-z\d+.-]*:/i;

/** Escapes text for HTML, also inside attributes in `"…"`. */
function escaped(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Splits a link at its first `#` into file and heading, the file empty for the note itself. */
function linkPartsOf(address: string): [string, string] {
    const hash: number = address.indexOf("#");
    return hash === -1 ? [address.trim(), ""] : [address.slice(0, hash).trim(), address.slice(hash + 1).trim()];
}

/** Counts the empty lines at the end of Markdown, a line of spaces or tabs counted as empty. */
function emptyLinesAtEndOf(markdown: string): number {
    const end: string = /[ \t\n]*$/.exec(markdown)?.[0] ?? "";
    return Math.max((end.match(/\n/g) ?? []).length - 1, 0);
}

/**
 * Indents each lazy line of a list as the text above it, so marked reads it as CommonMark does.
 * marked would end the whole list at a lazy line whose line above lies 4 columns deeper than its item.
 * Lines inside a formula `$$…$$` are TeX, so a row like `- & 1 & 2` starts no list.
 */
function lazyLinesIndented(markdown: string): string {
    const lines: string[] = markdown.split("\n");
    const columnsOf: (line: string) => number = (line: string): number =>
        (/^[ \t]*/.exec(line)?.[0] ?? "").replace(/\t/g, "    ").length;
    const tex: boolean[] = [];
    let open: boolean = false;
    for (const line of lines) {
        tex.push(open);
        const signs: number = (line.match(/\$\$/g) ?? []).length;
        if (signs % 2 === 1) open = !open;
    }
    const markdownAt: (index: number) => boolean = (index: number): boolean => !tex[index];

    let listed: boolean = false;
    let fenced: boolean = false;
    for (let index: number = 0; index < lines.length; index++) {
        const line: string = lines[index];
        const above: string = lines[index - 1] ?? "";
        if (/^[ \t]*(?:```|~~~)/.test(line)) {
            fenced = !fenced;
            listed = listed && /^[ \t]/.test(line);
            continue;
        }
        if (fenced || line.trim() === "") continue;
        if (markdownAt(index) && listItemRule.test(line)) {
            listed = true;
            continue;
        }
        if (markdownAt(index) && /^\S/.test(line) && (above.trim() === "" || blockStartRule.test(line))) listed = false;
        if (
            !listed ||
            above.trim() === "" ||
            (markdownAt(index) && blockStartRule.test(line)) ||
            (markdownAt(index - 1) && /^[ \t]*(?:#|>|```|~~~|\||<)/.test(above))
        )
            continue;

        const item: RegExpExecArray | null = markdownAt(index - 1) ? listItemRule.exec(above) : null;
        const indentation: string =
            item === null ? (/^[ \t]*/.exec(above)?.[0] ?? "") : item[1] + " ".repeat(item[2].length + item[3].length);
        if (columnsOf(line) < columnsOf(indentation)) lines[index] = indentation + line.trimStart();
    }
    return lines.join("\n");
}

/**
 * Prepares a note for marked without its front matter and with its lazy lines indented.
 * Every `|` inside `[[…]]` on a table row becomes `\|`, so marked keeps the link in one cell.
 */
function preprocess(note: string): string {
    return lazyLinesIndented(
        note
            .replace(frontMatterRule, "")
            .replace(tableRowRule, (row: string): string =>
                row.replace(/\[\[[^\]]*\]\]/g, (link: string): string => link.replace(/(?<!\\)\|/g, "\\|")),
            ),
    );
}

/**
 * Hides wiki links and formulas from marked's search for the end of `*…*` and `_…_`,
 * so an emphasis never ends at the `*` of `$x^*$`.
 */
function emStrongMask(src: string): string {
    let masked: string = src.replace(/!?\[\[[^\]]*\]\]/g, (link: string): string => "a".repeat(link.length));
    for (let index: number = masked.indexOf("$"); index !== -1; index = masked.indexOf("$", index + 1)) {
        const rest: string = masked.slice(index);
        const math: RegExpExecArray | null = mathDisplayRule.exec(rest) ?? mathInlineRule.exec(rest);
        if (math !== null)
            masked = masked.slice(0, index) + "a".repeat(math[0].length) + masked.slice(index + math[0].length);
    }
    return masked;
}

/** Formula on lines of its own, which may interrupt a paragraph as in Obsidian. */
const mathBlock: TokenizerAndRendererExtension = {
    name: "mathBlock",
    level: "block",
    start: (src: string): number | undefined => src.match(/^ {0,3}\$\$[^$\n]*\n/m)?.index,
    tokenizer: (src: string): Tokens.Generic | undefined => {
        const match: RegExpExecArray | null = mathBlockRule.exec(src);
        return match === null ? undefined : { type: "mathBlock", raw: match[0], tex: match[1] };
    },
    renderer: (token: Tokens.Generic): string => `<div class="math math-block">${escaped(token.tex)}</div>`,
};

/** Formula within a line, together with its punctuation in `<span class="math-unbroken">`. */
const mathInline: TokenizerAndRendererExtension = {
    name: "mathInline",
    level: "inline",
    start: (src: string): number => src.indexOf("$"),
    tokenizer: (src: string): Tokens.Generic | undefined => {
        const display: RegExpExecArray | null = mathDisplayRule.exec(src);
        const match: RegExpExecArray | null = display ?? mathInlineRule.exec(src);
        if (match === null) return undefined;
        const punctuation: string =
            display === null ? (punctuationRule.exec(src.slice(match[0].length))?.[0] ?? "") : "";
        return {
            type: "mathInline",
            raw: match[0] + punctuation,
            tex: match[1],
            display: display !== null,
            punctuation: punctuation,
        };
    },
    renderer: (token: Tokens.Generic): string => {
        const math: string =
            `<span class="math math-${token.display ? "block" : "inline"}">` + `${escaped(token.tex)}</span>`;
        return token.punctuation === ""
            ? math
            : `<span class="math-unbroken">${math}${escaped(token.punctuation)}</span>`;
    },
};

/**
 * Callout, its title the type with a capital when it has none.
 * The title stands inside `callout-title-inner`, so it stays one piece between the icon and the fold arrow.
 * A tab right after `>` stays as indentation.
 */
const callout: TokenizerAndRendererExtension = {
    name: "callout",
    level: "block",
    start: (src: string): number | undefined => src.match(/^ {0,3}>[ \t]?\[!/m)?.index,
    tokenizer(this: TokenizerThis, src: string): Tokens.Generic | undefined {
        const match: RegExpExecArray | null = calloutRule.exec(src);
        if (match === null) return undefined;

        const [raw, kind, fold, title, lines]: string[] = match;
        const titleTokens: Token[] = [];
        this.lexer.inline(title.trim() || `${kind.charAt(0).toUpperCase()}${kind.slice(1).toLowerCase()}`, titleTokens);
        return {
            type: "callout",
            raw: raw,
            kind: kind.toLowerCase(),
            fold: fold,
            title: titleTokens,
            tokens: this.lexer.blockTokens(lazyLinesIndented(lines.replace(/^ {0,3}> ?/gm, "")), []),
        };
    },
    renderer(this: RendererThis, token: Tokens.Generic): string {
        const kind: string = escaped(token.kind);
        const title: string = `<span class="callout-title-inner">` + `${this.parser.parseInline(token.title)}</span>`;
        const content: string = this.parser.parse(token.tokens ?? []);
        return token.fold === ""
            ? `<div class="callout" data-callout="${kind}">` +
                  `<div class="callout-title">${title}</div>` +
                  `<div class="callout-content">${content}</div></div>`
            : `<details class="callout" data-callout="${kind}"` +
                  `${token.fold === "+" ? " open" : ""}>` +
                  `<summary class="callout-title">${title}</summary>` +
                  `<div class="callout-content">${content}</div></details>`;
    },
    childTokens: ["title"],
};

/**
 * Wiki link or embed, `\|` counted as `|`, showing its text, else `Note > Heading`.
 * An embedded note is an empty `<div class="markdown-embed">` to fill, any other file a link.
 */
const wikiLink: TokenizerAndRendererExtension = {
    name: "wikiLink",
    level: "inline",
    start: (src: string): number => src.search(/!?\[\[/),
    tokenizer: (src: string): Tokens.Generic | undefined => {
        const match: RegExpExecArray | null = wikiLinkRule.exec(src);
        if (match === null) return undefined;

        const [address, ...text]: string[] = match[2].replace(/\\\|/g, "|").split("|");
        const [target, heading]: [string, string] = linkPartsOf(address);
        return {
            type: "wikiLink",
            raw: match[0],
            embed: match[1] === "!",
            target: target,
            heading: heading,
            text: text.join("|"),
        };
    },
    renderer: (token: Tokens.Generic): string => {
        const data: string = `data-link="${escaped(token.target)}" ` + `data-heading="${escaped(token.heading)}"`;
        const ending: string = /\.([a-z\d]+)$/i.exec(token.target)?.[1].toLowerCase() ?? "md";
        const name: string = [token.target, token.heading].filter((part: string): boolean => part !== "").join(" > ");

        if (token.embed && ending === "md") return `<div class="markdown-embed" ${data}></div>`;
        return `<a class="internal-link" ${data}>` + `${escaped(token.text === "" ? name : token.text)}</a>`;
    },
};

/** Empty lines between two blocks, their number in `data-lines`. */
const emptyLines: TokenizerAndRendererExtension = {
    name: "emptyLines",
    renderer: (token: Tokens.Generic): string => `<div class="empty-lines" data-lines="${token.lines}"></div>`,
};

/** Section under a heading that folds, the heading its `<summary>`. */
const fold: TokenizerAndRendererExtension = {
    name: "fold",
    renderer(this: RendererThis, token: Tokens.Generic): string {
        const [heading, ...blocks]: Token[] = token.tokens ?? [];
        return (
            `<details class="fold"${token.open ? " open" : ""}>` +
            `<summary>${this.parser.parse([heading])}</summary>` +
            `<div class="fold-content">${this.parser.parse(blocks)}</div></details>`
        );
    },
};

/**
 * Keeps the empty lines between two blocks, which marked reads as a `space` and draws as nothing.
 * They are counted from the end of the block above,
 * since marked keeps the last line break of a block sometimes in the block, sometimes in the `space`.
 * Between two list items marked keeps them at the end of the item above, so they go there.
 * Empty lines before the first or after the last block go.
 */
function emptyLinesMade(tokens: Token[] | TokensList): Token[] | TokensList {
    while (tokens[0]?.type === "space") tokens.shift();
    while (tokens.at(-1)?.type === "space") tokens.pop();
    tokens.forEach((block: Token, index: number): void => {
        if (block.type === "space")
            tokens[index] = {
                type: "emptyLines",
                raw: block.raw,
                lines: emptyLinesAtEndOf(tokens[index - 1].raw + block.raw),
            };
        else if (block.type === "blockquote" || block.type === "callout") emptyLinesMade(block.tokens ?? []);
        else if (block.type === "list")
            block.items.forEach((item: Tokens.ListItem, number: number): void => {
                emptyLinesMade(item.tokens);
                const lines: number = emptyLinesAtEndOf(item.raw);
                if (number < block.items.length - 1 && lines > 0)
                    item.tokens.push({ type: "emptyLines", raw: "", lines: lines });
            });
    });
    return tokens;
}

/** Folds each section under a heading of a level whose text says so, up to the next heading as high. */
function sectionsFolded(
    tokens: Token[] | TokensList,
    depth: number,
    folds: (text: string) => boolean,
    open: boolean,
): Token[] | TokensList {
    const sectionEnds: (block: Token) => boolean = (block: Token): boolean =>
        block.type === "heading" && block.depth <= depth;
    for (let start: number = 0; start < tokens.length; start++) {
        const heading: Token = tokens[start];
        if (heading.type !== "heading" || heading.depth !== depth || !folds(heading.text)) continue;

        let end: number = start + 1;
        while (end < tokens.length && !sectionEnds(tokens[end])) end++;
        const section: Token[] = tokens.splice(start, end - start);
        tokens.splice(start, 0, {
            type: "fold",
            raw: section.map((block: Token): string => block.raw).join(""),
            tokens: section,
            open: open,
        });
    }
    return tokens;
}

/** Folds each `#### Solution…` closed, then each `##` open with its solutions inside. */
function foldsMade(tokens: Token[] | TokensList): Token[] | TokensList {
    sectionsFolded(tokens, 4, (text: string): boolean => solutionRule.test(text), false);
    return sectionsFolded(tokens, 2, (): boolean => true, true);
}

/** Keeps the empty lines before folding, so the empty lines below a section end its fold. */
function blocksMade(tokens: Token[] | TokensList): Token[] | TokensList {
    return foldsMade(emptyLinesMade(tokens));
}

/** Heading with its text in `data-heading`, so `[[Note#Heading]]` finds it. */
function headingOf(this: Renderer, token: Tokens.Heading): string {
    return (
        `<h${token.depth} data-heading="${escaped(token.text)}">` +
        `${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`
    );
}

/** Markdown link, inside the module an `internal-link`, outside `false` for marked's own. */
function linkOf(this: Renderer, token: Tokens.Link): string | false {
    if (externalRule.test(token.href)) return false;

    const [target, heading]: [string, string] = linkPartsOf(token.href);
    return (
        `<a class="internal-link" data-link="${escaped(target)}" ` +
        `data-heading="${escaped(heading)}">` +
        `${this.parser.parseInline(token.tokens)}</a>`
    );
}

/** Code block of a language of my list in my theme, else `false` for marked's own. */
function codeOf(token: Tokens.Code): string | false {
    const html: string | null = codeHtmlOf(token.text, token.lang ?? "");
    return html === null
        ? false
        : `<pre><code class="language-${escaped(token.lang ?? "")}">` + `${html}</code></pre>\n`;
}

/** Markdown image, inside the module with its link in `data-link`, outside `false` for marked's own. */
function imageOf(this: Renderer, token: Tokens.Image): string | false {
    return externalRule.test(token.href)
        ? false
        : `<img data-link="${escaped(token.href)}" alt="${escaped(token.text)}">`;
}

/** HTML block up to the line its tag closes, since marked's own ends at the next empty line. */
function htmlBlockOf(src: string): Tokens.HTML | false {
    const match: RegExpExecArray | null = htmlBlockRule.exec(src);
    return match === null ? false : { type: "html", block: true, pre: false, raw: match[0], text: match[0] };
}

/** Markdown reader with Obsidian's syntax. */
const markdown: Marked = new Marked({
    breaks: true,
    extensions: [mathBlock, mathInline, callout, wikiLink, emptyLines, fold],
    tokenizer: { html: htmlBlockOf },
    renderer: { heading: headingOf, link: linkOf, image: imageOf, code: codeOf },
    hooks: {
        preprocess: preprocess,
        emStrongMask: emStrongMask,
        processAllTokens: blocksMade,
    },
});

/**
 * Turns the Markdown of a note into clean HTML.
 * The block below empty lines gets their number in `--empty-lines`,
 * so the room comes and goes with the block, like a step of a solution shown one at a time.
 * Empty lines at the end of a list item or a section go to the next element out of it.
 * A `<template>` loads nothing of the HTML, like an image.
 */
export function htmlOf(note: string): string {
    const page: HTMLTemplateElement = document.createElement("template");
    page.innerHTML = DOMPurify.sanitize(markdown.parse(note, { async: false }));
    page.content.querySelectorAll<HTMLElement>(".empty-lines").forEach((lines: HTMLElement): void => {
        let above: Element | null = lines;
        while (above !== null && above.nextElementSibling === null) above = above.parentElement;
        const below: HTMLElement | null = (above?.nextElementSibling ?? null) as HTMLElement | null;
        below?.style.setProperty("--empty-lines", lines.dataset.lines ?? "0");
        lines.remove();
    });
    return page.innerHTML;
}

/** Turns a line of Markdown into clean HTML within a line. */
export function inlineHtmlOf(text: string): string {
    return DOMPurify.sanitize(markdown.parseInline(text, { async: false }));
}
