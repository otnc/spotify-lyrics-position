# Lyrics Position

[日本語](README-ja.md)

A [Spicetify](https://spicetify.app/) extension that shows lyrics wherever you want — instead of the full-screen center view.

## Features

- Choose where lyrics appear (saved automatically):
  - **Right sidebar** — a card inserted at the top of the Now Playing View (the panel with artwork, title, and artist)
  - **Left sidebar** — a card above the library
  - Sidebar card height defaults to ~36% of the sidebar and is adjustable (15–80%)
  - **In-app popup** — drag the header to move, drag the corner to resize; position and size are saved
  - **Separate window** — an independent window outside the app
- **The official lyrics button (microphone icon) toggles this display** instead of the built-in center page (can be turned off to restore the default behavior)
- Official-style look: album-color background, unsung lines dark, sung/current lines white
- Synced lyrics with highlighting and auto-scroll (auto-scroll can be disabled); click a line to seek
- Lyrics sources: official Spotify lyrics with automatic fallback to [LRCLIB](https://lrclib.net/)
- English / Japanese UI — follows your Spotify language by default, switchable in settings
- Reset-to-defaults button

## Requirements

This is a **Spicetify extension** — [Spicetify](https://spicetify.app/) must be installed first.
See the official installation guide: https://spicetify.app/docs/getting-started

> [!WARNING]
> This extension is developed and tested on **Windows**. It should work on macOS/Linux as well, but may be unstable there.

## Install

1. Download the latest `lyrics-position.js` from [Releases](../../releases)
2. Put it into the Spicetify `Extensions` folder:

   | OS          | Path                             |
   | ----------- | -------------------------------- |
   | Windows     | `%APPDATA%\spicetify\Extensions` |
   | macOS/Linux | `~/.config/spicetify/Extensions` |

3. Run:

   ```
   spicetify config extensions lyrics-position.js
   spicetify apply
   ```

## Usage

- Toggle the lyrics display with:
  - the **official lyrics button** (microphone icon) — when "Toggle with the official lyrics button" is enabled (default), or
  - the **extra playbar button** added by this extension — shown when the official-button hook is turned off (while the hook is on, the extra button is hidden so there is only one microphone icon)
- Open settings any time, even while lyrics are hidden:
  - **Right-click** the lyrics button (microphone icon)
  - **Right-click** the extra playbar button
  - **Profile menu (top-right) → "Lyrics Position Settings"**
- Settings cover position, card height, font size, auto-scroll, language, and lyrics source (applied instantly, saved automatically)
- Uncheck "Toggle with the official lyrics button" to restore the built-in center lyrics page
- "Reset to defaults" instantly restores all settings to their initial values

## Notes

- Settings are stored in Spotify's localStorage: they persist across app restarts and `spicetify apply`, and are only lost if Spotify's app data is cleared or the app is reinstalled
- In right-sidebar mode, the Now Playing View is opened automatically if it is closed
- Closing the separate window switches the mode to "Hidden"
- To keep the separate window always on top on Windows, PowerToys "Always on Top" (Win+Ctrl+T) works well
- When lyrics cannot be fetched, the reason (403 / not found, etc.) is shown in the card

### Known limitation: separate window move/enlarge (multi-monitor)

The separate window is a real OS window created via the Document Picture-in-Picture API (its size is otherwise unreliable in this app — see [CONTRIBUTING.md](CONTRIBUTING.md) for details). Testing on a multi-monitor setup found that Spotify's own window placement code:

- Clamps the window's X position so it can never move further left than the primary monitor's width, regardless of where you drag it — dragging onto the primary display or a monitor to its left doesn't work.
- Snaps any script-driven resize above roughly half the display's size back down within ~300ms — a true "maximize to full screen" isn't achievable.

Both happen in Spotify's native app code, outside of what a Spicetify extension (which only runs inside the web page) can influence, so there's no fix available at this layer. If you need guaranteed free positioning and resizing, use the **in-app popup** instead — it's a plain DOM element (not a real OS window) and isn't affected by this, though it's naturally confined to the Spotify window itself. The separate window still always opens on whichever monitor Spotify itself is currently on.

## Uninstall

```
spicetify config extensions lyrics-position.js-
spicetify apply
```

The trailing `-` is intentional — it is Spicetify's syntax for removing an entry.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and release instructions.
