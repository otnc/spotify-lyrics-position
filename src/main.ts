import { loadCfg } from "./config";
import { loadLyrics, updateColors } from "./lyrics";
import { applyMode } from "./modes";
import { startHighlightLoop } from "./render";
import { LOG, store } from "./store";
import { injectStyles } from "./styles";
import { startSidebarObserver } from "./targets";
import { hookOfficialLyricsButton, registerButtons } from "./ui-buttons";

function init() {
	if (
		!window.Spicetify?.Player?.addEventListener ||
		!Spicetify.CosmosAsync ||
		!Spicetify.Menu ||
		!document.body
	) {
		setTimeout(init, 300);
		return;
	}

	loadCfg();
	injectStyles();
	registerButtons();
	hookOfficialLyricsButton();
	startSidebarObserver();
	startHighlightLoop();

	Spicetify.Player.addEventListener("songchange", () => {
		setTimeout(() => {
			loadLyrics();
			updateColors();
		}, 100);
	});

	applyMode();

	// Player.data is often not ready right after startup; wait for it before
	// the first fetch instead of getting stuck on "nothing is playing".
	const initialLoad = (attempt = 0) => {
		if (Spicetify.Player.data || attempt >= 20) {
			loadLyrics();
			updateColors();
		} else {
			setTimeout(() => initialLoad(attempt + 1), 500);
		}
	};
	initialLoad();

	console.log(LOG, "loaded. mode =", store.cfg.mode);
}

init();
