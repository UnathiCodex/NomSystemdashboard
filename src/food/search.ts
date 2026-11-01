/**
 * ## Food search
 *
 * The one search for foods, my foods first, the most eaten first, then the products of Open Food Facts.
 * My foods it finds at once as I type, Open Food Facts only once the typing pauses, so a word asks it once.
 * An empty field lists my foods in the food view, and nothing where a food is picked, whose list would grow long.
 * That nothing is found it says only for the text as it stands, like a barcode typed digit by digit.
 * Open Food Facts searches the names of its products, a word of a brand or a shop only ranks them.
 * A click on a product adds it to my foods as Open Food Facts gives it, no form in between.
 * Nothing in the search is a form or sends one, so it can stand inside the form of a dialog.
 */

import {
    amountOf,
    bracketsWatch,
    buttonOf,
    elementOf,
    foodChange,
    foodDelete,
    foodNameOf,
    foodSend,
    foodsFind,
    keyOf,
    unitOf,
} from "./foods.ts";
import { crossPut, iconOf, iconPut, QuestionMark, searchFieldOf } from "../icons.ts";
import { Check, Plus, X } from "lucide";
import "./search.css";
import type { Food, FoodsFound, Kind, Product } from "../../reader/food.ts";

/**
 * What a search does, where it stands.
 *
 * - `pick`: Takes a food picked or added, `null` where a click on one of my foods opens it.
 * - `meals`: Builds the lines of my meals above my foods, `null` for none.
 * - `nothing`: The one grey line when a search finds nothing.
 */
export type SearchSetup = {
    pick: ((food: Food) => void) | null;
    meals: ((query: string) => HTMLElement[]) | null;
    products: boolean;
    nothing: string;
};

/**
 * One search on the page, with what it shows.
 *
 * - `tail`: Where the products stand, shown anew by themselves as they come, so nothing above them moves.
 * - `found`: My foods for the text shown and the products of every page shown, `null` before its first answer.
 * - `asked`: Number of the last search asked, so a late answer never covers a newer one.
 * - `enter`: Whether Enter waits for the results of the text typed.
 * - `reveal`: Whether the food open goes into sight once shown.
 * - `linked`: Whether a click on a food of a meal put the text in, so it finds only my foods until I type.
 * - `added`: Keys of the foods I added since the page opened, the last first, on top,
 *   so I mend what came wrong right away.
 */
type Search = {
    input: HTMLInputElement;
    results: HTMLElement;
    tail: HTMLElement;
    setup: SearchSetup;
    page: number;
    found: FoodsFound | null;
    asked: number;
    loading: boolean;
    waiting: number;
    open: string;
    shown: string;
    enter: boolean;
    asking: string;
    reveal: boolean;
    linked: boolean;
    added: string[];
};

/** Milliseconds the typing pauses before the field asks Open Food Facts, so a word asks it once. */
const pause: number = 300;

/** Fewest characters to ask Open Food Facts, as in the reader, so a shorter search shows no products to come. */
const searchLength: number = 3;

/** Milliseconds before a search asks once more, twice as long as the reader takes to start anew. */
const restartTime: number = 1000;

/** The fields of a food, its portion and pack in the unit of its kind. */
function fieldsOf(kind: Kind): [string, string, string][] {
    return [
        ["Name", "name", ""],
        ["Brand", "brand", ""],
        ["Store", "store", ""],
        ["kcal", "kcal", "kcal"],
        ["Protein", "protein", "g"],
        ["Carbs", "carbs", "g"],
        ["Fat", "fat", "g"],
        ["Portion", "portion", unitOf(kind)],
        ["Pack", "pack", unitOf(kind)],
    ];
}

/** Each search by its element on the page. */
const searches: WeakMap<HTMLElement, Search> = new WeakMap();

/** What a search shows before its first answer: nothing found. */
const empty: FoodsFound = { foods: [], products: [], total: 0, exact: true, more: false };

