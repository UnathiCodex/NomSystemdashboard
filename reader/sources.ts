/**
 * ## Sources
 *
 * Names every folder and file the reader reads,
 * and every address on the web it asks, grouped by area.
 * My new system is every folder in `NomManageplannings`, also one I add later,
 * but my old system, `NomSystemprevious`, which lies beside them and is never read.
 * The reader reads only the new system, my modules, see {@link notes},
 * and the files the skill entries link, in my modules and my projects,
 * see {@link activeProjects} and `./documents.ts`, and nothing that is not listed here.
 * Every file at its own place, none from a copy elsewhere, like a draft in `.claude`.
 * It writes only into the new system
 * and, on the server that holds it, into what the dashboards share in `NomKommunikation`,
 * see {@link writeAllowed}, the editor into the notes of my modules
 * and the file of my corrections, see {@link editor},
 * and a click on a folder of a module not there yet makes it,
 * see `folderMake` in `./notes.ts`.
 * A file or folder of the new system that is missing, like the log of a year
 * without entries, counts as empty.
 */

import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

/** Files of a calendar: in a folder and its subfolders, those whose names end so. */
export type CalendarSource = {
    folder: string;
    ending: string;
};

/**
 * Folder `NomWorkspace` with all zones.
 * Environment variable `NOM_VAULT` when set, like for a sample vault.
 */
export const vault: string = process.env.NOM_VAULT ?? join(homedir(), "NomWorkspace");

/** Folder `NomManageplannings`, the folders of my new system and my old system beside. */
export const manageRoot: string = join(vault, "NomManageplannings");

/**
 * Folder of plan and log of my new system, `NomManagecalendar`:
 * folders of the same depth, no month folders.
 * Every view reads all their plans and logs,
 * the Food view its meals from the logs as the Day view its entries.
 */
export const calendarRoot: string = join(manageRoot, "NomManagecalendar");

/**
 * Folder `Skilling/` in {@link calendarRoot}:
 * per project a plan and a log, named like the folder of the project.
 * A skill box or entry always has its skill.
 */
export const skillingRoot: string = join(calendarRoot, "Skilling");

/**
 * Folder `Modules/` in {@link calendarRoot}: per module a plan and a log,
 * named like the folder of the module.
 * The plan also holds the lectures imported from TUMonline
 * and the groups of its tutorials, see `./course.ts`.
 */
export const modulesRoot: string = join(calendarRoot, "Modules");

/** Folder `Meta/` in {@link calendarRoot}: birthdays, holidays and semester dates. */
export const metaRoot: string = join(calendarRoot, "Meta");

/** Folder of my daily notes, `NomFrequencediary`, see `./note.ts`. */
export const diaryRoot: string = join(manageRoot, "NomFrequencediary");

/** Folder of my data, `NomMetainformations`, its tables. */
export const dataRoot: string = join(manageRoot, "NomMetainformations");

/**
 * My devices, `Devices.md`, one row per device of my tailnet, what it shows of the page,
 * which the reader writes as each of my devices reports it, see `./devices.ts`.
 */
export const devicesFile: string = join(dataRoot, "Devices.md");

/** The people I name, `Persons.md`, see `./persons.ts`. */
export const personsFile: string = join(dataRoot, "Persons.md");

/**
 * Folder of my modules of the university, `NomModulesuniversity`:
 * one file per module of mine, named like its folder in `NomSkillingmodules`.
 * The overview of all of them is `Modules.md` in {@link dataRoot}.
 */
export const universityRoot: string = join(manageRoot, "NomModulesuniversity");

/**
 * The four folders of my new system the reader uses.
 * A change of a file in them tells every open page, see `./changes.ts`.
 */
export const systemRoots: string[] = [calendarRoot, diaryRoot, dataRoot, universityRoot];

/**
 * Folder `NomKommunikation` in `NomWorkspace`, the mailbox between Vu and me,
 * see its `README.md`.
 * Only the server of {@link holder} has it, with our messages,
 * and in the box of each of us `dashboard/`, what the dashboards share,
 * see `./shared.ts`. No other server ever makes or writes it.
 */
