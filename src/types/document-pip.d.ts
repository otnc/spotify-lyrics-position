// Document Picture-in-Picture API — not yet in TypeScript's bundled DOM lib.
// Spotify's CEF build enables it explicitly (blink feature
// DocumentPictureInPictureCefOptions) and, unlike window.open(), it honors
// the requested size exactly instead of being snapped to a fixed default.
export {};

declare global {
	interface DocumentPictureInPictureOptions {
		width?: number;
		height?: number;
		disallowReturnToOpener?: boolean;
		preferInitialWindowPlacement?: boolean;
	}

	interface DocumentPictureInPicture extends EventTarget {
		readonly window: Window | null;
		requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
	}

	interface Window {
		documentPictureInPicture?: DocumentPictureInPicture;
	}
}
