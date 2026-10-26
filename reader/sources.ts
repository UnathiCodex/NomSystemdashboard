/**
 * ## Sources
 *
 * Names every folder and file the reader reads,
 * and every address on the web it asks, grouped by area.
 * My new system is three folders in `NomManageplannings`, see {@link systemRoots}:
 * `NomManagecalendar` for plan and log, {@link calendarRoot},
 * `NomFrequencediary` for the daily notes, {@link diaryRoot},
 * and `NomMetainformations` for my foods, places, workouts, videos and weight, {@link dataRoot};
 * my old system, `NomSystemprevious`, lies beside them and is never read.
 * The reader reads only the new system, my modules, see {@link notes},
 * and the files the skill entries link, in my modules and my projects,
 * see {@link activeProjects} and `documents.ts`, and nothing that is not listed here;
 * every file at its own place, none from a copy elsewhere, like a draft in `.claude`.
 * It writes only into the three folders of the new system
 * and into what the dashboards share in `NomKommunikation`, the mailbox between Vu and me,
 * see {@link writeAllowed} and {@link kommunikationRoot},
 * the editor into the notes of my modules and the file of my corrections, see {@link editor},
 * and a click on a folder of a module not there yet makes it, see `folderMake` in `notes.ts`;
 * the editor shows the tree
 * of `NomManageplannings` but for my old system, and opens only the files of the three folders,
 * see {@link systemFiles}. A file or folder of the new system that is missing,
 * like `Birthdays.ics` or the log of a year without entries, counts as empty.
 *
 * - `node:os`: Gives the home folder.
 * - `node:path`: Builds file paths for the operating system.
 */

import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

/**
 * Files of a calendar: in a folder and its subfolders, the files whose names end in an ending.
 *
 * - `folder`: Folder of the files.
 * - `ending`: End of their names,
 *   like `_Log.ics` for the log or `Birthdays.ics` for the birthdays and holidays.
 */
export type CalendarSource = {
    folder: string;
    ending: string;
};

/**
 * Folder `NomWorkspace` with all zones.
 * Environment variable `NOM_VAULT` when set,
 * like `/tmp/nomvault` for a sample vault, else `~/NomWorkspace`.
 */
export const vault: string = process.env.NOM_VAULT ?? join(homedir(), "NomWorkspace");

/**
 * Folder `NomManageplannings`,
 * which holds the three folders of my new system and my old system beside them.
 */
export const manageRoot: string = join(vault, "NomManageplannings");

/**
 * Folder of plan and log of my new system, `NomManagecalendar`:
 * three folders of the same depth, no month folders,
 * {@link livingRoot} for the plan and the log of every category but `Skill`,
 * {@link skillingRoot} for those of my skills and {@link metaRoot} for my birthdays,
 * the holidays and the semester dates of TUM.
 * Every view reads all their plans and logs,
 * the Food view its meals from the logs as the Day view its entries, see {@link day}.
 */
export const calendarRoot: string = join(manageRoot, "NomManagecalendar");

/**
 * Folder `Living/` in {@link calendarRoot}:
 * for every category but `Skill` one plan and one log per topic and year,
 * like `Sleep_2026_Plan.ics` and `Sleep_2026_Log.ics`, the topic by its category,
 * see {@link livingTopics}, an entry by the year of its start in Berlin time,
 * a box by the year of its day, see {@link livingFileOf}.
 */
export const livingRoot: string = join(calendarRoot, "Living");

/**
 * Folder `Skilling/` in {@link calendarRoot}:
 * per project a plan and a log, named like the folder of the project,
 * like `NomSystemdashboard_Plan.ics` and `NomSystemdashboard_Log.ics`, see {@link skillFileOf};
 * a skill box or entry always has its skill.
 */
export const skillingRoot: string = join(calendarRoot, "Skilling");

/**
 * Folder `Modules/` in {@link calendarRoot}:
 * per module a plan and a log, named like the folder of the module,
 * like `IN2028_BusinessAnalyticsMachineLearning_Plan.ics`
 * and `IN2028_BusinessAnalyticsMachineLearning_Log.ics`:
 * a skill box goes into the plan of its module,
 * with the lectures imported from TUMonline and the groups of its tutorials,
 * see `course.ts`, a skill entry into its log, see {@link skillFileOf}.
 */
