#![windows_subsystem = "windows"]

use tauri::{Emitter, Manager, WindowEvent};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_app_version, open_external])
        .setup(|app| {
            // Ctrl+Shift+F global search shortcut
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyF);
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = window.emit("global-shortcut", "search");
                    }
                }
            })?;

            // --- Native menu bar ---
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&MenuItemBuilder::with_id("settings", "Settings...").accelerator("CmdOrCtrl+,").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("quit_menu", "Quit MarsTV").accelerator("CmdOrCtrl+Q").build(app)?)
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&PredefinedMenuItem::undo(app, None)?)
                .item(&PredefinedMenuItem::redo(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::cut(app, None)?)
                .item(&PredefinedMenuItem::copy(app, None)?)
                .item(&PredefinedMenuItem::paste(app, None)?)
                .item(&PredefinedMenuItem::select_all(app, None)?)
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&MenuItemBuilder::with_id("reload", "Reload").accelerator("CmdOrCtrl+R").build(app)?)
                .item(&PredefinedMenuItem::fullscreen(app, None)?)
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .build()?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&MenuItemBuilder::with_id("about", "About MarsTV").build(app)?)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "quit_menu" => app.exit(0),
                    "reload" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval("location.reload()");
                        }
                    }
                    "about" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "about");
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "settings");
                        }
                    }
                    _ => {}
                }
            });

            // Build tray menu: Show / Quit
            let show = MenuItemBuilder::with_id("show", "Show MarsTV").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).item(&show).item(&quit).build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Window state: restore saved position/size from previous session
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(store) = app.store("window-state.json") {
                    if let (Some(x), Some(y)) = (
                        store.get("x").and_then(|v| v.as_f64()),
                        store.get("y").and_then(|v| v.as_f64()),
                    ) {
                        let _ = window.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(x as i32, y as i32),
                        ));
                    }
                    if let (Some(w), Some(h)) = (
                        store.get("width").and_then(|v| v.as_f64()),
                        store.get("height").and_then(|v| v.as_f64()),
                    ) {
                        let _ = window.set_size(tauri::Size::Physical(
                            tauri::PhysicalSize::new(w as u32, h as u32),
                        ));
                    }
                }

                // Close-to-tray + save window state
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        // Save window state before hiding
                        if let Ok(store) = window_clone.app_handle().store("window-state.json") {
                            if let Ok(pos) = window_clone.outer_position() {
                                let _ = store.set("x", pos.x as f64);
                                let _ = store.set("y", pos.y as f64);
                            }
                            if let Ok(size) = window_clone.outer_size() {
                                let _ = store.set("width", size.width as f64);
                                let _ = store.set("height", size.height as f64);
                            }
                            let _ = store.save();
                        }
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
