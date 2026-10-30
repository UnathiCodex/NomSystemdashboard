/**
 * ## Categories
 *
 * Writes plan and log the same way, by category, in one dialog without a title,
 * all its room for the fields, one column of rows in the order of the file,
 * each its name grey at the left, all names equally wide, and its value at the right,
 * like `Category  Skill`, see `choices.ts`: the category at the top, then what it is,
 * where it is, its times, then its other fields one after another, the note always at the bottom,
 * a click on a row opening its one list right under it, then `Save`;
 * an empty field stays empty, without dash or placeholder, but a time, which says grey `hh:mm`,
 * see `timeFieldStart` in `times.ts`. Esc closes an open list, else
 * the dialog, and a click beside the dialog closes it without saving.
 * Enter in a field confirms only that field,
 * and the entry saves only by its check or Ctrl+Enter or Ctrl+S, see {@link enterTake}.
 * A new entry opens with the list of the categories open.
 * A changed entry of the log saves only while its file still holds it as the dialog opened it,
 * the first save winning, else the dialog says so above its buttons, see {@link entrySave}.
 * Every category has its `Summary`, the `SUMMARY` of its file, its `Place`,
 * a way also `From` before its place, and below the times `With`,
 * who I was with, see {@link withRowOf};
 * the summary of `Sleep` first `Night` or `Day`, a nap, that of `Way` my means of transport;
 * a value with steps shows them below its line while it is picked, with the note of its last entry;
 * `Body` is my body care, one or several, like `Shower` or `Caring, Shower`;
 * in the log, `Food` has its summary written by itself from its meals and its foods,
 * each in a row of its own with its own list, my meals of `Meals.md` and my foods,
 * like `Käsesalat, Brot`, see `meal.ts`;
 * and `Cook` below them one tap for the meal eaten right after it,
 * which the reader adds with the cooking, pointing to it.
 * `Sport` in the log has below its place its workout, its exercises and its videos, see `sport.ts`,
 * and no note, since what I did stands in its rows.
 * `Skill` is a skill and a type or none side by side,
 * like `IN2028` and `VO` or the project `WokFlow`, in plan and log,
 * linked by the reader as the folder of its skill and its material,
 * its summary the folder of its skill with the type in brackets, which names both,
 * like `IN2028_BusinessAnalyticsMachineLearning (VO)`, its place and its semester; in the log also
 * its chapters, documents and attempts at tasks,
 * each with its result and my effort, see `skill.ts`.
 * Every entry can carry a free note, typed like start and end.
 * The categories come in the order the reader gives them, by their importance for my life,
 * without `Drink`, since water has its own tracker;
 * a box of the plan offers them all, like `Sleep`.
 * Each list comes from the log, the most used first, searched as I type, see `choices.ts`;
 * the typed text can be added as a new value with `+ New summary` at the end of the list,
 * which is then picked, the way to write a new summary or another one in place of the one picked,
 * but to the summary of `Sport` and `Way`, whose lists take no new ones.
 * A summary is plain text, and every summary has a pencil `✎` beside it, as a place has,
 * which always changes it, in plan and log alike, see {@link summaryChange}:
 * it shows below it its text, which I change in place, like `Wolrd News` to `World News`,
 * see {@link summaryPartsOf}, also that of `Sport` and `Way`,
 * which the reader still takes only as one of their values, and one as planned;
 * the new text changes only this box or entry, also a box of a series of the plan,
 * like my sleep every night,
 * whose whole series changes only in the dialog of the series,
 * by the series icon ⟳ after its times, see {@link seriesShow}.
 * The pencil of a skill entry shows only its link, its title always the one skill and type give it,
 * see {@link categoryPick};
 * its skill and type a click on them picks, see `skill.ts`; that of a meal
 * of the log, which its foods write, the list of its foods.
 * Every summary has its link below its text, typed, a web address or a path from `NomWorkspace`,
 * shown small and grey below it, opening on a click only while it is valid;
 * that of `Skill` by default the folder of its skill,
 * for a type on into the folder of its material, which the reader writes, see `skill.ts`.
 * Places, the place of an entry and where a way starts, are only my places of `Places.md`,
 * the most used first, each by its name,
 * like `TUM Innenstadt`, its address grey beside it in the list;
 * a picked one is written with its address, as one line,
 * like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`;
 * its row shows its name with a pencil `✎` right after it, while a place is picked,
 * and its address small and grey below it, which opens the link of the place, its `ALTREP`,
 * when it has one; the pencil shows its parts below it, see {@link partsOf}, each one row,
 * as the foods of a meal stand:
 * its label, street, code, city, country and link, the columns of `Places.md`,
 * which I change in place as the text of a summary,
 * and which change the place everywhere once the dialog saves,
 * its row and every entry that names it, see {@link placesRename};
 * a new place goes into `Places.md` by its typed name when picked,
 * its parts showing below it at once, so I type them next, see {@link placeAdd}.
 * A place is only where I physically am;
 * below it every category has `Online`, what I did online: its platform of `Online.md`,
 * like `Zoom`, and below it the channel, the title and the link of its own meeting or video,
 * typed per entry, see {@link onlineRowOf}.
 * A new entry, also one logged from a box, starts where I was last,
 * the place of the last entry before it, a way's goal, or a place I changed by hand,
 * like `TUM Garching` after a way to `Mensa Garching`, as if a way had gone there,
 * never a room, so after a lecture I am where I was before it,
 * else at my default place, the place I starred, like `Home Munich`, and a new box always there:
 * a way its `From`, every other category its place, with its link, as picked from the list,
 * see {@link lastPlaceFill}; a way's place, its goal, stays empty.
 * Plan and log use one and the same dialog with the same fields and lists, see `skill.ts`:
 * an entry of the log and a box of the plan alike have a start and an end,
 * each a day like `13.10.2026` and a plain time, as calendar apps write them:
 * the day of the start, its calendar date, typed to move it to any other day,
 * and the day of the end, which fills itself with the day of the start,
 * or the day after while the end time lies at or before the start time, until I type over it,
 * see {@link endDayFill}; all saved exactly as they show.
 * The times of a box may stay empty, a box of its day, but for a lecture imported from TUMonline,
 * which keeps both, see `reader/boxes.ts`;
 * its start is its expected time, the minutes to its end its expected duration.
 * Only a to-do of the plan has one more field, its deadline,
 * a day like `23.10.2026` with a time or without;
 * a box with a deadline lies on the day of its deadline and has no expected time,
 * so start and end are off while the day of a deadline is typed.
 * `+` always makes one box;
 * a new series comes only from `⟳` beside it, see `seriesNew` in `series.ts`.
 * A box that belongs to a series has the series icon ⟳ after its times, see {@link seriesShow},
 * which opens that series in the dialog of a series:
 * a box of a series of my course that series,
 * see {@link seriesFromBox}, a box of a plain series, one to-do that repeats by its rule,
 * see `reader/rules.ts`, that series whole, see `plainOpen` in `series.ts`; a box alone has none.
 * A box of a series of my course shows after its times its group
 * while it has one, like `14:00 – 16:00    05`,
 * where it may still go to another group the menu of the groups for this one date,
 * the only place to pick the group of one week, like `05 ⌄`, and the pencil,
 * which opens its series. The dialog of a series opens over this one,
 * which stands as it was once it closes, one level back, and closes with it once it saves,
 * see {@link seriesFromBox}.
 * The dialog opens for the log from `+` below the time grid,
 * from a range selected in the time grid, and from a log entry that can be changed, to change it;
 * for a box from `+` below the list of boxes, and from a box that can be changed, to change it,
 * or to log it instead, filled in as planned;
 * one that cannot, like an occurrence of a weekly lecture, opens it to be logged.
 * A log entry logged from a box points to it, also to an occurrence of a series, see `entries.ts`;
 * a box logged at its real time by dragging it into the log,
 * or as expected by a tap, needs no dialog, see `boxes.ts`.
 * The dialog of an entry or a box being changed duplicates it with the copy at the left
 * of its buttons, see {@link entryDuplicate}.
 *
 * - `./choices.ts`: Pickers, each one line in a row with its name, its list on top,
 *   a value picked in a row of its own, and the parts of a field.
 * - `./entries.ts`: Sends new, changed and removed entries to the reader, names who I was with,
 *   and gives the standard address of a name.
 * - `./series.ts`: Tells a box of a series of my course,
 *   and opens the dialog of the series of a box.
 * - `./meal.ts`: A meal of the log:
 *   its summary and its meals and foods, picked from one search, and its new meals.
 * - `./sport.ts`: A session of sport of the log: its workout, its exercises and its videos.
 * - `./places.ts`: The parts of a place,
 *   which add a new one with its address to `Places.md` or change mine,
 *   and the choice of a place in a list.
 * - `./skill.ts`: The fields of `Skill`: skill and type, place, semester, chapters, documents,
 *   and in the log attempts; the folder its summary links, and the title skill and type give it.
 * - `./times.ts`: Turns dates into the values of time fields and back,
 *   writes and reads days like `13.10.2026`, and gives the times a box is logged at.
 * - `../persons.ts`: The people of `Persons.md`, which `With` offers, each a link to its row there.
 * - `../skill/attempts.ts`: Names the category of skill entries.
 * - `../icons.ts`: Shows the icons of the copy, the bin and its question,
 *   Cancel and Save in their buttons, the pencil of a place, of a summary and of a series;
 *   makes the plain question mark of the bin.
 * - `../reader.ts`: Asks the reader.
 * - `../changes.ts`: Keeps the categories, loaded once and anew after every change of a file.
 * - `lucide`: The icons of the copy, the bin, Cancel, Save and the pencil.
 * - `fullcalendar`: Calendar that shows the entries.
 */

import {
    choiceOf,
    choicesOf,
    fileShow,
    listsStart,
    partFieldOf,
    partOf,
    rowOf,
    searchOf,
} from "./choices.ts";
import {
    boxAdd,
    boxChange,
    boxDelete,
    entryAdd,
    entryChange,
    entryDelete,
    standardAddressOf,
} from "./entries.ts";
import { cookName, foodName, mealCooked, mealFoods, mealOf, mealTitle } from "./meal.ts";
import { sportName, sportOpen, sportRead, sportRowsOf } from "./sport.ts";
import {
    addressOf,
    labelOf,
    lineOf,
    placeAddressOf,
    placeChoiceOf,
    placeEditOf,
    placeOf,
    placeSend,
    platformSend,
    renameSend,
    standardFirst,
} from "./places.ts";
import {
    skillDaySet,
    skillFieldsShow,
    skillFolderNameOf,
    skillLinksRead,
    skillModuleType,
    skillPathOf,
    skillPathShow,
    skillSave,
    skillSemesterOf,
    skillTitleOf,
} from "./skill.ts";
import { plainOpen, seriesHas, seriesOpen } from "./series.ts";
import { boxGroupOf, pickable } from "./groups.ts";
import {
    dateOf,
    dateParse,
    lengthSwapOf,
    lengthTextOf,
    minutesOf,
    timeFieldRead,
    timeFieldShow,
    timeOf,
    weekdayDateTextOf,
} from "./times.ts";
import {
    personEditOf,
    personOf,
    personRowAddressOf,
    personsKept,
    personsRename,
} from "../persons.ts";
import { dayOf, semesterOf, skillName } from "../skill/attempts.ts";
import { folderLinkShow } from "../skill/links.ts";
import { iconPut, QuestionMark } from "../icons.ts";
import { readerAsk } from "../reader.ts";
import { changesKept } from "../changes.ts";
import { Check, Copy, Pencil, Repeat, Trash, X } from "lucide";

import type { Calendar, EventApi } from "fullcalendar";
import type { Box } from "./boxes.ts";
import type { Choice, ChoicesSetup } from "./choices.ts";
import type { Place, Platform } from "./places.ts";
import type { Attendee, BoxFields, EntryFields, Online } from "./entries.ts";
import type { ModuleType, SkillLinks, SkillValues } from "./skill.ts";
import type { Person, PersonEdit } from "../persons.ts";
import type { Course } from "./series.ts";

/**
 * Field of an entry a field of a category writes into:
 * `title`, `from`, `location`, `online`, its platform online, or `with`, its people.
 */
export type FieldKey = "title" | "from" | "location" | "online" | "with";

/**
 * Fields of a place, where an entry is and where a way starts, which share one list of places.
 */
const placeKeys: FieldKey[] = ["from", "location"];

/**
 * What parts the names of `With` in the values of the dialog, `; `,
 * since a person of `Persons.md` holds a comma in its name, like `Bichler, Martin; Willi`;
 * its line shows them apart by a middle dot, see {@link withRowOf}.
 */
const withParting: string = "; ";

/**
 * Folders and topics of the files of plan and log, by category,
 * as `topics` in `reader/sources.ts` names them:
 * my sleep in `Health/`, my food with my cooking in `Living/`, each in files of its own,
 * any other category in those of the topic `Living` in `Living/`, see {@link entryFileOf}.
 */
const topics: { [category: string]: string } = {
    Sleep: "Health/Sleep",
    Food: "Living/Food",
    Cook: "Living/Food",
};

/**
 * A field of a category, as the reader gives it.
 *
 * - `name`: Name shown, like `Summary`.
 * - `key`: Field of the entry it writes into.
 * - `values`: Values to pick, the most used first.
 * - `steps`: Steps of a value offered in the code, by the value,
 *   like the exercises of `Neck short`.
 * - `fixed`: Whether it takes only its values, like `Night` and `Day` of `Sleep`, and no new ones.
 * - `many`: Whether it takes several of its values, parted by `, `,
 *   like the means of a way, `U-Bahn, Bus`, or my body care, `Caring, Shower`,
 *   see {@link manyRowOf}, or the people of `With`, parted by `; `, `Bichler, Martin; Willi`,
 *   see {@link withRowOf}; one when left out.
 * - `rooms`: For a field of a place, the rooms of the university in `Rooms.md`,
 *   each as the line an entry writes, which its list offers only as I search,
 *   see {@link placeSearchOf}; none for any other field.
 * - `places`: For a field of a place, each of my places and rooms as its row holds it,
 *   its address in its parts and its link, like `https://nav.tum.de/room/0509.EG.980`, by its line;
 *   none for any other field.
 * - `links`: For `With` the address of each name its last entry wrote, like `sophale@invalid`;
 *   none for any other field.
 * - `platforms`: For `Online` each of my platforms as its row of `Online.md` holds it,
 *   its provider and the link of its web app, by its name; none for any other field.
 */
export type Field = {
    name: string;
    key: FieldKey;
    values: string[];
    steps: { [value: string]: string[] };
    fixed: boolean;
    many?: boolean;
    rooms: string[];
    places: { [line: string]: Place };
    links: { [value: string]: string };
    platforms: { [name: string]: Platform };
};

/**
 * A category, as the reader gives it;
 * without a field `title` its name would be the title,
 * as in an old `Sleep` written before it had its what.
 *
 * - `name`: Name of the category, like `Way`.
 * - `fields`: Its fields, in the order they are picked.
 */
export type Category = {
    name: string;
    fields: Field[];
};

/**
 * What the dialog writes: an entry of the log, or a box of the plan.
 */
type EntryTarget = "log" | "box";

