# @AGENTS.md

This is a Tauri 2 Rust shell that wraps the Next.js web frontend (`@marstv/web`).

## Structure

- **Rust source**: `src-tauri/src/` (`lib.rs` — app setup, commands, tray, menus, shortcuts; `main.rs` — entry point)
- **Tauri config**: `src-tauri/tauri.conf.json` (window size 1280x720, updater endpoint, bundle icons)

## Key Plugins

- `tauri-plugin-updater` — in-app updates from GitHub Releases
- `tauri-plugin-shell` — shell/process access
- `tauri-plugin-global-shortcut` — Ctrl+Shift+F global search shortcut
- `tauri-plugin-store` — window state persistence (`window-state.json`)
- `tauri-plugin-log` — Rust-side logging

## Commands (invoke from frontend)

- `get_app_version` — returns `CARGO_PKG_VERSION`
- `open_external(url)` — opens URL in OS default browser (via `open` crate)

## Tray & Window

- Close-to-tray: close button hides window instead of quitting; tray icon left-click restores
- Tray menu: Show / Quit
- Native menu bar: File (Settings, Quit), Edit (undo/redo/clipboard), View (Reload, Fullscreen), Window, Help
- Window position/size saved and restored across sessions via `window-state.json`

## Dev

```bash
pnpm desktop:dev        # from repo root; starts web dev server + Tauri window
```

## Build

```bash
pnpm desktop:build      # from repo root; builds web + Tauri bundle
```

## Rust verification

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```
