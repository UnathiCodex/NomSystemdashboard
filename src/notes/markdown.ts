/**
 * ## Markdown
 *
 * Turns the Markdown of a note into HTML as Obsidian reads it,
 * with the Obsidian syntax my notes use:
 * - formulas `$…$` and `$$…$$`, taken whole before any other Markdown,
 *   so `_`, `*` and `\` inside stay TeX, while `$` inside code stays text;
 *   as in Obsidian, `$$…$$` within a line stands on a line of its own;
 * - callouts, their lines without `>` read by the same rules as the rest of the note;
 * - wiki links and embeds, images only in Markdown's form;
 * - a single line break as a break, as with Obsidian's strict line breaks off;
 * - a lazy line as part of its list item, as CommonMark reads it;
 * - an HTML block ending on the line its tag closes, as in Obsidian's editor,
 *   so Markdown right below it is read as Markdown;
 * - `|` inside `[[…]]` on a table row as part of the link, not as the end of a cell.
 * Beyond Obsidian, the block under each heading `##` folds by a click on its heading,
 * and the section under a heading `#### Solution…` comes folded,
 * so I try a task before I see its solution.
 * Also beyond Obsidian, every empty line between two blocks stays one line high,
 * as the editor shows it, see {@link emptyLinesMade}.
 * Links keep their link as written in `data-link` and `data-heading`,
 * for the scripts view to resolve; formulas keep their TeX for `math.ts` to render.
 * The HTML comes cleaned of scripts, as in Obsidian,
 * because some notes in my modules come from the internet.
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

/**
 * Formula on lines of its own, as Obsidian reads it:
 * a line starting with `$$` and no other `$`,
 * up to a line ending with `$$` and no `$` before; the TeX between.
 */
const mathBlockRule: RegExp = /^ {0,3}\$\$([^$\n]*\n(?:.*\n)*?[^$\n]*)\$\$[ \t]*(?:\n|$)/;

/**
 * Formula `$$…$$` within a line, as Obsidian reads it:
 * up to the next `$$`, with spaces and one line break after it,
 * since it stands on a line of its own anyway. A backslash keeps the next character.
 */
const mathDisplayRule: RegExp = /^\$\$((?:\\[\s\S]|[^\\])*?)\$\$(?:[^\S\n]*\n)?/;

/**
 * Formula `$…$`, as Obsidian reads it:
 * no space or tab after the opening `$`,
 * none before the closing `$` and no digit after it,
 * so `$5 and $6` stays text.
 * A backslash keeps the next character, so `\$` ends no formula.
 */
const mathInlineRule: RegExp = /^\$(?![ \t$])((?:\\[\s\S]|[^\\])+?)(?<![ \t])\$(?!\d)/;

/**
 * Punctuation right after a formula `$…$`,
 * like the `,` of `$x_1$, $x_2$`, which stays on its line:
 * a formula never breaks, so a break before the punctuation would leave it alone
 * at the start of the next line.
 */
export const punctuationRule: RegExp = /^[.,;:!?)]+/;

/** Callout: a quote whose first line is `> [!type] Title`, `-` or `+` for folding. */
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

/**
 * Front matter of a note, between `---` lines at its start;
 * Obsidian shows it as properties, the view leaves it out.
 */
const frontMatterRule: RegExp = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** Row of a table, also inside a quote. */
const tableRowRule: RegExp = /^[ \t>]*\|.*$/gm;

/** List item at the start of a line: its indentation, its marker and the spaces after. */
const listItemRule: RegExp = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)/;

/**
 * Line that begins a block of its own, so it never goes on with the text above it:
 * a heading, quote, fence, table row, HTML or rule.
 * A line with `$$` goes on with it, so a formula stays whole.
 */
