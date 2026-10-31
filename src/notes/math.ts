/**
 * ## Math
 *
 * Renders formulas the way Obsidian 1.14 does, so they look the same:
 * MathJax 4.1 with the MathJax TeX font, output as HTML and CSS (CHTML),
 * the same TeX packages and settings,
 * one call of `MathJax.tex2chtml` per formula
 * and the stylesheet of the used characters after.
 * MathJax loads when the scripts view opens and puts itself onto `window` as `MathJax`;
 * the TeX packages and the whole font come as files from `node_modules`,
 * which Vite serves while it runs, as it serves Noto Sans, so nothing comes from a CDN.
 *
 * - `@mathjax/mathjax-tex-font/tex-mml-chtml-mathjax-tex.js`:
 *   MathJax with TeX input, CHTML output and the TeX font.
 */

/**
 * The calls of MathJax the scripts view uses, those Obsidian uses.
 *
 * - `startup.promise`: Settles when MathJax and its packages are loaded.
 * - `startup.document.options`: Options of the page MathJax renders for.
 * - `tex2chtml`: Turns TeX into HTML, `display` for a formula on its own line.
 * - `chtmlStylesheet`: Gives the stylesheet of MathJax, the same element each time:
 *   the first time with the rules of the characters used so far as its text,
 *   later with the rules of the new characters added into it.
 */
type MathJaxApi = {
    startup: { promise: Promise<void>; document: { options: object } };
    tex2chtml: (tex: string, options: { display: boolean }) => HTMLElement;
    chtmlStylesheet: () => HTMLStyleElement;
};

/**
 * TeX packages Obsidian 1.14 adds to those MathJax has anyway,
 * without `mhchem` for chemistry,
 * which needs a font extension of its own and is not used in my notes.
 */
const packages: string[] = [
    "action",
    "amscd",
    "bbox",
    "boldsymbol",
    "braket",
    "bussproofs",
    "cancel",
    "cases",
    "centernot",
    "color",
    "colortbl",
    "empheq",
    "enclose",
    "extpfeil",
    "gensymb",
    "html",
    "mathtools",
    "noerrors",
    "tagformat",
    "textcomp",
    "unicode",
    "upgreek",
    "verb",
];

/**
 * Window with MathJax on it: first its settings, after loading MathJax itself.
 */
const global: { MathJax: object } = window as unknown as { MathJax: object };

/**
 * Settings of MathJax, those of Obsidian.
 * - `loader.paths`: Folders of MathJax and of its fonts, served by Vite;
 *   MathJax finds its TeX font there in `mathjax-tex-font`,
 *   and without `fonts` it would load its fonts from the CDN jsDelivr.
 * - `loader.load`: Loads the extra TeX packages before the first formula,
 *   as Obsidian has them built in.
 * - `output.font`: The MathJax TeX font, the font of MathJax 3,
 *   instead of the newer default.
 * - `output.linebreaks.inline`: Off, so a formula within a line never breaks inside,
 *   like before its `=`, as in MathJax 3; it goes to the next line whole.
 * - `tex.macros`: Lets `\usepackage{…}`
 *   and `\RequirePackage{…}` load a package, as in Obsidian.
 * - `tex.inlineMath`, `tex.displayMath`:
 *   Empty, so MathJax searches the page for no formula itself;
 *   the Markdown reader finds them, see `markdown.ts`.
 * - `startup.typeset`: Renders nothing at the start.
 * - `options`: No menu on a right click, no speech and no exploring, as in Obsidian.
 */
global.MathJax = {
    loader: {
        paths: { mathjax: "/node_modules/mathjax", fonts: "/node_modules/@mathjax" },
        load: packages.map((name: string): string => `[tex]/${name}`),
    },
    output: { font: "mathjax-tex", linebreaks: { inline: false } },
    tex: {
        packages: { "[+]": packages },
        macros: {
            RequirePackage: ["\\require{#1}", 1],
            usepackage: ["\\require{#1}", 1],
        },
        inlineMath: [],
        displayMath: [],
        processEscapes: false,
        processEnvironments: false,
        processRefs: false,
    },
    startup: { typeset: false },
    options: { enableMenu: false, enableEnrichment: false, enableExplorer: false },
};

// @ts-expect-error: MathJax comes without types;
// it puts itself onto window, typed by MathJaxApi
await import("@mathjax/mathjax-tex-font/tex-mml-chtml-mathjax-tex.js");
const mathJax: MathJaxApi = global.MathJax as MathJaxApi;
await mathJax.startup.promise;

/**
 * The same options again:
 * the menu of MathJax puts its own defaults over them when it starts,
 * among them speech, which would start a worker for screen readers;
 * Obsidian sets them again the same way.
 */
Object.assign(mathJax.startup.document.options, {
    enableMenu: false,
    enableEnrichment: false,
    enableExplorer: false,
});

/**
 * Renders the formulas in an element not yet rendered,
 * each an element of the class `math` with its TeX as text:
 * `math-inline` within the line, `math-block` on a line of its own,
 * then marks it `is-loaded`, as Obsidian does.
 * A formula MathJax cannot read keeps its TeX as text.
 * Then adds the rules of the new characters to the stylesheet of MathJax,
 * which goes into the page only once:
 * a stylesheet moved in the page is read again from its text
 * and loses the rules added later,
 * so the characters of every further note would lose their width and be cut away.
 * - {@link Node#isConnected}: Tells whether the element is in the page already.
 *
 * @param element - Element with formulas, like a rendered note
 */
export function mathRender(element: HTMLElement): void {
    element
        .querySelectorAll<HTMLElement>(".math:not(.is-loaded)")
        .forEach((math: HTMLElement): void => {
            try {
                math.replaceChildren(
                    mathJax.tex2chtml(math.textContent, {
                        display: math.classList.contains("math-block"),
                    }),
                );
            } catch (error: unknown) {
                console.error(error);
            }
            math.classList.add("is-loaded");
        });
    const styles: HTMLStyleElement = mathJax.chtmlStylesheet();
    if (!styles.isConnected) document.head.append(styles);
}
