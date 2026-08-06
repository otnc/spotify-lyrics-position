import { DEFAULTS, store } from "./store";

const STORAGE_KEY = "lyrics-position:settings";

// The separate window is meant to have the same floor as the in-app popup
// (DEFAULTS.win === DEFAULTS.popup's w/h) and never shrink below it. Without
// this, a window that (due to a past bug) opened at full screen size gets its
// dimensions saved by the resize listener and reloaded forever, overriding
// the default. A size outside [floor, max] is treated as corrupted/unwanted
// data and reset to the default rather than clamped to the boundary.
const WIN_MAX = 1000;
const sanitizeWinDim = (n: number, floor: number) =>
	Number.isFinite(n) && n >= floor && n <= WIN_MAX ? n : floor;

export function loadCfg() {
	let saved: Partial<typeof DEFAULTS> = {};
	try {
		saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
	} catch {}
	store.cfg = {
		...DEFAULTS,
		...saved,
		popup: { ...DEFAULTS.popup, ...(saved.popup ?? {}) },
		win: { ...DEFAULTS.win, ...(saved.win ?? {}) },
	};
	store.cfg.win.w = sanitizeWinDim(store.cfg.win.w, DEFAULTS.win.w);
	store.cfg.win.h = sanitizeWinDim(store.cfg.win.h, DEFAULTS.win.h);
	return store.cfg;
}

/** Restore factory defaults (persisted immediately). */
export function resetCfg() {
	store.cfg = structuredClone(DEFAULTS);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store.cfg));
	return store.cfg;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveCfg() {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store.cfg));
	}, 200);
}
