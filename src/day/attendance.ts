/**
 * ## Attendance
 *
 * Makes the rows `With` and `Online` of the dialog of an entry, see `./categories.ts`,
 * and of the dialog of a series, see `./series.ts`, alike:
 * who I am with, see {@link withRowOf},
 * and what I did online, see {@link onlineRowOf};
 * each dialog gives its field and takes what is picked.
 *
 * - `./choices.ts`: Pickers, each one line in a row with its name, its list on top,
 *   and the parts of a field.
 * - `./entries.ts`: Gives the standard address of a name.
 * - `./places.ts`: Sends a platform to `Online.md`.
 * - `../persons.ts`: The people of `Persons.md`, which `With` offers,
 *   each a link to its row there.
 * - `../icons.ts`: Shows the pencil of a person and of a platform.
 * - `lucide`: The icon of the pencil.
 */

import { choiceOf, choicesOf, partFieldOf, partOf, rowOf, searchOf } from "./choices.ts";
import { standardAddressOf } from "./entries.ts";
import { platformSend } from "./places.ts";
import { personEditOf, personOf, personRowAddressOf } from "../persons.ts";
import { iconPut } from "../icons.ts";
import { Pencil } from "lucide";

import type { Category, Field } from "./categories.ts";
import type { Choice, ChoicesSetup } from "./choices.ts";
import type { PersonEdit } from "../persons.ts";
import type { Platform } from "../../reader/places.ts";
import type { Attendee, Online } from "../../reader/calendar.ts";
import type { Person } from "../../reader/persons.ts";

/**
 * How a row `With` is built,
 * see {@link withRowOf}, the same in the dialog of an entry, see `./categories.ts`,
 * and in that of a series, see `./series.ts`;
 * only what it saves differs.
 *
 * - `field`: The field `With`, the names my entries wrote, the most used first,
 *   with the address of each.
 * - `persons`: The people of `Persons.md`, which it offers, each a link to its row there.
 * - `people`: Who is picked, each with its address.
 * - `open`: The people whose parts show below the names.
 * - `edits`: Each person I changed by its parts, which the row fills as I type,
 *   see {@link withPartsOf}, and its dialog sends once it saves,
 *   see `personsRename` in `../persons.ts`.
 * - `opened`: Takes whose parts show,
 *   as the pencil of a person opens or closes its parts.
 * - `pick`: Takes who is picked, each with its address,
 *   after each name picked or taken back and each mail typed.
 */
export type WithSetup = {
    field: Field;
    persons: Person[];
    people: Attendee[];
    open: string[];
    edits: { [old: string]: PersonEdit & { address: string } };
    opened: (open: string[]) => void;
    pick: (people: Attendee[]) => void;
};

/**
 * Builds the parts below the names of `With`, see {@link withRowOf},
 * as the parts of a place stand, see {@link partOf}:
 * for each person picked whose pencil opened them a block of its own,
 * indented with its thin grey line, so several people never crowd one another,
 * like the two lecturers of Financial Accounting:
 * its `Name`, its `Title`, like `Prof. Dr.` or `Speaker`, its `Mail` and its `Link`,
 * its page in TUMonline, as `Persons.md` holds them,
 * or as I changed them, see `personEditOf` in `../persons.ts`.
 * What I type goes into the edits of the dialog,
 * which writes the person everywhere once it saves, its row in `Persons.md`,
 * the columns that name people and every entry;
 * the mail is also the address of the person in this entry,
 * an empty one the name's standard address, see `standardAddressOf` in `./entries.ts`.
 * - `edit`: The person as it shows, as I changed it or as it is.
 * - `name`, `title`, `mail`, `link`: Fields of its parts.
 * - `take`: Takes what is typed into the edits and the address into the entry.
 * - `block`: The block of the person.
 *
 * @param setup - The row, its people of `Persons.md` and its edits
 * @param people - Who is picked,
 *   like `Ernstberger, Jürgen` and `Cuzic, Mihovil`, each with its address
 * @param typed - Takes a name with the address typed for it
 * @returns The block of each person
 */
