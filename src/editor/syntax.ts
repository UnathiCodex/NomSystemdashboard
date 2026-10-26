/**
 * ## Syntax
 *
 * Teaches CodeMirror's Markdown parser the Obsidian syntax of my notes,
 * by the rules of the scripts view in `../notes/markdown.ts`,
 * so the editor finds the same formulas, links and HTML blocks as the scripts view:
 * - formulas `$…$` and `$$…$$` within a paragraph, also over several lines, as `InlineMath`;
 *   taken whole, so `_`, `*` and `\` inside stay TeX, while `$` inside code stays text;
 * - wiki links `[[Note#Heading|Text]]` as `WikiLink`, embeds `![[Image.svg|300]]` as `WikiEmbed`;
 * - an HTML block like `<table>` ending on the line its tag closes, as in Obsidian's editor,
 *   so Markdown right below it is read as Markdown.
 * The parser places each of them in the text, from where to where, for the live preview to draw.
 * Gives the Markdown of every editor of mine with it, see {@link markdownSupport}.
 *
 * - `@codemirror/lang-markdown`: Reads a text as Markdown in CodeMirror.
 * - `@lezer/markdown`: CodeMirror's Markdown parser, extended here, with GitHub's tables,
 *   task lists and strikethrough.
 * - `@lezer/highlight`: Tags wiki links as links, for their look.
 * - `../notes/code.ts`: The languages of my code blocks, read within them.
 */

import { markdown } from "@codemirror/lang-markdown";

import { codeLanguageOf } from "../notes/code.ts";
import { GFM } from "@lezer/markdown";
import { tags } from "@lezer/highlight";

import type { LanguageSupport } from "@codemirror/language";
import type { BlockContext, InlineContext, Line, MarkdownConfig } from "@lezer/markdown";

/**
 * Formula `$$…$$` within a line, as the scripts view reads it: up to the next `$$`.
 * A backslash keeps the next character.
 */
const mathDisplayRule: RegExp = /^\$\$(?:\\[\s\S]|[^\\])*?\$\$/;

/**
 * Formula `$…$`, as the scripts view reads it:
 * no space or tab after the opening `$`, none before the closing `$` and no digit after it,
 * so `$5 and $6` stays text. A backslash keeps the next character, so `\$` ends no formula.
 */
const mathInlineRule: RegExp = /^\$(?![ \t$])(?:\\[\s\S]|[^\\])+?(?<![ \t])\$(?!\d)/;

/**
 * Wiki link `[[Note#Heading|Text]]` or embed `![[Image.svg|300]]`, as the scripts view reads it.
 */
const wikiLinkRule: RegExp = /^!?\[\[[^\]]+\]\]/;

/**
 * Start of an HTML block of a block tag, like `<table style="…">`, with the name of its tag.
 */
const htmlStartRule: RegExp = /^<(table|div|details|figure|center)\b/i;

/**
 * Character code of `$`.
 */
const dollar: number = 36;

/**
 * Character code of `[`.
 */
const bracket: number = 91;

/**
 * Character code of `!`.
 */
const bang: number = 33;

/**
 * Finds a formula at a `$`, see {@link mathDisplayRule} and {@link mathInlineRule}.
 *
 * @param cx - Paragraph or other inline text being read
 * @param next - Character code at the position
 * @param pos - Position in the note
 * @returns End of the formula, or `-1` when none starts here
 */
function mathParse(cx: InlineContext, next: number, pos: number): number {
    if (next !== dollar) return -1;

    const rest: string = cx.slice(pos, cx.end);
    const match: RegExpExecArray | null = mathDisplayRule.exec(rest) ?? mathInlineRule.exec(rest);
    if (match === null) return -1;

    return cx.addElement(cx.elt("InlineMath", pos, pos + match[0].length));
}

/**
 * Finds a wiki link at a `[`, or an embed at a `!`, see {@link wikiLinkRule}.
 *
 * @param cx - Paragraph or other inline text being read
 * @param next - Character code at the position
 * @param pos - Position in the note
 * @returns End of the link, or `-1` when none starts here
 */
function wikiLinkParse(cx: InlineContext, next: number, pos: number): number {
    if (next !== bracket && next !== bang) return -1;

    const match: RegExpExecArray | null = wikiLinkRule.exec(cx.slice(pos, cx.end));
    if (match === null) return -1;

    const name: string = next === bang ? "WikiEmbed" : "WikiLink";
    return cx.addElement(cx.elt(name, pos, pos + match[0].length));
}

/**
 * Finds an HTML block of a block tag,
 * see {@link htmlStartRule}, up to the line where its tag closes,
 * or up to the line before an empty line, as Markdown ends an HTML block.
 * - {@link BlockContext#peekLine}: Gives the text of the next line without moving to it.
 *
 * @param cx - Note being read, at the start of a line
 * @param line - The line
 * @returns Whether an HTML block starts here, read to its end
 */
function htmlBlockParse(cx: BlockContext, line: Line): boolean {
    const start: RegExpExecArray | null = htmlStartRule.exec(line.text.slice(line.pos));
    if (start === null) return false;

    const tag: string = start[1];
    const closing: RegExp = new RegExp(`</${tag}>`, "i");
    const from: number = cx.lineStart + line.pos;
    while (!closing.test(line.text) && cx.peekLine().trim() !== "") cx.nextLine();
    const to: number = cx.lineStart + line.text.length;
    cx.nextLine();
    cx.addElement(cx.elt("HTMLBlock", from, to));
    return true;
}

/**
 * The Obsidian syntax for CodeMirror's Markdown parser, see the top of this file.
 * - `defineNodes`: The new pieces of syntax, wiki links and embeds tagged as links.
 * - `parseInline`: Wiki links read before Markdown links and images, which would take their `[`.
 * - `parseBlock`: HTML blocks of block tags read before Markdown's own,
 *   which would go on to the next empty line.
 */
const obsidianSyntax: MarkdownConfig = {
    defineNodes: [
        "InlineMath",
        { name: "WikiLink", style: tags.link },
        { name: "WikiEmbed", style: tags.link },
    ],
    parseInline: [
        { name: "InlineMath", parse: mathParse },
        { name: "WikiLink", parse: wikiLinkParse, before: "Link" },
    ],
    parseBlock: [{ name: "ClosedHTMLBlock", parse: htmlBlockParse, before: "HTMLBlock" }],
};

/**
 * Markdown as my notes are written:
 * CommonMark with GitHub's tables, task lists, strikethrough and links,
 * and the Obsidian syntax of this file;
 * a URL pasted over selected text makes it a link, as in Obsidian.
 * Its keys are those of `./keys.ts`, and it completes no HTML tags;
 * a code block of a language of my list is read in it, see `../notes/code.ts`.
 * The editor of my files takes it, see `./editor.ts`,
 * and so do my gratitude and my points about the day, see `../day/points.ts`.
 */
export const markdownSupport: LanguageSupport = markdown({
    extensions: [GFM, obsidianSyntax],
    addKeymap: false,
    completeHTMLTags: false,
    codeLanguages: codeLanguageOf,
});
