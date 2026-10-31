/**
 * ## Wraps
 *
 * Prints every line of a Markdown file that does not fit on one line of my editor,
 * for the writers of my documents and their checks, see §6.1 of
 * `.claude/skills/learn/3-chapter-write/document-style.md` in `NomWorkspace`:
 * `node ~/NomWorkspace/NomSystemdashboard/reader/wraps.ts <file.md> …`,
 * also for a draft outside my modules, like `/var/tmp/01_06_TwoSampleTests.md`,
 * while the reader runs, see `reader.ts`.
 * Chromium without a window draws the file in the editor of the page,
 * with its own look, see `src/editor/preview.ts`, as my laptop shows it:
 * a page 1600 px wide, the text column `--reading-width` 1000 px of it, see `src/variants.css`;
 * a wider page, like that of my desktop, grows as a whole, so its lines break at the same words.
 * Every line shows, rendered as while I do not edit it, the solutions and the hidden blocks too;
 * the heading of an Example or a Task keeps the room of its check and cross free,
 * as in the round of a section, see `.task-heading` in `src/editor/editor.css`.
 * A line counts once its text goes on below, a line of a code block too,
 * or once it is wider than the column, like a long formula on its own line;
 * a table is left out, since its rows may be wider.
 * Each such line comes as `<file>:<number>: <what>: <line>`, like
 * ``01_02_SampleMeanEstimator.md:17: 2 lines, 1 character too long: - `import numpy as np` …``,
 * the characters guessed at half the size of the text each;
 * a file whose lines all fit gets one line that says so.
 * The command ends with 1 while a line does not fit,
 * with 2 when the reader does not answer with its editor, like when its page fails to load it.
 * The page asks the reader for nothing but itself: every request to its API is refused,
 * so nothing is written.
 *
 * - `node:fs`: Reads the file.
 * - `node:path`: Names the file from `NomWorkspace`, from where its links lead.
 * - `playwright`: Chromium without a window, which draws the editor.
 * - `./sources.ts`: Names `NomWorkspace`.
 */

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { chromium } from "playwright";
import { vault } from "./sources.ts";

import type { Browser, Page, Route } from "playwright";

/**
 * A line of a file that does not fit on one line of the editor.
 *
 * - `line`: Its number in the file, from 1.
 * - `rows`: How many lines of the page it takes, 1 for one that is only too wide.
 * - `over`: How many pixels its text is wider than the column on one line,
 *   0 where not known, like for a line of a code block.
 * - `characters`: About how many characters that is.
 */
type Misfit = {
    line: number;
    rows: number;
    over: number;
    characters: number;
};

/**
 * A file to draw, as the page takes it.
 *
 * - `text`: Its text.
 * - `place`: Its path in `NomWorkspace`, from which its relative links lead.
 */
type Drawn = {
    text: string;
    place: string;
};

/**
 * The editor of the page, which the reader serves.
 */
const address: string = "http://127.0.0.1:3000/scripts";

/**
 * Draws a file in the editor of the page and finds its lines that do not fit, in the browser,
 * see the top of this file:
 * takes CodeMirror and the look of the editor at the very addresses the editor imports them,
 * so they are its own, reads the whole file as Markdown at once, which CodeMirror otherwise does
 * bit by bit in the background, showing the lines not read yet as their plain text,
 * then scrolls through the file, since the editor draws only what is in sight,
 * and measures each line drawn: a line of text as it stands and again kept on one line,
 * which tells how many lines it takes and how much wider it is than the column;
 * a line of a code block by the lines of the page its text stands on;
 * a line measured again, as it stays in sight while scrolling, counts as last measured.
 * - `imports`: The addresses the script of the editor imports from, as the page loaded it.
 * - `urlOf`: The address the editor imports a script from, by a part of it.
 * - `heading`: Heading of an Example or a Task, see `taskHeading` in `skill.ts`.
 * - `start`: The text as CodeMirror holds it, for the lines of those headings.
 * - `judged`: The lines of those headings with the room of their check and cross.
 * - `editor`: The editor.
 * - `found`: The lines that do not fit, by their number.
 * - `fences`: Number of the first line of every code block of the file, its ```.
 * - `lineMeasure`: Measures a line of text.
 * - `rowsOf`: Counts the lines of the page a piece of the text of an element stands on.
 * - `codeMeasure`: Measures the lines of each code block drawn.
 * - `scroller`: What scrolls the file.
 *
 * @param file - The file
 * @returns The lines that do not fit, in their order
 */