export const modulesRoot: string = join(calendarRoot, "Modules");

/**
 * Folder `Meta/` in {@link calendarRoot}: `Birthdays.ics`, `Holidays.ics` and `University.ics`,
 * see {@link day} and {@link holidays}.
 */
export const metaRoot: string = join(calendarRoot, "Meta");

/**
 * Folder of my daily notes, `NomFrequencediary`:
 * one note per day in a folder per year and one per month,
 * like `2026/2026_10/2026_10_13.md`, see `note.ts`.
 */
export const diaryRoot: string = join(manageRoot, "NomFrequencediary");

/**
 * Folder of my data, `NomMetainformations`: my foods, `Foods.md`,
 * my meals, `Meals.md`, my places, `Places.md`, the rooms of the university, `Rooms.md`,
 * the people I name, `Persons.md`, and my devices, `Devices.md`.
 */
export const dataRoot: string = join(manageRoot, "NomMetainformations");

/**
 * My devices, `Devices.md` in {@link dataRoot}:
 * one Markdown table with one row per device of my tailnet, what it shows of the page,
 * which the reader writes as each of my devices reports it, see `devices.ts`.
 */
export const devicesFile: string = join(dataRoot, "Devices.md");

/**
 * The people I name, `Persons.md` in {@link dataRoot}:
 * one Markdown table with one row per person, its name and its title,
 * which the reader only reads, see `persons.ts`.
 */
export const personsFile: string = join(dataRoot, "Persons.md");

/**
 * Folder of my modules of the university, `NomModulesuniversity`:
 * one file per module of mine, named like its folder in `NomSkillingmodules`,
 * like `IN2028_BusinessAnalyticsMachineLearning.md`, with its courses, groups and description;
 * the overview of all of them is `Modules.md` in {@link dataRoot}.
 */
export const universityRoot: string = join(manageRoot, "NomModulesuniversity");

/**
 * The four folders of my new system, the only ones the reader writes into,
 * but for the notes of my modules and the file of my corrections,
 * which the editor writes, see {@link editor}.
 */
export const systemRoots: string[] = [calendarRoot, diaryRoot, dataRoot, universityRoot];

/**
 * Folder `NomKommunikation` in `NomWorkspace`, the mailbox between Vu and me, see its `README.md`:
 * `to_vu/` for what goes to Vu, `to_sopha/` for what comes to me.
 * On my server it holds our messages;
 * on the server of each of us the box of each holds `dashboard/`, what the dashboards share,
 * see {@link dashboardBoxOf} and `shared.ts`.
 */
export const kommunikationRoot: string = join(vault, "NomKommunikation");

/**
 * My name as the people I share with write me in `With`, like `Sopha`,
 * which names my box in {@link kommunikationRoot}, like `to_sopha/`:
 * environment variable `NOM_NAME` of the reader, set in its service;
 * empty when unset, then the reader shares nothing, see `shared.ts`.
 */
export const myName: string = process.env.NOM_NAME?.trim() ?? "";

/**
 * The people I share with, as I write them in `With`, like `Vu`:
 * environment variable `NOM_PARTNERS` of the reader, names parted by commas, set in its service;
 * none when unset, and never me.
 * My reader reaches the server of each by SSH under `nom-` and the name in small letters,
 * like `nom-vu`, a host `~/.ssh/config` of my server names with its address,
 * its user and the key of my server, see `shared.ts`.
 */
export const partners: string[] = (process.env.NOM_PARTNERS ?? "")
    .split(",")
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name !== "" && name.toLowerCase() !== myName.toLowerCase());

/**
 * Gives the folder of what the dashboards share in the box of a person
 * in {@link kommunikationRoot}: `dashboard/` in `to_` and the name in small letters,
 * like `to_vu/dashboard/` for what goes to Vu, waiting there until Vu's server took it,
 * and `to_sopha/dashboard/` for what came to me; what is done goes into the trash, see `shared.ts`.
 *
 * @param name - Name of the person, like `Vu`
 * @returns Its folder, like `NomKommunikation/to_vu/dashboard` in `NomWorkspace`
 */
