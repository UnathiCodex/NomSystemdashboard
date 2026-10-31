/**
 * ## Theme
 *
 * The colors of my code blocks, read from the theme of my editor, IntelliJ Dark,
 * so a color changed there changes in the dashboard too.
 * The theme colors by TextMate scopes, for every language alike.
 * Each kind of `../src/notes/code.ts` takes the color of the scope that stands for it,
 * as VS Code finds it: the rule whose scope is the longest start of it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { vault } from "./sources.ts";

/** A rule of the theme: the scopes it colors, one or several, and its color. */
type TokenColor = {
    scope?: string | string[];
    settings: { foreground?: string };
};

/**
 * The kinds of words of my code blocks, as their classes name them,
 * each with the scope of the theme that stands for it.
 * `text`, every other word, takes the color of text of the theme.
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
 * Reads the colors of my code blocks from the theme, none of a kind without one.
 * A rule for a scope within another, like `meta.function-call string`,
 * counts for no scope alone.
 */
export function codeColorsRead(): { [kind: string]: string } {
    const theme: { colors: { [name: string]: string }; tokenColors: TokenColor[] } =
        JSON.parse(
            readFileSync(
                join(
                    vault,
                    "NomTechnicalsettings/EditorThemes/intellij-dark/" +
                        "themes/intellij-dark.json",
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
    const colors: { [kind: string]: string } = {
        text: theme.colors["editor.foreground"],
    };
    for (const [kind, scope] of Object.entries(scopes)) {
        const color: string | undefined = colorOf(scope);
        if (color !== undefined) colors[kind] = color;
    }
    return colors;
}
