/**
 * ## Series
 *
 * The one form of a series of my course, the lectures, exercises,
 * tutorials and sheets of a module in a semester, see `reader/course.ts`, wherever I change it:
 * from the day, by the series icon ⟳ after the times in the dialog of a box of it,
 * see `./categories.ts`, and from the page of its module,
 * by the pencil of its card or the plus of a new series, see `../editor/course.ts`;
 * the same dialog in both places, {@link seriesOpen},
 * so changing a series here or there is one and the same;
 * and new from nothing by `⟳` beside `+` of the plan, see {@link seriesNew},
 * so making a series is the same too. Opened from
 * the dialog of a box, by that pencil, it opens over that dialog: closing it goes back one level,
 * to that dialog as it was, and saving it closes both;
 * opened from the page of a module, it simply closes.
 * It looks like the dialog of an entry, one row per field, see `./choices.ts`:
 * its summary, what the series is,
 * as its boxes are written and as the dialog of one of them names it, like
 * `IN2028_BusinessAnalyticsMachineLearning (VO)`, the folder they link small and grey below it,
 * see {@link seriesRowOf}, its type picked for a new one;
 * of a skill its semester, picked as in the dialog, which picks the series of that semester,
 * see {@link semesterRowOf};
 * then its place, picked as in the dialog, the rooms of the university among them as I type,
 * its parts changed by its pencil, see {@link placeRowOf};
 * what it does online, its platform with the channel, the title and the link of its meetings;
 * then when it meets: its days, its weekdays picked on one line, each with its times below,
 * see {@link slotRowsOf}, like a lecture on Mondays 14:00 – 16:00 and on Thursdays 10:00 – 12:00,
 * numbered across both; its first and last day;
 * of a numbered type its group, empty for my own series;
 * then its boxes, see below, which also add an extra,
 * a single date besides its weeks with its times; and who I am with.
 * At the bottom the plan it writes into, small and grey, Cancel and Save.
 * Nothing is written before I save:
 * then the reader changes only open boxes from today on, a box done, skipped,
 * cancelled or pushed staying as it is, but for the times I typed for a box,
 * which every box takes but one pushed, and numbers the series anew,
 * see `seriesApply` in `reader/course.ts`,
 * and writes the place everywhere when I changed its parts, see {@link placeRename}.
 * The exams of a module, single dates the reader reads back as no series,
 * open in the same dialog from the pencil of their card, see {@link examRuleOf},
 * and from `⟳` with the exams picked, see {@link seriesNew}:
 * only what they are and their boxes, the list open,
 * each exam with its kind where a box of a series has its number, picked from a small menu,
 * see {@link kindMenuOf}, and with its times, `+` adding one more,
 * which saving adds as an exam alone with the kind I picked.
 * Of a numbered type of a module the row `Semester` has the group beside the semester,
 * as the summary has the type beside the skill, see {@link semesterRowOf}:
 * of my series the menu of the groups of the type in the semester, my group pinned,
 * a pick making a group mine, see {@link groupPickOf}, each group with its ⟳,
 * which opens it in this same form, and right after the menu a plus,
 * which opens a new group, its name typed there, like `5` for `Group 05`, see {@link groupPartOf};
 * closing, saving or removing the group goes back to my series, see {@link groupReturn}.
 * While no group is mine, my series shows the same rows, in the same places, empty and locked,
 * since its place, days and people come from the group, its dates as far as known,
 * and my boxes there, which no pin changes,
 * see {@link groupWaits} and {@link keptOf}; the first group
 * made while none is mine becomes mine as it is saved.
 * So I make the groups of my tutorials by hand as the university lists them, with the same rows:
 * what it is, its place, what it does online, its days, each a weekday with its times, its weeks,
 * its sessions, of which `⋯` cancels one and whose pencil changes one alone,
 * another room or time that day, see {@link sessionRowOf}, and its tutors in `With`;
 * saved, the reader writes it as one weekly to-do per weekday,
 * its past kept and a change going on from today,
 * and my open boxes that go to it take its sessions anew, see `groupApply` in `reader/course.ts`.
 * A group there opens in the same form, see {@link groupOpen}, from the menu of the groups,
 * see `./groups.ts`, its group fixed, a bin at the left of Cancel, see {@link seriesBinOf}.
 * Which group is mine I pick in the menu beside the semester or on the page of the module.
 * Enter confirms only its field, Ctrl+Enter saves, Escape and a click beside it cancel.
 *
 * The boxes a series makes stay one calm line, see {@link previewSoon},
 * as the reader would write them, anew a moment after each change, in the row `Entries`,
 * without a fold arrow, since a tap on it opens: how many, by the icon of a calendar,
 * then grey what a change does, like `1 new · 2 changed`,
 * and how many happen and how many not, each by the icon of its state, also at none,
 * like `14 · ✓ 1 · ✗ 2 · → 0`, the check for those done, the cross for those skipped or cancelled,
 * the arrow for those pushed, their first and last day already in `Dates`;
 * a tap on it opens them below it as a list by month,
 * the month short where the names of the rows stand,
 * like `Oct 2026`, each box one row built by the same code
 * as a row of a card on the page of its module, see `./rows.ts`, so both look and work alike:
 * its number in a small grey box, `–` for one the university cancelled,
 * a button that opens the box there already in the dialog of an entry over this one,
 * see {@link boxShow}, where everything of it changes as in the plan, its day moved a push;
 * its day, like `16.10.2026 (Fri)`,
 * of my tutorials its group with the menu of the groups of its week;
 * grey its times and its place, or what it does online, and right below them who I am with;
 * what the change does to it, `extra` for an extra;
 * at its right edge of a box there already its actions as in the plan, log, move, cancel, skip,
 * each done at once, or the icon of its state, which takes it back;
 * of a box not written yet `Cancel`, which marks it cancelled by the university, a new one too,
 * so a date that does not take place stays, without number,
 * and `Remove` for an extra, one typed by mistake, both kept in the form until I save.
 * A day the university does not teach has no box and shows not,
 * see `lectureFreeOf` in `reader/course.ts`.
 * `+` below the list adds an extra, its day to type, the times of the series to change,
 * numbered by its day as every box, see `numbersOf` in `reader/course.ts`.
 * Once a box changed, by its actions or in its dialog, the list shows anew,
 * see {@link seriesRefresh}.
 * A new series from nothing, by `⟳`,
 * see {@link seriesNew}, first asks on top what it is,
 * its category and of a skill its skill and type:
 * of a numbered type of a module it becomes the series of its type,
 * the one there already opening instead,
 * see {@link seriesRepeat}, of the exams the exams of its module,
 * of anything else a plain series, see below;
 * it starts on the day shown.
 * Every other series is a plain one, one to-do that repeats by its rule, see `reader/rules.ts`,
 * like my sleep of every night: the same dialog without numbers, types and groups,
 * see {@link plainOpen}: its category, its summary, picked as in the dialog of a box,
 * see {@link plainSummaryOf},
 * which every box of it takes, its place, what it does online,
 * its weekdays picked as every series picks them, each with its times,
 * see {@link slotRowsOf}, or `Month` after them for once a month,
 * on the day of the month of its first day, like my rent on the first, see {@link monthly},
 * or `Year` for once a year, on the day and month of its first day, see {@link yearly};
 * a series written per time, or, by the switch beside them,
 * only how long they last, like `08:00` for my sleep, see {@link plainTimeRowsOf},
 * since a rule has one time;
 * its first day and its last, empty for a series without end, who I am with,
 * and its boxes of the next weeks as the reader would write them.
 * Saved, the past of a series never changes, see `plainApply` in `reader/rules.ts`:
 * one lying wholly ahead is written whole, also every day of it changed alone;
 * one that began before today ends yesterday and goes on with a new one from today;
 * a summary changed alone renames it whole, past days and the series it goes on from too.
 * The dialog of one of its boxes changes that box alone.
 * A series there already has its bin at the left of Cancel, see {@link seriesBinOf};
 * a new one comes from nothing by `⟳` beside `+` of the plan,
 * its category and summary picked on top, see {@link seriesNew}.
 *
 * - `./choices.ts`: The dashboard's own pickers, the rows of a form,
 *   the parts of a field and the file of the plan.
 * - `./times.ts`: Starts the fields of times and days, reads and writes times, days and lengths,
 *   and makes the switch between times and a length.
 * - `./places.ts`: Gives the name, the address and the parts of a place, its choice in a list,
 *   changes a place everywhere.
 * - `./entries.ts`: Adds an exam as a box and a new box repeated once per date of its days,
 *   logs a box of the list, takes it back, skips it and cancels it.
 * - `./categories.ts`: Makes the rows `Online` and `With`, the same as in the dialog of an entry;
 *   opens a box of the list in the dialog of an entry, and gives the calendar it writes with.
 * - `./actions.ts`: Makes the actions of an open box of the list, as in the plan.
 * - `./boxes.ts`: Loads the boxes of the days of the list.
 * - `./groups.ts`: Makes the group of a box of the list with the menu of the groups of its week.
 * - `./rows.ts`: Makes the row of a box of the list, its number and its times,
 *   as every list of boxes has them.
 * - `../skill/attempts.ts`: Writes a date as a day, and names the category of skill boxes.
 * - `../food/foods.ts`: Makes elements.
 * - `../icons.ts`: Puts the icons into the buttons,
 *   the plus that adds and the cross that takes back, makes the chevron of the kind of an exam,
 *   and the plain question mark of the bin of a group.
 * - `../menu.ts`: Opens the menu of the kinds of an exam in its place and look.
 * - `../reader.ts`: Asks the reader.
 * - `../skill/links.ts`: Shows the folder the boxes of a series link below its summary.
 * - `../persons.ts`: The people of `Persons.md`, which `With` offers.
 * - `lucide`: The icons of the states of a box,
 *   of removing an extra, of `+`, of the pencils of the place and the group, of the bin of a group,
 *   of Cancel and of Save, and the chevron and the check of the menu of the kinds.
 * - `./series.css`: Look of the rows, of the boxes and of the dialog.
 */

import {
    breakableOf,
    choiceOf,
    choicesOf,
    fileShow,
    pairOf,
    partFieldOf,
    rowOf,
    searchOf,
} from "./choices.ts";
import {
    boxTimesOf,
    dateFieldStart,
    dateParse,
    lengthSwapOf,
    lengthTextOf,
    minutesOf,
    rangeDash,
    timeFieldRead,
    timeFieldStart,
    timeOf,
    weekdayDateTextOf,
} from "./times.ts";
import {
    addressOf,
    labelOf,
    lineOf,
    placeAddressOf,
    placeChoiceOf,
    placeEditOf,
    placeOf,
    renameSend,
    standardFirst,
} from "./places.ts";
import {
    boxAdd,
    boxDrop,
    boxLog,
    boxRepeat,
    boxSubmit,
    boxUndo,
    boxUniversity,
} from "./entries.ts";
import {
    boxOpenEdit,
    dayCalendarOf,
    entryBoxOf,
    entryOpenFromBox,
    topicFileOf,
    onlineRowOf,
    withRowOf,
} from "./categories.ts";
import { boxActionsOf } from "./actions.ts";
import { boxesFetch } from "./boxes.ts";
import { boxGroupOf, pinnedMenuOf } from "./groups.ts";
import { whereLinkedOf } from "./places.ts";
import { listRowOf, numberOf, rowTimesOf } from "./rows.ts";
import { dayOf, semesterOf, skillName } from "../skill/attempts.ts";
import { semestersOf, skillNamesOf, skillPairOf } from "./skill.ts";
import { elementOf } from "../food/foods.ts";
import {
    crossPut,
    iconOf,
    iconPut,
    iconWordsOf,
    plusPut,
    QuestionMark,
} from "../icons.ts";
import { menuAnchor, menuItemOf } from "../menu.ts";
import { readerAsk } from "../reader.ts";
import { folderLinkShow, modulesFolder } from "../skill/links.ts";
import { personsKept, personsRename } from "../persons.ts";
import {
    ArrowRight,
    Calendar,
    CalendarMinus,
    CalendarOff,
    Check,
    ChevronDown,
    Pencil,
    Plus,
    Trash,
    X,
} from "lucide";
import "./series.css";

import type { Box, BoxState, PlanDay } from "./boxes.ts";
import type { Category, Field } from "./categories.ts";
import type { Choice } from "./choices.ts";
import type { Attendee, BoxFields, Online } from "./entries.ts";
import type { Place } from "./places.ts";
import type { Person, PersonEdit } from "../persons.ts";
import type { ModuleType } from "./skill.ts";
import type { IconNode } from "lucide";
import type { Calendar as DayCalendar } from "fullcalendar";

/**
 * A slot of a series, one weekday with its times, as the reader takes it,
 * see `Slot` in `reader/course.ts`.
 *
 * - `weekday`: Its weekday, from 1 for Monday to 7 for Sunday, 0 while none is picked.
 * - `start`, `end`: Its times in Berlin time, like `14:00` and `16:00`, empty for none.
 * - `minutes`: Of a slot of a course or a group by its length, without times, how long it lasts,
 *   like 120, 0 while not typed; none for a slot with times, see {@link courseSwapOf}.
 */
export type Slot = {
    weekday: number;
    start: string;
    end: string;
    minutes?: number;
};

/**
 * An extra of a series, a single date besides its weeks, as the reader takes it,
 * see `Extra` in `reader/course.ts`.
 *
 * - `day`: Its day, like `2026-11-14`, empty while not typed as a day.
 * - `start`, `end`: Its times in Berlin time, like `10:00` and `12:00`, empty for none.
 */
export type Extra = {
    day: string;
    start: string;
    end: string;
};

/**
 * The dates of the slots of a series with times of their own, other than those of their slot,
 * by their days, like `2026-10-30` with `14:00` and `17:00`, as the reader takes them,
 * see `Times` in `reader/course.ts`.
 */
export type Times = { [day: string]: Pick<Slot, "start" | "end"> };

/**
 * The days of a series as typed so far, see the top of this file.
 *
 * - `slots`: Its weekdays with their times, in the order of their rows.
 * - `before`: For each slot,
 *   the weekday of the slot of the series as read back whose boxes it takes, 0 for a slot added,
 *   all of them 0 for a new series, see `before` of `SeriesChange` in `reader/course.ts`.
 * - `extras`: Its single dates besides its weeks, in the order of their rows.
 * - `first`, `last`: Its first and last day, like `2026-10-19`, empty while not typed as a day.
 * - `times`: The dates of its slots with times of their own,
 *   see {@link Times}, typed in the list of its boxes;
 *   of the exams, see {@link examRuleOf}, the exams I gave other times.
 */
export type Days = {
    slots: Slot[];
    before: number[];
    extras: Extra[];
    first: string;
    last: string;
    times: Times;
};

/**
 * A box of a series, as the reader sends it for the preview, see `Planned` in `reader/course.ts`:
 * its identifier, empty for a new one, its day, its time as ISO instant, empty for none,
 * and its length in minutes, `null` for none, its number,
 * like `2`, `NONE` for one the university cancelled, of an exam its kind,
 * like `Endterm`, empty for none, its state, `new` for a new one,
 * `university` for a new one I cancelled, whether I pushed it,
 * whether I may skip it or mark it cancelled,
 * whether I may give it other times, what the change does to it, who I am with,
 * like a tutor or the lecturers,
 * of a plain series whether it is a day of another series of its chain, only shown,
 * and of a session of a group the university changed alone its own room with its link.
 */
export type Planned = {
    id: string;
    day: string;
    time: string;
    minutes: number | null;
    number: string;
    state: BoxState | "new";
    pushed: boolean;
    editable: boolean;
    retimable: boolean;
    change: "new" | "changed" | "renumbered" | "removed" | "";
    attendees: Attendee[];
    chained?: boolean;
    location?: string;
    locationLink?: string;
};

/**
 * The state I gave a box of a series in its form, by its identifier, a new one by its day,
 * like `2026-12-03`, until I save, see `states` of `SeriesChange` in `reader/course.ts`.
 */
export type States = { [id: string]: BoxState };

/**
 * The kinds I gave the exams of a module in their form, like `Endterm`, by their days,
 * until I save, see {@link kindMenuOf}.
 */
export type Kinds = { [day: string]: string };

/**
 * How the boxes of a series show, see {@link previewSoon}.
 *
 * - `ask`: Asks the reader what the series makes: its boxes,
 *   or a hint why it makes none, shown in their place;
 *   `null` while the series is not typed enough.
 * - `days`: The days of the series, whose slots and extras the rows of its boxes read and change.
 * - `states`: The states I gave its boxes, which a row changes.
 * - `kinds`: Of the exams, the kinds I gave them, which a row changes;
 *   left out for every series but the exams, whose boxes carry their numbers.
 * - `filled`: Builds the rows of the form anew from what it holds, once a row of a box changed it.
 */
export type Preview = {
    ask: (() => Promise<Planned[] | HTMLElement>) | null;
    days: Days;
    states: States;
    kinds?: Kinds;
    filled: () => void;
};

/**
 * A weekly rule of a series or a group, as the reader sends it and the form sends it back,
 * see `Rule` in `reader/course.ts`: its type,
 * like `VO`, its slots and extras, its place with its link, what it does online,
 * who I am with, its first and last day, the dates of its slots with times of their own,
 * see {@link Times}, its group, like `03`, of my tutorials my group, empty for none,
 * and its semester, like `2026W`.
 */
export type Rule = Online & {
    type: string;
    slots: Slot[];
    extras: Extra[];
    location: string;
    locationLink: string;
    attendees: Attendee[];
    first: string;
    last: string;
    times: Times;
    group: string;
    semester: string;
};

/**
 * A series of the course, as the reader sends it: its rule read back from its boxes,
 * and how many boxes it has.
 */
export type Series = {
    rule: Rule;
    count: number;
};

/**
 * A session of a group, as the reader sends it, see `Session` in `reader/course.ts`:
 * its identifier, its start as ISO instant, its length in minutes, its room with its link,
 * and whether the university changed it alone.
 */
export type Session = {
    id: string;
    start: string;
    minutes: number;
    location: string;
    locationLink: string;
    changed: boolean;
};

/**
 * A group of the tutorials of a module, as the reader sends it:
 * the identifiers of its to-dos, one per weekday it meets on, its rule with its group, like `03`,
 * and its sessions, the earliest first.
 */
export type Group = {
    ids: string[];
    rule: Rule;
    sessions: Session[];
};

/**
 * The folder of the material of a type of a semester in a module, as the reader sends it,
 * see `MaterialFolder` in `reader/notes.ts`.
 *
 * - `path`: Its path from the module folder, like `VO_UniversityLectureLessons/TUM_2026W`.
 * - `exists`: Whether it is there; one that is not a click on it makes.
 */
export type MaterialFolder = {
    path: string;
    exists: boolean;
};

/**
 * A session of my own learning of a module logged without a box, as the reader sends it,
 * see `Learned` in `reader/course.ts`:
 * the identifier of its log entry, its day, its start as ISO instant,
 * how long it lasted in minutes, its place with its link, what it did online,
 * who I was with and its note.
 */
export type Learned = Online & {
    id: string;
    day: string;
    time: string;
    minutes: number;
    location: string;
    locationLink: string;
    attendees: Attendee[];
    note: string;
};

/**
 * The course of a module in a semester, as the reader sends it, see `Course` in `reader/course.ts`.
 *
 * - `module`: Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`.
 * - `semester`: The semester, like `2026W`.
 * - `boxes`: Its skill boxes of the semester, of every type, the earliest first.
 * - `learned`: My own learning of the module in the semester logged
 *   without a box, the earliest first.
 * - `series`: Its series, one per numbered type with boxes.
 * - `groups`: Its groups, by type and group.
 * - `folders`: The folder of the material of the semester of each type,
 *   like `VO_UniversityLectureLessons/TUM_2026W` for `VO`, also one not there yet.
 * - `links`: The folder a box of each type links, as the reader writes it now, like
 *   `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons` for `VO`.
 * - `file`: Its plan from `NomWorkspace` on,
 *   like `NomManageplannings/NomManagecalendar/Modules/IN2028_BusinessAnalyticsMachineLearning_Plan.ics`.
 */
export type Course = {
    module: string;
    semester: string;
    boxes: Box[];
    learned: Learned[];
    series: Series[];
    groups: Group[];
    folders: { [type: string]: MaterialFolder };
    links: { [type: string]: string };
    file: string;
};

/**
 * The form of a series as typed so far, see {@link seriesOpen}: its days,
 * see {@link Days}, their `before` the weekdays of the slots of `old` whose boxes they take, and:
 *
 * - `type`: Its type, like `VO`, empty while none is picked.
 * - `old`: The rule as read back when the form opened, `null` for a new series.
 * - `location`, `locationLink`: Its place with its link.
 * - `online`, `onlineLink`, `onlineChannel`, `onlineTitle`: What its boxes do online.
 * - `attendees`: Who I am with.
 * - `states`: The states I gave its boxes.
 * - `kinds`: Of the exams, the kinds I gave them.
 */
type Form = Days &
    Online & {
        type: string;
        old: Rule | null;
        location: string;
        locationLink: string;
        attendees: Attendee[];
        states: States;
        kinds: Kinds;
    };

/**
 * A new series of my course, as the rows on top of the dialog of a new series picked it,
 * see {@link seriesNew} and {@link seriesRepeat}: what one of its boxes is.
 *
 * - `box`: Its fields as typed there, as that dialog adds a box, see `BoxFields` in `./entries.ts`.
 * - `summary`: Its summary as that dialog shows it, of a skill box its skill and type, like
 *   `IN2028_BusinessAnalyticsMachineLearning (VO)`, of any other its text, like `Gym`.
 * - `link`: The folder its summary links, as that dialog shows it below the summary, like
 *   `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning/VO_UniversityLectureLessons`, empty for none.
 * - `file`: The plan it writes into,
 *   like that of its skill, empty while its boxes may fill several, like those of months.
 */