export function dashboardBoxOf(name: string): string {
    return join(kommunikationRoot, `to_${name.toLowerCase()}`, "dashboard");
}

/**
 * Name of the folder of my old system beside them in `NomManageplannings`, `NomSystemprevious`,
 * which the reader never reads, not even to list it.
 */
export const previousName: string = "NomSystemprevious";

/**
 * End of the names of the files of the log,
 * like `Sleep_2026_Log.ics` or `IN2028_BusinessAnalyticsMachineLearning_Log.ics`:
 * what happened, as events.
 */
export const logEnding: string = "_Log.ics";

/**
 * End of the names of the files of the plan, like `Living_2026_Plan.ics`
 * or `IN2028_BusinessAnalyticsMachineLearning_Plan.ics`: the boxes of the plan, as to-dos,
 * see `boxes.ts`, beside the lectures imported from TUMonline, as events,
 * and in the plan of a module the groups of its tutorials,
 * as to-dos with `X-GROUP` and without `X-NUMBER`, which are no boxes, see `course.ts`.
 */
export const planEnding: string = "_Plan.ics";

/**
 * Folder of my modules in `NomWorkspace`, `NomSkillingmodules`, one folder per module.
 */
export const modulesFolder: string = "NomSkillingmodules";

/**
 * Sources of the notes area, read for it;
 * only the editor writes, a note of my modules as I saved it, see {@link editor},
 * and a click makes a folder of a module not there yet, see `folderMake` in `notes.ts`;
 * each module in them is a vault of its own, as in Obsidian.
 *
 * - `modules`: My modules, `NomSkillingmodules`, one folder per module with its notes.
 * - `table`: The overview of my modules, `Modules.md` in {@link dataRoot},
 *   one Markdown table with one row per module:
 *   its column `Nom` links the folder of the module,
 *   its column `Semester` names the newest semester I seriously took it in, graded or not,
 *   like `2026S`, by which the menu of the scripts view orders my modules
 *   and the reader finds the modules of the semester,
 *   see `menuRead` and `activeModulesRead` in `notes.ts`;
 *   its column `Registered` names every semester I was registered in for it on TUMonline,
 *   like `2025S, 2026S`, which the reader does not read.
 */
export type NotesSources = {
    modules: string;
    table: string;
};

/**
 * {@link NotesSources} as they lie in the vault.
 */
export const notes: NotesSources = {
    modules: join(vault, modulesFolder),
    table: join(dataRoot, "Modules.md"),
};

/**
 * Places the editor writes,
 * the only ones besides the three folders of the new system, see {@link systemRoots}.
 *
 * - `modules`: My modules, each note right at its place, the modules of {@link notes}.
 * - `corrections`: My corrections, one file, `.claude/modules/corrections.diff` of this project,
 *   out of Git, each save of a note of my modules added at its end as a unified diff,
 *   for the AI to turn into rules of my style.
 */
export type EditorSources = {
    modules: string;
    corrections: string;
};

/**
 * {@link EditorSources} as they lie in the vault.
 */
export const editor: EditorSources = {
    modules: notes.modules,
    corrections: join(vault, "NomSystemdashboard", ".claude", "modules", "corrections.diff"),
};

/**
 * Files of my new system the editor shows, see `files.ts`.
 *
 * - `tree`: Folder whose tree the editor shows on the left, `NomManageplannings`,
 *   with every folder I add to it later,
 *   but without `previous` and without hidden files and folders, like `.obsidian`.
 * - `previous`: Name of my old system, `NomSystemprevious`,
 *   left out of the tree at any depth and never read.
 * - `folders`: The only folders whose files the editor reads and writes,
 *   the three folders of my new system, see {@link systemRoots}: a Markdown file,
 *   like `Foods.md`, to edit, an `.ics` file only to read.
 */
export type SystemFilesSources = {
    tree: string;
    previous: string;
    folders: string[];
};

/**
 * {@link SystemFilesSources} as they lie in the vault.
 */
