/**
 * ## Sources
 *
 * Every folder, file and web address the reader reads, grouped by area.
 * It reads only my new system, every folder in `NomManageplannings` but `NomSystemprevious`,
 * my modules and the files the skill entries link, nothing not listed here.
 * Every file at its own place, never from a copy elsewhere.
 * It writes only where {@link writeAllowed} and {@link editor} say.
 * A missing file or folder of the new system counts as empty.
 */

import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

/** Files of a calendar: in a folder and its subfolders, those whose names end so. */
export type CalendarSource = {
    folder: string;
    ending: string;
};

/** Folder `NomWorkspace`, or `NOM_VAULT` when set. */
export const vault: string = process.env.NOM_VAULT ?? join(homedir(), "NomWorkspace");

/** Folder `NomManageplannings`, my new system and my old system beside. */
export const manageRoot: string = join(vault, "NomManageplannings");

/** Folder `NomManagecalendar` of plan and log, folders of one depth, no month folders. */
export const calendarRoot: string = join(manageRoot, "NomManagecalendar");

/** Folder `Skilling/`, per project a plan and a log named like its folder. */
export const skillingRoot: string = join(calendarRoot, "Skilling");

/** Folder `Modules/`, per module a plan and a log named like its folder. */
export const modulesRoot: string = join(calendarRoot, "Modules");

/** Folder `Dates/`, birthdays, holidays, semester dates. */
export const datesRoot: string = join(calendarRoot, "Dates");

/** Folder `NomMetainformations` of my tables, in topic folders. */
export const dataRoot: string = join(manageRoot, "NomMetainformations");

/** Folder `Health/` of my tables, my workouts, exercises, weights. */
export const healthData: string = join(dataRoot, "Health");

/** Folder `Living/` of my tables, my foods, meals, people, places, platforms. */
export const livingData: string = join(dataRoot, "Living");

/** Folder `Modules/` of my tables, my modules, studies, schools, rooms. */
export const modulesData: string = join(dataRoot, "Modules");

/** Folder `Skilling/` of my tables, my skills. */
export const skillingData: string = join(dataRoot, "Skilling");

/** Folder `Technical/` of my tables, my devices. */
export const technicalData: string = join(dataRoot, "Technical");

/** The topic folders of my tables, each holding its tables without subfolders. */
export const dataFolders: string[] = [healthData, livingData, modulesData, skillingData, technicalData];

/** `Devices.md`, one row per device of my tailnet, what it shows of the page. */
export const devicesFile: string = join(technicalData, "Devices.md");

/** `Persons.md`, the people I name. */
export const personsFile: string = join(livingData, "Persons.md");

/** `Skills.md`, my skills beside the modules, one row per skill, each person's own. */
export const skillsFile: string = join(skillingData, "Skills.md");

/** Folder `NomModulesuniversity`, one file per module of mine, named like its folder. */
export const universityRoot: string = join(manageRoot, "NomModulesuniversity");

/** Folder `NomFrequenceintelligence` of our docs, one per day, `<YYYY>/<YYYY_MM>/<YYYY_MM_DD>.md`. */
export const intelligenceRoot: string = join(manageRoot, "NomFrequenceintelligence");

/** The four folders of my new system whose changes tell every open page. */
export const systemRoots: string[] = [calendarRoot, dataRoot, universityRoot, intelligenceRoot];

/**
 * Folder `NomKommunikation`, the mailbox between Vu and me.
 * Unison keeps its boxes the same on both our servers.
 */
export const kommunikationRoot: string = join(vault, "NomKommunikation");

/** My name as written in `With`, `NOM_NAME`, empty when unset and then the reader shares nothing. */
export const myName: string = process.env.NOM_NAME?.trim() ?? "";

/** The people I share with, `NOM_PARTNERS` parted by commas, never me. */
export const partners: string[] = (process.env.NOM_PARTNERS ?? "")
    .split(",")
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name !== "" && name.toLowerCase() !== myName.toLowerCase());

/** Folder of what the dashboards share in the box of a person. */
export function dashboardBoxOf(name: string): string {
    return join(kommunikationRoot, `to_${name.toLowerCase()}`, "dashboard");
}

/** Folder of my old system, never read, not even listed. */
export const previousName: string = "NomSystemprevious";

/** End of the names of the logs, what happened as events. */
export const logEnding: string = "_Log.ics";

/**
 * End of the names of the plans, the boxes as to-dos and the lectures as events.
 * The groups of tutorials are to-dos with `X-GROUP` and without `X-NUMBER`, no boxes.
 */
export const planEnding: string = "_Plan.ics";

/** Folder of my modules, one folder per module. */
export const modulesFolder: string = "NomSkillingmodules";

/**
 * Sources of the notes area, each module a vault of its own, as in Obsidian.
 * - `table`: `Modules.md`, its column `Attempt` every semester I seriously took a module,
 *   whose newest orders the menu and finds the modules of the semester.
 *   Its column `Registered (not attempt)` is not read.
 */
