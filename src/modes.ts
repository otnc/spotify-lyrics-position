import { saveCfg } from "./config";
import { t } from "./i18n";
import { Mode, store } from "./store";
import { createPopup, createWindow, destroyTarget, ensureSidebarCard, tryOpenNPV } from "./targets";
import { updateButton } from "./ui-buttons";

export function applyMode() {
	destroyTarget();
	const mode = store.cfg.mode;
	switch (mode) {
		case "right":
			tryOpenNPV();
			ensureSidebarCard();
			break;
		case "left":
			ensureSidebarCard();
			break;
		case "popup":
			createPopup();
			break;
		case "window":
			// Async (Picture-in-Picture request); intentionally not awaited —
			// applyMode() stays synchronous, createWindow sets store.target itself.
			void createWindow();
			break;
	}
	if (mode !== "off") store.cfg.lastMode = mode;
	saveCfg();
	updateButton();
}

let offNotified = false;

export function setMode(mode: Mode) {
	store.cfg.mode = mode;
	applyMode();
	// Point users at the remaining settings entry points (once per session).
	if (mode === "off" && !offNotified) {
		offNotified = true;
		Spicetify.showNotification?.(t("notifOff"));
	}
}

export function toggleMode() {
	setMode(store.cfg.mode === "off" ? store.cfg.lastMode || "right" : "off");
}
