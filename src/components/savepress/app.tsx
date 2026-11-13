import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowUp,
  ChevronLeft,
  Coins,
  Download,
  FolderOpen,
  LockOpen,
  Play,
  Search,
  Stamp,
} from "lucide-react";
import {
  collect,
  confidenceLabel,
  countRoles,
  parseBytes,
  parseText,
  planStamp,
  SAMPLE_RECIPES,
  SAMPLE_TEXT,
  sampleSave,
  serialize,
  serializeBytes,
  withOverrides,
  type Json,
  type Leaf,
  type Loaded,
  type RecipeEdit,
  type Role,
} from "@/lib/savepress/engine";
import {
  isAndroid,
  launchHref,
  loadGames,
  markPendingLaunch,
  packageProblem,
  saveGames,
  scoreSaveName,
  takePendingLaunch,
  type GameLink,
} from "@/lib/savepress/games";
import {
  canPickDirectory,
  deleteLinkHandles,
  hasLiveHandle,
  pickSaveDirectory,
  readLinkedFile,
  rememberLive,
  saveLinkHandles,
  scanDirectory,
  writeLinked,
  type FoundSave,
} from "@/lib/savepress/handles";
import {
  deleteStored,
  grantConsent,
  hasConsent,
  listFiles,
  loadRecipes,
  putFile,
  saveRecipes,
  type StoredFile,
  type UserRecipe,
} from "@/lib/savepress/storage";

type Screen = "consent" | "home" | "editor" | "backups";

type Draft = {
  loaded: Loaded;
  overrides: Record<string, number | boolean>;
  rawText: string;
  gameId?: string;
};

type Diff = {
  path: string;
  key: string;
  from: number | boolean;
  value: number | boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  money: "Money",
  unlock: "Locks",
  upgrade: "Upgrades",
  other: "Other",
};