export type Repeated = {
    box: BoxFields;
    summary: string;
    link: string;
    file: string;
};

/**
 * A plain series, one to-do that repeats by its rule,
 * as the reader sends it and the form sends it back, see `Plain` in `reader/rules.ts`:
 * its `UID`, empty for a new one, what it is, of a skill its semester,
 * like `2026W`, empty for any other, its place, what it does online, who I am with,
 * its weekdays from 1 for Monday to 7 for Sunday, none for a monthly or yearly one,
 * of which its day of the month, like 1, else 0, of a yearly one its month, like 3, else 0,
 * its times in Berlin time,
 * both empty without time, how long it lasts without time in minutes, `null` for no length,
 * its first day, its last, empty for none, its single dates besides its weekdays, its extras,
 * each with its times, without time its day alone,
 * and its plan from `NomWorkspace` on, empty for a new one;
 * the `X-SERIES` its parts share, empty for a series of one time,
 * and its parts going on, itself among them, each a plain series of one time,
 * see `plainRead` in `reader/rules.ts`.
 */
export type Plain = Online & {
    id: string;
    category: string;
    title: string;
    module: string;
    type: string;
    semester: string;
    location: string;
    attendees: Attendee[];
    weekdays: number[];
    monthDay: number;
    month: number;
    start: string;
    end: string;
    minutes: number | null;
    first: string;
    last: string;
    extras: Extra[];
    file: string;
    series: string;
    parts: Plain[];
};

/**
 * Types of a series, which carry their number and which the university may cancel,
 * see `numberedTypes` in `reader/boxes.ts`.
 */
export const numberedTypes: string[] = ["VO", "UE", "ZU", "TU", "HU"];

/**
 * Type of the exams of a module, single dates whose `X-NUMBER` is their kind,
 * like `Endterm`, no series the reader reads back, see {@link examRuleOf}.
 */
const examType: string = "FA";

/**
 * The kinds of an exam, its `X-NUMBER`,
 * in the order they come in a semester, see {@link kindMenuOf}.
 */
const examKinds: string[] = ["Midterm", "Endterm", "Retake"];

/**
 * The day of a monthly plain series among the weekdays of its form, after Sunday,
 * its toggle `Month`, see {@link slotRowsOf}:
 * one day alone, on the day of the month of its first day, see `monthDay` of {@link Plain}.
 */
const monthly: number = 8;

/**
 * The day of a yearly plain series among the weekdays of its form, after `Month`,
 * its toggle `Year`, see {@link slotRowsOf}:
 * one day alone, on the day and month of its first day, see `month` of {@link Plain}.
 */
const yearly: number = 9;

/**
 * Waiting preview after a change,
 * so typing asks the reader once, a moment after it rests, see {@link previewSoon}.
 */
let previewWait: number = 0;

/**
 * How many previews were asked for, so only the answer to the last one shows.
 */
let previewsAsked: number = 0;

/**
 * What the boxes of the form showed last,
 * so the rows built anew show it at once until the reader answers again, see {@link boxesRowOf};
 * none before the first answer.
 */
let previewShown: Node[] = [];

/**
 * Whether the boxes of the form show as a list below their line, opened and closed by a tap on it.
 */
let listOpened: boolean = false;

/**
 * The boxes of the rows of the list there already, by their identifiers,
 * as loaded with the list last, see {@link boxesLoad}:
 * a row of one opens it and acts on it as the plan does, see {@link boxRowOf};
 * none for a row not written yet.
 */
let boxesKnown: Map<string, Box> = new Map();

/**
 * The extra being typed below the list of the boxes, see {@link draftRowOf}, `null` while none is.
 */
let extraTyped: Extra | null = null;

/**
 * The session of the group of the form being changed alone, see {@link sessionRowOf}:
 * its identifier, see {@link Session}, its day,
 * and its times and its room as typed; `null` while none is.
 */
let sessionTyped:
    | (Pick<Session, "id" | "location"> & Pick<Slot, "start" | "end"> & { day: string })
    | null = null;

/**
 * Of the exams, the kind I gave the date being typed,
 * see {@link draftRowOf}, empty while I gave none.
 */
let kindTyped: string = "";

/**
 * Of the exams, the day of the date added as the dialog opened, see {@link seriesOpen},
 * whose menu of the kinds opens once its row shows, so I pick its kind first, as after `+`;
 * empty once it opened, and for none.
 */
let kindAsked: string = "";

/**
 * The course whose series the dialog shows, `null` before it opened.
 */
let course: Course | null = null;

/**
 * The form of the series in the dialog, `null` while it is closed.
 */
let typing: Form | null = null;

/**
 * The place of the form as I changed it by its parts, see {@link placeRowOf},
 * which saving writes everywhere, see {@link placeRename};
 * `null` while I changed nothing, and once another place is picked.
 */
let placeEdit: Place | null = null;

/**
 * Whether the place of the form shows its parts below it to change,
 * opened and closed by its pencil, see {@link placeRowOf}.
 */
let placeOpen: boolean = false;

/**
 * Whether what the series does online shows its parts below it, its label, provider,
 * channel, title and link, opened and closed by its pencil as in the dialog of an entry,
 * see {@link onlineRowsOf}.
 */
let onlineOpen: boolean = false;

/**
 * The slots of the form taken back by the toggles of its weekdays since it opened,
 * each its weekday and the weekday of the slot read back whose boxes it had,
 * see `before` of {@link Days}, so the next weekday picked takes those boxes, as a day moved,
 * see {@link slotToggle}; none as a form opens.
 */
let slotsFreed: [number, number][] = [];

/**
 * The people of `With` of the form whose parts show below its names,
 * each opened and closed by its own pencil, see `withRowOf` in `./categories.ts`.
 */
let withOpen: string[] = [];

/**
 * Each person of `With` I changed by its parts, by its name as picked,
 * see `withRowOf` in `./categories.ts`, which saving writes everywhere,
 * see `personsRename` in `../persons.ts`; none while I changed nobody, and once the dialog closes.
 */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/**
 * The people of `Persons.md` as kept when the dialog opened,
 * see `personsKept` in `../persons.ts`, which `With` offers.
 */
let persons: Person[] = [];

/**
 * The categories with the values of their fields,
 * for the places and the people of the form, as loaded last.
 */
let categories: Category[] = [];

/**
 * Whether the dialog started, its buttons and keys, see {@link dialogStart}.
 */
let dialogStarted: boolean = false;

/**
 * The new box of the dialog of an entry the form makes a series of,
 * see {@link seriesRepeat}, `null` for a series of my course.
 */
let repeated: Repeated | null = null;

/**
 * The plain series the form changes or makes, see {@link plainOpen},
 * as typed so far but its place, what it does online, who I am with and its days,
 * which the form holds; `null` for a series of my course.
 */
let plain: Plain | null = null;

/**
 * Whether the plain series of the form has times, else only how long it lasts,
 * as its switch sets it, see {@link plainSwapOf}.
 */
let plainTimed: boolean = true;

/**
 * How long each day of the plain series of the form lasts while it has no times,
 * by its weekday from 1 for Monday to 7 for Sunday,
 * like 480 for my sleep of 8 hours, `null` for none yet, see {@link plainTimeRowsOf};
 * a weekday picked anew takes the length of the first.
 */
let plainLengths: Map<number, number | null> = new Map();

/**
 * The group of the tutorials of its type the form makes or changes,
 * see {@link groupPartOf} and {@link groupStart}:
 * its group as typed, like `05`, whether it is new, and its name there before, like `Mo-0800-1`,
 * which saving renames everywhere when I typed another,
 * see `groupRename` in `reader/course.ts`, empty for a new one;
 * `null` while the form is that of my own series.
 */
let grouped: { group: string; made: boolean; was: string } | null = null;

/**
 * My series of the type the form of a group was opened from,
 * by the menu of the groups beside its semester, see {@link groupPickOf},
 * as typed so far, to which the form goes back once the group closes, is saved or removed,
 * see {@link groupReturn}; `null` for a group opened from elsewhere and for any other form.
 */
let groupBack: Form | null = null;

/**
 * A new series made from nothing, by `⟳` beside `+` of the plan, see {@link seriesNew}:
 * the day it starts on and what is picked so far, its category and, of a skill, its skill and type,
 * which the rows of category and summary on top of the form show, see {@link freshRowsOf},
 * and its semester, at first that of the day, see {@link semesterRowOf};
 * `null` for any other form.
 */
let fresh: {
    day: string;
    category: string;
    picked: ModuleType;
    semester: string;
} | null = null;

/**
 * Whether the bin of a group asked whether I really remove it, see {@link seriesBinOf}.
 */
let removeAsked: boolean = false;

/**
 * Comes once the form is saved,
 * like closing the dialog of the box the dialog opened over, see {@link seriesOpen};
 * nothing for the dialog opened from the page of a module or the menu of a box.
 */
let done: () => void = (): void => {};

/**
 * The box the dialog of an entry showed below this one before a number
 * of the list opened another box in it, see {@link boxShow},
 * which that dialog shows again once this one closes unsaved, one level back; `null` for none.
 */
let entryBack: Box | null = null;

/**
 * Gives the weekday of a day.
 *
 * @param day - Day like `2026-10-19`
 * @returns 1 for Monday to 7 for Sunday
 */
export function weekdayOf(day: string): number {
    return ((new Date(`${day}T12:00:00`).getDay() + 6) % 7) + 1;
}

/**
 * Adds days to a day.
 * - `date`: The day at noon, moved.
 *
 * @param day - Day like `2026-10-19`
 * @param days - Number of days to add
 * @returns Day like `2026-10-26`
 */
export function dayAdd(day: string, days: number): string {
    const date: Date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + days);
    return dayOf(date);
}

/**
 * Gives the Monday of the week of a day, which names its week.
 *
 * @param day - Day like `2026-10-22`
 * @returns Day like `2026-10-19`
 */
export function mondayOf(day: string): string {
    return dayAdd(day, 1 - weekdayOf(day));
}

/**
 * Writes the name of a weekday in English, as the dates of the page write it.
 *
 * @param weekday - 1 for Monday to 7 for Sunday
 * @param whole - Whether to write it whole, like `Monday`, else short, like `Mon`
 * @returns Name of the weekday
 */
export function weekdayNameOf(weekday: number, whole: boolean): string {
    return new Date(2026, 9, 18 + weekday).toLocaleDateString("en-GB", {
        weekday: whole ? "long" : "short",
    });
}

/**
 * Writes the name of a day of the form of a series, short, see {@link slotRowsOf}.
 *
 * @param weekday - 1 for Monday to 7 for Sunday, {@link monthly} or {@link yearly}
 * @returns Name like `Mon`, `Month` or `Year`
 */
function dayNameOf(weekday: number): string {
    return weekday === monthly
        ? "Month"
        : weekday === yearly
          ? "Year"
          : weekdayNameOf(weekday, false);
}

/**
 * Writes a slot as the heading of a card,
 * a row of the table of the groups and a group in a list read it.
 *
 * @param slot - The slot
 * @returns Text like `Mon 14:00 – 16:00`
 */
export function slotTextOf(slot: Slot): string {
    return `${weekdayNameOf(slot.weekday, false)} ${slot.start}${rangeDash}${slot.end}`;
}

/**
 * Writes the room of a place short,
 * as the plan, the rule of a series and the row of a box name it: its name,
 * see `labelOf` in `./places.ts`, without what stands in brackets, from the first `(` on,
 * which only its row in `Places.md` or `Rooms.md` and the dialog show,
 * like `5416.01.003` of `5416.01.003 (Hörsaal 2 "Interims II")` or `Home Munich`;
 * so whatever I write in brackets never makes a place too long for its line.
 *
 * @param line - Place as an entry writes it
 * @returns The room, empty for no place
 */
