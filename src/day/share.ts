/**
 * ## Sharing a change or a removal
 *
 * Asks after I saved a change of an entry whether it goes to the people I share with in its `With`,
 * since after its first copy each of us owns their own entry.
 * It asks only about those in `With` before and after the change, since only they have the entry.
 * As I remove an entry it asks whether theirs goes too, before mine goes, so the reader still knows its `With`.
 * Yes hands the change or the removal to them at once, by `reader/shared.ts`.
 * No, Esc, a click beside the question each keep it mine.
 */

import { iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Check, X } from "lucide";

import type { Attendee } from "../../reader/calendar.ts";

/** The people I share with, as `Persons.md` names them like `With` does, asked once. */
let partners: Promise<string[]> | null = null;

/** Gives the answer to the open question, `null` while none is open. */
let answer: ((share: boolean) => void) | null = null;

function dialogOf(): HTMLDialogElement {
    return document.getElementById("share") as HTMLDialogElement;
}

/** Tells whether a person is in `With`, ignoring case. */
function withIs(people: Attendee[], name: string): boolean {
    return people.some((person: Attendee): boolean => person.name.toLowerCase() === name.toLowerCase());
}

/** The people I share with who are in `With`. */
async function partnersIn(people: Attendee[]): Promise<string[]> {
    partners ??= readerAsk<string[]>("/api/shared/partners");
    return (await partners).filter((partner: string): boolean => withIs(people, partner));
}

/**
 * Asks whether something goes to the people I share with, giving the answer.
 *
 * @param no - What the cross does
 * @param yes - What the check does
 */
function shareAsk(question: string, no: string, yes: string): Promise<boolean> {
    (document.getElementById("share-question") as HTMLElement).textContent = question;
    iconPut(document.getElementById("share-no") as HTMLElement, X, no);
    iconPut(document.getElementById("share-yes") as HTMLElement, Check, yes);
    dialogOf().showModal();
    return new Promise((resolve: (share: boolean) => void): void => {
        answer = resolve;
    });
}

/**
 * Has the reader hand the change or the removal of an entry to the people I share with in its `With`.
 *
 * @throws {Error} - When the reader does not answer
 */
async function shareSend(path: string, id: string): Promise<void> {
    await readerAsk<null>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
    });
}

/**
 * Asks after a change of an entry whether it goes to the people I share with in `With` before and after,
 * and hands it to them on yes.
 *
 * @throws {Error} - When the reader does not answer
 */
export async function changeAsk(id: string, before: Attendee[], after: Attendee[]): Promise<void> {
    const both: string[] = (await partnersIn(before)).filter((partner: string): boolean => withIs(after, partner));
    if (both.length === 0) return;
    if (await shareAsk(`Share this change with ${both.join(" and ")}?`, "Keep it mine", "Share"))
        await shareSend("/api/shared/change", id);
}

/**
 * Asks before an entry is removed whether theirs goes too for the people I share with in its `With`,
 * and has their readers remove it on yes.
 *
 * @throws {Error} - When the reader does not answer
 */
export async function removeAsk(id: string, people: Attendee[]): Promise<void> {
    const all: string[] = await partnersIn(people);
    if (all.length === 0) return;
    if (await shareAsk(`Remove it for ${all.join(" and ")} too?`, "Remove only mine", "Remove theirs too"))
        await shareSend("/api/shared/remove", id);
}

export function shareStart(): void {
    dialogOf().addEventListener("close", (): void => {
        answer?.(dialogOf().returnValue === "yes");
        answer = null;
        dialogOf().returnValue = "";
    });
}
