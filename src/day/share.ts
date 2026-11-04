/**
 * ## Sharing a change
 *
 * Asks after I saved a change of an entry whether it goes to the people I share with in its `With`,
 * since after its first copy each of us owns their own entry.
 * It asks only about those in `With` before and after the change, since only they have the entry.
 * Yes hands the entry as it is now to them at once, by `reader/shared.ts`.
 * No, Esc, a click beside the question each keep the change mine.
 */

import { iconPut } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { Check, X } from "lucide";

import type { Attendee } from "../../reader/calendar.ts";

/** The people I share with, as the reader names them, asked once. */
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

/** Asks whether the change goes to these people, giving the answer. */
function shareAsk(names: string[]): Promise<boolean> {
    (document.getElementById("share-question") as HTMLElement).textContent =
        `Share this change with ${names.join(" and ")}?`;
    dialogOf().showModal();
    return new Promise((resolve: (share: boolean) => void): void => {
        answer = resolve;
    });
}

/**
 * Asks after a change of an entry whether it goes to the people I share with in `With` before and after,
 * and hands it to them on yes.
 *
 * @throws {Error} - When the reader does not answer
 */
export async function changeAsk(id: string, before: Attendee[], after: Attendee[]): Promise<void> {
    partners ??= readerAsk<string[]>("/api/shared/partners");
    const both: string[] = (await partners).filter(
        (partner: string): boolean => withIs(before, partner) && withIs(after, partner),
    );
    if (both.length === 0 || !(await shareAsk(both))) return;
    await readerAsk<null>("/api/shared/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
    });
}

export function shareStart(): void {
    iconPut(document.getElementById("share-no") as HTMLElement, X, "Keep it mine");
    iconPut(document.getElementById("share-yes") as HTMLElement, Check, "Share");
    dialogOf().addEventListener("close", (): void => {
        answer?.(dialogOf().returnValue === "yes");
        answer = null;
        dialogOf().returnValue = "";
    });
}