/** The head of a list in the columns of its lines, naming the unit of every number below once. */
export function listHeadOf(name: string, unit: string): HTMLElement {
    const line: HTMLElement = elementOf("div", "food-item", "");
    const head: HTMLElement = elementOf("div", "food-row food-columns", "");
    head.append(elementOf("span", "", name), elementOf("span", "food-value", unit));
    line.append(head);
    return line;
}

/**
 * The line of a meal or a food, alike wherever it stands, its name, its kcal and what stands at its end.
 * `click` is `null` for a row that does nothing or takes its clicks itself.
 */
export function listLineOf(
    name: HTMLElement,
    kcal: number | null,
    click: (() => void) | null,
    end: HTMLElement | null,
): [HTMLElement, HTMLElement] {
    const line: HTMLElement = elementOf("div", "food-item", "");
    const row: HTMLElement = click === null ? elementOf("div", "food-row", "") : buttonOf("food-row", "", click);
    row.append(name, elementOf("span", "food-value", kcal === null ? "" : amountOf(kcal, 0)));
    line.append(row);
    if (end !== null) line.append(end);
    return [line, row];
}

/** The cross and the check of every change in place, as the dialogs end. */
export function editButtonsOf(cancelled: () => void, saved: () => void): HTMLElement {
    const buttons: HTMLElement = elementOf("span", "food-buttons", "");
    const cancel: HTMLButtonElement = buttonOf("", "", cancelled);
    const save: HTMLButtonElement = buttonOf("food-save", "", saved);
    iconPut(cancel, X, "Cancel");
    iconPut(save, Check, "Save");
    buttons.append(cancel, save);
    return buttons;
}

/** A field of a change in place, its Escape closing no dialog around it. */
export function editFieldOf(value: string, words: string, saved: () => void, cancelled: () => void): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.type = "text";
    input.className = "food-field-text";
    input.autocomplete = "off";
    input.value = value;
    input.placeholder = words;
    input.setAttribute("aria-label", words);
    input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            saved();
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelled();
        }
    });
    return input;
}

/** A value that changes in place, Enter or leaving it saves, Escape takes the change back. */
export function inlineFieldOf(value: string, words: string, saved: () => void): HTMLInputElement {
    const input: HTMLInputElement = editFieldOf(
        value,
        words,
        (): void => input.blur(),
        (): void => {
            input.value = value;
            input.blur();
        },
    );
    input.className = "food-inline";
    input.removeAttribute("placeholder");
    input.addEventListener("change", saved);
    return input;
}

/** The kind of a food, which a click switches and saves, since only `Eat` and `Drink` need no list. */
function kindFieldOf(kind: Kind, saved: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = buttonOf("food-inline food-kind", kind, (): void => {
        button.textContent = button.textContent === "Eat" ? "Drink" : "Eat";
        saved();
    });
    button.setAttribute("aria-label", "Kind, a click switches it");
    return button;
}

/**
 * A food of mine opened below its line, in two columns as the parts of a dialog.
 * Every value changes in place, since not everything from Open Food Facts or my typing is right.
 * A nutrient unknown stands empty, never 0.
 * When the reader does not take a change, the food stays open and says so.
 * - `save`: Sends the values, the food taking no clicks meanwhile, a number that is none takes nothing.
 */