function withPartsOf(
    setup: WithSetup,
    people: Attendee[],
    typed: (name: string, address: string) => void,
): HTMLElement[] {
    return people.map((person: Attendee): HTMLElement => {
        const edit: PersonEdit =
            setup.edits[person.name] ??
            personEditOf(setup.persons, person.name, person.address);
        const name: HTMLInputElement = partFieldOf(
            "text",
            edit.name,
            `Name of ${person.name}`,
        );
        const title: HTMLInputElement = partFieldOf(
            "text",
            edit.title,
            `Title of ${person.name}`,
        );
        const mail: HTMLInputElement = partFieldOf(
            "email",
            edit.mail,
            `Mail of ${person.name}`,
        );
        const link: HTMLInputElement = partFieldOf(
            "url",
            edit.link,
            `Link of ${person.name}`,
        );
        const take: () => void = (): void => {
            setup.edits[person.name] = {
                name: name.value.trim(),
                title: title.value.trim(),
                mail: mail.value.trim(),
                link: link.value.trim(),
                address: person.address,
            };
            typed(
                person.name,
                mail.value.trim() === ""
                    ? standardAddressOf(person.name)
                    : mail.value.trim(),
            );
        };
        [name, title, mail, link].forEach((input: HTMLInputElement): void =>
            input.addEventListener("input", take),
        );
        const block: HTMLElement = document.createElement("div");
        block.className = "field-parts";
        block.append(
            partOf("Name", name),
            partOf("Title", title),
            partOf("Mail", mail),
            partOf("Link", link),
        );
        return block;
    });
}

/**
 * Builds the search of the list of `With`:
 * while nothing is typed only my own people,
 * those of `Persons.md` named `Family, …` or `Group, …`,
 * like `Family, Sopha` or `Group, Kicktipp`, the most used first,
 * not the lecturers an imported lecture names;
 * as I type every name my entries wrote, the most used first,
 * each as `Persons.md` names its person,
 * like `Zimmer, Philip` for an older `Philip Zimmer`,
 * see `personOf` in `../persons.ts`, and every person of `Persons.md` after them,
 * like `bich` finding `Bichler, Martin`,
 * as a field of a place offers the rooms, see `placeSearchOf` in `./categories.ts`.
 * - `used`: The names my entries wrote, as `Persons.md` names their people.
 * - `all`: Those and every person of `Persons.md`, each once.
 * - `shown`: Names the search looks through.
 *
 * @param field - The field `With`
 * @param people - The people of `Persons.md`
 * @returns Search for the picker
 */
function withSearchOf(
    field: Field,
    people: Person[],
): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const used: string[] = field.values.map(
            (name: string): string => personOf(people, name)?.name ?? name,
        );
        const all: string[] = [
            ...new Set([...used, ...people.map((person: Person): string => person.name)]),
        ];
        const shown: string[] =
            text.trim() !== ""
                ? all
                : all.filter((name: string): boolean => /^(Family|Group), /.test(name));
        return await searchOf(shown.map(choiceOf))(text);
    };
}

/**
 * Gives how the list of `With` works,
 * see {@link withRowOf}, the one list of who I am with,
 * in its row and after the times of an exam added in the dialog of a series,
 * see `peopleRowsOf` in `./series.ts`: my own people, `Family, …` and `Group, …`,
 * as I type every name my entries wrote and every person of `Persons.md`,
 * see {@link withSearchOf}, several of them, a typed name added as `Persons.md` names it,
 * but none with `;`, and each name of a person there a link to its row.
 * - `person`: The person of `Persons.md` a name names, `undefined` for none.
 *
 * @param field - The field `With`
 * @param persons - The people of `Persons.md`
 * @returns How the list works, but what is picked
 */
export function withChoicesOf(
    field: Field,
    persons: Person[],
): Omit<ChoicesSetup, "picked" | "pick"> {
    return {
        search: withSearchOf(field, persons),
        many: true,
        adding: true,
        add: async (name: string): Promise<string | null> =>
            name.includes(";")
                ? null
                : (personOf(persons, name.trim())?.name ?? name.trim()),
        noun: "person",
        linkOf: (name: string): string => {
            const person: Person | undefined = personOf(persons, name);
            return person === undefined ? "" : personRowAddressOf(person);
        },
    };
}