export function roomOf(line: string): string {
    return labelOf(line).replace(/\s*\(.*$/, "");
}

/**
 * Tells whether a box of the plan is one of a series of my course,
 * which its menu and its dialog open, see the top of this file:
 * a skill box of a numbered type with its number.
 *
 * @param box - The box
 * @returns Whether it is one
 */
export function seriesHas(box: Box): boolean {
    return (
        box.category === skillName &&
        numberedTypes.includes(box.type) &&
        box.number !== ""
    );
}

/**
 * Tells whether a start and an end are typed enough: both a time, the start before the end.
 *
 * @param times - A slot, an extra or the times of a box
 * @returns Whether they are
 */
function timesReady(times: Pick<Slot, "start" | "end">): boolean {
    return times.start !== "" && times.end !== "" && times.start < times.end;
}

/**
 * Tells whether the days of a series are typed enough to make boxes:
 * each a weekday, each once, with a start before its end or by its length a length,
 * each extra a day with a start before its end, and a first day on or before its last.
 *
 * @param days - The days of the series
 * @returns Whether they are
 */
export function daysReady(days: Days): boolean {
    return (
        days.slots.every(
            (slot: Slot): boolean =>
                slot.weekday > 0 &&
                (slot.minutes === undefined ? timesReady(slot) : slot.minutes > 0),
        ) &&
        new Set(days.slots.map((slot: Slot): number => slot.weekday)).size ===
            days.slots.length &&
        days.extras.every(
            (extra: Extra): boolean => extra.day !== "" && timesReady(extra),
        ) &&
        days.first !== "" &&
        days.last !== "" &&
        days.first <= days.last
    );
}

/**
 * Moves the days of a series that fall on the weekday of a slot to its new weekday in their week,
 * its first day, its last and those with times of their own,
 * so a lecture moved from Monday to Tuesday keeps its weeks,
 * like `19.10.2026 – 01.02.2027` becoming `20.10.2026 – 02.02.2027`.
 * - `move`: Moves a day on the old weekday.
 *
 * @param days - The days of the series
 * @param from - The old weekday, 0 for none yet
 * @param to - The new weekday
 */
function daysMove(days: Days, from: number, to: number): void {
    const move: (day: string) => string = (day: string): string =>
        from !== 0 && day !== "" && weekdayOf(day) === from
            ? dayAdd(day, to - from)
            : day;
    days.first = move(days.first);
    days.last = move(days.last);
    days.times = Object.fromEntries(
        Object.entries(days.times).map(
            ([day, times]: [string, Pick<Slot, "start" | "end">]): [
                string,
                Pick<Slot, "start" | "end">,
            ] => [move(day), times],
        ),
    );
}

/**
 * Makes a field of a time or a day of a series, as the dialog has them, see `./times.ts`:
 * plain, a time as wide as its grey `hh:mm`, a day as wide as its value, checking itself;
 * what I type goes into the series as I type it, read as a time or a day.
 * - `input`: The field.
 *
 * @param kind - `time-field` or `date-field`
 * @param value - Its value at first, like `14:00` or `19.10.2026 (Mon)`
 * @param name - What it holds, for screen readers, like `Start of Monday`
 * @param take - Takes what is typed, `14:15` of `1415`, empty for no time or day
 * @param changed - Tells the form that the series changed
 * @returns The field
 */
function fieldOf(
    kind: string,
    value: string,
    name: string,
    take: (value: string) => void,
    changed: () => void,
): HTMLInputElement {
    const input: HTMLInputElement = document.createElement("input");
    input.className = kind;
    input.type = "text";
    input.inputMode = kind === "time-field" ? "numeric" : "decimal";
    input.autocomplete = "off";
    input.value = value;
    input.setAttribute("aria-label", name);
    if (kind === "time-field") timeFieldStart(input);
    else dateFieldStart(input);
    input.addEventListener("input", (): void => {
        take(
            kind === "time-field" ? timeFieldRead(input) : (dateParse(input.value) ?? ""),
        );
        changed();
    });
    return input;
}

/**
 * Makes two fields of a series side by side with the range dash between them,
 * as start and end of the dialog,
 * like `14:00 – 16:00` or `19.10.2026 (Mon) – 01.02.2027 (Mon)`, the dash going with the second,
 * as there, so a narrow row breaks before it.
 * - `range`: The two.
 * - `second`: The second with the dash before it.
 *
 * @param from - The first field
 * @param to - The second field
 * @returns The two
 */
function rangeOf(from: HTMLInputElement, to: HTMLInputElement): HTMLElement {
    const range: HTMLElement = elementOf("span", "entry-range", "");
    const second: HTMLElement = elementOf("span", "entry-moment", "");
    second.append(elementOf("span", "entry-dash", "–"), to);
    range.append(from, second);
    return range;
}

/**
 * Makes the fields of the times of a slot, an extra or a box side by side,
 * like `14:00 – 16:00`, see {@link rangeOf}.
 *
 * @param times - The slot, the extra or the times of a box, which take what I type
 * @param changed - Tells the form that the series changed
 * @returns The two
 */
function timesRangeOf(
    times: Pick<Slot, "start" | "end">,
    changed: () => void,
): HTMLElement {
    return rangeOf(
        fieldOf(
            "time-field",
            times.start,
            "Start",
            (time: string): void => {
                times.start = time;
            },
            changed,
        ),
        fieldOf(
            "time-field",
            times.end,
            "End",
            (time: string): void => {
                times.end = time;
            },
            changed,
        ),
    );
}

/**
 * Makes the button `×` that takes a day or an extra of a series back.
 * - `remove`: The button.
 *
 * @param words - What it takes back, its tooltip, like `Take the date back`
 * @param click - Takes it back
 * @returns The button
 */
function removeOf(words: string, click: () => void): HTMLButtonElement {
    const remove: HTMLButtonElement = document.createElement("button");
    remove.type = "button";
    crossPut(remove, words);
    remove.addEventListener("click", click);
    return remove;
}

/**
 * Makes the plus beside the name of a row that adds one more, like a day of a series.
 * - `plus`: The button.
 *
 * @param words - What it adds, its tooltip, like `Add a group`
 * @param click - Adds it
 * @returns The button
 */
function plusOf(words: string, click: () => void): HTMLButtonElement {
    const plus: HTMLButtonElement = document.createElement("button");
    plus.type = "button";
    plusPut(plus, words);
    plus.addEventListener("click", click);
    return plus;
}

/**
 * Makes the row `Day` of the days of a series, the one way every series takes its days,
 * a plain one, the series of a type of a module and a group alike:
 * on top its weekdays as seven toggles, `Mon Tue Wed Thu Fri Sat Sun`,
 * the picked ones light on the calm grey of what is picked, a click picking one or taking it back,
 * but the last one; below them each day picked one line, its weekday and its times,
 * like `Thu 18:00 – 19:30`, a day picked anew taking the times of the first,
 * so a lecture on Monday and Thursday at different times and a group meeting twice a week are typed
 * as my sleep of every night is;
 * of a series by its length each day its length in place of its times,
 * the switch between them beside the name,
 * see {@link plainTimeRowsOf} and {@link courseTimeRowsOf}.
 * A weekday picked after one taken back takes its boxes, as a day moved,
 * and moves the days of the series with it, see {@link daysMove} and {@link slotsFreed},
 * so a lecture moved from Monday to Tuesday keeps its boxes;
 * a slot without weekday yet, as a new series starts, takes the first weekday picked.
 * A plain series has `Month` and `Year` after Sunday, see {@link monthly} and {@link yearly},
 * its one line like `Month 09:00`,
 * each a day alone: picked, it takes the place of the others, another one picked that of it.
 * - `shown`: The days to pick, the seven weekdays, and `Month` and `Year`.
 * - `toggles`: Their toggles.
 * - `lines`: The days picked, one line each, or the length.
 * - `row`: The row.
 *
 * @param days - The days of the series
 * @param changed - Tells the form that the series changed
 * @param filled - Builds the rows of the form anew from what it holds,
 *   once a day is picked or taken back
 * @param aside - What stands after the name `Day`,
 *   like the switch of a plain series between times and a length;
 *   nothing when left out
 * @param lengthOf - Makes the length of a day in place of its times, `null` for the times
 * @param month - Whether `Month` and `Year` stand after the weekdays, for a plain series;
 *   false when left out
 * @returns The row, alone, as the rows of the form are given
 */
export function slotRowsOf(
    days: Days,
    changed: () => void,
    filled: () => void,
    aside: HTMLElement[] = [],
    lengthOf: ((slot: Slot) => HTMLElement) | null = null,
    month: boolean = false,
): HTMLElement[] {
    const shown: number[] = [1, 2, 3, 4, 5, 6, 7, ...(month ? [monthly, yearly] : [])];
    const toggles: HTMLElement = elementOf("span", "series-weekdays", "");
    toggles.append(
        ...shown.map((weekday: number): HTMLButtonElement => {
            const index: number = days.slots.findIndex(
                (slot: Slot): boolean => slot.weekday === weekday,
            );
            const toggle: HTMLButtonElement = elementOf(
                "button",
                "series-weekday",
                dayNameOf(weekday),
            ) as HTMLButtonElement;
            toggle.type = "button";
            toggle.setAttribute("aria-pressed", String(index !== -1));
            toggle.addEventListener("click", (): void => {
                slotToggle(days, weekday);
                filled();
            });
            return toggle;
        }),
    );
    const lines: HTMLElement = elementOf("div", "series-slots", "");
    lines.append(
        toggles,
        ...days.slots
            .filter((slot: Slot): boolean => slot.weekday > 0)
            .map((slot: Slot): HTMLElement => {
                const line: HTMLElement = elementOf("div", "series-slot", "");
                line.append(
                    elementOf("span", "series-slot-day", dayNameOf(slot.weekday)),
                    lengthOf === null ? timesRangeOf(slot, changed) : lengthOf(slot),
                );
                return line;
            }),
    );
    const row: HTMLElement = rowOf("Day", lines);
    row.querySelector(".entry-name")?.append(...aside);
    return [row];
}

/**
 * Picks a weekday of a series or takes it back, see {@link slotRowsOf}:
 * picked, a slot without weekday yet takes it, else a new slot with the times of the first,
 * which takes the boxes of a slot taken back before,
 * see {@link slotsFreed}, moving the days of the series with it, see {@link daysMove};
 * taken back, but the last one, its slot goes, its boxes kept for the next weekday picked.
 * `Month` or `Year` picked, see {@link monthly} and {@link yearly},
 * stays alone with the times of the first,
 * and another day picked takes its slot as that of a slot without weekday.
 * The slots stay in the order of their weekdays, each with its `before`.
 * - `index`: The slot of the weekday, -1 for none.
 * - `empty`: The slot without weekday, or that of `Month` or `Year`, -1 for none.
 * - `freed`: The slot taken back whose boxes the new one takes, `undefined` for none.
 * - `pairs`: Each slot with its `before`, in the order of their weekdays.
 *
 * @param days - The days of the series
 * @param weekday - The weekday, from 1 for Monday to 7 for Sunday,
 *   {@link monthly} or {@link yearly}
 */
function slotToggle(days: Days, weekday: number): void {
    const index: number = days.slots.findIndex(
        (slot: Slot): boolean => slot.weekday === weekday,
    );
    const empty: number = days.slots.findIndex(
        (slot: Slot): boolean => slot.weekday === 0 || slot.weekday >= monthly,
    );
    if (weekday >= monthly && index === -1) {
        days.slots = [{ ...days.slots[0], weekday: weekday }];
        days.before = [0];
    } else if (index === -1 && empty !== -1) days.slots[empty].weekday = weekday;
    else if (index === -1) {
        const freed: [number, number] | undefined = slotsFreed.shift();
        if (freed !== undefined) daysMove(days, freed[0], weekday);
        days.slots.push({
            weekday: weekday,
            start: days.slots[0]?.start ?? "",
            end: days.slots[0]?.end ?? "",
            ...(days.slots[0]?.minutes === undefined
                ? {}
                : { minutes: days.slots[0].minutes }),
        });
        days.before.push(freed?.[1] ?? 0);
    } else if (days.slots.length > 1) {
        if ((days.before[index] ?? 0) !== 0)
            slotsFreed.push([weekday, days.before[index]]);
        days.slots.splice(index, 1);
        days.before.splice(index, 1);
    }
    const pairs: [Slot, number][] = days.slots
        .map((slot: Slot, at: number): [Slot, number] => [slot, days.before[at] ?? 0])
        .sort(
            (first: [Slot, number], second: [Slot, number]): number =>
                first[0].weekday - second[0].weekday,
        );
    days.slots = pairs.map(([slot]: [Slot, number]): Slot => slot);
    days.before = pairs.map(([, before]: [Slot, number]): number => before);
}

/**
 * Makes the row of the first and the last day of a series,
 * side by side with the range dash between them,
 * like `19.10.2026 (Mon) – 01.02.2027 (Mon)`, each saying grey `dd.mm.yyyy` while empty,
 * as the day of a deadline.
 * - `first`, `last`: The fields of the first and the last day.
 *
 * @param days - The days of the series
 * @param changed - Tells the form that the series changed
 * @returns The row
 */
export function datesRowOf(days: Days, changed: () => void): HTMLElement {
    const first: HTMLInputElement = fieldOf(
        "date-field",
        days.first === "" ? "" : weekdayDateTextOf(days.first),
        "First day",
        (day: string): void => {
            days.first = day;
        },
        changed,
    );
    const last: HTMLInputElement = fieldOf(
        "date-field",
        days.last === "" ? "" : weekdayDateTextOf(days.last),
        "Last day",
        (day: string): void => {
            days.last = day;
        },
        changed,
    );
    return rowOf("Dates", rangeOf(first, last));
}

/**
 * Makes the row `Entries` of the boxes a series makes,
 * showing what it showed last until the reader answers again, see {@link previewSoon}.
 * - `preview`: The place of the boxes.
 *
 * @returns The row
 */
export function boxesRowOf(): HTMLElement {
    const preview: HTMLElement = elementOf("div", "series-preview", "");
    preview.append(...previewShown);
    const row: HTMLElement = rowOf("Entries", preview);
    row.hidden = previewShown.length === 0;
    return row;
}

/**
 * Puts what the boxes of a series show into the row `Entries` of the form,
 * see {@link boxesRowOf}, the row shown only while it shows something,
 * so a series not typed enough yet has no empty row.
 * - `place`: The place of the boxes in the form, `null` for none.
 *
 * @param form - The form
 * @param shown - What the boxes show, none for nothing
 */
function previewPut(form: HTMLElement, shown: Node[]): void {
    const place: HTMLElement | null = form.querySelector(".series-preview");
    place?.replaceChildren(...shown);
    const row: HTMLElement | null = place?.closest<HTMLElement>(".panel-field") ?? null;
    if (row !== null) row.hidden = shown.length === 0;
}

/**
 * Forgets what the boxes of a form showed, and folds their list,
 * as a form of another series or another new box opens.
 */
export function previewForget(): void {
    clearTimeout(previewWait);
    previewsAsked += 1;
    previewShown = [];
    listOpened = false;
    extraTyped = null;
    sessionTyped = null;
    kindAsked = "";
}

/**
 * Writes how many there are of something, like `2 changed`, or nothing for none.
 *
 * @param count - How many
 * @param words - What they are, like `changed`
 * @returns The part, none for none
 */
function countOf(count: number, words: string): string[] {
    return count === 0 ? [] : [`${count} ${words}`];
}

/**
 * Makes a part of the line of the boxes of a series that counts them by an icon,
 * like `✓ 1`, its words as tooltip and as its name for screen readers.
 * - `part`: The part.
 *
 * @param count - How many
 * @param icon - Icon of what they are, like `Check`
 * @param words - What they are, like `done`
 * @returns The part
 */
export function tallyOf(count: number, icon: IconNode, words: string): HTMLElement {
    const part: HTMLElement = elementOf("span", "series-tally", "");
    part.title = `${count} ${words}`;
    part.setAttribute("aria-label", part.title);
    part.append(...iconWordsOf(icon, String(count)));
    return part;
}

/**
 * Makes the line of the boxes of a series,
 * see the top of this file, grey, lighter under the pointer:
 * how many entries there are, by the icon of a calendar, then what a change does to them,
 * while the series had boxes before,
 * and by the icons of their states how many of those it keeps are done, how many not,
 * skipped or cancelled, and how many pushed, each also at none, like `✓ 0`,
 * as the cards of the course count; a tap opens and closes the list below it.
 * - `kept`: The boxes after the change, without those it removes.
 * - `had`: Whether the series had boxes before.
 * - `counted`: How many boxes of a state or a change there are.
 * - `line`: The line, a button.
 * - `parts`: Its grey parts of a change.
 * - `states`: How many are done, how many not,
 *   and how many pushed, each with its icon and its words.
 *
 * @param planned - The boxes as the reader would write them, removed ones too
 * @param toggle - Opens or closes the list
 * @returns The line
 */
function summaryOf(planned: Planned[], toggle: () => void): HTMLButtonElement {
    const kept: Planned[] = planned.filter(
        (box: Planned): boolean => box.change !== "removed",
    );
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const counted: (keep: (box: Planned) => boolean) => number = (
        keep: (box: Planned) => boolean,
    ): number => planned.filter(keep).length;
    const line: HTMLButtonElement = document.createElement("button");
    const parts: string[] = [
        ...(had
            ? countOf(
                  counted((box: Planned): boolean => box.change === "new"),
                  "new",
              )
            : []),
        ...countOf(
            counted((box: Planned): boolean => box.change === "changed"),
            "changed",
        ),
        ...countOf(
            counted((box: Planned): boolean => box.change === "removed"),
            "removed",
        ),
    ];
    const states: [number, IconNode, string][] = [
        [
            counted(
                (box: Planned): boolean =>
                    box.change !== "removed" && box.state === "done",
            ),
            Check,
            "done",
        ],
        [
            counted(
                (box: Planned): boolean =>
                    box.change !== "removed" &&
                    (box.state === "dropped" || box.state === "university"),
            ),
            X,
            "skipped or cancelled",
        ],
        [counted((box: Planned): boolean => box.pushed), ArrowRight, "pushed"],
    ];
    line.type = "button";
    line.className = "series-summary";
    line.setAttribute("aria-expanded", String(listOpened));
    line.append(
        tallyOf(kept.length, Calendar, kept.length === 1 ? "entry" : "entries"),
        ...parts.map((part: string): HTMLElement =>
            elementOf("span", "entry-parted", part),
        ),
        ...states.map(([count, icon, words]: [number, IconNode, string]): HTMLElement => {
            const part: HTMLElement = tallyOf(count, icon, words);
            part.classList.add("entry-parted");
            return part;
        }),
    );
    line.addEventListener("click", toggle);
    return line;
}

/**
 * Makes the icon of the state of a box in its row, as the plan shows it:
 * a button that takes the state back, see {@link States}, where it can be, else the icon alone.
 * - `mark`: The icon, a button or alone.
 *
 * @param icon - Icon, like `X`
 * @param word - The state, its tooltip, like `Skipped`
 * @param back - Takes the state back, `null` where it cannot be taken back
 * @returns The icon
 */
function markOf(icon: IconNode, word: string, back: (() => void) | null): HTMLElement {
    const mark: HTMLElement = document.createElement(back === null ? "span" : "button");
    if (mark instanceof HTMLButtonElement && back !== null) {
        mark.type = "button";
        mark.addEventListener("click", back);
    }
    mark.className = "box-state";
    iconPut(mark, icon, word);
    return mark;
}

/**
 * Sends a change of a box of the list to the reader, then shows the list anew,
 * see {@link seriesRefresh}, also when the reader does not take it, which the console says.
 *
 * @param send - Sends the change
 */
function seriesAct(send: () => Promise<unknown>): void {
    send()
        .catch((error: unknown): void => console.error(error))
        .then((): Promise<void> => seriesRefresh())
        .catch((error: unknown): void => console.error(error));
}

/**
 * Shows the list of the form anew as its files hold it now, after a box of it changed,
 * by its actions or in the dialog of the box, see {@link boxShow}:
 * the course of my series loaded anew, then the boxes the form makes, see {@link formChanged};
 * nothing once the dialog closed.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRefresh(): Promise<void> {
    if (typing === null) return;
    if (course !== null)
        course = await readerAsk<Course>(
            `/api/course/module?module=${encodeURIComponent(course.module)}` +
                `&semester=${course.semester}`,
        );
    formChanged();
}

/**
 * Opens a box of the list over the dialog of the series, as the plan opens it,
 * see `boxClick` in `./boxes.ts`:
 * one that can be changed in the dialog of an entry to change it,
 * an open one that cannot in the dialog of the log, at the times it is logged at;
 * the dialog of an entry standing below, the one the series opened from, closes first,
 * its box kept to show again once the series closes unsaved, see {@link entryBack},
 * and the box shows on top, marked `data-over`, which `series.css` leaves visible.
 * Once it closes, saved or not, the list shows anew, see {@link dialogStart}.
 * - `entry`: The dialog of an entry.
 * - `start`, `end`: The times it is logged at.
 *
 * @param box - The box
 * @throws {Error} - When the reader cannot answer
 */
async function boxShow(box: Box): Promise<void> {
    const entry: HTMLDialogElement = document.getElementById(
        "entry",
    ) as HTMLDialogElement;
    if (entry.open && entryBack === null) entryBack = entryBoxOf();
    if (entry.open) entry.close();
    if (box.editable) await boxOpenEdit(box);
    else if (box.state === "open") {
        const [start, end]: [Date, Date] = boxTimesOf(
            box,
            new Date(`${box.day}T12:00:00`),
        );
        await entryOpenFromBox(box, start, end);
    }
    if (entry.open) entry.dataset.over = "";
}

/**
 * Shows the box again in the dialog of an entry that it showed before a number
 * of the list opened another one, see {@link entryBack},
 * as it stands now, changes of the series included, once the series closes unsaved.
 * - `fresh`: The box as the plan of its day holds it now, `undefined` once it is gone.
 *
 * @param box - The box as it showed
 * @throws {Error} - When the reader cannot answer
 */
async function entryBackShow(box: Box): Promise<void> {
    const fresh: Box | undefined = (await boxesFetch(box.day, dayAdd(box.day, 1)))
        .flatMap((plan: PlanDay): Box[] => plan.boxes)
        .find((other: Box): boolean => other.id === box.id);
    if (fresh !== undefined) await boxOpenEdit(fresh);
}

/**
 * Loads the boxes of the rows of the list, see {@link boxesKnown}: of my course its boxes,
 * as loaded with it, of a plain series those of the days of its rows,
 * see `boxesFetch` in `./boxes.ts`, never the greyed copy a box leaves on a day it was pushed from;
 * none of a group, whose rows are its sessions.
 * - `ids`: The identifiers of the rows of a box.
 * - `days`: The days of the rows, the earliest first.
 * - `boxes`: The boxes found.
 *
 * @param planned - The rows of the list
 * @throws {Error} - When the reader cannot answer
 */
async function boxesLoad(planned: Planned[]): Promise<void> {
    const ids: string[] = planned
        .filter((box: Planned): boolean => box.id !== "")
        .map((box: Planned): string => box.id);
    const days: string[] = planned.map((box: Planned): string => box.day).sort();
    if (ids.length === 0 || grouped !== null) {
        boxesKnown = new Map();
        return;
    }
    const boxes: Box[] =
        course !== null && plain === null
            ? course.boxes
            : (await boxesFetch(days[0], dayAdd(days[days.length - 1], 8)))
                  .flatMap((plan: PlanDay): Box[] => plan.boxes)
                  .filter((box: Box): boolean => box.state !== "pushed");
    boxesKnown = new Map(
        boxes
            .filter((box: Box): boolean => ids.includes(box.id))
            .map((box: Box): [string, Box] => [box.id, box]),
    );
}

/**
 * Makes one action of a box of the list not written yet,
 * as an action of a box of the plan looks, see `actions.ts`.
 * - `button`: The button.
 *
 * @param icon - Icon, like `CalendarOff`
 * @param words - What it does, its tooltip, like `Cancel`
 * @param click - What a click does
 * @returns The button
 */
function pendingActionOf(
    icon: IconNode,
    words: string,
    click: () => void,
): HTMLButtonElement {
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = "box-action";
    iconPut(button, icon, words);
    button.addEventListener("click", click);
    return button;
}

/**
 * Makes what stands at the right edge of the row of a box there already,
 * as on the page of its module, see `../editor/course.ts`: its actions while open, as in the plan,
 * see `boxActionsOf` in `./actions.ts`, each sent at once, `Log` logging it at its times,
 * see `boxTimesOf` in `./times.ts`;
 * else the icon of its state,
 * which takes it back with a click where it can be, a box logged as in the plan;
 * the list then shows anew, see {@link seriesAct}.
 * - `calendar`: The calendar the dialog of an entry writes with, `null` before it started.
 * - `back`: Takes its state back, `null` where it cannot be.
 * - `shown`: The icon of its state and its word.
 * - `take`: The same, fixed for the click.
 *
 * @param box - The box
 * @returns Its actions, or its state
 */
function knownEndOf(box: Box): HTMLElement {
    const calendar: DayCalendar | null = dayCalendarOf();
    if (box.state === "open")
        return boxActionsOf(
            box,
            (): void =>
                seriesAct(async (): Promise<void> => {
                    const [start, end]: [Date, Date] = boxTimesOf(
                        box,
                        new Date(`${box.day}T12:00:00`),
                    );
                    await boxLog(box.id, start, end);
                }),
            seriesAct,
            true,
        );
    let back: (() => Promise<void>) | null = null;
    if (box.state === "done")
        back =
            box.deadline !== ""
                ? (): Promise<void> => boxSubmit(box.id, false)
                : calendar === null
                  ? null
                  : (): Promise<void> => boxUndo(calendar, box.id);
    else if (box.editable)
        back =
            box.state === "dropped"
                ? (): Promise<void> => boxDrop(box.id, false)
                : (): Promise<void> => boxUniversity(box.id, false);
    const shown: [IconNode, string] =
        box.state === "done"
            ? [Check, box.deadline === "" ? "Logged" : "Submitted"]
            : box.state === "dropped"
              ? [X, "Skipped"]
              : [CalendarOff, "Cancelled"];
    const take: (() => Promise<void>) | null = back;
    return markOf(shown[0], shown[1], take === null ? null : (): void => seriesAct(take));
}

/**
 * Makes what stands at the right edge of the row of a box not written yet, or of one only shown:
 * of a new one its actions as the form keeps them until I save,
 * see {@link States}, `Cancel` for one numbered in its series and for a session of a group,
 * which the reader makes cancelled,
 * see `seriesApply` and `groupApply` in `reader/course.ts`, `Remove` for an extra from today on,
 * which takes it back, and of a session of a group there already, of the days over too,
 * so a tutorial I went to is added afterwards and then logged, `+`,
 * which makes it a box of mine besides the box of its week, see {@link extraAdd},
 * but not where a box of mine stands already, see {@link mineAt}, and a pencil,
 * which opens it to change alone, as the university changed it, see {@link sessionRowOf};
 * a state given so its icon, which takes it back; of a day
 * of another series of the chain of a plain series, see `chained` of {@link Planned},
 * and of one the change removes only the icon of its state, or nothing.
 * - `today`: Today's date.
 * - `extra`: The extra on its day, `undefined` for none.
 * - `stated`: Gives the state to a box, a new one by its day, until I save.
 * - `shown`: Whether it is only shown.
 * - `session`: Of a group there already its session, `undefined` for none, see {@link sessionOf}.
 * - `buttons`: Its actions.
 * - `actions`: Its actions in their row.
 *
 * @param box - The box
 * @param preview - How the boxes show
 * @returns Its actions or its state, or nothing
 */
function pendingEndOf(box: Planned, preview: Preview): HTMLElement {
    const days: Days = preview.days;
    const today: string = dayOf(new Date());
    const extra: Extra | undefined = days.extras.find(
        (one: Extra): boolean => one.day === box.day,
    );
    const stated: (state: BoxState) => () => void =
        (state: BoxState): (() => void) =>
        (): void => {
            preview.states[box.id || box.day] = state;
            preview.filled();
        };
    const shown: boolean = box.chained === true || box.change === "removed";
    if (box.state === "done") return markOf(Check, "Done", null);
    if (box.state === "dropped")
        return markOf(X, "Skipped", box.editable && !shown ? stated("open") : null);
    if (box.state === "university")
        return markOf(
            CalendarOff,
            "Cancelled",
            box.editable && !shown ? stated("open") : null,
        );
    if (shown) return elementOf("span", "series-end", "");
    const session: Session | undefined = sessionOf(box);
    const buttons: HTMLButtonElement[] = [
        ...(box.editable && (/^\d+$/.test(box.number) || grouped !== null)
            ? [pendingActionOf(CalendarOff, "Cancel", stated("university"))]
            : []),
        ...(extra !== undefined && box.day >= today && !box.pushed
            ? [
                  pendingActionOf(CalendarMinus, "Remove", (): void => {
                      days.extras.splice(days.extras.indexOf(extra), 1);
                      preview.filled();
                  }),
              ]
            : []),
        ...(grouped !== null && !grouped.made && !mineAt(box.time || box.day)
            ? [
                  pendingActionOf(Plus, "Add as a box of mine", (): void => {
                      extraAdd(box.time || box.day).catch((error: unknown): void =>
                          console.error(error),
                      );
                  }),
              ]
            : []),
        ...(session !== undefined
            ? [
                  pendingActionOf(Pencil, "Change this session alone", (): void => {
                      sessionTyped = {
                          id: session.id,
                          day: box.day,
                          start: timeOf(new Date(session.start)),
                          end: timeOf(
                              new Date(
                                  Date.parse(session.start) + session.minutes * 60 * 1000,
                              ),
                          ),
                          location: session.location,
                      };
                      preview.filled();
                  }),
              ]
            : []),
    ];
    if (box.pushed && buttons.length === 0) return markOf(ArrowRight, "Pushed", null);
    const actions: HTMLElement = elementOf(
        "div",
        buttons.length === 0 ? "series-end" : "box-actions",
        "",
    );
    actions.append(...buttons);
    return actions;
}

/**
 * Gives the session of the group there already of the form a row of its list stands for,
 * at its time, which its pencil changes alone, see {@link sessionRowOf}:
 * none of a new group, of one without times, of one cancelled or removed,
 * and none while the form moved the row from its session.
 * - `group`: The group of the form, `null` for none.
 *
 * @param box - The row
 * @returns The session, `undefined` for none
 */
function sessionOf(box: Planned): Session | undefined {
    const group: { group: string; made: boolean; was: string } | null = grouped;
    return group === null ||
        group.made ||
        typing === null ||
        box.time === "" ||
        box.state === "university" ||
        box.change === "removed"
        ? undefined
        : groupsOf(typing.type)
              .find((one: Group): boolean => one.rule.group === group.was)
              ?.sessions.find(
                  (one: Session): boolean =>
                      Date.parse(one.start) === Date.parse(box.time),
              );
}

/**
 * Makes the row of a session of the group of the form being changed alone,
 * in its place in the list, as the university changed it that day,
 * see `sessionApply` in `reader/course.ts`:
 * nothing where the numbers stand, its day,
 * its times to type and its room to pick as in the row `Place`, see {@link placeSearchOf},
 * and at its right edge Save,
 * which writes it at once, my box at that session following it, the list then shown anew,
 * see {@link sessionSave}, and `×`, which leaves it as it is.
 * - `row`: The row.
 * - `fields`: Its times and its room.
 * - `actions`: Save and `×`.
 *
 * @param session - The session as typed
 * @param redraw - Shows the list anew
 * @returns The row
 */
function sessionRowOf(
    session: NonNullable<typeof sessionTyped>,
    redraw: () => void,
): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row series-session", "");
    const fields: HTMLElement = elementOf("div", "", "");
    const actions: HTMLElement = elementOf("div", "box-actions", "");
    fields.append(
        timesRangeOf(session, (): void => {}),
        choicesOf({
            search: placeSearchOf(session.location, labelOf),
            picked: session.location === "" ? [] : [session.location],
            many: false,
            adding: false,
            noun: "place",
            textOf: labelOf,
            pick: (values: string[]): void => {
                session.location = values[0] ?? "";
            },
        }),
    );
    actions.append(
        pendingActionOf(Check, "Save this session", (): void => {
            sessionSave(session).catch((error: unknown): void => console.error(error));
        }),
        removeOf("Keep the session as it is", (): void => {
            sessionTyped = null;
            redraw();
        }),
    );
    row.append(
        elementOf("span", "series-number", ""),
        elementOf("span", "", weekdayDateTextOf(session.day)),
        fields,
        actions,
    );
    return row;
}