export function SavepressApp() {
  const [screen, setScreen] = useState<Screen>("consent");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [games, setGames] = useState<GameLink[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkPackage, setLinkPackage] = useState("");
  const [found, setFound] = useState<FoundSave[] | null>(null);
  const [linkDir, setLinkDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<UserRecipe | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const ingestRef = useRef<(file: File, recipe: UserRecipe | null, gameId?: string) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    if (hasConsent()) setScreen("home");
    setRecipes(loadRecipes());
    setGames(loadGames());
    void refreshFiles();

    const onBack = () => {
      if (document.visibilityState === "hidden") return;
      const id = takePendingLaunch();
      if (!id) return;
      const game = loadGames().find((item) => item.id === id);
      if (!game) return;
      void readLinkedFile(game).then((file) => {
        if (!file) {
          setStatus(`${game.name} is linked, but this browser needs the folder again.`);
          setScreen("home");
          return;
        }
        void ingestRef.current(file, null, game.id);
      });
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("pageshow", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("pageshow", onBack);
    };
  }, []);

  async function refreshFiles() {
    try {
      setFiles(await listFiles());
    } catch {
      setFiles([]);
    }
  }

  function accept() {
    grantConsent();
    setScreen("home");
  }

  function openLoaded(
    loaded: Loaded,
    overrides: Record<string, number | boolean>,
    note: string,
    gameId?: string,
  ) {
    setDraft({ loaded, overrides, rawText: loaded.originalText, gameId });
    setStatus(note);
    setScreen("editor");
    if (loaded.format !== "binary" && loaded.originalText) {
      void putFile({
        id: `recent:${loaded.name}`,
        kind: "recent",
        name: loaded.name,
        at: Date.now(),
        text: loaded.originalText,
        format: loaded.format,
      }).then(refreshFiles);
    }
  }

  function openSample(edits?: RecipeEdit[], title?: string) {
    const loaded = parseText("wayhouse-save.json", SAMPLE_TEXT);
    const overrides: Record<string, number | boolean> = {};
    for (const edit of edits ?? []) overrides[edit.path] = edit.value;
    openLoaded(
      loaded,
      overrides,
      title
        ? `${title} is staged on the Wayhouse sample. Download it to keep the file.`
        : "Wayhouse sample is open. Stamp it, or change a field, then download.",
    );
  }

  async function ingest(file: File, recipe: UserRecipe | null, gameId?: string) {
    if (file.size > 8_000_000) {
      setStatus("That file is over 8 MB. Open a smaller save.");
      setScreen("home");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loaded = parseBytes(file.name || "save.json", bytes);
    if (!loaded.data) {
      openLoaded(
        loaded,
        {},
        loaded.warnings?.[0] ??
          "This looks like a binary save. Savepress only rewrites text saves — JSON, preferences XML, or key=value.",
        gameId,
      );
      return;
    }
    const overrides: Record<string, number | boolean> = {};
    let note = `Opened ${loaded.name}.`;
    if (recipe && loaded.data) {
      const leaves = collect(loaded.data).leaves;
      let hits = 0;
      for (const edit of recipe.edits) {
        const targets = leaves.filter((leaf) =>
          recipe.match === "path"
            ? leaf.path === edit.path
            : leaf.key.toLowerCase() === edit.key.toLowerCase(),
        );
        for (const target of targets) {
          overrides[target.path] = edit.value;
          hits++;
        }
      }
      note = hits
        ? `Applied “${recipe.title}” to ${hits} field${hits === 1 ? "" : "s"}.`
        : `“${recipe.title}” didn’t match any fields in this file.`;
    } else if (recipe && !loaded.data) {
      note = "That file isn’t a structured save, so the recipe had nothing to match.";
    }
    if (loaded.warnings?.length) {
      note = `${note} ${loaded.warnings[0]}`;
    }
    openLoaded(loaded, overrides, note, gameId);
  }

  ingestRef.current = ingest;

  function rememberGames(next: GameLink[]) {
    setGames(next);
    saveGames(next);
  }

  async function findSaves() {
    const name = linkName.trim();
    if (!name) {
      setStatus("Name the game first.");
      return;
    }
    const problem = packageProblem(linkPackage);
    if (problem) {
      setStatus(problem);
      return;
    }
    if (!canPickDirectory()) {
      folderRef.current?.setAttribute("webkitdirectory", "");
      folderRef.current?.click();
      return;
    }
    try {
      const dir = await pickSaveDirectory();
      const saves = await scanDirectory(dir);
      if (!saves.length) {
        setStatus("No save-like files in that folder. Try the folder that holds the game's files.");
        return;
      }
      setLinkDir(dir);
      setFound(saves);
      setStatus("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(error instanceof Error ? error.message : "Couldn't open that folder.");
    }
  }

  function foundFromFolder(list: FileList) {
    const saves = [...list]
      .map((file) => ({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        score: scoreSaveName(file.name),
        file,
      }))
      .filter((item) => item.score > 0 && item.size <= 8_000_000)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, 24);
    if (!saves.length) {
      setStatus("No save-like files in that folder.");
      return;
    }
    setLinkDir(null);
    setFound(saves);
    setStatus("");
  }

  async function chooseSave(item: FoundSave) {
    const id = crypto.randomUUID();
    const game: GameLink = {
      id,
      name: linkName.trim(),
      packageId: linkPackage.trim(),
      savePath: item.path,
      fileName: item.name,
      linkedAt: Date.now(),
    };
    if (item.handle) {
      rememberLive(id, item.handle);
      await saveLinkHandles(id, item.handle, linkDir);
    }
    rememberGames([game, ...games]);
    setLinking(false);
    setFound(null);
    setLinkDir(null);
    const file = item.file ?? (await item.handle?.getFile());
    if (!file) {
      setStatus("That file couldn't be read.");
      return;
    }
    await ingest(file, null, item.handle ? id : undefined);
  }

  function launchGame(game: GameLink) {
    if (!game.packageId) {
      setStatus("Add the Android package name on this game to launch it.");
      return;
    }
    const problem = packageProblem(game.packageId);
    if (problem) {
      setStatus(problem);
      return;
    }
    if (!isAndroid()) {
      setStatus("Launch opens the game on an Android phone. On this screen, open the linked save.");
      return;
    }
    markPendingLaunch(game.id);
    window.location.href = launchHref(game.packageId);
  }

  async function openGame(game: GameLink) {
    const file = await readLinkedFile(game);
    if (!file) {
      setStatus(`The link to ${game.fileName} expired. Find that folder again.`);
      setLinkName(game.name);
      setLinkPackage(game.packageId);
      setLinking(true);
      return;
    }
    await ingest(file, null, game.id);
  }

  const recents = files.filter((file) => file.kind === "recent");
  const backups = files.filter((file) => file.kind === "backup");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-label="Choose a save file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void ingest(file, pendingRecipe);
          setPendingRecipe(null);
        }}
      />
      <input
        ref={folderRef}
        type="file"
        className="sr-only"
        multiple
        aria-label="Choose the game folder"
        onChange={(event) => {
          const list = event.target.files;
          event.target.value = "";
          if (list && list.length) foundFromFolder(list);
        }}
      />
      {screen === "consent" && <Consent onAccept={accept} />}
      {screen === "home" && (
        <Home
          recents={recents}
          recipes={recipes}
          games={games}
          linking={linking}
          linkName={linkName}
          linkPackage={linkPackage}
          found={found}
          status={status}
          backupCount={backups.length}
          onOpen={() => {
            setPendingRecipe(null);
            fileRef.current?.click();
          }}
          onSample={openSample}
          onRecipe={(recipe) => {
            setPendingRecipe(recipe);
            fileRef.current?.click();
          }}
          onRecent={(file) => openLoaded(loadStored(file), {}, `Reopened ${file.name}.`)}
          onBackups={() => setScreen("backups")}
          onDeleteRecipe={(id) => {
            const next = recipes.filter((recipe) => recipe.id !== id);
            setRecipes(next);
            saveRecipes(next);
          }}
          onStartLink={() => {
            setLinking(true);
            setFound(null);
            setStatus("");
          }}
          onCancelLink={() => {
            setLinking(false);
            setFound(null);
            setLinkDir(null);
          }}
          onLinkName={setLinkName}
          onLinkPackage={setLinkPackage}
          onFind={() => void findSaves()}
          onChoose={(item) => void chooseSave(item)}
          onLaunch={launchGame}
          onOpenGame={(game) => void openGame(game)}
          onRemoveGame={(id) => {
            rememberGames(games.filter((game) => game.id !== id));
            void deleteLinkHandles(id);
          }}
        />
      )}
      {screen === "editor" && draft && (
        <Editor
          draft={draft}
          setDraft={setDraft}
          status={status}
          setStatus={setStatus}
          onBack={() => setScreen("home")}
          onSaveRecipe={(recipe) => {
            const next = [recipe, ...recipes];
            setRecipes(next);
            saveRecipes(next);
          }}
          onDownloaded={refreshFiles}
        />
      )}
      {screen === "backups" && (
        <Backups
          files={backups}
          onBack={() => setScreen("home")}
          onOpen={(file) => openLoaded(loadStored(file), {}, `Restored a backup of ${file.name}.`)}
          onDelete={async (id) => {
            await deleteStored(id);
            await refreshFiles();
          }}
        />
      )}
    </div>
  );
}

