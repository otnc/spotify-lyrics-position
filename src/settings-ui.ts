import { resetCfg, saveCfg } from "./config";
import { t } from "./i18n";
import { loadLyrics } from "./lyrics";
import { applyMode, setMode } from "./modes";
import { DEFAULTS, Language, LOG, Mode, POPUP_MIN_H, POPUP_MIN_W, Provider, store } from "./store";
import { refreshUiLanguage, updateButton } from "./ui-buttons";

function checkboxRow(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
	const lab = document.createElement("label");
	lab.className = "lypos-choice";
	const check = document.createElement("input");
	check.type = "checkbox";
	check.checked = checked;
	check.onchange = () => onChange(check.checked);
	lab.append(check, document.createTextNode(label));
	return lab;
}

function numberRow(
	label: string,
	value: number,
	min: number,
	max: number,
	onChange: (v: number) => void,
): HTMLElement {
	const row = document.createElement("div");
	row.className = "lypos-row";
	const span = document.createElement("span");
	span.textContent = label;
	const input = document.createElement("input");
	input.type = "number";
	input.min = String(min);
	input.max = String(max);
	input.value = String(value);
	input.onchange = () => {
		const v = Math.min(max, Math.max(min, Number(input.value) || value));
		input.value = String(v);
		onChange(v);
	};
	row.append(span, input);
	return row;
}

function selectRow(
	label: string,
	options: [string, string][],
	selected: string,
	onChange: (v: string) => void,
): HTMLElement {
	const row = document.createElement("div");
	row.className = "lypos-row";
	const span = document.createElement("span");
	span.textContent = label;
	const sel = document.createElement("select");
	for (const [value, text] of options) {
		const opt = document.createElement("option");
		opt.value = value;
		opt.textContent = text;
		opt.selected = selected === value;
		sel.appendChild(opt);
	}
	sel.onchange = () => onChange(sel.value);
	row.append(span, sel);
	return row;
}

export function openSettings() {
	const cfg = store.cfg;
	const wrap = document.createElement("div");
	wrap.className = "lypos-settings";

	const heading = (text: string) => {
		const h = document.createElement("h3");
		h.textContent = text;
		wrap.appendChild(h);
	};

	heading(t("setPosition"));
	const modes: [Mode, string][] = [
		["off", t("posOff")],
		["right", t("posRight")],
		["left", t("posLeft")],
		["popup", t("posPopup")],
		["window", t("posWindow")],
	];
	for (const [value, label] of modes) {
		const lab = document.createElement("label");
		lab.className = "lypos-choice";
		const radio = document.createElement("input");
		radio.type = "radio";
		radio.name = "lypos-mode";
		radio.value = value;
		radio.checked = cfg.mode === value;
		radio.onchange = () => setMode(value);
		lab.append(radio, document.createTextNode(label));
		wrap.appendChild(lab);
	}

	wrap.appendChild(
		checkboxRow(t("setHookOfficial"), cfg.hookOfficial, (v) => {
			cfg.hookOfficial = v;
			saveCfg();
			updateButton(); // show/hide our own playbar button accordingly
		}),
	);

	const note = document.createElement("div");
	note.className = "lypos-row";
	note.style.fontSize = "12px";
	note.style.opacity = "0.7";
	note.textContent = t("setHint");
	wrap.appendChild(note);

	heading(t("setAppearance"));

	wrap.appendChild(
		checkboxRow(t("setAutoScroll"), cfg.autoScroll, (v) => {
			cfg.autoScroll = v;
			saveCfg();
		}),
	);
	wrap.appendChild(
		numberRow(t("setCardHeight"), cfg.cardRatio, 15, 80, (v) => {
			cfg.cardRatio = v;
			saveCfg();
			if (cfg.mode === "right" || cfg.mode === "left") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setCardTopLeft"), cfg.cardTopOffset, 0, 200, (v) => {
			cfg.cardTopOffset = v;
			saveCfg();
			if (cfg.mode === "left") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setCardTopRight"), cfg.rightCardTopOffset, 0, 200, (v) => {
			cfg.rightCardTopOffset = v;
			saveCfg();
			if (cfg.mode === "right") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setFontSize"), cfg.fontSize, 12, 32, (v) => {
			cfg.fontSize = v;
			saveCfg();
			store.target?.root.style.setProperty("--lypos-font", v + "px");
		}),
	);
	wrap.appendChild(
		numberRow(t("setPopupWidth"), cfg.popup.w, POPUP_MIN_W, 1000, (v) => {
			cfg.popup.w = v;
			saveCfg();
			if (cfg.mode === "popup") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setPopupHeight"), cfg.popup.h, POPUP_MIN_H, 1000, (v) => {
			cfg.popup.h = v;
			saveCfg();
			if (cfg.mode === "popup") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setWinWidth"), cfg.win.w, DEFAULTS.win.w, 1000, (v) => {
			cfg.win.w = v;
			saveCfg();
			if (cfg.mode === "window") applyMode();
		}),
	);
	wrap.appendChild(
		numberRow(t("setWinHeight"), cfg.win.h, DEFAULTS.win.h, 1000, (v) => {
			cfg.win.h = v;
			saveCfg();
			if (cfg.mode === "window") applyMode();
		}),
	);
	wrap.appendChild(
		selectRow(
			t("setLanguage"),
			[
				["auto", t("langAuto")],
				["en", "English"],
				["ja", "日本語"],
			],
			cfg.language,
			(v) => {
				cfg.language = v as Language;
				saveCfg();
				refreshUiLanguage();
				applyMode(); // rebuild the target so toolbar strings update
				openSettings(); // repaint this dialog in the new language
			},
		),
	);
	wrap.appendChild(
		selectRow(
			t("setProvider"),
			[
				["auto", t("provAuto")],
				["spotify", t("provSpotify")],
				["lrclib", t("provLrclib")],
			],
			cfg.provider,
			(v) => {
				cfg.provider = v as Provider;
				saveCfg();
				loadLyrics(true);
			},
		),
	);

	const actions = document.createElement("div");
	actions.className = "lypos-row";
	const refetch = document.createElement("button");
	refetch.className = "lypos-refetch";
	refetch.textContent = t("btnRefetch");
	refetch.onclick = () => loadLyrics(true);

	const reset = document.createElement("button");
	reset.className = "lypos-reset";
	reset.textContent = t("btnReset");
	reset.onclick = () => {
		try {
			resetCfg();
			refreshUiLanguage();
			applyMode();
			loadLyrics(true); // the provider may have changed
			Spicetify.showNotification?.(t("notifReset"));
			console.log(LOG, "settings reset:", store.cfg);
		} catch (err) {
			console.error(LOG, "reset failed:", err);
			Spicetify.showNotification?.(String(err), true);
		}
		openSettings(); // repaint this dialog with the default values
	};

	actions.append(refetch, reset);
	wrap.appendChild(actions);

	Spicetify.PopupModal.display({ title: t("setTitle"), content: wrap });
}