async function misfitsDraw(file: Drawn): Promise<Misfit[]> {
    const imports: string[] = [
        ...(await (await fetch("/src/editor/editor.ts")).text()).matchAll(
            /\bfrom\s*["']([^"']+)["']/g,
        ),
    ].map((match: RegExpExecArray): string => match[1]);
    const urlOf: (part: string) => string = (part: string): string =>
        imports.find((url: string): boolean => url.includes(part)) ?? part;
    const { Decoration, EditorView }: typeof import("@codemirror/view") = await import(
        urlOf("/@codemirror_view.js")
    );
    const { EditorState }: typeof import("@codemirror/state") = await import(
        urlOf("/@codemirror_state.js")
    );
    const { livePreview }: typeof import("../src/editor/preview.ts") = await import(
        urlOf("/src/editor/preview.ts")
    );
    const { markdownSupport }: typeof import("../src/editor/syntax.ts") = await import(
        urlOf("/src/editor/syntax.ts")
    );
    const { forceParsing }: typeof import("@codemirror/language") = await import(
        urlOf("/@codemirror_language.js")
    );
    const heading: RegExp = /^## (Example|Completion|Task)\.[ \t]+/;
    const start: import("@codemirror/state").EditorState = EditorState.create({
        doc: file.text,
    });
    const judged: import("@codemirror/state").Range<
        import("@codemirror/view").Decoration
    >[] = [];
    for (let number: number = 1; number <= start.doc.lines; number++)
        if (heading.test(start.doc.line(number).text))
            judged.push(
                Decoration.line({ class: "task-heading" }).range(
                    start.doc.line(number).from,
                ),
            );
    const editor: import("@codemirror/view").EditorView = new EditorView({
        parent: document.getElementById("editor-text") as HTMLElement,
        state: EditorState.create({
            doc: file.text,
            extensions: [
                markdownSupport,
                EditorView.lineWrapping,
                livePreview({}, file.place),
                EditorView.decorations.of(Decoration.set(judged)),
            ],
        }),
    });
    forceParsing(editor, editor.state.doc.length, 10000);
    const found: Map<number, Misfit> = new Map();
    const fences: number[] = [];
    let open: boolean = false;
    file.text.split(/\r?\n/).forEach((text: string, index: number): void => {
        if (!/^\s*```/.test(text)) return;
        if (!open) fences.push(index + 1);
        open = !open;
    });

    const lineMeasure: (line: HTMLElement) => void = (line: HTMLElement): void => {
        if (line.textContent === "" && line.querySelector("img, mjx-container") === null)
            return;
        const range: Range = document.createRange();
        const style: CSSStyleDeclaration = getComputedStyle(line);
        const box: DOMRect = line.getBoundingClientRect();
        const end: number = box.right - parseFloat(style.paddingRight);
        range.selectNodeContents(line);
        const wide: number = range.getBoundingClientRect().right - end;
        line.style.whiteSpace = "pre";
        const single: number = line.getBoundingClientRect().height;
        const over: number = range.getBoundingClientRect().right - end;
        line.style.whiteSpace = "";
        const rows: number =
            1 +
            Math.max(0, Math.round((box.height - single) / parseFloat(style.lineHeight)));
        const number: number = editor.state.doc.lineAt(editor.posAtDOM(line)).number;
        if (rows === 1 && wide <= 1) {
            found.delete(number);
            return;
        }
        found.set(number, {
            line: number,
            rows: rows,
            over: Math.round(over),
            characters: Math.ceil(over / (parseFloat(style.fontSize) / 2)),
        });
    };
    const rowsOf: (element: HTMLElement, from: number, to: number) => number = (
        element: HTMLElement,
        from: number,
        to: number,
    ): number => {
        const range: Range = document.createRange();
        const walker: TreeWalker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
        );
        let offset: number = 0;
        for (
            let node: Node | null = walker.nextNode();
            node !== null;
            node = walker.nextNode()
        ) {
            const length: number = node.textContent?.length ?? 0;
            if (from >= offset && from <= offset + length)
                range.setStart(node, from - offset);
            if (to >= offset && to <= offset + length) {
                range.setEnd(node, to - offset);
                break;
            }
            offset += length;
        }
        return new Set(
            [...range.getClientRects()]
                .filter((rect: DOMRect): boolean => rect.width > 0)
                .map((rect: DOMRect): number => Math.round(rect.top)),
        ).size;
    };
    const codeMeasure: () => void = (): void => {
        const blocks: Map<number, number> = new Map();
        editor.contentDOM
            .querySelectorAll<HTMLElement>("pre")
            .forEach((pre: HTMLElement): void => {
                const first: number = editor.state.doc.lineAt(
                    editor.posAtDOM(pre),
                ).number;
                const index: number = blocks.get(first) ?? 0;
                const fence: number | undefined = fences.filter(
                    (line: number): boolean => line >= first,
                )[index];
                blocks.set(first, index + 1);
                if (fence === undefined) return;
                let from: number = 0;
                (pre.textContent ?? "")
                    .split("\n")
                    .forEach((code: string, line: number): void => {
                        const rows: number = rowsOf(pre, from, from + code.length);
                        from += code.length + 1;
                        if (rows <= 1) found.delete(fence + 1 + line);
                        else
                            found.set(fence + 1 + line, {
                                line: fence + 1 + line,
                                rows: rows,
                                over: 0,
                                characters: 0,
                            });
                    });
            });
    };

    const scroller: HTMLElement = document.querySelector(".editor-file") as HTMLElement;
    for (let top: number = 0; ; top += scroller.clientHeight / 2) {
        scroller.scrollTop = top;
        for (let frame: number = 0; frame < 3; frame++)
            await new Promise((drawn: (time: number) => void): number =>
                requestAnimationFrame(drawn),
            );
        await document.fonts.ready;
        editor.contentDOM.querySelectorAll<HTMLElement>(".cm-line").forEach(lineMeasure);
        codeMeasure();
        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1)
            break;
    }
    editor.destroy();
    return [...found.values()].sort(
        (first: Misfit, second: Misfit): number => first.line - second.line,
    );
}

/**
 * Writes what of a line does not fit, see the top of this file,
 * like `2 lines, 3 characters too long` or `40 px too wide`.
 *
 * @param misfit - The line
 * @returns What does not fit
 */
function whatOf(misfit: Misfit): string {
    if (misfit.rows === 1) return `${misfit.over} px too wide`;
    if (misfit.over <= 0) return `${misfit.rows} lines`;
    return `${misfit.rows} lines, ${misfit.characters} character${misfit.characters === 1 ? "" : "s"} too long`;
}

/**
 * Prints the lines of each file named after the command that do not fit, see the top of this file.
 * - `files`: The files, as named.
 * - `browser`, `page`: Chromium and the page of the editor.
 * - `misfitting`: Whether a line of any file does not fit.
 * - `text`, `lines`: Text and lines of a file.
 * - `misfits`: Its lines that do not fit.
 */
async function wrapsPrint(): Promise<void> {
    const files: string[] = process.argv.slice(2);
    if (files.length === 0) {
        console.log("Name the Markdown files: node reader/wraps.ts <file.md> …");
        process.exitCode = 2;
        return;
    }
    const browser: Browser = await chromium.launch();
    const page: Page = await browser.newPage({
        viewport: { width: 1600, height: 900 },
        deviceScaleFactor: 1.2,
    });
    await page.route("**/api/**", (route: Route): Promise<void> => route.abort());
    try {
        await page.goto(address, { waitUntil: "networkidle" });
        await page.waitForSelector(".editor-file", { state: "attached" });
    } catch {
        console.log(
            `The reader does not answer at ${address} with its editor, see reader.ts`,
        );
        process.exitCode = 2;
        await browser.close();
        return;
    }
    let misfitting: boolean = false;
    for (const file of files) {
        const text: string = readFileSync(file, "utf8");
        const lines: string[] = text.split(/\r?\n/);
        const misfits: Misfit[] = await page.evaluate(misfitsDraw, {
            text: text,
            place: relative(vault, resolve(file)),
        });
        misfits.forEach((misfit: Misfit): void => {
            console.log(
                `${file}:${misfit.line}: ${whatOf(misfit)}: ${lines[misfit.line - 1].trim()}`,
            );
        });
        if (misfits.length === 0) console.log(`${file}: every line fits`);
        misfitting ||= misfits.length > 0;
    }
    await browser.close();
    process.exitCode = misfitting ? 1 : 0;
}

await wrapsPrint();
