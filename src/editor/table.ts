/**
 * ## Table
 *
 * A table of a note opened over the whole page, as Notion opens a page in full,
 * see `BlockWidget` in `./preview.ts`:
 * a spreadsheet of Jspreadsheet, see `.table-viewer` in `../notes/notes.css`,
 * its head row and its first column staying while its cells scroll both ways,
 * each column as wide as its widest cell, at most about 24 characters as in every table.
 * I use it as a spreadsheet, never the Markdown of the table:
 * `Ctrl+C` and `Ctrl+V` copy and paste as the text I type in its cells,
 * separated by tabs as LibreOffice and Excel take it.
 * A right click on a row opens its menu: insert, move or remove rows.
 * Nothing asks first: `Ctrl+Z` takes the last change back and `Ctrl+Y` brings it again.
 * Each change goes at once into the text of the editor, only the lines changed,
 * see {@link rowsWritten}, a step of its own in the history of the editor,
 * so the editor saves it as any change, never by itself, see `noteSave` in `./editor.ts`:
 * the save button of the table presses that of the editor.
 * A link in a cell opens by a click on it, as in Google Sheets,
 * a person of the column `Lecturers`, `Tutor` or `Head` its row in `Persons.md`,
 * see `../persons.ts`; a click beside it picks its cell.
 * A file to read only, like an `.ics` file, shows its table only to read.
 *
 * - `diff`: Finds the rows of the spreadsheet that stayed as they were,
 *   so their lines stay too.
 */

import { isolateHistory } from "@codemirror/commands";
import { diffArrays } from "diff";
import jspreadsheet from "jspreadsheet-ce";
import {
    ArrowDown,
    ArrowDownToLine,
    ArrowUp,
    ArrowUpToLine,
    Save,
    SaveOff,
    Trash,
    X,
} from "lucide";
import { iconPut } from "../icons.ts";
import { menuItemOf } from "../menu.ts";
import { peopleCellLink } from "../persons.ts";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jspreadsheet-ce/dist/jspreadsheet.themes.css";

import type { Line } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ArrayChange } from "diff";
import type {
    CellValue,
    Column,
    CustomEditor,
    HorizontalAlign,
    WorksheetInstance,
} from "jspreadsheet-ce";

/**
 * A line of a table: begins with `|`, after indentation and the `>` of a quote.
 */
const rowRule: RegExp = /^[ \t>]*\|/;

/** A line break written in a cell, `<br>`, also as `<br/>` or `<br />`. */
const breakRule: RegExp = /<br\s*\/?>/gi;

/**
 * A spreadsheet with what Jspreadsheet keeps of it but does not tell in its types:
 * the row picked by its number, `false` or `null` while heads or cells are picked.
 */
type Sheet = WorksheetInstance & { selectedRow: number | false | null };

/**
 * Opens a table of the note over the whole page, see the top of this file.
 * - `menu`: A click on an item gives the keys back to the spreadsheet,
 *   which a click outside it takes them from, `jspreadsheet.current`.
 * - `keydown`: Caught before the spreadsheet, so `Delete` never asks first
 *   and `Ctrl+S` presses the save button, never the spreadsheet's own download.
 *
 * @param render - Renders Markdown as the note shows it,
 *   see `blockRender` in `./preview.ts`
 * @param follow - Follows the link clicked, and tells whether it opened something,
 *   see `addressFollow` in `./preview.ts`
 */