/**
 * What the dialog shows when it opens.
 *
 * - `target`: What the dialog writes, an entry of the log or a box of the plan.
 * - `start`: Start of an entry of the log; for a box any time on its day.
 *   Its day is the day of the times of the dialog.
 * - `end`: End of an entry of the log; for a box the same as `start`.
 * - `time`: Expected time of a box, `null` for none and for an entry of the log.
 * - `minutes`: Expected duration of a box in minutes, `null` for none and for an entry of the log.
 * - `category`: Category picked already, else `null`.
 * - `values`: Values picked already, by the field they write into;
 *   for `with` the names, parted by `; `, see {@link withParting},
 *   like `Bichler, Martin; Willi`, for `online` the platform, like `Zoom`.
 * - `addresses`: Address of each name of `With` as the entry, the box or the box to log has it,
 *   or the one it is a copy of, like `sophale@invalid`; none for nobody.
 * - `titleLink`: Link of what it was, the `ALTREP` of its `SUMMARY`,
 *   as the entry, the box or the box to log has it,
 *   or the one it is a copy of, for a skill entry the folder of its skill or of its material,
 *   or a web address an older entry kept; empty for none.
 * - `locationLink`: Link of its place, its `ALTREP`,
 *   as the entry, the box or the box to log has it, or the one it is a copy of; empty for none.
 * - `onlineLink`, `onlineChannel`, `onlineTitle`:
 *   The link, the channel and the title of its meeting or video online,
 *   as the entry, the box or the box to log has them, or the one it is a copy of,
 *   see `Online` in `entries.ts`; empty for none.
 * - `note`: Note of the entry.
 * - `foods`: Foods of the meal the dialog changes, its lines `X-FOOD`; none for any other entry.
 * - `skill`: Skill, type, chapters,
 *   links and attempts of the skill entry the dialog changes or logs from a box;
 *   empty for any other entry.
 * - `plan`: Box a new entry of the log is logged from, else `null`.
 * - `entry`: Entry of the log the dialog changes, else `null`.
 * - `box`: Box the dialog changes, else `null`.
 */
type EntryOpening = {
    target: EntryTarget;
    start: Date;
    end: Date;
    time: Date | null;
    minutes: number | null;
    category: string | null;
    values: { [key in FieldKey]: string };
    addresses: { [name: string]: string };
    titleLink: string;
    locationLink: string;
    onlineLink: string;
    onlineChannel: string;
    onlineTitle: string;
    note: string;
    foods: string[];
    skill: SkillValues;
    plan: Box | null;
    entry: EventApi | null;
    box: Box | null;
};

/**
 * Category and what of my long neck session, which I rate my neck pain with, see {@link painRowOf}.
 */
const neckLong: [string, string] = ["Body", "Neck long"];

/**
 * Values of a skill entry that has none yet, for an entry of another category or a new one.
 */
const skillNone: SkillValues = {
    module: "",
    type: "",
    semester: "",
    title: "",
    titleLink: "",
    chapters: [],
    links: [],
    rounds: [],
};

/**
 * Categories with the values of their fields, a copy of those kept,
 * see {@link categoriesKept}, made as the dialog opens,
 * since a value picked new joins the lists of the open dialog only, see {@link valueAdd}.
 */
let categories: Category[] = [];

/**
 * Values picked in the lists of the fields, by the field they write into, empty for none.
 */
let values: { [key in FieldKey]: string } = {
    title: "",
    from: "",
    location: "",
    online: "",
    with: "",
};

/**
 * What the open dialog shows.
 */
let opened: EntryOpening = {
    target: "log",
    start: new Date(),
    end: new Date(),
    time: null,
    minutes: null,
    category: null,
    values: { title: "", from: "", location: "", online: "", with: "" },
    addresses: {},
    titleLink: "",
    locationLink: "",
    onlineLink: "",
    onlineChannel: "",
    onlineTitle: "",
    note: "",
    foods: [],
    skill: skillNone,
    plan: null,
    entry: null,
    box: null,
};

/**
 * Link of the meeting or video of the platform picked in `Online`,
 * as typed or pasted, written as the `ALTREP` of its `X-ONLINE`, see {@link onlineRowOf};
 * empty for none, and once another platform is picked.
 */
let onlineLink: string = "";

/**
 * Channel of the meeting or video of the platform picked in `Online`,
 * like the channel of a video on YouTube or the ID of a meeting, as typed,
 * see {@link onlineRowOf}; empty for none, and once another platform is picked.
 */
let onlineChannel: string = "";

/**
 * Title of the meeting or video of the platform picked in `Online`,
 * like the title of a video or the passcode of a meeting, as typed, see {@link onlineRowOf};
 * empty for none, and once another platform is picked.
 */
let onlineTitle: string = "";

/**
 * Whether `Online` shows its parts below it to type, its provider, channel, title and link,
 * opened and closed by its pencil, see {@link onlineRowOf}, and opened as a new platform is added.
 */
let onlineOpen: boolean = false;

/**
 * Field of a place whose place shows its parts below it, to type them, see {@link partsOf}:
 * after a new place is added, or by its pencil; `null` while none does.
 */
let partsOpen: FieldKey | null = null;

/**
 * The place picked in each field of a place as I changed it by its parts, see {@link partsOf},
 * which the dialog writes everywhere once it saves, see {@link placesRename};
 * `null` while I changed nothing, and once another place is picked.
 */
let edits: { [key in FieldKey]: Place | null } = {
    title: null,
    from: null,
    location: null,
    online: null,
    with: null,
};

/**
 * Line of the place just added, see {@link placeAdd},
 * so picking it shows its parts; empty for none.
 */
let addedLine: string = "";

/**
 * A web address without spaces, like `https://github.com/UnathiCodex/NomSystem`,
 * as the reader takes it, see `linkForm` in `reader/places.ts`;
 * any other link of a skill entry is the folder the reader writes.
 */
const linkForm: RegExp = /^https?:\/\/\S+$/;

/**
 * Link of what the entry or the box was as it kept it, the `ALTREP` of its `SUMMARY`,
 * shown below its summary, see {@link summaryPartsShow}: a web address typed,
 * see {@link summaryPartsOf}, like the page of an event;
 * empty for none, a skill entry then linking the folder of its skill
 * or of its material, which the reader writes.
 */
let summaryLink: string = "";

/**
 * Whether the summary shows its text to change below it, opened and closed by its pencil,
 * see {@link summaryPartsOf}.
 */
let summaryOpen: boolean = false;

/**
 * The title the skill and the type picked of a skill entry give it, as last shown,
 * see {@link skillChanged};
 * empty for any other entry.
 */
let skillGiven: string = "";

/**
 * Pencil beside the summary, its link below it, the field of its text and that of its link
 * as shown, see {@link summaryPartsOf};
 * `null` while no summary shows them.
 */
let summaryShown:
    [HTMLButtonElement, HTMLAnchorElement, HTMLInputElement, HTMLInputElement] | null = null;

/**
 * Category picked, `null` before picking.
 */
let chosen: Category | null = null;

/**
 * The rows of a meal or a cooking of the log in place of its summary:
 * its summary, written by itself,
 * and its foods, a meal also the cooking it draws from and its meals, see `meal.ts`,
 * while `Food` or `Cook` is picked for the log;
 * `null` for every other category, whose summary is a plain field.
 */
let meal: HTMLElement[] | null = null;

/**
 * Whether the remove button was clicked once and waits for the second click.
 */
let removeAsked: boolean = false;

/**
 * My neck pain from 0 to 10 picked for a long neck session, empty for none.
 */
let pain: string = "";

/**
 * What the real minutes of the last entries like a box were loaded for last:
 * its category, what, module and type,
 * so they load again only when one of them changes, see {@link realLoad}.
 */
let realSeen: string = "";

/**
 * Median of the real minutes of the last entries like a new box,
 * see {@link realLoad}, `null` while none is loaded.
 */
let realMiddle: number | null = null;

/**
 * Whether I typed into the day of the end of a log entry since the dialog opened,
 * so it no longer fills itself, see {@link endDayFill}.
 */
let endDayTyped: boolean = false;

/**
 * Address of each name of `With` as the dialog has it, by name, like `sophale@invalid`:
 * as the entry or the box had it, or as typed by its pencil, see {@link withRowOf};
 * a name without one takes it by {@link personAddressOf}.
 */
let addresses: { [name: string]: string } = {};

/**
 * The names of `With` that show their parts below them to type,
 * each opened and closed by its own pencil, see {@link withRowOf}.
 */
let withOpen: string[] = [];

/**
 * Each person of `With` I changed by its parts, by its name as picked,
 * with the address it had in the entry, see {@link withPartsOf},
 * which the dialog writes everywhere once it saves, see `personsRename` in `../persons.ts`;
 * none while I changed nobody.
 */
let personEdits: { [old: string]: PersonEdit & { address: string } } = {};

/**
 * The people of `Persons.md` as kept when the dialog opened, see `personsKept` in `../persons.ts`,
 * which `With` offers, each a link to its row there, see {@link withRowOf}.
 */
let persons: Person[] = [];

/**
 * Place a new entry or box started with, where I was last,
 * see {@link lastPlaceFill}, so a way picked after it starts there instead of going there;
 * empty while none was filled in.
 */
let placeFilled: string = "";

/**
 * Whether the box of the dialog lasts only so long, its day and its length without times,
 * like my sleep of `08:00`, as the switch after its times sets it, see {@link lengthShow};
 * never an entry of the log.
 */
let lengthOnly: boolean = false;

/**
 * Field of the times that {@link timesCheck} marked wrong,
 * like the day of the end for an end before the start, `null` for none:
 * once I type into any field of the times, its mark goes, since that may set the times right,
 * and the next save checks them again.
 */
let timesMarked: HTMLInputElement | null = null;

/**
 * The calendar of the day the dialog writes with, as it started,
 * see {@link categoriesStart}, `null` before;
 * the dialog of a series logs and takes back the boxes of its list with it, see `series.ts`.
 */
let dayCalendar: Calendar | null = null;

/**
 * Loads the categories with the values of their fields from the reader;
 * an answer that is an error, like while the reader cannot read a file, is no categories,
 * so the next opening of the dialog loads them again.
 *
 * @returns Categories in their order
 * @throws {Error} - When the reader gives no valid answer
 */
async function categoriesLoad(): Promise<Category[]> {
    return readerAsk<Category[]>(`/api/day/categories?now=${new Date().toISOString()}`);
}

/**
 * Gives the categories with the values of their fields as the reader last sent them,
 * loaded as the code of the dialog loads and anew after every change of a file,
 * see `changesKept` in `../changes.ts`, so opening the dialog waits for no answer of the reader.
 */
const categoriesKept: () => Promise<Category[]> = changesKept(categoriesLoad);

/**
 * Gives the start of the entry or the box as the fields of the dialog say:
 * its time on its typed day,
 * like `01:45` on `13.10.2026`, on the day the dialog opened with should the typed day be no date.
 * - `day`: Typed day, like `2026-10-13`.
 *
 * @returns Start of the entry
 */
function startRead(): Date {
    const day: string =
        dateParse((document.getElementById("entry-start-day") as HTMLInputElement).value) ??
        dayOf(opened.start);
    return dateOf(
        new Date(`${day}T12:00:00`),
        timeFieldRead(document.getElementById("entry-start") as HTMLInputElement),
    );
}

/**
 * Reads the values picked in the lists of the fields of the category picked.
 * - `picked`: Values by the field they write into, empty for a field the category does not have.
 *
 * @returns Values by the field they write into
 */
function valuesRead(): { [key in FieldKey]: string } {
    const picked: { [key in FieldKey]: string } = {
        title: "",
        from: "",
        location: "",
        online: "",
        with: "",
    };
    (chosen?.fields ?? []).forEach((field: Field): void => {
        picked[field.key] = values[field.key];
    });
    return picked;
}

/**
 * Tells whether the dialog lists foods: those of a meal or a cooking of the log, see `meal.ts`.
 *
 * @returns Whether `Food` or `Cook` is picked for the log and holds a food
 */
function foodsListed(): boolean {
    return (
        [foodName, cookName].includes(chosen?.name ?? "") &&
        opened.target === "log" &&
        mealFoods().length > 0
    );
}

/**
 * Allows saving once a category and its summary are picked, never without:
 * of a skill its skill, its type may stay empty, see `categoryAllows` in `reader/categories.ts`,
 * which refuses it too; while one is missing, Save stays off,
 * as everywhere in the dashboard, without a word.
 * Every other field may stay empty, but the times,
 * which the browser asks for before it sends the form;
 * a task picked without result is left out, see `skill.ts`.
 * Called on every change of the fields,
 * it also shows the pencil and the link of the summary as it now is, see {@link summaryPartsShow},
 * and its file, see {@link entryFileShow}.
 * - `named`: Whether what it is is picked, of a skill its skill.
 */
function saveAllow(): void {
    const named: boolean =
        chosen !== null &&
        (chosen.name === skillName
            ? skillModuleType().module !== ""
            : titleRead(valuesRead().title).trim() !== "");
    (document.getElementById("entry-save") as HTMLButtonElement).disabled = !named;
    summaryPartsShow();
    realLoad().catch((error: unknown): void => console.error(error));
    entryFileShow();
}

/**
 * Gives the file of the entry or the box: the file it lies in,
 * or for a new one the file the reader will write it into,
 * as `calendarFileOf` in `reader/documents.ts` names it:
 * for `Skill` the log or the plan of its skill,
 * in `Modules/` for a module and in `Skilling/` for a project, none while no skill is picked;
 * for any other category those of its topic in the year of its day, see {@link topics}; nothing while no category is picked.
 * - `folder`: The folder of plan and log from `NomWorkspace` on.
 * - `ending`: End of the name of the file, as `logEnding` and `planEnding` in `reader/sources.ts`.
 * - `name`: Name of the folder of the skill picked, empty for none,
 *   see `skillFolderNameOf` in `skill.ts`.
 * - `skills`: Folder of its files, `Modules` for a module,
 *   whose folder starts with its code, else `Skilling`.
 * - `fresh`: Whether the entry or the box is new.
 * - `file`: The file, empty for none.
 *
 * @returns Path of the file from `NomWorkspace` on, like
 *   `NomManageplannings/NomManagecalendar/Health/Sleep_2026_Plan.ics`, empty while not known
 */
function entryFileOf(): string {
    const folder: string = "NomManageplannings/NomManagecalendar";
    const ending: string = opened.target === "log" ? "_Log.ics" : "_Plan.ics";
    const name: string = skillFolderNameOf();
    const skills: string = /^[A-Z]+\d+_/.test(name) ? "Modules" : "Skilling";
    const fresh: boolean = opened.entry === null && opened.box === null;
    let file: string = opened.entry?.extendedProps.file ?? opened.box?.file ?? "";
    if (fresh && chosen?.name === skillName)
        file = name === "" ? "" : `${folder}/${skills}/${name}${ending}`;
    else if (fresh && chosen !== null) file = topicFileOf(chosen.name, dayRead(), ending);
    return file;
}

/**
 * Gives the file of plan or log of an entry or a box of a category other than `Skill`,
 * as the reader names it, see `topicFileOf` in `reader/sources.ts`:
 * that of its topic in the year of its day, see {@link topics},
 * like `NomManageplannings/NomManagecalendar/Health/Sleep_2026_Plan.ics`;
 * for the dialog of an entry and that of a new series, see `series.ts`.
 *
 * @param category - Its category, like `Sleep`
 * @param day - Its day, like `2026-10-24`
 * @param ending - End of the name of the file, `_Plan.ics` or `_Log.ics`
 * @returns Path of the file from `NomWorkspace` on
 */
export function topicFileOf(category: string, day: string, ending: string): string {
    return `NomManageplannings/NomManagecalendar/${topics[category] ?? "Living/Living"}_${day.slice(0, 4)}${ending}`;
}

/**
 * Shows the file of the entry or the box at the left of the buttons,
 * see {@link entryFileOf} and `fileShow` in `choices.ts`.
 */
function entryFileShow(): void {
    fileShow(document.getElementById("entry-file") as HTMLAnchorElement, entryFileOf());
}

/**
 * Loads how long the last three entries like a box really lasted,
 * and gives a new box their median as its length, see {@link endFill},
 * so I plan by what happened, not by a hope (Buehler 1994);
 * the dialog shows them no more, since a line of minutes under the deadline only puzzled me.
 * Nothing for an entry of the log and while none is logged.
 * - `texts`: Category, what, module and type picked.
 * - `key`: The same as one text, to load only when they change.
 * - `real`: Minutes of the last entries like the box, the latest first.
 * - `sorted`: The same, the shortest first.
 *
 * @throws {Error} - When the reader cannot answer
 */