export function foodDetailOf(food: Food, saved: (written: Food) => void): HTMLElement {
    const detail: HTMLElement = elementOf("div", "food-detail", "");
    const facts: HTMLElement = elementOf("div", "food-facts", "");
    const fields: Map<string, HTMLInputElement> = new Map();
    const text: (key: string) => string = (key: string): string => fields.get(key)?.value.trim() ?? "";
    const error: HTMLElement = elementOf(
        "p",
        "food-error",
        "Not changed: it needs a name and its kcal, numbers only, " +
            "and no other food of mine may have this name, brand and store",
    );
    const save: () => void = (): void => {
        const numbers: (number | null)[] = numbersRead(text);
        const [kcal, protein, carbs, fat, portion, pack]: (number | null)[] = numbers;
        if (text("name") === "" || kcal === null || numbers.some(Number.isNaN)) {
            error.hidden = false;
            return;
        }
        detail.inert = true;
        foodChange(food, {
            name: text("name"),
            brand: text("brand"),
            store: text("store"),
            barcode: text("barcode"),
            kcal: kcal,
            protein: protein,
            carbs: carbs,
            fat: fat,
            pack: pack,
            portion: portion,
            kind: kind.textContent as Kind,
        })
            .then(saved)
            .catch((reason: unknown): void => {
                console.error(reason);
                error.hidden = false;
                detail.inert = false;
            });
    };
    const kind: HTMLButtonElement = kindFieldOf(food.kind, save);
    const fieldAdd: (name: string, key: string, value: string, unit: string) => void = (
        name: string,
        key: string,
        value: string,
        unit: string,
    ): void => {
        const input: HTMLInputElement = inlineFieldOf(value, name, save);
        fields.set(key, input);
        facts.append(elementOf("span", "food-fact", name), unitFieldOf(input, unit));
    };

    fieldsOf(food.kind).forEach(([name, key, unit]: [string, string, string]): void =>
        fieldAdd(name, key, String(food[key as keyof Food] ?? ""), unit),
    );
    facts.append(elementOf("span", "food-fact", "Kind"), kind);
    fieldAdd("Barcode", "barcode", food.barcode, "");
    error.hidden = true;
    detail.append(facts, error);
    return detail;
}

/**
 * The line of a food of mine, a click picks it where foods are picked, else opens or closes it.
 * It stays open under its new name after a change.
 * In the food view its `×` removes it from `Foods.md`, its first click only asking.
 */
function mineLinesOf(search: Search, food: Food): HTMLElement[] {
    const key: string = keyOf(food);
    const open: boolean = search.setup.pick === null && search.open === key;
    const remove: HTMLButtonElement | null =
        search.setup.pick !== null
            ? null
            : buttonOf("", "", (): void => {
                  if (search.asking !== key) {
                      search.asking = key;
                      resultsShow(search);
                      return;
                  }
                  search.asking = "";
                  foodDelete(food)
                      .then((): void => resultsLoad(search, 0))
                      .catch((error: unknown): void => console.error(error));
              });
    if (remove !== null) crossPut(remove, `Remove ${food.name}`);
    if (remove !== null && search.asking === key) iconPut(remove, QuestionMark, "Really remove?");
    const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
        foodNameOf("food-name", food.name, food.brand, food.store),
        food.kcal,
        (): void => {
            if (search.setup.pick !== null) {
                search.setup.pick(food);
                return;
            }
            search.open = open ? "" : key;
            resultsShow(search);
        },
        remove,
    );
    if (search.setup.pick === null) row.setAttribute("aria-expanded", String(open));
    return open
        ? [
              line,
              foodDetailOf(food, (written: Food): void => {
                  search.added = search.added.map((key: string): string =>
                      key === keyOf(food) ? keyOf(written) : key,
                  );
                  search.open = keyOf(written);
                  resultsLoad(search, 0);
              }),
          ]
        : [line];
}

/** The name of a product with its pack below it, which tells products apart. */
function productNameOf(product: Product): HTMLElement {
    const title: HTMLElement = elementOf("span", "food-title", "");
    title.append(foodNameOf("food-name", product.name, product.brand, product.store));
    if (product.pack !== null)
        title.append(elementOf("span", "food-pack", `Pack ${product.pack} ${unitOf(product.kind)}`));
    return title;
}

/**
 * The line of a product, a click adds it to my foods, taking no clicks meanwhile, so a double click adds it once.
 * A product without kcal opens the form of a food by hand filled from it, the cursor in its kcal,
 * so nothing goes in without its kcal and nothing made up.
 */