export function tableOpen(
    view: EditorView,
    from: number,
    render: (markdown: string) => HTMLElement,
    follow: (event: MouseEvent) => boolean,
): void {
    const editorSave: HTMLElement = document.getElementById("editor-save") as HTMLElement;
    const editorState: HTMLElement = document.getElementById(
        "editor-state",
    ) as HTMLElement;
    const viewer: HTMLDivElement = document.createElement("div");
    const close: HTMLButtonElement = document.createElement("button");
    const state: HTMLSpanElement = document.createElement("span");
    const save: HTMLButtonElement = document.createElement("button");
    const body: HTMLDivElement = document.createElement("div");
    const menu: HTMLDivElement = document.createElement("div");
    const lines: Line[] = linesOf(view, from);
    const heads: string[] = cellsOf(lines[0].text);
    const count: number = heads.length;

    /** Shows the text of a cell rendered, as the note shows it in a table. */
    const cellShow = (cell: HTMLTableCellElement, value: string): void => {
        const head: HTMLElement | null = render(
            `| ${cellMarkdownOf(value)} |\n| --- |`,
        ).querySelector("th");
        cell.classList.add("markdown");
        cell.replaceChildren(...(head?.childNodes ?? []));
    };

    const markdownCell: CustomEditor = {
        createCell: (
            cell: HTMLTableCellElement,
            value: CellValue,
            x: number,
        ): HTMLTableCellElement => {
            cellShow(cell, String(value));
            peopleCellLink(cell, heads[x] ?? "");
            return cell;
        },
        updateCell: (
            cell: HTMLTableCellElement,
            value: CellValue | undefined,
            x: number,
        ): CellValue | undefined => {
            cellShow(cell, String(value ?? ""));
            peopleCellLink(cell, heads[x] ?? "");
            return value;
        },
        openEditor: (
            cell: HTMLTableCellElement,
            value: CellValue,
            x: number,
            y: number,
            worksheet: WorksheetInstance,
            options: Column,
            event: KeyboardEvent | MouseEvent | TouchEvent | undefined,
        ): void => {
            const input: HTMLTextAreaElement = document.createElement("textarea");
            const room: number =
                worksheet.content.getBoundingClientRect().right -
                cell.getBoundingClientRect().left;
            input.className = "table-cell-input";
            input.value =
                event instanceof KeyboardEvent && event.key.length === 1
                    ? ""
                    : String(value);
            input.style.minWidth = `${cell.offsetWidth}px`;
            input.style.maxWidth = `${Math.max(cell.offsetWidth, room - 12)}px`;
            input.onblur = (): void => worksheet.closeEditor(cell, true);
            input.addEventListener("keydown", (key: KeyboardEvent): void => {
                if (key.key !== "Enter" || !(key.altKey || key.shiftKey)) return;
                key.preventDefault();
                key.stopPropagation();
                input.setRangeText("\n", input.selectionStart, input.selectionEnd, "end");
            });
            cell.replaceChildren(input);
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        },
        closeEditor: (
            cell: HTMLTableCellElement,
            keep: boolean,
        ): CellValue | undefined => {
            const input: HTMLTextAreaElement | null = cell.querySelector("textarea");
            if (input === null) return undefined;
            input.onblur = null;
            return keep ? input.value.trim() : undefined;
        },
    };

    viewer.className = "table-viewer";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-label", "Table");
    close.className = "table-viewer-close";
    close.type = "button";
    iconPut(close, X, "Close");
    close.addEventListener("click", (): void => shut());
    state.className = "table-viewer-state";
    save.className = "editor-save table-viewer-save";
    save.type = "button";
    iconPut(
        save,
        view.state.readOnly ? SaveOff : Save,
        view.state.readOnly ? "Read only" : "Save",
    );
    save.disabled = view.state.readOnly;
    save.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    save.addEventListener("click", (): void => {
        commit();
        editorSave.click();
    });
    body.className = "table-viewer-body";
    body.addEventListener("mouseover", cellTitleShow);
    menu.className = "menu table-row-menu";
    menu.popover = "auto";
    menu.addEventListener("click", (): void => {
        menu.hidePopover();
        jspreadsheet.current = sheet;
    });
    viewer.append(close, state, save, body, menu);
    document.body.append(viewer);
    const sheet: Sheet = jspreadsheet(body, {
        tabs: false,
        toolbar: false,
        about: false,
        allowExport: false,
        parseFormulas: false,
        autoCasting: false,
        autoIncrement: false,
        onafterchanges: (): void => sync(),
        oninsertrow: (): void => sync(),
        ondeleterow: (): void => sync(),
        onmoverow: (): void => sync(),
        onchangeheader: (): void => sync(),
        onundo: (): void => sync(),
        onredo: (): void => sync(),
        onselection: (): void => inView(),
        oncopy: (): string => clipboardOf(sheet.getData(true)),
        worksheets: [
            {
                data: lines
                    .slice(2)
                    .map((line: Line): string[] => paddedOf(cellsOf(line.text), count)),
                columns: heads.map((head: string, column: number): Column => ({
                    title: head,
                    type: markdownCell,
                    align: alignOf(cellsOf(lines[1].text)[column] ?? ""),
                    width: widthOf(column),
                    wordWrap: false,
                })),
                editable: !view.state.readOnly,
                columnSorting: false,
                columnDrag: false,
                rowResize: false,
                selectionCopy: false,
                allowInsertColumn: false,
                allowManualInsertColumn: false,
                allowDeleteColumn: false,
                allowRenameColumn: false,
                allowDeletingAllRows: false,
            },
        ],
    })[0] as Sheet;

    /**
     * Gives the width of a column, as wide as its widest cell or head, measured rendered,
     * see `.table-viewer-probe` in `../notes/notes.css`.
     */
    function widthOf(column: number): number {
        const probe: HTMLTableCellElement = document.createElement("td");
        probe.className = "table-viewer-probe";
        body.append(probe);
        let widest: number = 0;
        const values: string[] = lines
            .slice(2)
            .map((line: Line): string => cellsOf(line.text)[column] ?? "");
        for (const value of [heads[column], ...values]) {
            cellShow(probe, value);
            widest = Math.max(widest, probe.getBoundingClientRect().width);
        }
        probe.remove();
        return Math.ceil(Math.max(widest, 48));
    }

    /**
     * Writes the spreadsheet into the text of the editor, only the lines that changed,
     * a step of its own in the history of the editor; nothing when no line changed.
     */
    function sync(): void {
        const table: Line[] = linesOf(view, from);
        const old: string[] = table.map((line: Line): string => line.text);
        const titles: string[] = heads.map((head: string, column: number): string =>
            String(sheet.options.columns?.[column]?.title ?? head),
        );
        const data: string[][] = sheet.getData().map((row: CellValue[]): string[] =>
            paddedOf(
                row.map((value: CellValue): string => String(value ?? "").trim()),
                count,
            ),
        );
        const fresh: string[] = [
            lineWritten(old[0], titles),
            old[1],
            ...rowsWritten(old.slice(2), data, count),
        ];
        let start: number = 0;
        while (start < old.length && start < fresh.length && old[start] === fresh[start])
            start++;
        let end: number = 0;
        while (
            end < old.length - start &&
            end < fresh.length - start &&
            old[old.length - 1 - end] === fresh[fresh.length - 1 - end]
        )
            end++;
        if (start === old.length && start === fresh.length) return;

        const insert: string[] = fresh.slice(start, fresh.length - end);
        const last: number = old.length - end - 1;
        const breakText: string = view.state.lineBreak;
        view.dispatch({
            changes:
                last < start
                    ? {
                          from: table[start - 1].to,
                          insert: `${breakText}${insert.join(breakText)}`,
                      }
                    : insert.length === 0
                      ? { from: table[start - 1].to, to: table[last].to }
                      : {
                            from: table[start].from,
                            to: table[last].to,
                            insert: insert.join(breakText),
                        },
            annotations: isolateHistory.of("full"),
        });
    }

    /**
     * Keeps the cell picked last in view, scrolling as little as it takes;
     * Jspreadsheet scrolls on its own, but knows nothing of the columns that stay.
     * Whole rows picked keep the table where it is sideways,
     * and whole columns up and down,
     * since the cell picked last of them is that at their far end;
     * Jspreadsheet, moving by the keys, scrolls to that end right after,
     * so the table goes back where it was before the page is drawn again.
     */
    function inView(): void {
        const picked: [number, number] | null = cursorOf();
        const range: [number, number, number, number] | null = rangeOf();
        if (picked === null || range === null) return;
        const cell: DOMRect = sheet
            .getCellFromCoords(picked[0], picked[1])
            .getBoundingClientRect();
        const room: DOMRect = sheet.content.getBoundingClientRect();
        const fixed: HTMLElement = sheet.headers[0];
        const left: number = fixed.getBoundingClientRect().right;
        const top: number = fixed.getBoundingClientRect().bottom;
        const right: number = room.left + sheet.content.clientWidth;
        const bottom: number = room.top + sheet.content.clientHeight;
        const across: boolean = range[0] === 0 && range[2] === count - 1;
        const down: boolean = range[1] === 0 && range[3] === rowCount() - 1;
        const kept: [number, number] = [
            sheet.content.scrollLeft,
            sheet.content.scrollTop,
        ];
        requestAnimationFrame((): void => {
            if (across) sheet.content.scrollLeft = kept[0];
            if (down) sheet.content.scrollTop = kept[1];
        });
        if (!across && picked[0] > 0 && cell.left < left)
            sheet.content.scrollLeft -= left - cell.left;
        else if (!across && picked[0] > 0 && cell.right > right)
            sheet.content.scrollLeft += Math.min(cell.right - right, cell.left - left);
        if (!down && cell.top < top) sheet.content.scrollTop -= top - cell.top;
        else if (!down && cell.bottom > bottom)
            sheet.content.scrollTop += Math.min(cell.bottom - bottom, cell.top - top);
    }

    /**
     * Gives the column and row of the cell picked last, `null` for none;
     * Jspreadsheet keeps them as numbers
     * or as the text of the cell's `data-x` and `data-y`.
     */
    function cursorOf(): [number, number] | null {
        const picked:
            | [number | string, number | string, number | string, number | string]
            | null
            | undefined = sheet.selectedCell;
        return picked === null || picked === undefined
            ? null
            : [Number(picked[2]), Number(picked[3])];
    }

    /** Gives how many rows the table has, its head left out. */
    const rowCount = (): number => (sheet.options.data ?? []).length;

    /** Gives the range picked, `null` for none. */
    function rangeOf(): [number, number, number, number] | null {
        return sheet.selectedCell === null || sheet.selectedCell === undefined
            ? null
            : sheet.getSelection();
    }

    const pickedHas = (row: number): boolean => {
        const range: [number, number, number, number] | null = rangeOf();
        return range !== null && range[1] <= row && row <= range[3];
    };

    /**
     * Gives the first and last row picked:
     * those of the range picked when it holds the row given, else that row alone.
     */
    const pickedOf = (row: number): [number, number] => {
        const range: [number, number, number, number] | null = rangeOf();
        return range !== null && pickedHas(row) ? [range[1], range[3]] : [row, row];
    };

    /**
     * Removes rows and picks the first cell of the row now in their place,
     * so the keys act on the spreadsheet again, `Ctrl+Z` too,
     * which it ignores while nothing is picked.
     */
    const remove = (first: number, last: number): void => {
        const row: number = Math.min(first, rowCount() - (last - first + 1) - 1);
        sheet.deleteRow(first, last - first + 1);
        sheet.updateSelectionFromCoords(0, row, 0, row);
    };

    const move = (row: number, step: number): void => {
        const column: number = cursorOf()?.[0] ?? 0;
        if (row + step < 0 || row + step >= rowCount()) return;
        sheet.moveRow(row, row + step);
        sheet.updateSelectionFromCoords(column, row + step, column, row + step);
    };

    /** Opens the menu of a row; moving faint where it cannot go. */
    const menuShow = (row: number, x: number, y: number): void => {
        const [first, last]: [number, number] = pickedOf(row);
        const rows: number = rowCount();
        const items: HTMLButtonElement[] = [
            menuItemOf(ArrowUpToLine, "Insert row above", (): void => {
                sheet.insertRow(1, row, 1);
                sheet.updateSelectionFromCoords(0, row, 0, row);
            }),
            menuItemOf(ArrowDownToLine, "Insert row below", (): void => {
                sheet.insertRow(1, row);
                sheet.updateSelectionFromCoords(0, row + 1, 0, row + 1);
            }),
            menuItemOf(ArrowUp, "Move up", (): void => move(row, -1)),
            menuItemOf(ArrowDown, "Move down", (): void => move(row, 1)),
            menuItemOf(
                Trash,
                first === last ? "Remove row" : `Remove ${last - first + 1} rows`,
                (): void => remove(first, last),
            ),
        ];
        items[2].disabled = row === 0;
        items[3].disabled = row === rows - 1;
        items[4].disabled = last - first + 1 === rows;
        menu.replaceChildren(...items);
        menu.style.left = `${Math.min(x, document.documentElement.clientWidth - 240)}px`;
        menu.style.top = `${y}px`;
        menu.showPopover();
        if (menu.getBoundingClientRect().bottom > innerHeight)
            menu.style.top = `${Math.max(0, innerHeight - menu.offsetHeight - 8)}px`;
    };

    /**
     * Edits a head in a field in its place;
     * Jspreadsheet reads the head from its text,
     * so the head shows its `title` again before it changes, which `Ctrl+Z` brings back.
     */
    const headEdit = (head: HTMLElement, column: number): void => {
        const title: string = sheet.getHeader(column);
        const input: HTMLInputElement = document.createElement("input");
        const end = (keep: boolean): void => {
            input.onblur = null;
            head.textContent = title;
            if (keep && input.value.trim() !== title)
                sheet.setHeader(column, input.value.trim());
        };
        input.className = "table-cell-input";
        input.value = title;
        input.onblur = (): void => end(true);
        input.addEventListener("keydown", (event: KeyboardEvent): void => {
            event.stopPropagation();
            if (event.key === "Enter" || event.key === "Escape")
                end(event.key === "Enter");
        });
        head.replaceChildren(input);
        input.focus();
        input.select();
    };

    /** Repeats the grey of the editor's save button and whether its changes are saved. */
    const saveShow = (): void => {
        save.classList.toggle("unsaved", editorSave.classList.contains("unsaved"));
        state.textContent = editorState.textContent;
    };
    const watch: MutationObserver = new MutationObserver(saveShow);

    /**
     * Gives the cell being edited, `null` for none,
     * which Jspreadsheet keeps as `null`, before the first not at all.
     */
    const editedOf = (): HTMLTableCellElement | null => sheet.edition?.[0] ?? null;

    const commit = (): void => {
        const edited: HTMLTableCellElement | null = editedOf();
        if (edited !== null) sheet.closeEditor(edited, true);
    };

    const keyDown = (event: KeyboardEvent): void => {
        if (event.target instanceof HTMLInputElement || menu.matches(":popover-open"))
            return;
        const key: string = event.key.toLowerCase();
        const cursor: [number, number] | null = cursorOf();
        if ((event.ctrlKey || event.metaKey) && key === "s") {
            event.preventDefault();
            event.stopPropagation();
            save.click();
        } else if (editedOf() !== null) {
            return;
        } else if (event.key === "Escape") {
            event.stopPropagation();
            shut();
        } else if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.altKey &&
            cursor !== null &&
            !view.state.readOnly
        ) {
            event.preventDefault();
            event.stopPropagation();
            sheet.openEditor(sheet.getCellFromCoords(cursor[0], cursor[1]), false);
        } else if (
            (event.key === "Delete" || event.key === "Backspace") &&
            !view.state.readOnly
        ) {
            event.preventDefault();
            event.stopPropagation();
            const [first, last]: [number, number] = pickedOf(cursor?.[1] ?? 0);
            if (typeof sheet.selectedRow !== "number")
                sheet.setValue(
                    sheet.highlighted.map(
                        (cell: { element: HTMLTableCellElement }): HTMLTableCellElement =>
                            cell.element,
                    ),
                    "",
                );
            else if (last - first + 1 < rowCount()) remove(first, last);
        } else if (
            event.altKey &&
            (event.key === "ArrowUp" || event.key === "ArrowDown") &&
            cursor !== null &&
            !view.state.readOnly
        ) {
            event.preventDefault();
            event.stopPropagation();
            move(cursor[1], event.key === "ArrowUp" ? -1 : 1);
        }
    };

    /** Closes the table, keeping the text of a cell being edited. */
    const shut = (): void => {
        commit();
        watch.disconnect();
        window.removeEventListener("keydown", keyDown, true);
        jspreadsheet.destroy(
            body as unknown as Parameters<typeof jspreadsheet.destroy>[0],
            true,
        );
        viewer.remove();
    };

    viewer.addEventListener(
        "contextmenu",
        (event: MouseEvent): void => {
            const cell: HTMLElement | null = (event.target as Element).closest(
                "tbody td[data-y]",
            );
            if (!body.contains(event.target as Node)) return;
            event.preventDefault();
            event.stopPropagation();
            if (cell === null || view.state.readOnly || editedOf() !== null) return;
            const row: number = Number(cell.dataset.y);
            const column: number = Number(cell.dataset.x ?? 0);
            if (!pickedHas(row))
                sheet.updateSelectionFromCoords(column, row, column, row);
            menuShow(row, event.clientX, event.clientY);
        },
        true,
    );
    viewer.addEventListener("click", (event: MouseEvent): void => {
        const link: HTMLAnchorElement | null = (event.target as Element).closest("a");
        if (
            link !== null &&
            follow(event) &&
            !/^https?:/i.test(link.getAttribute("href") ?? "")
        )
            shut();
    });
    viewer.addEventListener("dblclick", (event: MouseEvent): void => {
        const head: HTMLElement | null = (event.target as Element).closest(
            "thead td[data-x]",
        );
        if (head !== null && !view.state.readOnly) headEdit(head, Number(head.dataset.x));
    });
    saveShow();
    watch.observe(editorSave, { attributes: true, attributeFilter: ["class"] });
    watch.observe(editorState, { childList: true, characterData: true, subtree: true });
    window.addEventListener("keydown", keyDown, true);

    sheet.updateSelectionFromCoords(0, 0, 0, 0);
}