async function realLoad(): Promise<void> {
    const texts: BoxFields = textsRead();
    const key: string = JSON.stringify([
        opened.target,
        texts.category,
        texts.title,
        texts.module,
        texts.type,
    ]);
    if (key === realSeen) return;
    realSeen = key;
    realMiddle = null;
    if (opened.target !== "box" || texts.category === "") return;

    const real: number[] = await readerAsk<number[]>(
        `/api/day/real?${new URLSearchParams({
            category: texts.category,
            title: texts.title,
            module: texts.module,
            type: texts.type,
        })}`,
    );
    if (key !== realSeen || real.length === 0) return;
    const sorted: number[] = [...real].sort(
        (first: number, second: number): number => first - second,
    );
    realMiddle = sorted[Math.floor(real.length / 2)];
    endFill();
}

/**
 * Fills the end of a new box while its time is empty,
 * from its start and the median of the real minutes of the last entries like it,
 * see {@link realLoad}, like `16:00` to `18:30` for 150 minutes, with its day;
 * nothing for a box being changed, an entry of the log, a box without start time,
 * or while no entry like it is logged.
 * - `end`: Field of the time of the end.
 * - `start`: Start of the box as typed.
 */
function endFill(): void {
    const end: HTMLInputElement = document.getElementById("entry-end") as HTMLInputElement;
    if (
        opened.target !== "box" ||
        opened.box !== null ||
        realMiddle === null ||
        end.value.trim() !== "" ||
        timeFieldRead(document.getElementById("entry-start") as HTMLInputElement) === ""
    )
        return;
    const start: Date = startRead();
    timeFieldShow(end, new Date(start.getTime() + realMiddle * 60 * 1000));
    endDayFill();
}

/**
 * Puts the end of a session of sport at its start and the minutes of its videos after,
 * as `sport.ts` asks while it holds only videos,
 * like `18:00` to `18:30` for two videos of 15 minutes, with its day;
 * nothing while the start has no time.
 *
 * @param minutes - Minutes of its videos together
 */
function endFit(minutes: number): void {
    if (timeFieldRead(document.getElementById("entry-start") as HTMLInputElement) === "") return;
    timeFieldShow(
        document.getElementById("entry-end") as HTMLInputElement,
        new Date(startRead().getTime() + minutes * 60 * 1000),
    );
    endDayFill();
}

/**
 * Tells whether a field is one of a place, see {@link placeKeys}.
 *
 * @param field - Field of a category, like `From`
 * @returns Whether it picks a place
 */
function placeIs(field: Field): boolean {
    return placeKeys.includes(field.key);
}

/**
 * Takes a value picked into the list of every field of its kind that lacks it, like a new place,
 * because places are one list for every field of a place;
 * a room picked stays among the rooms, which the list offers only as I search,
 * see {@link placeSearchOf}.
 *
 * @param field - Field the value was picked in
 * @param value - Value picked, maybe new
 */
function valueAdd(field: Field, value: string): void {
    (chosen?.fields ?? [])
        .filter(
            (other: Field): boolean =>
                (other.key === field.key || (placeIs(other) && placeIs(field))) &&
                !other.values.includes(value) &&
                !other.rooms.includes(value),
        )
        .forEach((other: Field): void => {
            other.values.push(value);
        });
}

/**
 * Tells whether the dialog writes a long neck session into the log, which takes my neck pain.
 *
 * @returns Whether `Body` `Neck long` is picked for the log
 */
function neckLongPicked(): boolean {
    return opened.target === "log" && chosen?.name === neckLong[0] && values.title === neckLong[1];
}

/**
 * Builds the row of my neck pain for `Body` in the log:
 * 0 to 10 one below the other, one picked by one tap, the outcome my neck routine is judged by,
 * see `reader/trackers.ts`; shown only while `Neck long` is picked.
 *
 * @returns Row, none for any other category or the plan
 */
function painRowOf(): HTMLElement[] {
    if (opened.target !== "log" || chosen?.name !== neckLong[0]) return [];
    const row: HTMLElement = rowOf(
        "Pain",
        choicesOf({
            search: searchOf(
                Array.from({ length: 11 }, (_: unknown, number: number): Choice => ({
                    value: String(number),
                    text: String(number),
                    group: "",
                })),
            ),
            picked: pain === "" ? [] : [pain],
            many: false,
            adding: false,
            pick: (picked: string[]): void => {
                pain = picked[0] ?? "";
            },
        }),
    );
    row.id = "entry-pain";
    row.hidden = !neckLongPicked();
    return [row];
}

/**
 * Shows the steps of the value picked in a field, like the exercises of `Neck short`, one per line;
 * hides their place while the value picked has none.
 *
 * @param steps - Place of the steps below the picker of the field
 * @param field - Field with the steps of its values
 */
function stepsShow(steps: HTMLElement, field: Field): void {
    steps.replaceChildren(
        ...(field.steps[values[field.key]] ?? []).map((step: string): HTMLLIElement => {
            const line: HTMLLIElement = document.createElement("li");
            line.textContent = step;
            return line;
        }),
    );
    steps.hidden = steps.childElementCount === 0;
}

/**
 * Gives the value of a field that takes only its values,
 * like my means of transport, for a value an older entry wrote another way,
 * like `U-Bahn` for `UBahn`:
 * the value that reads the same without hyphens and spaces, ignoring case;
 * any other value as it is, also one no value reads like.
 * - `simple`: Writes a value without hyphens and spaces, in small letters.
 *
 * @param field - Field of the value, like the summary of `Way`
 * @param value - Value as written, like `UBahn`
 * @returns Value of the field, like `U-Bahn`
 */
function fixedValueOf(field: Field, value: string): string {
    const simple: (text: string) => string = (text: string): string =>
        text.replace(/[-\s]/g, "").toLowerCase();
    if (!field.fixed || field.values.includes(value)) return value;
    return (
        field.values.find((candidate: string): boolean => simple(candidate) === simple(value)) ??
        value
    );
}

/**
 * Gives the text of a field as the field takes it:
 * each of its values as {@link fixedValueOf} gives it,
 * those of a field of several values parted by `, `,
 * like `U-Bahn, Bus` for an older `UBahn, Bus` or a typed `u bahn, bus`;
 * the text of a field that takes new values as it is.
 *
 * @param field - Field of the text, like the summary of `Way`
 * @param text - Text as written, like `UBahn, Bus`
 * @returns Text of the field, like `U-Bahn, Bus`
 */
function fixedTextOf(field: Field, text: string): string {
    return (field.many === true ? text.split(", ") : [text])
        .map((value: string): string => fixedValueOf(field, value))
        .join(", ");
}

/**
 * Makes the choice of a value of a field:
 * a place by its name, its address grey beside it in the list,
 * see `placeChoiceOf` in `places.ts`,
 * the place picked by the name I gave it by its parts while it has one, see {@link edits},
 * so its line shows it; any other value as it is.
 * - `name`: The name I gave the place picked, empty for none.
 *
 * @param field - Field of the value, like `Place`
 * @param value - Value, like
 *   `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland` or `Bahn`
 * @returns Choice, like one showing `TUM Innenstadt`
 */
function fieldChoiceOf(field: Field, value: string): Choice {
    const name: string =
        labelOf(value) === labelOf(values[field.key]) ? (edits[field.key]?.name ?? "") : "";
    return field.key === "title"
        ? choiceOf(value)
        : placeChoiceOf(value, name !== "" ? name : labelOf(value), field.places);
}

/**
 * Gives the place offered in a field that the place picked is, by its name, as its field offers it:
 * my place of `Places.md` or a room of `Rooms.md`.
 *
 * @param field - Field of a place, like `From`
 * @returns The line of my place,
 *   like `TUM Innenstadt, Arcisstraße 21, 80333, München, Deutschland`,
 *   or the line of a room, `undefined` while the place picked is none offered,
 *   like an older place by its name alone, or nothing is picked
 */
function mineOf(field: Field): string | undefined {
    const line: string = values[field.key];
    return line === ""
        ? undefined
        : [...field.values, ...field.rooms].find(
              (value: string): boolean => labelOf(value) === labelOf(line),
          );
}

/**
 * Gives the place picked in a field as it is, before I change it by its parts:
 * as its row holds it, my place or the room of its name, else as its line says,
 * with the link the place of the entry kept while it is that place, also where a way starts,
 * see `placeOf` in `places.ts`.
 * - `line`: The place picked.
 * - `kept`: The link of the place the entry kept while it is that place, empty for none.
 *
 * @param field - Field of a place, like `Place`
 * @returns The place
 */
function placeOriginOf(field: Field): Place {
    const line: string = values[field.key];
    const kept: string =
        labelOf(line) === labelOf(opened.values.location) ? opened.locationLink : "";
    return placeOf(line, kept, field.places);
}

/**
 * Shows the address of the place picked in a field below its label, small and grey,
 * as a link that opens in a new tab the link of the place:
 * the one the place of the entry kept, its `ALTREP`,
 * while that same place stays picked,
 * else the link of my place or room in `Places.md` or `Rooms.md`, never that of another place;
 * plain text for a place without link, which opens nothing;
 * never the link itself as text, so nothing for no place, a place without address,
 * or an older place written by its name alone, like `Home Munich`;
 * a place I changed by its parts with the address and the link I gave it, see {@link edits};
 * right after the label the pencil, which shows and hides the parts of the place,
 * see {@link partsToggle}, while a place is picked.
 * - `line`: The place picked.
 * - `edit`: The place as I changed it, `null` while I changed nothing.
 * - `kept`: The link of the place the entry kept, empty for none.
 * - `link`: The link to open, empty for none.
 *
 * @param pencil - The pencil beside the label, see {@link placePartsOf}
 * @param address - The address below the label
 * @param field - Field, like `Place`
 */
function placePartsShow(pencil: HTMLButtonElement, address: HTMLAnchorElement, field: Field): void {
    const line: string = values[field.key];
    const edit: Place | null = edits[field.key];
    const kept: string =
        field.key === "location" && line === opened.values.location ? opened.locationLink : "";
    const link: string =
        edit !== null
            ? edit.link
            : kept !== ""
              ? kept
              : (field.places[mineOf(field) ?? line]?.link ?? "");
    address.textContent = edit !== null ? placeAddressOf(edit) : addressOf(line);
    if (link !== "") address.href = link;
    else address.removeAttribute("href");
    address.hidden = address.textContent === "";
    pencil.hidden = line === "";
}

/**
 * Makes the pencil beside the label of the place picked in a field,
 * which shows and hides its parts, see {@link partsToggle}, and its address below the label,
 * see {@link placePartsShow}.
 * - `pencil`: The pencil, `✎`.
 * - `address`: The address.
 *
 * @param field - Field of a place, like `Place`
 * @returns The pencil and the address
 */
function placePartsOf(field: Field): [HTMLButtonElement, HTMLAnchorElement] {
    const pencil: HTMLButtonElement = document.createElement("button");
    const address: HTMLAnchorElement = document.createElement("a");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Pencil, "Change the place");
    pencil.addEventListener("click", (): void => partsToggle(field));
    address.className = "entry-address";
    address.target = "_blank";
    address.rel = "noopener";
    placePartsShow(pencil, address, field);
    return [pencil, address];
}

/**
 * Shows the rows of where it is anew, below what it is,
 * see {@link placeRowsOf}, the other rows staying as they are.
 */
function placesShow(): void {
    document.getElementById("entry-place")?.replaceChildren(...placeRowsOf());
}

/**
 * Tells whether the place picked in a field shows its parts below it, see {@link partsOf}:
 * while they are open for the field and a place is picked.
 *
 * @param field - Field of the category picked, like `Place`
 * @returns Whether its parts show
 */
function partsShown(field: Field): boolean {
    return partsOpen === field.key && values[field.key] !== "";
}

/**
 * Shows the rows of the places anew, after the parts of a field opened or closed,
 * the first part focused while they show,
 * so I type at once, found by the key of their field, see {@link partsOf}.
 *
 * @param field - Field of the place, like `Place`
 */
function partsShow(field: Field): void {
    placesShow();
    if (partsShown(field))
        document
            .querySelector<HTMLInputElement>(`#entry .field-parts[data-field="${field.key}"] input`)
            ?.focus();
}

/**
 * Shows the parts of the place picked in a field below it,
 * or hides them while they show, see {@link partsOf};
 * one field at a time shows them.
 *
 * @param field - Field of the place, like `Place`
 */
function partsToggle(field: Field): void {
    partsOpen = partsOpen === field.key ? null : field.key;
    partsShow(field);
}

/**
 * Builds the parts of the place picked in a field,
 * as the foods of a meal and the documents of a chapter stand:
 * indented under the place with a thin grey line at their left, see `.field-parts` in `day.css`:
 * the columns of its row, its label, street, code, city, country, link and star,
 * see `placeEditOf` in `places.ts`, as it is, see {@link placeOriginOf}, or as I changed it;
 * I change them in place as the text of a summary, see {@link summaryPartsOf}:
 * the dialog takes the place as I type,
 * see {@link edits}, its line and its address show it once I leave a part, the rows built anew,
 * see {@link placesShow}, the part I went on to keeping the cursor,
 * and once the dialog saves, the reader writes it everywhere, see {@link placesRename}.
 * They carry the key of their field, like `location`,
 * so the dialog finds them apart from those of another place and from the link of the summary.
 * - `element`: The parts.
 *
 * @param field - Field of the place, like `Place`
 * @returns The parts
 */
function partsOf(field: Field): HTMLElement {
    const element: HTMLElement = document.createElement("div");
    element.className = "field-parts";
    element.dataset.field = field.key;
    element.append(
        ...placeEditOf(
            edits[field.key] ?? placeOriginOf(field),
            (typed: Place): void => {
                edits[field.key] = typed;
            },
            (next: string | null): void => {
                placesShow();
                document
                    .querySelector<HTMLInputElement>(
                        `#entry .field-parts input[aria-label="${next}"]`,
                    )
                    ?.focus();
            },
        ),
    );
    return element;
}

/**
 * Shows the link of what the entry or the box was below its summary, small and grey,
 * as a link that opens in a new tab, like the address of a place, see {@link placePartsShow}:
 * the link typed, like the page of an event, a path of mine as a folder of a skill shows,
 * see `folderLinkShow` in `../skill/links.ts`;
 * for a skill entry without one the folder of its skill,
 * which opens in this window, being NomSystem's own, see `skillPathShow` in `skill.ts`;
 * nothing while it has none;
 * the pencil beside the summary while it names something, see {@link titleRead};
 * the field of its text the summary picked, and that of its link the link shown,
 * filled in already for a skill, while I don't type in them.
 * - `pencil`, `link`, `text`, `address`: Pencil, link, text and field of the link as shown.
 */
function summaryPartsShow(): void {
    if (summaryShown === null) return;
    const [pencil, link, text, address]: [
        HTMLButtonElement,
        HTMLAnchorElement,
        HTMLInputElement,
        HTMLInputElement,
    ] = summaryShown;
    if (text !== document.activeElement) text.value = values.title;
    if (address !== document.activeElement)
        address.value =
            summaryLink === "" && chosen?.name === skillName ? skillPathOf() : summaryLink;
    pencil.hidden = titleRead(valuesRead().title) === "";
    if (chosen?.name === skillName && summaryLink === "") {
        skillPathShow(link);
        return;
    }
    if (summaryLink !== "" && !linkForm.test(summaryLink)) {
        folderLinkShow(link, summaryLink);
        return;
    }
    link.textContent = summaryLink;
    link.target = "_blank";
    if (summaryLink !== "") link.href = summaryLink;
    else link.removeAttribute("href");
    link.hidden = summaryLink === "";
}

