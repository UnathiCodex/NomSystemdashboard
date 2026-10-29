/**
 * ## Reader for browser (Node)
 *
 * Start with `npm start`.
 *
 * Reads the vault named in `sources.ts` and waits at `127.0.0.1:3000`, IPv4 by its address,
 * not `localhost`, which some servers turn into `::1` first
 * while `tailscale serve` hands requests to `127.0.0.1:3000`, to answer the browser page with data,
 * and with the page itself.
 *
 * - Node may read from disk but browser cannot.
 * - Node cannot draw a window, only the browser draws.
 *
 * ### Modules
 * - `node:http`: Builds the server that answers the browser page
 * - `node:stream/consumers`: Reads a whole request body into one value
 * - `node:stream/promises`: Hands a file on to the browser piece by piece as it is read
 * - `node:zlib`: Packs an answer as `gzip`, many times smaller
 * - `./day.ts`: Reads the log of a day and every entry of the log, adds, changes,
 *   moves and removes its entries, adds the meal of a cooking,
 *   logs a box of the plan at its real time and takes it back,
 *   and reads how long entries like a box really lasted
 * - `./boxes.ts`: Reads the plan of days as boxes with their birthdays and holidays,
 *   the boxes carried along to a day and one box, adds, changes and removes boxes,
 *   pushes them to the next day and drops them
 * - `./course.ts`: Reads the course of a module, its boxes,
 *   its series and the groups of its tutorials, changes a series by its rule, makes a group mine,
 *   picks one session of a group for its week, writes and removes groups,
 *   adds a new box once per date of its weekly days, and gives an exam its kind and its times
 * - `./rules.ts`: Reads a plain series of the plan by its rule, like my sleep of every night,
 *   and writes it new or whole
 * - `./gifts.ts`: Writes my gift idea for a birthday or holiday
 *   as its `DESCRIPTION` into `Birthdays.ics` or `Holidays.ics`
 * - `./note.ts`: Reads the daily notes,
 *   and writes my gratitude and my points about the day into them
 * - `./categories.ts`: Offers the categories with the values of their fields, and my places
 * - `./places.ts`: Adds a place with its address to `Places.md`, changes its row,
 *   and changes one everywhere
 * - `./persons.ts`: Reads the people I name from `Persons.md`, read only
 * - `./notes.ts`: Reads every module for the menu of the scripts view, the notes,
 *   files and folders of my modules and the links that lead nowhere, read only,
 *   streams a file of them, and makes a folder of a module on a click on it
 * - `./edit.ts`: Writes a note of my modules as I edited it, at its place in `NomSkillingmodules`,
 *   and keeps the change as a diff
 * - `./files.ts`: Lists the files of my new system for the editor,
 *   reads one and writes a Markdown file back
 * - `./skill.ts`: Reads the tasks of my chapter notes with when each is due
 *   and what a module offers a skill entry, writes skill entries,
 *   attempts and where I stand in rounds into the log, and reads the session running now
 * - `./documents.ts`: Checks the links of the skill entries at the start and every night,
 *   repairing what it can, and reads a file a skill entry links
 * - `./suggestions.ts`: Writes the chapters due today into the plan of today, one box each
 * - `./food.ts`: Finds foods, mine first,
 *   then on Open Food Facts, adds foods to `Foods.md` and renames them, adds meals to `Meals.md`,
 *   reads the meals of a day and my meals
 * - `./sport.ts`: Reads the sessions of a day with what they burned,
 *   keeps my workouts in `Workouts.md`, my exercises in `Exercises.md`,
 *   my videos in `Videos.md` and my weight in `Weights.md`,
 *   and asks YouTube for the title and channel of a link
 * - `./trackers.ts`: Reads my sleep against my goals, my glasses of water,
 *   my neck sessions and what my meals gave on a day
 * - `./devices.ts`: Writes what each of my devices shows of the page into `Devices.md`
 * - `./changes.ts`: Tells every open page the moment a file of my new system changes,
 *   so it loads anew what it shows
 * - `./shared.ts`: Sends an entry I log with Vu and every change of my foods,
 *   meals and places to Vu's server by SSH, and takes in what Vu's server sends me
 * - `./page.ts`: Gives out the files of the page through Vite
 * - `./theme.ts`: Reads the colors of my code blocks from the theme of my editor
 */

import { createServer } from "node:http";
import { json } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";
import { gzipSync } from "node:zlib";
import {
    boxLog,
    boxUndo,
    dayEntriesRead,
    entryAdd,
    entryDelete,
    entryEdit,
    entryMove,
    entryNowRead,
    logAllRead,
    realMinutesRead,
} from "./day.ts";
import {
    boxAdd,
    boxDelete,
    boxDrop,
    boxEdit,
    boxesCarried,
    boxesRead,
    boxFind,
    boxPush,
    boxSubmit,
    boxUniversity,
} from "./boxes.ts";
import {
    courseRead,
    courseSeriesRemove,
    examSet,
    groupApply,
    groupMine,
    groupPut,
    groupRemove,
    numbersRenew,
    repeatApply,
    seriesApply,
    sessionApply,
    weekPick,
} from "./course.ts";
import { giftWrite } from "./gifts.ts";
import { noteRead, notesStart, sectionsRead, sectionWrite } from "./note.ts";
import { categoriesRead, lastPlaceRead, semesterOf } from "./categories.ts";
import {
    placeAdd,
    placeChange,
    placeRename,
    placeStandardSet,
    platformAdd,
    platformChange,
} from "./places.ts";
import { plainApply, plainRead, plainRemove } from "./rules.ts";
import { personRename, personsRead } from "./persons.ts";
import { attendeesRename } from "./calendar.ts";
import { calendarRoot } from "./sources.ts";
import {
    brokenLinksRead,
    fileOpen,
    fileRead,
    folderMake,
    folderRead,
    linkedNoteRead,
    menuRead,
    moduleMake,
} from "./notes.ts";
import { noteWrite } from "./edit.ts";
import { systemFileRead, systemFileWrite, treeRead } from "./files.ts";
import {
    attemptAdd,
    roundAdd,
    moduleRead,
    sessionRead,
    skillEntryAdd,
    skillEntryEdit,
    skillingRead,
} from "./skill.ts";
import { linkedFileRead, linksCheckStart } from "./documents.ts";
import { suggestionsWrite } from "./suggestions.ts";
import {
    dishAdd,
    dishesRead,
    dishRemove,
    dishRename,
    foodAdd,
    foodChange,
    foodDayRead,
    foodRemove,
    foodsFind,
} from "./food.ts";
import {
    exerciseAdd,
    exerciseChange,
    exerciseRemove,
    mineRead,
    sportDayRead,
    videoFind,
    videoRemove,
    videoSave,
    weightSave,
    workoutRemove,
    workoutSave,
} from "./sport.ts";
import { trackersRead } from "./trackers.ts";
import { deviceReport } from "./devices.ts";
import { changesSend, changesWatch } from "./changes.ts";
import { attendeesRead, entryShare, listShare, sharedStart } from "./shared.ts";
import { pageCreate } from "./page.ts";
import { codeColorsRead } from "./theme.ts";