export const systemFiles: SystemFilesSources = {
    tree: manageRoot,
    previous: previousName,
    folders: systemRoots,
};

/**
 * Skills of the semester of each of us by {@link myName} that are no modules,
 * each by its folder from `NomWorkspace`, written with `/`: my projects,
 * like `NomProgramprojects/AsiaWok_Wokflow_2026`;
 * my time logging, planning and thinking about my day is the category `Manage`,
 * Sopha's still her project `NomFrequencediary`.
 * The modules of the semester come from `Modules.md`, see `activeModulesRead` in `notes.ts`;
 * Sopha's will come from her own `Modules.md`, so her list holds no module either,
 * and until she has one her reader has no modules of the semester.
 * Changed on request, when the semester's projects change.
 */
const skillsOf: { [name: string]: string[] } = {
    Vu: ["NomProgramprojects/AsiaWok_Wokflow_2026", "NomSystemdashboard"],
    Sopha: ["NomSystemdashboard", "NomManageplannings/NomFrequencediary"],
};

/**
 * Projects of the semester of this reader,
 * see {@link skillsOf}, Vu's when {@link myName} names none of us there,
 * like a reader without `NOM_NAME`;
 * after the modules of the semester the rest of its skills, see `activeSkillsRead` in `notes.ts`.
 */
export const activeProjects: string[] = skillsOf[myName] ?? skillsOf.Vu;

/**
 * Tells whether a skill of the semester is a module, a folder in `NomSkillingmodules`,
 * else a project, see `activeSkillsRead` in `notes.ts`.
 *
 * @param skill - Folder from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`
 * @returns Whether it is a module
 */
export function moduleIs(skill: string): boolean {
    return skill.startsWith(`${modulesFolder}/`);
}

/**
 * Gives the name of a skill of the semester by its folder:
 * a module its code, the part of its folder name before `_`, a project its folder name,
 * the last part of its path.
 * - `folder`: Name of the folder, the last part of its path.
 *
 * @param skill - Folder from `NomWorkspace`,
 *   like `NomSkillingmodules/IN2028_BusinessAnalyticsMachineLearning`
 *   or `NomProgramprojects/AsiaWok_Wokflow_2026`
 * @returns Name, like `IN2028` or `WokFlow`
 */
export function skillNameOf(skill: string): string {
    const folder: string = skill.split("/").at(-1) ?? skill;
    return moduleIs(skill) ? folder.split("_")[0] : folder;
}

/**
 * Finds a project of the semester by its name, see {@link skillNameOf}.
 *
 * @param name - Name of the project, like `WokFlow`
 * @returns Its folder from `NomWorkspace`, like `NomProgramprojects/AsiaWok_Wokflow_2026`,
 *   `undefined` when no project of the semester has the name
 */
export function projectOf(name: string): string | undefined {
    return activeProjects.find((skill: string): boolean => skillNameOf(skill) === name);
}

/**
 * Sources of the day area, all in the new system;
 * the daily notes lie in {@link diaryRoot}, see `note.ts`.
 *
 * - `plan`: Calendar of what I intend, every plan file in {@link calendarRoot},
 *   the plans of topic and year in `Living/` and those of my skills in `Skilling/`,
 *   read as the boxes of each day, but for the groups of my tutorials, see `boxes.ts`.
 * - `log`: Calendar of what really happened, by category, every log file in {@link calendarRoot},
 *   the logs of topic and year in `Living/` and those of my skills in `Skilling/`, my one calendar.
 * - `system`: Calendars of birthdays, holidays and semester dates in {@link metaRoot},
 *   shown above the boxes of their day, each a whole day: `Birthdays.ics`,
 *   which I write by hand, a birthday a yearly series with `CATEGORIES:Birthday` and the name
 *   as `SUMMARY`, like `Birthday: Karlbauer Florian`, beside it `Holidays.ics`,
 *   a holiday with `CATEGORIES:Holiday`, like `Holiday: Ostermontag (AT, DE)`,
 *   and `University.ics`, the official semester dates of TUM, each with `CATEGORIES:University`,
 *   its breaks too, the semester written as I write it,
 *   like `University: Vorlesungsbeginn 2026W` or `University: Weihnachtsferien (TUM)`,
 *   a lecture-free period on each of its days,
 *   a semester and a lecture period only on their first and their last day;
 *   my gift idea for one is its `DESCRIPTION`, which the reader writes, see `gifts.ts`;
 *   none of a file while it is missing.
 * - `places`: My places, `Places.md` in {@link dataRoot}, beside `Foods.md`, one Markdown table
 *   with one row per place, its name, street, code, city, country and link,
 *   which the reader writes as I add places, see `places.ts`.
 * - `rooms`: The rooms of the university, `Rooms.md` beside `Places.md`,
 *   one table of the same form, its link to NavigaTUM,
 *   which the reader writes as I add a room, see `places.ts`.
 * - `online`: My platforms online, `Online.md` beside `Places.md`,
 *   one table with one row per platform, its name, provider and link,
 *   which the reader writes as I add a platform, see `places.ts`.
 */
