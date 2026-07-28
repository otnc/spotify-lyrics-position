import { store } from "./store";

const en = {
	title: "Lyrics",
	tipRefetch: "Refetch lyrics",
	tipSettings: "Settings",
	tipClose: "Close",
	msgLoading: "Loading lyrics…",
	msgNotFound: "No lyrics found",
	msgNoTrack: "Nothing is playing",
	msgUnsupported: "Podcasts and ads are not supported",
	msgInstrumental: "♪ Instrumental ♪",
	errNoTrackId: "no track ID",
	errNoLyrics: "no lyrics",
	errNotFound: "not found",
	errNetwork: "network error",
	setTitle: "Lyrics Position Settings",
	setPosition: "Position",
	posOff: "Hidden",
	posRight: "Right sidebar (card in the Now Playing View)",
	posLeft: "Left sidebar (card above the library)",
	posPopup: "In-app popup (draggable / resizable)",
	posWindow: "Separate window",
	setHookOfficial:
		"Toggle with the official lyrics button (turn off to restore the built-in lyrics page; the extension then shows its own playbar button instead)",
	setHint:
		"You can always reopen this dialog from the profile menu or by right-clicking the lyrics button.",
	setAppearance: "Appearance",
	setAutoScroll: "Auto-scroll to follow the current line",
	setCardHeight: "Sidebar card height (%)",
	setCardTopLeft: "Left sidebar card top offset (px)",
	setCardTopRight: "Right sidebar card top offset (px)",
	setFontSize: "Font size (px)",
	setLanguage: "Language",
	langAuto: "Auto (follow Spotify)",
	setProvider: "Lyrics source",
	provAuto: "Auto (Spotify → LRCLIB)",
	provSpotify: "Spotify only",
	provLrclib: "LRCLIB only",
	btnRefetch: "Refetch lyrics",
	btnReset: "Reset to defaults",
	notifReset: "Settings were reset to defaults",
	notifOff:
		"Lyrics hidden. Open settings from the profile menu or by right-clicking the lyrics button.",
	notifNoWindow: "Could not open a separate window",
	barLabel: "Lyrics position (right-click for settings)",
};

export type MsgKey = keyof typeof en;

const ja: Record<MsgKey, string> = {
	title: "歌詞",
	tipRefetch: "歌詞を再取得",
	tipSettings: "設定",
	tipClose: "閉じる",
	msgLoading: "歌詞を取得中…",
	msgNotFound: "歌詞が見つかりませんでした",
	msgNoTrack: "再生中の曲がありません",
	msgUnsupported: "ポッドキャスト/広告には対応していません",
	msgInstrumental: "♪ インストゥルメンタル ♪",
	errNoTrackId: "トラックIDなし",
	errNoLyrics: "歌詞なし",
	errNotFound: "見つからず",
	errNetwork: "通信エラー",
	setTitle: "Lyrics Position 設定",
	setPosition: "表示位置",
	posOff: "表示しない",
	posRight: "右サイドバー(再生中ビュー内のカード)",
	posLeft: "左サイドバー(ライブラリ上部のカード)",
	posPopup: "アプリ内ポップアップ(ドラッグ移動・リサイズ可)",
	posWindow: "別ウィンドウ(アプリ外ポップアップ)",
	setHookOfficial:
		"公式の歌詞ボタンで開閉する(オフにすると公式の中央歌詞画面が復活し、代わりにこの拡張機能専用のボタンが再生バーに表示される)",
	setHint:
		"※ この設定画面は、右上のプロフィールメニュー、または歌詞ボタンの右クリックからいつでも開けます",
	setAppearance: "外観",
	setAutoScroll: "歌詞の進行に合わせて自動スクロールする",
	setCardHeight: "サイドバーカードの高さ (%)",
	setCardTopLeft: "左サイドバーカードの上余白 (px)",
	setCardTopRight: "右サイドバーカードの上余白 (px)",
	setFontSize: "文字サイズ (px)",
	setLanguage: "言語 / Language",
	langAuto: "自動(Spotifyの言語に従う)",
	setProvider: "歌詞の取得元",
	provAuto: "自動 (Spotify → LRCLIB)",
	provSpotify: "Spotify のみ",
	provLrclib: "LRCLIB のみ",
	btnRefetch: "歌詞を再取得",
	btnReset: "デフォルト設定に戻す",
	notifReset: "設定を初期値に戻しました",
	notifOff:
		"歌詞表示をオフにしました。設定はプロフィールメニュー、または歌詞ボタンの右クリックから開けます",
	notifNoWindow: "別ウィンドウを開けませんでした",
	barLabel: "歌詞の位置 (右クリックで設定)",
};

const dicts = { en, ja };

/** Resolve the effective language. Defaults to English unless Spotify runs in Japanese. */
export function resolveLang(): "en" | "ja" {
	const pref = store.cfg.language;
	if (pref === "en" || pref === "ja") return pref;
	const locale = (Spicetify.Locale?.getLocale() ?? navigator.language ?? "en").toLowerCase();
	return locale.startsWith("ja") ? "ja" : "en";
}

export function t(key: MsgKey): string {
	return dicts[resolveLang()][key] ?? en[key];
}