import type { IncomingMessage, ServerResponse, Server } from "node:http";
import type { ViteDevServer } from "vite";
import type { BoxLogged, EntryChange, EntryMoved, EntryNew } from "./day.ts";
import type { Box, BoxChange, BoxNew } from "./boxes.ts";
import type { Attendee } from "./calendar.ts";
import type { PersonRenamed } from "./persons.ts";
import type {
    ExamChange,
    GroupChange,
    GroupNew,
    MineChange,
    PickChange,
    Planned,
    RepeatChange,
    SeriesChange,
    SessionChange,
} from "./course.ts";
import type { Gift } from "./gifts.ts";
import type { PlainChange } from "./rules.ts";
import type { SectionNew } from "./note.ts";
import type { Place, PlaceChanged, PlaceRenamed, Platform, PlatformChanged } from "./places.ts";
import type { DeviceReport } from "./devices.ts";
import type { NotesFile, NotesStream } from "./notes.ts";
import type { NoteChange } from "./edit.ts";
import type { AttemptNew, RoundNew, SkillEntryChange, SkillEntryNew } from "./skill.ts";
import type { Dish, Food, FoodChanged } from "./food.ts";

/**
 * Sends an answer as JSON text, packed as `gzip` when the browser takes it, as every browser does,
 * which makes the categories with the values of their fields 31 KB instead of 506 KB.
 * - `Cache-Control`: Tells the browser with `no-store` to not keep the answer,
 *   because the files may change any time.
 * - `Content-Encoding`: Tells the browser that the answer comes packed, which it unpacks by itself.
 *
 * @param response - Answer to the browser
 * @param status - HTTP status code
 * @param body - Data to send
 */
function responseSend(response: ServerResponse, status: number, body: unknown): void {
    const text: string = JSON.stringify(body);
    const packed: boolean = /\bgzip\b/.test(response.req.headers["accept-encoding"] ?? "");
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    if (packed) response.setHeader("Content-Encoding", "gzip");
    response.end(packed ? gzipSync(text) : text);
}

/**
 * Sends a file of my modules, or one a skill entry links, as it lies on the disk.
 * - `Content-Disposition`: Tells the browser with `inline` to show the file,
 *   in its own viewer for a PDF, and its name,
 *   like `04_LogisticPoissonRegression.pdf`, for the tab and for saving it.
 * - `Cache-Control`: Tells the browser with `no-store` to not keep the file,
 *   because it may change any time.
 * - `Content-Security-Policy`:
 *   Tells the browser with `script-src 'none'` to run no script of the file,
 *   like one inside an `.svg` opened on its own.
 *
 * @param response - Answer to the browser
 * @param file - File with its content type
 * @param name - Name of the file, the last part of its path
 */
function fileSend(response: ServerResponse, file: NotesFile, name: string): void {
    response.setHeader("Content-Type", file.type);
    response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "script-src 'none'");
    response.end(file.content);
}

/**
 * Streams a file of my modules as it lies on the disk,
 * like a PDF of a folder, with the headers of {@link fileSend}:
 * sends it piece by piece as it is read, so a large file,
 * like a book as PDF, never lies in the reader's memory whole.
 * - {@link pipeline}: Hands each piece on to the browser as it is read,
 *   and closes the file once it is sent or the browser went away,
 *   like from a tab closed before its PDF loaded, which is no error.
 *
 * @param response - Answer to the browser
 * @param file - File with its content type, opened to be read
 * @param name - Name of the file, the last part of its path
 * @throws {Error} - When the file cannot be read to its end
 */
async function fileStream(
    response: ServerResponse,
    file: NotesStream,
    name: string,
): Promise<void> {
    response.setHeader("Content-Type", file.type);
    response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "script-src 'none'");
    try {
        await pipeline(file.content, response);
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ERR_STREAM_PREMATURE_CLOSE") throw error;
    }
}

/**
 * Heading of the block I opened last in each section, by the path of its note,
 * empty for its current step, as the editor tells it, see `src/editor/round.ts`;
 * kept in memory only, so a reload shows the block again until the reader restarts.
 */
const openedBlocks: Map<string, string> = new Map<string, string>();