export const kommunikationRoot: string = join(vault, "NomKommunikation");

/**
 * The one of us whose server holds {@link kommunikationRoot}, as written in `With`.
 * The reader of every other reaches it by SSH, see `./shared.ts`.
 */
export const holder: string = "Sopha";

/**
 * My name as the people I share with write me in `With`, which names my box:
 * environment variable `NOM_NAME` of the reader, set in its service.
 * Empty when unset, then the reader shares nothing.
 */
export const myName: string = process.env.NOM_NAME?.trim() ?? "";

/**
 * The people I share with, as I write them in `With`:
 * environment variable `NOM_PARTNERS` of the reader, names parted by commas.
 * None when unset, and never me.
 * The reader of one who is not {@link holder} reaches the server of the holder by SSH
 * under `nom-` and the name in small letters,
 * a host `~/.ssh/config` of its server names with its address, its user and its key.
 */
export const partners: string[] = (process.env.NOM_PARTNERS ?? "")
    .split(",")
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name !== "" && name.toLowerCase() !== myName.toLowerCase());

/**
 * Gives the folder of what the dashboards share in the box of a person
 * in {@link kommunikationRoot}, see `./shared.ts`.
 */
export function dashboardBoxOf(name: string): string {
    return join(kommunikationRoot, `to_${name.toLowerCase()}`, "dashboard");
}

/**
 * Name of the folder of my old system beside them in `NomManageplannings`,
 * which the reader never reads, not even to list it.
 */
export const previousName: string = "NomSystemprevious";

/** End of the names of the files of the log: what happened, as events. */
export const logEnding: string = "_Log.ics";

/**
 * End of the names of the files of the plan: the boxes of the plan, as to-dos,
 * see `./boxes.ts`, beside the lectures imported from TUMonline, as events,
 * and in the plan of a module the groups of its tutorials,
 * as to-dos with `X-GROUP` and without `X-NUMBER`, which are no boxes, see `./course.ts`.
 */
export const planEnding: string = "_Plan.ics";

/** Folder of my modules in `NomWorkspace`, one folder per module. */
export const modulesFolder: string = "NomSkillingmodules";

/**
 * Sources of the notes area, read for it, each module a vault of its own, as in Obsidian.
 * Only the editor writes, see {@link editor},
 * and a click makes a folder of a module not there yet.
 * - `table`: The overview of my modules, `Modules.md`,
 *   its column `Attempt` naming every semester I seriously took it in, graded or not,
 *   by whose newest the menu of the scripts view orders my modules
 *   and the reader finds the modules of the semester,
 *   see `menuRead` and `activeModulesRead` in `./notes.ts`.
 *   Its column `Registered (not attempt)` the reader does not read.
 */
export type NotesSources = {
    modules: string;
    table: string;
};

/** {@link NotesSources} as they lie in the vault. */
export const notes: NotesSources = {
    modules: join(vault, modulesFolder),
    table: join(dataRoot, "Modules.md"),
};

/**
 * Places the editor writes, the only ones besides the files of the new system,
 * see {@link systemFiles}.
 * - `corrections`: Each save of a note of my modules as a unified diff at its end,
 *   out of Git, for the learn skill to turn into rules of my style.
 */
export type EditorSources = {
    modules: string;
    corrections: string;
};

/** {@link EditorSources} as they lie in the vault. */
export const editor: EditorSources = {
    modules: notes.modules,
    corrections: join(vault, ".claude", "skills", "learn", "styles", "corrections.diff"),
};

/**
 * Files of my new system the editor shows, see `./files.ts`.
 * - `tree`: Folder whose tree the editor shows on the left,
 *   without `previous` and without hidden files and folders.
 * - `previous`: Left out of the tree at any depth and never read.
 */
export type SystemFilesSources = {
    tree: string;
    previous: string;
};