/**
 * Builds the row of `With`, who I was with,
 * one or more people or groups, mostly one group,
 * like `Socials`, sometimes several,
 * like `Bichler, Martin · Willi`, the one maker of this dialog and of that of a series,
 * see {@link WithSetup}: one line of the row, the names picked apart by a middle dot,
 * since a person of `Persons.md` holds a comma in its name,
 * see `dottedOf` in `../persons.ts`, going on over the next line where it is too long;
 * a name of a person there, also an older
 * one spoken, like `Philip Zimmer`, is a link in the line to its row there,
 * see `personOf` in `../persons.ts`, any other name plain text.
 * Its list offers my own people, `Family, …` and `Group, …` of `Persons.md`,
 * and as I type every name my earlier entries wrote and every person of `Persons.md`,
 * see {@link withSearchOf}, takes a name or takes it back by a click
 * and stays open for the next,
 * and adds a typed name, `Search or add a person`, a person as `Persons.md` names it,
 * like `Bichler, Martin` for a typed `Martin Bichler`,
 * but none with `;`, which parts names;
 * right after each name its own pencil,
 * which shows below the line the parts of that person to change,
 * its name, its mail and its link,
 * see {@link withPartsOf}, or hides them again. A name picked anew takes
 * the address it had, else that of its last entry, else its standard one,
 * see `standardAddressOf` in `./entries.ts`.
 * - `people`: Who is picked, in their order, each with its address.
 * - `open`: The people whose parts show.
 * - `parts`: The parts of the people below the names, of each whose pencil opened them.
 * - `show`: Shows the parts of who is picked and opened.
 * - `pencilOf`: Makes the pencil of a person, `✎`, which opens or closes its parts.
 *
 * @param setup - What it shows and what it saves into
 * @returns Its row
 */
export function withRowOf(setup: WithSetup): HTMLElement {
    let people: Attendee[] = setup.people;
    let open: string[] = setup.open;
    const parts: HTMLElement = document.createElement("div");
    const show: () => void = (): void => {
        const shown: Attendee[] = people.filter((person: Attendee): boolean =>
            open.includes(person.name),
        );
        parts.hidden = shown.length === 0;
        parts.replaceChildren(
            ...withPartsOf(setup, shown, (name: string, address: string): void => {
                people = people.map((other: Attendee): Attendee =>
                    other.name === name ? { name: name, address: address } : other,
                );
                setup.pick(people);
            }),
        );
    };
    const pencilOf: (name: string) => HTMLElement = (name: string): HTMLElement => {
        const pencil: HTMLButtonElement = document.createElement("button");
        pencil.type = "button";
        pencil.className = "entry-pencil";
        iconPut(pencil, Pencil, `Change ${name}`);
        pencil.addEventListener("click", (event: MouseEvent): void => {
            event.stopPropagation();
            open = open.includes(name)
                ? open.filter((other: string): boolean => other !== name)
                : [...open, name];
            setup.opened(open);
            show();
            if (open.includes(name))
                parts
                    .querySelector<HTMLInputElement>(
                        `input[aria-label="Name of ${CSS.escape(name)}"]`,
                    )
                    ?.focus();
        });
        return pencil;
    };
    parts.className = "people-parts";
    parts.dataset.field = setup.field.key;
    show();
    return rowOf(
        setup.field.name,
        choicesOf({
            ...withChoicesOf(setup.field, setup.persons),
            picked: people.map((person: Attendee): string => person.name),
            afterOf: pencilOf,
            below: [parts],
            pick: (names: string[]): void => {
                people = names.map(
                    (name: string): Attendee =>
                        people.find(
                            (person: Attendee): boolean => person.name === name,
                        ) ?? {
                            name: name,
                            address: setup.field.links[name] ?? standardAddressOf(name),
                        },
                );
                show();
                setup.pick(people);
            },
        }),
    );
}

