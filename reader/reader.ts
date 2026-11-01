/**
 * ## Reader for browser (Node)
 *
 * Start with `npm start`.
 *
 * Reads the vault and answers the browser page with data and with the page itself.
 * It waits at `127.0.0.1:3000`, since `tailscale serve` hands requests there
 * and some servers turn `localhost` into `::1` first.
 * Node reads the disk, only the browser draws.
 * Each module of `reader/` does the work of its area, this file only routes to it.
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
    boxBack,
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
import { placeAdd, placeChange, placeRename, placeStandardSet, platformAdd, platformChange } from "./places.ts";
import { plainApply, plainRead, plainRemove } from "./rules.ts";
import { personRename, personsRead } from "./persons.ts";
import { attendeesRename, paramRename } from "./calendar.ts";
import { calendarRoot } from "./sources.ts";
import { fileOpen, fileRead, folderMake, folderRead, linkedNoteRead, menuRead } from "./notes.ts";
import { skillAdd } from "./skills.ts";
import { noteWrite } from "./edit.ts";
import { systemFileRead, systemFileWrite, treeRead } from "./files.ts";
import { attemptAdd, roundAdd, moduleRead, sessionRead, skillEntryAdd, skillEntryEdit, skillingRead } from "./skill.ts";
import { linksCheckStart } from "./documents.ts";
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
import type { Attendee, ParamRenamed } from "./calendar.ts";
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
 * Sends an answer as JSON, packed as `gzip` when the browser takes it, the categories 31 KB instead of 506 KB.
 * `no-store`, because the files may change any time.
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
 * - `Content-Disposition`: `inline` shows it, a PDF in its own viewer, with its name for the tab and saving.
 * - `Cache-Control`: `no-store`, because it may change any time.
 * - `Content-Security-Policy`: Runs no script of the file, like one inside an `.svg`.
 */
function fileSend(response: ServerResponse, file: NotesFile, name: string): void {
    response.setHeader("Content-Type", file.type);
    response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "script-src 'none'");
    response.end(file.content);
}

/**
 * Streams a file with the headers of {@link fileSend}, so a large book never lies in memory whole.
 * The browser going away, like a tab closed before its PDF loaded, is no error.
 *
 * @throws {Error} - When the file cannot be read to its end
 */
async function fileStream(response: ServerResponse, file: NotesStream, name: string): Promise<void> {
    response.setHeader("Content-Type", file.type);
    response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "script-src 'none'");
    try {
        await pipeline(file.content, response);
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ERR_STREAM_PREMATURE_CLOSE") throw error;
    }
}

/**
 * The heading of the block I opened last in each section by the path of its note, empty for its current step.
 * Kept in memory only, so a reload shows the block again until the reader restarts.
 */
const openedBlocks: Map<string, string> = new Map<string, string>();

/**
 * Handles a request by its method and address, each area under its own path `/api/<area>`.
 * The range of the log comes as FullCalendar sends it, with offset, the range of the plan as days.
 * - `GET /api/day/boxes`, `GET /api/day/carried`: First write the chapters due today into the plan of today.
 * - `GET /api/day/plain?id=…`: The plain series of the `UID` of one of its parts.
 * - `GET /api/day/real`: The minutes the last entries like a box really lasted.
 * - `POST /api/day/log`: Sends the entry to Vu when Vu is in its `With`, as every route that adds one does.
 *   A route that changes an entry sends it once Vu comes into its `With`.
 *   The routes that change my foods, meals, places and platforms send each change to Vu.
 * - `PATCH /api/day/log`, `PATCH /api/skill/entry`: Refused with 409 when its file changed since the dialog opened.
 * - `POST /api/day/moved`: Every other field as its file holds it.
 * - `DELETE /api/day/boxes`: Of one day of a series that day alone.
 * - `POST /api/day/boxes`: Numbers the boxes of its type anew, a tutorial by its week.
 * - `POST /api/day/repeat`: Refused with 409 for a type that has a box in its semester already.
 * - `dry: true` in a body: Only checks, writing nothing, for the preview of the dialog.
 * - `POST /api/day/undone`: Removes the log entry of the box unless it holds what I added since.
 * - `PATCH /api/day/places`: Changes the row alone, `POST /api/day/renamed` the place everywhere.
 * - `GET /api/course/module`: The semester of today while none is named.
 * - `DELETE /api/course/series`: Keeps the boxes done.
 * - `PUT /api/edit/note`: Its change kept as a diff, `PUT /api/edit/file` without.
 * - `POST /api/devices`: The device Tailscale names by the address `tailscale serve` adds.
 * - `GET /api/changes`: Keeps the answer open.
 * - Any other address: Hands the request to the page.
 *
 * @throws {unknown} - The error of the chosen answer thrown again
 */