export type DaySources = {
    plan: CalendarSource[];
    log: CalendarSource[];
    system: CalendarSource[];
    places: string;
    rooms: string;
    online: string;
};

/**
 * {@link DaySources} as they lie in the vault.
 */
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
 * Calendars of the days a series of my course skips, in {@link metaRoot}:
 * the holidays of `Holidays.ics`, `CATEGORIES:Holiday`, where they are the university's,
 * like `Allerheiligen (AT, BY)`,
 * and the dates of the semester of `University.ics`, `CATEGORIES:University`,
 * the university does not teach on, like `Weihnachtsferien (TUM)` or `Dies Academicus (TUM)`,
 * see `lectureFreeOf` in `course.ts`; none of a file while it is missing.
 */
export const holidays: CalendarSource[] = [
    { folder: metaRoot, ending: "Holidays.ics" },
    { folder: metaRoot, ending: "University.ics" },
];

/**
 * Skill log: the log of the new system,
 * where each block of learning is an entry of the category `Skill` in the log of its skill
 * in `Skilling/`, holding the attempts made in it.
 * The tasks lie in the chapter notes of the modules of the semester,
 * see `activeModulesRead` in `notes.ts`.
 */
export const skillLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/**
 * Log of the trackers of the day, sleep and water: the log of the new system,
 * where they are entries of the categories `Sleep` and `Drink` in the logs of their topic
 * and year in `Living/`, like `Sleep_2026_Log.ics`.
 */
export const trackerLog: CalendarSource[] = [{ folder: calendarRoot, ending: logEnding }];

/**
 * Sources of the food area.
 *
 * - `foods`: My foods, `Foods.md` in {@link dataRoot}, one Markdown table with one row per food,
 *   which the reader writes as I add foods, see `food.ts`.
 * - `meals`: My meals, `Meals.md` in {@link dataRoot},
 *   one section per meal with its table of its foods,
 *   which the reader writes as I add meals, see `food.ts`.
 * - `log`: Log of the new system,
 *   where each meal is an entry of the category `Food` listing its foods,
 *   in the log of its year in `Living/`, like `Food_2026_Log.ics`.
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

/**
 * {@link FoodSources} as they lie in the vault and on the web.
 */
