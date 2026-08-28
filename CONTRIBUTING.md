# Contributing

## Development

```
npm install
npm run build      # bundle src/main.ts -> dist/lyrics-position.js (esbuild)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write
npm run check      # typecheck + lint + prettier --check
```

To test locally, copy the build output into the Spicetify `Extensions` folder and apply:

```
copy dist\lyrics-position.js %APPDATA%\spicetify\Extensions\   (Windows)
cp dist/lyrics-position.js ~/.config/spicetify/Extensions/     (macOS/Linux)
spicetify config extensions lyrics-position.js
spicetify apply
```

## Project structure

```
scripts/build.mjs   esbuild build script
src/
  main.ts           entry point (init, event wiring)
  store.ts          shared state and types
  config.ts         settings persistence (localStorage)
  i18n.ts           English / Japanese strings
  styles.css        all styles
  styles.ts         style injection
  track.ts          current track metadata
  providers.ts      lyrics providers (Spotify / LRCLIB)
  lyrics.ts         fetch orchestration, album color extraction
  render.ts         rendering and the highlight loop
  targets.ts        display targets (sidebar cards / popup / window)
  modes.ts          mode switching
  ui-buttons.ts     playbar button, official-button hook
  settings-ui.ts    settings dialog
  types/            Spicetify type definitions used by this project
```

## Release

Run **Actions → Release → Run workflow** on GitHub. Enter a version (or leave blank to use the
`version` field in `package.json`); the workflow runs checks, builds, and publishes a GitHub
Release with `lyrics-position.js` attached.

## The separate window (`targets.ts` → `createWindow`)

This mode went through several iterations because Spotify's CEF shell does not behave like a
normal browser for popup windows. Findings, in case they need revisiting:

- **`window.open()` popups get silently resized.** The features string
  (`width=`/`height=`) is honored for a moment, but ~50–400ms after creation Spotify's own
  window-placement code overrides the size — first to the full screen, then (on later resizes)
  to roughly half the display. `resizeTo()` right after `open()` doesn't survive it either.
  Confirmed by polling `outerWidth`/`outerHeight` over time via Chrome DevTools Protocol
  (`--remote-debugging-port`, already enabled on the Spotify renderer process).
- **The Document Picture-in-Picture API avoids this entirely.** Spotify's renderer runs with
  `--enable-blink-features=DocumentPictureInPictureCefOptions`, and
  `documentPictureInPicture.requestWindow({width, height})` returns a window whose _content
  area_ matches the request exactly — no snap-back. `createWindow()` prefers this API and falls
  back to `window.open()` on older Spotify builds where it's unavailable.
- **PiP windows have no native chrome in this CEF build** — no title bar, no move/maximize/close
  affordances. The toolbar therefore implements its own drag-to-move (`pointerdown` +
  `window.moveTo()`) and close button, and there's a best-effort "enlarge" button.
- **The "enlarge" button can't reach a true maximize.** Requesting the full display size via
  `resizeTo()` still gets clamped back to roughly half the display after ~300ms — this is the
  same snap-back behavior as `window.open()`, just with a smaller effect since PiP starts from an
  accurate size. There's no known way around it from the page/extension layer.
- **Cross-monitor `moveTo()` is clamped.** On a multi-monitor test rig (primary display width
  1536px, with displays to its left and right), `moveTo()` to any X coordinate less than 1536
  (the primary display's width) gets silently clamped back to exactly `x = 1536` — a coordinate
  that isn't the edge of any actual display in that layout. This reproduced consistently
  regardless of target X or delay, so it isn't a race condition; it looks like Spotify's window
  placement code enforces `x >= primaryDisplay.width` unconditionally. No workaround found.

Both of the last two are enforced by Spotify's native app code (outside the renderer/webpage),
so nothing in this extension can override them. If Spotify changes its window handling in a
future release, it's worth re-testing before assuming these limitations still apply.

## The settings dialog (`settings-ui.ts`) — do not use `Spicetify.PopupModal.display()`

A Spotify client update (observed going from 1.2.95 to 1.2.98) broke the settings dialog's
layout: the backdrop still rendered fine, but the actual content ended up nested inside
`.main-trackCreditsModal-container` / `-header` / `-mainSection` — i.e. Spotify's generic modal
now reuses the (narrow, content-hugging, ~160px wide) "Track Credits" modal's markup for
arbitrary `PopupModal.display()` content instead of a proper flexible dialog. Confirmed by
walking up the DOM from the dialog's own content via
`document.querySelectorAll("*")` + `Runtime.evaluate` over CDP.

This is the second time in this project a Spotify update has broken something by changing
internal markup/behavior we don't control (see the separate-window findings above), so rather
than patching around this specific class-name change, `openSettings()` now builds and owns its
own overlay (`.lypos-modal-overlay` / `.lypos-modal-card` in `styles.css`) instead of calling
`Spicetify.PopupModal.display()` at all. It's a plain fixed-position backdrop + centered card
appended straight to `document.body`, closable via the × button, Escape, or a backdrop click.
Repeat calls to `openSettings()` (language switch, reset-to-defaults) reuse the same overlay
element and just replace its body content, rather than tearing down and recreating it.

`main.ts`'s init gate no longer waits on `Spicetify.PopupModal` for this reason — nothing in the
extension depends on it anymore. `Spicetify.PopupModal` itself is left in `types/spicetify.d.ts`
in case something else ever needs it, but treat it as unreliable across Spotify updates.

If Spotify's own UI (not just this dialog) starts looking broken after an update, first run
`spicetify backup apply` — Spotify auto-updates can silently unpatch Spicetify entirely
(`spicetify apply` will report "Spotify version and backup version are mismatched" when this
happens), which looks similar from the outside but is a completely different problem.
