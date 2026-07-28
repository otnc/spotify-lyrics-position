// Shared mutable state and types.
export const LOG = "[lyrics-position]";

export type Mode = "off" | "right" | "left" | "popup" | "window";
export type Provider = "auto" | "spotify" | "lrclib";
export type Language = "auto" | "en" | "ja";

export interface SyncedLine {
	time: number;
	text: string;
}

export interface LyricsResult {
	synced?: SyncedLine[] | null;
	plain?: string | null;
	source: string;
}

export interface LyricsState {
	status: "loading" | "ok" | "none";
	synced: SyncedLine[] | null;
	plain: string | null;
	source: string;
	errors: string[];
}

export interface Target {
	kind: Mode;
	root: HTMLElement;
	scroller: HTMLElement;
	content: HTMLElement;
	sourceEl: HTMLElement;
	doc: Document;
	win: Window | null;
	destroy(): void;
}

export interface Config {
	mode: Mode;
	lastMode: Mode;
	fontSize: number;
	/** Sidebar card height in % of the sidebar (default ~4/11). */
	cardRatio: number;
	/** Top margin (px) for the left-sidebar card, so it clears any overlay header/buttons. */
	cardTopOffset: number;
	/** Top margin (px) for the right-sidebar card; the Now Playing View sometimes
	 *  renders its album/title text below the card without this. */
	rightCardTopOffset: number;
	provider: Provider;
	/** Hijack the official lyrics button; off restores the built-in lyrics page. */
	hookOfficial: boolean;
	/** Auto-scroll to keep the current line centered. */
	autoScroll: boolean;
	language: Language;
	popup: { x: number; y: number; w: number; h: number };
	win: { w: number; h: number };
}

export const DEFAULTS: Config = {
	mode: "right",
	lastMode: "right",
	fontSize: 17,
	cardRatio: 36,
	cardTopOffset: 0,
	rightCardTopOffset: 50,
	provider: "auto",
	hookOfficial: true,
	autoScroll: true,
	language: "auto",
	popup: { x: 80, y: 120, w: 360, h: 480 },
	win: { w: 380, h: 560 },
};

export const store = {
	cfg: structuredClone(DEFAULTS),
	lyrics: {
		status: "loading",
		synced: null,
		plain: null,
		source: "",
		errors: [],
	} as LyricsState,
	target: null as Target | null,
	lineEls: [] as HTMLElement[],
	curIdx: -1,
	userScrollUntil: 0,
	colors: null as { bg: string } | null,
	fetchToken: 0,
};