/**
 * Handles a request by its method and its address.
 * The range of the log comes as FullCalendar sends it, `start` and `end` with offset;
 * the range of the plan as days.
 * - `GET /api/day/log?start=…&end=…`: Sends log entries of the range.
 * - `GET /api/day/all`: Sends every entry of the log, newest first, for its search.
 * - `GET /api/day/now`: Sends the entry of the log running now,
 *   the one begun last of several, or `null`.
 * - `GET /api/day/boxes?start=…&end=…`:
 *   Sends the plan of each day from the first day to the day before the last,
 *   like `start=2026-10-13&end=2026-10-14` for one day:
 *   its birthdays and holidays with my gift ideas, and its boxes;
 *   first writes the chapters due today into the plan of today, see `suggestions.ts`,
 *   as `/api/day/carried` and `/api/skill/tasks` do too.
 * - `GET /api/day/carried?date=…`:
 *   Sends the boxes whose deadline lies on a day before the date and that are open,
 *   see `boxesCarried` in `boxes.ts`.
 * - `GET /api/day/box?id=…`: Sends the box of the identifier with its state,
 *   like the box a log entry was logged from, whose series the pencil of its summary opens,
 *   see `src/day/categories.ts`.
 * - `GET /api/day/note?date=…`: Sends the daily note of the date, or `null` for a day without note.
 * - `GET /api/day/sections?date=…`:
 *   Sends my gratitude and my points about the day of the daily note of the date as texts,
 *   empty ones for a day without note.
 * - `GET /api/day/categories?now=…`: Sends the categories with the values of their fields.
 * - `GET /api/day/last-place?before=…`: Sends where I was last before the instant.
 * - `GET /api/day/plain?id=…`:
 *   Sends the plain series of the `UID` of one of its parts, its rule, times and texts,
 *   with every part of it going on, see `plainRead` in `rules.ts`.
 * - `GET /api/day/trackers?date=…`:
 *   Sends my sleep, my glasses of water,
 *   my neck sessions and what my meals gave on the date, with my goals.
 * - `GET /api/day/real?category=…&title=…&module=…&type=…`:
 *   Sends the minutes the last entries like a box really lasted, the latest first.
 * - `POST /api/day/log`: Adds entry of the body and sends its identifier;
 *   sends the entry to Vu when Vu is in its `With`, see `entryShare` in `shared.ts`,
 *   as do the other routes that add an entry of the log,
 *   and those that change one when Vu comes into its `With`;
 *   the routes that change my foods, meals,
 *   places and platforms send each change to Vu, see `listShare` there.
 * - `PATCH /api/day/log`: Changes entry of the body,
 *   refused with 409 when its file changed it since the dialog opened it.
 * - `POST /api/day/moved`: Moves the entry named in the body to the start and end in the body,
 *   every other field as its file holds it.
 * - `DELETE /api/day/log?id=…`: Removes entry of the identifier.
 * - `POST /api/day/boxes`: Adds the box of the body, numbers the boxes of its type anew,
 *   a tutorial by its week, see `numbersRenew` in `course.ts`, and sends its identifier.
 * - `PATCH /api/day/boxes`: Changes box of the body.
 * - `DELETE /api/day/boxes?id=…`:
 *   Removes box of the identifier, of one day of a series that day alone.
 * - `DELETE /api/day/plain?id=…`: Removes the plain series of the `UID` whole, every part of it,
 *   see `plainRemove` in `rules.ts`.
 * - `POST /api/day/repeat`: Adds box of the body once per date of its weekly days,
 *   as the dialog of a series gives them for a box repeated by the row `Repeat` of its dialog,
 *   and sends the boxes it makes, see `repeatApply` in `course.ts`;
 *   refused with 409 for a series of a type that has a box in its semester already;
 *   when the body says `dry: true` only sends what it would make, writing nothing,
 *   for the preview of the dialog.
 * - `POST /api/day/plain`: Writes a part of a plain series as the body has it, new, whole,
 *   or from today on, or ends it when the body says `gone: true`, and sends the boxes it makes,
 *   see `plainApply` in `rules.ts`;
 *   when the body says `dry: true` only sends them, writing nothing, for the preview of the dialog.
 * - `POST /api/day/logged`: Logs the box named in the body at the start and end in the body,
 *   and sends the identifier of the log entry.
 * - `POST /api/day/undone`:
 *   Takes the done box named in the body back to open,
 *   removing the log entry from it unless it holds what I added since.
 * - `POST /api/day/pushed`: Pushes the box named in the body to the next day.
 * - `POST /api/day/dropped`: Drops the box named in the body,
 *   or takes it back when the body says `dropped: false`.
 * - `POST /api/day/university`:
 *   Marks the box named in the body cancelled by the university, renumbering its series,
 *   or takes it back when the body says `cancelled: false`.
 * - `POST /api/day/submitted`: Ticks the box with a deadline named in the body submitted,
 *   or takes the tick back when the body says `submitted: false`.
 * - `POST /api/day/sections`:
 *   Writes the section of the body into its daily note, my gratitude or my points about the day.
 * - `POST /api/day/gifts`: Writes the gift idea of the body for its birthday
 *   or holiday into its file, `Birthdays.ics` or `Holidays.ics`, or takes it out when it is empty.
 * - `POST /api/day/places`:
 *   Adds the place of the body with its address to `Places.md`,
 *   a room to `Rooms.md`, and sends it as written.
 * - `PATCH /api/day/places`: Changes the place of the old name of the body in `Places.md`,
 *   or the room in `Rooms.md`, and nothing else, and sends it as written.
 * - `POST /api/day/renamed`:
 *   Changes the place of the old name of the body everywhere to the name,
 *   address and link of the body,
 *   its row in `Places.md` or `Rooms.md` and every line of my calendars that names it,
 *   see `placeRename` in `places.ts`;
 *   when the body says `dry: true` only checks it, writing nothing.
 * - `POST /api/day/standard`:
 *   Makes the place named in the body my default place, `★` in `Places.md` or `Rooms.md`,
 *   none for an empty name, see `placeStandardSet` in `places.ts`.
 * - `POST /api/day/online`:
 *   Adds the platform named in the body to `Online.md` and sends it as written.
 * - `PATCH /api/day/online`:
 *   Changes the name and the provider of the platform of the old name of the body
 *   in `Online.md`, and sends it as written.
 * - `GET /api/persons`: Sends the people of `Persons.md`,
 *   each with its name, its link and its title.
 * - `POST /api/persons/renamed`:
 *   Changes the person of the old name of the body everywhere to the name,
 *   mail and link of the body, its row in `Persons.md`,
 *   the columns that name people and every person of my calendars,
 *   see `personRename` in `persons.ts`;
 *   when the body says `dry: true` only checks it, writing nothing.
 * - `GET /api/course/module?module=…&semester=…`: Sends the course of the module of the folder,
 *   like `IN2028_BusinessAnalyticsMachineLearning`, or of the code, like `IN2028`, in the semester,
 *   like `2026W`, that of today while none is named:
 *   its boxes, its series, the groups of its tutorials,
 *   the folders of its material and its plan, see `course.ts`.
 * - `POST /api/course/series`:
 *   Changes the series of the body by its rule and the states of its boxes, as its form typed them,
 *   and sends its boxes after the change;
 *   when the body says `dry: true` only sends what the change would make, writing nothing,
 *   for the preview of the form.
 * - `POST /api/course/mine`:
 *   Makes the group of the body mine, my boxes of its type from its next session on going to it,
 *   or with no group takes my group back, my open boxes of its type from today on going,
 *   and sends the boxes of the series after it;
 *   when the body says `dry: true` only sends what that would make.
 * - `POST /api/course/pick`:
 *   Picks the session of the body, its module, type, group and start, for its week,
 *   the box of that week going to it, or with `extra: true` as a box of its own besides it,
 *   see `weekPick` in `course.ts`.
 * - `POST /api/course/exam`: Gives the exam of the body the kind and the times of the body,
 *   see `examSet` in `course.ts`.
 * - `PUT /api/course/groups`:
 *   Writes the group of the body into the plan of its module, in place of one of the same type,
 *   group and semester, and sends its identifier.
 * - `POST /api/course/groups`:
 *   Makes or changes the group of the body as the form of a series typed it, its slots, place,
 *   tutors, weeks and the dates I cancelled, and sends its sessions after it,
 *   see `groupApply` in `course.ts`;
 *   when the body says `dry: true` only sends what it would make, writing nothing,
 *   for the preview of the form.
 * - `POST /api/course/session`: Changes the session of a group of the body alone,
 *   as the university changed it, its times and its room, see `sessionApply` in `course.ts`.
 * - `DELETE /api/course/groups?module=…&type=…&group=…&semester=…`:
 *   Removes the group from the plan of the module.
 * - `DELETE /api/course/series?module=…&type=…&semester=…`:
 *   Removes my series of the type from the plan of the module, but its boxes done,
 *   and sends how many of them stay, see `courseSeriesRemove` in `course.ts`.
 * - `GET /api/notes/modules`:
 *   Sends every module with its chapters and notes and the semester it stands under,
 *   in the order of the menu of the scripts view, those of the semester first.
 * - `GET /api/notes/note?path=…`: Sends a note with the files its links lead to.
 * - `GET /api/theme`: Sends the colors of my code blocks from the theme of my editor,
 *   see `codeColorsRead` in `theme.ts`.
 * - `GET /api/notes/file?path=…`: Sends a file of my modules, like an image of a note.
 * - `GET /api/notes/stream?path=…`: Streams a file of my modules,
 *   like a PDF of a folder, piece by piece as it is read, read only, see `fileOpen` in `notes.ts`.
 * - `GET /api/notes/folder?path=…`:
 *   Sends the folders and files of a folder of my modules, for its view.
 * - `POST /api/notes/folder`:
 *   Makes the folder of the body in the folder of its module,
 *   with the folders on the way to it that are missing, see `folderMake` in `notes.ts`;
 *   nothing for one that is there.
 * - `POST /api/notes/module`:
 *   Makes the empty folder of the new module named in the body in `NomSkillingmodules`,
 *   see `moduleMake` in `notes.ts`.
 * - `GET /api/notes/broken`:
 *   Sends the links that lead nowhere in the notes of the semester, each with its note.
 * - `PUT /api/edit/note`: Writes note of my modules of the body, its change kept as a diff,
 *   merged with a change of its file since the editor read it,
 *   and sends it back as written, see `Written` in `edit.ts`.
 * - `GET /api/edit/tree`: Sends the tree of `NomManageplannings` for the editor,
 *   without my old system, read only.
 * - `GET /api/edit/file?path=…`: Sends a file of the folders of my new system, Markdown or `.ics`.
 * - `PUT /api/edit/file`: Writes Markdown file of the body into the folders of my new system,
 *   without a diff, merged with a change of its file since the editor read it,
 *   and sends it back as written.
 * - `GET /api/skill/tasks`: Sends the modules with their tasks,
 *   when each is due, every module folder, and the types, for Learn,
 *   which shows the boxes of today it writes first.
 * - `GET /api/skill/module?code=…`:
 *   Sends the chapters and documents of the skill of the name, none for a project.
 * - `GET /api/skill/file?path=…`:
 *   Sends a file a skill entry links, by its path from `NomWorkspace`, read only.
 * - `POST /api/skill/attempt`: Writes the result of the cold Task of the body
 *   into the line `X-ROUND` of its section in the skill entry of the moment.
 * - `POST /api/skill/round`:
 *   Writes where I am in a round, a line `X-ROUND` of the body, into the skill entry of the moment.
 * - `GET /api/skill/opened?path=…`:
 *   Sends the block I opened last in the section of the note, see {@link openedBlocks}.
 * - `POST /api/skill/opened`: Keeps the block of the body as the one I opened in its section.
 * - `POST /api/skill/entry`: Writes skill entry of the body into the log.
 * - `PATCH /api/skill/entry`:
 *   Changes skill entry of the body, adding its new attempts to the lines of their sections,
 *   refused with 409 when its file changed it since the dialog opened it.
 * - `GET /api/skill/session?module=…`: Sends the session of the module running now, or `null`.
 * - `GET /api/food/search?q=…&page=…&products=…`:
 *   Sends my foods for a name or barcode, the most eaten first,
 *   then a page of those of Open Food Facts, none for `products=0`.
 * - `POST /api/food/foods`: Adds food of the body to `Foods.md` and sends it as written.
 * - `PATCH /api/food/foods`: Renames food of the body wherever it stands and sends it as written.
 * - `DELETE /api/food/foods?name=…&brand=…&store=…`: Removes the food from `Foods.md`.
 * - `GET /api/food/day?date=…`: Sends the meals of the date with what they give.
 * - `GET /api/food/meals`: Sends my meals of `Meals.md`, each with its foods and what it gave.
 * - `POST /api/food/meals`: Writes the meal of the body, its name and foods,
 *   and where sent its short title and the standard grams of its foods, into `Meals.md`,
 *   new or changed, and sends all my meals.
 * - `PATCH /api/food/meals`:
 *   Renames the meal of the body, its old name and its new one,
 *   wherever it stands, and sends all my meals.
 * - `DELETE /api/food/meals?meal=…`: Removes the meal from `Meals.md` and sends all my meals.
 * - `GET /api/sport/day?date=…`:
 *   Sends the sessions of the date with what they took, and my weight on it.
 * - `POST /api/sport/weight`:
 *   Writes my weight of the day of the body into `Weights.md` and sends the sessions of the day.
 * - `GET /api/sport/mine`: Sends my workouts, exercises and videos, and the kinds of a video.
 * - `POST /api/sport/workouts`: Writes the workout of the body, its name and parts,
 *   and where sent its old name, into `Workouts.md`, new or changed, and sends all of mine.
 * - `DELETE /api/sport/workouts?name=…`:
 *   Removes the workout from `Workouts.md` and sends all of mine.
 * - `GET /api/sport/video?link=…`:
 *   Asks YouTube for the title and channel of the link and sends them.
 * - `POST /api/sport/videos`:
 *   Writes the video of the body into `Videos.md`, new or changed, and sends all of mine.
 * - `DELETE /api/sport/videos?link=…&title=…`:
 *   Removes the video from `Videos.md` and from my workouts, and sends all of mine.
 * - `POST /api/sport/exercises`:
 *   Adds the exercise of the body, a variant of its own, to `Exercises.md` and sends all of mine.
 * - `PATCH /api/sport/exercises`:
 *   Writes the new sets, repetitions and kilograms of the variant of the body,
 *   as it was, into `Exercises.md` and my workouts, and sends all of mine.
 * - `DELETE /api/sport/exercises?name=…&sets=…&reps=…&kg=…`:
 *   Removes the variant from `Exercises.md` and from my workouts, and sends all of mine.
 * - `POST /api/devices`: Writes what the device of the body shows of the page into `Devices.md`,
 *   the device named by Tailscale from the address `tailscale serve` adds to the request.
 * - `GET /api/changes`: Keeps the answer open and tells each change of a file of my new system
 *   as it comes, see `changes.ts`.
 * - Any other address: Hands request to the page.
 *
 * A request as the page sends it:
 *
 * ```
 * GET /api/day/log?start=2026-07-03T00%3A00%3A00%2B02%3A00&end=2026-07-04T00%3A00%3A00%2B02%3A00 HTTP/1.1
 * Host: 127.0.0.1:3000
 * ```
 *
 * @param page - Vite, answers requests for the page
 * @param request - Request from the browser
 * @param response - Answer to the browser
 * @throws {unknown} - Error of the chosen answer thrown again
 */