/**
 * Makes the parts of what the entry or the box was, as a place has its parts,
 * see {@link placePartsOf}: the pencil beside its summary, which always changes it,
 * see {@link summaryChange}, and the link below the summary, see {@link summaryPartsShow};
 * that of a skill entry beside and below its skill and type, see `skill.ts`.
 * The summary of a field, like `Worldnews` of `Internet`,
 * `Night` of `Sleep` or `U-Bahn, Bus` of `Way`, also one as planned, has the part `Text`,
 * indented with the grey line at its left, see {@link partOf}, its summary as written,
 * which its pencil shows and hides and I change in place, as the name of my place:
 * the entry takes it as I type,
 * the values of a field that takes only its values as that field writes them,
 * see {@link fixedTextOf}, and its line shows it once I leave the part, its rows built anew,
 * see {@link titleRowsShow};
 * that happens at `focusout`, whose `relatedTarget` names the field I went on to,
 * which then keeps the cursor.
 * The title of a skill entry has the part `Text` too, taken as I type,
 * its skill and type staying as they show;
 * a summary written by itself, that of a meal, has no text to type.
 * The summary of a field has the part `Link` below `Text`, its link as typed,
 * like the page of an event, which shows below it as I type, see {@link summaryPartsShow};
 * a skill entry links the folder of its skill, a meal nothing typed.
 * - `pencil`: The pencil, `✎`.
 * - `link`: The link below the summary.
 * - `text`: The field of the summary as written, the same as its line while I type elsewhere,
 *   see {@link summaryPartsShow}; in the parts only while it has its text to change.
 * - `address`: The field of its link as typed, in the parts only for the summary of a field.
 * - `parts`: The parts holding it, shown while the pencil opened them, see {@link summaryOpen}.
 * - `shown`: The summary as its line shows it, taken as I enter `text`.
 *
 * @param summary - Field of the summary, which shows its text to change;
 *   left out for a summary without field, like that of a meal or the title of a skill entry
 * @param typed - Whether it has its text to change, like the title of a skill entry;
 *   whether it has a field when left out
 * @returns Pencil, link and the parts to type them, to put beside and below the summary
 */
function summaryPartsOf(
    summary?: Field,
    typed: boolean = summary !== undefined,
): [HTMLButtonElement, HTMLAnchorElement, HTMLElement] {
    const pencil: HTMLButtonElement = document.createElement("button");
    const link: HTMLAnchorElement = document.createElement("a");
    const text: HTMLInputElement = partFieldOf("text", values.title, "Text of the summary");
    const address: HTMLInputElement = partFieldOf("url", summaryLink, "Link of the summary");
    const parts: HTMLElement = document.createElement("div");
    let shown: string = values.title;
    pencil.type = "button";
    pencil.className = "entry-pencil";
    link.className = "entry-address";
    link.rel = "noopener";
    parts.className = "field-parts";
    if (typed) parts.append(partOf("Text", text));
    if (summary !== undefined || chosen?.name === skillName) parts.append(partOf("Link", address));
    iconPut(pencil, Pencil, "Change the summary");
    parts.hidden = !summaryOpen;
    text.addEventListener("focusin", (): void => {
        shown = values.title;
    });
    text.addEventListener("input", (): void => {
        values.title =
            summary === undefined ? text.value.trim() : fixedTextOf(summary, text.value.trim());
        saveAllow();
    });
    text.addEventListener("focusout", (event: FocusEvent): void => {
        const next: string | null =
            event.relatedTarget instanceof HTMLElement
                ? event.relatedTarget.getAttribute("aria-label")
                : null;
        if (values.title === shown || summary === undefined) return;
        titleRowsShow();
        document
            .querySelector<HTMLInputElement>(`#entry .field-parts input[aria-label="${next}"]`)
            ?.focus();
    });
    address.addEventListener("input", (): void => {
        summaryLink = address.value.trim();
        summaryPartsShow();
    });
    pencil.addEventListener("click", (): void => {
        summaryChange(parts);
    });
    summaryShown = [pencil, link, text, address];
    summaryPartsShow();
    return [pencil, link, parts];
}

/**
 * Changes the summary of this entry alone as its pencil asks,
 * see {@link summaryPartsOf}, never opening a series:
 * opens the list of the foods of a meal, which its foods write, see `meal.ts`;
 * shows and hides the text of any other summary, also the title of a skill entry,
 * its field focused as it shows.
 *
 * @param parts - The parts of the summary, which hold its text
 */
function summaryChange(parts: HTMLElement): void {
    if (meal !== null) meal.at(-1)?.querySelector<HTMLButtonElement>(".picker-line")?.click();
    else {
        summaryOpen = !summaryOpen;
        parts.hidden = !summaryOpen;
        if (summaryOpen) parts.querySelector("input")?.focus();
    }
}

/**
 * Puts the link of a meal or a cooking beside and below its summary,
 * which `meal.ts` writes by itself from its foods, see {@link summaryPartsOf}:
 * the pencil right after the summary, which opens the list of its foods,
 * see {@link summaryChange}, and the link below it.
 * - `value`: The summary with its link.
 *
 * @param row - The row of the summary, see `mealOf` in `meal.ts`
 */
function mealLinkPut(row: HTMLElement): void {
    const value: HTMLDivElement = document.createElement("div");
    value.append(row.lastElementChild as HTMLElement, ...summaryPartsOf());
    row.append(value);
}

/**
 * Tells the dialog that what is picked for a skill entry changed:
 * its title follows its skill and type, see `skillTitleOf` in `skill.ts`,
 * and its link, once they change, the folder they give it;
 * shows the link of its summary anew, which follows its skill, type and semester,
 * see {@link summaryPartsShow}, and allows saving or not.
 * - `given`: The title the skill and type picked now give it.
 */
function skillChanged(): void {
    const given: string = skillTitleOf();
    if (given !== skillGiven) summaryLink = "";
    values.title = given;
    skillGiven = given;
    summaryPartsShow();
    saveAllow();
}

/**
 * Adds a place typed that is none of mine yet, see the top of this file:
 * the reader writes it into `Places.md` at once by its name, a room into `Rooms.md`,
 * and picked it shows its parts,
 * so I type its address and its link below it next, its name still to mend, see {@link partsOf};
 * nothing for an empty name, which no place has.
 * - `place`: The place as written.
 *
 * @param field - Field of a place, like `Place`
 * @param name - Typed name of the place, like `Café Rischart`
 * @returns The place as an entry writes it, its name alone,
 *   like `Café Rischart`, `null` when none is written
 * @throws {Error} - When the reader does not take it, like for a name another place has
 */
async function placeAdd(field: Field, name: string): Promise<string | null> {
    if (name.trim() === "") return null;
    const place: Place = await placeSend(
        {
            name: name,
            street: "",
            code: "",
            city: "",
            country: "",
            link: "",
            standard: false,
        },
        "",
    );
    addedLine = lineOf(place);
    partsOpen = field.key;
    return addedLine;
}

/**
 * Builds the search of the list of a field of a place:
 * my default place always first, with its star, see `standardFirst` in `places.ts`;
 * while nothing is typed my places, the most used first,
 * and the place picked when it is none of them,
 * like a room or an older place by its name alone, so its line
 * shows it by its label; as I type my places, then the rooms of the university,
 * like `Audimax` or `0509` finding `0509.EG.980 (Audimax Werner-von-Siemens-Hörsaal)`,
 * each with its address beside it, see {@link fieldChoiceOf}.
 * - `line`: The place picked, empty for none.
 * - `shown`: Places the search looks through, each once.
 *
 * @param field - Field of a place, like `Place`
 * @returns Search for the picker
 */
function placeSearchOf(field: Field): (text: string) => Promise<Choice[]> {
    return async (text: string): Promise<Choice[]> => {
        const line: string = values[field.key];
        const shown: string[] =
            text.trim() !== ""
                ? [...new Set([...field.values, ...field.rooms])]
                : [...new Set([...field.values, ...(line === "" ? [] : [mineOf(field) ?? line])])];
        return await searchOf(
            standardFirst(shown, field.places).map((value: string): Choice =>
                fieldChoiceOf(field, value),
            ),
        )(text);
    };
}

/**
 * Builds the row of a field of the category picked: its name and one line showing its value,
 * see {@link choicesOf}, whose list offers its values, the most used first, searched as I type,
 * the typed text taken as a new value with `+ New …`, see {@link valueAdd},
 * but in a field that takes no new values,
 * like the summary of `Sleep`,
 * a new place written into `Places.md` by its name, see {@link placeAdd};
 * a field of a place offers the rooms of the university only as I search,
 * see {@link placeSearchOf}.
 * A place shows by its name, once, however often it was used and whatever address an entry kept,
 * which a place picked again keeps, with its pencil beside it and its address below it,
 * see {@link placePartsOf};
 * a summary with the steps of the value picked below it, see {@link stepsShow}.
 * A meal of the log has its summary, its meals and its foods in place of the summary,
 * see {@link meal}. A summary has its pencil beside it and its link below it,
 * see {@link summaryPartsOf}.
 * A place shows its parts below it, see {@link partsOf}, once added, or by its pencil,
 * and hides them as another place is picked,
 * which forgets what I changed of the one before, see {@link edits}.
 * `Online` has a row of its own, see {@link onlineRowOf}.
 * - `place`: Pencil and address of a place, `null` for any other field.
 * - `summary`: Pencil, link and the part to type it of a summary,
 *   see {@link summaryPartsOf}, none for a place.
 * - `steps`: Place of the steps of the field.
 * - `shown`: Whether the place shows its parts, see {@link partsShown}.
 *
 * @param field - Field of the category picked, like `Place`
 * @returns Its row, with the parts of its place where they show
 */
function fieldRowsOf(field: Field): HTMLElement[] {
    if (field.key === "with")
        return [
            withRowOf({
                field: field,
                persons: persons,
                people: peopleRead(),
                open: withOpen,
                edits: personEdits,
                opened: (open: string[]): void => {
                    withOpen = open;
                },
                pick: (people: Attendee[]): void => {
                    values.with = namesOf(people);
                    addresses = { ...addresses, ...addressesOf(people) };
                    people.forEach((person: Attendee): void => valueAdd(field, person.name));
                    saveAllow();
                },
            }),
        ];
    if (field.key === "online")
        return [
            onlineRowOf({
                field: field,
                categories: categories,
                online: {
                    online: values.online,
                    onlineLink: onlineLink,
                    onlineChannel: onlineChannel,
                    onlineTitle: onlineTitle,
                },
                open: onlineOpen,
                opened: (open: boolean): void => {
                    onlineOpen = open;
                },
                pick: (online: Online): void => {
                    values.online = online.online;
                    onlineLink = online.onlineLink;
                    onlineChannel = online.onlineChannel;
                    onlineTitle = online.onlineTitle;
                    saveAllow();
                },
            }),
        ];
    if (field.key === "title" && meal !== null) return meal;
    if (field.key === "title" && field.many === true && !asPlanned()) return [manyRowOf(field)];
    const place: [HTMLButtonElement, HTMLAnchorElement] | null =
        field.key === "title" ? null : placePartsOf(field);
    const summary: HTMLElement[] = field.key === "title" ? summaryPartsOf(field) : [];
    const steps: HTMLElement = document.createElement("ul");
    const shown: boolean = partsShown(field);
    steps.className = "entry-steps";
    stepsShow(steps, field);
    return [
        rowOf(
            field.name,
            choicesOf({
                search:
                    field.key !== "title"
                        ? placeSearchOf(field)
                        : (text: string): Promise<Choice[]> =>
                              searchOf(
                                  field.values.map((value: string): Choice =>
                                      fieldChoiceOf(field, value),
                                  ),
                              )(text),
                picked: values[field.key] === "" ? [] : [mineOf(field) ?? values[field.key]],
                many: false,
                adding: !field.fixed,
                add:
                    field.key === "title"
                        ? undefined
                        : (name: string): Promise<string | null> => placeAdd(field, name),
                noun: field.key === "title" ? "summary" : "place",
                aside: place !== null ? [place[0]] : summary.slice(0, 1),
                below:
                    place === null
                        ? [...summary.slice(1), steps]
                        : [place[1], ...(shown ? [partsOf(field)] : [])],
                locked: field.key === "title" && asPlanned(),
                pick: (picked: string[]): void => {
                    const line: string = picked[0] ?? "";
                    const before: string = labelOf(values[field.key]);
                    values[field.key] =
                        field.key !== "title" && line !== "" && labelOf(line) === before
                            ? values[field.key]
                            : line;
                    if (line !== "") valueAdd(field, line);
                    if (place !== null && labelOf(line) !== before) {
                        edits[field.key] = null;
                        if (line === addedLine) partsOpen = field.key;
                        else if (partsOpen === field.key) partsOpen = null;
                    }
                    if (place !== null) {
                        addedLine = "";
                        placePartsShow(place[0], place[1], field);
                    }
                    stepsShow(steps, field);
                    document
                        .getElementById("entry-pain")
                        ?.toggleAttribute("hidden", !neckLongPicked());
                    saveAllow();
                    if (partsShown(field) !== shown || (shown && labelOf(line) !== before))
                        partsShow(field);
                },
            }),
        ),
    ];
}

/**
 * Builds the row of a summary of several values, like the means of a way, since I change on it,
 * like U-Bahn then bus, or my body care, like `Caring, Shower`:
 * one line of the row, the values picked concatenated as one summary, parted by `, `,
 * like `U-Bahn, Bus`, which is also how the entry writes them;
 * its list, a menu, takes a value or takes it back by a click and stays open for the next,
 * see `many` in `choices.ts`, and takes a new value where the field takes new ones,
 * like `Body`, not `Way`. A way keeps the order picked, the order I rode in;
 * any other summary the order of its list, the most used first, a new value last,
 * like `Caring, Shower`, see {@link rankOf}. While none is picked, the row empty without a plus, as
 * every field of one value, since a click into it opens its list;
 * its pencil beside it and its link below it, see {@link summaryPartsOf}.
 * - `picked`: The values picked, in their order.
 * - `pencil`, `link`, `linkParts`: Pencil, link and the part to type it of the summary.
 *
 * @param field - Field of several values, like the summary of `Way` or `Body`
 * @returns Its row
 */
function manyRowOf(field: Field): HTMLElement {
    const picked: string[] = values[field.key] === "" ? [] : values[field.key].split(", ");
    const [pencil, link, linkParts]: [HTMLButtonElement, HTMLAnchorElement, HTMLElement] =
        summaryPartsOf(field);
    return rowOf(
        field.name,
        choicesOf({
            search: searchOf(field.values.map(choiceOf)),
            picked: picked,
            many: true,
            adding: !field.fixed,
            noun: "summary",
            aside: [pencil],
            below: [link, linkParts],
            order: field.fixed
                ? undefined
                : (chosen: string[]): string[] =>
                      [...chosen].sort(
                          (first: string, second: string): number =>
                              rankOf(field, first) - rankOf(field, second),
                      ),
            pick: (chosen: string[]): void => {
                values[field.key] = chosen.join(", ");
                saveAllow();
            },
        }),
    );
}

/**
 * Gives where a value stands in the list of a field, the most used first,
 * a value not in it, a new one, after all.
 *
 * @param field - Field of several values, like the summary of `Body`
 * @param value - Value picked, like `Shower`
 * @returns Its place, from 0
 */
function rankOf(field: Field, value: string): number {
    const at: number = field.values.indexOf(value);
    return at === -1 ? field.values.length : at;
}

/**
 * Gives the address of a name of `With`: as the dialog has it,
 * see {@link addresses}, else as its last entry wrote it, else the standard one,
 * see {@link standardAddressOf}.
 *
 * @param field - The field `With`, with the address of each name its last entry wrote
 * @param name - Name, like `Sophale`
 * @returns Address, like `sophale@invalid`
 */
function personAddressOf(field: Field, name: string): string {
    return addresses[name] ?? field.links[name] ?? standardAddressOf(name);
}

/**
 * How a row `With` is built,
 * see {@link withRowOf}, the same in this dialog and in that of a series, see `./series.ts`;
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
 * - `opened`: Takes whose parts show, as the pencil of a person opens or closes its parts.
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
            setup.edits[person.name] ?? personEditOf(setup.persons, person.name, person.address);
        const name: HTMLInputElement = partFieldOf("text", edit.name, `Name of ${person.name}`);
        const title: HTMLInputElement = partFieldOf("text", edit.title, `Title of ${person.name}`);
        const mail: HTMLInputElement = partFieldOf("email", edit.mail, `Mail of ${person.name}`);
        const link: HTMLInputElement = partFieldOf("url", edit.link, `Link of ${person.name}`);
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
                mail.value.trim() === "" ? standardAddressOf(person.name) : mail.value.trim(),
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
 * while nothing is typed only my own people, those of `Persons.md` named `Family, …` or `Group, …`,
 * like `Family, Sopha` or `Group, Kicktipp`, the most used first,
 * not the lecturers an imported lecture names;
 * as I type every name my entries wrote, the most used first,
 * each as `Persons.md` names its person, like `Zimmer, Philip` for an older `Philip Zimmer`,
 * see `personOf` in `../persons.ts`, and every person of `Persons.md` after them,
 * like `bich` finding `Bichler, Martin`,
 * as a field of a place offers the rooms, see {@link placeSearchOf}.
 * - `used`: The names my entries wrote, as `Persons.md` names their people.
 * - `all`: Those and every person of `Persons.md`, each once.
 * - `shown`: Names the search looks through.
 *
 * @param field - The field `With`
 * @param people - The people of `Persons.md`
 * @returns Search for the picker
 */
