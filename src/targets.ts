import { saveCfg } from "./config";
import { t } from "./i18n";
import { loadLyrics } from "./lyrics";
import { setMode } from "./modes";
import { applyColors, renderLyrics } from "./render";
import { openSettings } from "./settings-ui";
import { DEFAULTS, LOG, Mode, POPUP_MIN_H, POPUP_MIN_W, store } from "./store";
import { injectStyles } from "./styles";
import { updateButton } from "./ui-buttons";

/** Keep floating UI below the window controls (minimize/close). */
const TITLEBAR_SAFE = 64;

interface ContentUI {
	toolbar: HTMLElement;
	scroller: HTMLElement;
	content: HTMLElement;
	sourceEl: HTMLElement;
}

function makeContentUI(doc: Document, { closable }: { closable: boolean }): ContentUI {
	const toolbar = doc.createElement("div");
	toolbar.className = "lypos-toolbar";
	const title = doc.createElement("span");
	title.className = "lypos-title";
	title.textContent = t("title");
	const sourceEl = doc.createElement("span");
	sourceEl.className = "lypos-source";

	const button = (tip: string, text: string, onClick: () => void) => {
		const el = doc.createElement("button");
		el.className = "lypos-btn";
		el.title = tip;
		el.textContent = text;
		el.onclick = onClick;
		return el;
	};
	toolbar.append(
		title,
		sourceEl,
		button(t("tipRefetch"), "↻", () => loadLyrics(true)),
		button(t("tipSettings"), "⚙", () => openSettings()),
	);
	if (closable) toolbar.append(button(t("tipClose"), "✕", () => setMode("off")));

	const scroller = doc.createElement("div");
	scroller.className = "lypos-scroller";
	const content = doc.createElement("div");
	scroller.appendChild(content);
	const bump = () => (store.userScrollUntil = Date.now() + 3000);
	scroller.addEventListener("wheel", bump, { passive: true });
	scroller.addEventListener("touchstart", bump, { passive: true });

	return { toolbar, scroller, content, sourceEl };
}

export function destroyTarget() {
	if (store.target) {
		const target = store.target;
		store.target = null;
		try {
			target.destroy();
		} catch (e) {
			console.warn(LOG, e);
		}
	}
	store.lineEls = [];
	store.curIdx = -1;
}

/* ---------- Sidebar cards ---------- */

/** Right = the Now Playing View (the panel showing artwork, title, artist). */
function findRightHost(): HTMLElement | null {
	const sidebar = document.querySelector<HTMLElement>(".Root__right-sidebar");
	// Skip while the sidebar is closed/collapsed so the card is never
	// inserted into an invisible container.
	if (!sidebar || sidebar.getBoundingClientRect().width < 100) return null;
	return (
		sidebar.querySelector<HTMLElement>('[data-testid="NPV_Panel"]') ??
		sidebar.querySelector<HTMLElement>("aside") ??
		// Never treat our own card as the host.
		(Array.from(sidebar.children).find((el) => !el.classList.contains("lypos-card")) as
			HTMLElement | undefined) ??
		sidebar
	);
}

/** Left = the library sidebar. */
function findLeftHost(): HTMLElement | null {
	const nav = document.querySelector<HTMLElement>(".Root__nav-bar");
	// A collapsed (icon-only) library is too narrow to host the card.
	if (!nav || nav.getBoundingClientRect().width < 150) return null;
	return nav;
}

/** Open the Now Playing View if it is currently closed. */
export function tryOpenNPV() {
	if (findRightHost()) return;
	const btn = document.querySelector<HTMLElement>(
		'[data-testid="control-button-npv"], button[aria-label*="Now Playing"], button[aria-label*="再生中"]',
	);
	if (btn && btn.getAttribute("aria-pressed") !== "true") {
		btn.click();
		console.log(LOG, "opened Now Playing View");
	}
}

function buildSidebarCard(host: HTMLElement, kind: Mode) {
	const card = document.createElement("div");
	card.className = "lypos-root lypos-card";
	card.style.setProperty("--lypos-card-h", store.cfg.cardRatio + "%");
	card.style.setProperty("--lypos-font", store.cfg.fontSize + "px");
	// Clear the sidebar's overlay header (context title, NPV buttons, ...).
	// The Now Playing View occasionally renders its album/title text below
	// the card without a small top offset, hence the separate right-side default.
	card.style.marginTop =
		(kind === "right" ? store.cfg.rightCardTopOffset : store.cfg.cardTopOffset) + "px";

	const ui = makeContentUI(document, { closable: true });
	card.append(ui.toolbar, ui.scroller);
	host.insertBefore(card, host.firstChild);

	store.target = {
		kind,
		root: card,
		scroller: ui.scroller,
		content: ui.content,
		sourceEl: ui.sourceEl,
		doc: document,
		win: null,
		destroy() {
			card.remove();
		},
	};
	applyColors();
	renderLyrics();
}

