import { t } from "./i18n";
import { LOG, store } from "./store";
import { getTrackInfo } from "./track";

function getAllLyricsText(): string | null {
	const s = store.lyrics;
	if (s.synced) {
		const text = s.synced
			.map((l) => l.text)
			.filter(Boolean)
			.join("\n");
		return text || null;
	}
	return s.plain || null;
}

async function copyText(text: string, successKey: "notifCopiedAll" | "notifCopiedLine") {
	try {
		await navigator.clipboard.writeText(text);
		Spicetify.showNotification?.(t(successKey));
	} catch (e) {
		console.warn(LOG, "copy failed:", e);
		Spicetify.showNotification?.(t("notifCopyFailed"), true);
	}
}

/** Copies the whole lyrics (synced line text, or the plain block) to the clipboard. */
export function copyAllLyrics() {
	const text = getAllLyricsText();
	if (!text) {
		Spicetify.showNotification?.(t("notifNothingToCopy"));
		return;
	}
	void copyText(text, "notifCopiedAll");
}

/** Official-like palette: on album-color backgrounds, unsung lines are dark, sung lines white. */
export function applyColors() {
	const root = store.target?.root;
	if (!root) return;
	if (store.colors?.bg) {
		root.style.setProperty("--lypos-bg", store.colors.bg);
		root.style.setProperty("--lypos-active", "#ffffff");
		root.style.setProperty("--lypos-past", "rgba(255,255,255,.78)");
		root.style.setProperty("--lypos-future", "rgba(0,0,0,.72)");
		root.style.setProperty("--lypos-ui", "rgba(0,0,0,.75)");
	} else {
		root.style.setProperty("--lypos-bg", "#1f1f1f");
		root.style.setProperty("--lypos-active", "#ffffff");
		root.style.setProperty("--lypos-past", "rgba(255,255,255,.75)");
		root.style.setProperty("--lypos-future", "rgba(255,255,255,.5)");
		root.style.setProperty("--lypos-ui", "rgba(255,255,255,.7)");
	}
}

export function renderLyrics() {
	const target = store.target;
	if (!target) return;
	const doc = target.doc;
	const content = target.content;
	content.innerHTML = "";
	store.lineEls = [];
	store.curIdx = -1;

	const track = getTrackInfo();
	const state = store.lyrics;
	target.sourceEl.textContent = track?.title
		? `${track.title}${state.source ? " · " + state.source : ""}`
		: "";

	const message = (text: string, className = "lypos-msg") => {
		const el = doc.createElement("div");
		el.className = className;
		el.textContent = text;
		content.appendChild(el);
	};

	if (state.status === "loading") {
		message(t("msgLoading"));
		return;
	}
	if (state.status === "none") {
		message(t("msgNotFound"));
		if (state.errors.length) message(state.errors.join("\n"), "lypos-err");
		return;
	}
	if (state.synced) {
		for (const line of state.synced) {
			const el = doc.createElement("div");
			el.className = "lypos-line";
			el.textContent = line.text || "♪";
			el.title = t("tipLineHint");
			el.addEventListener("click", () => Spicetify.Player.seek(line.time));
			el.addEventListener("contextmenu", (e) => {
				if (!line.text) return; // nothing to copy for an instrumental marker
				e.preventDefault();
				void copyText(line.text, "notifCopiedLine");
			});
			content.appendChild(el);
			store.lineEls.push(el);
		}
		target.scroller.scrollTop = 0;
		return;
	}
	const pre = doc.createElement("div");
	pre.className = "lypos-plain";
	pre.textContent = state.plain ?? "";
	content.appendChild(pre);
	target.scroller.scrollTop = 0;
}

/** Highlight the current line, recomputed from absolute progress so seeking just works. */
export function startHighlightLoop() {
	setInterval(() => {
		const target = store.target;
		const synced = store.lyrics.synced;
		if (!target || !synced || !store.lineEls.length) return;
		if (target.win?.closed) return;
		let progress: number;
		try {
			progress = Spicetify.Player.getProgress();
		} catch {
			return;
		}
		let idx = -1;
		for (let i = 0; i < synced.length; i++) {
			if (synced[i].time <= progress + 120) idx = i;
			else break;
		}
		if (idx === store.curIdx) return;
		store.curIdx = idx;
		store.lineEls.forEach((el, i) => {
			el.classList.toggle("lypos-active", i === idx);
			el.classList.toggle("lypos-past", idx >= 0 && i < idx);
		});
		if (idx >= 0 && store.cfg.autoScroll && Date.now() > store.userScrollUntil) {
			try {
				store.lineEls[idx].scrollIntoView({ block: "center", behavior: "smooth" });
			} catch {}
		}
	}, 250);
}