function withSearchOf(field: Field, people: Person[]): (text: string) => Promise<Choice[]> {
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
 * see `examinersOf` in `./series.ts`: my own people, `Family, …` and `Group, …`,
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
            name.includes(";") ? null : (personOf(persons, name.trim())?.name ?? name.trim()),
        noun: "person",
        people: true,
        linkOf: (name: string): string => {
            const person: Person | undefined = personOf(persons, name);
            return person === undefined ? "" : personRowAddressOf(person);
        },
    };
}

/**
 * Builds the row of `With`, who I was with, one or more people or groups, mostly one group,
 * like `Socials`, sometimes several,
 * like `Bichler, Martin · Willi`, the one maker of this dialog and of that of a series,
 * see {@link WithSetup}: one line of the row, the names picked apart by a middle dot,
 * since a person of `Persons.md` holds a comma in its name,
 * see `peopleOf` in `../persons.ts`, going on over the next line where it is too long;
 * a name of a person there, also an older
 * one spoken, like `Philip Zimmer`, is a link in the line to its row there,
 * see `personOf` in `../persons.ts`, any other name plain text.
 * Its list offers my own people, `Family, …` and `Group, …` of `Persons.md`,
 * and as I type every name my earlier entries wrote and every person of `Persons.md`,
 * see {@link withSearchOf}, takes a name or takes it back by a click and stays open for the next,
 * and adds a typed name, `Search or add a person`, a person as `Persons.md` names it,
 * like `Bichler, Martin` for a typed `Martin Bichler`, but none with `;`, which parts names;
 * right after each name its own pencil,
 * which shows below the line the parts of that person to change, its name, its mail and its link,
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
                        people.find((person: Attendee): boolean => person.name === name) ?? {
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
 * see {@link onlineRowOf}, the same in this dialog and in that of a series, see `./series.ts`;
 * only what it saves differs.
 *
 * - `field`: The field `Online`, my platforms of `Online.md`,
 *   the most used first, with the row of each.
 * - `categories`: The categories whose fields `Online` take a platform as the reader wrote it,
 *   see {@link platformTake}.
 * - `online`: The platform picked, the link, the channel and the title of its meeting or video.
 * - `open`: Whether its parts show below it.
 * - `opened`: Takes whether its parts show, as its pencil opens or closes them,
 *   or a new platform opens them.
 * - `pick`: Takes the platform, the channel, the title and the link, after each platform picked,
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
 * Builds the row of `Online`, what the entry did online, a sibling of its place that works like it,
 * since a place is only where I physically am,
 * see {@link fieldRowsOf}, the one maker of this dialog and of that of a series,
 * see {@link OnlineSetup}: one line showing its platform, like `YouTube`,
 * whose list offers my platforms of `Online.md`, the most used first, searched as I type,
 * and adds a typed name as a new platform, see `platformSend` in `places.ts`, its parts then open;
 * beside it the pencil while a platform is picked, which shows and hides its parts;
 * below it, as a place shows its address, small and grey, its parts that have a value:
 * who offers it, from `Online.md`, and the channel and the title of its meeting or video,
 * joined by commas, a link that opens the link of its meeting or video,
 * else the web app of its row, never the link itself as text, `Link` while nothing else shows.
 * Its parts, indented as those of a place, see {@link partOf}, the link last, as in every field,
 * since a click on what shows opens it: `Label`, its name, which renames it, and `Provider`,
 * which change its row of `Online.md` as I leave them, a new name showing the row anew;
 * then the channel, the title and the link of the entry's own meeting or video,
 * the link holding the web app of its row, as the link of a place holds its own,
 * until I type the entry's own in its place, which alone is kept;
 * all three go along when the entry is saved.
 * Another platform picked empties all three, as a new meeting.
 * - `online`, `open`: What is picked and whether its parts show.
 * - `pencil`: The pencil, `✎`.
 * - `line`: The parts with a value below the platform.
 * - `label`, `provider`, `channel`, `title`, `link`:
 *   Fields of the name, the provider, the channel, the title and the link.
 * - `hint`: Line saying that the reader did not take the name or the provider.
 * - `parts`: The parts to type, shown while the pencil opened them.
 * - `show`: Shows the pencil, the line and the parts for the platform picked.
 * - `take`: Takes what is picked and typed, shows it and saves it into the setup.
 * - `write`: Sends the name and the provider as typed and takes the platform as written.
 * - `row`: The row.
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
    const label: HTMLInputElement = partFieldOf("text", online.online, "Label of the platform");
    const provider: HTMLInputElement = partFieldOf("text", "", "Provider of the platform");
    const channel: HTMLInputElement = partFieldOf("text", online.onlineChannel, "Channel online");
    const title: HTMLInputElement = partFieldOf("text", online.onlineTitle, "Title online");
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
        if (provider !== document.activeElement) provider.value = platform?.provider ?? "";
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
            { name: label.value, provider: provider.value, link: field.platforms[old]?.link ?? "" },
            old,
        )
            .then((platform: Platform): void => {
                platformTake(setup.categories, platform, old);
                hint.hidden = true;
                take({ ...online, online: platform.name });
                if (platform.name !== old)
                    row.replaceWith(onlineRowOf({ ...setup, online: online, open: open }));
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
                if (!field.values.includes(platform.name)) field.values.push(platform.name);
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
                        : { online: platform, onlineLink: "", onlineChannel: "", onlineTitle: "" },
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

/**
 * Reads who I was with as picked in `With`, each name with its address,
 * see {@link personAddressOf}.
 * - `field`: The field `With` of the category picked, `undefined` for none.
 *
 * @returns The people, none while none is picked
 */
function peopleRead(): Attendee[] {
    const field: Field | undefined = chosen?.fields.find(
        (other: Field): boolean => other.key === "with",
    );
    if (field === undefined || values.with === "") return [];
    return values.with
        .split(withParting)
        .map((name: string): Attendee => ({ name: name, address: personAddressOf(field, name) }));
}

/**
 * Builds the rows of where it is, see {@link fieldRowsOf}: a way where it starts, then its place,
 * see {@link placeIs}, then what it did online,
 * see {@link onlineRowOf}, in the order of the fields of the category picked.
 *
 * @returns The rows, none before a category is picked
 */
function placeRowsOf(): HTMLElement[] {
    return (chosen?.fields ?? [])
        .filter((field: Field): boolean => placeIs(field) || field.key === "online")
        .flatMap(fieldRowsOf);
}

/**
 * Builds the rows of the fields of the category picked below its times, see {@link fieldRowsOf}:
 * those neither its summary nor where it is, see {@link placeRowsOf},
 * which is who I was with, see {@link withRowOf}.
 *
 * @returns The rows, none before a category is picked
 */
function moreRowsOf(): HTMLElement[] {
    return (chosen?.fields ?? [])
        .filter(
            (field: Field): boolean =>
                field.key !== "title" && !placeIs(field) && field.key !== "online",
        )
        .flatMap(fieldRowsOf);
}

/**
 * Tells whether the dialog logs a box of the plan that has a category,
 * or changes an entry of the log logged from a box, which points to it with `RELATED-TO`:
 * its category and summary stay the plan's, so the link shows how the plan was really done,
 * while its times, place, people, semester and note change freely,
 * like a lecture watched online at home;
 * its summary changes only by its pencil, see {@link summaryChange},
 * and the skill and type of a skill entry by a click on them, see `skill.ts`.
 * A box without category leaves both open, to be picked.
 *
 * @returns Whether it does
 */
function asPlanned(): boolean {
    return (
        opened.target === "log" &&
        opened.category !== null &&
        (opened.plan !== null || (opened.entry?.extendedProps.planned ?? "") !== "")
    );
}

/**
 * Shows the rows of the summary of the category picked,
 * see {@link fieldRowsOf}, also anew after its text changed by its pencil,
 * see {@link summaryPartsOf}, the rows below it staying as they are.
 */
function titleRowsShow(): void {
    document
        .getElementById("entry-fields")
        ?.replaceChildren(
            ...(chosen?.fields ?? [])
                .filter((field: Field): boolean => field.key === "title")
                .flatMap(fieldRowsOf),
        );
}

/**
 * Shows the fields of the category picked, each its rows,
 * see {@link fieldRowsOf}, in the order of the file, the same for every category,
 * below the category: what, then where it is, a way where it starts before its place,
 * see {@link placesShow}, then below the times who I was with, see {@link moreRowsOf};
 * after them for `Body` my neck pain, shown while `Neck long` is picked, see {@link painRowOf};
 * a meal of the log is its summary, see {@link meal}.
 */
function fieldsShow(): void {
    titleRowsShow();
    placesShow();
    document
        .getElementById("entry-more")
        ?.replaceChildren(
            ...moreRowsOf(),
            ...painRowOf(),
            ...(sportShown() ? sportRowsOf(saveAllow, endFit) : []),
        );
    document
        .getElementById("entry-note")
        ?.closest(".panel-field")
        ?.toggleAttribute("hidden", sportShown());
    saveAllow();
}

/**
 * Tells whether the dialog shows a session of sport, with its workout,
 * exercises and videos, see `sport.ts`.
 *
 * @returns Whether `Sport` is picked for the log
 */
function sportShown(): boolean {
    return chosen?.name === sportName && opened.target === "log";
}

/**
 * Loads where I was last before the start of the entry, from the reader,
 * see `lastPlaceRead` in `reader/categories.ts`;
 * for an entry without start time where I was last before the end of its day.
 * - `before`: The moment I was there before.
 *
 * @returns Place, empty when no entry before has one
 * @throws {Error} - When the reader gives no valid answer
 */
async function lastPlaceLoad(): Promise<string> {
    const before: Date =
        timeFieldRead(document.getElementById("entry-start") as HTMLInputElement) === ""
            ? dateOf(new Date(`${dayRead()}T12:00:00`), "23:59")
            : startRead();
    const response: Response = await fetch(`/api/day/last-place?before=${before.toISOString()}`);
    return await response.json();
}

/**
 * Fills in where a new entry starts, also one logged from a box,
 * as where I was last before it,
 * see {@link lastPlaceLoad}, else as my default place, `★` in `Places.md`, like `Home Munich`;
 * a new box of the plan always as my default place, since no entry before it tells where I will be:
 * a way its `From`, every other category its place, while that field is empty;
 * nothing for an entry or a box being changed.
 * The place is my place of that name as its list offers it, so it shows with its link,
 * as picked there, like `Mensa Leopoldstraße` for a Talk after a way that ended there;
 * a way picked after another category leaves the place filled in for it,
 * so its place, its goal, stays empty; nothing once another category was picked meanwhile.
 * - `way`: Whether the category is `Way`, which has the field `from`.
 * - `field`: The field to fill in, `From` of a way, else `Place`.
 * - `last`: Where I was last, as its entry wrote it, empty for none and for a box.
 * - `standard`: My default place, `undefined` for none.
 * - `line`: The place to fill in.
 *
 * @param category - Category picked
 * @throws {Error} - When the reader gives no valid answer
 */
async function lastPlaceFill(category: Category): Promise<void> {
    const way: boolean = category.fields.some((field: Field): boolean => field.key === "from");
    const field: Field | undefined = category.fields.find(
        (other: Field): boolean => other.key === (way ? "from" : "location"),
    );
    if (way && placeFilled !== "" && values.location === placeFilled) values.location = "";
    if (
        field === undefined ||
        opened.entry !== null ||
        opened.box !== null ||
        values[field.key] !== ""
    )
        return;
    const last: string = opened.target === "box" ? "" : await lastPlaceLoad();
    if (chosen !== category) return;
    const standard: Place | undefined = Object.values(field.places).find(
        (place: Place): boolean => place.standard,
    );
    const line: string = last !== "" ? last : standard === undefined ? "" : lineOf(standard);
    values[field.key] =
        field.values.find(
            (value: string): boolean => line !== "" && labelOf(value) === labelOf(line),
        ) ?? line;
    if (!way) placeFilled = values.location;
}

/**
 * Picks a category: shows its fields, keeping the places picked under the category before,
 * but not its summary with its link,
 * and an older value of a field that takes only its values as that field writes it,
 * see {@link fixedValueOf}.
 * A new entry starts where I was last, see {@link lastPlaceFill}.
 * `Food` in the log shows its summary, its meals and its foods in place of the summary,
 * with those of the meal being changed, see `meal.ts`, built before its fields show,
 * unless another category was picked meanwhile;
 * `Skill` shows its skill and type, then where it is, see {@link placesShow},
 * and below the times who I was with, its semester, chapters, documents and attempts,
 * see `skill.ts`, with the title skill and type give it while it has none,
 * its title shown to type below them while it is another, one I typed;
 * `Sport` in the log loads my workouts, exercises and videos,
 * with those of the session being changed, see `sport.ts`.
 * - `summary`: Pencil, link and parts of the summary of a skill entry, see {@link summaryPartsOf}.
 * - `changing`: Whether the dialog changes a meal, whose foods and what the meal starts with.
 * - `built`: The rows of the meal, its summary with its link, see {@link mealLinkPut}.
 *
 * @param category - Category to pick, or `null` for none yet
 * @throws {Error} - When the reader gives no valid answer
 */
async function categoryPick(category: Category | null): Promise<void> {
    values = chosen === null ? { ...opened.values } : { ...valuesRead(), title: "" };
    if (chosen !== null) summaryLink = "";
    summaryShown = null;
    chosen = category;
    (category?.fields ?? []).forEach((field: Field): void => {
        values[field.key] = fixedTextOf(field, values[field.key]);
    });
    meal = null;
    document.getElementById("entry-place")?.replaceChildren();
    document.getElementById("entry-more")?.replaceChildren();
    if (category !== null) await lastPlaceFill(category);
    if (category?.name === skillName) {
        const summary: HTMLElement[] = summaryPartsOf(undefined, false);
        await skillFieldsShow(
            document.getElementById("entry-fields") as HTMLElement,
            document.getElementById("entry-more") as HTMLElement,
            moreRowsOf(),
            opened.target === "box",
            opened.category === skillName ? opened.skill : skillNone,
            dayRead(),
            skillChanged,
            summary,
        );
        skillGiven = skillTitleOf();
        values.title = skillGiven;
        summary[2].hidden = !summaryOpen;
        placesShow();
        skillChanged();
        return;
    }
    if ((category?.name === foodName || category?.name === cookName) && opened.target === "log") {
        const changing: boolean = opened.category === category.name;
        const built: HTMLElement[] = await mealOf(
            changing ? opened.foods : [],
            changing ? opened.values.title : "",
            saveAllow,
            category.name === cookName
                ? null
                : {
                      cooked: changing ? String(opened.entry?.extendedProps.cooked ?? "") : "",
                      start: startRead(),
                      id: changing ? (opened.entry?.id ?? "") : "",
                  },
        );
        if (chosen !== category) return;
        meal = built;
        mealLinkPut(built[0]);
    }
    if (category?.name === sportName && opened.target === "log") {
        await sportOpen(
            opened.category === sportName ? (opened.entry?.extendedProps ?? null) : null,
        );
        if (chosen !== category) return;
    }
    fieldsShow();
}

/**
 * Shows the category of the dialog as its first row, one line like every field,
 * whose list offers the categories in the order the reader gives them.
 * While a log entry is changed, `Skill` stays apart:
 * a skill entry cannot become another category, nor another entry a skill entry,
 * because only `reader/skill.ts` writes the documents and attempts of a skill entry of the log;
 * a skill box is a plain box, which may change its category.
 * - `offered`: The categories the list offers.
 */