/**
 * Writes the session being changed alone, see {@link sessionRowOf},
 * while its start lies before its end, then shows the list anew, see {@link seriesRefresh};
 * the hint of the form shows when the reader does not take it.
 *
 * @param session - The session as typed
 * @throws {Error} - When the reader cannot answer
 */
async function sessionSave(session: NonNullable<typeof sessionTyped>): Promise<void> {
    if (course === null || typing === null || grouped === null || !timesReady(session))
        return;
    try {
        await courseSend<null>("/api/course/session", {
            module: course.module,
            type: typing.type,
            group: grouped.was,
            semester: course.semester,
            id: session.id,
            start: session.start,
            end: session.end,
            location: session.location,
        });
    } catch (error: unknown) {
        console.error(error);
        formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
        return;
    }
    sessionTyped = null;
    await seriesRefresh();
}

/**
 * Tells whether a box of mine of the type of the form stands at the start of a session,
 * so the session is mine already and offers no `+`, see {@link pendingEndOf},
 * as the reader tells it, see `weekPick` in `reader/course.ts`: a box at that moment,
 * or of a session without times, see `Session` there, a box without time on that day.
 *
 * @param start - The start, like `2026-10-27T13:00:00.000Z`,
 *   or the day of a session without times, like `2026-11-06`
 * @returns Whether a box of mine stands there
 */
function mineAt(start: string): boolean {
    return (course?.boxes ?? []).some(
        (one: Box): boolean =>
            one.type === typing?.type &&
            ((one.time || one.day) === start ||
                (one.time !== "" && Date.parse(one.time) === Date.parse(start))),
    );
}

/**
 * Makes a session of the group of the form a box of mine of its own, besides the box of its week,
 * as a second tutorial in one week,
 * see `weekPick` in `reader/course.ts`, the group as saved, not as typed since;
 * the form stays, its list shown anew, see {@link seriesRefresh}, the session now without `+`,
 * so I take one session after another.
 *
 * @param start - The start of the session as ISO instant,
 *   like `2026-11-05T15:00:00.000Z`, of a session without times its day, like `2026-11-06`,
 *   which makes a box without time of its length
 * @throws {Error} - When the reader cannot answer
 */
async function extraAdd(start: string): Promise<void> {
    if (course === null || typing === null || grouped === null) return;
    try {
        await courseSend<null>("/api/course/pick", {
            module: course.module,
            type: typing.type,
            group: grouped.was,
            start: start,
            extra: true,
        });
    } catch (error: unknown) {
        console.error(error);
        formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
        return;
    }
    await seriesRefresh();
}

/**
 * Makes the kind of an exam in its row where a box of a series has its number, see {@link boxRowOf}
 * and {@link draftRowOf}: its small grey box a button, the kind with a small chevron,
 * like `Endterm`, `Kind` while it has none, which opens the menu of the kinds as the menu `⋯` does,
 * see `menuAnchor` in `../menu.ts`, in the look of the menu of the groups on the page of a module,
 * see `groupMenuOf` in `../editor/course.ts`:
 * each kind of {@link examKinds}, the kind of the exam checked, the others without;
 * a click on a kind closes the menu, shows it on the button and gives it to the exam,
 * but for the one checked. Asked, its menu opens once its row shows, see {@link kindAsked}.
 * - `place`: The button with its menu.
 * - `button`: The button.
 * - `menu`: The menu.
 * - `items`: The kinds in the menu.
 * - `shown`: Shows the kind on the button and checks it in the menu.
 *
 * @param kind - The kind of the exam, empty for none
 * @param asked - Whether its menu opens once its row shows, the date added as the dialog opened
 * @param pick - Gives the exam the kind picked
 * @returns The button with its menu
 */
function kindMenuOf(
    kind: string,
    asked: boolean,
    pick: (kind: string) => void,
): HTMLElement {
    const place: HTMLElement = elementOf("span", "series-kind", "");
    const button: HTMLButtonElement = document.createElement("button");
    const menu: HTMLElement = document.createElement("div");
    const items: HTMLButtonElement[] = examKinds.map((one: string): HTMLButtonElement =>
        menuItemOf(Check, one, (): void => {
            menu.hidePopover();
            if (one === kind) return;
            kind = one;
            shown();
            pick(one);
        }),
    );
    const shown: () => void = (): void => {
        button.replaceChildren(kind === "" ? "Kind" : kind, iconOf(ChevronDown));
        items.forEach((item: HTMLButtonElement, index: number): void => {
            item.classList.toggle("menu-item-blank", examKinds[index] !== kind);
        });
    };
    button.type = "button";
    button.className = "block-kind series-number";
    menuAnchor(menu, button);
    menu.append(...items);
    shown();
    place.append(button, menu);
    if (asked) {
        kindAsked = "";
        queueMicrotask((): void => {
            if (menu.isConnected) menu.showPopover();
        });
    }
    return place;
}

/**
 * Makes the row of a box in the list,
 * see the top of this file, with the one row of a box of every list,
 * see `listRowOf` in `./rows.ts`, so it stands as on the page of its module:
 * its number, `–` for one the university cancelled, none for one the change removes,
 * a button that opens its box there already, see {@link boxShow}, of an exam its kind to pick,
 * see {@link kindMenuOf}; its day, of a box without number,
 * like a day of my sleep, the button that opens it instead;
 * of my tutorials its group with the menu of the groups
 * of its week, see `boxGroupOf` in `./groups.ts`; grey its
 * times after the change, see `rowTimesOf` in `./rows.ts`,
 * and its place, of a box there already its own, else that of the form,
 * its platform while it does something online,
 * and right below them who I am with, of a box not written yet those of the series,
 * which its dialog changes once it is;
 * what the change does to it, like `new`,
 * but while every box is new, `extra` after it for an extra,
 * like `new extra`, `pushed` for a box I pushed;
 * at its right edge of a box there already its actions or its state,
 * see {@link knownEndOf}, of any other what the form keeps, see {@link pendingEndOf};
 * greyed while not open, done, skipped, cancelled or removed, as in the plan.
 * - `kinds`: Of the exams, the kinds I gave them, `undefined` for any other series.
 * - `known`: Its box there already, `undefined` for one not written yet and one the change removes.
 * - `word`: What the change does to it, that I pushed it, and that it is an extra.
 * - `number`: Its number, or of an exam its kind, given until I save, see {@link examSend}.
 * - `place`: Its place, or what it does online, with its link.
 * - `opening`: Opens its box from its day,
 *   of a box there already without number, `null` for any other.
 * - `mine`: My series, whose groups a menu of its row opens so that closing them goes back to it,
 *   `null` in the form of a group.
 *
 * @param box - The box
 * @param had - Whether the series had boxes before, so a new one says so
 * @param preview - How the boxes show
 * @returns The row
 */
function boxRowOf(box: Planned, had: boolean, preview: Preview): HTMLElement {
    const kinds: Kinds | undefined = preview.kinds;
    const known: Box | undefined =
        box.change === "removed" ? undefined : boxesKnown.get(box.id);
    let word: string =
        box.change === "renumbered" || (box.change === "new" && !had) ? "" : box.change;
    if (word === "" && box.pushed && box.editable && box.state === "open")
        word = "pushed";
    if (word === "" && box.location !== undefined) word = "changed";
    if (preview.days.extras.some((extra: Extra): boolean => extra.day === box.day))
        word = word === "" ? "extra" : `${word} extra`;
    const number: HTMLElement =
        kinds === undefined
            ? numberOf(
                  box.change === "removed" ? "" : box.number.replace("NONE", "–"),
                  known === undefined || box.number === ""
                      ? null
                      : (): void => {
                            boxShow(known).catch((error: unknown): void =>
                                console.error(error),
                            );
                        },
                  known?.note || "Open",
              )
            : kindMenuOf(
                  box.number,
                  box.id === "" && box.day === kindAsked,
                  (kind: string): void => {
                      kinds[box.day] = kind;
                      preview.filled();
                  },
              );
    const place: (string | Node)[] =
        known !== undefined
            ? whereLinkedOf(
                  known.category,
                  known.from,
                  roomOf(known.location),
                  known.locationLink,
                  known.online,
                  known.onlineLink,
              )
            : whereLinkedOf(
                  plain?.category ?? skillName,
                  "",
                  roomOf(box.location ?? typing?.location ?? ""),
                  box.locationLink ?? typing?.locationLink ?? "",
                  typing?.online ?? "",
                  typing?.onlineLink ?? "",
              );
    const opening: (() => void) | null =
        known === undefined || kinds !== undefined || box.number !== ""
            ? null
            : (): void => {
                  boxShow(known).catch((error: unknown): void => console.error(error));
              };
    const mine: Form | null = grouped === null ? typing : null;
    return listRowOf({
        number: number,
        day: box.day,
        open: opening,
        group:
            known !== undefined && known.group !== "" && course !== null
                ? boxGroupOf(
                      course,
                      known,
                      (_: () => void, send: () => Promise<unknown>): void =>
                          seriesAct(send),
                      mine === null
                          ? undefined
                          : (group: string): void => groupFrom(mine, group),
                  )
                : null,
        meta: [[rowTimesOf(box.time, box.minutes)], place],
        people:
            known?.attendees ??
            (box.attendees.length > 0 ? box.attendees : (typing?.attendees ?? [])),
        persons: persons,
        mark: word,
        end:
            known !== undefined && box.chained !== true
                ? knownEndOf(known)
                : pendingEndOf(box, preview),
        faded:
            box.change === "removed" ||
            ["done", "dropped", "university"].includes(box.state),
    });
}

/**
 * Makes the line `+` below the list, the plus where the numbers stand,
 * which opens the row of an extra to type,
 * see {@link draftRowOf}, with the times of the last day of the series, its day to type;
 * of the exams with the menu of its kind open, to pick it first.
 * - `add`: The line, a button.
 * - `plus`: The place of the plus.
 * - `last`: The last day of the series.
 *
 * @param preview - How the boxes show
 * @param redraw - Shows the list anew
 * @returns The line
 */
function addRowOf(preview: Preview, redraw: () => void): HTMLButtonElement {
    const add: HTMLButtonElement = document.createElement("button");
    const plus: HTMLElement = elementOf("span", "series-number", "");
    add.type = "button";
    add.className = "series-row series-add";
    add.setAttribute("aria-label", "Add a date");
    add.title = "Add a date";
    plus.append(iconOf(Plus));
    add.append(plus);
    add.addEventListener("click", (): void => {
        const last: Slot | undefined = preview.days.slots[preview.days.slots.length - 1];
        extraTyped =
            plain !== null && !plainTimed
                ? { day: "", start: "", end: "" }
                : { day: "", start: last?.start ?? "", end: last?.end ?? "" };
        kindTyped = "";
        redraw();
        if (preview.kinds === undefined)
            document
                .querySelector<HTMLInputElement>(".series-draft .date-field")
                ?.focus();
        else document.querySelector<HTMLElement>(".series-draft .menu")?.showPopover();
    });
    return add;
}

/**
 * Makes the row of an extra being typed below the list, as a box stands in it:
 * of the exams its kind, see {@link kindMenuOf}, the day to type once it is picked;
 * its day, grey `dd.mm.yyyy` while empty, its times, those of the series at first,
 * small and grey as the times of a row, of a plain series without time none,
 * since it takes the length of the series; and its `×`, which takes it back.
 * Nothing else to type: it takes what the series is, its place and who I am with,
 * and its own once its box is written, by its number, see {@link boxShow}.
 * Typed enough, it joins the series as the focus leaves the row, by Enter too,
 * and stands in the list by its day, see {@link extraJoin};
 * one taken back by its `×` never, though its field loses the focus as the list shows anew.
 * - `row`: The row.
 * - `kinds`: Of the exams, the kinds I gave them, `undefined` for any other series.
 * - `number`: Where the numbers stand, of the exams its kind.
 * - `day`: The field of its day.
 * - `times`: The fields of its times, an empty place for a plain series without time.
 *
 * @param extra - The extra being typed
 * @param preview - How the boxes show
 * @param redraw - Shows the list anew
 * @returns The row
 */
function draftRowOf(extra: Extra, preview: Preview, redraw: () => void): HTMLElement {
    const row: HTMLElement = elementOf("div", "series-row series-draft", "");
    const kinds: Kinds | undefined = preview.kinds;
    const day: HTMLInputElement = fieldOf(
        "date-field",
        extra.day === "" ? "" : weekdayDateTextOf(extra.day),
        "Day of the extra",
        (typed: string): void => {
            extra.day = typed;
        },
        (): void => {},
    );
    const times: HTMLElement =
        plain !== null && !plainTimed
            ? elementOf("span", "series-times", "")
            : timesRangeOf(extra, (): void => {});
    times.classList.add("series-times");
    const number: HTMLElement =
        kinds === undefined
            ? elementOf("span", "series-number", "")
            : kindMenuOf(
                  kindTyped,
                  kindAsked !== "" && extra.day === kindAsked,
                  (kind: string): void => {
                      kindTyped = kind;
                      day.focus();
                  },
              );
    row.append(
        number,
        day,
        times,
        elementOf("span", "series-word", ""),
        removeOf("Take the date back", (): void => {
            extraTyped = null;
            redraw();
        }),
    );
    row.addEventListener("focusout", (event: FocusEvent): void => {
        if (
            extraTyped === extra &&
            !row.contains(event.relatedTarget as Node | null) &&
            extraJoin(preview.days, kinds)
        )
            preview.filled();
    });
    return row;
}

/**
 * Joins the extra being typed to the series, see {@link draftRowOf},
 * once typed enough, a day with a start before its end, of a plain series without time a day alone,
 * with its kind, as the focus leaves its row or the form saves, see {@link formSave}.
 * - `extra`: The extra being typed, `null` for none.
 *
 * @param days - The days of the series, which take it
 * @param kinds - Of the exams, the kinds I gave them, `undefined` for any other series
 * @returns Whether it joined, so the list shows anew
 */
function extraJoin(days: Days, kinds: Kinds | undefined): boolean {
    const extra: Extra | null = extraTyped;
    if (
        extra === null ||
        extra.day === "" ||
        ((plain === null || plainTimed) && !timesReady(extra))
    )
        return false;
    extraTyped = null;
    if (kinds !== undefined && kindTyped !== "") kinds[extra.day] = kindTyped;
    days.extras.push(extra);
    days.extras.sort((first: Extra, second: Extra): number =>
        first.day.localeCompare(second.day),
    );
    return true;
}

/**
 * Makes the list of the boxes of a series by month, see {@link boxListOf}:
 * each month short at the left, like `Oct 2026`,
 * where the names of the rows stand, its rows beside it, in the order given;
 * the cards of the course on the page of a module the same, see `../editor/course.ts`.
 * - `list`: The list.
 * - `month`: The month of the row before, empty before the first.
 * - `boxes`: The rows of that month.
 *
 * @param items - Each row with its place in time,
 *   like `2026-10-16T13:00:00Z` or `2026-10-16`, the earliest first
 * @returns The list
 */
export function monthListOf(items: [string, HTMLElement][]): HTMLElement {
    const list: HTMLElement = elementOf("div", "series-list", "");
    let month: string = "";
    let boxes: HTMLElement = list;
    items.forEach(([moment, row]: [string, HTMLElement]): void => {
        const name: string = new Date(
            `${moment.slice(0, 10)}T12:00:00`,
        ).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        if (name !== month) {
            boxes = elementOf("div", "series-boxes", "");
            list.append(elementOf("span", "entry-name series-month", name), boxes);
        }
        month = name;
        boxes.append(row);
    });
    return list;
}

/**
 * Makes the list of the boxes of a series, see the top of this file:
 * the boxes by their days, by month, see {@link monthListOf};
 * below them `+`, see {@link addRowOf}, or the extra being typed, see {@link draftRowOf},
 * but for a group, whose sessions are the university's;
 * of a plain series an extra is one of its single dates, its `RDATE`,
 * see `extras` of `Plain` in `reader/rules.ts`.
 * The sessions of a group numbered by their weeks of the semester as the reader numbers them,
 * as my boxes are, see `groupApply` in `reader/course.ts`,
 * one the university cancelled showing `–`, one the change removes none.
 * - `had`: Whether the series had boxes before.
 * - `items`: Each box with its place in time and its row.
 * - `list`: The list.
 *
 * @param planned - The boxes as the reader would write them, removed ones too, the earliest first
 * @param preview - How the boxes show
 * @param redraw - Shows the list anew
 * @returns The list
 */
function boxListOf(
    planned: Planned[],
    preview: Preview,
    redraw: () => void,
): HTMLElement {
    const had: boolean = planned.some((box: Planned): boolean => box.id !== "");
    const items: [string, HTMLElement][] = planned.map(
        (box: Planned): [string, HTMLElement] => [
            box.time || box.day,
            sessionTyped !== null && sessionOf(box)?.id === sessionTyped.id
                ? sessionRowOf(sessionTyped, redraw)
                : boxRowOf(box, had, preview),
        ],
    );
    const list: HTMLElement = monthListOf(items);
    if (grouped === null && (typing === null || !groupWaits(typing)))
        list.append(
            extraTyped === null
                ? addRowOf(preview, redraw)
                : draftRowOf(extraTyped, preview, redraw),
        );
    return list;
}

/**
 * Shows the boxes a series makes in the row of its boxes, see {@link boxesRowOf},
 * as the reader answers, see the top of this file: their line,
 * and below it their list while opened; in their place the hint why it makes none;
 * nothing while the series is not typed enough,
 * or the reader does not take it, the row then hidden, see {@link previewPut},
 * and only the answer to the last question.
 * - `asked`: The number of this question.
 * - `answer`: What the reader answered.
 * - `draw`: Shows the line, and the list while opened.
 *
 * @param form - The form of the series, which holds the row of its boxes
 * @param preview - How the boxes show
 * @throws {Error} - When the reader does not answer
 */
async function previewShow(form: HTMLElement, preview: Preview): Promise<void> {
    const asked: number = ++previewsAsked;
    if (preview.ask === null) {
        previewShown = [];
        previewPut(form, previewShown);
        return;
    }
    let answer: Planned[] | HTMLElement;
    try {
        answer = await preview.ask();
    } catch (error: unknown) {
        if (asked === previewsAsked) {
            previewShown = [];
            previewPut(form, previewShown);
        }
        throw error;
    }
    if (asked !== previewsAsked) return;
    if (answer instanceof HTMLElement) {
        previewShown = [answer];
        previewPut(form, previewShown);
        return;
    }
    const planned: Planned[] = answer;
    await boxesLoad(planned);
    if (asked !== previewsAsked) return;
    const draw: () => void = (): void => {
        previewShown = [
            summaryOf(planned, (): void => {
                listOpened = !listOpened;
                draw();
            }),
            ...(listOpened ? [boxListOf(planned, preview, draw)] : []),
        ];
        previewPut(form, previewShown);
    };
    draw();
}

/**
 * Shows anew the boxes a series makes a moment after the typing rests, see {@link previewShow},
 * so typing asks the reader once; a change before then takes the place of the one waiting.
 *
 * @param form - The form of the series, which holds the row of its boxes
 * @param preview - How the boxes show
 */
export function previewSoon(form: HTMLElement, preview: Preview): void {
    clearTimeout(previewWait);
    previewWait = window.setTimeout((): void => {
        previewShow(form, preview).catch((error: unknown): void => console.error(error));
    }, 150);
}

/**
 * Asks the reader for a change of the course, like a group made mine, as JSON.
 *
 * @param address - Address at the reader, like `/api/course/mine`
 * @param body - What to change
 * @returns Answer of the reader
 * @throws {Error} - When the reader does not take it
 */
export async function courseSend<T>(address: string, body: object): Promise<T> {
    return readerAsk<T>(address, { method: "POST", body: JSON.stringify(body) });
}

/**
 * Gives the groups of a type of the course of the dialog.
 *
 * @param type - Type, like `TU`
 * @returns Its groups, by group
 */
function groupsOf(type: string): Group[] {
    return (course?.groups ?? []).filter(
        (group: Group): boolean => group.rule.type === type,
    );
}

/**
 * Gives a field of `Skill` as the reader offers it, its places, platforms or people,
 * see `categoriesRead` in `reader/categories.ts`.
 *
 * @param key - The field, `location`, `online` or `with`
 * @returns The field, `undefined` while the categories are not loaded
 */
function skillFieldOf(key: string): Field | undefined {
    return categories
        .find((category: Category): boolean => category.name === skillName)
        ?.fields.find((field: Field): boolean => field.key === key);
}

