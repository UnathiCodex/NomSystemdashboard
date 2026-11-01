/**
 * ## Math
 *
 * Renders formulas the way Obsidian 1.14 does, so they look the same:
 * MathJax 4.1 with the MathJax TeX font, output as HTML and CSS (CHTML),
 * the same TeX packages and settings.
 * The TeX packages and the whole font come as files from `node_modules`,
 * which Vite serves while it runs, so nothing comes from a CDN.
 */

/**
 * The calls of MathJax the scripts view uses, those Obsidian uses.
 * - `chtmlStylesheet`: Gives the stylesheet of MathJax, the same element each time,
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

/** Window with MathJax on it: first its settings, after loading MathJax itself. */
const global: { MathJax: object } = window as unknown as { MathJax: object };

/**
 * Settings of MathJax, those of Obsidian.
 * - `loader.paths`: Without `fonts` MathJax would load its fonts from the CDN jsDelivr.
 * - `output.font`: The MathJax TeX font, the font of MathJax 3,
 *   instead of the newer default.
 * - `output.linebreaks.inline`: Off, so a formula within a line never breaks inside,
 *   as in MathJax 3; it goes to the next line whole.
 * - `tex.inlineMath`, `tex.displayMath`:
 *   Empty, so MathJax searches the page for no formula itself;
 *   the Markdown reader finds them, see `markdown.ts`.
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
 * Renders the formulas in an element not yet rendered, then marks them `is-loaded`,
 * as Obsidian does. A formula MathJax cannot read keeps its TeX as text.
 * The stylesheet of MathJax goes into the page only once:
 * a stylesheet moved in the page is read again from its text
 * and loses the rules added later,
 * so the characters of every further note would lose their width and be cut away.
 */
export function mathRender(element: HTMLElement): void {
    element.querySelectorAll<HTMLElement>(".math:not(.is-loaded)").forEach((math: HTMLElement): void => {
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