function categoryShow(): void {
    const offered: Category[] = categories.filter(
        (category: Category): boolean =>
            !(
                opened.target === "log" &&
                opened.entry !== null &&
                (category.name === skillName) !== (opened.category === skillName)
            ),
    );
    document.getElementById("entry-category")?.replaceChildren(
        rowOf(
            "Category",
            choicesOf({
                search: searchOf(
                    offered.map((category: Category): Choice => choiceOf(category.name)),
                ),
                picked: chosen === null ? [] : [chosen.name],
                many: false,
                adding: false,
                noun: "category",
                locked: asPlanned(),
                pick: (picked: string[]): void => {
                    categoryPick(
                        offered.find(
                            (category: Category): boolean => category.name === picked[0],
                        ) ?? null,
                    ).catch(errorShow);
                },
            }),
        ),
    );
}

/**
 * Reads what the entry was, its `SUMMARY`: the title of a skill entry, see {@link skillChanged},
 * a meal of the log with foods their names, see {@link mealTitle};
 * else what is picked, like `Night` of `Sleep`,
 * or the name of a category without the field `title`.
 *
 * @param picked - What is picked in its list, empty for none
 * @returns What the entry was
 */
function titleRead(picked: string): string {
    if (chosen?.name === skillName) return values.title;
    if (foodsListed()) return mealTitle();
    return chosen?.fields.some((field: Field): boolean => field.key === "title")
        ? picked
        : (chosen?.name ?? "");
}

/**
 * Reads the text fields of the dialog,
 * as an entry of the log and a box have them, a skill entry its place too,
 * like the room of a lecture imported into the plan, and its chapters and documents.
 * - `picked`: Values picked in the lists.
 * - `skill`: Skill and type of a skill entry, empty for any other entry.
 * - `links`: Chapters and documents of a skill entry, none for any other entry.
 *
 * @returns Category, what, place, what it did online with the channel, title and link typed,
 *   see {@link onlineRowOf}, where a way starts, who I was with,
 *   see {@link peopleRead}, module, type, semester, note, chapters and documents,
 *   as a box of the day the dialog opened with, without time, duration and deadline;
 *   the semester of a skill entry as picked, else of that day
 */
function textsRead(): BoxFields {
    const picked: { [key in FieldKey]: string } = valuesRead();
    const skill: ModuleType =
        chosen?.name === skillName ? skillModuleType() : { module: "", type: "" };
    const links: SkillLinks =
        chosen?.name === skillName ? skillLinksRead() : { chapters: [], documents: [] };
    return {
        category: chosen?.name ?? "",
        title: titleRead(picked.title),
        titleLink: summaryLink,
        location: picked.location,
        online: picked.online,
        onlineLink: picked.online === "" ? "" : onlineLink,
        onlineChannel: picked.online === "" ? "" : onlineChannel,
        onlineTitle: picked.online === "" ? "" : onlineTitle,
        from: picked.from,
        attendees: peopleRead(),
        module: skill.module,
        type: skill.type,
        semester: chosen?.name === skillName ? skillSemesterOf(dayOf(opened.start)) : "",
        note: (document.getElementById("entry-note") as HTMLTextAreaElement).value.trim(),
        day: dayOf(opened.start),
        time: null,
        minutes: null,
        deadline: "",
        ...links,
    };
}

/**
 * Gives the day of the entry as the fields of the dialog say:
 * the typed day of its start, for a box with a deadline the typed day of its deadline;
 * the day the dialog opened with while the typed day is no date.
 * - `deadlineDay`: Typed day of the deadline of a box, `null` for none and for an entry of the log.
 * - `typed`: The typed day, `null` when it is no date.
 *
 * @returns Day like `2026-10-13`
 */
function dayRead(): string {
    const deadlineDay: string | null =
        opened.target === "box"
            ? dateParse((document.getElementById("entry-deadline-day") as HTMLInputElement).value)
            : null;
    const typed: string | null =
        deadlineDay ??
        dateParse((document.getElementById("entry-start-day") as HTMLInputElement).value);
    return typed ?? dayOf(opened.start);
}

/**
 * Gives the end of the entry or the box as the fields of the dialog say:
 * its time on the typed day of the end,
 * like `07:30` on `13.10.2026`, on the day of the start should the typed day be no date.
 * - `day`: Typed day of the end, like `2026-10-13`.
 *
 * @param start - Start of the entry, see {@link startRead}
 * @returns End of the entry
 */
function endRead(start: Date): Date {
    const day: string =
        dateParse((document.getElementById("entry-end-day") as HTMLInputElement).value) ??
        dayOf(start);
    return dateOf(
        new Date(`${day}T12:00:00`),
        timeFieldRead(document.getElementById("entry-end") as HTMLInputElement),
    );
}

/**
 * Fills the day of the end as the day of the start and the times are typed,
 * until I type into it myself:
 * the day of the start, or the day after while the end time lies at or before the start time,
 * like a night of sleep, `12.10.2026 23:30` to `13.10.2026 07:30`;
 * nothing while one of them is no day or no time.
 * - `day`: Typed day of the start, like `2026-10-12`.
 * - `start`, `end`: Typed start and end time, like `23:30` and `07:30`.
 * - `next`: The day after the typed day.
 */