/**
 * Gives my default place, `★` in `Places.md`, like `Home Munich`,
 * which every new series starts with, a new group and my learning too, as a new box does,
 * see `lastPlaceFill` in `./categories.ts`.
 * - `standard`: My default place, `undefined` for none.
 *
 * @returns Its line, like `Home Munich, Burg-Eltz-Weg, 81375, München, Deutschland`, empty for none
 */
function standardLineOf(): string {
    const standard: Place | undefined = Object.values(
        skillFieldOf("location")?.places ?? {},
    ).find((place: Place): boolean => place.standard);
    return standard === undefined ? "" : lineOf(standard);
}

/**
 * Gives the plan a plain series lies in or goes into, shown at the left of the buttons of its form:
 * of one there its file, of a new one as soon as it is known, the plan of its skill,
 * see `skillNamesOf` in `./skill.ts`,
 * or the plan of its topic in the year of its first day,
 * see `topicFileOf` in `./categories.ts`.
 *
 * @param series - The plain series
 * @param form - The form, which holds its first day
 * @returns Path from `NomWorkspace` on,
 *   like `NomManageplannings/NomManagecalendar/Health/Sleep_2026_Plan.ics`, empty while not known
 */
function plainFileOf(series: Plain, form: Form): string {
    if (series.file !== "") return series.file;
    if (series.category === skillName)
        return skillNamesOf({ module: series.module, type: series.type }).file;
    return series.category === "" || form.first === ""
        ? ""
        : topicFileOf(series.category, form.first, "_Plan.ics");
}

/**
 * Tells whether the form asks who I am with: for a series of my course,
 * and for a new box repeated or a plain series whose category has `With`,
 * as the dialog of the box asks it, so not for `Sport`, which I do alone,
 * see `reader/categories.ts`.
 * - `category`: The category of the box repeated, `undefined` for none.
 *
 * @returns Whether it asks
 */
function withAsked(): boolean {
    const category: Category | undefined = categories.find(
        (one: Category): boolean =>
            one.name === (plain?.category ?? repeated?.box.category),
    );
    return (
        (repeated === null && plain === null) ||
        (category?.fields.some((field: Field): boolean => field.key === "with") ?? false)
    );
}

/**
 * Tells whether the form names its group, new or renamed,
 * as another group of its type is named already, see {@link groupPartOf}.
 *
 * @param form - The form
 * @returns Whether the name typed is taken
 */
function groupTaken(form: Form): boolean {
    return (
        grouped !== null &&
        grouped.group !== grouped.was &&
        groupsOf(form.type).some(
            (group: Group): boolean => group.rule.group === grouped?.group,
        )
    );
}

/**
 * Tells whether the form of a new group has no name yet, see {@link groupPartOf}.
 *
 * @returns Whether it is a group without name
 */
function groupUnnamed(): boolean {
    return grouped !== null && grouped.group === "";
}

/**
 * Tells whether the form of a series is typed enough to make boxes:
 * of a plain series as {@link plainReady} says, else its type picked,
 * but for a new box repeated of any type or none, see {@link seriesRepeat}, and its days,
 * see {@link daysReady}; a new group not named as one there already, see {@link groupTaken}.
 *
 * @param form - The form
 * @returns Whether it is ready
 */
function formReady(form: Form): boolean {
    if (
        fresh !== null &&
        (fresh.category === "" ||
            (fresh.category === skillName && fresh.picked.module === ""))
    )
        return false;
    if (plain !== null) return plainReady(plain, form);
    if (form.type === "" && repeated === null) return false;
    return daysReady(form) && !groupTaken(form) && !groupUnnamed() && !groupWaits(form);
}

/**
 * Gives the exams of the course of the dialog as the rule of a series, see the top of this file:
 * no weekdays, its first and last day those of its exams, no extras,
 * so its form lists the exams with the kinds and the times I give them and holds
 * as extras only the dates I add, see {@link examSend}.
 * - `days`: The days of its exams, the earliest first.
 *
 * @param loaded - The course
 * @returns The rule
 */
function examRuleOf(loaded: Course): Rule {
    const days: string[] = loaded.boxes
        .filter((box: Box): boolean => box.type === examType)
        .map((box: Box): string => box.day);
    return {
        type: examType,
        slots: [],
        extras: [],
        location: "",
        locationLink: "",
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        attendees: [],
        first: days[0] ?? dayOf(new Date()),
        last: days[days.length - 1] ?? dayOf(new Date()),
        times: {},
        group: "",
        semester: loaded.semester,
    };
}

/**
 * Lists the exams of the form, see {@link examRuleOf}, each with the kind and the times I gave it,
 * see {@link Kinds} and `times` of {@link Days},
 * and the dates I added as new, each with the kind I gave it, the earliest first;
 * or writes them: each exam I gave another kind or other times,
 * see `examSet` in `reader/course.ts`, then each date added as an exam of the module alone,
 * as the dialog of an entry adds a box,
 * see `boxAdd` in `./entries.ts`, with the kind I gave it and who I am with.
 * - `timed`: Gives the start and the length of times on a day.
 * - `exams`: The exams with the kinds and the times I gave them.
 * - `start`: The start of the times I gave an exam, `null` while I gave it none.
 * - `time`, `minutes`, `number`: Its time, its length and its kind after the change.
 * - `added`: The dates added, each with its start and length.
 * - `id`: The identifier of an exam added.
 *
 * @param form - The form of the exams
 * @param dry - Whether only to list them, for the preview
 * @returns The exams after the change
 * @throws {Error} - When the reader does not take an exam or a date
 */
async function examSend(form: Form, dry: boolean): Promise<Planned[]> {
    const timed: (day: string, times: Pick<Slot, "start" | "end">) => [Date, number] = (
        day: string,
        times: Pick<Slot, "start" | "end">,
    ): [Date, number] => {
        const start: Date = new Date(`${day}T${times.start}:00`);
        return [
            start,
            (new Date(`${day}T${times.end}:00`).getTime() - start.getTime()) /
                (60 * 1000),
        ];
    };
    const exams: Planned[] = (course?.boxes ?? [])
        .filter((box: Box): boolean => box.type === examType)
        .map((box: Box): Planned => {
            const [start, minutes]: [Date | null, number | null] =
                form.times[box.day] === undefined
                    ? [null, box.minutes]
                    : timed(box.day, form.times[box.day]);
            const time: string = start === null ? box.time : start.toISOString();
            const number: string = form.kinds[box.day] ?? box.number;
            return {
                id: box.id,
                day: box.day,
                time: time,
                minutes: minutes,
                number: number,
                state: box.state,
                pushed: box.pushed.length > 0,
                editable: false,
                retimable:
                    box.editable && box.todo && !box.series && box.pushed.length === 0,
                change:
                    time === box.time && minutes === box.minutes && number === box.number
                        ? ""
                        : "changed",
                attendees: box.attendees,
            };
        });
    const added: [Extra, Date, number][] = form.extras.map(
        (extra: Extra): [Extra, Date, number] => [extra, ...timed(extra.day, extra)],
    );
    if (!dry) {
        for (const exam of exams.filter(
            (one: Planned): boolean => one.change === "changed",
        ))
            await courseSend<null>("/api/course/exam", {
                box: exam.id,
                kind: exam.number,
                start: form.times[exam.day]?.start ?? "",
                end: form.times[exam.day]?.end ?? "",
            });
        for (const [extra, start, minutes] of added) {
            const id: string = await boxAdd({
                category: skillName,
                title: "",
                location: "",
                from: "",
                module: (course?.module ?? "").split("_")[0],
                type: examType,
                semester: course?.semester ?? "",
                note: "",
                day: extra.day,
                time: start,
                minutes: minutes,
                deadline: "",
                chapters: [],
                documents: [],
                attendees: form.attendees,
            });
            if (form.kinds[extra.day] !== undefined)
                await courseSend<null>("/api/course/exam", {
                    box: id,
                    kind: form.kinds[extra.day],
                    start: "",
                    end: "",
                });
        }
    }
    return [
        ...exams,
        ...added.map(([extra, start, minutes]: [Extra, Date, number]): Planned => ({
            id: "",
            day: extra.day,
            time: start.toISOString(),
            minutes: minutes,
            number: form.kinds[extra.day] ?? "",
            state: "new",
            pushed: false,
            editable: true,
            retimable: true,
            change: "new",
            attendees: form.attendees,
        })),
    ].sort((first: Planned, second: Planned): number =>
        (first.time || first.day).localeCompare(second.time || second.day),
    );
}

/**
 * Sends the form of a series to the reader: a plain series,
 * see {@link plainSend}, a group, its days, place, tutors, weeks and the dates I cancelled,
 * see `groupApply` in `reader/course.ts`, the exams, see {@link examSend}, a group made mine,
 * see `groupMine` there, a new box repeated,
 * see {@link repeatedSend},
 * else the series by its rule and the states I gave its boxes, see `seriesApply` there.
 *
 * @param form - The form, ready, see {@link formReady}
 * @param dry - Whether only to tell what it would make, for the preview
 * @returns The boxes of the series after the change, of a group its sessions
 * @throws {Error} - When the reader does not take it
 */
async function formSend(form: Form, dry: boolean): Promise<Planned[]> {
    if (plain !== null) return plainSend(plain, form, dry);
    if (grouped !== null)
        return courseSend<Planned[]>("/api/course/groups", {
            module: course?.module ?? "",
            made: grouped.made,
            was: grouped.was,
            states: form.states,
            dry: dry,
            rule: {
                type: form.type,
                slots: form.slots,
                extras: [],
                location: form.location,
                locationLink: form.locationLink,
                online: form.online,
                onlineLink: form.onlineLink,
                onlineChannel: form.onlineChannel,
                onlineTitle: form.onlineTitle,
                attendees: form.attendees,
                first: form.first,
                last: form.last,
                group: grouped.group,
                semester: course?.semester ?? "",
            },
        });
    if (form.type === examType) return examSend(form, dry);
    if (repeated !== null) return repeatedSend(repeated.box, form, dry);
    return courseSend<Planned[]>("/api/course/series", {
        module: course?.module ?? "",
        old: form.old,
        before: form.before,
        states: form.states,
        dry: dry,
        rule: {
            type: form.type,
            slots: form.slots,
            extras: form.extras,
            location: form.location,
            locationLink: form.locationLink,
            online: form.online,
            onlineLink: form.onlineLink,
            onlineChannel: form.onlineChannel,
            onlineTitle: form.onlineTitle,
            attendees: form.attendees,
            first: form.first,
            last: form.last,
            times: form.times,
            group: form.old?.group ?? "",
            semester: course?.semester ?? "",
        },
    });
}

/**
 * Sends a new box repeated, see {@link seriesRepeat}, once per date of the days of the form,
 * see `boxRepeat` in `./entries.ts`:
 * its fields with the place, what it does online and who I am with as the form has them, its days,
 * and the states I gave its boxes, of a lecture a date cancelled by its day.
 * - `planned`: The boxes it makes,
 *   `null` when the reader refuses it since the series of its type is there already.
 *
 * @param box - The fields of the box
 * @param form - The form, ready, see {@link formReady}
 * @param dry - Whether only to tell what it would make, for the preview
 * @returns The boxes it makes
 * @throws {Error} - When the reader does not take it,
 *   also since the series of its type is there already
 */
async function repeatedSend(
    box: BoxFields,
    form: Form,
    dry: boolean,
): Promise<Planned[]> {
    const planned: Planned[] | null = await boxRepeat(
        {
            ...box,
            location: form.location,
            online: form.online,
            onlineLink: form.onlineLink,
            onlineChannel: form.onlineChannel,
            onlineTitle: form.onlineTitle,
            attendees: form.attendees,
        },
        form,
        form.states,
        dry,
    );
    if (planned === null)
        throw new Error(`${box.module} ${box.type} has its series already`);
    return planned;
}

/**
 * Gives the form of the dialog, its element.
 *
 * @returns The form
 */
function formElementOf(): HTMLFormElement {
    return document.getElementById("series-form") as HTMLFormElement;
}

/**
 * Locks rows of my series of a type with groups:
 * its place, what it does online, its days, its dates and who I am with come from the group I pin,
 * so they show as the group has them but take no input, changed in the form of the group;
 * while none is pinned, see {@link groupWaits}, empty; any other form as it is.
 *
 * @param locked - Whether to lock them
 * @param rows - The rows
 * @returns The rows
 */
function lockedOf(locked: boolean, rows: HTMLElement[]): HTMLElement[] {
    rows.forEach((row: HTMLElement): void => {
        row.inert = locked;
    });
    return rows;
}

/**
 * Fills my series that waits for my group, see {@link groupWaits}:
 * what comes from a group empty, its place, what it does online, its days and who I am with,
 * even where a group of before left them;
 * its dates as far as they are known:
 * from the earliest of its own first day,
 * the first days of the groups of its type in the semester and my boxes there,
 * to the latest of its own last day and the last days of those groups;
 * nothing is saved, since such a form saves nothing.
 * - `rules`: The rules of the groups of its type.
 * - `firsts`, `lasts`: Their first and last days, and the days of my boxes there.
 *
 * @param form - The form of my series
 */
function waitingFill(form: Form): void {
    Object.assign(form, {
        location: "",
        locationLink: "",
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        attendees: [],
        slots: [],
    });
    const rules: Rule[] = groupsOf(form.type).map((group: Group): Rule => group.rule);
    const firsts: string[] = [
        form.first,
        ...rules.map((rule: Rule): string => rule.first),
        ...keptOf(form).map((box: Planned): string => box.day),
    ]
        .filter((day: string): boolean => day !== "")
        .sort();
    const lasts: string[] = [form.last, ...rules.map((rule: Rule): string => rule.last)]
        .filter((day: string): boolean => day !== "")
        .sort();
    form.first = firsts[0] ?? "";
    form.last = lasts[lasts.length - 1] ?? "";
}

/**
 * Gives my boxes of the type of my series that waits for my group, see {@link groupWaits}:
 * those of the days over and those I took from a group by hand, of days to come too,
 * see `chosenIs` in `reader/course.ts`, which stay whatever group is pinned,
 * so its list shows them while no group is mine, as they are, none to change there.
 *
 * @param form - The form of my series
 * @returns The boxes, the earliest first
 */
function keptOf(form: Form): Planned[] {
    return (course?.boxes ?? [])
        .filter((box: Box): boolean => box.type === form.type)
        .map((box: Box): Planned => ({
            id: box.id,
            day: box.day,
            time: box.time,
            minutes: box.minutes,
            number: box.number,
            state: box.state,
            pushed: box.pushed.length > 0,
            editable: false,
            retimable: false,
            change: "",
            attendees: box.attendees,
        }));
}

/**
 * Takes a change of the form of a series: allows saving while it is ready, see {@link formReady},
 * and shows anew the boxes it makes as the reader would write them,
 * see {@link formSend} and {@link previewSoon}, its extras among them,
 * of the exams each with its kind to pick;
 * of my series waiting for my group my boxes there, see {@link keptOf}.
 * - `kept`: Those boxes, none for any other form.
 * - `save`: Its button Save.
 * - `form`: The form.
 */
function formChanged(): void {
    const save: HTMLButtonElement | null = formElementOf().querySelector(".panel-main");
    if (typing === null || save === null) return;
    const form: Form = typing;
    const kept: Planned[] = groupWaits(form) ? keptOf(form) : [];
    save.disabled = !formReady(form);
    previewSoon(formElementOf(), {
        ask: formReady(form)
            ? (): Promise<Planned[]> => formSend(form, true)
            : kept.length > 0
              ? async (): Promise<Planned[]> => kept
              : null,
        days: form,
        states: form.states,
        kinds: form.type === examType ? form.kinds : undefined,
        filled: formFill,
    });
}

/**
 * Shows the address of the place of the form below it, small and grey,
 * as the dialog does, a link to the link of the place while it has one,
 * never the link itself as text, so nothing for no place or a place without address;
 * a place I changed by its parts with the address and the link I gave it, see {@link placeEdit}.
 * - `link`: The link to open, empty for none.
 *
 * @param address - The address below the place
 * @param form - The form
 */
function addressShow(address: HTMLAnchorElement, form: Form): void {
    const link: string = placeEdit?.link ?? form.locationLink;
    address.textContent =
        placeEdit !== null ? placeAddressOf(placeEdit) : addressOf(form.location);
    if (link !== "") address.href = link;
    else address.removeAttribute("href");
    address.hidden = address.textContent === "";
}

/**
 * Gives the place of the form as it is, before I change it by its parts:
 * as its row holds it, my place or the room of its name, else as its line says,
 * with the link of the series, see `placeOf` in `./places.ts`.
 *
 * @param form - The form
 * @returns The place
 */
function placeOriginOf(form: Form): Place {
    return placeOf(
        form.location,
        form.locationLink,
        skillFieldOf("location")?.places ?? {},
    );
}

/**
 * Makes the row `Summary`, what the series is,
 * as its boxes are written and as the dialog of one of them names it,
 * see `summaryPartsOf` in `./categories.ts`: the title of the series, never changed here,
 * since it follows from elsewhere:
 * of my course the folder of its module and its type in brackets, like
 * `IN2028_BusinessAnalyticsMachineLearning (VO)`, a series that is there, one waiting for my group,
 * see {@link groupWaits}, and a group as plain text,
 * a new one with only its type to pick, its plus right after the module,
 * from the numbered types without series, its list open as the dialog opens,
 * see {@link seriesOpen}; of a new box repeated its summary as plain text,
 * which the pencil of the summary of the box changes, see {@link Repeated}.
 * Below it, small and grey, the folder of the material of its type in the semester,
 * like `…/TU_UniversityTutorExercises/TUM_2026W`,
 * see `folderLinkShow` in `../skill/links.ts`, one not there yet looking the same but no link,
 * nothing under the pointer, `Not there yet` as its tooltip, until its first box makes it;
 * of a new box repeated the folder of the box, none while it has none.
 * No frame under the pointer, as every row written by itself, see `.panel-fixed` in `./day.css`.
 * - `module`: The folder of the module.
 * - `types`: The numbered types without series, and that of the form.
 * - `link`: The folder below the summary.
 * - `value`: The summary with the folder below it,
 *   or of a new series the module with the type to pick.
 * - `row`: The row.
 *
 * @param form - The form
 * @returns The row
 */
function seriesRowOf(form: Form): HTMLElement {
    const module: string = course?.module ?? "";
    const types: string[] = numberedTypes.filter(
        (type: string): boolean =>
            type === form.type ||
            !(course?.series ?? []).some(
                (series: Series): boolean => series.rule.type === type,
            ),
    );
    const link: HTMLAnchorElement = elementOf(
        "a",
        "entry-address",
        "",
    ) as HTMLAnchorElement;
    const folder: MaterialFolder | undefined =
        repeated === null ? course?.folders[form.type] : undefined;
    folderLinkShow(
        link,
        folder === undefined
            ? (repeated?.link ?? course?.links[form.type] ?? "")
            : `${modulesFolder}/${module}/${folder.path}`,
    );
    if (folder !== undefined && !folder.exists) {
        link.removeAttribute("href");
        link.title = "Not there yet";
    }
    const value: HTMLElement = elementOf("div", "", "");
    if (form.old !== null || repeated !== null || grouped !== null || groupWaits(form))
        value.append(
            elementOf(
                "span",
                "",
                breakableOf(repeated?.summary ?? `${module} (${form.type})`),
            ),
            link,
        );
    else
        value.append(
            pairOf(
                elementOf("span", "", breakableOf(module)),
                choicesOf({
                    search: searchOf(types.map(choiceOf)),
                    picked: form.type === "" ? [] : [form.type],
                    many: false,
                    adding: false,
                    noun: "type",
                    plus: true,
                    empty: "Pick a type",
                    pick: (values: string[]): void => {
                        form.type = values[0] ?? "";
                        grouped = null;
                        formFill();
                    },
                }),
            ),
            link,
        );
    const row: HTMLElement = rowOf("Summary", value);
    row.classList.add("panel-fixed");
    return row;
}

/**
 * Gives the search of a place of the form, see {@link placeRowOf}, and of a session changed alone,
 * see {@link sessionRowOf}:
 * while nothing is typed my places and the place there already, my default place first,
 * as I type the rooms of the university too, each with its address grey beside it,
 * see `placeChoiceOf` in `./places.ts`.
 * - `field`: The field of the place of `Skill`, `undefined` while the categories are not loaded.
 * - `values`: The places offered.
 * - `places`: My places and rooms, by their lines.
 *
 * @param current - The place there already, empty for none
 * @param nameShown - Gives the name a place shows
 * @returns The search
 */
function placeSearchOf(
    current: string,
    nameShown: (line: string) => string,
): (text: string) => Promise<Choice[]> {
    const field: Field | undefined = skillFieldOf("location");
    return async (text: string): Promise<Choice[]> => {
        const values: string[] =
            text.trim() === ""
                ? [...(field?.values ?? []), ...(current === "" ? [] : [current])]
                : [...(field?.values ?? []), ...(field?.rooms ?? [])];
        const places: { [line: string]: Place } = field?.places ?? {};
        return await searchOf(
            standardFirst([...new Set(values)], places).map((value: string): Choice =>
                placeChoiceOf(value, nameShown(value), places),
            ),
        )(text);
    };
}