/**
 * Shows the whole text of a cell of a table cut by `…` as its tooltip,
 * in a note as in a table opened over the page; a cell shown whole gets none.
 */
export function cellTitleShow(event: MouseEvent): void {
    const cell: HTMLTableCellElement | null = (event.target as Element).closest("td, th");
    if (cell !== null && cell.scrollWidth > cell.clientWidth) cell.title = cell.innerText;
    else cell?.removeAttribute("title");
}

/**
 * Gives the lines of a table as they stand in the text now, from its head on.
 */
function linesOf(view: EditorView, from: number): Line[] {
    const lines: Line[] = [];
    for (
        let number: number = view.state.doc.lineAt(from).number;
        number <= view.state.doc.lines && rowRule.test(view.state.doc.line(number).text);
        number++
    )
        lines.push(view.state.doc.line(number));
    return lines;
}

/** Gives how a column aligns, from its cell in the line of `-` under the head. */
function alignOf(rule: string): HorizontalAlign {
    return rule.endsWith(":") ? (rule.startsWith(":") ? "center" : "right") : "left";
}

/**
 * Gives cells as LibreOffice and Excel copy them, each the text I type in it,
 * as Jspreadsheet writes them too, so it pastes them as it copied them;
 * never the rendered cell, which Jspreadsheet would copy.
 */