export type NotesSources = {
    modules: string;
    table: string;
};

/** {@link NotesSources} as they lie in the vault. */
export const notes: NotesSources = {
    modules: join(vault, modulesFolder),
    table: join(modulesData, "Modules.md"),
};

/**
 * Places the editor writes besides the new system.
 * - `corrections`: Each save of a note as a unified diff at its end, out of Git,
 *   for the learn skill to turn into rules of my style.
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
 * Files of my new system the editor shows.
 * - `tree`: Folder of the tree on the left, without `previous` and hidden files and folders.
 * - `previous`: Left out at any depth and never read.
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

/** Tells whether a path from `NomWorkspace` lies in the folder of a module. */
export function moduleIs(path: string): boolean {
    return path.startsWith(`${modulesFolder}/`);
}

/** Name of a module, its code of capitals and digits, then `_`. */
export const moduleName: RegExp = /^[A-Z]+\d+_/;

/**
 * Sources of the day area.
 * - `plan`: What I intend, read as the boxes of each day but the groups of tutorials.
 * - `log`: What really happened, my one calendar.
 * - `system`: Birthdays, holidays and semester dates, each a whole day above the boxes.
 *   A birthday is a yearly series, its `DESCRIPTION` my gift idea.
 *   `University.ics` holds a lecture-free period on each of its days,
 *   a semester and a lecture period only on their first and last day.
 * - `places`, `rooms`, `online`: My places, the rooms of the university and my platforms.
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
        { folder: datesRoot, ending: "Birthdays.ics" },
        { folder: datesRoot, ending: "Holidays.ics" },
        { folder: datesRoot, ending: "University.ics" },
    ],
    places: join(livingData, "Places.md"),
    rooms: join(modulesData, "Rooms.md"),
    online: join(livingData, "Online.md"),
};

/** Calendars of the days a series of my course skips, holidays and days the university does not teach. */
export const holidays: CalendarSource[] = [
    { folder: datesRoot, ending: "Holidays.ics" },
    { folder: datesRoot, ending: "University.ics" },
];

/** Each block of learning an entry `Skill` in the log of its skill, holding its attempts. */
export const skillLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/** Log of the trackers of the day, sleep and water. */
export const trackerLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/**
 * Sources of the food area.
 * - `search`: Open Food Facts search by name.
 * - `product`: Open Food Facts product by the barcode after the address.
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
    foods: join(livingData, "Foods.md"),
    meals: join(livingData, "Meals.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
    search: "https://search.openfoodfacts.org/search",
    product: "https://world.openfoodfacts.org/api/v2/product/",
};

/**
 * Sources of the sport area.
 * - `weights`: My weight, one row per day I weighed myself, each person's own.
 */
export type SportSources = {
    workouts: string;
    exercises: string;
    weights: string;
    log: CalendarSource[];
};

/** {@link SportSources} as they lie in the vault. */
export const sport: SportSources = {
    workouts: join(healthData, "Workouts.md"),
    exercises: join(healthData, "Exercises.md"),
    weights: join(healthData, "Weights.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
};

/** Topic folder of each category but `Skill`, any other in `Living/`. */
export const topics: { [category: string]: string } = {
    Sleep: "Health/Sleep",
    Food: "Living/Food",
    Cook: "Living/Food",
    Way: "Living/Way",
};

/**
 * Path of the log or plan of the topic of a category in a year,
 * an entry by the year of its start in Berlin time, a box by the year of its day.
 */
export function topicFileOf(category: string, date: string, ending: string): string {
    return join(calendarRoot, `${topics[category] ?? "Living/Living"}_${date.slice(0, 4)}${ending}`);
}

/** Path of the log or plan of a skill, a module's in {@link modulesRoot}, any other in {@link skillingRoot}. */
export function skillFileOf(name: string, ending: string): string {
    return join(moduleName.test(name) ? modulesRoot : skillingRoot, `${name}${ending}`);
}

/**
 * Tells whether the reader may write a file.
 * Inside `NomManageplannings` but my old system and the hidden files and folders right in it.
 * Also inside `dashboard/` of a box, never beside our messages.
 * {@link resolve} takes out `..`, so no path leaves the folders.
 */
export function writeAllowed(file: string): boolean {
    const path: string = resolve(file);
    const root: string = `${resolve(manageRoot)}${sep}`;
    const top: string = path.slice(root.length).split(sep)[0];
    const box: string[] = relative(resolve(kommunikationRoot), path).split(sep);
    return (
        (path.startsWith(root) && top !== previousName && !top.startsWith(".")) ||
        (/^to_\w+$/.test(box[0]) && box[1] === "dashboard" && box.length > 2)
    );
}

/** Path of a file from {@link vault} on, with `/` on every system. */
export function vaultPathOf(file: string): string {
    return relative(vault, file).split(sep).join("/");
}