/** Re-insert the card whenever Spotify re-renders the sidebar and drops it. */
export function ensureSidebarCard() {
	const mode = store.cfg.mode;
	if (mode !== "right" && mode !== "left") return;
	const host = mode === "right" ? findRightHost() : findLeftHost();
	const target = store.target;
	if (target) {
		if (target.kind !== mode) return; // applyMode owns mode transitions
		// Healthy card: attached, visible, and inside the current best host.
		// The host check relocates cards that were inserted into a fallback
		// container before the sidebar finished rendering (wrong width).
		const healthy =
			target.root.isConnected &&
			target.root.getBoundingClientRect().width > 0 &&
			(!host || target.root.parentElement === host);
		if (healthy) return;
		destroyTarget();
	}
	if (!host) return;
	buildSidebarCard(host, mode);
}

let observer: MutationObserver | null = null;
let ensureQueued = false;

export function startSidebarObserver() {
	if (observer) return;
	observer = new MutationObserver(() => {
		if (ensureQueued) return;
		ensureQueued = true;
		setTimeout(() => {
			ensureQueued = false;
			ensureSidebarCard();
		}, 300);
	});
	observer.observe(document.body, { childList: true, subtree: true });
}

/* ---------- In-app popup ---------- */

export function createPopup() {
	const panel = document.createElement("div");
	panel.className = "lypos-root lypos-popup";
	const p = store.cfg.popup;
	p.y = Math.max(TITLEBAR_SAFE, Math.min(p.y, innerHeight - 120));
	p.x = Math.max(0, Math.min(p.x, innerWidth - 140));
	panel.style.left = p.x + "px";
	panel.style.top = p.y + "px";
	panel.style.width = p.w + "px";
	panel.style.height = p.h + "px";
	panel.style.minWidth = POPUP_MIN_W + "px";
	panel.style.minHeight = POPUP_MIN_H + "px";
	panel.style.setProperty("--lypos-font", store.cfg.fontSize + "px");

	const ui = makeContentUI(document, { closable: true });
	panel.append(ui.toolbar, ui.scroller);
	document.body.appendChild(panel);

	ui.toolbar.addEventListener("pointerdown", (e) => {
		if ((e.target as HTMLElement).closest(".lypos-btn")) return;
		e.preventDefault();
		ui.toolbar.setPointerCapture(e.pointerId);
		const offX = e.clientX - panel.offsetLeft;
		const offY = e.clientY - panel.offsetTop;
		const onMove = (ev: PointerEvent) => {
			store.cfg.popup.x = Math.max(0, Math.min(ev.clientX - offX, innerWidth - 140));
			store.cfg.popup.y = Math.max(TITLEBAR_SAFE, Math.min(ev.clientY - offY, innerHeight - 120));
			panel.style.left = store.cfg.popup.x + "px";
			panel.style.top = store.cfg.popup.y + "px";
		};
		const onUp = () => {
			ui.toolbar.removeEventListener("pointermove", onMove);
			ui.toolbar.removeEventListener("pointerup", onUp);
			saveCfg();
		};
		ui.toolbar.addEventListener("pointermove", onMove);
		ui.toolbar.addEventListener("pointerup", onUp);
	});

	const ro = new ResizeObserver(() => {
		store.cfg.popup.w = panel.offsetWidth;
		store.cfg.popup.h = panel.offsetHeight;
		saveCfg();
	});
	ro.observe(panel);

	store.target = {
		kind: "popup",
		root: panel,
		scroller: ui.scroller,
		content: ui.content,
		sourceEl: ui.sourceEl,
		doc: document,
		win: null,
		destroy() {
			ro.disconnect();
			panel.remove();
		},
	};
	applyColors();
	renderLyrics();
}

/* ---------- Separate window ---------- */