/**
 * How a row `Online` is built,
 * see {@link onlineRowOf}, the same in this dialog
 * and in that of a series, see `./series.ts`;
 * only what it saves differs.
 *
 * - `field`: The field `Online`, my platforms of `Online.md`,
 *   the most used first, with the row of each.
 * - `categories`: The categories whose fields `Online` take a platform
 *   as the reader wrote it,
 *   see {@link platformTake}.
 * - `online`: The platform picked, the link,
 *   the channel and the title of its meeting or video.
 * - `open`: Whether its parts show below it.
 * - `opened`: Takes whether its parts show, as its pencil opens or closes them,
 *   or a new platform opens them.
 * - `pick`: Takes the platform, the channel,
 *   the title and the link, after each platform picked,
 *   added or renamed and each channel, title and link typed.
 */
export type OnlineSetup = {
    field: Field;
    categories: Category[];
    online: Online;
    open: boolean;
    opened: (open: boolean) => void;
    pick: (online: Online) => void;
};

/**
 * Builds the row of `Online`, what the entry did online,
 * a sibling of its place that works like it,
 * since a place is only where I physically am,
 * see `fieldRowsOf` in `./categories.ts`,
 * the one maker of the dialog of an entry and of that of a series,
 * see {@link OnlineSetup}: one line showing its platform, like `YouTube`,
 * whose list offers my platforms of `Online.md`, the most used first, searched as I type,
 * and adds a typed name as a new platform,
 * see `platformSend` in `places.ts`, its parts then open;
 * beside it the pencil while a platform is picked, which shows and hides its parts;
 * below it, as a place shows its address, small and grey, its parts that have a value:
 * who offers it, from `Online.md`, and the channel and the title of its meeting or video,
 * joined by commas, a link that opens the link of its meeting or video,
 * else the web app of its row, never the link itself as text,
 * `Link` while nothing else shows.
 * Its parts, indented as those of a place, see {@link partOf},
 * the link last, as in every field,
 * since a click on what shows opens it: `Label`, its name,
 * which renames it, and `Provider`,
 * which change its row of `Online.md` as I leave them, a new name showing the row anew;
 * then the channel, the title and the link of the entry's own meeting or video,
 * the link holding the web app of its row, as the link of a place holds its own,
 * until I type the entry's own in its place, which alone is kept;
 * all three go along when the entry is saved.
 * Another platform picked empties all three, as a new meeting.
 * - `online`, `open`: What is picked and whether its parts show.
 * - `line`: The parts with a value below the platform.
 * - `label`, `provider`, `channel`, `title`, `link`:
 *   Fields of the name, the provider, the channel, the title and the link.
 * - `hint`: Line saying that the reader did not take the name or the provider.
 * - `parts`: The parts to type, shown while the pencil opened them.
 * - `show`: Shows the pencil, the line and the parts for the platform picked.
 * - `take`: Takes what is picked and typed, shows it and saves it into the setup.
 * - `write`: Sends the name and the provider as typed and takes the platform as written.
 *
 * @param setup - What it shows and what it saves into
 * @returns Its row
 */