async function requestHandle(
    page: ViteDevServer,
    request: IncomingMessage,
    response: ServerResponse,
): Promise<void> {
    const url: URL = new URL(request.url ?? "/", "http://localhost");
    const start: string = url.searchParams.get("start") ?? "";
    const end: string = url.searchParams.get("end") ?? "";
    const date: string = url.searchParams.get("date") ?? "";
    const now: string = url.searchParams.get("now") ?? "";
    const path: string = url.searchParams.get("path") ?? "";

    if (request.method === "GET" && url.pathname === "/api/day/log") {
        responseSend(response, 200, dayEntriesRead(start, end));
    } else if (request.method === "GET" && url.pathname === "/api/day/now") {
        responseSend(response, 200, entryNowRead());
    } else if (request.method === "GET" && url.pathname === "/api/day/all") {
        responseSend(response, 200, logAllRead());
    } else if (request.method === "GET" && url.pathname === "/api/day/boxes") {
        suggestionsWrite();
        responseSend(response, 200, boxesRead(start, end));
    } else if (request.method === "GET" && url.pathname === "/api/day/carried") {
        suggestionsWrite();
        responseSend(response, 200, boxesCarried(date));
    } else if (request.method === "GET" && url.pathname === "/api/day/box") {
        responseSend(response, 200, boxFind(url.searchParams.get("id") ?? "")[2]);
    } else if (request.method === "GET" && url.pathname === "/api/day/note") {
        responseSend(response, 200, noteRead(date));
    } else if (request.method === "GET" && url.pathname === "/api/day/sections") {
        responseSend(response, 200, sectionsRead(date));
    } else if (request.method === "GET" && url.pathname === "/api/day/categories") {
        responseSend(response, 200, categoriesRead(now));
    } else if (request.method === "GET" && url.pathname === "/api/day/last-place") {
        responseSend(response, 200, lastPlaceRead(url.searchParams.get("before") ?? ""));
    } else if (request.method === "GET" && url.pathname === "/api/day/plain") {
        responseSend(response, 200, plainRead(url.searchParams.get("id") ?? ""));
    } else if (request.method === "GET" && url.pathname === "/api/day/trackers") {
        responseSend(response, 200, trackersRead(date));
    } else if (request.method === "GET" && url.pathname === "/api/day/real") {
        responseSend(
            response,
            200,
            realMinutesRead(
                url.searchParams.get("category") ?? "",
                url.searchParams.get("title") ?? "",
                url.searchParams.get("module") ?? "",
                url.searchParams.get("type") ?? "",
            ),
        );
    } else if (request.method === "POST" && url.pathname === "/api/day/log") {
        const id: string = entryAdd((await json(request)) as EntryNew);
        entryShare(id);
        responseSend(response, 200, id);
    } else if (request.method === "PATCH" && url.pathname === "/api/day/log") {
        const change: EntryChange = (await json(request)) as EntryChange;
        const before: Attendee[] = attendeesRead(change.id);
        const written: boolean = entryEdit(change);
        if (written) entryShare(change.id, before);
        responseSend(response, written ? 200 : 409, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/moved") {
        entryMove((await json(request)) as EntryMoved);
        responseSend(response, 200, null);
    } else if (request.method === "DELETE" && url.pathname === "/api/day/log") {
        entryDelete(url.searchParams.get("id") ?? "");
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/boxes") {
        const id: string = boxAdd((await json(request)) as BoxNew);
        const box: Box = boxFind(id)[2];
        if (box.module !== "" && box.type !== "")
            numbersRenew(box.module, box.type, box.semester || semesterOf(box.day));
        responseSend(response, 200, id);
    } else if (request.method === "PATCH" && url.pathname === "/api/day/boxes") {
        boxEdit((await json(request)) as BoxChange);
        responseSend(response, 200, null);
    } else if (request.method === "DELETE" && url.pathname === "/api/day/boxes") {
        boxDelete(url.searchParams.get("id") ?? "");
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/repeat") {
        const planned: Planned[] | null = repeatApply((await json(request)) as RepeatChange);
        responseSend(response, planned === null ? 409 : 200, planned);
    } else if (request.method === "POST" && url.pathname === "/api/day/plain") {
        responseSend(response, 200, plainApply((await json(request)) as PlainChange));
    } else if (request.method === "DELETE" && url.pathname === "/api/day/plain") {
        plainRemove(url.searchParams.get("id") ?? "");
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/logged") {
        const id: string = boxLog((await json(request)) as BoxLogged);
        entryShare(id);
        responseSend(response, 200, id);
    } else if (request.method === "POST" && url.pathname === "/api/day/undone") {
        boxUndo(((await json(request)) as { box: string }).box);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/pushed") {
        boxPush(((await json(request)) as { box: string }).box);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/dropped") {
        const dropped: { box: string; dropped: boolean } = (await json(request)) as {
            box: string;
            dropped: boolean;
        };
        boxDrop(dropped.box, dropped.dropped);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/university") {
        const marked: { box: string; cancelled: boolean } = (await json(request)) as {
            box: string;
            cancelled: boolean;
        };
        boxUniversity(marked.box, marked.cancelled);
        const box: Box = boxFind(marked.box)[2];
        if (box.group !== "")
            numbersRenew(box.module, box.type, box.semester || semesterOf(box.day));
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/submitted") {
        const ticked: { box: string; submitted: boolean } = (await json(request)) as {
            box: string;
            submitted: boolean;
        };
        boxSubmit(ticked.box, ticked.submitted);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/sections") {
        sectionWrite((await json(request)) as SectionNew);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/gifts") {
        giftWrite((await json(request)) as Gift);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/places") {
        const place: Place = placeAdd((await json(request)) as Place);
        listShare({ call: "placeAdd", with: place });
        responseSend(response, 200, place);
    } else if (request.method === "PATCH" && url.pathname === "/api/day/places") {
        const sent: PlaceChanged = (await json(request)) as PlaceChanged;
        const place: Place = placeChange(sent);
        listShare({ call: "placeChange", with: sent });
        responseSend(response, 200, place);
    } else if (request.method === "POST" && url.pathname === "/api/day/renamed") {
        const changed: PlaceChanged | null = placeRename((await json(request)) as PlaceRenamed);
        if (changed !== null) listShare({ call: "placeChange", with: changed });
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/standard") {
        placeStandardSet(String(((await json(request)) as { name?: string }).name ?? ""));
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/day/online") {
        const platform: Platform = platformAdd((await json(request)) as Platform);
        listShare({ call: "platformAdd", with: platform });
        responseSend(response, 200, platform);
    } else if (request.method === "PATCH" && url.pathname === "/api/day/online") {
        const sent: PlatformChanged = (await json(request)) as PlatformChanged;
        const platform: Platform = platformChange(sent);
        listShare({ call: "platformChange", with: sent });
        responseSend(response, 200, platform);
    } else if (request.method === "GET" && url.pathname === "/api/persons") {
        responseSend(response, 200, personsRead());
    } else if (request.method === "POST" && url.pathname === "/api/persons/renamed") {
        personRename(
            (await json(request)) as PersonRenamed,
            (old: string, name: string, mail: string, dry: boolean): number =>
                attendeesRename([{ folder: calendarRoot, ending: ".ics" }], old, name, mail, dry),
        );
        responseSend(response, 200, null);
    } else if (request.method === "GET" && url.pathname === "/api/course/module") {
        responseSend(
            response,
            200,
            courseRead(
                url.searchParams.get("module") ?? "",
                url.searchParams.get("semester") ?? "",
            ),
        );
    } else if (request.method === "POST" && url.pathname === "/api/course/series") {
        responseSend(response, 200, seriesApply((await json(request)) as SeriesChange));
    } else if (request.method === "POST" && url.pathname === "/api/course/mine") {
        responseSend(response, 200, groupMine((await json(request)) as MineChange));
    } else if (request.method === "POST" && url.pathname === "/api/course/pick") {
        weekPick((await json(request)) as PickChange);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/course/exam") {
        examSet((await json(request)) as ExamChange);
        responseSend(response, 200, null);
    } else if (request.method === "PUT" && url.pathname === "/api/course/groups") {
        responseSend(response, 200, groupPut((await json(request)) as GroupNew));
    } else if (request.method === "POST" && url.pathname === "/api/course/groups") {
        responseSend(response, 200, groupApply((await json(request)) as GroupChange));
    } else if (request.method === "POST" && url.pathname === "/api/course/session") {
        sessionApply((await json(request)) as SessionChange);
        responseSend(response, 200, null);
    } else if (request.method === "DELETE" && url.pathname === "/api/course/groups") {
        groupRemove({
            module: url.searchParams.get("module") ?? "",
            type: url.searchParams.get("type") ?? "",
            group: url.searchParams.get("group") ?? "",
            semester: url.searchParams.get("semester") ?? "",
        });
        responseSend(response, 200, null);
    } else if (request.method === "DELETE" && url.pathname === "/api/course/series") {
        responseSend(
            response,
            200,
            courseSeriesRemove({
                module: url.searchParams.get("module") ?? "",
                type: url.searchParams.get("type") ?? "",
                semester: url.searchParams.get("semester") ?? "",
            }),
        );
    } else if (request.method === "POST" && url.pathname === "/api/devices") {
        await deviceReport(
            (await json(request)) as DeviceReport,
            String(request.headers["x-forwarded-for"] ?? ""),
        );
        responseSend(response, 200, null);
    } else if (request.method === "GET" && url.pathname === "/api/changes") {
        changesSend(response);
    } else if (request.method === "GET" && url.pathname === "/api/notes/modules") {
        responseSend(response, 200, menuRead());
    } else if (request.method === "GET" && url.pathname === "/api/notes/note") {
        responseSend(response, 200, linkedNoteRead(path));
    } else if (request.method === "GET" && url.pathname === "/api/theme") {
        responseSend(response, 200, codeColorsRead());
    } else if (request.method === "GET" && url.pathname === "/api/notes/file") {
        fileSend(response, fileRead(path), path.split("/").at(-1) ?? path);
    } else if (request.method === "GET" && url.pathname === "/api/notes/stream") {
        await fileStream(response, fileOpen(path), path.split("/").at(-1) ?? path);
    } else if (request.method === "GET" && url.pathname === "/api/notes/folder") {
        responseSend(response, 200, folderRead(path));
    } else if (request.method === "POST" && url.pathname === "/api/notes/folder") {
        folderMake(((await json(request)) as { path: string }).path);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/notes/module") {
        moduleMake(((await json(request)) as { folder: string }).folder);
        responseSend(response, 200, null);
    } else if (request.method === "GET" && url.pathname === "/api/notes/broken") {
        responseSend(response, 200, brokenLinksRead());
    } else if (request.method === "PUT" && url.pathname === "/api/edit/note") {
        responseSend(response, 200, noteWrite((await json(request)) as NoteChange));
    } else if (request.method === "GET" && url.pathname === "/api/edit/tree") {
        responseSend(response, 200, treeRead());
    } else if (request.method === "GET" && url.pathname === "/api/edit/file") {
        responseSend(response, 200, systemFileRead(path));
    } else if (request.method === "PUT" && url.pathname === "/api/edit/file") {
        responseSend(response, 200, systemFileWrite((await json(request)) as NoteChange));
    } else if (request.method === "GET" && url.pathname === "/api/skill/tasks") {
        suggestionsWrite();
        responseSend(response, 200, skillingRead());
    } else if (request.method === "GET" && url.pathname === "/api/skill/module") {
        responseSend(response, 200, moduleRead(url.searchParams.get("code") ?? ""));
    } else if (request.method === "GET" && url.pathname === "/api/skill/file") {
        fileSend(response, linkedFileRead(path), path.split("/").at(-1) ?? path);
    } else if (request.method === "POST" && url.pathname === "/api/skill/attempt") {
        attemptAdd((await json(request)) as AttemptNew);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/skill/round") {
        roundAdd((await json(request)) as RoundNew);
        responseSend(response, 200, null);
    } else if (request.method === "GET" && url.pathname === "/api/skill/opened") {
        responseSend(response, 200, openedBlocks.get(path) ?? "");
    } else if (request.method === "POST" && url.pathname === "/api/skill/opened") {
        const opened: { path: string; heading: string } = (await json(request)) as {
            path: string;
            heading: string;
        };
        openedBlocks.set(opened.path, opened.heading);
        responseSend(response, 200, null);
    } else if (request.method === "POST" && url.pathname === "/api/skill/entry") {
        entryShare(skillEntryAdd((await json(request)) as SkillEntryNew));
        responseSend(response, 200, null);
    } else if (request.method === "PATCH" && url.pathname === "/api/skill/entry") {
        const change: SkillEntryChange = (await json(request)) as SkillEntryChange;
        const before: Attendee[] = attendeesRead(change.id);
        const written: boolean = skillEntryEdit(change);
        if (written) entryShare(change.id, before);
        responseSend(response, written ? 200 : 409, null);
    } else if (request.method === "GET" && url.pathname === "/api/skill/session") {
        responseSend(response, 200, sessionRead(url.searchParams.get("module") ?? ""));
    } else if (request.method === "GET" && url.pathname === "/api/food/search") {
        responseSend(
            response,
            200,
            await foodsFind(
                url.searchParams.get("q") ?? "",
                Number(url.searchParams.get("page") ?? "1"),
                url.searchParams.get("products") !== "0",
            ),
        );
    } else if (request.method === "POST" && url.pathname === "/api/food/foods") {
        const added: Food = foodAdd((await json(request)) as Food);
        listShare({ call: "foodAdd", with: added });
        responseSend(response, 200, added);
    } else if (request.method === "PATCH" && url.pathname === "/api/food/foods") {
        const sent: FoodChanged = (await json(request)) as FoodChanged;
        const changed: Food = foodChange(sent);
        listShare({ call: "foodChange", with: sent });
        responseSend(response, 200, changed);
    } else if (request.method === "DELETE" && url.pathname === "/api/food/foods") {
        const removed: { name: string; brand: string; store: string } = {
            name: url.searchParams.get("name") ?? "",
            brand: url.searchParams.get("brand") ?? "",
            store: url.searchParams.get("store") ?? "",
        };
        foodRemove(removed);
        listShare({ call: "foodRemove", with: removed });
        responseSend(response, 200, null);
    } else if (request.method === "GET" && url.pathname === "/api/food/day") {
        responseSend(response, 200, foodDayRead(date));
    } else if (request.method === "GET" && url.pathname === "/api/food/meals") {
        responseSend(response, 200, dishesRead());
    } else if (request.method === "POST" && url.pathname === "/api/food/meals") {
        const sent: { name?: string; foods?: string[]; short?: string; grams?: (number | null)[] } =
            (await json(request)) as {
                name?: string;
                foods?: string[];
                short?: string;
                grams?: (number | null)[];
            };
        const dishes: Dish[] = dishAdd(sent);
        listShare({ call: "mealAdd", with: sent });
        responseSend(response, 200, dishes);
    } else if (request.method === "PATCH" && url.pathname === "/api/food/meals") {
        const sent: { old?: string; name?: string } = (await json(request)) as {
            old?: string;
            name?: string;
        };
        const dishes: Dish[] = dishRename(sent);
        listShare({ call: "mealRename", with: sent });
        responseSend(response, 200, dishes);
    } else if (request.method === "DELETE" && url.pathname === "/api/food/meals") {
        const meal: string = url.searchParams.get("meal") ?? "";
        const dishes: Dish[] = dishRemove(meal);
        listShare({ call: "mealRemove", with: meal });
        responseSend(response, 200, dishes);
    } else if (request.method === "GET" && url.pathname === "/api/sport/day") {
        responseSend(response, 200, sportDayRead(date));
    } else if (request.method === "POST" && url.pathname === "/api/sport/weight") {
        responseSend(
            response,
            200,
            weightSave((await json(request)) as { day?: string; kg?: unknown }),
        );
    } else if (request.method === "GET" && url.pathname === "/api/sport/mine") {
        responseSend(response, 200, mineRead());
    } else if (request.method === "POST" && url.pathname === "/api/sport/workouts") {
        responseSend(
            response,
            200,
            workoutSave(
                (await json(request)) as { old?: string; name?: string; parts?: unknown[] },
            ),
        );
    } else if (request.method === "DELETE" && url.pathname === "/api/sport/workouts") {
        responseSend(response, 200, workoutRemove(url.searchParams.get("name") ?? ""));
    } else if (request.method === "GET" && url.pathname === "/api/sport/video") {
        responseSend(response, 200, await videoFind(url.searchParams.get("link") ?? ""));
    } else if (request.method === "POST" && url.pathname === "/api/sport/videos") {
        responseSend(
            response,
            200,
            videoSave(
                (await json(request)) as {
                    title?: string;
                    channel?: string;
                    minutes?: unknown;
                    kind?: string;
                    link?: string;
                    oldLink?: string;
                    oldTitle?: string;
                },
            ),
        );
    } else if (request.method === "DELETE" && url.pathname === "/api/sport/videos") {
        responseSend(
            response,
            200,
            videoRemove({
                link: url.searchParams.get("link") ?? "",
                title: url.searchParams.get("title") ?? "",
            }),
        );
    } else if (request.method === "POST" && url.pathname === "/api/sport/exercises") {
        responseSend(
            response,
            200,
            exerciseAdd(
                (await json(request)) as {
                    name?: string;
                    sets?: string;
                    reps?: string;
                    kg?: string;
                },
            ),
        );
    } else if (request.method === "PATCH" && url.pathname === "/api/sport/exercises") {
        responseSend(
            response,
            200,
            exerciseChange(
                (await json(request)) as {
                    old?: { name?: string; sets?: string; reps?: string; kg?: string };
                    sets?: string;
                    reps?: string;
                    kg?: string;
                },
            ),
        );
    } else if (request.method === "DELETE" && url.pathname === "/api/sport/exercises") {
        responseSend(
            response,
            200,
            exerciseRemove({
                name: url.searchParams.get("name") ?? "",
                sets: url.searchParams.get("sets") ?? "",
                reps: url.searchParams.get("reps") ?? "",
                kg: url.searchParams.get("kg") ?? "",
            }),
        );
    } else {
        page.middlewares(request, response);
    }
}

const server: Server = createServer();
const page: ViteDevServer = await pageCreate(server);
server.on("request", (request: IncomingMessage, response: ServerResponse): void => {
    requestHandle(page, request, response).catch((error: unknown): void => {
        console.error(new Date().toISOString(), request.method, request.url, error);
        if (response.headersSent) response.end();
        else responseSend(response, 500, { error: "The reader failed" });
    });
});
/**
 * Port of the reader: environment variable `NOM_PORT` when set,
 * like `3003` for a reader on a sample vault, else `3000`.
 */
const port: number = Number(process.env.NOM_PORT ?? 3000);
server.listen(port, "127.0.0.1", (): void => console.log(`http://127.0.0.1:${port}`));
linksCheckStart();
notesStart();
changesWatch();
sharedStart();