async function requestHandle(page: ViteDevServer, request: IncomingMessage, response: ServerResponse): Promise<void> {
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
    } else if (request.method === "POST" && url.pathname === "/api/day/back") {
        const back: { box: string; day: string } = (await json(request)) as { box: string; day: string };
        boxBack(back.box, back.day);
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
        if (box.group !== "") numbersRenew(box.module, box.type, box.semester || semesterOf(box.day));
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
    } else if (request.method === "POST" && url.pathname === "/api/day/param-renamed") {
        paramRename((await json(request)) as ParamRenamed);
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
            courseRead(url.searchParams.get("module") ?? "", url.searchParams.get("semester") ?? ""),
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
        await deviceReport((await json(request)) as DeviceReport, String(request.headers["x-forwarded-for"] ?? ""));
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
    } else if (request.method === "PUT" && url.pathname === "/api/edit/note") {
        responseSend(response, 200, noteWrite((await json(request)) as NoteChange));
    } else if (request.method === "GET" && url.pathname === "/api/edit/tree") {
        responseSend(response, 200, treeRead());
    } else if (request.method === "GET" && url.pathname === "/api/edit/file") {
        responseSend(response, 200, systemFileRead(path));
    } else if (request.method === "PUT" && url.pathname === "/api/edit/file") {
        responseSend(response, 200, systemFileWrite((await json(request)) as NoteChange));
    } else if (request.method === "GET" && url.pathname === "/api/skill/tasks") {
        responseSend(response, 200, skillingRead());
    } else if (request.method === "GET" && url.pathname === "/api/skill/module") {
        responseSend(response, 200, moduleRead(url.searchParams.get("code") ?? ""));
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
    } else if (request.method === "POST" && url.pathname === "/api/skill/skills") {
        responseSend(response, 200, skillAdd(((await json(request)) as { name: string }).name));
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
        const sent: {
            name?: string;
            foods?: string[];
            short?: string;
            grams?: (number | null)[];
        } = (await json(request)) as {
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
        responseSend(response, 200, weightSave((await json(request)) as { day?: string; kg?: unknown }));
    } else if (request.method === "GET" && url.pathname === "/api/sport/mine") {
        responseSend(response, 200, mineRead());
    } else if (request.method === "POST" && url.pathname === "/api/sport/workouts") {
        responseSend(
            response,
            200,
            workoutSave(
                (await json(request)) as {
                    old?: string;
                    name?: string;
                    parts?: unknown[];
                },
            ),
        );
    } else if (request.method === "DELETE" && url.pathname === "/api/sport/workouts") {
        responseSend(response, 200, workoutRemove(url.searchParams.get("name") ?? ""));
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
/** `NOM_PORT` when set, like for a reader on a sample vault, else `3000`. */
const port: number = Number(process.env.NOM_PORT ?? 3000);
server.listen(port, "127.0.0.1", (): void => console.log(`http://127.0.0.1:${port}`));
linksCheckStart();
notesStart();
changesWatch();
sharedStart();