export function onlineRowOf(setup: OnlineSetup): HTMLElement {
    const field: Field = setup.field;
    let online: Online = setup.online;
    let open: boolean = setup.open;
    const pencil: HTMLButtonElement = document.createElement("button");
    const line: HTMLAnchorElement = document.createElement("a");
    const label: HTMLInputElement = partFieldOf(
        "text",
        online.online,
        "Label of the platform",
    );
    const provider: HTMLInputElement = partFieldOf(
        "text",
        "",
        "Provider of the platform",
    );
    const channel: HTMLInputElement = partFieldOf(
        "text",
        online.onlineChannel,
        "Channel online",
    );
    const title: HTMLInputElement = partFieldOf(
        "text",
        online.onlineTitle,
        "Title online",
    );
    const link: HTMLInputElement = partFieldOf("url", online.onlineLink, "Link online");
    const hint: HTMLParagraphElement = document.createElement("p");
    const parts: HTMLElement = document.createElement("div");
    const show: () => void = (): void => {
        const platform: Platform | undefined = field.platforms[online.online];
        const target: string =
            online.onlineLink !== "" ? online.onlineLink : (platform?.link ?? "");
        line.textContent =
            [platform?.provider ?? "", online.onlineChannel, online.onlineTitle]
                .filter((part: string): boolean => part !== "")
                .join(", ") || (target === "" ? "" : "Link");
        if (target !== "") line.href = target;
        else line.removeAttribute("href");
        line.hidden = online.online === "" || line.textContent === "";
        pencil.hidden = online.online === "";
        parts.hidden = !open || online.online === "";
        if (label !== document.activeElement) label.value = online.online;
        if (provider !== document.activeElement)
            provider.value = platform?.provider ?? "";
        if (link !== document.activeElement) link.value = target;
    };
    const take: (next: Online) => void = (next: Online): void => {
        online = next;
        show();
        setup.pick(online);
    };
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, "Change online");
    pencil.addEventListener("click", (): void => {
        open = !open;
        setup.opened(open);
        show();
        if (open) parts.querySelector("input")?.focus();
    });
    line.className = "entry-address";
    line.target = "_blank";
    line.rel = "noopener";
    hint.className = "entry-none";
    hint.textContent = "Not saved: it needs a new name";
    hint.hidden = true;
    parts.className = "field-parts";
    parts.dataset.field = field.key;
    parts.append(
        partOf("Label", label),
        partOf("Provider", provider),
        partOf("Channel", channel),
        partOf("Title", title),
        partOf("Link", link),
        hint,
    );
    const write: () => void = (): void => {
        const old: string = online.online;
        platformSend(
            {
                name: label.value,
                provider: provider.value,
                link: field.platforms[old]?.link ?? "",
            },
            old,
        )
            .then((platform: Platform): void => {
                platformTake(setup.categories, platform, old);
                hint.hidden = true;
                take({ ...online, online: platform.name });
                if (platform.name !== old)
                    row.replaceWith(
                        onlineRowOf({ ...setup, online: online, open: open }),
                    );
            })
            .catch((error: unknown): void => {
                console.error(error);
                hint.hidden = false;
            });
    };
    label.addEventListener("change", write);
    provider.addEventListener("change", write);
    link.addEventListener("input", (): void => {
        take({
            ...online,
            onlineLink:
                link.value.trim() === (field.platforms[online.online]?.link ?? "")
                    ? ""
                    : link.value.trim(),
        });
    });
    channel.addEventListener("input", (): void => {
        take({ ...online, onlineChannel: channel.value.trim() });
    });
    title.addEventListener("input", (): void => {
        take({ ...online, onlineTitle: title.value.trim() });
    });
    show();
    const row: HTMLElement = rowOf(
        field.name,
        choicesOf({
            search: searchOf(field.values.map(choiceOf)),
            picked: online.online === "" ? [] : [online.online],
            many: false,
            adding: true,
            noun: "platform",
            aside: [pencil],
            below: [line, parts],
            add: async (name: string): Promise<string | null> => {
                if (name.trim() === "") return null;
                const platform: Platform = await platformSend(
                    { name: name, provider: "", link: "" },
                    "",
                );
                platformTake(setup.categories, platform, "");
                if (!field.values.includes(platform.name))
                    field.values.push(platform.name);
                open = true;
                setup.opened(open);
                return platform.name;
            },
            pick: (picked: string[]): void => {
                const platform: string = picked[0] ?? "";
                if (platform !== online.online) {
                    channel.value = "";
                    title.value = "";
                }
                take(
                    platform === online.online
                        ? online
                        : {
                              online: platform,
                              onlineLink: "",
                              onlineChannel: "",
                              onlineTitle: "",
                          },
                );
            },
        }),
    );
    return row;
}

/**
 * Takes a platform as the reader wrote it into the field `Online` of every category,
 * since the platforms are one list:
 * each offers its new name in place of its old one, with its row;
 * entries written before keep what they have.
 *
 * @param categories - The categories of the dialog of an entry or of a series
 * @param platform - The platform as written
 * @param old - Its name as it was, empty for a new one
 */
function platformTake(categories: Category[], platform: Platform, old: string): void {
    categories
        .flatMap((category: Category): Field[] => category.fields)
        .filter((field: Field): boolean => field.key === "online")
        .forEach((field: Field): void => {
            field.values = field.values.map((value: string): string =>
                value === old ? platform.name : value,
            );
            delete field.platforms[old];
            field.platforms[platform.name] = platform;
        });
}