export const food: FoodSources = {
    foods: join(dataRoot, "Foods.md"),
    meals: join(dataRoot, "Meals.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
    search: "https://search.openfoodfacts.org/search",
    product: "https://world.openfoodfacts.org/api/v2/product/",
};

/**
 * Sources of the sport area.
 *
 * - `workouts`: My workouts, `Workouts.md` in {@link dataRoot},
 *   one Markdown table with one row per part of a workout, an exercise or a video,
 *   which the reader writes as I add workouts, see `sport.ts`.
 * - `exercises`: My exercises, `Exercises.md` in {@link dataRoot},
 *   one Markdown table with one row per exercise,
 *   which the reader writes as I add exercises, see `sport.ts`.
 * - `videos`: My videos, `Videos.md` in {@link dataRoot},
 *   one Markdown table with one row per video,
 *   which the reader writes as I add videos, see `sport.ts`.
 * - `weights`: My weight, `Weights.md` in {@link dataRoot},
 *   one Markdown table with one row per day I weighed myself,
 *   which the reader writes as I change my weight in the sport area, see `sport.ts`;
 *   each person's own, never in the code.
 * - `log`: Log of the new system,
 *   where each session is an entry of the category `Sport`, in the log of its year in `Living/`,
 *   like `Living_2026_Log.ics`.
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

/**
 * {@link SportSources} as they lie in the vault and on the web.
 */
export const sport: SportSources = {
    workouts: join(dataRoot, "Workouts.md"),
    exercises: join(dataRoot, "Exercises.md"),
    videos: join(dataRoot, "Videos.md"),
    weights: join(dataRoot, "Weights.md"),
    log: [{ folder: calendarRoot, ending: logEnding }],
    video: "https://www.youtube.com/oembed",
};

/**
 * Topics of the files in {@link livingRoot}, by category: my sleep,
 * and my food with my cooking, each in files of its own,
 * any other category in those of the topic `Living`, see {@link livingFileOf}.
 */
export const livingTopics: { [category: string]: string } = {
    Sleep: "Sleep",
    Food: "Food",
    Cook: "Food",
};

/**
 * Builds the path of a file of a topic and a year in {@link livingRoot}:
 * the log or the plan of the topic of a category, see {@link livingTopics}, in the year of a day.
 *
 * @param category - Category of the entry or the box, like `Cook`
 * @param date - Day like `2026-10-13`
 * @param ending - End of the name, {@link logEnding} or {@link planEnding}
 * @returns Path like `Living/Food_2026_Log.ics`
 *   or `Living/Living_2026_Plan.ics` in {@link calendarRoot}
 */
export function livingFileOf(category: string, date: string, ending: string): string {
    return join(livingRoot, `${livingTopics[category] ?? "Living"}_${date.slice(0, 4)}${ending}`);
}

/**
 * Builds the path of a file of a skill, its log or its plan: a module's, whose folder starts
 * with its code, in {@link modulesRoot}, any other in {@link skillingRoot}.
 *
 * @param name - Name of the folder of the skill,
 *   like `IN2028_BusinessAnalyticsMachineLearning` or `WokFlow`,
 *   or `Skill` for a box or an entry without skill
 * @param ending - End of the name, {@link logEnding} or {@link planEnding}
 * @returns Path like `Modules/IN2028_BusinessAnalyticsMachineLearning_Log.ics`
 *   or `Skilling/WokFlow_Plan.ics` in {@link calendarRoot}
 */
export function skillFileOf(name: string, ending: string): string {
    return join(/^[A-Z]+\d+_/.test(name) ? modulesRoot : skillingRoot, `${name}${ending}`);
}

/**
 * Tells whether the reader may write a file:
 * only inside one of the three folders of the new system, see {@link systemRoots},
 * or inside what the dashboards share in a box of `NomKommunikation`,
 * see {@link dashboardBoxOf}, never beside our messages.
 * - {@link resolve}: Makes a path absolute and takes out `..`, so no path leaves the folders.
 * - `path`: The file, absolute.
 * - `box`: Its parts inside `NomKommunikation`, like `to_vu`, `dashboard` and the file;
 *   one starting with `..` when it lies outside.
 *
 * @param file - Path of a file to write
 * @returns Whether the file lies inside one of the folders of the new system
 *   or what the dashboards share
 */
export function writeAllowed(file: string): boolean {
    const path: string = resolve(file);
    const box: string[] = relative(resolve(kommunikationRoot), path).split(sep);
    return (
        systemRoots.some((root: string): boolean => path.startsWith(`${resolve(root)}${sep}`)) ||
        (/^to_\w+$/.test(box[0]) && box[1] === "dashboard" && box.length > 2)
    );
}

/**
 * Gives the path of a file from {@link vault} on, with `/` on every system,
 * as a dialog of the page shows the file of its entry, see `fileShow` in `src/day/choices.ts`.
 *
 * @param file - Path of a file in `NomWorkspace`
 * @returns Path like `NomManageplannings/NomManagecalendar/Modules/WI1059_FinancialAccounting_Plan.ics`
 */
export function vaultPathOf(file: string): string {
    return relative(vault, file).split(sep).join("/");
}