/** {@link SystemFilesSources} as they lie in the vault. */
export const systemFiles: SystemFilesSources = {
    tree: manageRoot,
    previous: previousName,
};

/**
 * Skills of the semester of each of us by {@link myName} that are no modules,
 * each by its folder from `NomWorkspace`, written with `/`: my projects,
 * and the time I spend logging, planning and thinking about my day, `NomMasterplannings`,
 * Sopha's `NomFrequencediary`, linking the folder of her diary.
 * The modules of the semester come from `Modules.md`, see `activeModulesRead`
 * in `./notes.ts`. Sopha's will come from her own `Modules.md`,
 * and until she has one her reader has no modules of the semester.
 * Changed on request, when the semester's projects change.
 */
const skillsOf: { [name: string]: string[] } = {
    Vu: ["NomProgramprojects/AsiaWok_Wokflow_2026", "NomSystemdashboard", "NomManageplannings/NomMasterplannings"],
    Sopha: ["NomSystemdashboard", "NomManageplannings/NomFrequencediary"],
};

/**
 * Projects of the semester of this reader,
 * Vu's when {@link myName} names none of us there, like a reader without `NOM_NAME`.
 */
export const activeProjects: string[] = skillsOf[myName] ?? skillsOf.Vu;

/** Tells whether a skill of the semester is a module, else a project. */
export function moduleIs(skill: string): boolean {
    return skill.startsWith(`${modulesFolder}/`);
}

/**
 * Gives the name of a skill of the semester by its folder:
 * a module its code, the part of its folder name before `_`, a project its folder name.
 */
export function skillNameOf(skill: string): string {
    const folder: string = skill.split("/").at(-1) ?? skill;
    return moduleIs(skill) ? folder.split("_")[0] : folder;
}

/** Finds the folder of a project of the semester by its name, `undefined` for none. */
export function projectOf(name: string): string | undefined {
    return activeProjects.find((skill: string): boolean => skillNameOf(skill) === name);
}

/**
 * Sources of the day area, all in the new system.
 * - `plan`: Calendar of what I intend, read as the boxes of each day,
 *   but for the groups of my tutorials, see `./boxes.ts`.
 * - `log`: Calendar of what really happened, my one calendar.
 * - `system`: Calendars of birthdays, holidays and semester dates,
 *   shown above the boxes of their day, each a whole day.
 *   `Birthdays.ics` I write by hand, a birthday a yearly series.
 *   `University.ics` holds the official semester dates of TUM, its breaks too,
 *   a lecture-free period on each of its days,
 *   a semester and a lecture period only on their first and their last day.
 *   My gift idea for a birthday is its `DESCRIPTION`, see `./gifts.ts`.
 * - `places`, `rooms`, `online`: My places, the rooms of the university
 *   and my platforms online, see `./places.ts`.
 */
export type DaySources = {
    plan: CalendarSource[];
    log: CalendarSource[];
    system: CalendarSource[];
    places: string;
    rooms: string;
    online: string;
};

/** {@link DaySources} as they lie in the vault. */
export const day: DaySources = {
    plan: [{ folder: calendarRoot, ending: planEnding }],
    log: [{ folder: calendarRoot, ending: logEnding }],
    system: [
        { folder: metaRoot, ending: "Birthdays.ics" },
        { folder: metaRoot, ending: "Holidays.ics" },
        { folder: metaRoot, ending: "University.ics" },
    ],
    places: join(dataRoot, "Places.md"),
    rooms: join(dataRoot, "Rooms.md"),
    online: join(dataRoot, "Online.md"),
};

/**
 * Calendars of the days a series of my course skips:
 * the holidays where they are the university's,
 * and the dates of the semester the university does not teach on,
 * see `lectureFreeOf` in `./course.ts`.
 */
export const holidays: CalendarSource[] = [
    { folder: metaRoot, ending: "Holidays.ics" },
    { folder: metaRoot, ending: "University.ics" },
];

/**
 * Skill log: each block of learning is an entry `Skill` in the log of its skill,
 * holding the attempts made in it.
 */