function Consent({ onAccept }: { onAccept: () => void }) {
  return (
    <Shell
      side={
        <SideNote
          title="What a stamp changes"
          body="Only fields whose names look like money, a lock, or an upgrade. Everything else stays put until you edit it."
        />
      }
    >
      <Mark />
      <h1 className="mt-6 font-display text-4xl leading-tight text-balance">A stamp for save files.</h1>
      <p className="mt-3 max-w-prose text-pretty text-muted">
        Open a save you already have. Raise the money, lift the locks, top out the upgrades, then
        download the file and put it back.
      </p>
      <Plate data={sampleSave()} caption="Wayhouse sample, before a stamp" />
      <ul className="mt-6 grid gap-3">
        <Rule title="Single-player files only" body="Saves from games you play offline, on this phone." />
        <Rule title="Not banks, wallets, or logins" body="Never point this at money, payments, or accounts." />
        <Rule title="Not online games" body="A stamped multiplayer save is how accounts get banned." />
      </ul>
      <button type="button" className="btn-primary mt-6 w-full" onClick={onAccept}>
        Open the bench
      </button>
    </Shell>
  );
}

function GamesShelf({
  games,
  linking,
  linkName,
  linkPackage,
  found,
  onStartLink,
  onCancelLink,
  onLinkName,
  onLinkPackage,
  onFind,
  onChoose,
  onLaunch,
  onOpenGame,
  onRemoveGame,
}: {
  games: GameLink[];
  linking: boolean;
  linkName: string;
  linkPackage: string;
  found: FoundSave[] | null;
  onStartLink: () => void;
  onCancelLink: () => void;
  onLinkName: (value: string) => void;
  onLinkPackage: (value: string) => void;
  onFind: () => void;
  onChoose: (item: FoundSave) => void;
  onLaunch: (game: GameLink) => void;
  onOpenGame: (game: GameLink) => void;
  onRemoveGame: (id: string) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">Your games</h2>
      {games.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {games.map((game) => (
            <li key={game.id} className="card">
              <div className="truncate font-medium">{game.name}</div>
              <p className="truncate text-sm text-muted">{game.savePath}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-primary" onClick={() => onLaunch(game)}>
                  <Play className="size-4" aria-hidden="true" />
                  Launch
                </button>
                <button type="button" className="btn-ghost" onClick={() => onOpenGame(game)}>
                  Open save
                </button>
              </div>
              <button type="button" className="btn-quiet mt-1 w-full" onClick={() => onRemoveGame(game.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {!linking && (
        <button type="button" className="btn-ghost mt-3 w-full" onClick={onStartLink}>
          Link a game
        </button>
      )}
      {linking && !found && (
        <div className="card mt-3">
          <label className="block text-sm text-muted" htmlFor="game-name">
            Game name
          </label>
          <input
            id="game-name"
            className="field mt-1 w-full"
            value={linkName}
            onChange={(event) => onLinkName(event.target.value)}
            placeholder="Wayhouse"
          />
          <label className="mt-3 block text-sm text-muted" htmlFor="game-package">
            Android package
          </label>
          <input
            id="game-package"
            className="field mt-1 w-full"
            value={linkPackage}
            onChange={(event) => onLinkPackage(event.target.value)}
            placeholder="com.studio.game"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="mt-2 text-sm text-pretty text-muted">
            Find the save folder once. Launch opens the game, and coming back reloads that file.
          </p>
          <button type="button" className="btn-primary mt-3 w-full" onClick={onFind}>
            <FolderOpen className="size-5" aria-hidden="true" />
            Find saves
          </button>
          <button type="button" className="btn-quiet mt-1 w-full" onClick={onCancelLink}>
            Cancel
          </button>
        </div>
      )}
      {found && (
        <div className="card mt-3">
          <h3 className="font-display text-xl">Which file is the save?</h3>
          <ul className="mt-2 divide-y divide-line">
            {found.map((item) => (
              <li key={item.path}>
                <button type="button" className="w-full py-3 text-left" onClick={() => onChoose(item)}>
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {item.path} · {item.size.toLocaleString()} bytes
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-quiet mt-2 w-full" onClick={onCancelLink}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

function Home({
  recents,
  recipes,
  games,
  linking,
  linkName,
  linkPackage,
  found,
  status,
  backupCount,
  onOpen,
  onSample,
  onRecipe,
  onRecent,
  onBackups,
  onDeleteRecipe,
  onStartLink,
  onCancelLink,
  onLinkName,
  onLinkPackage,
  onFind,
  onChoose,
  onLaunch,
  onOpenGame,
  onRemoveGame,
}: {
  recents: StoredFile[];
  recipes: UserRecipe[];
  games: GameLink[];
  linking: boolean;
  linkName: string;
  linkPackage: string;
  found: FoundSave[] | null;
  status: string;
  backupCount: number;
  onOpen: () => void;
  onSample: (edits?: RecipeEdit[], title?: string) => void;
  onRecipe: (recipe: UserRecipe) => void;
  onRecent: (file: StoredFile) => void;
  onBackups: () => void;
  onDeleteRecipe: (id: string) => void;
  onStartLink: () => void;
  onCancelLink: () => void;
  onLinkName: (value: string) => void;
  onLinkPackage: (value: string) => void;
  onFind: () => void;
  onChoose: (item: FoundSave) => void;
  onLaunch: (game: GameLink) => void;
  onOpenGame: (game: GameLink) => void;
  onRemoveGame: (id: string) => void;
}) {
  return (
    <Shell
      side={
        <SideNote
          title="On a phone"
          body="Link the game once and point at its save folder. Launch opens the game. When you come back, Savepress reloads that save if the browser kept the permission."
        />
      }
    >
      <Mark />
      <h1 className="mt-6 font-display text-4xl leading-tight text-balance">Launch the game. Keep the save.</h1>
      <p className="mt-3 text-pretty text-muted">
        Link a game, then launch it. Savepress reloads the save you pointed at and stamps money, locks, and upgrades.
      </p>
      {status && <p className="mt-3 text-pretty text-sm text-copper">{status}</p>}
      <GamesShelf
        games={games}
        linking={linking}
        linkName={linkName}
        linkPackage={linkPackage}
        found={found}
        onStartLink={onStartLink}
        onCancelLink={onCancelLink}
        onLinkName={onLinkName}
        onLinkPackage={onLinkPackage}
        onFind={onFind}
        onChoose={onChoose}
        onLaunch={onLaunch}
        onOpenGame={onOpenGame}
        onRemoveGame={onRemoveGame}
      />
      <button type="button" className="btn-primary mt-6 w-full" onClick={onOpen}>
        <FolderOpen className="size-5" aria-hidden="true" />
        Open a save file
      </button>
      <section className="card mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-balance">Wayhouse sample</h2>
            <p className="mt-1 text-sm text-pretty text-muted">
              A tiny stall save, so you can try a stamp before you bring your own file.
            </p>
          </div>
          <Stamp className="size-5 shrink-0 text-copper" aria-hidden="true" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SAMPLE_RECIPES.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              className="btn-ghost min-h-12"
              onClick={() => onSample(recipe.edits, recipe.title)}
            >
              {recipe.title}
            </button>
          ))}
        </div>
        <button type="button" className="btn-quiet mt-2 w-full" onClick={() => onSample()}>
          Open the sample without a stamp
        </button>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-xl">Your recipes</h2>
        {recipes.length === 0 ? (
          <p className="mt-2 text-sm text-pretty text-muted">
            Stamp a file, then save those edits as a recipe. Next time, apply it to a new save in one tap.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{recipe.title}</div>
                  <div className="text-sm text-muted">
                    {recipe.edits.length} fields · match {recipe.match === "key" ? "name" : "path"}
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={() => onRecipe(recipe)}>
                  Use
                </button>
                <button type="button" className="btn-quiet" onClick={() => onDeleteRecipe(recipe.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {recents.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-xl">Recent files</h2>
          <ul className="mt-3 grid gap-2">
            {recents.map((file) => (
              <li key={file.id}>
                <button type="button" className="card w-full text-left" onClick={() => onRecent(file)}>
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-sm text-muted">{formatWhen(file.at)}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" className="btn-quiet mt-6 w-full" onClick={onBackups}>
        <Archive className="size-5" aria-hidden="true" />
        Backups{backupCount ? ` (${backupCount})` : ""}
      </button>
    </Shell>
  );
}

function Editor({
  draft,
  setDraft,
  status,
  setStatus,
  onBack,
  onSaveRecipe,
  onDownloaded,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  status: string;
  setStatus: (status: string) => void;
  onBack: () => void;
  onSaveRecipe: (recipe: UserRecipe) => void;
  onDownloaded: () => Promise<void>;
}) {
  const [maxMoney, setMaxMoney] = useState("999999999");
  const [maxLevel, setMaxLevel] = useState("99");
  const [useMoney, setUseMoney] = useState(true);
  const [useUnlocks, setUseUnlocks] = useState(true);
  const [useUpgrades, setUseUpgrades] = useState(true);
  const [query, setQuery] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeMatch, setRecipeMatch] = useState<"key" | "path">("key");
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const searchId = useId();
  const compareRef = useRef<HTMLInputElement>(null);

  const collected = useMemo(
    () =>
      draft.loaded.data
        ? collect(draft.loaded.data, { tags: draft.loaded.tags })
        : { leaves: [] as Leaf[], truncated: false },
    [draft.loaded],
  );
  const leaves = collected.leaves;
  const counts = countRoles(leaves);
  const changeCount = Object.keys(draft.overrides).length;

  const preview = useMemo(() => {
    if (!draft.loaded.data) return null;
    return withOverrides(draft.loaded.data, draft.overrides);
  }, [draft]);

  function setOverride(path: string, value: number | boolean, original: number | boolean) {
    const next = { ...draft.overrides };
    if (value === original) delete next[path];
    else next[path] = value;
    setDraft({ ...draft, overrides: next });
  }

  function applyStamp() {
    const money = Number(maxMoney.replace(/,/g, ""));
    const level = Number(maxLevel);
    if (!Number.isFinite(money) || money < 0) {
      setStatus("Enter a money amount.");
      return;
    }
    if (!Number.isInteger(level) || level < 1) {
      setStatus("Enter a whole upgrade level.");
      return;
    }
    const plan = planStamp(leaves, {
      money: useMoney,
      unlocks: useUnlocks,
      upgrades: useUpgrades,
      maxMoney: money,
      maxLevel: level,
    });
    const keys = Object.keys(plan);
    setDraft({ ...draft, overrides: { ...draft.overrides, ...plan } });
    setStatus(
      keys.length
        ? `Staged ${keys.length} change${keys.length === 1 ? "" : "s"}. Download to keep the file.`
        : "Nothing matched that stamp. Try the other fields, or raise the amounts.",
    );
  }

  async function onCompareFile(file: File) {
    if (!draft.loaded.data) {
      setStatus("Open a structured save before comparing.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const other = parseBytes(file.name, bytes);
    if (!other.data) {
      setStatus("The other file isn’t a structured save.");
      return;
    }
    const right = new Map(collect(other.data).leaves.map((leaf) => [leaf.path, leaf]));
    const next = leaves
      .filter((leaf) => {
        const match = right.get(leaf.path);
        return match !== undefined && match.value !== leaf.value;
      })
      .map((leaf) => ({
        path: leaf.path,
        key: leaf.key,
        from: leaf.value,
        value: right.get(leaf.path)!.value,
      }));
    setDiffs(next);
    setStatus(
      next.length
        ? `${next.length} field${next.length === 1 ? "" : "s"} differ. Use the ones you want, then download.`
        : "Those two files match on every shared field.",
    );
  }

  async function download() {
    try {
      if (draft.loaded.writable === false) {
        setStatus(draft.loaded.warnings?.[0] ?? "Savepress won't change this file, so it stays intact.");
        return;
      }
      const originalBackup =
        draft.loaded.originalBytes && draft.loaded.originalBytes.length
          ? bytesToB64(draft.loaded.originalBytes)
          : draft.loaded.originalText;
      let payload: string | Uint8Array = draft.rawText;
      if (draft.loaded.format === "binary" && draft.loaded.data) {
        payload = serializeBytes(draft.loaded, withOverrides(draft.loaded.data, draft.overrides));
      } else if (draft.loaded.format !== "text" && draft.loaded.data) {
        payload = serialize(draft.loaded, withOverrides(draft.loaded.data, draft.overrides));
      }
      if (typeof payload === "string" && draft.gameId && (await writeLinked(draft.gameId, payload))) {
        if (originalBackup) {
          await putFile({
            id: `backup:${draft.loaded.name}:${Date.now()}`,
            kind: "backup",
            name: draft.loaded.name,
            at: Date.now(),
            text: originalBackup,
            format: draft.loaded.format,
          });
          await onDownloaded();
        }
        setStatus("Wrote the stamp back into the game's save. Open the game to see it.");
        return;
      }
      if (typeof payload === "string") downloadText(draft.loaded.name || "save.json", payload);
      else downloadBytes(draft.loaded.name || "save.dat", payload);
      if (originalBackup) {
        await putFile({
          id: `backup:${draft.loaded.name}:${Date.now()}`,
          kind: "backup",
          name: draft.loaded.name,
          at: Date.now(),
          text: originalBackup,
          format: draft.loaded.format,
        });
        await onDownloaded();
      }
      setStatus("Downloaded. The original is kept in Backups. Put the file back where the game reads it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not build that file.");
    }
  }

  function saveRecipe() {
    const entries = Object.entries(draft.overrides);
    if (!entries.length) {
      setStatus("Stamp or edit something first, then save the recipe.");
      return;
    }
    const title = recipeTitle.trim() || `Stamp ${new Date().toLocaleDateString()}`;
    onSaveRecipe({
      id: crypto.randomUUID(),
      title,
      match: recipeMatch,
      created: Date.now(),
      edits: entries.map(([path, value]) => ({
        path,
        key: leaves.find((leaf) => leaf.path === path)?.key ?? path.split(".").pop() ?? path,
        value,
      })),
    });
    setRecipeTitle("");
    setStatus(`Saved recipe “${title}”. Use it from the bench on the next file.`);
  }

  const needle = query.trim().toLowerCase();
  const visible = leaves.filter((leaf) => {
    if (leaf.role === "other" && !showOther && !needle) return false;
    if (!needle) return true;
    return (
      leaf.path.toLowerCase().includes(needle) ||
      leaf.key.toLowerCase().includes(needle) ||
      ROLE_LABEL[leaf.role].toLowerCase().includes(needle)
    );
  });

  return (
    <Shell
      side={
        preview ? (
          <Plate data={preview} caption={changeCount ? `${changeCount} staged` : "No staged changes"} />
        ) : (
          <SideNote title={draft.loaded.format} body="Nothing structured to preview in this file." />
        )
      }
    >
      <button type="button" className="btn-quiet -ml-3" onClick={onBack}>
        <ChevronLeft className="size-5" aria-hidden="true" />
        Bench
      </button>
      <h1 className="mt-2 truncate font-display text-3xl text-balance">{draft.loaded.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {formatLabel(draft.loaded)}
        {draft.loaded.byteLength ? ` · ${draft.loaded.byteLength.toLocaleString()} bytes` : ""}
        {draft.loaded.data
          ? ` · ${counts.money} money · ${counts.unlock} locks · ${counts.upgrade} upgrades`
          : ""}
      </p>
      {status && <p className="mt-3 text-pretty text-sm text-copper">{status}</p>}
      {draft.loaded.warnings?.map((warning) => (
        <p key={warning} className="mt-2 text-pretty text-sm text-copper">
          {warning}
        </p>
      ))}

      {draft.loaded.format === "binary" && draft.loaded.binaryPreview && (
        <pre className="card mt-4 overflow-x-auto font-mono text-xs leading-5 text-ink">{draft.loaded.binaryPreview}</pre>
      )}

      {draft.loaded.format === "text" && (
        <textarea
          className="field mt-4 min-h-64 w-full font-mono text-sm"
          value={draft.rawText}
          onChange={(event) => setDraft({ ...draft, rawText: event.target.value })}
          aria-label="Save text"
        />
      )}

      {draft.loaded.data && (
        <>
          <section className="card mt-4">
            <h2 className="font-display text-xl">Stamp</h2>
            <div className="mt-3 grid gap-3">
              <Toggle
                icon={<Coins className="size-4" aria-hidden="true" />}
                label="Max money"
                checked={useMoney}
                onChange={setUseMoney}
                extra={
                  <input
                    className="field w-32 text-right tabular-nums"
                    inputMode="numeric"
                    aria-label="Money amount"
                    value={maxMoney}
                    onChange={(event) => setMaxMoney(event.target.value)}
                  />
                }
              />
              <Toggle
                icon={<LockOpen className="size-4" aria-hidden="true" />}
                label="Unlock"
                checked={useUnlocks}
                onChange={setUseUnlocks}
              />
              <Toggle
                icon={<ArrowUp className="size-4" aria-hidden="true" />}
                label="Max upgrades"
                checked={useUpgrades}
                onChange={setUseUpgrades}
                extra={
                  <input
                    className="field w-24 text-right tabular-nums"
                    inputMode="numeric"
                    aria-label="Upgrade level"
                    value={maxLevel}
                    onChange={(event) => setMaxLevel(event.target.value)}
                  />
                }
              />
            </div>
            <button type="button" className="btn-primary mt-4 w-full" onClick={applyStamp}>
              <Stamp className="size-5" aria-hidden="true" />
              Apply stamp
            </button>
          </section>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              id={searchId}
              className="field w-full pl-9"
              placeholder="Find a field"
              aria-label="Find a field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {collected.truncated && (
            <p className="mt-2 text-sm text-muted">Showing the first 4,000 fields.</p>
          )}
          <FieldGroups leaves={visible} overrides={draft.overrides} onChange={setOverride} />
          {!showOther && counts.other > 0 && !needle && (
            <button type="button" className="btn-quiet mt-3 w-full" onClick={() => setShowOther(true)}>
              Show other fields ({counts.other})
            </button>
          )}

          {diffs.length > 0 && (
            <section className="card mt-4">
              <h2 className="font-display text-xl">Compared</h2>
              <ul className="mt-2 divide-y divide-line">
                {diffs.map((diff) => (
                  <li key={diff.path} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{diff.key}</div>
                      <div className="truncate text-sm text-muted tabular-nums">
                        {String(diff.from)} → {String(diff.value)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setOverride(diff.path, diff.value, diff.from)}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card mt-4">
            <h2 className="font-display text-xl">Save as a recipe</h2>
            <p className="mt-1 text-sm text-pretty text-muted">
              Keeps the staged values. Matching by name works when the next save uses the same field names.
            </p>
            <input
              className="field mt-3 w-full"
              placeholder="Recipe name"
              aria-label="Recipe name"
              value={recipeTitle}
              onChange={(event) => setRecipeTitle(event.target.value)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={recipeMatch === "key" ? "btn-ghost ring-2 ring-copper" : "btn-ghost"}
                onClick={() => setRecipeMatch("key")}
              >
                Match name
              </button>
              <button
                type="button"
                className={recipeMatch === "path" ? "btn-ghost ring-2 ring-copper" : "btn-ghost"}
                onClick={() => setRecipeMatch("path")}
              >
                Match path
              </button>
            </div>
            <button type="button" className="btn-quiet mt-2 w-full" onClick={saveRecipe}>
              Save recipe
            </button>
          </section>
        </>
      )}

      <div className="-mx-5 mt-6 flex gap-2 border-t border-line px-5 py-3">
        {draft.loaded.format !== "binary" && draft.loaded.data && (
          <button type="button" className="btn-quiet flex-1" onClick={() => compareRef.current?.click()}>
            Compare
          </button>
        )}
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => void download()}
          disabled={draft.loaded.writable === false}
        >
          <Download className="size-5" aria-hidden="true" />
          {draft.gameId && hasLiveHandle(draft.gameId) ? "Save into the game" : changeCount ? "Download stamped" : "Download"}
        </button>
      </div>
      <input
        ref={compareRef}
        type="file"
        className="sr-only"
        aria-label="Choose a save to compare"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onCompareFile(file);
        }}
      />
      {draft.loaded.format === "json" && (
        <p className="mt-2 text-sm text-pretty text-muted">
          JSON is rewritten with normal spacing. If a game is picky about the exact old layout, it may refuse the file.
        </p>
      )}
    </Shell>
  );
}

function FieldGroups({
  leaves,
  overrides,
  onChange,
}: {
  leaves: Leaf[];
  overrides: Record<string, number | boolean>;
  onChange: (path: string, value: number | boolean, original: number | boolean) => void;
}) {
  const order: Role[] = ["money", "unlock", "upgrade", "other"];
  return (
    <div className="mt-4 grid gap-4">
      {order.map((role) => {
        const group = leaves
          .filter((leaf) => leaf.role === role)
          .sort((a, b) => (role === "money" ? (b.confidence ?? 0) - (a.confidence ?? 0) : 0));
        if (!group.length) return null;
        return (
          <section key={role}>
            <h2 className="text-sm font-medium tracking-wide text-muted uppercase">{ROLE_LABEL[role]}</h2>
            <ul className="card mt-2 divide-y divide-line px-4 py-0">
              {group.map((leaf) => {
                const value = overrides[leaf.path] ?? leaf.value;
                const dirty = value !== leaf.value;
                return (
                  <li key={leaf.path} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{leaf.key}</div>
                      <div className="truncate text-sm text-muted">{leaf.path}</div>
                      {leaf.role === "money" && leaf.confidence > 0 && (
                        <div className="text-sm text-muted">{confidenceLabel(leaf.confidence)}</div>
                      )}
                      {leaf.warning && <div className="text-sm text-copper">{leaf.warning}</div>}
                      {dirty && (
                        <div className="text-sm text-copper tabular-nums">was {String(leaf.value)}</div>
                      )}
                    </div>
                    {typeof value === "boolean" ? (
                      <button
                        type="button"
                        className={value ? "btn-ghost" : "btn-quiet"}
                        onClick={() => onChange(leaf.path, !value, leaf.value)}
                      >
                        {value ? "On" : "Off"}
                      </button>
                    ) : (
                      <input
                        className="field w-28 text-right tabular-nums"
                        inputMode="decimal"
                        aria-label={leaf.path}
                        value={String(value)}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) onChange(leaf.path, next, leaf.value as number);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Backups({
  files,
  onBack,
  onOpen,
  onDelete,
}: {
  files: StoredFile[];
  onBack: () => void;
  onOpen: (file: StoredFile) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Shell
      side={
        <SideNote
          title="Originals"
          body="Every download stores the file as it was when you opened it. Backups stay in this browser."
        />
      }
    >
      <button type="button" className="btn-quiet -ml-3" onClick={onBack}>
        <ChevronLeft className="size-5" aria-hidden="true" />
        Bench
      </button>
      <h1 className="mt-2 font-display text-4xl text-balance">Backups</h1>
      {files.length === 0 ? (
        <p className="mt-3 text-pretty text-muted">
          Nothing saved yet. A backup is kept the first time you download a stamped file.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {files.map((file) => (
            <li key={file.id} className="card flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-sm text-muted">{formatWhen(file.at)}</div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => onOpen(file)}>
                Open
              </button>
              <button type="button" className="btn-quiet" onClick={() => onDelete(file.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Plate({ data, caption }: { data: Json; caption: string }) {
  const leaves = collect(data).leaves;
  const money = leaves.filter((leaf) => leaf.role === "money").slice(0, 4);
  const locks = leaves.filter((leaf) => leaf.role === "unlock");
  const upgrades = leaves.filter((leaf) => leaf.role === "upgrade").slice(0, 4);
  const open = locks.filter((leaf) =>
    leaf.lockOff ? leaf.value === false || leaf.value === 0 : leaf.value === true || leaf.value === 1,
  ).length;
  return (
    <aside className="card mt-6 lg:mt-0">
      <p className="text-sm text-muted">{caption}</p>
      <dl className="mt-3 grid gap-2">
        {money.map((leaf) => (
          <div key={leaf.path} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted">{leaf.key}</dt>
            <dd className="font-display text-2xl tabular-nums">{formatValue(leaf.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-pretty text-muted">
        {open} of {locks.length} locks open
        {upgrades.length
          ? ` · ${upgrades.map((leaf) => `${fieldName(leaf)} ${leaf.value}`).join(" · ")}`
          : ""}
      </p>
    </aside>
  );
}

function Shell({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 lg:py-12">
      <div className="min-w-0">{children}</div>
      <div className="hidden lg:block">{side}</div>
    </div>
  );
}

function Mark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-paper">
        <Stamp className="size-5" aria-hidden="true" />
      </span>
      <span className="font-display text-xl tracking-tight">Savepress</span>
    </div>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <li className="card">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-sm text-pretty text-muted">{body}</p>
    </li>
  );
}

function SideNote({ title, body }: { title: string; body: string }) {
  return (
    <aside className="card">
      <h2 className="font-display text-2xl text-balance">{title}</h2>
      <p className="mt-2 text-sm text-pretty text-muted">{body}</p>
    </aside>
  );
}

function Toggle({
  icon,
  label,
  checked,
  onChange,
  extra,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={checked ? "btn-ghost flex-1" : "btn-quiet flex-1"}
        onClick={() => onChange(!checked)}
      >
        {icon}
        {label}
      </button>
      {extra}
    </div>
  );
}

function fieldName(leaf: Leaf): string {
  const parts = leaf.path.split(".");
  const key = parts[parts.length - 1] ?? leaf.key;
  if (parts.length >= 2 && /^(level|lvl|unlocked|locked|stars?)$/i.test(key)) {
    return parts[parts.length - 2] ?? leaf.key;
  }
  return leaf.key;
}

function formatValue(value: number | boolean): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return value.toLocaleString();
}

function formatWhen(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(loaded: Loaded): string {
  if (loaded.format === "json") return "JSON";
  if (loaded.format === "prefs") {
    return loaded.prefStyle === "unity" ? "Unity PlayerPrefs" : "Android preferences";
  }
  if (loaded.format === "pairs") return "Key list";
  if (loaded.format === "binary") {
    if (loaded.encrypted) return "Encrypted";
    if (loaded.binaryHits?.length) return "Binary (scanned)";
    return "Binary";
  }
  return "Plain text";
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64ToBytes(value: string): Uint8Array {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function loadStored(file: { name: string; text: string; format: string }): Loaded {
  if (file.format === "binary") {
    try {
      return parseBytes(file.name, b64ToBytes(file.text));
    } catch {
      /* fall through */
    }
  }
  return parseText(file.name, file.text);
}

function downloadBytes(name: string, bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