function productLineOf(search: Search, product: Product): HTMLElement {
    const [line, row]: [HTMLElement, HTMLElement] = listLineOf(
        productNameOf(product),
        product.kcal,
        (): void => {
            const kcal: number | null = product.kcal;
            if (kcal === null) {
                newFormShow(search, product);
                return;
            }
            row.inert = true;
            foodSend({ ...product, kcal: kcal })
                .then(addedOf(search))
                .catch((reason: unknown): void => {
                    console.error(reason);
                    row.inert = false;
                    line.after(
                        elementOf("p", "food-none food-nothing", `Not added: the reader did not take ${product.name}`),
                    );
                });
        },
        null,
    );
    line.classList.add("food-product");
    return line;
}

/**
 * Shows what the search found in its sections, those that found nothing left out.
 * My meals, while nothing is typed the foods I just added, then my foods, then the products.
 */
function resultsShow(search: Search): void {
    const found: FoodsFound = search.found ?? empty;
    const query: string = search.input.value.trim();
    if (search.setup.pick !== null && query === "") {
        search.results.replaceChildren();
        search.shown = query;
        search.enter = false;
        return;
    }
    const meals: HTMLElement[] = search.setup.meals?.(query) ?? [];
    const fresh: Food[] =
        query !== ""
            ? []
            : search.added.flatMap((key: string): Food[] =>
                  found.foods.filter((food: Food): boolean => keyOf(food) === key),
              );
    const listed: Food[] = found.foods.filter((food: Food): boolean => !fresh.includes(food));
    const sections: HTMLElement[][] = [];

    if (meals.length > 0) sections.push([listHeadOf("Meals", ""), ...meals]);
    const plus: HTMLElement[] = newFoodOf(search, query, found.foods);
    if (fresh.length > 0)
        sections.push([
            listHeadOf("Just added", "kcal / 100 g"),
            ...fresh.flatMap((food: Food): HTMLElement[] => mineLinesOf(search, food)),
        ]);
    if (listed.length > 0 || plus.length > 0)
        sections.push([
            ...(sections.length > 0 ? [listHeadOf("Foods", "kcal / 100 g")] : []),
            ...listed.flatMap((food: Food): HTMLElement[] => mineLinesOf(search, food)),
            ...plus,
        ]);
    search.results.replaceChildren(
        ...sections.flatMap((section: HTMLElement[], index: number): HTMLElement[] =>
            index === 0 ? section : [elementOf("hr", "food-divider", ""), ...section],
        ),
        search.tail,
    );
    productsShow(search);
    search.shown = query;
    if (search.reveal) {
        search.reveal = false;
        search.results.querySelector(".food-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (search.enter) {
        search.enter = false;
        firstPick(search);
    }
}

/**
 * Shows the products at the end of the results by themselves, so nothing above them moves.
 * A calm `Searching…` while they are still to come, one grey line when nothing is found at all.
 */
function productsShow(search: Search): void {
    const found: FoodsFound = search.found ?? empty;
    const query: string = search.input.value.trim();
    const products: Product[] = query === "" ? [] : (found.products ?? []);
    const above: boolean = search.tail.previousElementSibling !== null;
    const headOf: (unit: string) => HTMLElement[] = (unit: string): HTMLElement[] => [
        ...(above ? [elementOf("hr", "food-divider", "")] : []),
        listHeadOf("Open Food Facts", unit),
    ];
    const nothing: string =
        query !== "" ? search.setup.nothing : search.setup.meals === null ? "No foods yet" : "No meals or foods yet";
    search.tail.replaceChildren(
        ...(search.loading
            ? [...headOf(""), elementOf("p", "food-none", "Searching…")]
            : products.length > 0
              ? [
                    ...headOf("kcal / 100 g"),
                    ...products.map((product: Product): HTMLElement => productLineOf(search, product)),
                    moreOf(search, products.length, found),
                ]
              : query !== "" && found.products === null
                ? [...headOf(""), elementOf("p", "food-none food-nothing", "Open Food Facts cannot be reached")]
                : above
                  ? []
                  : [elementOf("p", "food-none food-nothing", nothing)]),
    );
}

/**
 * Enter in a search that picks takes the first of my meals or foods it shows.
 * Never a product, which goes into my foods only by a click.
 * Never a new meal or food either.
 */
function firstPick(search: Search): void {
    if (search.setup.pick === null) return;
    search.results.querySelector<HTMLElement>(".food-item:not(.food-product) > button.food-row")?.click();
}

/** The plus of a new food, last among my foods, while the text typed is no food of mine, nor a barcode. */
function newFoodOf(search: Search, query: string, mine: Food[]): HTMLElement[] {
    if (
        query === "" ||
        /^\d{8,14}$/.test(query) ||
        mine.some((food: Food): boolean => food.name.toLowerCase() === query.toLowerCase())
    )
        return [];
    const plus: HTMLButtonElement = buttonOf("picker-new", "", (): void => newFormShow(search, null));
    plus.replaceChildren(iconOf(Plus), `New food “${query}”`);
    plus.title = "New food by hand, its kcal typed next";
    return [plus];
}

/**
 * What a search does with a food once written.
 * It clears the text, so I am out of the search.
 * Where foods are picked it picks it.
 * In the food view it puts it on top, open, so I mend at once what came wrong.
 */
function addedOf(search: Search): (food: Food) => void {
    return (food: Food): void => {
        search.input.value = "";
        search.linked = false;
        search.open = search.setup.pick === null ? keyOf(food) : "";
        if (search.setup.pick === null)
            search.added = [keyOf(food), ...search.added.filter((key: string): boolean => key !== keyOf(food))];
        resultsLoad(search, 0);
        search.setup.pick?.(food);
    };
}

/**
 * Reads the numbers of a form of a food, a decimal comma counting as a point.
 * `null` for an empty field, which leaves a nutrient unknown, never 0, `NaN` for a text the form refuses.
 */
function numbersRead(text: (key: string) => string): (number | null)[] {
    return ["kcal", "protein", "carbs", "fat", "portion", "pack"].map((key: string): number | null =>
        text(key).trim() === "" ? null : Number(text(key).trim().replace(",", ".")),
    );
}

/** A field of a form of a food, a number with its unit after it, a click beside it putting the cursor in. */
function unitFieldOf(input: HTMLInputElement, unit: string): HTMLElement {
    if (unit === "") return input;
    const amount: HTMLElement = elementOf("span", "food-grams", "");
    input.inputMode = "decimal";
    input.classList.add("food-inline-grams");
    amount.append(input, unit);
    amount.addEventListener("click", (): void => input.focus());
    return amount;
}

/**
 * Opens the form of a food by hand at the top of the results, only in the food view.
 * The portion empty takes 100, never its pack.
 * It needs its name and kcal.
 * It needs its brand and store too, since I keep them always, also of my own bakery.
 * A nutrient left empty is unknown, never 0.
 * The one nutrient missing the reader works out.
 * When the reader does not take the food, the form stays open and says so.
 */
export function foodNewShow(element: HTMLElement): void {
    const search: Search | undefined = searches.get(element);
    if (search !== undefined) newFormShow(search, null);
}

/**
 * Opens the form of a food by hand with the cursor in its kcal.
 * While no name is typed the cursor stands in its name.
 * `product` is `null` for a food of my own, which is `Eat` until I change it once saved.
 * - `add`: Sends the food, the form taking no clicks meanwhile, so a double click adds it once.
 */
function newFormShow(search: Search, product: Product | null): void {
    search.results.querySelector(".food-form")?.remove();
    const kind: Kind = product?.kind ?? "Eat";
    const start: Map<string, string> = new Map([
        ["name", product?.name ?? search.input.value.trim()],
        ["brand", product?.brand ?? ""],
        ["store", product?.store ?? ""],
        ["pack", String(product?.pack ?? "")],
        ["portion", String(product?.portion ?? "")],
    ]);
    const form: HTMLElement = elementOf("div", "food-form food-detail", "");
    const facts: HTMLElement = elementOf("div", "food-facts", "");
    const inputs: Map<string, HTMLInputElement> = new Map();
    const error: HTMLElement = elementOf(
        "p",
        "food-error",
        "Not saved: it needs a name, a brand, a store and its kcal, " +
            "numbers only, and no food of mine of this name, brand and store",
    );
    const text: (key: string) => string = (key: string): string => inputs.get(key)?.value.trim() ?? "";
    const close: () => void = (): void => form.remove();
    const add: () => void = (): void => {
        const numbers: (number | null)[] = numbersRead(text);
        const [kcal, protein, carbs, fat, portion, pack]: (number | null)[] = numbers;
        if (
            text("name") === "" ||
            text("brand") === "" ||
            text("store") === "" ||
            kcal === null ||
            numbers.some(Number.isNaN)
        ) {
            error.hidden = false;
            return;
        }
        form.inert = true;
        foodSend({
            name: text("name"),
            kcal: kcal,
            protein: protein,
            carbs: carbs,
            fat: fat,
            barcode: product?.barcode ?? "",
            brand: text("brand"),
            store: text("store"),
            pack: pack,
            portion: portion,
            kind: kind,
        })
            .then((food: Food): void => {
                form.remove();
                addedOf(search)(food);
            })
            .catch((reason: unknown): void => {
                console.error(reason);
                error.hidden = false;
                form.inert = false;
            });
    };

    fieldsOf(kind).forEach(([name, key, unit]: [string, string, string]): void => {
        const label: HTMLElement = elementOf("span", "food-fact", name);
        const input: HTMLInputElement = editFieldOf(start.get(key) ?? "", name, add, close);
        input.className = "food-inline food-inline-new";
        input.inputMode = "text";
        input.placeholder = "";
        label.addEventListener("click", (): void => input.focus());
        inputs.set(key, input);
        facts.append(label, unitFieldOf(input, unit));
    });
    error.hidden = true;
    form.append(facts, editButtonsOf(close, add), error);
    search.results.prepend(form);
    inputs.get(text("name") === "" ? "name" : "kcal")?.focus();
}

/**
 * The line below the products with `More` and how many it shows of how many match.
 * `10.000+` when Open Food Facts gives only a lower bound.
 */
function moreOf(search: Search, shown: number, found: FoodsFound): HTMLElement {
    const line: HTMLElement = elementOf("div", "food-more", "");
    line.append(
        elementOf(
            "span",
            "",
            `${amountOf(shown, 0)} of ${amountOf(Math.max(found.total, shown), 0)}` + `${found.exact ? "" : "+"}`,
        ),
    );
    if (found.more) {
        const more: HTMLButtonElement = buttonOf("food-more-button", "More", (): void => {
            more.disabled = true;
            productsLoad(search, search.page + 1);
        });
        line.append(more);
    }
    return line;
}

/**
 * Finds foods, asking once more when the reader could not answer, as while it starts anew after a change of its code.
 *
 * @throws {Error} - When the reader cannot answer the second time either
 */
async function foodsFindTwice(query: string, page: number, products: boolean): Promise<FoodsFound> {
    try {
        return await foodsFind(query, page, products);
    } catch (error: unknown) {
        console.error(error);
        await new Promise<void>((resolve: () => void): void => {
            window.setTimeout(resolve, restartTime);
        });
        return await foodsFind(query, page, products);
    }
}

/**
 * Searches my foods and shows them at once, then asks Open Food Facts once the typing pauses.
 * Nothing shown when another search was asked or the text changed since, so a late answer never covers a newer one.
 * A search the reader cannot answer twice leaves what is shown, only an empty one says the foods cannot be read.
 * `wait` is {@link pause} while I type, else 0.
 */
function resultsLoad(search: Search, wait: number): void {
    const asked: number = ++search.asked;
    const text: string = search.input.value.trim();
    clearTimeout(search.waiting);
    foodsFindTwice(text, 1, false)
        .then((found: FoodsFound): void => {
            if (asked !== search.asked || search.input.value.trim() !== text) return;
            search.page = 1;
            search.found = found;
            search.loading = search.setup.products && !search.linked && text.length >= searchLength;
            resultsShow(search);
            if (search.loading) search.waiting = window.setTimeout((): void => productsLoad(search, 1), wait);
        })
        .catch((error: unknown): void => {
            console.error(error);
            if (asked !== search.asked) return;
            search.loading = false;
            if (search.found === null)
                search.results.replaceChildren(elementOf("p", "food-none", "The foods cannot be read"));
            else productsShow(search);
        });
}

/**
 * Asks Open Food Facts for a page of products.
 * Nothing shown when another search was asked or the text changed since.
 * Products shown stay when Open Food Facts cannot be reached for a later page.
 */
function productsLoad(search: Search, page: number): void {
    const asked: number = search.asked;
    const text: string = search.input.value.trim();
    const take: (found: FoodsFound) => void = (found: FoodsFound): void => {
        if (asked !== search.asked || search.input.value.trim() !== text || search.found === null) return;
        search.page = page;
        search.loading = false;
        search.found =
            page === 1
                ? { ...found, foods: search.found.foods }
                : {
                      ...found,
                      foods: search.found.foods,
                      products: [...(search.found.products ?? []), ...(found.products ?? [])],
                      more: found.products !== null && found.more,
                  };
        productsShow(search);
    };
    foodsFindTwice(text, page, true)
        .then(take)
        .catch((error: unknown): void => {
            console.error(error);
            take({ ...empty, products: null });
        });
}

/** The food search, Enter searching at once without sending a form around it. */
export function foodSearchOf(setup: SearchSetup): HTMLElement {
    const element: HTMLElement = elementOf("div", "food-search", "");
    const search: Search = {
        input: document.createElement("input"),
        results: elementOf("div", "food-results", ""),
        tail: elementOf("div", "", ""),
        setup: setup,
        page: 1,
        found: null,
        asked: 0,
        loading: false,
        waiting: 0,
        open: "",
        shown: "",
        enter: false,
        asking: "",
        reveal: false,
        linked: false,
        added: [],
    };

    search.input.addEventListener("input", (): void => {
        search.linked = false;
        // A line that says nothing was found told of the text before.
        search.results.querySelectorAll(".food-nothing").forEach((line: Element): void => line.remove());
        resultsLoad(search, pause);
    });
    search.input.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (search.found !== null && search.shown === search.input.value.trim()) {
            firstPick(search);
            return;
        }
        search.enter = true;
        resultsLoad(search, 0);
    });
    bracketsWatch(search.results);
    element.append(
        searchFieldOf(
            search.input,
            setup.meals === null ? "Search foods or a barcode" : "Search meals, foods or a barcode",
        ),
        search.results,
    );
    searches.set(element, search);
    resultsLoad(search, 0);
    return element;
}

/**
 * Shows one of my foods opened, as a click on a food of a meal asks, its name put into the field.
 * The page moves only as far as it needs to show it.
 */
export function foodShow(element: HTMLElement, food: { name: string; brand: string; store: string }): void {
    const search: Search | undefined = searches.get(element);
    if (search === undefined) return;
    search.input.value = food.name;
    search.open = keyOf(food);
    search.linked = true;
    search.reveal = true;
    resultsLoad(search, 0);
}

/** Empties the field of a search, closes a food open, finds my meals anew. */
export function foodSearchClear(element: HTMLElement): void {
    const search: Search | undefined = searches.get(element);
    if (search === undefined) return;
    search.input.value = "";
    search.open = "";
    search.linked = false;
    resultsLoad(search, 0);
}
