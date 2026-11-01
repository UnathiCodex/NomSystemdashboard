/**
 * ## Syntax
 *
 * The Obsidian syntax of my notes for CodeMirror's Markdown parser, by the rules of the scripts view.
 * - Formulas `$…$` and `$$…$$` as `InlineMath`, taken whole so `_`, `*` and `\` inside stay TeX.
 * - Wiki links as `WikiLink`, embeds as `WikiEmbed`.
 * - An HTML block ends on the line its tag closes, so Markdown right below it is read as Markdown.
 * - A still empty point right below a paragraph stays a point, never the line under a heading.
 */

import { markdown } from "@codemirror/lang-markdown";

import { codeLanguageOf } from "../notes/code.ts";
import { GFM } from "@lezer/markdown";
import { tags } from "@lezer/highlight";

import type { LanguageSupport } from "@codemirror/language";
import type { BlockContext, InlineContext, Line, MarkdownConfig } from "@lezer/markdown";

/** Formula `$$…$$` up to the next `$$`, a backslash keeps the next character. */
const mathDisplayRule: RegExp = /^\$\$(?:\\[\s\S]|[^\\])*?\$\$/;

/**
 * Formula `$…$` with no space inside its `$` and no digit after it, so `$5 and $6` stays text.
 * A backslash keeps the next character, so `\$` ends no formula.
 */
const mathInlineRule: RegExp = /^\$(?![ \t$])(?:\\[\s\S]|[^\\])+?(?<![ \t])\$(?!\d)/;

const wikiLinkRule: RegExp = /^!?\[\[[^\]]+\]\]/;

/** Start of an HTML block of a block tag, with the name of its tag. */
const htmlStartRule: RegExp = /^<(table|div|details|figure|center)\b/i;

const dollar: number = 36;
const bracket: number = 91;
const bang: number = 33;

function mathParse(cx: InlineContext, next: number, pos: number): number {
    if (next !== dollar) return -1;

    const rest: string = cx.slice(pos, cx.end);
    const match: RegExpExecArray | null = mathDisplayRule.exec(rest) ?? mathInlineRule.exec(rest);
    if (match === null) return -1;

    return cx.addElement(cx.elt("InlineMath", pos, pos + match[0].length));
}

function wikiLinkParse(cx: InlineContext, next: number, pos: number): number {
    if (next !== bracket && next !== bang) return -1;

    const match: RegExpExecArray | null = wikiLinkRule.exec(cx.slice(pos, cx.end));
    if (match === null) return -1;

    const name: string = next === bang ? "WikiEmbed" : "WikiLink";
    return cx.addElement(cx.elt(name, pos, pos + match[0].length));
}

/** An HTML block of a block tag, up to the line its tag closes or the line before an empty line. */
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

/** A still empty point, a `-`, `+`, `*` or number with nothing after it. */
const emptyPointRule: RegExp = /^(?:[-+*]|\d{1,9}[.)])[ \t]*$/;

/** Ends a paragraph before a still empty point, which Markdown would take into the paragraph. */
function emptyPointEnds(cx: BlockContext, line: Line): boolean {
    return emptyPointRule.test(line.text.slice(line.pos));
}

/**
 * The Obsidian syntax for CodeMirror's Markdown parser.
 * - `parseInline`: Wiki links before Markdown links, which would take their `[`.
 * - `parseBlock`: HTML blocks before Markdown's own, which would go on to the next empty line.
 */
const obsidianSyntax: MarkdownConfig = {
    defineNodes: ["InlineMath", { name: "WikiLink", style: tags.link }, { name: "WikiEmbed", style: tags.link }],
    parseInline: [
        { name: "InlineMath", parse: mathParse },
        { name: "WikiLink", parse: wikiLinkParse, before: "Link" },
    ],
    parseBlock: [
        { name: "ClosedHTMLBlock", parse: htmlBlockParse, before: "HTMLBlock" },
        { name: "EmptyPoint", parse: (): boolean => false, endLeaf: emptyPointEnds },
    ],
};

/**
 * Markdown as my notes are written, GitHub's Markdown with the Obsidian syntax, without its own keys.
 * A URL pasted over selected text makes it a link, as in Obsidian.
 */
export const markdownSupport: LanguageSupport = markdown({
    extensions: [GFM, obsidianSyntax],
    addKeymap: false,
    completeHTMLTags: false,
    codeLanguages: codeLanguageOf,
});