function clipboardOf(rows: CellValue[][]): string {
    return rows
        .map((row: CellValue[]): string =>
            row
                .map((value: CellValue): string => {
                    const text: string = String(value ?? "");
                    return /[\t\n,"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
                })
                .join("\t"),
        )
        .join("\r\n");
}

/** Gives a row with as many cells as the table has columns. */
function paddedOf(cells: string[], count: number): string[] {
    return Array.from(
        { length: count },
        (_: unknown, column: number): string => cells[column] ?? "",
    );
}

/**
 * Gives the lines of the rows of a table for the rows of the spreadsheet:
 * a row as it was keeps its line, even when moved;
 * a row changed in place keeps its line with only the cells changed written anew;
 * a new row gets a line in the form of the others.
 * - {@link diffArrays}: A run added right after a run removed
 *   holds the rows changed in place.
 */
function rowsWritten(old: string[], data: string[][], count: number): string[] {
    const keyOf = (cells: string[]): string => cells.join("\u0000");
    const parts: ArrayChange<string>[] = diffArrays(
        old.map((line: string): string => keyOf(paddedOf(cellsOf(line), count))),
        data.map(keyOf),
    );
    const gone: Map<string, string[]> = new Map<string, string[]>();
    let at: number = 0;
    for (const part of parts) {
        if (part.added) continue;
        if (part.removed)
            part.value.forEach((key: string, index: number): void => {
                gone.set(key, [...(gone.get(key) ?? []), old[at + index]]);
            });
        at += part.value.length;
    }

    const lines: string[] = [];
    const empty: string =
        `${/^[ \t>]*/.exec(old[0] ?? "")?.[0] ?? ""}| ` +
        `${Array<string>(count).fill("").join(" | ")} |`;
    let left: string[] = [];
    at = 0;
    for (const part of parts) {
        if (part.removed) {
            left = old.slice(at, at + part.value.length);
            at += part.value.length;
        } else if (part.added) {
            for (const key of part.value) {
                const same: string | undefined = gone.get(key)?.shift();
                const cells: string[] = key.split("\u0000");
                if (same !== undefined)
                    left = left.filter((line: string): boolean => line !== same);
                lines.push(same ?? lineWritten(left.shift() ?? empty, cells));
            }
            left = [];
        } else {
            lines.push(...old.slice(at, at + part.value.length));
            at += part.value.length;
            left = [];
        }
    }
    return lines;
}

/** Writes into a line of a table only the cells that differ from the line's own. */
function lineWritten(text: string, cells: string[]): string {
    return cells.reduce(
        (line: string, cell: string, column: number): string =>
            (cellsOf(line)[column] ?? "") === cell
                ? line
                : cellWritten(line, column, cell),
        text,
    );
}

/**
 * Finds the `|` of a line of a table that part its cells, an escaped one, `\|`, left out.
 */
function barsOf(text: string): number[] {
    const bars: number[] = [];
    for (let index: number = 0; index < text.length; index++)
        if (text[index] === "|" && text[index - 1] !== "\\") bars.push(index);
    return bars;
}

/**
 * Gives the cells of a line of a table as I type them, without the spaces around them,
 * with their `\|` as `|` and their `<br>` as line breaks; the line may end without `|`.
 */
function cellsOf(text: string): string[] {
    const bars: number[] = barsOf(text);
    const ends: number[] =
        text.slice(bars[bars.length - 1] + 1).trim() === ""
            ? bars
            : [...bars, text.length];
    return ends.slice(0, -1).map((bar: number, column: number): string =>
        text
            .slice(bar + 1, ends[column + 1])
            .trim()
            .replace(/\\\|/g, "|")
            .replace(breakRule, "\n"),
    );
}

/**
 * Gives the Markdown of a cell as I type it: `|` escaped as `\|`, line breaks as `<br>`.
 */
function cellMarkdownOf(value: string): string {
    return value
        .trim()
        .replace(/\|/g, "\\|")
        .replace(/\s*\n\s*/g, "<br>");
}

/**
 * Writes the text of a cell into a line of a table, between the spaces the cell had,
 * one on each side for an empty one; the rest of the line as it was.
 * A line with fewer cells gets the missing ones at its end, empty ones as `|  |`,
 * as every empty cell of my tables.
 */
function cellWritten(text: string, column: number, value: string): string {
    const bars: number[] = barsOf(text);
    const escaped: string = cellMarkdownOf(value);
    if (column + 1 < bars.length) {
        const old: string = text.slice(bars[column] + 1, bars[column + 1]);
        const before: string = old.trim() === "" ? " " : (/^\s*/.exec(old)?.[0] ?? "");
        const after: string = old.trim() === "" ? " " : (/\s*$/.exec(old)?.[0] ?? "");
        return (
            `${text.slice(0, bars[column] + 1)}${before}${escaped}${after}` +
            text.slice(bars[column + 1])
        );
    }

    let written: string = text.trimEnd();
    if (!written.endsWith("|") || written.endsWith("\\|")) written += " |";
    for (let cells: number = barsOf(written).length - 1; cells < column; cells++)
        written += "  |";
    return `${written} ${escaped} |`;
}
