/**
 * ## Theme
 *
 * The colors of my code blocks, read from the theme of my editor, IntelliJ Dark,
 * `NomTechnicalsettings/EditorThemes/intellij-dark/themes/intellij-dark.json`,
 * so a color changed there, like strings blue instead of green, changes in the dashboard too.
 * The theme colors by kinds of words, TextMate scopes like `string` or `keyword.operator`,
 * for every language alike; each kind of `../src/notes/code.ts` takes the color of the scope
 * that stands for it, see {@link scopes}, as VS Code finds it: the rule whose scope
 * is the longest start of it, `string` for `string.quoted`.
 *
 * - `node:fs`: Reads the theme.
 * - `node:path`: Builds its path.
 * - `./sources.ts`: Names `NomWorkspace`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { vault } from "./sources.ts";

/**
 * A rule of the theme: the scopes it colors, one or several, and its color.
 */
type TokenColor = {
    scope?: string | string[];
    settings: { foreground?: string };
};

/**
 * The kinds of words of my code blocks, as their classes name them,
 * like `keyword` for `code-keyword`, each with the scope of the theme that stands for it,
 * see `codeHighlighter` in `../src/notes/code.ts`;
 * `text`, every other word, like the call of a function, takes the color of text of the theme.
 */
const scopes: { [kind: string]: string } = {
    keyword: "keyword.control",
    atom: "constant.language",
    bool: "constant.language",
    number: "constant.numeric",
    string: "string.quoted",
    string2: "string.regexp",
    comment: "comment.line",
    definition: "entity.name.function",
    builtin: "support.function.builtin.python",
    self: "variable.language.special.self.python",
    typeName: "entity.name.type",
    className: "entity.name.class",
    propertyName: "variable.other.property",
    operator: "keyword.operator",
    meta: "storage.type.annotation",
    tagName: "entity.name.tag",
    attributeName: "entity.other.attribute-name",
};

/**
 * Reads the colors of my code blocks from the theme, see the top of this file.
 * - `theme`: The theme, its colors of the editor and its rules.
 * - `colorOf`: Gives the color of a scope, of the rule with the longest start of it,
 *   `undefined` for none; a rule for a scope within another, like `meta.function-call string`,
 *   counts for no scope alone.
 *
 * @returns Color of each kind, like `{ "string": "#6aab73", … }`, none of a kind without one
 */
export function codeColorsRead(): { [kind: string]: string } {
    const theme: { colors: { [name: string]: string }; tokenColors: TokenColor[] } = JSON.parse(
        readFileSync(
            join(
                vault,
                "NomTechnicalsettings/EditorThemes/intellij-dark/themes/intellij-dark.json",
            ),
            "utf8",
        ),
    );
    const colorOf = (scope: string): string | undefined => {
        let color: string | undefined;
        let length: number = 0;
        for (const rule of theme.tokenColors)
            for (const start of [rule.scope ?? []].flat())
                if (
                    rule.settings.foreground !== undefined &&
                    start.length > length &&
                    (scope === start || scope.startsWith(`${start}.`))
                ) {
                    color = rule.settings.foreground;
                    length = start.length;
                }
        return color;
    };
    const colors: { [kind: string]: string } = { text: theme.colors["editor.foreground"] };
    for (const [kind, scope] of Object.entries(scopes)) {
        const color: string | undefined = colorOf(scope);
        if (color !== undefined) colors[kind] = color;
    }
    return colors;
}