export async function createWindow() {
	const cfg = store.cfg;

	// Spotify's window.open()-based popups get silently snapped to a fixed
	// internal default size shortly after creation (confirmed by watching
	// outerWidth/outerHeight over time — neither the features string nor
	// resizeTo() survives it). The Document Picture-in-Picture API is a
	// separate code path that Spotify's CEF build enables explicitly
	// (--enable-blink-features=DocumentPictureInPictureCefOptions) and it
	// honors the requested size exactly, so prefer it when available.
	let win: Window | null = null;
	if (window.documentPictureInPicture) {
		try {
			win = await window.documentPictureInPicture.requestWindow({
				width: cfg.win.w,
				height: cfg.win.h,
			});
		} catch (e) {
			console.warn(LOG, "Document Picture-in-Picture unavailable, falling back:", e);
		}
	}
	// The mode may have changed while awaiting the PiP window above.
	if (win && store.cfg.mode !== "window") {
		try {
			win.close();
		} catch {}
		return;
	}

	if (!win) {
		// Fallback for older Spotify builds without Picture-in-Picture.
		// `resizable=yes` must be explicit — without it some Chromium embeds
		// default popups to a fixed size or a much larger minimum.
		win = window.open(
			"",
			"lyrics-position-window",
			`popup=yes,resizable=yes,width=${cfg.win.w},height=${cfg.win.h}`,
		);
		if (!win) {
			Spicetify.showNotification?.(t("notifNoWindow"), true);
			setMode("popup");
			return;
		}
		try {
			win.resizeTo(cfg.win.w, cfg.win.h);
		} catch {}
	}
	const doc = win.document;
	doc.title = `${t("title")} - Lyrics Position`;
	doc.body.innerHTML = "";
	doc.body.style.margin = "0";
	doc.body.style.height = "100vh";

	injectStyles(
		doc,
		`html,body{height:100%;background:#121212;font-family:CircularSp,"Hiragino Kaku Gothic ProN","Yu Gothic UI",sans-serif;}`,
	);

	const root = doc.createElement("div");
	root.className = "lypos-root";
	root.style.setProperty("--lypos-font", cfg.fontSize + "px");
	// Picture-in-Picture windows have no native title bar/close button in
	// this CEF build, so the toolbar has to provide move/maximize/close itself.
	const ui = makeContentUI(doc, { closable: true });
	root.append(ui.toolbar, ui.scroller);
	doc.body.appendChild(root);

	// Drag the toolbar to move the window (there is no native title bar to drag).
	ui.toolbar.style.cursor = "move";
	ui.toolbar.addEventListener("pointerdown", (e) => {
		if ((e.target as HTMLElement).closest(".lypos-btn")) return;
		e.preventDefault();
		ui.toolbar.setPointerCapture(e.pointerId);
		const startScreenX = e.screenX;
		const startScreenY = e.screenY;
		const startWinX = win.screenX;
		const startWinY = win.screenY;
		const onMove = (ev: PointerEvent) => {
			win.moveTo(startWinX + (ev.screenX - startScreenX), startWinY + (ev.screenY - startScreenY));
		};
		const onUp = () => {
			ui.toolbar.removeEventListener("pointermove", onMove);
			ui.toolbar.removeEventListener("pointerup", onUp);
		};
		ui.toolbar.addEventListener("pointermove", onMove);
		ui.toolbar.addEventListener("pointerup", onUp);
	});

	// There is no window.maximize() API, so fake it: remember the bounds and
	// resize to the available screen, then restore them on the next click.
	let maximized = false;
	let restoreBounds = { x: win.screenX, y: win.screenY, w: win.outerWidth, h: win.outerHeight };
	const maxBtn = doc.createElement("button");
	maxBtn.className = "lypos-btn";
	maxBtn.textContent = "⛶";
	maxBtn.title = t("tipMaximize");
	maxBtn.onclick = () => {
		if (!maximized) {
			restoreBounds = { x: win.screenX, y: win.screenY, w: win.outerWidth, h: win.outerHeight };
			maximized = true;
			win.moveTo(0, 0);
			win.resizeTo(screen.availWidth, screen.availHeight);
			maxBtn.title = t("tipRestore");
		} else {
			maximized = false;
			win.moveTo(restoreBounds.x, restoreBounds.y);
			win.resizeTo(restoreBounds.w, restoreBounds.h);
			maxBtn.title = t("tipMaximize");
		}
	};
	// Insert before the close (✕) button, which makeContentUI appends last.
	ui.toolbar.insertBefore(maxBtn, ui.toolbar.lastElementChild);

	win.addEventListener("resize", () => {
		// The maximize toggle above resizes intentionally past the floor —
		// don't treat that as the new remembered size.
		if (maximized) return;
		// Native windows have no CSS min-width/min-height, so the same floor
		// the in-app popup gets from CSS is enforced here by snapping back.
		let w = win.outerWidth;
		let h = win.outerHeight;
		if (w < DEFAULTS.win.w || h < DEFAULTS.win.h) {
			w = Math.max(w, DEFAULTS.win.w);
			h = Math.max(h, DEFAULTS.win.h);
			win.resizeTo(w, h);
		}
		store.cfg.win.w = w;
		store.cfg.win.h = h;
		saveCfg();
	});

	let closeHandled = false;
	const handleClose = () => {
		if (closeHandled) return;
		closeHandled = true;
		clearInterval(watcher);
		if (store.cfg.mode === "window") {
			store.cfg.mode = "off";
			saveCfg();
			destroyTarget();
			updateButton();
		}
	};
	// `pagehide` is the documented close signal for Picture-in-Picture
	// windows; the polling watcher is a fallback for the window.open() path.
	win.addEventListener("pagehide", handleClose);
	const watcher = setInterval(() => {
		if (win.closed) handleClose();
	}, 800);

	store.target = {
		kind: "window",
		root,
		scroller: ui.scroller,
		content: ui.content,
		sourceEl: ui.sourceEl,
		doc,
		win,
		destroy() {
			clearInterval(watcher);
			try {
				win.close();
			} catch {}
		},
	};
	applyColors();
	renderLyrics();
}