/**
 * Makes the row of the place of the form, picked as in the dialog,
 * see `placeSearchOf` in `./categories.ts`:
 * my default place first, with its star, then my places, the most used first,
 * and as I type the rooms of the university too, each with its address grey beside it,
 * see `placeChoiceOf` in `./places.ts`, the place of the series among them;
 * below it its address, a link. A place picked takes the link of my place or room.
 * Right after the place, while one is picked, its pencil shows and hides its parts below it,
 * the columns of its row, its label, street, code, city, country, link and star,
 * see `placeEditOf` in `./places.ts`, which I change in place as in the dialog:
 * the form takes the place as I type,
 * see {@link placeEdit}, its line and its address show it once I leave a part, the row built anew,
 * the part or field I went on to keeping the cursor,
 * and saving writes it everywhere, see {@link placeRename}.
 * - `field`: The field of the place of `Skill`, `undefined` while the categories are not loaded.
 * - `address`: The address below the place.
 * - `pencil`: The pencil, `✎`.
 * - `parts`: The parts, shown while the pencil opened them, see {@link placeOpen}.
 * - `nameShown`: Gives the name a place shows, the one I gave the place of the form.
 * - `row`: The row.
 *
 * @param form - The form
 * @returns The row
 */
function placeRowOf(form: Form): HTMLElement {
    const field: Field | undefined = skillFieldOf("location");
    const address: HTMLAnchorElement = document.createElement("a");
    const pencil: HTMLButtonElement = document.createElement("button");
    const parts: HTMLElement = elementOf("div", "field-parts", "");
    const nameShown: (line: string) => string = (line: string): string =>
        line === form.location && placeEdit !== null && placeEdit.name !== ""
            ? placeEdit.name
            : labelOf(line);
    address.className = "entry-address";
    address.target = "_blank";
    address.rel = "noopener";
    addressShow(address, form);
    pencil.type = "button";
    pencil.className = "entry-pencil";
    pencil.hidden = form.location === "";
    iconPut(pencil, Pencil, "Change the place");
    parts.hidden = !placeOpen;
    const row: HTMLElement = rowOf(
        "Place",
        choicesOf({
            search: placeSearchOf(form.location, nameShown),
            picked: form.location === "" ? [] : [form.location],
            many: false,
            adding: false,
            noun: "place",
            textOf: nameShown,
            aside: [pencil],
            below: [address, parts],
            pick: (values: string[]): void => {
                const line: string = values[0] ?? "";
                if (line === form.location) return;
                form.location = line;
                form.locationLink = field?.places[line]?.link ?? "";
                placeEdit = null;
                formFill();
            },
        }),
    );
    parts.append(
        ...placeEditOf(
            placeEdit ?? placeOriginOf(form),
            (typed: Place): void => {
                placeEdit = typed;
            },
            (next: string | null): void => {
                row.replaceWith(placeRowOf(form));
                formElementOf()
                    .querySelector<HTMLInputElement>(`input[aria-label="${next}"]`)
                    ?.focus();
            },
        ),
    );
    pencil.addEventListener("click", (): void => {
        placeOpen = !placeOpen;
        parts.hidden = !placeOpen;
        if (placeOpen) parts.querySelector("input")?.focus();
    });
    return row;
}

/**
 * Makes the row of what the series does online in the form,
 * the row `Online` of the dialog of an entry,
 * see `onlineRowOf` in `./categories.ts`, its field that of `Skill`:
 * its platform, below it grey its provider, channel and title,
 * its pencil opening `Label`, `Provider`, `Channel`, `Title` and `Link`;
 * what I pick and type goes into the form, so into its boxes.
 * - `field`: The field `Online` of `Skill`, `undefined` while the categories are not loaded.
 *
 * @param form - The form
 * @returns The row, none while the categories are not loaded
 */
function onlineRowsOf(form: Form): HTMLElement[] {
    const field: Field | undefined = skillFieldOf("online");
    return field === undefined
        ? []
        : [
              onlineRowOf({
                  field: field,
                  categories: categories,
                  online: {
                      online: form.online,
                      onlineLink: form.onlineLink,
                      onlineChannel: form.onlineChannel,
                      onlineTitle: form.onlineTitle,
                  },
                  open: onlineOpen,
                  opened: (open: boolean): void => {
                      onlineOpen = open;
                  },
                  pick: (online: Online): void => {
                      Object.assign(form, online);
                      formChanged();
                  },
              }),
          ];
}

/**
 * Makes the row of who I am with in the form, the row `With` of the dialog of an entry,
 * see `withRowOf` in `./categories.ts`, its field that of `Skill`;
 * what I pick goes into the form, so into its boxes.
 * - `field`: The field `With` of `Skill`, `undefined` while the categories are not loaded.
 *
 * @param form - The form
 * @returns The row, none while the categories are not loaded
 */
function peopleRowsOf(form: Form): HTMLElement[] {
    const field: Field | undefined = skillFieldOf("with");
    return field === undefined
        ? []
        : [
              withRowOf({
                  field: field,
                  persons: persons,
                  people: form.attendees,
                  open: withOpen,
                  edits: personEdits,
                  opened: (open: string[]): void => {
                      withOpen = open;
                  },
                  pick: (people: Attendee[]): void => {
                      form.attendees = people;
                      formChanged();
                  },
              }),
          ];
}

/**
 * Gives the group typed in the row `Group` as a group is named, see {@link groupPartOf}:
 * digits filled up to two, like `05` of `5`, any other name as typed, of letters, digits,
 * `_` and `-`; a space anywhere, also at an end, makes no name, never trimmed away in silence.
 * - `name`: The text typed, its digits filled up.
 *
 * @param text - The text typed, like `5` or `Di-1400`
 * @returns The group, like `05`, empty for nothing typed,
 *   `null` for a text a group may not be named
 */
function groupTypedOf(text: string): string | null {
    const name: string = /^\d+$/.test(text) ? text.padStart(2, "0") : text;
    return name === "" || /^[\w-]+$/.test(name) ? name : null;
}

/**
 * Makes the group of the form of a group of the tutorials, beside its semester,
 * see {@link semesterRowOf}:
 * a field I type its name into, a group there with its name to rename it,
 * saving renaming it everywhere, a new one grey `Group name` while empty,
 * like `5` or `Group 5` for `Group 05`,
 * see {@link groupTypedOf}, with a grey hint right beside it on its line,
 * `Group is there already` while another group of the type has that name,
 * or `Invalid group name` while the name holds what a name may not, like a space.
 * - `input`: The field.
 * - `hint`: The grey hint.
 * - `value`: The field with the hint beside it.
 *
 * @returns The group
 */
function groupPartOf(): HTMLElement {
    const input: HTMLInputElement = partFieldOf("text", grouped?.group ?? "", "Group");
    const hint: HTMLElement = elementOf("span", "entry-none", "");
    const value: HTMLElement = elementOf("div", "series-group-part", "");
    input.placeholder = "Group name";
    hint.hidden = true;
    input.addEventListener("input", (): void => {
        const name: string | null = groupTypedOf(input.value);
        grouped = {
            group: name ?? "",
            made: grouped?.made ?? true,
            was: grouped?.was ?? "",
        };
        hint.hidden = name !== null && (typing === null || !groupTaken(typing));
        hint.textContent =
            name === null ? "Invalid group name" : "Group is there already";
        formChanged();
    });
    value.append(input, hint);
    return value;
}

/**
 * Makes the group of my series of a numbered type of a module beside its semester,
 * see {@link semesterRowOf}, as the summary has its type beside its skill:
 * while the type has groups in the semester, the menu of them,
 * see `pinnedMenuOf` in `./groups.ts`, naming my group with the pin before it,
 * like `Group 05`, `No group yet` while none is, a pick making the group mine,
 * my boxes to come going to it,
 * and showing my series anew, the series icon ⟳ of each group opening it in this form;
 * right after it the plus, which opens the form of a new group,
 * see {@link groupFrom}, alone while the type has no group yet.
 * - `loaded`: The course of the form.
 * - `plus`: The plus.
 * - `part`: The menu and the plus.
 *
 * @param form - The form of my series
 * @returns The menu and the plus
 */
function groupPickOf(form: Form): HTMLElement {
    const loaded: Course | null = course;
    const plus: HTMLButtonElement = plusOf("Add a group", (): void =>
        groupFrom(form, ""),
    );
    const part: HTMLElement = elementOf("span", "series-group-pick", "");
    plus.classList.add("plus-quiet");
    if (loaded !== null && groupsOf(form.type).length > 0)
        part.append(
            pinnedMenuOf(
                loaded,
                form.type,
                (_change: () => void, send: () => Promise<unknown>): void => {
                    send()
                        .then((): Promise<void> =>
                            seriesOpen(loaded.module, form.type, loaded.semester, done),
                        )
                        .catch((error: unknown): void => console.error(error));
                },
                (group: string): void => groupFrom(form, group),
            ),
        );
    part.append(plus);
    return part;
}

/**
 * Tells whether the form of my series of a type with groups waits for my group:
 * while none is mine, its rows from the group show empty and locked, see {@link lockedOf},
 * since my boxes to come follow my group, with the menu of the groups beside its semester,
 * see {@link groupPickOf}, and my boxes there,
 * which stay whatever group is pinned, see {@link keptOf}.
 *
 * @param form - The form
 * @returns Whether it waits
 */
function groupWaits(form: Form): boolean {
    return (
        course !== null &&
        grouped === null &&
        numberedTypes.includes(form.type) &&
        groupsOf(form.type).length > 0 &&
        (form.old?.group ?? "") === ""
    );
}

/**
 * Opens a group in the form from my series,
 * by its series icon or `+ Group` in the menu of the groups, see {@link groupPickOf}:
 * my series kept as I left it to go back to, see {@link groupBack},
 * and a still copy of it left below, dimmed with the page,
 * so the form of the group reads as a dialog of its own over my series,
 * as a box opened from the list stands over it, see {@link boxShow};
 * the group there or a new one without name.
 * The form of the group a little lower and further right,
 * my series behind it a little higher and further left, see `#series-under` in `series.css`,
 * so it shows above and left of it, however long either is, the two together in the middle.
 * - `series`, `under`: The dialog, and that of the copy.
 * - `copy`: The form of my series copied, without the identifiers of its parts.
 * - `rem`, `lift`: The size of a `rem`, and how far my series moves up or down to stand so.
 *
 * @param form - The form of my series
 * @param group - The group, like `05`, empty for a new one
 */
function groupFrom(form: Form, group: string): void {
    const series: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    const under: HTMLDialogElement = document.getElementById(
        "series-under",
    ) as HTMLDialogElement;
    const copy: HTMLElement = formElementOf().cloneNode(true) as HTMLElement;
    [copy, ...copy.querySelectorAll<HTMLElement>("[id]")].forEach(
        (part: HTMLElement): void => part.removeAttribute("id"),
    );
    under.replaceChildren(copy);
    under.show();
    under.scrollTop = series.scrollTop;
    groupBack = form;
    groupStart(form.type, group);
    const rem: number = parseFloat(getComputedStyle(document.documentElement).fontSize);
    series.style.translate = "1.5rem 1.5rem";
    const lift: number = series.getBoundingClientRect().top - 3 * rem - under.offsetTop;
    under.style.translate = `-1.5rem ${lift}px`;
}

/**
 * Takes away the still copy of my series below the form of a group, see {@link groupFrom},
 * once that form goes back to my series or the dialog closes.
 * - `under`: The dialog of the copy.
 */
function underClose(): void {
    const under: HTMLDialogElement = document.getElementById(
        "series-under",
    ) as HTMLDialogElement;
    under.close();
    under.replaceChildren();
    under.style.translate = "";
    (document.getElementById("series") as HTMLDialogElement).style.translate = "";
}

/**
 * Turns the form into that of a group of the tutorials of a type,
 * see the top of this file, from the row `Group`, see {@link groupPartOf},
 * or as it opens from the menu of the groups, see {@link groupOpen}:
 * of a group there as the reader reads it back, see `groupsRead` in `reader/course.ts`, its days,
 * place, what it does online, tutors and weeks, to change them;
 * of a new one its days, place and tutors empty, its weeks those of the series of its type,
 * else of any series of the course,
 * so a group of the semester needs only its day, its times and its room.
 * The form it came from is left as it was, unsaved.
 * - `found`: The group there, `undefined` for a new one.
 * - `rule`: Its rule, `undefined` for a new one.
 * - `weeks`: The rule whose weeks a new group takes, `undefined` for none.
 *
 * @param type - The type, like `TU`
 * @param group - The group, like `05`
 */