export const skillLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/** Log of the trackers of the day, sleep and water, see `./trackers.ts`. */
export const trackerLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/**
 * Sources of the food area, see `./food.ts`.
 * - `search`: Search of Open Food Facts, which finds products by their names.
 * - `product`: Products of Open Food Facts,
 *   which gives a product by its barcode put after the address.
 */
export type FoodSources = {
    foods: string;
    meals: string;
    log: CalendarSource[];
    search: string;
    product: string;
};

/** {@link FoodSources} as they lie in the vault and on the web. */
export const food: FoodSources = {
    foods: join(dataRoot, "Foods.md"),
    meals: join(dataRoot, "Meals.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
    search: "https://search.openfoodfacts.org/search",
    product: "https://world.openfoodfacts.org/api/v2/product/",
};

/**
 * Sources of the sport area, see `./sport.ts`.
 * - `weights`: My weight, one row per day I weighed myself,
 *   each person's own, never in the code.
 * - `video`: oEmbed of YouTube,
 *   which gives the title and the channel of a video by its link put after the address.
 */
export type SportSources = {
    workouts: string;
    exercises: string;
    videos: string;
    weights: string;
    log: CalendarSource[];
    video: string;
};

/** {@link SportSources} as they lie in the vault and on the web. */
export const sport: SportSources = {
    workouts: join(dataRoot, "Workouts.md"),
    exercises: join(dataRoot, "Exercises.md"),
    videos: join(dataRoot, "Videos.md"),
    weights: join(dataRoot, "Weights.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
    video: "https://www.youtube.com/oembed",
};

/**
 * Folders and topics of the files of every category but `Skill` in {@link calendarRoot},
 * any other category in those of the topic `Living` in `Living/`.
 */
export const topics: { [category: string]: string } = {
    Sleep: "Health/Sleep",
    Food: "Living/Food",
    Cook: "Living/Food",
    Way: "Living/Way",
};

/**
 * Builds the path of a file of a topic and a year in {@link calendarRoot}:
 * the log or the plan of the topic of a category in the year of a day,
 * an entry by the year of its start in Berlin time, a box by the year of its day.
 */
export function topicFileOf(category: string, date: string, ending: string): string {
    return join(calendarRoot, `${topics[category] ?? "Living/Living"}_${date.slice(0, 4)}${ending}`);
}

/**
 * Builds the path of a file of a skill, its log or its plan:
 * a module's, whose folder starts with its code, in {@link modulesRoot},
 * any other in {@link skillingRoot}.
 */
export function skillFileOf(name: string, ending: string): string {
    return join(/^[A-Z]+\d+_/.test(name) ? modulesRoot : skillingRoot, `${name}${ending}`);
}

/**
 * Tells whether the reader may write a file:
 * only inside my new system, `NomManageplannings` but my old system,
 * and a hidden file or folder right in it, like `.obsidian`,
 * or, on the server of {@link holder} only,
 * inside what the dashboards share in a box of `NomKommunikation`,
 * never beside our messages.
 * The editor leaves both out at any depth, see {@link systemFiles}.
 * {@link resolve} takes out `..`, so no path leaves the folders.
 */
export function writeAllowed(file: string): boolean {
    const path: string = resolve(file);
    const root: string = `${resolve(manageRoot)}${sep}`;
    const top: string = path.slice(root.length).split(sep)[0];
    const box: string[] = relative(resolve(kommunikationRoot), path).split(sep);
    return (
        (path.startsWith(root) && top !== previousName && !top.startsWith(".")) ||
        (myName.toLowerCase() === holder.toLowerCase() &&
            /^to_\w+$/.test(box[0]) &&
            box[1] === "dashboard" &&
            box.length > 2)
    );
}

/**
 * Gives the path of a file from {@link vault} on, with `/` on every system,
 * as a dialog of the page shows the file of its entry.
 */
export function vaultPathOf(file: string): string {
    return relative(vault, file).split(sep).join("/");
}
