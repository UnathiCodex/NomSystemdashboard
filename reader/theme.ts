/**
 * ## Theme
 *
 * The colors of my code blocks, read from the theme of my editor, IntelliJ Dark.
 * Each kind takes the color of the rule whose TextMate scope is the longest start of its scope, as in VS Code.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { vault } from "./sources.ts";

/** A rule of the theme, its scopes and its color. */
type TokenColor = {
    scope?: string | string[];
    settings: { foreground?: string };
};

/** The kinds of words of my code blocks, each with its scope, every other word `text`. */
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
 * A rule for a scope within another counts for no scope alone.
 */
export function codeColorsRead(): { [kind: string]: string } {
    const theme: { colors: { [name: string]: string }; tokenColors: TokenColor[] } = JSON.parse(
        readFileSync(
            join(vault, "NomTechnicalsettings/EditorThemes/intellij-dark/" + "themes/intellij-dark.json"),
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