function groupStart(type: string, group: string): void {
    const found: Group | undefined = groupsOf(type).find(
        (one: Group): boolean => one.rule.group === group,
    );
    const rule: Rule | undefined = found?.rule;
    const weeks: Rule | undefined = (
        course?.series.find((series: Series): boolean => series.rule.type === type) ??
        course?.series[0]
    )?.rule;
    grouped = {
        group: group,
        made: found === undefined,
        was: found === undefined ? "" : group,
    };
    repeated = null;
    removeAsked = false;
    previewForget();
    listOpened = false;
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
    typing = {
        type: type,
        old: rule ?? null,
        slots: rule?.slots.map((slot: Slot): Slot => ({ ...slot })) ?? [
            { weekday: 0, start: "", end: "" },
        ],
        before: rule?.slots.map((slot: Slot): number => slot.weekday) ?? [0],
        extras: [],
        location: rule?.location ?? standardLineOf(),
        locationLink:
            rule?.locationLink ??
            skillFieldOf("location")?.places[standardLineOf()]?.link ??
            "",
        online: rule?.online ?? "",
        onlineLink: rule?.onlineLink ?? "",
        onlineChannel: rule?.onlineChannel ?? "",
        onlineTitle: rule?.onlineTitle ?? "",
        attendees: rule?.attendees ?? [],
        first: rule?.first ?? weeks?.first ?? "",
        last: rule?.last ?? weeks?.last ?? "",
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
}

/**
 * Tells whether the form has the bin, see {@link seriesBinOf}:
 * a group there already, a plain series there already,
 * and my series of a type of a module there already, the exams too; never a new one.
 *
 * @param form - The form
 * @returns Whether it has the bin
 */
function binShows(form: Form): boolean {
    if (grouped !== null) return !grouped.made;
    if (plain !== null) return plain.id !== "";
    return course !== null && repeated === null && form.old !== null;
}

/**
 * Makes the bin of a series there already, at the left of Cancel, as the dialog of an entry has it:
 * the first click only asks, the bin turning into a question mark, `Really remove?` as its tooltip,
 * of my series of a module `Really remove? Its boxes done stay`;
 * the second removes it and closes the dialog: a group,
 * see `groupRemove` in `reader/course.ts`, a plain series whole, its days changed alone too,
 * see `plainRemove` in `reader/rules.ts`, my series of a type of a module but its boxes done,
 * whose log entries point to them, see `courseSeriesRemove` in `reader/course.ts`.
 * When the reader does not take it, the hint above the buttons says so.
 * - `bin`: The bin.
 * - `ask`: What the first click asks.
 * - `address`: Where the reader removes it.
 *
 * @param form - The form
 * @returns The bin
 */
function seriesBinOf(form: Form): HTMLButtonElement {
    const bin: HTMLButtonElement = document.createElement("button");
    const ask: string =
        grouped === null && plain === null
            ? "Really remove? Its boxes done stay"
            : "Really remove?";
    const address: string =
        grouped !== null
            ? `/api/course/groups?${new URLSearchParams({
                  module: course?.module ?? "",
                  type: form.type,
                  group: grouped.was || grouped.group,
                  semester: course?.semester ?? "",
              })}`
            : plain !== null
              ? `/api/day/plain?${new URLSearchParams({ id: plain.id })}`
              : `/api/course/series?${new URLSearchParams({
                    module: course?.module ?? "",
                    type: form.type,
                    semester: course?.semester ?? "",
                })}`;
    bin.type = "button";
    bin.className = "panel-remove";
    iconPut(bin, Trash, grouped !== null ? "Remove the group" : "Remove the series");
    bin.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    bin.addEventListener("click", (): void => {
        if (!removeAsked) {
            removeAsked = true;
            iconPut(bin, QuestionMark, ask);
            return;
        }
        readerAsk<unknown>(address, { method: "DELETE" })
            .then(async (): Promise<void> => {
                if (await groupReturn(true)) return;
                entryBack = null;
                (document.getElementById("series") as HTMLDialogElement).close();
                done();
            })
            .catch((error: unknown): void => {
                console.error(error);
                formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
            });
    });
    return bin;
}

/**
 * Builds the rows of the form of a series anew from what it holds, see the top of this file:
 * what it is, its place, what it does online, its days and its first and last day;
 * of a numbered type of a module its group, see {@link groupRowOf}; its boxes;
 * then, where asked, its people, see {@link withAsked}, of a group always, its tutors;
 * below them the hint when the reader does not take it, then the plan it writes
 * into, see `fileShow` in `choices.ts`, of a group there its bin, see {@link seriesBinOf},
 * Cancel and Save; the dialog stays where it is scrolled to, read before the rows are built,
 * since building them takes the boxes shown out of the rows standing,
 * which would scroll a dialog scrolled to its end up.
 * Save takes no focus, so the extra being typed joins as it saves, not as the focus leaves it,
 * which would build the rows anew under the pointer and lose the click, see {@link formSave}.
 * - `dialog`: The dialog.
 * - `scrolled`: Where it is scrolled to.
 * - `form`: The form.
 * - `rows`: Its rows.
 * - `fields`: The rows together.
 * - `buttons`: The plan, the bin of a group there, Cancel and Save.
 * - `file`: The link of the plan.
 * - `cancel`, `save`: Cancel and Save.
 * - `hint`: The hint when the reader does not take it.
 * - `picking`: Whether only the rows on top of a new series show,
 *   its category or skill still to pick.
 * - `waits`: Whether my series waits for my group, see {@link groupWaits}:
 *   its rows then the same as with a group, in the same places,
 *   so pinning one never makes rows appear, but empty and locked, see {@link lockedOf}.
 * - `follows`: Whether my series follows a group, waiting for one or with one pinned,
 *   its rows of the group locked.
 */
function formFill(): void {
    if (typing === null) return;
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    const scrolled: number = dialog.scrollTop;
    const form: Form = typing;
    const picking: boolean =
        (fresh !== null &&
            (fresh.category === "" ||
                (fresh.category === skillName && fresh.picked.module === ""))) ||
        (plain === null && repeated === null && course === null);
    const waits: boolean = groupWaits(form);
    const follows: boolean =
        waits || (grouped === null && plain === null && (form.old?.group ?? "") !== "");
    if (waits) waitingFill(form);
    const rows: HTMLElement[] = picking
        ? []
        : plain !== null
          ? plainRowsOf(plain, form)
          : form.type === examType
            ? [seriesRowOf(form), semesterRowOf(courseSemesterOf()), boxesRowOf()]
            : [
                  seriesRowOf(form),
                  semesterRowOf(courseSemesterOf()),
                  ...lockedOf(follows, [
                      placeRowOf(form),
                      ...onlineRowsOf(form),
                      ...courseTimeRowsOf(form),
                      datesRowOf(form, formChanged),
                  ]),
                  boxesRowOf(),
                  ...lockedOf(
                      follows,
                      grouped !== null || withAsked() ? peopleRowsOf(form) : [],
                  ),
              ];
    const fields: HTMLElement = elementOf("div", "panel-form", "");
    if (grouped !== null)
        fields.append(elementOf("h2", "series-heading", "Series: Group"));
    fields.append(
        ...(fresh === null
            ? rows
            : [
                  ...freshRowsOf(),
                  ...(fresh.category === skillName ? rows.slice(1) : rows),
              ]),
    );
    const buttons: HTMLElement = elementOf("div", "panel-buttons", "");
    const cancel: HTMLButtonElement = document.createElement("button");
    const save: HTMLButtonElement = document.createElement("button");
    cancel.type = "button";
    iconPut(cancel, X, "Cancel");
    cancel.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    cancel.addEventListener("click", (): void => {
        groupReturn(false)
            .then((back: boolean): void => {
                if (!back)
                    (document.getElementById("series") as HTMLDialogElement).close();
            })
            .catch((error: unknown): void => console.error(error));
    });
    save.type = "submit";
    save.className = "panel-main";
    iconPut(save, Check, "Save");
    save.addEventListener("mousedown", (event: MouseEvent): void =>
        event.preventDefault(),
    );
    const hint: HTMLElement = elementOf("p", "panel-error", "Saving failed");
    hint.hidden = true;
    const file: HTMLAnchorElement = elementOf("a", "panel-file", "") as HTMLAnchorElement;
    fileShow(
        file,
        plain === null
            ? (repeated?.file ?? course?.file ?? "")
            : plainFileOf(plain, form),
    );
    buttons.append(file, ...(binShows(form) ? [seriesBinOf(form)] : []), cancel, save);
    formElementOf().replaceChildren(fields, hint, buttons);
    formElementOf().classList.toggle("series-exams", form.type === examType);
    dialog.scrollTop = scrolled;
    formChanged();
}

/**
 * Writes the place of the form everywhere while I changed it by its parts,
 * see {@link placeRowOf} and `renameSend` in `./places.ts`:
 * the place of its old name as I changed it, its row and every entry that names it;
 * before the series is saved only checked, so nothing is written while the reader would refuse it,
 * and after it written, so its boxes, saved with the place as it was,
 * take it with every other entry; nothing for a place I left as it is.
 *
 * @param form - The form
 * @param dry - Whether only to check it, before the series is saved
 * @throws {Error} - When the reader does not take the place, like one with an empty name
 */
async function placeRename(form: Form, dry: boolean): Promise<void> {
    if (
        form.location !== "" &&
        placeEdit !== null &&
        JSON.stringify(placeEdit) !== JSON.stringify(placeOriginOf(form))
    )
        await renameSend(labelOf(form.location), placeEdit, dry);
}

/**
 * Saves the form of a series, see {@link formSend}, the extra being typed joined first,
 * see {@link extraJoin}, so one click on Save takes it,
 * a place and the people renamed checked before and renamed after,
 * see {@link placeRename} and `personsRename` in `../persons.ts`,
 * and closes the dialog, with the dialog of the box it opened over,
 * see {@link done}, the day and the page of the module loading anew as their files change;
 * when the reader does not take it, the hint above the buttons says so and the dialog stays open.
 * A group saved, new or not, never becomes mine by itself,
 * since pinning is a choice of mine in the menu of the groups;
 * a group saved from my series goes back to it, see {@link groupReturn}.
 * - `exams`: Whether the form is that of the exams.
 * - `picked`: Who its boxes are with, so a person `Persons.md` does not hold yet gets its row there.
 */
async function formSave(): Promise<void> {
    if (typing === null) return;
    const exams: boolean = typing.type === examType;
    if (extraJoin(typing, exams ? typing.kinds : undefined)) formFill();
    if (!formReady(typing)) return;
    try {
        await placeRename(typing, true);
        const picked: string[] = typing.attendees.map(
            (person: Attendee): string => person.name,
        );
        await personsRename(personEdits, persons, true, picked);
        await formSend(typing, false);
        await placeRename(typing, false);
        await personsRename(personEdits, persons, false, picked);
    } catch (error: unknown) {
        console.error(error);
        formElementOf().querySelector(".panel-error")?.removeAttribute("hidden");
        return;
    }
    if (await groupReturn(true)) return;
    entryBack = null;
    (document.getElementById("series") as HTMLDialogElement).close();
    done();
}

/**
 * Goes back from the form of a group to my series it was opened from, see {@link groupBack}:
 * as I left it, unsaved, the course loaded anew once the group was saved or removed,
 * so the menu of its groups shows them as they are now.
 *
 * @param reload - Whether to load the course anew first
 * @returns Whether it went back; false for a form opened otherwise, which closes as usual
 * @throws {Error} - When the reader cannot answer
 */
async function groupReturn(reload: boolean): Promise<boolean> {
    if (groupBack === null || grouped === null) return false;
    if (reload && course !== null)
        course = await readerAsk<Course>(
            `/api/course/module?module=${encodeURIComponent(course.module)}` +
                `&semester=${course.semester}`,
        );
    typing = groupBack;
    groupBack = null;
    grouped = null;
    removeAsked = false;
    previewForget();
    underClose();
    formFill();
    return true;
}

/**
 * Starts the dialog once for the page:
 * its form saves by Save or Ctrl+Enter, Enter confirms only its field,
 * as in the dialog of an entry,
 * and closed by Cancel, Escape or a click beside it, it forgets the form,
 * but the form of a group opened from my series, which goes back to it instead,
 * see {@link groupReturn}; once the dialog of a box closes over it, opened from its list,
 * see {@link boxShow}, its list shows anew, see {@link seriesRefresh}.
 * - `dialog`: The dialog.
 * - `back`: Goes back from the form of a group to my series on Escape, while no list of it is open,
 *   or a click beside the dialog,
 *   the copy of my series below standing in the way of the browser's own Escape.
 */
function dialogStart(): void {
    if (dialogStarted) return;
    dialogStarted = true;
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    formElementOf().addEventListener("submit", (event: SubmitEvent): void => {
        event.preventDefault();
        formSave().catch((error: unknown): void => console.error(error));
    });
    formElementOf().addEventListener("keydown", (event: KeyboardEvent): void => {
        if (
            event.key !== "Enter" ||
            !(event.target instanceof HTMLInputElement) ||
            event.defaultPrevented
        )
            return;
        event.preventDefault();
        event.target.blur();
        if (event.ctrlKey)
            formSave().catch((error: unknown): void => console.error(error));
    });
    const entry: HTMLDialogElement = document.getElementById(
        "entry",
    ) as HTMLDialogElement;
    entry.addEventListener("close", (): void => {
        if (!entry.open) entry.removeAttribute("data-over");
        if (dialog.open && !entry.open)
            seriesRefresh().catch((error: unknown): void => console.error(error));
    });
    const back: (event: Event) => void = (event: Event): void => {
        if (
            groupBack === null ||
            !dialog.open ||
            (event instanceof KeyboardEvent &&
                (event.key !== "Escape" ||
                    document.querySelector(":popover-open") !== null))
        )
            return;
        event.preventDefault();
        groupReturn(false).catch((error: unknown): void => console.error(error));
    };
    dialog.addEventListener("cancel", back);
    document.addEventListener("keydown", back);
    dialog.addEventListener("close", (): void => {
        underClose();
        if (entryBack !== null)
            entryBackShow(entryBack).catch((error: unknown): void =>
                console.error(error),
            );
        entryBack = null;
        typing = null;
        plain = null;
        grouped = null;
        personEdits = {};
        previewForget();
    });
}

/**
 * Opens the dialog of a series, see the top of this file:
 * the series of a type of a module in a semester as its rule reads back, a type without series yet,
 * like the tutorials while only their groups are there, new with that type, or, without type,
 * a new series of the module, its type to pick, its days and dates empty, its list of types open;
 * over the dialog of a box, when that opens it, which stands as it was once this one closes.
 * - `loaded`: The course, the categories, for its groups, places, platforms and people,
 *   and the people of `Persons.md`.
 * - `rule`: The rule of the series as read back, `null` for a new one.
 * - `dialog`: The dialog.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`,
 *   or its code, like `IN2028`
 * @param type - Type of the series, like `VO`, empty for a new one
 * @param semester - Its semester, like `2026W`, empty for that of today
 * @param saved - Comes once the series is saved, like closing the dialog of the box it opened over,
 *   see `seriesFromBox` in `./categories.ts`; nothing when left out
 * @throws {Error} - When the reader cannot answer
 */
export async function seriesOpen(
    module: string,
    type: string,
    semester: string,
    saved: () => void = (): void => {},
): Promise<void> {
    dialogStart();
    fresh = null;
    repeated = null;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    const loaded: [Course, Category[], Person[]] = await Promise.all([
        readerAsk<Course>(
            `/api/course/module?module=${encodeURIComponent(module)}&semester=${semester}`,
        ),
        readerAsk<Category[]>(
            `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
        ),
        personsKept(),
    ]);
    [course, categories, persons] = loaded;
    const rule: Rule | null =
        course.series.find((series: Series): boolean => series.rule.type === type)
            ?.rule ?? (type === examType ? examRuleOf(course) : null);
    previewForget();
    listOpened = type === examType;
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
    typing = {
        type: rule?.type ?? type,
        old: rule,
        slots: rule?.slots.map((slot: Slot): Slot => ({ ...slot })) ?? [
            { weekday: 0, start: "", end: "" },
        ],
        before: rule?.slots.map((slot: Slot): number => slot.weekday) ?? [0],
        extras: rule?.extras.map((extra: Extra): Extra => ({ ...extra })) ?? [],
        location: rule?.location ?? "",
        locationLink: rule?.locationLink ?? "",
        online: rule?.online ?? "",
        onlineLink: rule?.onlineLink ?? "",
        onlineChannel: rule?.onlineChannel ?? "",
        onlineTitle: rule?.onlineTitle ?? "",
        attendees: rule?.attendees ?? [],
        first: rule?.first ?? "",
        last: rule?.last ?? "",
        times: { ...(rule?.times ?? {}) },
        states: {},
        kinds: {},
    };
    kindTyped = "";
    kindAsked = "";
    extraTyped = null;
    formFill();
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
    if (rule === null && type === "")
        formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}

/**
 * Opens a group of the tutorials of a module in the form of a series,
 * see the top of this file, from the menu of the groups, see `./groups.ts`:
 * the group as the reader reads it back, its group fixed, to change it or remove it,
 * see {@link groupStart}; over the dialog of a box, when that opens it,
 * which stands as it was once this one closes.
 * - `loaded`: The course, the categories, for its places, platforms and people,
 *   and the people of `Persons.md`.
 * - `dialog`: The dialog.
 *
 * @param module - Name of the folder of the module, like `IN2028_BusinessAnalyticsMachineLearning`
 * @param type - Type of the group, like `TU`
 * @param semester - Its semester, like `2026W`
 * @param group - The group, like `05`
 * @throws {Error} - When the reader cannot answer
 */
export async function groupOpen(
    module: string,
    type: string,
    semester: string,
    group: string,
): Promise<void> {
    dialogStart();
    fresh = null;
    groupBack = null;
    plain = null;
    done = (): void => {};
    const loaded: [Course, Category[], Person[]] = await Promise.all([
        readerAsk<Course>(
            `/api/course/module?module=${encodeURIComponent(module)}&semester=${semester}`,
        ),
        readerAsk<Category[]>(
            `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
        ),
        personsKept(),
    ]);
    [course, categories, persons] = loaded;
    groupStart(type, group);
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/**
 * Shows in the dialog my new series of a skill of a numbered type of a module picked in its rows
 * on top, see {@link seriesNew}, so making a series and changing one are one dialog:
 * the series of its type in its semester, the one there already as {@link seriesOpen} opens it,
 * else a new one of that type, its days, its place, what it does online and who I am with,
 * see {@link Repeated}, which saves as a box repeated, see {@link repeatedSend}.
 * - `loaded`: The course of its module, `null` for none, the categories, for its places,
 *   platforms and people, and the people of `Persons.md`.
 * - `dialog`: The dialog.
 *
 * @param from - What its boxes are, with their summary, their folder and their plan
 * @param days - Its days, one weekday, that of the day it starts on, its first day that day
 * @param saved - Comes once the series is saved
 * @throws {Error} - When the reader cannot answer
 */
async function seriesRepeat(
    from: Repeated,
    days: Days,
    saved: () => void,
): Promise<void> {
    const loaded: [Course | null, Category[], Person[]] = await Promise.all([
        readerAsk<Course>(
            `/api/course/module?module=${encodeURIComponent(from.box.module)}` +
                `&semester=${from.box.semester}`,
        ).catch((): null => null),
        readerAsk<Category[]>(
            `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
        ),
        personsKept(),
    ]);
    if (
        loaded[0]?.series.some(
            (series: Series): boolean => series.rule.type === from.box.type,
        ) === true
    ) {
        await seriesOpen(from.box.module, from.box.type, from.box.semester, saved);
        return;
    }
    dialogStart();
    [course, categories, persons] = loaded;
    repeated = from;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    previewForget();
    listOpened = false;
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
    typing = {
        ...days,
        type: from.box.type,
        old: null,
        location: from.box.location,
        locationLink: skillFieldOf("location")?.places[from.box.location]?.link ?? "",
        online: from.box.online ?? "",
        onlineLink: from.box.onlineLink ?? "",
        onlineChannel: from.box.onlineChannel ?? "",
        onlineTitle: from.box.onlineTitle ?? "",
        attendees: from.box.attendees ?? [],
        states: {},
        kinds: {},
    };
    formFill();
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/**
 * Tells whether the form of a plain series is typed enough to make boxes,
 * see {@link plainTimeRowsOf}:
 * with times its days, each a weekday, each once, with a start before its end;
 * without times its days, each a weekday, each once, each with a length of more than nothing;
 * and its first day on or before its last, or no last day.
 *
 * @param series - The plain series
 * @param form - The form, which holds its days
 * @returns Whether it is ready
 */
function plainReady(series: Plain, form: Form): boolean {
    const days: boolean = plainTimed
        ? form.slots.length > 0 &&
          form.slots.every(
              (slot: Slot): boolean => slot.weekday > 0 && timesReady(slot),
          ) &&
          new Set(form.slots.map((slot: Slot): number => slot.weekday)).size ===
              form.slots.length
        : form.slots.length > 0 &&
          form.slots.every((slot: Slot): boolean => slot.weekday > 0) &&
          new Set(form.slots.map((slot: Slot): number => slot.weekday)).size ===
              form.slots.length &&
          form.slots.every(
              (slot: Slot): boolean => (plainLengths.get(slot.weekday) ?? 0) > 0,
          );
    const named: boolean =
        series.category === skillName ? series.module !== "" : series.title.trim() !== "";
    return (
        named &&
        days &&
        form.first !== "" &&
        (form.last === "" || form.first <= form.last)
    );
}

/**
 * Gives the parts a plain series is written as, one per time,
 * since a rule has one time for all its weekdays, see `reader/rules.ts`:
 * the days of the form grouped by their times, or without times by their lengths,
 * like Gym on Monday at 18:00 and on Thursday at 07:00,
 * or my sleep of 8 hours from Sunday to Thursday and of 9 hours on Friday and Saturday, two parts.
 * A part of the series as it was keeps its `UID` where its time stays,
 * so its days of that time stay as they are;
 * a time new takes a part whose time went, the series being changed first,
 * so a series whose one time changes stays that series;
 * a part left over goes, see `plainGone` in `reader/rules.ts`.
 * The parts of a series of several times share its `X-SERIES`, the one it had,
 * else one made from the series or anew; a series of one time has none.
 * Its extras, its single dates, go with the part of the series being changed,
 * else with the first part.
 * - `texts`: What every part takes from the form.
 * - `was`: The parts of the series as it was, the series being changed first.
 * - `keyOf`: Gives a time, its start and end, or its length.
 * - `groups`: The weekdays of each time, in the order of the days,
 *   of a monthly series `Month` alone, which writes its day of the month, that of its first day,
 *   of a yearly one `Year` alone, which writes also its month, that of its first day.
 * - `owners`: The part of the series as it was that each time keeps, by its time.
 * - `free`: The parts of the series as it was whose time went.
 * - `key`: The `X-SERIES` of the parts.
 * - `earliest`: The first day of the series as it was, the earliest of its parts,
 *   which each part keeps as its own first day while the form keeps it.
 * - `kept`: The time whose part keeps the extras.
 * - `parts`: The parts to write.
 *
 * @param series - The plain series
 * @param form - The form, ready, see {@link plainReady}
 * @returns The parts to write, each a plain series of its own, and the `UID`s of the parts that go
 */
function plainPartsOf(series: Plain, form: Form): [Plain[], string[]] {
    const texts: Plain = {
        ...series,
        location: form.location,
        online: form.online,
        onlineLink: form.onlineLink,
        onlineChannel: form.onlineChannel,
        onlineTitle: form.onlineTitle,
        attendees: form.attendees,
        first: form.first,
        last: form.last,
        extras: [],
        parts: [],
    };
    const was: Plain[] =
        series.id === ""
            ? []
            : (series.parts.length > 0 ? series.parts : [series]).sort(
                  (first: Plain, second: Plain): number =>
                      Number(second.id === series.id) - Number(first.id === series.id),
              );
    const keyOf: (start: string, end: string, minutes: number | null) => string = (
        start: string,
        end: string,
        minutes: number | null,
    ): string => (plainTimed ? `${start}-${end}` : String(minutes));
    const groups: Map<string, number[]> = new Map();
    form.slots.forEach((slot: Slot): void => {
        const time: string = keyOf(
            slot.start,
            slot.end,
            plainLengths.get(slot.weekday) ?? null,
        );
        groups.set(time, [...(groups.get(time) ?? []), slot.weekday]);
    });
    const owners: Map<string, Plain> = new Map();
    was.filter(
        (part: Plain): boolean =>
            (part.start !== "") === plainTimed &&
            groups.has(keyOf(part.start, part.end, part.minutes)),
    ).forEach((part: Plain): void => {
        owners.set(keyOf(part.start, part.end, part.minutes), part);
    });
    const free: Plain[] = was.filter(
        (part: Plain): boolean => ![...owners.values()].includes(part),
    );
    [...groups.keys()]
        .filter((time: string): boolean => !owners.has(time))
        .forEach((time: string): void => {
            const part: Plain | undefined = free.shift();
            if (part !== undefined) owners.set(time, part);
        });
    const key: string =
        groups.size < 2
            ? ""
            : series.series ||
              series.id ||
              `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const earliest: string = was.map((part: Plain): string => part.first).sort()[0] ?? "";
    const kept: string =
        [...owners.entries()].find(
            ([, part]: [string, Plain]): boolean => part.id === series.id,
        )?.[0] ?? [...groups.keys()][0];
    const parts: Plain[] = [...groups.entries()].map(
        ([time, weekdays]: [string, number[]]): Plain => ({
            ...texts,
            id: owners.get(time)?.id ?? "",
            start: plainTimed ? time.split("-")[0] : "",
            first:
                owners.get(time) !== undefined && form.first === earliest
                    ? (owners.get(time)?.first ?? form.first)
                    : form.first,
            end: plainTimed ? time.split("-")[1] : "",
            minutes: plainTimed ? null : Number(time),
            weekdays:
                weekdays[0] >= monthly
                    ? []
                    : weekdays.sort(
                          (first: number, second: number): number => first - second,
                      ),
            monthDay: weekdays[0] >= monthly ? Number(form.first.slice(8)) : 0,
            month: weekdays[0] === yearly ? Number(form.first.slice(5, 7)) : 0,
            series: key,
            extras:
                time !== kept
                    ? []
                    : plainTimed
                      ? form.extras
                      : form.extras.map((extra: Extra): Extra => ({
                            day: extra.day,
                            start: "",
                            end: "",
                        })),
        }),
    );
    return [parts, free.map((part: Plain): string => part.id)];
}

/**
 * Sends a plain series to the reader, see `plainApply` in `reader/rules.ts`, each of its parts, see
 * {@link plainPartsOf}, one after another, each as the part it keeps, or new,
 * then each part that goes;
 * of a series that has begun, whose past never changes,
 * see `plainApply` in `reader/rules.ts`, every further one from today on at the earliest,
 * pointing back to the series being changed as its sibling;
 * a day of the chain each part names, see `chained` of {@link Planned}, once.
 * A day one part takes from another counts once, as what really happens to it:
 * a day the series being changed loses, `removed`, that a new part makes, `new`, is that new day,
 * `changed` for other times, else as it was.
 * - `planned`: The boxes of the parts sent so far.
 * - `parts`, `gone`: The parts to write and the `UID`s of those that go.
 * - `today`: Today.
 * - `begun`: Whether the series being changed has begun.
 * - `removed`: The days a part loses.
 * - `moved`: Tells whether a new day is one another part loses.
 *
 * @param series - The plain series
 * @param form - The form, ready, see {@link plainReady}
 * @param dry - Whether only to tell what it would make, for the preview
 * @returns The boxes it makes, the earliest first
 * @throws {Error} - When the reader does not take a part
 */
async function plainSend(series: Plain, form: Form, dry: boolean): Promise<Planned[]> {
    const planned: Planned[] = [];
    const today: string = dayOf(new Date());
    const begun: boolean = series.id !== "" && series.first < today;
    const [parts, gone]: [Plain[], string[]] = plainPartsOf(series, form);
    for (const part of parts)
        planned.push(
            ...(await courseSend<Planned[]>("/api/day/plain", {
                ...part,
                first: begun && part.id === "" && part.first < today ? today : part.first,
                dry: dry,
                sibling: begun && part.id === "" ? series.id : "",
            })),
        );
    for (const id of gone)
        planned.push(
            ...(await courseSend<Planned[]>("/api/day/plain", {
                id: id,
                gone: true,
                dry: dry,
            })),
        );
    const removed: Planned[] = planned.filter(
        (box: Planned): boolean => box.change === "removed",
    );
    const moved: (box: Planned) => Planned | undefined = (
        box: Planned,
    ): Planned | undefined =>
        box.change === "new"
            ? removed.find((gone: Planned): boolean => gone.day === box.day)
            : undefined;
    return planned
        .filter(
            (box: Planned, index: number): boolean =>
                box.chained !== true ||
                planned.findIndex((other: Planned): boolean => other.id === box.id) ===
                    index,
        )
        .filter(
            (box: Planned): boolean =>
                box.change !== "removed" ||
                !planned.some(
                    (other: Planned): boolean =>
                        other.change === "new" && other.day === box.day,
                ),
        )
        .map((box: Planned): Planned => {
            const gone: Planned | undefined = moved(box);
            return gone === undefined
                ? box
                : {
                      ...box,
                      state: gone.state,
                      change:
                          gone.time === box.time && gone.minutes === box.minutes
                              ? ""
                              : "changed",
                  };
        })
        .sort((first: Planned, second: Planned): number =>
            (first.time || first.day).localeCompare(second.time || second.day),
        );
}

/**
 * Makes the switch of a series of my course or of a group between times and a length,
 * as a plain series has it, see {@link plainSwapOf}:
 * by its length each day only how long it lasts, its `minutes`,
 * see {@link Slot}, its boxes days without time, as my sleep;
 * from times to a length each day takes the length of its times, else none yet,
 * from a length to times its times stay to type.
 *
 * @param form - The form, which holds its days
 * @returns The switch
 */
function courseSwapOf(form: Form): HTMLButtonElement {
    const timed: boolean = form.slots.every(
        (slot: Slot): boolean => slot.minutes === undefined,
    );
    return lengthSwapOf(timed, (): void => {
        form.slots = form.slots.map((slot: Slot): Slot =>
            timed
                ? {
                      weekday: slot.weekday,
                      start: "",
                      end: "",
                      minutes: timesReady(slot)
                          ? minutesOf(slot.end) - minutesOf(slot.start)
                          : 0,
                  }
                : { weekday: slot.weekday, start: "", end: "" },
        );
        formChanged();
        formFill();
    });
}

/**
 * Makes the row `Day` of a series of my course or of a group, as every series has it,
 * see {@link slotRowsOf}, with the switch beside the name `Day` between times of each day
 * and only how long each day lasts, see {@link courseSwapOf}:
 * then each day its length in place of its times, a day picked anew the length of the first.
 * - `lengthOf`: Makes the field of the length of a day.
 *
 * @param form - The form, which holds its days
 * @returns The row, alone, as the rows of the form are given
 */
function courseTimeRowsOf(form: Form): HTMLElement[] {
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement =>
        fieldOf(
            "time-field",
            (slot.minutes ?? 0) > 0 ? lengthTextOf(slot.minutes ?? 0) : "",
            `How long on ${weekdayNameOf(slot.weekday, false)}`,
            (time: string): void => {
                slot.minutes = time === "" ? 0 : minutesOf(time);
            },
            formChanged,
        );
    return slotRowsOf(
        form,
        formChanged,
        formFill,
        [courseSwapOf(form)],
        form.slots.every((slot: Slot): boolean => slot.minutes === undefined)
            ? null
            : lengthOf,
    );
}

/**
 * Makes the switch of a plain series between times and a length,
 * see {@link plainTimed} and `lengthSwapOf` in `./times.ts`:
 * either way it keeps its days, their weekdays;
 * from times to a length each day takes the length of its times,
 * see {@link plainLengths}, from a length to times their times stay to type,
 * see {@link plainTimeRowsOf}.
 *
 * @param form - The form, which holds its days
 * @returns The switch
 */
function plainSwapOf(form: Form): HTMLButtonElement {
    return lengthSwapOf(plainTimed, (): void => {
        if (plainTimed)
            plainLengths = new Map(
                form.slots.map((slot: Slot): [number, number | null] => [
                    slot.weekday,
                    timesReady(slot)
                        ? minutesOf(slot.end) - minutesOf(slot.start)
                        : (plainLengths.get(slot.weekday) ?? null),
                ]),
            );
        form.slots = form.slots.map((slot: Slot): Slot => ({
            weekday: slot.weekday,
            start: "",
            end: "",
        }));
        plainTimed = !plainTimed;
        formFill();
    });
}

/**
 * Makes the row `Day` of a plain series, as every series has it, `Month` after its weekdays,
 * see {@link slotRowsOf}, with the switch beside the name `Day` between times of each day
 * and only how long each day lasts, like `08:00` for my sleep, see {@link plainSwapOf}:
 * then each day its length in place of its times, a day picked anew the length of the first,
 * see {@link plainLengths}.
 * - `lengthOf`: Makes the field of the length of a day.
 * - `minutes`: The length of a day, that of the first day while it has none yet,
 *   else the first known, like that of `Month` for a weekday picked in its place.
 *
 * @param form - The form, which holds its days
 * @returns The row, alone, as the rows of the form are given
 */
function plainTimeRowsOf(form: Form): HTMLElement[] {
    const lengthOf: (slot: Slot) => HTMLElement = (slot: Slot): HTMLElement => {
        const minutes: number | null =
            plainLengths.get(slot.weekday) ??
            plainLengths.get(form.slots[0]?.weekday ?? 0) ??
            [...plainLengths.values()].find(
                (one: number | null): boolean => one !== null,
            ) ??
            null;
        plainLengths.set(slot.weekday, minutes);
        return fieldOf(
            "time-field",
            minutes === null ? "" : lengthTextOf(minutes),
            `How long on ${dayNameOf(slot.weekday)}`,
            (time: string): void => {
                plainLengths.set(slot.weekday, time === "" ? null : minutesOf(time));
            },
            formChanged,
        );
    };
    return slotRowsOf(
        form,
        formChanged,
        formFill,
        [plainSwapOf(form)],
        plainTimed ? null : lengthOf,
        true,
    );
}

/**
 * Makes the rows of the form of a plain series, see the top of this file: its summary,
 * see {@link plainSummaryOf}, its place, what it does online, its days and its time,
 * its first and last day, its boxes and who I am with;
 * no row of its category, which stays that of the box it opened from.
 *
 * @param series - The plain series
 * @param form - The form, which holds its place, what it does online, who I am with and its days
 * @returns The rows
 */
function plainRowsOf(series: Plain, form: Form): HTMLElement[] {
    return [
        rowOf("Summary", plainSummaryOf(series)),
        ...(series.category === skillName
            ? [semesterRowOf(series.semester || semesterOf(form.first))]
            : []),
        placeRowOf(form),
        ...onlineRowsOf(form),
        ...plainTimeRowsOf(form),
        datesRowOf(form, formChanged),
        boxesRowOf(),
        ...(withAsked() ? peopleRowsOf(form) : []),
    ];
}

/**
 * Makes the summary of a plain series, which every box of it takes, see the top of this file:
 * picked as the dialog of a box picks it,
 * see `fieldRowsOf` in `./categories.ts`, from the values of its category, the most used first,
 * a new one typed where its category takes new ones,
 * so not for `Sleep`, `Sport` or `Way`, several parted by `, ` where it takes several,
 * like `Caring, Augenheilkunde`, in the order of the list, a way in the order picked,
 * see `manyRowOf` there; of a skill its text to type,
 * since what a skill box is follows from its skill.
 * A summary picked has its pencil right after it, as in the dialog of a box,
 * which opens its list to change it, like `Night ✎`.
 * - `field`: The field `Summary` of its category, `undefined` for a skill, a category without one,
 *   and while the categories are not loaded.
 * - `title`: The field of the text of a skill.
 * - `rankOf`: Gives where a value stands in the list, the most used first, a new one after all.
 * - `pencil`: The pencil.
 * - `picker`: The picker.
 *
 * @param series - The plain series, which takes the summary picked
 * @returns The summary, its picker or its field
 */
function plainSummaryOf(series: Plain): HTMLElement {
    const field: Field | undefined =
        series.category === skillName
            ? undefined
            : categories
                  .find(
                      (category: Category): boolean => category.name === series.category,
                  )
                  ?.fields.find((one: Field): boolean => one.key === "title");
    if (field === undefined) {
        const title: HTMLInputElement = partFieldOf("text", series.title, "Summary");
        title.addEventListener("input", (): void => {
            series.title = title.value;
            formChanged();
        });
        return title;
    }
    const rankOf: (value: string) => number = (value: string): number =>
        field.values.includes(value) ? field.values.indexOf(value) : field.values.length;
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    pencil.hidden = series.title === "";
    iconPut(pencil, Pencil, "Change the summary");
    const picker: HTMLElement = choicesOf({
        search: searchOf(field.values.map(choiceOf)),
        picked:
            series.title === ""
                ? []
                : field.many === true
                  ? series.title.split(", ")
                  : [series.title],
        many: field.many === true,
        adding: !field.fixed,
        noun: "summary",
        order:
            field.many !== true || field.fixed
                ? undefined
                : (chosen: string[]): string[] =>
                      [...chosen].sort(
                          (first: string, second: string): number =>
                              rankOf(first) - rankOf(second),
                      ),
        aside: [pencil],
        pick: (values: string[]): void => {
            series.title = values.join(", ");
            pencil.hidden = series.title === "";
            formChanged();
        },
    });
    pencil.addEventListener("click", (event: MouseEvent): void => {
        event.stopPropagation();
        picker.querySelector<HTMLButtonElement>(".picker-line")?.click();
    });
    return picker;
}

/**
 * Opens the dialog for a plain series, over the dialog of a box when that opens it:
 * the categories, for its places, platforms and people,
 * and the people of `Persons.md` loaded, its form filled from the series,
 * with times while it has them, each weekday a day with them,
 * see {@link plainTimeRowsOf}, else with its length.
 * - `parts`: Its parts going on, see `plainRead` in `reader/rules.ts`,
 *   or itself alone, the earliest first day of them its first day.
 * - `loaded`: The categories and the people.
 * - `daysOf`: Gives the days of a part in the form, its weekdays, `Month` or `Year`,
 *   see {@link monthly} and {@link yearly}.
 * - `slots`: Its weekdays with their times, of all its parts.
 * - `dialog`: The dialog.
 *
 * @param series - The plain series, new or as the reader sends it
 * @param saved - Comes once the series is saved, like closing the dialog of the box
 * @throws {Error} - When the reader cannot answer
 */
async function plainStart(series: Plain, saved: () => void): Promise<void> {
    const parts: Plain[] = series.parts.length > 0 ? series.parts : [series];
    const daysOf: (part: Plain) => number[] = (part: Plain): number[] =>
        part.month > 0 ? [yearly] : part.monthDay > 0 ? [monthly] : part.weekdays;
    const loaded: [Category[], Person[]] = await Promise.all([
        readerAsk<Category[]>(
            `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
        ),
        personsKept(),
    ]);
    dialogStart();
    [categories, persons] = loaded;
    course = null;
    repeated = null;
    plain = series;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    plainTimed = series.start !== "";
    plainLengths = new Map(
        parts.flatMap((part: Plain): [number, number | null][] =>
            daysOf(part).map((weekday: number): [number, number | null] => [
                weekday,
                part.minutes,
            ]),
        ),
    );
    done = saved;
    previewForget();
    listOpened = false;
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
    const slots: Slot[] = parts
        .flatMap((part: Plain): Slot[] =>
            daysOf(part).map((weekday: number): Slot => ({
                weekday: weekday,
                start: part.start,
                end: part.end,
            })),
        )
        .sort((first: Slot, second: Slot): number => first.weekday - second.weekday);
    typing = {
        type: "",
        old: null,
        slots: slots,
        before: slots.map((): number => 0),
        extras: parts
            .flatMap((part: Plain): Extra[] =>
                part.extras.map((extra: Extra): Extra => ({ ...extra })),
            )
            .sort((first: Extra, second: Extra): number =>
                first.day.localeCompare(second.day),
            ),
        location: series.location,
        locationLink: skillFieldOf("location")?.places[series.location]?.link ?? "",
        online: series.online,
        onlineLink: series.onlineLink,
        onlineChannel: series.onlineChannel,
        onlineTitle: series.onlineTitle,
        attendees: series.attendees,
        first: parts.map((part: Plain): string => part.first).sort()[0],
        last: series.last,
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
}

/**
 * Opens the dialog of a plain series by its `UID`,
 * from the series icon ⟳ after the times of one of its boxes,
 * see `seriesShow` in `./categories.ts`, as the reader reads it back,
 * see `plainRead` in `reader/rules.ts`.
 *
 * @param id - Its `UID`, like `037dba76-43d3-4e42-b85d-8e39c5ab8478@nomsystem`
 * @param saved - Comes once the series is saved, like closing the dialog of the box
 * @throws {Error} - When the reader cannot answer
 */
export async function plainOpen(id: string, saved: () => void): Promise<void> {
    fresh = null;
    await plainStart(
        await readerAsk<Plain>(`/api/day/plain?id=${encodeURIComponent(id)}`),
        saved,
    );
}

/**
 * Opens the dialog of my own learning of a module as a series,
 * from the pencil of the card `Learning` on the page of the module, see `../editor/course.ts`:
 * the plain series its planned boxes belong to while they belong to one,
 * else a new one of the skill without type in the semester,
 * its first day today, see {@link plainStart}.
 * - `today`: Today's day.
 *
 * @param module - Code of the module, like `IN2028`
 * @param semester - Its semester, like `2026W`
 * @param id - The `UID` of the series of its boxes, empty for none
 * @throws {Error} - When the reader cannot answer
 */
export async function learningOpen(
    module: string,
    semester: string,
    id: string,
): Promise<void> {
    fresh = null;
    if (id !== "") {
        await plainOpen(id, (): void => {});
        return;
    }
    const today: string = dayOf(new Date());
    await plainStart(
        {
            id: "",
            category: skillName,
            title: "",
            module: module,
            type: "",
            semester: semester,
            location: standardLineOf(),
            online: "",
            onlineLink: "",
            onlineChannel: "",
            onlineTitle: "",
            attendees: [],
            weekdays: [weekdayOf(today)],
            monthDay: 0,
            month: 0,
            start: "",
            end: "",
            minutes: null,
            first: today,
            last: "",
            extras: [],
            file: "",
            series: "",
            parts: [],
        },
        (): void => {},
    );
}

/**
 * Makes the rows on top of the dialog of a new series, see {@link seriesNew}:
 * its category, picked from those of the plan, its list open as the dialog opens,
 * and of a skill its skill and type side by side,
 * see `skillPairOf` in `./skill.ts`, in place of the summary its form shows below them;
 * a pick shows the form it makes, see {@link freshFollow}.
 * - `category`: The row of the category.
 * - `holder`: Where skill and type show once their lists are loaded.
 *
 * @returns The rows
 */
function freshRowsOf(): HTMLElement[] {
    if (fresh === null) return [];
    const category: HTMLElement = rowOf(
        "Category",
        choicesOf({
            search: searchOf(
                categories.map((one: Category): Choice => choiceOf(one.name)),
            ),
            picked: fresh.category === "" ? [] : [fresh.category],
            many: false,
            adding: false,
            noun: "category",
            pick: (values: string[]): void => {
                if (fresh === null) return;
                fresh = {
                    ...fresh,
                    category: values[0] ?? "",
                    picked: { module: "", type: "" },
                };
                freshFollow().catch((error: unknown): void => console.error(error));
            },
        }),
    );
    if (fresh.category !== skillName) return [category];
    const holder: HTMLElement = elementOf("div", "", "");
    skillPairOf(fresh.picked, (picked: ModuleType): void => {
        if (fresh === null) return;
        fresh = { ...fresh, picked: picked };
        freshFollow().catch((error: unknown): void => console.error(error));
    })
        .then((pair: HTMLElement): void => holder.replaceChildren(pair))
        .catch((error: unknown): void => console.error(error));
    return [category, rowOf("Summary", holder)];
}

/**
 * Gives the semester of the form of a series of my course:
 * that of its course, else of the box it repeats,
 * else the one picked for a new series, see {@link fresh}.
 *
 * @returns Semester like `2026W`, empty for none
 */
function courseSemesterOf(): string {
    return course?.semester ?? repeated?.box.semester ?? fresh?.semester ?? "";
}

/**
 * Makes the row `Semester` of a skill series,
 * as the dialog of an entry has it right after its summary:
 * the semester of the form, picked from those of its skill, never typed,
 * see `semestersOf` in `./skill.ts`;
 * picking another shows the form of that semester, see {@link semesterSwitch},
 * since a series of my course is one of a module, a type and a semester,
 * like `IN2028` `VO` `2026W`.
 * Of a numbered type of a module the group stands beside it,
 * as the type beside the skill in the summary: of my series the menu of its groups with the plus,
 * see {@link groupPickOf}, of a group its name, see {@link groupPartOf}.
 * - `picker`: The picker of the semester.
 * - `form`: The form.
 * - `module`: The skill, like `IN2028`, of a course by the code of its folder.
 * - `day`: The day whose semester comes first in the list, the first day of the form, else today.
 * - `pair`: The semester with the group beside it, as close as the skill and its type,
 *   see `.series-semester` in `series.css`.
 *
 * @param semester - The semester of the form, like `2026W`
 * @returns The row
 */
function semesterRowOf(semester: string): HTMLElement {
    const module: string =
        plain?.module ??
        repeated?.box.module ??
        (course === null ? (fresh?.picked.module ?? "") : course.module.split("_")[0]);
    const day: string = typing?.first || dayOf(new Date());
    const picker: HTMLElement = choicesOf({
        search: async (text: string): Promise<Choice[]> =>
            searchOf(await semestersOf(module, day, semester))(text),
        picked: semester === "" ? [] : [semester],
        many: false,
        adding: false,
        noun: "semester",
        pick: (values: string[]): void => {
            if ((values[0] ?? semester) !== semester)
                semesterSwitch(values[0]).catch((error: unknown): void =>
                    console.error(error),
                );
        },
    });
    const form: Form | null = typing;
    if (
        plain !== null ||
        course === null ||
        form === null ||
        !numberedTypes.includes(form.type)
    )
        return rowOf("Semester", picker);
    const pair: HTMLDivElement = pairOf(
        picker,
        grouped === null ? groupPickOf(form) : groupPartOf(),
    );
    pair.classList.add("series-semester");
    return rowOf("Semester", pair);
}

/**
 * Shows the form in another semester, as its row `Semester` picks it, see {@link semesterRowOf}:
 * a plain series takes it as its `X-SEMESTER`;
 * a new series from nothing follows its rows on top with it, see {@link freshFollow};
 * a group opens that group of the type in that semester, a new one there while it has none,
 * see {@link groupOpen}; my series of a type that of that semester,
 * a new one while it has none, see {@link seriesOpen}.
 * - `module`: The folder of the module, or its code.
 * - `type`: The type of the form, like `VO`.
 *
 * @param semester - The semester picked, like `2026S`
 * @throws {Error} - When the reader cannot answer
 */
async function semesterSwitch(semester: string): Promise<void> {
    if (plain !== null) {
        plain.semester = semester;
        formFill();
        return;
    }
    if (fresh !== null && grouped === null) {
        fresh = { ...fresh, semester: semester };
        await freshFollow();
        return;
    }
    const module: string = course?.module ?? repeated?.box.module ?? "";
    const type: string = typing?.type ?? "";
    if (grouped !== null) await groupOpen(module, type, semester, grouped.group);
    else await seriesOpen(module, type, semester, done);
}

/**
 * Shows the form the rows on top of the dialog of a new series picked, see {@link freshRowsOf}:
 * while no category is picked, or of a skill no skill, those rows alone;
 * of the exams of a module the exams of its module, see {@link seriesOpen};
 * of a skill of a numbered type my series of that type, see {@link seriesRepeat};
 * of any other a new plain series, its summary still to pick,
 * its weekday that of the day it starts on, see {@link plainStart};
 * the rows on top stay above every new one.
 * - `day`: The day it starts on.
 * - `picked`: Skill and type picked.
 * - `names`: What they give, its title, its folder and its plan,
 *   see `skillNamesOf` in `./skill.ts`.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function freshFollow(): Promise<void> {
    if (fresh === null) return;
    const day: string = fresh.day;
    const picked: ModuleType = fresh.picked;
    const skill: boolean = fresh.category === skillName;
    if (fresh.category === "" || (skill && picked.module === "")) {
        plain = null;
        repeated = null;
        course = null;
        formFill();
        return;
    }
    if (skill && picked.type === examType) {
        await seriesOpen(picked.module, examType, fresh.semester, done);
        return;
    }
    if (skill && numberedTypes.includes(picked.type)) {
        const names: { title: string; link: string; file: string } = skillNamesOf(picked);
        const kept: {
            day: string;
            category: string;
            picked: ModuleType;
            semester: string;
        } = fresh;
        await seriesRepeat(
            {
                box: {
                    category: skillName,
                    title: "",
                    location: standardLineOf(),
                    from: "",
                    module: picked.module,
                    type: picked.type,
                    semester: fresh.semester,
                    note: "",
                    day: day,
                    time: null,
                    minutes: null,
                    deadline: "",
                    chapters: [],
                    documents: [],
                    attendees: [],
                },
                summary: names.title,
                link: names.link,
                file: names.file,
            },
            {
                slots: [{ weekday: weekdayOf(day), start: "", end: "" }],
                before: [0],
                extras: [],
                first: day,
                last: "",
                times: {},
            },
            done,
        );
        if (
            course !== null &&
            course.series.some(
                (series: Series): boolean => series.rule.type === picked.type,
            )
        )
            return;
        fresh = kept;
        formFill();
        return;
    }
    await plainStart(
        {
            id: "",
            category: fresh.category,
            title: "",
            module: skill ? picked.module : "",
            type: skill ? picked.type : "",
            semester: skill ? fresh.semester : "",
            location: standardLineOf(),
            online: "",
            onlineLink: "",
            onlineChannel: "",
            onlineTitle: "",
            attendees: [],
            weekdays: [weekdayOf(day)],
            monthDay: 0,
            month: 0,
            start: "",
            end: "",
            minutes: null,
            first: day,
            last: "",
            extras: [],
            file: "",
            series: "",
            parts: [],
        },
        done,
    );
}

/**
 * Opens the dialog of a new series from nothing, by `⟳` beside `+` of the plan,
 * see `boxesStart` in `./boxes.ts`:
 * on top its category to pick, its list open, and of a skill its skill and type,
 * see {@link freshRowsOf}; once picked, the form of what it makes below them,
 * see {@link freshFollow}, its first day the day shown.
 * Saving makes a plain series, my series of a type of a module,
 * or with `Group` typed a group of its tutorials, see {@link formSave}.
 * - `loaded`: The categories, for the list, places, platforms and people,
 *   and the people of `Persons.md`.
 * - `dialog`: The dialog.
 *
 * @param day - The day shown, like `2026-10-24`, its first day
 * @param saved - Comes once the series is saved
 * @throws {Error} - When the reader cannot answer
 */
export async function seriesNew(day: string, saved: () => void): Promise<void> {
    const loaded: [Category[], Person[]] = await Promise.all([
        readerAsk<Category[]>(
            `/api/day/categories?now=${encodeURIComponent(new Date().toISOString())}`,
        ),
        personsKept(),
    ]);
    dialogStart();
    [categories, persons] = loaded;
    fresh = {
        day: day,
        category: "",
        picked: { module: "", type: "" },
        semester: semesterOf(day),
    };
    course = null;
    repeated = null;
    plain = null;
    grouped = null;
    groupBack = null;
    removeAsked = false;
    done = saved;
    previewForget();
    listOpened = false;
    placeEdit = null;
    placeOpen = false;
    onlineOpen = false;
    withOpen = [];
    slotsFreed = [];
    typing = {
        type: "",
        old: null,
        slots: [{ weekday: weekdayOf(day), start: "", end: "" }],
        before: [0],
        extras: [],
        location: standardLineOf(),
        locationLink: skillFieldOf("location")?.places[standardLineOf()]?.link ?? "",
        online: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        attendees: [],
        first: day,
        last: "",
        times: {},
        states: {},
        kinds: {},
    };
    formFill();
    const dialog: HTMLDialogElement = document.getElementById(
        "series",
    ) as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
    formElementOf().querySelector<HTMLButtonElement>(".picker-line")?.click();
}