const blockStartRule: RegExp = /^[ \t]*(?:#{1,6}(?:[ \t]|$)|>|```|~~~|\||<|(?:[-*_][ \t]*){3,}$)/;

/** Text of a heading that opens a solution, like `Solution (own, unchecked)`. */
const solutionRule: RegExp = /^Solution\b/;

/** Address with a scheme: a link out of the module, opened as it is. */
const externalRule: RegExp = /^[a-z][a-z\d+.-]*:/i;

/** Escapes text for HTML, also inside attributes in `"…"`. */
function escaped(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Splits a link at its first `#` into the link to a file and the heading in it,
 * the file empty for the note itself.
 */
function linkPartsOf(address: string): [string, string] {
    const hash: number = address.indexOf("#");
    return hash === -1 ? [address.trim(), ""] : [address.slice(0, hash).trim(), address.slice(hash + 1).trim()];
}

/**
 * Counts the empty lines at the end of Markdown:
 * the line breaks after its last text, less the one that ends its last line;
 * a line of spaces or tabs counts as empty.
 */
function emptyLinesAtEndOf(markdown: string): number {
    const end: string = /[ \t\n]*$/.exec(markdown)?.[0] ?? "";
    return Math.max((end.match(/\n/g) ?? []).length - 1, 0);
}

/**
 * Indents each lazy line of a list as the text of the line above it,
 * so marked reads it as CommonMark does.
 * A lazy line goes on with the text of a list item without being indented,
 * like the spacer `⠀` under a sub-bullet.
 * marked would end the whole list at a lazy line whose line above lies 4 columns
 * or more deeper than its item, and every step after it would turn into plain text.
 * Lines inside a formula `$$…$$` over several lines are TeX,
 * so a row like `- & 1 & 2` starts no list.
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
 * Prepares a note for marked:
 * without its front matter, with every `|` inside `[[…]]` on a table row written `\|`,
 * as Obsidian asks for in tables, so marked keeps the link in one cell,
 * and with its lazy lines indented, see {@link lazyLinesIndented}.
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
 * so an emphasis never ends inside them, like at the `*` of `$x^*$`;
 * each becomes as many `a` as it is long.
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

/**
 * Formula on lines of its own, see {@link mathBlockRule};
 * may interrupt a paragraph, as in Obsidian.
 * Renders as `<div class="math math-block">` with its TeX, as in Obsidian.
 */
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

/**
 * Formula within a line, `$$…$$` or `$…$`,
 * see {@link mathDisplayRule} and {@link mathInlineRule}.
 * A formula `$…$` with punctuation right after it, see {@link punctuationRule},
 * goes together with it in `<span class="math-unbroken">`,
 * which `notes.css` keeps on one line.
 */
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
 * Callout, see {@link calloutRule};
 * its title as the type with a capital when it has none.
 * The title stands inside `callout-title-inner`, as in Obsidian,
 * so it stays one piece of text between the icon and the fold arrow.
 * - {@link Lexer#blockTokens}: Reads the lines of the quote as Markdown of their own,
 *   lazy lines included; a tab right after `>` stays as indentation.
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
 * Wiki link or embed, see {@link wikiLinkRule}; `\|` counts as `|`.
 * A link shows its text, else its target and heading like `Note > Heading`.
 * An embedded note renders as an empty `<div class="markdown-embed">`,
 * which the scripts view fills;
 * any other file as a link, an image too, which is written in Markdown's form.
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

/**
 * Empty lines between two blocks, see {@link emptyLinesMade},
 * their number in `data-lines`, which {@link htmlOf} gives to the block below them.
 */
const emptyLines: TokenizerAndRendererExtension = {
    name: "emptyLines",
    renderer: (token: Tokens.Generic): string => `<div class="empty-lines" data-lines="${token.lines}"></div>`,
};

/**
 * Section under a heading that folds, see {@link foldsMade},
 * with the heading as its `<summary>`, the one place to click to fold it.
 */
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
 * Keeps the empty lines between two blocks,
 * which marked reads as a block `space` and draws as nothing:
 * each `space` between two blocks becomes one {@link emptyLines},
 * counted from the end of the block above,
 * since marked keeps the line break that ends a block's last line sometimes in the block
 * and sometimes in the `space`.
 * The same inside quotes, callouts and list items, and between two list items,
 * whose empty lines marked keeps at the end of the item above, so they go there.
 * Empty lines before the first or after the last block stand between no blocks and go.
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

/**
 * Folds each section under a heading of a level,
 * up to the next heading of the same or a higher level, into one {@link fold},
 * when the heading's text says so.
 */
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

/**
 * Folds the sections of a note: first each under a heading `#### Solution…`, closed,
 * then each under a heading `##`, open, its solutions inside.
 */
function foldsMade(tokens: Token[] | TokensList): Token[] | TokensList {
    sectionsFolded(tokens, 4, (text: string): boolean => solutionRule.test(text), false);
    return sectionsFolded(tokens, 2, (): boolean => true, true);
}

/**
 * Changes the blocks of a note once they are read: keeps their empty lines,
 * then folds their sections,
 * so the empty lines below a section stand at the end of its fold.
 */
function blocksMade(tokens: Token[] | TokensList): Token[] | TokensList {
    return foldsMade(emptyLinesMade(tokens));
}

/** Heading with its text as written in `data-heading`, so `[[Note#Heading]]` finds it. */
function headingOf(this: Renderer, token: Tokens.Heading): string {
    return (
        `<h${token.depth} data-heading="${escaped(token.text)}">` +
        `${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`
    );
}

/**
 * Markdown link: inside the module an `internal-link` like a wiki link,
 * outside, `false` for marked's own.
 */
function linkOf(this: Renderer, token: Tokens.Link): string | false {
    if (externalRule.test(token.href)) return false;

    const [target, heading]: [string, string] = linkPartsOf(token.href);
    return (
        `<a class="internal-link" data-link="${escaped(target)}" ` +
        `data-heading="${escaped(heading)}">` +
        `${this.parser.parseInline(token.tokens)}</a>`
    );
}

/**
 * Code block of a language of my list in the colors of my theme, see `./code.ts`,
 * `false` for marked's own.
 */
function codeOf(token: Tokens.Code): string | false {
    const html: string | null = codeHtmlOf(token.text, token.lang ?? "");
    return html === null
        ? false
        : `<pre><code class="language-${escaped(token.lang ?? "")}">` + `${html}</code></pre>\n`;
}

/**
 * Markdown image: inside the module with its link in `data-link`,
 * outside, `false` for marked's own.
 */
function imageOf(this: Renderer, token: Tokens.Image): string | false {
    return externalRule.test(token.href)
        ? false
        : `<img data-link="${escaped(token.href)}" alt="${escaped(token.text)}">`;
}

/**
 * HTML block that ends on the line where its tag closes, see {@link htmlBlockRule},
 * `false` for marked's own, which ends at the next empty line.
 */
function htmlBlockOf(src: string): Tokens.HTML | false {
    const match: RegExpExecArray | null = htmlBlockRule.exec(src);
    return match === null ? false : { type: "html", block: true, pre: false, raw: match[0], text: match[0] };
}

/** Markdown reader with Obsidian's syntax, see the top of this file. */
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
 * Turns the Markdown of a note into clean HTML, see the top of this file.
 * The block below empty lines gets their number in `--empty-lines`,
 * which `notes.css` turns into room above it, so the room comes and goes with the block,
 * like a step of a solution shown one at a time.
 * Empty lines at the end of a list item or of a section stand above the next one,
 * so they go to the element after the first element around them that has one.
 * - `page`: A `<template>`, which shows and loads nothing of the HTML, like an image.
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

/**
 * Turns a line of Markdown into clean HTML within a line,
 * like the text of a heading for the outline.
 */
export function inlineHtmlOf(text: string): string {
    return DOMPurify.sanitize(markdown.parseInline(text, { async: false }));
}
