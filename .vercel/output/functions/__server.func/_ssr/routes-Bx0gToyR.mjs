import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as LockOpen, c as Coins, d as Archive, i as Play, l as ChevronLeft, n as Stamp, o as FolderOpen, r as Search, s as Download, u as ArrowUp } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bx0gToyR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MAX_LEAVES = 4e3;
var MONEY = /* @__PURE__ */ new Set([
	"gold",
	"coin",
	"coins",
	"money",
	"cash",
	"gem",
	"gems",
	"credit",
	"credits",
	"diamond",
	"diamonds",
	"token",
	"tokens",
	"silver",
	"buck",
	"bucks",
	"dollar",
	"dollars",
	"currency",
	"ruby",
	"rubies",
	"emerald",
	"emeralds",
	"soul",
	"souls",
	"oro",
	"dinero",
	"moneda",
	"monedas",
	"gema",
	"gemas",
	"argent",
	"gemme",
	"gemmes",
	"geld",
	"muenzen",
	"munzen",
	"balance",
	"funds"
]);
var MONEY_PARENT = /* @__PURE__ */ new Set([
	"wallet",
	"purse",
	"bank",
	"currency",
	"money",
	"cash",
	"coins",
	"coin",
	"gold",
	"gems",
	"gem",
	"credits",
	"credit"
]);
var AMOUNT = /* @__PURE__ */ new Set([
	"amount",
	"value",
	"count",
	"qty",
	"quantity",
	"bal",
	"balance"
]);
var UNLOCK_ON = /* @__PURE__ */ new Set([
	"unlocked",
	"owned",
	"purchased",
	"bought",
	"available",
	"opened",
	"complete",
	"completed"
]);
var UNLOCK_OFF = /* @__PURE__ */ new Set(["locked", "sealed"]);
var UPGRADE = /* @__PURE__ */ new Set([
	"level",
	"lvl",
	"upgrade",
	"rank",
	"tier",
	"star",
	"stars",
	"skill",
	"power"
]);
function sampleSave() {
	return {
		purse: {
			coins: 40,
			gems: 2
		},
		stalls: {
			spice: { unlocked: false },
			lantern: { unlocked: false },
			river: { unlocked: false }
		},
		gear: {
			kettle: { level: 1 },
			awning: { level: 1 },
			lockbox: {
				level: 0,
				locked: true
			}
		},
		day: 3
	};
}
var SAMPLE_TEXT = `${JSON.stringify(sampleSave(), null, 2)}\n`;
var SAMPLE_RECIPES = [
	{
		id: "max_money",
		title: "Max money",
		note: "Coins and gems to 9,999,999",
		edits: [{
			path: "purse.coins",
			key: "coins",
			value: 9999999
		}, {
			path: "purse.gems",
			key: "gems",
			value: 9999999
		}]
	},
	{
		id: "unlock",
		title: "Unlock stalls",
		note: "Opens every stall and the lockbox",
		edits: [
			{
				path: "stalls.spice.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "stalls.lantern.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "stalls.river.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "gear.lockbox.locked",
				key: "locked",
				value: false
			}
		]
	},
	{
		id: "max_gear",
		title: "Max gear",
		note: "Kettle, awning, and lockbox to level 10",
		edits: [
			{
				path: "gear.kettle.level",
				key: "level",
				value: 10
			},
			{
				path: "gear.awning.level",
				key: "level",
				value: 10
			},
			{
				path: "gear.lockbox.level",
				key: "level",
				value: 10
			}
		]
	},
	{
		id: "works",
		title: "The works",
		note: "Money, stalls, and gear in one stamp",
		edits: [
			{
				path: "purse.coins",
				key: "coins",
				value: 9999999
			},
			{
				path: "purse.gems",
				key: "gems",
				value: 9999999
			},
			{
				path: "stalls.spice.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "stalls.lantern.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "stalls.river.unlocked",
				key: "unlocked",
				value: true
			},
			{
				path: "gear.lockbox.locked",
				key: "locked",
				value: false
			},
			{
				path: "gear.kettle.level",
				key: "level",
				value: 10
			},
			{
				path: "gear.awning.level",
				key: "level",
				value: 10
			},
			{
				path: "gear.lockbox.level",
				key: "level",
				value: 10
			}
		]
	}
];
function tokensOf(key) {
	return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).map((part) => part.toLowerCase()).filter(Boolean);
}
function classify(key, parentKey, value) {
	const tokens = tokensOf(key);
	const parent = tokensOf(parentKey);
	if ((tokens.some((token) => MONEY.has(token)) || tokens.some((token) => AMOUNT.has(token)) && parent.some((token) => MONEY_PARENT.has(token))) && typeof value === "number") return {
		role: "money",
		lockOff: false
	};
	if (tokens.some((token) => UNLOCK_ON.has(token))) return {
		role: "unlock",
		lockOff: false
	};
	if (tokens.some((token) => UNLOCK_OFF.has(token))) return {
		role: "unlock",
		lockOff: true
	};
	if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1e5 && tokens.some((token) => UPGRADE.has(token))) return {
		role: "upgrade",
		lockOff: false
	};
	return {
		role: "other",
		lockOff: false
	};
}
function collect(data) {
	const leaves = [];
	let truncated = false;
	const walk = (node, path, key, parentKey) => {
		if (truncated) return;
		if (typeof node === "number" && Number.isFinite(node)) {
			const found = classify(key, parentKey, node);
			leaves.push({
				path,
				key,
				value: node,
				...found
			});
		} else if (typeof node === "boolean") {
			const found = classify(key, parentKey, node);
			leaves.push({
				path,
				key,
				value: node,
				...found
			});
		} else if (Array.isArray(node)) for (let i = 0; i < node.length; i++) {
			if (leaves.length >= MAX_LEAVES) {
				truncated = true;
				return;
			}
			walk(node[i], `${path}[${i}]`, String(i), key);
		}
		else if (node && typeof node === "object") for (const [childKey, child] of Object.entries(node)) {
			if (leaves.length >= MAX_LEAVES) {
				truncated = true;
				return;
			}
			const childPath = path ? `${path}.${childKey}` : childKey;
			walk(child, childPath, childKey, key);
		}
	};
	walk(data, "", "", "");
	return {
		leaves,
		truncated
	};
}
function suggest(leaf, settings) {
	if (leaf.role === "money" && settings.money && typeof leaf.value === "number") {
		if (leaf.value < 0 || leaf.value > 0x5af3107a4000) return void 0;
		if (leaf.value >= settings.maxMoney) return void 0;
		return settings.maxMoney;
	}
	if (leaf.role === "unlock" && settings.unlocks) {
		if (typeof leaf.value === "boolean") return leaf.lockOff ? false : true;
		if (leaf.value === 0 || leaf.value === 1) return leaf.lockOff ? 0 : 1;
	}
	if (leaf.role === "upgrade" && settings.upgrades && typeof leaf.value === "number") {
		if (leaf.value >= settings.maxLevel) return void 0;
		return settings.maxLevel;
	}
}
function planStamp(leaves, settings) {
	const overrides = {};
	for (const leaf of leaves) {
		const next = suggest(leaf, settings);
		if (next === void 0 || next === leaf.value) continue;
		overrides[leaf.path] = next;
	}
	return overrides;
}
function parsePath(path) {
	const out = [];
	const re = /([^[.\]]+)|\[(\d+)\]/g;
	let match;
	while (match = re.exec(path)) if (match[1] !== void 0) out.push(match[1]);
	else out.push(Number(match[2]));
	return out;
}
function setPath(root, path, value) {
	const segs = parsePath(path);
	if (segs.length === 0) return false;
	let cur = root;
	for (let i = 0; i < segs.length - 1; i++) {
		const seg = segs[i];
		if (typeof seg === "number") {
			if (!Array.isArray(cur) || cur[seg] == null) return false;
			cur = cur[seg];
		} else {
			if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
			if (!(seg in cur)) return false;
			cur = cur[seg];
		}
	}
	const last = segs[segs.length - 1];
	if (typeof last === "number") {
		if (!Array.isArray(cur)) return false;
		cur[last] = value;
		return true;
	}
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
	cur[last] = value;
	return true;
}
function withOverrides(data, overrides) {
	const next = structuredClone(data);
	for (const [path, value] of Object.entries(overrides)) setPath(next, path, value);
	return next;
}
function isBinary(bytes) {
	const n = Math.min(bytes.length, 8e3);
	for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
	return false;
}
function hexPreview(bytes, max = 192) {
	const n = Math.min(bytes.length, max);
	const lines = [];
	for (let i = 0; i < n; i += 16) {
		const slice = bytes.subarray(i, Math.min(i + 16, n));
		const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
		const ascii = [...slice].map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : ".").join("");
		lines.push(`${i.toString(16).padStart(4, "0")}  ${hex.padEnd(47, " ")}  ${ascii}`);
	}
	if (bytes.length > max) lines.push(`… ${bytes.length - max} more bytes`);
	return lines.join("\n");
}
function escapeXml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;");
}
function unescapeXml(value) {
	return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&apos;", "'");
}
function parsePrefs(text) {
	if (!/<map[\s>]/i.test(text)) return null;
	const data = {};
	const tags = {};
	const re = /<(int|long|float|boolean|string)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
	let match;
	let found = 0;
	while (match = re.exec(text)) {
		const tag = match[1].toLowerCase();
		const attrs = match[2] ?? "";
		const nameMatch = attrs.match(/\bname\s*=\s*"([^"]*)"/);
		if (!nameMatch) continue;
		const name = unescapeXml(nameMatch[1]);
		const valueAttr = attrs.match(/\bvalue\s*=\s*"([^"]*)"/);
		const raw = valueAttr ? unescapeXml(valueAttr[1]) : unescapeXml(match[3] ?? "");
		tags[name] = tag;
		if (tag === "boolean") data[name] = raw === "true";
		else if (tag === "string") data[name] = raw;
		else {
			const num = Number(raw);
			data[name] = Number.isFinite(num) ? num : raw;
		}
		found++;
	}
	if (found === 0) return null;
	return {
		data,
		tags
	};
}
function parsePairs(text) {
	const lines = text.split(/\r?\n/);
	const data = {};
	let matched = 0;
	let filled = 0;
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
		filled++;
		const match = trimmed.match(/^([A-Za-z_][\w.-]*)\s*[=:]\s*(.*)$/);
		if (!match) continue;
		matched++;
		data[match[1]] = coerceScalar(match[2].trim());
	}
	if (filled < 2 || matched / filled < .8) return null;
	return data;
}
function coerceScalar(raw) {
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (/^-?\d+(\.\d+)?$/.test(raw)) {
		const num = Number(raw);
		if (Number.isFinite(num)) return num;
	}
	return raw;
}
function parseText(name, text) {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) try {
		return {
			name,
			format: "json",
			originalText: text,
			data: JSON.parse(trimmed),
			tags: {}
		};
	} catch {}
	const prefs = parsePrefs(text);
	if (prefs) return {
		name,
		format: "prefs",
		originalText: text,
		data: prefs.data,
		tags: prefs.tags
	};
	const pairs = parsePairs(text);
	if (pairs) return {
		name,
		format: "pairs",
		originalText: text,
		data: pairs,
		tags: {}
	};
	return {
		name,
		format: "text",
		originalText: text,
		data: null,
		tags: {}
	};
}
function serializePrefs(data, tags) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("This preferences file can't be rebuilt.");
	const lines = ["<?xml version='1.0' encoding='utf-8' standalone='yes' ?>", "<map>"];
	for (const [name, value] of Object.entries(data)) {
		const tag = tags[name] ?? (typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : Number.isInteger(value) ? "int" : "float");
		if (tag === "string") lines.push(`    <string name="${escapeXml(name)}">${escapeXml(String(value))}</string>`);
		else {
			const printed = typeof value === "boolean" ? String(value) : String(value);
			lines.push(`    <${tag} name="${escapeXml(name)}" value="${escapeXml(printed)}" />`);
		}
	}
	lines.push("</map>", "");
	return lines.join("\n");
}
function serializePairs(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("This key list can't be rebuilt.");
	return `${Object.entries(data).map(([key, value]) => `${key}=${String(value)}`).join("\n")}\n`;
}
function serialize(loaded, data) {
	if (loaded.format === "prefs") return serializePrefs(data, loaded.tags);
	if (loaded.format === "pairs") return serializePairs(data);
	return `${JSON.stringify(data, null, 2)}\n`;
}
function countRoles(leaves) {
	return {
		money: leaves.filter((leaf) => leaf.role === "money").length,
		unlock: leaves.filter((leaf) => leaf.role === "unlock").length,
		upgrade: leaves.filter((leaf) => leaf.role === "upgrade").length,
		other: leaves.filter((leaf) => leaf.role === "other").length
	};
}
var GAMES_KEY = "savepress.games";
var PENDING = "savepress.pendingLaunch";
var DENY = [
	"bank",
	"wallet",
	"paypal",
	"venmo",
	"cashapp",
	"coinbase",
	"binance",
	"authenticator",
	"1password",
	"bitwarden",
	"lastpass"
];
var ASSET = /\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|webm|atlas|ttf|otf|woff2?|so|dex|pak|unity3d|bundle|assets|resource)$/i;
function scoreSaveName(name) {
	const lower = name.toLowerCase();
	if (ASSET.test(lower)) return -1;
	let score = 0;
	if (/\.(json|xml|txt|sav|cfg|ini|pref|prefs)$/.test(lower)) score += 3;
	if (/(save|slot|player|prefs|persistent|progress|profile|userdata)/.test(lower)) score += 5;
	if (lower.endsWith(".data") && /(save|persistent|player|game)/.test(lower)) score += 4;
	return score;
}
function packageProblem(packageId) {
	const pkg = packageId.trim();
	if (!pkg) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(pkg)) return "Package names look like com.studio.game.";
	const lower = pkg.toLowerCase();
	if (DENY.some((word) => lower.includes(word))) return "Savepress won't open banking or login apps.";
	return null;
}
function launchHref(packageId) {
	const problem = packageProblem(packageId);
	if (problem || !packageId.trim()) throw new Error(problem || "Add the Android package name.");
	return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${packageId.trim()};end`;
}
function isAndroid() {
	return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}
function loadGames() {
	try {
		const raw = localStorage.getItem(GAMES_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function saveGames(list) {
	localStorage.setItem(GAMES_KEY, JSON.stringify(list));
}
function markPendingLaunch(id) {
	sessionStorage.setItem(PENDING, id);
}
function takePendingLaunch() {
	const id = sessionStorage.getItem(PENDING);
	if (!id) return null;
	sessionStorage.removeItem(PENDING);
	return id;
}
var RECIPE_KEY = "savepress.recipes";
var CONSENT_KEY = "savepress.consent";
function openDb() {
	return openSaveDb();
}
function openSaveDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open("savepress", 2);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
			if (!db.objectStoreNames.contains("links")) db.createObjectStore("links", { keyPath: "id" });
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("Could not open storage"));
	});
}
function requestDone$1(req) {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("Storage request failed"));
	});
}
function hasConsent() {
	return localStorage.getItem(CONSENT_KEY) === "1";
}
function grantConsent() {
	localStorage.setItem(CONSENT_KEY, "1");
}
function loadRecipes() {
	try {
		const raw = localStorage.getItem(RECIPE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function saveRecipes(list) {
	localStorage.setItem(RECIPE_KEY, JSON.stringify(list));
}
async function listFiles() {
	const db = await openDb();
	try {
		return (await requestDone$1(db.transaction("files", "readonly").objectStore("files").getAll())).sort((a, b) => b.at - a.at);
	} finally {
		db.close();
	}
}
async function putFile(file) {
	const db = await openDb();
	try {
		const tx = db.transaction("files", "readwrite");
		const store = tx.objectStore("files");
		store.put(file);
		const getAll = store.getAll();
		getAll.onsuccess = () => {
			const rows = getAll.result.filter((row) => row.kind === file.kind).sort((a, b) => b.at - a.at);
			const cap = file.kind === "backup" ? 12 : 8;
			for (const extra of rows.slice(cap)) store.delete(extra.id);
		};
		await new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("Could not store the file"));
			tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("Storage aborted"));
		});
	} finally {
		db.close();
	}
}
async function deleteStored(id) {
	const db = await openDb();
	try {
		const tx = db.transaction("files", "readwrite");
		tx.objectStore("files").delete(id);
		await new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("Could not delete"));
		});
	} finally {
		db.close();
	}
}
function asDir(dir) {
	return dir;
}
function asAccess(handle) {
	return handle;
}
var live = /* @__PURE__ */ new Map();
function canPickDirectory() {
	return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
async function pickSaveDirectory() {
	const picker = window.showDirectoryPicker;
	if (!picker) throw new Error("This browser can't remember a folder.");
	return picker({ mode: "readwrite" });
}
async function scanDirectory(dir) {
	const found = [];
	await walk(asDir(dir), "", 0, found);
	return found.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 24);
}
async function walk(dir, prefix, depth, found) {
	if (depth > 3 || found.length >= 80) return;
	for await (const [name, entry] of dir.entries()) {
		if (found.length >= 80) return;
		if (name.startsWith(".")) continue;
		const path = prefix ? `${prefix}/${name}` : name;
		if (entry.kind === "file") {
			const score = scoreSaveName(name);
			if (score < 0) continue;
			const file = await entry.getFile();
			if (file.size > 8e6 || score === 0) continue;
			found.push({
				name,
				path,
				size: file.size,
				score,
				handle: entry
			});
		} else await walk(entry, path, depth + 1, found);
	}
}
function rememberLive(id, handle) {
	live.set(id, handle);
}
function hasLiveHandle(id) {
	return live.has(id);
}
async function saveLinkHandles(id, fileHandle, dirHandle) {
	if (fileHandle) live.set(id, fileHandle);
	const db = await openSaveDb();
	try {
		const tx = db.transaction("links", "readwrite");
		tx.objectStore("links").put({
			id,
			fileHandle,
			dirHandle
		});
		await txDone(tx);
	} finally {
		db.close();
	}
}
async function deleteLinkHandles(id) {
	live.delete(id);
	const db = await openSaveDb();
	try {
		const tx = db.transaction("links", "readwrite");
		tx.objectStore("links").delete(id);
		await txDone(tx);
	} finally {
		db.close();
	}
}
async function readRow(id) {
	const db = await openSaveDb();
	try {
		return await requestDone(db.transaction("links", "readonly").objectStore("links").get(id)) ?? null;
	} finally {
		db.close();
	}
}
async function ensurePermission(handle, mode) {
	const access = asAccess(handle);
	if (await access.queryPermission({ mode }) === "granted") return true;
	return await access.requestPermission({ mode }) === "granted";
}
async function fileAt(dir, path) {
	const parts = path.split("/").filter(Boolean);
	if (!parts.length) return null;
	let current = asDir(dir);
	for (let i = 0; i < parts.length - 1; i++) try {
		current = asDir(await current.getDirectoryHandle(parts[i]));
	} catch {
		return null;
	}
	try {
		return await current.getFileHandle(parts[parts.length - 1]);
	} catch {
		return null;
	}
}
async function readLinkedFile(game) {
	const cached = live.get(game.id);
	if (cached) try {
		if (await ensurePermission(cached, "read")) return await cached.getFile();
	} catch {
		live.delete(game.id);
	}
	const row = await readRow(game.id);
	if (!row) return null;
	if (row.fileHandle) try {
		if (await ensurePermission(row.fileHandle, "read")) {
			live.set(game.id, row.fileHandle);
			return await row.fileHandle.getFile();
		}
	} catch {}
	if (row.dirHandle && game.savePath) try {
		if (!await ensurePermission(row.dirHandle, "read")) return null;
		const handle = await fileAt(row.dirHandle, game.savePath);
		if (!handle) return null;
		live.set(game.id, handle);
		await saveLinkHandles(game.id, handle, row.dirHandle);
		return await handle.getFile();
	} catch {
		return null;
	}
	return null;
}
async function writeLinked(id, text) {
	const handle = live.get(id);
	if (!handle) return false;
	if (!await ensurePermission(handle, "readwrite")) return false;
	const stream = await handle.createWritable();
	await stream.write(text);
	await stream.close();
	return true;
}
function requestDone(req) {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("Storage request failed"));
	});
}
function txDone(tx) {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("Could not store the link"));
		tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("Storage aborted"));
	});
}
var ROLE_LABEL = {
	money: "Money",
	unlock: "Locks",
	upgrade: "Upgrades",
	other: "Other"
};
function SavepressApp() {
	const [screen, setScreen] = (0, import_react.useState)("consent");
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)("");
	const [files, setFiles] = (0, import_react.useState)([]);
	const [recipes, setRecipes] = (0, import_react.useState)([]);
	const [games, setGames] = (0, import_react.useState)([]);
	const [linking, setLinking] = (0, import_react.useState)(false);
	const [linkName, setLinkName] = (0, import_react.useState)("");
	const [linkPackage, setLinkPackage] = (0, import_react.useState)("");
	const [found, setFound] = (0, import_react.useState)(null);
	const [linkDir, setLinkDir] = (0, import_react.useState)(null);
	const [pendingRecipe, setPendingRecipe] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const folderRef = (0, import_react.useRef)(null);
	const ingestRef = (0, import_react.useRef)(async () => {});
	(0, import_react.useEffect)(() => {
		if (hasConsent()) setScreen("home");
		setRecipes(loadRecipes());
		setGames(loadGames());
		refreshFiles();
		const onBack = () => {
			if (document.visibilityState === "hidden") return;
			const id = takePendingLaunch();
			if (!id) return;
			const game = loadGames().find((item) => item.id === id);
			if (!game) return;
			readLinkedFile(game).then((file) => {
				if (!file) {
					setStatus(`${game.name} is linked, but this browser needs the folder again.`);
					setScreen("home");
					return;
				}
				ingestRef.current(file, null, game.id);
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
	function openLoaded(loaded, overrides, note, gameId) {
		setDraft({
			loaded,
			overrides,
			rawText: loaded.originalText,
			gameId
		});
		setStatus(note);
		setScreen("editor");
		if (loaded.format !== "binary" && loaded.originalText) putFile({
			id: `recent:${loaded.name}`,
			kind: "recent",
			name: loaded.name,
			at: Date.now(),
			text: loaded.originalText,
			format: loaded.format
		}).then(refreshFiles);
	}
	function openSample(edits, title) {
		const loaded = parseText("wayhouse-save.json", SAMPLE_TEXT);
		const overrides = {};
		for (const edit of edits ?? []) overrides[edit.path] = edit.value;
		openLoaded(loaded, overrides, title ? `${title} is staged on the Wayhouse sample. Download it to keep the file.` : "Wayhouse sample is open. Stamp it, or change a field, then download.");
	}
	async function ingest(file, recipe, gameId) {
		if (file.size > 8e6) {
			setStatus("That file is over 8 MB. Open a smaller save.");
			setScreen("home");
			return;
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		if (isBinary(bytes)) {
			openLoaded({
				name: file.name,
				format: "binary",
				originalText: "",
				data: null,
				tags: {},
				binaryPreview: hexPreview(bytes),
				byteLength: bytes.length
			}, {}, "This looks like a binary save. Savepress only rewrites text saves — JSON, preferences XML, or key=value.", gameId);
			return;
		}
		const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
		const loaded = parseText(file.name || "save.json", text);
		const overrides = {};
		let note = `Opened ${loaded.name}.`;
		if (recipe && loaded.data) {
			const leaves = collect(loaded.data).leaves;
			let hits = 0;
			for (const edit of recipe.edits) {
				const targets = leaves.filter((leaf) => recipe.match === "path" ? leaf.path === edit.path : leaf.key.toLowerCase() === edit.key.toLowerCase());
				for (const target of targets) {
					overrides[target.path] = edit.value;
					hits++;
				}
			}
			note = hits ? `Applied “${recipe.title}” to ${hits} field${hits === 1 ? "" : "s"}.` : `“${recipe.title}” didn’t match any fields in this file.`;
		} else if (recipe && !loaded.data) note = "That file isn’t a structured save, so the recipe had nothing to match.";
		openLoaded(loaded, overrides, note, gameId);
	}
	ingestRef.current = ingest;
	function rememberGames(next) {
		setGames(next);
		saveGames(next);
	}
	async function findSaves() {
		if (!linkName.trim()) {
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
	function foundFromFolder(list) {
		const saves = [...list].map((file) => ({
			name: file.name,
			path: file.webkitRelativePath || file.name,
			size: file.size,
			score: scoreSaveName(file.name),
			file
		})).filter((item) => item.score > 0 && item.size <= 8e6).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 24);
		if (!saves.length) {
			setStatus("No save-like files in that folder.");
			return;
		}
		setLinkDir(null);
		setFound(saves);
		setStatus("");
	}
	async function chooseSave(item) {
		const id = crypto.randomUUID();
		const game = {
			id,
			name: linkName.trim(),
			packageId: linkPackage.trim(),
			savePath: item.path,
			fileName: item.name,
			linkedAt: Date.now()
		};
		if (item.handle) {
			rememberLive(id, item.handle);
			await saveLinkHandles(id, item.handle, linkDir);
		}
		rememberGames([game, ...games]);
		setLinking(false);
		setFound(null);
		setLinkDir(null);
		const file = item.file ?? await item.handle?.getFile();
		if (!file) {
			setStatus("That file couldn't be read.");
			return;
		}
		await ingest(file, null, item.handle ? id : void 0);
	}
	function launchGame(game) {
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
	async function openGame(game) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileRef,
				type: "file",
				className: "sr-only",
				"aria-label": "Choose a save file",
				onChange: (event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) ingest(file, pendingRecipe);
					setPendingRecipe(null);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: folderRef,
				type: "file",
				className: "sr-only",
				multiple: true,
				"aria-label": "Choose the game folder",
				onChange: (event) => {
					const list = event.target.files;
					event.target.value = "";
					if (list && list.length) foundFromFolder(list);
				}
			}),
			screen === "consent" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Consent, { onAccept: accept }),
			screen === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Home, {
				recents,
				recipes,
				games,
				linking,
				linkName,
				linkPackage,
				found,
				status,
				backupCount: backups.length,
				onOpen: () => {
					setPendingRecipe(null);
					fileRef.current?.click();
				},
				onSample: openSample,
				onRecipe: (recipe) => {
					setPendingRecipe(recipe);
					fileRef.current?.click();
				},
				onRecent: (file) => openLoaded(parseText(file.name, file.text), {}, `Reopened ${file.name}.`),
				onBackups: () => setScreen("backups"),
				onDeleteRecipe: (id) => {
					const next = recipes.filter((recipe) => recipe.id !== id);
					setRecipes(next);
					saveRecipes(next);
				},
				onStartLink: () => {
					setLinking(true);
					setFound(null);
					setStatus("");
				},
				onCancelLink: () => {
					setLinking(false);
					setFound(null);
					setLinkDir(null);
				},
				onLinkName: setLinkName,
				onLinkPackage: setLinkPackage,
				onFind: () => void findSaves(),
				onChoose: (item) => void chooseSave(item),
				onLaunch: launchGame,
				onOpenGame: (game) => void openGame(game),
				onRemoveGame: (id) => {
					rememberGames(games.filter((game) => game.id !== id));
					deleteLinkHandles(id);
				}
			}),
			screen === "editor" && draft && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Editor, {
				draft,
				setDraft,
				status,
				setStatus,
				onBack: () => setScreen("home"),
				onSaveRecipe: (recipe) => {
					const next = [recipe, ...recipes];
					setRecipes(next);
					saveRecipes(next);
				},
				onDownloaded: refreshFiles
			}),
			screen === "backups" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Backups, {
				files: backups,
				onBack: () => setScreen("home"),
				onOpen: (file) => openLoaded(parseText(file.name, file.text), {}, `Restored a backup of ${file.name}.`),
				onDelete: async (id) => {
					await deleteStored(id);
					await refreshFiles();
				}
			})
		]
	});
}
function Consent({ onAccept }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		side: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideNote, {
			title: "What a stamp changes",
			body: "Only fields whose names look like money, a lock, or an upgrade. Everything else stays put until you edit it."
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-4xl leading-tight text-balance",
				children: "A stamp for save files."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-prose text-pretty text-muted",
				children: "Open a save you already have. Raise the money, lift the locks, top out the upgrades, then download the file and put it back."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plate, {
				data: sampleSave(),
				caption: "Wayhouse sample, before a stamp"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-6 grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rule, {
						title: "Single-player files only",
						body: "Saves from games you play offline, on this phone."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rule, {
						title: "Not banks, wallets, or logins",
						body: "Never point this at money, payments, or accounts."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rule, {
						title: "Not online games",
						body: "A stamped multiplayer save is how accounts get banned."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "btn-primary mt-6 w-full",
				onClick: onAccept,
				children: "Open the bench"
			})
		]
	});
}
function GamesShelf({ games, linking, linkName, linkPackage, found, onStartLink, onCancelLink, onLinkName, onLinkPackage, onFind, onChoose, onLaunch, onOpenGame, onRemoveGame }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl",
				children: "Your games"
			}),
			games.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 grid gap-2",
				children: games.map((game) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate font-medium",
							children: game.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-muted",
							children: game.savePath
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "btn-primary",
								onClick: () => onLaunch(game),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
									className: "size-4",
									"aria-hidden": "true"
								}), "Launch"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => onOpenGame(game),
								children: "Open save"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn-quiet mt-1 w-full",
							onClick: () => onRemoveGame(game.id),
							children: "Remove"
						})
					]
				}, game.id))
			}),
			!linking && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "btn-ghost mt-3 w-full",
				onClick: onStartLink,
				children: "Link a game"
			}),
			linking && !found && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card mt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "block text-sm text-muted",
						htmlFor: "game-name",
						children: "Game name"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "game-name",
						className: "field mt-1 w-full",
						value: linkName,
						onChange: (event) => onLinkName(event.target.value),
						placeholder: "Wayhouse"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "mt-3 block text-sm text-muted",
						htmlFor: "game-package",
						children: "Android package"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "game-package",
						className: "field mt-1 w-full",
						value: linkPackage,
						onChange: (event) => onLinkPackage(event.target.value),
						placeholder: "com.studio.game",
						autoCapitalize: "off",
						autoCorrect: "off",
						spellCheck: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-pretty text-muted",
						children: "Find the save folder once. Launch opens the game, and coming back reloads that file."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "btn-primary mt-3 w-full",
						onClick: onFind,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, {
							className: "size-5",
							"aria-hidden": "true"
						}), "Find saves"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-quiet mt-1 w-full",
						onClick: onCancelLink,
						children: "Cancel"
					})
				]
			}),
			found && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card mt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl",
						children: "Which file is the save?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 divide-y divide-line",
						children: found.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "w-full py-3 text-left",
							onClick: () => onChoose(item),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate font-medium",
								children: item.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block truncate text-sm text-muted",
								children: [
									item.path,
									" · ",
									item.size.toLocaleString(),
									" bytes"
								]
							})]
						}) }, item.path))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-quiet mt-2 w-full",
						onClick: onCancelLink,
						children: "Cancel"
					})
				]
			})
		]
	});
}
function Home({ recents, recipes, games, linking, linkName, linkPackage, found, status, backupCount, onOpen, onSample, onRecipe, onRecent, onBackups, onDeleteRecipe, onStartLink, onCancelLink, onLinkName, onLinkPackage, onFind, onChoose, onLaunch, onOpenGame, onRemoveGame }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		side: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideNote, {
			title: "On a phone",
			body: "Link the game once and point at its save folder. Launch opens the game. When you come back, Savepress reloads that save if the browser kept the permission."
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-4xl leading-tight text-balance",
				children: "Launch the game. Keep the save."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-pretty text-muted",
				children: "Link a game, then launch it. Savepress reloads the save you pointed at and stamps money, locks, and upgrades."
			}),
			status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-pretty text-sm text-copper",
				children: status
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GamesShelf, {
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
				onRemoveGame
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-primary mt-6 w-full",
				onClick: onOpen,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, {
					className: "size-5",
					"aria-hidden": "true"
				}), "Open a save file"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card mt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl text-balance",
							children: "Wayhouse sample"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-pretty text-muted",
							children: "A tiny stall save, so you can try a stamp before you bring your own file."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
							className: "size-5 shrink-0 text-copper",
							"aria-hidden": "true"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-2 gap-2",
						children: SAMPLE_RECIPES.map((recipe) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn-ghost min-h-12",
							onClick: () => onSample(recipe.edits, recipe.title),
							children: recipe.title
						}, recipe.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-quiet mt-2 w-full",
						onClick: () => onSample(),
						children: "Open the sample without a stamp"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl",
					children: "Your recipes"
				}), recipes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-pretty text-muted",
					children: "Stamp a file, then save those edits as a recipe. Next time, apply it to a new save in one tap."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 grid gap-2",
					children: recipes.map((recipe) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "card flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate font-medium",
									children: recipe.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-sm text-muted",
									children: [
										recipe.edits.length,
										" fields · match ",
										recipe.match === "key" ? "name" : "path"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => onRecipe(recipe),
								children: "Use"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-quiet",
								onClick: () => onDeleteRecipe(recipe.id),
								children: "Remove"
							})
						]
					}, recipe.id))
				})]
			}),
			recents.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl",
					children: "Recent files"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 grid gap-2",
					children: recents.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "card w-full text-left",
						onClick: () => onRecent(file),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate font-medium",
							children: file.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted",
							children: formatWhen(file.at)
						})]
					}) }, file.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-quiet mt-6 w-full",
				onClick: onBackups,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, {
						className: "size-5",
						"aria-hidden": "true"
					}),
					"Backups",
					backupCount ? ` (${backupCount})` : ""
				]
			})
		]
	});
}
function Editor({ draft, setDraft, status, setStatus, onBack, onSaveRecipe, onDownloaded }) {
	const [maxMoney, setMaxMoney] = (0, import_react.useState)("9999999");
	const [maxLevel, setMaxLevel] = (0, import_react.useState)("99");
	const [useMoney, setUseMoney] = (0, import_react.useState)(true);
	const [useUnlocks, setUseUnlocks] = (0, import_react.useState)(true);
	const [useUpgrades, setUseUpgrades] = (0, import_react.useState)(true);
	const [query, setQuery] = (0, import_react.useState)("");
	const [showOther, setShowOther] = (0, import_react.useState)(false);
	const [recipeTitle, setRecipeTitle] = (0, import_react.useState)("");
	const [recipeMatch, setRecipeMatch] = (0, import_react.useState)("key");
	const [diffs, setDiffs] = (0, import_react.useState)([]);
	const searchId = (0, import_react.useId)();
	const compareRef = (0, import_react.useRef)(null);
	const collected = (0, import_react.useMemo)(() => draft.loaded.data ? collect(draft.loaded.data) : {
		leaves: [],
		truncated: false
	}, [draft.loaded]);
	const leaves = collected.leaves;
	const counts = countRoles(leaves);
	const changeCount = Object.keys(draft.overrides).length;
	const preview = (0, import_react.useMemo)(() => {
		if (!draft.loaded.data) return null;
		return withOverrides(draft.loaded.data, draft.overrides);
	}, [draft]);
	function setOverride(path, value, original) {
		const next = { ...draft.overrides };
		if (value === original) delete next[path];
		else next[path] = value;
		setDraft({
			...draft,
			overrides: next
		});
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
			maxLevel: level
		});
		const keys = Object.keys(plan);
		setDraft({
			...draft,
			overrides: {
				...draft.overrides,
				...plan
			}
		});
		setStatus(keys.length ? `Staged ${keys.length} change${keys.length === 1 ? "" : "s"}. Download to keep the file.` : "Nothing matched that stamp. Try the other fields, or raise the amounts.");
	}
	async function onCompareFile(file) {
		if (!draft.loaded.data) {
			setStatus("Open a structured save before comparing.");
			return;
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		if (isBinary(bytes)) {
			setStatus("The other file is binary, so there’s nothing to line up.");
			return;
		}
		const other = parseText(file.name, new TextDecoder().decode(bytes));
		if (!other.data) {
			setStatus("The other file isn’t a structured save.");
			return;
		}
		const right = new Map(collect(other.data).leaves.map((leaf) => [leaf.path, leaf]));
		const next = leaves.filter((leaf) => {
			const match = right.get(leaf.path);
			return match !== void 0 && match.value !== leaf.value;
		}).map((leaf) => ({
			path: leaf.path,
			key: leaf.key,
			from: leaf.value,
			value: right.get(leaf.path).value
		}));
		setDiffs(next);
		setStatus(next.length ? `${next.length} field${next.length === 1 ? "" : "s"} differ. Use the ones you want, then download.` : "Those two files match on every shared field.");
	}
	async function download() {
		try {
			let text = draft.rawText;
			if (draft.loaded.format !== "text" && draft.loaded.data) text = serialize(draft.loaded, withOverrides(draft.loaded.data, draft.overrides));
			if (draft.gameId && await writeLinked(draft.gameId, text)) {
				if (draft.loaded.originalText) {
					await putFile({
						id: `backup:${draft.loaded.name}:${Date.now()}`,
						kind: "backup",
						name: draft.loaded.name,
						at: Date.now(),
						text: draft.loaded.originalText,
						format: draft.loaded.format
					});
					await onDownloaded();
				}
				setStatus("Wrote the stamp back into the game's save. Open the game to see it.");
				return;
			}
			downloadText(draft.loaded.name || "save.json", text);
			if (draft.loaded.originalText) {
				await putFile({
					id: `backup:${draft.loaded.name}:${Date.now()}`,
					kind: "backup",
					name: draft.loaded.name,
					at: Date.now(),
					text: draft.loaded.originalText,
					format: draft.loaded.format
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
		const title = recipeTitle.trim() || `Stamp ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
		onSaveRecipe({
			id: crypto.randomUUID(),
			title,
			match: recipeMatch,
			created: Date.now(),
			edits: entries.map(([path, value]) => ({
				path,
				key: leaves.find((leaf) => leaf.path === path)?.key ?? path.split(".").pop() ?? path,
				value
			}))
		});
		setRecipeTitle("");
		setStatus(`Saved recipe “${title}”. Use it from the bench on the next file.`);
	}
	const needle = query.trim().toLowerCase();
	const visible = leaves.filter((leaf) => {
		if (leaf.role === "other" && !showOther && !needle) return false;
		if (!needle) return true;
		return leaf.path.toLowerCase().includes(needle) || leaf.key.toLowerCase().includes(needle) || ROLE_LABEL[leaf.role].toLowerCase().includes(needle);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		side: preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plate, {
			data: preview,
			caption: changeCount ? `${changeCount} staged` : "No staged changes"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideNote, {
			title: draft.loaded.format,
			body: "Nothing structured to preview in this file."
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-quiet -ml-3",
				onClick: onBack,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
					className: "size-5",
					"aria-hidden": "true"
				}), "Bench"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 truncate font-display text-3xl text-balance",
				children: draft.loaded.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [
					formatLabel(draft.loaded.format),
					draft.loaded.byteLength ? ` · ${draft.loaded.byteLength.toLocaleString()} bytes` : "",
					draft.loaded.data ? ` · ${counts.money} money · ${counts.unlock} locks · ${counts.upgrade} upgrades` : ""
				]
			}),
			status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-pretty text-sm text-copper",
				children: status
			}),
			draft.loaded.format === "binary" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "card mt-4 overflow-x-auto font-mono text-xs leading-5 text-ink",
				children: draft.loaded.binaryPreview
			}),
			draft.loaded.format === "text" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				className: "field mt-4 min-h-64 w-full font-mono text-sm",
				value: draft.rawText,
				onChange: (event) => setDraft({
					...draft,
					rawText: event.target.value
				}),
				"aria-label": "Save text"
			}),
			draft.loaded.data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-xl",
							children: "Stamp"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, {
										className: "size-4",
										"aria-hidden": "true"
									}),
									label: "Max money",
									checked: useMoney,
									onChange: setUseMoney,
									extra: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "field w-32 text-right tabular-nums",
										inputMode: "numeric",
										"aria-label": "Money amount",
										value: maxMoney,
										onChange: (event) => setMaxMoney(event.target.value)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, {
										className: "size-4",
										"aria-hidden": "true"
									}),
									label: "Unlock",
									checked: useUnlocks,
									onChange: setUseUnlocks
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
										className: "size-4",
										"aria-hidden": "true"
									}),
									label: "Max upgrades",
									checked: useUpgrades,
									onChange: setUseUpgrades,
									extra: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "field w-24 text-right tabular-nums",
										inputMode: "numeric",
										"aria-label": "Upgrade level",
										value: maxLevel,
										onChange: (event) => setMaxLevel(event.target.value)
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "btn-primary mt-4 w-full",
							onClick: applyStamp,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
								className: "size-5",
								"aria-hidden": "true"
							}), "Apply stamp"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: searchId,
						className: "field w-full pl-9",
						placeholder: "Find a field",
						"aria-label": "Find a field",
						value: query,
						onChange: (event) => setQuery(event.target.value)
					})]
				}),
				collected.truncated && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Showing the first 4,000 fields."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldGroups, {
					leaves: visible,
					overrides: draft.overrides,
					onChange: setOverride
				}),
				!showOther && counts.other > 0 && !needle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "btn-quiet mt-3 w-full",
					onClick: () => setShowOther(true),
					children: [
						"Show other fields (",
						counts.other,
						")"
					]
				}),
				diffs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl",
						children: "Compared"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 divide-y divide-line",
						children: diffs.map((diff) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-3 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm font-medium",
									children: diff.key
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "truncate text-sm text-muted tabular-nums",
									children: [
										String(diff.from),
										" → ",
										String(diff.value)
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => setOverride(diff.path, diff.value, diff.from),
								children: "Use"
							})]
						}, diff.path))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "card mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-xl",
							children: "Save as a recipe"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-pretty text-muted",
							children: "Keeps the staged values. Matching by name works when the next save uses the same field names."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field mt-3 w-full",
							placeholder: "Recipe name",
							"aria-label": "Recipe name",
							value: recipeTitle,
							onChange: (event) => setRecipeTitle(event.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: recipeMatch === "key" ? "btn-ghost ring-2 ring-copper" : "btn-ghost",
								onClick: () => setRecipeMatch("key"),
								children: "Match name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: recipeMatch === "path" ? "btn-ghost ring-2 ring-copper" : "btn-ghost",
								onClick: () => setRecipeMatch("path"),
								children: "Match path"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn-quiet mt-2 w-full",
							onClick: saveRecipe,
							children: "Save recipe"
						})
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "-mx-5 mt-6 flex gap-2 border-t border-line px-5 py-3",
				children: [draft.loaded.format !== "binary" && draft.loaded.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn-quiet flex-1",
					onClick: () => compareRef.current?.click(),
					children: "Compare"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "btn-primary flex-1",
					onClick: () => void download(),
					disabled: draft.loaded.format === "binary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
						className: "size-5",
						"aria-hidden": "true"
					}), draft.gameId && hasLiveHandle(draft.gameId) ? "Save into the game" : changeCount ? "Download stamped" : "Download"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: compareRef,
				type: "file",
				className: "sr-only",
				"aria-label": "Choose a save to compare",
				onChange: (event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) onCompareFile(file);
				}
			}),
			draft.loaded.format === "json" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-pretty text-muted",
				children: "JSON is rewritten with normal spacing. If a game is picky about the exact old layout, it may refuse the file."
			})
		]
	});
}
function FieldGroups({ leaves, overrides, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-4 grid gap-4",
		children: [
			"money",
			"unlock",
			"upgrade",
			"other"
		].map((role) => {
			const group = leaves.filter((leaf) => leaf.role === role);
			if (!group.length) return null;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium tracking-wide text-muted uppercase",
				children: ROLE_LABEL[role]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "card mt-2 divide-y divide-line px-4 py-0",
				children: group.map((leaf) => {
					const value = overrides[leaf.path] ?? leaf.value;
					const dirty = value !== leaf.value;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate font-medium",
									children: leaf.key
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm text-muted",
									children: leaf.path
								}),
								dirty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-sm text-copper tabular-nums",
									children: ["was ", String(leaf.value)]
								})
							]
						}), typeof value === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: value ? "btn-ghost" : "btn-quiet",
							onClick: () => onChange(leaf.path, !value, leaf.value),
							children: value ? "On" : "Off"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-28 text-right tabular-nums",
							inputMode: "decimal",
							"aria-label": leaf.path,
							value: String(value),
							onChange: (event) => {
								const next = Number(event.target.value);
								if (Number.isFinite(next)) onChange(leaf.path, next, leaf.value);
							}
						})]
					}, leaf.path);
				})
			})] }, role);
		})
	});
}
function Backups({ files, onBack, onOpen, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		side: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideNote, {
			title: "Originals",
			body: "Every download stores the file as it was when you opened it. Backups stay in this browser."
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-quiet -ml-3",
				onClick: onBack,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
					className: "size-5",
					"aria-hidden": "true"
				}), "Bench"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-4xl text-balance",
				children: "Backups"
			}),
			files.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-pretty text-muted",
				children: "Nothing saved yet. A backup is kept the first time you download a stamped file."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 grid gap-2",
				children: files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "card flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "truncate font-medium",
								children: file.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm text-muted",
								children: formatWhen(file.at)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn-ghost",
							onClick: () => onOpen(file),
							children: "Open"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn-quiet",
							onClick: () => onDelete(file.id),
							children: "Delete"
						})
					]
				}, file.id))
			})
		]
	});
}
function Plate({ data, caption }) {
	const leaves = collect(data).leaves;
	const money = leaves.filter((leaf) => leaf.role === "money").slice(0, 4);
	const locks = leaves.filter((leaf) => leaf.role === "unlock");
	const upgrades = leaves.filter((leaf) => leaf.role === "upgrade").slice(0, 4);
	const open = locks.filter((leaf) => leaf.lockOff ? leaf.value === false || leaf.value === 0 : leaf.value === true || leaf.value === 1).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "card mt-6 lg:mt-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: caption
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "mt-3 grid gap-2",
				children: money.map((leaf) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-sm text-muted",
						children: leaf.key
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "font-display text-2xl tabular-nums",
						children: formatValue(leaf.value)
					})]
				}, leaf.path))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-pretty text-muted",
				children: [
					open,
					" of ",
					locks.length,
					" locks open",
					upgrades.length ? ` · ${upgrades.map((leaf) => `${fieldName(leaf)} ${leaf.value}`).join(" · ")}` : ""
				]
			})
		]
	});
}
function Shell({ children, side }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid w-full max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 lg:py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-w-0",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "hidden lg:block",
			children: side
		})]
	});
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "flex size-11 items-center justify-center rounded-2xl bg-ink text-paper",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
				className: "size-5",
				"aria-hidden": "true"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-xl tracking-tight",
			children: "Savepress"
		})]
	});
}
function Rule({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-medium",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-pretty text-muted",
			children: body
		})]
	});
}
function SideNote({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl text-balance",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-pretty text-muted",
			children: body
		})]
	});
}
function Toggle({ icon, label, checked, onChange, extra }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			role: "switch",
			"aria-checked": checked,
			className: checked ? "btn-ghost flex-1" : "btn-quiet flex-1",
			onClick: () => onChange(!checked),
			children: [icon, label]
		}), extra]
	});
}
function fieldName(leaf) {
	const parts = leaf.path.split(".");
	const key = parts[parts.length - 1] ?? leaf.key;
	if (parts.length >= 2 && /^(level|lvl|unlocked|locked|stars?)$/i.test(key)) return parts[parts.length - 2] ?? leaf.key;
	return leaf.key;
}
function formatValue(value) {
	if (typeof value === "boolean") return value ? "On" : "Off";
	return value.toLocaleString();
}
function formatWhen(at) {
	return new Date(at).toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}
function formatLabel(format) {
	if (format === "json") return "JSON";
	if (format === "prefs") return "Android preferences";
	if (format === "pairs") return "Key list";
	if (format === "binary") return "Binary";
	return "Plain text";
}
function downloadText(name, text) {
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
var SplitComponent = SavepressApp;
//#endregion
export { SplitComponent as component };