function endDayFill(): void {
    const day: string | null = dateParse(
        (document.getElementById("entry-start-day") as HTMLInputElement).value,
    );
    const start: string = timeFieldRead(document.getElementById("entry-start") as HTMLInputElement);
    const end: string = timeFieldRead(document.getElementById("entry-end") as HTMLInputElement);
    if (endDayTyped || day === null || start === "" || end === "") return;
    const next: Date = new Date(`${day}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const field: HTMLInputElement = document.getElementById("entry-end-day") as HTMLInputElement;
    field.value = weekdayDateTextOf(end <= start ? dayOf(next) : day);
    field.setCustomValidity("");
    endDayShow();
}

/**
 * Reads fields, note and times of the dialog for an entry of the log,
 * and the box a new log entry is logged from, also an occurrence of a series,
 * which is a box of its own, see `reader/boxes.ts`.
 * The start is a plain time on the typed day, the calendar date of the start,
 * see {@link startRead}, the end a plain time on its own typed day, see {@link endRead},
 * like a night of sleep: `12.10.2026`, `23:30` to `07:30` on `13.10.2026`.
 * What the fields show is exactly what is saved.
 * - `texts`: Text fields of the dialog.
 *
 * @returns Fields of the entry
 */
function fieldsRead(): EntryFields {
    const start: Date = startRead();
    const end: Date = endRead(start);
    const texts: BoxFields = textsRead();
    return {
        category: texts.category,
        title: texts.title,
        titleLink: texts.titleLink,
        location: texts.location,
        online: texts.online,
        onlineLink: texts.onlineLink,
        onlineChannel: texts.onlineChannel,
        onlineTitle: texts.onlineTitle,
        from: texts.from,
        attendees: texts.attendees,
        module: texts.module,
        type: texts.type,
        semester: chosen?.name === skillName ? skillSemesterOf(dayOf(start)) : "",
        note: texts.note,
        foods: [foodName, cookName].includes(chosen?.name ?? "") ? mealFoods() : [],
        cooked: chosen?.name === foodName ? mealCooked() : "",
        planned: opened.entry === null ? (opened.plan?.id ?? "") : "",
        pain: neckLongPicked() ? pain : "",
        ...(sportShown() ? sportRead() : { workout: "", exercises: [], videos: [] }),
        start: start,
        end: end,
    };
}

/**
 * Reads fields, note, start, end and deadline of the dialog for a box, as for an entry of the log:
 * its day is the day of its start, its expected time its start,
 * its expected duration the minutes from its start to its end,
 * so `19.10.2026 09:15` to `10:45` moves a box of 12 October at 14:00 to 19 October at 09:15
 * for 90 minutes, and the reader into the plan it belongs into;
 * a box whose times stay empty lies on its day without time and duration;
 * a box that lasts only so long,
 * see {@link lengthOnly}, lies on its day without time for its length,
 * like `08:00` for 480 minutes, none for an empty length or `00:00`;
 * with a deadline it lies on the day of its deadline, without expected time, start and end off,
 * keeping the duration it had; an empty deadline is none.
 * - `day`: Typed day of the start,
 *   like `2026-10-19`, the day the dialog opened with should it be no date.
 * - `startTime`, `endTime`: Typed times of start and end, empty for none.
 * - `length`: Typed length, like `08:00`, empty for none.
 * - `deadlineDay`: Typed day of the deadline, like `2026-10-23`, empty for none.
 * - `deadlineTime`: Typed time of the deadline, empty for none.
 * - `start`: Start of the box, `null` without start time and for a box that lasts only so long.
 * - `minutes`: Minutes of its length, else from its start to its end, `null` without both;
 *   with a deadline the ones it had.
 *
 * @returns Fields of the box
 */
function boxFieldsRead(): BoxFields {
    const day: string =
        dateParse((document.getElementById("entry-start-day") as HTMLInputElement).value) ??
        dayOf(opened.start);
    const startTime: string = timeFieldRead(
        document.getElementById("entry-start") as HTMLInputElement,
    );
    const endTime: string = timeFieldRead(document.getElementById("entry-end") as HTMLInputElement);
    const length: string = timeFieldRead(
        document.getElementById("entry-length") as HTMLInputElement,
    );
    const deadlineDay: string =
        dateParse((document.getElementById("entry-deadline-day") as HTMLInputElement).value) ?? "";
    const deadlineTime: string = timeFieldRead(
        document.getElementById("entry-deadline-time") as HTMLInputElement,
    );
    const start: Date | null =
        startTime === "" || lengthOnly ? null : dateOf(new Date(`${day}T12:00:00`), startTime);
    let minutes: number | null = lengthOnly
        ? length === "" || minutesOf(length) === 0
            ? null
            : minutesOf(length)
        : start === null || endTime === ""
          ? null
          : Math.round((endRead(start).getTime() - start.getTime()) / (60 * 1000));
    if (deadlineDay !== "") minutes = opened.minutes;
    return {
        ...textsRead(),
        semester:
            chosen?.name === skillName
                ? skillSemesterOf(deadlineDay === "" ? day : deadlineDay)
                : "",
        day: deadlineDay === "" ? day : deadlineDay,
        time: deadlineDay !== "" ? null : start,
        minutes: minutes,
        deadline:
            deadlineDay === "" || deadlineTime === ""
                ? deadlineDay
                : dateOf(new Date(`${deadlineDay}T12:00:00`), deadlineTime).toISOString(),
    };
}

/**
 * Shows a hint of the dialog, which stands below its rows, right above its buttons, see `day.html`,
 * and scrolls the dialog down to it, so a long one,
 * like a meal of many foods, shows it too instead of keeping it below its rows.
 * - `dialog`: The dialog.
 *
 * @param id - Identifier of the hint, like `entry-error`
 */
function hintShow(id: string): void {
    const dialog: HTMLDialogElement = document.getElementById("entry") as HTMLDialogElement;
    document.getElementById(id)?.removeAttribute("hidden");
    dialog.scrollTo({ top: dialog.scrollHeight });
}

/**
 * Shows the hint that the reader did not take what the dialog sent,
 * `Saving failed`, see {@link hintShow}.
 *
 * @param error - Error of the request
 */
function errorShow(error: unknown): void {
    console.error(error);
    hintShow("entry-error");
}

/**
 * Writes each place picked that I changed by its parts everywhere,
 * see {@link partsOf} and `renameSend` in `places.ts`:
 * the place of its old name, the label of the place picked in its field,
 * as I changed it, its row and every entry that names it;
 * nothing for a place I left as it is, nor for a field the category picked does not have.
 * Before the entry or the box is saved only checked,
 * so the dialog saves nothing the reader would refuse, and after it written,
 * so the entry or the box, saved with the place as it was, takes it with every other.
 * - `field`: Each field of a place of the category picked.
 * - `edit`: Its place as I changed it, `null` while I changed nothing.
 *
 * @param dry - Whether only to check, before saving
 * @throws {Error} - When the reader does not take a place, like one with an empty name
 */
async function placesRename(dry: boolean): Promise<void> {
    for (const field of (chosen?.fields ?? []).filter(placeIs)) {
        const edit: Place | null = edits[field.key];
        if (
            values[field.key] !== "" &&
            edit !== null &&
            JSON.stringify(edit) !== JSON.stringify(placeOriginOf(field))
        )
            await renameSend(labelOf(values[field.key]), edit, dry);
    }
}

/**
 * Sends the new or changed box to the reader, its fields, note, start, end and deadline,
 * see {@link boxFieldsRead}, writes a place and the people I changed by their parts everywhere,
 * see {@link placesRename} and `personsRename` in `../persons.ts`,
 * then closes the dialog, after which the list of boxes loads again, see `boxes.ts`.
 *
 * @throws {Error} - When the reader does not take the box
 */
async function boxSave(): Promise<void> {
    if (opened.box !== null) await boxChange(opened.box.id, boxFieldsRead());
    else await boxAdd(boxFieldsRead());
    await placesRename(false);
    await personsRename(personEdits, persons, false, pickedNames());
    (document.getElementById("entry") as HTMLDialogElement).close();
}

/**
 * Gives the names picked in `With`, so a person `Persons.md` does not hold yet gets its row there,
 * see `personsRename` in `../persons.ts`.
 *
 * @returns Names like `Marell, Susanne`
 */
function pickedNames(): string[] {
    return peopleRead().map((person: Attendee): string => person.name);
}

/**
 * Sends the new or changed entry to the reader, into the log, then closes the dialog;
 * a box goes into the plan, see {@link boxSave}.
 * A skill entry goes to the one writer of skill entries, see `skill.ts`.
 * A changed entry, a skill entry alike, goes with its fingerprint as the dialog opened it,
 * and the reader writes it only while its file still holds it so,
 * see `entryChange` in `entries.ts` and `skillSave` in `skill.ts`: the first save wins.
 * When the file changed it since,
 * like Eier renamed on the phone while the dialog on the laptop showed Eier,
 * nothing is saved and the dialog stays open,
 * saying `Not saved: it changed on the disk, close and open it again`, see {@link hintShow};
 * opened again, it shows the entry as the file holds it, to change and save once more.
 * A place and the people I changed by their parts are checked before anything is saved,
 * and written everywhere once the entry or the box is,
 * see {@link placesRename} and `personsRename` in `../persons.ts`.
 * - `fields`: Fields, note and times of the dialog.
 * - `version`: Fingerprint of the entry being changed as the dialog opened it,
 *   see `version` of `Entry` in `reader/calendar.ts`; empty for a new one.
 * - `saved`: Whether the reader wrote it,
 *   `false` when the file changed the entry since the dialog opened it.
 *
 * @param calendar - Calendar of the day
 * @throws {Error} - When the reader does not take the entry or a place or person I changed
 */
async function entrySave(calendar: Calendar): Promise<void> {
    await placesRename(true);
    await personsRename(personEdits, persons, true, pickedNames());
    if (opened.target === "box") {
        await boxSave();
        return;
    }
    const fields: EntryFields = fieldsRead();
    const version: string = opened.entry?.extendedProps.version ?? "";
    let saved: boolean = true;
    if (chosen?.name === skillName)
        saved = await skillSave(calendar, opened.entry?.id ?? "", fields, version);
    else if (opened.entry !== null)
        saved = await entryChange(calendar, opened.entry.id, fields, version);
    else await entryAdd(calendar, fields);
    if (saved) {
        await placesRename(false);
        await personsRename(personEdits, persons, false, pickedNames());
        (document.getElementById("entry") as HTMLDialogElement).close();
    } else hintShow("entry-changed");
}

/**
 * Removes the entry of the log
 * or the box being changed on the second click, then closes the dialog;
 * the first click only asks, the bin turning into a question mark, `Really remove?` as its tooltip.
 * A box planned by mistake is removed;
 * a box of a series that day alone, the series staying, see `boxDelete` in `reader/boxes.ts`;
 * a box I decided against is dropped instead, with its cross in the list, so it can be counted.
 *
 * @param calendar - Calendar of the day
 * @throws {Error} - When the reader does not remove the entry or the box
 */
async function entryRemove(calendar: Calendar): Promise<void> {
    const button: HTMLButtonElement = document.getElementById("entry-remove") as HTMLButtonElement;
    if (!removeAsked) {
        removeAsked = true;
        iconPut(button, QuestionMark, "Really remove?");
        return;
    }

    if (opened.target === "box") await boxDelete(opened.box?.id ?? "");
    else await entryDelete(calendar, opened.entry?.id ?? "");
    (document.getElementById("entry") as HTMLDialogElement).close();
}

/**
 * Turns start and end of a box off while the day of a deadline is typed,
 * its length and the switch to it too, see {@link lengthShow},
 * since a box with a deadline lies on the day of its deadline and has no expected time,
 * so `23.10.2026` typed as deadline leaves them unread;
 * and asks for the day of a deadline while its time is typed, since a time alone is no deadline.
 * - `deadlineDay`, `deadlineTime`: Fields of the day and the time of the deadline.
 * - `off`: Whether start and end are off.
 */
function deadlineSee(): void {
    const deadlineDay: HTMLInputElement = document.getElementById(
        "entry-deadline-day",
    ) as HTMLInputElement;
    const deadlineTime: HTMLInputElement = document.getElementById(
        "entry-deadline-time",
    ) as HTMLInputElement;
    const off: boolean = opened.target === "box" && deadlineDay.value.trim() !== "";
    ["entry-start-day", "entry-start", "entry-end-day", "entry-end", "entry-length"].forEach(
        (id: string): void => {
            (document.getElementById(id) as HTMLInputElement).disabled = off;
        },
    );
    document
        .querySelectorAll<HTMLButtonElement>("#entry-swap button")
        .forEach((swap: HTMLButtonElement): void => {
            swap.disabled = off;
        });
    deadlineDay.required = deadlineTime.value.trim() !== "";
}

/**
 * Shows the times of the dialog, the same for an entry of the log and a box of the plan:
 * the day and the time of the start and of the end,
 * and for a box its deadline, hidden and disabled for an entry of the log,
 * so the browser checks only the times shown before it sends the form.
 * The day of the start is the calendar date of the start it opens with,
 * like `13.10.2026` for a selection at 01:45 on 13 October,
 * the day of its end the calendar date of the end it opens with,
 * which fills itself again as I type, see {@link endDayFill}.
 * A box starts at its expected time, on the day the dialog opened with,
 * like `12.10.2026`, the shown day for a new one, and ends after its expected duration;
 * its times may stay empty, but for an event of the plan, which keeps both and has no deadline,
 * since only a to-do has one;
 * a box without time but with a duration and without deadline,
 * like my sleep, shows only its day and its length, see {@link lengthShow}.
 * - `boxed`: Whether the dialog writes a box.
 * - `required`: Whether the times are needed: for an entry of the log and an event of the plan.
 * - `start`: Start shown, the expected time of a box, `null` for none.
 * - `end`: End shown, after the expected duration of a box, `null` for none.
 * - `deadline`: Deadline of the box being changed, empty for none and for a new box.
 *
 * @param opening - What the dialog shows
 */
function timesShow(opening: EntryOpening): void {
    const boxed: boolean = opening.target === "box";
    const required: boolean = !boxed || (opening.box !== null && !opening.box.todo);
    const start: Date | null = boxed ? opening.time : opening.start;
    const end: Date | null = !boxed
        ? opening.end
        : opening.time === null || opening.minutes === null
          ? null
          : new Date(opening.time.getTime() + opening.minutes * 60 * 1000);
    const startDay: HTMLInputElement = document.getElementById(
        "entry-start-day",
    ) as HTMLInputElement;
    const endDay: HTMLInputElement = document.getElementById("entry-end-day") as HTMLInputElement;
    const startTime: HTMLInputElement = document.getElementById("entry-start") as HTMLInputElement;
    const endTime: HTMLInputElement = document.getElementById("entry-end") as HTMLInputElement;
    const deadlineRow: HTMLElement = document.getElementById("entry-deadline") as HTMLElement;
    const deadlineDay: HTMLInputElement = document.getElementById(
        "entry-deadline-day",
    ) as HTMLInputElement;
    const deadline: string = opening.box?.deadline ?? "";
    startDay.value = weekdayDateTextOf(dayOf(opening.start));
    startDay.setCustomValidity("");
    endDay.value = weekdayDateTextOf(dayOf(end ?? opening.start));
    endDay.setCustomValidity("");
    endDayTyped = false;
    timeFieldShow(startTime, start);
    timeFieldShow(endTime, end);
    startTime.required = required;
    endTime.required = required;
    lengthOnly =
        boxed && !required && start === null && opening.minutes !== null && deadline === "";
    (document.getElementById("entry-length") as HTMLInputElement).value =
        lengthOnly && opening.minutes !== null ? lengthTextOf(opening.minutes) : "";
    lengthShow();
    deadlineRow.hidden = required;
    deadlineRow.querySelectorAll("input").forEach((field: HTMLInputElement): void => {
        field.disabled = required;
    });
    deadlineDay.value = deadline === "" ? "" : weekdayDateTextOf(opening.box?.day ?? "");
    deadlineDay.setCustomValidity("");
    timeFieldShow(
        document.getElementById("entry-deadline-time") as HTMLInputElement,
        deadline === "" || deadline === opening.box?.day ? null : new Date(deadline),
    );
    deadlineSee();
    endDayShow();
}

/**
 * Hides the day of the end while it is the day of the start, so the row of the times reads
 * `24.10.2026 (Sat) 10:00 – 12:00`, and shows it once the end lies on another day,
 * like a night of sleep from `23:30` to `07:30`, see `.entry-same-day` in `day.css`;
 * a field being typed in stays.
 * - `start`, `end`: The fields of the day of the start and of the end.
 */
function endDayShow(): void {
    const start: HTMLInputElement = document.getElementById("entry-start-day") as HTMLInputElement;
    const end: HTMLInputElement = document.getElementById("entry-end-day") as HTMLInputElement;
    end.classList.toggle(
        "entry-same-day",
        end !== document.activeElement &&
            dateParse(end.value) !== null &&
            dateParse(end.value) === dateParse(start.value),
    );
}

/**
 * Shows the time of the dialog as {@link lengthOnly} says, see `day.html`: from and to,
 * or the day and how long the box lasts, like `08:00` for my sleep;
 * right beside the name `Time` of a box of the plan whose times may stay empty,
 * not an event imported, which keeps both, nor an entry of the log, the switch between them,
 * see `lengthSwapOf` in `times.ts`,
 * as in the dialog of a series: to a length it keeps how long the times typed last,
 * like `01:30` of `14:00 – 15:30`, and empties them; to times it empties the length;
 * the field shown then focused.
 * - `length`: The field of the length.
 * - `start`, `end`: The fields of the times of start and end.
 * - `swappable`: Whether the switch shows.
 * - `minutes`: How long the times typed last, 0 for no times.
 */
function lengthShow(): void {
    const length: HTMLInputElement = document.getElementById("entry-length") as HTMLInputElement;
    const start: HTMLInputElement = document.getElementById("entry-start") as HTMLInputElement;
    const end: HTMLInputElement = document.getElementById("entry-end") as HTMLInputElement;
    const swappable: boolean = opened.target === "box" && !start.required;
    document.getElementById("entry-times")?.classList.toggle("entry-length-only", lengthOnly);
    document.getElementById("entry-swap")?.replaceChildren(
        ...(!swappable
            ? []
            : [
                  lengthSwapOf(!lengthOnly, (): void => {
                      const minutes: number =
                          timeFieldRead(start) === "" || timeFieldRead(end) === ""
                              ? 0
                              : Math.round(
                                    (endRead(startRead()).getTime() - startRead().getTime()) /
                                        (60 * 1000),
                                );
                      length.value = !lengthOnly && minutes > 0 ? lengthTextOf(minutes) : "";
                      if (!lengthOnly) {
                          timeFieldShow(start, null);
                          timeFieldShow(end, null);
                      }
                      lengthOnly = !lengthOnly;
                      lengthShow();
                      (lengthOnly ? length : start).focus();
                  }),
              ]),
    );
}

/**
 * Shows the series of the box, see the top of this file:
 * after the times of a box of a series the series icon ⟳,
 * the same as the new series beside `Plan +`, see `boxes.ts`,
 * since the pencil always changes one property and ⟳ always means the series,
 * as far from the times as the pencil from a summary;
 * for a box of a series of my course, see `seriesHas` in `series.ts`, after it its group while it
 * has one, like `05`, where it may still go to another group
 * as the menu of the groups for this one date, `05 ⌄`,
 * see `boxGroupOf` in `groups.ts`, a pick closing the dialog,
 * see {@link groupPick}, ⟳ opening that series, see {@link seriesFromBox};
 * for a box of a plain series, one to-do that repeats,
 * like my sleep of every night, ⟳ opening that series whole, see `plainOpen` in `series.ts`;
 * saving the series closes this dialog too;
 * nothing for a new box, a box alone or an entry of the log.
 * - `of`: Where ⟳ and the group stand, after the times.
 * - `box`: The box being changed, `null` for a new box and for an entry of the log.
 * - `pencil`: The series icon ⟳, which takes no focus, so a field of the times I leave by it,
 *   like a day written out with its weekday then,
 *   never moves it away from under the pointer before the click.
 * - `course`: The course of a box of a group that may go to another group,
 *   see `pickable` in `groups.ts`,
 *   which offers the groups of its week,
 *   `null` for any other box and when the reader cannot give it,
 *   which shows its group without menu.
 * - `group`: Its group, `null` for none.
 *
 * @throws {Error} - When the reader gives no valid answer
 */
async function seriesShow(): Promise<void> {
    const of: HTMLElement = document.getElementById("entry-of-series") as HTMLElement;
    const box: Box | null = opened.target === "box" ? opened.box : null;
    const pencil: HTMLButtonElement = document.createElement("button");
    pencil.type = "button";
    pencil.className = "entry-pencil";
    iconPut(pencil, Repeat, "Change the series");
    pencil.addEventListener("mousedown", (event: MouseEvent): void => event.preventDefault());
    of.replaceChildren();
    of.hidden = box === null || (!box.series && !seriesHas(box));
    if (box !== null && seriesHas(box)) {
        pencil.addEventListener("click", (): void =>
            seriesFromBox(box.module, box.type, box.semester || semesterOf(box.day)),
        );
        const course: Course | null =
            box.group === "" || !pickable(box)
                ? null
                : await readerAsk<Course>(
                      `/api/course/module?module=${encodeURIComponent(box.module)}` +
                          `&semester=${box.semester || semesterOf(box.day)}`,
                  ).catch((error: unknown): null => {
                      console.error(error);
                      return null;
                  });
        const group: HTMLElement | null =
            box.group === "" ? null : boxGroupOf(course, box, groupPick);
        of.append(pencil, ...(group === null ? [] : [group]));
    } else if (box !== null && box.series) {
        pencil.addEventListener("click", (): void => {
            plainOpen(box.id.split("#")[0], entryClose).catch((error: unknown): void =>
                console.error(error),
            );
        });
        of.append(pencil);
    }
}

/**
 * Closes the dialog without saving it, as once the dialog of a series opened over it saved,
 * see {@link seriesFromBox} and {@link seriesShow}.
 */
function entryClose(): void {
    (document.getElementById("entry") as HTMLDialogElement).close();
}

/**
 * Picks a group for the box of the dialog,
 * from the menu of the groups after its times, see {@link seriesShow}:
 * closes the dialog without saving, since the box moves to the session of that group,
 * and sends the pick, see `PickShow` in `groups.ts`;
 * the plan and the page of the module load anew as their files change.
 *
 * @param change - Changes the box as the pick does,
 *   which the dialog leaves to the page loading anew
 * @param send - Sends the pick
 */
function groupPick(change: () => void, send: () => Promise<unknown>): void {
    entryClose();
    send().catch((error: unknown): void => console.error(error));
}

/**
 * Opens the series of a box over the dialog,
 * see `seriesOpen` in `series.ts`,
 * from the series icon ⟳ after the times of a box of a series of my course,
 * see {@link seriesShow}: closed, it leaves
 * this dialog as it was, one level back;
 * saved, this dialog closes too, see {@link entryClose}, since its box changed with its series.
 *
 * @param module - Code of the module, like `IN2028`
 * @param type - Type of the series, like `VO`
 * @param semester - Its semester, like `2026W`
 */
function seriesFromBox(module: string, type: string, semester: string): void {
    seriesOpen(module, type, semester, entryClose).catch((error: unknown): void =>
        console.error(error),
    );
}

/**
 * Shows the dialog as an opening says,
 * a new one without category with the list of the categories open.
 * It has no title: below its fields, small and grey, the box a log entry comes from,
 * with a pencil beside it to change that box instead, when it can be changed;
 * at the bottom its file at the left,
 * see {@link entryFileShow}, the copy, the bin, cancel and save at the right, see `day.html`.
 * The first button, which the dialog focuses as it opens, loses the focus again,
 * so its ring never looks like a pick.
 * - `dialog`: The dialog, open already when one of those two buttons opens it anew.
 * - {@link HTMLDialogElement#showModal}: Shows the dialog over the page, `Esc` closes it.
 *
 * @param opening - What the dialog shows
 * @throws {Error} - When the reader gives no valid answer
 */
async function entryShow(opening: EntryOpening): Promise<void> {
    const dialog: HTMLDialogElement = document.getElementById("entry") as HTMLDialogElement;
    categories = structuredClone(await categoriesKept());
    persons = await personsKept();
    opened = opening;
    onlineLink = opening.onlineLink;
    onlineChannel = opening.onlineChannel;
    onlineTitle = opening.onlineTitle;
    onlineOpen = false;
    summaryLink = opening.titleLink;
    summaryOpen = false;
    partsOpen = null;
    edits = { title: null, from: null, location: null, online: null, with: null };
    addresses = { ...opening.addresses };
    withOpen = [];
    personEdits = {};
    addedLine = "";
    placeFilled = "";
    chosen = null;
    realSeen = "";
    realMiddle = null;
    removeAsked = false;
    pain = String(opening.entry?.extendedProps.pain ?? "");

    (document.getElementById("entry-plan-title") as HTMLElement).textContent =
        opening.plan === null ? "" : `From the plan: ${opening.plan.title}`;
    document
        .getElementById("entry-plan")
        ?.toggleAttribute("hidden", opening.target === "box" || opening.plan === null);
    document
        .getElementById("entry-plan-edit")
        ?.toggleAttribute("hidden", opening.plan?.editable !== true);
    timesShow(opening);
    await seriesShow();
    (document.getElementById("entry-note") as HTMLTextAreaElement).value = opening.note;
    iconPut(document.getElementById("entry-remove") as HTMLElement, Trash, "Remove");
    document
        .getElementById("entry-remove")
        ?.toggleAttribute(
            "hidden",
            opening.entry === null && (opening.box === null || opening.box.state === "done"),
        );
    document
        .getElementById("entry-duplicate")
        ?.toggleAttribute("hidden", opening.entry === null && opening.box === null);
    document.getElementById("entry-error")?.setAttribute("hidden", "");
    document.getElementById("entry-changed")?.setAttribute("hidden", "");
    await categoryPick(
        categories.find((category: Category): boolean => category.name === opening.category) ??
            null,
    );
    categoryShow();
    if (!dialog.open) dialog.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
    if (chosen === null)
        document.querySelector<HTMLButtonElement>("#entry-category .picker-line")?.click();
}

/**
 * Gives the box the dialog shows,
 * so the dialog of a series that opens another box in it can show this one again once it closes,
 * see `boxShow` in `series.ts`.
 *
 * @returns The box, `null` while the dialog is closed or shows a new box or an entry of the log
 */
export function entryBoxOf(): Box | null {
    return (document.getElementById("entry") as HTMLDialogElement).open ? opened.box : null;
}

/**
 * Gives the names of who I was with as the values of `With` keep them,
 * parted by `; `, see {@link withParting}.
 *
 * @param people - The people of an entry or a box
 * @returns Names, like `Bichler, Martin; Willi`, empty for nobody
 */
function namesOf(people: Attendee[]): string {
    return people.map((person: Attendee): string => person.name).join(withParting);
}

/**
 * Gives the address of each person of an entry or a box by name,
 * as it wrote them, see {@link addresses}.
 *
 * @param people - The people of an entry or a box
 * @returns Address by name, like `sophale@invalid` for `Sophale`
 */
function addressesOf(people: Attendee[]): { [name: string]: string } {
    return Object.fromEntries(
        people.map((person: Attendee): [string, string] => [person.name, person.address]),
    );
}

/**
 * Opens the dialog for a new entry of the log with start and end,
 * its day the calendar date of the start, like `13.10.2026` for a selection at 01:45 on 13 October.
 *
 * @param start - Start of the new entry
 * @param end - End of the new entry
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpen(start: Date, end: Date): Promise<void> {
    await entryShow({
        target: "log",
        start: start,
        end: end,
        time: null,
        minutes: null,
        category: null,
        values: { title: "", from: "", location: "", online: "", with: "" },
        addresses: {},
        titleLink: "",
        locationLink: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        note: "",
        foods: [],
        skill: skillNone,
        plan: null,
        entry: null,
        box: null,
    });
}

/**
 * Opens the dialog for a new log entry of the last half hour before the time of now
 * on the shown day, in quarter hours, so on today's page the half hour before now:
 * at 14:10 on 13.10.2026 from 13:30 to 14:00, its day the shown day;
 * only before 00:30 the half hour starts the evening before, so its day is the day before,
 * like `13.10.2026`, `23:45` to `00:15` at 00:20 on 14 October.
 * - `end`: The time of now on the shown day, in quarter hours.
 *
 * @param calendar - Calendar of the day
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenNow(calendar: Calendar): Promise<void> {
    const end: Date = dateOf(calendar.view.currentStart, timeOf(new Date()));
    end.setMinutes(end.getMinutes() - (end.getMinutes() % 15), 0, 0);
    await entryOpen(new Date(end.getTime() - 30 * 60 * 1000), end);
}

/**
 * Opens the dialog for a new skill entry of the log with start and end,
 * `Skill` and its module picked, the rest as for any new entry,
 * like the place where I was last:
 * the session the learning view asks for before it records, see `../editor/session.ts`.
 *
 * @param module - Its module, like `IN2028`
 * @param start - Start of the new entry
 * @param end - End of the new entry
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenSkill(module: string, start: Date, end: Date): Promise<void> {
    await entryShow({
        target: "log",
        start: start,
        end: end,
        time: null,
        minutes: null,
        category: skillName,
        values: { title: "", from: "", location: "", online: "", with: "" },
        addresses: {},
        titleLink: "",
        locationLink: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        note: "",
        foods: [],
        skill: { ...skillNone, module: module },
        plan: null,
        entry: null,
        box: null,
    });
}

/**
 * Opens the dialog to log a box at a start and an end, like those of its drop into the log;
 * a box with a category comes with its category and fields picked as planned, its people too,
 * a skill box with its skill, type, semester, chapters and documents,
 * see `skill.ts`, ready to save or to change, like a lecture with its chapters and slides;
 * a box without category, like a to-do another app wrote, without them.
 * - `planned`: Whether the box has a category.
 *
 * @param box - Box to log
 * @param start - Start of the log entry
 * @param end - End of the log entry
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenFromBox(box: Box, start: Date, end: Date): Promise<void> {
    const planned: boolean = box.category !== "";
    await entryShow({
        target: "log",
        start: start,
        end: end,
        time: null,
        minutes: null,
        category: planned ? box.category : null,
        values: planned
            ? {
                  title: box.title,
                  from: box.from,
                  location: box.location,
                  online: box.online,
                  with: namesOf(box.attendees),
              }
            : { title: "", from: "", location: "", online: "", with: "" },
        addresses: planned ? addressesOf(box.attendees) : {},
        titleLink: planned ? box.titleLink : "",
        locationLink: planned ? box.locationLink : "",
        onlineLink: planned ? box.onlineLink : "",
        onlineChannel: planned ? box.onlineChannel : "",
        onlineTitle: planned ? box.onlineTitle : "",
        note: "",
        foods: [],
        skill: {
            ...skillNone,
            module: box.module,
            type: box.type,
            semester: box.semester,
            chapters: box.chapters,
            links: box.links,
        },
        plan: box,
        entry: null,
        box: null,
    });
}

/**
 * Opens the dialog for a new box of a day, without category, time or duration.
 *
 * @param day - A date on the day of the box
 * @throws {Error} - When the reader gives no valid answer
 */
export async function boxOpenNew(day: Date): Promise<void> {
    await entryShow({
        target: "box",
        start: day,
        end: day,
        time: null,
        minutes: null,
        category: null,
        values: { title: "", from: "", location: "", online: "", with: "" },
        addresses: {},
        titleLink: "",
        locationLink: "",
        onlineLink: "",
        onlineChannel: "",
        onlineTitle: "",
        note: "",
        foods: [],
        skill: skillNone,
        plan: null,
        entry: null,
        box: null,
    });
}

/**
 * Opens the dialog to change a box of the new system, its fields picked,
 * a skill box with its skill, type, chapters and documents,
 * its start and end typed as far as it has them.
 * - `day`: A date on its day, at its expected time when it has one.
 *
 * @param box - Box to change
 * @throws {Error} - When the reader gives no valid answer
 */
export async function boxOpenEdit(box: Box): Promise<void> {
    const day: Date = box.time === "" ? new Date(`${box.day}T12:00:00`) : new Date(box.time);
    await entryShow({
        target: "box",
        start: day,
        end: day,
        time: box.time === "" ? null : day,
        minutes: box.minutes,
        category: box.category === "" ? null : box.category,
        values: {
            title: box.title,
            from: box.from,
            location: box.location,
            online: box.online,
            with: namesOf(box.attendees),
        },
        addresses: addressesOf(box.attendees),
        titleLink: box.titleLink,
        locationLink: box.locationLink,
        onlineLink: box.onlineLink,
        onlineChannel: box.onlineChannel,
        onlineTitle: box.onlineTitle,
        note: box.note,
        foods: [],
        skill: {
            ...skillNone,
            module: box.module,
            type: box.type,
            semester: box.semester,
            chapters: box.chapters,
            links: box.links,
        },
        plan: null,
        entry: null,
        box: box,
    });
}

/**
 * Opens the dialog to change an entry of the log of the new system, its fields picked,
 * a meal with its foods, a skill entry with its skill, type, chapters, links, attempts, rounds.
 * - `props`: Fields of the entry as the reader gave them.
 * - `people`: Who I was with, as the reader gave them.
 *
 * @param entry - Entry to change
 * @throws {Error} - When the reader gives no valid answer
 */
export async function entryOpenEdit(entry: EventApi): Promise<void> {
    const props: { [field: string]: string } = entry.extendedProps;
    const people: Attendee[] = entry.extendedProps.attendees ?? [];
    await entryShow({
        target: "log",
        start: entry.start as Date,
        end: entry.end as Date,
        time: null,
        minutes: null,
        category: props.category ?? null,
        values: {
            title: entry.title,
            from: props.from ?? "",
            location: props.location ?? "",
            online: props.online ?? "",
            with: namesOf(people),
        },
        addresses: addressesOf(people),
        titleLink: props.titleLink ?? "",
        locationLink: props.locationLink ?? "",
        onlineLink: props.onlineLink ?? "",
        onlineChannel: props.onlineChannel ?? "",
        onlineTitle: props.onlineTitle ?? "",
        note: props.note ?? "",
        foods: entry.extendedProps.foods ?? [],
        skill: {
            module: props.module ?? "",
            type: props.type ?? "",
            semester: props.semester ?? "",
            title: entry.title,
            titleLink: props.titleLink ?? "",
            chapters: entry.extendedProps.chapters ?? [],
            links: entry.extendedProps.links ?? [],
            rounds: entry.extendedProps.rounds ?? [],
        },
        plan: null,
        entry: entry,
        box: null,
    });
}

/**
 * Opens the dialog anew for a copy of the entry of the log or the box it shows, as it was saved:
 * a new entry or a new box with the same category, fields, note, times and foods,
 * a skill one with its skill, type, semester, chapters and documents,
 * but without its attempts, rounds, the box it was logged from, its deadline,
 * so I change what differs,
 * like its day, and save it as one more; the entry or the box itself stays as it is.
 * A copy of a box is always a to-do, also that of a lecture imported from TUMonline.
 */
async function entryDuplicate(): Promise<void> {
    await entryShow({
        ...opened,
        skill: { ...opened.skill, title: "", titleLink: "", rounds: [] },
        plan: null,
        entry: null,
        box: null,
    });
}

/**
 * Checks the times before the dialog sends them, saying what is wrong at its field:
 * the end lies after the start, for an entry of the log and for a box with both times,
 * and a box with the time of its end has the time of its start;
 * a box with a deadline has no times to check, its start and end being off,
 * see {@link deadlineSee}, and neither has a box that lasts only so long, see {@link lengthOnly}.
 * - `startTime`, `endTime`: Fields of the times of start and end.
 * - `field`: The field that is wrong, `null` for none.
 *
 * @returns Whether the times are right
 */
function timesCheck(): boolean {
    const startTime: HTMLInputElement = document.getElementById("entry-start") as HTMLInputElement;
    const endTime: HTMLInputElement = document.getElementById("entry-end") as HTMLInputElement;
    let field: HTMLInputElement | null = null;
    if (startTime.matches(":disabled") || lengthOnly) return true;
    if (timeFieldRead(startTime) === "" && timeFieldRead(endTime) !== "") {
        field = startTime;
        field.setCustomValidity("A start before the end");
    } else if (
        timeFieldRead(startTime) !== "" &&
        timeFieldRead(endTime) !== "" &&
        endRead(startRead()) <= startRead()
    ) {
        field = document.getElementById("entry-end-day") as HTMLInputElement;
        field.setCustomValidity("The end lies after the start");
    }
    timesMarked = field;
    field?.reportValidity();
    return field === null;
}

/**
 * Takes the mark of {@link timesCheck} back once I type into a field of the times,
 * see {@link timesMarked}: the field marked is valid again, its text a time or a day,
 * since the dialog was sent with it;
 * typed into itself, its own check of its text marks it anew, see `timesStart` in `times.ts`.
 *
 * @param event - Input into a field of the times
 */
function timesUnmark(event: Event): void {
    if (timesMarked !== null && timesMarked !== event.target) timesMarked.setCustomValidity("");
    timesMarked = null;
}

/**
 * Takes Enter in the dialog,
 * see the top of this file, for an entry of the log and a box of the plan alike:
 * Ctrl+Enter from any field saves it,
 * as its check does, before the field sees the key, the field left first,
 * as a click on the check leaves it, so it takes what I typed,
 * like the sets of an exercise or `2x` as the grams of a food,
 * which a field takes once I leave it; Enter in a field without
 * its own use of it, like a time, a day, a part of a place or an address of `With`,
 * only confirms that field, what I typed staying and the cursor leaving it,
 * instead of sending the form;
 * a field that uses Enter keeps it,
 * like a list taking its first match or a field of a food saving that food,
 * and the note keeps it as a new line.
 * Ctrl+S saves it alike, from anywhere in the open dialog, also with no field focused,
 * in place of the browser saving the page; with another dialog over it, like that of a new place,
 * it leaves the key to that one.
 * - `form`: The form of the dialog.
 * - `dialog`: The dialog.
 */
function enterTake(): void {
    const form: HTMLFormElement = document.getElementById("entry-form") as HTMLFormElement;
    const dialog: HTMLDialogElement = document.getElementById("entry") as HTMLDialogElement;
    document.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
            const target: Node = event.target as Node;
            if (!dialog.open || (target !== document.body && !dialog.contains(target))) return;
            event.preventDefault();
            event.stopPropagation();
            (document.activeElement as HTMLElement | null)?.blur();
            form.requestSubmit();
        },
        true,
    );
    form.addEventListener(
        "keydown",
        (event: KeyboardEvent): void => {
            if (event.key !== "Enter" || !event.ctrlKey) return;
            event.preventDefault();
            event.stopPropagation();
            (document.activeElement as HTMLElement | null)?.blur();
            form.requestSubmit();
        },
        true,
    );
    form.addEventListener("keydown", (event: KeyboardEvent): void => {
        if (
            event.key !== "Enter" ||
            event.defaultPrevented ||
            !(event.target instanceof HTMLInputElement)
        )
            return;
        event.preventDefault();
        event.target.blur();
    });
}

/**
 * Gives the calendar of the day the dialog writes with, see {@link dayCalendar}.
 *
 * @returns The calendar, `null` before the dialog started
 */
export function dayCalendarOf(): Calendar | null {
    return dayCalendar;
}

/**
 * Starts the entry by category after the router has put its HTML into the page:
 * the copy duplicates the entry or the box being changed,
 * see {@link entryDuplicate}, the pencil beside the box being logged changes that box;
 * the dialog logs no box, since the menu of the box in the plan does that already;
 * typing a deadline turns start and end of a box off, see {@link deadlineSee};
 * typing the day, start or end fills the day of the end, see {@link endDayFill},
 * until I type that day myself, and a start typed for a new box its end, see {@link endFill};
 * typing a day of a skill entry gives it the semester of that day while I picked none,
 * see `skillDaySet` in `skill.ts`; times that are not right are not sent, see {@link timesCheck};
 * Enter confirms only its field, see {@link enterTake};
 * the dialog of a new place starts too, see `places.ts`.
 * - `endDay`: Field of the day of the end.
 *
 * @param calendar - Calendar of the day
 */
export function categoriesStart(calendar: Calendar): void {
    dayCalendar = calendar;
    listsStart();
    iconPut(document.getElementById("entry-cancel") as HTMLElement, X, "Cancel");
    iconPut(document.getElementById("entry-save") as HTMLElement, Check, "Save");
    document
        .getElementById("entry-cancel")
        ?.addEventListener("click", (): void =>
            (document.getElementById("entry") as HTMLDialogElement).close(),
        );
    document.getElementById("entry-remove")?.addEventListener("click", (): void => {
        entryRemove(calendar).catch(errorShow);
    });
    iconPut(document.getElementById("entry-duplicate") as HTMLElement, Copy, "Duplicate");
    document.getElementById("entry-duplicate")?.addEventListener("click", (): void => {
        entryDuplicate().catch(errorShow);
    });
    iconPut(
        document.getElementById("entry-plan-edit") as HTMLElement,
        Pencil,
        "Change the box in the plan",
    );
    document.getElementById("entry-plan-edit")?.addEventListener("click", (): void => {
        if (opened.plan !== null) boxOpenEdit(opened.plan).catch(errorShow);
    });
    ["entry-deadline-day", "entry-deadline-time"].forEach((id: string): void => {
        document.getElementById(id)?.addEventListener("input", deadlineSee);
    });
    ["entry-start-day", "entry-start", "entry-end"].forEach((id: string): void =>
        document.getElementById(id)?.addEventListener("input", endDayFill),
    );
    ["entry-start-day", "entry-end-day"].forEach((id: string): void =>
        document.getElementById(id)?.addEventListener("change", endDayShow),
    );
    ["entry-start-day", "entry-start", "entry-end-day", "entry-end"].forEach((id: string): void =>
        document.getElementById(id)?.addEventListener("input", timesUnmark),
    );
    document.getElementById("entry-start")?.addEventListener("change", endFill);
    ["entry-start-day", "entry-deadline-day"].forEach((id: string): void =>
        document.getElementById(id)?.addEventListener("input", (): void => {
            if (chosen?.name === skillName) skillDaySet(dayRead());
            entryFileShow();
        }),
    );
    const endDay: HTMLInputElement = document.getElementById("entry-end-day") as HTMLInputElement;
    endDay.addEventListener("input", (): void => {
        endDayTyped = true;
    });
    enterTake();
    document
        .getElementById("entry-form")
        ?.addEventListener("submit", (event: SubmitEvent): void => {
            event.preventDefault();
            if (timesCheck()) entrySave(calendar).catch(errorShow);
        });
}
